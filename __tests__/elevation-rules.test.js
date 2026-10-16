import { pathFinding } from '../src';
import fs from 'fs';
import path from 'path';
import vm from 'vm';
import * as maps from '../src/maps';

const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
const load = file => JSON.parse(read(file));
const landRules = load('demo/static/terrain-samples/emperor-land-water/rules.json');
const heightRules = load('demo/static/terrain-samples/emperor-elevation/rules.json');
const elements = {
  ...load('demo/static/terrain-samples/emperor-land-water/elements.json'),
  ...load('demo/static/terrain-samples/emperor-elevation/elements.json'),
  dog: { version: 1, id: 'dog', kind: 'sprite', footprint: [[0, 0]], views: {} },
};
const context = vm.createContext({ window: { qtiled: { pathFinding }, qtiledMaps: maps } });
vm.runInContext(read('demo/static/js/terrain-sample.js'), context);
vm.runInContext(read('demo/static/js/environment-rules.js'), context);
vm.runInContext(read('demo/static/js/land-water-rules.js'), context);
vm.runInContext(read('demo/static/js/elevation-rules.js'), context);
vm.runInContext(read('demo/static/js/construction-rules.js'), context);
const resolve = (map, angle = 0, library = elements, rules = heightRules) => context.window.elevationRules.resolve(map, library, landRules, rules, angle);
const stroke = (map, command, angle = 0) => context.window.elevationRules.applyStroke(map, command, elements, landRules, heightRules, angle);
const createMap = (version = 2) => ({
  version, id: 'height-test', tileSize: [80, 40], ...(version === 2 ? { elevationStep: 40 } : {}),
  cells: Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => ({ terrain: 'land', elevation: 0 }))),
  entities: [],
});
const freezeDeep = value => {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freezeDeep);
    Object.freeze(value);
  }
  return value;
};
const hasIssue = (result, code) => expect(result.issues).toContainEqual(expect.objectContaining({ code }));
const at = (result, x, y) => result.tiles.find(tile => tile.grid[0] === x && tile.grid[1] === y);

test('地表入口有无高程整理均保留最终清理结果及岸带信息', () => {
  vm.runInContext(read('demo/static/js/beach-rules.js'), context);
  const map = createMap();
  map.entities = [{ id: 'dog-1', element: 'dog', grid: [4, 4], angle: 0 }];
  map.cells[4][5].road = 'ordinary'; map.cells[7][7].road = 'ordinary';
  const original = JSON.stringify(map);
  for (const terrain of ['water', 'beach']) {
    const results = [undefined, heightRules].map(rules => context.window.constructionRules.applySurfaceStroke(
      map, terrain, [[4, 4], [5, 4]], elements, landRules, rules));
    expect(results[0].issues).toEqual([]); expect(results[1]).toEqual(results[0]);
    expect(results[0].definition.entities).toEqual([]);
    expect(results[0].definition.cells[4][5].road).toBeUndefined();
    expect(results[0].definition.cells[7][7].road).toBe('ordinary');
    expect(results[0].bankGrids).toEqual([]);
  }
  expect(JSON.stringify(map)).toBe(original);
});

