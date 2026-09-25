/* 二维多边形相关配置及基础方法 */

/* 基础配置参数（个别参数调整涉及算法变化，所以放全局配置，以示特殊）*/
export const HALF = 0.5;
export const FLAH = -HALF;
export const QUAR = 0.25; // 四分之一
export const RAUQ = -QUAR;
export const TQUA = 1 - QUAR; // 正六边形两行重合部分高度

/* 按距离筛选邻居的类型配置 */
export const neighborTypes = {
  all: (offsetX, offsetY) => [offsetX, offsetY],
  no_self: (offsetX, offsetY) => offsetX === 0 && offsetY === 0 ? false : [offsetX, offsetY],
  border: (offsetX, offsetY, distance) => Math.abs(offsetX) === distance || Math.abs(offsetY) === distance ? [offsetX, offsetY] : false,
  vertex: (offsetX, offsetY, distance) => Math.abs(offsetX) === distance && Math.abs(offsetY) === distance ? [offsetX, offsetY] : false,
  // 筛选中心点处于外轮廓四条边中心点连线（菱形）区域之内的瓦片
  diamond: (offsetX, offsetY, distance) => Math.abs(offsetX) + Math.abs(offsetY) <= distance ? [offsetX, offsetY] : false,
};

/** 旋转选区并将包围盒中心格锚定到逻辑原点，供各布局的 getNeighborsByOffsets 使用。
 * @param {Array<Array<number>>} offsets 原始选区的逻辑坐标对，有限整数，默认 []；允许未居中，不接受像素坐标或错列行列差。
 * @param {number} quarterTurns 相对原始选区的旋转次数，有限整数，默认 0；每次顺时针 90°，负数逆时针，按 4 取模。
 * @returns {Array<Array<number>>} 相对焦点的整数偏移，保留顺序，不修改输入；空集合返回 []。
 * 顺时针按逻辑 X 向右、Y 向下定义，一次旋转为 [-y, x]；随后将中心格锚定到原点。
 * 奇数尺寸居中；偶数尺寸按方向选择中心格：
 * 0° 中心取整为 [floor, floor]，90° 为 [floor, ceil]，180° 为 [ceil, ceil]，270° 为 [ceil, floor]。
 * 对居中的 3×2 选区，焦点依次在上排、左列、下排、右列的中间；焦点不一定属于不规则选区。
 * 即使旋转次数为 0 也会重新居中；4 次恢复的是 0 次的锚定结果，不保留输入的整体平移。
 * 每次传入同一份原始选区和累计方向，不要把上次返回值作为下一次输入。
 * 本方法不接收世界坐标、不筛选边界或海拔；调用方将返回值映射到固定的 originGrid。
 */
export function rotateSelectionOffsets(offsets = [], quarterTurns = 0) {
  if (!offsets.length) return [];
  const turns = ((quarterTurns % 4) + 4) % 4;
  const { minX, minY, maxX, maxY } = getBounds(offsets);
  const centerX = (minX + maxX) * HALF;
  const centerY = (minY + maxY) * HALF;
  // 90°/270° 交换坐标轴，方向决定各轴符号；包围盒中心使用同一变换。
  const swapAxes = turns % 2;
  const signX = turns === 1 || turns === 2 ? -1 : 1;
  const signY = turns >= 2 ? -1 : 1;
  const roundX = turns < 2 ? Math.floor : Math.ceil;
  const roundY = turns === 0 || turns === 3 ? Math.floor : Math.ceil;
  const anchorX = roundX(signX * (swapAxes ? centerY : centerX));
  const anchorY = roundY(signY * (swapAxes ? centerX : centerY));
  // 原点旋转与中心旋转只差整体平移，锚定时抵消；直接输出最终偏移，避免中间数组。
  return offsets.map(offset => [
    signX * offset[swapAxes ? 1 : 0] - anchorX || 0,
    signY * offset[swapAxes ? 0 : 1] - anchorY || 0,
  ]);
}

/* 得到一个多边形折线顶点坐标集合
 * @param  {Array}     baseVertexes    多边形顶点配置，如上文的: rectVertexes
 * @param  {Number}    width         渲染时的宽度值
 * @param  {Number}    height        渲染时的高度值
 * @param  {String}    axis          主轴方向 'x' || 'y'；默认为 'y'，上下是尖
 * @return {Array}     [x, y]
 */
