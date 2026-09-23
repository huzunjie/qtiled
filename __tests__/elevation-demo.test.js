import fs from 'fs';
import path from 'path';
import vm from 'vm';
import * as rhombus from '../src/shapes/rhombus';

// 执行页面真实脚本，只替代 DOM 和绘制后端；不启动浏览器。
function createDemo(shapeMethods = rhombus) {
  const containers = [];
  class Shape {
    constructor(attrs) { this.attrs = attrs; }
    get text() { return this.attrs.text; }
    set text(text) { this.attrs.text = text; }
    attr(attrs) {
      this.updates = (this.updates || 0) + 1;
      Object.assign(this.attrs, attrs);
      if ('x' in attrs || 'y' in attrs) {
        this.attrs.pos = [attrs.x ?? this.attrs.pos[0], attrs.y ?? this.attrs.pos[1]];
      }
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
  const html = fs.readFileSync(path.join(__dirname, '../demo/elevation-rhombus.html'), 'utf8');
  const elements = {};
  for (const [, id] of html.matchAll(/<div id="([^"]+)"><\/div>/g)) {
    elements[id] = {
      style: {},
      events: {},
      addEventListener(name, handler) { this.events[name] = handler; },
      getBoundingClientRect() { return this.bounds; },
    };
  }
  const context = vm.createContext({
    document: { getElementById: id => elements[id] },
    spritejs: { Scene, Polyline: Shape, Label: Shape },
    qtiled: { shapes: { rhombus: shapeMethods } },
  });
  for (const [, script] of html.matchAll(/<script>([\s\S]*?)<\/script>/g)) {
    vm.runInContext(script, context);
  }
  const move = (index, x, y) => {
    const container = containers[index];
    const { left, top } = container.bounds;
    container.events.mousemove({ clientX: left + x, clientY: top + y });
  };
  const center = (index, grid) => containers[index].shapes
    .find(shape => (shape.attrs.text || '').startsWith(`${grid} h:`)).attrs.pos;
  const outputs = containers.map(container => container.shapes[container.shapes.length - 3]);
  const focuses = containers.map(container => container.shapes.slice(-2));
  return { containers, outputs, focuses, move, center };
}

describe('海拔 Demo 鼠标定位选中', () => {
  test('两种布局使用独立焦点，命中为绿色，空白为红色且不修改原瓦片', () => {
    const { containers, outputs, focuses, move, center } = createDemo();
    expect(containers).toHaveLength(2);
    [0, 1].forEach(index => {
      const [tile, label] = focuses[index];
      expect(tile.attrs.pos).toEqual(center(index, '0,0'));
      expect(label.text).toBe('0,0 h:0');
      expect(tile.attrs.lineWidth).toBe(2);
      expect(tile.attrs.fillColor).toBeUndefined();
      move(index, ...center(index, '3,1'));
      expect(outputs[index].text).toContain('gridX: 3 / gridY: 1 / elevation: 1');
      expect(tile.attrs.pos).toEqual(center(index, '3,1'));
      expect(label.attrs.pos).toEqual(tile.attrs.pos);
      expect(tile.attrs.strokeColor).toBe('rgba(0, 136, 0, 0.8)');
      expect(label.attrs.fillColor).toBe(tile.attrs.strokeColor);
      move(index, 5, 5);
      expect(outputs[index].text).toContain('未命中（海拔 0 平面参考）');
      const lookup = index === 0 ? rhombus.getInfoByPos : rhombus.getIsometricInfoByPos;
      const [gridX, gridY, x, y] = lookup([5, 5], center(index, '0,0'), [60, 30]);
      expect(tile.attrs.pos).toEqual([x, y]);
      expect(label.text).toBe(`${gridX},${gridY}`);
      expect(tile.attrs.strokeColor).toBe('rgba(255, 0, 0, 0.8)');
      expect(label.attrs.fillColor).toBe(tile.attrs.strokeColor);
      move(index, ...center(index, '0,0'));
      expect(tile.attrs.strokeColor).toBe('rgba(0, 136, 0, 0.8)');
      containers[index].shapes.slice(0, -3).forEach(shape => {
        expect(shape.updates).toBeUndefined();
      });
    });
  });

  test('范围内因海拔位移留下的空隙显示红色平面参考', () => {
    const { outputs, focuses, move, center } = createDemo();
    [0, 1].forEach(index => {
      const [x, y] = center(index, '1,0');
      move(index, x, y + 16);
      expect(outputs[index].text).toContain('gridX: 1 / gridY: 0 / 未命中');
      expect(focuses[index][0].attrs.pos).toEqual([x, y + 16]);
      expect(focuses[index][0].attrs.strokeColor).toBe('rgba(255, 0, 0, 0.8)');
    });
  });

  test('等距重叠区域按海拔从高到低选中可见顶面', () => {
    const { outputs, move, center } = createDemo();
    // 低处 (3,0) 和高处 (3,1) 的中心连线中点位于两者顶面内。
    const low = center(1, '3,0');
    const high = center(1, '3,1');
    move(1, (low[0] + high[0]) / 2, (low[1] + high[1]) / 2);
    expect(outputs[1].text).toContain('gridX: 3 / gridY: 1 / elevation: 1');

  });

  test('错列反查排除菱形外空白，并命中低海拔露出的顶面', () => {
    const { outputs, move, center } = createDemo();
    const [x, y] = center(0, '0,0');
    // 此点在外接矩形内、顶面外，实际对应范围外的格子。
    move(0, x - 27, y - 6);
    expect(outputs[0].text).toContain('未命中');
    const [lowX, lowY] = center(0, '3,4');
    move(0, lowX, lowY - 12);
    expect(outputs[0].text).toContain('gridX: 3 / gridY: 4 / elevation: -1');
  });

  test('在同一格内移动不重复更新高亮', () => {
    const { focuses, outputs, move, center } = createDemo();
    const [x, y] = center(0, '3,1');
    move(0, x, y);
    const [tile, label] = focuses[0];
    const text = outputs[0].text;
    move(0, x + 1, y);
    expect(tile.updates).toBe(1);
    expect(label.updates).toBe(1);
    expect(outputs[0].text).not.toBe(text);
  });

  test('谷地与高地的各级海拔均有可见顶面，并能独立命中', () => {
    const { containers, outputs, focuses, move, center } = createDemo();
    const valleys = [
      [['0,7', -1], ['1,9', -2], ['2,11', -3]],
      [['0,6', -1], ['1,7', -2], ['2,8', -3]],
    ];
    containers.forEach((container, index) => {
      const samples = [...valleys[index], ['6,7', 1], ['7,7', 2], ['8,7', 3]];
      const colors = new Set();
      samples.forEach(([grid, elevation]) => {
        const [x, y] = center(index, grid);
        // 谷地上侧露出的顶面避开前方较高地块的遮挡。
        move(index, x, y + (elevation < 0 ? -10 : 0));
        expect(focuses[index][1].text).toBe(`${grid} h:${elevation}`);
        expect(focuses[index][0].attrs.pos).toEqual([x, y]);
        expect(outputs[index].text).toContain(`elevation: ${elevation}`);
        const tile = container.shapes.find(shape => shape.attrs.points
          && shape.attrs.pos[0] === x && shape.attrs.pos[1] === y);
        expect(tile.attrs.fillColor).toBeDefined();
        colors.add(tile.attrs.fillColor);
      });
      expect(colors.size).toBe(6);
    });
  });

  test('页面滚动及容器居中位置变化后仍准确定位', () => {
    const { containers, outputs, move, center } = createDemo();
    containers.forEach((container, index) => {
      container.bounds.top -= 270;
      move(index, ...center(index, '3,1'));
      expect(outputs[index].text).toContain('gridX: 3 / gridY: 1 / elevation: 1');
      container.bounds.left += 180;
      container.bounds.top += 50;
      move(index, ...center(index, '0,0'));
      expect(outputs[index].text).toContain('gridX: 0 / gridY: 0 / elevation: 0');
    });
  });
});


describe('海拔 Demo 候选反查', () => {
  test('空白处按七个高度反查，不调用邻居方法', () => {
    const methods = { ...rhombus };
    ['getInfoByPos', 'getIsometricInfoByPos', 'getNeighbors', 'getIsometricNeighbors'].forEach(name => {
      methods[name] = jest.fn(rhombus[name]);
    });
    const { move } = createDemo(methods);
    move(0, 5, 5);
    expect(methods.getInfoByPos).toHaveBeenCalledTimes(7);
    expect(methods.getNeighbors).not.toHaveBeenCalled();
    move(1, 5, 5);
    expect(methods.getIsometricInfoByPos).toHaveBeenCalledTimes(7);
    expect(methods.getIsometricNeighbors).not.toHaveBeenCalled();
  });
});


describe('海拔 Demo 画布尺寸', () => {
  test('预设原点和画布尺寸容纳当前网格，显示尺寸与鼠标定位坐标一致', () => {
    const demo = createDemo();
    demo.containers.forEach((container, index) => {
      const tiles = container.shapes.slice(0, -3).filter(shape => shape.attrs.points);
      expect(tiles).toHaveLength(index === 0 ? 220 : 99);
      expect(container.width).toBe(800);
      expect(container.height).toBe(index === 0 ? 440 : 400);
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
      expect(demo.outputs[index].text).toContain('gridX: 0 / gridY: 0 / elevation: 0');
      const lastGrid = index === 0 ? '10,19' : '8,10';
      demo.move(index, ...demo.center(index, lastGrid));
      expect(demo.focuses[index][1].text).toBe(`${lastGrid} h:0`);
    });
  });
});
