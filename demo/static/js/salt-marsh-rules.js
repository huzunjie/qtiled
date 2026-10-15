/* 盐沼是可铺路的地表事实；清路后由同一解析过程恢复原图，不保存恢复快照。 */
(function () {
  const { getStableGridValue } = window.terrainSample;
  const issue = (path, code, message) => ({ path, code, message });

  function resolve(map, tiles, elements, occupancy) {
    const issues = [];
    const result = tiles.map(tile => {
      const [x, y] = tile.grid;
      const cell = map.cells[y][x];
      if (!Object.prototype.hasOwnProperty.call(cell, 'saltMarsh')) return tile;
      const path = `cells[${y}][${x}].saltMarsh`;
      if (cell.saltMarsh !== true) issues.push(issue(path, 'salt-marsh-value', '盐沼只接受 true；无盐沼时省略 saltMarsh。'));
      if (cell.terrain !== 'land' || cell.beach || tile.slope || tile.slopeOwner || cell.ramp || cell.halfSlope) {
        issues.push(issue(path, 'salt-marsh-ground', '盐沼需要平坦陆地。'));
      }
      if (cell.tree !== undefined || cell.rock !== undefined || cell.dune !== undefined
        || cell.quarry !== undefined || occupancy.has(`${x},${y}`)) {
        issues.push(issue(path, 'salt-marsh-occupied', '盐沼可铺普通道路，不能与当前建筑、其他地物或实体重叠。'));
      }
      const variant = (cell.terrainVariant ?? (getStableGridValue(x, y) & 255)) % 9;
      const element = `emperor-salt-marsh-${869 + variant}`;
      const definition = elements[element];
      if (!definition || definition.kind !== 'tile' || definition.id !== element
        || definition.footprint?.length !== 1 || definition.footprint[0]?.length !== 2
        || definition.footprint[0][0] !== 0 || definition.footprint[0][1] !== 0) {
        issues.push(issue(path, 'missing-salt-marsh-element', `缺少合法盐沼原图 ${element}。`));
      }
      // 道路已经由既有连接规则选图；盐沼事实保留，清路后自然进入下面的地表选图。
      return cell.road ? { ...tile, saltMarsh: true }
        : { ...tile, element, variant, saltMarsh: true };
    });
    return { tiles: issues.length ? null : result, issues };
  }

  function applyStroke(map, grids) {
    const sources = [];
    map.cells.forEach((row, y) => row.forEach((cell, x) => {
      if (cell?.terrain === 'water' || cell?.beach === true) sources.push([x, y]);
    }));
    // 原作4b7c10以5调用方形环查询4b7ad0；循环只扫描距离1～4。
    // 这是新增作者格的门槛，不因后来修改邻水而抹掉已有盐沼。
    const distances = window.qtiled.pathFinding.getChebyshevDistanceField(map.cells[0].length, map.cells.length, sources);
    const cells = map.cells.map(row => row.map(cell => cell && { ...cell }));
    for (const [x, y] of grids) {
      const cell = cells[y]?.[x];
      const path = `cells[${y}][${x}].saltMarsh`;
      if (!cell) return { definition: null, issues: [issue(path, 'salt-marsh-outside', '盐沼整笔不能越界或经过空角。')] };
      if (cell.saltMarsh !== true && distances[y][x] < 5) {
        return { definition: null, issues: [issue(path, 'salt-marsh-near-water', '新增盐沼距水域或海滩至少 5 格（含斜向）。')] };
      }
      if (cell.road && cell.saltMarsh !== true) {
        return { definition: null, issues: [issue(path, 'salt-marsh-road', '先清除道路再绘制盐沼，随后可重新铺路。')] };
      }
      window.landWaterRules.replaceNaturalCell(cell, 'salt-marsh');
    }
    return { definition: { ...map, cells }, issues: [] };
  }

  window.saltMarshRules = { resolve, applyStroke };
})();
