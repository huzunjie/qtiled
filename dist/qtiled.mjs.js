
/**
 * QTiled v0.2.0
 * (c) 2021 huzunjie
 * Released under MIT
 */

function _arrayWithHoles(arr) {
  if (Array.isArray(arr)) return arr;
}

function _iterableToArrayLimit(arr, i) {
  let _i = arr == null ? null : typeof Symbol !== 'undefined' && arr[Symbol.iterator] || arr['@@iterator'];

  if (_i == null) return;
  const _arr = [];
  let _n = true;
  let _d = false;

  let _s, _e;

  try {
    for (_i = _i.call(arr); !(_n = (_s = _i.next()).done); _n = true) {
      _arr.push(_s.value);

      if (i && _arr.length === i) break;
    }
  } catch (err) {
    _d = true;
    _e = err;
  } finally {
    try {
      if (!_n && _i['return'] != null) _i['return']();
    } finally {
      if (_d) throw _e;
    }
  }

  return _arr;
}

function _arrayLikeToArray(arr, len) {
  if (len == null || len > arr.length) len = arr.length;

  for (var i = 0, arr2 = new Array(len); i < len; i++) {
    arr2[i] = arr[i];
  }

  return arr2;
}

function _unsupportedIterableToArray(o, minLen) {
  if (!o) return;
  if (typeof o === 'string') return _arrayLikeToArray(o, minLen);
  let n = Object.prototype.toString.call(o).slice(8, -1);
  if (n === 'Object' && o.constructor) n = o.constructor.name;
  if (n === 'Map' || n === 'Set') return Array.from(o);
  if (n === 'Arguments' || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen);
}

function _nonIterableRest() {
  throw new TypeError('Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.');
}

function _slicedToArray(arr, i) {
  return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _unsupportedIterableToArray(arr, i) || _nonIterableRest();
}

/* 根据行列数设定，取得对应元坐标集合
* @param {Number}   column       列数
* @param {Number}   row          行数
* @param {Function} processor    加工：可以用于将单位为1的坐标值换算为目标值或对象
* @param {Function} filter       过滤
* @return {Array} 生成的坐标集合
*/
function getUnitsByRowCol() {
  const column = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 1;
  const row = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 1;
  const processor = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : function (xId, yId) {
    return [xId, yId];
  };
  const filter = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : function () {
    return true;
  };
  const ret = [];
  const halfCol = Math.round(column / 2);
  const halfRow = Math.round(row / 2);

  for (let x = 1; x <= column; x++) {
    const xId = x - halfCol;

    for (let y = 1; y <= row; y++) {
      const yId = y - halfRow;
      filter(xId, yId, x, y, column, row) && ret.push(processor(xId, yId, x, y, column, row));
    }
  }

  return ret;
}
/* 根据行列数设定，取得与其最近的邻居元坐标集合
* @param {Number}   column    列数
* @param {Number}   row       行数
* @param {Function} filter    过滤
* @return {Array} 生成的坐标集合
*/

function getNeighbourUnitsByRowCol() {
  const column = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 1;
  const row = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 1;
  const processor = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : function (xId, yId) {
    return [xId, yId];
  };
  const filter = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : function () {
    return true;
  };
  return getUnitsByRowCol(column + 2, row + 2, processor, function (xId, yId, x, y, column, row) {
    return filter(xId, yId, x, y, column, row) && (x === 1 || x === column || y === 1 || y === row);
  });
}
/* 根据斜对角元素数设定，取得斜对角范围内的错列元坐标集合（可用于将正规布局裁切掉四个角，生成菱形布局）
* @param {Number}   column    列数
* @param {Number}   row       行数
* @param {Function} filter    过滤
* @return {Array} 生成的坐标集合
*/

function getDiagonalUnitsByRowCol() {
  const column = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 1;
  const row = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 1;
  const processor = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : function (xId, yId) {
    return [xId, yId];
  };
  const filter = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : function () {
    return true;
  };
  const halfCol = Math.round(column / 2) - column % 2;
  const halfRow = Math.round(row / 2) - row % 2;
  return getUnitsByRowCol(column, row, processor, function (xId, yId, x, y, column, row) {
    return filter(xId, yId, x, y, column, row) && Math.abs(xId) / halfCol + Math.abs(yId) / halfRow <= 1;
  });
}
/* 根据设定的起始点与结束点，取得这两点作为对角线对应矩形范围内的元坐标集合
* @param {Array}   startUnitXY  X、Y元坐标值
* @param {Array}   endUnitXY    X、Y元坐标值
* @return {Array}  元坐标集合
*/

