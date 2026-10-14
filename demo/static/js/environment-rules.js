/* 原作环境业务规则：只读取已校验的矩形格事实，返回派生强度，不依赖素材、镜头或DOM。 */
(function () {
  const { getTree, getRock } = window.terrainSample;
  const climates = { arid: [10, 10], temperate: [40, 20], humid: [60, 20] };

  // 真实水格与海滩作来源。两遍八邻距离变换求 Chebyshev 距离；空角不是障碍或水源。
  // 原作普通陆水步骤的参数和换算见 climate-ground-selection-2026-10-12。
  function deriveMoisture(cells, climate) {
    if (climate === undefined) return null;
    const [radius, divisor] = climates[climate];
    const sources = [];
    cells.forEach((row, y) => row.forEach((cell, x) => {
      if (cell?.terrain === 'water' || cell?.beach === true) sources.push([x, y]);
    }));
    const distances = window.qtiled.pathFinding.getChebyshevDistanceField(cells[0].length, cells.length, sources);
    const moisture = distances.map(row => row.map(distance => distance > radius ? 0
      : Math.min(100, Math.trunc(100 * (radius + 1 - distance) / divisor))));
    // 原作4c0274..4c02b9/4c0000：水/海滩距离至少6且现U>0的石/矿/采石/沙丘格按行扫描。
    // 从-10起、四邻每步+20限制现值；更低现值截断，等值继续，不累计扣减。
    // 距离共用原作0x10004对应的水/海滩来源集合。
    cells.forEach((row, y) => row.forEach((cell, x) => {
      if ((!getRock(cell?.rock) && cell?.quarry !== true && cell?.dune !== true) || distances[y][x] < 6 || moisture[y][x] <= 0) return;
      const pending = [[x, y, -10]];
      while (pending.length) {
        const [px, py, value] = pending.pop();
        if (value >= 100 || py < 0 || py >= cells.length || px < 0 || px >= cells[0].length
          || moisture[py][px] < value) continue;
        moisture[py][px] = Math.max(0, value);
        // 与树源相同的N/E/S/W访问顺序；null仅作临时传播位置，界外不跨行。
        pending.push([px - 1, py, value + 20], [px, py + 1, value + 20],
          [px + 1, py, value + 20], [px, py - 1, value + 20]);
      }
    }));
    // 原作4c02fc/4bff60：水源及岩石修正后，树源50，四邻每步减10。
    // 较强现值截断该路径；等值仍继续，不能以八邻距离或强度相加代替。
    // null只作矩阵内临时传播位置，不作来源/不持久化；界外不跨行传播。
    cells.forEach((row, y) => row.forEach((cell, x) => {
      if (!getTree(cell?.tree) || moisture[y][x] >= 50) return;
      const pending = [[x, y, 50]];
      while (pending.length) {
        const [px, py, value] = pending.pop();
        if (value <= 0 || py < 0 || py >= cells.length || px < 0 || px >= cells[0].length
          || moisture[py][px] > value) continue;
        moisture[py][px] = value;
        // 反向入栈，消费顺序与原作N/E/S/W一致。
        pending.push([px - 1, py, value - 10], [px, py + 1, value - 10],
          [px + 1, py, value - 10], [px, py - 1, value - 10]);
      }
    }));
    return moisture;
  }

  window.environmentRules = { climates, deriveMoisture };
})();
