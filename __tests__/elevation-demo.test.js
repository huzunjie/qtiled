import fs from 'fs';
import path from 'path';
import vm from 'vm';
import * as rhombus from '../src/shapes/rhombus';

// 执行页面真实脚本，只替代 DOM 和绘制后端；不启动浏览器。
function createDemo(shapeMethods = rhombus) {
  const containers = [];
  const outputs = [];
  function createElement(tag) {
    const element = {
      style: {},
      events: {},
      children: [],
      append(...children) { this.children.push(...children); },
      appendChild(child) { this.children.push(child); },
      setAttribute() {},
      addEventListener(name, handler) { this.events[name] = handler; },
      getBoundingClientRect() { return this.bounds; },
    };
    if (tag === 'output') outputs.push(element);
    return element;
  }
  class Shape {
    constructor(attrs) { this.attrs = attrs; }
    attr(attrs) {
      this.updates = (this.updates || 0) + 1;
      Object.assign(this.attrs, attrs);
    }
  }
  class Scene {
    constructor({ container, width, height }) {
      this.container = container;
      container.width = width;
      container.height = height;
      container.bounds = { left: 100, top: 200, width, height };
      containers.push(container);
    }
    layer() {
      return { append: (...shapes) => { this.container.shapes = shapes; } };
    }
  }
  const html = fs.readFileSync(path.join(__dirname, '../demo/elevation.html'), 'utf8');
  const window = { scrollX: 0, scrollY: 0 };
  const context = vm.createContext({
    window,
    document: { createElement, getElementById: () => createElement('div') },
    spritejs: { Scene, Polyline: Shape, Label: Shape },
    qtiled: { shapes: { rhombus: shapeMethods } },
  });
  for (const [, script] of html.matchAll(/<script>([\s\S]*?)<\/script>/g)) {
    vm.runInContext(script, context);
  }
  const move = (index, x, y) => {
    const container = containers[index];
    const { left, top } = container.bounds;
    container.events.mousemove({ pageX: left + window.scrollX + x, pageY: top + window.scrollY + y });
  };
  const center = (index, grid) => containers[index].shapes
    .find(shape => (shape.attrs.text || '').startsWith(`${grid} h:`)).attrs.pos;
  return { containers, outputs, move, center, window };
}

describe('海拔 Demo 鼠标定位选中', () => {
  test('仅生成两张海拔图，两种布局均可选中并在空白处清除轮廓', () => {
    const { containers, outputs, move, center } = createDemo();
    expect(containers).toHaveLength(2);
    [0, 1].forEach((index, outputIndex) => {
      move(index, ...center(index, '0,0'));
      expect(outputs[outputIndex].textContent).toBe('gridX: 0 / gridY: 0 / elevation: 0');
      expect(containers[index].shapes.filter(shape => shape.attrs.strokeColor === '#d35400')).toHaveLength(1);
      move(index, 5, 5);
      expect(outputs[outputIndex].textContent).toContain('未选中');
      expect(containers[index].shapes.filter(shape => shape.attrs.strokeColor === '#d35400')).toHaveLength(0);
    });
  });

  test('等距重叠区域按海拔从高到低选中可见顶面', () => {
    const { outputs, move, center } = createDemo();
    // 低处 (3,0) 和高处 (3,1) 的中心连线中点位于两者顶面内。
    const low = center(1, '3,0');
    const high = center(1, '3,1');
    move(1, (low[0] + high[0]) / 2, (low[1] + high[1]) / 2);
    expect(outputs[1].textContent).toBe('gridX: 3 / gridY: 1 / elevation: 1');

  });

  test('错列反查排除菱形外空白，并命中低海拔露出的顶面', () => {
    const { outputs, move, center } = createDemo();
    const [x, y] = center(0, '0,0');
    // 此点在外接矩形内、顶面外，实际对应范围外的格子。
    move(0, x - 27, y - 6);
    expect(outputs[0].textContent).toContain('未选中');
    const [lowX, lowY] = center(0, '3,4');
    move(0, lowX, lowY - 12);
    expect(outputs[0].textContent).toBe('gridX: 3 / gridY: 4 / elevation: -1');
  });

  test('在同一格内移动不重复更新高亮', () => {
    const { containers, move, center } = createDemo();
    const [x, y] = center(0, '0,0');
    move(0, x, y);
    const tile = containers[0].shapes.find(shape => shape.attrs.strokeColor === '#d35400');
    move(0, x + 1, y);
    expect(tile.updates).toBe(1);
  });

  test('页面滚动后仍通过缓存的页面偏移定位', () => {
    const { containers, outputs, move, center, window } = createDemo();
    window.scrollY = 270;
    containers[1].bounds.top -= 270;
    move(1, ...center(1, '3,1'));
    expect(outputs[1].textContent).toBe('gridX: 3 / gridY: 1 / elevation: 1');
    move(1, -1, 120);
    expect(outputs[1].textContent).toContain('未选中');
  });
});


describe('海拔 Demo 候选反查', () => {
  test('空白处按三个高度反查，不调用邻居方法', () => {
    const methods = { ...rhombus };
    ['getInfoByPos', 'getIsometricInfoByPos', 'getNeighbors', 'getIsometricNeighbors'].forEach(name => {
      methods[name] = jest.fn(rhombus[name]);
    });
    const { move } = createDemo(methods);
    move(0, 5, 5);
    expect(methods.getInfoByPos).toHaveBeenCalledTimes(3);
    expect(methods.getNeighbors).not.toHaveBeenCalled();
    move(1, 5, 5);
    expect(methods.getIsometricInfoByPos).toHaveBeenCalledTimes(3);
    expect(methods.getIsometricNeighbors).not.toHaveBeenCalled();
  });
});


describe('海拔 Demo 画布尺寸', () => {
  test('预设原点和画布尺寸容纳当前网格，显示尺寸与鼠标定位坐标一致', () => {
    const demo = createDemo();
    demo.containers.forEach((container, index) => {
      expect(container.style.width).toBe(`${container.width}px`);
      expect(container.style.height).toBe(`${container.height}px`);
      container.shapes.filter(shape => shape.attrs.points).forEach(shape => {
        const [x, y] = shape.attrs.pos;
        shape.attrs.points.forEach(([dx, dy]) => {
          expect(x + dx).toBeGreaterThanOrEqual(0);
          expect(x + dx).toBeLessThanOrEqual(container.width);
          expect(y + dy).toBeGreaterThanOrEqual(0);
          expect(y + dy).toBeLessThanOrEqual(container.height);
        });
      });
      demo.move(index, ...demo.center(index, '0,0'));
      expect(demo.outputs[index].textContent).toBe('gridX: 0 / gridY: 0 / elevation: 0');
    });
  });
});
