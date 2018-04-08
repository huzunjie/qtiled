/**  这里的坐标都是以1位单位，按四象限原点为(0, 0)为基准的   **/
/**  错列或偶数个元素基于原点排列，必然会出现0.5个位移的现象  **/
/**  这刚好保证了使用unit2pixel相关方法能换算到正确的像素值  **/

// 公布tiled基本工具方法
export * from './utils';

// 公布A*寻路
export searchPath from './astar';

export const version = process.env.PLAYER_VERSION;