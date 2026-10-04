import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { JSDOM } from 'jsdom';
import { shapes } from '../src';
import * as elements from '../src/elements';
import * as view from '../src/isometric-view';
import { resolveElementDraw } from '../src/element-preview/draw';
import { resolveElementPlacement } from '../src/element-preview/placement';

// 执行两页真实事件脚本；DOM、图片加载、下载与 SpriteJS 使用替身，不冒充浏览器验收。
async function loadPage(name, overrides = {}) {
  const read = file => fs.readFileSync(path.join(__dirname, '../demo', file), 'utf8');
  const html = read(name);
  const { window } = new JSDOM(html);
  const document = window.document;
  const errors = [];
  window.addEventListener('error', event => { errors.push(event.error); event.preventDefault(); });
  const layers = [];
  class Shape { constructor(attrs) { this.attrs = attrs; } }
  class Scene {
    layer() {
      const layer = { children: [], append(node) { this.children.push(node); }, removeAllChildren() { this.children = []; } };
      layers.push(layer);
      return layer;
    }
  }
  let download;
  window.HTMLDialogElement.prototype.showModal = function() { this.open = true; };
  window.HTMLDialogElement.prototype.close = function() { this.open = false; this.dispatchEvent(new window.Event('close')); };
  window.HTMLAnchorElement.prototype.click = jest.fn();
  const preview = { attrs: {}, attr(attrs) { this.attrs = attrs; } };
  const render = jest.fn((layer, draw) => draw ? preview : null);
  window.HTMLElement.prototype.setPointerCapture = jest.fn();
  window.HTMLElement.prototype.hasPointerCapture = () => false;
  const context = vm.createContext({
    window, document, Option: window.Option, qtiled: { shapes }, qtiledView: view,
    spritejs: { Scene, Polyline: Shape, Label: Shape },
    qtiledPreview: {
      ...elements, resolveElementDraw, resolveElementPlacement, renderElementPreview: render,
      loadElementSources: async files => {
        const sources = {};
        const sourceInfo = {};
        Object.keys(files).forEach(key => {
          sources[key] = { name: key };
          if (files[key].width) sourceInfo[key] = { width: files[key].width, height: files[key].height };
          else {
            const png = fs.readFileSync(path.join(__dirname, '../demo/static/element-samples/dog/images', path.basename(key)));
            sourceInfo[key] = { width: png.readUInt32BE(16), height: png.readUInt32BE(20) };
          }
        });
        return { sources, sourceInfo, issues: [] };
      },
      ...overrides,
    },
    fetch: async url => ({ ok: true, text: async () => read(url) }),
    Blob: class { constructor(parts) { this.text = parts.join(''); } },
    URL: { createObjectURL: blob => { download = blob.text; return 'blob:test'; }, revokeObjectURL() {} },
    setTimeout: callback => callback(),
  });
  for (const [, attrs, script] of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)) {
    const helper = attrs.match(/static\/js\/(pointer|element-files|element-snap|element-editor)\.js/);
    if (helper) await vm.runInContext(read(`static/js/${helper[1]}.js`), context);
    else if (!attrs.includes('src=')) await vm.runInContext(script, context);
  }
  const get = id => document.getElementById(id);
  const change = (id, value, event = 'input') => {
    get(id).value = value;
    get(id).dispatchEvent(new window.Event(event, { bubbles: true }));
  };
  const files = async (id, values) => {
    Object.defineProperty(get(id), 'files', { configurable: true, value: values });
    get(id).dispatchEvent(new window.Event('change', { bubbles: true }));
    await new Promise(resolve => setImmediate(resolve));
  };
  const angle = value => document.querySelector(`[data-angle="${value}"]`).click();
  const objectAngle = value => document.querySelector(`[data-object-angle="${value}"]`).click();
  const draw = () => render.mock.calls[render.mock.calls.length - 1][1];
  const clickCell = cell => {
    const [clientX, clientY] = layers[2].children.find(node => node.attrs.text === cell.join(',')).attrs.pos;
    get('editor-canvas').dispatchEvent(new window.MouseEvent('click', { clientX, clientY }));
  };
  return { window, get, change, files, angle, objectAngle, draw, clickCell, preview, errors, layers, download: () => download };
}

const imageFiles = [1, 2, 3, 4].map(i => ({ name: `sculpture_dog0${i}.png`, type: 'image/png' }));

