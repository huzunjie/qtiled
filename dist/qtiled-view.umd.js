
/**
 * qtiled v0.2.7
 * (c) 2008-2026 huzunjie
 * Released under MIT
 */

(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
  typeof define === 'function' && define.amd ? define(['exports'], factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.qtiledView = {}));
}(this, (function (exports) { 'use strict';

  /* 二维多边形相关配置及基础方法 */

  /* 基础配置参数（个别参数调整涉及算法变化，所以放全局配置，以示特殊）*/
  const HALF = 0.5;
  /** 绕固定原点旋转逻辑坐标，不重新居中或锚定选区。
   * @param {Array<number>} grid 有限数值坐标 [gridX, gridY]，默认 [0, 0]；不是错列行列下标。
   * @param {number} quarterTurns 累计整数次数，默认 0；一次为 [-y, x]，负数反向，按 4 取模。
   * @returns {Array<number>} 旋转后的坐标，返回新数组、不修改输入；四次恢复原坐标。
   * 顺时针以逻辑 X 向右、Y 向下定义；允许小数坐标供连续位置计算。
   */

  function rotateGridPoint([gridX, gridY] = [0, 0], quarterTurns = 0) {
    const turns = (quarterTurns % 4 + 4) % 4;
    const swapAxes = turns % 2;
    const signX = turns === 1 || turns === 2 ? -1 : 1;
    const signY = turns >= 2 ? -1 : 1;
    return [signX * (swapAxes ? gridY : gridX) || 0, signY * (swapAxes ? gridX : gridY) || 0];
  }

  /* 正菱形地图元件方法 */

  const ELEVATION_HEIGHT = 16;

  function applyElevation([pixelX, pixelY, ...rest], elevation) {
    return [pixelX, pixelY - elevation * ELEVATION_HEIGHT, ...rest];
  } // 宽高为1的正菱形顶点集合
  /* 获取宽高的一半（菱形中心点在顶点坐标系中的值）
  * @param  {Array}   size    如： [width{Number}, height{Number}]
  * @return {Array}   [halfWidth, halfHeight]
  */

  function getHalfSize([width = 1, height = 1] = [1, 1]) {
    return [width * HALF, height * HALF];
  }
  /* 按等距布局菱形单元横纵坐标值及单元格宽高得到渲染坐标值
   * elevation 默认 0；每单位向上偏移 16px，不改变网格关系。
   */

  function getIsometricPosition([gridX, gridY] = [], tileSize = [8, 4], originPixel = [0, 0], elevation = 0) {
    const [pixelX, pixelY] = getIsometricPosByHalfSize(gridX, gridY, ...getHalfSize(tileSize));
    return applyElevation([pixelX + originPixel[0], pixelY + originPixel[1]], elevation);
  }
  /* 按等距布局菱形单元横纵坐标值及单元格宽高的一半得到渲染坐标值 */

  function getIsometricPosByHalfSize(xNum, yNum, halfWidth, halfHeight) {
    return [(xNum + yNum) * halfWidth, (yNum - xNum) * halfHeight];
  }
  /* 仅反查平面位置，不处理海拔位移或重叠顶面的点击命中。
   * 通过大致的像素坐标值获取该位置等距布局tile元素的[Num, yNum]
   * @param  {Array}   pos            目标点像素坐标值(相对于画布原点的偏移量)，如：[x<Number>, y<Number>]
   * @param  {Array}   originPos      地图起点元素渲染时像素坐标值，如：[x<Number>, y<Number>]
   * @param  {Array}   tileSize       单瓦片图宽高值，如：[80, 40]
   * @return {Object}  {xNum, yNum, x, y}
   */

  function getIsometricInfoByPos(pixelPos = [0, 0], originPixel = [0, 0], tileSize = [8, 4]) {
    const [halfWidth, halfHeight] = getHalfSize(tileSize);
    const [originPixelX, originPixelY] = originPixel;
    const pixelStepsX = (pixelPos[0] - originPixelX) / halfWidth * HALF;
    const pixelStepsY = (pixelPos[1] - originPixelY) / halfHeight * HALF;
    const gridY = Math.round(pixelStepsY + pixelStepsX);
    const gridX = Math.round(pixelStepsX - pixelStepsY);
    const [pixelX, pixelY] = getIsometricPosByHalfSize(gridX, gridY, halfWidth, halfHeight);
    return [gridX, gridY, pixelX + originPixelX, pixelY + originPixelY];
  }

  /* 平地四向视图的可选入口，不从核心 src/index.js 导出。 */

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


  function projectGrid(grid = [0, 0], {
    angle = 0,
    tileSize = [8, 4],
    originPixel = [0, 0]
  } = {}) {
    return getIsometricPosition(rotateGridPoint(grid, getQuarterTurns(angle)), tileSize, originPixel);
  }
  /** 先反查平面视图格，再逆旋转回世界格。
   * @param {Array<number>} pixel 画布内的有限像素坐标，默认 [0, 0]。
   * @param {Object} view 参数约定与 projectGrid 相同。
   * @returns {Array<number>} 世界整数格 [gridX, gridY]，不附带像素坐标或检查地图边界。
   * 共边归属沿用 getIsometricInfoByPos 的 Math.round 规则，不保证共边在切向后仍属同一侧。
   * 不处理海拔、实体遮挡或图片像素命中；不修改输入。
   */

  function pickGrid(pixel = [0, 0], {
    angle = 0,
    tileSize = [8, 4],
    originPixel = [0, 0]
  } = {}) {
    const turns = getQuarterTurns(angle);
    const [gridX, gridY] = getIsometricInfoByPos(pixel, originPixel, tileSize);
    return rotateGridPoint([gridX, gridY], -turns);
  }

  exports.pickGrid = pickGrid;
  exports.projectGrid = projectGrid;

  Object.defineProperty(exports, '__esModule', { value: true });

})));
