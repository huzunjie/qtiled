/* A*寻径（启发值为 0，按 Dijkstra 策略搜索）
* @param {Array}                 startGrid              起点网格坐标，如：[gridX, gridY]
* @param {Array}                 endGrid                终点网格坐标，如：[gridX, gridY]
* @param {Function}              getNeighbors          需要外部传入获取邻居坐标的方法（等距、错列、正矩形方案不同）
*                                                      参数示例：(currentGrid = [gridX, gridY])
*                                                      需要返回邻居坐标值、权重的 tile 二维数组：[[gridX1, gridY1, cost1], [gridX2, gridY2, cost2], ...]
*                                                      搜索期间邻接关系和权重固定，cost || 1 后为有限正数，累计运算不溢出
*                                                      每步累计成本保留三位小数，最优路径按此成本比较
* @param {Number}                maximizable           最大成本更新次数（默认为1e6，用于防止死循环）
* @return {Array|null} 匹配的路径集合或 null
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
      // 优先取累计成本最低的点，等成本时保持入队顺序
      let minIndex = 0;
      for (let i = 1; i < openlist.length; i++) {
        if (openlist[i][2] < openlist[minIndex][2]) minIndex = i;
      }
      const [currPoint] = openlist.splice(minIndex, 1);
      const [currGridX, currGridY, currCost] = currPoint;
      // 同一节点可能以更低成本重新入队，跳过旧记录
      if (currCost !== costs[gridCoordToKey(currPoint)]) continue;

      // 终点以最低成本出队后生成路径
      if(currGridX === endGridX && currGridY === endGridY) {
        // 回查链表得到完整路径数组，父节点均为已确认最低成本的点
        let previousGrid = currPoint;
        while(previousGrid) {
          path.push(previousGrid);
          previousGrid = parents[gridCoordToKey(previousGrid)];
        }
        return path.reverse();
      }

      // 从邻居中查找可以更低成本通过的节点
      getNeighbors(currPoint).forEach(([gridX, gridY, cost]) => {
        const neighborKey = gridCoordToKey([gridX, gridY]);
        const oldCost = costs[neighborKey];
        const neiCost = Math.round((currCost + (cost || 1)) * 1e3) / 1e3;
        // 当前点通行成本还不如已经确定的成本低，那么舍弃路径方案
        if (oldCost !== undefined && neiCost >= oldCost) return;
        costs[neighborKey] = neiCost;
        parents[neighborKey] = currPoint;

        // 成本更新次数超过上限，抛出异常终止查找
        n++;
        if (n > maximizable) throw new Error('[pathFinding.aStar] The number of loops exceeds the maximum value:' + maximizable);
        const neiPoint = [gridX, gridY, neiCost];
        // 将成本更新后的节点放入开放点列表，等待确认最低成本
        openlist.push(neiPoint);
      });
    }
  }
  return path.length ? path : null;
};

function gridCoordToKey([gridX, gridY]) {
  return `${gridX}_${gridY}`;
}
