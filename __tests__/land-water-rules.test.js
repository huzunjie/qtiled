import { pathFinding } from '../src';
import fs from 'fs';
import path from 'path';
import vm from 'vm';

const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
const samplePath = 'demo/static/terrain-samples/emperor-land-water/';
const rules = JSON.parse(read(`${samplePath}rules.json`));
const elements = JSON.parse(read(`${samplePath}elements.json`));
const context = vm.createContext({ window: { qtiled: { pathFinding } } });
vm.runInContext(read('demo/static/js/terrain-sample.js'), context);
vm.runInContext(read('demo/static/js/land-water-rules.js'), context);
const { resolve, applyStroke } = context.window.landWaterRules;
const angles = [0, 90, 180, 270];
const center = result => result.tiles.find(tile => tile.grid[0] === 1 && tile.grid[1] === 1);
const freezeDeep = value => {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freezeDeep);
    Object.freeze(value);
  }
  return value;
};

// 中心是水；八邻域 bit=1 表示非水，与原作水岸表的反转后输入一致。
function createMap(mask = 0) {
  const cells = Array.from({ length: 3 }, () => Array.from({ length: 3 }, () => ({ terrain: 'water', elevation: 0, terrainVariant: 0 })));
  rules.neighborOffsets.forEach(([dx, dy], bit) => {
    if (mask & (1 << bit)) cells[1 + dy][1 + dx].terrain = 'land';
  });
  return { version: 1, id: 'terrain-test', tileSize: [80, 40], cells, entities: [] };
}