describe('整级高程真实素材规则', () => {
  test('v1 陆水解析和整笔操作完全沿用已有消费者', () => {
    const map = freezeDeep(createMap(1));
    const command = { terrain: 'water', grids: [[4, 4]] };
    expect(resolve(map)).toEqual(context.window.landWaterRules.resolve(map, elements, landRules));
    expect(stroke(map, command)).toEqual(context.window.landWaterRules.applyStroke(map, command, elements, landRules));
  });

  test('一个高格周围八个低格选择原作边角图，四向仅换图且不改变事实', () => {
    const map = createMap();
    map.cells[4][4].elevation = 1;
    freezeDeep(map);
    const before = JSON.stringify(map);
    for (const [turn, angle] of [0, 90, 180, 270].entries()) {
      const result = resolve(map, angle);
      expect(result.issues).toEqual([]);
      expect(result.tiles.filter(tile => tile.slope)).toHaveLength(8);
      expect(at(result, 4, 4)).toMatchObject({ elevation: 1, slope: false, element: expect.stringMatching(/^emperor-bare-land/) });
      // 中心南侧较高：原表行71。记录是独立像素校准后的QTiled镜头顺序。
      expect(at(result, 4, 3)).toMatchObject({ elevation: 0, slope: true, rowIndex: 71,
        element: `emperor-elevation-${[228, 222, 224, 226][turn]}` });
      expect(JSON.stringify(map)).toBe(before);
    }
  });

  test('高地内部保持平地素材，L形外侧双边能匹配首级角图', () => {
    const map = createMap();
    for (let y = 3; y <= 5; y += 1) for (let x = 3; x <= 5; x += 1) map.cells[y][x].elevation = 1;
    const plateau = resolve(map);
    expect(plateau.issues).toEqual([]);
    expect(at(plateau, 4, 4)).toMatchObject({ slope: false, elevation: 1 });
    map.cells[5][5].elevation = 0;
    const corner = resolve(map);
    expect(corner.issues).toEqual([]);
    expect(at(corner, 5, 5).element).toMatch(/^emperor-elevation-23[0-2]$|^emperor-elevation-229$/);
  });

  test('封闭低洞要求原作修整时明确拒绝，不跳过控制行，也不暗改高度', () => {
    const map = createMap();
    heightRules.neighborOffsets.forEach(([dx, dy]) => { map.cells[4 + dy][4 + dx].elevation = 1; });
    freezeDeep(map);
    const result = resolve(map);
    hasIssue(result, 'unsupported-elevation-control');
    expect(result.tiles).toBeNull();
    expect(map.cells[4][4].elevation).toBe(0);
  });

  test('原表宽通配可忽略另一高角的分离邻域不能直接作为已支持形态', () => {
    const map = createMap();
    [1, 3].forEach(index => {
      const [dx, dy] = heightRules.neighborOffsets[index];
      map.cells[4 + dy][4 + dx].elevation = 1;
    });
    hasIssue(resolve(map), 'unsupported-elevation-shape');
  });

  test.each([
    ['坡面水', map => { map.cells[4][4].elevation = 1; map.cells[3][4].terrain = 'water'; }, 'water-bank-required'],
    ['负处水', map => { map.cells[4][4] = { terrain: 'water', elevation: -1 }; }, 'unsupported-elevation'],
    ['负高度临水', map => { map.cells[4][4].terrain = 'water'; map.cells[3][4].elevation = -1; }, 'unsupported-elevation'],
    ['高度负17', map => { map.cells[4][4].elevation = -17; }, 'unsupported-elevation'],
    ['高度17', map => { map.cells[4][4].elevation = 17; }, 'unsupported-elevation'],
    ['错误高度单位', map => { map.elevationStep = 16; }, 'unsupported-elevation-step'],
    ['错误格尺寸', map => { map.tileSize = [64, 32]; }, 'unsupported-elevation-tile-size'],
  ])('%s 整图拒绝并保留输入', (name, edit, code) => {
    const map = createMap();
    edit(map);
    const before = JSON.stringify(map);
    freezeDeep(map);
    const result = resolve(map);
    hasIssue(result, code);
    expect(result.tiles).toBeNull();
    expect(JSON.stringify(map)).toBe(before);
  });

  test('缺素材、未知形态、无匹配和坏配置分别定位，不能返回半图', () => {
    const map = createMap();
    map.cells[4][4].elevation = 1;
    const missing = { ...elements };
    delete missing['emperor-elevation-228'];
    for (const [library, rules, code] of [
      [missing, heightRules, 'missing-elevation-element'],
      [elements, { ...heightRules, supportedRecords: [229] }, 'unsupported-elevation-pattern'],
      [elements, { ...heightRules, rows: [heightRules.rows[0]] }, 'unmatched-elevation-pattern'],
      [elements, { ...heightRules, rows: [] }, 'invalid-elevation-rules'],
    ]) {
      const result = resolve(map, 0, library, rules);
      hasIssue(result, code);
      expect(result.tiles).toBeNull();
    }
  });

  test('坡面实体按完整旋转占地拒绝；均匀高地允许实体，跨高差拒绝', () => {
    const map = createMap();
    map.cells[4][4].elevation = 1;
    map.entities = [{ id: 'dog-a', element: 'dog', grid: [4, 4] }];
    expect(resolve(map).issues).toEqual([]);
    map.entities[0].grid = [4, 3];
    hasIssue(resolve(map), 'unsupported-slope-entity');
    const library = { ...elements, dog: { ...elements.dog, footprint: [[1, 0], [2, 0]] } };
    map.entities[0] = { id: 'dog-a', element: 'dog', grid: [4, 1], angle: 90 };
    hasIssue(resolve(map, 0, library), 'unsupported-slope-entity');
    map.entities[0].grid = [4, 2];
    hasIssue(resolve(map, 0, library), 'footprint-elevation-mismatch');
  });
});

