
/**
 * QTiled v0.0.1
 * (c) 2018 huzunjie
 * Released under MIT
 */

(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
	typeof define === 'function' && define.amd ? define(['exports'], factory) :
	(factory((global.qtiled = {})));
}(this, (function (exports) { 'use strict';

function unwrapExports (x) {
	return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
}

function createCommonjsModule(fn, module) {
	return module = { exports: {} }, fn(module, module.exports), module.exports;
}

var _iterStep = function (done, value) {
  return { value: value, done: !!done };
};

var _iterators = {};

var toString = {}.toString;

var _cof = function (it) {
  return toString.call(it).slice(8, -1);
};

// fallback for non-array-like ES3 and non-enumerable old V8 strings

// eslint-disable-next-line no-prototype-builtins
var _iobject = Object('z').propertyIsEnumerable(0) ? Object : function (it) {
  return _cof(it) == 'String' ? it.split('') : Object(it);
};

// 7.2.1 RequireObjectCoercible(argument)
var _defined = function (it) {
  if (it == undefined) throw TypeError("Can't call method on  " + it);
  return it;
};

// to indexed object, toObject with fallback for non-array-like ES3 strings


var _toIobject = function (it) {
  return _iobject(_defined(it));
};

var _library = true;

var _global = createCommonjsModule(function (module) {
// https://github.com/zloirock/core-js/issues/86#issuecomment-115759028
var global = module.exports = typeof window != 'undefined' && window.Math == Math
  ? window : typeof self != 'undefined' && self.Math == Math ? self
  // eslint-disable-next-line no-new-func
  : Function('return this')();
if (typeof __g == 'number') __g = global; // eslint-disable-line no-undef
});

var _core = createCommonjsModule(function (module) {
var core = module.exports = { version: '2.5.4' };
if (typeof __e == 'number') __e = core; // eslint-disable-line no-undef
});

var _core_1 = _core.version;

var _aFunction = function (it) {
  if (typeof it != 'function') throw TypeError(it + ' is not a function!');
  return it;
};

// optional / simple context binding

var _ctx = function (fn, that, length) {
  _aFunction(fn);
  if (that === undefined) return fn;
  switch (length) {
    case 1: return function (a) {
      return fn.call(that, a);
    };
    case 2: return function (a, b) {
      return fn.call(that, a, b);
    };
    case 3: return function (a, b, c) {
      return fn.call(that, a, b, c);
    };
  }
  return function (/* ...args */) {
    return fn.apply(that, arguments);
  };
};

var _isObject = function (it) {
  return typeof it === 'object' ? it !== null : typeof it === 'function';
};

var _anObject = function (it) {
  if (!_isObject(it)) throw TypeError(it + ' is not an object!');
  return it;
};

var _fails = function (exec) {
  try {
    return !!exec();
  } catch (e) {
    return true;
  }
};

// Thank's IE8 for his funny defineProperty
var _descriptors = !_fails(function () {
  return Object.defineProperty({}, 'a', { get: function () { return 7; } }).a != 7;
});

var document = _global.document;
// typeof document.createElement is 'object' in old IE
var is = _isObject(document) && _isObject(document.createElement);
var _domCreate = function (it) {
  return is ? document.createElement(it) : {};
};

var _ie8DomDefine = !_descriptors && !_fails(function () {
  return Object.defineProperty(_domCreate('div'), 'a', { get: function () { return 7; } }).a != 7;
});

// 7.1.1 ToPrimitive(input [, PreferredType])

// instead of the ES6 spec version, we didn't implement @@toPrimitive case
// and the second argument - flag - preferred type is a string
var _toPrimitive = function (it, S) {
  if (!_isObject(it)) return it;
  var fn, val;
  if (S && typeof (fn = it.toString) == 'function' && !_isObject(val = fn.call(it))) return val;
  if (typeof (fn = it.valueOf) == 'function' && !_isObject(val = fn.call(it))) return val;
  if (!S && typeof (fn = it.toString) == 'function' && !_isObject(val = fn.call(it))) return val;
  throw TypeError("Can't convert object to primitive value");
};

var dP = Object.defineProperty;

var f = _descriptors ? Object.defineProperty : function defineProperty(O, P, Attributes) {
  _anObject(O);
  P = _toPrimitive(P, true);
  _anObject(Attributes);
  if (_ie8DomDefine) try {
    return dP(O, P, Attributes);
  } catch (e) { /* empty */ }
  if ('get' in Attributes || 'set' in Attributes) throw TypeError('Accessors not supported!');
  if ('value' in Attributes) O[P] = Attributes.value;
  return O;
};

var _objectDp = {
	f: f
};

var _propertyDesc = function (bitmap, value) {
  return {
    enumerable: !(bitmap & 1),
    configurable: !(bitmap & 2),
    writable: !(bitmap & 4),
    value: value
  };
};

var _hide = _descriptors ? function (object, key, value) {
  return _objectDp.f(object, key, _propertyDesc(1, value));
} : function (object, key, value) {
  object[key] = value;
  return object;
};

var hasOwnProperty = {}.hasOwnProperty;
var _has = function (it, key) {
  return hasOwnProperty.call(it, key);
};

var PROTOTYPE = 'prototype';

var $export = function (type, name, source) {
  var IS_FORCED = type & $export.F;
  var IS_GLOBAL = type & $export.G;
  var IS_STATIC = type & $export.S;
  var IS_PROTO = type & $export.P;
  var IS_BIND = type & $export.B;
  var IS_WRAP = type & $export.W;
  var exports = IS_GLOBAL ? _core : _core[name] || (_core[name] = {});
  var expProto = exports[PROTOTYPE];
  var target = IS_GLOBAL ? _global : IS_STATIC ? _global[name] : (_global[name] || {})[PROTOTYPE];
  var key, own, out;
  if (IS_GLOBAL) source = name;
  for (key in source) {
    // contains in native
    own = !IS_FORCED && target && target[key] !== undefined;
    if (own && _has(exports, key)) continue;
    // export native or passed
    out = own ? target[key] : source[key];
    // prevent global pollution for namespaces
    exports[key] = IS_GLOBAL && typeof target[key] != 'function' ? source[key]
    // bind timers to global for call from export context
    : IS_BIND && own ? _ctx(out, _global)
    // wrap global constructors for prevent change them in library
    : IS_WRAP && target[key] == out ? (function (C) {
      var F = function (a, b, c) {
        if (this instanceof C) {
          switch (arguments.length) {
            case 0: return new C();
            case 1: return new C(a);
            case 2: return new C(a, b);
          } return new C(a, b, c);
        } return C.apply(this, arguments);
      };
      F[PROTOTYPE] = C[PROTOTYPE];
      return F;
    // make static versions for prototype methods
    })(out) : IS_PROTO && typeof out == 'function' ? _ctx(Function.call, out) : out;
    // export proto methods to core.%CONSTRUCTOR%.methods.%NAME%
    if (IS_PROTO) {
      (exports.virtual || (exports.virtual = {}))[key] = out;
      // export proto methods to core.%CONSTRUCTOR%.prototype.%NAME%
      if (type & $export.R && expProto && !expProto[key]) _hide(expProto, key, out);
    }
  }
};
// type bitmap
$export.F = 1;   // forced
$export.G = 2;   // global
$export.S = 4;   // static
$export.P = 8;   // proto
$export.B = 16;  // bind
$export.W = 32;  // wrap
$export.U = 64;  // safe
$export.R = 128; // real proto method for `library`
var _export = $export;

var _redefine = _hide;

// 7.1.4 ToInteger
var ceil = Math.ceil;
var floor = Math.floor;
var _toInteger = function (it) {
  return isNaN(it = +it) ? 0 : (it > 0 ? floor : ceil)(it);
};

// 7.1.15 ToLength

var min = Math.min;
var _toLength = function (it) {
  return it > 0 ? min(_toInteger(it), 0x1fffffffffffff) : 0; // pow(2, 53) - 1 == 9007199254740991
};

var max = Math.max;
var min$1 = Math.min;
var _toAbsoluteIndex = function (index, length) {
  index = _toInteger(index);
  return index < 0 ? max(index + length, 0) : min$1(index, length);
};

// false -> Array#indexOf
// true  -> Array#includes



var _arrayIncludes = function (IS_INCLUDES) {
  return function ($this, el, fromIndex) {
    var O = _toIobject($this);
    var length = _toLength(O.length);
    var index = _toAbsoluteIndex(fromIndex, length);
    var value;
    // Array#includes uses SameValueZero equality algorithm
    // eslint-disable-next-line no-self-compare
    if (IS_INCLUDES && el != el) while (length > index) {
      value = O[index++];
      // eslint-disable-next-line no-self-compare
      if (value != value) return true;
    // Array#indexOf ignores holes, Array#includes - not
    } else for (;length > index; index++) if (IS_INCLUDES || index in O) {
      if (O[index] === el) return IS_INCLUDES || index || 0;
    } return !IS_INCLUDES && -1;
  };
};

var SHARED = '__core-js_shared__';
var store = _global[SHARED] || (_global[SHARED] = {});
var _shared = function (key) {
  return store[key] || (store[key] = {});
};

var id = 0;
var px = Math.random();
var _uid = function (key) {
  return 'Symbol('.concat(key === undefined ? '' : key, ')_', (++id + px).toString(36));
};

var shared = _shared('keys');

var _sharedKey = function (key) {
  return shared[key] || (shared[key] = _uid(key));
};

var arrayIndexOf = _arrayIncludes(false);
var IE_PROTO$1 = _sharedKey('IE_PROTO');

var _objectKeysInternal = function (object, names) {
  var O = _toIobject(object);
  var i = 0;
  var result = [];
  var key;
  for (key in O) if (key != IE_PROTO$1) _has(O, key) && result.push(key);
  // Don't enum bug & hidden keys
  while (names.length > i) if (_has(O, key = names[i++])) {
    ~arrayIndexOf(result, key) || result.push(key);
  }
  return result;
};

// IE 8- don't enum bug keys
var _enumBugKeys = (
  'constructor,hasOwnProperty,isPrototypeOf,propertyIsEnumerable,toLocaleString,toString,valueOf'
).split(',');

// 19.1.2.14 / 15.2.3.14 Object.keys(O)



var _objectKeys = Object.keys || function keys(O) {
  return _objectKeysInternal(O, _enumBugKeys);
};

var _objectDps = _descriptors ? Object.defineProperties : function defineProperties(O, Properties) {
  _anObject(O);
  var keys = _objectKeys(Properties);
  var length = keys.length;
  var i = 0;
  var P;
  while (length > i) _objectDp.f(O, P = keys[i++], Properties[P]);
  return O;
};

var document$1 = _global.document;
var _html = document$1 && document$1.documentElement;

// 19.1.2.2 / 15.2.3.5 Object.create(O [, Properties])



var IE_PROTO = _sharedKey('IE_PROTO');
var Empty = function () { /* empty */ };
var PROTOTYPE$1 = 'prototype';

// Create object with fake `null` prototype: use iframe Object with cleared prototype
var createDict = function () {
  // Thrash, waste and sodomy: IE GC bug
  var iframe = _domCreate('iframe');
  var i = _enumBugKeys.length;
  var lt = '<';
  var gt = '>';
  var iframeDocument;
  iframe.style.display = 'none';
  _html.appendChild(iframe);
  iframe.src = 'javascript:'; // eslint-disable-line no-script-url
  // createDict = iframe.contentWindow.Object;
  // html.removeChild(iframe);
  iframeDocument = iframe.contentWindow.document;
  iframeDocument.open();
  iframeDocument.write(lt + 'script' + gt + 'document.F=Object' + lt + '/script' + gt);
  iframeDocument.close();
  createDict = iframeDocument.F;
  while (i--) delete createDict[PROTOTYPE$1][_enumBugKeys[i]];
  return createDict();
};

var _objectCreate = Object.create || function create(O, Properties) {
  var result;
  if (O !== null) {
    Empty[PROTOTYPE$1] = _anObject(O);
    result = new Empty();
    Empty[PROTOTYPE$1] = null;
    // add "__proto__" for Object.getPrototypeOf polyfill
    result[IE_PROTO] = O;
  } else result = createDict();
  return Properties === undefined ? result : _objectDps(result, Properties);
};

var _wks = createCommonjsModule(function (module) {
var store = _shared('wks');

var Symbol = _global.Symbol;
var USE_SYMBOL = typeof Symbol == 'function';

var $exports = module.exports = function (name) {
  return store[name] || (store[name] =
    USE_SYMBOL && Symbol[name] || (USE_SYMBOL ? Symbol : _uid)('Symbol.' + name));
};

$exports.store = store;
});

var def = _objectDp.f;

var TAG = _wks('toStringTag');

var _setToStringTag = function (it, tag, stat) {
  if (it && !_has(it = stat ? it : it.prototype, TAG)) def(it, TAG, { configurable: true, value: tag });
};

var IteratorPrototype = {};

// 25.1.2.1.1 %IteratorPrototype%[@@iterator]()
_hide(IteratorPrototype, _wks('iterator'), function () { return this; });

var _iterCreate = function (Constructor, NAME, next) {
  Constructor.prototype = _objectCreate(IteratorPrototype, { next: _propertyDesc(1, next) });
  _setToStringTag(Constructor, NAME + ' Iterator');
};

// 7.1.13 ToObject(argument)

var _toObject = function (it) {
  return Object(_defined(it));
};

// 19.1.2.9 / 15.2.3.2 Object.getPrototypeOf(O)


var IE_PROTO$2 = _sharedKey('IE_PROTO');
var ObjectProto = Object.prototype;

var _objectGpo = Object.getPrototypeOf || function (O) {
  O = _toObject(O);
  if (_has(O, IE_PROTO$2)) return O[IE_PROTO$2];
  if (typeof O.constructor == 'function' && O instanceof O.constructor) {
    return O.constructor.prototype;
  } return O instanceof Object ? ObjectProto : null;
};

var ITERATOR = _wks('iterator');
var BUGGY = !([].keys && 'next' in [].keys()); // Safari has buggy iterators w/o `next`
var FF_ITERATOR = '@@iterator';
var KEYS = 'keys';
var VALUES = 'values';

var returnThis = function () { return this; };

var _iterDefine = function (Base, NAME, Constructor, next, DEFAULT, IS_SET, FORCED) {
  _iterCreate(Constructor, NAME, next);
  var getMethod = function (kind) {
    if (!BUGGY && kind in proto) return proto[kind];
    switch (kind) {
      case KEYS: return function keys() { return new Constructor(this, kind); };
      case VALUES: return function values() { return new Constructor(this, kind); };
    } return function entries() { return new Constructor(this, kind); };
  };
  var TAG = NAME + ' Iterator';
  var DEF_VALUES = DEFAULT == VALUES;
  var VALUES_BUG = false;
  var proto = Base.prototype;
  var $native = proto[ITERATOR] || proto[FF_ITERATOR] || DEFAULT && proto[DEFAULT];
  var $default = $native || getMethod(DEFAULT);
  var $entries = DEFAULT ? !DEF_VALUES ? $default : getMethod('entries') : undefined;
  var $anyNative = NAME == 'Array' ? proto.entries || $native : $native;
  var methods, key, IteratorPrototype;
  // Fix native
  if ($anyNative) {
    IteratorPrototype = _objectGpo($anyNative.call(new Base()));
    if (IteratorPrototype !== Object.prototype && IteratorPrototype.next) {
      // Set @@toStringTag to native iterators
      _setToStringTag(IteratorPrototype, TAG, true);
      // fix for some old engines
      if (!_library && typeof IteratorPrototype[ITERATOR] != 'function') _hide(IteratorPrototype, ITERATOR, returnThis);
    }
  }
  // fix Array#{values, @@iterator}.name in V8 / FF
  if (DEF_VALUES && $native && $native.name !== VALUES) {
    VALUES_BUG = true;
    $default = function values() { return $native.call(this); };
  }
  // Define iterator
  if ((!_library || FORCED) && (BUGGY || VALUES_BUG || !proto[ITERATOR])) {
    _hide(proto, ITERATOR, $default);
  }
  // Plug for library
  _iterators[NAME] = $default;
  _iterators[TAG] = returnThis;
  if (DEFAULT) {
    methods = {
      values: DEF_VALUES ? $default : getMethod(VALUES),
      keys: IS_SET ? $default : getMethod(KEYS),
      entries: $entries
    };
    if (FORCED) for (key in methods) {
      if (!(key in proto)) _redefine(proto, key, methods[key]);
    } else _export(_export.P + _export.F * (BUGGY || VALUES_BUG), NAME, methods);
  }
  return methods;
};

// 22.1.3.4 Array.prototype.entries()
// 22.1.3.13 Array.prototype.keys()
// 22.1.3.29 Array.prototype.values()
// 22.1.3.30 Array.prototype[@@iterator]()
var es6_array_iterator = _iterDefine(Array, 'Array', function (iterated, kind) {
  this._t = _toIobject(iterated); // target
  this._i = 0;                   // next index
  this._k = kind;                // kind
// 22.1.5.2.1 %ArrayIteratorPrototype%.next()
}, function () {
  var O = this._t;
  var kind = this._k;
  var index = this._i++;
  if (!O || index >= O.length) {
    this._t = undefined;
    return _iterStep(1);
  }
  if (kind == 'keys') return _iterStep(0, index);
  if (kind == 'values') return _iterStep(0, O[index]);
  return _iterStep(0, [index, O[index]]);
}, 'values');

// argumentsList[@@iterator] is %ArrayProto_values% (9.4.4.6, 9.4.4.7)
_iterators.Arguments = _iterators.Array;

var TO_STRING_TAG = _wks('toStringTag');

var DOMIterables = ('CSSRuleList,CSSStyleDeclaration,CSSValueList,ClientRectList,DOMRectList,DOMStringList,' +
  'DOMTokenList,DataTransferItemList,FileList,HTMLAllCollection,HTMLCollection,HTMLFormElement,HTMLSelectElement,' +
  'MediaList,MimeTypeArray,NamedNodeMap,NodeList,PaintRequestList,Plugin,PluginArray,SVGLengthList,SVGNumberList,' +
  'SVGPathSegList,SVGPointList,SVGStringList,SVGTransformList,SourceBufferList,StyleSheetList,TextTrackCueList,' +
  'TextTrackList,TouchList').split(',');

for (var i = 0; i < DOMIterables.length; i++) {
  var NAME = DOMIterables[i];
  var Collection = _global[NAME];
  var proto = Collection && Collection.prototype;
  if (proto && !proto[TO_STRING_TAG]) _hide(proto, TO_STRING_TAG, NAME);
  _iterators[NAME] = _iterators.Array;
}

// true  -> String#at
// false -> String#codePointAt
var _stringAt = function (TO_STRING) {
  return function (that, pos) {
    var s = String(_defined(that));
    var i = _toInteger(pos);
    var l = s.length;
    var a, b;
    if (i < 0 || i >= l) return TO_STRING ? '' : undefined;
    a = s.charCodeAt(i);
    return a < 0xd800 || a > 0xdbff || i + 1 === l || (b = s.charCodeAt(i + 1)) < 0xdc00 || b > 0xdfff
      ? TO_STRING ? s.charAt(i) : a
      : TO_STRING ? s.slice(i, i + 2) : (a - 0xd800 << 10) + (b - 0xdc00) + 0x10000;
  };
};

var $at = _stringAt(true);

// 21.1.3.27 String.prototype[@@iterator]()
_iterDefine(String, 'String', function (iterated) {
  this._t = String(iterated); // target
  this._i = 0;                // next index
// 21.1.5.2.1 %StringIteratorPrototype%.next()
}, function () {
  var O = this._t;
  var index = this._i;
  var point;
  if (index >= O.length) return { value: undefined, done: true };
  point = $at(O, index);
  this._i += point.length;
  return { value: point, done: false };
});

// getting tag from 19.1.3.6 Object.prototype.toString()

var TAG$1 = _wks('toStringTag');
// ES3 wrong here
var ARG = _cof(function () { return arguments; }()) == 'Arguments';

// fallback for IE11 Script Access Denied error
var tryGet = function (it, key) {
  try {
    return it[key];
  } catch (e) { /* empty */ }
};

var _classof = function (it) {
  var O, T, B;
  return it === undefined ? 'Undefined' : it === null ? 'Null'
    // @@toStringTag case
    : typeof (T = tryGet(O = Object(it), TAG$1)) == 'string' ? T
    // builtinTag case
    : ARG ? _cof(O)
    // ES3 arguments fallback
    : (B = _cof(O)) == 'Object' && typeof O.callee == 'function' ? 'Arguments' : B;
};

var ITERATOR$1 = _wks('iterator');

var core_isIterable = _core.isIterable = function (it) {
  var O = Object(it);
  return O[ITERATOR$1] !== undefined
    || '@@iterator' in O
    // eslint-disable-next-line no-prototype-builtins
    || _iterators.hasOwnProperty(_classof(O));
};

var isIterable$2 = core_isIterable;

var isIterable = createCommonjsModule(function (module) {
module.exports = { "default": isIterable$2, __esModule: true };
});

unwrapExports(isIterable);

var ITERATOR$2 = _wks('iterator');

var core_getIteratorMethod = _core.getIteratorMethod = function (it) {
  if (it != undefined) return it[ITERATOR$2]
    || it['@@iterator']
    || _iterators[_classof(it)];
};

var core_getIterator = _core.getIterator = function (it) {
  var iterFn = core_getIteratorMethod(it);
  if (typeof iterFn != 'function') throw TypeError(it + ' is not iterable!');
  return _anObject(iterFn.call(it));
};

var getIterator$2 = core_getIterator;

var getIterator = createCommonjsModule(function (module) {
module.exports = { "default": getIterator$2, __esModule: true };
});

unwrapExports(getIterator);

var slicedToArray = createCommonjsModule(function (module, exports) {
exports.__esModule = true;



var _isIterable3 = _interopRequireDefault(isIterable);



var _getIterator3 = _interopRequireDefault(getIterator);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.default = function () {
  function sliceIterator(arr, i) {
    var _arr = [];
    var _n = true;
    var _d = false;
    var _e = undefined;

    try {
      for (var _i = (0, _getIterator3.default)(arr), _s; !(_n = (_s = _i.next()).done); _n = true) {
        _arr.push(_s.value);

        if (i && _arr.length === i) break;
      }
    } catch (err) {
      _d = true;
      _e = err;
    } finally {
      try {
        if (!_n && _i["return"]) _i["return"]();
      } finally {
        if (_d) throw _e;
      }
    }

    return _arr;
  }

  return function (arr, i) {
    if (Array.isArray(arr)) {
      return arr;
    } else if ((0, _isIterable3.default)(Object(arr))) {
      return sliceIterator(arr, i);
    } else {
      throw new TypeError("Invalid attempt to destructure non-iterable instance");
    }
  };
}();
});

var _slicedToArray = unwrapExports(slicedToArray);

/* 根据行列数设定，取得对应元坐标集合
* @param {Number}   column       列数
* @param {Number}   row          行数
* @param {Function} filter       过滤
* @param {Function} processor    加工：可以用于将单位为1的坐标值换算为目标值或对象
* @return {Array} 生成的坐标集合
*/
function getUnitsByRowCol() {
  var column = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 1;
  var row = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 1;
  var filter = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : function (x, y) {
    return true;
  };
  var processor = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : function (x, y) {
    return [x, y];
  };

  var ret = [];
  var maxX = (column - 1) / 2;
  var maxY = (row - 1) / 2;
  for (var y = -maxY; y <= maxY; y++) {
    for (var x = -maxX; x <= maxX; x++) {
      filter(x, y, maxX, maxY) && ret.push(processor(x, y, maxX, maxY));
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
  var filter = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : function (x, y) {
    return true;
  };
  var processor = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : function (x, y) {
    return [x, y];
  };

  return getUnitsByRowCol(column + 2, row + 2, function (x, y, maxX, maxY) {
    return filter(x, y, maxX, maxY) && (Math.abs(x) === maxX || Math.abs(y) === maxY);
  }, processor);
}

/* 根据行列数设定，取得斜对角范围内的错列元坐标集合
* @param {Number}   column    列数
* @param {Number}   row       行数
* @param {Function} filter    过滤
* @return {Array} 生成的坐标集合
*/
function getDiagonalUnitsByRowCol() {
  var column = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 1;
  var row = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 1;
  var filter = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : function (x, y) {
    return true;
  };
  var processor = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : function (x, y) {
    return [x, y];
  };

  return getUnitsByRowCol(column, row, function (x, y, maxX, maxY) {
    return filter(x, y, maxX, maxY) && Math.abs(x) / maxX + Math.abs(y) / maxY <= 1;
  }, processor);
}

/* 根据设定的起始点与结束点，取得这两点作为对角线对应矩形范围内的元坐标集合
* @param {Array}   startUnitXY  X、Y元坐标值
* @param {Array}   endUnitXY    X、Y元坐标值
* @return {Array}  元坐标集合
*/
function getUnitsByDiagonal() {
  var startUnitXY = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];
  var endUnitXY = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];

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
  for (var x = minX; x <= maxX; x++) {
    for (var y = minY; y <= maxY; y++) {
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
    return XY * size[i] + originXY[i];
  });
}
// 精确到0.5个单位
function _half_precision(v) {
  return Math.round(v * 2) / 2;
}
/* 根据像素坐标、渲染宽高、原点像素坐标，取得元坐标
* @param {Array}   pixelXY   X、Y元坐标值
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
  var unitXY = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [0, 0];
  var diagonal = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [10, 10];
  var originXY = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : [0, 0];

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
  var pixelX = x * unitDiff * W + ox;
  var pixelY = y * unitDiff * H + oy;

  return [pixelX, pixelY];
}

/* 根据像素坐标、菱形X-Y两个方向对角线长度、原点像素坐标，取得正菱形元坐标
* @param {Array}   pixelXY    X、Y 元坐标值
* @param {Array}   diagonal  x, y 轴对应对角线长度值
* @param {Array}   originXY  基准像素点的X、Y像素坐标值
* @return {Array}  x,y 对应元坐标值
*/
function rhombusPixel2unit() {
  var pixelXY = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [0, 0];
  var diagonal = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [10, 10];
  var originXY = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : [0, 0];

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
  var filter = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : function (x, y) {
    return true;
  };
  var processor = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : function (x, y) {
    return [x, y];
  };

  var ret = [];
  var maxX = (column - 1) / 2;
  var maxY = (row - 1) / 2;
  var size = [1, 1];

  var _rhombusPixel2unit = rhombusPixel2unit([maxX, maxY], size),
      _rhombusPixel2unit2 = _slicedToArray(_rhombusPixel2unit, 2),
      maxUnitX = _rhombusPixel2unit2[0],
      maxUnitY = _rhombusPixel2unit2[1];

  var line = 0;
  for (var y = 0; y <= maxY; y += .5) {
    line++;
    for (var x = (line % 2 == 0 ? .5 : 0) - maxX; x <= maxX; x++) {
      var _rhombusPixel2unit3 = rhombusPixel2unit([x, y], size),
          _rhombusPixel2unit4 = _slicedToArray(_rhombusPixel2unit3, 2),
          unitX = _rhombusPixel2unit4[0],
          unitY = _rhombusPixel2unit4[1];

      filter(unitX, unitY, maxUnitX, maxUnitY, line) && ret.push(processor(unitX, unitY, maxUnitX, maxUnitY, line));
    }
  }
  return ret;
}

/* 在 N*N 的坐标系集合中以1位单位进行A*寻径
* @param {Array}     startUnitXY  X、Y元坐标值
* @param {Array}     endUnitXY    X、Y元坐标值
* @param {Function}  filter       自行过滤
*    比如已知当前坐标，可以根据坐标对应的精灵属性判断是否可穿越：
*    filter(x:当前位置X, y:当前位置Y, cost:位移成本(平移则为10、对角则为14), parentX:从哪个坐标过来的, parentY::从哪个坐标过来的)
* @return {Array} 匹配的路径集合或空数组
*/
var astar = function () {
    var startUnitXY = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];
    var endUnitXY = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];
    var filter = arguments[2];

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

    // 上右下左8个方向相邻单元的差值及评分权重 - 方向优先级以列表次序为准（这里后续可以适度扩展动态优先级次序）
    var referenceArr = [[1, 0, 10], [0, 1, 10], [0, -1, 10], [-1, 0, 10], [-1, -1, 14], [-1, 1, 14], [1, -1, 14], [1, 1, 14]];

    cost[startUnitXY.join()] = 0;

    // 允许用户设定筛查器；如果不设定或非function对象，则默认全量搜寻
    if (typeof filter !== 'function') {
        filter = function filter(_) {
            return true;
        };
    }
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

        for (var i = 0; i < eligiblePoints.length; i++) {
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
/**  错列或偶数个元素基于原点排列，必然会出现0.5个位移的现象  **/
/**  这刚好保证了使用unit2pixel相关方法能换算到正确的像素值  **/

// 公布tiled基本工具方法
// 公布A*寻路

exports.searchPath = astar;
exports.getUnitsByRowCol = getUnitsByRowCol;
exports.getNeighbourUnitsByRowCol = getNeighbourUnitsByRowCol;
exports.getDiagonalUnitsByRowCol = getDiagonalUnitsByRowCol;
exports.getUnitsByDiagonal = getUnitsByDiagonal;
exports.rotateUnit = rotateUnit;
exports.unit2pixel = unit2pixel;
exports.pixel2unit = pixel2unit;
exports.unit2rhombusPixel = unit2rhombusPixel;
exports.rhombusPixel2unit = rhombusPixel2unit;
exports.getStaggeredUnitsByRowCol = getStaggeredUnitsByRowCol;

Object.defineProperty(exports, '__esModule', { value: true });

})));
