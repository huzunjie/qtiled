/* 查找二维坐标系相邻元素
* @param {Array}     xyNum              瓦片坐标值，如：[xNum, yNum]
* @param {Array}     referenceMatrix    相邻元素差值矩阵，也就是[xNum, yNum]与相邻坐标差集合，如：[[-1, -1], [1, 1], ...]
* @param {Function}  filter             自行过滤方法，参数示例：(xyNum = [xNum, yNum], rmXY = [-1, -1])
* @return {Array}    匹配的邻居坐标集合或空数组
*/
export default function getNeighborsPoints(
  xyNum = [0, 0],
  referenceMatrix = [
    [1, 0],
    [0, 1],
    [-1, 0],
    [0, -1],
  ],
  filter = (xyNum, diffXY) => true,
) {
  const points = [];
  const [xNum, yNum] = xyNum;
  referenceMatrix.some((diffXY) => {
    const xyNumCurr = [xNum + diffXY[0], yNum + diffXY[1]];
    const filterRet = filter(xyNumCurr, diffXY);
    if (filterRet === 'break') return false;
    if(filterRet) {
      points.push(xyNumCurr);
    }
  });
  return points;
}
