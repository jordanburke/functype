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
