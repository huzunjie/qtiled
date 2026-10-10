/* 地图事实与地表绘制的编辑闭环；原作选图规则仅在 Demo 工具层消费。 */
(function() {
  const get = id => document.getElementById(id);
  const container = get('map-canvas');
  const controls = get('controls');
  const status = get('status');
  const issues = get('issues');
  const terrainDirectory = './static/terrain-samples/emperor-land-water/';
  const navigation = document.querySelector('.navs');
  if (navigation) navigation.classList.add('closed');
  let layer;
  let spriteScene;
  let currentScene;
  let selectedGrid = null;
  let selectedEntityId = null;
  let cameraAngle = 0;
  let loadRequestId = 0;
  let stroke = null;
  let pan = null;
  let suppressClick = false;
  // 相机只属于当前页面，不写入地图事实或撤销记录；中心允许位于半格。
  const viewport = { width: container.clientWidth || 640, height: container.clientHeight || 440,
    center: null, scale: 1, mode: 'work' };
  const undoStack = [];
  const redoStack = [];
  const player = createElementAnimationPlayer(updateAnimation);

  function updateAnimation(elapsedMs) {
    if (!currentScene) return;
    const { resolveElementFrame, updateElementFrame } = window.qtiledElementRendering;
    try {
      // 先解析全部帧，再更新现有图片；动画不重建占用、地表规则或场景节点。
      const frames = currentScene.animated.map(item => ({ item,
        frame: resolveElementFrame(item.definition, item.imageAngle, { elapsedMs, phase: item.phase }) }));
      let changed = false;
      for (const { item, frame } of frames) {
        if (item.frameIndex === frame.frameIndex) continue;
        updateElementFrame(item.holder, frame, currentScene.sources);
        item.frameIndex = frame.frameIndex;
        changed = true;
      }
      if (changed) {
        currentScene.contentLayer.render();
        currentScene.contentImage.forceUpdate();
      }
      updateWaterFrame();
    } catch (error) {
      player.pause();
      fail(error);
      updatePlaybackControls();
    }
  }

  function updateWaterFrame() {
    const item = selectedGrid && currentScene?.animated.find(value => value.grid[0] === selectedGrid[0] && value.grid[1] === selectedGrid[1]);
    const text = item ? `${item.frameIndex + 1} / ${item.definition.sequences[item.sequence].frames.length}` : '—';
    if (get('water-frame').textContent !== text) get('water-frame').textContent = text;
  }

  function updatePlaybackControls() {
    get('play-animation').disabled = !currentScene;
    get('restart-animation').disabled = !currentScene;
    get('play-animation').textContent = player.playing ? '暂停动画' : '播放动画';
    get('animation-state').textContent = currentScene
      ? `${player.playing ? '播放中' : '已暂停'} · ${currentScene.animated.length} 格动态水面` : '水面动画准备中';
  }

  function updateGuides() {
    if (!currentScene) return;
    const { Polyline, Label } = window.spritejs;
    const { gridOverlay, coordinateOverlay, tiles, vertexes, view } = currentScene;
    const showGrid = get('show-grid').checked;
    const showCoordinates = get('show-coordinates').checked;
    const readable = viewport.scale >= 0.5;
    if (showGrid && !gridOverlay.children.length) {
      tiles.forEach(({ grid }) => gridOverlay.append(new Polyline({
        pos: window.qtiledView.projectGrid(grid, view), points: vertexes, close: true,
        strokeColor: 'rgba(20, 45, 53, .45)', lineWidth: 1,
      })));
      currentScene.guideScale = null;
    }
    if (showCoordinates && readable && !coordinateOverlay.children.length) {
      tiles.forEach(({ grid }) => coordinateOverlay.append(new Label({
        text: grid.join(','), pos: window.qtiledView.projectGrid(grid, view), anchor: [0.5, 0.5],
        font: '11px monospace', fillColor: '#fff', bgcolor: 'rgba(20, 38, 45, .75)', padding: [1, 2],
      })));
      currentScene.guideScale = null;
    }
    gridOverlay.attr({ display: showGrid ? '' : 'none' });
    coordinateOverlay.attr({ display: showCoordinates && readable ? '' : 'none' });
    if (currentScene.guideScale !== viewport.scale) {
      gridOverlay.children.forEach(node => node.attr({ lineWidth: 1 / viewport.scale }));
      coordinateOverlay.children.forEach(node => node.attr({ font: `${Math.max(11, 9 / viewport.scale)}px monospace` }));
      currentScene.guideScale = viewport.scale;
    }
    get('coordinates-hint').hidden = !showCoordinates || readable;
  }

  function updateToolHelp() {
    const tool = get('edit-tool').value;
    container.dataset.tool = tool;
    get('click-help').textContent = {
      select: '点击地面格查看信息，可在详情区选择格子或雕塑。鼠标中键拖动可平移。',
      pan: '左键拖动平移，松开结束；Esc 取消本次移动。“查看全图”可找回地图。',
      land: '陆地笔刷：拖动预览整笔，松开提交；Esc 取消。越过空角或地图边界会拒绝整笔；中键可平移。',
      water: '水域笔刷：拖动预览整笔，松开提交；Esc 取消。岸线随邻格更新；中键可平移。',
    }[tool];
  }

  function requireSuccess(result) {
    if (result.issues.length) {
      throw new Error(result.issues.map(issue => `${issue.path}：${issue.message}`).join('\n'));
    }
    return result;
  }

  async function readText(path) {
    const response = await fetch(path, { cache: 'no-store' });
    if (!response.ok) throw new Error(`${path} 加载失败（HTTP ${response.status}）`);
    return response.text();
  }

  function updateSelection() {
    const { Group, Polyline } = window.spritejs;
    const { map, entities, view, vertexes, root } = currentScene;
    const entity = entities.find(item => item.id === selectedEntityId);
    const next = new Group();
    const highlight = entity ? entity.draw.footprint.map(item => item.grid) : selectedGrid ? [selectedGrid] : [];
    highlight.forEach(grid => {
      if (map.cells[grid[1]]?.[grid[0]] === undefined) return;
      next.append(new Polyline({ pos: window.qtiledView.projectGrid(grid, view), points: vertexes, close: true,
        strokeColor: '#1976b5', fillColor: 'rgba(25, 118, 181, .18)', lineWidth: 2 }));
    });
    if (currentScene.selection) currentScene.selection.remove();
    root.append(next);
    currentScene.selection = next;
    const cell = selectedGrid && map.cells[selectedGrid[1]]?.[selectedGrid[0]];
    get('cell-grid').textContent = selectedGrid ? JSON.stringify(selectedGrid) : '—';
    const tile = currentScene.tiles.find(item => selectedGrid && item.grid[0] === selectedGrid[0] && item.grid[1] === selectedGrid[1]);
    get('cell-info').textContent = !selectedGrid ? '点击画布查看' : cell === null ? 'null · 无效空角'
      : cell ? `terrain: ${cell.terrain}\nelevation: ${cell.elevation}\n素材: ${tile?.element || '无'}\n变体: ${tile?.variant ?? '无'}` : '地图矩阵之外';
    if (cell && tile?.waterKind) get('cell-info').textContent += `\n水面: ${{ ordinary: '普通', transition: '过渡', deep: '深处' }[tile.waterKind]}`;
    updateWaterFrame();
    get('entity-id').textContent = entity ? entity.id : '—';
    get('entity-source').textContent = entity ? `${entity.element}\n${entity.draw.source}` : '—';
    get('entity-pose').textContent = entity ? `${JSON.stringify(entity.grid)} / ${entity.angle}°` : '—';
    get('entity-footprint').textContent = entity ? entity.draw.footprint.map(item => JSON.stringify(item.grid)).join(' ') : '—';
    get('view-info').textContent = `${map.tileSize.join(' × ')} px / ${view.angle}°`;
  }

  function prepareScene(mapState, nextAngle, resolvedTiles) {
    const { Group, Label, Layer, Sprite } = window.spritejs;
    const { projectGrid } = window.qtiledView;
    const { map, elementsById, sources, rules } = mapState;
    if (map.tileSize[0] !== 80 || map.tileSize[1] !== 40) {
      throw new Error('tileSize：当前原作地表素材需要 80 × 40 格距。');
    }
    const tiles = resolvedTiles ?? requireSuccess(window.landWaterRules.resolve(map, elementsById, rules, nextAngle)).tiles;
    const view = { angle: nextAngle, tileSize: map.tileSize, originPixel: [0, 0] };
    const { entities } = requireSuccess(window.qtiledMaps.resolveMapEntities(map, elementsById, view));
    const cells = map.cells.flatMap((row, y) => row.map((cell, x) => ({ cell, grid: [x, y] })));
    const valid = cells.filter(({ cell }) => cell !== null);
    const grids = valid.length ? valid.map(({ grid }) => grid) : [[0, 0]];
    const mapCenter = [0, 1].map(axis => (Math.min(...grids.map(grid => grid[axis])) + Math.max(...grids.map(grid => grid[axis]))) / 2);
    const [width, height] = map.tileSize;
    const vertexes = [[0, -height / 2], [width / 2, 0], [0, height / 2], [-width / 2, 0]];
    const bounds = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
    function includeRect([x, y], w, h) {
      bounds.minX = Math.min(bounds.minX, x);
      bounds.minY = Math.min(bounds.minY, y);
      bounds.maxX = Math.max(bounds.maxX, x + w);
      bounds.maxY = Math.max(bounds.maxY, y + h);
    }
    grids.forEach(grid => {
      const [x, y] = projectGrid(grid, view);
      includeRect([x - width / 2, y - height / 2], width, height);
    });
    // 全图包含真实图片外延；动画取整个序列范围，避免随帧改变缩放。
    function includeDraw(draw, definition) {
      const frames = draw.sequence ? definition.sequences[draw.sequence].frames : [draw];
      frames.forEach(frame => includeRect(draw.position, frame.rect[2], frame.rect[3]));
    }
    const root = new Group({ transformOrigin: [0, 0] });
    const content = new Group();
    const labels = new Group();
    const gridOverlay = new Group({ id: 'map-grid-overlay', display: 'none' });
    const coordinateOverlay = new Group({ id: 'map-coordinate-overlay', display: 'none' });
    const drawables = [];
    const animated = [];
    const elapsedMs = player.elapsed();
    // 完整岸线图片含上凸内容，按格心投影深度绘制，不截掉覆盖部分。
    tiles.forEach(tile => {
      const holder = new Group();
      const definition = elementsById[tile.element];
      const phase = tile.phase || 0;
      const draw = window.qtiledElementRendering.resolveElementDraw(definition, tile.grid, view, 0, { elapsedMs, phase });
      includeDraw(draw, definition);
      window.qtiledElementRendering.renderElement(holder, draw, sources, { footprint: false, placement: false });
      if (draw.sequence) animated.push({ holder, definition, grid: tile.grid, phase, imageAngle: draw.imageAngle,
        frameIndex: draw.frameIndex, sequence: draw.sequence });
      drawables.push({ holder, depth: projectGrid(tile.grid, view)[1] });
    });
    // 当前平地样本按占地下端排序；前方岸线可遮挡实体底部，标签独立置顶。
    // 不作为多格交错、悬空或高程场景的通用遮挡/命中规则。
    const depth = entity => Math.max(...entity.draw.footprint.map(item => item.position[1]));
    [...entities].sort((a, b) => depth(a) - depth(b)).forEach(entity => {
      // renderElement 每个容器管理一个元素绘制组；共享定义的实例也必须各用独立容器。
      const holder = new Group();
      includeDraw(entity.draw, elementsById[entity.element]);
      window.qtiledElementRendering.renderElement(holder, entity.draw, sources, { footprint: false, placement: false });
      drawables.push({ holder, depth: depth(entity) });
      const points = entity.draw.footprint.map(item => item.position);
      const x = (Math.min(...points.map(pos => pos[0])) + Math.max(...points.map(pos => pos[0]))) / 2;
      includeRect([x - entity.id.length * 6, depth(entity) + height / 2 + 4], entity.id.length * 12, 12);
      labels.append(new Label({ text: entity.id, pos: [x, depth(entity) + height / 2 + 10],
        anchor: [0.5, 0.5], font: '12px sans-serif', fillColor: '#425466' }));
    });
    drawables.sort((a, b) => a.depth - b.depth).forEach(({ holder }) => content.append(holder));
    // 先在整数原像素坐标合成，再整体平移/缩放。逐片采样图集即使关闭平滑，
    // 在半像素位置仍可能选中不同侧的透明像素；仅舍入相机不能解决任意缩放。
    const rasterOrigin = [Math.floor(bounds.minX), Math.floor(bounds.minY)];
    const rasterSize = [Math.ceil(bounds.maxX) - rasterOrigin[0], Math.ceil(bounds.maxY) - rasterOrigin[1]];
    const canvas = document.createElement('canvas');
    const contentLayer = new Layer({ canvas, contextType: '2d', autoRender: false, handleEvent: false });
    contentLayer.setResolution({ width: rasterSize[0], height: rasterSize[1] });
    contentLayer.canvas.getContext('2d').imageSmoothingEnabled = false;
    content.attr({ pos: rasterOrigin.map(value => -value) });
    contentLayer.append(content);
    contentLayer.render();
    const contentImage = new Sprite({ texture: canvas, pos: rasterOrigin, size: rasterSize, anchor: [0, 0] });
    root.append(contentImage, labels, gridOverlay, coordinateOverlay);
    return { ...mapState, root, entities, tiles, animated, view, vertexes, bounds, mapCenter,
      contentLayer, contentImage, gridOverlay, coordinateOverlay, guideScale: null, selection: null };
  }

  function updateViewport() {
    if (!currentScene) return;
    const { bounds, view } = currentScene;
    const centerPixel = window.qtiledView.projectGrid(viewport.center, view);
    if (viewport.mode === 'fit') {
      const halfWidth = Math.max(centerPixel[0] - bounds.minX, bounds.maxX - centerPixel[0], 1);
      const halfHeight = Math.max(centerPixel[1] - bounds.minY, bounds.maxY - centerPixel[1], 1);
      viewport.scale = Math.min(1, Math.max(1, viewport.width - 48) / (2 * halfWidth), Math.max(1, viewport.height - 48) / (2 * halfHeight));
    }
    const origin = [viewport.width / 2 - centerPixel[0] * viewport.scale, viewport.height / 2 - centerPixel[1] * viewport.scale];
    currentScene.viewportOrigin = origin;
    currentScene.viewportScale = viewport.scale;
    currentScene.root.attr({ pos: origin, scale: [viewport.scale, viewport.scale] });
    // 合成图保持像素采样；canvas 改变分辨率会重置此项。
    layer.canvas.getContext('2d').imageSmoothingEnabled = false;
    updateGuides();
    get('viewport-info').textContent = `${viewport.mode === 'fit' ? '全图' : '工作视口'} · ${Math.round(viewport.scale * 100)}%`;
    get('zoom-percent').value = String(Math.round(viewport.scale * 1000) / 10);
    get('fit-map').setAttribute('aria-pressed', String(viewport.mode === 'fit'));
    get('native-size').setAttribute('aria-pressed', String(viewport.mode === 'work' && viewport.scale === 1));
  }

  function commitScene(next, resetViewport = false) {
    if (!layer) {
      spriteScene = new window.spritejs.Scene({ container, width: viewport.width, height: viewport.height, mode: 'static' });
      layer = spriteScene.layer('map', { handleEvent: false, contextType: '2d' });
    }
    if (currentScene?.root !== next.root) {
      layer.append(next.root);
      if (currentScene) currentScene.root.remove();
    }
    currentScene = next;
    if (resetViewport || !viewport.center) {
      viewport.center = [...next.mapCenter];
      viewport.scale = 1;
      viewport.mode = 'work';
    }
    updateViewport();
    updateAnimation(player.elapsed());
    cameraAngle = next.view.angle;
    if (!next.entities.some(entity => entity.id === selectedEntityId)) selectedEntityId = null;
    updateSelection();
    get('map-id').textContent = next.map.id;
    get('map-summary').textContent = `${next.map.cells.length} 行 × ${next.map.cells[0].length} 列 · ${next.map.cells.flat().filter(Boolean).length} 有效格 · ${next.entities.length} 实体`;
    document.querySelectorAll('[data-angle]').forEach(button => button.setAttribute('aria-pressed', String(Number(button.dataset.angle) === cameraAngle)));
    updateControls();
    updatePlaybackControls();
  }

  function updateControls() {
    controls.disabled = !currentScene || Boolean(stroke || pan);
    get('undo').disabled = !undoStack.length || Boolean(stroke);
    get('redo').disabled = !redoStack.length || Boolean(stroke);
    get('cancel-stroke').disabled = !stroke;
    for (const id of ['pick-mode', 'clear-selection']) get(id).disabled = !currentScene || Boolean(stroke || pan);
    for (const id of ['save-map', 'read-map', 'map-file', 'map-sample', 'reload']) {
      get(id).disabled = Boolean(stroke || pan) || (!currentScene && ['save-map', 'read-map'].includes(id));
    }
  }

  function clearIssue() {
    issues.hidden = true;
    issues.textContent = '';
  }

  function fail(error) {
    issues.hidden = false;
    issues.textContent = `${error.message}\n修复输入后可重试；原有效地图保持可用。运行方式见 docs/browser-consumption.md。`;
    status.textContent = currentScene ? '加载失败 · 保留上次有效地图与选择' : '加载失败 · 当前无地图';
  }

  async function reload() {
    cancelGesture();
    const requestId = ++loadRequestId;
    clearIssue();
    status.textContent = currentScene ? '正在加载… · 仍显示上次有效地图' : '正在加载地图与素材…';
    try {
      if (window.location.protocol === 'file:') throw new Error('本页需要 HTTP 服务');
      if (!window.qtiledElementRendering?.resolveElementFrame || !window.qtiledElementRendering?.updateElementFrame || !window.qtiledMaps?.importMapDefinition || !window.landWaterRules || !window.qtiledView || !window.spritejs || typeof getPointerPosition !== 'function' || typeof getDogElementSample !== 'function') {
        throw new Error('运行包缺失或过期；仓库 Demo 请先执行 npm run debug，独立目录请按 docs/browser-consumption.md 重新准备');
      }
      const { loadElementSources, importElementDefinition } = window.qtiledElementRendering;
      // 复用 Demo 的样本配置；重载绕过图片缓存，修复文件后可恢复。
      const { directory, sourceFiles } = getDogElementSample(`${Date.now()}-${requestId}`);
      const elementUrl = new URL(`${directory}element.json`, document.baseURI);
      const mapUrl = new URL(`./static/map-samples/${get('map-sample').value}.json`, document.baseURI);
      const [elementJson, mapJson, terrainJson, rulesJson, images] = await Promise.all([
        readText(elementUrl), readText(mapUrl),
        readText(new URL(`${terrainDirectory}elements.json`, document.baseURI)),
        readText(new URL(`${terrainDirectory}rules.json`, document.baseURI)),
        loadElementSources({ ...sourceFiles, 'atlas.png': `${terrainDirectory}atlas.png?reload=${requestId}-${Date.now()}` }),
      ]);
      if (requestId !== loadRequestId) return;
      requireSuccess(images);
      const element = requireSuccess(importElementDefinition(elementJson, images.sourceInfo)).definition;
      const elementsById = JSON.parse(terrainJson);
      Object.entries(elementsById).forEach(([id, definition]) => {
        requireSuccess({ issues: window.qtiledElementRendering.validateElementDefinition(definition, images.sourceInfo) });
        if (id !== definition.id) throw new Error(`地表素材键 ${id} 与定义 ID 不一致`);
      });
      elementsById[element.id] = element;
      const rules = JSON.parse(rulesJson);
      const imported = requireSuccess(window.qtiledMaps.importMapDefinition(mapJson, elementsById));
      // 地图、索引、图片与独立绘制树全部准备成功后一次替换；失败不触碰 currentScene。
      const next = prepareScene({ map: imported.definition, occupancyIndex: imported.index, elementsById, sources: images.sources, rules }, cameraAngle);
      undoStack.length = 0;
      redoStack.length = 0;
      const firstLoad = !currentScene;
      commitScene(next, true);
      if (firstLoad) player.play();
      updatePlaybackControls();
      status.textContent = '已加载 · 选择陆地或水域笔刷开始绘制';
    } catch (error) {
      if (requestId === loadRequestId) fail(error);
    }
  }

  document.querySelectorAll('[data-angle]').forEach(button => button.addEventListener('click', () => {
    if (!currentScene || stroke || pan) return;
    try { commitScene(prepareScene(currentScene, Number(button.dataset.angle))); }
    catch (error) { fail(error); }
  }));
  function clearSelection() {
    selectedGrid = null;
    selectedEntityId = null;
    if (currentScene) updateSelection();
  }
  get('clear-selection').addEventListener('click', clearSelection);
  get('pick-mode').addEventListener('change', clearSelection);
  container.addEventListener('click', event => {
    if (suppressClick) { suppressClick = false; return; }
    if (!currentScene || get('edit-tool').value !== 'select') return;
    selectedGrid = gridAt(event);
    // A4 索引中同格候选按地图 entities 顺序排列；不根据图片画序猜选中项。
    const candidates = currentScene.occupancyIndex.get(selectedGrid.join(',')) || [];
    selectedEntityId = get('pick-mode').value === 'entity' ? candidates[0] || null : null;
    updateSelection();
  });
  function gridAt(event, scene = currentScene) {
    const pixel = getPointerPosition(event, container).map((value, axis) => (value - scene.viewportOrigin[axis]) / scene.viewportScale);
    return window.qtiledView.pickGrid(pixel, scene.view);
  }

  function releasePointer(pointerId) {
    if (container.hasPointerCapture?.(pointerId)) container.releasePointerCapture(pointerId);
  }

  function movePan(event) {
    if (!pan || event.pointerId !== pan.pointerId) return;
    const pixel = getPointerPosition(event, container);
    const [dx, dy] = pixel.map((value, axis) => (value - pan.start[axis]) / pan.scale);
    // 用现有投影的两个基向量反解连续位移，不把平移量舍入成整数格。
    const [ax, ay] = window.qtiledView.projectGrid([1, 0], currentScene.view);
    const [bx, by] = window.qtiledView.projectGrid([0, 1], currentScene.view);
    const det = ax * by - ay * bx;
    viewport.center = [pan.center[0] - (dx * by - dy * bx) / det, pan.center[1] - (ax * dy - ay * dx) / det];
    updateViewport();
  }

  function cancelPan() {
    if (!pan) return;
    const previous = pan;
    pan = null;
    viewport.center = previous.center;
    viewport.scale = previous.scale;
    viewport.mode = previous.mode;
    container.dataset.panning = 'false';
    releasePointer(previous.pointerId);
    updateViewport();
    updateControls();
    status.textContent = '已取消平移 · 地图未改变';
  }

  function cancelGesture(event) {
    const active = pan || stroke;
    if (event?.pointerId !== undefined && active && event.pointerId !== active.pointerId) return;
    cancelPan();
    cancelStroke();
  }

  get('edit-tool').addEventListener('change', () => {
    cancelGesture();
    updateToolHelp();
  });
  for (const id of ['show-grid', 'show-coordinates']) get(id).addEventListener('change', updateGuides);
  get('fit-map').addEventListener('click', () => {
    if (!currentScene || stroke || pan) return;
    viewport.center = [...currentScene.mapCenter];
    viewport.mode = 'fit';
    updateViewport();
  });
  get('native-size').addEventListener('click', () => {
    if (!currentScene || stroke || pan) return;
    viewport.mode = 'work';
    viewport.scale = 1;
    updateViewport();
  });
  function changeZoom() {
    if (!currentScene || stroke || pan) return;
    const percent = Number(get('zoom-percent').value);
    if (!Number.isFinite(percent) || percent < 10 || percent > 400) {
      get('zoom-percent').value = String(Math.round(viewport.scale * 1000) / 10);
      status.textContent = '缩放比例需在 10%～400% 之间 · 已保留原比例';
      return;
    }
    viewport.mode = 'work';
    viewport.scale = percent / 100;
    updateViewport();
    status.textContent = `已缩放至 ${percent}% · 视口中心保持不变`;
  }
  get('zoom-percent').addEventListener('change', changeZoom);
  get('zoom-percent').addEventListener('keydown', event => {
    if (event.key === 'Enter') { event.preventDefault(); changeZoom(); }
  });

  function resizeViewport() {
    const width = container.clientWidth;
    const height = container.clientHeight;
    if (!width || !height || (width === viewport.width && height === viewport.height)) return;
    // 坐标系改变前撤回在途手势，不能用新尺寸解释旧的一笔。
    cancelGesture();
    viewport.width = width;
    viewport.height = height;
    if (spriteScene) {
      Object.assign(spriteScene.options, { width, height });
      spriteScene.resize();
    }
    updateViewport();
  }
  const resizeObserver = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(resizeViewport);
  if (resizeObserver) resizeObserver.observe(container);
  else window.addEventListener('resize', resizeViewport);

  function cancelStroke() {
    if (!stroke) return;
    const { base, pointerId } = stroke;
    stroke = null;
    releasePointer(pointerId);
    commitScene(base);
    clearIssue();
    status.textContent = '已取消整笔 · 地图未改变';
  }

  function previewStroke(event) {
    if (!stroke || stroke.failed || event.pointerId !== stroke.pointerId) return;
    const grid = gridAt(event, stroke.base);
    if (stroke.last && grid.every((value, axis) => value === stroke.last[axis])) return;
    const from = stroke.last || grid;
    const steps = Math.max(Math.abs(grid[0] - from[0]), Math.abs(grid[1] - from[1]), 1);
    const previousSize = stroke.grids.size;
    // 补齐快速拖动跳过的格子；只在增加新格时预览，命令仍校验并去重外部输入。
    for (let i = 1; i <= steps; i++) {
      const nextGrid = [Math.round(from[0] + (grid[0] - from[0]) * i / steps), Math.round(from[1] + (grid[1] - from[1]) * i / steps)];
      stroke.grids.set(nextGrid.join(','), nextGrid);
    }
    stroke.last = grid;
    if (stroke.grids.size === previousSize) return;
    try {
      const { base, grids, terrain } = stroke;
      const result = requireSuccess(window.landWaterRules.applyStroke(base.map, { terrain, grids: [...grids.values()] }, base.elementsById, base.rules, cameraAngle));
      const occupancy = requireSuccess(window.qtiledMaps.buildMapOccupancy(result.definition, base.elementsById));
      const next = prepareScene({ ...base, map: result.definition, occupancyIndex: occupancy.index }, cameraAngle, result.tiles);
      stroke.candidate = next;
      commitScene(next);
      clearIssue();
      status.textContent = `整笔预览 · ${grids.size} 格 · 松开提交 / Esc 取消`;
    } catch (error) {
      stroke.failed = true;
      commitScene(stroke.base);
      issues.hidden = false;
      issues.textContent = error.message;
      status.textContent = '整笔无效 · 已恢复原地图，松开结束或 Esc 取消';
    }
  }

  container.addEventListener('pointerdown', event => {
    suppressClick = false;
    if (!currentScene || stroke || pan) return;
    const tool = get('edit-tool').value;
    if (event.button === 1 || (event.button === 0 && tool === 'pan')) {
      event.preventDefault();
      ++loadRequestId;
      pan = { start: getPointerPosition(event, container), center: [...viewport.center],
        scale: viewport.scale, mode: viewport.mode, pointerId: event.pointerId };
      viewport.mode = 'work';
      container.dataset.panning = 'true';
      container.setPointerCapture?.(event.pointerId);
      updateViewport();
      updateControls();
      status.textContent = '正在平移 · 松开结束 / Esc 取消';
      return;
    }
    if (event.button !== 0 || !['land', 'water'].includes(tool)) return;
    event.preventDefault();
    ++loadRequestId; // 新编辑不能被较早的异步读取覆盖。
    // 从全图开始编辑时保持当前缩放，避免新增岸线改变外框导致笔尖漂移。
    viewport.mode = 'work';
    stroke = { base: currentScene, terrain: tool, grids: new Map(), pointerId: event.pointerId };
    container.setPointerCapture?.(event.pointerId);
    previewStroke(event);
  });
  container.addEventListener('pointermove', event => { movePan(event); previewStroke(event); });
  container.addEventListener('pointerup', event => {
    if (pan && event.pointerId === pan.pointerId) {
      movePan(event);
      pan = null;
      suppressClick = true;
      container.dataset.panning = 'false';
      releasePointer(event.pointerId);
      updateControls();
      status.textContent = '已平移 · 地图未改变';
      return;
    }
    if (!stroke || event.pointerId !== stroke.pointerId) return;
    previewStroke(event);
    const { base, candidate, failed } = stroke;
    stroke = null;
    releasePointer(event.pointerId);
    if (!failed && candidate && JSON.stringify(base.map) !== JSON.stringify(candidate.map)) {
      undoStack.push(base.map);
      redoStack.length = 0;
      status.textContent = '已提交整笔 · 可撤销';
    } else {
      commitScene(base);
      status.textContent = failed ? '整笔已拒绝 · 地图未改变' : '地形未改变';
    }
    updateControls();
  });
  container.addEventListener('auxclick', event => { if (event.button === 1) event.preventDefault(); });
  container.addEventListener('pointercancel', cancelGesture);
  container.addEventListener('lostpointercapture', cancelGesture);
  window.addEventListener('blur', cancelGesture);
  document.addEventListener('keydown', event => { if (event.key === 'Escape') cancelGesture(); });
  get('cancel-stroke').addEventListener('click', cancelStroke);

  function restoreHistory(from, to) {
    if (!currentScene || stroke || pan || !from.length) return;
    try {
      const map = from[from.length - 1];
      const occupancy = requireSuccess(window.qtiledMaps.buildMapOccupancy(map, currentScene.elementsById));
      const next = prepareScene({ ...currentScene, map, occupancyIndex: occupancy.index }, cameraAngle);
      ++loadRequestId;
      to.push(currentScene.map);
      from.pop();
      commitScene(next);
      clearIssue();
      status.textContent = '已恢复整笔地图';
    } catch (error) { fail(error); }
  }
  get('undo').addEventListener('click', () => restoreHistory(undoStack, redoStack));
  get('redo').addEventListener('click', () => restoreHistory(redoStack, undoStack));

  function readMap(json) {
    if (!currentScene || stroke || pan) return;
    const imported = requireSuccess(window.qtiledMaps.importMapDefinition(json, currentScene.elementsById));
    const next = prepareScene({ ...currentScene, map: imported.definition, occupancyIndex: imported.index }, cameraAngle);
    undoStack.push(currentScene.map);
    redoStack.length = 0;
    commitScene(next, true);
    clearIssue();
    status.textContent = '已读取地图 · 可撤销';
  }
  get('read-map').addEventListener('click', () => {
    ++loadRequestId;
    try { readMap(get('map-json').value); } catch (error) { fail(error); }
  });
  get('map-file').addEventListener('change', async event => {
    const file = event.target.files[0];
    if (!file || !currentScene || stroke || pan) return;
    const requestId = ++loadRequestId;
    try {
      const json = await file.text();
      if (requestId === loadRequestId) readMap(json);
    } catch (error) { if (requestId === loadRequestId) fail(error); }
    finally { event.target.value = ''; }
  });
  get('save-map').addEventListener('click', () => {
    if (!currentScene || stroke || pan) return;
    try {
      const { json } = requireSuccess(window.qtiledMaps.exportMapDefinition(currentScene.map, currentScene.elementsById));
      get('map-json').value = json;
      const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `${currentScene.map.id}.json`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 0);
      clearIssue();
      status.textContent = '已保存地图 · 只保存事实，岸线与变体可重建';
    } catch (error) { fail(error); }
  });
  get('play-animation').addEventListener('click', () => {
    if (player.playing) player.pause(); else player.play();
    updatePlaybackControls();
  });
  get('restart-animation').addEventListener('click', () => { player.reset(); updatePlaybackControls(); });
  let resumePlayback = false;
  window.addEventListener('pagehide', event => {
    cancelGesture();
    resumePlayback = event.persisted && player.playing;
    if (event.persisted) {
      player.pause();
      return;
    }
    player.dispose();
    resizeObserver?.disconnect();
    window.removeEventListener('resize', resizeViewport);
  });
  window.addEventListener('pageshow', event => {
    if (!event.persisted) return;
    if (resumePlayback) player.play();
    resumePlayback = false;
    resizeViewport();
    updatePlaybackControls();
  });
  get('map-sample').addEventListener('change', reload);
  get('reload').addEventListener('click', reload);
  updateToolHelp();
  reload();
})();