describe('普通陆地/水域的真实样本规则', () => {
  test.each([
    [0x00, null, [664, 664, 664, 664]],
    [0xff, 0, [457, 457, 457, 457]],
    [0x01, 15, [390, 394, 398, 386]],
    [0x11, 5, [420, 418, 420, 418]],
  ])('邻域 %i 的内部、孤立、单边和窄条输出符合已保存的原作表', (mask, rowIndex, records) => {
    const map = freezeDeep(createMap(mask));
    angles.forEach((angle, index) => {
      const result = resolve(map, elements, rules, angle);
      expect(result.issues).toEqual([]);
      expect(center(result)).toEqual({ grid: [1, 1],
        element: mask === 0 ? 'emperor-water-deep' : `emperor-terrain-${records[index]}`,
        variant: 0, rowIndex, phase: 0, waterKind: mask === 0 ? 'deep' : null });
    });
  });

  // 绝对 0° 基准来自原图陆侧像素与 QTiled [(x+y)*40,(y-x)*20] 投影的独立对照。
  // 相对旋转检验无法发现四镜头整体错位一象限，因此另保留四边和实际湖泊两角。
  test.each([
    [0x01, 390, '左上陆侧'],
    [0x04, 394, '右上陆侧'],
    [0x10, 398, '右下陆侧'],
    [0x40, 386, '左下陆侧'],
    [0xe3, 402, '左上及左下陆侧，水向右'],
    [0x8f, 406, '左上及右上陆侧，水向下'],
  ])('像素校准的邻域 %i 在 0° 选择 #%i（%s）', (mask, record) => {
    const result = resolve(createMap(mask), elements, rules);
    expect(result.issues).toEqual([]);
    expect(center(result).element).toBe(`emperor-terrain-${record}`);
  });

  test('所有 256 邻域均有素材，四镜头与世界邻域实际旋转对应，事实保持不变', () => {
    for (let mask = 0; mask < 256; mask += 1) {
      const map = freezeDeep(createMap(mask));
      const before = JSON.stringify(map);
      angles.forEach((angle, turn) => {
        const result = resolve(map, elements, rules, angle);
        expect(result.issues).toEqual([]);
        expect(result.tiles).toHaveLength(9);
        // rotateGridPoint 的每个 90° 将邻域 bit 移动 2 位，不能直接把 angle/90 用作原表列。
        const shift = turn * 2;
        const rotatedMask = ((mask << shift) | (mask >>> (8 - shift))) & 255;
        expect(center(result).element).toBe(center(resolve(createMap(rotatedMask), elements, rules)).element);
      });
      expect(JSON.stringify(map)).toBe(before);
    }
  });

  test('null 和矩阵外允许水面延伸，四向不封岸且不输出无效格', () => {
    const map = createMap();
    map.cells[0][1] = null;
    const result = resolve(map, elements, rules);
    expect(result.issues).toEqual([]);
    expect(result.tiles).toHaveLength(8);
    expect(center(result).waterKind).toBe('deep');
    const single = { ...map, cells: [[{ terrain: 'water', elevation: 0 }]] };
    for (const angle of angles) {
      expect(resolve(single, elements, rules, angle).tiles[0]).toMatchObject({ element: rules.animationElements.deep, waterKind: 'deep', rowIndex: null });
    }
  });

  test('固定字节按表取余；缺省变体在反复预览、切镜头和 JSON 重载后保持', () => {
    const map = createMap(1);
    map.cells[1][1].terrainVariant = 255;
    expect(center(resolve(map, elements, rules))).toMatchObject({ element: 'emperor-terrain-393', variant: 3 });
    delete map.cells[1][1].terrainVariant;
    freezeDeep(map);
    const first = center(resolve(map, elements, rules));
    expect(first.variant).toBe(2);
    for (const angle of angles) {
      expect(center(resolve(map, elements, rules, angle)).variant).toBe(first.variant);
    }
    expect(resolve(JSON.parse(JSON.stringify(map)), elements, rules)).toEqual(resolve(map, elements, rules));
    expect(map.cells[1][1]).not.toHaveProperty('terrainVariant');
    expect(map.cells[1][1]).not.toHaveProperty('tile');
  });

  test.each([
    ['terrain', 'beach', 'unsupported-terrain'],
    ['elevation', 1, 'unsupported-elevation'],
    ['tile', 'emperor-terrain-202', 'derived-tile-conflict'],
    ['terrainVariant', -1, 'invalid-terrain-variant'],
    ['terrainVariant', 256, 'invalid-terrain-variant'],
    ['terrainVariant', 1.5, 'invalid-terrain-variant'],
  ])('拒绝格字段 %s=%s，并定位错误而不输出部分素材', (field, value, code) => {
    const map = createMap();
    map.cells[1][1][field] = value;
    const result = resolve(map, elements, rules);
    expect(result.tiles).toBeNull();
    expect(result.issues).toContainEqual(expect.objectContaining({ path: `cells[1][1].${field}`, code }));
  });

  test('缺素材、规则无解、坏规则和非法镜头均拒绝整图', () => {
    const missing = { ...elements };
    delete missing['emperor-water-even'];
    const noMatch = { ...rules, rows: [rules.rows[0]] };
    for (const [library, config, angle, code] of [
      [missing, rules, 0, 'missing-terrain-element'],
      [elements, noMatch, 0, 'unmatched-terrain-pattern'],
      [elements, { ...rules, rows: [] }, 0, 'invalid-terrain-rules'],
      [elements, { ...rules, animationElements: undefined }, 0, 'invalid-terrain-rules'],
      [elements, { ...rules, animationElements: { ...rules.animationElements, odd: '' } }, 0, 'invalid-terrain-rules'],
      [elements, rules, 45, 'invalid-angle'],
    ]) {
      const result = resolve(createMap(1), library, config, angle);
      expect(result.tiles).toBeNull();
      expect(result.issues).toContainEqual(expect.objectContaining({ code }));
    }
  });
});

