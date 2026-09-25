/* 按实际绘制顺序扣除遮挡顶面，结果为每格露出的凸多边形片段（画布坐标）。
 * 填充透明度不参与可选性，与顶面命中一致；忽略仅共边、共点的零面积片段。
 */
function getVisibleTileParts(cells, vertexes) {
  const epsilon = 1e-8;
  const area = polygon => polygon.reduce((sum, [x, y], i) => {
    const [nextX, nextY] = polygon[(i + 1) % polygon.length];
    return sum + x * nextY - nextX * y;
  }, 0) / 2;
  const hasArea = polygon => polygon.length >= 3 && Math.abs(area(polygon)) > epsilon;
  const bounds = polygon => qtiled.shapes.polygon.getBounds(polygon);
  const overlaps = (a, b) => a.minX < b.maxX && a.maxX > b.minX && a.minY < b.maxY && a.maxY > b.minY;
  // 用有向直线将凸多边形分成内外两片，交点同时属于两侧。
  function split(polygon, start, end, sign) {
    const inside = [];
    const outside = [];
    const distance = ([x, y]) => sign * ((end[0] - start[0]) * (y - start[1]) - (end[1] - start[1]) * (x - start[0]));
    for (let i = 0; i < polygon.length; i++) {
      const point = polygon[i];
      const next = polygon[(i + 1) % polygon.length];
      const rawDistance = distance(point);
      const rawNextDistance = distance(next);
      const d = Math.abs(rawDistance) < epsilon ? 0 : rawDistance;
      const nextD = Math.abs(rawNextDistance) < epsilon ? 0 : rawNextDistance;
      if (d >= 0) inside.push(point);
      if (d <= 0) outside.push(point);
      if ((d < 0 && nextD > 0) || (d > 0 && nextD < 0)) {
        const ratio = d / (d - nextD);
        const intersection = [point[0] + (next[0] - point[0]) * ratio, point[1] + (next[1] - point[1]) * ratio];
        inside.push(intersection);
        outside.push(intersection);
      }
    }
    return { inside, outside };
  }
  function subtract(subject, clip) {
    let remaining = subject;
    const result = [];
    const sign = area(clip) >= 0 ? 1 : -1;
    for (let i = 0; i < clip.length && hasArea(remaining); i++) {
      const { inside, outside } = split(remaining, clip[i], clip[(i + 1) % clip.length], sign);
      if (hasArea(outside)) result.push(outside);
      remaining = inside;
    }
    return result;
  }
  // 菱形内缩 1.5px 的边框也用面积片段绘制，避免描边越过遮挡边界。
  const perimeter = vertexes.reduce((sum, [x, y], i) => {
    const [nextX, nextY] = vertexes[(i + 1) % vertexes.length];
    return sum + Math.hypot(nextX - x, nextY - y);
  }, 0);
  const inradius = 2 * Math.abs(area(vertexes)) / perimeter;
  const innerScale = Math.max(0, 1 - 1.5 / inradius);
  const tops = cells.map(cell => {
    const polygon = vertexes.map(([x, y]) => [x + cell.pos[0], y + cell.pos[1]]);
    const inner = vertexes.map(([x, y]) => [x * innerScale + cell.pos[0], y * innerScale + cell.pos[1]]);
    return { polygon, inner, bounds: bounds(polygon) };
  });
  const visible = new Map();
  cells.forEach((cell, index) => {
    let parts = [tops[index].polygon];
    for (let later = index + 1; later < tops.length && parts.length; later++) {
      const cover = tops[later];
      if (!overlaps(tops[index].bounds, cover.bounds)) continue;
      parts = parts.flatMap(part => overlaps(bounds(part), cover.bounds) ? subtract(part, cover.polygon) : [part]);
    }
    if (parts.length) visible.set(`${cell.gridX},${cell.gridY}`, {
      parts,
      outlines: parts.flatMap(part => subtract(part, tops[index].inner)),
    });
  });
  return visible;
}

/* 海拔页仅预览：网格集合与高度无关，按可见片段绘制，焦点保持置顶。 */
function createElevationSelection({ container, cells, points, layer, focusShapes, getByOffsets, getByDistance }) {
  const visible = getVisibleTileParts(cells, points);
  const overlays = [];
  let focus = null;
  const selection = createTileSelection({ container, getByOffsets, getByDistance, onChange: draw });
  function draw() {
    overlays.forEach(overlay => overlay.remove());
    overlays.length = 0;
    if (focus && focus.elevation !== null) {
      selection.getNeighbors([focus.gridX, focus.gridY]).forEach(grid => {
        const top = visible.get(grid.join(','));
        if (!top) return;
        const appendParts = (parts, fillColor) => parts.forEach(part => overlays.push(new spritejs.Polyline({
          pos: [0, 0],
          points: part,
          fillColor,
          lineWidth: 0,
          close: true,
        })));
        appendParts(top.parts, 'rgba(0, 80, 220, 0.12)');
        appendParts(top.outlines, 'rgba(0, 80, 220, 0.8)');
      });
    }
    layer.append(...overlays, ...focusShapes);
  }
  return {
    update(nextFocus) {
      if (focus === nextFocus) return;
      focus = nextFocus;
      draw();
    },
  };
}
