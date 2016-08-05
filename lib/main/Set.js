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
var ISet = (function () {
    function ISet(data) {
        var _this = this;
        this.data = new Set();
        if (data) {
            data.forEach(function (value) {
                _this.data.add(value);
            });
        }
    }
    ISet.prototype.count = function (p) {
        return new ISetIterator(this.data.keys()).count(p);
    };
    ISet.prototype.drop = function (n) {
        var count = 0;
        var newSet = new Set();
        new ISetIterator(this.data.keys()).forEach(function (value) {
            if (count >= n) {
                newSet.add(value);
            }
        });
        return new ISet(new ISetIterator(this.data.keys()));
    };
    ISet.prototype.dropRight = function (n) {
        var count = this.data.size - n;
        var newSet = new Set();
        new ISetIterator(this.data.keys()).forEach(function (value) {
            if (count < n) {
                newSet.add(value);
            }
        });
        return new ISet(new ISetIterator(this.data.keys()));
    };
    ISet.prototype.dropWhile = function (p) {
        var count = -1;
        new ISetIterator(this.data.keys()).forEach(function (pair) {
            if (p(pair)) {
                count++;
            }
        });
        return this.drop(count);
    };
    ISet.prototype.filter = function (p) {
        var newInternalSet = new Set();
        new ISetIterator(this.data.keys()).forEach(function (value) {
            if (p(value)) {
                newInternalSet.add(value);
            }
        });
        return new ISet(new ISetIterator(newInternalSet.keys()));
    };
    ISet.prototype.filterNot = function (p) {
        var newInternalSet = new Set();
        new ISetIterator(this.data.keys()).forEach(function (value) {
            if (!p(value)) {
                newInternalSet.add(value);
            }
        });
        return new ISet(new ISetIterator(newInternalSet.keys()));
    };
    ISet.prototype.find = function (p) {
        return this.toList().find(p);
    };
    ISet.prototype.foldLeft = function (z) {
        return this.toList().foldLeft(z);
    };
    ISet.prototype.foldRight = function (z) {
        return this.toList().foldRight(z);
    };
    ISet.prototype.forEach = function (f) {
        return new ISetIterator(this.data.keys()).forEach(f);
    };
    ISet.prototype.head = function () {
        return this.data.keys().next().value;
    };
    ISet.prototype.headOption = function () {
        return Option_1.option(this.data.keys().next().value);
    };
    ISet.prototype.isEmpty = function () {
        return this.size() === 0;
    };
    ISet.prototype.iterator = function () {
        return new ISetIterator(this.data.keys());
    };
    ISet.prototype.add = function (value) {
        if (value) {
            if (value instanceof Object) {
                return iSet(List_1.list([value]));
            }
        }
        else {
            return this; // This correct as it's not a new instance
        }
    };
    ISet.prototype.map = function (f) {
        var newInternalSet = new Set();
        new ISetIterator(this.data.keys()).forEach(function (pair) {
            var newValue = f(pair);
            newInternalSet.add(newValue);
        });
        return new ISet(new ISetIterator(newInternalSet.keys()));
    };
    ISet.prototype.size = function () {
        return this.data.size;
    };
    ISet.prototype.toArray = function () {
        return this.toList().toArray();
    };
    ISet.prototype.toList = function () {
        return List_1.list(this.iterator());
    };
    ISet.prototype.toString = function () {
        var rawString = this.toArray().map(function (value) { return ("" + value); }).join(', ');
        return "Set(" + rawString + ")";
    };
    return ISet;
}());
exports.ISet = ISet;
function iSet(iterable) {
    return new ISet(iterable);
}
exports.iSet = iSet;
var ISetIterator = (function (_super) {
    __extends(ISetIterator, _super);
    function ISetIterator() {
        _super.apply(this, arguments);
    }
    ISetIterator.prototype.drop = function (n) {
        throw new Error();
    };
    ISetIterator.prototype.dropRight = function (n) {
        throw new Error();
    };
    ISetIterator.prototype.dropWhile = function (p) {
        throw new Error();
    };
    ISetIterator.prototype.filter = function (p) {
        throw new Error();
    };
    ISetIterator.prototype.filterNot = function (p) {
        throw new Error();
    };
    ISetIterator.prototype.map = function (f) {
        throw new Error();
    };
    ISetIterator.prototype.toList = function () {
        throw new Error();
    };
    return ISetIterator;
}(Iterable_1.IterableImpl));