function getUnitsByDiagonal() {
  const startUnitXY = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];
  const endUnitXY = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];
  const processor = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : function (xId, yId) {
    return [xId, yId];
  };
  const filter = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : function () {
    return true;
  };

  const _startUnitXY = _slicedToArray(startUnitXY, 2);
      const _startUnitXY$ = _startUnitXY[0];
      const startX = _startUnitXY$ === void 0 ? 0 : _startUnitXY$;
      const _startUnitXY$2 = _startUnitXY[1];
      const startY = _startUnitXY$2 === void 0 ? 0 : _startUnitXY$2;

  const _endUnitXY = _slicedToArray(endUnitXY, 2);
      const _endUnitXY$ = _endUnitXY[0];
      const endX = _endUnitXY$ === void 0 ? 0 : _endUnitXY$;
      const _endUnitXY$2 = _endUnitXY[1];
      const endY = _endUnitXY$2 === void 0 ? 0 : _endUnitXY$2;

  const minX = Math.min(startX, endX);
  const maxX = Math.max(startX, endX);
  const minY = Math.min(startY, endY);
  const maxY = Math.max(startY, endY);
  const ret = [];

  for (let xId = minX; xId <= maxX; xId++) {
    for (let yId = minY; yId <= maxY; yId++) {
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
function rotateUnit() {
  const unitXY = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];
  const angle = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;

  const _unitXY = _slicedToArray(unitXY, 2);
      const _unitXY$ = _unitXY[0];
      const x = _unitXY$ === void 0 ? 0 : _unitXY$;
      const _unitXY$2 = _unitXY[1];
      const y = _unitXY$2 === void 0 ? 0 : _unitXY$2; // 角度转弧度

  const arc = angle * oneArc; // 弧度转正余弦(考虑浮点溢出精度问题，这里 *10 计算后使用 Math.round 取整回去)

  const sinv = Math.sin(arc) * 10;
  const cosv = Math.cos(arc) * 10; // 计算得到新坐标点

  return [Math.round(x * cosv - y * sinv) / 10, Math.round(x * sinv + y * cosv) / 10];
}
/* 根据元坐标、渲染宽高、原点像素坐标，取得矩形元素渲染时的像素坐标
* @param {Array}   unitXY   X、Y元坐标值
* @param {Array}   size     width, height 元素宽高值
* @param {Array}   originXY 基准像素点的X、Y像素坐标值
* @return {Array} x,y 对应的像素值
*/

function unit2pixel() {
  const unitXY = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [0, 0];
  const size = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [10, 10];
  const originXY = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : [0, 0];
  return unitXY.map(function (XY, i) {
    return _half_precision(XY * size[i] + originXY[i]);
  });
} // 精确到0.5个单位

function _half_precision(v) {
  return Math.round(v * 2) / 2;
}
/* 根据像素坐标、渲染宽高、原点像素坐标，取得元坐标
* @param {Array}   pixelXY   X、Y像素坐标值
* @param {Array}   size     width, height 元素宽高值
* @param {Array}   originXY 基准像素点的X、Y像素坐标值
* @return {Array} x,y 对应的元坐标
*/

function pixel2unit() {
  const pixelXY = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [0, 0];
  const size = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [10, 10];
  const originXY = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : [0, 0];
  return pixelXY.map(function (XY, i) {
    return _half_precision((XY - originXY[i]) / size[i]);
  });
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

const sqrt2 = Math.sqrt(2); // 45度的正余弦值

const sincos45 = sqrt2 / 2; // 元坐标45度变换后的差值补充

const unitDiff = -1 / sqrt2;
function unit2rhombusPixel() {
  const unitXY = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];
  const diagonal = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];
  const originXY = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : [];

  const _unitXY2 = _slicedToArray(unitXY, 2);
      const _unitXY2$ = _unitXY2[0];
      const X = _unitXY2$ === void 0 ? 0 : _unitXY2$;
      const _unitXY2$2 = _unitXY2[1];
      const Y = _unitXY2$2 === void 0 ? 0 : _unitXY2$2;

  const _diagonal = _slicedToArray(diagonal, 2);
      const _diagonal$ = _diagonal[0];
      const W = _diagonal$ === void 0 ? 10 : _diagonal$;
      const _diagonal$2 = _diagonal[1];
      const H = _diagonal$2 === void 0 ? 10 : _diagonal$2;

  const _originXY = _slicedToArray(originXY, 2);
      const _originXY$ = _originXY[0];
      const ox = _originXY$ === void 0 ? 0 : _originXY$;
      const _originXY$2 = _originXY[1];
      const oy = _originXY$2 === void 0 ? 0 : _originXY$2; // 45度变换

  const x = (X - Y) * sincos45;
  const y = (X + Y) * sincos45; // 变换后的元坐标换算为像素坐标

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

function rhombusPixel2unit() {
  const pixelXY = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];
  const diagonal = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];
  const originXY = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : [];

  const _pixelXY = _slicedToArray(pixelXY, 2);
      const _pixelXY$ = _pixelXY[0];
      const pixelX = _pixelXY$ === void 0 ? 0 : _pixelXY$;
      const _pixelXY$2 = _pixelXY[1];
      const pixelY = _pixelXY$2 === void 0 ? 0 : _pixelXY$2;

  const _diagonal2 = _slicedToArray(diagonal, 2);
      const _diagonal2$ = _diagonal2[0];
      const W = _diagonal2$ === void 0 ? 10 : _diagonal2$;
      const _diagonal2$2 = _diagonal2[1];
      const H = _diagonal2$2 === void 0 ? 10 : _diagonal2$2;

  const _originXY2 = _slicedToArray(originXY, 2);
      const _originXY2$ = _originXY2[0];
      const ox = _originXY2$ === void 0 ? 0 : _originXY2$;
      const _originXY2$2 = _originXY2[1];
      const oy = _originXY2$2 === void 0 ? 0 : _originXY2$2; // 像素坐标换算为元坐标

  const uX = (pixelX - ox) / (unitDiff * W);
  const uY = (pixelY - oy) / (unitDiff * H); // 45度变换

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

