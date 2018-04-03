/* 根据行列数设定，取得对应元坐标集合
* @param {Number}   column       列数
* @param {Number}   row          行数
* @param {Function} filter       过滤
* @param {Function} processor    加工：可以用于将单位为1的坐标值换算为目标值或对象
* @return {Array} 生成的坐标集合
*/
export function getUnitsByRowCol (column = 1, row = 1, filter = (x, y)=>true, processor = (x, y)=>[x, y]) {
  const ret = [];
  const maxX = (column - 1) / 2;
  const maxY = (row - 1) / 2;
  for(let y = -maxY; y <= maxY; y++) {
    for(let x = -maxX; x <= maxX; x++) {
      filter(x, y, maxX, maxY) && ret.push(processor(x, y, maxX, maxY));
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
export function getNeighbourUnitsByRowCol (column = 1, row = 1, filter = (x, y)=>true, processor = (x, y)=>[x, y]) {
  return getUnitsByRowCol(
    column + 2,
    row + 2,
    (x, y, maxX, maxY)=>filter(x, y, maxX, maxY) && (Math.abs(x) === maxX || Math.abs(y) === maxY),
    processor
  );
};

/* 根据行列数设定，取得斜对角范围内的错列元坐标集合
* @param {Number}   column    列数
* @param {Number}   row       行数
* @param {Function} filter    过滤
* @return {Array} 生成的坐标集合
*/
export function getDiagonalUnitsByRowCol (column = 1, row = 1, filter = (x, y)=>true, processor = (x, y)=>[x, y]) {
  return getUnitsByRowCol(
    column,
    row,
    (x, y, maxX, maxY)=>filter(x, y, maxX, maxY) && Math.abs(x) / maxX + Math.abs(y) / maxY <= 1,
    processor
  );
}

/* 根据设定的起始点与结束点，取得这两点作为对角线对应矩形范围内的元坐标集合
* @param {Array}   startUnitXY  X、Y元坐标值
* @param {Array}   endUnitXY    X、Y元坐标值
* @return {Array}  元坐标集合
*/
export function getUnitsByDiagonal (startUnitXY = [], endUnitXY = []) {
  const [startX = 0, startY = 0] = startUnitXY;
  const [endX = 0, endY = 0] = endUnitXY;
  const minX = Math.min(startX, endX);
  const maxX = Math.max(startX, endX);
  const minY = Math.min(startY, endY);
  const maxY = Math.max(startY, endY);
  const ret = [];
  for(let x = minX; x <= maxX; x++) {
    for(let y = minY; y <= maxY; y++) {
      ret.push([x, y]);
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
  return unitXY.map((XY, i)=>XY * size[i] + originXY[i]);
}
// 精确到0.5个单位
function _half_precision(v){
  return Math.round(v*2)/2
}
/* 根据像素坐标、渲染宽高、原点像素坐标，取得元坐标
* @param {Array}   pixelXY   X、Y元坐标值
* @param {Array}   size     width, height 元素宽高值
* @param {Array}   originXY 基准像素点的X、Y像素坐标值
* @return {Array} x,y 对应的元坐标
*/
export function pixel2unit (pixelXY = [0, 0], size = [10, 10], originXY = [0, 0]) {
  return pixelXY.map((XY, i)=> _half_precision( (XY-originXY[i])/size[i] ) );
}

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
export function unit2rhombusPixel (unitXY = [0, 0], diagonal = [10, 10], originXY = [0, 0]) {
  const [X = 0, Y = 0] = unitXY;
  const [W = 10, H = 10] = diagonal;
  const [ox = 0, oy = 0] = originXY;

  // 45度变换
  const x = (X - Y) * sincos45;
  const y = (X + Y) * sincos45;

  // 变换后的元坐标换算为像素坐标
  const pixelX = x * unitDiff * W + ox;
  const pixelY = y * unitDiff * H + oy;

  return [pixelX, pixelY];
}

/* 根据像素坐标、菱形X-Y两个方向对角线长度、原点像素坐标，取得正菱形元坐标
* @param {Array}   pixelXY    X、Y 元坐标值
* @param {Array}   diagonal  x, y 轴对应对角线长度值
* @param {Array}   originXY  基准像素点的X、Y像素坐标值
* @return {Array}  x,y 对应元坐标值
*/
export function rhombusPixel2unit (pixelXY = [0, 0], diagonal = [10, 10], originXY = [0, 0]) {
  const [pixelX = 0, pixelY = 0] = pixelXY;
  const [W = 10, H = 10] = diagonal;
  const [ox = 0, oy = 0] = originXY;

  // 像素坐标换算为元坐标
  const uX = (pixelX - ox)/(unitDiff * W);
  const uY = (pixelY - oy)/(unitDiff * H);

  // 45度变换
  const unitX = _half_precision( (uX+ uY) / sincos45 /2 );
  const unitY =  _half_precision( uY / sincos45 - unitX );

  return [unitX, unitY];
}

/* 根据行列数设定，取得错列布局元坐标集合
* @param {Number}   column       列数
* @param {Number}   row          行数
* @param {Function} filter       过滤
* @param {Function} processor    加工：可以用于将单位为1的坐标值换算为目标值或对象
* @return {Array} 生成的坐标集合
*/
export function getStaggeredUnitsByRowCol (column = 1, row = 1, filter = (x, y)=>true, processor = (x, y)=>[x, y]) {
  const ret = [];
  const maxX = (column - 1) / 2;
  const maxY = (row - 1) / 2;
  const size = [1, 1];
  const [maxUnitX, maxUnitY] = rhombusPixel2unit([maxX, maxY],size);
  let line = 0;
  for(let y = 0; y <= maxY; y+=.5) {
    line ++;
    for(let x = (line%2==0?.5:0)-maxX; x <= maxX; x++) {
      const [unitX, unitY] = rhombusPixel2unit([x, y],size);
      filter(unitX, unitY, maxUnitX, maxUnitY, line) && ret.push(processor(unitX, unitY, maxUnitX, maxUnitY, line));
    }
  }
  return ret;
};
