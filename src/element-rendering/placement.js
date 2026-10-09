import { getBounds, rotateGridPoint } from '../shapes/polygon';

function checkAngle(angle, name) {
  if (![0, 90, 180, 270].includes(angle)) {
    throw new RangeError(`${name} 必须为数字 0、90、180 或 270。`);
  }
}

/** 完整矩形在当前镜头下最上角的占地格；空集或非矩形没有已确认的选格规则。 */
export function getRectangleTopCell(cells, angle = 0) {
  checkAngle(angle, 'viewAngle');
  if (!Array.isArray(cells) || !cells.length || !cells.every(cell =>
    Array.isArray(cell) && cell.length === 2 && cell.every(Number.isInteger))) return null;
  const rotated = cells.map(cell => rotateGridPoint(cell, angle / 90));
  const bounds = getBounds(rotated);
  const count = new Set(rotated.map(cell => cell.join(','))).size;
  if (count !== cells.length || count !== (bounds.width + 1) * (bounds.height + 1)) return null;
  // QTiled 等距投影的纵坐标为 (y - x) * halfHeight，上角是 maxX/minY。
  return rotateGridPoint([bounds.maxX, bounds.minY], -angle / 90);
}

/** 将矩形占地当前画面的上角格对齐放置基准格，返回可直接交给绘制计算的姿态。
 * @param {Object} definition 已通过元素契约校验的定义；这里只支持完整矩形占地。
 * @param {Array<number>} placementGrid 光标命中的世界整数格，默认 [0, 0]。
 * @param {number} objectAngle 目标对象朝向，0、90、180 或 270。
 * @param {number} viewAngle 放置/转向发生时的镜头角度，之后转镜头不重新调用本函数。
 * @returns {Object} { grid, objectAngle }；grid 是定义原点的世界格，不是固定转轴。
 * 每次从原始占地计算，不改 JSON，也不把图片像素锚点当成旋转中心。
 */
export function resolveElementPlacement(definition, placementGrid = [0, 0], objectAngle = 0, viewAngle = 0) {
  checkAngle(objectAngle, 'objectAngle');
  checkAngle(viewAngle, 'viewAngle');
  if (!Array.isArray(placementGrid) || placementGrid.length !== 2 || !placementGrid.every(Number.isInteger)) {
    throw new TypeError('placementGrid 必须为两个有限整数。');
  }
  if (!getRectangleTopCell(definition.footprint)) {
    throw new RangeError('仅完整矩形占地支持上角格定位；不规则占地的转向规则尚未确认。');
  }
  const offsets = definition.footprint.map(cell => rotateGridPoint(cell, objectAngle / 90));
  const top = getRectangleTopCell(offsets, viewAngle);
  return { grid: placementGrid.map((value, i) => value - top[i]), objectAngle };
}
