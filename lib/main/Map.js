"use strict";
var Iterable_1 = require("./Iterable");
var es6_shim_1 = require("es6-shim");
Array = es6_shim_1.Array;
var IMap = (function () {
    function IMap() {
        this.data = new es6_shim_1.Map();
    }
    IMap.prototype.count = function (p) {
        return new Iterable_1.IterableImpl(this.data.entries()).count(p);
    };
    return IMap;
}());
exports.IMap = IMap;
