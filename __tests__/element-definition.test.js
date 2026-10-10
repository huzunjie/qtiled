import { validateElementDefinition, importElementDefinition } from '../src/elements';
import * as core from '../src';

const angles = ['0', '90', '180', '270'];
const sourceInfo = Object.fromEntries(angles.map(angle => [`images/${angle}.png`, { width: 64, height: 96 }]));
const createDefinition = () => ({
  version: 1,
  id: 'example-sprite',
  kind: 'sprite',
  footprint: [[-1, 0], [0, 0], [0, 1]],
  views: Object.fromEntries(angles.map(angle => [angle, {
    source: `images/${angle}.png`, rect: [0, 0, 64, 96], anchor: [32, 76],
  }])),
});

describe('静态元素定义校验', () => {
  test.each(['tile', 'sprite'])('接受完整 %s 定义与贴边裁切', kind => {
    const definition = createDefinition();
    definition.kind = kind;
    expect(validateElementDefinition(definition, sourceInfo)).toEqual([]);
  });

  test('保留负坐标、不含原点的占地及区域外的小数锚点', () => {
    const definition = createDefinition();
    definition.footprint = [[-2, 0], [-1, 1]];
    definition.views['0'].anchor = [-0.5, 200.25];
    expect(validateElementDefinition(definition, sourceInfo)).toEqual([]);
    expect(definition.footprint).toEqual([[-2, 0], [-1, 1]]);
  });

  test('相对路径支持中文与空格，四向可以显式复用同一图片', () => {
    const definition = createDefinition();
    const source = '素材目录/雕塑 01.png';
    angles.forEach(angle => { definition.views[angle].source = source; });
    expect(validateElementDefinition(definition, { [source]: { width: 64, height: 96 } })).toEqual([]);
  });

  test.each([undefined, null, [], 'element', 1])('无效根定义 %p 返回根问题', definition => {
    expect(validateElementDefinition(definition, sourceInfo)).toEqual([
      expect.objectContaining({ path: '$', code: 'invalid-definition' }),
    ]);
  });

  test.each([
    ['字符串版本', d => { d.version = '1'; }, 'version', 'unsupported-version'],
    ['未知版本', d => { d.version = 3; }, 'version', 'unsupported-version'],
    ['空 ID', d => { d.id = ' '; }, 'id', 'invalid-id'],
    ['业务类别', d => { d.kind = 'house'; }, 'kind', 'invalid-kind'],
    ['空占地', d => { d.footprint = []; }, 'footprint', 'invalid-footprint'],
    ['非数组占地', d => { d.footprint = null; }, 'footprint', 'invalid-footprint'],
    ['小数格子', d => { d.footprint[0] = [0.5, 1]; }, 'footprint[0]', 'invalid-grid'],
    ['无穷格子', d => { d.footprint[0] = [Infinity, 1]; }, 'footprint[0]', 'invalid-grid'],
    ['重复格子', d => { d.footprint.push([-1, 0]); }, 'footprint[3]', 'duplicate-grid'],
    ['占地空槽', d => { delete d.footprint[0]; }, 'footprint[0]', 'invalid-grid'],
    ['坐标空槽', d => { delete d.footprint[0][0]; }, 'footprint[0]', 'invalid-grid'],
    ['无视图对象', d => { d.views = []; }, 'views', 'invalid-views'],
    ['缺少方向', d => { delete d.views['90']; }, 'views.90', 'invalid-view'],
    ['未知方向', d => { d.views['45'] = d.views['0']; }, 'views.45', 'invalid-view-angle'],
    ['非对象方向', d => { d.views['0'] = null; }, 'views.0', 'invalid-view'],
    ['非数组裁切', d => { d.views['0'].rect = null; }, 'views.0.rect', 'invalid-rect'],
    ['负裁切起点', d => { d.views['0'].rect[0] = -1; }, 'views.0.rect', 'invalid-rect'],
    ['零裁切宽度', d => { d.views['0'].rect[2] = 0; }, 'views.0.rect', 'invalid-rect'],
    ['小数裁切', d => { d.views['0'].rect[0] = 0.5; }, 'views.0.rect', 'invalid-rect'],
    ['裁切超宽', d => { d.views['0'].rect[0] = 1; }, 'views.0.rect', 'rect-out-of-bounds'],
    ['裁切超高', d => { d.views['0'].rect[1] = 1; }, 'views.0.rect', 'rect-out-of-bounds'],
    ['非数值锚点', d => { d.views['0'].anchor = ['0', 0]; }, 'views.0.anchor', 'invalid-anchor'],
    ['无穷锚点', d => { d.views['0'].anchor = [0, Infinity]; }, 'views.0.anchor', 'invalid-anchor'],
    ['NaN 锚点', d => { d.views['0'].anchor = [NaN, 0]; }, 'views.0.anchor', 'invalid-anchor'],
  ])('%s 定位到对应字段', (name, change, path, code) => {
    const definition = createDefinition();
    change(definition);
    expect(validateElementDefinition(definition, sourceInfo)).toContainEqual(
      expect.objectContaining({ path, code, message: expect.any(String) }),
    );
  });

  test.each(['/absolute.png', '../outside.png', 'images/../a.png', './a.png', 'images//a.png', 'C:\\a.png', 'images\\a.png', 'https://example.com/a.png', ''])('拒绝非规范相对路径 %p', source => {
    const definition = createDefinition();
    definition.views['0'].source = source;
    expect(validateElementDefinition(definition, sourceInfo)).toContainEqual(
      expect.objectContaining({ path: 'views.0.source', code: 'invalid-source-path' }),
    );
  });

  test('每个方向必须有显式配置，不能继承原型中的方向', () => {
    const definition = createDefinition();
    definition.views = Object.create(definition.views);
    expect(validateElementDefinition(definition, sourceInfo).filter(issue => issue.code === 'invalid-view')).toHaveLength(4);
  });

  test('源信息缺失、无效尺寸与原型属性不能冒充已加载图片', () => {
    const definition = createDefinition();
    for (const sources of [undefined, null, [], Object.create(sourceInfo)]) {
      expect(validateElementDefinition(definition, sources).filter(issue => issue.code === 'missing-source')).toHaveLength(4);
    }
    for (const size of [null, { width: 0, height: 96 }, { width: 64, height: Infinity }, { width: '64', height: 96 }]) {
      const sources = { ...sourceInfo, 'images/0.png': size };
      expect(validateElementDefinition(definition, sources)).toContainEqual(
        expect.objectContaining({ path: 'views.0.source', code: 'invalid-source-size' }),
      );
    }
  });

  test('同时报告独立字段的问题，且不修改冻结的输入', () => {
    const definition = createDefinition();
    definition.id = '';
    definition.views['90'].rect[2] = 65;
    definition.footprint.forEach(Object.freeze);
    Object.freeze(definition.footprint);
    Object.values(definition.views).forEach(view => {
      Object.freeze(view.rect);
      Object.freeze(view.anchor);
      Object.freeze(view);
    });
    Object.freeze(definition.views);
    Object.freeze(definition);
    const sources = Object.freeze(Object.fromEntries(Object.entries(sourceInfo).map(([path, size]) => [path, Object.freeze({ ...size })])));
    const before = JSON.stringify({ definition, sources });
    expect(validateElementDefinition(definition, sources).map(({ path }) => path)).toEqual(['id', 'views.90.rect']);
    expect(JSON.stringify({ definition, sources })).toBe(before);
  });

  test('可选元素模块不增加核心入口导出', () => {
    expect(Object.keys(core).sort()).toEqual(['pathFinding', 'shapes']);
  });
});

