"use strict";
var IterableImpl = (function () {
    function IterableImpl(iterator) {
        this.iterator = iterator;
    }
    IterableImpl.prototype.count = function (p) {
        var count = 0;
        for (var i = this.iterator.next(); !i.done; i = this.iterator.next()) {
            var value = i.value;
            var result = p(value);
            count = result ? count + 1 : count;
        }
        return count;
    };
    return IterableImpl;
}());
exports.IterableImpl = IterableImpl;
