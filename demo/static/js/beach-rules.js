/* 海滩业务规则：作者只保存 land 上的 beach:true，岸边记录按当前地图派生。
 * 取证：beach-mvp-evidence-2026-10-13。海滩本格保持平地，允许邻接完整坡面岸带；不模拟原编辑器历史记录生命周期。
 */
(function () {
  const neighbors = [[0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]];
  const issue = (path, code, message) => ({ path, code, message });

  function validate(map) {
    const issues = [];
    for (const [y, row] of map.cells.entries()) for (const [x, cell] of row.entries()) {
      if (!cell || cell.beach === undefined) continue;
      const path = `cells[${y}][${x}].beach`;
      if (cell.beach !== true || cell.terrain !== 'land') {
        issues.push(issue(path, 'invalid-beach', '海滩必须为陆地上的 beach:true；无海滩时省略。'));
      }
      if (cell.road || cell.tree !== undefined || cell.rock !== undefined || cell.quarry !== undefined) {
        issues.push(issue(path, 'beach-occupied', '海滩不能覆盖道路、树木、岩石或采石地，请先清除冲突内容。'));
      }

    }
    return issues;
  }

  function select(cells, x, y, column, rules, waterRow, stable) {
    const at = (px, py) => cells[py]?.[px];
    const beachAt = (px, py) => at(px, py)?.beach === true && at(px, py).elevation === at(x, y).elevation;
    const waterAt = (px, py) => !at(px, py) || at(px, py).terrain === 'water';
    const ring = neighbors.map(([dx, dy]) => beachAt(x + dx, y + dy) ? 1 : 0);
    if (beachAt(x, y)) return { record: 736 + stable % 6, kind: 'sand', variant: stable % 6 };
    if (!ring.some(Boolean)) return null;
    if (!waterAt(x, y)) {
      const row = rules.beachRows.find(pattern => pattern.conditions.every((value, i) => value === 2 || value === ring[i]));
      const offset = row?.viewOffsets[column];
      // 742～753 是完整草沙原图；754～756 含水石，不能用于纯草沙边界。
      if (offset >= 0 && offset < 12) {
        return { record: 742 + offset, kind: 'land-edge', variant: 0 };
      }
      return { issue: issue(`cells[${y}][${x}]`, 'beach-shape-needs-adjustment',
        '此处草沙轮廓不能由完整原图表达，请用陆地或海滩笔刷整理轮廓；原地图未改写。') };
    }
    if (!waterRow) return null;
    const offset = waterRow.viewOffsets[column];
    const camera = column * 2;
    // fresh 41eef0 记录：+18 保存中心 BEACH 布尔值，不是邻格计数。
    const rim = (px, py) => !beachAt(px, py)
      && neighbors.some(([dx, dy]) => beachAt(px + dx, py + dy))
      && !(waterAt(px, py) && neighbors.every(([dx, dy]) => waterAt(px + dx, py + dy) || beachAt(px + dx, py + dy)));
    const rims = neighbors.map(([dx, dy]) => rim(x + dx, y + dy));
    // 544650 跳表与 5443b3..5444c5；顺序保留原分支优先级。
    const options = {
      0: [[-4, 4]], 4: [[-2, 6]], 8: [[0, 0]], 12: [[2, 2]],
      16: [[-2, 6], [-4, 4]], 20: [[-2, 6], [0, 0]],
      24: [[2, 2], [0, 0]], 28: [[2, 2], [-4, 4]],
    };
    const direction = options[offset]?.find(([turn]) => rims[(camera + turn + 8) % 8])?.[1];
    if (direction === undefined) return { record: 574 + offset + stable % waterRow.variants, kind: 'coast', variant: stable % waterRow.variants };
    let extra = offset < 16 ? 0 : Math.min(ring.reduce((sum, value) => sum + value, 0), 2) * 2;
    if (extra === 2 && ring.some((value, i) => i % 2 === 0 && value)) extra = 4;
    const side = ring[(camera + direction + 1) % 8] || ring[(camera + direction + 2) % 8] ? 1 : 0;
    return { record: 736 + (((direction + 4) % 8) + 6) * 3 + extra + side, kind: 'mixed-coast', variant: 0 };
  }

  // 工具约定：落笔后单向扩展目标地表，直到草沙边界可由完整原图表达。
  // 不冒称原作递归算法；读图只选图，只有显式笔刷调用此整理。
  function normalize(map, grids, sand, rules) {
    if (!map.cells.some(row => row.some(cell => cell?.beach))) return { definition: map, issues: [] };
    if (!Array.isArray(rules?.beachRows)) return { definition: null, issues: [issue('$rules.beachRows',
      'missing-beach-patterns', '缺少草沙原图规则，请更新规则文件后重试。')] };
    const cells = map.cells.map(row => row.map(cell => cell && { ...cell }));
    const queue = [];
    const enqueue = (x, y) => {
      queue.push([x, y]);
      for (const [dx, dy] of neighbors) queue.push([x + dx, y + dy]);
    };
    grids.forEach(([x, y]) => enqueue(x, y));
    const rows = rules.beachRows.filter(row => row.viewOffsets.every(offset => offset >= 0 && offset < 12));
    // 无相邻海滩时回到既有草地/裸地，不另造一个海滩元素。
    rows.push({ conditions: neighbors.map(() => 0) });
    for (let cursor = 0; cursor < queue.length; cursor += 1) {
      const [x, y] = queue[cursor];
      const cell = cells[y]?.[x];
      if (!cell || cell.terrain !== 'land' || cell.beach
        || window.landWaterRules.needsSlope(cells, x, y)) continue;
      const ring = neighbors.map(([dx, dy]) => +(cells[y + dy]?.[x + dx]?.beach === true && cells[y + dy][x + dx].elevation === cell.elevation));
      if (rows.some(row => row.conditions.every((value, i) => value === 2 || value === ring[i]))) continue;
      const editable = (px, py) => {
        const other = cells[py]?.[px];
        return other?.terrain === 'land' && other.elevation === cell.elevation
          && other.ramp === undefined && other.halfSlope === undefined;
      };
      let edits = editable(x, y) ? [[x, y]] : null;
      if (!sand) {
        // 只移除必要的邻格海滩；按原表顺序打破同量候选的平局，与镜头无关。
        const candidates = rows.filter(row => row.conditions.every((value, i) => value !== 1 || ring[i]))
          .map(row => neighbors.flatMap(([dx, dy], i) => row.conditions[i] === 0 && ring[i] ? [[x + dx, y + dy]] : []))
          .filter(candidate => candidate.every(([px, py]) => editable(px, py)))
          .sort((a, b) => a.length - b.length);
        edits = candidates[0];
      }
      if (!edits?.length) return { definition: null, issues: [issue(`cells[${y}][${x}]`, 'beach-adjustment-protected',
        '草沙轮廓整理遇到非平地或坡道标记，整笔取消；请调整地形或选区。')] };
      for (const [px, py] of edits) {
        if (sand) window.landWaterRules.replaceNaturalCell(cells[py][px], 'beach');
        else delete cells[py][px].beach;
        enqueue(px, py);
      }
    }
    return { definition: { ...map, cells }, issues: [] };
  }

  function applyStroke(map, grids, erase = false, rules) {
    const cells = map.cells.map(row => row.map(cell => cell && { ...cell }));
    for (const [x, y] of grids) {
      const cell = cells[y]?.[x];
      if (!cell) return { definition: null, issues: [issue(`cells[${y}][${x}]`, 'beach-outside', '海滩整笔不能越界或经过空角。')] };
      if (erase) delete cell.beach;
      else {
        window.landWaterRules.replaceNaturalCell(cell, 'beach');
      }
    }
    const definition = { ...map, cells };
    const result = rules ? normalize(definition, grids, !erase, rules) : { definition, issues: [] };
    // 独立海滩笔刷不整理高程；这里的海滩已是最终事实。地形事务则延后清理。
    if (result.definition) result.definition.cells.forEach(row => row.forEach(cell => {
      if (cell?.beach) delete cell.road;
    }));
    return result;
  }

  window.beachRules = { validate, select, normalize, applyStroke };
})();
