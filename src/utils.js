/* 根据行列数设定，取得对应元坐标集合
* @param {Number}   column       列数
* @param {Number}   row          行数
* @param {Function} processor    加工：可以用于将单位为1的坐标值换算为目标值或对象
* @param {Function} filter       过滤
* @return {Array} 生成的坐标集合
*/
export function getUnitsByRowCol (column = 1, row = 1, processor = (xId, yId)=>[xId, yId], filter = ()=>true) {
  const ret = [];
  const halfCol = Math.round(column / 2);
  const halfRow = Math.round(row / 2);
  for(let x = 1; x <= column; x++) {
    const xId = x - halfCol;
    for(let y = 1; y <= row; y++) {
      const yId = y - halfRow;
      filter(xId, yId, x, y, column, row) && ret.push(processor(xId, yId, x, y, column, row));
    }
  }
  return ret;
};

/* 根据行列数设定，取得与其最近的邻居元坐标集合
* @param {Number}   column    列数
* @param {Number}   row       行数
* @param {Function} filter    过滤
* @return {Array} 生成的坐标集合
*/
export function getNeighbourUnitsByRowCol (column = 1, row = 1, processor = (xId, yId)=>[xId, yId], filter = ()=>true) {
  return getUnitsByRowCol(
    column + 2,
    row + 2,
    processor,
    (xId, yId, x, y, column, row)=>filter(xId, yId, x, y, column, row) && (x === 1 || x === column || y === 1 || y === row)
  );
};

/* 根据斜对角元素数设定，取得斜对角范围内的错列元坐标集合（可用于将正规布局裁切掉四个角，生成菱形布局）
* @param {Number}   column    列数
* @param {Number}   row       行数
* @param {Function} filter    过滤
* @return {Array} 生成的坐标集合
*/
export function getDiagonalUnitsByRowCol (column = 1, row = 1, processor = (xId, yId)=>[xId, yId], filter = ()=>true) {
  const halfCol = Math.round(column / 2) - column % 2;
  const halfRow = Math.round(row / 2) - row % 2;
  return getUnitsByRowCol(
    column,
    row,
    processor,
    (xId, yId, x, y, column, row)=>filter(xId, yId, x, y, column, row) && Math.abs(xId) / halfCol + Math.abs(yId) / halfRow <= 1
  );
}

/* 根据设定的起始点与结束点，取得这两点作为对角线对应矩形范围内的元坐标集合
* @param {Array}   startUnitXY  X、Y元坐标值
* @param {Array}   endUnitXY    X、Y元坐标值
* @return {Array}  元坐标集合
*/
export function getUnitsByDiagonal (startUnitXY = [], endUnitXY = [], processor = (xId, yId)=>[xId, yId], filter = ()=>true) {
  const [startX = 0, startY = 0] = startUnitXY;
  const [endX = 0, endY = 0] = endUnitXY;
  const minX = Math.min(startX, endX);
  const maxX = Math.max(startX, endX);
  const minY = Math.min(startY, endY);
  const maxY = Math.max(startY, endY);
  const ret = [];
  for(let xId = minX; xId <= maxX; xId++) {
    for(let yId = minY; yId <= maxY; yId++) {
      filter(xId, yId, minX, minY, maxX, maxY, startUnitXY, endUnitXY) && ret.push(processor(xId, yId, minX, minY, maxX, maxY, startUnitXY, endUnitXY));
    }
  }
  return ret;
}

/* 根据设定角度，将指定的坐标绕原点旋转，并返回旋转后的坐标值
* @param {Array}   unitXY   X、Y元坐标值
* @param {Number}  angle    要旋转的角度值
* @return {Array}  旋转后的坐标值
*/
const oneArc = Math.PI / 180;
export function rotateUnit (unitXY = [], angle = 0) {
  const [x = 0, y = 0] = unitXY;

  // 角度转弧度
 const arc = angle * oneArc;
  // 弧度转正余弦(考虑浮点溢出精度问题，这里 *10 计算后使用 Math.round 取整回去)
  const sinv = Math.sin(arc) * 10;
  const cosv = Math.cos(arc) * 10;

  // 计算得到新坐标点
  return [Math.round(x * cosv - y * sinv) / 10, Math.round(x * sinv + y * cosv) / 10];
}

/* 根据元坐标、渲染宽高、原点像素坐标，取得矩形元素渲染时的像素坐标
* @param {Array}   unitXY   X、Y元坐标值
* @param {Array}   size     width, height 元素宽高值
* @param {Array}   originXY 基准像素点的X、Y像素坐标值
* @return {Array} x,y 对应的像素值
*/
export function unit2pixel (unitXY = [0, 0], size = [10, 10], originXY = [0, 0]) {
  return unitXY.map((XY, i)=>_half_precision(XY * size[i] + originXY[i]));
}
// 精确到0.5个单位
export function _half_precision (v) {
  return Math.round(v * 2) / 2;
}
/* 根据像素坐标、渲染宽高、原点像素坐标，取得元坐标
* @param {Array}   pixelXY   X、Y像素坐标值
* @param {Array}   size     width, height 元素宽高值
* @param {Array}   originXY 基准像素点的X、Y像素坐标值
* @return {Array} x,y 对应的元坐标
*/
export function pixel2unit (pixelXY = [0, 0], size = [10, 10], originXY = [0, 0]) {
  return pixelXY.map((XY, i)=> _half_precision((XY - originXY[i]) / size[i]));
}

