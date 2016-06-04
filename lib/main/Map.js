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
