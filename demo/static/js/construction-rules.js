/* 普通道路与静态建筑的 Demo 规则：保存事实，按当前邻接重建道路外观。
 * 地图/矩形/旋转/占用由公共库处理；原作选图与本工具的兼容约束留在工具层。
 */
(function () {
  const buildingId = 'courtyard-house';
  const cardinal = [[0, -1], [1, 0], [0, 1], [-1, 0]];
  const issue = (path, code, message) => ({ path, code, message });
  // 既有装饰实例可共存；本批建筑的整个地基独占，不改变核心库默认策略。
  const canCoexist = ({ entities }) => !entities.some(entity => entity.element === buildingId);

  function validate(map, tiles, elements) {
    const occupancy = window.qtiledMaps.buildMapOccupancy(map, elements, canCoexist);
    const issues = [...occupancy.issues];
    if (issues.length) return { issues, index: occupancy.index };
    const slopes = new Set(tiles.filter(tile => tile.slope).map(tile => tile.grid.join(',')));
    for (const [y, row] of map.cells.entries()) for (const [x, cell] of row.entries()) {
      if (!cell) continue;
      const path = `cells[${y}][${x}]`;
      const occupants = occupancy.index.get(`${x},${y}`) || [];
      const building = occupants.some(id => map.entities.find(entity => entity.id === id)?.element === buildingId);
      if (cell.road !== undefined && cell.road !== 'ordinary') {
        issues.push(issue(`${path}.road`, 'unsupported-road', '仅支持普通道路 ordinary；无道路时省略 road。'));
      }
      if (!cell.road && !building) continue;
      if (cell.terrain !== 'land' || slopes.has(`${x},${y}`)) {
        issues.push(issue(path, 'construction-ground', '道路与建筑需要平坦陆地，不能占用水域或坡面。'));
      }
      if (cell.road && occupants.length) issues.push(issue(path, 'road-occupied', '道路不能与建筑或装饰实体重叠。'));
      if (cell.road && cardinal.some(([dx, dy]) => {
        const neighbor = map.cells[y + dy]?.[x + dx];
        return neighbor?.road && neighbor.elevation !== cell.elevation;
      })) issues.push(issue(path, 'road-height', '相邻道路必须等高；本批不支持跨高差道路。'));
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

  function applyRoadStroke(map, grids, erase = false) {
    const cells = map.cells.map(row => row.map(cell => cell && { ...cell }));
    for (const [x, y] of grids) {
      const cell = cells[y]?.[x];
      if (!cell) return { definition: null, issues: [issue(`cells[${y}][${x}]`, 'road-outside', '道路整笔不能越界或经过空角。')] };
      if (erase) delete cell.road;
      else cell.road = 'ordinary';
    }
    return { definition: { ...map, cells }, issues: [] };
  }

  window.constructionRules = { buildingId, canCoexist, validate, resolve, applyRoadStroke };
})();
