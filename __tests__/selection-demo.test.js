import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { JSDOM } from 'jsdom';
import { shapes } from '../src';

function loadDemo(file) {
  const html = fs.readFileSync(path.join(__dirname, '../demo', file), 'utf8');
  const { window } = new JSDOM(html);
  const errors = [];
  window.addEventListener('error', event => { errors.push(event.error); event.preventDefault(); });
  const scenes = [];
  class Shape {
    constructor(attrs) { this.attrs = attrs; this.updates = 0; }
    get text() { return this.attrs.text; }
    set text(value) { this.attrs.text = value; }
    attr(name, value) {
      this.updates++;
      if (typeof name === 'string') this.attrs[name] = value;
      else Object.assign(this.attrs, name);
    }
    remove() {
      if (this.layer) this.layer.children = this.layer.children.filter(child => child !== this);
    }
  }
  class Scene {
    constructor({ container }) { this.container = container; scenes.push(this); }
    layer() {
      const layer = { children: [], append(...children) {
        children.forEach(child => { child.remove(); child.layer = layer; layer.children.push(child); });
      } };
      this.nodes = layer;
      return layer;
    }
  }
  const polygon = { ...shapes.polygon, rotateSelectionOffsets: jest.fn(shapes.polygon.rotateSelectionOffsets) };
  const context = vm.createContext({ window, document: window.document, qtiled: { shapes: { ...shapes, polygon } }, spritejs: { Scene, Label: Shape, Polyline: Shape } });
  for (const [, attrs, script] of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)) {
    const helper = attrs.match(/static\/js\/(pointer|tile-selection|elevation-selection)\.js/);
    if (helper) vm.runInContext(fs.readFileSync(path.join(__dirname, `../demo/static/js/${helper[1]}.js`), 'utf8'), context);
    else if (!attrs.includes('src=')) vm.runInContext(script, context);
  }
  const change = (panel, name, value) => {
    const input = panel.querySelector(`[data-control="${name}"]`);
    input.value = value;
    input.dispatchEvent(new window.Event('change', { bubbles: true }));
  };
  const move = (container, x, y) => container.dispatchEvent(new window.MouseEvent('mousemove', { clientX: x, clientY: y }));
  return { window, scenes, errors, polygon, change, move };
}

test.each(['neighbors-rect.html', 'neighbors-rhombus.html'])('%s 距离输入未提交时移动不越界，同格不重复更新', file => {
  const demo = loadDemo(file);
  const panels = [...demo.window.document.querySelectorAll('.tile-selection')];
  panels.forEach(panel => {
    const container = panel.nextElementSibling;
    const scene = demo.scenes.find(item => item.container === container);
    const input = panel.querySelector('[data-control="distance"]');
    const count = scene.nodes.children.length;
    input.value = '2';
    input.dispatchEvent(new demo.window.Event('input', { bubbles: true }));
    demo.move(container, 350, 210);
    expect(scene.nodes.children).toHaveLength(count);
    const updates = scene.nodes.children.reduce((sum, shape) => sum + shape.updates, 0);
    demo.move(container, 350, 210);
    expect(scene.nodes.children.reduce((sum, shape) => sum + shape.updates, 0)).toBe(updates);
    demo.change(panel, 'distance', '2');
    expect(scene.nodes.children.length).toBeGreaterThan(count);
    demo.move(container, 390, 240);
    demo.change(panel, 'distance', '0');
    demo.change(panel, 'type', 'no_self');
    demo.move(container, 410, 270);
  });
  expect(demo.errors).toEqual([]);
});

