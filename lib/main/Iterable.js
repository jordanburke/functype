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
