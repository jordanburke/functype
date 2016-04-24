"use strict";
/**
 * @Class representing a Wish.
 */
var Wish = (function () {
    function Wish() {
    }
    /**
     * Prints the title of the passed IGiftHolder object.
     * @param giftObj  IGiftHolder object.
     */
    Wish.prototype.printGiftTitle = function (giftObj) {
        return giftObj.title;
    };
    return Wish;
}());
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Wish;