test('新建矩形自动确定放置基准，逐向选图、导出后独立页面回读一致', async () => {
  const editor = await loadPage('element-editor.html');
  editor.change('footprint-width', '3');
  editor.get('new').click();
  expect(Array.from(editor.get('source').options, option => option.value)).toEqual(['']);
  const newFootprint = JSON.parse(editor.get('footprint').value);
  expect(newFootprint).toHaveLength(6);
  expect(editor.layers[2].children.some(node => node.attrs.text === '-1,0')).toBe(true);
  expect(editor.draw()).toBeNull();
  expect(Array.from(editor.get('grid-action').options, option => option.value)).toEqual(['inspect', 'footprint']);
  expect(editor.layers[2].children.some(node => node.attrs.strokeColor === '#cf3535')).toBe(false);
  expect(editor.get('placement-status').textContent).toContain('[2,0]');
  // 默认只查看坐标，点击占地不会重新编号或修改图片锚点。
  editor.clickCell([1, 0]);
  expect(editor.get('grid-status').textContent).toContain('所选格子 [1,0]');
  expect(JSON.parse(editor.get('footprint').value)).toEqual(newFootprint);
  for (const [i, angle] of [0, 90, 180, 270].entries()) {
    editor.angle(angle);
    await editor.files('direction-file', [imageFiles[i]]);
    expect(editor.draw().source).toBe(imageFiles[i].name);
    expect(editor.get('export').disabled).toBe(i < 3);
  }
  // 定义不保存编辑时的世界位置；两页从同一导入初态、同一镜头和转向顺序比较。
  editor.get('export').click();
  const initialJson = editor.get('export-json').value;
  editor.get('close-export').click();
  await editor.files('definition-file', [{ text: async () => initialJson }]);
  editor.angle(0);
  const expected = {};
  const footprint = editor.get('footprint').value;
  for (const objectAngle of [0, 90, 180, 270]) {
    editor.objectAngle(objectAngle);
    for (const angle of [0, 90, 180, 270]) {
      editor.angle(angle);
      expected[`${angle}/${objectAngle}`] = editor.draw();
      expect(editor.get('image-angle').textContent).toContain(`${editor.draw().imageAngle}°`);
      expect(editor.get('footprint').value).toBe(footprint);
    }
  }
  editor.get('export').click();
  expect(editor.download()).toBeUndefined();
  expect(editor.get('export-dialog').open).toBe(true);
  const shownJson = editor.get('export-json').value;
  editor.get('close-export').click();
  expect(editor.download()).toBeUndefined();
  editor.get('export').click();
  editor.get('download-json').click();
  const json = editor.download();
  expect(json).toBe(shownJson);
  expect(JSON.parse(json).footprint).toHaveLength(6);
  expect(JSON.parse(json).objectAngle).toBeUndefined();
  expect(JSON.parse(json).angle).toBeUndefined();
  // 新建既清除样本，也清除上一份自选素材；同名图片可以重新载入。
  editor.get('new').click();
  expect(Array.from(editor.get('source').options, option => option.value)).toEqual(['']);
  expect(editor.draw()).toBeNull();
  expect(editor.get('export').disabled).toBe(true);
  await editor.files('direction-file', [imageFiles[0]]);
  expect(editor.draw().source).toBe(imageFiles[0].name);
  expect(editor.errors).toEqual([]);
  editor.window.close();

  const preview = await loadPage('element-preview.html');
  await preview.files('image-files', imageFiles);
  await preview.files('definition-file', [{ name: 'edited.json', text: async () => json }]);
  for (const objectAngle of [0, 90, 180, 270]) {
    preview.objectAngle(objectAngle);
    for (const angle of [0, 90, 180, 270]) {
      preview.angle(angle);
      expect(preview.draw()).toEqual(expected[`${angle}/${objectAngle}`]);
    }
  }
  expect(preview.errors).toEqual([]);
  preview.window.close();
});