test('共用控件缓存、重置和键盘作用范围', () => {
  const demo = loadDemo('neighbors-rhombus.html');
  const panels = [...demo.window.document.querySelectorAll('.tile-selection')];
  panels.forEach(panel => demo.change(panel, 'mode', 'custom'));
  const panel = panels[0];
  const container = panel.nextElementSibling;
  const calls = demo.polygon.rotateSelectionOffsets.mock.calls.length;
  demo.move(container, 350, 210);
  demo.move(container, 400, 250);
  expect(demo.polygon.rotateSelectionOffsets).toHaveBeenCalledTimes(calls);
  container.dispatchEvent(new demo.window.MouseEvent('mouseenter'));
  const key = options => demo.window.document.body.dispatchEvent(new demo.window.KeyboardEvent('keydown', { key: 'r', bubbles: true, ...options }));
  key({});
  expect(panel.querySelector('output').value).toBe('90°');
  expect(panels[1].querySelector('output').value).toBe('0°');
  for (const options of [{ repeat: true }, { ctrlKey: true }, { metaKey: true }, { altKey: true }, { shiftKey: true }, { isComposing: true }]) key(options);
  panel.querySelector('input').dispatchEvent(new demo.window.KeyboardEvent('keydown', { key: 'r', bubbles: true }));
  expect(panel.querySelector('output').value).toBe('90°');
  container.dispatchEvent(new demo.window.MouseEvent('mouseleave'));
  key({});
  expect(panel.querySelector('output').value).toBe('90°');
  demo.change(panel, 'width', '4');
  expect(panel.querySelector('output').value).toBe('0°');
  demo.change(panel, 'shape', 'l');
  for (let i = 0; i < 4; i++) panel.querySelector('button').click();
  expect(panel.querySelector('output').value).toBe('0°');
  expect(demo.errors).toEqual([]);
});

test('海拔页未命中清除预览，边界选区不超出实际地图', () => {
  const demo = loadDemo('elevation-rhombus.html');
  for (const scene of demo.scenes) {
    const panel = scene.container.previousElementSibling;
    demo.move(scene.container, 5, 5);
    const base = scene.nodes.children.length;
    demo.change(panel, 'mode', 'custom');
    demo.change(panel, 'width', '7');
    demo.change(panel, 'height', '7');
    expect(scene.nodes.children).toHaveLength(base);
    const origin = scene.nodes.children.find(node => node.text === '0,0 h:0').attrs.pos;
    demo.move(scene.container, ...origin);
    const overlays = scene.nodes.children.filter(node => node.attrs.lineWidth === 0);
    expect(overlays.length).toBeGreaterThan(0);
    overlays.forEach(node => node.attrs.points.forEach(([x, y]) => {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(800);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(440);
    }));
    demo.move(scene.container, 5, 5);
    expect(scene.nodes.children).toHaveLength(base);
  }
  expect(demo.errors).toEqual([]);
});

describe('顶面可见区域裁剪', () => {
  const context = vm.createContext({ qtiled: { shapes } });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../demo/static/js/elevation-selection.js'), 'utf8'), context);
  const square = [[-10, -10], [10, -10], [10, 10], [-10, 10]];
  const visible = positions => context.getVisibleTileParts(positions.map((pos, gridX) => ({ pos, gridX, gridY: 0 })), square);
  const area = parts => parts.reduce((sum, points) => sum + Math.abs(points.reduce((a, [x, y], i) => {
    const next = points[(i + 1) % points.length];
    return a + x * next[1] - next[0] * y;
  }, 0)) / 2, 0);
  test('部分露出与完全遮挡，包括中心被挡但边缘可见', () => {
    expect(area(visible([[0, 0], [5, 0]]).get('0,0').parts)).toBeCloseTo(100);
    expect(visible([[0, 0], [0, 0]]).has('0,0')).toBe(false);
  });
  test('多个顶面共同覆盖，零面积接触不误删', () => {
    expect(visible([[0, 0], [-10, 0], [10, 0]]).has('0,0')).toBe(false);
    expect(area(visible([[0, 0], [20, 0], [20, 20]]).get('0,0').parts)).toBeCloseTo(400);
  });
  test('轮廓也裁到露出侧，支持反向顶点序列', () => {
    const top = visible([[0, 0], [5, 0]]).get('0,0');
    top.outlines.flat().forEach(([x]) => expect(x).toBeLessThanOrEqual(-5));
    const reversed = context.getVisibleTileParts([{ pos: [0, 0], gridX: 0, gridY: 0 }, { pos: [5, 0], gridX: 1, gridY: 0 }], [...square].reverse());
    expect(area(reversed.get('0,0').parts)).toBeCloseTo(100);
  });
});