describe('高程整笔事务', () => {
  test('首次抬高升级v2；去重、保留变体/扩展/实体，四向和重载稳定，旧快照可撤销', () => {
    const map = createMap(1);
    map.cells[4][4].terrainVariant = 17;
    map.cells[4][4].note = { title: '保留作者事实' };
    map.entities = [{ id: 'dog-a', element: 'dog', grid: [7, 7] }];
    freezeDeep(map);
    const before = JSON.stringify(map);
    const command = freezeDeep({ type: 'raise', grids: [[4, 4], [4, 4]] });
    const result = stroke(map, command);
    expect(result.issues).toEqual([]);
    expect(result.definition).toMatchObject({ version: 2, elevationStep: 40 });
    expect(result.definition.cells[4][4]).toEqual({ ...map.cells[4][4], elevation: 1 });
    expect(result.definition.entities).toEqual(map.entities);
    expect(JSON.stringify(map)).toBe(before);
    for (const angle of [0, 90, 180, 270]) expect(stroke(map, command, angle).definition).toEqual(result.definition);
    // VM 中构造的对象来自另一 JS realm；IO 明确仅收当前 realm 普通 JSON 对象。
    const exported = maps.exportMapDefinition(JSON.parse(JSON.stringify(result.definition)), elements);
    expect(exported.issues).toEqual([]);
    const json = exported.json;
    const reopened = maps.importMapDefinition(json, elements);
    expect(reopened.issues).toEqual([]);
    expect(resolve(reopened.definition)).toEqual(resolve(result.definition));
    expect(stroke(map, command)).toEqual(result);
    expect(resolve(map)).toEqual(context.window.landWaterRules.resolve(map, elements, landRules));
    expect(stroke(result.definition, { type: 'lower', grids: [[4, 4]] }).definition.cells).toEqual(map.cells);
  });

  test.each(['raise', 'lower'])('%s 的两级目标沿用既有整理，默认一级结果不变', type => {
    const map = createMap();
    map.cells.flat().forEach(cell => { cell.elevation = 8; });
    freezeDeep(map);
    const grids = [[4, 4], [4, 4]];
    expect(stroke(map, { type, grids, levels: 1 })).toEqual(stroke(map, { type, grids }));
    const result = stroke(map, { type, grids, levels: 2 });
    expect(result.issues).toEqual([]);
    expect(result).toEqual(stroke(map, { type: 'set-height', grids, height: type === 'raise' ? 10 : 6 }));
    for (const angle of [0, 90, 180, 270]) {
      expect(stroke(map, { type, grids, levels: 2 }, angle).definition).toEqual(result.definition);
    }
  });

  test.each([['raise', 15], ['lower', 1]])('%s 两级越界拒绝整笔且不截断', (type, height) => {
    const map = createMap();
    map.cells.flat().forEach(cell => { cell.elevation = height; });
    const result = stroke(freezeDeep(map), { type, grids: [[4, 4]], levels: 2 });
    hasIssue(result, 'elevation-stroke-range');
    expect(result.definition).toBeNull();
  });

  test.each([0, 3, -1, null, '2'])('非法升降步长 %p 被拒绝', levels => {
    hasIssue(stroke(createMap(), { type: 'raise', grids: [[4, 4]], levels }), 'invalid-elevation-stroke');
  });

  test('设零不升级版本，零地面下挖拒绝；实体仍在平坦地面时可随地形升降', () => {
    const map = createMap(1);
    expect(stroke(map, { type: 'set-height', height: 0, grids: [[4, 4]] }).definition).toEqual(map);
    hasIssue(stroke(map, { type: 'lower', grids: [[4, 4]] }), 'elevation-stroke-range');
    map.entities = [{ id: 'dog-a', element: 'dog', grid: [4, 4] }];
    const result = stroke(map, { type: 'raise', grids: [[4, 4]] });
    expect(result.issues).toEqual([]);
    expect(result.definition.entities).toEqual(map.entities);
    expect(result.definition.cells[4][4].elevation).toBe(1);
    expect(map.cells[4][4].elevation).toBe(0);
  });

  test('封闭低洞联动填平，返回笔刷外的实际变化；读取原图仍不修整', () => {
    const map = freezeDeep(createMap());
    const ring = heightRules.neighborOffsets.map(([dx, dy]) => [4 + dx, 4 + dy]);
    const linked = stroke(map, { type: 'set-height', height: 1, grids: ring });
    expect(linked.issues).toEqual([]);
    expect(linked.changes.filter(change => !change.selected)).toEqual([{ grid: [4, 4], before: 0, after: 1, selected: false }]);
    const repaired = stroke(map, { type: 'set-height', height: 1, grids: [...ring, [4, 4]] });
    expect(repaired.issues).toEqual([]);
    expect(linked.definition).toEqual(repaired.definition);
    expect(map.cells[4][4].elevation).toBe(0);
    const lake = stroke(repaired.definition, { terrain: 'water', grids: [[4, 4]] });
    expect(lake.issues).toEqual([]);
    expect(lake.definition.cells[4][4]).toMatchObject({ terrain: 'water', elevation: 1 });
  });

  test.each([
    [{ type: 'set-height', height: 17, grids: [[4, 4]] }, 'invalid-elevation-stroke'],
    [{ type: 'set-height', height: NaN, grids: [[4, 4]] }, 'invalid-elevation-stroke'],
    [{ type: 'raise', grids: [[4, 4], [-1, 0]] }, 'stroke-out-of-bounds'],
    [{ type: 'raise', grids: [[4, 4], [0.5, 2]] }, 'invalid-grid'],
    [{ type: 'raise', grids: [] }, 'invalid-elevation-stroke'],
  ])('非法操作 %p 整笔拒绝', (command, code) => {
    const result = stroke(freezeDeep(createMap()), command);
    hasIssue(result, code);
    expect(result.definition).toBeNull();
    expect(result.tiles).toBeNull();
  });
});

