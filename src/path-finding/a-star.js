import getNeighborsPoints from './neighbors';

/* A*寻径
* @param {Array}     staXyNum           数据坐标值，如：[xNum, yNum]
* @param {Array}     endXyNum           数据坐标值，如：[xNum, yNum]
* @param {Array}     referenceMatrix    相邻元素差值矩阵，也就是[xNum, yNum, cost]与相邻坐标差集合，如：[[-1, -1, 1.414], [1, 1, 1], ...]
* @param {Function}  filterFun          自行过滤方法，参数示例：(xyNum = [xNum, yNum], xyDiff = [-1, -1])
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
    const parents = {};
    const staXyStr = `${staXNum},${staYNum}`;
    const costs = { [staXyStr]: 0 };
    const openlist = [staPoint];
    // 防止重复判断
    while(openlist.length) {
      const currPoint = openlist.pop();
      const currCost = costs[`${currPoint[0]},${currPoint[1]}`];
      getNeighborsPoints(currPoint, referenceMatrix, (neiXyNum, xyDiff) => {
        if (!filterFun(neiXyNum, xyDiff)) return;
        const [neiXNum, neiYNum] = neiXyNum;
        const neiXYStr = `${neiXNum},${neiYNum}`;
        const oldCost = costs[neiXYStr];
        const neiCost = Math.round((currCost + (xyDiff[2] || 1)) * 1e3) / 1e3;
        if (oldCost !== undefined && neiCost >= oldCost) return;
        costs[neiXYStr] = neiCost;
        parents[neiXYStr] = currPoint;

        n++;
        if (n > maximizable) throw new Error('循环次数超过了 maximizable：' + maximizable);
        const neiPoint = [neiXNum, neiYNum, neiCost];
        // 到达终点生成路径
        if(neiXNum === endXNum && neiYNum === endYNum) {
          path.push(neiPoint);
          // 回查链表得到完整路径数组
          let prevXyNum = endXyNum;
          while((prevXyNum = parents[`${prevXyNum[0]},${prevXyNum[1]}`])) {
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