function getStaggeredUnitsByRowCol() {
  const column = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 1;
  const row = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 1;
  const processor = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : function (x, y) {
    return [x, y];
  };
  const filter = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : function (x, y) {
    return true;
  };
  const ret = []; // const xIsSingle = column === 1;
  // const yIsSingle = row === 1;

  const minCol = -Math.floor(column / 2);
  const maxCol = column + minCol - 1;
  const minRow = -Math.floor(row / 2);
  const maxRow = row + minRow - 1;
  const size = [1, 1];
  const pos = [0, 0];

  for (let rowNum = minRow; rowNum <= maxRow; rowNum++) {
    const pxY = rowNum * 0.5;
    const isOdd = Math.abs(pxY % 1) === 0.5; // 奇数行右移，实现错列对齐

    const xDiff = isOdd ? 0.5 : 0;

    for (let colNum = minCol; colNum <= maxCol; colNum++) {
      const pxX = colNum + xDiff;

      const _rhombusPixel2unit = rhombusPixel2unit([pxX, pxY], size, pos);
          const _rhombusPixel2unit2 = _slicedToArray(_rhombusPixel2unit, 2);
          const xId = _rhombusPixel2unit2[0];
          const yId = _rhombusPixel2unit2[1]; // -del- 排除掉奇数末个，实现整齐效果 -del- ，不再干预、自行 filter
      // if (yIsSingle || xIsSingle || !isOdd || colNum !== maxCol) {

      filter(xId, yId, colNum, rowNum, minCol, minRow, maxCol, maxRow, column, row) && ret.push(processor(xId, yId, colNum, rowNum, minCol, minRow, maxCol, maxRow, column, row)); // }
    }
  }

  return ret;
}
/*
export function getStaggeredUnitsByRowCol (column = 1, row = 1, processor = (x, y)=>[x, y], filter = (x, y)=>true) {
  const ret = [];
  const xIsSingle = column === 1;
  const halfX = Math.round(column / 2);
  const halfY = Math.round(row / 2);
  const size = [1, 1];
  const pos = [0, 0];
  for(let yNum = 1; yNum <= row; yNum++) {
    const pxY = ((yNum - halfY) / 2);
    const isOdd = yNum % 2 === 1;
    // 奇数行右移，实现错列对齐
    const xDiff = isOdd ? 0.5 : 0;
    for(let xNum = 0; xNum < column; xNum++) {
      const pxX = xNum + xDiff - halfX;
      let [xId, yId] = rhombusPixel2unit([pxX, pxY], size, pos);
      xId = Math.round(xId);
      yId = Math.round(yId);
      // 排除掉奇数第一个，实现整齐效果
      if(xIsSingle || isOdd || xNum !== 0) {filter(xId, yId, xNum, yNum, column, row) && ret.push(processor(xId, yId, xNum, yNum, column, row));}
    }
  }
  return ret;
};*/

