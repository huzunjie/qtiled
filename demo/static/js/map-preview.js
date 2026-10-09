/* 固定样本的只读消费者；地图与元素解释仍由可选模块负责。 */
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
  let root;
  let selectionGroup;
  let loaded;
  let entities = [];
  let view;
  let viewportOrigin;
  let angle = 0;
  let selectedGrid = null;
  let selectedId = null;
  let loadVersion = 0;

  function showIssues(label, list) {
    if (list.length) throw new Error(`${label}\n${list.map(item => `${item.path}：${item.message}`).join('\n')}`);
  }

  async function readJson(url, label) {
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) throw new Error(`${label}加载失败（HTTP ${response.status}）：${url.pathname}`);
    try { return await response.json(); }
    catch (error) { throw new Error(`${label}不是有效 JSON：${url.pathname}`); }
  }

  function clear() {
    if (root) root.remove();
    root = null;
    selectionGroup = null;
    loaded = null;
    entities = [];
    selectedGrid = null;
    selectedId = null;
    controls.disabled = true;
    ['map-id', 'map-summary', 'view-info', 'cell-grid', 'cell-info', 'entity-id', 'entity-source', 'entity-pose', 'entity-footprint']
      .forEach(id => { get(id).textContent = '—'; });
  }

  function showSelection() {
    get('cell-grid').textContent = selectedGrid ? JSON.stringify(selectedGrid) : '—';
    const cell = selectedGrid && loaded.map.cells[selectedGrid[1]]?.[selectedGrid[0]];
    get('cell-info').textContent = !selectedGrid ? '点击画布查看' : cell === null ? 'null · 无效空角'
      : cell ? `terrain: ${cell.terrain}\nelevation: ${cell.elevation}\ntile: ${cell.tile || '未贴图'}` : '地图矩阵之外';
    const entity = entities.find(item => item.id === selectedId);
    get('entity-id').textContent = entity ? entity.id : '—';
    get('entity-source').textContent = entity ? `${entity.element}\n${entity.draw.source}` : '—';
    get('entity-pose').textContent = entity ? `${JSON.stringify(entity.grid)} / ${entity.angle}°` : '—';
    get('entity-footprint').textContent = entity ? entity.draw.footprint.map(item => JSON.stringify(item.grid)).join(' ') : '—';
  }

  function renderScene() {
    const { Group, Polyline, Label } = window.spritejs;
    const { shapes } = window.qtiled;
    const { projectGrid } = window.qtiledView;
    const { map, elementsById, sources } = loaded;
    // 先由共享解析器校验，成功后才访问 cells；不另做一遍地图校验。
    const result = window.qtiledMaps.resolveMapEntities(map, elementsById, { angle });
    showIssues('地图实体解析失败', result.issues);
    entities = result.entities;
    view = { angle, tileSize: map.tileSize, originPixel: [0, 0] };
    const cells = map.cells.flatMap((row, y) => row.map((cell, x) => ({ cell, grid: [x, y] })));
    const vertexes = shapes.rhombus.getVertexes(map.tileSize);
    const bounds = shapes.polygon.getBounds(cells.map(item => projectGrid(item.grid, view)), vertexes);
    viewportOrigin = [320 - (bounds.minX + bounds.maxX) / 2, 240 - (bounds.minY + bounds.maxY) / 2];
    // 显示平移交给场景容器；元素与格子共用零原点投影，无需再次解析实体。
    const next = new Group({ pos: viewportOrigin });
    cells.forEach(({ cell, grid }) => {
      const pos = projectGrid(grid, view);
      next.append(new Polyline({ pos, points: vertexes, close: true,
        fillColor: cell ? '#e0edd9' : '#e9edf1', strokeColor: cell ? '#829b76' : '#b2bcc6',
        lineWidth: 1, lineDash: cell ? [] : [4, 4] }));
      next.append(new Label({ text: grid.join(','), pos, anchor: [0.5, 0.5], font: '11px sans-serif', fillColor: cell ? '#63765a' : '#8994a0' }));
    });
    // 本样本仅两个不重叠矩形：按占地最下端由远到近绘制，不作为通用遮挡算法。
    const depth = entity => Math.max(...entity.draw.footprint.map(item => item.position[1]));
    [...entities].sort((a, b) => depth(a) - depth(b)).forEach(entity => {
      // 适配器每个容器只管理一个元素绘制组；实例各有自己的容器，避免互相替换。
      const holder = new Group();
      window.qtiledElementRendering.renderElement(holder, entity.draw, sources, { footprint: false, placement: false });
      next.append(holder);
      const footprintBounds = shapes.polygon.getBounds(entity.draw.footprint.map(item => item.position), vertexes);
      next.append(new Label({ text: entity.id, pos: [(footprintBounds.minX + footprintBounds.maxX) / 2, footprintBounds.maxY + 10],
        anchor: [0.5, 0.5], font: '12px sans-serif', fillColor: '#425466' }));
    });
    if (root) root.remove();
    root = next;
    selectionGroup = null;
    updateSelection();
    layer.append(root);
    document.querySelectorAll('[data-angle]').forEach(button => button.setAttribute('aria-pressed', String(Number(button.dataset.angle) === angle)));
    get('view-info').textContent = `${map.tileSize.join(' × ')} px / ${angle}°`;
  }

  function updateSelection() {
    const { Group, Polyline } = window.spritejs;
    const { map } = loaded;
    const vertexes = window.qtiled.shapes.rhombus.getVertexes(map.tileSize);
    if (selectionGroup) selectionGroup.remove();
    selectionGroup = new Group();
    const selectedEntity = entities.find(item => item.id === selectedId);
    const highlight = selectedEntity ? selectedEntity.draw.footprint.map(item => item.grid) : selectedGrid ? [selectedGrid] : [];
    highlight.forEach(grid => {
      if (map.cells[grid[1]]?.[grid[0]] === undefined) return;
      selectionGroup.append(new Polyline({ pos: window.qtiledView.projectGrid(grid, view), points: vertexes, close: true,
        strokeColor: '#1976b5', fillColor: 'rgba(25, 118, 181, .18)', lineWidth: 2 }));
    });
    root.append(selectionGroup);
    showSelection();
  }

  function fail(error) {
    clear();
    issues.hidden = false;
    issues.textContent = `${error.message}\n修复对应文件后点击“重新加载”。请通过 HTTP 服务打开本页。`;
    status.textContent = '加载失败 · 当前无地图';
  }

  async function reload() {
    const version = ++loadVersion;
    clear();
    issues.hidden = true;
    issues.textContent = '';
    status.textContent = '正在加载地图与素材…';
    try {
      if (!window.qtiledMaps || !window.qtiledElementRendering || !window.qtiledView || !window.qtiled || !window.spritejs) {
        throw new Error('缺少 Demo 运行包，请先在项目目录执行 npm run debug');
      }
      const { directory, sourceFiles } = getDogElementSample(`${Date.now()}-${version}`);
      const elementUrl = new URL(`${directory}element.json`, document.baseURI);
      const [map, definition, images] = await Promise.all([
        readJson(mapUrl, '地图'), readJson(elementUrl, '元素定义'), window.qtiledElementRendering.loadElementSources(sourceFiles),
      ]);
      if (version !== loadVersion) return;
      showIssues('图片加载失败', images.issues);
      showIssues('元素定义无效', window.qtiledElementRendering.validateElementDefinition(definition, images.sourceInfo));
      const elementsById = { [definition.id]: definition };
      if (!layer) {
        const scene = new window.spritejs.Scene({ container, width: 640, height: 440, mode: 'static' });
        layer = scene.layer('map', { handleEvent: false, contextType: '2d' });
      }
      loaded = { map, elementsById, sources: images.sources };
      renderScene();
      get('map-id').textContent = map.id;
      get('map-summary').textContent = `${map.cells.length} 行 × ${map.cells[0].length} 列 · ${map.cells.flat().filter(Boolean).length} 有效格 · ${entities.length} 实体`;
      controls.disabled = false;
      status.textContent = '已加载 · 点击地面格子查看';
    } catch (error) {
      if (version === loadVersion) fail(error);
    }
  }

  document.querySelectorAll('[data-angle]').forEach(button => button.addEventListener('click', () => {
    if (!loaded) return;
    angle = Number(button.dataset.angle);
    try { renderScene(); } catch (error) { fail(error); }
  }));
  get('pick-mode').addEventListener('change', () => {
    selectedGrid = null;
    selectedId = null;
    if (loaded) updateSelection();
  });
  container.addEventListener('click', event => {
    if (!loaded) return;
    selectedGrid = window.qtiledView.pickGrid(getPointerPosition(event, container), { ...view, originPixel: viewportOrigin });
    const match = get('pick-mode').value === 'entity' && entities.find(entity => entity.draw.footprint.some(({ grid }) => grid[0] === selectedGrid[0] && grid[1] === selectedGrid[1]));
    selectedId = match ? match.id : null;
    updateSelection();
  });
  get('reload').addEventListener('click', reload);
  reload();
})();