describe('地表整笔候选事务', () => {
  test('重复格只改一次，保留事实与实体，重算笔刷外邻格；旧快照可直接撤销恢复', () => {
    const map = createMap(1);
    map.cells[0][1].note = { title: '保留扩展事实' };
    map.entities.push({ id: 'existing', element: 'unrelated', grid: [0, 0] });
    freezeDeep(map);
    const command = freezeDeep({ terrain: 'water', grids: [[1, 0], [1, 0]] });
    const previous = resolve(map, elements, rules);
    const result = applyStroke(map, command, elements, rules);
    expect(result.issues).toEqual([]);
    expect(result.definition.cells[0][1]).toEqual({ ...map.cells[0][1], terrain: 'water' });
    expect(result.definition.entities).toBe(map.entities);
    expect(result.definition.cells[0][1]).not.toBe(map.cells[0][1]);
    expect(center(previous).element).toBe('emperor-terrain-390');
    expect(center(result).element).toBe('emperor-water-deep');
    expect(map.cells[0][1].terrain).toBe('land');
    expect(result.tiles).toEqual(resolve(result.definition, elements, rules).tiles);
    expect(resolve(map, elements, rules)).toEqual(previous);
    expect(applyStroke(map, command, elements, rules)).toEqual(result);
    expect(JSON.parse(JSON.stringify(result.definition))).toEqual(result.definition);
  });

  test.each([
    [[3, 0], 'stroke-out-of-bounds'],
    [[-1, 0], 'stroke-out-of-bounds'],
    [[0, 0], 'stroke-invalid-cell'],
    [[1.5, 1], 'invalid-grid'],
    [[1], 'invalid-grid'],
  ])('含非法格 %j 时，前面的合法编辑也不生效', (grid, code) => {
    const map = createMap();
    map.cells[0][0] = null;
    freezeDeep(map);
    const before = JSON.stringify(map);
    const result = applyStroke(map, { terrain: 'land', grids: [[1, 1], grid] }, elements, rules);
    expect(result.definition).toBeNull();
    expect(result.tiles).toBeNull();
    expect(result.issues).toContainEqual(expect.objectContaining({ path: '$command.grids[1]', code }));
    expect(JSON.stringify(map)).toBe(before);
  });

  test('候选缺素材时整笔失败；补回同一素材后可原样重试', () => {
    const map = createMap(1);
    const command = { terrain: 'water', grids: [[1, 0]] };
    const library = { ...elements };
    delete library['emperor-water-deep'];
    freezeDeep(map);
    const result = applyStroke(map, command, library, rules);
    expect(result.definition).toBeNull();
    expect(result.tiles).toBeNull();
    expect(result.issues).toContainEqual(expect.objectContaining({ code: 'missing-terrain-element', path: 'cells[1][1]' }));
    expect(map.cells[0][1].terrain).toBe('land');
    expect(applyStroke(map, command, elements, rules).issues).toEqual([]);
  });
});

// 周围保留一圈陆地；原作双程序已确认的形态修整结果列于补证 semantic-checks.json。
function createLake(width, height = width, terrainVariant = 0) {
  return { ...createMap(), cells: Array.from({ length: height + 2 }, (_, y) =>
    Array.from({ length: width + 2 }, (_, x) => ({
      terrain: x > 0 && x <= width && y > 0 && y <= height ? 'water' : 'land',
      elevation: 0, terrainVariant,
    }))) };
}

