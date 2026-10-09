/* 固定样本的只读消费者；Demo 与正式产物隔离验收共用本页逻辑。 */
(function() {
  const get = id => document.getElementById(id);
  const container = get('map-canvas');
  const controls = get('controls');
  const status = get('status');
  const issues = get('issues');
  const mapUrl = new URL('./static/map-samples/first-static-map.json', document.baseURI);
  const navigation = document.querySelector('.navs');
  if (navigation) navigation.classList.add('closed');
  let layer;
  let currentScene;
  let selectedGrid = null;
  let selectedEntityId = null;
  let cameraAngle = 0;
  let loadRequestId = 0;

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
    get('cell-info').textContent = !selectedGrid ? '点击画布查看' : cell === null ? 'null · 无效空角'
      : cell ? `terrain: ${cell.terrain}\nelevation: ${cell.elevation}\ntile: ${cell.tile || '未贴图'}` : '地图矩阵之外';
    get('entity-id').textContent = entity ? entity.id : '—';
    get('entity-source').textContent = entity ? `${entity.element}\n${entity.draw.source}` : '—';
    get('entity-pose').textContent = entity ? `${JSON.stringify(entity.grid)} / ${entity.angle}°` : '—';
    get('entity-footprint').textContent = entity ? entity.draw.footprint.map(item => JSON.stringify(item.grid)).join(' ') : '—';
    get('view-info').textContent = `${map.tileSize.join(' × ')} px / ${view.angle}°`;
  }

  function prepareScene(mapState, nextAngle) {
    const { Group, Polyline, Label } = window.spritejs;
    const { projectGrid } = window.qtiledView;
    const { map, elementsById, sources } = mapState;
    const view = { angle: nextAngle, tileSize: map.tileSize, originPixel: [0, 0] };
    const { entities } = requireSuccess(window.qtiledMaps.resolveMapEntities(map, elementsById, view));
    const cells = map.cells.flatMap((row, y) => row.map((cell, x) => ({ cell, grid: [x, y] })));
    const positions = cells.map(({ grid }) => projectGrid(grid, view));
    // 对称菱形围绕格心；这里只需固定画布居中，不引入核心包或视图缩放。
    const xs = positions.map(pos => pos[0]);
    const ys = positions.map(pos => pos[1]);
    const viewportOrigin = [320 - (Math.min(...xs) + Math.max(...xs)) / 2, 240 - (Math.min(...ys) + Math.max(...ys)) / 2];
    const [width, height] = map.tileSize;
    const vertexes = [[0, -height / 2], [width / 2, 0], [0, height / 2], [-width / 2, 0]];
    const root = new Group({ pos: viewportOrigin });
    const ground = new Group();
    const objects = new Group();
    root.append(ground, objects);
    cells.forEach(({ cell, grid }, index) => {
      if (cell === null) return;
      const pos = positions[index];
      ground.append(new Polyline({ pos, points: vertexes, close: true,
        fillColor: '#e0edd9', strokeColor: '#829b76', lineWidth: 1 }));
      ground.append(new Label({ text: grid.join(','), pos, anchor: [0.5, 0.5], font: '11px sans-serif', fillColor: '#63765a' }));
    });
    // 只为当前不重叠样本按占地下端排列，不作为通用画序或像素命中规则。
    const depth = entity => Math.max(...entity.draw.footprint.map(item => item.position[1]));
    [...entities].sort((a, b) => depth(a) - depth(b)).forEach(entity => {
      // renderElement 每个容器管理一个元素绘制组；共享定义的实例也必须各用独立容器。
      const holder = new Group();
      window.qtiledElementRendering.renderElement(holder, entity.draw, sources, { footprint: false, placement: false });
      objects.append(holder);
      const points = entity.draw.footprint.map(item => item.position);
      const x = (Math.min(...points.map(pos => pos[0])) + Math.max(...points.map(pos => pos[0]))) / 2;
      objects.append(new Label({ text: entity.id, pos: [x, depth(entity) + height / 2 + 10],
        anchor: [0.5, 0.5], font: '12px sans-serif', fillColor: '#425466' }));
    });
    return { ...mapState, root, entities, view, vertexes, viewportOrigin, selection: null };
  }

  function commitScene(next) {
    if (!layer) {
      const scene = new window.spritejs.Scene({ container, width: 640, height: 440, mode: 'static' });
      layer = scene.layer('map', { handleEvent: false, contextType: '2d' });
    }
    layer.append(next.root);
    if (currentScene) currentScene.root.remove();
    currentScene = next;
    cameraAngle = next.view.angle;
    if (!next.entities.some(entity => entity.id === selectedEntityId)) selectedEntityId = null;
    updateSelection();
    get('map-id').textContent = next.map.id;
    get('map-summary').textContent = `${next.map.cells.length} 行 × ${next.map.cells[0].length} 列 · ${next.map.cells.flat().filter(Boolean).length} 有效格 · ${next.entities.length} 实体`;
    document.querySelectorAll('[data-angle]').forEach(button => button.setAttribute('aria-pressed', String(Number(button.dataset.angle) === cameraAngle)));
    controls.disabled = false;
  }

  function fail(error) {
    issues.hidden = false;
    issues.textContent = `${error.message}\n修复对应文件后点击“重新加载”。请通过 HTTP 打开本页，运行方式见 docs/browser-consumption.md。`;
    status.textContent = currentScene ? '加载失败 · 保留上次有效地图与选择' : '加载失败 · 当前无地图';
  }

  async function reload() {
    const requestId = ++loadRequestId;
    issues.hidden = true;
    issues.textContent = '';
    status.textContent = currentScene ? '正在加载… · 仍显示上次有效地图' : '正在加载地图与素材…';
    try {
      if (window.location.protocol === 'file:') throw new Error('本页需要 HTTP 服务');
      if (!window.qtiledElementRendering || !window.qtiledMaps?.importMapDefinition || !window.qtiledView || !window.spritejs || typeof getPointerPosition !== 'function' || typeof getDogElementSample !== 'function') {
        throw new Error('运行包缺失或过期；仓库 Demo 请先执行 npm run debug，独立目录请按 docs/browser-consumption.md 重新准备');
      }
      const { loadElementSources, importElementDefinition } = window.qtiledElementRendering;
      // 复用 Demo 的样本配置；重载绕过图片缓存，修复文件后可恢复。
      const { directory, sourceFiles } = getDogElementSample(`${Date.now()}-${requestId}`);
      const elementUrl = new URL(`${directory}element.json`, document.baseURI);
      const [elementJson, mapJson, images] = await Promise.all([
        readText(elementUrl), readText(mapUrl), loadElementSources(sourceFiles),
      ]);
      if (requestId !== loadRequestId) return;
      requireSuccess(images);
      const element = requireSuccess(importElementDefinition(elementJson, images.sourceInfo)).definition;
      const elementsById = { [element.id]: element };
      const imported = requireSuccess(window.qtiledMaps.importMapDefinition(mapJson, elementsById));
      // 地图、索引、图片与独立绘制树全部准备成功后一次替换；失败不触碰 currentScene。
      const next = prepareScene({ map: imported.definition, occupancyIndex: imported.index, elementsById, sources: images.sources }, cameraAngle);
      commitScene(next);
      status.textContent = '已加载 · 点击地面占地选择雕塑';
    } catch (error) {
      if (requestId === loadRequestId) fail(error);
    }
  }

  document.querySelectorAll('[data-angle]').forEach(button => button.addEventListener('click', () => {
    if (!currentScene) return;
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
    if (!currentScene) return;
    selectedGrid = window.qtiledView.pickGrid(getPointerPosition(event, container), { ...currentScene.view, originPixel: currentScene.viewportOrigin });
    // A4 索引中同格候选按地图 entities 顺序排列；不根据图片画序猜选中项。
    const candidates = currentScene.occupancyIndex.get(selectedGrid.join(',')) || [];
    selectedEntityId = get('pick-mode').value === 'entity' ? candidates[0] || null : null;
    updateSelection();
  });
  get('reload').addEventListener('click', reload);
  reload();
})();
