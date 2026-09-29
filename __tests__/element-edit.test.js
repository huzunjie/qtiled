import { applyElementEdit, exportElementDefinition, importElementDefinition, validateElementDefinition } from '../src/elements';
import { resolveElementDraw } from '../src/element-preview/draw';
import { projectGrid } from '../src/isometric-view';
import * as core from '../src';

const angles = [0, 90, 180, 270];
const sourceInfo = Object.fromEntries(angles.map(angle => [`${angle}.png`, { width: 160, height: 120 }]));
const sample = () => ({
  version: 1, id: 'edited-sprite', kind: 'sprite', footprint: [[0, 0], [1, 0], [0, 1], [1, 1]],
  views: Object.fromEntries(angles.map(angle => [angle, { source: `${angle}.png`, rect: [0, 0, 160, 120], anchor: [40, 80] }])),
});
const freeze = value => {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
};

describe('元素编辑与正式导出', () => {
  test('连续编辑冻结输入，仅修改指定方向，复制传入数组', () => {
    const original = freeze(sample());
    const rect = [20, 10, 120, 100];
    const footprint = [[-2, 0], [-1, 0], [-1, 1]];
    let edited = applyElementEdit(original, { field: 'rect', angle: 90, value: rect });
    edited = applyElementEdit(edited, { field: 'footprint', value: footprint });
    rect[0] = 999;
    footprint[0][0] = 999;
    expect(edited.views[90].rect).toEqual([20, 10, 120, 100]);
    expect(edited.views[90].anchor).toEqual([40, 80]);
    expect(edited.views[0]).toEqual(original.views[0]);
    expect(edited.footprint).toEqual([[-2, 0], [-1, 0], [-1, 1]]);
    expect(original).toEqual(sample());
  });

  test('显式换图不会给其他方向补图或修改裁切', () => {
    const original = sample();
    const edited = applyElementEdit(original, { field: 'source', angle: 180, value: '90.png' });
    expect(edited.views[180]).toEqual({ ...original.views[180], source: '90.png' });
    expect(edited.views[270]).toEqual(original.views[270]);
    expect(original.views[180].source).toBe('180.png');
  });

  test.each([
    [{ field: 'rect', angle: 0, value: [0, 0, 999, 100] }, 'views.0.rect'],
    [{ field: 'anchor', angle: 90, value: [NaN, 0] }, 'views.90.anchor'],
    [{ field: 'footprint', value: [] }, 'footprint'],
    [{ field: 'footprint', value: null }, 'footprint'],
    [{ field: 'source', angle: 270, value: 'missing.png' }, 'views.270.source'],
  ])('保留非法草稿但禁止导出 %p', (edit, path) => {
    const edited = applyElementEdit(sample(), edit);
    const result = exportElementDefinition(edited, sourceInfo);
    expect(result.json).toBeNull();
    expect(result.issues).toEqual(validateElementDefinition(edited, sourceInfo));
    expect(result.issues).toContainEqual(expect.objectContaining({ path }));
  });

  test('缺向与无源信息时不能正式导出', () => {
    const definition = sample();
    delete definition.views[90];
    expect(exportElementDefinition(definition, sourceInfo).issues).toContainEqual(expect.objectContaining({ path: 'views.90' }));
    expect(exportElementDefinition(sample()).json).toBeNull();
    expect(exportElementDefinition().issues).toContainEqual(expect.objectContaining({ path: '$' }));
  });

  test.each([undefined, { field: 'id', value: 'x' }, { field: 'rect', angle: 1, value: [] }])('拒绝错误编辑操作 %p', edit => {
    expect(() => applyElementEdit(sample(), edit)).toThrow();
  });

  test('导出后只读 JSON 与图片信息，四向绘制结果完全一致', () => {
    let edited = applyElementEdit(sample(), { field: 'anchor', angle: 270, value: [-0.5, 150.25] });
    edited = applyElementEdit(edited, { field: 'footprint', value: [[-1, 0], [0, 0], [1, 0], [1, 1]] });
    edited.note = { author: '保留额外字段' };
    freeze(edited);
    const exported = exportElementDefinition(edited, sourceInfo);
    expect(exported.issues).toEqual([]);
    expect(exported.json.endsWith('\n')).toBe(true);
    const imported = importElementDefinition(exported.json, sourceInfo);
    expect(imported.definition).toEqual(edited);
    expect(imported.definition).not.toBe(edited);
    angles.forEach(angle => {
      const view = { angle, tileSize: [80, 40], originPixel: [320, 260] };
      expect(resolveElementDraw(imported.definition, [0, 0], view)).toEqual(resolveElementDraw(edited, [0, 0], view));
    });
    expect(Object.keys(core).sort()).toEqual(['pathFinding', 'shapes']);
  });

  test('用编辑契约重选原点，四向图片与占地相对位置保持一致', () => {
    const original = freeze(sample());
    const grid = [1, 1];
    const tileSize = [80, 40];
    let edited = applyElementEdit(original, { field: 'footprint', value: original.footprint.map(([x, y]) => [x - 1, y - 1]) });
    angles.forEach(angle => {
      const delta = projectGrid(grid, { angle, tileSize });
      edited = applyElementEdit(edited, { field: 'anchor', angle, value: original.views[angle].anchor.map((value, i) => value + delta[i]) });
    });
    angles.forEach(angle => {
      const view = { angle, tileSize };
      // 新定义放到所选原点位置后，原占地与图片像素位置均应复原。
      const before = resolveElementDraw(original, [0, 0], view);
      const after = resolveElementDraw(edited, grid, view);
      expect(after.position).toEqual(before.position);
      expect(after.footprint).toEqual(before.footprint);
    });
    expect(exportElementDefinition(edited, sourceInfo).issues).toEqual([]);
  });
});
