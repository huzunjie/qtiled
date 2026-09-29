import * as core from '../src';
import { importElementDefinition } from '../src/elements';
import { resolveElementDraw } from '../src/element-preview/draw';
import { loadElementSources } from '../src/element-preview/sources';
import { renderElementPreview } from '../src/element-preview/spritejs';
import { Group, Sprite } from 'spritejs';

jest.mock('spritejs', () => {
  class Node {
    constructor(attributes = {}) { this.attributes = attributes; this.children = []; }
    append(child) { this.children.push(child); child.parent = this; }
    remove() { this.parent.children = this.parent.children.filter(child => child !== this); }
  }
  return { Group: class extends Node {}, Sprite: class extends Node {}, Polyline: class extends Node {} };
}, { virtual: true });

const sample = () => ({
  version: 1, id: 'sample', kind: 'sprite', footprint: [[0, 0], [1, 0], [0, 1], [1, 1]],
  views: Object.fromEntries([0, 90, 180, 270].map(angle => [angle, {
    source: `${angle}.png`, rect: [10, 20, 100, 80], anchor: [30, 60],
  }])),
});

describe('元素绘制描述', () => {
  test.each([
    [0, [400, 275]], [90, [460, 335]], [180, [340, 365]], [270, [280, 305]],
  ])('%i 度选图并按裁切区域内锚点定位', (angle, position) => {
    const result = resolveElementDraw(sample(), [2, -1], { angle, tileSize: [60, 30], originPixel: [400, 380] });
    expect(result.source).toBe(`${angle}.png`);
    expect(result.position).toEqual(position);
    expect(result.rect).toEqual([10, 20, 100, 80]);
    expect(result.footprint.map(cell => cell.grid)).toEqual([[2, -1], [3, -1], [2, 0], [3, 0]]);
  });

  test('默认值、区域外的小数锚点，不用图片尺寸推断占地', () => {
    const definition = sample();
    definition.footprint = [[-2, 0]];
    definition.views[0].anchor = [-0.5, 200.25];
    const draw = resolveElementDraw(definition);
    expect(draw.position).toEqual([0.5, -200.25]);
    expect(draw.footprint).toEqual([{ grid: [-2, 0], position: [-8, 4] }]);
  });

  test('裁切与锚点一起平移，原图同一点的落位保持不变', () => {
    const definition = sample();
    const full = resolveElementDraw(definition);
    definition.views[0].rect = [30, 30, 60, 60];
    definition.views[0].anchor = [10, 50];
    const cropped = resolveElementDraw(definition);
    const sourcePixel = [50, 50];
    const screen = draw => sourcePixel.map((value, index) => draw.position[index] + value - draw.rect[index]);
    expect(screen(cropped)).toEqual(screen(full));
  });

  test('结果不修改或共享输入数组，四向占地保持一致', () => {
    const definition = sample();
    const before = JSON.stringify(definition);
    Object.values(definition.views).forEach(view => { Object.freeze(view.rect); Object.freeze(view.anchor); Object.freeze(view); });
    definition.footprint.forEach(Object.freeze);
    Object.freeze(definition.footprint);
    const grid = Object.freeze([-2, 1]);
    const tileSize = Object.freeze([80, 40]);
    for (const angle of [0, 90, 180, 270]) {
      const result = resolveElementDraw(definition, grid, Object.freeze({ angle, tileSize }));
      result.rect[0] = 999;
      result.anchor[0] = 999;
      result.tileSize[0] = 999;
      result.footprint[0].grid[0] = 999;
      expect(JSON.stringify(definition)).toBe(before);
      expect(grid).toEqual([-2, 1]);
      expect(tileSize).toEqual([80, 40]);
    }
  });

  test('缺向不回退、非法视角不猜测；核心入口仍隔离', () => {
    const definition = sample();
    delete definition.views[90];
    expect(() => resolveElementDraw(definition, [0, 0], { angle: 90 })).toThrow('views.90');
    expect(() => resolveElementDraw(sample(), [0, 0], { angle: 1 })).toThrow(RangeError);
    expect(Object.keys(core).sort()).toEqual(['pathFinding', 'shapes']);
  });
});

