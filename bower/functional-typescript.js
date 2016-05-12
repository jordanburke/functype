(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function (process,global){
 /*!
  * https://github.com/paulmillr/es6-shim
  * @license es6-shim Copyright 2013-2016 by Paul Miller (http://paulmillr.com)
  *   and contributors,  MIT License
  * es6-shim: v0.35.0
  * see https://github.com/paulmillr/es6-shim/blob/0.35.0/LICENSE
  * Details and documentation:
  * https://github.com/paulmillr/es6-shim/
  */

// UMD (Universal Module Definition)
// see https://github.com/umdjs/umd/blob/master/returnExports.js
(function (root, factory) {
  /*global define, module, exports */
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    define(factory);
  } else if (typeof exports === 'object') {
    // Node. Does not work with strict CommonJS, but
    // only CommonJS-like environments that support module.exports,
    // like Node.
    module.exports = factory();
  } else {
    // Browser globals (root is window)
    root.returnExports = factory();
  }
}(this, function () {
  'use strict';

  var _apply = Function.call.bind(Function.apply);
  var _call = Function.call.bind(Function.call);
  var isArray = Array.isArray;
  var keys = Object.keys;

  var not = function notThunker(func) {
    return function notThunk() { return !_apply(func, this, arguments); };
  };
  var throwsError = function (func) {
    try {
      func();
      return false;
    } catch (e) {
      return true;
    }
  };
  var valueOrFalseIfThrows = function valueOrFalseIfThrows(func) {
    try {
      return func();
    } catch (e) {
      return false;
    }
  };

  var isCallableWithoutNew = not(throwsError);
  var arePropertyDescriptorsSupported = function () {
    // if Object.defineProperty exists but throws, it's IE 8
    return !throwsError(function () { Object.defineProperty({}, 'x', { get: function () {} }); });
  };
  var supportsDescriptors = !!Object.defineProperty && arePropertyDescriptorsSupported();
  var functionsHaveNames = (function foo() {}).name === 'foo';

  var _forEach = Function.call.bind(Array.prototype.forEach);
  var _reduce = Function.call.bind(Array.prototype.reduce);
  var _filter = Function.call.bind(Array.prototype.filter);
  var _some = Function.call.bind(Array.prototype.some);

  var defineProperty = function (object, name, value, force) {
    if (!force && name in object) { return; }
    if (supportsDescriptors) {
      Object.defineProperty(object, name, {
        configurable: true,
        enumerable: false,
        writable: true,
        value: value
      });
    } else {
      object[name] = value;
    }
  };

  // Define configurable, writable and non-enumerable props
  // if they don’t exist.
  var defineProperties = function (object, map, forceOverride) {
    _forEach(keys(map), function (name) {
      var method = map[name];
      defineProperty(object, name, method, !!forceOverride);
    });
  };

  var _toString = Function.call.bind(Object.prototype.toString);
  var isCallable = typeof /abc/ === 'function' ? function IsCallableSlow(x) {
    // Some old browsers (IE, FF) say that typeof /abc/ === 'function'
    return typeof x === 'function' && _toString(x) === '[object Function]';
  } : function IsCallableFast(x) { return typeof x === 'function'; };

  var Value = {
    getter: function (object, name, getter) {
      if (!supportsDescriptors) {
        throw new TypeError('getters require true ES5 support');
      }
      Object.defineProperty(object, name, {
        configurable: true,
        enumerable: false,
        get: getter
      });
    },
    proxy: function (originalObject, key, targetObject) {
      if (!supportsDescriptors) {
        throw new TypeError('getters require true ES5 support');
      }
      var originalDescriptor = Object.getOwnPropertyDescriptor(originalObject, key);
      Object.defineProperty(targetObject, key, {
        configurable: originalDescriptor.configurable,
        enumerable: originalDescriptor.enumerable,
        get: function getKey() { return originalObject[key]; },
        set: function setKey(value) { originalObject[key] = value; }
      });
    },
    redefine: function (object, property, newValue) {
      if (supportsDescriptors) {
        var descriptor = Object.getOwnPropertyDescriptor(object, property);
        descriptor.value = newValue;
        Object.defineProperty(object, property, descriptor);
      } else {
        object[property] = newValue;
      }
    },
    defineByDescriptor: function (object, property, descriptor) {
      if (supportsDescriptors) {
        Object.defineProperty(object, property, descriptor);
      } else if ('value' in descriptor) {
        object[property] = descriptor.value;
      }
    },
    preserveToString: function (target, source) {
      if (source && isCallable(source.toString)) {
        defineProperty(target, 'toString', source.toString.bind(source), true);
      }
    }
  };

  // Simple shim for Object.create on ES3 browsers
  // (unlike real shim, no attempt to support `prototype === null`)
  var create = Object.create || function (prototype, properties) {
    var Prototype = function Prototype() {};
    Prototype.prototype = prototype;
    var object = new Prototype();
    if (typeof properties !== 'undefined') {
      keys(properties).forEach(function (key) {
        Value.defineByDescriptor(object, key, properties[key]);
      });
    }
    return object;
  };

  var supportsSubclassing = function (C, f) {
    if (!Object.setPrototypeOf) { return false; /* skip test on IE < 11 */ }
    return valueOrFalseIfThrows(function () {
      var Sub = function Subclass(arg) {
        var o = new C(arg);
        Object.setPrototypeOf(o, Subclass.prototype);
        return o;
      };
      Object.setPrototypeOf(Sub, C);
      Sub.prototype = create(C.prototype, {
        constructor: { value: Sub }
      });
      return f(Sub);
    });
  };

  var getGlobal = function () {
    /* global self, window, global */
    // the only reliable means to get the global object is
    // `Function('return this')()`
    // However, this causes CSP violations in Chrome apps.
    if (typeof self !== 'undefined') { return self; }
    if (typeof window !== 'undefined') { return window; }
    if (typeof global !== 'undefined') { return global; }
    throw new Error('unable to locate global object');
  };

  var globals = getGlobal();
  var globalIsFinite = globals.isFinite;
  var _indexOf = Function.call.bind(String.prototype.indexOf);
  var _arrayIndexOfApply = Function.apply.bind(Array.prototype.indexOf);
  var _concat = Function.call.bind(Array.prototype.concat);
  var _sort = Function.call.bind(Array.prototype.sort);
  var _strSlice = Function.call.bind(String.prototype.slice);
  var _push = Function.call.bind(Array.prototype.push);
  var _pushApply = Function.apply.bind(Array.prototype.push);
  var _shift = Function.call.bind(Array.prototype.shift);
  var _max = Math.max;
  var _min = Math.min;
  var _floor = Math.floor;
  var _abs = Math.abs;
  var _log = Math.log;
  var _sqrt = Math.sqrt;
  var _hasOwnProperty = Function.call.bind(Object.prototype.hasOwnProperty);
  var ArrayIterator; // make our implementation private
  var noop = function () {};

  var Symbol = globals.Symbol || {};
  var symbolSpecies = Symbol.species || '@@species';

  var numberIsNaN = Number.isNaN || function isNaN(value) {
    // NaN !== NaN, but they are identical.
    // NaNs are the only non-reflexive value, i.e., if x !== x,
    // then x is NaN.
    // isNaN is broken: it converts its argument to number, so
    // isNaN('foo') => true
    return value !== value;
  };
  var numberIsFinite = Number.isFinite || function isFinite(value) {
    return typeof value === 'number' && globalIsFinite(value);
  };

  // taken directly from https://github.com/ljharb/is-arguments/blob/master/index.js
  // can be replaced with require('is-arguments') if we ever use a build process instead
  var isStandardArguments = function isArguments(value) {
    return _toString(value) === '[object Arguments]';
  };
  var isLegacyArguments = function isArguments(value) {
    return value !== null &&
      typeof value === 'object' &&
      typeof value.length === 'number' &&
      value.length >= 0 &&
      _toString(value) !== '[object Array]' &&
      _toString(value.callee) === '[object Function]';
  };
  var isArguments = isStandardArguments(arguments) ? isStandardArguments : isLegacyArguments;

  var Type = {
    primitive: function (x) { return x === null || (typeof x !== 'function' && typeof x !== 'object'); },
    object: function (x) { return x !== null && typeof x === 'object'; },
    string: function (x) { return _toString(x) === '[object String]'; },
    regex: function (x) { return _toString(x) === '[object RegExp]'; },
    symbol: function (x) {
      return typeof globals.Symbol === 'function' && typeof x === 'symbol';
    }
  };

  var overrideNative = function overrideNative(object, property, replacement) {
    var original = object[property];
    defineProperty(object, property, replacement, true);
    Value.preserveToString(object[property], original);
  };

  var hasSymbols = typeof Symbol === 'function' && typeof Symbol['for'] === 'function' && Type.symbol(Symbol());

  // This is a private name in the es6 spec, equal to '[Symbol.iterator]'
  // we're going to use an arbitrary _-prefixed name to make our shims
  // work properly with each other, even though we don't have full Iterator
  // support.  That is, `Array.from(map.keys())` will work, but we don't
  // pretend to export a "real" Iterator interface.
  var $iterator$ = Type.symbol(Symbol.iterator) ? Symbol.iterator : '_es6-shim iterator_';
  // Firefox ships a partial implementation using the name @@iterator.
  // https://bugzilla.mozilla.org/show_bug.cgi?id=907077#c14
  // So use that name if we detect it.
  if (globals.Set && typeof new globals.Set()['@@iterator'] === 'function') {
    $iterator$ = '@@iterator';
  }

  // Reflect
  if (!globals.Reflect) {
    defineProperty(globals, 'Reflect', {}, true);
  }
  var Reflect = globals.Reflect;

  var $String = String;

  var ES = {
    // https://people.mozilla.org/~jorendorff/es6-draft.html#sec-call-f-v-args
    Call: function Call(F, V) {
      var args = arguments.length > 2 ? arguments[2] : [];
      if (!ES.IsCallable(F)) {
        throw new TypeError(F + ' is not a function');
      }
      return _apply(F, V, args);
    },

    RequireObjectCoercible: function (x, optMessage) {
      /* jshint eqnull:true */
      if (x == null) {
        throw new TypeError(optMessage || 'Cannot call method on ' + x);
      }
      return x;
    },

    // This might miss the "(non-standard exotic and does not implement
    // [[Call]])" case from
    // http://www.ecma-international.org/ecma-262/6.0/#sec-typeof-operator-runtime-semantics-evaluation
    // but we can't find any evidence these objects exist in practice.
    // If we find some in the future, you could test `Object(x) === x`,
    // which is reliable according to
    // http://www.ecma-international.org/ecma-262/6.0/#sec-toobject
    // but is not well optimized by runtimes and creates an object
    // whenever it returns false, and thus is very slow.
    TypeIsObject: function (x) {
      if (x === void 0 || x === null || x === true || x === false) {
        return false;
      }
      return typeof x === 'function' || typeof x === 'object';
    },

    ToObject: function (o, optMessage) {
      return Object(ES.RequireObjectCoercible(o, optMessage));
    },

    IsCallable: isCallable,

    IsConstructor: function (x) {
      // We can't tell callables from constructors in ES5
      return ES.IsCallable(x);
    },

    ToInt32: function (x) {
      return ES.ToNumber(x) >> 0;
    },

    ToUint32: function (x) {
      return ES.ToNumber(x) >>> 0;
    },

    ToNumber: function (value) {
      if (_toString(value) === '[object Symbol]') {
        throw new TypeError('Cannot convert a Symbol value to a number');
      }
      return +value;
    },

    ToInteger: function (value) {
      var number = ES.ToNumber(value);
      if (numberIsNaN(number)) { return 0; }
      if (number === 0 || !numberIsFinite(number)) { return number; }
      return (number > 0 ? 1 : -1) * _floor(_abs(number));
    },

    ToLength: function (value) {
      var len = ES.ToInteger(value);
      if (len <= 0) { return 0; } // includes converting -0 to +0
      if (len > Number.MAX_SAFE_INTEGER) { return Number.MAX_SAFE_INTEGER; }
      return len;
    },

    SameValue: function (a, b) {
      if (a === b) {
        // 0 === -0, but they are not identical.
        if (a === 0) { return 1 / a === 1 / b; }
        return true;
      }
      return numberIsNaN(a) && numberIsNaN(b);
    },

    SameValueZero: function (a, b) {
      // same as SameValue except for SameValueZero(+0, -0) == true
      return (a === b) || (numberIsNaN(a) && numberIsNaN(b));
    },

    IsIterable: function (o) {
      return ES.TypeIsObject(o) && (typeof o[$iterator$] !== 'undefined' || isArguments(o));
    },

    GetIterator: function (o) {
      if (isArguments(o)) {
        // special case support for `arguments`
        return new ArrayIterator(o, 'value');
      }
      var itFn = ES.GetMethod(o, $iterator$);
      if (!ES.IsCallable(itFn)) {
        // Better diagnostics if itFn is null or undefined
        throw new TypeError('value is not an iterable');
      }
      var it = ES.Call(itFn, o);
      if (!ES.TypeIsObject(it)) {
        throw new TypeError('bad iterator');
      }
      return it;
    },

    GetMethod: function (o, p) {
      var func = ES.ToObject(o)[p];
      if (func === void 0 || func === null) {
        return void 0;
      }
      if (!ES.IsCallable(func)) {
        throw new TypeError('Method not callable: ' + p);
      }
      return func;
    },

    IteratorComplete: function (iterResult) {
      return !!(iterResult.done);
    },

    IteratorClose: function (iterator, completionIsThrow) {
      var returnMethod = ES.GetMethod(iterator, 'return');
      if (returnMethod === void 0) {
        return;
      }
      var innerResult, innerException;
      try {
        innerResult = ES.Call(returnMethod, iterator);
      } catch (e) {
        innerException = e;
      }
      if (completionIsThrow) {
        return;
      }
      if (innerException) {
        throw innerException;
      }
      if (!ES.TypeIsObject(innerResult)) {
        throw new TypeError("Iterator's return method returned a non-object.");
      }
    },

    IteratorNext: function (it) {
      var result = arguments.length > 1 ? it.next(arguments[1]) : it.next();
      if (!ES.TypeIsObject(result)) {
        throw new TypeError('bad iterator');
      }
      return result;
    },

    IteratorStep: function (it) {
      var result = ES.IteratorNext(it);
      var done = ES.IteratorComplete(result);
      return done ? false : result;
    },

    Construct: function (C, args, newTarget, isES6internal) {
      var target = typeof newTarget === 'undefined' ? C : newTarget;

      if (!isES6internal && Reflect.construct) {
        // Try to use Reflect.construct if available
        return Reflect.construct(C, args, target);
      }
      // OK, we have to fake it.  This will only work if the
      // C.[[ConstructorKind]] == "base" -- but that's the only
      // kind we can make in ES5 code anyway.

      // OrdinaryCreateFromConstructor(target, "%ObjectPrototype%")
      var proto = target.prototype;
      if (!ES.TypeIsObject(proto)) {
        proto = Object.prototype;
      }
      var obj = create(proto);
      // Call the constructor.
      var result = ES.Call(C, obj, args);
      return ES.TypeIsObject(result) ? result : obj;
    },

    SpeciesConstructor: function (O, defaultConstructor) {
      var C = O.constructor;
      if (C === void 0) {
        return defaultConstructor;
      }
      if (!ES.TypeIsObject(C)) {
        throw new TypeError('Bad constructor');
      }
      var S = C[symbolSpecies];
      if (S === void 0 || S === null) {
        return defaultConstructor;
      }
      if (!ES.IsConstructor(S)) {
        throw new TypeError('Bad @@species');
      }
      return S;
    },

    CreateHTML: function (string, tag, attribute, value) {
      var S = ES.ToString(string);
      var p1 = '<' + tag;
      if (attribute !== '') {
        var V = ES.ToString(value);
        var escapedV = V.replace(/"/g, '&quot;');
        p1 += ' ' + attribute + '="' + escapedV + '"';
      }
      var p2 = p1 + '>';
      var p3 = p2 + S;
      return p3 + '</' + tag + '>';
    },

    IsRegExp: function IsRegExp(argument) {
      if (!ES.TypeIsObject(argument)) {
        return false;
      }
      var isRegExp = argument[Symbol.match];
      if (typeof isRegExp !== 'undefined') {
        return !!isRegExp;
      }
      return Type.regex(argument);
    },

    ToString: function ToString(string) {
      return $String(string);
    }
  };

  // Well-known Symbol shims
  if (supportsDescriptors && hasSymbols) {
    var defineWellKnownSymbol = function defineWellKnownSymbol(name) {
      if (Type.symbol(Symbol[name])) {
        return Symbol[name];
      }
      var sym = Symbol['for']('Symbol.' + name);
      Object.defineProperty(Symbol, name, {
        configurable: false,
        enumerable: false,
        writable: false,
        value: sym
      });
      return sym;
    };
    if (!Type.symbol(Symbol.search)) {
      var symbolSearch = defineWellKnownSymbol('search');
      var originalSearch = String.prototype.search;
      defineProperty(RegExp.prototype, symbolSearch, function search(string) {
        return ES.Call(originalSearch, string, [this]);
      });
      var searchShim = function search(regexp) {
        var O = ES.RequireObjectCoercible(this);
        if (regexp !== null && typeof regexp !== 'undefined') {
          var searcher = ES.GetMethod(regexp, symbolSearch);
          if (typeof searcher !== 'undefined') {
            return ES.Call(searcher, regexp, [O]);
          }
        }
        return ES.Call(originalSearch, O, [ES.ToString(regexp)]);
      };
      overrideNative(String.prototype, 'search', searchShim);
    }
    if (!Type.symbol(Symbol.replace)) {
      var symbolReplace = defineWellKnownSymbol('replace');
      var originalReplace = String.prototype.replace;
      defineProperty(RegExp.prototype, symbolReplace, function replace(string, replaceValue) {
        return ES.Call(originalReplace, string, [this, replaceValue]);
      });
      var replaceShim = function replace(searchValue, replaceValue) {
        var O = ES.RequireObjectCoercible(this);
        if (searchValue !== null && typeof searchValue !== 'undefined') {
          var replacer = ES.GetMethod(searchValue, symbolReplace);
          if (typeof replacer !== 'undefined') {
            return ES.Call(replacer, searchValue, [O, replaceValue]);
          }
        }
        return ES.Call(originalReplace, O, [ES.ToString(searchValue), replaceValue]);
      };
      overrideNative(String.prototype, 'replace', replaceShim);
    }
    if (!Type.symbol(Symbol.split)) {
      var symbolSplit = defineWellKnownSymbol('split');
      var originalSplit = String.prototype.split;
      defineProperty(RegExp.prototype, symbolSplit, function split(string, limit) {
        return ES.Call(originalSplit, string, [this, limit]);
      });
      var splitShim = function split(separator, limit) {
        var O = ES.RequireObjectCoercible(this);
        if (separator !== null && typeof separator !== 'undefined') {
          var splitter = ES.GetMethod(separator, symbolSplit);
          if (typeof splitter !== 'undefined') {
            return ES.Call(splitter, separator, [O, limit]);
          }
        }
        return ES.Call(originalSplit, O, [ES.ToString(separator), limit]);
      };
      overrideNative(String.prototype, 'split', splitShim);
    }
    var symbolMatchExists = Type.symbol(Symbol.match);
    var stringMatchIgnoresSymbolMatch = symbolMatchExists && (function () {
      // Firefox 41, through Nightly 45 has Symbol.match, but String#match ignores it.
      // Firefox 40 and below have Symbol.match but String#match works fine.
      var o = {};
      o[Symbol.match] = function () { return 42; };
      return 'a'.match(o) !== 42;
    }());
    if (!symbolMatchExists || stringMatchIgnoresSymbolMatch) {
      var symbolMatch = defineWellKnownSymbol('match');

      var originalMatch = String.prototype.match;
      defineProperty(RegExp.prototype, symbolMatch, function match(string) {
        return ES.Call(originalMatch, string, [this]);
      });

      var matchShim = function match(regexp) {
        var O = ES.RequireObjectCoercible(this);
        if (regexp !== null && typeof regexp !== 'undefined') {
          var matcher = ES.GetMethod(regexp, symbolMatch);
          if (typeof matcher !== 'undefined') {
            return ES.Call(matcher, regexp, [O]);
          }
        }
        return ES.Call(originalMatch, O, [ES.ToString(regexp)]);
      };
      overrideNative(String.prototype, 'match', matchShim);
    }
  }

  var wrapConstructor = function wrapConstructor(original, replacement, keysToSkip) {
    Value.preserveToString(replacement, original);
    if (Object.setPrototypeOf) {
      // sets up proper prototype chain where possible
      Object.setPrototypeOf(original, replacement);
    }
    if (supportsDescriptors) {
      _forEach(Object.getOwnPropertyNames(original), function (key) {
        if (key in noop || keysToSkip[key]) { return; }
        Value.proxy(original, key, replacement);
      });
    } else {
      _forEach(Object.keys(original), function (key) {
        if (key in noop || keysToSkip[key]) { return; }
        replacement[key] = original[key];
      });
    }
    replacement.prototype = original.prototype;
    Value.redefine(original.prototype, 'constructor', replacement);
  };

  var defaultSpeciesGetter = function () { return this; };
  var addDefaultSpecies = function (C) {
    if (supportsDescriptors && !_hasOwnProperty(C, symbolSpecies)) {
      Value.getter(C, symbolSpecies, defaultSpeciesGetter);
    }
  };

  var addIterator = function (prototype, impl) {
    var implementation = impl || function iterator() { return this; };
    defineProperty(prototype, $iterator$, implementation);
    if (!prototype[$iterator$] && Type.symbol($iterator$)) {
      // implementations are buggy when $iterator$ is a Symbol
      prototype[$iterator$] = implementation;
    }
  };

  var createDataProperty = function createDataProperty(object, name, value) {
    if (supportsDescriptors) {
      Object.defineProperty(object, name, {
        configurable: true,
        enumerable: true,
        writable: true,
        value: value
      });
    } else {
      object[name] = value;
    }
  };
  var createDataPropertyOrThrow = function createDataPropertyOrThrow(object, name, value) {
    createDataProperty(object, name, value);
    if (!ES.SameValue(object[name], value)) {
      throw new TypeError('property is nonconfigurable');
    }
  };

  var emulateES6construct = function (o, defaultNewTarget, defaultProto, slots) {
    // This is an es5 approximation to es6 construct semantics.  in es6,
    // 'new Foo' invokes Foo.[[Construct]] which (for almost all objects)
    // just sets the internal variable NewTarget (in es6 syntax `new.target`)
    // to Foo and then returns Foo().

    // Many ES6 object then have constructors of the form:
    // 1. If NewTarget is undefined, throw a TypeError exception
    // 2. Let xxx by OrdinaryCreateFromConstructor(NewTarget, yyy, zzz)

    // So we're going to emulate those first two steps.
    if (!ES.TypeIsObject(o)) {
      throw new TypeError('Constructor requires `new`: ' + defaultNewTarget.name);
    }
    var proto = defaultNewTarget.prototype;
    if (!ES.TypeIsObject(proto)) {
      proto = defaultProto;
    }
    var obj = create(proto);
    for (var name in slots) {
      if (_hasOwnProperty(slots, name)) {
        var value = slots[name];
        defineProperty(obj, name, value, true);
      }
    }
    return obj;
  };

  // Firefox 31 reports this function's length as 0
  // https://bugzilla.mozilla.org/show_bug.cgi?id=1062484
  if (String.fromCodePoint && String.fromCodePoint.length !== 1) {
    var originalFromCodePoint = String.fromCodePoint;
    overrideNative(String, 'fromCodePoint', function fromCodePoint(codePoints) { return ES.Call(originalFromCodePoint, this, arguments); });
  }

  var StringShims = {
    fromCodePoint: function fromCodePoint(codePoints) {
      var result = [];
      var next;
      for (var i = 0, length = arguments.length; i < length; i++) {
        next = Number(arguments[i]);
        if (!ES.SameValue(next, ES.ToInteger(next)) || next < 0 || next > 0x10FFFF) {
          throw new RangeError('Invalid code point ' + next);
        }

        if (next < 0x10000) {
          _push(result, String.fromCharCode(next));
        } else {
          next -= 0x10000;
          _push(result, String.fromCharCode((next >> 10) + 0xD800));
          _push(result, String.fromCharCode((next % 0x400) + 0xDC00));
        }
      }
      return result.join('');
    },

    raw: function raw(callSite) {
      var cooked = ES.ToObject(callSite, 'bad callSite');
      var rawString = ES.ToObject(cooked.raw, 'bad raw value');
      var len = rawString.length;
      var literalsegments = ES.ToLength(len);
      if (literalsegments <= 0) {
        return '';
      }

      var stringElements = [];
      var nextIndex = 0;
      var nextKey, next, nextSeg, nextSub;
      while (nextIndex < literalsegments) {
        nextKey = ES.ToString(nextIndex);
        nextSeg = ES.ToString(rawString[nextKey]);
        _push(stringElements, nextSeg);
        if (nextIndex + 1 >= literalsegments) {
          break;
        }
        next = nextIndex + 1 < arguments.length ? arguments[nextIndex + 1] : '';
        nextSub = ES.ToString(next);
        _push(stringElements, nextSub);
        nextIndex += 1;
      }
      return stringElements.join('');
    }
  };
  if (String.raw && String.raw({ raw: { 0: 'x', 1: 'y', length: 2 } }) !== 'xy') {
    // IE 11 TP has a broken String.raw implementation
    overrideNative(String, 'raw', StringShims.raw);
  }
  defineProperties(String, StringShims);

  // Fast repeat, uses the `Exponentiation by squaring` algorithm.
  // Perf: http://jsperf.com/string-repeat2/2
  var stringRepeat = function repeat(s, times) {
    if (times < 1) { return ''; }
    if (times % 2) { return repeat(s, times - 1) + s; }
    var half = repeat(s, times / 2);
    return half + half;
  };
  var stringMaxLength = Infinity;

  var StringPrototypeShims = {
    repeat: function repeat(times) {
      var thisStr = ES.ToString(ES.RequireObjectCoercible(this));
      var numTimes = ES.ToInteger(times);
      if (numTimes < 0 || numTimes >= stringMaxLength) {
        throw new RangeError('repeat count must be less than infinity and not overflow maximum string size');
      }
      return stringRepeat(thisStr, numTimes);
    },

    startsWith: function startsWith(searchString) {
      var S = ES.ToString(ES.RequireObjectCoercible(this));
      if (ES.IsRegExp(searchString)) {
        throw new TypeError('Cannot call method "startsWith" with a regex');
      }
      var searchStr = ES.ToString(searchString);
      var position;
      if (arguments.length > 1) {
        position = arguments[1];
      }
      var start = _max(ES.ToInteger(position), 0);
      return _strSlice(S, start, start + searchStr.length) === searchStr;
    },

    endsWith: function endsWith(searchString) {
      var S = ES.ToString(ES.RequireObjectCoercible(this));
      if (ES.IsRegExp(searchString)) {
        throw new TypeError('Cannot call method "endsWith" with a regex');
      }
      var searchStr = ES.ToString(searchString);
      var len = S.length;
      var endPosition;
      if (arguments.length > 1) {
        endPosition = arguments[1];
      }
      var pos = typeof endPosition === 'undefined' ? len : ES.ToInteger(endPosition);
      var end = _min(_max(pos, 0), len);
      return _strSlice(S, end - searchStr.length, end) === searchStr;
    },

    includes: function includes(searchString) {
      if (ES.IsRegExp(searchString)) {
        throw new TypeError('"includes" does not accept a RegExp');
      }
      var searchStr = ES.ToString(searchString);
      var position;
      if (arguments.length > 1) {
        position = arguments[1];
      }
      // Somehow this trick makes method 100% compat with the spec.
      return _indexOf(this, searchStr, position) !== -1;
    },

    codePointAt: function codePointAt(pos) {
      var thisStr = ES.ToString(ES.RequireObjectCoercible(this));
      var position = ES.ToInteger(pos);
      var length = thisStr.length;
      if (position >= 0 && position < length) {
        var first = thisStr.charCodeAt(position);
        var isEnd = (position + 1 === length);
        if (first < 0xD800 || first > 0xDBFF || isEnd) { return first; }
        var second = thisStr.charCodeAt(position + 1);
        if (second < 0xDC00 || second > 0xDFFF) { return first; }
        return ((first - 0xD800) * 1024) + (second - 0xDC00) + 0x10000;
      }
    }
  };
  if (String.prototype.includes && 'a'.includes('a', Infinity) !== false) {
    overrideNative(String.prototype, 'includes', StringPrototypeShims.includes);
  }

  if (String.prototype.startsWith && String.prototype.endsWith) {
    var startsWithRejectsRegex = throwsError(function () {
      /* throws if spec-compliant */
      '/a/'.startsWith(/a/);
    });
    var startsWithHandlesInfinity = valueOrFalseIfThrows(function () {
      return 'abc'.startsWith('a', Infinity) === false;
    });
    if (!startsWithRejectsRegex || !startsWithHandlesInfinity) {
      // Firefox (< 37?) and IE 11 TP have a noncompliant startsWith implementation
      overrideNative(String.prototype, 'startsWith', StringPrototypeShims.startsWith);
      overrideNative(String.prototype, 'endsWith', StringPrototypeShims.endsWith);
    }
  }
  if (hasSymbols) {
    var startsWithSupportsSymbolMatch = valueOrFalseIfThrows(function () {
      var re = /a/;
      re[Symbol.match] = false;
      return '/a/'.startsWith(re);
    });
    if (!startsWithSupportsSymbolMatch) {
      overrideNative(String.prototype, 'startsWith', StringPrototypeShims.startsWith);
    }
    var endsWithSupportsSymbolMatch = valueOrFalseIfThrows(function () {
      var re = /a/;
      re[Symbol.match] = false;
      return '/a/'.endsWith(re);
    });
    if (!endsWithSupportsSymbolMatch) {
      overrideNative(String.prototype, 'endsWith', StringPrototypeShims.endsWith);
    }
    var includesSupportsSymbolMatch = valueOrFalseIfThrows(function () {
      var re = /a/;
      re[Symbol.match] = false;
      return '/a/'.includes(re);
    });
    if (!includesSupportsSymbolMatch) {
      overrideNative(String.prototype, 'includes', StringPrototypeShims.includes);
    }
  }

  defineProperties(String.prototype, StringPrototypeShims);

  // whitespace from: http://es5.github.io/#x15.5.4.20
  // implementation from https://github.com/es-shims/es5-shim/blob/v3.4.0/es5-shim.js#L1304-L1324
  var ws = [
    '\x09\x0A\x0B\x0C\x0D\x20\xA0\u1680\u180E\u2000\u2001\u2002\u2003',
    '\u2004\u2005\u2006\u2007\u2008\u2009\u200A\u202F\u205F\u3000\u2028',
    '\u2029\uFEFF'
  ].join('');
  var trimRegexp = new RegExp('(^[' + ws + ']+)|([' + ws + ']+$)', 'g');
  var trimShim = function trim() {
    return ES.ToString(ES.RequireObjectCoercible(this)).replace(trimRegexp, '');
  };
  var nonWS = ['\u0085', '\u200b', '\ufffe'].join('');
  var nonWSregex = new RegExp('[' + nonWS + ']', 'g');
  var isBadHexRegex = /^[\-+]0x[0-9a-f]+$/i;
  var hasStringTrimBug = nonWS.trim().length !== nonWS.length;
  defineProperty(String.prototype, 'trim', trimShim, hasStringTrimBug);

  // see https://people.mozilla.org/~jorendorff/es6-draft.html#sec-string.prototype-@@iterator
  var StringIterator = function (s) {
    ES.RequireObjectCoercible(s);
    this._s = ES.ToString(s);
    this._i = 0;
  };
  StringIterator.prototype.next = function () {
    var s = this._s, i = this._i;
    if (typeof s === 'undefined' || i >= s.length) {
      this._s = void 0;
      return { value: void 0, done: true };
    }
    var first = s.charCodeAt(i), second, len;
    if (first < 0xD800 || first > 0xDBFF || (i + 1) === s.length) {
      len = 1;
    } else {
      second = s.charCodeAt(i + 1);
      len = (second < 0xDC00 || second > 0xDFFF) ? 1 : 2;
    }
    this._i = i + len;
    return { value: s.substr(i, len), done: false };
  };
  addIterator(StringIterator.prototype);
  addIterator(String.prototype, function () {
    return new StringIterator(this);
  });

  var ArrayShims = {
    from: function from(items) {
      var C = this;
      var mapFn;
      if (arguments.length > 1) {
        mapFn = arguments[1];
      }
      var mapping, T;
      if (typeof mapFn === 'undefined') {
        mapping = false;
      } else {
        if (!ES.IsCallable(mapFn)) {
          throw new TypeError('Array.from: when provided, the second argument must be a function');
        }
        if (arguments.length > 2) {
          T = arguments[2];
        }
        mapping = true;
      }

      // Note that that Arrays will use ArrayIterator:
      // https://bugs.ecmascript.org/show_bug.cgi?id=2416
      var usingIterator = typeof (isArguments(items) || ES.GetMethod(items, $iterator$)) !== 'undefined';

      var length, result, i;
      if (usingIterator) {
        result = ES.IsConstructor(C) ? Object(new C()) : [];
        var iterator = ES.GetIterator(items);
        var next, nextValue;

        i = 0;
        while (true) {
          next = ES.IteratorStep(iterator);
          if (next === false) {
            break;
          }
          nextValue = next.value;
          try {
            if (mapping) {
              nextValue = typeof T === 'undefined' ? mapFn(nextValue, i) : _call(mapFn, T, nextValue, i);
            }
            result[i] = nextValue;
          } catch (e) {
            ES.IteratorClose(iterator, true);
            throw e;
          }
          i += 1;
        }
        length = i;
      } else {
        var arrayLike = ES.ToObject(items);
        length = ES.ToLength(arrayLike.length);
        result = ES.IsConstructor(C) ? Object(new C(length)) : new Array(length);
        var value;
        for (i = 0; i < length; ++i) {
          value = arrayLike[i];
          if (mapping) {
            value = typeof T === 'undefined' ? mapFn(value, i) : _call(mapFn, T, value, i);
          }
          result[i] = value;
        }
      }

      result.length = length;
      return result;
    },

    of: function of() {
      var len = arguments.length;
      var C = this;
      var A = isArray(C) || !ES.IsCallable(C) ? new Array(len) : ES.Construct(C, [len]);
      for (var k = 0; k < len; ++k) {
        createDataPropertyOrThrow(A, k, arguments[k]);
      }
      A.length = len;
      return A;
    }
  };
  defineProperties(Array, ArrayShims);
  addDefaultSpecies(Array);

  // Given an argument x, it will return an IteratorResult object,
  // with value set to x and done to false.
  // Given no arguments, it will return an iterator completion object.
  var iteratorResult = function (x) {
    return { value: x, done: arguments.length === 0 };
  };

  // Our ArrayIterator is private; see
  // https://github.com/paulmillr/es6-shim/issues/252
  ArrayIterator = function (array, kind) {
      this.i = 0;
      this.array = array;
      this.kind = kind;
  };

  defineProperties(ArrayIterator.prototype, {
    next: function () {
      var i = this.i, array = this.array;
      if (!(this instanceof ArrayIterator)) {
        throw new TypeError('Not an ArrayIterator');
      }
      if (typeof array !== 'undefined') {
        var len = ES.ToLength(array.length);
        for (; i < len; i++) {
          var kind = this.kind;
          var retval;
          if (kind === 'key') {
            retval = i;
          } else if (kind === 'value') {
            retval = array[i];
          } else if (kind === 'entry') {
            retval = [i, array[i]];
          }
          this.i = i + 1;
          return { value: retval, done: false };
        }
      }
      this.array = void 0;
      return { value: void 0, done: true };
    }
  });
  addIterator(ArrayIterator.prototype);

  var orderKeys = function orderKeys(a, b) {
    var aNumeric = String(ES.ToInteger(a)) === a;
    var bNumeric = String(ES.ToInteger(b)) === b;
    if (aNumeric && bNumeric) {
      return b - a;
    } else if (aNumeric && !bNumeric) {
      return -1;
    } else if (!aNumeric && bNumeric) {
      return 1;
    } else {
      return a.localeCompare(b);
    }
  };
  var getAllKeys = function getAllKeys(object) {
    var ownKeys = [];
    var keys = [];

    for (var key in object) {
      _push(_hasOwnProperty(object, key) ? ownKeys : keys, key);
    }
    _sort(ownKeys, orderKeys);
    _sort(keys, orderKeys);

    return _concat(ownKeys, keys);
  };

  // note: this is positioned here because it depends on ArrayIterator
  var arrayOfSupportsSubclassing = Array.of === ArrayShims.of || (function () {
    // Detects a bug in Webkit nightly r181886
    var Foo = function Foo(len) { this.length = len; };
    Foo.prototype = [];
    var fooArr = Array.of.apply(Foo, [1, 2]);
    return fooArr instanceof Foo && fooArr.length === 2;
  }());
  if (!arrayOfSupportsSubclassing) {
    overrideNative(Array, 'of', ArrayShims.of);
  }

  var ArrayPrototypeShims = {
    copyWithin: function copyWithin(target, start) {
      var o = ES.ToObject(this);
      var len = ES.ToLength(o.length);
      var relativeTarget = ES.ToInteger(target);
      var relativeStart = ES.ToInteger(start);
      var to = relativeTarget < 0 ? _max(len + relativeTarget, 0) : _min(relativeTarget, len);
      var from = relativeStart < 0 ? _max(len + relativeStart, 0) : _min(relativeStart, len);
      var end;
      if (arguments.length > 2) {
        end = arguments[2];
      }
      var relativeEnd = typeof end === 'undefined' ? len : ES.ToInteger(end);
      var finalItem = relativeEnd < 0 ? _max(len + relativeEnd, 0) : _min(relativeEnd, len);
      var count = _min(finalItem - from, len - to);
      var direction = 1;
      if (from < to && to < (from + count)) {
        direction = -1;
        from += count - 1;
        to += count - 1;
      }
      while (count > 0) {
        if (from in o) {
          o[to] = o[from];
        } else {
          delete o[to];
        }
        from += direction;
        to += direction;
        count -= 1;
      }
      return o;
    },

    fill: function fill(value) {
      var start;
      if (arguments.length > 1) {
        start = arguments[1];
      }
      var end;
      if (arguments.length > 2) {
        end = arguments[2];
      }
      var O = ES.ToObject(this);
      var len = ES.ToLength(O.length);
      start = ES.ToInteger(typeof start === 'undefined' ? 0 : start);
      end = ES.ToInteger(typeof end === 'undefined' ? len : end);

      var relativeStart = start < 0 ? _max(len + start, 0) : _min(start, len);
      var relativeEnd = end < 0 ? len + end : end;

      for (var i = relativeStart; i < len && i < relativeEnd; ++i) {
        O[i] = value;
      }
      return O;
    },

    find: function find(predicate) {
      var list = ES.ToObject(this);
      var length = ES.ToLength(list.length);
      if (!ES.IsCallable(predicate)) {
        throw new TypeError('Array#find: predicate must be a function');
      }
      var thisArg = arguments.length > 1 ? arguments[1] : null;
      for (var i = 0, value; i < length; i++) {
        value = list[i];
        if (thisArg) {
          if (_call(predicate, thisArg, value, i, list)) { return value; }
        } else if (predicate(value, i, list)) {
          return value;
        }
      }
    },

    findIndex: function findIndex(predicate) {
      var list = ES.ToObject(this);
      var length = ES.ToLength(list.length);
      if (!ES.IsCallable(predicate)) {
        throw new TypeError('Array#findIndex: predicate must be a function');
      }
      var thisArg = arguments.length > 1 ? arguments[1] : null;
      for (var i = 0; i < length; i++) {
        if (thisArg) {
          if (_call(predicate, thisArg, list[i], i, list)) { return i; }
        } else if (predicate(list[i], i, list)) {
          return i;
        }
      }
      return -1;
    },

    keys: function keys() {
      return new ArrayIterator(this, 'key');
    },

    values: function values() {
      return new ArrayIterator(this, 'value');
    },

    entries: function entries() {
      return new ArrayIterator(this, 'entry');
    }
  };
  // Safari 7.1 defines Array#keys and Array#entries natively,
  // but the resulting ArrayIterator objects don't have a "next" method.
  if (Array.prototype.keys && !ES.IsCallable([1].keys().next)) {
    delete Array.prototype.keys;
  }
  if (Array.prototype.entries && !ES.IsCallable([1].entries().next)) {
    delete Array.prototype.entries;
  }

  // Chrome 38 defines Array#keys and Array#entries, and Array#@@iterator, but not Array#values
  if (Array.prototype.keys && Array.prototype.entries && !Array.prototype.values && Array.prototype[$iterator$]) {
    defineProperties(Array.prototype, {
      values: Array.prototype[$iterator$]
    });
    if (Type.symbol(Symbol.unscopables)) {
      Array.prototype[Symbol.unscopables].values = true;
    }
  }
  // Chrome 40 defines Array#values with the incorrect name, although Array#{keys,entries} have the correct name
  if (functionsHaveNames && Array.prototype.values && Array.prototype.values.name !== 'values') {
    var originalArrayPrototypeValues = Array.prototype.values;
    overrideNative(Array.prototype, 'values', function values() { return ES.Call(originalArrayPrototypeValues, this, arguments); });
    defineProperty(Array.prototype, $iterator$, Array.prototype.values, true);
  }
  defineProperties(Array.prototype, ArrayPrototypeShims);

  if (1 / [true].indexOf(true, -0) < 0) {
    // indexOf when given a position arg of -0 should return +0.
    // https://github.com/tc39/ecma262/pull/316
    defineProperty(Array.prototype, 'indexOf', function indexOf(searchElement) {
      var value = _arrayIndexOfApply(this, arguments);
      if (value === 0 && (1 / value) < 0) {
        return 0;
      }
      return value;
    }, true);
  }

  addIterator(Array.prototype, function () { return this.values(); });
  // Chrome defines keys/values/entries on Array, but doesn't give us
  // any way to identify its iterator.  So add our own shimmed field.
  if (Object.getPrototypeOf) {
    addIterator(Object.getPrototypeOf([].values()));
  }

  // note: this is positioned here because it relies on Array#entries
  var arrayFromSwallowsNegativeLengths = (function () {
    // Detects a Firefox bug in v32
    // https://bugzilla.mozilla.org/show_bug.cgi?id=1063993
    return valueOrFalseIfThrows(function () { return Array.from({ length: -1 }).length === 0; });
  }());
  var arrayFromHandlesIterables = (function () {
    // Detects a bug in Webkit nightly r181886
    var arr = Array.from([0].entries());
    return arr.length === 1 && isArray(arr[0]) && arr[0][0] === 0 && arr[0][1] === 0;
  }());
  if (!arrayFromSwallowsNegativeLengths || !arrayFromHandlesIterables) {
    overrideNative(Array, 'from', ArrayShims.from);
  }
  var arrayFromHandlesUndefinedMapFunction = (function () {
    // Microsoft Edge v0.11 throws if the mapFn argument is *provided* but undefined,
    // but the spec doesn't care if it's provided or not - undefined doesn't throw.
    return valueOrFalseIfThrows(function () { return Array.from([0], void 0); });
  }());
  if (!arrayFromHandlesUndefinedMapFunction) {
    var origArrayFrom = Array.from;
    overrideNative(Array, 'from', function from(items) {
      if (arguments.length > 1 && typeof arguments[1] !== 'undefined') {
        return ES.Call(origArrayFrom, this, arguments);
      } else {
        return _call(origArrayFrom, this, items);
      }
    });
  }

  var int32sAsOne = -(Math.pow(2, 32) - 1);
  var toLengthsCorrectly = function (method, reversed) {
    var obj = { length: int32sAsOne };
    obj[reversed ? ((obj.length >>> 0) - 1) : 0] = true;
    return valueOrFalseIfThrows(function () {
      _call(method, obj, function () {
        // note: in nonconforming browsers, this will be called
        // -1 >>> 0 times, which is 4294967295, so the throw matters.
        throw new RangeError('should not reach here');
      }, []);
      return true;
    });
  };
  if (!toLengthsCorrectly(Array.prototype.forEach)) {
    var originalForEach = Array.prototype.forEach;
    overrideNative(Array.prototype, 'forEach', function forEach(callbackFn) {
      return ES.Call(originalForEach, this.length >= 0 ? this : [], arguments);
    }, true);
  }
  if (!toLengthsCorrectly(Array.prototype.map)) {
    var originalMap = Array.prototype.map;
    overrideNative(Array.prototype, 'map', function map(callbackFn) {
      return ES.Call(originalMap, this.length >= 0 ? this : [], arguments);
    }, true);
  }
  if (!toLengthsCorrectly(Array.prototype.filter)) {
    var originalFilter = Array.prototype.filter;
    overrideNative(Array.prototype, 'filter', function filter(callbackFn) {
      return ES.Call(originalFilter, this.length >= 0 ? this : [], arguments);
    }, true);
  }
  if (!toLengthsCorrectly(Array.prototype.some)) {
    var originalSome = Array.prototype.some;
    overrideNative(Array.prototype, 'some', function some(callbackFn) {
      return ES.Call(originalSome, this.length >= 0 ? this : [], arguments);
    }, true);
  }
  if (!toLengthsCorrectly(Array.prototype.every)) {
    var originalEvery = Array.prototype.every;
    overrideNative(Array.prototype, 'every', function every(callbackFn) {
      return ES.Call(originalEvery, this.length >= 0 ? this : [], arguments);
    }, true);
  }
  if (!toLengthsCorrectly(Array.prototype.reduce)) {
    var originalReduce = Array.prototype.reduce;
    overrideNative(Array.prototype, 'reduce', function reduce(callbackFn) {
      return ES.Call(originalReduce, this.length >= 0 ? this : [], arguments);
    }, true);
  }
  if (!toLengthsCorrectly(Array.prototype.reduceRight, true)) {
    var originalReduceRight = Array.prototype.reduceRight;
    overrideNative(Array.prototype, 'reduceRight', function reduceRight(callbackFn) {
      return ES.Call(originalReduceRight, this.length >= 0 ? this : [], arguments);
    }, true);
  }

  var lacksOctalSupport = Number('0o10') !== 8;
  var lacksBinarySupport = Number('0b10') !== 2;
  var trimsNonWhitespace = _some(nonWS, function (c) {
    return Number(c + 0 + c) === 0;
  });
  if (lacksOctalSupport || lacksBinarySupport || trimsNonWhitespace) {
    var OrigNumber = Number;
    var binaryRegex = /^0b[01]+$/i;
    var octalRegex = /^0o[0-7]+$/i;
    // Note that in IE 8, RegExp.prototype.test doesn't seem to exist: ie, "test" is an own property of regexes. wtf.
    var isBinary = binaryRegex.test.bind(binaryRegex);
    var isOctal = octalRegex.test.bind(octalRegex);
    var toPrimitive = function (O) { // need to replace this with `es-to-primitive/es6`
      var result;
      if (typeof O.valueOf === 'function') {
        result = O.valueOf();
        if (Type.primitive(result)) {
          return result;
        }
      }
      if (typeof O.toString === 'function') {
        result = O.toString();
        if (Type.primitive(result)) {
          return result;
        }
      }
      throw new TypeError('No default value');
    };
    var hasNonWS = nonWSregex.test.bind(nonWSregex);
    var isBadHex = isBadHexRegex.test.bind(isBadHexRegex);
    var NumberShim = (function () {
      // this is wrapped in an IIFE because of IE 6-8's wacky scoping issues with named function expressions.
      var NumberShim = function Number(value) {
        var primValue;
        if (arguments.length > 0) {
          primValue = Type.primitive(value) ? value : toPrimitive(value, 'number');
        } else {
          primValue = 0;
        }
        if (typeof primValue === 'string') {
          primValue = ES.Call(trimShim, primValue);
          if (isBinary(primValue)) {
            primValue = parseInt(_strSlice(primValue, 2), 2);
          } else if (isOctal(primValue)) {
            primValue = parseInt(_strSlice(primValue, 2), 8);
          } else if (hasNonWS(primValue) || isBadHex(primValue)) {
            primValue = NaN;
          }
        }
        var receiver = this;
        var valueOfSucceeds = valueOrFalseIfThrows(function () {
          OrigNumber.prototype.valueOf.call(receiver);
          return true;
        });
        if (receiver instanceof NumberShim && !valueOfSucceeds) {
          return new OrigNumber(primValue);
        }
        /* jshint newcap: false */
        return OrigNumber(primValue);
        /* jshint newcap: true */
      };
      return NumberShim;
    }());
    wrapConstructor(OrigNumber, NumberShim, {});
    // this is necessary for ES3 browsers, where these properties are non-enumerable.
    defineProperties(NumberShim, {
      NaN: OrigNumber.NaN,
      MAX_VALUE: OrigNumber.MAX_VALUE,
      MIN_VALUE: OrigNumber.MIN_VALUE,
      NEGATIVE_INFINITY: OrigNumber.NEGATIVE_INFINITY,
      POSITIVE_INFINITY: OrigNumber.POSITIVE_INFINITY
    });
    /* globals Number: true */
    /* eslint-disable no-undef */
    /* jshint -W020 */
    Number = NumberShim;
    Value.redefine(globals, 'Number', NumberShim);
    /* jshint +W020 */
    /* eslint-enable no-undef */
    /* globals Number: false */
  }

  var maxSafeInteger = Math.pow(2, 53) - 1;
  defineProperties(Number, {
    MAX_SAFE_INTEGER: maxSafeInteger,
    MIN_SAFE_INTEGER: -maxSafeInteger,
    EPSILON: 2.220446049250313e-16,

    parseInt: globals.parseInt,
    parseFloat: globals.parseFloat,

    isFinite: numberIsFinite,

    isInteger: function isInteger(value) {
      return numberIsFinite(value) && ES.ToInteger(value) === value;
    },

    isSafeInteger: function isSafeInteger(value) {
      return Number.isInteger(value) && _abs(value) <= Number.MAX_SAFE_INTEGER;
    },

    isNaN: numberIsNaN
  });
  // Firefox 37 has a conforming Number.parseInt, but it's not === to the global parseInt (fixed in v40)
  defineProperty(Number, 'parseInt', globals.parseInt, Number.parseInt !== globals.parseInt);

  // Work around bugs in Array#find and Array#findIndex -- early
  // implementations skipped holes in sparse arrays. (Note that the
  // implementations of find/findIndex indirectly use shimmed
  // methods of Number, so this test has to happen down here.)
  /*jshint elision: true */
  /* eslint-disable no-sparse-arrays */
  if (![, 1].find(function (item, idx) { return idx === 0; })) {
    overrideNative(Array.prototype, 'find', ArrayPrototypeShims.find);
  }
  if ([, 1].findIndex(function (item, idx) { return idx === 0; }) !== 0) {
    overrideNative(Array.prototype, 'findIndex', ArrayPrototypeShims.findIndex);
  }
  /* eslint-enable no-sparse-arrays */
  /*jshint elision: false */

  var isEnumerableOn = Function.bind.call(Function.bind, Object.prototype.propertyIsEnumerable);
  var ensureEnumerable = function ensureEnumerable(obj, prop) {
    if (supportsDescriptors && isEnumerableOn(obj, prop)) {
      Object.defineProperty(obj, prop, { enumerable: false });
    }
  };
  var sliceArgs = function sliceArgs() {
    // per https://github.com/petkaantonov/bluebird/wiki/Optimization-killers#32-leaking-arguments
    // and https://gist.github.com/WebReflection/4327762cb87a8c634a29
    var initial = Number(this);
    var len = arguments.length;
    var desiredArgCount = len - initial;
    var args = new Array(desiredArgCount < 0 ? 0 : desiredArgCount);
    for (var i = initial; i < len; ++i) {
      args[i - initial] = arguments[i];
    }
    return args;
  };
  var assignTo = function assignTo(source) {
    return function assignToSource(target, key) {
      target[key] = source[key];
      return target;
    };
  };
  var assignReducer = function (target, source) {
    var sourceKeys = keys(Object(source));
    var symbols;
    if (ES.IsCallable(Object.getOwnPropertySymbols)) {
      symbols = _filter(Object.getOwnPropertySymbols(Object(source)), isEnumerableOn(source));
    }
    return _reduce(_concat(sourceKeys, symbols || []), assignTo(source), target);
  };

  var ObjectShims = {
    // 19.1.3.1
    assign: function (target, source) {
      var to = ES.ToObject(target, 'Cannot convert undefined or null to object');
      return _reduce(ES.Call(sliceArgs, 1, arguments), assignReducer, to);
    },

    // Added in WebKit in https://bugs.webkit.org/show_bug.cgi?id=143865
    is: function is(a, b) {
      return ES.SameValue(a, b);
    }
  };
  var assignHasPendingExceptions = Object.assign && Object.preventExtensions && (function () {
    // Firefox 37 still has "pending exception" logic in its Object.assign implementation,
    // which is 72% slower than our shim, and Firefox 40's native implementation.
    var thrower = Object.preventExtensions({ 1: 2 });
    try {
      Object.assign(thrower, 'xy');
    } catch (e) {
      return thrower[1] === 'y';
    }
  }());
  if (assignHasPendingExceptions) {
    overrideNative(Object, 'assign', ObjectShims.assign);
  }
  defineProperties(Object, ObjectShims);

  if (supportsDescriptors) {
    var ES5ObjectShims = {
      // 19.1.3.9
      // shim from https://gist.github.com/WebReflection/5593554
      setPrototypeOf: (function (Object, magic) {
        var set;

        var checkArgs = function (O, proto) {
          if (!ES.TypeIsObject(O)) {
            throw new TypeError('cannot set prototype on a non-object');
          }
          if (!(proto === null || ES.TypeIsObject(proto))) {
            throw new TypeError('can only set prototype to an object or null' + proto);
          }
        };

        var setPrototypeOf = function (O, proto) {
          checkArgs(O, proto);
          _call(set, O, proto);
          return O;
        };

        try {
          // this works already in Firefox and Safari
          set = Object.getOwnPropertyDescriptor(Object.prototype, magic).set;
          _call(set, {}, null);
        } catch (e) {
          if (Object.prototype !== {}[magic]) {
            // IE < 11 cannot be shimmed
            return;
          }
          // probably Chrome or some old Mobile stock browser
          set = function (proto) {
            this[magic] = proto;
          };
          // please note that this will **not** work
          // in those browsers that do not inherit
          // __proto__ by mistake from Object.prototype
          // in these cases we should probably throw an error
          // or at least be informed about the issue
          setPrototypeOf.polyfill = setPrototypeOf(
            setPrototypeOf({}, null),
            Object.prototype
          ) instanceof Object;
          // setPrototypeOf.polyfill === true means it works as meant
          // setPrototypeOf.polyfill === false means it's not 100% reliable
          // setPrototypeOf.polyfill === undefined
          // or
          // setPrototypeOf.polyfill ==  null means it's not a polyfill
          // which means it works as expected
          // we can even delete Object.prototype.__proto__;
        }
        return setPrototypeOf;
      }(Object, '__proto__'))
    };

    defineProperties(Object, ES5ObjectShims);
  }

  // Workaround bug in Opera 12 where setPrototypeOf(x, null) doesn't work,
  // but Object.create(null) does.
  if (Object.setPrototypeOf && Object.getPrototypeOf &&
      Object.getPrototypeOf(Object.setPrototypeOf({}, null)) !== null &&
      Object.getPrototypeOf(Object.create(null)) === null) {
    (function () {
      var FAKENULL = Object.create(null);
      var gpo = Object.getPrototypeOf, spo = Object.setPrototypeOf;
      Object.getPrototypeOf = function (o) {
        var result = gpo(o);
        return result === FAKENULL ? null : result;
      };
      Object.setPrototypeOf = function (o, p) {
        var proto = p === null ? FAKENULL : p;
        return spo(o, proto);
      };
      Object.setPrototypeOf.polyfill = false;
    }());
  }

  var objectKeysAcceptsPrimitives = !throwsError(function () { Object.keys('foo'); });
  if (!objectKeysAcceptsPrimitives) {
    var originalObjectKeys = Object.keys;
    overrideNative(Object, 'keys', function keys(value) {
      return originalObjectKeys(ES.ToObject(value));
    });
    keys = Object.keys;
  }
  var objectKeysRejectsRegex = throwsError(function () { Object.keys(/a/g); });
  if (objectKeysRejectsRegex) {
    var regexRejectingObjectKeys = Object.keys;
    overrideNative(Object, 'keys', function keys(value) {
      if (Type.regex(value)) {
        var regexKeys = [];
        for (var k in value) {
          if (_hasOwnProperty(value, k)) {
            _push(regexKeys, k);
          }
        }
       return regexKeys;
      }
      return regexRejectingObjectKeys(value);
    });
    keys = Object.keys;
  }

  if (Object.getOwnPropertyNames) {
    var objectGOPNAcceptsPrimitives = !throwsError(function () { Object.getOwnPropertyNames('foo'); });
    if (!objectGOPNAcceptsPrimitives) {
      var cachedWindowNames = typeof window === 'object' ? Object.getOwnPropertyNames(window) : [];
      var originalObjectGetOwnPropertyNames = Object.getOwnPropertyNames;
      overrideNative(Object, 'getOwnPropertyNames', function getOwnPropertyNames(value) {
        var val = ES.ToObject(value);
        if (_toString(val) === '[object Window]') {
          try {
            return originalObjectGetOwnPropertyNames(val);
          } catch (e) {
            // IE bug where layout engine calls userland gOPN for cross-domain `window` objects
            return _concat([], cachedWindowNames);
          }
        }
        return originalObjectGetOwnPropertyNames(val);
      });
    }
  }
  if (Object.getOwnPropertyDescriptor) {
    var objectGOPDAcceptsPrimitives = !throwsError(function () { Object.getOwnPropertyDescriptor('foo', 'bar'); });
    if (!objectGOPDAcceptsPrimitives) {
      var originalObjectGetOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;
      overrideNative(Object, 'getOwnPropertyDescriptor', function getOwnPropertyDescriptor(value, property) {
        return originalObjectGetOwnPropertyDescriptor(ES.ToObject(value), property);
      });
    }
  }
  if (Object.seal) {
    var objectSealAcceptsPrimitives = !throwsError(function () { Object.seal('foo'); });
    if (!objectSealAcceptsPrimitives) {
      var originalObjectSeal = Object.seal;
      overrideNative(Object, 'seal', function seal(value) {
        if (!Type.object(value)) { return value; }
        return originalObjectSeal(value);
      });
    }
  }
  if (Object.isSealed) {
    var objectIsSealedAcceptsPrimitives = !throwsError(function () { Object.isSealed('foo'); });
    if (!objectIsSealedAcceptsPrimitives) {
      var originalObjectIsSealed = Object.isSealed;
      overrideNative(Object, 'isSealed', function isSealed(value) {
        if (!Type.object(value)) { return true; }
        return originalObjectIsSealed(value);
      });
    }
  }
  if (Object.freeze) {
    var objectFreezeAcceptsPrimitives = !throwsError(function () { Object.freeze('foo'); });
    if (!objectFreezeAcceptsPrimitives) {
      var originalObjectFreeze = Object.freeze;
      overrideNative(Object, 'freeze', function freeze(value) {
        if (!Type.object(value)) { return value; }
        return originalObjectFreeze(value);
      });
    }
  }
  if (Object.isFrozen) {
    var objectIsFrozenAcceptsPrimitives = !throwsError(function () { Object.isFrozen('foo'); });
    if (!objectIsFrozenAcceptsPrimitives) {
      var originalObjectIsFrozen = Object.isFrozen;
      overrideNative(Object, 'isFrozen', function isFrozen(value) {
        if (!Type.object(value)) { return true; }
        return originalObjectIsFrozen(value);
      });
    }
  }
  if (Object.preventExtensions) {
    var objectPreventExtensionsAcceptsPrimitives = !throwsError(function () { Object.preventExtensions('foo'); });
    if (!objectPreventExtensionsAcceptsPrimitives) {
      var originalObjectPreventExtensions = Object.preventExtensions;
      overrideNative(Object, 'preventExtensions', function preventExtensions(value) {
        if (!Type.object(value)) { return value; }
        return originalObjectPreventExtensions(value);
      });
    }
  }
  if (Object.isExtensible) {
    var objectIsExtensibleAcceptsPrimitives = !throwsError(function () { Object.isExtensible('foo'); });
    if (!objectIsExtensibleAcceptsPrimitives) {
      var originalObjectIsExtensible = Object.isExtensible;
      overrideNative(Object, 'isExtensible', function isExtensible(value) {
        if (!Type.object(value)) { return false; }
        return originalObjectIsExtensible(value);
      });
    }
  }
  if (Object.getPrototypeOf) {
    var objectGetProtoAcceptsPrimitives = !throwsError(function () { Object.getPrototypeOf('foo'); });
    if (!objectGetProtoAcceptsPrimitives) {
      var originalGetProto = Object.getPrototypeOf;
      overrideNative(Object, 'getPrototypeOf', function getPrototypeOf(value) {
        return originalGetProto(ES.ToObject(value));
      });
    }
  }

  var hasFlags = supportsDescriptors && (function () {
    var desc = Object.getOwnPropertyDescriptor(RegExp.prototype, 'flags');
    return desc && ES.IsCallable(desc.get);
  }());
  if (supportsDescriptors && !hasFlags) {
    var regExpFlagsGetter = function flags() {
      if (!ES.TypeIsObject(this)) {
        throw new TypeError('Method called on incompatible type: must be an object.');
      }
      var result = '';
      if (this.global) {
        result += 'g';
      }
      if (this.ignoreCase) {
        result += 'i';
      }
      if (this.multiline) {
        result += 'm';
      }
      if (this.unicode) {
        result += 'u';
      }
      if (this.sticky) {
        result += 'y';
      }
      return result;
    };

    Value.getter(RegExp.prototype, 'flags', regExpFlagsGetter);
  }

  var regExpSupportsFlagsWithRegex = supportsDescriptors && valueOrFalseIfThrows(function () {
    return String(new RegExp(/a/g, 'i')) === '/a/i';
  });
  var regExpNeedsToSupportSymbolMatch = hasSymbols && supportsDescriptors && (function () {
    // Edge 0.12 supports flags fully, but does not support Symbol.match
    var regex = /./;
    regex[Symbol.match] = false;
    return RegExp(regex) === regex;
  }());

  var regexToStringIsGeneric = valueOrFalseIfThrows(function () {
    return RegExp.prototype.toString.call({ source: 'abc' }) === '/abc/';
  });
  var regexToStringSupportsGenericFlags = regexToStringIsGeneric && valueOrFalseIfThrows(function () {
    return RegExp.prototype.toString.call({ source: 'a', flags: 'b' }) === '/a/b';
  });
  if (!regexToStringIsGeneric || !regexToStringSupportsGenericFlags) {
    var origRegExpToString = RegExp.prototype.toString;
    defineProperty(RegExp.prototype, 'toString', function toString() {
      var R = ES.RequireObjectCoercible(this);
      if (Type.regex(R)) {
        return _call(origRegExpToString, R);
      }
      var pattern = $String(R.source);
      var flags = $String(R.flags);
      return '/' + pattern + '/' + flags;
    }, true);
    Value.preserveToString(RegExp.prototype.toString, origRegExpToString);
  }

  if (supportsDescriptors && (!regExpSupportsFlagsWithRegex || regExpNeedsToSupportSymbolMatch)) {
    var flagsGetter = Object.getOwnPropertyDescriptor(RegExp.prototype, 'flags').get;
    var sourceDesc = Object.getOwnPropertyDescriptor(RegExp.prototype, 'source') || {};
    var legacySourceGetter = function () { return this.source; }; // prior to it being a getter, it's own + nonconfigurable
    var sourceGetter = ES.IsCallable(sourceDesc.get) ? sourceDesc.get : legacySourceGetter;

    var OrigRegExp = RegExp;
    var RegExpShim = (function () {
      return function RegExp(pattern, flags) {
        var patternIsRegExp = ES.IsRegExp(pattern);
        var calledWithNew = this instanceof RegExp;
        if (!calledWithNew && patternIsRegExp && typeof flags === 'undefined' && pattern.constructor === RegExp) {
          return pattern;
        }

        var P = pattern;
        var F = flags;
        if (Type.regex(pattern)) {
          P = ES.Call(sourceGetter, pattern);
          F = typeof flags === 'undefined' ? ES.Call(flagsGetter, pattern) : flags;
          return new RegExp(P, F);
        } else if (patternIsRegExp) {
          P = pattern.source;
          F = typeof flags === 'undefined' ? pattern.flags : flags;
        }
        return new OrigRegExp(pattern, flags);
      };
    }());
    wrapConstructor(OrigRegExp, RegExpShim, {
      $input: true // Chrome < v39 & Opera < 26 have a nonstandard "$input" property
    });
    /* globals RegExp: true */
    /* eslint-disable no-undef */
    /* jshint -W020 */
    RegExp = RegExpShim;
    Value.redefine(globals, 'RegExp', RegExpShim);
    /* jshint +W020 */
    /* eslint-enable no-undef */
    /* globals RegExp: false */
  }

  if (supportsDescriptors) {
    var regexGlobals = {
      input: '$_',
      lastMatch: '$&',
      lastParen: '$+',
      leftContext: '$`',
      rightContext: '$\''
    };
    _forEach(keys(regexGlobals), function (prop) {
      if (prop in RegExp && !(regexGlobals[prop] in RegExp)) {
        Value.getter(RegExp, regexGlobals[prop], function get() {
          return RegExp[prop];
        });
      }
    });
  }
  addDefaultSpecies(RegExp);

  var inverseEpsilon = 1 / Number.EPSILON;
  var roundTiesToEven = function roundTiesToEven(n) {
    // Even though this reduces down to `return n`, it takes advantage of built-in rounding.
    return (n + inverseEpsilon) - inverseEpsilon;
  };
  var BINARY_32_EPSILON = Math.pow(2, -23);
  var BINARY_32_MAX_VALUE = Math.pow(2, 127) * (2 - BINARY_32_EPSILON);
  var BINARY_32_MIN_VALUE = Math.pow(2, -126);
  var numberCLZ = Number.prototype.clz;
  delete Number.prototype.clz; // Safari 8 has Number#clz

  var MathShims = {
    acosh: function acosh(value) {
      var x = Number(value);
      if (Number.isNaN(x) || value < 1) { return NaN; }
      if (x === 1) { return 0; }
      if (x === Infinity) { return x; }
      return _log(x / Math.E + _sqrt(x + 1) * _sqrt(x - 1) / Math.E) + 1;
    },

    asinh: function asinh(value) {
      var x = Number(value);
      if (x === 0 || !globalIsFinite(x)) {
        return x;
      }
      return x < 0 ? -Math.asinh(-x) : _log(x + _sqrt(x * x + 1));
    },

    atanh: function atanh(value) {
      var x = Number(value);
      if (Number.isNaN(x) || x < -1 || x > 1) {
        return NaN;
      }
      if (x === -1) { return -Infinity; }
      if (x === 1) { return Infinity; }
      if (x === 0) { return x; }
      return 0.5 * _log((1 + x) / (1 - x));
    },

    cbrt: function cbrt(value) {
      var x = Number(value);
      if (x === 0) { return x; }
      var negate = x < 0, result;
      if (negate) { x = -x; }
      if (x === Infinity) {
        result = Infinity;
      } else {
        result = Math.exp(_log(x) / 3);
        // from http://en.wikipedia.org/wiki/Cube_root#Numerical_methods
        result = (x / (result * result) + (2 * result)) / 3;
      }
      return negate ? -result : result;
    },

    clz32: function clz32(value) {
      // See https://bugs.ecmascript.org/show_bug.cgi?id=2465
      var x = Number(value);
      var number = ES.ToUint32(x);
      if (number === 0) {
        return 32;
      }
      return numberCLZ ? ES.Call(numberCLZ, number) : 31 - _floor(_log(number + 0.5) * Math.LOG2E);
    },

    cosh: function cosh(value) {
      var x = Number(value);
      if (x === 0) { return 1; } // +0 or -0
      if (Number.isNaN(x)) { return NaN; }
      if (!globalIsFinite(x)) { return Infinity; }
      if (x < 0) { x = -x; }
      if (x > 21) { return Math.exp(x) / 2; }
      return (Math.exp(x) + Math.exp(-x)) / 2;
    },

    expm1: function expm1(value) {
      var x = Number(value);
      if (x === -Infinity) { return -1; }
      if (!globalIsFinite(x) || x === 0) { return x; }
      if (_abs(x) > 0.5) {
        return Math.exp(x) - 1;
      }
      // A more precise approximation using Taylor series expansion
      // from https://github.com/paulmillr/es6-shim/issues/314#issuecomment-70293986
      var t = x;
      var sum = 0;
      var n = 1;
      while (sum + t !== sum) {
        sum += t;
        n += 1;
        t *= x / n;
      }
      return sum;
    },

    hypot: function hypot(x, y) {
      var result = 0;
      var largest = 0;
      for (var i = 0; i < arguments.length; ++i) {
        var value = _abs(Number(arguments[i]));
        if (largest < value) {
          result *= (largest / value) * (largest / value);
          result += 1;
          largest = value;
        } else {
          result += (value > 0 ? (value / largest) * (value / largest) : value);
        }
      }
      return largest === Infinity ? Infinity : largest * _sqrt(result);
    },

    log2: function log2(value) {
      return _log(value) * Math.LOG2E;
    },

    log10: function log10(value) {
      return _log(value) * Math.LOG10E;
    },

    log1p: function log1p(value) {
      var x = Number(value);
      if (x < -1 || Number.isNaN(x)) { return NaN; }
      if (x === 0 || x === Infinity) { return x; }
      if (x === -1) { return -Infinity; }

      return (1 + x) - 1 === 0 ? x : x * (_log(1 + x) / ((1 + x) - 1));
    },

    sign: function sign(value) {
      var number = Number(value);
      if (number === 0) { return number; }
      if (Number.isNaN(number)) { return number; }
      return number < 0 ? -1 : 1;
    },

    sinh: function sinh(value) {
      var x = Number(value);
      if (!globalIsFinite(x) || x === 0) { return x; }

      if (_abs(x) < 1) {
        return (Math.expm1(x) - Math.expm1(-x)) / 2;
      }
      return (Math.exp(x - 1) - Math.exp(-x - 1)) * Math.E / 2;
    },

    tanh: function tanh(value) {
      var x = Number(value);
      if (Number.isNaN(x) || x === 0) { return x; }
      // can exit early at +-20 as JS loses precision for true value at this integer
      if (x >= 20) { return 1; }
      if (x <= -20) { return -1; }
      var a = Math.expm1(x);
      var b = Math.expm1(-x);
      if (a === Infinity) { return 1; }
      if (b === Infinity) { return -1; }
      return (a - b) / (Math.exp(x) + Math.exp(-x));
    },

    trunc: function trunc(value) {
      var x = Number(value);
      return x < 0 ? -_floor(-x) : _floor(x);
    },

    imul: function imul(x, y) {
      // taken from https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/imul
      var a = ES.ToUint32(x);
      var b = ES.ToUint32(y);
      var ah = (a >>> 16) & 0xffff;
      var al = a & 0xffff;
      var bh = (b >>> 16) & 0xffff;
      var bl = b & 0xffff;
      // the shift by 0 fixes the sign on the high part
      // the final |0 converts the unsigned value into a signed value
      return ((al * bl) + (((ah * bl + al * bh) << 16) >>> 0) | 0);
    },

    fround: function fround(x) {
      var v = Number(x);
      if (v === 0 || v === Infinity || v === -Infinity || numberIsNaN(v)) {
        return v;
      }
      var sign = Math.sign(v);
      var abs = _abs(v);
      if (abs < BINARY_32_MIN_VALUE) {
        return sign * roundTiesToEven(abs / BINARY_32_MIN_VALUE / BINARY_32_EPSILON) * BINARY_32_MIN_VALUE * BINARY_32_EPSILON;
      }
      // Veltkamp's splitting (?)
      var a = (1 + BINARY_32_EPSILON / Number.EPSILON) * abs;
      var result = a - (a - abs);
      if (result > BINARY_32_MAX_VALUE || numberIsNaN(result)) {
        return sign * Infinity;
      }
      return sign * result;
    }
  };
  defineProperties(Math, MathShims);
  // IE 11 TP has an imprecise log1p: reports Math.log1p(-1e-17) as 0
  defineProperty(Math, 'log1p', MathShims.log1p, Math.log1p(-1e-17) !== -1e-17);
  // IE 11 TP has an imprecise asinh: reports Math.asinh(-1e7) as not exactly equal to -Math.asinh(1e7)
  defineProperty(Math, 'asinh', MathShims.asinh, Math.asinh(-1e7) !== -Math.asinh(1e7));
  // Chrome 40 has an imprecise Math.tanh with very small numbers
  defineProperty(Math, 'tanh', MathShims.tanh, Math.tanh(-2e-17) !== -2e-17);
  // Chrome 40 loses Math.acosh precision with high numbers
  defineProperty(Math, 'acosh', MathShims.acosh, Math.acosh(Number.MAX_VALUE) === Infinity);
  // Firefox 38 on Windows
  defineProperty(Math, 'cbrt', MathShims.cbrt, Math.abs(1 - Math.cbrt(1e-300) / 1e-100) / Number.EPSILON > 8);
  // node 0.11 has an imprecise Math.sinh with very small numbers
  defineProperty(Math, 'sinh', MathShims.sinh, Math.sinh(-2e-17) !== -2e-17);
  // FF 35 on Linux reports 22025.465794806725 for Math.expm1(10)
  var expm1OfTen = Math.expm1(10);
  defineProperty(Math, 'expm1', MathShims.expm1, expm1OfTen > 22025.465794806719 || expm1OfTen < 22025.4657948067165168);

  var origMathRound = Math.round;
  // breaks in e.g. Safari 8, Internet Explorer 11, Opera 12
  var roundHandlesBoundaryConditions = Math.round(0.5 - Number.EPSILON / 4) === 0 && Math.round(-0.5 + Number.EPSILON / 3.99) === 1;

  // When engines use Math.floor(x + 0.5) internally, Math.round can be buggy for large integers.
  // This behavior should be governed by "round to nearest, ties to even mode"
  // see https://people.mozilla.org/~jorendorff/es6-draft.html#sec-ecmascript-language-types-number-type
  // These are the boundary cases where it breaks.
  var smallestPositiveNumberWhereRoundBreaks = inverseEpsilon + 1;
  var largestPositiveNumberWhereRoundBreaks = 2 * inverseEpsilon - 1;
  var roundDoesNotIncreaseIntegers = [smallestPositiveNumberWhereRoundBreaks, largestPositiveNumberWhereRoundBreaks].every(function (num) {
    return Math.round(num) === num;
  });
  defineProperty(Math, 'round', function round(x) {
    var floor = _floor(x);
    var ceil = floor === -1 ? -0 : floor + 1;
    return x - floor < 0.5 ? floor : ceil;
  }, !roundHandlesBoundaryConditions || !roundDoesNotIncreaseIntegers);
  Value.preserveToString(Math.round, origMathRound);

  var origImul = Math.imul;
  if (Math.imul(0xffffffff, 5) !== -5) {
    // Safari 6.1, at least, reports "0" for this value
    Math.imul = MathShims.imul;
    Value.preserveToString(Math.imul, origImul);
  }
  if (Math.imul.length !== 2) {
    // Safari 8.0.4 has a length of 1
    // fixed in https://bugs.webkit.org/show_bug.cgi?id=143658
    overrideNative(Math, 'imul', function imul(x, y) {
      return ES.Call(origImul, Math, arguments);
    });
  }

  // Promises
  // Simplest possible implementation; use a 3rd-party library if you
  // want the best possible speed and/or long stack traces.
  var PromiseShim = (function () {
    var setTimeout = globals.setTimeout;
    // some environments don't have setTimeout - no way to shim here.
    if (typeof setTimeout !== 'function' && typeof setTimeout !== 'object') { return; }

    ES.IsPromise = function (promise) {
      if (!ES.TypeIsObject(promise)) {
        return false;
      }
      if (typeof promise._promise === 'undefined') {
        return false; // uninitialized, or missing our hidden field.
      }
      return true;
    };

    // "PromiseCapability" in the spec is what most promise implementations
    // call a "deferred".
    var PromiseCapability = function (C) {
      if (!ES.IsConstructor(C)) {
        throw new TypeError('Bad promise constructor');
      }
      var capability = this;
      var resolver = function (resolve, reject) {
        if (capability.resolve !== void 0 || capability.reject !== void 0) {
          throw new TypeError('Bad Promise implementation!');
        }
        capability.resolve = resolve;
        capability.reject = reject;
      };
      // Initialize fields to inform optimizers about the object shape.
      capability.resolve = void 0;
      capability.reject = void 0;
      capability.promise = new C(resolver);
      if (!(ES.IsCallable(capability.resolve) && ES.IsCallable(capability.reject))) {
        throw new TypeError('Bad promise constructor');
      }
    };

    // find an appropriate setImmediate-alike
    var makeZeroTimeout;
    /*global window */
    if (typeof window !== 'undefined' && ES.IsCallable(window.postMessage)) {
      makeZeroTimeout = function () {
        // from http://dbaron.org/log/20100309-faster-timeouts
        var timeouts = [];
        var messageName = 'zero-timeout-message';
        var setZeroTimeout = function (fn) {
          _push(timeouts, fn);
          window.postMessage(messageName, '*');
        };
        var handleMessage = function (event) {
          if (event.source === window && event.data === messageName) {
            event.stopPropagation();
            if (timeouts.length === 0) { return; }
            var fn = _shift(timeouts);
            fn();
          }
        };
        window.addEventListener('message', handleMessage, true);
        return setZeroTimeout;
      };
    }
    var makePromiseAsap = function () {
      // An efficient task-scheduler based on a pre-existing Promise
      // implementation, which we can use even if we override the
      // global Promise below (in order to workaround bugs)
      // https://github.com/Raynos/observ-hash/issues/2#issuecomment-35857671
      var P = globals.Promise;
      var pr = P && P.resolve && P.resolve();
      return pr && function (task) {
        return pr.then(task);
      };
    };
    /*global process */
    /* jscs:disable disallowMultiLineTernary */
    var enqueue = ES.IsCallable(globals.setImmediate) ?
      globals.setImmediate :
      typeof process === 'object' && process.nextTick ? process.nextTick :
      makePromiseAsap() ||
      (ES.IsCallable(makeZeroTimeout) ? makeZeroTimeout() :
      function (task) { setTimeout(task, 0); }); // fallback
    /* jscs:enable disallowMultiLineTernary */

    // Constants for Promise implementation
    var PROMISE_IDENTITY = function (x) { return x; };
    var PROMISE_THROWER = function (e) { throw e; };
    var PROMISE_PENDING = 0;
    var PROMISE_FULFILLED = 1;
    var PROMISE_REJECTED = 2;
    // We store fulfill/reject handlers and capabilities in a single array.
    var PROMISE_FULFILL_OFFSET = 0;
    var PROMISE_REJECT_OFFSET = 1;
    var PROMISE_CAPABILITY_OFFSET = 2;
    // This is used in an optimization for chaining promises via then.
    var PROMISE_FAKE_CAPABILITY = {};

    var enqueuePromiseReactionJob = function (handler, capability, argument) {
      enqueue(function () {
        promiseReactionJob(handler, capability, argument);
      });
    };

    var promiseReactionJob = function (handler, promiseCapability, argument) {
      var handlerResult, f;
      if (promiseCapability === PROMISE_FAKE_CAPABILITY) {
        // Fast case, when we don't actually need to chain through to a
        // (real) promiseCapability.
        return handler(argument);
      }
      try {
        handlerResult = handler(argument);
        f = promiseCapability.resolve;
      } catch (e) {
        handlerResult = e;
        f = promiseCapability.reject;
      }
      f(handlerResult);
    };

    var fulfillPromise = function (promise, value) {
      var _promise = promise._promise;
      var length = _promise.reactionLength;
      if (length > 0) {
        enqueuePromiseReactionJob(
          _promise.fulfillReactionHandler0,
          _promise.reactionCapability0,
          value
        );
        _promise.fulfillReactionHandler0 = void 0;
        _promise.rejectReactions0 = void 0;
        _promise.reactionCapability0 = void 0;
        if (length > 1) {
          for (var i = 1, idx = 0; i < length; i++, idx += 3) {
            enqueuePromiseReactionJob(
              _promise[idx + PROMISE_FULFILL_OFFSET],
              _promise[idx + PROMISE_CAPABILITY_OFFSET],
              value
            );
            promise[idx + PROMISE_FULFILL_OFFSET] = void 0;
            promise[idx + PROMISE_REJECT_OFFSET] = void 0;
            promise[idx + PROMISE_CAPABILITY_OFFSET] = void 0;
          }
        }
      }
      _promise.result = value;
      _promise.state = PROMISE_FULFILLED;
      _promise.reactionLength = 0;
    };

    var rejectPromise = function (promise, reason) {
      var _promise = promise._promise;
      var length = _promise.reactionLength;
      if (length > 0) {
        enqueuePromiseReactionJob(
          _promise.rejectReactionHandler0,
          _promise.reactionCapability0,
          reason
        );
        _promise.fulfillReactionHandler0 = void 0;
        _promise.rejectReactions0 = void 0;
        _promise.reactionCapability0 = void 0;
        if (length > 1) {
          for (var i = 1, idx = 0; i < length; i++, idx += 3) {
            enqueuePromiseReactionJob(
              _promise[idx + PROMISE_REJECT_OFFSET],
              _promise[idx + PROMISE_CAPABILITY_OFFSET],
              reason
            );
            promise[idx + PROMISE_FULFILL_OFFSET] = void 0;
            promise[idx + PROMISE_REJECT_OFFSET] = void 0;
            promise[idx + PROMISE_CAPABILITY_OFFSET] = void 0;
          }
        }
      }
      _promise.result = reason;
      _promise.state = PROMISE_REJECTED;
      _promise.reactionLength = 0;
    };

    var createResolvingFunctions = function (promise) {
      var alreadyResolved = false;
      var resolve = function (resolution) {
        var then;
        if (alreadyResolved) { return; }
        alreadyResolved = true;
        if (resolution === promise) {
          return rejectPromise(promise, new TypeError('Self resolution'));
        }
        if (!ES.TypeIsObject(resolution)) {
          return fulfillPromise(promise, resolution);
        }
        try {
          then = resolution.then;
        } catch (e) {
          return rejectPromise(promise, e);
        }
        if (!ES.IsCallable(then)) {
          return fulfillPromise(promise, resolution);
        }
        enqueue(function () {
          promiseResolveThenableJob(promise, resolution, then);
        });
      };
      var reject = function (reason) {
        if (alreadyResolved) { return; }
        alreadyResolved = true;
        return rejectPromise(promise, reason);
      };
      return { resolve: resolve, reject: reject };
    };

    var optimizedThen = function (then, thenable, resolve, reject) {
      // Optimization: since we discard the result, we can pass our
      // own then implementation a special hint to let it know it
      // doesn't have to create it.  (The PROMISE_FAKE_CAPABILITY
      // object is local to this implementation and unforgeable outside.)
      if (then === Promise$prototype$then) {
        _call(then, thenable, resolve, reject, PROMISE_FAKE_CAPABILITY);
      } else {
        _call(then, thenable, resolve, reject);
      }
    };
    var promiseResolveThenableJob = function (promise, thenable, then) {
      var resolvingFunctions = createResolvingFunctions(promise);
      var resolve = resolvingFunctions.resolve;
      var reject = resolvingFunctions.reject;
      try {
        optimizedThen(then, thenable, resolve, reject);
      } catch (e) {
        reject(e);
      }
    };

    var Promise$prototype, Promise$prototype$then;
    var Promise = (function () {
      var PromiseShim = function Promise(resolver) {
        if (!(this instanceof PromiseShim)) {
          throw new TypeError('Constructor Promise requires "new"');
        }
        if (this && this._promise) {
          throw new TypeError('Bad construction');
        }
        // see https://bugs.ecmascript.org/show_bug.cgi?id=2482
        if (!ES.IsCallable(resolver)) {
          throw new TypeError('not a valid resolver');
        }
        var promise = emulateES6construct(this, PromiseShim, Promise$prototype, {
          _promise: {
            result: void 0,
            state: PROMISE_PENDING,
            // The first member of the "reactions" array is inlined here,
            // since most promises only have one reaction.
            // We've also exploded the 'reaction' object to inline the
            // "handler" and "capability" fields, since both fulfill and
            // reject reactions share the same capability.
            reactionLength: 0,
            fulfillReactionHandler0: void 0,
            rejectReactionHandler0: void 0,
            reactionCapability0: void 0
          }
        });
        var resolvingFunctions = createResolvingFunctions(promise);
        var reject = resolvingFunctions.reject;
        try {
          resolver(resolvingFunctions.resolve, reject);
        } catch (e) {
          reject(e);
        }
        return promise;
      };
      return PromiseShim;
    }());
    Promise$prototype = Promise.prototype;

    var _promiseAllResolver = function (index, values, capability, remaining) {
      var alreadyCalled = false;
      return function (x) {
        if (alreadyCalled) { return; }
        alreadyCalled = true;
        values[index] = x;
        if ((--remaining.count) === 0) {
          var resolve = capability.resolve;
          resolve(values); // call w/ this===undefined
        }
      };
    };

    var performPromiseAll = function (iteratorRecord, C, resultCapability) {
      var it = iteratorRecord.iterator;
      var values = [], remaining = { count: 1 }, next, nextValue;
      var index = 0;
      while (true) {
        try {
          next = ES.IteratorStep(it);
          if (next === false) {
            iteratorRecord.done = true;
            break;
          }
          nextValue = next.value;
        } catch (e) {
          iteratorRecord.done = true;
          throw e;
        }
        values[index] = void 0;
        var nextPromise = C.resolve(nextValue);
        var resolveElement = _promiseAllResolver(
          index, values, resultCapability, remaining
        );
        remaining.count += 1;
        optimizedThen(nextPromise.then, nextPromise, resolveElement, resultCapability.reject);
        index += 1;
      }
      if ((--remaining.count) === 0) {
        var resolve = resultCapability.resolve;
        resolve(values); // call w/ this===undefined
      }
      return resultCapability.promise;
    };

    var performPromiseRace = function (iteratorRecord, C, resultCapability) {
      var it = iteratorRecord.iterator, next, nextValue, nextPromise;
      while (true) {
        try {
          next = ES.IteratorStep(it);
          if (next === false) {
            // NOTE: If iterable has no items, resulting promise will never
            // resolve; see:
            // https://github.com/domenic/promises-unwrapping/issues/75
            // https://bugs.ecmascript.org/show_bug.cgi?id=2515
            iteratorRecord.done = true;
            break;
          }
          nextValue = next.value;
        } catch (e) {
          iteratorRecord.done = true;
          throw e;
        }
        nextPromise = C.resolve(nextValue);
        optimizedThen(nextPromise.then, nextPromise, resultCapability.resolve, resultCapability.reject);
      }
      return resultCapability.promise;
    };

    defineProperties(Promise, {
      all: function all(iterable) {
        var C = this;
        if (!ES.TypeIsObject(C)) {
          throw new TypeError('Promise is not object');
        }
        var capability = new PromiseCapability(C);
        var iterator, iteratorRecord;
        try {
          iterator = ES.GetIterator(iterable);
          iteratorRecord = { iterator: iterator, done: false };
          return performPromiseAll(iteratorRecord, C, capability);
        } catch (e) {
          var exception = e;
          if (iteratorRecord && !iteratorRecord.done) {
            try {
              ES.IteratorClose(iterator, true);
            } catch (ee) {
              exception = ee;
            }
          }
          var reject = capability.reject;
          reject(exception);
          return capability.promise;
        }
      },

      race: function race(iterable) {
        var C = this;
        if (!ES.TypeIsObject(C)) {
          throw new TypeError('Promise is not object');
        }
        var capability = new PromiseCapability(C);
        var iterator, iteratorRecord;
        try {
          iterator = ES.GetIterator(iterable);
          iteratorRecord = { iterator: iterator, done: false };
          return performPromiseRace(iteratorRecord, C, capability);
        } catch (e) {
          var exception = e;
          if (iteratorRecord && !iteratorRecord.done) {
            try {
              ES.IteratorClose(iterator, true);
            } catch (ee) {
              exception = ee;
            }
          }
          var reject = capability.reject;
          reject(exception);
          return capability.promise;
        }
      },

      reject: function reject(reason) {
        var C = this;
        if (!ES.TypeIsObject(C)) {
          throw new TypeError('Bad promise constructor');
        }
        var capability = new PromiseCapability(C);
        var rejectFunc = capability.reject;
        rejectFunc(reason); // call with this===undefined
        return capability.promise;
      },

      resolve: function resolve(v) {
        // See https://esdiscuss.org/topic/fixing-promise-resolve for spec
        var C = this;
        if (!ES.TypeIsObject(C)) {
          throw new TypeError('Bad promise constructor');
        }
        if (ES.IsPromise(v)) {
          var constructor = v.constructor;
          if (constructor === C) { return v; }
        }
        var capability = new PromiseCapability(C);
        var resolveFunc = capability.resolve;
        resolveFunc(v); // call with this===undefined
        return capability.promise;
      }
    });

    defineProperties(Promise$prototype, {
      'catch': function (onRejected) {
        return this.then(null, onRejected);
      },

      then: function then(onFulfilled, onRejected) {
        var promise = this;
        if (!ES.IsPromise(promise)) { throw new TypeError('not a promise'); }
        var C = ES.SpeciesConstructor(promise, Promise);
        var resultCapability;
        var returnValueIsIgnored = arguments.length > 2 && arguments[2] === PROMISE_FAKE_CAPABILITY;
        if (returnValueIsIgnored && C === Promise) {
          resultCapability = PROMISE_FAKE_CAPABILITY;
        } else {
          resultCapability = new PromiseCapability(C);
        }
        // PerformPromiseThen(promise, onFulfilled, onRejected, resultCapability)
        // Note that we've split the 'reaction' object into its two
        // components, "capabilities" and "handler"
        // "capabilities" is always equal to `resultCapability`
        var fulfillReactionHandler = ES.IsCallable(onFulfilled) ? onFulfilled : PROMISE_IDENTITY;
        var rejectReactionHandler = ES.IsCallable(onRejected) ? onRejected : PROMISE_THROWER;
        var _promise = promise._promise;
        var value;
        if (_promise.state === PROMISE_PENDING) {
          if (_promise.reactionLength === 0) {
            _promise.fulfillReactionHandler0 = fulfillReactionHandler;
            _promise.rejectReactionHandler0 = rejectReactionHandler;
            _promise.reactionCapability0 = resultCapability;
          } else {
            var idx = 3 * (_promise.reactionLength - 1);
            _promise[idx + PROMISE_FULFILL_OFFSET] = fulfillReactionHandler;
            _promise[idx + PROMISE_REJECT_OFFSET] = rejectReactionHandler;
            _promise[idx + PROMISE_CAPABILITY_OFFSET] = resultCapability;
          }
          _promise.reactionLength += 1;
        } else if (_promise.state === PROMISE_FULFILLED) {
          value = _promise.result;
          enqueuePromiseReactionJob(
            fulfillReactionHandler, resultCapability, value
          );
        } else if (_promise.state === PROMISE_REJECTED) {
          value = _promise.result;
          enqueuePromiseReactionJob(
            rejectReactionHandler, resultCapability, value
          );
        } else {
          throw new TypeError('unexpected Promise state');
        }
        return resultCapability.promise;
      }
    });
    // This helps the optimizer by ensuring that methods which take
    // capabilities aren't polymorphic.
    PROMISE_FAKE_CAPABILITY = new PromiseCapability(Promise);
    Promise$prototype$then = Promise$prototype.then;

    return Promise;
  }());

  // Chrome's native Promise has extra methods that it shouldn't have. Let's remove them.
  if (globals.Promise) {
    delete globals.Promise.accept;
    delete globals.Promise.defer;
    delete globals.Promise.prototype.chain;
  }

  if (typeof PromiseShim === 'function') {
    // export the Promise constructor.
    defineProperties(globals, { Promise: PromiseShim });
    // In Chrome 33 (and thereabouts) Promise is defined, but the
    // implementation is buggy in a number of ways.  Let's check subclassing
    // support to see if we have a buggy implementation.
    var promiseSupportsSubclassing = supportsSubclassing(globals.Promise, function (S) {
      return S.resolve(42).then(function () {}) instanceof S;
    });
    var promiseIgnoresNonFunctionThenCallbacks = !throwsError(function () { globals.Promise.reject(42).then(null, 5).then(null, noop); });
    var promiseRequiresObjectContext = throwsError(function () { globals.Promise.call(3, noop); });
    // Promise.resolve() was errata'ed late in the ES6 process.
    // See: https://bugzilla.mozilla.org/show_bug.cgi?id=1170742
    //      https://code.google.com/p/v8/issues/detail?id=4161
    // It serves as a proxy for a number of other bugs in early Promise
    // implementations.
    var promiseResolveBroken = (function (Promise) {
      var p = Promise.resolve(5);
      p.constructor = {};
      var p2 = Promise.resolve(p);
      try {
        p2.then(null, noop).then(null, noop); // avoid "uncaught rejection" warnings in console
      } catch (e) {
        return true; // v8 native Promises break here https://code.google.com/p/chromium/issues/detail?id=575314
      }
      return p === p2; // This *should* be false!
    }(globals.Promise));

    // Chrome 46 (probably older too) does not retrieve a thenable's .then synchronously
    var getsThenSynchronously = supportsDescriptors && (function () {
      var count = 0;
      var thenable = Object.defineProperty({}, 'then', { get: function () { count += 1; } });
      Promise.resolve(thenable);
      return count === 1;
    }());

    var BadResolverPromise = function BadResolverPromise(executor) {
      var p = new Promise(executor);
      executor(3, function () {});
      this.then = p.then;
      this.constructor = BadResolverPromise;
    };
    BadResolverPromise.prototype = Promise.prototype;
    BadResolverPromise.all = Promise.all;
    // Chrome Canary 49 (probably older too) has some implementation bugs
    var hasBadResolverPromise = valueOrFalseIfThrows(function () {
      return !!BadResolverPromise.all([1, 2]);
    });

    if (!promiseSupportsSubclassing || !promiseIgnoresNonFunctionThenCallbacks ||
        !promiseRequiresObjectContext || promiseResolveBroken ||
        !getsThenSynchronously || hasBadResolverPromise) {
      /* globals Promise: true */
      /* eslint-disable no-undef */
      /* jshint -W020 */
      Promise = PromiseShim;
      /* jshint +W020 */
      /* eslint-enable no-undef */
      /* globals Promise: false */
      overrideNative(globals, 'Promise', PromiseShim);
    }
    if (Promise.all.length !== 1) {
      var origAll = Promise.all;
      overrideNative(Promise, 'all', function all(iterable) {
        return ES.Call(origAll, this, arguments);
      });
    }
    if (Promise.race.length !== 1) {
      var origRace = Promise.race;
      overrideNative(Promise, 'race', function race(iterable) {
        return ES.Call(origRace, this, arguments);
      });
    }
    if (Promise.resolve.length !== 1) {
      var origResolve = Promise.resolve;
      overrideNative(Promise, 'resolve', function resolve(x) {
        return ES.Call(origResolve, this, arguments);
      });
    }
    if (Promise.reject.length !== 1) {
      var origReject = Promise.reject;
      overrideNative(Promise, 'reject', function reject(r) {
        return ES.Call(origReject, this, arguments);
      });
    }
    ensureEnumerable(Promise, 'all');
    ensureEnumerable(Promise, 'race');
    ensureEnumerable(Promise, 'resolve');
    ensureEnumerable(Promise, 'reject');
    addDefaultSpecies(Promise);
  }

  // Map and Set require a true ES5 environment
  // Their fast path also requires that the environment preserve
  // property insertion order, which is not guaranteed by the spec.
  var testOrder = function (a) {
    var b = keys(_reduce(a, function (o, k) {
      o[k] = true;
      return o;
    }, {}));
    return a.join(':') === b.join(':');
  };
  var preservesInsertionOrder = testOrder(['z', 'a', 'bb']);
  // some engines (eg, Chrome) only preserve insertion order for string keys
  var preservesNumericInsertionOrder = testOrder(['z', 1, 'a', '3', 2]);

  if (supportsDescriptors) {

    var fastkey = function fastkey(key) {
      if (!preservesInsertionOrder) {
        return null;
      }
      if (typeof key === 'undefined' || key === null) {
        return '^' + ES.ToString(key);
      } else if (typeof key === 'string') {
        return '$' + key;
      } else if (typeof key === 'number') {
        // note that -0 will get coerced to "0" when used as a property key
        if (!preservesNumericInsertionOrder) {
          return 'n' + key;
        }
        return key;
      } else if (typeof key === 'boolean') {
        return 'b' + key;
      }
      return null;
    };

    var emptyObject = function emptyObject() {
      // accomodate some older not-quite-ES5 browsers
      return Object.create ? Object.create(null) : {};
    };

    var addIterableToMap = function addIterableToMap(MapConstructor, map, iterable) {
      if (isArray(iterable) || Type.string(iterable)) {
        _forEach(iterable, function (entry) {
          if (!ES.TypeIsObject(entry)) {
            throw new TypeError('Iterator value ' + entry + ' is not an entry object');
          }
          map.set(entry[0], entry[1]);
        });
      } else if (iterable instanceof MapConstructor) {
        _call(MapConstructor.prototype.forEach, iterable, function (value, key) {
          map.set(key, value);
        });
      } else {
        var iter, adder;
        if (iterable !== null && typeof iterable !== 'undefined') {
          adder = map.set;
          if (!ES.IsCallable(adder)) { throw new TypeError('bad map'); }
          iter = ES.GetIterator(iterable);
        }
        if (typeof iter !== 'undefined') {
          while (true) {
            var next = ES.IteratorStep(iter);
            if (next === false) { break; }
            var nextItem = next.value;
            try {
              if (!ES.TypeIsObject(nextItem)) {
                throw new TypeError('Iterator value ' + nextItem + ' is not an entry object');
              }
              _call(adder, map, nextItem[0], nextItem[1]);
            } catch (e) {
              ES.IteratorClose(iter, true);
              throw e;
            }
          }
        }
      }
    };
    var addIterableToSet = function addIterableToSet(SetConstructor, set, iterable) {
      if (isArray(iterable) || Type.string(iterable)) {
        _forEach(iterable, function (value) {
          set.add(value);
        });
      } else if (iterable instanceof SetConstructor) {
        _call(SetConstructor.prototype.forEach, iterable, function (value) {
          set.add(value);
        });
      } else {
        var iter, adder;
        if (iterable !== null && typeof iterable !== 'undefined') {
          adder = set.add;
          if (!ES.IsCallable(adder)) { throw new TypeError('bad set'); }
          iter = ES.GetIterator(iterable);
        }
        if (typeof iter !== 'undefined') {
          while (true) {
            var next = ES.IteratorStep(iter);
            if (next === false) { break; }
            var nextValue = next.value;
            try {
              _call(adder, set, nextValue);
            } catch (e) {
              ES.IteratorClose(iter, true);
              throw e;
            }
          }
        }
      }
    };

    var collectionShims = {
      Map: (function () {

        var empty = {};

        var MapEntry = function MapEntry(key, value) {
          this.key = key;
          this.value = value;
          this.next = null;
          this.prev = null;
        };

        MapEntry.prototype.isRemoved = function isRemoved() {
          return this.key === empty;
        };

        var isMap = function isMap(map) {
          return !!map._es6map;
        };

        var requireMapSlot = function requireMapSlot(map, method) {
          if (!ES.TypeIsObject(map) || !isMap(map)) {
            throw new TypeError('Method Map.prototype.' + method + ' called on incompatible receiver ' + ES.ToString(map));
          }
        };

        var MapIterator = function MapIterator(map, kind) {
          requireMapSlot(map, '[[MapIterator]]');
          this.head = map._head;
          this.i = this.head;
          this.kind = kind;
        };

        MapIterator.prototype = {
          next: function next() {
            var i = this.i, kind = this.kind, head = this.head, result;
            if (typeof this.i === 'undefined') {
              return { value: void 0, done: true };
            }
            while (i.isRemoved() && i !== head) {
              // back up off of removed entries
              i = i.prev;
            }
            // advance to next unreturned element.
            while (i.next !== head) {
              i = i.next;
              if (!i.isRemoved()) {
                if (kind === 'key') {
                  result = i.key;
                } else if (kind === 'value') {
                  result = i.value;
                } else {
                  result = [i.key, i.value];
                }
                this.i = i;
                return { value: result, done: false };
              }
            }
            // once the iterator is done, it is done forever.
            this.i = void 0;
            return { value: void 0, done: true };
          }
        };
        addIterator(MapIterator.prototype);

        var Map$prototype;
        var MapShim = function Map() {
          if (!(this instanceof Map)) {
            throw new TypeError('Constructor Map requires "new"');
          }
          if (this && this._es6map) {
            throw new TypeError('Bad construction');
          }
          var map = emulateES6construct(this, Map, Map$prototype, {
            _es6map: true,
            _head: null,
            _storage: emptyObject(),
            _size: 0
          });

          var head = new MapEntry(null, null);
          // circular doubly-linked list.
          head.next = head.prev = head;
          map._head = head;

          // Optionally initialize map from iterable
          if (arguments.length > 0) {
            addIterableToMap(Map, map, arguments[0]);
          }
          return map;
        };
        Map$prototype = MapShim.prototype;

        Value.getter(Map$prototype, 'size', function () {
          if (typeof this._size === 'undefined') {
            throw new TypeError('size method called on incompatible Map');
          }
          return this._size;
        });

        defineProperties(Map$prototype, {
          get: function get(key) {
            requireMapSlot(this, 'get');
            var fkey = fastkey(key);
            if (fkey !== null) {
              // fast O(1) path
              var entry = this._storage[fkey];
              if (entry) {
                return entry.value;
              } else {
                return;
              }
            }
            var head = this._head, i = head;
            while ((i = i.next) !== head) {
              if (ES.SameValueZero(i.key, key)) {
                return i.value;
              }
            }
          },

          has: function has(key) {
            requireMapSlot(this, 'has');
            var fkey = fastkey(key);
            if (fkey !== null) {
              // fast O(1) path
              return typeof this._storage[fkey] !== 'undefined';
            }
            var head = this._head, i = head;
            while ((i = i.next) !== head) {
              if (ES.SameValueZero(i.key, key)) {
                return true;
              }
            }
            return false;
          },

          set: function set(key, value) {
            requireMapSlot(this, 'set');
            var head = this._head, i = head, entry;
            var fkey = fastkey(key);
            if (fkey !== null) {
              // fast O(1) path
              if (typeof this._storage[fkey] !== 'undefined') {
                this._storage[fkey].value = value;
                return this;
              } else {
                entry = this._storage[fkey] = new MapEntry(key, value);
                i = head.prev;
                // fall through
              }
            }
            while ((i = i.next) !== head) {
              if (ES.SameValueZero(i.key, key)) {
                i.value = value;
                return this;
              }
            }
            entry = entry || new MapEntry(key, value);
            if (ES.SameValue(-0, key)) {
              entry.key = +0; // coerce -0 to +0 in entry
            }
            entry.next = this._head;
            entry.prev = this._head.prev;
            entry.prev.next = entry;
            entry.next.prev = entry;
            this._size += 1;
            return this;
          },

          'delete': function (key) {
            requireMapSlot(this, 'delete');
            var head = this._head, i = head;
            var fkey = fastkey(key);
            if (fkey !== null) {
              // fast O(1) path
              if (typeof this._storage[fkey] === 'undefined') {
                return false;
              }
              i = this._storage[fkey].prev;
              delete this._storage[fkey];
              // fall through
            }
            while ((i = i.next) !== head) {
              if (ES.SameValueZero(i.key, key)) {
                i.key = i.value = empty;
                i.prev.next = i.next;
                i.next.prev = i.prev;
                this._size -= 1;
                return true;
              }
            }
            return false;
          },

          clear: function clear() {
            requireMapSlot(this, 'clear');
            this._size = 0;
            this._storage = emptyObject();
            var head = this._head, i = head, p = i.next;
            while ((i = p) !== head) {
              i.key = i.value = empty;
              p = i.next;
              i.next = i.prev = head;
            }
            head.next = head.prev = head;
          },

          keys: function keys() {
            requireMapSlot(this, 'keys');
            return new MapIterator(this, 'key');
          },

          values: function values() {
            requireMapSlot(this, 'values');
            return new MapIterator(this, 'value');
          },

          entries: function entries() {
            requireMapSlot(this, 'entries');
            return new MapIterator(this, 'key+value');
          },

          forEach: function forEach(callback) {
            requireMapSlot(this, 'forEach');
            var context = arguments.length > 1 ? arguments[1] : null;
            var it = this.entries();
            for (var entry = it.next(); !entry.done; entry = it.next()) {
              if (context) {
                _call(callback, context, entry.value[1], entry.value[0], this);
              } else {
                callback(entry.value[1], entry.value[0], this);
              }
            }
          }
        });
        addIterator(Map$prototype, Map$prototype.entries);

        return MapShim;
      }()),

      Set: (function () {
        var isSet = function isSet(set) {
          return set._es6set && typeof set._storage !== 'undefined';
        };
        var requireSetSlot = function requireSetSlot(set, method) {
          if (!ES.TypeIsObject(set) || !isSet(set)) {
            // https://github.com/paulmillr/es6-shim/issues/176
            throw new TypeError('Set.prototype.' + method + ' called on incompatible receiver ' + ES.ToString(set));
          }
        };

        // Creating a Map is expensive.  To speed up the common case of
        // Sets containing only string or numeric keys, we use an object
        // as backing storage and lazily create a full Map only when
        // required.
        var Set$prototype;
        var SetShim = function Set() {
          if (!(this instanceof Set)) {
            throw new TypeError('Constructor Set requires "new"');
          }
          if (this && this._es6set) {
            throw new TypeError('Bad construction');
          }
          var set = emulateES6construct(this, Set, Set$prototype, {
            _es6set: true,
            '[[SetData]]': null,
            _storage: emptyObject()
          });
          if (!set._es6set) {
            throw new TypeError('bad set');
          }

          // Optionally initialize Set from iterable
          if (arguments.length > 0) {
            addIterableToSet(Set, set, arguments[0]);
          }
          return set;
        };
        Set$prototype = SetShim.prototype;

        var decodeKey = function (key) {
          var k = key;
          if (k === '^null') {
            return null;
          } else if (k === '^undefined') {
            return void 0;
          } else {
            var first = k.charAt(0);
            if (first === '$') {
              return _strSlice(k, 1);
            } else if (first === 'n') {
              return +_strSlice(k, 1);
            } else if (first === 'b') {
              return k === 'btrue';
            }
          }
          return +k;
        };
        // Switch from the object backing storage to a full Map.
        var ensureMap = function ensureMap(set) {
          if (!set['[[SetData]]']) {
            var m = set['[[SetData]]'] = new collectionShims.Map();
            _forEach(keys(set._storage), function (key) {
              var k = decodeKey(key);
              m.set(k, k);
            });
            set['[[SetData]]'] = m;
          }
          set._storage = null; // free old backing storage
        };

        Value.getter(SetShim.prototype, 'size', function () {
          requireSetSlot(this, 'size');
          if (this._storage) {
            return keys(this._storage).length;
          }
          ensureMap(this);
          return this['[[SetData]]'].size;
        });

        defineProperties(SetShim.prototype, {
          has: function has(key) {
            requireSetSlot(this, 'has');
            var fkey;
            if (this._storage && (fkey = fastkey(key)) !== null) {
              return !!this._storage[fkey];
            }
            ensureMap(this);
            return this['[[SetData]]'].has(key);
          },

          add: function add(key) {
            requireSetSlot(this, 'add');
            var fkey;
            if (this._storage && (fkey = fastkey(key)) !== null) {
              this._storage[fkey] = true;
              return this;
            }
            ensureMap(this);
            this['[[SetData]]'].set(key, key);
            return this;
          },

          'delete': function (key) {
            requireSetSlot(this, 'delete');
            var fkey;
            if (this._storage && (fkey = fastkey(key)) !== null) {
              var hasFKey = _hasOwnProperty(this._storage, fkey);
              return (delete this._storage[fkey]) && hasFKey;
            }
            ensureMap(this);
            return this['[[SetData]]']['delete'](key);
          },

          clear: function clear() {
            requireSetSlot(this, 'clear');
            if (this._storage) {
              this._storage = emptyObject();
            }
            if (this['[[SetData]]']) {
              this['[[SetData]]'].clear();
            }
          },

          values: function values() {
            requireSetSlot(this, 'values');
            ensureMap(this);
            return this['[[SetData]]'].values();
          },

          entries: function entries() {
            requireSetSlot(this, 'entries');
            ensureMap(this);
            return this['[[SetData]]'].entries();
          },

          forEach: function forEach(callback) {
            requireSetSlot(this, 'forEach');
            var context = arguments.length > 1 ? arguments[1] : null;
            var entireSet = this;
            ensureMap(entireSet);
            this['[[SetData]]'].forEach(function (value, key) {
              if (context) {
                _call(callback, context, key, key, entireSet);
              } else {
                callback(key, key, entireSet);
              }
            });
          }
        });
        defineProperty(SetShim.prototype, 'keys', SetShim.prototype.values, true);
        addIterator(SetShim.prototype, SetShim.prototype.values);

        return SetShim;
      }())
    };

    if (globals.Map || globals.Set) {
      // Safari 8, for example, doesn't accept an iterable.
      var mapAcceptsArguments = valueOrFalseIfThrows(function () { return new Map([[1, 2]]).get(1) === 2; });
      if (!mapAcceptsArguments) {
        var OrigMapNoArgs = globals.Map;
        globals.Map = function Map() {
          if (!(this instanceof Map)) {
            throw new TypeError('Constructor Map requires "new"');
          }
          var m = new OrigMapNoArgs();
          if (arguments.length > 0) {
            addIterableToMap(Map, m, arguments[0]);
          }
          delete m.constructor;
          Object.setPrototypeOf(m, globals.Map.prototype);
          return m;
        };
        globals.Map.prototype = create(OrigMapNoArgs.prototype);
        defineProperty(globals.Map.prototype, 'constructor', globals.Map, true);
        Value.preserveToString(globals.Map, OrigMapNoArgs);
      }
      var testMap = new Map();
      var mapUsesSameValueZero = (function () {
        // Chrome 38-42, node 0.11/0.12, iojs 1/2 also have a bug when the Map has a size > 4
        var m = new Map([[1, 0], [2, 0], [3, 0], [4, 0]]);
        m.set(-0, m);
        return m.get(0) === m && m.get(-0) === m && m.has(0) && m.has(-0);
      }());
      var mapSupportsChaining = testMap.set(1, 2) === testMap;
      if (!mapUsesSameValueZero || !mapSupportsChaining) {
        var origMapSet = Map.prototype.set;
        overrideNative(Map.prototype, 'set', function set(k, v) {
          _call(origMapSet, this, k === 0 ? 0 : k, v);
          return this;
        });
      }
      if (!mapUsesSameValueZero) {
        var origMapGet = Map.prototype.get;
        var origMapHas = Map.prototype.has;
        defineProperties(Map.prototype, {
          get: function get(k) {
            return _call(origMapGet, this, k === 0 ? 0 : k);
          },
          has: function has(k) {
            return _call(origMapHas, this, k === 0 ? 0 : k);
          }
        }, true);
        Value.preserveToString(Map.prototype.get, origMapGet);
        Value.preserveToString(Map.prototype.has, origMapHas);
      }
      var testSet = new Set();
      var setUsesSameValueZero = (function (s) {
        s['delete'](0);
        s.add(-0);
        return !s.has(0);
      }(testSet));
      var setSupportsChaining = testSet.add(1) === testSet;
      if (!setUsesSameValueZero || !setSupportsChaining) {
        var origSetAdd = Set.prototype.add;
        Set.prototype.add = function add(v) {
          _call(origSetAdd, this, v === 0 ? 0 : v);
          return this;
        };
        Value.preserveToString(Set.prototype.add, origSetAdd);
      }
      if (!setUsesSameValueZero) {
        var origSetHas = Set.prototype.has;
        Set.prototype.has = function has(v) {
          return _call(origSetHas, this, v === 0 ? 0 : v);
        };
        Value.preserveToString(Set.prototype.has, origSetHas);
        var origSetDel = Set.prototype['delete'];
        Set.prototype['delete'] = function SetDelete(v) {
          return _call(origSetDel, this, v === 0 ? 0 : v);
        };
        Value.preserveToString(Set.prototype['delete'], origSetDel);
      }
      var mapSupportsSubclassing = supportsSubclassing(globals.Map, function (M) {
        var m = new M([]);
        // Firefox 32 is ok with the instantiating the subclass but will
        // throw when the map is used.
        m.set(42, 42);
        return m instanceof M;
      });
      var mapFailsToSupportSubclassing = Object.setPrototypeOf && !mapSupportsSubclassing; // without Object.setPrototypeOf, subclassing is not possible
      var mapRequiresNew = (function () {
        try {
          return !(globals.Map() instanceof globals.Map);
        } catch (e) {
          return e instanceof TypeError;
        }
      }());
      if (globals.Map.length !== 0 || mapFailsToSupportSubclassing || !mapRequiresNew) {
        var OrigMap = globals.Map;
        globals.Map = function Map() {
          if (!(this instanceof Map)) {
            throw new TypeError('Constructor Map requires "new"');
          }
          var m = new OrigMap();
          if (arguments.length > 0) {
            addIterableToMap(Map, m, arguments[0]);
          }
          delete m.constructor;
          Object.setPrototypeOf(m, Map.prototype);
          return m;
        };
        globals.Map.prototype = OrigMap.prototype;
        defineProperty(globals.Map.prototype, 'constructor', globals.Map, true);
        Value.preserveToString(globals.Map, OrigMap);
      }
      var setSupportsSubclassing = supportsSubclassing(globals.Set, function (S) {
        var s = new S([]);
        s.add(42, 42);
        return s instanceof S;
      });
      var setFailsToSupportSubclassing = Object.setPrototypeOf && !setSupportsSubclassing; // without Object.setPrototypeOf, subclassing is not possible
      var setRequiresNew = (function () {
        try {
          return !(globals.Set() instanceof globals.Set);
        } catch (e) {
          return e instanceof TypeError;
        }
      }());
      if (globals.Set.length !== 0 || setFailsToSupportSubclassing || !setRequiresNew) {
        var OrigSet = globals.Set;
        globals.Set = function Set() {
          if (!(this instanceof Set)) {
            throw new TypeError('Constructor Set requires "new"');
          }
          var s = new OrigSet();
          if (arguments.length > 0) {
            addIterableToSet(Set, s, arguments[0]);
          }
          delete s.constructor;
          Object.setPrototypeOf(s, Set.prototype);
          return s;
        };
        globals.Set.prototype = OrigSet.prototype;
        defineProperty(globals.Set.prototype, 'constructor', globals.Set, true);
        Value.preserveToString(globals.Set, OrigSet);
      }
      var mapIterationThrowsStopIterator = !valueOrFalseIfThrows(function () {
        return (new Map()).keys().next().done;
      });
      /*
        - In Firefox < 23, Map#size is a function.
        - In all current Firefox, Set#entries/keys/values & Map#clear do not exist
        - https://bugzilla.mozilla.org/show_bug.cgi?id=869996
        - In Firefox 24, Map and Set do not implement forEach
        - In Firefox 25 at least, Map and Set are callable without "new"
      */
      if (
        typeof globals.Map.prototype.clear !== 'function' ||
        new globals.Set().size !== 0 ||
        new globals.Map().size !== 0 ||
        typeof globals.Map.prototype.keys !== 'function' ||
        typeof globals.Set.prototype.keys !== 'function' ||
        typeof globals.Map.prototype.forEach !== 'function' ||
        typeof globals.Set.prototype.forEach !== 'function' ||
        isCallableWithoutNew(globals.Map) ||
        isCallableWithoutNew(globals.Set) ||
        typeof (new globals.Map().keys().next) !== 'function' || // Safari 8
        mapIterationThrowsStopIterator || // Firefox 25
        !mapSupportsSubclassing
      ) {
        defineProperties(globals, {
          Map: collectionShims.Map,
          Set: collectionShims.Set
        }, true);
      }

      if (globals.Set.prototype.keys !== globals.Set.prototype.values) {
        // Fixed in WebKit with https://bugs.webkit.org/show_bug.cgi?id=144190
        defineProperty(globals.Set.prototype, 'keys', globals.Set.prototype.values, true);
      }

      // Shim incomplete iterator implementations.
      addIterator(Object.getPrototypeOf((new globals.Map()).keys()));
      addIterator(Object.getPrototypeOf((new globals.Set()).keys()));

      if (functionsHaveNames && globals.Set.prototype.has.name !== 'has') {
        // Microsoft Edge v0.11.10074.0 is missing a name on Set#has
        var anonymousSetHas = globals.Set.prototype.has;
        overrideNative(globals.Set.prototype, 'has', function has(key) {
          return _call(anonymousSetHas, this, key);
        });
      }
    }
    defineProperties(globals, collectionShims);
    addDefaultSpecies(globals.Map);
    addDefaultSpecies(globals.Set);
  }

  var throwUnlessTargetIsObject = function throwUnlessTargetIsObject(target) {
    if (!ES.TypeIsObject(target)) {
      throw new TypeError('target must be an object');
    }
  };

  // Some Reflect methods are basically the same as
  // those on the Object global, except that a TypeError is thrown if
  // target isn't an object. As well as returning a boolean indicating
  // the success of the operation.
  var ReflectShims = {
    // Apply method in a functional form.
    apply: function apply() {
      return ES.Call(ES.Call, null, arguments);
    },

    // New operator in a functional form.
    construct: function construct(constructor, args) {
      if (!ES.IsConstructor(constructor)) {
        throw new TypeError('First argument must be a constructor.');
      }
      var newTarget = arguments.length > 2 ? arguments[2] : constructor;
      if (!ES.IsConstructor(newTarget)) {
        throw new TypeError('new.target must be a constructor.');
      }
      return ES.Construct(constructor, args, newTarget, 'internal');
    },

    // When deleting a non-existent or configurable property,
    // true is returned.
    // When attempting to delete a non-configurable property,
    // it will return false.
    deleteProperty: function deleteProperty(target, key) {
      throwUnlessTargetIsObject(target);
      if (supportsDescriptors) {
        var desc = Object.getOwnPropertyDescriptor(target, key);

        if (desc && !desc.configurable) {
          return false;
        }
      }

      // Will return true.
      return delete target[key];
    },

    has: function has(target, key) {
      throwUnlessTargetIsObject(target);
      return key in target;
    }
  };

  if (Object.getOwnPropertyNames) {
    Object.assign(ReflectShims, {
      // Basically the result of calling the internal [[OwnPropertyKeys]].
      // Concatenating propertyNames and propertySymbols should do the trick.
      // This should continue to work together with a Symbol shim
      // which overrides Object.getOwnPropertyNames and implements
      // Object.getOwnPropertySymbols.
      ownKeys: function ownKeys(target) {
        throwUnlessTargetIsObject(target);
        var keys = Object.getOwnPropertyNames(target);

        if (ES.IsCallable(Object.getOwnPropertySymbols)) {
          _pushApply(keys, Object.getOwnPropertySymbols(target));
        }

        return keys;
      }
    });
  }

  var callAndCatchException = function ConvertExceptionToBoolean(func) {
    return !throwsError(func);
  };

  if (Object.preventExtensions) {
    Object.assign(ReflectShims, {
      isExtensible: function isExtensible(target) {
        throwUnlessTargetIsObject(target);
        return Object.isExtensible(target);
      },
      preventExtensions: function preventExtensions(target) {
        throwUnlessTargetIsObject(target);
        return callAndCatchException(function () {
          Object.preventExtensions(target);
        });
      }
    });
  }

  if (supportsDescriptors) {
    var internalGet = function get(target, key, receiver) {
      var desc = Object.getOwnPropertyDescriptor(target, key);

      if (!desc) {
        var parent = Object.getPrototypeOf(target);

        if (parent === null) {
          return void 0;
        }

        return internalGet(parent, key, receiver);
      }

      if ('value' in desc) {
        return desc.value;
      }

      if (desc.get) {
        return ES.Call(desc.get, receiver);
      }

      return void 0;
    };

    var internalSet = function set(target, key, value, receiver) {
      var desc = Object.getOwnPropertyDescriptor(target, key);

      if (!desc) {
        var parent = Object.getPrototypeOf(target);

        if (parent !== null) {
          return internalSet(parent, key, value, receiver);
        }

        desc = {
          value: void 0,
          writable: true,
          enumerable: true,
          configurable: true
        };
      }

      if ('value' in desc) {
        if (!desc.writable) {
          return false;
        }

        if (!ES.TypeIsObject(receiver)) {
          return false;
        }

        var existingDesc = Object.getOwnPropertyDescriptor(receiver, key);

        if (existingDesc) {
          return Reflect.defineProperty(receiver, key, {
            value: value
          });
        } else {
          return Reflect.defineProperty(receiver, key, {
            value: value,
            writable: true,
            enumerable: true,
            configurable: true
          });
        }
      }

      if (desc.set) {
        _call(desc.set, receiver, value);
        return true;
      }

      return false;
    };

    Object.assign(ReflectShims, {
      defineProperty: function defineProperty(target, propertyKey, attributes) {
        throwUnlessTargetIsObject(target);
        return callAndCatchException(function () {
          Object.defineProperty(target, propertyKey, attributes);
        });
      },

      getOwnPropertyDescriptor: function getOwnPropertyDescriptor(target, propertyKey) {
        throwUnlessTargetIsObject(target);
        return Object.getOwnPropertyDescriptor(target, propertyKey);
      },

      // Syntax in a functional form.
      get: function get(target, key) {
        throwUnlessTargetIsObject(target);
        var receiver = arguments.length > 2 ? arguments[2] : target;

        return internalGet(target, key, receiver);
      },

      set: function set(target, key, value) {
        throwUnlessTargetIsObject(target);
        var receiver = arguments.length > 3 ? arguments[3] : target;

        return internalSet(target, key, value, receiver);
      }
    });
  }

  if (Object.getPrototypeOf) {
    var objectDotGetPrototypeOf = Object.getPrototypeOf;
    ReflectShims.getPrototypeOf = function getPrototypeOf(target) {
      throwUnlessTargetIsObject(target);
      return objectDotGetPrototypeOf(target);
    };
  }

  if (Object.setPrototypeOf && ReflectShims.getPrototypeOf) {
    var willCreateCircularPrototype = function (object, lastProto) {
      var proto = lastProto;
      while (proto) {
        if (object === proto) {
          return true;
        }
        proto = ReflectShims.getPrototypeOf(proto);
      }
      return false;
    };

    Object.assign(ReflectShims, {
      // Sets the prototype of the given object.
      // Returns true on success, otherwise false.
      setPrototypeOf: function setPrototypeOf(object, proto) {
        throwUnlessTargetIsObject(object);
        if (proto !== null && !ES.TypeIsObject(proto)) {
          throw new TypeError('proto must be an object or null');
        }

        // If they already are the same, we're done.
        if (proto === Reflect.getPrototypeOf(object)) {
          return true;
        }

        // Cannot alter prototype if object not extensible.
        if (Reflect.isExtensible && !Reflect.isExtensible(object)) {
          return false;
        }

        // Ensure that we do not create a circular prototype chain.
        if (willCreateCircularPrototype(object, proto)) {
          return false;
        }

        Object.setPrototypeOf(object, proto);

        return true;
      }
    });
  }
  var defineOrOverrideReflectProperty = function (key, shim) {
    if (!ES.IsCallable(globals.Reflect[key])) {
      defineProperty(globals.Reflect, key, shim);
    } else {
      var acceptsPrimitives = valueOrFalseIfThrows(function () {
        globals.Reflect[key](1);
        globals.Reflect[key](NaN);
        globals.Reflect[key](true);
        return true;
      });
      if (acceptsPrimitives) {
        overrideNative(globals.Reflect, key, shim);
      }
    }
  };
  Object.keys(ReflectShims).forEach(function (key) {
    defineOrOverrideReflectProperty(key, ReflectShims[key]);
  });
  var originalReflectGetProto = globals.Reflect.getPrototypeOf;
  if (functionsHaveNames && originalReflectGetProto && originalReflectGetProto.name !== 'getPrototypeOf') {
    overrideNative(globals.Reflect, 'getPrototypeOf', function getPrototypeOf(target) {
      return _call(originalReflectGetProto, globals.Reflect, target);
    });
  }
  if (globals.Reflect.setPrototypeOf) {
    if (valueOrFalseIfThrows(function () {
      globals.Reflect.setPrototypeOf(1, {});
      return true;
    })) {
      overrideNative(globals.Reflect, 'setPrototypeOf', ReflectShims.setPrototypeOf);
    }
  }
  if (globals.Reflect.defineProperty) {
    if (!valueOrFalseIfThrows(function () {
      var basic = !globals.Reflect.defineProperty(1, 'test', { value: 1 });
      // "extensible" fails on Edge 0.12
      var extensible = typeof Object.preventExtensions !== 'function' || !globals.Reflect.defineProperty(Object.preventExtensions({}), 'test', {});
      return basic && extensible;
    })) {
      overrideNative(globals.Reflect, 'defineProperty', ReflectShims.defineProperty);
    }
  }
  if (globals.Reflect.construct) {
    if (!valueOrFalseIfThrows(function () {
      var F = function F() {};
      return globals.Reflect.construct(function () {}, [], F) instanceof F;
    })) {
      overrideNative(globals.Reflect, 'construct', ReflectShims.construct);
    }
  }

  if (String(new Date(NaN)) !== 'Invalid Date') {
    var dateToString = Date.prototype.toString;
    var shimmedDateToString = function toString() {
      var valueOf = +this;
      if (valueOf !== valueOf) {
        return 'Invalid Date';
      }
      return ES.Call(dateToString, this);
    };
    overrideNative(Date.prototype, 'toString', shimmedDateToString);
  }

  // Annex B HTML methods
  // https://people.mozilla.org/~jorendorff/es6-draft.html#sec-additional-properties-of-the-string.prototype-object
  var stringHTMLshims = {
    anchor: function anchor(name) { return ES.CreateHTML(this, 'a', 'name', name); },
    big: function big() { return ES.CreateHTML(this, 'big', '', ''); },
    blink: function blink() { return ES.CreateHTML(this, 'blink', '', ''); },
    bold: function bold() { return ES.CreateHTML(this, 'b', '', ''); },
    fixed: function fixed() { return ES.CreateHTML(this, 'tt', '', ''); },
    fontcolor: function fontcolor(color) { return ES.CreateHTML(this, 'font', 'color', color); },
    fontsize: function fontsize(size) { return ES.CreateHTML(this, 'font', 'size', size); },
    italics: function italics() { return ES.CreateHTML(this, 'i', '', ''); },
    link: function link(url) { return ES.CreateHTML(this, 'a', 'href', url); },
    small: function small() { return ES.CreateHTML(this, 'small', '', ''); },
    strike: function strike() { return ES.CreateHTML(this, 'strike', '', ''); },
    sub: function sub() { return ES.CreateHTML(this, 'sub', '', ''); },
    sup: function sub() { return ES.CreateHTML(this, 'sup', '', ''); }
  };
  _forEach(Object.keys(stringHTMLshims), function (key) {
    var method = String.prototype[key];
    var shouldOverwrite = false;
    if (ES.IsCallable(method)) {
      var output = _call(method, '', ' " ');
      var quotesCount = _concat([], output.match(/"/g)).length;
      shouldOverwrite = output !== output.toLowerCase() || quotesCount > 2;
    } else {
      shouldOverwrite = true;
    }
    if (shouldOverwrite) {
      overrideNative(String.prototype, key, stringHTMLshims[key]);
    }
  });

  var JSONstringifiesSymbols = (function () {
    // Microsoft Edge v0.12 stringifies Symbols incorrectly
    if (!hasSymbols) { return false; } // Symbols are not supported
    var stringify = typeof JSON === 'object' && typeof JSON.stringify === 'function' ? JSON.stringify : null;
    if (!stringify) { return false; } // JSON.stringify is not supported
    if (typeof stringify(Symbol()) !== 'undefined') { return true; } // Symbols should become `undefined`
    if (stringify([Symbol()]) !== '[null]') { return true; } // Symbols in arrays should become `null`
    var obj = { a: Symbol() };
    obj[Symbol()] = true;
    if (stringify(obj) !== '{}') { return true; } // Symbol-valued keys *and* Symbol-valued properties should be omitted
    return false;
  }());
  var JSONstringifyAcceptsObjectSymbol = valueOrFalseIfThrows(function () {
    // Chrome 45 throws on stringifying object symbols
    if (!hasSymbols) { return true; } // Symbols are not supported
    return JSON.stringify(Object(Symbol())) === '{}' && JSON.stringify([Object(Symbol())]) === '[{}]';
  });
  if (JSONstringifiesSymbols || !JSONstringifyAcceptsObjectSymbol) {
    var origStringify = JSON.stringify;
    overrideNative(JSON, 'stringify', function stringify(value) {
      if (typeof value === 'symbol') { return; }
      var replacer;
      if (arguments.length > 1) {
        replacer = arguments[1];
      }
      var args = [value];
      if (!isArray(replacer)) {
        var replaceFn = ES.IsCallable(replacer) ? replacer : null;
        var wrappedReplacer = function (key, val) {
          var parsedValue = replaceFn ? _call(replaceFn, this, key, val) : val;
          if (typeof parsedValue !== 'symbol') {
            if (Type.symbol(parsedValue)) {
              return assignTo({})(parsedValue);
            } else {
              return parsedValue;
            }
          }
        };
        args.push(wrappedReplacer);
      } else {
        // create wrapped replacer that handles an array replacer?
        args.push(replacer);
      }
      if (arguments.length > 2) {
        args.push(arguments[2]);
      }
      return origStringify.apply(this, args);
    });
  }

  return globals;
}));

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"_process":2}],2:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = setTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    clearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        setTimeout(drainQueue, 0);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],3:[function(require,module,exports){
"use strict";
var opt = require('./main/Option');
exports.opt = opt;
var list = require('./main/List');
exports.list = list;
var map = require('./main/Map');
exports.map = map;
/**
 * Export to public as typescript modules.
 */
/**
 * Export to public by binding them to the window property.
 */
window['App'] = {
    opt: opt,
    list: list,
    map: map
};

},{"./main/List":5,"./main/Map":6,"./main/Option":7}],4:[function(require,module,exports){
"use strict";
var IterableImpl = (function () {
    function IterableImpl(iterator) {
        this.iterator = iterator;
    }
    IterableImpl.prototype.count = function (p) {
        var count = 0;
        for (var i = this.iterator.next(); !i.done; i = this.iterator.next()) {
            var result = p(i.value);
            count = result ? count + 1 : count;
        }
        return count;
    };
    IterableImpl.prototype.forEach = function (f) {
        for (var i = this.iterator.next(); !i.done; i = this.iterator.next()) {
            f(i.value);
        }
    };
    return IterableImpl;
}());
exports.IterableImpl = IterableImpl;

},{}],5:[function(require,module,exports){
"use strict";
var Option_1 = require("./Option");
var es6_shim_1 = require("es6-shim");
Array = es6_shim_1.Array;
/**
 * An Immutable List class in similar to a Scala List. It's important to point out that this list is not infact a real
 * Linked List in the traditional sense, instead it is backed by a AypeScript/JavaScript Array for simplicity and
 * performance reasons (i.e., arrays are heavily optimized by VMs) so unless there's a good reason to impliement a
 * traditional List this will remain this way. Externally the List Interface will ensure immutabliy by returning new
 * instances of the List and will not mutate the List or the underlying Array in any way.
 */
var List = (function () {
    function List(args) {
        this.data = args.concat([]);
    }
    List.prototype.contains = function (elem) {
        return this.data.indexOf(elem) > -1;
    };
    List.prototype.count = function (p) {
        return this.data.filter(p).length;
    };
    List.prototype.forEach = function (f) {
        [].concat(this.data).forEach(f);
    };
    List.prototype.drop = function (n) {
        return list(this.data.slice(n));
    };
    List.prototype.dropRight = function (n) {
        return list(this.data.slice(0, n));
    };
    List.prototype.filter = function (p) {
        return list(this.data.filter(p));
    };
    List.prototype.filterNot = function (p) {
        var inverse = function (a) {
            return !p(a);
        };
        return list(this.data.filter(inverse));
    };
    List.prototype.find = function (p) {
        return Option_1.option(this.data.find(p));
    };
    List.prototype._ = function (index) {
        return this.get(index);
    };
    List.prototype.get = function (index) {
        return this.data[index];
    };
    List.prototype.map = function (f) {
        var newArray = this.data.map(f);
        return list(newArray);
    };
    Object.defineProperty(List.prototype, "length", {
        get: function () {
            return this.data.length;
        },
        enumerable: true,
        configurable: true
    });
    List.prototype.reduce = function (op) {
        return this.data.reduce(op);
    };
    Object.defineProperty(List.prototype, "size", {
        get: function () {
            return this.length;
        },
        enumerable: true,
        configurable: true
    });
    List.prototype.toArray = function () {
        return [].concat(this.data);
    };
    List.prototype.union = function (that) {
        if (that instanceof List) {
            return list(this.data.concat(that.toArray()));
        }
        else if (that instanceof Array) {
            return list((_a = this.data).concat.apply(_a, that));
        }
        else {
            throw "Unsupported Type " + typeof that;
        }
        var _a;
    };
    return List;
}());
exports.List = List;
function list(args) {
    return new List(args);
}
exports.list = list;

},{"./Option":7,"es6-shim":1}],6:[function(require,module,exports){
"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var Iterable_1 = require("./Iterable");
var List_1 = require("./List");
var Option_1 = require("./Option");
var es6_shim_1 = require("es6-shim");
Array = es6_shim_1.Array;
var IMap = (function () {
    function IMap(iterable) {
        var _this = this;
        this.data = new es6_shim_1.Map();
        if (iterable) {
            iterable.forEach(function (pair) {
                _this.data.set(pair[0], pair[1]);
            });
        }
    }
    IMap.prototype.count = function (p) {
        return new IMapIterator(this.data.entries()).count(p);
    };
    IMap.prototype.forEach = function (f) {
        return new IMapIterator(this.data.entries()).forEach(f);
    };
    IMap.prototype.drop = function (n) {
        var count = 0;
        var newMap = new es6_shim_1.Map();
        new IMapIterator(this.data.entries()).forEach(function (pair) {
            if (count >= n) {
                newMap.set(pair[0], pair[1]);
            }
        });
        return new IMap(new IMapIterator(this.data.entries()));
    };
    IMap.prototype.dropRight = function (n) {
        var count = this.data.size - n;
        var newMap = new es6_shim_1.Map();
        new IMapIterator(this.data.entries()).forEach(function (pair) {
            if (count < n) {
                newMap.set(pair[0], pair[1]);
            }
        });
        return new IMap(new IMapIterator(this.data.entries()));
    };
    IMap.prototype.filter = function (p) {
        var newMap = new es6_shim_1.Map();
        new IMapIterator(this.data.entries()).forEach(function (pair) {
            if (p(pair)) {
                newMap.set(pair[0], pair[1]);
            }
        });
        return new IMap(new IMapIterator(this.data.entries()));
    };
    IMap.prototype.filterNot = function (p) {
        var newMap = new es6_shim_1.Map();
        new IMapIterator(this.data.entries()).forEach(function (pair) {
            if (!p(pair)) {
                newMap.set(pair[0], pair[1]);
            }
        });
        return new IMap(new IMapIterator(this.data.entries()));
    };
    IMap.prototype.get = function (key) {
        return Option_1.option(this.data.get(key));
    };
    IMap.prototype.getOrElse = function (key, defaultValue) {
        return Option_1.option(this.data.get(key)).getOrElse(defaultValue);
    };
    Object.defineProperty(IMap.prototype, "head", {
        get: function () {
            return this.data.entries().next().value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(IMap.prototype, "headOption", {
        get: function () {
            return Option_1.option(this.data.entries().next().value);
        },
        enumerable: true,
        configurable: true
    });
    IMap.prototype.set = function (entry) {
        return iMap(List_1.list([entry]));
    };
    return IMap;
}());
exports.IMap = IMap;
function iMap(iterable) {
    return new IMap(iterable);
}
exports.iMap = iMap;
var IMapIterator = (function (_super) {
    __extends(IMapIterator, _super);
    function IMapIterator() {
        _super.apply(this, arguments);
    }
    IMapIterator.prototype.drop = function (n) {
        throw new Error();
    };
    IMapIterator.prototype.dropRight = function (n) {
        throw new Error();
    };
    IMapIterator.prototype.filter = function (p) {
        throw new Error();
    };
    IMapIterator.prototype.filterNot = function (p) {
        throw new Error();
    };
    return IMapIterator;
}(Iterable_1.IterableImpl));

},{"./Iterable":4,"./List":5,"./Option":7,"es6-shim":1}],7:[function(require,module,exports){
/**
 * Created by Jordan on 4/23/2016.
 */
"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var Option = (function () {
    function Option(value) {
        this.value = value;
    }
    Option.prototype.map = function (f) {
        return new Some(f(this.value));
    };
    Object.defineProperty(Option.prototype, "get", {
        get: function () {
            return this.value;
        },
        enumerable: true,
        configurable: true
    });
    Option.prototype.getOrElse = function (defaultValue) {
        return this.value ? this.value : defaultValue;
    };
    return Option;
}());
exports.Option = Option;
var Some = (function (_super) {
    __extends(Some, _super);
    function Some(value) {
        _super.call(this, value);
    }
    Object.defineProperty(Some.prototype, "isEmpty", {
        get: function () {
            return true;
        },
        enumerable: true,
        configurable: true
    });
    ;
    Object.defineProperty(Some.prototype, "get", {
        get: function () {
            return this.value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Some.prototype, "size", {
        get: function () {
            return 1;
        },
        enumerable: true,
        configurable: true
    });
    return Some;
}(Option));
exports.Some = Some;
var None = (function (_super) {
    __extends(None, _super);
    function None(none) {
        if (none === void 0) { none = null; }
        _super.call(this, none);
    }
    Object.defineProperty(None.prototype, "isEmpty", {
        get: function () {
            return true;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(None.prototype, "get", {
        get: function () {
            throw new Error('None.get');
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(None.prototype, "size", {
        get: function () {
            return 0;
        },
        enumerable: true,
        configurable: true
    });
    return None;
}(Option));
exports.None = None;
exports.none = new None();
function option(x) {
    return x ? some(x) : exports.none;
}
exports.option = option;
function some(x) {
    return new Some(x);
}
exports.some = some;

},{}],8:[function(require,module,exports){

},{}]},{},[3,8])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvZXM2LXNoaW0vZXM2LXNoaW0uanMiLCJub2RlX21vZHVsZXMvcHJvY2Vzcy9icm93c2VyLmpzIiwic3JjL2luZGV4LnRzIiwic3JjL21haW4vSXRlcmFibGUudHMiLCJzcmMvbWFpbi9MaXN0LnRzIiwic3JjL21haW4vTWFwLnRzIiwic3JjL21haW4vT3B0aW9uLnRzIiwidHlwaW5ncy9icm93c2VyLmQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7O0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUMxcEhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQzNGQSxJQUFZLEdBQUcsV0FBTSxlQUFlLENBQUMsQ0FBQTtBQVFuQyxXQUFHO0FBUEwsSUFBWSxJQUFJLFdBQU0sYUFBYSxDQUFDLENBQUE7QUFPN0IsWUFBSTtBQU5YLElBQVksR0FBRyxXQUFNLFlBQVksQ0FBQyxDQUFBO0FBTXJCLFdBQUc7QUFKaEI7O0dBRUc7QUFLSDs7R0FFRztBQUNILE1BQU0sQ0FBQyxLQUFLLENBQUMsR0FBRztJQUNkLEdBQUcsRUFBRSxHQUFHO0lBQ1IsSUFBSSxFQUFFLElBQUk7SUFDVixHQUFHLEVBQUUsR0FBRztDQUNULENBQUM7Ozs7QUNQRjtJQUlFLHNCQUFZLFFBQXNCO1FBQ2hDLElBQUksQ0FBQyxRQUFRLEdBQUcsUUFBUSxDQUFDO0lBQzNCLENBQUM7SUFFTSw0QkFBSyxHQUFaLFVBQWEsQ0FBc0I7UUFDakMsSUFBSSxLQUFLLEdBQUcsQ0FBQyxDQUFDO1FBQ2QsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQztZQUNyRSxJQUFNLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQzFCLEtBQUssR0FBRyxNQUFNLEdBQUcsS0FBSyxHQUFHLENBQUMsR0FBRyxLQUFLLENBQUM7UUFDckMsQ0FBQztRQUNELE1BQU0sQ0FBQyxLQUFLLENBQUM7SUFDZixDQUFDO0lBRUQsOEJBQU8sR0FBUCxVQUFRLENBQWtCO1FBQ3hCLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxFQUFFLENBQUM7WUFDckUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUNiLENBQUM7SUFDSCxDQUFDO0lBTUgsbUJBQUM7QUFBRCxDQTNCQSxBQTJCQyxJQUFBO0FBM0JxQixvQkFBWSxlQTJCakMsQ0FBQTs7OztBQ3JDRCx1QkFBNkIsVUFDN0IsQ0FBQyxDQURzQztBQUN2Qyx5QkFBZ0MsVUFDaEMsQ0FBQyxDQUR5QztBQUMxQyxLQUFLLEdBQUcsZ0JBQVEsQ0FBQztBQUVqQjs7Ozs7O0dBTUc7QUFDSDtJQUlFLGNBQVksSUFBUztRQUNuQixJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUM7SUFDOUIsQ0FBQztJQUVNLHVCQUFRLEdBQWYsVUFBZ0IsSUFBTztRQUNyQixNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7SUFDdEMsQ0FBQztJQUVNLG9CQUFLLEdBQVosVUFBYSxDQUFxQjtRQUNoQyxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDO0lBQ3BDLENBQUM7SUFFTSxzQkFBTyxHQUFkLFVBQWUsQ0FBa0I7UUFDL0IsRUFBRSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ2xDLENBQUM7SUFFTSxtQkFBSSxHQUFYLFVBQVksQ0FBVTtRQUNwQixNQUFNLENBQUMsSUFBSSxDQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDckMsQ0FBQztJQUVNLHdCQUFTLEdBQWhCLFVBQWlCLENBQVU7UUFDekIsTUFBTSxDQUFDLElBQUksQ0FBSSxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUN4QyxDQUFDO0lBRU0scUJBQU0sR0FBYixVQUFjLENBQW9CO1FBQ2hDLE1BQU0sQ0FBQyxJQUFJLENBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUN0QyxDQUFDO0lBRU0sd0JBQVMsR0FBaEIsVUFBaUIsQ0FBb0I7UUFDbkMsSUFBTSxPQUFPLEdBQUcsVUFBQyxDQUFJO1lBQ25CLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNmLENBQUMsQ0FBQztRQUNGLE1BQU0sQ0FBQyxJQUFJLENBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztJQUM1QyxDQUFDO0lBRU0sbUJBQUksR0FBWCxVQUFZLENBQW9CO1FBQzlCLE1BQU0sQ0FBQyxlQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNuQyxDQUFDO0lBRU0sZ0JBQUMsR0FBUixVQUFTLEtBQWE7UUFDcEIsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDekIsQ0FBQztJQUVNLGtCQUFHLEdBQVYsVUFBVyxLQUFjO1FBQ3ZCLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQzFCLENBQUM7SUFFTSxrQkFBRyxHQUFWLFVBQWMsQ0FBZ0I7UUFDNUIsSUFBTSxRQUFRLEdBQVMsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDeEMsTUFBTSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUN4QixDQUFDO0lBRUQsc0JBQVcsd0JBQU07YUFBakI7WUFDRSxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUM7UUFDMUIsQ0FBQzs7O09BQUE7SUFFTSxxQkFBTSxHQUFiLFVBQTRCLEVBQTBCO1FBQ3BELE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUM5QixDQUFDO0lBRUQsc0JBQVcsc0JBQUk7YUFBZjtZQUNFLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDO1FBQ3JCLENBQUM7OztPQUFBO0lBRU0sc0JBQU8sR0FBZDtRQUNFLE1BQU0sQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUM5QixDQUFDO0lBRU0sb0JBQUssR0FBWixVQUFhLElBQW1CO1FBQzlCLEVBQUUsQ0FBQyxDQUFDLElBQUksWUFBWSxJQUFJLENBQUMsQ0FBQyxDQUFDO1lBQ3pCLE1BQU0sQ0FBQyxJQUFJLENBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsQ0FBQztRQUNuRCxDQUFDO1FBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLElBQUksWUFBWSxLQUFLLENBQUMsQ0FBQSxDQUFDO1lBQ2hDLE1BQU0sQ0FBQyxJQUFJLENBQUksTUFBQSxJQUFJLENBQUMsSUFBSSxFQUFDLE1BQU0sV0FBSSxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBQzVDLENBQUM7UUFBQyxJQUFJLENBQUMsQ0FBQztZQUNOLE1BQU0sbUJBQW1CLEdBQUcsT0FBTyxJQUFJLENBQUM7UUFDMUMsQ0FBQzs7SUFDSCxDQUFDO0lBQ0gsV0FBQztBQUFELENBakZBLEFBaUZDLElBQUE7QUFqRlksWUFBSSxPQWlGaEIsQ0FBQTtBQUVELGNBQXdCLElBQVM7SUFDL0IsTUFBTSxDQUFDLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO0FBQ3hCLENBQUM7QUFGZSxZQUFJLE9BRW5CLENBQUE7Ozs7Ozs7OztBQ2pHRCx5QkFBcUMsWUFBWSxDQUFDLENBQUE7QUFDbEQscUJBQXlCLFFBQVEsQ0FBQyxDQUFBO0FBQ2xDLHVCQUE2QixVQUFVLENBQUMsQ0FBQTtBQUN4Qyx5QkFBcUMsVUFBVSxDQUFDLENBQUE7QUFDaEQsS0FBSyxHQUFHLGdCQUFRLENBQUM7QUFFakI7SUFJRSxjQUFZLFFBQTBCO1FBSnhDLGlCQWtGQztRQTdFRyxJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksY0FBRyxFQUFPLENBQUM7UUFDM0IsRUFBRSxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQztZQUNiLFFBQVEsQ0FBQyxPQUFPLENBQUMsVUFBQyxJQUFZO2dCQUM1QixLQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDbEMsQ0FBQyxDQUFDLENBQUM7UUFDTCxDQUFDO0lBQ0gsQ0FBQztJQUVNLG9CQUFLLEdBQVosVUFBYSxDQUE2QjtRQUN4QyxNQUFNLENBQUMsSUFBSSxZQUFZLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUN4RCxDQUFDO0lBRU0sc0JBQU8sR0FBZCxVQUFlLENBQXNCO1FBQ25DLE1BQU0sQ0FBQyxJQUFJLFlBQVksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQzFELENBQUM7SUFFTSxtQkFBSSxHQUFYLFVBQVksQ0FBVTtRQUNwQixJQUFJLEtBQUssR0FBRyxDQUFDLENBQUM7UUFDZCxJQUFNLE1BQU0sR0FBRyxJQUFJLGNBQUcsRUFBTyxDQUFDO1FBQzlCLElBQUksWUFBWSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsVUFBQyxJQUFZO1lBQ3hELEVBQUUsQ0FBQyxDQUFDLEtBQUssSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUNmLE1BQU0sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQy9CLENBQUM7UUFDSixDQUFDLENBQUMsQ0FBQztRQUNILE1BQU0sQ0FBQyxJQUFJLElBQUksQ0FBTSxJQUFJLFlBQVksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsQ0FBQztJQUM5RCxDQUFDO0lBRU0sd0JBQVMsR0FBaEIsVUFBaUIsQ0FBVTtRQUN6QixJQUFJLEtBQUssR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksR0FBRyxDQUFDLENBQUM7UUFDL0IsSUFBTSxNQUFNLEdBQUcsSUFBSSxjQUFHLEVBQU8sQ0FBQztRQUM5QixJQUFJLFlBQVksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLFVBQUMsSUFBWTtZQUN6RCxFQUFFLENBQUMsQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDZCxNQUFNLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUMvQixDQUFDO1FBQ0gsQ0FBQyxDQUFDLENBQUM7UUFDSCxNQUFNLENBQUMsSUFBSSxJQUFJLENBQU0sSUFBSSxZQUFZLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDOUQsQ0FBQztJQUVNLHFCQUFNLEdBQWIsVUFBYyxDQUF3QjtRQUNwQyxJQUFNLE1BQU0sR0FBRyxJQUFJLGNBQUcsRUFBTyxDQUFDO1FBQzlCLElBQUksWUFBWSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsVUFBQyxJQUFZO1lBQ3pELEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQ1osTUFBTSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDL0IsQ0FBQztRQUNILENBQUMsQ0FBQyxDQUFDO1FBQ0gsTUFBTSxDQUFDLElBQUksSUFBSSxDQUFNLElBQUksWUFBWSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQzlELENBQUM7SUFFTSx3QkFBUyxHQUFoQixVQUFpQixDQUF3QjtRQUN2QyxJQUFNLE1BQU0sR0FBRyxJQUFJLGNBQUcsRUFBTyxDQUFDO1FBQzlCLElBQUksWUFBWSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsVUFBQyxJQUFZO1lBQ3pELEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDYixNQUFNLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUMvQixDQUFDO1FBQ0gsQ0FBQyxDQUFDLENBQUM7UUFDSCxNQUFNLENBQUMsSUFBSSxJQUFJLENBQU0sSUFBSSxZQUFZLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDOUQsQ0FBQztJQUVNLGtCQUFHLEdBQVYsVUFBVyxHQUFNO1FBQ2YsTUFBTSxDQUFDLGVBQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO0lBQ3BDLENBQUM7SUFFTSx3QkFBUyxHQUFoQixVQUFpQixHQUFNLEVBQUUsWUFBZTtRQUN0QyxNQUFNLENBQUMsZUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLFlBQVksQ0FBQyxDQUFDO0lBQzVELENBQUM7SUFFRCxzQkFBVyxzQkFBSTthQUFmO1lBQ0UsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUMsSUFBSSxFQUFFLENBQUMsS0FBSyxDQUFDO1FBQzFDLENBQUM7OztPQUFBO0lBRUQsc0JBQVcsNEJBQVU7YUFBckI7WUFDRSxNQUFNLENBQUMsZUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUMsSUFBSSxFQUFFLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDbEQsQ0FBQzs7O09BQUE7SUFFTSxrQkFBRyxHQUFWLFVBQVcsS0FBWTtRQUNyQixNQUFNLENBQUMsSUFBSSxDQUFDLFdBQUksQ0FBUSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNwQyxDQUFDO0lBQ0gsV0FBQztBQUFELENBbEZBLEFBa0ZDLElBQUE7QUFsRlksWUFBSSxPQWtGaEIsQ0FBQTtBQUVELGNBQTBCLFFBQTBCO0lBQ2xELE1BQU0sQ0FBQyxJQUFJLElBQUksQ0FBTSxRQUFRLENBQUMsQ0FBQztBQUNqQyxDQUFDO0FBRmUsWUFBSSxPQUVuQixDQUFBO0FBRUQ7SUFBOEIsZ0NBQWU7SUFBN0M7UUFBOEIsOEJBQWU7SUFhN0MsQ0FBQztJQVpDLDJCQUFJLEdBQUosVUFBSyxDQUFVO1FBQ2IsTUFBTSxJQUFJLEtBQUssRUFBRSxDQUFDO0lBQ3BCLENBQUM7SUFDRCxnQ0FBUyxHQUFULFVBQVUsQ0FBVTtRQUNsQixNQUFNLElBQUksS0FBSyxFQUFFLENBQUM7SUFDcEIsQ0FBQztJQUNELDZCQUFNLEdBQU4sVUFBTyxDQUFvQjtRQUN6QixNQUFNLElBQUksS0FBSyxFQUFFLENBQUM7SUFDcEIsQ0FBQztJQUNELGdDQUFTLEdBQVQsVUFBVSxDQUFvQjtRQUM1QixNQUFNLElBQUksS0FBSyxFQUFFLENBQUM7SUFDcEIsQ0FBQztJQUNILG1CQUFDO0FBQUQsQ0FiQSxBQWFDLENBYjZCLHVCQUFZLEdBYXpDOzs7QUMzR0Q7O0dBRUc7Ozs7Ozs7QUFFSDtJQUtFLGdCQUFzQixLQUFRO1FBQVIsVUFBSyxHQUFMLEtBQUssQ0FBRztJQUM5QixDQUFDO0lBRU0sb0JBQUcsR0FBVixVQUFXLENBQXFCO1FBQzlCLE1BQU0sQ0FBQyxJQUFJLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7SUFDakMsQ0FBQztJQUVELHNCQUFXLHVCQUFHO2FBQWQ7WUFDRSxNQUFNLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQztRQUNwQixDQUFDOzs7T0FBQTtJQUVNLDBCQUFTLEdBQWhCLFVBQWlCLFlBQWU7UUFDOUIsTUFBTSxDQUFDLElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLEtBQUssR0FBRyxZQUFZLENBQUM7SUFDaEQsQ0FBQztJQUVILGFBQUM7QUFBRCxDQXBCQSxBQW9CQyxJQUFBO0FBcEJZLGNBQU0sU0FvQmxCLENBQUE7QUFFRDtJQUE2Qix3QkFBUztJQUVwQyxjQUFZLEtBQVE7UUFDbEIsa0JBQU0sS0FBSyxDQUFDLENBQUM7SUFDZixDQUFDO0lBRUQsc0JBQVcseUJBQU87YUFBbEI7WUFDRSxNQUFNLENBQUMsSUFBSSxDQUFDO1FBQ2QsQ0FBQzs7O09BQUE7O0lBRUQsc0JBQVcscUJBQUc7YUFBZDtZQUNFLE1BQU0sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDO1FBQ3BCLENBQUM7OztPQUFBO0lBRUQsc0JBQVcsc0JBQUk7YUFBZjtZQUNFLE1BQU0sQ0FBQyxDQUFDLENBQUM7UUFDWCxDQUFDOzs7T0FBQTtJQUNILFdBQUM7QUFBRCxDQWpCQSxBQWlCQyxDQWpCNEIsTUFBTSxHQWlCbEM7QUFqQlksWUFBSSxPQWlCaEIsQ0FBQTtBQUVEO0lBQTZCLHdCQUFTO0lBRXBDLGNBQVksSUFBYztRQUFkLG9CQUFjLEdBQWQsV0FBYztRQUN4QixrQkFBTSxJQUFJLENBQUMsQ0FBQztJQUNkLENBQUM7SUFFRCxzQkFBVyx5QkFBTzthQUFsQjtZQUNFLE1BQU0sQ0FBQyxJQUFJLENBQUM7UUFDZCxDQUFDOzs7T0FBQTtJQUVELHNCQUFXLHFCQUFHO2FBQWQ7WUFDRSxNQUFNLElBQUksS0FBSyxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQzlCLENBQUM7OztPQUFBO0lBRUQsc0JBQVcsc0JBQUk7YUFBZjtZQUNFLE1BQU0sQ0FBQyxDQUFDLENBQUM7UUFDWCxDQUFDOzs7T0FBQTtJQUNILFdBQUM7QUFBRCxDQWpCQSxBQWlCQyxDQWpCNEIsTUFBTSxHQWlCbEM7QUFqQlksWUFBSSxPQWlCaEIsQ0FBQTtBQUVZLFlBQUksR0FBYyxJQUFJLElBQUksRUFBRSxDQUFDO0FBRTFDLGdCQUEwQixDQUFJO0lBQzVCLE1BQU0sQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLFlBQUksQ0FBQztBQUM1QixDQUFDO0FBRmUsY0FBTSxTQUVyQixDQUFBO0FBRUQsY0FBd0IsQ0FBSTtJQUMxQixNQUFNLENBQUMsSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDckIsQ0FBQztBQUZlLFlBQUksT0FFbkIsQ0FBQTs7O0FDeEVEIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIiAvKiFcbiAgKiBodHRwczovL2dpdGh1Yi5jb20vcGF1bG1pbGxyL2VzNi1zaGltXG4gICogQGxpY2Vuc2UgZXM2LXNoaW0gQ29weXJpZ2h0IDIwMTMtMjAxNiBieSBQYXVsIE1pbGxlciAoaHR0cDovL3BhdWxtaWxsci5jb20pXG4gICogICBhbmQgY29udHJpYnV0b3JzLCAgTUlUIExpY2Vuc2VcbiAgKiBlczYtc2hpbTogdjAuMzUuMFxuICAqIHNlZSBodHRwczovL2dpdGh1Yi5jb20vcGF1bG1pbGxyL2VzNi1zaGltL2Jsb2IvMC4zNS4wL0xJQ0VOU0VcbiAgKiBEZXRhaWxzIGFuZCBkb2N1bWVudGF0aW9uOlxuICAqIGh0dHBzOi8vZ2l0aHViLmNvbS9wYXVsbWlsbHIvZXM2LXNoaW0vXG4gICovXG5cbi8vIFVNRCAoVW5pdmVyc2FsIE1vZHVsZSBEZWZpbml0aW9uKVxuLy8gc2VlIGh0dHBzOi8vZ2l0aHViLmNvbS91bWRqcy91bWQvYmxvYi9tYXN0ZXIvcmV0dXJuRXhwb3J0cy5qc1xuKGZ1bmN0aW9uIChyb290LCBmYWN0b3J5KSB7XG4gIC8qZ2xvYmFsIGRlZmluZSwgbW9kdWxlLCBleHBvcnRzICovXG4gIGlmICh0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQpIHtcbiAgICAvLyBBTUQuIFJlZ2lzdGVyIGFzIGFuIGFub255bW91cyBtb2R1bGUuXG4gICAgZGVmaW5lKGZhY3RvcnkpO1xuICB9IGVsc2UgaWYgKHR5cGVvZiBleHBvcnRzID09PSAnb2JqZWN0Jykge1xuICAgIC8vIE5vZGUuIERvZXMgbm90IHdvcmsgd2l0aCBzdHJpY3QgQ29tbW9uSlMsIGJ1dFxuICAgIC8vIG9ubHkgQ29tbW9uSlMtbGlrZSBlbnZpcm9ubWVudHMgdGhhdCBzdXBwb3J0IG1vZHVsZS5leHBvcnRzLFxuICAgIC8vIGxpa2UgTm9kZS5cbiAgICBtb2R1bGUuZXhwb3J0cyA9IGZhY3RvcnkoKTtcbiAgfSBlbHNlIHtcbiAgICAvLyBCcm93c2VyIGdsb2JhbHMgKHJvb3QgaXMgd2luZG93KVxuICAgIHJvb3QucmV0dXJuRXhwb3J0cyA9IGZhY3RvcnkoKTtcbiAgfVxufSh0aGlzLCBmdW5jdGlvbiAoKSB7XG4gICd1c2Ugc3RyaWN0JztcblxuICB2YXIgX2FwcGx5ID0gRnVuY3Rpb24uY2FsbC5iaW5kKEZ1bmN0aW9uLmFwcGx5KTtcbiAgdmFyIF9jYWxsID0gRnVuY3Rpb24uY2FsbC5iaW5kKEZ1bmN0aW9uLmNhbGwpO1xuICB2YXIgaXNBcnJheSA9IEFycmF5LmlzQXJyYXk7XG4gIHZhciBrZXlzID0gT2JqZWN0LmtleXM7XG5cbiAgdmFyIG5vdCA9IGZ1bmN0aW9uIG5vdFRodW5rZXIoZnVuYykge1xuICAgIHJldHVybiBmdW5jdGlvbiBub3RUaHVuaygpIHsgcmV0dXJuICFfYXBwbHkoZnVuYywgdGhpcywgYXJndW1lbnRzKTsgfTtcbiAgfTtcbiAgdmFyIHRocm93c0Vycm9yID0gZnVuY3Rpb24gKGZ1bmMpIHtcbiAgICB0cnkge1xuICAgICAgZnVuYygpO1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgfTtcbiAgdmFyIHZhbHVlT3JGYWxzZUlmVGhyb3dzID0gZnVuY3Rpb24gdmFsdWVPckZhbHNlSWZUaHJvd3MoZnVuYykge1xuICAgIHRyeSB7XG4gICAgICByZXR1cm4gZnVuYygpO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gIH07XG5cbiAgdmFyIGlzQ2FsbGFibGVXaXRob3V0TmV3ID0gbm90KHRocm93c0Vycm9yKTtcbiAgdmFyIGFyZVByb3BlcnR5RGVzY3JpcHRvcnNTdXBwb3J0ZWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgLy8gaWYgT2JqZWN0LmRlZmluZVByb3BlcnR5IGV4aXN0cyBidXQgdGhyb3dzLCBpdCdzIElFIDhcbiAgICByZXR1cm4gIXRocm93c0Vycm9yKGZ1bmN0aW9uICgpIHsgT2JqZWN0LmRlZmluZVByb3BlcnR5KHt9LCAneCcsIHsgZ2V0OiBmdW5jdGlvbiAoKSB7fSB9KTsgfSk7XG4gIH07XG4gIHZhciBzdXBwb3J0c0Rlc2NyaXB0b3JzID0gISFPYmplY3QuZGVmaW5lUHJvcGVydHkgJiYgYXJlUHJvcGVydHlEZXNjcmlwdG9yc1N1cHBvcnRlZCgpO1xuICB2YXIgZnVuY3Rpb25zSGF2ZU5hbWVzID0gKGZ1bmN0aW9uIGZvbygpIHt9KS5uYW1lID09PSAnZm9vJztcblxuICB2YXIgX2ZvckVhY2ggPSBGdW5jdGlvbi5jYWxsLmJpbmQoQXJyYXkucHJvdG90eXBlLmZvckVhY2gpO1xuICB2YXIgX3JlZHVjZSA9IEZ1bmN0aW9uLmNhbGwuYmluZChBcnJheS5wcm90b3R5cGUucmVkdWNlKTtcbiAgdmFyIF9maWx0ZXIgPSBGdW5jdGlvbi5jYWxsLmJpbmQoQXJyYXkucHJvdG90eXBlLmZpbHRlcik7XG4gIHZhciBfc29tZSA9IEZ1bmN0aW9uLmNhbGwuYmluZChBcnJheS5wcm90b3R5cGUuc29tZSk7XG5cbiAgdmFyIGRlZmluZVByb3BlcnR5ID0gZnVuY3Rpb24gKG9iamVjdCwgbmFtZSwgdmFsdWUsIGZvcmNlKSB7XG4gICAgaWYgKCFmb3JjZSAmJiBuYW1lIGluIG9iamVjdCkgeyByZXR1cm47IH1cbiAgICBpZiAoc3VwcG9ydHNEZXNjcmlwdG9ycykge1xuICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KG9iamVjdCwgbmFtZSwge1xuICAgICAgICBjb25maWd1cmFibGU6IHRydWUsXG4gICAgICAgIGVudW1lcmFibGU6IGZhbHNlLFxuICAgICAgICB3cml0YWJsZTogdHJ1ZSxcbiAgICAgICAgdmFsdWU6IHZhbHVlXG4gICAgICB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgb2JqZWN0W25hbWVdID0gdmFsdWU7XG4gICAgfVxuICB9O1xuXG4gIC8vIERlZmluZSBjb25maWd1cmFibGUsIHdyaXRhYmxlIGFuZCBub24tZW51bWVyYWJsZSBwcm9wc1xuICAvLyBpZiB0aGV5IGRvbuKAmXQgZXhpc3QuXG4gIHZhciBkZWZpbmVQcm9wZXJ0aWVzID0gZnVuY3Rpb24gKG9iamVjdCwgbWFwLCBmb3JjZU92ZXJyaWRlKSB7XG4gICAgX2ZvckVhY2goa2V5cyhtYXApLCBmdW5jdGlvbiAobmFtZSkge1xuICAgICAgdmFyIG1ldGhvZCA9IG1hcFtuYW1lXTtcbiAgICAgIGRlZmluZVByb3BlcnR5KG9iamVjdCwgbmFtZSwgbWV0aG9kLCAhIWZvcmNlT3ZlcnJpZGUpO1xuICAgIH0pO1xuICB9O1xuXG4gIHZhciBfdG9TdHJpbmcgPSBGdW5jdGlvbi5jYWxsLmJpbmQoT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZyk7XG4gIHZhciBpc0NhbGxhYmxlID0gdHlwZW9mIC9hYmMvID09PSAnZnVuY3Rpb24nID8gZnVuY3Rpb24gSXNDYWxsYWJsZVNsb3coeCkge1xuICAgIC8vIFNvbWUgb2xkIGJyb3dzZXJzIChJRSwgRkYpIHNheSB0aGF0IHR5cGVvZiAvYWJjLyA9PT0gJ2Z1bmN0aW9uJ1xuICAgIHJldHVybiB0eXBlb2YgeCA9PT0gJ2Z1bmN0aW9uJyAmJiBfdG9TdHJpbmcoeCkgPT09ICdbb2JqZWN0IEZ1bmN0aW9uXSc7XG4gIH0gOiBmdW5jdGlvbiBJc0NhbGxhYmxlRmFzdCh4KSB7IHJldHVybiB0eXBlb2YgeCA9PT0gJ2Z1bmN0aW9uJzsgfTtcblxuICB2YXIgVmFsdWUgPSB7XG4gICAgZ2V0dGVyOiBmdW5jdGlvbiAob2JqZWN0LCBuYW1lLCBnZXR0ZXIpIHtcbiAgICAgIGlmICghc3VwcG9ydHNEZXNjcmlwdG9ycykge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdnZXR0ZXJzIHJlcXVpcmUgdHJ1ZSBFUzUgc3VwcG9ydCcpO1xuICAgICAgfVxuICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KG9iamVjdCwgbmFtZSwge1xuICAgICAgICBjb25maWd1cmFibGU6IHRydWUsXG4gICAgICAgIGVudW1lcmFibGU6IGZhbHNlLFxuICAgICAgICBnZXQ6IGdldHRlclxuICAgICAgfSk7XG4gICAgfSxcbiAgICBwcm94eTogZnVuY3Rpb24gKG9yaWdpbmFsT2JqZWN0LCBrZXksIHRhcmdldE9iamVjdCkge1xuICAgICAgaWYgKCFzdXBwb3J0c0Rlc2NyaXB0b3JzKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ2dldHRlcnMgcmVxdWlyZSB0cnVlIEVTNSBzdXBwb3J0Jyk7XG4gICAgICB9XG4gICAgICB2YXIgb3JpZ2luYWxEZXNjcmlwdG9yID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcihvcmlnaW5hbE9iamVjdCwga2V5KTtcbiAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0YXJnZXRPYmplY3QsIGtleSwge1xuICAgICAgICBjb25maWd1cmFibGU6IG9yaWdpbmFsRGVzY3JpcHRvci5jb25maWd1cmFibGUsXG4gICAgICAgIGVudW1lcmFibGU6IG9yaWdpbmFsRGVzY3JpcHRvci5lbnVtZXJhYmxlLFxuICAgICAgICBnZXQ6IGZ1bmN0aW9uIGdldEtleSgpIHsgcmV0dXJuIG9yaWdpbmFsT2JqZWN0W2tleV07IH0sXG4gICAgICAgIHNldDogZnVuY3Rpb24gc2V0S2V5KHZhbHVlKSB7IG9yaWdpbmFsT2JqZWN0W2tleV0gPSB2YWx1ZTsgfVxuICAgICAgfSk7XG4gICAgfSxcbiAgICByZWRlZmluZTogZnVuY3Rpb24gKG9iamVjdCwgcHJvcGVydHksIG5ld1ZhbHVlKSB7XG4gICAgICBpZiAoc3VwcG9ydHNEZXNjcmlwdG9ycykge1xuICAgICAgICB2YXIgZGVzY3JpcHRvciA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3Iob2JqZWN0LCBwcm9wZXJ0eSk7XG4gICAgICAgIGRlc2NyaXB0b3IudmFsdWUgPSBuZXdWYWx1ZTtcbiAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KG9iamVjdCwgcHJvcGVydHksIGRlc2NyaXB0b3IpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgb2JqZWN0W3Byb3BlcnR5XSA9IG5ld1ZhbHVlO1xuICAgICAgfVxuICAgIH0sXG4gICAgZGVmaW5lQnlEZXNjcmlwdG9yOiBmdW5jdGlvbiAob2JqZWN0LCBwcm9wZXJ0eSwgZGVzY3JpcHRvcikge1xuICAgICAgaWYgKHN1cHBvcnRzRGVzY3JpcHRvcnMpIHtcbiAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KG9iamVjdCwgcHJvcGVydHksIGRlc2NyaXB0b3IpO1xuICAgICAgfSBlbHNlIGlmICgndmFsdWUnIGluIGRlc2NyaXB0b3IpIHtcbiAgICAgICAgb2JqZWN0W3Byb3BlcnR5XSA9IGRlc2NyaXB0b3IudmFsdWU7XG4gICAgICB9XG4gICAgfSxcbiAgICBwcmVzZXJ2ZVRvU3RyaW5nOiBmdW5jdGlvbiAodGFyZ2V0LCBzb3VyY2UpIHtcbiAgICAgIGlmIChzb3VyY2UgJiYgaXNDYWxsYWJsZShzb3VyY2UudG9TdHJpbmcpKSB7XG4gICAgICAgIGRlZmluZVByb3BlcnR5KHRhcmdldCwgJ3RvU3RyaW5nJywgc291cmNlLnRvU3RyaW5nLmJpbmQoc291cmNlKSwgdHJ1ZSk7XG4gICAgICB9XG4gICAgfVxuICB9O1xuXG4gIC8vIFNpbXBsZSBzaGltIGZvciBPYmplY3QuY3JlYXRlIG9uIEVTMyBicm93c2Vyc1xuICAvLyAodW5saWtlIHJlYWwgc2hpbSwgbm8gYXR0ZW1wdCB0byBzdXBwb3J0IGBwcm90b3R5cGUgPT09IG51bGxgKVxuICB2YXIgY3JlYXRlID0gT2JqZWN0LmNyZWF0ZSB8fCBmdW5jdGlvbiAocHJvdG90eXBlLCBwcm9wZXJ0aWVzKSB7XG4gICAgdmFyIFByb3RvdHlwZSA9IGZ1bmN0aW9uIFByb3RvdHlwZSgpIHt9O1xuICAgIFByb3RvdHlwZS5wcm90b3R5cGUgPSBwcm90b3R5cGU7XG4gICAgdmFyIG9iamVjdCA9IG5ldyBQcm90b3R5cGUoKTtcbiAgICBpZiAodHlwZW9mIHByb3BlcnRpZXMgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICBrZXlzKHByb3BlcnRpZXMpLmZvckVhY2goZnVuY3Rpb24gKGtleSkge1xuICAgICAgICBWYWx1ZS5kZWZpbmVCeURlc2NyaXB0b3Iob2JqZWN0LCBrZXksIHByb3BlcnRpZXNba2V5XSk7XG4gICAgICB9KTtcbiAgICB9XG4gICAgcmV0dXJuIG9iamVjdDtcbiAgfTtcblxuICB2YXIgc3VwcG9ydHNTdWJjbGFzc2luZyA9IGZ1bmN0aW9uIChDLCBmKSB7XG4gICAgaWYgKCFPYmplY3Quc2V0UHJvdG90eXBlT2YpIHsgcmV0dXJuIGZhbHNlOyAvKiBza2lwIHRlc3Qgb24gSUUgPCAxMSAqLyB9XG4gICAgcmV0dXJuIHZhbHVlT3JGYWxzZUlmVGhyb3dzKGZ1bmN0aW9uICgpIHtcbiAgICAgIHZhciBTdWIgPSBmdW5jdGlvbiBTdWJjbGFzcyhhcmcpIHtcbiAgICAgICAgdmFyIG8gPSBuZXcgQyhhcmcpO1xuICAgICAgICBPYmplY3Quc2V0UHJvdG90eXBlT2YobywgU3ViY2xhc3MucHJvdG90eXBlKTtcbiAgICAgICAgcmV0dXJuIG87XG4gICAgICB9O1xuICAgICAgT2JqZWN0LnNldFByb3RvdHlwZU9mKFN1YiwgQyk7XG4gICAgICBTdWIucHJvdG90eXBlID0gY3JlYXRlKEMucHJvdG90eXBlLCB7XG4gICAgICAgIGNvbnN0cnVjdG9yOiB7IHZhbHVlOiBTdWIgfVxuICAgICAgfSk7XG4gICAgICByZXR1cm4gZihTdWIpO1xuICAgIH0pO1xuICB9O1xuXG4gIHZhciBnZXRHbG9iYWwgPSBmdW5jdGlvbiAoKSB7XG4gICAgLyogZ2xvYmFsIHNlbGYsIHdpbmRvdywgZ2xvYmFsICovXG4gICAgLy8gdGhlIG9ubHkgcmVsaWFibGUgbWVhbnMgdG8gZ2V0IHRoZSBnbG9iYWwgb2JqZWN0IGlzXG4gICAgLy8gYEZ1bmN0aW9uKCdyZXR1cm4gdGhpcycpKClgXG4gICAgLy8gSG93ZXZlciwgdGhpcyBjYXVzZXMgQ1NQIHZpb2xhdGlvbnMgaW4gQ2hyb21lIGFwcHMuXG4gICAgaWYgKHR5cGVvZiBzZWxmICE9PSAndW5kZWZpbmVkJykgeyByZXR1cm4gc2VsZjsgfVxuICAgIGlmICh0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJykgeyByZXR1cm4gd2luZG93OyB9XG4gICAgaWYgKHR5cGVvZiBnbG9iYWwgIT09ICd1bmRlZmluZWQnKSB7IHJldHVybiBnbG9iYWw7IH1cbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3VuYWJsZSB0byBsb2NhdGUgZ2xvYmFsIG9iamVjdCcpO1xuICB9O1xuXG4gIHZhciBnbG9iYWxzID0gZ2V0R2xvYmFsKCk7XG4gIHZhciBnbG9iYWxJc0Zpbml0ZSA9IGdsb2JhbHMuaXNGaW5pdGU7XG4gIHZhciBfaW5kZXhPZiA9IEZ1bmN0aW9uLmNhbGwuYmluZChTdHJpbmcucHJvdG90eXBlLmluZGV4T2YpO1xuICB2YXIgX2FycmF5SW5kZXhPZkFwcGx5ID0gRnVuY3Rpb24uYXBwbHkuYmluZChBcnJheS5wcm90b3R5cGUuaW5kZXhPZik7XG4gIHZhciBfY29uY2F0ID0gRnVuY3Rpb24uY2FsbC5iaW5kKEFycmF5LnByb3RvdHlwZS5jb25jYXQpO1xuICB2YXIgX3NvcnQgPSBGdW5jdGlvbi5jYWxsLmJpbmQoQXJyYXkucHJvdG90eXBlLnNvcnQpO1xuICB2YXIgX3N0clNsaWNlID0gRnVuY3Rpb24uY2FsbC5iaW5kKFN0cmluZy5wcm90b3R5cGUuc2xpY2UpO1xuICB2YXIgX3B1c2ggPSBGdW5jdGlvbi5jYWxsLmJpbmQoQXJyYXkucHJvdG90eXBlLnB1c2gpO1xuICB2YXIgX3B1c2hBcHBseSA9IEZ1bmN0aW9uLmFwcGx5LmJpbmQoQXJyYXkucHJvdG90eXBlLnB1c2gpO1xuICB2YXIgX3NoaWZ0ID0gRnVuY3Rpb24uY2FsbC5iaW5kKEFycmF5LnByb3RvdHlwZS5zaGlmdCk7XG4gIHZhciBfbWF4ID0gTWF0aC5tYXg7XG4gIHZhciBfbWluID0gTWF0aC5taW47XG4gIHZhciBfZmxvb3IgPSBNYXRoLmZsb29yO1xuICB2YXIgX2FicyA9IE1hdGguYWJzO1xuICB2YXIgX2xvZyA9IE1hdGgubG9nO1xuICB2YXIgX3NxcnQgPSBNYXRoLnNxcnQ7XG4gIHZhciBfaGFzT3duUHJvcGVydHkgPSBGdW5jdGlvbi5jYWxsLmJpbmQoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eSk7XG4gIHZhciBBcnJheUl0ZXJhdG9yOyAvLyBtYWtlIG91ciBpbXBsZW1lbnRhdGlvbiBwcml2YXRlXG4gIHZhciBub29wID0gZnVuY3Rpb24gKCkge307XG5cbiAgdmFyIFN5bWJvbCA9IGdsb2JhbHMuU3ltYm9sIHx8IHt9O1xuICB2YXIgc3ltYm9sU3BlY2llcyA9IFN5bWJvbC5zcGVjaWVzIHx8ICdAQHNwZWNpZXMnO1xuXG4gIHZhciBudW1iZXJJc05hTiA9IE51bWJlci5pc05hTiB8fCBmdW5jdGlvbiBpc05hTih2YWx1ZSkge1xuICAgIC8vIE5hTiAhPT0gTmFOLCBidXQgdGhleSBhcmUgaWRlbnRpY2FsLlxuICAgIC8vIE5hTnMgYXJlIHRoZSBvbmx5IG5vbi1yZWZsZXhpdmUgdmFsdWUsIGkuZS4sIGlmIHggIT09IHgsXG4gICAgLy8gdGhlbiB4IGlzIE5hTi5cbiAgICAvLyBpc05hTiBpcyBicm9rZW46IGl0IGNvbnZlcnRzIGl0cyBhcmd1bWVudCB0byBudW1iZXIsIHNvXG4gICAgLy8gaXNOYU4oJ2ZvbycpID0+IHRydWVcbiAgICByZXR1cm4gdmFsdWUgIT09IHZhbHVlO1xuICB9O1xuICB2YXIgbnVtYmVySXNGaW5pdGUgPSBOdW1iZXIuaXNGaW5pdGUgfHwgZnVuY3Rpb24gaXNGaW5pdGUodmFsdWUpIHtcbiAgICByZXR1cm4gdHlwZW9mIHZhbHVlID09PSAnbnVtYmVyJyAmJiBnbG9iYWxJc0Zpbml0ZSh2YWx1ZSk7XG4gIH07XG5cbiAgLy8gdGFrZW4gZGlyZWN0bHkgZnJvbSBodHRwczovL2dpdGh1Yi5jb20vbGpoYXJiL2lzLWFyZ3VtZW50cy9ibG9iL21hc3Rlci9pbmRleC5qc1xuICAvLyBjYW4gYmUgcmVwbGFjZWQgd2l0aCByZXF1aXJlKCdpcy1hcmd1bWVudHMnKSBpZiB3ZSBldmVyIHVzZSBhIGJ1aWxkIHByb2Nlc3MgaW5zdGVhZFxuICB2YXIgaXNTdGFuZGFyZEFyZ3VtZW50cyA9IGZ1bmN0aW9uIGlzQXJndW1lbnRzKHZhbHVlKSB7XG4gICAgcmV0dXJuIF90b1N0cmluZyh2YWx1ZSkgPT09ICdbb2JqZWN0IEFyZ3VtZW50c10nO1xuICB9O1xuICB2YXIgaXNMZWdhY3lBcmd1bWVudHMgPSBmdW5jdGlvbiBpc0FyZ3VtZW50cyh2YWx1ZSkge1xuICAgIHJldHVybiB2YWx1ZSAhPT0gbnVsbCAmJlxuICAgICAgdHlwZW9mIHZhbHVlID09PSAnb2JqZWN0JyAmJlxuICAgICAgdHlwZW9mIHZhbHVlLmxlbmd0aCA9PT0gJ251bWJlcicgJiZcbiAgICAgIHZhbHVlLmxlbmd0aCA+PSAwICYmXG4gICAgICBfdG9TdHJpbmcodmFsdWUpICE9PSAnW29iamVjdCBBcnJheV0nICYmXG4gICAgICBfdG9TdHJpbmcodmFsdWUuY2FsbGVlKSA9PT0gJ1tvYmplY3QgRnVuY3Rpb25dJztcbiAgfTtcbiAgdmFyIGlzQXJndW1lbnRzID0gaXNTdGFuZGFyZEFyZ3VtZW50cyhhcmd1bWVudHMpID8gaXNTdGFuZGFyZEFyZ3VtZW50cyA6IGlzTGVnYWN5QXJndW1lbnRzO1xuXG4gIHZhciBUeXBlID0ge1xuICAgIHByaW1pdGl2ZTogZnVuY3Rpb24gKHgpIHsgcmV0dXJuIHggPT09IG51bGwgfHwgKHR5cGVvZiB4ICE9PSAnZnVuY3Rpb24nICYmIHR5cGVvZiB4ICE9PSAnb2JqZWN0Jyk7IH0sXG4gICAgb2JqZWN0OiBmdW5jdGlvbiAoeCkgeyByZXR1cm4geCAhPT0gbnVsbCAmJiB0eXBlb2YgeCA9PT0gJ29iamVjdCc7IH0sXG4gICAgc3RyaW5nOiBmdW5jdGlvbiAoeCkgeyByZXR1cm4gX3RvU3RyaW5nKHgpID09PSAnW29iamVjdCBTdHJpbmddJzsgfSxcbiAgICByZWdleDogZnVuY3Rpb24gKHgpIHsgcmV0dXJuIF90b1N0cmluZyh4KSA9PT0gJ1tvYmplY3QgUmVnRXhwXSc7IH0sXG4gICAgc3ltYm9sOiBmdW5jdGlvbiAoeCkge1xuICAgICAgcmV0dXJuIHR5cGVvZiBnbG9iYWxzLlN5bWJvbCA9PT0gJ2Z1bmN0aW9uJyAmJiB0eXBlb2YgeCA9PT0gJ3N5bWJvbCc7XG4gICAgfVxuICB9O1xuXG4gIHZhciBvdmVycmlkZU5hdGl2ZSA9IGZ1bmN0aW9uIG92ZXJyaWRlTmF0aXZlKG9iamVjdCwgcHJvcGVydHksIHJlcGxhY2VtZW50KSB7XG4gICAgdmFyIG9yaWdpbmFsID0gb2JqZWN0W3Byb3BlcnR5XTtcbiAgICBkZWZpbmVQcm9wZXJ0eShvYmplY3QsIHByb3BlcnR5LCByZXBsYWNlbWVudCwgdHJ1ZSk7XG4gICAgVmFsdWUucHJlc2VydmVUb1N0cmluZyhvYmplY3RbcHJvcGVydHldLCBvcmlnaW5hbCk7XG4gIH07XG5cbiAgdmFyIGhhc1N5bWJvbHMgPSB0eXBlb2YgU3ltYm9sID09PSAnZnVuY3Rpb24nICYmIHR5cGVvZiBTeW1ib2xbJ2ZvciddID09PSAnZnVuY3Rpb24nICYmIFR5cGUuc3ltYm9sKFN5bWJvbCgpKTtcblxuICAvLyBUaGlzIGlzIGEgcHJpdmF0ZSBuYW1lIGluIHRoZSBlczYgc3BlYywgZXF1YWwgdG8gJ1tTeW1ib2wuaXRlcmF0b3JdJ1xuICAvLyB3ZSdyZSBnb2luZyB0byB1c2UgYW4gYXJiaXRyYXJ5IF8tcHJlZml4ZWQgbmFtZSB0byBtYWtlIG91ciBzaGltc1xuICAvLyB3b3JrIHByb3Blcmx5IHdpdGggZWFjaCBvdGhlciwgZXZlbiB0aG91Z2ggd2UgZG9uJ3QgaGF2ZSBmdWxsIEl0ZXJhdG9yXG4gIC8vIHN1cHBvcnQuICBUaGF0IGlzLCBgQXJyYXkuZnJvbShtYXAua2V5cygpKWAgd2lsbCB3b3JrLCBidXQgd2UgZG9uJ3RcbiAgLy8gcHJldGVuZCB0byBleHBvcnQgYSBcInJlYWxcIiBJdGVyYXRvciBpbnRlcmZhY2UuXG4gIHZhciAkaXRlcmF0b3IkID0gVHlwZS5zeW1ib2woU3ltYm9sLml0ZXJhdG9yKSA/IFN5bWJvbC5pdGVyYXRvciA6ICdfZXM2LXNoaW0gaXRlcmF0b3JfJztcbiAgLy8gRmlyZWZveCBzaGlwcyBhIHBhcnRpYWwgaW1wbGVtZW50YXRpb24gdXNpbmcgdGhlIG5hbWUgQEBpdGVyYXRvci5cbiAgLy8gaHR0cHM6Ly9idWd6aWxsYS5tb3ppbGxhLm9yZy9zaG93X2J1Zy5jZ2k/aWQ9OTA3MDc3I2MxNFxuICAvLyBTbyB1c2UgdGhhdCBuYW1lIGlmIHdlIGRldGVjdCBpdC5cbiAgaWYgKGdsb2JhbHMuU2V0ICYmIHR5cGVvZiBuZXcgZ2xvYmFscy5TZXQoKVsnQEBpdGVyYXRvciddID09PSAnZnVuY3Rpb24nKSB7XG4gICAgJGl0ZXJhdG9yJCA9ICdAQGl0ZXJhdG9yJztcbiAgfVxuXG4gIC8vIFJlZmxlY3RcbiAgaWYgKCFnbG9iYWxzLlJlZmxlY3QpIHtcbiAgICBkZWZpbmVQcm9wZXJ0eShnbG9iYWxzLCAnUmVmbGVjdCcsIHt9LCB0cnVlKTtcbiAgfVxuICB2YXIgUmVmbGVjdCA9IGdsb2JhbHMuUmVmbGVjdDtcblxuICB2YXIgJFN0cmluZyA9IFN0cmluZztcblxuICB2YXIgRVMgPSB7XG4gICAgLy8gaHR0cHM6Ly9wZW9wbGUubW96aWxsYS5vcmcvfmpvcmVuZG9yZmYvZXM2LWRyYWZ0Lmh0bWwjc2VjLWNhbGwtZi12LWFyZ3NcbiAgICBDYWxsOiBmdW5jdGlvbiBDYWxsKEYsIFYpIHtcbiAgICAgIHZhciBhcmdzID0gYXJndW1lbnRzLmxlbmd0aCA+IDIgPyBhcmd1bWVudHNbMl0gOiBbXTtcbiAgICAgIGlmICghRVMuSXNDYWxsYWJsZShGKSkge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKEYgKyAnIGlzIG5vdCBhIGZ1bmN0aW9uJyk7XG4gICAgICB9XG4gICAgICByZXR1cm4gX2FwcGx5KEYsIFYsIGFyZ3MpO1xuICAgIH0sXG5cbiAgICBSZXF1aXJlT2JqZWN0Q29lcmNpYmxlOiBmdW5jdGlvbiAoeCwgb3B0TWVzc2FnZSkge1xuICAgICAgLyoganNoaW50IGVxbnVsbDp0cnVlICovXG4gICAgICBpZiAoeCA9PSBudWxsKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3Iob3B0TWVzc2FnZSB8fCAnQ2Fubm90IGNhbGwgbWV0aG9kIG9uICcgKyB4KTtcbiAgICAgIH1cbiAgICAgIHJldHVybiB4O1xuICAgIH0sXG5cbiAgICAvLyBUaGlzIG1pZ2h0IG1pc3MgdGhlIFwiKG5vbi1zdGFuZGFyZCBleG90aWMgYW5kIGRvZXMgbm90IGltcGxlbWVudFxuICAgIC8vIFtbQ2FsbF1dKVwiIGNhc2UgZnJvbVxuICAgIC8vIGh0dHA6Ly93d3cuZWNtYS1pbnRlcm5hdGlvbmFsLm9yZy9lY21hLTI2Mi82LjAvI3NlYy10eXBlb2Ytb3BlcmF0b3ItcnVudGltZS1zZW1hbnRpY3MtZXZhbHVhdGlvblxuICAgIC8vIGJ1dCB3ZSBjYW4ndCBmaW5kIGFueSBldmlkZW5jZSB0aGVzZSBvYmplY3RzIGV4aXN0IGluIHByYWN0aWNlLlxuICAgIC8vIElmIHdlIGZpbmQgc29tZSBpbiB0aGUgZnV0dXJlLCB5b3UgY291bGQgdGVzdCBgT2JqZWN0KHgpID09PSB4YCxcbiAgICAvLyB3aGljaCBpcyByZWxpYWJsZSBhY2NvcmRpbmcgdG9cbiAgICAvLyBodHRwOi8vd3d3LmVjbWEtaW50ZXJuYXRpb25hbC5vcmcvZWNtYS0yNjIvNi4wLyNzZWMtdG9vYmplY3RcbiAgICAvLyBidXQgaXMgbm90IHdlbGwgb3B0aW1pemVkIGJ5IHJ1bnRpbWVzIGFuZCBjcmVhdGVzIGFuIG9iamVjdFxuICAgIC8vIHdoZW5ldmVyIGl0IHJldHVybnMgZmFsc2UsIGFuZCB0aHVzIGlzIHZlcnkgc2xvdy5cbiAgICBUeXBlSXNPYmplY3Q6IGZ1bmN0aW9uICh4KSB7XG4gICAgICBpZiAoeCA9PT0gdm9pZCAwIHx8IHggPT09IG51bGwgfHwgeCA9PT0gdHJ1ZSB8fCB4ID09PSBmYWxzZSkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgICByZXR1cm4gdHlwZW9mIHggPT09ICdmdW5jdGlvbicgfHwgdHlwZW9mIHggPT09ICdvYmplY3QnO1xuICAgIH0sXG5cbiAgICBUb09iamVjdDogZnVuY3Rpb24gKG8sIG9wdE1lc3NhZ2UpIHtcbiAgICAgIHJldHVybiBPYmplY3QoRVMuUmVxdWlyZU9iamVjdENvZXJjaWJsZShvLCBvcHRNZXNzYWdlKSk7XG4gICAgfSxcblxuICAgIElzQ2FsbGFibGU6IGlzQ2FsbGFibGUsXG5cbiAgICBJc0NvbnN0cnVjdG9yOiBmdW5jdGlvbiAoeCkge1xuICAgICAgLy8gV2UgY2FuJ3QgdGVsbCBjYWxsYWJsZXMgZnJvbSBjb25zdHJ1Y3RvcnMgaW4gRVM1XG4gICAgICByZXR1cm4gRVMuSXNDYWxsYWJsZSh4KTtcbiAgICB9LFxuXG4gICAgVG9JbnQzMjogZnVuY3Rpb24gKHgpIHtcbiAgICAgIHJldHVybiBFUy5Ub051bWJlcih4KSA+PiAwO1xuICAgIH0sXG5cbiAgICBUb1VpbnQzMjogZnVuY3Rpb24gKHgpIHtcbiAgICAgIHJldHVybiBFUy5Ub051bWJlcih4KSA+Pj4gMDtcbiAgICB9LFxuXG4gICAgVG9OdW1iZXI6IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgaWYgKF90b1N0cmluZyh2YWx1ZSkgPT09ICdbb2JqZWN0IFN5bWJvbF0nKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0Nhbm5vdCBjb252ZXJ0IGEgU3ltYm9sIHZhbHVlIHRvIGEgbnVtYmVyJyk7XG4gICAgICB9XG4gICAgICByZXR1cm4gK3ZhbHVlO1xuICAgIH0sXG5cbiAgICBUb0ludGVnZXI6IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgdmFyIG51bWJlciA9IEVTLlRvTnVtYmVyKHZhbHVlKTtcbiAgICAgIGlmIChudW1iZXJJc05hTihudW1iZXIpKSB7IHJldHVybiAwOyB9XG4gICAgICBpZiAobnVtYmVyID09PSAwIHx8ICFudW1iZXJJc0Zpbml0ZShudW1iZXIpKSB7IHJldHVybiBudW1iZXI7IH1cbiAgICAgIHJldHVybiAobnVtYmVyID4gMCA/IDEgOiAtMSkgKiBfZmxvb3IoX2FicyhudW1iZXIpKTtcbiAgICB9LFxuXG4gICAgVG9MZW5ndGg6IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgdmFyIGxlbiA9IEVTLlRvSW50ZWdlcih2YWx1ZSk7XG4gICAgICBpZiAobGVuIDw9IDApIHsgcmV0dXJuIDA7IH0gLy8gaW5jbHVkZXMgY29udmVydGluZyAtMCB0byArMFxuICAgICAgaWYgKGxlbiA+IE51bWJlci5NQVhfU0FGRV9JTlRFR0VSKSB7IHJldHVybiBOdW1iZXIuTUFYX1NBRkVfSU5URUdFUjsgfVxuICAgICAgcmV0dXJuIGxlbjtcbiAgICB9LFxuXG4gICAgU2FtZVZhbHVlOiBmdW5jdGlvbiAoYSwgYikge1xuICAgICAgaWYgKGEgPT09IGIpIHtcbiAgICAgICAgLy8gMCA9PT0gLTAsIGJ1dCB0aGV5IGFyZSBub3QgaWRlbnRpY2FsLlxuICAgICAgICBpZiAoYSA9PT0gMCkgeyByZXR1cm4gMSAvIGEgPT09IDEgLyBiOyB9XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuICAgICAgcmV0dXJuIG51bWJlcklzTmFOKGEpICYmIG51bWJlcklzTmFOKGIpO1xuICAgIH0sXG5cbiAgICBTYW1lVmFsdWVaZXJvOiBmdW5jdGlvbiAoYSwgYikge1xuICAgICAgLy8gc2FtZSBhcyBTYW1lVmFsdWUgZXhjZXB0IGZvciBTYW1lVmFsdWVaZXJvKCswLCAtMCkgPT0gdHJ1ZVxuICAgICAgcmV0dXJuIChhID09PSBiKSB8fCAobnVtYmVySXNOYU4oYSkgJiYgbnVtYmVySXNOYU4oYikpO1xuICAgIH0sXG5cbiAgICBJc0l0ZXJhYmxlOiBmdW5jdGlvbiAobykge1xuICAgICAgcmV0dXJuIEVTLlR5cGVJc09iamVjdChvKSAmJiAodHlwZW9mIG9bJGl0ZXJhdG9yJF0gIT09ICd1bmRlZmluZWQnIHx8IGlzQXJndW1lbnRzKG8pKTtcbiAgICB9LFxuXG4gICAgR2V0SXRlcmF0b3I6IGZ1bmN0aW9uIChvKSB7XG4gICAgICBpZiAoaXNBcmd1bWVudHMobykpIHtcbiAgICAgICAgLy8gc3BlY2lhbCBjYXNlIHN1cHBvcnQgZm9yIGBhcmd1bWVudHNgXG4gICAgICAgIHJldHVybiBuZXcgQXJyYXlJdGVyYXRvcihvLCAndmFsdWUnKTtcbiAgICAgIH1cbiAgICAgIHZhciBpdEZuID0gRVMuR2V0TWV0aG9kKG8sICRpdGVyYXRvciQpO1xuICAgICAgaWYgKCFFUy5Jc0NhbGxhYmxlKGl0Rm4pKSB7XG4gICAgICAgIC8vIEJldHRlciBkaWFnbm9zdGljcyBpZiBpdEZuIGlzIG51bGwgb3IgdW5kZWZpbmVkXG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ3ZhbHVlIGlzIG5vdCBhbiBpdGVyYWJsZScpO1xuICAgICAgfVxuICAgICAgdmFyIGl0ID0gRVMuQ2FsbChpdEZuLCBvKTtcbiAgICAgIGlmICghRVMuVHlwZUlzT2JqZWN0KGl0KSkge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdiYWQgaXRlcmF0b3InKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBpdDtcbiAgICB9LFxuXG4gICAgR2V0TWV0aG9kOiBmdW5jdGlvbiAobywgcCkge1xuICAgICAgdmFyIGZ1bmMgPSBFUy5Ub09iamVjdChvKVtwXTtcbiAgICAgIGlmIChmdW5jID09PSB2b2lkIDAgfHwgZnVuYyA9PT0gbnVsbCkge1xuICAgICAgICByZXR1cm4gdm9pZCAwO1xuICAgICAgfVxuICAgICAgaWYgKCFFUy5Jc0NhbGxhYmxlKGZ1bmMpKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ01ldGhvZCBub3QgY2FsbGFibGU6ICcgKyBwKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBmdW5jO1xuICAgIH0sXG5cbiAgICBJdGVyYXRvckNvbXBsZXRlOiBmdW5jdGlvbiAoaXRlclJlc3VsdCkge1xuICAgICAgcmV0dXJuICEhKGl0ZXJSZXN1bHQuZG9uZSk7XG4gICAgfSxcblxuICAgIEl0ZXJhdG9yQ2xvc2U6IGZ1bmN0aW9uIChpdGVyYXRvciwgY29tcGxldGlvbklzVGhyb3cpIHtcbiAgICAgIHZhciByZXR1cm5NZXRob2QgPSBFUy5HZXRNZXRob2QoaXRlcmF0b3IsICdyZXR1cm4nKTtcbiAgICAgIGlmIChyZXR1cm5NZXRob2QgPT09IHZvaWQgMCkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICB2YXIgaW5uZXJSZXN1bHQsIGlubmVyRXhjZXB0aW9uO1xuICAgICAgdHJ5IHtcbiAgICAgICAgaW5uZXJSZXN1bHQgPSBFUy5DYWxsKHJldHVybk1ldGhvZCwgaXRlcmF0b3IpO1xuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICBpbm5lckV4Y2VwdGlvbiA9IGU7XG4gICAgICB9XG4gICAgICBpZiAoY29tcGxldGlvbklzVGhyb3cpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgaWYgKGlubmVyRXhjZXB0aW9uKSB7XG4gICAgICAgIHRocm93IGlubmVyRXhjZXB0aW9uO1xuICAgICAgfVxuICAgICAgaWYgKCFFUy5UeXBlSXNPYmplY3QoaW5uZXJSZXN1bHQpKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXCJJdGVyYXRvcidzIHJldHVybiBtZXRob2QgcmV0dXJuZWQgYSBub24tb2JqZWN0LlwiKTtcbiAgICAgIH1cbiAgICB9LFxuXG4gICAgSXRlcmF0b3JOZXh0OiBmdW5jdGlvbiAoaXQpIHtcbiAgICAgIHZhciByZXN1bHQgPSBhcmd1bWVudHMubGVuZ3RoID4gMSA/IGl0Lm5leHQoYXJndW1lbnRzWzFdKSA6IGl0Lm5leHQoKTtcbiAgICAgIGlmICghRVMuVHlwZUlzT2JqZWN0KHJlc3VsdCkpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignYmFkIGl0ZXJhdG9yJyk7XG4gICAgICB9XG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH0sXG5cbiAgICBJdGVyYXRvclN0ZXA6IGZ1bmN0aW9uIChpdCkge1xuICAgICAgdmFyIHJlc3VsdCA9IEVTLkl0ZXJhdG9yTmV4dChpdCk7XG4gICAgICB2YXIgZG9uZSA9IEVTLkl0ZXJhdG9yQ29tcGxldGUocmVzdWx0KTtcbiAgICAgIHJldHVybiBkb25lID8gZmFsc2UgOiByZXN1bHQ7XG4gICAgfSxcblxuICAgIENvbnN0cnVjdDogZnVuY3Rpb24gKEMsIGFyZ3MsIG5ld1RhcmdldCwgaXNFUzZpbnRlcm5hbCkge1xuICAgICAgdmFyIHRhcmdldCA9IHR5cGVvZiBuZXdUYXJnZXQgPT09ICd1bmRlZmluZWQnID8gQyA6IG5ld1RhcmdldDtcblxuICAgICAgaWYgKCFpc0VTNmludGVybmFsICYmIFJlZmxlY3QuY29uc3RydWN0KSB7XG4gICAgICAgIC8vIFRyeSB0byB1c2UgUmVmbGVjdC5jb25zdHJ1Y3QgaWYgYXZhaWxhYmxlXG4gICAgICAgIHJldHVybiBSZWZsZWN0LmNvbnN0cnVjdChDLCBhcmdzLCB0YXJnZXQpO1xuICAgICAgfVxuICAgICAgLy8gT0ssIHdlIGhhdmUgdG8gZmFrZSBpdC4gIFRoaXMgd2lsbCBvbmx5IHdvcmsgaWYgdGhlXG4gICAgICAvLyBDLltbQ29uc3RydWN0b3JLaW5kXV0gPT0gXCJiYXNlXCIgLS0gYnV0IHRoYXQncyB0aGUgb25seVxuICAgICAgLy8ga2luZCB3ZSBjYW4gbWFrZSBpbiBFUzUgY29kZSBhbnl3YXkuXG5cbiAgICAgIC8vIE9yZGluYXJ5Q3JlYXRlRnJvbUNvbnN0cnVjdG9yKHRhcmdldCwgXCIlT2JqZWN0UHJvdG90eXBlJVwiKVxuICAgICAgdmFyIHByb3RvID0gdGFyZ2V0LnByb3RvdHlwZTtcbiAgICAgIGlmICghRVMuVHlwZUlzT2JqZWN0KHByb3RvKSkge1xuICAgICAgICBwcm90byA9IE9iamVjdC5wcm90b3R5cGU7XG4gICAgICB9XG4gICAgICB2YXIgb2JqID0gY3JlYXRlKHByb3RvKTtcbiAgICAgIC8vIENhbGwgdGhlIGNvbnN0cnVjdG9yLlxuICAgICAgdmFyIHJlc3VsdCA9IEVTLkNhbGwoQywgb2JqLCBhcmdzKTtcbiAgICAgIHJldHVybiBFUy5UeXBlSXNPYmplY3QocmVzdWx0KSA/IHJlc3VsdCA6IG9iajtcbiAgICB9LFxuXG4gICAgU3BlY2llc0NvbnN0cnVjdG9yOiBmdW5jdGlvbiAoTywgZGVmYXVsdENvbnN0cnVjdG9yKSB7XG4gICAgICB2YXIgQyA9IE8uY29uc3RydWN0b3I7XG4gICAgICBpZiAoQyA9PT0gdm9pZCAwKSB7XG4gICAgICAgIHJldHVybiBkZWZhdWx0Q29uc3RydWN0b3I7XG4gICAgICB9XG4gICAgICBpZiAoIUVTLlR5cGVJc09iamVjdChDKSkge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdCYWQgY29uc3RydWN0b3InKTtcbiAgICAgIH1cbiAgICAgIHZhciBTID0gQ1tzeW1ib2xTcGVjaWVzXTtcbiAgICAgIGlmIChTID09PSB2b2lkIDAgfHwgUyA9PT0gbnVsbCkge1xuICAgICAgICByZXR1cm4gZGVmYXVsdENvbnN0cnVjdG9yO1xuICAgICAgfVxuICAgICAgaWYgKCFFUy5Jc0NvbnN0cnVjdG9yKFMpKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0JhZCBAQHNwZWNpZXMnKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBTO1xuICAgIH0sXG5cbiAgICBDcmVhdGVIVE1MOiBmdW5jdGlvbiAoc3RyaW5nLCB0YWcsIGF0dHJpYnV0ZSwgdmFsdWUpIHtcbiAgICAgIHZhciBTID0gRVMuVG9TdHJpbmcoc3RyaW5nKTtcbiAgICAgIHZhciBwMSA9ICc8JyArIHRhZztcbiAgICAgIGlmIChhdHRyaWJ1dGUgIT09ICcnKSB7XG4gICAgICAgIHZhciBWID0gRVMuVG9TdHJpbmcodmFsdWUpO1xuICAgICAgICB2YXIgZXNjYXBlZFYgPSBWLnJlcGxhY2UoL1wiL2csICcmcXVvdDsnKTtcbiAgICAgICAgcDEgKz0gJyAnICsgYXR0cmlidXRlICsgJz1cIicgKyBlc2NhcGVkViArICdcIic7XG4gICAgICB9XG4gICAgICB2YXIgcDIgPSBwMSArICc+JztcbiAgICAgIHZhciBwMyA9IHAyICsgUztcbiAgICAgIHJldHVybiBwMyArICc8LycgKyB0YWcgKyAnPic7XG4gICAgfSxcblxuICAgIElzUmVnRXhwOiBmdW5jdGlvbiBJc1JlZ0V4cChhcmd1bWVudCkge1xuICAgICAgaWYgKCFFUy5UeXBlSXNPYmplY3QoYXJndW1lbnQpKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICAgIHZhciBpc1JlZ0V4cCA9IGFyZ3VtZW50W1N5bWJvbC5tYXRjaF07XG4gICAgICBpZiAodHlwZW9mIGlzUmVnRXhwICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICByZXR1cm4gISFpc1JlZ0V4cDtcbiAgICAgIH1cbiAgICAgIHJldHVybiBUeXBlLnJlZ2V4KGFyZ3VtZW50KTtcbiAgICB9LFxuXG4gICAgVG9TdHJpbmc6IGZ1bmN0aW9uIFRvU3RyaW5nKHN0cmluZykge1xuICAgICAgcmV0dXJuICRTdHJpbmcoc3RyaW5nKTtcbiAgICB9XG4gIH07XG5cbiAgLy8gV2VsbC1rbm93biBTeW1ib2wgc2hpbXNcbiAgaWYgKHN1cHBvcnRzRGVzY3JpcHRvcnMgJiYgaGFzU3ltYm9scykge1xuICAgIHZhciBkZWZpbmVXZWxsS25vd25TeW1ib2wgPSBmdW5jdGlvbiBkZWZpbmVXZWxsS25vd25TeW1ib2wobmFtZSkge1xuICAgICAgaWYgKFR5cGUuc3ltYm9sKFN5bWJvbFtuYW1lXSkpIHtcbiAgICAgICAgcmV0dXJuIFN5bWJvbFtuYW1lXTtcbiAgICAgIH1cbiAgICAgIHZhciBzeW0gPSBTeW1ib2xbJ2ZvciddKCdTeW1ib2wuJyArIG5hbWUpO1xuICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KFN5bWJvbCwgbmFtZSwge1xuICAgICAgICBjb25maWd1cmFibGU6IGZhbHNlLFxuICAgICAgICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgICAgICAgd3JpdGFibGU6IGZhbHNlLFxuICAgICAgICB2YWx1ZTogc3ltXG4gICAgICB9KTtcbiAgICAgIHJldHVybiBzeW07XG4gICAgfTtcbiAgICBpZiAoIVR5cGUuc3ltYm9sKFN5bWJvbC5zZWFyY2gpKSB7XG4gICAgICB2YXIgc3ltYm9sU2VhcmNoID0gZGVmaW5lV2VsbEtub3duU3ltYm9sKCdzZWFyY2gnKTtcbiAgICAgIHZhciBvcmlnaW5hbFNlYXJjaCA9IFN0cmluZy5wcm90b3R5cGUuc2VhcmNoO1xuICAgICAgZGVmaW5lUHJvcGVydHkoUmVnRXhwLnByb3RvdHlwZSwgc3ltYm9sU2VhcmNoLCBmdW5jdGlvbiBzZWFyY2goc3RyaW5nKSB7XG4gICAgICAgIHJldHVybiBFUy5DYWxsKG9yaWdpbmFsU2VhcmNoLCBzdHJpbmcsIFt0aGlzXSk7XG4gICAgICB9KTtcbiAgICAgIHZhciBzZWFyY2hTaGltID0gZnVuY3Rpb24gc2VhcmNoKHJlZ2V4cCkge1xuICAgICAgICB2YXIgTyA9IEVTLlJlcXVpcmVPYmplY3RDb2VyY2libGUodGhpcyk7XG4gICAgICAgIGlmIChyZWdleHAgIT09IG51bGwgJiYgdHlwZW9mIHJlZ2V4cCAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICB2YXIgc2VhcmNoZXIgPSBFUy5HZXRNZXRob2QocmVnZXhwLCBzeW1ib2xTZWFyY2gpO1xuICAgICAgICAgIGlmICh0eXBlb2Ygc2VhcmNoZXIgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICByZXR1cm4gRVMuQ2FsbChzZWFyY2hlciwgcmVnZXhwLCBbT10pO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gRVMuQ2FsbChvcmlnaW5hbFNlYXJjaCwgTywgW0VTLlRvU3RyaW5nKHJlZ2V4cCldKTtcbiAgICAgIH07XG4gICAgICBvdmVycmlkZU5hdGl2ZShTdHJpbmcucHJvdG90eXBlLCAnc2VhcmNoJywgc2VhcmNoU2hpbSk7XG4gICAgfVxuICAgIGlmICghVHlwZS5zeW1ib2woU3ltYm9sLnJlcGxhY2UpKSB7XG4gICAgICB2YXIgc3ltYm9sUmVwbGFjZSA9IGRlZmluZVdlbGxLbm93blN5bWJvbCgncmVwbGFjZScpO1xuICAgICAgdmFyIG9yaWdpbmFsUmVwbGFjZSA9IFN0cmluZy5wcm90b3R5cGUucmVwbGFjZTtcbiAgICAgIGRlZmluZVByb3BlcnR5KFJlZ0V4cC5wcm90b3R5cGUsIHN5bWJvbFJlcGxhY2UsIGZ1bmN0aW9uIHJlcGxhY2Uoc3RyaW5nLCByZXBsYWNlVmFsdWUpIHtcbiAgICAgICAgcmV0dXJuIEVTLkNhbGwob3JpZ2luYWxSZXBsYWNlLCBzdHJpbmcsIFt0aGlzLCByZXBsYWNlVmFsdWVdKTtcbiAgICAgIH0pO1xuICAgICAgdmFyIHJlcGxhY2VTaGltID0gZnVuY3Rpb24gcmVwbGFjZShzZWFyY2hWYWx1ZSwgcmVwbGFjZVZhbHVlKSB7XG4gICAgICAgIHZhciBPID0gRVMuUmVxdWlyZU9iamVjdENvZXJjaWJsZSh0aGlzKTtcbiAgICAgICAgaWYgKHNlYXJjaFZhbHVlICE9PSBudWxsICYmIHR5cGVvZiBzZWFyY2hWYWx1ZSAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICB2YXIgcmVwbGFjZXIgPSBFUy5HZXRNZXRob2Qoc2VhcmNoVmFsdWUsIHN5bWJvbFJlcGxhY2UpO1xuICAgICAgICAgIGlmICh0eXBlb2YgcmVwbGFjZXIgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICByZXR1cm4gRVMuQ2FsbChyZXBsYWNlciwgc2VhcmNoVmFsdWUsIFtPLCByZXBsYWNlVmFsdWVdKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIEVTLkNhbGwob3JpZ2luYWxSZXBsYWNlLCBPLCBbRVMuVG9TdHJpbmcoc2VhcmNoVmFsdWUpLCByZXBsYWNlVmFsdWVdKTtcbiAgICAgIH07XG4gICAgICBvdmVycmlkZU5hdGl2ZShTdHJpbmcucHJvdG90eXBlLCAncmVwbGFjZScsIHJlcGxhY2VTaGltKTtcbiAgICB9XG4gICAgaWYgKCFUeXBlLnN5bWJvbChTeW1ib2wuc3BsaXQpKSB7XG4gICAgICB2YXIgc3ltYm9sU3BsaXQgPSBkZWZpbmVXZWxsS25vd25TeW1ib2woJ3NwbGl0Jyk7XG4gICAgICB2YXIgb3JpZ2luYWxTcGxpdCA9IFN0cmluZy5wcm90b3R5cGUuc3BsaXQ7XG4gICAgICBkZWZpbmVQcm9wZXJ0eShSZWdFeHAucHJvdG90eXBlLCBzeW1ib2xTcGxpdCwgZnVuY3Rpb24gc3BsaXQoc3RyaW5nLCBsaW1pdCkge1xuICAgICAgICByZXR1cm4gRVMuQ2FsbChvcmlnaW5hbFNwbGl0LCBzdHJpbmcsIFt0aGlzLCBsaW1pdF0pO1xuICAgICAgfSk7XG4gICAgICB2YXIgc3BsaXRTaGltID0gZnVuY3Rpb24gc3BsaXQoc2VwYXJhdG9yLCBsaW1pdCkge1xuICAgICAgICB2YXIgTyA9IEVTLlJlcXVpcmVPYmplY3RDb2VyY2libGUodGhpcyk7XG4gICAgICAgIGlmIChzZXBhcmF0b3IgIT09IG51bGwgJiYgdHlwZW9mIHNlcGFyYXRvciAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICB2YXIgc3BsaXR0ZXIgPSBFUy5HZXRNZXRob2Qoc2VwYXJhdG9yLCBzeW1ib2xTcGxpdCk7XG4gICAgICAgICAgaWYgKHR5cGVvZiBzcGxpdHRlciAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIHJldHVybiBFUy5DYWxsKHNwbGl0dGVyLCBzZXBhcmF0b3IsIFtPLCBsaW1pdF0pO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gRVMuQ2FsbChvcmlnaW5hbFNwbGl0LCBPLCBbRVMuVG9TdHJpbmcoc2VwYXJhdG9yKSwgbGltaXRdKTtcbiAgICAgIH07XG4gICAgICBvdmVycmlkZU5hdGl2ZShTdHJpbmcucHJvdG90eXBlLCAnc3BsaXQnLCBzcGxpdFNoaW0pO1xuICAgIH1cbiAgICB2YXIgc3ltYm9sTWF0Y2hFeGlzdHMgPSBUeXBlLnN5bWJvbChTeW1ib2wubWF0Y2gpO1xuICAgIHZhciBzdHJpbmdNYXRjaElnbm9yZXNTeW1ib2xNYXRjaCA9IHN5bWJvbE1hdGNoRXhpc3RzICYmIChmdW5jdGlvbiAoKSB7XG4gICAgICAvLyBGaXJlZm94IDQxLCB0aHJvdWdoIE5pZ2h0bHkgNDUgaGFzIFN5bWJvbC5tYXRjaCwgYnV0IFN0cmluZyNtYXRjaCBpZ25vcmVzIGl0LlxuICAgICAgLy8gRmlyZWZveCA0MCBhbmQgYmVsb3cgaGF2ZSBTeW1ib2wubWF0Y2ggYnV0IFN0cmluZyNtYXRjaCB3b3JrcyBmaW5lLlxuICAgICAgdmFyIG8gPSB7fTtcbiAgICAgIG9bU3ltYm9sLm1hdGNoXSA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuIDQyOyB9O1xuICAgICAgcmV0dXJuICdhJy5tYXRjaChvKSAhPT0gNDI7XG4gICAgfSgpKTtcbiAgICBpZiAoIXN5bWJvbE1hdGNoRXhpc3RzIHx8IHN0cmluZ01hdGNoSWdub3Jlc1N5bWJvbE1hdGNoKSB7XG4gICAgICB2YXIgc3ltYm9sTWF0Y2ggPSBkZWZpbmVXZWxsS25vd25TeW1ib2woJ21hdGNoJyk7XG5cbiAgICAgIHZhciBvcmlnaW5hbE1hdGNoID0gU3RyaW5nLnByb3RvdHlwZS5tYXRjaDtcbiAgICAgIGRlZmluZVByb3BlcnR5KFJlZ0V4cC5wcm90b3R5cGUsIHN5bWJvbE1hdGNoLCBmdW5jdGlvbiBtYXRjaChzdHJpbmcpIHtcbiAgICAgICAgcmV0dXJuIEVTLkNhbGwob3JpZ2luYWxNYXRjaCwgc3RyaW5nLCBbdGhpc10pO1xuICAgICAgfSk7XG5cbiAgICAgIHZhciBtYXRjaFNoaW0gPSBmdW5jdGlvbiBtYXRjaChyZWdleHApIHtcbiAgICAgICAgdmFyIE8gPSBFUy5SZXF1aXJlT2JqZWN0Q29lcmNpYmxlKHRoaXMpO1xuICAgICAgICBpZiAocmVnZXhwICE9PSBudWxsICYmIHR5cGVvZiByZWdleHAgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgdmFyIG1hdGNoZXIgPSBFUy5HZXRNZXRob2QocmVnZXhwLCBzeW1ib2xNYXRjaCk7XG4gICAgICAgICAgaWYgKHR5cGVvZiBtYXRjaGVyICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgcmV0dXJuIEVTLkNhbGwobWF0Y2hlciwgcmVnZXhwLCBbT10pO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gRVMuQ2FsbChvcmlnaW5hbE1hdGNoLCBPLCBbRVMuVG9TdHJpbmcocmVnZXhwKV0pO1xuICAgICAgfTtcbiAgICAgIG92ZXJyaWRlTmF0aXZlKFN0cmluZy5wcm90b3R5cGUsICdtYXRjaCcsIG1hdGNoU2hpbSk7XG4gICAgfVxuICB9XG5cbiAgdmFyIHdyYXBDb25zdHJ1Y3RvciA9IGZ1bmN0aW9uIHdyYXBDb25zdHJ1Y3RvcihvcmlnaW5hbCwgcmVwbGFjZW1lbnQsIGtleXNUb1NraXApIHtcbiAgICBWYWx1ZS5wcmVzZXJ2ZVRvU3RyaW5nKHJlcGxhY2VtZW50LCBvcmlnaW5hbCk7XG4gICAgaWYgKE9iamVjdC5zZXRQcm90b3R5cGVPZikge1xuICAgICAgLy8gc2V0cyB1cCBwcm9wZXIgcHJvdG90eXBlIGNoYWluIHdoZXJlIHBvc3NpYmxlXG4gICAgICBPYmplY3Quc2V0UHJvdG90eXBlT2Yob3JpZ2luYWwsIHJlcGxhY2VtZW50KTtcbiAgICB9XG4gICAgaWYgKHN1cHBvcnRzRGVzY3JpcHRvcnMpIHtcbiAgICAgIF9mb3JFYWNoKE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKG9yaWdpbmFsKSwgZnVuY3Rpb24gKGtleSkge1xuICAgICAgICBpZiAoa2V5IGluIG5vb3AgfHwga2V5c1RvU2tpcFtrZXldKSB7IHJldHVybjsgfVxuICAgICAgICBWYWx1ZS5wcm94eShvcmlnaW5hbCwga2V5LCByZXBsYWNlbWVudCk7XG4gICAgICB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgX2ZvckVhY2goT2JqZWN0LmtleXMob3JpZ2luYWwpLCBmdW5jdGlvbiAoa2V5KSB7XG4gICAgICAgIGlmIChrZXkgaW4gbm9vcCB8fCBrZXlzVG9Ta2lwW2tleV0pIHsgcmV0dXJuOyB9XG4gICAgICAgIHJlcGxhY2VtZW50W2tleV0gPSBvcmlnaW5hbFtrZXldO1xuICAgICAgfSk7XG4gICAgfVxuICAgIHJlcGxhY2VtZW50LnByb3RvdHlwZSA9IG9yaWdpbmFsLnByb3RvdHlwZTtcbiAgICBWYWx1ZS5yZWRlZmluZShvcmlnaW5hbC5wcm90b3R5cGUsICdjb25zdHJ1Y3RvcicsIHJlcGxhY2VtZW50KTtcbiAgfTtcblxuICB2YXIgZGVmYXVsdFNwZWNpZXNHZXR0ZXIgPSBmdW5jdGlvbiAoKSB7IHJldHVybiB0aGlzOyB9O1xuICB2YXIgYWRkRGVmYXVsdFNwZWNpZXMgPSBmdW5jdGlvbiAoQykge1xuICAgIGlmIChzdXBwb3J0c0Rlc2NyaXB0b3JzICYmICFfaGFzT3duUHJvcGVydHkoQywgc3ltYm9sU3BlY2llcykpIHtcbiAgICAgIFZhbHVlLmdldHRlcihDLCBzeW1ib2xTcGVjaWVzLCBkZWZhdWx0U3BlY2llc0dldHRlcik7XG4gICAgfVxuICB9O1xuXG4gIHZhciBhZGRJdGVyYXRvciA9IGZ1bmN0aW9uIChwcm90b3R5cGUsIGltcGwpIHtcbiAgICB2YXIgaW1wbGVtZW50YXRpb24gPSBpbXBsIHx8IGZ1bmN0aW9uIGl0ZXJhdG9yKCkgeyByZXR1cm4gdGhpczsgfTtcbiAgICBkZWZpbmVQcm9wZXJ0eShwcm90b3R5cGUsICRpdGVyYXRvciQsIGltcGxlbWVudGF0aW9uKTtcbiAgICBpZiAoIXByb3RvdHlwZVskaXRlcmF0b3IkXSAmJiBUeXBlLnN5bWJvbCgkaXRlcmF0b3IkKSkge1xuICAgICAgLy8gaW1wbGVtZW50YXRpb25zIGFyZSBidWdneSB3aGVuICRpdGVyYXRvciQgaXMgYSBTeW1ib2xcbiAgICAgIHByb3RvdHlwZVskaXRlcmF0b3IkXSA9IGltcGxlbWVudGF0aW9uO1xuICAgIH1cbiAgfTtcblxuICB2YXIgY3JlYXRlRGF0YVByb3BlcnR5ID0gZnVuY3Rpb24gY3JlYXRlRGF0YVByb3BlcnR5KG9iamVjdCwgbmFtZSwgdmFsdWUpIHtcbiAgICBpZiAoc3VwcG9ydHNEZXNjcmlwdG9ycykge1xuICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KG9iamVjdCwgbmFtZSwge1xuICAgICAgICBjb25maWd1cmFibGU6IHRydWUsXG4gICAgICAgIGVudW1lcmFibGU6IHRydWUsXG4gICAgICAgIHdyaXRhYmxlOiB0cnVlLFxuICAgICAgICB2YWx1ZTogdmFsdWVcbiAgICAgIH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICBvYmplY3RbbmFtZV0gPSB2YWx1ZTtcbiAgICB9XG4gIH07XG4gIHZhciBjcmVhdGVEYXRhUHJvcGVydHlPclRocm93ID0gZnVuY3Rpb24gY3JlYXRlRGF0YVByb3BlcnR5T3JUaHJvdyhvYmplY3QsIG5hbWUsIHZhbHVlKSB7XG4gICAgY3JlYXRlRGF0YVByb3BlcnR5KG9iamVjdCwgbmFtZSwgdmFsdWUpO1xuICAgIGlmICghRVMuU2FtZVZhbHVlKG9iamVjdFtuYW1lXSwgdmFsdWUpKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdwcm9wZXJ0eSBpcyBub25jb25maWd1cmFibGUnKTtcbiAgICB9XG4gIH07XG5cbiAgdmFyIGVtdWxhdGVFUzZjb25zdHJ1Y3QgPSBmdW5jdGlvbiAobywgZGVmYXVsdE5ld1RhcmdldCwgZGVmYXVsdFByb3RvLCBzbG90cykge1xuICAgIC8vIFRoaXMgaXMgYW4gZXM1IGFwcHJveGltYXRpb24gdG8gZXM2IGNvbnN0cnVjdCBzZW1hbnRpY3MuICBpbiBlczYsXG4gICAgLy8gJ25ldyBGb28nIGludm9rZXMgRm9vLltbQ29uc3RydWN0XV0gd2hpY2ggKGZvciBhbG1vc3QgYWxsIG9iamVjdHMpXG4gICAgLy8ganVzdCBzZXRzIHRoZSBpbnRlcm5hbCB2YXJpYWJsZSBOZXdUYXJnZXQgKGluIGVzNiBzeW50YXggYG5ldy50YXJnZXRgKVxuICAgIC8vIHRvIEZvbyBhbmQgdGhlbiByZXR1cm5zIEZvbygpLlxuXG4gICAgLy8gTWFueSBFUzYgb2JqZWN0IHRoZW4gaGF2ZSBjb25zdHJ1Y3RvcnMgb2YgdGhlIGZvcm06XG4gICAgLy8gMS4gSWYgTmV3VGFyZ2V0IGlzIHVuZGVmaW5lZCwgdGhyb3cgYSBUeXBlRXJyb3IgZXhjZXB0aW9uXG4gICAgLy8gMi4gTGV0IHh4eCBieSBPcmRpbmFyeUNyZWF0ZUZyb21Db25zdHJ1Y3RvcihOZXdUYXJnZXQsIHl5eSwgenp6KVxuXG4gICAgLy8gU28gd2UncmUgZ29pbmcgdG8gZW11bGF0ZSB0aG9zZSBmaXJzdCB0d28gc3RlcHMuXG4gICAgaWYgKCFFUy5UeXBlSXNPYmplY3QobykpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0NvbnN0cnVjdG9yIHJlcXVpcmVzIGBuZXdgOiAnICsgZGVmYXVsdE5ld1RhcmdldC5uYW1lKTtcbiAgICB9XG4gICAgdmFyIHByb3RvID0gZGVmYXVsdE5ld1RhcmdldC5wcm90b3R5cGU7XG4gICAgaWYgKCFFUy5UeXBlSXNPYmplY3QocHJvdG8pKSB7XG4gICAgICBwcm90byA9IGRlZmF1bHRQcm90bztcbiAgICB9XG4gICAgdmFyIG9iaiA9IGNyZWF0ZShwcm90byk7XG4gICAgZm9yICh2YXIgbmFtZSBpbiBzbG90cykge1xuICAgICAgaWYgKF9oYXNPd25Qcm9wZXJ0eShzbG90cywgbmFtZSkpIHtcbiAgICAgICAgdmFyIHZhbHVlID0gc2xvdHNbbmFtZV07XG4gICAgICAgIGRlZmluZVByb3BlcnR5KG9iaiwgbmFtZSwgdmFsdWUsIHRydWUpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gb2JqO1xuICB9O1xuXG4gIC8vIEZpcmVmb3ggMzEgcmVwb3J0cyB0aGlzIGZ1bmN0aW9uJ3MgbGVuZ3RoIGFzIDBcbiAgLy8gaHR0cHM6Ly9idWd6aWxsYS5tb3ppbGxhLm9yZy9zaG93X2J1Zy5jZ2k/aWQ9MTA2MjQ4NFxuICBpZiAoU3RyaW5nLmZyb21Db2RlUG9pbnQgJiYgU3RyaW5nLmZyb21Db2RlUG9pbnQubGVuZ3RoICE9PSAxKSB7XG4gICAgdmFyIG9yaWdpbmFsRnJvbUNvZGVQb2ludCA9IFN0cmluZy5mcm9tQ29kZVBvaW50O1xuICAgIG92ZXJyaWRlTmF0aXZlKFN0cmluZywgJ2Zyb21Db2RlUG9pbnQnLCBmdW5jdGlvbiBmcm9tQ29kZVBvaW50KGNvZGVQb2ludHMpIHsgcmV0dXJuIEVTLkNhbGwob3JpZ2luYWxGcm9tQ29kZVBvaW50LCB0aGlzLCBhcmd1bWVudHMpOyB9KTtcbiAgfVxuXG4gIHZhciBTdHJpbmdTaGltcyA9IHtcbiAgICBmcm9tQ29kZVBvaW50OiBmdW5jdGlvbiBmcm9tQ29kZVBvaW50KGNvZGVQb2ludHMpIHtcbiAgICAgIHZhciByZXN1bHQgPSBbXTtcbiAgICAgIHZhciBuZXh0O1xuICAgICAgZm9yICh2YXIgaSA9IDAsIGxlbmd0aCA9IGFyZ3VtZW50cy5sZW5ndGg7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgICBuZXh0ID0gTnVtYmVyKGFyZ3VtZW50c1tpXSk7XG4gICAgICAgIGlmICghRVMuU2FtZVZhbHVlKG5leHQsIEVTLlRvSW50ZWdlcihuZXh0KSkgfHwgbmV4dCA8IDAgfHwgbmV4dCA+IDB4MTBGRkZGKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ0ludmFsaWQgY29kZSBwb2ludCAnICsgbmV4dCk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAobmV4dCA8IDB4MTAwMDApIHtcbiAgICAgICAgICBfcHVzaChyZXN1bHQsIFN0cmluZy5mcm9tQ2hhckNvZGUobmV4dCkpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIG5leHQgLT0gMHgxMDAwMDtcbiAgICAgICAgICBfcHVzaChyZXN1bHQsIFN0cmluZy5mcm9tQ2hhckNvZGUoKG5leHQgPj4gMTApICsgMHhEODAwKSk7XG4gICAgICAgICAgX3B1c2gocmVzdWx0LCBTdHJpbmcuZnJvbUNoYXJDb2RlKChuZXh0ICUgMHg0MDApICsgMHhEQzAwKSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiByZXN1bHQuam9pbignJyk7XG4gICAgfSxcblxuICAgIHJhdzogZnVuY3Rpb24gcmF3KGNhbGxTaXRlKSB7XG4gICAgICB2YXIgY29va2VkID0gRVMuVG9PYmplY3QoY2FsbFNpdGUsICdiYWQgY2FsbFNpdGUnKTtcbiAgICAgIHZhciByYXdTdHJpbmcgPSBFUy5Ub09iamVjdChjb29rZWQucmF3LCAnYmFkIHJhdyB2YWx1ZScpO1xuICAgICAgdmFyIGxlbiA9IHJhd1N0cmluZy5sZW5ndGg7XG4gICAgICB2YXIgbGl0ZXJhbHNlZ21lbnRzID0gRVMuVG9MZW5ndGgobGVuKTtcbiAgICAgIGlmIChsaXRlcmFsc2VnbWVudHMgPD0gMCkge1xuICAgICAgICByZXR1cm4gJyc7XG4gICAgICB9XG5cbiAgICAgIHZhciBzdHJpbmdFbGVtZW50cyA9IFtdO1xuICAgICAgdmFyIG5leHRJbmRleCA9IDA7XG4gICAgICB2YXIgbmV4dEtleSwgbmV4dCwgbmV4dFNlZywgbmV4dFN1YjtcbiAgICAgIHdoaWxlIChuZXh0SW5kZXggPCBsaXRlcmFsc2VnbWVudHMpIHtcbiAgICAgICAgbmV4dEtleSA9IEVTLlRvU3RyaW5nKG5leHRJbmRleCk7XG4gICAgICAgIG5leHRTZWcgPSBFUy5Ub1N0cmluZyhyYXdTdHJpbmdbbmV4dEtleV0pO1xuICAgICAgICBfcHVzaChzdHJpbmdFbGVtZW50cywgbmV4dFNlZyk7XG4gICAgICAgIGlmIChuZXh0SW5kZXggKyAxID49IGxpdGVyYWxzZWdtZW50cykge1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICAgIG5leHQgPSBuZXh0SW5kZXggKyAxIDwgYXJndW1lbnRzLmxlbmd0aCA/IGFyZ3VtZW50c1tuZXh0SW5kZXggKyAxXSA6ICcnO1xuICAgICAgICBuZXh0U3ViID0gRVMuVG9TdHJpbmcobmV4dCk7XG4gICAgICAgIF9wdXNoKHN0cmluZ0VsZW1lbnRzLCBuZXh0U3ViKTtcbiAgICAgICAgbmV4dEluZGV4ICs9IDE7XG4gICAgICB9XG4gICAgICByZXR1cm4gc3RyaW5nRWxlbWVudHMuam9pbignJyk7XG4gICAgfVxuICB9O1xuICBpZiAoU3RyaW5nLnJhdyAmJiBTdHJpbmcucmF3KHsgcmF3OiB7IDA6ICd4JywgMTogJ3knLCBsZW5ndGg6IDIgfSB9KSAhPT0gJ3h5Jykge1xuICAgIC8vIElFIDExIFRQIGhhcyBhIGJyb2tlbiBTdHJpbmcucmF3IGltcGxlbWVudGF0aW9uXG4gICAgb3ZlcnJpZGVOYXRpdmUoU3RyaW5nLCAncmF3JywgU3RyaW5nU2hpbXMucmF3KTtcbiAgfVxuICBkZWZpbmVQcm9wZXJ0aWVzKFN0cmluZywgU3RyaW5nU2hpbXMpO1xuXG4gIC8vIEZhc3QgcmVwZWF0LCB1c2VzIHRoZSBgRXhwb25lbnRpYXRpb24gYnkgc3F1YXJpbmdgIGFsZ29yaXRobS5cbiAgLy8gUGVyZjogaHR0cDovL2pzcGVyZi5jb20vc3RyaW5nLXJlcGVhdDIvMlxuICB2YXIgc3RyaW5nUmVwZWF0ID0gZnVuY3Rpb24gcmVwZWF0KHMsIHRpbWVzKSB7XG4gICAgaWYgKHRpbWVzIDwgMSkgeyByZXR1cm4gJyc7IH1cbiAgICBpZiAodGltZXMgJSAyKSB7IHJldHVybiByZXBlYXQocywgdGltZXMgLSAxKSArIHM7IH1cbiAgICB2YXIgaGFsZiA9IHJlcGVhdChzLCB0aW1lcyAvIDIpO1xuICAgIHJldHVybiBoYWxmICsgaGFsZjtcbiAgfTtcbiAgdmFyIHN0cmluZ01heExlbmd0aCA9IEluZmluaXR5O1xuXG4gIHZhciBTdHJpbmdQcm90b3R5cGVTaGltcyA9IHtcbiAgICByZXBlYXQ6IGZ1bmN0aW9uIHJlcGVhdCh0aW1lcykge1xuICAgICAgdmFyIHRoaXNTdHIgPSBFUy5Ub1N0cmluZyhFUy5SZXF1aXJlT2JqZWN0Q29lcmNpYmxlKHRoaXMpKTtcbiAgICAgIHZhciBudW1UaW1lcyA9IEVTLlRvSW50ZWdlcih0aW1lcyk7XG4gICAgICBpZiAobnVtVGltZXMgPCAwIHx8IG51bVRpbWVzID49IHN0cmluZ01heExlbmd0aCkge1xuICAgICAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcigncmVwZWF0IGNvdW50IG11c3QgYmUgbGVzcyB0aGFuIGluZmluaXR5IGFuZCBub3Qgb3ZlcmZsb3cgbWF4aW11bSBzdHJpbmcgc2l6ZScpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHN0cmluZ1JlcGVhdCh0aGlzU3RyLCBudW1UaW1lcyk7XG4gICAgfSxcblxuICAgIHN0YXJ0c1dpdGg6IGZ1bmN0aW9uIHN0YXJ0c1dpdGgoc2VhcmNoU3RyaW5nKSB7XG4gICAgICB2YXIgUyA9IEVTLlRvU3RyaW5nKEVTLlJlcXVpcmVPYmplY3RDb2VyY2libGUodGhpcykpO1xuICAgICAgaWYgKEVTLklzUmVnRXhwKHNlYXJjaFN0cmluZykpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignQ2Fubm90IGNhbGwgbWV0aG9kIFwic3RhcnRzV2l0aFwiIHdpdGggYSByZWdleCcpO1xuICAgICAgfVxuICAgICAgdmFyIHNlYXJjaFN0ciA9IEVTLlRvU3RyaW5nKHNlYXJjaFN0cmluZyk7XG4gICAgICB2YXIgcG9zaXRpb247XG4gICAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgcG9zaXRpb24gPSBhcmd1bWVudHNbMV07XG4gICAgICB9XG4gICAgICB2YXIgc3RhcnQgPSBfbWF4KEVTLlRvSW50ZWdlcihwb3NpdGlvbiksIDApO1xuICAgICAgcmV0dXJuIF9zdHJTbGljZShTLCBzdGFydCwgc3RhcnQgKyBzZWFyY2hTdHIubGVuZ3RoKSA9PT0gc2VhcmNoU3RyO1xuICAgIH0sXG5cbiAgICBlbmRzV2l0aDogZnVuY3Rpb24gZW5kc1dpdGgoc2VhcmNoU3RyaW5nKSB7XG4gICAgICB2YXIgUyA9IEVTLlRvU3RyaW5nKEVTLlJlcXVpcmVPYmplY3RDb2VyY2libGUodGhpcykpO1xuICAgICAgaWYgKEVTLklzUmVnRXhwKHNlYXJjaFN0cmluZykpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignQ2Fubm90IGNhbGwgbWV0aG9kIFwiZW5kc1dpdGhcIiB3aXRoIGEgcmVnZXgnKTtcbiAgICAgIH1cbiAgICAgIHZhciBzZWFyY2hTdHIgPSBFUy5Ub1N0cmluZyhzZWFyY2hTdHJpbmcpO1xuICAgICAgdmFyIGxlbiA9IFMubGVuZ3RoO1xuICAgICAgdmFyIGVuZFBvc2l0aW9uO1xuICAgICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPiAxKSB7XG4gICAgICAgIGVuZFBvc2l0aW9uID0gYXJndW1lbnRzWzFdO1xuICAgICAgfVxuICAgICAgdmFyIHBvcyA9IHR5cGVvZiBlbmRQb3NpdGlvbiA9PT0gJ3VuZGVmaW5lZCcgPyBsZW4gOiBFUy5Ub0ludGVnZXIoZW5kUG9zaXRpb24pO1xuICAgICAgdmFyIGVuZCA9IF9taW4oX21heChwb3MsIDApLCBsZW4pO1xuICAgICAgcmV0dXJuIF9zdHJTbGljZShTLCBlbmQgLSBzZWFyY2hTdHIubGVuZ3RoLCBlbmQpID09PSBzZWFyY2hTdHI7XG4gICAgfSxcblxuICAgIGluY2x1ZGVzOiBmdW5jdGlvbiBpbmNsdWRlcyhzZWFyY2hTdHJpbmcpIHtcbiAgICAgIGlmIChFUy5Jc1JlZ0V4cChzZWFyY2hTdHJpbmcpKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1wiaW5jbHVkZXNcIiBkb2VzIG5vdCBhY2NlcHQgYSBSZWdFeHAnKTtcbiAgICAgIH1cbiAgICAgIHZhciBzZWFyY2hTdHIgPSBFUy5Ub1N0cmluZyhzZWFyY2hTdHJpbmcpO1xuICAgICAgdmFyIHBvc2l0aW9uO1xuICAgICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPiAxKSB7XG4gICAgICAgIHBvc2l0aW9uID0gYXJndW1lbnRzWzFdO1xuICAgICAgfVxuICAgICAgLy8gU29tZWhvdyB0aGlzIHRyaWNrIG1ha2VzIG1ldGhvZCAxMDAlIGNvbXBhdCB3aXRoIHRoZSBzcGVjLlxuICAgICAgcmV0dXJuIF9pbmRleE9mKHRoaXMsIHNlYXJjaFN0ciwgcG9zaXRpb24pICE9PSAtMTtcbiAgICB9LFxuXG4gICAgY29kZVBvaW50QXQ6IGZ1bmN0aW9uIGNvZGVQb2ludEF0KHBvcykge1xuICAgICAgdmFyIHRoaXNTdHIgPSBFUy5Ub1N0cmluZyhFUy5SZXF1aXJlT2JqZWN0Q29lcmNpYmxlKHRoaXMpKTtcbiAgICAgIHZhciBwb3NpdGlvbiA9IEVTLlRvSW50ZWdlcihwb3MpO1xuICAgICAgdmFyIGxlbmd0aCA9IHRoaXNTdHIubGVuZ3RoO1xuICAgICAgaWYgKHBvc2l0aW9uID49IDAgJiYgcG9zaXRpb24gPCBsZW5ndGgpIHtcbiAgICAgICAgdmFyIGZpcnN0ID0gdGhpc1N0ci5jaGFyQ29kZUF0KHBvc2l0aW9uKTtcbiAgICAgICAgdmFyIGlzRW5kID0gKHBvc2l0aW9uICsgMSA9PT0gbGVuZ3RoKTtcbiAgICAgICAgaWYgKGZpcnN0IDwgMHhEODAwIHx8IGZpcnN0ID4gMHhEQkZGIHx8IGlzRW5kKSB7IHJldHVybiBmaXJzdDsgfVxuICAgICAgICB2YXIgc2Vjb25kID0gdGhpc1N0ci5jaGFyQ29kZUF0KHBvc2l0aW9uICsgMSk7XG4gICAgICAgIGlmIChzZWNvbmQgPCAweERDMDAgfHwgc2Vjb25kID4gMHhERkZGKSB7IHJldHVybiBmaXJzdDsgfVxuICAgICAgICByZXR1cm4gKChmaXJzdCAtIDB4RDgwMCkgKiAxMDI0KSArIChzZWNvbmQgLSAweERDMDApICsgMHgxMDAwMDtcbiAgICAgIH1cbiAgICB9XG4gIH07XG4gIGlmIChTdHJpbmcucHJvdG90eXBlLmluY2x1ZGVzICYmICdhJy5pbmNsdWRlcygnYScsIEluZmluaXR5KSAhPT0gZmFsc2UpIHtcbiAgICBvdmVycmlkZU5hdGl2ZShTdHJpbmcucHJvdG90eXBlLCAnaW5jbHVkZXMnLCBTdHJpbmdQcm90b3R5cGVTaGltcy5pbmNsdWRlcyk7XG4gIH1cblxuICBpZiAoU3RyaW5nLnByb3RvdHlwZS5zdGFydHNXaXRoICYmIFN0cmluZy5wcm90b3R5cGUuZW5kc1dpdGgpIHtcbiAgICB2YXIgc3RhcnRzV2l0aFJlamVjdHNSZWdleCA9IHRocm93c0Vycm9yKGZ1bmN0aW9uICgpIHtcbiAgICAgIC8qIHRocm93cyBpZiBzcGVjLWNvbXBsaWFudCAqL1xuICAgICAgJy9hLycuc3RhcnRzV2l0aCgvYS8pO1xuICAgIH0pO1xuICAgIHZhciBzdGFydHNXaXRoSGFuZGxlc0luZmluaXR5ID0gdmFsdWVPckZhbHNlSWZUaHJvd3MoZnVuY3Rpb24gKCkge1xuICAgICAgcmV0dXJuICdhYmMnLnN0YXJ0c1dpdGgoJ2EnLCBJbmZpbml0eSkgPT09IGZhbHNlO1xuICAgIH0pO1xuICAgIGlmICghc3RhcnRzV2l0aFJlamVjdHNSZWdleCB8fCAhc3RhcnRzV2l0aEhhbmRsZXNJbmZpbml0eSkge1xuICAgICAgLy8gRmlyZWZveCAoPCAzNz8pIGFuZCBJRSAxMSBUUCBoYXZlIGEgbm9uY29tcGxpYW50IHN0YXJ0c1dpdGggaW1wbGVtZW50YXRpb25cbiAgICAgIG92ZXJyaWRlTmF0aXZlKFN0cmluZy5wcm90b3R5cGUsICdzdGFydHNXaXRoJywgU3RyaW5nUHJvdG90eXBlU2hpbXMuc3RhcnRzV2l0aCk7XG4gICAgICBvdmVycmlkZU5hdGl2ZShTdHJpbmcucHJvdG90eXBlLCAnZW5kc1dpdGgnLCBTdHJpbmdQcm90b3R5cGVTaGltcy5lbmRzV2l0aCk7XG4gICAgfVxuICB9XG4gIGlmIChoYXNTeW1ib2xzKSB7XG4gICAgdmFyIHN0YXJ0c1dpdGhTdXBwb3J0c1N5bWJvbE1hdGNoID0gdmFsdWVPckZhbHNlSWZUaHJvd3MoZnVuY3Rpb24gKCkge1xuICAgICAgdmFyIHJlID0gL2EvO1xuICAgICAgcmVbU3ltYm9sLm1hdGNoXSA9IGZhbHNlO1xuICAgICAgcmV0dXJuICcvYS8nLnN0YXJ0c1dpdGgocmUpO1xuICAgIH0pO1xuICAgIGlmICghc3RhcnRzV2l0aFN1cHBvcnRzU3ltYm9sTWF0Y2gpIHtcbiAgICAgIG92ZXJyaWRlTmF0aXZlKFN0cmluZy5wcm90b3R5cGUsICdzdGFydHNXaXRoJywgU3RyaW5nUHJvdG90eXBlU2hpbXMuc3RhcnRzV2l0aCk7XG4gICAgfVxuICAgIHZhciBlbmRzV2l0aFN1cHBvcnRzU3ltYm9sTWF0Y2ggPSB2YWx1ZU9yRmFsc2VJZlRocm93cyhmdW5jdGlvbiAoKSB7XG4gICAgICB2YXIgcmUgPSAvYS87XG4gICAgICByZVtTeW1ib2wubWF0Y2hdID0gZmFsc2U7XG4gICAgICByZXR1cm4gJy9hLycuZW5kc1dpdGgocmUpO1xuICAgIH0pO1xuICAgIGlmICghZW5kc1dpdGhTdXBwb3J0c1N5bWJvbE1hdGNoKSB7XG4gICAgICBvdmVycmlkZU5hdGl2ZShTdHJpbmcucHJvdG90eXBlLCAnZW5kc1dpdGgnLCBTdHJpbmdQcm90b3R5cGVTaGltcy5lbmRzV2l0aCk7XG4gICAgfVxuICAgIHZhciBpbmNsdWRlc1N1cHBvcnRzU3ltYm9sTWF0Y2ggPSB2YWx1ZU9yRmFsc2VJZlRocm93cyhmdW5jdGlvbiAoKSB7XG4gICAgICB2YXIgcmUgPSAvYS87XG4gICAgICByZVtTeW1ib2wubWF0Y2hdID0gZmFsc2U7XG4gICAgICByZXR1cm4gJy9hLycuaW5jbHVkZXMocmUpO1xuICAgIH0pO1xuICAgIGlmICghaW5jbHVkZXNTdXBwb3J0c1N5bWJvbE1hdGNoKSB7XG4gICAgICBvdmVycmlkZU5hdGl2ZShTdHJpbmcucHJvdG90eXBlLCAnaW5jbHVkZXMnLCBTdHJpbmdQcm90b3R5cGVTaGltcy5pbmNsdWRlcyk7XG4gICAgfVxuICB9XG5cbiAgZGVmaW5lUHJvcGVydGllcyhTdHJpbmcucHJvdG90eXBlLCBTdHJpbmdQcm90b3R5cGVTaGltcyk7XG5cbiAgLy8gd2hpdGVzcGFjZSBmcm9tOiBodHRwOi8vZXM1LmdpdGh1Yi5pby8jeDE1LjUuNC4yMFxuICAvLyBpbXBsZW1lbnRhdGlvbiBmcm9tIGh0dHBzOi8vZ2l0aHViLmNvbS9lcy1zaGltcy9lczUtc2hpbS9ibG9iL3YzLjQuMC9lczUtc2hpbS5qcyNMMTMwNC1MMTMyNFxuICB2YXIgd3MgPSBbXG4gICAgJ1xceDA5XFx4MEFcXHgwQlxceDBDXFx4MERcXHgyMFxceEEwXFx1MTY4MFxcdTE4MEVcXHUyMDAwXFx1MjAwMVxcdTIwMDJcXHUyMDAzJyxcbiAgICAnXFx1MjAwNFxcdTIwMDVcXHUyMDA2XFx1MjAwN1xcdTIwMDhcXHUyMDA5XFx1MjAwQVxcdTIwMkZcXHUyMDVGXFx1MzAwMFxcdTIwMjgnLFxuICAgICdcXHUyMDI5XFx1RkVGRidcbiAgXS5qb2luKCcnKTtcbiAgdmFyIHRyaW1SZWdleHAgPSBuZXcgUmVnRXhwKCcoXlsnICsgd3MgKyAnXSspfChbJyArIHdzICsgJ10rJCknLCAnZycpO1xuICB2YXIgdHJpbVNoaW0gPSBmdW5jdGlvbiB0cmltKCkge1xuICAgIHJldHVybiBFUy5Ub1N0cmluZyhFUy5SZXF1aXJlT2JqZWN0Q29lcmNpYmxlKHRoaXMpKS5yZXBsYWNlKHRyaW1SZWdleHAsICcnKTtcbiAgfTtcbiAgdmFyIG5vbldTID0gWydcXHUwMDg1JywgJ1xcdTIwMGInLCAnXFx1ZmZmZSddLmpvaW4oJycpO1xuICB2YXIgbm9uV1NyZWdleCA9IG5ldyBSZWdFeHAoJ1snICsgbm9uV1MgKyAnXScsICdnJyk7XG4gIHZhciBpc0JhZEhleFJlZ2V4ID0gL15bXFwtK10weFswLTlhLWZdKyQvaTtcbiAgdmFyIGhhc1N0cmluZ1RyaW1CdWcgPSBub25XUy50cmltKCkubGVuZ3RoICE9PSBub25XUy5sZW5ndGg7XG4gIGRlZmluZVByb3BlcnR5KFN0cmluZy5wcm90b3R5cGUsICd0cmltJywgdHJpbVNoaW0sIGhhc1N0cmluZ1RyaW1CdWcpO1xuXG4gIC8vIHNlZSBodHRwczovL3Blb3BsZS5tb3ppbGxhLm9yZy9+am9yZW5kb3JmZi9lczYtZHJhZnQuaHRtbCNzZWMtc3RyaW5nLnByb3RvdHlwZS1AQGl0ZXJhdG9yXG4gIHZhciBTdHJpbmdJdGVyYXRvciA9IGZ1bmN0aW9uIChzKSB7XG4gICAgRVMuUmVxdWlyZU9iamVjdENvZXJjaWJsZShzKTtcbiAgICB0aGlzLl9zID0gRVMuVG9TdHJpbmcocyk7XG4gICAgdGhpcy5faSA9IDA7XG4gIH07XG4gIFN0cmluZ0l0ZXJhdG9yLnByb3RvdHlwZS5uZXh0ID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBzID0gdGhpcy5fcywgaSA9IHRoaXMuX2k7XG4gICAgaWYgKHR5cGVvZiBzID09PSAndW5kZWZpbmVkJyB8fCBpID49IHMubGVuZ3RoKSB7XG4gICAgICB0aGlzLl9zID0gdm9pZCAwO1xuICAgICAgcmV0dXJuIHsgdmFsdWU6IHZvaWQgMCwgZG9uZTogdHJ1ZSB9O1xuICAgIH1cbiAgICB2YXIgZmlyc3QgPSBzLmNoYXJDb2RlQXQoaSksIHNlY29uZCwgbGVuO1xuICAgIGlmIChmaXJzdCA8IDB4RDgwMCB8fCBmaXJzdCA+IDB4REJGRiB8fCAoaSArIDEpID09PSBzLmxlbmd0aCkge1xuICAgICAgbGVuID0gMTtcbiAgICB9IGVsc2Uge1xuICAgICAgc2Vjb25kID0gcy5jaGFyQ29kZUF0KGkgKyAxKTtcbiAgICAgIGxlbiA9IChzZWNvbmQgPCAweERDMDAgfHwgc2Vjb25kID4gMHhERkZGKSA/IDEgOiAyO1xuICAgIH1cbiAgICB0aGlzLl9pID0gaSArIGxlbjtcbiAgICByZXR1cm4geyB2YWx1ZTogcy5zdWJzdHIoaSwgbGVuKSwgZG9uZTogZmFsc2UgfTtcbiAgfTtcbiAgYWRkSXRlcmF0b3IoU3RyaW5nSXRlcmF0b3IucHJvdG90eXBlKTtcbiAgYWRkSXRlcmF0b3IoU3RyaW5nLnByb3RvdHlwZSwgZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBuZXcgU3RyaW5nSXRlcmF0b3IodGhpcyk7XG4gIH0pO1xuXG4gIHZhciBBcnJheVNoaW1zID0ge1xuICAgIGZyb206IGZ1bmN0aW9uIGZyb20oaXRlbXMpIHtcbiAgICAgIHZhciBDID0gdGhpcztcbiAgICAgIHZhciBtYXBGbjtcbiAgICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID4gMSkge1xuICAgICAgICBtYXBGbiA9IGFyZ3VtZW50c1sxXTtcbiAgICAgIH1cbiAgICAgIHZhciBtYXBwaW5nLCBUO1xuICAgICAgaWYgKHR5cGVvZiBtYXBGbiA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgbWFwcGluZyA9IGZhbHNlO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaWYgKCFFUy5Jc0NhbGxhYmxlKG1hcEZuKSkge1xuICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0FycmF5LmZyb206IHdoZW4gcHJvdmlkZWQsIHRoZSBzZWNvbmQgYXJndW1lbnQgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPiAyKSB7XG4gICAgICAgICAgVCA9IGFyZ3VtZW50c1syXTtcbiAgICAgICAgfVxuICAgICAgICBtYXBwaW5nID0gdHJ1ZTtcbiAgICAgIH1cblxuICAgICAgLy8gTm90ZSB0aGF0IHRoYXQgQXJyYXlzIHdpbGwgdXNlIEFycmF5SXRlcmF0b3I6XG4gICAgICAvLyBodHRwczovL2J1Z3MuZWNtYXNjcmlwdC5vcmcvc2hvd19idWcuY2dpP2lkPTI0MTZcbiAgICAgIHZhciB1c2luZ0l0ZXJhdG9yID0gdHlwZW9mIChpc0FyZ3VtZW50cyhpdGVtcykgfHwgRVMuR2V0TWV0aG9kKGl0ZW1zLCAkaXRlcmF0b3IkKSkgIT09ICd1bmRlZmluZWQnO1xuXG4gICAgICB2YXIgbGVuZ3RoLCByZXN1bHQsIGk7XG4gICAgICBpZiAodXNpbmdJdGVyYXRvcikge1xuICAgICAgICByZXN1bHQgPSBFUy5Jc0NvbnN0cnVjdG9yKEMpID8gT2JqZWN0KG5ldyBDKCkpIDogW107XG4gICAgICAgIHZhciBpdGVyYXRvciA9IEVTLkdldEl0ZXJhdG9yKGl0ZW1zKTtcbiAgICAgICAgdmFyIG5leHQsIG5leHRWYWx1ZTtcblxuICAgICAgICBpID0gMDtcbiAgICAgICAgd2hpbGUgKHRydWUpIHtcbiAgICAgICAgICBuZXh0ID0gRVMuSXRlcmF0b3JTdGVwKGl0ZXJhdG9yKTtcbiAgICAgICAgICBpZiAobmV4dCA9PT0gZmFsc2UpIHtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIH1cbiAgICAgICAgICBuZXh0VmFsdWUgPSBuZXh0LnZhbHVlO1xuICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICBpZiAobWFwcGluZykge1xuICAgICAgICAgICAgICBuZXh0VmFsdWUgPSB0eXBlb2YgVCA9PT0gJ3VuZGVmaW5lZCcgPyBtYXBGbihuZXh0VmFsdWUsIGkpIDogX2NhbGwobWFwRm4sIFQsIG5leHRWYWx1ZSwgaSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXN1bHRbaV0gPSBuZXh0VmFsdWU7XG4gICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgRVMuSXRlcmF0b3JDbG9zZShpdGVyYXRvciwgdHJ1ZSk7XG4gICAgICAgICAgICB0aHJvdyBlO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpICs9IDE7XG4gICAgICAgIH1cbiAgICAgICAgbGVuZ3RoID0gaTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHZhciBhcnJheUxpa2UgPSBFUy5Ub09iamVjdChpdGVtcyk7XG4gICAgICAgIGxlbmd0aCA9IEVTLlRvTGVuZ3RoKGFycmF5TGlrZS5sZW5ndGgpO1xuICAgICAgICByZXN1bHQgPSBFUy5Jc0NvbnN0cnVjdG9yKEMpID8gT2JqZWN0KG5ldyBDKGxlbmd0aCkpIDogbmV3IEFycmF5KGxlbmd0aCk7XG4gICAgICAgIHZhciB2YWx1ZTtcbiAgICAgICAgZm9yIChpID0gMDsgaSA8IGxlbmd0aDsgKytpKSB7XG4gICAgICAgICAgdmFsdWUgPSBhcnJheUxpa2VbaV07XG4gICAgICAgICAgaWYgKG1hcHBpbmcpIHtcbiAgICAgICAgICAgIHZhbHVlID0gdHlwZW9mIFQgPT09ICd1bmRlZmluZWQnID8gbWFwRm4odmFsdWUsIGkpIDogX2NhbGwobWFwRm4sIFQsIHZhbHVlLCBpKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgcmVzdWx0W2ldID0gdmFsdWU7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgcmVzdWx0Lmxlbmd0aCA9IGxlbmd0aDtcbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfSxcblxuICAgIG9mOiBmdW5jdGlvbiBvZigpIHtcbiAgICAgIHZhciBsZW4gPSBhcmd1bWVudHMubGVuZ3RoO1xuICAgICAgdmFyIEMgPSB0aGlzO1xuICAgICAgdmFyIEEgPSBpc0FycmF5KEMpIHx8ICFFUy5Jc0NhbGxhYmxlKEMpID8gbmV3IEFycmF5KGxlbikgOiBFUy5Db25zdHJ1Y3QoQywgW2xlbl0pO1xuICAgICAgZm9yICh2YXIgayA9IDA7IGsgPCBsZW47ICsraykge1xuICAgICAgICBjcmVhdGVEYXRhUHJvcGVydHlPclRocm93KEEsIGssIGFyZ3VtZW50c1trXSk7XG4gICAgICB9XG4gICAgICBBLmxlbmd0aCA9IGxlbjtcbiAgICAgIHJldHVybiBBO1xuICAgIH1cbiAgfTtcbiAgZGVmaW5lUHJvcGVydGllcyhBcnJheSwgQXJyYXlTaGltcyk7XG4gIGFkZERlZmF1bHRTcGVjaWVzKEFycmF5KTtcblxuICAvLyBHaXZlbiBhbiBhcmd1bWVudCB4LCBpdCB3aWxsIHJldHVybiBhbiBJdGVyYXRvclJlc3VsdCBvYmplY3QsXG4gIC8vIHdpdGggdmFsdWUgc2V0IHRvIHggYW5kIGRvbmUgdG8gZmFsc2UuXG4gIC8vIEdpdmVuIG5vIGFyZ3VtZW50cywgaXQgd2lsbCByZXR1cm4gYW4gaXRlcmF0b3IgY29tcGxldGlvbiBvYmplY3QuXG4gIHZhciBpdGVyYXRvclJlc3VsdCA9IGZ1bmN0aW9uICh4KSB7XG4gICAgcmV0dXJuIHsgdmFsdWU6IHgsIGRvbmU6IGFyZ3VtZW50cy5sZW5ndGggPT09IDAgfTtcbiAgfTtcblxuICAvLyBPdXIgQXJyYXlJdGVyYXRvciBpcyBwcml2YXRlOyBzZWVcbiAgLy8gaHR0cHM6Ly9naXRodWIuY29tL3BhdWxtaWxsci9lczYtc2hpbS9pc3N1ZXMvMjUyXG4gIEFycmF5SXRlcmF0b3IgPSBmdW5jdGlvbiAoYXJyYXksIGtpbmQpIHtcbiAgICAgIHRoaXMuaSA9IDA7XG4gICAgICB0aGlzLmFycmF5ID0gYXJyYXk7XG4gICAgICB0aGlzLmtpbmQgPSBraW5kO1xuICB9O1xuXG4gIGRlZmluZVByb3BlcnRpZXMoQXJyYXlJdGVyYXRvci5wcm90b3R5cGUsIHtcbiAgICBuZXh0OiBmdW5jdGlvbiAoKSB7XG4gICAgICB2YXIgaSA9IHRoaXMuaSwgYXJyYXkgPSB0aGlzLmFycmF5O1xuICAgICAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIEFycmF5SXRlcmF0b3IpKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ05vdCBhbiBBcnJheUl0ZXJhdG9yJyk7XG4gICAgICB9XG4gICAgICBpZiAodHlwZW9mIGFycmF5ICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICB2YXIgbGVuID0gRVMuVG9MZW5ndGgoYXJyYXkubGVuZ3RoKTtcbiAgICAgICAgZm9yICg7IGkgPCBsZW47IGkrKykge1xuICAgICAgICAgIHZhciBraW5kID0gdGhpcy5raW5kO1xuICAgICAgICAgIHZhciByZXR2YWw7XG4gICAgICAgICAgaWYgKGtpbmQgPT09ICdrZXknKSB7XG4gICAgICAgICAgICByZXR2YWwgPSBpO1xuICAgICAgICAgIH0gZWxzZSBpZiAoa2luZCA9PT0gJ3ZhbHVlJykge1xuICAgICAgICAgICAgcmV0dmFsID0gYXJyYXlbaV07XG4gICAgICAgICAgfSBlbHNlIGlmIChraW5kID09PSAnZW50cnknKSB7XG4gICAgICAgICAgICByZXR2YWwgPSBbaSwgYXJyYXlbaV1dO1xuICAgICAgICAgIH1cbiAgICAgICAgICB0aGlzLmkgPSBpICsgMTtcbiAgICAgICAgICByZXR1cm4geyB2YWx1ZTogcmV0dmFsLCBkb25lOiBmYWxzZSB9O1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICB0aGlzLmFycmF5ID0gdm9pZCAwO1xuICAgICAgcmV0dXJuIHsgdmFsdWU6IHZvaWQgMCwgZG9uZTogdHJ1ZSB9O1xuICAgIH1cbiAgfSk7XG4gIGFkZEl0ZXJhdG9yKEFycmF5SXRlcmF0b3IucHJvdG90eXBlKTtcblxuICB2YXIgb3JkZXJLZXlzID0gZnVuY3Rpb24gb3JkZXJLZXlzKGEsIGIpIHtcbiAgICB2YXIgYU51bWVyaWMgPSBTdHJpbmcoRVMuVG9JbnRlZ2VyKGEpKSA9PT0gYTtcbiAgICB2YXIgYk51bWVyaWMgPSBTdHJpbmcoRVMuVG9JbnRlZ2VyKGIpKSA9PT0gYjtcbiAgICBpZiAoYU51bWVyaWMgJiYgYk51bWVyaWMpIHtcbiAgICAgIHJldHVybiBiIC0gYTtcbiAgICB9IGVsc2UgaWYgKGFOdW1lcmljICYmICFiTnVtZXJpYykge1xuICAgICAgcmV0dXJuIC0xO1xuICAgIH0gZWxzZSBpZiAoIWFOdW1lcmljICYmIGJOdW1lcmljKSB7XG4gICAgICByZXR1cm4gMTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIGEubG9jYWxlQ29tcGFyZShiKTtcbiAgICB9XG4gIH07XG4gIHZhciBnZXRBbGxLZXlzID0gZnVuY3Rpb24gZ2V0QWxsS2V5cyhvYmplY3QpIHtcbiAgICB2YXIgb3duS2V5cyA9IFtdO1xuICAgIHZhciBrZXlzID0gW107XG5cbiAgICBmb3IgKHZhciBrZXkgaW4gb2JqZWN0KSB7XG4gICAgICBfcHVzaChfaGFzT3duUHJvcGVydHkob2JqZWN0LCBrZXkpID8gb3duS2V5cyA6IGtleXMsIGtleSk7XG4gICAgfVxuICAgIF9zb3J0KG93bktleXMsIG9yZGVyS2V5cyk7XG4gICAgX3NvcnQoa2V5cywgb3JkZXJLZXlzKTtcblxuICAgIHJldHVybiBfY29uY2F0KG93bktleXMsIGtleXMpO1xuICB9O1xuXG4gIC8vIG5vdGU6IHRoaXMgaXMgcG9zaXRpb25lZCBoZXJlIGJlY2F1c2UgaXQgZGVwZW5kcyBvbiBBcnJheUl0ZXJhdG9yXG4gIHZhciBhcnJheU9mU3VwcG9ydHNTdWJjbGFzc2luZyA9IEFycmF5Lm9mID09PSBBcnJheVNoaW1zLm9mIHx8IChmdW5jdGlvbiAoKSB7XG4gICAgLy8gRGV0ZWN0cyBhIGJ1ZyBpbiBXZWJraXQgbmlnaHRseSByMTgxODg2XG4gICAgdmFyIEZvbyA9IGZ1bmN0aW9uIEZvbyhsZW4pIHsgdGhpcy5sZW5ndGggPSBsZW47IH07XG4gICAgRm9vLnByb3RvdHlwZSA9IFtdO1xuICAgIHZhciBmb29BcnIgPSBBcnJheS5vZi5hcHBseShGb28sIFsxLCAyXSk7XG4gICAgcmV0dXJuIGZvb0FyciBpbnN0YW5jZW9mIEZvbyAmJiBmb29BcnIubGVuZ3RoID09PSAyO1xuICB9KCkpO1xuICBpZiAoIWFycmF5T2ZTdXBwb3J0c1N1YmNsYXNzaW5nKSB7XG4gICAgb3ZlcnJpZGVOYXRpdmUoQXJyYXksICdvZicsIEFycmF5U2hpbXMub2YpO1xuICB9XG5cbiAgdmFyIEFycmF5UHJvdG90eXBlU2hpbXMgPSB7XG4gICAgY29weVdpdGhpbjogZnVuY3Rpb24gY29weVdpdGhpbih0YXJnZXQsIHN0YXJ0KSB7XG4gICAgICB2YXIgbyA9IEVTLlRvT2JqZWN0KHRoaXMpO1xuICAgICAgdmFyIGxlbiA9IEVTLlRvTGVuZ3RoKG8ubGVuZ3RoKTtcbiAgICAgIHZhciByZWxhdGl2ZVRhcmdldCA9IEVTLlRvSW50ZWdlcih0YXJnZXQpO1xuICAgICAgdmFyIHJlbGF0aXZlU3RhcnQgPSBFUy5Ub0ludGVnZXIoc3RhcnQpO1xuICAgICAgdmFyIHRvID0gcmVsYXRpdmVUYXJnZXQgPCAwID8gX21heChsZW4gKyByZWxhdGl2ZVRhcmdldCwgMCkgOiBfbWluKHJlbGF0aXZlVGFyZ2V0LCBsZW4pO1xuICAgICAgdmFyIGZyb20gPSByZWxhdGl2ZVN0YXJ0IDwgMCA/IF9tYXgobGVuICsgcmVsYXRpdmVTdGFydCwgMCkgOiBfbWluKHJlbGF0aXZlU3RhcnQsIGxlbik7XG4gICAgICB2YXIgZW5kO1xuICAgICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPiAyKSB7XG4gICAgICAgIGVuZCA9IGFyZ3VtZW50c1syXTtcbiAgICAgIH1cbiAgICAgIHZhciByZWxhdGl2ZUVuZCA9IHR5cGVvZiBlbmQgPT09ICd1bmRlZmluZWQnID8gbGVuIDogRVMuVG9JbnRlZ2VyKGVuZCk7XG4gICAgICB2YXIgZmluYWxJdGVtID0gcmVsYXRpdmVFbmQgPCAwID8gX21heChsZW4gKyByZWxhdGl2ZUVuZCwgMCkgOiBfbWluKHJlbGF0aXZlRW5kLCBsZW4pO1xuICAgICAgdmFyIGNvdW50ID0gX21pbihmaW5hbEl0ZW0gLSBmcm9tLCBsZW4gLSB0byk7XG4gICAgICB2YXIgZGlyZWN0aW9uID0gMTtcbiAgICAgIGlmIChmcm9tIDwgdG8gJiYgdG8gPCAoZnJvbSArIGNvdW50KSkge1xuICAgICAgICBkaXJlY3Rpb24gPSAtMTtcbiAgICAgICAgZnJvbSArPSBjb3VudCAtIDE7XG4gICAgICAgIHRvICs9IGNvdW50IC0gMTtcbiAgICAgIH1cbiAgICAgIHdoaWxlIChjb3VudCA+IDApIHtcbiAgICAgICAgaWYgKGZyb20gaW4gbykge1xuICAgICAgICAgIG9bdG9dID0gb1tmcm9tXTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBkZWxldGUgb1t0b107XG4gICAgICAgIH1cbiAgICAgICAgZnJvbSArPSBkaXJlY3Rpb247XG4gICAgICAgIHRvICs9IGRpcmVjdGlvbjtcbiAgICAgICAgY291bnQgLT0gMTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBvO1xuICAgIH0sXG5cbiAgICBmaWxsOiBmdW5jdGlvbiBmaWxsKHZhbHVlKSB7XG4gICAgICB2YXIgc3RhcnQ7XG4gICAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgc3RhcnQgPSBhcmd1bWVudHNbMV07XG4gICAgICB9XG4gICAgICB2YXIgZW5kO1xuICAgICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPiAyKSB7XG4gICAgICAgIGVuZCA9IGFyZ3VtZW50c1syXTtcbiAgICAgIH1cbiAgICAgIHZhciBPID0gRVMuVG9PYmplY3QodGhpcyk7XG4gICAgICB2YXIgbGVuID0gRVMuVG9MZW5ndGgoTy5sZW5ndGgpO1xuICAgICAgc3RhcnQgPSBFUy5Ub0ludGVnZXIodHlwZW9mIHN0YXJ0ID09PSAndW5kZWZpbmVkJyA/IDAgOiBzdGFydCk7XG4gICAgICBlbmQgPSBFUy5Ub0ludGVnZXIodHlwZW9mIGVuZCA9PT0gJ3VuZGVmaW5lZCcgPyBsZW4gOiBlbmQpO1xuXG4gICAgICB2YXIgcmVsYXRpdmVTdGFydCA9IHN0YXJ0IDwgMCA/IF9tYXgobGVuICsgc3RhcnQsIDApIDogX21pbihzdGFydCwgbGVuKTtcbiAgICAgIHZhciByZWxhdGl2ZUVuZCA9IGVuZCA8IDAgPyBsZW4gKyBlbmQgOiBlbmQ7XG5cbiAgICAgIGZvciAodmFyIGkgPSByZWxhdGl2ZVN0YXJ0OyBpIDwgbGVuICYmIGkgPCByZWxhdGl2ZUVuZDsgKytpKSB7XG4gICAgICAgIE9baV0gPSB2YWx1ZTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBPO1xuICAgIH0sXG5cbiAgICBmaW5kOiBmdW5jdGlvbiBmaW5kKHByZWRpY2F0ZSkge1xuICAgICAgdmFyIGxpc3QgPSBFUy5Ub09iamVjdCh0aGlzKTtcbiAgICAgIHZhciBsZW5ndGggPSBFUy5Ub0xlbmd0aChsaXN0Lmxlbmd0aCk7XG4gICAgICBpZiAoIUVTLklzQ2FsbGFibGUocHJlZGljYXRlKSkge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdBcnJheSNmaW5kOiBwcmVkaWNhdGUgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG4gICAgICB9XG4gICAgICB2YXIgdGhpc0FyZyA9IGFyZ3VtZW50cy5sZW5ndGggPiAxID8gYXJndW1lbnRzWzFdIDogbnVsbDtcbiAgICAgIGZvciAodmFyIGkgPSAwLCB2YWx1ZTsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHZhbHVlID0gbGlzdFtpXTtcbiAgICAgICAgaWYgKHRoaXNBcmcpIHtcbiAgICAgICAgICBpZiAoX2NhbGwocHJlZGljYXRlLCB0aGlzQXJnLCB2YWx1ZSwgaSwgbGlzdCkpIHsgcmV0dXJuIHZhbHVlOyB9XG4gICAgICAgIH0gZWxzZSBpZiAocHJlZGljYXRlKHZhbHVlLCBpLCBsaXN0KSkge1xuICAgICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0sXG5cbiAgICBmaW5kSW5kZXg6IGZ1bmN0aW9uIGZpbmRJbmRleChwcmVkaWNhdGUpIHtcbiAgICAgIHZhciBsaXN0ID0gRVMuVG9PYmplY3QodGhpcyk7XG4gICAgICB2YXIgbGVuZ3RoID0gRVMuVG9MZW5ndGgobGlzdC5sZW5ndGgpO1xuICAgICAgaWYgKCFFUy5Jc0NhbGxhYmxlKHByZWRpY2F0ZSkpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignQXJyYXkjZmluZEluZGV4OiBwcmVkaWNhdGUgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG4gICAgICB9XG4gICAgICB2YXIgdGhpc0FyZyA9IGFyZ3VtZW50cy5sZW5ndGggPiAxID8gYXJndW1lbnRzWzFdIDogbnVsbDtcbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgICAgaWYgKHRoaXNBcmcpIHtcbiAgICAgICAgICBpZiAoX2NhbGwocHJlZGljYXRlLCB0aGlzQXJnLCBsaXN0W2ldLCBpLCBsaXN0KSkgeyByZXR1cm4gaTsgfVxuICAgICAgICB9IGVsc2UgaWYgKHByZWRpY2F0ZShsaXN0W2ldLCBpLCBsaXN0KSkge1xuICAgICAgICAgIHJldHVybiBpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gLTE7XG4gICAgfSxcblxuICAgIGtleXM6IGZ1bmN0aW9uIGtleXMoKSB7XG4gICAgICByZXR1cm4gbmV3IEFycmF5SXRlcmF0b3IodGhpcywgJ2tleScpO1xuICAgIH0sXG5cbiAgICB2YWx1ZXM6IGZ1bmN0aW9uIHZhbHVlcygpIHtcbiAgICAgIHJldHVybiBuZXcgQXJyYXlJdGVyYXRvcih0aGlzLCAndmFsdWUnKTtcbiAgICB9LFxuXG4gICAgZW50cmllczogZnVuY3Rpb24gZW50cmllcygpIHtcbiAgICAgIHJldHVybiBuZXcgQXJyYXlJdGVyYXRvcih0aGlzLCAnZW50cnknKTtcbiAgICB9XG4gIH07XG4gIC8vIFNhZmFyaSA3LjEgZGVmaW5lcyBBcnJheSNrZXlzIGFuZCBBcnJheSNlbnRyaWVzIG5hdGl2ZWx5LFxuICAvLyBidXQgdGhlIHJlc3VsdGluZyBBcnJheUl0ZXJhdG9yIG9iamVjdHMgZG9uJ3QgaGF2ZSBhIFwibmV4dFwiIG1ldGhvZC5cbiAgaWYgKEFycmF5LnByb3RvdHlwZS5rZXlzICYmICFFUy5Jc0NhbGxhYmxlKFsxXS5rZXlzKCkubmV4dCkpIHtcbiAgICBkZWxldGUgQXJyYXkucHJvdG90eXBlLmtleXM7XG4gIH1cbiAgaWYgKEFycmF5LnByb3RvdHlwZS5lbnRyaWVzICYmICFFUy5Jc0NhbGxhYmxlKFsxXS5lbnRyaWVzKCkubmV4dCkpIHtcbiAgICBkZWxldGUgQXJyYXkucHJvdG90eXBlLmVudHJpZXM7XG4gIH1cblxuICAvLyBDaHJvbWUgMzggZGVmaW5lcyBBcnJheSNrZXlzIGFuZCBBcnJheSNlbnRyaWVzLCBhbmQgQXJyYXkjQEBpdGVyYXRvciwgYnV0IG5vdCBBcnJheSN2YWx1ZXNcbiAgaWYgKEFycmF5LnByb3RvdHlwZS5rZXlzICYmIEFycmF5LnByb3RvdHlwZS5lbnRyaWVzICYmICFBcnJheS5wcm90b3R5cGUudmFsdWVzICYmIEFycmF5LnByb3RvdHlwZVskaXRlcmF0b3IkXSkge1xuICAgIGRlZmluZVByb3BlcnRpZXMoQXJyYXkucHJvdG90eXBlLCB7XG4gICAgICB2YWx1ZXM6IEFycmF5LnByb3RvdHlwZVskaXRlcmF0b3IkXVxuICAgIH0pO1xuICAgIGlmIChUeXBlLnN5bWJvbChTeW1ib2wudW5zY29wYWJsZXMpKSB7XG4gICAgICBBcnJheS5wcm90b3R5cGVbU3ltYm9sLnVuc2NvcGFibGVzXS52YWx1ZXMgPSB0cnVlO1xuICAgIH1cbiAgfVxuICAvLyBDaHJvbWUgNDAgZGVmaW5lcyBBcnJheSN2YWx1ZXMgd2l0aCB0aGUgaW5jb3JyZWN0IG5hbWUsIGFsdGhvdWdoIEFycmF5I3trZXlzLGVudHJpZXN9IGhhdmUgdGhlIGNvcnJlY3QgbmFtZVxuICBpZiAoZnVuY3Rpb25zSGF2ZU5hbWVzICYmIEFycmF5LnByb3RvdHlwZS52YWx1ZXMgJiYgQXJyYXkucHJvdG90eXBlLnZhbHVlcy5uYW1lICE9PSAndmFsdWVzJykge1xuICAgIHZhciBvcmlnaW5hbEFycmF5UHJvdG90eXBlVmFsdWVzID0gQXJyYXkucHJvdG90eXBlLnZhbHVlcztcbiAgICBvdmVycmlkZU5hdGl2ZShBcnJheS5wcm90b3R5cGUsICd2YWx1ZXMnLCBmdW5jdGlvbiB2YWx1ZXMoKSB7IHJldHVybiBFUy5DYWxsKG9yaWdpbmFsQXJyYXlQcm90b3R5cGVWYWx1ZXMsIHRoaXMsIGFyZ3VtZW50cyk7IH0pO1xuICAgIGRlZmluZVByb3BlcnR5KEFycmF5LnByb3RvdHlwZSwgJGl0ZXJhdG9yJCwgQXJyYXkucHJvdG90eXBlLnZhbHVlcywgdHJ1ZSk7XG4gIH1cbiAgZGVmaW5lUHJvcGVydGllcyhBcnJheS5wcm90b3R5cGUsIEFycmF5UHJvdG90eXBlU2hpbXMpO1xuXG4gIGlmICgxIC8gW3RydWVdLmluZGV4T2YodHJ1ZSwgLTApIDwgMCkge1xuICAgIC8vIGluZGV4T2Ygd2hlbiBnaXZlbiBhIHBvc2l0aW9uIGFyZyBvZiAtMCBzaG91bGQgcmV0dXJuICswLlxuICAgIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS90YzM5L2VjbWEyNjIvcHVsbC8zMTZcbiAgICBkZWZpbmVQcm9wZXJ0eShBcnJheS5wcm90b3R5cGUsICdpbmRleE9mJywgZnVuY3Rpb24gaW5kZXhPZihzZWFyY2hFbGVtZW50KSB7XG4gICAgICB2YXIgdmFsdWUgPSBfYXJyYXlJbmRleE9mQXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICAgIGlmICh2YWx1ZSA9PT0gMCAmJiAoMSAvIHZhbHVlKSA8IDApIHtcbiAgICAgICAgcmV0dXJuIDA7XG4gICAgICB9XG4gICAgICByZXR1cm4gdmFsdWU7XG4gICAgfSwgdHJ1ZSk7XG4gIH1cblxuICBhZGRJdGVyYXRvcihBcnJheS5wcm90b3R5cGUsIGZ1bmN0aW9uICgpIHsgcmV0dXJuIHRoaXMudmFsdWVzKCk7IH0pO1xuICAvLyBDaHJvbWUgZGVmaW5lcyBrZXlzL3ZhbHVlcy9lbnRyaWVzIG9uIEFycmF5LCBidXQgZG9lc24ndCBnaXZlIHVzXG4gIC8vIGFueSB3YXkgdG8gaWRlbnRpZnkgaXRzIGl0ZXJhdG9yLiAgU28gYWRkIG91ciBvd24gc2hpbW1lZCBmaWVsZC5cbiAgaWYgKE9iamVjdC5nZXRQcm90b3R5cGVPZikge1xuICAgIGFkZEl0ZXJhdG9yKE9iamVjdC5nZXRQcm90b3R5cGVPZihbXS52YWx1ZXMoKSkpO1xuICB9XG5cbiAgLy8gbm90ZTogdGhpcyBpcyBwb3NpdGlvbmVkIGhlcmUgYmVjYXVzZSBpdCByZWxpZXMgb24gQXJyYXkjZW50cmllc1xuICB2YXIgYXJyYXlGcm9tU3dhbGxvd3NOZWdhdGl2ZUxlbmd0aHMgPSAoZnVuY3Rpb24gKCkge1xuICAgIC8vIERldGVjdHMgYSBGaXJlZm94IGJ1ZyBpbiB2MzJcbiAgICAvLyBodHRwczovL2J1Z3ppbGxhLm1vemlsbGEub3JnL3Nob3dfYnVnLmNnaT9pZD0xMDYzOTkzXG4gICAgcmV0dXJuIHZhbHVlT3JGYWxzZUlmVGhyb3dzKGZ1bmN0aW9uICgpIHsgcmV0dXJuIEFycmF5LmZyb20oeyBsZW5ndGg6IC0xIH0pLmxlbmd0aCA9PT0gMDsgfSk7XG4gIH0oKSk7XG4gIHZhciBhcnJheUZyb21IYW5kbGVzSXRlcmFibGVzID0gKGZ1bmN0aW9uICgpIHtcbiAgICAvLyBEZXRlY3RzIGEgYnVnIGluIFdlYmtpdCBuaWdodGx5IHIxODE4ODZcbiAgICB2YXIgYXJyID0gQXJyYXkuZnJvbShbMF0uZW50cmllcygpKTtcbiAgICByZXR1cm4gYXJyLmxlbmd0aCA9PT0gMSAmJiBpc0FycmF5KGFyclswXSkgJiYgYXJyWzBdWzBdID09PSAwICYmIGFyclswXVsxXSA9PT0gMDtcbiAgfSgpKTtcbiAgaWYgKCFhcnJheUZyb21Td2FsbG93c05lZ2F0aXZlTGVuZ3RocyB8fCAhYXJyYXlGcm9tSGFuZGxlc0l0ZXJhYmxlcykge1xuICAgIG92ZXJyaWRlTmF0aXZlKEFycmF5LCAnZnJvbScsIEFycmF5U2hpbXMuZnJvbSk7XG4gIH1cbiAgdmFyIGFycmF5RnJvbUhhbmRsZXNVbmRlZmluZWRNYXBGdW5jdGlvbiA9IChmdW5jdGlvbiAoKSB7XG4gICAgLy8gTWljcm9zb2Z0IEVkZ2UgdjAuMTEgdGhyb3dzIGlmIHRoZSBtYXBGbiBhcmd1bWVudCBpcyAqcHJvdmlkZWQqIGJ1dCB1bmRlZmluZWQsXG4gICAgLy8gYnV0IHRoZSBzcGVjIGRvZXNuJ3QgY2FyZSBpZiBpdCdzIHByb3ZpZGVkIG9yIG5vdCAtIHVuZGVmaW5lZCBkb2Vzbid0IHRocm93LlxuICAgIHJldHVybiB2YWx1ZU9yRmFsc2VJZlRocm93cyhmdW5jdGlvbiAoKSB7IHJldHVybiBBcnJheS5mcm9tKFswXSwgdm9pZCAwKTsgfSk7XG4gIH0oKSk7XG4gIGlmICghYXJyYXlGcm9tSGFuZGxlc1VuZGVmaW5lZE1hcEZ1bmN0aW9uKSB7XG4gICAgdmFyIG9yaWdBcnJheUZyb20gPSBBcnJheS5mcm9tO1xuICAgIG92ZXJyaWRlTmF0aXZlKEFycmF5LCAnZnJvbScsIGZ1bmN0aW9uIGZyb20oaXRlbXMpIHtcbiAgICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID4gMSAmJiB0eXBlb2YgYXJndW1lbnRzWzFdICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICByZXR1cm4gRVMuQ2FsbChvcmlnQXJyYXlGcm9tLCB0aGlzLCBhcmd1bWVudHMpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIF9jYWxsKG9yaWdBcnJheUZyb20sIHRoaXMsIGl0ZW1zKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIHZhciBpbnQzMnNBc09uZSA9IC0oTWF0aC5wb3coMiwgMzIpIC0gMSk7XG4gIHZhciB0b0xlbmd0aHNDb3JyZWN0bHkgPSBmdW5jdGlvbiAobWV0aG9kLCByZXZlcnNlZCkge1xuICAgIHZhciBvYmogPSB7IGxlbmd0aDogaW50MzJzQXNPbmUgfTtcbiAgICBvYmpbcmV2ZXJzZWQgPyAoKG9iai5sZW5ndGggPj4+IDApIC0gMSkgOiAwXSA9IHRydWU7XG4gICAgcmV0dXJuIHZhbHVlT3JGYWxzZUlmVGhyb3dzKGZ1bmN0aW9uICgpIHtcbiAgICAgIF9jYWxsKG1ldGhvZCwgb2JqLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIC8vIG5vdGU6IGluIG5vbmNvbmZvcm1pbmcgYnJvd3NlcnMsIHRoaXMgd2lsbCBiZSBjYWxsZWRcbiAgICAgICAgLy8gLTEgPj4+IDAgdGltZXMsIHdoaWNoIGlzIDQyOTQ5NjcyOTUsIHNvIHRoZSB0aHJvdyBtYXR0ZXJzLlxuICAgICAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcignc2hvdWxkIG5vdCByZWFjaCBoZXJlJyk7XG4gICAgICB9LCBbXSk7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9KTtcbiAgfTtcbiAgaWYgKCF0b0xlbmd0aHNDb3JyZWN0bHkoQXJyYXkucHJvdG90eXBlLmZvckVhY2gpKSB7XG4gICAgdmFyIG9yaWdpbmFsRm9yRWFjaCA9IEFycmF5LnByb3RvdHlwZS5mb3JFYWNoO1xuICAgIG92ZXJyaWRlTmF0aXZlKEFycmF5LnByb3RvdHlwZSwgJ2ZvckVhY2gnLCBmdW5jdGlvbiBmb3JFYWNoKGNhbGxiYWNrRm4pIHtcbiAgICAgIHJldHVybiBFUy5DYWxsKG9yaWdpbmFsRm9yRWFjaCwgdGhpcy5sZW5ndGggPj0gMCA/IHRoaXMgOiBbXSwgYXJndW1lbnRzKTtcbiAgICB9LCB0cnVlKTtcbiAgfVxuICBpZiAoIXRvTGVuZ3Roc0NvcnJlY3RseShBcnJheS5wcm90b3R5cGUubWFwKSkge1xuICAgIHZhciBvcmlnaW5hbE1hcCA9IEFycmF5LnByb3RvdHlwZS5tYXA7XG4gICAgb3ZlcnJpZGVOYXRpdmUoQXJyYXkucHJvdG90eXBlLCAnbWFwJywgZnVuY3Rpb24gbWFwKGNhbGxiYWNrRm4pIHtcbiAgICAgIHJldHVybiBFUy5DYWxsKG9yaWdpbmFsTWFwLCB0aGlzLmxlbmd0aCA+PSAwID8gdGhpcyA6IFtdLCBhcmd1bWVudHMpO1xuICAgIH0sIHRydWUpO1xuICB9XG4gIGlmICghdG9MZW5ndGhzQ29ycmVjdGx5KEFycmF5LnByb3RvdHlwZS5maWx0ZXIpKSB7XG4gICAgdmFyIG9yaWdpbmFsRmlsdGVyID0gQXJyYXkucHJvdG90eXBlLmZpbHRlcjtcbiAgICBvdmVycmlkZU5hdGl2ZShBcnJheS5wcm90b3R5cGUsICdmaWx0ZXInLCBmdW5jdGlvbiBmaWx0ZXIoY2FsbGJhY2tGbikge1xuICAgICAgcmV0dXJuIEVTLkNhbGwob3JpZ2luYWxGaWx0ZXIsIHRoaXMubGVuZ3RoID49IDAgPyB0aGlzIDogW10sIGFyZ3VtZW50cyk7XG4gICAgfSwgdHJ1ZSk7XG4gIH1cbiAgaWYgKCF0b0xlbmd0aHNDb3JyZWN0bHkoQXJyYXkucHJvdG90eXBlLnNvbWUpKSB7XG4gICAgdmFyIG9yaWdpbmFsU29tZSA9IEFycmF5LnByb3RvdHlwZS5zb21lO1xuICAgIG92ZXJyaWRlTmF0aXZlKEFycmF5LnByb3RvdHlwZSwgJ3NvbWUnLCBmdW5jdGlvbiBzb21lKGNhbGxiYWNrRm4pIHtcbiAgICAgIHJldHVybiBFUy5DYWxsKG9yaWdpbmFsU29tZSwgdGhpcy5sZW5ndGggPj0gMCA/IHRoaXMgOiBbXSwgYXJndW1lbnRzKTtcbiAgICB9LCB0cnVlKTtcbiAgfVxuICBpZiAoIXRvTGVuZ3Roc0NvcnJlY3RseShBcnJheS5wcm90b3R5cGUuZXZlcnkpKSB7XG4gICAgdmFyIG9yaWdpbmFsRXZlcnkgPSBBcnJheS5wcm90b3R5cGUuZXZlcnk7XG4gICAgb3ZlcnJpZGVOYXRpdmUoQXJyYXkucHJvdG90eXBlLCAnZXZlcnknLCBmdW5jdGlvbiBldmVyeShjYWxsYmFja0ZuKSB7XG4gICAgICByZXR1cm4gRVMuQ2FsbChvcmlnaW5hbEV2ZXJ5LCB0aGlzLmxlbmd0aCA+PSAwID8gdGhpcyA6IFtdLCBhcmd1bWVudHMpO1xuICAgIH0sIHRydWUpO1xuICB9XG4gIGlmICghdG9MZW5ndGhzQ29ycmVjdGx5KEFycmF5LnByb3RvdHlwZS5yZWR1Y2UpKSB7XG4gICAgdmFyIG9yaWdpbmFsUmVkdWNlID0gQXJyYXkucHJvdG90eXBlLnJlZHVjZTtcbiAgICBvdmVycmlkZU5hdGl2ZShBcnJheS5wcm90b3R5cGUsICdyZWR1Y2UnLCBmdW5jdGlvbiByZWR1Y2UoY2FsbGJhY2tGbikge1xuICAgICAgcmV0dXJuIEVTLkNhbGwob3JpZ2luYWxSZWR1Y2UsIHRoaXMubGVuZ3RoID49IDAgPyB0aGlzIDogW10sIGFyZ3VtZW50cyk7XG4gICAgfSwgdHJ1ZSk7XG4gIH1cbiAgaWYgKCF0b0xlbmd0aHNDb3JyZWN0bHkoQXJyYXkucHJvdG90eXBlLnJlZHVjZVJpZ2h0LCB0cnVlKSkge1xuICAgIHZhciBvcmlnaW5hbFJlZHVjZVJpZ2h0ID0gQXJyYXkucHJvdG90eXBlLnJlZHVjZVJpZ2h0O1xuICAgIG92ZXJyaWRlTmF0aXZlKEFycmF5LnByb3RvdHlwZSwgJ3JlZHVjZVJpZ2h0JywgZnVuY3Rpb24gcmVkdWNlUmlnaHQoY2FsbGJhY2tGbikge1xuICAgICAgcmV0dXJuIEVTLkNhbGwob3JpZ2luYWxSZWR1Y2VSaWdodCwgdGhpcy5sZW5ndGggPj0gMCA/IHRoaXMgOiBbXSwgYXJndW1lbnRzKTtcbiAgICB9LCB0cnVlKTtcbiAgfVxuXG4gIHZhciBsYWNrc09jdGFsU3VwcG9ydCA9IE51bWJlcignMG8xMCcpICE9PSA4O1xuICB2YXIgbGFja3NCaW5hcnlTdXBwb3J0ID0gTnVtYmVyKCcwYjEwJykgIT09IDI7XG4gIHZhciB0cmltc05vbldoaXRlc3BhY2UgPSBfc29tZShub25XUywgZnVuY3Rpb24gKGMpIHtcbiAgICByZXR1cm4gTnVtYmVyKGMgKyAwICsgYykgPT09IDA7XG4gIH0pO1xuICBpZiAobGFja3NPY3RhbFN1cHBvcnQgfHwgbGFja3NCaW5hcnlTdXBwb3J0IHx8IHRyaW1zTm9uV2hpdGVzcGFjZSkge1xuICAgIHZhciBPcmlnTnVtYmVyID0gTnVtYmVyO1xuICAgIHZhciBiaW5hcnlSZWdleCA9IC9eMGJbMDFdKyQvaTtcbiAgICB2YXIgb2N0YWxSZWdleCA9IC9eMG9bMC03XSskL2k7XG4gICAgLy8gTm90ZSB0aGF0IGluIElFIDgsIFJlZ0V4cC5wcm90b3R5cGUudGVzdCBkb2Vzbid0IHNlZW0gdG8gZXhpc3Q6IGllLCBcInRlc3RcIiBpcyBhbiBvd24gcHJvcGVydHkgb2YgcmVnZXhlcy4gd3RmLlxuICAgIHZhciBpc0JpbmFyeSA9IGJpbmFyeVJlZ2V4LnRlc3QuYmluZChiaW5hcnlSZWdleCk7XG4gICAgdmFyIGlzT2N0YWwgPSBvY3RhbFJlZ2V4LnRlc3QuYmluZChvY3RhbFJlZ2V4KTtcbiAgICB2YXIgdG9QcmltaXRpdmUgPSBmdW5jdGlvbiAoTykgeyAvLyBuZWVkIHRvIHJlcGxhY2UgdGhpcyB3aXRoIGBlcy10by1wcmltaXRpdmUvZXM2YFxuICAgICAgdmFyIHJlc3VsdDtcbiAgICAgIGlmICh0eXBlb2YgTy52YWx1ZU9mID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIHJlc3VsdCA9IE8udmFsdWVPZigpO1xuICAgICAgICBpZiAoVHlwZS5wcmltaXRpdmUocmVzdWx0KSkge1xuICAgICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGlmICh0eXBlb2YgTy50b1N0cmluZyA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICByZXN1bHQgPSBPLnRvU3RyaW5nKCk7XG4gICAgICAgIGlmIChUeXBlLnByaW1pdGl2ZShyZXN1bHQpKSB7XG4gICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignTm8gZGVmYXVsdCB2YWx1ZScpO1xuICAgIH07XG4gICAgdmFyIGhhc05vbldTID0gbm9uV1NyZWdleC50ZXN0LmJpbmQobm9uV1NyZWdleCk7XG4gICAgdmFyIGlzQmFkSGV4ID0gaXNCYWRIZXhSZWdleC50ZXN0LmJpbmQoaXNCYWRIZXhSZWdleCk7XG4gICAgdmFyIE51bWJlclNoaW0gPSAoZnVuY3Rpb24gKCkge1xuICAgICAgLy8gdGhpcyBpcyB3cmFwcGVkIGluIGFuIElJRkUgYmVjYXVzZSBvZiBJRSA2LTgncyB3YWNreSBzY29waW5nIGlzc3VlcyB3aXRoIG5hbWVkIGZ1bmN0aW9uIGV4cHJlc3Npb25zLlxuICAgICAgdmFyIE51bWJlclNoaW0gPSBmdW5jdGlvbiBOdW1iZXIodmFsdWUpIHtcbiAgICAgICAgdmFyIHByaW1WYWx1ZTtcbiAgICAgICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgcHJpbVZhbHVlID0gVHlwZS5wcmltaXRpdmUodmFsdWUpID8gdmFsdWUgOiB0b1ByaW1pdGl2ZSh2YWx1ZSwgJ251bWJlcicpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHByaW1WYWx1ZSA9IDA7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHR5cGVvZiBwcmltVmFsdWUgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgcHJpbVZhbHVlID0gRVMuQ2FsbCh0cmltU2hpbSwgcHJpbVZhbHVlKTtcbiAgICAgICAgICBpZiAoaXNCaW5hcnkocHJpbVZhbHVlKSkge1xuICAgICAgICAgICAgcHJpbVZhbHVlID0gcGFyc2VJbnQoX3N0clNsaWNlKHByaW1WYWx1ZSwgMiksIDIpO1xuICAgICAgICAgIH0gZWxzZSBpZiAoaXNPY3RhbChwcmltVmFsdWUpKSB7XG4gICAgICAgICAgICBwcmltVmFsdWUgPSBwYXJzZUludChfc3RyU2xpY2UocHJpbVZhbHVlLCAyKSwgOCk7XG4gICAgICAgICAgfSBlbHNlIGlmIChoYXNOb25XUyhwcmltVmFsdWUpIHx8IGlzQmFkSGV4KHByaW1WYWx1ZSkpIHtcbiAgICAgICAgICAgIHByaW1WYWx1ZSA9IE5hTjtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHJlY2VpdmVyID0gdGhpcztcbiAgICAgICAgdmFyIHZhbHVlT2ZTdWNjZWVkcyA9IHZhbHVlT3JGYWxzZUlmVGhyb3dzKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICBPcmlnTnVtYmVyLnByb3RvdHlwZS52YWx1ZU9mLmNhbGwocmVjZWl2ZXIpO1xuICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9KTtcbiAgICAgICAgaWYgKHJlY2VpdmVyIGluc3RhbmNlb2YgTnVtYmVyU2hpbSAmJiAhdmFsdWVPZlN1Y2NlZWRzKSB7XG4gICAgICAgICAgcmV0dXJuIG5ldyBPcmlnTnVtYmVyKHByaW1WYWx1ZSk7XG4gICAgICAgIH1cbiAgICAgICAgLyoganNoaW50IG5ld2NhcDogZmFsc2UgKi9cbiAgICAgICAgcmV0dXJuIE9yaWdOdW1iZXIocHJpbVZhbHVlKTtcbiAgICAgICAgLyoganNoaW50IG5ld2NhcDogdHJ1ZSAqL1xuICAgICAgfTtcbiAgICAgIHJldHVybiBOdW1iZXJTaGltO1xuICAgIH0oKSk7XG4gICAgd3JhcENvbnN0cnVjdG9yKE9yaWdOdW1iZXIsIE51bWJlclNoaW0sIHt9KTtcbiAgICAvLyB0aGlzIGlzIG5lY2Vzc2FyeSBmb3IgRVMzIGJyb3dzZXJzLCB3aGVyZSB0aGVzZSBwcm9wZXJ0aWVzIGFyZSBub24tZW51bWVyYWJsZS5cbiAgICBkZWZpbmVQcm9wZXJ0aWVzKE51bWJlclNoaW0sIHtcbiAgICAgIE5hTjogT3JpZ051bWJlci5OYU4sXG4gICAgICBNQVhfVkFMVUU6IE9yaWdOdW1iZXIuTUFYX1ZBTFVFLFxuICAgICAgTUlOX1ZBTFVFOiBPcmlnTnVtYmVyLk1JTl9WQUxVRSxcbiAgICAgIE5FR0FUSVZFX0lORklOSVRZOiBPcmlnTnVtYmVyLk5FR0FUSVZFX0lORklOSVRZLFxuICAgICAgUE9TSVRJVkVfSU5GSU5JVFk6IE9yaWdOdW1iZXIuUE9TSVRJVkVfSU5GSU5JVFlcbiAgICB9KTtcbiAgICAvKiBnbG9iYWxzIE51bWJlcjogdHJ1ZSAqL1xuICAgIC8qIGVzbGludC1kaXNhYmxlIG5vLXVuZGVmICovXG4gICAgLyoganNoaW50IC1XMDIwICovXG4gICAgTnVtYmVyID0gTnVtYmVyU2hpbTtcbiAgICBWYWx1ZS5yZWRlZmluZShnbG9iYWxzLCAnTnVtYmVyJywgTnVtYmVyU2hpbSk7XG4gICAgLyoganNoaW50ICtXMDIwICovXG4gICAgLyogZXNsaW50LWVuYWJsZSBuby11bmRlZiAqL1xuICAgIC8qIGdsb2JhbHMgTnVtYmVyOiBmYWxzZSAqL1xuICB9XG5cbiAgdmFyIG1heFNhZmVJbnRlZ2VyID0gTWF0aC5wb3coMiwgNTMpIC0gMTtcbiAgZGVmaW5lUHJvcGVydGllcyhOdW1iZXIsIHtcbiAgICBNQVhfU0FGRV9JTlRFR0VSOiBtYXhTYWZlSW50ZWdlcixcbiAgICBNSU5fU0FGRV9JTlRFR0VSOiAtbWF4U2FmZUludGVnZXIsXG4gICAgRVBTSUxPTjogMi4yMjA0NDYwNDkyNTAzMTNlLTE2LFxuXG4gICAgcGFyc2VJbnQ6IGdsb2JhbHMucGFyc2VJbnQsXG4gICAgcGFyc2VGbG9hdDogZ2xvYmFscy5wYXJzZUZsb2F0LFxuXG4gICAgaXNGaW5pdGU6IG51bWJlcklzRmluaXRlLFxuXG4gICAgaXNJbnRlZ2VyOiBmdW5jdGlvbiBpc0ludGVnZXIodmFsdWUpIHtcbiAgICAgIHJldHVybiBudW1iZXJJc0Zpbml0ZSh2YWx1ZSkgJiYgRVMuVG9JbnRlZ2VyKHZhbHVlKSA9PT0gdmFsdWU7XG4gICAgfSxcblxuICAgIGlzU2FmZUludGVnZXI6IGZ1bmN0aW9uIGlzU2FmZUludGVnZXIodmFsdWUpIHtcbiAgICAgIHJldHVybiBOdW1iZXIuaXNJbnRlZ2VyKHZhbHVlKSAmJiBfYWJzKHZhbHVlKSA8PSBOdW1iZXIuTUFYX1NBRkVfSU5URUdFUjtcbiAgICB9LFxuXG4gICAgaXNOYU46IG51bWJlcklzTmFOXG4gIH0pO1xuICAvLyBGaXJlZm94IDM3IGhhcyBhIGNvbmZvcm1pbmcgTnVtYmVyLnBhcnNlSW50LCBidXQgaXQncyBub3QgPT09IHRvIHRoZSBnbG9iYWwgcGFyc2VJbnQgKGZpeGVkIGluIHY0MClcbiAgZGVmaW5lUHJvcGVydHkoTnVtYmVyLCAncGFyc2VJbnQnLCBnbG9iYWxzLnBhcnNlSW50LCBOdW1iZXIucGFyc2VJbnQgIT09IGdsb2JhbHMucGFyc2VJbnQpO1xuXG4gIC8vIFdvcmsgYXJvdW5kIGJ1Z3MgaW4gQXJyYXkjZmluZCBhbmQgQXJyYXkjZmluZEluZGV4IC0tIGVhcmx5XG4gIC8vIGltcGxlbWVudGF0aW9ucyBza2lwcGVkIGhvbGVzIGluIHNwYXJzZSBhcnJheXMuIChOb3RlIHRoYXQgdGhlXG4gIC8vIGltcGxlbWVudGF0aW9ucyBvZiBmaW5kL2ZpbmRJbmRleCBpbmRpcmVjdGx5IHVzZSBzaGltbWVkXG4gIC8vIG1ldGhvZHMgb2YgTnVtYmVyLCBzbyB0aGlzIHRlc3QgaGFzIHRvIGhhcHBlbiBkb3duIGhlcmUuKVxuICAvKmpzaGludCBlbGlzaW9uOiB0cnVlICovXG4gIC8qIGVzbGludC1kaXNhYmxlIG5vLXNwYXJzZS1hcnJheXMgKi9cbiAgaWYgKCFbLCAxXS5maW5kKGZ1bmN0aW9uIChpdGVtLCBpZHgpIHsgcmV0dXJuIGlkeCA9PT0gMDsgfSkpIHtcbiAgICBvdmVycmlkZU5hdGl2ZShBcnJheS5wcm90b3R5cGUsICdmaW5kJywgQXJyYXlQcm90b3R5cGVTaGltcy5maW5kKTtcbiAgfVxuICBpZiAoWywgMV0uZmluZEluZGV4KGZ1bmN0aW9uIChpdGVtLCBpZHgpIHsgcmV0dXJuIGlkeCA9PT0gMDsgfSkgIT09IDApIHtcbiAgICBvdmVycmlkZU5hdGl2ZShBcnJheS5wcm90b3R5cGUsICdmaW5kSW5kZXgnLCBBcnJheVByb3RvdHlwZVNoaW1zLmZpbmRJbmRleCk7XG4gIH1cbiAgLyogZXNsaW50LWVuYWJsZSBuby1zcGFyc2UtYXJyYXlzICovXG4gIC8qanNoaW50IGVsaXNpb246IGZhbHNlICovXG5cbiAgdmFyIGlzRW51bWVyYWJsZU9uID0gRnVuY3Rpb24uYmluZC5jYWxsKEZ1bmN0aW9uLmJpbmQsIE9iamVjdC5wcm90b3R5cGUucHJvcGVydHlJc0VudW1lcmFibGUpO1xuICB2YXIgZW5zdXJlRW51bWVyYWJsZSA9IGZ1bmN0aW9uIGVuc3VyZUVudW1lcmFibGUob2JqLCBwcm9wKSB7XG4gICAgaWYgKHN1cHBvcnRzRGVzY3JpcHRvcnMgJiYgaXNFbnVtZXJhYmxlT24ob2JqLCBwcm9wKSkge1xuICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KG9iaiwgcHJvcCwgeyBlbnVtZXJhYmxlOiBmYWxzZSB9KTtcbiAgICB9XG4gIH07XG4gIHZhciBzbGljZUFyZ3MgPSBmdW5jdGlvbiBzbGljZUFyZ3MoKSB7XG4gICAgLy8gcGVyIGh0dHBzOi8vZ2l0aHViLmNvbS9wZXRrYWFudG9ub3YvYmx1ZWJpcmQvd2lraS9PcHRpbWl6YXRpb24ta2lsbGVycyMzMi1sZWFraW5nLWFyZ3VtZW50c1xuICAgIC8vIGFuZCBodHRwczovL2dpc3QuZ2l0aHViLmNvbS9XZWJSZWZsZWN0aW9uLzQzMjc3NjJjYjg3YThjNjM0YTI5XG4gICAgdmFyIGluaXRpYWwgPSBOdW1iZXIodGhpcyk7XG4gICAgdmFyIGxlbiA9IGFyZ3VtZW50cy5sZW5ndGg7XG4gICAgdmFyIGRlc2lyZWRBcmdDb3VudCA9IGxlbiAtIGluaXRpYWw7XG4gICAgdmFyIGFyZ3MgPSBuZXcgQXJyYXkoZGVzaXJlZEFyZ0NvdW50IDwgMCA/IDAgOiBkZXNpcmVkQXJnQ291bnQpO1xuICAgIGZvciAodmFyIGkgPSBpbml0aWFsOyBpIDwgbGVuOyArK2kpIHtcbiAgICAgIGFyZ3NbaSAtIGluaXRpYWxdID0gYXJndW1lbnRzW2ldO1xuICAgIH1cbiAgICByZXR1cm4gYXJncztcbiAgfTtcbiAgdmFyIGFzc2lnblRvID0gZnVuY3Rpb24gYXNzaWduVG8oc291cmNlKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uIGFzc2lnblRvU291cmNlKHRhcmdldCwga2V5KSB7XG4gICAgICB0YXJnZXRba2V5XSA9IHNvdXJjZVtrZXldO1xuICAgICAgcmV0dXJuIHRhcmdldDtcbiAgICB9O1xuICB9O1xuICB2YXIgYXNzaWduUmVkdWNlciA9IGZ1bmN0aW9uICh0YXJnZXQsIHNvdXJjZSkge1xuICAgIHZhciBzb3VyY2VLZXlzID0ga2V5cyhPYmplY3Qoc291cmNlKSk7XG4gICAgdmFyIHN5bWJvbHM7XG4gICAgaWYgKEVTLklzQ2FsbGFibGUoT2JqZWN0LmdldE93blByb3BlcnR5U3ltYm9scykpIHtcbiAgICAgIHN5bWJvbHMgPSBfZmlsdGVyKE9iamVjdC5nZXRPd25Qcm9wZXJ0eVN5bWJvbHMoT2JqZWN0KHNvdXJjZSkpLCBpc0VudW1lcmFibGVPbihzb3VyY2UpKTtcbiAgICB9XG4gICAgcmV0dXJuIF9yZWR1Y2UoX2NvbmNhdChzb3VyY2VLZXlzLCBzeW1ib2xzIHx8IFtdKSwgYXNzaWduVG8oc291cmNlKSwgdGFyZ2V0KTtcbiAgfTtcblxuICB2YXIgT2JqZWN0U2hpbXMgPSB7XG4gICAgLy8gMTkuMS4zLjFcbiAgICBhc3NpZ246IGZ1bmN0aW9uICh0YXJnZXQsIHNvdXJjZSkge1xuICAgICAgdmFyIHRvID0gRVMuVG9PYmplY3QodGFyZ2V0LCAnQ2Fubm90IGNvbnZlcnQgdW5kZWZpbmVkIG9yIG51bGwgdG8gb2JqZWN0Jyk7XG4gICAgICByZXR1cm4gX3JlZHVjZShFUy5DYWxsKHNsaWNlQXJncywgMSwgYXJndW1lbnRzKSwgYXNzaWduUmVkdWNlciwgdG8pO1xuICAgIH0sXG5cbiAgICAvLyBBZGRlZCBpbiBXZWJLaXQgaW4gaHR0cHM6Ly9idWdzLndlYmtpdC5vcmcvc2hvd19idWcuY2dpP2lkPTE0Mzg2NVxuICAgIGlzOiBmdW5jdGlvbiBpcyhhLCBiKSB7XG4gICAgICByZXR1cm4gRVMuU2FtZVZhbHVlKGEsIGIpO1xuICAgIH1cbiAgfTtcbiAgdmFyIGFzc2lnbkhhc1BlbmRpbmdFeGNlcHRpb25zID0gT2JqZWN0LmFzc2lnbiAmJiBPYmplY3QucHJldmVudEV4dGVuc2lvbnMgJiYgKGZ1bmN0aW9uICgpIHtcbiAgICAvLyBGaXJlZm94IDM3IHN0aWxsIGhhcyBcInBlbmRpbmcgZXhjZXB0aW9uXCIgbG9naWMgaW4gaXRzIE9iamVjdC5hc3NpZ24gaW1wbGVtZW50YXRpb24sXG4gICAgLy8gd2hpY2ggaXMgNzIlIHNsb3dlciB0aGFuIG91ciBzaGltLCBhbmQgRmlyZWZveCA0MCdzIG5hdGl2ZSBpbXBsZW1lbnRhdGlvbi5cbiAgICB2YXIgdGhyb3dlciA9IE9iamVjdC5wcmV2ZW50RXh0ZW5zaW9ucyh7IDE6IDIgfSk7XG4gICAgdHJ5IHtcbiAgICAgIE9iamVjdC5hc3NpZ24odGhyb3dlciwgJ3h5Jyk7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgcmV0dXJuIHRocm93ZXJbMV0gPT09ICd5JztcbiAgICB9XG4gIH0oKSk7XG4gIGlmIChhc3NpZ25IYXNQZW5kaW5nRXhjZXB0aW9ucykge1xuICAgIG92ZXJyaWRlTmF0aXZlKE9iamVjdCwgJ2Fzc2lnbicsIE9iamVjdFNoaW1zLmFzc2lnbik7XG4gIH1cbiAgZGVmaW5lUHJvcGVydGllcyhPYmplY3QsIE9iamVjdFNoaW1zKTtcblxuICBpZiAoc3VwcG9ydHNEZXNjcmlwdG9ycykge1xuICAgIHZhciBFUzVPYmplY3RTaGltcyA9IHtcbiAgICAgIC8vIDE5LjEuMy45XG4gICAgICAvLyBzaGltIGZyb20gaHR0cHM6Ly9naXN0LmdpdGh1Yi5jb20vV2ViUmVmbGVjdGlvbi81NTkzNTU0XG4gICAgICBzZXRQcm90b3R5cGVPZjogKGZ1bmN0aW9uIChPYmplY3QsIG1hZ2ljKSB7XG4gICAgICAgIHZhciBzZXQ7XG5cbiAgICAgICAgdmFyIGNoZWNrQXJncyA9IGZ1bmN0aW9uIChPLCBwcm90bykge1xuICAgICAgICAgIGlmICghRVMuVHlwZUlzT2JqZWN0KE8pKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdjYW5ub3Qgc2V0IHByb3RvdHlwZSBvbiBhIG5vbi1vYmplY3QnKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKCEocHJvdG8gPT09IG51bGwgfHwgRVMuVHlwZUlzT2JqZWN0KHByb3RvKSkpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ2NhbiBvbmx5IHNldCBwcm90b3R5cGUgdG8gYW4gb2JqZWN0IG9yIG51bGwnICsgcHJvdG8pO1xuICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICB2YXIgc2V0UHJvdG90eXBlT2YgPSBmdW5jdGlvbiAoTywgcHJvdG8pIHtcbiAgICAgICAgICBjaGVja0FyZ3MoTywgcHJvdG8pO1xuICAgICAgICAgIF9jYWxsKHNldCwgTywgcHJvdG8pO1xuICAgICAgICAgIHJldHVybiBPO1xuICAgICAgICB9O1xuXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgLy8gdGhpcyB3b3JrcyBhbHJlYWR5IGluIEZpcmVmb3ggYW5kIFNhZmFyaVxuICAgICAgICAgIHNldCA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IoT2JqZWN0LnByb3RvdHlwZSwgbWFnaWMpLnNldDtcbiAgICAgICAgICBfY2FsbChzZXQsIHt9LCBudWxsKTtcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgIGlmIChPYmplY3QucHJvdG90eXBlICE9PSB7fVttYWdpY10pIHtcbiAgICAgICAgICAgIC8vIElFIDwgMTEgY2Fubm90IGJlIHNoaW1tZWRcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG4gICAgICAgICAgLy8gcHJvYmFibHkgQ2hyb21lIG9yIHNvbWUgb2xkIE1vYmlsZSBzdG9jayBicm93c2VyXG4gICAgICAgICAgc2V0ID0gZnVuY3Rpb24gKHByb3RvKSB7XG4gICAgICAgICAgICB0aGlzW21hZ2ljXSA9IHByb3RvO1xuICAgICAgICAgIH07XG4gICAgICAgICAgLy8gcGxlYXNlIG5vdGUgdGhhdCB0aGlzIHdpbGwgKipub3QqKiB3b3JrXG4gICAgICAgICAgLy8gaW4gdGhvc2UgYnJvd3NlcnMgdGhhdCBkbyBub3QgaW5oZXJpdFxuICAgICAgICAgIC8vIF9fcHJvdG9fXyBieSBtaXN0YWtlIGZyb20gT2JqZWN0LnByb3RvdHlwZVxuICAgICAgICAgIC8vIGluIHRoZXNlIGNhc2VzIHdlIHNob3VsZCBwcm9iYWJseSB0aHJvdyBhbiBlcnJvclxuICAgICAgICAgIC8vIG9yIGF0IGxlYXN0IGJlIGluZm9ybWVkIGFib3V0IHRoZSBpc3N1ZVxuICAgICAgICAgIHNldFByb3RvdHlwZU9mLnBvbHlmaWxsID0gc2V0UHJvdG90eXBlT2YoXG4gICAgICAgICAgICBzZXRQcm90b3R5cGVPZih7fSwgbnVsbCksXG4gICAgICAgICAgICBPYmplY3QucHJvdG90eXBlXG4gICAgICAgICAgKSBpbnN0YW5jZW9mIE9iamVjdDtcbiAgICAgICAgICAvLyBzZXRQcm90b3R5cGVPZi5wb2x5ZmlsbCA9PT0gdHJ1ZSBtZWFucyBpdCB3b3JrcyBhcyBtZWFudFxuICAgICAgICAgIC8vIHNldFByb3RvdHlwZU9mLnBvbHlmaWxsID09PSBmYWxzZSBtZWFucyBpdCdzIG5vdCAxMDAlIHJlbGlhYmxlXG4gICAgICAgICAgLy8gc2V0UHJvdG90eXBlT2YucG9seWZpbGwgPT09IHVuZGVmaW5lZFxuICAgICAgICAgIC8vIG9yXG4gICAgICAgICAgLy8gc2V0UHJvdG90eXBlT2YucG9seWZpbGwgPT0gIG51bGwgbWVhbnMgaXQncyBub3QgYSBwb2x5ZmlsbFxuICAgICAgICAgIC8vIHdoaWNoIG1lYW5zIGl0IHdvcmtzIGFzIGV4cGVjdGVkXG4gICAgICAgICAgLy8gd2UgY2FuIGV2ZW4gZGVsZXRlIE9iamVjdC5wcm90b3R5cGUuX19wcm90b19fO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBzZXRQcm90b3R5cGVPZjtcbiAgICAgIH0oT2JqZWN0LCAnX19wcm90b19fJykpXG4gICAgfTtcblxuICAgIGRlZmluZVByb3BlcnRpZXMoT2JqZWN0LCBFUzVPYmplY3RTaGltcyk7XG4gIH1cblxuICAvLyBXb3JrYXJvdW5kIGJ1ZyBpbiBPcGVyYSAxMiB3aGVyZSBzZXRQcm90b3R5cGVPZih4LCBudWxsKSBkb2Vzbid0IHdvcmssXG4gIC8vIGJ1dCBPYmplY3QuY3JlYXRlKG51bGwpIGRvZXMuXG4gIGlmIChPYmplY3Quc2V0UHJvdG90eXBlT2YgJiYgT2JqZWN0LmdldFByb3RvdHlwZU9mICYmXG4gICAgICBPYmplY3QuZ2V0UHJvdG90eXBlT2YoT2JqZWN0LnNldFByb3RvdHlwZU9mKHt9LCBudWxsKSkgIT09IG51bGwgJiZcbiAgICAgIE9iamVjdC5nZXRQcm90b3R5cGVPZihPYmplY3QuY3JlYXRlKG51bGwpKSA9PT0gbnVsbCkge1xuICAgIChmdW5jdGlvbiAoKSB7XG4gICAgICB2YXIgRkFLRU5VTEwgPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuICAgICAgdmFyIGdwbyA9IE9iamVjdC5nZXRQcm90b3R5cGVPZiwgc3BvID0gT2JqZWN0LnNldFByb3RvdHlwZU9mO1xuICAgICAgT2JqZWN0LmdldFByb3RvdHlwZU9mID0gZnVuY3Rpb24gKG8pIHtcbiAgICAgICAgdmFyIHJlc3VsdCA9IGdwbyhvKTtcbiAgICAgICAgcmV0dXJuIHJlc3VsdCA9PT0gRkFLRU5VTEwgPyBudWxsIDogcmVzdWx0O1xuICAgICAgfTtcbiAgICAgIE9iamVjdC5zZXRQcm90b3R5cGVPZiA9IGZ1bmN0aW9uIChvLCBwKSB7XG4gICAgICAgIHZhciBwcm90byA9IHAgPT09IG51bGwgPyBGQUtFTlVMTCA6IHA7XG4gICAgICAgIHJldHVybiBzcG8obywgcHJvdG8pO1xuICAgICAgfTtcbiAgICAgIE9iamVjdC5zZXRQcm90b3R5cGVPZi5wb2x5ZmlsbCA9IGZhbHNlO1xuICAgIH0oKSk7XG4gIH1cblxuICB2YXIgb2JqZWN0S2V5c0FjY2VwdHNQcmltaXRpdmVzID0gIXRocm93c0Vycm9yKGZ1bmN0aW9uICgpIHsgT2JqZWN0LmtleXMoJ2ZvbycpOyB9KTtcbiAgaWYgKCFvYmplY3RLZXlzQWNjZXB0c1ByaW1pdGl2ZXMpIHtcbiAgICB2YXIgb3JpZ2luYWxPYmplY3RLZXlzID0gT2JqZWN0LmtleXM7XG4gICAgb3ZlcnJpZGVOYXRpdmUoT2JqZWN0LCAna2V5cycsIGZ1bmN0aW9uIGtleXModmFsdWUpIHtcbiAgICAgIHJldHVybiBvcmlnaW5hbE9iamVjdEtleXMoRVMuVG9PYmplY3QodmFsdWUpKTtcbiAgICB9KTtcbiAgICBrZXlzID0gT2JqZWN0LmtleXM7XG4gIH1cbiAgdmFyIG9iamVjdEtleXNSZWplY3RzUmVnZXggPSB0aHJvd3NFcnJvcihmdW5jdGlvbiAoKSB7IE9iamVjdC5rZXlzKC9hL2cpOyB9KTtcbiAgaWYgKG9iamVjdEtleXNSZWplY3RzUmVnZXgpIHtcbiAgICB2YXIgcmVnZXhSZWplY3RpbmdPYmplY3RLZXlzID0gT2JqZWN0LmtleXM7XG4gICAgb3ZlcnJpZGVOYXRpdmUoT2JqZWN0LCAna2V5cycsIGZ1bmN0aW9uIGtleXModmFsdWUpIHtcbiAgICAgIGlmIChUeXBlLnJlZ2V4KHZhbHVlKSkge1xuICAgICAgICB2YXIgcmVnZXhLZXlzID0gW107XG4gICAgICAgIGZvciAodmFyIGsgaW4gdmFsdWUpIHtcbiAgICAgICAgICBpZiAoX2hhc093blByb3BlcnR5KHZhbHVlLCBrKSkge1xuICAgICAgICAgICAgX3B1c2gocmVnZXhLZXlzLCBrKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICByZXR1cm4gcmVnZXhLZXlzO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHJlZ2V4UmVqZWN0aW5nT2JqZWN0S2V5cyh2YWx1ZSk7XG4gICAgfSk7XG4gICAga2V5cyA9IE9iamVjdC5rZXlzO1xuICB9XG5cbiAgaWYgKE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKSB7XG4gICAgdmFyIG9iamVjdEdPUE5BY2NlcHRzUHJpbWl0aXZlcyA9ICF0aHJvd3NFcnJvcihmdW5jdGlvbiAoKSB7IE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKCdmb28nKTsgfSk7XG4gICAgaWYgKCFvYmplY3RHT1BOQWNjZXB0c1ByaW1pdGl2ZXMpIHtcbiAgICAgIHZhciBjYWNoZWRXaW5kb3dOYW1lcyA9IHR5cGVvZiB3aW5kb3cgPT09ICdvYmplY3QnID8gT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXMod2luZG93KSA6IFtdO1xuICAgICAgdmFyIG9yaWdpbmFsT2JqZWN0R2V0T3duUHJvcGVydHlOYW1lcyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzO1xuICAgICAgb3ZlcnJpZGVOYXRpdmUoT2JqZWN0LCAnZ2V0T3duUHJvcGVydHlOYW1lcycsIGZ1bmN0aW9uIGdldE93blByb3BlcnR5TmFtZXModmFsdWUpIHtcbiAgICAgICAgdmFyIHZhbCA9IEVTLlRvT2JqZWN0KHZhbHVlKTtcbiAgICAgICAgaWYgKF90b1N0cmluZyh2YWwpID09PSAnW29iamVjdCBXaW5kb3ddJykge1xuICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICByZXR1cm4gb3JpZ2luYWxPYmplY3RHZXRPd25Qcm9wZXJ0eU5hbWVzKHZhbCk7XG4gICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgLy8gSUUgYnVnIHdoZXJlIGxheW91dCBlbmdpbmUgY2FsbHMgdXNlcmxhbmQgZ09QTiBmb3IgY3Jvc3MtZG9tYWluIGB3aW5kb3dgIG9iamVjdHNcbiAgICAgICAgICAgIHJldHVybiBfY29uY2F0KFtdLCBjYWNoZWRXaW5kb3dOYW1lcyk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBvcmlnaW5hbE9iamVjdEdldE93blByb3BlcnR5TmFtZXModmFsKTtcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxuICBpZiAoT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcikge1xuICAgIHZhciBvYmplY3RHT1BEQWNjZXB0c1ByaW1pdGl2ZXMgPSAhdGhyb3dzRXJyb3IoZnVuY3Rpb24gKCkgeyBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKCdmb28nLCAnYmFyJyk7IH0pO1xuICAgIGlmICghb2JqZWN0R09QREFjY2VwdHNQcmltaXRpdmVzKSB7XG4gICAgICB2YXIgb3JpZ2luYWxPYmplY3RHZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yO1xuICAgICAgb3ZlcnJpZGVOYXRpdmUoT2JqZWN0LCAnZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yJywgZnVuY3Rpb24gZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKHZhbHVlLCBwcm9wZXJ0eSkge1xuICAgICAgICByZXR1cm4gb3JpZ2luYWxPYmplY3RHZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IoRVMuVG9PYmplY3QodmFsdWUpLCBwcm9wZXJ0eSk7XG4gICAgICB9KTtcbiAgICB9XG4gIH1cbiAgaWYgKE9iamVjdC5zZWFsKSB7XG4gICAgdmFyIG9iamVjdFNlYWxBY2NlcHRzUHJpbWl0aXZlcyA9ICF0aHJvd3NFcnJvcihmdW5jdGlvbiAoKSB7IE9iamVjdC5zZWFsKCdmb28nKTsgfSk7XG4gICAgaWYgKCFvYmplY3RTZWFsQWNjZXB0c1ByaW1pdGl2ZXMpIHtcbiAgICAgIHZhciBvcmlnaW5hbE9iamVjdFNlYWwgPSBPYmplY3Quc2VhbDtcbiAgICAgIG92ZXJyaWRlTmF0aXZlKE9iamVjdCwgJ3NlYWwnLCBmdW5jdGlvbiBzZWFsKHZhbHVlKSB7XG4gICAgICAgIGlmICghVHlwZS5vYmplY3QodmFsdWUpKSB7IHJldHVybiB2YWx1ZTsgfVxuICAgICAgICByZXR1cm4gb3JpZ2luYWxPYmplY3RTZWFsKHZhbHVlKTtcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxuICBpZiAoT2JqZWN0LmlzU2VhbGVkKSB7XG4gICAgdmFyIG9iamVjdElzU2VhbGVkQWNjZXB0c1ByaW1pdGl2ZXMgPSAhdGhyb3dzRXJyb3IoZnVuY3Rpb24gKCkgeyBPYmplY3QuaXNTZWFsZWQoJ2ZvbycpOyB9KTtcbiAgICBpZiAoIW9iamVjdElzU2VhbGVkQWNjZXB0c1ByaW1pdGl2ZXMpIHtcbiAgICAgIHZhciBvcmlnaW5hbE9iamVjdElzU2VhbGVkID0gT2JqZWN0LmlzU2VhbGVkO1xuICAgICAgb3ZlcnJpZGVOYXRpdmUoT2JqZWN0LCAnaXNTZWFsZWQnLCBmdW5jdGlvbiBpc1NlYWxlZCh2YWx1ZSkge1xuICAgICAgICBpZiAoIVR5cGUub2JqZWN0KHZhbHVlKSkgeyByZXR1cm4gdHJ1ZTsgfVxuICAgICAgICByZXR1cm4gb3JpZ2luYWxPYmplY3RJc1NlYWxlZCh2YWx1ZSk7XG4gICAgICB9KTtcbiAgICB9XG4gIH1cbiAgaWYgKE9iamVjdC5mcmVlemUpIHtcbiAgICB2YXIgb2JqZWN0RnJlZXplQWNjZXB0c1ByaW1pdGl2ZXMgPSAhdGhyb3dzRXJyb3IoZnVuY3Rpb24gKCkgeyBPYmplY3QuZnJlZXplKCdmb28nKTsgfSk7XG4gICAgaWYgKCFvYmplY3RGcmVlemVBY2NlcHRzUHJpbWl0aXZlcykge1xuICAgICAgdmFyIG9yaWdpbmFsT2JqZWN0RnJlZXplID0gT2JqZWN0LmZyZWV6ZTtcbiAgICAgIG92ZXJyaWRlTmF0aXZlKE9iamVjdCwgJ2ZyZWV6ZScsIGZ1bmN0aW9uIGZyZWV6ZSh2YWx1ZSkge1xuICAgICAgICBpZiAoIVR5cGUub2JqZWN0KHZhbHVlKSkgeyByZXR1cm4gdmFsdWU7IH1cbiAgICAgICAgcmV0dXJuIG9yaWdpbmFsT2JqZWN0RnJlZXplKHZhbHVlKTtcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxuICBpZiAoT2JqZWN0LmlzRnJvemVuKSB7XG4gICAgdmFyIG9iamVjdElzRnJvemVuQWNjZXB0c1ByaW1pdGl2ZXMgPSAhdGhyb3dzRXJyb3IoZnVuY3Rpb24gKCkgeyBPYmplY3QuaXNGcm96ZW4oJ2ZvbycpOyB9KTtcbiAgICBpZiAoIW9iamVjdElzRnJvemVuQWNjZXB0c1ByaW1pdGl2ZXMpIHtcbiAgICAgIHZhciBvcmlnaW5hbE9iamVjdElzRnJvemVuID0gT2JqZWN0LmlzRnJvemVuO1xuICAgICAgb3ZlcnJpZGVOYXRpdmUoT2JqZWN0LCAnaXNGcm96ZW4nLCBmdW5jdGlvbiBpc0Zyb3plbih2YWx1ZSkge1xuICAgICAgICBpZiAoIVR5cGUub2JqZWN0KHZhbHVlKSkgeyByZXR1cm4gdHJ1ZTsgfVxuICAgICAgICByZXR1cm4gb3JpZ2luYWxPYmplY3RJc0Zyb3plbih2YWx1ZSk7XG4gICAgICB9KTtcbiAgICB9XG4gIH1cbiAgaWYgKE9iamVjdC5wcmV2ZW50RXh0ZW5zaW9ucykge1xuICAgIHZhciBvYmplY3RQcmV2ZW50RXh0ZW5zaW9uc0FjY2VwdHNQcmltaXRpdmVzID0gIXRocm93c0Vycm9yKGZ1bmN0aW9uICgpIHsgT2JqZWN0LnByZXZlbnRFeHRlbnNpb25zKCdmb28nKTsgfSk7XG4gICAgaWYgKCFvYmplY3RQcmV2ZW50RXh0ZW5zaW9uc0FjY2VwdHNQcmltaXRpdmVzKSB7XG4gICAgICB2YXIgb3JpZ2luYWxPYmplY3RQcmV2ZW50RXh0ZW5zaW9ucyA9IE9iamVjdC5wcmV2ZW50RXh0ZW5zaW9ucztcbiAgICAgIG92ZXJyaWRlTmF0aXZlKE9iamVjdCwgJ3ByZXZlbnRFeHRlbnNpb25zJywgZnVuY3Rpb24gcHJldmVudEV4dGVuc2lvbnModmFsdWUpIHtcbiAgICAgICAgaWYgKCFUeXBlLm9iamVjdCh2YWx1ZSkpIHsgcmV0dXJuIHZhbHVlOyB9XG4gICAgICAgIHJldHVybiBvcmlnaW5hbE9iamVjdFByZXZlbnRFeHRlbnNpb25zKHZhbHVlKTtcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxuICBpZiAoT2JqZWN0LmlzRXh0ZW5zaWJsZSkge1xuICAgIHZhciBvYmplY3RJc0V4dGVuc2libGVBY2NlcHRzUHJpbWl0aXZlcyA9ICF0aHJvd3NFcnJvcihmdW5jdGlvbiAoKSB7IE9iamVjdC5pc0V4dGVuc2libGUoJ2ZvbycpOyB9KTtcbiAgICBpZiAoIW9iamVjdElzRXh0ZW5zaWJsZUFjY2VwdHNQcmltaXRpdmVzKSB7XG4gICAgICB2YXIgb3JpZ2luYWxPYmplY3RJc0V4dGVuc2libGUgPSBPYmplY3QuaXNFeHRlbnNpYmxlO1xuICAgICAgb3ZlcnJpZGVOYXRpdmUoT2JqZWN0LCAnaXNFeHRlbnNpYmxlJywgZnVuY3Rpb24gaXNFeHRlbnNpYmxlKHZhbHVlKSB7XG4gICAgICAgIGlmICghVHlwZS5vYmplY3QodmFsdWUpKSB7IHJldHVybiBmYWxzZTsgfVxuICAgICAgICByZXR1cm4gb3JpZ2luYWxPYmplY3RJc0V4dGVuc2libGUodmFsdWUpO1xuICAgICAgfSk7XG4gICAgfVxuICB9XG4gIGlmIChPYmplY3QuZ2V0UHJvdG90eXBlT2YpIHtcbiAgICB2YXIgb2JqZWN0R2V0UHJvdG9BY2NlcHRzUHJpbWl0aXZlcyA9ICF0aHJvd3NFcnJvcihmdW5jdGlvbiAoKSB7IE9iamVjdC5nZXRQcm90b3R5cGVPZignZm9vJyk7IH0pO1xuICAgIGlmICghb2JqZWN0R2V0UHJvdG9BY2NlcHRzUHJpbWl0aXZlcykge1xuICAgICAgdmFyIG9yaWdpbmFsR2V0UHJvdG8gPSBPYmplY3QuZ2V0UHJvdG90eXBlT2Y7XG4gICAgICBvdmVycmlkZU5hdGl2ZShPYmplY3QsICdnZXRQcm90b3R5cGVPZicsIGZ1bmN0aW9uIGdldFByb3RvdHlwZU9mKHZhbHVlKSB7XG4gICAgICAgIHJldHVybiBvcmlnaW5hbEdldFByb3RvKEVTLlRvT2JqZWN0KHZhbHVlKSk7XG4gICAgICB9KTtcbiAgICB9XG4gIH1cblxuICB2YXIgaGFzRmxhZ3MgPSBzdXBwb3J0c0Rlc2NyaXB0b3JzICYmIChmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGRlc2MgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKFJlZ0V4cC5wcm90b3R5cGUsICdmbGFncycpO1xuICAgIHJldHVybiBkZXNjICYmIEVTLklzQ2FsbGFibGUoZGVzYy5nZXQpO1xuICB9KCkpO1xuICBpZiAoc3VwcG9ydHNEZXNjcmlwdG9ycyAmJiAhaGFzRmxhZ3MpIHtcbiAgICB2YXIgcmVnRXhwRmxhZ3NHZXR0ZXIgPSBmdW5jdGlvbiBmbGFncygpIHtcbiAgICAgIGlmICghRVMuVHlwZUlzT2JqZWN0KHRoaXMpKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ01ldGhvZCBjYWxsZWQgb24gaW5jb21wYXRpYmxlIHR5cGU6IG11c3QgYmUgYW4gb2JqZWN0LicpO1xuICAgICAgfVxuICAgICAgdmFyIHJlc3VsdCA9ICcnO1xuICAgICAgaWYgKHRoaXMuZ2xvYmFsKSB7XG4gICAgICAgIHJlc3VsdCArPSAnZyc7XG4gICAgICB9XG4gICAgICBpZiAodGhpcy5pZ25vcmVDYXNlKSB7XG4gICAgICAgIHJlc3VsdCArPSAnaSc7XG4gICAgICB9XG4gICAgICBpZiAodGhpcy5tdWx0aWxpbmUpIHtcbiAgICAgICAgcmVzdWx0ICs9ICdtJztcbiAgICAgIH1cbiAgICAgIGlmICh0aGlzLnVuaWNvZGUpIHtcbiAgICAgICAgcmVzdWx0ICs9ICd1JztcbiAgICAgIH1cbiAgICAgIGlmICh0aGlzLnN0aWNreSkge1xuICAgICAgICByZXN1bHQgKz0gJ3knO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9O1xuXG4gICAgVmFsdWUuZ2V0dGVyKFJlZ0V4cC5wcm90b3R5cGUsICdmbGFncycsIHJlZ0V4cEZsYWdzR2V0dGVyKTtcbiAgfVxuXG4gIHZhciByZWdFeHBTdXBwb3J0c0ZsYWdzV2l0aFJlZ2V4ID0gc3VwcG9ydHNEZXNjcmlwdG9ycyAmJiB2YWx1ZU9yRmFsc2VJZlRocm93cyhmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIFN0cmluZyhuZXcgUmVnRXhwKC9hL2csICdpJykpID09PSAnL2EvaSc7XG4gIH0pO1xuICB2YXIgcmVnRXhwTmVlZHNUb1N1cHBvcnRTeW1ib2xNYXRjaCA9IGhhc1N5bWJvbHMgJiYgc3VwcG9ydHNEZXNjcmlwdG9ycyAmJiAoZnVuY3Rpb24gKCkge1xuICAgIC8vIEVkZ2UgMC4xMiBzdXBwb3J0cyBmbGFncyBmdWxseSwgYnV0IGRvZXMgbm90IHN1cHBvcnQgU3ltYm9sLm1hdGNoXG4gICAgdmFyIHJlZ2V4ID0gLy4vO1xuICAgIHJlZ2V4W1N5bWJvbC5tYXRjaF0gPSBmYWxzZTtcbiAgICByZXR1cm4gUmVnRXhwKHJlZ2V4KSA9PT0gcmVnZXg7XG4gIH0oKSk7XG5cbiAgdmFyIHJlZ2V4VG9TdHJpbmdJc0dlbmVyaWMgPSB2YWx1ZU9yRmFsc2VJZlRocm93cyhmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIFJlZ0V4cC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh7IHNvdXJjZTogJ2FiYycgfSkgPT09ICcvYWJjLyc7XG4gIH0pO1xuICB2YXIgcmVnZXhUb1N0cmluZ1N1cHBvcnRzR2VuZXJpY0ZsYWdzID0gcmVnZXhUb1N0cmluZ0lzR2VuZXJpYyAmJiB2YWx1ZU9yRmFsc2VJZlRocm93cyhmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIFJlZ0V4cC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh7IHNvdXJjZTogJ2EnLCBmbGFnczogJ2InIH0pID09PSAnL2EvYic7XG4gIH0pO1xuICBpZiAoIXJlZ2V4VG9TdHJpbmdJc0dlbmVyaWMgfHwgIXJlZ2V4VG9TdHJpbmdTdXBwb3J0c0dlbmVyaWNGbGFncykge1xuICAgIHZhciBvcmlnUmVnRXhwVG9TdHJpbmcgPSBSZWdFeHAucHJvdG90eXBlLnRvU3RyaW5nO1xuICAgIGRlZmluZVByb3BlcnR5KFJlZ0V4cC5wcm90b3R5cGUsICd0b1N0cmluZycsIGZ1bmN0aW9uIHRvU3RyaW5nKCkge1xuICAgICAgdmFyIFIgPSBFUy5SZXF1aXJlT2JqZWN0Q29lcmNpYmxlKHRoaXMpO1xuICAgICAgaWYgKFR5cGUucmVnZXgoUikpIHtcbiAgICAgICAgcmV0dXJuIF9jYWxsKG9yaWdSZWdFeHBUb1N0cmluZywgUik7XG4gICAgICB9XG4gICAgICB2YXIgcGF0dGVybiA9ICRTdHJpbmcoUi5zb3VyY2UpO1xuICAgICAgdmFyIGZsYWdzID0gJFN0cmluZyhSLmZsYWdzKTtcbiAgICAgIHJldHVybiAnLycgKyBwYXR0ZXJuICsgJy8nICsgZmxhZ3M7XG4gICAgfSwgdHJ1ZSk7XG4gICAgVmFsdWUucHJlc2VydmVUb1N0cmluZyhSZWdFeHAucHJvdG90eXBlLnRvU3RyaW5nLCBvcmlnUmVnRXhwVG9TdHJpbmcpO1xuICB9XG5cbiAgaWYgKHN1cHBvcnRzRGVzY3JpcHRvcnMgJiYgKCFyZWdFeHBTdXBwb3J0c0ZsYWdzV2l0aFJlZ2V4IHx8IHJlZ0V4cE5lZWRzVG9TdXBwb3J0U3ltYm9sTWF0Y2gpKSB7XG4gICAgdmFyIGZsYWdzR2V0dGVyID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcihSZWdFeHAucHJvdG90eXBlLCAnZmxhZ3MnKS5nZXQ7XG4gICAgdmFyIHNvdXJjZURlc2MgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKFJlZ0V4cC5wcm90b3R5cGUsICdzb3VyY2UnKSB8fCB7fTtcbiAgICB2YXIgbGVnYWN5U291cmNlR2V0dGVyID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gdGhpcy5zb3VyY2U7IH07IC8vIHByaW9yIHRvIGl0IGJlaW5nIGEgZ2V0dGVyLCBpdCdzIG93biArIG5vbmNvbmZpZ3VyYWJsZVxuICAgIHZhciBzb3VyY2VHZXR0ZXIgPSBFUy5Jc0NhbGxhYmxlKHNvdXJjZURlc2MuZ2V0KSA/IHNvdXJjZURlc2MuZ2V0IDogbGVnYWN5U291cmNlR2V0dGVyO1xuXG4gICAgdmFyIE9yaWdSZWdFeHAgPSBSZWdFeHA7XG4gICAgdmFyIFJlZ0V4cFNoaW0gPSAoZnVuY3Rpb24gKCkge1xuICAgICAgcmV0dXJuIGZ1bmN0aW9uIFJlZ0V4cChwYXR0ZXJuLCBmbGFncykge1xuICAgICAgICB2YXIgcGF0dGVybklzUmVnRXhwID0gRVMuSXNSZWdFeHAocGF0dGVybik7XG4gICAgICAgIHZhciBjYWxsZWRXaXRoTmV3ID0gdGhpcyBpbnN0YW5jZW9mIFJlZ0V4cDtcbiAgICAgICAgaWYgKCFjYWxsZWRXaXRoTmV3ICYmIHBhdHRlcm5Jc1JlZ0V4cCAmJiB0eXBlb2YgZmxhZ3MgPT09ICd1bmRlZmluZWQnICYmIHBhdHRlcm4uY29uc3RydWN0b3IgPT09IFJlZ0V4cCkge1xuICAgICAgICAgIHJldHVybiBwYXR0ZXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIFAgPSBwYXR0ZXJuO1xuICAgICAgICB2YXIgRiA9IGZsYWdzO1xuICAgICAgICBpZiAoVHlwZS5yZWdleChwYXR0ZXJuKSkge1xuICAgICAgICAgIFAgPSBFUy5DYWxsKHNvdXJjZUdldHRlciwgcGF0dGVybik7XG4gICAgICAgICAgRiA9IHR5cGVvZiBmbGFncyA9PT0gJ3VuZGVmaW5lZCcgPyBFUy5DYWxsKGZsYWdzR2V0dGVyLCBwYXR0ZXJuKSA6IGZsYWdzO1xuICAgICAgICAgIHJldHVybiBuZXcgUmVnRXhwKFAsIEYpO1xuICAgICAgICB9IGVsc2UgaWYgKHBhdHRlcm5Jc1JlZ0V4cCkge1xuICAgICAgICAgIFAgPSBwYXR0ZXJuLnNvdXJjZTtcbiAgICAgICAgICBGID0gdHlwZW9mIGZsYWdzID09PSAndW5kZWZpbmVkJyA/IHBhdHRlcm4uZmxhZ3MgOiBmbGFncztcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbmV3IE9yaWdSZWdFeHAocGF0dGVybiwgZmxhZ3MpO1xuICAgICAgfTtcbiAgICB9KCkpO1xuICAgIHdyYXBDb25zdHJ1Y3RvcihPcmlnUmVnRXhwLCBSZWdFeHBTaGltLCB7XG4gICAgICAkaW5wdXQ6IHRydWUgLy8gQ2hyb21lIDwgdjM5ICYgT3BlcmEgPCAyNiBoYXZlIGEgbm9uc3RhbmRhcmQgXCIkaW5wdXRcIiBwcm9wZXJ0eVxuICAgIH0pO1xuICAgIC8qIGdsb2JhbHMgUmVnRXhwOiB0cnVlICovXG4gICAgLyogZXNsaW50LWRpc2FibGUgbm8tdW5kZWYgKi9cbiAgICAvKiBqc2hpbnQgLVcwMjAgKi9cbiAgICBSZWdFeHAgPSBSZWdFeHBTaGltO1xuICAgIFZhbHVlLnJlZGVmaW5lKGdsb2JhbHMsICdSZWdFeHAnLCBSZWdFeHBTaGltKTtcbiAgICAvKiBqc2hpbnQgK1cwMjAgKi9cbiAgICAvKiBlc2xpbnQtZW5hYmxlIG5vLXVuZGVmICovXG4gICAgLyogZ2xvYmFscyBSZWdFeHA6IGZhbHNlICovXG4gIH1cblxuICBpZiAoc3VwcG9ydHNEZXNjcmlwdG9ycykge1xuICAgIHZhciByZWdleEdsb2JhbHMgPSB7XG4gICAgICBpbnB1dDogJyRfJyxcbiAgICAgIGxhc3RNYXRjaDogJyQmJyxcbiAgICAgIGxhc3RQYXJlbjogJyQrJyxcbiAgICAgIGxlZnRDb250ZXh0OiAnJGAnLFxuICAgICAgcmlnaHRDb250ZXh0OiAnJFxcJydcbiAgICB9O1xuICAgIF9mb3JFYWNoKGtleXMocmVnZXhHbG9iYWxzKSwgZnVuY3Rpb24gKHByb3ApIHtcbiAgICAgIGlmIChwcm9wIGluIFJlZ0V4cCAmJiAhKHJlZ2V4R2xvYmFsc1twcm9wXSBpbiBSZWdFeHApKSB7XG4gICAgICAgIFZhbHVlLmdldHRlcihSZWdFeHAsIHJlZ2V4R2xvYmFsc1twcm9wXSwgZnVuY3Rpb24gZ2V0KCkge1xuICAgICAgICAgIHJldHVybiBSZWdFeHBbcHJvcF07XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG4gIGFkZERlZmF1bHRTcGVjaWVzKFJlZ0V4cCk7XG5cbiAgdmFyIGludmVyc2VFcHNpbG9uID0gMSAvIE51bWJlci5FUFNJTE9OO1xuICB2YXIgcm91bmRUaWVzVG9FdmVuID0gZnVuY3Rpb24gcm91bmRUaWVzVG9FdmVuKG4pIHtcbiAgICAvLyBFdmVuIHRob3VnaCB0aGlzIHJlZHVjZXMgZG93biB0byBgcmV0dXJuIG5gLCBpdCB0YWtlcyBhZHZhbnRhZ2Ugb2YgYnVpbHQtaW4gcm91bmRpbmcuXG4gICAgcmV0dXJuIChuICsgaW52ZXJzZUVwc2lsb24pIC0gaW52ZXJzZUVwc2lsb247XG4gIH07XG4gIHZhciBCSU5BUllfMzJfRVBTSUxPTiA9IE1hdGgucG93KDIsIC0yMyk7XG4gIHZhciBCSU5BUllfMzJfTUFYX1ZBTFVFID0gTWF0aC5wb3coMiwgMTI3KSAqICgyIC0gQklOQVJZXzMyX0VQU0lMT04pO1xuICB2YXIgQklOQVJZXzMyX01JTl9WQUxVRSA9IE1hdGgucG93KDIsIC0xMjYpO1xuICB2YXIgbnVtYmVyQ0xaID0gTnVtYmVyLnByb3RvdHlwZS5jbHo7XG4gIGRlbGV0ZSBOdW1iZXIucHJvdG90eXBlLmNsejsgLy8gU2FmYXJpIDggaGFzIE51bWJlciNjbHpcblxuICB2YXIgTWF0aFNoaW1zID0ge1xuICAgIGFjb3NoOiBmdW5jdGlvbiBhY29zaCh2YWx1ZSkge1xuICAgICAgdmFyIHggPSBOdW1iZXIodmFsdWUpO1xuICAgICAgaWYgKE51bWJlci5pc05hTih4KSB8fCB2YWx1ZSA8IDEpIHsgcmV0dXJuIE5hTjsgfVxuICAgICAgaWYgKHggPT09IDEpIHsgcmV0dXJuIDA7IH1cbiAgICAgIGlmICh4ID09PSBJbmZpbml0eSkgeyByZXR1cm4geDsgfVxuICAgICAgcmV0dXJuIF9sb2coeCAvIE1hdGguRSArIF9zcXJ0KHggKyAxKSAqIF9zcXJ0KHggLSAxKSAvIE1hdGguRSkgKyAxO1xuICAgIH0sXG5cbiAgICBhc2luaDogZnVuY3Rpb24gYXNpbmgodmFsdWUpIHtcbiAgICAgIHZhciB4ID0gTnVtYmVyKHZhbHVlKTtcbiAgICAgIGlmICh4ID09PSAwIHx8ICFnbG9iYWxJc0Zpbml0ZSh4KSkge1xuICAgICAgICByZXR1cm4geDtcbiAgICAgIH1cbiAgICAgIHJldHVybiB4IDwgMCA/IC1NYXRoLmFzaW5oKC14KSA6IF9sb2coeCArIF9zcXJ0KHggKiB4ICsgMSkpO1xuICAgIH0sXG5cbiAgICBhdGFuaDogZnVuY3Rpb24gYXRhbmgodmFsdWUpIHtcbiAgICAgIHZhciB4ID0gTnVtYmVyKHZhbHVlKTtcbiAgICAgIGlmIChOdW1iZXIuaXNOYU4oeCkgfHwgeCA8IC0xIHx8IHggPiAxKSB7XG4gICAgICAgIHJldHVybiBOYU47XG4gICAgICB9XG4gICAgICBpZiAoeCA9PT0gLTEpIHsgcmV0dXJuIC1JbmZpbml0eTsgfVxuICAgICAgaWYgKHggPT09IDEpIHsgcmV0dXJuIEluZmluaXR5OyB9XG4gICAgICBpZiAoeCA9PT0gMCkgeyByZXR1cm4geDsgfVxuICAgICAgcmV0dXJuIDAuNSAqIF9sb2coKDEgKyB4KSAvICgxIC0geCkpO1xuICAgIH0sXG5cbiAgICBjYnJ0OiBmdW5jdGlvbiBjYnJ0KHZhbHVlKSB7XG4gICAgICB2YXIgeCA9IE51bWJlcih2YWx1ZSk7XG4gICAgICBpZiAoeCA9PT0gMCkgeyByZXR1cm4geDsgfVxuICAgICAgdmFyIG5lZ2F0ZSA9IHggPCAwLCByZXN1bHQ7XG4gICAgICBpZiAobmVnYXRlKSB7IHggPSAteDsgfVxuICAgICAgaWYgKHggPT09IEluZmluaXR5KSB7XG4gICAgICAgIHJlc3VsdCA9IEluZmluaXR5O1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmVzdWx0ID0gTWF0aC5leHAoX2xvZyh4KSAvIDMpO1xuICAgICAgICAvLyBmcm9tIGh0dHA6Ly9lbi53aWtpcGVkaWEub3JnL3dpa2kvQ3ViZV9yb290I051bWVyaWNhbF9tZXRob2RzXG4gICAgICAgIHJlc3VsdCA9ICh4IC8gKHJlc3VsdCAqIHJlc3VsdCkgKyAoMiAqIHJlc3VsdCkpIC8gMztcbiAgICAgIH1cbiAgICAgIHJldHVybiBuZWdhdGUgPyAtcmVzdWx0IDogcmVzdWx0O1xuICAgIH0sXG5cbiAgICBjbHozMjogZnVuY3Rpb24gY2x6MzIodmFsdWUpIHtcbiAgICAgIC8vIFNlZSBodHRwczovL2J1Z3MuZWNtYXNjcmlwdC5vcmcvc2hvd19idWcuY2dpP2lkPTI0NjVcbiAgICAgIHZhciB4ID0gTnVtYmVyKHZhbHVlKTtcbiAgICAgIHZhciBudW1iZXIgPSBFUy5Ub1VpbnQzMih4KTtcbiAgICAgIGlmIChudW1iZXIgPT09IDApIHtcbiAgICAgICAgcmV0dXJuIDMyO1xuICAgICAgfVxuICAgICAgcmV0dXJuIG51bWJlckNMWiA/IEVTLkNhbGwobnVtYmVyQ0xaLCBudW1iZXIpIDogMzEgLSBfZmxvb3IoX2xvZyhudW1iZXIgKyAwLjUpICogTWF0aC5MT0cyRSk7XG4gICAgfSxcblxuICAgIGNvc2g6IGZ1bmN0aW9uIGNvc2godmFsdWUpIHtcbiAgICAgIHZhciB4ID0gTnVtYmVyKHZhbHVlKTtcbiAgICAgIGlmICh4ID09PSAwKSB7IHJldHVybiAxOyB9IC8vICswIG9yIC0wXG4gICAgICBpZiAoTnVtYmVyLmlzTmFOKHgpKSB7IHJldHVybiBOYU47IH1cbiAgICAgIGlmICghZ2xvYmFsSXNGaW5pdGUoeCkpIHsgcmV0dXJuIEluZmluaXR5OyB9XG4gICAgICBpZiAoeCA8IDApIHsgeCA9IC14OyB9XG4gICAgICBpZiAoeCA+IDIxKSB7IHJldHVybiBNYXRoLmV4cCh4KSAvIDI7IH1cbiAgICAgIHJldHVybiAoTWF0aC5leHAoeCkgKyBNYXRoLmV4cCgteCkpIC8gMjtcbiAgICB9LFxuXG4gICAgZXhwbTE6IGZ1bmN0aW9uIGV4cG0xKHZhbHVlKSB7XG4gICAgICB2YXIgeCA9IE51bWJlcih2YWx1ZSk7XG4gICAgICBpZiAoeCA9PT0gLUluZmluaXR5KSB7IHJldHVybiAtMTsgfVxuICAgICAgaWYgKCFnbG9iYWxJc0Zpbml0ZSh4KSB8fCB4ID09PSAwKSB7IHJldHVybiB4OyB9XG4gICAgICBpZiAoX2Ficyh4KSA+IDAuNSkge1xuICAgICAgICByZXR1cm4gTWF0aC5leHAoeCkgLSAxO1xuICAgICAgfVxuICAgICAgLy8gQSBtb3JlIHByZWNpc2UgYXBwcm94aW1hdGlvbiB1c2luZyBUYXlsb3Igc2VyaWVzIGV4cGFuc2lvblxuICAgICAgLy8gZnJvbSBodHRwczovL2dpdGh1Yi5jb20vcGF1bG1pbGxyL2VzNi1zaGltL2lzc3Vlcy8zMTQjaXNzdWVjb21tZW50LTcwMjkzOTg2XG4gICAgICB2YXIgdCA9IHg7XG4gICAgICB2YXIgc3VtID0gMDtcbiAgICAgIHZhciBuID0gMTtcbiAgICAgIHdoaWxlIChzdW0gKyB0ICE9PSBzdW0pIHtcbiAgICAgICAgc3VtICs9IHQ7XG4gICAgICAgIG4gKz0gMTtcbiAgICAgICAgdCAqPSB4IC8gbjtcbiAgICAgIH1cbiAgICAgIHJldHVybiBzdW07XG4gICAgfSxcblxuICAgIGh5cG90OiBmdW5jdGlvbiBoeXBvdCh4LCB5KSB7XG4gICAgICB2YXIgcmVzdWx0ID0gMDtcbiAgICAgIHZhciBsYXJnZXN0ID0gMDtcbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgKytpKSB7XG4gICAgICAgIHZhciB2YWx1ZSA9IF9hYnMoTnVtYmVyKGFyZ3VtZW50c1tpXSkpO1xuICAgICAgICBpZiAobGFyZ2VzdCA8IHZhbHVlKSB7XG4gICAgICAgICAgcmVzdWx0ICo9IChsYXJnZXN0IC8gdmFsdWUpICogKGxhcmdlc3QgLyB2YWx1ZSk7XG4gICAgICAgICAgcmVzdWx0ICs9IDE7XG4gICAgICAgICAgbGFyZ2VzdCA9IHZhbHVlO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJlc3VsdCArPSAodmFsdWUgPiAwID8gKHZhbHVlIC8gbGFyZ2VzdCkgKiAodmFsdWUgLyBsYXJnZXN0KSA6IHZhbHVlKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIGxhcmdlc3QgPT09IEluZmluaXR5ID8gSW5maW5pdHkgOiBsYXJnZXN0ICogX3NxcnQocmVzdWx0KTtcbiAgICB9LFxuXG4gICAgbG9nMjogZnVuY3Rpb24gbG9nMih2YWx1ZSkge1xuICAgICAgcmV0dXJuIF9sb2codmFsdWUpICogTWF0aC5MT0cyRTtcbiAgICB9LFxuXG4gICAgbG9nMTA6IGZ1bmN0aW9uIGxvZzEwKHZhbHVlKSB7XG4gICAgICByZXR1cm4gX2xvZyh2YWx1ZSkgKiBNYXRoLkxPRzEwRTtcbiAgICB9LFxuXG4gICAgbG9nMXA6IGZ1bmN0aW9uIGxvZzFwKHZhbHVlKSB7XG4gICAgICB2YXIgeCA9IE51bWJlcih2YWx1ZSk7XG4gICAgICBpZiAoeCA8IC0xIHx8IE51bWJlci5pc05hTih4KSkgeyByZXR1cm4gTmFOOyB9XG4gICAgICBpZiAoeCA9PT0gMCB8fCB4ID09PSBJbmZpbml0eSkgeyByZXR1cm4geDsgfVxuICAgICAgaWYgKHggPT09IC0xKSB7IHJldHVybiAtSW5maW5pdHk7IH1cblxuICAgICAgcmV0dXJuICgxICsgeCkgLSAxID09PSAwID8geCA6IHggKiAoX2xvZygxICsgeCkgLyAoKDEgKyB4KSAtIDEpKTtcbiAgICB9LFxuXG4gICAgc2lnbjogZnVuY3Rpb24gc2lnbih2YWx1ZSkge1xuICAgICAgdmFyIG51bWJlciA9IE51bWJlcih2YWx1ZSk7XG4gICAgICBpZiAobnVtYmVyID09PSAwKSB7IHJldHVybiBudW1iZXI7IH1cbiAgICAgIGlmIChOdW1iZXIuaXNOYU4obnVtYmVyKSkgeyByZXR1cm4gbnVtYmVyOyB9XG4gICAgICByZXR1cm4gbnVtYmVyIDwgMCA/IC0xIDogMTtcbiAgICB9LFxuXG4gICAgc2luaDogZnVuY3Rpb24gc2luaCh2YWx1ZSkge1xuICAgICAgdmFyIHggPSBOdW1iZXIodmFsdWUpO1xuICAgICAgaWYgKCFnbG9iYWxJc0Zpbml0ZSh4KSB8fCB4ID09PSAwKSB7IHJldHVybiB4OyB9XG5cbiAgICAgIGlmIChfYWJzKHgpIDwgMSkge1xuICAgICAgICByZXR1cm4gKE1hdGguZXhwbTEoeCkgLSBNYXRoLmV4cG0xKC14KSkgLyAyO1xuICAgICAgfVxuICAgICAgcmV0dXJuIChNYXRoLmV4cCh4IC0gMSkgLSBNYXRoLmV4cCgteCAtIDEpKSAqIE1hdGguRSAvIDI7XG4gICAgfSxcblxuICAgIHRhbmg6IGZ1bmN0aW9uIHRhbmgodmFsdWUpIHtcbiAgICAgIHZhciB4ID0gTnVtYmVyKHZhbHVlKTtcbiAgICAgIGlmIChOdW1iZXIuaXNOYU4oeCkgfHwgeCA9PT0gMCkgeyByZXR1cm4geDsgfVxuICAgICAgLy8gY2FuIGV4aXQgZWFybHkgYXQgKy0yMCBhcyBKUyBsb3NlcyBwcmVjaXNpb24gZm9yIHRydWUgdmFsdWUgYXQgdGhpcyBpbnRlZ2VyXG4gICAgICBpZiAoeCA+PSAyMCkgeyByZXR1cm4gMTsgfVxuICAgICAgaWYgKHggPD0gLTIwKSB7IHJldHVybiAtMTsgfVxuICAgICAgdmFyIGEgPSBNYXRoLmV4cG0xKHgpO1xuICAgICAgdmFyIGIgPSBNYXRoLmV4cG0xKC14KTtcbiAgICAgIGlmIChhID09PSBJbmZpbml0eSkgeyByZXR1cm4gMTsgfVxuICAgICAgaWYgKGIgPT09IEluZmluaXR5KSB7IHJldHVybiAtMTsgfVxuICAgICAgcmV0dXJuIChhIC0gYikgLyAoTWF0aC5leHAoeCkgKyBNYXRoLmV4cCgteCkpO1xuICAgIH0sXG5cbiAgICB0cnVuYzogZnVuY3Rpb24gdHJ1bmModmFsdWUpIHtcbiAgICAgIHZhciB4ID0gTnVtYmVyKHZhbHVlKTtcbiAgICAgIHJldHVybiB4IDwgMCA/IC1fZmxvb3IoLXgpIDogX2Zsb29yKHgpO1xuICAgIH0sXG5cbiAgICBpbXVsOiBmdW5jdGlvbiBpbXVsKHgsIHkpIHtcbiAgICAgIC8vIHRha2VuIGZyb20gaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvZW4tVVMvZG9jcy9XZWIvSmF2YVNjcmlwdC9SZWZlcmVuY2UvR2xvYmFsX09iamVjdHMvTWF0aC9pbXVsXG4gICAgICB2YXIgYSA9IEVTLlRvVWludDMyKHgpO1xuICAgICAgdmFyIGIgPSBFUy5Ub1VpbnQzMih5KTtcbiAgICAgIHZhciBhaCA9IChhID4+PiAxNikgJiAweGZmZmY7XG4gICAgICB2YXIgYWwgPSBhICYgMHhmZmZmO1xuICAgICAgdmFyIGJoID0gKGIgPj4+IDE2KSAmIDB4ZmZmZjtcbiAgICAgIHZhciBibCA9IGIgJiAweGZmZmY7XG4gICAgICAvLyB0aGUgc2hpZnQgYnkgMCBmaXhlcyB0aGUgc2lnbiBvbiB0aGUgaGlnaCBwYXJ0XG4gICAgICAvLyB0aGUgZmluYWwgfDAgY29udmVydHMgdGhlIHVuc2lnbmVkIHZhbHVlIGludG8gYSBzaWduZWQgdmFsdWVcbiAgICAgIHJldHVybiAoKGFsICogYmwpICsgKCgoYWggKiBibCArIGFsICogYmgpIDw8IDE2KSA+Pj4gMCkgfCAwKTtcbiAgICB9LFxuXG4gICAgZnJvdW5kOiBmdW5jdGlvbiBmcm91bmQoeCkge1xuICAgICAgdmFyIHYgPSBOdW1iZXIoeCk7XG4gICAgICBpZiAodiA9PT0gMCB8fCB2ID09PSBJbmZpbml0eSB8fCB2ID09PSAtSW5maW5pdHkgfHwgbnVtYmVySXNOYU4odikpIHtcbiAgICAgICAgcmV0dXJuIHY7XG4gICAgICB9XG4gICAgICB2YXIgc2lnbiA9IE1hdGguc2lnbih2KTtcbiAgICAgIHZhciBhYnMgPSBfYWJzKHYpO1xuICAgICAgaWYgKGFicyA8IEJJTkFSWV8zMl9NSU5fVkFMVUUpIHtcbiAgICAgICAgcmV0dXJuIHNpZ24gKiByb3VuZFRpZXNUb0V2ZW4oYWJzIC8gQklOQVJZXzMyX01JTl9WQUxVRSAvIEJJTkFSWV8zMl9FUFNJTE9OKSAqIEJJTkFSWV8zMl9NSU5fVkFMVUUgKiBCSU5BUllfMzJfRVBTSUxPTjtcbiAgICAgIH1cbiAgICAgIC8vIFZlbHRrYW1wJ3Mgc3BsaXR0aW5nICg/KVxuICAgICAgdmFyIGEgPSAoMSArIEJJTkFSWV8zMl9FUFNJTE9OIC8gTnVtYmVyLkVQU0lMT04pICogYWJzO1xuICAgICAgdmFyIHJlc3VsdCA9IGEgLSAoYSAtIGFicyk7XG4gICAgICBpZiAocmVzdWx0ID4gQklOQVJZXzMyX01BWF9WQUxVRSB8fCBudW1iZXJJc05hTihyZXN1bHQpKSB7XG4gICAgICAgIHJldHVybiBzaWduICogSW5maW5pdHk7XG4gICAgICB9XG4gICAgICByZXR1cm4gc2lnbiAqIHJlc3VsdDtcbiAgICB9XG4gIH07XG4gIGRlZmluZVByb3BlcnRpZXMoTWF0aCwgTWF0aFNoaW1zKTtcbiAgLy8gSUUgMTEgVFAgaGFzIGFuIGltcHJlY2lzZSBsb2cxcDogcmVwb3J0cyBNYXRoLmxvZzFwKC0xZS0xNykgYXMgMFxuICBkZWZpbmVQcm9wZXJ0eShNYXRoLCAnbG9nMXAnLCBNYXRoU2hpbXMubG9nMXAsIE1hdGgubG9nMXAoLTFlLTE3KSAhPT0gLTFlLTE3KTtcbiAgLy8gSUUgMTEgVFAgaGFzIGFuIGltcHJlY2lzZSBhc2luaDogcmVwb3J0cyBNYXRoLmFzaW5oKC0xZTcpIGFzIG5vdCBleGFjdGx5IGVxdWFsIHRvIC1NYXRoLmFzaW5oKDFlNylcbiAgZGVmaW5lUHJvcGVydHkoTWF0aCwgJ2FzaW5oJywgTWF0aFNoaW1zLmFzaW5oLCBNYXRoLmFzaW5oKC0xZTcpICE9PSAtTWF0aC5hc2luaCgxZTcpKTtcbiAgLy8gQ2hyb21lIDQwIGhhcyBhbiBpbXByZWNpc2UgTWF0aC50YW5oIHdpdGggdmVyeSBzbWFsbCBudW1iZXJzXG4gIGRlZmluZVByb3BlcnR5KE1hdGgsICd0YW5oJywgTWF0aFNoaW1zLnRhbmgsIE1hdGgudGFuaCgtMmUtMTcpICE9PSAtMmUtMTcpO1xuICAvLyBDaHJvbWUgNDAgbG9zZXMgTWF0aC5hY29zaCBwcmVjaXNpb24gd2l0aCBoaWdoIG51bWJlcnNcbiAgZGVmaW5lUHJvcGVydHkoTWF0aCwgJ2Fjb3NoJywgTWF0aFNoaW1zLmFjb3NoLCBNYXRoLmFjb3NoKE51bWJlci5NQVhfVkFMVUUpID09PSBJbmZpbml0eSk7XG4gIC8vIEZpcmVmb3ggMzggb24gV2luZG93c1xuICBkZWZpbmVQcm9wZXJ0eShNYXRoLCAnY2JydCcsIE1hdGhTaGltcy5jYnJ0LCBNYXRoLmFicygxIC0gTWF0aC5jYnJ0KDFlLTMwMCkgLyAxZS0xMDApIC8gTnVtYmVyLkVQU0lMT04gPiA4KTtcbiAgLy8gbm9kZSAwLjExIGhhcyBhbiBpbXByZWNpc2UgTWF0aC5zaW5oIHdpdGggdmVyeSBzbWFsbCBudW1iZXJzXG4gIGRlZmluZVByb3BlcnR5KE1hdGgsICdzaW5oJywgTWF0aFNoaW1zLnNpbmgsIE1hdGguc2luaCgtMmUtMTcpICE9PSAtMmUtMTcpO1xuICAvLyBGRiAzNSBvbiBMaW51eCByZXBvcnRzIDIyMDI1LjQ2NTc5NDgwNjcyNSBmb3IgTWF0aC5leHBtMSgxMClcbiAgdmFyIGV4cG0xT2ZUZW4gPSBNYXRoLmV4cG0xKDEwKTtcbiAgZGVmaW5lUHJvcGVydHkoTWF0aCwgJ2V4cG0xJywgTWF0aFNoaW1zLmV4cG0xLCBleHBtMU9mVGVuID4gMjIwMjUuNDY1Nzk0ODA2NzE5IHx8IGV4cG0xT2ZUZW4gPCAyMjAyNS40NjU3OTQ4MDY3MTY1MTY4KTtcblxuICB2YXIgb3JpZ01hdGhSb3VuZCA9IE1hdGgucm91bmQ7XG4gIC8vIGJyZWFrcyBpbiBlLmcuIFNhZmFyaSA4LCBJbnRlcm5ldCBFeHBsb3JlciAxMSwgT3BlcmEgMTJcbiAgdmFyIHJvdW5kSGFuZGxlc0JvdW5kYXJ5Q29uZGl0aW9ucyA9IE1hdGgucm91bmQoMC41IC0gTnVtYmVyLkVQU0lMT04gLyA0KSA9PT0gMCAmJiBNYXRoLnJvdW5kKC0wLjUgKyBOdW1iZXIuRVBTSUxPTiAvIDMuOTkpID09PSAxO1xuXG4gIC8vIFdoZW4gZW5naW5lcyB1c2UgTWF0aC5mbG9vcih4ICsgMC41KSBpbnRlcm5hbGx5LCBNYXRoLnJvdW5kIGNhbiBiZSBidWdneSBmb3IgbGFyZ2UgaW50ZWdlcnMuXG4gIC8vIFRoaXMgYmVoYXZpb3Igc2hvdWxkIGJlIGdvdmVybmVkIGJ5IFwicm91bmQgdG8gbmVhcmVzdCwgdGllcyB0byBldmVuIG1vZGVcIlxuICAvLyBzZWUgaHR0cHM6Ly9wZW9wbGUubW96aWxsYS5vcmcvfmpvcmVuZG9yZmYvZXM2LWRyYWZ0Lmh0bWwjc2VjLWVjbWFzY3JpcHQtbGFuZ3VhZ2UtdHlwZXMtbnVtYmVyLXR5cGVcbiAgLy8gVGhlc2UgYXJlIHRoZSBib3VuZGFyeSBjYXNlcyB3aGVyZSBpdCBicmVha3MuXG4gIHZhciBzbWFsbGVzdFBvc2l0aXZlTnVtYmVyV2hlcmVSb3VuZEJyZWFrcyA9IGludmVyc2VFcHNpbG9uICsgMTtcbiAgdmFyIGxhcmdlc3RQb3NpdGl2ZU51bWJlcldoZXJlUm91bmRCcmVha3MgPSAyICogaW52ZXJzZUVwc2lsb24gLSAxO1xuICB2YXIgcm91bmREb2VzTm90SW5jcmVhc2VJbnRlZ2VycyA9IFtzbWFsbGVzdFBvc2l0aXZlTnVtYmVyV2hlcmVSb3VuZEJyZWFrcywgbGFyZ2VzdFBvc2l0aXZlTnVtYmVyV2hlcmVSb3VuZEJyZWFrc10uZXZlcnkoZnVuY3Rpb24gKG51bSkge1xuICAgIHJldHVybiBNYXRoLnJvdW5kKG51bSkgPT09IG51bTtcbiAgfSk7XG4gIGRlZmluZVByb3BlcnR5KE1hdGgsICdyb3VuZCcsIGZ1bmN0aW9uIHJvdW5kKHgpIHtcbiAgICB2YXIgZmxvb3IgPSBfZmxvb3IoeCk7XG4gICAgdmFyIGNlaWwgPSBmbG9vciA9PT0gLTEgPyAtMCA6IGZsb29yICsgMTtcbiAgICByZXR1cm4geCAtIGZsb29yIDwgMC41ID8gZmxvb3IgOiBjZWlsO1xuICB9LCAhcm91bmRIYW5kbGVzQm91bmRhcnlDb25kaXRpb25zIHx8ICFyb3VuZERvZXNOb3RJbmNyZWFzZUludGVnZXJzKTtcbiAgVmFsdWUucHJlc2VydmVUb1N0cmluZyhNYXRoLnJvdW5kLCBvcmlnTWF0aFJvdW5kKTtcblxuICB2YXIgb3JpZ0ltdWwgPSBNYXRoLmltdWw7XG4gIGlmIChNYXRoLmltdWwoMHhmZmZmZmZmZiwgNSkgIT09IC01KSB7XG4gICAgLy8gU2FmYXJpIDYuMSwgYXQgbGVhc3QsIHJlcG9ydHMgXCIwXCIgZm9yIHRoaXMgdmFsdWVcbiAgICBNYXRoLmltdWwgPSBNYXRoU2hpbXMuaW11bDtcbiAgICBWYWx1ZS5wcmVzZXJ2ZVRvU3RyaW5nKE1hdGguaW11bCwgb3JpZ0ltdWwpO1xuICB9XG4gIGlmIChNYXRoLmltdWwubGVuZ3RoICE9PSAyKSB7XG4gICAgLy8gU2FmYXJpIDguMC40IGhhcyBhIGxlbmd0aCBvZiAxXG4gICAgLy8gZml4ZWQgaW4gaHR0cHM6Ly9idWdzLndlYmtpdC5vcmcvc2hvd19idWcuY2dpP2lkPTE0MzY1OFxuICAgIG92ZXJyaWRlTmF0aXZlKE1hdGgsICdpbXVsJywgZnVuY3Rpb24gaW11bCh4LCB5KSB7XG4gICAgICByZXR1cm4gRVMuQ2FsbChvcmlnSW11bCwgTWF0aCwgYXJndW1lbnRzKTtcbiAgICB9KTtcbiAgfVxuXG4gIC8vIFByb21pc2VzXG4gIC8vIFNpbXBsZXN0IHBvc3NpYmxlIGltcGxlbWVudGF0aW9uOyB1c2UgYSAzcmQtcGFydHkgbGlicmFyeSBpZiB5b3VcbiAgLy8gd2FudCB0aGUgYmVzdCBwb3NzaWJsZSBzcGVlZCBhbmQvb3IgbG9uZyBzdGFjayB0cmFjZXMuXG4gIHZhciBQcm9taXNlU2hpbSA9IChmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHNldFRpbWVvdXQgPSBnbG9iYWxzLnNldFRpbWVvdXQ7XG4gICAgLy8gc29tZSBlbnZpcm9ubWVudHMgZG9uJ3QgaGF2ZSBzZXRUaW1lb3V0IC0gbm8gd2F5IHRvIHNoaW0gaGVyZS5cbiAgICBpZiAodHlwZW9mIHNldFRpbWVvdXQgIT09ICdmdW5jdGlvbicgJiYgdHlwZW9mIHNldFRpbWVvdXQgIT09ICdvYmplY3QnKSB7IHJldHVybjsgfVxuXG4gICAgRVMuSXNQcm9taXNlID0gZnVuY3Rpb24gKHByb21pc2UpIHtcbiAgICAgIGlmICghRVMuVHlwZUlzT2JqZWN0KHByb21pc2UpKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICAgIGlmICh0eXBlb2YgcHJvbWlzZS5fcHJvbWlzZSA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlOyAvLyB1bmluaXRpYWxpemVkLCBvciBtaXNzaW5nIG91ciBoaWRkZW4gZmllbGQuXG4gICAgICB9XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9O1xuXG4gICAgLy8gXCJQcm9taXNlQ2FwYWJpbGl0eVwiIGluIHRoZSBzcGVjIGlzIHdoYXQgbW9zdCBwcm9taXNlIGltcGxlbWVudGF0aW9uc1xuICAgIC8vIGNhbGwgYSBcImRlZmVycmVkXCIuXG4gICAgdmFyIFByb21pc2VDYXBhYmlsaXR5ID0gZnVuY3Rpb24gKEMpIHtcbiAgICAgIGlmICghRVMuSXNDb25zdHJ1Y3RvcihDKSkge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdCYWQgcHJvbWlzZSBjb25zdHJ1Y3RvcicpO1xuICAgICAgfVxuICAgICAgdmFyIGNhcGFiaWxpdHkgPSB0aGlzO1xuICAgICAgdmFyIHJlc29sdmVyID0gZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgICBpZiAoY2FwYWJpbGl0eS5yZXNvbHZlICE9PSB2b2lkIDAgfHwgY2FwYWJpbGl0eS5yZWplY3QgIT09IHZvaWQgMCkge1xuICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0JhZCBQcm9taXNlIGltcGxlbWVudGF0aW9uIScpO1xuICAgICAgICB9XG4gICAgICAgIGNhcGFiaWxpdHkucmVzb2x2ZSA9IHJlc29sdmU7XG4gICAgICAgIGNhcGFiaWxpdHkucmVqZWN0ID0gcmVqZWN0O1xuICAgICAgfTtcbiAgICAgIC8vIEluaXRpYWxpemUgZmllbGRzIHRvIGluZm9ybSBvcHRpbWl6ZXJzIGFib3V0IHRoZSBvYmplY3Qgc2hhcGUuXG4gICAgICBjYXBhYmlsaXR5LnJlc29sdmUgPSB2b2lkIDA7XG4gICAgICBjYXBhYmlsaXR5LnJlamVjdCA9IHZvaWQgMDtcbiAgICAgIGNhcGFiaWxpdHkucHJvbWlzZSA9IG5ldyBDKHJlc29sdmVyKTtcbiAgICAgIGlmICghKEVTLklzQ2FsbGFibGUoY2FwYWJpbGl0eS5yZXNvbHZlKSAmJiBFUy5Jc0NhbGxhYmxlKGNhcGFiaWxpdHkucmVqZWN0KSkpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignQmFkIHByb21pc2UgY29uc3RydWN0b3InKTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgLy8gZmluZCBhbiBhcHByb3ByaWF0ZSBzZXRJbW1lZGlhdGUtYWxpa2VcbiAgICB2YXIgbWFrZVplcm9UaW1lb3V0O1xuICAgIC8qZ2xvYmFsIHdpbmRvdyAqL1xuICAgIGlmICh0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJyAmJiBFUy5Jc0NhbGxhYmxlKHdpbmRvdy5wb3N0TWVzc2FnZSkpIHtcbiAgICAgIG1ha2VaZXJvVGltZW91dCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgLy8gZnJvbSBodHRwOi8vZGJhcm9uLm9yZy9sb2cvMjAxMDAzMDktZmFzdGVyLXRpbWVvdXRzXG4gICAgICAgIHZhciB0aW1lb3V0cyA9IFtdO1xuICAgICAgICB2YXIgbWVzc2FnZU5hbWUgPSAnemVyby10aW1lb3V0LW1lc3NhZ2UnO1xuICAgICAgICB2YXIgc2V0WmVyb1RpbWVvdXQgPSBmdW5jdGlvbiAoZm4pIHtcbiAgICAgICAgICBfcHVzaCh0aW1lb3V0cywgZm4pO1xuICAgICAgICAgIHdpbmRvdy5wb3N0TWVzc2FnZShtZXNzYWdlTmFtZSwgJyonKTtcbiAgICAgICAgfTtcbiAgICAgICAgdmFyIGhhbmRsZU1lc3NhZ2UgPSBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgICAgICBpZiAoZXZlbnQuc291cmNlID09PSB3aW5kb3cgJiYgZXZlbnQuZGF0YSA9PT0gbWVzc2FnZU5hbWUpIHtcbiAgICAgICAgICAgIGV2ZW50LnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICAgICAgaWYgKHRpbWVvdXRzLmxlbmd0aCA9PT0gMCkgeyByZXR1cm47IH1cbiAgICAgICAgICAgIHZhciBmbiA9IF9zaGlmdCh0aW1lb3V0cyk7XG4gICAgICAgICAgICBmbigpO1xuICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ21lc3NhZ2UnLCBoYW5kbGVNZXNzYWdlLCB0cnVlKTtcbiAgICAgICAgcmV0dXJuIHNldFplcm9UaW1lb3V0O1xuICAgICAgfTtcbiAgICB9XG4gICAgdmFyIG1ha2VQcm9taXNlQXNhcCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgIC8vIEFuIGVmZmljaWVudCB0YXNrLXNjaGVkdWxlciBiYXNlZCBvbiBhIHByZS1leGlzdGluZyBQcm9taXNlXG4gICAgICAvLyBpbXBsZW1lbnRhdGlvbiwgd2hpY2ggd2UgY2FuIHVzZSBldmVuIGlmIHdlIG92ZXJyaWRlIHRoZVxuICAgICAgLy8gZ2xvYmFsIFByb21pc2UgYmVsb3cgKGluIG9yZGVyIHRvIHdvcmthcm91bmQgYnVncylcbiAgICAgIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS9SYXlub3Mvb2JzZXJ2LWhhc2gvaXNzdWVzLzIjaXNzdWVjb21tZW50LTM1ODU3NjcxXG4gICAgICB2YXIgUCA9IGdsb2JhbHMuUHJvbWlzZTtcbiAgICAgIHZhciBwciA9IFAgJiYgUC5yZXNvbHZlICYmIFAucmVzb2x2ZSgpO1xuICAgICAgcmV0dXJuIHByICYmIGZ1bmN0aW9uICh0YXNrKSB7XG4gICAgICAgIHJldHVybiBwci50aGVuKHRhc2spO1xuICAgICAgfTtcbiAgICB9O1xuICAgIC8qZ2xvYmFsIHByb2Nlc3MgKi9cbiAgICAvKiBqc2NzOmRpc2FibGUgZGlzYWxsb3dNdWx0aUxpbmVUZXJuYXJ5ICovXG4gICAgdmFyIGVucXVldWUgPSBFUy5Jc0NhbGxhYmxlKGdsb2JhbHMuc2V0SW1tZWRpYXRlKSA/XG4gICAgICBnbG9iYWxzLnNldEltbWVkaWF0ZSA6XG4gICAgICB0eXBlb2YgcHJvY2VzcyA9PT0gJ29iamVjdCcgJiYgcHJvY2Vzcy5uZXh0VGljayA/IHByb2Nlc3MubmV4dFRpY2sgOlxuICAgICAgbWFrZVByb21pc2VBc2FwKCkgfHxcbiAgICAgIChFUy5Jc0NhbGxhYmxlKG1ha2VaZXJvVGltZW91dCkgPyBtYWtlWmVyb1RpbWVvdXQoKSA6XG4gICAgICBmdW5jdGlvbiAodGFzaykgeyBzZXRUaW1lb3V0KHRhc2ssIDApOyB9KTsgLy8gZmFsbGJhY2tcbiAgICAvKiBqc2NzOmVuYWJsZSBkaXNhbGxvd011bHRpTGluZVRlcm5hcnkgKi9cblxuICAgIC8vIENvbnN0YW50cyBmb3IgUHJvbWlzZSBpbXBsZW1lbnRhdGlvblxuICAgIHZhciBQUk9NSVNFX0lERU5USVRZID0gZnVuY3Rpb24gKHgpIHsgcmV0dXJuIHg7IH07XG4gICAgdmFyIFBST01JU0VfVEhST1dFUiA9IGZ1bmN0aW9uIChlKSB7IHRocm93IGU7IH07XG4gICAgdmFyIFBST01JU0VfUEVORElORyA9IDA7XG4gICAgdmFyIFBST01JU0VfRlVMRklMTEVEID0gMTtcbiAgICB2YXIgUFJPTUlTRV9SRUpFQ1RFRCA9IDI7XG4gICAgLy8gV2Ugc3RvcmUgZnVsZmlsbC9yZWplY3QgaGFuZGxlcnMgYW5kIGNhcGFiaWxpdGllcyBpbiBhIHNpbmdsZSBhcnJheS5cbiAgICB2YXIgUFJPTUlTRV9GVUxGSUxMX09GRlNFVCA9IDA7XG4gICAgdmFyIFBST01JU0VfUkVKRUNUX09GRlNFVCA9IDE7XG4gICAgdmFyIFBST01JU0VfQ0FQQUJJTElUWV9PRkZTRVQgPSAyO1xuICAgIC8vIFRoaXMgaXMgdXNlZCBpbiBhbiBvcHRpbWl6YXRpb24gZm9yIGNoYWluaW5nIHByb21pc2VzIHZpYSB0aGVuLlxuICAgIHZhciBQUk9NSVNFX0ZBS0VfQ0FQQUJJTElUWSA9IHt9O1xuXG4gICAgdmFyIGVucXVldWVQcm9taXNlUmVhY3Rpb25Kb2IgPSBmdW5jdGlvbiAoaGFuZGxlciwgY2FwYWJpbGl0eSwgYXJndW1lbnQpIHtcbiAgICAgIGVucXVldWUoZnVuY3Rpb24gKCkge1xuICAgICAgICBwcm9taXNlUmVhY3Rpb25Kb2IoaGFuZGxlciwgY2FwYWJpbGl0eSwgYXJndW1lbnQpO1xuICAgICAgfSk7XG4gICAgfTtcblxuICAgIHZhciBwcm9taXNlUmVhY3Rpb25Kb2IgPSBmdW5jdGlvbiAoaGFuZGxlciwgcHJvbWlzZUNhcGFiaWxpdHksIGFyZ3VtZW50KSB7XG4gICAgICB2YXIgaGFuZGxlclJlc3VsdCwgZjtcbiAgICAgIGlmIChwcm9taXNlQ2FwYWJpbGl0eSA9PT0gUFJPTUlTRV9GQUtFX0NBUEFCSUxJVFkpIHtcbiAgICAgICAgLy8gRmFzdCBjYXNlLCB3aGVuIHdlIGRvbid0IGFjdHVhbGx5IG5lZWQgdG8gY2hhaW4gdGhyb3VnaCB0byBhXG4gICAgICAgIC8vIChyZWFsKSBwcm9taXNlQ2FwYWJpbGl0eS5cbiAgICAgICAgcmV0dXJuIGhhbmRsZXIoYXJndW1lbnQpO1xuICAgICAgfVxuICAgICAgdHJ5IHtcbiAgICAgICAgaGFuZGxlclJlc3VsdCA9IGhhbmRsZXIoYXJndW1lbnQpO1xuICAgICAgICBmID0gcHJvbWlzZUNhcGFiaWxpdHkucmVzb2x2ZTtcbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgaGFuZGxlclJlc3VsdCA9IGU7XG4gICAgICAgIGYgPSBwcm9taXNlQ2FwYWJpbGl0eS5yZWplY3Q7XG4gICAgICB9XG4gICAgICBmKGhhbmRsZXJSZXN1bHQpO1xuICAgIH07XG5cbiAgICB2YXIgZnVsZmlsbFByb21pc2UgPSBmdW5jdGlvbiAocHJvbWlzZSwgdmFsdWUpIHtcbiAgICAgIHZhciBfcHJvbWlzZSA9IHByb21pc2UuX3Byb21pc2U7XG4gICAgICB2YXIgbGVuZ3RoID0gX3Byb21pc2UucmVhY3Rpb25MZW5ndGg7XG4gICAgICBpZiAobGVuZ3RoID4gMCkge1xuICAgICAgICBlbnF1ZXVlUHJvbWlzZVJlYWN0aW9uSm9iKFxuICAgICAgICAgIF9wcm9taXNlLmZ1bGZpbGxSZWFjdGlvbkhhbmRsZXIwLFxuICAgICAgICAgIF9wcm9taXNlLnJlYWN0aW9uQ2FwYWJpbGl0eTAsXG4gICAgICAgICAgdmFsdWVcbiAgICAgICAgKTtcbiAgICAgICAgX3Byb21pc2UuZnVsZmlsbFJlYWN0aW9uSGFuZGxlcjAgPSB2b2lkIDA7XG4gICAgICAgIF9wcm9taXNlLnJlamVjdFJlYWN0aW9uczAgPSB2b2lkIDA7XG4gICAgICAgIF9wcm9taXNlLnJlYWN0aW9uQ2FwYWJpbGl0eTAgPSB2b2lkIDA7XG4gICAgICAgIGlmIChsZW5ndGggPiAxKSB7XG4gICAgICAgICAgZm9yICh2YXIgaSA9IDEsIGlkeCA9IDA7IGkgPCBsZW5ndGg7IGkrKywgaWR4ICs9IDMpIHtcbiAgICAgICAgICAgIGVucXVldWVQcm9taXNlUmVhY3Rpb25Kb2IoXG4gICAgICAgICAgICAgIF9wcm9taXNlW2lkeCArIFBST01JU0VfRlVMRklMTF9PRkZTRVRdLFxuICAgICAgICAgICAgICBfcHJvbWlzZVtpZHggKyBQUk9NSVNFX0NBUEFCSUxJVFlfT0ZGU0VUXSxcbiAgICAgICAgICAgICAgdmFsdWVcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICBwcm9taXNlW2lkeCArIFBST01JU0VfRlVMRklMTF9PRkZTRVRdID0gdm9pZCAwO1xuICAgICAgICAgICAgcHJvbWlzZVtpZHggKyBQUk9NSVNFX1JFSkVDVF9PRkZTRVRdID0gdm9pZCAwO1xuICAgICAgICAgICAgcHJvbWlzZVtpZHggKyBQUk9NSVNFX0NBUEFCSUxJVFlfT0ZGU0VUXSA9IHZvaWQgMDtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIF9wcm9taXNlLnJlc3VsdCA9IHZhbHVlO1xuICAgICAgX3Byb21pc2Uuc3RhdGUgPSBQUk9NSVNFX0ZVTEZJTExFRDtcbiAgICAgIF9wcm9taXNlLnJlYWN0aW9uTGVuZ3RoID0gMDtcbiAgICB9O1xuXG4gICAgdmFyIHJlamVjdFByb21pc2UgPSBmdW5jdGlvbiAocHJvbWlzZSwgcmVhc29uKSB7XG4gICAgICB2YXIgX3Byb21pc2UgPSBwcm9taXNlLl9wcm9taXNlO1xuICAgICAgdmFyIGxlbmd0aCA9IF9wcm9taXNlLnJlYWN0aW9uTGVuZ3RoO1xuICAgICAgaWYgKGxlbmd0aCA+IDApIHtcbiAgICAgICAgZW5xdWV1ZVByb21pc2VSZWFjdGlvbkpvYihcbiAgICAgICAgICBfcHJvbWlzZS5yZWplY3RSZWFjdGlvbkhhbmRsZXIwLFxuICAgICAgICAgIF9wcm9taXNlLnJlYWN0aW9uQ2FwYWJpbGl0eTAsXG4gICAgICAgICAgcmVhc29uXG4gICAgICAgICk7XG4gICAgICAgIF9wcm9taXNlLmZ1bGZpbGxSZWFjdGlvbkhhbmRsZXIwID0gdm9pZCAwO1xuICAgICAgICBfcHJvbWlzZS5yZWplY3RSZWFjdGlvbnMwID0gdm9pZCAwO1xuICAgICAgICBfcHJvbWlzZS5yZWFjdGlvbkNhcGFiaWxpdHkwID0gdm9pZCAwO1xuICAgICAgICBpZiAobGVuZ3RoID4gMSkge1xuICAgICAgICAgIGZvciAodmFyIGkgPSAxLCBpZHggPSAwOyBpIDwgbGVuZ3RoOyBpKyssIGlkeCArPSAzKSB7XG4gICAgICAgICAgICBlbnF1ZXVlUHJvbWlzZVJlYWN0aW9uSm9iKFxuICAgICAgICAgICAgICBfcHJvbWlzZVtpZHggKyBQUk9NSVNFX1JFSkVDVF9PRkZTRVRdLFxuICAgICAgICAgICAgICBfcHJvbWlzZVtpZHggKyBQUk9NSVNFX0NBUEFCSUxJVFlfT0ZGU0VUXSxcbiAgICAgICAgICAgICAgcmVhc29uXG4gICAgICAgICAgICApO1xuICAgICAgICAgICAgcHJvbWlzZVtpZHggKyBQUk9NSVNFX0ZVTEZJTExfT0ZGU0VUXSA9IHZvaWQgMDtcbiAgICAgICAgICAgIHByb21pc2VbaWR4ICsgUFJPTUlTRV9SRUpFQ1RfT0ZGU0VUXSA9IHZvaWQgMDtcbiAgICAgICAgICAgIHByb21pc2VbaWR4ICsgUFJPTUlTRV9DQVBBQklMSVRZX09GRlNFVF0gPSB2b2lkIDA7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICBfcHJvbWlzZS5yZXN1bHQgPSByZWFzb247XG4gICAgICBfcHJvbWlzZS5zdGF0ZSA9IFBST01JU0VfUkVKRUNURUQ7XG4gICAgICBfcHJvbWlzZS5yZWFjdGlvbkxlbmd0aCA9IDA7XG4gICAgfTtcblxuICAgIHZhciBjcmVhdGVSZXNvbHZpbmdGdW5jdGlvbnMgPSBmdW5jdGlvbiAocHJvbWlzZSkge1xuICAgICAgdmFyIGFscmVhZHlSZXNvbHZlZCA9IGZhbHNlO1xuICAgICAgdmFyIHJlc29sdmUgPSBmdW5jdGlvbiAocmVzb2x1dGlvbikge1xuICAgICAgICB2YXIgdGhlbjtcbiAgICAgICAgaWYgKGFscmVhZHlSZXNvbHZlZCkgeyByZXR1cm47IH1cbiAgICAgICAgYWxyZWFkeVJlc29sdmVkID0gdHJ1ZTtcbiAgICAgICAgaWYgKHJlc29sdXRpb24gPT09IHByb21pc2UpIHtcbiAgICAgICAgICByZXR1cm4gcmVqZWN0UHJvbWlzZShwcm9taXNlLCBuZXcgVHlwZUVycm9yKCdTZWxmIHJlc29sdXRpb24nKSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCFFUy5UeXBlSXNPYmplY3QocmVzb2x1dGlvbikpIHtcbiAgICAgICAgICByZXR1cm4gZnVsZmlsbFByb21pc2UocHJvbWlzZSwgcmVzb2x1dGlvbik7XG4gICAgICAgIH1cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICB0aGVuID0gcmVzb2x1dGlvbi50aGVuO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgcmV0dXJuIHJlamVjdFByb21pc2UocHJvbWlzZSwgZSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCFFUy5Jc0NhbGxhYmxlKHRoZW4pKSB7XG4gICAgICAgICAgcmV0dXJuIGZ1bGZpbGxQcm9taXNlKHByb21pc2UsIHJlc29sdXRpb24pO1xuICAgICAgICB9XG4gICAgICAgIGVucXVldWUoZnVuY3Rpb24gKCkge1xuICAgICAgICAgIHByb21pc2VSZXNvbHZlVGhlbmFibGVKb2IocHJvbWlzZSwgcmVzb2x1dGlvbiwgdGhlbik7XG4gICAgICAgIH0pO1xuICAgICAgfTtcbiAgICAgIHZhciByZWplY3QgPSBmdW5jdGlvbiAocmVhc29uKSB7XG4gICAgICAgIGlmIChhbHJlYWR5UmVzb2x2ZWQpIHsgcmV0dXJuOyB9XG4gICAgICAgIGFscmVhZHlSZXNvbHZlZCA9IHRydWU7XG4gICAgICAgIHJldHVybiByZWplY3RQcm9taXNlKHByb21pc2UsIHJlYXNvbik7XG4gICAgICB9O1xuICAgICAgcmV0dXJuIHsgcmVzb2x2ZTogcmVzb2x2ZSwgcmVqZWN0OiByZWplY3QgfTtcbiAgICB9O1xuXG4gICAgdmFyIG9wdGltaXplZFRoZW4gPSBmdW5jdGlvbiAodGhlbiwgdGhlbmFibGUsIHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgLy8gT3B0aW1pemF0aW9uOiBzaW5jZSB3ZSBkaXNjYXJkIHRoZSByZXN1bHQsIHdlIGNhbiBwYXNzIG91clxuICAgICAgLy8gb3duIHRoZW4gaW1wbGVtZW50YXRpb24gYSBzcGVjaWFsIGhpbnQgdG8gbGV0IGl0IGtub3cgaXRcbiAgICAgIC8vIGRvZXNuJ3QgaGF2ZSB0byBjcmVhdGUgaXQuICAoVGhlIFBST01JU0VfRkFLRV9DQVBBQklMSVRZXG4gICAgICAvLyBvYmplY3QgaXMgbG9jYWwgdG8gdGhpcyBpbXBsZW1lbnRhdGlvbiBhbmQgdW5mb3JnZWFibGUgb3V0c2lkZS4pXG4gICAgICBpZiAodGhlbiA9PT0gUHJvbWlzZSRwcm90b3R5cGUkdGhlbikge1xuICAgICAgICBfY2FsbCh0aGVuLCB0aGVuYWJsZSwgcmVzb2x2ZSwgcmVqZWN0LCBQUk9NSVNFX0ZBS0VfQ0FQQUJJTElUWSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBfY2FsbCh0aGVuLCB0aGVuYWJsZSwgcmVzb2x2ZSwgcmVqZWN0KTtcbiAgICAgIH1cbiAgICB9O1xuICAgIHZhciBwcm9taXNlUmVzb2x2ZVRoZW5hYmxlSm9iID0gZnVuY3Rpb24gKHByb21pc2UsIHRoZW5hYmxlLCB0aGVuKSB7XG4gICAgICB2YXIgcmVzb2x2aW5nRnVuY3Rpb25zID0gY3JlYXRlUmVzb2x2aW5nRnVuY3Rpb25zKHByb21pc2UpO1xuICAgICAgdmFyIHJlc29sdmUgPSByZXNvbHZpbmdGdW5jdGlvbnMucmVzb2x2ZTtcbiAgICAgIHZhciByZWplY3QgPSByZXNvbHZpbmdGdW5jdGlvbnMucmVqZWN0O1xuICAgICAgdHJ5IHtcbiAgICAgICAgb3B0aW1pemVkVGhlbih0aGVuLCB0aGVuYWJsZSwgcmVzb2x2ZSwgcmVqZWN0KTtcbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgcmVqZWN0KGUpO1xuICAgICAgfVxuICAgIH07XG5cbiAgICB2YXIgUHJvbWlzZSRwcm90b3R5cGUsIFByb21pc2UkcHJvdG90eXBlJHRoZW47XG4gICAgdmFyIFByb21pc2UgPSAoZnVuY3Rpb24gKCkge1xuICAgICAgdmFyIFByb21pc2VTaGltID0gZnVuY3Rpb24gUHJvbWlzZShyZXNvbHZlcikge1xuICAgICAgICBpZiAoISh0aGlzIGluc3RhbmNlb2YgUHJvbWlzZVNoaW0pKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignQ29uc3RydWN0b3IgUHJvbWlzZSByZXF1aXJlcyBcIm5ld1wiJyk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoaXMgJiYgdGhpcy5fcHJvbWlzZSkge1xuICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0JhZCBjb25zdHJ1Y3Rpb24nKTtcbiAgICAgICAgfVxuICAgICAgICAvLyBzZWUgaHR0cHM6Ly9idWdzLmVjbWFzY3JpcHQub3JnL3Nob3dfYnVnLmNnaT9pZD0yNDgyXG4gICAgICAgIGlmICghRVMuSXNDYWxsYWJsZShyZXNvbHZlcikpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdub3QgYSB2YWxpZCByZXNvbHZlcicpO1xuICAgICAgICB9XG4gICAgICAgIHZhciBwcm9taXNlID0gZW11bGF0ZUVTNmNvbnN0cnVjdCh0aGlzLCBQcm9taXNlU2hpbSwgUHJvbWlzZSRwcm90b3R5cGUsIHtcbiAgICAgICAgICBfcHJvbWlzZToge1xuICAgICAgICAgICAgcmVzdWx0OiB2b2lkIDAsXG4gICAgICAgICAgICBzdGF0ZTogUFJPTUlTRV9QRU5ESU5HLFxuICAgICAgICAgICAgLy8gVGhlIGZpcnN0IG1lbWJlciBvZiB0aGUgXCJyZWFjdGlvbnNcIiBhcnJheSBpcyBpbmxpbmVkIGhlcmUsXG4gICAgICAgICAgICAvLyBzaW5jZSBtb3N0IHByb21pc2VzIG9ubHkgaGF2ZSBvbmUgcmVhY3Rpb24uXG4gICAgICAgICAgICAvLyBXZSd2ZSBhbHNvIGV4cGxvZGVkIHRoZSAncmVhY3Rpb24nIG9iamVjdCB0byBpbmxpbmUgdGhlXG4gICAgICAgICAgICAvLyBcImhhbmRsZXJcIiBhbmQgXCJjYXBhYmlsaXR5XCIgZmllbGRzLCBzaW5jZSBib3RoIGZ1bGZpbGwgYW5kXG4gICAgICAgICAgICAvLyByZWplY3QgcmVhY3Rpb25zIHNoYXJlIHRoZSBzYW1lIGNhcGFiaWxpdHkuXG4gICAgICAgICAgICByZWFjdGlvbkxlbmd0aDogMCxcbiAgICAgICAgICAgIGZ1bGZpbGxSZWFjdGlvbkhhbmRsZXIwOiB2b2lkIDAsXG4gICAgICAgICAgICByZWplY3RSZWFjdGlvbkhhbmRsZXIwOiB2b2lkIDAsXG4gICAgICAgICAgICByZWFjdGlvbkNhcGFiaWxpdHkwOiB2b2lkIDBcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICB2YXIgcmVzb2x2aW5nRnVuY3Rpb25zID0gY3JlYXRlUmVzb2x2aW5nRnVuY3Rpb25zKHByb21pc2UpO1xuICAgICAgICB2YXIgcmVqZWN0ID0gcmVzb2x2aW5nRnVuY3Rpb25zLnJlamVjdDtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICByZXNvbHZlcihyZXNvbHZpbmdGdW5jdGlvbnMucmVzb2x2ZSwgcmVqZWN0KTtcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgIHJlamVjdChlKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcHJvbWlzZTtcbiAgICAgIH07XG4gICAgICByZXR1cm4gUHJvbWlzZVNoaW07XG4gICAgfSgpKTtcbiAgICBQcm9taXNlJHByb3RvdHlwZSA9IFByb21pc2UucHJvdG90eXBlO1xuXG4gICAgdmFyIF9wcm9taXNlQWxsUmVzb2x2ZXIgPSBmdW5jdGlvbiAoaW5kZXgsIHZhbHVlcywgY2FwYWJpbGl0eSwgcmVtYWluaW5nKSB7XG4gICAgICB2YXIgYWxyZWFkeUNhbGxlZCA9IGZhbHNlO1xuICAgICAgcmV0dXJuIGZ1bmN0aW9uICh4KSB7XG4gICAgICAgIGlmIChhbHJlYWR5Q2FsbGVkKSB7IHJldHVybjsgfVxuICAgICAgICBhbHJlYWR5Q2FsbGVkID0gdHJ1ZTtcbiAgICAgICAgdmFsdWVzW2luZGV4XSA9IHg7XG4gICAgICAgIGlmICgoLS1yZW1haW5pbmcuY291bnQpID09PSAwKSB7XG4gICAgICAgICAgdmFyIHJlc29sdmUgPSBjYXBhYmlsaXR5LnJlc29sdmU7XG4gICAgICAgICAgcmVzb2x2ZSh2YWx1ZXMpOyAvLyBjYWxsIHcvIHRoaXM9PT11bmRlZmluZWRcbiAgICAgICAgfVxuICAgICAgfTtcbiAgICB9O1xuXG4gICAgdmFyIHBlcmZvcm1Qcm9taXNlQWxsID0gZnVuY3Rpb24gKGl0ZXJhdG9yUmVjb3JkLCBDLCByZXN1bHRDYXBhYmlsaXR5KSB7XG4gICAgICB2YXIgaXQgPSBpdGVyYXRvclJlY29yZC5pdGVyYXRvcjtcbiAgICAgIHZhciB2YWx1ZXMgPSBbXSwgcmVtYWluaW5nID0geyBjb3VudDogMSB9LCBuZXh0LCBuZXh0VmFsdWU7XG4gICAgICB2YXIgaW5kZXggPSAwO1xuICAgICAgd2hpbGUgKHRydWUpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBuZXh0ID0gRVMuSXRlcmF0b3JTdGVwKGl0KTtcbiAgICAgICAgICBpZiAobmV4dCA9PT0gZmFsc2UpIHtcbiAgICAgICAgICAgIGl0ZXJhdG9yUmVjb3JkLmRvbmUgPSB0cnVlO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgfVxuICAgICAgICAgIG5leHRWYWx1ZSA9IG5leHQudmFsdWU7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICBpdGVyYXRvclJlY29yZC5kb25lID0gdHJ1ZTtcbiAgICAgICAgICB0aHJvdyBlO1xuICAgICAgICB9XG4gICAgICAgIHZhbHVlc1tpbmRleF0gPSB2b2lkIDA7XG4gICAgICAgIHZhciBuZXh0UHJvbWlzZSA9IEMucmVzb2x2ZShuZXh0VmFsdWUpO1xuICAgICAgICB2YXIgcmVzb2x2ZUVsZW1lbnQgPSBfcHJvbWlzZUFsbFJlc29sdmVyKFxuICAgICAgICAgIGluZGV4LCB2YWx1ZXMsIHJlc3VsdENhcGFiaWxpdHksIHJlbWFpbmluZ1xuICAgICAgICApO1xuICAgICAgICByZW1haW5pbmcuY291bnQgKz0gMTtcbiAgICAgICAgb3B0aW1pemVkVGhlbihuZXh0UHJvbWlzZS50aGVuLCBuZXh0UHJvbWlzZSwgcmVzb2x2ZUVsZW1lbnQsIHJlc3VsdENhcGFiaWxpdHkucmVqZWN0KTtcbiAgICAgICAgaW5kZXggKz0gMTtcbiAgICAgIH1cbiAgICAgIGlmICgoLS1yZW1haW5pbmcuY291bnQpID09PSAwKSB7XG4gICAgICAgIHZhciByZXNvbHZlID0gcmVzdWx0Q2FwYWJpbGl0eS5yZXNvbHZlO1xuICAgICAgICByZXNvbHZlKHZhbHVlcyk7IC8vIGNhbGwgdy8gdGhpcz09PXVuZGVmaW5lZFxuICAgICAgfVxuICAgICAgcmV0dXJuIHJlc3VsdENhcGFiaWxpdHkucHJvbWlzZTtcbiAgICB9O1xuXG4gICAgdmFyIHBlcmZvcm1Qcm9taXNlUmFjZSA9IGZ1bmN0aW9uIChpdGVyYXRvclJlY29yZCwgQywgcmVzdWx0Q2FwYWJpbGl0eSkge1xuICAgICAgdmFyIGl0ID0gaXRlcmF0b3JSZWNvcmQuaXRlcmF0b3IsIG5leHQsIG5leHRWYWx1ZSwgbmV4dFByb21pc2U7XG4gICAgICB3aGlsZSAodHJ1ZSkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgIG5leHQgPSBFUy5JdGVyYXRvclN0ZXAoaXQpO1xuICAgICAgICAgIGlmIChuZXh0ID09PSBmYWxzZSkge1xuICAgICAgICAgICAgLy8gTk9URTogSWYgaXRlcmFibGUgaGFzIG5vIGl0ZW1zLCByZXN1bHRpbmcgcHJvbWlzZSB3aWxsIG5ldmVyXG4gICAgICAgICAgICAvLyByZXNvbHZlOyBzZWU6XG4gICAgICAgICAgICAvLyBodHRwczovL2dpdGh1Yi5jb20vZG9tZW5pYy9wcm9taXNlcy11bndyYXBwaW5nL2lzc3Vlcy83NVxuICAgICAgICAgICAgLy8gaHR0cHM6Ly9idWdzLmVjbWFzY3JpcHQub3JnL3Nob3dfYnVnLmNnaT9pZD0yNTE1XG4gICAgICAgICAgICBpdGVyYXRvclJlY29yZC5kb25lID0gdHJ1ZTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIH1cbiAgICAgICAgICBuZXh0VmFsdWUgPSBuZXh0LnZhbHVlO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgaXRlcmF0b3JSZWNvcmQuZG9uZSA9IHRydWU7XG4gICAgICAgICAgdGhyb3cgZTtcbiAgICAgICAgfVxuICAgICAgICBuZXh0UHJvbWlzZSA9IEMucmVzb2x2ZShuZXh0VmFsdWUpO1xuICAgICAgICBvcHRpbWl6ZWRUaGVuKG5leHRQcm9taXNlLnRoZW4sIG5leHRQcm9taXNlLCByZXN1bHRDYXBhYmlsaXR5LnJlc29sdmUsIHJlc3VsdENhcGFiaWxpdHkucmVqZWN0KTtcbiAgICAgIH1cbiAgICAgIHJldHVybiByZXN1bHRDYXBhYmlsaXR5LnByb21pc2U7XG4gICAgfTtcblxuICAgIGRlZmluZVByb3BlcnRpZXMoUHJvbWlzZSwge1xuICAgICAgYWxsOiBmdW5jdGlvbiBhbGwoaXRlcmFibGUpIHtcbiAgICAgICAgdmFyIEMgPSB0aGlzO1xuICAgICAgICBpZiAoIUVTLlR5cGVJc09iamVjdChDKSkge1xuICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1Byb21pc2UgaXMgbm90IG9iamVjdCcpO1xuICAgICAgICB9XG4gICAgICAgIHZhciBjYXBhYmlsaXR5ID0gbmV3IFByb21pc2VDYXBhYmlsaXR5KEMpO1xuICAgICAgICB2YXIgaXRlcmF0b3IsIGl0ZXJhdG9yUmVjb3JkO1xuICAgICAgICB0cnkge1xuICAgICAgICAgIGl0ZXJhdG9yID0gRVMuR2V0SXRlcmF0b3IoaXRlcmFibGUpO1xuICAgICAgICAgIGl0ZXJhdG9yUmVjb3JkID0geyBpdGVyYXRvcjogaXRlcmF0b3IsIGRvbmU6IGZhbHNlIH07XG4gICAgICAgICAgcmV0dXJuIHBlcmZvcm1Qcm9taXNlQWxsKGl0ZXJhdG9yUmVjb3JkLCBDLCBjYXBhYmlsaXR5KTtcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgIHZhciBleGNlcHRpb24gPSBlO1xuICAgICAgICAgIGlmIChpdGVyYXRvclJlY29yZCAmJiAhaXRlcmF0b3JSZWNvcmQuZG9uZSkge1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgRVMuSXRlcmF0b3JDbG9zZShpdGVyYXRvciwgdHJ1ZSk7XG4gICAgICAgICAgICB9IGNhdGNoIChlZSkge1xuICAgICAgICAgICAgICBleGNlcHRpb24gPSBlZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgdmFyIHJlamVjdCA9IGNhcGFiaWxpdHkucmVqZWN0O1xuICAgICAgICAgIHJlamVjdChleGNlcHRpb24pO1xuICAgICAgICAgIHJldHVybiBjYXBhYmlsaXR5LnByb21pc2U7XG4gICAgICAgIH1cbiAgICAgIH0sXG5cbiAgICAgIHJhY2U6IGZ1bmN0aW9uIHJhY2UoaXRlcmFibGUpIHtcbiAgICAgICAgdmFyIEMgPSB0aGlzO1xuICAgICAgICBpZiAoIUVTLlR5cGVJc09iamVjdChDKSkge1xuICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1Byb21pc2UgaXMgbm90IG9iamVjdCcpO1xuICAgICAgICB9XG4gICAgICAgIHZhciBjYXBhYmlsaXR5ID0gbmV3IFByb21pc2VDYXBhYmlsaXR5KEMpO1xuICAgICAgICB2YXIgaXRlcmF0b3IsIGl0ZXJhdG9yUmVjb3JkO1xuICAgICAgICB0cnkge1xuICAgICAgICAgIGl0ZXJhdG9yID0gRVMuR2V0SXRlcmF0b3IoaXRlcmFibGUpO1xuICAgICAgICAgIGl0ZXJhdG9yUmVjb3JkID0geyBpdGVyYXRvcjogaXRlcmF0b3IsIGRvbmU6IGZhbHNlIH07XG4gICAgICAgICAgcmV0dXJuIHBlcmZvcm1Qcm9taXNlUmFjZShpdGVyYXRvclJlY29yZCwgQywgY2FwYWJpbGl0eSk7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICB2YXIgZXhjZXB0aW9uID0gZTtcbiAgICAgICAgICBpZiAoaXRlcmF0b3JSZWNvcmQgJiYgIWl0ZXJhdG9yUmVjb3JkLmRvbmUpIHtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgIEVTLkl0ZXJhdG9yQ2xvc2UoaXRlcmF0b3IsIHRydWUpO1xuICAgICAgICAgICAgfSBjYXRjaCAoZWUpIHtcbiAgICAgICAgICAgICAgZXhjZXB0aW9uID0gZWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIHZhciByZWplY3QgPSBjYXBhYmlsaXR5LnJlamVjdDtcbiAgICAgICAgICByZWplY3QoZXhjZXB0aW9uKTtcbiAgICAgICAgICByZXR1cm4gY2FwYWJpbGl0eS5wcm9taXNlO1xuICAgICAgICB9XG4gICAgICB9LFxuXG4gICAgICByZWplY3Q6IGZ1bmN0aW9uIHJlamVjdChyZWFzb24pIHtcbiAgICAgICAgdmFyIEMgPSB0aGlzO1xuICAgICAgICBpZiAoIUVTLlR5cGVJc09iamVjdChDKSkge1xuICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0JhZCBwcm9taXNlIGNvbnN0cnVjdG9yJyk7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGNhcGFiaWxpdHkgPSBuZXcgUHJvbWlzZUNhcGFiaWxpdHkoQyk7XG4gICAgICAgIHZhciByZWplY3RGdW5jID0gY2FwYWJpbGl0eS5yZWplY3Q7XG4gICAgICAgIHJlamVjdEZ1bmMocmVhc29uKTsgLy8gY2FsbCB3aXRoIHRoaXM9PT11bmRlZmluZWRcbiAgICAgICAgcmV0dXJuIGNhcGFiaWxpdHkucHJvbWlzZTtcbiAgICAgIH0sXG5cbiAgICAgIHJlc29sdmU6IGZ1bmN0aW9uIHJlc29sdmUodikge1xuICAgICAgICAvLyBTZWUgaHR0cHM6Ly9lc2Rpc2N1c3Mub3JnL3RvcGljL2ZpeGluZy1wcm9taXNlLXJlc29sdmUgZm9yIHNwZWNcbiAgICAgICAgdmFyIEMgPSB0aGlzO1xuICAgICAgICBpZiAoIUVTLlR5cGVJc09iamVjdChDKSkge1xuICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0JhZCBwcm9taXNlIGNvbnN0cnVjdG9yJyk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKEVTLklzUHJvbWlzZSh2KSkge1xuICAgICAgICAgIHZhciBjb25zdHJ1Y3RvciA9IHYuY29uc3RydWN0b3I7XG4gICAgICAgICAgaWYgKGNvbnN0cnVjdG9yID09PSBDKSB7IHJldHVybiB2OyB9XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGNhcGFiaWxpdHkgPSBuZXcgUHJvbWlzZUNhcGFiaWxpdHkoQyk7XG4gICAgICAgIHZhciByZXNvbHZlRnVuYyA9IGNhcGFiaWxpdHkucmVzb2x2ZTtcbiAgICAgICAgcmVzb2x2ZUZ1bmModik7IC8vIGNhbGwgd2l0aCB0aGlzPT09dW5kZWZpbmVkXG4gICAgICAgIHJldHVybiBjYXBhYmlsaXR5LnByb21pc2U7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICBkZWZpbmVQcm9wZXJ0aWVzKFByb21pc2UkcHJvdG90eXBlLCB7XG4gICAgICAnY2F0Y2gnOiBmdW5jdGlvbiAob25SZWplY3RlZCkge1xuICAgICAgICByZXR1cm4gdGhpcy50aGVuKG51bGwsIG9uUmVqZWN0ZWQpO1xuICAgICAgfSxcblxuICAgICAgdGhlbjogZnVuY3Rpb24gdGhlbihvbkZ1bGZpbGxlZCwgb25SZWplY3RlZCkge1xuICAgICAgICB2YXIgcHJvbWlzZSA9IHRoaXM7XG4gICAgICAgIGlmICghRVMuSXNQcm9taXNlKHByb21pc2UpKSB7IHRocm93IG5ldyBUeXBlRXJyb3IoJ25vdCBhIHByb21pc2UnKTsgfVxuICAgICAgICB2YXIgQyA9IEVTLlNwZWNpZXNDb25zdHJ1Y3Rvcihwcm9taXNlLCBQcm9taXNlKTtcbiAgICAgICAgdmFyIHJlc3VsdENhcGFiaWxpdHk7XG4gICAgICAgIHZhciByZXR1cm5WYWx1ZUlzSWdub3JlZCA9IGFyZ3VtZW50cy5sZW5ndGggPiAyICYmIGFyZ3VtZW50c1syXSA9PT0gUFJPTUlTRV9GQUtFX0NBUEFCSUxJVFk7XG4gICAgICAgIGlmIChyZXR1cm5WYWx1ZUlzSWdub3JlZCAmJiBDID09PSBQcm9taXNlKSB7XG4gICAgICAgICAgcmVzdWx0Q2FwYWJpbGl0eSA9IFBST01JU0VfRkFLRV9DQVBBQklMSVRZO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJlc3VsdENhcGFiaWxpdHkgPSBuZXcgUHJvbWlzZUNhcGFiaWxpdHkoQyk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gUGVyZm9ybVByb21pc2VUaGVuKHByb21pc2UsIG9uRnVsZmlsbGVkLCBvblJlamVjdGVkLCByZXN1bHRDYXBhYmlsaXR5KVxuICAgICAgICAvLyBOb3RlIHRoYXQgd2UndmUgc3BsaXQgdGhlICdyZWFjdGlvbicgb2JqZWN0IGludG8gaXRzIHR3b1xuICAgICAgICAvLyBjb21wb25lbnRzLCBcImNhcGFiaWxpdGllc1wiIGFuZCBcImhhbmRsZXJcIlxuICAgICAgICAvLyBcImNhcGFiaWxpdGllc1wiIGlzIGFsd2F5cyBlcXVhbCB0byBgcmVzdWx0Q2FwYWJpbGl0eWBcbiAgICAgICAgdmFyIGZ1bGZpbGxSZWFjdGlvbkhhbmRsZXIgPSBFUy5Jc0NhbGxhYmxlKG9uRnVsZmlsbGVkKSA/IG9uRnVsZmlsbGVkIDogUFJPTUlTRV9JREVOVElUWTtcbiAgICAgICAgdmFyIHJlamVjdFJlYWN0aW9uSGFuZGxlciA9IEVTLklzQ2FsbGFibGUob25SZWplY3RlZCkgPyBvblJlamVjdGVkIDogUFJPTUlTRV9USFJPV0VSO1xuICAgICAgICB2YXIgX3Byb21pc2UgPSBwcm9taXNlLl9wcm9taXNlO1xuICAgICAgICB2YXIgdmFsdWU7XG4gICAgICAgIGlmIChfcHJvbWlzZS5zdGF0ZSA9PT0gUFJPTUlTRV9QRU5ESU5HKSB7XG4gICAgICAgICAgaWYgKF9wcm9taXNlLnJlYWN0aW9uTGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICBfcHJvbWlzZS5mdWxmaWxsUmVhY3Rpb25IYW5kbGVyMCA9IGZ1bGZpbGxSZWFjdGlvbkhhbmRsZXI7XG4gICAgICAgICAgICBfcHJvbWlzZS5yZWplY3RSZWFjdGlvbkhhbmRsZXIwID0gcmVqZWN0UmVhY3Rpb25IYW5kbGVyO1xuICAgICAgICAgICAgX3Byb21pc2UucmVhY3Rpb25DYXBhYmlsaXR5MCA9IHJlc3VsdENhcGFiaWxpdHk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHZhciBpZHggPSAzICogKF9wcm9taXNlLnJlYWN0aW9uTGVuZ3RoIC0gMSk7XG4gICAgICAgICAgICBfcHJvbWlzZVtpZHggKyBQUk9NSVNFX0ZVTEZJTExfT0ZGU0VUXSA9IGZ1bGZpbGxSZWFjdGlvbkhhbmRsZXI7XG4gICAgICAgICAgICBfcHJvbWlzZVtpZHggKyBQUk9NSVNFX1JFSkVDVF9PRkZTRVRdID0gcmVqZWN0UmVhY3Rpb25IYW5kbGVyO1xuICAgICAgICAgICAgX3Byb21pc2VbaWR4ICsgUFJPTUlTRV9DQVBBQklMSVRZX09GRlNFVF0gPSByZXN1bHRDYXBhYmlsaXR5O1xuICAgICAgICAgIH1cbiAgICAgICAgICBfcHJvbWlzZS5yZWFjdGlvbkxlbmd0aCArPSAxO1xuICAgICAgICB9IGVsc2UgaWYgKF9wcm9taXNlLnN0YXRlID09PSBQUk9NSVNFX0ZVTEZJTExFRCkge1xuICAgICAgICAgIHZhbHVlID0gX3Byb21pc2UucmVzdWx0O1xuICAgICAgICAgIGVucXVldWVQcm9taXNlUmVhY3Rpb25Kb2IoXG4gICAgICAgICAgICBmdWxmaWxsUmVhY3Rpb25IYW5kbGVyLCByZXN1bHRDYXBhYmlsaXR5LCB2YWx1ZVxuICAgICAgICAgICk7XG4gICAgICAgIH0gZWxzZSBpZiAoX3Byb21pc2Uuc3RhdGUgPT09IFBST01JU0VfUkVKRUNURUQpIHtcbiAgICAgICAgICB2YWx1ZSA9IF9wcm9taXNlLnJlc3VsdDtcbiAgICAgICAgICBlbnF1ZXVlUHJvbWlzZVJlYWN0aW9uSm9iKFxuICAgICAgICAgICAgcmVqZWN0UmVhY3Rpb25IYW5kbGVyLCByZXN1bHRDYXBhYmlsaXR5LCB2YWx1ZVxuICAgICAgICAgICk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcigndW5leHBlY3RlZCBQcm9taXNlIHN0YXRlJyk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJlc3VsdENhcGFiaWxpdHkucHJvbWlzZTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICAvLyBUaGlzIGhlbHBzIHRoZSBvcHRpbWl6ZXIgYnkgZW5zdXJpbmcgdGhhdCBtZXRob2RzIHdoaWNoIHRha2VcbiAgICAvLyBjYXBhYmlsaXRpZXMgYXJlbid0IHBvbHltb3JwaGljLlxuICAgIFBST01JU0VfRkFLRV9DQVBBQklMSVRZID0gbmV3IFByb21pc2VDYXBhYmlsaXR5KFByb21pc2UpO1xuICAgIFByb21pc2UkcHJvdG90eXBlJHRoZW4gPSBQcm9taXNlJHByb3RvdHlwZS50aGVuO1xuXG4gICAgcmV0dXJuIFByb21pc2U7XG4gIH0oKSk7XG5cbiAgLy8gQ2hyb21lJ3MgbmF0aXZlIFByb21pc2UgaGFzIGV4dHJhIG1ldGhvZHMgdGhhdCBpdCBzaG91bGRuJ3QgaGF2ZS4gTGV0J3MgcmVtb3ZlIHRoZW0uXG4gIGlmIChnbG9iYWxzLlByb21pc2UpIHtcbiAgICBkZWxldGUgZ2xvYmFscy5Qcm9taXNlLmFjY2VwdDtcbiAgICBkZWxldGUgZ2xvYmFscy5Qcm9taXNlLmRlZmVyO1xuICAgIGRlbGV0ZSBnbG9iYWxzLlByb21pc2UucHJvdG90eXBlLmNoYWluO1xuICB9XG5cbiAgaWYgKHR5cGVvZiBQcm9taXNlU2hpbSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgIC8vIGV4cG9ydCB0aGUgUHJvbWlzZSBjb25zdHJ1Y3Rvci5cbiAgICBkZWZpbmVQcm9wZXJ0aWVzKGdsb2JhbHMsIHsgUHJvbWlzZTogUHJvbWlzZVNoaW0gfSk7XG4gICAgLy8gSW4gQ2hyb21lIDMzIChhbmQgdGhlcmVhYm91dHMpIFByb21pc2UgaXMgZGVmaW5lZCwgYnV0IHRoZVxuICAgIC8vIGltcGxlbWVudGF0aW9uIGlzIGJ1Z2d5IGluIGEgbnVtYmVyIG9mIHdheXMuICBMZXQncyBjaGVjayBzdWJjbGFzc2luZ1xuICAgIC8vIHN1cHBvcnQgdG8gc2VlIGlmIHdlIGhhdmUgYSBidWdneSBpbXBsZW1lbnRhdGlvbi5cbiAgICB2YXIgcHJvbWlzZVN1cHBvcnRzU3ViY2xhc3NpbmcgPSBzdXBwb3J0c1N1YmNsYXNzaW5nKGdsb2JhbHMuUHJvbWlzZSwgZnVuY3Rpb24gKFMpIHtcbiAgICAgIHJldHVybiBTLnJlc29sdmUoNDIpLnRoZW4oZnVuY3Rpb24gKCkge30pIGluc3RhbmNlb2YgUztcbiAgICB9KTtcbiAgICB2YXIgcHJvbWlzZUlnbm9yZXNOb25GdW5jdGlvblRoZW5DYWxsYmFja3MgPSAhdGhyb3dzRXJyb3IoZnVuY3Rpb24gKCkgeyBnbG9iYWxzLlByb21pc2UucmVqZWN0KDQyKS50aGVuKG51bGwsIDUpLnRoZW4obnVsbCwgbm9vcCk7IH0pO1xuICAgIHZhciBwcm9taXNlUmVxdWlyZXNPYmplY3RDb250ZXh0ID0gdGhyb3dzRXJyb3IoZnVuY3Rpb24gKCkgeyBnbG9iYWxzLlByb21pc2UuY2FsbCgzLCBub29wKTsgfSk7XG4gICAgLy8gUHJvbWlzZS5yZXNvbHZlKCkgd2FzIGVycmF0YSdlZCBsYXRlIGluIHRoZSBFUzYgcHJvY2Vzcy5cbiAgICAvLyBTZWU6IGh0dHBzOi8vYnVnemlsbGEubW96aWxsYS5vcmcvc2hvd19idWcuY2dpP2lkPTExNzA3NDJcbiAgICAvLyAgICAgIGh0dHBzOi8vY29kZS5nb29nbGUuY29tL3AvdjgvaXNzdWVzL2RldGFpbD9pZD00MTYxXG4gICAgLy8gSXQgc2VydmVzIGFzIGEgcHJveHkgZm9yIGEgbnVtYmVyIG9mIG90aGVyIGJ1Z3MgaW4gZWFybHkgUHJvbWlzZVxuICAgIC8vIGltcGxlbWVudGF0aW9ucy5cbiAgICB2YXIgcHJvbWlzZVJlc29sdmVCcm9rZW4gPSAoZnVuY3Rpb24gKFByb21pc2UpIHtcbiAgICAgIHZhciBwID0gUHJvbWlzZS5yZXNvbHZlKDUpO1xuICAgICAgcC5jb25zdHJ1Y3RvciA9IHt9O1xuICAgICAgdmFyIHAyID0gUHJvbWlzZS5yZXNvbHZlKHApO1xuICAgICAgdHJ5IHtcbiAgICAgICAgcDIudGhlbihudWxsLCBub29wKS50aGVuKG51bGwsIG5vb3ApOyAvLyBhdm9pZCBcInVuY2F1Z2h0IHJlamVjdGlvblwiIHdhcm5pbmdzIGluIGNvbnNvbGVcbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgcmV0dXJuIHRydWU7IC8vIHY4IG5hdGl2ZSBQcm9taXNlcyBicmVhayBoZXJlIGh0dHBzOi8vY29kZS5nb29nbGUuY29tL3AvY2hyb21pdW0vaXNzdWVzL2RldGFpbD9pZD01NzUzMTRcbiAgICAgIH1cbiAgICAgIHJldHVybiBwID09PSBwMjsgLy8gVGhpcyAqc2hvdWxkKiBiZSBmYWxzZSFcbiAgICB9KGdsb2JhbHMuUHJvbWlzZSkpO1xuXG4gICAgLy8gQ2hyb21lIDQ2IChwcm9iYWJseSBvbGRlciB0b28pIGRvZXMgbm90IHJldHJpZXZlIGEgdGhlbmFibGUncyAudGhlbiBzeW5jaHJvbm91c2x5XG4gICAgdmFyIGdldHNUaGVuU3luY2hyb25vdXNseSA9IHN1cHBvcnRzRGVzY3JpcHRvcnMgJiYgKGZ1bmN0aW9uICgpIHtcbiAgICAgIHZhciBjb3VudCA9IDA7XG4gICAgICB2YXIgdGhlbmFibGUgPSBPYmplY3QuZGVmaW5lUHJvcGVydHkoe30sICd0aGVuJywgeyBnZXQ6IGZ1bmN0aW9uICgpIHsgY291bnQgKz0gMTsgfSB9KTtcbiAgICAgIFByb21pc2UucmVzb2x2ZSh0aGVuYWJsZSk7XG4gICAgICByZXR1cm4gY291bnQgPT09IDE7XG4gICAgfSgpKTtcblxuICAgIHZhciBCYWRSZXNvbHZlclByb21pc2UgPSBmdW5jdGlvbiBCYWRSZXNvbHZlclByb21pc2UoZXhlY3V0b3IpIHtcbiAgICAgIHZhciBwID0gbmV3IFByb21pc2UoZXhlY3V0b3IpO1xuICAgICAgZXhlY3V0b3IoMywgZnVuY3Rpb24gKCkge30pO1xuICAgICAgdGhpcy50aGVuID0gcC50aGVuO1xuICAgICAgdGhpcy5jb25zdHJ1Y3RvciA9IEJhZFJlc29sdmVyUHJvbWlzZTtcbiAgICB9O1xuICAgIEJhZFJlc29sdmVyUHJvbWlzZS5wcm90b3R5cGUgPSBQcm9taXNlLnByb3RvdHlwZTtcbiAgICBCYWRSZXNvbHZlclByb21pc2UuYWxsID0gUHJvbWlzZS5hbGw7XG4gICAgLy8gQ2hyb21lIENhbmFyeSA0OSAocHJvYmFibHkgb2xkZXIgdG9vKSBoYXMgc29tZSBpbXBsZW1lbnRhdGlvbiBidWdzXG4gICAgdmFyIGhhc0JhZFJlc29sdmVyUHJvbWlzZSA9IHZhbHVlT3JGYWxzZUlmVGhyb3dzKGZ1bmN0aW9uICgpIHtcbiAgICAgIHJldHVybiAhIUJhZFJlc29sdmVyUHJvbWlzZS5hbGwoWzEsIDJdKTtcbiAgICB9KTtcblxuICAgIGlmICghcHJvbWlzZVN1cHBvcnRzU3ViY2xhc3NpbmcgfHwgIXByb21pc2VJZ25vcmVzTm9uRnVuY3Rpb25UaGVuQ2FsbGJhY2tzIHx8XG4gICAgICAgICFwcm9taXNlUmVxdWlyZXNPYmplY3RDb250ZXh0IHx8IHByb21pc2VSZXNvbHZlQnJva2VuIHx8XG4gICAgICAgICFnZXRzVGhlblN5bmNocm9ub3VzbHkgfHwgaGFzQmFkUmVzb2x2ZXJQcm9taXNlKSB7XG4gICAgICAvKiBnbG9iYWxzIFByb21pc2U6IHRydWUgKi9cbiAgICAgIC8qIGVzbGludC1kaXNhYmxlIG5vLXVuZGVmICovXG4gICAgICAvKiBqc2hpbnQgLVcwMjAgKi9cbiAgICAgIFByb21pc2UgPSBQcm9taXNlU2hpbTtcbiAgICAgIC8qIGpzaGludCArVzAyMCAqL1xuICAgICAgLyogZXNsaW50LWVuYWJsZSBuby11bmRlZiAqL1xuICAgICAgLyogZ2xvYmFscyBQcm9taXNlOiBmYWxzZSAqL1xuICAgICAgb3ZlcnJpZGVOYXRpdmUoZ2xvYmFscywgJ1Byb21pc2UnLCBQcm9taXNlU2hpbSk7XG4gICAgfVxuICAgIGlmIChQcm9taXNlLmFsbC5sZW5ndGggIT09IDEpIHtcbiAgICAgIHZhciBvcmlnQWxsID0gUHJvbWlzZS5hbGw7XG4gICAgICBvdmVycmlkZU5hdGl2ZShQcm9taXNlLCAnYWxsJywgZnVuY3Rpb24gYWxsKGl0ZXJhYmxlKSB7XG4gICAgICAgIHJldHVybiBFUy5DYWxsKG9yaWdBbGwsIHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICB9KTtcbiAgICB9XG4gICAgaWYgKFByb21pc2UucmFjZS5sZW5ndGggIT09IDEpIHtcbiAgICAgIHZhciBvcmlnUmFjZSA9IFByb21pc2UucmFjZTtcbiAgICAgIG92ZXJyaWRlTmF0aXZlKFByb21pc2UsICdyYWNlJywgZnVuY3Rpb24gcmFjZShpdGVyYWJsZSkge1xuICAgICAgICByZXR1cm4gRVMuQ2FsbChvcmlnUmFjZSwgdGhpcywgYXJndW1lbnRzKTtcbiAgICAgIH0pO1xuICAgIH1cbiAgICBpZiAoUHJvbWlzZS5yZXNvbHZlLmxlbmd0aCAhPT0gMSkge1xuICAgICAgdmFyIG9yaWdSZXNvbHZlID0gUHJvbWlzZS5yZXNvbHZlO1xuICAgICAgb3ZlcnJpZGVOYXRpdmUoUHJvbWlzZSwgJ3Jlc29sdmUnLCBmdW5jdGlvbiByZXNvbHZlKHgpIHtcbiAgICAgICAgcmV0dXJuIEVTLkNhbGwob3JpZ1Jlc29sdmUsIHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICB9KTtcbiAgICB9XG4gICAgaWYgKFByb21pc2UucmVqZWN0Lmxlbmd0aCAhPT0gMSkge1xuICAgICAgdmFyIG9yaWdSZWplY3QgPSBQcm9taXNlLnJlamVjdDtcbiAgICAgIG92ZXJyaWRlTmF0aXZlKFByb21pc2UsICdyZWplY3QnLCBmdW5jdGlvbiByZWplY3Qocikge1xuICAgICAgICByZXR1cm4gRVMuQ2FsbChvcmlnUmVqZWN0LCB0aGlzLCBhcmd1bWVudHMpO1xuICAgICAgfSk7XG4gICAgfVxuICAgIGVuc3VyZUVudW1lcmFibGUoUHJvbWlzZSwgJ2FsbCcpO1xuICAgIGVuc3VyZUVudW1lcmFibGUoUHJvbWlzZSwgJ3JhY2UnKTtcbiAgICBlbnN1cmVFbnVtZXJhYmxlKFByb21pc2UsICdyZXNvbHZlJyk7XG4gICAgZW5zdXJlRW51bWVyYWJsZShQcm9taXNlLCAncmVqZWN0Jyk7XG4gICAgYWRkRGVmYXVsdFNwZWNpZXMoUHJvbWlzZSk7XG4gIH1cblxuICAvLyBNYXAgYW5kIFNldCByZXF1aXJlIGEgdHJ1ZSBFUzUgZW52aXJvbm1lbnRcbiAgLy8gVGhlaXIgZmFzdCBwYXRoIGFsc28gcmVxdWlyZXMgdGhhdCB0aGUgZW52aXJvbm1lbnQgcHJlc2VydmVcbiAgLy8gcHJvcGVydHkgaW5zZXJ0aW9uIG9yZGVyLCB3aGljaCBpcyBub3QgZ3VhcmFudGVlZCBieSB0aGUgc3BlYy5cbiAgdmFyIHRlc3RPcmRlciA9IGZ1bmN0aW9uIChhKSB7XG4gICAgdmFyIGIgPSBrZXlzKF9yZWR1Y2UoYSwgZnVuY3Rpb24gKG8sIGspIHtcbiAgICAgIG9ba10gPSB0cnVlO1xuICAgICAgcmV0dXJuIG87XG4gICAgfSwge30pKTtcbiAgICByZXR1cm4gYS5qb2luKCc6JykgPT09IGIuam9pbignOicpO1xuICB9O1xuICB2YXIgcHJlc2VydmVzSW5zZXJ0aW9uT3JkZXIgPSB0ZXN0T3JkZXIoWyd6JywgJ2EnLCAnYmInXSk7XG4gIC8vIHNvbWUgZW5naW5lcyAoZWcsIENocm9tZSkgb25seSBwcmVzZXJ2ZSBpbnNlcnRpb24gb3JkZXIgZm9yIHN0cmluZyBrZXlzXG4gIHZhciBwcmVzZXJ2ZXNOdW1lcmljSW5zZXJ0aW9uT3JkZXIgPSB0ZXN0T3JkZXIoWyd6JywgMSwgJ2EnLCAnMycsIDJdKTtcblxuICBpZiAoc3VwcG9ydHNEZXNjcmlwdG9ycykge1xuXG4gICAgdmFyIGZhc3RrZXkgPSBmdW5jdGlvbiBmYXN0a2V5KGtleSkge1xuICAgICAgaWYgKCFwcmVzZXJ2ZXNJbnNlcnRpb25PcmRlcikge1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH1cbiAgICAgIGlmICh0eXBlb2Yga2V5ID09PSAndW5kZWZpbmVkJyB8fCBrZXkgPT09IG51bGwpIHtcbiAgICAgICAgcmV0dXJuICdeJyArIEVTLlRvU3RyaW5nKGtleSk7XG4gICAgICB9IGVsc2UgaWYgKHR5cGVvZiBrZXkgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgIHJldHVybiAnJCcgKyBrZXk7XG4gICAgICB9IGVsc2UgaWYgKHR5cGVvZiBrZXkgPT09ICdudW1iZXInKSB7XG4gICAgICAgIC8vIG5vdGUgdGhhdCAtMCB3aWxsIGdldCBjb2VyY2VkIHRvIFwiMFwiIHdoZW4gdXNlZCBhcyBhIHByb3BlcnR5IGtleVxuICAgICAgICBpZiAoIXByZXNlcnZlc051bWVyaWNJbnNlcnRpb25PcmRlcikge1xuICAgICAgICAgIHJldHVybiAnbicgKyBrZXk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGtleTtcbiAgICAgIH0gZWxzZSBpZiAodHlwZW9mIGtleSA9PT0gJ2Jvb2xlYW4nKSB7XG4gICAgICAgIHJldHVybiAnYicgKyBrZXk7XG4gICAgICB9XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9O1xuXG4gICAgdmFyIGVtcHR5T2JqZWN0ID0gZnVuY3Rpb24gZW1wdHlPYmplY3QoKSB7XG4gICAgICAvLyBhY2NvbW9kYXRlIHNvbWUgb2xkZXIgbm90LXF1aXRlLUVTNSBicm93c2Vyc1xuICAgICAgcmV0dXJuIE9iamVjdC5jcmVhdGUgPyBPYmplY3QuY3JlYXRlKG51bGwpIDoge307XG4gICAgfTtcblxuICAgIHZhciBhZGRJdGVyYWJsZVRvTWFwID0gZnVuY3Rpb24gYWRkSXRlcmFibGVUb01hcChNYXBDb25zdHJ1Y3RvciwgbWFwLCBpdGVyYWJsZSkge1xuICAgICAgaWYgKGlzQXJyYXkoaXRlcmFibGUpIHx8IFR5cGUuc3RyaW5nKGl0ZXJhYmxlKSkge1xuICAgICAgICBfZm9yRWFjaChpdGVyYWJsZSwgZnVuY3Rpb24gKGVudHJ5KSB7XG4gICAgICAgICAgaWYgKCFFUy5UeXBlSXNPYmplY3QoZW50cnkpKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdJdGVyYXRvciB2YWx1ZSAnICsgZW50cnkgKyAnIGlzIG5vdCBhbiBlbnRyeSBvYmplY3QnKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgbWFwLnNldChlbnRyeVswXSwgZW50cnlbMV0pO1xuICAgICAgICB9KTtcbiAgICAgIH0gZWxzZSBpZiAoaXRlcmFibGUgaW5zdGFuY2VvZiBNYXBDb25zdHJ1Y3Rvcikge1xuICAgICAgICBfY2FsbChNYXBDb25zdHJ1Y3Rvci5wcm90b3R5cGUuZm9yRWFjaCwgaXRlcmFibGUsIGZ1bmN0aW9uICh2YWx1ZSwga2V5KSB7XG4gICAgICAgICAgbWFwLnNldChrZXksIHZhbHVlKTtcbiAgICAgICAgfSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB2YXIgaXRlciwgYWRkZXI7XG4gICAgICAgIGlmIChpdGVyYWJsZSAhPT0gbnVsbCAmJiB0eXBlb2YgaXRlcmFibGUgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgYWRkZXIgPSBtYXAuc2V0O1xuICAgICAgICAgIGlmICghRVMuSXNDYWxsYWJsZShhZGRlcikpIHsgdGhyb3cgbmV3IFR5cGVFcnJvcignYmFkIG1hcCcpOyB9XG4gICAgICAgICAgaXRlciA9IEVTLkdldEl0ZXJhdG9yKGl0ZXJhYmxlKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodHlwZW9mIGl0ZXIgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgd2hpbGUgKHRydWUpIHtcbiAgICAgICAgICAgIHZhciBuZXh0ID0gRVMuSXRlcmF0b3JTdGVwKGl0ZXIpO1xuICAgICAgICAgICAgaWYgKG5leHQgPT09IGZhbHNlKSB7IGJyZWFrOyB9XG4gICAgICAgICAgICB2YXIgbmV4dEl0ZW0gPSBuZXh0LnZhbHVlO1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgaWYgKCFFUy5UeXBlSXNPYmplY3QobmV4dEl0ZW0pKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignSXRlcmF0b3IgdmFsdWUgJyArIG5leHRJdGVtICsgJyBpcyBub3QgYW4gZW50cnkgb2JqZWN0Jyk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgX2NhbGwoYWRkZXIsIG1hcCwgbmV4dEl0ZW1bMF0sIG5leHRJdGVtWzFdKTtcbiAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgRVMuSXRlcmF0b3JDbG9zZShpdGVyLCB0cnVlKTtcbiAgICAgICAgICAgICAgdGhyb3cgZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9O1xuICAgIHZhciBhZGRJdGVyYWJsZVRvU2V0ID0gZnVuY3Rpb24gYWRkSXRlcmFibGVUb1NldChTZXRDb25zdHJ1Y3Rvciwgc2V0LCBpdGVyYWJsZSkge1xuICAgICAgaWYgKGlzQXJyYXkoaXRlcmFibGUpIHx8IFR5cGUuc3RyaW5nKGl0ZXJhYmxlKSkge1xuICAgICAgICBfZm9yRWFjaChpdGVyYWJsZSwgZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgICAgc2V0LmFkZCh2YWx1ZSk7XG4gICAgICAgIH0pO1xuICAgICAgfSBlbHNlIGlmIChpdGVyYWJsZSBpbnN0YW5jZW9mIFNldENvbnN0cnVjdG9yKSB7XG4gICAgICAgIF9jYWxsKFNldENvbnN0cnVjdG9yLnByb3RvdHlwZS5mb3JFYWNoLCBpdGVyYWJsZSwgZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgICAgc2V0LmFkZCh2YWx1ZSk7XG4gICAgICAgIH0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdmFyIGl0ZXIsIGFkZGVyO1xuICAgICAgICBpZiAoaXRlcmFibGUgIT09IG51bGwgJiYgdHlwZW9mIGl0ZXJhYmxlICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgIGFkZGVyID0gc2V0LmFkZDtcbiAgICAgICAgICBpZiAoIUVTLklzQ2FsbGFibGUoYWRkZXIpKSB7IHRocm93IG5ldyBUeXBlRXJyb3IoJ2JhZCBzZXQnKTsgfVxuICAgICAgICAgIGl0ZXIgPSBFUy5HZXRJdGVyYXRvcihpdGVyYWJsZSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHR5cGVvZiBpdGVyICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgIHdoaWxlICh0cnVlKSB7XG4gICAgICAgICAgICB2YXIgbmV4dCA9IEVTLkl0ZXJhdG9yU3RlcChpdGVyKTtcbiAgICAgICAgICAgIGlmIChuZXh0ID09PSBmYWxzZSkgeyBicmVhazsgfVxuICAgICAgICAgICAgdmFyIG5leHRWYWx1ZSA9IG5leHQudmFsdWU7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICBfY2FsbChhZGRlciwgc2V0LCBuZXh0VmFsdWUpO1xuICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICBFUy5JdGVyYXRvckNsb3NlKGl0ZXIsIHRydWUpO1xuICAgICAgICAgICAgICB0aHJvdyBlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH07XG5cbiAgICB2YXIgY29sbGVjdGlvblNoaW1zID0ge1xuICAgICAgTWFwOiAoZnVuY3Rpb24gKCkge1xuXG4gICAgICAgIHZhciBlbXB0eSA9IHt9O1xuXG4gICAgICAgIHZhciBNYXBFbnRyeSA9IGZ1bmN0aW9uIE1hcEVudHJ5KGtleSwgdmFsdWUpIHtcbiAgICAgICAgICB0aGlzLmtleSA9IGtleTtcbiAgICAgICAgICB0aGlzLnZhbHVlID0gdmFsdWU7XG4gICAgICAgICAgdGhpcy5uZXh0ID0gbnVsbDtcbiAgICAgICAgICB0aGlzLnByZXYgPSBudWxsO1xuICAgICAgICB9O1xuXG4gICAgICAgIE1hcEVudHJ5LnByb3RvdHlwZS5pc1JlbW92ZWQgPSBmdW5jdGlvbiBpc1JlbW92ZWQoKSB7XG4gICAgICAgICAgcmV0dXJuIHRoaXMua2V5ID09PSBlbXB0eTtcbiAgICAgICAgfTtcblxuICAgICAgICB2YXIgaXNNYXAgPSBmdW5jdGlvbiBpc01hcChtYXApIHtcbiAgICAgICAgICByZXR1cm4gISFtYXAuX2VzNm1hcDtcbiAgICAgICAgfTtcblxuICAgICAgICB2YXIgcmVxdWlyZU1hcFNsb3QgPSBmdW5jdGlvbiByZXF1aXJlTWFwU2xvdChtYXAsIG1ldGhvZCkge1xuICAgICAgICAgIGlmICghRVMuVHlwZUlzT2JqZWN0KG1hcCkgfHwgIWlzTWFwKG1hcCkpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ01ldGhvZCBNYXAucHJvdG90eXBlLicgKyBtZXRob2QgKyAnIGNhbGxlZCBvbiBpbmNvbXBhdGlibGUgcmVjZWl2ZXIgJyArIEVTLlRvU3RyaW5nKG1hcCkpO1xuICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICB2YXIgTWFwSXRlcmF0b3IgPSBmdW5jdGlvbiBNYXBJdGVyYXRvcihtYXAsIGtpbmQpIHtcbiAgICAgICAgICByZXF1aXJlTWFwU2xvdChtYXAsICdbW01hcEl0ZXJhdG9yXV0nKTtcbiAgICAgICAgICB0aGlzLmhlYWQgPSBtYXAuX2hlYWQ7XG4gICAgICAgICAgdGhpcy5pID0gdGhpcy5oZWFkO1xuICAgICAgICAgIHRoaXMua2luZCA9IGtpbmQ7XG4gICAgICAgIH07XG5cbiAgICAgICAgTWFwSXRlcmF0b3IucHJvdG90eXBlID0ge1xuICAgICAgICAgIG5leHQ6IGZ1bmN0aW9uIG5leHQoKSB7XG4gICAgICAgICAgICB2YXIgaSA9IHRoaXMuaSwga2luZCA9IHRoaXMua2luZCwgaGVhZCA9IHRoaXMuaGVhZCwgcmVzdWx0O1xuICAgICAgICAgICAgaWYgKHR5cGVvZiB0aGlzLmkgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgIHJldHVybiB7IHZhbHVlOiB2b2lkIDAsIGRvbmU6IHRydWUgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHdoaWxlIChpLmlzUmVtb3ZlZCgpICYmIGkgIT09IGhlYWQpIHtcbiAgICAgICAgICAgICAgLy8gYmFjayB1cCBvZmYgb2YgcmVtb3ZlZCBlbnRyaWVzXG4gICAgICAgICAgICAgIGkgPSBpLnByZXY7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBhZHZhbmNlIHRvIG5leHQgdW5yZXR1cm5lZCBlbGVtZW50LlxuICAgICAgICAgICAgd2hpbGUgKGkubmV4dCAhPT0gaGVhZCkge1xuICAgICAgICAgICAgICBpID0gaS5uZXh0O1xuICAgICAgICAgICAgICBpZiAoIWkuaXNSZW1vdmVkKCkpIHtcbiAgICAgICAgICAgICAgICBpZiAoa2luZCA9PT0gJ2tleScpIHtcbiAgICAgICAgICAgICAgICAgIHJlc3VsdCA9IGkua2V5O1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoa2luZCA9PT0gJ3ZhbHVlJykge1xuICAgICAgICAgICAgICAgICAgcmVzdWx0ID0gaS52YWx1ZTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgcmVzdWx0ID0gW2kua2V5LCBpLnZhbHVlXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdGhpcy5pID0gaTtcbiAgICAgICAgICAgICAgICByZXR1cm4geyB2YWx1ZTogcmVzdWx0LCBkb25lOiBmYWxzZSB9O1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBvbmNlIHRoZSBpdGVyYXRvciBpcyBkb25lLCBpdCBpcyBkb25lIGZvcmV2ZXIuXG4gICAgICAgICAgICB0aGlzLmkgPSB2b2lkIDA7XG4gICAgICAgICAgICByZXR1cm4geyB2YWx1ZTogdm9pZCAwLCBkb25lOiB0cnVlIH07XG4gICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgICBhZGRJdGVyYXRvcihNYXBJdGVyYXRvci5wcm90b3R5cGUpO1xuXG4gICAgICAgIHZhciBNYXAkcHJvdG90eXBlO1xuICAgICAgICB2YXIgTWFwU2hpbSA9IGZ1bmN0aW9uIE1hcCgpIHtcbiAgICAgICAgICBpZiAoISh0aGlzIGluc3RhbmNlb2YgTWFwKSkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignQ29uc3RydWN0b3IgTWFwIHJlcXVpcmVzIFwibmV3XCInKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKHRoaXMgJiYgdGhpcy5fZXM2bWFwKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdCYWQgY29uc3RydWN0aW9uJyk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHZhciBtYXAgPSBlbXVsYXRlRVM2Y29uc3RydWN0KHRoaXMsIE1hcCwgTWFwJHByb3RvdHlwZSwge1xuICAgICAgICAgICAgX2VzNm1hcDogdHJ1ZSxcbiAgICAgICAgICAgIF9oZWFkOiBudWxsLFxuICAgICAgICAgICAgX3N0b3JhZ2U6IGVtcHR5T2JqZWN0KCksXG4gICAgICAgICAgICBfc2l6ZTogMFxuICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgdmFyIGhlYWQgPSBuZXcgTWFwRW50cnkobnVsbCwgbnVsbCk7XG4gICAgICAgICAgLy8gY2lyY3VsYXIgZG91Ymx5LWxpbmtlZCBsaXN0LlxuICAgICAgICAgIGhlYWQubmV4dCA9IGhlYWQucHJldiA9IGhlYWQ7XG4gICAgICAgICAgbWFwLl9oZWFkID0gaGVhZDtcblxuICAgICAgICAgIC8vIE9wdGlvbmFsbHkgaW5pdGlhbGl6ZSBtYXAgZnJvbSBpdGVyYWJsZVxuICAgICAgICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgYWRkSXRlcmFibGVUb01hcChNYXAsIG1hcCwgYXJndW1lbnRzWzBdKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIG1hcDtcbiAgICAgICAgfTtcbiAgICAgICAgTWFwJHByb3RvdHlwZSA9IE1hcFNoaW0ucHJvdG90eXBlO1xuXG4gICAgICAgIFZhbHVlLmdldHRlcihNYXAkcHJvdG90eXBlLCAnc2l6ZScsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICBpZiAodHlwZW9mIHRoaXMuX3NpemUgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdzaXplIG1ldGhvZCBjYWxsZWQgb24gaW5jb21wYXRpYmxlIE1hcCcpO1xuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4gdGhpcy5fc2l6ZTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgZGVmaW5lUHJvcGVydGllcyhNYXAkcHJvdG90eXBlLCB7XG4gICAgICAgICAgZ2V0OiBmdW5jdGlvbiBnZXQoa2V5KSB7XG4gICAgICAgICAgICByZXF1aXJlTWFwU2xvdCh0aGlzLCAnZ2V0Jyk7XG4gICAgICAgICAgICB2YXIgZmtleSA9IGZhc3RrZXkoa2V5KTtcbiAgICAgICAgICAgIGlmIChma2V5ICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgIC8vIGZhc3QgTygxKSBwYXRoXG4gICAgICAgICAgICAgIHZhciBlbnRyeSA9IHRoaXMuX3N0b3JhZ2VbZmtleV07XG4gICAgICAgICAgICAgIGlmIChlbnRyeSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBlbnRyeS52YWx1ZTtcbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhciBoZWFkID0gdGhpcy5faGVhZCwgaSA9IGhlYWQ7XG4gICAgICAgICAgICB3aGlsZSAoKGkgPSBpLm5leHQpICE9PSBoZWFkKSB7XG4gICAgICAgICAgICAgIGlmIChFUy5TYW1lVmFsdWVaZXJvKGkua2V5LCBrZXkpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGkudmFsdWU7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9LFxuXG4gICAgICAgICAgaGFzOiBmdW5jdGlvbiBoYXMoa2V5KSB7XG4gICAgICAgICAgICByZXF1aXJlTWFwU2xvdCh0aGlzLCAnaGFzJyk7XG4gICAgICAgICAgICB2YXIgZmtleSA9IGZhc3RrZXkoa2V5KTtcbiAgICAgICAgICAgIGlmIChma2V5ICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgIC8vIGZhc3QgTygxKSBwYXRoXG4gICAgICAgICAgICAgIHJldHVybiB0eXBlb2YgdGhpcy5fc3RvcmFnZVtma2V5XSAhPT0gJ3VuZGVmaW5lZCc7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2YXIgaGVhZCA9IHRoaXMuX2hlYWQsIGkgPSBoZWFkO1xuICAgICAgICAgICAgd2hpbGUgKChpID0gaS5uZXh0KSAhPT0gaGVhZCkge1xuICAgICAgICAgICAgICBpZiAoRVMuU2FtZVZhbHVlWmVybyhpLmtleSwga2V5KSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgfSxcblxuICAgICAgICAgIHNldDogZnVuY3Rpb24gc2V0KGtleSwgdmFsdWUpIHtcbiAgICAgICAgICAgIHJlcXVpcmVNYXBTbG90KHRoaXMsICdzZXQnKTtcbiAgICAgICAgICAgIHZhciBoZWFkID0gdGhpcy5faGVhZCwgaSA9IGhlYWQsIGVudHJ5O1xuICAgICAgICAgICAgdmFyIGZrZXkgPSBmYXN0a2V5KGtleSk7XG4gICAgICAgICAgICBpZiAoZmtleSAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICAvLyBmYXN0IE8oMSkgcGF0aFxuICAgICAgICAgICAgICBpZiAodHlwZW9mIHRoaXMuX3N0b3JhZ2VbZmtleV0gIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fc3RvcmFnZVtma2V5XS52YWx1ZSA9IHZhbHVlO1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGVudHJ5ID0gdGhpcy5fc3RvcmFnZVtma2V5XSA9IG5ldyBNYXBFbnRyeShrZXksIHZhbHVlKTtcbiAgICAgICAgICAgICAgICBpID0gaGVhZC5wcmV2O1xuICAgICAgICAgICAgICAgIC8vIGZhbGwgdGhyb3VnaFxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB3aGlsZSAoKGkgPSBpLm5leHQpICE9PSBoZWFkKSB7XG4gICAgICAgICAgICAgIGlmIChFUy5TYW1lVmFsdWVaZXJvKGkua2V5LCBrZXkpKSB7XG4gICAgICAgICAgICAgICAgaS52YWx1ZSA9IHZhbHVlO1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbnRyeSA9IGVudHJ5IHx8IG5ldyBNYXBFbnRyeShrZXksIHZhbHVlKTtcbiAgICAgICAgICAgIGlmIChFUy5TYW1lVmFsdWUoLTAsIGtleSkpIHtcbiAgICAgICAgICAgICAgZW50cnkua2V5ID0gKzA7IC8vIGNvZXJjZSAtMCB0byArMCBpbiBlbnRyeVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZW50cnkubmV4dCA9IHRoaXMuX2hlYWQ7XG4gICAgICAgICAgICBlbnRyeS5wcmV2ID0gdGhpcy5faGVhZC5wcmV2O1xuICAgICAgICAgICAgZW50cnkucHJldi5uZXh0ID0gZW50cnk7XG4gICAgICAgICAgICBlbnRyeS5uZXh0LnByZXYgPSBlbnRyeTtcbiAgICAgICAgICAgIHRoaXMuX3NpemUgKz0gMTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICAgIH0sXG5cbiAgICAgICAgICAnZGVsZXRlJzogZnVuY3Rpb24gKGtleSkge1xuICAgICAgICAgICAgcmVxdWlyZU1hcFNsb3QodGhpcywgJ2RlbGV0ZScpO1xuICAgICAgICAgICAgdmFyIGhlYWQgPSB0aGlzLl9oZWFkLCBpID0gaGVhZDtcbiAgICAgICAgICAgIHZhciBma2V5ID0gZmFzdGtleShrZXkpO1xuICAgICAgICAgICAgaWYgKGZrZXkgIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgLy8gZmFzdCBPKDEpIHBhdGhcbiAgICAgICAgICAgICAgaWYgKHR5cGVvZiB0aGlzLl9zdG9yYWdlW2ZrZXldID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBpID0gdGhpcy5fc3RvcmFnZVtma2V5XS5wcmV2O1xuICAgICAgICAgICAgICBkZWxldGUgdGhpcy5fc3RvcmFnZVtma2V5XTtcbiAgICAgICAgICAgICAgLy8gZmFsbCB0aHJvdWdoXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB3aGlsZSAoKGkgPSBpLm5leHQpICE9PSBoZWFkKSB7XG4gICAgICAgICAgICAgIGlmIChFUy5TYW1lVmFsdWVaZXJvKGkua2V5LCBrZXkpKSB7XG4gICAgICAgICAgICAgICAgaS5rZXkgPSBpLnZhbHVlID0gZW1wdHk7XG4gICAgICAgICAgICAgICAgaS5wcmV2Lm5leHQgPSBpLm5leHQ7XG4gICAgICAgICAgICAgICAgaS5uZXh0LnByZXYgPSBpLnByZXY7XG4gICAgICAgICAgICAgICAgdGhpcy5fc2l6ZSAtPSAxO1xuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgfSxcblxuICAgICAgICAgIGNsZWFyOiBmdW5jdGlvbiBjbGVhcigpIHtcbiAgICAgICAgICAgIHJlcXVpcmVNYXBTbG90KHRoaXMsICdjbGVhcicpO1xuICAgICAgICAgICAgdGhpcy5fc2l6ZSA9IDA7XG4gICAgICAgICAgICB0aGlzLl9zdG9yYWdlID0gZW1wdHlPYmplY3QoKTtcbiAgICAgICAgICAgIHZhciBoZWFkID0gdGhpcy5faGVhZCwgaSA9IGhlYWQsIHAgPSBpLm5leHQ7XG4gICAgICAgICAgICB3aGlsZSAoKGkgPSBwKSAhPT0gaGVhZCkge1xuICAgICAgICAgICAgICBpLmtleSA9IGkudmFsdWUgPSBlbXB0eTtcbiAgICAgICAgICAgICAgcCA9IGkubmV4dDtcbiAgICAgICAgICAgICAgaS5uZXh0ID0gaS5wcmV2ID0gaGVhZDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGhlYWQubmV4dCA9IGhlYWQucHJldiA9IGhlYWQ7XG4gICAgICAgICAgfSxcblxuICAgICAgICAgIGtleXM6IGZ1bmN0aW9uIGtleXMoKSB7XG4gICAgICAgICAgICByZXF1aXJlTWFwU2xvdCh0aGlzLCAna2V5cycpO1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBNYXBJdGVyYXRvcih0aGlzLCAna2V5Jyk7XG4gICAgICAgICAgfSxcblxuICAgICAgICAgIHZhbHVlczogZnVuY3Rpb24gdmFsdWVzKCkge1xuICAgICAgICAgICAgcmVxdWlyZU1hcFNsb3QodGhpcywgJ3ZhbHVlcycpO1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBNYXBJdGVyYXRvcih0aGlzLCAndmFsdWUnKTtcbiAgICAgICAgICB9LFxuXG4gICAgICAgICAgZW50cmllczogZnVuY3Rpb24gZW50cmllcygpIHtcbiAgICAgICAgICAgIHJlcXVpcmVNYXBTbG90KHRoaXMsICdlbnRyaWVzJyk7XG4gICAgICAgICAgICByZXR1cm4gbmV3IE1hcEl0ZXJhdG9yKHRoaXMsICdrZXkrdmFsdWUnKTtcbiAgICAgICAgICB9LFxuXG4gICAgICAgICAgZm9yRWFjaDogZnVuY3Rpb24gZm9yRWFjaChjYWxsYmFjaykge1xuICAgICAgICAgICAgcmVxdWlyZU1hcFNsb3QodGhpcywgJ2ZvckVhY2gnKTtcbiAgICAgICAgICAgIHZhciBjb250ZXh0ID0gYXJndW1lbnRzLmxlbmd0aCA+IDEgPyBhcmd1bWVudHNbMV0gOiBudWxsO1xuICAgICAgICAgICAgdmFyIGl0ID0gdGhpcy5lbnRyaWVzKCk7XG4gICAgICAgICAgICBmb3IgKHZhciBlbnRyeSA9IGl0Lm5leHQoKTsgIWVudHJ5LmRvbmU7IGVudHJ5ID0gaXQubmV4dCgpKSB7XG4gICAgICAgICAgICAgIGlmIChjb250ZXh0KSB7XG4gICAgICAgICAgICAgICAgX2NhbGwoY2FsbGJhY2ssIGNvbnRleHQsIGVudHJ5LnZhbHVlWzFdLCBlbnRyeS52YWx1ZVswXSwgdGhpcyk7XG4gICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZW50cnkudmFsdWVbMV0sIGVudHJ5LnZhbHVlWzBdLCB0aGlzKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIGFkZEl0ZXJhdG9yKE1hcCRwcm90b3R5cGUsIE1hcCRwcm90b3R5cGUuZW50cmllcyk7XG5cbiAgICAgICAgcmV0dXJuIE1hcFNoaW07XG4gICAgICB9KCkpLFxuXG4gICAgICBTZXQ6IChmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBpc1NldCA9IGZ1bmN0aW9uIGlzU2V0KHNldCkge1xuICAgICAgICAgIHJldHVybiBzZXQuX2VzNnNldCAmJiB0eXBlb2Ygc2V0Ll9zdG9yYWdlICE9PSAndW5kZWZpbmVkJztcbiAgICAgICAgfTtcbiAgICAgICAgdmFyIHJlcXVpcmVTZXRTbG90ID0gZnVuY3Rpb24gcmVxdWlyZVNldFNsb3Qoc2V0LCBtZXRob2QpIHtcbiAgICAgICAgICBpZiAoIUVTLlR5cGVJc09iamVjdChzZXQpIHx8ICFpc1NldChzZXQpKSB7XG4gICAgICAgICAgICAvLyBodHRwczovL2dpdGh1Yi5jb20vcGF1bG1pbGxyL2VzNi1zaGltL2lzc3Vlcy8xNzZcbiAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1NldC5wcm90b3R5cGUuJyArIG1ldGhvZCArICcgY2FsbGVkIG9uIGluY29tcGF0aWJsZSByZWNlaXZlciAnICsgRVMuVG9TdHJpbmcoc2V0KSk7XG4gICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIC8vIENyZWF0aW5nIGEgTWFwIGlzIGV4cGVuc2l2ZS4gIFRvIHNwZWVkIHVwIHRoZSBjb21tb24gY2FzZSBvZlxuICAgICAgICAvLyBTZXRzIGNvbnRhaW5pbmcgb25seSBzdHJpbmcgb3IgbnVtZXJpYyBrZXlzLCB3ZSB1c2UgYW4gb2JqZWN0XG4gICAgICAgIC8vIGFzIGJhY2tpbmcgc3RvcmFnZSBhbmQgbGF6aWx5IGNyZWF0ZSBhIGZ1bGwgTWFwIG9ubHkgd2hlblxuICAgICAgICAvLyByZXF1aXJlZC5cbiAgICAgICAgdmFyIFNldCRwcm90b3R5cGU7XG4gICAgICAgIHZhciBTZXRTaGltID0gZnVuY3Rpb24gU2V0KCkge1xuICAgICAgICAgIGlmICghKHRoaXMgaW5zdGFuY2VvZiBTZXQpKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdDb25zdHJ1Y3RvciBTZXQgcmVxdWlyZXMgXCJuZXdcIicpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAodGhpcyAmJiB0aGlzLl9lczZzZXQpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0JhZCBjb25zdHJ1Y3Rpb24nKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgdmFyIHNldCA9IGVtdWxhdGVFUzZjb25zdHJ1Y3QodGhpcywgU2V0LCBTZXQkcHJvdG90eXBlLCB7XG4gICAgICAgICAgICBfZXM2c2V0OiB0cnVlLFxuICAgICAgICAgICAgJ1tbU2V0RGF0YV1dJzogbnVsbCxcbiAgICAgICAgICAgIF9zdG9yYWdlOiBlbXB0eU9iamVjdCgpXG4gICAgICAgICAgfSk7XG4gICAgICAgICAgaWYgKCFzZXQuX2VzNnNldCkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignYmFkIHNldCcpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIC8vIE9wdGlvbmFsbHkgaW5pdGlhbGl6ZSBTZXQgZnJvbSBpdGVyYWJsZVxuICAgICAgICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgYWRkSXRlcmFibGVUb1NldChTZXQsIHNldCwgYXJndW1lbnRzWzBdKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIHNldDtcbiAgICAgICAgfTtcbiAgICAgICAgU2V0JHByb3RvdHlwZSA9IFNldFNoaW0ucHJvdG90eXBlO1xuXG4gICAgICAgIHZhciBkZWNvZGVLZXkgPSBmdW5jdGlvbiAoa2V5KSB7XG4gICAgICAgICAgdmFyIGsgPSBrZXk7XG4gICAgICAgICAgaWYgKGsgPT09ICdebnVsbCcpIHtcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgIH0gZWxzZSBpZiAoayA9PT0gJ151bmRlZmluZWQnKSB7XG4gICAgICAgICAgICByZXR1cm4gdm9pZCAwO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB2YXIgZmlyc3QgPSBrLmNoYXJBdCgwKTtcbiAgICAgICAgICAgIGlmIChmaXJzdCA9PT0gJyQnKSB7XG4gICAgICAgICAgICAgIHJldHVybiBfc3RyU2xpY2UoaywgMSk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGZpcnN0ID09PSAnbicpIHtcbiAgICAgICAgICAgICAgcmV0dXJuICtfc3RyU2xpY2UoaywgMSk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGZpcnN0ID09PSAnYicpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIGsgPT09ICdidHJ1ZSc7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiAraztcbiAgICAgICAgfTtcbiAgICAgICAgLy8gU3dpdGNoIGZyb20gdGhlIG9iamVjdCBiYWNraW5nIHN0b3JhZ2UgdG8gYSBmdWxsIE1hcC5cbiAgICAgICAgdmFyIGVuc3VyZU1hcCA9IGZ1bmN0aW9uIGVuc3VyZU1hcChzZXQpIHtcbiAgICAgICAgICBpZiAoIXNldFsnW1tTZXREYXRhXV0nXSkge1xuICAgICAgICAgICAgdmFyIG0gPSBzZXRbJ1tbU2V0RGF0YV1dJ10gPSBuZXcgY29sbGVjdGlvblNoaW1zLk1hcCgpO1xuICAgICAgICAgICAgX2ZvckVhY2goa2V5cyhzZXQuX3N0b3JhZ2UpLCBmdW5jdGlvbiAoa2V5KSB7XG4gICAgICAgICAgICAgIHZhciBrID0gZGVjb2RlS2V5KGtleSk7XG4gICAgICAgICAgICAgIG0uc2V0KGssIGspO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBzZXRbJ1tbU2V0RGF0YV1dJ10gPSBtO1xuICAgICAgICAgIH1cbiAgICAgICAgICBzZXQuX3N0b3JhZ2UgPSBudWxsOyAvLyBmcmVlIG9sZCBiYWNraW5nIHN0b3JhZ2VcbiAgICAgICAgfTtcblxuICAgICAgICBWYWx1ZS5nZXR0ZXIoU2V0U2hpbS5wcm90b3R5cGUsICdzaXplJywgZnVuY3Rpb24gKCkge1xuICAgICAgICAgIHJlcXVpcmVTZXRTbG90KHRoaXMsICdzaXplJyk7XG4gICAgICAgICAgaWYgKHRoaXMuX3N0b3JhZ2UpIHtcbiAgICAgICAgICAgIHJldHVybiBrZXlzKHRoaXMuX3N0b3JhZ2UpLmxlbmd0aDtcbiAgICAgICAgICB9XG4gICAgICAgICAgZW5zdXJlTWFwKHRoaXMpO1xuICAgICAgICAgIHJldHVybiB0aGlzWydbW1NldERhdGFdXSddLnNpemU7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGRlZmluZVByb3BlcnRpZXMoU2V0U2hpbS5wcm90b3R5cGUsIHtcbiAgICAgICAgICBoYXM6IGZ1bmN0aW9uIGhhcyhrZXkpIHtcbiAgICAgICAgICAgIHJlcXVpcmVTZXRTbG90KHRoaXMsICdoYXMnKTtcbiAgICAgICAgICAgIHZhciBma2V5O1xuICAgICAgICAgICAgaWYgKHRoaXMuX3N0b3JhZ2UgJiYgKGZrZXkgPSBmYXN0a2V5KGtleSkpICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgIHJldHVybiAhIXRoaXMuX3N0b3JhZ2VbZmtleV07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbnN1cmVNYXAodGhpcyk7XG4gICAgICAgICAgICByZXR1cm4gdGhpc1snW1tTZXREYXRhXV0nXS5oYXMoa2V5KTtcbiAgICAgICAgICB9LFxuXG4gICAgICAgICAgYWRkOiBmdW5jdGlvbiBhZGQoa2V5KSB7XG4gICAgICAgICAgICByZXF1aXJlU2V0U2xvdCh0aGlzLCAnYWRkJyk7XG4gICAgICAgICAgICB2YXIgZmtleTtcbiAgICAgICAgICAgIGlmICh0aGlzLl9zdG9yYWdlICYmIChma2V5ID0gZmFzdGtleShrZXkpKSAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICB0aGlzLl9zdG9yYWdlW2ZrZXldID0gdHJ1ZTtcbiAgICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbnN1cmVNYXAodGhpcyk7XG4gICAgICAgICAgICB0aGlzWydbW1NldERhdGFdXSddLnNldChrZXksIGtleSk7XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgICB9LFxuXG4gICAgICAgICAgJ2RlbGV0ZSc6IGZ1bmN0aW9uIChrZXkpIHtcbiAgICAgICAgICAgIHJlcXVpcmVTZXRTbG90KHRoaXMsICdkZWxldGUnKTtcbiAgICAgICAgICAgIHZhciBma2V5O1xuICAgICAgICAgICAgaWYgKHRoaXMuX3N0b3JhZ2UgJiYgKGZrZXkgPSBmYXN0a2V5KGtleSkpICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgIHZhciBoYXNGS2V5ID0gX2hhc093blByb3BlcnR5KHRoaXMuX3N0b3JhZ2UsIGZrZXkpO1xuICAgICAgICAgICAgICByZXR1cm4gKGRlbGV0ZSB0aGlzLl9zdG9yYWdlW2ZrZXldKSAmJiBoYXNGS2V5O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZW5zdXJlTWFwKHRoaXMpO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXNbJ1tbU2V0RGF0YV1dJ11bJ2RlbGV0ZSddKGtleSk7XG4gICAgICAgICAgfSxcblxuICAgICAgICAgIGNsZWFyOiBmdW5jdGlvbiBjbGVhcigpIHtcbiAgICAgICAgICAgIHJlcXVpcmVTZXRTbG90KHRoaXMsICdjbGVhcicpO1xuICAgICAgICAgICAgaWYgKHRoaXMuX3N0b3JhZ2UpIHtcbiAgICAgICAgICAgICAgdGhpcy5fc3RvcmFnZSA9IGVtcHR5T2JqZWN0KCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodGhpc1snW1tTZXREYXRhXV0nXSkge1xuICAgICAgICAgICAgICB0aGlzWydbW1NldERhdGFdXSddLmNsZWFyKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSxcblxuICAgICAgICAgIHZhbHVlczogZnVuY3Rpb24gdmFsdWVzKCkge1xuICAgICAgICAgICAgcmVxdWlyZVNldFNsb3QodGhpcywgJ3ZhbHVlcycpO1xuICAgICAgICAgICAgZW5zdXJlTWFwKHRoaXMpO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXNbJ1tbU2V0RGF0YV1dJ10udmFsdWVzKCk7XG4gICAgICAgICAgfSxcblxuICAgICAgICAgIGVudHJpZXM6IGZ1bmN0aW9uIGVudHJpZXMoKSB7XG4gICAgICAgICAgICByZXF1aXJlU2V0U2xvdCh0aGlzLCAnZW50cmllcycpO1xuICAgICAgICAgICAgZW5zdXJlTWFwKHRoaXMpO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXNbJ1tbU2V0RGF0YV1dJ10uZW50cmllcygpO1xuICAgICAgICAgIH0sXG5cbiAgICAgICAgICBmb3JFYWNoOiBmdW5jdGlvbiBmb3JFYWNoKGNhbGxiYWNrKSB7XG4gICAgICAgICAgICByZXF1aXJlU2V0U2xvdCh0aGlzLCAnZm9yRWFjaCcpO1xuICAgICAgICAgICAgdmFyIGNvbnRleHQgPSBhcmd1bWVudHMubGVuZ3RoID4gMSA/IGFyZ3VtZW50c1sxXSA6IG51bGw7XG4gICAgICAgICAgICB2YXIgZW50aXJlU2V0ID0gdGhpcztcbiAgICAgICAgICAgIGVuc3VyZU1hcChlbnRpcmVTZXQpO1xuICAgICAgICAgICAgdGhpc1snW1tTZXREYXRhXV0nXS5mb3JFYWNoKGZ1bmN0aW9uICh2YWx1ZSwga2V5KSB7XG4gICAgICAgICAgICAgIGlmIChjb250ZXh0KSB7XG4gICAgICAgICAgICAgICAgX2NhbGwoY2FsbGJhY2ssIGNvbnRleHQsIGtleSwga2V5LCBlbnRpcmVTZXQpO1xuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGtleSwga2V5LCBlbnRpcmVTZXQpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBkZWZpbmVQcm9wZXJ0eShTZXRTaGltLnByb3RvdHlwZSwgJ2tleXMnLCBTZXRTaGltLnByb3RvdHlwZS52YWx1ZXMsIHRydWUpO1xuICAgICAgICBhZGRJdGVyYXRvcihTZXRTaGltLnByb3RvdHlwZSwgU2V0U2hpbS5wcm90b3R5cGUudmFsdWVzKTtcblxuICAgICAgICByZXR1cm4gU2V0U2hpbTtcbiAgICAgIH0oKSlcbiAgICB9O1xuXG4gICAgaWYgKGdsb2JhbHMuTWFwIHx8IGdsb2JhbHMuU2V0KSB7XG4gICAgICAvLyBTYWZhcmkgOCwgZm9yIGV4YW1wbGUsIGRvZXNuJ3QgYWNjZXB0IGFuIGl0ZXJhYmxlLlxuICAgICAgdmFyIG1hcEFjY2VwdHNBcmd1bWVudHMgPSB2YWx1ZU9yRmFsc2VJZlRocm93cyhmdW5jdGlvbiAoKSB7IHJldHVybiBuZXcgTWFwKFtbMSwgMl1dKS5nZXQoMSkgPT09IDI7IH0pO1xuICAgICAgaWYgKCFtYXBBY2NlcHRzQXJndW1lbnRzKSB7XG4gICAgICAgIHZhciBPcmlnTWFwTm9BcmdzID0gZ2xvYmFscy5NYXA7XG4gICAgICAgIGdsb2JhbHMuTWFwID0gZnVuY3Rpb24gTWFwKCkge1xuICAgICAgICAgIGlmICghKHRoaXMgaW5zdGFuY2VvZiBNYXApKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdDb25zdHJ1Y3RvciBNYXAgcmVxdWlyZXMgXCJuZXdcIicpO1xuICAgICAgICAgIH1cbiAgICAgICAgICB2YXIgbSA9IG5ldyBPcmlnTWFwTm9BcmdzKCk7XG4gICAgICAgICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBhZGRJdGVyYWJsZVRvTWFwKE1hcCwgbSwgYXJndW1lbnRzWzBdKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgZGVsZXRlIG0uY29uc3RydWN0b3I7XG4gICAgICAgICAgT2JqZWN0LnNldFByb3RvdHlwZU9mKG0sIGdsb2JhbHMuTWFwLnByb3RvdHlwZSk7XG4gICAgICAgICAgcmV0dXJuIG07XG4gICAgICAgIH07XG4gICAgICAgIGdsb2JhbHMuTWFwLnByb3RvdHlwZSA9IGNyZWF0ZShPcmlnTWFwTm9BcmdzLnByb3RvdHlwZSk7XG4gICAgICAgIGRlZmluZVByb3BlcnR5KGdsb2JhbHMuTWFwLnByb3RvdHlwZSwgJ2NvbnN0cnVjdG9yJywgZ2xvYmFscy5NYXAsIHRydWUpO1xuICAgICAgICBWYWx1ZS5wcmVzZXJ2ZVRvU3RyaW5nKGdsb2JhbHMuTWFwLCBPcmlnTWFwTm9BcmdzKTtcbiAgICAgIH1cbiAgICAgIHZhciB0ZXN0TWFwID0gbmV3IE1hcCgpO1xuICAgICAgdmFyIG1hcFVzZXNTYW1lVmFsdWVaZXJvID0gKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgLy8gQ2hyb21lIDM4LTQyLCBub2RlIDAuMTEvMC4xMiwgaW9qcyAxLzIgYWxzbyBoYXZlIGEgYnVnIHdoZW4gdGhlIE1hcCBoYXMgYSBzaXplID4gNFxuICAgICAgICB2YXIgbSA9IG5ldyBNYXAoW1sxLCAwXSwgWzIsIDBdLCBbMywgMF0sIFs0LCAwXV0pO1xuICAgICAgICBtLnNldCgtMCwgbSk7XG4gICAgICAgIHJldHVybiBtLmdldCgwKSA9PT0gbSAmJiBtLmdldCgtMCkgPT09IG0gJiYgbS5oYXMoMCkgJiYgbS5oYXMoLTApO1xuICAgICAgfSgpKTtcbiAgICAgIHZhciBtYXBTdXBwb3J0c0NoYWluaW5nID0gdGVzdE1hcC5zZXQoMSwgMikgPT09IHRlc3RNYXA7XG4gICAgICBpZiAoIW1hcFVzZXNTYW1lVmFsdWVaZXJvIHx8ICFtYXBTdXBwb3J0c0NoYWluaW5nKSB7XG4gICAgICAgIHZhciBvcmlnTWFwU2V0ID0gTWFwLnByb3RvdHlwZS5zZXQ7XG4gICAgICAgIG92ZXJyaWRlTmF0aXZlKE1hcC5wcm90b3R5cGUsICdzZXQnLCBmdW5jdGlvbiBzZXQoaywgdikge1xuICAgICAgICAgIF9jYWxsKG9yaWdNYXBTZXQsIHRoaXMsIGsgPT09IDAgPyAwIDogaywgdik7XG4gICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgICAgaWYgKCFtYXBVc2VzU2FtZVZhbHVlWmVybykge1xuICAgICAgICB2YXIgb3JpZ01hcEdldCA9IE1hcC5wcm90b3R5cGUuZ2V0O1xuICAgICAgICB2YXIgb3JpZ01hcEhhcyA9IE1hcC5wcm90b3R5cGUuaGFzO1xuICAgICAgICBkZWZpbmVQcm9wZXJ0aWVzKE1hcC5wcm90b3R5cGUsIHtcbiAgICAgICAgICBnZXQ6IGZ1bmN0aW9uIGdldChrKSB7XG4gICAgICAgICAgICByZXR1cm4gX2NhbGwob3JpZ01hcEdldCwgdGhpcywgayA9PT0gMCA/IDAgOiBrKTtcbiAgICAgICAgICB9LFxuICAgICAgICAgIGhhczogZnVuY3Rpb24gaGFzKGspIHtcbiAgICAgICAgICAgIHJldHVybiBfY2FsbChvcmlnTWFwSGFzLCB0aGlzLCBrID09PSAwID8gMCA6IGspO1xuICAgICAgICAgIH1cbiAgICAgICAgfSwgdHJ1ZSk7XG4gICAgICAgIFZhbHVlLnByZXNlcnZlVG9TdHJpbmcoTWFwLnByb3RvdHlwZS5nZXQsIG9yaWdNYXBHZXQpO1xuICAgICAgICBWYWx1ZS5wcmVzZXJ2ZVRvU3RyaW5nKE1hcC5wcm90b3R5cGUuaGFzLCBvcmlnTWFwSGFzKTtcbiAgICAgIH1cbiAgICAgIHZhciB0ZXN0U2V0ID0gbmV3IFNldCgpO1xuICAgICAgdmFyIHNldFVzZXNTYW1lVmFsdWVaZXJvID0gKGZ1bmN0aW9uIChzKSB7XG4gICAgICAgIHNbJ2RlbGV0ZSddKDApO1xuICAgICAgICBzLmFkZCgtMCk7XG4gICAgICAgIHJldHVybiAhcy5oYXMoMCk7XG4gICAgICB9KHRlc3RTZXQpKTtcbiAgICAgIHZhciBzZXRTdXBwb3J0c0NoYWluaW5nID0gdGVzdFNldC5hZGQoMSkgPT09IHRlc3RTZXQ7XG4gICAgICBpZiAoIXNldFVzZXNTYW1lVmFsdWVaZXJvIHx8ICFzZXRTdXBwb3J0c0NoYWluaW5nKSB7XG4gICAgICAgIHZhciBvcmlnU2V0QWRkID0gU2V0LnByb3RvdHlwZS5hZGQ7XG4gICAgICAgIFNldC5wcm90b3R5cGUuYWRkID0gZnVuY3Rpb24gYWRkKHYpIHtcbiAgICAgICAgICBfY2FsbChvcmlnU2V0QWRkLCB0aGlzLCB2ID09PSAwID8gMCA6IHYpO1xuICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9O1xuICAgICAgICBWYWx1ZS5wcmVzZXJ2ZVRvU3RyaW5nKFNldC5wcm90b3R5cGUuYWRkLCBvcmlnU2V0QWRkKTtcbiAgICAgIH1cbiAgICAgIGlmICghc2V0VXNlc1NhbWVWYWx1ZVplcm8pIHtcbiAgICAgICAgdmFyIG9yaWdTZXRIYXMgPSBTZXQucHJvdG90eXBlLmhhcztcbiAgICAgICAgU2V0LnByb3RvdHlwZS5oYXMgPSBmdW5jdGlvbiBoYXModikge1xuICAgICAgICAgIHJldHVybiBfY2FsbChvcmlnU2V0SGFzLCB0aGlzLCB2ID09PSAwID8gMCA6IHYpO1xuICAgICAgICB9O1xuICAgICAgICBWYWx1ZS5wcmVzZXJ2ZVRvU3RyaW5nKFNldC5wcm90b3R5cGUuaGFzLCBvcmlnU2V0SGFzKTtcbiAgICAgICAgdmFyIG9yaWdTZXREZWwgPSBTZXQucHJvdG90eXBlWydkZWxldGUnXTtcbiAgICAgICAgU2V0LnByb3RvdHlwZVsnZGVsZXRlJ10gPSBmdW5jdGlvbiBTZXREZWxldGUodikge1xuICAgICAgICAgIHJldHVybiBfY2FsbChvcmlnU2V0RGVsLCB0aGlzLCB2ID09PSAwID8gMCA6IHYpO1xuICAgICAgICB9O1xuICAgICAgICBWYWx1ZS5wcmVzZXJ2ZVRvU3RyaW5nKFNldC5wcm90b3R5cGVbJ2RlbGV0ZSddLCBvcmlnU2V0RGVsKTtcbiAgICAgIH1cbiAgICAgIHZhciBtYXBTdXBwb3J0c1N1YmNsYXNzaW5nID0gc3VwcG9ydHNTdWJjbGFzc2luZyhnbG9iYWxzLk1hcCwgZnVuY3Rpb24gKE0pIHtcbiAgICAgICAgdmFyIG0gPSBuZXcgTShbXSk7XG4gICAgICAgIC8vIEZpcmVmb3ggMzIgaXMgb2sgd2l0aCB0aGUgaW5zdGFudGlhdGluZyB0aGUgc3ViY2xhc3MgYnV0IHdpbGxcbiAgICAgICAgLy8gdGhyb3cgd2hlbiB0aGUgbWFwIGlzIHVzZWQuXG4gICAgICAgIG0uc2V0KDQyLCA0Mik7XG4gICAgICAgIHJldHVybiBtIGluc3RhbmNlb2YgTTtcbiAgICAgIH0pO1xuICAgICAgdmFyIG1hcEZhaWxzVG9TdXBwb3J0U3ViY2xhc3NpbmcgPSBPYmplY3Quc2V0UHJvdG90eXBlT2YgJiYgIW1hcFN1cHBvcnRzU3ViY2xhc3Npbmc7IC8vIHdpdGhvdXQgT2JqZWN0LnNldFByb3RvdHlwZU9mLCBzdWJjbGFzc2luZyBpcyBub3QgcG9zc2libGVcbiAgICAgIHZhciBtYXBSZXF1aXJlc05ldyA9IChmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgcmV0dXJuICEoZ2xvYmFscy5NYXAoKSBpbnN0YW5jZW9mIGdsb2JhbHMuTWFwKTtcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgIHJldHVybiBlIGluc3RhbmNlb2YgVHlwZUVycm9yO1xuICAgICAgICB9XG4gICAgICB9KCkpO1xuICAgICAgaWYgKGdsb2JhbHMuTWFwLmxlbmd0aCAhPT0gMCB8fCBtYXBGYWlsc1RvU3VwcG9ydFN1YmNsYXNzaW5nIHx8ICFtYXBSZXF1aXJlc05ldykge1xuICAgICAgICB2YXIgT3JpZ01hcCA9IGdsb2JhbHMuTWFwO1xuICAgICAgICBnbG9iYWxzLk1hcCA9IGZ1bmN0aW9uIE1hcCgpIHtcbiAgICAgICAgICBpZiAoISh0aGlzIGluc3RhbmNlb2YgTWFwKSkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignQ29uc3RydWN0b3IgTWFwIHJlcXVpcmVzIFwibmV3XCInKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgdmFyIG0gPSBuZXcgT3JpZ01hcCgpO1xuICAgICAgICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgYWRkSXRlcmFibGVUb01hcChNYXAsIG0sIGFyZ3VtZW50c1swXSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGRlbGV0ZSBtLmNvbnN0cnVjdG9yO1xuICAgICAgICAgIE9iamVjdC5zZXRQcm90b3R5cGVPZihtLCBNYXAucHJvdG90eXBlKTtcbiAgICAgICAgICByZXR1cm4gbTtcbiAgICAgICAgfTtcbiAgICAgICAgZ2xvYmFscy5NYXAucHJvdG90eXBlID0gT3JpZ01hcC5wcm90b3R5cGU7XG4gICAgICAgIGRlZmluZVByb3BlcnR5KGdsb2JhbHMuTWFwLnByb3RvdHlwZSwgJ2NvbnN0cnVjdG9yJywgZ2xvYmFscy5NYXAsIHRydWUpO1xuICAgICAgICBWYWx1ZS5wcmVzZXJ2ZVRvU3RyaW5nKGdsb2JhbHMuTWFwLCBPcmlnTWFwKTtcbiAgICAgIH1cbiAgICAgIHZhciBzZXRTdXBwb3J0c1N1YmNsYXNzaW5nID0gc3VwcG9ydHNTdWJjbGFzc2luZyhnbG9iYWxzLlNldCwgZnVuY3Rpb24gKFMpIHtcbiAgICAgICAgdmFyIHMgPSBuZXcgUyhbXSk7XG4gICAgICAgIHMuYWRkKDQyLCA0Mik7XG4gICAgICAgIHJldHVybiBzIGluc3RhbmNlb2YgUztcbiAgICAgIH0pO1xuICAgICAgdmFyIHNldEZhaWxzVG9TdXBwb3J0U3ViY2xhc3NpbmcgPSBPYmplY3Quc2V0UHJvdG90eXBlT2YgJiYgIXNldFN1cHBvcnRzU3ViY2xhc3Npbmc7IC8vIHdpdGhvdXQgT2JqZWN0LnNldFByb3RvdHlwZU9mLCBzdWJjbGFzc2luZyBpcyBub3QgcG9zc2libGVcbiAgICAgIHZhciBzZXRSZXF1aXJlc05ldyA9IChmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgcmV0dXJuICEoZ2xvYmFscy5TZXQoKSBpbnN0YW5jZW9mIGdsb2JhbHMuU2V0KTtcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgIHJldHVybiBlIGluc3RhbmNlb2YgVHlwZUVycm9yO1xuICAgICAgICB9XG4gICAgICB9KCkpO1xuICAgICAgaWYgKGdsb2JhbHMuU2V0Lmxlbmd0aCAhPT0gMCB8fCBzZXRGYWlsc1RvU3VwcG9ydFN1YmNsYXNzaW5nIHx8ICFzZXRSZXF1aXJlc05ldykge1xuICAgICAgICB2YXIgT3JpZ1NldCA9IGdsb2JhbHMuU2V0O1xuICAgICAgICBnbG9iYWxzLlNldCA9IGZ1bmN0aW9uIFNldCgpIHtcbiAgICAgICAgICBpZiAoISh0aGlzIGluc3RhbmNlb2YgU2V0KSkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignQ29uc3RydWN0b3IgU2V0IHJlcXVpcmVzIFwibmV3XCInKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgdmFyIHMgPSBuZXcgT3JpZ1NldCgpO1xuICAgICAgICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgYWRkSXRlcmFibGVUb1NldChTZXQsIHMsIGFyZ3VtZW50c1swXSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGRlbGV0ZSBzLmNvbnN0cnVjdG9yO1xuICAgICAgICAgIE9iamVjdC5zZXRQcm90b3R5cGVPZihzLCBTZXQucHJvdG90eXBlKTtcbiAgICAgICAgICByZXR1cm4gcztcbiAgICAgICAgfTtcbiAgICAgICAgZ2xvYmFscy5TZXQucHJvdG90eXBlID0gT3JpZ1NldC5wcm90b3R5cGU7XG4gICAgICAgIGRlZmluZVByb3BlcnR5KGdsb2JhbHMuU2V0LnByb3RvdHlwZSwgJ2NvbnN0cnVjdG9yJywgZ2xvYmFscy5TZXQsIHRydWUpO1xuICAgICAgICBWYWx1ZS5wcmVzZXJ2ZVRvU3RyaW5nKGdsb2JhbHMuU2V0LCBPcmlnU2V0KTtcbiAgICAgIH1cbiAgICAgIHZhciBtYXBJdGVyYXRpb25UaHJvd3NTdG9wSXRlcmF0b3IgPSAhdmFsdWVPckZhbHNlSWZUaHJvd3MoZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gKG5ldyBNYXAoKSkua2V5cygpLm5leHQoKS5kb25lO1xuICAgICAgfSk7XG4gICAgICAvKlxuICAgICAgICAtIEluIEZpcmVmb3ggPCAyMywgTWFwI3NpemUgaXMgYSBmdW5jdGlvbi5cbiAgICAgICAgLSBJbiBhbGwgY3VycmVudCBGaXJlZm94LCBTZXQjZW50cmllcy9rZXlzL3ZhbHVlcyAmIE1hcCNjbGVhciBkbyBub3QgZXhpc3RcbiAgICAgICAgLSBodHRwczovL2J1Z3ppbGxhLm1vemlsbGEub3JnL3Nob3dfYnVnLmNnaT9pZD04Njk5OTZcbiAgICAgICAgLSBJbiBGaXJlZm94IDI0LCBNYXAgYW5kIFNldCBkbyBub3QgaW1wbGVtZW50IGZvckVhY2hcbiAgICAgICAgLSBJbiBGaXJlZm94IDI1IGF0IGxlYXN0LCBNYXAgYW5kIFNldCBhcmUgY2FsbGFibGUgd2l0aG91dCBcIm5ld1wiXG4gICAgICAqL1xuICAgICAgaWYgKFxuICAgICAgICB0eXBlb2YgZ2xvYmFscy5NYXAucHJvdG90eXBlLmNsZWFyICE9PSAnZnVuY3Rpb24nIHx8XG4gICAgICAgIG5ldyBnbG9iYWxzLlNldCgpLnNpemUgIT09IDAgfHxcbiAgICAgICAgbmV3IGdsb2JhbHMuTWFwKCkuc2l6ZSAhPT0gMCB8fFxuICAgICAgICB0eXBlb2YgZ2xvYmFscy5NYXAucHJvdG90eXBlLmtleXMgIT09ICdmdW5jdGlvbicgfHxcbiAgICAgICAgdHlwZW9mIGdsb2JhbHMuU2V0LnByb3RvdHlwZS5rZXlzICE9PSAnZnVuY3Rpb24nIHx8XG4gICAgICAgIHR5cGVvZiBnbG9iYWxzLk1hcC5wcm90b3R5cGUuZm9yRWFjaCAhPT0gJ2Z1bmN0aW9uJyB8fFxuICAgICAgICB0eXBlb2YgZ2xvYmFscy5TZXQucHJvdG90eXBlLmZvckVhY2ggIT09ICdmdW5jdGlvbicgfHxcbiAgICAgICAgaXNDYWxsYWJsZVdpdGhvdXROZXcoZ2xvYmFscy5NYXApIHx8XG4gICAgICAgIGlzQ2FsbGFibGVXaXRob3V0TmV3KGdsb2JhbHMuU2V0KSB8fFxuICAgICAgICB0eXBlb2YgKG5ldyBnbG9iYWxzLk1hcCgpLmtleXMoKS5uZXh0KSAhPT0gJ2Z1bmN0aW9uJyB8fCAvLyBTYWZhcmkgOFxuICAgICAgICBtYXBJdGVyYXRpb25UaHJvd3NTdG9wSXRlcmF0b3IgfHwgLy8gRmlyZWZveCAyNVxuICAgICAgICAhbWFwU3VwcG9ydHNTdWJjbGFzc2luZ1xuICAgICAgKSB7XG4gICAgICAgIGRlZmluZVByb3BlcnRpZXMoZ2xvYmFscywge1xuICAgICAgICAgIE1hcDogY29sbGVjdGlvblNoaW1zLk1hcCxcbiAgICAgICAgICBTZXQ6IGNvbGxlY3Rpb25TaGltcy5TZXRcbiAgICAgICAgfSwgdHJ1ZSk7XG4gICAgICB9XG5cbiAgICAgIGlmIChnbG9iYWxzLlNldC5wcm90b3R5cGUua2V5cyAhPT0gZ2xvYmFscy5TZXQucHJvdG90eXBlLnZhbHVlcykge1xuICAgICAgICAvLyBGaXhlZCBpbiBXZWJLaXQgd2l0aCBodHRwczovL2J1Z3Mud2Via2l0Lm9yZy9zaG93X2J1Zy5jZ2k/aWQ9MTQ0MTkwXG4gICAgICAgIGRlZmluZVByb3BlcnR5KGdsb2JhbHMuU2V0LnByb3RvdHlwZSwgJ2tleXMnLCBnbG9iYWxzLlNldC5wcm90b3R5cGUudmFsdWVzLCB0cnVlKTtcbiAgICAgIH1cblxuICAgICAgLy8gU2hpbSBpbmNvbXBsZXRlIGl0ZXJhdG9yIGltcGxlbWVudGF0aW9ucy5cbiAgICAgIGFkZEl0ZXJhdG9yKE9iamVjdC5nZXRQcm90b3R5cGVPZigobmV3IGdsb2JhbHMuTWFwKCkpLmtleXMoKSkpO1xuICAgICAgYWRkSXRlcmF0b3IoT2JqZWN0LmdldFByb3RvdHlwZU9mKChuZXcgZ2xvYmFscy5TZXQoKSkua2V5cygpKSk7XG5cbiAgICAgIGlmIChmdW5jdGlvbnNIYXZlTmFtZXMgJiYgZ2xvYmFscy5TZXQucHJvdG90eXBlLmhhcy5uYW1lICE9PSAnaGFzJykge1xuICAgICAgICAvLyBNaWNyb3NvZnQgRWRnZSB2MC4xMS4xMDA3NC4wIGlzIG1pc3NpbmcgYSBuYW1lIG9uIFNldCNoYXNcbiAgICAgICAgdmFyIGFub255bW91c1NldEhhcyA9IGdsb2JhbHMuU2V0LnByb3RvdHlwZS5oYXM7XG4gICAgICAgIG92ZXJyaWRlTmF0aXZlKGdsb2JhbHMuU2V0LnByb3RvdHlwZSwgJ2hhcycsIGZ1bmN0aW9uIGhhcyhrZXkpIHtcbiAgICAgICAgICByZXR1cm4gX2NhbGwoYW5vbnltb3VzU2V0SGFzLCB0aGlzLCBrZXkpO1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9XG4gICAgZGVmaW5lUHJvcGVydGllcyhnbG9iYWxzLCBjb2xsZWN0aW9uU2hpbXMpO1xuICAgIGFkZERlZmF1bHRTcGVjaWVzKGdsb2JhbHMuTWFwKTtcbiAgICBhZGREZWZhdWx0U3BlY2llcyhnbG9iYWxzLlNldCk7XG4gIH1cblxuICB2YXIgdGhyb3dVbmxlc3NUYXJnZXRJc09iamVjdCA9IGZ1bmN0aW9uIHRocm93VW5sZXNzVGFyZ2V0SXNPYmplY3QodGFyZ2V0KSB7XG4gICAgaWYgKCFFUy5UeXBlSXNPYmplY3QodGFyZ2V0KSkge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcigndGFyZ2V0IG11c3QgYmUgYW4gb2JqZWN0Jyk7XG4gICAgfVxuICB9O1xuXG4gIC8vIFNvbWUgUmVmbGVjdCBtZXRob2RzIGFyZSBiYXNpY2FsbHkgdGhlIHNhbWUgYXNcbiAgLy8gdGhvc2Ugb24gdGhlIE9iamVjdCBnbG9iYWwsIGV4Y2VwdCB0aGF0IGEgVHlwZUVycm9yIGlzIHRocm93biBpZlxuICAvLyB0YXJnZXQgaXNuJ3QgYW4gb2JqZWN0LiBBcyB3ZWxsIGFzIHJldHVybmluZyBhIGJvb2xlYW4gaW5kaWNhdGluZ1xuICAvLyB0aGUgc3VjY2VzcyBvZiB0aGUgb3BlcmF0aW9uLlxuICB2YXIgUmVmbGVjdFNoaW1zID0ge1xuICAgIC8vIEFwcGx5IG1ldGhvZCBpbiBhIGZ1bmN0aW9uYWwgZm9ybS5cbiAgICBhcHBseTogZnVuY3Rpb24gYXBwbHkoKSB7XG4gICAgICByZXR1cm4gRVMuQ2FsbChFUy5DYWxsLCBudWxsLCBhcmd1bWVudHMpO1xuICAgIH0sXG5cbiAgICAvLyBOZXcgb3BlcmF0b3IgaW4gYSBmdW5jdGlvbmFsIGZvcm0uXG4gICAgY29uc3RydWN0OiBmdW5jdGlvbiBjb25zdHJ1Y3QoY29uc3RydWN0b3IsIGFyZ3MpIHtcbiAgICAgIGlmICghRVMuSXNDb25zdHJ1Y3Rvcihjb25zdHJ1Y3RvcikpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignRmlyc3QgYXJndW1lbnQgbXVzdCBiZSBhIGNvbnN0cnVjdG9yLicpO1xuICAgICAgfVxuICAgICAgdmFyIG5ld1RhcmdldCA9IGFyZ3VtZW50cy5sZW5ndGggPiAyID8gYXJndW1lbnRzWzJdIDogY29uc3RydWN0b3I7XG4gICAgICBpZiAoIUVTLklzQ29uc3RydWN0b3IobmV3VGFyZ2V0KSkge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCduZXcudGFyZ2V0IG11c3QgYmUgYSBjb25zdHJ1Y3Rvci4nKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBFUy5Db25zdHJ1Y3QoY29uc3RydWN0b3IsIGFyZ3MsIG5ld1RhcmdldCwgJ2ludGVybmFsJyk7XG4gICAgfSxcblxuICAgIC8vIFdoZW4gZGVsZXRpbmcgYSBub24tZXhpc3RlbnQgb3IgY29uZmlndXJhYmxlIHByb3BlcnR5LFxuICAgIC8vIHRydWUgaXMgcmV0dXJuZWQuXG4gICAgLy8gV2hlbiBhdHRlbXB0aW5nIHRvIGRlbGV0ZSBhIG5vbi1jb25maWd1cmFibGUgcHJvcGVydHksXG4gICAgLy8gaXQgd2lsbCByZXR1cm4gZmFsc2UuXG4gICAgZGVsZXRlUHJvcGVydHk6IGZ1bmN0aW9uIGRlbGV0ZVByb3BlcnR5KHRhcmdldCwga2V5KSB7XG4gICAgICB0aHJvd1VubGVzc1RhcmdldElzT2JqZWN0KHRhcmdldCk7XG4gICAgICBpZiAoc3VwcG9ydHNEZXNjcmlwdG9ycykge1xuICAgICAgICB2YXIgZGVzYyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IodGFyZ2V0LCBrZXkpO1xuXG4gICAgICAgIGlmIChkZXNjICYmICFkZXNjLmNvbmZpZ3VyYWJsZSkge1xuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICAvLyBXaWxsIHJldHVybiB0cnVlLlxuICAgICAgcmV0dXJuIGRlbGV0ZSB0YXJnZXRba2V5XTtcbiAgICB9LFxuXG4gICAgaGFzOiBmdW5jdGlvbiBoYXModGFyZ2V0LCBrZXkpIHtcbiAgICAgIHRocm93VW5sZXNzVGFyZ2V0SXNPYmplY3QodGFyZ2V0KTtcbiAgICAgIHJldHVybiBrZXkgaW4gdGFyZ2V0O1xuICAgIH1cbiAgfTtcblxuICBpZiAoT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXMpIHtcbiAgICBPYmplY3QuYXNzaWduKFJlZmxlY3RTaGltcywge1xuICAgICAgLy8gQmFzaWNhbGx5IHRoZSByZXN1bHQgb2YgY2FsbGluZyB0aGUgaW50ZXJuYWwgW1tPd25Qcm9wZXJ0eUtleXNdXS5cbiAgICAgIC8vIENvbmNhdGVuYXRpbmcgcHJvcGVydHlOYW1lcyBhbmQgcHJvcGVydHlTeW1ib2xzIHNob3VsZCBkbyB0aGUgdHJpY2suXG4gICAgICAvLyBUaGlzIHNob3VsZCBjb250aW51ZSB0byB3b3JrIHRvZ2V0aGVyIHdpdGggYSBTeW1ib2wgc2hpbVxuICAgICAgLy8gd2hpY2ggb3ZlcnJpZGVzIE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzIGFuZCBpbXBsZW1lbnRzXG4gICAgICAvLyBPYmplY3QuZ2V0T3duUHJvcGVydHlTeW1ib2xzLlxuICAgICAgb3duS2V5czogZnVuY3Rpb24gb3duS2V5cyh0YXJnZXQpIHtcbiAgICAgICAgdGhyb3dVbmxlc3NUYXJnZXRJc09iamVjdCh0YXJnZXQpO1xuICAgICAgICB2YXIga2V5cyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKHRhcmdldCk7XG5cbiAgICAgICAgaWYgKEVTLklzQ2FsbGFibGUoT2JqZWN0LmdldE93blByb3BlcnR5U3ltYm9scykpIHtcbiAgICAgICAgICBfcHVzaEFwcGx5KGtleXMsIE9iamVjdC5nZXRPd25Qcm9wZXJ0eVN5bWJvbHModGFyZ2V0KSk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4ga2V5cztcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIHZhciBjYWxsQW5kQ2F0Y2hFeGNlcHRpb24gPSBmdW5jdGlvbiBDb252ZXJ0RXhjZXB0aW9uVG9Cb29sZWFuKGZ1bmMpIHtcbiAgICByZXR1cm4gIXRocm93c0Vycm9yKGZ1bmMpO1xuICB9O1xuXG4gIGlmIChPYmplY3QucHJldmVudEV4dGVuc2lvbnMpIHtcbiAgICBPYmplY3QuYXNzaWduKFJlZmxlY3RTaGltcywge1xuICAgICAgaXNFeHRlbnNpYmxlOiBmdW5jdGlvbiBpc0V4dGVuc2libGUodGFyZ2V0KSB7XG4gICAgICAgIHRocm93VW5sZXNzVGFyZ2V0SXNPYmplY3QodGFyZ2V0KTtcbiAgICAgICAgcmV0dXJuIE9iamVjdC5pc0V4dGVuc2libGUodGFyZ2V0KTtcbiAgICAgIH0sXG4gICAgICBwcmV2ZW50RXh0ZW5zaW9uczogZnVuY3Rpb24gcHJldmVudEV4dGVuc2lvbnModGFyZ2V0KSB7XG4gICAgICAgIHRocm93VW5sZXNzVGFyZ2V0SXNPYmplY3QodGFyZ2V0KTtcbiAgICAgICAgcmV0dXJuIGNhbGxBbmRDYXRjaEV4Y2VwdGlvbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgT2JqZWN0LnByZXZlbnRFeHRlbnNpb25zKHRhcmdldCk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgaWYgKHN1cHBvcnRzRGVzY3JpcHRvcnMpIHtcbiAgICB2YXIgaW50ZXJuYWxHZXQgPSBmdW5jdGlvbiBnZXQodGFyZ2V0LCBrZXksIHJlY2VpdmVyKSB7XG4gICAgICB2YXIgZGVzYyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IodGFyZ2V0LCBrZXkpO1xuXG4gICAgICBpZiAoIWRlc2MpIHtcbiAgICAgICAgdmFyIHBhcmVudCA9IE9iamVjdC5nZXRQcm90b3R5cGVPZih0YXJnZXQpO1xuXG4gICAgICAgIGlmIChwYXJlbnQgPT09IG51bGwpIHtcbiAgICAgICAgICByZXR1cm4gdm9pZCAwO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGludGVybmFsR2V0KHBhcmVudCwga2V5LCByZWNlaXZlcik7XG4gICAgICB9XG5cbiAgICAgIGlmICgndmFsdWUnIGluIGRlc2MpIHtcbiAgICAgICAgcmV0dXJuIGRlc2MudmFsdWU7XG4gICAgICB9XG5cbiAgICAgIGlmIChkZXNjLmdldCkge1xuICAgICAgICByZXR1cm4gRVMuQ2FsbChkZXNjLmdldCwgcmVjZWl2ZXIpO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gdm9pZCAwO1xuICAgIH07XG5cbiAgICB2YXIgaW50ZXJuYWxTZXQgPSBmdW5jdGlvbiBzZXQodGFyZ2V0LCBrZXksIHZhbHVlLCByZWNlaXZlcikge1xuICAgICAgdmFyIGRlc2MgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKHRhcmdldCwga2V5KTtcblxuICAgICAgaWYgKCFkZXNjKSB7XG4gICAgICAgIHZhciBwYXJlbnQgPSBPYmplY3QuZ2V0UHJvdG90eXBlT2YodGFyZ2V0KTtcblxuICAgICAgICBpZiAocGFyZW50ICE9PSBudWxsKSB7XG4gICAgICAgICAgcmV0dXJuIGludGVybmFsU2V0KHBhcmVudCwga2V5LCB2YWx1ZSwgcmVjZWl2ZXIpO1xuICAgICAgICB9XG5cbiAgICAgICAgZGVzYyA9IHtcbiAgICAgICAgICB2YWx1ZTogdm9pZCAwLFxuICAgICAgICAgIHdyaXRhYmxlOiB0cnVlLFxuICAgICAgICAgIGVudW1lcmFibGU6IHRydWUsXG4gICAgICAgICAgY29uZmlndXJhYmxlOiB0cnVlXG4gICAgICAgIH07XG4gICAgICB9XG5cbiAgICAgIGlmICgndmFsdWUnIGluIGRlc2MpIHtcbiAgICAgICAgaWYgKCFkZXNjLndyaXRhYmxlKSB7XG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCFFUy5UeXBlSXNPYmplY3QocmVjZWl2ZXIpKSB7XG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIGV4aXN0aW5nRGVzYyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IocmVjZWl2ZXIsIGtleSk7XG5cbiAgICAgICAgaWYgKGV4aXN0aW5nRGVzYykge1xuICAgICAgICAgIHJldHVybiBSZWZsZWN0LmRlZmluZVByb3BlcnR5KHJlY2VpdmVyLCBrZXksIHtcbiAgICAgICAgICAgIHZhbHVlOiB2YWx1ZVxuICAgICAgICAgIH0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJldHVybiBSZWZsZWN0LmRlZmluZVByb3BlcnR5KHJlY2VpdmVyLCBrZXksIHtcbiAgICAgICAgICAgIHZhbHVlOiB2YWx1ZSxcbiAgICAgICAgICAgIHdyaXRhYmxlOiB0cnVlLFxuICAgICAgICAgICAgZW51bWVyYWJsZTogdHJ1ZSxcbiAgICAgICAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZVxuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGlmIChkZXNjLnNldCkge1xuICAgICAgICBfY2FsbChkZXNjLnNldCwgcmVjZWl2ZXIsIHZhbHVlKTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9O1xuXG4gICAgT2JqZWN0LmFzc2lnbihSZWZsZWN0U2hpbXMsIHtcbiAgICAgIGRlZmluZVByb3BlcnR5OiBmdW5jdGlvbiBkZWZpbmVQcm9wZXJ0eSh0YXJnZXQsIHByb3BlcnR5S2V5LCBhdHRyaWJ1dGVzKSB7XG4gICAgICAgIHRocm93VW5sZXNzVGFyZ2V0SXNPYmplY3QodGFyZ2V0KTtcbiAgICAgICAgcmV0dXJuIGNhbGxBbmRDYXRjaEV4Y2VwdGlvbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRhcmdldCwgcHJvcGVydHlLZXksIGF0dHJpYnV0ZXMpO1xuICAgICAgICB9KTtcbiAgICAgIH0sXG5cbiAgICAgIGdldE93blByb3BlcnR5RGVzY3JpcHRvcjogZnVuY3Rpb24gZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKHRhcmdldCwgcHJvcGVydHlLZXkpIHtcbiAgICAgICAgdGhyb3dVbmxlc3NUYXJnZXRJc09iamVjdCh0YXJnZXQpO1xuICAgICAgICByZXR1cm4gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcih0YXJnZXQsIHByb3BlcnR5S2V5KTtcbiAgICAgIH0sXG5cbiAgICAgIC8vIFN5bnRheCBpbiBhIGZ1bmN0aW9uYWwgZm9ybS5cbiAgICAgIGdldDogZnVuY3Rpb24gZ2V0KHRhcmdldCwga2V5KSB7XG4gICAgICAgIHRocm93VW5sZXNzVGFyZ2V0SXNPYmplY3QodGFyZ2V0KTtcbiAgICAgICAgdmFyIHJlY2VpdmVyID0gYXJndW1lbnRzLmxlbmd0aCA+IDIgPyBhcmd1bWVudHNbMl0gOiB0YXJnZXQ7XG5cbiAgICAgICAgcmV0dXJuIGludGVybmFsR2V0KHRhcmdldCwga2V5LCByZWNlaXZlcik7XG4gICAgICB9LFxuXG4gICAgICBzZXQ6IGZ1bmN0aW9uIHNldCh0YXJnZXQsIGtleSwgdmFsdWUpIHtcbiAgICAgICAgdGhyb3dVbmxlc3NUYXJnZXRJc09iamVjdCh0YXJnZXQpO1xuICAgICAgICB2YXIgcmVjZWl2ZXIgPSBhcmd1bWVudHMubGVuZ3RoID4gMyA/IGFyZ3VtZW50c1szXSA6IHRhcmdldDtcblxuICAgICAgICByZXR1cm4gaW50ZXJuYWxTZXQodGFyZ2V0LCBrZXksIHZhbHVlLCByZWNlaXZlcik7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICBpZiAoT2JqZWN0LmdldFByb3RvdHlwZU9mKSB7XG4gICAgdmFyIG9iamVjdERvdEdldFByb3RvdHlwZU9mID0gT2JqZWN0LmdldFByb3RvdHlwZU9mO1xuICAgIFJlZmxlY3RTaGltcy5nZXRQcm90b3R5cGVPZiA9IGZ1bmN0aW9uIGdldFByb3RvdHlwZU9mKHRhcmdldCkge1xuICAgICAgdGhyb3dVbmxlc3NUYXJnZXRJc09iamVjdCh0YXJnZXQpO1xuICAgICAgcmV0dXJuIG9iamVjdERvdEdldFByb3RvdHlwZU9mKHRhcmdldCk7XG4gICAgfTtcbiAgfVxuXG4gIGlmIChPYmplY3Quc2V0UHJvdG90eXBlT2YgJiYgUmVmbGVjdFNoaW1zLmdldFByb3RvdHlwZU9mKSB7XG4gICAgdmFyIHdpbGxDcmVhdGVDaXJjdWxhclByb3RvdHlwZSA9IGZ1bmN0aW9uIChvYmplY3QsIGxhc3RQcm90bykge1xuICAgICAgdmFyIHByb3RvID0gbGFzdFByb3RvO1xuICAgICAgd2hpbGUgKHByb3RvKSB7XG4gICAgICAgIGlmIChvYmplY3QgPT09IHByb3RvKSB7XG4gICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgcHJvdG8gPSBSZWZsZWN0U2hpbXMuZ2V0UHJvdG90eXBlT2YocHJvdG8pO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH07XG5cbiAgICBPYmplY3QuYXNzaWduKFJlZmxlY3RTaGltcywge1xuICAgICAgLy8gU2V0cyB0aGUgcHJvdG90eXBlIG9mIHRoZSBnaXZlbiBvYmplY3QuXG4gICAgICAvLyBSZXR1cm5zIHRydWUgb24gc3VjY2Vzcywgb3RoZXJ3aXNlIGZhbHNlLlxuICAgICAgc2V0UHJvdG90eXBlT2Y6IGZ1bmN0aW9uIHNldFByb3RvdHlwZU9mKG9iamVjdCwgcHJvdG8pIHtcbiAgICAgICAgdGhyb3dVbmxlc3NUYXJnZXRJc09iamVjdChvYmplY3QpO1xuICAgICAgICBpZiAocHJvdG8gIT09IG51bGwgJiYgIUVTLlR5cGVJc09iamVjdChwcm90bykpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdwcm90byBtdXN0IGJlIGFuIG9iamVjdCBvciBudWxsJyk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBJZiB0aGV5IGFscmVhZHkgYXJlIHRoZSBzYW1lLCB3ZSdyZSBkb25lLlxuICAgICAgICBpZiAocHJvdG8gPT09IFJlZmxlY3QuZ2V0UHJvdG90eXBlT2Yob2JqZWN0KSkge1xuICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ2Fubm90IGFsdGVyIHByb3RvdHlwZSBpZiBvYmplY3Qgbm90IGV4dGVuc2libGUuXG4gICAgICAgIGlmIChSZWZsZWN0LmlzRXh0ZW5zaWJsZSAmJiAhUmVmbGVjdC5pc0V4dGVuc2libGUob2JqZWN0KSkge1xuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEVuc3VyZSB0aGF0IHdlIGRvIG5vdCBjcmVhdGUgYSBjaXJjdWxhciBwcm90b3R5cGUgY2hhaW4uXG4gICAgICAgIGlmICh3aWxsQ3JlYXRlQ2lyY3VsYXJQcm90b3R5cGUob2JqZWN0LCBwcm90bykpIHtcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cblxuICAgICAgICBPYmplY3Quc2V0UHJvdG90eXBlT2Yob2JqZWN0LCBwcm90byk7XG5cbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cbiAgdmFyIGRlZmluZU9yT3ZlcnJpZGVSZWZsZWN0UHJvcGVydHkgPSBmdW5jdGlvbiAoa2V5LCBzaGltKSB7XG4gICAgaWYgKCFFUy5Jc0NhbGxhYmxlKGdsb2JhbHMuUmVmbGVjdFtrZXldKSkge1xuICAgICAgZGVmaW5lUHJvcGVydHkoZ2xvYmFscy5SZWZsZWN0LCBrZXksIHNoaW0pO1xuICAgIH0gZWxzZSB7XG4gICAgICB2YXIgYWNjZXB0c1ByaW1pdGl2ZXMgPSB2YWx1ZU9yRmFsc2VJZlRocm93cyhmdW5jdGlvbiAoKSB7XG4gICAgICAgIGdsb2JhbHMuUmVmbGVjdFtrZXldKDEpO1xuICAgICAgICBnbG9iYWxzLlJlZmxlY3Rba2V5XShOYU4pO1xuICAgICAgICBnbG9iYWxzLlJlZmxlY3Rba2V5XSh0cnVlKTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9KTtcbiAgICAgIGlmIChhY2NlcHRzUHJpbWl0aXZlcykge1xuICAgICAgICBvdmVycmlkZU5hdGl2ZShnbG9iYWxzLlJlZmxlY3QsIGtleSwgc2hpbSk7XG4gICAgICB9XG4gICAgfVxuICB9O1xuICBPYmplY3Qua2V5cyhSZWZsZWN0U2hpbXMpLmZvckVhY2goZnVuY3Rpb24gKGtleSkge1xuICAgIGRlZmluZU9yT3ZlcnJpZGVSZWZsZWN0UHJvcGVydHkoa2V5LCBSZWZsZWN0U2hpbXNba2V5XSk7XG4gIH0pO1xuICB2YXIgb3JpZ2luYWxSZWZsZWN0R2V0UHJvdG8gPSBnbG9iYWxzLlJlZmxlY3QuZ2V0UHJvdG90eXBlT2Y7XG4gIGlmIChmdW5jdGlvbnNIYXZlTmFtZXMgJiYgb3JpZ2luYWxSZWZsZWN0R2V0UHJvdG8gJiYgb3JpZ2luYWxSZWZsZWN0R2V0UHJvdG8ubmFtZSAhPT0gJ2dldFByb3RvdHlwZU9mJykge1xuICAgIG92ZXJyaWRlTmF0aXZlKGdsb2JhbHMuUmVmbGVjdCwgJ2dldFByb3RvdHlwZU9mJywgZnVuY3Rpb24gZ2V0UHJvdG90eXBlT2YodGFyZ2V0KSB7XG4gICAgICByZXR1cm4gX2NhbGwob3JpZ2luYWxSZWZsZWN0R2V0UHJvdG8sIGdsb2JhbHMuUmVmbGVjdCwgdGFyZ2V0KTtcbiAgICB9KTtcbiAgfVxuICBpZiAoZ2xvYmFscy5SZWZsZWN0LnNldFByb3RvdHlwZU9mKSB7XG4gICAgaWYgKHZhbHVlT3JGYWxzZUlmVGhyb3dzKGZ1bmN0aW9uICgpIHtcbiAgICAgIGdsb2JhbHMuUmVmbGVjdC5zZXRQcm90b3R5cGVPZigxLCB7fSk7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9KSkge1xuICAgICAgb3ZlcnJpZGVOYXRpdmUoZ2xvYmFscy5SZWZsZWN0LCAnc2V0UHJvdG90eXBlT2YnLCBSZWZsZWN0U2hpbXMuc2V0UHJvdG90eXBlT2YpO1xuICAgIH1cbiAgfVxuICBpZiAoZ2xvYmFscy5SZWZsZWN0LmRlZmluZVByb3BlcnR5KSB7XG4gICAgaWYgKCF2YWx1ZU9yRmFsc2VJZlRocm93cyhmdW5jdGlvbiAoKSB7XG4gICAgICB2YXIgYmFzaWMgPSAhZ2xvYmFscy5SZWZsZWN0LmRlZmluZVByb3BlcnR5KDEsICd0ZXN0JywgeyB2YWx1ZTogMSB9KTtcbiAgICAgIC8vIFwiZXh0ZW5zaWJsZVwiIGZhaWxzIG9uIEVkZ2UgMC4xMlxuICAgICAgdmFyIGV4dGVuc2libGUgPSB0eXBlb2YgT2JqZWN0LnByZXZlbnRFeHRlbnNpb25zICE9PSAnZnVuY3Rpb24nIHx8ICFnbG9iYWxzLlJlZmxlY3QuZGVmaW5lUHJvcGVydHkoT2JqZWN0LnByZXZlbnRFeHRlbnNpb25zKHt9KSwgJ3Rlc3QnLCB7fSk7XG4gICAgICByZXR1cm4gYmFzaWMgJiYgZXh0ZW5zaWJsZTtcbiAgICB9KSkge1xuICAgICAgb3ZlcnJpZGVOYXRpdmUoZ2xvYmFscy5SZWZsZWN0LCAnZGVmaW5lUHJvcGVydHknLCBSZWZsZWN0U2hpbXMuZGVmaW5lUHJvcGVydHkpO1xuICAgIH1cbiAgfVxuICBpZiAoZ2xvYmFscy5SZWZsZWN0LmNvbnN0cnVjdCkge1xuICAgIGlmICghdmFsdWVPckZhbHNlSWZUaHJvd3MoZnVuY3Rpb24gKCkge1xuICAgICAgdmFyIEYgPSBmdW5jdGlvbiBGKCkge307XG4gICAgICByZXR1cm4gZ2xvYmFscy5SZWZsZWN0LmNvbnN0cnVjdChmdW5jdGlvbiAoKSB7fSwgW10sIEYpIGluc3RhbmNlb2YgRjtcbiAgICB9KSkge1xuICAgICAgb3ZlcnJpZGVOYXRpdmUoZ2xvYmFscy5SZWZsZWN0LCAnY29uc3RydWN0JywgUmVmbGVjdFNoaW1zLmNvbnN0cnVjdCk7XG4gICAgfVxuICB9XG5cbiAgaWYgKFN0cmluZyhuZXcgRGF0ZShOYU4pKSAhPT0gJ0ludmFsaWQgRGF0ZScpIHtcbiAgICB2YXIgZGF0ZVRvU3RyaW5nID0gRGF0ZS5wcm90b3R5cGUudG9TdHJpbmc7XG4gICAgdmFyIHNoaW1tZWREYXRlVG9TdHJpbmcgPSBmdW5jdGlvbiB0b1N0cmluZygpIHtcbiAgICAgIHZhciB2YWx1ZU9mID0gK3RoaXM7XG4gICAgICBpZiAodmFsdWVPZiAhPT0gdmFsdWVPZikge1xuICAgICAgICByZXR1cm4gJ0ludmFsaWQgRGF0ZSc7XG4gICAgICB9XG4gICAgICByZXR1cm4gRVMuQ2FsbChkYXRlVG9TdHJpbmcsIHRoaXMpO1xuICAgIH07XG4gICAgb3ZlcnJpZGVOYXRpdmUoRGF0ZS5wcm90b3R5cGUsICd0b1N0cmluZycsIHNoaW1tZWREYXRlVG9TdHJpbmcpO1xuICB9XG5cbiAgLy8gQW5uZXggQiBIVE1MIG1ldGhvZHNcbiAgLy8gaHR0cHM6Ly9wZW9wbGUubW96aWxsYS5vcmcvfmpvcmVuZG9yZmYvZXM2LWRyYWZ0Lmh0bWwjc2VjLWFkZGl0aW9uYWwtcHJvcGVydGllcy1vZi10aGUtc3RyaW5nLnByb3RvdHlwZS1vYmplY3RcbiAgdmFyIHN0cmluZ0hUTUxzaGltcyA9IHtcbiAgICBhbmNob3I6IGZ1bmN0aW9uIGFuY2hvcihuYW1lKSB7IHJldHVybiBFUy5DcmVhdGVIVE1MKHRoaXMsICdhJywgJ25hbWUnLCBuYW1lKTsgfSxcbiAgICBiaWc6IGZ1bmN0aW9uIGJpZygpIHsgcmV0dXJuIEVTLkNyZWF0ZUhUTUwodGhpcywgJ2JpZycsICcnLCAnJyk7IH0sXG4gICAgYmxpbms6IGZ1bmN0aW9uIGJsaW5rKCkgeyByZXR1cm4gRVMuQ3JlYXRlSFRNTCh0aGlzLCAnYmxpbmsnLCAnJywgJycpOyB9LFxuICAgIGJvbGQ6IGZ1bmN0aW9uIGJvbGQoKSB7IHJldHVybiBFUy5DcmVhdGVIVE1MKHRoaXMsICdiJywgJycsICcnKTsgfSxcbiAgICBmaXhlZDogZnVuY3Rpb24gZml4ZWQoKSB7IHJldHVybiBFUy5DcmVhdGVIVE1MKHRoaXMsICd0dCcsICcnLCAnJyk7IH0sXG4gICAgZm9udGNvbG9yOiBmdW5jdGlvbiBmb250Y29sb3IoY29sb3IpIHsgcmV0dXJuIEVTLkNyZWF0ZUhUTUwodGhpcywgJ2ZvbnQnLCAnY29sb3InLCBjb2xvcik7IH0sXG4gICAgZm9udHNpemU6IGZ1bmN0aW9uIGZvbnRzaXplKHNpemUpIHsgcmV0dXJuIEVTLkNyZWF0ZUhUTUwodGhpcywgJ2ZvbnQnLCAnc2l6ZScsIHNpemUpOyB9LFxuICAgIGl0YWxpY3M6IGZ1bmN0aW9uIGl0YWxpY3MoKSB7IHJldHVybiBFUy5DcmVhdGVIVE1MKHRoaXMsICdpJywgJycsICcnKTsgfSxcbiAgICBsaW5rOiBmdW5jdGlvbiBsaW5rKHVybCkgeyByZXR1cm4gRVMuQ3JlYXRlSFRNTCh0aGlzLCAnYScsICdocmVmJywgdXJsKTsgfSxcbiAgICBzbWFsbDogZnVuY3Rpb24gc21hbGwoKSB7IHJldHVybiBFUy5DcmVhdGVIVE1MKHRoaXMsICdzbWFsbCcsICcnLCAnJyk7IH0sXG4gICAgc3RyaWtlOiBmdW5jdGlvbiBzdHJpa2UoKSB7IHJldHVybiBFUy5DcmVhdGVIVE1MKHRoaXMsICdzdHJpa2UnLCAnJywgJycpOyB9LFxuICAgIHN1YjogZnVuY3Rpb24gc3ViKCkgeyByZXR1cm4gRVMuQ3JlYXRlSFRNTCh0aGlzLCAnc3ViJywgJycsICcnKTsgfSxcbiAgICBzdXA6IGZ1bmN0aW9uIHN1YigpIHsgcmV0dXJuIEVTLkNyZWF0ZUhUTUwodGhpcywgJ3N1cCcsICcnLCAnJyk7IH1cbiAgfTtcbiAgX2ZvckVhY2goT2JqZWN0LmtleXMoc3RyaW5nSFRNTHNoaW1zKSwgZnVuY3Rpb24gKGtleSkge1xuICAgIHZhciBtZXRob2QgPSBTdHJpbmcucHJvdG90eXBlW2tleV07XG4gICAgdmFyIHNob3VsZE92ZXJ3cml0ZSA9IGZhbHNlO1xuICAgIGlmIChFUy5Jc0NhbGxhYmxlKG1ldGhvZCkpIHtcbiAgICAgIHZhciBvdXRwdXQgPSBfY2FsbChtZXRob2QsICcnLCAnIFwiICcpO1xuICAgICAgdmFyIHF1b3Rlc0NvdW50ID0gX2NvbmNhdChbXSwgb3V0cHV0Lm1hdGNoKC9cIi9nKSkubGVuZ3RoO1xuICAgICAgc2hvdWxkT3ZlcndyaXRlID0gb3V0cHV0ICE9PSBvdXRwdXQudG9Mb3dlckNhc2UoKSB8fCBxdW90ZXNDb3VudCA+IDI7XG4gICAgfSBlbHNlIHtcbiAgICAgIHNob3VsZE92ZXJ3cml0ZSA9IHRydWU7XG4gICAgfVxuICAgIGlmIChzaG91bGRPdmVyd3JpdGUpIHtcbiAgICAgIG92ZXJyaWRlTmF0aXZlKFN0cmluZy5wcm90b3R5cGUsIGtleSwgc3RyaW5nSFRNTHNoaW1zW2tleV0pO1xuICAgIH1cbiAgfSk7XG5cbiAgdmFyIEpTT05zdHJpbmdpZmllc1N5bWJvbHMgPSAoZnVuY3Rpb24gKCkge1xuICAgIC8vIE1pY3Jvc29mdCBFZGdlIHYwLjEyIHN0cmluZ2lmaWVzIFN5bWJvbHMgaW5jb3JyZWN0bHlcbiAgICBpZiAoIWhhc1N5bWJvbHMpIHsgcmV0dXJuIGZhbHNlOyB9IC8vIFN5bWJvbHMgYXJlIG5vdCBzdXBwb3J0ZWRcbiAgICB2YXIgc3RyaW5naWZ5ID0gdHlwZW9mIEpTT04gPT09ICdvYmplY3QnICYmIHR5cGVvZiBKU09OLnN0cmluZ2lmeSA9PT0gJ2Z1bmN0aW9uJyA/IEpTT04uc3RyaW5naWZ5IDogbnVsbDtcbiAgICBpZiAoIXN0cmluZ2lmeSkgeyByZXR1cm4gZmFsc2U7IH0gLy8gSlNPTi5zdHJpbmdpZnkgaXMgbm90IHN1cHBvcnRlZFxuICAgIGlmICh0eXBlb2Ygc3RyaW5naWZ5KFN5bWJvbCgpKSAhPT0gJ3VuZGVmaW5lZCcpIHsgcmV0dXJuIHRydWU7IH0gLy8gU3ltYm9scyBzaG91bGQgYmVjb21lIGB1bmRlZmluZWRgXG4gICAgaWYgKHN0cmluZ2lmeShbU3ltYm9sKCldKSAhPT0gJ1tudWxsXScpIHsgcmV0dXJuIHRydWU7IH0gLy8gU3ltYm9scyBpbiBhcnJheXMgc2hvdWxkIGJlY29tZSBgbnVsbGBcbiAgICB2YXIgb2JqID0geyBhOiBTeW1ib2woKSB9O1xuICAgIG9ialtTeW1ib2woKV0gPSB0cnVlO1xuICAgIGlmIChzdHJpbmdpZnkob2JqKSAhPT0gJ3t9JykgeyByZXR1cm4gdHJ1ZTsgfSAvLyBTeW1ib2wtdmFsdWVkIGtleXMgKmFuZCogU3ltYm9sLXZhbHVlZCBwcm9wZXJ0aWVzIHNob3VsZCBiZSBvbWl0dGVkXG4gICAgcmV0dXJuIGZhbHNlO1xuICB9KCkpO1xuICB2YXIgSlNPTnN0cmluZ2lmeUFjY2VwdHNPYmplY3RTeW1ib2wgPSB2YWx1ZU9yRmFsc2VJZlRocm93cyhmdW5jdGlvbiAoKSB7XG4gICAgLy8gQ2hyb21lIDQ1IHRocm93cyBvbiBzdHJpbmdpZnlpbmcgb2JqZWN0IHN5bWJvbHNcbiAgICBpZiAoIWhhc1N5bWJvbHMpIHsgcmV0dXJuIHRydWU7IH0gLy8gU3ltYm9scyBhcmUgbm90IHN1cHBvcnRlZFxuICAgIHJldHVybiBKU09OLnN0cmluZ2lmeShPYmplY3QoU3ltYm9sKCkpKSA9PT0gJ3t9JyAmJiBKU09OLnN0cmluZ2lmeShbT2JqZWN0KFN5bWJvbCgpKV0pID09PSAnW3t9XSc7XG4gIH0pO1xuICBpZiAoSlNPTnN0cmluZ2lmaWVzU3ltYm9scyB8fCAhSlNPTnN0cmluZ2lmeUFjY2VwdHNPYmplY3RTeW1ib2wpIHtcbiAgICB2YXIgb3JpZ1N0cmluZ2lmeSA9IEpTT04uc3RyaW5naWZ5O1xuICAgIG92ZXJyaWRlTmF0aXZlKEpTT04sICdzdHJpbmdpZnknLCBmdW5jdGlvbiBzdHJpbmdpZnkodmFsdWUpIHtcbiAgICAgIGlmICh0eXBlb2YgdmFsdWUgPT09ICdzeW1ib2wnKSB7IHJldHVybjsgfVxuICAgICAgdmFyIHJlcGxhY2VyO1xuICAgICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPiAxKSB7XG4gICAgICAgIHJlcGxhY2VyID0gYXJndW1lbnRzWzFdO1xuICAgICAgfVxuICAgICAgdmFyIGFyZ3MgPSBbdmFsdWVdO1xuICAgICAgaWYgKCFpc0FycmF5KHJlcGxhY2VyKSkge1xuICAgICAgICB2YXIgcmVwbGFjZUZuID0gRVMuSXNDYWxsYWJsZShyZXBsYWNlcikgPyByZXBsYWNlciA6IG51bGw7XG4gICAgICAgIHZhciB3cmFwcGVkUmVwbGFjZXIgPSBmdW5jdGlvbiAoa2V5LCB2YWwpIHtcbiAgICAgICAgICB2YXIgcGFyc2VkVmFsdWUgPSByZXBsYWNlRm4gPyBfY2FsbChyZXBsYWNlRm4sIHRoaXMsIGtleSwgdmFsKSA6IHZhbDtcbiAgICAgICAgICBpZiAodHlwZW9mIHBhcnNlZFZhbHVlICE9PSAnc3ltYm9sJykge1xuICAgICAgICAgICAgaWYgKFR5cGUuc3ltYm9sKHBhcnNlZFZhbHVlKSkge1xuICAgICAgICAgICAgICByZXR1cm4gYXNzaWduVG8oe30pKHBhcnNlZFZhbHVlKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHJldHVybiBwYXJzZWRWYWx1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICAgIGFyZ3MucHVzaCh3cmFwcGVkUmVwbGFjZXIpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gY3JlYXRlIHdyYXBwZWQgcmVwbGFjZXIgdGhhdCBoYW5kbGVzIGFuIGFycmF5IHJlcGxhY2VyP1xuICAgICAgICBhcmdzLnB1c2gocmVwbGFjZXIpO1xuICAgICAgfVxuICAgICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPiAyKSB7XG4gICAgICAgIGFyZ3MucHVzaChhcmd1bWVudHNbMl0pO1xuICAgICAgfVxuICAgICAgcmV0dXJuIG9yaWdTdHJpbmdpZnkuYXBwbHkodGhpcywgYXJncyk7XG4gICAgfSk7XG4gIH1cblxuICByZXR1cm4gZ2xvYmFscztcbn0pKTtcbiIsIi8vIHNoaW0gZm9yIHVzaW5nIHByb2Nlc3MgaW4gYnJvd3NlclxuXG52YXIgcHJvY2VzcyA9IG1vZHVsZS5leHBvcnRzID0ge307XG52YXIgcXVldWUgPSBbXTtcbnZhciBkcmFpbmluZyA9IGZhbHNlO1xudmFyIGN1cnJlbnRRdWV1ZTtcbnZhciBxdWV1ZUluZGV4ID0gLTE7XG5cbmZ1bmN0aW9uIGNsZWFuVXBOZXh0VGljaygpIHtcbiAgICBkcmFpbmluZyA9IGZhbHNlO1xuICAgIGlmIChjdXJyZW50UXVldWUubGVuZ3RoKSB7XG4gICAgICAgIHF1ZXVlID0gY3VycmVudFF1ZXVlLmNvbmNhdChxdWV1ZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcXVldWVJbmRleCA9IC0xO1xuICAgIH1cbiAgICBpZiAocXVldWUubGVuZ3RoKSB7XG4gICAgICAgIGRyYWluUXVldWUoKTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGRyYWluUXVldWUoKSB7XG4gICAgaWYgKGRyYWluaW5nKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdmFyIHRpbWVvdXQgPSBzZXRUaW1lb3V0KGNsZWFuVXBOZXh0VGljayk7XG4gICAgZHJhaW5pbmcgPSB0cnVlO1xuXG4gICAgdmFyIGxlbiA9IHF1ZXVlLmxlbmd0aDtcbiAgICB3aGlsZShsZW4pIHtcbiAgICAgICAgY3VycmVudFF1ZXVlID0gcXVldWU7XG4gICAgICAgIHF1ZXVlID0gW107XG4gICAgICAgIHdoaWxlICgrK3F1ZXVlSW5kZXggPCBsZW4pIHtcbiAgICAgICAgICAgIGlmIChjdXJyZW50UXVldWUpIHtcbiAgICAgICAgICAgICAgICBjdXJyZW50UXVldWVbcXVldWVJbmRleF0ucnVuKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcXVldWVJbmRleCA9IC0xO1xuICAgICAgICBsZW4gPSBxdWV1ZS5sZW5ndGg7XG4gICAgfVxuICAgIGN1cnJlbnRRdWV1ZSA9IG51bGw7XG4gICAgZHJhaW5pbmcgPSBmYWxzZTtcbiAgICBjbGVhclRpbWVvdXQodGltZW91dCk7XG59XG5cbnByb2Nlc3MubmV4dFRpY2sgPSBmdW5jdGlvbiAoZnVuKSB7XG4gICAgdmFyIGFyZ3MgPSBuZXcgQXJyYXkoYXJndW1lbnRzLmxlbmd0aCAtIDEpO1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID4gMSkge1xuICAgICAgICBmb3IgKHZhciBpID0gMTsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgYXJnc1tpIC0gMV0gPSBhcmd1bWVudHNbaV07XG4gICAgICAgIH1cbiAgICB9XG4gICAgcXVldWUucHVzaChuZXcgSXRlbShmdW4sIGFyZ3MpKTtcbiAgICBpZiAocXVldWUubGVuZ3RoID09PSAxICYmICFkcmFpbmluZykge1xuICAgICAgICBzZXRUaW1lb3V0KGRyYWluUXVldWUsIDApO1xuICAgIH1cbn07XG5cbi8vIHY4IGxpa2VzIHByZWRpY3RpYmxlIG9iamVjdHNcbmZ1bmN0aW9uIEl0ZW0oZnVuLCBhcnJheSkge1xuICAgIHRoaXMuZnVuID0gZnVuO1xuICAgIHRoaXMuYXJyYXkgPSBhcnJheTtcbn1cbkl0ZW0ucHJvdG90eXBlLnJ1biA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLmZ1bi5hcHBseShudWxsLCB0aGlzLmFycmF5KTtcbn07XG5wcm9jZXNzLnRpdGxlID0gJ2Jyb3dzZXInO1xucHJvY2Vzcy5icm93c2VyID0gdHJ1ZTtcbnByb2Nlc3MuZW52ID0ge307XG5wcm9jZXNzLmFyZ3YgPSBbXTtcbnByb2Nlc3MudmVyc2lvbiA9ICcnOyAvLyBlbXB0eSBzdHJpbmcgdG8gYXZvaWQgcmVnZXhwIGlzc3Vlc1xucHJvY2Vzcy52ZXJzaW9ucyA9IHt9O1xuXG5mdW5jdGlvbiBub29wKCkge31cblxucHJvY2Vzcy5vbiA9IG5vb3A7XG5wcm9jZXNzLmFkZExpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3Mub25jZSA9IG5vb3A7XG5wcm9jZXNzLm9mZiA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUxpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlQWxsTGlzdGVuZXJzID0gbm9vcDtcbnByb2Nlc3MuZW1pdCA9IG5vb3A7XG5cbnByb2Nlc3MuYmluZGluZyA9IGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmJpbmRpbmcgaXMgbm90IHN1cHBvcnRlZCcpO1xufTtcblxucHJvY2Vzcy5jd2QgPSBmdW5jdGlvbiAoKSB7IHJldHVybiAnLycgfTtcbnByb2Nlc3MuY2hkaXIgPSBmdW5jdGlvbiAoZGlyKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmNoZGlyIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn07XG5wcm9jZXNzLnVtYXNrID0gZnVuY3Rpb24oKSB7IHJldHVybiAwOyB9O1xuIiwiaW1wb3J0ICogYXMgb3B0IGZyb20gJy4vbWFpbi9PcHRpb24nO1xuaW1wb3J0ICogYXMgbGlzdCBmcm9tICcuL21haW4vTGlzdCc7XG5pbXBvcnQgKiBhcyBtYXAgZnJvbSAnLi9tYWluL01hcCc7XG5cbi8qKlxuICogRXhwb3J0IHRvIHB1YmxpYyBhcyB0eXBlc2NyaXB0IG1vZHVsZXMuXG4gKi9cbmV4cG9ydCB7XG4gIG9wdCwgbGlzdCwgbWFwXG59O1xuXG4vKipcbiAqIEV4cG9ydCB0byBwdWJsaWMgYnkgYmluZGluZyB0aGVtIHRvIHRoZSB3aW5kb3cgcHJvcGVydHkuXG4gKi9cbndpbmRvd1snQXBwJ10gPSB7XG4gIG9wdDogb3B0LFxuICBsaXN0OiBsaXN0LFxuICBtYXA6IG1hcFxufTtcblxuIiwiaW1wb3J0IHtvcHRpb24sIE9wdGlvbn0gZnJvbSBcIi4vT3B0aW9uXCJcblxuZXhwb3J0IGludGVyZmFjZSBJdGVyYWJsZTxBPiB7XG4gIGNvdW50KHAgOiAoeCA6IEEpID0+IEJvb2xlYW4pIDogbnVtYmVyXG4gIGZvckVhY2goZjogKGEgOiBBKSA9PiB2b2lkKVxuICBkcm9wKG4gOiBudW1iZXIpIDogSXRlcmFibGU8QT5cbiAgZHJvcFJpZ2h0KG4gOiBudW1iZXIpIDogSXRlcmFibGU8QT5cbiAgZmlsdGVyKHA6IChhOiBBKSA9PiBib29sZWFuKSA6IEl0ZXJhYmxlPEE+XG4gIGZpbHRlck5vdChwOiAoYTogQSkgPT4gYm9vbGVhbikgOiBJdGVyYWJsZTxBPlxufVxuXG5leHBvcnQgYWJzdHJhY3QgY2xhc3MgSXRlcmFibGVJbXBsPEE+IGltcGxlbWVudHMgSXRlcmFibGU8QT4ge1xuXG4gIHByaXZhdGUgaXRlcmF0b3IgOiBJdGVyYXRvcjxBPjtcblxuICBjb25zdHJ1Y3RvcihpdGVyYXRvciA6IEl0ZXJhdG9yPEE+KSB7XG4gICAgdGhpcy5pdGVyYXRvciA9IGl0ZXJhdG9yO1xuICB9XG5cbiAgcHVibGljIGNvdW50KHAgOiAoeCA6IEEpID0+IEJvb2xlYW4pIDogbnVtYmVyIHtcbiAgICBsZXQgY291bnQgPSAwO1xuICAgIGZvciAobGV0IGkgPSB0aGlzLml0ZXJhdG9yLm5leHQoKTsgIWkuZG9uZTsgaSA9IHRoaXMuaXRlcmF0b3IubmV4dCgpKSB7XG4gICAgICBjb25zdCByZXN1bHQgPSBwKGkudmFsdWUpO1xuICAgICAgY291bnQgPSByZXN1bHQgPyBjb3VudCArIDEgOiBjb3VudDtcbiAgICB9XG4gICAgcmV0dXJuIGNvdW50O1xuICB9XG5cbiAgZm9yRWFjaChmOiAoYSA6IEEpID0+IHZvaWQpIHtcbiAgICBmb3IgKGxldCBpID0gdGhpcy5pdGVyYXRvci5uZXh0KCk7ICFpLmRvbmU7IGkgPSB0aGlzLml0ZXJhdG9yLm5leHQoKSkge1xuICAgICAgZihpLnZhbHVlKTtcbiAgICB9XG4gIH1cblxuICBhYnN0cmFjdCBkcm9wKG4gOiBudW1iZXIpIDogSXRlcmFibGU8QT5cbiAgYWJzdHJhY3QgZHJvcFJpZ2h0KG4gOiBudW1iZXIpIDogSXRlcmFibGU8QT5cbiAgYWJzdHJhY3QgZmlsdGVyKHA6IChhOiBBKSA9PiBib29sZWFuKSA6IEl0ZXJhYmxlPEE+XG4gIGFic3RyYWN0IGZpbHRlck5vdChwOiAoYTogQSkgPT4gYm9vbGVhbikgOiBJdGVyYWJsZTxBPlxufVxuIiwiaW1wb3J0IHtJdGVyYWJsZX0gZnJvbSBcIi4vSXRlcmFibGVcIlxuaW1wb3J0IHtvcHRpb24sIE9wdGlvbn0gZnJvbSBcIi4vT3B0aW9uXCJcbmltcG9ydCB7QXJyYXkgYXMgRVM2QXJyYXl9IGZyb20gXCJlczYtc2hpbVwiXG5BcnJheSA9IEVTNkFycmF5O1xuXG4vKipcbiAqIEFuIEltbXV0YWJsZSBMaXN0IGNsYXNzIGluIHNpbWlsYXIgdG8gYSBTY2FsYSBMaXN0LiBJdCdzIGltcG9ydGFudCB0byBwb2ludCBvdXQgdGhhdCB0aGlzIGxpc3QgaXMgbm90IGluZmFjdCBhIHJlYWxcbiAqIExpbmtlZCBMaXN0IGluIHRoZSB0cmFkaXRpb25hbCBzZW5zZSwgaW5zdGVhZCBpdCBpcyBiYWNrZWQgYnkgYSBBeXBlU2NyaXB0L0phdmFTY3JpcHQgQXJyYXkgZm9yIHNpbXBsaWNpdHkgYW5kXG4gKiBwZXJmb3JtYW5jZSByZWFzb25zIChpLmUuLCBhcnJheXMgYXJlIGhlYXZpbHkgb3B0aW1pemVkIGJ5IFZNcykgc28gdW5sZXNzIHRoZXJlJ3MgYSBnb29kIHJlYXNvbiB0byBpbXBsaWVtZW50IGFcbiAqIHRyYWRpdGlvbmFsIExpc3QgdGhpcyB3aWxsIHJlbWFpbiB0aGlzIHdheS4gRXh0ZXJuYWxseSB0aGUgTGlzdCBJbnRlcmZhY2Ugd2lsbCBlbnN1cmUgaW1tdXRhYmxpeSBieSByZXR1cm5pbmcgbmV3XG4gKiBpbnN0YW5jZXMgb2YgdGhlIExpc3QgYW5kIHdpbGwgbm90IG11dGF0ZSB0aGUgTGlzdCBvciB0aGUgdW5kZXJseWluZyBBcnJheSBpbiBhbnkgd2F5LlxuICovXG5leHBvcnQgY2xhc3MgTGlzdDxBPiBpbXBsZW1lbnRzIEl0ZXJhYmxlPEE+IHtcblxuICBwcml2YXRlIGRhdGEgOiBBW107XG5cbiAgY29uc3RydWN0b3IoYXJnczogQVtdKSB7XG4gICAgdGhpcy5kYXRhID0gYXJncy5jb25jYXQoW10pO1xuICB9XG5cbiAgcHVibGljIGNvbnRhaW5zKGVsZW06IEEpIDogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuZGF0YS5pbmRleE9mKGVsZW0pID4gLTE7XG4gIH1cblxuICBwdWJsaWMgY291bnQocDogKGEgOiBBKSA9PiBib29sZWFuKSA6IG51bWJlciB7XG4gICAgcmV0dXJuIHRoaXMuZGF0YS5maWx0ZXIocCkubGVuZ3RoO1xuICB9XG5cbiAgcHVibGljIGZvckVhY2goZjogKGEgOiBBKSA9PiB2b2lkKSB7XG4gICAgW10uY29uY2F0KHRoaXMuZGF0YSkuZm9yRWFjaChmKTtcbiAgfVxuXG4gIHB1YmxpYyBkcm9wKG4gOiBudW1iZXIpIDogTGlzdDxBPiB7XG4gICAgcmV0dXJuIGxpc3Q8QT4odGhpcy5kYXRhLnNsaWNlKG4pKTtcbiAgfVxuXG4gIHB1YmxpYyBkcm9wUmlnaHQobiA6IG51bWJlcikgOiBMaXN0PEE+IHtcbiAgICByZXR1cm4gbGlzdDxBPih0aGlzLmRhdGEuc2xpY2UoMCwgbikpO1xuICB9XG5cbiAgcHVibGljIGZpbHRlcihwOiAoYTogQSkgPT4gYm9vbGVhbikgOiBMaXN0PEE+IHtcbiAgICByZXR1cm4gbGlzdDxBPih0aGlzLmRhdGEuZmlsdGVyKHApKTtcbiAgfVxuXG4gIHB1YmxpYyBmaWx0ZXJOb3QocDogKGE6IEEpID0+IGJvb2xlYW4pIDogTGlzdDxBPiB7XG4gICAgY29uc3QgaW52ZXJzZSA9IChhOiBBKSA9PiB7XG4gICAgICByZXR1cm4gIXAoYSk7XG4gICAgfTtcbiAgICByZXR1cm4gbGlzdDxBPih0aGlzLmRhdGEuZmlsdGVyKGludmVyc2UpKTtcbiAgfVxuXG4gIHB1YmxpYyBmaW5kKHA6IChhOiBBKSA9PiBib29sZWFuKSA6IE9wdGlvbjxBPiB7XG4gICAgcmV0dXJuIG9wdGlvbih0aGlzLmRhdGEuZmluZChwKSk7XG4gIH1cblxuICBwdWJsaWMgXyhpbmRleCA6bnVtYmVyKSA6IEEge1xuICAgIHJldHVybiB0aGlzLmdldChpbmRleCk7XG4gIH1cblxuICBwdWJsaWMgZ2V0KGluZGV4IDogbnVtYmVyKSA6IEEge1xuICAgIHJldHVybiB0aGlzLmRhdGFbaW5kZXhdO1xuICB9XG5cbiAgcHVibGljIG1hcDxCPihmIDogKGEgOiBBKSA9PiBCKSA6IExpc3Q8Qj4ge1xuICAgIGNvbnN0IG5ld0FycmF5IDogQltdID0gdGhpcy5kYXRhLm1hcChmKTtcbiAgICByZXR1cm4gbGlzdChuZXdBcnJheSk7XG4gIH1cblxuICBwdWJsaWMgZ2V0IGxlbmd0aCgpIHtcbiAgICByZXR1cm4gdGhpcy5kYXRhLmxlbmd0aDtcbiAgfVxuXG4gIHB1YmxpYyByZWR1Y2U8QTEgZXh0ZW5kcyBBPihvcDogKHggOiBBMSwgeSA6IEExKSA9PiBBMSkge1xuICAgIHJldHVybiB0aGlzLmRhdGEucmVkdWNlKG9wKTtcbiAgfVxuXG4gIHB1YmxpYyBnZXQgc2l6ZSgpIHtcbiAgICByZXR1cm4gdGhpcy5sZW5ndGg7XG4gIH1cblxuICBwdWJsaWMgdG9BcnJheSgpIDogQVtdIHtcbiAgICByZXR1cm4gW10uY29uY2F0KHRoaXMuZGF0YSk7XG4gIH1cblxuICBwdWJsaWMgdW5pb24odGhhdDogQVtdIHwgTGlzdDxBPikgOiBMaXN0PEE+IHtcbiAgICBpZiAodGhhdCBpbnN0YW5jZW9mIExpc3QpIHtcbiAgICAgIHJldHVybiBsaXN0PEE+KHRoaXMuZGF0YS5jb25jYXQodGhhdC50b0FycmF5KCkpKTtcbiAgICB9IGVsc2UgaWYgKHRoYXQgaW5zdGFuY2VvZiBBcnJheSl7XG4gICAgICByZXR1cm4gbGlzdDxBPih0aGlzLmRhdGEuY29uY2F0KC4uLnRoYXQpKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhyb3cgXCJVbnN1cHBvcnRlZCBUeXBlIFwiICsgdHlwZW9mIHRoYXQ7XG4gICAgfVxuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBsaXN0PEE+KGFyZ3M6IEFbXSkgOiBMaXN0PEE+IHtcbiAgcmV0dXJuIG5ldyBMaXN0KGFyZ3MpO1xufVxuIiwiaW1wb3J0IHtJdGVyYWJsZSwgSXRlcmFibGVJbXBsfSBmcm9tIFwiLi9JdGVyYWJsZVwiO1xuaW1wb3J0IHtsaXN0LCBMaXN0fSBmcm9tIFwiLi9MaXN0XCI7XG5pbXBvcnQge29wdGlvbiwgT3B0aW9ufSBmcm9tIFwiLi9PcHRpb25cIjtcbmltcG9ydCB7QXJyYXkgYXMgRVM2QXJyYXksIE1hcH0gZnJvbSBcImVzNi1zaGltXCI7XG5BcnJheSA9IEVTNkFycmF5O1xuXG5leHBvcnQgY2xhc3MgSU1hcDxLLFY+IGltcGxlbWVudHMgSXRlcmFibGU8W0ssVl0+IHtcblxuICBwcml2YXRlIGRhdGEgOiBNYXA8SyxWPjtcblxuICBjb25zdHJ1Y3RvcihpdGVyYWJsZSA6IEl0ZXJhYmxlPFtLLFZdPikge1xuICAgIHRoaXMuZGF0YSA9IG5ldyBNYXA8SyxWPigpO1xuICAgIGlmIChpdGVyYWJsZSkge1xuICAgICAgaXRlcmFibGUuZm9yRWFjaCgocGFpciA6IFtLLFZdKSA9PiB7XG4gICAgICAgIHRoaXMuZGF0YS5zZXQocGFpclswXSwgcGFpclsxXSk7XG4gICAgICB9KTtcbiAgICB9XG4gIH1cblxuICBwdWJsaWMgY291bnQocDogKHR1cGxlIDogW0ssVl0pID0+IGJvb2xlYW4pIDogbnVtYmVyIHtcbiAgICByZXR1cm4gbmV3IElNYXBJdGVyYXRvcih0aGlzLmRhdGEuZW50cmllcygpKS5jb3VudChwKTtcbiAgfVxuXG4gIHB1YmxpYyBmb3JFYWNoKGY6IChhIDogW0ssVl0pID0+IHZvaWQpIHtcbiAgICByZXR1cm4gbmV3IElNYXBJdGVyYXRvcih0aGlzLmRhdGEuZW50cmllcygpKS5mb3JFYWNoKGYpO1xuICB9XG5cbiAgcHVibGljIGRyb3AobiA6IG51bWJlcikgOiBJTWFwPEssVj4ge1xuICAgIGxldCBjb3VudCA9IDA7XG4gICAgY29uc3QgbmV3TWFwID0gbmV3IE1hcDxLLFY+KCk7XG4gICAgbmV3IElNYXBJdGVyYXRvcih0aGlzLmRhdGEuZW50cmllcygpKS5mb3JFYWNoKChwYWlyIDogW0ssVl0pID0+IHtcbiAgICAgICBpZiAoY291bnQgPj0gbikge1xuICAgICAgICAgbmV3TWFwLnNldChwYWlyWzBdLCBwYWlyWzFdKTtcbiAgICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIG5ldyBJTWFwPEssVj4obmV3IElNYXBJdGVyYXRvcih0aGlzLmRhdGEuZW50cmllcygpKSk7XG4gIH1cblxuICBwdWJsaWMgZHJvcFJpZ2h0KG4gOiBudW1iZXIpIDogSU1hcDxLLFY+IHtcbiAgICBsZXQgY291bnQgPSB0aGlzLmRhdGEuc2l6ZSAtIG47XG4gICAgY29uc3QgbmV3TWFwID0gbmV3IE1hcDxLLFY+KCk7XG4gICAgbmV3IElNYXBJdGVyYXRvcih0aGlzLmRhdGEuZW50cmllcygpKS5mb3JFYWNoKChwYWlyIDogW0ssVl0pID0+IHtcbiAgICAgIGlmIChjb3VudCA8IG4pIHtcbiAgICAgICAgbmV3TWFwLnNldChwYWlyWzBdLCBwYWlyWzFdKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gbmV3IElNYXA8SyxWPihuZXcgSU1hcEl0ZXJhdG9yKHRoaXMuZGF0YS5lbnRyaWVzKCkpKTtcbiAgfVxuXG4gIHB1YmxpYyBmaWx0ZXIocDogKGE6IFtLLFZdKSA9PiBib29sZWFuKSA6IElNYXA8SyxWPiB7XG4gICAgY29uc3QgbmV3TWFwID0gbmV3IE1hcDxLLFY+KCk7XG4gICAgbmV3IElNYXBJdGVyYXRvcih0aGlzLmRhdGEuZW50cmllcygpKS5mb3JFYWNoKChwYWlyIDogW0ssVl0pID0+IHtcbiAgICAgIGlmIChwKHBhaXIpKSB7XG4gICAgICAgIG5ld01hcC5zZXQocGFpclswXSwgcGFpclsxXSk7XG4gICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIG5ldyBJTWFwPEssVj4obmV3IElNYXBJdGVyYXRvcih0aGlzLmRhdGEuZW50cmllcygpKSk7XG4gIH1cblxuICBwdWJsaWMgZmlsdGVyTm90KHA6IChhOiBbSyxWXSkgPT4gYm9vbGVhbikgOiBJTWFwPEssVj4ge1xuICAgIGNvbnN0IG5ld01hcCA9IG5ldyBNYXA8SyxWPigpO1xuICAgIG5ldyBJTWFwSXRlcmF0b3IodGhpcy5kYXRhLmVudHJpZXMoKSkuZm9yRWFjaCgocGFpciA6IFtLLFZdKSA9PiB7XG4gICAgICBpZiAoIXAocGFpcikpIHtcbiAgICAgICAgbmV3TWFwLnNldChwYWlyWzBdLCBwYWlyWzFdKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gbmV3IElNYXA8SyxWPihuZXcgSU1hcEl0ZXJhdG9yKHRoaXMuZGF0YS5lbnRyaWVzKCkpKTtcbiAgfVxuXG4gIHB1YmxpYyBnZXQoa2V5OiBLKSA6IE9wdGlvbjxWPiB7XG4gICAgcmV0dXJuIG9wdGlvbih0aGlzLmRhdGEuZ2V0KGtleSkpO1xuICB9XG5cbiAgcHVibGljIGdldE9yRWxzZShrZXk6IEssIGRlZmF1bHRWYWx1ZTogVikgOiBWIHtcbiAgICByZXR1cm4gb3B0aW9uKHRoaXMuZGF0YS5nZXQoa2V5KSkuZ2V0T3JFbHNlKGRlZmF1bHRWYWx1ZSk7XG4gIH1cblxuICBwdWJsaWMgZ2V0IGhlYWQoKSA6IFtLLFZdIHtcbiAgICByZXR1cm4gdGhpcy5kYXRhLmVudHJpZXMoKS5uZXh0KCkudmFsdWU7XG4gIH1cblxuICBwdWJsaWMgZ2V0IGhlYWRPcHRpb24oKSA6IE9wdGlvbjxbSyxWXT4ge1xuICAgIHJldHVybiBvcHRpb24odGhpcy5kYXRhLmVudHJpZXMoKS5uZXh0KCkudmFsdWUpO1xuICB9XG5cbiAgcHVibGljIHNldChlbnRyeTogW0ssVl0pIDogSU1hcDxLLFY+IHtcbiAgICByZXR1cm4gaU1hcChsaXN0PFtLLFZdPihbZW50cnldKSk7XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGlNYXA8SyxWPihpdGVyYWJsZSA6IEl0ZXJhYmxlPFtLLFZdPikgOiBJTWFwPEssVj4ge1xuICByZXR1cm4gbmV3IElNYXA8SyxWPihpdGVyYWJsZSk7XG59XG5cbmNsYXNzIElNYXBJdGVyYXRvcjxBPiBleHRlbmRzIEl0ZXJhYmxlSW1wbDxBPiB7XG4gIGRyb3AobiA6IG51bWJlcikgOiBJdGVyYWJsZTxBPiB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCk7XG4gIH1cbiAgZHJvcFJpZ2h0KG4gOiBudW1iZXIpIDogSXRlcmFibGU8QT4ge1xuICAgIHRocm93IG5ldyBFcnJvcigpO1xuICB9XG4gIGZpbHRlcihwOiAoYTogQSkgPT4gYm9vbGVhbikgOiBJdGVyYWJsZTxBPiB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCk7XG4gIH1cbiAgZmlsdGVyTm90KHA6IChhOiBBKSA9PiBib29sZWFuKSA6IEl0ZXJhYmxlPEE+IHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoKTtcbiAgfVxufVxuIiwiLyoqXG4gKiBDcmVhdGVkIGJ5IEpvcmRhbiBvbiA0LzIzLzIwMTYuXG4gKi9cblxuZXhwb3J0IGNsYXNzIE9wdGlvbjxUPiB7XG5cbiAgcHVibGljIGlzRW1wdHk6IGJvb2xlYW47XG4gIHB1YmxpYyBzaXplOiBudW1iZXI7XG5cbiAgY29uc3RydWN0b3IocHJvdGVjdGVkIHZhbHVlOiBUKSB7XG4gIH1cblxuICBwdWJsaWMgbWFwKGY6IChvYmplY3Q6IFQpID0+IGFueSkge1xuICAgIHJldHVybiBuZXcgU29tZShmKHRoaXMudmFsdWUpKTtcbiAgfVxuXG4gIHB1YmxpYyBnZXQgZ2V0KCkge1xuICAgIHJldHVybiB0aGlzLnZhbHVlO1xuICB9XG5cbiAgcHVibGljIGdldE9yRWxzZShkZWZhdWx0VmFsdWU6IFQpOiBUIHtcbiAgICByZXR1cm4gdGhpcy52YWx1ZSA/IHRoaXMudmFsdWUgOiBkZWZhdWx0VmFsdWU7XG4gIH1cblxufVxuXG5leHBvcnQgY2xhc3MgU29tZTxUPiBleHRlbmRzIE9wdGlvbjxUPiB7XG5cbiAgY29uc3RydWN0b3IodmFsdWU6IFQpIHtcbiAgICBzdXBlcih2YWx1ZSk7XG4gIH1cblxuICBwdWJsaWMgZ2V0IGlzRW1wdHkoKSB7XG4gICAgcmV0dXJuIHRydWU7XG4gIH07XG5cbiAgcHVibGljIGdldCBnZXQoKSB7XG4gICAgcmV0dXJuIHRoaXMudmFsdWU7XG4gIH1cblxuICBwdWJsaWMgZ2V0IHNpemUoKTogbnVtYmVyIHtcbiAgICByZXR1cm4gMTtcbiAgfVxufVxuXG5leHBvcnQgY2xhc3MgTm9uZTxUPiBleHRlbmRzIE9wdGlvbjxUPiB7XG5cbiAgY29uc3RydWN0b3Iobm9uZTogVCA9IG51bGwpIHtcbiAgICBzdXBlcihub25lKTtcbiAgfVxuXG4gIHB1YmxpYyBnZXQgaXNFbXB0eSgpIHtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIHB1YmxpYyBnZXQgZ2V0KCk6IFQge1xuICAgIHRocm93IG5ldyBFcnJvcignTm9uZS5nZXQnKTtcbiAgfVxuXG4gIHB1YmxpYyBnZXQgc2l6ZSgpOiBudW1iZXIge1xuICAgIHJldHVybiAwO1xuICB9XG59XG5cbmV4cG9ydCBjb25zdCBub25lOiBOb25lPGFueT4gPSBuZXcgTm9uZSgpO1xuXG5leHBvcnQgZnVuY3Rpb24gb3B0aW9uPFQ+KHg6IFQpOiBPcHRpb248VD4ge1xuICByZXR1cm4geCA/IHNvbWUoeCkgOiBub25lO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gc29tZTxUPih4OiBUKTogU29tZTxUPiB7XG4gIHJldHVybiBuZXcgU29tZSh4KTtcbn1cbiIsIiJdfQ==
