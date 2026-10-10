/* 整级高程 Demo 场景规则；不扩展 QTiled 公共 API。
 * 原作表负责普通 E1/E2 选图与局部高度调整；整笔事务和终止保护属于工具。
 */
(function () {
  const angles = [0, 90, 180, 270];
  const MIN_HEIGHT = 0;
  const MAX_HEIGHT = 16;
  const neighbors = [[0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]];
  const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
  const isGrid = value => Array.isArray(value) && value.length === 2 && Array.from(value).every(Number.isSafeInteger);
  const issue = (path, code, message) => ({ path, code, message });
  const failed = issues => ({ tiles: null, issues });

  function checkRules(rules) {
    if (!isObject(rules) || rules.version !== 1 || !Number.isFinite(rules.elevationStep) || rules.elevationStep <= 0
      || !isGrid(rules.tileSize) || !rules.tileSize.every(value => value > 0)
      || typeof rules.elementPrefix !== 'string' || !rules.elementPrefix.length
      || !Array.isArray(rules.neighborOffsets) || rules.neighborOffsets.length !== 8
      || !Array.from(rules.neighborOffsets).every((offset, index) => isGrid(offset)
        && offset.every((value, axis) => value === neighbors[index][axis]))
      || !Array.isArray(rules.qtiledCameraColumns) || rules.qtiledCameraColumns.length !== 4
      || !Array.from(rules.qtiledCameraColumns).every(value => Number.isInteger(value) && value >= 0 && value < 4)
      || !Array.isArray(rules.supportedRecords) || !rules.supportedRecords.length
      || !Array.from(rules.supportedRecords).every(value => Number.isSafeInteger(value) && value > 0)
      || !Array.isArray(rules.rows) || !rules.rows.length
      || !Array.from(rules.rows).every(row => isObject(row) && Number.isSafeInteger(row.row)
        && Array.isArray(row.conditions) && row.conditions.length === 8 && Array.from(row.conditions).every(Number.isSafeInteger)
        && Array.isArray(row.viewRecords) && row.viewRecords.length === 4
        && Array.from(row.viewRecords).every(value => value === null || (Number.isSafeInteger(value) && value > 0))
        && [true, false, 0, 1].includes(row.requiresRamp) && [0, 1, 2].includes(row.control))) {
      return [issue('$elevationRules', 'invalid-elevation-rules', '高程规则缺失或字段无效。')];
    }
    return [];
  }

  // 只改变送给陆水派生器的副本，不把高程事实扁平化保存。
  function flatView(map) {
    if (!isObject(map) || !Array.isArray(map.cells)) return map;
    return { ...map, cells: map.cells.map(row => Array.isArray(row)
      ? row.map(cell => isObject(cell) ? { ...cell, elevation: 0 } : cell) : row) };
  }

  function checkHeights(map, rules) {
    const issues = [];
    if (!isObject(map) || ![1, 2].includes(map.version)) {
      return [issue('version', 'unsupported-version', '高程编辑仅支持 v1 / v2 地图。')];
    }
    if (map.version === 2 && map.elevationStep !== rules.elevationStep) {
      issues.push(issue('elevationStep', 'unsupported-elevation-step', `本素材要求每级高程 ${rules.elevationStep} 像素。`));
    }
    if (map.version === 2 && (!Array.isArray(map.tileSize) || map.tileSize.length !== 2
      || !map.tileSize.every((value, index) => value === rules.tileSize[index]))) {
      issues.push(issue('tileSize', 'unsupported-elevation-tile-size', '高程素材要求与取证样本相同的瓦片尺寸。'));
    }
    if (!Array.isArray(map.cells)) return issues;
    map.cells.forEach((row, y) => {
      if (!Array.isArray(row)) return;
      row.forEach((cell, x) => {
        if (!isObject(cell)) return;
        if (!Number.isInteger(cell.elevation) || cell.elevation < MIN_HEIGHT || cell.elevation > MAX_HEIGHT || (map.version === 1 && cell.elevation !== 0)) {
          issues.push(issue(`cells[${y}][${x}].elevation`, 'unsupported-elevation', '高程必须为 0～16 的整数；v1 地图只允许 0。'));
        }
      });
    });
    return issues;
  }

  function matchRow(delta, rules) {
    if (delta.every(value => value <= 0)) return null;
    return rules.rows.find(pattern => !pattern.requiresRamp
      && pattern.conditions.every((predicate, index) => predicate === 3
        || (predicate === 4 ? Math.abs(delta[index]) <= 1 : predicate === delta[index]))) || null;
  }

  // 通配首匹配仍可能忽略另一高角。以同一原表核对旋转后的世界邻域，
  // 不再用一级二值白名单限制多级，也不把尚有方向反例的行直接放行。
  function consistentViews(delta, row, rules) {
    return rules.qtiledCameraColumns.every((column, turn) => {
      const rotated = turn ? delta.slice(-2 * turn).concat(delta.slice(0, -2 * turn)) : delta;
      const other = matchRow(rotated, rules);
      return other && !other.control && row.viewRecords[column] === other.viewRecords[rules.qtiledCameraColumns[0]];
    });
  }

  // 普通整级坡面只覆盖一个连续高角，最多占八邻域中的连续四向。
  // 通配行可能先匹配到另一侧较低的坡面；四向选图一致也不能证明高差覆盖完整。
  function coversHighNeighbors(delta, row) {
    const higher = delta.map(value => value > 0);
    const count = higher.filter(Boolean).length;
    const starts = higher.filter((value, index) => value && !higher[(index + 7) % 8]).length;
    return count <= 4 && starts === 1
      && Math.max(...delta) <= Math.max(...row.conditions.filter(value => value < 3));
  }

  // 无地图不是0级地面。只在当前3×3邻域内延拓最近的有效高度；等距取高，
  // 避免用遍历方向破坏四向对称。虚拟高度只参与规则，不生成格子或修改目标。
  function neighborhood(cells, x, y) {
    const ring = neighbors.map(([dx, dy]) => cells[y + dy]?.[x + dx]);
    const present = [[0, 0], ...neighbors].filter(([dx, dy]) => cells[y + dy]?.[x + dx]);
    const heights = ring.map((cell, index) => {
      if (cell) return cell.elevation;
      const [dx, dy] = neighbors[index];
      const distances = present.map(([px, py]) => (px - dx) ** 2 + (py - dy) ** 2);
      const nearest = Math.min(...distances);
      return Math.max(...present.filter((point, i) => distances[i] === nearest)
        .map(([px, py]) => cells[y + py][x + px].elevation));
    });
    return { ring, heights };
  }

  /** 输出平地/水面和低格坡面；高格保持陆地，投影由消费者减去 elevation * elevationStep。
   * 纯解析不修改高度，不解释 HALF/RAMP，也不把控制 1/2 当素材。
   */
  function resolve(map, elements, landRules, elevationRules, angle = 0) {
    if (map && map.version === 1) return window.landWaterRules.resolve(map, elements, landRules, angle);
    const issues = checkRules(elevationRules);
    if (issues.length) return failed(issues);
    issues.push(...checkHeights(map, elevationRules));
    if (!angles.includes(angle)) issues.push(issue('$view.angle', 'invalid-angle', '镜头必须为 0、90、180 或 270。'));
    const flat = window.landWaterRules.resolve(flatView(map), elements, landRules, angle);
    issues.push(...flat.issues);
    if (issues.length) return failed(issues);

    const column = elevationRules.qtiledCameraColumns[angle / 90];
    const cellAt = (x, y) => map.cells[y] && map.cells[y][x];
    const tiles = flat.tiles.map(tile => {
      const [x, y] = tile.grid;
      const cell = cellAt(x, y);
      const result = { ...tile, elevation: cell.elevation, slope: false };
      const path = `cells[${y}][${x}]`;
      const { ring, heights } = neighborhood(map.cells, x, y);
      const hasHigher = heights.some(height => height > cell.elevation);
      // 水面和岸线可整体处于任意合法高度；仅拒绝真实邻格之间的水陆/水水高差。
      if (cell.terrain === 'water' && ring.some(neighbor => neighbor && neighbor.elevation !== cell.elevation)) {
        issues.push(issue(path, 'unsupported-elevation-water', '水面及相邻地表必须等高；当前不支持水域直接衔接高差。'));
        return result;
      }
      if (!hasHigher) return result;
      if (ring.some(neighbor => neighbor?.terrain === 'water')) {
        issues.push(issue(path, 'unsupported-elevation-water', '坡面接触水域的组合尚未补证，整笔取消。'));
        return result;
      }
      const delta = heights.map(height => height - cell.elevation);
      const row = matchRow(delta, elevationRules);
      if (!row) {
        issues.push(issue(path, 'unmatched-elevation-pattern', '八邻高差没有已知匹配，不能猜测或自动修整高度。'));
        return result;
      }
      if (row.control) {
        issues.push(issue(path, 'unsupported-elevation-control', `此处需要整理高度（表行 ${row.row}）；读取地图不会自动改写事实。`));
        return result;
      }
      if (!coversHighNeighbors(delta, row) || !consistentViews(delta, row, elevationRules)) {
        issues.push(issue(path, 'unsupported-elevation-shape', '现有坡面无法完整覆盖此处高差；请扩大调整范围或分级绘制。'));
        return result;
      }
      const record = row.viewRecords[column];
      if (!elevationRules.supportedRecords.includes(record)) {
        issues.push(issue(path, 'unsupported-elevation-pattern', `高程表行 ${row.row} 超出已取证的普通整级形态。`));
        return result;
      }
      const element = `${elevationRules.elementPrefix}${record}`;
      const definition = elements[element];
      if (!definition) {
        issues.push(issue(path, 'missing-elevation-element', `缺少高程元素 ${element}。`));
        return result;
      }
      if (definition.id !== element || definition.kind !== 'tile' || !Array.isArray(definition.footprint)
        || definition.footprint.length !== 1 || !isGrid(definition.footprint[0]) || definition.footprint[0].some(Boolean)) {
        issues.push(issue(path, 'invalid-elevation-element', `高程元素 ${element} 必须是单格 tile。`));
        return result;
      }
      return { ...result, element, rowIndex: row.row, slope: true };
    });

    // 世界占地沿用地图消费者，避免另造一套实体旋转或原点即占地的假设。
    if (Array.isArray(map.entities) && map.entities.length) {
      if (!window.qtiledMaps || typeof window.qtiledMaps.buildMapOccupancy !== 'function') {
        issues.push(issue('$maps', 'missing-map-occupancy', '实体与坡面校验需要地图占地模块。'));
      } else {
        const occupancy = window.qtiledMaps.buildMapOccupancy(map, elements);
        issues.push(...occupancy.issues);
        if (occupancy.index) tiles.filter(tile => tile.slope).forEach(tile => {
          if (occupancy.index.has(tile.grid.join(','))) {
            const [x, y] = tile.grid;
            issues.push(issue(`cells[${y}][${x}]`, 'unsupported-slope-entity', '当前不支持实体占用坡面；请移开实体或调整高地。'));
          }
        });
      }
    }
    return issues.length ? failed(issues) : { tiles, issues };
  }

  /** 原程序 0x4772f0 的局部规则：控制1/2优先增高，否则按工具方向夹取邻域高差。
   * 0x5430e0/0x544940 的世界行列扫描和未匹配队列单独处理。
   * 原程序这里只证明单次扫描；重复到稳定、循环检测和轮数上限是本工具的事务保护。
   */
  function reconcile(cells, rules, lowering, occupied) {
    const seen = new Set();
    const maxPasses = 2 * (MAX_HEIGHT - MIN_HEIGHT + 1) + cells.length + cells[0].length;
    const signature = () => cells.map(row => row.map(cell => cell ? cell.elevation : '.').join(',')).join(';');
    const update = (x, y, height) => {
      const cell = cells[y][x];
      if (height === cell.elevation) return [];
      const path = `cells[${y}][${x}]`;
      if (height < MIN_HEIGHT || height > MAX_HEIGHT) return [issue(path, 'elevation-adjustment-range', '联动高度超出 0～16，整笔取消。')];
      if (occupied.has(`${x},${y}`)) return [issue(path, 'elevation-adjustment-protected', '联动会改变已有实体的地基，整笔取消。')];
      cell.elevation = height;
      return [];
    };
    for (let pass = 0; pass < maxPasses; pass += 1) {
      const before = signature();
      if (seen.has(before)) return [issue('$command', 'elevation-adjustment-cycle', '这组高差无法稳定整理，请分级调整或扩大选区；整笔取消。')];
      seen.add(before);
      const queue = [];
      for (let y = 0; y < cells.length; y += 1) for (let x = 0; x < cells[y].length; x += 1) {
        const cell = cells[y][x];
        if (!cell || cell.terrain !== 'land') continue;
        const { ring, heights } = neighborhood(cells, x, y);
        // 水域不是可联动陆地；空边缘仅延拓输入，最终混合形态由纯解析器校验。
        if (ring.some(neighbor => neighbor && neighbor.terrain !== 'land')) continue;
        const delta = heights.map(height => height - cell.elevation);
        const row = matchRow(delta, rules);
        const low = Math.max(...heights) - 2;
        const high = Math.min(...heights) + 2;
        // 不能用一张较低坡面遮盖分离高角；回填低格后重新解析整笔候选。
        // 这是工具的保守整理策略，读取旧文件仍只报告问题，不改写高度。
        const fill = row && !row.control && !coversHighNeighbors(delta, row);
        const next = row?.control || fill ? cell.elevation + (row.control || 1) : lowering
          ? Math.min(Math.max(cell.elevation, low), high) : Math.max(Math.min(cell.elevation, high), low);
        const errors = update(x, y, next);
        if (errors.length) return errors;
        if (!row && heights.some(height => height > next)) queue.push([x, y]);
      }
      for (const [x, y] of queue) {
        const errors = update(x, y, Math.max(MIN_HEIGHT, cells[y][x].elevation - 1));
        if (errors.length) return errors;
      }
      if (signature() === before) return [];
    }
    return [issue('$command', 'elevation-adjustment-limit', '高度整理超过本笔处理上限，请缩小调整幅度；整笔取消。')];
  }

  // 降低目标被局部控制行回填时，逐圈扩展下挖范围，再复用原有坡面整理。
  // 这是工具的创作策略，不声称原作如此处理；只扩展陆地，不生成空角或移动实体。
  function reconcileLowering(cells, targets, rules, occupied) {
    const limit = Math.max(cells.length, cells[0].length);
    for (let radius = 0; radius <= limit; radius += 1) {
      const candidate = cells.map(row => row.map(cell => cell && { ...cell }));
      const errors = reconcile(candidate, rules, true, occupied);
      if (errors.some(error => !['elevation-adjustment-cycle', 'elevation-adjustment-limit'].includes(error.code))) return { issues: errors };
      const filled = [...targets].filter(([key, height]) => {
        const [x, y] = key.split(',').map(Number);
        return candidate[y][x].elevation !== height;
      });
      if (!errors.length && !filled.length) return { cells: candidate, issues: [] };
      for (const [key, height] of targets) {
        const [cx, cy] = key.split(',').map(Number);
        for (let y = Math.max(0, cy - radius - 1); y <= Math.min(cells.length - 1, cy + radius + 1); y += 1) {
          for (let x = Math.max(0, cx - radius - 1); x <= Math.min(cells[y].length - 1, cx + radius + 1); x += 1) {
            const cell = cells[y][x];
            if (!cell || cell.terrain !== 'land' || targets.has(`${x},${y}`) || cell.elevation <= height) continue;
            if (occupied.has(`${x},${y}`)) return { issues: [issue(`cells[${y}][${x}]`,
              'elevation-adjustment-protected', '下挖联动会改变已有实体的地基，整笔取消。')] };
            cell.elevation = height;
          }
        }
      }
    }
    return { issues: [issue('$command', 'elevation-adjustment-limit', '无法保留这组下挖目标，请分笔调整；整笔取消。')] };
  }

  /** 一笔总从原快照生成完整候选；失败没有部分地图，调用方可继续累加格子重试预览。
   * 工具操作：{ terrain: 'land'|'water', grids } 或 { type: 'raise'|'lower'|'set-height', height?, grids }。
   */
  function applyStroke(map, command, elements, landRules, elevationRules, angle = 0) {
    if (map && map.version === 1 && command && ['land', 'water'].includes(command.terrain) && !command.type) {
      return window.landWaterRules.applyStroke(map, command, elements, landRules, angle);
    }
    const issues = checkRules(elevationRules);
    if (issues.length) return { definition: null, ...failed(issues) };
    issues.push(...checkHeights(map, elevationRules));
    // 允许原图形态暂不支持的单笔候选修复，但结构与陆水事实始终必须有效。
    issues.push(...window.landWaterRules.resolve(flatView(map), elements, landRules, angle).issues);
    const heightTool = command && ['raise', 'lower', 'set-height'].includes(command.type);
    if (!isObject(command) || (!heightTool && !['land', 'water'].includes(command.terrain))
      || (command.type && !heightTool) || !Array.isArray(command.grids) || !command.grids.length
      || (command.type === 'set-height' && (!Number.isInteger(command.height) || command.height < MIN_HEIGHT || command.height > MAX_HEIGHT))) {
      issues.push(issue('$command', 'invalid-elevation-stroke', '笔刷需要有效的地表/升降/设高操作与非空格列表，设高值必须为 0～16 的整数。'));
    }
    if (issues.length) return { definition: null, ...failed(issues) };
    const grids = new Map();
    command.grids.forEach((grid, index) => {
      const path = `$command.grids[${index}]`;
      if (!isGrid(grid)) issues.push(issue(path, 'invalid-grid', '笔刷格必须是两个安全整数。'));
      else if (grid[1] < 0 || grid[0] < 0 || grid[1] >= map.cells.length || grid[0] >= map.cells[0].length) {
        issues.push(issue(path, 'stroke-out-of-bounds', '笔刷超出地图矩阵，整笔取消。'));
      } else if (map.cells[grid[1]][grid[0]] === null) {
        issues.push(issue(path, 'stroke-invalid-cell', '笔刷包含无效格，整笔取消。'));
      } else grids.set(grid.join(','), grid);
    });
    if (issues.length) return { definition: null, ...failed(issues) };
    const occupied = new Map();
    if (heightTool && Array.isArray(map.entities) && map.entities.length) {
      if (!window.qtiledMaps || typeof window.qtiledMaps.buildMapOccupancy !== 'function') {
        issues.push(issue('$maps', 'missing-map-occupancy', '高程笔刷需要地图占地模块检查实体。'));
      } else {
        const occupancy = window.qtiledMaps.buildMapOccupancy(map, elements);
        issues.push(...occupancy.issues);
        if (occupancy.index) occupancy.index.forEach((value, key) => occupied.set(key, value));
        if (occupancy.index) for (const [key, [x, y]] of grids) {
          if (occupancy.index.has(key)) {
            issues.push(issue(`cells[${y}][${x}]`, 'elevation-stroke-entity', '高程笔刷不能直接升降已有实体的地基，请先移开实体。'));
          }
        }
      }
    }
    if (issues.length) return { definition: null, ...failed(issues) };
    let cells = map.cells.map(row => row.map(cell => cell === null ? null : { ...cell }));
    let heightChanged = false;
    const requested = new Map();
    for (const [x, y] of grids.values()) {
      const cell = cells[y][x];
      if (!heightTool) cell.terrain = command.terrain;
      else if (command.type === 'set-height') cell.elevation = command.height;
      else cell.elevation += command.type === 'raise' ? 1 : -1;
      if (cell.elevation < MIN_HEIGHT || cell.elevation > MAX_HEIGHT) {
        issues.push(issue(`cells[${y}][${x}]`, 'elevation-stroke-range', '升降超出 0～16，整笔取消。'));
      }
      if (heightTool) requested.set(`${x},${y}`, cell.elevation);
      if (cell.elevation !== map.cells[y][x].elevation) heightChanged = true;
    }
    if (issues.length) return { definition: null, ...failed(issues) };
    if (heightTool && heightChanged) {
      // 设高同时跨越高低两侧时，采用降低优先的确定顺序；这是区域工具约定。
      const lowering = command.type === 'lower' || (command.type === 'set-height'
        && [...grids.values()].some(([x, y]) => map.cells[y][x].elevation > command.height));
      if (lowering) {
        const targets = new Map([...requested].filter(([key, height]) => {
          const [x, y] = grids.get(key);
          return height < map.cells[y][x].elevation;
        }));
        const result = reconcileLowering(cells, targets, elevationRules, occupied);
        issues.push(...result.issues);
        if (result.cells) cells = result.cells;
      } else issues.push(...reconcile(cells, elevationRules, false, occupied));
      if (issues.length) return { definition: null, ...failed(issues) };
    }
    const changes = [];
    cells.forEach((row, y) => row.forEach((cell, x) => {
      if (cell && cell.elevation !== map.cells[y][x].elevation) changes.push({ grid: [x, y],
        before: map.cells[y][x].elevation, after: cell.elevation, selected: grids.has(`${x},${y}`) });
    }));
    heightChanged = changes.length > 0;
    const upgraded = heightChanged && map.version === 1 ? { version: 2, elevationStep: elevationRules.elevationStep } : {};
    const definition = { ...map, ...upgraded, cells };
    const result = resolve(definition, elements, landRules, elevationRules, angle);
    return { definition: result.issues.length ? null : definition, ...result, changes,
      adjusted: [...requested].filter(([key, height]) => {
        const [x, y] = grids.get(key);
        return cells[y][x].elevation !== height;
      }).map(([key]) => grids.get(key)) };
  }

  window.elevationRules = { resolve, applyStroke };
})();
