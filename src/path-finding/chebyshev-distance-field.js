/**
 * 给定网格大小和一组来源格（作为距离起点的格子），算出每格离最近来源有多远。
 * 横着、竖着或斜着走一格都算 1，来源格自身的距离为 0。
 * 有多个来源时取最近的距离；没有来源时，每格都返回 Infinity。
 * 例如，把所有水格作为来源，就能得到每格离最近水格的距离。
 *
 * 只按行列坐标计算，不会绕开障碍，也不考虑高差或画面上的像素距离。
 * 不修改传入的来源坐标。
 * @param {number} width 网格列数，必须为正安全整数
 * @param {number} height 网格行数，必须为正安全整数
 * @param {Array<Array<number>>} sources 来源坐标列表；每项为 [列号, 行号]，从 0 开始，必须在网格内，可重复或为空
 * @returns {Array<Array<number>>} 距离表，按 [行号][列号] 读取
 * @throws {TypeError} 参数结构不符，或尺寸/坐标不是安全整数
 * @throws {RangeError} 宽高小于 1，或来源坐标超出网格
 * @example
 * // 3 列 3 行，来源在中心：中心距离为 0，周围八格距离都为 1。
 * getChebyshevDistanceField(3, 3, [[1, 1]]);
 * // 返回 [[1, 1, 1], [1, 0, 1], [1, 1, 1]]
 */
export default function getChebyshevDistanceField(width, height, sources) {
  if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height)) {
    throw new TypeError('距离场宽高必须为安全整数。');
  }
  if (width <= 0 || height <= 0) throw new RangeError('距离场宽高必须为正数。');
  if (!Array.isArray(sources)) throw new TypeError('距离场来源必须为坐标数组。');
  for (const grid of sources) {
    if (!Array.isArray(grid) || grid.length !== 2 || !Array.from(grid).every(Number.isSafeInteger)) {
      throw new TypeError('距离场来源必须为整数 [x, y] 坐标。');
    }
    if (grid[0] < 0 || grid[0] >= width || grid[1] < 0 || grid[1] >= height) {
      throw new RangeError('距离场来源不能超出矩阵范围。');
    }
  }
  const distances = Array.from({ length: height }, () => Array(width).fill(Infinity));
  for (const [x, y] of sources) distances[y][x] = 0;
  // 正向、反向各扫一遍，逐格更新到最近来源的距离；时间 O(width * height + sources.length)。
  for (const step of [1, -1]) {
    for (let y = step === 1 ? 0 : height - 1; y >= 0 && y < height; y += step) {
      for (let x = step === 1 ? 0 : width - 1; x >= 0 && x < width; x += step) {
        distances[y][x] = Math.min(distances[y][x], 1 + Math.min(
          distances[y][x - step] ?? Infinity,
          distances[y - step]?.[x - 1] ?? Infinity,
          distances[y - step]?.[x] ?? Infinity,
          distances[y - step]?.[x + 1] ?? Infinity));
      }
    }
  }
  return distances;
}
