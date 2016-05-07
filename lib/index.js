"use strict";
var Option_1 = require('./main/Option');
exports.option = Option_1.option;
exports.some = Option_1.some;
exports.none = Option_1.none;
exports.Option = Option_1.Option;
exports.Some = Option_1.Some;
exports.None = Option_1.None;
/**
 * Export to public as typescript modules.
 */
/**
 * Export to public by binding them to the window property.
 */
window['App'] = {
    option: Option_1.option
};