describe('多级与沟谷的创作过程', () => {
  const rectangle = (x1, y1, x2, y2) => Array.from({ length: y2 - y1 + 1 }, (_, dy) =>
    Array.from({ length: x2 - x1 + 1 }, (_, dx) => [x1 + dx, y1 + dy])).flat();
  const large = (size = 25) => ({ ...createMap(), cells: Array.from({ length: size }, () =>
    Array.from({ length: size }, () => ({ terrain: 'land', elevation: 0 }))) });
  const set = (map, grids, height) => stroke(map, { type: 'set-height', grids, height });

  test('两块高地可以合并、分离、填谷，四向保留相同地图和所属格', () => {
    let map = freezeDeep(large());
    for (const [grids, height, center] of [
      [[...rectangle(5, 7, 9, 17), ...rectangle(13, 7, 17, 17)], 1, 0],
      [rectangle(10, 7, 12, 17), 1, 1],
      [rectangle(10, 5, 12, 19), 0, 0],
      [rectangle(10, 5, 12, 19), 1, 1],
    ]) {
      const before = JSON.stringify(map);
      const result = set(map, grids, height);
      expect(result.issues).toEqual([]);
      expect(result.definition.cells[12][11].elevation).toBe(center);
      expect(JSON.stringify(map)).toBe(before);
      for (const angle of [0, 90, 180, 270]) {
        const other = resolve(result.definition, angle);
        expect(other.issues).toEqual([]);
        expect(other.tiles.map(tile => tile.grid)).toEqual(result.tiles.map(tile => tile.grid));
        expect(stroke(map, { type: 'set-height', grids, height }, angle).definition).toEqual(result.definition);
      }
      map = freezeDeep(result.definition);
    }
  });

  test('多级样本单格下挖会联动扩展，保留指定高度', () => {
    const map = freezeDeep(load('demo/static/map-samples/elevation-multilevel-map.json'));
    const narrow = set(map, [[12, 12]], 4);
    expect(narrow.issues).toEqual([]);
    expect(narrow.definition.cells[12][12].elevation).toBe(4);
    expect(narrow.adjusted).toEqual([]);
    const valley = set(map, rectangle(11, 11, 13, 13), 4);
    expect(valley.issues).toEqual([]);
    expect(valley.definition.cells[12][12].elevation).toBe(4);
    expect(valley.changes).toHaveLength(9);
    expect(narrow.definition).toEqual(valley.definition);
  });

  test.each([1, 3, 5])('%i格笔刷在8级平地降低一级与设为7一致，四向有效且不改原图', size => {
    const map = large(15);
    map.cells.forEach(row => row.forEach(cell => { cell.elevation = 8; }));
    freezeDeep(map);
    const radius = (size - 1) / 2;
    const grids = rectangle(7 - radius, 7 - radius, 7 + radius, 7 + radius);
    const lowered = stroke(map, { type: 'lower', grids });
    expect(lowered.issues).toEqual([]);
    expect(lowered.adjusted).toEqual([]);
    expect(grids.every(([x, y]) => lowered.definition.cells[y][x].elevation === 7)).toBe(true);
    expect(lowered.changes.every(change => change.before === 8 && change.after === 7)).toBe(true);
    expect(lowered.changes.some(change => !change.selected)).toBe(true);
    expect(lowered.definition.cells[0][0].elevation).toBe(8);
    for (const angle of [0, 90, 180, 270]) {
      expect(resolve(lowered.definition, angle).issues).toEqual([]);
      expect(stroke(map, { type: 'lower', grids }, angle).definition).toEqual(lowered.definition);
      expect(stroke(map, { type: 'set-height', height: 7, grids }, angle).definition).toEqual(lowered.definition);
    }
    expect(map.cells.flat().every(cell => cell.elevation === 8)).toBe(true);
  });

  test('下挖联动保留仍落在平地的完整实体，空角和边缘不填成陆地', () => {
    const map = large(12);
    map.cells.forEach(row => row.forEach(cell => { cell.elevation = 8; }));
    map.entities = [{ id: 'protected', element: 'dog', grid: [6, 5] }];
    const before = JSON.stringify(map);
    const result = stroke(map, { type: 'lower', grids: [[5, 5]] });
    expect(result.issues).toEqual([]);
    expect(result.definition.entities).toEqual(map.entities);
    expect(result.definition.cells[5][6].elevation).toBe(7);
    expect(JSON.stringify(map)).toBe(before);
    map.entities = [];
    map.cells[0][0] = null;
    const edge = stroke(freezeDeep(map), { type: 'lower', grids: [[1, 1]] });
    expect(edge.issues).toEqual([]);
    expect(edge.definition.cells[0][0]).toBeNull();
    expect(edge.definition.cells[1][1].elevation).toBe(7);
    for (const angle of [0, 90, 180, 270]) expect(resolve(edge.definition, angle).issues).toEqual([]);
  });

  test('逐级创建0到16台地，满级再抬高明确拒绝，保存回读不丢高度', () => {
    let map = large(41);
    for (let height = 1; height <= 16; height += 1) {
      const result = set(map, rectangle(height + 2, height + 2, 38 - height, 38 - height), height);
      expect(result.issues).toEqual([]);
      map = result.definition;
    }
    expect(new Set(map.cells.flat().map(cell => cell.elevation)).size).toBe(17);
    const overflow = stroke(map, { type: 'raise', grids: [[20, 20]] });
    hasIssue(overflow, 'elevation-stroke-range');
    expect(overflow.definition).toBeNull();
    const saved = maps.exportMapDefinition(JSON.parse(JSON.stringify(map)), elements);
    expect(saved.issues).toEqual([]);
    const restored = maps.importMapDefinition(saved.json, elements);
    expect(restored.definition).toEqual(map);
    for (const angle of [0, 90, 180, 270]) expect(resolve(restored.definition, angle).issues).toEqual([]);
  });

  test('联动保留仍合法的实体；循环整笔拒绝，保留原快照', () => {
    const map = createMap();
    map.entities = [{ id: 'protected', element: 'dog', grid: [4, 4] }];
    freezeDeep(map);
    const ring = heightRules.neighborOffsets.map(([dx, dy]) => [4 + dx, 4 + dy]);
    const protectedResult = set(map, ring, 1);
    expect(protectedResult.issues).toEqual([]);
    expect(protectedResult.definition.entities).toEqual(map.entities);
    expect(protectedResult.definition.cells[4][4].elevation).toBe(1);
    expect(map.cells.flat().every(cell => cell.elevation === 0)).toBe(true);
    const plain = freezeDeep(large());
    for (const [grids, height, code] of [
      [[[12, 12]], 16, 'elevation-adjustment-cycle'],
    ]) {
      const result = set(plain, grids, height);
      hasIssue(result, code);
      expect(result.definition).toBeNull();
      expect(result.tiles).toBeNull();
    }
    expect(plain.cells.flat().every(cell => cell.elevation === 0)).toBe(true);
  });
});

