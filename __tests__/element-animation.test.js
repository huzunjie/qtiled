import { applyElementEdit, exportElementDefinition, importElementDefinition, validateElementDefinition } from '../src/elements';
import { resolveElementFrame } from '../src/element-rendering/frame';
import { resolveElementDraw } from '../src/element-rendering/draw';

const angles = [0, 90, 180, 270];
const sourceInfo = { 'water.png': { width: 240, height: 40 }, 'other.png': { width: 80, height: 40 } };
const sample = () => ({
  version: 2, id: 'water', kind: 'tile', footprint: [[0, 0], [1, 0], [0, 1]],
  sequences: { ripple: { frames: [0, 80, 160].map(x => ({ source: 'water.png', rect: [x, 0, 80, 40] })), frameDurationMs: 100, timingSource: 'author' } },
  views: Object.fromEntries(angles.map((angle, index) => [angle, { sequence: 'ripple', anchor: [39 + index, 20 + index] }])),
});
const freeze = value => {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
};

describe('共享动画定义与回读', () => {
  test('一份有序序列供四向使用，静态与序列方向可混合，读写不丢扩展字段', () => {
    const definition = sample();
    definition.views[90] = { source: 'other.png', rect: [0, 0, 80, 40], anchor: [-3, 42] };
    definition.note = { source: '作者设置，非原作帧率' };
    freeze(definition);
    const output = exportElementDefinition(definition, sourceInfo);
    expect(output.issues).toEqual([]);
    const imported = importElementDefinition(output.json, sourceInfo);
    expect(imported.definition).toEqual(definition);
    expect(Object.keys(imported.definition.sequences)).toEqual(['ripple']);
    expect(imported.definition.views[0]).toEqual({ sequence: 'ripple', anchor: [39, 20] });
    expect(resolveElementFrame(imported.definition, 90, { elapsedMs: 150 })).toEqual({
      source: 'other.png', rect: [0, 0, 80, 40], anchor: [-3, 42], sequence: null, frameIndex: 0,
    });
  });

  test.each([
    ['空序列', d => { d.sequences.ripple.frames = []; }, 'sequences.ripple.frames', 'invalid-frames'],
    ['缺帧', d => { delete d.sequences.ripple.frames[1]; }, 'sequences.ripple.frames[1]', 'invalid-frame'],
    ['缺图片', d => { d.sequences.ripple.frames[1].source = 'missing.png'; }, 'sequences.ripple.frames[1].source', 'missing-source'],
    ['裁切越界', d => { d.sequences.ripple.frames[2].rect[2] = 81; }, 'sequences.ripple.frames[2].rect', 'rect-out-of-bounds'],
    ['混合绑定', d => { d.views[0].source = 'water.png'; }, 'views.0', 'mixed-view-binding'],
    ['空绑定', d => { d.views[0].sequence = ''; }, 'views.0.sequence', 'invalid-sequence-reference'],
    ['序列丢失', d => { delete d.sequences; }, 'views.0.sequence', 'missing-sequence'],
    ['原型序列', d => { d.sequences = Object.create(d.sequences); }, 'views.0.sequence', 'missing-sequence'],
    ['旧版本不能解读序列方向', d => { d.version = 1; }, 'views.0.source', 'invalid-source-path'],
    ['时长来源缺失', d => { delete d.sequences.ripple.timingSource; }, 'sequences.ripple.timingSource', 'invalid-timing-source'],
    ['不假装原作帧率', d => { d.sequences.ripple.timingSource = 'original'; }, 'sequences.ripple.timingSource', 'invalid-timing-source'],
    ['非法序列对象', d => { d.sequences.ripple = null; }, 'sequences.ripple', 'invalid-sequence'],
    ['非法索引', d => { d.sequences = []; }, 'sequences', 'invalid-sequences'],
    ['空序列名', d => { d.sequences[' '] = d.sequences.ripple; }, 'sequences. ', 'invalid-sequence-id'],
    ['锚点非法', d => { d.views[90].anchor = [NaN, 0]; }, 'views.90.anchor', 'invalid-anchor'],
  ])('%s 拒绝导出，问题定位到帧或方向', (name, change, path, code) => {
    const definition = sample();
    change(definition);
    const result = exportElementDefinition(definition, sourceInfo);
    expect(result.json).toBeNull();
    expect(result.issues).toContainEqual(expect.objectContaining({ path, code }));
  });

  test.each([0, -1, 0.5, Infinity, NaN, '100', Number.MAX_SAFE_INTEGER + 1])('拒绝非法帧时长 %p', frameDurationMs => {
    const definition = sample();
    definition.sequences.ripple.frameDurationMs = frameDurationMs;
    expect(validateElementDefinition(definition, sourceInfo)).toContainEqual(
      expect.objectContaining({ path: 'sequences.ripple.frameDurationMs', code: 'invalid-frame-duration' }),
    );
  });

  test('序列编辑不修改输入，方向锚点独立；切回静态仅改变指定方向', () => {
    const original = freeze(sample());
    const sequences = sample().sequences;
    sequences.ripple.frames[1].source = 'other.png';
    sequences.ripple.frames[1].rect = [0, 0, 80, 40];
    let edited = applyElementEdit(original, { field: 'sequences', value: sequences });
    sequences.ripple.frames[1].rect[0] = 999;
    expect(edited.sequences.ripple.frames[1].rect).toEqual([0, 0, 80, 40]);
    expect(edited.views).toBe(original.views);
    edited = applyElementEdit(edited, { field: 'anchor', angle: 90, value: [10, 11] });
    expect(edited.views[0].anchor).toEqual([39, 20]);
    edited = applyElementEdit(edited, { field: 'source', angle: 90, value: 'other.png' });
    edited = applyElementEdit(edited, { field: 'rect', angle: 90, value: [0, 0, 80, 40] });
    expect(edited.views[90]).toEqual({ source: 'other.png', rect: [0, 0, 80, 40], anchor: [10, 11] });
    expect(edited.views[0].sequence).toBe('ripple');
    expect(validateElementDefinition(edited, sourceInfo)).toEqual([]);
    edited = applyElementEdit(edited, { field: 'sequence', angle: 90, value: 'ripple' });
    expect(edited.views[90]).toEqual({ sequence: 'ripple', anchor: [10, 11] });
    expect(original).toEqual(sample());
  });

  test('v1 通过显式序列编辑升为 v2，静态额外字段仍保留', () => {
    const original = { ...sample(), version: 1, sequences: undefined,
      views: Object.fromEntries(angles.map(angle => [angle, { source: 'other.png', rect: [0, 0, 80, 40], anchor: [39, 20] }])) };
    let edited = applyElementEdit(original, { field: 'sequences', value: sample().sequences });
    edited = applyElementEdit(edited, { field: 'sequence', angle: 0, value: 'ripple' });
    expect(edited.version).toBe(2);
    expect(validateElementDefinition(edited, sourceInfo)).toEqual([]);
    expect(original.version).toBe(1);
    const invalidDraft = applyElementEdit(edited, { field: 'sequences', value: null });
    expect(exportElementDefinition(invalidDraft, sourceInfo).json).toBeNull();
  });

  test('v1 中同名额外字段仍是扩展数据，既不播放也不在静态编辑时丢失', () => {
    const definition = { ...sample(), version: 1, sequences: { legacy: '原有扩展值' },
      views: Object.fromEntries(angles.map(angle => [angle, { source: 'other.png', rect: [0, 0, 80, 40], anchor: [39, 20], sequence: 'legacy-note' }])) };
    const edited = applyElementEdit(definition, { field: 'source', angle: 0, value: 'water.png' });
    expect(edited.views[0].sequence).toBe('legacy-note');
    expect(validateElementDefinition(edited, sourceInfo)).toEqual([]);
    expect(resolveElementFrame(edited, 0, { elapsedMs: 100 })).toMatchObject({ source: 'water.png', sequence: null, frameIndex: 0 });
  });
});

