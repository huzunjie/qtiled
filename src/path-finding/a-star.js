/* A*寻径
* @param {Array}                 startGrid              起点网格坐标，如：[gridX, gridY]
* @param {Array}                 endGrid                终点网格坐标，如：[gridX, gridY]
* @param {Function}              getNeighbors          需要外部传入获取邻居坐标的方法（等距、错列、正矩形方案不同）
*                                                      参数示例：(currentGrid = [gridX, gridY])
*                                                      需要返回邻居坐标值、权重的 tile 二维数组：[[gridX1, gridY1, cost1], [gridX2, gridY2, cost2], ...]
* @param {Number}                maximizable           最大可循环次数（默认为1e6，用于防止死循环）
* @return {Array} 匹配的路径集合或空数组
*/
export default function aStar(
  startGrid = [0, 0],
  endGrid = [0, 0],
  getNeighbors = (currentGrid) => [],
  maximizable = 1e6,
) {
  const path = [];
  const [startGridX, startGridY] = startGrid;
  const [endGridX, endGridY] = endGrid;
  const startPoint = [startGridX, startGridY, 0];
  let n = 0;
  // 起止点相同直接返回当前点
  if(startGridX === endGridX && startGridY === endGridY) {
    path.push(startPoint);
  } else {
    const parents = {};
    const costs = { [gridCoordToKey(startGrid)]: 0 };
    const openlist = [startPoint];
    while(openlist.length) {
      const currPoint = openlist.pop();
      const currCost = costs[gridCoordToKey(currPoint)];
      // 从邻居中查找可以更低成本通过的节点
      getNeighbors(currPoint).some(([gridX, gridY, cost]) => {
        const neighborKey = gridCoordToKey([gridX, gridY]);
        const oldCost = costs[neighborKey];
        const neiCost = Math.round((currCost + (cost || 1)) * 1e3) / 1e3;
        // 当前点通行成本还不如已经确定的成本低，那么舍弃路径方案
        if (oldCost !== undefined && neiCost >= oldCost) return;
        costs[neighborKey] = neiCost;
        parents[neighborKey] = currPoint;

        // 循环次数达到上限，抛出异常终止查找
        n++;
        if (n > maximizable) throw new Error('[pathFinding.aStar] The number of loops exceeds the maximum value:' + maximizable);
        const neiPoint = [gridX, gridY, neiCost];
        // 到达终点生成路径
        if(gridX === endGridX && gridY === endGridY) {
          path.push(neiPoint);
          // 回查链表得到完整路径数组
          let previousGrid = endGrid;
          while((previousGrid = parents[gridCoordToKey(previousGrid)])) {
            path.unshift(previousGrid);
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

function gridCoordToKey([gridX, gridY]) {
  return `${gridX}_${gridY}`;
}
