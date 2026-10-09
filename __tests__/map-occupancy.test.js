import { buildMapOccupancy, checkMapEntityPlacement, resolveMapEntities, validateMapDefinition } from '../src/maps';
import { validateElementDefinition } from '../src/elements';
import { resolveElementPlacement } from '../src/element-rendering/placement';

const angles = [0, 90, 180, 270];
const createElement = (footprint = [[0, 0], [1, 0]]) => ({
  version: 1, id: 'sample', kind: 'sprite', footprint,
  views: Object.fromEntries(angles.map(angle => [angle, {
    source: 'sample.png', rect: [0, 0, 80, 80], anchor: [40, 60],
  }])),
});
const createEntity = (id, grid = [1, 1]) => ({ id, element: 'sample', grid });
const createMap = (entities = [createEntity('b'), createEntity('a', [2, 1])]) => ({
  version: 1, id: 'map', tileSize: [80, 40],
  cells: Array.from({ length: 4 }, () => Array.from({ length: 6 }, () => ({ terrain: 'land', elevation: 0 }))),
  entities,
});
const createLibrary = () => ({ sample: createElement() });
const freezeDeep = value => {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freezeDeep);
    Object.freeze(value);
  }
  return value;
};

describe('完整占地与按格多实体索引', () => {
  test('正常占地按输入顺序关联唯一 ID，不排序 ID 或序列化索引', () => {
    const library = createLibrary();
    expect(validateElementDefinition(library.sample, { 'sample.png': { width: 80, height: 80 } })).toEqual([]);
    const map = createMap();
    const before = JSON.stringify(map);
    const result = buildMapOccupancy(map, library);
    expect(result.issues).toEqual([]);
    expect([...result.index]).toEqual([
      ['1,1', ['b']], ['2,1', ['b', 'a']], ['3,1', ['a']],
    ]);
    expect(result.index.get('0,0')).toBeUndefined();
    expect(JSON.stringify(map)).toBe(before);
    expect(buildMapOccupancy({ ...map, entities: [...map.entities].reverse() }, library).index.get('2,1')).toEqual(['a', 'b']);
  });

  test('空实例使用默认元素库得到空索引，单实例格不调用共存规则', () => {
    expect(buildMapOccupancy(createMap([]))).toEqual({ index: new Map(), issues: [] });
    const rule = jest.fn(() => false);
    expect(buildMapOccupancy(createMap([createEntity('one')]), createLibrary(), rule).issues).toEqual([]);
    expect(rule).not.toHaveBeenCalled();
  });

  test.each([
    [[-1, 1], [-1, 1]], [[5, 1], [6, 1]], [[1, -1], [1, -1]], [[1, 4], [1, 4]],
  ])('原点 %j 的完整占地越界，不返回裁切索引', (origin, failedGrid) => {
    const map = createMap([createEntity('bad', origin)]);
    const library = createLibrary();
    expect(validateMapDefinition(map, library)).toEqual([]);
    expect(resolveMapEntities(map, library).entities[0].draw.footprint).toHaveLength(2);
    const result = buildMapOccupancy(map, library);
    expect(result.index).toBeNull();
    expect(result.issues[0]).toMatchObject({ path: 'entities[0]', code: 'footprint-out-of-bounds', entityId: 'bad', grid: failedGrid });
  });

  test('非原点占地触及 null 洞时定位该格，修正后恢复且不污染旧索引', () => {
    const map = createMap();
    const library = createLibrary();
    const baseline = buildMapOccupancy(map, library).index;
    const before = [...baseline].map(([key, ids]) => [key, [...ids]]);
    map.cells[1][2] = null;
    const rule = jest.fn(() => true);
    const result = buildMapOccupancy(map, library, rule);
    expect(result.index).toBeNull();
    expect(result.issues.map(({ code, entityId, grid }) => ({ code, entityId, grid }))).toEqual([
      { code: 'footprint-invalid-cell', entityId: 'b', grid: [2, 1] },
      { code: 'footprint-invalid-cell', entityId: 'a', grid: [2, 1] },
    ]);
    expect(rule).not.toHaveBeenCalled();
    expect([...baseline]).toEqual(before);
    map.cells[1][2] = { terrain: 'land', elevation: 0 };
    expect(buildMapOccupancy(map, library)).toEqual({ index: baseline, issues: [] });
  });

  test.each([[[-1, 1]], [[0, 1]]])('原点 %j 位于界外或 null，但真实占地有效即可通过', origin => {
    const map = createMap([createEntity('offset', origin)]);
    map.cells[1][0] = null;
    const library = { sample: createElement([[1, 0], [2, 0]]) };
    if (origin[0] === -1) library.sample.footprint = [[2, 0], [3, 0]];
    expect([...buildMapOccupancy(map, library).index]).toEqual([['1,1', ['offset']], ['2,1', ['offset']]]);
  });

  test('不规则占地不填充包围盒空洞，底图不生成实体占用', () => {
    const map = createMap([createEntity('irregular', [0, 0])]);
    map.cells[1][1] = null;
    map.cells[0][0].tile = 'ground';
    const library = {
      sample: createElement([[0, 0], [2, 0], [0, 2]]),
      ground: { ...createElement([[0, 0]]), id: 'ground', kind: 'tile' },
    };
    const result = buildMapOccupancy(map, library);
    expect(result.issues).toEqual([]);
    expect([...result.index]).toEqual([['0,0', ['irregular']], ['2,0', ['irregular']], ['0,2', ['irregular']]]);
  });

  test.each([true, false])('显式场景规则允许=%s，返回完整同格集合和可定位的拒绝原因', allowed => {
    const rule = jest.fn(() => allowed);
    const result = buildMapOccupancy(createMap(), createLibrary(), rule);
    expect(rule).toHaveBeenCalledTimes(1);
    expect(rule).toHaveBeenCalledWith({ grid: [2, 1], entities: [
      { ...createEntity('b'), angle: 0 }, { ...createEntity('a', [2, 1]), angle: 0 },
    ] });
    if (allowed) {
      expect(result.issues).toEqual([]);
      expect(result.index.get('2,1')).toEqual(['b', 'a']);
    } else {
      expect(result.index).toBeNull();
      expect(result.issues).toEqual([expect.objectContaining({
        path: 'cells[1][2]', code: 'coexistence-rejected', grid: [2, 1], entityIds: ['b', 'a'],
      })]);
    }
  });

  test('三实例集合容量与按格选择性拒绝；移除一个后其他引用保留', () => {
    const map = createMap(['c', 'b', 'a'].map(id => createEntity(id)));
    const library = createLibrary();
    const baseline = buildMapOccupancy(map, library).index;
    const capacity = ({ entities }) => entities.length <= 2;
    expect(buildMapOccupancy(map, library, capacity).issues.map(issue => issue.grid)).toEqual([[1, 1], [2, 1]]);
    const remaining = { ...map, entities: map.entities.filter(entity => entity.id !== 'b') };
    const rebuilt = buildMapOccupancy(remaining, library, capacity);
    expect(rebuilt.issues).toEqual([]);
    expect([...rebuilt.index]).toEqual([['1,1', ['c', 'a']], ['2,1', ['c', 'a']]]);
    expect([...baseline]).toEqual([['1,1', ['c', 'b', 'a']], ['2,1', ['c', 'b', 'a']]]);
    expect(buildMapOccupancy(map, library, ({ grid }) => grid[0] === 1).issues.map(issue => issue.grid)).toEqual([[2, 1]]);
  });

  test.each(angles)('矩形对象 %i° 放置后的占地与四镜头消费一致', objectAngle => {
    const library = createLibrary();
    const pose = resolveElementPlacement(library.sample, [3, 1], objectAngle, 0);
    const map = createMap([{ ...createEntity('turned', pose.grid), angle: pose.objectAngle }]);
    const result = buildMapOccupancy(map, library);
    const expected = objectAngle % 180 === 0 ? ['2,1', '3,1'] : ['3,1', '3,2'];
    expect(result.issues).toEqual([]);
    expect([...result.index.keys()].sort()).toEqual(expected);
    for (const angle of angles) {
      const draw = resolveMapEntities(map, library, { angle }).entities[0].draw;
      expect(draw.footprint.map(({ grid }) => grid.join(',')).sort()).toEqual(expected);
    }
  });

  test('冻结输入、规则参数及派生数组相互隔离', () => {
    const map = freezeDeep(createMap(['b', 'a'].map(id => createEntity(id))));
    const library = freezeDeep(createLibrary());
    const before = JSON.stringify({ map, library });
    const rule = jest.fn(({ grid, entities }) => {
      expect(entities.map(entity => entity.id)).toEqual(['b', 'a']);
      expect(entities[0].grid).toEqual([1, 1]);
      grid[0] = 999;
      entities[0].id = 'changed';
      entities[0].grid[0] = 999;
      entities.pop();
      return true;
    });
    const result = buildMapOccupancy(map, library, rule);
    expect(rule).toHaveBeenCalledTimes(2);
    expect(result.issues).toEqual([]);
    result.index.get('1,1').pop();
    expect(result.index.get('2,1')).toEqual(['b', 'a']);
    expect(buildMapOccupancy(map, library).index.get('1,1')).toEqual(['b', 'a']);
    expect(JSON.stringify({ map, library })).toBe(before);
    expect(map.entities[0]).not.toHaveProperty('angle');
  });

  test('复用 A2 结构/引用错误，修正后重建恢复', () => {
    expect(buildMapOccupancy()).toEqual({ index: null, issues: validateMapDefinition() });
    const map = createMap();
    expect(buildMapOccupancy(map)).toEqual({ index: null, issues: validateMapDefinition(map) });
    const library = createLibrary();
    map.entities[1].id = 'b';
    expect(buildMapOccupancy(map, library).issues[0].code).toBe('duplicate-entity-id');
    map.entities[1].id = 'a';
    expect(buildMapOccupancy(map, library).issues).toEqual([]);
  });

  test('安全整数相加溢出不生成索引键', () => {
    const map = createMap([createEntity('large', [Number.MAX_SAFE_INTEGER, 1])]);
    const result = buildMapOccupancy(map, createLibrary());
    expect(result.index).toBeNull();
    expect(result.issues.map(issue => issue.code)).toEqual(['footprint-out-of-bounds', 'unsafe-footprint-grid']);
  });

  test.each([undefined, 1, 'yes', Promise.resolve(true)])('规则返回非布尔值 %s 时抛错且后续调用恢复', value => {
    const map = freezeDeep(createMap());
    const library = freezeDeep(createLibrary());
    const baseline = buildMapOccupancy(map, library);
    expect(() => buildMapOccupancy(map, library, () => value)).toThrow(TypeError);
    expect(buildMapOccupancy(map, library)).toEqual(baseline);
  });

  test('非法规则类型及规则异常不替换有效索引', () => {
    const map = createMap();
    const library = createLibrary();
    const baseline = buildMapOccupancy(map, library);
    expect(() => buildMapOccupancy(map, library, null)).toThrow(TypeError);
    expect(() => buildMapOccupancy(map, library, () => { throw new Error('规则故障'); })).toThrow('规则故障');
    expect(buildMapOccupancy(map, library)).toEqual(baseline);
  });
});

