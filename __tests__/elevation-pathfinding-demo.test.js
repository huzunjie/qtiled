import fs from 'fs';
import path from 'path';
import vm from 'vm';
import * as rhombus from '../src/shapes/rhombus';
import aStar from '../src/path-finding/a-star';

// 执行真实页面脚本，只替代 DOM 和绘制后端，寻路与坐标使用库实现。
function createDemo(search = aStar) {
  const html = fs.readFileSync(path.join(__dirname, '../demo/pathfinding-elevation-rhombus.html'), 'utf8');
  const elements = {};
  for (const [, tag, id] of html.matchAll(/<([^<>]*?)id="([^"]+)"[^>]*>/g)) {
    elements[id] = {
      style: {}, events: {}, textContent: '', checked: false, value: tag.includes('range') ? '1' : '',
      addEventListener(name, handler) { this.events[name] = handler; },
      getBoundingClientRect() { return this.bounds; },
    };
  }
  for (const [, id, contents] of html.matchAll(/<span id="([^"]+)" class="dirs">([\s\S]*?)<\/span>/g)) {
    const buttons = [...contents.matchAll(/<a data-dir([^>]*)>([^<]+)<\/a>/g)]
      .map(([, attrs, innerText]) => ({ innerText, className: attrs.includes('active') ? 'active' : '' }));
    elements[id].querySelectorAll = () => buttons;
  }
  class Shape {
    constructor(attrs) { this.attrs = attrs; }
    get text() { return this.attrs.text; }
    set text(text) { this.attrs.text = text; }
    attr(attrs) { Object.assign(this.attrs, attrs); }
    remove() {
      if (this.parent) this.parent.splice(this.parent.indexOf(this), 1);
      this.parent = null;
    }
  }
  class Scene {
    constructor({ container, width, height }) {
      this.container = container;
      container.bounds = { left: 100, top: 200, width, height };
      container.shapes = [];
    }
    layer() {
      const shapes = this.container.shapes;
      const insertBefore = (shape, before) => {
        shape.remove();
        shapes.splice(before ? shapes.indexOf(before) : shapes.length, 0, shape);
        shape.parent = shapes;
      };
      return { insertBefore, append: (...items) => items.forEach(item => insertBefore(item)) };
    }
  }
  const methods = { ...rhombus };
  ['getInfoByPos', 'getIsometricInfoByPos', 'getNeighbors', 'getIsometricNeighbors'].forEach(name => {
    methods[name] = jest.fn(rhombus[name]);
  });
  const findPath = jest.fn(search);
  const alert = jest.fn();
  const context = vm.createContext({
    document: { getElementById: id => elements[id] },
    spritejs: { Scene, Polyline: Shape, Label: Shape },
    qtiled: { shapes: { rhombus: methods }, pathFinding: { aStar: findPath } }, alert,
  });
  for (const [, script] of html.matchAll(/<script>([\s\S]*?)<\/script>/g)) vm.runInContext(script, context);
  const demos = ['staggered', 'isometric'].map((id, index) => {
    const container = elements[id];
    const el = name => elements[`${id}_${name}`];
    const click = name => el(name).onclick();
    const labels = () => container.shapes.slice(0, -3).filter(shape => / h:/.test(shape.text || ''));
    const label = grid => labels().find(shape => shape.text.startsWith(`${grid} h:`));
    const height = grid => Number(label(grid)?.text.split(' h:')[1] || 0);
    const center = grid => label(grid)?.attrs.pos || (index === 0
      ? rhombus.getPosition(grid, [60, 30], 'odd', [60, 90])
      : rhombus.getIsometricPosition(grid, [60, 30], [100, 180])).slice(0, 2);
    const fire = (event, x, y) => container.events[event]({ clientX: container.bounds.left + x, clientY: container.bounds.top + y });
    const choose = (kind, grid) => {
      click(`set_${kind}`);
      const [x, y] = center(grid);
      fire('click', x, y + (height(grid) < 0 ? -10 : 0));
    };
    const diff = value => {
      el('max_diff').value = String(value);
      el('max_diff').oninput({ target: el('max_diff') });
    };
    const outside = checked => { el('ckb').checked = checked; el('ckb').onchange(); };
    const run = () => { click('start_path_finding'); return findPath.mock.results.slice(-1)[0]?.value; };
    return { container, el, click, labels, label, height, center, fire, choose, diff, outside, run };
  });
  return { demos, findPath, alert, methods };
}

