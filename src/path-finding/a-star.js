import getNeighborsPoints from './neighbors';

const xyNum2Str = ([xNum, yNum]) => `${xNum}_${yNum}`;

/* A*寻径
* @param {Array}                 staXyNum           数据坐标值，如：[xNum, yNum]
* @param {Array}                 endXyNum           数据坐标值，如：[xNum, yNum]
* @param {Array || Function}     referenceMatrix    相邻元素差值矩阵，也就是[xNum, yNum, cost]与相邻坐标差集合，如：[[-1, -1, 1.414], [1, 1, 1], ...]
* @param {Function}              filterFun          自行过滤方法，参数示例：(xyNum = [xNum, yNum], xyDiff = [-1, -1])
* @return {Array} 匹配的路径集合或空数组
*/
export default function aStarPathFinding(
  staXyNum = [0, 0],
  endXyNum = [0, 0],
  referenceMatrix,
  filterFun = (xyNum, xyDiff) => true,
  maximizable = 1e6,
) {
  const path = [];
  const [staXNum, staYNum] = staXyNum;
  const [endXNum, endYNum] = endXyNum;
  const staPoint = [staXNum, staYNum, 0];
  let n = 0;
  // 起止点相同直接返回当前点
  if(staXNum === endXNum && staYNum === endYNum) {
    path.push(staPoint);
  } else {
    const refMatrixFun = referenceMatrix.constructor !== Function ? () => referenceMatrix : referenceMatrix;
    const parents = {};
    const costs = { [xyNum2Str(staXyNum)]: 0 };
    const openlist = [staPoint];
    while(openlist.length) {
      const currPoint = openlist.pop();
      const currCost = costs[xyNum2Str(currPoint)];
      // 从邻居中查找可以更低成本通过的节点
      getNeighborsPoints(currPoint, refMatrixFun(currPoint), (neiXyNum, xyDiff) => {
        if (!filterFun(neiXyNum, xyDiff)) return;
        const neiXYStr = xyNum2Str(neiXyNum);
        const oldCost = costs[neiXYStr];
        const neiCost = Math.round((currCost + (xyDiff[2] || 1)) * 1e3) / 1e3;
        if (oldCost !== undefined && neiCost >= oldCost) return;
        costs[neiXYStr] = neiCost;
        parents[neiXYStr] = currPoint;

        n++;
        if (n > maximizable) throw new Error('[aStarPathFinding] The number of loops exceeds the maximum value:' + maximizable);
        const [neiXNum, neiYNum] = neiXyNum;
        const neiPoint = [neiXNum, neiYNum, neiCost];
        // 到达终点生成路径
        if(neiXNum === endXNum && neiYNum === endYNum) {
          path.push(neiPoint);
          // 回查链表得到完整路径数组
          let prevXyNum = endXyNum;
          while((prevXyNum = parents[xyNum2Str(prevXyNum)])) {
            path.unshift(prevXyNum);
          }
          openlist.length = 0;
          return 'break';
        } else {
          // 没到达终点，将当前点放入开放点列表，继续查找
          openlist.unshift(neiPoint);
        }
      });
    }
  }
  return path.length ? path : null;
};
