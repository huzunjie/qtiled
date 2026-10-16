/* 普通树、竹类及静态残株的 Demo 作者规则；树属于格事实，不创建装饰实体或经营状态。 */
(function () {
  const { getTree, getRock, getStableGridValue } = window.terrainSample;
  // 原作 4b3cd0 生成半径1正方形外环；4be290 检查这些位置的树/石标志。
  // 普通树和竹类共用树标志，混种也参与包围；null/界外不虚构树或石，不能形成包围外观。
  const neighbors = [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]];
  const issue = (path, code, message) => ({ path, code, message });

  function resolve(map, tiles, elements, occupancy) {
    const issues = [];
    const result = tiles.map(tile => {
      const [x, y] = tile.grid;
      const cell = map.cells[y][x];
      if (cell.tree === undefined) return tile;
      const path = `cells[${y}][${x}].tree`;
      const tree = getTree(cell.tree);
      if (!tree) issues.push(issue(path, 'unsupported-tree', '仅支持普通树、竹类及其残株；无树时省略 tree。'));
      if (!map.climate) issues.push(issue(path, 'tree-climate', '含树地图需要明确气候。'));
      if (cell.terrain !== 'land' || tile.slope || cell.ramp || cell.halfSlope) {
        issues.push(issue(path, 'tree-ground', '树木需要平坦陆地，不能占用水域、坡面、坡道或半坡部件。'));
      }
      if (cell.quarry !== undefined || cell.road || cell.rock !== undefined || occupancy.has(`${x},${y}`)) {
        issues.push(issue(path, 'tree-occupied', '树木不能与岩石、铜矿、铁矿、采石地、道路、建筑或其他实体重叠，请先擦除冲突内容。'));
      }
      const surrounded = neighbors.every(([dx, dy]) => {
        const neighbor = map.cells[y + dy]?.[x + dx];
        return getTree(neighbor?.tree) || getRock(neighbor?.rock);
      });
      // 与已有地表相同的世界格稳定字节；只在当前语义类别的9个外观中选择。
      // terrainVariant已有作者覆盖语义，复用它，不新增随机种子。
      const variant = ((cell.terrainVariant ?? getStableGridValue(x, y)) & 255) % (tree?.variants || 9);
      // 原作残株分支使用 &7；本工具按作者要求纳入 STUMPS 全9图，使用组内 %9。
      const base = tree ? tree.base + (surrounded ? tree.surroundedOffset : 0) : 927;
      const element = `emperor-tree-${base + variant}`;
      const definition = elements[element];
      if (!definition || definition.kind !== 'tile' || definition.id !== element
        || definition.footprint?.length !== 1 || definition.footprint[0]?.length !== 2
        || definition.footprint[0].some(value => value !== 0)) {
        issues.push(issue(path, 'missing-tree-element', `缺少合法单格树素材 ${element}。`));
      }
      return { ...tile, groundElement: tile.element, element, variant, tree: cell.tree };
    });
    return { tiles: issues.length ? null : result, issues };
  }

  function applyStroke(map, grids, erase, moisture, kind = 'ordinary-mature', rules) {
    if (!erase && !getTree(kind)) return { definition: null, issues: [issue('$treeKind', 'unsupported-tree', '请选择普通树、竹类或其残株。')] };
    const cells = map.cells.map(row => row.map(cell => cell && { ...cell }));
    for (const [x, y] of grids) {
      const cell = cells[y]?.[x];
      const path = `cells[${y}][${x}].tree`;
      if (!cell) return { definition: null, issues: [issue(path, 'tree-outside', '树木整笔不能越界或经过空角。')] };
      if (erase) delete cell.tree;
      else if (cell.tree !== kind) {
        // 整笔基图的草地资格固定，不能靠候选树自身增湿批准下一落点。
        if (!map.climate || !(moisture?.[y]?.[x] > 0)) {
          return { definition: null, issues: [issue(path, 'tree-grass', '新增或换类需要已有草地；请先选择气候并在有草的平地落笔。')] };
        }
        window.landWaterRules.replaceNaturalCell(cell, 'tree', kind);
      }
    }
    const definition = { ...map, cells };
    return erase ? { definition, issues: [] } : window.landWaterRules.normalizeNaturalStroke(definition, grids, rules);
  }

  window.treeRules = { resolve, applyStroke };
})();
