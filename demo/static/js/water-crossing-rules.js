/* 桥梁与成对渡口：原作扫描/岸线表留在 Demo，地图保存实例与配对事实。
 * 证据：EmperorEdit 423d90/424040、4bb5a0、4c9020～4c97d0。
 */
(function () {
  const cardinal = [[0, -1], [1, 0], [0, 1], [-1, 0]];
  const body = [[0, 0], [1, 0], [0, 1], [1, 1]];
  const waterPatterns = [[1, 1, 0, 0], [0, 1, 0, 1], [0, 0, 1, 1], [1, 0, 1, 0]];
  const decks = [[0, -1], [2, 0], [1, 2], [-1, 1]];
  // 原作 0x838768/788/7a8：除主体两格水外，岸外还须有六格水。
  const apron = [[[-1, 0], [2, 0], [-1, -1], [2, -1], [0, -1], [1, -1]],
    [[1, -1], [1, 2], [2, -1], [2, 2], [2, 0], [2, 1]],
    [[2, 1], [-1, 1], [-1, 2], [2, 2], [0, 2], [1, 2]],
    [[0, -1], [0, 2], [-1, -1], [-1, 2], [-1, 0], [-1, 1]]];
  const isBridge = id => /^bridge-[xy]-[1-7]$/.test(id);
  const isFerry = id => /^ferry-[0-3]$/.test(id);
  const isCrossing = id => isBridge(id) || isFerry(id);
  const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
  const cellAt = (map, [x, y]) => map.cells[y]?.[x];
  const water = (map, grid) => cellAt(map, grid)?.terrain === 'water';
  const grids = (entity, elements) => elements[entity.element].footprint.map(offset => add(entity.grid, offset));
  const error = message => ({ definition: null, issues: [{ path: 'entities', code: 'water-crossing', message }] });
  const clean = cell => cell && !cell.road && !cell.cityWall && !cell.residentialWall
    && !window.landWaterRules.naturalFields.some(key => cell[key] !== undefined);
  const available = (map, points, elements, tiles, ignored = []) => {
    const occupied = new Set(map.entities.filter(entity => !ignored.includes(entity.id)).flatMap(entity => grids(entity, elements).map(String)));
    return points.every(grid => clean(cellAt(map, grid)) && !occupied.has(String(grid)) && !tiles.find(tile => String(tile.grid) === String(grid))?.slope);
  };
  const nextId = (map, prefix) => {
    let n = 1;
    while (map.entities.some(entity => entity.id === `${prefix}-${n}`)) n++;
    return `${prefix}-${n}`;
  };

  function bridgeAt(map, grid, elements, tiles = [], ignored = []) {
    if (!water(map, grid)) return error('请指向紧邻陆岸的水格建桥。');
    const height = cellAt(map, grid).elevation;
    const neighbors = cardinal.map(offset => add(grid, offset));
    // 起点及四邻不能已有桥；两端邻接半坡/坡道也不接受。
    if (map.entities.some(entity => isBridge(entity.element) && !ignored.includes(entity.id)
      && grids(entity, elements).some(point => [grid, ...neighbors].some(other => String(point) === String(other))))) return error('桥梁不能紧贴已有桥梁。');
    if (neighbors.some(point => tiles.find(tile => String(tile.grid) === String(point))?.slope)) return error('桥梁两岸需要平地。');
    for (let direction = 0; direction < 4; direction++) {
      const step = cardinal[direction], back = neighbors[(direction + 2) % 4];
      if (cellAt(map, back)?.terrain !== 'land' || cellAt(map, back).elevation !== height) continue;
      const points = [];
      let point = grid;
      while (water(map, point) && points.length < 8) { points.push(point); point = add(point, step); }
      if (!points.length || points.length > 7 || cellAt(map, point)?.terrain !== 'land' || cellAt(map, point).elevation !== height) continue;
      if (cardinal.some(offset => tiles.find(tile => String(tile.grid) === String(add(points[points.length - 1], offset)))?.slope)) continue;
      if (points.some(part => cellAt(map, part).elevation !== height) || !available(map, points, elements, tiles, ignored)) continue;
      // 多格桥两端须是三面环水的岸边水格；单格窄河允许两侧都是岸。
      if (points.length > 1 && [points[0], points[points.length - 1]].some(end => cardinal.filter(offset => water(map, add(end, offset))).length !== 3)) continue;
      const axis = step[0] ? 'x' : 'y';
      return { entity: { id: nextId(map, 'bridge'), element: `bridge-${axis}-${points.length}`,
        grid: points.reduce((a, b) => a[axis === 'x' ? 0 : 1] < b[axis === 'x' ? 0 : 1] ? a : b), angle: 0 }, issues: [] };
    }
    return error('需要同高平坦两岸、1～7格直线水面，以及无遮挡的桥位。');
  }

  function ferryAt(map, grid, elements, tiles = [], ignored = []) {
    for (let direction = 0; direction < 4; direction++) {
      const entity = { id: nextId(map, 'ferry'), element: `ferry-${direction}`, grid, angle: 0 };
      const points = grids(entity, elements), height = cellAt(map, grid)?.elevation;
      if (!body.every((offset, i) => cellAt(map, add(grid, offset))?.terrain === (waterPatterns[direction][i] ? 'water' : 'land'))) continue;
      if (!apron[direction].every(offset => water(map, add(grid, offset)))) continue;
      if (points.some(point => cellAt(map, point)?.elevation !== height) || !available(map, points, elements, tiles, ignored)) continue;
      return { entity, issues: [] };
    }
    return error('渡口需要平坦岸线：2×2内两格陆地、两格水，岸外留出水面；请先清除道路、地物和实体。');
  }

  // 4c9430 的直线探岸距离；4c9020 候选向前展开，侧移最多5格，纵向上限31。
  function ferryCandidates(map, first, elements, tiles = []) {
    const direction = Number(first.element.slice(-1)), step = cardinal[direction];
    let distance = 2;
    while (distance < 32 && water(map, add(first.grid, step.map(value => value * distance)))) distance++;
    const limit = Math.min(distance >= 32 ? 3 : distance + 3, 31);
    const candidates = [];
    for (let forward = 0; forward <= limit; forward++) for (let side = -Math.min(forward, 5); side <= Math.min(forward, 5); side++) {
      const grid = add(first.grid, [step[0] * forward - step[1] * side, step[1] * forward + step[0] * side]);
      const result = ferryAt(map, grid, elements, tiles, [first.id]);
      if (result.entity?.element !== `ferry-${(direction + 2) % 4}` || cellAt(map, grid)?.elevation !== cellAt(map, first.grid).elevation) continue;
      if (grids(first, elements).some(a => grids(result.entity, elements).some(b => String(a) === String(b)))) continue;
      if (waterRoute(map, add(first.grid, decks[direction]), add(grid, decks[(direction + 2) % 4]))) candidates.push(result.entity);
    }
    return candidates;
  }

  // 编辑器仅检查四邻水面连通；不创建运行时船只、航道或行人系统。
  function waterRoute(map, start, end) {
    const seen = new Set([String(start)]), queue = [start];
    for (let i = 0; i < queue.length; i++) {
      if (String(queue[i]) === String(end)) return true;
      for (const offset of cardinal) {
        const next = add(queue[i], offset), key = String(next);
        if (water(map, next) && !seen.has(key)) { seen.add(key); queue.push(next); }
      }
    }
    return false;
  }

  function validate(map, elements, tiles) {
    for (const entity of map.entities.filter(item => isCrossing(item.element))) {
      if (entity.angle !== 0) return error('桥梁和渡口方向由岸线决定，不能任意旋转占地。');
      const rest = { ...map, entities: map.entities.filter(item => item.id !== entity.id) };
      if (isBridge(entity.element)) {
        const result = bridgeAt(rest, entity.grid, elements, tiles);
        if (!result.entity || result.entity.element !== entity.element || String(result.entity.grid) !== String(entity.grid)) return error('桥梁跨度或岸线已失效，请先拆桥再编辑地形。');
      } else {
        if (ferryAt(rest, entity.grid, elements, tiles).entity?.element !== entity.element) return error('渡口岸线已失效，请先拆渡口再编辑地形。');
        const partner = map.entities.find(item => item.id === entity.partner);
        if (!partner || partner.partner !== entity.id || !isFerry(partner.element)) return error('渡口必须保存互相引用的完整配对。');
        const unpaired = { ...map, entities: map.entities.filter(item => item.id !== entity.id && item.id !== partner.id) };
        if (!ferryCandidates(unpaired, entity, elements, tiles).some(item => String(item.grid) === String(partner.grid))) return error('渡口两端必须在范围内相向、同高程且水路连通。');
      }
    }
    return { issues: [] };
  }

  function remove(map, ids) {
    const removed = new Set(ids);
    map.entities.forEach(entity => { if (removed.has(entity.id) && isFerry(entity.element)) removed.add(entity.partner); });
    return { ...map, entities: map.entities.filter(entity => !removed.has(entity.id)) };
  }

  function draws(entity, map, elements, view) {
    const height = cellAt(map, entity.grid).elevation * (map.elevationStep || 0);
    const draw = (id, grid) => window.qtiledElementRendering.resolveElementDraw(elements[`crossing-part-${id}`], grid,
      { ...view, originPixel: [0, -height] });
    if (isBridge(entity.element)) {
      const points = grids(entity, elements), projected = points.map(grid => ({ grid, pos: window.qtiledView.projectGrid(grid, view) }));
      const axis = entity.element.split('-')[1], quarter = (view.angle || 0) / 90;
      const family = (axis === 'x' ? quarter % 2 : 1 - quarter % 2);
      projected.sort((a, b) => b.pos[1] - a.pos[1]);
      const base = 1934 + points.length * (points.length - 1) + family * points.length;
      return projected.flatMap(({ grid }, i) => [draw(base + i, grid), draw(base + i + 56, grid)]);
    }
    // 原图0的踏板在画面右后方，对应本投影的方向1；素材方向比逻辑方向少一格。
    const direction = Number(entity.element.slice(-1)), image = (direction + (view.angle || 0) / 90 + 3) % 4;
    const footprint = body.map(offset => add(entity.grid, offset));
    const positions = footprint.map(grid => window.qtiledView.projectGrid(grid, view));
    const main = draw(1896 + image, entity.grid);
    main.position = [Math.min(...positions.map(pos => pos[0])) - 39, Math.max(...positions.map(pos => pos[1])) + 20 - main.rect[3] - height];
    main.footprint = footprint.map(grid => ({ grid, position: window.qtiledView.projectGrid(grid, view) }));
    const deck = draw(1900 + image, add(entity.grid, decks[direction]));
    return image === 0 || image === 3 ? [deck, main] : [main, deck];
  }

  window.waterCrossingRules = { isBridge, isFerry, isCrossing, bridgeAt, ferryAt, ferryCandidates, validate, remove, draws, grids };
}());
