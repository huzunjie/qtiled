import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { JSDOM } from 'jsdom';
import { shapes, pathFinding } from '../src';

const pointerScript = fs.readFileSync(path.join(__dirname, '../demo/static/js/pointer.js'), 'utf8');

test('鼠标坐标使用当前容器位置，保留小数及容器外坐标', () => {
  const context = vm.createContext({});
  vm.runInContext(pointerScript, context);
  let bounds = { left: 100.5, top: 200.25 };
  const container = { getBoundingClientRect: () => bounds, offsetLeft: 5, offsetTop: 7 };
  const event = { clientX: 110.75, clientY: 199, pageX: 1110.75, pageY: 2199 };
  expect(context.getPointerPosition(event, container)).toEqual([10.25, -1.25]);
  bounds = { left: 120.5, top: -100.25 };
  expect(context.getPointerPosition(event, container)).toEqual([-9.75, 299.25]);
});

// 执行旧式 demo 的真实脚本，仅替代 DOM 和绘制后端，观察传给几何反查的坐标。
function createDemo(file, finding = pathFinding) {
  const html = fs.readFileSync(path.join(__dirname, '../demo', file), 'utf8');
  const { window } = new JSDOM(html);
  Object.defineProperty(window.HTMLElement.prototype, 'innerText', { get() { return this.textContent; } });
  const elements = {};
  for (const [, tag, id, attrs] of html.matchAll(/<([\w-]+)[^>]*?\bid="([^"]+)"([^>]*)>/g)) {
    elements[id] = {
      before() {},
      value: attrs.match(/value="([^"]*)"/)?.[1] || (tag === 'select' ? 'all' : '1'),
      style: {}, events: {}, offsetLeft: 5, offsetTop: 7,
      bounds: { left: 100, top: 200 },
      getBoundingClientRect() { return this.bounds; },
      addEventListener(name, handler) { this.events[name] = handler; },
      querySelectorAll(selector) { return window.document.getElementById(id).querySelectorAll(selector); },
    };
  }
  const nodes = new Set();
  class Shape {
    constructor(attrs) { Object.assign(this, attrs); }
    attr(name, value) {
      if (typeof name === 'string') this[name] = value;
      else Object.assign(this, name);
    }
    remove() { nodes.delete(this); }
  }
  class Scene { layer() { return { append(...items) { items.forEach(item => nodes.add(item)); } }; } }
  const lookups = [];
  const shapeMethods = {};
  for (const [name, methods] of Object.entries(shapes)) {
    shapeMethods[name] = { ...methods };
    for (const method of ['getInfoByPos', 'getIsometricInfoByPos']) {
      if (!methods[method]) continue;
      shapeMethods[name][method] = (pixel, ...args) => {
        lookups.push(Array.from(pixel));
        return methods[method](pixel, ...args);
      };
    }
  }
  const alert = jest.fn();
  const context = vm.createContext({
    window,
    document: { getElementById: id => elements[id], createElement: window.document.createElement.bind(window.document), addEventListener: window.document.addEventListener.bind(window.document) },
    spritejs: { Scene, Label: Shape, Polyline: Shape },
    qtiled: { shapes: shapeMethods, pathFinding: finding }, alert,
  });
  // 按 HTML 中的真实顺序加载公共脚本和内联脚本，防止漏引或加载过晚。
  for (const [, attrs, script] of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)) {
    if (attrs.includes('./static/js/pointer.js')) vm.runInContext(pointerScript, context);
    else if (attrs.includes('./static/js/tile-selection.js')) vm.runInContext(fs.readFileSync(path.join(__dirname, '../demo/static/js/tile-selection.js'), 'utf8'), context);
    else if (!attrs.includes('src=')) vm.runInContext(script, context);
  }
  return { elements, lookups, nodes, alert, window };
}

test.each([
  'rect.html', 'hexagon.html', 'rhombus.html', 'vast.html',
  'neighbors-rect.html', 'neighbors-rhombus.html',
  'pathfinding-rect.html', 'pathfinding-hexagon.html', 'pathfinding-rhombus.html',
])('%s：容器移动及页面滚动后，移动与点击仍传入相同局部坐标', file => {
  const { elements, lookups } = createDemo(file);
  // 开启寻路页设置起点的模式，让真实 click 回调执行坐标查询。
  Object.entries(elements).filter(([id]) => /^set_sta\d*$/.test(id)).forEach(([, element]) => element.onclick());
  const containers = Object.values(elements).filter(element => element.events.mousemove);
  expect(containers.length).toBeGreaterThan(0);
  containers.forEach(container => {
    [{ left: 100, top: 200 }, { left: 380, top: -100 }].forEach(bounds => {
      container.bounds = bounds;
      const event = { clientX: bounds.left + 300, clientY: bounds.top + 200,
        pageX: bounds.left + 1300, pageY: bounds.top + 2200 };
      for (const type of ['mousemove', 'click']) {
        if (!container.events[type]) continue;
        lookups.length = 0;
        container.events[type](event);
        expect(lookups).toEqual([[300, 200]]);
      }
    });
  });
});

test.each([
  ['pathfinding-rect.html', ''], ['pathfinding-hexagon.html', ''],
  ['pathfinding-rhombus.html', ''], ['pathfinding-rhombus.html', '1'],
])('%s %s：失败寻路与条件变化清除旧路径', (file, suffix) => {
  const aStar = jest.fn(() => [[0, 0, 0]]);
  const { elements, nodes, alert, window } = createDemo(file, { aStar });
  const get = id => elements[id + suffix];
  const roads = () => [...nodes].filter(node => /^(道路 |路)\d/.test(String(node.text)));
  get('start_path_finding').onclick();
  expect(roads().length).toBeGreaterThan(0);
  aStar.mockReturnValueOnce(null);
  get('start_path_finding').onclick();
  expect(alert).toHaveBeenLastCalledWith('没有通行路径。');
  expect(roads()).toHaveLength(0);
  for (const change of [
    () => get('clear_sta').onclick(),
    () => get('clear_end').onclick(),
    () => get('clear_roadblock').onclick(),
    () => get('dirs').querySelectorAll('[data-dir]')[0].click(),
    () => get('ckb').onchange(),
  ]) {
    get('start_path_finding').onclick();
    expect(roads().length).toBeGreaterThan(0);
    change();
    expect(roads()).toHaveLength(0);
  }
  window.close();
});
