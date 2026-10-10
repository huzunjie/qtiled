import fs from 'fs';
import path from 'path';
import vm from 'vm';

const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
const samplePath = 'demo/static/terrain-samples/emperor-land-water/';
const rules = JSON.parse(read(`${samplePath}rules.json`));
const elements = JSON.parse(read(`${samplePath}elements.json`));
const context = vm.createContext({ window: {} });
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
        element: mask === 0 ? 'emperor-water-even' : `emperor-terrain-${records[index]}`,
        variant: 0, rowIndex, phase: 0, waterKind: mask === 0 ? 'ordinary' : null });
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

  test('null 和矩阵外按工具约定视为非水，且不输出无效格', () => {
    const map = createMap();
    map.cells[0][1] = null;
    const result = resolve(map, elements, rules);
    expect(result.issues).toEqual([]);
    expect(result.tiles).toHaveLength(8);
    expect(center(result).element).toBe('emperor-terrain-390');
    const single = { ...map, cells: [[{ terrain: 'water', elevation: 0 }]] };
    expect(resolve(single, elements, rules).tiles[0].element).toBe('emperor-terrain-457');
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
      const result = resolve(createMap(), library, config, angle);
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
    expect(center(result).element).toBe('emperor-water-even');
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
    delete library['emperor-water-even'];
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

  test('null 和外界阻止内部标记；细水道不会因八邻全水就产生深处帧族', () => {
    const map = createLake(5);
    map.cells[1][1] = null;
    const result = resolve(map, elements, rules);
    expect(result.issues).toEqual([]);
    expect(result.tiles.filter(tile => tile.waterKind === 'deep')).toHaveLength(0);
    const edge = resolve(createMap(), elements, rules);
    expect(center(edge)).toMatchObject({ waterKind: 'ordinary', element: 'emperor-water-even' });
    expect(edge.tiles.filter(tile => tile.waterKind === 'deep')).toHaveLength(0);
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