describe('用户台地衔接缺口回归', () => {
  const sample = () => ({ ...createMap(), cells: load('__tests__/fixtures/elevation-junction-heights.json')
    .map(row => row.map(elevation => ({ terrain: 'land', elevation }))) });

  test('四向一致仍可能漏掉高角，读取旧文件应报告而不静默改高', () => {
    const map = freezeDeep(sample());
    const before = JSON.stringify(map);
    for (const angle of [0, 90, 180, 270]) {
      const result = resolve(map, angle);
      expect(result.tiles).toBeNull();
      expect(result.issues.filter(value => value.code === 'unsupported-elevation-shape').map(value => value.path))
        .toEqual(['cells[16][10]', 'cells[17][10]', 'cells[18][9]']);
    }
    expect(JSON.stringify(map)).toBe(before);
  });

  test('修复低格时完整预览十二格回填，四向可消费且保留原文件事实', () => {
    const map = freezeDeep(sample());
    const result = stroke(map, { type: 'raise', grids: [[10, 17]] });
    expect(result.issues).toEqual([]);
    expect(result.changes.map(change => change.grid)).toEqual([
      [10, 16], [9, 17], [10, 17], [8, 18], [9, 18], [10, 18],
      [7, 19], [8, 19], [9, 19], [7, 20], [8, 20], [9, 20],
    ]);
    expect(result.changes.every(change => change.after === change.before + 1)).toBe(true);
    expect(result.changes.filter(change => change.selected).map(change => change.grid)).toEqual([[10, 17]]);
    expect(map.cells[17][10].elevation).toBe(1);
    for (const angle of [0, 90, 180, 270]) expect(resolve(result.definition, angle).issues).toEqual([]);
  });
});