/* 将任意像素坐标按错列布局中单元格尺寸取整，对应到相应像素坐标
* @param {Array}    pos       像素坐标 x y 值
* @param {Array}    size      单元格宽高 w h 值
* @param {Array}    offsetPos 要累加到结果 x y 值上的偏移量
* @return {Array} 生成的坐标集合
*/

function staggeredUnitRound() {
  const _ref = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];
      const _ref2 = _slicedToArray(_ref, 2);
      const _ref2$ = _ref2[0];
      const vX = _ref2$ === void 0 ? 0 : _ref2$;
      const _ref2$2 = _ref2[1];
      const vY = _ref2$2 === void 0 ? 0 : _ref2$2;

  const _ref3 = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];
      const _ref4 = _slicedToArray(_ref3, 2);
      const _ref4$ = _ref4[0];
      const w = _ref4$ === void 0 ? 78 : _ref4$;
      const _ref4$2 = _ref4[1];
      const h = _ref4$2 === void 0 ? 40 : _ref4$2;

  const _ref5 = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : [];
      const _ref6 = _slicedToArray(_ref5, 2);
      const _ref6$ = _ref6[0];
      const oX = _ref6$ === void 0 ? 0 : _ref6$;
      const _ref6$2 = _ref6[1];
      const oY = _ref6$2 === void 0 ? 0 : _ref6$2;

  const halfW = w / 2;
  const halfH = h / 2;
  const y = Math.round(vY / halfH) * halfH;
  let x = Math.round(vX / w) * w; // 偶数行错列布局右移部分回填

  if (y % h === halfH) {
    // 鼠标位置大于半个则回移，小于半个则右移；保证在单元格内
    x += vX - x >= 0 ? halfW : -halfW;
  }

  return [x + oX, y + oY];
}

/* 椭圆形 */
const PI = Math.PI; // π；180度对应的弧度值

const PI_DBL = PI * 2; // 2 倍的 π；360度对应的弧度值

const PI_HALF = PI / 2; // 一半的 π；90度对应的弧度值

const PI_OPF = PI + PI_HALF; // 1.5 倍的π One point five；270度对应弧度值

const PI_OA = PI / 180; // One Angle 1角度换算为弧度值

/* 角度转弧度
* @param {Number}  angle    角度值 0 ~ 360+N
* @return {Number} 弧度值
*/

function angle2Radian() {
  const angle = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 0;
  return angle * PI_OA;
}
/* 弧度转角度
* @param {Number}  radian    弧度值 0 ~ PI*N
* @return {Number} 角度值
*/

function radian2Angle() {
  const radian = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 0;
  return radian / PI_OA;
}
/* 根据椭圆的原点、X轴半径、Y轴半径、旋转弧度，求得圆周上的点坐标
* @param  {Number}  x0        圆心X点坐标值
* @param  {Number}  y0        圆心Y点坐标值
* @param  {Number}  radiusX   X轴半径值
* @param  {Number}  radiusY   Y轴半径值
* @param  {Number}  radian    旋转弧度值
* @return {Array}   [x, y]
*/

function getEllipsePoint(x0, y0, radiusX, radiusY, radian) {
  radian %= PI_DBL;
  if (radian < 0) radian += PI_DBL; // 第一或第四象限取正、其他象限取负

  const d = radian <= PI_HALF || radian > PI_OPF ? 1 : -1;
  const k = Math.tan(radian);
  const v = 1 / Math.pow(radiusX, 2) + Math.pow(k, 2) / Math.pow(radiusY, 2);
  const x = d * Math.sqrt(1 / v) + x0;
  return [x, k * x + y0 - k * x0];
}
/* 根据椭圆的原点、X轴半径、Y轴半径、旋转角度，求得圆周上的点坐标
* @param  {Number}  x0        圆心X点坐标值
* @param  {Number}  y0        圆心Y点坐标值
* @param  {Number}  radiusX   X轴半径值
* @param  {Number}  radiusY   Y轴半径值
* @param  {Number}  angle     旋转角度值
* @return {Array}   [x, y]
*/

