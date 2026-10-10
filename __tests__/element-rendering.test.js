import * as core from '../src';
import { importElementDefinition } from '../src/elements';
import { resolveElementDraw } from '../src/element-rendering/draw';
import { resolveElementPlacement } from '../src/element-rendering/placement';
import { loadElementSources } from '../src/element-rendering/sources';
import { renderElement, updateElementFrame } from '../src/element-rendering/spritejs-element-renderer';
import { Group, Sprite } from 'spritejs';

jest.mock('spritejs', () => {
  class Node {
    constructor(attributes = {}) { this.attributes = attributes; this.children = []; }
    append(child) { this.children.push(child); child.parent = this; }
    attr(attributes) { Object.assign(this.attributes, attributes); }
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

describe('矩形上角格放置', () => {
  test.each([2, 3])('%i×2 在四镜头与四对象方向下保持上角，切镜头不搬动世界占地', width => {
    const definition = sample();
    // 原点可以在占地外，负偏移与原有小数锚点均不能被重新居中。
    definition.footprint = Array.from({ length: width * 2 }, (_, i) => [i % width - 4, Math.floor(i / width) + 2]);
    definition.views[90].anchor = [-0.5, 200.25];
    const before = JSON.stringify(definition);
    const base = [7, -3];
    for (const angle of [0, 90, 180, 270]) {
      let firstCells;
      for (const objectAngle of [0, 90, 180, 270, 0]) {
        const pose = resolveElementPlacement(definition, base, objectAngle, angle);
        const view = { angle, tileSize: [80, 40], originPixel: [320, 260] };
        const draw = resolveElementDraw(definition, pose.grid, view, pose.objectAngle);
        expect(draw.placementGrid).toEqual(base);
        const top = draw.footprint.reduce((a, b) => a.position[1] < b.position[1] ? a : b);
        expect(top.grid).toEqual(base);
        const cells = draw.footprint.map(cell => cell.grid);
        const bounds = core.shapes.polygon.getBounds(cells);
        expect([bounds.width + 1, bounds.height + 1]).toEqual(objectAngle % 180 === 0 ? [width, 2] : [2, width]);
        const sorted = cells.map(cell => cell.join(',')).sort();
        if (!firstCells) firstCells = sorted;
        if (width === 2 || objectAngle === 0) expect(sorted).toEqual(firstCells);
        for (const cameraAngle of [0, 90, 180, 270]) {
          const other = resolveElementDraw(definition, pose.grid, { ...view, angle: cameraAngle }, pose.objectAngle);
          expect(other.footprint.map(cell => cell.grid)).toEqual(cells);
          expect(other.anchor).toEqual(definition.views[other.imageAngle].anchor);
          expect(other.position.map((value, i) => value + other.anchor[i])).toEqual(other.origin);
        }
      }
    }
    expect(JSON.stringify(definition)).toBe(before);
    expect(base).toEqual([7, -3]);
  });

  test('默认上角落在零格；拒绝非法定位、角度和未定义转向规则的占地', () => {
    expect(resolveElementPlacement(sample())).toEqual({ grid: [-1, 0], objectAngle: 0 });
    for (const grid of [null, [1], [0.5, 0], [Infinity, 0], ['0', 0]]) {
      expect(() => resolveElementPlacement(sample(), grid)).toThrow(TypeError);
    }
    for (const angle of [-90, 360, 45, '90', NaN]) {
      expect(() => resolveElementPlacement(sample(), [0, 0], angle)).toThrow('objectAngle');
      expect(() => resolveElementPlacement(sample(), [0, 0], 0, angle)).toThrow('viewAngle');
    }
    for (const footprint of [[], [[0, 0], [1, 0], [0, 1]], [[0, 0], [0, 0]], [[0.5, 0]], null]) {
      const definition = { ...sample(), footprint };
      expect(() => resolveElementPlacement(definition)).toThrow('仅完整矩形');
    }
    const irregular = { ...sample(), footprint: [[0, 0], [1, 0], [0, 1]] };
    expect(resolveElementDraw(irregular)).toMatchObject({ placementGrid: null, placementOrigin: null });
  });
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
    expect(draw).toMatchObject({ angle: 0, objectAngle: 0, imageAngle: 0 });
    expect(resolveElementDraw(definition, undefined, undefined, 0)).toEqual(draw);
  });

  const angles = [0, 90, 180, 270];
  const origins = [[430, 335], [490, 395], [370, 425], [310, 365]];
  const imageAngles = [[0, 90, 180, 270], [90, 180, 270, 0], [180, 270, 0, 90], [270, 0, 90, 180]];
  const worldFootprints = [
    [[2, -1], [3, -1], [4, -1], [2, 0], [3, 0], [4, 0]],
    [[2, -1], [2, 0], [2, 1], [1, -1], [1, 0], [1, 1]],
    [[2, -1], [1, -1], [0, -1], [2, -2], [1, -2], [0, -2]],
    [[2, -1], [2, -2], [2, -3], [3, -1], [3, -2], [3, -3]],
  ];
  // 3×2 远角 [2,1] 相对原点的四向像素位移，独立于元素的世界位置。
  const cornerPositions = [[90, -15], [30, 45], [-90, 15], [-30, -45]];
  test.each(angles.flatMap((angle, cameraIndex) => angles.map((objectAngle, objectIndex) => [
    angle, objectAngle, cameraIndex, objectIndex,
  ])))('镜头 %i 度、对象 %i 度：3×2 占地与图片对齐固定原点', (angle, objectAngle, cameraIndex, objectIndex) => {
    const definition = sample();
    definition.footprint = [[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1]];
    const anchors = [[30, 60], [-0.5, 200.25], [70, 20], [9, 10]];
    angles.forEach((value, index) => {
      definition.views[value].anchor = anchors[index];
      definition.views[value].rect = [10 + index, 20, 100, 80];
    });
    const draw = resolveElementDraw(definition, [2, -1], { angle, tileSize: [60, 30], originPixel: [400, 380] }, objectAngle);
    const imageAngle = imageAngles[cameraIndex][objectIndex];
    const slot = angles.indexOf(imageAngle);
    expect(draw).toMatchObject({ angle, objectAngle, imageAngle, source: `${imageAngle}.png` });
    expect(draw.origin).toEqual(origins[cameraIndex]);
    expect(draw.footprint.map(cell => cell.grid)).toEqual(worldFootprints[objectIndex]);
    expect(draw.footprint[0].position).toEqual(draw.origin);
    expect(draw.footprint[5].position).toEqual(origins[cameraIndex].map((value, index) => value + cornerPositions[slot][index]));
    expect(draw.anchor).toEqual(anchors[slot]);
    expect(draw.rect).toEqual([10 + slot, 20, 100, 80]);
    expect(draw.position.map((value, index) => value + draw.anchor[index])).toEqual(draw.origin);
  });

  test('原点在占地外的不规则形状保留负偏移，连续切向四次复原', () => {
    const definition = sample();
    definition.footprint = [[-2, 0], [-2, 1], [1, 1]];
    const before = JSON.stringify(definition);
    const first = resolveElementDraw(definition, [7, 4]);
    const expected = [
      [[7, 2], [6, 2], [6, 5]], [[9, 4], [9, 3], [6, 3]],
      [[7, 6], [8, 6], [8, 3]], [[5, 4], [5, 5], [8, 5]],
    ];
    [90, 180, 270, 0].forEach((objectAngle, index) => {
      const draw = resolveElementDraw(definition, [7, 4], {}, objectAngle);
      expect(draw.footprint.map(cell => cell.grid)).toEqual(expected[index]);
      expect(draw.origin).toEqual(first.origin);
      if (objectAngle === 0) expect(draw).toEqual(first);
    });
    expect(JSON.stringify(definition)).toBe(before);
  });

  test.each([0, 90, 180, 270])('对象 %i 度时裁切与锚点一起平移，原图同一点的落位保持不变', objectAngle => {
    const definition = sample();
    const view = { angle: 90, tileSize: [60, 30], originPixel: [400, 380] };
    const full = resolveElementDraw(definition, [2, -1], view, objectAngle);
    definition.views[full.imageAngle].rect = [30, 30, 60, 60];
    definition.views[full.imageAngle].anchor = [10, 50];
    const cropped = resolveElementDraw(definition, [2, -1], view, objectAngle);
    const sourcePixel = [50, 50];
    const screen = draw => sourcePixel.map((value, index) => draw.position[index] + value - draw.rect[index]);
    expect(screen(cropped)).toEqual(screen(full));
  });

  test.each([0, 90, 180, 270])('对象 %i 度时结果不修改或共享输入数组，镜头切向不改变世界占地', objectAngle => {
    const definition = sample();
    const before = JSON.stringify(definition);
    Object.values(definition.views).forEach(view => { Object.freeze(view.rect); Object.freeze(view.anchor); Object.freeze(view); });
    definition.footprint.forEach(Object.freeze);
    Object.freeze(definition.footprint);
    const grid = Object.freeze([-2, 1]);
    const tileSize = Object.freeze([80, 40]);
    const worldCells = resolveElementDraw(definition, grid, {}, objectAngle).footprint.map(cell => cell.grid);
    for (const angle of [0, 90, 180, 270]) {
      const result = resolveElementDraw(definition, grid, Object.freeze({ angle, tileSize }), objectAngle);
      expect(result.footprint.map(cell => cell.grid)).toEqual(worldCells);
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

  test.each([-90, 360, 45, 90.5, '90', null, NaN, Infinity])('非法对象角度 %s 不自动取整或回退', objectAngle => {
    expect(() => resolveElementDraw(sample(), [0, 0], {}, objectAngle)).toThrow('objectAngle');
    expect(() => resolveElementDraw(sample(), [0, 0], {}, objectAngle)).toThrow(RangeError);
  });

  test('按组合后的实际素材槽报告缺向，继承属性不能冒充配置', () => {
    const definition = sample();
    delete definition.views[180];
    expect(() => resolveElementDraw(definition, [0, 0], { angle: 90 }, 90)).toThrow('views.180');
    definition.views = Object.create(sample().views);
    expect(() => resolveElementDraw(definition, [0, 0], { angle: 270 }, 180)).toThrow('views.90');
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
      const group = renderElement(layer, draw, sources, { gridPositions: [[0, 0]], bounds: true });
      expect(layer.children).toEqual([other, group]);
      const sprites = group.children.filter(child => child instanceof Sprite);
      expect(sprites).toHaveLength(1);
      expect(sprites[0].attributes).toMatchObject({ texture: sources[`${angle}.png`], sourceRect: draw.rect, size: [100, 80], pos: [-30, -60], anchor: [0, 0] });
      expect(group.children).toHaveLength(8);
      expect(group.children.some(node => node.attributes.strokeColor === '#cf3535')).toBe(false);
      expect(group.children.find(node => node.attributes.strokeColor === '#1976b5').attributes.pos).toEqual(draw.placementOrigin);
    }
    expect(renderElement(layer, null)).toBeNull();
    expect(layer.children).toEqual([other]);
  });

  test('关闭覆盖层只绘制图片，失败时移除旧预览', () => {
    const layer = new Group();
    const draw = resolveElementDraw(sample());
    const group = renderElement(layer, draw, sources, { footprint: false, placement: false });
    expect(group.children).toHaveLength(1);
    expect(() => renderElement(layer, draw, {})).toThrow('未加载图片：0.png');
    expect(layer.children).toEqual([]);
    expect(() => renderElement(layer, draw, Object.create(sources))).toThrow('未加载图片');
  });

  test('两个实例使用独立容器，切向或清除一项不替换另一项', () => {
    const layer = new Group();
    const holders = [new Group(), new Group()];
    holders.forEach(holder => layer.append(holder));
    const other = renderElement(holders[1], resolveElementDraw(sample(), [3, 1]), sources);
    for (const angle of [0, 90, 180, 270]) {
      const first = renderElement(holders[0], resolveElementDraw(sample(), [1, 1], { angle }), sources);
      expect(holders[0].children).toEqual([first]);
      expect(holders[1].children).toEqual([other]);
      expect(layer.children).toEqual(holders);
    }
    renderElement(holders[0], null);
    expect(holders[0].children).toEqual([]);
    expect(holders[1].children).toEqual([other]);
  });

  test('更新当前帧复用节点、保留占地，仅变更图片和尺寸相关覆盖层', () => {
    const layer = new Group();
    const draw = resolveElementDraw(sample(), [2, 1]);
    const group = renderElement(layer, draw, sources, { bounds: true });
    const children = [...group.children];
    const next = { source: '90.png', rect: [5, 6, 80, 40], anchor: [31, 61] };
    expect(updateElementFrame(layer, next, sources)).toBe(group);
    expect(layer.children).toEqual([group]);
    expect(group.children).toEqual(children);
    expect(children[0].attributes).toMatchObject({
      texture: sources['90.png'], sourceRect: next.rect, size: [80, 40], pos: [draw.origin[0] - 31, draw.origin[1] - 61],
    });
    const bounds = children.find(child => child.attributes.strokeColor === '#7395b9');
    expect(bounds.attributes.points).toEqual([[0, 0], [80, 0], [80, 40], [0, 40]]);
    expect(children.find(child => child.attributes.strokeColor === '#1976b5').attributes.pos).toEqual(draw.placementOrigin);
    const before = children.map(child => JSON.stringify(child.attributes));
    expect(() => updateElementFrame(layer, { ...next, source: 'missing.png' }, sources)).toThrow('未加载图片');
    expect(() => updateElementFrame(layer, { ...next, rect: [0, 0, 0, 40] }, sources)).toThrow(TypeError);
    expect(() => updateElementFrame(layer, { ...next, anchor: [NaN, 0] }, sources)).toThrow(TypeError);
    expect(children.map(child => JSON.stringify(child.attributes))).toEqual(before);
    renderElement(layer, null);
    expect(() => updateElementFrame(layer, next, sources)).toThrow('请先调用 renderElement');
  });
});
