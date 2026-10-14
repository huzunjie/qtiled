import fs from 'fs';
import vm from 'vm';
import * as rhombus from '../src/shapes/rhombus';

const source = fs.readFileSync(`${__dirname}/../demo/static/js/water-animation.js`, 'utf8');
const catalogue = JSON.parse(fs.readFileSync(`${__dirname}/../demo/static/terrain-samples/emperor-land-water/elements.json`));
async function page(broken = false) {
  const elements = Object.fromEntries(['controls', 'water-canvas', 'play', 'duration', 'layout', 'phase', 'scale', 'grid', 'frame', 'frame-label', 'status', 'previous', 'next'].map(id => [id, {
    value: '', dataset: {}, events: {}, addEventListener(name, fn) { this.events[name] = fn; }, setAttribute() {},
  }]));
  Object.entries({ duration: '100', layout: '3', phase: 'same', scale: '2' }).forEach(([id, value]) => { elements[id].value = value; });
  class Shape {
    constructor(attrs = {}) { this.attrs = attrs; this.children = []; }
    append(shape) { this.children.push(shape); }
    attr(attrs) { Object.assign(this.attrs, attrs); }
    remove() {}
  }
  const requests = [];
  const layer = new Shape(); layer.canvas = { getContext: () => ({}) };
  const defs = JSON.parse(JSON.stringify(catalogue));
  if (broken) defs['emperor-water-deep'].sequences.water.frames[0].rect[0] = -1;
  class Image {
    constructor() { this.naturalWidth = 624; this.naturalHeight = 1140; }
    set src(url) { requests.push(url); this.onload(); }
  }
  const context = vm.createContext({ URL, Image, document: { getElementById: id => elements[id], querySelector: () => null, addEventListener() {} },
    window: { qtiled: { shapes: { rhombus } }, spritejs: { Group: Shape, Sprite: Shape, Polyline: Shape,
      Scene: class { layer() { return layer; } } }, addEventListener() {} },
    fetch: async url => { requests.push(String(url)); return { ok: true, json: async () => defs }; },
    requestAnimationFrame: () => 1, cancelAnimationFrame() {},
  });
  vm.runInContext(fs.readFileSync(`${__dirname}/../demo/static/js/terrain-sample.js`, 'utf8'), context);
  await vm.runInContext(source.replace('import.meta.url', JSON.stringify('http://localhost/demo/static/js/water-animation.js')), context);
  return { elements, requests, layer };
}

test('公共深水定义和单一图集支撑全部逐帧裁切、锚点与回绕', async () => {
  const p = await page();
  expect(p.requests).toEqual(['http://localhost/demo/static/terrain-samples/emperor-land-water/elements.json',
    'http://localhost/demo/static/terrain-samples/emperor-land-water/water-shore-atlas.png?v=20261015020000']);
  const sprites = p.layer.children[0].children.slice(0, 9);
  for (const frame of catalogue['emperor-water-deep'].sequences.water.frames) {
    expect(sprites.every(s => JSON.stringify(s.attrs.sourceRect) === JSON.stringify(frame.rect))).toBe(true);
    expect(sprites[0].attrs.anchor).toEqual([0.5, 0.5]);
    p.elements.next.events.click();
  }
  expect(p.elements['frame-label'].textContent).toBe('1 / 24 · #712');
  p.elements.previous.events.click();
  expect(p.elements['frame-label'].textContent).toBe('24 / 24 · #735');
});

test('错开起始帧与单格切换保持独立观察功能', async () => {
  const p = await page();
  p.elements.phase.value = 'offset'; p.elements.phase.events.change();
  expect(new Set(p.layer.children[0].children.slice(0, 9).map(s => JSON.stringify(s.attrs.sourceRect))).size).toBeGreaterThan(1);
  p.elements.layout.value = '1'; p.elements.layout.events.change();
  expect(p.elements.phase.disabled).toBe(true);
});

test('公共动画定义错误时禁用控件并显示加载失败', async () => {
  const p = await page(true);
  expect(p.elements.controls.disabled).toBe(true);
  expect(p.elements.status.dataset.error).toBe('true');
  expect(p.layer.children).toHaveLength(0);
});