describe('静态元素 JSON 导入', () => {
  test('保留字段、顺序、数值和扩展数据，返回独立解析的定义', () => {
    const definition = createDefinition();
    definition.notes = { calibrated: false, description: '仅契约样本' };
    const result = importElementDefinition(JSON.stringify(definition), sourceInfo);
    expect(result).toEqual({ definition, issues: [] });
    expect(result.definition).not.toBe(definition);
  });

  test.each([undefined, null, 1, {}, '', '{'])('非 JSON 文本 %p 返回解析问题', json => {
    expect(importElementDefinition(json, sourceInfo)).toEqual({
      definition: null, issues: [expect.objectContaining({ path: '$', code: 'invalid-json' })],
    });
  });

  test.each(['null', '[]', '1', '"element"'])('合法 JSON %s 不等于合法元素对象', json => {
    expect(importElementDefinition(json, sourceInfo)).toEqual({
      definition: null, issues: [expect.objectContaining({ path: '$', code: 'invalid-definition' })],
    });
  });

  test('校验失败返回相同问题，不返回或补齐部分定义', () => {
    const definition = createDefinition();
    delete definition.views['270'];
    const issues = validateElementDefinition(definition, sourceInfo);
    expect(importElementDefinition(JSON.stringify(definition), sourceInfo)).toEqual({ definition: null, issues });
    expect(definition.views['270']).toBeUndefined();
  });
});
