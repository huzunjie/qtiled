/* A*寻径
* @param {Array}                 staXyNum              数据坐标值，如：[xNum, yNum]
* @param {Array}                 endXyNum              数据坐标值，如：[xNum, yNum]
* @param {Function}              getNeighbors          需要外部传入获取邻居坐标的方法（等距、错列、正矩形方案不同）
*                                                      参数示例：(currXyNum = [xNum, yNum])
*                                                      需要返回邻居坐标值、权重的tile二维数组：[[xNum1, yNum1, cost1], [xNum2, yNum2, cost2], ...]
* @param {Number}                maximizable           最大可循环次数（默认为1e6，用于防止死循环）
* @return {Array} 匹配的路径集合或空数组
*/
export default function aStar(
  staXyNum = [0, 0],
  endXyNum = [0, 0],
  getNeighbors = (currPointXyNum) => [],
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
    const costs = { [xyNum2Str(staXyNum)]: 0 };
    const openlist = [staPoint];
    while(openlist.length) {
      const currPoint = openlist.pop();
      const currCost = costs[xyNum2Str(currPoint)];
      // 从邻居中查找可以更低成本通过的节点
      getNeighbors(currPoint).some(([xNum, yNum, cost]) => {
        const neiXYStr = xyNum2Str([xNum, yNum]);
        const oldCost = costs[neiXYStr];
        const neiCost = Math.round((currCost + (cost || 1)) * 1e3) / 1e3;
        // 当前点通行成本还不如已经确定的成本低，那么舍弃路径方案
        if (oldCost !== undefined && neiCost >= oldCost) return;
        costs[neiXYStr] = neiCost;
        parents[neiXYStr] = currPoint;

        // 循环次数达到上限，抛出异常终止查找
        n++;
        if (n > maximizable) throw new Error('[pathFinding.aStar] The number of loops exceeds the maximum value:' + maximizable);
        const neiPoint = [xNum, yNum, neiCost];
        // 到达终点生成路径
        if(xNum === endXNum && yNum === endYNum) {
          path.push(neiPoint);
          // 回查链表得到完整路径数组
          let prevXyNum = endXyNum;
          while((prevXyNum = parents[xyNum2Str(prevXyNum)])) {
            path.unshift(prevXyNum);
          }
          openlist.length = 0;
          return false;
        } else {
          // 没到达终点，将当前点放入开放点列表，继续查找
          openlist.unshift(neiPoint);
        }
      });
    }
  }
  return path.length ? path : null;
};

function xyNum2Str([xNum, yNum]) {
  return `${xNum}_${yNum}`;
}