describe('非负高程与有效地图边缘', () => {
  const grids = map => map.cells.flatMap((row, y) => row.flatMap((cell, x) => cell ? [[x, y]] : []));
  const shift = (map, delta) => ({ ...map, cells: map.cells.map(row => row.map(cell => cell && ({ ...cell, elevation: cell.elevation + delta }))) });

  test('同一形态整体抬升，只改变绝对高度，不改变四向坡面和格子归属', () => {
    const map = load('demo/static/map-samples/elevation-multilevel-map.json');
    for (const delta of [1, 4, 8]) {
      const shifted = freezeDeep(shift(map, delta));
      for (const angle of [0, 90, 180, 270]) {
        const before = resolve(map, angle), after = resolve(shifted, angle);
        expect(after.issues).toEqual([]);
        expect(after.tiles).toEqual(before.tiles.map(tile => ({ ...tile, elevation: tile.elevation + delta })));
      }
    }
  });

  test.each(['rectangle', 'corners', 'hole', 'row', 'column', 'single'])('%s 有效域允许多级坡面，四向不新增虚拟格，旋转世界也可用', shape => {
    const map = createMap();
    map.cells = map.cells.map((row, y) => row.map((cell, x) => {
      const absent = shape === 'corners' ? x + y < 4 || x + y > 12 || x - y > 5 || y - x > 5
        : shape === 'hole' ? x >= 3 && x <= 5 && y >= 3 && y <= 5
          : shape === 'row' ? y !== 4 : shape === 'column' ? x !== 4 : shape === 'single' ? x !== 4 || y !== 4 : false;
      return absent ? null : { ...cell, elevation: Math.floor(x / 3) + 7 };
    }));
    let rotated = freezeDeep(map);
    for (let turn = 0; turn < 4; turn += 1) {
      for (const angle of [0, 90, 180, 270]) {
        const result = resolve(rotated, angle);
        expect(result.issues).toEqual([]);
        expect(result.tiles.map(tile => tile.grid)).toEqual(grids(rotated));
      }
      const saved = maps.exportMapDefinition(JSON.parse(JSON.stringify(rotated)), elements);
      expect(saved.issues).toEqual([]);
      expect(maps.importMapDefinition(saved.json, elements).definition).toEqual(rotated);
      rotated = freezeDeep({ ...rotated, cells: rotated.cells[0].map((_, x) => rotated.cells.map(row => row[x]).reverse()) });
    }
  });

  test('全部边角可升降并保留null，越过范围整笔拒绝；单格0无凭空悬崖', () => {
    let map = createMap(1);
    map.cells[0][0] = null;
    const selected = grids(map);
    for (const height of [0, 1, 8, 16]) {
      const result = stroke(map, { type: 'set-height', height, grids: selected });
      expect(result.issues).toEqual([]);
      expect(result.definition.cells[0][0]).toBeNull();
      expect(result.definition.cells.flat().filter(Boolean).every(cell => cell.elevation === height)).toBe(true);
      expect(result.tiles.every(tile => !tile.slope)).toBe(true);
      map = result.definition;
    }
    const bottom = { ...map, cells: [[{ terrain: 'land', elevation: 0 }]] };
    expect(resolve(bottom).tiles).toHaveLength(1);
    expect(resolve(bottom).tiles[0].slope).toBe(false);
    const bad = stroke(bottom, { type: 'lower', grids: [[0, 0]] });
    hasIssue(bad, 'elevation-stroke-range');
    expect(bad.definition).toBeNull();
    expect(bottom.cells[0][0].elevation).toBe(0);
  });

  test('高平台实体可加载和随合法地基直接或联动改高，水域不随高程变化产生', () => {
    const map = shift(createMap(), 8);
    map.entities = [{ id: 'dog-a', element: 'dog', grid: [4, 4] }];
    expect(resolve(map).issues).toEqual([]);
    expect(stroke(map, { type: 'raise', grids: [[4, 4]] }).definition.entities).toEqual(map.entities);
    const ring = heightRules.neighborOffsets.map(([dx, dy]) => [4 + dx, 4 + dy]);
    expect(stroke(map, { type: 'raise', grids: ring }).definition.entities).toEqual(map.entities);
    expect(map.cells.flat().every(cell => cell.terrain === 'land' && cell.elevation === 8)).toBe(true);
  });
});

describe('等高平台水域', () => {
  const lake = height => {
    const map = load('__tests__/fixtures/map-samples/deep-water-map.json');
    return { ...map, version: 2, elevationStep: 40,
      cells: map.cells.map(row => row.map(cell => cell && { ...cell, elevation: height })) };
  };

  test.each([0, 1, 8, 16])('%i级水面保留岸线、深水和动画选择，四向与零高程仅相差投影高度', height => {
    const map = freezeDeep(lake(height));
    for (const angle of [0, 90, 180, 270]) {
      const result = resolve(map, angle);
      expect(result.issues).toEqual([]);
      expect(result.tiles).toEqual(resolve(lake(0), angle).tiles.map(tile => ({ ...tile, elevation: height })));
      expect(result.tiles.filter(tile => tile.waterKind === 'deep')).toHaveLength(1);
      expect(result.tiles.filter(tile => tile.waterKind === 'transition')).toHaveLength(8);
    }
    const saved = maps.exportMapDefinition(JSON.parse(JSON.stringify(map)), elements);
    expect(saved.issues).toEqual([]);
    expect(maps.importMapDefinition(saved.json, elements).definition).toEqual(map);
  });

  test('高处水域可绘制、擦除或与整图同升降，单独改变水格高程仍原子拒绝', () => {
    const map = freezeDeep(lake(8));
    const before = JSON.stringify(map);
    const land = stroke(map, { terrain: 'land', grids: [[3, 3]] });
    expect(land.issues).toEqual([]);
    expect(land.definition.cells[3][3]).toMatchObject({ terrain: 'land', elevation: 8 });
    const restored = stroke(land.definition, { terrain: 'water', grids: [[3, 3]] });
    expect(restored.definition).toEqual(map);
    const grids = map.cells.flatMap((row, y) => row.flatMap((cell, x) => cell ? [[x, y]] : []));
    const raised = stroke(map, { type: 'raise', grids });
    expect(raised.issues).toEqual([]);
    expect(raised.definition).toEqual(lake(9));
    expect(stroke(raised.definition, { type: 'lower', grids }).definition).toEqual(map);
    for (const type of ['raise', 'lower']) {
      const rejected = stroke(map, { type, grids: [[3, 3]] });
      hasIssue(rejected, 'unsupported-elevation-water');
      expect(rejected.definition).toBeNull();
    }
    expect(JSON.stringify(map)).toBe(before);
  });

  test.each([[7, 'unsupported-elevation-control'], [9, 'water-bank-required']])('8级水面与%i级孤立岸格保留具体形态约束', (height, code) => {
    const map = lake(8);
    map.cells[3][0].elevation = height;
    freezeDeep(map);
    for (const angle of [0, 90, 180, 270]) {
      hasIssue(resolve(map, angle), code);
    }
  });

  test('8级湖泊可邻接null，低水格需要坡面时读图明确要求岸带', () => {
    const map = lake(8);
    map.cells[0][3] = null;
    expect(resolve(freezeDeep(map)).issues).toEqual([]);
    const slope = lake(8);
    slope.cells[0][0] = { terrain: 'land', elevation: 9 };
    hasIssue(resolve(freezeDeep(slope)), 'water-bank-required');
  });
});

