/* 地图与只读上下文共用的高程绘制部件；不修改素材、地图事实或公共元素契约。 */
(function () {
  function resolveTileDraws(tile, map, elements, view, options = {}) {
    const draw = window.qtiledElementRendering.resolveElementDraw(elements[tile.element], tile.grid,
      { ...view, originPixel: [0, -(tile.elevation || 0) * (map.elevationStep || 0)] }, 0, options);
    const draws = [];
    if (draw.rect[2] !== map.tileSize[0] - 2 || map.cells[tile.grid[1]][tile.grid[0]].terrain !== 'land') return [draw];
    const [x, y] = tile.grid;
    const adjacentSlope = [-1, 0, 1].some(dy => [-1, 0, 1].some(dx => {
      const cell = map.cells[y + dy]?.[x + dx];
      return cell && cell.elevation !== (tile.elevation || 0);
    }));
    if (!tile.slope && !adjacentSlope) return [draw];
    const center = window.qtiledView.projectGrid(tile.grid, view);
    // 78px原图放在80px格距时，水平相接的两个坡面各缺1列。
    // 仅在同一世界角两侧确有陆地时延拓边缘列；不补空角、地图外或水域。
    // 部件保持原格归属与画序，alpha拾取也使用这份裁切结果。
    for (const [dx, dy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      if (map.cells[y + dy]?.[x + dx]?.terrain !== 'land') continue;
      const other = window.qtiledView.projectGrid([x + dx, y + dy], view);
      if (other[1] !== center[1]) continue;
      const right = other[0] > center[0];
      const [sx, sy, width, height] = draw.rect;
      if (tile.slope) {
        draws.push({ ...draw, rect: [sx + (right ? width - 1 : 0), sy, 1, height],
          position: [draw.position[0] + (right ? width : -1), draw.position[1]], footprint: [] });
        // 坡脚菱形的斜边同样少1px；仅延拓锚点以下的地面，不改变上部岩石透明轮廓。
        const bottom = draw.anchor[1];
        draws.push({ ...draw, rect: [sx, sy + bottom, width, height - bottom],
          position: [draw.position[0] + (right ? 1 : -1), draw.position[1] + bottom], footprint: [] });
      } else {
        // 台地顶面的斜边也有1px离散取整差；先延拓相接地面的边缘，再以原图覆盖本体。
        // 仅处理高差邻接，保留原颜色/比例及原图内部像素，不扩展普通平地/水面。
        draws.push({ ...draw, position: [draw.position[0] + (right ? 1 : -1), draw.position[1]], footprint: [] });
      }
    }
    return [...draws, draw];
  }

  window.elevationRendering = { resolveTileDraws };
})();
