
/**
 * qtiled v0.2.0
 * (c) 2008-2021 huzunjie
 * Released under MIT
 */

(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
  typeof define === 'function' && define.amd ? define(['exports'], factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.qtiled = {}));
}(this, (function (exports) { 'use strict';

  /* 椭圆形 */
  var PI = Math.PI; // π；180度对应的弧度值

  var PI_DBL = PI * 2; // 2 倍的 π；360度对应的弧度值

  var PI_HALF = PI / 2; // 一半的 π；90度对应的弧度值

  var PI_OPF = PI + PI_HALF; // 1.5 倍的π One point five；270度对应弧度值

  var PI_OA = PI / 180; // One Angle 1角度换算为弧度值

  /* 角度转弧度
  * @param {Number}  angle    角度值 0 ~ 360+N
  * @return {Number} 弧度值
  */

  function angle2Radian() {
    var angle = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 0;
    return angle * PI_OA;
  }
  /* 弧度转角度
  * @param {Number}  radian    弧度值 0 ~ PI*N
  * @return {Number} 角度值
  */

  function radian2Angle() {
    var radian = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 0;
    return radian / PI_OA;
  }
  /* 根据椭圆的原点、X轴半径、Y轴半径、弧度，求得圆周上的点坐标
  * @param  {Number}  x0        圆心X点坐标值
  * @param  {Number}  y0        圆心Y点坐标值
  * @param  {Number}  radiusX   X轴半径值
  * @param  {Number}  radiusY   Y轴半径值
  * @param  {Number}  radian    弧度值
  * @return {Array}   [x, y]
  */

  function getEllipsePoint(x0, y0, radiusX, radiusY, radian) {
    radian %= PI_DBL;
    if (radian < 0) radian += PI_DBL;
    var k = Math.tan(radian);

    if (Math.abs(k) > 1e5) {
      return [x0, y0 + (radian < PI ? radiusY : -radiusY)];
    } // 第一或第四象限取正、其他象限取负


    var d = radian <= PI_HALF || radian > PI_OPF ? 1 : -1;
    var v = 1 / Math.pow(radiusX, 2) + Math.pow(k, 2) / Math.pow(radiusY, 2);
    var x = d * Math.sqrt(1 / v) + x0;
    return [x, k * x + y0 - k * x0];
  }
  /* 根据椭圆的原点、X轴半径、Y轴半径、角度，求得圆周上的点坐标
  * @param  {Number}  x0        圆心X点坐标值
  * @param  {Number}  y0        圆心Y点坐标值
  * @param  {Number}  radiusX   X轴半径值
  * @param  {Number}  radiusY   Y轴半径值
  * @param  {Number}  angle     角度值
  * @return {Array}   [x, y]
  */

  function getEllipsePointByAngle(x0, y0, radiusX, radiusY, angle) {
    return getEllipsePoint(x0, y0, radiusX, radiusY, angle2Radian(angle));
  }
  /* 根据椭圆的X轴半径、Y轴半径、圆周等分数量、等分点序号、起始弧度，求得圆周上的点坐标
  * @param  {Number}  radiusX   X轴半径值
  * @param  {Number}  radiusY   Y轴半径值
  * @param  {Number}  count     圆周等分数量
  * @param  {Number}  num       圆周等分点序号
  * @param  {Number}  radian    起始弧度
  * @return {Array}   [x, y]
  */

  function getEllipseIsometryPoint(radiusX, radiusY, count, num) {
    var radian = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : 0;
    radian += PI_DBL * num / count;
    return [radiusX * Math.cos(radian), radiusY * Math.sin(radian)];
  }

  var ellipseFuns = /*#__PURE__*/Object.freeze({
    __proto__: null,
    PI: PI,
    PI_DBL: PI_DBL,
    PI_HALF: PI_HALF,
    PI_OPF: PI_OPF,
    PI_OA: PI_OA,
    angle2Radian: angle2Radian,
    radian2Angle: radian2Angle,
    getEllipsePoint: getEllipsePoint,
    getEllipsePointByAngle: getEllipsePointByAngle,
    getEllipseIsometryPoint: getEllipseIsometryPoint
  });

  function _arrayLikeToArray(arr, len) {
    if (len == null || len > arr.length) len = arr.length;

    for (var i = 0, arr2 = new Array(len); i < len; i++) {
      arr2[i] = arr[i];
    }

    return arr2;
  }

  function _arrayWithoutHoles(arr) {
    if (Array.isArray(arr)) return _arrayLikeToArray(arr);
  }

  function _iterableToArray(iter) {
    if (typeof Symbol !== "undefined" && iter[Symbol.iterator] != null || iter["@@iterator"] != null) return Array.from(iter);
  }

  function _unsupportedIterableToArray(o, minLen) {
    if (!o) return;
    if (typeof o === "string") return _arrayLikeToArray(o, minLen);
    var n = Object.prototype.toString.call(o).slice(8, -1);
    if (n === "Object" && o.constructor) n = o.constructor.name;
    if (n === "Map" || n === "Set") return Array.from(o);
    if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen);
  }

  function _nonIterableSpread() {
    throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
  }

  function _toConsumableArray(arr) {
    return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _unsupportedIterableToArray(arr) || _nonIterableSpread();
  }

  function _arrayWithHoles(arr) {
    if (Array.isArray(arr)) return arr;
  }

  function _iterableToArrayLimit(arr, i) {
    var _i = arr == null ? null : typeof Symbol !== "undefined" && arr[Symbol.iterator] || arr["@@iterator"];

    if (_i == null) return;
    var _arr = [];
    var _n = true;
    var _d = false;

    var _s, _e;

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
        if (!_n && _i["return"] != null) _i["return"]();
      } finally {
        if (_d) throw _e;
      }
    }

    return _arr;
  }

  function _nonIterableRest() {
    throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
  }

  function _slicedToArray(arr, i) {
    return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _unsupportedIterableToArray(arr, i) || _nonIterableRest();
  }

  /* 二维多边形相关配置及基础方法 */

  /* 基础配置参数（个别参数调整涉及算法变化，所以放全局配置，以示特殊）*/
  var HALF = 0.5;
  var FLAH = -HALF;
  var QUAR = 0.25; // 四分之一

  var RAUQ = -QUAR;
  var TQUA = 1 - QUAR; // 正六边形两行重合部分高度

  /* 得到一个多边形折线顶点坐标集合
   * @param  {Array}     baseVertexes    多边形顶点配置，如上文的: rectVertexes
   * @param  {Number}    width         渲染时的宽度值
   * @param  {Number}    height        渲染时的高度值
   * @param  {String}    axis          主轴方向 'x' || 'y'；默认为 'y'，上下是尖
   * @return {Array}     [x, y]
   */

  function getPolygonVertexes(baseVertexes) {
    var width = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 1;
    var height = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 1;
    var axis = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 'y';

    var fun = function fun(_ref) {
      var _ref2 = _slicedToArray(_ref, 2),
          x = _ref2[0],
          y = _ref2[1];

      return [x * width, y * height];
    }; // 如果是要将多边形图案横过来的，旋转90度（六边形会比较大的不同）


    if (axis === 'x') {
      fun = function fun(_ref3) {
        var _ref4 = _slicedToArray(_ref3, 2),
            x = _ref4[0],
            y = _ref4[1];

        return [y * width, x * height];
      };
    }

    return baseVertexes.map(fun);
  }

  function _for(min, max, cbk) {
    for (var i = min; i <= max; i++) {
      cbk(i);
    }
  }

  function for_(min, max, cbk) {
    for (var i = max; i >= min; i--) {
      cbk(i);
    }
  }

  var forEachConfs = {
    RightDown: function RightDown() {
      var minX = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 0;
      var maxX = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;
      var minY = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;
      var maxY = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 0;
      var cbk = arguments.length > 4 ? arguments[4] : undefined;

      _for(minX, maxX, function (x) {
        return _for(minY, maxY, function (y) {
          return cbk(x, y);
        });
      });
    },
    RightUp: function RightUp() {
      var minX = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 0;
      var maxX = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;
      var minY = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;
      var maxY = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 0;
      var cbk = arguments.length > 4 ? arguments[4] : undefined;

      _for(minX, maxX, function (x) {
        return for_(minY, maxY, function (y) {
          return cbk(x, y);
        });
      });
    },
    LeftDown: function LeftDown() {
      var minX = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 0;
      var maxX = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;
      var minY = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;
      var maxY = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 0;
      var cbk = arguments.length > 4 ? arguments[4] : undefined;
      for_(minX, maxX, function (x) {
        return _for(minY, maxY, function (y) {
          return cbk(x, y);
        });
      });
    },
    LeftUp: function LeftUp() {
      var minX = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 0;
      var maxX = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;
      var minY = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;
      var maxY = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 0;
      var cbk = arguments.length > 4 ? arguments[4] : undefined;
      for_(minX, maxX, function (x) {
        return for_(minY, maxY, function (y) {
          return cbk(x, y);
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
    var mainAxisRange = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [0, 0];
    var subAxisRange = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [0, 0];
    var renderOrder = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 'RightDown';
    var iterator = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : function (x, y) {
      return [x, y];
    };
    var forEachFun = forEachConfs[renderOrder] || forEachConfs.RightDown;
    var retArr = [];
    forEachFun.apply(void 0, _toConsumableArray(mainAxisRange).concat(_toConsumableArray(subAxisRange), [function (x, y) {
      return retArr.push(iterator(x, y));
    }]));
    return retArr;
  }
  /* 得到一组错列布局正多边形地图Tile的坐标偏移位置集合
   * @param  {Number}  offsetRate     偏移量比率
   * @param  {Array}   mainAxisRange  主轴行序号区间，如：[0, 0]
   * @param  {Array}   subAxisRange   副轴行序号区间，如：[0, 0]
   * @param  {Array}   tileSize       单瓦片图宽高值，如：[80, 40]
   * @param  {String}  stagger        需要挫列的行：['odd', 'even', 'none']；默认为 'odd' 奇数行错开（通常第一行是0行）
   * @param  {String}  renderOrder    渲染方向：['RightDown','RightUp', 'LeftDown', 'LeftUp']；默认为 'RightDown'
   * @return {Array}   [[x, y, xNum, yNum], ...]
   */

  function getPolygonPositions() {
    var offsetRate = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 1;
    var mainAxisRange = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [0, 0];
    var subAxisRange = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : [0, 0];
    var tileSize = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : [8, 4];
    var stagger = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : 'odd';
    var renderOrder = arguments.length > 5 && arguments[5] !== undefined ? arguments[5] : 'RightDown';

    var _tileSize = _slicedToArray(tileSize, 2),
        width = _tileSize[0],
        _height = _tileSize[1]; // 多边形在主轴方向必须向上位移，才能保证挫列后网格对齐，所以这里要乘以 offsetRate


    var height = _height * offsetRate;
    var needOffset = stagger !== 'none';
    var isOddNum = Number(stagger === 'odd'); // 多边形错列布局副轴上需要偏移来达成错列布局

    return twoDimForEach(mainAxisRange, subAxisRange, renderOrder, function (mainAxisNum, subAxisNum) {
      var offsetRate = mainAxisNum;

      if (needOffset && Math.abs(Math.round(subAxisNum) % 2) === isOddNum) {
        offsetRate += HALF; // 补充错列偏移量
      }

      return [offsetRate * width, subAxisNum * height, mainAxisNum, subAxisNum];
    });
  }
  /* 通过大致的像素坐标值获取该位置tile元素的[Num, yNum]
   * @param  {Array}   pos            目标点像素坐标值(相对于画布原点的偏移量)，如：[x<Number>, y<Number>]
   * @param  {Array}   originPos      地图起点元素渲染时像素坐标值，如：[x<Number>, y<Number>]
   * @param  {Array}   tileSize       单瓦片图宽高值，如：[80, 40]
   * @param  {String}  stagger        需要错列的行：['odd', 'even', 'none']；默认为 'odd' 奇数行错开（通常第一行是0行）
   * @return {Object}  {xNum, yNum, x, y}
   */

  function getPolygonInfoByPos() {
    var offsetRate = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 1;
    var pos = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [0, 0];
    var originPos = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : [0, 0];
    var tileSize = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : [8, 4];
    var stagger = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : 'odd';

    var _originPos = _slicedToArray(originPos, 2),
        originX = _originPos[0],
        originY = _originPos[1];

    var _tileSize2 = _slicedToArray(tileSize, 2),
        width = _tileSize2[0],
        height = _tileSize2[1];

    var rateHeight = height * offsetRate;
    var posTop = pos[1] - originY;
    var yNum = Math.round(posTop / rateHeight);
    var posLeft = pos[0] - originX; // 多边形错列布局需要补充偏移量

    var xOffset = 0;

    if (stagger !== 'none' && Math.abs(yNum % 2) === Number(stagger === 'odd')) {
      xOffset = width * HALF;
      posLeft -= xOffset;
    }

    var xNum = Math.round(posLeft / width);
    return {
      xNum: xNum,
      yNum: yNum,
      x: xNum * width + originX + xOffset,
      y: yNum * rateHeight + originY
    };
  }

  /* 正矩形地图元件方法 */

  var rectVertexes = [[FLAH, FLAH], [HALF, FLAH], [HALF, HALF], [FLAH, HALF]];
  /* 上、右、下、左，四个边邻居 [xNum, yNum, cost] 差值及距离成本 */

  var rectDirections = [[0, -1, 1], [1, 0, 1], [0, 1, 1], [-1, 0, 1]];
  /* 左上、右上、左下、右下，四个角邻居 [xNum, yNum] 差值及距离成本 */

  var rectCorners = [[-1, -1, 1.414], [1, -1, 1.414], [1, 1, 1.414], [-1, 1, 1.414]];
  /* 根据计划渲染后的正矩形宽高值，得到顶点坐标集合
  * @param  {Number}  width    宽度
  * @param  {Number}  height   高度
  * @return {Array}   [[x, y], ...]
  */

  function getRectVertexes() {
    var width = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 1;
    var height = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 1;
    return getPolygonVertexes(rectVertexes, width, height);
  }
  /* 得到一组矩形地图瓦片的坐标偏移位置集合
   * @param  {Array}   mainAxisRange  主轴行序号区间，如：[0, 0]
   * @param  {Array}   subAxisRange   副轴行序号区间，如：[0, 0]
   * @param  {Array}   tileSize       单瓦片图宽高值，如：[80, 40]
   * @param  {String}  renderOrder    渲染方向：['RightDown','RightUp', 'LeftDown', 'LeftUp']；默认为 'RightDown'
   * @return {Array}   [[x, y], ...]
   */

  function getRectPositions() {
    var mainAxisRange = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [0, 0];
    var subAxisRange = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [0, 0];
    var tileSize = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : [8, 4];
    var renderOrder = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 'RightDown';
    return getPolygonPositions(1, mainAxisRange, subAxisRange, tileSize, 'none', renderOrder);
  }
  /* 获得与pos坐标有交集的tile元素的{xNum, yNum, x, y}
   * @param  {Array}   pos            目标点像素坐标值(相对于画布原点的偏移量)，如：[x<Number>, y<Number>]
   * @param  {Array}   originPos      地图起点元素渲染时像素坐标值，如：[x<Number>, y<Number>]
   * @param  {Array}   tileSize       单瓦片图宽高值，如：[80, 40]
   * @return {Object}  {xNum, yNum, x, y}
   */

  function getRectInfoByPos() {
    var pos = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [0, 0];
    var originPos = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [0, 0];
    var tileSize = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : [8, 4];
    return getPolygonInfoByPos(1, pos, originPos, tileSize, 'none');
  }

  var rectFuns = /*#__PURE__*/Object.freeze({
    __proto__: null,
    rectDirections: rectDirections,
    rectCorners: rectCorners,
    getRectVertexes: getRectVertexes,
    getRectPositions: getRectPositions,
    getRectInfoByPos: getRectInfoByPos
  });

  /* 正六边形地图元件方法 */

  var hexagonVertexes = [[0, FLAH], [HALF, RAUQ], [HALF, QUAR], [0, HALF], [FLAH, QUAR], [FLAH, RAUQ]];
  /* 根据计划渲染的六边形宽高值得到顶点坐标集
  * @param  {Number}  width    宽度
  * @param  {Number}  height   高度
  * @param  {String}  axis     主轴方向 'x' || 'y'；默认为 'y'，上下是尖
  * @return {Array}   [[x, y], ...]
  */

  function getHexagonVertexes() {
    var width = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 1;
    var height = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 1;
    var axis = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 'y';
    return getPolygonVertexes(hexagonVertexes, width, height, axis);
  }
  /* 得到一组错列布局六边形地图瓦片的坐标偏移位置集合
   * @param  {Array}   mainAxisRange  主轴行序号区间，如：[0, 0]
   * @param  {Array}   subAxisRange   副轴行序号区间，如：[0, 0]
   * @param  {Array}   tileSize       单瓦片图宽高值，如：[80, 40]
   * @param  {String}  renderOrder    渲染方向：['RightDown','RightUp', 'LeftDown', 'LeftUp']；默认为 'RightDown'
   * @param  {String}  stagger        需要错列的行：['odd', 'even', 'none']；默认为 'odd' 奇数行错开（通常第一行是0行）
   * @return {Array}   [[x, y], ...]
   */

  function getHexagonPositions() {
    var mainAxisRange = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [0, 0];
    var subAxisRange = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [0, 0];
    var tileSize = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : [8, 4];
    var renderOrder = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 'RightDown';
    var stagger = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : 'odd';
    return getPolygonPositions(TQUA, mainAxisRange, subAxisRange, tileSize, stagger, renderOrder);
  }
  /* 通过大致的像素坐标值获取该位置tile元素的[Num, yNum]
   * @param  {Array}   pos            目标点像素坐标值(相对于画布原点的偏移量)，如：[x<Number>, y<Number>]
   * @param  {Array}   originPos      地图起点元素渲染时像素坐标值，如：[x<Number>, y<Number>]
   * @param  {Array}   tileSize       单瓦片图宽高值，如：[80, 40]
   * @param  {String}  stagger        需要错列的行：['odd', 'even', 'none']；默认为 'odd' 奇数行错开（通常第一行是0行）
   * @return {Object}  {xNum, yNum, x, y}
   */

  function getHexagonInfoByPos() {
    var pos = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [0, 0];
    var originPos = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [0, 0];
    var tileSize = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : [8, 4];
    var stagger = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 'odd';
    return getPolygonInfoByPos(TQUA, pos, originPos, tileSize, stagger);
  }

  var hexagonFuns = /*#__PURE__*/Object.freeze({
    __proto__: null,
    getHexagonVertexes: getHexagonVertexes,
    getHexagonPositions: getHexagonPositions,
    getHexagonInfoByPos: getHexagonInfoByPos
  });

  var rhombusVertexes = [[0, FLAH], [HALF, 0], [0, HALF], [FLAH, 0]];
  /* 根据计划渲染的菱形宽高值，得到顶点坐标集合
  * @param  {Number}  width    宽度
  * @param  {Number}  height   高度
  * @return {Array}   [[x, y], ...]
  */

  function getRhombusVertexes() {
    var width = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 1;
    var height = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 1;
    return getPolygonVertexes(rhombusVertexes, width, height);
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
    var mainAxisRange = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [0, 0];
    var subAxisRange = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [0, 0];
    var tileSize = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : [8, 4];
    var renderOrder = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 'RightDown';
    var stagger = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : 'odd';
    return getPolygonPositions(HALF, mainAxisRange, subAxisRange, tileSize, stagger, renderOrder);
  }
  /* 按等距布局菱形单元横纵坐标值及单元格宽高得到渲染坐标值 */

  function getIsometricXY(xNum, yNum, halfWidth, halfHeight) {
    return [(xNum + yNum) * halfWidth, (yNum - xNum) * halfHeight];
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
    var mainAxisRange = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [0, 0];
    var subAxisRange = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [0, 0];
    var tileSize = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : [8, 4];
    var renderOrder = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 'RightDown';
    var halfWidth = tileSize[0] / 2;
    var halfHeight = tileSize[1] / 2;
    return twoDimForEach(mainAxisRange, subAxisRange, renderOrder, function (xNum, yNum) {
      return [].concat(_toConsumableArray(getIsometricXY(xNum, yNum, halfWidth, halfHeight)), [xNum, yNum]);
    });
  }
  /* 通过大致的像素坐标值获取该位置错列布局tile元素的[Num, yNum, x, y]
   * @param  {Array}   pos            目标点像素坐标值(相对于画布原点的偏移量)，如：[x<Number>, y<Number>]
   * @param  {Array}   originPos      地图起点元素渲染时像素坐标值，如：[x<Number>, y<Number>]
   * @param  {Array}   tileSize       单瓦片图宽高值，如：[80, 40]
   * @param  {String}  stagger        需要错列的行：['odd', 'even', 'none']；默认为 'odd' 奇数行错开（通常第一行是0行）
   * @return {Object}  {xNum, yNum, x, y}
   */

  function getRhombusInfoByPos() {
    var pos = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [0, 0];
    var originPos = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [0, 0];
    var tileSize = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : [8, 4];
    var stagger = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 'odd';
    return getPolygonInfoByPos(HALF, pos, originPos, tileSize, stagger);
  }
  /* 通过大致的像素坐标值获取该位置等距布局tile元素的[Num, yNum]
   * @param  {Array}   pos            目标点像素坐标值(相对于画布原点的偏移量)，如：[x<Number>, y<Number>]
   * @param  {Array}   originPos      地图起点元素渲染时像素坐标值，如：[x<Number>, y<Number>]
   * @param  {Array}   tileSize       单瓦片图宽高值，如：[80, 40]
   * @return {Object}  {xNum, yNum, x, y}
   */

  function getIsometricRhombusInfoByPos() {
    var pos = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [0, 0];
    var originPos = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [0, 0];
    var tileSize = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : [8, 4];
    var halfHeight = tileSize[1] * HALF;
    var halfWidth = tileSize[0] * HALF;

    var _originPos = _slicedToArray(originPos, 2),
        originX = _originPos[0],
        originY = _originPos[1];

    var xSteps = (pos[0] - originX) / halfWidth * HALF;
    var ySteps = (pos[1] - originY) / halfHeight * HALF;
    var yNum = Math.round(ySteps + xSteps);
    var xNum = Math.round(xSteps - ySteps);

    var _getIsometricXY = getIsometricXY(xNum, yNum, halfWidth, halfHeight),
        _getIsometricXY2 = _slicedToArray(_getIsometricXY, 2),
        x = _getIsometricXY2[0],
        y = _getIsometricXY2[1];

    return [xNum, yNum, x + originX, y + originY];
  }

  var rhombusFuns = /*#__PURE__*/Object.freeze({
    __proto__: null,
    getRhombusVertexes: getRhombusVertexes,
    getRhombusPositions: getRhombusPositions,
    getIsometricXY: getIsometricXY,
    getIsometricRhombusPositions: getIsometricRhombusPositions,
    getRhombusInfoByPos: getRhombusInfoByPos,
    getIsometricRhombusInfoByPos: getIsometricRhombusInfoByPos
  });

  var ellipse = ellipseFuns;
  var rect = rectFuns;
  var hexagon = hexagonFuns;
  var rhombus = rhombusFuns;

  var shapesFuns = /*#__PURE__*/Object.freeze({
    __proto__: null,
    ellipse: ellipse,
    rect: rect,
    hexagon: hexagon,
    rhombus: rhombus
  });

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
        startX = _startUnitXY$ === void 0 ? 0 : _startUnitXY$,
        _startUnitXY$2 = _startUnitXY[1],
        startY = _startUnitXY$2 === void 0 ? 0 : _startUnitXY$2;

    var _endUnitXY = _slicedToArray(endUnitXY, 2),
        _endUnitXY$ = _endUnitXY[0],
        endX = _endUnitXY$ === void 0 ? 0 : _endUnitXY$,
        _endUnitXY$2 = _endUnitXY[1],
        endY = _endUnitXY$2 === void 0 ? 0 : _endUnitXY$2;

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
        x = _unitXY$ === void 0 ? 0 : _unitXY$,
        _unitXY$2 = _unitXY[1],
        y = _unitXY$2 === void 0 ? 0 : _unitXY$2; // 角度转弧度


    var arc = angle * oneArc; // 弧度转正余弦(考虑浮点溢出精度问题，这里 *10 计算后使用 Math.round 取整回去)

    var sinv = Math.sin(arc) * 10;
    var cosv = Math.cos(arc) * 10; // 计算得到新坐标点

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

  var sqrt2 = Math.sqrt(2); // 45度的正余弦值

  var sincos45 = sqrt2 / 2; // 元坐标45度变换后的差值补充

  var unitDiff = -1 / sqrt2;
  function unit2rhombusPixel() {
    var unitXY = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];
    var diagonal = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];
    var originXY = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : [];

    var _unitXY2 = _slicedToArray(unitXY, 2),
        _unitXY2$ = _unitXY2[0],
        X = _unitXY2$ === void 0 ? 0 : _unitXY2$,
        _unitXY2$2 = _unitXY2[1],
        Y = _unitXY2$2 === void 0 ? 0 : _unitXY2$2;

    var _diagonal = _slicedToArray(diagonal, 2),
        _diagonal$ = _diagonal[0],
        W = _diagonal$ === void 0 ? 10 : _diagonal$,
        _diagonal$2 = _diagonal[1],
        H = _diagonal$2 === void 0 ? 10 : _diagonal$2;

    var _originXY = _slicedToArray(originXY, 2),
        _originXY$ = _originXY[0],
        ox = _originXY$ === void 0 ? 0 : _originXY$,
        _originXY$2 = _originXY[1],
        oy = _originXY$2 === void 0 ? 0 : _originXY$2; // 45度变换


    var x = (X - Y) * sincos45;
    var y = (X + Y) * sincos45; // 变换后的元坐标换算为像素坐标

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
        pixelX = _pixelXY$ === void 0 ? 0 : _pixelXY$,
        _pixelXY$2 = _pixelXY[1],
        pixelY = _pixelXY$2 === void 0 ? 0 : _pixelXY$2;

    var _diagonal2 = _slicedToArray(diagonal, 2),
        _diagonal2$ = _diagonal2[0],
        W = _diagonal2$ === void 0 ? 10 : _diagonal2$,
        _diagonal2$2 = _diagonal2[1],
        H = _diagonal2$2 === void 0 ? 10 : _diagonal2$2;

    var _originXY2 = _slicedToArray(originXY, 2),
        _originXY2$ = _originXY2[0],
        ox = _originXY2$ === void 0 ? 0 : _originXY2$,
        _originXY2$2 = _originXY2[1],
        oy = _originXY2$2 === void 0 ? 0 : _originXY2$2; // 像素坐标换算为元坐标


    var uX = (pixelX - ox) / (unitDiff * W);
    var uY = (pixelY - oy) / (unitDiff * H); // 45度变换

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
    var ret = []; // const xIsSingle = column === 1;
    // const yIsSingle = row === 1;

    var minCol = -Math.floor(column / 2);
    var maxCol = column + minCol - 1;
    var minRow = -Math.floor(row / 2);
    var maxRow = row + minRow - 1;
    var size = [1, 1];
    var pos = [0, 0];

    for (var rowNum = minRow; rowNum <= maxRow; rowNum++) {
      var pxY = rowNum * 0.5;
      var isOdd = Math.abs(pxY % 1) === 0.5; // 奇数行右移，实现错列对齐

      var xDiff = isOdd ? 0.5 : 0;

      for (var colNum = minCol; colNum <= maxCol; colNum++) {
        var pxX = colNum + xDiff;

        var _rhombusPixel2unit = rhombusPixel2unit([pxX, pxY], size, pos),
            _rhombusPixel2unit2 = _slicedToArray(_rhombusPixel2unit, 2),
            xId = _rhombusPixel2unit2[0],
            yId = _rhombusPixel2unit2[1]; // -del- 排除掉奇数末个，实现整齐效果 -del- ，不再干预、自行 filter
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
    var _ref = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [],
        _ref2 = _slicedToArray(_ref, 2),
        _ref2$ = _ref2[0],
        vX = _ref2$ === void 0 ? 0 : _ref2$,
        _ref2$2 = _ref2[1],
        vY = _ref2$2 === void 0 ? 0 : _ref2$2;

    var _ref3 = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [],
        _ref4 = _slicedToArray(_ref3, 2),
        _ref4$ = _ref4[0],
        w = _ref4$ === void 0 ? 78 : _ref4$,
        _ref4$2 = _ref4[1],
        h = _ref4$2 === void 0 ? 40 : _ref4$2;

    var _ref5 = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : [],
        _ref6 = _slicedToArray(_ref5, 2),
        _ref6$ = _ref6[0],
        oX = _ref6$ === void 0 ? 0 : _ref6$,
        _ref6$2 = _ref6[1],
        oY = _ref6$2 === void 0 ? 0 : _ref6$2;

    var halfW = w / 2;
    var halfH = h / 2;
    var y = Math.round(vY / halfH) * halfH;
    var x = Math.round(vX / w) * w; // 偶数行错列布局右移部分回填

    if (y % h === halfH) {
      // 鼠标位置大于半个则回移，小于半个则右移；保证在单元格内
      x += vX - x >= 0 ? halfW : -halfW;
    }

    return [x + oX, y + oY];
  }

  // 上下左右8个方位邻居单元的坐标差值及评分权重
  var referenceArr = [[1, 0, 10], [0, 1, 10], [0, -1, 10], [-1, 0, 10], [-1, -1, 14], [-1, 1, 14], [1, -1, 14], [1, 1, 14]];

  function astar () {
    var startUnitXY = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];
    var endUnitXY = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];
    var filter = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : function (xId, yId, cost, refX, refY) {
      return true;
    };

    // console.log(fromX + ',' + fromY, 'to', toX + ',' + toY);
    var _startUnitXY = _slicedToArray(startUnitXY, 2),
        _startUnitXY$ = _startUnitXY[0],
        fromX = _startUnitXY$ === void 0 ? 0 : _startUnitXY$,
        _startUnitXY$2 = _startUnitXY[1],
        fromY = _startUnitXY$2 === void 0 ? 0 : _startUnitXY$2;

    var _endUnitXY = _slicedToArray(endUnitXY, 2),
        _endUnitXY$ = _endUnitXY[0],
        toX = _endUnitXY$ === void 0 ? 0 : _endUnitXY$,
        _endUnitXY$2 = _endUnitXY[1],
        toY = _endUnitXY$2 === void 0 ? 0 : _endUnitXY$2; // 起止点相同直接返回当前点


    if (fromX === toX && fromY === toY) {
      return [startUnitXY];
    } // 排除不可能到达的点，避免死循环


    if (Math.abs(fromX % 1) !== Math.abs(toX % 1) || Math.abs(fromY % 1) !== Math.abs(toY % 1)) {
      return [];
    }

    var cost = {};
    var parentsPoints = {};
    cost[startUnitXY.join()] = 0; // const _limit = 0;

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
        var extPoint = eligiblePoints[i]; // 到达终点生成路径

        if (extPoint[0] === toX && extPoint[1] === toY) {
          path.push(endUnitXY);
          var pathPoint = endUnitXY; // 回查到完整路径

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

  function _defineProperty(obj, key, value) {
    if (key in obj) {
      Object.defineProperty(obj, key, {
        value: value,
        enumerable: true,
        configurable: true,
        writable: true
      });
    } else {
      obj[key] = value;
    }

    return obj;
  }

  /* 查找二维坐标系相邻元素
  * @param {Array}     xyNum              瓦片坐标值，如：[xNum, yNum]
  * @param {Array}     referenceMatrix    相邻元素差值矩阵，也就是[xNum, yNum]与相邻坐标差集合，如：[[-1, -1], [1, 1], ...]
  * @param {Function}  filter             自行过滤方法，参数示例：(xyNum = [xNum, yNum], rmXY = [-1, -1])
  * @return {Array}    匹配的邻居坐标集合或空数组
  */
  function getNeighborsPoints$1() {
    var xyNum = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [0, 0];
    var referenceMatrix = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [[1, 0], [0, 1], [-1, 0], [0, -1]];
    var filter = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : function (xyNum, diffXY) {
      return true;
    };
    var points = [];

    var _xyNum = _slicedToArray(xyNum, 2),
        xNum = _xyNum[0],
        yNum = _xyNum[1];

    referenceMatrix.some(function (diffXY) {
      var xyNumCurr = [xNum + diffXY[0], yNum + diffXY[1]];
      var filterRet = filter(xyNumCurr, diffXY);
      if (filterRet === 'break') return false;

      if (filterRet) {
        points.push(xyNumCurr);
      }
    });
    return points;
  }

  /* A*寻径
  * @param {Array}     staXyNum           数据坐标值，如：[xNum, yNum]
  * @param {Array}     endXyNum           数据坐标值，如：[xNum, yNum]
  * @param {Array}     referenceMatrix    相邻元素差值矩阵，也就是[xNum, yNum, cost]与相邻坐标差集合，如：[[-1, -1, 1.414], [1, 1, 1], ...]
  * @param {Function}  filterFun          自行过滤方法，参数示例：(xyNum = [xNum, yNum], xyDiff = [-1, -1])
  * @return {Array} 匹配的路径集合或空数组
  */

  function aStarPathFinding$1() {
    var staXyNum = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [0, 0];
    var endXyNum = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [0, 0];
    var referenceMatrix = arguments.length > 2 ? arguments[2] : undefined;
    var filterFun = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : function (xyNum, xyDiff) {
      return true;
    };
    var maximizable = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : 1e6;
    var path = [];

    var _staXyNum = _slicedToArray(staXyNum, 2),
        staXNum = _staXyNum[0],
        staYNum = _staXyNum[1];

    var _endXyNum = _slicedToArray(endXyNum, 2),
        endXNum = _endXyNum[0],
        endYNum = _endXyNum[1];

    var staPoint = [staXNum, staYNum, 0];
    var n = 0; // 起止点相同直接返回当前点

    if (staXNum === endXNum && staYNum === endYNum) {
      path.push(staPoint);
    } else {
      (function () {
        var parents = {};
        var staXyStr = "".concat(staXNum, ",").concat(staYNum);

        var costs = _defineProperty({}, staXyStr, 0);

        var openlist = [staPoint]; // 防止重复判断

        var _loop = function _loop() {
          var currPoint = openlist.pop();
          var currCost = costs["".concat(currPoint[0], ",").concat(currPoint[1])];
          getNeighborsPoints$1(currPoint, referenceMatrix, function (neiXyNum, xyDiff) {
            if (!filterFun(neiXyNum, xyDiff)) return;

            var _neiXyNum = _slicedToArray(neiXyNum, 2),
                neiXNum = _neiXyNum[0],
                neiYNum = _neiXyNum[1];

            var neiXYStr = "".concat(neiXNum, ",").concat(neiYNum);
            var oldCost = costs[neiXYStr];
            var neiCost = Math.round((currCost + (xyDiff[2] || 1)) * 1e3) / 1e3;
            if (oldCost !== undefined && neiCost >= oldCost) return;
            costs[neiXYStr] = neiCost;
            parents[neiXYStr] = currPoint;
            n++;
            if (n > maximizable) throw new Error('循环次数超过了 maximizable：' + maximizable);
            var neiPoint = [neiXNum, neiYNum, neiCost]; // 到达终点生成路径

            if (neiXNum === endXNum && neiYNum === endYNum) {
              path.push(neiPoint); // 回查链表得到完整路径数组

              var prevXyNum = endXyNum;

              while (prevXyNum = parents["".concat(prevXyNum[0], ",").concat(prevXyNum[1])]) {
                path.unshift(prevXyNum);
              }

              openlist.length = 0;
              return 'break';
            } else {
              // 没到达终点，将当前点放入开放点列表，继续查找
              openlist.unshift(neiPoint);
            }
          });
        };

        while (openlist.length) {
          _loop();
        }
      })();
    }

    return path.length ? path : null;
  }

  var aStarPathFinding = aStarPathFinding$1;
  var getNeighborsPoints = getNeighborsPoints$1;

  var pathFindingFuns = /*#__PURE__*/Object.freeze({
    __proto__: null,
    aStarPathFinding: aStarPathFinding,
    getNeighborsPoints: getNeighborsPoints
  });

  var shapes = shapesFuns;

  var searchPath = astar; // 寻路
  var pathFinding = pathFindingFuns;

  exports._half_precision = _half_precision;
  exports.getDiagonalUnitsByRowCol = getDiagonalUnitsByRowCol;
  exports.getNeighbourUnitsByRowCol = getNeighbourUnitsByRowCol;
  exports.getStaggeredUnitsByRowCol = getStaggeredUnitsByRowCol;
  exports.getUnitsByDiagonal = getUnitsByDiagonal;
  exports.getUnitsByRowCol = getUnitsByRowCol;
  exports.pathFinding = pathFinding;
  exports.pixel2unit = pixel2unit;
  exports.rhombusPixel2unit = rhombusPixel2unit;
  exports.rotateUnit = rotateUnit;
  exports.searchPath = searchPath;
  exports.shapes = shapes;
  exports.staggeredUnitRound = staggeredUnitRound;
  exports.unit2pixel = unit2pixel;
  exports.unit2rhombusPixel = unit2rhombusPixel;

  Object.defineProperty(exports, '__esModule', { value: true });

})));
//# sourceMappingURL=qtiled.dev.js.map
