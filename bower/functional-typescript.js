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
if (window) {
    window['App'] = {
        opt: opt,
        list: list,
        map: map
    };
}

},{"./main/List":5,"./main/Map":6,"./main/Option":7}],4:[function(require,module,exports){
"use strict";
var Option_1 = require('./Option');
var IterableImpl = (function () {
    function IterableImpl(iterator, data) {
        this._iterator = iterator;
        this._data = data;
    }
    IterableImpl.prototype.count = function (p) {
        var count = 0;
        for (var i = this._iterator.next(); !i.done; i = this._iterator.next()) {
            var result = p(i.value);
            count = result ? count + 1 : count;
        }
        return count;
    };
    IterableImpl.prototype.exists = function (p) {
        return !this.find(p).isEmpty();
    };
    IterableImpl.prototype.find = function (p) {
        return this._data.find(p);
    };
    IterableImpl.prototype.forEach = function (f) {
        for (var i = this._iterator.next(); !i.done; i = this._iterator.next()) {
            f(i.value);
        }
    };
    IterableImpl.prototype.foldLeft = function (z) {
        return this._data.foldLeft(z);
    };
    IterableImpl.prototype.foldRight = function (z) {
        return this._data.foldRight(z);
    };
    IterableImpl.prototype.head = function () {
        return this._iterator.next().value;
    };
    IterableImpl.prototype.headOption = function () {
        return Option_1.option(this.head());
    };
    IterableImpl.prototype.isEmpty = function () {
        return this._data.size() === 0;
    };
    IterableImpl.prototype.iterator = function () {
        return this;
    };
    IterableImpl.prototype.drop = function (n) {
        return this._data.drop(n);
    };
    IterableImpl.prototype.dropRight = function (n) {
        return this._data.dropRight(n);
    };
    IterableImpl.prototype.dropWhile = function (p) {
        return this._data.dropWhile(p);
    };
    IterableImpl.prototype.filter = function (p) {
        return this._data.filter(p);
    };
    IterableImpl.prototype.filterNot = function (p) {
        return this._data.filterNot(p);
    };
    IterableImpl.prototype.map = function (f) {
        return this._data.map(f);
    };
    IterableImpl.prototype.size = function () {
        return this._data.size();
    };
    IterableImpl.prototype.toArray = function () {
        return this.toList().toArray();
    };
    IterableImpl.prototype.toList = function () {
        return this._data.toList();
    };
    return IterableImpl;
}());
exports.IterableImpl = IterableImpl;

},{"./Option":7}],5:[function(require,module,exports){
"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var Iterable_1 = require('./Iterable');
var Option_1 = require('./Option');
var es6_shim_1 = require('es6-shim');
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
        var _this = this;
        if (args instanceof es6_shim_1.Array) {
            this._listData = args.concat([]);
        }
        else {
            this._listData = [];
            args.forEach(function (item) {
                _this._listData.push(item);
            });
        }
    }
    List.prototype.contains = function (elem) {
        return this._listData.indexOf(elem) > -1;
    };
    List.prototype.count = function (p) {
        return this._listData.filter(p).length;
    };
    List.prototype.drop = function (n) {
        return list(this._listData.slice(n));
    };
    List.prototype.dropRight = function (n) {
        return list(this._listData.slice(0, n));
    };
    List.prototype.dropWhile = function (p) {
        throw new Error('dropWhile');
    };
    List.prototype.exists = function (p) {
        return !this.find(p).isEmpty();
    };
    List.prototype.filter = function (p) {
        return list(this._listData.filter(p));
    };
    List.prototype.filterNot = function (p) {
        var inverse = function (a) {
            return !p(a);
        };
        return list(this._listData.filter(inverse));
    };
    List.prototype.find = function (p) {
        return Option_1.option(this._listData.find(p));
    };
    List.prototype.foldLeft = function (z) {
        var _this = this;
        var accumulator = z;
        return function (op) {
            _this.forEach(function (item) {
                accumulator = op(accumulator, item);
            });
            return accumulator;
        };
    };
    List.prototype.foldRight = function (z) {
        var reversedList = this.reverse();
        var accumulator = z;
        // Couldn't get delegate call to foldLeft here, TypeScript compiler issue? or bad syntax?
        return function (op) {
            reversedList.forEach(function (item) {
                accumulator = op(item, accumulator);
            });
            return accumulator;
        };
    };
    List.prototype.forEach = function (f) {
        [].concat(this._listData).forEach(f);
    };
    List.prototype._ = function (index) {
        return this.get(index);
    };
    List.prototype.get = function (index) {
        return this._listData[index];
    };
    List.prototype.head = function () {
        return this._listData[0];
    };
    List.prototype.headOption = function () {
        return Option_1.option(this.head());
    };
    List.prototype.isEmpty = function () {
        return this.size() === 0;
    };
    List.prototype.iterator = function () {
        return new ListIterator(this._listData.values(), this);
    };
    List.prototype.map = function (f) {
        var newArray = this._listData.map(f);
        return list(newArray);
    };
    Object.defineProperty(List.prototype, "length", {
        get: function () {
            return this._listData.length;
        },
        enumerable: true,
        configurable: true
    });
    List.prototype.reduce = function (op) {
        return this._listData.reduce(op);
    };
    List.prototype.reverse = function () {
        return new List([].concat(this._listData).reverse());
    };
    List.prototype.size = function () {
        return this.length;
    };
    List.prototype.toArray = function () {
        return [].concat(this._listData);
    };
    List.prototype.toList = function () {
        return list(this._listData);
    };
    List.prototype.toString = function () {
        var rawString = this._listData.join(', ');
        return "List(" + rawString + ")";
    };
    List.prototype.union = function (that) {
        if (that instanceof List) {
            return list(this._listData.concat(that.toArray()));
        }
        else if (that instanceof Array) {
            return list((_a = this._listData).concat.apply(_a, that));
        }
        else {
            throw 'Unsupported Type ' + typeof that;
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
var ListIterator = (function (_super) {
    __extends(ListIterator, _super);
    function ListIterator() {
        _super.apply(this, arguments);
    }
    return ListIterator;
}(Iterable_1.IterableImpl));

},{"./Iterable":4,"./Option":7,"es6-shim":1}],6:[function(require,module,exports){
"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var Iterable_1 = require('./Iterable');
var List_1 = require('./List');
var Option_1 = require('./Option');
var es6_shim_1 = require('es6-shim');
Array = es6_shim_1.Array;
var IMap = (function () {
    function IMap(data) {
        var _this = this;
        this._mapData = new Map();
        if (data) {
            data.forEach(function (pair) {
                _this._mapData.set(pair[0], pair[1]);
            });
        }
    }
    IMap.prototype.count = function (p) {
        return new IMapIterator(this._mapData.entries()).count(p);
    };
    IMap.prototype.drop = function (n) {
        var count = 0;
        var newMap = new Map();
        new IMapIterator(this._mapData.entries()).forEach(function (pair) {
            if (count >= n) {
                newMap.set(pair[0], pair[1]);
            }
        });
        return new IMap(new IMapIterator(this._mapData.entries()));
    };
    IMap.prototype.dropRight = function (n) {
        var count = this._mapData.size - n;
        var newMap = new Map();
        new IMapIterator(this._mapData.entries()).forEach(function (pair) {
            if (count < n) {
                newMap.set(pair[0], pair[1]);
            }
        });
        return new IMap(new IMapIterator(this._mapData.entries()));
    };
    IMap.prototype.dropWhile = function (p) {
        var count = -1;
        new IMapIterator(this._mapData.entries()).forEach(function (pair) {
            if (p(pair)) {
                count++;
            }
        });
        return this.drop(count);
    };
    IMap.prototype.exists = function (p) {
        return !this.find(p).isEmpty();
    };
    IMap.prototype.filter = function (p) {
        var newInternalMap = new Map();
        new IMapIterator(this._mapData.entries()).forEach(function (pair) {
            if (p(pair)) {
                newInternalMap.set(pair[0], pair[1]);
            }
        });
        return new IMap(new IMapIterator(newInternalMap.entries()));
    };
    IMap.prototype.filterNot = function (p) {
        var newInternalMap = new Map();
        new IMapIterator(this._mapData.entries()).forEach(function (pair) {
            if (!p(pair)) {
                newInternalMap.set(pair[0], pair[1]);
            }
        });
        return new IMap(new IMapIterator(newInternalMap.entries()));
    };
    IMap.prototype.find = function (p) {
        return this.toList().find(p);
    };
    IMap.prototype.foldLeft = function (z) {
        return this.toList().foldLeft(z);
    };
    IMap.prototype.foldRight = function (z) {
        return this.toList().foldRight(z);
    };
    IMap.prototype.forEach = function (f) {
        return new IMapIterator(this._mapData.entries()).forEach(f);
    };
    IMap.prototype.get = function (key) {
        return Option_1.option(this._mapData.get(key));
    };
    IMap.prototype.getOrElse = function (key, defaultValue) {
        return Option_1.option(this._mapData.get(key)).getOrElse(defaultValue);
    };
    IMap.prototype.head = function () {
        return this._mapData.entries().next().value;
    };
    IMap.prototype.headOption = function () {
        return Option_1.option(this._mapData.entries().next().value);
    };
    IMap.prototype.isEmpty = function () {
        return this.size() === 0;
    };
    IMap.prototype.iterator = function () {
        return new IMapIterator(this._mapData.entries());
    };
    IMap.prototype.set = function (entry, value) {
        if (entry) {
            if (entry instanceof Array) {
                return iMap(List_1.list([entry]));
            }
            else if (entry && value) {
                return iMap(List_1.list([[entry, value]]));
            }
        }
        else {
            throw Error('Invalid set ' + entry);
        }
    };
    IMap.prototype.map = function (f) {
        var newInternalMap = new Map();
        new IMapIterator(this._mapData.entries()).forEach(function (pair) {
            var newValue = f(pair);
            newInternalMap.set(newValue[0], newValue[1]);
        });
        return new IMap(new IMapIterator(newInternalMap.entries()));
    };
    IMap.prototype.size = function () {
        return this._mapData.size;
    };
    IMap.prototype.toArray = function () {
        return this.toList().toArray();
    };
    IMap.prototype.toList = function () {
        return List_1.list(this.iterator());
    };
    IMap.prototype.toString = function () {
        var rawString = this.toArray().map(function (entry) { return (entry[0] + " -> " + entry[1] + " "); }).join(', ');
        return "Map(" + rawString + ")";
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
    IMapIterator.prototype.dropWhile = function (p) {
        throw new Error();
    };
    IMapIterator.prototype.filter = function (p) {
        throw new Error();
    };
    IMapIterator.prototype.filterNot = function (p) {
        throw new Error();
    };
    IMapIterator.prototype.map = function (f) {
        throw new Error();
    };
    IMapIterator.prototype.toList = function () {
        throw new Error();
    };
    return IMapIterator;
}(Iterable_1.IterableImpl));

},{"./Iterable":4,"./List":5,"./Option":7,"es6-shim":1}],7:[function(require,module,exports){
"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var List_1 = require('./List');
var Option = (function () {
    function Option(value) {
        this.value = value;
    }
    Option.prototype.count = function (p) {
        return this.toList().count(p);
    };
    Option.prototype.drop = function (n) {
        return this.toList().drop(n);
    };
    Option.prototype.dropRight = function (n) {
        return this.toList().dropRight(n);
    };
    Option.prototype.dropWhile = function (p) {
        return this.toList().dropWhile(p);
    };
    Option.prototype.exists = function (p) {
        return !this.find(p).isEmpty();
    };
    Option.prototype.find = function (p) {
        return p(this.get) ? this : exports.none;
    };
    Option.prototype.forEach = function (f) {
        f(this.value);
    };
    Option.prototype.filter = function (p) {
        return p(this.value) ? this : new None();
    };
    Option.prototype.filterNot = function (p) {
        return !p(this.value) ? this : new None();
    };
    Option.prototype.foldLeft = function (z) {
        return this.toList().foldLeft(z);
    };
    Option.prototype.foldRight = function (z) {
        return this.toList().foldRight(z);
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
    Option.prototype.head = function () {
        return this.get;
    };
    Option.prototype.headOption = function () {
        return this;
    };
    Option.prototype.toArray = function () {
        return this.toList().toArray();
    };
    return Option;
}());
exports.Option = Option;
var Some = (function (_super) {
    __extends(Some, _super);
    function Some(value) {
        _super.call(this, value);
    }
    Some.prototype.isEmpty = function () {
        return false;
    };
    Object.defineProperty(Some.prototype, "get", {
        get: function () {
            return this.value;
        },
        enumerable: true,
        configurable: true
    });
    Some.prototype.map = function (f) {
        return new Some(f(this.value));
    };
    Some.prototype.size = function () {
        return 1;
    };
    Some.prototype.toList = function () {
        return new List_1.List([this.value]);
    };
    return Some;
}(Option));
exports.Some = Some;
var None = (function (_super) {
    __extends(None, _super);
    function None() {
        _super.call(this, null);
    }
    None.prototype.isEmpty = function () {
        return true;
    };
    Object.defineProperty(None.prototype, "get", {
        get: function () {
            throw new Error('None.get');
        },
        enumerable: true,
        configurable: true
    });
    None.prototype.map = function (f) {
        return exports.none;
    };
    None.prototype.size = function () {
        return 0;
    };
    None.prototype.toList = function () {
        return new List_1.List([]);
    };
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

},{"./List":5}],8:[function(require,module,exports){

},{}]},{},[3,8])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvZXM2LXNoaW0vZXM2LXNoaW0uanMiLCJub2RlX21vZHVsZXMvcHJvY2Vzcy9icm93c2VyLmpzIiwic3JjL2luZGV4LnRzIiwic3JjL21haW4vSXRlcmFibGUudHMiLCJzcmMvbWFpbi9MaXN0LnRzIiwic3JjL21haW4vTWFwLnRzIiwic3JjL21haW4vT3B0aW9uLnRzIiwidHlwaW5ncy9icm93c2VyLmQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7O0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FB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QUNySkQiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiIC8qIVxuICAqIGh0dHBzOi8vZ2l0aHViLmNvbS9wYXVsbWlsbHIvZXM2LXNoaW1cbiAgKiBAbGljZW5zZSBlczYtc2hpbSBDb3B5cmlnaHQgMjAxMy0yMDE2IGJ5IFBhdWwgTWlsbGVyIChodHRwOi8vcGF1bG1pbGxyLmNvbSlcbiAgKiAgIGFuZCBjb250cmlidXRvcnMsICBNSVQgTGljZW5zZVxuICAqIGVzNi1zaGltOiB2MC4zNS4wXG4gICogc2VlIGh0dHBzOi8vZ2l0aHViLmNvbS9wYXVsbWlsbHIvZXM2LXNoaW0vYmxvYi8wLjM1LjAvTElDRU5TRVxuICAqIERldGFpbHMgYW5kIGRvY3VtZW50YXRpb246XG4gICogaHR0cHM6Ly9naXRodWIuY29tL3BhdWxtaWxsci9lczYtc2hpbS9cbiAgKi9cblxuLy8gVU1EIChVbml2ZXJzYWwgTW9kdWxlIERlZmluaXRpb24pXG4vLyBzZWUgaHR0cHM6Ly9naXRodWIuY29tL3VtZGpzL3VtZC9ibG9iL21hc3Rlci9yZXR1cm5FeHBvcnRzLmpzXG4oZnVuY3Rpb24gKHJvb3QsIGZhY3RvcnkpIHtcbiAgLypnbG9iYWwgZGVmaW5lLCBtb2R1bGUsIGV4cG9ydHMgKi9cbiAgaWYgKHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCkge1xuICAgIC8vIEFNRC4gUmVnaXN0ZXIgYXMgYW4gYW5vbnltb3VzIG1vZHVsZS5cbiAgICBkZWZpbmUoZmFjdG9yeSk7XG4gIH0gZWxzZSBpZiAodHlwZW9mIGV4cG9ydHMgPT09ICdvYmplY3QnKSB7XG4gICAgLy8gTm9kZS4gRG9lcyBub3Qgd29yayB3aXRoIHN0cmljdCBDb21tb25KUywgYnV0XG4gICAgLy8gb25seSBDb21tb25KUy1saWtlIGVudmlyb25tZW50cyB0aGF0IHN1cHBvcnQgbW9kdWxlLmV4cG9ydHMsXG4gICAgLy8gbGlrZSBOb2RlLlxuICAgIG1vZHVsZS5leHBvcnRzID0gZmFjdG9yeSgpO1xuICB9IGVsc2Uge1xuICAgIC8vIEJyb3dzZXIgZ2xvYmFscyAocm9vdCBpcyB3aW5kb3cpXG4gICAgcm9vdC5yZXR1cm5FeHBvcnRzID0gZmFjdG9yeSgpO1xuICB9XG59KHRoaXMsIGZ1bmN0aW9uICgpIHtcbiAgJ3VzZSBzdHJpY3QnO1xuXG4gIHZhciBfYXBwbHkgPSBGdW5jdGlvbi5jYWxsLmJpbmQoRnVuY3Rpb24uYXBwbHkpO1xuICB2YXIgX2NhbGwgPSBGdW5jdGlvbi5jYWxsLmJpbmQoRnVuY3Rpb24uY2FsbCk7XG4gIHZhciBpc0FycmF5ID0gQXJyYXkuaXNBcnJheTtcbiAgdmFyIGtleXMgPSBPYmplY3Qua2V5cztcblxuICB2YXIgbm90ID0gZnVuY3Rpb24gbm90VGh1bmtlcihmdW5jKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uIG5vdFRodW5rKCkgeyByZXR1cm4gIV9hcHBseShmdW5jLCB0aGlzLCBhcmd1bWVudHMpOyB9O1xuICB9O1xuICB2YXIgdGhyb3dzRXJyb3IgPSBmdW5jdGlvbiAoZnVuYykge1xuICAgIHRyeSB7XG4gICAgICBmdW5jKCk7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICB9O1xuICB2YXIgdmFsdWVPckZhbHNlSWZUaHJvd3MgPSBmdW5jdGlvbiB2YWx1ZU9yRmFsc2VJZlRocm93cyhmdW5jKSB7XG4gICAgdHJ5IHtcbiAgICAgIHJldHVybiBmdW5jKCk7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgfTtcblxuICB2YXIgaXNDYWxsYWJsZVdpdGhvdXROZXcgPSBub3QodGhyb3dzRXJyb3IpO1xuICB2YXIgYXJlUHJvcGVydHlEZXNjcmlwdG9yc1N1cHBvcnRlZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAvLyBpZiBPYmplY3QuZGVmaW5lUHJvcGVydHkgZXhpc3RzIGJ1dCB0aHJvd3MsIGl0J3MgSUUgOFxuICAgIHJldHVybiAhdGhyb3dzRXJyb3IoZnVuY3Rpb24gKCkgeyBPYmplY3QuZGVmaW5lUHJvcGVydHkoe30sICd4JywgeyBnZXQ6IGZ1bmN0aW9uICgpIHt9IH0pOyB9KTtcbiAgfTtcbiAgdmFyIHN1cHBvcnRzRGVzY3JpcHRvcnMgPSAhIU9iamVjdC5kZWZpbmVQcm9wZXJ0eSAmJiBhcmVQcm9wZXJ0eURlc2NyaXB0b3JzU3VwcG9ydGVkKCk7XG4gIHZhciBmdW5jdGlvbnNIYXZlTmFtZXMgPSAoZnVuY3Rpb24gZm9vKCkge30pLm5hbWUgPT09ICdmb28nO1xuXG4gIHZhciBfZm9yRWFjaCA9IEZ1bmN0aW9uLmNhbGwuYmluZChBcnJheS5wcm90b3R5cGUuZm9yRWFjaCk7XG4gIHZhciBfcmVkdWNlID0gRnVuY3Rpb24uY2FsbC5iaW5kKEFycmF5LnByb3RvdHlwZS5yZWR1Y2UpO1xuICB2YXIgX2ZpbHRlciA9IEZ1bmN0aW9uLmNhbGwuYmluZChBcnJheS5wcm90b3R5cGUuZmlsdGVyKTtcbiAgdmFyIF9zb21lID0gRnVuY3Rpb24uY2FsbC5iaW5kKEFycmF5LnByb3RvdHlwZS5zb21lKTtcblxuICB2YXIgZGVmaW5lUHJvcGVydHkgPSBmdW5jdGlvbiAob2JqZWN0LCBuYW1lLCB2YWx1ZSwgZm9yY2UpIHtcbiAgICBpZiAoIWZvcmNlICYmIG5hbWUgaW4gb2JqZWN0KSB7IHJldHVybjsgfVxuICAgIGlmIChzdXBwb3J0c0Rlc2NyaXB0b3JzKSB7XG4gICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkob2JqZWN0LCBuYW1lLCB7XG4gICAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZSxcbiAgICAgICAgZW51bWVyYWJsZTogZmFsc2UsXG4gICAgICAgIHdyaXRhYmxlOiB0cnVlLFxuICAgICAgICB2YWx1ZTogdmFsdWVcbiAgICAgIH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICBvYmplY3RbbmFtZV0gPSB2YWx1ZTtcbiAgICB9XG4gIH07XG5cbiAgLy8gRGVmaW5lIGNvbmZpZ3VyYWJsZSwgd3JpdGFibGUgYW5kIG5vbi1lbnVtZXJhYmxlIHByb3BzXG4gIC8vIGlmIHRoZXkgZG9u4oCZdCBleGlzdC5cbiAgdmFyIGRlZmluZVByb3BlcnRpZXMgPSBmdW5jdGlvbiAob2JqZWN0LCBtYXAsIGZvcmNlT3ZlcnJpZGUpIHtcbiAgICBfZm9yRWFjaChrZXlzKG1hcCksIGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgICB2YXIgbWV0aG9kID0gbWFwW25hbWVdO1xuICAgICAgZGVmaW5lUHJvcGVydHkob2JqZWN0LCBuYW1lLCBtZXRob2QsICEhZm9yY2VPdmVycmlkZSk7XG4gICAgfSk7XG4gIH07XG5cbiAgdmFyIF90b1N0cmluZyA9IEZ1bmN0aW9uLmNhbGwuYmluZChPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nKTtcbiAgdmFyIGlzQ2FsbGFibGUgPSB0eXBlb2YgL2FiYy8gPT09ICdmdW5jdGlvbicgPyBmdW5jdGlvbiBJc0NhbGxhYmxlU2xvdyh4KSB7XG4gICAgLy8gU29tZSBvbGQgYnJvd3NlcnMgKElFLCBGRikgc2F5IHRoYXQgdHlwZW9mIC9hYmMvID09PSAnZnVuY3Rpb24nXG4gICAgcmV0dXJuIHR5cGVvZiB4ID09PSAnZnVuY3Rpb24nICYmIF90b1N0cmluZyh4KSA9PT0gJ1tvYmplY3QgRnVuY3Rpb25dJztcbiAgfSA6IGZ1bmN0aW9uIElzQ2FsbGFibGVGYXN0KHgpIHsgcmV0dXJuIHR5cGVvZiB4ID09PSAnZnVuY3Rpb24nOyB9O1xuXG4gIHZhciBWYWx1ZSA9IHtcbiAgICBnZXR0ZXI6IGZ1bmN0aW9uIChvYmplY3QsIG5hbWUsIGdldHRlcikge1xuICAgICAgaWYgKCFzdXBwb3J0c0Rlc2NyaXB0b3JzKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ2dldHRlcnMgcmVxdWlyZSB0cnVlIEVTNSBzdXBwb3J0Jyk7XG4gICAgICB9XG4gICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkob2JqZWN0LCBuYW1lLCB7XG4gICAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZSxcbiAgICAgICAgZW51bWVyYWJsZTogZmFsc2UsXG4gICAgICAgIGdldDogZ2V0dGVyXG4gICAgICB9KTtcbiAgICB9LFxuICAgIHByb3h5OiBmdW5jdGlvbiAob3JpZ2luYWxPYmplY3QsIGtleSwgdGFyZ2V0T2JqZWN0KSB7XG4gICAgICBpZiAoIXN1cHBvcnRzRGVzY3JpcHRvcnMpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignZ2V0dGVycyByZXF1aXJlIHRydWUgRVM1IHN1cHBvcnQnKTtcbiAgICAgIH1cbiAgICAgIHZhciBvcmlnaW5hbERlc2NyaXB0b3IgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKG9yaWdpbmFsT2JqZWN0LCBrZXkpO1xuICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRhcmdldE9iamVjdCwga2V5LCB7XG4gICAgICAgIGNvbmZpZ3VyYWJsZTogb3JpZ2luYWxEZXNjcmlwdG9yLmNvbmZpZ3VyYWJsZSxcbiAgICAgICAgZW51bWVyYWJsZTogb3JpZ2luYWxEZXNjcmlwdG9yLmVudW1lcmFibGUsXG4gICAgICAgIGdldDogZnVuY3Rpb24gZ2V0S2V5KCkgeyByZXR1cm4gb3JpZ2luYWxPYmplY3Rba2V5XTsgfSxcbiAgICAgICAgc2V0OiBmdW5jdGlvbiBzZXRLZXkodmFsdWUpIHsgb3JpZ2luYWxPYmplY3Rba2V5XSA9IHZhbHVlOyB9XG4gICAgICB9KTtcbiAgICB9LFxuICAgIHJlZGVmaW5lOiBmdW5jdGlvbiAob2JqZWN0LCBwcm9wZXJ0eSwgbmV3VmFsdWUpIHtcbiAgICAgIGlmIChzdXBwb3J0c0Rlc2NyaXB0b3JzKSB7XG4gICAgICAgIHZhciBkZXNjcmlwdG9yID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcihvYmplY3QsIHByb3BlcnR5KTtcbiAgICAgICAgZGVzY3JpcHRvci52YWx1ZSA9IG5ld1ZhbHVlO1xuICAgICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkob2JqZWN0LCBwcm9wZXJ0eSwgZGVzY3JpcHRvcik7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBvYmplY3RbcHJvcGVydHldID0gbmV3VmFsdWU7XG4gICAgICB9XG4gICAgfSxcbiAgICBkZWZpbmVCeURlc2NyaXB0b3I6IGZ1bmN0aW9uIChvYmplY3QsIHByb3BlcnR5LCBkZXNjcmlwdG9yKSB7XG4gICAgICBpZiAoc3VwcG9ydHNEZXNjcmlwdG9ycykge1xuICAgICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkob2JqZWN0LCBwcm9wZXJ0eSwgZGVzY3JpcHRvcik7XG4gICAgICB9IGVsc2UgaWYgKCd2YWx1ZScgaW4gZGVzY3JpcHRvcikge1xuICAgICAgICBvYmplY3RbcHJvcGVydHldID0gZGVzY3JpcHRvci52YWx1ZTtcbiAgICAgIH1cbiAgICB9LFxuICAgIHByZXNlcnZlVG9TdHJpbmc6IGZ1bmN0aW9uICh0YXJnZXQsIHNvdXJjZSkge1xuICAgICAgaWYgKHNvdXJjZSAmJiBpc0NhbGxhYmxlKHNvdXJjZS50b1N0cmluZykpIHtcbiAgICAgICAgZGVmaW5lUHJvcGVydHkodGFyZ2V0LCAndG9TdHJpbmcnLCBzb3VyY2UudG9TdHJpbmcuYmluZChzb3VyY2UpLCB0cnVlKTtcbiAgICAgIH1cbiAgICB9XG4gIH07XG5cbiAgLy8gU2ltcGxlIHNoaW0gZm9yIE9iamVjdC5jcmVhdGUgb24gRVMzIGJyb3dzZXJzXG4gIC8vICh1bmxpa2UgcmVhbCBzaGltLCBubyBhdHRlbXB0IHRvIHN1cHBvcnQgYHByb3RvdHlwZSA9PT0gbnVsbGApXG4gIHZhciBjcmVhdGUgPSBPYmplY3QuY3JlYXRlIHx8IGZ1bmN0aW9uIChwcm90b3R5cGUsIHByb3BlcnRpZXMpIHtcbiAgICB2YXIgUHJvdG90eXBlID0gZnVuY3Rpb24gUHJvdG90eXBlKCkge307XG4gICAgUHJvdG90eXBlLnByb3RvdHlwZSA9IHByb3RvdHlwZTtcbiAgICB2YXIgb2JqZWN0ID0gbmV3IFByb3RvdHlwZSgpO1xuICAgIGlmICh0eXBlb2YgcHJvcGVydGllcyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgIGtleXMocHJvcGVydGllcykuZm9yRWFjaChmdW5jdGlvbiAoa2V5KSB7XG4gICAgICAgIFZhbHVlLmRlZmluZUJ5RGVzY3JpcHRvcihvYmplY3QsIGtleSwgcHJvcGVydGllc1trZXldKTtcbiAgICAgIH0pO1xuICAgIH1cbiAgICByZXR1cm4gb2JqZWN0O1xuICB9O1xuXG4gIHZhciBzdXBwb3J0c1N1YmNsYXNzaW5nID0gZnVuY3Rpb24gKEMsIGYpIHtcbiAgICBpZiAoIU9iamVjdC5zZXRQcm90b3R5cGVPZikgeyByZXR1cm4gZmFsc2U7IC8qIHNraXAgdGVzdCBvbiBJRSA8IDExICovIH1cbiAgICByZXR1cm4gdmFsdWVPckZhbHNlSWZUaHJvd3MoZnVuY3Rpb24gKCkge1xuICAgICAgdmFyIFN1YiA9IGZ1bmN0aW9uIFN1YmNsYXNzKGFyZykge1xuICAgICAgICB2YXIgbyA9IG5ldyBDKGFyZyk7XG4gICAgICAgIE9iamVjdC5zZXRQcm90b3R5cGVPZihvLCBTdWJjbGFzcy5wcm90b3R5cGUpO1xuICAgICAgICByZXR1cm4gbztcbiAgICAgIH07XG4gICAgICBPYmplY3Quc2V0UHJvdG90eXBlT2YoU3ViLCBDKTtcbiAgICAgIFN1Yi5wcm90b3R5cGUgPSBjcmVhdGUoQy5wcm90b3R5cGUsIHtcbiAgICAgICAgY29uc3RydWN0b3I6IHsgdmFsdWU6IFN1YiB9XG4gICAgICB9KTtcbiAgICAgIHJldHVybiBmKFN1Yik7XG4gICAgfSk7XG4gIH07XG5cbiAgdmFyIGdldEdsb2JhbCA9IGZ1bmN0aW9uICgpIHtcbiAgICAvKiBnbG9iYWwgc2VsZiwgd2luZG93LCBnbG9iYWwgKi9cbiAgICAvLyB0aGUgb25seSByZWxpYWJsZSBtZWFucyB0byBnZXQgdGhlIGdsb2JhbCBvYmplY3QgaXNcbiAgICAvLyBgRnVuY3Rpb24oJ3JldHVybiB0aGlzJykoKWBcbiAgICAvLyBIb3dldmVyLCB0aGlzIGNhdXNlcyBDU1AgdmlvbGF0aW9ucyBpbiBDaHJvbWUgYXBwcy5cbiAgICBpZiAodHlwZW9mIHNlbGYgIT09ICd1bmRlZmluZWQnKSB7IHJldHVybiBzZWxmOyB9XG4gICAgaWYgKHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnKSB7IHJldHVybiB3aW5kb3c7IH1cbiAgICBpZiAodHlwZW9mIGdsb2JhbCAhPT0gJ3VuZGVmaW5lZCcpIHsgcmV0dXJuIGdsb2JhbDsgfVxuICAgIHRocm93IG5ldyBFcnJvcigndW5hYmxlIHRvIGxvY2F0ZSBnbG9iYWwgb2JqZWN0Jyk7XG4gIH07XG5cbiAgdmFyIGdsb2JhbHMgPSBnZXRHbG9iYWwoKTtcbiAgdmFyIGdsb2JhbElzRmluaXRlID0gZ2xvYmFscy5pc0Zpbml0ZTtcbiAgdmFyIF9pbmRleE9mID0gRnVuY3Rpb24uY2FsbC5iaW5kKFN0cmluZy5wcm90b3R5cGUuaW5kZXhPZik7XG4gIHZhciBfYXJyYXlJbmRleE9mQXBwbHkgPSBGdW5jdGlvbi5hcHBseS5iaW5kKEFycmF5LnByb3RvdHlwZS5pbmRleE9mKTtcbiAgdmFyIF9jb25jYXQgPSBGdW5jdGlvbi5jYWxsLmJpbmQoQXJyYXkucHJvdG90eXBlLmNvbmNhdCk7XG4gIHZhciBfc29ydCA9IEZ1bmN0aW9uLmNhbGwuYmluZChBcnJheS5wcm90b3R5cGUuc29ydCk7XG4gIHZhciBfc3RyU2xpY2UgPSBGdW5jdGlvbi5jYWxsLmJpbmQoU3RyaW5nLnByb3RvdHlwZS5zbGljZSk7XG4gIHZhciBfcHVzaCA9IEZ1bmN0aW9uLmNhbGwuYmluZChBcnJheS5wcm90b3R5cGUucHVzaCk7XG4gIHZhciBfcHVzaEFwcGx5ID0gRnVuY3Rpb24uYXBwbHkuYmluZChBcnJheS5wcm90b3R5cGUucHVzaCk7XG4gIHZhciBfc2hpZnQgPSBGdW5jdGlvbi5jYWxsLmJpbmQoQXJyYXkucHJvdG90eXBlLnNoaWZ0KTtcbiAgdmFyIF9tYXggPSBNYXRoLm1heDtcbiAgdmFyIF9taW4gPSBNYXRoLm1pbjtcbiAgdmFyIF9mbG9vciA9IE1hdGguZmxvb3I7XG4gIHZhciBfYWJzID0gTWF0aC5hYnM7XG4gIHZhciBfbG9nID0gTWF0aC5sb2c7XG4gIHZhciBfc3FydCA9IE1hdGguc3FydDtcbiAgdmFyIF9oYXNPd25Qcm9wZXJ0eSA9IEZ1bmN0aW9uLmNhbGwuYmluZChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5KTtcbiAgdmFyIEFycmF5SXRlcmF0b3I7IC8vIG1ha2Ugb3VyIGltcGxlbWVudGF0aW9uIHByaXZhdGVcbiAgdmFyIG5vb3AgPSBmdW5jdGlvbiAoKSB7fTtcblxuICB2YXIgU3ltYm9sID0gZ2xvYmFscy5TeW1ib2wgfHwge307XG4gIHZhciBzeW1ib2xTcGVjaWVzID0gU3ltYm9sLnNwZWNpZXMgfHwgJ0BAc3BlY2llcyc7XG5cbiAgdmFyIG51bWJlcklzTmFOID0gTnVtYmVyLmlzTmFOIHx8IGZ1bmN0aW9uIGlzTmFOKHZhbHVlKSB7XG4gICAgLy8gTmFOICE9PSBOYU4sIGJ1dCB0aGV5IGFyZSBpZGVudGljYWwuXG4gICAgLy8gTmFOcyBhcmUgdGhlIG9ubHkgbm9uLXJlZmxleGl2ZSB2YWx1ZSwgaS5lLiwgaWYgeCAhPT0geCxcbiAgICAvLyB0aGVuIHggaXMgTmFOLlxuICAgIC8vIGlzTmFOIGlzIGJyb2tlbjogaXQgY29udmVydHMgaXRzIGFyZ3VtZW50IHRvIG51bWJlciwgc29cbiAgICAvLyBpc05hTignZm9vJykgPT4gdHJ1ZVxuICAgIHJldHVybiB2YWx1ZSAhPT0gdmFsdWU7XG4gIH07XG4gIHZhciBudW1iZXJJc0Zpbml0ZSA9IE51bWJlci5pc0Zpbml0ZSB8fCBmdW5jdGlvbiBpc0Zpbml0ZSh2YWx1ZSkge1xuICAgIHJldHVybiB0eXBlb2YgdmFsdWUgPT09ICdudW1iZXInICYmIGdsb2JhbElzRmluaXRlKHZhbHVlKTtcbiAgfTtcblxuICAvLyB0YWtlbiBkaXJlY3RseSBmcm9tIGh0dHBzOi8vZ2l0aHViLmNvbS9samhhcmIvaXMtYXJndW1lbnRzL2Jsb2IvbWFzdGVyL2luZGV4LmpzXG4gIC8vIGNhbiBiZSByZXBsYWNlZCB3aXRoIHJlcXVpcmUoJ2lzLWFyZ3VtZW50cycpIGlmIHdlIGV2ZXIgdXNlIGEgYnVpbGQgcHJvY2VzcyBpbnN0ZWFkXG4gIHZhciBpc1N0YW5kYXJkQXJndW1lbnRzID0gZnVuY3Rpb24gaXNBcmd1bWVudHModmFsdWUpIHtcbiAgICByZXR1cm4gX3RvU3RyaW5nKHZhbHVlKSA9PT0gJ1tvYmplY3QgQXJndW1lbnRzXSc7XG4gIH07XG4gIHZhciBpc0xlZ2FjeUFyZ3VtZW50cyA9IGZ1bmN0aW9uIGlzQXJndW1lbnRzKHZhbHVlKSB7XG4gICAgcmV0dXJuIHZhbHVlICE9PSBudWxsICYmXG4gICAgICB0eXBlb2YgdmFsdWUgPT09ICdvYmplY3QnICYmXG4gICAgICB0eXBlb2YgdmFsdWUubGVuZ3RoID09PSAnbnVtYmVyJyAmJlxuICAgICAgdmFsdWUubGVuZ3RoID49IDAgJiZcbiAgICAgIF90b1N0cmluZyh2YWx1ZSkgIT09ICdbb2JqZWN0IEFycmF5XScgJiZcbiAgICAgIF90b1N0cmluZyh2YWx1ZS5jYWxsZWUpID09PSAnW29iamVjdCBGdW5jdGlvbl0nO1xuICB9O1xuICB2YXIgaXNBcmd1bWVudHMgPSBpc1N0YW5kYXJkQXJndW1lbnRzKGFyZ3VtZW50cykgPyBpc1N0YW5kYXJkQXJndW1lbnRzIDogaXNMZWdhY3lBcmd1bWVudHM7XG5cbiAgdmFyIFR5cGUgPSB7XG4gICAgcHJpbWl0aXZlOiBmdW5jdGlvbiAoeCkgeyByZXR1cm4geCA9PT0gbnVsbCB8fCAodHlwZW9mIHggIT09ICdmdW5jdGlvbicgJiYgdHlwZW9mIHggIT09ICdvYmplY3QnKTsgfSxcbiAgICBvYmplY3Q6IGZ1bmN0aW9uICh4KSB7IHJldHVybiB4ICE9PSBudWxsICYmIHR5cGVvZiB4ID09PSAnb2JqZWN0JzsgfSxcbiAgICBzdHJpbmc6IGZ1bmN0aW9uICh4KSB7IHJldHVybiBfdG9TdHJpbmcoeCkgPT09ICdbb2JqZWN0IFN0cmluZ10nOyB9LFxuICAgIHJlZ2V4OiBmdW5jdGlvbiAoeCkgeyByZXR1cm4gX3RvU3RyaW5nKHgpID09PSAnW29iamVjdCBSZWdFeHBdJzsgfSxcbiAgICBzeW1ib2w6IGZ1bmN0aW9uICh4KSB7XG4gICAgICByZXR1cm4gdHlwZW9mIGdsb2JhbHMuU3ltYm9sID09PSAnZnVuY3Rpb24nICYmIHR5cGVvZiB4ID09PSAnc3ltYm9sJztcbiAgICB9XG4gIH07XG5cbiAgdmFyIG92ZXJyaWRlTmF0aXZlID0gZnVuY3Rpb24gb3ZlcnJpZGVOYXRpdmUob2JqZWN0LCBwcm9wZXJ0eSwgcmVwbGFjZW1lbnQpIHtcbiAgICB2YXIgb3JpZ2luYWwgPSBvYmplY3RbcHJvcGVydHldO1xuICAgIGRlZmluZVByb3BlcnR5KG9iamVjdCwgcHJvcGVydHksIHJlcGxhY2VtZW50LCB0cnVlKTtcbiAgICBWYWx1ZS5wcmVzZXJ2ZVRvU3RyaW5nKG9iamVjdFtwcm9wZXJ0eV0sIG9yaWdpbmFsKTtcbiAgfTtcblxuICB2YXIgaGFzU3ltYm9scyA9IHR5cGVvZiBTeW1ib2wgPT09ICdmdW5jdGlvbicgJiYgdHlwZW9mIFN5bWJvbFsnZm9yJ10gPT09ICdmdW5jdGlvbicgJiYgVHlwZS5zeW1ib2woU3ltYm9sKCkpO1xuXG4gIC8vIFRoaXMgaXMgYSBwcml2YXRlIG5hbWUgaW4gdGhlIGVzNiBzcGVjLCBlcXVhbCB0byAnW1N5bWJvbC5pdGVyYXRvcl0nXG4gIC8vIHdlJ3JlIGdvaW5nIHRvIHVzZSBhbiBhcmJpdHJhcnkgXy1wcmVmaXhlZCBuYW1lIHRvIG1ha2Ugb3VyIHNoaW1zXG4gIC8vIHdvcmsgcHJvcGVybHkgd2l0aCBlYWNoIG90aGVyLCBldmVuIHRob3VnaCB3ZSBkb24ndCBoYXZlIGZ1bGwgSXRlcmF0b3JcbiAgLy8gc3VwcG9ydC4gIFRoYXQgaXMsIGBBcnJheS5mcm9tKG1hcC5rZXlzKCkpYCB3aWxsIHdvcmssIGJ1dCB3ZSBkb24ndFxuICAvLyBwcmV0ZW5kIHRvIGV4cG9ydCBhIFwicmVhbFwiIEl0ZXJhdG9yIGludGVyZmFjZS5cbiAgdmFyICRpdGVyYXRvciQgPSBUeXBlLnN5bWJvbChTeW1ib2wuaXRlcmF0b3IpID8gU3ltYm9sLml0ZXJhdG9yIDogJ19lczYtc2hpbSBpdGVyYXRvcl8nO1xuICAvLyBGaXJlZm94IHNoaXBzIGEgcGFydGlhbCBpbXBsZW1lbnRhdGlvbiB1c2luZyB0aGUgbmFtZSBAQGl0ZXJhdG9yLlxuICAvLyBodHRwczovL2J1Z3ppbGxhLm1vemlsbGEub3JnL3Nob3dfYnVnLmNnaT9pZD05MDcwNzcjYzE0XG4gIC8vIFNvIHVzZSB0aGF0IG5hbWUgaWYgd2UgZGV0ZWN0IGl0LlxuICBpZiAoZ2xvYmFscy5TZXQgJiYgdHlwZW9mIG5ldyBnbG9iYWxzLlNldCgpWydAQGl0ZXJhdG9yJ10gPT09ICdmdW5jdGlvbicpIHtcbiAgICAkaXRlcmF0b3IkID0gJ0BAaXRlcmF0b3InO1xuICB9XG5cbiAgLy8gUmVmbGVjdFxuICBpZiAoIWdsb2JhbHMuUmVmbGVjdCkge1xuICAgIGRlZmluZVByb3BlcnR5KGdsb2JhbHMsICdSZWZsZWN0Jywge30sIHRydWUpO1xuICB9XG4gIHZhciBSZWZsZWN0ID0gZ2xvYmFscy5SZWZsZWN0O1xuXG4gIHZhciAkU3RyaW5nID0gU3RyaW5nO1xuXG4gIHZhciBFUyA9IHtcbiAgICAvLyBodHRwczovL3Blb3BsZS5tb3ppbGxhLm9yZy9+am9yZW5kb3JmZi9lczYtZHJhZnQuaHRtbCNzZWMtY2FsbC1mLXYtYXJnc1xuICAgIENhbGw6IGZ1bmN0aW9uIENhbGwoRiwgVikge1xuICAgICAgdmFyIGFyZ3MgPSBhcmd1bWVudHMubGVuZ3RoID4gMiA/IGFyZ3VtZW50c1syXSA6IFtdO1xuICAgICAgaWYgKCFFUy5Jc0NhbGxhYmxlKEYpKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoRiArICcgaXMgbm90IGEgZnVuY3Rpb24nKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBfYXBwbHkoRiwgViwgYXJncyk7XG4gICAgfSxcblxuICAgIFJlcXVpcmVPYmplY3RDb2VyY2libGU6IGZ1bmN0aW9uICh4LCBvcHRNZXNzYWdlKSB7XG4gICAgICAvKiBqc2hpbnQgZXFudWxsOnRydWUgKi9cbiAgICAgIGlmICh4ID09IG51bGwpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihvcHRNZXNzYWdlIHx8ICdDYW5ub3QgY2FsbCBtZXRob2Qgb24gJyArIHgpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHg7XG4gICAgfSxcblxuICAgIC8vIFRoaXMgbWlnaHQgbWlzcyB0aGUgXCIobm9uLXN0YW5kYXJkIGV4b3RpYyBhbmQgZG9lcyBub3QgaW1wbGVtZW50XG4gICAgLy8gW1tDYWxsXV0pXCIgY2FzZSBmcm9tXG4gICAgLy8gaHR0cDovL3d3dy5lY21hLWludGVybmF0aW9uYWwub3JnL2VjbWEtMjYyLzYuMC8jc2VjLXR5cGVvZi1vcGVyYXRvci1ydW50aW1lLXNlbWFudGljcy1ldmFsdWF0aW9uXG4gICAgLy8gYnV0IHdlIGNhbid0IGZpbmQgYW55IGV2aWRlbmNlIHRoZXNlIG9iamVjdHMgZXhpc3QgaW4gcHJhY3RpY2UuXG4gICAgLy8gSWYgd2UgZmluZCBzb21lIGluIHRoZSBmdXR1cmUsIHlvdSBjb3VsZCB0ZXN0IGBPYmplY3QoeCkgPT09IHhgLFxuICAgIC8vIHdoaWNoIGlzIHJlbGlhYmxlIGFjY29yZGluZyB0b1xuICAgIC8vIGh0dHA6Ly93d3cuZWNtYS1pbnRlcm5hdGlvbmFsLm9yZy9lY21hLTI2Mi82LjAvI3NlYy10b29iamVjdFxuICAgIC8vIGJ1dCBpcyBub3Qgd2VsbCBvcHRpbWl6ZWQgYnkgcnVudGltZXMgYW5kIGNyZWF0ZXMgYW4gb2JqZWN0XG4gICAgLy8gd2hlbmV2ZXIgaXQgcmV0dXJucyBmYWxzZSwgYW5kIHRodXMgaXMgdmVyeSBzbG93LlxuICAgIFR5cGVJc09iamVjdDogZnVuY3Rpb24gKHgpIHtcbiAgICAgIGlmICh4ID09PSB2b2lkIDAgfHwgeCA9PT0gbnVsbCB8fCB4ID09PSB0cnVlIHx8IHggPT09IGZhbHNlKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICAgIHJldHVybiB0eXBlb2YgeCA9PT0gJ2Z1bmN0aW9uJyB8fCB0eXBlb2YgeCA9PT0gJ29iamVjdCc7XG4gICAgfSxcblxuICAgIFRvT2JqZWN0OiBmdW5jdGlvbiAobywgb3B0TWVzc2FnZSkge1xuICAgICAgcmV0dXJuIE9iamVjdChFUy5SZXF1aXJlT2JqZWN0Q29lcmNpYmxlKG8sIG9wdE1lc3NhZ2UpKTtcbiAgICB9LFxuXG4gICAgSXNDYWxsYWJsZTogaXNDYWxsYWJsZSxcblxuICAgIElzQ29uc3RydWN0b3I6IGZ1bmN0aW9uICh4KSB7XG4gICAgICAvLyBXZSBjYW4ndCB0ZWxsIGNhbGxhYmxlcyBmcm9tIGNvbnN0cnVjdG9ycyBpbiBFUzVcbiAgICAgIHJldHVybiBFUy5Jc0NhbGxhYmxlKHgpO1xuICAgIH0sXG5cbiAgICBUb0ludDMyOiBmdW5jdGlvbiAoeCkge1xuICAgICAgcmV0dXJuIEVTLlRvTnVtYmVyKHgpID4+IDA7XG4gICAgfSxcblxuICAgIFRvVWludDMyOiBmdW5jdGlvbiAoeCkge1xuICAgICAgcmV0dXJuIEVTLlRvTnVtYmVyKHgpID4+PiAwO1xuICAgIH0sXG5cbiAgICBUb051bWJlcjogZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICBpZiAoX3RvU3RyaW5nKHZhbHVlKSA9PT0gJ1tvYmplY3QgU3ltYm9sXScpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignQ2Fubm90IGNvbnZlcnQgYSBTeW1ib2wgdmFsdWUgdG8gYSBudW1iZXInKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiArdmFsdWU7XG4gICAgfSxcblxuICAgIFRvSW50ZWdlcjogZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICB2YXIgbnVtYmVyID0gRVMuVG9OdW1iZXIodmFsdWUpO1xuICAgICAgaWYgKG51bWJlcklzTmFOKG51bWJlcikpIHsgcmV0dXJuIDA7IH1cbiAgICAgIGlmIChudW1iZXIgPT09IDAgfHwgIW51bWJlcklzRmluaXRlKG51bWJlcikpIHsgcmV0dXJuIG51bWJlcjsgfVxuICAgICAgcmV0dXJuIChudW1iZXIgPiAwID8gMSA6IC0xKSAqIF9mbG9vcihfYWJzKG51bWJlcikpO1xuICAgIH0sXG5cbiAgICBUb0xlbmd0aDogZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICB2YXIgbGVuID0gRVMuVG9JbnRlZ2VyKHZhbHVlKTtcbiAgICAgIGlmIChsZW4gPD0gMCkgeyByZXR1cm4gMDsgfSAvLyBpbmNsdWRlcyBjb252ZXJ0aW5nIC0wIHRvICswXG4gICAgICBpZiAobGVuID4gTnVtYmVyLk1BWF9TQUZFX0lOVEVHRVIpIHsgcmV0dXJuIE51bWJlci5NQVhfU0FGRV9JTlRFR0VSOyB9XG4gICAgICByZXR1cm4gbGVuO1xuICAgIH0sXG5cbiAgICBTYW1lVmFsdWU6IGZ1bmN0aW9uIChhLCBiKSB7XG4gICAgICBpZiAoYSA9PT0gYikge1xuICAgICAgICAvLyAwID09PSAtMCwgYnV0IHRoZXkgYXJlIG5vdCBpZGVudGljYWwuXG4gICAgICAgIGlmIChhID09PSAwKSB7IHJldHVybiAxIC8gYSA9PT0gMSAvIGI7IH1cbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9XG4gICAgICByZXR1cm4gbnVtYmVySXNOYU4oYSkgJiYgbnVtYmVySXNOYU4oYik7XG4gICAgfSxcblxuICAgIFNhbWVWYWx1ZVplcm86IGZ1bmN0aW9uIChhLCBiKSB7XG4gICAgICAvLyBzYW1lIGFzIFNhbWVWYWx1ZSBleGNlcHQgZm9yIFNhbWVWYWx1ZVplcm8oKzAsIC0wKSA9PSB0cnVlXG4gICAgICByZXR1cm4gKGEgPT09IGIpIHx8IChudW1iZXJJc05hTihhKSAmJiBudW1iZXJJc05hTihiKSk7XG4gICAgfSxcblxuICAgIElzSXRlcmFibGU6IGZ1bmN0aW9uIChvKSB7XG4gICAgICByZXR1cm4gRVMuVHlwZUlzT2JqZWN0KG8pICYmICh0eXBlb2Ygb1skaXRlcmF0b3IkXSAhPT0gJ3VuZGVmaW5lZCcgfHwgaXNBcmd1bWVudHMobykpO1xuICAgIH0sXG5cbiAgICBHZXRJdGVyYXRvcjogZnVuY3Rpb24gKG8pIHtcbiAgICAgIGlmIChpc0FyZ3VtZW50cyhvKSkge1xuICAgICAgICAvLyBzcGVjaWFsIGNhc2Ugc3VwcG9ydCBmb3IgYGFyZ3VtZW50c2BcbiAgICAgICAgcmV0dXJuIG5ldyBBcnJheUl0ZXJhdG9yKG8sICd2YWx1ZScpO1xuICAgICAgfVxuICAgICAgdmFyIGl0Rm4gPSBFUy5HZXRNZXRob2QobywgJGl0ZXJhdG9yJCk7XG4gICAgICBpZiAoIUVTLklzQ2FsbGFibGUoaXRGbikpIHtcbiAgICAgICAgLy8gQmV0dGVyIGRpYWdub3N0aWNzIGlmIGl0Rm4gaXMgbnVsbCBvciB1bmRlZmluZWRcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcigndmFsdWUgaXMgbm90IGFuIGl0ZXJhYmxlJyk7XG4gICAgICB9XG4gICAgICB2YXIgaXQgPSBFUy5DYWxsKGl0Rm4sIG8pO1xuICAgICAgaWYgKCFFUy5UeXBlSXNPYmplY3QoaXQpKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ2JhZCBpdGVyYXRvcicpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGl0O1xuICAgIH0sXG5cbiAgICBHZXRNZXRob2Q6IGZ1bmN0aW9uIChvLCBwKSB7XG4gICAgICB2YXIgZnVuYyA9IEVTLlRvT2JqZWN0KG8pW3BdO1xuICAgICAgaWYgKGZ1bmMgPT09IHZvaWQgMCB8fCBmdW5jID09PSBudWxsKSB7XG4gICAgICAgIHJldHVybiB2b2lkIDA7XG4gICAgICB9XG4gICAgICBpZiAoIUVTLklzQ2FsbGFibGUoZnVuYykpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignTWV0aG9kIG5vdCBjYWxsYWJsZTogJyArIHApO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGZ1bmM7XG4gICAgfSxcblxuICAgIEl0ZXJhdG9yQ29tcGxldGU6IGZ1bmN0aW9uIChpdGVyUmVzdWx0KSB7XG4gICAgICByZXR1cm4gISEoaXRlclJlc3VsdC5kb25lKTtcbiAgICB9LFxuXG4gICAgSXRlcmF0b3JDbG9zZTogZnVuY3Rpb24gKGl0ZXJhdG9yLCBjb21wbGV0aW9uSXNUaHJvdykge1xuICAgICAgdmFyIHJldHVybk1ldGhvZCA9IEVTLkdldE1ldGhvZChpdGVyYXRvciwgJ3JldHVybicpO1xuICAgICAgaWYgKHJldHVybk1ldGhvZCA9PT0gdm9pZCAwKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIHZhciBpbm5lclJlc3VsdCwgaW5uZXJFeGNlcHRpb247XG4gICAgICB0cnkge1xuICAgICAgICBpbm5lclJlc3VsdCA9IEVTLkNhbGwocmV0dXJuTWV0aG9kLCBpdGVyYXRvcik7XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGlubmVyRXhjZXB0aW9uID0gZTtcbiAgICAgIH1cbiAgICAgIGlmIChjb21wbGV0aW9uSXNUaHJvdykge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBpZiAoaW5uZXJFeGNlcHRpb24pIHtcbiAgICAgICAgdGhyb3cgaW5uZXJFeGNlcHRpb247XG4gICAgICB9XG4gICAgICBpZiAoIUVTLlR5cGVJc09iamVjdChpbm5lclJlc3VsdCkpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcIkl0ZXJhdG9yJ3MgcmV0dXJuIG1ldGhvZCByZXR1cm5lZCBhIG5vbi1vYmplY3QuXCIpO1xuICAgICAgfVxuICAgIH0sXG5cbiAgICBJdGVyYXRvck5leHQ6IGZ1bmN0aW9uIChpdCkge1xuICAgICAgdmFyIHJlc3VsdCA9IGFyZ3VtZW50cy5sZW5ndGggPiAxID8gaXQubmV4dChhcmd1bWVudHNbMV0pIDogaXQubmV4dCgpO1xuICAgICAgaWYgKCFFUy5UeXBlSXNPYmplY3QocmVzdWx0KSkge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdiYWQgaXRlcmF0b3InKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfSxcblxuICAgIEl0ZXJhdG9yU3RlcDogZnVuY3Rpb24gKGl0KSB7XG4gICAgICB2YXIgcmVzdWx0ID0gRVMuSXRlcmF0b3JOZXh0KGl0KTtcbiAgICAgIHZhciBkb25lID0gRVMuSXRlcmF0b3JDb21wbGV0ZShyZXN1bHQpO1xuICAgICAgcmV0dXJuIGRvbmUgPyBmYWxzZSA6IHJlc3VsdDtcbiAgICB9LFxuXG4gICAgQ29uc3RydWN0OiBmdW5jdGlvbiAoQywgYXJncywgbmV3VGFyZ2V0LCBpc0VTNmludGVybmFsKSB7XG4gICAgICB2YXIgdGFyZ2V0ID0gdHlwZW9mIG5ld1RhcmdldCA9PT0gJ3VuZGVmaW5lZCcgPyBDIDogbmV3VGFyZ2V0O1xuXG4gICAgICBpZiAoIWlzRVM2aW50ZXJuYWwgJiYgUmVmbGVjdC5jb25zdHJ1Y3QpIHtcbiAgICAgICAgLy8gVHJ5IHRvIHVzZSBSZWZsZWN0LmNvbnN0cnVjdCBpZiBhdmFpbGFibGVcbiAgICAgICAgcmV0dXJuIFJlZmxlY3QuY29uc3RydWN0KEMsIGFyZ3MsIHRhcmdldCk7XG4gICAgICB9XG4gICAgICAvLyBPSywgd2UgaGF2ZSB0byBmYWtlIGl0LiAgVGhpcyB3aWxsIG9ubHkgd29yayBpZiB0aGVcbiAgICAgIC8vIEMuW1tDb25zdHJ1Y3RvcktpbmRdXSA9PSBcImJhc2VcIiAtLSBidXQgdGhhdCdzIHRoZSBvbmx5XG4gICAgICAvLyBraW5kIHdlIGNhbiBtYWtlIGluIEVTNSBjb2RlIGFueXdheS5cblxuICAgICAgLy8gT3JkaW5hcnlDcmVhdGVGcm9tQ29uc3RydWN0b3IodGFyZ2V0LCBcIiVPYmplY3RQcm90b3R5cGUlXCIpXG4gICAgICB2YXIgcHJvdG8gPSB0YXJnZXQucHJvdG90eXBlO1xuICAgICAgaWYgKCFFUy5UeXBlSXNPYmplY3QocHJvdG8pKSB7XG4gICAgICAgIHByb3RvID0gT2JqZWN0LnByb3RvdHlwZTtcbiAgICAgIH1cbiAgICAgIHZhciBvYmogPSBjcmVhdGUocHJvdG8pO1xuICAgICAgLy8gQ2FsbCB0aGUgY29uc3RydWN0b3IuXG4gICAgICB2YXIgcmVzdWx0ID0gRVMuQ2FsbChDLCBvYmosIGFyZ3MpO1xuICAgICAgcmV0dXJuIEVTLlR5cGVJc09iamVjdChyZXN1bHQpID8gcmVzdWx0IDogb2JqO1xuICAgIH0sXG5cbiAgICBTcGVjaWVzQ29uc3RydWN0b3I6IGZ1bmN0aW9uIChPLCBkZWZhdWx0Q29uc3RydWN0b3IpIHtcbiAgICAgIHZhciBDID0gTy5jb25zdHJ1Y3RvcjtcbiAgICAgIGlmIChDID09PSB2b2lkIDApIHtcbiAgICAgICAgcmV0dXJuIGRlZmF1bHRDb25zdHJ1Y3RvcjtcbiAgICAgIH1cbiAgICAgIGlmICghRVMuVHlwZUlzT2JqZWN0KEMpKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0JhZCBjb25zdHJ1Y3RvcicpO1xuICAgICAgfVxuICAgICAgdmFyIFMgPSBDW3N5bWJvbFNwZWNpZXNdO1xuICAgICAgaWYgKFMgPT09IHZvaWQgMCB8fCBTID09PSBudWxsKSB7XG4gICAgICAgIHJldHVybiBkZWZhdWx0Q29uc3RydWN0b3I7XG4gICAgICB9XG4gICAgICBpZiAoIUVTLklzQ29uc3RydWN0b3IoUykpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignQmFkIEBAc3BlY2llcycpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIFM7XG4gICAgfSxcblxuICAgIENyZWF0ZUhUTUw6IGZ1bmN0aW9uIChzdHJpbmcsIHRhZywgYXR0cmlidXRlLCB2YWx1ZSkge1xuICAgICAgdmFyIFMgPSBFUy5Ub1N0cmluZyhzdHJpbmcpO1xuICAgICAgdmFyIHAxID0gJzwnICsgdGFnO1xuICAgICAgaWYgKGF0dHJpYnV0ZSAhPT0gJycpIHtcbiAgICAgICAgdmFyIFYgPSBFUy5Ub1N0cmluZyh2YWx1ZSk7XG4gICAgICAgIHZhciBlc2NhcGVkViA9IFYucmVwbGFjZSgvXCIvZywgJyZxdW90OycpO1xuICAgICAgICBwMSArPSAnICcgKyBhdHRyaWJ1dGUgKyAnPVwiJyArIGVzY2FwZWRWICsgJ1wiJztcbiAgICAgIH1cbiAgICAgIHZhciBwMiA9IHAxICsgJz4nO1xuICAgICAgdmFyIHAzID0gcDIgKyBTO1xuICAgICAgcmV0dXJuIHAzICsgJzwvJyArIHRhZyArICc+JztcbiAgICB9LFxuXG4gICAgSXNSZWdFeHA6IGZ1bmN0aW9uIElzUmVnRXhwKGFyZ3VtZW50KSB7XG4gICAgICBpZiAoIUVTLlR5cGVJc09iamVjdChhcmd1bWVudCkpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgICAgdmFyIGlzUmVnRXhwID0gYXJndW1lbnRbU3ltYm9sLm1hdGNoXTtcbiAgICAgIGlmICh0eXBlb2YgaXNSZWdFeHAgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIHJldHVybiAhIWlzUmVnRXhwO1xuICAgICAgfVxuICAgICAgcmV0dXJuIFR5cGUucmVnZXgoYXJndW1lbnQpO1xuICAgIH0sXG5cbiAgICBUb1N0cmluZzogZnVuY3Rpb24gVG9TdHJpbmcoc3RyaW5nKSB7XG4gICAgICByZXR1cm4gJFN0cmluZyhzdHJpbmcpO1xuICAgIH1cbiAgfTtcblxuICAvLyBXZWxsLWtub3duIFN5bWJvbCBzaGltc1xuICBpZiAoc3VwcG9ydHNEZXNjcmlwdG9ycyAmJiBoYXNTeW1ib2xzKSB7XG4gICAgdmFyIGRlZmluZVdlbGxLbm93blN5bWJvbCA9IGZ1bmN0aW9uIGRlZmluZVdlbGxLbm93blN5bWJvbChuYW1lKSB7XG4gICAgICBpZiAoVHlwZS5zeW1ib2woU3ltYm9sW25hbWVdKSkge1xuICAgICAgICByZXR1cm4gU3ltYm9sW25hbWVdO1xuICAgICAgfVxuICAgICAgdmFyIHN5bSA9IFN5bWJvbFsnZm9yJ10oJ1N5bWJvbC4nICsgbmFtZSk7XG4gICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoU3ltYm9sLCBuYW1lLCB7XG4gICAgICAgIGNvbmZpZ3VyYWJsZTogZmFsc2UsXG4gICAgICAgIGVudW1lcmFibGU6IGZhbHNlLFxuICAgICAgICB3cml0YWJsZTogZmFsc2UsXG4gICAgICAgIHZhbHVlOiBzeW1cbiAgICAgIH0pO1xuICAgICAgcmV0dXJuIHN5bTtcbiAgICB9O1xuICAgIGlmICghVHlwZS5zeW1ib2woU3ltYm9sLnNlYXJjaCkpIHtcbiAgICAgIHZhciBzeW1ib2xTZWFyY2ggPSBkZWZpbmVXZWxsS25vd25TeW1ib2woJ3NlYXJjaCcpO1xuICAgICAgdmFyIG9yaWdpbmFsU2VhcmNoID0gU3RyaW5nLnByb3RvdHlwZS5zZWFyY2g7XG4gICAgICBkZWZpbmVQcm9wZXJ0eShSZWdFeHAucHJvdG90eXBlLCBzeW1ib2xTZWFyY2gsIGZ1bmN0aW9uIHNlYXJjaChzdHJpbmcpIHtcbiAgICAgICAgcmV0dXJuIEVTLkNhbGwob3JpZ2luYWxTZWFyY2gsIHN0cmluZywgW3RoaXNdKTtcbiAgICAgIH0pO1xuICAgICAgdmFyIHNlYXJjaFNoaW0gPSBmdW5jdGlvbiBzZWFyY2gocmVnZXhwKSB7XG4gICAgICAgIHZhciBPID0gRVMuUmVxdWlyZU9iamVjdENvZXJjaWJsZSh0aGlzKTtcbiAgICAgICAgaWYgKHJlZ2V4cCAhPT0gbnVsbCAmJiB0eXBlb2YgcmVnZXhwICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgIHZhciBzZWFyY2hlciA9IEVTLkdldE1ldGhvZChyZWdleHAsIHN5bWJvbFNlYXJjaCk7XG4gICAgICAgICAgaWYgKHR5cGVvZiBzZWFyY2hlciAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIHJldHVybiBFUy5DYWxsKHNlYXJjaGVyLCByZWdleHAsIFtPXSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBFUy5DYWxsKG9yaWdpbmFsU2VhcmNoLCBPLCBbRVMuVG9TdHJpbmcocmVnZXhwKV0pO1xuICAgICAgfTtcbiAgICAgIG92ZXJyaWRlTmF0aXZlKFN0cmluZy5wcm90b3R5cGUsICdzZWFyY2gnLCBzZWFyY2hTaGltKTtcbiAgICB9XG4gICAgaWYgKCFUeXBlLnN5bWJvbChTeW1ib2wucmVwbGFjZSkpIHtcbiAgICAgIHZhciBzeW1ib2xSZXBsYWNlID0gZGVmaW5lV2VsbEtub3duU3ltYm9sKCdyZXBsYWNlJyk7XG4gICAgICB2YXIgb3JpZ2luYWxSZXBsYWNlID0gU3RyaW5nLnByb3RvdHlwZS5yZXBsYWNlO1xuICAgICAgZGVmaW5lUHJvcGVydHkoUmVnRXhwLnByb3RvdHlwZSwgc3ltYm9sUmVwbGFjZSwgZnVuY3Rpb24gcmVwbGFjZShzdHJpbmcsIHJlcGxhY2VWYWx1ZSkge1xuICAgICAgICByZXR1cm4gRVMuQ2FsbChvcmlnaW5hbFJlcGxhY2UsIHN0cmluZywgW3RoaXMsIHJlcGxhY2VWYWx1ZV0pO1xuICAgICAgfSk7XG4gICAgICB2YXIgcmVwbGFjZVNoaW0gPSBmdW5jdGlvbiByZXBsYWNlKHNlYXJjaFZhbHVlLCByZXBsYWNlVmFsdWUpIHtcbiAgICAgICAgdmFyIE8gPSBFUy5SZXF1aXJlT2JqZWN0Q29lcmNpYmxlKHRoaXMpO1xuICAgICAgICBpZiAoc2VhcmNoVmFsdWUgIT09IG51bGwgJiYgdHlwZW9mIHNlYXJjaFZhbHVlICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgIHZhciByZXBsYWNlciA9IEVTLkdldE1ldGhvZChzZWFyY2hWYWx1ZSwgc3ltYm9sUmVwbGFjZSk7XG4gICAgICAgICAgaWYgKHR5cGVvZiByZXBsYWNlciAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIHJldHVybiBFUy5DYWxsKHJlcGxhY2VyLCBzZWFyY2hWYWx1ZSwgW08sIHJlcGxhY2VWYWx1ZV0pO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gRVMuQ2FsbChvcmlnaW5hbFJlcGxhY2UsIE8sIFtFUy5Ub1N0cmluZyhzZWFyY2hWYWx1ZSksIHJlcGxhY2VWYWx1ZV0pO1xuICAgICAgfTtcbiAgICAgIG92ZXJyaWRlTmF0aXZlKFN0cmluZy5wcm90b3R5cGUsICdyZXBsYWNlJywgcmVwbGFjZVNoaW0pO1xuICAgIH1cbiAgICBpZiAoIVR5cGUuc3ltYm9sKFN5bWJvbC5zcGxpdCkpIHtcbiAgICAgIHZhciBzeW1ib2xTcGxpdCA9IGRlZmluZVdlbGxLbm93blN5bWJvbCgnc3BsaXQnKTtcbiAgICAgIHZhciBvcmlnaW5hbFNwbGl0ID0gU3RyaW5nLnByb3RvdHlwZS5zcGxpdDtcbiAgICAgIGRlZmluZVByb3BlcnR5KFJlZ0V4cC5wcm90b3R5cGUsIHN5bWJvbFNwbGl0LCBmdW5jdGlvbiBzcGxpdChzdHJpbmcsIGxpbWl0KSB7XG4gICAgICAgIHJldHVybiBFUy5DYWxsKG9yaWdpbmFsU3BsaXQsIHN0cmluZywgW3RoaXMsIGxpbWl0XSk7XG4gICAgICB9KTtcbiAgICAgIHZhciBzcGxpdFNoaW0gPSBmdW5jdGlvbiBzcGxpdChzZXBhcmF0b3IsIGxpbWl0KSB7XG4gICAgICAgIHZhciBPID0gRVMuUmVxdWlyZU9iamVjdENvZXJjaWJsZSh0aGlzKTtcbiAgICAgICAgaWYgKHNlcGFyYXRvciAhPT0gbnVsbCAmJiB0eXBlb2Ygc2VwYXJhdG9yICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgIHZhciBzcGxpdHRlciA9IEVTLkdldE1ldGhvZChzZXBhcmF0b3IsIHN5bWJvbFNwbGl0KTtcbiAgICAgICAgICBpZiAodHlwZW9mIHNwbGl0dGVyICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgcmV0dXJuIEVTLkNhbGwoc3BsaXR0ZXIsIHNlcGFyYXRvciwgW08sIGxpbWl0XSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBFUy5DYWxsKG9yaWdpbmFsU3BsaXQsIE8sIFtFUy5Ub1N0cmluZyhzZXBhcmF0b3IpLCBsaW1pdF0pO1xuICAgICAgfTtcbiAgICAgIG92ZXJyaWRlTmF0aXZlKFN0cmluZy5wcm90b3R5cGUsICdzcGxpdCcsIHNwbGl0U2hpbSk7XG4gICAgfVxuICAgIHZhciBzeW1ib2xNYXRjaEV4aXN0cyA9IFR5cGUuc3ltYm9sKFN5bWJvbC5tYXRjaCk7XG4gICAgdmFyIHN0cmluZ01hdGNoSWdub3Jlc1N5bWJvbE1hdGNoID0gc3ltYm9sTWF0Y2hFeGlzdHMgJiYgKGZ1bmN0aW9uICgpIHtcbiAgICAgIC8vIEZpcmVmb3ggNDEsIHRocm91Z2ggTmlnaHRseSA0NSBoYXMgU3ltYm9sLm1hdGNoLCBidXQgU3RyaW5nI21hdGNoIGlnbm9yZXMgaXQuXG4gICAgICAvLyBGaXJlZm94IDQwIGFuZCBiZWxvdyBoYXZlIFN5bWJvbC5tYXRjaCBidXQgU3RyaW5nI21hdGNoIHdvcmtzIGZpbmUuXG4gICAgICB2YXIgbyA9IHt9O1xuICAgICAgb1tTeW1ib2wubWF0Y2hdID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gNDI7IH07XG4gICAgICByZXR1cm4gJ2EnLm1hdGNoKG8pICE9PSA0MjtcbiAgICB9KCkpO1xuICAgIGlmICghc3ltYm9sTWF0Y2hFeGlzdHMgfHwgc3RyaW5nTWF0Y2hJZ25vcmVzU3ltYm9sTWF0Y2gpIHtcbiAgICAgIHZhciBzeW1ib2xNYXRjaCA9IGRlZmluZVdlbGxLbm93blN5bWJvbCgnbWF0Y2gnKTtcblxuICAgICAgdmFyIG9yaWdpbmFsTWF0Y2ggPSBTdHJpbmcucHJvdG90eXBlLm1hdGNoO1xuICAgICAgZGVmaW5lUHJvcGVydHkoUmVnRXhwLnByb3RvdHlwZSwgc3ltYm9sTWF0Y2gsIGZ1bmN0aW9uIG1hdGNoKHN0cmluZykge1xuICAgICAgICByZXR1cm4gRVMuQ2FsbChvcmlnaW5hbE1hdGNoLCBzdHJpbmcsIFt0aGlzXSk7XG4gICAgICB9KTtcblxuICAgICAgdmFyIG1hdGNoU2hpbSA9IGZ1bmN0aW9uIG1hdGNoKHJlZ2V4cCkge1xuICAgICAgICB2YXIgTyA9IEVTLlJlcXVpcmVPYmplY3RDb2VyY2libGUodGhpcyk7XG4gICAgICAgIGlmIChyZWdleHAgIT09IG51bGwgJiYgdHlwZW9mIHJlZ2V4cCAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICB2YXIgbWF0Y2hlciA9IEVTLkdldE1ldGhvZChyZWdleHAsIHN5bWJvbE1hdGNoKTtcbiAgICAgICAgICBpZiAodHlwZW9mIG1hdGNoZXIgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICByZXR1cm4gRVMuQ2FsbChtYXRjaGVyLCByZWdleHAsIFtPXSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBFUy5DYWxsKG9yaWdpbmFsTWF0Y2gsIE8sIFtFUy5Ub1N0cmluZyhyZWdleHApXSk7XG4gICAgICB9O1xuICAgICAgb3ZlcnJpZGVOYXRpdmUoU3RyaW5nLnByb3RvdHlwZSwgJ21hdGNoJywgbWF0Y2hTaGltKTtcbiAgICB9XG4gIH1cblxuICB2YXIgd3JhcENvbnN0cnVjdG9yID0gZnVuY3Rpb24gd3JhcENvbnN0cnVjdG9yKG9yaWdpbmFsLCByZXBsYWNlbWVudCwga2V5c1RvU2tpcCkge1xuICAgIFZhbHVlLnByZXNlcnZlVG9TdHJpbmcocmVwbGFjZW1lbnQsIG9yaWdpbmFsKTtcbiAgICBpZiAoT2JqZWN0LnNldFByb3RvdHlwZU9mKSB7XG4gICAgICAvLyBzZXRzIHVwIHByb3BlciBwcm90b3R5cGUgY2hhaW4gd2hlcmUgcG9zc2libGVcbiAgICAgIE9iamVjdC5zZXRQcm90b3R5cGVPZihvcmlnaW5hbCwgcmVwbGFjZW1lbnQpO1xuICAgIH1cbiAgICBpZiAoc3VwcG9ydHNEZXNjcmlwdG9ycykge1xuICAgICAgX2ZvckVhY2goT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXMob3JpZ2luYWwpLCBmdW5jdGlvbiAoa2V5KSB7XG4gICAgICAgIGlmIChrZXkgaW4gbm9vcCB8fCBrZXlzVG9Ta2lwW2tleV0pIHsgcmV0dXJuOyB9XG4gICAgICAgIFZhbHVlLnByb3h5KG9yaWdpbmFsLCBrZXksIHJlcGxhY2VtZW50KTtcbiAgICAgIH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICBfZm9yRWFjaChPYmplY3Qua2V5cyhvcmlnaW5hbCksIGZ1bmN0aW9uIChrZXkpIHtcbiAgICAgICAgaWYgKGtleSBpbiBub29wIHx8IGtleXNUb1NraXBba2V5XSkgeyByZXR1cm47IH1cbiAgICAgICAgcmVwbGFjZW1lbnRba2V5XSA9IG9yaWdpbmFsW2tleV07XG4gICAgICB9KTtcbiAgICB9XG4gICAgcmVwbGFjZW1lbnQucHJvdG90eXBlID0gb3JpZ2luYWwucHJvdG90eXBlO1xuICAgIFZhbHVlLnJlZGVmaW5lKG9yaWdpbmFsLnByb3RvdHlwZSwgJ2NvbnN0cnVjdG9yJywgcmVwbGFjZW1lbnQpO1xuICB9O1xuXG4gIHZhciBkZWZhdWx0U3BlY2llc0dldHRlciA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuIHRoaXM7IH07XG4gIHZhciBhZGREZWZhdWx0U3BlY2llcyA9IGZ1bmN0aW9uIChDKSB7XG4gICAgaWYgKHN1cHBvcnRzRGVzY3JpcHRvcnMgJiYgIV9oYXNPd25Qcm9wZXJ0eShDLCBzeW1ib2xTcGVjaWVzKSkge1xuICAgICAgVmFsdWUuZ2V0dGVyKEMsIHN5bWJvbFNwZWNpZXMsIGRlZmF1bHRTcGVjaWVzR2V0dGVyKTtcbiAgICB9XG4gIH07XG5cbiAgdmFyIGFkZEl0ZXJhdG9yID0gZnVuY3Rpb24gKHByb3RvdHlwZSwgaW1wbCkge1xuICAgIHZhciBpbXBsZW1lbnRhdGlvbiA9IGltcGwgfHwgZnVuY3Rpb24gaXRlcmF0b3IoKSB7IHJldHVybiB0aGlzOyB9O1xuICAgIGRlZmluZVByb3BlcnR5KHByb3RvdHlwZSwgJGl0ZXJhdG9yJCwgaW1wbGVtZW50YXRpb24pO1xuICAgIGlmICghcHJvdG90eXBlWyRpdGVyYXRvciRdICYmIFR5cGUuc3ltYm9sKCRpdGVyYXRvciQpKSB7XG4gICAgICAvLyBpbXBsZW1lbnRhdGlvbnMgYXJlIGJ1Z2d5IHdoZW4gJGl0ZXJhdG9yJCBpcyBhIFN5bWJvbFxuICAgICAgcHJvdG90eXBlWyRpdGVyYXRvciRdID0gaW1wbGVtZW50YXRpb247XG4gICAgfVxuICB9O1xuXG4gIHZhciBjcmVhdGVEYXRhUHJvcGVydHkgPSBmdW5jdGlvbiBjcmVhdGVEYXRhUHJvcGVydHkob2JqZWN0LCBuYW1lLCB2YWx1ZSkge1xuICAgIGlmIChzdXBwb3J0c0Rlc2NyaXB0b3JzKSB7XG4gICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkob2JqZWN0LCBuYW1lLCB7XG4gICAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZSxcbiAgICAgICAgZW51bWVyYWJsZTogdHJ1ZSxcbiAgICAgICAgd3JpdGFibGU6IHRydWUsXG4gICAgICAgIHZhbHVlOiB2YWx1ZVxuICAgICAgfSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIG9iamVjdFtuYW1lXSA9IHZhbHVlO1xuICAgIH1cbiAgfTtcbiAgdmFyIGNyZWF0ZURhdGFQcm9wZXJ0eU9yVGhyb3cgPSBmdW5jdGlvbiBjcmVhdGVEYXRhUHJvcGVydHlPclRocm93KG9iamVjdCwgbmFtZSwgdmFsdWUpIHtcbiAgICBjcmVhdGVEYXRhUHJvcGVydHkob2JqZWN0LCBuYW1lLCB2YWx1ZSk7XG4gICAgaWYgKCFFUy5TYW1lVmFsdWUob2JqZWN0W25hbWVdLCB2YWx1ZSkpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ3Byb3BlcnR5IGlzIG5vbmNvbmZpZ3VyYWJsZScpO1xuICAgIH1cbiAgfTtcblxuICB2YXIgZW11bGF0ZUVTNmNvbnN0cnVjdCA9IGZ1bmN0aW9uIChvLCBkZWZhdWx0TmV3VGFyZ2V0LCBkZWZhdWx0UHJvdG8sIHNsb3RzKSB7XG4gICAgLy8gVGhpcyBpcyBhbiBlczUgYXBwcm94aW1hdGlvbiB0byBlczYgY29uc3RydWN0IHNlbWFudGljcy4gIGluIGVzNixcbiAgICAvLyAnbmV3IEZvbycgaW52b2tlcyBGb28uW1tDb25zdHJ1Y3RdXSB3aGljaCAoZm9yIGFsbW9zdCBhbGwgb2JqZWN0cylcbiAgICAvLyBqdXN0IHNldHMgdGhlIGludGVybmFsIHZhcmlhYmxlIE5ld1RhcmdldCAoaW4gZXM2IHN5bnRheCBgbmV3LnRhcmdldGApXG4gICAgLy8gdG8gRm9vIGFuZCB0aGVuIHJldHVybnMgRm9vKCkuXG5cbiAgICAvLyBNYW55IEVTNiBvYmplY3QgdGhlbiBoYXZlIGNvbnN0cnVjdG9ycyBvZiB0aGUgZm9ybTpcbiAgICAvLyAxLiBJZiBOZXdUYXJnZXQgaXMgdW5kZWZpbmVkLCB0aHJvdyBhIFR5cGVFcnJvciBleGNlcHRpb25cbiAgICAvLyAyLiBMZXQgeHh4IGJ5IE9yZGluYXJ5Q3JlYXRlRnJvbUNvbnN0cnVjdG9yKE5ld1RhcmdldCwgeXl5LCB6enopXG5cbiAgICAvLyBTbyB3ZSdyZSBnb2luZyB0byBlbXVsYXRlIHRob3NlIGZpcnN0IHR3byBzdGVwcy5cbiAgICBpZiAoIUVTLlR5cGVJc09iamVjdChvKSkge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignQ29uc3RydWN0b3IgcmVxdWlyZXMgYG5ld2A6ICcgKyBkZWZhdWx0TmV3VGFyZ2V0Lm5hbWUpO1xuICAgIH1cbiAgICB2YXIgcHJvdG8gPSBkZWZhdWx0TmV3VGFyZ2V0LnByb3RvdHlwZTtcbiAgICBpZiAoIUVTLlR5cGVJc09iamVjdChwcm90bykpIHtcbiAgICAgIHByb3RvID0gZGVmYXVsdFByb3RvO1xuICAgIH1cbiAgICB2YXIgb2JqID0gY3JlYXRlKHByb3RvKTtcbiAgICBmb3IgKHZhciBuYW1lIGluIHNsb3RzKSB7XG4gICAgICBpZiAoX2hhc093blByb3BlcnR5KHNsb3RzLCBuYW1lKSkge1xuICAgICAgICB2YXIgdmFsdWUgPSBzbG90c1tuYW1lXTtcbiAgICAgICAgZGVmaW5lUHJvcGVydHkob2JqLCBuYW1lLCB2YWx1ZSwgdHJ1ZSk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBvYmo7XG4gIH07XG5cbiAgLy8gRmlyZWZveCAzMSByZXBvcnRzIHRoaXMgZnVuY3Rpb24ncyBsZW5ndGggYXMgMFxuICAvLyBodHRwczovL2J1Z3ppbGxhLm1vemlsbGEub3JnL3Nob3dfYnVnLmNnaT9pZD0xMDYyNDg0XG4gIGlmIChTdHJpbmcuZnJvbUNvZGVQb2ludCAmJiBTdHJpbmcuZnJvbUNvZGVQb2ludC5sZW5ndGggIT09IDEpIHtcbiAgICB2YXIgb3JpZ2luYWxGcm9tQ29kZVBvaW50ID0gU3RyaW5nLmZyb21Db2RlUG9pbnQ7XG4gICAgb3ZlcnJpZGVOYXRpdmUoU3RyaW5nLCAnZnJvbUNvZGVQb2ludCcsIGZ1bmN0aW9uIGZyb21Db2RlUG9pbnQoY29kZVBvaW50cykgeyByZXR1cm4gRVMuQ2FsbChvcmlnaW5hbEZyb21Db2RlUG9pbnQsIHRoaXMsIGFyZ3VtZW50cyk7IH0pO1xuICB9XG5cbiAgdmFyIFN0cmluZ1NoaW1zID0ge1xuICAgIGZyb21Db2RlUG9pbnQ6IGZ1bmN0aW9uIGZyb21Db2RlUG9pbnQoY29kZVBvaW50cykge1xuICAgICAgdmFyIHJlc3VsdCA9IFtdO1xuICAgICAgdmFyIG5leHQ7XG4gICAgICBmb3IgKHZhciBpID0gMCwgbGVuZ3RoID0gYXJndW1lbnRzLmxlbmd0aDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICAgIG5leHQgPSBOdW1iZXIoYXJndW1lbnRzW2ldKTtcbiAgICAgICAgaWYgKCFFUy5TYW1lVmFsdWUobmV4dCwgRVMuVG9JbnRlZ2VyKG5leHQpKSB8fCBuZXh0IDwgMCB8fCBuZXh0ID4gMHgxMEZGRkYpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcignSW52YWxpZCBjb2RlIHBvaW50ICcgKyBuZXh0KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChuZXh0IDwgMHgxMDAwMCkge1xuICAgICAgICAgIF9wdXNoKHJlc3VsdCwgU3RyaW5nLmZyb21DaGFyQ29kZShuZXh0KSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgbmV4dCAtPSAweDEwMDAwO1xuICAgICAgICAgIF9wdXNoKHJlc3VsdCwgU3RyaW5nLmZyb21DaGFyQ29kZSgobmV4dCA+PiAxMCkgKyAweEQ4MDApKTtcbiAgICAgICAgICBfcHVzaChyZXN1bHQsIFN0cmluZy5mcm9tQ2hhckNvZGUoKG5leHQgJSAweDQwMCkgKyAweERDMDApKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIHJlc3VsdC5qb2luKCcnKTtcbiAgICB9LFxuXG4gICAgcmF3OiBmdW5jdGlvbiByYXcoY2FsbFNpdGUpIHtcbiAgICAgIHZhciBjb29rZWQgPSBFUy5Ub09iamVjdChjYWxsU2l0ZSwgJ2JhZCBjYWxsU2l0ZScpO1xuICAgICAgdmFyIHJhd1N0cmluZyA9IEVTLlRvT2JqZWN0KGNvb2tlZC5yYXcsICdiYWQgcmF3IHZhbHVlJyk7XG4gICAgICB2YXIgbGVuID0gcmF3U3RyaW5nLmxlbmd0aDtcbiAgICAgIHZhciBsaXRlcmFsc2VnbWVudHMgPSBFUy5Ub0xlbmd0aChsZW4pO1xuICAgICAgaWYgKGxpdGVyYWxzZWdtZW50cyA8PSAwKSB7XG4gICAgICAgIHJldHVybiAnJztcbiAgICAgIH1cblxuICAgICAgdmFyIHN0cmluZ0VsZW1lbnRzID0gW107XG4gICAgICB2YXIgbmV4dEluZGV4ID0gMDtcbiAgICAgIHZhciBuZXh0S2V5LCBuZXh0LCBuZXh0U2VnLCBuZXh0U3ViO1xuICAgICAgd2hpbGUgKG5leHRJbmRleCA8IGxpdGVyYWxzZWdtZW50cykge1xuICAgICAgICBuZXh0S2V5ID0gRVMuVG9TdHJpbmcobmV4dEluZGV4KTtcbiAgICAgICAgbmV4dFNlZyA9IEVTLlRvU3RyaW5nKHJhd1N0cmluZ1tuZXh0S2V5XSk7XG4gICAgICAgIF9wdXNoKHN0cmluZ0VsZW1lbnRzLCBuZXh0U2VnKTtcbiAgICAgICAgaWYgKG5leHRJbmRleCArIDEgPj0gbGl0ZXJhbHNlZ21lbnRzKSB7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgICAgbmV4dCA9IG5leHRJbmRleCArIDEgPCBhcmd1bWVudHMubGVuZ3RoID8gYXJndW1lbnRzW25leHRJbmRleCArIDFdIDogJyc7XG4gICAgICAgIG5leHRTdWIgPSBFUy5Ub1N0cmluZyhuZXh0KTtcbiAgICAgICAgX3B1c2goc3RyaW5nRWxlbWVudHMsIG5leHRTdWIpO1xuICAgICAgICBuZXh0SW5kZXggKz0gMTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBzdHJpbmdFbGVtZW50cy5qb2luKCcnKTtcbiAgICB9XG4gIH07XG4gIGlmIChTdHJpbmcucmF3ICYmIFN0cmluZy5yYXcoeyByYXc6IHsgMDogJ3gnLCAxOiAneScsIGxlbmd0aDogMiB9IH0pICE9PSAneHknKSB7XG4gICAgLy8gSUUgMTEgVFAgaGFzIGEgYnJva2VuIFN0cmluZy5yYXcgaW1wbGVtZW50YXRpb25cbiAgICBvdmVycmlkZU5hdGl2ZShTdHJpbmcsICdyYXcnLCBTdHJpbmdTaGltcy5yYXcpO1xuICB9XG4gIGRlZmluZVByb3BlcnRpZXMoU3RyaW5nLCBTdHJpbmdTaGltcyk7XG5cbiAgLy8gRmFzdCByZXBlYXQsIHVzZXMgdGhlIGBFeHBvbmVudGlhdGlvbiBieSBzcXVhcmluZ2AgYWxnb3JpdGhtLlxuICAvLyBQZXJmOiBodHRwOi8vanNwZXJmLmNvbS9zdHJpbmctcmVwZWF0Mi8yXG4gIHZhciBzdHJpbmdSZXBlYXQgPSBmdW5jdGlvbiByZXBlYXQocywgdGltZXMpIHtcbiAgICBpZiAodGltZXMgPCAxKSB7IHJldHVybiAnJzsgfVxuICAgIGlmICh0aW1lcyAlIDIpIHsgcmV0dXJuIHJlcGVhdChzLCB0aW1lcyAtIDEpICsgczsgfVxuICAgIHZhciBoYWxmID0gcmVwZWF0KHMsIHRpbWVzIC8gMik7XG4gICAgcmV0dXJuIGhhbGYgKyBoYWxmO1xuICB9O1xuICB2YXIgc3RyaW5nTWF4TGVuZ3RoID0gSW5maW5pdHk7XG5cbiAgdmFyIFN0cmluZ1Byb3RvdHlwZVNoaW1zID0ge1xuICAgIHJlcGVhdDogZnVuY3Rpb24gcmVwZWF0KHRpbWVzKSB7XG4gICAgICB2YXIgdGhpc1N0ciA9IEVTLlRvU3RyaW5nKEVTLlJlcXVpcmVPYmplY3RDb2VyY2libGUodGhpcykpO1xuICAgICAgdmFyIG51bVRpbWVzID0gRVMuVG9JbnRlZ2VyKHRpbWVzKTtcbiAgICAgIGlmIChudW1UaW1lcyA8IDAgfHwgbnVtVGltZXMgPj0gc3RyaW5nTWF4TGVuZ3RoKSB7XG4gICAgICAgIHRocm93IG5ldyBSYW5nZUVycm9yKCdyZXBlYXQgY291bnQgbXVzdCBiZSBsZXNzIHRoYW4gaW5maW5pdHkgYW5kIG5vdCBvdmVyZmxvdyBtYXhpbXVtIHN0cmluZyBzaXplJyk7XG4gICAgICB9XG4gICAgICByZXR1cm4gc3RyaW5nUmVwZWF0KHRoaXNTdHIsIG51bVRpbWVzKTtcbiAgICB9LFxuXG4gICAgc3RhcnRzV2l0aDogZnVuY3Rpb24gc3RhcnRzV2l0aChzZWFyY2hTdHJpbmcpIHtcbiAgICAgIHZhciBTID0gRVMuVG9TdHJpbmcoRVMuUmVxdWlyZU9iamVjdENvZXJjaWJsZSh0aGlzKSk7XG4gICAgICBpZiAoRVMuSXNSZWdFeHAoc2VhcmNoU3RyaW5nKSkge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdDYW5ub3QgY2FsbCBtZXRob2QgXCJzdGFydHNXaXRoXCIgd2l0aCBhIHJlZ2V4Jyk7XG4gICAgICB9XG4gICAgICB2YXIgc2VhcmNoU3RyID0gRVMuVG9TdHJpbmcoc2VhcmNoU3RyaW5nKTtcbiAgICAgIHZhciBwb3NpdGlvbjtcbiAgICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID4gMSkge1xuICAgICAgICBwb3NpdGlvbiA9IGFyZ3VtZW50c1sxXTtcbiAgICAgIH1cbiAgICAgIHZhciBzdGFydCA9IF9tYXgoRVMuVG9JbnRlZ2VyKHBvc2l0aW9uKSwgMCk7XG4gICAgICByZXR1cm4gX3N0clNsaWNlKFMsIHN0YXJ0LCBzdGFydCArIHNlYXJjaFN0ci5sZW5ndGgpID09PSBzZWFyY2hTdHI7XG4gICAgfSxcblxuICAgIGVuZHNXaXRoOiBmdW5jdGlvbiBlbmRzV2l0aChzZWFyY2hTdHJpbmcpIHtcbiAgICAgIHZhciBTID0gRVMuVG9TdHJpbmcoRVMuUmVxdWlyZU9iamVjdENvZXJjaWJsZSh0aGlzKSk7XG4gICAgICBpZiAoRVMuSXNSZWdFeHAoc2VhcmNoU3RyaW5nKSkge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdDYW5ub3QgY2FsbCBtZXRob2QgXCJlbmRzV2l0aFwiIHdpdGggYSByZWdleCcpO1xuICAgICAgfVxuICAgICAgdmFyIHNlYXJjaFN0ciA9IEVTLlRvU3RyaW5nKHNlYXJjaFN0cmluZyk7XG4gICAgICB2YXIgbGVuID0gUy5sZW5ndGg7XG4gICAgICB2YXIgZW5kUG9zaXRpb247XG4gICAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgZW5kUG9zaXRpb24gPSBhcmd1bWVudHNbMV07XG4gICAgICB9XG4gICAgICB2YXIgcG9zID0gdHlwZW9mIGVuZFBvc2l0aW9uID09PSAndW5kZWZpbmVkJyA/IGxlbiA6IEVTLlRvSW50ZWdlcihlbmRQb3NpdGlvbik7XG4gICAgICB2YXIgZW5kID0gX21pbihfbWF4KHBvcywgMCksIGxlbik7XG4gICAgICByZXR1cm4gX3N0clNsaWNlKFMsIGVuZCAtIHNlYXJjaFN0ci5sZW5ndGgsIGVuZCkgPT09IHNlYXJjaFN0cjtcbiAgICB9LFxuXG4gICAgaW5jbHVkZXM6IGZ1bmN0aW9uIGluY2x1ZGVzKHNlYXJjaFN0cmluZykge1xuICAgICAgaWYgKEVTLklzUmVnRXhwKHNlYXJjaFN0cmluZykpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignXCJpbmNsdWRlc1wiIGRvZXMgbm90IGFjY2VwdCBhIFJlZ0V4cCcpO1xuICAgICAgfVxuICAgICAgdmFyIHNlYXJjaFN0ciA9IEVTLlRvU3RyaW5nKHNlYXJjaFN0cmluZyk7XG4gICAgICB2YXIgcG9zaXRpb247XG4gICAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgcG9zaXRpb24gPSBhcmd1bWVudHNbMV07XG4gICAgICB9XG4gICAgICAvLyBTb21laG93IHRoaXMgdHJpY2sgbWFrZXMgbWV0aG9kIDEwMCUgY29tcGF0IHdpdGggdGhlIHNwZWMuXG4gICAgICByZXR1cm4gX2luZGV4T2YodGhpcywgc2VhcmNoU3RyLCBwb3NpdGlvbikgIT09IC0xO1xuICAgIH0sXG5cbiAgICBjb2RlUG9pbnRBdDogZnVuY3Rpb24gY29kZVBvaW50QXQocG9zKSB7XG4gICAgICB2YXIgdGhpc1N0ciA9IEVTLlRvU3RyaW5nKEVTLlJlcXVpcmVPYmplY3RDb2VyY2libGUodGhpcykpO1xuICAgICAgdmFyIHBvc2l0aW9uID0gRVMuVG9JbnRlZ2VyKHBvcyk7XG4gICAgICB2YXIgbGVuZ3RoID0gdGhpc1N0ci5sZW5ndGg7XG4gICAgICBpZiAocG9zaXRpb24gPj0gMCAmJiBwb3NpdGlvbiA8IGxlbmd0aCkge1xuICAgICAgICB2YXIgZmlyc3QgPSB0aGlzU3RyLmNoYXJDb2RlQXQocG9zaXRpb24pO1xuICAgICAgICB2YXIgaXNFbmQgPSAocG9zaXRpb24gKyAxID09PSBsZW5ndGgpO1xuICAgICAgICBpZiAoZmlyc3QgPCAweEQ4MDAgfHwgZmlyc3QgPiAweERCRkYgfHwgaXNFbmQpIHsgcmV0dXJuIGZpcnN0OyB9XG4gICAgICAgIHZhciBzZWNvbmQgPSB0aGlzU3RyLmNoYXJDb2RlQXQocG9zaXRpb24gKyAxKTtcbiAgICAgICAgaWYgKHNlY29uZCA8IDB4REMwMCB8fCBzZWNvbmQgPiAweERGRkYpIHsgcmV0dXJuIGZpcnN0OyB9XG4gICAgICAgIHJldHVybiAoKGZpcnN0IC0gMHhEODAwKSAqIDEwMjQpICsgKHNlY29uZCAtIDB4REMwMCkgKyAweDEwMDAwO1xuICAgICAgfVxuICAgIH1cbiAgfTtcbiAgaWYgKFN0cmluZy5wcm90b3R5cGUuaW5jbHVkZXMgJiYgJ2EnLmluY2x1ZGVzKCdhJywgSW5maW5pdHkpICE9PSBmYWxzZSkge1xuICAgIG92ZXJyaWRlTmF0aXZlKFN0cmluZy5wcm90b3R5cGUsICdpbmNsdWRlcycsIFN0cmluZ1Byb3RvdHlwZVNoaW1zLmluY2x1ZGVzKTtcbiAgfVxuXG4gIGlmIChTdHJpbmcucHJvdG90eXBlLnN0YXJ0c1dpdGggJiYgU3RyaW5nLnByb3RvdHlwZS5lbmRzV2l0aCkge1xuICAgIHZhciBzdGFydHNXaXRoUmVqZWN0c1JlZ2V4ID0gdGhyb3dzRXJyb3IoZnVuY3Rpb24gKCkge1xuICAgICAgLyogdGhyb3dzIGlmIHNwZWMtY29tcGxpYW50ICovXG4gICAgICAnL2EvJy5zdGFydHNXaXRoKC9hLyk7XG4gICAgfSk7XG4gICAgdmFyIHN0YXJ0c1dpdGhIYW5kbGVzSW5maW5pdHkgPSB2YWx1ZU9yRmFsc2VJZlRocm93cyhmdW5jdGlvbiAoKSB7XG4gICAgICByZXR1cm4gJ2FiYycuc3RhcnRzV2l0aCgnYScsIEluZmluaXR5KSA9PT0gZmFsc2U7XG4gICAgfSk7XG4gICAgaWYgKCFzdGFydHNXaXRoUmVqZWN0c1JlZ2V4IHx8ICFzdGFydHNXaXRoSGFuZGxlc0luZmluaXR5KSB7XG4gICAgICAvLyBGaXJlZm94ICg8IDM3PykgYW5kIElFIDExIFRQIGhhdmUgYSBub25jb21wbGlhbnQgc3RhcnRzV2l0aCBpbXBsZW1lbnRhdGlvblxuICAgICAgb3ZlcnJpZGVOYXRpdmUoU3RyaW5nLnByb3RvdHlwZSwgJ3N0YXJ0c1dpdGgnLCBTdHJpbmdQcm90b3R5cGVTaGltcy5zdGFydHNXaXRoKTtcbiAgICAgIG92ZXJyaWRlTmF0aXZlKFN0cmluZy5wcm90b3R5cGUsICdlbmRzV2l0aCcsIFN0cmluZ1Byb3RvdHlwZVNoaW1zLmVuZHNXaXRoKTtcbiAgICB9XG4gIH1cbiAgaWYgKGhhc1N5bWJvbHMpIHtcbiAgICB2YXIgc3RhcnRzV2l0aFN1cHBvcnRzU3ltYm9sTWF0Y2ggPSB2YWx1ZU9yRmFsc2VJZlRocm93cyhmdW5jdGlvbiAoKSB7XG4gICAgICB2YXIgcmUgPSAvYS87XG4gICAgICByZVtTeW1ib2wubWF0Y2hdID0gZmFsc2U7XG4gICAgICByZXR1cm4gJy9hLycuc3RhcnRzV2l0aChyZSk7XG4gICAgfSk7XG4gICAgaWYgKCFzdGFydHNXaXRoU3VwcG9ydHNTeW1ib2xNYXRjaCkge1xuICAgICAgb3ZlcnJpZGVOYXRpdmUoU3RyaW5nLnByb3RvdHlwZSwgJ3N0YXJ0c1dpdGgnLCBTdHJpbmdQcm90b3R5cGVTaGltcy5zdGFydHNXaXRoKTtcbiAgICB9XG4gICAgdmFyIGVuZHNXaXRoU3VwcG9ydHNTeW1ib2xNYXRjaCA9IHZhbHVlT3JGYWxzZUlmVGhyb3dzKGZ1bmN0aW9uICgpIHtcbiAgICAgIHZhciByZSA9IC9hLztcbiAgICAgIHJlW1N5bWJvbC5tYXRjaF0gPSBmYWxzZTtcbiAgICAgIHJldHVybiAnL2EvJy5lbmRzV2l0aChyZSk7XG4gICAgfSk7XG4gICAgaWYgKCFlbmRzV2l0aFN1cHBvcnRzU3ltYm9sTWF0Y2gpIHtcbiAgICAgIG92ZXJyaWRlTmF0aXZlKFN0cmluZy5wcm90b3R5cGUsICdlbmRzV2l0aCcsIFN0cmluZ1Byb3RvdHlwZVNoaW1zLmVuZHNXaXRoKTtcbiAgICB9XG4gICAgdmFyIGluY2x1ZGVzU3VwcG9ydHNTeW1ib2xNYXRjaCA9IHZhbHVlT3JGYWxzZUlmVGhyb3dzKGZ1bmN0aW9uICgpIHtcbiAgICAgIHZhciByZSA9IC9hLztcbiAgICAgIHJlW1N5bWJvbC5tYXRjaF0gPSBmYWxzZTtcbiAgICAgIHJldHVybiAnL2EvJy5pbmNsdWRlcyhyZSk7XG4gICAgfSk7XG4gICAgaWYgKCFpbmNsdWRlc1N1cHBvcnRzU3ltYm9sTWF0Y2gpIHtcbiAgICAgIG92ZXJyaWRlTmF0aXZlKFN0cmluZy5wcm90b3R5cGUsICdpbmNsdWRlcycsIFN0cmluZ1Byb3RvdHlwZVNoaW1zLmluY2x1ZGVzKTtcbiAgICB9XG4gIH1cblxuICBkZWZpbmVQcm9wZXJ0aWVzKFN0cmluZy5wcm90b3R5cGUsIFN0cmluZ1Byb3RvdHlwZVNoaW1zKTtcblxuICAvLyB3aGl0ZXNwYWNlIGZyb206IGh0dHA6Ly9lczUuZ2l0aHViLmlvLyN4MTUuNS40LjIwXG4gIC8vIGltcGxlbWVudGF0aW9uIGZyb20gaHR0cHM6Ly9naXRodWIuY29tL2VzLXNoaW1zL2VzNS1zaGltL2Jsb2IvdjMuNC4wL2VzNS1zaGltLmpzI0wxMzA0LUwxMzI0XG4gIHZhciB3cyA9IFtcbiAgICAnXFx4MDlcXHgwQVxceDBCXFx4MENcXHgwRFxceDIwXFx4QTBcXHUxNjgwXFx1MTgwRVxcdTIwMDBcXHUyMDAxXFx1MjAwMlxcdTIwMDMnLFxuICAgICdcXHUyMDA0XFx1MjAwNVxcdTIwMDZcXHUyMDA3XFx1MjAwOFxcdTIwMDlcXHUyMDBBXFx1MjAyRlxcdTIwNUZcXHUzMDAwXFx1MjAyOCcsXG4gICAgJ1xcdTIwMjlcXHVGRUZGJ1xuICBdLmpvaW4oJycpO1xuICB2YXIgdHJpbVJlZ2V4cCA9IG5ldyBSZWdFeHAoJyheWycgKyB3cyArICddKyl8KFsnICsgd3MgKyAnXSskKScsICdnJyk7XG4gIHZhciB0cmltU2hpbSA9IGZ1bmN0aW9uIHRyaW0oKSB7XG4gICAgcmV0dXJuIEVTLlRvU3RyaW5nKEVTLlJlcXVpcmVPYmplY3RDb2VyY2libGUodGhpcykpLnJlcGxhY2UodHJpbVJlZ2V4cCwgJycpO1xuICB9O1xuICB2YXIgbm9uV1MgPSBbJ1xcdTAwODUnLCAnXFx1MjAwYicsICdcXHVmZmZlJ10uam9pbignJyk7XG4gIHZhciBub25XU3JlZ2V4ID0gbmV3IFJlZ0V4cCgnWycgKyBub25XUyArICddJywgJ2cnKTtcbiAgdmFyIGlzQmFkSGV4UmVnZXggPSAvXltcXC0rXTB4WzAtOWEtZl0rJC9pO1xuICB2YXIgaGFzU3RyaW5nVHJpbUJ1ZyA9IG5vbldTLnRyaW0oKS5sZW5ndGggIT09IG5vbldTLmxlbmd0aDtcbiAgZGVmaW5lUHJvcGVydHkoU3RyaW5nLnByb3RvdHlwZSwgJ3RyaW0nLCB0cmltU2hpbSwgaGFzU3RyaW5nVHJpbUJ1Zyk7XG5cbiAgLy8gc2VlIGh0dHBzOi8vcGVvcGxlLm1vemlsbGEub3JnL35qb3JlbmRvcmZmL2VzNi1kcmFmdC5odG1sI3NlYy1zdHJpbmcucHJvdG90eXBlLUBAaXRlcmF0b3JcbiAgdmFyIFN0cmluZ0l0ZXJhdG9yID0gZnVuY3Rpb24gKHMpIHtcbiAgICBFUy5SZXF1aXJlT2JqZWN0Q29lcmNpYmxlKHMpO1xuICAgIHRoaXMuX3MgPSBFUy5Ub1N0cmluZyhzKTtcbiAgICB0aGlzLl9pID0gMDtcbiAgfTtcbiAgU3RyaW5nSXRlcmF0b3IucHJvdG90eXBlLm5leHQgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHMgPSB0aGlzLl9zLCBpID0gdGhpcy5faTtcbiAgICBpZiAodHlwZW9mIHMgPT09ICd1bmRlZmluZWQnIHx8IGkgPj0gcy5sZW5ndGgpIHtcbiAgICAgIHRoaXMuX3MgPSB2b2lkIDA7XG4gICAgICByZXR1cm4geyB2YWx1ZTogdm9pZCAwLCBkb25lOiB0cnVlIH07XG4gICAgfVxuICAgIHZhciBmaXJzdCA9IHMuY2hhckNvZGVBdChpKSwgc2Vjb25kLCBsZW47XG4gICAgaWYgKGZpcnN0IDwgMHhEODAwIHx8IGZpcnN0ID4gMHhEQkZGIHx8IChpICsgMSkgPT09IHMubGVuZ3RoKSB7XG4gICAgICBsZW4gPSAxO1xuICAgIH0gZWxzZSB7XG4gICAgICBzZWNvbmQgPSBzLmNoYXJDb2RlQXQoaSArIDEpO1xuICAgICAgbGVuID0gKHNlY29uZCA8IDB4REMwMCB8fCBzZWNvbmQgPiAweERGRkYpID8gMSA6IDI7XG4gICAgfVxuICAgIHRoaXMuX2kgPSBpICsgbGVuO1xuICAgIHJldHVybiB7IHZhbHVlOiBzLnN1YnN0cihpLCBsZW4pLCBkb25lOiBmYWxzZSB9O1xuICB9O1xuICBhZGRJdGVyYXRvcihTdHJpbmdJdGVyYXRvci5wcm90b3R5cGUpO1xuICBhZGRJdGVyYXRvcihTdHJpbmcucHJvdG90eXBlLCBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIG5ldyBTdHJpbmdJdGVyYXRvcih0aGlzKTtcbiAgfSk7XG5cbiAgdmFyIEFycmF5U2hpbXMgPSB7XG4gICAgZnJvbTogZnVuY3Rpb24gZnJvbShpdGVtcykge1xuICAgICAgdmFyIEMgPSB0aGlzO1xuICAgICAgdmFyIG1hcEZuO1xuICAgICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPiAxKSB7XG4gICAgICAgIG1hcEZuID0gYXJndW1lbnRzWzFdO1xuICAgICAgfVxuICAgICAgdmFyIG1hcHBpbmcsIFQ7XG4gICAgICBpZiAodHlwZW9mIG1hcEZuID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICBtYXBwaW5nID0gZmFsc2U7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpZiAoIUVTLklzQ2FsbGFibGUobWFwRm4pKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignQXJyYXkuZnJvbTogd2hlbiBwcm92aWRlZCwgdGhlIHNlY29uZCBhcmd1bWVudCBtdXN0IGJlIGEgZnVuY3Rpb24nKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+IDIpIHtcbiAgICAgICAgICBUID0gYXJndW1lbnRzWzJdO1xuICAgICAgICB9XG4gICAgICAgIG1hcHBpbmcgPSB0cnVlO1xuICAgICAgfVxuXG4gICAgICAvLyBOb3RlIHRoYXQgdGhhdCBBcnJheXMgd2lsbCB1c2UgQXJyYXlJdGVyYXRvcjpcbiAgICAgIC8vIGh0dHBzOi8vYnVncy5lY21hc2NyaXB0Lm9yZy9zaG93X2J1Zy5jZ2k/aWQ9MjQxNlxuICAgICAgdmFyIHVzaW5nSXRlcmF0b3IgPSB0eXBlb2YgKGlzQXJndW1lbnRzKGl0ZW1zKSB8fCBFUy5HZXRNZXRob2QoaXRlbXMsICRpdGVyYXRvciQpKSAhPT0gJ3VuZGVmaW5lZCc7XG5cbiAgICAgIHZhciBsZW5ndGgsIHJlc3VsdCwgaTtcbiAgICAgIGlmICh1c2luZ0l0ZXJhdG9yKSB7XG4gICAgICAgIHJlc3VsdCA9IEVTLklzQ29uc3RydWN0b3IoQykgPyBPYmplY3QobmV3IEMoKSkgOiBbXTtcbiAgICAgICAgdmFyIGl0ZXJhdG9yID0gRVMuR2V0SXRlcmF0b3IoaXRlbXMpO1xuICAgICAgICB2YXIgbmV4dCwgbmV4dFZhbHVlO1xuXG4gICAgICAgIGkgPSAwO1xuICAgICAgICB3aGlsZSAodHJ1ZSkge1xuICAgICAgICAgIG5leHQgPSBFUy5JdGVyYXRvclN0ZXAoaXRlcmF0b3IpO1xuICAgICAgICAgIGlmIChuZXh0ID09PSBmYWxzZSkge1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgfVxuICAgICAgICAgIG5leHRWYWx1ZSA9IG5leHQudmFsdWU7XG4gICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGlmIChtYXBwaW5nKSB7XG4gICAgICAgICAgICAgIG5leHRWYWx1ZSA9IHR5cGVvZiBUID09PSAndW5kZWZpbmVkJyA/IG1hcEZuKG5leHRWYWx1ZSwgaSkgOiBfY2FsbChtYXBGbiwgVCwgbmV4dFZhbHVlLCBpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJlc3VsdFtpXSA9IG5leHRWYWx1ZTtcbiAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICBFUy5JdGVyYXRvckNsb3NlKGl0ZXJhdG9yLCB0cnVlKTtcbiAgICAgICAgICAgIHRocm93IGU7XG4gICAgICAgICAgfVxuICAgICAgICAgIGkgKz0gMTtcbiAgICAgICAgfVxuICAgICAgICBsZW5ndGggPSBpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdmFyIGFycmF5TGlrZSA9IEVTLlRvT2JqZWN0KGl0ZW1zKTtcbiAgICAgICAgbGVuZ3RoID0gRVMuVG9MZW5ndGgoYXJyYXlMaWtlLmxlbmd0aCk7XG4gICAgICAgIHJlc3VsdCA9IEVTLklzQ29uc3RydWN0b3IoQykgPyBPYmplY3QobmV3IEMobGVuZ3RoKSkgOiBuZXcgQXJyYXkobGVuZ3RoKTtcbiAgICAgICAgdmFyIHZhbHVlO1xuICAgICAgICBmb3IgKGkgPSAwOyBpIDwgbGVuZ3RoOyArK2kpIHtcbiAgICAgICAgICB2YWx1ZSA9IGFycmF5TGlrZVtpXTtcbiAgICAgICAgICBpZiAobWFwcGluZykge1xuICAgICAgICAgICAgdmFsdWUgPSB0eXBlb2YgVCA9PT0gJ3VuZGVmaW5lZCcgPyBtYXBGbih2YWx1ZSwgaSkgOiBfY2FsbChtYXBGbiwgVCwgdmFsdWUsIGkpO1xuICAgICAgICAgIH1cbiAgICAgICAgICByZXN1bHRbaV0gPSB2YWx1ZTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICByZXN1bHQubGVuZ3RoID0gbGVuZ3RoO1xuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9LFxuXG4gICAgb2Y6IGZ1bmN0aW9uIG9mKCkge1xuICAgICAgdmFyIGxlbiA9IGFyZ3VtZW50cy5sZW5ndGg7XG4gICAgICB2YXIgQyA9IHRoaXM7XG4gICAgICB2YXIgQSA9IGlzQXJyYXkoQykgfHwgIUVTLklzQ2FsbGFibGUoQykgPyBuZXcgQXJyYXkobGVuKSA6IEVTLkNvbnN0cnVjdChDLCBbbGVuXSk7XG4gICAgICBmb3IgKHZhciBrID0gMDsgayA8IGxlbjsgKytrKSB7XG4gICAgICAgIGNyZWF0ZURhdGFQcm9wZXJ0eU9yVGhyb3coQSwgaywgYXJndW1lbnRzW2tdKTtcbiAgICAgIH1cbiAgICAgIEEubGVuZ3RoID0gbGVuO1xuICAgICAgcmV0dXJuIEE7XG4gICAgfVxuICB9O1xuICBkZWZpbmVQcm9wZXJ0aWVzKEFycmF5LCBBcnJheVNoaW1zKTtcbiAgYWRkRGVmYXVsdFNwZWNpZXMoQXJyYXkpO1xuXG4gIC8vIEdpdmVuIGFuIGFyZ3VtZW50IHgsIGl0IHdpbGwgcmV0dXJuIGFuIEl0ZXJhdG9yUmVzdWx0IG9iamVjdCxcbiAgLy8gd2l0aCB2YWx1ZSBzZXQgdG8geCBhbmQgZG9uZSB0byBmYWxzZS5cbiAgLy8gR2l2ZW4gbm8gYXJndW1lbnRzLCBpdCB3aWxsIHJldHVybiBhbiBpdGVyYXRvciBjb21wbGV0aW9uIG9iamVjdC5cbiAgdmFyIGl0ZXJhdG9yUmVzdWx0ID0gZnVuY3Rpb24gKHgpIHtcbiAgICByZXR1cm4geyB2YWx1ZTogeCwgZG9uZTogYXJndW1lbnRzLmxlbmd0aCA9PT0gMCB9O1xuICB9O1xuXG4gIC8vIE91ciBBcnJheUl0ZXJhdG9yIGlzIHByaXZhdGU7IHNlZVxuICAvLyBodHRwczovL2dpdGh1Yi5jb20vcGF1bG1pbGxyL2VzNi1zaGltL2lzc3Vlcy8yNTJcbiAgQXJyYXlJdGVyYXRvciA9IGZ1bmN0aW9uIChhcnJheSwga2luZCkge1xuICAgICAgdGhpcy5pID0gMDtcbiAgICAgIHRoaXMuYXJyYXkgPSBhcnJheTtcbiAgICAgIHRoaXMua2luZCA9IGtpbmQ7XG4gIH07XG5cbiAgZGVmaW5lUHJvcGVydGllcyhBcnJheUl0ZXJhdG9yLnByb3RvdHlwZSwge1xuICAgIG5leHQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgIHZhciBpID0gdGhpcy5pLCBhcnJheSA9IHRoaXMuYXJyYXk7XG4gICAgICBpZiAoISh0aGlzIGluc3RhbmNlb2YgQXJyYXlJdGVyYXRvcikpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignTm90IGFuIEFycmF5SXRlcmF0b3InKTtcbiAgICAgIH1cbiAgICAgIGlmICh0eXBlb2YgYXJyYXkgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIHZhciBsZW4gPSBFUy5Ub0xlbmd0aChhcnJheS5sZW5ndGgpO1xuICAgICAgICBmb3IgKDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICAgICAgdmFyIGtpbmQgPSB0aGlzLmtpbmQ7XG4gICAgICAgICAgdmFyIHJldHZhbDtcbiAgICAgICAgICBpZiAoa2luZCA9PT0gJ2tleScpIHtcbiAgICAgICAgICAgIHJldHZhbCA9IGk7XG4gICAgICAgICAgfSBlbHNlIGlmIChraW5kID09PSAndmFsdWUnKSB7XG4gICAgICAgICAgICByZXR2YWwgPSBhcnJheVtpXTtcbiAgICAgICAgICB9IGVsc2UgaWYgKGtpbmQgPT09ICdlbnRyeScpIHtcbiAgICAgICAgICAgIHJldHZhbCA9IFtpLCBhcnJheVtpXV07XG4gICAgICAgICAgfVxuICAgICAgICAgIHRoaXMuaSA9IGkgKyAxO1xuICAgICAgICAgIHJldHVybiB7IHZhbHVlOiByZXR2YWwsIGRvbmU6IGZhbHNlIH07XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHRoaXMuYXJyYXkgPSB2b2lkIDA7XG4gICAgICByZXR1cm4geyB2YWx1ZTogdm9pZCAwLCBkb25lOiB0cnVlIH07XG4gICAgfVxuICB9KTtcbiAgYWRkSXRlcmF0b3IoQXJyYXlJdGVyYXRvci5wcm90b3R5cGUpO1xuXG4gIHZhciBvcmRlcktleXMgPSBmdW5jdGlvbiBvcmRlcktleXMoYSwgYikge1xuICAgIHZhciBhTnVtZXJpYyA9IFN0cmluZyhFUy5Ub0ludGVnZXIoYSkpID09PSBhO1xuICAgIHZhciBiTnVtZXJpYyA9IFN0cmluZyhFUy5Ub0ludGVnZXIoYikpID09PSBiO1xuICAgIGlmIChhTnVtZXJpYyAmJiBiTnVtZXJpYykge1xuICAgICAgcmV0dXJuIGIgLSBhO1xuICAgIH0gZWxzZSBpZiAoYU51bWVyaWMgJiYgIWJOdW1lcmljKSB7XG4gICAgICByZXR1cm4gLTE7XG4gICAgfSBlbHNlIGlmICghYU51bWVyaWMgJiYgYk51bWVyaWMpIHtcbiAgICAgIHJldHVybiAxO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gYS5sb2NhbGVDb21wYXJlKGIpO1xuICAgIH1cbiAgfTtcbiAgdmFyIGdldEFsbEtleXMgPSBmdW5jdGlvbiBnZXRBbGxLZXlzKG9iamVjdCkge1xuICAgIHZhciBvd25LZXlzID0gW107XG4gICAgdmFyIGtleXMgPSBbXTtcblxuICAgIGZvciAodmFyIGtleSBpbiBvYmplY3QpIHtcbiAgICAgIF9wdXNoKF9oYXNPd25Qcm9wZXJ0eShvYmplY3QsIGtleSkgPyBvd25LZXlzIDoga2V5cywga2V5KTtcbiAgICB9XG4gICAgX3NvcnQob3duS2V5cywgb3JkZXJLZXlzKTtcbiAgICBfc29ydChrZXlzLCBvcmRlcktleXMpO1xuXG4gICAgcmV0dXJuIF9jb25jYXQob3duS2V5cywga2V5cyk7XG4gIH07XG5cbiAgLy8gbm90ZTogdGhpcyBpcyBwb3NpdGlvbmVkIGhlcmUgYmVjYXVzZSBpdCBkZXBlbmRzIG9uIEFycmF5SXRlcmF0b3JcbiAgdmFyIGFycmF5T2ZTdXBwb3J0c1N1YmNsYXNzaW5nID0gQXJyYXkub2YgPT09IEFycmF5U2hpbXMub2YgfHwgKGZ1bmN0aW9uICgpIHtcbiAgICAvLyBEZXRlY3RzIGEgYnVnIGluIFdlYmtpdCBuaWdodGx5IHIxODE4ODZcbiAgICB2YXIgRm9vID0gZnVuY3Rpb24gRm9vKGxlbikgeyB0aGlzLmxlbmd0aCA9IGxlbjsgfTtcbiAgICBGb28ucHJvdG90eXBlID0gW107XG4gICAgdmFyIGZvb0FyciA9IEFycmF5Lm9mLmFwcGx5KEZvbywgWzEsIDJdKTtcbiAgICByZXR1cm4gZm9vQXJyIGluc3RhbmNlb2YgRm9vICYmIGZvb0Fyci5sZW5ndGggPT09IDI7XG4gIH0oKSk7XG4gIGlmICghYXJyYXlPZlN1cHBvcnRzU3ViY2xhc3NpbmcpIHtcbiAgICBvdmVycmlkZU5hdGl2ZShBcnJheSwgJ29mJywgQXJyYXlTaGltcy5vZik7XG4gIH1cblxuICB2YXIgQXJyYXlQcm90b3R5cGVTaGltcyA9IHtcbiAgICBjb3B5V2l0aGluOiBmdW5jdGlvbiBjb3B5V2l0aGluKHRhcmdldCwgc3RhcnQpIHtcbiAgICAgIHZhciBvID0gRVMuVG9PYmplY3QodGhpcyk7XG4gICAgICB2YXIgbGVuID0gRVMuVG9MZW5ndGgoby5sZW5ndGgpO1xuICAgICAgdmFyIHJlbGF0aXZlVGFyZ2V0ID0gRVMuVG9JbnRlZ2VyKHRhcmdldCk7XG4gICAgICB2YXIgcmVsYXRpdmVTdGFydCA9IEVTLlRvSW50ZWdlcihzdGFydCk7XG4gICAgICB2YXIgdG8gPSByZWxhdGl2ZVRhcmdldCA8IDAgPyBfbWF4KGxlbiArIHJlbGF0aXZlVGFyZ2V0LCAwKSA6IF9taW4ocmVsYXRpdmVUYXJnZXQsIGxlbik7XG4gICAgICB2YXIgZnJvbSA9IHJlbGF0aXZlU3RhcnQgPCAwID8gX21heChsZW4gKyByZWxhdGl2ZVN0YXJ0LCAwKSA6IF9taW4ocmVsYXRpdmVTdGFydCwgbGVuKTtcbiAgICAgIHZhciBlbmQ7XG4gICAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+IDIpIHtcbiAgICAgICAgZW5kID0gYXJndW1lbnRzWzJdO1xuICAgICAgfVxuICAgICAgdmFyIHJlbGF0aXZlRW5kID0gdHlwZW9mIGVuZCA9PT0gJ3VuZGVmaW5lZCcgPyBsZW4gOiBFUy5Ub0ludGVnZXIoZW5kKTtcbiAgICAgIHZhciBmaW5hbEl0ZW0gPSByZWxhdGl2ZUVuZCA8IDAgPyBfbWF4KGxlbiArIHJlbGF0aXZlRW5kLCAwKSA6IF9taW4ocmVsYXRpdmVFbmQsIGxlbik7XG4gICAgICB2YXIgY291bnQgPSBfbWluKGZpbmFsSXRlbSAtIGZyb20sIGxlbiAtIHRvKTtcbiAgICAgIHZhciBkaXJlY3Rpb24gPSAxO1xuICAgICAgaWYgKGZyb20gPCB0byAmJiB0byA8IChmcm9tICsgY291bnQpKSB7XG4gICAgICAgIGRpcmVjdGlvbiA9IC0xO1xuICAgICAgICBmcm9tICs9IGNvdW50IC0gMTtcbiAgICAgICAgdG8gKz0gY291bnQgLSAxO1xuICAgICAgfVxuICAgICAgd2hpbGUgKGNvdW50ID4gMCkge1xuICAgICAgICBpZiAoZnJvbSBpbiBvKSB7XG4gICAgICAgICAgb1t0b10gPSBvW2Zyb21dO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGRlbGV0ZSBvW3RvXTtcbiAgICAgICAgfVxuICAgICAgICBmcm9tICs9IGRpcmVjdGlvbjtcbiAgICAgICAgdG8gKz0gZGlyZWN0aW9uO1xuICAgICAgICBjb3VudCAtPSAxO1xuICAgICAgfVxuICAgICAgcmV0dXJuIG87XG4gICAgfSxcblxuICAgIGZpbGw6IGZ1bmN0aW9uIGZpbGwodmFsdWUpIHtcbiAgICAgIHZhciBzdGFydDtcbiAgICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID4gMSkge1xuICAgICAgICBzdGFydCA9IGFyZ3VtZW50c1sxXTtcbiAgICAgIH1cbiAgICAgIHZhciBlbmQ7XG4gICAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+IDIpIHtcbiAgICAgICAgZW5kID0gYXJndW1lbnRzWzJdO1xuICAgICAgfVxuICAgICAgdmFyIE8gPSBFUy5Ub09iamVjdCh0aGlzKTtcbiAgICAgIHZhciBsZW4gPSBFUy5Ub0xlbmd0aChPLmxlbmd0aCk7XG4gICAgICBzdGFydCA9IEVTLlRvSW50ZWdlcih0eXBlb2Ygc3RhcnQgPT09ICd1bmRlZmluZWQnID8gMCA6IHN0YXJ0KTtcbiAgICAgIGVuZCA9IEVTLlRvSW50ZWdlcih0eXBlb2YgZW5kID09PSAndW5kZWZpbmVkJyA/IGxlbiA6IGVuZCk7XG5cbiAgICAgIHZhciByZWxhdGl2ZVN0YXJ0ID0gc3RhcnQgPCAwID8gX21heChsZW4gKyBzdGFydCwgMCkgOiBfbWluKHN0YXJ0LCBsZW4pO1xuICAgICAgdmFyIHJlbGF0aXZlRW5kID0gZW5kIDwgMCA/IGxlbiArIGVuZCA6IGVuZDtcblxuICAgICAgZm9yICh2YXIgaSA9IHJlbGF0aXZlU3RhcnQ7IGkgPCBsZW4gJiYgaSA8IHJlbGF0aXZlRW5kOyArK2kpIHtcbiAgICAgICAgT1tpXSA9IHZhbHVlO1xuICAgICAgfVxuICAgICAgcmV0dXJuIE87XG4gICAgfSxcblxuICAgIGZpbmQ6IGZ1bmN0aW9uIGZpbmQocHJlZGljYXRlKSB7XG4gICAgICB2YXIgbGlzdCA9IEVTLlRvT2JqZWN0KHRoaXMpO1xuICAgICAgdmFyIGxlbmd0aCA9IEVTLlRvTGVuZ3RoKGxpc3QubGVuZ3RoKTtcbiAgICAgIGlmICghRVMuSXNDYWxsYWJsZShwcmVkaWNhdGUpKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0FycmF5I2ZpbmQ6IHByZWRpY2F0ZSBtdXN0IGJlIGEgZnVuY3Rpb24nKTtcbiAgICAgIH1cbiAgICAgIHZhciB0aGlzQXJnID0gYXJndW1lbnRzLmxlbmd0aCA+IDEgPyBhcmd1bWVudHNbMV0gOiBudWxsO1xuICAgICAgZm9yICh2YXIgaSA9IDAsIHZhbHVlOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdmFsdWUgPSBsaXN0W2ldO1xuICAgICAgICBpZiAodGhpc0FyZykge1xuICAgICAgICAgIGlmIChfY2FsbChwcmVkaWNhdGUsIHRoaXNBcmcsIHZhbHVlLCBpLCBsaXN0KSkgeyByZXR1cm4gdmFsdWU7IH1cbiAgICAgICAgfSBlbHNlIGlmIChwcmVkaWNhdGUodmFsdWUsIGksIGxpc3QpKSB7XG4gICAgICAgICAgcmV0dXJuIHZhbHVlO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSxcblxuICAgIGZpbmRJbmRleDogZnVuY3Rpb24gZmluZEluZGV4KHByZWRpY2F0ZSkge1xuICAgICAgdmFyIGxpc3QgPSBFUy5Ub09iamVjdCh0aGlzKTtcbiAgICAgIHZhciBsZW5ndGggPSBFUy5Ub0xlbmd0aChsaXN0Lmxlbmd0aCk7XG4gICAgICBpZiAoIUVTLklzQ2FsbGFibGUocHJlZGljYXRlKSkge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdBcnJheSNmaW5kSW5kZXg6IHByZWRpY2F0ZSBtdXN0IGJlIGEgZnVuY3Rpb24nKTtcbiAgICAgIH1cbiAgICAgIHZhciB0aGlzQXJnID0gYXJndW1lbnRzLmxlbmd0aCA+IDEgPyBhcmd1bWVudHNbMV0gOiBudWxsO1xuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgICBpZiAodGhpc0FyZykge1xuICAgICAgICAgIGlmIChfY2FsbChwcmVkaWNhdGUsIHRoaXNBcmcsIGxpc3RbaV0sIGksIGxpc3QpKSB7IHJldHVybiBpOyB9XG4gICAgICAgIH0gZWxzZSBpZiAocHJlZGljYXRlKGxpc3RbaV0sIGksIGxpc3QpKSB7XG4gICAgICAgICAgcmV0dXJuIGk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiAtMTtcbiAgICB9LFxuXG4gICAga2V5czogZnVuY3Rpb24ga2V5cygpIHtcbiAgICAgIHJldHVybiBuZXcgQXJyYXlJdGVyYXRvcih0aGlzLCAna2V5Jyk7XG4gICAgfSxcblxuICAgIHZhbHVlczogZnVuY3Rpb24gdmFsdWVzKCkge1xuICAgICAgcmV0dXJuIG5ldyBBcnJheUl0ZXJhdG9yKHRoaXMsICd2YWx1ZScpO1xuICAgIH0sXG5cbiAgICBlbnRyaWVzOiBmdW5jdGlvbiBlbnRyaWVzKCkge1xuICAgICAgcmV0dXJuIG5ldyBBcnJheUl0ZXJhdG9yKHRoaXMsICdlbnRyeScpO1xuICAgIH1cbiAgfTtcbiAgLy8gU2FmYXJpIDcuMSBkZWZpbmVzIEFycmF5I2tleXMgYW5kIEFycmF5I2VudHJpZXMgbmF0aXZlbHksXG4gIC8vIGJ1dCB0aGUgcmVzdWx0aW5nIEFycmF5SXRlcmF0b3Igb2JqZWN0cyBkb24ndCBoYXZlIGEgXCJuZXh0XCIgbWV0aG9kLlxuICBpZiAoQXJyYXkucHJvdG90eXBlLmtleXMgJiYgIUVTLklzQ2FsbGFibGUoWzFdLmtleXMoKS5uZXh0KSkge1xuICAgIGRlbGV0ZSBBcnJheS5wcm90b3R5cGUua2V5cztcbiAgfVxuICBpZiAoQXJyYXkucHJvdG90eXBlLmVudHJpZXMgJiYgIUVTLklzQ2FsbGFibGUoWzFdLmVudHJpZXMoKS5uZXh0KSkge1xuICAgIGRlbGV0ZSBBcnJheS5wcm90b3R5cGUuZW50cmllcztcbiAgfVxuXG4gIC8vIENocm9tZSAzOCBkZWZpbmVzIEFycmF5I2tleXMgYW5kIEFycmF5I2VudHJpZXMsIGFuZCBBcnJheSNAQGl0ZXJhdG9yLCBidXQgbm90IEFycmF5I3ZhbHVlc1xuICBpZiAoQXJyYXkucHJvdG90eXBlLmtleXMgJiYgQXJyYXkucHJvdG90eXBlLmVudHJpZXMgJiYgIUFycmF5LnByb3RvdHlwZS52YWx1ZXMgJiYgQXJyYXkucHJvdG90eXBlWyRpdGVyYXRvciRdKSB7XG4gICAgZGVmaW5lUHJvcGVydGllcyhBcnJheS5wcm90b3R5cGUsIHtcbiAgICAgIHZhbHVlczogQXJyYXkucHJvdG90eXBlWyRpdGVyYXRvciRdXG4gICAgfSk7XG4gICAgaWYgKFR5cGUuc3ltYm9sKFN5bWJvbC51bnNjb3BhYmxlcykpIHtcbiAgICAgIEFycmF5LnByb3RvdHlwZVtTeW1ib2wudW5zY29wYWJsZXNdLnZhbHVlcyA9IHRydWU7XG4gICAgfVxuICB9XG4gIC8vIENocm9tZSA0MCBkZWZpbmVzIEFycmF5I3ZhbHVlcyB3aXRoIHRoZSBpbmNvcnJlY3QgbmFtZSwgYWx0aG91Z2ggQXJyYXkje2tleXMsZW50cmllc30gaGF2ZSB0aGUgY29ycmVjdCBuYW1lXG4gIGlmIChmdW5jdGlvbnNIYXZlTmFtZXMgJiYgQXJyYXkucHJvdG90eXBlLnZhbHVlcyAmJiBBcnJheS5wcm90b3R5cGUudmFsdWVzLm5hbWUgIT09ICd2YWx1ZXMnKSB7XG4gICAgdmFyIG9yaWdpbmFsQXJyYXlQcm90b3R5cGVWYWx1ZXMgPSBBcnJheS5wcm90b3R5cGUudmFsdWVzO1xuICAgIG92ZXJyaWRlTmF0aXZlKEFycmF5LnByb3RvdHlwZSwgJ3ZhbHVlcycsIGZ1bmN0aW9uIHZhbHVlcygpIHsgcmV0dXJuIEVTLkNhbGwob3JpZ2luYWxBcnJheVByb3RvdHlwZVZhbHVlcywgdGhpcywgYXJndW1lbnRzKTsgfSk7XG4gICAgZGVmaW5lUHJvcGVydHkoQXJyYXkucHJvdG90eXBlLCAkaXRlcmF0b3IkLCBBcnJheS5wcm90b3R5cGUudmFsdWVzLCB0cnVlKTtcbiAgfVxuICBkZWZpbmVQcm9wZXJ0aWVzKEFycmF5LnByb3RvdHlwZSwgQXJyYXlQcm90b3R5cGVTaGltcyk7XG5cbiAgaWYgKDEgLyBbdHJ1ZV0uaW5kZXhPZih0cnVlLCAtMCkgPCAwKSB7XG4gICAgLy8gaW5kZXhPZiB3aGVuIGdpdmVuIGEgcG9zaXRpb24gYXJnIG9mIC0wIHNob3VsZCByZXR1cm4gKzAuXG4gICAgLy8gaHR0cHM6Ly9naXRodWIuY29tL3RjMzkvZWNtYTI2Mi9wdWxsLzMxNlxuICAgIGRlZmluZVByb3BlcnR5KEFycmF5LnByb3RvdHlwZSwgJ2luZGV4T2YnLCBmdW5jdGlvbiBpbmRleE9mKHNlYXJjaEVsZW1lbnQpIHtcbiAgICAgIHZhciB2YWx1ZSA9IF9hcnJheUluZGV4T2ZBcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgICAgaWYgKHZhbHVlID09PSAwICYmICgxIC8gdmFsdWUpIDwgMCkge1xuICAgICAgICByZXR1cm4gMDtcbiAgICAgIH1cbiAgICAgIHJldHVybiB2YWx1ZTtcbiAgICB9LCB0cnVlKTtcbiAgfVxuXG4gIGFkZEl0ZXJhdG9yKEFycmF5LnByb3RvdHlwZSwgZnVuY3Rpb24gKCkgeyByZXR1cm4gdGhpcy52YWx1ZXMoKTsgfSk7XG4gIC8vIENocm9tZSBkZWZpbmVzIGtleXMvdmFsdWVzL2VudHJpZXMgb24gQXJyYXksIGJ1dCBkb2Vzbid0IGdpdmUgdXNcbiAgLy8gYW55IHdheSB0byBpZGVudGlmeSBpdHMgaXRlcmF0b3IuICBTbyBhZGQgb3VyIG93biBzaGltbWVkIGZpZWxkLlxuICBpZiAoT2JqZWN0LmdldFByb3RvdHlwZU9mKSB7XG4gICAgYWRkSXRlcmF0b3IoT2JqZWN0LmdldFByb3RvdHlwZU9mKFtdLnZhbHVlcygpKSk7XG4gIH1cblxuICAvLyBub3RlOiB0aGlzIGlzIHBvc2l0aW9uZWQgaGVyZSBiZWNhdXNlIGl0IHJlbGllcyBvbiBBcnJheSNlbnRyaWVzXG4gIHZhciBhcnJheUZyb21Td2FsbG93c05lZ2F0aXZlTGVuZ3RocyA9IChmdW5jdGlvbiAoKSB7XG4gICAgLy8gRGV0ZWN0cyBhIEZpcmVmb3ggYnVnIGluIHYzMlxuICAgIC8vIGh0dHBzOi8vYnVnemlsbGEubW96aWxsYS5vcmcvc2hvd19idWcuY2dpP2lkPTEwNjM5OTNcbiAgICByZXR1cm4gdmFsdWVPckZhbHNlSWZUaHJvd3MoZnVuY3Rpb24gKCkgeyByZXR1cm4gQXJyYXkuZnJvbSh7IGxlbmd0aDogLTEgfSkubGVuZ3RoID09PSAwOyB9KTtcbiAgfSgpKTtcbiAgdmFyIGFycmF5RnJvbUhhbmRsZXNJdGVyYWJsZXMgPSAoZnVuY3Rpb24gKCkge1xuICAgIC8vIERldGVjdHMgYSBidWcgaW4gV2Via2l0IG5pZ2h0bHkgcjE4MTg4NlxuICAgIHZhciBhcnIgPSBBcnJheS5mcm9tKFswXS5lbnRyaWVzKCkpO1xuICAgIHJldHVybiBhcnIubGVuZ3RoID09PSAxICYmIGlzQXJyYXkoYXJyWzBdKSAmJiBhcnJbMF1bMF0gPT09IDAgJiYgYXJyWzBdWzFdID09PSAwO1xuICB9KCkpO1xuICBpZiAoIWFycmF5RnJvbVN3YWxsb3dzTmVnYXRpdmVMZW5ndGhzIHx8ICFhcnJheUZyb21IYW5kbGVzSXRlcmFibGVzKSB7XG4gICAgb3ZlcnJpZGVOYXRpdmUoQXJyYXksICdmcm9tJywgQXJyYXlTaGltcy5mcm9tKTtcbiAgfVxuICB2YXIgYXJyYXlGcm9tSGFuZGxlc1VuZGVmaW5lZE1hcEZ1bmN0aW9uID0gKGZ1bmN0aW9uICgpIHtcbiAgICAvLyBNaWNyb3NvZnQgRWRnZSB2MC4xMSB0aHJvd3MgaWYgdGhlIG1hcEZuIGFyZ3VtZW50IGlzICpwcm92aWRlZCogYnV0IHVuZGVmaW5lZCxcbiAgICAvLyBidXQgdGhlIHNwZWMgZG9lc24ndCBjYXJlIGlmIGl0J3MgcHJvdmlkZWQgb3Igbm90IC0gdW5kZWZpbmVkIGRvZXNuJ3QgdGhyb3cuXG4gICAgcmV0dXJuIHZhbHVlT3JGYWxzZUlmVGhyb3dzKGZ1bmN0aW9uICgpIHsgcmV0dXJuIEFycmF5LmZyb20oWzBdLCB2b2lkIDApOyB9KTtcbiAgfSgpKTtcbiAgaWYgKCFhcnJheUZyb21IYW5kbGVzVW5kZWZpbmVkTWFwRnVuY3Rpb24pIHtcbiAgICB2YXIgb3JpZ0FycmF5RnJvbSA9IEFycmF5LmZyb207XG4gICAgb3ZlcnJpZGVOYXRpdmUoQXJyYXksICdmcm9tJywgZnVuY3Rpb24gZnJvbShpdGVtcykge1xuICAgICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPiAxICYmIHR5cGVvZiBhcmd1bWVudHNbMV0gIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIHJldHVybiBFUy5DYWxsKG9yaWdBcnJheUZyb20sIHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gX2NhbGwob3JpZ0FycmF5RnJvbSwgdGhpcywgaXRlbXMpO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgdmFyIGludDMyc0FzT25lID0gLShNYXRoLnBvdygyLCAzMikgLSAxKTtcbiAgdmFyIHRvTGVuZ3Roc0NvcnJlY3RseSA9IGZ1bmN0aW9uIChtZXRob2QsIHJldmVyc2VkKSB7XG4gICAgdmFyIG9iaiA9IHsgbGVuZ3RoOiBpbnQzMnNBc09uZSB9O1xuICAgIG9ialtyZXZlcnNlZCA/ICgob2JqLmxlbmd0aCA+Pj4gMCkgLSAxKSA6IDBdID0gdHJ1ZTtcbiAgICByZXR1cm4gdmFsdWVPckZhbHNlSWZUaHJvd3MoZnVuY3Rpb24gKCkge1xuICAgICAgX2NhbGwobWV0aG9kLCBvYmosIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgLy8gbm90ZTogaW4gbm9uY29uZm9ybWluZyBicm93c2VycywgdGhpcyB3aWxsIGJlIGNhbGxlZFxuICAgICAgICAvLyAtMSA+Pj4gMCB0aW1lcywgd2hpY2ggaXMgNDI5NDk2NzI5NSwgc28gdGhlIHRocm93IG1hdHRlcnMuXG4gICAgICAgIHRocm93IG5ldyBSYW5nZUVycm9yKCdzaG91bGQgbm90IHJlYWNoIGhlcmUnKTtcbiAgICAgIH0sIFtdKTtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH0pO1xuICB9O1xuICBpZiAoIXRvTGVuZ3Roc0NvcnJlY3RseShBcnJheS5wcm90b3R5cGUuZm9yRWFjaCkpIHtcbiAgICB2YXIgb3JpZ2luYWxGb3JFYWNoID0gQXJyYXkucHJvdG90eXBlLmZvckVhY2g7XG4gICAgb3ZlcnJpZGVOYXRpdmUoQXJyYXkucHJvdG90eXBlLCAnZm9yRWFjaCcsIGZ1bmN0aW9uIGZvckVhY2goY2FsbGJhY2tGbikge1xuICAgICAgcmV0dXJuIEVTLkNhbGwob3JpZ2luYWxGb3JFYWNoLCB0aGlzLmxlbmd0aCA+PSAwID8gdGhpcyA6IFtdLCBhcmd1bWVudHMpO1xuICAgIH0sIHRydWUpO1xuICB9XG4gIGlmICghdG9MZW5ndGhzQ29ycmVjdGx5KEFycmF5LnByb3RvdHlwZS5tYXApKSB7XG4gICAgdmFyIG9yaWdpbmFsTWFwID0gQXJyYXkucHJvdG90eXBlLm1hcDtcbiAgICBvdmVycmlkZU5hdGl2ZShBcnJheS5wcm90b3R5cGUsICdtYXAnLCBmdW5jdGlvbiBtYXAoY2FsbGJhY2tGbikge1xuICAgICAgcmV0dXJuIEVTLkNhbGwob3JpZ2luYWxNYXAsIHRoaXMubGVuZ3RoID49IDAgPyB0aGlzIDogW10sIGFyZ3VtZW50cyk7XG4gICAgfSwgdHJ1ZSk7XG4gIH1cbiAgaWYgKCF0b0xlbmd0aHNDb3JyZWN0bHkoQXJyYXkucHJvdG90eXBlLmZpbHRlcikpIHtcbiAgICB2YXIgb3JpZ2luYWxGaWx0ZXIgPSBBcnJheS5wcm90b3R5cGUuZmlsdGVyO1xuICAgIG92ZXJyaWRlTmF0aXZlKEFycmF5LnByb3RvdHlwZSwgJ2ZpbHRlcicsIGZ1bmN0aW9uIGZpbHRlcihjYWxsYmFja0ZuKSB7XG4gICAgICByZXR1cm4gRVMuQ2FsbChvcmlnaW5hbEZpbHRlciwgdGhpcy5sZW5ndGggPj0gMCA/IHRoaXMgOiBbXSwgYXJndW1lbnRzKTtcbiAgICB9LCB0cnVlKTtcbiAgfVxuICBpZiAoIXRvTGVuZ3Roc0NvcnJlY3RseShBcnJheS5wcm90b3R5cGUuc29tZSkpIHtcbiAgICB2YXIgb3JpZ2luYWxTb21lID0gQXJyYXkucHJvdG90eXBlLnNvbWU7XG4gICAgb3ZlcnJpZGVOYXRpdmUoQXJyYXkucHJvdG90eXBlLCAnc29tZScsIGZ1bmN0aW9uIHNvbWUoY2FsbGJhY2tGbikge1xuICAgICAgcmV0dXJuIEVTLkNhbGwob3JpZ2luYWxTb21lLCB0aGlzLmxlbmd0aCA+PSAwID8gdGhpcyA6IFtdLCBhcmd1bWVudHMpO1xuICAgIH0sIHRydWUpO1xuICB9XG4gIGlmICghdG9MZW5ndGhzQ29ycmVjdGx5KEFycmF5LnByb3RvdHlwZS5ldmVyeSkpIHtcbiAgICB2YXIgb3JpZ2luYWxFdmVyeSA9IEFycmF5LnByb3RvdHlwZS5ldmVyeTtcbiAgICBvdmVycmlkZU5hdGl2ZShBcnJheS5wcm90b3R5cGUsICdldmVyeScsIGZ1bmN0aW9uIGV2ZXJ5KGNhbGxiYWNrRm4pIHtcbiAgICAgIHJldHVybiBFUy5DYWxsKG9yaWdpbmFsRXZlcnksIHRoaXMubGVuZ3RoID49IDAgPyB0aGlzIDogW10sIGFyZ3VtZW50cyk7XG4gICAgfSwgdHJ1ZSk7XG4gIH1cbiAgaWYgKCF0b0xlbmd0aHNDb3JyZWN0bHkoQXJyYXkucHJvdG90eXBlLnJlZHVjZSkpIHtcbiAgICB2YXIgb3JpZ2luYWxSZWR1Y2UgPSBBcnJheS5wcm90b3R5cGUucmVkdWNlO1xuICAgIG92ZXJyaWRlTmF0aXZlKEFycmF5LnByb3RvdHlwZSwgJ3JlZHVjZScsIGZ1bmN0aW9uIHJlZHVjZShjYWxsYmFja0ZuKSB7XG4gICAgICByZXR1cm4gRVMuQ2FsbChvcmlnaW5hbFJlZHVjZSwgdGhpcy5sZW5ndGggPj0gMCA/IHRoaXMgOiBbXSwgYXJndW1lbnRzKTtcbiAgICB9LCB0cnVlKTtcbiAgfVxuICBpZiAoIXRvTGVuZ3Roc0NvcnJlY3RseShBcnJheS5wcm90b3R5cGUucmVkdWNlUmlnaHQsIHRydWUpKSB7XG4gICAgdmFyIG9yaWdpbmFsUmVkdWNlUmlnaHQgPSBBcnJheS5wcm90b3R5cGUucmVkdWNlUmlnaHQ7XG4gICAgb3ZlcnJpZGVOYXRpdmUoQXJyYXkucHJvdG90eXBlLCAncmVkdWNlUmlnaHQnLCBmdW5jdGlvbiByZWR1Y2VSaWdodChjYWxsYmFja0ZuKSB7XG4gICAgICByZXR1cm4gRVMuQ2FsbChvcmlnaW5hbFJlZHVjZVJpZ2h0LCB0aGlzLmxlbmd0aCA+PSAwID8gdGhpcyA6IFtdLCBhcmd1bWVudHMpO1xuICAgIH0sIHRydWUpO1xuICB9XG5cbiAgdmFyIGxhY2tzT2N0YWxTdXBwb3J0ID0gTnVtYmVyKCcwbzEwJykgIT09IDg7XG4gIHZhciBsYWNrc0JpbmFyeVN1cHBvcnQgPSBOdW1iZXIoJzBiMTAnKSAhPT0gMjtcbiAgdmFyIHRyaW1zTm9uV2hpdGVzcGFjZSA9IF9zb21lKG5vbldTLCBmdW5jdGlvbiAoYykge1xuICAgIHJldHVybiBOdW1iZXIoYyArIDAgKyBjKSA9PT0gMDtcbiAgfSk7XG4gIGlmIChsYWNrc09jdGFsU3VwcG9ydCB8fCBsYWNrc0JpbmFyeVN1cHBvcnQgfHwgdHJpbXNOb25XaGl0ZXNwYWNlKSB7XG4gICAgdmFyIE9yaWdOdW1iZXIgPSBOdW1iZXI7XG4gICAgdmFyIGJpbmFyeVJlZ2V4ID0gL14wYlswMV0rJC9pO1xuICAgIHZhciBvY3RhbFJlZ2V4ID0gL14wb1swLTddKyQvaTtcbiAgICAvLyBOb3RlIHRoYXQgaW4gSUUgOCwgUmVnRXhwLnByb3RvdHlwZS50ZXN0IGRvZXNuJ3Qgc2VlbSB0byBleGlzdDogaWUsIFwidGVzdFwiIGlzIGFuIG93biBwcm9wZXJ0eSBvZiByZWdleGVzLiB3dGYuXG4gICAgdmFyIGlzQmluYXJ5ID0gYmluYXJ5UmVnZXgudGVzdC5iaW5kKGJpbmFyeVJlZ2V4KTtcbiAgICB2YXIgaXNPY3RhbCA9IG9jdGFsUmVnZXgudGVzdC5iaW5kKG9jdGFsUmVnZXgpO1xuICAgIHZhciB0b1ByaW1pdGl2ZSA9IGZ1bmN0aW9uIChPKSB7IC8vIG5lZWQgdG8gcmVwbGFjZSB0aGlzIHdpdGggYGVzLXRvLXByaW1pdGl2ZS9lczZgXG4gICAgICB2YXIgcmVzdWx0O1xuICAgICAgaWYgKHR5cGVvZiBPLnZhbHVlT2YgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgcmVzdWx0ID0gTy52YWx1ZU9mKCk7XG4gICAgICAgIGlmIChUeXBlLnByaW1pdGl2ZShyZXN1bHQpKSB7XG4gICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgaWYgKHR5cGVvZiBPLnRvU3RyaW5nID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIHJlc3VsdCA9IE8udG9TdHJpbmcoKTtcbiAgICAgICAgaWYgKFR5cGUucHJpbWl0aXZlKHJlc3VsdCkpIHtcbiAgICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdObyBkZWZhdWx0IHZhbHVlJyk7XG4gICAgfTtcbiAgICB2YXIgaGFzTm9uV1MgPSBub25XU3JlZ2V4LnRlc3QuYmluZChub25XU3JlZ2V4KTtcbiAgICB2YXIgaXNCYWRIZXggPSBpc0JhZEhleFJlZ2V4LnRlc3QuYmluZChpc0JhZEhleFJlZ2V4KTtcbiAgICB2YXIgTnVtYmVyU2hpbSA9IChmdW5jdGlvbiAoKSB7XG4gICAgICAvLyB0aGlzIGlzIHdyYXBwZWQgaW4gYW4gSUlGRSBiZWNhdXNlIG9mIElFIDYtOCdzIHdhY2t5IHNjb3BpbmcgaXNzdWVzIHdpdGggbmFtZWQgZnVuY3Rpb24gZXhwcmVzc2lvbnMuXG4gICAgICB2YXIgTnVtYmVyU2hpbSA9IGZ1bmN0aW9uIE51bWJlcih2YWx1ZSkge1xuICAgICAgICB2YXIgcHJpbVZhbHVlO1xuICAgICAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICBwcmltVmFsdWUgPSBUeXBlLnByaW1pdGl2ZSh2YWx1ZSkgPyB2YWx1ZSA6IHRvUHJpbWl0aXZlKHZhbHVlLCAnbnVtYmVyJyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcHJpbVZhbHVlID0gMDtcbiAgICAgICAgfVxuICAgICAgICBpZiAodHlwZW9mIHByaW1WYWx1ZSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICBwcmltVmFsdWUgPSBFUy5DYWxsKHRyaW1TaGltLCBwcmltVmFsdWUpO1xuICAgICAgICAgIGlmIChpc0JpbmFyeShwcmltVmFsdWUpKSB7XG4gICAgICAgICAgICBwcmltVmFsdWUgPSBwYXJzZUludChfc3RyU2xpY2UocHJpbVZhbHVlLCAyKSwgMik7XG4gICAgICAgICAgfSBlbHNlIGlmIChpc09jdGFsKHByaW1WYWx1ZSkpIHtcbiAgICAgICAgICAgIHByaW1WYWx1ZSA9IHBhcnNlSW50KF9zdHJTbGljZShwcmltVmFsdWUsIDIpLCA4KTtcbiAgICAgICAgICB9IGVsc2UgaWYgKGhhc05vbldTKHByaW1WYWx1ZSkgfHwgaXNCYWRIZXgocHJpbVZhbHVlKSkge1xuICAgICAgICAgICAgcHJpbVZhbHVlID0gTmFOO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICB2YXIgcmVjZWl2ZXIgPSB0aGlzO1xuICAgICAgICB2YXIgdmFsdWVPZlN1Y2NlZWRzID0gdmFsdWVPckZhbHNlSWZUaHJvd3MoZnVuY3Rpb24gKCkge1xuICAgICAgICAgIE9yaWdOdW1iZXIucHJvdG90eXBlLnZhbHVlT2YuY2FsbChyZWNlaXZlcik7XG4gICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH0pO1xuICAgICAgICBpZiAocmVjZWl2ZXIgaW5zdGFuY2VvZiBOdW1iZXJTaGltICYmICF2YWx1ZU9mU3VjY2VlZHMpIHtcbiAgICAgICAgICByZXR1cm4gbmV3IE9yaWdOdW1iZXIocHJpbVZhbHVlKTtcbiAgICAgICAgfVxuICAgICAgICAvKiBqc2hpbnQgbmV3Y2FwOiBmYWxzZSAqL1xuICAgICAgICByZXR1cm4gT3JpZ051bWJlcihwcmltVmFsdWUpO1xuICAgICAgICAvKiBqc2hpbnQgbmV3Y2FwOiB0cnVlICovXG4gICAgICB9O1xuICAgICAgcmV0dXJuIE51bWJlclNoaW07XG4gICAgfSgpKTtcbiAgICB3cmFwQ29uc3RydWN0b3IoT3JpZ051bWJlciwgTnVtYmVyU2hpbSwge30pO1xuICAgIC8vIHRoaXMgaXMgbmVjZXNzYXJ5IGZvciBFUzMgYnJvd3NlcnMsIHdoZXJlIHRoZXNlIHByb3BlcnRpZXMgYXJlIG5vbi1lbnVtZXJhYmxlLlxuICAgIGRlZmluZVByb3BlcnRpZXMoTnVtYmVyU2hpbSwge1xuICAgICAgTmFOOiBPcmlnTnVtYmVyLk5hTixcbiAgICAgIE1BWF9WQUxVRTogT3JpZ051bWJlci5NQVhfVkFMVUUsXG4gICAgICBNSU5fVkFMVUU6IE9yaWdOdW1iZXIuTUlOX1ZBTFVFLFxuICAgICAgTkVHQVRJVkVfSU5GSU5JVFk6IE9yaWdOdW1iZXIuTkVHQVRJVkVfSU5GSU5JVFksXG4gICAgICBQT1NJVElWRV9JTkZJTklUWTogT3JpZ051bWJlci5QT1NJVElWRV9JTkZJTklUWVxuICAgIH0pO1xuICAgIC8qIGdsb2JhbHMgTnVtYmVyOiB0cnVlICovXG4gICAgLyogZXNsaW50LWRpc2FibGUgbm8tdW5kZWYgKi9cbiAgICAvKiBqc2hpbnQgLVcwMjAgKi9cbiAgICBOdW1iZXIgPSBOdW1iZXJTaGltO1xuICAgIFZhbHVlLnJlZGVmaW5lKGdsb2JhbHMsICdOdW1iZXInLCBOdW1iZXJTaGltKTtcbiAgICAvKiBqc2hpbnQgK1cwMjAgKi9cbiAgICAvKiBlc2xpbnQtZW5hYmxlIG5vLXVuZGVmICovXG4gICAgLyogZ2xvYmFscyBOdW1iZXI6IGZhbHNlICovXG4gIH1cblxuICB2YXIgbWF4U2FmZUludGVnZXIgPSBNYXRoLnBvdygyLCA1MykgLSAxO1xuICBkZWZpbmVQcm9wZXJ0aWVzKE51bWJlciwge1xuICAgIE1BWF9TQUZFX0lOVEVHRVI6IG1heFNhZmVJbnRlZ2VyLFxuICAgIE1JTl9TQUZFX0lOVEVHRVI6IC1tYXhTYWZlSW50ZWdlcixcbiAgICBFUFNJTE9OOiAyLjIyMDQ0NjA0OTI1MDMxM2UtMTYsXG5cbiAgICBwYXJzZUludDogZ2xvYmFscy5wYXJzZUludCxcbiAgICBwYXJzZUZsb2F0OiBnbG9iYWxzLnBhcnNlRmxvYXQsXG5cbiAgICBpc0Zpbml0ZTogbnVtYmVySXNGaW5pdGUsXG5cbiAgICBpc0ludGVnZXI6IGZ1bmN0aW9uIGlzSW50ZWdlcih2YWx1ZSkge1xuICAgICAgcmV0dXJuIG51bWJlcklzRmluaXRlKHZhbHVlKSAmJiBFUy5Ub0ludGVnZXIodmFsdWUpID09PSB2YWx1ZTtcbiAgICB9LFxuXG4gICAgaXNTYWZlSW50ZWdlcjogZnVuY3Rpb24gaXNTYWZlSW50ZWdlcih2YWx1ZSkge1xuICAgICAgcmV0dXJuIE51bWJlci5pc0ludGVnZXIodmFsdWUpICYmIF9hYnModmFsdWUpIDw9IE51bWJlci5NQVhfU0FGRV9JTlRFR0VSO1xuICAgIH0sXG5cbiAgICBpc05hTjogbnVtYmVySXNOYU5cbiAgfSk7XG4gIC8vIEZpcmVmb3ggMzcgaGFzIGEgY29uZm9ybWluZyBOdW1iZXIucGFyc2VJbnQsIGJ1dCBpdCdzIG5vdCA9PT0gdG8gdGhlIGdsb2JhbCBwYXJzZUludCAoZml4ZWQgaW4gdjQwKVxuICBkZWZpbmVQcm9wZXJ0eShOdW1iZXIsICdwYXJzZUludCcsIGdsb2JhbHMucGFyc2VJbnQsIE51bWJlci5wYXJzZUludCAhPT0gZ2xvYmFscy5wYXJzZUludCk7XG5cbiAgLy8gV29yayBhcm91bmQgYnVncyBpbiBBcnJheSNmaW5kIGFuZCBBcnJheSNmaW5kSW5kZXggLS0gZWFybHlcbiAgLy8gaW1wbGVtZW50YXRpb25zIHNraXBwZWQgaG9sZXMgaW4gc3BhcnNlIGFycmF5cy4gKE5vdGUgdGhhdCB0aGVcbiAgLy8gaW1wbGVtZW50YXRpb25zIG9mIGZpbmQvZmluZEluZGV4IGluZGlyZWN0bHkgdXNlIHNoaW1tZWRcbiAgLy8gbWV0aG9kcyBvZiBOdW1iZXIsIHNvIHRoaXMgdGVzdCBoYXMgdG8gaGFwcGVuIGRvd24gaGVyZS4pXG4gIC8qanNoaW50IGVsaXNpb246IHRydWUgKi9cbiAgLyogZXNsaW50LWRpc2FibGUgbm8tc3BhcnNlLWFycmF5cyAqL1xuICBpZiAoIVssIDFdLmZpbmQoZnVuY3Rpb24gKGl0ZW0sIGlkeCkgeyByZXR1cm4gaWR4ID09PSAwOyB9KSkge1xuICAgIG92ZXJyaWRlTmF0aXZlKEFycmF5LnByb3RvdHlwZSwgJ2ZpbmQnLCBBcnJheVByb3RvdHlwZVNoaW1zLmZpbmQpO1xuICB9XG4gIGlmIChbLCAxXS5maW5kSW5kZXgoZnVuY3Rpb24gKGl0ZW0sIGlkeCkgeyByZXR1cm4gaWR4ID09PSAwOyB9KSAhPT0gMCkge1xuICAgIG92ZXJyaWRlTmF0aXZlKEFycmF5LnByb3RvdHlwZSwgJ2ZpbmRJbmRleCcsIEFycmF5UHJvdG90eXBlU2hpbXMuZmluZEluZGV4KTtcbiAgfVxuICAvKiBlc2xpbnQtZW5hYmxlIG5vLXNwYXJzZS1hcnJheXMgKi9cbiAgLypqc2hpbnQgZWxpc2lvbjogZmFsc2UgKi9cblxuICB2YXIgaXNFbnVtZXJhYmxlT24gPSBGdW5jdGlvbi5iaW5kLmNhbGwoRnVuY3Rpb24uYmluZCwgT2JqZWN0LnByb3RvdHlwZS5wcm9wZXJ0eUlzRW51bWVyYWJsZSk7XG4gIHZhciBlbnN1cmVFbnVtZXJhYmxlID0gZnVuY3Rpb24gZW5zdXJlRW51bWVyYWJsZShvYmosIHByb3ApIHtcbiAgICBpZiAoc3VwcG9ydHNEZXNjcmlwdG9ycyAmJiBpc0VudW1lcmFibGVPbihvYmosIHByb3ApKSB7XG4gICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkob2JqLCBwcm9wLCB7IGVudW1lcmFibGU6IGZhbHNlIH0pO1xuICAgIH1cbiAgfTtcbiAgdmFyIHNsaWNlQXJncyA9IGZ1bmN0aW9uIHNsaWNlQXJncygpIHtcbiAgICAvLyBwZXIgaHR0cHM6Ly9naXRodWIuY29tL3BldGthYW50b25vdi9ibHVlYmlyZC93aWtpL09wdGltaXphdGlvbi1raWxsZXJzIzMyLWxlYWtpbmctYXJndW1lbnRzXG4gICAgLy8gYW5kIGh0dHBzOi8vZ2lzdC5naXRodWIuY29tL1dlYlJlZmxlY3Rpb24vNDMyNzc2MmNiODdhOGM2MzRhMjlcbiAgICB2YXIgaW5pdGlhbCA9IE51bWJlcih0aGlzKTtcbiAgICB2YXIgbGVuID0gYXJndW1lbnRzLmxlbmd0aDtcbiAgICB2YXIgZGVzaXJlZEFyZ0NvdW50ID0gbGVuIC0gaW5pdGlhbDtcbiAgICB2YXIgYXJncyA9IG5ldyBBcnJheShkZXNpcmVkQXJnQ291bnQgPCAwID8gMCA6IGRlc2lyZWRBcmdDb3VudCk7XG4gICAgZm9yICh2YXIgaSA9IGluaXRpYWw7IGkgPCBsZW47ICsraSkge1xuICAgICAgYXJnc1tpIC0gaW5pdGlhbF0gPSBhcmd1bWVudHNbaV07XG4gICAgfVxuICAgIHJldHVybiBhcmdzO1xuICB9O1xuICB2YXIgYXNzaWduVG8gPSBmdW5jdGlvbiBhc3NpZ25Ubyhzb3VyY2UpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24gYXNzaWduVG9Tb3VyY2UodGFyZ2V0LCBrZXkpIHtcbiAgICAgIHRhcmdldFtrZXldID0gc291cmNlW2tleV07XG4gICAgICByZXR1cm4gdGFyZ2V0O1xuICAgIH07XG4gIH07XG4gIHZhciBhc3NpZ25SZWR1Y2VyID0gZnVuY3Rpb24gKHRhcmdldCwgc291cmNlKSB7XG4gICAgdmFyIHNvdXJjZUtleXMgPSBrZXlzKE9iamVjdChzb3VyY2UpKTtcbiAgICB2YXIgc3ltYm9scztcbiAgICBpZiAoRVMuSXNDYWxsYWJsZShPYmplY3QuZ2V0T3duUHJvcGVydHlTeW1ib2xzKSkge1xuICAgICAgc3ltYm9scyA9IF9maWx0ZXIoT2JqZWN0LmdldE93blByb3BlcnR5U3ltYm9scyhPYmplY3Qoc291cmNlKSksIGlzRW51bWVyYWJsZU9uKHNvdXJjZSkpO1xuICAgIH1cbiAgICByZXR1cm4gX3JlZHVjZShfY29uY2F0KHNvdXJjZUtleXMsIHN5bWJvbHMgfHwgW10pLCBhc3NpZ25Ubyhzb3VyY2UpLCB0YXJnZXQpO1xuICB9O1xuXG4gIHZhciBPYmplY3RTaGltcyA9IHtcbiAgICAvLyAxOS4xLjMuMVxuICAgIGFzc2lnbjogZnVuY3Rpb24gKHRhcmdldCwgc291cmNlKSB7XG4gICAgICB2YXIgdG8gPSBFUy5Ub09iamVjdCh0YXJnZXQsICdDYW5ub3QgY29udmVydCB1bmRlZmluZWQgb3IgbnVsbCB0byBvYmplY3QnKTtcbiAgICAgIHJldHVybiBfcmVkdWNlKEVTLkNhbGwoc2xpY2VBcmdzLCAxLCBhcmd1bWVudHMpLCBhc3NpZ25SZWR1Y2VyLCB0byk7XG4gICAgfSxcblxuICAgIC8vIEFkZGVkIGluIFdlYktpdCBpbiBodHRwczovL2J1Z3Mud2Via2l0Lm9yZy9zaG93X2J1Zy5jZ2k/aWQ9MTQzODY1XG4gICAgaXM6IGZ1bmN0aW9uIGlzKGEsIGIpIHtcbiAgICAgIHJldHVybiBFUy5TYW1lVmFsdWUoYSwgYik7XG4gICAgfVxuICB9O1xuICB2YXIgYXNzaWduSGFzUGVuZGluZ0V4Y2VwdGlvbnMgPSBPYmplY3QuYXNzaWduICYmIE9iamVjdC5wcmV2ZW50RXh0ZW5zaW9ucyAmJiAoZnVuY3Rpb24gKCkge1xuICAgIC8vIEZpcmVmb3ggMzcgc3RpbGwgaGFzIFwicGVuZGluZyBleGNlcHRpb25cIiBsb2dpYyBpbiBpdHMgT2JqZWN0LmFzc2lnbiBpbXBsZW1lbnRhdGlvbixcbiAgICAvLyB3aGljaCBpcyA3MiUgc2xvd2VyIHRoYW4gb3VyIHNoaW0sIGFuZCBGaXJlZm94IDQwJ3MgbmF0aXZlIGltcGxlbWVudGF0aW9uLlxuICAgIHZhciB0aHJvd2VyID0gT2JqZWN0LnByZXZlbnRFeHRlbnNpb25zKHsgMTogMiB9KTtcbiAgICB0cnkge1xuICAgICAgT2JqZWN0LmFzc2lnbih0aHJvd2VyLCAneHknKTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICByZXR1cm4gdGhyb3dlclsxXSA9PT0gJ3knO1xuICAgIH1cbiAgfSgpKTtcbiAgaWYgKGFzc2lnbkhhc1BlbmRpbmdFeGNlcHRpb25zKSB7XG4gICAgb3ZlcnJpZGVOYXRpdmUoT2JqZWN0LCAnYXNzaWduJywgT2JqZWN0U2hpbXMuYXNzaWduKTtcbiAgfVxuICBkZWZpbmVQcm9wZXJ0aWVzKE9iamVjdCwgT2JqZWN0U2hpbXMpO1xuXG4gIGlmIChzdXBwb3J0c0Rlc2NyaXB0b3JzKSB7XG4gICAgdmFyIEVTNU9iamVjdFNoaW1zID0ge1xuICAgICAgLy8gMTkuMS4zLjlcbiAgICAgIC8vIHNoaW0gZnJvbSBodHRwczovL2dpc3QuZ2l0aHViLmNvbS9XZWJSZWZsZWN0aW9uLzU1OTM1NTRcbiAgICAgIHNldFByb3RvdHlwZU9mOiAoZnVuY3Rpb24gKE9iamVjdCwgbWFnaWMpIHtcbiAgICAgICAgdmFyIHNldDtcblxuICAgICAgICB2YXIgY2hlY2tBcmdzID0gZnVuY3Rpb24gKE8sIHByb3RvKSB7XG4gICAgICAgICAgaWYgKCFFUy5UeXBlSXNPYmplY3QoTykpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ2Nhbm5vdCBzZXQgcHJvdG90eXBlIG9uIGEgbm9uLW9iamVjdCcpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoIShwcm90byA9PT0gbnVsbCB8fCBFUy5UeXBlSXNPYmplY3QocHJvdG8pKSkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignY2FuIG9ubHkgc2V0IHByb3RvdHlwZSB0byBhbiBvYmplY3Qgb3IgbnVsbCcgKyBwcm90byk7XG4gICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIHZhciBzZXRQcm90b3R5cGVPZiA9IGZ1bmN0aW9uIChPLCBwcm90bykge1xuICAgICAgICAgIGNoZWNrQXJncyhPLCBwcm90byk7XG4gICAgICAgICAgX2NhbGwoc2V0LCBPLCBwcm90byk7XG4gICAgICAgICAgcmV0dXJuIE87XG4gICAgICAgIH07XG5cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAvLyB0aGlzIHdvcmtzIGFscmVhZHkgaW4gRmlyZWZveCBhbmQgU2FmYXJpXG4gICAgICAgICAgc2V0ID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcihPYmplY3QucHJvdG90eXBlLCBtYWdpYykuc2V0O1xuICAgICAgICAgIF9jYWxsKHNldCwge30sIG51bGwpO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgaWYgKE9iamVjdC5wcm90b3R5cGUgIT09IHt9W21hZ2ljXSkge1xuICAgICAgICAgICAgLy8gSUUgPCAxMSBjYW5ub3QgYmUgc2hpbW1lZFxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cbiAgICAgICAgICAvLyBwcm9iYWJseSBDaHJvbWUgb3Igc29tZSBvbGQgTW9iaWxlIHN0b2NrIGJyb3dzZXJcbiAgICAgICAgICBzZXQgPSBmdW5jdGlvbiAocHJvdG8pIHtcbiAgICAgICAgICAgIHRoaXNbbWFnaWNdID0gcHJvdG87XG4gICAgICAgICAgfTtcbiAgICAgICAgICAvLyBwbGVhc2Ugbm90ZSB0aGF0IHRoaXMgd2lsbCAqKm5vdCoqIHdvcmtcbiAgICAgICAgICAvLyBpbiB0aG9zZSBicm93c2VycyB0aGF0IGRvIG5vdCBpbmhlcml0XG4gICAgICAgICAgLy8gX19wcm90b19fIGJ5IG1pc3Rha2UgZnJvbSBPYmplY3QucHJvdG90eXBlXG4gICAgICAgICAgLy8gaW4gdGhlc2UgY2FzZXMgd2Ugc2hvdWxkIHByb2JhYmx5IHRocm93IGFuIGVycm9yXG4gICAgICAgICAgLy8gb3IgYXQgbGVhc3QgYmUgaW5mb3JtZWQgYWJvdXQgdGhlIGlzc3VlXG4gICAgICAgICAgc2V0UHJvdG90eXBlT2YucG9seWZpbGwgPSBzZXRQcm90b3R5cGVPZihcbiAgICAgICAgICAgIHNldFByb3RvdHlwZU9mKHt9LCBudWxsKSxcbiAgICAgICAgICAgIE9iamVjdC5wcm90b3R5cGVcbiAgICAgICAgICApIGluc3RhbmNlb2YgT2JqZWN0O1xuICAgICAgICAgIC8vIHNldFByb3RvdHlwZU9mLnBvbHlmaWxsID09PSB0cnVlIG1lYW5zIGl0IHdvcmtzIGFzIG1lYW50XG4gICAgICAgICAgLy8gc2V0UHJvdG90eXBlT2YucG9seWZpbGwgPT09IGZhbHNlIG1lYW5zIGl0J3Mgbm90IDEwMCUgcmVsaWFibGVcbiAgICAgICAgICAvLyBzZXRQcm90b3R5cGVPZi5wb2x5ZmlsbCA9PT0gdW5kZWZpbmVkXG4gICAgICAgICAgLy8gb3JcbiAgICAgICAgICAvLyBzZXRQcm90b3R5cGVPZi5wb2x5ZmlsbCA9PSAgbnVsbCBtZWFucyBpdCdzIG5vdCBhIHBvbHlmaWxsXG4gICAgICAgICAgLy8gd2hpY2ggbWVhbnMgaXQgd29ya3MgYXMgZXhwZWN0ZWRcbiAgICAgICAgICAvLyB3ZSBjYW4gZXZlbiBkZWxldGUgT2JqZWN0LnByb3RvdHlwZS5fX3Byb3RvX187XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHNldFByb3RvdHlwZU9mO1xuICAgICAgfShPYmplY3QsICdfX3Byb3RvX18nKSlcbiAgICB9O1xuXG4gICAgZGVmaW5lUHJvcGVydGllcyhPYmplY3QsIEVTNU9iamVjdFNoaW1zKTtcbiAgfVxuXG4gIC8vIFdvcmthcm91bmQgYnVnIGluIE9wZXJhIDEyIHdoZXJlIHNldFByb3RvdHlwZU9mKHgsIG51bGwpIGRvZXNuJ3Qgd29yayxcbiAgLy8gYnV0IE9iamVjdC5jcmVhdGUobnVsbCkgZG9lcy5cbiAgaWYgKE9iamVjdC5zZXRQcm90b3R5cGVPZiAmJiBPYmplY3QuZ2V0UHJvdG90eXBlT2YgJiZcbiAgICAgIE9iamVjdC5nZXRQcm90b3R5cGVPZihPYmplY3Quc2V0UHJvdG90eXBlT2Yoe30sIG51bGwpKSAhPT0gbnVsbCAmJlxuICAgICAgT2JqZWN0LmdldFByb3RvdHlwZU9mKE9iamVjdC5jcmVhdGUobnVsbCkpID09PSBudWxsKSB7XG4gICAgKGZ1bmN0aW9uICgpIHtcbiAgICAgIHZhciBGQUtFTlVMTCA9IE9iamVjdC5jcmVhdGUobnVsbCk7XG4gICAgICB2YXIgZ3BvID0gT2JqZWN0LmdldFByb3RvdHlwZU9mLCBzcG8gPSBPYmplY3Quc2V0UHJvdG90eXBlT2Y7XG4gICAgICBPYmplY3QuZ2V0UHJvdG90eXBlT2YgPSBmdW5jdGlvbiAobykge1xuICAgICAgICB2YXIgcmVzdWx0ID0gZ3BvKG8pO1xuICAgICAgICByZXR1cm4gcmVzdWx0ID09PSBGQUtFTlVMTCA/IG51bGwgOiByZXN1bHQ7XG4gICAgICB9O1xuICAgICAgT2JqZWN0LnNldFByb3RvdHlwZU9mID0gZnVuY3Rpb24gKG8sIHApIHtcbiAgICAgICAgdmFyIHByb3RvID0gcCA9PT0gbnVsbCA/IEZBS0VOVUxMIDogcDtcbiAgICAgICAgcmV0dXJuIHNwbyhvLCBwcm90byk7XG4gICAgICB9O1xuICAgICAgT2JqZWN0LnNldFByb3RvdHlwZU9mLnBvbHlmaWxsID0gZmFsc2U7XG4gICAgfSgpKTtcbiAgfVxuXG4gIHZhciBvYmplY3RLZXlzQWNjZXB0c1ByaW1pdGl2ZXMgPSAhdGhyb3dzRXJyb3IoZnVuY3Rpb24gKCkgeyBPYmplY3Qua2V5cygnZm9vJyk7IH0pO1xuICBpZiAoIW9iamVjdEtleXNBY2NlcHRzUHJpbWl0aXZlcykge1xuICAgIHZhciBvcmlnaW5hbE9iamVjdEtleXMgPSBPYmplY3Qua2V5cztcbiAgICBvdmVycmlkZU5hdGl2ZShPYmplY3QsICdrZXlzJywgZnVuY3Rpb24ga2V5cyh2YWx1ZSkge1xuICAgICAgcmV0dXJuIG9yaWdpbmFsT2JqZWN0S2V5cyhFUy5Ub09iamVjdCh2YWx1ZSkpO1xuICAgIH0pO1xuICAgIGtleXMgPSBPYmplY3Qua2V5cztcbiAgfVxuICB2YXIgb2JqZWN0S2V5c1JlamVjdHNSZWdleCA9IHRocm93c0Vycm9yKGZ1bmN0aW9uICgpIHsgT2JqZWN0LmtleXMoL2EvZyk7IH0pO1xuICBpZiAob2JqZWN0S2V5c1JlamVjdHNSZWdleCkge1xuICAgIHZhciByZWdleFJlamVjdGluZ09iamVjdEtleXMgPSBPYmplY3Qua2V5cztcbiAgICBvdmVycmlkZU5hdGl2ZShPYmplY3QsICdrZXlzJywgZnVuY3Rpb24ga2V5cyh2YWx1ZSkge1xuICAgICAgaWYgKFR5cGUucmVnZXgodmFsdWUpKSB7XG4gICAgICAgIHZhciByZWdleEtleXMgPSBbXTtcbiAgICAgICAgZm9yICh2YXIgayBpbiB2YWx1ZSkge1xuICAgICAgICAgIGlmIChfaGFzT3duUHJvcGVydHkodmFsdWUsIGspKSB7XG4gICAgICAgICAgICBfcHVzaChyZWdleEtleXMsIGspO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgIHJldHVybiByZWdleEtleXM7XG4gICAgICB9XG4gICAgICByZXR1cm4gcmVnZXhSZWplY3RpbmdPYmplY3RLZXlzKHZhbHVlKTtcbiAgICB9KTtcbiAgICBrZXlzID0gT2JqZWN0LmtleXM7XG4gIH1cblxuICBpZiAoT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXMpIHtcbiAgICB2YXIgb2JqZWN0R09QTkFjY2VwdHNQcmltaXRpdmVzID0gIXRocm93c0Vycm9yKGZ1bmN0aW9uICgpIHsgT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXMoJ2ZvbycpOyB9KTtcbiAgICBpZiAoIW9iamVjdEdPUE5BY2NlcHRzUHJpbWl0aXZlcykge1xuICAgICAgdmFyIGNhY2hlZFdpbmRvd05hbWVzID0gdHlwZW9mIHdpbmRvdyA9PT0gJ29iamVjdCcgPyBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyh3aW5kb3cpIDogW107XG4gICAgICB2YXIgb3JpZ2luYWxPYmplY3RHZXRPd25Qcm9wZXJ0eU5hbWVzID0gT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXM7XG4gICAgICBvdmVycmlkZU5hdGl2ZShPYmplY3QsICdnZXRPd25Qcm9wZXJ0eU5hbWVzJywgZnVuY3Rpb24gZ2V0T3duUHJvcGVydHlOYW1lcyh2YWx1ZSkge1xuICAgICAgICB2YXIgdmFsID0gRVMuVG9PYmplY3QodmFsdWUpO1xuICAgICAgICBpZiAoX3RvU3RyaW5nKHZhbCkgPT09ICdbb2JqZWN0IFdpbmRvd10nKSB7XG4gICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHJldHVybiBvcmlnaW5hbE9iamVjdEdldE93blByb3BlcnR5TmFtZXModmFsKTtcbiAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAvLyBJRSBidWcgd2hlcmUgbGF5b3V0IGVuZ2luZSBjYWxscyB1c2VybGFuZCBnT1BOIGZvciBjcm9zcy1kb21haW4gYHdpbmRvd2Agb2JqZWN0c1xuICAgICAgICAgICAgcmV0dXJuIF9jb25jYXQoW10sIGNhY2hlZFdpbmRvd05hbWVzKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG9yaWdpbmFsT2JqZWN0R2V0T3duUHJvcGVydHlOYW1lcyh2YWwpO1xuICAgICAgfSk7XG4gICAgfVxuICB9XG4gIGlmIChPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKSB7XG4gICAgdmFyIG9iamVjdEdPUERBY2NlcHRzUHJpbWl0aXZlcyA9ICF0aHJvd3NFcnJvcihmdW5jdGlvbiAoKSB7IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IoJ2ZvbycsICdiYXInKTsgfSk7XG4gICAgaWYgKCFvYmplY3RHT1BEQWNjZXB0c1ByaW1pdGl2ZXMpIHtcbiAgICAgIHZhciBvcmlnaW5hbE9iamVjdEdldE93blByb3BlcnR5RGVzY3JpcHRvciA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3I7XG4gICAgICBvdmVycmlkZU5hdGl2ZShPYmplY3QsICdnZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3InLCBmdW5jdGlvbiBnZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IodmFsdWUsIHByb3BlcnR5KSB7XG4gICAgICAgIHJldHVybiBvcmlnaW5hbE9iamVjdEdldE93blByb3BlcnR5RGVzY3JpcHRvcihFUy5Ub09iamVjdCh2YWx1ZSksIHByb3BlcnR5KTtcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxuICBpZiAoT2JqZWN0LnNlYWwpIHtcbiAgICB2YXIgb2JqZWN0U2VhbEFjY2VwdHNQcmltaXRpdmVzID0gIXRocm93c0Vycm9yKGZ1bmN0aW9uICgpIHsgT2JqZWN0LnNlYWwoJ2ZvbycpOyB9KTtcbiAgICBpZiAoIW9iamVjdFNlYWxBY2NlcHRzUHJpbWl0aXZlcykge1xuICAgICAgdmFyIG9yaWdpbmFsT2JqZWN0U2VhbCA9IE9iamVjdC5zZWFsO1xuICAgICAgb3ZlcnJpZGVOYXRpdmUoT2JqZWN0LCAnc2VhbCcsIGZ1bmN0aW9uIHNlYWwodmFsdWUpIHtcbiAgICAgICAgaWYgKCFUeXBlLm9iamVjdCh2YWx1ZSkpIHsgcmV0dXJuIHZhbHVlOyB9XG4gICAgICAgIHJldHVybiBvcmlnaW5hbE9iamVjdFNlYWwodmFsdWUpO1xuICAgICAgfSk7XG4gICAgfVxuICB9XG4gIGlmIChPYmplY3QuaXNTZWFsZWQpIHtcbiAgICB2YXIgb2JqZWN0SXNTZWFsZWRBY2NlcHRzUHJpbWl0aXZlcyA9ICF0aHJvd3NFcnJvcihmdW5jdGlvbiAoKSB7IE9iamVjdC5pc1NlYWxlZCgnZm9vJyk7IH0pO1xuICAgIGlmICghb2JqZWN0SXNTZWFsZWRBY2NlcHRzUHJpbWl0aXZlcykge1xuICAgICAgdmFyIG9yaWdpbmFsT2JqZWN0SXNTZWFsZWQgPSBPYmplY3QuaXNTZWFsZWQ7XG4gICAgICBvdmVycmlkZU5hdGl2ZShPYmplY3QsICdpc1NlYWxlZCcsIGZ1bmN0aW9uIGlzU2VhbGVkKHZhbHVlKSB7XG4gICAgICAgIGlmICghVHlwZS5vYmplY3QodmFsdWUpKSB7IHJldHVybiB0cnVlOyB9XG4gICAgICAgIHJldHVybiBvcmlnaW5hbE9iamVjdElzU2VhbGVkKHZhbHVlKTtcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxuICBpZiAoT2JqZWN0LmZyZWV6ZSkge1xuICAgIHZhciBvYmplY3RGcmVlemVBY2NlcHRzUHJpbWl0aXZlcyA9ICF0aHJvd3NFcnJvcihmdW5jdGlvbiAoKSB7IE9iamVjdC5mcmVlemUoJ2ZvbycpOyB9KTtcbiAgICBpZiAoIW9iamVjdEZyZWV6ZUFjY2VwdHNQcmltaXRpdmVzKSB7XG4gICAgICB2YXIgb3JpZ2luYWxPYmplY3RGcmVlemUgPSBPYmplY3QuZnJlZXplO1xuICAgICAgb3ZlcnJpZGVOYXRpdmUoT2JqZWN0LCAnZnJlZXplJywgZnVuY3Rpb24gZnJlZXplKHZhbHVlKSB7XG4gICAgICAgIGlmICghVHlwZS5vYmplY3QodmFsdWUpKSB7IHJldHVybiB2YWx1ZTsgfVxuICAgICAgICByZXR1cm4gb3JpZ2luYWxPYmplY3RGcmVlemUodmFsdWUpO1xuICAgICAgfSk7XG4gICAgfVxuICB9XG4gIGlmIChPYmplY3QuaXNGcm96ZW4pIHtcbiAgICB2YXIgb2JqZWN0SXNGcm96ZW5BY2NlcHRzUHJpbWl0aXZlcyA9ICF0aHJvd3NFcnJvcihmdW5jdGlvbiAoKSB7IE9iamVjdC5pc0Zyb3plbignZm9vJyk7IH0pO1xuICAgIGlmICghb2JqZWN0SXNGcm96ZW5BY2NlcHRzUHJpbWl0aXZlcykge1xuICAgICAgdmFyIG9yaWdpbmFsT2JqZWN0SXNGcm96ZW4gPSBPYmplY3QuaXNGcm96ZW47XG4gICAgICBvdmVycmlkZU5hdGl2ZShPYmplY3QsICdpc0Zyb3plbicsIGZ1bmN0aW9uIGlzRnJvemVuKHZhbHVlKSB7XG4gICAgICAgIGlmICghVHlwZS5vYmplY3QodmFsdWUpKSB7IHJldHVybiB0cnVlOyB9XG4gICAgICAgIHJldHVybiBvcmlnaW5hbE9iamVjdElzRnJvemVuKHZhbHVlKTtcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxuICBpZiAoT2JqZWN0LnByZXZlbnRFeHRlbnNpb25zKSB7XG4gICAgdmFyIG9iamVjdFByZXZlbnRFeHRlbnNpb25zQWNjZXB0c1ByaW1pdGl2ZXMgPSAhdGhyb3dzRXJyb3IoZnVuY3Rpb24gKCkgeyBPYmplY3QucHJldmVudEV4dGVuc2lvbnMoJ2ZvbycpOyB9KTtcbiAgICBpZiAoIW9iamVjdFByZXZlbnRFeHRlbnNpb25zQWNjZXB0c1ByaW1pdGl2ZXMpIHtcbiAgICAgIHZhciBvcmlnaW5hbE9iamVjdFByZXZlbnRFeHRlbnNpb25zID0gT2JqZWN0LnByZXZlbnRFeHRlbnNpb25zO1xuICAgICAgb3ZlcnJpZGVOYXRpdmUoT2JqZWN0LCAncHJldmVudEV4dGVuc2lvbnMnLCBmdW5jdGlvbiBwcmV2ZW50RXh0ZW5zaW9ucyh2YWx1ZSkge1xuICAgICAgICBpZiAoIVR5cGUub2JqZWN0KHZhbHVlKSkgeyByZXR1cm4gdmFsdWU7IH1cbiAgICAgICAgcmV0dXJuIG9yaWdpbmFsT2JqZWN0UHJldmVudEV4dGVuc2lvbnModmFsdWUpO1xuICAgICAgfSk7XG4gICAgfVxuICB9XG4gIGlmIChPYmplY3QuaXNFeHRlbnNpYmxlKSB7XG4gICAgdmFyIG9iamVjdElzRXh0ZW5zaWJsZUFjY2VwdHNQcmltaXRpdmVzID0gIXRocm93c0Vycm9yKGZ1bmN0aW9uICgpIHsgT2JqZWN0LmlzRXh0ZW5zaWJsZSgnZm9vJyk7IH0pO1xuICAgIGlmICghb2JqZWN0SXNFeHRlbnNpYmxlQWNjZXB0c1ByaW1pdGl2ZXMpIHtcbiAgICAgIHZhciBvcmlnaW5hbE9iamVjdElzRXh0ZW5zaWJsZSA9IE9iamVjdC5pc0V4dGVuc2libGU7XG4gICAgICBvdmVycmlkZU5hdGl2ZShPYmplY3QsICdpc0V4dGVuc2libGUnLCBmdW5jdGlvbiBpc0V4dGVuc2libGUodmFsdWUpIHtcbiAgICAgICAgaWYgKCFUeXBlLm9iamVjdCh2YWx1ZSkpIHsgcmV0dXJuIGZhbHNlOyB9XG4gICAgICAgIHJldHVybiBvcmlnaW5hbE9iamVjdElzRXh0ZW5zaWJsZSh2YWx1ZSk7XG4gICAgICB9KTtcbiAgICB9XG4gIH1cbiAgaWYgKE9iamVjdC5nZXRQcm90b3R5cGVPZikge1xuICAgIHZhciBvYmplY3RHZXRQcm90b0FjY2VwdHNQcmltaXRpdmVzID0gIXRocm93c0Vycm9yKGZ1bmN0aW9uICgpIHsgT2JqZWN0LmdldFByb3RvdHlwZU9mKCdmb28nKTsgfSk7XG4gICAgaWYgKCFvYmplY3RHZXRQcm90b0FjY2VwdHNQcmltaXRpdmVzKSB7XG4gICAgICB2YXIgb3JpZ2luYWxHZXRQcm90byA9IE9iamVjdC5nZXRQcm90b3R5cGVPZjtcbiAgICAgIG92ZXJyaWRlTmF0aXZlKE9iamVjdCwgJ2dldFByb3RvdHlwZU9mJywgZnVuY3Rpb24gZ2V0UHJvdG90eXBlT2YodmFsdWUpIHtcbiAgICAgICAgcmV0dXJuIG9yaWdpbmFsR2V0UHJvdG8oRVMuVG9PYmplY3QodmFsdWUpKTtcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxuXG4gIHZhciBoYXNGbGFncyA9IHN1cHBvcnRzRGVzY3JpcHRvcnMgJiYgKGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgZGVzYyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IoUmVnRXhwLnByb3RvdHlwZSwgJ2ZsYWdzJyk7XG4gICAgcmV0dXJuIGRlc2MgJiYgRVMuSXNDYWxsYWJsZShkZXNjLmdldCk7XG4gIH0oKSk7XG4gIGlmIChzdXBwb3J0c0Rlc2NyaXB0b3JzICYmICFoYXNGbGFncykge1xuICAgIHZhciByZWdFeHBGbGFnc0dldHRlciA9IGZ1bmN0aW9uIGZsYWdzKCkge1xuICAgICAgaWYgKCFFUy5UeXBlSXNPYmplY3QodGhpcykpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignTWV0aG9kIGNhbGxlZCBvbiBpbmNvbXBhdGlibGUgdHlwZTogbXVzdCBiZSBhbiBvYmplY3QuJyk7XG4gICAgICB9XG4gICAgICB2YXIgcmVzdWx0ID0gJyc7XG4gICAgICBpZiAodGhpcy5nbG9iYWwpIHtcbiAgICAgICAgcmVzdWx0ICs9ICdnJztcbiAgICAgIH1cbiAgICAgIGlmICh0aGlzLmlnbm9yZUNhc2UpIHtcbiAgICAgICAgcmVzdWx0ICs9ICdpJztcbiAgICAgIH1cbiAgICAgIGlmICh0aGlzLm11bHRpbGluZSkge1xuICAgICAgICByZXN1bHQgKz0gJ20nO1xuICAgICAgfVxuICAgICAgaWYgKHRoaXMudW5pY29kZSkge1xuICAgICAgICByZXN1bHQgKz0gJ3UnO1xuICAgICAgfVxuICAgICAgaWYgKHRoaXMuc3RpY2t5KSB7XG4gICAgICAgIHJlc3VsdCArPSAneSc7XG4gICAgICB9XG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH07XG5cbiAgICBWYWx1ZS5nZXR0ZXIoUmVnRXhwLnByb3RvdHlwZSwgJ2ZsYWdzJywgcmVnRXhwRmxhZ3NHZXR0ZXIpO1xuICB9XG5cbiAgdmFyIHJlZ0V4cFN1cHBvcnRzRmxhZ3NXaXRoUmVnZXggPSBzdXBwb3J0c0Rlc2NyaXB0b3JzICYmIHZhbHVlT3JGYWxzZUlmVGhyb3dzKGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gU3RyaW5nKG5ldyBSZWdFeHAoL2EvZywgJ2knKSkgPT09ICcvYS9pJztcbiAgfSk7XG4gIHZhciByZWdFeHBOZWVkc1RvU3VwcG9ydFN5bWJvbE1hdGNoID0gaGFzU3ltYm9scyAmJiBzdXBwb3J0c0Rlc2NyaXB0b3JzICYmIChmdW5jdGlvbiAoKSB7XG4gICAgLy8gRWRnZSAwLjEyIHN1cHBvcnRzIGZsYWdzIGZ1bGx5LCBidXQgZG9lcyBub3Qgc3VwcG9ydCBTeW1ib2wubWF0Y2hcbiAgICB2YXIgcmVnZXggPSAvLi87XG4gICAgcmVnZXhbU3ltYm9sLm1hdGNoXSA9IGZhbHNlO1xuICAgIHJldHVybiBSZWdFeHAocmVnZXgpID09PSByZWdleDtcbiAgfSgpKTtcblxuICB2YXIgcmVnZXhUb1N0cmluZ0lzR2VuZXJpYyA9IHZhbHVlT3JGYWxzZUlmVGhyb3dzKGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gUmVnRXhwLnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHsgc291cmNlOiAnYWJjJyB9KSA9PT0gJy9hYmMvJztcbiAgfSk7XG4gIHZhciByZWdleFRvU3RyaW5nU3VwcG9ydHNHZW5lcmljRmxhZ3MgPSByZWdleFRvU3RyaW5nSXNHZW5lcmljICYmIHZhbHVlT3JGYWxzZUlmVGhyb3dzKGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gUmVnRXhwLnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHsgc291cmNlOiAnYScsIGZsYWdzOiAnYicgfSkgPT09ICcvYS9iJztcbiAgfSk7XG4gIGlmICghcmVnZXhUb1N0cmluZ0lzR2VuZXJpYyB8fCAhcmVnZXhUb1N0cmluZ1N1cHBvcnRzR2VuZXJpY0ZsYWdzKSB7XG4gICAgdmFyIG9yaWdSZWdFeHBUb1N0cmluZyA9IFJlZ0V4cC5wcm90b3R5cGUudG9TdHJpbmc7XG4gICAgZGVmaW5lUHJvcGVydHkoUmVnRXhwLnByb3RvdHlwZSwgJ3RvU3RyaW5nJywgZnVuY3Rpb24gdG9TdHJpbmcoKSB7XG4gICAgICB2YXIgUiA9IEVTLlJlcXVpcmVPYmplY3RDb2VyY2libGUodGhpcyk7XG4gICAgICBpZiAoVHlwZS5yZWdleChSKSkge1xuICAgICAgICByZXR1cm4gX2NhbGwob3JpZ1JlZ0V4cFRvU3RyaW5nLCBSKTtcbiAgICAgIH1cbiAgICAgIHZhciBwYXR0ZXJuID0gJFN0cmluZyhSLnNvdXJjZSk7XG4gICAgICB2YXIgZmxhZ3MgPSAkU3RyaW5nKFIuZmxhZ3MpO1xuICAgICAgcmV0dXJuICcvJyArIHBhdHRlcm4gKyAnLycgKyBmbGFncztcbiAgICB9LCB0cnVlKTtcbiAgICBWYWx1ZS5wcmVzZXJ2ZVRvU3RyaW5nKFJlZ0V4cC5wcm90b3R5cGUudG9TdHJpbmcsIG9yaWdSZWdFeHBUb1N0cmluZyk7XG4gIH1cblxuICBpZiAoc3VwcG9ydHNEZXNjcmlwdG9ycyAmJiAoIXJlZ0V4cFN1cHBvcnRzRmxhZ3NXaXRoUmVnZXggfHwgcmVnRXhwTmVlZHNUb1N1cHBvcnRTeW1ib2xNYXRjaCkpIHtcbiAgICB2YXIgZmxhZ3NHZXR0ZXIgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKFJlZ0V4cC5wcm90b3R5cGUsICdmbGFncycpLmdldDtcbiAgICB2YXIgc291cmNlRGVzYyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IoUmVnRXhwLnByb3RvdHlwZSwgJ3NvdXJjZScpIHx8IHt9O1xuICAgIHZhciBsZWdhY3lTb3VyY2VHZXR0ZXIgPSBmdW5jdGlvbiAoKSB7IHJldHVybiB0aGlzLnNvdXJjZTsgfTsgLy8gcHJpb3IgdG8gaXQgYmVpbmcgYSBnZXR0ZXIsIGl0J3Mgb3duICsgbm9uY29uZmlndXJhYmxlXG4gICAgdmFyIHNvdXJjZUdldHRlciA9IEVTLklzQ2FsbGFibGUoc291cmNlRGVzYy5nZXQpID8gc291cmNlRGVzYy5nZXQgOiBsZWdhY3lTb3VyY2VHZXR0ZXI7XG5cbiAgICB2YXIgT3JpZ1JlZ0V4cCA9IFJlZ0V4cDtcbiAgICB2YXIgUmVnRXhwU2hpbSA9IChmdW5jdGlvbiAoKSB7XG4gICAgICByZXR1cm4gZnVuY3Rpb24gUmVnRXhwKHBhdHRlcm4sIGZsYWdzKSB7XG4gICAgICAgIHZhciBwYXR0ZXJuSXNSZWdFeHAgPSBFUy5Jc1JlZ0V4cChwYXR0ZXJuKTtcbiAgICAgICAgdmFyIGNhbGxlZFdpdGhOZXcgPSB0aGlzIGluc3RhbmNlb2YgUmVnRXhwO1xuICAgICAgICBpZiAoIWNhbGxlZFdpdGhOZXcgJiYgcGF0dGVybklzUmVnRXhwICYmIHR5cGVvZiBmbGFncyA9PT0gJ3VuZGVmaW5lZCcgJiYgcGF0dGVybi5jb25zdHJ1Y3RvciA9PT0gUmVnRXhwKSB7XG4gICAgICAgICAgcmV0dXJuIHBhdHRlcm47XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgUCA9IHBhdHRlcm47XG4gICAgICAgIHZhciBGID0gZmxhZ3M7XG4gICAgICAgIGlmIChUeXBlLnJlZ2V4KHBhdHRlcm4pKSB7XG4gICAgICAgICAgUCA9IEVTLkNhbGwoc291cmNlR2V0dGVyLCBwYXR0ZXJuKTtcbiAgICAgICAgICBGID0gdHlwZW9mIGZsYWdzID09PSAndW5kZWZpbmVkJyA/IEVTLkNhbGwoZmxhZ3NHZXR0ZXIsIHBhdHRlcm4pIDogZmxhZ3M7XG4gICAgICAgICAgcmV0dXJuIG5ldyBSZWdFeHAoUCwgRik7XG4gICAgICAgIH0gZWxzZSBpZiAocGF0dGVybklzUmVnRXhwKSB7XG4gICAgICAgICAgUCA9IHBhdHRlcm4uc291cmNlO1xuICAgICAgICAgIEYgPSB0eXBlb2YgZmxhZ3MgPT09ICd1bmRlZmluZWQnID8gcGF0dGVybi5mbGFncyA6IGZsYWdzO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBuZXcgT3JpZ1JlZ0V4cChwYXR0ZXJuLCBmbGFncyk7XG4gICAgICB9O1xuICAgIH0oKSk7XG4gICAgd3JhcENvbnN0cnVjdG9yKE9yaWdSZWdFeHAsIFJlZ0V4cFNoaW0sIHtcbiAgICAgICRpbnB1dDogdHJ1ZSAvLyBDaHJvbWUgPCB2MzkgJiBPcGVyYSA8IDI2IGhhdmUgYSBub25zdGFuZGFyZCBcIiRpbnB1dFwiIHByb3BlcnR5XG4gICAgfSk7XG4gICAgLyogZ2xvYmFscyBSZWdFeHA6IHRydWUgKi9cbiAgICAvKiBlc2xpbnQtZGlzYWJsZSBuby11bmRlZiAqL1xuICAgIC8qIGpzaGludCAtVzAyMCAqL1xuICAgIFJlZ0V4cCA9IFJlZ0V4cFNoaW07XG4gICAgVmFsdWUucmVkZWZpbmUoZ2xvYmFscywgJ1JlZ0V4cCcsIFJlZ0V4cFNoaW0pO1xuICAgIC8qIGpzaGludCArVzAyMCAqL1xuICAgIC8qIGVzbGludC1lbmFibGUgbm8tdW5kZWYgKi9cbiAgICAvKiBnbG9iYWxzIFJlZ0V4cDogZmFsc2UgKi9cbiAgfVxuXG4gIGlmIChzdXBwb3J0c0Rlc2NyaXB0b3JzKSB7XG4gICAgdmFyIHJlZ2V4R2xvYmFscyA9IHtcbiAgICAgIGlucHV0OiAnJF8nLFxuICAgICAgbGFzdE1hdGNoOiAnJCYnLFxuICAgICAgbGFzdFBhcmVuOiAnJCsnLFxuICAgICAgbGVmdENvbnRleHQ6ICckYCcsXG4gICAgICByaWdodENvbnRleHQ6ICckXFwnJ1xuICAgIH07XG4gICAgX2ZvckVhY2goa2V5cyhyZWdleEdsb2JhbHMpLCBmdW5jdGlvbiAocHJvcCkge1xuICAgICAgaWYgKHByb3AgaW4gUmVnRXhwICYmICEocmVnZXhHbG9iYWxzW3Byb3BdIGluIFJlZ0V4cCkpIHtcbiAgICAgICAgVmFsdWUuZ2V0dGVyKFJlZ0V4cCwgcmVnZXhHbG9iYWxzW3Byb3BdLCBmdW5jdGlvbiBnZXQoKSB7XG4gICAgICAgICAgcmV0dXJuIFJlZ0V4cFtwcm9wXTtcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cbiAgYWRkRGVmYXVsdFNwZWNpZXMoUmVnRXhwKTtcblxuICB2YXIgaW52ZXJzZUVwc2lsb24gPSAxIC8gTnVtYmVyLkVQU0lMT047XG4gIHZhciByb3VuZFRpZXNUb0V2ZW4gPSBmdW5jdGlvbiByb3VuZFRpZXNUb0V2ZW4obikge1xuICAgIC8vIEV2ZW4gdGhvdWdoIHRoaXMgcmVkdWNlcyBkb3duIHRvIGByZXR1cm4gbmAsIGl0IHRha2VzIGFkdmFudGFnZSBvZiBidWlsdC1pbiByb3VuZGluZy5cbiAgICByZXR1cm4gKG4gKyBpbnZlcnNlRXBzaWxvbikgLSBpbnZlcnNlRXBzaWxvbjtcbiAgfTtcbiAgdmFyIEJJTkFSWV8zMl9FUFNJTE9OID0gTWF0aC5wb3coMiwgLTIzKTtcbiAgdmFyIEJJTkFSWV8zMl9NQVhfVkFMVUUgPSBNYXRoLnBvdygyLCAxMjcpICogKDIgLSBCSU5BUllfMzJfRVBTSUxPTik7XG4gIHZhciBCSU5BUllfMzJfTUlOX1ZBTFVFID0gTWF0aC5wb3coMiwgLTEyNik7XG4gIHZhciBudW1iZXJDTFogPSBOdW1iZXIucHJvdG90eXBlLmNsejtcbiAgZGVsZXRlIE51bWJlci5wcm90b3R5cGUuY2x6OyAvLyBTYWZhcmkgOCBoYXMgTnVtYmVyI2NselxuXG4gIHZhciBNYXRoU2hpbXMgPSB7XG4gICAgYWNvc2g6IGZ1bmN0aW9uIGFjb3NoKHZhbHVlKSB7XG4gICAgICB2YXIgeCA9IE51bWJlcih2YWx1ZSk7XG4gICAgICBpZiAoTnVtYmVyLmlzTmFOKHgpIHx8IHZhbHVlIDwgMSkgeyByZXR1cm4gTmFOOyB9XG4gICAgICBpZiAoeCA9PT0gMSkgeyByZXR1cm4gMDsgfVxuICAgICAgaWYgKHggPT09IEluZmluaXR5KSB7IHJldHVybiB4OyB9XG4gICAgICByZXR1cm4gX2xvZyh4IC8gTWF0aC5FICsgX3NxcnQoeCArIDEpICogX3NxcnQoeCAtIDEpIC8gTWF0aC5FKSArIDE7XG4gICAgfSxcblxuICAgIGFzaW5oOiBmdW5jdGlvbiBhc2luaCh2YWx1ZSkge1xuICAgICAgdmFyIHggPSBOdW1iZXIodmFsdWUpO1xuICAgICAgaWYgKHggPT09IDAgfHwgIWdsb2JhbElzRmluaXRlKHgpKSB7XG4gICAgICAgIHJldHVybiB4O1xuICAgICAgfVxuICAgICAgcmV0dXJuIHggPCAwID8gLU1hdGguYXNpbmgoLXgpIDogX2xvZyh4ICsgX3NxcnQoeCAqIHggKyAxKSk7XG4gICAgfSxcblxuICAgIGF0YW5oOiBmdW5jdGlvbiBhdGFuaCh2YWx1ZSkge1xuICAgICAgdmFyIHggPSBOdW1iZXIodmFsdWUpO1xuICAgICAgaWYgKE51bWJlci5pc05hTih4KSB8fCB4IDwgLTEgfHwgeCA+IDEpIHtcbiAgICAgICAgcmV0dXJuIE5hTjtcbiAgICAgIH1cbiAgICAgIGlmICh4ID09PSAtMSkgeyByZXR1cm4gLUluZmluaXR5OyB9XG4gICAgICBpZiAoeCA9PT0gMSkgeyByZXR1cm4gSW5maW5pdHk7IH1cbiAgICAgIGlmICh4ID09PSAwKSB7IHJldHVybiB4OyB9XG4gICAgICByZXR1cm4gMC41ICogX2xvZygoMSArIHgpIC8gKDEgLSB4KSk7XG4gICAgfSxcblxuICAgIGNicnQ6IGZ1bmN0aW9uIGNicnQodmFsdWUpIHtcbiAgICAgIHZhciB4ID0gTnVtYmVyKHZhbHVlKTtcbiAgICAgIGlmICh4ID09PSAwKSB7IHJldHVybiB4OyB9XG4gICAgICB2YXIgbmVnYXRlID0geCA8IDAsIHJlc3VsdDtcbiAgICAgIGlmIChuZWdhdGUpIHsgeCA9IC14OyB9XG4gICAgICBpZiAoeCA9PT0gSW5maW5pdHkpIHtcbiAgICAgICAgcmVzdWx0ID0gSW5maW5pdHk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXN1bHQgPSBNYXRoLmV4cChfbG9nKHgpIC8gMyk7XG4gICAgICAgIC8vIGZyb20gaHR0cDovL2VuLndpa2lwZWRpYS5vcmcvd2lraS9DdWJlX3Jvb3QjTnVtZXJpY2FsX21ldGhvZHNcbiAgICAgICAgcmVzdWx0ID0gKHggLyAocmVzdWx0ICogcmVzdWx0KSArICgyICogcmVzdWx0KSkgLyAzO1xuICAgICAgfVxuICAgICAgcmV0dXJuIG5lZ2F0ZSA/IC1yZXN1bHQgOiByZXN1bHQ7XG4gICAgfSxcblxuICAgIGNsejMyOiBmdW5jdGlvbiBjbHozMih2YWx1ZSkge1xuICAgICAgLy8gU2VlIGh0dHBzOi8vYnVncy5lY21hc2NyaXB0Lm9yZy9zaG93X2J1Zy5jZ2k/aWQ9MjQ2NVxuICAgICAgdmFyIHggPSBOdW1iZXIodmFsdWUpO1xuICAgICAgdmFyIG51bWJlciA9IEVTLlRvVWludDMyKHgpO1xuICAgICAgaWYgKG51bWJlciA9PT0gMCkge1xuICAgICAgICByZXR1cm4gMzI7XG4gICAgICB9XG4gICAgICByZXR1cm4gbnVtYmVyQ0xaID8gRVMuQ2FsbChudW1iZXJDTFosIG51bWJlcikgOiAzMSAtIF9mbG9vcihfbG9nKG51bWJlciArIDAuNSkgKiBNYXRoLkxPRzJFKTtcbiAgICB9LFxuXG4gICAgY29zaDogZnVuY3Rpb24gY29zaCh2YWx1ZSkge1xuICAgICAgdmFyIHggPSBOdW1iZXIodmFsdWUpO1xuICAgICAgaWYgKHggPT09IDApIHsgcmV0dXJuIDE7IH0gLy8gKzAgb3IgLTBcbiAgICAgIGlmIChOdW1iZXIuaXNOYU4oeCkpIHsgcmV0dXJuIE5hTjsgfVxuICAgICAgaWYgKCFnbG9iYWxJc0Zpbml0ZSh4KSkgeyByZXR1cm4gSW5maW5pdHk7IH1cbiAgICAgIGlmICh4IDwgMCkgeyB4ID0gLXg7IH1cbiAgICAgIGlmICh4ID4gMjEpIHsgcmV0dXJuIE1hdGguZXhwKHgpIC8gMjsgfVxuICAgICAgcmV0dXJuIChNYXRoLmV4cCh4KSArIE1hdGguZXhwKC14KSkgLyAyO1xuICAgIH0sXG5cbiAgICBleHBtMTogZnVuY3Rpb24gZXhwbTEodmFsdWUpIHtcbiAgICAgIHZhciB4ID0gTnVtYmVyKHZhbHVlKTtcbiAgICAgIGlmICh4ID09PSAtSW5maW5pdHkpIHsgcmV0dXJuIC0xOyB9XG4gICAgICBpZiAoIWdsb2JhbElzRmluaXRlKHgpIHx8IHggPT09IDApIHsgcmV0dXJuIHg7IH1cbiAgICAgIGlmIChfYWJzKHgpID4gMC41KSB7XG4gICAgICAgIHJldHVybiBNYXRoLmV4cCh4KSAtIDE7XG4gICAgICB9XG4gICAgICAvLyBBIG1vcmUgcHJlY2lzZSBhcHByb3hpbWF0aW9uIHVzaW5nIFRheWxvciBzZXJpZXMgZXhwYW5zaW9uXG4gICAgICAvLyBmcm9tIGh0dHBzOi8vZ2l0aHViLmNvbS9wYXVsbWlsbHIvZXM2LXNoaW0vaXNzdWVzLzMxNCNpc3N1ZWNvbW1lbnQtNzAyOTM5ODZcbiAgICAgIHZhciB0ID0geDtcbiAgICAgIHZhciBzdW0gPSAwO1xuICAgICAgdmFyIG4gPSAxO1xuICAgICAgd2hpbGUgKHN1bSArIHQgIT09IHN1bSkge1xuICAgICAgICBzdW0gKz0gdDtcbiAgICAgICAgbiArPSAxO1xuICAgICAgICB0ICo9IHggLyBuO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHN1bTtcbiAgICB9LFxuXG4gICAgaHlwb3Q6IGZ1bmN0aW9uIGh5cG90KHgsIHkpIHtcbiAgICAgIHZhciByZXN1bHQgPSAwO1xuICAgICAgdmFyIGxhcmdlc3QgPSAwO1xuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyArK2kpIHtcbiAgICAgICAgdmFyIHZhbHVlID0gX2FicyhOdW1iZXIoYXJndW1lbnRzW2ldKSk7XG4gICAgICAgIGlmIChsYXJnZXN0IDwgdmFsdWUpIHtcbiAgICAgICAgICByZXN1bHQgKj0gKGxhcmdlc3QgLyB2YWx1ZSkgKiAobGFyZ2VzdCAvIHZhbHVlKTtcbiAgICAgICAgICByZXN1bHQgKz0gMTtcbiAgICAgICAgICBsYXJnZXN0ID0gdmFsdWU7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmVzdWx0ICs9ICh2YWx1ZSA+IDAgPyAodmFsdWUgLyBsYXJnZXN0KSAqICh2YWx1ZSAvIGxhcmdlc3QpIDogdmFsdWUpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gbGFyZ2VzdCA9PT0gSW5maW5pdHkgPyBJbmZpbml0eSA6IGxhcmdlc3QgKiBfc3FydChyZXN1bHQpO1xuICAgIH0sXG5cbiAgICBsb2cyOiBmdW5jdGlvbiBsb2cyKHZhbHVlKSB7XG4gICAgICByZXR1cm4gX2xvZyh2YWx1ZSkgKiBNYXRoLkxPRzJFO1xuICAgIH0sXG5cbiAgICBsb2cxMDogZnVuY3Rpb24gbG9nMTAodmFsdWUpIHtcbiAgICAgIHJldHVybiBfbG9nKHZhbHVlKSAqIE1hdGguTE9HMTBFO1xuICAgIH0sXG5cbiAgICBsb2cxcDogZnVuY3Rpb24gbG9nMXAodmFsdWUpIHtcbiAgICAgIHZhciB4ID0gTnVtYmVyKHZhbHVlKTtcbiAgICAgIGlmICh4IDwgLTEgfHwgTnVtYmVyLmlzTmFOKHgpKSB7IHJldHVybiBOYU47IH1cbiAgICAgIGlmICh4ID09PSAwIHx8IHggPT09IEluZmluaXR5KSB7IHJldHVybiB4OyB9XG4gICAgICBpZiAoeCA9PT0gLTEpIHsgcmV0dXJuIC1JbmZpbml0eTsgfVxuXG4gICAgICByZXR1cm4gKDEgKyB4KSAtIDEgPT09IDAgPyB4IDogeCAqIChfbG9nKDEgKyB4KSAvICgoMSArIHgpIC0gMSkpO1xuICAgIH0sXG5cbiAgICBzaWduOiBmdW5jdGlvbiBzaWduKHZhbHVlKSB7XG4gICAgICB2YXIgbnVtYmVyID0gTnVtYmVyKHZhbHVlKTtcbiAgICAgIGlmIChudW1iZXIgPT09IDApIHsgcmV0dXJuIG51bWJlcjsgfVxuICAgICAgaWYgKE51bWJlci5pc05hTihudW1iZXIpKSB7IHJldHVybiBudW1iZXI7IH1cbiAgICAgIHJldHVybiBudW1iZXIgPCAwID8gLTEgOiAxO1xuICAgIH0sXG5cbiAgICBzaW5oOiBmdW5jdGlvbiBzaW5oKHZhbHVlKSB7XG4gICAgICB2YXIgeCA9IE51bWJlcih2YWx1ZSk7XG4gICAgICBpZiAoIWdsb2JhbElzRmluaXRlKHgpIHx8IHggPT09IDApIHsgcmV0dXJuIHg7IH1cblxuICAgICAgaWYgKF9hYnMoeCkgPCAxKSB7XG4gICAgICAgIHJldHVybiAoTWF0aC5leHBtMSh4KSAtIE1hdGguZXhwbTEoLXgpKSAvIDI7XG4gICAgICB9XG4gICAgICByZXR1cm4gKE1hdGguZXhwKHggLSAxKSAtIE1hdGguZXhwKC14IC0gMSkpICogTWF0aC5FIC8gMjtcbiAgICB9LFxuXG4gICAgdGFuaDogZnVuY3Rpb24gdGFuaCh2YWx1ZSkge1xuICAgICAgdmFyIHggPSBOdW1iZXIodmFsdWUpO1xuICAgICAgaWYgKE51bWJlci5pc05hTih4KSB8fCB4ID09PSAwKSB7IHJldHVybiB4OyB9XG4gICAgICAvLyBjYW4gZXhpdCBlYXJseSBhdCArLTIwIGFzIEpTIGxvc2VzIHByZWNpc2lvbiBmb3IgdHJ1ZSB2YWx1ZSBhdCB0aGlzIGludGVnZXJcbiAgICAgIGlmICh4ID49IDIwKSB7IHJldHVybiAxOyB9XG4gICAgICBpZiAoeCA8PSAtMjApIHsgcmV0dXJuIC0xOyB9XG4gICAgICB2YXIgYSA9IE1hdGguZXhwbTEoeCk7XG4gICAgICB2YXIgYiA9IE1hdGguZXhwbTEoLXgpO1xuICAgICAgaWYgKGEgPT09IEluZmluaXR5KSB7IHJldHVybiAxOyB9XG4gICAgICBpZiAoYiA9PT0gSW5maW5pdHkpIHsgcmV0dXJuIC0xOyB9XG4gICAgICByZXR1cm4gKGEgLSBiKSAvIChNYXRoLmV4cCh4KSArIE1hdGguZXhwKC14KSk7XG4gICAgfSxcblxuICAgIHRydW5jOiBmdW5jdGlvbiB0cnVuYyh2YWx1ZSkge1xuICAgICAgdmFyIHggPSBOdW1iZXIodmFsdWUpO1xuICAgICAgcmV0dXJuIHggPCAwID8gLV9mbG9vcigteCkgOiBfZmxvb3IoeCk7XG4gICAgfSxcblxuICAgIGltdWw6IGZ1bmN0aW9uIGltdWwoeCwgeSkge1xuICAgICAgLy8gdGFrZW4gZnJvbSBodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi1VUy9kb2NzL1dlYi9KYXZhU2NyaXB0L1JlZmVyZW5jZS9HbG9iYWxfT2JqZWN0cy9NYXRoL2ltdWxcbiAgICAgIHZhciBhID0gRVMuVG9VaW50MzIoeCk7XG4gICAgICB2YXIgYiA9IEVTLlRvVWludDMyKHkpO1xuICAgICAgdmFyIGFoID0gKGEgPj4+IDE2KSAmIDB4ZmZmZjtcbiAgICAgIHZhciBhbCA9IGEgJiAweGZmZmY7XG4gICAgICB2YXIgYmggPSAoYiA+Pj4gMTYpICYgMHhmZmZmO1xuICAgICAgdmFyIGJsID0gYiAmIDB4ZmZmZjtcbiAgICAgIC8vIHRoZSBzaGlmdCBieSAwIGZpeGVzIHRoZSBzaWduIG9uIHRoZSBoaWdoIHBhcnRcbiAgICAgIC8vIHRoZSBmaW5hbCB8MCBjb252ZXJ0cyB0aGUgdW5zaWduZWQgdmFsdWUgaW50byBhIHNpZ25lZCB2YWx1ZVxuICAgICAgcmV0dXJuICgoYWwgKiBibCkgKyAoKChhaCAqIGJsICsgYWwgKiBiaCkgPDwgMTYpID4+PiAwKSB8IDApO1xuICAgIH0sXG5cbiAgICBmcm91bmQ6IGZ1bmN0aW9uIGZyb3VuZCh4KSB7XG4gICAgICB2YXIgdiA9IE51bWJlcih4KTtcbiAgICAgIGlmICh2ID09PSAwIHx8IHYgPT09IEluZmluaXR5IHx8IHYgPT09IC1JbmZpbml0eSB8fCBudW1iZXJJc05hTih2KSkge1xuICAgICAgICByZXR1cm4gdjtcbiAgICAgIH1cbiAgICAgIHZhciBzaWduID0gTWF0aC5zaWduKHYpO1xuICAgICAgdmFyIGFicyA9IF9hYnModik7XG4gICAgICBpZiAoYWJzIDwgQklOQVJZXzMyX01JTl9WQUxVRSkge1xuICAgICAgICByZXR1cm4gc2lnbiAqIHJvdW5kVGllc1RvRXZlbihhYnMgLyBCSU5BUllfMzJfTUlOX1ZBTFVFIC8gQklOQVJZXzMyX0VQU0lMT04pICogQklOQVJZXzMyX01JTl9WQUxVRSAqIEJJTkFSWV8zMl9FUFNJTE9OO1xuICAgICAgfVxuICAgICAgLy8gVmVsdGthbXAncyBzcGxpdHRpbmcgKD8pXG4gICAgICB2YXIgYSA9ICgxICsgQklOQVJZXzMyX0VQU0lMT04gLyBOdW1iZXIuRVBTSUxPTikgKiBhYnM7XG4gICAgICB2YXIgcmVzdWx0ID0gYSAtIChhIC0gYWJzKTtcbiAgICAgIGlmIChyZXN1bHQgPiBCSU5BUllfMzJfTUFYX1ZBTFVFIHx8IG51bWJlcklzTmFOKHJlc3VsdCkpIHtcbiAgICAgICAgcmV0dXJuIHNpZ24gKiBJbmZpbml0eTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBzaWduICogcmVzdWx0O1xuICAgIH1cbiAgfTtcbiAgZGVmaW5lUHJvcGVydGllcyhNYXRoLCBNYXRoU2hpbXMpO1xuICAvLyBJRSAxMSBUUCBoYXMgYW4gaW1wcmVjaXNlIGxvZzFwOiByZXBvcnRzIE1hdGgubG9nMXAoLTFlLTE3KSBhcyAwXG4gIGRlZmluZVByb3BlcnR5KE1hdGgsICdsb2cxcCcsIE1hdGhTaGltcy5sb2cxcCwgTWF0aC5sb2cxcCgtMWUtMTcpICE9PSAtMWUtMTcpO1xuICAvLyBJRSAxMSBUUCBoYXMgYW4gaW1wcmVjaXNlIGFzaW5oOiByZXBvcnRzIE1hdGguYXNpbmgoLTFlNykgYXMgbm90IGV4YWN0bHkgZXF1YWwgdG8gLU1hdGguYXNpbmgoMWU3KVxuICBkZWZpbmVQcm9wZXJ0eShNYXRoLCAnYXNpbmgnLCBNYXRoU2hpbXMuYXNpbmgsIE1hdGguYXNpbmgoLTFlNykgIT09IC1NYXRoLmFzaW5oKDFlNykpO1xuICAvLyBDaHJvbWUgNDAgaGFzIGFuIGltcHJlY2lzZSBNYXRoLnRhbmggd2l0aCB2ZXJ5IHNtYWxsIG51bWJlcnNcbiAgZGVmaW5lUHJvcGVydHkoTWF0aCwgJ3RhbmgnLCBNYXRoU2hpbXMudGFuaCwgTWF0aC50YW5oKC0yZS0xNykgIT09IC0yZS0xNyk7XG4gIC8vIENocm9tZSA0MCBsb3NlcyBNYXRoLmFjb3NoIHByZWNpc2lvbiB3aXRoIGhpZ2ggbnVtYmVyc1xuICBkZWZpbmVQcm9wZXJ0eShNYXRoLCAnYWNvc2gnLCBNYXRoU2hpbXMuYWNvc2gsIE1hdGguYWNvc2goTnVtYmVyLk1BWF9WQUxVRSkgPT09IEluZmluaXR5KTtcbiAgLy8gRmlyZWZveCAzOCBvbiBXaW5kb3dzXG4gIGRlZmluZVByb3BlcnR5KE1hdGgsICdjYnJ0JywgTWF0aFNoaW1zLmNicnQsIE1hdGguYWJzKDEgLSBNYXRoLmNicnQoMWUtMzAwKSAvIDFlLTEwMCkgLyBOdW1iZXIuRVBTSUxPTiA+IDgpO1xuICAvLyBub2RlIDAuMTEgaGFzIGFuIGltcHJlY2lzZSBNYXRoLnNpbmggd2l0aCB2ZXJ5IHNtYWxsIG51bWJlcnNcbiAgZGVmaW5lUHJvcGVydHkoTWF0aCwgJ3NpbmgnLCBNYXRoU2hpbXMuc2luaCwgTWF0aC5zaW5oKC0yZS0xNykgIT09IC0yZS0xNyk7XG4gIC8vIEZGIDM1IG9uIExpbnV4IHJlcG9ydHMgMjIwMjUuNDY1Nzk0ODA2NzI1IGZvciBNYXRoLmV4cG0xKDEwKVxuICB2YXIgZXhwbTFPZlRlbiA9IE1hdGguZXhwbTEoMTApO1xuICBkZWZpbmVQcm9wZXJ0eShNYXRoLCAnZXhwbTEnLCBNYXRoU2hpbXMuZXhwbTEsIGV4cG0xT2ZUZW4gPiAyMjAyNS40NjU3OTQ4MDY3MTkgfHwgZXhwbTFPZlRlbiA8IDIyMDI1LjQ2NTc5NDgwNjcxNjUxNjgpO1xuXG4gIHZhciBvcmlnTWF0aFJvdW5kID0gTWF0aC5yb3VuZDtcbiAgLy8gYnJlYWtzIGluIGUuZy4gU2FmYXJpIDgsIEludGVybmV0IEV4cGxvcmVyIDExLCBPcGVyYSAxMlxuICB2YXIgcm91bmRIYW5kbGVzQm91bmRhcnlDb25kaXRpb25zID0gTWF0aC5yb3VuZCgwLjUgLSBOdW1iZXIuRVBTSUxPTiAvIDQpID09PSAwICYmIE1hdGgucm91bmQoLTAuNSArIE51bWJlci5FUFNJTE9OIC8gMy45OSkgPT09IDE7XG5cbiAgLy8gV2hlbiBlbmdpbmVzIHVzZSBNYXRoLmZsb29yKHggKyAwLjUpIGludGVybmFsbHksIE1hdGgucm91bmQgY2FuIGJlIGJ1Z2d5IGZvciBsYXJnZSBpbnRlZ2Vycy5cbiAgLy8gVGhpcyBiZWhhdmlvciBzaG91bGQgYmUgZ292ZXJuZWQgYnkgXCJyb3VuZCB0byBuZWFyZXN0LCB0aWVzIHRvIGV2ZW4gbW9kZVwiXG4gIC8vIHNlZSBodHRwczovL3Blb3BsZS5tb3ppbGxhLm9yZy9+am9yZW5kb3JmZi9lczYtZHJhZnQuaHRtbCNzZWMtZWNtYXNjcmlwdC1sYW5ndWFnZS10eXBlcy1udW1iZXItdHlwZVxuICAvLyBUaGVzZSBhcmUgdGhlIGJvdW5kYXJ5IGNhc2VzIHdoZXJlIGl0IGJyZWFrcy5cbiAgdmFyIHNtYWxsZXN0UG9zaXRpdmVOdW1iZXJXaGVyZVJvdW5kQnJlYWtzID0gaW52ZXJzZUVwc2lsb24gKyAxO1xuICB2YXIgbGFyZ2VzdFBvc2l0aXZlTnVtYmVyV2hlcmVSb3VuZEJyZWFrcyA9IDIgKiBpbnZlcnNlRXBzaWxvbiAtIDE7XG4gIHZhciByb3VuZERvZXNOb3RJbmNyZWFzZUludGVnZXJzID0gW3NtYWxsZXN0UG9zaXRpdmVOdW1iZXJXaGVyZVJvdW5kQnJlYWtzLCBsYXJnZXN0UG9zaXRpdmVOdW1iZXJXaGVyZVJvdW5kQnJlYWtzXS5ldmVyeShmdW5jdGlvbiAobnVtKSB7XG4gICAgcmV0dXJuIE1hdGgucm91bmQobnVtKSA9PT0gbnVtO1xuICB9KTtcbiAgZGVmaW5lUHJvcGVydHkoTWF0aCwgJ3JvdW5kJywgZnVuY3Rpb24gcm91bmQoeCkge1xuICAgIHZhciBmbG9vciA9IF9mbG9vcih4KTtcbiAgICB2YXIgY2VpbCA9IGZsb29yID09PSAtMSA/IC0wIDogZmxvb3IgKyAxO1xuICAgIHJldHVybiB4IC0gZmxvb3IgPCAwLjUgPyBmbG9vciA6IGNlaWw7XG4gIH0sICFyb3VuZEhhbmRsZXNCb3VuZGFyeUNvbmRpdGlvbnMgfHwgIXJvdW5kRG9lc05vdEluY3JlYXNlSW50ZWdlcnMpO1xuICBWYWx1ZS5wcmVzZXJ2ZVRvU3RyaW5nKE1hdGgucm91bmQsIG9yaWdNYXRoUm91bmQpO1xuXG4gIHZhciBvcmlnSW11bCA9IE1hdGguaW11bDtcbiAgaWYgKE1hdGguaW11bCgweGZmZmZmZmZmLCA1KSAhPT0gLTUpIHtcbiAgICAvLyBTYWZhcmkgNi4xLCBhdCBsZWFzdCwgcmVwb3J0cyBcIjBcIiBmb3IgdGhpcyB2YWx1ZVxuICAgIE1hdGguaW11bCA9IE1hdGhTaGltcy5pbXVsO1xuICAgIFZhbHVlLnByZXNlcnZlVG9TdHJpbmcoTWF0aC5pbXVsLCBvcmlnSW11bCk7XG4gIH1cbiAgaWYgKE1hdGguaW11bC5sZW5ndGggIT09IDIpIHtcbiAgICAvLyBTYWZhcmkgOC4wLjQgaGFzIGEgbGVuZ3RoIG9mIDFcbiAgICAvLyBmaXhlZCBpbiBodHRwczovL2J1Z3Mud2Via2l0Lm9yZy9zaG93X2J1Zy5jZ2k/aWQ9MTQzNjU4XG4gICAgb3ZlcnJpZGVOYXRpdmUoTWF0aCwgJ2ltdWwnLCBmdW5jdGlvbiBpbXVsKHgsIHkpIHtcbiAgICAgIHJldHVybiBFUy5DYWxsKG9yaWdJbXVsLCBNYXRoLCBhcmd1bWVudHMpO1xuICAgIH0pO1xuICB9XG5cbiAgLy8gUHJvbWlzZXNcbiAgLy8gU2ltcGxlc3QgcG9zc2libGUgaW1wbGVtZW50YXRpb247IHVzZSBhIDNyZC1wYXJ0eSBsaWJyYXJ5IGlmIHlvdVxuICAvLyB3YW50IHRoZSBiZXN0IHBvc3NpYmxlIHNwZWVkIGFuZC9vciBsb25nIHN0YWNrIHRyYWNlcy5cbiAgdmFyIFByb21pc2VTaGltID0gKGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgc2V0VGltZW91dCA9IGdsb2JhbHMuc2V0VGltZW91dDtcbiAgICAvLyBzb21lIGVudmlyb25tZW50cyBkb24ndCBoYXZlIHNldFRpbWVvdXQgLSBubyB3YXkgdG8gc2hpbSBoZXJlLlxuICAgIGlmICh0eXBlb2Ygc2V0VGltZW91dCAhPT0gJ2Z1bmN0aW9uJyAmJiB0eXBlb2Ygc2V0VGltZW91dCAhPT0gJ29iamVjdCcpIHsgcmV0dXJuOyB9XG5cbiAgICBFUy5Jc1Byb21pc2UgPSBmdW5jdGlvbiAocHJvbWlzZSkge1xuICAgICAgaWYgKCFFUy5UeXBlSXNPYmplY3QocHJvbWlzZSkpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgICAgaWYgKHR5cGVvZiBwcm9taXNlLl9wcm9taXNlID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICByZXR1cm4gZmFsc2U7IC8vIHVuaW5pdGlhbGl6ZWQsIG9yIG1pc3Npbmcgb3VyIGhpZGRlbiBmaWVsZC5cbiAgICAgIH1cbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH07XG5cbiAgICAvLyBcIlByb21pc2VDYXBhYmlsaXR5XCIgaW4gdGhlIHNwZWMgaXMgd2hhdCBtb3N0IHByb21pc2UgaW1wbGVtZW50YXRpb25zXG4gICAgLy8gY2FsbCBhIFwiZGVmZXJyZWRcIi5cbiAgICB2YXIgUHJvbWlzZUNhcGFiaWxpdHkgPSBmdW5jdGlvbiAoQykge1xuICAgICAgaWYgKCFFUy5Jc0NvbnN0cnVjdG9yKEMpKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0JhZCBwcm9taXNlIGNvbnN0cnVjdG9yJyk7XG4gICAgICB9XG4gICAgICB2YXIgY2FwYWJpbGl0eSA9IHRoaXM7XG4gICAgICB2YXIgcmVzb2x2ZXIgPSBmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICAgIGlmIChjYXBhYmlsaXR5LnJlc29sdmUgIT09IHZvaWQgMCB8fCBjYXBhYmlsaXR5LnJlamVjdCAhPT0gdm9pZCAwKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignQmFkIFByb21pc2UgaW1wbGVtZW50YXRpb24hJyk7XG4gICAgICAgIH1cbiAgICAgICAgY2FwYWJpbGl0eS5yZXNvbHZlID0gcmVzb2x2ZTtcbiAgICAgICAgY2FwYWJpbGl0eS5yZWplY3QgPSByZWplY3Q7XG4gICAgICB9O1xuICAgICAgLy8gSW5pdGlhbGl6ZSBmaWVsZHMgdG8gaW5mb3JtIG9wdGltaXplcnMgYWJvdXQgdGhlIG9iamVjdCBzaGFwZS5cbiAgICAgIGNhcGFiaWxpdHkucmVzb2x2ZSA9IHZvaWQgMDtcbiAgICAgIGNhcGFiaWxpdHkucmVqZWN0ID0gdm9pZCAwO1xuICAgICAgY2FwYWJpbGl0eS5wcm9taXNlID0gbmV3IEMocmVzb2x2ZXIpO1xuICAgICAgaWYgKCEoRVMuSXNDYWxsYWJsZShjYXBhYmlsaXR5LnJlc29sdmUpICYmIEVTLklzQ2FsbGFibGUoY2FwYWJpbGl0eS5yZWplY3QpKSkge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdCYWQgcHJvbWlzZSBjb25zdHJ1Y3RvcicpO1xuICAgICAgfVxuICAgIH07XG5cbiAgICAvLyBmaW5kIGFuIGFwcHJvcHJpYXRlIHNldEltbWVkaWF0ZS1hbGlrZVxuICAgIHZhciBtYWtlWmVyb1RpbWVvdXQ7XG4gICAgLypnbG9iYWwgd2luZG93ICovXG4gICAgaWYgKHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnICYmIEVTLklzQ2FsbGFibGUod2luZG93LnBvc3RNZXNzYWdlKSkge1xuICAgICAgbWFrZVplcm9UaW1lb3V0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAvLyBmcm9tIGh0dHA6Ly9kYmFyb24ub3JnL2xvZy8yMDEwMDMwOS1mYXN0ZXItdGltZW91dHNcbiAgICAgICAgdmFyIHRpbWVvdXRzID0gW107XG4gICAgICAgIHZhciBtZXNzYWdlTmFtZSA9ICd6ZXJvLXRpbWVvdXQtbWVzc2FnZSc7XG4gICAgICAgIHZhciBzZXRaZXJvVGltZW91dCA9IGZ1bmN0aW9uIChmbikge1xuICAgICAgICAgIF9wdXNoKHRpbWVvdXRzLCBmbik7XG4gICAgICAgICAgd2luZG93LnBvc3RNZXNzYWdlKG1lc3NhZ2VOYW1lLCAnKicpO1xuICAgICAgICB9O1xuICAgICAgICB2YXIgaGFuZGxlTWVzc2FnZSA9IGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgICAgIGlmIChldmVudC5zb3VyY2UgPT09IHdpbmRvdyAmJiBldmVudC5kYXRhID09PSBtZXNzYWdlTmFtZSkge1xuICAgICAgICAgICAgZXZlbnQuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgICAgICBpZiAodGltZW91dHMubGVuZ3RoID09PSAwKSB7IHJldHVybjsgfVxuICAgICAgICAgICAgdmFyIGZuID0gX3NoaWZ0KHRpbWVvdXRzKTtcbiAgICAgICAgICAgIGZuKCk7XG4gICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignbWVzc2FnZScsIGhhbmRsZU1lc3NhZ2UsIHRydWUpO1xuICAgICAgICByZXR1cm4gc2V0WmVyb1RpbWVvdXQ7XG4gICAgICB9O1xuICAgIH1cbiAgICB2YXIgbWFrZVByb21pc2VBc2FwID0gZnVuY3Rpb24gKCkge1xuICAgICAgLy8gQW4gZWZmaWNpZW50IHRhc2stc2NoZWR1bGVyIGJhc2VkIG9uIGEgcHJlLWV4aXN0aW5nIFByb21pc2VcbiAgICAgIC8vIGltcGxlbWVudGF0aW9uLCB3aGljaCB3ZSBjYW4gdXNlIGV2ZW4gaWYgd2Ugb3ZlcnJpZGUgdGhlXG4gICAgICAvLyBnbG9iYWwgUHJvbWlzZSBiZWxvdyAoaW4gb3JkZXIgdG8gd29ya2Fyb3VuZCBidWdzKVxuICAgICAgLy8gaHR0cHM6Ly9naXRodWIuY29tL1JheW5vcy9vYnNlcnYtaGFzaC9pc3N1ZXMvMiNpc3N1ZWNvbW1lbnQtMzU4NTc2NzFcbiAgICAgIHZhciBQID0gZ2xvYmFscy5Qcm9taXNlO1xuICAgICAgdmFyIHByID0gUCAmJiBQLnJlc29sdmUgJiYgUC5yZXNvbHZlKCk7XG4gICAgICByZXR1cm4gcHIgJiYgZnVuY3Rpb24gKHRhc2spIHtcbiAgICAgICAgcmV0dXJuIHByLnRoZW4odGFzayk7XG4gICAgICB9O1xuICAgIH07XG4gICAgLypnbG9iYWwgcHJvY2VzcyAqL1xuICAgIC8qIGpzY3M6ZGlzYWJsZSBkaXNhbGxvd011bHRpTGluZVRlcm5hcnkgKi9cbiAgICB2YXIgZW5xdWV1ZSA9IEVTLklzQ2FsbGFibGUoZ2xvYmFscy5zZXRJbW1lZGlhdGUpID9cbiAgICAgIGdsb2JhbHMuc2V0SW1tZWRpYXRlIDpcbiAgICAgIHR5cGVvZiBwcm9jZXNzID09PSAnb2JqZWN0JyAmJiBwcm9jZXNzLm5leHRUaWNrID8gcHJvY2Vzcy5uZXh0VGljayA6XG4gICAgICBtYWtlUHJvbWlzZUFzYXAoKSB8fFxuICAgICAgKEVTLklzQ2FsbGFibGUobWFrZVplcm9UaW1lb3V0KSA/IG1ha2VaZXJvVGltZW91dCgpIDpcbiAgICAgIGZ1bmN0aW9uICh0YXNrKSB7IHNldFRpbWVvdXQodGFzaywgMCk7IH0pOyAvLyBmYWxsYmFja1xuICAgIC8qIGpzY3M6ZW5hYmxlIGRpc2FsbG93TXVsdGlMaW5lVGVybmFyeSAqL1xuXG4gICAgLy8gQ29uc3RhbnRzIGZvciBQcm9taXNlIGltcGxlbWVudGF0aW9uXG4gICAgdmFyIFBST01JU0VfSURFTlRJVFkgPSBmdW5jdGlvbiAoeCkgeyByZXR1cm4geDsgfTtcbiAgICB2YXIgUFJPTUlTRV9USFJPV0VSID0gZnVuY3Rpb24gKGUpIHsgdGhyb3cgZTsgfTtcbiAgICB2YXIgUFJPTUlTRV9QRU5ESU5HID0gMDtcbiAgICB2YXIgUFJPTUlTRV9GVUxGSUxMRUQgPSAxO1xuICAgIHZhciBQUk9NSVNFX1JFSkVDVEVEID0gMjtcbiAgICAvLyBXZSBzdG9yZSBmdWxmaWxsL3JlamVjdCBoYW5kbGVycyBhbmQgY2FwYWJpbGl0aWVzIGluIGEgc2luZ2xlIGFycmF5LlxuICAgIHZhciBQUk9NSVNFX0ZVTEZJTExfT0ZGU0VUID0gMDtcbiAgICB2YXIgUFJPTUlTRV9SRUpFQ1RfT0ZGU0VUID0gMTtcbiAgICB2YXIgUFJPTUlTRV9DQVBBQklMSVRZX09GRlNFVCA9IDI7XG4gICAgLy8gVGhpcyBpcyB1c2VkIGluIGFuIG9wdGltaXphdGlvbiBmb3IgY2hhaW5pbmcgcHJvbWlzZXMgdmlhIHRoZW4uXG4gICAgdmFyIFBST01JU0VfRkFLRV9DQVBBQklMSVRZID0ge307XG5cbiAgICB2YXIgZW5xdWV1ZVByb21pc2VSZWFjdGlvbkpvYiA9IGZ1bmN0aW9uIChoYW5kbGVyLCBjYXBhYmlsaXR5LCBhcmd1bWVudCkge1xuICAgICAgZW5xdWV1ZShmdW5jdGlvbiAoKSB7XG4gICAgICAgIHByb21pc2VSZWFjdGlvbkpvYihoYW5kbGVyLCBjYXBhYmlsaXR5LCBhcmd1bWVudCk7XG4gICAgICB9KTtcbiAgICB9O1xuXG4gICAgdmFyIHByb21pc2VSZWFjdGlvbkpvYiA9IGZ1bmN0aW9uIChoYW5kbGVyLCBwcm9taXNlQ2FwYWJpbGl0eSwgYXJndW1lbnQpIHtcbiAgICAgIHZhciBoYW5kbGVyUmVzdWx0LCBmO1xuICAgICAgaWYgKHByb21pc2VDYXBhYmlsaXR5ID09PSBQUk9NSVNFX0ZBS0VfQ0FQQUJJTElUWSkge1xuICAgICAgICAvLyBGYXN0IGNhc2UsIHdoZW4gd2UgZG9uJ3QgYWN0dWFsbHkgbmVlZCB0byBjaGFpbiB0aHJvdWdoIHRvIGFcbiAgICAgICAgLy8gKHJlYWwpIHByb21pc2VDYXBhYmlsaXR5LlxuICAgICAgICByZXR1cm4gaGFuZGxlcihhcmd1bWVudCk7XG4gICAgICB9XG4gICAgICB0cnkge1xuICAgICAgICBoYW5kbGVyUmVzdWx0ID0gaGFuZGxlcihhcmd1bWVudCk7XG4gICAgICAgIGYgPSBwcm9taXNlQ2FwYWJpbGl0eS5yZXNvbHZlO1xuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICBoYW5kbGVyUmVzdWx0ID0gZTtcbiAgICAgICAgZiA9IHByb21pc2VDYXBhYmlsaXR5LnJlamVjdDtcbiAgICAgIH1cbiAgICAgIGYoaGFuZGxlclJlc3VsdCk7XG4gICAgfTtcblxuICAgIHZhciBmdWxmaWxsUHJvbWlzZSA9IGZ1bmN0aW9uIChwcm9taXNlLCB2YWx1ZSkge1xuICAgICAgdmFyIF9wcm9taXNlID0gcHJvbWlzZS5fcHJvbWlzZTtcbiAgICAgIHZhciBsZW5ndGggPSBfcHJvbWlzZS5yZWFjdGlvbkxlbmd0aDtcbiAgICAgIGlmIChsZW5ndGggPiAwKSB7XG4gICAgICAgIGVucXVldWVQcm9taXNlUmVhY3Rpb25Kb2IoXG4gICAgICAgICAgX3Byb21pc2UuZnVsZmlsbFJlYWN0aW9uSGFuZGxlcjAsXG4gICAgICAgICAgX3Byb21pc2UucmVhY3Rpb25DYXBhYmlsaXR5MCxcbiAgICAgICAgICB2YWx1ZVxuICAgICAgICApO1xuICAgICAgICBfcHJvbWlzZS5mdWxmaWxsUmVhY3Rpb25IYW5kbGVyMCA9IHZvaWQgMDtcbiAgICAgICAgX3Byb21pc2UucmVqZWN0UmVhY3Rpb25zMCA9IHZvaWQgMDtcbiAgICAgICAgX3Byb21pc2UucmVhY3Rpb25DYXBhYmlsaXR5MCA9IHZvaWQgMDtcbiAgICAgICAgaWYgKGxlbmd0aCA+IDEpIHtcbiAgICAgICAgICBmb3IgKHZhciBpID0gMSwgaWR4ID0gMDsgaSA8IGxlbmd0aDsgaSsrLCBpZHggKz0gMykge1xuICAgICAgICAgICAgZW5xdWV1ZVByb21pc2VSZWFjdGlvbkpvYihcbiAgICAgICAgICAgICAgX3Byb21pc2VbaWR4ICsgUFJPTUlTRV9GVUxGSUxMX09GRlNFVF0sXG4gICAgICAgICAgICAgIF9wcm9taXNlW2lkeCArIFBST01JU0VfQ0FQQUJJTElUWV9PRkZTRVRdLFxuICAgICAgICAgICAgICB2YWx1ZVxuICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIHByb21pc2VbaWR4ICsgUFJPTUlTRV9GVUxGSUxMX09GRlNFVF0gPSB2b2lkIDA7XG4gICAgICAgICAgICBwcm9taXNlW2lkeCArIFBST01JU0VfUkVKRUNUX09GRlNFVF0gPSB2b2lkIDA7XG4gICAgICAgICAgICBwcm9taXNlW2lkeCArIFBST01JU0VfQ0FQQUJJTElUWV9PRkZTRVRdID0gdm9pZCAwO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgX3Byb21pc2UucmVzdWx0ID0gdmFsdWU7XG4gICAgICBfcHJvbWlzZS5zdGF0ZSA9IFBST01JU0VfRlVMRklMTEVEO1xuICAgICAgX3Byb21pc2UucmVhY3Rpb25MZW5ndGggPSAwO1xuICAgIH07XG5cbiAgICB2YXIgcmVqZWN0UHJvbWlzZSA9IGZ1bmN0aW9uIChwcm9taXNlLCByZWFzb24pIHtcbiAgICAgIHZhciBfcHJvbWlzZSA9IHByb21pc2UuX3Byb21pc2U7XG4gICAgICB2YXIgbGVuZ3RoID0gX3Byb21pc2UucmVhY3Rpb25MZW5ndGg7XG4gICAgICBpZiAobGVuZ3RoID4gMCkge1xuICAgICAgICBlbnF1ZXVlUHJvbWlzZVJlYWN0aW9uSm9iKFxuICAgICAgICAgIF9wcm9taXNlLnJlamVjdFJlYWN0aW9uSGFuZGxlcjAsXG4gICAgICAgICAgX3Byb21pc2UucmVhY3Rpb25DYXBhYmlsaXR5MCxcbiAgICAgICAgICByZWFzb25cbiAgICAgICAgKTtcbiAgICAgICAgX3Byb21pc2UuZnVsZmlsbFJlYWN0aW9uSGFuZGxlcjAgPSB2b2lkIDA7XG4gICAgICAgIF9wcm9taXNlLnJlamVjdFJlYWN0aW9uczAgPSB2b2lkIDA7XG4gICAgICAgIF9wcm9taXNlLnJlYWN0aW9uQ2FwYWJpbGl0eTAgPSB2b2lkIDA7XG4gICAgICAgIGlmIChsZW5ndGggPiAxKSB7XG4gICAgICAgICAgZm9yICh2YXIgaSA9IDEsIGlkeCA9IDA7IGkgPCBsZW5ndGg7IGkrKywgaWR4ICs9IDMpIHtcbiAgICAgICAgICAgIGVucXVldWVQcm9taXNlUmVhY3Rpb25Kb2IoXG4gICAgICAgICAgICAgIF9wcm9taXNlW2lkeCArIFBST01JU0VfUkVKRUNUX09GRlNFVF0sXG4gICAgICAgICAgICAgIF9wcm9taXNlW2lkeCArIFBST01JU0VfQ0FQQUJJTElUWV9PRkZTRVRdLFxuICAgICAgICAgICAgICByZWFzb25cbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICBwcm9taXNlW2lkeCArIFBST01JU0VfRlVMRklMTF9PRkZTRVRdID0gdm9pZCAwO1xuICAgICAgICAgICAgcHJvbWlzZVtpZHggKyBQUk9NSVNFX1JFSkVDVF9PRkZTRVRdID0gdm9pZCAwO1xuICAgICAgICAgICAgcHJvbWlzZVtpZHggKyBQUk9NSVNFX0NBUEFCSUxJVFlfT0ZGU0VUXSA9IHZvaWQgMDtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIF9wcm9taXNlLnJlc3VsdCA9IHJlYXNvbjtcbiAgICAgIF9wcm9taXNlLnN0YXRlID0gUFJPTUlTRV9SRUpFQ1RFRDtcbiAgICAgIF9wcm9taXNlLnJlYWN0aW9uTGVuZ3RoID0gMDtcbiAgICB9O1xuXG4gICAgdmFyIGNyZWF0ZVJlc29sdmluZ0Z1bmN0aW9ucyA9IGZ1bmN0aW9uIChwcm9taXNlKSB7XG4gICAgICB2YXIgYWxyZWFkeVJlc29sdmVkID0gZmFsc2U7XG4gICAgICB2YXIgcmVzb2x2ZSA9IGZ1bmN0aW9uIChyZXNvbHV0aW9uKSB7XG4gICAgICAgIHZhciB0aGVuO1xuICAgICAgICBpZiAoYWxyZWFkeVJlc29sdmVkKSB7IHJldHVybjsgfVxuICAgICAgICBhbHJlYWR5UmVzb2x2ZWQgPSB0cnVlO1xuICAgICAgICBpZiAocmVzb2x1dGlvbiA9PT0gcHJvbWlzZSkge1xuICAgICAgICAgIHJldHVybiByZWplY3RQcm9taXNlKHByb21pc2UsIG5ldyBUeXBlRXJyb3IoJ1NlbGYgcmVzb2x1dGlvbicpKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIUVTLlR5cGVJc09iamVjdChyZXNvbHV0aW9uKSkge1xuICAgICAgICAgIHJldHVybiBmdWxmaWxsUHJvbWlzZShwcm9taXNlLCByZXNvbHV0aW9uKTtcbiAgICAgICAgfVxuICAgICAgICB0cnkge1xuICAgICAgICAgIHRoZW4gPSByZXNvbHV0aW9uLnRoZW47XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICByZXR1cm4gcmVqZWN0UHJvbWlzZShwcm9taXNlLCBlKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIUVTLklzQ2FsbGFibGUodGhlbikpIHtcbiAgICAgICAgICByZXR1cm4gZnVsZmlsbFByb21pc2UocHJvbWlzZSwgcmVzb2x1dGlvbik7XG4gICAgICAgIH1cbiAgICAgICAgZW5xdWV1ZShmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgcHJvbWlzZVJlc29sdmVUaGVuYWJsZUpvYihwcm9taXNlLCByZXNvbHV0aW9uLCB0aGVuKTtcbiAgICAgICAgfSk7XG4gICAgICB9O1xuICAgICAgdmFyIHJlamVjdCA9IGZ1bmN0aW9uIChyZWFzb24pIHtcbiAgICAgICAgaWYgKGFscmVhZHlSZXNvbHZlZCkgeyByZXR1cm47IH1cbiAgICAgICAgYWxyZWFkeVJlc29sdmVkID0gdHJ1ZTtcbiAgICAgICAgcmV0dXJuIHJlamVjdFByb21pc2UocHJvbWlzZSwgcmVhc29uKTtcbiAgICAgIH07XG4gICAgICByZXR1cm4geyByZXNvbHZlOiByZXNvbHZlLCByZWplY3Q6IHJlamVjdCB9O1xuICAgIH07XG5cbiAgICB2YXIgb3B0aW1pemVkVGhlbiA9IGZ1bmN0aW9uICh0aGVuLCB0aGVuYWJsZSwgcmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICAvLyBPcHRpbWl6YXRpb246IHNpbmNlIHdlIGRpc2NhcmQgdGhlIHJlc3VsdCwgd2UgY2FuIHBhc3Mgb3VyXG4gICAgICAvLyBvd24gdGhlbiBpbXBsZW1lbnRhdGlvbiBhIHNwZWNpYWwgaGludCB0byBsZXQgaXQga25vdyBpdFxuICAgICAgLy8gZG9lc24ndCBoYXZlIHRvIGNyZWF0ZSBpdC4gIChUaGUgUFJPTUlTRV9GQUtFX0NBUEFCSUxJVFlcbiAgICAgIC8vIG9iamVjdCBpcyBsb2NhbCB0byB0aGlzIGltcGxlbWVudGF0aW9uIGFuZCB1bmZvcmdlYWJsZSBvdXRzaWRlLilcbiAgICAgIGlmICh0aGVuID09PSBQcm9taXNlJHByb3RvdHlwZSR0aGVuKSB7XG4gICAgICAgIF9jYWxsKHRoZW4sIHRoZW5hYmxlLCByZXNvbHZlLCByZWplY3QsIFBST01JU0VfRkFLRV9DQVBBQklMSVRZKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIF9jYWxsKHRoZW4sIHRoZW5hYmxlLCByZXNvbHZlLCByZWplY3QpO1xuICAgICAgfVxuICAgIH07XG4gICAgdmFyIHByb21pc2VSZXNvbHZlVGhlbmFibGVKb2IgPSBmdW5jdGlvbiAocHJvbWlzZSwgdGhlbmFibGUsIHRoZW4pIHtcbiAgICAgIHZhciByZXNvbHZpbmdGdW5jdGlvbnMgPSBjcmVhdGVSZXNvbHZpbmdGdW5jdGlvbnMocHJvbWlzZSk7XG4gICAgICB2YXIgcmVzb2x2ZSA9IHJlc29sdmluZ0Z1bmN0aW9ucy5yZXNvbHZlO1xuICAgICAgdmFyIHJlamVjdCA9IHJlc29sdmluZ0Z1bmN0aW9ucy5yZWplY3Q7XG4gICAgICB0cnkge1xuICAgICAgICBvcHRpbWl6ZWRUaGVuKHRoZW4sIHRoZW5hYmxlLCByZXNvbHZlLCByZWplY3QpO1xuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICByZWplY3QoZSk7XG4gICAgICB9XG4gICAgfTtcblxuICAgIHZhciBQcm9taXNlJHByb3RvdHlwZSwgUHJvbWlzZSRwcm90b3R5cGUkdGhlbjtcbiAgICB2YXIgUHJvbWlzZSA9IChmdW5jdGlvbiAoKSB7XG4gICAgICB2YXIgUHJvbWlzZVNoaW0gPSBmdW5jdGlvbiBQcm9taXNlKHJlc29sdmVyKSB7XG4gICAgICAgIGlmICghKHRoaXMgaW5zdGFuY2VvZiBQcm9taXNlU2hpbSkpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdDb25zdHJ1Y3RvciBQcm9taXNlIHJlcXVpcmVzIFwibmV3XCInKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodGhpcyAmJiB0aGlzLl9wcm9taXNlKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignQmFkIGNvbnN0cnVjdGlvbicpO1xuICAgICAgICB9XG4gICAgICAgIC8vIHNlZSBodHRwczovL2J1Z3MuZWNtYXNjcmlwdC5vcmcvc2hvd19idWcuY2dpP2lkPTI0ODJcbiAgICAgICAgaWYgKCFFUy5Jc0NhbGxhYmxlKHJlc29sdmVyKSkge1xuICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ25vdCBhIHZhbGlkIHJlc29sdmVyJyk7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHByb21pc2UgPSBlbXVsYXRlRVM2Y29uc3RydWN0KHRoaXMsIFByb21pc2VTaGltLCBQcm9taXNlJHByb3RvdHlwZSwge1xuICAgICAgICAgIF9wcm9taXNlOiB7XG4gICAgICAgICAgICByZXN1bHQ6IHZvaWQgMCxcbiAgICAgICAgICAgIHN0YXRlOiBQUk9NSVNFX1BFTkRJTkcsXG4gICAgICAgICAgICAvLyBUaGUgZmlyc3QgbWVtYmVyIG9mIHRoZSBcInJlYWN0aW9uc1wiIGFycmF5IGlzIGlubGluZWQgaGVyZSxcbiAgICAgICAgICAgIC8vIHNpbmNlIG1vc3QgcHJvbWlzZXMgb25seSBoYXZlIG9uZSByZWFjdGlvbi5cbiAgICAgICAgICAgIC8vIFdlJ3ZlIGFsc28gZXhwbG9kZWQgdGhlICdyZWFjdGlvbicgb2JqZWN0IHRvIGlubGluZSB0aGVcbiAgICAgICAgICAgIC8vIFwiaGFuZGxlclwiIGFuZCBcImNhcGFiaWxpdHlcIiBmaWVsZHMsIHNpbmNlIGJvdGggZnVsZmlsbCBhbmRcbiAgICAgICAgICAgIC8vIHJlamVjdCByZWFjdGlvbnMgc2hhcmUgdGhlIHNhbWUgY2FwYWJpbGl0eS5cbiAgICAgICAgICAgIHJlYWN0aW9uTGVuZ3RoOiAwLFxuICAgICAgICAgICAgZnVsZmlsbFJlYWN0aW9uSGFuZGxlcjA6IHZvaWQgMCxcbiAgICAgICAgICAgIHJlamVjdFJlYWN0aW9uSGFuZGxlcjA6IHZvaWQgMCxcbiAgICAgICAgICAgIHJlYWN0aW9uQ2FwYWJpbGl0eTA6IHZvaWQgMFxuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIHZhciByZXNvbHZpbmdGdW5jdGlvbnMgPSBjcmVhdGVSZXNvbHZpbmdGdW5jdGlvbnMocHJvbWlzZSk7XG4gICAgICAgIHZhciByZWplY3QgPSByZXNvbHZpbmdGdW5jdGlvbnMucmVqZWN0O1xuICAgICAgICB0cnkge1xuICAgICAgICAgIHJlc29sdmVyKHJlc29sdmluZ0Z1bmN0aW9ucy5yZXNvbHZlLCByZWplY3QpO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgcmVqZWN0KGUpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBwcm9taXNlO1xuICAgICAgfTtcbiAgICAgIHJldHVybiBQcm9taXNlU2hpbTtcbiAgICB9KCkpO1xuICAgIFByb21pc2UkcHJvdG90eXBlID0gUHJvbWlzZS5wcm90b3R5cGU7XG5cbiAgICB2YXIgX3Byb21pc2VBbGxSZXNvbHZlciA9IGZ1bmN0aW9uIChpbmRleCwgdmFsdWVzLCBjYXBhYmlsaXR5LCByZW1haW5pbmcpIHtcbiAgICAgIHZhciBhbHJlYWR5Q2FsbGVkID0gZmFsc2U7XG4gICAgICByZXR1cm4gZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgaWYgKGFscmVhZHlDYWxsZWQpIHsgcmV0dXJuOyB9XG4gICAgICAgIGFscmVhZHlDYWxsZWQgPSB0cnVlO1xuICAgICAgICB2YWx1ZXNbaW5kZXhdID0geDtcbiAgICAgICAgaWYgKCgtLXJlbWFpbmluZy5jb3VudCkgPT09IDApIHtcbiAgICAgICAgICB2YXIgcmVzb2x2ZSA9IGNhcGFiaWxpdHkucmVzb2x2ZTtcbiAgICAgICAgICByZXNvbHZlKHZhbHVlcyk7IC8vIGNhbGwgdy8gdGhpcz09PXVuZGVmaW5lZFxuICAgICAgICB9XG4gICAgICB9O1xuICAgIH07XG5cbiAgICB2YXIgcGVyZm9ybVByb21pc2VBbGwgPSBmdW5jdGlvbiAoaXRlcmF0b3JSZWNvcmQsIEMsIHJlc3VsdENhcGFiaWxpdHkpIHtcbiAgICAgIHZhciBpdCA9IGl0ZXJhdG9yUmVjb3JkLml0ZXJhdG9yO1xuICAgICAgdmFyIHZhbHVlcyA9IFtdLCByZW1haW5pbmcgPSB7IGNvdW50OiAxIH0sIG5leHQsIG5leHRWYWx1ZTtcbiAgICAgIHZhciBpbmRleCA9IDA7XG4gICAgICB3aGlsZSAodHJ1ZSkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgIG5leHQgPSBFUy5JdGVyYXRvclN0ZXAoaXQpO1xuICAgICAgICAgIGlmIChuZXh0ID09PSBmYWxzZSkge1xuICAgICAgICAgICAgaXRlcmF0b3JSZWNvcmQuZG9uZSA9IHRydWU7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICB9XG4gICAgICAgICAgbmV4dFZhbHVlID0gbmV4dC52YWx1ZTtcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgIGl0ZXJhdG9yUmVjb3JkLmRvbmUgPSB0cnVlO1xuICAgICAgICAgIHRocm93IGU7XG4gICAgICAgIH1cbiAgICAgICAgdmFsdWVzW2luZGV4XSA9IHZvaWQgMDtcbiAgICAgICAgdmFyIG5leHRQcm9taXNlID0gQy5yZXNvbHZlKG5leHRWYWx1ZSk7XG4gICAgICAgIHZhciByZXNvbHZlRWxlbWVudCA9IF9wcm9taXNlQWxsUmVzb2x2ZXIoXG4gICAgICAgICAgaW5kZXgsIHZhbHVlcywgcmVzdWx0Q2FwYWJpbGl0eSwgcmVtYWluaW5nXG4gICAgICAgICk7XG4gICAgICAgIHJlbWFpbmluZy5jb3VudCArPSAxO1xuICAgICAgICBvcHRpbWl6ZWRUaGVuKG5leHRQcm9taXNlLnRoZW4sIG5leHRQcm9taXNlLCByZXNvbHZlRWxlbWVudCwgcmVzdWx0Q2FwYWJpbGl0eS5yZWplY3QpO1xuICAgICAgICBpbmRleCArPSAxO1xuICAgICAgfVxuICAgICAgaWYgKCgtLXJlbWFpbmluZy5jb3VudCkgPT09IDApIHtcbiAgICAgICAgdmFyIHJlc29sdmUgPSByZXN1bHRDYXBhYmlsaXR5LnJlc29sdmU7XG4gICAgICAgIHJlc29sdmUodmFsdWVzKTsgLy8gY2FsbCB3LyB0aGlzPT09dW5kZWZpbmVkXG4gICAgICB9XG4gICAgICByZXR1cm4gcmVzdWx0Q2FwYWJpbGl0eS5wcm9taXNlO1xuICAgIH07XG5cbiAgICB2YXIgcGVyZm9ybVByb21pc2VSYWNlID0gZnVuY3Rpb24gKGl0ZXJhdG9yUmVjb3JkLCBDLCByZXN1bHRDYXBhYmlsaXR5KSB7XG4gICAgICB2YXIgaXQgPSBpdGVyYXRvclJlY29yZC5pdGVyYXRvciwgbmV4dCwgbmV4dFZhbHVlLCBuZXh0UHJvbWlzZTtcbiAgICAgIHdoaWxlICh0cnVlKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgbmV4dCA9IEVTLkl0ZXJhdG9yU3RlcChpdCk7XG4gICAgICAgICAgaWYgKG5leHQgPT09IGZhbHNlKSB7XG4gICAgICAgICAgICAvLyBOT1RFOiBJZiBpdGVyYWJsZSBoYXMgbm8gaXRlbXMsIHJlc3VsdGluZyBwcm9taXNlIHdpbGwgbmV2ZXJcbiAgICAgICAgICAgIC8vIHJlc29sdmU7IHNlZTpcbiAgICAgICAgICAgIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS9kb21lbmljL3Byb21pc2VzLXVud3JhcHBpbmcvaXNzdWVzLzc1XG4gICAgICAgICAgICAvLyBodHRwczovL2J1Z3MuZWNtYXNjcmlwdC5vcmcvc2hvd19idWcuY2dpP2lkPTI1MTVcbiAgICAgICAgICAgIGl0ZXJhdG9yUmVjb3JkLmRvbmUgPSB0cnVlO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgfVxuICAgICAgICAgIG5leHRWYWx1ZSA9IG5leHQudmFsdWU7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICBpdGVyYXRvclJlY29yZC5kb25lID0gdHJ1ZTtcbiAgICAgICAgICB0aHJvdyBlO1xuICAgICAgICB9XG4gICAgICAgIG5leHRQcm9taXNlID0gQy5yZXNvbHZlKG5leHRWYWx1ZSk7XG4gICAgICAgIG9wdGltaXplZFRoZW4obmV4dFByb21pc2UudGhlbiwgbmV4dFByb21pc2UsIHJlc3VsdENhcGFiaWxpdHkucmVzb2x2ZSwgcmVzdWx0Q2FwYWJpbGl0eS5yZWplY3QpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHJlc3VsdENhcGFiaWxpdHkucHJvbWlzZTtcbiAgICB9O1xuXG4gICAgZGVmaW5lUHJvcGVydGllcyhQcm9taXNlLCB7XG4gICAgICBhbGw6IGZ1bmN0aW9uIGFsbChpdGVyYWJsZSkge1xuICAgICAgICB2YXIgQyA9IHRoaXM7XG4gICAgICAgIGlmICghRVMuVHlwZUlzT2JqZWN0KEMpKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignUHJvbWlzZSBpcyBub3Qgb2JqZWN0Jyk7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGNhcGFiaWxpdHkgPSBuZXcgUHJvbWlzZUNhcGFiaWxpdHkoQyk7XG4gICAgICAgIHZhciBpdGVyYXRvciwgaXRlcmF0b3JSZWNvcmQ7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgaXRlcmF0b3IgPSBFUy5HZXRJdGVyYXRvcihpdGVyYWJsZSk7XG4gICAgICAgICAgaXRlcmF0b3JSZWNvcmQgPSB7IGl0ZXJhdG9yOiBpdGVyYXRvciwgZG9uZTogZmFsc2UgfTtcbiAgICAgICAgICByZXR1cm4gcGVyZm9ybVByb21pc2VBbGwoaXRlcmF0b3JSZWNvcmQsIEMsIGNhcGFiaWxpdHkpO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgdmFyIGV4Y2VwdGlvbiA9IGU7XG4gICAgICAgICAgaWYgKGl0ZXJhdG9yUmVjb3JkICYmICFpdGVyYXRvclJlY29yZC5kb25lKSB7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICBFUy5JdGVyYXRvckNsb3NlKGl0ZXJhdG9yLCB0cnVlKTtcbiAgICAgICAgICAgIH0gY2F0Y2ggKGVlKSB7XG4gICAgICAgICAgICAgIGV4Y2VwdGlvbiA9IGVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICB2YXIgcmVqZWN0ID0gY2FwYWJpbGl0eS5yZWplY3Q7XG4gICAgICAgICAgcmVqZWN0KGV4Y2VwdGlvbik7XG4gICAgICAgICAgcmV0dXJuIGNhcGFiaWxpdHkucHJvbWlzZTtcbiAgICAgICAgfVxuICAgICAgfSxcblxuICAgICAgcmFjZTogZnVuY3Rpb24gcmFjZShpdGVyYWJsZSkge1xuICAgICAgICB2YXIgQyA9IHRoaXM7XG4gICAgICAgIGlmICghRVMuVHlwZUlzT2JqZWN0KEMpKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignUHJvbWlzZSBpcyBub3Qgb2JqZWN0Jyk7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGNhcGFiaWxpdHkgPSBuZXcgUHJvbWlzZUNhcGFiaWxpdHkoQyk7XG4gICAgICAgIHZhciBpdGVyYXRvciwgaXRlcmF0b3JSZWNvcmQ7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgaXRlcmF0b3IgPSBFUy5HZXRJdGVyYXRvcihpdGVyYWJsZSk7XG4gICAgICAgICAgaXRlcmF0b3JSZWNvcmQgPSB7IGl0ZXJhdG9yOiBpdGVyYXRvciwgZG9uZTogZmFsc2UgfTtcbiAgICAgICAgICByZXR1cm4gcGVyZm9ybVByb21pc2VSYWNlKGl0ZXJhdG9yUmVjb3JkLCBDLCBjYXBhYmlsaXR5KTtcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgIHZhciBleGNlcHRpb24gPSBlO1xuICAgICAgICAgIGlmIChpdGVyYXRvclJlY29yZCAmJiAhaXRlcmF0b3JSZWNvcmQuZG9uZSkge1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgRVMuSXRlcmF0b3JDbG9zZShpdGVyYXRvciwgdHJ1ZSk7XG4gICAgICAgICAgICB9IGNhdGNoIChlZSkge1xuICAgICAgICAgICAgICBleGNlcHRpb24gPSBlZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgdmFyIHJlamVjdCA9IGNhcGFiaWxpdHkucmVqZWN0O1xuICAgICAgICAgIHJlamVjdChleGNlcHRpb24pO1xuICAgICAgICAgIHJldHVybiBjYXBhYmlsaXR5LnByb21pc2U7XG4gICAgICAgIH1cbiAgICAgIH0sXG5cbiAgICAgIHJlamVjdDogZnVuY3Rpb24gcmVqZWN0KHJlYXNvbikge1xuICAgICAgICB2YXIgQyA9IHRoaXM7XG4gICAgICAgIGlmICghRVMuVHlwZUlzT2JqZWN0KEMpKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignQmFkIHByb21pc2UgY29uc3RydWN0b3InKTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgY2FwYWJpbGl0eSA9IG5ldyBQcm9taXNlQ2FwYWJpbGl0eShDKTtcbiAgICAgICAgdmFyIHJlamVjdEZ1bmMgPSBjYXBhYmlsaXR5LnJlamVjdDtcbiAgICAgICAgcmVqZWN0RnVuYyhyZWFzb24pOyAvLyBjYWxsIHdpdGggdGhpcz09PXVuZGVmaW5lZFxuICAgICAgICByZXR1cm4gY2FwYWJpbGl0eS5wcm9taXNlO1xuICAgICAgfSxcblxuICAgICAgcmVzb2x2ZTogZnVuY3Rpb24gcmVzb2x2ZSh2KSB7XG4gICAgICAgIC8vIFNlZSBodHRwczovL2VzZGlzY3Vzcy5vcmcvdG9waWMvZml4aW5nLXByb21pc2UtcmVzb2x2ZSBmb3Igc3BlY1xuICAgICAgICB2YXIgQyA9IHRoaXM7XG4gICAgICAgIGlmICghRVMuVHlwZUlzT2JqZWN0KEMpKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignQmFkIHByb21pc2UgY29uc3RydWN0b3InKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoRVMuSXNQcm9taXNlKHYpKSB7XG4gICAgICAgICAgdmFyIGNvbnN0cnVjdG9yID0gdi5jb25zdHJ1Y3RvcjtcbiAgICAgICAgICBpZiAoY29uc3RydWN0b3IgPT09IEMpIHsgcmV0dXJuIHY7IH1cbiAgICAgICAgfVxuICAgICAgICB2YXIgY2FwYWJpbGl0eSA9IG5ldyBQcm9taXNlQ2FwYWJpbGl0eShDKTtcbiAgICAgICAgdmFyIHJlc29sdmVGdW5jID0gY2FwYWJpbGl0eS5yZXNvbHZlO1xuICAgICAgICByZXNvbHZlRnVuYyh2KTsgLy8gY2FsbCB3aXRoIHRoaXM9PT11bmRlZmluZWRcbiAgICAgICAgcmV0dXJuIGNhcGFiaWxpdHkucHJvbWlzZTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIGRlZmluZVByb3BlcnRpZXMoUHJvbWlzZSRwcm90b3R5cGUsIHtcbiAgICAgICdjYXRjaCc6IGZ1bmN0aW9uIChvblJlamVjdGVkKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnRoZW4obnVsbCwgb25SZWplY3RlZCk7XG4gICAgICB9LFxuXG4gICAgICB0aGVuOiBmdW5jdGlvbiB0aGVuKG9uRnVsZmlsbGVkLCBvblJlamVjdGVkKSB7XG4gICAgICAgIHZhciBwcm9taXNlID0gdGhpcztcbiAgICAgICAgaWYgKCFFUy5Jc1Byb21pc2UocHJvbWlzZSkpIHsgdGhyb3cgbmV3IFR5cGVFcnJvcignbm90IGEgcHJvbWlzZScpOyB9XG4gICAgICAgIHZhciBDID0gRVMuU3BlY2llc0NvbnN0cnVjdG9yKHByb21pc2UsIFByb21pc2UpO1xuICAgICAgICB2YXIgcmVzdWx0Q2FwYWJpbGl0eTtcbiAgICAgICAgdmFyIHJldHVyblZhbHVlSXNJZ25vcmVkID0gYXJndW1lbnRzLmxlbmd0aCA+IDIgJiYgYXJndW1lbnRzWzJdID09PSBQUk9NSVNFX0ZBS0VfQ0FQQUJJTElUWTtcbiAgICAgICAgaWYgKHJldHVyblZhbHVlSXNJZ25vcmVkICYmIEMgPT09IFByb21pc2UpIHtcbiAgICAgICAgICByZXN1bHRDYXBhYmlsaXR5ID0gUFJPTUlTRV9GQUtFX0NBUEFCSUxJVFk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmVzdWx0Q2FwYWJpbGl0eSA9IG5ldyBQcm9taXNlQ2FwYWJpbGl0eShDKTtcbiAgICAgICAgfVxuICAgICAgICAvLyBQZXJmb3JtUHJvbWlzZVRoZW4ocHJvbWlzZSwgb25GdWxmaWxsZWQsIG9uUmVqZWN0ZWQsIHJlc3VsdENhcGFiaWxpdHkpXG4gICAgICAgIC8vIE5vdGUgdGhhdCB3ZSd2ZSBzcGxpdCB0aGUgJ3JlYWN0aW9uJyBvYmplY3QgaW50byBpdHMgdHdvXG4gICAgICAgIC8vIGNvbXBvbmVudHMsIFwiY2FwYWJpbGl0aWVzXCIgYW5kIFwiaGFuZGxlclwiXG4gICAgICAgIC8vIFwiY2FwYWJpbGl0aWVzXCIgaXMgYWx3YXlzIGVxdWFsIHRvIGByZXN1bHRDYXBhYmlsaXR5YFxuICAgICAgICB2YXIgZnVsZmlsbFJlYWN0aW9uSGFuZGxlciA9IEVTLklzQ2FsbGFibGUob25GdWxmaWxsZWQpID8gb25GdWxmaWxsZWQgOiBQUk9NSVNFX0lERU5USVRZO1xuICAgICAgICB2YXIgcmVqZWN0UmVhY3Rpb25IYW5kbGVyID0gRVMuSXNDYWxsYWJsZShvblJlamVjdGVkKSA/IG9uUmVqZWN0ZWQgOiBQUk9NSVNFX1RIUk9XRVI7XG4gICAgICAgIHZhciBfcHJvbWlzZSA9IHByb21pc2UuX3Byb21pc2U7XG4gICAgICAgIHZhciB2YWx1ZTtcbiAgICAgICAgaWYgKF9wcm9taXNlLnN0YXRlID09PSBQUk9NSVNFX1BFTkRJTkcpIHtcbiAgICAgICAgICBpZiAoX3Byb21pc2UucmVhY3Rpb25MZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIF9wcm9taXNlLmZ1bGZpbGxSZWFjdGlvbkhhbmRsZXIwID0gZnVsZmlsbFJlYWN0aW9uSGFuZGxlcjtcbiAgICAgICAgICAgIF9wcm9taXNlLnJlamVjdFJlYWN0aW9uSGFuZGxlcjAgPSByZWplY3RSZWFjdGlvbkhhbmRsZXI7XG4gICAgICAgICAgICBfcHJvbWlzZS5yZWFjdGlvbkNhcGFiaWxpdHkwID0gcmVzdWx0Q2FwYWJpbGl0eTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdmFyIGlkeCA9IDMgKiAoX3Byb21pc2UucmVhY3Rpb25MZW5ndGggLSAxKTtcbiAgICAgICAgICAgIF9wcm9taXNlW2lkeCArIFBST01JU0VfRlVMRklMTF9PRkZTRVRdID0gZnVsZmlsbFJlYWN0aW9uSGFuZGxlcjtcbiAgICAgICAgICAgIF9wcm9taXNlW2lkeCArIFBST01JU0VfUkVKRUNUX09GRlNFVF0gPSByZWplY3RSZWFjdGlvbkhhbmRsZXI7XG4gICAgICAgICAgICBfcHJvbWlzZVtpZHggKyBQUk9NSVNFX0NBUEFCSUxJVFlfT0ZGU0VUXSA9IHJlc3VsdENhcGFiaWxpdHk7XG4gICAgICAgICAgfVxuICAgICAgICAgIF9wcm9taXNlLnJlYWN0aW9uTGVuZ3RoICs9IDE7XG4gICAgICAgIH0gZWxzZSBpZiAoX3Byb21pc2Uuc3RhdGUgPT09IFBST01JU0VfRlVMRklMTEVEKSB7XG4gICAgICAgICAgdmFsdWUgPSBfcHJvbWlzZS5yZXN1bHQ7XG4gICAgICAgICAgZW5xdWV1ZVByb21pc2VSZWFjdGlvbkpvYihcbiAgICAgICAgICAgIGZ1bGZpbGxSZWFjdGlvbkhhbmRsZXIsIHJlc3VsdENhcGFiaWxpdHksIHZhbHVlXG4gICAgICAgICAgKTtcbiAgICAgICAgfSBlbHNlIGlmIChfcHJvbWlzZS5zdGF0ZSA9PT0gUFJPTUlTRV9SRUpFQ1RFRCkge1xuICAgICAgICAgIHZhbHVlID0gX3Byb21pc2UucmVzdWx0O1xuICAgICAgICAgIGVucXVldWVQcm9taXNlUmVhY3Rpb25Kb2IoXG4gICAgICAgICAgICByZWplY3RSZWFjdGlvbkhhbmRsZXIsIHJlc3VsdENhcGFiaWxpdHksIHZhbHVlXG4gICAgICAgICAgKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCd1bmV4cGVjdGVkIFByb21pc2Ugc3RhdGUnKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmVzdWx0Q2FwYWJpbGl0eS5wcm9taXNlO1xuICAgICAgfVxuICAgIH0pO1xuICAgIC8vIFRoaXMgaGVscHMgdGhlIG9wdGltaXplciBieSBlbnN1cmluZyB0aGF0IG1ldGhvZHMgd2hpY2ggdGFrZVxuICAgIC8vIGNhcGFiaWxpdGllcyBhcmVuJ3QgcG9seW1vcnBoaWMuXG4gICAgUFJPTUlTRV9GQUtFX0NBUEFCSUxJVFkgPSBuZXcgUHJvbWlzZUNhcGFiaWxpdHkoUHJvbWlzZSk7XG4gICAgUHJvbWlzZSRwcm90b3R5cGUkdGhlbiA9IFByb21pc2UkcHJvdG90eXBlLnRoZW47XG5cbiAgICByZXR1cm4gUHJvbWlzZTtcbiAgfSgpKTtcblxuICAvLyBDaHJvbWUncyBuYXRpdmUgUHJvbWlzZSBoYXMgZXh0cmEgbWV0aG9kcyB0aGF0IGl0IHNob3VsZG4ndCBoYXZlLiBMZXQncyByZW1vdmUgdGhlbS5cbiAgaWYgKGdsb2JhbHMuUHJvbWlzZSkge1xuICAgIGRlbGV0ZSBnbG9iYWxzLlByb21pc2UuYWNjZXB0O1xuICAgIGRlbGV0ZSBnbG9iYWxzLlByb21pc2UuZGVmZXI7XG4gICAgZGVsZXRlIGdsb2JhbHMuUHJvbWlzZS5wcm90b3R5cGUuY2hhaW47XG4gIH1cblxuICBpZiAodHlwZW9mIFByb21pc2VTaGltID09PSAnZnVuY3Rpb24nKSB7XG4gICAgLy8gZXhwb3J0IHRoZSBQcm9taXNlIGNvbnN0cnVjdG9yLlxuICAgIGRlZmluZVByb3BlcnRpZXMoZ2xvYmFscywgeyBQcm9taXNlOiBQcm9taXNlU2hpbSB9KTtcbiAgICAvLyBJbiBDaHJvbWUgMzMgKGFuZCB0aGVyZWFib3V0cykgUHJvbWlzZSBpcyBkZWZpbmVkLCBidXQgdGhlXG4gICAgLy8gaW1wbGVtZW50YXRpb24gaXMgYnVnZ3kgaW4gYSBudW1iZXIgb2Ygd2F5cy4gIExldCdzIGNoZWNrIHN1YmNsYXNzaW5nXG4gICAgLy8gc3VwcG9ydCB0byBzZWUgaWYgd2UgaGF2ZSBhIGJ1Z2d5IGltcGxlbWVudGF0aW9uLlxuICAgIHZhciBwcm9taXNlU3VwcG9ydHNTdWJjbGFzc2luZyA9IHN1cHBvcnRzU3ViY2xhc3NpbmcoZ2xvYmFscy5Qcm9taXNlLCBmdW5jdGlvbiAoUykge1xuICAgICAgcmV0dXJuIFMucmVzb2x2ZSg0MikudGhlbihmdW5jdGlvbiAoKSB7fSkgaW5zdGFuY2VvZiBTO1xuICAgIH0pO1xuICAgIHZhciBwcm9taXNlSWdub3Jlc05vbkZ1bmN0aW9uVGhlbkNhbGxiYWNrcyA9ICF0aHJvd3NFcnJvcihmdW5jdGlvbiAoKSB7IGdsb2JhbHMuUHJvbWlzZS5yZWplY3QoNDIpLnRoZW4obnVsbCwgNSkudGhlbihudWxsLCBub29wKTsgfSk7XG4gICAgdmFyIHByb21pc2VSZXF1aXJlc09iamVjdENvbnRleHQgPSB0aHJvd3NFcnJvcihmdW5jdGlvbiAoKSB7IGdsb2JhbHMuUHJvbWlzZS5jYWxsKDMsIG5vb3ApOyB9KTtcbiAgICAvLyBQcm9taXNlLnJlc29sdmUoKSB3YXMgZXJyYXRhJ2VkIGxhdGUgaW4gdGhlIEVTNiBwcm9jZXNzLlxuICAgIC8vIFNlZTogaHR0cHM6Ly9idWd6aWxsYS5tb3ppbGxhLm9yZy9zaG93X2J1Zy5jZ2k/aWQ9MTE3MDc0MlxuICAgIC8vICAgICAgaHR0cHM6Ly9jb2RlLmdvb2dsZS5jb20vcC92OC9pc3N1ZXMvZGV0YWlsP2lkPTQxNjFcbiAgICAvLyBJdCBzZXJ2ZXMgYXMgYSBwcm94eSBmb3IgYSBudW1iZXIgb2Ygb3RoZXIgYnVncyBpbiBlYXJseSBQcm9taXNlXG4gICAgLy8gaW1wbGVtZW50YXRpb25zLlxuICAgIHZhciBwcm9taXNlUmVzb2x2ZUJyb2tlbiA9IChmdW5jdGlvbiAoUHJvbWlzZSkge1xuICAgICAgdmFyIHAgPSBQcm9taXNlLnJlc29sdmUoNSk7XG4gICAgICBwLmNvbnN0cnVjdG9yID0ge307XG4gICAgICB2YXIgcDIgPSBQcm9taXNlLnJlc29sdmUocCk7XG4gICAgICB0cnkge1xuICAgICAgICBwMi50aGVuKG51bGwsIG5vb3ApLnRoZW4obnVsbCwgbm9vcCk7IC8vIGF2b2lkIFwidW5jYXVnaHQgcmVqZWN0aW9uXCIgd2FybmluZ3MgaW4gY29uc29sZVxuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICByZXR1cm4gdHJ1ZTsgLy8gdjggbmF0aXZlIFByb21pc2VzIGJyZWFrIGhlcmUgaHR0cHM6Ly9jb2RlLmdvb2dsZS5jb20vcC9jaHJvbWl1bS9pc3N1ZXMvZGV0YWlsP2lkPTU3NTMxNFxuICAgICAgfVxuICAgICAgcmV0dXJuIHAgPT09IHAyOyAvLyBUaGlzICpzaG91bGQqIGJlIGZhbHNlIVxuICAgIH0oZ2xvYmFscy5Qcm9taXNlKSk7XG5cbiAgICAvLyBDaHJvbWUgNDYgKHByb2JhYmx5IG9sZGVyIHRvbykgZG9lcyBub3QgcmV0cmlldmUgYSB0aGVuYWJsZSdzIC50aGVuIHN5bmNocm9ub3VzbHlcbiAgICB2YXIgZ2V0c1RoZW5TeW5jaHJvbm91c2x5ID0gc3VwcG9ydHNEZXNjcmlwdG9ycyAmJiAoZnVuY3Rpb24gKCkge1xuICAgICAgdmFyIGNvdW50ID0gMDtcbiAgICAgIHZhciB0aGVuYWJsZSA9IE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh7fSwgJ3RoZW4nLCB7IGdldDogZnVuY3Rpb24gKCkgeyBjb3VudCArPSAxOyB9IH0pO1xuICAgICAgUHJvbWlzZS5yZXNvbHZlKHRoZW5hYmxlKTtcbiAgICAgIHJldHVybiBjb3VudCA9PT0gMTtcbiAgICB9KCkpO1xuXG4gICAgdmFyIEJhZFJlc29sdmVyUHJvbWlzZSA9IGZ1bmN0aW9uIEJhZFJlc29sdmVyUHJvbWlzZShleGVjdXRvcikge1xuICAgICAgdmFyIHAgPSBuZXcgUHJvbWlzZShleGVjdXRvcik7XG4gICAgICBleGVjdXRvcigzLCBmdW5jdGlvbiAoKSB7fSk7XG4gICAgICB0aGlzLnRoZW4gPSBwLnRoZW47XG4gICAgICB0aGlzLmNvbnN0cnVjdG9yID0gQmFkUmVzb2x2ZXJQcm9taXNlO1xuICAgIH07XG4gICAgQmFkUmVzb2x2ZXJQcm9taXNlLnByb3RvdHlwZSA9IFByb21pc2UucHJvdG90eXBlO1xuICAgIEJhZFJlc29sdmVyUHJvbWlzZS5hbGwgPSBQcm9taXNlLmFsbDtcbiAgICAvLyBDaHJvbWUgQ2FuYXJ5IDQ5IChwcm9iYWJseSBvbGRlciB0b28pIGhhcyBzb21lIGltcGxlbWVudGF0aW9uIGJ1Z3NcbiAgICB2YXIgaGFzQmFkUmVzb2x2ZXJQcm9taXNlID0gdmFsdWVPckZhbHNlSWZUaHJvd3MoZnVuY3Rpb24gKCkge1xuICAgICAgcmV0dXJuICEhQmFkUmVzb2x2ZXJQcm9taXNlLmFsbChbMSwgMl0pO1xuICAgIH0pO1xuXG4gICAgaWYgKCFwcm9taXNlU3VwcG9ydHNTdWJjbGFzc2luZyB8fCAhcHJvbWlzZUlnbm9yZXNOb25GdW5jdGlvblRoZW5DYWxsYmFja3MgfHxcbiAgICAgICAgIXByb21pc2VSZXF1aXJlc09iamVjdENvbnRleHQgfHwgcHJvbWlzZVJlc29sdmVCcm9rZW4gfHxcbiAgICAgICAgIWdldHNUaGVuU3luY2hyb25vdXNseSB8fCBoYXNCYWRSZXNvbHZlclByb21pc2UpIHtcbiAgICAgIC8qIGdsb2JhbHMgUHJvbWlzZTogdHJ1ZSAqL1xuICAgICAgLyogZXNsaW50LWRpc2FibGUgbm8tdW5kZWYgKi9cbiAgICAgIC8qIGpzaGludCAtVzAyMCAqL1xuICAgICAgUHJvbWlzZSA9IFByb21pc2VTaGltO1xuICAgICAgLyoganNoaW50ICtXMDIwICovXG4gICAgICAvKiBlc2xpbnQtZW5hYmxlIG5vLXVuZGVmICovXG4gICAgICAvKiBnbG9iYWxzIFByb21pc2U6IGZhbHNlICovXG4gICAgICBvdmVycmlkZU5hdGl2ZShnbG9iYWxzLCAnUHJvbWlzZScsIFByb21pc2VTaGltKTtcbiAgICB9XG4gICAgaWYgKFByb21pc2UuYWxsLmxlbmd0aCAhPT0gMSkge1xuICAgICAgdmFyIG9yaWdBbGwgPSBQcm9taXNlLmFsbDtcbiAgICAgIG92ZXJyaWRlTmF0aXZlKFByb21pc2UsICdhbGwnLCBmdW5jdGlvbiBhbGwoaXRlcmFibGUpIHtcbiAgICAgICAgcmV0dXJuIEVTLkNhbGwob3JpZ0FsbCwgdGhpcywgYXJndW1lbnRzKTtcbiAgICAgIH0pO1xuICAgIH1cbiAgICBpZiAoUHJvbWlzZS5yYWNlLmxlbmd0aCAhPT0gMSkge1xuICAgICAgdmFyIG9yaWdSYWNlID0gUHJvbWlzZS5yYWNlO1xuICAgICAgb3ZlcnJpZGVOYXRpdmUoUHJvbWlzZSwgJ3JhY2UnLCBmdW5jdGlvbiByYWNlKGl0ZXJhYmxlKSB7XG4gICAgICAgIHJldHVybiBFUy5DYWxsKG9yaWdSYWNlLCB0aGlzLCBhcmd1bWVudHMpO1xuICAgICAgfSk7XG4gICAgfVxuICAgIGlmIChQcm9taXNlLnJlc29sdmUubGVuZ3RoICE9PSAxKSB7XG4gICAgICB2YXIgb3JpZ1Jlc29sdmUgPSBQcm9taXNlLnJlc29sdmU7XG4gICAgICBvdmVycmlkZU5hdGl2ZShQcm9taXNlLCAncmVzb2x2ZScsIGZ1bmN0aW9uIHJlc29sdmUoeCkge1xuICAgICAgICByZXR1cm4gRVMuQ2FsbChvcmlnUmVzb2x2ZSwgdGhpcywgYXJndW1lbnRzKTtcbiAgICAgIH0pO1xuICAgIH1cbiAgICBpZiAoUHJvbWlzZS5yZWplY3QubGVuZ3RoICE9PSAxKSB7XG4gICAgICB2YXIgb3JpZ1JlamVjdCA9IFByb21pc2UucmVqZWN0O1xuICAgICAgb3ZlcnJpZGVOYXRpdmUoUHJvbWlzZSwgJ3JlamVjdCcsIGZ1bmN0aW9uIHJlamVjdChyKSB7XG4gICAgICAgIHJldHVybiBFUy5DYWxsKG9yaWdSZWplY3QsIHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICB9KTtcbiAgICB9XG4gICAgZW5zdXJlRW51bWVyYWJsZShQcm9taXNlLCAnYWxsJyk7XG4gICAgZW5zdXJlRW51bWVyYWJsZShQcm9taXNlLCAncmFjZScpO1xuICAgIGVuc3VyZUVudW1lcmFibGUoUHJvbWlzZSwgJ3Jlc29sdmUnKTtcbiAgICBlbnN1cmVFbnVtZXJhYmxlKFByb21pc2UsICdyZWplY3QnKTtcbiAgICBhZGREZWZhdWx0U3BlY2llcyhQcm9taXNlKTtcbiAgfVxuXG4gIC8vIE1hcCBhbmQgU2V0IHJlcXVpcmUgYSB0cnVlIEVTNSBlbnZpcm9ubWVudFxuICAvLyBUaGVpciBmYXN0IHBhdGggYWxzbyByZXF1aXJlcyB0aGF0IHRoZSBlbnZpcm9ubWVudCBwcmVzZXJ2ZVxuICAvLyBwcm9wZXJ0eSBpbnNlcnRpb24gb3JkZXIsIHdoaWNoIGlzIG5vdCBndWFyYW50ZWVkIGJ5IHRoZSBzcGVjLlxuICB2YXIgdGVzdE9yZGVyID0gZnVuY3Rpb24gKGEpIHtcbiAgICB2YXIgYiA9IGtleXMoX3JlZHVjZShhLCBmdW5jdGlvbiAobywgaykge1xuICAgICAgb1trXSA9IHRydWU7XG4gICAgICByZXR1cm4gbztcbiAgICB9LCB7fSkpO1xuICAgIHJldHVybiBhLmpvaW4oJzonKSA9PT0gYi5qb2luKCc6Jyk7XG4gIH07XG4gIHZhciBwcmVzZXJ2ZXNJbnNlcnRpb25PcmRlciA9IHRlc3RPcmRlcihbJ3onLCAnYScsICdiYiddKTtcbiAgLy8gc29tZSBlbmdpbmVzIChlZywgQ2hyb21lKSBvbmx5IHByZXNlcnZlIGluc2VydGlvbiBvcmRlciBmb3Igc3RyaW5nIGtleXNcbiAgdmFyIHByZXNlcnZlc051bWVyaWNJbnNlcnRpb25PcmRlciA9IHRlc3RPcmRlcihbJ3onLCAxLCAnYScsICczJywgMl0pO1xuXG4gIGlmIChzdXBwb3J0c0Rlc2NyaXB0b3JzKSB7XG5cbiAgICB2YXIgZmFzdGtleSA9IGZ1bmN0aW9uIGZhc3RrZXkoa2V5KSB7XG4gICAgICBpZiAoIXByZXNlcnZlc0luc2VydGlvbk9yZGVyKSB7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfVxuICAgICAgaWYgKHR5cGVvZiBrZXkgPT09ICd1bmRlZmluZWQnIHx8IGtleSA9PT0gbnVsbCkge1xuICAgICAgICByZXR1cm4gJ14nICsgRVMuVG9TdHJpbmcoa2V5KTtcbiAgICAgIH0gZWxzZSBpZiAodHlwZW9mIGtleSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgcmV0dXJuICckJyArIGtleTtcbiAgICAgIH0gZWxzZSBpZiAodHlwZW9mIGtleSA9PT0gJ251bWJlcicpIHtcbiAgICAgICAgLy8gbm90ZSB0aGF0IC0wIHdpbGwgZ2V0IGNvZXJjZWQgdG8gXCIwXCIgd2hlbiB1c2VkIGFzIGEgcHJvcGVydHkga2V5XG4gICAgICAgIGlmICghcHJlc2VydmVzTnVtZXJpY0luc2VydGlvbk9yZGVyKSB7XG4gICAgICAgICAgcmV0dXJuICduJyArIGtleTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4ga2V5O1xuICAgICAgfSBlbHNlIGlmICh0eXBlb2Yga2V5ID09PSAnYm9vbGVhbicpIHtcbiAgICAgICAgcmV0dXJuICdiJyArIGtleTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBudWxsO1xuICAgIH07XG5cbiAgICB2YXIgZW1wdHlPYmplY3QgPSBmdW5jdGlvbiBlbXB0eU9iamVjdCgpIHtcbiAgICAgIC8vIGFjY29tb2RhdGUgc29tZSBvbGRlciBub3QtcXVpdGUtRVM1IGJyb3dzZXJzXG4gICAgICByZXR1cm4gT2JqZWN0LmNyZWF0ZSA/IE9iamVjdC5jcmVhdGUobnVsbCkgOiB7fTtcbiAgICB9O1xuXG4gICAgdmFyIGFkZEl0ZXJhYmxlVG9NYXAgPSBmdW5jdGlvbiBhZGRJdGVyYWJsZVRvTWFwKE1hcENvbnN0cnVjdG9yLCBtYXAsIGl0ZXJhYmxlKSB7XG4gICAgICBpZiAoaXNBcnJheShpdGVyYWJsZSkgfHwgVHlwZS5zdHJpbmcoaXRlcmFibGUpKSB7XG4gICAgICAgIF9mb3JFYWNoKGl0ZXJhYmxlLCBmdW5jdGlvbiAoZW50cnkpIHtcbiAgICAgICAgICBpZiAoIUVTLlR5cGVJc09iamVjdChlbnRyeSkpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0l0ZXJhdG9yIHZhbHVlICcgKyBlbnRyeSArICcgaXMgbm90IGFuIGVudHJ5IG9iamVjdCcpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBtYXAuc2V0KGVudHJ5WzBdLCBlbnRyeVsxXSk7XG4gICAgICAgIH0pO1xuICAgICAgfSBlbHNlIGlmIChpdGVyYWJsZSBpbnN0YW5jZW9mIE1hcENvbnN0cnVjdG9yKSB7XG4gICAgICAgIF9jYWxsKE1hcENvbnN0cnVjdG9yLnByb3RvdHlwZS5mb3JFYWNoLCBpdGVyYWJsZSwgZnVuY3Rpb24gKHZhbHVlLCBrZXkpIHtcbiAgICAgICAgICBtYXAuc2V0KGtleSwgdmFsdWUpO1xuICAgICAgICB9KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHZhciBpdGVyLCBhZGRlcjtcbiAgICAgICAgaWYgKGl0ZXJhYmxlICE9PSBudWxsICYmIHR5cGVvZiBpdGVyYWJsZSAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICBhZGRlciA9IG1hcC5zZXQ7XG4gICAgICAgICAgaWYgKCFFUy5Jc0NhbGxhYmxlKGFkZGVyKSkgeyB0aHJvdyBuZXcgVHlwZUVycm9yKCdiYWQgbWFwJyk7IH1cbiAgICAgICAgICBpdGVyID0gRVMuR2V0SXRlcmF0b3IoaXRlcmFibGUpO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0eXBlb2YgaXRlciAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICB3aGlsZSAodHJ1ZSkge1xuICAgICAgICAgICAgdmFyIG5leHQgPSBFUy5JdGVyYXRvclN0ZXAoaXRlcik7XG4gICAgICAgICAgICBpZiAobmV4dCA9PT0gZmFsc2UpIHsgYnJlYWs7IH1cbiAgICAgICAgICAgIHZhciBuZXh0SXRlbSA9IG5leHQudmFsdWU7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICBpZiAoIUVTLlR5cGVJc09iamVjdChuZXh0SXRlbSkpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdJdGVyYXRvciB2YWx1ZSAnICsgbmV4dEl0ZW0gKyAnIGlzIG5vdCBhbiBlbnRyeSBvYmplY3QnKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBfY2FsbChhZGRlciwgbWFwLCBuZXh0SXRlbVswXSwgbmV4dEl0ZW1bMV0pO1xuICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICBFUy5JdGVyYXRvckNsb3NlKGl0ZXIsIHRydWUpO1xuICAgICAgICAgICAgICB0aHJvdyBlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH07XG4gICAgdmFyIGFkZEl0ZXJhYmxlVG9TZXQgPSBmdW5jdGlvbiBhZGRJdGVyYWJsZVRvU2V0KFNldENvbnN0cnVjdG9yLCBzZXQsIGl0ZXJhYmxlKSB7XG4gICAgICBpZiAoaXNBcnJheShpdGVyYWJsZSkgfHwgVHlwZS5zdHJpbmcoaXRlcmFibGUpKSB7XG4gICAgICAgIF9mb3JFYWNoKGl0ZXJhYmxlLCBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgICBzZXQuYWRkKHZhbHVlKTtcbiAgICAgICAgfSk7XG4gICAgICB9IGVsc2UgaWYgKGl0ZXJhYmxlIGluc3RhbmNlb2YgU2V0Q29uc3RydWN0b3IpIHtcbiAgICAgICAgX2NhbGwoU2V0Q29uc3RydWN0b3IucHJvdG90eXBlLmZvckVhY2gsIGl0ZXJhYmxlLCBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgICBzZXQuYWRkKHZhbHVlKTtcbiAgICAgICAgfSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB2YXIgaXRlciwgYWRkZXI7XG4gICAgICAgIGlmIChpdGVyYWJsZSAhPT0gbnVsbCAmJiB0eXBlb2YgaXRlcmFibGUgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgYWRkZXIgPSBzZXQuYWRkO1xuICAgICAgICAgIGlmICghRVMuSXNDYWxsYWJsZShhZGRlcikpIHsgdGhyb3cgbmV3IFR5cGVFcnJvcignYmFkIHNldCcpOyB9XG4gICAgICAgICAgaXRlciA9IEVTLkdldEl0ZXJhdG9yKGl0ZXJhYmxlKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodHlwZW9mIGl0ZXIgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgd2hpbGUgKHRydWUpIHtcbiAgICAgICAgICAgIHZhciBuZXh0ID0gRVMuSXRlcmF0b3JTdGVwKGl0ZXIpO1xuICAgICAgICAgICAgaWYgKG5leHQgPT09IGZhbHNlKSB7IGJyZWFrOyB9XG4gICAgICAgICAgICB2YXIgbmV4dFZhbHVlID0gbmV4dC52YWx1ZTtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgIF9jYWxsKGFkZGVyLCBzZXQsIG5leHRWYWx1ZSk7XG4gICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgIEVTLkl0ZXJhdG9yQ2xvc2UoaXRlciwgdHJ1ZSk7XG4gICAgICAgICAgICAgIHRocm93IGU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfTtcblxuICAgIHZhciBjb2xsZWN0aW9uU2hpbXMgPSB7XG4gICAgICBNYXA6IChmdW5jdGlvbiAoKSB7XG5cbiAgICAgICAgdmFyIGVtcHR5ID0ge307XG5cbiAgICAgICAgdmFyIE1hcEVudHJ5ID0gZnVuY3Rpb24gTWFwRW50cnkoa2V5LCB2YWx1ZSkge1xuICAgICAgICAgIHRoaXMua2V5ID0ga2V5O1xuICAgICAgICAgIHRoaXMudmFsdWUgPSB2YWx1ZTtcbiAgICAgICAgICB0aGlzLm5leHQgPSBudWxsO1xuICAgICAgICAgIHRoaXMucHJldiA9IG51bGw7XG4gICAgICAgIH07XG5cbiAgICAgICAgTWFwRW50cnkucHJvdG90eXBlLmlzUmVtb3ZlZCA9IGZ1bmN0aW9uIGlzUmVtb3ZlZCgpIHtcbiAgICAgICAgICByZXR1cm4gdGhpcy5rZXkgPT09IGVtcHR5O1xuICAgICAgICB9O1xuXG4gICAgICAgIHZhciBpc01hcCA9IGZ1bmN0aW9uIGlzTWFwKG1hcCkge1xuICAgICAgICAgIHJldHVybiAhIW1hcC5fZXM2bWFwO1xuICAgICAgICB9O1xuXG4gICAgICAgIHZhciByZXF1aXJlTWFwU2xvdCA9IGZ1bmN0aW9uIHJlcXVpcmVNYXBTbG90KG1hcCwgbWV0aG9kKSB7XG4gICAgICAgICAgaWYgKCFFUy5UeXBlSXNPYmplY3QobWFwKSB8fCAhaXNNYXAobWFwKSkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignTWV0aG9kIE1hcC5wcm90b3R5cGUuJyArIG1ldGhvZCArICcgY2FsbGVkIG9uIGluY29tcGF0aWJsZSByZWNlaXZlciAnICsgRVMuVG9TdHJpbmcobWFwKSk7XG4gICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIHZhciBNYXBJdGVyYXRvciA9IGZ1bmN0aW9uIE1hcEl0ZXJhdG9yKG1hcCwga2luZCkge1xuICAgICAgICAgIHJlcXVpcmVNYXBTbG90KG1hcCwgJ1tbTWFwSXRlcmF0b3JdXScpO1xuICAgICAgICAgIHRoaXMuaGVhZCA9IG1hcC5faGVhZDtcbiAgICAgICAgICB0aGlzLmkgPSB0aGlzLmhlYWQ7XG4gICAgICAgICAgdGhpcy5raW5kID0ga2luZDtcbiAgICAgICAgfTtcblxuICAgICAgICBNYXBJdGVyYXRvci5wcm90b3R5cGUgPSB7XG4gICAgICAgICAgbmV4dDogZnVuY3Rpb24gbmV4dCgpIHtcbiAgICAgICAgICAgIHZhciBpID0gdGhpcy5pLCBraW5kID0gdGhpcy5raW5kLCBoZWFkID0gdGhpcy5oZWFkLCByZXN1bHQ7XG4gICAgICAgICAgICBpZiAodHlwZW9mIHRoaXMuaSA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIHsgdmFsdWU6IHZvaWQgMCwgZG9uZTogdHJ1ZSB9O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgd2hpbGUgKGkuaXNSZW1vdmVkKCkgJiYgaSAhPT0gaGVhZCkge1xuICAgICAgICAgICAgICAvLyBiYWNrIHVwIG9mZiBvZiByZW1vdmVkIGVudHJpZXNcbiAgICAgICAgICAgICAgaSA9IGkucHJldjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIGFkdmFuY2UgdG8gbmV4dCB1bnJldHVybmVkIGVsZW1lbnQuXG4gICAgICAgICAgICB3aGlsZSAoaS5uZXh0ICE9PSBoZWFkKSB7XG4gICAgICAgICAgICAgIGkgPSBpLm5leHQ7XG4gICAgICAgICAgICAgIGlmICghaS5pc1JlbW92ZWQoKSkge1xuICAgICAgICAgICAgICAgIGlmIChraW5kID09PSAna2V5Jykge1xuICAgICAgICAgICAgICAgICAgcmVzdWx0ID0gaS5rZXk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChraW5kID09PSAndmFsdWUnKSB7XG4gICAgICAgICAgICAgICAgICByZXN1bHQgPSBpLnZhbHVlO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICByZXN1bHQgPSBbaS5rZXksIGkudmFsdWVdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB0aGlzLmkgPSBpO1xuICAgICAgICAgICAgICAgIHJldHVybiB7IHZhbHVlOiByZXN1bHQsIGRvbmU6IGZhbHNlIH07XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIG9uY2UgdGhlIGl0ZXJhdG9yIGlzIGRvbmUsIGl0IGlzIGRvbmUgZm9yZXZlci5cbiAgICAgICAgICAgIHRoaXMuaSA9IHZvaWQgMDtcbiAgICAgICAgICAgIHJldHVybiB7IHZhbHVlOiB2b2lkIDAsIGRvbmU6IHRydWUgfTtcbiAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICAgIGFkZEl0ZXJhdG9yKE1hcEl0ZXJhdG9yLnByb3RvdHlwZSk7XG5cbiAgICAgICAgdmFyIE1hcCRwcm90b3R5cGU7XG4gICAgICAgIHZhciBNYXBTaGltID0gZnVuY3Rpb24gTWFwKCkge1xuICAgICAgICAgIGlmICghKHRoaXMgaW5zdGFuY2VvZiBNYXApKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdDb25zdHJ1Y3RvciBNYXAgcmVxdWlyZXMgXCJuZXdcIicpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAodGhpcyAmJiB0aGlzLl9lczZtYXApIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0JhZCBjb25zdHJ1Y3Rpb24nKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgdmFyIG1hcCA9IGVtdWxhdGVFUzZjb25zdHJ1Y3QodGhpcywgTWFwLCBNYXAkcHJvdG90eXBlLCB7XG4gICAgICAgICAgICBfZXM2bWFwOiB0cnVlLFxuICAgICAgICAgICAgX2hlYWQ6IG51bGwsXG4gICAgICAgICAgICBfc3RvcmFnZTogZW1wdHlPYmplY3QoKSxcbiAgICAgICAgICAgIF9zaXplOiAwXG4gICAgICAgICAgfSk7XG5cbiAgICAgICAgICB2YXIgaGVhZCA9IG5ldyBNYXBFbnRyeShudWxsLCBudWxsKTtcbiAgICAgICAgICAvLyBjaXJjdWxhciBkb3VibHktbGlua2VkIGxpc3QuXG4gICAgICAgICAgaGVhZC5uZXh0ID0gaGVhZC5wcmV2ID0gaGVhZDtcbiAgICAgICAgICBtYXAuX2hlYWQgPSBoZWFkO1xuXG4gICAgICAgICAgLy8gT3B0aW9uYWxseSBpbml0aWFsaXplIG1hcCBmcm9tIGl0ZXJhYmxlXG4gICAgICAgICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBhZGRJdGVyYWJsZVRvTWFwKE1hcCwgbWFwLCBhcmd1bWVudHNbMF0pO1xuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4gbWFwO1xuICAgICAgICB9O1xuICAgICAgICBNYXAkcHJvdG90eXBlID0gTWFwU2hpbS5wcm90b3R5cGU7XG5cbiAgICAgICAgVmFsdWUuZ2V0dGVyKE1hcCRwcm90b3R5cGUsICdzaXplJywgZnVuY3Rpb24gKCkge1xuICAgICAgICAgIGlmICh0eXBlb2YgdGhpcy5fc2l6ZSA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ3NpemUgbWV0aG9kIGNhbGxlZCBvbiBpbmNvbXBhdGlibGUgTWFwJyk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiB0aGlzLl9zaXplO1xuICAgICAgICB9KTtcblxuICAgICAgICBkZWZpbmVQcm9wZXJ0aWVzKE1hcCRwcm90b3R5cGUsIHtcbiAgICAgICAgICBnZXQ6IGZ1bmN0aW9uIGdldChrZXkpIHtcbiAgICAgICAgICAgIHJlcXVpcmVNYXBTbG90KHRoaXMsICdnZXQnKTtcbiAgICAgICAgICAgIHZhciBma2V5ID0gZmFzdGtleShrZXkpO1xuICAgICAgICAgICAgaWYgKGZrZXkgIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgLy8gZmFzdCBPKDEpIHBhdGhcbiAgICAgICAgICAgICAgdmFyIGVudHJ5ID0gdGhpcy5fc3RvcmFnZVtma2V5XTtcbiAgICAgICAgICAgICAgaWYgKGVudHJ5KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGVudHJ5LnZhbHVlO1xuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyIGhlYWQgPSB0aGlzLl9oZWFkLCBpID0gaGVhZDtcbiAgICAgICAgICAgIHdoaWxlICgoaSA9IGkubmV4dCkgIT09IGhlYWQpIHtcbiAgICAgICAgICAgICAgaWYgKEVTLlNhbWVWYWx1ZVplcm8oaS5rZXksIGtleSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gaS52YWx1ZTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH0sXG5cbiAgICAgICAgICBoYXM6IGZ1bmN0aW9uIGhhcyhrZXkpIHtcbiAgICAgICAgICAgIHJlcXVpcmVNYXBTbG90KHRoaXMsICdoYXMnKTtcbiAgICAgICAgICAgIHZhciBma2V5ID0gZmFzdGtleShrZXkpO1xuICAgICAgICAgICAgaWYgKGZrZXkgIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgLy8gZmFzdCBPKDEpIHBhdGhcbiAgICAgICAgICAgICAgcmV0dXJuIHR5cGVvZiB0aGlzLl9zdG9yYWdlW2ZrZXldICE9PSAndW5kZWZpbmVkJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhciBoZWFkID0gdGhpcy5faGVhZCwgaSA9IGhlYWQ7XG4gICAgICAgICAgICB3aGlsZSAoKGkgPSBpLm5leHQpICE9PSBoZWFkKSB7XG4gICAgICAgICAgICAgIGlmIChFUy5TYW1lVmFsdWVaZXJvKGkua2V5LCBrZXkpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICB9LFxuXG4gICAgICAgICAgc2V0OiBmdW5jdGlvbiBzZXQoa2V5LCB2YWx1ZSkge1xuICAgICAgICAgICAgcmVxdWlyZU1hcFNsb3QodGhpcywgJ3NldCcpO1xuICAgICAgICAgICAgdmFyIGhlYWQgPSB0aGlzLl9oZWFkLCBpID0gaGVhZCwgZW50cnk7XG4gICAgICAgICAgICB2YXIgZmtleSA9IGZhc3RrZXkoa2V5KTtcbiAgICAgICAgICAgIGlmIChma2V5ICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgIC8vIGZhc3QgTygxKSBwYXRoXG4gICAgICAgICAgICAgIGlmICh0eXBlb2YgdGhpcy5fc3RvcmFnZVtma2V5XSAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9zdG9yYWdlW2ZrZXldLnZhbHVlID0gdmFsdWU7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgZW50cnkgPSB0aGlzLl9zdG9yYWdlW2ZrZXldID0gbmV3IE1hcEVudHJ5KGtleSwgdmFsdWUpO1xuICAgICAgICAgICAgICAgIGkgPSBoZWFkLnByZXY7XG4gICAgICAgICAgICAgICAgLy8gZmFsbCB0aHJvdWdoXG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHdoaWxlICgoaSA9IGkubmV4dCkgIT09IGhlYWQpIHtcbiAgICAgICAgICAgICAgaWYgKEVTLlNhbWVWYWx1ZVplcm8oaS5rZXksIGtleSkpIHtcbiAgICAgICAgICAgICAgICBpLnZhbHVlID0gdmFsdWU7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVudHJ5ID0gZW50cnkgfHwgbmV3IE1hcEVudHJ5KGtleSwgdmFsdWUpO1xuICAgICAgICAgICAgaWYgKEVTLlNhbWVWYWx1ZSgtMCwga2V5KSkge1xuICAgICAgICAgICAgICBlbnRyeS5rZXkgPSArMDsgLy8gY29lcmNlIC0wIHRvICswIGluIGVudHJ5XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbnRyeS5uZXh0ID0gdGhpcy5faGVhZDtcbiAgICAgICAgICAgIGVudHJ5LnByZXYgPSB0aGlzLl9oZWFkLnByZXY7XG4gICAgICAgICAgICBlbnRyeS5wcmV2Lm5leHQgPSBlbnRyeTtcbiAgICAgICAgICAgIGVudHJ5Lm5leHQucHJldiA9IGVudHJ5O1xuICAgICAgICAgICAgdGhpcy5fc2l6ZSArPSAxO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgICAgfSxcblxuICAgICAgICAgICdkZWxldGUnOiBmdW5jdGlvbiAoa2V5KSB7XG4gICAgICAgICAgICByZXF1aXJlTWFwU2xvdCh0aGlzLCAnZGVsZXRlJyk7XG4gICAgICAgICAgICB2YXIgaGVhZCA9IHRoaXMuX2hlYWQsIGkgPSBoZWFkO1xuICAgICAgICAgICAgdmFyIGZrZXkgPSBmYXN0a2V5KGtleSk7XG4gICAgICAgICAgICBpZiAoZmtleSAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICAvLyBmYXN0IE8oMSkgcGF0aFxuICAgICAgICAgICAgICBpZiAodHlwZW9mIHRoaXMuX3N0b3JhZ2VbZmtleV0gPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGkgPSB0aGlzLl9zdG9yYWdlW2ZrZXldLnByZXY7XG4gICAgICAgICAgICAgIGRlbGV0ZSB0aGlzLl9zdG9yYWdlW2ZrZXldO1xuICAgICAgICAgICAgICAvLyBmYWxsIHRocm91Z2hcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHdoaWxlICgoaSA9IGkubmV4dCkgIT09IGhlYWQpIHtcbiAgICAgICAgICAgICAgaWYgKEVTLlNhbWVWYWx1ZVplcm8oaS5rZXksIGtleSkpIHtcbiAgICAgICAgICAgICAgICBpLmtleSA9IGkudmFsdWUgPSBlbXB0eTtcbiAgICAgICAgICAgICAgICBpLnByZXYubmV4dCA9IGkubmV4dDtcbiAgICAgICAgICAgICAgICBpLm5leHQucHJldiA9IGkucHJldjtcbiAgICAgICAgICAgICAgICB0aGlzLl9zaXplIC09IDE7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICB9LFxuXG4gICAgICAgICAgY2xlYXI6IGZ1bmN0aW9uIGNsZWFyKCkge1xuICAgICAgICAgICAgcmVxdWlyZU1hcFNsb3QodGhpcywgJ2NsZWFyJyk7XG4gICAgICAgICAgICB0aGlzLl9zaXplID0gMDtcbiAgICAgICAgICAgIHRoaXMuX3N0b3JhZ2UgPSBlbXB0eU9iamVjdCgpO1xuICAgICAgICAgICAgdmFyIGhlYWQgPSB0aGlzLl9oZWFkLCBpID0gaGVhZCwgcCA9IGkubmV4dDtcbiAgICAgICAgICAgIHdoaWxlICgoaSA9IHApICE9PSBoZWFkKSB7XG4gICAgICAgICAgICAgIGkua2V5ID0gaS52YWx1ZSA9IGVtcHR5O1xuICAgICAgICAgICAgICBwID0gaS5uZXh0O1xuICAgICAgICAgICAgICBpLm5leHQgPSBpLnByZXYgPSBoZWFkO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaGVhZC5uZXh0ID0gaGVhZC5wcmV2ID0gaGVhZDtcbiAgICAgICAgICB9LFxuXG4gICAgICAgICAga2V5czogZnVuY3Rpb24ga2V5cygpIHtcbiAgICAgICAgICAgIHJlcXVpcmVNYXBTbG90KHRoaXMsICdrZXlzJyk7XG4gICAgICAgICAgICByZXR1cm4gbmV3IE1hcEl0ZXJhdG9yKHRoaXMsICdrZXknKTtcbiAgICAgICAgICB9LFxuXG4gICAgICAgICAgdmFsdWVzOiBmdW5jdGlvbiB2YWx1ZXMoKSB7XG4gICAgICAgICAgICByZXF1aXJlTWFwU2xvdCh0aGlzLCAndmFsdWVzJyk7XG4gICAgICAgICAgICByZXR1cm4gbmV3IE1hcEl0ZXJhdG9yKHRoaXMsICd2YWx1ZScpO1xuICAgICAgICAgIH0sXG5cbiAgICAgICAgICBlbnRyaWVzOiBmdW5jdGlvbiBlbnRyaWVzKCkge1xuICAgICAgICAgICAgcmVxdWlyZU1hcFNsb3QodGhpcywgJ2VudHJpZXMnKTtcbiAgICAgICAgICAgIHJldHVybiBuZXcgTWFwSXRlcmF0b3IodGhpcywgJ2tleSt2YWx1ZScpO1xuICAgICAgICAgIH0sXG5cbiAgICAgICAgICBmb3JFYWNoOiBmdW5jdGlvbiBmb3JFYWNoKGNhbGxiYWNrKSB7XG4gICAgICAgICAgICByZXF1aXJlTWFwU2xvdCh0aGlzLCAnZm9yRWFjaCcpO1xuICAgICAgICAgICAgdmFyIGNvbnRleHQgPSBhcmd1bWVudHMubGVuZ3RoID4gMSA/IGFyZ3VtZW50c1sxXSA6IG51bGw7XG4gICAgICAgICAgICB2YXIgaXQgPSB0aGlzLmVudHJpZXMoKTtcbiAgICAgICAgICAgIGZvciAodmFyIGVudHJ5ID0gaXQubmV4dCgpOyAhZW50cnkuZG9uZTsgZW50cnkgPSBpdC5uZXh0KCkpIHtcbiAgICAgICAgICAgICAgaWYgKGNvbnRleHQpIHtcbiAgICAgICAgICAgICAgICBfY2FsbChjYWxsYmFjaywgY29udGV4dCwgZW50cnkudmFsdWVbMV0sIGVudHJ5LnZhbHVlWzBdLCB0aGlzKTtcbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhlbnRyeS52YWx1ZVsxXSwgZW50cnkudmFsdWVbMF0sIHRoaXMpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgYWRkSXRlcmF0b3IoTWFwJHByb3RvdHlwZSwgTWFwJHByb3RvdHlwZS5lbnRyaWVzKTtcblxuICAgICAgICByZXR1cm4gTWFwU2hpbTtcbiAgICAgIH0oKSksXG5cbiAgICAgIFNldDogKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIGlzU2V0ID0gZnVuY3Rpb24gaXNTZXQoc2V0KSB7XG4gICAgICAgICAgcmV0dXJuIHNldC5fZXM2c2V0ICYmIHR5cGVvZiBzZXQuX3N0b3JhZ2UgIT09ICd1bmRlZmluZWQnO1xuICAgICAgICB9O1xuICAgICAgICB2YXIgcmVxdWlyZVNldFNsb3QgPSBmdW5jdGlvbiByZXF1aXJlU2V0U2xvdChzZXQsIG1ldGhvZCkge1xuICAgICAgICAgIGlmICghRVMuVHlwZUlzT2JqZWN0KHNldCkgfHwgIWlzU2V0KHNldCkpIHtcbiAgICAgICAgICAgIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS9wYXVsbWlsbHIvZXM2LXNoaW0vaXNzdWVzLzE3NlxuICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignU2V0LnByb3RvdHlwZS4nICsgbWV0aG9kICsgJyBjYWxsZWQgb24gaW5jb21wYXRpYmxlIHJlY2VpdmVyICcgKyBFUy5Ub1N0cmluZyhzZXQpKTtcbiAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gQ3JlYXRpbmcgYSBNYXAgaXMgZXhwZW5zaXZlLiAgVG8gc3BlZWQgdXAgdGhlIGNvbW1vbiBjYXNlIG9mXG4gICAgICAgIC8vIFNldHMgY29udGFpbmluZyBvbmx5IHN0cmluZyBvciBudW1lcmljIGtleXMsIHdlIHVzZSBhbiBvYmplY3RcbiAgICAgICAgLy8gYXMgYmFja2luZyBzdG9yYWdlIGFuZCBsYXppbHkgY3JlYXRlIGEgZnVsbCBNYXAgb25seSB3aGVuXG4gICAgICAgIC8vIHJlcXVpcmVkLlxuICAgICAgICB2YXIgU2V0JHByb3RvdHlwZTtcbiAgICAgICAgdmFyIFNldFNoaW0gPSBmdW5jdGlvbiBTZXQoKSB7XG4gICAgICAgICAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIFNldCkpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0NvbnN0cnVjdG9yIFNldCByZXF1aXJlcyBcIm5ld1wiJyk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmICh0aGlzICYmIHRoaXMuX2VzNnNldCkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignQmFkIGNvbnN0cnVjdGlvbicpO1xuICAgICAgICAgIH1cbiAgICAgICAgICB2YXIgc2V0ID0gZW11bGF0ZUVTNmNvbnN0cnVjdCh0aGlzLCBTZXQsIFNldCRwcm90b3R5cGUsIHtcbiAgICAgICAgICAgIF9lczZzZXQ6IHRydWUsXG4gICAgICAgICAgICAnW1tTZXREYXRhXV0nOiBudWxsLFxuICAgICAgICAgICAgX3N0b3JhZ2U6IGVtcHR5T2JqZWN0KClcbiAgICAgICAgICB9KTtcbiAgICAgICAgICBpZiAoIXNldC5fZXM2c2V0KSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdiYWQgc2V0Jyk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgLy8gT3B0aW9uYWxseSBpbml0aWFsaXplIFNldCBmcm9tIGl0ZXJhYmxlXG4gICAgICAgICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBhZGRJdGVyYWJsZVRvU2V0KFNldCwgc2V0LCBhcmd1bWVudHNbMF0pO1xuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4gc2V0O1xuICAgICAgICB9O1xuICAgICAgICBTZXQkcHJvdG90eXBlID0gU2V0U2hpbS5wcm90b3R5cGU7XG5cbiAgICAgICAgdmFyIGRlY29kZUtleSA9IGZ1bmN0aW9uIChrZXkpIHtcbiAgICAgICAgICB2YXIgayA9IGtleTtcbiAgICAgICAgICBpZiAoayA9PT0gJ15udWxsJykge1xuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgfSBlbHNlIGlmIChrID09PSAnXnVuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIHJldHVybiB2b2lkIDA7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHZhciBmaXJzdCA9IGsuY2hhckF0KDApO1xuICAgICAgICAgICAgaWYgKGZpcnN0ID09PSAnJCcpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIF9zdHJTbGljZShrLCAxKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoZmlyc3QgPT09ICduJykge1xuICAgICAgICAgICAgICByZXR1cm4gK19zdHJTbGljZShrLCAxKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoZmlyc3QgPT09ICdiJykge1xuICAgICAgICAgICAgICByZXR1cm4gayA9PT0gJ2J0cnVlJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuICtrO1xuICAgICAgICB9O1xuICAgICAgICAvLyBTd2l0Y2ggZnJvbSB0aGUgb2JqZWN0IGJhY2tpbmcgc3RvcmFnZSB0byBhIGZ1bGwgTWFwLlxuICAgICAgICB2YXIgZW5zdXJlTWFwID0gZnVuY3Rpb24gZW5zdXJlTWFwKHNldCkge1xuICAgICAgICAgIGlmICghc2V0WydbW1NldERhdGFdXSddKSB7XG4gICAgICAgICAgICB2YXIgbSA9IHNldFsnW1tTZXREYXRhXV0nXSA9IG5ldyBjb2xsZWN0aW9uU2hpbXMuTWFwKCk7XG4gICAgICAgICAgICBfZm9yRWFjaChrZXlzKHNldC5fc3RvcmFnZSksIGZ1bmN0aW9uIChrZXkpIHtcbiAgICAgICAgICAgICAgdmFyIGsgPSBkZWNvZGVLZXkoa2V5KTtcbiAgICAgICAgICAgICAgbS5zZXQoaywgayk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHNldFsnW1tTZXREYXRhXV0nXSA9IG07XG4gICAgICAgICAgfVxuICAgICAgICAgIHNldC5fc3RvcmFnZSA9IG51bGw7IC8vIGZyZWUgb2xkIGJhY2tpbmcgc3RvcmFnZVxuICAgICAgICB9O1xuXG4gICAgICAgIFZhbHVlLmdldHRlcihTZXRTaGltLnByb3RvdHlwZSwgJ3NpemUnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgcmVxdWlyZVNldFNsb3QodGhpcywgJ3NpemUnKTtcbiAgICAgICAgICBpZiAodGhpcy5fc3RvcmFnZSkge1xuICAgICAgICAgICAgcmV0dXJuIGtleXModGhpcy5fc3RvcmFnZSkubGVuZ3RoO1xuICAgICAgICAgIH1cbiAgICAgICAgICBlbnN1cmVNYXAodGhpcyk7XG4gICAgICAgICAgcmV0dXJuIHRoaXNbJ1tbU2V0RGF0YV1dJ10uc2l6ZTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgZGVmaW5lUHJvcGVydGllcyhTZXRTaGltLnByb3RvdHlwZSwge1xuICAgICAgICAgIGhhczogZnVuY3Rpb24gaGFzKGtleSkge1xuICAgICAgICAgICAgcmVxdWlyZVNldFNsb3QodGhpcywgJ2hhcycpO1xuICAgICAgICAgICAgdmFyIGZrZXk7XG4gICAgICAgICAgICBpZiAodGhpcy5fc3RvcmFnZSAmJiAoZmtleSA9IGZhc3RrZXkoa2V5KSkgIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgcmV0dXJuICEhdGhpcy5fc3RvcmFnZVtma2V5XTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVuc3VyZU1hcCh0aGlzKTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzWydbW1NldERhdGFdXSddLmhhcyhrZXkpO1xuICAgICAgICAgIH0sXG5cbiAgICAgICAgICBhZGQ6IGZ1bmN0aW9uIGFkZChrZXkpIHtcbiAgICAgICAgICAgIHJlcXVpcmVTZXRTbG90KHRoaXMsICdhZGQnKTtcbiAgICAgICAgICAgIHZhciBma2V5O1xuICAgICAgICAgICAgaWYgKHRoaXMuX3N0b3JhZ2UgJiYgKGZrZXkgPSBmYXN0a2V5KGtleSkpICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgIHRoaXMuX3N0b3JhZ2VbZmtleV0gPSB0cnVlO1xuICAgICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVuc3VyZU1hcCh0aGlzKTtcbiAgICAgICAgICAgIHRoaXNbJ1tbU2V0RGF0YV1dJ10uc2V0KGtleSwga2V5KTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICAgIH0sXG5cbiAgICAgICAgICAnZGVsZXRlJzogZnVuY3Rpb24gKGtleSkge1xuICAgICAgICAgICAgcmVxdWlyZVNldFNsb3QodGhpcywgJ2RlbGV0ZScpO1xuICAgICAgICAgICAgdmFyIGZrZXk7XG4gICAgICAgICAgICBpZiAodGhpcy5fc3RvcmFnZSAmJiAoZmtleSA9IGZhc3RrZXkoa2V5KSkgIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgdmFyIGhhc0ZLZXkgPSBfaGFzT3duUHJvcGVydHkodGhpcy5fc3RvcmFnZSwgZmtleSk7XG4gICAgICAgICAgICAgIHJldHVybiAoZGVsZXRlIHRoaXMuX3N0b3JhZ2VbZmtleV0pICYmIGhhc0ZLZXk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbnN1cmVNYXAodGhpcyk7XG4gICAgICAgICAgICByZXR1cm4gdGhpc1snW1tTZXREYXRhXV0nXVsnZGVsZXRlJ10oa2V5KTtcbiAgICAgICAgICB9LFxuXG4gICAgICAgICAgY2xlYXI6IGZ1bmN0aW9uIGNsZWFyKCkge1xuICAgICAgICAgICAgcmVxdWlyZVNldFNsb3QodGhpcywgJ2NsZWFyJyk7XG4gICAgICAgICAgICBpZiAodGhpcy5fc3RvcmFnZSkge1xuICAgICAgICAgICAgICB0aGlzLl9zdG9yYWdlID0gZW1wdHlPYmplY3QoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh0aGlzWydbW1NldERhdGFdXSddKSB7XG4gICAgICAgICAgICAgIHRoaXNbJ1tbU2V0RGF0YV1dJ10uY2xlYXIoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9LFxuXG4gICAgICAgICAgdmFsdWVzOiBmdW5jdGlvbiB2YWx1ZXMoKSB7XG4gICAgICAgICAgICByZXF1aXJlU2V0U2xvdCh0aGlzLCAndmFsdWVzJyk7XG4gICAgICAgICAgICBlbnN1cmVNYXAodGhpcyk7XG4gICAgICAgICAgICByZXR1cm4gdGhpc1snW1tTZXREYXRhXV0nXS52YWx1ZXMoKTtcbiAgICAgICAgICB9LFxuXG4gICAgICAgICAgZW50cmllczogZnVuY3Rpb24gZW50cmllcygpIHtcbiAgICAgICAgICAgIHJlcXVpcmVTZXRTbG90KHRoaXMsICdlbnRyaWVzJyk7XG4gICAgICAgICAgICBlbnN1cmVNYXAodGhpcyk7XG4gICAgICAgICAgICByZXR1cm4gdGhpc1snW1tTZXREYXRhXV0nXS5lbnRyaWVzKCk7XG4gICAgICAgICAgfSxcblxuICAgICAgICAgIGZvckVhY2g6IGZ1bmN0aW9uIGZvckVhY2goY2FsbGJhY2spIHtcbiAgICAgICAgICAgIHJlcXVpcmVTZXRTbG90KHRoaXMsICdmb3JFYWNoJyk7XG4gICAgICAgICAgICB2YXIgY29udGV4dCA9IGFyZ3VtZW50cy5sZW5ndGggPiAxID8gYXJndW1lbnRzWzFdIDogbnVsbDtcbiAgICAgICAgICAgIHZhciBlbnRpcmVTZXQgPSB0aGlzO1xuICAgICAgICAgICAgZW5zdXJlTWFwKGVudGlyZVNldCk7XG4gICAgICAgICAgICB0aGlzWydbW1NldERhdGFdXSddLmZvckVhY2goZnVuY3Rpb24gKHZhbHVlLCBrZXkpIHtcbiAgICAgICAgICAgICAgaWYgKGNvbnRleHQpIHtcbiAgICAgICAgICAgICAgICBfY2FsbChjYWxsYmFjaywgY29udGV4dCwga2V5LCBrZXksIGVudGlyZVNldCk7XG4gICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soa2V5LCBrZXksIGVudGlyZVNldCk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIGRlZmluZVByb3BlcnR5KFNldFNoaW0ucHJvdG90eXBlLCAna2V5cycsIFNldFNoaW0ucHJvdG90eXBlLnZhbHVlcywgdHJ1ZSk7XG4gICAgICAgIGFkZEl0ZXJhdG9yKFNldFNoaW0ucHJvdG90eXBlLCBTZXRTaGltLnByb3RvdHlwZS52YWx1ZXMpO1xuXG4gICAgICAgIHJldHVybiBTZXRTaGltO1xuICAgICAgfSgpKVxuICAgIH07XG5cbiAgICBpZiAoZ2xvYmFscy5NYXAgfHwgZ2xvYmFscy5TZXQpIHtcbiAgICAgIC8vIFNhZmFyaSA4LCBmb3IgZXhhbXBsZSwgZG9lc24ndCBhY2NlcHQgYW4gaXRlcmFibGUuXG4gICAgICB2YXIgbWFwQWNjZXB0c0FyZ3VtZW50cyA9IHZhbHVlT3JGYWxzZUlmVGhyb3dzKGZ1bmN0aW9uICgpIHsgcmV0dXJuIG5ldyBNYXAoW1sxLCAyXV0pLmdldCgxKSA9PT0gMjsgfSk7XG4gICAgICBpZiAoIW1hcEFjY2VwdHNBcmd1bWVudHMpIHtcbiAgICAgICAgdmFyIE9yaWdNYXBOb0FyZ3MgPSBnbG9iYWxzLk1hcDtcbiAgICAgICAgZ2xvYmFscy5NYXAgPSBmdW5jdGlvbiBNYXAoKSB7XG4gICAgICAgICAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIE1hcCkpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0NvbnN0cnVjdG9yIE1hcCByZXF1aXJlcyBcIm5ld1wiJyk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHZhciBtID0gbmV3IE9yaWdNYXBOb0FyZ3MoKTtcbiAgICAgICAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGFkZEl0ZXJhYmxlVG9NYXAoTWFwLCBtLCBhcmd1bWVudHNbMF0pO1xuICAgICAgICAgIH1cbiAgICAgICAgICBkZWxldGUgbS5jb25zdHJ1Y3RvcjtcbiAgICAgICAgICBPYmplY3Quc2V0UHJvdG90eXBlT2YobSwgZ2xvYmFscy5NYXAucHJvdG90eXBlKTtcbiAgICAgICAgICByZXR1cm4gbTtcbiAgICAgICAgfTtcbiAgICAgICAgZ2xvYmFscy5NYXAucHJvdG90eXBlID0gY3JlYXRlKE9yaWdNYXBOb0FyZ3MucHJvdG90eXBlKTtcbiAgICAgICAgZGVmaW5lUHJvcGVydHkoZ2xvYmFscy5NYXAucHJvdG90eXBlLCAnY29uc3RydWN0b3InLCBnbG9iYWxzLk1hcCwgdHJ1ZSk7XG4gICAgICAgIFZhbHVlLnByZXNlcnZlVG9TdHJpbmcoZ2xvYmFscy5NYXAsIE9yaWdNYXBOb0FyZ3MpO1xuICAgICAgfVxuICAgICAgdmFyIHRlc3RNYXAgPSBuZXcgTWFwKCk7XG4gICAgICB2YXIgbWFwVXNlc1NhbWVWYWx1ZVplcm8gPSAoZnVuY3Rpb24gKCkge1xuICAgICAgICAvLyBDaHJvbWUgMzgtNDIsIG5vZGUgMC4xMS8wLjEyLCBpb2pzIDEvMiBhbHNvIGhhdmUgYSBidWcgd2hlbiB0aGUgTWFwIGhhcyBhIHNpemUgPiA0XG4gICAgICAgIHZhciBtID0gbmV3IE1hcChbWzEsIDBdLCBbMiwgMF0sIFszLCAwXSwgWzQsIDBdXSk7XG4gICAgICAgIG0uc2V0KC0wLCBtKTtcbiAgICAgICAgcmV0dXJuIG0uZ2V0KDApID09PSBtICYmIG0uZ2V0KC0wKSA9PT0gbSAmJiBtLmhhcygwKSAmJiBtLmhhcygtMCk7XG4gICAgICB9KCkpO1xuICAgICAgdmFyIG1hcFN1cHBvcnRzQ2hhaW5pbmcgPSB0ZXN0TWFwLnNldCgxLCAyKSA9PT0gdGVzdE1hcDtcbiAgICAgIGlmICghbWFwVXNlc1NhbWVWYWx1ZVplcm8gfHwgIW1hcFN1cHBvcnRzQ2hhaW5pbmcpIHtcbiAgICAgICAgdmFyIG9yaWdNYXBTZXQgPSBNYXAucHJvdG90eXBlLnNldDtcbiAgICAgICAgb3ZlcnJpZGVOYXRpdmUoTWFwLnByb3RvdHlwZSwgJ3NldCcsIGZ1bmN0aW9uIHNldChrLCB2KSB7XG4gICAgICAgICAgX2NhbGwob3JpZ01hcFNldCwgdGhpcywgayA9PT0gMCA/IDAgOiBrLCB2KTtcbiAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgICBpZiAoIW1hcFVzZXNTYW1lVmFsdWVaZXJvKSB7XG4gICAgICAgIHZhciBvcmlnTWFwR2V0ID0gTWFwLnByb3RvdHlwZS5nZXQ7XG4gICAgICAgIHZhciBvcmlnTWFwSGFzID0gTWFwLnByb3RvdHlwZS5oYXM7XG4gICAgICAgIGRlZmluZVByb3BlcnRpZXMoTWFwLnByb3RvdHlwZSwge1xuICAgICAgICAgIGdldDogZnVuY3Rpb24gZ2V0KGspIHtcbiAgICAgICAgICAgIHJldHVybiBfY2FsbChvcmlnTWFwR2V0LCB0aGlzLCBrID09PSAwID8gMCA6IGspO1xuICAgICAgICAgIH0sXG4gICAgICAgICAgaGFzOiBmdW5jdGlvbiBoYXMoaykge1xuICAgICAgICAgICAgcmV0dXJuIF9jYWxsKG9yaWdNYXBIYXMsIHRoaXMsIGsgPT09IDAgPyAwIDogayk7XG4gICAgICAgICAgfVxuICAgICAgICB9LCB0cnVlKTtcbiAgICAgICAgVmFsdWUucHJlc2VydmVUb1N0cmluZyhNYXAucHJvdG90eXBlLmdldCwgb3JpZ01hcEdldCk7XG4gICAgICAgIFZhbHVlLnByZXNlcnZlVG9TdHJpbmcoTWFwLnByb3RvdHlwZS5oYXMsIG9yaWdNYXBIYXMpO1xuICAgICAgfVxuICAgICAgdmFyIHRlc3RTZXQgPSBuZXcgU2V0KCk7XG4gICAgICB2YXIgc2V0VXNlc1NhbWVWYWx1ZVplcm8gPSAoZnVuY3Rpb24gKHMpIHtcbiAgICAgICAgc1snZGVsZXRlJ10oMCk7XG4gICAgICAgIHMuYWRkKC0wKTtcbiAgICAgICAgcmV0dXJuICFzLmhhcygwKTtcbiAgICAgIH0odGVzdFNldCkpO1xuICAgICAgdmFyIHNldFN1cHBvcnRzQ2hhaW5pbmcgPSB0ZXN0U2V0LmFkZCgxKSA9PT0gdGVzdFNldDtcbiAgICAgIGlmICghc2V0VXNlc1NhbWVWYWx1ZVplcm8gfHwgIXNldFN1cHBvcnRzQ2hhaW5pbmcpIHtcbiAgICAgICAgdmFyIG9yaWdTZXRBZGQgPSBTZXQucHJvdG90eXBlLmFkZDtcbiAgICAgICAgU2V0LnByb3RvdHlwZS5hZGQgPSBmdW5jdGlvbiBhZGQodikge1xuICAgICAgICAgIF9jYWxsKG9yaWdTZXRBZGQsIHRoaXMsIHYgPT09IDAgPyAwIDogdik7XG4gICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH07XG4gICAgICAgIFZhbHVlLnByZXNlcnZlVG9TdHJpbmcoU2V0LnByb3RvdHlwZS5hZGQsIG9yaWdTZXRBZGQpO1xuICAgICAgfVxuICAgICAgaWYgKCFzZXRVc2VzU2FtZVZhbHVlWmVybykge1xuICAgICAgICB2YXIgb3JpZ1NldEhhcyA9IFNldC5wcm90b3R5cGUuaGFzO1xuICAgICAgICBTZXQucHJvdG90eXBlLmhhcyA9IGZ1bmN0aW9uIGhhcyh2KSB7XG4gICAgICAgICAgcmV0dXJuIF9jYWxsKG9yaWdTZXRIYXMsIHRoaXMsIHYgPT09IDAgPyAwIDogdik7XG4gICAgICAgIH07XG4gICAgICAgIFZhbHVlLnByZXNlcnZlVG9TdHJpbmcoU2V0LnByb3RvdHlwZS5oYXMsIG9yaWdTZXRIYXMpO1xuICAgICAgICB2YXIgb3JpZ1NldERlbCA9IFNldC5wcm90b3R5cGVbJ2RlbGV0ZSddO1xuICAgICAgICBTZXQucHJvdG90eXBlWydkZWxldGUnXSA9IGZ1bmN0aW9uIFNldERlbGV0ZSh2KSB7XG4gICAgICAgICAgcmV0dXJuIF9jYWxsKG9yaWdTZXREZWwsIHRoaXMsIHYgPT09IDAgPyAwIDogdik7XG4gICAgICAgIH07XG4gICAgICAgIFZhbHVlLnByZXNlcnZlVG9TdHJpbmcoU2V0LnByb3RvdHlwZVsnZGVsZXRlJ10sIG9yaWdTZXREZWwpO1xuICAgICAgfVxuICAgICAgdmFyIG1hcFN1cHBvcnRzU3ViY2xhc3NpbmcgPSBzdXBwb3J0c1N1YmNsYXNzaW5nKGdsb2JhbHMuTWFwLCBmdW5jdGlvbiAoTSkge1xuICAgICAgICB2YXIgbSA9IG5ldyBNKFtdKTtcbiAgICAgICAgLy8gRmlyZWZveCAzMiBpcyBvayB3aXRoIHRoZSBpbnN0YW50aWF0aW5nIHRoZSBzdWJjbGFzcyBidXQgd2lsbFxuICAgICAgICAvLyB0aHJvdyB3aGVuIHRoZSBtYXAgaXMgdXNlZC5cbiAgICAgICAgbS5zZXQoNDIsIDQyKTtcbiAgICAgICAgcmV0dXJuIG0gaW5zdGFuY2VvZiBNO1xuICAgICAgfSk7XG4gICAgICB2YXIgbWFwRmFpbHNUb1N1cHBvcnRTdWJjbGFzc2luZyA9IE9iamVjdC5zZXRQcm90b3R5cGVPZiAmJiAhbWFwU3VwcG9ydHNTdWJjbGFzc2luZzsgLy8gd2l0aG91dCBPYmplY3Quc2V0UHJvdG90eXBlT2YsIHN1YmNsYXNzaW5nIGlzIG5vdCBwb3NzaWJsZVxuICAgICAgdmFyIG1hcFJlcXVpcmVzTmV3ID0gKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICByZXR1cm4gIShnbG9iYWxzLk1hcCgpIGluc3RhbmNlb2YgZ2xvYmFscy5NYXApO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgcmV0dXJuIGUgaW5zdGFuY2VvZiBUeXBlRXJyb3I7XG4gICAgICAgIH1cbiAgICAgIH0oKSk7XG4gICAgICBpZiAoZ2xvYmFscy5NYXAubGVuZ3RoICE9PSAwIHx8IG1hcEZhaWxzVG9TdXBwb3J0U3ViY2xhc3NpbmcgfHwgIW1hcFJlcXVpcmVzTmV3KSB7XG4gICAgICAgIHZhciBPcmlnTWFwID0gZ2xvYmFscy5NYXA7XG4gICAgICAgIGdsb2JhbHMuTWFwID0gZnVuY3Rpb24gTWFwKCkge1xuICAgICAgICAgIGlmICghKHRoaXMgaW5zdGFuY2VvZiBNYXApKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdDb25zdHJ1Y3RvciBNYXAgcmVxdWlyZXMgXCJuZXdcIicpO1xuICAgICAgICAgIH1cbiAgICAgICAgICB2YXIgbSA9IG5ldyBPcmlnTWFwKCk7XG4gICAgICAgICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBhZGRJdGVyYWJsZVRvTWFwKE1hcCwgbSwgYXJndW1lbnRzWzBdKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgZGVsZXRlIG0uY29uc3RydWN0b3I7XG4gICAgICAgICAgT2JqZWN0LnNldFByb3RvdHlwZU9mKG0sIE1hcC5wcm90b3R5cGUpO1xuICAgICAgICAgIHJldHVybiBtO1xuICAgICAgICB9O1xuICAgICAgICBnbG9iYWxzLk1hcC5wcm90b3R5cGUgPSBPcmlnTWFwLnByb3RvdHlwZTtcbiAgICAgICAgZGVmaW5lUHJvcGVydHkoZ2xvYmFscy5NYXAucHJvdG90eXBlLCAnY29uc3RydWN0b3InLCBnbG9iYWxzLk1hcCwgdHJ1ZSk7XG4gICAgICAgIFZhbHVlLnByZXNlcnZlVG9TdHJpbmcoZ2xvYmFscy5NYXAsIE9yaWdNYXApO1xuICAgICAgfVxuICAgICAgdmFyIHNldFN1cHBvcnRzU3ViY2xhc3NpbmcgPSBzdXBwb3J0c1N1YmNsYXNzaW5nKGdsb2JhbHMuU2V0LCBmdW5jdGlvbiAoUykge1xuICAgICAgICB2YXIgcyA9IG5ldyBTKFtdKTtcbiAgICAgICAgcy5hZGQoNDIsIDQyKTtcbiAgICAgICAgcmV0dXJuIHMgaW5zdGFuY2VvZiBTO1xuICAgICAgfSk7XG4gICAgICB2YXIgc2V0RmFpbHNUb1N1cHBvcnRTdWJjbGFzc2luZyA9IE9iamVjdC5zZXRQcm90b3R5cGVPZiAmJiAhc2V0U3VwcG9ydHNTdWJjbGFzc2luZzsgLy8gd2l0aG91dCBPYmplY3Quc2V0UHJvdG90eXBlT2YsIHN1YmNsYXNzaW5nIGlzIG5vdCBwb3NzaWJsZVxuICAgICAgdmFyIHNldFJlcXVpcmVzTmV3ID0gKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICByZXR1cm4gIShnbG9iYWxzLlNldCgpIGluc3RhbmNlb2YgZ2xvYmFscy5TZXQpO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgcmV0dXJuIGUgaW5zdGFuY2VvZiBUeXBlRXJyb3I7XG4gICAgICAgIH1cbiAgICAgIH0oKSk7XG4gICAgICBpZiAoZ2xvYmFscy5TZXQubGVuZ3RoICE9PSAwIHx8IHNldEZhaWxzVG9TdXBwb3J0U3ViY2xhc3NpbmcgfHwgIXNldFJlcXVpcmVzTmV3KSB7XG4gICAgICAgIHZhciBPcmlnU2V0ID0gZ2xvYmFscy5TZXQ7XG4gICAgICAgIGdsb2JhbHMuU2V0ID0gZnVuY3Rpb24gU2V0KCkge1xuICAgICAgICAgIGlmICghKHRoaXMgaW5zdGFuY2VvZiBTZXQpKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdDb25zdHJ1Y3RvciBTZXQgcmVxdWlyZXMgXCJuZXdcIicpO1xuICAgICAgICAgIH1cbiAgICAgICAgICB2YXIgcyA9IG5ldyBPcmlnU2V0KCk7XG4gICAgICAgICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBhZGRJdGVyYWJsZVRvU2V0KFNldCwgcywgYXJndW1lbnRzWzBdKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgZGVsZXRlIHMuY29uc3RydWN0b3I7XG4gICAgICAgICAgT2JqZWN0LnNldFByb3RvdHlwZU9mKHMsIFNldC5wcm90b3R5cGUpO1xuICAgICAgICAgIHJldHVybiBzO1xuICAgICAgICB9O1xuICAgICAgICBnbG9iYWxzLlNldC5wcm90b3R5cGUgPSBPcmlnU2V0LnByb3RvdHlwZTtcbiAgICAgICAgZGVmaW5lUHJvcGVydHkoZ2xvYmFscy5TZXQucHJvdG90eXBlLCAnY29uc3RydWN0b3InLCBnbG9iYWxzLlNldCwgdHJ1ZSk7XG4gICAgICAgIFZhbHVlLnByZXNlcnZlVG9TdHJpbmcoZ2xvYmFscy5TZXQsIE9yaWdTZXQpO1xuICAgICAgfVxuICAgICAgdmFyIG1hcEl0ZXJhdGlvblRocm93c1N0b3BJdGVyYXRvciA9ICF2YWx1ZU9yRmFsc2VJZlRocm93cyhmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiAobmV3IE1hcCgpKS5rZXlzKCkubmV4dCgpLmRvbmU7XG4gICAgICB9KTtcbiAgICAgIC8qXG4gICAgICAgIC0gSW4gRmlyZWZveCA8IDIzLCBNYXAjc2l6ZSBpcyBhIGZ1bmN0aW9uLlxuICAgICAgICAtIEluIGFsbCBjdXJyZW50IEZpcmVmb3gsIFNldCNlbnRyaWVzL2tleXMvdmFsdWVzICYgTWFwI2NsZWFyIGRvIG5vdCBleGlzdFxuICAgICAgICAtIGh0dHBzOi8vYnVnemlsbGEubW96aWxsYS5vcmcvc2hvd19idWcuY2dpP2lkPTg2OTk5NlxuICAgICAgICAtIEluIEZpcmVmb3ggMjQsIE1hcCBhbmQgU2V0IGRvIG5vdCBpbXBsZW1lbnQgZm9yRWFjaFxuICAgICAgICAtIEluIEZpcmVmb3ggMjUgYXQgbGVhc3QsIE1hcCBhbmQgU2V0IGFyZSBjYWxsYWJsZSB3aXRob3V0IFwibmV3XCJcbiAgICAgICovXG4gICAgICBpZiAoXG4gICAgICAgIHR5cGVvZiBnbG9iYWxzLk1hcC5wcm90b3R5cGUuY2xlYXIgIT09ICdmdW5jdGlvbicgfHxcbiAgICAgICAgbmV3IGdsb2JhbHMuU2V0KCkuc2l6ZSAhPT0gMCB8fFxuICAgICAgICBuZXcgZ2xvYmFscy5NYXAoKS5zaXplICE9PSAwIHx8XG4gICAgICAgIHR5cGVvZiBnbG9iYWxzLk1hcC5wcm90b3R5cGUua2V5cyAhPT0gJ2Z1bmN0aW9uJyB8fFxuICAgICAgICB0eXBlb2YgZ2xvYmFscy5TZXQucHJvdG90eXBlLmtleXMgIT09ICdmdW5jdGlvbicgfHxcbiAgICAgICAgdHlwZW9mIGdsb2JhbHMuTWFwLnByb3RvdHlwZS5mb3JFYWNoICE9PSAnZnVuY3Rpb24nIHx8XG4gICAgICAgIHR5cGVvZiBnbG9iYWxzLlNldC5wcm90b3R5cGUuZm9yRWFjaCAhPT0gJ2Z1bmN0aW9uJyB8fFxuICAgICAgICBpc0NhbGxhYmxlV2l0aG91dE5ldyhnbG9iYWxzLk1hcCkgfHxcbiAgICAgICAgaXNDYWxsYWJsZVdpdGhvdXROZXcoZ2xvYmFscy5TZXQpIHx8XG4gICAgICAgIHR5cGVvZiAobmV3IGdsb2JhbHMuTWFwKCkua2V5cygpLm5leHQpICE9PSAnZnVuY3Rpb24nIHx8IC8vIFNhZmFyaSA4XG4gICAgICAgIG1hcEl0ZXJhdGlvblRocm93c1N0b3BJdGVyYXRvciB8fCAvLyBGaXJlZm94IDI1XG4gICAgICAgICFtYXBTdXBwb3J0c1N1YmNsYXNzaW5nXG4gICAgICApIHtcbiAgICAgICAgZGVmaW5lUHJvcGVydGllcyhnbG9iYWxzLCB7XG4gICAgICAgICAgTWFwOiBjb2xsZWN0aW9uU2hpbXMuTWFwLFxuICAgICAgICAgIFNldDogY29sbGVjdGlvblNoaW1zLlNldFxuICAgICAgICB9LCB0cnVlKTtcbiAgICAgIH1cblxuICAgICAgaWYgKGdsb2JhbHMuU2V0LnByb3RvdHlwZS5rZXlzICE9PSBnbG9iYWxzLlNldC5wcm90b3R5cGUudmFsdWVzKSB7XG4gICAgICAgIC8vIEZpeGVkIGluIFdlYktpdCB3aXRoIGh0dHBzOi8vYnVncy53ZWJraXQub3JnL3Nob3dfYnVnLmNnaT9pZD0xNDQxOTBcbiAgICAgICAgZGVmaW5lUHJvcGVydHkoZ2xvYmFscy5TZXQucHJvdG90eXBlLCAna2V5cycsIGdsb2JhbHMuU2V0LnByb3RvdHlwZS52YWx1ZXMsIHRydWUpO1xuICAgICAgfVxuXG4gICAgICAvLyBTaGltIGluY29tcGxldGUgaXRlcmF0b3IgaW1wbGVtZW50YXRpb25zLlxuICAgICAgYWRkSXRlcmF0b3IoT2JqZWN0LmdldFByb3RvdHlwZU9mKChuZXcgZ2xvYmFscy5NYXAoKSkua2V5cygpKSk7XG4gICAgICBhZGRJdGVyYXRvcihPYmplY3QuZ2V0UHJvdG90eXBlT2YoKG5ldyBnbG9iYWxzLlNldCgpKS5rZXlzKCkpKTtcblxuICAgICAgaWYgKGZ1bmN0aW9uc0hhdmVOYW1lcyAmJiBnbG9iYWxzLlNldC5wcm90b3R5cGUuaGFzLm5hbWUgIT09ICdoYXMnKSB7XG4gICAgICAgIC8vIE1pY3Jvc29mdCBFZGdlIHYwLjExLjEwMDc0LjAgaXMgbWlzc2luZyBhIG5hbWUgb24gU2V0I2hhc1xuICAgICAgICB2YXIgYW5vbnltb3VzU2V0SGFzID0gZ2xvYmFscy5TZXQucHJvdG90eXBlLmhhcztcbiAgICAgICAgb3ZlcnJpZGVOYXRpdmUoZ2xvYmFscy5TZXQucHJvdG90eXBlLCAnaGFzJywgZnVuY3Rpb24gaGFzKGtleSkge1xuICAgICAgICAgIHJldHVybiBfY2FsbChhbm9ueW1vdXNTZXRIYXMsIHRoaXMsIGtleSk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH1cbiAgICBkZWZpbmVQcm9wZXJ0aWVzKGdsb2JhbHMsIGNvbGxlY3Rpb25TaGltcyk7XG4gICAgYWRkRGVmYXVsdFNwZWNpZXMoZ2xvYmFscy5NYXApO1xuICAgIGFkZERlZmF1bHRTcGVjaWVzKGdsb2JhbHMuU2V0KTtcbiAgfVxuXG4gIHZhciB0aHJvd1VubGVzc1RhcmdldElzT2JqZWN0ID0gZnVuY3Rpb24gdGhyb3dVbmxlc3NUYXJnZXRJc09iamVjdCh0YXJnZXQpIHtcbiAgICBpZiAoIUVTLlR5cGVJc09iamVjdCh0YXJnZXQpKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCd0YXJnZXQgbXVzdCBiZSBhbiBvYmplY3QnKTtcbiAgICB9XG4gIH07XG5cbiAgLy8gU29tZSBSZWZsZWN0IG1ldGhvZHMgYXJlIGJhc2ljYWxseSB0aGUgc2FtZSBhc1xuICAvLyB0aG9zZSBvbiB0aGUgT2JqZWN0IGdsb2JhbCwgZXhjZXB0IHRoYXQgYSBUeXBlRXJyb3IgaXMgdGhyb3duIGlmXG4gIC8vIHRhcmdldCBpc24ndCBhbiBvYmplY3QuIEFzIHdlbGwgYXMgcmV0dXJuaW5nIGEgYm9vbGVhbiBpbmRpY2F0aW5nXG4gIC8vIHRoZSBzdWNjZXNzIG9mIHRoZSBvcGVyYXRpb24uXG4gIHZhciBSZWZsZWN0U2hpbXMgPSB7XG4gICAgLy8gQXBwbHkgbWV0aG9kIGluIGEgZnVuY3Rpb25hbCBmb3JtLlxuICAgIGFwcGx5OiBmdW5jdGlvbiBhcHBseSgpIHtcbiAgICAgIHJldHVybiBFUy5DYWxsKEVTLkNhbGwsIG51bGwsIGFyZ3VtZW50cyk7XG4gICAgfSxcblxuICAgIC8vIE5ldyBvcGVyYXRvciBpbiBhIGZ1bmN0aW9uYWwgZm9ybS5cbiAgICBjb25zdHJ1Y3Q6IGZ1bmN0aW9uIGNvbnN0cnVjdChjb25zdHJ1Y3RvciwgYXJncykge1xuICAgICAgaWYgKCFFUy5Jc0NvbnN0cnVjdG9yKGNvbnN0cnVjdG9yKSkge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdGaXJzdCBhcmd1bWVudCBtdXN0IGJlIGEgY29uc3RydWN0b3IuJyk7XG4gICAgICB9XG4gICAgICB2YXIgbmV3VGFyZ2V0ID0gYXJndW1lbnRzLmxlbmd0aCA+IDIgPyBhcmd1bWVudHNbMl0gOiBjb25zdHJ1Y3RvcjtcbiAgICAgIGlmICghRVMuSXNDb25zdHJ1Y3RvcihuZXdUYXJnZXQpKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ25ldy50YXJnZXQgbXVzdCBiZSBhIGNvbnN0cnVjdG9yLicpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIEVTLkNvbnN0cnVjdChjb25zdHJ1Y3RvciwgYXJncywgbmV3VGFyZ2V0LCAnaW50ZXJuYWwnKTtcbiAgICB9LFxuXG4gICAgLy8gV2hlbiBkZWxldGluZyBhIG5vbi1leGlzdGVudCBvciBjb25maWd1cmFibGUgcHJvcGVydHksXG4gICAgLy8gdHJ1ZSBpcyByZXR1cm5lZC5cbiAgICAvLyBXaGVuIGF0dGVtcHRpbmcgdG8gZGVsZXRlIGEgbm9uLWNvbmZpZ3VyYWJsZSBwcm9wZXJ0eSxcbiAgICAvLyBpdCB3aWxsIHJldHVybiBmYWxzZS5cbiAgICBkZWxldGVQcm9wZXJ0eTogZnVuY3Rpb24gZGVsZXRlUHJvcGVydHkodGFyZ2V0LCBrZXkpIHtcbiAgICAgIHRocm93VW5sZXNzVGFyZ2V0SXNPYmplY3QodGFyZ2V0KTtcbiAgICAgIGlmIChzdXBwb3J0c0Rlc2NyaXB0b3JzKSB7XG4gICAgICAgIHZhciBkZXNjID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcih0YXJnZXQsIGtleSk7XG5cbiAgICAgICAgaWYgKGRlc2MgJiYgIWRlc2MuY29uZmlndXJhYmxlKSB7XG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIC8vIFdpbGwgcmV0dXJuIHRydWUuXG4gICAgICByZXR1cm4gZGVsZXRlIHRhcmdldFtrZXldO1xuICAgIH0sXG5cbiAgICBoYXM6IGZ1bmN0aW9uIGhhcyh0YXJnZXQsIGtleSkge1xuICAgICAgdGhyb3dVbmxlc3NUYXJnZXRJc09iamVjdCh0YXJnZXQpO1xuICAgICAgcmV0dXJuIGtleSBpbiB0YXJnZXQ7XG4gICAgfVxuICB9O1xuXG4gIGlmIChPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcykge1xuICAgIE9iamVjdC5hc3NpZ24oUmVmbGVjdFNoaW1zLCB7XG4gICAgICAvLyBCYXNpY2FsbHkgdGhlIHJlc3VsdCBvZiBjYWxsaW5nIHRoZSBpbnRlcm5hbCBbW093blByb3BlcnR5S2V5c11dLlxuICAgICAgLy8gQ29uY2F0ZW5hdGluZyBwcm9wZXJ0eU5hbWVzIGFuZCBwcm9wZXJ0eVN5bWJvbHMgc2hvdWxkIGRvIHRoZSB0cmljay5cbiAgICAgIC8vIFRoaXMgc2hvdWxkIGNvbnRpbnVlIHRvIHdvcmsgdG9nZXRoZXIgd2l0aCBhIFN5bWJvbCBzaGltXG4gICAgICAvLyB3aGljaCBvdmVycmlkZXMgT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXMgYW5kIGltcGxlbWVudHNcbiAgICAgIC8vIE9iamVjdC5nZXRPd25Qcm9wZXJ0eVN5bWJvbHMuXG4gICAgICBvd25LZXlzOiBmdW5jdGlvbiBvd25LZXlzKHRhcmdldCkge1xuICAgICAgICB0aHJvd1VubGVzc1RhcmdldElzT2JqZWN0KHRhcmdldCk7XG4gICAgICAgIHZhciBrZXlzID0gT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXModGFyZ2V0KTtcblxuICAgICAgICBpZiAoRVMuSXNDYWxsYWJsZShPYmplY3QuZ2V0T3duUHJvcGVydHlTeW1ib2xzKSkge1xuICAgICAgICAgIF9wdXNoQXBwbHkoa2V5cywgT2JqZWN0LmdldE93blByb3BlcnR5U3ltYm9scyh0YXJnZXQpKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBrZXlzO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgdmFyIGNhbGxBbmRDYXRjaEV4Y2VwdGlvbiA9IGZ1bmN0aW9uIENvbnZlcnRFeGNlcHRpb25Ub0Jvb2xlYW4oZnVuYykge1xuICAgIHJldHVybiAhdGhyb3dzRXJyb3IoZnVuYyk7XG4gIH07XG5cbiAgaWYgKE9iamVjdC5wcmV2ZW50RXh0ZW5zaW9ucykge1xuICAgIE9iamVjdC5hc3NpZ24oUmVmbGVjdFNoaW1zLCB7XG4gICAgICBpc0V4dGVuc2libGU6IGZ1bmN0aW9uIGlzRXh0ZW5zaWJsZSh0YXJnZXQpIHtcbiAgICAgICAgdGhyb3dVbmxlc3NUYXJnZXRJc09iamVjdCh0YXJnZXQpO1xuICAgICAgICByZXR1cm4gT2JqZWN0LmlzRXh0ZW5zaWJsZSh0YXJnZXQpO1xuICAgICAgfSxcbiAgICAgIHByZXZlbnRFeHRlbnNpb25zOiBmdW5jdGlvbiBwcmV2ZW50RXh0ZW5zaW9ucyh0YXJnZXQpIHtcbiAgICAgICAgdGhyb3dVbmxlc3NUYXJnZXRJc09iamVjdCh0YXJnZXQpO1xuICAgICAgICByZXR1cm4gY2FsbEFuZENhdGNoRXhjZXB0aW9uKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICBPYmplY3QucHJldmVudEV4dGVuc2lvbnModGFyZ2V0KTtcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICBpZiAoc3VwcG9ydHNEZXNjcmlwdG9ycykge1xuICAgIHZhciBpbnRlcm5hbEdldCA9IGZ1bmN0aW9uIGdldCh0YXJnZXQsIGtleSwgcmVjZWl2ZXIpIHtcbiAgICAgIHZhciBkZXNjID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcih0YXJnZXQsIGtleSk7XG5cbiAgICAgIGlmICghZGVzYykge1xuICAgICAgICB2YXIgcGFyZW50ID0gT2JqZWN0LmdldFByb3RvdHlwZU9mKHRhcmdldCk7XG5cbiAgICAgICAgaWYgKHBhcmVudCA9PT0gbnVsbCkge1xuICAgICAgICAgIHJldHVybiB2b2lkIDA7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gaW50ZXJuYWxHZXQocGFyZW50LCBrZXksIHJlY2VpdmVyKTtcbiAgICAgIH1cblxuICAgICAgaWYgKCd2YWx1ZScgaW4gZGVzYykge1xuICAgICAgICByZXR1cm4gZGVzYy52YWx1ZTtcbiAgICAgIH1cblxuICAgICAgaWYgKGRlc2MuZ2V0KSB7XG4gICAgICAgIHJldHVybiBFUy5DYWxsKGRlc2MuZ2V0LCByZWNlaXZlcik7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiB2b2lkIDA7XG4gICAgfTtcblxuICAgIHZhciBpbnRlcm5hbFNldCA9IGZ1bmN0aW9uIHNldCh0YXJnZXQsIGtleSwgdmFsdWUsIHJlY2VpdmVyKSB7XG4gICAgICB2YXIgZGVzYyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IodGFyZ2V0LCBrZXkpO1xuXG4gICAgICBpZiAoIWRlc2MpIHtcbiAgICAgICAgdmFyIHBhcmVudCA9IE9iamVjdC5nZXRQcm90b3R5cGVPZih0YXJnZXQpO1xuXG4gICAgICAgIGlmIChwYXJlbnQgIT09IG51bGwpIHtcbiAgICAgICAgICByZXR1cm4gaW50ZXJuYWxTZXQocGFyZW50LCBrZXksIHZhbHVlLCByZWNlaXZlcik7XG4gICAgICAgIH1cblxuICAgICAgICBkZXNjID0ge1xuICAgICAgICAgIHZhbHVlOiB2b2lkIDAsXG4gICAgICAgICAgd3JpdGFibGU6IHRydWUsXG4gICAgICAgICAgZW51bWVyYWJsZTogdHJ1ZSxcbiAgICAgICAgICBjb25maWd1cmFibGU6IHRydWVcbiAgICAgICAgfTtcbiAgICAgIH1cblxuICAgICAgaWYgKCd2YWx1ZScgaW4gZGVzYykge1xuICAgICAgICBpZiAoIWRlc2Mud3JpdGFibGUpIHtcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIUVTLlR5cGVJc09iamVjdChyZWNlaXZlcikpIHtcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgZXhpc3RpbmdEZXNjID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcihyZWNlaXZlciwga2V5KTtcblxuICAgICAgICBpZiAoZXhpc3RpbmdEZXNjKSB7XG4gICAgICAgICAgcmV0dXJuIFJlZmxlY3QuZGVmaW5lUHJvcGVydHkocmVjZWl2ZXIsIGtleSwge1xuICAgICAgICAgICAgdmFsdWU6IHZhbHVlXG4gICAgICAgICAgfSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmV0dXJuIFJlZmxlY3QuZGVmaW5lUHJvcGVydHkocmVjZWl2ZXIsIGtleSwge1xuICAgICAgICAgICAgdmFsdWU6IHZhbHVlLFxuICAgICAgICAgICAgd3JpdGFibGU6IHRydWUsXG4gICAgICAgICAgICBlbnVtZXJhYmxlOiB0cnVlLFxuICAgICAgICAgICAgY29uZmlndXJhYmxlOiB0cnVlXG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgaWYgKGRlc2Muc2V0KSB7XG4gICAgICAgIF9jYWxsKGRlc2Muc2V0LCByZWNlaXZlciwgdmFsdWUpO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH07XG5cbiAgICBPYmplY3QuYXNzaWduKFJlZmxlY3RTaGltcywge1xuICAgICAgZGVmaW5lUHJvcGVydHk6IGZ1bmN0aW9uIGRlZmluZVByb3BlcnR5KHRhcmdldCwgcHJvcGVydHlLZXksIGF0dHJpYnV0ZXMpIHtcbiAgICAgICAgdGhyb3dVbmxlc3NUYXJnZXRJc09iamVjdCh0YXJnZXQpO1xuICAgICAgICByZXR1cm4gY2FsbEFuZENhdGNoRXhjZXB0aW9uKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGFyZ2V0LCBwcm9wZXJ0eUtleSwgYXR0cmlidXRlcyk7XG4gICAgICAgIH0pO1xuICAgICAgfSxcblxuICAgICAgZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yOiBmdW5jdGlvbiBnZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IodGFyZ2V0LCBwcm9wZXJ0eUtleSkge1xuICAgICAgICB0aHJvd1VubGVzc1RhcmdldElzT2JqZWN0KHRhcmdldCk7XG4gICAgICAgIHJldHVybiBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKHRhcmdldCwgcHJvcGVydHlLZXkpO1xuICAgICAgfSxcblxuICAgICAgLy8gU3ludGF4IGluIGEgZnVuY3Rpb25hbCBmb3JtLlxuICAgICAgZ2V0OiBmdW5jdGlvbiBnZXQodGFyZ2V0LCBrZXkpIHtcbiAgICAgICAgdGhyb3dVbmxlc3NUYXJnZXRJc09iamVjdCh0YXJnZXQpO1xuICAgICAgICB2YXIgcmVjZWl2ZXIgPSBhcmd1bWVudHMubGVuZ3RoID4gMiA/IGFyZ3VtZW50c1syXSA6IHRhcmdldDtcblxuICAgICAgICByZXR1cm4gaW50ZXJuYWxHZXQodGFyZ2V0LCBrZXksIHJlY2VpdmVyKTtcbiAgICAgIH0sXG5cbiAgICAgIHNldDogZnVuY3Rpb24gc2V0KHRhcmdldCwga2V5LCB2YWx1ZSkge1xuICAgICAgICB0aHJvd1VubGVzc1RhcmdldElzT2JqZWN0KHRhcmdldCk7XG4gICAgICAgIHZhciByZWNlaXZlciA9IGFyZ3VtZW50cy5sZW5ndGggPiAzID8gYXJndW1lbnRzWzNdIDogdGFyZ2V0O1xuXG4gICAgICAgIHJldHVybiBpbnRlcm5hbFNldCh0YXJnZXQsIGtleSwgdmFsdWUsIHJlY2VpdmVyKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIGlmIChPYmplY3QuZ2V0UHJvdG90eXBlT2YpIHtcbiAgICB2YXIgb2JqZWN0RG90R2V0UHJvdG90eXBlT2YgPSBPYmplY3QuZ2V0UHJvdG90eXBlT2Y7XG4gICAgUmVmbGVjdFNoaW1zLmdldFByb3RvdHlwZU9mID0gZnVuY3Rpb24gZ2V0UHJvdG90eXBlT2YodGFyZ2V0KSB7XG4gICAgICB0aHJvd1VubGVzc1RhcmdldElzT2JqZWN0KHRhcmdldCk7XG4gICAgICByZXR1cm4gb2JqZWN0RG90R2V0UHJvdG90eXBlT2YodGFyZ2V0KTtcbiAgICB9O1xuICB9XG5cbiAgaWYgKE9iamVjdC5zZXRQcm90b3R5cGVPZiAmJiBSZWZsZWN0U2hpbXMuZ2V0UHJvdG90eXBlT2YpIHtcbiAgICB2YXIgd2lsbENyZWF0ZUNpcmN1bGFyUHJvdG90eXBlID0gZnVuY3Rpb24gKG9iamVjdCwgbGFzdFByb3RvKSB7XG4gICAgICB2YXIgcHJvdG8gPSBsYXN0UHJvdG87XG4gICAgICB3aGlsZSAocHJvdG8pIHtcbiAgICAgICAgaWYgKG9iamVjdCA9PT0gcHJvdG8pIHtcbiAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICBwcm90byA9IFJlZmxlY3RTaGltcy5nZXRQcm90b3R5cGVPZihwcm90byk7XG4gICAgICB9XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfTtcblxuICAgIE9iamVjdC5hc3NpZ24oUmVmbGVjdFNoaW1zLCB7XG4gICAgICAvLyBTZXRzIHRoZSBwcm90b3R5cGUgb2YgdGhlIGdpdmVuIG9iamVjdC5cbiAgICAgIC8vIFJldHVybnMgdHJ1ZSBvbiBzdWNjZXNzLCBvdGhlcndpc2UgZmFsc2UuXG4gICAgICBzZXRQcm90b3R5cGVPZjogZnVuY3Rpb24gc2V0UHJvdG90eXBlT2Yob2JqZWN0LCBwcm90bykge1xuICAgICAgICB0aHJvd1VubGVzc1RhcmdldElzT2JqZWN0KG9iamVjdCk7XG4gICAgICAgIGlmIChwcm90byAhPT0gbnVsbCAmJiAhRVMuVHlwZUlzT2JqZWN0KHByb3RvKSkge1xuICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ3Byb3RvIG11c3QgYmUgYW4gb2JqZWN0IG9yIG51bGwnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIElmIHRoZXkgYWxyZWFkeSBhcmUgdGhlIHNhbWUsIHdlJ3JlIGRvbmUuXG4gICAgICAgIGlmIChwcm90byA9PT0gUmVmbGVjdC5nZXRQcm90b3R5cGVPZihvYmplY3QpKSB7XG4gICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBDYW5ub3QgYWx0ZXIgcHJvdG90eXBlIGlmIG9iamVjdCBub3QgZXh0ZW5zaWJsZS5cbiAgICAgICAgaWYgKFJlZmxlY3QuaXNFeHRlbnNpYmxlICYmICFSZWZsZWN0LmlzRXh0ZW5zaWJsZShvYmplY3QpKSB7XG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gRW5zdXJlIHRoYXQgd2UgZG8gbm90IGNyZWF0ZSBhIGNpcmN1bGFyIHByb3RvdHlwZSBjaGFpbi5cbiAgICAgICAgaWYgKHdpbGxDcmVhdGVDaXJjdWxhclByb3RvdHlwZShvYmplY3QsIHByb3RvKSkge1xuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuXG4gICAgICAgIE9iamVjdC5zZXRQcm90b3R5cGVPZihvYmplY3QsIHByb3RvKTtcblxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuICB2YXIgZGVmaW5lT3JPdmVycmlkZVJlZmxlY3RQcm9wZXJ0eSA9IGZ1bmN0aW9uIChrZXksIHNoaW0pIHtcbiAgICBpZiAoIUVTLklzQ2FsbGFibGUoZ2xvYmFscy5SZWZsZWN0W2tleV0pKSB7XG4gICAgICBkZWZpbmVQcm9wZXJ0eShnbG9iYWxzLlJlZmxlY3QsIGtleSwgc2hpbSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHZhciBhY2NlcHRzUHJpbWl0aXZlcyA9IHZhbHVlT3JGYWxzZUlmVGhyb3dzKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgZ2xvYmFscy5SZWZsZWN0W2tleV0oMSk7XG4gICAgICAgIGdsb2JhbHMuUmVmbGVjdFtrZXldKE5hTik7XG4gICAgICAgIGdsb2JhbHMuUmVmbGVjdFtrZXldKHRydWUpO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH0pO1xuICAgICAgaWYgKGFjY2VwdHNQcmltaXRpdmVzKSB7XG4gICAgICAgIG92ZXJyaWRlTmF0aXZlKGdsb2JhbHMuUmVmbGVjdCwga2V5LCBzaGltKTtcbiAgICAgIH1cbiAgICB9XG4gIH07XG4gIE9iamVjdC5rZXlzKFJlZmxlY3RTaGltcykuZm9yRWFjaChmdW5jdGlvbiAoa2V5KSB7XG4gICAgZGVmaW5lT3JPdmVycmlkZVJlZmxlY3RQcm9wZXJ0eShrZXksIFJlZmxlY3RTaGltc1trZXldKTtcbiAgfSk7XG4gIHZhciBvcmlnaW5hbFJlZmxlY3RHZXRQcm90byA9IGdsb2JhbHMuUmVmbGVjdC5nZXRQcm90b3R5cGVPZjtcbiAgaWYgKGZ1bmN0aW9uc0hhdmVOYW1lcyAmJiBvcmlnaW5hbFJlZmxlY3RHZXRQcm90byAmJiBvcmlnaW5hbFJlZmxlY3RHZXRQcm90by5uYW1lICE9PSAnZ2V0UHJvdG90eXBlT2YnKSB7XG4gICAgb3ZlcnJpZGVOYXRpdmUoZ2xvYmFscy5SZWZsZWN0LCAnZ2V0UHJvdG90eXBlT2YnLCBmdW5jdGlvbiBnZXRQcm90b3R5cGVPZih0YXJnZXQpIHtcbiAgICAgIHJldHVybiBfY2FsbChvcmlnaW5hbFJlZmxlY3RHZXRQcm90bywgZ2xvYmFscy5SZWZsZWN0LCB0YXJnZXQpO1xuICAgIH0pO1xuICB9XG4gIGlmIChnbG9iYWxzLlJlZmxlY3Quc2V0UHJvdG90eXBlT2YpIHtcbiAgICBpZiAodmFsdWVPckZhbHNlSWZUaHJvd3MoZnVuY3Rpb24gKCkge1xuICAgICAgZ2xvYmFscy5SZWZsZWN0LnNldFByb3RvdHlwZU9mKDEsIHt9KTtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH0pKSB7XG4gICAgICBvdmVycmlkZU5hdGl2ZShnbG9iYWxzLlJlZmxlY3QsICdzZXRQcm90b3R5cGVPZicsIFJlZmxlY3RTaGltcy5zZXRQcm90b3R5cGVPZik7XG4gICAgfVxuICB9XG4gIGlmIChnbG9iYWxzLlJlZmxlY3QuZGVmaW5lUHJvcGVydHkpIHtcbiAgICBpZiAoIXZhbHVlT3JGYWxzZUlmVGhyb3dzKGZ1bmN0aW9uICgpIHtcbiAgICAgIHZhciBiYXNpYyA9ICFnbG9iYWxzLlJlZmxlY3QuZGVmaW5lUHJvcGVydHkoMSwgJ3Rlc3QnLCB7IHZhbHVlOiAxIH0pO1xuICAgICAgLy8gXCJleHRlbnNpYmxlXCIgZmFpbHMgb24gRWRnZSAwLjEyXG4gICAgICB2YXIgZXh0ZW5zaWJsZSA9IHR5cGVvZiBPYmplY3QucHJldmVudEV4dGVuc2lvbnMgIT09ICdmdW5jdGlvbicgfHwgIWdsb2JhbHMuUmVmbGVjdC5kZWZpbmVQcm9wZXJ0eShPYmplY3QucHJldmVudEV4dGVuc2lvbnMoe30pLCAndGVzdCcsIHt9KTtcbiAgICAgIHJldHVybiBiYXNpYyAmJiBleHRlbnNpYmxlO1xuICAgIH0pKSB7XG4gICAgICBvdmVycmlkZU5hdGl2ZShnbG9iYWxzLlJlZmxlY3QsICdkZWZpbmVQcm9wZXJ0eScsIFJlZmxlY3RTaGltcy5kZWZpbmVQcm9wZXJ0eSk7XG4gICAgfVxuICB9XG4gIGlmIChnbG9iYWxzLlJlZmxlY3QuY29uc3RydWN0KSB7XG4gICAgaWYgKCF2YWx1ZU9yRmFsc2VJZlRocm93cyhmdW5jdGlvbiAoKSB7XG4gICAgICB2YXIgRiA9IGZ1bmN0aW9uIEYoKSB7fTtcbiAgICAgIHJldHVybiBnbG9iYWxzLlJlZmxlY3QuY29uc3RydWN0KGZ1bmN0aW9uICgpIHt9LCBbXSwgRikgaW5zdGFuY2VvZiBGO1xuICAgIH0pKSB7XG4gICAgICBvdmVycmlkZU5hdGl2ZShnbG9iYWxzLlJlZmxlY3QsICdjb25zdHJ1Y3QnLCBSZWZsZWN0U2hpbXMuY29uc3RydWN0KTtcbiAgICB9XG4gIH1cblxuICBpZiAoU3RyaW5nKG5ldyBEYXRlKE5hTikpICE9PSAnSW52YWxpZCBEYXRlJykge1xuICAgIHZhciBkYXRlVG9TdHJpbmcgPSBEYXRlLnByb3RvdHlwZS50b1N0cmluZztcbiAgICB2YXIgc2hpbW1lZERhdGVUb1N0cmluZyA9IGZ1bmN0aW9uIHRvU3RyaW5nKCkge1xuICAgICAgdmFyIHZhbHVlT2YgPSArdGhpcztcbiAgICAgIGlmICh2YWx1ZU9mICE9PSB2YWx1ZU9mKSB7XG4gICAgICAgIHJldHVybiAnSW52YWxpZCBEYXRlJztcbiAgICAgIH1cbiAgICAgIHJldHVybiBFUy5DYWxsKGRhdGVUb1N0cmluZywgdGhpcyk7XG4gICAgfTtcbiAgICBvdmVycmlkZU5hdGl2ZShEYXRlLnByb3RvdHlwZSwgJ3RvU3RyaW5nJywgc2hpbW1lZERhdGVUb1N0cmluZyk7XG4gIH1cblxuICAvLyBBbm5leCBCIEhUTUwgbWV0aG9kc1xuICAvLyBodHRwczovL3Blb3BsZS5tb3ppbGxhLm9yZy9+am9yZW5kb3JmZi9lczYtZHJhZnQuaHRtbCNzZWMtYWRkaXRpb25hbC1wcm9wZXJ0aWVzLW9mLXRoZS1zdHJpbmcucHJvdG90eXBlLW9iamVjdFxuICB2YXIgc3RyaW5nSFRNTHNoaW1zID0ge1xuICAgIGFuY2hvcjogZnVuY3Rpb24gYW5jaG9yKG5hbWUpIHsgcmV0dXJuIEVTLkNyZWF0ZUhUTUwodGhpcywgJ2EnLCAnbmFtZScsIG5hbWUpOyB9LFxuICAgIGJpZzogZnVuY3Rpb24gYmlnKCkgeyByZXR1cm4gRVMuQ3JlYXRlSFRNTCh0aGlzLCAnYmlnJywgJycsICcnKTsgfSxcbiAgICBibGluazogZnVuY3Rpb24gYmxpbmsoKSB7IHJldHVybiBFUy5DcmVhdGVIVE1MKHRoaXMsICdibGluaycsICcnLCAnJyk7IH0sXG4gICAgYm9sZDogZnVuY3Rpb24gYm9sZCgpIHsgcmV0dXJuIEVTLkNyZWF0ZUhUTUwodGhpcywgJ2InLCAnJywgJycpOyB9LFxuICAgIGZpeGVkOiBmdW5jdGlvbiBmaXhlZCgpIHsgcmV0dXJuIEVTLkNyZWF0ZUhUTUwodGhpcywgJ3R0JywgJycsICcnKTsgfSxcbiAgICBmb250Y29sb3I6IGZ1bmN0aW9uIGZvbnRjb2xvcihjb2xvcikgeyByZXR1cm4gRVMuQ3JlYXRlSFRNTCh0aGlzLCAnZm9udCcsICdjb2xvcicsIGNvbG9yKTsgfSxcbiAgICBmb250c2l6ZTogZnVuY3Rpb24gZm9udHNpemUoc2l6ZSkgeyByZXR1cm4gRVMuQ3JlYXRlSFRNTCh0aGlzLCAnZm9udCcsICdzaXplJywgc2l6ZSk7IH0sXG4gICAgaXRhbGljczogZnVuY3Rpb24gaXRhbGljcygpIHsgcmV0dXJuIEVTLkNyZWF0ZUhUTUwodGhpcywgJ2knLCAnJywgJycpOyB9LFxuICAgIGxpbms6IGZ1bmN0aW9uIGxpbmsodXJsKSB7IHJldHVybiBFUy5DcmVhdGVIVE1MKHRoaXMsICdhJywgJ2hyZWYnLCB1cmwpOyB9LFxuICAgIHNtYWxsOiBmdW5jdGlvbiBzbWFsbCgpIHsgcmV0dXJuIEVTLkNyZWF0ZUhUTUwodGhpcywgJ3NtYWxsJywgJycsICcnKTsgfSxcbiAgICBzdHJpa2U6IGZ1bmN0aW9uIHN0cmlrZSgpIHsgcmV0dXJuIEVTLkNyZWF0ZUhUTUwodGhpcywgJ3N0cmlrZScsICcnLCAnJyk7IH0sXG4gICAgc3ViOiBmdW5jdGlvbiBzdWIoKSB7IHJldHVybiBFUy5DcmVhdGVIVE1MKHRoaXMsICdzdWInLCAnJywgJycpOyB9LFxuICAgIHN1cDogZnVuY3Rpb24gc3ViKCkgeyByZXR1cm4gRVMuQ3JlYXRlSFRNTCh0aGlzLCAnc3VwJywgJycsICcnKTsgfVxuICB9O1xuICBfZm9yRWFjaChPYmplY3Qua2V5cyhzdHJpbmdIVE1Mc2hpbXMpLCBmdW5jdGlvbiAoa2V5KSB7XG4gICAgdmFyIG1ldGhvZCA9IFN0cmluZy5wcm90b3R5cGVba2V5XTtcbiAgICB2YXIgc2hvdWxkT3ZlcndyaXRlID0gZmFsc2U7XG4gICAgaWYgKEVTLklzQ2FsbGFibGUobWV0aG9kKSkge1xuICAgICAgdmFyIG91dHB1dCA9IF9jYWxsKG1ldGhvZCwgJycsICcgXCIgJyk7XG4gICAgICB2YXIgcXVvdGVzQ291bnQgPSBfY29uY2F0KFtdLCBvdXRwdXQubWF0Y2goL1wiL2cpKS5sZW5ndGg7XG4gICAgICBzaG91bGRPdmVyd3JpdGUgPSBvdXRwdXQgIT09IG91dHB1dC50b0xvd2VyQ2FzZSgpIHx8IHF1b3Rlc0NvdW50ID4gMjtcbiAgICB9IGVsc2Uge1xuICAgICAgc2hvdWxkT3ZlcndyaXRlID0gdHJ1ZTtcbiAgICB9XG4gICAgaWYgKHNob3VsZE92ZXJ3cml0ZSkge1xuICAgICAgb3ZlcnJpZGVOYXRpdmUoU3RyaW5nLnByb3RvdHlwZSwga2V5LCBzdHJpbmdIVE1Mc2hpbXNba2V5XSk7XG4gICAgfVxuICB9KTtcblxuICB2YXIgSlNPTnN0cmluZ2lmaWVzU3ltYm9scyA9IChmdW5jdGlvbiAoKSB7XG4gICAgLy8gTWljcm9zb2Z0IEVkZ2UgdjAuMTIgc3RyaW5naWZpZXMgU3ltYm9scyBpbmNvcnJlY3RseVxuICAgIGlmICghaGFzU3ltYm9scykgeyByZXR1cm4gZmFsc2U7IH0gLy8gU3ltYm9scyBhcmUgbm90IHN1cHBvcnRlZFxuICAgIHZhciBzdHJpbmdpZnkgPSB0eXBlb2YgSlNPTiA9PT0gJ29iamVjdCcgJiYgdHlwZW9mIEpTT04uc3RyaW5naWZ5ID09PSAnZnVuY3Rpb24nID8gSlNPTi5zdHJpbmdpZnkgOiBudWxsO1xuICAgIGlmICghc3RyaW5naWZ5KSB7IHJldHVybiBmYWxzZTsgfSAvLyBKU09OLnN0cmluZ2lmeSBpcyBub3Qgc3VwcG9ydGVkXG4gICAgaWYgKHR5cGVvZiBzdHJpbmdpZnkoU3ltYm9sKCkpICE9PSAndW5kZWZpbmVkJykgeyByZXR1cm4gdHJ1ZTsgfSAvLyBTeW1ib2xzIHNob3VsZCBiZWNvbWUgYHVuZGVmaW5lZGBcbiAgICBpZiAoc3RyaW5naWZ5KFtTeW1ib2woKV0pICE9PSAnW251bGxdJykgeyByZXR1cm4gdHJ1ZTsgfSAvLyBTeW1ib2xzIGluIGFycmF5cyBzaG91bGQgYmVjb21lIGBudWxsYFxuICAgIHZhciBvYmogPSB7IGE6IFN5bWJvbCgpIH07XG4gICAgb2JqW1N5bWJvbCgpXSA9IHRydWU7XG4gICAgaWYgKHN0cmluZ2lmeShvYmopICE9PSAne30nKSB7IHJldHVybiB0cnVlOyB9IC8vIFN5bWJvbC12YWx1ZWQga2V5cyAqYW5kKiBTeW1ib2wtdmFsdWVkIHByb3BlcnRpZXMgc2hvdWxkIGJlIG9taXR0ZWRcbiAgICByZXR1cm4gZmFsc2U7XG4gIH0oKSk7XG4gIHZhciBKU09Oc3RyaW5naWZ5QWNjZXB0c09iamVjdFN5bWJvbCA9IHZhbHVlT3JGYWxzZUlmVGhyb3dzKGZ1bmN0aW9uICgpIHtcbiAgICAvLyBDaHJvbWUgNDUgdGhyb3dzIG9uIHN0cmluZ2lmeWluZyBvYmplY3Qgc3ltYm9sc1xuICAgIGlmICghaGFzU3ltYm9scykgeyByZXR1cm4gdHJ1ZTsgfSAvLyBTeW1ib2xzIGFyZSBub3Qgc3VwcG9ydGVkXG4gICAgcmV0dXJuIEpTT04uc3RyaW5naWZ5KE9iamVjdChTeW1ib2woKSkpID09PSAne30nICYmIEpTT04uc3RyaW5naWZ5KFtPYmplY3QoU3ltYm9sKCkpXSkgPT09ICdbe31dJztcbiAgfSk7XG4gIGlmIChKU09Oc3RyaW5naWZpZXNTeW1ib2xzIHx8ICFKU09Oc3RyaW5naWZ5QWNjZXB0c09iamVjdFN5bWJvbCkge1xuICAgIHZhciBvcmlnU3RyaW5naWZ5ID0gSlNPTi5zdHJpbmdpZnk7XG4gICAgb3ZlcnJpZGVOYXRpdmUoSlNPTiwgJ3N0cmluZ2lmeScsIGZ1bmN0aW9uIHN0cmluZ2lmeSh2YWx1ZSkge1xuICAgICAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ3N5bWJvbCcpIHsgcmV0dXJuOyB9XG4gICAgICB2YXIgcmVwbGFjZXI7XG4gICAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgcmVwbGFjZXIgPSBhcmd1bWVudHNbMV07XG4gICAgICB9XG4gICAgICB2YXIgYXJncyA9IFt2YWx1ZV07XG4gICAgICBpZiAoIWlzQXJyYXkocmVwbGFjZXIpKSB7XG4gICAgICAgIHZhciByZXBsYWNlRm4gPSBFUy5Jc0NhbGxhYmxlKHJlcGxhY2VyKSA/IHJlcGxhY2VyIDogbnVsbDtcbiAgICAgICAgdmFyIHdyYXBwZWRSZXBsYWNlciA9IGZ1bmN0aW9uIChrZXksIHZhbCkge1xuICAgICAgICAgIHZhciBwYXJzZWRWYWx1ZSA9IHJlcGxhY2VGbiA/IF9jYWxsKHJlcGxhY2VGbiwgdGhpcywga2V5LCB2YWwpIDogdmFsO1xuICAgICAgICAgIGlmICh0eXBlb2YgcGFyc2VkVmFsdWUgIT09ICdzeW1ib2wnKSB7XG4gICAgICAgICAgICBpZiAoVHlwZS5zeW1ib2wocGFyc2VkVmFsdWUpKSB7XG4gICAgICAgICAgICAgIHJldHVybiBhc3NpZ25Ubyh7fSkocGFyc2VkVmFsdWUpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgcmV0dXJuIHBhcnNlZFZhbHVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgICAgYXJncy5wdXNoKHdyYXBwZWRSZXBsYWNlcik7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBjcmVhdGUgd3JhcHBlZCByZXBsYWNlciB0aGF0IGhhbmRsZXMgYW4gYXJyYXkgcmVwbGFjZXI/XG4gICAgICAgIGFyZ3MucHVzaChyZXBsYWNlcik7XG4gICAgICB9XG4gICAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+IDIpIHtcbiAgICAgICAgYXJncy5wdXNoKGFyZ3VtZW50c1syXSk7XG4gICAgICB9XG4gICAgICByZXR1cm4gb3JpZ1N0cmluZ2lmeS5hcHBseSh0aGlzLCBhcmdzKTtcbiAgICB9KTtcbiAgfVxuXG4gIHJldHVybiBnbG9iYWxzO1xufSkpO1xuIiwiLy8gc2hpbSBmb3IgdXNpbmcgcHJvY2VzcyBpbiBicm93c2VyXG5cbnZhciBwcm9jZXNzID0gbW9kdWxlLmV4cG9ydHMgPSB7fTtcbnZhciBxdWV1ZSA9IFtdO1xudmFyIGRyYWluaW5nID0gZmFsc2U7XG52YXIgY3VycmVudFF1ZXVlO1xudmFyIHF1ZXVlSW5kZXggPSAtMTtcblxuZnVuY3Rpb24gY2xlYW5VcE5leHRUaWNrKCkge1xuICAgIGRyYWluaW5nID0gZmFsc2U7XG4gICAgaWYgKGN1cnJlbnRRdWV1ZS5sZW5ndGgpIHtcbiAgICAgICAgcXVldWUgPSBjdXJyZW50UXVldWUuY29uY2F0KHF1ZXVlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBxdWV1ZUluZGV4ID0gLTE7XG4gICAgfVxuICAgIGlmIChxdWV1ZS5sZW5ndGgpIHtcbiAgICAgICAgZHJhaW5RdWV1ZSgpO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gZHJhaW5RdWV1ZSgpIHtcbiAgICBpZiAoZHJhaW5pbmcpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB2YXIgdGltZW91dCA9IHNldFRpbWVvdXQoY2xlYW5VcE5leHRUaWNrKTtcbiAgICBkcmFpbmluZyA9IHRydWU7XG5cbiAgICB2YXIgbGVuID0gcXVldWUubGVuZ3RoO1xuICAgIHdoaWxlKGxlbikge1xuICAgICAgICBjdXJyZW50UXVldWUgPSBxdWV1ZTtcbiAgICAgICAgcXVldWUgPSBbXTtcbiAgICAgICAgd2hpbGUgKCsrcXVldWVJbmRleCA8IGxlbikge1xuICAgICAgICAgICAgaWYgKGN1cnJlbnRRdWV1ZSkge1xuICAgICAgICAgICAgICAgIGN1cnJlbnRRdWV1ZVtxdWV1ZUluZGV4XS5ydW4oKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBxdWV1ZUluZGV4ID0gLTE7XG4gICAgICAgIGxlbiA9IHF1ZXVlLmxlbmd0aDtcbiAgICB9XG4gICAgY3VycmVudFF1ZXVlID0gbnVsbDtcbiAgICBkcmFpbmluZyA9IGZhbHNlO1xuICAgIGNsZWFyVGltZW91dCh0aW1lb3V0KTtcbn1cblxucHJvY2Vzcy5uZXh0VGljayA9IGZ1bmN0aW9uIChmdW4pIHtcbiAgICB2YXIgYXJncyA9IG5ldyBBcnJheShhcmd1bWVudHMubGVuZ3RoIC0gMSk7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPiAxKSB7XG4gICAgICAgIGZvciAodmFyIGkgPSAxOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBhcmdzW2kgLSAxXSA9IGFyZ3VtZW50c1tpXTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBxdWV1ZS5wdXNoKG5ldyBJdGVtKGZ1biwgYXJncykpO1xuICAgIGlmIChxdWV1ZS5sZW5ndGggPT09IDEgJiYgIWRyYWluaW5nKSB7XG4gICAgICAgIHNldFRpbWVvdXQoZHJhaW5RdWV1ZSwgMCk7XG4gICAgfVxufTtcblxuLy8gdjggbGlrZXMgcHJlZGljdGlibGUgb2JqZWN0c1xuZnVuY3Rpb24gSXRlbShmdW4sIGFycmF5KSB7XG4gICAgdGhpcy5mdW4gPSBmdW47XG4gICAgdGhpcy5hcnJheSA9IGFycmF5O1xufVxuSXRlbS5wcm90b3R5cGUucnVuID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuZnVuLmFwcGx5KG51bGwsIHRoaXMuYXJyYXkpO1xufTtcbnByb2Nlc3MudGl0bGUgPSAnYnJvd3Nlcic7XG5wcm9jZXNzLmJyb3dzZXIgPSB0cnVlO1xucHJvY2Vzcy5lbnYgPSB7fTtcbnByb2Nlc3MuYXJndiA9IFtdO1xucHJvY2Vzcy52ZXJzaW9uID0gJyc7IC8vIGVtcHR5IHN0cmluZyB0byBhdm9pZCByZWdleHAgaXNzdWVzXG5wcm9jZXNzLnZlcnNpb25zID0ge307XG5cbmZ1bmN0aW9uIG5vb3AoKSB7fVxuXG5wcm9jZXNzLm9uID0gbm9vcDtcbnByb2Nlc3MuYWRkTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5vbmNlID0gbm9vcDtcbnByb2Nlc3Mub2ZmID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVBbGxMaXN0ZW5lcnMgPSBub29wO1xucHJvY2Vzcy5lbWl0ID0gbm9vcDtcblxucHJvY2Vzcy5iaW5kaW5nID0gZnVuY3Rpb24gKG5hbWUpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuYmluZGluZyBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xuXG5wcm9jZXNzLmN3ZCA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuICcvJyB9O1xucHJvY2Vzcy5jaGRpciA9IGZ1bmN0aW9uIChkaXIpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuY2hkaXIgaXMgbm90IHN1cHBvcnRlZCcpO1xufTtcbnByb2Nlc3MudW1hc2sgPSBmdW5jdGlvbigpIHsgcmV0dXJuIDA7IH07XG4iLCJpbXBvcnQgKiBhcyBvcHQgZnJvbSAnLi9tYWluL09wdGlvbic7XG5pbXBvcnQgKiBhcyBsaXN0IGZyb20gJy4vbWFpbi9MaXN0JztcbmltcG9ydCAqIGFzIG1hcCBmcm9tICcuL21haW4vTWFwJztcblxuLyoqXG4gKiBFeHBvcnQgdG8gcHVibGljIGFzIHR5cGVzY3JpcHQgbW9kdWxlcy5cbiAqL1xuZXhwb3J0IHtcbiAgb3B0LCBsaXN0LCBtYXBcbn07XG5cbi8qKlxuICogRXhwb3J0IHRvIHB1YmxpYyBieSBiaW5kaW5nIHRoZW0gdG8gdGhlIHdpbmRvdyBwcm9wZXJ0eS5cbiAqL1xuaWYgKHdpbmRvdykge1xuICB3aW5kb3dbJ0FwcCddID0ge1xuICAgIG9wdDogb3B0LFxuICAgIGxpc3Q6IGxpc3QsXG4gICAgbWFwOiBtYXBcbiAgfTtcbn1cblxuIiwiaW1wb3J0IHtvcHRpb24sIE9wdGlvbiwgSU9wdGlvbn0gZnJvbSAnLi9PcHRpb24nO1xuaW1wb3J0IHtsaXN0LCBMaXN0LCBJTGlzdH0gZnJvbSAnLi9MaXN0JztcblxuZXhwb3J0IGludGVyZmFjZSBJdGVyYWJsZTxBPiB7XG5cbiAgY291bnQocCA6ICh4IDogQSkgPT4gYm9vbGVhbikgOiBudW1iZXI7XG5cbiAgZmluZChwOiAoYTogQSkgPT4gYm9vbGVhbik6IElPcHRpb248QT47XG5cbiAgZm9yRWFjaChmOiAoYSA6IEEpID0+IHZvaWQpO1xuXG4gIGRyb3AobiA6IG51bWJlcikgOiBJdGVyYWJsZTxBPjtcblxuICBkcm9wUmlnaHQobiA6IG51bWJlcikgOiBJdGVyYWJsZTxBPjtcblxuICBkcm9wV2hpbGUocDogKGE6IEEpID0+IGJvb2xlYW4pIDogSXRlcmFibGU8QT47XG5cbiAgZXhpc3RzKHA6IChhOiBBKSA9PiBib29sZWFuKTogQm9vbGVhbjtcblxuICBmaWx0ZXIocDogKGE6IEEpID0+IGJvb2xlYW4pIDogSXRlcmFibGU8QT47XG5cbiAgZmlsdGVyTm90KHA6IChhOiBBKSA9PiBib29sZWFuKSA6IEl0ZXJhYmxlPEE+O1xuXG4gIGZvbGRMZWZ0PEI+KHo6IEIpOiAob3A6IChiIDogQiwgYSA6IEEpID0+IEIpID0+IEI7XG5cbiAgZm9sZFJpZ2h0PEI+KHo6IEIpOiAob3A6IChhIDogQSwgYiA6IEIpID0+IEIpID0+IEI7XG5cbiAgaGVhZCgpOiBBO1xuXG4gIGhlYWRPcHRpb24oKTogSU9wdGlvbjxBPjtcblxuICBpc0VtcHR5KCkgOiBib29sZWFuO1xuXG4gIG1hcDxCPihmIDogKGEgOiBBKSA9PiBCKSA6IEl0ZXJhYmxlPEI+O1xuXG4gIHNpemUoKTogbnVtYmVyO1xuXG4gIHRvQXJyYXkoKSA6IEFbXTtcblxuICB0b0xpc3QoKSA6IElMaXN0PEE+O1xufVxuXG5leHBvcnQgYWJzdHJhY3QgY2xhc3MgSXRlcmFibGVJbXBsPEE+IGltcGxlbWVudHMgSXRlcmFibGU8QT4ge1xuXG4gIHByaXZhdGUgX2l0ZXJhdG9yIDogSXRlcmF0b3I8QT47XG4gIHByaXZhdGUgX2RhdGEgOiBJdGVyYWJsZTxBPjtcblxuICBjb25zdHJ1Y3RvcihpdGVyYXRvciA6IEl0ZXJhdG9yPEE+LCBkYXRhID86IEl0ZXJhYmxlPEE+KSB7XG4gICAgdGhpcy5faXRlcmF0b3IgPSBpdGVyYXRvcjtcbiAgICB0aGlzLl9kYXRhID0gZGF0YTtcbiAgfVxuXG4gIHB1YmxpYyBjb3VudChwIDogKHggOiBBKSA9PiBCb29sZWFuKSA6IG51bWJlciB7XG4gICAgbGV0IGNvdW50ID0gMDtcbiAgICBmb3IgKGxldCBpID0gdGhpcy5faXRlcmF0b3IubmV4dCgpOyAhaS5kb25lOyBpID0gdGhpcy5faXRlcmF0b3IubmV4dCgpKSB7XG4gICAgICBjb25zdCByZXN1bHQgPSBwKGkudmFsdWUpO1xuICAgICAgY291bnQgPSByZXN1bHQgPyBjb3VudCArIDEgOiBjb3VudDtcbiAgICB9XG4gICAgcmV0dXJuIGNvdW50O1xuICB9XG5cbiAgcHVibGljIGV4aXN0cyhwOiAoYTogQSkgPT4gYm9vbGVhbik6IEJvb2xlYW4ge1xuICAgIHJldHVybiAhdGhpcy5maW5kKHApLmlzRW1wdHkoKTtcbiAgfVxuXG4gIHB1YmxpYyBmaW5kKHA6IChhOiBBKSA9PiBib29sZWFuKTogSU9wdGlvbjxBPiB7XG4gICAgcmV0dXJuIHRoaXMuX2RhdGEuZmluZChwKTtcbiAgfVxuXG4gIHB1YmxpYyBmb3JFYWNoKGY6IChhIDogQSkgPT4gdm9pZCkge1xuICAgIGZvciAobGV0IGkgPSB0aGlzLl9pdGVyYXRvci5uZXh0KCk7ICFpLmRvbmU7IGkgPSB0aGlzLl9pdGVyYXRvci5uZXh0KCkpIHtcbiAgICAgIGYoaS52YWx1ZSk7XG4gICAgfVxuICB9XG5cbiAgcHVibGljIGZvbGRMZWZ0PEI+KHo6IEIpOiAob3A6IChiIDogQiwgYSA6IEEpID0+IEIpID0+IEIge1xuICAgIHJldHVybiB0aGlzLl9kYXRhLmZvbGRMZWZ0KHopO1xuICB9XG5cbiAgcHVibGljIGZvbGRSaWdodDxCPih6OiBCKTogKG9wOiAoYSA6IEEsIGIgOiBCKSA9PiBCKSA9PiBCIHtcbiAgICByZXR1cm4gdGhpcy5fZGF0YS5mb2xkUmlnaHQoeik7XG4gIH1cblxuICBwdWJsaWMgaGVhZCgpOiBBIHtcbiAgICByZXR1cm4gdGhpcy5faXRlcmF0b3IubmV4dCgpLnZhbHVlO1xuICB9XG5cbiAgcHVibGljIGhlYWRPcHRpb24oKTogT3B0aW9uPEE+IHtcbiAgICByZXR1cm4gb3B0aW9uKHRoaXMuaGVhZCgpKTtcbiAgfVxuXG4gIHB1YmxpYyBpc0VtcHR5KCkgOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5fZGF0YS5zaXplKCkgPT09IDA7XG4gIH1cblxuICBwdWJsaWMgaXRlcmF0b3IoKTogSXRlcmFibGU8QT4ge1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgcHVibGljIGRyb3AobiA6IG51bWJlcikgOiBJdGVyYWJsZTxBPiB7XG4gICAgcmV0dXJuIHRoaXMuX2RhdGEuZHJvcChuKTtcbiAgfVxuXG4gIHB1YmxpYyBkcm9wUmlnaHQobiA6IG51bWJlcikgOiBJdGVyYWJsZTxBPiB7XG4gICAgcmV0dXJuIHRoaXMuX2RhdGEuZHJvcFJpZ2h0KG4pO1xuICB9XG5cbiAgcHVibGljIGRyb3BXaGlsZShwOiAoYTogQSkgPT4gYm9vbGVhbikgOiBJdGVyYWJsZTxBPiB7XG4gICAgcmV0dXJuIHRoaXMuX2RhdGEuZHJvcFdoaWxlKHApO1xuICB9XG5cbiAgcHVibGljIGZpbHRlcihwOiAoYTogQSkgPT4gYm9vbGVhbikgOiBJdGVyYWJsZTxBPiB7XG4gICAgcmV0dXJuIHRoaXMuX2RhdGEuZmlsdGVyKHApO1xuICB9XG5cbiAgcHVibGljIGZpbHRlck5vdChwOiAoYTogQSkgPT4gYm9vbGVhbikgOiBJdGVyYWJsZTxBPiB7XG4gICAgcmV0dXJuIHRoaXMuX2RhdGEuZmlsdGVyTm90KHApO1xuICB9XG5cbiAgcHVibGljIG1hcDxCPihmIDogKGEgOiBBKSA9PiBCKSA6IEl0ZXJhYmxlPEI+IHtcbiAgICByZXR1cm4gdGhpcy5fZGF0YS5tYXAoZik7XG4gIH1cblxuICBwdWJsaWMgc2l6ZSgpIDogbnVtYmVyIHtcbiAgICByZXR1cm4gdGhpcy5fZGF0YS5zaXplKCk7XG4gIH1cblxuICBwdWJsaWMgdG9BcnJheSgpIDogQVtdIHtcbiAgICByZXR1cm4gdGhpcy50b0xpc3QoKS50b0FycmF5KCk7XG4gIH1cblxuICBwdWJsaWMgdG9MaXN0KCkgOiBJTGlzdDxBPiB7XG4gICAgcmV0dXJuIHRoaXMuX2RhdGEudG9MaXN0KCk7XG4gIH1cbn1cbiIsImltcG9ydCB7aU1hcCwgSU1hcH0gZnJvbSAnLi9NYXAnO1xuaW1wb3J0IHtJdGVyYWJsZSwgSXRlcmFibGVJbXBsfSBmcm9tICcuL0l0ZXJhYmxlJztcbmltcG9ydCB7b3B0aW9uLCBPcHRpb24sIElPcHRpb259IGZyb20gJy4vT3B0aW9uJztcbmltcG9ydCB7QXJyYXkgYXMgRVM2QXJyYXl9IGZyb20gJ2VzNi1zaGltJztcbkFycmF5ID0gRVM2QXJyYXk7XG5cbmV4cG9ydCBpbnRlcmZhY2UgSUxpc3Q8QT4gZXh0ZW5kcyBJdGVyYWJsZTxBPiB7XG5cbiAgbGVuZ3RoOiBudW1iZXI7XG5cbiAgY29udGFpbnMoZWxlbTogQSkgOiBib29sZWFuO1xuXG4gIF8oaW5kZXggOm51bWJlcik7XG5cbiAgZ2V0KGluZGV4IDogbnVtYmVyKSA6IEE7XG5cbiAgbWFwPEI+KGYgOiAoYSA6IEEpID0+IEIpIDogSUxpc3Q8Qj47XG5cbiAgcmVkdWNlPEExIGV4dGVuZHMgQT4ob3A6ICh4IDogQTEsIHkgOiBBMSkgPT4gQTEpIDogQTtcblxuICByZXZlcnNlKCkgOiBJTGlzdDxBPjtcblxuICB1bmlvbih0aGF0OiBBW10gfCBJTGlzdDxBPikgOiBJTGlzdDxBPjtcblxufVxuXG4vKipcbiAqIEFuIEltbXV0YWJsZSBMaXN0IGNsYXNzIGluIHNpbWlsYXIgdG8gYSBTY2FsYSBMaXN0LiBJdCdzIGltcG9ydGFudCB0byBwb2ludCBvdXQgdGhhdCB0aGlzIGxpc3QgaXMgbm90IGluZmFjdCBhIHJlYWxcbiAqIExpbmtlZCBMaXN0IGluIHRoZSB0cmFkaXRpb25hbCBzZW5zZSwgaW5zdGVhZCBpdCBpcyBiYWNrZWQgYnkgYSBBeXBlU2NyaXB0L0phdmFTY3JpcHQgQXJyYXkgZm9yIHNpbXBsaWNpdHkgYW5kXG4gKiBwZXJmb3JtYW5jZSByZWFzb25zIChpLmUuLCBhcnJheXMgYXJlIGhlYXZpbHkgb3B0aW1pemVkIGJ5IFZNcykgc28gdW5sZXNzIHRoZXJlJ3MgYSBnb29kIHJlYXNvbiB0byBpbXBsaWVtZW50IGFcbiAqIHRyYWRpdGlvbmFsIExpc3QgdGhpcyB3aWxsIHJlbWFpbiB0aGlzIHdheS4gRXh0ZXJuYWxseSB0aGUgTGlzdCBJbnRlcmZhY2Ugd2lsbCBlbnN1cmUgaW1tdXRhYmxpeSBieSByZXR1cm5pbmcgbmV3XG4gKiBpbnN0YW5jZXMgb2YgdGhlIExpc3QgYW5kIHdpbGwgbm90IG11dGF0ZSB0aGUgTGlzdCBvciB0aGUgdW5kZXJseWluZyBBcnJheSBpbiBhbnkgd2F5LlxuICovXG5leHBvcnQgY2xhc3MgTGlzdDxBPiBpbXBsZW1lbnRzIElMaXN0PEE+IHtcblxuICBwcml2YXRlIF9saXN0RGF0YSA6IEFbXTtcblxuICBjb25zdHJ1Y3RvcihhcmdzOiBBW10gfCBJdGVyYWJsZTxBPikge1xuICAgIGlmIChhcmdzIGluc3RhbmNlb2YgRVM2QXJyYXkpIHtcbiAgICAgIHRoaXMuX2xpc3REYXRhID0gYXJncy5jb25jYXQoW10pO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLl9saXN0RGF0YSA9IFtdO1xuICAgICAgYXJncy5mb3JFYWNoKChpdGVtKSA9PiB7XG4gICAgICAgIHRoaXMuX2xpc3REYXRhLnB1c2goaXRlbSk7XG4gICAgICB9KTtcbiAgICB9XG4gIH1cblxuICBwdWJsaWMgY29udGFpbnMoZWxlbTogQSkgOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5fbGlzdERhdGEuaW5kZXhPZihlbGVtKSA+IC0xO1xuICB9XG5cbiAgcHVibGljIGNvdW50KHA6IChhIDogQSkgPT4gYm9vbGVhbikgOiBudW1iZXIge1xuICAgIHJldHVybiB0aGlzLl9saXN0RGF0YS5maWx0ZXIocCkubGVuZ3RoO1xuICB9XG5cbiAgcHVibGljIGRyb3AobiA6IG51bWJlcikgOiBJTGlzdDxBPiB7XG4gICAgcmV0dXJuIGxpc3Q8QT4odGhpcy5fbGlzdERhdGEuc2xpY2UobikpO1xuICB9XG5cbiAgcHVibGljIGRyb3BSaWdodChuIDogbnVtYmVyKSA6IElMaXN0PEE+IHtcbiAgICByZXR1cm4gbGlzdDxBPih0aGlzLl9saXN0RGF0YS5zbGljZSgwLCBuKSk7XG4gIH1cblxuICBwdWJsaWMgZHJvcFdoaWxlKHA6IChhOiBBKSA9PiBib29sZWFuKSA6IElMaXN0PEE+IHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ2Ryb3BXaGlsZScpO1xuICB9XG5cbiAgcHVibGljIGV4aXN0cyhwOiAoYTogQSkgPT4gYm9vbGVhbik6IEJvb2xlYW4ge1xuICAgIHJldHVybiAhdGhpcy5maW5kKHApLmlzRW1wdHkoKTtcbiAgfVxuXG4gIHB1YmxpYyBmaWx0ZXIocDogKGE6IEEpID0+IGJvb2xlYW4pIDogSUxpc3Q8QT4ge1xuICAgIHJldHVybiBsaXN0PEE+KHRoaXMuX2xpc3REYXRhLmZpbHRlcihwKSk7XG4gIH1cblxuICBwdWJsaWMgZmlsdGVyTm90KHA6IChhOiBBKSA9PiBib29sZWFuKSA6IElMaXN0PEE+IHtcbiAgICBjb25zdCBpbnZlcnNlID0gKGE6IEEpID0+IHtcbiAgICAgIHJldHVybiAhcChhKTtcbiAgICB9O1xuICAgIHJldHVybiBsaXN0PEE+KHRoaXMuX2xpc3REYXRhLmZpbHRlcihpbnZlcnNlKSk7XG4gIH1cblxuICBwdWJsaWMgZmluZChwOiAoYTogQSkgPT4gYm9vbGVhbikgOiBJT3B0aW9uPEE+IHtcbiAgICByZXR1cm4gb3B0aW9uKHRoaXMuX2xpc3REYXRhLmZpbmQocCkpO1xuICB9XG5cbiAgcHVibGljIGZvbGRMZWZ0PEI+KHo6IEIpOiAob3A6IChiIDogQiwgYSA6IEEpID0+IEIpID0+IEIge1xuICAgIGxldCBhY2N1bXVsYXRvciA6IEIgPSB6O1xuICAgIHJldHVybiAob3A6IChiIDogQiwgYSA6IEEpID0+IEIpID0+IHtcbiAgICAgIHRoaXMuZm9yRWFjaCgoaXRlbSA6IEEpID0+IHtcbiAgICAgICAgYWNjdW11bGF0b3IgPSBvcChhY2N1bXVsYXRvciwgaXRlbSk7XG4gICAgICB9KTtcbiAgICAgIHJldHVybiBhY2N1bXVsYXRvcjtcbiAgICB9O1xuICB9XG5cbiAgcHVibGljIGZvbGRSaWdodDxCPih6OiBCKTogKG9wOiAoYSA6IEEsIGIgOiBCKSA9PiBCKSA9PiBCIHtcbiAgICBjb25zdCByZXZlcnNlZExpc3QgPSB0aGlzLnJldmVyc2UoKTtcbiAgICBsZXQgYWNjdW11bGF0b3IgOiBCID0gejtcbiAgICAvLyBDb3VsZG4ndCBnZXQgZGVsZWdhdGUgY2FsbCB0byBmb2xkTGVmdCBoZXJlLCBUeXBlU2NyaXB0IGNvbXBpbGVyIGlzc3VlPyBvciBiYWQgc3ludGF4P1xuICAgIHJldHVybiAob3A6IChhIDogQSwgYiA6IEIpID0+IEIpID0+IHtcbiAgICAgIHJldmVyc2VkTGlzdC5mb3JFYWNoKChpdGVtIDogQSkgPT4ge1xuICAgICAgICBhY2N1bXVsYXRvciA9IG9wKGl0ZW0sIGFjY3VtdWxhdG9yKTtcbiAgICAgIH0pO1xuICAgICAgcmV0dXJuIGFjY3VtdWxhdG9yO1xuICAgIH07XG4gIH1cblxuICBwdWJsaWMgZm9yRWFjaChmOiAoYSA6IEEpID0+IHZvaWQpIHtcbiAgICBbXS5jb25jYXQodGhpcy5fbGlzdERhdGEpLmZvckVhY2goZik7XG4gIH1cblxuICBwdWJsaWMgXyhpbmRleCA6bnVtYmVyKSA6IEEge1xuICAgIHJldHVybiB0aGlzLmdldChpbmRleCk7XG4gIH1cblxuICBwdWJsaWMgZ2V0KGluZGV4IDogbnVtYmVyKSA6IEEge1xuICAgIHJldHVybiB0aGlzLl9saXN0RGF0YVtpbmRleF07XG4gIH1cblxuICBwdWJsaWMgaGVhZCgpOiBBIHtcbiAgICByZXR1cm4gdGhpcy5fbGlzdERhdGFbMF07XG4gIH1cblxuICBwdWJsaWMgaGVhZE9wdGlvbigpOiBJT3B0aW9uPEE+IHtcbiAgICByZXR1cm4gb3B0aW9uKHRoaXMuaGVhZCgpKTtcbiAgfVxuXG4gIHB1YmxpYyBpc0VtcHR5KCkgOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5zaXplKCkgPT09IDA7XG4gIH1cblxuICBwdWJsaWMgaXRlcmF0b3IoKSA6IEl0ZXJhYmxlPEE+IHtcbiAgICByZXR1cm4gbmV3IExpc3RJdGVyYXRvcih0aGlzLl9saXN0RGF0YS52YWx1ZXMoKSwgdGhpcyk7XG4gIH1cblxuICBwdWJsaWMgbWFwPEI+KGYgOiAoYSA6IEEpID0+IEIpIDogSUxpc3Q8Qj4ge1xuICAgIGNvbnN0IG5ld0FycmF5IDogQltdID0gdGhpcy5fbGlzdERhdGEubWFwKGYpO1xuICAgIHJldHVybiBsaXN0KG5ld0FycmF5KTtcbiAgfVxuXG4gIHB1YmxpYyBnZXQgbGVuZ3RoKCkge1xuICAgIHJldHVybiB0aGlzLl9saXN0RGF0YS5sZW5ndGg7XG4gIH1cblxuICBwdWJsaWMgcmVkdWNlPEExIGV4dGVuZHMgQT4ob3A6ICh4IDogQTEsIHkgOiBBMSkgPT4gQTEpIDogQSB7XG4gICAgcmV0dXJuIHRoaXMuX2xpc3REYXRhLnJlZHVjZShvcCk7XG4gIH1cblxuICBwdWJsaWMgcmV2ZXJzZSgpIDogSUxpc3Q8QT4ge1xuICAgIHJldHVybiBuZXcgTGlzdChbXS5jb25jYXQodGhpcy5fbGlzdERhdGEpLnJldmVyc2UoKSk7XG4gIH1cblxuICBwdWJsaWMgc2l6ZSgpIDogbnVtYmVyIHtcbiAgICByZXR1cm4gdGhpcy5sZW5ndGg7XG4gIH1cblxuICBwdWJsaWMgdG9BcnJheSgpIDogQVtdIHtcbiAgICByZXR1cm4gW10uY29uY2F0KHRoaXMuX2xpc3REYXRhKTtcbiAgfVxuXG4gIHB1YmxpYyB0b0xpc3QoKSA6IElMaXN0PEE+IHtcbiAgICByZXR1cm4gbGlzdCh0aGlzLl9saXN0RGF0YSk7XG4gIH1cblxuICBwdWJsaWMgdG9TdHJpbmcoKSA6IHN0cmluZyB7XG4gICAgY29uc3QgcmF3U3RyaW5nID0gdGhpcy5fbGlzdERhdGEuam9pbignLCAnKTtcbiAgICByZXR1cm4gYExpc3QoJHtyYXdTdHJpbmd9KWA7XG4gIH1cblxuICBwdWJsaWMgdW5pb24odGhhdDogQVtdIHwgSUxpc3Q8QT4pIDogSUxpc3Q8QT4ge1xuICAgIGlmICh0aGF0IGluc3RhbmNlb2YgTGlzdCkge1xuICAgICAgcmV0dXJuIGxpc3Q8QT4odGhpcy5fbGlzdERhdGEuY29uY2F0KHRoYXQudG9BcnJheSgpKSk7XG4gICAgfSBlbHNlIGlmICh0aGF0IGluc3RhbmNlb2YgQXJyYXkpe1xuICAgICAgcmV0dXJuIGxpc3Q8QT4odGhpcy5fbGlzdERhdGEuY29uY2F0KC4uLnRoYXQpKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhyb3cgJ1Vuc3VwcG9ydGVkIFR5cGUgJyArIHR5cGVvZiB0aGF0O1xuICAgIH1cbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gbGlzdDxBPihhcmdzOiBBW10gfCBJdGVyYWJsZTxBPikgOiBMaXN0PEE+IHtcbiAgcmV0dXJuIG5ldyBMaXN0PEE+KGFyZ3MpO1xufVxuXG5jbGFzcyBMaXN0SXRlcmF0b3I8QT4gZXh0ZW5kcyBJdGVyYWJsZUltcGw8QT4ge1xuXG59XG4iLCJpbXBvcnQge0l0ZXJhYmxlLCBJdGVyYWJsZUltcGx9IGZyb20gJy4vSXRlcmFibGUnO1xuaW1wb3J0IHtsaXN0LCBMaXN0LCBJTGlzdH0gZnJvbSAnLi9MaXN0JztcbmltcG9ydCB7b3B0aW9uLCBPcHRpb24sIElPcHRpb259IGZyb20gJy4vT3B0aW9uJztcbmltcG9ydCB7QXJyYXkgYXMgRVM2QXJyYXksIE1hcCBhcyBFUzZNYXB9IGZyb20gJ2VzNi1zaGltJztcbkFycmF5ID0gRVM2QXJyYXk7XG5cbmV4cG9ydCBjbGFzcyBJTWFwPEssVj4gaW1wbGVtZW50cyBJdGVyYWJsZTxbSyxWXT4ge1xuXG4gIHByaXZhdGUgX21hcERhdGEgOiBNYXA8SyxWPjtcblxuICBjb25zdHJ1Y3RvcihkYXRhIDogSXRlcmFibGU8W0ssVl0+KSB7XG4gICAgdGhpcy5fbWFwRGF0YSA9IG5ldyBNYXA8SyxWPigpO1xuICAgIGlmIChkYXRhKSB7XG4gICAgICBkYXRhLmZvckVhY2goKHBhaXIgOiBbSyxWXSkgPT4ge1xuICAgICAgICB0aGlzLl9tYXBEYXRhLnNldChwYWlyWzBdLCBwYWlyWzFdKTtcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxuXG4gIHB1YmxpYyBjb3VudChwOiAodHVwbGUgOiBbSyxWXSkgPT4gYm9vbGVhbikgOiBudW1iZXIge1xuICAgIHJldHVybiBuZXcgSU1hcEl0ZXJhdG9yKHRoaXMuX21hcERhdGEuZW50cmllcygpKS5jb3VudChwKTtcbiAgfVxuXG4gIHB1YmxpYyBkcm9wKG4gOiBudW1iZXIpIDogSU1hcDxLLFY+IHtcbiAgICBsZXQgY291bnQgPSAwO1xuICAgIGNvbnN0IG5ld01hcCA9IG5ldyBNYXA8SyxWPigpO1xuICAgIG5ldyBJTWFwSXRlcmF0b3IodGhpcy5fbWFwRGF0YS5lbnRyaWVzKCkpLmZvckVhY2goKHBhaXIgOiBbSyxWXSkgPT4ge1xuICAgICAgIGlmIChjb3VudCA+PSBuKSB7XG4gICAgICAgICBuZXdNYXAuc2V0KHBhaXJbMF0sIHBhaXJbMV0pO1xuICAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gbmV3IElNYXA8SyxWPihuZXcgSU1hcEl0ZXJhdG9yKHRoaXMuX21hcERhdGEuZW50cmllcygpKSk7XG4gIH1cblxuICBwdWJsaWMgZHJvcFJpZ2h0KG4gOiBudW1iZXIpIDogSU1hcDxLLFY+IHtcbiAgICBsZXQgY291bnQgPSB0aGlzLl9tYXBEYXRhLnNpemUgLSBuO1xuICAgIGNvbnN0IG5ld01hcCA9IG5ldyBNYXA8SyxWPigpO1xuICAgIG5ldyBJTWFwSXRlcmF0b3IodGhpcy5fbWFwRGF0YS5lbnRyaWVzKCkpLmZvckVhY2goKHBhaXIgOiBbSyxWXSkgPT4ge1xuICAgICAgaWYgKGNvdW50IDwgbikge1xuICAgICAgICBuZXdNYXAuc2V0KHBhaXJbMF0sIHBhaXJbMV0pO1xuICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiBuZXcgSU1hcDxLLFY+KG5ldyBJTWFwSXRlcmF0b3IodGhpcy5fbWFwRGF0YS5lbnRyaWVzKCkpKTtcbiAgfVxuXG4gIHB1YmxpYyBkcm9wV2hpbGUocDogKGE6IFtLLFZdKSA9PiBib29sZWFuKSA6IElNYXA8SyxWPiB7XG4gICAgbGV0IGNvdW50ID0gLTE7XG4gICAgbmV3IElNYXBJdGVyYXRvcih0aGlzLl9tYXBEYXRhLmVudHJpZXMoKSkuZm9yRWFjaCgocGFpciA6IFtLLFZdKSA9PiB7XG4gICAgICBpZiAocChwYWlyKSkge1xuICAgICAgICBjb3VudCsrO1xuICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiB0aGlzLmRyb3AoY291bnQpO1xuICB9XG5cbiAgcHVibGljIGV4aXN0cyhwOiAoYTogW0ssVl0pID0+IGJvb2xlYW4pOiBib29sZWFuIHtcbiAgICByZXR1cm4gIXRoaXMuZmluZChwKS5pc0VtcHR5KCk7XG4gIH1cblxuICBwdWJsaWMgZmlsdGVyKHA6IChhOiBbSyxWXSkgPT4gYm9vbGVhbikgOiBJTWFwPEssVj4ge1xuICAgIGNvbnN0IG5ld0ludGVybmFsTWFwID0gbmV3IE1hcDxLLFY+KCk7XG4gICAgbmV3IElNYXBJdGVyYXRvcih0aGlzLl9tYXBEYXRhLmVudHJpZXMoKSkuZm9yRWFjaCgocGFpciA6IFtLLFZdKSA9PiB7XG4gICAgICBpZiAocChwYWlyKSkge1xuICAgICAgICBuZXdJbnRlcm5hbE1hcC5zZXQocGFpclswXSwgcGFpclsxXSk7XG4gICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIG5ldyBJTWFwPEssVj4obmV3IElNYXBJdGVyYXRvcihuZXdJbnRlcm5hbE1hcC5lbnRyaWVzKCkpKTtcbiAgfVxuXG4gIHB1YmxpYyBmaWx0ZXJOb3QocDogKGE6IFtLLFZdKSA9PiBib29sZWFuKSA6IElNYXA8SyxWPiB7XG4gICAgY29uc3QgbmV3SW50ZXJuYWxNYXAgPSBuZXcgTWFwPEssVj4oKTtcbiAgICBuZXcgSU1hcEl0ZXJhdG9yKHRoaXMuX21hcERhdGEuZW50cmllcygpKS5mb3JFYWNoKChwYWlyIDogW0ssVl0pID0+IHtcbiAgICAgIGlmICghcChwYWlyKSkge1xuICAgICAgICBuZXdJbnRlcm5hbE1hcC5zZXQocGFpclswXSwgcGFpclsxXSk7XG4gICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIG5ldyBJTWFwPEssVj4obmV3IElNYXBJdGVyYXRvcihuZXdJbnRlcm5hbE1hcC5lbnRyaWVzKCkpKTtcbiAgfVxuXG4gIHB1YmxpYyBmaW5kKHA6IChhOiBbSyxWXSkgPT4gYm9vbGVhbikgOiBJT3B0aW9uPFtLLFZdPiB7XG4gICAgcmV0dXJuIHRoaXMudG9MaXN0KCkuZmluZChwKTtcbiAgfVxuXG4gIHB1YmxpYyBmb2xkTGVmdDxCPih6OiBCKTogKG9wOiAoYiA6IEIsIGEgOiBbSyxWXSkgPT4gQikgPT4gQiB7XG4gICAgcmV0dXJuIHRoaXMudG9MaXN0KCkuZm9sZExlZnQoeik7XG4gIH1cblxuICBwdWJsaWMgZm9sZFJpZ2h0PEI+KHo6IEIpOiAob3A6IChhIDogW0ssVl0sIGIgOiBCKSA9PiBCKSA9PiBCIHtcbiAgICByZXR1cm4gdGhpcy50b0xpc3QoKS5mb2xkUmlnaHQoeik7XG4gIH1cblxuICBwdWJsaWMgZm9yRWFjaChmOiAoYSA6IFtLLFZdKSA9PiB2b2lkKSB7XG4gICAgcmV0dXJuIG5ldyBJTWFwSXRlcmF0b3IodGhpcy5fbWFwRGF0YS5lbnRyaWVzKCkpLmZvckVhY2goZik7XG4gIH1cblxuICBwdWJsaWMgZ2V0KGtleTogSykgOiBPcHRpb248Vj4ge1xuICAgIHJldHVybiBvcHRpb24odGhpcy5fbWFwRGF0YS5nZXQoa2V5KSk7XG4gIH1cblxuICBwdWJsaWMgZ2V0T3JFbHNlKGtleTogSywgZGVmYXVsdFZhbHVlOiBWKSA6IFYge1xuICAgIHJldHVybiBvcHRpb24odGhpcy5fbWFwRGF0YS5nZXQoa2V5KSkuZ2V0T3JFbHNlKGRlZmF1bHRWYWx1ZSk7XG4gIH1cblxuICBwdWJsaWMgaGVhZCgpIDogW0ssVl0ge1xuICAgIHJldHVybiB0aGlzLl9tYXBEYXRhLmVudHJpZXMoKS5uZXh0KCkudmFsdWU7XG4gIH1cblxuICBwdWJsaWMgaGVhZE9wdGlvbigpIDogT3B0aW9uPFtLLFZdPiB7XG4gICAgcmV0dXJuIG9wdGlvbih0aGlzLl9tYXBEYXRhLmVudHJpZXMoKS5uZXh0KCkudmFsdWUpO1xuICB9XG5cbiAgcHVibGljIGlzRW1wdHkoKSA6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLnNpemUoKSA9PT0gMDtcbiAgfVxuXG4gIHB1YmxpYyBpdGVyYXRvcigpOiBJdGVyYWJsZTxbSyxWXT4ge1xuICAgIHJldHVybiBuZXcgSU1hcEl0ZXJhdG9yKHRoaXMuX21hcERhdGEuZW50cmllcygpKTtcbiAgfVxuXG4gIHB1YmxpYyBzZXQoZW50cnk6IFtLLFZdIHwgSywgdmFsdWUgPzogVikgOiBJTWFwPEssVj4ge1xuICAgIGlmIChlbnRyeSkge1xuICAgICAgaWYgKGVudHJ5IGluc3RhbmNlb2YgQXJyYXkpIHtcbiAgICAgICAgcmV0dXJuIGlNYXAobGlzdDxbSyxWXT4oW2VudHJ5XSkpO1xuICAgICAgfSBlbHNlIGlmIChlbnRyeSAmJiB2YWx1ZSkge1xuICAgICAgICByZXR1cm4gaU1hcChsaXN0PFtLLFZdPihbW2VudHJ5LCB2YWx1ZV1dKSk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHRocm93IEVycm9yKCdJbnZhbGlkIHNldCAnICsgZW50cnkpO1xuICAgIH1cbiAgfVxuXG4gIHB1YmxpYyBtYXA8SzEsIFYxPihmIDogKGEgOiBbSyxWXSkgPT4gW0sxLFYxXSkgOiBJTWFwPEsxLCBWMT4ge1xuICAgIGNvbnN0IG5ld0ludGVybmFsTWFwID0gbmV3IE1hcDxLMSxWMT4oKTtcbiAgICBuZXcgSU1hcEl0ZXJhdG9yKHRoaXMuX21hcERhdGEuZW50cmllcygpKS5mb3JFYWNoKChwYWlyIDogW0ssVl0pID0+IHtcbiAgICAgIGNvbnN0IG5ld1ZhbHVlID0gZihwYWlyKTtcbiAgICAgIG5ld0ludGVybmFsTWFwLnNldChuZXdWYWx1ZVswXSwgbmV3VmFsdWVbMV0pO1xuICAgIH0pO1xuICAgIHJldHVybiBuZXcgSU1hcDxLMSxWMT4obmV3IElNYXBJdGVyYXRvcjxbSzEsVjFdPihuZXdJbnRlcm5hbE1hcC5lbnRyaWVzKCkpKTtcbiAgfVxuXG4gIHB1YmxpYyBzaXplKCkgOiBudW1iZXIge1xuICAgIHJldHVybiB0aGlzLl9tYXBEYXRhLnNpemU7XG4gIH1cblxuICBwdWJsaWMgdG9BcnJheSgpIDogW0ssVl1bXSAge1xuICAgIHJldHVybiB0aGlzLnRvTGlzdCgpLnRvQXJyYXkoKTtcbiAgfVxuXG4gIHB1YmxpYyB0b0xpc3QoKSA6IElMaXN0PFtLLFZdPiB7XG4gICAgcmV0dXJuIGxpc3Q8W0ssVl0+KHRoaXMuaXRlcmF0b3IoKSk7XG4gIH1cblxuICBwdWJsaWMgdG9TdHJpbmcoKSA6IHN0cmluZyB7XG4gICAgY29uc3QgcmF3U3RyaW5nID0gdGhpcy50b0FycmF5KCkubWFwKChlbnRyeSA6IFtLLFZdKSA9PiBgJHtlbnRyeVswXX0gLT4gJHtlbnRyeVsxXX0gYCkuam9pbignLCAnKTtcbiAgICByZXR1cm4gYE1hcCgke3Jhd1N0cmluZ30pYDtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gaU1hcDxLLFY+KGl0ZXJhYmxlIDogSXRlcmFibGU8W0ssVl0+KSA6IElNYXA8SyxWPiB7XG4gIHJldHVybiBuZXcgSU1hcDxLLFY+KGl0ZXJhYmxlKTtcbn1cblxuY2xhc3MgSU1hcEl0ZXJhdG9yPEE+IGV4dGVuZHMgSXRlcmFibGVJbXBsPEE+IHtcblxuICBkcm9wKG4gOiBudW1iZXIpIDogSXRlcmFibGU8QT4ge1xuICAgIHRocm93IG5ldyBFcnJvcigpO1xuICB9XG4gIGRyb3BSaWdodChuIDogbnVtYmVyKSA6IEl0ZXJhYmxlPEE+IHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoKTtcbiAgfVxuICBkcm9wV2hpbGUocDogKGE6IEEpID0+IGJvb2xlYW4pIDogSXRlcmFibGU8QT4ge1xuICAgIHRocm93IG5ldyBFcnJvcigpO1xuICB9XG4gIGZpbHRlcihwOiAoYTogQSkgPT4gYm9vbGVhbikgOiBJdGVyYWJsZTxBPiB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCk7XG4gIH1cbiAgZmlsdGVyTm90KHA6IChhOiBBKSA9PiBib29sZWFuKSA6IEl0ZXJhYmxlPEE+IHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoKTtcbiAgfVxuICBtYXA8Qj4oZiA6IChhIDogQSkgPT4gQikgOiBJdGVyYWJsZTxCPiB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCk7XG4gIH1cbiAgdG9MaXN0KCkgOiBMaXN0PEE+IHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoKTtcbiAgfVxufVxuIiwiaW1wb3J0IHtJdGVyYWJsZSwgSXRlcmFibGVJbXBsfSBmcm9tICcuL0l0ZXJhYmxlJztcbmltcG9ydCB7SUxpc3QsIExpc3R9IGZyb20gJy4vTGlzdCc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgSU9wdGlvbjxBPiBleHRlbmRzIEl0ZXJhYmxlPEE+IHtcblxuICBnZXQgOiBBO1xuXG59XG5cbmV4cG9ydCBhYnN0cmFjdCBjbGFzcyBPcHRpb248QT4gaW1wbGVtZW50cyBJT3B0aW9uPEE+IHtcblxuICBwdWJsaWMgYWJzdHJhY3QgaXNFbXB0eSgpOiBib29sZWFuO1xuXG4gIGNvbnN0cnVjdG9yKHByb3RlY3RlZCB2YWx1ZTogQSkge1xuICB9XG5cbiAgcHVibGljIGNvdW50KHAgOiAoeCA6IEEpID0+IGJvb2xlYW4pIDogbnVtYmVyIHtcbiAgICByZXR1cm4gdGhpcy50b0xpc3QoKS5jb3VudChwKTtcbiAgfVxuXG4gIHB1YmxpYyBkcm9wKG4gOiBudW1iZXIpIDogSXRlcmFibGU8QT4ge1xuICAgIHJldHVybiB0aGlzLnRvTGlzdCgpLmRyb3Aobik7XG4gIH1cblxuICBwdWJsaWMgZHJvcFJpZ2h0KG4gOiBudW1iZXIpIDogSXRlcmFibGU8QT4ge1xuICAgIHJldHVybiB0aGlzLnRvTGlzdCgpLmRyb3BSaWdodChuKTtcbiAgfVxuXG4gIHB1YmxpYyBkcm9wV2hpbGUocDogKGE6IEEpID0+IGJvb2xlYW4pIDogSXRlcmFibGU8QT4ge1xuICAgIHJldHVybiB0aGlzLnRvTGlzdCgpLmRyb3BXaGlsZShwKTtcbiAgfVxuXG4gIHB1YmxpYyBleGlzdHMocDogKGE6IEEpID0+IGJvb2xlYW4pOiBib29sZWFuIHtcbiAgICByZXR1cm4gIXRoaXMuZmluZChwKS5pc0VtcHR5KCk7XG4gIH1cblxuICBwdWJsaWMgZmluZChwOiAoYTogQSkgPT4gYm9vbGVhbik6IElPcHRpb248QT4ge1xuICAgIHJldHVybiBwKHRoaXMuZ2V0KSA/IHRoaXMgOiBub25lO1xuICB9XG5cbiAgcHVibGljIGZvckVhY2goZjogKGEgOiBBKSA9PiB2b2lkKSB7XG4gICAgZih0aGlzLnZhbHVlKTtcbiAgfVxuXG4gIHB1YmxpYyBmaWx0ZXIocDogKGE6IEEpID0+IGJvb2xlYW4pIDogT3B0aW9uPEE+IHtcbiAgICByZXR1cm4gcCh0aGlzLnZhbHVlKSA/IHRoaXMgOiBuZXcgTm9uZTxBPigpO1xuICB9XG5cbiAgcHVibGljIGZpbHRlck5vdChwOiAoYTogQSkgPT4gYm9vbGVhbikgOiBPcHRpb248QT4ge1xuICAgIHJldHVybiAhcCh0aGlzLnZhbHVlKSA/IHRoaXMgOiBuZXcgTm9uZTxBPigpO1xuICB9XG5cbiAgcHVibGljIGZvbGRMZWZ0PEI+KHo6IEIpOiAob3A6IChiIDogQiwgYSA6IEEpID0+IEIpID0+IEIge1xuICAgIHJldHVybiB0aGlzLnRvTGlzdCgpLmZvbGRMZWZ0KHopO1xuICB9XG5cbiAgcHVibGljIGZvbGRSaWdodDxCPih6OiBCKTogKG9wOiAoYSA6IEEsIGIgOiBCKSA9PiBCKSA9PiBCIHtcbiAgICByZXR1cm4gdGhpcy50b0xpc3QoKS5mb2xkUmlnaHQoeik7XG4gIH1cblxuICBwdWJsaWMgYWJzdHJhY3QgbWFwPEI+KGY6IChvYmplY3Q6IEEpID0+IEIpIDogT3B0aW9uPEI+O1xuXG4gIHB1YmxpYyBnZXQgZ2V0KCkge1xuICAgIHJldHVybiB0aGlzLnZhbHVlO1xuICB9XG5cbiAgcHVibGljIGdldE9yRWxzZShkZWZhdWx0VmFsdWU6IEEpOiBBIHtcbiAgICByZXR1cm4gdGhpcy52YWx1ZSA/IHRoaXMudmFsdWUgOiBkZWZhdWx0VmFsdWU7XG4gIH1cblxuICBwdWJsaWMgaGVhZCgpOiBBIHtcbiAgICByZXR1cm4gdGhpcy5nZXQ7XG4gIH1cblxuICBwdWJsaWMgaGVhZE9wdGlvbigpOiBPcHRpb248QT4ge1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgcHVibGljIGFic3RyYWN0IHNpemUoKSA6IG51bWJlcjtcblxuICBwdWJsaWMgdG9BcnJheSgpIDogQVtdIHtcbiAgICByZXR1cm4gdGhpcy50b0xpc3QoKS50b0FycmF5KCk7XG4gIH1cblxuICBwdWJsaWMgYWJzdHJhY3QgdG9MaXN0KCkgOiBJTGlzdDxBPlxufVxuXG5leHBvcnQgY2xhc3MgU29tZTxBPiBleHRlbmRzIE9wdGlvbjxBPiB7XG5cbiAgY29uc3RydWN0b3IodmFsdWU6IEEpIHtcbiAgICBzdXBlcih2YWx1ZSk7XG4gIH1cblxuICBwdWJsaWMgaXNFbXB0eSgpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICBwdWJsaWMgZ2V0IGdldCgpIHtcbiAgICByZXR1cm4gdGhpcy52YWx1ZTtcbiAgfVxuXG4gIHB1YmxpYyBtYXA8Qj4oZjogKG9iamVjdDogQSkgPT4gQikgOiBPcHRpb248Qj4ge1xuICAgIHJldHVybiBuZXcgU29tZShmKHRoaXMudmFsdWUpKTtcbiAgfVxuXG4gIHB1YmxpYyBzaXplKCk6IG51bWJlciB7XG4gICAgcmV0dXJuIDE7XG4gIH1cblxuICBwdWJsaWMgdG9MaXN0KCkgOiBJTGlzdDxBPiB7XG4gICAgcmV0dXJuIG5ldyBMaXN0KFt0aGlzLnZhbHVlXSk7XG4gIH1cbn1cblxuZXhwb3J0IGNsYXNzIE5vbmU8QT4gZXh0ZW5kcyBPcHRpb248QT4ge1xuXG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHN1cGVyKG51bGwpO1xuICB9XG5cbiAgcHVibGljIGlzRW1wdHkoKSB7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICBwdWJsaWMgZ2V0IGdldCgpOiBBIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ05vbmUuZ2V0Jyk7XG4gIH1cblxuICBwdWJsaWMgbWFwPEI+KGY6IChvYmplY3Q6IEEpID0+IEIpIDogT3B0aW9uPEI+IHtcbiAgICByZXR1cm4gbm9uZTtcbiAgfVxuXG4gIHB1YmxpYyBzaXplKCk6IG51bWJlciB7XG4gICAgcmV0dXJuIDA7XG4gIH1cblxuICBwdWJsaWMgdG9MaXN0KCkgOiBJTGlzdDxBPiB7XG4gICAgcmV0dXJuIG5ldyBMaXN0KFtdKTtcbiAgfVxufVxuXG5leHBvcnQgY29uc3Qgbm9uZTogTm9uZTxhbnk+ID0gbmV3IE5vbmUoKTtcblxuZXhwb3J0IGZ1bmN0aW9uIG9wdGlvbjxUPih4OiBUKTogT3B0aW9uPFQ+IHtcbiAgcmV0dXJuIHggPyBzb21lKHgpIDogbm9uZTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHNvbWU8VD4oeDogVCk6IFNvbWU8VD4ge1xuICByZXR1cm4gbmV3IFNvbWUoeCk7XG59XG4iLCIiXX0=
