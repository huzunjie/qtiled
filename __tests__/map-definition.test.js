import { validateMapDefinition } from '../src/maps';
import { validateElementDefinition } from '../src/elements';
import * as core from '../src';

const createCell = () => ({ terrain: 'land', elevation: 0 });
const createMap = () => ({
  version: 1, id: 'example-map', tileSize: [80, 40],
  cells: [[createCell(), null], [createCell(), createCell()]],
  entities: [],
});
const createEntity = () => ({ id: 'dog-a', element: 'dog', grid: [0, 1] });
const createLibrary = () => Object.fromEntries(['tile', 'sprite'].map(kind => {
  const id = kind === 'tile' ? 'grass' : 'dog';
  return [id, {
    version: 1, id, kind, footprint: kind === 'tile' ? [[0, 0]] : [[-1, 0], [0, 0]],
    views: Object.fromEntries(['0', '90', '180', '270'].map(angle => [angle, {
      source: 'sample.png', rect: [0, 0, 80, 80], anchor: [40, 60],
    }])),
  }];
}));
const expectIssue = (issues, path, code) => expect(issues).toEqual([
  expect.objectContaining({ path, code, message: expect.any(String) }),
]);
const freezeDeep = value => {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freezeDeep);
    Object.freeze(value);
  }
  return value;
};

describe('平地地图结构校验', () => {
  test('无素材地图使用默认空元素库，空实体数组和 null 无效格合法', () => {
    expect(validateMapDefinition(createMap())).toEqual([]);
  });

  test('消费已通过 P0 校验的底图和共享精灵定义', () => {
    const library = createLibrary();
    Object.values(library).forEach(element => {
      expect(validateElementDefinition(element, { 'sample.png': { width: 80, height: 80 } })).toEqual([]);
    });
    const map = createMap();
    map.cells[0][0].tile = 'grass';
    map.entities = [createEntity(), { ...createEntity(), id: 'dog-b', grid: [1, 1], angle: 90 }];
    expect(validateMapDefinition(map, library)).toEqual([]);
  });

  test.each([undefined, null, [], 'map', 1])('根定义 %p 非法时只报告根问题', value => {
    expectIssue(validateMapDefinition(value), '$', 'invalid-map-definition');
  });

  test.each([
    ['字符串版本', 'version', '1', 'unsupported-version'],
    ['缺版本', 'version', undefined, 'unsupported-version'],
    ['未知版本', 'version', 3, 'unsupported-version'],
    ['空 ID', 'id', ' ', 'invalid-id'],
    ['非字符串 ID', 'id', 1, 'invalid-id'],
    ['缺尺寸', 'tileSize', undefined, 'invalid-tile-size'],
    ['尺寸长度错误', 'tileSize', [80], 'invalid-tile-size'],
    ['零尺寸', 'tileSize', [0, 40], 'invalid-tile-size'],
    ['负尺寸', 'tileSize', [80, -1], 'invalid-tile-size'],
    ['字符串尺寸', 'tileSize', ['80', 40], 'invalid-tile-size'],
    ['无穷尺寸', 'tileSize', [80, Infinity], 'invalid-tile-size'],
    ['NaN 尺寸', 'tileSize', [NaN, 40], 'invalid-tile-size'],
    ['尺寸空槽', 'tileSize', new Array(2), 'invalid-tile-size'],
    ['缺矩阵', 'cells', undefined, 'invalid-cells'],
    ['非数组矩阵', 'cells', {}, 'invalid-cells'],
    ['空矩阵', 'cells', [], 'invalid-cells'],
    ['全 null 矩阵', 'cells', [[null, null]], 'invalid-cells'],
    ['缺实体集合', 'entities', undefined, 'invalid-entities'],
    ['非数组实体集合', 'entities', {}, 'invalid-entities'],
  ])('%s 定位顶层字段', (name, field, value, code) => {
    const map = createMap();
    map[field] = value;
    expectIssue(validateMapDefinition(map), field, code);
  });

  test.each([
    ['空行', [[]], 'cells[0]', 'invalid-row'],
    ['非数组行', [null], 'cells[0]', 'invalid-row'],
    ['行空槽', new Array(1), 'cells[0]', 'invalid-row'],
    ['行宽不同且不追报该行子字段', [[createCell()], [{}, null]], 'cells[1]', 'row-width-mismatch'],
    ['格空槽', [new Array(1)], 'cells[0][0]', 'invalid-cell'],
    ['显式 undefined 格', [[undefined]], 'cells[0][0]', 'invalid-cell'],
    ['旧数字格', [[0]], 'cells[0][0]', 'invalid-cell'],
    ['旧字符串格', [['grass']], 'cells[0][0]', 'invalid-cell'],
    ['数组格', [[[]]], 'cells[0][0]', 'invalid-cell'],
  ])('%s 不误当作有效格或 null', (name, cells, path, code) => {
    expectIssue(validateMapDefinition({ ...createMap(), cells }), path, code);
  });

  test.each([
    ['terrain', undefined, 'invalid-terrain'],
    ['terrain', ' ', 'invalid-terrain'],
    ['terrain', 1, 'invalid-terrain'],
    ['elevation', undefined, 'invalid-elevation'],
    ['elevation', null, 'invalid-elevation'],
    ['elevation', '0', 'invalid-elevation'],
    ['elevation', NaN, 'invalid-elevation'],
    ['elevation', Infinity, 'invalid-elevation'],
    ['elevation', 1, 'unsupported-elevation'],
    ['elevation', -0.5, 'unsupported-elevation'],
  ])('格属性 %s=%p 定位到格内字段', (field, value, code) => {
    const map = createMap();
    map.cells[1][0][field] = value;
    expectIssue(validateMapDefinition(map), `cells[1][0].${field}`, code);
  });

  test('首行非法时继续检查其他行内容，不推断行宽或追加空地图错误', () => {
    const map = createMap();
    map.cells = [null, [{}], [createCell(), null]];
    expect(validateMapDefinition(map).map(({ path, code }) => [path, code])).toEqual([
      ['cells[0]', 'invalid-row'],
      ['cells[1][0].terrain', 'invalid-terrain'],
      ['cells[1][0].elevation', 'invalid-elevation'],
    ]);
  });

  test('接受小数和非 2:1 尺寸，不在结构层解释地形、界外或同格共存', () => {
    const map = createMap();
    map.tileSize = [80.5, 30.25];
    map.cells[0][0].terrain = 'custom-terrain';
    map.entities = [createEntity(), { ...createEntity(), id: 'dog-b' },
      { ...createEntity(), id: 'dog-c', grid: [-3, -1] }];
    expect(validateMapDefinition(map, createLibrary())).toEqual([]);
  });
});