function getEllipsePointByAngle(x0, y0, radiusX, radiusY, angle) {
  return getEllipsePoint(x0, y0, radiusX, radiusY, angle2Radian(angle));
}

function _arrayWithoutHoles(arr) {
  if (Array.isArray(arr)) return _arrayLikeToArray(arr);
}

function _iterableToArray(iter) {
  if (typeof Symbol !== 'undefined' && iter[Symbol.iterator] != null || iter['@@iterator'] != null) return Array.from(iter);
}

function _nonIterableSpread() {
  throw new TypeError('Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.');
}

function _toConsumableArray(arr) {
  return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _unsupportedIterableToArray(arr) || _nonIterableSpread();
}

/* 多边形相关配置及方法 */
// 基础配置参数
const HALF = 0.5;
const FLAH = -HALF;
const QUAR = 0.25; // 四分之一

const RAUQ = -QUAR;
const TQUA = 1 - QUAR; // 正六边形两行重合部分高度
// 正矩形顶点集合

const rectPoints = [[FLAH, FLAH], [HALF, FLAH], [HALF, HALF], [FLAH, HALF]];
/* 根据计划渲染后的正矩形宽高值，得到顶点坐标集合
* @param  {Number}  width    宽度
* @param  {Number}  height   高度
* @return {Array}   [[x, y], ...]
*/

function getRectPoints() {
  const width = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 1;
  const height = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 1;
  return getPolygonPoints(rectPoints, width, height);
}
/* 得到一组矩形地图瓦片的坐标偏移位置集合
 * @param  {Array}   mainAxisRange  主轴行序号区间，如：[0, 0]
 * @param  {Array}   subAxisRange   副轴行序号区间，如：[0, 0]
 * @param  {Array}   tileSize       单瓦片图宽高值，如：[80, 40]
 * @param  {String}  renderOrder    渲染方向：['RightDown','RightUp', 'LeftDown', 'LeftUp']；默认为 'RightDown'
 * @return {Array}   [[x, y], ...]
 */

function getRectPositions() {
  const mainAxisRange = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [0, 0];
  const subAxisRange = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [0, 0];
  const tileSize = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : [8, 4];
  const renderOrder = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 'RightDown';
  return getTilesPositions(1, mainAxisRange, subAxisRange, tileSize, 'none', renderOrder);
} // 正菱形顶点集合

const rhombusPoints = [[0, FLAH], [HALF, 0], [0, HALF], [FLAH, 0]];
/* 根据计划渲染的菱形宽高值，得到顶点坐标集合
* @param  {Number}  width    宽度
* @param  {Number}  height   高度
* @return {Array}   [[x, y], ...]
*/

function getRhombusPoints() {
  const width = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 1;
  const height = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 1;
  return getPolygonPoints(rhombusPoints, width, height);
}
/* 得到一组错列布局菱形地图瓦片的坐标偏移位置集合
 * @param  {Array}   mainAxisRange  主轴行序号区间，如：[0, 0]
 * @param  {Array}   subAxisRange   副轴行序号区间，如：[0, 0]
 * @param  {Array}   tileSize       单瓦片图宽高值，如：[80, 40]
 * @param  {String}  stagger        需要挫列的行：['odd', 'even', 'none']；默认为 'odd' 奇数行错开（通常第一行是0行）
 * @param  {String}  renderOrder    渲染方向：['RightDown','RightUp', 'LeftDown', 'LeftUp']；默认为 'RightDown'
 * @return {Array}   [[x, y], ...]
 */