describe('普通水面、内部过渡与深处水面的派生选择', () => {
  test.each([
    [3, 3, 1, 0, 0],
    [4, 4, 0, 4, 0],
    [5, 5, 0, 8, 1],
    [7, 7, 0, 16, 9],
    [3, 9, 7, 0, 0],
  ])('%i×%i 水域由形状派生三族，无须保存水深事实', (width, height, ordinary, transition, deep) => {
    const map = freezeDeep(createLake(width, height));
    const before = JSON.stringify(map);
    const result = resolve(map, elements, rules);
    expect(result.issues).toEqual([]);
    for (const [kind, count] of [['ordinary', ordinary], ['transition', transition], ['deep', deep]]) {
      expect(result.tiles.filter(tile => tile.waterKind === kind)).toHaveLength(count);
    }
    expect(JSON.stringify(map)).toBe(before);
    expect(map.cells[2][2]).not.toHaveProperty('waterKind');
    expect(map.cells[2][2]).not.toHaveProperty('phase');
  });

  test('同一个字节在普通、过渡和深处路径按各自初始化公式选择24帧序列', () => {
    const ordinary = resolve(createLake(3, 3, 47), elements, rules).tiles.find(tile => tile.waterKind === 'ordinary');
    const transition = resolve(createLake(4, 4, 47), elements, rules).tiles.find(tile => tile.waterKind === 'transition');
    const deep = resolve(createLake(5, 5, 47), elements, rules).tiles.find(tile => tile.waterKind === 'deep');
    expect(ordinary).toMatchObject({ element: 'emperor-water-even', phase: 12 });
    expect(transition).toMatchObject({ element: 'emperor-water-odd', phase: 23 });
    expect(deep).toMatchObject({ element: 'emperor-water-deep', phase: 23 });
    const evenTransition = resolve(createLake(4, 4, 46), elements, rules).tiles.find(tile => tile.waterKind === 'transition');
    expect(evenTransition).toMatchObject({ element: 'emperor-water-even', phase: 23 });
  });

  test('深处选图、世界格相位在镜头、重算与重载之间稳定，岸线保持静态', () => {
    const map = createLake(7);
    map.cells.forEach(row => row.forEach(cell => { delete cell.terrainVariant; }));
    freezeDeep(map);
    const original = resolve(map, elements, rules);
    const animated = result => result.tiles.filter(tile => tile.waterKind);
    for (const angle of angles) {
      const result = resolve(map, elements, rules, angle);
      expect(animated(result)).toEqual(animated(original));
      expect(result.tiles.filter(tile => tile.rowIndex !== null).every(tile => tile.phase === 0 && tile.waterKind === null)).toBe(true);
    }
    expect(resolve(JSON.parse(JSON.stringify(map)), elements, rules)).toEqual(original);
  });

  test('真实陆格仍中断内部标记，外接水域不因矩阵或空角退化为浅水', () => {
    const map = createLake(5);
    map.cells[1][1].terrain = 'land';
    expect(resolve(map, elements, rules).tiles.filter(tile => tile.waterKind === 'deep')).toHaveLength(0);
    const open = createMap();
    open.cells[0][0] = null;
    const before = JSON.stringify(open);
    for (const angle of angles) {
      const result = resolve(open, elements, rules, angle);
      expect(result.issues).toEqual([]);
      expect(result.tiles).toHaveLength(8);
      expect(result.tiles.every(tile => tile.waterKind === 'deep')).toBe(true);
      expect(resolve(JSON.parse(before), elements, rules, angle)).toEqual(result);
    }
    expect(JSON.stringify(open)).toBe(before);
  });

  test.each([[5, 'deep'], [3, 'ordinary']])('%i格宽水道延伸到地图两端，深浅仍由真实两岸决定', (width, kind) => {
    const map = createLake(width, 9);
    map.cells = map.cells.slice(1, -1); // 只移除两端封岸，左右真实岸线保留。
    const middle = (width + 1) / 2;
    for (const angle of angles) {
      const result = resolve(map, elements, rules, angle);
      expect(result.issues).toEqual([]);
      for (const y of [0, 4, 8]) {
        expect(result.tiles.find(tile => tile.grid[0] === middle && tile.grid[1] === y).waterKind).toBe(kind);
        expect(result.tiles.find(tile => tile.grid[0] === 1 && tile.grid[1] === y).rowIndex).not.toBeNull();
      }
    }
  });

  test('改一格会重算更远处的内部结果，撤销旧事实可恢复；缺深水帧族整笔失败', () => {
    const map = freezeDeep(createLake(5));
    const command = { terrain: 'land', grids: [[1, 1]] };
    const before = resolve(map, elements, rules);
    const result = applyStroke(map, command, elements, rules);
    expect(result.issues).toEqual([]);
    expect(before.tiles.find(tile => tile.grid.join(',') === '3,3').waterKind).toBe('deep');
    expect(result.tiles.find(tile => tile.grid.join(',') === '3,3').waterKind).toBe('transition');
    expect(resolve(map, elements, rules)).toEqual(before);
    const missing = { ...elements };
    delete missing['emperor-water-deep'];
    const restore = applyStroke(result.definition, { terrain: 'water', grids: [[1, 1]] }, missing, rules);
    expect(restore.definition).toBeNull();
    expect(restore.tiles).toBeNull();
    expect(restore.issues).toContainEqual(expect.objectContaining({ path: 'cells[3][3]', code: 'missing-terrain-element' }));
  });

  test('长窄水域修整使用显式栈，不把递归溢出或部分结果泄露为有效地图', () => {
    const result = resolve(createLake(3, 2000), elements, rules);
    expect(result.issues).toEqual([]);
    expect(result.tiles.filter(tile => tile.waterKind === 'ordinary')).toHaveLength(1998);
    expect(result.tiles.some(tile => ['transition', 'deep'].includes(tile.waterKind))).toBe(false);
  });
});

