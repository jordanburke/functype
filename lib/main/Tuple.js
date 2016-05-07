"use strict";
var Tuple1 = (function () {
    function Tuple1(_1) {
        this._1 = _1;
    }
    return Tuple1;
}());
exports.Tuple1 = Tuple1;
var Tuple2 = (function () {
    function Tuple2(_1, _2) {
        this._1 = _1;
        this._2 = _2;
    }
    return Tuple2;
}());
exports.Tuple2 = Tuple2;
var Tuple3 = (function () {
    function Tuple3(_1, _2, _3) {
        this._1 = _1;
        this._2 = _2;
        this._3 = _3;
    }
    return Tuple3;
}());
exports.Tuple3 = Tuple3;
function tuple(_1, _2, _3) {
    if (_2 === void 0) { _2 = null; }
    if (_3 === void 0) { _3 = null; }
    if (_1 && _2) {
        return new Tuple2(_1, _2);
    }
    return new Tuple1(_1);
}
exports.tuple = tuple;
