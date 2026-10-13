/* 地图事实与地表绘制的编辑闭环；原作选图规则仅在 Demo 工具层消费。 */
(function() {
  const get = id => document.getElementById(id);
  const { trees, rocks, getTree, getRock, getSources } = window.terrainSample;
  get('tree-kind').replaceChildren(...Object.entries(trees).map(([value, tree]) => {
    const option = document.createElement('option');
    option.value = value; option.textContent = tree.label;
    return option;
  }));
  get('rock-kind').replaceChildren(...Object.entries(rocks).map(([value, rock]) => {
    const option = document.createElement('option');
    option.value = value; option.textContent = rock.label;
    return option;
  }));
  const container = get('map-canvas');
  const status = get('status');
  const issues = get('issues');
  const terrainDirectory = './static/terrain-samples/emperor-land-water/';
  const constructionDirectory = './static/construction-samples/';
  const featureTools = ['ramp', 'half-slope'];
  const roadTools = ['road'];
  const treeTools = ['tree'];
  const elevationDirectory = './static/terrain-samples/emperor-elevation/';
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
  let hoverPointer = null;
  let hoverOverlay = null;
  let hoverKey = null;
  let brushKey = null;
  let brushOffsets = [];
  const brushTools = ['land', 'water', 'raise-two', 'raise', 'lower', 'lower-two', 'clear', 'rock', ...treeTools];
  // 相机只属于当前页面，不写入地图事实或撤销记录；中心允许位于半格。
  const viewport = { width: container.clientWidth || 640, height: container.clientHeight || 440,
    center: null, baseHeight: 0, scale: 1, mode: 'work' };
  const undoStack = [];
  const redoStack = [];
  const player = createElementAnimationPlayer(updateAnimation);

  function projectCell(grid, scene) {
    const point = window.qtiledView.projectGrid(grid, scene.view);
    if (!scene.flatEditing) point[1] -= (scene.map.cells[grid[1]]?.[grid[0]]?.elevation || 0) * (scene.map.elevationStep || 0);
    return point;
  }

  // 高程拾取按实际绘制的透明像素和前后关系；素材像素只读取一次，不从图片包围框猜命中。
  function readSourcePixels(sources) {
    const pixels = {};
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d', { willReadFrequently: true });
    for (const [id, source] of Object.entries(sources)) {
      canvas.width = source.naturalWidth || source.width;
      canvas.height = source.naturalHeight || source.height;
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(source, 0, 0);
      pixels[id] = context.getImageData(0, 0, canvas.width, canvas.height);
    }
    return pixels;
  }

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
    get('water-frame').hidden = !item;
    get('water-frame-label').hidden = !item;
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
        pos: projectCell(grid, currentScene), points: vertexes, close: true,
        strokeColor: 'rgba(20, 45, 53, .45)', lineWidth: 1,
      })));
      currentScene.guideScale = null;
    }
    if (showCoordinates && readable && !coordinateOverlay.children.length) {
      tiles.forEach(({ grid }) => coordinateOverlay.append(new Label({
        text: grid.join(','), pos: projectCell(grid, currentScene), anchor: [0.5, 0.5],
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
    document.querySelectorAll('[data-tool]').forEach(button => {
      if (button === container) return;
      const active = button.dataset.tool === tool && (!button.dataset.pickMode || button.dataset.pickMode === get('pick-mode').value);
      button.setAttribute('aria-pressed', String(active));
      if (active) get('current-tool').textContent = button.textContent;
    });
    get('building-control').hidden = tool !== 'building';
    get('tree-control').hidden = tool !== 'tree';
    get('rock-control').hidden = tool !== 'rock';
    get('brush-size-control').hidden = !brushTools.includes(tool);
    updateBrushParameters();
    get('click-help').textContent = {
      select: get('pick-mode').value === 'cell'
        ? '点击地面查看格子属性。触控板双指滚动或鼠标中键拖动可平移。'
        : '点击实体查看完整占地与属性；使用“清除”移除实例，支持撤销。触控板双指滚动或鼠标中键拖动可平移。',
      road: '普通道路宽 1 格：按下定起点，拖动预览直线或一个直角弯；松开定终点并提交，Esc 取消。可沿坡道高低两端接路；不能经过实体、水面或侧入坡道。',
      clear: '清除植被、岩石、铜矿、铁矿、道路和实体，保留地形与高度。单格只清实际命中的实体；范围笔刷清除占地内实体，橙框表示待清除，灰框表示无可清除内容，红框表示不能落笔。松开提交，Esc 取消。',
      tree: '普通树、竹类及静态残株：在已有草地的平地绘制，不能与水、道路、实体或坡面重叠。整笔松开提交，Esc 取消；树木与残株都会影响周围草地，不会自动生长。',
      rock: '普通石、铜矿与铁矿：在平坦陆地逐格绘制或互换类别，同类自动组合为1×1、2×2或3×3大块。不能覆盖水、植被、道路、实体或坡面。青框表示周围重新分块，类别保留；清除只删笔刷内的岩石格。含矿格分布表示含矿范围，不记录可采数量。松开提交，Esc 取消。',
      ramp: '一级直边坡道：按下预览，松开切换；Esc 取消。可放在普通坡面或半坡上，再沿高低两端铺路。移除前请先擦路。',
      'half-slope': '一级直边半坡：将坡面延伸到低侧两格，高程数值不变。点击任一部分切换整体；可相邻放置。改变占地前请先擦路。',
      building: '民居 2×2：移入画布预览，点击放置，R 转向，Esc 返回查看。两个外观用于四向，相反方向共用素材。',
      pan: '左键拖动或触控板双指滚动可平移；Esc 取消当前拖动。“查看全图”可找回地图。',
      land: '陆地笔刷：拖动预览整笔，松开提交；Esc 取消。越过空角或地图边界会拒绝整笔；中键可平移。',
      water: '水域笔刷：拖动预览整笔，松开提交；Esc 取消。岸线随邻格更新；中键可平移。',
      raise: '抬高一级：同一格每笔只升一次，最高 16 级。蓝框为选区，橙框为联动格；松开提交，Esc 取消。',
      lower: '降低一级：最低 0 级；需要坡面空间时会联动扩大下挖范围。蓝框为选区，橙框为联动格。',
      'raise-two': '抬高两级：同一格每笔目标只增加两级，超出 16 级整笔拒绝；周边沿用现有坡面整理，目标可能修订。松开提交，Esc 取消。',
      'lower-two': '降低两级：同一格每笔目标只减少两级，低于 0 级整笔拒绝；沿用现有下挖联动。松开提交，Esc 取消。',
    }[tool];
    if (get('flat-edit').checked) get('click-help').textContent += ' 平面编辑按世界格选取，数字为真实高度，可编辑遮挡沟底。';
  }

  function getBrushOffsets() {
    const size = Number(get('brush-size').value);
    const shape = get('brush-shape').value;
    if (!Number.isInteger(size) || size < 1 || size > 9) throw new Error('笔刷尺寸应为1～9的整数');
    const key = `${shape}:${size}`;
    if (brushKey !== key) {
      brushOffsets = window.qtiled.shapes.polygon.getSelectionOffsets(size, shape);
      brushKey = key;
    }
    return brushOffsets;
  }

  function updateBrushParameters() {
    const offsets = getBrushOffsets();
    const size = Number(get('brush-size').value);
    get('brush-summary').textContent = `${offsets.length} 格${size % 2 ? '' : ' · 向 +x/+y 锚定'}`;
    const selected = new Set(offsets.map(grid => grid.join(',')));
    const swatch = get('brush-swatch');
    swatch.replaceChildren();
    for (let y = -4; y <= 4; y++) for (let x = -4; x <= 4; x++) {
      const cell = document.createElement('i');
      cell.dataset.filled = String(selected.has(`${x},${y}`));
      swatch.append(cell);
    }
    updateHover();
  }

  function clearHover(forgetPointer = false) {
    if (hoverOverlay) hoverOverlay.remove();
    hoverOverlay = null;
    hoverKey = null;
    if (forgetPointer) hoverPointer = null;
    get('hover-info').textContent = '移到画布查看坐标与笔刷占地';
  }

  function buildingPreview(hit) {
    const element = get('building-type').value;
    const angle = Number(get('building-angle').value);
    const definition = currentScene.elementsById[element];
    const placement = window.qtiledElementRendering.resolveElementPlacement(definition, hit.grid, angle, cameraAngle);
    let number = 1;
    while (currentScene.map.entities.some(entity => entity.id === `house-${number}`)) number++;
    const entity = { id: `house-${number}`, element, grid: placement.grid, angle };
    const height = currentScene.map.cells[hit.grid[1]]?.[hit.grid[0]]?.elevation ?? viewport.baseHeight;
    const draw = window.qtiledElementRendering.resolveElementDraw(definition, entity.grid,
      { ...currentScene.view, originPixel: [0, currentScene.flatEditing ? 0 : -height * (currentScene.map.elevationStep || 0)] }, angle);
    let error = '';
    try {
      if (hit.missed) throw new Error('未命中地表，不能放置');
      const candidate = { ...currentScene.map, entities: [...currentScene.map.entities, entity] };
      const checked = requireSuccess(window.constructionRules.validate(candidate, currentScene.groundTiles, currentScene.elementsById));
      requireSuccess(window.rockRules.resolve(candidate, currentScene.groundTiles, currentScene.elementsById, checked.index));
      requireSuccess(window.treeRules.resolve(candidate, currentScene.groundTiles, currentScene.elementsById, checked.index));
    } catch (reason) { error = reason.message; }
    return { entity, draw, error };
  }

  // 地形悬停只计算占地；建筑用同一兼容检查预览，不写入地图或历史。
  function updateHover(event = hoverPointer) {
    if (event) hoverPointer = { clientX: event.clientX, clientY: event.clientY };
    if (!currentScene || !event || stroke || pan) { clearHover(); return; }
    const hit = hitAt(event);
    const tool = get('edit-tool').value;
    const offsets = brushTools.includes(tool) ? getBrushOffsets() : [...roadTools, ...featureTools].includes(tool) ? [[0, 0]] : [];
    const key = `${hit.grid}:${hit.entityId || ''}:${Boolean(hit.missed)}:${tool}:${brushKey}:${get('building-angle').value}:${get('tree-kind').value}:${get('rock-kind').value}`;
    if (key === hoverKey) return;
    clearHover();
    hoverKey = key;
    if (tool === 'building') {
      const preview = buildingPreview(hit);
      const { Group, Polyline } = window.spritejs;
      hoverOverlay = new Group({ id: 'map-building-hover', opacity: 0.65 });
      if (!currentScene.flatEditing) window.qtiledElementRendering.renderElement(hoverOverlay, preview.draw,
        currentScene.sources, { footprint: false, placement: false });
      preview.draw.footprint.forEach(({ position }) => hoverOverlay.append(new Polyline({
        pos: position, points: currentScene.vertexes, close: true,
        strokeColor: preview.error ? '#bc3e30' : '#1976b5',
        fillColor: preview.error ? 'rgba(188,62,48,.3)' : 'rgba(25,118,181,.2)', lineWidth: 2 / viewport.scale,
      })));
      currentScene.root.append(hoverOverlay);
      get('hover-info').textContent = `民居 · 2×2 · ${preview.entity.angle}° · ${preview.error || '可放置 · 点击确认 / R 转向 / Esc 取消'}`;
      return;
    }
    const cell = currentScene.map.cells[hit.grid[1]]?.[hit.grid[0]];
    const feature = featureTools.includes(tool) && !hit.missed
      ? window.elevationRules.applyFeature(currentScene.map, { type: tool, grid: hit.grid },
        currentScene.elementsById, currentScene.rules, currentScene.elevationRules, cameraAngle) : null;
    let grids = feature?.selectedGrids || window.qtiled.shapes.rhombus.getIsometricNeighborsByOffsets(hit.grid, offsets);
    let error = '';
    let clearPreview = null;
    let rockPreview = null;
    if (!hit.missed && tool === 'clear') {
      try {
        clearPreview = clearContents(currentScene, grids, clearEntityIds(currentScene, hit, grids, offsets.length > 1));
        grids = clearPreview.selectedGrids;
        rockPreview = window.rockRules.resolve(clearPreview.definition, currentScene.groundTiles,
          currentScene.elementsById, currentScene.occupancyIndex);
      } catch (reason) { error = reason.message; }
    } else if (!hit.missed && tool === 'rock') {
      const candidate = window.rockRules.applyStroke(currentScene.map, grids, false, get('rock-kind').value);
      if (!candidate.issues.length) rockPreview = window.rockRules.resolve(candidate.definition,
        currentScene.groundTiles, currentScene.elementsById, currentScene.occupancyIndex);
      error = candidate.issues[0]?.message || rockPreview?.issues[0]?.message || '';
    } else if (!hit.missed && treeTools.includes(tool)) {
      const candidate = window.treeRules.applyStroke(currentScene.map, grids, false, currentScene.groundTiles, get('tree-kind').value);
      error = candidate.issues[0]?.message || window.treeRules.resolve(candidate.definition,
        currentScene.groundTiles, currentScene.elementsById, currentScene.occupancyIndex).issues[0]?.message || '';
    } else if (feature && !feature.issues.length) {
      error = window.rockRules.resolve(feature.definition, feature.tiles, currentScene.elementsById, currentScene.occupancyIndex).issues[0]?.message
        || window.treeRules.resolve(feature.definition, feature.tiles, currentScene.elementsById, currentScene.occupancyIndex).issues[0]?.message || '';
    }
    const invalid = hit.missed || error || feature?.issues.length || grids.some(([x, y]) => !currentScene.map.cells[y]?.[x]);
    get('hover-info').textContent = `世界 ${hit.grid.join(', ')} · ${hit.missed ? '未命中地表' : cell ? `高度 ${cell.elevation}` : '地图之外 / 空角'}${grids.length ? ` · 占地 ${grids.length} 格${invalid ? ' · 越界、空角或未命中，不能落笔' : ' · 地形规则在拖动时检查'}` : ''}`;
    if (feature) get('hover-info').textContent = `世界 ${hit.grid.join(', ')} · ${feature.issues[0]?.message || `占地 ${grids.length} 格 · 按下预览，松开切换`}`;
    if (tool === 'clear' && !invalid) get('hover-info').textContent = `世界 ${hit.grid.join(', ')} · ${clearPreview?.hasContent ? `待清除 · 完整范围 ${grids.length} 格` : '无可清除内容'} · 地形与高度保留`;
    if (error) get('hover-info').textContent = `世界 ${hit.grid.join(', ')} · ${tool === 'clear' ? '不能落笔 · ' : ''}${error}`;
    if (!grids.length) return;
    const { Group, Polyline } = window.spritejs;
    hoverOverlay = new Group({ id: 'map-brush-hover' });
    grids.forEach(grid => {
      const pos = hit.missed ? window.qtiledView.projectGrid(grid, currentScene.view) : projectCell(grid, currentScene);
      // 未命中与空角沿用笔尖参考面；反算和绘制使用同一高度，避免红框偏离指针。
      if (!currentScene.flatEditing && (hit.missed || !currentScene.map.cells[grid[1]]?.[grid[0]])) {
        pos[1] -= (hit.referenceHeight ?? cell?.elevation ?? viewport.baseHeight) * (currentScene.map.elevationStep || 0);
      }
      hoverOverlay.append(new Polyline({ pos, points: currentScene.vertexes, close: true,
        strokeColor: invalid ? '#bc3e30' : tool === 'clear' ? clearPreview?.hasContent ? '#a56308' : '#77818a' : '#1976b5',
        fillColor: invalid ? 'rgba(188,62,48,.18)' : tool === 'clear' ? clearPreview?.hasContent ? 'rgba(224,145,30,.22)' : 'rgba(119,129,138,.08)' : 'rgba(25,118,181,.15)',
        lineWidth: 2 / viewport.scale }));
    });
    if (!invalid && rockPreview?.tiles) {
      const count = appendRockReflow(hoverOverlay, currentScene, { ...currentScene, tiles: rockPreview.tiles }, grids);
      if (count) get('hover-info').textContent += ` · 周围${count}格重新分块（青框，类别保留）`;
    }
    currentScene.root.append(hoverOverlay);
  }

  // 标明笔刷外实际改变显示的岩石格，不把分块范围当作删除范围。
  function appendRockReflow(overlay, before, after, selectedGrids) {
    const selected = new Set(selectedGrids.map(grid => grid.join(',')));
    const oldTiles = new Map(before.tiles.map(tile => [tile.grid.join(','), tile]));
    let count = 0;
    for (const tile of after.tiles) {
      const old = oldTiles.get(tile.grid.join(','));
      if (selected.has(tile.grid.join(',')) || (!tile.rock && !old?.rock)) continue;
      if (old?.element === tile.element && old?.rockOwner?.join(',') === tile.rockOwner?.join(',')) continue;
      overlay.append(new window.spritejs.Polyline({ pos: projectCell(tile.grid, after), points: after.vertexes,
        close: true, strokeColor: '#168b92', fillColor: 'rgba(22,139,146,.08)', lineWidth: 2 / viewport.scale }));
      count++;
    }
    return count;
  }

  function requireSuccess(result) {
    if (result.issues.length) {
      const messages = {
        'unsupported-elevation-control': '这里仍需要整理周边高度，请扩大选区后重试。读取文件不会自动修改地形。',
        'unsupported-elevation-shape': '现有坡面无法完整覆盖此处高差，请扩大选区或分级绘制。',
      };
      const error = new Error(result.issues.map(issue => {
        const path = issue.path.replace(/^cells\[(\d+)\]\[(\d+)\]/, (_, y, x) => `格子 (${x}, ${y})`);
        return `${path}：${messages[issue.code] || issue.message}`;
      }).join('\n'));
      error.issues = result.issues; // 原始表行与诊断仍保留，操作提示不暴露取证术语。
      throw error;
    }
    return result;
  }

  async function readText(path) {
    const response = await fetch(path, { cache: 'no-cache' });
    if (!response.ok) throw new Error(`${path} 加载失败（HTTP ${response.status}）`);
    return response.text();
  }

  function updateSelection() {
    const { Group, Polyline } = window.spritejs;
    const { map, entities, view, vertexes, root } = currentScene;
    const entity = entities.find(item => item.id === selectedEntityId);
    const next = new Group();
    const selectedTile = currentScene.tiles.find(tile => tile.grid.join(',') === selectedGrid?.join(','));
    const featureParts = selectedTile?.slopeOwner && currentScene.tiles.filter(tile => tile.slopeOwner?.join(',') === selectedTile.slopeOwner.join(','));
    const highlight = featureParts ? featureParts.map(tile => tile.grid) : entity ? entity.draw.footprint.map(item => item.grid) : selectedGrid ? [selectedGrid] : [];
    highlight.forEach(grid => {
      if (map.cells[grid[1]]?.[grid[0]] === undefined) return;
      next.append(new Polyline({ pos: projectCell(grid, currentScene), points: vertexes, close: true,
        strokeColor: '#1976b5', fillColor: 'rgba(25, 118, 181, .18)', lineWidth: 2 }));
    });
    if (currentScene.selection) currentScene.selection.remove();
    root.append(next);
    currentScene.selection = next;
    const cell = selectedGrid && map.cells[selectedGrid[1]]?.[selectedGrid[0]];
    get('cell-grid').textContent = selectedGrid ? JSON.stringify(selectedGrid) : '—';
    const tile = currentScene.tiles.find(item => selectedGrid && item.grid[0] === selectedGrid[0] && item.grid[1] === selectedGrid[1]);
    get('cell-info').textContent = !selectedGrid ? '点击画布查看' : cell === null ? 'null · 无效空角'
      : cell ? `terrain: ${cell.terrain}${cell.road ? '\n道路: 普通' : ''}\nelevation: ${cell.elevation}\n素材: ${tile?.element || '无'}\n变体: ${tile?.variant ?? '无'}` : '地图矩阵之外';
    if (cell && tile?.waterKind) get('cell-info').textContent += `\n水面: ${{ ordinary: '普通', transition: '过渡', deep: '深处' }[tile.waterKind]}`;
    if (cell?.rock) get('cell-info').textContent += `\n岩石: ${getRock(cell.rock).label} · 当前组合${tile.rockSize}×${tile.rockSize}（逐格编辑）`;
    if (cell?.tree) get('cell-info').textContent += `\n树木: ${getTree(cell.tree).detail} · 占地1格`;
    if (cell && map.climate) get('cell-info').textContent += `\n气候: ${{ arid: '干旱', temperate: '温带', humid: '湿润' }[map.climate]}\n环境强度: ${tile.moisture} / 100（水域/树木派生）${tile.grassGrade === null ? '' : `\n草地档位: ${tile.grassGrade + 1} / 5${tile.slope ? '（坡面按气候主题显示）' : ''}`}`;
    if (cell && map.version === 2) get('cell-info').textContent += `\n形态: ${tile?.halfSlope ? `半坡${tile.ramp ? '坡道' : ''}（主格 ${tile.slopeOwner}，部件 ${tile.slopePart + 1}/2）` : tile?.ramp ? '坡道' : tile?.slope ? '坡面（归属此低格）' : '平面'} · ${map.elevationStep}px / 级`;
    updateWaterFrame();
    get('selection-actions').hidden = !selectedGrid && !entity;
    get('entity-details').hidden = !entity;
    get('entity-id').textContent = entity ? entity.id : '—';
    get('entity-source').textContent = entity ? `${entity.element}\n${entity.draw.source}` : '—';
    get('entity-pose').textContent = entity ? `${JSON.stringify(entity.grid)} / ${entity.angle}°` : '—';
    get('entity-footprint').textContent = entity ? entity.draw.footprint.map(item => JSON.stringify(item.grid)).join(' ') : '—';
    get('view-info').textContent = `${map.tileSize.join(' × ')} px / ${view.angle}°`;
  }

  function prepareScene(mapState, nextAngle, resolvedTiles) {
    const { Group, Label, Layer, Sprite, Polyline } = window.spritejs;
    const { projectGrid } = window.qtiledView;
    const { map, elementsById, sources, rules, elevationRules } = mapState;
    if (map.tileSize[0] !== 80 || map.tileSize[1] !== 40) {
      throw new Error('tileSize：当前原作地表素材需要 80 × 40 格距。');
    }
    const groundTiles = resolvedTiles ?? requireSuccess(window.elevationRules.resolve(map, elementsById, rules, elevationRules, nextAngle)).tiles;
    const construction = requireSuccess(window.constructionRules.resolve(map, groundTiles, elementsById, mapState.roadRules, nextAngle));
    const rockTiles = requireSuccess(window.rockRules.resolve(map, construction.tiles, elementsById, construction.index)).tiles;
    const tiles = requireSuccess(window.treeRules.resolve(map, rockTiles, elementsById, construction.index)).tiles;
    const view = { angle: nextAngle, tileSize: map.tileSize, originPixel: [0, 0] };
    const flatEditing = get('flat-edit').checked;
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
      const [x, y] = projectCell(grid, { map, view, flatEditing });
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
      if (flatEditing) {
        const cell = map.cells[tile.grid[1]][tile.grid[0]];
        const pos = projectGrid(tile.grid, view);
        holder.append(new Polyline({ pos, points: vertexes, close: true, lineWidth: 1,
          strokeColor: '#788c86', fillColor: cell.terrain === 'water' ? '#9acbdc'
            : `hsl(95, 24%, ${88 - cell.elevation * 3}%)` }));
        holder.append(new Label({ text: `${cell.elevation}${cell.road ? ' 路' : ''}${cell.tree ? ` ${getTree(cell.tree).shortLabel}` : ''}${cell.rock ? ` ${getRock(cell.rock).label}` : ''}`, pos, anchor: [0.5, 0.5], font: '12px monospace', fillColor: '#253d35' }));
        content.append(holder);
        return;
      }
      const phase = tile.phase || 0;
      // 道路图自带完整土面，直接替换本格地表。
      const draws = window.elevationRendering.resolveTileDraws(tile, map, elementsById, view, { elapsedMs, phase });
      draws.forEach((draw, index) => {
        const definition = elementsById[draw.id];
        const part = index ? new Group() : holder;
        includeDraw(draw, definition);
        window.qtiledElementRendering.renderElement(part, draw, sources, { footprint: false, placement: false });
        if (draw.sequence) animated.push({ holder: part, definition, grid: tile.grid, phase, imageAngle: draw.imageAngle,
          frameIndex: draw.frameIndex, sequence: draw.sequence });
        drawables.push({ holder: part, depth: tile.rock ? Math.max(...draw.footprint.map(item => projectGrid(item.grid, view)[1]))
          : projectGrid(tile.grid, view)[1], draw, grid: tile.grid, definition, phase,
        rockSize: tile.rockSize, elevation: tile.elevation });
      });
    });
    // 按未抬升的世界占地下端排序，防止台地的垂直位移把前后关系颠倒。
    // 本批完整2×2地基采用此画序；不作为任意尺寸交错或组合实体的通用画序。
    const depth = entity => Math.max(...entity.draw.footprint.map(item => item.position[1]));
    [...entities].sort((a, b) => depth(a) - depth(b)).forEach(entity => {
      // renderElement 每个容器管理一个元素绘制组；共享定义的实例也必须各用独立容器。
      const holder = new Group();
      if (flatEditing) {
        entity.draw.footprint.forEach(({ grid }) => holder.append(new Polyline({ pos: projectGrid(grid, view), points: vertexes,
          close: true, strokeColor: '#6756a5', fillColor: 'rgba(103,86,165,.18)', lineWidth: 2 })));
        labels.append(holder);
        return;
      }
      includeDraw(entity.draw, elementsById[entity.element]);
      window.qtiledElementRendering.renderElement(holder, entity.draw, sources, { footprint: false, placement: false });
      drawables.push({ holder, depth: Math.max(...entity.draw.footprint.map(item => projectGrid(item.grid, view)[1])),
        draw: entity.draw, grid: entity.draw.footprint[0].grid, entityId: entity.id, definition: elementsById[entity.element] });
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
    const sourcePixels = mapState.sourcePixels || readSourcePixels(sources);
    return { ...mapState, occupancyIndex: construction.index, groundTiles, root, entities, tiles, animated, view, vertexes, bounds, mapCenter, flatEditing,
      sourcePixels, drawables, contentLayer, contentImage, gridOverlay, coordinateOverlay, guideScale: null, selection: null };
  }

  function updateViewport() {
    if (!currentScene) return;
    clearHover();
    const { bounds, view } = currentScene;
    const centerPixel = window.qtiledView.projectGrid(viewport.center, view);
    if (!currentScene.flatEditing) centerPixel[1] -= viewport.baseHeight * (currentScene.map.elevationStep || 0);
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
    get('zoom-value').textContent = `${Math.round(viewport.scale * 1000) / 10}%`;
    get('fit-map').setAttribute('aria-pressed', String(viewport.mode === 'fit'));
    get('native-size').setAttribute('aria-pressed', String(viewport.mode === 'work' && viewport.scale === 1));
    updateHover();
  }

  function commitScene(next, resetViewport = false) {
    clearHover(true);
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
      // 以载入地图的实际基准面居中；编辑时保留该面，避免下挖预览引起镜头跳动。
      viewport.baseHeight = Math.min(...next.map.cells.flat().filter(Boolean).map(cell => cell.elevation));
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
    get('camera-angle').value = String(cameraAngle);
    get('map-climate').value = next.map.climate || '';
    updateControls();
    updatePlaybackControls();
  }

  function updateControls() {
    document.querySelectorAll('[data-editor-controls]').forEach(group => {
      group.disabled = !currentScene || Boolean(stroke);
    });
    get('undo').disabled = !undoStack.length || Boolean(stroke);
    get('redo').disabled = !redoStack.length || Boolean(stroke);
    get('cancel-stroke').disabled = !stroke;
    for (const id of ['pick-mode', 'clear-selection']) get(id).disabled = !currentScene || Boolean(stroke);
    get('new-map').disabled = !currentScene || Boolean(stroke);
    get('base-height').disabled = Boolean(stroke);
    get('map-climate').disabled = !currentScene || Boolean(stroke);
    for (const id of ['save-map', 'view-map-json', 'read-map', 'map-file', 'map-sample', 'reload', 'rebase-sample']) {
      get(id).disabled = Boolean(stroke) || (!currentScene && ['save-map', 'view-map-json', 'read-map'].includes(id));
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

  function presetHeight() {
    const height = Number(get('base-height').value);
    if (get('base-height').value === '' || !Number.isInteger(height) || height < 0 || height > 16) {
      throw new Error('预设基准高度必须为 0～16 的整数');
    }
    return height;
  }

  function rebaseSample(map, height, step) {
    const heights = map.cells.flat().filter(Boolean).map(cell => cell.elevation);
    if (!heights.length) throw new Error('样本没有有效地表，无法设定基准高度');
    const offset = height - Math.min(...heights);
    if (Math.max(...heights) + offset > 16) throw new Error('平移后高程超出 0～16，请降低预设基准高度或取消按基准加载');
    if (!offset) return map;
    return { ...map, version: 2, elevationStep: step,
      cells: map.cells.map(row => row.map(cell => cell && { ...cell, elevation: cell.elevation + offset })) };
  }

  async function reload(forceReload = false) {
    cancelGesture();
    const requestId = ++loadRequestId;
    clearIssue();
    status.textContent = currentScene ? '正在加载… · 仍显示上次有效地图' : '正在加载地图与素材…';
    try {
      const baseHeight = get('rebase-sample').checked ? presetHeight() : null;
      if (window.location.protocol === 'file:') throw new Error('本页需要 HTTP 服务');
      if (!window.qtiledElementRendering?.resolveElementFrame || !window.qtiledElementRendering?.updateElementFrame || !window.qtiledMaps?.importMapDefinition || !window.landWaterRules || !window.elevationRules || !window.constructionRules || !window.treeRules || !window.rockRules || !window.qtiledView || !window.spritejs || typeof getPointerPosition !== 'function' || typeof getDogElementSample !== 'function') {
        throw new Error('运行包缺失或过期；仓库 Demo 请先执行 npm run debug，独立目录请按 docs/browser-consumption.md 重新准备');
      }
      const { loadElementSources, importElementDefinition } = window.qtiledElementRendering;
      // 复用 Demo 的样本配置；仅手动重载绕过图片缓存，修复文件后可恢复。
      const reloadToken = forceReload ? `${Date.now()}-${requestId}` : '';
      const { directory, sourceFiles } = getDogElementSample(reloadToken);
      const elementUrl = new URL(`${directory}element.json`, document.baseURI);
      const mapUrl = new URL(`./static/map-samples/${get('map-sample').value}.json`, document.baseURI);
      const [elementJson, mapJson, terrainJson, rulesJson, elevationJson, elevationRulesJson, constructionJson, roadRulesJson, images] = await Promise.all([
        readText(elementUrl), readText(mapUrl),
        readText(new URL(`${terrainDirectory}elements.json`, document.baseURI)),
        readText(new URL(`${terrainDirectory}rules.json`, document.baseURI)),
        readText(new URL(`${elevationDirectory}elements.json`, document.baseURI)),
        readText(new URL(`${elevationDirectory}rules.json`, document.baseURI)),
        readText(new URL(`${constructionDirectory}elements.json`, document.baseURI)),
        readText(new URL(`${constructionDirectory}road-rules.json`, document.baseURI)),
        loadElementSources({ ...sourceFiles, ...getSources(terrainDirectory, reloadToken),
          'slope-features-atlas.png': `${elevationDirectory}slope-features-atlas.png${reloadToken ? `?reload=${reloadToken}` : ''}`,
          'slope-features-dirt-atlas.png': `${elevationDirectory}slope-features-dirt-atlas.png${reloadToken ? `?reload=${reloadToken}` : ''}`,
          'elevation-dirt-atlas.png': `${elevationDirectory}elevation-dirt-atlas.png${reloadToken ? `?reload=${reloadToken}` : ''}`,
          'road-atlas.png': `${constructionDirectory}road-atlas.png${reloadToken ? `?reload=${reloadToken}` : ''}`,
          'house-atlas.png': `${constructionDirectory}house-atlas.png${reloadToken ? `?reload=${reloadToken}` : ''}`,
          'elevation-atlas.png': `${elevationDirectory}elevation-atlas.png${reloadToken ? `?reload=${reloadToken}` : ''}` }),
      ]);
      if (requestId !== loadRequestId) return;
      requireSuccess(images);
      const element = requireSuccess(importElementDefinition(elementJson, images.sourceInfo)).definition;
      const elementsById = { ...JSON.parse(terrainJson), ...JSON.parse(elevationJson), ...JSON.parse(constructionJson) };
      Object.entries(elementsById).forEach(([id, definition]) => {
        requireSuccess({ issues: window.qtiledElementRendering.validateElementDefinition(definition, images.sourceInfo) });
        if (id !== definition.id) throw new Error(`地表素材键 ${id} 与定义 ID 不一致`);
      });
      elementsById[element.id] = element;
      const rules = JSON.parse(rulesJson);
      const imported = requireSuccess(window.qtiledMaps.importMapDefinition(mapJson, elementsById));
      const elevationRules = JSON.parse(elevationRulesJson);
      const map = baseHeight === null ? imported.definition : rebaseSample(imported.definition, baseHeight, elevationRules.elevationStep);
      // 地图、索引、图片与独立绘制树全部准备成功后一次替换；失败不触碰 currentScene。
      const next = prepareScene({ map, occupancyIndex: imported.index, elementsById, sources: images.sources,
        rules, elevationRules, roadRules: JSON.parse(roadRulesJson) }, cameraAngle);
      undoStack.length = 0;
      redoStack.length = 0;
      const firstLoad = !currentScene;
      commitScene(next, true);
      if (firstLoad) player.play();
      updatePlaybackControls();
      status.textContent = baseHeight === null ? '已加载 · 保留样本原高度' : `已加载 · 基准高度 ${baseHeight} · 保留样本高差`;
    } catch (error) {
      if (requestId === loadRequestId) fail(error);
    }
  }

  get('camera-angle').addEventListener('change', () => {
    const angle = Number(get('camera-angle').value);
    get('camera-angle').value = String(cameraAngle);
    if (!currentScene || stroke || pan) return;
    try { commitScene(prepareScene(currentScene, angle)); }
    catch (error) { fail(error); }
  });
  function clearSelection() {
    selectedGrid = null;
    selectedEntityId = null;
    if (currentScene) updateSelection();
  }
  get('clear-selection').addEventListener('click', clearSelection);
  get('pick-mode').addEventListener('change', () => { clearSelection(); updateToolHelp(); });
  container.addEventListener('click', event => {
    if (suppressClick) { suppressClick = false; return; }
    if (!currentScene || stroke || pan) return;
    const tool = get('edit-tool').value;
    const hit = hitAt(event);
    if (tool === 'building') {
      try {
        const preview = buildingPreview(hit);
        if (preview.error) throw new Error(preview.error);
        editEntity({ type: 'place', entity: preview.entity });
      } catch (error) {
        issues.hidden = false;
        issues.textContent = error.message;
        status.textContent = '放置被拒绝 · 地图未改变';
      }
      updateHover(event);
      return;
    }
    if (tool !== 'select') return;
    if (hit.missed) {
      clearSelection();
      get('cell-info').textContent = `未命中可见地表 · 基准面参考 ${JSON.stringify(hit.grid)}`;
      return;
    }
    selectedGrid = hit.grid;
    // 可见像素优先；旧平地装饰与平面编辑保留占用索引候选。
    const candidates = currentScene.occupancyIndex.get(selectedGrid.join(',')) || [];
    selectedEntityId = get('pick-mode').value === 'entity' ? hit.entityId || candidates[0] || null : null;
    updateSelection();
  });
  function editEntity(command) {
    const edited = requireSuccess(window.qtiledMaps.applyMapEdit(currentScene.map, command,
      currentScene.elementsById, window.constructionRules.canCoexist));
    const next = prepareScene({ ...currentScene, map: edited.definition, occupancyIndex: edited.index }, cameraAngle);
    ++loadRequestId;
    undoStack.push(currentScene.map);
    redoStack.length = 0;
    selectedEntityId = command.type === 'place' ? command.entity.id : null;
    selectedGrid = command.type === 'place' ? command.entity.grid : null;
    viewport.mode = 'work';
    commitScene(next);
    clearIssue();
    status.textContent = command.type === 'place' ? '已放置民居 · 可继续放置 / Esc 返回查看' : '已删除整个实例 · 可撤销';
  }

  function rotateBuilding() {
    if (!currentScene || stroke || pan) return;
    get('building-angle').value = String((Number(get('building-angle').value) + 90) % 360);
    updateHover();
  }
  get('rotate-building').addEventListener('click', rotateBuilding);
  get('building-angle').addEventListener('change', () => updateHover());
  document.addEventListener('keydown', event => {
    if (get('edit-tool').value !== 'building') return;
    if (event.key.toLowerCase() === 'r' && !event.ctrlKey && !event.metaKey && !event.altKey
      && !/INPUT|TEXTAREA|SELECT/.test(event.target.tagName)) {
      event.preventDefault();
      rotateBuilding();
    } else if (event.key === 'Escape') {
      get('edit-tool').value = 'select';
      clearHover(true);
      updateToolHelp();
      clearIssue();
    }
  });

  function hitAt(event, scene = currentScene) {
    const pixel = getPointerPosition(event, container).map((value, axis) => (value - scene.viewportOrigin[axis]) / scene.viewportScale);
    if ((get('edit-tool').value === 'clear' || scene.map.version === 2 || scene.tiles.some(tile => tile.tree || tile.rock) || scene.map.entities.some(entity => entity.element === window.constructionRules.buildingId)) && !scene.flatEditing) {
      for (let index = scene.drawables.length - 1; index >= 0; index--) {
        const item = scene.drawables[index];
        const frame = item.draw.sequence ? window.qtiledElementRendering.resolveElementFrame(item.definition, item.draw.imageAngle,
          { elapsedMs: player.elapsed(), phase: item.phase || 0 }) : item.draw;
        const x = Math.floor(pixel[0] - item.draw.position[0]);
        const y = Math.floor(pixel[1] - item.draw.position[1]);
        if (x < 0 || y < 0 || x >= frame.rect[2] || y >= frame.rect[3]) continue;
        const source = scene.sourcePixels[frame.source];
        if (source.data[((frame.rect[1] + y) * source.width + frame.rect[0] + x) * 4 + 3] > 0) {
          if (item.rockSize > 1) {
            const ground = window.qtiledView.pickGrid([pixel[0], pixel[1] + item.elevation * (scene.map.elevationStep || 0)], scene.view);
            // 大块仍逐格编辑；上凸像素归最近边格，不把整块当成一个可删除实体。
            return { grid: ground.map((value, axis) => Math.max(item.grid[axis], Math.min(item.grid[axis] + item.rockSize - 1, value))) };
          }
          return { grid: item.grid, entityId: item.entityId };
        }
      }
      // 未命中只在基准面反算参考格，不把它当作可落笔的地表。
      pixel[1] += viewport.baseHeight * (scene.map.elevationStep || 0);
      return { grid: window.qtiledView.pickGrid(pixel, scene.view), missed: true, referenceHeight: viewport.baseHeight };
    }
    return { grid: window.qtiledView.pickGrid(pixel, scene.view) };
  }

  function releasePointer(pointerId) {
    if (container.hasPointerCapture?.(pointerId)) container.releasePointerCapture(pointerId);
  }

  function movePan(event) {
    if (!pan || event.pointerId !== pan.pointerId) return;
    const pixel = getPointerPosition(event, container);
    const [dx, dy] = pixel.map((value, axis) => (value - pan.start[axis]) / pan.scale);
    translateViewport(dx, dy, pan.center);
  }

  function translateViewport(dx, dy, center = viewport.center) {
    // 用现有投影的两个基向量反解连续位移，不把平移量舍入成整数格。
    const [ax, ay] = window.qtiledView.projectGrid([1, 0], currentScene.view);
    const [bx, by] = window.qtiledView.projectGrid([0, 1], currentScene.view);
    const det = ax * by - ay * bx;
    viewport.center = [center[0] - (dx * by - dy * bx) / det, center[1] - (ax * dy - ay * dx) / det];
    updateViewport();
  }

  container.addEventListener('wheel', event => {
    // 捏合产生的 Ctrl+wheel 及浏览器缩放快捷操作保留默认行为。
    if (!currentScene || event.ctrlKey || event.metaKey) return;
    event.preventDefault();
    if (stroke || pan || (!event.deltaX && !event.deltaY)) return;
    // 触控板通常提供像素；按行滚动按16px换算，按页滚动使用当前视口尺寸。
    const unit = event.deltaMode === 1 ? [16, 16]
      : event.deltaMode === 2 ? [viewport.width, viewport.height] : [1, 1];
    ++loadRequestId;
    viewport.mode = 'work';
    translateViewport(-event.deltaX * unit[0] / viewport.scale, -event.deltaY * unit[1] / viewport.scale);
    status.textContent = '已平移 · 地图未改变';
  }, { passive: false });

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
    clearHover(true);
  }

  get('edit-tool').addEventListener('change', () => {
    cancelGesture();
    updateToolHelp();
  });
  get('tree-kind').addEventListener('change', () => { cancelGesture(); updateToolHelp(); });
  get('rock-kind').addEventListener('change', () => { cancelGesture(); updateToolHelp(); });
  for (const id of ['brush-size', 'brush-shape']) get(id).addEventListener('change', updateBrushParameters);
  document.querySelectorAll('button[data-tool]').forEach(button => button.addEventListener('click', () => {
    if (!currentScene || stroke || pan) return;
    get('edit-tool').value = button.dataset.tool;
    if (button.dataset.pickMode) {
      if (get('pick-mode').value !== button.dataset.pickMode) clearSelection();
      get('pick-mode').value = button.dataset.pickMode;
    }
    updateToolHelp();
  }));
  const menus = [...document.querySelectorAll('.menu')];
  function closeMenus(except) {
    menus.forEach(menu => { if (menu !== except) menu.open = false; });
  }
  menus.forEach(menu => menu.addEventListener('toggle', () => { if (menu.open) closeMenus(menu); }));
  document.addEventListener('click', event => { if (!event.target.closest('.menu')) closeMenus(); });
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    const open = menus.find(menu => menu.open);
    closeMenus();
    open?.querySelector('summary').focus();
  });
  for (const id of ['show-grid', 'show-coordinates']) get(id).addEventListener('change', updateGuides);
  get('flat-edit').addEventListener('change', () => {
    if (!currentScene || stroke || pan) return;
    try {
      commitScene(prepareScene(currentScene, cameraAngle));
      updateToolHelp();
      status.textContent = currentScene.flatEditing ? '平面编辑 · 每格数字为真实高度，地图事实未改变' : '地形外观 · 按可见像素选择';
    } catch (error) { get('flat-edit').checked = currentScene.flatEditing; fail(error); }
  });
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
  get('zoom-percent').addEventListener('input', changeZoom);

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

  // 单格以基图可见像素命中为准，整笔不会因预览移除上层实体而穿透删到下层。
  // 平面模式没有实体图像，沿用格占用；范围刷明确收集其覆盖的所有实例。
  function clearEntityIds(scene, hit, grids, wide) {
    if (!wide) return new Set(hit.entityId ? [hit.entityId] : scene.flatEditing
      ? (scene.occupancyIndex.get(hit.grid.join(',')) || []).slice(-1) : []);
    return new Set(grids.flatMap(grid => scene.occupancyIndex.get(grid.join(',')) || []));
  }

  function clearContents(scene, grids, ids) {
    let result = requireSuccess(window.treeRules.applyStroke(scene.map, grids, true, scene.groundTiles));
    result = requireSuccess(window.rockRules.applyStroke(result.definition, grids, true));
    result = requireSuccess(window.constructionRules.applyRoadStroke(result.definition, grids, true, scene.groundTiles));
    const selected = new Map(result.selectedGrids.map(grid => [grid.join(','), grid]));
    for (const [key, occupants] of scene.occupancyIndex) {
      if (occupants.some(id => ids.has(id))) selected.set(key, key.split(',').map(Number));
    }
    // 同一候选内完成各类事实删除；prepareScene与历史只提交一次。
    for (const id of ids) result.definition = requireSuccess(window.qtiledMaps.applyMapEdit(result.definition,
      { type: 'remove', id }, scene.elementsById, window.constructionRules.canCoexist)).definition;
    const hasContent = ids.size > 0 || grids.some(([x, y]) => scene.map.cells[y]?.[x]?.tree || scene.map.cells[y]?.[x]?.rock)
      || result.selectedGrids.some(([x, y]) => scene.map.cells[y]?.[x]?.road);
    return { ...result, selectedGrids: [...selected.values()], hasContent };
  }

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
    if (!stroke || event.pointerId !== stroke.pointerId) return;
    const hit = hitAt(event, stroke.base);
    const grid = hit.grid;
    if (hit.missed) {
      stroke.failed = true;
      stroke.missed = stroke.terrain !== 'road' || !stroke.start;
      stroke.last = null;
      stroke.candidate = null;
      commitScene(stroke.base);
      issues.hidden = false;
      issues.textContent = '指针未命中可见地表；整笔拒绝。';
      return;
    }
    if (stroke.missed) return;
    let newEntity = false;
    if (stroke.terrain === 'clear' && stroke.offsets.length === 1) {
      const brush = window.qtiled.shapes.rhombus.getIsometricNeighborsByOffsets(grid, stroke.offsets);
      for (const id of clearEntityIds(stroke.base, hit, brush, stroke.offsets.length > 1)) {
        if (!stroke.entityIds.has(id)) newEntity = true;
        stroke.entityIds.add(id);
      }
    }
    if (!newEntity && stroke.last && grid.every((value, axis) => value === stroke.last[axis])) return;
    if (featureTools.includes(stroke.terrain)) {
      stroke.grids = new Map([[grid.join(','), grid]]);
      stroke.last = grid;
    } else if (stroke.terrain === 'road') {
      // 原作平地道路从终点回溯，等长方向按象限固定排序；选区只取本次起终点。
      const start = stroke.start || grid;
      stroke.start = start;
      stroke.grids = new Map([[start.join(','), start]]);
      const point = [...start];
      const axes = (grid[0] - start[0]) * (grid[1] - start[1]) > 0 ? [1, 0] : [0, 1];
      for (const axis of axes) while (point[axis] !== grid[axis]) {
        point[axis] += Math.sign(grid[axis] - point[axis]);
        stroke.grids.set(point.join(','), [...point]);
      }
      stroke.last = grid;
    } else {
      const from = stroke.last || grid;
      const steps = Math.max(Math.abs(grid[0] - from[0]), Math.abs(grid[1] - from[1]), 1);
      const previousSize = stroke.grids.size;
      let previousGrid = from;
      // 涂绘笔刷补齐快速拖动跳过的格子；只在增加新格时预览。
      for (let i = 1; i <= steps; i++) {
        const nextGrid = [Math.round(from[0] + (grid[0] - from[0]) * i / steps), Math.round(from[1] + (grid[1] - from[1]) * i / steps)];
        // 清除继续按经过格四邻补齐，避免斜拖漏掉道路，不沿用铺路的起终点选区。
        if (stroke.terrain === 'clear' && nextGrid[0] !== previousGrid[0] && nextGrid[1] !== previousGrid[1]) {
          const corner = [previousGrid[0], nextGrid[1]];
          stroke.grids.set(corner.join(','), corner);
        }
        previousGrid = nextGrid;
        for (const grid of window.qtiled.shapes.rhombus.getIsometricNeighborsByOffsets(nextGrid, stroke.offsets)) {
          stroke.grids.set(grid.join(','), grid);
        }
      }
      stroke.last = grid;
      if (!newEntity && stroke.grids.size === previousSize) return;
    }
    try {
      const { base, grids, terrain } = stroke;
      // 范围刷按完整补间覆盖格收集实体；单格仍只累计基图实际命中，不能穿透删除。
      if (terrain === 'clear' && stroke.offsets.length > 1) {
        for (const id of clearEntityIds(base, hit, [...grids.values()], true)) stroke.entityIds.add(id);
      }
      const command = ['land', 'water'].includes(terrain) ? { terrain } : { type: terrain.replace('-two', ''), levels: terrain.endsWith('-two') ? 2 : 1 };
      const result = requireSuccess(terrain === 'clear'
        ? clearContents(base, [...grids.values()], stroke.entityIds)
        : featureTools.includes(terrain)
        ? window.elevationRules.applyFeature(base.map, { type: terrain, grid }, base.elementsById, base.rules, base.elevationRules, cameraAngle)
        : terrain === 'rock'
        ? window.rockRules.applyStroke(base.map, [...grids.values()], false, stroke.rockKind)
        : treeTools.includes(terrain)
        ? window.treeRules.applyStroke(base.map, [...grids.values()], false, base.groundTiles, stroke.treeKind)
        : roadTools.includes(terrain)
        ? window.constructionRules.applyRoadStroke(base.map, [...grids.values()], false, base.groundTiles)
        : window.elevationRules.applyStroke(base.map, { ...command, grids: [...grids.values()] }, base.elementsById, base.rules, base.elevationRules, cameraAngle));
      // 只保护已有树与岩石的实际高度变化，不改高程联动算法；最终坡面冲突由prepareScene拒绝。
      if (base.map.cells.some((row, y) => row.some((cell, x) => (cell?.tree || cell?.rock)
        && result.definition.cells[y]?.[x]?.elevation !== cell.elevation))) {
        throw new Error('高程联动会改变已有树木或岩石所在格，请先清除。');
      }
      const occupancy = requireSuccess(window.qtiledMaps.buildMapOccupancy(result.definition, base.elementsById));
      const next = prepareScene({ ...base, map: result.definition, occupancyIndex: occupancy.index }, cameraAngle, result.tiles);
      const { Group, Polyline } = window.spritejs;
      const preview = new Group();
      const changes = result.changes || [];
      const linked = changes.filter(change => !change.selected);
      const selectedGrids = result.selectedGrids || [...grids.values()];
      for (const [grid, selected] of selectedGrids.map(grid => [grid, true]).concat(linked.map(change => [change.grid, false]))) {
        preview.append(new Polyline({ pos: projectCell(grid, next), points: next.vertexes, close: true,
          strokeColor: terrain === 'clear' ? result.hasContent ? '#a56308' : '#77818a' : selected ? '#1976b5' : '#d07a18',
          fillColor: terrain === 'clear' ? result.hasContent ? 'rgba(224,145,30,.22)' : 'rgba(119,129,138,.08)' : selected ? 'rgba(25,118,181,.15)' : 'rgba(208,122,24,.24)', lineWidth: 2 / viewport.scale }));
      }
      const rockReflow = appendRockReflow(preview, base, next, selectedGrids);
      next.root.append(preview);
      stroke.overlay = preview;
      stroke.adjusted = result.adjusted?.length || 0;
      stroke.candidate = next;
      stroke.failed = false;
      commitScene(next);
      clearIssue();
      status.textContent = `${terrain === 'clear' ? result.hasContent ? '待清除' : '无可清除内容' : '整笔预览'} · 选中 ${selectedGrids.length} 格${command.type && terrain !== 'clear' && !featureTools.includes(terrain) ? ` · 联动 ${linked.length} 格 · 实际改变 ${changes.length} 格` : ''}${result.adjusted?.length ? ` · ${result.adjusted.length} 格目标经整理调整` : ''}${rockReflow ? ` · 周围${rockReflow}格重新分块（类别保留）` : ''} · 松开提交 / Esc 取消`;
    } catch (error) {
      stroke.failed = true;
      stroke.candidate = null;
      commitScene(stroke.base);
      issues.hidden = false;
      issues.textContent = error.message;
      status.textContent = '当前形态无效 · 可继续拖动调整；松开拒绝或 Esc 取消';
    }
  }

  container.addEventListener('pointerdown', event => {
    suppressClick = false;
    if (!currentScene || stroke || pan) return;
    clearHover(true);
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
    if (event.button !== 0 || ![...brushTools, ...roadTools, ...featureTools].includes(tool)) return;
    event.preventDefault();
    ++loadRequestId; // 新编辑不能被较早的异步读取覆盖。
    // 从全图开始编辑时保持当前缩放，避免新增岸线改变外框导致笔尖漂移。
    viewport.mode = 'work';
    stroke = { base: currentScene, terrain: tool, treeKind: get('tree-kind').value, rockKind: get('rock-kind').value, entityIds: new Set(),
      offsets: [...roadTools, ...featureTools].includes(tool) ? [[0, 0]] : getBrushOffsets(),
      grids: new Map(), pointerId: event.pointerId };
    container.setPointerCapture?.(event.pointerId);
    previewStroke(event);
  });
  container.addEventListener('pointermove', event => { movePan(event); previewStroke(event); updateHover(event); });
  container.addEventListener('pointerleave', () => clearHover(true));
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
    const { base, candidate, failed, overlay, adjusted } = stroke;
    if (overlay) overlay.remove();
    stroke = null;
    releasePointer(event.pointerId);
    if (!failed && candidate && JSON.stringify(base.map) !== JSON.stringify(candidate.map)) {
      undoStack.push(base.map);
      redoStack.length = 0;
      status.textContent = `已提交整笔${adjusted ? ` · ${adjusted} 格目标经整理调整` : ''} · 可撤销`;
    } else {
      commitScene(base);
      status.textContent = failed ? '整笔已拒绝 · 地图未改变' : adjusted
        ? '目标经邻域整理后恢复原高度 · 可扩大笔刷或分级调整' : '地形未改变';
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

  get('map-climate').addEventListener('change', () => {
    const climate = get('map-climate').value;
    get('map-climate').value = currentScene?.map.climate || '';
    if (!currentScene || stroke || pan || climate === (currentScene.map.climate || '')) return;
    try {
      const map = { ...currentScene.map };
      if (climate) map.climate = climate;
      else delete map.climate;
      const next = prepareScene({ ...currentScene, map }, cameraAngle);
      ++loadRequestId;
      undoStack.push(currentScene.map);
      redoStack.length = 0;
      commitScene(next);
      clearIssue();
      status.textContent = '已更新气候与地表 · 可撤销';
    } catch (error) { fail(error); }
  });

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
  function showNewMapOptions(show) {
    get('new-map-options').hidden = !show;
    get('new-map').setAttribute('aria-expanded', String(show));
  }
  get('new-map').addEventListener('click', () => {
    if (!currentScene || stroke || pan) return;
    const show = get('new-map-options').hidden;
    if (show) {
      get('new-map-width').value = Math.min(64, currentScene.map.cells[0].length);
      get('new-map-height').value = Math.min(64, currentScene.map.cells.length);
    }
    showNewMapOptions(show);
  });
  get('cancel-new-map').addEventListener('click', () => showNewMapOptions(false));
  get('create-map').addEventListener('click', () => {
    if (!currentScene || stroke || pan) return;
    try {
      const elevation = presetHeight();
      const [width, height] = ['new-map-width', 'new-map-height'].map(id => Number(get(id).value));
      if (![width, height].every(value => Number.isInteger(value) && value >= 1 && value <= 64)) {
        throw new Error('地图宽高必须为 1～64 的整数');
      }
      const shape = get('new-map-shape').value;
      let cells;
      if (shape === 'rectangle') {
        // 复用错列菱形布局生成矩形轮廓，再换成地图使用的等距世界格坐标。
        const grids = window.qtiled.shapes.rhombus.getPositions([0, width - 1], [0, height - 1], currentScene.map.tileSize)
          .map(([x, y]) => window.qtiledView.pickGrid([x, y], { tileSize: currentScene.map.tileSize }));
        const minX = Math.min(...grids.map(grid => grid[0]));
        const minY = Math.min(...grids.map(grid => grid[1]));
        const columns = Math.max(...grids.map(grid => grid[0])) - minX + 1;
        const rows = Math.max(...grids.map(grid => grid[1])) - minY + 1;
        cells = Array.from({ length: rows }, () => Array(columns).fill(null));
        grids.forEach(([x, y]) => { cells[y - minY][x - minX] = { terrain: 'land', elevation }; });
      } else if (shape === 'diamond') {
        cells = Array.from({ length: height }, () => Array.from({ length: width }, () => ({ terrain: 'land', elevation })));
      } else {
        throw new Error('请选择菱形或矩形轮廓');
      }
      const map = {
        version: 2, id: 'new-map', tileSize: [...currentScene.map.tileSize],
        climate: get('new-map-climate').value,
        elevationStep: currentScene.elevationRules.elevationStep,
        cells,
        entities: [],
      };
      ++loadRequestId;
      readMap(JSON.stringify(map));
      clearSelection();
      viewport.mode = 'fit';
      updateViewport();
      showNewMapOptions(false);
      closeMenus();
      status.textContent = `已新建${shape === 'rectangle' ? '矩形' : '菱形'}地图 ${width} × ${height} · 基准高度 ${elevation} · 可撤销`;
    } catch (error) { fail(error); }
  });
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
  function showMapJson() {
    const { json } = requireSuccess(window.qtiledMaps.exportMapDefinition(currentScene.map, currentScene.elementsById));
    get('map-json').value = json;
    return json;
  }
  get('view-map-json').addEventListener('click', () => {
    if (!currentScene || stroke || pan) return;
    try {
      showMapJson();
      clearIssue();
      status.textContent = '已显示当前地图 JSON · 未下载，地图未改变';
    } catch (error) { fail(error); }
  });
  get('save-map').addEventListener('click', () => {
    if (!currentScene || stroke || pan) return;
    try {
      const json = showMapJson();
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
  get('map-sample').addEventListener('change', () => reload());
  get('reload').addEventListener('click', () => reload(true));
  updateToolHelp();
  reload();
})();