describe('实体和素材引用校验', () => {
  test.each([0, 90, 180, 270])('接受对象角度 %s', angle => {
    const map = { ...createMap(), entities: [{ ...createEntity(), angle }] };
    expect(validateMapDefinition(map, createLibrary())).toEqual([]);
  });

  test.each([
    ['id', '', 'invalid-id'],
    ['element', null, 'invalid-element-reference'],
    ['element', 'missing', 'missing-element'],
    ['element', 'grass', 'element-kind-mismatch'],
    ['grid', undefined, 'invalid-grid'],
    ['grid', [0], 'invalid-grid'],
    ['grid', ['0', 0], 'invalid-grid'],
    ['grid', [0.5, 0], 'invalid-grid'],
    ['grid', [Infinity, 0], 'invalid-grid'],
    ['grid', [Number.MAX_SAFE_INTEGER + 1, 0], 'invalid-grid'],
    ['grid', new Array(2), 'invalid-grid'],
    ['angle', undefined, 'invalid-object-angle'],
    ['angle', null, 'invalid-object-angle'],
    ['angle', '90', 'invalid-object-angle'],
    ['angle', 45, 'invalid-object-angle'],
    ['angle', 360, 'invalid-object-angle'],
  ])('实体字段 %s=%p 无效', (field, value, code) => {
    const map = { ...createMap(), entities: [{ ...createEntity(), [field]: value }] };
    expectIssue(validateMapDefinition(map, createLibrary()), `entities[0].${field}`, code);
  });

  test.each([null, undefined, [], 'dog'])('无效实体 %p 只报告实例本身', entity => {
    expectIssue(validateMapDefinition({ ...createMap(), entities: [entity] }), 'entities[0]', 'invalid-entity');
  });

  test('实体数组空槽不能漏过；重复 ID 定位到后出现的实例', () => {
    const map = { ...createMap(), entities: new Array(1) };
    expectIssue(validateMapDefinition(map), 'entities[0]', 'invalid-entity');
    map.entities = [createEntity(), createEntity()];
    expectIssue(validateMapDefinition(map, createLibrary()), 'entities[1].id', 'duplicate-entity-id');
  });

  test.each([undefined, null, '', ' ', 0])('显式提供 tile=%p 不等于省略贴图', tile => {
    const map = createMap();
    map.cells[0][0].tile = tile;
    expectIssue(validateMapDefinition(map), 'cells[0][0].tile', 'invalid-element-reference');
  });

  test.each([
    ['缺素材', {}, 'missing-element'],
    ['原型素材', Object.create(createLibrary()), 'missing-element'],
    ['空库项', { grass: null }, 'invalid-element-entry'],
    ['库键与 ID 不同', { grass: { id: 'other' } }, 'invalid-element-entry'],
    ['精灵不能作为底图', { grass: { id: 'grass', kind: 'sprite' } }, 'element-kind-mismatch'],
    ...[undefined, [], [[1, 0]], [[0, 0], [1, 0]], [new Array(2)]].map(footprint => [
      `底图占地 ${JSON.stringify(footprint)}`, { grass: { id: 'grass', kind: 'tile', footprint } }, 'unsupported-tile-footprint',
    ]),
  ])('%s 只报告当前引用错误', (name, library, code) => {
    const map = createMap();
    map.cells[0][0].tile = 'grass';
    expectIssue(validateMapDefinition(map, library), 'cells[0][0].tile', code);
  });

  test('默认库不能解析引用，未引用的坏库项不影响地图', () => {
    const map = { ...createMap(), entities: [createEntity()] };
    expectIssue(validateMapDefinition(map), 'entities[0].element', 'missing-element');
    expect(validateMapDefinition(map, { ...createLibrary(), unused: null })).toEqual([]);
  });

  test.each([null, [], 1])('无效库 %p 跳过引用解析，但继续检查独立字段', library => {
    const map = { ...createMap(), entities: [{ ...createEntity(), grid: null }] };
    map.cells[0][0].tile = '';
    expect(validateMapDefinition(map, library).map(({ path, code }) => [path, code])).toEqual([
      ['$elements', 'invalid-element-library'],
      ['cells[0][0].tile', 'invalid-element-reference'],
      ['entities[0].grid', 'invalid-grid'],
    ]);
  });
});

