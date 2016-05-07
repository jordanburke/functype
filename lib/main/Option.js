/**
 * Created by Jordan on 4/23/2016.
 */
"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var Option = (function () {
    function Option(value) {
        this.value = value;
    }
    Option.prototype.map = function (f) {
        return new Some(f(this.value));
    };
    Object.defineProperty(Option.prototype, "get", {
        get: function () {
            return this.value;
        },
        enumerable: true,
        configurable: true
    });
    Option.prototype.getOrElse = function (defaultValue) {
        return this.value ? this.value : defaultValue;
    };
    return Option;
}());
exports.Option = Option;
var Some = (function (_super) {
    __extends(Some, _super);
    function Some(value) {
        _super.call(this, value);
    }
    Object.defineProperty(Some.prototype, "isEmpty", {
        get: function () {
            return true;
        },
        enumerable: true,
        configurable: true
    });
    ;
    Object.defineProperty(Some.prototype, "get", {
        get: function () {
            return this.value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Some.prototype, "size", {
        get: function () {
            return 1;
        },
        enumerable: true,
        configurable: true
    });
    return Some;
}(Option));
exports.Some = Some;
var None = (function (_super) {
    __extends(None, _super);
    function None(none) {
        if (none === void 0) { none = null; }
        _super.call(this, none);
    }
    Object.defineProperty(None.prototype, "isEmpty", {
        get: function () {
            return true;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(None.prototype, "get", {
        get: function () {
            throw new Error('None.get');
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(None.prototype, "size", {
        get: function () {
            return 0;
        },
        enumerable: true,
        configurable: true
    });
    return None;
}(Option));
exports.None = None;
exports.none = new None();
function option(x) {
    return x ? some(x) : exports.none;
}
exports.option = option;
function some(x) {
    return new Some(x);
}
exports.some = some;
