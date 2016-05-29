"use strict";
var Option_1 = require("./Option");
var IterableImpl = (function () {
    function IterableImpl(iterator) {
        this._iterator = iterator;
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
    IterableImpl.prototype.head = function () {
        return this._iterator.next().value;
    };
    IterableImpl.prototype.headOption = function () {
        return Option_1.option(this.head());
    };
    return IterableImpl;
}());
exports.IterableImpl = IterableImpl;
