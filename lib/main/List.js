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
        this.data = (_a = []).concat.apply(_a, args);
        var _a;
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