test('真实控件事件更新绑定与类别，非法裁切禁用导出，空占地可重新点击添加', async () => {
  const editor = await loadPage('element-editor.html');
  editor.change('kind', 'tile', 'change');
  editor.change('source', 'images/sculpture_dog02.png', 'change');
  expect(editor.get('status').textContent).toContain('地块');
  expect(editor.draw().source).toBe('images/sculpture_dog02.png');
  editor.change('rect-width', '999');
  expect(editor.get('export').disabled).toBe(true);
  expect(editor.get('issues').textContent).toContain('views.0.rect');
  expect(editor.draw()).toBeNull();
  editor.change('rect-width', '158');
  editor.change('footprint', '[]');
  expect(editor.get('export').disabled).toBe(true);
  editor.change('grid-action', 'footprint', 'change');
  editor.clickCell([0, 0]);
  expect(editor.get('export').disabled).toBe(false);
  expect(JSON.parse(editor.get('footprint').value)).toEqual([[0, 0]]);
  editor.get('new').click();
  await editor.files('source-files', imageFiles.map(file => ({ ...file, webkitRelativePath: `dog/images/${file.name}` })));
  editor.change('source', 'images/sculpture_dog01.png', 'change');
  expect(editor.draw().rect).toEqual([0, 0, 158, 110]);
  expect(editor.get('export').disabled).toBe(true);
  expect(editor.errors).toEqual([]);
  editor.window.close();
});

test('旧运行包缺编辑函数时明确提示构建，不留下可操作的假界面', async () => {
  const editor = await loadPage('element-editor.html', { applyElementEdit: undefined });
  expect(editor.get('status').textContent).toContain('npm run debug');
  expect(editor.get('file-controls').disabled).toBe(true);
  expect(editor.get('export').disabled).toBe(true);
  editor.window.close();
});

test('不同规格素材、非方形占地四向适配，缩放拖拽只改当前锚点，透明度不进入导出', async () => {
  // 尺寸来自实际 mylong 素材；测试不依赖仓库外的文件。
  const dimensions = [[78, 40], [78, 149], [598, 391], [636, 687]];
  const editor = await loadPage('element-editor.html');
  editor.get('new').click();
  editor.get('edge-snap').checked = false;
  editor.change('footprint-width', '8');
  editor.change('footprint-height', '5');
  const originalFootprint = editor.get('footprint').value;
  for (const [i, angle] of [0, 90, 180, 270].entries()) {
    editor.angle(angle);
    await editor.files('direction-file', [{ name: `material-${i}.png`, type: 'image/png', width: dimensions[i][0], height: dimensions[i][1] }]);
    editor.change('anchor-x', String(dimensions[i][0] / 2));
    editor.change('anchor-y', String(dimensions[i][1] / 2));
    editor.get('fit-canvas').click();
    const draw = editor.draw();
    const { scale: [s], pos: offset } = editor.preview.attrs;
    const topLeft = draw.position.map((v, j) => v * s + offset[j]);
    const bottomRight = draw.position.map((v, j) => (v + draw.rect[j + 2]) * s + offset[j]);
    expect(topLeft[0]).toBeGreaterThanOrEqual(23);
    expect(topLeft[1]).toBeGreaterThanOrEqual(23);
    expect(bottomRight[0]).toBeLessThanOrEqual(657);
    expect(bottomRight[1]).toBeLessThanOrEqual(477);
    editor.change('grid-action', 'inspect', 'change');
    editor.clickCell([7, 4]);
    expect(editor.get('grid-status').textContent).toContain('[7,4]');
    const positions = editor.layers[0].children.flatMap(node => node.attrs.points.map(point => point.map((v, j) => v + node.attrs.pos[j])));
    expect(positions.every(([x, y]) => x >= 23 && x <= 657 && y >= 23 && y <= 477)).toBe(true);
  }
  const otherAnchor = editor.draw().anchor.slice();
  editor.angle(0);
  const before = editor.draw().anchor.slice();
  const { scale: [scale], pos } = editor.preview.attrs;
  const start = editor.draw().position.map((v, i) => (v + 30) * scale + pos[i]);
  const pointer = (type, point) => {
    const event = new editor.window.MouseEvent(type, { clientX: point[0], clientY: point[1], button: 0 });
    Object.defineProperty(event, 'pointerId', { value: 1 });
    editor.get('editor-canvas').dispatchEvent(event);
  };
  pointer('pointerdown', start);
  pointer('pointermove', [start[0] + 24, start[1] + 16]);
  pointer('pointerup', [start[0] + 24, start[1] + 16]);
  editor.clickCell([0, 0]);
  expect(editor.get('footprint').value).toBe(originalFootprint);
  const dragged = editor.draw().anchor;
  expect(dragged[0]).toBeCloseTo(before[0] - 24 / scale, 2);
  expect(dragged[1]).toBeCloseTo(before[1] - 16 / scale, 2);
  const cancelStart = editor.draw().position.map((v, i) => (v + 10) * scale + pos[i]);
  pointer('pointerdown', cancelStart);
  pointer('pointermove', [cancelStart[0] + 10, cancelStart[1] + 10]);
  pointer('pointercancel', cancelStart);
  expect(editor.draw().anchor).toEqual(dragged);
  expect(editor.get('grid-status').textContent).toContain('拖拽已取消');
  editor.get('export').click();
  editor.get('download-json').click();
  const json = editor.download();
  editor.change('image-opacity', '35');
  expect(editor.preview.attrs.opacity).toBe(0.35);
  editor.get('export').click();
  editor.get('download-json').click();
  expect(editor.download()).toBe(json);
  editor.angle(270);
  expect(editor.draw().anchor).toEqual(otherAnchor);
  expect(editor.errors).toEqual([]);
  editor.window.close();
});