function getRhombusPositions() {
  const mainAxisRange = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [0, 0];
  const subAxisRange = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [0, 0];
  const tileSize = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : [8, 4];
  const renderOrder = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 'RightDown';
  const stagger = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : 'odd';
  return getTilesPositions(HALF, mainAxisRange, subAxisRange, tileSize, stagger, renderOrder);
}
/* 得到一组等距正菱形地图瓦片的坐标偏移位置集合
 * @param  {Array}   mainAxisRange  主轴行序号区间，如：[0, 0]
 * @param  {Array}   subAxisRange   副轴行序号区间，如：[0, 0]
 * @param  {Array}   tileSize       单瓦片图宽高值，如：[80, 40]
 * @param  {String}  stagger        需要挫列的行：['odd', 'even', 'none']；默认为 'odd' 奇数行错开（通常第一行是0行）
 * @param  {String}  renderOrder    渲染方向：['RightDown','RightUp', 'LeftDown', 'LeftUp']；默认为 'RightDown'
 * @return {Array}   [[x, y]...]
 */

function getIsometricRhombusPositions() {
  const mainAxisRange = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [0, 0];
  const subAxisRange = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [0, 0];
  const tileSize = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : [8, 4];
  const renderOrder = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 'RightDown';
  const halfWidth = tileSize[0] / 2;
  const halfHeight = tileSize[1] / 2;
  return twoDimForEach(mainAxisRange, subAxisRange, renderOrder, function (m, s) {
    return [(m + s) * halfWidth, (s - m) * halfHeight, m, s];
  });
} // 正六边形顶点集合（上下为尖）

const hexagonPoints = [[0, FLAH], [HALF, RAUQ], [HALF, QUAR], [0, HALF], [FLAH, QUAR], [FLAH, RAUQ]];
/* 根据计划渲染的六边形宽高值得到顶点坐标集
* @param  {Number}  width    宽度
* @param  {Number}  height   高度
* @param  {String}  axis     主轴方向 'x' || 'y'；默认为 'y'，上下是尖
* @return {Array}   [[x, y], ...]
*/

function getHexagonPoints() {
  const width = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 1;
  const height = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 1;
  const axis = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 'y';
  return getPolygonPoints(hexagonPoints, width, height, axis);
}
/* 得到一组错列布局六边形地图瓦片的坐标偏移位置集合
 * @param  {Array}   mainAxisRange  主轴行序号区间，如：[0, 0]
 * @param  {Array}   subAxisRange   副轴行序号区间，如：[0, 0]
 * @param  {Array}   tileSize       单瓦片图宽高值，如：[80, 40]
 * @param  {String}  stagger        需要挫列的行：['odd', 'even', 'none']；默认为 'odd' 奇数行错开（通常第一行是0行）
 * @param  {String}  renderOrder    渲染方向：['RightDown','RightUp', 'LeftDown', 'LeftUp']；默认为 'RightDown'
 * @return {Array}   [[x, y], ...]
 */

function getHexagonPositions() {
  const mainAxisRange = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [0, 0];
  const subAxisRange = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [0, 0];
  const tileSize = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : [8, 4];
  const renderOrder = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 'RightDown';
  const stagger = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : 'odd';
  return getTilesPositions(TQUA, mainAxisRange, subAxisRange, tileSize, stagger, renderOrder);
}
/* 得到一个多边形折线顶点坐标集合
 * @param  {Array}     basePoints    多边形顶点配置，如上文的: rhombusPoints
 * @param  {Number}    width         渲染时的宽度值
 * @param  {Number}    height        渲染时的高度值
 * @param  {String}    axis          主轴方向 'x' || 'y'；默认为 'y'，上下是尖
 * @return {Array}     [x, y]
 */

function getPolygonPoints(basePoints) {
  const width = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 1;
  const height = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 1;
  const axis = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 'y';

  let fun = function fun(_ref) {
    const _ref2 = _slicedToArray(_ref, 2);
        const x = _ref2[0];
        const y = _ref2[1];

    return [x * width, y * height];
  }; // 如果是要将多边形图案横过来的，旋转90度（六边形会比较大的不同）

  if (axis === 'x') {
    fun = function fun(_ref3) {
      const _ref4 = _slicedToArray(_ref3, 2);
          const x = _ref4[0];
          const y = _ref4[1];

      return [y * width, x * height];
    };
  }

  return basePoints.map(fun);
}

function _for(min, max, iterator) {
  for (let i = min; i <= max; i++) {
    iterator(i);
  }
}

