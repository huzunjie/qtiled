import * as shapesFuns from './shapes';
export const shapes = shapesFuns;

/**  这里的坐标都是以1位单位，按四象限原点为(0, 0)为基准的   **/
/**  错列或偶数个元素基于原点排列  **/

// 公布tiled基本工具方法
export * from './utils';

// export * from './ellipse';
// export * from './polygon';

import astar from './astar';
// 公布A*寻路
export const searchPath = astar;

// 寻路
import * as pathFindingFuns from './path-finding';
export const pathFinding = pathFindingFuns;