test('黄土变体均被使用，镜头、重算和JSON回读保持分布，显式外观可固定', () => {
  const map = { cells: Array.from({ length: 12 }, () => Array.from({ length: 12 }, () => ({ terrain: 'land', elevation: 0 }))) };
  const before = JSON.stringify(map);
  const result = resolve(map, elements, rules);
  expect(result.issues).toEqual([]);
  expect(new Set(result.tiles.map(tile => tile.element))).toEqual(new Set(rules.landVariants));
  for (const angle of angles) expect(resolve(JSON.parse(before), elements, rules, angle).tiles).toEqual(result.tiles);
  expect(JSON.stringify(map)).toBe(before);
  rules.landVariants.forEach((id, i) => {
    map.cells[0][0].terrainVariant = i;
    expect(resolve(map, elements, rules).tiles[0].element).toBe(id);
  });
  expect(resolve(map, elements, { ...rules, landVariants: [] }).issues[0].code).toBe('invalid-terrain-rules');
});

describe('三档气候的普通陆水派生', () => {
  const strip = climate => ({ version: 1, id: 'climate', climate, tileSize: [80, 40], entities: [],
    cells: [Array.from({ length: 64 }, (_, x) => ({ terrain: x ? 'land' : 'water', elevation: 0, terrainVariant: 0 }))] });
  test.each([
    ['arid', [[0, 100], [1, 100], [9, 20], [10, 10], [11, 0], [40, 0]]],
    ['temperate', [[1, 100], [21, 100], [22, 95], [39, 10], [40, 5], [41, 0]]],
    ['humid', [[1, 100], [41, 100], [42, 95], [59, 10], [60, 5], [61, 0]]],
  ])('%s 的饱和区、衰减尾部和最大范围符合原作参数', (climate, cases) => {
    const map = freezeDeep(strip(climate));
    const result = resolve(map, elements, rules);
    expect(result.issues).toEqual([]);
    cases.forEach(([x, moisture]) => expect(result.tiles[x].moisture).toBe(moisture));
    expect(result.tiles.filter(tile => tile.moisture === 0).every(tile => tile.grassGrade === null && tile.element.startsWith('emperor-bare-land'))).toBe(true);
  });

  test('八向最近水距与独立坐标算例一致，水源不叠加，空角不作为来源或障碍', () => {
    const map = strip('arid');
    const water = [[0, 0], [12, 9], [4, 15]];
    map.cells = Array.from({ length: 18 }, (_, y) => Array.from({ length: 19 }, (_, x) => x === 9 ? null
      : ({ terrain: water.some(([sx, sy]) => sx === x && sy === y) ? 'water' : 'land', elevation: 0 })));
    const result = resolve(map, elements, rules);
    expect(result.issues).toEqual([]);
    result.tiles.forEach(tile => {
      const distance = Math.min(...water.map(([x, y]) => Math.max(Math.abs(x - tile.grid[0]), Math.abs(y - tile.grid[1]))));
      expect(tile.moisture).toBe(Math.max(0, Math.min(100, (11 - distance) * 10)));
    });
    const noWater = { ...map, cells: map.cells.map(row => row.map(cell => cell && { ...cell, terrain: 'land' })) };
    expect(resolve(noWater, elements, rules).tiles.every(tile => tile.moisture === 0)).toBe(true);
  });

  test('五档全部九张可达；等级边界分散和档内变体只依赖固定字节', () => {
    for (const [distance, grade] of [[10, 0], [8, 1], [6, 2], [4, 3], [1, 4]]) {
      const ids = new Set();
      for (let byte = 0; byte < 9; byte += 1) {
        const map = strip('arid'); map.cells[0][distance].terrainVariant = byte;
        const tile = resolve(map, elements, rules).tiles[distance];
        expect(tile.grassGrade).toBe(grade); ids.add(tile.element);
      }
      expect([...ids]).toEqual(rules.grassVariants[grade]);
    }
    for (const [distance, grades] of [[3, [4, 3]], [5, [3, 2]], [7, [2, 1]], [9, [1, 0]]]) {
      const map = strip('arid');
      [0, 1].forEach(byte => {
        map.cells[0][distance].terrainVariant = byte;
        expect(resolve(map, elements, rules).tiles[distance].grassGrade).toBe(grades[byte]);
      });
    }
  });

  test('四向、重复派生和存读固定；擦除最后水源清除结果，失败整笔不改地图', () => {
    const map = strip('humid');
    map.cells[0].forEach(cell => delete cell.terrainVariant);
    freezeDeep(map);
    const before = JSON.stringify(map);
    const initial = resolve(map, elements, rules);
    for (const angle of angles) {
      const current = resolve(JSON.parse(before), elements, rules, angle);
      expect(current.tiles.filter(tile => tile.grassGrade !== null)).toEqual(initial.tiles.filter(tile => tile.grassGrade !== null));
    }
    const erased = applyStroke(map, { terrain: 'land', grids: [[0, 0]] }, elements, rules);
    expect(erased.issues).toEqual([]);
    expect(erased.tiles.every(tile => tile.moisture === 0 && tile.grassGrade === null)).toBe(true);
    expect(applyStroke(map, { terrain: 'land', grids: [[0, 0], [-1, 0]] }, elements, rules).definition).toBeNull();
    expect(JSON.stringify(map)).toBe(before);
    expect(before).not.toMatch(/moisture|grassGrade|"tile"/);
  });

  test.each([null, '', 'tropical', ['arid'], {}, 0, '__proto__'])('拒绝非法气候 %p', climate => {
    expect(resolve(strip(climate), elements, rules)).toMatchObject({ tiles: null, issues: expect.arrayContaining([expect.objectContaining({ path: 'climate' })]) });
  });

  test('旧图不依赖草地库；启用气候时缺档或缺实际素材明确拒绝', () => {
    const map = strip('arid'); delete map.climate;
    const config = { ...rules }; delete config.grassVariants;
    expect(resolve(map, elements, config)).toEqual(resolve(map, elements, rules));
    expect(resolve({ ...map, climate: 'arid' }, elements, config).tiles).toBeNull();
    const missing = { ...elements }; delete missing['emperor-grass-238'];
    expect(resolve(strip('arid'), missing, rules).tiles).toBeNull();
  });
});

test('气候规则实际调用基础距离场，仅传真实水源；旧图不要求新接口', () => {
  const base = context.window.qtiled;
  const getChebyshevDistanceField = jest.fn(pathFinding.getChebyshevDistanceField);
  context.window.qtiled = { pathFinding: { getChebyshevDistanceField } };
  try {
    const map = { ...createMap(), climate: 'arid', cells: [[null, { terrain: 'water', elevation: 0 }, { terrain: 'land', elevation: 0 }]] };
    expect(resolve(map, elements, rules).issues).toEqual([]);
    expect(getChebyshevDistanceField).toHaveBeenCalledWith(3, 1, [[1, 0]]);
    context.window.qtiled = {};
    expect(resolve(map, elements, rules).issues[0].code).toBe('missing-distance-field');
    delete map.climate;
    expect(resolve(map, elements, rules).issues).toEqual([]);
  } finally { context.window.qtiled = base; }
});