export function getVertexes(baseVertexes, width = 1, height = 1, axis = 'y') {
  let fun = ([vertexX, vertexY]) => [vertexX * width, vertexY * height];
  // 如果是要将多边形图案横过来的，旋转90度（六边形会比较大的不同）
  if (axis === 'x') {
    fun = ([vertexX, vertexY]) => [vertexY * width, vertexX * height];
  }
  return baseVertexes.map(fun);
};

/* 计算一组共用顶点的多边形在平移后的轴对齐包围盒，不包含描边或文字。
 * @param {Array} positions 位置集合，每项为 [pixelX, pixelY, ...]，忽略附带的网格下标
 * @param {Array} vertexes 相对每个位置的共用顶点，默认 [[0, 0]]，仅计算位置范围
 * @return {Object|null} { minX, minY, maxX, maxY, width, height }；任一集合为空时返回 null
 * 输入为有限数值坐标，不修改输入；分别遍历位置和顶点，复杂度为 O(N + V)。
 */
export function getBounds(positions = [], vertexes = [[0, 0]]) {
  if (!positions.length || !vertexes.length) return null;
  const [positionBounds, vertexBounds] = [positions, vertexes].map(points => {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const [x, y] of points) {
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
    return { minX, minY, maxX, maxY };
  });
  const minX = positionBounds.minX + vertexBounds.minX;
  const minY = positionBounds.minY + vertexBounds.minY;
  const maxX = positionBounds.maxX + vertexBounds.maxX;
  const maxY = positionBounds.maxY + vertexBounds.maxY;
  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
}

function _for(min, max, cbk) {
  for (let i = min; i <= max; i++) cbk(i);
}
function for_(min, max, cbk) {
  for (let i = max; i >= min; i--) cbk(i);
}
const forEachConfs = {
  RightDown(minX = 0, maxX = 0, minY = 0, maxY = 0, cbk) {
    _for(minX, maxX, (x) => _for(minY, maxY, (y) => cbk(x, y)));
  },
  RightUp(minX = 0, maxX = 0, minY = 0, maxY = 0, cbk) {
    _for(minX, maxX, (x) => for_(minY, maxY, (y) => cbk(x, y)));
  },
  LeftDown(minX = 0, maxX = 0, minY = 0, maxY = 0, cbk) {
    for_(minX, maxX, (x) => _for(minY, maxY, (y) => cbk(x, y)));
  },
  LeftUp(minX = 0, maxX = 0, minY = 0, maxY = 0, cbk) {
    for_(minX, maxX, (x) => for_(minY, maxY, (y) => cbk(x, y)));
  }
};

/* 按renderOrder循环遍历主副轴二维数组
 * @param  {Array}     mainAxisRange  主轴总行数
 * @param  {Array}     subAxisRange   副轴总行数
 * @param  {String}    renderOrder    渲染方向：['RightDown','RightUp', 'LeftDown', 'LeftUp']；默认为 'RightDown'
 * @param  {Function}  iterator       迭代函数，如：(x, y) => [x, y]
 * @return {Array}    [x, y]
 */
export function twoDimForEach(mainAxisRange = [0, 0], subAxisRange = [0, 0], renderOrder = 'RightDown', iterator = (x, y) => [x, y]) {
  const forEachFun = forEachConfs[renderOrder] || forEachConfs.RightDown;
  const retArr = [];
  forEachFun(
    ...mainAxisRange,
    ...subAxisRange,
    (x, y) => {
      const ret = iterator(x, y);
      ret && retArr.push(ret);
    }
  );
  return retArr;
}

// 某行是否需要按全局错列配置错位排列
export function isStaggerLine(lineNum, stagger) {
  return stagger !== 'none' && Math.abs(Math.round(lineNum) % 2) === Number(stagger === 'odd');
}

/* 得到一个错列布局正多边形地图Tile的坐标值
 * @param  {Number}  lineRate       偏移量比率
 * @param  {Array}   xyNum          目标元素XY索引值，如：[0, 0]
 * @param  {Array}   tileSize       单瓦片图宽高值，如：[80, 40]
 * @param  {String}  stagger        需要挫列的行：['odd', 'even', 'none']；默认为 'odd' 奇数行错开（通常第一行是0行）
 * @param  {Array}   originXY       原点像素坐标值，如：[0, 0]
 * @return {Array}   [x, y, xNum, yNum]
 */