/* 将像素坐标按照tile宽高取整
* @param {Array}   pixelXY  X、Y像素坐标值
* @param {Array}   size     width, height 元素宽高值
* @param {Array}   originXY 基准像素点的X、Y像素坐标值
* @return {Array} x,y 对应的元坐标
*/
/* export function pixelRound (pixelXY = [0, 0], size = [10, 10], originXY = [0, 0]) {
  return pixelXY.map((XY, i)=> _half_precision( (XY-originXY[i])/size[i] ) );
}
*/
/* 根据元坐标、菱形X-Y两个方向对角线长度、原点像素坐标，取得正菱形元素渲染时的像素坐标
* @param {Array}   unitXY    X、Y 元坐标值
* @param {Array}   diagonal  x, y 轴对应对角线长度值
* @param {Array}   originXY  基准像素点的X、Y像素坐标值
* @return {Array}  x,y 对应的像素值
*/
const sqrt2 = Math.sqrt(2);
// 45度的正余弦值
const sincos45 = sqrt2 / 2;
// 元坐标45度变换后的差值补充
const unitDiff = -1 / sqrt2;
export function unit2rhombusPixel (unitXY = [], diagonal = [], originXY = []) {
  const [X = 0, Y = 0] = unitXY;
  const [W = 10, H = 10] = diagonal;
  const [ox = 0, oy = 0] = originXY;

  // 45度变换
  const x = (X - Y) * sincos45;
  const y = (X + Y) * sincos45;

  // 变换后的元坐标换算为像素坐标
  const pixelX = _half_precision(x * unitDiff * W + ox);
  const pixelY = _half_precision(y * unitDiff * H + oy);

  return [pixelX, pixelY];
}

/* 根据像素坐标、菱形X-Y两个方向对角线长度、原点像素坐标，取得正菱形元坐标
* @param {Array}   pixelXY    X、Y 像素坐标值
* @param {Array}   diagonal  x, y 轴对应对角线长度值
* @param {Array}   originXY  基准像素点的X、Y像素坐标值
* @return {Array}  x,y 对应元坐标值
*/
export function rhombusPixel2unit (pixelXY = [], diagonal = [], originXY = []) {
  const [pixelX = 0, pixelY = 0] = pixelXY;
  const [W = 10, H = 10] = diagonal;
  const [ox = 0, oy = 0] = originXY;

  // 像素坐标换算为元坐标
  const uX = (pixelX - ox) / (unitDiff * W);
  const uY = (pixelY - oy) / (unitDiff * H);

  // 45度变换
  const unitX = _half_precision((uX + uY) / sincos45 / 2);
  const unitY = _half_precision(uY / sincos45 - unitX);

  return [unitX, unitY];
}

/* 根据行列数设定，取得错列布局元坐标集合
* @param {Number}   column       列数
* @param {Number}   row          行数
* @param {Function} filter       过滤
* @param {Function} processor    加工：可以用于将单位为1的坐标值换算为目标值或对象
* @return {Array} 生成的坐标集合
*/
export function getStaggeredUnitsByRowCol (column = 1, row = 1, processor = (x, y)=>[x, y], filter = (x, y)=>true) {
  const ret = [];
  const xIsSingle = column === 1;
  const halfX = _half_precision(column / 2) + (xIsSingle && row > 1 ? -0.5 : 0);
  const halfY = _half_precision(row / 2);
  const size = [1, 1];
  const pos = [0, 0];
  for(let yNum = 0; yNum < row; yNum++) {
    const y = _half_precision((yNum - halfY) / 2);
    const isEven = yNum % 2 === 0;
    // 偶数行右移，实现错列对齐
    const xDiff = isEven ? 0.5 : 0;
    for(let xNum = 0; xNum < column; xNum++) {
      const x = xNum + xDiff - halfX;
      const [unitX, unitY] = rhombusPixel2unit([x, y], size, pos);
      // 排除掉奇数第一个，实现整齐效果
      if(xIsSingle || isEven || xNum !== 0) {filter(unitX, unitY, xNum, yNum, column, row) && ret.push(processor(unitX, unitY, xNum, yNum, column, row));}
    }
  }
  return ret;
};

/* 将任意像素坐标按错列布局中单元格尺寸取整，对应到相应像素坐标
* @param {Array}    pos       像素坐标 x y 值
* @param {Array}    size      单元格宽高 w h 值
* @param {Array}    offsetPos 要累加到结果 x y 值上的偏移量
* @return {Array} 生成的坐标集合
*/
export function staggeredUnitRound ([vX = 0, vY = 0] = [], [w = 78, h = 40] = [], [oX = 0, oY = 0] = []) {
  const halfW = w / 2;
  const halfH = h / 2;
  const y = Math.round(vY / halfH) * halfH;
  let x = Math.round(vX / w) * w;

  // 偶数行错列布局右移部分回填
  if(y % h === halfH) {
    // 鼠标位置大于半个则回移，小于半个则右移；保证在单元格内
    x += (vX - x) >= 0 ? halfW : -halfW;
  }
  return [x + oX, y + oY];
}
