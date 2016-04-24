/**
 * Created by Jordan on 4/23/2016.
 */
"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var lang;
(function (lang) {
    var Option = (function () {
        function Option(value) {
            this.value = value;
        }
        Option.prototype.map = function (f) {
            return new Some(f(this.value));
        };
        Option.prototype.get = function () {
            return this.value;
        };
        Option.prototype.getOrElse = function (defaultValue) {
            return this.value ? this.value : defaultValue;
        };
        return Option;
    }());
    lang.Option = Option;
    var Some = (function (_super) {
        __extends(Some, _super);
        function Some(value) {
            _super.call(this, value);
            this.isEmpty = function () {
                return false;
            };
        }
        Some.prototype.get = function () {
            return this.value;
        };
        return Some;
    }(Option));
    lang.Some = Some;
    var None = (function (_super) {
        __extends(None, _super);
        function None(none) {
            if (none === void 0) { none = null; }
            _super.call(this, none);
            this.isEmpty = function () {
                return true;
            };
        }
        None.prototype.get = function () {
            throw new Error("None.get");
        };
        return None;
    }(Option));
    lang.None = None;
})(lang = exports.lang || (exports.lang = {}));
function Option(x) {
    return new lang.Option(x);
}
exports.Option = Option;
function Some(x) {
    return new lang.Some(x);
}
exports.Some = Some;
exports.None = new lang.None();
