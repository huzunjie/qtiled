/* 海拔渲染坐标计算

 * 在菱形布局基础坐标之上叠加海拔偏移，支持错列布局和等距布局两种模式。
 * 海拔越高，瓦片在 Y 轴方向上移（屏幕上方），形成立体层次感。
 */

import {
  getPosition as getRhombusPosition,
  getIsometricPosition as getRhombusIsometricPosition,
} from '../shapes/rhombus';
import { twoDimForEach } from '../shapes/polygon';

/* 获取带海拔偏移的错列布局瓦片渲染坐标
 * @param  {Array}  xyNum           目标元素 XY 索引值，如 [0, 0]
 * @param  {Array}  tileSize        单瓦片图宽高值，如 [80, 40]
 * @param  {ElevationMap} elevationMap 海拔地图实例
 * @param  {Number} elevationHeight  单位海拔对应的像素高度，默认 10
 * @param  {String} stagger          错列模式 ['odd', 'even', 'none']
 * @param  {Array}  originXY         原点像素坐标值
 * @return {Array} [x, y, xNum, yNum, elevation]
 */
export function getElevatedPosition(
  xyNum = [0, 0],
  tileSize = [8, 4],
  elevationMap,
  elevationHeight = 10,
  stagger = 'odd',
  originXY = [0, 0],
) {
  const [xNum, yNum] = xyNum;
  const [baseX, baseY] = getRhombusPosition(xyNum, tileSize, stagger, originXY);
  const elevation = elevationMap ? elevationMap.get(xNum, yNum) : 0;
  const offsetY = -elevation * elevationHeight;
  return [baseX, baseY + offsetY, xNum, yNum, elevation];
}

/* 获取带海拔偏移的等距布局瓦片渲染坐标
 * @param  {Array}  xyNum           目标元素 XY 索引值，如 [0, 0]
 * @param  {Array}  tileSize        单瓦片图宽高值，如 [80, 40]
 * @param  {ElevationMap} elevationMap 海拔地图实例
 * @param  {Number} elevationHeight  单位海拔对应的像素高度，默认 10
 * @param  {Array}  originXY         原点像素坐标值
 * @return {Array} [x, y, xNum, yNum, elevation]
 */
export function getElevatedIsometricPosition(
  xyNum = [0, 0],
  tileSize = [8, 4],
  elevationMap,
  elevationHeight = 10,
  originXY = [0, 0],
) {
  const [xNum, yNum] = xyNum;
  const [baseX, baseY] = getRhombusIsometricPosition(xyNum, tileSize, originXY);
  const elevation = elevationMap ? elevationMap.get(xNum, yNum) : 0;
  const offsetY = -elevation * elevationHeight;
  return [baseX, baseY + offsetY, xNum, yNum, elevation];
}

/* 批量获取带海拔偏移的错列布局瓦片渲染坐标
 * @param  {Array}  mainAxisRange   主轴行序号区间，如 [0, 9]
 * @param  {Array}  subAxisRange    副轴行序号区间，如 [0, 9]
 * @param  {Array}  tileSize        单瓦片图宽高值
 * @param  {ElevationMap} elevationMap 海拔地图实例
 * @param  {Number} elevationHeight  单位海拔对应的像素高度
 * @param  {String} stagger          错列模式
 * @param  {String} renderOrder      渲染方向
 * @return {Array} [[x, y, xNum, yNum, elevation], ...]
 */
export function getElevatedPositions(
  mainAxisRange = [0, 0],
  subAxisRange = [0, 0],
  tileSize = [8, 4],
  elevationMap,
  elevationHeight = 10,
  stagger = 'odd',
  renderOrder = 'RightDown',
) {
  return twoDimForEach(mainAxisRange, subAxisRange, renderOrder, (xNum, yNum) => {
    return getElevatedPosition([xNum, yNum], tileSize, elevationMap, elevationHeight, stagger);
  });
}

/* 批量获取带海拔偏移的等距布局瓦片渲染坐标
 * @param  {Array}  mainAxisRange   主轴行序号区间
 * @param  {Array}  subAxisRange    副轴行序号区间
 * @param  {Array}  tileSize        单瓦片图宽高值
 * @param  {ElevationMap} elevationMap 海拔地图实例
 * @param  {Number} elevationHeight  单位海拔对应的像素高度
 * @param  {String} renderOrder      渲染方向
 * @return {Array} [[x, y, xNum, yNum, elevation], ...]
 */
export function getElevatedIsometricPositions(
  mainAxisRange = [0, 0],
  subAxisRange = [0, 0],
  tileSize = [8, 4],
  elevationMap,
  elevationHeight = 10,
  renderOrder = 'RightDown',
) {
  return twoDimForEach(mainAxisRange, subAxisRange, renderOrder, (xNum, yNum) => {
    return getElevatedIsometricPosition([xNum, yNum], tileSize, elevationMap, elevationHeight);
  });
}

/* 按海拔和位置生成渲染顺序
 * 确保高海拔瓦片后渲染（遮挡低海拔），同海拔内按 renderDirection 排序
 * @param  {ElevationMap} elevationMap 海拔地图实例
 * @param  {String} renderDirection 渲染方向 ['RightDown','RightUp','LeftDown','LeftUp']
 * @return {Array} [[xNum, yNum, elevation], ...] 按渲染顺序排列
 */
export function getRenderOrder(elevationMap, renderDirection = 'RightDown') {
  const { width, height } = elevationMap;
  const positions = twoDimForEach([0, width - 1], [0, height - 1], renderDirection, (xNum, yNum) => {
    return [xNum, yNum, elevationMap.get(xNum, yNum)];
  });
  // 同海拔内保持原渲染方向顺序，高海拔排后面
  // 使用稳定排序：先按 elevation 升序，同海拔保持原序
  return positions.sort((a, b) => a[2] - b[2]);
}
