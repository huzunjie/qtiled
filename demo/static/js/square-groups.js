/* Demo内部方块分组：固定世界坐标扫描，同类、等高且未归属的格子优先组成大块。 */
(function () {
  function groupSquareTiles(tiles, field, sizes) {
    const byGrid = new Map(tiles.map(tile => [tile.grid.join(','), tile]));
    const ordered = tiles.filter(tile => tile[field]).sort((a, b) => a.grid[1] - b.grid[1] || a.grid[0] - b.grid[0]);
    const claimed = new Set();
    const groups = [];
    const owner = `${field}Owner`;
    for (const tile of ordered) {
      if (tile[owner] || claimed.has(tile)) continue;
      const [x, y] = tile.grid;
      const cellsFor = size => Array.from({ length: size * size }, (_, i) => byGrid.get(`${x + i % size},${y + Math.floor(i / size)}`));
      const size = sizes.find(size => cellsFor(size).every(part => part?.[field] === tile[field]
        && !part[owner] && !claimed.has(part) && part.elevation === tile.elevation));
      const parts = cellsFor(size);
      parts.forEach(part => claimed.add(part));
      groups.push({ tile, size, parts });
    }
    return groups;
  }

  window.groupSquareTiles = groupSquareTiles;
})();
