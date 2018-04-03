/* 在 N*N 的坐标系集合中以1位单位进行A*寻径
* @param {Array}     startUnitXY  X、Y元坐标值
* @param {Array}     endUnitXY    X、Y元坐标值
* @param {Function}  filter       自行过滤
*    比如已知当前坐标，可以根据坐标对应的精灵属性判断是否可穿越：
*    filter(x:当前位置X, y:当前位置Y, cost:位移成本(平移则为10、对角则为14), parentX:从哪个坐标过来的, parentY::从哪个坐标过来的)
* @return {Array} 匹配的路径集合或空数组
*/
export default function (startUnitXY = [], endUnitXY = [], filter) {
    // console.log(fromX + ',' + fromY, 'to', toX + ',' + toY);
    let [fromX = 0, fromY = 0] = startUnitXY;
    let [toX = 0, toY = 0] = endUnitXY;

    // 起止点相同直接返回当前点
    if(fromX === toX && fromY === toY) {
        return [startUnitXY];
    }
    // 排除不可能到达的点，避免死循环
    if(Math.abs(fromX%1) !== Math.abs(toX%1) || Math.abs(fromY%1) !== Math.abs(toY%1)) {
        return [];
    }
    const cost = {};
    const parentsPoints = {};

    // 上右下左8个方向相邻单元的差值及评分权重 - 方向优先级以列表次序为准（这里后续可以适度扩展动态优先级次序）
    const referenceArr = [[1, 0, 10], [0, 1, 10], [0, -1, 10], [-1, 0, 10], [-1, -1, 14], [-1, 1, 14], [1, -1, 14], [1, 1, 14]];

    cost[startUnitXY.join()] = 0;

    // 允许用户设定筛查器；如果不设定或非function对象，则默认全量搜寻
    if(typeof (filter) !== 'function') {
      filter = _=>true;
    }
    function checker (x, y) {
        const eligiblePoints = [];
        const currentCost = cost[x + ',' + y];
        for(let refI = 0; refI < 8; refI++) {
            const ref = referenceArr[refI];
            const nextX = x + ref[0];
            const nextY = y + ref[1];
            const refCost = ref[2];
            const nextKey = nextX + ',' + nextY;
            const nextCost = cost[nextKey];
            if((filter(nextX, nextY, refCost, x, y) && (nextCost === undefined || currentCost + refCost < nextCost))) {
                cost[nextKey] = currentCost + refCost;
                parentsPoints[nextKey] = [x, y];
                eligiblePoints.push([nextX, nextY]);
                if(nextX === toX && nextY === toY) {
                    break;
                }
            }
        }
        return eligiblePoints;
    };

    const openlist = [ startUnitXY ];
    const path = [];
    while(openlist.length) {
        const curPoint = openlist.pop();
        const eligiblePoints = checker(curPoint[0], curPoint[1]);

        for(let i = 0; i < eligiblePoints.length; i++) {
            const extPoint = eligiblePoints[i];
            // 到达终点生成路径
            if(extPoint[0] === toX && extPoint[1] === toY) {
                path.push(endUnitXY);
                let pathPoint = endUnitXY;
                // 回查到完整路径
                while(pathPoint[0] !== fromX || pathPoint[1] !== fromY) {
                    pathPoint = parentsPoints[pathPoint.join()];
                    path.unshift(pathPoint);
                }
                // console.log(JSON.stringify(path));
                return path;
            }
            openlist.unshift(extPoint);
        }
    }
    return path;
};
