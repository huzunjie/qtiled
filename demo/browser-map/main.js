/* 按 docs/browser-consumption.md 准备独立 HTTP 目录，只消费正式 UMD 与声明的资源。 */
(function() {
  const get = id => document.getElementById(id);
  const container = get('map-canvas');
  const controls = get('controls');
  const status = get('status');
  const issues = get('issues');
  let layer;
  let current;
  let selectedGrid = null;
  let selectedId = null;
  let angle = 0;
  let loadVersion = 0;

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
    const { map, entities, view, vertexes, root } = current;
    const entity = entities.find(item => item.id === selectedId);
    const next = new Group();
    if (entity) entity.draw.footprint.forEach(({ position }) => {
      next.append(new Polyline({ pos: position, points: vertexes, close: true,
        strokeColor: '#1976b5', fillColor: 'rgba(25, 118, 181, .18)', lineWidth: 2 }));
    });
    if (current.selection) current.selection.remove();
    root.append(next);
    current.selection = next;
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

  function prepareScene(loaded, nextAngle) {
    const { Group, Polyline, Label } = window.spritejs;
    const { projectGrid } = window.qtiledView;
    const { map, elementsById, sources } = loaded;
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
    return { ...loaded, root, entities, view, vertexes, viewportOrigin, selection: null };
  }

  function commitScene(next) {
    if (!layer) {
      const scene = new window.spritejs.Scene({ container, width: 640, height: 440, mode: 'static' });
      layer = scene.layer('map', { handleEvent: false, contextType: '2d' });
    }
    layer.append(next.root);
    if (current) current.root.remove();
    current = next;
    angle = next.view.angle;
    if (!next.entities.some(entity => entity.id === selectedId)) selectedId = null;
    updateSelection();
    get('map-id').textContent = next.map.id;
    get('map-summary').textContent = `${next.map.cells.length} 行 × ${next.map.cells[0].length} 列 · ${next.map.cells.flat().filter(Boolean).length} 有效格 · ${next.entities.length} 实体`;
    document.querySelectorAll('[data-angle]').forEach(button => button.setAttribute('aria-pressed', String(Number(button.dataset.angle) === angle)));
    controls.disabled = false;
  }

  function fail(error) {
    issues.hidden = false;
    issues.textContent = `${error.message}\n修复对应文件后点击“重新加载”。首次运行请按 docs/browser-consumption.md 准备依赖并通过 HTTP 打开。`;
    status.textContent = current ? '加载失败 · 保留上次有效地图与选择' : '加载失败 · 当前无地图';
  }

  async function reload() {
    const version = ++loadVersion;
    issues.hidden = true;
    issues.textContent = '';
    status.textContent = current ? '正在加载… · 仍显示上次有效地图' : '正在加载地图与素材…';
    try {
      if (window.location.protocol === 'file:') throw new Error('本页需要 HTTP 服务');
      if (!window.qtiledElementRendering || !window.qtiledMaps || !window.qtiledView || !window.spritejs || typeof getPointerPosition !== 'function') {
        throw new Error('缺少运行依赖，请准备 lib/、vendor/ 与 common/');
      }
      const { loadElementSources, importElementDefinition } = window.qtiledElementRendering;
      // 声明现有狗样本的四张图片；重载绕过图片缓存，修复文件后可恢复。
      const sourceFiles = Object.fromEntries([1, 2, 3, 4].map(number => {
        const path = `images/sculpture_dog0${number}.png`;
        return [path, `./assets/dog/${path}?reload=${Date.now()}-${version}`];
      }));
      const [elementJson, mapJson, images] = await Promise.all([
        readText('./assets/dog/element.json'), readText('./assets/map.json'), loadElementSources(sourceFiles),
      ]);
      if (version !== loadVersion) return;
      requireSuccess(images);
      const element = requireSuccess(importElementDefinition(elementJson, images.sourceInfo)).definition;
      const elementsById = { [element.id]: element };
      const imported = requireSuccess(window.qtiledMaps.importMapDefinition(mapJson, elementsById));
      // 地图、索引、图片与独立绘制树全部准备成功后一次替换；失败不触碰 current。
      const next = prepareScene({ map: imported.definition, index: imported.index, elementsById, sources: images.sources }, angle);
      commitScene(next);
      status.textContent = '已加载 · 点击地面占地选择雕塑';
    } catch (error) {
      if (version === loadVersion) fail(error);
    }
  }

  document.querySelectorAll('[data-angle]').forEach(button => button.addEventListener('click', () => {
    if (!current) return;
    try { commitScene(prepareScene(current, Number(button.dataset.angle))); }
    catch (error) { fail(error); }
  }));
  get('clear-selection').addEventListener('click', () => {
    selectedGrid = null;
    selectedId = null;
    if (current) updateSelection();
  });
  container.addEventListener('click', event => {
    if (!current) return;
    selectedGrid = window.qtiledView.pickGrid(getPointerPosition(event, container), { ...current.view, originPixel: current.viewportOrigin });
    // A4 索引中同格候选按地图 entities 顺序排列；不根据图片画序猜选中项。
    const candidates = current.index.get(selectedGrid.join(',')) || [];
    selectedId = candidates[0] || null;
    updateSelection();
  });
  get('reload').addEventListener('click', reload);
  reload();
})();
