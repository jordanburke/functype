"use strict";
var opt = require('./main/Option');
exports.opt = opt;
var list = require('./main/List');
exports.list = list;
var map = require('./main/Map');
exports.map = map;
/**
 * Export to public as typescript modules.
 */
/**
 * Export to public by binding them to the window property.
 */
if (window) {
    window['App'] = {
        opt: opt,
        list: list,
        map: map
    };
}