export function getPosition(lineRate = 1, gridCoord = [0, 0], tileSize = [8, 4], stagger = 'none', originXY = [0, 0]) {
  const [tileWidth, tileHeight] = tileSize;
  const [gridX, gridY] = gridCoord;
    return [
    // X轴按Y轴奇偶性补充错列偏移量
    originXY[0] + (gridX + (isStaggerLine(gridY, stagger) ? HALF : 0)) * tileWidth,
    // 多边形在主轴方向必须向上位移，才能保证挫列后网格对齐，所以这里要乘以 lineRate
    originXY[1] + gridY * tileHeight * lineRate,
    gridX,
    gridY
  ];
}

/* 得到一组错列布局正多边形地图Tile的坐标偏移位置集合
 * @param  {Number}  lineRate       主轴偏移量比率
 * @param  {Array}   mainAxisRange  主轴行序号区间，如：[0, 0]
 * @param  {Array}   subAxisRange   副轴行序号区间，如：[0, 0]
 * @param  {Array}   tileSize       单瓦片图宽高值，如：[80, 40]
 * @param  {String}  stagger        需要挫列的行：['odd', 'even', 'none']；默认为 'odd' 奇数行错开（通常第一行是0行）
 * @param  {String}  renderOrder    渲染方向：['RightDown','RightUp', 'LeftDown', 'LeftUp']；默认为 'RightDown'
 * @return {Array}   [[x, y, xNum, yNum], ...]
 */
export function getPositions(lineRate = 1, mainAxisRange = [0, 0], subAxisRange = [0, 0], tileSize = [8, 4], stagger = 'odd', renderOrder = 'RightDown') {
  const [tileWidth, rawTileHeight] = tileSize;
  // 多边形在主轴方向必须向上位移，才能保证挫列后网格对齐，所以这里要乘以 lineRate
  const tileHeight = rawTileHeight * lineRate;
  const needOffset = stagger !== 'none';
  const isOddNum = Number(stagger === 'odd');
  // 多边形错列布局副轴上需要偏移来达成错列布局
  return twoDimForEach(mainAxisRange, subAxisRange, renderOrder, (gridX, gridY) => {
    let offsetGridX = gridX;
    if (needOffset && Math.abs(Math.round(gridY) % 2) === isOddNum) {
      offsetGridX += HALF; // 补充错列偏移量
    }
    return [
      offsetGridX * tileWidth,
      gridY * tileHeight,
      gridX,
      gridY
    ];
  });
}

/* 通过大致的像素坐标值获取该位置tile元素的[xNum, yNum, x, y]
 * @param  {Number}  lineRate       主轴偏移量比率（错列行之间的Y主轴坐标差值与其在主轴行高的比值）
 * @param  {Array}   pos            目标点像素坐标值(相对于画布原点的偏移量)，如：[x<Number>, y<Number>]
 * @param  {Array}   originPos      地图起点元素渲染时像素坐标值，如：[x<Number>, y<Number>]
 * @param  {Array}   tileSize       单瓦片图宽高值，如：[80, 40]
 * @param  {String}  stagger        需要错列的行：['odd', 'even', 'none']；默认为 'odd' 奇数行错开（通常第一行是0行）
 * @return {Object}  {xNum, yNum, x, y}
 */
export function getInfoByPos(lineRate = 1, pos = [0, 0], originPos = [0, 0], tileSize = [8, 4], stagger = 'odd') {
  const [originX, originY] = originPos;
  const [tileWidth, tileHeight] = tileSize;
  const gridRowHeight = tileHeight * lineRate; // 行高
  const relativePixelX = pos[0] - originX;
  const relativePixelY = pos[1] - originY;
    // 多边形错列布局需要补充偏移量
  let gridXOffset = 0;
  const gridY = Math.round(relativePixelY / gridRowHeight);
  if (stagger !== 'none' && Math.abs(gridY % 2) === Number(stagger === 'odd')) {
    gridXOffset = HALF;
  }
  const gridX = Math.round(relativePixelX / tileWidth - gridXOffset);
  const centerPixelX = (gridX + gridXOffset) * tileWidth;
  const centerPixelY = gridY * gridRowHeight;
  const tilePixelX = centerPixelX + originX;
  const tilePixelY = centerPixelY + originY;
    return [gridX, gridY, tilePixelX, tilePixelY];
}