test('导入后行列同步，非法输入不导出旧数据，文件失败可恢复，100% 不截断四向网格', async () => {
  const editor = await loadPage('element-editor.html');
  const definition = JSON.parse(fs.readFileSync(path.join(__dirname, '../demo/static/element-samples/dog/element.json'), 'utf8'));
  definition.footprint = shapes.polygon.twoDimForEach([0, 7], [0, 4], 'RightDown', (x, y) => [x, y]);
  await editor.files('definition-file', [{ text: async () => JSON.stringify(definition) }]);
  expect(editor.get('footprint-width').value).toBe('8');
  expect(editor.get('footprint-height').value).toBe('5');
  editor.change('footprint-width', '9');
  expect(JSON.parse(editor.get('footprint').value)).toHaveLength(45);
  editor.change('footprint-width', '');
  expect(editor.get('export').disabled).toBe(true);
  editor.change('footprint-width', '21');
  editor.change('footprint-height', '2');
  await editor.files('definition-file', [{ text: async () => '{broken' }]);
  expect(editor.get('export').disabled).toBe(true);
  editor.get('dismiss-file-issues').click();
  expect(editor.get('export').disabled).toBe(false);
  editor.get('actual-size').click();
  for (const angle of [0, 90, 180, 270]) {
    editor.angle(angle);
    const width = parseFloat(editor.get('editor-canvas').style.width);
    const height = parseFloat(editor.get('editor-canvas').style.height);
    expect(width).toBeGreaterThan(680);
    expect(editor.preview.attrs.scale).toEqual([1, 1]);
    const positions = editor.layers[0].children.flatMap(node => node.attrs.points.map(point => point.map((v, j) => v + node.attrs.pos[j])));
    expect(positions.every(([x, y]) => x >= 23 && y >= 23 && x <= width - 23 && y <= height - 23)).toBe(true);
    const canvas = editor.get('editor-canvas');
    canvas.getBoundingClientRect = () => ({ left: -400, top: -150 });
    const pos = editor.layers[2].children.find(node => node.attrs.text === '20,1').attrs.pos;
    editor.change('grid-action', 'inspect', 'change');
    canvas.dispatchEvent(new editor.window.MouseEvent('click', { clientX: pos[0] - 400, clientY: pos[1] - 150 }));
    expect(editor.get('grid-status').textContent).toContain('[20,1]');
  }
  editor.change('footprint', '[[0,0],[1,0],[0,1]]');
  expect(editor.get('footprint-shape').textContent).toContain('自定义');
  expect(editor.get('footprint-width').value).toBe('2');
  expect(editor.errors).toEqual([]);
  editor.window.close();
});

