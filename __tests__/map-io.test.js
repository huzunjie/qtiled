import { applyMapEdit, importMapDefinition, exportMapDefinition, resolveMapEntities } from '../src/maps';

const library = { marker: {
  version: 1, id: 'marker', kind: 'sprite', footprint: [[0, 0], [1, 0]],
  views: Object.fromEntries([0, 90, 180, 270].map(angle => [angle, {
    source: 'marker.png', rect: [0, 0, 80, 80], anchor: [40, 60],
  }])),
} };
const createMap = () => ({
  version: 1, id: 'io', tileSize: [80, 40],
  cells: [[{ terrain: 'land', elevation: 0, note: '格属性' }, { terrain: 'land', elevation: 0 }, null]],
  entities: [
    { id: 'z', element: 'marker', grid: [0, 0] },
    { id: 'a', element: 'marker', grid: [1, 0], angle: 180 },
  ],
});
const freeze = value => {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
};

describe('地图文件 IO', () => {
  test('编辑后无损往返，保留顺序/姿态/附加值并独立重建索引', () => {
    const map = createMap();
    map.extra = { text: '地图', values: [null, true, 1.25], toJSON: '普通数据' };
    const shared = { label: '重复引用' };
    map.first = shared;
    map.second = shared;
    map.empty = Object.create(null);
    const removed = applyMapEdit(freeze(map), { type: 'remove', id: 'z' }, freeze(library));
    const edited = applyMapEdit(removed.definition, { type: 'place', entity: map.entities[0] }, library);
    const rule = jest.fn(() => true);
    const saved = exportMapDefinition(freeze(edited.definition), library, rule);
    expect(saved.issues).toEqual([]);
    expect(saved.json.endsWith('\n')).toBe(true);
    expect(rule).toHaveBeenCalledTimes(2);
    rule.mockClear();
    const loaded = importMapDefinition(saved.json, library, rule);
    expect(loaded).toEqual(edited);
    expect(rule).toHaveBeenCalledTimes(2);
    expect(loaded.index).not.toBe(edited.index);
    expect(loaded.definition.cells).not.toBe(map.cells);
    expect(loaded.definition.first).not.toBe(loaded.definition.second);
    expect(loaded.definition.entities.map(entity => entity.id)).toEqual(['a', 'z']);
    expect(loaded.definition.entities[1]).not.toHaveProperty('angle');
    for (const angle of [0, 90, 180, 270]) {
      expect(resolveMapEntities(loaded.definition, library, { angle })).toEqual(resolveMapEntities(edited.definition, library, { angle }));
    }
    expect(Object.keys(JSON.parse(saved.json))).toEqual(Object.keys(map));
  });

  test.each([undefined, null, {}, '', '{', '['])('非法文本 %p 不暴露部分结果', text => {
    expect(importMapDefinition(text)).toEqual({ definition: null, index: null, issues: [expect.objectContaining({ code: 'invalid-json', path: '$' })] });
  });

  test.each([
    ['结构', map => { map.version = 2; }, 'unsupported-version'],
    ['引用', map => { map.entities[0].element = 'missing'; }, 'missing-element'],
    ['越界', map => { map.entities[0].grid = [9, 0]; }, 'footprint-out-of-bounds'],
    ['无效格', map => { map.entities[0].grid = [1, 0]; }, 'footprint-invalid-cell'],
    ['共存', () => {}, 'coexistence-rejected'],
  ])('%s 失败保留旧状态，修正后恢复，导出同样拒绝', (name, change, code) => {
    const good = JSON.stringify(createMap());
    let current = importMapDefinition(good, library);
    const previous = current;
    const bad = createMap();
    change(bad);
    const rule = name === '共存' ? () => false : () => true;
    const next = importMapDefinition(JSON.stringify(bad), library, rule);
    if (!next.issues.length) current = next;
    expect(current).toBe(previous);
    expect(next.definition).toBeNull();
    expect(next.index).toBeNull();
    expect(next.issues).toEqual(expect.arrayContaining([expect.objectContaining({ code })]));
    expect(exportMapDefinition(bad, library, rule)).toEqual({ json: null, issues: next.issues });
    current = importMapDefinition(good, library);
    expect(current).toEqual(previous);
    expect(current.index).not.toBe(previous.index);
  });

  test.each([undefined, () => {}, Symbol('x'), BigInt(1), NaN, Infinity, -0, new Date(), new Map(), new Set(), /x/, new (class Custom {})(), Object.create({ x: 1 }), [,,]])('拒绝不可无损保存的附加值 %p', extra => {
    expect(exportMapDefinition({ ...createMap(), extra }, library)).toEqual({ json: null, issues: [expect.objectContaining({ code: 'non-json-value' })] });
  });

  test.each(['cycle', 'symbol', 'hidden', 'getter', 'toJSON', 'array-property', 'array-hole-key'])('拒绝特殊字段 %s，不执行用户代码', kind => {
    const map = createMap();
    const called = jest.fn(() => map);
    if (kind === 'cycle') map.extra = map;
    if (kind === 'symbol') map[Symbol('x')] = 1;
    if (kind === 'hidden') Object.defineProperty(map, 'extra', { value: 1 });
    if (kind === 'getter') Object.defineProperty(map, 'extra', { get: called, enumerable: true });
    if (kind === 'toJSON') map.toJSON = called;
    if (kind === 'array-property') map.entities.extra = 1;
    if (kind === 'array-hole-key') { map.extra = new Array(1); map.extra[4294967295] = 1; }
    expect(exportMapDefinition(map, library).json).toBeNull();
    expect(called).not.toHaveBeenCalled();
  });

  test.each(['1e400', '-0'])('导入拒绝会在再次导出时改写的数值 %s', value => {
    const text = JSON.stringify(createMap()).replace('"elevation":0', `"elevation":${value}`);
    expect(importMapDefinition(text, library).issues[0].code).toBe('non-json-value');
  });

  test('空地图使用默认参数，格底图引用仍保留', () => {
    const map = createMap();
    map.entities = [];
    expect(importMapDefinition(exportMapDefinition(map).json).index).toEqual(new Map());
    map.cells[0][0].tile = 'ground';
    const elements = { ground: { ...library.marker, id: 'ground', kind: 'tile', footprint: [[0, 0]] } };
    expect(importMapDefinition(exportMapDefinition(map, elements).json, elements).definition).toEqual(map);
  });

  test.each([null, () => 'yes', () => Promise.resolve(true), () => { throw new Error('规则错误'); }])('规则程序错误继续抛出 %p', rule => {
    expect(() => exportMapDefinition(createMap(), library, rule)).toThrow();
    expect(() => importMapDefinition(JSON.stringify(createMap()), library, rule)).toThrow();
  });
});