describe('外部时钟解析当前帧', () => {
  test.each([[0, 0], [99.99, 0], [100, 1], [299.99, 2], [300, 0], [400, 1]])('时间 %p ms 得到帧 %i', (elapsedMs, frameIndex) => {
    const definition = freeze(sample());
    const frame = resolveElementFrame(definition, 0, { elapsedMs });
    expect(frame).toEqual({ source: 'water.png', rect: [frameIndex * 80, 0, 80, 40], anchor: [39, 20], sequence: 'ripple', frameIndex });
    frame.rect[0] = 999;
    frame.anchor[0] = 999;
    expect(definition).toEqual(sample());
  });

  test('默认首帧，相位按帧取余；暂停/切镜头复用时间，不写回定义', () => {
    const definition = freeze(sample());
    expect(resolveElementFrame(definition).frameIndex).toBe(0);
    expect(resolveElementFrame(definition, 0, { elapsedMs: 100, phase: 2 }).frameIndex).toBe(0);
    expect(resolveElementFrame(definition, 0, { phase: Number.MAX_SAFE_INTEGER }).frameIndex).toBe(1);
    expect(resolveElementFrame(definition, 0, { elapsedMs: Number.MAX_VALUE }).frameIndex).toBeGreaterThanOrEqual(0);
    for (const imageAngle of angles) {
      const frame = resolveElementFrame(definition, imageAngle, { elapsedMs: 170, phase: 1 });
      expect(frame.frameIndex).toBe(2);
      expect(resolveElementFrame(definition, imageAngle, { elapsedMs: 170, phase: 1 })).toEqual(frame);
    }
  });

  test.each([[-1, 0], [Infinity, 0], [NaN, 0], ['100', 0], [0, -1], [0, 0.5], [0, Infinity], [0, Number.MAX_SAFE_INTEGER + 1]])('拒绝时间/相位 %p/%p', (elapsedMs, phase) => {
    expect(() => resolveElementFrame(sample(), 0, { elapsedMs, phase })).toThrow(RangeError);
  });

  test('拒绝非法素材方向及缺向，不自动回退', () => {
    expect(() => resolveElementFrame(sample(), 45)).toThrow(RangeError);
    const definition = sample();
    delete definition.views[90];
    expect(() => resolveElementFrame(definition, 90)).toThrow('views.90');
  });

  test('四镜头×四对象朝向独立于帧选择，共用序列保留方向锚点和世界占地', () => {
    const definition = freeze(sample());
    for (const objectAngle of angles) {
      const worldCells = resolveElementDraw(definition, [3, 2], {}, objectAngle).footprint.map(cell => cell.grid);
      for (const angle of angles) {
        const view = { angle, tileSize: [80, 40], originPixel: [320, 200] };
        const first = resolveElementDraw(definition, [3, 2], view, objectAngle);
        const next = resolveElementDraw(definition, [3, 2], view, objectAngle, { elapsedMs: 130, phase: 1 });
        const imageAngle = (angle + objectAngle) % 360;
        expect(next).toEqual({ ...first, rect: [160, 0, 80, 40], frameIndex: 2 });
        expect(next.imageAngle).toBe(imageAngle);
        expect(next.anchor).toEqual(definition.views[imageAngle].anchor);
        expect(next.footprint.map(cell => cell.grid)).toEqual(worldCells);
        expect(next.position.map((value, index) => value + next.anchor[index])).toEqual(next.origin);
      }
    }
  });
});
