(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
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
},{"./main/Option":2}],2:[function(require,module,exports){
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
},{}],3:[function(require,module,exports){

},{}]},{},[1,3])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvaW5kZXgudHMiLCJzcmMvbWFpbi9PcHRpb24udHMiLCJ0eXBpbmdzL2Jyb3dzZXIuZC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7QUNBQSx1QkFBcUQsZUFBZSxDQUFDLENBQUE7QUFNbkUsY0FBTTtBQUFFLFlBQUk7QUFBRSxZQUFJO0FBQUUsY0FBTTtBQUFFLFlBQUk7QUFBRSxZQUFJO0FBSnhDOztHQUVHO0FBS0g7O0dBRUc7QUFDSCxNQUFNLENBQUMsS0FBSyxDQUFDLEdBQUc7SUFDZCxNQUFNLEVBQUUsZUFBTTtDQUNmLENBQUM7O0FDZEY7O0dBRUc7Ozs7Ozs7QUFFSDtJQUtFLGdCQUFzQixLQUFRO1FBQVIsVUFBSyxHQUFMLEtBQUssQ0FBRztJQUM5QixDQUFDO0lBRU0sb0JBQUcsR0FBVixVQUFXLENBQXFCO1FBQzlCLE1BQU0sQ0FBQyxJQUFJLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7SUFDakMsQ0FBQztJQUVELHNCQUFXLHVCQUFHO2FBQWQ7WUFDRSxNQUFNLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQztRQUNwQixDQUFDOzs7T0FBQTtJQUVNLDBCQUFTLEdBQWhCLFVBQWlCLFlBQWU7UUFDOUIsTUFBTSxDQUFDLElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLEtBQUssR0FBRyxZQUFZLENBQUM7SUFDaEQsQ0FBQztJQUVILGFBQUM7QUFBRCxDQXBCQSxBQW9CQyxJQUFBO0FBcEJZLGNBQU0sU0FvQmxCLENBQUE7QUFFRDtJQUE2Qix3QkFBUztJQUVwQyxjQUFZLEtBQVE7UUFDbEIsa0JBQU0sS0FBSyxDQUFDLENBQUM7SUFDZixDQUFDO0lBRUQsc0JBQVcseUJBQU87YUFBbEI7WUFDRSxNQUFNLENBQUMsSUFBSSxDQUFDO1FBQ2QsQ0FBQzs7O09BQUE7O0lBRUQsc0JBQVcscUJBQUc7YUFBZDtZQUNFLE1BQU0sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDO1FBQ3BCLENBQUM7OztPQUFBO0lBRUQsc0JBQVcsc0JBQUk7YUFBZjtZQUNFLE1BQU0sQ0FBQyxDQUFDLENBQUM7UUFDWCxDQUFDOzs7T0FBQTtJQUNILFdBQUM7QUFBRCxDQWpCQSxBQWlCQyxDQWpCNEIsTUFBTSxHQWlCbEM7QUFqQlksWUFBSSxPQWlCaEIsQ0FBQTtBQUVEO0lBQTZCLHdCQUFTO0lBRXBDLGNBQVksSUFBYztRQUFkLG9CQUFjLEdBQWQsV0FBYztRQUN4QixrQkFBTSxJQUFJLENBQUMsQ0FBQztJQUNkLENBQUM7SUFFRCxzQkFBVyx5QkFBTzthQUFsQjtZQUNFLE1BQU0sQ0FBQyxJQUFJLENBQUM7UUFDZCxDQUFDOzs7T0FBQTtJQUVELHNCQUFXLHFCQUFHO2FBQWQ7WUFDRSxNQUFNLElBQUksS0FBSyxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQzlCLENBQUM7OztPQUFBO0lBRUQsc0JBQVcsc0JBQUk7YUFBZjtZQUNFLE1BQU0sQ0FBQyxDQUFDLENBQUM7UUFDWCxDQUFDOzs7T0FBQTtJQUNILFdBQUM7QUFBRCxDQWpCQSxBQWlCQyxDQWpCNEIsTUFBTSxHQWlCbEM7QUFqQlksWUFBSSxPQWlCaEIsQ0FBQTtBQUVZLFlBQUksR0FBYyxJQUFJLElBQUksRUFBRSxDQUFDO0FBRTFDLGdCQUEwQixDQUFJO0lBQzVCLE1BQU0sQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLFlBQUksQ0FBQztBQUM1QixDQUFDO0FBRmUsY0FBTSxTQUVyQixDQUFBO0FBRUQsY0FBd0IsQ0FBSTtJQUMxQixNQUFNLENBQUMsSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDckIsQ0FBQztBQUZlLFlBQUksT0FFbkIsQ0FBQTs7QUN4RUQiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiaW1wb3J0IHtvcHRpb24sIHNvbWUsIG5vbmUsIE9wdGlvbiwgU29tZSwgTm9uZX0gZnJvbSAnLi9tYWluL09wdGlvbic7XG5cbi8qKlxuICogRXhwb3J0IHRvIHB1YmxpYyBhcyB0eXBlc2NyaXB0IG1vZHVsZXMuXG4gKi9cbmV4cG9ydCB7XG4gIG9wdGlvbiwgc29tZSwgbm9uZSwgT3B0aW9uLCBTb21lLCBOb25lXG59O1xuXG4vKipcbiAqIEV4cG9ydCB0byBwdWJsaWMgYnkgYmluZGluZyB0aGVtIHRvIHRoZSB3aW5kb3cgcHJvcGVydHkuXG4gKi9cbndpbmRvd1snQXBwJ10gPSB7XG4gIG9wdGlvbjogb3B0aW9uXG59O1xuXG4iLCIvKipcbiAqIENyZWF0ZWQgYnkgSm9yZGFuIG9uIDQvMjMvMjAxNi5cbiAqL1xuXG5leHBvcnQgY2xhc3MgT3B0aW9uPFQ+IHtcblxuICBwdWJsaWMgaXNFbXB0eTogYm9vbGVhbjtcbiAgcHVibGljIHNpemU6IG51bWJlcjtcblxuICBjb25zdHJ1Y3Rvcihwcm90ZWN0ZWQgdmFsdWU6IFQpIHtcbiAgfVxuXG4gIHB1YmxpYyBtYXAoZjogKG9iamVjdDogVCkgPT4gYW55KSB7XG4gICAgcmV0dXJuIG5ldyBTb21lKGYodGhpcy52YWx1ZSkpO1xuICB9XG5cbiAgcHVibGljIGdldCBnZXQoKSB7XG4gICAgcmV0dXJuIHRoaXMudmFsdWU7XG4gIH1cblxuICBwdWJsaWMgZ2V0T3JFbHNlKGRlZmF1bHRWYWx1ZTogVCk6IFQge1xuICAgIHJldHVybiB0aGlzLnZhbHVlID8gdGhpcy52YWx1ZSA6IGRlZmF1bHRWYWx1ZTtcbiAgfVxuXG59XG5cbmV4cG9ydCBjbGFzcyBTb21lPFQ+IGV4dGVuZHMgT3B0aW9uPFQ+IHtcblxuICBjb25zdHJ1Y3Rvcih2YWx1ZTogVCkge1xuICAgIHN1cGVyKHZhbHVlKTtcbiAgfVxuXG4gIHB1YmxpYyBnZXQgaXNFbXB0eSgpIHtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfTtcblxuICBwdWJsaWMgZ2V0IGdldCgpIHtcbiAgICByZXR1cm4gdGhpcy52YWx1ZTtcbiAgfVxuXG4gIHB1YmxpYyBnZXQgc2l6ZSgpOiBudW1iZXIge1xuICAgIHJldHVybiAxO1xuICB9XG59XG5cbmV4cG9ydCBjbGFzcyBOb25lPFQ+IGV4dGVuZHMgT3B0aW9uPFQ+IHtcblxuICBjb25zdHJ1Y3Rvcihub25lOiBUID0gbnVsbCkge1xuICAgIHN1cGVyKG5vbmUpO1xuICB9XG5cbiAgcHVibGljIGdldCBpc0VtcHR5KCkge1xuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgcHVibGljIGdldCBnZXQoKTogVCB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdOb25lLmdldCcpO1xuICB9XG5cbiAgcHVibGljIGdldCBzaXplKCk6IG51bWJlciB7XG4gICAgcmV0dXJuIDA7XG4gIH1cbn1cblxuZXhwb3J0IGNvbnN0IG5vbmU6IE5vbmU8YW55PiA9IG5ldyBOb25lKCk7XG5cbmV4cG9ydCBmdW5jdGlvbiBvcHRpb248VD4oeDogVCk6IE9wdGlvbjxUPiB7XG4gIHJldHVybiB4ID8gc29tZSh4KSA6IG5vbmU7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBzb21lPFQ+KHg6IFQpOiBTb21lPFQ+IHtcbiAgcmV0dXJuIG5ldyBTb21lKHgpO1xufVxuIiwiIl19
