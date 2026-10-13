/* 普通石、铜矿与铁矿逐格保存，按原作扫描规则派生1～3格方块；不包含矿量或开采。 */
(function () {
  const { getRock, getStableGridValue } = window.terrainSample;
  const issue = (path, code, message) => ({ path, code, message });

  function resolve(map, tiles, elements, occupancy) {
    const issues = [];
    const result = tiles.map(tile => {
      const [x, y] = tile.grid;
      const cell = map.cells[y][x];
      if (!Object.prototype.hasOwnProperty.call(cell, 'rock')) return tile;
      const path = `cells[${y}][${x}].rock`;
      const rock = getRock(cell.rock);
      if (!rock) {
        issues.push(issue(path, 'unsupported-rock', '仅支持普通石 ordinary、铜矿 copper 与铁矿 iron；无岩石时省略 rock。'));
        return tile;
      }
      if (cell.terrain !== 'land' || tile.slope || tile.slopeOwner || cell.ramp || cell.halfSlope) {
        issues.push(issue(path, 'rock-ground', '岩石与矿物需要平坦陆地，不能占用水域、坡面、坡道或半坡部件。'));
      }
      if (cell.quarry !== undefined || cell.road || cell.tree !== undefined || occupancy.has(`${x},${y}`)) {
        issues.push(issue(path, 'rock-occupied', '岩石与矿物不能与植被、采石地、道路、建筑或其他实体重叠，请先清除冲突内容。'));
      }
      return { ...tile, groundElement: tile.element, rock: cell.rock };
    });
    if (issues.length) return { tiles: null, issues };
    const byGrid = new Map(result.map(tile => [tile.grid.join(','), tile]));
    // 542e80逐行清图再扫描；4bb3a0要求同类且尚未占用，543c40先3×3再2×2。
    const rocks = result.filter(tile => tile.rock).sort((a, b) => a.grid[1] - b.grid[1] || a.grid[0] - b.grid[0]);
    for (const tile of rocks) {
      if (tile.rockOwner) continue;
      const [x, y] = tile.grid;
      const cellsFor = size => Array.from({ length: size * size }, (_, i) => byGrid.get(`${x + i % size},${y + Math.floor(i / size)}`));
      const size = [3, 2, 1].find(size => cellsFor(size).every(part => part?.rock === tile.rock
        && !part.rockOwner && part.elevation === tile.elevation));
      const parts = cellsFor(size);
      const cell = map.cells[y][x];
      const variant = (cell.terrainVariant ?? getStableGridValue(x, y)) & (size === 3 ? 1 : size === 2 ? 3 : 7);
      const element = `emperor-rock-${getRock(tile.rock).base + (size === 3 ? 12 : size === 2 ? 8 : 0) + variant}`;
      const definition = elements[element];
      if (!definition || definition.kind !== 'tile' || definition.id !== element
        || definition.footprint?.length !== size * size
        || !parts.every(part => definition.footprint.some(offset => offset.length === 2
          && offset[0] === part.grid[0] - x && offset[1] === part.grid[1] - y))) {
        issues.push(issue(`cells[${y}][${x}].rock`, 'missing-rock-element', `缺少合法${size}×${size}岩石素材 ${element}。`));
      }
      parts.forEach(part => Object.assign(part, { element, variant, rockOwner: tile.grid, rockSize: size }));
    }
    return { tiles: issues.length ? null : result, issues };
  }

  function applyStroke(map, grids, erase, kind = 'ordinary') {
    if (!erase && !getRock(kind)) return { definition: null, issues: [issue('$rockKind', 'unsupported-rock', '请选择普通石、铜矿或铁矿。')] };
    const cells = map.cells.map(row => row.map(cell => cell && { ...cell }));
    for (const [x, y] of grids) {
      const cell = cells[y]?.[x];
      if (!cell) return { definition: null, issues: [issue(`cells[${y}][${x}].rock`, 'rock-outside', '岩石整笔不能越界或经过空角。')] };
      if (erase) delete cell.rock;
      else cell.rock = kind;
    }
    return { definition: { ...map, cells }, issues: [] };
  }

  window.rockRules = { resolve, applyStroke };
})();