describe.each([0, 1])('菱形高差寻路布局 %i', index => {
  test('沿用参考地图、绘制顺序和坐标，默认路径逐步爬升且保持原成本', () => {
    const { demos, alert } = createDemo();
    const d = demos[index];
    const reference = fs.readFileSync(path.join(__dirname, '../demo/elevation-rhombus.html'), 'utf8');
    const maps = [...reference.matchAll(/const elevations = (\{[\s\S]*?\n      \});/g)];
    const elevations = vm.runInNewContext(`(${maps[index][1]})`);
    expect(d.labels()).toHaveLength(index === 0 ? 220 : 99);
    const heights = d.labels().map(label => Number(label.text.split(' h:')[1]));
    expect(heights).toEqual([...heights].sort((a, b) => a - b));
    d.labels().forEach(label => {
      const grid = label.text.split(' ')[0].split(',').map(Number);
      expect(d.height(grid)).toBe(elevations[grid] || 0);
      const expected = index === 0
        ? rhombus.getPosition(grid, [60, 30], 'odd', [60, 90], d.height(grid))
        : rhombus.getIsometricPosition(grid, [60, 30], [100, 180], d.height(grid));
      expect(label.attrs.pos).toEqual(expected.slice(0, 2));
    });
    const shapes = d.container.shapes.slice();
    const fills = shapes.filter(s => s.attrs.points).map(s => s.attrs.fillColor);
    const pathResult = d.run();
    expect(alert).not.toHaveBeenCalled();
    expect(pathResult[0]).toEqual([2, index === 0 ? 11 : 8, 0]);
    expect(pathResult[pathResult.length - 1].slice(0, 2)).toEqual([8, 7]);
    pathResult.slice(1).forEach(([x, y, cost], i) => {
      expect(Math.abs(d.height([x, y]) - d.height(pathResult[i].slice(0, 2)))).toBeLessThanOrEqual(1);
      expect(cost).toBe(i + 1);
    });
    expect(d.container.shapes).toEqual(shapes);
    expect(shapes.filter(s => s.attrs.points).map(s => s.attrs.fillColor)).toEqual(fills);
    expect(demos[1 - index].el('result').textContent).toContain('当前操作：浏览');
    expect(demos[1 - index].el('result').textContent).not.toContain('已找到路径');
    d.diff(0);
    expect(d.el('result').textContent).toContain('最大高差已改为 0，请重新寻路');
    expect(d.el('result').textContent).not.toContain('已找到路径');
    expect(d.run()).toBeNull();
    expect(alert).toHaveBeenLastCalledWith('没有通行路径。');
    [1, 2, 3].forEach(value => { d.diff(value); expect(d.run()).not.toBeNull(); });
  });

  test('邻居策略按单步高差对称筛选，方向和角邻居成本保持原值', () => {
    const { demos, findPath } = createDemo();
    const d = demos[index];
    d.el('dirs').querySelectorAll().forEach(button => { if (!button.className) button.onclick(); });
    d.run();
    const neighbors = findPath.mock.calls.slice(-1)[0][2];
    const original = grid => index === 0 ? rhombus.getNeighbors(grid) : rhombus.getIsometricNeighbors(grid);
    [0, 1, 2, 3].forEach(max => {
      d.diff(max);
      d.labels().forEach(label => {
        const grid = label.text.split(' ')[0].split(',').map(Number);
        const expected = original(grid).filter(([x, y]) => d.label([x, y]) && Math.abs(d.height(grid) - d.height([x, y])) <= max);
        expect(neighbors(grid)).toEqual(expected);
        expected.forEach(([x, y]) => expect(neighbors([x, y]).some(([nx, ny]) => nx === grid[0] && ny === grid[1])).toBe(true));
      });
    });
    const button = d.el('dirs').querySelectorAll()[0];
    button.onclick();
    expect(neighbors([3, 3]).some(n => n[3] === button.innerText)).toBe(false);
    expect(d.el('result').textContent).toContain('条件已更新，请重新寻路');
  });

  test('端点缺失、重合、路障和全部方向关闭，并清除旧路径', () => {
    const { demos, alert } = createDemo();
    const d = demos[index];
    d.click('clear_sta'); d.run();
    expect(alert).toHaveBeenLastCalledWith('请先设置起点和终点。');
    d.choose('sta', [0, 0]); d.choose('end', [0, 0]);
    expect(d.run()).toEqual([[0, 0, 0]]);
    expect(d.el('result').textContent).toContain('成本 0');
    d.choose('roadblock', [0, 0]);
    expect(d.el('result').textContent).toContain('路障已更新，请重新寻路'); d.run();
    expect(alert).toHaveBeenLastCalledWith('错误的起点，不可通行');
    d.click('clear_roadblock');
    expect(d.run()).toEqual([[0, 0, 0]]);
    d.choose('end', [8, 7]); d.choose('roadblock', [8, 7]); d.run();
    expect(alert).toHaveBeenLastCalledWith('错误的终点，不可通行');
    d.click('clear_roadblock');
    d.el('dirs').querySelectorAll().forEach(button => { if (button.className) button.onclick(); });
    expect(d.run()).toBeNull();
    d.click('clear_end'); d.run();
    expect(alert).toHaveBeenLastCalledWith('请先设置起点和终点。');
  });

  test('result 同时保留当前操作和最新结果，各布局互不影响', () => {
    const { demos } = createDemo();
    const d = demos[index];
    expect(d.el('result').textContent).toContain('当前操作：浏览\n已预设谷底起点与高地终点');
    ['sta', 'end', 'roadblock'].forEach((name, i) => {
      d.click(`set_${name}`);
      const label = ['起点', '终点', '路障'][i];
      expect(d.el('result').textContent).toContain(`当前操作：设置${label}\n点击瓦片设置${label}`);
      expect(demos[1 - index].el('result').textContent).toContain('当前操作：浏览');
    });
    d.choose('sta', [0, 0]); d.choose('end', [0, 0]); d.run();
    expect(d.el('result').textContent).toBe('当前操作：设置终点\n已找到路径：0 步，总成本 0');
    d.click('clear_path');
    expect(d.el('result').textContent).toBe('当前操作：设置终点\n路径已清理。');
    d.diff(2);
    expect(d.el('result').textContent).toBe('当前操作：设置终点\n最大高差已改为 2，请重新寻路。');
    d.click('clear_end'); d.run();
    expect(d.el('result').textContent).toBe('当前操作：设置终点\n请先设置起点和终点。');
  });

  test('外部海拔为零，搜索不依赖绘制；关闭开关保留端点，清理后回收外部图形', () => {
    const { demos, alert } = createDemo();
    const d = demos[index];
    const count = d.container.shapes.length;
    d.outside(true);
    d.choose('sta', [-1, 0]); d.choose('end', [-1, 4]);
    const pathResult = d.run();
    expect(pathResult[0]).toEqual([-1, 0, 0]);
    expect(pathResult[pathResult.length - 1].slice(0, 2)).toEqual([-1, 4]);
    expect(d.height([-1, 2])).toBe(0);
    const heights = d.labels().map(label => Number(label.text.split(' h:')[1]));
    expect(heights).toEqual([...heights].sort((a, b) => a - b));
    d.outside(false); d.run();
    expect(alert).toHaveBeenLastCalledWith('错误的起点，不可通行');
    expect(d.label([-1, 0])).toBeDefined();
    d.click('clear_sta'); d.click('clear_end'); d.click('clear_path');
    expect(d.container.shapes).toHaveLength(count);
    d.outside(true); d.fire('mousemove', 5, 5);
    expect(d.container.shapes.length).toBeGreaterThan(count);
    d.container.events.mouseleave();
    expect(d.container.shapes).toHaveLength(count);
  });

  test('独立焦点命中高低顶面、空白显示红色参考，滚动定位且每层仅反查一个候选', () => {
    const { demos, methods } = createDemo();
    const d = demos[index];
    const lookup = methods[index === 0 ? 'getInfoByPos' : 'getIsometricInfoByPos'];
    const count = d.container.shapes.length;
    const [info, focusTile, focusLabel] = d.container.shapes.slice(-3);
    const originalAttrs = d.container.shapes.slice(0, -3).map(shape => ({ ...shape.attrs }));
    expect(focusTile.attrs.fillColor).toBeUndefined();
    expect(focusLabel.text).toBe('0,0 h:0');
    const [x, y] = d.center([3, 1]);
    d.container.bounds.left += 150; d.container.bounds.top -= 300;
    d.fire('mousemove', x, y);
    expect(info.text).toContain('gridX: 3 / gridY: 1 / elevation: 1');
    expect(focusTile.attrs.pos).toEqual([x, y]);
    expect(focusLabel.attrs.pos).toEqual([x, y]);
    expect(focusTile.attrs.strokeColor).toBe('rgba(0, 136, 0, 0.8)');
    expect(d.container.shapes).toHaveLength(count);
    const [lx, ly] = d.center([2, index === 0 ? 11 : 8]);
    d.fire('mousemove', lx, ly - 10);
    expect(info.text).toContain('elevation: -3');
    expect(focusLabel.text).toBe(`2,${index === 0 ? 11 : 8} h:-3`);
    lookup.mockClear(); d.fire('mousemove', 5, 5);
    expect(lookup).toHaveBeenCalledTimes(7);
    expect(info.text).toContain('未命中（海拔 0 平面参考）');
    expect(focusTile.attrs.strokeColor).toBe('rgba(255, 0, 0, 0.8)');
    expect(focusLabel.attrs.fillColor).toBe(focusTile.attrs.strokeColor);
    const reverse = index === 0 ? rhombus.getInfoByPos : rhombus.getIsometricInfoByPos;
    const [gx, gy, fx, fy] = reverse([5, 5], d.center([0, 0]), [60, 30]);
    expect(focusTile.attrs.pos).toEqual([fx, fy]);
    expect(focusLabel.text).toBe(`${gx},${gy}`);
    expect(methods[index === 0 ? 'getNeighbors' : 'getIsometricNeighbors']).not.toHaveBeenCalled();
    if (index === 1) {
      const low = d.center([3, 0]); const high = d.center([3, 1]);
      d.fire('mousemove', (low[0] + high[0]) / 2, (low[1] + high[1]) / 2);
      expect(info.text).toContain('gridX: 3 / gridY: 1');
    }
    d.container.events.mouseleave();
    expect(focusTile.attrs.opacity).toBe(0);
    expect(focusLabel.attrs.opacity).toBe(0);
    expect(d.container.shapes.slice(0, -3).map(shape => shape.attrs)).toEqual(originalAttrs);
  });

  test('升降模式连续点击每次只改一格，更新位置、颜色、标记和鼠标命中', () => {
    const { demos } = createDemo();
    const d = demos[index];
    d.choose('sta', [0, 0]);
    const label = d.label([0, 0]);
    const shapes = d.container.shapes;
    const tile = shapes[shapes.indexOf(label) - 1];
    const marker = shapes[shapes.indexOf(label) + 1];
    const originalPos = [...label.attrs.pos];
    const originalFill = tile.attrs.fillColor;
    const originalHeights = d.labels().map(item => item.text);
    const overlays = shapes.slice(-3);
    d.click('raise_elevation');
    expect(d.labels().map(item => item.text)).toEqual(originalHeights);
    expect(d.el('result').textContent).toContain('当前操作：抬高地势');
    [1, 2, 3, 4, 3, 2, 1, 0].forEach((height, step) => {
      if (step === 4) d.click('lower_elevation');
      d.fire('click', ...d.center([0, 0]));
      expect(d.height([0, 0])).toBe(height);
      expect(label.attrs.pos).toEqual([originalPos[0], originalPos[1] - 16 * height]);
      expect(tile.attrs.pos).toEqual(label.attrs.pos);
      expect(marker.attrs.pos).toEqual(label.attrs.pos);
      expect(marker.text).toBe('起点');
      expect(tile.attrs.fillColor).toBeDefined();
      if (height > 0) expect(tile.attrs.fillColor).not.toBe(originalFill);
      d.container.bounds.top -= 30;
      d.fire('mousemove', ...d.center([0, 0]));
      expect(overlays[0].text).toContain(`gridX: 0 / gridY: 0 / elevation: ${height}`);
      expect(overlays[1].attrs.pos).toEqual(label.attrs.pos);
      expect(overlays[2].text).toBe(`0,0 h:${height}`);
      const heights = d.labels().map(item => Number(item.text.split(' h:')[1]));
      expect(heights).toEqual([...heights].sort((a, b) => a - b));
      expect(shapes.slice(-3)).toEqual(overlays);
      expect(demos[1 - index].height([0, 0])).toBe(0);
    });
    expect(tile.attrs.fillColor).toBe(originalFill);
    expect(d.labels().map(item => item.text)).toEqual(originalHeights);
    d.choose('roadblock', [0, 0]);
    expect(d.height([0, 0])).toBe(0);
    expect(marker.text).toContain('路障');
  });

  test('降低可超过预设最低值，空隙与网格外点击不修改地形', () => {
    const { demos } = createDemo();
    const d = demos[index];
    const grid = index === 0 ? [0, 19] : [0, 10];
    const initialHeight = d.height(grid);
    d.click('lower_elevation');
    for (let step = 1; step <= 4; step++) {
      const [x, y] = d.center(grid);
      d.fire('click', x, y + 10);
      expect(d.height(grid)).toBe(initialHeight - step);
      d.fire('mousemove', x, y + 26);
      expect(d.container.shapes.slice(-1)[0].text).toBe(`${grid} h:${initialHeight - step}`);
    }
    const snapshot = d.labels().map(label => label.text);
    d.fire('click', 5, 5);
    const [x, y] = d.center([1, 0]);
    d.fire('click', x, y + 16);
    expect(d.container.shapes.slice(-3)[0].text).toContain('未命中');
    expect(d.labels().map(label => label.text)).toEqual(snapshot);
  });

  test('编辑清除旧路径，寻路按新海拔筛选；恢复后重新连通', () => {
    const { demos } = createDemo();
    const d = demos[index];
    d.el('dirs').querySelectorAll().find(button => button.innerText === '→').onclick();
    d.choose('sta', [0, 0]); d.choose('end', [1, 0]);
    d.diff(0);
    expect(d.run()).toBeNull();
    d.click('raise_elevation');
    d.fire('click', ...d.center([0, 0]));
    expect(d.run()).not.toBeNull();
    expect(d.container.shapes.some(shape => /路\d/.test(shape.text || ''))).toBe(true);
    d.fire('click', ...d.center([0, 0]));
    expect(d.container.shapes.some(shape => /路\d/.test(shape.text || ''))).toBe(false);
    expect(d.el('result').textContent).toContain('海拔已改为 2');
    expect(d.run()).toBeNull();
    d.click('lower_elevation');
    d.fire('click', ...d.center([0, 0]));
    expect(d.run()).not.toBeNull();
  });

  test('编辑外部格子保留地形，原位置空隙不误命中，恢复零海拔后可回收', () => {
    const { demos } = createDemo();
    const d = demos[index];
    const count = d.container.shapes.length;
    const grid = [-1, 4];
    const flat = d.center(grid);
    d.outside(true);
    d.click('raise_elevation');
    d.fire('click', ...flat);
    expect(d.height(grid)).toBe(1);
    expect(d.container.shapes.slice(-3)[0].text).toContain('未命中');
    d.fire('click', ...flat);
    expect(d.height(grid)).toBe(1);
    d.container.events.mouseleave();
    d.click('clear_path');
    expect(d.height(grid)).toBe(1);
    d.fire('mousemove', ...d.center(grid));
    expect(d.container.shapes.slice(-1)[0].text).toBe(`${grid} h:1`);
    d.click('lower_elevation');
    d.fire('click', ...d.center(grid));
    d.container.events.mouseleave();
    d.click('clear_path');
    expect(d.label(grid)).toBeUndefined();
    expect(d.container.shapes).toHaveLength(count);
  });
});

test('真实 A* 超过循环上限提示搜索未完成，不误报不可达', () => {
  const { demos, alert } = createDemo((start, end, neighbors) => aStar(start, end, neighbors, 1));
  demos.forEach(d => {
    d.run();
    expect(alert).toHaveBeenLastCalledWith(expect.stringContaining('搜索未完成：已达到循环次数上限'));
    expect(d.el('result').textContent).toContain('当前操作：浏览\n搜索未完成：已达到循环次数上限');
  });
});
