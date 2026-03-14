import noGetUnsafe from "./no-get-unsafe"
import noImperativeLoops from "./no-imperative-loops"
import preferDoNotation from "./prefer-do-notation"
import preferEither from "./prefer-either"
import preferFlatmap from "./prefer-flatmap"
import preferFold from "./prefer-fold"
import preferList from "./prefer-list"
import preferMap from "./prefer-map"
import preferOption from "./prefer-option"

export {
  noGetUnsafe,
  noImperativeLoops,
  preferDoNotation,
  preferEither,
  preferFlatmap,
  preferFold,
  preferList,
  preferMap,
  preferOption,
}

export default {
  "prefer-option": preferOption,
  "prefer-either": preferEither,
  "prefer-list": preferList,
  "no-get-unsafe": noGetUnsafe,
  "prefer-fold": preferFold,
  "prefer-map": preferMap,
  "prefer-flatmap": preferFlatmap,
  "no-imperative-loops": noImperativeLoops,
  "prefer-do-notation": preferDoNotation,
}