test('气候仅切换坡面主题；无近水也遵循整图主题，四向行号、高程和占地不变', () => {
  const map = createMap();
  map.cells[4][4].elevation = 2;
  for (const angle of [0, 90, 180, 270]) {
    const legacy = resolve(map, angle);
    for (const climate of ['arid', 'temperate', 'humid']) {
      const result = resolve({ ...map, climate }, angle);
      expect(result.issues).toEqual([]);
      result.tiles.forEach((tile, i) => {
        expect(tile).toMatchObject({ grid: legacy.tiles[i].grid, elevation: legacy.tiles[i].elevation, slope: legacy.tiles[i].slope, rowIndex: legacy.tiles[i].rowIndex, moisture: 0 });
        if (tile.slope) {
          expect(tile.element).toBe(climate === 'arid' ? legacy.tiles[i].element.replace('elevation-', 'elevation-dirt-') : legacy.tiles[i].element);
          expect(elements[tile.element].footprint).toEqual(elements[legacy.tiles[i].element].footprint);
        }
      });
    }
  }
  expect(resolve({ ...map, climate: 'arid' }, 0, elements, { ...heightRules, dirtElementPrefix: '' }).tiles).toBeNull();
});


describe('贴水高差与必要岸带', () => {
  const bankMap = (height = 8, step = 1) => ({ ...createMap(),
    cells: Array.from({ length: 9 }, (_, y) => Array.from({ length: 9 }, (_, x) =>
      ({ terrain: x < 4 ? 'land' : 'water', elevation: height + (x < 4 ? step : 0), terrainVariant: 17 }))),
  });
  const normalize = map => context.window.elevationRules.normalizeWaterBanks(map, elements);

  test.each([1, 2])('低水贴高地%d层：只转换必要一圈岸带，四向原图、事实与水位稳定', step => {
    const original = freezeDeep(bankMap(8, step));
    const before = JSON.stringify(original);
    hasIssue(resolve(original), 'water-bank-required');
    const result = stroke(original, { terrain: 'water', grids: [[4, 4]] });
    expect(result.issues).toEqual([]);
    const map = result.definition;
    map.cells.forEach((row, y) => row.forEach((cell, x) => {
      expect(cell).toEqual({ ...original.cells[y][x], terrain: x <= 4 ? 'land' : 'water' });
    }));
    expect(normalize(map).definition).toBe(map);
    for (const angle of [0, 90, 180, 270]) {
      const resolved = resolve(map, angle);
      expect(resolved.issues).toEqual([]);
      expect(resolved.tiles.filter(tile => tile.slope)).toHaveLength(9);
      expect(at(resolved, 4, 4).element).toMatch(/^emperor-elevation-/);
      expect(at(resolved, 5, 4).element).toMatch(/^emperor-terrain-/);
      expect(at(resolved, 6, 4).slope).toBe(false);
    }
    expect(JSON.stringify(original)).toBe(before);
  });

  test.each([0, 8, 14])('%i级低地旁高处湖面保留原水岸与下方岩壁，无岸带转换', height => {
    const map = bankMap(height, 2);
    map.cells.forEach(row => row.forEach((cell, x) => { cell.terrain = x < 4 ? 'water' : 'land'; }));
    freezeDeep(map);
    expect(normalize(map).definition).toBe(map);
    for (const angle of [0, 90, 180, 270]) {
      const result = resolve(map, angle);
      expect(result.issues).toEqual([]);
      expect(at(result, 3, 4)).toMatchObject({ elevation: height + 2, slope: false });
      expect(at(result, 4, 4)).toMatchObject({ elevation: height, slope: true });
    }
  });

  test('陆地坡脚可直接邻接同高水面；不因邻水而整体拒绝坡面', () => {
    const map = createMap();
    map.cells[4][4].elevation = 1;
    map.cells[2][4].terrain = 'water';
    for (const angle of [0, 90, 180, 270]) expect(resolve(freezeDeep(map), angle).issues).toEqual([]);
  });

  test('邻水升高联动转岸带但不改变任何既有水位；再次画水不抹掉岩壁', () => {
    const map = bankMap(8, 0);
    const before = JSON.stringify(map);
    const result = stroke(freezeDeep(map), { type: 'raise', grids: [[3, 4]] });
    expect(result.issues).toEqual([]);
    expect(result.definition.cells[4][3].elevation).toBe(9);
    for (const y of [3, 4, 5]) expect(result.definition.cells[y][4]).toEqual({ terrain: 'land', elevation: 8, terrainVariant: 17 });
    map.cells.forEach((row, y) => row.forEach((cell, x) => {
      if (cell.terrain === 'water') expect(result.definition.cells[y][x].elevation).toBe(cell.elevation);
    }));
    expect(stroke(result.definition, { terrain: 'water', grids: [[4, 4]] }).definition).toEqual(result.definition);
    expect(JSON.stringify(map)).toBe(before);
  });

  test('相邻不同水位先拒绝，不能由转岸带掩盖；斜角同样检查', () => {
    const map = bankMap();
    map.cells[5][5].elevation = 9;
    for (const result of [normalize(map), stroke(map, { terrain: 'water', grids: [[4, 4]] })]) {
      hasIssue(result, 'unsupported-elevation-water'); expect(result.definition).toBeNull();
    }
    const diagonal = createMap();
    diagonal.cells[3][3] = { terrain: 'water', elevation: 1 };
    diagonal.cells[4][4] = { terrain: 'water', elevation: 0 };
    hasIssue(normalize(diagonal), 'unsupported-elevation-water');
  });

  test('岸带转换保护完整实体和道路等事实，不丢弃字段来消除冲突', () => {
    const map = bankMap();
    map.entities = [{ id: 'dog-a', element: 'dog', grid: [4, 4] }];
    hasIssue(normalize(freezeDeep(map)), 'water-bank-protected');
    for (const fact of [{ road: 'ordinary' }, { quarry: true }, { ramp: true }]) {
      const occupied = bankMap(); Object.assign(occupied.cells[4][4], fact);
      hasIssue(normalize(freezeDeep(occupied)), 'water-bank-protected');
    }
  });

  test.each([1, 2])('凸角、凹角与null边界的%d层岸带均可四向解析', step => {
    for (const concave of [false, true]) {
      const map = createMap();
      map.cells.forEach((row, y) => row.forEach((cell, x) => {
        const high = x >= 3 && x <= 5 && y >= 3 && y <= 5 && !(concave && x === 5 && y === 5);
        Object.assign(cell, { elevation: high ? step : 0, terrain: high ? 'land' : 'water' });
      }));
      map.cells[0][0] = null;
      const result = normalize(freezeDeep(map));
      expect(result.issues).toEqual([]);
      expect(result.definition.cells[0][0]).toBeNull();
      for (const angle of [0, 90, 180, 270]) expect(resolve(result.definition, angle).issues).toEqual([]);
    }
  });
});


