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
var Option_1 = require("./Option");
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
var Iterable_1 = require("./Iterable");
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
        var _this = this;
        if (args instanceof es6_shim_1.Array) {
            this.data = args.concat([]);
        }
        else {
            this.data = [];
            args.forEach(function (item) {
                _this.data.push(item);
            });
        }
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
    List.prototype.dropWhile = function (p) {
        throw new Error("dropWhile");
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
    List.prototype._ = function (index) {
        return this.get(index);
    };
    List.prototype.get = function (index) {
        return this.data[index];
    };
    List.prototype.head = function () {
        return this.data[0];
    };
    List.prototype.headOption = function () {
        return Option_1.option(this.head());
    };
    List.prototype.iterator = function () {
        return new ListIterator(this.data.values(), this);
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
    List.prototype.reverse = function () {
        return new List([].concat(this.data).reverse());
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
    List.prototype.toList = function () {
        return list(this.data);
    };
    List.prototype.toString = function () {
        var rawString = this.data.join(', ');
        return "List(" + rawString + ")";
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
var Iterable_1 = require("./Iterable");
var List_1 = require("./List");
var Option_1 = require("./Option");
var es6_shim_1 = require("es6-shim");
Array = es6_shim_1.Array;
var IMap = (function () {
    function IMap(data) {
        var _this = this;
        this.data = new Map();
        if (data) {
            data.forEach(function (pair) {
                _this.data.set(pair[0], pair[1]);
            });
        }
    }
    IMap.prototype.count = function (p) {
        return new IMapIterator(this.data.entries()).count(p);
    };
    IMap.prototype.drop = function (n) {
        var count = 0;
        var newMap = new Map();
        new IMapIterator(this.data.entries()).forEach(function (pair) {
            if (count >= n) {
                newMap.set(pair[0], pair[1]);
            }
        });
        return new IMap(new IMapIterator(this.data.entries()));
    };
    IMap.prototype.dropRight = function (n) {
        var count = this.data.size - n;
        var newMap = new Map();
        new IMapIterator(this.data.entries()).forEach(function (pair) {
            if (count < n) {
                newMap.set(pair[0], pair[1]);
            }
        });
        return new IMap(new IMapIterator(this.data.entries()));
    };
    IMap.prototype.dropWhile = function (p) {
        var count = -1;
        new IMapIterator(this.data.entries()).forEach(function (pair) {
            if (p(pair)) {
                count++;
            }
        });
        return this.drop(count);
    };
    IMap.prototype.filter = function (p) {
        var newInternalMap = new Map();
        new IMapIterator(this.data.entries()).forEach(function (pair) {
            if (p(pair)) {
                newInternalMap.set(pair[0], pair[1]);
            }
        });
        return new IMap(new IMapIterator(newInternalMap.entries()));
    };
    IMap.prototype.filterNot = function (p) {
        var newInternalMap = new Map();
        new IMapIterator(this.data.entries()).forEach(function (pair) {
            if (!p(pair)) {
                newInternalMap.set(pair[0], pair[1]);
            }
        });
        return new IMap(new IMapIterator(newInternalMap.entries()));
    };
    IMap.prototype.foldLeft = function (z) {
        return this.toList().foldLeft(z);
    };
    IMap.prototype.foldRight = function (z) {
        return this.toList().foldRight(z);
    };
    IMap.prototype.forEach = function (f) {
        return new IMapIterator(this.data.entries()).forEach(f);
    };
    IMap.prototype.get = function (key) {
        return Option_1.option(this.data.get(key));
    };
    IMap.prototype.getOrElse = function (key, defaultValue) {
        return Option_1.option(this.data.get(key)).getOrElse(defaultValue);
    };
    IMap.prototype.head = function () {
        return this.data.entries().next().value;
    };
    IMap.prototype.headOption = function () {
        return Option_1.option(this.data.entries().next().value);
    };
    IMap.prototype.iterator = function () {
        return new IMapIterator(this.data.entries());
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
            throw Error("Invalid set " + entry);
        }
    };
    IMap.prototype.map = function (f) {
        var newInternalMap = new Map();
        new IMapIterator(this.data.entries()).forEach(function (pair) {
            var newValue = f(pair);
            newInternalMap.set(newValue[0], newValue[1]);
        });
        return new IMap(new IMapIterator(newInternalMap.entries()));
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
var List_1 = require("./List");
var Option = (function () {
    function Option(value) {
        this.value = value;
    }
    Option.prototype.count = function (p) {
        return this.toList().count(p);
    };
    Option.prototype.forEach = function (f) {
        f(this.value);
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
    Object.defineProperty(Some.prototype, "size", {
        get: function () {
            return 1;
        },
        enumerable: true,
        configurable: true
    });
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
    Object.defineProperty(None.prototype, "size", {
        get: function () {
            return 0;
        },
        enumerable: true,
        configurable: true
    });
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvZXM2LXNoaW0vZXM2LXNoaW0uanMiLCJub2RlX21vZHVsZXMvcHJvY2Vzcy9icm93c2VyLmpzIiwic3JjL2luZGV4LnRzIiwic3JjL21haW4vSXRlcmFibGUudHMiLCJzcmMvbWFpbi9MaXN0LnRzIiwic3JjL21haW4vTWFwLnRzIiwic3JjL21haW4vT3B0aW9uLnRzIiwidHlwaW5ncy9icm93c2VyLmQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7O0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FB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QUM7SUFDZCxDQUFDO0lBRU0sc0JBQU8sR0FBZDtRQUNFLE1BQU0sQ0FBQyxJQUFJLENBQUM7SUFDZCxDQUFDO0lBRUQsc0JBQVcscUJBQUc7YUFBZDtZQUNFLE1BQU0sSUFBSSxLQUFLLENBQUMsVUFBVSxDQUFDLENBQUM7UUFDOUIsQ0FBQzs7O09BQUE7SUFFRCxzQkFBVyxzQkFBSTthQUFmO1lBQ0UsTUFBTSxDQUFDLENBQUMsQ0FBQztRQUNYLENBQUM7OztPQUFBO0lBRU0scUJBQU0sR0FBYjtRQUNFLE1BQU0sQ0FBQyxJQUFJLFdBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUN0QixDQUFDO0lBQ0gsV0FBQztBQUFELENBckJBLEFBcUJDLENBckI0QixNQUFNLEdBcUJsQztBQXJCWSxZQUFJLE9BcUJoQixDQUFBO0FBRVksWUFBSSxHQUFjLElBQUksSUFBSSxFQUFFLENBQUM7QUFFMUMsZ0JBQTBCLENBQUk7SUFDNUIsTUFBTSxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsWUFBSSxDQUFDO0FBQzVCLENBQUM7QUFGZSxjQUFNLFNBRXJCLENBQUE7QUFFRCxjQUF3QixDQUFJO0lBQzFCLE1BQU0sQ0FBQyxJQUFJLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNyQixDQUFDO0FBRmUsWUFBSSxPQUVuQixDQUFBOztBQ2hJRCIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIgLyohXG4gICogaHR0cHM6Ly9naXRodWIuY29tL3BhdWxtaWxsci9lczYtc2hpbVxuICAqIEBsaWNlbnNlIGVzNi1zaGltIENvcHlyaWdodCAyMDEzLTIwMTYgYnkgUGF1bCBNaWxsZXIgKGh0dHA6Ly9wYXVsbWlsbHIuY29tKVxuICAqICAgYW5kIGNvbnRyaWJ1dG9ycywgIE1JVCBMaWNlbnNlXG4gICogZXM2LXNoaW06IHYwLjM1LjBcbiAgKiBzZWUgaHR0cHM6Ly9naXRodWIuY29tL3BhdWxtaWxsci9lczYtc2hpbS9ibG9iLzAuMzUuMC9MSUNFTlNFXG4gICogRGV0YWlscyBhbmQgZG9jdW1lbnRhdGlvbjpcbiAgKiBodHRwczovL2dpdGh1Yi5jb20vcGF1bG1pbGxyL2VzNi1zaGltL1xuICAqL1xuXG4vLyBVTUQgKFVuaXZlcnNhbCBNb2R1bGUgRGVmaW5pdGlvbilcbi8vIHNlZSBodHRwczovL2dpdGh1Yi5jb20vdW1kanMvdW1kL2Jsb2IvbWFzdGVyL3JldHVybkV4cG9ydHMuanNcbihmdW5jdGlvbiAocm9vdCwgZmFjdG9yeSkge1xuICAvKmdsb2JhbCBkZWZpbmUsIG1vZHVsZSwgZXhwb3J0cyAqL1xuICBpZiAodHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kKSB7XG4gICAgLy8gQU1ELiBSZWdpc3RlciBhcyBhbiBhbm9ueW1vdXMgbW9kdWxlLlxuICAgIGRlZmluZShmYWN0b3J5KTtcbiAgfSBlbHNlIGlmICh0eXBlb2YgZXhwb3J0cyA9PT0gJ29iamVjdCcpIHtcbiAgICAvLyBOb2RlLiBEb2VzIG5vdCB3b3JrIHdpdGggc3RyaWN0IENvbW1vbkpTLCBidXRcbiAgICAvLyBvbmx5IENvbW1vbkpTLWxpa2UgZW52aXJvbm1lbnRzIHRoYXQgc3VwcG9ydCBtb2R1bGUuZXhwb3J0cyxcbiAgICAvLyBsaWtlIE5vZGUuXG4gICAgbW9kdWxlLmV4cG9ydHMgPSBmYWN0b3J5KCk7XG4gIH0gZWxzZSB7XG4gICAgLy8gQnJvd3NlciBnbG9iYWxzIChyb290IGlzIHdpbmRvdylcbiAgICByb290LnJldHVybkV4cG9ydHMgPSBmYWN0b3J5KCk7XG4gIH1cbn0odGhpcywgZnVuY3Rpb24gKCkge1xuICAndXNlIHN0cmljdCc7XG5cbiAgdmFyIF9hcHBseSA9IEZ1bmN0aW9uLmNhbGwuYmluZChGdW5jdGlvbi5hcHBseSk7XG4gIHZhciBfY2FsbCA9IEZ1bmN0aW9uLmNhbGwuYmluZChGdW5jdGlvbi5jYWxsKTtcbiAgdmFyIGlzQXJyYXkgPSBBcnJheS5pc0FycmF5O1xuICB2YXIga2V5cyA9IE9iamVjdC5rZXlzO1xuXG4gIHZhciBub3QgPSBmdW5jdGlvbiBub3RUaHVua2VyKGZ1bmMpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24gbm90VGh1bmsoKSB7IHJldHVybiAhX2FwcGx5KGZ1bmMsIHRoaXMsIGFyZ3VtZW50cyk7IH07XG4gIH07XG4gIHZhciB0aHJvd3NFcnJvciA9IGZ1bmN0aW9uIChmdW5jKSB7XG4gICAgdHJ5IHtcbiAgICAgIGZ1bmMoKTtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gIH07XG4gIHZhciB2YWx1ZU9yRmFsc2VJZlRocm93cyA9IGZ1bmN0aW9uIHZhbHVlT3JGYWxzZUlmVGhyb3dzKGZ1bmMpIHtcbiAgICB0cnkge1xuICAgICAgcmV0dXJuIGZ1bmMoKTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICB9O1xuXG4gIHZhciBpc0NhbGxhYmxlV2l0aG91dE5ldyA9IG5vdCh0aHJvd3NFcnJvcik7XG4gIHZhciBhcmVQcm9wZXJ0eURlc2NyaXB0b3JzU3VwcG9ydGVkID0gZnVuY3Rpb24gKCkge1xuICAgIC8vIGlmIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSBleGlzdHMgYnV0IHRocm93cywgaXQncyBJRSA4XG4gICAgcmV0dXJuICF0aHJvd3NFcnJvcihmdW5jdGlvbiAoKSB7IE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh7fSwgJ3gnLCB7IGdldDogZnVuY3Rpb24gKCkge30gfSk7IH0pO1xuICB9O1xuICB2YXIgc3VwcG9ydHNEZXNjcmlwdG9ycyA9ICEhT2JqZWN0LmRlZmluZVByb3BlcnR5ICYmIGFyZVByb3BlcnR5RGVzY3JpcHRvcnNTdXBwb3J0ZWQoKTtcbiAgdmFyIGZ1bmN0aW9uc0hhdmVOYW1lcyA9IChmdW5jdGlvbiBmb28oKSB7fSkubmFtZSA9PT0gJ2Zvbyc7XG5cbiAgdmFyIF9mb3JFYWNoID0gRnVuY3Rpb24uY2FsbC5iaW5kKEFycmF5LnByb3RvdHlwZS5mb3JFYWNoKTtcbiAgdmFyIF9yZWR1Y2UgPSBGdW5jdGlvbi5jYWxsLmJpbmQoQXJyYXkucHJvdG90eXBlLnJlZHVjZSk7XG4gIHZhciBfZmlsdGVyID0gRnVuY3Rpb24uY2FsbC5iaW5kKEFycmF5LnByb3RvdHlwZS5maWx0ZXIpO1xuICB2YXIgX3NvbWUgPSBGdW5jdGlvbi5jYWxsLmJpbmQoQXJyYXkucHJvdG90eXBlLnNvbWUpO1xuXG4gIHZhciBkZWZpbmVQcm9wZXJ0eSA9IGZ1bmN0aW9uIChvYmplY3QsIG5hbWUsIHZhbHVlLCBmb3JjZSkge1xuICAgIGlmICghZm9yY2UgJiYgbmFtZSBpbiBvYmplY3QpIHsgcmV0dXJuOyB9XG4gICAgaWYgKHN1cHBvcnRzRGVzY3JpcHRvcnMpIHtcbiAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShvYmplY3QsIG5hbWUsIHtcbiAgICAgICAgY29uZmlndXJhYmxlOiB0cnVlLFxuICAgICAgICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgICAgICAgd3JpdGFibGU6IHRydWUsXG4gICAgICAgIHZhbHVlOiB2YWx1ZVxuICAgICAgfSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIG9iamVjdFtuYW1lXSA9IHZhbHVlO1xuICAgIH1cbiAgfTtcblxuICAvLyBEZWZpbmUgY29uZmlndXJhYmxlLCB3cml0YWJsZSBhbmQgbm9uLWVudW1lcmFibGUgcHJvcHNcbiAgLy8gaWYgdGhleSBkb27igJl0IGV4aXN0LlxuICB2YXIgZGVmaW5lUHJvcGVydGllcyA9IGZ1bmN0aW9uIChvYmplY3QsIG1hcCwgZm9yY2VPdmVycmlkZSkge1xuICAgIF9mb3JFYWNoKGtleXMobWFwKSwgZnVuY3Rpb24gKG5hbWUpIHtcbiAgICAgIHZhciBtZXRob2QgPSBtYXBbbmFtZV07XG4gICAgICBkZWZpbmVQcm9wZXJ0eShvYmplY3QsIG5hbWUsIG1ldGhvZCwgISFmb3JjZU92ZXJyaWRlKTtcbiAgICB9KTtcbiAgfTtcblxuICB2YXIgX3RvU3RyaW5nID0gRnVuY3Rpb24uY2FsbC5iaW5kKE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcpO1xuICB2YXIgaXNDYWxsYWJsZSA9IHR5cGVvZiAvYWJjLyA9PT0gJ2Z1bmN0aW9uJyA/IGZ1bmN0aW9uIElzQ2FsbGFibGVTbG93KHgpIHtcbiAgICAvLyBTb21lIG9sZCBicm93c2VycyAoSUUsIEZGKSBzYXkgdGhhdCB0eXBlb2YgL2FiYy8gPT09ICdmdW5jdGlvbidcbiAgICByZXR1cm4gdHlwZW9mIHggPT09ICdmdW5jdGlvbicgJiYgX3RvU3RyaW5nKHgpID09PSAnW29iamVjdCBGdW5jdGlvbl0nO1xuICB9IDogZnVuY3Rpb24gSXNDYWxsYWJsZUZhc3QoeCkgeyByZXR1cm4gdHlwZW9mIHggPT09ICdmdW5jdGlvbic7IH07XG5cbiAgdmFyIFZhbHVlID0ge1xuICAgIGdldHRlcjogZnVuY3Rpb24gKG9iamVjdCwgbmFtZSwgZ2V0dGVyKSB7XG4gICAgICBpZiAoIXN1cHBvcnRzRGVzY3JpcHRvcnMpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignZ2V0dGVycyByZXF1aXJlIHRydWUgRVM1IHN1cHBvcnQnKTtcbiAgICAgIH1cbiAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShvYmplY3QsIG5hbWUsIHtcbiAgICAgICAgY29uZmlndXJhYmxlOiB0cnVlLFxuICAgICAgICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgICAgICAgZ2V0OiBnZXR0ZXJcbiAgICAgIH0pO1xuICAgIH0sXG4gICAgcHJveHk6IGZ1bmN0aW9uIChvcmlnaW5hbE9iamVjdCwga2V5LCB0YXJnZXRPYmplY3QpIHtcbiAgICAgIGlmICghc3VwcG9ydHNEZXNjcmlwdG9ycykge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdnZXR0ZXJzIHJlcXVpcmUgdHJ1ZSBFUzUgc3VwcG9ydCcpO1xuICAgICAgfVxuICAgICAgdmFyIG9yaWdpbmFsRGVzY3JpcHRvciA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3Iob3JpZ2luYWxPYmplY3QsIGtleSk7XG4gICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGFyZ2V0T2JqZWN0LCBrZXksIHtcbiAgICAgICAgY29uZmlndXJhYmxlOiBvcmlnaW5hbERlc2NyaXB0b3IuY29uZmlndXJhYmxlLFxuICAgICAgICBlbnVtZXJhYmxlOiBvcmlnaW5hbERlc2NyaXB0b3IuZW51bWVyYWJsZSxcbiAgICAgICAgZ2V0OiBmdW5jdGlvbiBnZXRLZXkoKSB7IHJldHVybiBvcmlnaW5hbE9iamVjdFtrZXldOyB9LFxuICAgICAgICBzZXQ6IGZ1bmN0aW9uIHNldEtleSh2YWx1ZSkgeyBvcmlnaW5hbE9iamVjdFtrZXldID0gdmFsdWU7IH1cbiAgICAgIH0pO1xuICAgIH0sXG4gICAgcmVkZWZpbmU6IGZ1bmN0aW9uIChvYmplY3QsIHByb3BlcnR5LCBuZXdWYWx1ZSkge1xuICAgICAgaWYgKHN1cHBvcnRzRGVzY3JpcHRvcnMpIHtcbiAgICAgICAgdmFyIGRlc2NyaXB0b3IgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKG9iamVjdCwgcHJvcGVydHkpO1xuICAgICAgICBkZXNjcmlwdG9yLnZhbHVlID0gbmV3VmFsdWU7XG4gICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShvYmplY3QsIHByb3BlcnR5LCBkZXNjcmlwdG9yKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG9iamVjdFtwcm9wZXJ0eV0gPSBuZXdWYWx1ZTtcbiAgICAgIH1cbiAgICB9LFxuICAgIGRlZmluZUJ5RGVzY3JpcHRvcjogZnVuY3Rpb24gKG9iamVjdCwgcHJvcGVydHksIGRlc2NyaXB0b3IpIHtcbiAgICAgIGlmIChzdXBwb3J0c0Rlc2NyaXB0b3JzKSB7XG4gICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShvYmplY3QsIHByb3BlcnR5LCBkZXNjcmlwdG9yKTtcbiAgICAgIH0gZWxzZSBpZiAoJ3ZhbHVlJyBpbiBkZXNjcmlwdG9yKSB7XG4gICAgICAgIG9iamVjdFtwcm9wZXJ0eV0gPSBkZXNjcmlwdG9yLnZhbHVlO1xuICAgICAgfVxuICAgIH0sXG4gICAgcHJlc2VydmVUb1N0cmluZzogZnVuY3Rpb24gKHRhcmdldCwgc291cmNlKSB7XG4gICAgICBpZiAoc291cmNlICYmIGlzQ2FsbGFibGUoc291cmNlLnRvU3RyaW5nKSkge1xuICAgICAgICBkZWZpbmVQcm9wZXJ0eSh0YXJnZXQsICd0b1N0cmluZycsIHNvdXJjZS50b1N0cmluZy5iaW5kKHNvdXJjZSksIHRydWUpO1xuICAgICAgfVxuICAgIH1cbiAgfTtcblxuICAvLyBTaW1wbGUgc2hpbSBmb3IgT2JqZWN0LmNyZWF0ZSBvbiBFUzMgYnJvd3NlcnNcbiAgLy8gKHVubGlrZSByZWFsIHNoaW0sIG5vIGF0dGVtcHQgdG8gc3VwcG9ydCBgcHJvdG90eXBlID09PSBudWxsYClcbiAgdmFyIGNyZWF0ZSA9IE9iamVjdC5jcmVhdGUgfHwgZnVuY3Rpb24gKHByb3RvdHlwZSwgcHJvcGVydGllcykge1xuICAgIHZhciBQcm90b3R5cGUgPSBmdW5jdGlvbiBQcm90b3R5cGUoKSB7fTtcbiAgICBQcm90b3R5cGUucHJvdG90eXBlID0gcHJvdG90eXBlO1xuICAgIHZhciBvYmplY3QgPSBuZXcgUHJvdG90eXBlKCk7XG4gICAgaWYgKHR5cGVvZiBwcm9wZXJ0aWVzICE9PSAndW5kZWZpbmVkJykge1xuICAgICAga2V5cyhwcm9wZXJ0aWVzKS5mb3JFYWNoKGZ1bmN0aW9uIChrZXkpIHtcbiAgICAgICAgVmFsdWUuZGVmaW5lQnlEZXNjcmlwdG9yKG9iamVjdCwga2V5LCBwcm9wZXJ0aWVzW2tleV0pO1xuICAgICAgfSk7XG4gICAgfVxuICAgIHJldHVybiBvYmplY3Q7XG4gIH07XG5cbiAgdmFyIHN1cHBvcnRzU3ViY2xhc3NpbmcgPSBmdW5jdGlvbiAoQywgZikge1xuICAgIGlmICghT2JqZWN0LnNldFByb3RvdHlwZU9mKSB7IHJldHVybiBmYWxzZTsgLyogc2tpcCB0ZXN0IG9uIElFIDwgMTEgKi8gfVxuICAgIHJldHVybiB2YWx1ZU9yRmFsc2VJZlRocm93cyhmdW5jdGlvbiAoKSB7XG4gICAgICB2YXIgU3ViID0gZnVuY3Rpb24gU3ViY2xhc3MoYXJnKSB7XG4gICAgICAgIHZhciBvID0gbmV3IEMoYXJnKTtcbiAgICAgICAgT2JqZWN0LnNldFByb3RvdHlwZU9mKG8sIFN1YmNsYXNzLnByb3RvdHlwZSk7XG4gICAgICAgIHJldHVybiBvO1xuICAgICAgfTtcbiAgICAgIE9iamVjdC5zZXRQcm90b3R5cGVPZihTdWIsIEMpO1xuICAgICAgU3ViLnByb3RvdHlwZSA9IGNyZWF0ZShDLnByb3RvdHlwZSwge1xuICAgICAgICBjb25zdHJ1Y3RvcjogeyB2YWx1ZTogU3ViIH1cbiAgICAgIH0pO1xuICAgICAgcmV0dXJuIGYoU3ViKTtcbiAgICB9KTtcbiAgfTtcblxuICB2YXIgZ2V0R2xvYmFsID0gZnVuY3Rpb24gKCkge1xuICAgIC8qIGdsb2JhbCBzZWxmLCB3aW5kb3csIGdsb2JhbCAqL1xuICAgIC8vIHRoZSBvbmx5IHJlbGlhYmxlIG1lYW5zIHRvIGdldCB0aGUgZ2xvYmFsIG9iamVjdCBpc1xuICAgIC8vIGBGdW5jdGlvbigncmV0dXJuIHRoaXMnKSgpYFxuICAgIC8vIEhvd2V2ZXIsIHRoaXMgY2F1c2VzIENTUCB2aW9sYXRpb25zIGluIENocm9tZSBhcHBzLlxuICAgIGlmICh0eXBlb2Ygc2VsZiAhPT0gJ3VuZGVmaW5lZCcpIHsgcmV0dXJuIHNlbGY7IH1cbiAgICBpZiAodHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcpIHsgcmV0dXJuIHdpbmRvdzsgfVxuICAgIGlmICh0eXBlb2YgZ2xvYmFsICE9PSAndW5kZWZpbmVkJykgeyByZXR1cm4gZ2xvYmFsOyB9XG4gICAgdGhyb3cgbmV3IEVycm9yKCd1bmFibGUgdG8gbG9jYXRlIGdsb2JhbCBvYmplY3QnKTtcbiAgfTtcblxuICB2YXIgZ2xvYmFscyA9IGdldEdsb2JhbCgpO1xuICB2YXIgZ2xvYmFsSXNGaW5pdGUgPSBnbG9iYWxzLmlzRmluaXRlO1xuICB2YXIgX2luZGV4T2YgPSBGdW5jdGlvbi5jYWxsLmJpbmQoU3RyaW5nLnByb3RvdHlwZS5pbmRleE9mKTtcbiAgdmFyIF9hcnJheUluZGV4T2ZBcHBseSA9IEZ1bmN0aW9uLmFwcGx5LmJpbmQoQXJyYXkucHJvdG90eXBlLmluZGV4T2YpO1xuICB2YXIgX2NvbmNhdCA9IEZ1bmN0aW9uLmNhbGwuYmluZChBcnJheS5wcm90b3R5cGUuY29uY2F0KTtcbiAgdmFyIF9zb3J0ID0gRnVuY3Rpb24uY2FsbC5iaW5kKEFycmF5LnByb3RvdHlwZS5zb3J0KTtcbiAgdmFyIF9zdHJTbGljZSA9IEZ1bmN0aW9uLmNhbGwuYmluZChTdHJpbmcucHJvdG90eXBlLnNsaWNlKTtcbiAgdmFyIF9wdXNoID0gRnVuY3Rpb24uY2FsbC5iaW5kKEFycmF5LnByb3RvdHlwZS5wdXNoKTtcbiAgdmFyIF9wdXNoQXBwbHkgPSBGdW5jdGlvbi5hcHBseS5iaW5kKEFycmF5LnByb3RvdHlwZS5wdXNoKTtcbiAgdmFyIF9zaGlmdCA9IEZ1bmN0aW9uLmNhbGwuYmluZChBcnJheS5wcm90b3R5cGUuc2hpZnQpO1xuICB2YXIgX21heCA9IE1hdGgubWF4O1xuICB2YXIgX21pbiA9IE1hdGgubWluO1xuICB2YXIgX2Zsb29yID0gTWF0aC5mbG9vcjtcbiAgdmFyIF9hYnMgPSBNYXRoLmFicztcbiAgdmFyIF9sb2cgPSBNYXRoLmxvZztcbiAgdmFyIF9zcXJ0ID0gTWF0aC5zcXJ0O1xuICB2YXIgX2hhc093blByb3BlcnR5ID0gRnVuY3Rpb24uY2FsbC5iaW5kKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkpO1xuICB2YXIgQXJyYXlJdGVyYXRvcjsgLy8gbWFrZSBvdXIgaW1wbGVtZW50YXRpb24gcHJpdmF0ZVxuICB2YXIgbm9vcCA9IGZ1bmN0aW9uICgpIHt9O1xuXG4gIHZhciBTeW1ib2wgPSBnbG9iYWxzLlN5bWJvbCB8fCB7fTtcbiAgdmFyIHN5bWJvbFNwZWNpZXMgPSBTeW1ib2wuc3BlY2llcyB8fCAnQEBzcGVjaWVzJztcblxuICB2YXIgbnVtYmVySXNOYU4gPSBOdW1iZXIuaXNOYU4gfHwgZnVuY3Rpb24gaXNOYU4odmFsdWUpIHtcbiAgICAvLyBOYU4gIT09IE5hTiwgYnV0IHRoZXkgYXJlIGlkZW50aWNhbC5cbiAgICAvLyBOYU5zIGFyZSB0aGUgb25seSBub24tcmVmbGV4aXZlIHZhbHVlLCBpLmUuLCBpZiB4ICE9PSB4LFxuICAgIC8vIHRoZW4geCBpcyBOYU4uXG4gICAgLy8gaXNOYU4gaXMgYnJva2VuOiBpdCBjb252ZXJ0cyBpdHMgYXJndW1lbnQgdG8gbnVtYmVyLCBzb1xuICAgIC8vIGlzTmFOKCdmb28nKSA9PiB0cnVlXG4gICAgcmV0dXJuIHZhbHVlICE9PSB2YWx1ZTtcbiAgfTtcbiAgdmFyIG51bWJlcklzRmluaXRlID0gTnVtYmVyLmlzRmluaXRlIHx8IGZ1bmN0aW9uIGlzRmluaXRlKHZhbHVlKSB7XG4gICAgcmV0dXJuIHR5cGVvZiB2YWx1ZSA9PT0gJ251bWJlcicgJiYgZ2xvYmFsSXNGaW5pdGUodmFsdWUpO1xuICB9O1xuXG4gIC8vIHRha2VuIGRpcmVjdGx5IGZyb20gaHR0cHM6Ly9naXRodWIuY29tL2xqaGFyYi9pcy1hcmd1bWVudHMvYmxvYi9tYXN0ZXIvaW5kZXguanNcbiAgLy8gY2FuIGJlIHJlcGxhY2VkIHdpdGggcmVxdWlyZSgnaXMtYXJndW1lbnRzJykgaWYgd2UgZXZlciB1c2UgYSBidWlsZCBwcm9jZXNzIGluc3RlYWRcbiAgdmFyIGlzU3RhbmRhcmRBcmd1bWVudHMgPSBmdW5jdGlvbiBpc0FyZ3VtZW50cyh2YWx1ZSkge1xuICAgIHJldHVybiBfdG9TdHJpbmcodmFsdWUpID09PSAnW29iamVjdCBBcmd1bWVudHNdJztcbiAgfTtcbiAgdmFyIGlzTGVnYWN5QXJndW1lbnRzID0gZnVuY3Rpb24gaXNBcmd1bWVudHModmFsdWUpIHtcbiAgICByZXR1cm4gdmFsdWUgIT09IG51bGwgJiZcbiAgICAgIHR5cGVvZiB2YWx1ZSA9PT0gJ29iamVjdCcgJiZcbiAgICAgIHR5cGVvZiB2YWx1ZS5sZW5ndGggPT09ICdudW1iZXInICYmXG4gICAgICB2YWx1ZS5sZW5ndGggPj0gMCAmJlxuICAgICAgX3RvU3RyaW5nKHZhbHVlKSAhPT0gJ1tvYmplY3QgQXJyYXldJyAmJlxuICAgICAgX3RvU3RyaW5nKHZhbHVlLmNhbGxlZSkgPT09ICdbb2JqZWN0IEZ1bmN0aW9uXSc7XG4gIH07XG4gIHZhciBpc0FyZ3VtZW50cyA9IGlzU3RhbmRhcmRBcmd1bWVudHMoYXJndW1lbnRzKSA/IGlzU3RhbmRhcmRBcmd1bWVudHMgOiBpc0xlZ2FjeUFyZ3VtZW50cztcblxuICB2YXIgVHlwZSA9IHtcbiAgICBwcmltaXRpdmU6IGZ1bmN0aW9uICh4KSB7IHJldHVybiB4ID09PSBudWxsIHx8ICh0eXBlb2YgeCAhPT0gJ2Z1bmN0aW9uJyAmJiB0eXBlb2YgeCAhPT0gJ29iamVjdCcpOyB9LFxuICAgIG9iamVjdDogZnVuY3Rpb24gKHgpIHsgcmV0dXJuIHggIT09IG51bGwgJiYgdHlwZW9mIHggPT09ICdvYmplY3QnOyB9LFxuICAgIHN0cmluZzogZnVuY3Rpb24gKHgpIHsgcmV0dXJuIF90b1N0cmluZyh4KSA9PT0gJ1tvYmplY3QgU3RyaW5nXSc7IH0sXG4gICAgcmVnZXg6IGZ1bmN0aW9uICh4KSB7IHJldHVybiBfdG9TdHJpbmcoeCkgPT09ICdbb2JqZWN0IFJlZ0V4cF0nOyB9LFxuICAgIHN5bWJvbDogZnVuY3Rpb24gKHgpIHtcbiAgICAgIHJldHVybiB0eXBlb2YgZ2xvYmFscy5TeW1ib2wgPT09ICdmdW5jdGlvbicgJiYgdHlwZW9mIHggPT09ICdzeW1ib2wnO1xuICAgIH1cbiAgfTtcblxuICB2YXIgb3ZlcnJpZGVOYXRpdmUgPSBmdW5jdGlvbiBvdmVycmlkZU5hdGl2ZShvYmplY3QsIHByb3BlcnR5LCByZXBsYWNlbWVudCkge1xuICAgIHZhciBvcmlnaW5hbCA9IG9iamVjdFtwcm9wZXJ0eV07XG4gICAgZGVmaW5lUHJvcGVydHkob2JqZWN0LCBwcm9wZXJ0eSwgcmVwbGFjZW1lbnQsIHRydWUpO1xuICAgIFZhbHVlLnByZXNlcnZlVG9TdHJpbmcob2JqZWN0W3Byb3BlcnR5XSwgb3JpZ2luYWwpO1xuICB9O1xuXG4gIHZhciBoYXNTeW1ib2xzID0gdHlwZW9mIFN5bWJvbCA9PT0gJ2Z1bmN0aW9uJyAmJiB0eXBlb2YgU3ltYm9sWydmb3InXSA9PT0gJ2Z1bmN0aW9uJyAmJiBUeXBlLnN5bWJvbChTeW1ib2woKSk7XG5cbiAgLy8gVGhpcyBpcyBhIHByaXZhdGUgbmFtZSBpbiB0aGUgZXM2IHNwZWMsIGVxdWFsIHRvICdbU3ltYm9sLml0ZXJhdG9yXSdcbiAgLy8gd2UncmUgZ29pbmcgdG8gdXNlIGFuIGFyYml0cmFyeSBfLXByZWZpeGVkIG5hbWUgdG8gbWFrZSBvdXIgc2hpbXNcbiAgLy8gd29yayBwcm9wZXJseSB3aXRoIGVhY2ggb3RoZXIsIGV2ZW4gdGhvdWdoIHdlIGRvbid0IGhhdmUgZnVsbCBJdGVyYXRvclxuICAvLyBzdXBwb3J0LiAgVGhhdCBpcywgYEFycmF5LmZyb20obWFwLmtleXMoKSlgIHdpbGwgd29yaywgYnV0IHdlIGRvbid0XG4gIC8vIHByZXRlbmQgdG8gZXhwb3J0IGEgXCJyZWFsXCIgSXRlcmF0b3IgaW50ZXJmYWNlLlxuICB2YXIgJGl0ZXJhdG9yJCA9IFR5cGUuc3ltYm9sKFN5bWJvbC5pdGVyYXRvcikgPyBTeW1ib2wuaXRlcmF0b3IgOiAnX2VzNi1zaGltIGl0ZXJhdG9yXyc7XG4gIC8vIEZpcmVmb3ggc2hpcHMgYSBwYXJ0aWFsIGltcGxlbWVudGF0aW9uIHVzaW5nIHRoZSBuYW1lIEBAaXRlcmF0b3IuXG4gIC8vIGh0dHBzOi8vYnVnemlsbGEubW96aWxsYS5vcmcvc2hvd19idWcuY2dpP2lkPTkwNzA3NyNjMTRcbiAgLy8gU28gdXNlIHRoYXQgbmFtZSBpZiB3ZSBkZXRlY3QgaXQuXG4gIGlmIChnbG9iYWxzLlNldCAmJiB0eXBlb2YgbmV3IGdsb2JhbHMuU2V0KClbJ0BAaXRlcmF0b3InXSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICRpdGVyYXRvciQgPSAnQEBpdGVyYXRvcic7XG4gIH1cblxuICAvLyBSZWZsZWN0XG4gIGlmICghZ2xvYmFscy5SZWZsZWN0KSB7XG4gICAgZGVmaW5lUHJvcGVydHkoZ2xvYmFscywgJ1JlZmxlY3QnLCB7fSwgdHJ1ZSk7XG4gIH1cbiAgdmFyIFJlZmxlY3QgPSBnbG9iYWxzLlJlZmxlY3Q7XG5cbiAgdmFyICRTdHJpbmcgPSBTdHJpbmc7XG5cbiAgdmFyIEVTID0ge1xuICAgIC8vIGh0dHBzOi8vcGVvcGxlLm1vemlsbGEub3JnL35qb3JlbmRvcmZmL2VzNi1kcmFmdC5odG1sI3NlYy1jYWxsLWYtdi1hcmdzXG4gICAgQ2FsbDogZnVuY3Rpb24gQ2FsbChGLCBWKSB7XG4gICAgICB2YXIgYXJncyA9IGFyZ3VtZW50cy5sZW5ndGggPiAyID8gYXJndW1lbnRzWzJdIDogW107XG4gICAgICBpZiAoIUVTLklzQ2FsbGFibGUoRikpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihGICsgJyBpcyBub3QgYSBmdW5jdGlvbicpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIF9hcHBseShGLCBWLCBhcmdzKTtcbiAgICB9LFxuXG4gICAgUmVxdWlyZU9iamVjdENvZXJjaWJsZTogZnVuY3Rpb24gKHgsIG9wdE1lc3NhZ2UpIHtcbiAgICAgIC8qIGpzaGludCBlcW51bGw6dHJ1ZSAqL1xuICAgICAgaWYgKHggPT0gbnVsbCkge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKG9wdE1lc3NhZ2UgfHwgJ0Nhbm5vdCBjYWxsIG1ldGhvZCBvbiAnICsgeCk7XG4gICAgICB9XG4gICAgICByZXR1cm4geDtcbiAgICB9LFxuXG4gICAgLy8gVGhpcyBtaWdodCBtaXNzIHRoZSBcIihub24tc3RhbmRhcmQgZXhvdGljIGFuZCBkb2VzIG5vdCBpbXBsZW1lbnRcbiAgICAvLyBbW0NhbGxdXSlcIiBjYXNlIGZyb21cbiAgICAvLyBodHRwOi8vd3d3LmVjbWEtaW50ZXJuYXRpb25hbC5vcmcvZWNtYS0yNjIvNi4wLyNzZWMtdHlwZW9mLW9wZXJhdG9yLXJ1bnRpbWUtc2VtYW50aWNzLWV2YWx1YXRpb25cbiAgICAvLyBidXQgd2UgY2FuJ3QgZmluZCBhbnkgZXZpZGVuY2UgdGhlc2Ugb2JqZWN0cyBleGlzdCBpbiBwcmFjdGljZS5cbiAgICAvLyBJZiB3ZSBmaW5kIHNvbWUgaW4gdGhlIGZ1dHVyZSwgeW91IGNvdWxkIHRlc3QgYE9iamVjdCh4KSA9PT0geGAsXG4gICAgLy8gd2hpY2ggaXMgcmVsaWFibGUgYWNjb3JkaW5nIHRvXG4gICAgLy8gaHR0cDovL3d3dy5lY21hLWludGVybmF0aW9uYWwub3JnL2VjbWEtMjYyLzYuMC8jc2VjLXRvb2JqZWN0XG4gICAgLy8gYnV0IGlzIG5vdCB3ZWxsIG9wdGltaXplZCBieSBydW50aW1lcyBhbmQgY3JlYXRlcyBhbiBvYmplY3RcbiAgICAvLyB3aGVuZXZlciBpdCByZXR1cm5zIGZhbHNlLCBhbmQgdGh1cyBpcyB2ZXJ5IHNsb3cuXG4gICAgVHlwZUlzT2JqZWN0OiBmdW5jdGlvbiAoeCkge1xuICAgICAgaWYgKHggPT09IHZvaWQgMCB8fCB4ID09PSBudWxsIHx8IHggPT09IHRydWUgfHwgeCA9PT0gZmFsc2UpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHR5cGVvZiB4ID09PSAnZnVuY3Rpb24nIHx8IHR5cGVvZiB4ID09PSAnb2JqZWN0JztcbiAgICB9LFxuXG4gICAgVG9PYmplY3Q6IGZ1bmN0aW9uIChvLCBvcHRNZXNzYWdlKSB7XG4gICAgICByZXR1cm4gT2JqZWN0KEVTLlJlcXVpcmVPYmplY3RDb2VyY2libGUobywgb3B0TWVzc2FnZSkpO1xuICAgIH0sXG5cbiAgICBJc0NhbGxhYmxlOiBpc0NhbGxhYmxlLFxuXG4gICAgSXNDb25zdHJ1Y3RvcjogZnVuY3Rpb24gKHgpIHtcbiAgICAgIC8vIFdlIGNhbid0IHRlbGwgY2FsbGFibGVzIGZyb20gY29uc3RydWN0b3JzIGluIEVTNVxuICAgICAgcmV0dXJuIEVTLklzQ2FsbGFibGUoeCk7XG4gICAgfSxcblxuICAgIFRvSW50MzI6IGZ1bmN0aW9uICh4KSB7XG4gICAgICByZXR1cm4gRVMuVG9OdW1iZXIoeCkgPj4gMDtcbiAgICB9LFxuXG4gICAgVG9VaW50MzI6IGZ1bmN0aW9uICh4KSB7XG4gICAgICByZXR1cm4gRVMuVG9OdW1iZXIoeCkgPj4+IDA7XG4gICAgfSxcblxuICAgIFRvTnVtYmVyOiBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgIGlmIChfdG9TdHJpbmcodmFsdWUpID09PSAnW29iamVjdCBTeW1ib2xdJykge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdDYW5ub3QgY29udmVydCBhIFN5bWJvbCB2YWx1ZSB0byBhIG51bWJlcicpO1xuICAgICAgfVxuICAgICAgcmV0dXJuICt2YWx1ZTtcbiAgICB9LFxuXG4gICAgVG9JbnRlZ2VyOiBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgIHZhciBudW1iZXIgPSBFUy5Ub051bWJlcih2YWx1ZSk7XG4gICAgICBpZiAobnVtYmVySXNOYU4obnVtYmVyKSkgeyByZXR1cm4gMDsgfVxuICAgICAgaWYgKG51bWJlciA9PT0gMCB8fCAhbnVtYmVySXNGaW5pdGUobnVtYmVyKSkgeyByZXR1cm4gbnVtYmVyOyB9XG4gICAgICByZXR1cm4gKG51bWJlciA+IDAgPyAxIDogLTEpICogX2Zsb29yKF9hYnMobnVtYmVyKSk7XG4gICAgfSxcblxuICAgIFRvTGVuZ3RoOiBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgIHZhciBsZW4gPSBFUy5Ub0ludGVnZXIodmFsdWUpO1xuICAgICAgaWYgKGxlbiA8PSAwKSB7IHJldHVybiAwOyB9IC8vIGluY2x1ZGVzIGNvbnZlcnRpbmcgLTAgdG8gKzBcbiAgICAgIGlmIChsZW4gPiBOdW1iZXIuTUFYX1NBRkVfSU5URUdFUikgeyByZXR1cm4gTnVtYmVyLk1BWF9TQUZFX0lOVEVHRVI7IH1cbiAgICAgIHJldHVybiBsZW47XG4gICAgfSxcblxuICAgIFNhbWVWYWx1ZTogZnVuY3Rpb24gKGEsIGIpIHtcbiAgICAgIGlmIChhID09PSBiKSB7XG4gICAgICAgIC8vIDAgPT09IC0wLCBidXQgdGhleSBhcmUgbm90IGlkZW50aWNhbC5cbiAgICAgICAgaWYgKGEgPT09IDApIHsgcmV0dXJuIDEgLyBhID09PSAxIC8gYjsgfVxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBudW1iZXJJc05hTihhKSAmJiBudW1iZXJJc05hTihiKTtcbiAgICB9LFxuXG4gICAgU2FtZVZhbHVlWmVybzogZnVuY3Rpb24gKGEsIGIpIHtcbiAgICAgIC8vIHNhbWUgYXMgU2FtZVZhbHVlIGV4Y2VwdCBmb3IgU2FtZVZhbHVlWmVybygrMCwgLTApID09IHRydWVcbiAgICAgIHJldHVybiAoYSA9PT0gYikgfHwgKG51bWJlcklzTmFOKGEpICYmIG51bWJlcklzTmFOKGIpKTtcbiAgICB9LFxuXG4gICAgSXNJdGVyYWJsZTogZnVuY3Rpb24gKG8pIHtcbiAgICAgIHJldHVybiBFUy5UeXBlSXNPYmplY3QobykgJiYgKHR5cGVvZiBvWyRpdGVyYXRvciRdICE9PSAndW5kZWZpbmVkJyB8fCBpc0FyZ3VtZW50cyhvKSk7XG4gICAgfSxcblxuICAgIEdldEl0ZXJhdG9yOiBmdW5jdGlvbiAobykge1xuICAgICAgaWYgKGlzQXJndW1lbnRzKG8pKSB7XG4gICAgICAgIC8vIHNwZWNpYWwgY2FzZSBzdXBwb3J0IGZvciBgYXJndW1lbnRzYFxuICAgICAgICByZXR1cm4gbmV3IEFycmF5SXRlcmF0b3IobywgJ3ZhbHVlJyk7XG4gICAgICB9XG4gICAgICB2YXIgaXRGbiA9IEVTLkdldE1ldGhvZChvLCAkaXRlcmF0b3IkKTtcbiAgICAgIGlmICghRVMuSXNDYWxsYWJsZShpdEZuKSkge1xuICAgICAgICAvLyBCZXR0ZXIgZGlhZ25vc3RpY3MgaWYgaXRGbiBpcyBudWxsIG9yIHVuZGVmaW5lZFxuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCd2YWx1ZSBpcyBub3QgYW4gaXRlcmFibGUnKTtcbiAgICAgIH1cbiAgICAgIHZhciBpdCA9IEVTLkNhbGwoaXRGbiwgbyk7XG4gICAgICBpZiAoIUVTLlR5cGVJc09iamVjdChpdCkpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignYmFkIGl0ZXJhdG9yJyk7XG4gICAgICB9XG4gICAgICByZXR1cm4gaXQ7XG4gICAgfSxcblxuICAgIEdldE1ldGhvZDogZnVuY3Rpb24gKG8sIHApIHtcbiAgICAgIHZhciBmdW5jID0gRVMuVG9PYmplY3QobylbcF07XG4gICAgICBpZiAoZnVuYyA9PT0gdm9pZCAwIHx8IGZ1bmMgPT09IG51bGwpIHtcbiAgICAgICAgcmV0dXJuIHZvaWQgMDtcbiAgICAgIH1cbiAgICAgIGlmICghRVMuSXNDYWxsYWJsZShmdW5jKSkge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdNZXRob2Qgbm90IGNhbGxhYmxlOiAnICsgcCk7XG4gICAgICB9XG4gICAgICByZXR1cm4gZnVuYztcbiAgICB9LFxuXG4gICAgSXRlcmF0b3JDb21wbGV0ZTogZnVuY3Rpb24gKGl0ZXJSZXN1bHQpIHtcbiAgICAgIHJldHVybiAhIShpdGVyUmVzdWx0LmRvbmUpO1xuICAgIH0sXG5cbiAgICBJdGVyYXRvckNsb3NlOiBmdW5jdGlvbiAoaXRlcmF0b3IsIGNvbXBsZXRpb25Jc1Rocm93KSB7XG4gICAgICB2YXIgcmV0dXJuTWV0aG9kID0gRVMuR2V0TWV0aG9kKGl0ZXJhdG9yLCAncmV0dXJuJyk7XG4gICAgICBpZiAocmV0dXJuTWV0aG9kID09PSB2b2lkIDApIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgdmFyIGlubmVyUmVzdWx0LCBpbm5lckV4Y2VwdGlvbjtcbiAgICAgIHRyeSB7XG4gICAgICAgIGlubmVyUmVzdWx0ID0gRVMuQ2FsbChyZXR1cm5NZXRob2QsIGl0ZXJhdG9yKTtcbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgaW5uZXJFeGNlcHRpb24gPSBlO1xuICAgICAgfVxuICAgICAgaWYgKGNvbXBsZXRpb25Jc1Rocm93KSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGlmIChpbm5lckV4Y2VwdGlvbikge1xuICAgICAgICB0aHJvdyBpbm5lckV4Y2VwdGlvbjtcbiAgICAgIH1cbiAgICAgIGlmICghRVMuVHlwZUlzT2JqZWN0KGlubmVyUmVzdWx0KSkge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwiSXRlcmF0b3IncyByZXR1cm4gbWV0aG9kIHJldHVybmVkIGEgbm9uLW9iamVjdC5cIik7XG4gICAgICB9XG4gICAgfSxcblxuICAgIEl0ZXJhdG9yTmV4dDogZnVuY3Rpb24gKGl0KSB7XG4gICAgICB2YXIgcmVzdWx0ID0gYXJndW1lbnRzLmxlbmd0aCA+IDEgPyBpdC5uZXh0KGFyZ3VtZW50c1sxXSkgOiBpdC5uZXh0KCk7XG4gICAgICBpZiAoIUVTLlR5cGVJc09iamVjdChyZXN1bHQpKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ2JhZCBpdGVyYXRvcicpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9LFxuXG4gICAgSXRlcmF0b3JTdGVwOiBmdW5jdGlvbiAoaXQpIHtcbiAgICAgIHZhciByZXN1bHQgPSBFUy5JdGVyYXRvck5leHQoaXQpO1xuICAgICAgdmFyIGRvbmUgPSBFUy5JdGVyYXRvckNvbXBsZXRlKHJlc3VsdCk7XG4gICAgICByZXR1cm4gZG9uZSA/IGZhbHNlIDogcmVzdWx0O1xuICAgIH0sXG5cbiAgICBDb25zdHJ1Y3Q6IGZ1bmN0aW9uIChDLCBhcmdzLCBuZXdUYXJnZXQsIGlzRVM2aW50ZXJuYWwpIHtcbiAgICAgIHZhciB0YXJnZXQgPSB0eXBlb2YgbmV3VGFyZ2V0ID09PSAndW5kZWZpbmVkJyA/IEMgOiBuZXdUYXJnZXQ7XG5cbiAgICAgIGlmICghaXNFUzZpbnRlcm5hbCAmJiBSZWZsZWN0LmNvbnN0cnVjdCkge1xuICAgICAgICAvLyBUcnkgdG8gdXNlIFJlZmxlY3QuY29uc3RydWN0IGlmIGF2YWlsYWJsZVxuICAgICAgICByZXR1cm4gUmVmbGVjdC5jb25zdHJ1Y3QoQywgYXJncywgdGFyZ2V0KTtcbiAgICAgIH1cbiAgICAgIC8vIE9LLCB3ZSBoYXZlIHRvIGZha2UgaXQuICBUaGlzIHdpbGwgb25seSB3b3JrIGlmIHRoZVxuICAgICAgLy8gQy5bW0NvbnN0cnVjdG9yS2luZF1dID09IFwiYmFzZVwiIC0tIGJ1dCB0aGF0J3MgdGhlIG9ubHlcbiAgICAgIC8vIGtpbmQgd2UgY2FuIG1ha2UgaW4gRVM1IGNvZGUgYW55d2F5LlxuXG4gICAgICAvLyBPcmRpbmFyeUNyZWF0ZUZyb21Db25zdHJ1Y3Rvcih0YXJnZXQsIFwiJU9iamVjdFByb3RvdHlwZSVcIilcbiAgICAgIHZhciBwcm90byA9IHRhcmdldC5wcm90b3R5cGU7XG4gICAgICBpZiAoIUVTLlR5cGVJc09iamVjdChwcm90bykpIHtcbiAgICAgICAgcHJvdG8gPSBPYmplY3QucHJvdG90eXBlO1xuICAgICAgfVxuICAgICAgdmFyIG9iaiA9IGNyZWF0ZShwcm90byk7XG4gICAgICAvLyBDYWxsIHRoZSBjb25zdHJ1Y3Rvci5cbiAgICAgIHZhciByZXN1bHQgPSBFUy5DYWxsKEMsIG9iaiwgYXJncyk7XG4gICAgICByZXR1cm4gRVMuVHlwZUlzT2JqZWN0KHJlc3VsdCkgPyByZXN1bHQgOiBvYmo7XG4gICAgfSxcblxuICAgIFNwZWNpZXNDb25zdHJ1Y3RvcjogZnVuY3Rpb24gKE8sIGRlZmF1bHRDb25zdHJ1Y3Rvcikge1xuICAgICAgdmFyIEMgPSBPLmNvbnN0cnVjdG9yO1xuICAgICAgaWYgKEMgPT09IHZvaWQgMCkge1xuICAgICAgICByZXR1cm4gZGVmYXVsdENvbnN0cnVjdG9yO1xuICAgICAgfVxuICAgICAgaWYgKCFFUy5UeXBlSXNPYmplY3QoQykpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignQmFkIGNvbnN0cnVjdG9yJyk7XG4gICAgICB9XG4gICAgICB2YXIgUyA9IENbc3ltYm9sU3BlY2llc107XG4gICAgICBpZiAoUyA9PT0gdm9pZCAwIHx8IFMgPT09IG51bGwpIHtcbiAgICAgICAgcmV0dXJuIGRlZmF1bHRDb25zdHJ1Y3RvcjtcbiAgICAgIH1cbiAgICAgIGlmICghRVMuSXNDb25zdHJ1Y3RvcihTKSkge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdCYWQgQEBzcGVjaWVzJyk7XG4gICAgICB9XG4gICAgICByZXR1cm4gUztcbiAgICB9LFxuXG4gICAgQ3JlYXRlSFRNTDogZnVuY3Rpb24gKHN0cmluZywgdGFnLCBhdHRyaWJ1dGUsIHZhbHVlKSB7XG4gICAgICB2YXIgUyA9IEVTLlRvU3RyaW5nKHN0cmluZyk7XG4gICAgICB2YXIgcDEgPSAnPCcgKyB0YWc7XG4gICAgICBpZiAoYXR0cmlidXRlICE9PSAnJykge1xuICAgICAgICB2YXIgViA9IEVTLlRvU3RyaW5nKHZhbHVlKTtcbiAgICAgICAgdmFyIGVzY2FwZWRWID0gVi5yZXBsYWNlKC9cIi9nLCAnJnF1b3Q7Jyk7XG4gICAgICAgIHAxICs9ICcgJyArIGF0dHJpYnV0ZSArICc9XCInICsgZXNjYXBlZFYgKyAnXCInO1xuICAgICAgfVxuICAgICAgdmFyIHAyID0gcDEgKyAnPic7XG4gICAgICB2YXIgcDMgPSBwMiArIFM7XG4gICAgICByZXR1cm4gcDMgKyAnPC8nICsgdGFnICsgJz4nO1xuICAgIH0sXG5cbiAgICBJc1JlZ0V4cDogZnVuY3Rpb24gSXNSZWdFeHAoYXJndW1lbnQpIHtcbiAgICAgIGlmICghRVMuVHlwZUlzT2JqZWN0KGFyZ3VtZW50KSkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgICB2YXIgaXNSZWdFeHAgPSBhcmd1bWVudFtTeW1ib2wubWF0Y2hdO1xuICAgICAgaWYgKHR5cGVvZiBpc1JlZ0V4cCAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgcmV0dXJuICEhaXNSZWdFeHA7XG4gICAgICB9XG4gICAgICByZXR1cm4gVHlwZS5yZWdleChhcmd1bWVudCk7XG4gICAgfSxcblxuICAgIFRvU3RyaW5nOiBmdW5jdGlvbiBUb1N0cmluZyhzdHJpbmcpIHtcbiAgICAgIHJldHVybiAkU3RyaW5nKHN0cmluZyk7XG4gICAgfVxuICB9O1xuXG4gIC8vIFdlbGwta25vd24gU3ltYm9sIHNoaW1zXG4gIGlmIChzdXBwb3J0c0Rlc2NyaXB0b3JzICYmIGhhc1N5bWJvbHMpIHtcbiAgICB2YXIgZGVmaW5lV2VsbEtub3duU3ltYm9sID0gZnVuY3Rpb24gZGVmaW5lV2VsbEtub3duU3ltYm9sKG5hbWUpIHtcbiAgICAgIGlmIChUeXBlLnN5bWJvbChTeW1ib2xbbmFtZV0pKSB7XG4gICAgICAgIHJldHVybiBTeW1ib2xbbmFtZV07XG4gICAgICB9XG4gICAgICB2YXIgc3ltID0gU3ltYm9sWydmb3InXSgnU3ltYm9sLicgKyBuYW1lKTtcbiAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShTeW1ib2wsIG5hbWUsIHtcbiAgICAgICAgY29uZmlndXJhYmxlOiBmYWxzZSxcbiAgICAgICAgZW51bWVyYWJsZTogZmFsc2UsXG4gICAgICAgIHdyaXRhYmxlOiBmYWxzZSxcbiAgICAgICAgdmFsdWU6IHN5bVxuICAgICAgfSk7XG4gICAgICByZXR1cm4gc3ltO1xuICAgIH07XG4gICAgaWYgKCFUeXBlLnN5bWJvbChTeW1ib2wuc2VhcmNoKSkge1xuICAgICAgdmFyIHN5bWJvbFNlYXJjaCA9IGRlZmluZVdlbGxLbm93blN5bWJvbCgnc2VhcmNoJyk7XG4gICAgICB2YXIgb3JpZ2luYWxTZWFyY2ggPSBTdHJpbmcucHJvdG90eXBlLnNlYXJjaDtcbiAgICAgIGRlZmluZVByb3BlcnR5KFJlZ0V4cC5wcm90b3R5cGUsIHN5bWJvbFNlYXJjaCwgZnVuY3Rpb24gc2VhcmNoKHN0cmluZykge1xuICAgICAgICByZXR1cm4gRVMuQ2FsbChvcmlnaW5hbFNlYXJjaCwgc3RyaW5nLCBbdGhpc10pO1xuICAgICAgfSk7XG4gICAgICB2YXIgc2VhcmNoU2hpbSA9IGZ1bmN0aW9uIHNlYXJjaChyZWdleHApIHtcbiAgICAgICAgdmFyIE8gPSBFUy5SZXF1aXJlT2JqZWN0Q29lcmNpYmxlKHRoaXMpO1xuICAgICAgICBpZiAocmVnZXhwICE9PSBudWxsICYmIHR5cGVvZiByZWdleHAgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgdmFyIHNlYXJjaGVyID0gRVMuR2V0TWV0aG9kKHJlZ2V4cCwgc3ltYm9sU2VhcmNoKTtcbiAgICAgICAgICBpZiAodHlwZW9mIHNlYXJjaGVyICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgcmV0dXJuIEVTLkNhbGwoc2VhcmNoZXIsIHJlZ2V4cCwgW09dKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIEVTLkNhbGwob3JpZ2luYWxTZWFyY2gsIE8sIFtFUy5Ub1N0cmluZyhyZWdleHApXSk7XG4gICAgICB9O1xuICAgICAgb3ZlcnJpZGVOYXRpdmUoU3RyaW5nLnByb3RvdHlwZSwgJ3NlYXJjaCcsIHNlYXJjaFNoaW0pO1xuICAgIH1cbiAgICBpZiAoIVR5cGUuc3ltYm9sKFN5bWJvbC5yZXBsYWNlKSkge1xuICAgICAgdmFyIHN5bWJvbFJlcGxhY2UgPSBkZWZpbmVXZWxsS25vd25TeW1ib2woJ3JlcGxhY2UnKTtcbiAgICAgIHZhciBvcmlnaW5hbFJlcGxhY2UgPSBTdHJpbmcucHJvdG90eXBlLnJlcGxhY2U7XG4gICAgICBkZWZpbmVQcm9wZXJ0eShSZWdFeHAucHJvdG90eXBlLCBzeW1ib2xSZXBsYWNlLCBmdW5jdGlvbiByZXBsYWNlKHN0cmluZywgcmVwbGFjZVZhbHVlKSB7XG4gICAgICAgIHJldHVybiBFUy5DYWxsKG9yaWdpbmFsUmVwbGFjZSwgc3RyaW5nLCBbdGhpcywgcmVwbGFjZVZhbHVlXSk7XG4gICAgICB9KTtcbiAgICAgIHZhciByZXBsYWNlU2hpbSA9IGZ1bmN0aW9uIHJlcGxhY2Uoc2VhcmNoVmFsdWUsIHJlcGxhY2VWYWx1ZSkge1xuICAgICAgICB2YXIgTyA9IEVTLlJlcXVpcmVPYmplY3RDb2VyY2libGUodGhpcyk7XG4gICAgICAgIGlmIChzZWFyY2hWYWx1ZSAhPT0gbnVsbCAmJiB0eXBlb2Ygc2VhcmNoVmFsdWUgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgdmFyIHJlcGxhY2VyID0gRVMuR2V0TWV0aG9kKHNlYXJjaFZhbHVlLCBzeW1ib2xSZXBsYWNlKTtcbiAgICAgICAgICBpZiAodHlwZW9mIHJlcGxhY2VyICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgcmV0dXJuIEVTLkNhbGwocmVwbGFjZXIsIHNlYXJjaFZhbHVlLCBbTywgcmVwbGFjZVZhbHVlXSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBFUy5DYWxsKG9yaWdpbmFsUmVwbGFjZSwgTywgW0VTLlRvU3RyaW5nKHNlYXJjaFZhbHVlKSwgcmVwbGFjZVZhbHVlXSk7XG4gICAgICB9O1xuICAgICAgb3ZlcnJpZGVOYXRpdmUoU3RyaW5nLnByb3RvdHlwZSwgJ3JlcGxhY2UnLCByZXBsYWNlU2hpbSk7XG4gICAgfVxuICAgIGlmICghVHlwZS5zeW1ib2woU3ltYm9sLnNwbGl0KSkge1xuICAgICAgdmFyIHN5bWJvbFNwbGl0ID0gZGVmaW5lV2VsbEtub3duU3ltYm9sKCdzcGxpdCcpO1xuICAgICAgdmFyIG9yaWdpbmFsU3BsaXQgPSBTdHJpbmcucHJvdG90eXBlLnNwbGl0O1xuICAgICAgZGVmaW5lUHJvcGVydHkoUmVnRXhwLnByb3RvdHlwZSwgc3ltYm9sU3BsaXQsIGZ1bmN0aW9uIHNwbGl0KHN0cmluZywgbGltaXQpIHtcbiAgICAgICAgcmV0dXJuIEVTLkNhbGwob3JpZ2luYWxTcGxpdCwgc3RyaW5nLCBbdGhpcywgbGltaXRdKTtcbiAgICAgIH0pO1xuICAgICAgdmFyIHNwbGl0U2hpbSA9IGZ1bmN0aW9uIHNwbGl0KHNlcGFyYXRvciwgbGltaXQpIHtcbiAgICAgICAgdmFyIE8gPSBFUy5SZXF1aXJlT2JqZWN0Q29lcmNpYmxlKHRoaXMpO1xuICAgICAgICBpZiAoc2VwYXJhdG9yICE9PSBudWxsICYmIHR5cGVvZiBzZXBhcmF0b3IgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgdmFyIHNwbGl0dGVyID0gRVMuR2V0TWV0aG9kKHNlcGFyYXRvciwgc3ltYm9sU3BsaXQpO1xuICAgICAgICAgIGlmICh0eXBlb2Ygc3BsaXR0ZXIgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICByZXR1cm4gRVMuQ2FsbChzcGxpdHRlciwgc2VwYXJhdG9yLCBbTywgbGltaXRdKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIEVTLkNhbGwob3JpZ2luYWxTcGxpdCwgTywgW0VTLlRvU3RyaW5nKHNlcGFyYXRvciksIGxpbWl0XSk7XG4gICAgICB9O1xuICAgICAgb3ZlcnJpZGVOYXRpdmUoU3RyaW5nLnByb3RvdHlwZSwgJ3NwbGl0Jywgc3BsaXRTaGltKTtcbiAgICB9XG4gICAgdmFyIHN5bWJvbE1hdGNoRXhpc3RzID0gVHlwZS5zeW1ib2woU3ltYm9sLm1hdGNoKTtcbiAgICB2YXIgc3RyaW5nTWF0Y2hJZ25vcmVzU3ltYm9sTWF0Y2ggPSBzeW1ib2xNYXRjaEV4aXN0cyAmJiAoZnVuY3Rpb24gKCkge1xuICAgICAgLy8gRmlyZWZveCA0MSwgdGhyb3VnaCBOaWdodGx5IDQ1IGhhcyBTeW1ib2wubWF0Y2gsIGJ1dCBTdHJpbmcjbWF0Y2ggaWdub3JlcyBpdC5cbiAgICAgIC8vIEZpcmVmb3ggNDAgYW5kIGJlbG93IGhhdmUgU3ltYm9sLm1hdGNoIGJ1dCBTdHJpbmcjbWF0Y2ggd29ya3MgZmluZS5cbiAgICAgIHZhciBvID0ge307XG4gICAgICBvW1N5bWJvbC5tYXRjaF0gPSBmdW5jdGlvbiAoKSB7IHJldHVybiA0MjsgfTtcbiAgICAgIHJldHVybiAnYScubWF0Y2gobykgIT09IDQyO1xuICAgIH0oKSk7XG4gICAgaWYgKCFzeW1ib2xNYXRjaEV4aXN0cyB8fCBzdHJpbmdNYXRjaElnbm9yZXNTeW1ib2xNYXRjaCkge1xuICAgICAgdmFyIHN5bWJvbE1hdGNoID0gZGVmaW5lV2VsbEtub3duU3ltYm9sKCdtYXRjaCcpO1xuXG4gICAgICB2YXIgb3JpZ2luYWxNYXRjaCA9IFN0cmluZy5wcm90b3R5cGUubWF0Y2g7XG4gICAgICBkZWZpbmVQcm9wZXJ0eShSZWdFeHAucHJvdG90eXBlLCBzeW1ib2xNYXRjaCwgZnVuY3Rpb24gbWF0Y2goc3RyaW5nKSB7XG4gICAgICAgIHJldHVybiBFUy5DYWxsKG9yaWdpbmFsTWF0Y2gsIHN0cmluZywgW3RoaXNdKTtcbiAgICAgIH0pO1xuXG4gICAgICB2YXIgbWF0Y2hTaGltID0gZnVuY3Rpb24gbWF0Y2gocmVnZXhwKSB7XG4gICAgICAgIHZhciBPID0gRVMuUmVxdWlyZU9iamVjdENvZXJjaWJsZSh0aGlzKTtcbiAgICAgICAgaWYgKHJlZ2V4cCAhPT0gbnVsbCAmJiB0eXBlb2YgcmVnZXhwICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgIHZhciBtYXRjaGVyID0gRVMuR2V0TWV0aG9kKHJlZ2V4cCwgc3ltYm9sTWF0Y2gpO1xuICAgICAgICAgIGlmICh0eXBlb2YgbWF0Y2hlciAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIHJldHVybiBFUy5DYWxsKG1hdGNoZXIsIHJlZ2V4cCwgW09dKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIEVTLkNhbGwob3JpZ2luYWxNYXRjaCwgTywgW0VTLlRvU3RyaW5nKHJlZ2V4cCldKTtcbiAgICAgIH07XG4gICAgICBvdmVycmlkZU5hdGl2ZShTdHJpbmcucHJvdG90eXBlLCAnbWF0Y2gnLCBtYXRjaFNoaW0pO1xuICAgIH1cbiAgfVxuXG4gIHZhciB3cmFwQ29uc3RydWN0b3IgPSBmdW5jdGlvbiB3cmFwQ29uc3RydWN0b3Iob3JpZ2luYWwsIHJlcGxhY2VtZW50LCBrZXlzVG9Ta2lwKSB7XG4gICAgVmFsdWUucHJlc2VydmVUb1N0cmluZyhyZXBsYWNlbWVudCwgb3JpZ2luYWwpO1xuICAgIGlmIChPYmplY3Quc2V0UHJvdG90eXBlT2YpIHtcbiAgICAgIC8vIHNldHMgdXAgcHJvcGVyIHByb3RvdHlwZSBjaGFpbiB3aGVyZSBwb3NzaWJsZVxuICAgICAgT2JqZWN0LnNldFByb3RvdHlwZU9mKG9yaWdpbmFsLCByZXBsYWNlbWVudCk7XG4gICAgfVxuICAgIGlmIChzdXBwb3J0c0Rlc2NyaXB0b3JzKSB7XG4gICAgICBfZm9yRWFjaChPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyhvcmlnaW5hbCksIGZ1bmN0aW9uIChrZXkpIHtcbiAgICAgICAgaWYgKGtleSBpbiBub29wIHx8IGtleXNUb1NraXBba2V5XSkgeyByZXR1cm47IH1cbiAgICAgICAgVmFsdWUucHJveHkob3JpZ2luYWwsIGtleSwgcmVwbGFjZW1lbnQpO1xuICAgICAgfSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIF9mb3JFYWNoKE9iamVjdC5rZXlzKG9yaWdpbmFsKSwgZnVuY3Rpb24gKGtleSkge1xuICAgICAgICBpZiAoa2V5IGluIG5vb3AgfHwga2V5c1RvU2tpcFtrZXldKSB7IHJldHVybjsgfVxuICAgICAgICByZXBsYWNlbWVudFtrZXldID0gb3JpZ2luYWxba2V5XTtcbiAgICAgIH0pO1xuICAgIH1cbiAgICByZXBsYWNlbWVudC5wcm90b3R5cGUgPSBvcmlnaW5hbC5wcm90b3R5cGU7XG4gICAgVmFsdWUucmVkZWZpbmUob3JpZ2luYWwucHJvdG90eXBlLCAnY29uc3RydWN0b3InLCByZXBsYWNlbWVudCk7XG4gIH07XG5cbiAgdmFyIGRlZmF1bHRTcGVjaWVzR2V0dGVyID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gdGhpczsgfTtcbiAgdmFyIGFkZERlZmF1bHRTcGVjaWVzID0gZnVuY3Rpb24gKEMpIHtcbiAgICBpZiAoc3VwcG9ydHNEZXNjcmlwdG9ycyAmJiAhX2hhc093blByb3BlcnR5KEMsIHN5bWJvbFNwZWNpZXMpKSB7XG4gICAgICBWYWx1ZS5nZXR0ZXIoQywgc3ltYm9sU3BlY2llcywgZGVmYXVsdFNwZWNpZXNHZXR0ZXIpO1xuICAgIH1cbiAgfTtcblxuICB2YXIgYWRkSXRlcmF0b3IgPSBmdW5jdGlvbiAocHJvdG90eXBlLCBpbXBsKSB7XG4gICAgdmFyIGltcGxlbWVudGF0aW9uID0gaW1wbCB8fCBmdW5jdGlvbiBpdGVyYXRvcigpIHsgcmV0dXJuIHRoaXM7IH07XG4gICAgZGVmaW5lUHJvcGVydHkocHJvdG90eXBlLCAkaXRlcmF0b3IkLCBpbXBsZW1lbnRhdGlvbik7XG4gICAgaWYgKCFwcm90b3R5cGVbJGl0ZXJhdG9yJF0gJiYgVHlwZS5zeW1ib2woJGl0ZXJhdG9yJCkpIHtcbiAgICAgIC8vIGltcGxlbWVudGF0aW9ucyBhcmUgYnVnZ3kgd2hlbiAkaXRlcmF0b3IkIGlzIGEgU3ltYm9sXG4gICAgICBwcm90b3R5cGVbJGl0ZXJhdG9yJF0gPSBpbXBsZW1lbnRhdGlvbjtcbiAgICB9XG4gIH07XG5cbiAgdmFyIGNyZWF0ZURhdGFQcm9wZXJ0eSA9IGZ1bmN0aW9uIGNyZWF0ZURhdGFQcm9wZXJ0eShvYmplY3QsIG5hbWUsIHZhbHVlKSB7XG4gICAgaWYgKHN1cHBvcnRzRGVzY3JpcHRvcnMpIHtcbiAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShvYmplY3QsIG5hbWUsIHtcbiAgICAgICAgY29uZmlndXJhYmxlOiB0cnVlLFxuICAgICAgICBlbnVtZXJhYmxlOiB0cnVlLFxuICAgICAgICB3cml0YWJsZTogdHJ1ZSxcbiAgICAgICAgdmFsdWU6IHZhbHVlXG4gICAgICB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgb2JqZWN0W25hbWVdID0gdmFsdWU7XG4gICAgfVxuICB9O1xuICB2YXIgY3JlYXRlRGF0YVByb3BlcnR5T3JUaHJvdyA9IGZ1bmN0aW9uIGNyZWF0ZURhdGFQcm9wZXJ0eU9yVGhyb3cob2JqZWN0LCBuYW1lLCB2YWx1ZSkge1xuICAgIGNyZWF0ZURhdGFQcm9wZXJ0eShvYmplY3QsIG5hbWUsIHZhbHVlKTtcbiAgICBpZiAoIUVTLlNhbWVWYWx1ZShvYmplY3RbbmFtZV0sIHZhbHVlKSkge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcigncHJvcGVydHkgaXMgbm9uY29uZmlndXJhYmxlJyk7XG4gICAgfVxuICB9O1xuXG4gIHZhciBlbXVsYXRlRVM2Y29uc3RydWN0ID0gZnVuY3Rpb24gKG8sIGRlZmF1bHROZXdUYXJnZXQsIGRlZmF1bHRQcm90bywgc2xvdHMpIHtcbiAgICAvLyBUaGlzIGlzIGFuIGVzNSBhcHByb3hpbWF0aW9uIHRvIGVzNiBjb25zdHJ1Y3Qgc2VtYW50aWNzLiAgaW4gZXM2LFxuICAgIC8vICduZXcgRm9vJyBpbnZva2VzIEZvby5bW0NvbnN0cnVjdF1dIHdoaWNoIChmb3IgYWxtb3N0IGFsbCBvYmplY3RzKVxuICAgIC8vIGp1c3Qgc2V0cyB0aGUgaW50ZXJuYWwgdmFyaWFibGUgTmV3VGFyZ2V0IChpbiBlczYgc3ludGF4IGBuZXcudGFyZ2V0YClcbiAgICAvLyB0byBGb28gYW5kIHRoZW4gcmV0dXJucyBGb28oKS5cblxuICAgIC8vIE1hbnkgRVM2IG9iamVjdCB0aGVuIGhhdmUgY29uc3RydWN0b3JzIG9mIHRoZSBmb3JtOlxuICAgIC8vIDEuIElmIE5ld1RhcmdldCBpcyB1bmRlZmluZWQsIHRocm93IGEgVHlwZUVycm9yIGV4Y2VwdGlvblxuICAgIC8vIDIuIExldCB4eHggYnkgT3JkaW5hcnlDcmVhdGVGcm9tQ29uc3RydWN0b3IoTmV3VGFyZ2V0LCB5eXksIHp6eilcblxuICAgIC8vIFNvIHdlJ3JlIGdvaW5nIHRvIGVtdWxhdGUgdGhvc2UgZmlyc3QgdHdvIHN0ZXBzLlxuICAgIGlmICghRVMuVHlwZUlzT2JqZWN0KG8pKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdDb25zdHJ1Y3RvciByZXF1aXJlcyBgbmV3YDogJyArIGRlZmF1bHROZXdUYXJnZXQubmFtZSk7XG4gICAgfVxuICAgIHZhciBwcm90byA9IGRlZmF1bHROZXdUYXJnZXQucHJvdG90eXBlO1xuICAgIGlmICghRVMuVHlwZUlzT2JqZWN0KHByb3RvKSkge1xuICAgICAgcHJvdG8gPSBkZWZhdWx0UHJvdG87XG4gICAgfVxuICAgIHZhciBvYmogPSBjcmVhdGUocHJvdG8pO1xuICAgIGZvciAodmFyIG5hbWUgaW4gc2xvdHMpIHtcbiAgICAgIGlmIChfaGFzT3duUHJvcGVydHkoc2xvdHMsIG5hbWUpKSB7XG4gICAgICAgIHZhciB2YWx1ZSA9IHNsb3RzW25hbWVdO1xuICAgICAgICBkZWZpbmVQcm9wZXJ0eShvYmosIG5hbWUsIHZhbHVlLCB0cnVlKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG9iajtcbiAgfTtcblxuICAvLyBGaXJlZm94IDMxIHJlcG9ydHMgdGhpcyBmdW5jdGlvbidzIGxlbmd0aCBhcyAwXG4gIC8vIGh0dHBzOi8vYnVnemlsbGEubW96aWxsYS5vcmcvc2hvd19idWcuY2dpP2lkPTEwNjI0ODRcbiAgaWYgKFN0cmluZy5mcm9tQ29kZVBvaW50ICYmIFN0cmluZy5mcm9tQ29kZVBvaW50Lmxlbmd0aCAhPT0gMSkge1xuICAgIHZhciBvcmlnaW5hbEZyb21Db2RlUG9pbnQgPSBTdHJpbmcuZnJvbUNvZGVQb2ludDtcbiAgICBvdmVycmlkZU5hdGl2ZShTdHJpbmcsICdmcm9tQ29kZVBvaW50JywgZnVuY3Rpb24gZnJvbUNvZGVQb2ludChjb2RlUG9pbnRzKSB7IHJldHVybiBFUy5DYWxsKG9yaWdpbmFsRnJvbUNvZGVQb2ludCwgdGhpcywgYXJndW1lbnRzKTsgfSk7XG4gIH1cblxuICB2YXIgU3RyaW5nU2hpbXMgPSB7XG4gICAgZnJvbUNvZGVQb2ludDogZnVuY3Rpb24gZnJvbUNvZGVQb2ludChjb2RlUG9pbnRzKSB7XG4gICAgICB2YXIgcmVzdWx0ID0gW107XG4gICAgICB2YXIgbmV4dDtcbiAgICAgIGZvciAodmFyIGkgPSAwLCBsZW5ndGggPSBhcmd1bWVudHMubGVuZ3RoOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgICAgbmV4dCA9IE51bWJlcihhcmd1bWVudHNbaV0pO1xuICAgICAgICBpZiAoIUVTLlNhbWVWYWx1ZShuZXh0LCBFUy5Ub0ludGVnZXIobmV4dCkpIHx8IG5leHQgPCAwIHx8IG5leHQgPiAweDEwRkZGRikge1xuICAgICAgICAgIHRocm93IG5ldyBSYW5nZUVycm9yKCdJbnZhbGlkIGNvZGUgcG9pbnQgJyArIG5leHQpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKG5leHQgPCAweDEwMDAwKSB7XG4gICAgICAgICAgX3B1c2gocmVzdWx0LCBTdHJpbmcuZnJvbUNoYXJDb2RlKG5leHQpKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBuZXh0IC09IDB4MTAwMDA7XG4gICAgICAgICAgX3B1c2gocmVzdWx0LCBTdHJpbmcuZnJvbUNoYXJDb2RlKChuZXh0ID4+IDEwKSArIDB4RDgwMCkpO1xuICAgICAgICAgIF9wdXNoKHJlc3VsdCwgU3RyaW5nLmZyb21DaGFyQ29kZSgobmV4dCAlIDB4NDAwKSArIDB4REMwMCkpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gcmVzdWx0LmpvaW4oJycpO1xuICAgIH0sXG5cbiAgICByYXc6IGZ1bmN0aW9uIHJhdyhjYWxsU2l0ZSkge1xuICAgICAgdmFyIGNvb2tlZCA9IEVTLlRvT2JqZWN0KGNhbGxTaXRlLCAnYmFkIGNhbGxTaXRlJyk7XG4gICAgICB2YXIgcmF3U3RyaW5nID0gRVMuVG9PYmplY3QoY29va2VkLnJhdywgJ2JhZCByYXcgdmFsdWUnKTtcbiAgICAgIHZhciBsZW4gPSByYXdTdHJpbmcubGVuZ3RoO1xuICAgICAgdmFyIGxpdGVyYWxzZWdtZW50cyA9IEVTLlRvTGVuZ3RoKGxlbik7XG4gICAgICBpZiAobGl0ZXJhbHNlZ21lbnRzIDw9IDApIHtcbiAgICAgICAgcmV0dXJuICcnO1xuICAgICAgfVxuXG4gICAgICB2YXIgc3RyaW5nRWxlbWVudHMgPSBbXTtcbiAgICAgIHZhciBuZXh0SW5kZXggPSAwO1xuICAgICAgdmFyIG5leHRLZXksIG5leHQsIG5leHRTZWcsIG5leHRTdWI7XG4gICAgICB3aGlsZSAobmV4dEluZGV4IDwgbGl0ZXJhbHNlZ21lbnRzKSB7XG4gICAgICAgIG5leHRLZXkgPSBFUy5Ub1N0cmluZyhuZXh0SW5kZXgpO1xuICAgICAgICBuZXh0U2VnID0gRVMuVG9TdHJpbmcocmF3U3RyaW5nW25leHRLZXldKTtcbiAgICAgICAgX3B1c2goc3RyaW5nRWxlbWVudHMsIG5leHRTZWcpO1xuICAgICAgICBpZiAobmV4dEluZGV4ICsgMSA+PSBsaXRlcmFsc2VnbWVudHMpIHtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgICBuZXh0ID0gbmV4dEluZGV4ICsgMSA8IGFyZ3VtZW50cy5sZW5ndGggPyBhcmd1bWVudHNbbmV4dEluZGV4ICsgMV0gOiAnJztcbiAgICAgICAgbmV4dFN1YiA9IEVTLlRvU3RyaW5nKG5leHQpO1xuICAgICAgICBfcHVzaChzdHJpbmdFbGVtZW50cywgbmV4dFN1Yik7XG4gICAgICAgIG5leHRJbmRleCArPSAxO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHN0cmluZ0VsZW1lbnRzLmpvaW4oJycpO1xuICAgIH1cbiAgfTtcbiAgaWYgKFN0cmluZy5yYXcgJiYgU3RyaW5nLnJhdyh7IHJhdzogeyAwOiAneCcsIDE6ICd5JywgbGVuZ3RoOiAyIH0gfSkgIT09ICd4eScpIHtcbiAgICAvLyBJRSAxMSBUUCBoYXMgYSBicm9rZW4gU3RyaW5nLnJhdyBpbXBsZW1lbnRhdGlvblxuICAgIG92ZXJyaWRlTmF0aXZlKFN0cmluZywgJ3JhdycsIFN0cmluZ1NoaW1zLnJhdyk7XG4gIH1cbiAgZGVmaW5lUHJvcGVydGllcyhTdHJpbmcsIFN0cmluZ1NoaW1zKTtcblxuICAvLyBGYXN0IHJlcGVhdCwgdXNlcyB0aGUgYEV4cG9uZW50aWF0aW9uIGJ5IHNxdWFyaW5nYCBhbGdvcml0aG0uXG4gIC8vIFBlcmY6IGh0dHA6Ly9qc3BlcmYuY29tL3N0cmluZy1yZXBlYXQyLzJcbiAgdmFyIHN0cmluZ1JlcGVhdCA9IGZ1bmN0aW9uIHJlcGVhdChzLCB0aW1lcykge1xuICAgIGlmICh0aW1lcyA8IDEpIHsgcmV0dXJuICcnOyB9XG4gICAgaWYgKHRpbWVzICUgMikgeyByZXR1cm4gcmVwZWF0KHMsIHRpbWVzIC0gMSkgKyBzOyB9XG4gICAgdmFyIGhhbGYgPSByZXBlYXQocywgdGltZXMgLyAyKTtcbiAgICByZXR1cm4gaGFsZiArIGhhbGY7XG4gIH07XG4gIHZhciBzdHJpbmdNYXhMZW5ndGggPSBJbmZpbml0eTtcblxuICB2YXIgU3RyaW5nUHJvdG90eXBlU2hpbXMgPSB7XG4gICAgcmVwZWF0OiBmdW5jdGlvbiByZXBlYXQodGltZXMpIHtcbiAgICAgIHZhciB0aGlzU3RyID0gRVMuVG9TdHJpbmcoRVMuUmVxdWlyZU9iamVjdENvZXJjaWJsZSh0aGlzKSk7XG4gICAgICB2YXIgbnVtVGltZXMgPSBFUy5Ub0ludGVnZXIodGltZXMpO1xuICAgICAgaWYgKG51bVRpbWVzIDwgMCB8fCBudW1UaW1lcyA+PSBzdHJpbmdNYXhMZW5ndGgpIHtcbiAgICAgICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ3JlcGVhdCBjb3VudCBtdXN0IGJlIGxlc3MgdGhhbiBpbmZpbml0eSBhbmQgbm90IG92ZXJmbG93IG1heGltdW0gc3RyaW5nIHNpemUnKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBzdHJpbmdSZXBlYXQodGhpc1N0ciwgbnVtVGltZXMpO1xuICAgIH0sXG5cbiAgICBzdGFydHNXaXRoOiBmdW5jdGlvbiBzdGFydHNXaXRoKHNlYXJjaFN0cmluZykge1xuICAgICAgdmFyIFMgPSBFUy5Ub1N0cmluZyhFUy5SZXF1aXJlT2JqZWN0Q29lcmNpYmxlKHRoaXMpKTtcbiAgICAgIGlmIChFUy5Jc1JlZ0V4cChzZWFyY2hTdHJpbmcpKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0Nhbm5vdCBjYWxsIG1ldGhvZCBcInN0YXJ0c1dpdGhcIiB3aXRoIGEgcmVnZXgnKTtcbiAgICAgIH1cbiAgICAgIHZhciBzZWFyY2hTdHIgPSBFUy5Ub1N0cmluZyhzZWFyY2hTdHJpbmcpO1xuICAgICAgdmFyIHBvc2l0aW9uO1xuICAgICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPiAxKSB7XG4gICAgICAgIHBvc2l0aW9uID0gYXJndW1lbnRzWzFdO1xuICAgICAgfVxuICAgICAgdmFyIHN0YXJ0ID0gX21heChFUy5Ub0ludGVnZXIocG9zaXRpb24pLCAwKTtcbiAgICAgIHJldHVybiBfc3RyU2xpY2UoUywgc3RhcnQsIHN0YXJ0ICsgc2VhcmNoU3RyLmxlbmd0aCkgPT09IHNlYXJjaFN0cjtcbiAgICB9LFxuXG4gICAgZW5kc1dpdGg6IGZ1bmN0aW9uIGVuZHNXaXRoKHNlYXJjaFN0cmluZykge1xuICAgICAgdmFyIFMgPSBFUy5Ub1N0cmluZyhFUy5SZXF1aXJlT2JqZWN0Q29lcmNpYmxlKHRoaXMpKTtcbiAgICAgIGlmIChFUy5Jc1JlZ0V4cChzZWFyY2hTdHJpbmcpKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0Nhbm5vdCBjYWxsIG1ldGhvZCBcImVuZHNXaXRoXCIgd2l0aCBhIHJlZ2V4Jyk7XG4gICAgICB9XG4gICAgICB2YXIgc2VhcmNoU3RyID0gRVMuVG9TdHJpbmcoc2VhcmNoU3RyaW5nKTtcbiAgICAgIHZhciBsZW4gPSBTLmxlbmd0aDtcbiAgICAgIHZhciBlbmRQb3NpdGlvbjtcbiAgICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID4gMSkge1xuICAgICAgICBlbmRQb3NpdGlvbiA9IGFyZ3VtZW50c1sxXTtcbiAgICAgIH1cbiAgICAgIHZhciBwb3MgPSB0eXBlb2YgZW5kUG9zaXRpb24gPT09ICd1bmRlZmluZWQnID8gbGVuIDogRVMuVG9JbnRlZ2VyKGVuZFBvc2l0aW9uKTtcbiAgICAgIHZhciBlbmQgPSBfbWluKF9tYXgocG9zLCAwKSwgbGVuKTtcbiAgICAgIHJldHVybiBfc3RyU2xpY2UoUywgZW5kIC0gc2VhcmNoU3RyLmxlbmd0aCwgZW5kKSA9PT0gc2VhcmNoU3RyO1xuICAgIH0sXG5cbiAgICBpbmNsdWRlczogZnVuY3Rpb24gaW5jbHVkZXMoc2VhcmNoU3RyaW5nKSB7XG4gICAgICBpZiAoRVMuSXNSZWdFeHAoc2VhcmNoU3RyaW5nKSkge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdcImluY2x1ZGVzXCIgZG9lcyBub3QgYWNjZXB0IGEgUmVnRXhwJyk7XG4gICAgICB9XG4gICAgICB2YXIgc2VhcmNoU3RyID0gRVMuVG9TdHJpbmcoc2VhcmNoU3RyaW5nKTtcbiAgICAgIHZhciBwb3NpdGlvbjtcbiAgICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID4gMSkge1xuICAgICAgICBwb3NpdGlvbiA9IGFyZ3VtZW50c1sxXTtcbiAgICAgIH1cbiAgICAgIC8vIFNvbWVob3cgdGhpcyB0cmljayBtYWtlcyBtZXRob2QgMTAwJSBjb21wYXQgd2l0aCB0aGUgc3BlYy5cbiAgICAgIHJldHVybiBfaW5kZXhPZih0aGlzLCBzZWFyY2hTdHIsIHBvc2l0aW9uKSAhPT0gLTE7XG4gICAgfSxcblxuICAgIGNvZGVQb2ludEF0OiBmdW5jdGlvbiBjb2RlUG9pbnRBdChwb3MpIHtcbiAgICAgIHZhciB0aGlzU3RyID0gRVMuVG9TdHJpbmcoRVMuUmVxdWlyZU9iamVjdENvZXJjaWJsZSh0aGlzKSk7XG4gICAgICB2YXIgcG9zaXRpb24gPSBFUy5Ub0ludGVnZXIocG9zKTtcbiAgICAgIHZhciBsZW5ndGggPSB0aGlzU3RyLmxlbmd0aDtcbiAgICAgIGlmIChwb3NpdGlvbiA+PSAwICYmIHBvc2l0aW9uIDwgbGVuZ3RoKSB7XG4gICAgICAgIHZhciBmaXJzdCA9IHRoaXNTdHIuY2hhckNvZGVBdChwb3NpdGlvbik7XG4gICAgICAgIHZhciBpc0VuZCA9IChwb3NpdGlvbiArIDEgPT09IGxlbmd0aCk7XG4gICAgICAgIGlmIChmaXJzdCA8IDB4RDgwMCB8fCBmaXJzdCA+IDB4REJGRiB8fCBpc0VuZCkgeyByZXR1cm4gZmlyc3Q7IH1cbiAgICAgICAgdmFyIHNlY29uZCA9IHRoaXNTdHIuY2hhckNvZGVBdChwb3NpdGlvbiArIDEpO1xuICAgICAgICBpZiAoc2Vjb25kIDwgMHhEQzAwIHx8IHNlY29uZCA+IDB4REZGRikgeyByZXR1cm4gZmlyc3Q7IH1cbiAgICAgICAgcmV0dXJuICgoZmlyc3QgLSAweEQ4MDApICogMTAyNCkgKyAoc2Vjb25kIC0gMHhEQzAwKSArIDB4MTAwMDA7XG4gICAgICB9XG4gICAgfVxuICB9O1xuICBpZiAoU3RyaW5nLnByb3RvdHlwZS5pbmNsdWRlcyAmJiAnYScuaW5jbHVkZXMoJ2EnLCBJbmZpbml0eSkgIT09IGZhbHNlKSB7XG4gICAgb3ZlcnJpZGVOYXRpdmUoU3RyaW5nLnByb3RvdHlwZSwgJ2luY2x1ZGVzJywgU3RyaW5nUHJvdG90eXBlU2hpbXMuaW5jbHVkZXMpO1xuICB9XG5cbiAgaWYgKFN0cmluZy5wcm90b3R5cGUuc3RhcnRzV2l0aCAmJiBTdHJpbmcucHJvdG90eXBlLmVuZHNXaXRoKSB7XG4gICAgdmFyIHN0YXJ0c1dpdGhSZWplY3RzUmVnZXggPSB0aHJvd3NFcnJvcihmdW5jdGlvbiAoKSB7XG4gICAgICAvKiB0aHJvd3MgaWYgc3BlYy1jb21wbGlhbnQgKi9cbiAgICAgICcvYS8nLnN0YXJ0c1dpdGgoL2EvKTtcbiAgICB9KTtcbiAgICB2YXIgc3RhcnRzV2l0aEhhbmRsZXNJbmZpbml0eSA9IHZhbHVlT3JGYWxzZUlmVGhyb3dzKGZ1bmN0aW9uICgpIHtcbiAgICAgIHJldHVybiAnYWJjJy5zdGFydHNXaXRoKCdhJywgSW5maW5pdHkpID09PSBmYWxzZTtcbiAgICB9KTtcbiAgICBpZiAoIXN0YXJ0c1dpdGhSZWplY3RzUmVnZXggfHwgIXN0YXJ0c1dpdGhIYW5kbGVzSW5maW5pdHkpIHtcbiAgICAgIC8vIEZpcmVmb3ggKDwgMzc/KSBhbmQgSUUgMTEgVFAgaGF2ZSBhIG5vbmNvbXBsaWFudCBzdGFydHNXaXRoIGltcGxlbWVudGF0aW9uXG4gICAgICBvdmVycmlkZU5hdGl2ZShTdHJpbmcucHJvdG90eXBlLCAnc3RhcnRzV2l0aCcsIFN0cmluZ1Byb3RvdHlwZVNoaW1zLnN0YXJ0c1dpdGgpO1xuICAgICAgb3ZlcnJpZGVOYXRpdmUoU3RyaW5nLnByb3RvdHlwZSwgJ2VuZHNXaXRoJywgU3RyaW5nUHJvdG90eXBlU2hpbXMuZW5kc1dpdGgpO1xuICAgIH1cbiAgfVxuICBpZiAoaGFzU3ltYm9scykge1xuICAgIHZhciBzdGFydHNXaXRoU3VwcG9ydHNTeW1ib2xNYXRjaCA9IHZhbHVlT3JGYWxzZUlmVGhyb3dzKGZ1bmN0aW9uICgpIHtcbiAgICAgIHZhciByZSA9IC9hLztcbiAgICAgIHJlW1N5bWJvbC5tYXRjaF0gPSBmYWxzZTtcbiAgICAgIHJldHVybiAnL2EvJy5zdGFydHNXaXRoKHJlKTtcbiAgICB9KTtcbiAgICBpZiAoIXN0YXJ0c1dpdGhTdXBwb3J0c1N5bWJvbE1hdGNoKSB7XG4gICAgICBvdmVycmlkZU5hdGl2ZShTdHJpbmcucHJvdG90eXBlLCAnc3RhcnRzV2l0aCcsIFN0cmluZ1Byb3RvdHlwZVNoaW1zLnN0YXJ0c1dpdGgpO1xuICAgIH1cbiAgICB2YXIgZW5kc1dpdGhTdXBwb3J0c1N5bWJvbE1hdGNoID0gdmFsdWVPckZhbHNlSWZUaHJvd3MoZnVuY3Rpb24gKCkge1xuICAgICAgdmFyIHJlID0gL2EvO1xuICAgICAgcmVbU3ltYm9sLm1hdGNoXSA9IGZhbHNlO1xuICAgICAgcmV0dXJuICcvYS8nLmVuZHNXaXRoKHJlKTtcbiAgICB9KTtcbiAgICBpZiAoIWVuZHNXaXRoU3VwcG9ydHNTeW1ib2xNYXRjaCkge1xuICAgICAgb3ZlcnJpZGVOYXRpdmUoU3RyaW5nLnByb3RvdHlwZSwgJ2VuZHNXaXRoJywgU3RyaW5nUHJvdG90eXBlU2hpbXMuZW5kc1dpdGgpO1xuICAgIH1cbiAgICB2YXIgaW5jbHVkZXNTdXBwb3J0c1N5bWJvbE1hdGNoID0gdmFsdWVPckZhbHNlSWZUaHJvd3MoZnVuY3Rpb24gKCkge1xuICAgICAgdmFyIHJlID0gL2EvO1xuICAgICAgcmVbU3ltYm9sLm1hdGNoXSA9IGZhbHNlO1xuICAgICAgcmV0dXJuICcvYS8nLmluY2x1ZGVzKHJlKTtcbiAgICB9KTtcbiAgICBpZiAoIWluY2x1ZGVzU3VwcG9ydHNTeW1ib2xNYXRjaCkge1xuICAgICAgb3ZlcnJpZGVOYXRpdmUoU3RyaW5nLnByb3RvdHlwZSwgJ2luY2x1ZGVzJywgU3RyaW5nUHJvdG90eXBlU2hpbXMuaW5jbHVkZXMpO1xuICAgIH1cbiAgfVxuXG4gIGRlZmluZVByb3BlcnRpZXMoU3RyaW5nLnByb3RvdHlwZSwgU3RyaW5nUHJvdG90eXBlU2hpbXMpO1xuXG4gIC8vIHdoaXRlc3BhY2UgZnJvbTogaHR0cDovL2VzNS5naXRodWIuaW8vI3gxNS41LjQuMjBcbiAgLy8gaW1wbGVtZW50YXRpb24gZnJvbSBodHRwczovL2dpdGh1Yi5jb20vZXMtc2hpbXMvZXM1LXNoaW0vYmxvYi92My40LjAvZXM1LXNoaW0uanMjTDEzMDQtTDEzMjRcbiAgdmFyIHdzID0gW1xuICAgICdcXHgwOVxceDBBXFx4MEJcXHgwQ1xceDBEXFx4MjBcXHhBMFxcdTE2ODBcXHUxODBFXFx1MjAwMFxcdTIwMDFcXHUyMDAyXFx1MjAwMycsXG4gICAgJ1xcdTIwMDRcXHUyMDA1XFx1MjAwNlxcdTIwMDdcXHUyMDA4XFx1MjAwOVxcdTIwMEFcXHUyMDJGXFx1MjA1RlxcdTMwMDBcXHUyMDI4JyxcbiAgICAnXFx1MjAyOVxcdUZFRkYnXG4gIF0uam9pbignJyk7XG4gIHZhciB0cmltUmVnZXhwID0gbmV3IFJlZ0V4cCgnKF5bJyArIHdzICsgJ10rKXwoWycgKyB3cyArICddKyQpJywgJ2cnKTtcbiAgdmFyIHRyaW1TaGltID0gZnVuY3Rpb24gdHJpbSgpIHtcbiAgICByZXR1cm4gRVMuVG9TdHJpbmcoRVMuUmVxdWlyZU9iamVjdENvZXJjaWJsZSh0aGlzKSkucmVwbGFjZSh0cmltUmVnZXhwLCAnJyk7XG4gIH07XG4gIHZhciBub25XUyA9IFsnXFx1MDA4NScsICdcXHUyMDBiJywgJ1xcdWZmZmUnXS5qb2luKCcnKTtcbiAgdmFyIG5vbldTcmVnZXggPSBuZXcgUmVnRXhwKCdbJyArIG5vbldTICsgJ10nLCAnZycpO1xuICB2YXIgaXNCYWRIZXhSZWdleCA9IC9eW1xcLStdMHhbMC05YS1mXSskL2k7XG4gIHZhciBoYXNTdHJpbmdUcmltQnVnID0gbm9uV1MudHJpbSgpLmxlbmd0aCAhPT0gbm9uV1MubGVuZ3RoO1xuICBkZWZpbmVQcm9wZXJ0eShTdHJpbmcucHJvdG90eXBlLCAndHJpbScsIHRyaW1TaGltLCBoYXNTdHJpbmdUcmltQnVnKTtcblxuICAvLyBzZWUgaHR0cHM6Ly9wZW9wbGUubW96aWxsYS5vcmcvfmpvcmVuZG9yZmYvZXM2LWRyYWZ0Lmh0bWwjc2VjLXN0cmluZy5wcm90b3R5cGUtQEBpdGVyYXRvclxuICB2YXIgU3RyaW5nSXRlcmF0b3IgPSBmdW5jdGlvbiAocykge1xuICAgIEVTLlJlcXVpcmVPYmplY3RDb2VyY2libGUocyk7XG4gICAgdGhpcy5fcyA9IEVTLlRvU3RyaW5nKHMpO1xuICAgIHRoaXMuX2kgPSAwO1xuICB9O1xuICBTdHJpbmdJdGVyYXRvci5wcm90b3R5cGUubmV4dCA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgcyA9IHRoaXMuX3MsIGkgPSB0aGlzLl9pO1xuICAgIGlmICh0eXBlb2YgcyA9PT0gJ3VuZGVmaW5lZCcgfHwgaSA+PSBzLmxlbmd0aCkge1xuICAgICAgdGhpcy5fcyA9IHZvaWQgMDtcbiAgICAgIHJldHVybiB7IHZhbHVlOiB2b2lkIDAsIGRvbmU6IHRydWUgfTtcbiAgICB9XG4gICAgdmFyIGZpcnN0ID0gcy5jaGFyQ29kZUF0KGkpLCBzZWNvbmQsIGxlbjtcbiAgICBpZiAoZmlyc3QgPCAweEQ4MDAgfHwgZmlyc3QgPiAweERCRkYgfHwgKGkgKyAxKSA9PT0gcy5sZW5ndGgpIHtcbiAgICAgIGxlbiA9IDE7XG4gICAgfSBlbHNlIHtcbiAgICAgIHNlY29uZCA9IHMuY2hhckNvZGVBdChpICsgMSk7XG4gICAgICBsZW4gPSAoc2Vjb25kIDwgMHhEQzAwIHx8IHNlY29uZCA+IDB4REZGRikgPyAxIDogMjtcbiAgICB9XG4gICAgdGhpcy5faSA9IGkgKyBsZW47XG4gICAgcmV0dXJuIHsgdmFsdWU6IHMuc3Vic3RyKGksIGxlbiksIGRvbmU6IGZhbHNlIH07XG4gIH07XG4gIGFkZEl0ZXJhdG9yKFN0cmluZ0l0ZXJhdG9yLnByb3RvdHlwZSk7XG4gIGFkZEl0ZXJhdG9yKFN0cmluZy5wcm90b3R5cGUsIGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gbmV3IFN0cmluZ0l0ZXJhdG9yKHRoaXMpO1xuICB9KTtcblxuICB2YXIgQXJyYXlTaGltcyA9IHtcbiAgICBmcm9tOiBmdW5jdGlvbiBmcm9tKGl0ZW1zKSB7XG4gICAgICB2YXIgQyA9IHRoaXM7XG4gICAgICB2YXIgbWFwRm47XG4gICAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgbWFwRm4gPSBhcmd1bWVudHNbMV07XG4gICAgICB9XG4gICAgICB2YXIgbWFwcGluZywgVDtcbiAgICAgIGlmICh0eXBlb2YgbWFwRm4gPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIG1hcHBpbmcgPSBmYWxzZTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGlmICghRVMuSXNDYWxsYWJsZShtYXBGbikpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdBcnJheS5mcm9tOiB3aGVuIHByb3ZpZGVkLCB0aGUgc2Vjb25kIGFyZ3VtZW50IG11c3QgYmUgYSBmdW5jdGlvbicpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID4gMikge1xuICAgICAgICAgIFQgPSBhcmd1bWVudHNbMl07XG4gICAgICAgIH1cbiAgICAgICAgbWFwcGluZyA9IHRydWU7XG4gICAgICB9XG5cbiAgICAgIC8vIE5vdGUgdGhhdCB0aGF0IEFycmF5cyB3aWxsIHVzZSBBcnJheUl0ZXJhdG9yOlxuICAgICAgLy8gaHR0cHM6Ly9idWdzLmVjbWFzY3JpcHQub3JnL3Nob3dfYnVnLmNnaT9pZD0yNDE2XG4gICAgICB2YXIgdXNpbmdJdGVyYXRvciA9IHR5cGVvZiAoaXNBcmd1bWVudHMoaXRlbXMpIHx8IEVTLkdldE1ldGhvZChpdGVtcywgJGl0ZXJhdG9yJCkpICE9PSAndW5kZWZpbmVkJztcblxuICAgICAgdmFyIGxlbmd0aCwgcmVzdWx0LCBpO1xuICAgICAgaWYgKHVzaW5nSXRlcmF0b3IpIHtcbiAgICAgICAgcmVzdWx0ID0gRVMuSXNDb25zdHJ1Y3RvcihDKSA/IE9iamVjdChuZXcgQygpKSA6IFtdO1xuICAgICAgICB2YXIgaXRlcmF0b3IgPSBFUy5HZXRJdGVyYXRvcihpdGVtcyk7XG4gICAgICAgIHZhciBuZXh0LCBuZXh0VmFsdWU7XG5cbiAgICAgICAgaSA9IDA7XG4gICAgICAgIHdoaWxlICh0cnVlKSB7XG4gICAgICAgICAgbmV4dCA9IEVTLkl0ZXJhdG9yU3RlcChpdGVyYXRvcik7XG4gICAgICAgICAgaWYgKG5leHQgPT09IGZhbHNlKSB7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICB9XG4gICAgICAgICAgbmV4dFZhbHVlID0gbmV4dC52YWx1ZTtcbiAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgaWYgKG1hcHBpbmcpIHtcbiAgICAgICAgICAgICAgbmV4dFZhbHVlID0gdHlwZW9mIFQgPT09ICd1bmRlZmluZWQnID8gbWFwRm4obmV4dFZhbHVlLCBpKSA6IF9jYWxsKG1hcEZuLCBULCBuZXh0VmFsdWUsIGkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmVzdWx0W2ldID0gbmV4dFZhbHVlO1xuICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIEVTLkl0ZXJhdG9yQ2xvc2UoaXRlcmF0b3IsIHRydWUpO1xuICAgICAgICAgICAgdGhyb3cgZTtcbiAgICAgICAgICB9XG4gICAgICAgICAgaSArPSAxO1xuICAgICAgICB9XG4gICAgICAgIGxlbmd0aCA9IGk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB2YXIgYXJyYXlMaWtlID0gRVMuVG9PYmplY3QoaXRlbXMpO1xuICAgICAgICBsZW5ndGggPSBFUy5Ub0xlbmd0aChhcnJheUxpa2UubGVuZ3RoKTtcbiAgICAgICAgcmVzdWx0ID0gRVMuSXNDb25zdHJ1Y3RvcihDKSA/IE9iamVjdChuZXcgQyhsZW5ndGgpKSA6IG5ldyBBcnJheShsZW5ndGgpO1xuICAgICAgICB2YXIgdmFsdWU7XG4gICAgICAgIGZvciAoaSA9IDA7IGkgPCBsZW5ndGg7ICsraSkge1xuICAgICAgICAgIHZhbHVlID0gYXJyYXlMaWtlW2ldO1xuICAgICAgICAgIGlmIChtYXBwaW5nKSB7XG4gICAgICAgICAgICB2YWx1ZSA9IHR5cGVvZiBUID09PSAndW5kZWZpbmVkJyA/IG1hcEZuKHZhbHVlLCBpKSA6IF9jYWxsKG1hcEZuLCBULCB2YWx1ZSwgaSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJlc3VsdFtpXSA9IHZhbHVlO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHJlc3VsdC5sZW5ndGggPSBsZW5ndGg7XG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH0sXG5cbiAgICBvZjogZnVuY3Rpb24gb2YoKSB7XG4gICAgICB2YXIgbGVuID0gYXJndW1lbnRzLmxlbmd0aDtcbiAgICAgIHZhciBDID0gdGhpcztcbiAgICAgIHZhciBBID0gaXNBcnJheShDKSB8fCAhRVMuSXNDYWxsYWJsZShDKSA/IG5ldyBBcnJheShsZW4pIDogRVMuQ29uc3RydWN0KEMsIFtsZW5dKTtcbiAgICAgIGZvciAodmFyIGsgPSAwOyBrIDwgbGVuOyArK2spIHtcbiAgICAgICAgY3JlYXRlRGF0YVByb3BlcnR5T3JUaHJvdyhBLCBrLCBhcmd1bWVudHNba10pO1xuICAgICAgfVxuICAgICAgQS5sZW5ndGggPSBsZW47XG4gICAgICByZXR1cm4gQTtcbiAgICB9XG4gIH07XG4gIGRlZmluZVByb3BlcnRpZXMoQXJyYXksIEFycmF5U2hpbXMpO1xuICBhZGREZWZhdWx0U3BlY2llcyhBcnJheSk7XG5cbiAgLy8gR2l2ZW4gYW4gYXJndW1lbnQgeCwgaXQgd2lsbCByZXR1cm4gYW4gSXRlcmF0b3JSZXN1bHQgb2JqZWN0LFxuICAvLyB3aXRoIHZhbHVlIHNldCB0byB4IGFuZCBkb25lIHRvIGZhbHNlLlxuICAvLyBHaXZlbiBubyBhcmd1bWVudHMsIGl0IHdpbGwgcmV0dXJuIGFuIGl0ZXJhdG9yIGNvbXBsZXRpb24gb2JqZWN0LlxuICB2YXIgaXRlcmF0b3JSZXN1bHQgPSBmdW5jdGlvbiAoeCkge1xuICAgIHJldHVybiB7IHZhbHVlOiB4LCBkb25lOiBhcmd1bWVudHMubGVuZ3RoID09PSAwIH07XG4gIH07XG5cbiAgLy8gT3VyIEFycmF5SXRlcmF0b3IgaXMgcHJpdmF0ZTsgc2VlXG4gIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS9wYXVsbWlsbHIvZXM2LXNoaW0vaXNzdWVzLzI1MlxuICBBcnJheUl0ZXJhdG9yID0gZnVuY3Rpb24gKGFycmF5LCBraW5kKSB7XG4gICAgICB0aGlzLmkgPSAwO1xuICAgICAgdGhpcy5hcnJheSA9IGFycmF5O1xuICAgICAgdGhpcy5raW5kID0ga2luZDtcbiAgfTtcblxuICBkZWZpbmVQcm9wZXJ0aWVzKEFycmF5SXRlcmF0b3IucHJvdG90eXBlLCB7XG4gICAgbmV4dDogZnVuY3Rpb24gKCkge1xuICAgICAgdmFyIGkgPSB0aGlzLmksIGFycmF5ID0gdGhpcy5hcnJheTtcbiAgICAgIGlmICghKHRoaXMgaW5zdGFuY2VvZiBBcnJheUl0ZXJhdG9yKSkge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdOb3QgYW4gQXJyYXlJdGVyYXRvcicpO1xuICAgICAgfVxuICAgICAgaWYgKHR5cGVvZiBhcnJheSAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgdmFyIGxlbiA9IEVTLlRvTGVuZ3RoKGFycmF5Lmxlbmd0aCk7XG4gICAgICAgIGZvciAoOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgICAgICB2YXIga2luZCA9IHRoaXMua2luZDtcbiAgICAgICAgICB2YXIgcmV0dmFsO1xuICAgICAgICAgIGlmIChraW5kID09PSAna2V5Jykge1xuICAgICAgICAgICAgcmV0dmFsID0gaTtcbiAgICAgICAgICB9IGVsc2UgaWYgKGtpbmQgPT09ICd2YWx1ZScpIHtcbiAgICAgICAgICAgIHJldHZhbCA9IGFycmF5W2ldO1xuICAgICAgICAgIH0gZWxzZSBpZiAoa2luZCA9PT0gJ2VudHJ5Jykge1xuICAgICAgICAgICAgcmV0dmFsID0gW2ksIGFycmF5W2ldXTtcbiAgICAgICAgICB9XG4gICAgICAgICAgdGhpcy5pID0gaSArIDE7XG4gICAgICAgICAgcmV0dXJuIHsgdmFsdWU6IHJldHZhbCwgZG9uZTogZmFsc2UgfTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgdGhpcy5hcnJheSA9IHZvaWQgMDtcbiAgICAgIHJldHVybiB7IHZhbHVlOiB2b2lkIDAsIGRvbmU6IHRydWUgfTtcbiAgICB9XG4gIH0pO1xuICBhZGRJdGVyYXRvcihBcnJheUl0ZXJhdG9yLnByb3RvdHlwZSk7XG5cbiAgdmFyIG9yZGVyS2V5cyA9IGZ1bmN0aW9uIG9yZGVyS2V5cyhhLCBiKSB7XG4gICAgdmFyIGFOdW1lcmljID0gU3RyaW5nKEVTLlRvSW50ZWdlcihhKSkgPT09IGE7XG4gICAgdmFyIGJOdW1lcmljID0gU3RyaW5nKEVTLlRvSW50ZWdlcihiKSkgPT09IGI7XG4gICAgaWYgKGFOdW1lcmljICYmIGJOdW1lcmljKSB7XG4gICAgICByZXR1cm4gYiAtIGE7XG4gICAgfSBlbHNlIGlmIChhTnVtZXJpYyAmJiAhYk51bWVyaWMpIHtcbiAgICAgIHJldHVybiAtMTtcbiAgICB9IGVsc2UgaWYgKCFhTnVtZXJpYyAmJiBiTnVtZXJpYykge1xuICAgICAgcmV0dXJuIDE7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBhLmxvY2FsZUNvbXBhcmUoYik7XG4gICAgfVxuICB9O1xuICB2YXIgZ2V0QWxsS2V5cyA9IGZ1bmN0aW9uIGdldEFsbEtleXMob2JqZWN0KSB7XG4gICAgdmFyIG93bktleXMgPSBbXTtcbiAgICB2YXIga2V5cyA9IFtdO1xuXG4gICAgZm9yICh2YXIga2V5IGluIG9iamVjdCkge1xuICAgICAgX3B1c2goX2hhc093blByb3BlcnR5KG9iamVjdCwga2V5KSA/IG93bktleXMgOiBrZXlzLCBrZXkpO1xuICAgIH1cbiAgICBfc29ydChvd25LZXlzLCBvcmRlcktleXMpO1xuICAgIF9zb3J0KGtleXMsIG9yZGVyS2V5cyk7XG5cbiAgICByZXR1cm4gX2NvbmNhdChvd25LZXlzLCBrZXlzKTtcbiAgfTtcblxuICAvLyBub3RlOiB0aGlzIGlzIHBvc2l0aW9uZWQgaGVyZSBiZWNhdXNlIGl0IGRlcGVuZHMgb24gQXJyYXlJdGVyYXRvclxuICB2YXIgYXJyYXlPZlN1cHBvcnRzU3ViY2xhc3NpbmcgPSBBcnJheS5vZiA9PT0gQXJyYXlTaGltcy5vZiB8fCAoZnVuY3Rpb24gKCkge1xuICAgIC8vIERldGVjdHMgYSBidWcgaW4gV2Via2l0IG5pZ2h0bHkgcjE4MTg4NlxuICAgIHZhciBGb28gPSBmdW5jdGlvbiBGb28obGVuKSB7IHRoaXMubGVuZ3RoID0gbGVuOyB9O1xuICAgIEZvby5wcm90b3R5cGUgPSBbXTtcbiAgICB2YXIgZm9vQXJyID0gQXJyYXkub2YuYXBwbHkoRm9vLCBbMSwgMl0pO1xuICAgIHJldHVybiBmb29BcnIgaW5zdGFuY2VvZiBGb28gJiYgZm9vQXJyLmxlbmd0aCA9PT0gMjtcbiAgfSgpKTtcbiAgaWYgKCFhcnJheU9mU3VwcG9ydHNTdWJjbGFzc2luZykge1xuICAgIG92ZXJyaWRlTmF0aXZlKEFycmF5LCAnb2YnLCBBcnJheVNoaW1zLm9mKTtcbiAgfVxuXG4gIHZhciBBcnJheVByb3RvdHlwZVNoaW1zID0ge1xuICAgIGNvcHlXaXRoaW46IGZ1bmN0aW9uIGNvcHlXaXRoaW4odGFyZ2V0LCBzdGFydCkge1xuICAgICAgdmFyIG8gPSBFUy5Ub09iamVjdCh0aGlzKTtcbiAgICAgIHZhciBsZW4gPSBFUy5Ub0xlbmd0aChvLmxlbmd0aCk7XG4gICAgICB2YXIgcmVsYXRpdmVUYXJnZXQgPSBFUy5Ub0ludGVnZXIodGFyZ2V0KTtcbiAgICAgIHZhciByZWxhdGl2ZVN0YXJ0ID0gRVMuVG9JbnRlZ2VyKHN0YXJ0KTtcbiAgICAgIHZhciB0byA9IHJlbGF0aXZlVGFyZ2V0IDwgMCA/IF9tYXgobGVuICsgcmVsYXRpdmVUYXJnZXQsIDApIDogX21pbihyZWxhdGl2ZVRhcmdldCwgbGVuKTtcbiAgICAgIHZhciBmcm9tID0gcmVsYXRpdmVTdGFydCA8IDAgPyBfbWF4KGxlbiArIHJlbGF0aXZlU3RhcnQsIDApIDogX21pbihyZWxhdGl2ZVN0YXJ0LCBsZW4pO1xuICAgICAgdmFyIGVuZDtcbiAgICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID4gMikge1xuICAgICAgICBlbmQgPSBhcmd1bWVudHNbMl07XG4gICAgICB9XG4gICAgICB2YXIgcmVsYXRpdmVFbmQgPSB0eXBlb2YgZW5kID09PSAndW5kZWZpbmVkJyA/IGxlbiA6IEVTLlRvSW50ZWdlcihlbmQpO1xuICAgICAgdmFyIGZpbmFsSXRlbSA9IHJlbGF0aXZlRW5kIDwgMCA/IF9tYXgobGVuICsgcmVsYXRpdmVFbmQsIDApIDogX21pbihyZWxhdGl2ZUVuZCwgbGVuKTtcbiAgICAgIHZhciBjb3VudCA9IF9taW4oZmluYWxJdGVtIC0gZnJvbSwgbGVuIC0gdG8pO1xuICAgICAgdmFyIGRpcmVjdGlvbiA9IDE7XG4gICAgICBpZiAoZnJvbSA8IHRvICYmIHRvIDwgKGZyb20gKyBjb3VudCkpIHtcbiAgICAgICAgZGlyZWN0aW9uID0gLTE7XG4gICAgICAgIGZyb20gKz0gY291bnQgLSAxO1xuICAgICAgICB0byArPSBjb3VudCAtIDE7XG4gICAgICB9XG4gICAgICB3aGlsZSAoY291bnQgPiAwKSB7XG4gICAgICAgIGlmIChmcm9tIGluIG8pIHtcbiAgICAgICAgICBvW3RvXSA9IG9bZnJvbV07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgZGVsZXRlIG9bdG9dO1xuICAgICAgICB9XG4gICAgICAgIGZyb20gKz0gZGlyZWN0aW9uO1xuICAgICAgICB0byArPSBkaXJlY3Rpb247XG4gICAgICAgIGNvdW50IC09IDE7XG4gICAgICB9XG4gICAgICByZXR1cm4gbztcbiAgICB9LFxuXG4gICAgZmlsbDogZnVuY3Rpb24gZmlsbCh2YWx1ZSkge1xuICAgICAgdmFyIHN0YXJ0O1xuICAgICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPiAxKSB7XG4gICAgICAgIHN0YXJ0ID0gYXJndW1lbnRzWzFdO1xuICAgICAgfVxuICAgICAgdmFyIGVuZDtcbiAgICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID4gMikge1xuICAgICAgICBlbmQgPSBhcmd1bWVudHNbMl07XG4gICAgICB9XG4gICAgICB2YXIgTyA9IEVTLlRvT2JqZWN0KHRoaXMpO1xuICAgICAgdmFyIGxlbiA9IEVTLlRvTGVuZ3RoKE8ubGVuZ3RoKTtcbiAgICAgIHN0YXJ0ID0gRVMuVG9JbnRlZ2VyKHR5cGVvZiBzdGFydCA9PT0gJ3VuZGVmaW5lZCcgPyAwIDogc3RhcnQpO1xuICAgICAgZW5kID0gRVMuVG9JbnRlZ2VyKHR5cGVvZiBlbmQgPT09ICd1bmRlZmluZWQnID8gbGVuIDogZW5kKTtcblxuICAgICAgdmFyIHJlbGF0aXZlU3RhcnQgPSBzdGFydCA8IDAgPyBfbWF4KGxlbiArIHN0YXJ0LCAwKSA6IF9taW4oc3RhcnQsIGxlbik7XG4gICAgICB2YXIgcmVsYXRpdmVFbmQgPSBlbmQgPCAwID8gbGVuICsgZW5kIDogZW5kO1xuXG4gICAgICBmb3IgKHZhciBpID0gcmVsYXRpdmVTdGFydDsgaSA8IGxlbiAmJiBpIDwgcmVsYXRpdmVFbmQ7ICsraSkge1xuICAgICAgICBPW2ldID0gdmFsdWU7XG4gICAgICB9XG4gICAgICByZXR1cm4gTztcbiAgICB9LFxuXG4gICAgZmluZDogZnVuY3Rpb24gZmluZChwcmVkaWNhdGUpIHtcbiAgICAgIHZhciBsaXN0ID0gRVMuVG9PYmplY3QodGhpcyk7XG4gICAgICB2YXIgbGVuZ3RoID0gRVMuVG9MZW5ndGgobGlzdC5sZW5ndGgpO1xuICAgICAgaWYgKCFFUy5Jc0NhbGxhYmxlKHByZWRpY2F0ZSkpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignQXJyYXkjZmluZDogcHJlZGljYXRlIG11c3QgYmUgYSBmdW5jdGlvbicpO1xuICAgICAgfVxuICAgICAgdmFyIHRoaXNBcmcgPSBhcmd1bWVudHMubGVuZ3RoID4gMSA/IGFyZ3VtZW50c1sxXSA6IG51bGw7XG4gICAgICBmb3IgKHZhciBpID0gMCwgdmFsdWU7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgICB2YWx1ZSA9IGxpc3RbaV07XG4gICAgICAgIGlmICh0aGlzQXJnKSB7XG4gICAgICAgICAgaWYgKF9jYWxsKHByZWRpY2F0ZSwgdGhpc0FyZywgdmFsdWUsIGksIGxpc3QpKSB7IHJldHVybiB2YWx1ZTsgfVxuICAgICAgICB9IGVsc2UgaWYgKHByZWRpY2F0ZSh2YWx1ZSwgaSwgbGlzdCkpIHtcbiAgICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9LFxuXG4gICAgZmluZEluZGV4OiBmdW5jdGlvbiBmaW5kSW5kZXgocHJlZGljYXRlKSB7XG4gICAgICB2YXIgbGlzdCA9IEVTLlRvT2JqZWN0KHRoaXMpO1xuICAgICAgdmFyIGxlbmd0aCA9IEVTLlRvTGVuZ3RoKGxpc3QubGVuZ3RoKTtcbiAgICAgIGlmICghRVMuSXNDYWxsYWJsZShwcmVkaWNhdGUpKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0FycmF5I2ZpbmRJbmRleDogcHJlZGljYXRlIG11c3QgYmUgYSBmdW5jdGlvbicpO1xuICAgICAgfVxuICAgICAgdmFyIHRoaXNBcmcgPSBhcmd1bWVudHMubGVuZ3RoID4gMSA/IGFyZ3VtZW50c1sxXSA6IG51bGw7XG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGlmICh0aGlzQXJnKSB7XG4gICAgICAgICAgaWYgKF9jYWxsKHByZWRpY2F0ZSwgdGhpc0FyZywgbGlzdFtpXSwgaSwgbGlzdCkpIHsgcmV0dXJuIGk7IH1cbiAgICAgICAgfSBlbHNlIGlmIChwcmVkaWNhdGUobGlzdFtpXSwgaSwgbGlzdCkpIHtcbiAgICAgICAgICByZXR1cm4gaTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIC0xO1xuICAgIH0sXG5cbiAgICBrZXlzOiBmdW5jdGlvbiBrZXlzKCkge1xuICAgICAgcmV0dXJuIG5ldyBBcnJheUl0ZXJhdG9yKHRoaXMsICdrZXknKTtcbiAgICB9LFxuXG4gICAgdmFsdWVzOiBmdW5jdGlvbiB2YWx1ZXMoKSB7XG4gICAgICByZXR1cm4gbmV3IEFycmF5SXRlcmF0b3IodGhpcywgJ3ZhbHVlJyk7XG4gICAgfSxcblxuICAgIGVudHJpZXM6IGZ1bmN0aW9uIGVudHJpZXMoKSB7XG4gICAgICByZXR1cm4gbmV3IEFycmF5SXRlcmF0b3IodGhpcywgJ2VudHJ5Jyk7XG4gICAgfVxuICB9O1xuICAvLyBTYWZhcmkgNy4xIGRlZmluZXMgQXJyYXkja2V5cyBhbmQgQXJyYXkjZW50cmllcyBuYXRpdmVseSxcbiAgLy8gYnV0IHRoZSByZXN1bHRpbmcgQXJyYXlJdGVyYXRvciBvYmplY3RzIGRvbid0IGhhdmUgYSBcIm5leHRcIiBtZXRob2QuXG4gIGlmIChBcnJheS5wcm90b3R5cGUua2V5cyAmJiAhRVMuSXNDYWxsYWJsZShbMV0ua2V5cygpLm5leHQpKSB7XG4gICAgZGVsZXRlIEFycmF5LnByb3RvdHlwZS5rZXlzO1xuICB9XG4gIGlmIChBcnJheS5wcm90b3R5cGUuZW50cmllcyAmJiAhRVMuSXNDYWxsYWJsZShbMV0uZW50cmllcygpLm5leHQpKSB7XG4gICAgZGVsZXRlIEFycmF5LnByb3RvdHlwZS5lbnRyaWVzO1xuICB9XG5cbiAgLy8gQ2hyb21lIDM4IGRlZmluZXMgQXJyYXkja2V5cyBhbmQgQXJyYXkjZW50cmllcywgYW5kIEFycmF5I0BAaXRlcmF0b3IsIGJ1dCBub3QgQXJyYXkjdmFsdWVzXG4gIGlmIChBcnJheS5wcm90b3R5cGUua2V5cyAmJiBBcnJheS5wcm90b3R5cGUuZW50cmllcyAmJiAhQXJyYXkucHJvdG90eXBlLnZhbHVlcyAmJiBBcnJheS5wcm90b3R5cGVbJGl0ZXJhdG9yJF0pIHtcbiAgICBkZWZpbmVQcm9wZXJ0aWVzKEFycmF5LnByb3RvdHlwZSwge1xuICAgICAgdmFsdWVzOiBBcnJheS5wcm90b3R5cGVbJGl0ZXJhdG9yJF1cbiAgICB9KTtcbiAgICBpZiAoVHlwZS5zeW1ib2woU3ltYm9sLnVuc2NvcGFibGVzKSkge1xuICAgICAgQXJyYXkucHJvdG90eXBlW1N5bWJvbC51bnNjb3BhYmxlc10udmFsdWVzID0gdHJ1ZTtcbiAgICB9XG4gIH1cbiAgLy8gQ2hyb21lIDQwIGRlZmluZXMgQXJyYXkjdmFsdWVzIHdpdGggdGhlIGluY29ycmVjdCBuYW1lLCBhbHRob3VnaCBBcnJheSN7a2V5cyxlbnRyaWVzfSBoYXZlIHRoZSBjb3JyZWN0IG5hbWVcbiAgaWYgKGZ1bmN0aW9uc0hhdmVOYW1lcyAmJiBBcnJheS5wcm90b3R5cGUudmFsdWVzICYmIEFycmF5LnByb3RvdHlwZS52YWx1ZXMubmFtZSAhPT0gJ3ZhbHVlcycpIHtcbiAgICB2YXIgb3JpZ2luYWxBcnJheVByb3RvdHlwZVZhbHVlcyA9IEFycmF5LnByb3RvdHlwZS52YWx1ZXM7XG4gICAgb3ZlcnJpZGVOYXRpdmUoQXJyYXkucHJvdG90eXBlLCAndmFsdWVzJywgZnVuY3Rpb24gdmFsdWVzKCkgeyByZXR1cm4gRVMuQ2FsbChvcmlnaW5hbEFycmF5UHJvdG90eXBlVmFsdWVzLCB0aGlzLCBhcmd1bWVudHMpOyB9KTtcbiAgICBkZWZpbmVQcm9wZXJ0eShBcnJheS5wcm90b3R5cGUsICRpdGVyYXRvciQsIEFycmF5LnByb3RvdHlwZS52YWx1ZXMsIHRydWUpO1xuICB9XG4gIGRlZmluZVByb3BlcnRpZXMoQXJyYXkucHJvdG90eXBlLCBBcnJheVByb3RvdHlwZVNoaW1zKTtcblxuICBpZiAoMSAvIFt0cnVlXS5pbmRleE9mKHRydWUsIC0wKSA8IDApIHtcbiAgICAvLyBpbmRleE9mIHdoZW4gZ2l2ZW4gYSBwb3NpdGlvbiBhcmcgb2YgLTAgc2hvdWxkIHJldHVybiArMC5cbiAgICAvLyBodHRwczovL2dpdGh1Yi5jb20vdGMzOS9lY21hMjYyL3B1bGwvMzE2XG4gICAgZGVmaW5lUHJvcGVydHkoQXJyYXkucHJvdG90eXBlLCAnaW5kZXhPZicsIGZ1bmN0aW9uIGluZGV4T2Yoc2VhcmNoRWxlbWVudCkge1xuICAgICAgdmFyIHZhbHVlID0gX2FycmF5SW5kZXhPZkFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICBpZiAodmFsdWUgPT09IDAgJiYgKDEgLyB2YWx1ZSkgPCAwKSB7XG4gICAgICAgIHJldHVybiAwO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHZhbHVlO1xuICAgIH0sIHRydWUpO1xuICB9XG5cbiAgYWRkSXRlcmF0b3IoQXJyYXkucHJvdG90eXBlLCBmdW5jdGlvbiAoKSB7IHJldHVybiB0aGlzLnZhbHVlcygpOyB9KTtcbiAgLy8gQ2hyb21lIGRlZmluZXMga2V5cy92YWx1ZXMvZW50cmllcyBvbiBBcnJheSwgYnV0IGRvZXNuJ3QgZ2l2ZSB1c1xuICAvLyBhbnkgd2F5IHRvIGlkZW50aWZ5IGl0cyBpdGVyYXRvci4gIFNvIGFkZCBvdXIgb3duIHNoaW1tZWQgZmllbGQuXG4gIGlmIChPYmplY3QuZ2V0UHJvdG90eXBlT2YpIHtcbiAgICBhZGRJdGVyYXRvcihPYmplY3QuZ2V0UHJvdG90eXBlT2YoW10udmFsdWVzKCkpKTtcbiAgfVxuXG4gIC8vIG5vdGU6IHRoaXMgaXMgcG9zaXRpb25lZCBoZXJlIGJlY2F1c2UgaXQgcmVsaWVzIG9uIEFycmF5I2VudHJpZXNcbiAgdmFyIGFycmF5RnJvbVN3YWxsb3dzTmVnYXRpdmVMZW5ndGhzID0gKGZ1bmN0aW9uICgpIHtcbiAgICAvLyBEZXRlY3RzIGEgRmlyZWZveCBidWcgaW4gdjMyXG4gICAgLy8gaHR0cHM6Ly9idWd6aWxsYS5tb3ppbGxhLm9yZy9zaG93X2J1Zy5jZ2k/aWQ9MTA2Mzk5M1xuICAgIHJldHVybiB2YWx1ZU9yRmFsc2VJZlRocm93cyhmdW5jdGlvbiAoKSB7IHJldHVybiBBcnJheS5mcm9tKHsgbGVuZ3RoOiAtMSB9KS5sZW5ndGggPT09IDA7IH0pO1xuICB9KCkpO1xuICB2YXIgYXJyYXlGcm9tSGFuZGxlc0l0ZXJhYmxlcyA9IChmdW5jdGlvbiAoKSB7XG4gICAgLy8gRGV0ZWN0cyBhIGJ1ZyBpbiBXZWJraXQgbmlnaHRseSByMTgxODg2XG4gICAgdmFyIGFyciA9IEFycmF5LmZyb20oWzBdLmVudHJpZXMoKSk7XG4gICAgcmV0dXJuIGFyci5sZW5ndGggPT09IDEgJiYgaXNBcnJheShhcnJbMF0pICYmIGFyclswXVswXSA9PT0gMCAmJiBhcnJbMF1bMV0gPT09IDA7XG4gIH0oKSk7XG4gIGlmICghYXJyYXlGcm9tU3dhbGxvd3NOZWdhdGl2ZUxlbmd0aHMgfHwgIWFycmF5RnJvbUhhbmRsZXNJdGVyYWJsZXMpIHtcbiAgICBvdmVycmlkZU5hdGl2ZShBcnJheSwgJ2Zyb20nLCBBcnJheVNoaW1zLmZyb20pO1xuICB9XG4gIHZhciBhcnJheUZyb21IYW5kbGVzVW5kZWZpbmVkTWFwRnVuY3Rpb24gPSAoZnVuY3Rpb24gKCkge1xuICAgIC8vIE1pY3Jvc29mdCBFZGdlIHYwLjExIHRocm93cyBpZiB0aGUgbWFwRm4gYXJndW1lbnQgaXMgKnByb3ZpZGVkKiBidXQgdW5kZWZpbmVkLFxuICAgIC8vIGJ1dCB0aGUgc3BlYyBkb2Vzbid0IGNhcmUgaWYgaXQncyBwcm92aWRlZCBvciBub3QgLSB1bmRlZmluZWQgZG9lc24ndCB0aHJvdy5cbiAgICByZXR1cm4gdmFsdWVPckZhbHNlSWZUaHJvd3MoZnVuY3Rpb24gKCkgeyByZXR1cm4gQXJyYXkuZnJvbShbMF0sIHZvaWQgMCk7IH0pO1xuICB9KCkpO1xuICBpZiAoIWFycmF5RnJvbUhhbmRsZXNVbmRlZmluZWRNYXBGdW5jdGlvbikge1xuICAgIHZhciBvcmlnQXJyYXlGcm9tID0gQXJyYXkuZnJvbTtcbiAgICBvdmVycmlkZU5hdGl2ZShBcnJheSwgJ2Zyb20nLCBmdW5jdGlvbiBmcm9tKGl0ZW1zKSB7XG4gICAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+IDEgJiYgdHlwZW9mIGFyZ3VtZW50c1sxXSAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgcmV0dXJuIEVTLkNhbGwob3JpZ0FycmF5RnJvbSwgdGhpcywgYXJndW1lbnRzKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBfY2FsbChvcmlnQXJyYXlGcm9tLCB0aGlzLCBpdGVtcyk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICB2YXIgaW50MzJzQXNPbmUgPSAtKE1hdGgucG93KDIsIDMyKSAtIDEpO1xuICB2YXIgdG9MZW5ndGhzQ29ycmVjdGx5ID0gZnVuY3Rpb24gKG1ldGhvZCwgcmV2ZXJzZWQpIHtcbiAgICB2YXIgb2JqID0geyBsZW5ndGg6IGludDMyc0FzT25lIH07XG4gICAgb2JqW3JldmVyc2VkID8gKChvYmoubGVuZ3RoID4+PiAwKSAtIDEpIDogMF0gPSB0cnVlO1xuICAgIHJldHVybiB2YWx1ZU9yRmFsc2VJZlRocm93cyhmdW5jdGlvbiAoKSB7XG4gICAgICBfY2FsbChtZXRob2QsIG9iaiwgZnVuY3Rpb24gKCkge1xuICAgICAgICAvLyBub3RlOiBpbiBub25jb25mb3JtaW5nIGJyb3dzZXJzLCB0aGlzIHdpbGwgYmUgY2FsbGVkXG4gICAgICAgIC8vIC0xID4+PiAwIHRpbWVzLCB3aGljaCBpcyA0Mjk0OTY3Mjk1LCBzbyB0aGUgdGhyb3cgbWF0dGVycy5cbiAgICAgICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ3Nob3VsZCBub3QgcmVhY2ggaGVyZScpO1xuICAgICAgfSwgW10pO1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSk7XG4gIH07XG4gIGlmICghdG9MZW5ndGhzQ29ycmVjdGx5KEFycmF5LnByb3RvdHlwZS5mb3JFYWNoKSkge1xuICAgIHZhciBvcmlnaW5hbEZvckVhY2ggPSBBcnJheS5wcm90b3R5cGUuZm9yRWFjaDtcbiAgICBvdmVycmlkZU5hdGl2ZShBcnJheS5wcm90b3R5cGUsICdmb3JFYWNoJywgZnVuY3Rpb24gZm9yRWFjaChjYWxsYmFja0ZuKSB7XG4gICAgICByZXR1cm4gRVMuQ2FsbChvcmlnaW5hbEZvckVhY2gsIHRoaXMubGVuZ3RoID49IDAgPyB0aGlzIDogW10sIGFyZ3VtZW50cyk7XG4gICAgfSwgdHJ1ZSk7XG4gIH1cbiAgaWYgKCF0b0xlbmd0aHNDb3JyZWN0bHkoQXJyYXkucHJvdG90eXBlLm1hcCkpIHtcbiAgICB2YXIgb3JpZ2luYWxNYXAgPSBBcnJheS5wcm90b3R5cGUubWFwO1xuICAgIG92ZXJyaWRlTmF0aXZlKEFycmF5LnByb3RvdHlwZSwgJ21hcCcsIGZ1bmN0aW9uIG1hcChjYWxsYmFja0ZuKSB7XG4gICAgICByZXR1cm4gRVMuQ2FsbChvcmlnaW5hbE1hcCwgdGhpcy5sZW5ndGggPj0gMCA/IHRoaXMgOiBbXSwgYXJndW1lbnRzKTtcbiAgICB9LCB0cnVlKTtcbiAgfVxuICBpZiAoIXRvTGVuZ3Roc0NvcnJlY3RseShBcnJheS5wcm90b3R5cGUuZmlsdGVyKSkge1xuICAgIHZhciBvcmlnaW5hbEZpbHRlciA9IEFycmF5LnByb3RvdHlwZS5maWx0ZXI7XG4gICAgb3ZlcnJpZGVOYXRpdmUoQXJyYXkucHJvdG90eXBlLCAnZmlsdGVyJywgZnVuY3Rpb24gZmlsdGVyKGNhbGxiYWNrRm4pIHtcbiAgICAgIHJldHVybiBFUy5DYWxsKG9yaWdpbmFsRmlsdGVyLCB0aGlzLmxlbmd0aCA+PSAwID8gdGhpcyA6IFtdLCBhcmd1bWVudHMpO1xuICAgIH0sIHRydWUpO1xuICB9XG4gIGlmICghdG9MZW5ndGhzQ29ycmVjdGx5KEFycmF5LnByb3RvdHlwZS5zb21lKSkge1xuICAgIHZhciBvcmlnaW5hbFNvbWUgPSBBcnJheS5wcm90b3R5cGUuc29tZTtcbiAgICBvdmVycmlkZU5hdGl2ZShBcnJheS5wcm90b3R5cGUsICdzb21lJywgZnVuY3Rpb24gc29tZShjYWxsYmFja0ZuKSB7XG4gICAgICByZXR1cm4gRVMuQ2FsbChvcmlnaW5hbFNvbWUsIHRoaXMubGVuZ3RoID49IDAgPyB0aGlzIDogW10sIGFyZ3VtZW50cyk7XG4gICAgfSwgdHJ1ZSk7XG4gIH1cbiAgaWYgKCF0b0xlbmd0aHNDb3JyZWN0bHkoQXJyYXkucHJvdG90eXBlLmV2ZXJ5KSkge1xuICAgIHZhciBvcmlnaW5hbEV2ZXJ5ID0gQXJyYXkucHJvdG90eXBlLmV2ZXJ5O1xuICAgIG92ZXJyaWRlTmF0aXZlKEFycmF5LnByb3RvdHlwZSwgJ2V2ZXJ5JywgZnVuY3Rpb24gZXZlcnkoY2FsbGJhY2tGbikge1xuICAgICAgcmV0dXJuIEVTLkNhbGwob3JpZ2luYWxFdmVyeSwgdGhpcy5sZW5ndGggPj0gMCA/IHRoaXMgOiBbXSwgYXJndW1lbnRzKTtcbiAgICB9LCB0cnVlKTtcbiAgfVxuICBpZiAoIXRvTGVuZ3Roc0NvcnJlY3RseShBcnJheS5wcm90b3R5cGUucmVkdWNlKSkge1xuICAgIHZhciBvcmlnaW5hbFJlZHVjZSA9IEFycmF5LnByb3RvdHlwZS5yZWR1Y2U7XG4gICAgb3ZlcnJpZGVOYXRpdmUoQXJyYXkucHJvdG90eXBlLCAncmVkdWNlJywgZnVuY3Rpb24gcmVkdWNlKGNhbGxiYWNrRm4pIHtcbiAgICAgIHJldHVybiBFUy5DYWxsKG9yaWdpbmFsUmVkdWNlLCB0aGlzLmxlbmd0aCA+PSAwID8gdGhpcyA6IFtdLCBhcmd1bWVudHMpO1xuICAgIH0sIHRydWUpO1xuICB9XG4gIGlmICghdG9MZW5ndGhzQ29ycmVjdGx5KEFycmF5LnByb3RvdHlwZS5yZWR1Y2VSaWdodCwgdHJ1ZSkpIHtcbiAgICB2YXIgb3JpZ2luYWxSZWR1Y2VSaWdodCA9IEFycmF5LnByb3RvdHlwZS5yZWR1Y2VSaWdodDtcbiAgICBvdmVycmlkZU5hdGl2ZShBcnJheS5wcm90b3R5cGUsICdyZWR1Y2VSaWdodCcsIGZ1bmN0aW9uIHJlZHVjZVJpZ2h0KGNhbGxiYWNrRm4pIHtcbiAgICAgIHJldHVybiBFUy5DYWxsKG9yaWdpbmFsUmVkdWNlUmlnaHQsIHRoaXMubGVuZ3RoID49IDAgPyB0aGlzIDogW10sIGFyZ3VtZW50cyk7XG4gICAgfSwgdHJ1ZSk7XG4gIH1cblxuICB2YXIgbGFja3NPY3RhbFN1cHBvcnQgPSBOdW1iZXIoJzBvMTAnKSAhPT0gODtcbiAgdmFyIGxhY2tzQmluYXJ5U3VwcG9ydCA9IE51bWJlcignMGIxMCcpICE9PSAyO1xuICB2YXIgdHJpbXNOb25XaGl0ZXNwYWNlID0gX3NvbWUobm9uV1MsIGZ1bmN0aW9uIChjKSB7XG4gICAgcmV0dXJuIE51bWJlcihjICsgMCArIGMpID09PSAwO1xuICB9KTtcbiAgaWYgKGxhY2tzT2N0YWxTdXBwb3J0IHx8IGxhY2tzQmluYXJ5U3VwcG9ydCB8fCB0cmltc05vbldoaXRlc3BhY2UpIHtcbiAgICB2YXIgT3JpZ051bWJlciA9IE51bWJlcjtcbiAgICB2YXIgYmluYXJ5UmVnZXggPSAvXjBiWzAxXSskL2k7XG4gICAgdmFyIG9jdGFsUmVnZXggPSAvXjBvWzAtN10rJC9pO1xuICAgIC8vIE5vdGUgdGhhdCBpbiBJRSA4LCBSZWdFeHAucHJvdG90eXBlLnRlc3QgZG9lc24ndCBzZWVtIHRvIGV4aXN0OiBpZSwgXCJ0ZXN0XCIgaXMgYW4gb3duIHByb3BlcnR5IG9mIHJlZ2V4ZXMuIHd0Zi5cbiAgICB2YXIgaXNCaW5hcnkgPSBiaW5hcnlSZWdleC50ZXN0LmJpbmQoYmluYXJ5UmVnZXgpO1xuICAgIHZhciBpc09jdGFsID0gb2N0YWxSZWdleC50ZXN0LmJpbmQob2N0YWxSZWdleCk7XG4gICAgdmFyIHRvUHJpbWl0aXZlID0gZnVuY3Rpb24gKE8pIHsgLy8gbmVlZCB0byByZXBsYWNlIHRoaXMgd2l0aCBgZXMtdG8tcHJpbWl0aXZlL2VzNmBcbiAgICAgIHZhciByZXN1bHQ7XG4gICAgICBpZiAodHlwZW9mIE8udmFsdWVPZiA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICByZXN1bHQgPSBPLnZhbHVlT2YoKTtcbiAgICAgICAgaWYgKFR5cGUucHJpbWl0aXZlKHJlc3VsdCkpIHtcbiAgICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBpZiAodHlwZW9mIE8udG9TdHJpbmcgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgcmVzdWx0ID0gTy50b1N0cmluZygpO1xuICAgICAgICBpZiAoVHlwZS5wcmltaXRpdmUocmVzdWx0KSkge1xuICAgICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ05vIGRlZmF1bHQgdmFsdWUnKTtcbiAgICB9O1xuICAgIHZhciBoYXNOb25XUyA9IG5vbldTcmVnZXgudGVzdC5iaW5kKG5vbldTcmVnZXgpO1xuICAgIHZhciBpc0JhZEhleCA9IGlzQmFkSGV4UmVnZXgudGVzdC5iaW5kKGlzQmFkSGV4UmVnZXgpO1xuICAgIHZhciBOdW1iZXJTaGltID0gKGZ1bmN0aW9uICgpIHtcbiAgICAgIC8vIHRoaXMgaXMgd3JhcHBlZCBpbiBhbiBJSUZFIGJlY2F1c2Ugb2YgSUUgNi04J3Mgd2Fja3kgc2NvcGluZyBpc3N1ZXMgd2l0aCBuYW1lZCBmdW5jdGlvbiBleHByZXNzaW9ucy5cbiAgICAgIHZhciBOdW1iZXJTaGltID0gZnVuY3Rpb24gTnVtYmVyKHZhbHVlKSB7XG4gICAgICAgIHZhciBwcmltVmFsdWU7XG4gICAgICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID4gMCkge1xuICAgICAgICAgIHByaW1WYWx1ZSA9IFR5cGUucHJpbWl0aXZlKHZhbHVlKSA/IHZhbHVlIDogdG9QcmltaXRpdmUodmFsdWUsICdudW1iZXInKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBwcmltVmFsdWUgPSAwO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0eXBlb2YgcHJpbVZhbHVlID09PSAnc3RyaW5nJykge1xuICAgICAgICAgIHByaW1WYWx1ZSA9IEVTLkNhbGwodHJpbVNoaW0sIHByaW1WYWx1ZSk7XG4gICAgICAgICAgaWYgKGlzQmluYXJ5KHByaW1WYWx1ZSkpIHtcbiAgICAgICAgICAgIHByaW1WYWx1ZSA9IHBhcnNlSW50KF9zdHJTbGljZShwcmltVmFsdWUsIDIpLCAyKTtcbiAgICAgICAgICB9IGVsc2UgaWYgKGlzT2N0YWwocHJpbVZhbHVlKSkge1xuICAgICAgICAgICAgcHJpbVZhbHVlID0gcGFyc2VJbnQoX3N0clNsaWNlKHByaW1WYWx1ZSwgMiksIDgpO1xuICAgICAgICAgIH0gZWxzZSBpZiAoaGFzTm9uV1MocHJpbVZhbHVlKSB8fCBpc0JhZEhleChwcmltVmFsdWUpKSB7XG4gICAgICAgICAgICBwcmltVmFsdWUgPSBOYU47XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHZhciByZWNlaXZlciA9IHRoaXM7XG4gICAgICAgIHZhciB2YWx1ZU9mU3VjY2VlZHMgPSB2YWx1ZU9yRmFsc2VJZlRocm93cyhmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgT3JpZ051bWJlci5wcm90b3R5cGUudmFsdWVPZi5jYWxsKHJlY2VpdmVyKTtcbiAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfSk7XG4gICAgICAgIGlmIChyZWNlaXZlciBpbnN0YW5jZW9mIE51bWJlclNoaW0gJiYgIXZhbHVlT2ZTdWNjZWVkcykge1xuICAgICAgICAgIHJldHVybiBuZXcgT3JpZ051bWJlcihwcmltVmFsdWUpO1xuICAgICAgICB9XG4gICAgICAgIC8qIGpzaGludCBuZXdjYXA6IGZhbHNlICovXG4gICAgICAgIHJldHVybiBPcmlnTnVtYmVyKHByaW1WYWx1ZSk7XG4gICAgICAgIC8qIGpzaGludCBuZXdjYXA6IHRydWUgKi9cbiAgICAgIH07XG4gICAgICByZXR1cm4gTnVtYmVyU2hpbTtcbiAgICB9KCkpO1xuICAgIHdyYXBDb25zdHJ1Y3RvcihPcmlnTnVtYmVyLCBOdW1iZXJTaGltLCB7fSk7XG4gICAgLy8gdGhpcyBpcyBuZWNlc3NhcnkgZm9yIEVTMyBicm93c2Vycywgd2hlcmUgdGhlc2UgcHJvcGVydGllcyBhcmUgbm9uLWVudW1lcmFibGUuXG4gICAgZGVmaW5lUHJvcGVydGllcyhOdW1iZXJTaGltLCB7XG4gICAgICBOYU46IE9yaWdOdW1iZXIuTmFOLFxuICAgICAgTUFYX1ZBTFVFOiBPcmlnTnVtYmVyLk1BWF9WQUxVRSxcbiAgICAgIE1JTl9WQUxVRTogT3JpZ051bWJlci5NSU5fVkFMVUUsXG4gICAgICBORUdBVElWRV9JTkZJTklUWTogT3JpZ051bWJlci5ORUdBVElWRV9JTkZJTklUWSxcbiAgICAgIFBPU0lUSVZFX0lORklOSVRZOiBPcmlnTnVtYmVyLlBPU0lUSVZFX0lORklOSVRZXG4gICAgfSk7XG4gICAgLyogZ2xvYmFscyBOdW1iZXI6IHRydWUgKi9cbiAgICAvKiBlc2xpbnQtZGlzYWJsZSBuby11bmRlZiAqL1xuICAgIC8qIGpzaGludCAtVzAyMCAqL1xuICAgIE51bWJlciA9IE51bWJlclNoaW07XG4gICAgVmFsdWUucmVkZWZpbmUoZ2xvYmFscywgJ051bWJlcicsIE51bWJlclNoaW0pO1xuICAgIC8qIGpzaGludCArVzAyMCAqL1xuICAgIC8qIGVzbGludC1lbmFibGUgbm8tdW5kZWYgKi9cbiAgICAvKiBnbG9iYWxzIE51bWJlcjogZmFsc2UgKi9cbiAgfVxuXG4gIHZhciBtYXhTYWZlSW50ZWdlciA9IE1hdGgucG93KDIsIDUzKSAtIDE7XG4gIGRlZmluZVByb3BlcnRpZXMoTnVtYmVyLCB7XG4gICAgTUFYX1NBRkVfSU5URUdFUjogbWF4U2FmZUludGVnZXIsXG4gICAgTUlOX1NBRkVfSU5URUdFUjogLW1heFNhZmVJbnRlZ2VyLFxuICAgIEVQU0lMT046IDIuMjIwNDQ2MDQ5MjUwMzEzZS0xNixcblxuICAgIHBhcnNlSW50OiBnbG9iYWxzLnBhcnNlSW50LFxuICAgIHBhcnNlRmxvYXQ6IGdsb2JhbHMucGFyc2VGbG9hdCxcblxuICAgIGlzRmluaXRlOiBudW1iZXJJc0Zpbml0ZSxcblxuICAgIGlzSW50ZWdlcjogZnVuY3Rpb24gaXNJbnRlZ2VyKHZhbHVlKSB7XG4gICAgICByZXR1cm4gbnVtYmVySXNGaW5pdGUodmFsdWUpICYmIEVTLlRvSW50ZWdlcih2YWx1ZSkgPT09IHZhbHVlO1xuICAgIH0sXG5cbiAgICBpc1NhZmVJbnRlZ2VyOiBmdW5jdGlvbiBpc1NhZmVJbnRlZ2VyKHZhbHVlKSB7XG4gICAgICByZXR1cm4gTnVtYmVyLmlzSW50ZWdlcih2YWx1ZSkgJiYgX2Ficyh2YWx1ZSkgPD0gTnVtYmVyLk1BWF9TQUZFX0lOVEVHRVI7XG4gICAgfSxcblxuICAgIGlzTmFOOiBudW1iZXJJc05hTlxuICB9KTtcbiAgLy8gRmlyZWZveCAzNyBoYXMgYSBjb25mb3JtaW5nIE51bWJlci5wYXJzZUludCwgYnV0IGl0J3Mgbm90ID09PSB0byB0aGUgZ2xvYmFsIHBhcnNlSW50IChmaXhlZCBpbiB2NDApXG4gIGRlZmluZVByb3BlcnR5KE51bWJlciwgJ3BhcnNlSW50JywgZ2xvYmFscy5wYXJzZUludCwgTnVtYmVyLnBhcnNlSW50ICE9PSBnbG9iYWxzLnBhcnNlSW50KTtcblxuICAvLyBXb3JrIGFyb3VuZCBidWdzIGluIEFycmF5I2ZpbmQgYW5kIEFycmF5I2ZpbmRJbmRleCAtLSBlYXJseVxuICAvLyBpbXBsZW1lbnRhdGlvbnMgc2tpcHBlZCBob2xlcyBpbiBzcGFyc2UgYXJyYXlzLiAoTm90ZSB0aGF0IHRoZVxuICAvLyBpbXBsZW1lbnRhdGlvbnMgb2YgZmluZC9maW5kSW5kZXggaW5kaXJlY3RseSB1c2Ugc2hpbW1lZFxuICAvLyBtZXRob2RzIG9mIE51bWJlciwgc28gdGhpcyB0ZXN0IGhhcyB0byBoYXBwZW4gZG93biBoZXJlLilcbiAgLypqc2hpbnQgZWxpc2lvbjogdHJ1ZSAqL1xuICAvKiBlc2xpbnQtZGlzYWJsZSBuby1zcGFyc2UtYXJyYXlzICovXG4gIGlmICghWywgMV0uZmluZChmdW5jdGlvbiAoaXRlbSwgaWR4KSB7IHJldHVybiBpZHggPT09IDA7IH0pKSB7XG4gICAgb3ZlcnJpZGVOYXRpdmUoQXJyYXkucHJvdG90eXBlLCAnZmluZCcsIEFycmF5UHJvdG90eXBlU2hpbXMuZmluZCk7XG4gIH1cbiAgaWYgKFssIDFdLmZpbmRJbmRleChmdW5jdGlvbiAoaXRlbSwgaWR4KSB7IHJldHVybiBpZHggPT09IDA7IH0pICE9PSAwKSB7XG4gICAgb3ZlcnJpZGVOYXRpdmUoQXJyYXkucHJvdG90eXBlLCAnZmluZEluZGV4JywgQXJyYXlQcm90b3R5cGVTaGltcy5maW5kSW5kZXgpO1xuICB9XG4gIC8qIGVzbGludC1lbmFibGUgbm8tc3BhcnNlLWFycmF5cyAqL1xuICAvKmpzaGludCBlbGlzaW9uOiBmYWxzZSAqL1xuXG4gIHZhciBpc0VudW1lcmFibGVPbiA9IEZ1bmN0aW9uLmJpbmQuY2FsbChGdW5jdGlvbi5iaW5kLCBPYmplY3QucHJvdG90eXBlLnByb3BlcnR5SXNFbnVtZXJhYmxlKTtcbiAgdmFyIGVuc3VyZUVudW1lcmFibGUgPSBmdW5jdGlvbiBlbnN1cmVFbnVtZXJhYmxlKG9iaiwgcHJvcCkge1xuICAgIGlmIChzdXBwb3J0c0Rlc2NyaXB0b3JzICYmIGlzRW51bWVyYWJsZU9uKG9iaiwgcHJvcCkpIHtcbiAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShvYmosIHByb3AsIHsgZW51bWVyYWJsZTogZmFsc2UgfSk7XG4gICAgfVxuICB9O1xuICB2YXIgc2xpY2VBcmdzID0gZnVuY3Rpb24gc2xpY2VBcmdzKCkge1xuICAgIC8vIHBlciBodHRwczovL2dpdGh1Yi5jb20vcGV0a2FhbnRvbm92L2JsdWViaXJkL3dpa2kvT3B0aW1pemF0aW9uLWtpbGxlcnMjMzItbGVha2luZy1hcmd1bWVudHNcbiAgICAvLyBhbmQgaHR0cHM6Ly9naXN0LmdpdGh1Yi5jb20vV2ViUmVmbGVjdGlvbi80MzI3NzYyY2I4N2E4YzYzNGEyOVxuICAgIHZhciBpbml0aWFsID0gTnVtYmVyKHRoaXMpO1xuICAgIHZhciBsZW4gPSBhcmd1bWVudHMubGVuZ3RoO1xuICAgIHZhciBkZXNpcmVkQXJnQ291bnQgPSBsZW4gLSBpbml0aWFsO1xuICAgIHZhciBhcmdzID0gbmV3IEFycmF5KGRlc2lyZWRBcmdDb3VudCA8IDAgPyAwIDogZGVzaXJlZEFyZ0NvdW50KTtcbiAgICBmb3IgKHZhciBpID0gaW5pdGlhbDsgaSA8IGxlbjsgKytpKSB7XG4gICAgICBhcmdzW2kgLSBpbml0aWFsXSA9IGFyZ3VtZW50c1tpXTtcbiAgICB9XG4gICAgcmV0dXJuIGFyZ3M7XG4gIH07XG4gIHZhciBhc3NpZ25UbyA9IGZ1bmN0aW9uIGFzc2lnblRvKHNvdXJjZSkge1xuICAgIHJldHVybiBmdW5jdGlvbiBhc3NpZ25Ub1NvdXJjZSh0YXJnZXQsIGtleSkge1xuICAgICAgdGFyZ2V0W2tleV0gPSBzb3VyY2Vba2V5XTtcbiAgICAgIHJldHVybiB0YXJnZXQ7XG4gICAgfTtcbiAgfTtcbiAgdmFyIGFzc2lnblJlZHVjZXIgPSBmdW5jdGlvbiAodGFyZ2V0LCBzb3VyY2UpIHtcbiAgICB2YXIgc291cmNlS2V5cyA9IGtleXMoT2JqZWN0KHNvdXJjZSkpO1xuICAgIHZhciBzeW1ib2xzO1xuICAgIGlmIChFUy5Jc0NhbGxhYmxlKE9iamVjdC5nZXRPd25Qcm9wZXJ0eVN5bWJvbHMpKSB7XG4gICAgICBzeW1ib2xzID0gX2ZpbHRlcihPYmplY3QuZ2V0T3duUHJvcGVydHlTeW1ib2xzKE9iamVjdChzb3VyY2UpKSwgaXNFbnVtZXJhYmxlT24oc291cmNlKSk7XG4gICAgfVxuICAgIHJldHVybiBfcmVkdWNlKF9jb25jYXQoc291cmNlS2V5cywgc3ltYm9scyB8fCBbXSksIGFzc2lnblRvKHNvdXJjZSksIHRhcmdldCk7XG4gIH07XG5cbiAgdmFyIE9iamVjdFNoaW1zID0ge1xuICAgIC8vIDE5LjEuMy4xXG4gICAgYXNzaWduOiBmdW5jdGlvbiAodGFyZ2V0LCBzb3VyY2UpIHtcbiAgICAgIHZhciB0byA9IEVTLlRvT2JqZWN0KHRhcmdldCwgJ0Nhbm5vdCBjb252ZXJ0IHVuZGVmaW5lZCBvciBudWxsIHRvIG9iamVjdCcpO1xuICAgICAgcmV0dXJuIF9yZWR1Y2UoRVMuQ2FsbChzbGljZUFyZ3MsIDEsIGFyZ3VtZW50cyksIGFzc2lnblJlZHVjZXIsIHRvKTtcbiAgICB9LFxuXG4gICAgLy8gQWRkZWQgaW4gV2ViS2l0IGluIGh0dHBzOi8vYnVncy53ZWJraXQub3JnL3Nob3dfYnVnLmNnaT9pZD0xNDM4NjVcbiAgICBpczogZnVuY3Rpb24gaXMoYSwgYikge1xuICAgICAgcmV0dXJuIEVTLlNhbWVWYWx1ZShhLCBiKTtcbiAgICB9XG4gIH07XG4gIHZhciBhc3NpZ25IYXNQZW5kaW5nRXhjZXB0aW9ucyA9IE9iamVjdC5hc3NpZ24gJiYgT2JqZWN0LnByZXZlbnRFeHRlbnNpb25zICYmIChmdW5jdGlvbiAoKSB7XG4gICAgLy8gRmlyZWZveCAzNyBzdGlsbCBoYXMgXCJwZW5kaW5nIGV4Y2VwdGlvblwiIGxvZ2ljIGluIGl0cyBPYmplY3QuYXNzaWduIGltcGxlbWVudGF0aW9uLFxuICAgIC8vIHdoaWNoIGlzIDcyJSBzbG93ZXIgdGhhbiBvdXIgc2hpbSwgYW5kIEZpcmVmb3ggNDAncyBuYXRpdmUgaW1wbGVtZW50YXRpb24uXG4gICAgdmFyIHRocm93ZXIgPSBPYmplY3QucHJldmVudEV4dGVuc2lvbnMoeyAxOiAyIH0pO1xuICAgIHRyeSB7XG4gICAgICBPYmplY3QuYXNzaWduKHRocm93ZXIsICd4eScpO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIHJldHVybiB0aHJvd2VyWzFdID09PSAneSc7XG4gICAgfVxuICB9KCkpO1xuICBpZiAoYXNzaWduSGFzUGVuZGluZ0V4Y2VwdGlvbnMpIHtcbiAgICBvdmVycmlkZU5hdGl2ZShPYmplY3QsICdhc3NpZ24nLCBPYmplY3RTaGltcy5hc3NpZ24pO1xuICB9XG4gIGRlZmluZVByb3BlcnRpZXMoT2JqZWN0LCBPYmplY3RTaGltcyk7XG5cbiAgaWYgKHN1cHBvcnRzRGVzY3JpcHRvcnMpIHtcbiAgICB2YXIgRVM1T2JqZWN0U2hpbXMgPSB7XG4gICAgICAvLyAxOS4xLjMuOVxuICAgICAgLy8gc2hpbSBmcm9tIGh0dHBzOi8vZ2lzdC5naXRodWIuY29tL1dlYlJlZmxlY3Rpb24vNTU5MzU1NFxuICAgICAgc2V0UHJvdG90eXBlT2Y6IChmdW5jdGlvbiAoT2JqZWN0LCBtYWdpYykge1xuICAgICAgICB2YXIgc2V0O1xuXG4gICAgICAgIHZhciBjaGVja0FyZ3MgPSBmdW5jdGlvbiAoTywgcHJvdG8pIHtcbiAgICAgICAgICBpZiAoIUVTLlR5cGVJc09iamVjdChPKSkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignY2Fubm90IHNldCBwcm90b3R5cGUgb24gYSBub24tb2JqZWN0Jyk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmICghKHByb3RvID09PSBudWxsIHx8IEVTLlR5cGVJc09iamVjdChwcm90bykpKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdjYW4gb25seSBzZXQgcHJvdG90eXBlIHRvIGFuIG9iamVjdCBvciBudWxsJyArIHByb3RvKTtcbiAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgdmFyIHNldFByb3RvdHlwZU9mID0gZnVuY3Rpb24gKE8sIHByb3RvKSB7XG4gICAgICAgICAgY2hlY2tBcmdzKE8sIHByb3RvKTtcbiAgICAgICAgICBfY2FsbChzZXQsIE8sIHByb3RvKTtcbiAgICAgICAgICByZXR1cm4gTztcbiAgICAgICAgfTtcblxuICAgICAgICB0cnkge1xuICAgICAgICAgIC8vIHRoaXMgd29ya3MgYWxyZWFkeSBpbiBGaXJlZm94IGFuZCBTYWZhcmlcbiAgICAgICAgICBzZXQgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKE9iamVjdC5wcm90b3R5cGUsIG1hZ2ljKS5zZXQ7XG4gICAgICAgICAgX2NhbGwoc2V0LCB7fSwgbnVsbCk7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICBpZiAoT2JqZWN0LnByb3RvdHlwZSAhPT0ge31bbWFnaWNdKSB7XG4gICAgICAgICAgICAvLyBJRSA8IDExIGNhbm5vdCBiZSBzaGltbWVkXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuICAgICAgICAgIC8vIHByb2JhYmx5IENocm9tZSBvciBzb21lIG9sZCBNb2JpbGUgc3RvY2sgYnJvd3NlclxuICAgICAgICAgIHNldCA9IGZ1bmN0aW9uIChwcm90bykge1xuICAgICAgICAgICAgdGhpc1ttYWdpY10gPSBwcm90bztcbiAgICAgICAgICB9O1xuICAgICAgICAgIC8vIHBsZWFzZSBub3RlIHRoYXQgdGhpcyB3aWxsICoqbm90Kiogd29ya1xuICAgICAgICAgIC8vIGluIHRob3NlIGJyb3dzZXJzIHRoYXQgZG8gbm90IGluaGVyaXRcbiAgICAgICAgICAvLyBfX3Byb3RvX18gYnkgbWlzdGFrZSBmcm9tIE9iamVjdC5wcm90b3R5cGVcbiAgICAgICAgICAvLyBpbiB0aGVzZSBjYXNlcyB3ZSBzaG91bGQgcHJvYmFibHkgdGhyb3cgYW4gZXJyb3JcbiAgICAgICAgICAvLyBvciBhdCBsZWFzdCBiZSBpbmZvcm1lZCBhYm91dCB0aGUgaXNzdWVcbiAgICAgICAgICBzZXRQcm90b3R5cGVPZi5wb2x5ZmlsbCA9IHNldFByb3RvdHlwZU9mKFxuICAgICAgICAgICAgc2V0UHJvdG90eXBlT2Yoe30sIG51bGwpLFxuICAgICAgICAgICAgT2JqZWN0LnByb3RvdHlwZVxuICAgICAgICAgICkgaW5zdGFuY2VvZiBPYmplY3Q7XG4gICAgICAgICAgLy8gc2V0UHJvdG90eXBlT2YucG9seWZpbGwgPT09IHRydWUgbWVhbnMgaXQgd29ya3MgYXMgbWVhbnRcbiAgICAgICAgICAvLyBzZXRQcm90b3R5cGVPZi5wb2x5ZmlsbCA9PT0gZmFsc2UgbWVhbnMgaXQncyBub3QgMTAwJSByZWxpYWJsZVxuICAgICAgICAgIC8vIHNldFByb3RvdHlwZU9mLnBvbHlmaWxsID09PSB1bmRlZmluZWRcbiAgICAgICAgICAvLyBvclxuICAgICAgICAgIC8vIHNldFByb3RvdHlwZU9mLnBvbHlmaWxsID09ICBudWxsIG1lYW5zIGl0J3Mgbm90IGEgcG9seWZpbGxcbiAgICAgICAgICAvLyB3aGljaCBtZWFucyBpdCB3b3JrcyBhcyBleHBlY3RlZFxuICAgICAgICAgIC8vIHdlIGNhbiBldmVuIGRlbGV0ZSBPYmplY3QucHJvdG90eXBlLl9fcHJvdG9fXztcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gc2V0UHJvdG90eXBlT2Y7XG4gICAgICB9KE9iamVjdCwgJ19fcHJvdG9fXycpKVxuICAgIH07XG5cbiAgICBkZWZpbmVQcm9wZXJ0aWVzKE9iamVjdCwgRVM1T2JqZWN0U2hpbXMpO1xuICB9XG5cbiAgLy8gV29ya2Fyb3VuZCBidWcgaW4gT3BlcmEgMTIgd2hlcmUgc2V0UHJvdG90eXBlT2YoeCwgbnVsbCkgZG9lc24ndCB3b3JrLFxuICAvLyBidXQgT2JqZWN0LmNyZWF0ZShudWxsKSBkb2VzLlxuICBpZiAoT2JqZWN0LnNldFByb3RvdHlwZU9mICYmIE9iamVjdC5nZXRQcm90b3R5cGVPZiAmJlxuICAgICAgT2JqZWN0LmdldFByb3RvdHlwZU9mKE9iamVjdC5zZXRQcm90b3R5cGVPZih7fSwgbnVsbCkpICE9PSBudWxsICYmXG4gICAgICBPYmplY3QuZ2V0UHJvdG90eXBlT2YoT2JqZWN0LmNyZWF0ZShudWxsKSkgPT09IG51bGwpIHtcbiAgICAoZnVuY3Rpb24gKCkge1xuICAgICAgdmFyIEZBS0VOVUxMID0gT2JqZWN0LmNyZWF0ZShudWxsKTtcbiAgICAgIHZhciBncG8gPSBPYmplY3QuZ2V0UHJvdG90eXBlT2YsIHNwbyA9IE9iamVjdC5zZXRQcm90b3R5cGVPZjtcbiAgICAgIE9iamVjdC5nZXRQcm90b3R5cGVPZiA9IGZ1bmN0aW9uIChvKSB7XG4gICAgICAgIHZhciByZXN1bHQgPSBncG8obyk7XG4gICAgICAgIHJldHVybiByZXN1bHQgPT09IEZBS0VOVUxMID8gbnVsbCA6IHJlc3VsdDtcbiAgICAgIH07XG4gICAgICBPYmplY3Quc2V0UHJvdG90eXBlT2YgPSBmdW5jdGlvbiAobywgcCkge1xuICAgICAgICB2YXIgcHJvdG8gPSBwID09PSBudWxsID8gRkFLRU5VTEwgOiBwO1xuICAgICAgICByZXR1cm4gc3BvKG8sIHByb3RvKTtcbiAgICAgIH07XG4gICAgICBPYmplY3Quc2V0UHJvdG90eXBlT2YucG9seWZpbGwgPSBmYWxzZTtcbiAgICB9KCkpO1xuICB9XG5cbiAgdmFyIG9iamVjdEtleXNBY2NlcHRzUHJpbWl0aXZlcyA9ICF0aHJvd3NFcnJvcihmdW5jdGlvbiAoKSB7IE9iamVjdC5rZXlzKCdmb28nKTsgfSk7XG4gIGlmICghb2JqZWN0S2V5c0FjY2VwdHNQcmltaXRpdmVzKSB7XG4gICAgdmFyIG9yaWdpbmFsT2JqZWN0S2V5cyA9IE9iamVjdC5rZXlzO1xuICAgIG92ZXJyaWRlTmF0aXZlKE9iamVjdCwgJ2tleXMnLCBmdW5jdGlvbiBrZXlzKHZhbHVlKSB7XG4gICAgICByZXR1cm4gb3JpZ2luYWxPYmplY3RLZXlzKEVTLlRvT2JqZWN0KHZhbHVlKSk7XG4gICAgfSk7XG4gICAga2V5cyA9IE9iamVjdC5rZXlzO1xuICB9XG4gIHZhciBvYmplY3RLZXlzUmVqZWN0c1JlZ2V4ID0gdGhyb3dzRXJyb3IoZnVuY3Rpb24gKCkgeyBPYmplY3Qua2V5cygvYS9nKTsgfSk7XG4gIGlmIChvYmplY3RLZXlzUmVqZWN0c1JlZ2V4KSB7XG4gICAgdmFyIHJlZ2V4UmVqZWN0aW5nT2JqZWN0S2V5cyA9IE9iamVjdC5rZXlzO1xuICAgIG92ZXJyaWRlTmF0aXZlKE9iamVjdCwgJ2tleXMnLCBmdW5jdGlvbiBrZXlzKHZhbHVlKSB7XG4gICAgICBpZiAoVHlwZS5yZWdleCh2YWx1ZSkpIHtcbiAgICAgICAgdmFyIHJlZ2V4S2V5cyA9IFtdO1xuICAgICAgICBmb3IgKHZhciBrIGluIHZhbHVlKSB7XG4gICAgICAgICAgaWYgKF9oYXNPd25Qcm9wZXJ0eSh2YWx1ZSwgaykpIHtcbiAgICAgICAgICAgIF9wdXNoKHJlZ2V4S2V5cywgayk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgcmV0dXJuIHJlZ2V4S2V5cztcbiAgICAgIH1cbiAgICAgIHJldHVybiByZWdleFJlamVjdGluZ09iamVjdEtleXModmFsdWUpO1xuICAgIH0pO1xuICAgIGtleXMgPSBPYmplY3Qua2V5cztcbiAgfVxuXG4gIGlmIChPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcykge1xuICAgIHZhciBvYmplY3RHT1BOQWNjZXB0c1ByaW1pdGl2ZXMgPSAhdGhyb3dzRXJyb3IoZnVuY3Rpb24gKCkgeyBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcygnZm9vJyk7IH0pO1xuICAgIGlmICghb2JqZWN0R09QTkFjY2VwdHNQcmltaXRpdmVzKSB7XG4gICAgICB2YXIgY2FjaGVkV2luZG93TmFtZXMgPSB0eXBlb2Ygd2luZG93ID09PSAnb2JqZWN0JyA/IE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKHdpbmRvdykgOiBbXTtcbiAgICAgIHZhciBvcmlnaW5hbE9iamVjdEdldE93blByb3BlcnR5TmFtZXMgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcztcbiAgICAgIG92ZXJyaWRlTmF0aXZlKE9iamVjdCwgJ2dldE93blByb3BlcnR5TmFtZXMnLCBmdW5jdGlvbiBnZXRPd25Qcm9wZXJ0eU5hbWVzKHZhbHVlKSB7XG4gICAgICAgIHZhciB2YWwgPSBFUy5Ub09iamVjdCh2YWx1ZSk7XG4gICAgICAgIGlmIChfdG9TdHJpbmcodmFsKSA9PT0gJ1tvYmplY3QgV2luZG93XScpIHtcbiAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgcmV0dXJuIG9yaWdpbmFsT2JqZWN0R2V0T3duUHJvcGVydHlOYW1lcyh2YWwpO1xuICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIC8vIElFIGJ1ZyB3aGVyZSBsYXlvdXQgZW5naW5lIGNhbGxzIHVzZXJsYW5kIGdPUE4gZm9yIGNyb3NzLWRvbWFpbiBgd2luZG93YCBvYmplY3RzXG4gICAgICAgICAgICByZXR1cm4gX2NvbmNhdChbXSwgY2FjaGVkV2luZG93TmFtZXMpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gb3JpZ2luYWxPYmplY3RHZXRPd25Qcm9wZXJ0eU5hbWVzKHZhbCk7XG4gICAgICB9KTtcbiAgICB9XG4gIH1cbiAgaWYgKE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IpIHtcbiAgICB2YXIgb2JqZWN0R09QREFjY2VwdHNQcmltaXRpdmVzID0gIXRocm93c0Vycm9yKGZ1bmN0aW9uICgpIHsgT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcignZm9vJywgJ2JhcicpOyB9KTtcbiAgICBpZiAoIW9iamVjdEdPUERBY2NlcHRzUHJpbWl0aXZlcykge1xuICAgICAgdmFyIG9yaWdpbmFsT2JqZWN0R2V0T3duUHJvcGVydHlEZXNjcmlwdG9yID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcjtcbiAgICAgIG92ZXJyaWRlTmF0aXZlKE9iamVjdCwgJ2dldE93blByb3BlcnR5RGVzY3JpcHRvcicsIGZ1bmN0aW9uIGdldE93blByb3BlcnR5RGVzY3JpcHRvcih2YWx1ZSwgcHJvcGVydHkpIHtcbiAgICAgICAgcmV0dXJuIG9yaWdpbmFsT2JqZWN0R2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKEVTLlRvT2JqZWN0KHZhbHVlKSwgcHJvcGVydHkpO1xuICAgICAgfSk7XG4gICAgfVxuICB9XG4gIGlmIChPYmplY3Quc2VhbCkge1xuICAgIHZhciBvYmplY3RTZWFsQWNjZXB0c1ByaW1pdGl2ZXMgPSAhdGhyb3dzRXJyb3IoZnVuY3Rpb24gKCkgeyBPYmplY3Quc2VhbCgnZm9vJyk7IH0pO1xuICAgIGlmICghb2JqZWN0U2VhbEFjY2VwdHNQcmltaXRpdmVzKSB7XG4gICAgICB2YXIgb3JpZ2luYWxPYmplY3RTZWFsID0gT2JqZWN0LnNlYWw7XG4gICAgICBvdmVycmlkZU5hdGl2ZShPYmplY3QsICdzZWFsJywgZnVuY3Rpb24gc2VhbCh2YWx1ZSkge1xuICAgICAgICBpZiAoIVR5cGUub2JqZWN0KHZhbHVlKSkgeyByZXR1cm4gdmFsdWU7IH1cbiAgICAgICAgcmV0dXJuIG9yaWdpbmFsT2JqZWN0U2VhbCh2YWx1ZSk7XG4gICAgICB9KTtcbiAgICB9XG4gIH1cbiAgaWYgKE9iamVjdC5pc1NlYWxlZCkge1xuICAgIHZhciBvYmplY3RJc1NlYWxlZEFjY2VwdHNQcmltaXRpdmVzID0gIXRocm93c0Vycm9yKGZ1bmN0aW9uICgpIHsgT2JqZWN0LmlzU2VhbGVkKCdmb28nKTsgfSk7XG4gICAgaWYgKCFvYmplY3RJc1NlYWxlZEFjY2VwdHNQcmltaXRpdmVzKSB7XG4gICAgICB2YXIgb3JpZ2luYWxPYmplY3RJc1NlYWxlZCA9IE9iamVjdC5pc1NlYWxlZDtcbiAgICAgIG92ZXJyaWRlTmF0aXZlKE9iamVjdCwgJ2lzU2VhbGVkJywgZnVuY3Rpb24gaXNTZWFsZWQodmFsdWUpIHtcbiAgICAgICAgaWYgKCFUeXBlLm9iamVjdCh2YWx1ZSkpIHsgcmV0dXJuIHRydWU7IH1cbiAgICAgICAgcmV0dXJuIG9yaWdpbmFsT2JqZWN0SXNTZWFsZWQodmFsdWUpO1xuICAgICAgfSk7XG4gICAgfVxuICB9XG4gIGlmIChPYmplY3QuZnJlZXplKSB7XG4gICAgdmFyIG9iamVjdEZyZWV6ZUFjY2VwdHNQcmltaXRpdmVzID0gIXRocm93c0Vycm9yKGZ1bmN0aW9uICgpIHsgT2JqZWN0LmZyZWV6ZSgnZm9vJyk7IH0pO1xuICAgIGlmICghb2JqZWN0RnJlZXplQWNjZXB0c1ByaW1pdGl2ZXMpIHtcbiAgICAgIHZhciBvcmlnaW5hbE9iamVjdEZyZWV6ZSA9IE9iamVjdC5mcmVlemU7XG4gICAgICBvdmVycmlkZU5hdGl2ZShPYmplY3QsICdmcmVlemUnLCBmdW5jdGlvbiBmcmVlemUodmFsdWUpIHtcbiAgICAgICAgaWYgKCFUeXBlLm9iamVjdCh2YWx1ZSkpIHsgcmV0dXJuIHZhbHVlOyB9XG4gICAgICAgIHJldHVybiBvcmlnaW5hbE9iamVjdEZyZWV6ZSh2YWx1ZSk7XG4gICAgICB9KTtcbiAgICB9XG4gIH1cbiAgaWYgKE9iamVjdC5pc0Zyb3plbikge1xuICAgIHZhciBvYmplY3RJc0Zyb3plbkFjY2VwdHNQcmltaXRpdmVzID0gIXRocm93c0Vycm9yKGZ1bmN0aW9uICgpIHsgT2JqZWN0LmlzRnJvemVuKCdmb28nKTsgfSk7XG4gICAgaWYgKCFvYmplY3RJc0Zyb3plbkFjY2VwdHNQcmltaXRpdmVzKSB7XG4gICAgICB2YXIgb3JpZ2luYWxPYmplY3RJc0Zyb3plbiA9IE9iamVjdC5pc0Zyb3plbjtcbiAgICAgIG92ZXJyaWRlTmF0aXZlKE9iamVjdCwgJ2lzRnJvemVuJywgZnVuY3Rpb24gaXNGcm96ZW4odmFsdWUpIHtcbiAgICAgICAgaWYgKCFUeXBlLm9iamVjdCh2YWx1ZSkpIHsgcmV0dXJuIHRydWU7IH1cbiAgICAgICAgcmV0dXJuIG9yaWdpbmFsT2JqZWN0SXNGcm96ZW4odmFsdWUpO1xuICAgICAgfSk7XG4gICAgfVxuICB9XG4gIGlmIChPYmplY3QucHJldmVudEV4dGVuc2lvbnMpIHtcbiAgICB2YXIgb2JqZWN0UHJldmVudEV4dGVuc2lvbnNBY2NlcHRzUHJpbWl0aXZlcyA9ICF0aHJvd3NFcnJvcihmdW5jdGlvbiAoKSB7IE9iamVjdC5wcmV2ZW50RXh0ZW5zaW9ucygnZm9vJyk7IH0pO1xuICAgIGlmICghb2JqZWN0UHJldmVudEV4dGVuc2lvbnNBY2NlcHRzUHJpbWl0aXZlcykge1xuICAgICAgdmFyIG9yaWdpbmFsT2JqZWN0UHJldmVudEV4dGVuc2lvbnMgPSBPYmplY3QucHJldmVudEV4dGVuc2lvbnM7XG4gICAgICBvdmVycmlkZU5hdGl2ZShPYmplY3QsICdwcmV2ZW50RXh0ZW5zaW9ucycsIGZ1bmN0aW9uIHByZXZlbnRFeHRlbnNpb25zKHZhbHVlKSB7XG4gICAgICAgIGlmICghVHlwZS5vYmplY3QodmFsdWUpKSB7IHJldHVybiB2YWx1ZTsgfVxuICAgICAgICByZXR1cm4gb3JpZ2luYWxPYmplY3RQcmV2ZW50RXh0ZW5zaW9ucyh2YWx1ZSk7XG4gICAgICB9KTtcbiAgICB9XG4gIH1cbiAgaWYgKE9iamVjdC5pc0V4dGVuc2libGUpIHtcbiAgICB2YXIgb2JqZWN0SXNFeHRlbnNpYmxlQWNjZXB0c1ByaW1pdGl2ZXMgPSAhdGhyb3dzRXJyb3IoZnVuY3Rpb24gKCkgeyBPYmplY3QuaXNFeHRlbnNpYmxlKCdmb28nKTsgfSk7XG4gICAgaWYgKCFvYmplY3RJc0V4dGVuc2libGVBY2NlcHRzUHJpbWl0aXZlcykge1xuICAgICAgdmFyIG9yaWdpbmFsT2JqZWN0SXNFeHRlbnNpYmxlID0gT2JqZWN0LmlzRXh0ZW5zaWJsZTtcbiAgICAgIG92ZXJyaWRlTmF0aXZlKE9iamVjdCwgJ2lzRXh0ZW5zaWJsZScsIGZ1bmN0aW9uIGlzRXh0ZW5zaWJsZSh2YWx1ZSkge1xuICAgICAgICBpZiAoIVR5cGUub2JqZWN0KHZhbHVlKSkgeyByZXR1cm4gZmFsc2U7IH1cbiAgICAgICAgcmV0dXJuIG9yaWdpbmFsT2JqZWN0SXNFeHRlbnNpYmxlKHZhbHVlKTtcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxuICBpZiAoT2JqZWN0LmdldFByb3RvdHlwZU9mKSB7XG4gICAgdmFyIG9iamVjdEdldFByb3RvQWNjZXB0c1ByaW1pdGl2ZXMgPSAhdGhyb3dzRXJyb3IoZnVuY3Rpb24gKCkgeyBPYmplY3QuZ2V0UHJvdG90eXBlT2YoJ2ZvbycpOyB9KTtcbiAgICBpZiAoIW9iamVjdEdldFByb3RvQWNjZXB0c1ByaW1pdGl2ZXMpIHtcbiAgICAgIHZhciBvcmlnaW5hbEdldFByb3RvID0gT2JqZWN0LmdldFByb3RvdHlwZU9mO1xuICAgICAgb3ZlcnJpZGVOYXRpdmUoT2JqZWN0LCAnZ2V0UHJvdG90eXBlT2YnLCBmdW5jdGlvbiBnZXRQcm90b3R5cGVPZih2YWx1ZSkge1xuICAgICAgICByZXR1cm4gb3JpZ2luYWxHZXRQcm90byhFUy5Ub09iamVjdCh2YWx1ZSkpO1xuICAgICAgfSk7XG4gICAgfVxuICB9XG5cbiAgdmFyIGhhc0ZsYWdzID0gc3VwcG9ydHNEZXNjcmlwdG9ycyAmJiAoZnVuY3Rpb24gKCkge1xuICAgIHZhciBkZXNjID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcihSZWdFeHAucHJvdG90eXBlLCAnZmxhZ3MnKTtcbiAgICByZXR1cm4gZGVzYyAmJiBFUy5Jc0NhbGxhYmxlKGRlc2MuZ2V0KTtcbiAgfSgpKTtcbiAgaWYgKHN1cHBvcnRzRGVzY3JpcHRvcnMgJiYgIWhhc0ZsYWdzKSB7XG4gICAgdmFyIHJlZ0V4cEZsYWdzR2V0dGVyID0gZnVuY3Rpb24gZmxhZ3MoKSB7XG4gICAgICBpZiAoIUVTLlR5cGVJc09iamVjdCh0aGlzKSkge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdNZXRob2QgY2FsbGVkIG9uIGluY29tcGF0aWJsZSB0eXBlOiBtdXN0IGJlIGFuIG9iamVjdC4nKTtcbiAgICAgIH1cbiAgICAgIHZhciByZXN1bHQgPSAnJztcbiAgICAgIGlmICh0aGlzLmdsb2JhbCkge1xuICAgICAgICByZXN1bHQgKz0gJ2cnO1xuICAgICAgfVxuICAgICAgaWYgKHRoaXMuaWdub3JlQ2FzZSkge1xuICAgICAgICByZXN1bHQgKz0gJ2knO1xuICAgICAgfVxuICAgICAgaWYgKHRoaXMubXVsdGlsaW5lKSB7XG4gICAgICAgIHJlc3VsdCArPSAnbSc7XG4gICAgICB9XG4gICAgICBpZiAodGhpcy51bmljb2RlKSB7XG4gICAgICAgIHJlc3VsdCArPSAndSc7XG4gICAgICB9XG4gICAgICBpZiAodGhpcy5zdGlja3kpIHtcbiAgICAgICAgcmVzdWx0ICs9ICd5JztcbiAgICAgIH1cbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfTtcblxuICAgIFZhbHVlLmdldHRlcihSZWdFeHAucHJvdG90eXBlLCAnZmxhZ3MnLCByZWdFeHBGbGFnc0dldHRlcik7XG4gIH1cblxuICB2YXIgcmVnRXhwU3VwcG9ydHNGbGFnc1dpdGhSZWdleCA9IHN1cHBvcnRzRGVzY3JpcHRvcnMgJiYgdmFsdWVPckZhbHNlSWZUaHJvd3MoZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBTdHJpbmcobmV3IFJlZ0V4cCgvYS9nLCAnaScpKSA9PT0gJy9hL2knO1xuICB9KTtcbiAgdmFyIHJlZ0V4cE5lZWRzVG9TdXBwb3J0U3ltYm9sTWF0Y2ggPSBoYXNTeW1ib2xzICYmIHN1cHBvcnRzRGVzY3JpcHRvcnMgJiYgKGZ1bmN0aW9uICgpIHtcbiAgICAvLyBFZGdlIDAuMTIgc3VwcG9ydHMgZmxhZ3MgZnVsbHksIGJ1dCBkb2VzIG5vdCBzdXBwb3J0IFN5bWJvbC5tYXRjaFxuICAgIHZhciByZWdleCA9IC8uLztcbiAgICByZWdleFtTeW1ib2wubWF0Y2hdID0gZmFsc2U7XG4gICAgcmV0dXJuIFJlZ0V4cChyZWdleCkgPT09IHJlZ2V4O1xuICB9KCkpO1xuXG4gIHZhciByZWdleFRvU3RyaW5nSXNHZW5lcmljID0gdmFsdWVPckZhbHNlSWZUaHJvd3MoZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBSZWdFeHAucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwoeyBzb3VyY2U6ICdhYmMnIH0pID09PSAnL2FiYy8nO1xuICB9KTtcbiAgdmFyIHJlZ2V4VG9TdHJpbmdTdXBwb3J0c0dlbmVyaWNGbGFncyA9IHJlZ2V4VG9TdHJpbmdJc0dlbmVyaWMgJiYgdmFsdWVPckZhbHNlSWZUaHJvd3MoZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBSZWdFeHAucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwoeyBzb3VyY2U6ICdhJywgZmxhZ3M6ICdiJyB9KSA9PT0gJy9hL2InO1xuICB9KTtcbiAgaWYgKCFyZWdleFRvU3RyaW5nSXNHZW5lcmljIHx8ICFyZWdleFRvU3RyaW5nU3VwcG9ydHNHZW5lcmljRmxhZ3MpIHtcbiAgICB2YXIgb3JpZ1JlZ0V4cFRvU3RyaW5nID0gUmVnRXhwLnByb3RvdHlwZS50b1N0cmluZztcbiAgICBkZWZpbmVQcm9wZXJ0eShSZWdFeHAucHJvdG90eXBlLCAndG9TdHJpbmcnLCBmdW5jdGlvbiB0b1N0cmluZygpIHtcbiAgICAgIHZhciBSID0gRVMuUmVxdWlyZU9iamVjdENvZXJjaWJsZSh0aGlzKTtcbiAgICAgIGlmIChUeXBlLnJlZ2V4KFIpKSB7XG4gICAgICAgIHJldHVybiBfY2FsbChvcmlnUmVnRXhwVG9TdHJpbmcsIFIpO1xuICAgICAgfVxuICAgICAgdmFyIHBhdHRlcm4gPSAkU3RyaW5nKFIuc291cmNlKTtcbiAgICAgIHZhciBmbGFncyA9ICRTdHJpbmcoUi5mbGFncyk7XG4gICAgICByZXR1cm4gJy8nICsgcGF0dGVybiArICcvJyArIGZsYWdzO1xuICAgIH0sIHRydWUpO1xuICAgIFZhbHVlLnByZXNlcnZlVG9TdHJpbmcoUmVnRXhwLnByb3RvdHlwZS50b1N0cmluZywgb3JpZ1JlZ0V4cFRvU3RyaW5nKTtcbiAgfVxuXG4gIGlmIChzdXBwb3J0c0Rlc2NyaXB0b3JzICYmICghcmVnRXhwU3VwcG9ydHNGbGFnc1dpdGhSZWdleCB8fCByZWdFeHBOZWVkc1RvU3VwcG9ydFN5bWJvbE1hdGNoKSkge1xuICAgIHZhciBmbGFnc0dldHRlciA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IoUmVnRXhwLnByb3RvdHlwZSwgJ2ZsYWdzJykuZ2V0O1xuICAgIHZhciBzb3VyY2VEZXNjID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcihSZWdFeHAucHJvdG90eXBlLCAnc291cmNlJykgfHwge307XG4gICAgdmFyIGxlZ2FjeVNvdXJjZUdldHRlciA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuIHRoaXMuc291cmNlOyB9OyAvLyBwcmlvciB0byBpdCBiZWluZyBhIGdldHRlciwgaXQncyBvd24gKyBub25jb25maWd1cmFibGVcbiAgICB2YXIgc291cmNlR2V0dGVyID0gRVMuSXNDYWxsYWJsZShzb3VyY2VEZXNjLmdldCkgPyBzb3VyY2VEZXNjLmdldCA6IGxlZ2FjeVNvdXJjZUdldHRlcjtcblxuICAgIHZhciBPcmlnUmVnRXhwID0gUmVnRXhwO1xuICAgIHZhciBSZWdFeHBTaGltID0gKGZ1bmN0aW9uICgpIHtcbiAgICAgIHJldHVybiBmdW5jdGlvbiBSZWdFeHAocGF0dGVybiwgZmxhZ3MpIHtcbiAgICAgICAgdmFyIHBhdHRlcm5Jc1JlZ0V4cCA9IEVTLklzUmVnRXhwKHBhdHRlcm4pO1xuICAgICAgICB2YXIgY2FsbGVkV2l0aE5ldyA9IHRoaXMgaW5zdGFuY2VvZiBSZWdFeHA7XG4gICAgICAgIGlmICghY2FsbGVkV2l0aE5ldyAmJiBwYXR0ZXJuSXNSZWdFeHAgJiYgdHlwZW9mIGZsYWdzID09PSAndW5kZWZpbmVkJyAmJiBwYXR0ZXJuLmNvbnN0cnVjdG9yID09PSBSZWdFeHApIHtcbiAgICAgICAgICByZXR1cm4gcGF0dGVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBQID0gcGF0dGVybjtcbiAgICAgICAgdmFyIEYgPSBmbGFncztcbiAgICAgICAgaWYgKFR5cGUucmVnZXgocGF0dGVybikpIHtcbiAgICAgICAgICBQID0gRVMuQ2FsbChzb3VyY2VHZXR0ZXIsIHBhdHRlcm4pO1xuICAgICAgICAgIEYgPSB0eXBlb2YgZmxhZ3MgPT09ICd1bmRlZmluZWQnID8gRVMuQ2FsbChmbGFnc0dldHRlciwgcGF0dGVybikgOiBmbGFncztcbiAgICAgICAgICByZXR1cm4gbmV3IFJlZ0V4cChQLCBGKTtcbiAgICAgICAgfSBlbHNlIGlmIChwYXR0ZXJuSXNSZWdFeHApIHtcbiAgICAgICAgICBQID0gcGF0dGVybi5zb3VyY2U7XG4gICAgICAgICAgRiA9IHR5cGVvZiBmbGFncyA9PT0gJ3VuZGVmaW5lZCcgPyBwYXR0ZXJuLmZsYWdzIDogZmxhZ3M7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG5ldyBPcmlnUmVnRXhwKHBhdHRlcm4sIGZsYWdzKTtcbiAgICAgIH07XG4gICAgfSgpKTtcbiAgICB3cmFwQ29uc3RydWN0b3IoT3JpZ1JlZ0V4cCwgUmVnRXhwU2hpbSwge1xuICAgICAgJGlucHV0OiB0cnVlIC8vIENocm9tZSA8IHYzOSAmIE9wZXJhIDwgMjYgaGF2ZSBhIG5vbnN0YW5kYXJkIFwiJGlucHV0XCIgcHJvcGVydHlcbiAgICB9KTtcbiAgICAvKiBnbG9iYWxzIFJlZ0V4cDogdHJ1ZSAqL1xuICAgIC8qIGVzbGludC1kaXNhYmxlIG5vLXVuZGVmICovXG4gICAgLyoganNoaW50IC1XMDIwICovXG4gICAgUmVnRXhwID0gUmVnRXhwU2hpbTtcbiAgICBWYWx1ZS5yZWRlZmluZShnbG9iYWxzLCAnUmVnRXhwJywgUmVnRXhwU2hpbSk7XG4gICAgLyoganNoaW50ICtXMDIwICovXG4gICAgLyogZXNsaW50LWVuYWJsZSBuby11bmRlZiAqL1xuICAgIC8qIGdsb2JhbHMgUmVnRXhwOiBmYWxzZSAqL1xuICB9XG5cbiAgaWYgKHN1cHBvcnRzRGVzY3JpcHRvcnMpIHtcbiAgICB2YXIgcmVnZXhHbG9iYWxzID0ge1xuICAgICAgaW5wdXQ6ICckXycsXG4gICAgICBsYXN0TWF0Y2g6ICckJicsXG4gICAgICBsYXN0UGFyZW46ICckKycsXG4gICAgICBsZWZ0Q29udGV4dDogJyRgJyxcbiAgICAgIHJpZ2h0Q29udGV4dDogJyRcXCcnXG4gICAgfTtcbiAgICBfZm9yRWFjaChrZXlzKHJlZ2V4R2xvYmFscyksIGZ1bmN0aW9uIChwcm9wKSB7XG4gICAgICBpZiAocHJvcCBpbiBSZWdFeHAgJiYgIShyZWdleEdsb2JhbHNbcHJvcF0gaW4gUmVnRXhwKSkge1xuICAgICAgICBWYWx1ZS5nZXR0ZXIoUmVnRXhwLCByZWdleEdsb2JhbHNbcHJvcF0sIGZ1bmN0aW9uIGdldCgpIHtcbiAgICAgICAgICByZXR1cm4gUmVnRXhwW3Byb3BdO1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuICBhZGREZWZhdWx0U3BlY2llcyhSZWdFeHApO1xuXG4gIHZhciBpbnZlcnNlRXBzaWxvbiA9IDEgLyBOdW1iZXIuRVBTSUxPTjtcbiAgdmFyIHJvdW5kVGllc1RvRXZlbiA9IGZ1bmN0aW9uIHJvdW5kVGllc1RvRXZlbihuKSB7XG4gICAgLy8gRXZlbiB0aG91Z2ggdGhpcyByZWR1Y2VzIGRvd24gdG8gYHJldHVybiBuYCwgaXQgdGFrZXMgYWR2YW50YWdlIG9mIGJ1aWx0LWluIHJvdW5kaW5nLlxuICAgIHJldHVybiAobiArIGludmVyc2VFcHNpbG9uKSAtIGludmVyc2VFcHNpbG9uO1xuICB9O1xuICB2YXIgQklOQVJZXzMyX0VQU0lMT04gPSBNYXRoLnBvdygyLCAtMjMpO1xuICB2YXIgQklOQVJZXzMyX01BWF9WQUxVRSA9IE1hdGgucG93KDIsIDEyNykgKiAoMiAtIEJJTkFSWV8zMl9FUFNJTE9OKTtcbiAgdmFyIEJJTkFSWV8zMl9NSU5fVkFMVUUgPSBNYXRoLnBvdygyLCAtMTI2KTtcbiAgdmFyIG51bWJlckNMWiA9IE51bWJlci5wcm90b3R5cGUuY2x6O1xuICBkZWxldGUgTnVtYmVyLnByb3RvdHlwZS5jbHo7IC8vIFNhZmFyaSA4IGhhcyBOdW1iZXIjY2x6XG5cbiAgdmFyIE1hdGhTaGltcyA9IHtcbiAgICBhY29zaDogZnVuY3Rpb24gYWNvc2godmFsdWUpIHtcbiAgICAgIHZhciB4ID0gTnVtYmVyKHZhbHVlKTtcbiAgICAgIGlmIChOdW1iZXIuaXNOYU4oeCkgfHwgdmFsdWUgPCAxKSB7IHJldHVybiBOYU47IH1cbiAgICAgIGlmICh4ID09PSAxKSB7IHJldHVybiAwOyB9XG4gICAgICBpZiAoeCA9PT0gSW5maW5pdHkpIHsgcmV0dXJuIHg7IH1cbiAgICAgIHJldHVybiBfbG9nKHggLyBNYXRoLkUgKyBfc3FydCh4ICsgMSkgKiBfc3FydCh4IC0gMSkgLyBNYXRoLkUpICsgMTtcbiAgICB9LFxuXG4gICAgYXNpbmg6IGZ1bmN0aW9uIGFzaW5oKHZhbHVlKSB7XG4gICAgICB2YXIgeCA9IE51bWJlcih2YWx1ZSk7XG4gICAgICBpZiAoeCA9PT0gMCB8fCAhZ2xvYmFsSXNGaW5pdGUoeCkpIHtcbiAgICAgICAgcmV0dXJuIHg7XG4gICAgICB9XG4gICAgICByZXR1cm4geCA8IDAgPyAtTWF0aC5hc2luaCgteCkgOiBfbG9nKHggKyBfc3FydCh4ICogeCArIDEpKTtcbiAgICB9LFxuXG4gICAgYXRhbmg6IGZ1bmN0aW9uIGF0YW5oKHZhbHVlKSB7XG4gICAgICB2YXIgeCA9IE51bWJlcih2YWx1ZSk7XG4gICAgICBpZiAoTnVtYmVyLmlzTmFOKHgpIHx8IHggPCAtMSB8fCB4ID4gMSkge1xuICAgICAgICByZXR1cm4gTmFOO1xuICAgICAgfVxuICAgICAgaWYgKHggPT09IC0xKSB7IHJldHVybiAtSW5maW5pdHk7IH1cbiAgICAgIGlmICh4ID09PSAxKSB7IHJldHVybiBJbmZpbml0eTsgfVxuICAgICAgaWYgKHggPT09IDApIHsgcmV0dXJuIHg7IH1cbiAgICAgIHJldHVybiAwLjUgKiBfbG9nKCgxICsgeCkgLyAoMSAtIHgpKTtcbiAgICB9LFxuXG4gICAgY2JydDogZnVuY3Rpb24gY2JydCh2YWx1ZSkge1xuICAgICAgdmFyIHggPSBOdW1iZXIodmFsdWUpO1xuICAgICAgaWYgKHggPT09IDApIHsgcmV0dXJuIHg7IH1cbiAgICAgIHZhciBuZWdhdGUgPSB4IDwgMCwgcmVzdWx0O1xuICAgICAgaWYgKG5lZ2F0ZSkgeyB4ID0gLXg7IH1cbiAgICAgIGlmICh4ID09PSBJbmZpbml0eSkge1xuICAgICAgICByZXN1bHQgPSBJbmZpbml0eTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJlc3VsdCA9IE1hdGguZXhwKF9sb2coeCkgLyAzKTtcbiAgICAgICAgLy8gZnJvbSBodHRwOi8vZW4ud2lraXBlZGlhLm9yZy93aWtpL0N1YmVfcm9vdCNOdW1lcmljYWxfbWV0aG9kc1xuICAgICAgICByZXN1bHQgPSAoeCAvIChyZXN1bHQgKiByZXN1bHQpICsgKDIgKiByZXN1bHQpKSAvIDM7XG4gICAgICB9XG4gICAgICByZXR1cm4gbmVnYXRlID8gLXJlc3VsdCA6IHJlc3VsdDtcbiAgICB9LFxuXG4gICAgY2x6MzI6IGZ1bmN0aW9uIGNsejMyKHZhbHVlKSB7XG4gICAgICAvLyBTZWUgaHR0cHM6Ly9idWdzLmVjbWFzY3JpcHQub3JnL3Nob3dfYnVnLmNnaT9pZD0yNDY1XG4gICAgICB2YXIgeCA9IE51bWJlcih2YWx1ZSk7XG4gICAgICB2YXIgbnVtYmVyID0gRVMuVG9VaW50MzIoeCk7XG4gICAgICBpZiAobnVtYmVyID09PSAwKSB7XG4gICAgICAgIHJldHVybiAzMjtcbiAgICAgIH1cbiAgICAgIHJldHVybiBudW1iZXJDTFogPyBFUy5DYWxsKG51bWJlckNMWiwgbnVtYmVyKSA6IDMxIC0gX2Zsb29yKF9sb2cobnVtYmVyICsgMC41KSAqIE1hdGguTE9HMkUpO1xuICAgIH0sXG5cbiAgICBjb3NoOiBmdW5jdGlvbiBjb3NoKHZhbHVlKSB7XG4gICAgICB2YXIgeCA9IE51bWJlcih2YWx1ZSk7XG4gICAgICBpZiAoeCA9PT0gMCkgeyByZXR1cm4gMTsgfSAvLyArMCBvciAtMFxuICAgICAgaWYgKE51bWJlci5pc05hTih4KSkgeyByZXR1cm4gTmFOOyB9XG4gICAgICBpZiAoIWdsb2JhbElzRmluaXRlKHgpKSB7IHJldHVybiBJbmZpbml0eTsgfVxuICAgICAgaWYgKHggPCAwKSB7IHggPSAteDsgfVxuICAgICAgaWYgKHggPiAyMSkgeyByZXR1cm4gTWF0aC5leHAoeCkgLyAyOyB9XG4gICAgICByZXR1cm4gKE1hdGguZXhwKHgpICsgTWF0aC5leHAoLXgpKSAvIDI7XG4gICAgfSxcblxuICAgIGV4cG0xOiBmdW5jdGlvbiBleHBtMSh2YWx1ZSkge1xuICAgICAgdmFyIHggPSBOdW1iZXIodmFsdWUpO1xuICAgICAgaWYgKHggPT09IC1JbmZpbml0eSkgeyByZXR1cm4gLTE7IH1cbiAgICAgIGlmICghZ2xvYmFsSXNGaW5pdGUoeCkgfHwgeCA9PT0gMCkgeyByZXR1cm4geDsgfVxuICAgICAgaWYgKF9hYnMoeCkgPiAwLjUpIHtcbiAgICAgICAgcmV0dXJuIE1hdGguZXhwKHgpIC0gMTtcbiAgICAgIH1cbiAgICAgIC8vIEEgbW9yZSBwcmVjaXNlIGFwcHJveGltYXRpb24gdXNpbmcgVGF5bG9yIHNlcmllcyBleHBhbnNpb25cbiAgICAgIC8vIGZyb20gaHR0cHM6Ly9naXRodWIuY29tL3BhdWxtaWxsci9lczYtc2hpbS9pc3N1ZXMvMzE0I2lzc3VlY29tbWVudC03MDI5Mzk4NlxuICAgICAgdmFyIHQgPSB4O1xuICAgICAgdmFyIHN1bSA9IDA7XG4gICAgICB2YXIgbiA9IDE7XG4gICAgICB3aGlsZSAoc3VtICsgdCAhPT0gc3VtKSB7XG4gICAgICAgIHN1bSArPSB0O1xuICAgICAgICBuICs9IDE7XG4gICAgICAgIHQgKj0geCAvIG47XG4gICAgICB9XG4gICAgICByZXR1cm4gc3VtO1xuICAgIH0sXG5cbiAgICBoeXBvdDogZnVuY3Rpb24gaHlwb3QoeCwgeSkge1xuICAgICAgdmFyIHJlc3VsdCA9IDA7XG4gICAgICB2YXIgbGFyZ2VzdCA9IDA7XG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7ICsraSkge1xuICAgICAgICB2YXIgdmFsdWUgPSBfYWJzKE51bWJlcihhcmd1bWVudHNbaV0pKTtcbiAgICAgICAgaWYgKGxhcmdlc3QgPCB2YWx1ZSkge1xuICAgICAgICAgIHJlc3VsdCAqPSAobGFyZ2VzdCAvIHZhbHVlKSAqIChsYXJnZXN0IC8gdmFsdWUpO1xuICAgICAgICAgIHJlc3VsdCArPSAxO1xuICAgICAgICAgIGxhcmdlc3QgPSB2YWx1ZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXN1bHQgKz0gKHZhbHVlID4gMCA/ICh2YWx1ZSAvIGxhcmdlc3QpICogKHZhbHVlIC8gbGFyZ2VzdCkgOiB2YWx1ZSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiBsYXJnZXN0ID09PSBJbmZpbml0eSA/IEluZmluaXR5IDogbGFyZ2VzdCAqIF9zcXJ0KHJlc3VsdCk7XG4gICAgfSxcblxuICAgIGxvZzI6IGZ1bmN0aW9uIGxvZzIodmFsdWUpIHtcbiAgICAgIHJldHVybiBfbG9nKHZhbHVlKSAqIE1hdGguTE9HMkU7XG4gICAgfSxcblxuICAgIGxvZzEwOiBmdW5jdGlvbiBsb2cxMCh2YWx1ZSkge1xuICAgICAgcmV0dXJuIF9sb2codmFsdWUpICogTWF0aC5MT0cxMEU7XG4gICAgfSxcblxuICAgIGxvZzFwOiBmdW5jdGlvbiBsb2cxcCh2YWx1ZSkge1xuICAgICAgdmFyIHggPSBOdW1iZXIodmFsdWUpO1xuICAgICAgaWYgKHggPCAtMSB8fCBOdW1iZXIuaXNOYU4oeCkpIHsgcmV0dXJuIE5hTjsgfVxuICAgICAgaWYgKHggPT09IDAgfHwgeCA9PT0gSW5maW5pdHkpIHsgcmV0dXJuIHg7IH1cbiAgICAgIGlmICh4ID09PSAtMSkgeyByZXR1cm4gLUluZmluaXR5OyB9XG5cbiAgICAgIHJldHVybiAoMSArIHgpIC0gMSA9PT0gMCA/IHggOiB4ICogKF9sb2coMSArIHgpIC8gKCgxICsgeCkgLSAxKSk7XG4gICAgfSxcblxuICAgIHNpZ246IGZ1bmN0aW9uIHNpZ24odmFsdWUpIHtcbiAgICAgIHZhciBudW1iZXIgPSBOdW1iZXIodmFsdWUpO1xuICAgICAgaWYgKG51bWJlciA9PT0gMCkgeyByZXR1cm4gbnVtYmVyOyB9XG4gICAgICBpZiAoTnVtYmVyLmlzTmFOKG51bWJlcikpIHsgcmV0dXJuIG51bWJlcjsgfVxuICAgICAgcmV0dXJuIG51bWJlciA8IDAgPyAtMSA6IDE7XG4gICAgfSxcblxuICAgIHNpbmg6IGZ1bmN0aW9uIHNpbmgodmFsdWUpIHtcbiAgICAgIHZhciB4ID0gTnVtYmVyKHZhbHVlKTtcbiAgICAgIGlmICghZ2xvYmFsSXNGaW5pdGUoeCkgfHwgeCA9PT0gMCkgeyByZXR1cm4geDsgfVxuXG4gICAgICBpZiAoX2Ficyh4KSA8IDEpIHtcbiAgICAgICAgcmV0dXJuIChNYXRoLmV4cG0xKHgpIC0gTWF0aC5leHBtMSgteCkpIC8gMjtcbiAgICAgIH1cbiAgICAgIHJldHVybiAoTWF0aC5leHAoeCAtIDEpIC0gTWF0aC5leHAoLXggLSAxKSkgKiBNYXRoLkUgLyAyO1xuICAgIH0sXG5cbiAgICB0YW5oOiBmdW5jdGlvbiB0YW5oKHZhbHVlKSB7XG4gICAgICB2YXIgeCA9IE51bWJlcih2YWx1ZSk7XG4gICAgICBpZiAoTnVtYmVyLmlzTmFOKHgpIHx8IHggPT09IDApIHsgcmV0dXJuIHg7IH1cbiAgICAgIC8vIGNhbiBleGl0IGVhcmx5IGF0ICstMjAgYXMgSlMgbG9zZXMgcHJlY2lzaW9uIGZvciB0cnVlIHZhbHVlIGF0IHRoaXMgaW50ZWdlclxuICAgICAgaWYgKHggPj0gMjApIHsgcmV0dXJuIDE7IH1cbiAgICAgIGlmICh4IDw9IC0yMCkgeyByZXR1cm4gLTE7IH1cbiAgICAgIHZhciBhID0gTWF0aC5leHBtMSh4KTtcbiAgICAgIHZhciBiID0gTWF0aC5leHBtMSgteCk7XG4gICAgICBpZiAoYSA9PT0gSW5maW5pdHkpIHsgcmV0dXJuIDE7IH1cbiAgICAgIGlmIChiID09PSBJbmZpbml0eSkgeyByZXR1cm4gLTE7IH1cbiAgICAgIHJldHVybiAoYSAtIGIpIC8gKE1hdGguZXhwKHgpICsgTWF0aC5leHAoLXgpKTtcbiAgICB9LFxuXG4gICAgdHJ1bmM6IGZ1bmN0aW9uIHRydW5jKHZhbHVlKSB7XG4gICAgICB2YXIgeCA9IE51bWJlcih2YWx1ZSk7XG4gICAgICByZXR1cm4geCA8IDAgPyAtX2Zsb29yKC14KSA6IF9mbG9vcih4KTtcbiAgICB9LFxuXG4gICAgaW11bDogZnVuY3Rpb24gaW11bCh4LCB5KSB7XG4gICAgICAvLyB0YWtlbiBmcm9tIGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuLVVTL2RvY3MvV2ViL0phdmFTY3JpcHQvUmVmZXJlbmNlL0dsb2JhbF9PYmplY3RzL01hdGgvaW11bFxuICAgICAgdmFyIGEgPSBFUy5Ub1VpbnQzMih4KTtcbiAgICAgIHZhciBiID0gRVMuVG9VaW50MzIoeSk7XG4gICAgICB2YXIgYWggPSAoYSA+Pj4gMTYpICYgMHhmZmZmO1xuICAgICAgdmFyIGFsID0gYSAmIDB4ZmZmZjtcbiAgICAgIHZhciBiaCA9IChiID4+PiAxNikgJiAweGZmZmY7XG4gICAgICB2YXIgYmwgPSBiICYgMHhmZmZmO1xuICAgICAgLy8gdGhlIHNoaWZ0IGJ5IDAgZml4ZXMgdGhlIHNpZ24gb24gdGhlIGhpZ2ggcGFydFxuICAgICAgLy8gdGhlIGZpbmFsIHwwIGNvbnZlcnRzIHRoZSB1bnNpZ25lZCB2YWx1ZSBpbnRvIGEgc2lnbmVkIHZhbHVlXG4gICAgICByZXR1cm4gKChhbCAqIGJsKSArICgoKGFoICogYmwgKyBhbCAqIGJoKSA8PCAxNikgPj4+IDApIHwgMCk7XG4gICAgfSxcblxuICAgIGZyb3VuZDogZnVuY3Rpb24gZnJvdW5kKHgpIHtcbiAgICAgIHZhciB2ID0gTnVtYmVyKHgpO1xuICAgICAgaWYgKHYgPT09IDAgfHwgdiA9PT0gSW5maW5pdHkgfHwgdiA9PT0gLUluZmluaXR5IHx8IG51bWJlcklzTmFOKHYpKSB7XG4gICAgICAgIHJldHVybiB2O1xuICAgICAgfVxuICAgICAgdmFyIHNpZ24gPSBNYXRoLnNpZ24odik7XG4gICAgICB2YXIgYWJzID0gX2Ficyh2KTtcbiAgICAgIGlmIChhYnMgPCBCSU5BUllfMzJfTUlOX1ZBTFVFKSB7XG4gICAgICAgIHJldHVybiBzaWduICogcm91bmRUaWVzVG9FdmVuKGFicyAvIEJJTkFSWV8zMl9NSU5fVkFMVUUgLyBCSU5BUllfMzJfRVBTSUxPTikgKiBCSU5BUllfMzJfTUlOX1ZBTFVFICogQklOQVJZXzMyX0VQU0lMT047XG4gICAgICB9XG4gICAgICAvLyBWZWx0a2FtcCdzIHNwbGl0dGluZyAoPylcbiAgICAgIHZhciBhID0gKDEgKyBCSU5BUllfMzJfRVBTSUxPTiAvIE51bWJlci5FUFNJTE9OKSAqIGFicztcbiAgICAgIHZhciByZXN1bHQgPSBhIC0gKGEgLSBhYnMpO1xuICAgICAgaWYgKHJlc3VsdCA+IEJJTkFSWV8zMl9NQVhfVkFMVUUgfHwgbnVtYmVySXNOYU4ocmVzdWx0KSkge1xuICAgICAgICByZXR1cm4gc2lnbiAqIEluZmluaXR5O1xuICAgICAgfVxuICAgICAgcmV0dXJuIHNpZ24gKiByZXN1bHQ7XG4gICAgfVxuICB9O1xuICBkZWZpbmVQcm9wZXJ0aWVzKE1hdGgsIE1hdGhTaGltcyk7XG4gIC8vIElFIDExIFRQIGhhcyBhbiBpbXByZWNpc2UgbG9nMXA6IHJlcG9ydHMgTWF0aC5sb2cxcCgtMWUtMTcpIGFzIDBcbiAgZGVmaW5lUHJvcGVydHkoTWF0aCwgJ2xvZzFwJywgTWF0aFNoaW1zLmxvZzFwLCBNYXRoLmxvZzFwKC0xZS0xNykgIT09IC0xZS0xNyk7XG4gIC8vIElFIDExIFRQIGhhcyBhbiBpbXByZWNpc2UgYXNpbmg6IHJlcG9ydHMgTWF0aC5hc2luaCgtMWU3KSBhcyBub3QgZXhhY3RseSBlcXVhbCB0byAtTWF0aC5hc2luaCgxZTcpXG4gIGRlZmluZVByb3BlcnR5KE1hdGgsICdhc2luaCcsIE1hdGhTaGltcy5hc2luaCwgTWF0aC5hc2luaCgtMWU3KSAhPT0gLU1hdGguYXNpbmgoMWU3KSk7XG4gIC8vIENocm9tZSA0MCBoYXMgYW4gaW1wcmVjaXNlIE1hdGgudGFuaCB3aXRoIHZlcnkgc21hbGwgbnVtYmVyc1xuICBkZWZpbmVQcm9wZXJ0eShNYXRoLCAndGFuaCcsIE1hdGhTaGltcy50YW5oLCBNYXRoLnRhbmgoLTJlLTE3KSAhPT0gLTJlLTE3KTtcbiAgLy8gQ2hyb21lIDQwIGxvc2VzIE1hdGguYWNvc2ggcHJlY2lzaW9uIHdpdGggaGlnaCBudW1iZXJzXG4gIGRlZmluZVByb3BlcnR5KE1hdGgsICdhY29zaCcsIE1hdGhTaGltcy5hY29zaCwgTWF0aC5hY29zaChOdW1iZXIuTUFYX1ZBTFVFKSA9PT0gSW5maW5pdHkpO1xuICAvLyBGaXJlZm94IDM4IG9uIFdpbmRvd3NcbiAgZGVmaW5lUHJvcGVydHkoTWF0aCwgJ2NicnQnLCBNYXRoU2hpbXMuY2JydCwgTWF0aC5hYnMoMSAtIE1hdGguY2JydCgxZS0zMDApIC8gMWUtMTAwKSAvIE51bWJlci5FUFNJTE9OID4gOCk7XG4gIC8vIG5vZGUgMC4xMSBoYXMgYW4gaW1wcmVjaXNlIE1hdGguc2luaCB3aXRoIHZlcnkgc21hbGwgbnVtYmVyc1xuICBkZWZpbmVQcm9wZXJ0eShNYXRoLCAnc2luaCcsIE1hdGhTaGltcy5zaW5oLCBNYXRoLnNpbmgoLTJlLTE3KSAhPT0gLTJlLTE3KTtcbiAgLy8gRkYgMzUgb24gTGludXggcmVwb3J0cyAyMjAyNS40NjU3OTQ4MDY3MjUgZm9yIE1hdGguZXhwbTEoMTApXG4gIHZhciBleHBtMU9mVGVuID0gTWF0aC5leHBtMSgxMCk7XG4gIGRlZmluZVByb3BlcnR5KE1hdGgsICdleHBtMScsIE1hdGhTaGltcy5leHBtMSwgZXhwbTFPZlRlbiA+IDIyMDI1LjQ2NTc5NDgwNjcxOSB8fCBleHBtMU9mVGVuIDwgMjIwMjUuNDY1Nzk0ODA2NzE2NTE2OCk7XG5cbiAgdmFyIG9yaWdNYXRoUm91bmQgPSBNYXRoLnJvdW5kO1xuICAvLyBicmVha3MgaW4gZS5nLiBTYWZhcmkgOCwgSW50ZXJuZXQgRXhwbG9yZXIgMTEsIE9wZXJhIDEyXG4gIHZhciByb3VuZEhhbmRsZXNCb3VuZGFyeUNvbmRpdGlvbnMgPSBNYXRoLnJvdW5kKDAuNSAtIE51bWJlci5FUFNJTE9OIC8gNCkgPT09IDAgJiYgTWF0aC5yb3VuZCgtMC41ICsgTnVtYmVyLkVQU0lMT04gLyAzLjk5KSA9PT0gMTtcblxuICAvLyBXaGVuIGVuZ2luZXMgdXNlIE1hdGguZmxvb3IoeCArIDAuNSkgaW50ZXJuYWxseSwgTWF0aC5yb3VuZCBjYW4gYmUgYnVnZ3kgZm9yIGxhcmdlIGludGVnZXJzLlxuICAvLyBUaGlzIGJlaGF2aW9yIHNob3VsZCBiZSBnb3Zlcm5lZCBieSBcInJvdW5kIHRvIG5lYXJlc3QsIHRpZXMgdG8gZXZlbiBtb2RlXCJcbiAgLy8gc2VlIGh0dHBzOi8vcGVvcGxlLm1vemlsbGEub3JnL35qb3JlbmRvcmZmL2VzNi1kcmFmdC5odG1sI3NlYy1lY21hc2NyaXB0LWxhbmd1YWdlLXR5cGVzLW51bWJlci10eXBlXG4gIC8vIFRoZXNlIGFyZSB0aGUgYm91bmRhcnkgY2FzZXMgd2hlcmUgaXQgYnJlYWtzLlxuICB2YXIgc21hbGxlc3RQb3NpdGl2ZU51bWJlcldoZXJlUm91bmRCcmVha3MgPSBpbnZlcnNlRXBzaWxvbiArIDE7XG4gIHZhciBsYXJnZXN0UG9zaXRpdmVOdW1iZXJXaGVyZVJvdW5kQnJlYWtzID0gMiAqIGludmVyc2VFcHNpbG9uIC0gMTtcbiAgdmFyIHJvdW5kRG9lc05vdEluY3JlYXNlSW50ZWdlcnMgPSBbc21hbGxlc3RQb3NpdGl2ZU51bWJlcldoZXJlUm91bmRCcmVha3MsIGxhcmdlc3RQb3NpdGl2ZU51bWJlcldoZXJlUm91bmRCcmVha3NdLmV2ZXJ5KGZ1bmN0aW9uIChudW0pIHtcbiAgICByZXR1cm4gTWF0aC5yb3VuZChudW0pID09PSBudW07XG4gIH0pO1xuICBkZWZpbmVQcm9wZXJ0eShNYXRoLCAncm91bmQnLCBmdW5jdGlvbiByb3VuZCh4KSB7XG4gICAgdmFyIGZsb29yID0gX2Zsb29yKHgpO1xuICAgIHZhciBjZWlsID0gZmxvb3IgPT09IC0xID8gLTAgOiBmbG9vciArIDE7XG4gICAgcmV0dXJuIHggLSBmbG9vciA8IDAuNSA/IGZsb29yIDogY2VpbDtcbiAgfSwgIXJvdW5kSGFuZGxlc0JvdW5kYXJ5Q29uZGl0aW9ucyB8fCAhcm91bmREb2VzTm90SW5jcmVhc2VJbnRlZ2Vycyk7XG4gIFZhbHVlLnByZXNlcnZlVG9TdHJpbmcoTWF0aC5yb3VuZCwgb3JpZ01hdGhSb3VuZCk7XG5cbiAgdmFyIG9yaWdJbXVsID0gTWF0aC5pbXVsO1xuICBpZiAoTWF0aC5pbXVsKDB4ZmZmZmZmZmYsIDUpICE9PSAtNSkge1xuICAgIC8vIFNhZmFyaSA2LjEsIGF0IGxlYXN0LCByZXBvcnRzIFwiMFwiIGZvciB0aGlzIHZhbHVlXG4gICAgTWF0aC5pbXVsID0gTWF0aFNoaW1zLmltdWw7XG4gICAgVmFsdWUucHJlc2VydmVUb1N0cmluZyhNYXRoLmltdWwsIG9yaWdJbXVsKTtcbiAgfVxuICBpZiAoTWF0aC5pbXVsLmxlbmd0aCAhPT0gMikge1xuICAgIC8vIFNhZmFyaSA4LjAuNCBoYXMgYSBsZW5ndGggb2YgMVxuICAgIC8vIGZpeGVkIGluIGh0dHBzOi8vYnVncy53ZWJraXQub3JnL3Nob3dfYnVnLmNnaT9pZD0xNDM2NThcbiAgICBvdmVycmlkZU5hdGl2ZShNYXRoLCAnaW11bCcsIGZ1bmN0aW9uIGltdWwoeCwgeSkge1xuICAgICAgcmV0dXJuIEVTLkNhbGwob3JpZ0ltdWwsIE1hdGgsIGFyZ3VtZW50cyk7XG4gICAgfSk7XG4gIH1cblxuICAvLyBQcm9taXNlc1xuICAvLyBTaW1wbGVzdCBwb3NzaWJsZSBpbXBsZW1lbnRhdGlvbjsgdXNlIGEgM3JkLXBhcnR5IGxpYnJhcnkgaWYgeW91XG4gIC8vIHdhbnQgdGhlIGJlc3QgcG9zc2libGUgc3BlZWQgYW5kL29yIGxvbmcgc3RhY2sgdHJhY2VzLlxuICB2YXIgUHJvbWlzZVNoaW0gPSAoZnVuY3Rpb24gKCkge1xuICAgIHZhciBzZXRUaW1lb3V0ID0gZ2xvYmFscy5zZXRUaW1lb3V0O1xuICAgIC8vIHNvbWUgZW52aXJvbm1lbnRzIGRvbid0IGhhdmUgc2V0VGltZW91dCAtIG5vIHdheSB0byBzaGltIGhlcmUuXG4gICAgaWYgKHR5cGVvZiBzZXRUaW1lb3V0ICE9PSAnZnVuY3Rpb24nICYmIHR5cGVvZiBzZXRUaW1lb3V0ICE9PSAnb2JqZWN0JykgeyByZXR1cm47IH1cblxuICAgIEVTLklzUHJvbWlzZSA9IGZ1bmN0aW9uIChwcm9taXNlKSB7XG4gICAgICBpZiAoIUVTLlR5cGVJc09iamVjdChwcm9taXNlKSkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgICBpZiAodHlwZW9mIHByb21pc2UuX3Byb21pc2UgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTsgLy8gdW5pbml0aWFsaXplZCwgb3IgbWlzc2luZyBvdXIgaGlkZGVuIGZpZWxkLlxuICAgICAgfVxuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfTtcblxuICAgIC8vIFwiUHJvbWlzZUNhcGFiaWxpdHlcIiBpbiB0aGUgc3BlYyBpcyB3aGF0IG1vc3QgcHJvbWlzZSBpbXBsZW1lbnRhdGlvbnNcbiAgICAvLyBjYWxsIGEgXCJkZWZlcnJlZFwiLlxuICAgIHZhciBQcm9taXNlQ2FwYWJpbGl0eSA9IGZ1bmN0aW9uIChDKSB7XG4gICAgICBpZiAoIUVTLklzQ29uc3RydWN0b3IoQykpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignQmFkIHByb21pc2UgY29uc3RydWN0b3InKTtcbiAgICAgIH1cbiAgICAgIHZhciBjYXBhYmlsaXR5ID0gdGhpcztcbiAgICAgIHZhciByZXNvbHZlciA9IGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgaWYgKGNhcGFiaWxpdHkucmVzb2x2ZSAhPT0gdm9pZCAwIHx8IGNhcGFiaWxpdHkucmVqZWN0ICE9PSB2b2lkIDApIHtcbiAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdCYWQgUHJvbWlzZSBpbXBsZW1lbnRhdGlvbiEnKTtcbiAgICAgICAgfVxuICAgICAgICBjYXBhYmlsaXR5LnJlc29sdmUgPSByZXNvbHZlO1xuICAgICAgICBjYXBhYmlsaXR5LnJlamVjdCA9IHJlamVjdDtcbiAgICAgIH07XG4gICAgICAvLyBJbml0aWFsaXplIGZpZWxkcyB0byBpbmZvcm0gb3B0aW1pemVycyBhYm91dCB0aGUgb2JqZWN0IHNoYXBlLlxuICAgICAgY2FwYWJpbGl0eS5yZXNvbHZlID0gdm9pZCAwO1xuICAgICAgY2FwYWJpbGl0eS5yZWplY3QgPSB2b2lkIDA7XG4gICAgICBjYXBhYmlsaXR5LnByb21pc2UgPSBuZXcgQyhyZXNvbHZlcik7XG4gICAgICBpZiAoIShFUy5Jc0NhbGxhYmxlKGNhcGFiaWxpdHkucmVzb2x2ZSkgJiYgRVMuSXNDYWxsYWJsZShjYXBhYmlsaXR5LnJlamVjdCkpKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0JhZCBwcm9taXNlIGNvbnN0cnVjdG9yJyk7XG4gICAgICB9XG4gICAgfTtcblxuICAgIC8vIGZpbmQgYW4gYXBwcm9wcmlhdGUgc2V0SW1tZWRpYXRlLWFsaWtlXG4gICAgdmFyIG1ha2VaZXJvVGltZW91dDtcbiAgICAvKmdsb2JhbCB3aW5kb3cgKi9cbiAgICBpZiAodHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcgJiYgRVMuSXNDYWxsYWJsZSh3aW5kb3cucG9zdE1lc3NhZ2UpKSB7XG4gICAgICBtYWtlWmVyb1RpbWVvdXQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIC8vIGZyb20gaHR0cDovL2RiYXJvbi5vcmcvbG9nLzIwMTAwMzA5LWZhc3Rlci10aW1lb3V0c1xuICAgICAgICB2YXIgdGltZW91dHMgPSBbXTtcbiAgICAgICAgdmFyIG1lc3NhZ2VOYW1lID0gJ3plcm8tdGltZW91dC1tZXNzYWdlJztcbiAgICAgICAgdmFyIHNldFplcm9UaW1lb3V0ID0gZnVuY3Rpb24gKGZuKSB7XG4gICAgICAgICAgX3B1c2godGltZW91dHMsIGZuKTtcbiAgICAgICAgICB3aW5kb3cucG9zdE1lc3NhZ2UobWVzc2FnZU5hbWUsICcqJyk7XG4gICAgICAgIH07XG4gICAgICAgIHZhciBoYW5kbGVNZXNzYWdlID0gZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgICAgaWYgKGV2ZW50LnNvdXJjZSA9PT0gd2luZG93ICYmIGV2ZW50LmRhdGEgPT09IG1lc3NhZ2VOYW1lKSB7XG4gICAgICAgICAgICBldmVudC5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgICAgIGlmICh0aW1lb3V0cy5sZW5ndGggPT09IDApIHsgcmV0dXJuOyB9XG4gICAgICAgICAgICB2YXIgZm4gPSBfc2hpZnQodGltZW91dHMpO1xuICAgICAgICAgICAgZm4oKTtcbiAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdtZXNzYWdlJywgaGFuZGxlTWVzc2FnZSwgdHJ1ZSk7XG4gICAgICAgIHJldHVybiBzZXRaZXJvVGltZW91dDtcbiAgICAgIH07XG4gICAgfVxuICAgIHZhciBtYWtlUHJvbWlzZUFzYXAgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAvLyBBbiBlZmZpY2llbnQgdGFzay1zY2hlZHVsZXIgYmFzZWQgb24gYSBwcmUtZXhpc3RpbmcgUHJvbWlzZVxuICAgICAgLy8gaW1wbGVtZW50YXRpb24sIHdoaWNoIHdlIGNhbiB1c2UgZXZlbiBpZiB3ZSBvdmVycmlkZSB0aGVcbiAgICAgIC8vIGdsb2JhbCBQcm9taXNlIGJlbG93IChpbiBvcmRlciB0byB3b3JrYXJvdW5kIGJ1Z3MpXG4gICAgICAvLyBodHRwczovL2dpdGh1Yi5jb20vUmF5bm9zL29ic2Vydi1oYXNoL2lzc3Vlcy8yI2lzc3VlY29tbWVudC0zNTg1NzY3MVxuICAgICAgdmFyIFAgPSBnbG9iYWxzLlByb21pc2U7XG4gICAgICB2YXIgcHIgPSBQICYmIFAucmVzb2x2ZSAmJiBQLnJlc29sdmUoKTtcbiAgICAgIHJldHVybiBwciAmJiBmdW5jdGlvbiAodGFzaykge1xuICAgICAgICByZXR1cm4gcHIudGhlbih0YXNrKTtcbiAgICAgIH07XG4gICAgfTtcbiAgICAvKmdsb2JhbCBwcm9jZXNzICovXG4gICAgLyoganNjczpkaXNhYmxlIGRpc2FsbG93TXVsdGlMaW5lVGVybmFyeSAqL1xuICAgIHZhciBlbnF1ZXVlID0gRVMuSXNDYWxsYWJsZShnbG9iYWxzLnNldEltbWVkaWF0ZSkgP1xuICAgICAgZ2xvYmFscy5zZXRJbW1lZGlhdGUgOlxuICAgICAgdHlwZW9mIHByb2Nlc3MgPT09ICdvYmplY3QnICYmIHByb2Nlc3MubmV4dFRpY2sgPyBwcm9jZXNzLm5leHRUaWNrIDpcbiAgICAgIG1ha2VQcm9taXNlQXNhcCgpIHx8XG4gICAgICAoRVMuSXNDYWxsYWJsZShtYWtlWmVyb1RpbWVvdXQpID8gbWFrZVplcm9UaW1lb3V0KCkgOlxuICAgICAgZnVuY3Rpb24gKHRhc2spIHsgc2V0VGltZW91dCh0YXNrLCAwKTsgfSk7IC8vIGZhbGxiYWNrXG4gICAgLyoganNjczplbmFibGUgZGlzYWxsb3dNdWx0aUxpbmVUZXJuYXJ5ICovXG5cbiAgICAvLyBDb25zdGFudHMgZm9yIFByb21pc2UgaW1wbGVtZW50YXRpb25cbiAgICB2YXIgUFJPTUlTRV9JREVOVElUWSA9IGZ1bmN0aW9uICh4KSB7IHJldHVybiB4OyB9O1xuICAgIHZhciBQUk9NSVNFX1RIUk9XRVIgPSBmdW5jdGlvbiAoZSkgeyB0aHJvdyBlOyB9O1xuICAgIHZhciBQUk9NSVNFX1BFTkRJTkcgPSAwO1xuICAgIHZhciBQUk9NSVNFX0ZVTEZJTExFRCA9IDE7XG4gICAgdmFyIFBST01JU0VfUkVKRUNURUQgPSAyO1xuICAgIC8vIFdlIHN0b3JlIGZ1bGZpbGwvcmVqZWN0IGhhbmRsZXJzIGFuZCBjYXBhYmlsaXRpZXMgaW4gYSBzaW5nbGUgYXJyYXkuXG4gICAgdmFyIFBST01JU0VfRlVMRklMTF9PRkZTRVQgPSAwO1xuICAgIHZhciBQUk9NSVNFX1JFSkVDVF9PRkZTRVQgPSAxO1xuICAgIHZhciBQUk9NSVNFX0NBUEFCSUxJVFlfT0ZGU0VUID0gMjtcbiAgICAvLyBUaGlzIGlzIHVzZWQgaW4gYW4gb3B0aW1pemF0aW9uIGZvciBjaGFpbmluZyBwcm9taXNlcyB2aWEgdGhlbi5cbiAgICB2YXIgUFJPTUlTRV9GQUtFX0NBUEFCSUxJVFkgPSB7fTtcblxuICAgIHZhciBlbnF1ZXVlUHJvbWlzZVJlYWN0aW9uSm9iID0gZnVuY3Rpb24gKGhhbmRsZXIsIGNhcGFiaWxpdHksIGFyZ3VtZW50KSB7XG4gICAgICBlbnF1ZXVlKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcHJvbWlzZVJlYWN0aW9uSm9iKGhhbmRsZXIsIGNhcGFiaWxpdHksIGFyZ3VtZW50KTtcbiAgICAgIH0pO1xuICAgIH07XG5cbiAgICB2YXIgcHJvbWlzZVJlYWN0aW9uSm9iID0gZnVuY3Rpb24gKGhhbmRsZXIsIHByb21pc2VDYXBhYmlsaXR5LCBhcmd1bWVudCkge1xuICAgICAgdmFyIGhhbmRsZXJSZXN1bHQsIGY7XG4gICAgICBpZiAocHJvbWlzZUNhcGFiaWxpdHkgPT09IFBST01JU0VfRkFLRV9DQVBBQklMSVRZKSB7XG4gICAgICAgIC8vIEZhc3QgY2FzZSwgd2hlbiB3ZSBkb24ndCBhY3R1YWxseSBuZWVkIHRvIGNoYWluIHRocm91Z2ggdG8gYVxuICAgICAgICAvLyAocmVhbCkgcHJvbWlzZUNhcGFiaWxpdHkuXG4gICAgICAgIHJldHVybiBoYW5kbGVyKGFyZ3VtZW50KTtcbiAgICAgIH1cbiAgICAgIHRyeSB7XG4gICAgICAgIGhhbmRsZXJSZXN1bHQgPSBoYW5kbGVyKGFyZ3VtZW50KTtcbiAgICAgICAgZiA9IHByb21pc2VDYXBhYmlsaXR5LnJlc29sdmU7XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGhhbmRsZXJSZXN1bHQgPSBlO1xuICAgICAgICBmID0gcHJvbWlzZUNhcGFiaWxpdHkucmVqZWN0O1xuICAgICAgfVxuICAgICAgZihoYW5kbGVyUmVzdWx0KTtcbiAgICB9O1xuXG4gICAgdmFyIGZ1bGZpbGxQcm9taXNlID0gZnVuY3Rpb24gKHByb21pc2UsIHZhbHVlKSB7XG4gICAgICB2YXIgX3Byb21pc2UgPSBwcm9taXNlLl9wcm9taXNlO1xuICAgICAgdmFyIGxlbmd0aCA9IF9wcm9taXNlLnJlYWN0aW9uTGVuZ3RoO1xuICAgICAgaWYgKGxlbmd0aCA+IDApIHtcbiAgICAgICAgZW5xdWV1ZVByb21pc2VSZWFjdGlvbkpvYihcbiAgICAgICAgICBfcHJvbWlzZS5mdWxmaWxsUmVhY3Rpb25IYW5kbGVyMCxcbiAgICAgICAgICBfcHJvbWlzZS5yZWFjdGlvbkNhcGFiaWxpdHkwLFxuICAgICAgICAgIHZhbHVlXG4gICAgICAgICk7XG4gICAgICAgIF9wcm9taXNlLmZ1bGZpbGxSZWFjdGlvbkhhbmRsZXIwID0gdm9pZCAwO1xuICAgICAgICBfcHJvbWlzZS5yZWplY3RSZWFjdGlvbnMwID0gdm9pZCAwO1xuICAgICAgICBfcHJvbWlzZS5yZWFjdGlvbkNhcGFiaWxpdHkwID0gdm9pZCAwO1xuICAgICAgICBpZiAobGVuZ3RoID4gMSkge1xuICAgICAgICAgIGZvciAodmFyIGkgPSAxLCBpZHggPSAwOyBpIDwgbGVuZ3RoOyBpKyssIGlkeCArPSAzKSB7XG4gICAgICAgICAgICBlbnF1ZXVlUHJvbWlzZVJlYWN0aW9uSm9iKFxuICAgICAgICAgICAgICBfcHJvbWlzZVtpZHggKyBQUk9NSVNFX0ZVTEZJTExfT0ZGU0VUXSxcbiAgICAgICAgICAgICAgX3Byb21pc2VbaWR4ICsgUFJPTUlTRV9DQVBBQklMSVRZX09GRlNFVF0sXG4gICAgICAgICAgICAgIHZhbHVlXG4gICAgICAgICAgICApO1xuICAgICAgICAgICAgcHJvbWlzZVtpZHggKyBQUk9NSVNFX0ZVTEZJTExfT0ZGU0VUXSA9IHZvaWQgMDtcbiAgICAgICAgICAgIHByb21pc2VbaWR4ICsgUFJPTUlTRV9SRUpFQ1RfT0ZGU0VUXSA9IHZvaWQgMDtcbiAgICAgICAgICAgIHByb21pc2VbaWR4ICsgUFJPTUlTRV9DQVBBQklMSVRZX09GRlNFVF0gPSB2b2lkIDA7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICBfcHJvbWlzZS5yZXN1bHQgPSB2YWx1ZTtcbiAgICAgIF9wcm9taXNlLnN0YXRlID0gUFJPTUlTRV9GVUxGSUxMRUQ7XG4gICAgICBfcHJvbWlzZS5yZWFjdGlvbkxlbmd0aCA9IDA7XG4gICAgfTtcblxuICAgIHZhciByZWplY3RQcm9taXNlID0gZnVuY3Rpb24gKHByb21pc2UsIHJlYXNvbikge1xuICAgICAgdmFyIF9wcm9taXNlID0gcHJvbWlzZS5fcHJvbWlzZTtcbiAgICAgIHZhciBsZW5ndGggPSBfcHJvbWlzZS5yZWFjdGlvbkxlbmd0aDtcbiAgICAgIGlmIChsZW5ndGggPiAwKSB7XG4gICAgICAgIGVucXVldWVQcm9taXNlUmVhY3Rpb25Kb2IoXG4gICAgICAgICAgX3Byb21pc2UucmVqZWN0UmVhY3Rpb25IYW5kbGVyMCxcbiAgICAgICAgICBfcHJvbWlzZS5yZWFjdGlvbkNhcGFiaWxpdHkwLFxuICAgICAgICAgIHJlYXNvblxuICAgICAgICApO1xuICAgICAgICBfcHJvbWlzZS5mdWxmaWxsUmVhY3Rpb25IYW5kbGVyMCA9IHZvaWQgMDtcbiAgICAgICAgX3Byb21pc2UucmVqZWN0UmVhY3Rpb25zMCA9IHZvaWQgMDtcbiAgICAgICAgX3Byb21pc2UucmVhY3Rpb25DYXBhYmlsaXR5MCA9IHZvaWQgMDtcbiAgICAgICAgaWYgKGxlbmd0aCA+IDEpIHtcbiAgICAgICAgICBmb3IgKHZhciBpID0gMSwgaWR4ID0gMDsgaSA8IGxlbmd0aDsgaSsrLCBpZHggKz0gMykge1xuICAgICAgICAgICAgZW5xdWV1ZVByb21pc2VSZWFjdGlvbkpvYihcbiAgICAgICAgICAgICAgX3Byb21pc2VbaWR4ICsgUFJPTUlTRV9SRUpFQ1RfT0ZGU0VUXSxcbiAgICAgICAgICAgICAgX3Byb21pc2VbaWR4ICsgUFJPTUlTRV9DQVBBQklMSVRZX09GRlNFVF0sXG4gICAgICAgICAgICAgIHJlYXNvblxuICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIHByb21pc2VbaWR4ICsgUFJPTUlTRV9GVUxGSUxMX09GRlNFVF0gPSB2b2lkIDA7XG4gICAgICAgICAgICBwcm9taXNlW2lkeCArIFBST01JU0VfUkVKRUNUX09GRlNFVF0gPSB2b2lkIDA7XG4gICAgICAgICAgICBwcm9taXNlW2lkeCArIFBST01JU0VfQ0FQQUJJTElUWV9PRkZTRVRdID0gdm9pZCAwO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgX3Byb21pc2UucmVzdWx0ID0gcmVhc29uO1xuICAgICAgX3Byb21pc2Uuc3RhdGUgPSBQUk9NSVNFX1JFSkVDVEVEO1xuICAgICAgX3Byb21pc2UucmVhY3Rpb25MZW5ndGggPSAwO1xuICAgIH07XG5cbiAgICB2YXIgY3JlYXRlUmVzb2x2aW5nRnVuY3Rpb25zID0gZnVuY3Rpb24gKHByb21pc2UpIHtcbiAgICAgIHZhciBhbHJlYWR5UmVzb2x2ZWQgPSBmYWxzZTtcbiAgICAgIHZhciByZXNvbHZlID0gZnVuY3Rpb24gKHJlc29sdXRpb24pIHtcbiAgICAgICAgdmFyIHRoZW47XG4gICAgICAgIGlmIChhbHJlYWR5UmVzb2x2ZWQpIHsgcmV0dXJuOyB9XG4gICAgICAgIGFscmVhZHlSZXNvbHZlZCA9IHRydWU7XG4gICAgICAgIGlmIChyZXNvbHV0aW9uID09PSBwcm9taXNlKSB7XG4gICAgICAgICAgcmV0dXJuIHJlamVjdFByb21pc2UocHJvbWlzZSwgbmV3IFR5cGVFcnJvcignU2VsZiByZXNvbHV0aW9uJykpO1xuICAgICAgICB9XG4gICAgICAgIGlmICghRVMuVHlwZUlzT2JqZWN0KHJlc29sdXRpb24pKSB7XG4gICAgICAgICAgcmV0dXJuIGZ1bGZpbGxQcm9taXNlKHByb21pc2UsIHJlc29sdXRpb24pO1xuICAgICAgICB9XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgdGhlbiA9IHJlc29sdXRpb24udGhlbjtcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgIHJldHVybiByZWplY3RQcm9taXNlKHByb21pc2UsIGUpO1xuICAgICAgICB9XG4gICAgICAgIGlmICghRVMuSXNDYWxsYWJsZSh0aGVuKSkge1xuICAgICAgICAgIHJldHVybiBmdWxmaWxsUHJvbWlzZShwcm9taXNlLCByZXNvbHV0aW9uKTtcbiAgICAgICAgfVxuICAgICAgICBlbnF1ZXVlKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICBwcm9taXNlUmVzb2x2ZVRoZW5hYmxlSm9iKHByb21pc2UsIHJlc29sdXRpb24sIHRoZW4pO1xuICAgICAgICB9KTtcbiAgICAgIH07XG4gICAgICB2YXIgcmVqZWN0ID0gZnVuY3Rpb24gKHJlYXNvbikge1xuICAgICAgICBpZiAoYWxyZWFkeVJlc29sdmVkKSB7IHJldHVybjsgfVxuICAgICAgICBhbHJlYWR5UmVzb2x2ZWQgPSB0cnVlO1xuICAgICAgICByZXR1cm4gcmVqZWN0UHJvbWlzZShwcm9taXNlLCByZWFzb24pO1xuICAgICAgfTtcbiAgICAgIHJldHVybiB7IHJlc29sdmU6IHJlc29sdmUsIHJlamVjdDogcmVqZWN0IH07XG4gICAgfTtcblxuICAgIHZhciBvcHRpbWl6ZWRUaGVuID0gZnVuY3Rpb24gKHRoZW4sIHRoZW5hYmxlLCByZXNvbHZlLCByZWplY3QpIHtcbiAgICAgIC8vIE9wdGltaXphdGlvbjogc2luY2Ugd2UgZGlzY2FyZCB0aGUgcmVzdWx0LCB3ZSBjYW4gcGFzcyBvdXJcbiAgICAgIC8vIG93biB0aGVuIGltcGxlbWVudGF0aW9uIGEgc3BlY2lhbCBoaW50IHRvIGxldCBpdCBrbm93IGl0XG4gICAgICAvLyBkb2Vzbid0IGhhdmUgdG8gY3JlYXRlIGl0LiAgKFRoZSBQUk9NSVNFX0ZBS0VfQ0FQQUJJTElUWVxuICAgICAgLy8gb2JqZWN0IGlzIGxvY2FsIHRvIHRoaXMgaW1wbGVtZW50YXRpb24gYW5kIHVuZm9yZ2VhYmxlIG91dHNpZGUuKVxuICAgICAgaWYgKHRoZW4gPT09IFByb21pc2UkcHJvdG90eXBlJHRoZW4pIHtcbiAgICAgICAgX2NhbGwodGhlbiwgdGhlbmFibGUsIHJlc29sdmUsIHJlamVjdCwgUFJPTUlTRV9GQUtFX0NBUEFCSUxJVFkpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgX2NhbGwodGhlbiwgdGhlbmFibGUsIHJlc29sdmUsIHJlamVjdCk7XG4gICAgICB9XG4gICAgfTtcbiAgICB2YXIgcHJvbWlzZVJlc29sdmVUaGVuYWJsZUpvYiA9IGZ1bmN0aW9uIChwcm9taXNlLCB0aGVuYWJsZSwgdGhlbikge1xuICAgICAgdmFyIHJlc29sdmluZ0Z1bmN0aW9ucyA9IGNyZWF0ZVJlc29sdmluZ0Z1bmN0aW9ucyhwcm9taXNlKTtcbiAgICAgIHZhciByZXNvbHZlID0gcmVzb2x2aW5nRnVuY3Rpb25zLnJlc29sdmU7XG4gICAgICB2YXIgcmVqZWN0ID0gcmVzb2x2aW5nRnVuY3Rpb25zLnJlamVjdDtcbiAgICAgIHRyeSB7XG4gICAgICAgIG9wdGltaXplZFRoZW4odGhlbiwgdGhlbmFibGUsIHJlc29sdmUsIHJlamVjdCk7XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIHJlamVjdChlKTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgdmFyIFByb21pc2UkcHJvdG90eXBlLCBQcm9taXNlJHByb3RvdHlwZSR0aGVuO1xuICAgIHZhciBQcm9taXNlID0gKGZ1bmN0aW9uICgpIHtcbiAgICAgIHZhciBQcm9taXNlU2hpbSA9IGZ1bmN0aW9uIFByb21pc2UocmVzb2x2ZXIpIHtcbiAgICAgICAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIFByb21pc2VTaGltKSkge1xuICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0NvbnN0cnVjdG9yIFByb21pc2UgcmVxdWlyZXMgXCJuZXdcIicpO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0aGlzICYmIHRoaXMuX3Byb21pc2UpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdCYWQgY29uc3RydWN0aW9uJyk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gc2VlIGh0dHBzOi8vYnVncy5lY21hc2NyaXB0Lm9yZy9zaG93X2J1Zy5jZ2k/aWQ9MjQ4MlxuICAgICAgICBpZiAoIUVTLklzQ2FsbGFibGUocmVzb2x2ZXIpKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignbm90IGEgdmFsaWQgcmVzb2x2ZXInKTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgcHJvbWlzZSA9IGVtdWxhdGVFUzZjb25zdHJ1Y3QodGhpcywgUHJvbWlzZVNoaW0sIFByb21pc2UkcHJvdG90eXBlLCB7XG4gICAgICAgICAgX3Byb21pc2U6IHtcbiAgICAgICAgICAgIHJlc3VsdDogdm9pZCAwLFxuICAgICAgICAgICAgc3RhdGU6IFBST01JU0VfUEVORElORyxcbiAgICAgICAgICAgIC8vIFRoZSBmaXJzdCBtZW1iZXIgb2YgdGhlIFwicmVhY3Rpb25zXCIgYXJyYXkgaXMgaW5saW5lZCBoZXJlLFxuICAgICAgICAgICAgLy8gc2luY2UgbW9zdCBwcm9taXNlcyBvbmx5IGhhdmUgb25lIHJlYWN0aW9uLlxuICAgICAgICAgICAgLy8gV2UndmUgYWxzbyBleHBsb2RlZCB0aGUgJ3JlYWN0aW9uJyBvYmplY3QgdG8gaW5saW5lIHRoZVxuICAgICAgICAgICAgLy8gXCJoYW5kbGVyXCIgYW5kIFwiY2FwYWJpbGl0eVwiIGZpZWxkcywgc2luY2UgYm90aCBmdWxmaWxsIGFuZFxuICAgICAgICAgICAgLy8gcmVqZWN0IHJlYWN0aW9ucyBzaGFyZSB0aGUgc2FtZSBjYXBhYmlsaXR5LlxuICAgICAgICAgICAgcmVhY3Rpb25MZW5ndGg6IDAsXG4gICAgICAgICAgICBmdWxmaWxsUmVhY3Rpb25IYW5kbGVyMDogdm9pZCAwLFxuICAgICAgICAgICAgcmVqZWN0UmVhY3Rpb25IYW5kbGVyMDogdm9pZCAwLFxuICAgICAgICAgICAgcmVhY3Rpb25DYXBhYmlsaXR5MDogdm9pZCAwXG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgdmFyIHJlc29sdmluZ0Z1bmN0aW9ucyA9IGNyZWF0ZVJlc29sdmluZ0Z1bmN0aW9ucyhwcm9taXNlKTtcbiAgICAgICAgdmFyIHJlamVjdCA9IHJlc29sdmluZ0Z1bmN0aW9ucy5yZWplY3Q7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgcmVzb2x2ZXIocmVzb2x2aW5nRnVuY3Rpb25zLnJlc29sdmUsIHJlamVjdCk7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICByZWplY3QoZSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHByb21pc2U7XG4gICAgICB9O1xuICAgICAgcmV0dXJuIFByb21pc2VTaGltO1xuICAgIH0oKSk7XG4gICAgUHJvbWlzZSRwcm90b3R5cGUgPSBQcm9taXNlLnByb3RvdHlwZTtcblxuICAgIHZhciBfcHJvbWlzZUFsbFJlc29sdmVyID0gZnVuY3Rpb24gKGluZGV4LCB2YWx1ZXMsIGNhcGFiaWxpdHksIHJlbWFpbmluZykge1xuICAgICAgdmFyIGFscmVhZHlDYWxsZWQgPSBmYWxzZTtcbiAgICAgIHJldHVybiBmdW5jdGlvbiAoeCkge1xuICAgICAgICBpZiAoYWxyZWFkeUNhbGxlZCkgeyByZXR1cm47IH1cbiAgICAgICAgYWxyZWFkeUNhbGxlZCA9IHRydWU7XG4gICAgICAgIHZhbHVlc1tpbmRleF0gPSB4O1xuICAgICAgICBpZiAoKC0tcmVtYWluaW5nLmNvdW50KSA9PT0gMCkge1xuICAgICAgICAgIHZhciByZXNvbHZlID0gY2FwYWJpbGl0eS5yZXNvbHZlO1xuICAgICAgICAgIHJlc29sdmUodmFsdWVzKTsgLy8gY2FsbCB3LyB0aGlzPT09dW5kZWZpbmVkXG4gICAgICAgIH1cbiAgICAgIH07XG4gICAgfTtcblxuICAgIHZhciBwZXJmb3JtUHJvbWlzZUFsbCA9IGZ1bmN0aW9uIChpdGVyYXRvclJlY29yZCwgQywgcmVzdWx0Q2FwYWJpbGl0eSkge1xuICAgICAgdmFyIGl0ID0gaXRlcmF0b3JSZWNvcmQuaXRlcmF0b3I7XG4gICAgICB2YXIgdmFsdWVzID0gW10sIHJlbWFpbmluZyA9IHsgY291bnQ6IDEgfSwgbmV4dCwgbmV4dFZhbHVlO1xuICAgICAgdmFyIGluZGV4ID0gMDtcbiAgICAgIHdoaWxlICh0cnVlKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgbmV4dCA9IEVTLkl0ZXJhdG9yU3RlcChpdCk7XG4gICAgICAgICAgaWYgKG5leHQgPT09IGZhbHNlKSB7XG4gICAgICAgICAgICBpdGVyYXRvclJlY29yZC5kb25lID0gdHJ1ZTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIH1cbiAgICAgICAgICBuZXh0VmFsdWUgPSBuZXh0LnZhbHVlO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgaXRlcmF0b3JSZWNvcmQuZG9uZSA9IHRydWU7XG4gICAgICAgICAgdGhyb3cgZTtcbiAgICAgICAgfVxuICAgICAgICB2YWx1ZXNbaW5kZXhdID0gdm9pZCAwO1xuICAgICAgICB2YXIgbmV4dFByb21pc2UgPSBDLnJlc29sdmUobmV4dFZhbHVlKTtcbiAgICAgICAgdmFyIHJlc29sdmVFbGVtZW50ID0gX3Byb21pc2VBbGxSZXNvbHZlcihcbiAgICAgICAgICBpbmRleCwgdmFsdWVzLCByZXN1bHRDYXBhYmlsaXR5LCByZW1haW5pbmdcbiAgICAgICAgKTtcbiAgICAgICAgcmVtYWluaW5nLmNvdW50ICs9IDE7XG4gICAgICAgIG9wdGltaXplZFRoZW4obmV4dFByb21pc2UudGhlbiwgbmV4dFByb21pc2UsIHJlc29sdmVFbGVtZW50LCByZXN1bHRDYXBhYmlsaXR5LnJlamVjdCk7XG4gICAgICAgIGluZGV4ICs9IDE7XG4gICAgICB9XG4gICAgICBpZiAoKC0tcmVtYWluaW5nLmNvdW50KSA9PT0gMCkge1xuICAgICAgICB2YXIgcmVzb2x2ZSA9IHJlc3VsdENhcGFiaWxpdHkucmVzb2x2ZTtcbiAgICAgICAgcmVzb2x2ZSh2YWx1ZXMpOyAvLyBjYWxsIHcvIHRoaXM9PT11bmRlZmluZWRcbiAgICAgIH1cbiAgICAgIHJldHVybiByZXN1bHRDYXBhYmlsaXR5LnByb21pc2U7XG4gICAgfTtcblxuICAgIHZhciBwZXJmb3JtUHJvbWlzZVJhY2UgPSBmdW5jdGlvbiAoaXRlcmF0b3JSZWNvcmQsIEMsIHJlc3VsdENhcGFiaWxpdHkpIHtcbiAgICAgIHZhciBpdCA9IGl0ZXJhdG9yUmVjb3JkLml0ZXJhdG9yLCBuZXh0LCBuZXh0VmFsdWUsIG5leHRQcm9taXNlO1xuICAgICAgd2hpbGUgKHRydWUpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBuZXh0ID0gRVMuSXRlcmF0b3JTdGVwKGl0KTtcbiAgICAgICAgICBpZiAobmV4dCA9PT0gZmFsc2UpIHtcbiAgICAgICAgICAgIC8vIE5PVEU6IElmIGl0ZXJhYmxlIGhhcyBubyBpdGVtcywgcmVzdWx0aW5nIHByb21pc2Ugd2lsbCBuZXZlclxuICAgICAgICAgICAgLy8gcmVzb2x2ZTsgc2VlOlxuICAgICAgICAgICAgLy8gaHR0cHM6Ly9naXRodWIuY29tL2RvbWVuaWMvcHJvbWlzZXMtdW53cmFwcGluZy9pc3N1ZXMvNzVcbiAgICAgICAgICAgIC8vIGh0dHBzOi8vYnVncy5lY21hc2NyaXB0Lm9yZy9zaG93X2J1Zy5jZ2k/aWQ9MjUxNVxuICAgICAgICAgICAgaXRlcmF0b3JSZWNvcmQuZG9uZSA9IHRydWU7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICB9XG4gICAgICAgICAgbmV4dFZhbHVlID0gbmV4dC52YWx1ZTtcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgIGl0ZXJhdG9yUmVjb3JkLmRvbmUgPSB0cnVlO1xuICAgICAgICAgIHRocm93IGU7XG4gICAgICAgIH1cbiAgICAgICAgbmV4dFByb21pc2UgPSBDLnJlc29sdmUobmV4dFZhbHVlKTtcbiAgICAgICAgb3B0aW1pemVkVGhlbihuZXh0UHJvbWlzZS50aGVuLCBuZXh0UHJvbWlzZSwgcmVzdWx0Q2FwYWJpbGl0eS5yZXNvbHZlLCByZXN1bHRDYXBhYmlsaXR5LnJlamVjdCk7XG4gICAgICB9XG4gICAgICByZXR1cm4gcmVzdWx0Q2FwYWJpbGl0eS5wcm9taXNlO1xuICAgIH07XG5cbiAgICBkZWZpbmVQcm9wZXJ0aWVzKFByb21pc2UsIHtcbiAgICAgIGFsbDogZnVuY3Rpb24gYWxsKGl0ZXJhYmxlKSB7XG4gICAgICAgIHZhciBDID0gdGhpcztcbiAgICAgICAgaWYgKCFFUy5UeXBlSXNPYmplY3QoQykpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdQcm9taXNlIGlzIG5vdCBvYmplY3QnKTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgY2FwYWJpbGl0eSA9IG5ldyBQcm9taXNlQ2FwYWJpbGl0eShDKTtcbiAgICAgICAgdmFyIGl0ZXJhdG9yLCBpdGVyYXRvclJlY29yZDtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBpdGVyYXRvciA9IEVTLkdldEl0ZXJhdG9yKGl0ZXJhYmxlKTtcbiAgICAgICAgICBpdGVyYXRvclJlY29yZCA9IHsgaXRlcmF0b3I6IGl0ZXJhdG9yLCBkb25lOiBmYWxzZSB9O1xuICAgICAgICAgIHJldHVybiBwZXJmb3JtUHJvbWlzZUFsbChpdGVyYXRvclJlY29yZCwgQywgY2FwYWJpbGl0eSk7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICB2YXIgZXhjZXB0aW9uID0gZTtcbiAgICAgICAgICBpZiAoaXRlcmF0b3JSZWNvcmQgJiYgIWl0ZXJhdG9yUmVjb3JkLmRvbmUpIHtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgIEVTLkl0ZXJhdG9yQ2xvc2UoaXRlcmF0b3IsIHRydWUpO1xuICAgICAgICAgICAgfSBjYXRjaCAoZWUpIHtcbiAgICAgICAgICAgICAgZXhjZXB0aW9uID0gZWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIHZhciByZWplY3QgPSBjYXBhYmlsaXR5LnJlamVjdDtcbiAgICAgICAgICByZWplY3QoZXhjZXB0aW9uKTtcbiAgICAgICAgICByZXR1cm4gY2FwYWJpbGl0eS5wcm9taXNlO1xuICAgICAgICB9XG4gICAgICB9LFxuXG4gICAgICByYWNlOiBmdW5jdGlvbiByYWNlKGl0ZXJhYmxlKSB7XG4gICAgICAgIHZhciBDID0gdGhpcztcbiAgICAgICAgaWYgKCFFUy5UeXBlSXNPYmplY3QoQykpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdQcm9taXNlIGlzIG5vdCBvYmplY3QnKTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgY2FwYWJpbGl0eSA9IG5ldyBQcm9taXNlQ2FwYWJpbGl0eShDKTtcbiAgICAgICAgdmFyIGl0ZXJhdG9yLCBpdGVyYXRvclJlY29yZDtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBpdGVyYXRvciA9IEVTLkdldEl0ZXJhdG9yKGl0ZXJhYmxlKTtcbiAgICAgICAgICBpdGVyYXRvclJlY29yZCA9IHsgaXRlcmF0b3I6IGl0ZXJhdG9yLCBkb25lOiBmYWxzZSB9O1xuICAgICAgICAgIHJldHVybiBwZXJmb3JtUHJvbWlzZVJhY2UoaXRlcmF0b3JSZWNvcmQsIEMsIGNhcGFiaWxpdHkpO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgdmFyIGV4Y2VwdGlvbiA9IGU7XG4gICAgICAgICAgaWYgKGl0ZXJhdG9yUmVjb3JkICYmICFpdGVyYXRvclJlY29yZC5kb25lKSB7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICBFUy5JdGVyYXRvckNsb3NlKGl0ZXJhdG9yLCB0cnVlKTtcbiAgICAgICAgICAgIH0gY2F0Y2ggKGVlKSB7XG4gICAgICAgICAgICAgIGV4Y2VwdGlvbiA9IGVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICB2YXIgcmVqZWN0ID0gY2FwYWJpbGl0eS5yZWplY3Q7XG4gICAgICAgICAgcmVqZWN0KGV4Y2VwdGlvbik7XG4gICAgICAgICAgcmV0dXJuIGNhcGFiaWxpdHkucHJvbWlzZTtcbiAgICAgICAgfVxuICAgICAgfSxcblxuICAgICAgcmVqZWN0OiBmdW5jdGlvbiByZWplY3QocmVhc29uKSB7XG4gICAgICAgIHZhciBDID0gdGhpcztcbiAgICAgICAgaWYgKCFFUy5UeXBlSXNPYmplY3QoQykpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdCYWQgcHJvbWlzZSBjb25zdHJ1Y3RvcicpO1xuICAgICAgICB9XG4gICAgICAgIHZhciBjYXBhYmlsaXR5ID0gbmV3IFByb21pc2VDYXBhYmlsaXR5KEMpO1xuICAgICAgICB2YXIgcmVqZWN0RnVuYyA9IGNhcGFiaWxpdHkucmVqZWN0O1xuICAgICAgICByZWplY3RGdW5jKHJlYXNvbik7IC8vIGNhbGwgd2l0aCB0aGlzPT09dW5kZWZpbmVkXG4gICAgICAgIHJldHVybiBjYXBhYmlsaXR5LnByb21pc2U7XG4gICAgICB9LFxuXG4gICAgICByZXNvbHZlOiBmdW5jdGlvbiByZXNvbHZlKHYpIHtcbiAgICAgICAgLy8gU2VlIGh0dHBzOi8vZXNkaXNjdXNzLm9yZy90b3BpYy9maXhpbmctcHJvbWlzZS1yZXNvbHZlIGZvciBzcGVjXG4gICAgICAgIHZhciBDID0gdGhpcztcbiAgICAgICAgaWYgKCFFUy5UeXBlSXNPYmplY3QoQykpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdCYWQgcHJvbWlzZSBjb25zdHJ1Y3RvcicpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChFUy5Jc1Byb21pc2UodikpIHtcbiAgICAgICAgICB2YXIgY29uc3RydWN0b3IgPSB2LmNvbnN0cnVjdG9yO1xuICAgICAgICAgIGlmIChjb25zdHJ1Y3RvciA9PT0gQykgeyByZXR1cm4gdjsgfVxuICAgICAgICB9XG4gICAgICAgIHZhciBjYXBhYmlsaXR5ID0gbmV3IFByb21pc2VDYXBhYmlsaXR5KEMpO1xuICAgICAgICB2YXIgcmVzb2x2ZUZ1bmMgPSBjYXBhYmlsaXR5LnJlc29sdmU7XG4gICAgICAgIHJlc29sdmVGdW5jKHYpOyAvLyBjYWxsIHdpdGggdGhpcz09PXVuZGVmaW5lZFxuICAgICAgICByZXR1cm4gY2FwYWJpbGl0eS5wcm9taXNlO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgZGVmaW5lUHJvcGVydGllcyhQcm9taXNlJHByb3RvdHlwZSwge1xuICAgICAgJ2NhdGNoJzogZnVuY3Rpb24gKG9uUmVqZWN0ZWQpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMudGhlbihudWxsLCBvblJlamVjdGVkKTtcbiAgICAgIH0sXG5cbiAgICAgIHRoZW46IGZ1bmN0aW9uIHRoZW4ob25GdWxmaWxsZWQsIG9uUmVqZWN0ZWQpIHtcbiAgICAgICAgdmFyIHByb21pc2UgPSB0aGlzO1xuICAgICAgICBpZiAoIUVTLklzUHJvbWlzZShwcm9taXNlKSkgeyB0aHJvdyBuZXcgVHlwZUVycm9yKCdub3QgYSBwcm9taXNlJyk7IH1cbiAgICAgICAgdmFyIEMgPSBFUy5TcGVjaWVzQ29uc3RydWN0b3IocHJvbWlzZSwgUHJvbWlzZSk7XG4gICAgICAgIHZhciByZXN1bHRDYXBhYmlsaXR5O1xuICAgICAgICB2YXIgcmV0dXJuVmFsdWVJc0lnbm9yZWQgPSBhcmd1bWVudHMubGVuZ3RoID4gMiAmJiBhcmd1bWVudHNbMl0gPT09IFBST01JU0VfRkFLRV9DQVBBQklMSVRZO1xuICAgICAgICBpZiAocmV0dXJuVmFsdWVJc0lnbm9yZWQgJiYgQyA9PT0gUHJvbWlzZSkge1xuICAgICAgICAgIHJlc3VsdENhcGFiaWxpdHkgPSBQUk9NSVNFX0ZBS0VfQ0FQQUJJTElUWTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXN1bHRDYXBhYmlsaXR5ID0gbmV3IFByb21pc2VDYXBhYmlsaXR5KEMpO1xuICAgICAgICB9XG4gICAgICAgIC8vIFBlcmZvcm1Qcm9taXNlVGhlbihwcm9taXNlLCBvbkZ1bGZpbGxlZCwgb25SZWplY3RlZCwgcmVzdWx0Q2FwYWJpbGl0eSlcbiAgICAgICAgLy8gTm90ZSB0aGF0IHdlJ3ZlIHNwbGl0IHRoZSAncmVhY3Rpb24nIG9iamVjdCBpbnRvIGl0cyB0d29cbiAgICAgICAgLy8gY29tcG9uZW50cywgXCJjYXBhYmlsaXRpZXNcIiBhbmQgXCJoYW5kbGVyXCJcbiAgICAgICAgLy8gXCJjYXBhYmlsaXRpZXNcIiBpcyBhbHdheXMgZXF1YWwgdG8gYHJlc3VsdENhcGFiaWxpdHlgXG4gICAgICAgIHZhciBmdWxmaWxsUmVhY3Rpb25IYW5kbGVyID0gRVMuSXNDYWxsYWJsZShvbkZ1bGZpbGxlZCkgPyBvbkZ1bGZpbGxlZCA6IFBST01JU0VfSURFTlRJVFk7XG4gICAgICAgIHZhciByZWplY3RSZWFjdGlvbkhhbmRsZXIgPSBFUy5Jc0NhbGxhYmxlKG9uUmVqZWN0ZWQpID8gb25SZWplY3RlZCA6IFBST01JU0VfVEhST1dFUjtcbiAgICAgICAgdmFyIF9wcm9taXNlID0gcHJvbWlzZS5fcHJvbWlzZTtcbiAgICAgICAgdmFyIHZhbHVlO1xuICAgICAgICBpZiAoX3Byb21pc2Uuc3RhdGUgPT09IFBST01JU0VfUEVORElORykge1xuICAgICAgICAgIGlmIChfcHJvbWlzZS5yZWFjdGlvbkxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgX3Byb21pc2UuZnVsZmlsbFJlYWN0aW9uSGFuZGxlcjAgPSBmdWxmaWxsUmVhY3Rpb25IYW5kbGVyO1xuICAgICAgICAgICAgX3Byb21pc2UucmVqZWN0UmVhY3Rpb25IYW5kbGVyMCA9IHJlamVjdFJlYWN0aW9uSGFuZGxlcjtcbiAgICAgICAgICAgIF9wcm9taXNlLnJlYWN0aW9uQ2FwYWJpbGl0eTAgPSByZXN1bHRDYXBhYmlsaXR5O1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB2YXIgaWR4ID0gMyAqIChfcHJvbWlzZS5yZWFjdGlvbkxlbmd0aCAtIDEpO1xuICAgICAgICAgICAgX3Byb21pc2VbaWR4ICsgUFJPTUlTRV9GVUxGSUxMX09GRlNFVF0gPSBmdWxmaWxsUmVhY3Rpb25IYW5kbGVyO1xuICAgICAgICAgICAgX3Byb21pc2VbaWR4ICsgUFJPTUlTRV9SRUpFQ1RfT0ZGU0VUXSA9IHJlamVjdFJlYWN0aW9uSGFuZGxlcjtcbiAgICAgICAgICAgIF9wcm9taXNlW2lkeCArIFBST01JU0VfQ0FQQUJJTElUWV9PRkZTRVRdID0gcmVzdWx0Q2FwYWJpbGl0eTtcbiAgICAgICAgICB9XG4gICAgICAgICAgX3Byb21pc2UucmVhY3Rpb25MZW5ndGggKz0gMTtcbiAgICAgICAgfSBlbHNlIGlmIChfcHJvbWlzZS5zdGF0ZSA9PT0gUFJPTUlTRV9GVUxGSUxMRUQpIHtcbiAgICAgICAgICB2YWx1ZSA9IF9wcm9taXNlLnJlc3VsdDtcbiAgICAgICAgICBlbnF1ZXVlUHJvbWlzZVJlYWN0aW9uSm9iKFxuICAgICAgICAgICAgZnVsZmlsbFJlYWN0aW9uSGFuZGxlciwgcmVzdWx0Q2FwYWJpbGl0eSwgdmFsdWVcbiAgICAgICAgICApO1xuICAgICAgICB9IGVsc2UgaWYgKF9wcm9taXNlLnN0YXRlID09PSBQUk9NSVNFX1JFSkVDVEVEKSB7XG4gICAgICAgICAgdmFsdWUgPSBfcHJvbWlzZS5yZXN1bHQ7XG4gICAgICAgICAgZW5xdWV1ZVByb21pc2VSZWFjdGlvbkpvYihcbiAgICAgICAgICAgIHJlamVjdFJlYWN0aW9uSGFuZGxlciwgcmVzdWx0Q2FwYWJpbGl0eSwgdmFsdWVcbiAgICAgICAgICApO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ3VuZXhwZWN0ZWQgUHJvbWlzZSBzdGF0ZScpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXN1bHRDYXBhYmlsaXR5LnByb21pc2U7XG4gICAgICB9XG4gICAgfSk7XG4gICAgLy8gVGhpcyBoZWxwcyB0aGUgb3B0aW1pemVyIGJ5IGVuc3VyaW5nIHRoYXQgbWV0aG9kcyB3aGljaCB0YWtlXG4gICAgLy8gY2FwYWJpbGl0aWVzIGFyZW4ndCBwb2x5bW9ycGhpYy5cbiAgICBQUk9NSVNFX0ZBS0VfQ0FQQUJJTElUWSA9IG5ldyBQcm9taXNlQ2FwYWJpbGl0eShQcm9taXNlKTtcbiAgICBQcm9taXNlJHByb3RvdHlwZSR0aGVuID0gUHJvbWlzZSRwcm90b3R5cGUudGhlbjtcblxuICAgIHJldHVybiBQcm9taXNlO1xuICB9KCkpO1xuXG4gIC8vIENocm9tZSdzIG5hdGl2ZSBQcm9taXNlIGhhcyBleHRyYSBtZXRob2RzIHRoYXQgaXQgc2hvdWxkbid0IGhhdmUuIExldCdzIHJlbW92ZSB0aGVtLlxuICBpZiAoZ2xvYmFscy5Qcm9taXNlKSB7XG4gICAgZGVsZXRlIGdsb2JhbHMuUHJvbWlzZS5hY2NlcHQ7XG4gICAgZGVsZXRlIGdsb2JhbHMuUHJvbWlzZS5kZWZlcjtcbiAgICBkZWxldGUgZ2xvYmFscy5Qcm9taXNlLnByb3RvdHlwZS5jaGFpbjtcbiAgfVxuXG4gIGlmICh0eXBlb2YgUHJvbWlzZVNoaW0gPT09ICdmdW5jdGlvbicpIHtcbiAgICAvLyBleHBvcnQgdGhlIFByb21pc2UgY29uc3RydWN0b3IuXG4gICAgZGVmaW5lUHJvcGVydGllcyhnbG9iYWxzLCB7IFByb21pc2U6IFByb21pc2VTaGltIH0pO1xuICAgIC8vIEluIENocm9tZSAzMyAoYW5kIHRoZXJlYWJvdXRzKSBQcm9taXNlIGlzIGRlZmluZWQsIGJ1dCB0aGVcbiAgICAvLyBpbXBsZW1lbnRhdGlvbiBpcyBidWdneSBpbiBhIG51bWJlciBvZiB3YXlzLiAgTGV0J3MgY2hlY2sgc3ViY2xhc3NpbmdcbiAgICAvLyBzdXBwb3J0IHRvIHNlZSBpZiB3ZSBoYXZlIGEgYnVnZ3kgaW1wbGVtZW50YXRpb24uXG4gICAgdmFyIHByb21pc2VTdXBwb3J0c1N1YmNsYXNzaW5nID0gc3VwcG9ydHNTdWJjbGFzc2luZyhnbG9iYWxzLlByb21pc2UsIGZ1bmN0aW9uIChTKSB7XG4gICAgICByZXR1cm4gUy5yZXNvbHZlKDQyKS50aGVuKGZ1bmN0aW9uICgpIHt9KSBpbnN0YW5jZW9mIFM7XG4gICAgfSk7XG4gICAgdmFyIHByb21pc2VJZ25vcmVzTm9uRnVuY3Rpb25UaGVuQ2FsbGJhY2tzID0gIXRocm93c0Vycm9yKGZ1bmN0aW9uICgpIHsgZ2xvYmFscy5Qcm9taXNlLnJlamVjdCg0MikudGhlbihudWxsLCA1KS50aGVuKG51bGwsIG5vb3ApOyB9KTtcbiAgICB2YXIgcHJvbWlzZVJlcXVpcmVzT2JqZWN0Q29udGV4dCA9IHRocm93c0Vycm9yKGZ1bmN0aW9uICgpIHsgZ2xvYmFscy5Qcm9taXNlLmNhbGwoMywgbm9vcCk7IH0pO1xuICAgIC8vIFByb21pc2UucmVzb2x2ZSgpIHdhcyBlcnJhdGEnZWQgbGF0ZSBpbiB0aGUgRVM2IHByb2Nlc3MuXG4gICAgLy8gU2VlOiBodHRwczovL2J1Z3ppbGxhLm1vemlsbGEub3JnL3Nob3dfYnVnLmNnaT9pZD0xMTcwNzQyXG4gICAgLy8gICAgICBodHRwczovL2NvZGUuZ29vZ2xlLmNvbS9wL3Y4L2lzc3Vlcy9kZXRhaWw/aWQ9NDE2MVxuICAgIC8vIEl0IHNlcnZlcyBhcyBhIHByb3h5IGZvciBhIG51bWJlciBvZiBvdGhlciBidWdzIGluIGVhcmx5IFByb21pc2VcbiAgICAvLyBpbXBsZW1lbnRhdGlvbnMuXG4gICAgdmFyIHByb21pc2VSZXNvbHZlQnJva2VuID0gKGZ1bmN0aW9uIChQcm9taXNlKSB7XG4gICAgICB2YXIgcCA9IFByb21pc2UucmVzb2x2ZSg1KTtcbiAgICAgIHAuY29uc3RydWN0b3IgPSB7fTtcbiAgICAgIHZhciBwMiA9IFByb21pc2UucmVzb2x2ZShwKTtcbiAgICAgIHRyeSB7XG4gICAgICAgIHAyLnRoZW4obnVsbCwgbm9vcCkudGhlbihudWxsLCBub29wKTsgLy8gYXZvaWQgXCJ1bmNhdWdodCByZWplY3Rpb25cIiB3YXJuaW5ncyBpbiBjb25zb2xlXG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIHJldHVybiB0cnVlOyAvLyB2OCBuYXRpdmUgUHJvbWlzZXMgYnJlYWsgaGVyZSBodHRwczovL2NvZGUuZ29vZ2xlLmNvbS9wL2Nocm9taXVtL2lzc3Vlcy9kZXRhaWw/aWQ9NTc1MzE0XG4gICAgICB9XG4gICAgICByZXR1cm4gcCA9PT0gcDI7IC8vIFRoaXMgKnNob3VsZCogYmUgZmFsc2UhXG4gICAgfShnbG9iYWxzLlByb21pc2UpKTtcblxuICAgIC8vIENocm9tZSA0NiAocHJvYmFibHkgb2xkZXIgdG9vKSBkb2VzIG5vdCByZXRyaWV2ZSBhIHRoZW5hYmxlJ3MgLnRoZW4gc3luY2hyb25vdXNseVxuICAgIHZhciBnZXRzVGhlblN5bmNocm9ub3VzbHkgPSBzdXBwb3J0c0Rlc2NyaXB0b3JzICYmIChmdW5jdGlvbiAoKSB7XG4gICAgICB2YXIgY291bnQgPSAwO1xuICAgICAgdmFyIHRoZW5hYmxlID0gT2JqZWN0LmRlZmluZVByb3BlcnR5KHt9LCAndGhlbicsIHsgZ2V0OiBmdW5jdGlvbiAoKSB7IGNvdW50ICs9IDE7IH0gfSk7XG4gICAgICBQcm9taXNlLnJlc29sdmUodGhlbmFibGUpO1xuICAgICAgcmV0dXJuIGNvdW50ID09PSAxO1xuICAgIH0oKSk7XG5cbiAgICB2YXIgQmFkUmVzb2x2ZXJQcm9taXNlID0gZnVuY3Rpb24gQmFkUmVzb2x2ZXJQcm9taXNlKGV4ZWN1dG9yKSB7XG4gICAgICB2YXIgcCA9IG5ldyBQcm9taXNlKGV4ZWN1dG9yKTtcbiAgICAgIGV4ZWN1dG9yKDMsIGZ1bmN0aW9uICgpIHt9KTtcbiAgICAgIHRoaXMudGhlbiA9IHAudGhlbjtcbiAgICAgIHRoaXMuY29uc3RydWN0b3IgPSBCYWRSZXNvbHZlclByb21pc2U7XG4gICAgfTtcbiAgICBCYWRSZXNvbHZlclByb21pc2UucHJvdG90eXBlID0gUHJvbWlzZS5wcm90b3R5cGU7XG4gICAgQmFkUmVzb2x2ZXJQcm9taXNlLmFsbCA9IFByb21pc2UuYWxsO1xuICAgIC8vIENocm9tZSBDYW5hcnkgNDkgKHByb2JhYmx5IG9sZGVyIHRvbykgaGFzIHNvbWUgaW1wbGVtZW50YXRpb24gYnVnc1xuICAgIHZhciBoYXNCYWRSZXNvbHZlclByb21pc2UgPSB2YWx1ZU9yRmFsc2VJZlRocm93cyhmdW5jdGlvbiAoKSB7XG4gICAgICByZXR1cm4gISFCYWRSZXNvbHZlclByb21pc2UuYWxsKFsxLCAyXSk7XG4gICAgfSk7XG5cbiAgICBpZiAoIXByb21pc2VTdXBwb3J0c1N1YmNsYXNzaW5nIHx8ICFwcm9taXNlSWdub3Jlc05vbkZ1bmN0aW9uVGhlbkNhbGxiYWNrcyB8fFxuICAgICAgICAhcHJvbWlzZVJlcXVpcmVzT2JqZWN0Q29udGV4dCB8fCBwcm9taXNlUmVzb2x2ZUJyb2tlbiB8fFxuICAgICAgICAhZ2V0c1RoZW5TeW5jaHJvbm91c2x5IHx8IGhhc0JhZFJlc29sdmVyUHJvbWlzZSkge1xuICAgICAgLyogZ2xvYmFscyBQcm9taXNlOiB0cnVlICovXG4gICAgICAvKiBlc2xpbnQtZGlzYWJsZSBuby11bmRlZiAqL1xuICAgICAgLyoganNoaW50IC1XMDIwICovXG4gICAgICBQcm9taXNlID0gUHJvbWlzZVNoaW07XG4gICAgICAvKiBqc2hpbnQgK1cwMjAgKi9cbiAgICAgIC8qIGVzbGludC1lbmFibGUgbm8tdW5kZWYgKi9cbiAgICAgIC8qIGdsb2JhbHMgUHJvbWlzZTogZmFsc2UgKi9cbiAgICAgIG92ZXJyaWRlTmF0aXZlKGdsb2JhbHMsICdQcm9taXNlJywgUHJvbWlzZVNoaW0pO1xuICAgIH1cbiAgICBpZiAoUHJvbWlzZS5hbGwubGVuZ3RoICE9PSAxKSB7XG4gICAgICB2YXIgb3JpZ0FsbCA9IFByb21pc2UuYWxsO1xuICAgICAgb3ZlcnJpZGVOYXRpdmUoUHJvbWlzZSwgJ2FsbCcsIGZ1bmN0aW9uIGFsbChpdGVyYWJsZSkge1xuICAgICAgICByZXR1cm4gRVMuQ2FsbChvcmlnQWxsLCB0aGlzLCBhcmd1bWVudHMpO1xuICAgICAgfSk7XG4gICAgfVxuICAgIGlmIChQcm9taXNlLnJhY2UubGVuZ3RoICE9PSAxKSB7XG4gICAgICB2YXIgb3JpZ1JhY2UgPSBQcm9taXNlLnJhY2U7XG4gICAgICBvdmVycmlkZU5hdGl2ZShQcm9taXNlLCAncmFjZScsIGZ1bmN0aW9uIHJhY2UoaXRlcmFibGUpIHtcbiAgICAgICAgcmV0dXJuIEVTLkNhbGwob3JpZ1JhY2UsIHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICB9KTtcbiAgICB9XG4gICAgaWYgKFByb21pc2UucmVzb2x2ZS5sZW5ndGggIT09IDEpIHtcbiAgICAgIHZhciBvcmlnUmVzb2x2ZSA9IFByb21pc2UucmVzb2x2ZTtcbiAgICAgIG92ZXJyaWRlTmF0aXZlKFByb21pc2UsICdyZXNvbHZlJywgZnVuY3Rpb24gcmVzb2x2ZSh4KSB7XG4gICAgICAgIHJldHVybiBFUy5DYWxsKG9yaWdSZXNvbHZlLCB0aGlzLCBhcmd1bWVudHMpO1xuICAgICAgfSk7XG4gICAgfVxuICAgIGlmIChQcm9taXNlLnJlamVjdC5sZW5ndGggIT09IDEpIHtcbiAgICAgIHZhciBvcmlnUmVqZWN0ID0gUHJvbWlzZS5yZWplY3Q7XG4gICAgICBvdmVycmlkZU5hdGl2ZShQcm9taXNlLCAncmVqZWN0JywgZnVuY3Rpb24gcmVqZWN0KHIpIHtcbiAgICAgICAgcmV0dXJuIEVTLkNhbGwob3JpZ1JlamVjdCwgdGhpcywgYXJndW1lbnRzKTtcbiAgICAgIH0pO1xuICAgIH1cbiAgICBlbnN1cmVFbnVtZXJhYmxlKFByb21pc2UsICdhbGwnKTtcbiAgICBlbnN1cmVFbnVtZXJhYmxlKFByb21pc2UsICdyYWNlJyk7XG4gICAgZW5zdXJlRW51bWVyYWJsZShQcm9taXNlLCAncmVzb2x2ZScpO1xuICAgIGVuc3VyZUVudW1lcmFibGUoUHJvbWlzZSwgJ3JlamVjdCcpO1xuICAgIGFkZERlZmF1bHRTcGVjaWVzKFByb21pc2UpO1xuICB9XG5cbiAgLy8gTWFwIGFuZCBTZXQgcmVxdWlyZSBhIHRydWUgRVM1IGVudmlyb25tZW50XG4gIC8vIFRoZWlyIGZhc3QgcGF0aCBhbHNvIHJlcXVpcmVzIHRoYXQgdGhlIGVudmlyb25tZW50IHByZXNlcnZlXG4gIC8vIHByb3BlcnR5IGluc2VydGlvbiBvcmRlciwgd2hpY2ggaXMgbm90IGd1YXJhbnRlZWQgYnkgdGhlIHNwZWMuXG4gIHZhciB0ZXN0T3JkZXIgPSBmdW5jdGlvbiAoYSkge1xuICAgIHZhciBiID0ga2V5cyhfcmVkdWNlKGEsIGZ1bmN0aW9uIChvLCBrKSB7XG4gICAgICBvW2tdID0gdHJ1ZTtcbiAgICAgIHJldHVybiBvO1xuICAgIH0sIHt9KSk7XG4gICAgcmV0dXJuIGEuam9pbignOicpID09PSBiLmpvaW4oJzonKTtcbiAgfTtcbiAgdmFyIHByZXNlcnZlc0luc2VydGlvbk9yZGVyID0gdGVzdE9yZGVyKFsneicsICdhJywgJ2JiJ10pO1xuICAvLyBzb21lIGVuZ2luZXMgKGVnLCBDaHJvbWUpIG9ubHkgcHJlc2VydmUgaW5zZXJ0aW9uIG9yZGVyIGZvciBzdHJpbmcga2V5c1xuICB2YXIgcHJlc2VydmVzTnVtZXJpY0luc2VydGlvbk9yZGVyID0gdGVzdE9yZGVyKFsneicsIDEsICdhJywgJzMnLCAyXSk7XG5cbiAgaWYgKHN1cHBvcnRzRGVzY3JpcHRvcnMpIHtcblxuICAgIHZhciBmYXN0a2V5ID0gZnVuY3Rpb24gZmFzdGtleShrZXkpIHtcbiAgICAgIGlmICghcHJlc2VydmVzSW5zZXJ0aW9uT3JkZXIpIHtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9XG4gICAgICBpZiAodHlwZW9mIGtleSA9PT0gJ3VuZGVmaW5lZCcgfHwga2V5ID09PSBudWxsKSB7XG4gICAgICAgIHJldHVybiAnXicgKyBFUy5Ub1N0cmluZyhrZXkpO1xuICAgICAgfSBlbHNlIGlmICh0eXBlb2Yga2V5ID09PSAnc3RyaW5nJykge1xuICAgICAgICByZXR1cm4gJyQnICsga2V5O1xuICAgICAgfSBlbHNlIGlmICh0eXBlb2Yga2V5ID09PSAnbnVtYmVyJykge1xuICAgICAgICAvLyBub3RlIHRoYXQgLTAgd2lsbCBnZXQgY29lcmNlZCB0byBcIjBcIiB3aGVuIHVzZWQgYXMgYSBwcm9wZXJ0eSBrZXlcbiAgICAgICAgaWYgKCFwcmVzZXJ2ZXNOdW1lcmljSW5zZXJ0aW9uT3JkZXIpIHtcbiAgICAgICAgICByZXR1cm4gJ24nICsga2V5O1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBrZXk7XG4gICAgICB9IGVsc2UgaWYgKHR5cGVvZiBrZXkgPT09ICdib29sZWFuJykge1xuICAgICAgICByZXR1cm4gJ2InICsga2V5O1xuICAgICAgfVxuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfTtcblxuICAgIHZhciBlbXB0eU9iamVjdCA9IGZ1bmN0aW9uIGVtcHR5T2JqZWN0KCkge1xuICAgICAgLy8gYWNjb21vZGF0ZSBzb21lIG9sZGVyIG5vdC1xdWl0ZS1FUzUgYnJvd3NlcnNcbiAgICAgIHJldHVybiBPYmplY3QuY3JlYXRlID8gT2JqZWN0LmNyZWF0ZShudWxsKSA6IHt9O1xuICAgIH07XG5cbiAgICB2YXIgYWRkSXRlcmFibGVUb01hcCA9IGZ1bmN0aW9uIGFkZEl0ZXJhYmxlVG9NYXAoTWFwQ29uc3RydWN0b3IsIG1hcCwgaXRlcmFibGUpIHtcbiAgICAgIGlmIChpc0FycmF5KGl0ZXJhYmxlKSB8fCBUeXBlLnN0cmluZyhpdGVyYWJsZSkpIHtcbiAgICAgICAgX2ZvckVhY2goaXRlcmFibGUsIGZ1bmN0aW9uIChlbnRyeSkge1xuICAgICAgICAgIGlmICghRVMuVHlwZUlzT2JqZWN0KGVudHJ5KSkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignSXRlcmF0b3IgdmFsdWUgJyArIGVudHJ5ICsgJyBpcyBub3QgYW4gZW50cnkgb2JqZWN0Jyk7XG4gICAgICAgICAgfVxuICAgICAgICAgIG1hcC5zZXQoZW50cnlbMF0sIGVudHJ5WzFdKTtcbiAgICAgICAgfSk7XG4gICAgICB9IGVsc2UgaWYgKGl0ZXJhYmxlIGluc3RhbmNlb2YgTWFwQ29uc3RydWN0b3IpIHtcbiAgICAgICAgX2NhbGwoTWFwQ29uc3RydWN0b3IucHJvdG90eXBlLmZvckVhY2gsIGl0ZXJhYmxlLCBmdW5jdGlvbiAodmFsdWUsIGtleSkge1xuICAgICAgICAgIG1hcC5zZXQoa2V5LCB2YWx1ZSk7XG4gICAgICAgIH0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdmFyIGl0ZXIsIGFkZGVyO1xuICAgICAgICBpZiAoaXRlcmFibGUgIT09IG51bGwgJiYgdHlwZW9mIGl0ZXJhYmxlICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgIGFkZGVyID0gbWFwLnNldDtcbiAgICAgICAgICBpZiAoIUVTLklzQ2FsbGFibGUoYWRkZXIpKSB7IHRocm93IG5ldyBUeXBlRXJyb3IoJ2JhZCBtYXAnKTsgfVxuICAgICAgICAgIGl0ZXIgPSBFUy5HZXRJdGVyYXRvcihpdGVyYWJsZSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHR5cGVvZiBpdGVyICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgIHdoaWxlICh0cnVlKSB7XG4gICAgICAgICAgICB2YXIgbmV4dCA9IEVTLkl0ZXJhdG9yU3RlcChpdGVyKTtcbiAgICAgICAgICAgIGlmIChuZXh0ID09PSBmYWxzZSkgeyBicmVhazsgfVxuICAgICAgICAgICAgdmFyIG5leHRJdGVtID0gbmV4dC52YWx1ZTtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgIGlmICghRVMuVHlwZUlzT2JqZWN0KG5leHRJdGVtKSkge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0l0ZXJhdG9yIHZhbHVlICcgKyBuZXh0SXRlbSArICcgaXMgbm90IGFuIGVudHJ5IG9iamVjdCcpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIF9jYWxsKGFkZGVyLCBtYXAsIG5leHRJdGVtWzBdLCBuZXh0SXRlbVsxXSk7XG4gICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgIEVTLkl0ZXJhdG9yQ2xvc2UoaXRlciwgdHJ1ZSk7XG4gICAgICAgICAgICAgIHRocm93IGU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfTtcbiAgICB2YXIgYWRkSXRlcmFibGVUb1NldCA9IGZ1bmN0aW9uIGFkZEl0ZXJhYmxlVG9TZXQoU2V0Q29uc3RydWN0b3IsIHNldCwgaXRlcmFibGUpIHtcbiAgICAgIGlmIChpc0FycmF5KGl0ZXJhYmxlKSB8fCBUeXBlLnN0cmluZyhpdGVyYWJsZSkpIHtcbiAgICAgICAgX2ZvckVhY2goaXRlcmFibGUsIGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICAgIHNldC5hZGQodmFsdWUpO1xuICAgICAgICB9KTtcbiAgICAgIH0gZWxzZSBpZiAoaXRlcmFibGUgaW5zdGFuY2VvZiBTZXRDb25zdHJ1Y3Rvcikge1xuICAgICAgICBfY2FsbChTZXRDb25zdHJ1Y3Rvci5wcm90b3R5cGUuZm9yRWFjaCwgaXRlcmFibGUsIGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICAgIHNldC5hZGQodmFsdWUpO1xuICAgICAgICB9KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHZhciBpdGVyLCBhZGRlcjtcbiAgICAgICAgaWYgKGl0ZXJhYmxlICE9PSBudWxsICYmIHR5cGVvZiBpdGVyYWJsZSAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICBhZGRlciA9IHNldC5hZGQ7XG4gICAgICAgICAgaWYgKCFFUy5Jc0NhbGxhYmxlKGFkZGVyKSkgeyB0aHJvdyBuZXcgVHlwZUVycm9yKCdiYWQgc2V0Jyk7IH1cbiAgICAgICAgICBpdGVyID0gRVMuR2V0SXRlcmF0b3IoaXRlcmFibGUpO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0eXBlb2YgaXRlciAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICB3aGlsZSAodHJ1ZSkge1xuICAgICAgICAgICAgdmFyIG5leHQgPSBFUy5JdGVyYXRvclN0ZXAoaXRlcik7XG4gICAgICAgICAgICBpZiAobmV4dCA9PT0gZmFsc2UpIHsgYnJlYWs7IH1cbiAgICAgICAgICAgIHZhciBuZXh0VmFsdWUgPSBuZXh0LnZhbHVlO1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgX2NhbGwoYWRkZXIsIHNldCwgbmV4dFZhbHVlKTtcbiAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgRVMuSXRlcmF0b3JDbG9zZShpdGVyLCB0cnVlKTtcbiAgICAgICAgICAgICAgdGhyb3cgZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9O1xuXG4gICAgdmFyIGNvbGxlY3Rpb25TaGltcyA9IHtcbiAgICAgIE1hcDogKGZ1bmN0aW9uICgpIHtcblxuICAgICAgICB2YXIgZW1wdHkgPSB7fTtcblxuICAgICAgICB2YXIgTWFwRW50cnkgPSBmdW5jdGlvbiBNYXBFbnRyeShrZXksIHZhbHVlKSB7XG4gICAgICAgICAgdGhpcy5rZXkgPSBrZXk7XG4gICAgICAgICAgdGhpcy52YWx1ZSA9IHZhbHVlO1xuICAgICAgICAgIHRoaXMubmV4dCA9IG51bGw7XG4gICAgICAgICAgdGhpcy5wcmV2ID0gbnVsbDtcbiAgICAgICAgfTtcblxuICAgICAgICBNYXBFbnRyeS5wcm90b3R5cGUuaXNSZW1vdmVkID0gZnVuY3Rpb24gaXNSZW1vdmVkKCkge1xuICAgICAgICAgIHJldHVybiB0aGlzLmtleSA9PT0gZW1wdHk7XG4gICAgICAgIH07XG5cbiAgICAgICAgdmFyIGlzTWFwID0gZnVuY3Rpb24gaXNNYXAobWFwKSB7XG4gICAgICAgICAgcmV0dXJuICEhbWFwLl9lczZtYXA7XG4gICAgICAgIH07XG5cbiAgICAgICAgdmFyIHJlcXVpcmVNYXBTbG90ID0gZnVuY3Rpb24gcmVxdWlyZU1hcFNsb3QobWFwLCBtZXRob2QpIHtcbiAgICAgICAgICBpZiAoIUVTLlR5cGVJc09iamVjdChtYXApIHx8ICFpc01hcChtYXApKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdNZXRob2QgTWFwLnByb3RvdHlwZS4nICsgbWV0aG9kICsgJyBjYWxsZWQgb24gaW5jb21wYXRpYmxlIHJlY2VpdmVyICcgKyBFUy5Ub1N0cmluZyhtYXApKTtcbiAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgdmFyIE1hcEl0ZXJhdG9yID0gZnVuY3Rpb24gTWFwSXRlcmF0b3IobWFwLCBraW5kKSB7XG4gICAgICAgICAgcmVxdWlyZU1hcFNsb3QobWFwLCAnW1tNYXBJdGVyYXRvcl1dJyk7XG4gICAgICAgICAgdGhpcy5oZWFkID0gbWFwLl9oZWFkO1xuICAgICAgICAgIHRoaXMuaSA9IHRoaXMuaGVhZDtcbiAgICAgICAgICB0aGlzLmtpbmQgPSBraW5kO1xuICAgICAgICB9O1xuXG4gICAgICAgIE1hcEl0ZXJhdG9yLnByb3RvdHlwZSA9IHtcbiAgICAgICAgICBuZXh0OiBmdW5jdGlvbiBuZXh0KCkge1xuICAgICAgICAgICAgdmFyIGkgPSB0aGlzLmksIGtpbmQgPSB0aGlzLmtpbmQsIGhlYWQgPSB0aGlzLmhlYWQsIHJlc3VsdDtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgdGhpcy5pID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICByZXR1cm4geyB2YWx1ZTogdm9pZCAwLCBkb25lOiB0cnVlIH07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB3aGlsZSAoaS5pc1JlbW92ZWQoKSAmJiBpICE9PSBoZWFkKSB7XG4gICAgICAgICAgICAgIC8vIGJhY2sgdXAgb2ZmIG9mIHJlbW92ZWQgZW50cmllc1xuICAgICAgICAgICAgICBpID0gaS5wcmV2O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gYWR2YW5jZSB0byBuZXh0IHVucmV0dXJuZWQgZWxlbWVudC5cbiAgICAgICAgICAgIHdoaWxlIChpLm5leHQgIT09IGhlYWQpIHtcbiAgICAgICAgICAgICAgaSA9IGkubmV4dDtcbiAgICAgICAgICAgICAgaWYgKCFpLmlzUmVtb3ZlZCgpKSB7XG4gICAgICAgICAgICAgICAgaWYgKGtpbmQgPT09ICdrZXknKSB7XG4gICAgICAgICAgICAgICAgICByZXN1bHQgPSBpLmtleTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGtpbmQgPT09ICd2YWx1ZScpIHtcbiAgICAgICAgICAgICAgICAgIHJlc3VsdCA9IGkudmFsdWU7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgIHJlc3VsdCA9IFtpLmtleSwgaS52YWx1ZV07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHRoaXMuaSA9IGk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgdmFsdWU6IHJlc3VsdCwgZG9uZTogZmFsc2UgfTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gb25jZSB0aGUgaXRlcmF0b3IgaXMgZG9uZSwgaXQgaXMgZG9uZSBmb3JldmVyLlxuICAgICAgICAgICAgdGhpcy5pID0gdm9pZCAwO1xuICAgICAgICAgICAgcmV0dXJuIHsgdmFsdWU6IHZvaWQgMCwgZG9uZTogdHJ1ZSB9O1xuICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgICAgYWRkSXRlcmF0b3IoTWFwSXRlcmF0b3IucHJvdG90eXBlKTtcblxuICAgICAgICB2YXIgTWFwJHByb3RvdHlwZTtcbiAgICAgICAgdmFyIE1hcFNoaW0gPSBmdW5jdGlvbiBNYXAoKSB7XG4gICAgICAgICAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIE1hcCkpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0NvbnN0cnVjdG9yIE1hcCByZXF1aXJlcyBcIm5ld1wiJyk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmICh0aGlzICYmIHRoaXMuX2VzNm1hcCkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignQmFkIGNvbnN0cnVjdGlvbicpO1xuICAgICAgICAgIH1cbiAgICAgICAgICB2YXIgbWFwID0gZW11bGF0ZUVTNmNvbnN0cnVjdCh0aGlzLCBNYXAsIE1hcCRwcm90b3R5cGUsIHtcbiAgICAgICAgICAgIF9lczZtYXA6IHRydWUsXG4gICAgICAgICAgICBfaGVhZDogbnVsbCxcbiAgICAgICAgICAgIF9zdG9yYWdlOiBlbXB0eU9iamVjdCgpLFxuICAgICAgICAgICAgX3NpemU6IDBcbiAgICAgICAgICB9KTtcblxuICAgICAgICAgIHZhciBoZWFkID0gbmV3IE1hcEVudHJ5KG51bGwsIG51bGwpO1xuICAgICAgICAgIC8vIGNpcmN1bGFyIGRvdWJseS1saW5rZWQgbGlzdC5cbiAgICAgICAgICBoZWFkLm5leHQgPSBoZWFkLnByZXYgPSBoZWFkO1xuICAgICAgICAgIG1hcC5faGVhZCA9IGhlYWQ7XG5cbiAgICAgICAgICAvLyBPcHRpb25hbGx5IGluaXRpYWxpemUgbWFwIGZyb20gaXRlcmFibGVcbiAgICAgICAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGFkZEl0ZXJhYmxlVG9NYXAoTWFwLCBtYXAsIGFyZ3VtZW50c1swXSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiBtYXA7XG4gICAgICAgIH07XG4gICAgICAgIE1hcCRwcm90b3R5cGUgPSBNYXBTaGltLnByb3RvdHlwZTtcblxuICAgICAgICBWYWx1ZS5nZXR0ZXIoTWFwJHByb3RvdHlwZSwgJ3NpemUnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgaWYgKHR5cGVvZiB0aGlzLl9zaXplID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignc2l6ZSBtZXRob2QgY2FsbGVkIG9uIGluY29tcGF0aWJsZSBNYXAnKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIHRoaXMuX3NpemU7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGRlZmluZVByb3BlcnRpZXMoTWFwJHByb3RvdHlwZSwge1xuICAgICAgICAgIGdldDogZnVuY3Rpb24gZ2V0KGtleSkge1xuICAgICAgICAgICAgcmVxdWlyZU1hcFNsb3QodGhpcywgJ2dldCcpO1xuICAgICAgICAgICAgdmFyIGZrZXkgPSBmYXN0a2V5KGtleSk7XG4gICAgICAgICAgICBpZiAoZmtleSAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICAvLyBmYXN0IE8oMSkgcGF0aFxuICAgICAgICAgICAgICB2YXIgZW50cnkgPSB0aGlzLl9zdG9yYWdlW2ZrZXldO1xuICAgICAgICAgICAgICBpZiAoZW50cnkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZW50cnkudmFsdWU7XG4gICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2YXIgaGVhZCA9IHRoaXMuX2hlYWQsIGkgPSBoZWFkO1xuICAgICAgICAgICAgd2hpbGUgKChpID0gaS5uZXh0KSAhPT0gaGVhZCkge1xuICAgICAgICAgICAgICBpZiAoRVMuU2FtZVZhbHVlWmVybyhpLmtleSwga2V5KSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBpLnZhbHVlO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSxcblxuICAgICAgICAgIGhhczogZnVuY3Rpb24gaGFzKGtleSkge1xuICAgICAgICAgICAgcmVxdWlyZU1hcFNsb3QodGhpcywgJ2hhcycpO1xuICAgICAgICAgICAgdmFyIGZrZXkgPSBmYXN0a2V5KGtleSk7XG4gICAgICAgICAgICBpZiAoZmtleSAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICAvLyBmYXN0IE8oMSkgcGF0aFxuICAgICAgICAgICAgICByZXR1cm4gdHlwZW9mIHRoaXMuX3N0b3JhZ2VbZmtleV0gIT09ICd1bmRlZmluZWQnO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyIGhlYWQgPSB0aGlzLl9oZWFkLCBpID0gaGVhZDtcbiAgICAgICAgICAgIHdoaWxlICgoaSA9IGkubmV4dCkgIT09IGhlYWQpIHtcbiAgICAgICAgICAgICAgaWYgKEVTLlNhbWVWYWx1ZVplcm8oaS5rZXksIGtleSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgIH0sXG5cbiAgICAgICAgICBzZXQ6IGZ1bmN0aW9uIHNldChrZXksIHZhbHVlKSB7XG4gICAgICAgICAgICByZXF1aXJlTWFwU2xvdCh0aGlzLCAnc2V0Jyk7XG4gICAgICAgICAgICB2YXIgaGVhZCA9IHRoaXMuX2hlYWQsIGkgPSBoZWFkLCBlbnRyeTtcbiAgICAgICAgICAgIHZhciBma2V5ID0gZmFzdGtleShrZXkpO1xuICAgICAgICAgICAgaWYgKGZrZXkgIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgLy8gZmFzdCBPKDEpIHBhdGhcbiAgICAgICAgICAgICAgaWYgKHR5cGVvZiB0aGlzLl9zdG9yYWdlW2ZrZXldICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICAgIHRoaXMuX3N0b3JhZ2VbZmtleV0udmFsdWUgPSB2YWx1ZTtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBlbnRyeSA9IHRoaXMuX3N0b3JhZ2VbZmtleV0gPSBuZXcgTWFwRW50cnkoa2V5LCB2YWx1ZSk7XG4gICAgICAgICAgICAgICAgaSA9IGhlYWQucHJldjtcbiAgICAgICAgICAgICAgICAvLyBmYWxsIHRocm91Z2hcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgd2hpbGUgKChpID0gaS5uZXh0KSAhPT0gaGVhZCkge1xuICAgICAgICAgICAgICBpZiAoRVMuU2FtZVZhbHVlWmVybyhpLmtleSwga2V5KSkge1xuICAgICAgICAgICAgICAgIGkudmFsdWUgPSB2YWx1ZTtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZW50cnkgPSBlbnRyeSB8fCBuZXcgTWFwRW50cnkoa2V5LCB2YWx1ZSk7XG4gICAgICAgICAgICBpZiAoRVMuU2FtZVZhbHVlKC0wLCBrZXkpKSB7XG4gICAgICAgICAgICAgIGVudHJ5LmtleSA9ICswOyAvLyBjb2VyY2UgLTAgdG8gKzAgaW4gZW50cnlcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVudHJ5Lm5leHQgPSB0aGlzLl9oZWFkO1xuICAgICAgICAgICAgZW50cnkucHJldiA9IHRoaXMuX2hlYWQucHJldjtcbiAgICAgICAgICAgIGVudHJ5LnByZXYubmV4dCA9IGVudHJ5O1xuICAgICAgICAgICAgZW50cnkubmV4dC5wcmV2ID0gZW50cnk7XG4gICAgICAgICAgICB0aGlzLl9zaXplICs9IDE7XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgICB9LFxuXG4gICAgICAgICAgJ2RlbGV0ZSc6IGZ1bmN0aW9uIChrZXkpIHtcbiAgICAgICAgICAgIHJlcXVpcmVNYXBTbG90KHRoaXMsICdkZWxldGUnKTtcbiAgICAgICAgICAgIHZhciBoZWFkID0gdGhpcy5faGVhZCwgaSA9IGhlYWQ7XG4gICAgICAgICAgICB2YXIgZmtleSA9IGZhc3RrZXkoa2V5KTtcbiAgICAgICAgICAgIGlmIChma2V5ICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgIC8vIGZhc3QgTygxKSBwYXRoXG4gICAgICAgICAgICAgIGlmICh0eXBlb2YgdGhpcy5fc3RvcmFnZVtma2V5XSA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgaSA9IHRoaXMuX3N0b3JhZ2VbZmtleV0ucHJldjtcbiAgICAgICAgICAgICAgZGVsZXRlIHRoaXMuX3N0b3JhZ2VbZmtleV07XG4gICAgICAgICAgICAgIC8vIGZhbGwgdGhyb3VnaFxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgd2hpbGUgKChpID0gaS5uZXh0KSAhPT0gaGVhZCkge1xuICAgICAgICAgICAgICBpZiAoRVMuU2FtZVZhbHVlWmVybyhpLmtleSwga2V5KSkge1xuICAgICAgICAgICAgICAgIGkua2V5ID0gaS52YWx1ZSA9IGVtcHR5O1xuICAgICAgICAgICAgICAgIGkucHJldi5uZXh0ID0gaS5uZXh0O1xuICAgICAgICAgICAgICAgIGkubmV4dC5wcmV2ID0gaS5wcmV2O1xuICAgICAgICAgICAgICAgIHRoaXMuX3NpemUgLT0gMTtcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgIH0sXG5cbiAgICAgICAgICBjbGVhcjogZnVuY3Rpb24gY2xlYXIoKSB7XG4gICAgICAgICAgICByZXF1aXJlTWFwU2xvdCh0aGlzLCAnY2xlYXInKTtcbiAgICAgICAgICAgIHRoaXMuX3NpemUgPSAwO1xuICAgICAgICAgICAgdGhpcy5fc3RvcmFnZSA9IGVtcHR5T2JqZWN0KCk7XG4gICAgICAgICAgICB2YXIgaGVhZCA9IHRoaXMuX2hlYWQsIGkgPSBoZWFkLCBwID0gaS5uZXh0O1xuICAgICAgICAgICAgd2hpbGUgKChpID0gcCkgIT09IGhlYWQpIHtcbiAgICAgICAgICAgICAgaS5rZXkgPSBpLnZhbHVlID0gZW1wdHk7XG4gICAgICAgICAgICAgIHAgPSBpLm5leHQ7XG4gICAgICAgICAgICAgIGkubmV4dCA9IGkucHJldiA9IGhlYWQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBoZWFkLm5leHQgPSBoZWFkLnByZXYgPSBoZWFkO1xuICAgICAgICAgIH0sXG5cbiAgICAgICAgICBrZXlzOiBmdW5jdGlvbiBrZXlzKCkge1xuICAgICAgICAgICAgcmVxdWlyZU1hcFNsb3QodGhpcywgJ2tleXMnKTtcbiAgICAgICAgICAgIHJldHVybiBuZXcgTWFwSXRlcmF0b3IodGhpcywgJ2tleScpO1xuICAgICAgICAgIH0sXG5cbiAgICAgICAgICB2YWx1ZXM6IGZ1bmN0aW9uIHZhbHVlcygpIHtcbiAgICAgICAgICAgIHJlcXVpcmVNYXBTbG90KHRoaXMsICd2YWx1ZXMnKTtcbiAgICAgICAgICAgIHJldHVybiBuZXcgTWFwSXRlcmF0b3IodGhpcywgJ3ZhbHVlJyk7XG4gICAgICAgICAgfSxcblxuICAgICAgICAgIGVudHJpZXM6IGZ1bmN0aW9uIGVudHJpZXMoKSB7XG4gICAgICAgICAgICByZXF1aXJlTWFwU2xvdCh0aGlzLCAnZW50cmllcycpO1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBNYXBJdGVyYXRvcih0aGlzLCAna2V5K3ZhbHVlJyk7XG4gICAgICAgICAgfSxcblxuICAgICAgICAgIGZvckVhY2g6IGZ1bmN0aW9uIGZvckVhY2goY2FsbGJhY2spIHtcbiAgICAgICAgICAgIHJlcXVpcmVNYXBTbG90KHRoaXMsICdmb3JFYWNoJyk7XG4gICAgICAgICAgICB2YXIgY29udGV4dCA9IGFyZ3VtZW50cy5sZW5ndGggPiAxID8gYXJndW1lbnRzWzFdIDogbnVsbDtcbiAgICAgICAgICAgIHZhciBpdCA9IHRoaXMuZW50cmllcygpO1xuICAgICAgICAgICAgZm9yICh2YXIgZW50cnkgPSBpdC5uZXh0KCk7ICFlbnRyeS5kb25lOyBlbnRyeSA9IGl0Lm5leHQoKSkge1xuICAgICAgICAgICAgICBpZiAoY29udGV4dCkge1xuICAgICAgICAgICAgICAgIF9jYWxsKGNhbGxiYWNrLCBjb250ZXh0LCBlbnRyeS52YWx1ZVsxXSwgZW50cnkudmFsdWVbMF0sIHRoaXMpO1xuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGVudHJ5LnZhbHVlWzFdLCBlbnRyeS52YWx1ZVswXSwgdGhpcyk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBhZGRJdGVyYXRvcihNYXAkcHJvdG90eXBlLCBNYXAkcHJvdG90eXBlLmVudHJpZXMpO1xuXG4gICAgICAgIHJldHVybiBNYXBTaGltO1xuICAgICAgfSgpKSxcblxuICAgICAgU2V0OiAoZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgaXNTZXQgPSBmdW5jdGlvbiBpc1NldChzZXQpIHtcbiAgICAgICAgICByZXR1cm4gc2V0Ll9lczZzZXQgJiYgdHlwZW9mIHNldC5fc3RvcmFnZSAhPT0gJ3VuZGVmaW5lZCc7XG4gICAgICAgIH07XG4gICAgICAgIHZhciByZXF1aXJlU2V0U2xvdCA9IGZ1bmN0aW9uIHJlcXVpcmVTZXRTbG90KHNldCwgbWV0aG9kKSB7XG4gICAgICAgICAgaWYgKCFFUy5UeXBlSXNPYmplY3Qoc2V0KSB8fCAhaXNTZXQoc2V0KSkge1xuICAgICAgICAgICAgLy8gaHR0cHM6Ly9naXRodWIuY29tL3BhdWxtaWxsci9lczYtc2hpbS9pc3N1ZXMvMTc2XG4gICAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdTZXQucHJvdG90eXBlLicgKyBtZXRob2QgKyAnIGNhbGxlZCBvbiBpbmNvbXBhdGlibGUgcmVjZWl2ZXIgJyArIEVTLlRvU3RyaW5nKHNldCkpO1xuICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICAvLyBDcmVhdGluZyBhIE1hcCBpcyBleHBlbnNpdmUuICBUbyBzcGVlZCB1cCB0aGUgY29tbW9uIGNhc2Ugb2ZcbiAgICAgICAgLy8gU2V0cyBjb250YWluaW5nIG9ubHkgc3RyaW5nIG9yIG51bWVyaWMga2V5cywgd2UgdXNlIGFuIG9iamVjdFxuICAgICAgICAvLyBhcyBiYWNraW5nIHN0b3JhZ2UgYW5kIGxhemlseSBjcmVhdGUgYSBmdWxsIE1hcCBvbmx5IHdoZW5cbiAgICAgICAgLy8gcmVxdWlyZWQuXG4gICAgICAgIHZhciBTZXQkcHJvdG90eXBlO1xuICAgICAgICB2YXIgU2V0U2hpbSA9IGZ1bmN0aW9uIFNldCgpIHtcbiAgICAgICAgICBpZiAoISh0aGlzIGluc3RhbmNlb2YgU2V0KSkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignQ29uc3RydWN0b3IgU2V0IHJlcXVpcmVzIFwibmV3XCInKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKHRoaXMgJiYgdGhpcy5fZXM2c2V0KSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdCYWQgY29uc3RydWN0aW9uJyk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHZhciBzZXQgPSBlbXVsYXRlRVM2Y29uc3RydWN0KHRoaXMsIFNldCwgU2V0JHByb3RvdHlwZSwge1xuICAgICAgICAgICAgX2VzNnNldDogdHJ1ZSxcbiAgICAgICAgICAgICdbW1NldERhdGFdXSc6IG51bGwsXG4gICAgICAgICAgICBfc3RvcmFnZTogZW1wdHlPYmplY3QoKVxuICAgICAgICAgIH0pO1xuICAgICAgICAgIGlmICghc2V0Ll9lczZzZXQpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ2JhZCBzZXQnKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICAvLyBPcHRpb25hbGx5IGluaXRpYWxpemUgU2V0IGZyb20gaXRlcmFibGVcbiAgICAgICAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGFkZEl0ZXJhYmxlVG9TZXQoU2V0LCBzZXQsIGFyZ3VtZW50c1swXSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiBzZXQ7XG4gICAgICAgIH07XG4gICAgICAgIFNldCRwcm90b3R5cGUgPSBTZXRTaGltLnByb3RvdHlwZTtcblxuICAgICAgICB2YXIgZGVjb2RlS2V5ID0gZnVuY3Rpb24gKGtleSkge1xuICAgICAgICAgIHZhciBrID0ga2V5O1xuICAgICAgICAgIGlmIChrID09PSAnXm51bGwnKSB7XG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICB9IGVsc2UgaWYgKGsgPT09ICdedW5kZWZpbmVkJykge1xuICAgICAgICAgICAgcmV0dXJuIHZvaWQgMDtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdmFyIGZpcnN0ID0gay5jaGFyQXQoMCk7XG4gICAgICAgICAgICBpZiAoZmlyc3QgPT09ICckJykge1xuICAgICAgICAgICAgICByZXR1cm4gX3N0clNsaWNlKGssIDEpO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChmaXJzdCA9PT0gJ24nKSB7XG4gICAgICAgICAgICAgIHJldHVybiArX3N0clNsaWNlKGssIDEpO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChmaXJzdCA9PT0gJ2InKSB7XG4gICAgICAgICAgICAgIHJldHVybiBrID09PSAnYnRydWUnO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4gK2s7XG4gICAgICAgIH07XG4gICAgICAgIC8vIFN3aXRjaCBmcm9tIHRoZSBvYmplY3QgYmFja2luZyBzdG9yYWdlIHRvIGEgZnVsbCBNYXAuXG4gICAgICAgIHZhciBlbnN1cmVNYXAgPSBmdW5jdGlvbiBlbnN1cmVNYXAoc2V0KSB7XG4gICAgICAgICAgaWYgKCFzZXRbJ1tbU2V0RGF0YV1dJ10pIHtcbiAgICAgICAgICAgIHZhciBtID0gc2V0WydbW1NldERhdGFdXSddID0gbmV3IGNvbGxlY3Rpb25TaGltcy5NYXAoKTtcbiAgICAgICAgICAgIF9mb3JFYWNoKGtleXMoc2V0Ll9zdG9yYWdlKSwgZnVuY3Rpb24gKGtleSkge1xuICAgICAgICAgICAgICB2YXIgayA9IGRlY29kZUtleShrZXkpO1xuICAgICAgICAgICAgICBtLnNldChrLCBrKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgc2V0WydbW1NldERhdGFdXSddID0gbTtcbiAgICAgICAgICB9XG4gICAgICAgICAgc2V0Ll9zdG9yYWdlID0gbnVsbDsgLy8gZnJlZSBvbGQgYmFja2luZyBzdG9yYWdlXG4gICAgICAgIH07XG5cbiAgICAgICAgVmFsdWUuZ2V0dGVyKFNldFNoaW0ucHJvdG90eXBlLCAnc2l6ZScsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICByZXF1aXJlU2V0U2xvdCh0aGlzLCAnc2l6ZScpO1xuICAgICAgICAgIGlmICh0aGlzLl9zdG9yYWdlKSB7XG4gICAgICAgICAgICByZXR1cm4ga2V5cyh0aGlzLl9zdG9yYWdlKS5sZW5ndGg7XG4gICAgICAgICAgfVxuICAgICAgICAgIGVuc3VyZU1hcCh0aGlzKTtcbiAgICAgICAgICByZXR1cm4gdGhpc1snW1tTZXREYXRhXV0nXS5zaXplO1xuICAgICAgICB9KTtcblxuICAgICAgICBkZWZpbmVQcm9wZXJ0aWVzKFNldFNoaW0ucHJvdG90eXBlLCB7XG4gICAgICAgICAgaGFzOiBmdW5jdGlvbiBoYXMoa2V5KSB7XG4gICAgICAgICAgICByZXF1aXJlU2V0U2xvdCh0aGlzLCAnaGFzJyk7XG4gICAgICAgICAgICB2YXIgZmtleTtcbiAgICAgICAgICAgIGlmICh0aGlzLl9zdG9yYWdlICYmIChma2V5ID0gZmFzdGtleShrZXkpKSAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICByZXR1cm4gISF0aGlzLl9zdG9yYWdlW2ZrZXldO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZW5zdXJlTWFwKHRoaXMpO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXNbJ1tbU2V0RGF0YV1dJ10uaGFzKGtleSk7XG4gICAgICAgICAgfSxcblxuICAgICAgICAgIGFkZDogZnVuY3Rpb24gYWRkKGtleSkge1xuICAgICAgICAgICAgcmVxdWlyZVNldFNsb3QodGhpcywgJ2FkZCcpO1xuICAgICAgICAgICAgdmFyIGZrZXk7XG4gICAgICAgICAgICBpZiAodGhpcy5fc3RvcmFnZSAmJiAoZmtleSA9IGZhc3RrZXkoa2V5KSkgIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgdGhpcy5fc3RvcmFnZVtma2V5XSA9IHRydWU7XG4gICAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZW5zdXJlTWFwKHRoaXMpO1xuICAgICAgICAgICAgdGhpc1snW1tTZXREYXRhXV0nXS5zZXQoa2V5LCBrZXkpO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgICAgfSxcblxuICAgICAgICAgICdkZWxldGUnOiBmdW5jdGlvbiAoa2V5KSB7XG4gICAgICAgICAgICByZXF1aXJlU2V0U2xvdCh0aGlzLCAnZGVsZXRlJyk7XG4gICAgICAgICAgICB2YXIgZmtleTtcbiAgICAgICAgICAgIGlmICh0aGlzLl9zdG9yYWdlICYmIChma2V5ID0gZmFzdGtleShrZXkpKSAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICB2YXIgaGFzRktleSA9IF9oYXNPd25Qcm9wZXJ0eSh0aGlzLl9zdG9yYWdlLCBma2V5KTtcbiAgICAgICAgICAgICAgcmV0dXJuIChkZWxldGUgdGhpcy5fc3RvcmFnZVtma2V5XSkgJiYgaGFzRktleTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVuc3VyZU1hcCh0aGlzKTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzWydbW1NldERhdGFdXSddWydkZWxldGUnXShrZXkpO1xuICAgICAgICAgIH0sXG5cbiAgICAgICAgICBjbGVhcjogZnVuY3Rpb24gY2xlYXIoKSB7XG4gICAgICAgICAgICByZXF1aXJlU2V0U2xvdCh0aGlzLCAnY2xlYXInKTtcbiAgICAgICAgICAgIGlmICh0aGlzLl9zdG9yYWdlKSB7XG4gICAgICAgICAgICAgIHRoaXMuX3N0b3JhZ2UgPSBlbXB0eU9iamVjdCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHRoaXNbJ1tbU2V0RGF0YV1dJ10pIHtcbiAgICAgICAgICAgICAgdGhpc1snW1tTZXREYXRhXV0nXS5jbGVhcigpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0sXG5cbiAgICAgICAgICB2YWx1ZXM6IGZ1bmN0aW9uIHZhbHVlcygpIHtcbiAgICAgICAgICAgIHJlcXVpcmVTZXRTbG90KHRoaXMsICd2YWx1ZXMnKTtcbiAgICAgICAgICAgIGVuc3VyZU1hcCh0aGlzKTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzWydbW1NldERhdGFdXSddLnZhbHVlcygpO1xuICAgICAgICAgIH0sXG5cbiAgICAgICAgICBlbnRyaWVzOiBmdW5jdGlvbiBlbnRyaWVzKCkge1xuICAgICAgICAgICAgcmVxdWlyZVNldFNsb3QodGhpcywgJ2VudHJpZXMnKTtcbiAgICAgICAgICAgIGVuc3VyZU1hcCh0aGlzKTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzWydbW1NldERhdGFdXSddLmVudHJpZXMoKTtcbiAgICAgICAgICB9LFxuXG4gICAgICAgICAgZm9yRWFjaDogZnVuY3Rpb24gZm9yRWFjaChjYWxsYmFjaykge1xuICAgICAgICAgICAgcmVxdWlyZVNldFNsb3QodGhpcywgJ2ZvckVhY2gnKTtcbiAgICAgICAgICAgIHZhciBjb250ZXh0ID0gYXJndW1lbnRzLmxlbmd0aCA+IDEgPyBhcmd1bWVudHNbMV0gOiBudWxsO1xuICAgICAgICAgICAgdmFyIGVudGlyZVNldCA9IHRoaXM7XG4gICAgICAgICAgICBlbnN1cmVNYXAoZW50aXJlU2V0KTtcbiAgICAgICAgICAgIHRoaXNbJ1tbU2V0RGF0YV1dJ10uZm9yRWFjaChmdW5jdGlvbiAodmFsdWUsIGtleSkge1xuICAgICAgICAgICAgICBpZiAoY29udGV4dCkge1xuICAgICAgICAgICAgICAgIF9jYWxsKGNhbGxiYWNrLCBjb250ZXh0LCBrZXksIGtleSwgZW50aXJlU2V0KTtcbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhrZXksIGtleSwgZW50aXJlU2V0KTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgZGVmaW5lUHJvcGVydHkoU2V0U2hpbS5wcm90b3R5cGUsICdrZXlzJywgU2V0U2hpbS5wcm90b3R5cGUudmFsdWVzLCB0cnVlKTtcbiAgICAgICAgYWRkSXRlcmF0b3IoU2V0U2hpbS5wcm90b3R5cGUsIFNldFNoaW0ucHJvdG90eXBlLnZhbHVlcyk7XG5cbiAgICAgICAgcmV0dXJuIFNldFNoaW07XG4gICAgICB9KCkpXG4gICAgfTtcblxuICAgIGlmIChnbG9iYWxzLk1hcCB8fCBnbG9iYWxzLlNldCkge1xuICAgICAgLy8gU2FmYXJpIDgsIGZvciBleGFtcGxlLCBkb2Vzbid0IGFjY2VwdCBhbiBpdGVyYWJsZS5cbiAgICAgIHZhciBtYXBBY2NlcHRzQXJndW1lbnRzID0gdmFsdWVPckZhbHNlSWZUaHJvd3MoZnVuY3Rpb24gKCkgeyByZXR1cm4gbmV3IE1hcChbWzEsIDJdXSkuZ2V0KDEpID09PSAyOyB9KTtcbiAgICAgIGlmICghbWFwQWNjZXB0c0FyZ3VtZW50cykge1xuICAgICAgICB2YXIgT3JpZ01hcE5vQXJncyA9IGdsb2JhbHMuTWFwO1xuICAgICAgICBnbG9iYWxzLk1hcCA9IGZ1bmN0aW9uIE1hcCgpIHtcbiAgICAgICAgICBpZiAoISh0aGlzIGluc3RhbmNlb2YgTWFwKSkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignQ29uc3RydWN0b3IgTWFwIHJlcXVpcmVzIFwibmV3XCInKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgdmFyIG0gPSBuZXcgT3JpZ01hcE5vQXJncygpO1xuICAgICAgICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgYWRkSXRlcmFibGVUb01hcChNYXAsIG0sIGFyZ3VtZW50c1swXSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGRlbGV0ZSBtLmNvbnN0cnVjdG9yO1xuICAgICAgICAgIE9iamVjdC5zZXRQcm90b3R5cGVPZihtLCBnbG9iYWxzLk1hcC5wcm90b3R5cGUpO1xuICAgICAgICAgIHJldHVybiBtO1xuICAgICAgICB9O1xuICAgICAgICBnbG9iYWxzLk1hcC5wcm90b3R5cGUgPSBjcmVhdGUoT3JpZ01hcE5vQXJncy5wcm90b3R5cGUpO1xuICAgICAgICBkZWZpbmVQcm9wZXJ0eShnbG9iYWxzLk1hcC5wcm90b3R5cGUsICdjb25zdHJ1Y3RvcicsIGdsb2JhbHMuTWFwLCB0cnVlKTtcbiAgICAgICAgVmFsdWUucHJlc2VydmVUb1N0cmluZyhnbG9iYWxzLk1hcCwgT3JpZ01hcE5vQXJncyk7XG4gICAgICB9XG4gICAgICB2YXIgdGVzdE1hcCA9IG5ldyBNYXAoKTtcbiAgICAgIHZhciBtYXBVc2VzU2FtZVZhbHVlWmVybyA9IChmdW5jdGlvbiAoKSB7XG4gICAgICAgIC8vIENocm9tZSAzOC00Miwgbm9kZSAwLjExLzAuMTIsIGlvanMgMS8yIGFsc28gaGF2ZSBhIGJ1ZyB3aGVuIHRoZSBNYXAgaGFzIGEgc2l6ZSA+IDRcbiAgICAgICAgdmFyIG0gPSBuZXcgTWFwKFtbMSwgMF0sIFsyLCAwXSwgWzMsIDBdLCBbNCwgMF1dKTtcbiAgICAgICAgbS5zZXQoLTAsIG0pO1xuICAgICAgICByZXR1cm4gbS5nZXQoMCkgPT09IG0gJiYgbS5nZXQoLTApID09PSBtICYmIG0uaGFzKDApICYmIG0uaGFzKC0wKTtcbiAgICAgIH0oKSk7XG4gICAgICB2YXIgbWFwU3VwcG9ydHNDaGFpbmluZyA9IHRlc3RNYXAuc2V0KDEsIDIpID09PSB0ZXN0TWFwO1xuICAgICAgaWYgKCFtYXBVc2VzU2FtZVZhbHVlWmVybyB8fCAhbWFwU3VwcG9ydHNDaGFpbmluZykge1xuICAgICAgICB2YXIgb3JpZ01hcFNldCA9IE1hcC5wcm90b3R5cGUuc2V0O1xuICAgICAgICBvdmVycmlkZU5hdGl2ZShNYXAucHJvdG90eXBlLCAnc2V0JywgZnVuY3Rpb24gc2V0KGssIHYpIHtcbiAgICAgICAgICBfY2FsbChvcmlnTWFwU2V0LCB0aGlzLCBrID09PSAwID8gMCA6IGssIHYpO1xuICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICAgIGlmICghbWFwVXNlc1NhbWVWYWx1ZVplcm8pIHtcbiAgICAgICAgdmFyIG9yaWdNYXBHZXQgPSBNYXAucHJvdG90eXBlLmdldDtcbiAgICAgICAgdmFyIG9yaWdNYXBIYXMgPSBNYXAucHJvdG90eXBlLmhhcztcbiAgICAgICAgZGVmaW5lUHJvcGVydGllcyhNYXAucHJvdG90eXBlLCB7XG4gICAgICAgICAgZ2V0OiBmdW5jdGlvbiBnZXQoaykge1xuICAgICAgICAgICAgcmV0dXJuIF9jYWxsKG9yaWdNYXBHZXQsIHRoaXMsIGsgPT09IDAgPyAwIDogayk7XG4gICAgICAgICAgfSxcbiAgICAgICAgICBoYXM6IGZ1bmN0aW9uIGhhcyhrKSB7XG4gICAgICAgICAgICByZXR1cm4gX2NhbGwob3JpZ01hcEhhcywgdGhpcywgayA9PT0gMCA/IDAgOiBrKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0sIHRydWUpO1xuICAgICAgICBWYWx1ZS5wcmVzZXJ2ZVRvU3RyaW5nKE1hcC5wcm90b3R5cGUuZ2V0LCBvcmlnTWFwR2V0KTtcbiAgICAgICAgVmFsdWUucHJlc2VydmVUb1N0cmluZyhNYXAucHJvdG90eXBlLmhhcywgb3JpZ01hcEhhcyk7XG4gICAgICB9XG4gICAgICB2YXIgdGVzdFNldCA9IG5ldyBTZXQoKTtcbiAgICAgIHZhciBzZXRVc2VzU2FtZVZhbHVlWmVybyA9IChmdW5jdGlvbiAocykge1xuICAgICAgICBzWydkZWxldGUnXSgwKTtcbiAgICAgICAgcy5hZGQoLTApO1xuICAgICAgICByZXR1cm4gIXMuaGFzKDApO1xuICAgICAgfSh0ZXN0U2V0KSk7XG4gICAgICB2YXIgc2V0U3VwcG9ydHNDaGFpbmluZyA9IHRlc3RTZXQuYWRkKDEpID09PSB0ZXN0U2V0O1xuICAgICAgaWYgKCFzZXRVc2VzU2FtZVZhbHVlWmVybyB8fCAhc2V0U3VwcG9ydHNDaGFpbmluZykge1xuICAgICAgICB2YXIgb3JpZ1NldEFkZCA9IFNldC5wcm90b3R5cGUuYWRkO1xuICAgICAgICBTZXQucHJvdG90eXBlLmFkZCA9IGZ1bmN0aW9uIGFkZCh2KSB7XG4gICAgICAgICAgX2NhbGwob3JpZ1NldEFkZCwgdGhpcywgdiA9PT0gMCA/IDAgOiB2KTtcbiAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfTtcbiAgICAgICAgVmFsdWUucHJlc2VydmVUb1N0cmluZyhTZXQucHJvdG90eXBlLmFkZCwgb3JpZ1NldEFkZCk7XG4gICAgICB9XG4gICAgICBpZiAoIXNldFVzZXNTYW1lVmFsdWVaZXJvKSB7XG4gICAgICAgIHZhciBvcmlnU2V0SGFzID0gU2V0LnByb3RvdHlwZS5oYXM7XG4gICAgICAgIFNldC5wcm90b3R5cGUuaGFzID0gZnVuY3Rpb24gaGFzKHYpIHtcbiAgICAgICAgICByZXR1cm4gX2NhbGwob3JpZ1NldEhhcywgdGhpcywgdiA9PT0gMCA/IDAgOiB2KTtcbiAgICAgICAgfTtcbiAgICAgICAgVmFsdWUucHJlc2VydmVUb1N0cmluZyhTZXQucHJvdG90eXBlLmhhcywgb3JpZ1NldEhhcyk7XG4gICAgICAgIHZhciBvcmlnU2V0RGVsID0gU2V0LnByb3RvdHlwZVsnZGVsZXRlJ107XG4gICAgICAgIFNldC5wcm90b3R5cGVbJ2RlbGV0ZSddID0gZnVuY3Rpb24gU2V0RGVsZXRlKHYpIHtcbiAgICAgICAgICByZXR1cm4gX2NhbGwob3JpZ1NldERlbCwgdGhpcywgdiA9PT0gMCA/IDAgOiB2KTtcbiAgICAgICAgfTtcbiAgICAgICAgVmFsdWUucHJlc2VydmVUb1N0cmluZyhTZXQucHJvdG90eXBlWydkZWxldGUnXSwgb3JpZ1NldERlbCk7XG4gICAgICB9XG4gICAgICB2YXIgbWFwU3VwcG9ydHNTdWJjbGFzc2luZyA9IHN1cHBvcnRzU3ViY2xhc3NpbmcoZ2xvYmFscy5NYXAsIGZ1bmN0aW9uIChNKSB7XG4gICAgICAgIHZhciBtID0gbmV3IE0oW10pO1xuICAgICAgICAvLyBGaXJlZm94IDMyIGlzIG9rIHdpdGggdGhlIGluc3RhbnRpYXRpbmcgdGhlIHN1YmNsYXNzIGJ1dCB3aWxsXG4gICAgICAgIC8vIHRocm93IHdoZW4gdGhlIG1hcCBpcyB1c2VkLlxuICAgICAgICBtLnNldCg0MiwgNDIpO1xuICAgICAgICByZXR1cm4gbSBpbnN0YW5jZW9mIE07XG4gICAgICB9KTtcbiAgICAgIHZhciBtYXBGYWlsc1RvU3VwcG9ydFN1YmNsYXNzaW5nID0gT2JqZWN0LnNldFByb3RvdHlwZU9mICYmICFtYXBTdXBwb3J0c1N1YmNsYXNzaW5nOyAvLyB3aXRob3V0IE9iamVjdC5zZXRQcm90b3R5cGVPZiwgc3ViY2xhc3NpbmcgaXMgbm90IHBvc3NpYmxlXG4gICAgICB2YXIgbWFwUmVxdWlyZXNOZXcgPSAoZnVuY3Rpb24gKCkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgIHJldHVybiAhKGdsb2JhbHMuTWFwKCkgaW5zdGFuY2VvZiBnbG9iYWxzLk1hcCk7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICByZXR1cm4gZSBpbnN0YW5jZW9mIFR5cGVFcnJvcjtcbiAgICAgICAgfVxuICAgICAgfSgpKTtcbiAgICAgIGlmIChnbG9iYWxzLk1hcC5sZW5ndGggIT09IDAgfHwgbWFwRmFpbHNUb1N1cHBvcnRTdWJjbGFzc2luZyB8fCAhbWFwUmVxdWlyZXNOZXcpIHtcbiAgICAgICAgdmFyIE9yaWdNYXAgPSBnbG9iYWxzLk1hcDtcbiAgICAgICAgZ2xvYmFscy5NYXAgPSBmdW5jdGlvbiBNYXAoKSB7XG4gICAgICAgICAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIE1hcCkpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0NvbnN0cnVjdG9yIE1hcCByZXF1aXJlcyBcIm5ld1wiJyk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHZhciBtID0gbmV3IE9yaWdNYXAoKTtcbiAgICAgICAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGFkZEl0ZXJhYmxlVG9NYXAoTWFwLCBtLCBhcmd1bWVudHNbMF0pO1xuICAgICAgICAgIH1cbiAgICAgICAgICBkZWxldGUgbS5jb25zdHJ1Y3RvcjtcbiAgICAgICAgICBPYmplY3Quc2V0UHJvdG90eXBlT2YobSwgTWFwLnByb3RvdHlwZSk7XG4gICAgICAgICAgcmV0dXJuIG07XG4gICAgICAgIH07XG4gICAgICAgIGdsb2JhbHMuTWFwLnByb3RvdHlwZSA9IE9yaWdNYXAucHJvdG90eXBlO1xuICAgICAgICBkZWZpbmVQcm9wZXJ0eShnbG9iYWxzLk1hcC5wcm90b3R5cGUsICdjb25zdHJ1Y3RvcicsIGdsb2JhbHMuTWFwLCB0cnVlKTtcbiAgICAgICAgVmFsdWUucHJlc2VydmVUb1N0cmluZyhnbG9iYWxzLk1hcCwgT3JpZ01hcCk7XG4gICAgICB9XG4gICAgICB2YXIgc2V0U3VwcG9ydHNTdWJjbGFzc2luZyA9IHN1cHBvcnRzU3ViY2xhc3NpbmcoZ2xvYmFscy5TZXQsIGZ1bmN0aW9uIChTKSB7XG4gICAgICAgIHZhciBzID0gbmV3IFMoW10pO1xuICAgICAgICBzLmFkZCg0MiwgNDIpO1xuICAgICAgICByZXR1cm4gcyBpbnN0YW5jZW9mIFM7XG4gICAgICB9KTtcbiAgICAgIHZhciBzZXRGYWlsc1RvU3VwcG9ydFN1YmNsYXNzaW5nID0gT2JqZWN0LnNldFByb3RvdHlwZU9mICYmICFzZXRTdXBwb3J0c1N1YmNsYXNzaW5nOyAvLyB3aXRob3V0IE9iamVjdC5zZXRQcm90b3R5cGVPZiwgc3ViY2xhc3NpbmcgaXMgbm90IHBvc3NpYmxlXG4gICAgICB2YXIgc2V0UmVxdWlyZXNOZXcgPSAoZnVuY3Rpb24gKCkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgIHJldHVybiAhKGdsb2JhbHMuU2V0KCkgaW5zdGFuY2VvZiBnbG9iYWxzLlNldCk7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICByZXR1cm4gZSBpbnN0YW5jZW9mIFR5cGVFcnJvcjtcbiAgICAgICAgfVxuICAgICAgfSgpKTtcbiAgICAgIGlmIChnbG9iYWxzLlNldC5sZW5ndGggIT09IDAgfHwgc2V0RmFpbHNUb1N1cHBvcnRTdWJjbGFzc2luZyB8fCAhc2V0UmVxdWlyZXNOZXcpIHtcbiAgICAgICAgdmFyIE9yaWdTZXQgPSBnbG9iYWxzLlNldDtcbiAgICAgICAgZ2xvYmFscy5TZXQgPSBmdW5jdGlvbiBTZXQoKSB7XG4gICAgICAgICAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIFNldCkpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0NvbnN0cnVjdG9yIFNldCByZXF1aXJlcyBcIm5ld1wiJyk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHZhciBzID0gbmV3IE9yaWdTZXQoKTtcbiAgICAgICAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGFkZEl0ZXJhYmxlVG9TZXQoU2V0LCBzLCBhcmd1bWVudHNbMF0pO1xuICAgICAgICAgIH1cbiAgICAgICAgICBkZWxldGUgcy5jb25zdHJ1Y3RvcjtcbiAgICAgICAgICBPYmplY3Quc2V0UHJvdG90eXBlT2YocywgU2V0LnByb3RvdHlwZSk7XG4gICAgICAgICAgcmV0dXJuIHM7XG4gICAgICAgIH07XG4gICAgICAgIGdsb2JhbHMuU2V0LnByb3RvdHlwZSA9IE9yaWdTZXQucHJvdG90eXBlO1xuICAgICAgICBkZWZpbmVQcm9wZXJ0eShnbG9iYWxzLlNldC5wcm90b3R5cGUsICdjb25zdHJ1Y3RvcicsIGdsb2JhbHMuU2V0LCB0cnVlKTtcbiAgICAgICAgVmFsdWUucHJlc2VydmVUb1N0cmluZyhnbG9iYWxzLlNldCwgT3JpZ1NldCk7XG4gICAgICB9XG4gICAgICB2YXIgbWFwSXRlcmF0aW9uVGhyb3dzU3RvcEl0ZXJhdG9yID0gIXZhbHVlT3JGYWxzZUlmVGhyb3dzKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIChuZXcgTWFwKCkpLmtleXMoKS5uZXh0KCkuZG9uZTtcbiAgICAgIH0pO1xuICAgICAgLypcbiAgICAgICAgLSBJbiBGaXJlZm94IDwgMjMsIE1hcCNzaXplIGlzIGEgZnVuY3Rpb24uXG4gICAgICAgIC0gSW4gYWxsIGN1cnJlbnQgRmlyZWZveCwgU2V0I2VudHJpZXMva2V5cy92YWx1ZXMgJiBNYXAjY2xlYXIgZG8gbm90IGV4aXN0XG4gICAgICAgIC0gaHR0cHM6Ly9idWd6aWxsYS5tb3ppbGxhLm9yZy9zaG93X2J1Zy5jZ2k/aWQ9ODY5OTk2XG4gICAgICAgIC0gSW4gRmlyZWZveCAyNCwgTWFwIGFuZCBTZXQgZG8gbm90IGltcGxlbWVudCBmb3JFYWNoXG4gICAgICAgIC0gSW4gRmlyZWZveCAyNSBhdCBsZWFzdCwgTWFwIGFuZCBTZXQgYXJlIGNhbGxhYmxlIHdpdGhvdXQgXCJuZXdcIlxuICAgICAgKi9cbiAgICAgIGlmIChcbiAgICAgICAgdHlwZW9mIGdsb2JhbHMuTWFwLnByb3RvdHlwZS5jbGVhciAhPT0gJ2Z1bmN0aW9uJyB8fFxuICAgICAgICBuZXcgZ2xvYmFscy5TZXQoKS5zaXplICE9PSAwIHx8XG4gICAgICAgIG5ldyBnbG9iYWxzLk1hcCgpLnNpemUgIT09IDAgfHxcbiAgICAgICAgdHlwZW9mIGdsb2JhbHMuTWFwLnByb3RvdHlwZS5rZXlzICE9PSAnZnVuY3Rpb24nIHx8XG4gICAgICAgIHR5cGVvZiBnbG9iYWxzLlNldC5wcm90b3R5cGUua2V5cyAhPT0gJ2Z1bmN0aW9uJyB8fFxuICAgICAgICB0eXBlb2YgZ2xvYmFscy5NYXAucHJvdG90eXBlLmZvckVhY2ggIT09ICdmdW5jdGlvbicgfHxcbiAgICAgICAgdHlwZW9mIGdsb2JhbHMuU2V0LnByb3RvdHlwZS5mb3JFYWNoICE9PSAnZnVuY3Rpb24nIHx8XG4gICAgICAgIGlzQ2FsbGFibGVXaXRob3V0TmV3KGdsb2JhbHMuTWFwKSB8fFxuICAgICAgICBpc0NhbGxhYmxlV2l0aG91dE5ldyhnbG9iYWxzLlNldCkgfHxcbiAgICAgICAgdHlwZW9mIChuZXcgZ2xvYmFscy5NYXAoKS5rZXlzKCkubmV4dCkgIT09ICdmdW5jdGlvbicgfHwgLy8gU2FmYXJpIDhcbiAgICAgICAgbWFwSXRlcmF0aW9uVGhyb3dzU3RvcEl0ZXJhdG9yIHx8IC8vIEZpcmVmb3ggMjVcbiAgICAgICAgIW1hcFN1cHBvcnRzU3ViY2xhc3NpbmdcbiAgICAgICkge1xuICAgICAgICBkZWZpbmVQcm9wZXJ0aWVzKGdsb2JhbHMsIHtcbiAgICAgICAgICBNYXA6IGNvbGxlY3Rpb25TaGltcy5NYXAsXG4gICAgICAgICAgU2V0OiBjb2xsZWN0aW9uU2hpbXMuU2V0XG4gICAgICAgIH0sIHRydWUpO1xuICAgICAgfVxuXG4gICAgICBpZiAoZ2xvYmFscy5TZXQucHJvdG90eXBlLmtleXMgIT09IGdsb2JhbHMuU2V0LnByb3RvdHlwZS52YWx1ZXMpIHtcbiAgICAgICAgLy8gRml4ZWQgaW4gV2ViS2l0IHdpdGggaHR0cHM6Ly9idWdzLndlYmtpdC5vcmcvc2hvd19idWcuY2dpP2lkPTE0NDE5MFxuICAgICAgICBkZWZpbmVQcm9wZXJ0eShnbG9iYWxzLlNldC5wcm90b3R5cGUsICdrZXlzJywgZ2xvYmFscy5TZXQucHJvdG90eXBlLnZhbHVlcywgdHJ1ZSk7XG4gICAgICB9XG5cbiAgICAgIC8vIFNoaW0gaW5jb21wbGV0ZSBpdGVyYXRvciBpbXBsZW1lbnRhdGlvbnMuXG4gICAgICBhZGRJdGVyYXRvcihPYmplY3QuZ2V0UHJvdG90eXBlT2YoKG5ldyBnbG9iYWxzLk1hcCgpKS5rZXlzKCkpKTtcbiAgICAgIGFkZEl0ZXJhdG9yKE9iamVjdC5nZXRQcm90b3R5cGVPZigobmV3IGdsb2JhbHMuU2V0KCkpLmtleXMoKSkpO1xuXG4gICAgICBpZiAoZnVuY3Rpb25zSGF2ZU5hbWVzICYmIGdsb2JhbHMuU2V0LnByb3RvdHlwZS5oYXMubmFtZSAhPT0gJ2hhcycpIHtcbiAgICAgICAgLy8gTWljcm9zb2Z0IEVkZ2UgdjAuMTEuMTAwNzQuMCBpcyBtaXNzaW5nIGEgbmFtZSBvbiBTZXQjaGFzXG4gICAgICAgIHZhciBhbm9ueW1vdXNTZXRIYXMgPSBnbG9iYWxzLlNldC5wcm90b3R5cGUuaGFzO1xuICAgICAgICBvdmVycmlkZU5hdGl2ZShnbG9iYWxzLlNldC5wcm90b3R5cGUsICdoYXMnLCBmdW5jdGlvbiBoYXMoa2V5KSB7XG4gICAgICAgICAgcmV0dXJuIF9jYWxsKGFub255bW91c1NldEhhcywgdGhpcywga2V5KTtcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfVxuICAgIGRlZmluZVByb3BlcnRpZXMoZ2xvYmFscywgY29sbGVjdGlvblNoaW1zKTtcbiAgICBhZGREZWZhdWx0U3BlY2llcyhnbG9iYWxzLk1hcCk7XG4gICAgYWRkRGVmYXVsdFNwZWNpZXMoZ2xvYmFscy5TZXQpO1xuICB9XG5cbiAgdmFyIHRocm93VW5sZXNzVGFyZ2V0SXNPYmplY3QgPSBmdW5jdGlvbiB0aHJvd1VubGVzc1RhcmdldElzT2JqZWN0KHRhcmdldCkge1xuICAgIGlmICghRVMuVHlwZUlzT2JqZWN0KHRhcmdldCkpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ3RhcmdldCBtdXN0IGJlIGFuIG9iamVjdCcpO1xuICAgIH1cbiAgfTtcblxuICAvLyBTb21lIFJlZmxlY3QgbWV0aG9kcyBhcmUgYmFzaWNhbGx5IHRoZSBzYW1lIGFzXG4gIC8vIHRob3NlIG9uIHRoZSBPYmplY3QgZ2xvYmFsLCBleGNlcHQgdGhhdCBhIFR5cGVFcnJvciBpcyB0aHJvd24gaWZcbiAgLy8gdGFyZ2V0IGlzbid0IGFuIG9iamVjdC4gQXMgd2VsbCBhcyByZXR1cm5pbmcgYSBib29sZWFuIGluZGljYXRpbmdcbiAgLy8gdGhlIHN1Y2Nlc3Mgb2YgdGhlIG9wZXJhdGlvbi5cbiAgdmFyIFJlZmxlY3RTaGltcyA9IHtcbiAgICAvLyBBcHBseSBtZXRob2QgaW4gYSBmdW5jdGlvbmFsIGZvcm0uXG4gICAgYXBwbHk6IGZ1bmN0aW9uIGFwcGx5KCkge1xuICAgICAgcmV0dXJuIEVTLkNhbGwoRVMuQ2FsbCwgbnVsbCwgYXJndW1lbnRzKTtcbiAgICB9LFxuXG4gICAgLy8gTmV3IG9wZXJhdG9yIGluIGEgZnVuY3Rpb25hbCBmb3JtLlxuICAgIGNvbnN0cnVjdDogZnVuY3Rpb24gY29uc3RydWN0KGNvbnN0cnVjdG9yLCBhcmdzKSB7XG4gICAgICBpZiAoIUVTLklzQ29uc3RydWN0b3IoY29uc3RydWN0b3IpKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0ZpcnN0IGFyZ3VtZW50IG11c3QgYmUgYSBjb25zdHJ1Y3Rvci4nKTtcbiAgICAgIH1cbiAgICAgIHZhciBuZXdUYXJnZXQgPSBhcmd1bWVudHMubGVuZ3RoID4gMiA/IGFyZ3VtZW50c1syXSA6IGNvbnN0cnVjdG9yO1xuICAgICAgaWYgKCFFUy5Jc0NvbnN0cnVjdG9yKG5ld1RhcmdldCkpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignbmV3LnRhcmdldCBtdXN0IGJlIGEgY29uc3RydWN0b3IuJyk7XG4gICAgICB9XG4gICAgICByZXR1cm4gRVMuQ29uc3RydWN0KGNvbnN0cnVjdG9yLCBhcmdzLCBuZXdUYXJnZXQsICdpbnRlcm5hbCcpO1xuICAgIH0sXG5cbiAgICAvLyBXaGVuIGRlbGV0aW5nIGEgbm9uLWV4aXN0ZW50IG9yIGNvbmZpZ3VyYWJsZSBwcm9wZXJ0eSxcbiAgICAvLyB0cnVlIGlzIHJldHVybmVkLlxuICAgIC8vIFdoZW4gYXR0ZW1wdGluZyB0byBkZWxldGUgYSBub24tY29uZmlndXJhYmxlIHByb3BlcnR5LFxuICAgIC8vIGl0IHdpbGwgcmV0dXJuIGZhbHNlLlxuICAgIGRlbGV0ZVByb3BlcnR5OiBmdW5jdGlvbiBkZWxldGVQcm9wZXJ0eSh0YXJnZXQsIGtleSkge1xuICAgICAgdGhyb3dVbmxlc3NUYXJnZXRJc09iamVjdCh0YXJnZXQpO1xuICAgICAgaWYgKHN1cHBvcnRzRGVzY3JpcHRvcnMpIHtcbiAgICAgICAgdmFyIGRlc2MgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKHRhcmdldCwga2V5KTtcblxuICAgICAgICBpZiAoZGVzYyAmJiAhZGVzYy5jb25maWd1cmFibGUpIHtcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgLy8gV2lsbCByZXR1cm4gdHJ1ZS5cbiAgICAgIHJldHVybiBkZWxldGUgdGFyZ2V0W2tleV07XG4gICAgfSxcblxuICAgIGhhczogZnVuY3Rpb24gaGFzKHRhcmdldCwga2V5KSB7XG4gICAgICB0aHJvd1VubGVzc1RhcmdldElzT2JqZWN0KHRhcmdldCk7XG4gICAgICByZXR1cm4ga2V5IGluIHRhcmdldDtcbiAgICB9XG4gIH07XG5cbiAgaWYgKE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKSB7XG4gICAgT2JqZWN0LmFzc2lnbihSZWZsZWN0U2hpbXMsIHtcbiAgICAgIC8vIEJhc2ljYWxseSB0aGUgcmVzdWx0IG9mIGNhbGxpbmcgdGhlIGludGVybmFsIFtbT3duUHJvcGVydHlLZXlzXV0uXG4gICAgICAvLyBDb25jYXRlbmF0aW5nIHByb3BlcnR5TmFtZXMgYW5kIHByb3BlcnR5U3ltYm9scyBzaG91bGQgZG8gdGhlIHRyaWNrLlxuICAgICAgLy8gVGhpcyBzaG91bGQgY29udGludWUgdG8gd29yayB0b2dldGhlciB3aXRoIGEgU3ltYm9sIHNoaW1cbiAgICAgIC8vIHdoaWNoIG92ZXJyaWRlcyBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyBhbmQgaW1wbGVtZW50c1xuICAgICAgLy8gT2JqZWN0LmdldE93blByb3BlcnR5U3ltYm9scy5cbiAgICAgIG93bktleXM6IGZ1bmN0aW9uIG93bktleXModGFyZ2V0KSB7XG4gICAgICAgIHRocm93VW5sZXNzVGFyZ2V0SXNPYmplY3QodGFyZ2V0KTtcbiAgICAgICAgdmFyIGtleXMgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyh0YXJnZXQpO1xuXG4gICAgICAgIGlmIChFUy5Jc0NhbGxhYmxlKE9iamVjdC5nZXRPd25Qcm9wZXJ0eVN5bWJvbHMpKSB7XG4gICAgICAgICAgX3B1c2hBcHBseShrZXlzLCBPYmplY3QuZ2V0T3duUHJvcGVydHlTeW1ib2xzKHRhcmdldCkpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGtleXM7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICB2YXIgY2FsbEFuZENhdGNoRXhjZXB0aW9uID0gZnVuY3Rpb24gQ29udmVydEV4Y2VwdGlvblRvQm9vbGVhbihmdW5jKSB7XG4gICAgcmV0dXJuICF0aHJvd3NFcnJvcihmdW5jKTtcbiAgfTtcblxuICBpZiAoT2JqZWN0LnByZXZlbnRFeHRlbnNpb25zKSB7XG4gICAgT2JqZWN0LmFzc2lnbihSZWZsZWN0U2hpbXMsIHtcbiAgICAgIGlzRXh0ZW5zaWJsZTogZnVuY3Rpb24gaXNFeHRlbnNpYmxlKHRhcmdldCkge1xuICAgICAgICB0aHJvd1VubGVzc1RhcmdldElzT2JqZWN0KHRhcmdldCk7XG4gICAgICAgIHJldHVybiBPYmplY3QuaXNFeHRlbnNpYmxlKHRhcmdldCk7XG4gICAgICB9LFxuICAgICAgcHJldmVudEV4dGVuc2lvbnM6IGZ1bmN0aW9uIHByZXZlbnRFeHRlbnNpb25zKHRhcmdldCkge1xuICAgICAgICB0aHJvd1VubGVzc1RhcmdldElzT2JqZWN0KHRhcmdldCk7XG4gICAgICAgIHJldHVybiBjYWxsQW5kQ2F0Y2hFeGNlcHRpb24oZnVuY3Rpb24gKCkge1xuICAgICAgICAgIE9iamVjdC5wcmV2ZW50RXh0ZW5zaW9ucyh0YXJnZXQpO1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIGlmIChzdXBwb3J0c0Rlc2NyaXB0b3JzKSB7XG4gICAgdmFyIGludGVybmFsR2V0ID0gZnVuY3Rpb24gZ2V0KHRhcmdldCwga2V5LCByZWNlaXZlcikge1xuICAgICAgdmFyIGRlc2MgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKHRhcmdldCwga2V5KTtcblxuICAgICAgaWYgKCFkZXNjKSB7XG4gICAgICAgIHZhciBwYXJlbnQgPSBPYmplY3QuZ2V0UHJvdG90eXBlT2YodGFyZ2V0KTtcblxuICAgICAgICBpZiAocGFyZW50ID09PSBudWxsKSB7XG4gICAgICAgICAgcmV0dXJuIHZvaWQgMDtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBpbnRlcm5hbEdldChwYXJlbnQsIGtleSwgcmVjZWl2ZXIpO1xuICAgICAgfVxuXG4gICAgICBpZiAoJ3ZhbHVlJyBpbiBkZXNjKSB7XG4gICAgICAgIHJldHVybiBkZXNjLnZhbHVlO1xuICAgICAgfVxuXG4gICAgICBpZiAoZGVzYy5nZXQpIHtcbiAgICAgICAgcmV0dXJuIEVTLkNhbGwoZGVzYy5nZXQsIHJlY2VpdmVyKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHZvaWQgMDtcbiAgICB9O1xuXG4gICAgdmFyIGludGVybmFsU2V0ID0gZnVuY3Rpb24gc2V0KHRhcmdldCwga2V5LCB2YWx1ZSwgcmVjZWl2ZXIpIHtcbiAgICAgIHZhciBkZXNjID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcih0YXJnZXQsIGtleSk7XG5cbiAgICAgIGlmICghZGVzYykge1xuICAgICAgICB2YXIgcGFyZW50ID0gT2JqZWN0LmdldFByb3RvdHlwZU9mKHRhcmdldCk7XG5cbiAgICAgICAgaWYgKHBhcmVudCAhPT0gbnVsbCkge1xuICAgICAgICAgIHJldHVybiBpbnRlcm5hbFNldChwYXJlbnQsIGtleSwgdmFsdWUsIHJlY2VpdmVyKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGRlc2MgPSB7XG4gICAgICAgICAgdmFsdWU6IHZvaWQgMCxcbiAgICAgICAgICB3cml0YWJsZTogdHJ1ZSxcbiAgICAgICAgICBlbnVtZXJhYmxlOiB0cnVlLFxuICAgICAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZVxuICAgICAgICB9O1xuICAgICAgfVxuXG4gICAgICBpZiAoJ3ZhbHVlJyBpbiBkZXNjKSB7XG4gICAgICAgIGlmICghZGVzYy53cml0YWJsZSkge1xuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghRVMuVHlwZUlzT2JqZWN0KHJlY2VpdmVyKSkge1xuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBleGlzdGluZ0Rlc2MgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKHJlY2VpdmVyLCBrZXkpO1xuXG4gICAgICAgIGlmIChleGlzdGluZ0Rlc2MpIHtcbiAgICAgICAgICByZXR1cm4gUmVmbGVjdC5kZWZpbmVQcm9wZXJ0eShyZWNlaXZlciwga2V5LCB7XG4gICAgICAgICAgICB2YWx1ZTogdmFsdWVcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXR1cm4gUmVmbGVjdC5kZWZpbmVQcm9wZXJ0eShyZWNlaXZlciwga2V5LCB7XG4gICAgICAgICAgICB2YWx1ZTogdmFsdWUsXG4gICAgICAgICAgICB3cml0YWJsZTogdHJ1ZSxcbiAgICAgICAgICAgIGVudW1lcmFibGU6IHRydWUsXG4gICAgICAgICAgICBjb25maWd1cmFibGU6IHRydWVcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBpZiAoZGVzYy5zZXQpIHtcbiAgICAgICAgX2NhbGwoZGVzYy5zZXQsIHJlY2VpdmVyLCB2YWx1ZSk7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfTtcblxuICAgIE9iamVjdC5hc3NpZ24oUmVmbGVjdFNoaW1zLCB7XG4gICAgICBkZWZpbmVQcm9wZXJ0eTogZnVuY3Rpb24gZGVmaW5lUHJvcGVydHkodGFyZ2V0LCBwcm9wZXJ0eUtleSwgYXR0cmlidXRlcykge1xuICAgICAgICB0aHJvd1VubGVzc1RhcmdldElzT2JqZWN0KHRhcmdldCk7XG4gICAgICAgIHJldHVybiBjYWxsQW5kQ2F0Y2hFeGNlcHRpb24oZnVuY3Rpb24gKCkge1xuICAgICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0YXJnZXQsIHByb3BlcnR5S2V5LCBhdHRyaWJ1dGVzKTtcbiAgICAgICAgfSk7XG4gICAgICB9LFxuXG4gICAgICBnZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3I6IGZ1bmN0aW9uIGdldE93blByb3BlcnR5RGVzY3JpcHRvcih0YXJnZXQsIHByb3BlcnR5S2V5KSB7XG4gICAgICAgIHRocm93VW5sZXNzVGFyZ2V0SXNPYmplY3QodGFyZ2V0KTtcbiAgICAgICAgcmV0dXJuIE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IodGFyZ2V0LCBwcm9wZXJ0eUtleSk7XG4gICAgICB9LFxuXG4gICAgICAvLyBTeW50YXggaW4gYSBmdW5jdGlvbmFsIGZvcm0uXG4gICAgICBnZXQ6IGZ1bmN0aW9uIGdldCh0YXJnZXQsIGtleSkge1xuICAgICAgICB0aHJvd1VubGVzc1RhcmdldElzT2JqZWN0KHRhcmdldCk7XG4gICAgICAgIHZhciByZWNlaXZlciA9IGFyZ3VtZW50cy5sZW5ndGggPiAyID8gYXJndW1lbnRzWzJdIDogdGFyZ2V0O1xuXG4gICAgICAgIHJldHVybiBpbnRlcm5hbEdldCh0YXJnZXQsIGtleSwgcmVjZWl2ZXIpO1xuICAgICAgfSxcblxuICAgICAgc2V0OiBmdW5jdGlvbiBzZXQodGFyZ2V0LCBrZXksIHZhbHVlKSB7XG4gICAgICAgIHRocm93VW5sZXNzVGFyZ2V0SXNPYmplY3QodGFyZ2V0KTtcbiAgICAgICAgdmFyIHJlY2VpdmVyID0gYXJndW1lbnRzLmxlbmd0aCA+IDMgPyBhcmd1bWVudHNbM10gOiB0YXJnZXQ7XG5cbiAgICAgICAgcmV0dXJuIGludGVybmFsU2V0KHRhcmdldCwga2V5LCB2YWx1ZSwgcmVjZWl2ZXIpO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgaWYgKE9iamVjdC5nZXRQcm90b3R5cGVPZikge1xuICAgIHZhciBvYmplY3REb3RHZXRQcm90b3R5cGVPZiA9IE9iamVjdC5nZXRQcm90b3R5cGVPZjtcbiAgICBSZWZsZWN0U2hpbXMuZ2V0UHJvdG90eXBlT2YgPSBmdW5jdGlvbiBnZXRQcm90b3R5cGVPZih0YXJnZXQpIHtcbiAgICAgIHRocm93VW5sZXNzVGFyZ2V0SXNPYmplY3QodGFyZ2V0KTtcbiAgICAgIHJldHVybiBvYmplY3REb3RHZXRQcm90b3R5cGVPZih0YXJnZXQpO1xuICAgIH07XG4gIH1cblxuICBpZiAoT2JqZWN0LnNldFByb3RvdHlwZU9mICYmIFJlZmxlY3RTaGltcy5nZXRQcm90b3R5cGVPZikge1xuICAgIHZhciB3aWxsQ3JlYXRlQ2lyY3VsYXJQcm90b3R5cGUgPSBmdW5jdGlvbiAob2JqZWN0LCBsYXN0UHJvdG8pIHtcbiAgICAgIHZhciBwcm90byA9IGxhc3RQcm90bztcbiAgICAgIHdoaWxlIChwcm90bykge1xuICAgICAgICBpZiAob2JqZWN0ID09PSBwcm90bykge1xuICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIHByb3RvID0gUmVmbGVjdFNoaW1zLmdldFByb3RvdHlwZU9mKHByb3RvKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9O1xuXG4gICAgT2JqZWN0LmFzc2lnbihSZWZsZWN0U2hpbXMsIHtcbiAgICAgIC8vIFNldHMgdGhlIHByb3RvdHlwZSBvZiB0aGUgZ2l2ZW4gb2JqZWN0LlxuICAgICAgLy8gUmV0dXJucyB0cnVlIG9uIHN1Y2Nlc3MsIG90aGVyd2lzZSBmYWxzZS5cbiAgICAgIHNldFByb3RvdHlwZU9mOiBmdW5jdGlvbiBzZXRQcm90b3R5cGVPZihvYmplY3QsIHByb3RvKSB7XG4gICAgICAgIHRocm93VW5sZXNzVGFyZ2V0SXNPYmplY3Qob2JqZWN0KTtcbiAgICAgICAgaWYgKHByb3RvICE9PSBudWxsICYmICFFUy5UeXBlSXNPYmplY3QocHJvdG8pKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcigncHJvdG8gbXVzdCBiZSBhbiBvYmplY3Qgb3IgbnVsbCcpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gSWYgdGhleSBhbHJlYWR5IGFyZSB0aGUgc2FtZSwgd2UncmUgZG9uZS5cbiAgICAgICAgaWYgKHByb3RvID09PSBSZWZsZWN0LmdldFByb3RvdHlwZU9mKG9iamVjdCkpIHtcbiAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENhbm5vdCBhbHRlciBwcm90b3R5cGUgaWYgb2JqZWN0IG5vdCBleHRlbnNpYmxlLlxuICAgICAgICBpZiAoUmVmbGVjdC5pc0V4dGVuc2libGUgJiYgIVJlZmxlY3QuaXNFeHRlbnNpYmxlKG9iamVjdCkpIHtcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBFbnN1cmUgdGhhdCB3ZSBkbyBub3QgY3JlYXRlIGEgY2lyY3VsYXIgcHJvdG90eXBlIGNoYWluLlxuICAgICAgICBpZiAod2lsbENyZWF0ZUNpcmN1bGFyUHJvdG90eXBlKG9iamVjdCwgcHJvdG8pKSB7XG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG5cbiAgICAgICAgT2JqZWN0LnNldFByb3RvdHlwZU9mKG9iamVjdCwgcHJvdG8pO1xuXG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG4gIHZhciBkZWZpbmVPck92ZXJyaWRlUmVmbGVjdFByb3BlcnR5ID0gZnVuY3Rpb24gKGtleSwgc2hpbSkge1xuICAgIGlmICghRVMuSXNDYWxsYWJsZShnbG9iYWxzLlJlZmxlY3Rba2V5XSkpIHtcbiAgICAgIGRlZmluZVByb3BlcnR5KGdsb2JhbHMuUmVmbGVjdCwga2V5LCBzaGltKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdmFyIGFjY2VwdHNQcmltaXRpdmVzID0gdmFsdWVPckZhbHNlSWZUaHJvd3MoZnVuY3Rpb24gKCkge1xuICAgICAgICBnbG9iYWxzLlJlZmxlY3Rba2V5XSgxKTtcbiAgICAgICAgZ2xvYmFscy5SZWZsZWN0W2tleV0oTmFOKTtcbiAgICAgICAgZ2xvYmFscy5SZWZsZWN0W2tleV0odHJ1ZSk7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfSk7XG4gICAgICBpZiAoYWNjZXB0c1ByaW1pdGl2ZXMpIHtcbiAgICAgICAgb3ZlcnJpZGVOYXRpdmUoZ2xvYmFscy5SZWZsZWN0LCBrZXksIHNoaW0pO1xuICAgICAgfVxuICAgIH1cbiAgfTtcbiAgT2JqZWN0LmtleXMoUmVmbGVjdFNoaW1zKS5mb3JFYWNoKGZ1bmN0aW9uIChrZXkpIHtcbiAgICBkZWZpbmVPck92ZXJyaWRlUmVmbGVjdFByb3BlcnR5KGtleSwgUmVmbGVjdFNoaW1zW2tleV0pO1xuICB9KTtcbiAgdmFyIG9yaWdpbmFsUmVmbGVjdEdldFByb3RvID0gZ2xvYmFscy5SZWZsZWN0LmdldFByb3RvdHlwZU9mO1xuICBpZiAoZnVuY3Rpb25zSGF2ZU5hbWVzICYmIG9yaWdpbmFsUmVmbGVjdEdldFByb3RvICYmIG9yaWdpbmFsUmVmbGVjdEdldFByb3RvLm5hbWUgIT09ICdnZXRQcm90b3R5cGVPZicpIHtcbiAgICBvdmVycmlkZU5hdGl2ZShnbG9iYWxzLlJlZmxlY3QsICdnZXRQcm90b3R5cGVPZicsIGZ1bmN0aW9uIGdldFByb3RvdHlwZU9mKHRhcmdldCkge1xuICAgICAgcmV0dXJuIF9jYWxsKG9yaWdpbmFsUmVmbGVjdEdldFByb3RvLCBnbG9iYWxzLlJlZmxlY3QsIHRhcmdldCk7XG4gICAgfSk7XG4gIH1cbiAgaWYgKGdsb2JhbHMuUmVmbGVjdC5zZXRQcm90b3R5cGVPZikge1xuICAgIGlmICh2YWx1ZU9yRmFsc2VJZlRocm93cyhmdW5jdGlvbiAoKSB7XG4gICAgICBnbG9iYWxzLlJlZmxlY3Quc2V0UHJvdG90eXBlT2YoMSwge30pO1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSkpIHtcbiAgICAgIG92ZXJyaWRlTmF0aXZlKGdsb2JhbHMuUmVmbGVjdCwgJ3NldFByb3RvdHlwZU9mJywgUmVmbGVjdFNoaW1zLnNldFByb3RvdHlwZU9mKTtcbiAgICB9XG4gIH1cbiAgaWYgKGdsb2JhbHMuUmVmbGVjdC5kZWZpbmVQcm9wZXJ0eSkge1xuICAgIGlmICghdmFsdWVPckZhbHNlSWZUaHJvd3MoZnVuY3Rpb24gKCkge1xuICAgICAgdmFyIGJhc2ljID0gIWdsb2JhbHMuUmVmbGVjdC5kZWZpbmVQcm9wZXJ0eSgxLCAndGVzdCcsIHsgdmFsdWU6IDEgfSk7XG4gICAgICAvLyBcImV4dGVuc2libGVcIiBmYWlscyBvbiBFZGdlIDAuMTJcbiAgICAgIHZhciBleHRlbnNpYmxlID0gdHlwZW9mIE9iamVjdC5wcmV2ZW50RXh0ZW5zaW9ucyAhPT0gJ2Z1bmN0aW9uJyB8fCAhZ2xvYmFscy5SZWZsZWN0LmRlZmluZVByb3BlcnR5KE9iamVjdC5wcmV2ZW50RXh0ZW5zaW9ucyh7fSksICd0ZXN0Jywge30pO1xuICAgICAgcmV0dXJuIGJhc2ljICYmIGV4dGVuc2libGU7XG4gICAgfSkpIHtcbiAgICAgIG92ZXJyaWRlTmF0aXZlKGdsb2JhbHMuUmVmbGVjdCwgJ2RlZmluZVByb3BlcnR5JywgUmVmbGVjdFNoaW1zLmRlZmluZVByb3BlcnR5KTtcbiAgICB9XG4gIH1cbiAgaWYgKGdsb2JhbHMuUmVmbGVjdC5jb25zdHJ1Y3QpIHtcbiAgICBpZiAoIXZhbHVlT3JGYWxzZUlmVGhyb3dzKGZ1bmN0aW9uICgpIHtcbiAgICAgIHZhciBGID0gZnVuY3Rpb24gRigpIHt9O1xuICAgICAgcmV0dXJuIGdsb2JhbHMuUmVmbGVjdC5jb25zdHJ1Y3QoZnVuY3Rpb24gKCkge30sIFtdLCBGKSBpbnN0YW5jZW9mIEY7XG4gICAgfSkpIHtcbiAgICAgIG92ZXJyaWRlTmF0aXZlKGdsb2JhbHMuUmVmbGVjdCwgJ2NvbnN0cnVjdCcsIFJlZmxlY3RTaGltcy5jb25zdHJ1Y3QpO1xuICAgIH1cbiAgfVxuXG4gIGlmIChTdHJpbmcobmV3IERhdGUoTmFOKSkgIT09ICdJbnZhbGlkIERhdGUnKSB7XG4gICAgdmFyIGRhdGVUb1N0cmluZyA9IERhdGUucHJvdG90eXBlLnRvU3RyaW5nO1xuICAgIHZhciBzaGltbWVkRGF0ZVRvU3RyaW5nID0gZnVuY3Rpb24gdG9TdHJpbmcoKSB7XG4gICAgICB2YXIgdmFsdWVPZiA9ICt0aGlzO1xuICAgICAgaWYgKHZhbHVlT2YgIT09IHZhbHVlT2YpIHtcbiAgICAgICAgcmV0dXJuICdJbnZhbGlkIERhdGUnO1xuICAgICAgfVxuICAgICAgcmV0dXJuIEVTLkNhbGwoZGF0ZVRvU3RyaW5nLCB0aGlzKTtcbiAgICB9O1xuICAgIG92ZXJyaWRlTmF0aXZlKERhdGUucHJvdG90eXBlLCAndG9TdHJpbmcnLCBzaGltbWVkRGF0ZVRvU3RyaW5nKTtcbiAgfVxuXG4gIC8vIEFubmV4IEIgSFRNTCBtZXRob2RzXG4gIC8vIGh0dHBzOi8vcGVvcGxlLm1vemlsbGEub3JnL35qb3JlbmRvcmZmL2VzNi1kcmFmdC5odG1sI3NlYy1hZGRpdGlvbmFsLXByb3BlcnRpZXMtb2YtdGhlLXN0cmluZy5wcm90b3R5cGUtb2JqZWN0XG4gIHZhciBzdHJpbmdIVE1Mc2hpbXMgPSB7XG4gICAgYW5jaG9yOiBmdW5jdGlvbiBhbmNob3IobmFtZSkgeyByZXR1cm4gRVMuQ3JlYXRlSFRNTCh0aGlzLCAnYScsICduYW1lJywgbmFtZSk7IH0sXG4gICAgYmlnOiBmdW5jdGlvbiBiaWcoKSB7IHJldHVybiBFUy5DcmVhdGVIVE1MKHRoaXMsICdiaWcnLCAnJywgJycpOyB9LFxuICAgIGJsaW5rOiBmdW5jdGlvbiBibGluaygpIHsgcmV0dXJuIEVTLkNyZWF0ZUhUTUwodGhpcywgJ2JsaW5rJywgJycsICcnKTsgfSxcbiAgICBib2xkOiBmdW5jdGlvbiBib2xkKCkgeyByZXR1cm4gRVMuQ3JlYXRlSFRNTCh0aGlzLCAnYicsICcnLCAnJyk7IH0sXG4gICAgZml4ZWQ6IGZ1bmN0aW9uIGZpeGVkKCkgeyByZXR1cm4gRVMuQ3JlYXRlSFRNTCh0aGlzLCAndHQnLCAnJywgJycpOyB9LFxuICAgIGZvbnRjb2xvcjogZnVuY3Rpb24gZm9udGNvbG9yKGNvbG9yKSB7IHJldHVybiBFUy5DcmVhdGVIVE1MKHRoaXMsICdmb250JywgJ2NvbG9yJywgY29sb3IpOyB9LFxuICAgIGZvbnRzaXplOiBmdW5jdGlvbiBmb250c2l6ZShzaXplKSB7IHJldHVybiBFUy5DcmVhdGVIVE1MKHRoaXMsICdmb250JywgJ3NpemUnLCBzaXplKTsgfSxcbiAgICBpdGFsaWNzOiBmdW5jdGlvbiBpdGFsaWNzKCkgeyByZXR1cm4gRVMuQ3JlYXRlSFRNTCh0aGlzLCAnaScsICcnLCAnJyk7IH0sXG4gICAgbGluazogZnVuY3Rpb24gbGluayh1cmwpIHsgcmV0dXJuIEVTLkNyZWF0ZUhUTUwodGhpcywgJ2EnLCAnaHJlZicsIHVybCk7IH0sXG4gICAgc21hbGw6IGZ1bmN0aW9uIHNtYWxsKCkgeyByZXR1cm4gRVMuQ3JlYXRlSFRNTCh0aGlzLCAnc21hbGwnLCAnJywgJycpOyB9LFxuICAgIHN0cmlrZTogZnVuY3Rpb24gc3RyaWtlKCkgeyByZXR1cm4gRVMuQ3JlYXRlSFRNTCh0aGlzLCAnc3RyaWtlJywgJycsICcnKTsgfSxcbiAgICBzdWI6IGZ1bmN0aW9uIHN1YigpIHsgcmV0dXJuIEVTLkNyZWF0ZUhUTUwodGhpcywgJ3N1YicsICcnLCAnJyk7IH0sXG4gICAgc3VwOiBmdW5jdGlvbiBzdWIoKSB7IHJldHVybiBFUy5DcmVhdGVIVE1MKHRoaXMsICdzdXAnLCAnJywgJycpOyB9XG4gIH07XG4gIF9mb3JFYWNoKE9iamVjdC5rZXlzKHN0cmluZ0hUTUxzaGltcyksIGZ1bmN0aW9uIChrZXkpIHtcbiAgICB2YXIgbWV0aG9kID0gU3RyaW5nLnByb3RvdHlwZVtrZXldO1xuICAgIHZhciBzaG91bGRPdmVyd3JpdGUgPSBmYWxzZTtcbiAgICBpZiAoRVMuSXNDYWxsYWJsZShtZXRob2QpKSB7XG4gICAgICB2YXIgb3V0cHV0ID0gX2NhbGwobWV0aG9kLCAnJywgJyBcIiAnKTtcbiAgICAgIHZhciBxdW90ZXNDb3VudCA9IF9jb25jYXQoW10sIG91dHB1dC5tYXRjaCgvXCIvZykpLmxlbmd0aDtcbiAgICAgIHNob3VsZE92ZXJ3cml0ZSA9IG91dHB1dCAhPT0gb3V0cHV0LnRvTG93ZXJDYXNlKCkgfHwgcXVvdGVzQ291bnQgPiAyO1xuICAgIH0gZWxzZSB7XG4gICAgICBzaG91bGRPdmVyd3JpdGUgPSB0cnVlO1xuICAgIH1cbiAgICBpZiAoc2hvdWxkT3ZlcndyaXRlKSB7XG4gICAgICBvdmVycmlkZU5hdGl2ZShTdHJpbmcucHJvdG90eXBlLCBrZXksIHN0cmluZ0hUTUxzaGltc1trZXldKTtcbiAgICB9XG4gIH0pO1xuXG4gIHZhciBKU09Oc3RyaW5naWZpZXNTeW1ib2xzID0gKGZ1bmN0aW9uICgpIHtcbiAgICAvLyBNaWNyb3NvZnQgRWRnZSB2MC4xMiBzdHJpbmdpZmllcyBTeW1ib2xzIGluY29ycmVjdGx5XG4gICAgaWYgKCFoYXNTeW1ib2xzKSB7IHJldHVybiBmYWxzZTsgfSAvLyBTeW1ib2xzIGFyZSBub3Qgc3VwcG9ydGVkXG4gICAgdmFyIHN0cmluZ2lmeSA9IHR5cGVvZiBKU09OID09PSAnb2JqZWN0JyAmJiB0eXBlb2YgSlNPTi5zdHJpbmdpZnkgPT09ICdmdW5jdGlvbicgPyBKU09OLnN0cmluZ2lmeSA6IG51bGw7XG4gICAgaWYgKCFzdHJpbmdpZnkpIHsgcmV0dXJuIGZhbHNlOyB9IC8vIEpTT04uc3RyaW5naWZ5IGlzIG5vdCBzdXBwb3J0ZWRcbiAgICBpZiAodHlwZW9mIHN0cmluZ2lmeShTeW1ib2woKSkgIT09ICd1bmRlZmluZWQnKSB7IHJldHVybiB0cnVlOyB9IC8vIFN5bWJvbHMgc2hvdWxkIGJlY29tZSBgdW5kZWZpbmVkYFxuICAgIGlmIChzdHJpbmdpZnkoW1N5bWJvbCgpXSkgIT09ICdbbnVsbF0nKSB7IHJldHVybiB0cnVlOyB9IC8vIFN5bWJvbHMgaW4gYXJyYXlzIHNob3VsZCBiZWNvbWUgYG51bGxgXG4gICAgdmFyIG9iaiA9IHsgYTogU3ltYm9sKCkgfTtcbiAgICBvYmpbU3ltYm9sKCldID0gdHJ1ZTtcbiAgICBpZiAoc3RyaW5naWZ5KG9iaikgIT09ICd7fScpIHsgcmV0dXJuIHRydWU7IH0gLy8gU3ltYm9sLXZhbHVlZCBrZXlzICphbmQqIFN5bWJvbC12YWx1ZWQgcHJvcGVydGllcyBzaG91bGQgYmUgb21pdHRlZFxuICAgIHJldHVybiBmYWxzZTtcbiAgfSgpKTtcbiAgdmFyIEpTT05zdHJpbmdpZnlBY2NlcHRzT2JqZWN0U3ltYm9sID0gdmFsdWVPckZhbHNlSWZUaHJvd3MoZnVuY3Rpb24gKCkge1xuICAgIC8vIENocm9tZSA0NSB0aHJvd3Mgb24gc3RyaW5naWZ5aW5nIG9iamVjdCBzeW1ib2xzXG4gICAgaWYgKCFoYXNTeW1ib2xzKSB7IHJldHVybiB0cnVlOyB9IC8vIFN5bWJvbHMgYXJlIG5vdCBzdXBwb3J0ZWRcbiAgICByZXR1cm4gSlNPTi5zdHJpbmdpZnkoT2JqZWN0KFN5bWJvbCgpKSkgPT09ICd7fScgJiYgSlNPTi5zdHJpbmdpZnkoW09iamVjdChTeW1ib2woKSldKSA9PT0gJ1t7fV0nO1xuICB9KTtcbiAgaWYgKEpTT05zdHJpbmdpZmllc1N5bWJvbHMgfHwgIUpTT05zdHJpbmdpZnlBY2NlcHRzT2JqZWN0U3ltYm9sKSB7XG4gICAgdmFyIG9yaWdTdHJpbmdpZnkgPSBKU09OLnN0cmluZ2lmeTtcbiAgICBvdmVycmlkZU5hdGl2ZShKU09OLCAnc3RyaW5naWZ5JywgZnVuY3Rpb24gc3RyaW5naWZ5KHZhbHVlKSB7XG4gICAgICBpZiAodHlwZW9mIHZhbHVlID09PSAnc3ltYm9sJykgeyByZXR1cm47IH1cbiAgICAgIHZhciByZXBsYWNlcjtcbiAgICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID4gMSkge1xuICAgICAgICByZXBsYWNlciA9IGFyZ3VtZW50c1sxXTtcbiAgICAgIH1cbiAgICAgIHZhciBhcmdzID0gW3ZhbHVlXTtcbiAgICAgIGlmICghaXNBcnJheShyZXBsYWNlcikpIHtcbiAgICAgICAgdmFyIHJlcGxhY2VGbiA9IEVTLklzQ2FsbGFibGUocmVwbGFjZXIpID8gcmVwbGFjZXIgOiBudWxsO1xuICAgICAgICB2YXIgd3JhcHBlZFJlcGxhY2VyID0gZnVuY3Rpb24gKGtleSwgdmFsKSB7XG4gICAgICAgICAgdmFyIHBhcnNlZFZhbHVlID0gcmVwbGFjZUZuID8gX2NhbGwocmVwbGFjZUZuLCB0aGlzLCBrZXksIHZhbCkgOiB2YWw7XG4gICAgICAgICAgaWYgKHR5cGVvZiBwYXJzZWRWYWx1ZSAhPT0gJ3N5bWJvbCcpIHtcbiAgICAgICAgICAgIGlmIChUeXBlLnN5bWJvbChwYXJzZWRWYWx1ZSkpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIGFzc2lnblRvKHt9KShwYXJzZWRWYWx1ZSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICByZXR1cm4gcGFyc2VkVmFsdWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgICBhcmdzLnB1c2god3JhcHBlZFJlcGxhY2VyKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIGNyZWF0ZSB3cmFwcGVkIHJlcGxhY2VyIHRoYXQgaGFuZGxlcyBhbiBhcnJheSByZXBsYWNlcj9cbiAgICAgICAgYXJncy5wdXNoKHJlcGxhY2VyKTtcbiAgICAgIH1cbiAgICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID4gMikge1xuICAgICAgICBhcmdzLnB1c2goYXJndW1lbnRzWzJdKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBvcmlnU3RyaW5naWZ5LmFwcGx5KHRoaXMsIGFyZ3MpO1xuICAgIH0pO1xuICB9XG5cbiAgcmV0dXJuIGdsb2JhbHM7XG59KSk7XG4iLCIvLyBzaGltIGZvciB1c2luZyBwcm9jZXNzIGluIGJyb3dzZXJcblxudmFyIHByb2Nlc3MgPSBtb2R1bGUuZXhwb3J0cyA9IHt9O1xudmFyIHF1ZXVlID0gW107XG52YXIgZHJhaW5pbmcgPSBmYWxzZTtcbnZhciBjdXJyZW50UXVldWU7XG52YXIgcXVldWVJbmRleCA9IC0xO1xuXG5mdW5jdGlvbiBjbGVhblVwTmV4dFRpY2soKSB7XG4gICAgZHJhaW5pbmcgPSBmYWxzZTtcbiAgICBpZiAoY3VycmVudFF1ZXVlLmxlbmd0aCkge1xuICAgICAgICBxdWV1ZSA9IGN1cnJlbnRRdWV1ZS5jb25jYXQocXVldWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHF1ZXVlSW5kZXggPSAtMTtcbiAgICB9XG4gICAgaWYgKHF1ZXVlLmxlbmd0aCkge1xuICAgICAgICBkcmFpblF1ZXVlKCk7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBkcmFpblF1ZXVlKCkge1xuICAgIGlmIChkcmFpbmluZykge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIHZhciB0aW1lb3V0ID0gc2V0VGltZW91dChjbGVhblVwTmV4dFRpY2spO1xuICAgIGRyYWluaW5nID0gdHJ1ZTtcblxuICAgIHZhciBsZW4gPSBxdWV1ZS5sZW5ndGg7XG4gICAgd2hpbGUobGVuKSB7XG4gICAgICAgIGN1cnJlbnRRdWV1ZSA9IHF1ZXVlO1xuICAgICAgICBxdWV1ZSA9IFtdO1xuICAgICAgICB3aGlsZSAoKytxdWV1ZUluZGV4IDwgbGVuKSB7XG4gICAgICAgICAgICBpZiAoY3VycmVudFF1ZXVlKSB7XG4gICAgICAgICAgICAgICAgY3VycmVudFF1ZXVlW3F1ZXVlSW5kZXhdLnJ1bigpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHF1ZXVlSW5kZXggPSAtMTtcbiAgICAgICAgbGVuID0gcXVldWUubGVuZ3RoO1xuICAgIH1cbiAgICBjdXJyZW50UXVldWUgPSBudWxsO1xuICAgIGRyYWluaW5nID0gZmFsc2U7XG4gICAgY2xlYXJUaW1lb3V0KHRpbWVvdXQpO1xufVxuXG5wcm9jZXNzLm5leHRUaWNrID0gZnVuY3Rpb24gKGZ1bikge1xuICAgIHZhciBhcmdzID0gbmV3IEFycmF5KGFyZ3VtZW50cy5sZW5ndGggLSAxKTtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgZm9yICh2YXIgaSA9IDE7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGFyZ3NbaSAtIDFdID0gYXJndW1lbnRzW2ldO1xuICAgICAgICB9XG4gICAgfVxuICAgIHF1ZXVlLnB1c2gobmV3IEl0ZW0oZnVuLCBhcmdzKSk7XG4gICAgaWYgKHF1ZXVlLmxlbmd0aCA9PT0gMSAmJiAhZHJhaW5pbmcpIHtcbiAgICAgICAgc2V0VGltZW91dChkcmFpblF1ZXVlLCAwKTtcbiAgICB9XG59O1xuXG4vLyB2OCBsaWtlcyBwcmVkaWN0aWJsZSBvYmplY3RzXG5mdW5jdGlvbiBJdGVtKGZ1biwgYXJyYXkpIHtcbiAgICB0aGlzLmZ1biA9IGZ1bjtcbiAgICB0aGlzLmFycmF5ID0gYXJyYXk7XG59XG5JdGVtLnByb3RvdHlwZS5ydW4gPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5mdW4uYXBwbHkobnVsbCwgdGhpcy5hcnJheSk7XG59O1xucHJvY2Vzcy50aXRsZSA9ICdicm93c2VyJztcbnByb2Nlc3MuYnJvd3NlciA9IHRydWU7XG5wcm9jZXNzLmVudiA9IHt9O1xucHJvY2Vzcy5hcmd2ID0gW107XG5wcm9jZXNzLnZlcnNpb24gPSAnJzsgLy8gZW1wdHkgc3RyaW5nIHRvIGF2b2lkIHJlZ2V4cCBpc3N1ZXNcbnByb2Nlc3MudmVyc2lvbnMgPSB7fTtcblxuZnVuY3Rpb24gbm9vcCgpIHt9XG5cbnByb2Nlc3Mub24gPSBub29wO1xucHJvY2Vzcy5hZGRMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLm9uY2UgPSBub29wO1xucHJvY2Vzcy5vZmYgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUFsbExpc3RlbmVycyA9IG5vb3A7XG5wcm9jZXNzLmVtaXQgPSBub29wO1xuXG5wcm9jZXNzLmJpbmRpbmcgPSBmdW5jdGlvbiAobmFtZSkge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5iaW5kaW5nIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn07XG5cbnByb2Nlc3MuY3dkID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gJy8nIH07XG5wcm9jZXNzLmNoZGlyID0gZnVuY3Rpb24gKGRpcikge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5jaGRpciBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xucHJvY2Vzcy51bWFzayA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gMDsgfTtcbiIsImltcG9ydCAqIGFzIG9wdCBmcm9tICcuL21haW4vT3B0aW9uJztcclxuaW1wb3J0ICogYXMgbGlzdCBmcm9tICcuL21haW4vTGlzdCc7XHJcbmltcG9ydCAqIGFzIG1hcCBmcm9tICcuL21haW4vTWFwJztcclxuXHJcbi8qKlxyXG4gKiBFeHBvcnQgdG8gcHVibGljIGFzIHR5cGVzY3JpcHQgbW9kdWxlcy5cclxuICovXHJcbmV4cG9ydCB7XHJcbiAgb3B0LCBsaXN0LCBtYXBcclxufTtcclxuXHJcbi8qKlxyXG4gKiBFeHBvcnQgdG8gcHVibGljIGJ5IGJpbmRpbmcgdGhlbSB0byB0aGUgd2luZG93IHByb3BlcnR5LlxyXG4gKi9cclxud2luZG93WydBcHAnXSA9IHtcclxuICBvcHQ6IG9wdCxcclxuICBsaXN0OiBsaXN0LFxyXG4gIG1hcDogbWFwXHJcbn07XHJcblxyXG4iLCJpbXBvcnQge29wdGlvbiwgT3B0aW9ufSBmcm9tIFwiLi9PcHRpb25cIlxuaW1wb3J0IHtsaXN0LCBMaXN0fSBmcm9tIFwiLi9MaXN0XCJcblxuZXhwb3J0IGludGVyZmFjZSBJdGVyYWJsZTxBPiB7XG4gIGNvdW50KHAgOiAoeCA6IEEpID0+IGJvb2xlYW4pIDogbnVtYmVyXG4gIGZvckVhY2goZjogKGEgOiBBKSA9PiB2b2lkKVxuICBkcm9wKG4gOiBudW1iZXIpIDogSXRlcmFibGU8QT5cbiAgZHJvcFJpZ2h0KG4gOiBudW1iZXIpIDogSXRlcmFibGU8QT5cbiAgZHJvcFdoaWxlKHA6IChhOiBBKSA9PiBib29sZWFuKSA6IEl0ZXJhYmxlPEE+XG4gIGZpbHRlcihwOiAoYTogQSkgPT4gYm9vbGVhbikgOiBJdGVyYWJsZTxBPlxuICBmaWx0ZXJOb3QocDogKGE6IEEpID0+IGJvb2xlYW4pIDogSXRlcmFibGU8QT5cbiAgZm9sZExlZnQ8Qj4oejogQik6IChvcDogKGIgOiBCLCBhIDogQSkgPT4gQikgPT4gQlxuICBmb2xkUmlnaHQ8Qj4oejogQik6IChvcDogKGEgOiBBLCBiIDogQikgPT4gQikgPT4gQlxuICBoZWFkKCk6IEFcbiAgaGVhZE9wdGlvbigpOiBPcHRpb248QT5cblxuICBtYXA8Qj4oZiA6IChhIDogQSkgPT4gQikgOiBJdGVyYWJsZTxCPlxuXG4gIHRvQXJyYXkoKSA6IEFbXVxuICB0b0xpc3QoKSA6IExpc3Q8QT5cbn1cblxuZXhwb3J0IGFic3RyYWN0IGNsYXNzIEl0ZXJhYmxlSW1wbDxBPiBpbXBsZW1lbnRzIEl0ZXJhYmxlPEE+IHtcblxuICBwcml2YXRlIF9pdGVyYXRvciA6IEl0ZXJhdG9yPEE+O1xuICBwcml2YXRlIF9kYXRhIDogSXRlcmFibGU8QT47XG5cbiAgY29uc3RydWN0b3IoaXRlcmF0b3IgOiBJdGVyYXRvcjxBPiwgZGF0YSA/OiBJdGVyYWJsZTxBPikge1xuICAgIHRoaXMuX2l0ZXJhdG9yID0gaXRlcmF0b3I7XG4gICAgdGhpcy5fZGF0YSA9IGRhdGE7XG4gIH1cblxuICBwdWJsaWMgY291bnQocCA6ICh4IDogQSkgPT4gQm9vbGVhbikgOiBudW1iZXIge1xuICAgIGxldCBjb3VudCA9IDA7XG4gICAgZm9yIChsZXQgaSA9IHRoaXMuX2l0ZXJhdG9yLm5leHQoKTsgIWkuZG9uZTsgaSA9IHRoaXMuX2l0ZXJhdG9yLm5leHQoKSkge1xuICAgICAgY29uc3QgcmVzdWx0ID0gcChpLnZhbHVlKTtcbiAgICAgIGNvdW50ID0gcmVzdWx0ID8gY291bnQgKyAxIDogY291bnQ7XG4gICAgfVxuICAgIHJldHVybiBjb3VudDtcbiAgfVxuXG4gIHB1YmxpYyBmb3JFYWNoKGY6IChhIDogQSkgPT4gdm9pZCkge1xuICAgIGZvciAobGV0IGkgPSB0aGlzLl9pdGVyYXRvci5uZXh0KCk7ICFpLmRvbmU7IGkgPSB0aGlzLl9pdGVyYXRvci5uZXh0KCkpIHtcbiAgICAgIGYoaS52YWx1ZSk7XG4gICAgfVxuICB9XG5cbiAgcHVibGljIGZvbGRMZWZ0PEI+KHo6IEIpOiAob3A6IChiIDogQiwgYSA6IEEpID0+IEIpID0+IEIge1xuICAgIHJldHVybiB0aGlzLl9kYXRhLmZvbGRMZWZ0KHopO1xuICB9XG5cbiAgcHVibGljIGZvbGRSaWdodDxCPih6OiBCKTogKG9wOiAoYSA6IEEsIGIgOiBCKSA9PiBCKSA9PiBCIHtcbiAgICByZXR1cm4gdGhpcy5fZGF0YS5mb2xkUmlnaHQoeik7XG4gIH1cblxuICBwdWJsaWMgaGVhZCgpOiBBIHtcbiAgICByZXR1cm4gdGhpcy5faXRlcmF0b3IubmV4dCgpLnZhbHVlO1xuICB9XG5cbiAgcHVibGljIGhlYWRPcHRpb24oKTogT3B0aW9uPEE+IHtcbiAgICByZXR1cm4gb3B0aW9uKHRoaXMuaGVhZCgpKTtcbiAgfVxuXG4gIHB1YmxpYyBpdGVyYXRvcigpOiBJdGVyYWJsZTxBPiB7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICBwdWJsaWMgZHJvcChuIDogbnVtYmVyKSA6IEl0ZXJhYmxlPEE+IHtcbiAgICByZXR1cm4gdGhpcy5fZGF0YS5kcm9wKG4pO1xuICB9XG5cbiAgcHVibGljIGRyb3BSaWdodChuIDogbnVtYmVyKSA6IEl0ZXJhYmxlPEE+IHtcbiAgICByZXR1cm4gdGhpcy5fZGF0YS5kcm9wUmlnaHQobik7XG4gIH1cblxuICBwdWJsaWMgZHJvcFdoaWxlKHA6IChhOiBBKSA9PiBib29sZWFuKSA6IEl0ZXJhYmxlPEE+IHtcbiAgICByZXR1cm4gdGhpcy5fZGF0YS5kcm9wV2hpbGUocCk7XG4gIH1cblxuICBwdWJsaWMgZmlsdGVyKHA6IChhOiBBKSA9PiBib29sZWFuKSA6IEl0ZXJhYmxlPEE+IHtcbiAgICByZXR1cm4gdGhpcy5fZGF0YS5maWx0ZXIocCk7XG4gIH1cblxuICBwdWJsaWMgZmlsdGVyTm90KHA6IChhOiBBKSA9PiBib29sZWFuKSA6IEl0ZXJhYmxlPEE+IHtcbiAgICByZXR1cm4gdGhpcy5fZGF0YS5maWx0ZXJOb3QocCk7XG4gIH1cblxuICBwdWJsaWMgbWFwPEI+KGYgOiAoYSA6IEEpID0+IEIpIDogSXRlcmFibGU8Qj4ge1xuICAgIHJldHVybiB0aGlzLl9kYXRhLm1hcChmKTtcbiAgfVxuXG4gIHB1YmxpYyB0b0FycmF5KCkgOiBBW10ge1xuICAgIHJldHVybiB0aGlzLnRvTGlzdCgpLnRvQXJyYXkoKTtcbiAgfVxuXG4gIHB1YmxpYyB0b0xpc3QoKSA6IExpc3Q8QT4ge1xuICAgIHJldHVybiB0aGlzLl9kYXRhLnRvTGlzdCgpO1xuICB9XG59XG4iLCJpbXBvcnQge2lNYXAsIElNYXB9IGZyb20gXCIuL01hcFwiXG5pbXBvcnQge0l0ZXJhYmxlLCBJdGVyYWJsZUltcGx9IGZyb20gXCIuL0l0ZXJhYmxlXCJcbmltcG9ydCB7b3B0aW9uLCBPcHRpb259IGZyb20gXCIuL09wdGlvblwiXG5pbXBvcnQge0FycmF5IGFzIEVTNkFycmF5fSBmcm9tIFwiZXM2LXNoaW1cIlxuQXJyYXkgPSBFUzZBcnJheTtcblxuLyoqXG4gKiBBbiBJbW11dGFibGUgTGlzdCBjbGFzcyBpbiBzaW1pbGFyIHRvIGEgU2NhbGEgTGlzdC4gSXQncyBpbXBvcnRhbnQgdG8gcG9pbnQgb3V0IHRoYXQgdGhpcyBsaXN0IGlzIG5vdCBpbmZhY3QgYSByZWFsXG4gKiBMaW5rZWQgTGlzdCBpbiB0aGUgdHJhZGl0aW9uYWwgc2Vuc2UsIGluc3RlYWQgaXQgaXMgYmFja2VkIGJ5IGEgQXlwZVNjcmlwdC9KYXZhU2NyaXB0IEFycmF5IGZvciBzaW1wbGljaXR5IGFuZFxuICogcGVyZm9ybWFuY2UgcmVhc29ucyAoaS5lLiwgYXJyYXlzIGFyZSBoZWF2aWx5IG9wdGltaXplZCBieSBWTXMpIHNvIHVubGVzcyB0aGVyZSdzIGEgZ29vZCByZWFzb24gdG8gaW1wbGllbWVudCBhXG4gKiB0cmFkaXRpb25hbCBMaXN0IHRoaXMgd2lsbCByZW1haW4gdGhpcyB3YXkuIEV4dGVybmFsbHkgdGhlIExpc3QgSW50ZXJmYWNlIHdpbGwgZW5zdXJlIGltbXV0YWJsaXkgYnkgcmV0dXJuaW5nIG5ld1xuICogaW5zdGFuY2VzIG9mIHRoZSBMaXN0IGFuZCB3aWxsIG5vdCBtdXRhdGUgdGhlIExpc3Qgb3IgdGhlIHVuZGVybHlpbmcgQXJyYXkgaW4gYW55IHdheS5cbiAqL1xuZXhwb3J0IGNsYXNzIExpc3Q8QT4gaW1wbGVtZW50cyBJdGVyYWJsZTxBPiB7XG5cbiAgcHJpdmF0ZSBkYXRhIDogQVtdO1xuXG4gIGNvbnN0cnVjdG9yKGFyZ3M6IEFbXSB8IEl0ZXJhYmxlPEE+KSB7XG4gICAgaWYgKGFyZ3MgaW5zdGFuY2VvZiBFUzZBcnJheSkge1xuICAgICAgdGhpcy5kYXRhID0gYXJncy5jb25jYXQoW10pO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmRhdGEgPSBbXTtcbiAgICAgIGFyZ3MuZm9yRWFjaCgoaXRlbSkgPT4ge1xuICAgICAgICB0aGlzLmRhdGEucHVzaChpdGVtKTtcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxuXG4gIHB1YmxpYyBjb250YWlucyhlbGVtOiBBKSA6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLmRhdGEuaW5kZXhPZihlbGVtKSA+IC0xO1xuICB9XG5cbiAgcHVibGljIGNvdW50KHA6IChhIDogQSkgPT4gYm9vbGVhbikgOiBudW1iZXIge1xuICAgIHJldHVybiB0aGlzLmRhdGEuZmlsdGVyKHApLmxlbmd0aDtcbiAgfVxuXG4gIHB1YmxpYyBmb3JFYWNoKGY6IChhIDogQSkgPT4gdm9pZCkge1xuICAgIFtdLmNvbmNhdCh0aGlzLmRhdGEpLmZvckVhY2goZik7XG4gIH1cblxuICBwdWJsaWMgZHJvcChuIDogbnVtYmVyKSA6IExpc3Q8QT4ge1xuICAgIHJldHVybiBsaXN0PEE+KHRoaXMuZGF0YS5zbGljZShuKSk7XG4gIH1cblxuICBwdWJsaWMgZHJvcFJpZ2h0KG4gOiBudW1iZXIpIDogTGlzdDxBPiB7XG4gICAgcmV0dXJuIGxpc3Q8QT4odGhpcy5kYXRhLnNsaWNlKDAsIG4pKTtcbiAgfVxuXG4gIHB1YmxpYyBkcm9wV2hpbGUocDogKGE6IEEpID0+IGJvb2xlYW4pIDogTGlzdDxBPiB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiZHJvcFdoaWxlXCIpO1xuICB9XG5cbiAgcHVibGljIGZpbHRlcihwOiAoYTogQSkgPT4gYm9vbGVhbikgOiBMaXN0PEE+IHtcbiAgICByZXR1cm4gbGlzdDxBPih0aGlzLmRhdGEuZmlsdGVyKHApKTtcbiAgfVxuXG4gIHB1YmxpYyBmaWx0ZXJOb3QocDogKGE6IEEpID0+IGJvb2xlYW4pIDogTGlzdDxBPiB7XG4gICAgY29uc3QgaW52ZXJzZSA9IChhOiBBKSA9PiB7XG4gICAgICByZXR1cm4gIXAoYSk7XG4gICAgfTtcbiAgICByZXR1cm4gbGlzdDxBPih0aGlzLmRhdGEuZmlsdGVyKGludmVyc2UpKTtcbiAgfVxuXG4gIHB1YmxpYyBmaW5kKHA6IChhOiBBKSA9PiBib29sZWFuKSA6IE9wdGlvbjxBPiB7XG4gICAgcmV0dXJuIG9wdGlvbih0aGlzLmRhdGEuZmluZChwKSk7XG4gIH1cblxuICBwdWJsaWMgZm9sZExlZnQ8Qj4oejogQik6IChvcDogKGIgOiBCLCBhIDogQSkgPT4gQikgPT4gQiB7XG4gICAgbGV0IGFjY3VtdWxhdG9yIDogQiA9IHo7XG4gICAgcmV0dXJuIChvcDogKGIgOiBCLCBhIDogQSkgPT4gQikgPT4ge1xuICAgICAgdGhpcy5mb3JFYWNoKChpdGVtIDogQSkgPT4ge1xuICAgICAgICBhY2N1bXVsYXRvciA9IG9wKGFjY3VtdWxhdG9yLCBpdGVtKTtcbiAgICAgIH0pO1xuICAgICAgcmV0dXJuIGFjY3VtdWxhdG9yO1xuICAgIH1cbiAgfVxuXG4gIHB1YmxpYyBmb2xkUmlnaHQ8Qj4oejogQik6IChvcDogKGEgOiBBLCBiIDogQikgPT4gQikgPT4gQiB7XG4gICAgY29uc3QgcmV2ZXJzZWRMaXN0ID0gdGhpcy5yZXZlcnNlKCk7XG4gICAgbGV0IGFjY3VtdWxhdG9yIDogQiA9IHo7XG4gICAgLy8gQ291bGRuJ3QgZ2V0IGRlbGVnYXRlIGNhbGwgdG8gZm9sZExlZnQgaGVyZSwgVHlwZVNjcmlwdCBjb21waWxlciBpc3N1ZT8gb3IgYmFkIHN5bnRheD9cbiAgICByZXR1cm4gKG9wOiAoYSA6IEEsIGIgOiBCKSA9PiBCKSA9PiB7XG4gICAgICByZXZlcnNlZExpc3QuZm9yRWFjaCgoaXRlbSA6IEEpID0+IHtcbiAgICAgICAgYWNjdW11bGF0b3IgPSBvcChpdGVtLCBhY2N1bXVsYXRvcik7XG4gICAgICB9KTtcbiAgICAgIHJldHVybiBhY2N1bXVsYXRvcjtcbiAgICB9XG4gIH1cblxuICBwdWJsaWMgXyhpbmRleCA6bnVtYmVyKSA6IEEge1xuICAgIHJldHVybiB0aGlzLmdldChpbmRleCk7XG4gIH1cblxuICBwdWJsaWMgZ2V0KGluZGV4IDogbnVtYmVyKSA6IEEge1xuICAgIHJldHVybiB0aGlzLmRhdGFbaW5kZXhdO1xuICB9XG5cbiAgaGVhZCgpOiBBIHtcbiAgICByZXR1cm4gdGhpcy5kYXRhWzBdO1xuICB9XG5cbiAgaGVhZE9wdGlvbigpOiBPcHRpb248QT4ge1xuICAgIHJldHVybiBvcHRpb24odGhpcy5oZWFkKCkpO1xuICB9XG5cbiAgcHVibGljIGl0ZXJhdG9yKCkgOiBJdGVyYWJsZTxBPiB7XG4gICAgcmV0dXJuIG5ldyBMaXN0SXRlcmF0b3IodGhpcy5kYXRhLnZhbHVlcygpLCB0aGlzKTtcbiAgfVxuXG4gIHB1YmxpYyBtYXA8Qj4oZiA6IChhIDogQSkgPT4gQikgOiBMaXN0PEI+IHtcbiAgICBjb25zdCBuZXdBcnJheSA6IEJbXSA9IHRoaXMuZGF0YS5tYXAoZik7XG4gICAgcmV0dXJuIGxpc3QobmV3QXJyYXkpO1xuICB9XG5cbiAgcHVibGljIGdldCBsZW5ndGgoKSB7XG4gICAgcmV0dXJuIHRoaXMuZGF0YS5sZW5ndGg7XG4gIH1cblxuICBwdWJsaWMgcmVkdWNlPEExIGV4dGVuZHMgQT4ob3A6ICh4IDogQTEsIHkgOiBBMSkgPT4gQTEpIHtcbiAgICByZXR1cm4gdGhpcy5kYXRhLnJlZHVjZShvcCk7XG4gIH1cblxuICBwdWJsaWMgcmV2ZXJzZSgpIDogTGlzdDxBPiB7XG4gICAgcmV0dXJuIG5ldyBMaXN0KFtdLmNvbmNhdCh0aGlzLmRhdGEpLnJldmVyc2UoKSk7XG4gIH1cblxuICBwdWJsaWMgZ2V0IHNpemUoKSB7XG4gICAgcmV0dXJuIHRoaXMubGVuZ3RoO1xuICB9XG5cbiAgcHVibGljIHRvQXJyYXkoKSA6IEFbXSB7XG4gICAgcmV0dXJuIFtdLmNvbmNhdCh0aGlzLmRhdGEpO1xuICB9XG5cbiAgcHVibGljIHRvTGlzdCgpIDogTGlzdDxBPiB7XG4gICAgcmV0dXJuIGxpc3QodGhpcy5kYXRhKTtcbiAgfVxuXG4gIHB1YmxpYyB0b1N0cmluZygpIDogc3RyaW5nIHtcbiAgICBjb25zdCByYXdTdHJpbmcgPSB0aGlzLmRhdGEuam9pbignLCAnKTtcbiAgICByZXR1cm4gYExpc3QoJHtyYXdTdHJpbmd9KWA7XG4gIH1cblxuICBwdWJsaWMgdW5pb24odGhhdDogQVtdIHwgTGlzdDxBPikgOiBMaXN0PEE+IHtcbiAgICBpZiAodGhhdCBpbnN0YW5jZW9mIExpc3QpIHtcbiAgICAgIHJldHVybiBsaXN0PEE+KHRoaXMuZGF0YS5jb25jYXQodGhhdC50b0FycmF5KCkpKTtcbiAgICB9IGVsc2UgaWYgKHRoYXQgaW5zdGFuY2VvZiBBcnJheSl7XG4gICAgICByZXR1cm4gbGlzdDxBPih0aGlzLmRhdGEuY29uY2F0KC4uLnRoYXQpKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhyb3cgXCJVbnN1cHBvcnRlZCBUeXBlIFwiICsgdHlwZW9mIHRoYXQ7XG4gICAgfVxuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBsaXN0PEE+KGFyZ3M6IEFbXSB8IEl0ZXJhYmxlPEE+KSA6IExpc3Q8QT4ge1xuICByZXR1cm4gbmV3IExpc3QoYXJncyk7XG59XG5cbmNsYXNzIExpc3RJdGVyYXRvcjxBPiBleHRlbmRzIEl0ZXJhYmxlSW1wbDxBPiB7XG5cbn1cbiIsImltcG9ydCB7SXRlcmFibGUsIEl0ZXJhYmxlSW1wbH0gZnJvbSBcIi4vSXRlcmFibGVcIjtcclxuaW1wb3J0IHtsaXN0LCBMaXN0fSBmcm9tIFwiLi9MaXN0XCI7XHJcbmltcG9ydCB7b3B0aW9uLCBPcHRpb259IGZyb20gXCIuL09wdGlvblwiO1xyXG5pbXBvcnQge0FycmF5IGFzIEVTNkFycmF5LCBNYXAgYXMgRVM2TWFwfSBmcm9tIFwiZXM2LXNoaW1cIjtcclxuQXJyYXkgPSBFUzZBcnJheTtcclxuXHJcbmV4cG9ydCBjbGFzcyBJTWFwPEssVj4gaW1wbGVtZW50cyBJdGVyYWJsZTxbSyxWXT4ge1xyXG5cclxuICBwcml2YXRlIGRhdGEgOiBNYXA8SyxWPjtcclxuXHJcbiAgY29uc3RydWN0b3IoZGF0YSA6IEl0ZXJhYmxlPFtLLFZdPikge1xyXG4gICAgdGhpcy5kYXRhID0gbmV3IE1hcDxLLFY+KCk7XHJcbiAgICBpZiAoZGF0YSkge1xyXG4gICAgICBkYXRhLmZvckVhY2goKHBhaXIgOiBbSyxWXSkgPT4ge1xyXG4gICAgICAgIHRoaXMuZGF0YS5zZXQocGFpclswXSwgcGFpclsxXSk7XHJcbiAgICAgIH0pO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgcHVibGljIGNvdW50KHA6ICh0dXBsZSA6IFtLLFZdKSA9PiBib29sZWFuKSA6IG51bWJlciB7XHJcbiAgICByZXR1cm4gbmV3IElNYXBJdGVyYXRvcih0aGlzLmRhdGEuZW50cmllcygpKS5jb3VudChwKTtcclxuICB9XHJcblxyXG4gIHB1YmxpYyBkcm9wKG4gOiBudW1iZXIpIDogSU1hcDxLLFY+IHtcclxuICAgIGxldCBjb3VudCA9IDA7XHJcbiAgICBjb25zdCBuZXdNYXAgPSBuZXcgTWFwPEssVj4oKTtcclxuICAgIG5ldyBJTWFwSXRlcmF0b3IodGhpcy5kYXRhLmVudHJpZXMoKSkuZm9yRWFjaCgocGFpciA6IFtLLFZdKSA9PiB7XHJcbiAgICAgICBpZiAoY291bnQgPj0gbikge1xyXG4gICAgICAgICBuZXdNYXAuc2V0KHBhaXJbMF0sIHBhaXJbMV0pO1xyXG4gICAgICAgfVxyXG4gICAgfSk7XHJcbiAgICByZXR1cm4gbmV3IElNYXA8SyxWPihuZXcgSU1hcEl0ZXJhdG9yKHRoaXMuZGF0YS5lbnRyaWVzKCkpKTtcclxuICB9XHJcblxyXG4gIHB1YmxpYyBkcm9wUmlnaHQobiA6IG51bWJlcikgOiBJTWFwPEssVj4ge1xyXG4gICAgbGV0IGNvdW50ID0gdGhpcy5kYXRhLnNpemUgLSBuO1xyXG4gICAgY29uc3QgbmV3TWFwID0gbmV3IE1hcDxLLFY+KCk7XHJcbiAgICBuZXcgSU1hcEl0ZXJhdG9yKHRoaXMuZGF0YS5lbnRyaWVzKCkpLmZvckVhY2goKHBhaXIgOiBbSyxWXSkgPT4ge1xyXG4gICAgICBpZiAoY291bnQgPCBuKSB7XHJcbiAgICAgICAgbmV3TWFwLnNldChwYWlyWzBdLCBwYWlyWzFdKTtcclxuICAgICAgfVxyXG4gICAgfSk7XHJcbiAgICByZXR1cm4gbmV3IElNYXA8SyxWPihuZXcgSU1hcEl0ZXJhdG9yKHRoaXMuZGF0YS5lbnRyaWVzKCkpKTtcclxuICB9XHJcblxyXG4gIHB1YmxpYyBkcm9wV2hpbGUocDogKGE6IFtLLFZdKSA9PiBib29sZWFuKSA6IElNYXA8SyxWPiB7XHJcbiAgICBsZXQgY291bnQgPSAtMTtcclxuICAgIG5ldyBJTWFwSXRlcmF0b3IodGhpcy5kYXRhLmVudHJpZXMoKSkuZm9yRWFjaCgocGFpciA6IFtLLFZdKSA9PiB7XHJcbiAgICAgIGlmIChwKHBhaXIpKSB7XHJcbiAgICAgICAgY291bnQrKztcclxuICAgICAgfVxyXG4gICAgfSk7XHJcbiAgICByZXR1cm4gdGhpcy5kcm9wKGNvdW50KTtcclxuICB9XHJcblxyXG4gIHB1YmxpYyBmaWx0ZXIocDogKGE6IFtLLFZdKSA9PiBib29sZWFuKSA6IElNYXA8SyxWPiB7XHJcbiAgICBjb25zdCBuZXdJbnRlcm5hbE1hcCA9IG5ldyBNYXA8SyxWPigpO1xyXG4gICAgbmV3IElNYXBJdGVyYXRvcih0aGlzLmRhdGEuZW50cmllcygpKS5mb3JFYWNoKChwYWlyIDogW0ssVl0pID0+IHtcclxuICAgICAgaWYgKHAocGFpcikpIHtcclxuICAgICAgICBuZXdJbnRlcm5hbE1hcC5zZXQocGFpclswXSwgcGFpclsxXSk7XHJcbiAgICAgIH1cclxuICAgIH0pO1xyXG4gICAgcmV0dXJuIG5ldyBJTWFwPEssVj4obmV3IElNYXBJdGVyYXRvcihuZXdJbnRlcm5hbE1hcC5lbnRyaWVzKCkpKTtcclxuICB9XHJcblxyXG4gIHB1YmxpYyBmaWx0ZXJOb3QocDogKGE6IFtLLFZdKSA9PiBib29sZWFuKSA6IElNYXA8SyxWPiB7XHJcbiAgICBjb25zdCBuZXdJbnRlcm5hbE1hcCA9IG5ldyBNYXA8SyxWPigpO1xyXG4gICAgbmV3IElNYXBJdGVyYXRvcih0aGlzLmRhdGEuZW50cmllcygpKS5mb3JFYWNoKChwYWlyIDogW0ssVl0pID0+IHtcclxuICAgICAgaWYgKCFwKHBhaXIpKSB7XHJcbiAgICAgICAgbmV3SW50ZXJuYWxNYXAuc2V0KHBhaXJbMF0sIHBhaXJbMV0pO1xyXG4gICAgICB9XHJcbiAgICB9KTtcclxuICAgIHJldHVybiBuZXcgSU1hcDxLLFY+KG5ldyBJTWFwSXRlcmF0b3IobmV3SW50ZXJuYWxNYXAuZW50cmllcygpKSk7XHJcbiAgfVxyXG5cclxuICBwdWJsaWMgZm9sZExlZnQ8Qj4oejogQik6IChvcDogKGIgOiBCLCBhIDogW0ssVl0pID0+IEIpID0+IEIge1xyXG4gICAgcmV0dXJuIHRoaXMudG9MaXN0KCkuZm9sZExlZnQoeik7XHJcbiAgfVxyXG5cclxuICBwdWJsaWMgZm9sZFJpZ2h0PEI+KHo6IEIpOiAob3A6IChhIDogW0ssVl0sIGIgOiBCKSA9PiBCKSA9PiBCIHtcclxuICAgIHJldHVybiB0aGlzLnRvTGlzdCgpLmZvbGRSaWdodCh6KTtcclxuICB9XHJcblxyXG4gIHB1YmxpYyBmb3JFYWNoKGY6IChhIDogW0ssVl0pID0+IHZvaWQpIHtcclxuICAgIHJldHVybiBuZXcgSU1hcEl0ZXJhdG9yKHRoaXMuZGF0YS5lbnRyaWVzKCkpLmZvckVhY2goZik7XHJcbiAgfVxyXG5cclxuICBwdWJsaWMgZ2V0KGtleTogSykgOiBPcHRpb248Vj4ge1xyXG4gICAgcmV0dXJuIG9wdGlvbih0aGlzLmRhdGEuZ2V0KGtleSkpO1xyXG4gIH1cclxuXHJcbiAgcHVibGljIGdldE9yRWxzZShrZXk6IEssIGRlZmF1bHRWYWx1ZTogVikgOiBWIHtcclxuICAgIHJldHVybiBvcHRpb24odGhpcy5kYXRhLmdldChrZXkpKS5nZXRPckVsc2UoZGVmYXVsdFZhbHVlKTtcclxuICB9XHJcblxyXG4gIHB1YmxpYyBoZWFkKCkgOiBbSyxWXSB7XHJcbiAgICByZXR1cm4gdGhpcy5kYXRhLmVudHJpZXMoKS5uZXh0KCkudmFsdWU7XHJcbiAgfVxyXG5cclxuICBwdWJsaWMgaGVhZE9wdGlvbigpIDogT3B0aW9uPFtLLFZdPiB7XHJcbiAgICByZXR1cm4gb3B0aW9uKHRoaXMuZGF0YS5lbnRyaWVzKCkubmV4dCgpLnZhbHVlKTtcclxuICB9XHJcblxyXG4gIHB1YmxpYyBpdGVyYXRvcigpOiBJdGVyYWJsZTxbSyxWXT4ge1xyXG4gICAgcmV0dXJuIG5ldyBJTWFwSXRlcmF0b3IodGhpcy5kYXRhLmVudHJpZXMoKSk7XHJcbiAgfVxyXG5cclxuICBwdWJsaWMgc2V0KGVudHJ5OiBbSyxWXSB8IEssIHZhbHVlID86IFYpIDogSU1hcDxLLFY+IHtcclxuICAgIGlmIChlbnRyeSkge1xyXG4gICAgICBpZiAoZW50cnkgaW5zdGFuY2VvZiBBcnJheSkge1xyXG4gICAgICAgIHJldHVybiBpTWFwKGxpc3Q8W0ssVl0+KFtlbnRyeV0pKTtcclxuICAgICAgfSBlbHNlIGlmIChlbnRyeSAmJiB2YWx1ZSkge1xyXG4gICAgICAgIHJldHVybiBpTWFwKGxpc3Q8W0ssVl0+KFtbZW50cnksIHZhbHVlXV0pKTtcclxuICAgICAgfVxyXG4gICAgfSBlbHNlIHtcclxuICAgICAgdGhyb3cgRXJyb3IoXCJJbnZhbGlkIHNldCBcIiArIGVudHJ5KTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIHB1YmxpYyBtYXA8SzEsIFYxPihmIDogKGEgOiBbSyxWXSkgPT4gW0sxLFYxXSkgOiBJTWFwPEsxLCBWMT4ge1xyXG4gICAgY29uc3QgbmV3SW50ZXJuYWxNYXAgPSBuZXcgTWFwPEsxLFYxPigpO1xyXG4gICAgbmV3IElNYXBJdGVyYXRvcih0aGlzLmRhdGEuZW50cmllcygpKS5mb3JFYWNoKChwYWlyIDogW0ssVl0pID0+IHtcclxuICAgICAgY29uc3QgbmV3VmFsdWUgPSBmKHBhaXIpO1xyXG4gICAgICBuZXdJbnRlcm5hbE1hcC5zZXQobmV3VmFsdWVbMF0sIG5ld1ZhbHVlWzFdKTtcclxuICAgIH0pO1xyXG4gICAgcmV0dXJuIG5ldyBJTWFwPEsxLFYxPihuZXcgSU1hcEl0ZXJhdG9yPFtLMSxWMV0+KG5ld0ludGVybmFsTWFwLmVudHJpZXMoKSkpO1xyXG4gIH1cclxuXHJcbiAgcHVibGljIHRvQXJyYXkoKSA6IFtLLFZdW10gIHtcclxuICAgIHJldHVybiB0aGlzLnRvTGlzdCgpLnRvQXJyYXkoKTtcclxuICB9XHJcblxyXG4gIHB1YmxpYyB0b0xpc3QoKSA6IExpc3Q8W0ssVl0+IHtcclxuICAgIHJldHVybiBsaXN0KHRoaXMuaXRlcmF0b3IoKSk7XHJcbiAgfVxyXG5cclxuICBwdWJsaWMgdG9TdHJpbmcoKSA6IHN0cmluZyB7XHJcbiAgICBjb25zdCByYXdTdHJpbmcgPSB0aGlzLnRvQXJyYXkoKS5tYXAoKGVudHJ5IDogW0ssVl0pID0+IGAke2VudHJ5WzBdfSAtPiAke2VudHJ5WzFdfSBgKS5qb2luKCcsICcpO1xyXG4gICAgcmV0dXJuIGBNYXAoJHtyYXdTdHJpbmd9KWA7XHJcbiAgfVxyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gaU1hcDxLLFY+KGl0ZXJhYmxlIDogSXRlcmFibGU8W0ssVl0+KSA6IElNYXA8SyxWPiB7XHJcbiAgcmV0dXJuIG5ldyBJTWFwPEssVj4oaXRlcmFibGUpO1xyXG59XHJcblxyXG5jbGFzcyBJTWFwSXRlcmF0b3I8QT4gZXh0ZW5kcyBJdGVyYWJsZUltcGw8QT4ge1xyXG5cclxuICBkcm9wKG4gOiBudW1iZXIpIDogSXRlcmFibGU8QT4ge1xyXG4gICAgdGhyb3cgbmV3IEVycm9yKCk7XHJcbiAgfVxyXG4gIGRyb3BSaWdodChuIDogbnVtYmVyKSA6IEl0ZXJhYmxlPEE+IHtcclxuICAgIHRocm93IG5ldyBFcnJvcigpO1xyXG4gIH1cclxuICBkcm9wV2hpbGUocDogKGE6IEEpID0+IGJvb2xlYW4pIDogSXRlcmFibGU8QT4ge1xyXG4gICAgdGhyb3cgbmV3IEVycm9yKCk7XHJcbiAgfVxyXG4gIGZpbHRlcihwOiAoYTogQSkgPT4gYm9vbGVhbikgOiBJdGVyYWJsZTxBPiB7XHJcbiAgICB0aHJvdyBuZXcgRXJyb3IoKTtcclxuICB9XHJcbiAgZmlsdGVyTm90KHA6IChhOiBBKSA9PiBib29sZWFuKSA6IEl0ZXJhYmxlPEE+IHtcclxuICAgIHRocm93IG5ldyBFcnJvcigpO1xyXG4gIH1cclxuICBtYXA8Qj4oZiA6IChhIDogQSkgPT4gQikgOiBJdGVyYWJsZTxCPiB7XHJcbiAgICB0aHJvdyBuZXcgRXJyb3IoKTtcclxuICB9XHJcbiAgdG9MaXN0KCkgOiBMaXN0PEE+IHtcclxuICAgIHRocm93IG5ldyBFcnJvcigpO1xyXG4gIH1cclxufVxyXG4iLCJpbXBvcnQge0l0ZXJhYmxlLCBJdGVyYWJsZUltcGx9IGZyb20gXCIuL0l0ZXJhYmxlXCJcbmltcG9ydCB7TGlzdH0gZnJvbSBcIi4vTGlzdFwiXG5cbmV4cG9ydCBhYnN0cmFjdCBjbGFzcyBPcHRpb248QT4gaW1wbGVtZW50cyBJdGVyYWJsZTxBPiB7XG5cbiAgcHVibGljIGFic3RyYWN0IGlzRW1wdHkoKTogYm9vbGVhbjtcbiAgcHVibGljIHNpemU6IG51bWJlcjtcblxuICBjb25zdHJ1Y3Rvcihwcm90ZWN0ZWQgdmFsdWU6IEEpIHtcbiAgfVxuXG4gIHB1YmxpYyBjb3VudChwIDogKHggOiBBKSA9PiBib29sZWFuKSA6IG51bWJlciB7XG4gICAgcmV0dXJuIHRoaXMudG9MaXN0KCkuY291bnQocCk7XG4gIH1cblxuICBwdWJsaWMgZm9yRWFjaChmOiAoYSA6IEEpID0+IHZvaWQpIHtcbiAgICBmKHRoaXMudmFsdWUpO1xuICB9XG5cbiAgcHVibGljIGRyb3AobiA6IG51bWJlcikgOiBMaXN0PEE+IHtcbiAgICByZXR1cm4gdGhpcy50b0xpc3QoKS5kcm9wKG4pO1xuICB9XG5cbiAgcHVibGljIGRyb3BSaWdodChuIDogbnVtYmVyKSA6IExpc3Q8QT4ge1xuICAgIHJldHVybiB0aGlzLnRvTGlzdCgpLmRyb3BSaWdodChuKTtcbiAgfVxuXG4gIHB1YmxpYyBkcm9wV2hpbGUocDogKGE6IEEpID0+IGJvb2xlYW4pIDogTGlzdDxBPiB7XG4gICAgcmV0dXJuIHRoaXMudG9MaXN0KCkuZHJvcFdoaWxlKHApO1xuICB9XG5cbiAgcHVibGljIGZpbHRlcihwOiAoYTogQSkgPT4gYm9vbGVhbikgOiBPcHRpb248QT4ge1xuICAgIHJldHVybiBwKHRoaXMudmFsdWUpID8gdGhpcyA6IG5ldyBOb25lPEE+KCk7XG4gIH1cblxuICBwdWJsaWMgZmlsdGVyTm90KHA6IChhOiBBKSA9PiBib29sZWFuKSA6IE9wdGlvbjxBPiB7XG4gICAgcmV0dXJuICFwKHRoaXMudmFsdWUpID8gdGhpcyA6IG5ldyBOb25lPEE+KCk7XG4gIH1cblxuICBwdWJsaWMgZm9sZExlZnQ8Qj4oejogQik6IChvcDogKGIgOiBCLCBhIDogQSkgPT4gQikgPT4gQiB7XG4gICAgcmV0dXJuIHRoaXMudG9MaXN0KCkuZm9sZExlZnQoeik7XG4gIH1cblxuICBwdWJsaWMgZm9sZFJpZ2h0PEI+KHo6IEIpOiAob3A6IChhIDogQSwgYiA6IEIpID0+IEIpID0+IEIge1xuICAgIHJldHVybiB0aGlzLnRvTGlzdCgpLmZvbGRSaWdodCh6KTtcbiAgfVxuXG4gIHB1YmxpYyBtYXAoZjogKG9iamVjdDogQSkgPT4gYW55KSB7XG4gICAgcmV0dXJuIG5ldyBTb21lKGYodGhpcy52YWx1ZSkpO1xuICB9XG5cbiAgcHVibGljIGdldCBnZXQoKSB7XG4gICAgcmV0dXJuIHRoaXMudmFsdWU7XG4gIH1cblxuICBwdWJsaWMgZ2V0T3JFbHNlKGRlZmF1bHRWYWx1ZTogQSk6IEEge1xuICAgIHJldHVybiB0aGlzLnZhbHVlID8gdGhpcy52YWx1ZSA6IGRlZmF1bHRWYWx1ZTtcbiAgfVxuXG4gIHB1YmxpYyBoZWFkKCk6IEEge1xuICAgIHJldHVybiB0aGlzLmdldDtcbiAgfVxuXG4gIHB1YmxpYyBoZWFkT3B0aW9uKCk6IE9wdGlvbjxBPiB7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICBwdWJsaWMgdG9BcnJheSgpIDogQVtdIHtcbiAgICByZXR1cm4gdGhpcy50b0xpc3QoKS50b0FycmF5KCk7XG4gIH1cblxuICBwdWJsaWMgYWJzdHJhY3QgdG9MaXN0KCkgOiBMaXN0PEE+XG59XG5cbmV4cG9ydCBjbGFzcyBTb21lPEE+IGV4dGVuZHMgT3B0aW9uPEE+IHtcblxuICBjb25zdHJ1Y3Rvcih2YWx1ZTogQSkge1xuICAgIHN1cGVyKHZhbHVlKTtcbiAgfVxuXG4gIHB1YmxpYyBpc0VtcHR5KCkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIHB1YmxpYyBnZXQgZ2V0KCkge1xuICAgIHJldHVybiB0aGlzLnZhbHVlO1xuICB9XG5cbiAgcHVibGljIGdldCBzaXplKCk6IG51bWJlciB7XG4gICAgcmV0dXJuIDE7XG4gIH1cblxuICBwdWJsaWMgdG9MaXN0KCkgOiBMaXN0PEE+IHtcbiAgICByZXR1cm4gbmV3IExpc3QoW3RoaXMudmFsdWVdKTtcbiAgfVxufVxuXG5leHBvcnQgY2xhc3MgTm9uZTxBPiBleHRlbmRzIE9wdGlvbjxBPiB7XG5cbiAgY29uc3RydWN0b3IoKSB7XG4gICAgc3VwZXIobnVsbCk7XG4gIH1cblxuICBwdWJsaWMgaXNFbXB0eSgpIHtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIHB1YmxpYyBnZXQgZ2V0KCk6IEEge1xuICAgIHRocm93IG5ldyBFcnJvcignTm9uZS5nZXQnKTtcbiAgfVxuXG4gIHB1YmxpYyBnZXQgc2l6ZSgpOiBudW1iZXIge1xuICAgIHJldHVybiAwO1xuICB9XG5cbiAgcHVibGljIHRvTGlzdCgpIDogTGlzdDxBPiB7XG4gICAgcmV0dXJuIG5ldyBMaXN0KFtdKTtcbiAgfVxufVxuXG5leHBvcnQgY29uc3Qgbm9uZTogTm9uZTxhbnk+ID0gbmV3IE5vbmUoKTtcblxuZXhwb3J0IGZ1bmN0aW9uIG9wdGlvbjxUPih4OiBUKTogT3B0aW9uPFQ+IHtcbiAgcmV0dXJuIHggPyBzb21lKHgpIDogbm9uZTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHNvbWU8VD4oeDogVCk6IFNvbWU8VD4ge1xuICByZXR1cm4gbmV3IFNvbWUoeCk7XG59XG4iLCIiXX0=
