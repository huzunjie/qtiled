/* global qtiled, qtiledView, qtiledPreview, spritejs, getPointerPosition, getElementSourceFiles */
(async () => {
  const nav = document.querySelector('.navs');
  if (nav) nav.classList.add('closed');
  const { loadElementSources, importElementDefinition, validateElementDefinition,
    applyElementEdit, exportElementDefinition, resolveElementDraw, renderElementPreview } = qtiledPreview;
  const get = id => document.getElementById(id);
  const angles = [0, 90, 180, 270];
  const rectIds = ['rect-x', 'rect-y', 'rect-width', 'rect-height'];
  const anchorIds = ['anchor-x', 'anchor-y'];
  const container = get('editor-canvas');
  const viewport = container.parentElement;
  const scene = new spritejs.Scene({ container, width: 680, height: 500, mode: 'static' });
  const gridLayer = scene.layer('grid', { handleEvent: false });
  const layer = scene.layer('element', { handleEvent: false });
  const overlayLayer = scene.layer('coordinates', { handleEvent: false });
  const view = { angle: 0, tileSize: [get('tile-width').valueAsNumber, get('tile-height').valueAsNumber], originPixel: [320, 260] };
  let definition;
  let sources = {};
  let sourceInfo = {};
  let busy = false;
  let inputIssue = null;
  let fileIssues = [];
  const camera = { scale: 1, offset: [0, 0] };
  let fitToCanvas = true;
  let currentDraw = null;
  let drag = null;
  let suppressClick = false;

  if (typeof applyElementEdit !== 'function' || typeof exportElementDefinition !== 'function') {
    get('status').textContent = '运行文件尚未更新：请在 QTiled 根目录运行 npm run debug，再刷新此页。';
    get('file-controls').disabled = true;
    return;
  }

  function toScreen(point) {
    return point.map((value, i) => value * camera.scale + camera.offset[i]);
  }

  function getWorldPosition(event) {
    return getPointerPosition(event, container).map((value, i) => (value - camera.offset[i]) / camera.scale);
  }

  // 四向共用最大包围范围，只改变编辑视图，不猜测素材底座或改写锚点。
  function fitCamera(gridRanges, vertexes, draws) {
    const positions = [[...view.originPixel]];
    const corners = gridRanges[0].flatMap(x => gridRanges[1].map(y => [x, y]));
    angles.forEach(angle => corners.forEach(grid => {
      const center = qtiledView.projectGrid(grid, { ...view, angle });
      vertexes.forEach(vertex => positions.push(vertex.map((value, i) => value + center[i])));
    }));
    draws.forEach(draw => {
      positions.push(draw.position, draw.position.map((value, i) => value + draw.rect[i + 2]));
    });
    const bounds = qtiled.shapes.polygon.getBounds(positions);
    const width = Math.min(680, viewport.clientWidth || 680);
    camera.scale = fitToCanvas ? Math.min(1, Math.max(1, width - 48) / Math.max(1, bounds.width), 452 / Math.max(1, bounds.height)) : 1;
    camera.offset = [width / 2 - (bounds.minX + bounds.maxX) / 2 * camera.scale,
      250 - (bounds.minY + bounds.maxY) / 2 * camera.scale];
  }

  function render({ fit = false } = {}) {
    gridLayer.removeAllChildren();
    overlayLayer.removeAllChildren();
    const vertexes = qtiled.shapes.rhombus.getVertexes(view.tileSize);
    const footprint = Array.isArray(definition?.footprint) && definition.footprint.every(cell =>
      Array.isArray(cell) && cell.length === 2 && cell.every(Number.isInteger)) ? definition.footprint : [];
    const footprintBounds = qtiled.shapes.polygon.getBounds(footprint);
    // 至少 9×9，超过基础范围的占地向外多留两格；非矩形与负偏移同样适用。
    const gridRanges = [
      [Math.min(-4, (footprintBounds?.minX ?? 0) - 2), Math.max(4, (footprintBounds?.maxX ?? 0) + 2)],
      [Math.min(-4, (footprintBounds?.minY ?? 0) - 2), Math.max(4, (footprintBounds?.maxY ?? 0) + 2)],
    ];
    const issues = [...fileIssues, ...(inputIssue ? [inputIssue] : []), ...validateElementDefinition(definition, sourceInfo)];
    get('issues').hidden = issues.length === 0;
    get('validation').hidden = issues.length === 0;
    get('issues').textContent = issues.map(issue => `${issue.path}: ${issue.message}`).join('\n');
    get('export').disabled = busy || issues.length > 0;
    const validAngles = angles.filter(angle => !issues.some(issue => issue.path === `views.${angle}` || issue.path.startsWith(`views.${angle}.`)));
    const summary = `${definition?.kind === 'tile' ? '地块' : '精灵'} · 占地 ${footprint.length} 格 · 当前 ${view.angle}° · 四向 ${validAngles.length}/4`;
    get('status').textContent = busy ? '正在载入…' : `${summary} · ${issues.length ? '草稿待完成，暂不可导出' : '配置校验通过，可以导出 JSON'}`;
    // 草稿允许只预览已配置的当前方向；正式导出仍校验完整四向。
    const invalidCommon = issues.some(issue => issue.path === '$' || issue.path === 'views' || issue.path.startsWith('footprint'));
    currentDraw = invalidCommon || !validAngles.includes(view.angle) ? null : resolveElementDraw(definition, [0, 0], view);
    if (fit) fitCamera(gridRanges, vertexes, invalidCommon ? [] : validAngles.map(angle => resolveElementDraw(definition, [0, 0], { ...view, angle })));
    get('view-scale').textContent = `${view.tileSize.join('×')} · ${Math.round(camera.scale * 100)}%`;
    get('view-scale').title = `逻辑单元格 ${view.tileSize.join('×')} 像素；当前显示约 ${view.tileSize.map(value => Math.round(value * camera.scale * 10) / 10).join('×')} 像素`;
    const points = vertexes.map(vertex => vertex.map(value => value * camera.scale));
    qtiled.shapes.polygon.twoDimForEach(...gridRanges, 'RightDown', (x, y) => {
      const pos = toScreen(qtiledView.projectGrid([x, y], view));
      gridLayer.append(new spritejs.Polyline({ pos, points, close: true, strokeColor: '#d4dce3', lineWidth: 1 }));
      overlayLayer.append(new spritejs.Label({
        text: `${x},${y}`, pos, anchor: [0.5, 0.5],
        fontSize: 10, fillColor: '#657584', bgcolor: 'rgba(255,255,255,0.8)', padding: 1,
      }));
    });
    const preview = renderElementPreview(layer, currentDraw, sources,
      { bounds: true, footprint: false, anchor: false });
    if (preview) preview.attr({ pos: camera.offset, scale: [camera.scale, camera.scale], transformOrigin: [0, 0], opacity: Number(get('image-opacity').value) / 100 });
    footprint.forEach(grid => overlayLayer.append(new spritejs.Polyline({
      pos: toScreen(qtiledView.projectGrid(grid, view)), points, close: true,
      strokeColor: '#ce871c', fillColor: 'rgba(255,190,55,0.12)', lineWidth: 2,
    })));
    for (const cross of [[[-6, 0], [6, 0]], [[0, -6], [0, 6]]]) {
      overlayLayer.append(new spritejs.Polyline({ pos: toScreen(view.originPixel), points: cross, strokeColor: '#cf3535', lineWidth: 2 }));
    }
    const size = sourceInfo[definition?.views[view.angle]?.source];
    get('source-size').textContent = size ? `原图 ${size.width} × ${size.height}` : '当前方向尚未绑定已加载图片';
  }

  function fillFields() {
    get('element-id').value = definition.id;
    get('kind').value = definition.kind;
    get('current-angle').textContent = `${view.angle}°`;
    const current = definition.views[view.angle];
    get('source').replaceChildren(new Option('请选择图片', ''), ...Object.keys(sources).map(path => new Option(path, path)));
    if (current.source && !Object.prototype.hasOwnProperty.call(sources, current.source)) {
      get('source').add(new Option(`未加载：${current.source}`, current.source));
    }
    get('source').value = current.source;
    rectIds.forEach((id, i) => { get(id).value = Number.isFinite(current.rect[i]) ? current.rect[i] : ''; });
    anchorIds.forEach((id, i) => { get(id).value = Number.isFinite(current.anchor[i]) ? current.anchor[i] : ''; });
    if (!inputIssue) get('footprint').value = JSON.stringify(definition.footprint);
  }

  function edit(field, value) {
    definition = applyElementEdit(definition, { field, value, angle: view.angle });
    render({ fit: field === 'footprint' });
  }

  // 文件加载期间关闭文件和编辑输入，避免较早的异步结果覆盖后来的操作。
  async function loadFiles(task) {
    if (busy) return;
    busy = true;
    get('file-controls').disabled = true;
    get('edit-fields').disabled = true;
    fileIssues = [];
    render();
    try {
      await task();
    } catch (error) {
      fileIssues = [{ path: '文件', message: error.message }];
    } finally {
      busy = false;
      get('file-controls').disabled = false;
      get('edit-fields').disabled = false;
      fillFields();
      render({ fit: true });
    }
  }

  function newDefinition() {
    const width = get('footprint-width').valueAsNumber;
    const height = get('footprint-height').valueAsNumber;
    if (![width, height].every(value => Number.isInteger(value) && value > 0)) {
      get('grid-status').textContent = '占地列和行必须为正整数。';
      return;
    }
    definition = {
      version: 1, id: 'new-element', kind: 'sprite',
      footprint: qtiled.shapes.polygon.twoDimForEach([0, width - 1], [0, height - 1], 'RightDown', (x, y) => [x, y]),
      views: Object.fromEntries(angles.map(angle => [angle, { source: '', rect: [0, 0, 1, 1], anchor: [0, 0] }])),
    };
    sources = {};
    sourceInfo = {};
    ['source-files', 'direction-file', 'definition-file'].forEach(id => { get(id).value = ''; });
    inputIssue = null;
    fileIssues = [];
    get('grid-action').value = 'origin';
    get('grid-status').textContent = '点击橙色占地中的格子设置原点，然后逐方向选择图片；当前方向配置好后即可预览。';
    fillFields();
    render({ fit: true });
  }

  async function loadSample() {
    await loadFiles(async () => {
      const assetDir = './static/element-samples/dog/';
      const files = Object.fromEntries([1, 2, 3, 4].map(number => {
        const path = `images/sculpture_dog0${number}.png`;
        return [path, `${assetDir}${path}`];
      }));
      const loaded = await loadElementSources(files);
      sources = loaded.sources;
      sourceInfo = loaded.sourceInfo;
      fileIssues = loaded.issues;
      if (fileIssues.length) return;
      const response = await fetch(`${assetDir}element.json`, { cache: 'no-store' });
      if (!response.ok) throw new Error(`样本加载失败（${response.status}）。`);
      const result = importElementDefinition(await response.text(), sourceInfo);
      if (result.issues.length) fileIssues = result.issues;
      else {
        definition = result.definition;
        inputIssue = null;
        get('definition-file').value = '';
        get('source-files').value = '';
        get('grid-action').value = 'inspect';
        get('footprint-width').value = 2;
        get('footprint-height').value = 2;
        get('grid-status').textContent = '网格显示相对原点的格子坐标；通过“网格操作”选择查看、增删占地或点选原点。';
      }
    });
  }

  get('element-id').addEventListener('input', event => { definition = { ...definition, id: event.target.value }; render(); });
  get('kind').addEventListener('change', event => { definition = { ...definition, kind: event.target.value }; render(); });
  get('source').addEventListener('change', event => {
    const firstBinding = !definition.views[view.angle].source;
    fileIssues = [];
    definition = applyElementEdit(definition, { field: 'source', angle: view.angle, value: event.target.value });
    const size = sourceInfo[event.target.value];
    if (firstBinding && size) definition = applyElementEdit(definition, { field: 'rect', angle: view.angle, value: [0, 0, size.width, size.height] });
    fillFields();
    render({ fit: true });
  });
  get('direction-file').addEventListener('change', event => {
    const file = event.target.files[0];
    if (!file) return;
    const angle = view.angle;
    loadFiles(async () => {
      // 相对文件名不可同时指向不同图片；复用已载入图片时使用下拉框。
      if (Object.prototype.hasOwnProperty.call(sources, file.name)) {
        throw new Error(`已存在同名图片 ${file.name}，请从下拉框选择；不同图片请先使用不同文件名。`);
      }
      const loaded = await loadElementSources({ [file.name]: file });
      if (loaded.issues.length) { fileIssues = loaded.issues; return; }
      sources = { ...sources, ...loaded.sources };
      sourceInfo = { ...sourceInfo, ...loaded.sourceInfo };
      const size = sourceInfo[file.name];
      definition = applyElementEdit(definition, { field: 'source', angle, value: file.name });
      definition = applyElementEdit(definition, { field: 'rect', angle, value: [0, 0, size.width, size.height] });
    }).finally(() => { event.target.value = ''; });
  });
  for (const [field, ids] of [['rect', rectIds], ['anchor', anchorIds]]) {
    ids.forEach(id => get(id).addEventListener('input', () => edit(field, ids.map(name => get(name).valueAsNumber))));
  }
  get('full-image').addEventListener('click', () => {
    const size = sourceInfo[definition.views[view.angle].source];
    if (!size) return;
    edit('rect', [0, 0, size.width, size.height]);
    fillFields();
    render({ fit: true });
  });
  get('footprint').addEventListener('input', event => {
    try {
      const value = JSON.parse(event.target.value);
      inputIssue = null;
      edit('footprint', value);
    } catch (error) {
      inputIssue = { path: 'footprint', message: '请输入占地偏移的 JSON 数组。' };
      render();
    }
  });
  container.addEventListener('pointerdown', event => {
    suppressClick = false;
    if (busy || event.button !== 0 || !currentDraw) return;
    const point = getWorldPosition(event);
    if (!point.every((value, i) => value >= currentDraw.position[i] && value <= currentDraw.position[i] + currentDraw.rect[i + 2])) return;
    drag = {
      pointerId: event.pointerId, angle: view.angle,
      start: getPointerPosition(event, container), scale: camera.scale,
      anchor: [...definition.views[view.angle].anchor], moved: false,
    };
    container.setPointerCapture(event.pointerId);
  });
  container.addEventListener('pointermove', event => {
    if (!drag || drag.pointerId !== event.pointerId) return;
    const delta = getPointerPosition(event, container).map((value, i) => value - drag.start[i]);
    // 保留单击网格的含义；超过少量屏幕像素后才视为拖动。
    if (!drag.moved && Math.hypot(...delta) < 3) return;
    drag.moved = true;
    container.classList.add('dragging');
    event.preventDefault();
    const anchor = drag.anchor.map((value, i) => Math.round((value - delta[i] / drag.scale) * 1000) / 1000);
    definition = applyElementEdit(definition, { field: 'anchor', angle: drag.angle, value: anchor });
    anchorIds.forEach((id, i) => { get(id).value = anchor[i]; });
    render();
    get('grid-status').textContent = `已调整 ${drag.angle}° 像素锚点 [${anchor}]；其他方向不变。`;
  });
  function finishDrag(event, cancelled = false) {
    if (!drag || drag.pointerId !== event.pointerId) return;
    const previous = drag;
    drag = null;
    suppressClick = previous.moved && !cancelled;
    container.classList.remove('dragging');
    if (cancelled && previous.moved) {
      definition = applyElementEdit(definition, { field: 'anchor', angle: previous.angle, value: previous.anchor });
      fillFields();
      render();
      get('grid-status').textContent = '拖拽已取消，锚点已恢复。';
    }
    if (container.hasPointerCapture(event.pointerId)) container.releasePointerCapture(event.pointerId);
  }
  container.addEventListener('pointerup', event => finishDrag(event));
  container.addEventListener('pointercancel', event => finishDrag(event, true));
  container.addEventListener('lostpointercapture', event => finishDrag(event, true));
  container.addEventListener('click', event => {
    if (suppressClick) { suppressClick = false; return; }
    if (busy) return;
    if (inputIssue || !Array.isArray(definition.footprint) || !definition.footprint.every(cell =>
      Array.isArray(cell) && cell.length === 2 && cell.every(Number.isInteger))) return;
    const grid = qtiledView.pickGrid(getWorldPosition(event), view);
    const found = definition.footprint.some(cell => cell[0] === grid[0] && cell[1] === grid[1]);
    const action = get('grid-action').value;
    if (action === 'inspect') { get('grid-status').textContent = `所选格子 [${grid}]${found ? ' · 已占用' : ' · 未占用'}`; return; }
    if (action === 'origin') {
      if (!found) { get('grid-status').textContent = '请选择橙色占地内的格子作为原点。'; return; }
      definition = applyElementEdit(definition, { field: 'footprint', value: definition.footprint.map(cell => [cell[0] - grid[0], cell[1] - grid[1]]) });
      // 固定原点重新标定，四向都按各自投影换算，不能只移动当前图片。
      angles.forEach(angle => {
        const delta = qtiledView.projectGrid(grid, { angle, tileSize: view.tileSize });
        const anchor = definition.views[angle].anchor.map((value, i) => value + delta[i]);
        definition = applyElementEdit(definition, { field: 'anchor', angle, value: anchor });
      });
      get('grid-status').textContent = `原格子 [${grid}] 已设为 [0,0]；四向锚点与占地偏移已同步换算。`;
      fillFields();
      render({ fit: true });
      return;
    }
    const footprint = found ? definition.footprint.filter(cell => cell[0] !== grid[0] || cell[1] !== grid[1]) : [...definition.footprint, grid];
    edit('footprint', footprint);
    get('footprint').value = JSON.stringify(footprint);
    get('grid-status').textContent = `${found ? '移除' : '添加'}占用格子 [${grid}]`;
  });
  container.addEventListener('mousemove', event => {
    if (busy) return;
    const grid = qtiledView.pickGrid(getWorldPosition(event), view);
    container.title = `格子 [${grid}] · 拖拽图片调整锚点`;
  });
  ['footprint-width', 'footprint-height'].forEach(id => get(id).addEventListener('input', () => {
    if (!definition || busy) return;
    const width = get('footprint-width').valueAsNumber;
    const height = get('footprint-height').valueAsNumber;
    if (![width, height].every(value => Number.isInteger(value) && value > 0)) {
      get('grid-status').textContent = '占地列和行必须为正整数。';
      return;
    }
    const cells = Array.isArray(definition.footprint) ? definition.footprint.filter(cell =>
      Array.isArray(cell) && cell.length === 2 && cell.every(Number.isInteger)) : [];
    const minX = cells.length ? Math.min(...cells.map(cell => cell[0])) : 0;
    const minY = cells.length ? Math.min(...cells.map(cell => cell[1])) : 0;
    inputIssue = null;
    edit('footprint', qtiled.shapes.polygon.twoDimForEach([minX, minX + width - 1], [minY, minY + height - 1], 'RightDown', (x, y) => [x, y]));
    get('footprint').value = JSON.stringify(definition.footprint);
    get('grid-status').textContent = `已重建 ${width} × ${height} 占地；可点选格子调整原点。`;
  }));
  document.querySelectorAll('[data-angle]').forEach(button => button.addEventListener('click', () => {
    if (busy) return;
    view.angle = Number(button.dataset.angle);
    document.querySelectorAll('[data-angle]').forEach(item => item.setAttribute('aria-pressed', String(Number(item.dataset.angle) === view.angle)));
    fillFields();
    render({ fit: true });
  }));
  ['tile-width', 'tile-height'].forEach(id => get(id).addEventListener('change', () => {
    const size = [get('tile-width').valueAsNumber, get('tile-height').valueAsNumber];
    if (size.every(value => Number.isFinite(value) && value > 0)) view.tileSize = size;
    else [get('tile-width').value, get('tile-height').value] = view.tileSize;
    render({ fit: true });
  }));
  get('fit-canvas').addEventListener('click', () => { fitToCanvas = true; render({ fit: true }); });
  get('actual-size').addEventListener('click', () => { fitToCanvas = false; render({ fit: true }); });
  get('image-opacity').addEventListener('input', event => {
    get('opacity-value').textContent = `${event.target.value}%`;
    render();
  });
  // 侧栏仍在右侧，按当前真正可见的宽度适配，缩放后的鼠标仍回到同一逻辑坐标。
  if (typeof ResizeObserver !== 'undefined') new ResizeObserver(() => {
    if (definition && !drag && fitToCanvas) render({ fit: true });
  }).observe(viewport);
  get('source-files').addEventListener('change', event => {
    const files = getElementSourceFiles(event.target.files);
    loadFiles(async () => {
      const result = await loadElementSources(files);
      sources = result.sources;
      sourceInfo = result.sourceInfo;
      fileIssues = result.issues;
    });
  });
  get('definition-file').addEventListener('change', event => {
    const file = event.target.files[0];
    if (!file) return;
    loadFiles(async () => {
      const result = importElementDefinition(await file.text(), sourceInfo);
      if (result.issues.length) fileIssues = result.issues;
      else { definition = result.definition; inputIssue = null; }
    });
  });
  get('sample').addEventListener('click', loadSample);
  get('new').addEventListener('click', newDefinition);
  get('export').addEventListener('click', () => {
    if (busy || inputIssue || fileIssues.length) return;
    const result = exportElementDefinition(definition, sourceInfo);
    if (result.issues.length) { render(); return; }
    const url = URL.createObjectURL(new Blob([result.json], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'element.json';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    get('status').textContent = 'JSON 已生成 · 请在独立预览中重新选择该文件';
  });
  newDefinition();
  await loadSample();
})();
