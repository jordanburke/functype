"use strict";
var Greeter_1 = require('./main/Greeter');
exports.Greeter = Greeter_1.default;
var Option_1 = require('./main/Option');
/**
 * Export Greeter to public as typescript modules.
 */
/**
 * Export Greeter to public by binding them to the window property.
 */
window['App'] = {
    'Greeter': Greeter_1.default,
    option: Option_1.option
};
console.log(Option_1.option(10));
