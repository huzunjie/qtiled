/* 普通道路与静态建筑的 Demo 规则：保存事实，按当前邻接重建道路外观。
 * 地图/矩形/旋转/占用由公共库处理；原作选图与本工具的兼容约束留在工具层。
 */
(function () {
  const buildingId = 'courtyard-house';
  const cardinal = [[0, -1], [1, 0], [0, 1], [-1, 0]];
  const issue = (path, code, message) => ({ path, code, message });
  // 既有装饰实例可共存；本批建筑的整个地基独占，不改变核心库默认策略。
  const canCoexist = ({ entities }) => !entities.some(entity => entity.element === buildingId);

  // 坡道只从高、低两端接路；半坡的两个部件属于同一段道路。
  function connects(tile, neighbor, cell, other, dx, dy) {
    if (!tile?.ramp) return true;
    if (tile.halfSlope && tile.slopeOwner.join(',') === neighbor?.slopeOwner?.join(',')) return true;
    const [sx, sy] = tile.slopeDirection;
    return (tile.slopePart === 0 && dx === -sx && dy === -sy && other.elevation === cell.elevation + 1)
      || (tile.slopePart === (tile.halfSlope ? 1 : 0) && dx === sx && dy === sy && other.elevation === cell.elevation);
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
      if (cell.beach && occupants.length) issues.push(issue(path, 'beach-entity', '海滩不能与建筑或其他实体重叠。'));
      const building = occupants.some(id => map.entities.find(entity => entity.id === id)?.element === buildingId);
      if (cell.road !== undefined && cell.road !== 'ordinary') {
        issues.push(issue(`${path}.road`, 'unsupported-road', '仅支持普通道路 ordinary；无道路时省略 road。'));
      }
      if (!cell.road && !building) continue;
      if (cell.terrain !== 'land' || (tile?.slope && (building || !tile.ramp))) {
        issues.push(issue(path, 'construction-ground', '建筑需要平坦陆地；道路可经过坡道，不能占用水域或普通坡面。'));
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
      if (erase) delete cell.road;
      else cell.road = 'ordinary';
    }
    return { definition: { ...map, cells }, issues: [], selectedGrids: [...selected.values()] };
  }

  window.constructionRules = { buildingId, canCoexist, validate, resolve, applyRoadStroke };
})();
