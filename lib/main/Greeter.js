"use strict";
var _ = require('lodash');
var Wish_1 = require('./Wish');
/**
 * @Class representing a Greeter.
 */
var Greeter = (function () {
    /** Create an Greeter. */
    function Greeter() {
        this.wish = new Wish_1.default();
    }
    /**
     * Check input is a string and Prints the input.
     * @param title  string.
     */
    Greeter.prototype.greet = function (title) {
        var myObj;
        /** Check title is string using lodash. */
        if (_.isString(title)) {
            myObj = {
                title: title
            };
        }
        else {
            myObj = {
                title: 'Hello World'
            };
        }
        return this.wish.printGiftTitle(myObj);
    };
    return Greeter;
}());
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Greeter;
