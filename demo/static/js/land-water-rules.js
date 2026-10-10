/* 普通陆地/水域 Demo 的场景规则；不扩展 QTiled 公共 API。
 * 原作表决定水岸形状和变体数量；边界、稳定变体和整笔事务是本工具的约定。
 */
(function () {
  const angles = [0, 90, 180, 270];
  const waterNeighbors = [[0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]];
  const owns = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
  const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
  const isString = value => typeof value === 'string' && value.length > 0;
  const isGrid = value => Array.isArray(value) && value.length === 2 && Array.from(value).every(Number.isSafeInteger);
  const issue = (path, code, message) => ({ path, code, message });

  // 地图结构、实体与图片本身仍由 maps/elements 校验；这里检查规则实际读取的格事实。
  function checkCells(map) {
    const issues = [];
    if (!isObject(map) || !Array.isArray(map.cells) || !map.cells.length
      || !Array.isArray(map.cells[0]) || !map.cells[0].length) {
      return [issue('cells', 'invalid-cells', '地表规则需要非空矩形地图。')];
    }
    let count = 0;
    for (const [y, row] of map.cells.entries()) {
      if (!Array.isArray(row) || row.length !== map.cells[0].length) {
        issues.push(issue(`cells[${y}]`, 'invalid-row', '地表地图各行必须等宽。'));
        continue;
      }
      for (const [x, cell] of row.entries()) {
        if (cell === null) continue;
        const path = `cells[${y}][${x}]`;
        if (!isObject(cell)) {
          issues.push(issue(path, 'invalid-cell', '格必须为属性对象或 null。'));
          continue;
        }
        count += 1;
        if (!['land', 'water'].includes(cell.terrain)) {
          issues.push(issue(`${path}.terrain`, 'unsupported-terrain', '本规则仅支持普通 land / water。'));
        }
        if (cell.elevation !== 0) {
          issues.push(issue(`${path}.elevation`, 'unsupported-elevation', '普通地表规则仅支持高程 0。'));
        }
        if (owns(cell, 'tile')) {
          issues.push(issue(`${path}.tile`, 'derived-tile-conflict', '自动地表不能同时指定 cell.tile。'));
        }
        if (owns(cell, 'terrainVariant') && (!Number.isInteger(cell.terrainVariant)
          || cell.terrainVariant < 0 || cell.terrainVariant > 255)) {
          issues.push(issue(`${path}.terrainVariant`, 'invalid-terrain-variant', '固定变体必须是 0～255 的整数。'));
        }
      }
    }
    if (!count && !issues.length) issues.push(issue('cells', 'invalid-cells', '地图必须至少有一个有效格。'));
    return issues;
  }

  function checkRules(rules) {
    if (!isObject(rules) || rules.version !== 1 || rules.boundary !== 'non-water'
      || !isString(rules.landElement) || !isObject(rules.animationElements)
      || !['even', 'odd', 'deep'].every(key => isString(rules.animationElements[key]))
      || !isString(rules.elementPrefix) || !Number.isSafeInteger(rules.waterBaseRecord)
      || !Array.isArray(rules.neighborOffsets) || rules.neighborOffsets.length !== 8
      || !Array.from(rules.neighborOffsets).every((offset, index) => isGrid(offset)
        && offset.every((value, axis) => value === waterNeighbors[index][axis]))
      || !Array.isArray(rules.qtiledCameraColumns) || rules.qtiledCameraColumns.length !== 4
      || !Array.from(rules.qtiledCameraColumns).every(value => Number.isInteger(value) && value >= 0 && value < 4)
      || !Array.isArray(rules.rows) || !rules.rows.length
      || !Array.from(rules.rows).every(row => isObject(row)
        && Array.isArray(row.conditions) && row.conditions.length === 8
        && Array.from(row.conditions).every(value => [0, 1, 2].includes(value))
        && Array.isArray(row.viewOffsets) && row.viewOffsets.length === 4
        && Array.from(row.viewOffsets).every(value => Number.isSafeInteger(value) && value >= 0)
        && Number.isInteger(row.variants) && row.variants > 0 && row.variants <= 256)) {
      return [issue('$rules', 'invalid-terrain-rules', '普通地表规则缺失或字段无效。')];
    }
    return [];
  }

  // 原作 Editor 4c04f0/4c0670 与 Game 4fe100/4fe300：内部标记由水域形状派生。
  // 不把它保存为作者选择的水深；null/矩阵外按本工具约定阻止形成内部标记。
  function deriveWaterMarkers(cells) {
    const isWater = (x, y) => cells[y] && cells[y][x] && cells[y][x].terrain === 'water';
    const markers = cells.map((row, y) => row.map((cell, x) => isWater(x, y)
      && waterNeighbors.every(([dx, dy]) => isWater(x + dx, y + dy))));
    const marked = (x, y) => !!(markers[y] && markers[y][x]);
    for (let y = 0; y < cells.length; y += 1) {
      for (let x = 0; x < cells[y].length; x += 1) {
        if (!marked(x, y)) continue;
        // 显式栈保留原作清除后立即递归、周围3×3按行访问的顺序，避免长河道递归溢出。
        const pending = [{ x, y, next: 0 }];
        while (pending.length) {
          const current = pending[pending.length - 1];
          if (current.next === 9) {
            pending.pop();
            continue;
          }
          const px = current.x + current.next % 3 - 1;
          const py = current.y + Math.floor(current.next / 3) - 1;
          current.next += 1;
          if (!marked(px, py)) continue;
          const ring = waterNeighbors.map(([dx, dy]) => marked(px + dx, py + dy));
          const isolatedAxis = (!ring[0] && !ring[4]) || (!ring[2] && !ring[6]);
          // 环上完整的 0,1,1,0 表示两端被空格夹住、恰长2的标记段；不是任意两个邻格。
          const narrowCorner = ring.some((value, index) => !value && ring[(index + 1) % 8]
            && ring[(index + 2) % 8] && !ring[(index + 3) % 8]);
          if (isolatedAxis || narrowCorner) {
            markers[py][px] = false;
            pending.push({ x: px, y: py, next: 0 });
          }
        }
      }
    }
    return markers;
  }

  /** 输出整张地图的派生绘制选择，不写回 tile、帧或随机数。
   * 元素库中的定义须先通过 validateElementDefinition；地图实体由 maps 独立校验。
   * terrainVariant 可固定变体输入字节；省略时采用世界格哈希，与镜头和执行次数无关。
   * null / 矩阵外按非水处理，是编辑器边界约定，不是原作边界行为的复刻。
   */
  function resolve(map, elementsById, rules, angle = 0) {
    const issues = [...checkCells(map), ...checkRules(rules)];
    if (!angles.includes(angle)) issues.push(issue('$view.angle', 'invalid-angle', '镜头必须为 0、90、180 或 270。'));
    if (!isObject(elementsById)) issues.push(issue('$elements', 'invalid-element-library', '地表元素库必须为对象。'));
    if (issues.length) return { tiles: null, issues };

    const tiles = [];
    const column = rules.qtiledCameraColumns[angle / 90];
    const markers = deriveWaterMarkers(map.cells);
    for (const [y, row] of map.cells.entries()) {
      for (const [x, cell] of row.entries()) {
        if (cell === null) continue;
        let element = rules.landElement;
        let rowIndex = null;
        let variant = 0;
        let phase = 0;
        let waterKind = null;
        if (cell.terrain === 'water') {
          // 固定整数运算属于 QTiled 工具设计，不声称复刻原作的随机种子。
          const stableByte = owns(cell, 'terrainVariant') ? cell.terrainVariant
            : (Math.imul(x, 374761393) ^ Math.imul(y, 668265263)) & 255;
          const neighbors = rules.neighborOffsets.map(([dx, dy]) => {
            const neighborRow = map.cells[y + dy];
            const neighbor = neighborRow && neighborRow[x + dx];
            return neighbor && neighbor.terrain === 'water' ? 0 : 1;
          });
          if (neighbors.some(Boolean)) {
            // 原作按顺序取首次匹配；已归档的普通水岸表对非零邻域均唯一命中。
            rowIndex = rules.rows.findIndex(pattern => pattern.conditions.every((value, index) => value === 2 || value === neighbors[index]));
            if (rowIndex === -1) {
              issues.push(issue(`cells[${y}][${x}]`, 'unmatched-terrain-pattern', '八邻域没有匹配的普通水岸素材。'));
              continue;
            }
            const pattern = rules.rows[rowIndex];
            variant = stableByte % pattern.variants;
            element = `${rules.elementPrefix}${rules.waterBaseRecord + pattern.viewOffsets[column] + variant}`;
          } else if (markers[y][x]) {
            const interior = waterNeighbors.every(([dx, dy]) => markers[y + dy] && markers[y + dy][x + dx]);
            waterKind = interior ? 'deep' : 'transition';
            element = rules.animationElements[interior ? 'deep' : stableByte % 2 ? 'odd' : 'even'];
            phase = interior ? stableByte % 24 : Math.floor((stableByte % 48) / 2);
          } else {
            waterKind = 'ordinary';
            element = rules.animationElements.even;
            // 普通初始化 B+(p%24)+(p%2) 恒为偶数，循环按 +2 推进，共24帧。
            phase = ((stableByte % 24) + stableByte % 2) / 2;
          }
        }
        const definition = owns(elementsById, element) && elementsById[element];
        if (!definition) {
          issues.push(issue(`cells[${y}][${x}]`, 'missing-terrain-element', `缺少地表元素 ${element}。`));
        } else if (definition.id !== element || definition.kind !== 'tile'
          || !Array.isArray(definition.footprint) || definition.footprint.length !== 1
          || !isGrid(definition.footprint[0]) || definition.footprint[0].some(Boolean)) {
          issues.push(issue(`cells[${y}][${x}]`, 'invalid-terrain-element', `地表元素 ${element} 必须是单格 tile。`));
        } else {
          tiles.push({ grid: [x, y], element, variant, rowIndex, phase, waterKind });
        }
      }
    }
    return { tiles: issues.length ? null : tiles, issues };
  }

  /** 一笔先生成候选事实，再完整计算依赖结果；任何格失败都不返回部分地图。
   * 重复格只修改一次，未编辑属性和实体保持；调用方管理预览、取消及撤销栈。
   */
  function applyStroke(map, command, elementsById, rules, angle = 0) {
    const issues = checkCells(map);
    if (!isObject(command) || !['land', 'water'].includes(command.terrain)
      || !Array.isArray(command.grids) || !command.grids.length) {
      issues.push(issue('$command', 'invalid-terrain-stroke', '一笔需要 land / water 和非空格列表。'));
    }
    if (issues.length) return { definition: null, tiles: null, issues };
    const grids = new Map();
    for (const [index, grid] of command.grids.entries()) {
      const path = `$command.grids[${index}]`;
      if (!isGrid(grid)) {
        issues.push(issue(path, 'invalid-grid', '笔刷格必须是两个安全整数。'));
      } else if (grid[0] < 0 || grid[1] < 0 || grid[1] >= map.cells.length || grid[0] >= map.cells[0].length) {
        issues.push(issue(path, 'stroke-out-of-bounds', '笔刷超出地图矩阵，整笔取消。'));
      } else if (map.cells[grid[1]][grid[0]] === null) {
        issues.push(issue(path, 'stroke-invalid-cell', '笔刷包含 null 无效格，整笔取消。'));
      } else {
        grids.set(grid.join(','), grid);
      }
    }
    if (issues.length) return { definition: null, tiles: null, issues };
    const cells = map.cells.map(row => row.map(cell => cell === null ? null : { ...cell }));
    for (const [x, y] of grids.values()) cells[y][x].terrain = command.terrain;
    const definition = { ...map, cells };
    const result = resolve(definition, elementsById, rules, angle);
    return { definition: result.issues.length ? null : definition, ...result };
  }

  window.landWaterRules = { resolve, applyStroke };
})();