describe('图片加载及契约衔接', () => {
  const originalImage = global.Image;
  const originalBlob = global.Blob;
  const originalCreate = URL.createObjectURL;
  const originalRevoke = URL.revokeObjectURL;

  beforeEach(() => {
    global.Blob = class {};
    global.Image = class {
      set src(url) {
        this.url = url;
        Promise.resolve().then(() => {
          if (url.includes('bad')) return this.onerror();
          this.naturalWidth = url.includes('empty') ? 0 : 120;
          this.naturalHeight = 100;
          this.onload();
        });
      }
    };
    URL.createObjectURL = jest.fn(() => 'blob:loaded');
    URL.revokeObjectURL = jest.fn();
  });
  afterEach(() => {
    if (originalImage === undefined) delete global.Image; else global.Image = originalImage;
    if (originalBlob === undefined) delete global.Blob; else global.Blob = originalBlob;
    if (originalCreate === undefined) delete URL.createObjectURL; else URL.createObjectURL = originalCreate;
    if (originalRevoke === undefined) delete URL.revokeObjectURL; else URL.revokeObjectURL = originalRevoke;
  });

  test('空集合不加载，成功项使用实际尺寸', async () => {
    expect(await loadElementSources()).toEqual({ sources: {}, sourceInfo: {}, issues: [] });
    const result = await loadElementSources({ 'a.png': '/assets/a.png', 'local.png': new Blob() });
    expect(result.issues).toEqual([]);
    expect(result.sourceInfo).toEqual({ 'a.png': { width: 120, height: 100 }, 'local.png': { width: 120, height: 100 } });
    expect(result.sources['a.png']).toBeInstanceOf(Image);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:loaded');
  });

  test('失败项按输入顺序报告，保留成功项且不保留坏图片', async () => {
    const result = await loadElementSources({ 'bad.png': 'bad-url', 'a.png': 'loaded', 'invalid.png': 0, 'empty.png': 'empty' });
    expect(result.issues.map(issue => issue.path)).toEqual(['bad.png', 'invalid.png', 'empty.png']);
    expect(result.issues.every(issue => issue.code === 'source-load-failed')).toBe(true);
    expect(Object.keys(result.sources)).toEqual(['a.png']);
  });

  test('Blob 解码失败也释放临时地址', async () => {
    URL.createObjectURL.mockReturnValue('blob:bad');
    expect((await loadElementSources({ 'bad.png': new Blob() })).issues).toHaveLength(1);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:bad');
  });

  test('加载信息进入同一导入校验；越界裁切与缺向禁止继续', async () => {
    const definition = sample();
    const files = Object.fromEntries(Object.values(definition.views).map(view => [view.source, 'loaded']));
    const { sourceInfo } = await loadElementSources(files);
    expect(importElementDefinition(JSON.stringify(definition), sourceInfo).issues).toEqual([]);
    definition.views[0].rect[2] = 111;
    delete definition.views[90];
    const result = importElementDefinition(JSON.stringify(definition), sourceInfo);
    expect(result.definition).toBeNull();
    expect(result.issues.map(issue => issue.code)).toEqual(['rect-out-of-bounds', 'invalid-view']);
  });
});

describe('SpriteJS 预览适配（节点替身）', () => {
  const sources = Object.fromEntries([0, 90, 180, 270].map(angle => [`${angle}.png`, { image: angle }]));

  test('切向仅保留一个预览组和一张素材，保留其他场景节点', () => {
    const layer = new Group();
    const other = new Group();
    layer.append(other);
    for (const angle of [0, 90, 180, 270, 0]) {
      const draw = resolveElementDraw(sample(), [0, 0], { angle });
      const group = renderElementPreview(layer, draw, sources, { gridPositions: [[0, 0]], bounds: true });
      expect(layer.children).toEqual([other, group]);
      const sprites = group.children.filter(child => child instanceof Sprite);
      expect(sprites).toHaveLength(1);
      expect(sprites[0].attributes).toMatchObject({ texture: sources[`${angle}.png`], sourceRect: draw.rect, size: [100, 80], pos: [-30, -60], anchor: [0, 0] });
      expect(group.children).toHaveLength(9);
    }
    expect(renderElementPreview(layer, null)).toBeNull();
    expect(layer.children).toEqual([other]);
  });

  test('关闭覆盖层只绘制图片，失败时移除旧预览', () => {
    const layer = new Group();
    const draw = resolveElementDraw(sample());
    const group = renderElementPreview(layer, draw, sources, { footprint: false, anchor: false });
    expect(group.children).toHaveLength(1);
    expect(() => renderElementPreview(layer, draw, {})).toThrow('未加载图片：0.png');
    expect(layer.children).toEqual([]);
    expect(() => renderElementPreview(layer, draw, Object.create(sources))).toThrow('未加载图片');
  });
});