test('独立预览在四向完整容纳大图与非方形占地，保留原始锚点', async () => {
  const preview = await loadPage('element-preview.html');
  await preview.files('image-files', [{ name: 'pagoda.png', type: 'image/png', width: 636, height: 687 }]);
  const definition = { version: 1, id: 'pagoda-check', kind: 'sprite',
    footprint: shapes.polygon.twoDimForEach([-2, 5], [-1, 3], 'RightDown', (x, y) => [x, y]),
    views: Object.fromEntries([0, 90, 180, 270].map(angle => [angle, { source: 'pagoda.png', rect: [0, 0, 636, 687], anchor: [318, 650] }])),
  };
  await preview.files('definition-file', [{ name: 'pagoda.json', text: async () => JSON.stringify(definition) }]);
  for (const [angle, objectAngle] of [0, 90, 180, 270].flatMap(angle => [0, 90, 180, 270].map(objectAngle => [angle, objectAngle]))) {
    preview.angle(angle);
    preview.objectAngle(objectAngle);
    const draw = preview.draw();
    const { scale: [s], pos } = preview.preview.attrs;
    const positions = [draw.position, draw.position.map((v, i) => v + draw.rect[i + 2]), ...draw.footprint.map(cell => cell.position)];
    expect(positions.every(([x, y]) => x * s + pos[0] >= 23 && x * s + pos[0] <= 657 && y * s + pos[1] >= 23 && y * s + pos[1] <= 417)).toBe(true);
    expect(draw.anchor).toEqual([318, 650]);
  }
  expect(preview.errors).toEqual([]);
  preview.window.close();
});

test('对象转向后的占地增删换回基准偏移，查看坐标不改变姿态和四槽锚点', async () => {
  const editor = await loadPage('element-editor.html');
  editor.change('footprint', '[[0,0],[1,0],[2,0],[0,1],[1,1],[2,1]]');
  const before = {};
  for (const angle of [0, 90, 180, 270]) { editor.angle(angle); before[angle] = editor.draw().anchor; }
  editor.angle(90);
  editor.objectAngle(90);
  const placed = editor.draw();
  editor.change('grid-action', 'footprint', 'change');
  editor.clickCell([0, 2]);
  expect(JSON.parse(editor.get('footprint').value)).not.toContainEqual([2, 1]);
  expect(editor.window.document.querySelector('[data-object-angle="180"]').disabled).toBe(true);
  editor.clickCell([0, 2]);
  expect(JSON.parse(editor.get('footprint').value)).toContainEqual([2, 1]);
  editor.change('grid-action', 'inspect', 'change');
  editor.clickCell([0, 2]);
  expect(editor.get('grid-status').textContent).toContain('基准偏移 [2,1]');
  expect(JSON.parse(editor.get('footprint').value)).toEqual([[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1]]);
  expect(editor.draw()).toEqual(placed);
  editor.objectAngle(0);
  [0, 90, 180, 270].forEach(angle => {
    editor.angle(angle);
    expect(editor.draw().anchor).toEqual(before[angle]);
  });
  expect(editor.errors).toEqual([]);
  editor.window.close();
});

test('组合素材槽接收字段、图片绑定与拖拽，取消恢复该槽且不影响其他方向', async () => {
  const editor = await loadPage('element-editor.html');
  editor.get('export').click();
  const original = JSON.parse(editor.get('export-json').value);
  editor.get('close-export').click();
  editor.angle(90);
  editor.objectAngle(90);
  expect(editor.get('source').value).toBe(original.views[180].source);
  editor.change('anchor-x', '80.25');
  editor.change('rect-width', '150');
  editor.get('full-image').click();
  await editor.files('direction-file', [{ name: 'replacement.png', type: 'image/png', width: 160, height: 120 }]);
  expect(editor.draw()).toMatchObject({ angle: 90, objectAngle: 90, imageAngle: 180, source: 'replacement.png', rect: [0, 0, 160, 120] });
  editor.get('edge-snap').checked = false;
  const before = editor.draw().anchor.slice();
  const { scale: [scale], pos } = editor.preview.attrs;
  const start = editor.draw().position.map((value, i) => (value + 30) * scale + pos[i]);
  const pointer = (type, point) => {
    const event = new editor.window.MouseEvent(type, { clientX: point[0], clientY: point[1], button: 0 });
    Object.defineProperty(event, 'pointerId', { value: 1 });
    editor.get('editor-canvas').dispatchEvent(event);
  };
  pointer('pointerdown', start);
  pointer('pointermove', [start[0] + 12, start[1] + 8]);
  expect(editor.draw().anchor[0]).toBeCloseTo(before[0] - 12 / scale, 2);
  editor.objectAngle(180);
  expect(editor.draw().objectAngle).toBe(90);
  pointer('pointercancel', start);
  expect(editor.draw().anchor).toEqual(before);
  pointer('pointerdown', start);
  pointer('pointermove', [start[0] + 12, start[1] + 8]);
  pointer('pointerup', start);
  editor.get('export').click();
  const exported = JSON.parse(editor.get('export-json').value);
  expect(exported.views[180].anchor).toEqual(editor.draw().anchor);
  for (const angle of [0, 90, 270]) expect(exported.views[angle]).toEqual(original.views[angle]);
  expect(exported.footprint).toEqual(original.footprint);
  expect(editor.errors).toEqual([]);
  editor.window.close();
});