const forEachConfs = {
  RightDown: function RightDown() {
    const minX = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 0;
    const maxX = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;
    const minY = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;
    const maxY = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 0;
    const iterator = arguments.length > 4 ? arguments[4] : undefined;

    _for(minX, maxX, function (x) {
      return _for(minY, maxY, function (y) {
        return iterator(x, y);
      });
    });
  },
  RightUp: function RightUp() {
    const minX = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 0;
    const maxX = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;
    const minY = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;
    const maxY = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 0;
    const iterator = arguments.length > 4 ? arguments[4] : undefined;

    _for(minX, maxX, function (x) {
      return _for(-maxY, -minY, function (y) {
        return iterator(x, y);
      });
    });
  },
  LeftDown: function LeftDown() {
    const minX = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 0;
    const maxX = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;
    const minY = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;
    const maxY = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 0;
    const iterator = arguments.length > 4 ? arguments[4] : undefined;

    _for(-maxX, -minX, function (x) {
      return _for(minY, maxY, function (y) {
        return iterator(x, y);
      });
    });
  },
  LeftUp: function LeftUp() {
    const minX = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 0;
    const maxX = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;
    const minY = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;
    const maxY = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 0;
    const iterator = arguments.length > 4 ? arguments[4] : undefined;

    _for(-maxX, -minX, function (x) {
      return _for(-maxY, -minY, function (y) {
        return iterator(x, y);
      });
    });
  }
};
/* 按renderOrder循环遍历主副轴二维数组
 * @param  {Array}     mainAxisRange  主轴总行数
 * @param  {Array}     subAxisRange   副轴总行数
 * @param  {String}    renderOrder    渲染方向：['RightDown','RightUp', 'LeftDown', 'LeftUp']；默认为 'RightDown'
 * @param  {Function}  iterator    迭代函数，如：(x, y) => [x, y]
 * @return {Array}    [x, y]
 */

function twoDimForEach() {
  const mainAxisRange = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [0, 0];
  const subAxisRange = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [0, 0];
  const renderOrder = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 'RightDown';
  const iterator = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : function (x, y) {
    return [x, y];
  };
  const forEachFun = forEachConfs[renderOrder] || forEachConfs.RightDown;
  const retArr = [];
  forEachFun.apply(void 0, _toConsumableArray(mainAxisRange).concat(_toConsumableArray(subAxisRange), [function (x, y) {
    return retArr.push(iterator(x, y));
  }]));
  return retArr;
} // 根据偏移行设定，计算偏移量的方法集

const staggerConfs = {
  none: function none(m) {
    return m;
  },
  def: function def(m, s, rem, minS) {
    return Math.round(s - minS) % 2 === rem ? m + HALF : m;
  }
};
/* 得到一组错列布局正多边形地图Tile的坐标偏移位置集合
 * @param  {Number}  offsetRate     偏移量比率
 * @param  {Array}   mainAxisRange  主轴行序号区间，如：[0, 0]
 * @param  {Array}   subAxisRange   副轴行序号区间，如：[0, 0]
 * @param  {Array}   tileSize       单瓦片图宽高值，如：[80, 40]
 * @param  {String}  stagger        需要挫列的行：['odd', 'even', 'none']；默认为 'odd' 奇数行错开（通常第一行是0行）
 * @param  {String}  renderOrder    渲染方向：['RightDown','RightUp', 'LeftDown', 'LeftUp']；默认为 'RightDown'
 * @return {Array}   [[x, y], ...]
 */

function getTilesPositions() {
  const offsetRate = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 1;
  const mainAxisRange = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [0, 0];
  const subAxisRange = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : [0, 0];
  const tileSize = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : [8, 4];
  const stagger = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : 'odd';
  const renderOrder = arguments.length > 5 && arguments[5] !== undefined ? arguments[5] : 'RightDown';

  const _tileSize = _slicedToArray(tileSize, 2);
      const width = _tileSize[0];
      const _height = _tileSize[1]; // 多边形在主轴方向必须向上位移，才能保证挫列后网格对齐，所以这里要乘以 offsetRate

  const height = _height * offsetRate;
  const rem = Number(stagger === 'odd'); // 多边形错列布局副轴上需要偏移来达成错列布局

  const staggerFun = staggerConfs[stagger] || staggerConfs.def;
  const minS = subAxisRange[0];
  return twoDimForEach(mainAxisRange, subAxisRange, renderOrder, function (m, s) {
    return [staggerFun(m, s, rem, minS) * width, s * height, m, s];
  });
}