test('降低临水陆地不改变水位，可形成水面高于岸边的完整坡面', () => {
  const map = createMap();
  map.cells.forEach(row => row.forEach((cell, x) => { cell.elevation = 8; if (x >= 5) cell.terrain = 'water'; }));
  const result = stroke(freezeDeep(map), { type: 'lower', grids: [[3, 4]] });
  expect(result.issues).toEqual([]);
  expect(result.definition.cells[4][3].elevation).toBe(7);
  map.cells.forEach((row, y) => row.forEach((cell, x) => {
    if (cell.terrain === 'water') expect(result.definition.cells[y][x].elevation).toBe(8);
  }));
  for (const angle of [0, 90, 180, 270]) expect(resolve(result.definition, angle).issues).toEqual([]);
});


test('空地图仍返回结构问题，不在传递原高度邻域时抛异常', () => {
  expect(resolve(null).issues).toContainEqual(expect.objectContaining({ code: 'unsupported-version' }));
});

test('抬升邻水陆地生成岸带并清除水面专属实体，远处水面实例与所有水位保留', () => {
  const map = createMap(); map.cells.flat().forEach(cell => { cell.terrain = 'water'; cell.elevation = 8; });
  map.cells[4][4].terrain = 'land';
  const library = { ...elements, boat: { ...elements.dog, id: 'boat', groundTerrain: 'water' } };
  map.entities = [{ id: 'bank', element: 'boat', grid: [4, 3] }, { id: 'keep', element: 'boat', grid: [7, 7] }];
  freezeDeep(map);
  for (const angle of [0, 90, 180, 270]) {
    const result = context.window.elevationRules.applyStroke(map, { type: 'raise', grids: [[4, 4]] }, library, landRules, heightRules, angle);
    expect(result.issues).toEqual([]); expect(result.bankGrids).toHaveLength(8);
    expect(result.definition.cells[3][4].terrain).toBe('land');
    expect(result.definition.entities.map(e => e.id)).toEqual(['keep']);
    expect(result.definition.cells.flat().filter(c => c.terrain === 'water').every(c => c.elevation === 8)).toBe(true);
    expect(map.entities).toHaveLength(2);
  }
});
