/* global qtiled, qtiledView, qtiledElementRendering, spritejs, getPointerPosition, getElementSourceFiles, getDogElementSample, getElementLowerEdges, snapElementLowerEdges, createElementAnimationPlayer */
(async () => {
  const nav = document.querySelector('.navs');
  if (nav) nav.classList.add('closed');
  const { loadElementSources, importElementDefinition, validateElementDefinition,
    applyElementEdit, exportElementDefinition, resolveElementDraw, resolveElementFrame,
    resolveElementPlacement, renderElement, updateElementFrame } = qtiledElementRendering;
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
  let objectAngle = 0;
  let elementGrid = [0, 0];
  let placementGrid = null;
  let pointerOnCanvas = false;
  const imageAngle = () => (view.angle + objectAngle) % 360;
  let definition;
  let sources = {};
  let sourceInfo = {};
  let terrainLibrary = null;
  let busy = false;
  let inputIssue = null;
  let dimensionIssue = null;
  let fileIssues = [];
  const camera = { scale: 1, offset: [0, 0] };
  let fitToCanvas = true;
  let currentDraw = null;
  let drag = null;
  let suppressClick = false;
  let exportJson = null;
  const lowerEdgeCache = new WeakMap();

  if (typeof applyElementEdit !== 'function' || typeof exportElementDefinition !== 'function' || typeof resolveElementPlacement !== 'function'
    || typeof resolveElementFrame !== 'function' || typeof updateElementFrame !== 'function') {
    get('status').textContent = '运行文件尚未更新：请在 QTiled 根目录运行 npm run debug，再刷新此页。';
    get('file-controls').disabled = true;
    get('canvas-controls').disabled = true;
    return;
  }
  const player = createElementAnimationPlayer(updateAnimation);
  let resumePlayback = false;
  window.addEventListener('pagehide', event => {
    resumePlayback = event.persisted && player.playing;
    if (event.persisted) player.pause(); else player.dispose();
  });
  window.addEventListener('pageshow', event => {
    if (!event.persisted) return;
    if (resumePlayback) player.play();
    resumePlayback = false;
    updateAnimationControls();
  });

  function isSequenceView(angle = imageAngle()) {
    return definition?.version === 2 && Object.prototype.hasOwnProperty.call(definition.views[angle], 'sequence');
  }

  function currentSequence(angle = imageAngle()) {
    return isSequenceView(angle) ? definition.sequences?.[definition.views[angle].sequence] : null;
  }

  function previewFrame(angle = imageAngle()) {
    try {
      return resolveElementFrame(definition, angle, { elapsedMs: player.elapsed() });
    } catch (error) {
      const current = definition?.views?.[angle];
      return { source: current?.source || '', rect: current?.rect || [0, 0, 1, 1], anchor: current?.anchor || [0, 0] };
    }
  }

  function viewHasIssues(issues, angle) {
    const sequence = isSequenceView(angle) ? definition.views[angle].sequence : null;
    return issues.some(issue => issue.path === `views.${angle}` || issue.path.startsWith(`views.${angle}.`)
      || (sequence && (issue.path === 'sequences' || issue.path === `sequences.${sequence}`
        || issue.path.startsWith(`sequences.${sequence}.`))));
  }

  function fillFrameFields(frame = previewFrame()) {
    get('source').value = frame.source;
    rectIds.forEach((id, i) => { get(id).value = Number.isFinite(frame.rect[i]) ? frame.rect[i] : ''; });
    const size = sourceInfo[frame.source];
    get('source-size').textContent = size ? `原图 ${size.width} × ${size.height}` : '未选图';
    get('source-size').title = size ? '' : '当前方向尚未绑定已加载图片';
    if (currentSequence() && Number.isInteger(frame.frameIndex)) get('animation-frame').value = frame.frameIndex + 1;
  }

  function updateAnimationControls() {
    const sequence = currentSequence();
    get('animation-controls').hidden = !sequence;
    get('animation-toggle').textContent = player.playing ? '暂停' : '播放';
    if (!sequence) return;
    get('animation-frame').disabled = !Number.isSafeInteger(sequence.frameDurationMs) || sequence.frameDurationMs <= 0;
    get('animation-duration').value = sequence.frameDurationMs;
    get('animation-frame').max = sequence.frames.length;
    get('animation-count').textContent = `/ ${sequence.frames.length}`;
    const shared = angles.filter(angle => definition.views[angle].sequence === definition.views[imageAngle()].sequence);
    get('animation-help').textContent = `作者预览节奏。图片和裁切编辑当前帧，影响共用此序列的 ${shared.map(angle => `${angle}°`).join('、')}；锚点只改当前方向。`;
  }

  function updateAnimation() {
    if (busy || drag || !currentDraw || !currentSequence()) return;
    const frame = previewFrame();
    if (frame.frameIndex === undefined) return;
    if (currentDraw.frameIndex !== frame.frameIndex || currentDraw.sequence !== frame.sequence) {
      updateElementFrame(layer, frame, sources);
      currentDraw = { ...currentDraw, ...frame,
        position: currentDraw.origin.map((value, i) => value - frame.anchor[i]) };
      fillFrameFields(frame);
    }
    get('animation-toggle').textContent = player.playing ? '暂停' : '播放';
  }

  function pauseForFrameEdit() {
    if (!currentSequence()) return;
    player.pause();
    updateAnimationControls();
  }

  function toScreen(point) {
    return point.map((value, i) => value * camera.scale + camera.offset[i]);
  }

  function getWorldPosition(event) {
    return getPointerPosition(event, container).map((value, i) => (value - camera.offset[i]) / camera.scale);
  }

  function resetPlacement() {
    elementGrid = [0, 0];
    objectAngle = 0;
    get('terrain-material').value = '';
    document.querySelectorAll('[data-object-angle]').forEach(button => button.setAttribute('aria-pressed', String(Number(button.dataset.objectAngle) === 0)));
  }

  function toDefinitionOffset(worldGrid) {
    return qtiled.shapes.polygon.rotateGridPoint(worldGrid.map((value, i) => value - elementGrid[i]), -objectAngle / 90);
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
    const visibleWidth = viewport.clientWidth || 680;
    const visibleHeight = viewport.clientHeight || 500;
    const width = fitToCanvas ? visibleWidth : Math.max(visibleWidth, Math.ceil(bounds.maxX) - Math.floor(bounds.minX) + 48);
    const height = fitToCanvas ? visibleHeight : Math.max(visibleHeight, Math.ceil(bounds.maxY) - Math.floor(bounds.minY) + 48);
    camera.scale = fitToCanvas ? Math.min(1, Math.max(1, width - 48) / Math.max(1, bounds.width), Math.max(1, height - 48) / Math.max(1, bounds.height)) : 1;
    camera.offset = fitToCanvas
      ? [width / 2 - (bounds.minX + bounds.maxX) / 2 * camera.scale, height / 2 - (bounds.minY + bounds.maxY) / 2 * camera.scale]
      : [24 - Math.floor(bounds.minX), 24 - Math.floor(bounds.minY)];
    // 100% 保持一像素对应一像素，实际画布完整容纳范围，由外层滚动。
    container.style.width = `${width}px`;
    container.style.height = `${height}px`;
    scene.width = width;
    scene.height = height;
    if (fitToCanvas) { viewport.scrollLeft = 0; viewport.scrollTop = 0; }
    get('fit-canvas').setAttribute('aria-pressed', String(fitToCanvas));
    get('actual-size').setAttribute('aria-pressed', String(!fitToCanvas));
  }

  function render({ fit = false } = {}) {
    gridLayer.removeAllChildren();
    overlayLayer.removeAllChildren();
    const vertexes = qtiled.shapes.rhombus.getVertexes(view.tileSize);
    const footprint = Array.isArray(definition?.footprint) && definition.footprint.every(cell =>
      Array.isArray(cell) && cell.length === 2 && cell.every(Number.isInteger))
      ? definition.footprint.map(cell => qtiled.shapes.polygon.rotateGridPoint(cell, objectAngle / 90).map((value, i) => value + elementGrid[i])) : [];
    placementGrid = null;
    if (footprint.length) {
      try {
        const placement = resolveElementPlacement(definition, [0, 0], objectAngle, view.angle);
        placementGrid = elementGrid.map((value, i) => value - placement.grid[i]);
      } catch (error) {
        // 不完整或不规则占地仍可编辑；没有原作依据时不另猜上角选格规则。
      }
    }
    document.querySelectorAll('[data-object-angle]').forEach(button => { button.disabled = busy || !placementGrid; });
    get('placement-status').textContent = placementGrid ? `蓝框：放置基准格 [${placementGrid}]` : '当前占地不支持矩形转向；仍可编辑和切换镜头。';
    const footprintBounds = qtiled.shapes.polygon.getBounds(footprint);
    // 至少 9×9，超过基础范围的占地向外多留两格；非矩形与负偏移同样适用。
    const gridRanges = [
      [Math.min(-4, (footprintBounds?.minX ?? 0) - 2), Math.max(4, (footprintBounds?.maxX ?? 0) + 2)],
      [Math.min(-4, (footprintBounds?.minY ?? 0) - 2), Math.max(4, (footprintBounds?.maxY ?? 0) + 2)],
    ];
    const definitionIssues = validateElementDefinition(definition, sourceInfo);
    const issues = [...fileIssues, ...(inputIssue ? [inputIssue] : []), ...(dimensionIssue ? [dimensionIssue] : []), ...definitionIssues];
    updateViewBinding(definitionIssues);
    get('dismiss-file-issues').hidden = fileIssues.length === 0;
    get('issues').hidden = issues.length === 0;
    get('validation').hidden = issues.length === 0;
    get('issues').textContent = issues.map(issue => `${issue.path}: ${issue.message}`).join('\n');
    get('export').disabled = busy || issues.length > 0;
    const validAngles = angles.filter(angle => !viewHasIssues(definitionIssues, angle));
    const summary = `${definition?.kind === 'tile' ? '地块' : '精灵'} · 占地 ${footprint.length} 格 · 镜头 ${view.angle}° / 对象 ${objectAngle}° · 四向 ${validAngles.length}/4`;
    get('status').textContent = busy ? '正在载入…' : `${summary} · ${issues.length ? '草稿待完成，暂不可导出' : '配置校验通过，可以导出 JSON'}`;
    // 草稿允许只预览已配置的当前方向；正式导出仍校验完整四向。
    const invalidCommon = definitionIssues.some(issue => issue.path === '$' || issue.path === 'views' || issue.path.startsWith('footprint'));
    currentDraw = invalidCommon || !validAngles.includes(imageAngle()) ? null
      : resolveElementDraw(definition, elementGrid, view, objectAngle, { elapsedMs: player.elapsed() });
    if (fit) fitCamera(gridRanges, vertexes, invalidCommon ? [] : validAngles.flatMap(angle => {
      const sequence = currentSequence(angle);
      const times = sequence ? sequence.frames.map((frame, index) => index * sequence.frameDurationMs) : [0];
      return times.map(elapsedMs => resolveElementDraw(definition, elementGrid,
        { ...view, angle: (angle - objectAngle + 360) % 360 }, objectAngle, { elapsedMs }));
    }));
    get('view-scale').textContent = `${view.tileSize.join('×')} · ${Math.round(camera.scale * 100)}%`;
    get('view-scale').title = `逻辑单元格 ${view.tileSize.join('×')} 像素；当前显示约 ${view.tileSize.map(value => Math.round(value * camera.scale * 10) / 10).join('×')} 像素`;
    const points = vertexes.map(vertex => vertex.map(value => value * camera.scale));
    qtiled.shapes.polygon.twoDimForEach(...gridRanges, 'RightDown', (x, y) => {
      const pos = toScreen(qtiledView.projectGrid([x, y], view));
      gridLayer.append(new spritejs.Polyline({ pos, points, close: true, strokeColor: '#d4dce3', lineWidth: 1 }));
      overlayLayer.append(new spritejs.Label({
        text: `${x},${y}`, pos, anchor: [0.5, 0.5],
        fontSize: 10, fillColor: '#657584',
      }));
    });
    const preview = renderElement(layer, currentDraw, sources,
      { bounds: true, footprint: false, placement: false });
    if (preview) preview.attr({ pos: camera.offset, scale: [camera.scale, camera.scale], transformOrigin: [0, 0], opacity: Number(get('image-opacity').value) / 100 });
    footprint.forEach(grid => overlayLayer.append(new spritejs.Polyline({
      pos: toScreen(qtiledView.projectGrid(grid, view)), points, close: true,
      strokeColor: '#ce871c', fillColor: 'rgba(255,190,55,0.12)', lineWidth: 2,
    })));
    if (placementGrid) {
      overlayLayer.append(new spritejs.Polyline({ pos: toScreen(qtiledView.projectGrid(placementGrid, view)),
        points: [[0, -7], [7, 0], [0, 7], [-7, 0]], close: true, strokeColor: '#1976b5', lineWidth: 2 }));
    }
    get('image-angle').textContent = `编辑素材：${imageAngle()}°`;
    if (currentSequence()) fillFrameFields();
    else {
      const size = sourceInfo[definition?.views[imageAngle()]?.source];
      get('source-size').textContent = size ? `原图 ${size.width} × ${size.height}` : '未选图';
      get('source-size').title = size ? '' : '当前方向尚未绑定已加载图片';
    }
    updateAnimationControls();
  }

  function fillFields() {
    get('element-id').value = definition.id;
    get('kind').value = definition.kind;
    const current = definition.views[imageAngle()];
    const frame = previewFrame();
    get('source').replaceChildren(new Option('请选择图片', ''), ...Object.keys(sources).map(path => new Option(path, path)));
    if (frame.source && !Object.prototype.hasOwnProperty.call(sources, frame.source)) {
      get('source').add(new Option(`未加载：${frame.source}`, frame.source));
    }
    fillFrameFields(frame);
    get('view-sequence').replaceChildren(new Option('静态图片', ''), ...Object.keys(definition.version === 2 ? definition.sequences || {} : {}).map(id => new Option(`动画：${id}`, id)));
    get('view-sequence').value = isSequenceView() ? current.sequence : '';
    anchorIds.forEach((id, i) => { get(id).value = Number.isFinite(current.anchor[i]) ? current.anchor[i] : ''; });
    if (!inputIssue) get('footprint').value = JSON.stringify(definition.footprint);
    syncFootprintFields();
  }

  function syncFootprintFields() {
    const cells = definition.footprint;
    if (!Array.isArray(cells) || !cells.every(cell => Array.isArray(cell) && cell.length === 2 && cell.every(Number.isInteger))) {
      get('footprint-width').value = '';
      get('footprint-height').value = '';
      get('footprint-shape').textContent = '占地 JSON 非法，请先修正。';
      return;
    }
    const bounds = qtiled.shapes.polygon.getBounds(cells);
    const width = bounds ? bounds.width + 1 : 0;
    const height = bounds ? bounds.height + 1 : 0;
    if (!dimensionIssue) {
      get('footprint-width').value = width || '';
      get('footprint-height').value = height || '';
    }
    const rectangular = bounds && new Set(cells.map(cell => cell.join(','))).size === width * height;
    get('footprint-shape').textContent = rectangular ? '修改行列会重建矩形占地。'
      : bounds ? '自定义占地：行列为外接范围，修改会重建矩形。' : '当前无占地，可点击添加或设置行列。';
  }

  function edit(field, value) {
    if (currentSequence() && (field === 'source' || field === 'rect')) {
      pauseForFrameEdit();
      const id = definition.views[imageAngle()].sequence;
      const sequence = currentSequence();
      const index = previewFrame().frameIndex;
      if (!Number.isInteger(index)) {
        get('grid-status').textContent = '请先修正每帧毫秒，再编辑当前动画帧。';
        return;
      }
      const frames = sequence.frames.map((frame, i) => i === index ? { ...frame, [field]: value } : frame);
      definition = applyElementEdit(definition, { field: 'sequences', value: { ...definition.sequences, [id]: { ...sequence, frames } } });
    } else definition = applyElementEdit(definition, { field, value, angle: imageAngle() });
    if (field === 'footprint') { dimensionIssue = null; syncFootprintFields(); }
    render({ fit: true });
  }

  function bindingTargets() {
    return angles.filter(angle => angle !== imageAngle() && get(`share-angle-${angle}`).checked);
  }

  function updateViewBinding(issues) {
    const angle = imageAngle();
    const current = definition?.views[angle];
    const animated = isSequenceView(angle);
    const valid = (animated ? currentSequence() : current?.source && Array.isArray(current.rect)) && !viewHasIssues(issues, angle);
    const shared = valid ? angles.filter(value => {
      const candidate = definition.views[value];
      return animated ? candidate.sequence === current.sequence
        : !isSequenceView(value) && candidate.source === current.source && candidate.rect.every((item, index) => item === current.rect[index]);
    }) : [];
    get('shared-view-status').textContent = shared.length
      ? `${animated ? '共用序列' : '同图同裁切'}：${shared.map(value => `${value}°`).join('、')}${shared.length === 1 ? '（仅当前方向）' : ''}`
      : '当前方向尚无有效图片与裁切。';
    const targets = bindingTargets();
    get('view-binding-targets').textContent = targets.length
      ? `本次应用：${angle}° → ${targets.map(value => `${value}°`).join('、')}` : '请至少选择一个其他素材方向。';
    get('apply-view-binding').disabled = busy || !valid || targets.length === 0;
    get('apply-view-binding').textContent = animated ? '将当前动画序列应用到所选方向' : '将当前图片与裁切应用到所选方向';
  }

  // 文件加载期间关闭文件和编辑输入，避免较早的异步结果覆盖后来的操作。
  async function loadFiles(task) {
    if (busy) return;
    busy = true;
    get('file-controls').disabled = true;
    get('edit-fields').disabled = true;
    get('canvas-controls').disabled = true;
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
      get('canvas-controls').disabled = false;
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
    resetPlacement();
    sources = {};
    sourceInfo = {};
    ['source-files', 'direction-file', 'definition-file'].forEach(id => { get(id).value = ''; });
    inputIssue = null;
    dimensionIssue = null;
    fileIssues = [];
    get('grid-action').value = 'inspect';
    get('grid-status').textContent = '放置基准格自动确定；逐方向选择图片，拖拽调整图片与占地的对齐。';
    fillFields();
    render({ fit: true });
  }

  async function loadSample() {
    await loadFiles(async () => {
      const { directory: assetDir, sourceFiles } = getDogElementSample();
      const loaded = await loadElementSources(sourceFiles);
      fileIssues = loaded.issues;
      if (fileIssues.length) return;
      const response = await fetch(`${assetDir}element.json`, { cache: 'no-store' });
      if (!response.ok) throw new Error(`样本加载失败（${response.status}）。`);
      const result = importElementDefinition(await response.text(), loaded.sourceInfo);
      if (result.issues.length) fileIssues = result.issues;
      else {
        // 与地表样本一致，定义和图片全部通过后再替换当前状态。
        sources = loaded.sources;
        sourceInfo = loaded.sourceInfo;
        definition = result.definition;
        resetPlacement();
        inputIssue = null;
        dimensionIssue = null;
        get('definition-file').value = '';
        get('source-files').value = '';
        get('grid-action').value = 'inspect';
        get('grid-status').textContent = '网格显示世界格坐标；通过“网格操作”查看坐标或增删占地。';
      }
    });
  }

  function useTerrainMaterial(id) {
    definition = terrainLibrary.definitions[id];
    sources = terrainLibrary.sources;
    sourceInfo = terrainLibrary.sourceInfo;
    resetPlacement();
    get('terrain-material').value = id;
    inputIssue = null;
    dimensionIssue = null;
    get('grid-action').value = 'inspect';
    get('grid-status').textContent = '已载入地图共用的原作地表定义；此处编辑副本，导出 JSON 保存修改。';
  }

  get('terrain-sample').addEventListener('click', () => loadFiles(async () => {
    const directory = './static/terrain-samples/emperor-land-water/';
    const [response, loaded] = await Promise.all([
      fetch(`${directory}elements.json`, { cache: 'no-store' }),
      loadElementSources({ 'atlas.png': `${directory}atlas.png` }),
    ]);
    if (!response.ok) throw new Error(`地表素材定义加载失败（${response.status}）。`);
    if (loaded.issues.length) { fileIssues = loaded.issues; return; }
    const values = JSON.parse(await response.text());
    if (!values || Array.isArray(values) || typeof values !== 'object' || !Object.keys(values).length) {
      throw new Error('地表素材库必须包含按 ID 索引的元素定义。');
    }
    const definitions = {};
    for (const [id, value] of Object.entries(values)) {
      const result = importElementDefinition(JSON.stringify(value), loaded.sourceInfo);
      fileIssues.push(...result.issues.map(issue => ({ ...issue, path: `${id}.${issue.path}` })));
      if (result.definition) definitions[id] = result.definition;
    }
    if (fileIssues.length) return;
    // 定义与真实图片全部通过后再替换，失败时保留原配置和资源。
    terrainLibrary = { definitions, sources: loaded.sources, sourceInfo: loaded.sourceInfo };
    const ids = Object.keys(definitions);
    const animationNames = { 'emperor-water-even': '普通水面 · 动画', 'emperor-water-odd': '过渡水面（另一组） · 动画', 'emperor-water-deep': '深处水面 · 动画' };
    get('terrain-material').replaceChildren(new Option('选择原作地表素材', ''), ...ids.map(id => {
      const number = Number(id.split('-').pop());
      return new Option(animationNames[id] || `${number === 202 ? '陆地' : number >= 664 ? '水面单帧' : '岸线'} · ${number}`, id);
    }));
    get('terrain-material').disabled = false;
    useTerrainMaterial(definitions['emperor-water-deep'] ? 'emperor-water-deep' : ids[0]);
  }));
  get('terrain-material').addEventListener('change', event => {
    if (!terrainLibrary || !terrainLibrary.definitions[event.target.value]) return;
    loadFiles(async () => useTerrainMaterial(event.target.value));
  });

  get('element-id').addEventListener('input', event => { definition = { ...definition, id: event.target.value }; render(); });
  get('kind').addEventListener('change', event => { definition = { ...definition, kind: event.target.value }; render(); });
  get('source').addEventListener('change', event => {
    const source = event.target.value;
    pauseForFrameEdit();
    const firstBinding = !previewFrame().source;
    fileIssues = [];
    edit('source', source);
    const size = sourceInfo[source];
    if (firstBinding && size) edit('rect', [0, 0, size.width, size.height]);
    fillFields();
    render({ fit: true });
  });
  get('direction-file').addEventListener('change', event => {
    const file = event.target.files[0];
    if (!file) return;
    pauseForFrameEdit();
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
      edit('source', file.name);
      edit('rect', [0, 0, size.width, size.height]);
    }).finally(() => { event.target.value = ''; });
  });
  for (const [field, ids] of [['rect', rectIds], ['anchor', anchorIds]]) {
    ids.forEach(id => get(id).addEventListener('input', () => edit(field, ids.map(name => get(name).valueAsNumber))));
  }
  get('full-image').addEventListener('click', () => {
    pauseForFrameEdit();
    const size = sourceInfo[previewFrame().source];
    if (!size) return;
    edit('rect', [0, 0, size.width, size.height]);
    fillFields();
  });
  angles.forEach(angle => get(`share-angle-${angle}`).addEventListener('change', () => {
    updateViewBinding(validateElementDefinition(definition, sourceInfo));
  }));
  get('apply-view-binding').addEventListener('click', () => {
    if (busy || drag || get('apply-view-binding').disabled) return;
    const angle = imageAngle();
    const current = definition.views[angle];
    const targets = bindingTargets();
    let candidate = definition;
    targets.forEach(target => {
      if (isSequenceView(angle)) candidate = applyElementEdit(candidate, { field: 'sequence', angle: target, value: current.sequence });
      else {
        candidate = applyElementEdit(candidate, { field: 'source', angle: target, value: current.source });
        candidate = applyElementEdit(candidate, { field: 'rect', angle: target, value: current.rect });
      }
    });
    definition = candidate;
    fillFields();
    render({ fit: true });
    get('grid-status').textContent = `已将 ${angle}° ${isSequenceView(angle) ? '动画序列' : '图片与裁切'}应用到 ${targets.map(value => `${value}°`).join('、')}；各方向锚点保持不变。`;
  });
  get('view-sequence').addEventListener('change', event => {
    const sequence = event.target.value;
    if (sequence) definition = applyElementEdit(definition, { field: 'sequence', angle: imageAngle(), value: sequence });
    else {
      const frame = previewFrame();
      definition = applyElementEdit(definition, { field: 'source', angle: imageAngle(), value: frame.source });
      definition = applyElementEdit(definition, { field: 'rect', angle: imageAngle(), value: frame.rect });
    }
    fillFields();
    render({ fit: true });
  });
  get('animation-toggle').addEventListener('click', () => {
    if (player.playing) player.pause();
    else player.play();
    updateAnimationControls();
  });
  get('animation-reset').addEventListener('click', () => { player.reset(); updateAnimationControls(); });
  get('animation-frame').addEventListener('input', event => {
    const sequence = currentSequence();
    const frame = event.target.valueAsNumber;
    if (!sequence || !Number.isInteger(frame) || frame < 1 || frame > sequence.frames.length
      || !Number.isSafeInteger(sequence.frameDurationMs) || sequence.frameDurationMs <= 0) return;
    player.pause();
    player.seek((frame - 1) * sequence.frameDurationMs);
    updateAnimationControls();
  });
  get('animation-duration').addEventListener('input', event => {
    const id = definition.views[imageAngle()].sequence;
    if (!id) return;
    const frameDurationMs = event.target.valueAsNumber;
    const frameIndex = previewFrame().frameIndex ?? Math.max(0, get('animation-frame').valueAsNumber - 1);
    pauseForFrameEdit();
    definition = applyElementEdit(definition, { field: 'sequences', value: { ...definition.sequences,
      [id]: { ...currentSequence(), frameDurationMs, timingSource: 'author' } } });
    if (Number.isSafeInteger(frameDurationMs) && frameDurationMs > 0) player.seek(frameIndex * frameDurationMs);
    render({ fit: true });
  });
  ['source', 'direction-file', ...rectIds, 'animation-duration', 'animation-frame'].forEach(id => {
    get(id).addEventListener('focus', pauseForFrameEdit);
  });
  get('footprint').addEventListener('input', event => {
    try {
      const value = JSON.parse(event.target.value);
      inputIssue = null;
      edit('footprint', value);
    } catch (error) {
      inputIssue = { path: 'footprint', message: '请输入占地偏移的 JSON 数组。' };
      get('footprint-shape').textContent = '占地 JSON 尚未应用，请先修正。';
      render();
    }
  });
  container.addEventListener('pointerdown', event => {
    suppressClick = false;
    if (busy || event.button !== 0 || !currentDraw) return;
    const point = getWorldPosition(event);
    if (!point.every((value, i) => value >= currentDraw.position[i] && value <= currentDraw.position[i] + currentDraw.rect[i + 2])) return;
    drag = {
      pointerId: event.pointerId, angle: imageAngle(),
      start: getPointerPosition(event, container), scale: camera.scale,
      anchor: [...definition.views[imageAngle()].anchor], moved: false,
      edges: [], edgeMessage: '',
    };
    if (get('edge-snap').checked) {
      try {
        const image = sources[currentDraw.source];
        const key = [...currentDraw.rect, ...view.tileSize].join(',');
        let cached = lowerEdgeCache.get(image);
        if (!cached) { cached = new Map(); lowerEdgeCache.set(image, cached); }
        if (!cached.has(key)) {
          const canvas = document.createElement('canvas');
          const [x, y, width, height] = currentDraw.rect;
          canvas.width = width;
          canvas.height = height;
          const context = canvas.getContext('2d', { willReadFrequently: true });
          context.drawImage(image, x, y, width, height, 0, 0, width, height);
          cached.set(key, getElementLowerEdges(context.getImageData(0, 0, width, height).data, width, height, view.tileSize));
        }
        drag.edges = cached.get(key);
        if (!drag.edges.length) drag.edgeMessage = '未识别到连续底边，保持自由拖动';
      } catch (error) {
        drag.edgeMessage = '无法读取图片像素，保持自由拖动';
      }
    }
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
    let anchor = drag.anchor.map((value, i) => value - delta[i] / drag.scale);
    const origin = currentDraw.origin;
    const snapped = get('edge-snap').checked && !event.altKey
      ? snapElementLowerEdges(drag.edges, origin.map((value, i) => value - anchor[i]), view.originPixel, view.tileSize, drag.scale)
      : { offset: [0, 0], edges: [] };
    anchor = anchor.map((value, i) => Math.round((value - snapped.offset[i]) * 1000) / 1000);
    definition = applyElementEdit(definition, { field: 'anchor', angle: drag.angle, value: anchor });
    anchorIds.forEach((id, i) => { get(id).value = anchor[i]; });
    render();
    snapped.edges.forEach(edge => overlayLayer.append(new spritejs.Polyline({
      points: [edge.from, edge.to].map(x => toScreen([origin[0] - anchor[0] + x,
        origin[1] - anchor[1] + edge.slope * x + edge.intercept])),
      strokeColor: '#098d3b', lineWidth: 3,
    })));
    const snapStatus = snapped.edges.length ? '底边已吸附（Alt 自由拖动）' : event.altKey ? '自由拖动（Alt）' : drag.edgeMessage;
    get('grid-status').textContent = `锚点 [${anchor}]${snapStatus ? ` · ${snapStatus}` : ''}`;
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
    if (!cancelled && previous.moved) render();
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
    const worldGrid = qtiledView.pickGrid(getWorldPosition(event), view);
    const grid = toDefinitionOffset(worldGrid);
    const found = definition.footprint.some(cell => cell[0] === grid[0] && cell[1] === grid[1]);
    const action = get('grid-action').value;
    if (action === 'inspect') { get('grid-status').textContent = `所选格子 [${worldGrid}] · 基准偏移 [${grid}]${found ? ' · 已占用' : ' · 未占用'}`; return; }
    const footprint = found ? definition.footprint.filter(cell => cell[0] !== grid[0] || cell[1] !== grid[1]) : [...definition.footprint, grid];
    edit('footprint', footprint);
    get('footprint').value = JSON.stringify(footprint);
    get('grid-status').textContent = `${found ? '移除' : '添加'}占用格子 [${grid}]`;
  });
  container.addEventListener('mousemove', event => {
    if (busy) return;
    const grid = qtiledView.pickGrid(getWorldPosition(event), view);
    const offset = toDefinitionOffset(grid);
    container.title = `格子 [${grid}] · 基准偏移 [${offset}] · 拖拽调整素材 ${imageAngle()}° 锚点`;
  });
  ['footprint-width', 'footprint-height'].forEach(id => get(id).addEventListener('input', () => {
    if (!definition || busy) return;
    const width = get('footprint-width').valueAsNumber;
    const height = get('footprint-height').valueAsNumber;
    if (![width, height].every(value => Number.isInteger(value) && value > 0)) {
      get('grid-status').textContent = '占地列和行必须为正整数。';
      dimensionIssue = { path: 'footprint', message: '占地列和行必须为正整数，尚未应用输入。' };
      render();
      return;
    }
    const cells = Array.isArray(definition.footprint) ? definition.footprint.filter(cell =>
      Array.isArray(cell) && cell.length === 2 && cell.every(Number.isInteger)) : [];
    const minX = cells.length ? Math.min(...cells.map(cell => cell[0])) : 0;
    const minY = cells.length ? Math.min(...cells.map(cell => cell[1])) : 0;
    inputIssue = null;
    edit('footprint', qtiled.shapes.polygon.twoDimForEach([minX, minX + width - 1], [minY, minY + height - 1], 'RightDown', (x, y) => [x, y]));
    get('footprint').value = JSON.stringify(definition.footprint);
    get('grid-status').textContent = `已重建 ${width} × ${height} 占地；放置基准格自动确定。`;
  }));
  document.querySelectorAll('[data-angle]').forEach(button => button.addEventListener('click', () => {
    if (busy || drag) return;
    view.angle = Number(button.dataset.angle);
    document.querySelectorAll('[data-angle]').forEach(item => item.setAttribute('aria-pressed', String(Number(item.dataset.angle) === view.angle)));
    fillFields();
    render({ fit: true });
  }));
  function setObjectAngle(angle) {
    if (busy || drag || !definition || !placementGrid) return;
    const placement = resolveElementPlacement(definition, placementGrid, angle, view.angle);
    elementGrid = placement.grid;
    objectAngle = placement.objectAngle;
    document.querySelectorAll('[data-object-angle]').forEach(item => item.setAttribute('aria-pressed', String(Number(item.dataset.objectAngle) === objectAngle)));
    fillFields();
    render({ fit: true });
  }
  document.querySelectorAll('[data-object-angle]').forEach(button => button.addEventListener('click', () => setObjectAngle(Number(button.dataset.objectAngle))));
  container.addEventListener('pointerenter', () => { pointerOnCanvas = true; });
  container.addEventListener('pointerleave', () => { pointerOnCanvas = false; });
  document.addEventListener('keydown', event => {
    const active = document.activeElement;
    if (!pointerOnCanvas || event.key.toLowerCase() !== 'r' || event.repeat || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey
      || active?.matches('input, textarea, select, [contenteditable="true"]') || get('export-dialog').open || busy || drag) return;
    event.preventDefault();
    setObjectAngle((objectAngle + 90) % 360);
  });
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
  // 跟随侧栏与工具栏变化后的实际可见宽高，缩放后的鼠标仍回到同一逻辑坐标。
  if (typeof ResizeObserver !== 'undefined') new ResizeObserver(() => {
    if (definition && !drag) render({ fit: true });
  }).observe(viewport);
  get('source-files').addEventListener('change', event => {
    const files = getElementSourceFiles(event.target.files);
    loadFiles(async () => {
      const result = await loadElementSources(files);
      sources = result.sources;
      sourceInfo = result.sourceInfo;
      fileIssues = result.issues;
    }).finally(() => { event.target.value = ''; });
  });
  get('definition-file').addEventListener('change', event => {
    const file = event.target.files[0];
    if (!file) return;
    loadFiles(async () => {
      const result = importElementDefinition(await file.text(), sourceInfo);
      if (result.issues.length) fileIssues = result.issues;
      else {
        definition = result.definition;
        resetPlacement();
        inputIssue = null;
        dimensionIssue = null;
        get('grid-status').textContent = '已导入配置；占地行列与当前定义同步。';
      }
    }).finally(() => { event.target.value = ''; });
  });
  get('dismiss-file-issues').addEventListener('click', () => { fileIssues = []; render(); });
  get('sample').addEventListener('click', loadSample);
  get('new').addEventListener('click', newDefinition);
  get('export').addEventListener('click', () => {
    if (busy || inputIssue || dimensionIssue || fileIssues.length) return;
    const result = exportElementDefinition(definition, sourceInfo);
    if (result.issues.length) { render(); return; }
    exportJson = result.json;
    get('export-json').value = exportJson;
    get('export-dialog').showModal();
  });
  get('close-export').addEventListener('click', () => get('export-dialog').close());
  get('export-dialog').addEventListener('close', () => { exportJson = null; });
  get('download-json').addEventListener('click', () => {
    if (exportJson === null) return;
    const url = URL.createObjectURL(new Blob([exportJson], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'element.json';
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    get('export-dialog').close();
    get('status').textContent = '已请求下载 JSON · 请在独立预览中重新选择下载的文件';
  });
  newDefinition();
  await loadSample();
  player.play();
})();