describe('候选实体放置检查', () => {
  test('默认允许新增而不落盘；规则拒绝后调整位置恢复，已有索引保持', () => {
    const map = freezeDeep(createMap([createEntity('existing')]));
    const library = freezeDeep(createLibrary());
    const entity = freezeDeep(createEntity('new'));
    const before = JSON.stringify({ map, library, entity });
    const baseline = buildMapOccupancy(map, library);
    expect(checkMapEntityPlacement(map, entity, library)).toEqual({ allowed: true, issues: [] });
    const rejected = checkMapEntityPlacement(map, entity, library, () => false);
    expect(rejected.allowed).toBe(false);
    expect(rejected.issues.map(issue => issue.entityIds)).toEqual([['existing', 'new'], ['existing', 'new']]);
    expect(checkMapEntityPlacement(map, { ...entity, grid: [3, 1] }, library, () => false)).toEqual({ allowed: true, issues: [] });
    expect(JSON.stringify({ map, library, entity })).toBe(before);
    expect(buildMapOccupancy(map, library)).toEqual(baseline);
  });

  test.each([
    [undefined, 'entities[2]', 'invalid-entity'],
    [createEntity('a'), 'entities[2].id', 'duplicate-entity-id'],
    [createEntity('new', [5, 1]), 'entities[2]', 'footprint-out-of-bounds'],
    [{ ...createEntity('new'), element: 'missing' }, 'entities[2].element', 'missing-element'],
  ])('候选错误 %j 返回追加路径及原因', (entity, path, code) => {
    const result = checkMapEntityPlacement(createMap(), entity, createLibrary());
    expect(result.allowed).toBe(false);
    expect(result.issues[0]).toMatchObject({ path, code });
  });

  test('已有地图的结构、几何或共存错误也拒绝新增', () => {
    expect(checkMapEntityPlacement()).toEqual({ allowed: false, issues: validateMapDefinition() });
    const map = createMap();
    const library = createLibrary();
    const entity = createEntity('new', [4, 2]);
    expect(checkMapEntityPlacement(map, entity).allowed).toBe(false);
    expect(checkMapEntityPlacement(map, entity, library, () => false).issues[0].code).toBe('coexistence-rejected');
    map.cells[1][1] = null;
    expect(checkMapEntityPlacement(map, entity, library).issues[0]).toMatchObject({
      path: 'entities[0]', entityId: 'b', code: 'footprint-invalid-cell',
    });
  });
});
