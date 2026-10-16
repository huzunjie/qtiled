/* 普通道路与静态实体的 Demo 规则：保存事实，按当前邻接重建道路外观。
 * 地图/矩形/旋转/占用由公共库处理；原作选图与本工具的兼容约束留在工具层。
 */
(function () {
  const buildingId = 'courtyard-house';
  const isSolid = element => element === buildingId || /^emperor-pinnacle-[1-4]$/.test(element);
  const wallBases = [370, 387, 404, 421];
  const isGate = value => /^gate-[1-4]$/.test(value);
  const cardinal = [[0, -1], [1, 0], [0, 1], [-1, 0]];
  const issue = (path, code, message) => ({ path, code, message });
  // 原作住宅墙专用表：N/E/S/W 四位邻接，四列为原作四镜头；不能套用道路表。
  const wallViews = [[0, 2, 0, 2], [2, 0, 2, 0], [0, 2, 0, 2], [7, 6, 5, 4],
    [2, 0, 2, 0], [2, 0, 2, 0], [4, 7, 6, 5], [9, 8, 11, 10],
    [0, 2, 0, 2], [6, 5, 4, 7], [0, 2, 0, 2], [8, 11, 10, 9],
    [5, 4, 7, 6], [11, 10, 9, 8], [10, 9, 8, 11], [12, 12, 12, 12]];
  // 既有装饰实例可共存；建筑和山峰的完整占地独占，不改变核心库默认策略。
  const canCoexist = ({ entities }) => !entities.some(entity => isSolid(entity.element));

  // Demo 的地表适用规则；当前实例默认陆地，水面专属元素声明 groundTerrain: 'water'。
  const supportsGround = (element, cell) => cell
    && !window.landWaterRules.naturalFields.some(key => cell[key] !== undefined)
    && cell.terrain === (element.groundTerrain || 'land');

  function reconcileSurface(before, after, elements) {
    const occupancy = window.qtiledMaps.buildMapOccupancy(before, elements, canCoexist);
    if (occupancy.issues.length) return { definition: null, issues: occupancy.issues };
    const removed = new Set();
    const entities = new Map(before.entities.map(entity => [entity.id, entity]));
    const cells = after.cells.map((row, y) => row.map((cell, x) => {
      const old = before.cells[y][x];
      if (!cell || ['terrain', ...window.landWaterRules.naturalFields].every(key => cell[key] === old?.[key])) return cell;
      for (const id of occupancy.index.get(`${x},${y}`) || []) {
        if (!supportsGround(elements[entities.get(id).element], cell)) removed.add(id);
      }
      if (cell.road && (cell.terrain !== 'land' || cell.beach)) {
        const next = { ...cell };
        delete next.road;
        delete next.residentialWall;
        return next;
      }
      if (cell.residentialWall && !supportsGround({}, cell)) {
        const next = { ...cell };
        delete next.residentialWall;
        return next;
      }
      return cell;
    }));
    return { definition: { ...after, cells, entities: after.entities.filter(entity => !removed.has(entity.id)) }, issues: [] };
  }

  // 地表笔刷先形成最终陆水/岸带，再处理完整实例；不把中间水格当成删除依据。
  function applySurfaceStroke(map, terrain, grids, elements, rules, elevationRules) {
    if (!['land', 'water', 'beach'].includes(terrain)) {
      return { definition: null, issues: [issue('$tool', 'invalid-surface-tool', '仅支持陆地、水域和海滩笔刷。')] };
    }
    const cells = map.cells.map(row => row.map(cell => cell && { ...cell }));
    for (const [x, y] of grids) {
      if (!Number.isSafeInteger(x) || !Number.isSafeInteger(y) || !cells[y]?.[x]) {
        return { definition: null, issues: [issue('$grids', 'surface-outside', '笔刷不能越界或经过空角。')] };
      }
      window.landWaterRules.replaceNaturalCell(cells[y][x], terrain);
    }
    const banks = window.elevationRules.normalizeWaterBanks({ ...map, cells }, elements, true);
    if (banks.issues.length) return banks;
    // 海滩可能在坡面整理时撤回；清理必须依据最终地表，不能先删合法道路/实体。
    let result = window.beachRules.normalize(banks.definition, [...grids, ...banks.bankGrids], terrain === 'beach', rules);
    if (result.issues.length) return result;
    if (elevationRules) {
      result = window.elevationRules.reconcileTerrain(map, result.definition, elements, rules, elevationRules);
      if (result.issues.length) return result;
      return { ...result, bankGrids: banks.bankGrids };
    }
    // 草沙整理也可能改变笔刷外的基础属性，清理以实际差分为准。
    return { ...reconcileSurface(map, result.definition, elements), bankGrids: banks.bankGrids };
  }

  // 坡道只从高、低两端接路；半坡的两个部件属于同一段道路。
  function connects(tile, neighbor, cell, other, dx, dy) {
    if (!tile?.ramp) return true;
    if (tile.halfSlope && tile.slopeOwner.join(',') === neighbor?.slopeOwner?.join(',')) return true;
    const [sx, sy] = tile.slopeDirection;
    return (tile.slopePart === 0 && dx === -sx && dy === -sy && other.elevation === cell.elevation + 1)
      || (tile.slopePart === (tile.halfSlope ? 1 : 0) && dx === sx && dy === sy && other.elevation === cell.elevation);
  }

  // 显式地形编辑完成后按最终坡面清理；读取地图仍只校验，不修补输入。
  function reconcileTerrain(before, after, tiles, elements) {
    const occupancy = window.qtiledMaps.buildMapOccupancy(before, elements, canCoexist);
    if (occupancy.issues.length) return { definition: null, issues: occupancy.issues };
    const cells = after.cells.map(row => row.map(cell => cell && { ...cell }));
    const byGrid = new Map(tiles.map(tile => [tile.grid.join(','), tile]));
    for (const tile of tiles) {
      const [x, y] = tile.grid;
      const cell = cells[y][x];
      if (tile.slope || cell.terrain !== 'land') {
        window.landWaterRules.naturalFields.forEach(key => { delete cell[key]; });
      }
      if (cell.terrain !== 'land' || cell.beach || (tile.slope && !tile.ramp)) delete cell.road;
    }
    const removeRoads = new Set();
    for (const tile of tiles) {
      const [x, y] = tile.grid;
      const cell = cells[y][x];
      if (!cell.road) continue;
      if (cardinal.some(([dx, dy]) => {
        const neighbor = cells[y + dy]?.[x + dx];
        if (!neighbor?.road) return false;
        const other = byGrid.get(`${x + dx},${y + dy}`);
        // 只清除自身无法接入的坡段；对端会检查自身资格，不连带删除平地支路。
        return !connects(tile, other, cell, neighbor, dx, dy)
          || (!tile.ramp && !other?.ramp && neighbor.elevation !== cell.elevation);
      })) removeRoads.add(`${x},${y}`);
    }
    // 半坡道路任一部件失效时整体清路，不留下单片道路。
    for (const tile of tiles.filter(tile => tile.halfSlope)) {
      const [x, y] = tile.slopeOwner;
      const [dx, dy] = tile.slopeDirection;
      const parts = [[x, y], [x + dx, y + dy]];
      if (parts.some(([px, py]) => !cells[py][px].road || removeRoads.has(`${px},${py}`))) {
        parts.forEach(grid => removeRoads.add(grid.join(',')));
      }
    }
    removeRoads.forEach(key => { const [x, y] = key.split(',').map(Number); delete cells[y][x].road; });
    for (const tile of tiles) {
      const [x, y] = tile.grid;
      const cell = cells[y][x];
      if (cell.residentialWall && (!supportsGround({}, cell) || tile.slope
        || (isGate(cell.residentialWall) && !cell.road))) delete cell.residentialWall;
    }
    const entities = new Map(after.entities.map(entity => [entity.id, entity]));
    const heights = new Map();
    const removed = new Set();
    for (const [key, ids] of occupancy.index) {
      const [x, y] = key.split(',').map(Number);
      const cell = cells[y][x];
      for (const id of ids) {
        const entity = entities.get(id);
        if (!entity) continue;
        if (!heights.has(id)) heights.set(id, cell?.elevation);
        if (!supportsGround(elements[entity.element], cell) || byGrid.get(key)?.slope
          || cell.elevation !== heights.get(id)) removed.add(id);
      }
    }
    return { definition: { ...after, cells, entities: after.entities.filter(entity => !removed.has(entity.id)) }, issues: [] };
  }

  function validate(map, tiles, elements) {
    const occupancy = window.qtiledMaps.buildMapOccupancy(map, elements, canCoexist);
    const issues = [...occupancy.issues];
    if (issues.length) return { issues, index: occupancy.index };
    const byGrid = new Map(tiles.map(tile => [tile.grid.join(','), tile]));
    for (const [y, row] of map.cells.entries()) for (const [x, cell] of row.entries()) {
      if (!cell) continue;
      const path = `cells[${y}][${x}]`;
      const tile = byGrid.get(`${x},${y}`);
      const occupants = occupancy.index.get(`${x},${y}`) || [];
      if (occupants.some(id => !supportsGround(elements[map.entities.find(entity => entity.id === id).element], cell))) {
        issues.push(issue(path, 'entity-ground', '实体完整占地的地表或地物不符合放置要求。'));
      }
      const building = occupants.some(id => isSolid(map.entities.find(entity => entity.id === id)?.element));
      if (cell.residentialWall !== undefined) {
        if (typeof cell.residentialWall !== 'string' || !/^(wall|gate)-[1-4]$/.test(cell.residentialWall)) {
          issues.push(issue(`${path}.residentialWall`, 'unsupported-wall', '仅支持四款住宅墙 wall-1～4 和门 gate-1～4。'));
        }
        if (!supportsGround({}, cell) || tile?.slope || occupants.length) {
          issues.push(issue(path, 'wall-ground', '住宅围墙需要平坦陆地，不能与地物或其他实体重叠。'));
        }
        if (isGate(cell.residentialWall) !== (cell.road === 'ordinary')) {
          issues.push(issue(path, 'wall-road', '住宅门需要保留普通道路；已有墙不能直接铺路，须先拆墙。'));
        }
      }
      if (cell.road !== undefined && cell.road !== 'ordinary') {
        issues.push(issue(`${path}.road`, 'unsupported-road', '仅支持普通道路 ordinary；无道路时省略 road。'));
      }
      if (!cell.road && !building) continue;
      if (cell.terrain !== 'land' || (tile?.slope && (building || !tile.ramp))) {
        issues.push(issue(path, 'construction-ground', '建筑和山峰需要平坦陆地；道路可经过坡道，不能占用水域或普通坡面。'));
      }
      if (cell.road && occupants.length) issues.push(issue(path, 'road-occupied', '道路不能与建筑或装饰实体重叠。'));
      if (cell.road && cardinal.some(([dx, dy]) => {
        const neighbor = map.cells[y + dy]?.[x + dx];
        if (!neighbor?.road) return false;
        const other = byGrid.get(`${x + dx},${y + dy}`);
        return !connects(tile, other, cell, neighbor, dx, dy) || !connects(other, tile, neighbor, cell, -dx, -dy)
          || (!tile?.ramp && !other?.ramp && neighbor.elevation !== cell.elevation);
      })) issues.push(issue(path, 'road-height', '高差道路必须经过坡道的高低两端，不能侧入、交叉或直接跨越高差。'));
    }
    return { issues, index: occupancy.index };
  }

  function resolve(map, tiles, elements, rules, angle = 0) {
    const validation = validate(map, tiles, elements);
    if (validation.issues.length) return { ...validation, tiles: [] };
    const column = rules?.qtiledCameraColumns?.[[0, 90, 180, 270].indexOf(angle)];
    if (!Number.isInteger(column) || !Array.isArray(rules?.rows) || !rules.rows.length) {
      return { issues: [issue('$roadRules', 'invalid-road-rules', '普通道路规则缺失。')], tiles: [] };
    }
    const issues = [];
    const result = tiles.map(tile => {
      const [x, y] = tile.grid;
      const cell = map.cells[y][x];
      if (cell.residentialWall) {
        const mask = field => cardinal.reduce((value, [dx, dy], i) => value
          | (map.cells[y + dy]?.[x + dx]?.[field] ? 1 << i : 0), 0);
        const walls = mask('residentialWall');
        let offset = wallViews[walls][column];
        let variant = 0;
        if (isGate(cell.residentialWall)) {
          const roads = mask('road');
          offset = (roads ? roads & 5 : walls & 10) ? 13 : 14;
          if (column % 2) offset = 27 - offset;
        } else if (offset === 0 || offset === 2) {
          // Demo 的稳定变体，不复制原作刷新次序相关的随机状态。
          variant = ((x * 31 + y * 17) >>> 0) % 2;
          offset += variant;
        }
        const element = `residential-wall-${wallBases[Number(cell.residentialWall.slice(-1)) - 1] + offset}`;
        if (!elements[element]) issues.push(issue(`cells[${y}][${x}].residentialWall`, 'missing-wall-element', '缺少住宅墙或门素材。'));
        return { ...tile, element, variant, residentialWall: cell.residentialWall, ...(cell.road ? { road: cell.road } : {}) };
      }
      if (!map.cells[y][x].road) return tile;
      if (tile.ramp) return { ...tile, road: 'ordinary' };
      const neighbors = rules.neighborOffsets.map(([dx, dy]) => map.cells[y + dy]?.[x + dx]?.road === 'ordinary' ? 1 : 0);
      const row = rules.rows.find(row => row.conditions.every((value, i) => value === 2 || value === neighbors[i]));
      // 稳定的世界坐标变体；镜头、重绘和邻接遍历顺序不改变它。
      const variant = row ? ((x * 31 + y * 17) >>> 0) % row.variants : 0;
      const element = row && `road-${rules.roadBase + row.viewOffsets[column] + variant}`;
      if (!element || !elements[element]) issues.push(issue(`cells[${y}][${x}].road`, 'missing-road-element', '缺少道路连接素材。'));
      return { ...tile, element, variant, road: 'ordinary' };
    });
    return { ...validation, issues, tiles: issues.length ? [] : result };
  }

  function applyRoadStroke(map, grids, erase = false, tiles = []) {
    const cells = map.cells.map(row => row.map(cell => cell && { ...cell }));
    const selected = new Map(grids.map(grid => [grid.join(','), grid]));
    const byGrid = new Map(tiles.map(tile => [tile.grid.join(','), tile]));
    for (const grid of grids) {
      const tile = byGrid.get(grid.join(','));
      if (!tile?.halfSlope) continue;
      const [x, y] = tile.slopeOwner;
      const [dx, dy] = tile.slopeDirection;
      for (const part of [[x, y], [x + dx, y + dy]]) selected.set(part.join(','), part);
    }
    for (const [x, y] of selected.values()) {
      const cell = cells[y]?.[x];
      if (!cell) return { definition: null, issues: [issue(`cells[${y}][${x}]`, 'road-outside', '道路整笔不能越界或经过空角。')] };
      if ((!erase && cell.residentialWall && !isGate(cell.residentialWall)) || (erase && isGate(cell.residentialWall))) {
        return { definition: null, issues: [issue(`cells[${y}][${x}]`, 'wall-road', '请先拆除住宅墙或门，再编辑其下道路。')] };
      }
      if (erase) delete cell.road;
      else cell.road = 'ordinary';
    }
    return { definition: { ...map, cells }, issues: [], selectedGrids: [...selected.values()] };
  }

  function applyWallStroke(map, grids, erase = false, style = 1) {
    if (!Number.isInteger(style) || style < 1 || style > 4) return { definition: null, issues: [issue('$wallStyle', 'unsupported-wall', '请选择住宅围墙款式 1～4。')] };
    const cells = map.cells.map(row => row.map(cell => cell && { ...cell }));
    for (const [x, y] of grids) {
      const cell = cells[y]?.[x];
      if (!cell) return { definition: null, issues: [issue(`cells[${y}][${x}]`, 'wall-outside', '围墙整笔不能越界或经过空角。')] };
      if (erase) delete cell.residentialWall;
      else if (cell.residentialWall && Number(cell.residentialWall.slice(-1)) !== style) {
        return { definition: null, issues: [issue(`cells[${y}][${x}]`, 'wall-occupied', '更换围墙款式前请先拆除已有墙门。')] };
      } else if (!cell.residentialWall) cell.residentialWall = `${cell.road ? 'gate' : 'wall'}-${style}`;
    }
    return { definition: { ...map, cells }, issues: [], selectedGrids: grids };
  }

  window.constructionRules = { buildingId, isSolid, canCoexist, validate, resolve, applyRoadStroke, applyWallStroke, reconcileSurface, applySurfaceStroke, reconcileTerrain };
})();