test.each(['element-editor.html', 'element-preview.html'])('%s 的矩形转向固定上角，镜头切换保留世界占地', async name => {
  const page = await loadPage(name);
  const initial = page.draw();
  const cells = draw => draw.footprint.map(cell => cell.grid.join(',')).sort();
  for (const angle of [90, 180, 270, 0]) {
    page.objectAngle(angle);
    expect(cells(page.draw())).toEqual(cells(initial));
    expect(page.draw().placementGrid).toEqual(initial.placementGrid);
  }
  if (name === 'element-editor.html') page.change('footprint-width', '3');
  else {
    const definition = JSON.parse(fs.readFileSync(path.join(__dirname, '../demo/static/element-samples/dog/element.json'), 'utf8'));
    definition.footprint.push([2, 0], [2, 1]);
    await page.files('definition-file', [{ name: 'rectangle.json', text: async () => JSON.stringify(definition) }]);
  }
  for (const angle of [0, 90, 180, 270]) {
    const previous = page.draw();
    page.angle(angle);
    expect(cells(page.draw())).toEqual(cells(previous));
    const base = page.draw().placementGrid;
    for (const objectAngle of [90, 180, 270, 0]) {
      page.objectAngle(objectAngle);
      expect(page.draw().placementGrid).toEqual(base);
      const bounds = shapes.polygon.getBounds(page.draw().footprint.map(cell => cell.grid));
      expect([bounds.width + 1, bounds.height + 1]).toEqual(objectAngle % 180 === 0 ? [3, 2] : [2, 3]);
    }
  }
  expect(page.errors).toEqual([]);
  page.window.close();
});

test.each(['element-editor.html', 'element-preview.html'])('%s 缺少放置函数时显示运行包提示', async name => {
  const page = await loadPage(name, { resolveElementPlacement: undefined });
  expect(page.get('status').textContent).toContain('运行文件尚未更新');
  expect(page.get(name === 'element-editor.html' ? 'file-controls' : 'definition-file').disabled).toBe(true);
  expect(page.errors).toEqual([]);
  page.window.close();
});

test('不完整草稿按组合素材槽预览，不把镜头角度当作已配置方向', async () => {
  const editor = await loadPage('element-editor.html');
  editor.get('new').click();
  editor.objectAngle(90);
  await editor.files('direction-file', [imageFiles[0]]);
  expect(editor.draw().imageAngle).toBe(90);
  editor.angle(90);
  expect(editor.draw()).toBeNull();
  editor.objectAngle(0);
  expect(editor.draw().source).toBe(imageFiles[0].name);
  expect(editor.get('export').disabled).toBe(true);
  expect(editor.errors).toEqual([]);
  editor.window.close();
});

test.each(['element-editor.html', 'element-preview.html'])('%s 的 R 只在画布内转对象，输入、重复与组合按键不触发', async name => {
  const page = await loadPage(name);
  const canvas = page.get(name === 'element-editor.html' ? 'editor-canvas' : 'element-canvas');
  const press = options => page.window.document.dispatchEvent(new page.window.KeyboardEvent('keydown', { key: 'r', bubbles: true, ...options }));
  press();
  expect(page.draw().objectAngle).toBe(0);
  canvas.dispatchEvent(new page.window.Event('pointerenter'));
  page.get('tile-width').focus();
  press();
  expect(page.draw().objectAngle).toBe(0);
  page.get('tile-width').blur();
  for (const options of [{ repeat: true }, { ctrlKey: true }, { shiftKey: true }, { altKey: true }, { metaKey: true }]) press(options);
  expect(page.draw().objectAngle).toBe(0);
  press();
  expect(page.draw()).toMatchObject({ angle: 0, objectAngle: 90, imageAngle: 90 });
  expect(page.window.document.querySelector('[data-object-angle="90"]').getAttribute('aria-pressed')).toBe('true');
  canvas.dispatchEvent(new page.window.Event('pointerleave'));
  press();
  expect(page.draw().objectAngle).toBe(90);
  expect(page.errors).toEqual([]);
  page.window.close();
});
