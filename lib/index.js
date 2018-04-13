
/**
 * qtiled v0.1.1
 * (c) 2018 huzunjie
 * Released under MIT
 */

'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var _slicedToArray = _interopDefault(require('babel-runtime/helpers/slicedToArray'));

/* 根据行列数设定，取得对应元坐标集合
* @param {Number}   column       列数
* @param {Number}   row          行数
* @param {Function} processor    加工：可以用于将单位为1的坐标值换算为目标值或对象
* @param {Function} filter       过滤
* @return {Array} 生成的坐标集合
*/
function getUnitsByRowCol() {
  var column = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 1;
  var row = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 1;
  var processor = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : function (xId, yId) {
    return [xId, yId];
  };
  var filter = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : function () {
    return true;
  };

  var ret = [];
  var halfCol = Math.round(column / 2);
  var halfRow = Math.round(row / 2);
  for (var x = 1; x <= column; x++) {
    var xId = x - halfCol;
    for (var y = 1; y <= row; y++) {
      var yId = y - halfRow;
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
  var column = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 1;
  var row = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 1;
  var processor = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : function (xId, yId) {
    return [xId, yId];
  };
  var filter = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : function () {
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
  var column = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 1;
  var row = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 1;
  var processor = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : function (xId, yId) {
    return [xId, yId];
  };
  var filter = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : function () {
    return true;
  };

  var halfCol = Math.round(column / 2) - column % 2;
  var halfRow = Math.round(row / 2) - row % 2;
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
  var startUnitXY = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];
  var endUnitXY = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];
  var processor = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : function (xId, yId) {
    return [xId, yId];
  };
  var filter = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : function () {
    return true;
  };

  var _startUnitXY = _slicedToArray(startUnitXY, 2),
      _startUnitXY$ = _startUnitXY[0],
      startX = _startUnitXY$ === undefined ? 0 : _startUnitXY$,
      _startUnitXY$2 = _startUnitXY[1],
      startY = _startUnitXY$2 === undefined ? 0 : _startUnitXY$2;

  var _endUnitXY = _slicedToArray(endUnitXY, 2),
      _endUnitXY$ = _endUnitXY[0],
      endX = _endUnitXY$ === undefined ? 0 : _endUnitXY$,
      _endUnitXY$2 = _endUnitXY[1],
      endY = _endUnitXY$2 === undefined ? 0 : _endUnitXY$2;

  var minX = Math.min(startX, endX);
  var maxX = Math.max(startX, endX);
  var minY = Math.min(startY, endY);
  var maxY = Math.max(startY, endY);
  var ret = [];
  for (var xId = minX; xId <= maxX; xId++) {
    for (var yId = minY; yId <= maxY; yId++) {
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
var oneArc = Math.PI / 180;
function rotateUnit() {
  var unitXY = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];
  var angle = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;

  var _unitXY = _slicedToArray(unitXY, 2),
      _unitXY$ = _unitXY[0],
      x = _unitXY$ === undefined ? 0 : _unitXY$,
      _unitXY$2 = _unitXY[1],
      y = _unitXY$2 === undefined ? 0 : _unitXY$2;

  // 角度转弧度


  var arc = angle * oneArc;
  // 弧度转正余弦(考虑浮点溢出精度问题，这里 *10 计算后使用 Math.round 取整回去)
  var sinv = Math.sin(arc) * 10;
  var cosv = Math.cos(arc) * 10;

  // 计算得到新坐标点
  return [Math.round(x * cosv - y * sinv) / 10, Math.round(x * sinv + y * cosv) / 10];
}

/* 根据元坐标、渲染宽高、原点像素坐标，取得矩形元素渲染时的像素坐标
* @param {Array}   unitXY   X、Y元坐标值
* @param {Array}   size     width, height 元素宽高值
* @param {Array}   originXY 基准像素点的X、Y像素坐标值
* @return {Array} x,y 对应的像素值
*/
function unit2pixel() {
  var unitXY = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [0, 0];
  var size = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [10, 10];
  var originXY = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : [0, 0];

  return unitXY.map(function (XY, i) {
    return _half_precision(XY * size[i] + originXY[i]);
  });
}
// 精确到0.5个单位
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
  var pixelXY = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [0, 0];
  var size = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [10, 10];
  var originXY = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : [0, 0];

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
var sqrt2 = Math.sqrt(2);
// 45度的正余弦值
var sincos45 = sqrt2 / 2;
// 元坐标45度变换后的差值补充
var unitDiff = -1 / sqrt2;
function unit2rhombusPixel() {
  var unitXY = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];
  var diagonal = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];
  var originXY = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : [];

  var _unitXY2 = _slicedToArray(unitXY, 2),
      _unitXY2$ = _unitXY2[0],
      X = _unitXY2$ === undefined ? 0 : _unitXY2$,
      _unitXY2$2 = _unitXY2[1],
      Y = _unitXY2$2 === undefined ? 0 : _unitXY2$2;

  var _diagonal = _slicedToArray(diagonal, 2),
      _diagonal$ = _diagonal[0],
      W = _diagonal$ === undefined ? 10 : _diagonal$,
      _diagonal$2 = _diagonal[1],
      H = _diagonal$2 === undefined ? 10 : _diagonal$2;

  var _originXY = _slicedToArray(originXY, 2),
      _originXY$ = _originXY[0],
      ox = _originXY$ === undefined ? 0 : _originXY$,
      _originXY$2 = _originXY[1],
      oy = _originXY$2 === undefined ? 0 : _originXY$2;

  // 45度变换


  var x = (X - Y) * sincos45;
  var y = (X + Y) * sincos45;

  // 变换后的元坐标换算为像素坐标
  var pixelX = _half_precision(x * unitDiff * W + ox);
  var pixelY = _half_precision(y * unitDiff * H + oy);

  return [pixelX, pixelY];
}

/* 根据像素坐标、菱形X-Y两个方向对角线长度、原点像素坐标，取得正菱形元坐标
* @param {Array}   pixelXY    X、Y 像素坐标值
* @param {Array}   diagonal  x, y 轴对应对角线长度值
* @param {Array}   originXY  基准像素点的X、Y像素坐标值
* @return {Array}  x,y 对应元坐标值
*/
function rhombusPixel2unit() {
  var pixelXY = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];
  var diagonal = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];
  var originXY = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : [];

  var _pixelXY = _slicedToArray(pixelXY, 2),
      _pixelXY$ = _pixelXY[0],
      pixelX = _pixelXY$ === undefined ? 0 : _pixelXY$,
      _pixelXY$2 = _pixelXY[1],
      pixelY = _pixelXY$2 === undefined ? 0 : _pixelXY$2;

  var _diagonal2 = _slicedToArray(diagonal, 2),
      _diagonal2$ = _diagonal2[0],
      W = _diagonal2$ === undefined ? 10 : _diagonal2$,
      _diagonal2$2 = _diagonal2[1],
      H = _diagonal2$2 === undefined ? 10 : _diagonal2$2;

  var _originXY2 = _slicedToArray(originXY, 2),
      _originXY2$ = _originXY2[0],
      ox = _originXY2$ === undefined ? 0 : _originXY2$,
      _originXY2$2 = _originXY2[1],
      oy = _originXY2$2 === undefined ? 0 : _originXY2$2;

  // 像素坐标换算为元坐标


  var uX = (pixelX - ox) / (unitDiff * W);
  var uY = (pixelY - oy) / (unitDiff * H);

  // 45度变换
  var unitX = _half_precision((uX + uY) / sincos45 / 2);
  var unitY = _half_precision(uY / sincos45 - unitX);

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
  var column = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 1;
  var row = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 1;
  var processor = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : function (x, y) {
    return [x, y];
  };
  var filter = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : function (x, y) {
    return true;
  };

  var ret = [];
  // const xIsSingle = column === 1;
  // const yIsSingle = row === 1;
  var minCol = -Math.floor(column / 2);
  var maxCol = column + minCol - 1;
  var minRow = -Math.floor(row / 2);
  var maxRow = row + minRow - 1;
  var size = [1, 1];
  var pos = [0, 0];
  for (var rowNum = minRow; rowNum <= maxRow; rowNum++) {
    var pxY = rowNum * 0.5;
    var isOdd = Math.abs(pxY % 1) === 0.5;
    // 奇数行右移，实现错列对齐
    var xDiff = isOdd ? 0.5 : 0;
    for (var colNum = minCol; colNum <= maxCol; colNum++) {
      var pxX = colNum + xDiff;

      var _rhombusPixel2unit = rhombusPixel2unit([pxX, pxY], size, pos),
          _rhombusPixel2unit2 = _slicedToArray(_rhombusPixel2unit, 2),
          xId = _rhombusPixel2unit2[0],
          yId = _rhombusPixel2unit2[1];
      // -del- 排除掉奇数末个，实现整齐效果 -del- ，不再干预、自行 filter
      // if (yIsSingle || xIsSingle || !isOdd || colNum !== maxCol) {


      filter(xId, yId, colNum, rowNum, minCol, minRow, maxCol, maxRow, column, row) && ret.push(processor(xId, yId, colNum, rowNum, minCol, minRow, maxCol, maxRow, column, row));
      // }
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
  var _ref = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [],
      _ref2 = _slicedToArray(_ref, 2),
      _ref2$ = _ref2[0],
      vX = _ref2$ === undefined ? 0 : _ref2$,
      _ref2$2 = _ref2[1],
      vY = _ref2$2 === undefined ? 0 : _ref2$2;

  var _ref3 = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [],
      _ref4 = _slicedToArray(_ref3, 2),
      _ref4$ = _ref4[0],
      w = _ref4$ === undefined ? 78 : _ref4$,
      _ref4$2 = _ref4[1],
      h = _ref4$2 === undefined ? 40 : _ref4$2;

  var _ref5 = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : [],
      _ref6 = _slicedToArray(_ref5, 2),
      _ref6$ = _ref6[0],
      oX = _ref6$ === undefined ? 0 : _ref6$,
      _ref6$2 = _ref6[1],
      oY = _ref6$2 === undefined ? 0 : _ref6$2;

  var halfW = w / 2;
  var halfH = h / 2;
  var y = Math.round(vY / halfH) * halfH;
  var x = Math.round(vX / w) * w;

  // 偶数行错列布局右移部分回填
  if (y % h === halfH) {
    // 鼠标位置大于半个则回移，小于半个则右移；保证在单元格内
    x += vX - x >= 0 ? halfW : -halfW;
  }
  return [x + oX, y + oY];
}

// 上下左右8个方位邻居单元的坐标差值及评分权重
var referenceArr = [[1, 0, 10], [0, 1, 10], [0, -1, 10], [-1, 0, 10], [-1, -1, 14], [-1, 1, 14], [1, -1, 14], [1, 1, 14]];

/* 在 N*N 的坐标系集合中以1为单位进行A*寻径
* @param {Array}   startUnitXY  X、Y元坐标值
* @param {Array}   endUnitXY  X、Y元坐标值
* @param {Function}  filter     自行过滤
*  比如已知当前坐标，可以根据坐标对应的精灵属性判断是否可穿越：
*  filter(x:当前位置X, y:当前位置Y, cost:位移成本(平移则为10、对角则为14), parentX:从哪个坐标过来的, parentY::从哪个坐标过来的)
* @return {Array} 匹配的路径集合或空数组
*/
// 上右下左8个方向相邻单元的差值及评分权重 - 方向优先级以列表次序为准（这里后续可以适度扩展动态优先级次序）
var astar = function () {
  var startUnitXY = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];
  var endUnitXY = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];
  var filter = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : function (xId, yId, cost, refX, refY) {
    return true;
  };

  // console.log(fromX + ',' + fromY, 'to', toX + ',' + toY);
  var _startUnitXY = _slicedToArray(startUnitXY, 2),
      _startUnitXY$ = _startUnitXY[0],
      fromX = _startUnitXY$ === undefined ? 0 : _startUnitXY$,
      _startUnitXY$2 = _startUnitXY[1],
      fromY = _startUnitXY$2 === undefined ? 0 : _startUnitXY$2;

  var _endUnitXY = _slicedToArray(endUnitXY, 2),
      _endUnitXY$ = _endUnitXY[0],
      toX = _endUnitXY$ === undefined ? 0 : _endUnitXY$,
      _endUnitXY$2 = _endUnitXY[1],
      toY = _endUnitXY$2 === undefined ? 0 : _endUnitXY$2;

  // 起止点相同直接返回当前点


  if (fromX === toX && fromY === toY) {
    return [startUnitXY];
  }
  // 排除不可能到达的点，避免死循环
  if (Math.abs(fromX % 1) !== Math.abs(toX % 1) || Math.abs(fromY % 1) !== Math.abs(toY % 1)) {
    return [];
  }
  var cost = {};
  var parentsPoints = {};

  cost[startUnitXY.join()] = 0;

  // const _limit = 0;
  function checker(x, y) {
    var eligiblePoints = [];
    var currentCost = cost[x + ',' + y];
    for (var refI = 0; refI < 8; refI++) {
      var ref = referenceArr[refI];
      var nextX = x + ref[0];
      var nextY = y + ref[1];
      var refCost = ref[2];
      var nextKey = nextX + ',' + nextY;
      var nextCost = cost[nextKey];
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

  var openlist = [startUnitXY];
  var path = [];
  while (openlist.length) {
    var curPoint = openlist.pop();
    var eligiblePoints = checker(curPoint[0], curPoint[1]);
    var epLen = eligiblePoints.length;
    for (var i = 0; i < epLen; i++) {
      var extPoint = eligiblePoints[i];
      // 到达终点生成路径
      if (extPoint[0] === toX && extPoint[1] === toY) {
        path.push(endUnitXY);
        var pathPoint = endUnitXY;
        // 回查到完整路径
        while (pathPoint[0] !== fromX || pathPoint[1] !== fromY) {
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

/**  这里的坐标都是以1位单位，按四象限原点为(0, 0)为基准的   **/
/**  错列或偶数个元素基于原点排列  **/

// 公布tiled基本工具方法
// 公布A*寻路
var version = '0.1.1';

exports.searchPath = astar;
exports.version = version;
exports.getUnitsByRowCol = getUnitsByRowCol;
exports.getNeighbourUnitsByRowCol = getNeighbourUnitsByRowCol;
exports.getDiagonalUnitsByRowCol = getDiagonalUnitsByRowCol;
exports.getUnitsByDiagonal = getUnitsByDiagonal;
exports.rotateUnit = rotateUnit;
exports.unit2pixel = unit2pixel;
exports._half_precision = _half_precision;
exports.pixel2unit = pixel2unit;
exports.unit2rhombusPixel = unit2rhombusPixel;
exports.rhombusPixel2unit = rhombusPixel2unit;
exports.getStaggeredUnitsByRowCol = getStaggeredUnitsByRowCol;
exports.staggeredUnitRound = staggeredUnitRound;
