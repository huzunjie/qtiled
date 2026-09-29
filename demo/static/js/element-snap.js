/* 编辑器辅助：只识别裁切内可见下缘的连续斜边，不推断建筑占地。 */
function getElementLowerEdges(pixels, width, height, tileSize) {
  const lower = [];
  for (let x = 0; x < width; x++) {
    for (let y = height - 1; y >= 0; y--) {
      // 忽略低透明度阴影；像素底面而非整个图片外框参与拟合。
      if (pixels[(y * width + x) * 4 + 3] >= 128) { lower.push([x + 0.5, y + 1]); break; }
    }
  }
  if (!lower.length) return [];
  const bottom = Math.max(...lower.map(point => point[1]));
  const points = lower.filter(point => point[1] >= bottom - Math.max(tileSize[1], height / 3));
  const minimum = Math.max(8, Math.ceil(width * 0.15));
  return [-1, 1].flatMap(sign => {
    const slope = sign * tileSize[1] / tileSize[0];
    const bins = new Map();
    points.forEach(([x, y]) => {
      const key = Math.round(y - slope * x);
      bins.set(key, (bins.get(key) || 0) + 1);
    });
    let best = [];
    // 每个候选要求连续支撑，零散树叶或矩形底边不能凭单点吸附。
    bins.forEach((count, intercept) => {
      if (count < minimum / 3) return;
      let run = [];
      points.forEach(point => {
        if (Math.abs(point[1] - slope * point[0] - intercept) > 1) { run = []; return; }
        if (run.length && point[0] - run[run.length - 1][0] > 1) run = [];
        run.push(point);
        if (run.length > best.length) best = [...run];
      });
    });
    if (best.length < minimum) return [];
    const rise = best[best.length - 1][1] - best[0][1];
    if (Math.abs(rise) < 3 || Math.abs(rise - slope * (best[best.length - 1][0] - best[0][0])) > 1) return [];
    const intercept = best.reduce((sum, [x, y]) => sum + y - slope * x, 0) / best.length;
    return [{ slope, intercept, from: best[0][0], to: best[best.length - 1][0] }];
  });
}

function snapElementLowerEdges(edges, position, origin, tileSize, scale) {
  const tolerance = 6 / scale; // 六个屏幕像素，不随缩放变得过敏。
  const candidates = edges.map(edge => {
    const intercept = position[1] - edge.slope * position[0] + edge.intercept;
    // 菱形中心相隔一个 tileHeight 的平行边线，首条边距中心半格。
    const base = origin[1] - edge.slope * origin[0] + tileSize[1] / 2;
    const target = base + Math.round((intercept - base) / tileSize[1]) * tileSize[1];
    return { ...edge, delta: target - intercept };
  }).filter(edge => Math.abs(edge.delta) / Math.hypot(1, edge.slope) <= tolerance);
  let offset = [0, 0];
  let matched = candidates;
  if (candidates.length === 2) {
    const [a, b] = candidates;
    const x = (b.delta - a.delta) / (a.slope - b.slope);
    offset = [x, a.delta + a.slope * x];
    if (Math.hypot(...offset) > tolerance) matched = [candidates.reduce((a, b) => Math.abs(a.delta) <= Math.abs(b.delta) ? a : b)];
  }
  if (matched.length === 1) {
    const { slope, delta } = matched[0];
    const y = delta / (1 + slope * slope);
    offset = [-slope * y, y];
  }
  return { offset, edges: matched };
}
