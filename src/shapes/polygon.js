/* 二维多边形相关配置及基础方法 */

/* 基础配置参数（个别参数调整涉及算法变化，所以放全局配置，以示特殊）*/
export const HALF = 0.5;
export const FLAH = -HALF;
export const QUAR = 0.25; // 四分之一
export const RAUQ = -QUAR;
export const TQUA = 1 - QUAR; // 正六边形两行重合部分高度

/* 得到一个多边形折线顶点坐标集合
 * @param  {Array}     baseVertexes    多边形顶点配置，如上文的: rectVertexes
 * @param  {Number}    width         渲染时的宽度值
 * @param  {Number}    height        渲染时的高度值
 * @param  {String}    axis          主轴方向 'x' || 'y'；默认为 'y'，上下是尖
 * @return {Array}     [x, y]
 */
export function getVertexes(baseVertexes, width = 1, height = 1, axis = 'y') {
  let fun = ([x, y]) => [x * width, y * height];
  // 如果是要将多边形图案横过来的，旋转90度（六边形会比较大的不同）
  if (axis === 'x') {
    fun = ([x, y]) => [y * width, x * height];
  }
  return baseVertexes.map(fun);
};

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
export function getPosition(lineRate = 1, xyNum = [0, 0], tileSize = [8, 4], stagger = 'none', originXY = [0, 0]) {
  const [width, height] = tileSize;
  const [xNum, yNum] = xyNum;
  return [
    // X轴按Y轴奇偶性补充错列偏移量
    originXY[0] + (xNum + (isStaggerLine(yNum, stagger) ? HALF : 0)) * width,
    // 多边形在主轴方向必须向上位移，才能保证挫列后网格对齐，所以这里要乘以 lineRate
    originXY[1] + yNum * height * lineRate,
    xNum,
    yNum
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
  const [width, _height] = tileSize;
  // 多边形在主轴方向必须向上位移，才能保证挫列后网格对齐，所以这里要乘以 lineRate
  const height = _height * lineRate;
  const needOffset = stagger !== 'none';
  const isOddNum = Number(stagger === 'odd');
  // 多边形错列布局副轴上需要偏移来达成错列布局
  return twoDimForEach(mainAxisRange, subAxisRange, renderOrder, (mainAxisNum, subAxisNum) => {
    let lineRate = mainAxisNum;
    if (needOffset && Math.abs(Math.round(subAxisNum) % 2) === isOddNum) {
      lineRate += HALF; // 补充错列偏移量
    }
    return [
      lineRate * width,
      subAxisNum * height,
      mainAxisNum,
      subAxisNum
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
  const [width, height] = tileSize;
  const lineHeight = height * lineRate; // 行高
  const dotX = pos[0] - originX;
  const dotY = pos[1] - originY;
  // 多边形错列布局需要补充偏移量
  let xNumOffset = 0;
  const yNum = Math.round(dotY / lineHeight);
  if (stagger !== 'none' && Math.abs(yNum % 2) === Number(stagger === 'odd')) {
    xNumOffset = HALF;
  }
  const xNum = Math.round(dotX / width - xNumOffset);
  const centerX = (xNum + xNumOffset) * width;
  const centerY = yNum * lineHeight;
  const tileX = centerX + originX;
  const tileY = centerY + originY;
  return [ xNum, yNum, tileX, tileY ];
}
