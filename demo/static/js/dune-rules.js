/* 沙丘规则：逐格作者事实，按原作3×3、2×2、1×1顺序派生原图。 */
(function () {
  const { getStableGridValue } = window.terrainSample;
  const issue = (path, code, message) => ({ path, code, message });

  function resolve(map, tiles, elements, occupancy) {
    const issues = [];
    const result = tiles.map(tile => {
      const [x, y] = tile.grid;
      const cell = map.cells[y][x];
      if (!Object.prototype.hasOwnProperty.call(cell, 'dune')) return tile;
      const path = `cells[${y}][${x}].dune`;
      if (cell.dune !== true) issues.push(issue(path, 'dune-value', '沙丘只接受 true；无沙丘时省略 dune。'));
      if (cell.terrain !== 'land' || cell.beach || tile.slope || tile.slopeOwner || cell.ramp || cell.halfSlope) {
        issues.push(issue(path, 'dune-ground', '沙丘需要平坦陆地。'));
      }
      if (cell.rock !== undefined || cell.quarry !== undefined || cell.road || cell.tree !== undefined
        || occupancy.has(`${x},${y}`)) {
        issues.push(issue(path, 'dune-occupied', '沙丘不能与其他地物或实体重叠。'));
      }
      return { ...tile, groundElement: tile.element, dune: true };
    });
    if (issues.length) return { tiles: null, issues };
    const byGrid = new Map(result.map(tile => [tile.grid.join(','), tile]));
    const dunes = result.filter(tile => tile.dune).sort((a, b) => a.grid[1] - b.grid[1] || a.grid[0] - b.grid[0]);
    for (const tile of dunes) {
      if (tile.duneOwner) continue;
      const [x, y] = tile.grid;
      const cellsFor = size => Array.from({ length: size * size }, (_, i) => byGrid.get(`${x + i % size},${y + Math.floor(i / size)}`));
      const size = [3, 2, 1].find(size => cellsFor(size).every(part => part?.dune && !part.duneOwner
        && part.elevation === tile.elevation));
      const parts = cellsFor(size);
      const cell = map.cells[y][x];
      const variant = (cell.terrainVariant ?? getStableGridValue(x, y)) & (size === 3 ? 1 : size === 2 ? 3 : 7);
      const imageId = 1138 + (size === 3 ? 12 : size === 2 ? 8 : 0) + variant;
      const element = `emperor-dune-${imageId}`;
      const definition = elements[element];
      if (!definition || definition.kind !== 'tile' || definition.id !== element
        || definition.footprint?.length !== size * size
        || !parts.every(part => definition.footprint.some(offset => offset.length === 2
          && offset[0] === part.grid[0] - x && offset[1] === part.grid[1] - y))) {
        issues.push(issue(`cells[${y}][${x}].dune`, 'missing-dune-element', `缺少合法${size}×${size}沙丘原图 ${element}。`));
      }
      parts.forEach(part => Object.assign(part, { element, variant, duneOwner: tile.grid, duneSize: size }));
    }
    return { tiles: issues.length ? null : result, issues };
  }

  function applyStroke(map, grids, erase) {
    const cells = map.cells.map(row => row.map(cell => cell && { ...cell }));
    for (const [x, y] of grids) {
      const cell = cells[y]?.[x];
      if (!cell) return { definition: null, issues: [issue(`cells[${y}][${x}].dune`, 'dune-outside', '沙丘整笔不能越界或经过空角。')] };
      if (erase) delete cell.dune;
      else cell.dune = true;
    }
    return { definition: { ...map, cells }, issues: [] };
  }

  window.duneRules = { resolve, applyStroke };
})();
