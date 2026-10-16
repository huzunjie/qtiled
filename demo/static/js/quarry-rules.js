/* 采石地逐格保存；原作表派生完全开挖外观，不包含开采进度或矿量。 */
(function () {
  const { getStableGridValue } = window.terrainSample;
  const neighbors = [[0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]];
  // 原表0x837e70 / 0x8380f0；每行依次为八邻条件、四镜头偏移、变体数。
  // 0不存在、1存在、2任意；输入是取反的内部邻域。内表最后零行被前行遮蔽，保留原值。
  const outer = [
    [1, 2, 1, 2, 1, 2, 1, 2, 0, 0, 0, 0, 6],
    [1, 2, 1, 2, 1, 2, 0, 2, 0, 0, 0, 0, 6],
    [0, 2, 1, 2, 1, 2, 1, 2, 0, 0, 0, 0, 6],
    [1, 2, 0, 2, 1, 2, 1, 2, 0, 0, 0, 0, 6],
    [1, 2, 1, 2, 0, 2, 1, 2, 0, 0, 0, 0, 6],
    [1, 2, 0, 2, 1, 2, 0, 2, 0, 0, 0, 0, 6],
    [0, 2, 1, 2, 0, 2, 1, 2, 0, 0, 0, 0, 6],
    [1, 2, 1, 2, 1, 2, 0, 2, 0, 0, 0, 0, 6],
    [0, 2, 1, 2, 1, 2, 1, 2, 0, 0, 0, 0, 6],
    [1, 2, 0, 2, 1, 2, 1, 2, 0, 0, 0, 0, 6],
    [1, 2, 1, 2, 0, 2, 1, 2, 0, 0, 0, 0, 6],
    [1, 2, 1, 2, 0, 0, 0, 2, 10, 6, 18, 14, 1],
    [0, 2, 1, 2, 1, 2, 0, 0, 14, 10, 6, 18, 1],
    [0, 0, 0, 2, 1, 2, 1, 2, 18, 14, 10, 6, 1],
    [1, 2, 0, 0, 0, 2, 1, 2, 6, 18, 14, 10, 1],
    [1, 2, 0, 0, 0, 0, 0, 2, 7, 19, 15, 11, 3],
    [0, 2, 1, 2, 0, 0, 0, 0, 11, 7, 19, 15, 3],
    [0, 0, 0, 2, 1, 2, 0, 0, 15, 11, 7, 19, 3],
    [0, 0, 0, 0, 0, 2, 1, 2, 19, 15, 11, 7, 3],
    [1, 2, 0, 1, 0, 0, 0, 2, 26, 33, 30, 29, 1],
    [0, 2, 1, 2, 0, 1, 0, 0, 29, 26, 33, 30, 1],
    [0, 0, 0, 2, 1, 2, 0, 1, 30, 29, 26, 33, 1],
    [0, 1, 0, 0, 0, 2, 1, 2, 33, 30, 29, 26, 1],
    [1, 2, 0, 0, 0, 1, 0, 2, 27, 32, 31, 28, 1],
    [0, 2, 1, 2, 0, 0, 0, 1, 28, 27, 32, 31, 1],
    [0, 1, 0, 2, 1, 2, 0, 0, 31, 28, 27, 32, 1],
    [0, 0, 0, 1, 0, 2, 1, 2, 32, 31, 28, 27, 1],
    [0, 1, 0, 0, 0, 0, 0, 0, 23, 22, 25, 24, 1],
    [0, 0, 0, 1, 0, 0, 0, 0, 24, 23, 22, 25, 1],
    [0, 0, 0, 0, 0, 1, 0, 0, 25, 24, 23, 22, 1],
    [0, 0, 0, 0, 0, 0, 0, 1, 22, 25, 24, 23, 1],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 6],
  ];
  const inner = [
    [1, 2, 1, 2, 1, 2, 1, 2, 37, 37, 37, 37, 1],
    [1, 2, 1, 2, 1, 2, 0, 2, 59, 58, 51, 50, 1],
    [0, 2, 1, 2, 1, 2, 1, 2, 50, 59, 58, 51, 1],
    [1, 2, 0, 2, 1, 2, 1, 2, 51, 50, 59, 58, 1],
    [1, 2, 1, 2, 0, 2, 1, 2, 58, 51, 50, 59, 1],
    [1, 2, 0, 2, 1, 2, 0, 2, 57, 56, 57, 56, 1],
    [0, 2, 1, 2, 0, 2, 1, 2, 56, 57, 56, 57, 1],
    [1, 2, 1, 2, 0, 0, 0, 2, 10, 6, 18, 14, 1],
    [0, 2, 1, 2, 1, 2, 0, 0, 14, 10, 6, 18, 1],
    [0, 0, 0, 2, 1, 2, 1, 2, 18, 14, 10, 6, 1],
    [1, 2, 0, 0, 0, 2, 1, 2, 6, 18, 14, 10, 1],
    [1, 2, 1, 2, 0, 1, 0, 2, 54, 53, 52, 55, 1],
    [0, 2, 1, 2, 1, 2, 0, 1, 55, 54, 53, 52, 1],
    [0, 1, 0, 2, 1, 2, 1, 2, 52, 55, 54, 53, 1],
    [1, 2, 0, 1, 0, 2, 1, 2, 53, 52, 55, 54, 1],
    [1, 2, 0, 0, 0, 0, 0, 2, 7, 19, 15, 11, 3],
    [0, 2, 1, 2, 0, 0, 0, 0, 11, 7, 19, 15, 3],
    [0, 0, 0, 2, 1, 2, 0, 0, 15, 11, 7, 19, 3],
    [0, 0, 0, 0, 0, 2, 1, 2, 19, 15, 11, 7, 3],
    [1, 2, 0, 1, 0, 0, 0, 2, 41, 38, 47, 44, 1],
    [0, 2, 1, 2, 0, 1, 0, 0, 44, 41, 38, 47, 1],
    [0, 0, 0, 2, 1, 2, 0, 1, 47, 44, 41, 38, 1],
    [0, 1, 0, 0, 0, 2, 1, 2, 38, 47, 44, 41, 1],
    [1, 2, 0, 0, 0, 1, 0, 2, 42, 39, 48, 45, 1],
    [0, 2, 1, 2, 0, 0, 0, 1, 45, 42, 39, 48, 1],
    [0, 1, 0, 2, 1, 2, 0, 0, 48, 45, 42, 39, 1],
    [0, 0, 0, 1, 0, 2, 1, 2, 39, 48, 45, 42, 1],
    [1, 2, 0, 1, 0, 1, 0, 2, 43, 40, 49, 46, 1],
    [0, 2, 1, 2, 0, 1, 0, 1, 46, 43, 40, 49, 1],
    [0, 1, 0, 2, 1, 2, 0, 1, 49, 46, 43, 40, 1],
    [0, 1, 0, 1, 0, 2, 1, 2, 40, 49, 46, 43, 1],
    [0, 1, 0, 1, 0, 1, 0, 1, 22, 22, 22, 22, 1],
    [0, 1, 0, 1, 0, 1, 0, 0, 26, 25, 24, 23, 1],
    [0, 0, 0, 1, 0, 1, 0, 1, 23, 26, 25, 24, 1],
    [0, 1, 0, 0, 0, 1, 0, 1, 24, 23, 26, 25, 1],
    [0, 1, 0, 1, 0, 0, 0, 1, 25, 24, 23, 26, 1],
    [0, 1, 0, 0, 0, 1, 0, 0, 32, 31, 32, 31, 1],
    [0, 0, 0, 1, 0, 0, 0, 1, 31, 32, 31, 32, 1],
    [0, 1, 0, 1, 0, 0, 0, 0, 27, 30, 29, 28, 1],
    [0, 0, 0, 1, 0, 1, 0, 0, 28, 27, 30, 29, 1],
    [0, 0, 0, 0, 0, 1, 0, 1, 29, 28, 27, 30, 1],
    [0, 1, 0, 0, 0, 0, 0, 1, 30, 29, 28, 27, 1],
    [0, 1, 0, 0, 0, 0, 0, 0, 34, 36, 35, 33, 1],
    [0, 0, 0, 1, 0, 0, 0, 0, 33, 34, 36, 35, 1],
    [0, 0, 0, 0, 0, 1, 0, 0, 35, 33, 34, 36, 1],
    [0, 0, 0, 0, 0, 0, 0, 1, 36, 35, 33, 34, 1],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 6],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  ];
  const issue = (path, code, message) => ({ path, code, message });

  function resolve(map, tiles, elements, occupancy, angle = 0) {
    const issues = [];
    if (!map.cells.some(row => row.some(cell => cell && Object.prototype.hasOwnProperty.call(cell, 'quarry')))) return { tiles, issues };
    const byGrid = new Map(tiles.map(tile => [tile.grid.join(','), tile]));
    const full = (x, y, radius) => {
      for (let dy = -radius; dy <= radius; dy++) for (let dx = -radius; dx <= radius; dx++) {
        if (map.cells[y + dy]?.[x + dx]?.quarry !== true) return false;
      }
      return true;
    };
    const result = tiles.map(tile => {
      const [x, y] = tile.grid;
      const cell = map.cells[y][x];
      if (!Object.prototype.hasOwnProperty.call(cell, 'quarry')) return tile;
      const path = `cells[${y}][${x}].quarry`;
      if (cell.quarry !== true) {
        issues.push(issue(path, 'invalid-quarry', '采石地 quarry 必须为 true；无采石地时省略该字段。'));
        return tile;
      }
      if (cell.terrain !== 'land' || tile.slope || tile.slopeOwner || cell.ramp || cell.halfSlope
        || neighbors.some(([dx, dy]) => map.cells[y + dy]?.[x + dx]?.quarry
          && byGrid.get(`${x + dx},${y + dy}`)?.elevation !== tile.elevation)) {
        issues.push(issue(path, 'quarry-ground', '采石地需要连片等高的平坦陆地，不能占用水域或坡面。'));
      }
      if (cell.road || cell.tree !== undefined || cell.rock !== undefined || occupancy.has(`${x},${y}`)) {
        issues.push(issue(path, 'quarry-occupied', '采石地不能与树木、岩石矿物、道路或实体重叠，请先清除冲突内容。'));
      }
      const stableByte = (cell.terrainVariant ?? getStableGridValue(x, y)) & 255;
      let element;
      // 四向都需能表示，避免当前镜头通过后转向失败。沿用原地表镜头列对应关系。
      for (const camera of [0, 90, 180, 270]) {
        const column = [1, 0, 3, 2][camera / 90];
        for (let depth = 0; depth < 3; depth++) {
          const bits = neighbors.map(([dx, dy]) => Number(!full(x + dx, y + dy, depth)));
          let row = (depth ? inner : outer).find(row => bits.every((bit, i) => row[i] === 2 || row[i] === bit));
          const bareEdge = !row || !row[12];
          if (bareEdge) {
            // 原 matcher 未匹配时沿用全局旧输出，不能用作无状态选图。
            // 零碎边格以已使用的公共黄土显示，保留事实与其他坑壁，不拒绝局部覆盖。
            row = [...Array(8).fill(2), 6, 6, 6, 6, 1];
          }
          const offset = row[8 + column];
          if (!offset && depth < 2) continue;
          const variant = stableByte % row[12];
          const record = (bareEdge || depth === 0 && offset + variant >= 6 && offset + variant <= 33)
            ? 247 + (stableByte & 7) : [972, 1006, 1066][depth] + offset + variant;
          // 外圈沿用原作公共黄土，和普通陆地引用同一份元素定义。
          const id = record >= 247 && record <= 254
            ? `emperor-bare-land${record === 247 ? '' : `-${record - 247}`}` : `emperor-quarry-${record}`;
          const definition = elements[id];
          if (!definition || definition.kind !== 'tile' || definition.id !== id
            || definition.footprint?.length !== 1 || definition.footprint[0].join(',') !== '0,0') {
            issues.push(issue(path, 'missing-quarry-element', `缺少合法单格采石地素材 ${id}。`));
          }
          if (camera === angle) element = id;
          break;
        }
      }
      return { ...tile, element, quarry: true };
    });
    return { tiles: issues.length ? null : result, issues };
  }

  function applyStroke(map, grids, erase = false, rules) {
    const cells = map.cells.map(row => row.map(cell => cell && { ...cell }));
    for (const [x, y] of grids) {
      const cell = cells[y]?.[x];
      const path = `cells[${y}][${x}].quarry`;
      if (!cell) return { definition: null, issues: [issue(path, 'quarry-outside', '采石地整笔不能越界或经过空角。')] };
      if (erase) delete cell.quarry;
      else {
        window.landWaterRules.replaceNaturalCell(cell, 'quarry');
      }
    }
    const definition = { ...map, cells };
    return erase ? { definition, issues: [] } : window.landWaterRules.normalizeNaturalStroke(definition, grids, rules);
  }

  window.quarryRules = { resolve, applyStroke };
})();