// 上下左右8个方位邻居单元的坐标差值及评分权重
const referenceArr = [[1, 0, 10], [0, 1, 10], [0, -1, 10], [-1, 0, 10], [-1, -1, 14], [-1, 1, 14], [1, -1, 14], [1, 1, 14]];

function astar () {
  const startUnitXY = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];
  const endUnitXY = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];
  const filter = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : function (xId, yId, cost, refX, refY) {
    return true;
  };

  // console.log(fromX + ',' + fromY, 'to', toX + ',' + toY);
  const _startUnitXY = _slicedToArray(startUnitXY, 2);
      const _startUnitXY$ = _startUnitXY[0];
      const fromX = _startUnitXY$ === void 0 ? 0 : _startUnitXY$;
      const _startUnitXY$2 = _startUnitXY[1];
      const fromY = _startUnitXY$2 === void 0 ? 0 : _startUnitXY$2;

  const _endUnitXY = _slicedToArray(endUnitXY, 2);
      const _endUnitXY$ = _endUnitXY[0];
      const toX = _endUnitXY$ === void 0 ? 0 : _endUnitXY$;
      const _endUnitXY$2 = _endUnitXY[1];
      const toY = _endUnitXY$2 === void 0 ? 0 : _endUnitXY$2; // 起止点相同直接返回当前点

  if (fromX === toX && fromY === toY) {
    return [startUnitXY];
  } // 排除不可能到达的点，避免死循环

  if (Math.abs(fromX % 1) !== Math.abs(toX % 1) || Math.abs(fromY % 1) !== Math.abs(toY % 1)) {
    return [];
  }

  const cost = {};
  const parentsPoints = {};
  cost[startUnitXY.join()] = 0; // const _limit = 0;

  function checker(x, y) {
    const eligiblePoints = [];
    const currentCost = cost[x + ',' + y];

    for (let refI = 0; refI < 8; refI++) {
      const ref = referenceArr[refI];
      const nextX = x + ref[0];
      const nextY = y + ref[1];
      const refCost = ref[2];
      const nextKey = nextX + ',' + nextY;
      const nextCost = cost[nextKey];

      if (filter(nextX, nextY, refCost, x, y) && (nextCost === undefined || currentCost + refCost < nextCost)) {
        cost[nextKey] = currentCost + refCost;
        parentsPoints[nextKey] = [x, y];
        eligiblePoints.push([nextX, nextY]);

        if (nextX === toX && nextY === toY) {
          break;
        }
      }
    }

    return eligiblePoints;
  }
  const openlist = [startUnitXY];
  const path = [];

  while (openlist.length) {
    const curPoint = openlist.pop();
    const eligiblePoints = checker(curPoint[0], curPoint[1]);
    const epLen = eligiblePoints.length;

    for (let i = 0; i < epLen; i++) {
      const extPoint = eligiblePoints[i]; // 到达终点生成路径

      if (extPoint[0] === toX && extPoint[1] === toY) {
        path.push(endUnitXY);
        let pathPoint = endUnitXY; // 回查到完整路径

        while (pathPoint[0] !== fromX || pathPoint[1] !== fromY) {
          pathPoint = parentsPoints[pathPoint.join()];
          path.unshift(pathPoint);
        } // console.log(JSON.stringify(path));

        return path;
      }

      openlist.unshift(extPoint);
    }
  }

  return path;
}

/**  这里的坐标都是以1位单位，按四象限原点为(0, 0)为基准的   **/

const searchPath = astar;

export { PI, PI_DBL, PI_HALF, PI_OA, PI_OPF, _half_precision, angle2Radian, getDiagonalUnitsByRowCol, getEllipsePoint, getEllipsePointByAngle, getHexagonPoints, getHexagonPositions, getIsometricRhombusPositions, getNeighbourUnitsByRowCol, getRectPoints, getRectPositions, getRhombusPoints, getRhombusPositions, getStaggeredUnitsByRowCol, getUnitsByDiagonal, getUnitsByRowCol, hexagonPoints, pixel2unit, radian2Angle, rectPoints, rhombusPixel2unit, rhombusPoints, rotateUnit, searchPath, staggeredUnitRound, twoDimForEach, unit2pixel, unit2rhombusPixel };
