/* 平地四向视图的可选入口，不从核心 src/index.js 导出。 */
import { rotateGridPoint } from '../shapes/polygon';
import { getIsometricPosition, getIsometricInfoByPos } from '../shapes/rhombus';

function getQuarterTurns(angle) {
  if (![0, 90, 180, 270].includes(angle)) {
    throw new RangeError('view.angle 必须为数字 0、90、180 或 270。');
  }
  return angle / 90;
}

/** 世界格坐标经固定原点旋转后，复用等距投影得到瓦片中心。
 * @param {Array<number>} grid 世界格坐标，默认 [0, 0]，允许有限小数表示连续位置。
 * @param {Object} view { angle: 0, tileSize: [8, 4], originPixel: [0, 0] }
 * angle 是逻辑坐标顺时针旋转的度数，不对应尚未核实的原作罗盘方位。
 * tileSize 为有限正数宽高，originPixel 为有限像素坐标；只处理平地，不修改输入。
 * @returns {Array<number>} [pixelX, pixelY]
 */
export function projectGrid(grid = [0, 0], { angle = 0, tileSize = [8, 4], originPixel = [0, 0] } = {}) {
  return getIsometricPosition(rotateGridPoint(grid, getQuarterTurns(angle)), tileSize, originPixel);
}

/** 先反查平面视图格，再逆旋转回世界格。
 * @param {Array<number>} pixel 画布内的有限像素坐标，默认 [0, 0]。
 * @param {Object} view 参数约定与 projectGrid 相同。
 * @returns {Array<number>} 世界整数格 [gridX, gridY]，不附带像素坐标或检查地图边界。
 * 共边归属沿用 getIsometricInfoByPos 的 Math.round 规则，不保证共边在切向后仍属同一侧。
 * 不处理海拔、实体遮挡或图片像素命中；不修改输入。
 */
export function pickGrid(pixel = [0, 0], { angle = 0, tileSize = [8, 4], originPixel = [0, 0] } = {}) {
  const turns = getQuarterTurns(angle);
  const [gridX, gridY] = getIsometricInfoByPos(pixel, originPixel, tileSize);
  return rotateGridPoint([gridX, gridY], -turns);
}