describe('诊断和输入稳定性', () => {
  test('诊断按顶层、行列、实例顺序输出，修正后恢复通过', () => {
    const map = createMap();
    map.id = '';
    map.cells[0][0] = {};
    map.cells[1][1].tile = 'missing';
    map.entities = [null];
    const library = createLibrary();
    expect(validateMapDefinition(map, library).map(({ path }) => path)).toEqual([
      'id', 'cells[0][0].terrain', 'cells[0][0].elevation', 'cells[1][1].tile', 'entities[0]',
    ]);
    map.id = 'fixed';
    map.cells[0][0] = createCell();
    map.cells[1][1].tile = 'grass';
    map.entities = [createEntity()];
    expect(validateMapDefinition(map, library)).toEqual([]);
  });

  test.each([false, true])('成功或失败均不修改冻结输入、不补默认值（错误=%s）', invalid => {
    const map = createMap();
    map.entities = [createEntity()];
    map.extra = { note: '保留扩展内容' };
    map.cells[0][0].entities = [{ id: '仅附加数据' }];
    if (invalid) map.cells[0][0].elevation = 1;
    const library = freezeDeep(createLibrary());
    freezeDeep(map);
    const before = JSON.stringify({ map, library });
    expect(validateMapDefinition(map, library)).toHaveLength(invalid ? 1 : 0);
    expect(JSON.stringify({ map, library })).toBe(before);
    expect(Object.prototype.hasOwnProperty.call(map.entities[0], 'angle')).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(map.cells[0][0], 'tile')).toBe(false);
  });

  test('可选地图模块不增加核心入口导出', () => {
    expect(Object.keys(core).sort()).toEqual(['pathFinding', 'shapes']);
  });
});


describe('v2 高程地图结构', () => {
  test('显式版本与高度单位，非负边界及底图引用可用；不自动迁移 v1', () => {
    const map = { ...createMap(), version: 2, elevationStep: 20.5 };
    map.cells[0][0].elevation = 16;
    map.cells[0][0].tile = 'grass';
    expect(validateMapDefinition(freezeDeep(map), createLibrary())).toEqual([]);
    expect(validateMapDefinition({ ...map, cells: [[{ terrain: 'land', elevation: 0 }]] })).toEqual([]);
    expect(validateMapDefinition({ ...map, version: 1 }, createLibrary())).toEqual([
      expect.objectContaining({ path: 'cells[0][0].elevation', code: 'unsupported-elevation' }),
    ]);
    expect(validateMapDefinition({ ...createMap(), elevationStep: '旧附加字段' })).toEqual([]);
  });

  test.each([undefined, null, '20', 0, -1, NaN, Infinity])('单位 %p 不可用时定位顶层字段', elevationStep => {
    expectIssue(validateMapDefinition({ ...createMap(), version: 2, elevationStep }), 'elevationStep', 'invalid-elevation-step');
  });

  test.each([-16, -1, 0.5, 17, Number.MAX_SAFE_INTEGER + 1])('高程 %p 不属于支持的整数等级', elevation => {
    const map = { ...createMap(), version: 2, elevationStep: 20 };
    map.cells[0][0].elevation = elevation;
    expectIssue(validateMapDefinition(map), 'cells[0][0].elevation', 'unsupported-elevation');
  });
});
