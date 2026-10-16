/* 废墟规则：逐格作者事实，按原作2×2、1×1顺序派生原图。 */
(function () {
  const { getStableGridValue } = window.terrainSample;
  const issue = (path, code, message) => ({ path, code, message });

  function resolve(map, tiles, elements, occupancy) {
    const issues = [];
    const result = tiles.map(tile => {
      const [x, y] = tile.grid;
      const cell = map.cells[y][x];
      if (!Object.prototype.hasOwnProperty.call(cell, 'ruin')) return tile;
      const path = `cells[${y}][${x}].ruin`;
      if (cell.ruin !== true) issues.push(issue(path, 'ruin-value', '废墟只接受 true；无废墟时省略 ruin。'));
      if (cell.terrain !== 'land' || cell.beach || tile.slope || tile.slopeOwner || cell.ramp || cell.halfSlope) {
        issues.push(issue(path, 'ruin-ground', '废墟需要平坦陆地。'));
      }
      if (cell.dune !== undefined || cell.saltMarsh !== undefined || cell.rock !== undefined || cell.quarry !== undefined || cell.road || cell.tree !== undefined
        || occupancy.has(`${x},${y}`)) {
        issues.push(issue(path, 'ruin-occupied', '废墟不能与其他地物或实体重叠。'));
      }
      return { ...tile, groundElement: tile.element, ruin: true };
    });
    if (issues.length) return { tiles: null, issues };
    for (const { tile, size, parts } of window.groupSquareTiles(result, 'ruin', [2, 1])) {
      const [x, y] = tile.grid;
      const cell = map.cells[y][x];
      const variant = (cell.terrainVariant ?? getStableGridValue(x, y)) & (size === 2 ? 3 : 7);
      const imageId = 1126 + (size === 2 ? 8 : 0) + variant;
      const element = `emperor-ruin-${imageId}`;
      const definition = elements[element];
      if (!definition || definition.kind !== 'tile' || definition.id !== element
        || definition.footprint?.length !== size * size
        || !parts.every(part => definition.footprint.some(offset => offset.length === 2
          && offset[0] === part.grid[0] - x && offset[1] === part.grid[1] - y))) {
        issues.push(issue(`cells[${y}][${x}].ruin`, 'missing-ruin-element', `缺少合法${size}×${size}废墟原图 ${element}。`));
      }
      parts.forEach(part => Object.assign(part, { element, variant, ruinOwner: tile.grid, ruinSize: size }));
    }
    return { tiles: issues.length ? null : result, issues };
  }

  function applyStroke(map, grids, erase, rules) {
    const cells = map.cells.map(row => row.map(cell => cell && { ...cell }));
    for (const [x, y] of grids) {
      const cell = cells[y]?.[x];
      if (!cell) return { definition: null, issues: [issue(`cells[${y}][${x}].ruin`, 'ruin-outside', '废墟整笔不能越界或经过空角。')] };
      if (erase) delete cell.ruin;
      else {
        window.landWaterRules.replaceNaturalCell(cell, 'ruin');
      }
    }
    const definition = { ...map, cells };
    return erase ? { definition, issues: [] } : window.landWaterRules.normalizeNaturalStroke(definition, grids, rules);
  }

  window.ruinRules = { resolve, applyStroke };
})();
