/**
 * Created by jordanburke on 4/24/16.
 */
"use strict";
var List = (function () {
    function List(args) {
        this.data = args;
    }
    List.prototype.forEach = function (f) {
        this.data.forEach(f);
    };
    List.prototype.map = function (f) {
        var newArray = this.data.map(f);
        return new List(newArray);
    };
    return List;
}());
exports.List = List;
function list(args) {
    return new List(args);
}
exports.list = list;
