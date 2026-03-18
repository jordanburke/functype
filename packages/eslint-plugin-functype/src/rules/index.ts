import noGetUnsafe from "./no-get-unsafe"
import noImperativeLoops from "./no-imperative-loops"
import noLet from "./no-let"
import preferDoNotation from "./prefer-do-notation"
import preferEither from "./prefer-either"
import preferFlatmap from "./prefer-flatmap"
import preferFold from "./prefer-fold"
import preferFunctypeMap from "./prefer-functype-map"
import preferFunctypeSet from "./prefer-functype-set"
import preferList from "./prefer-list"
import preferMap from "./prefer-map"
import preferOption from "./prefer-option"

export {
  noGetUnsafe,
  noImperativeLoops,
  noLet,
  preferDoNotation,
  preferEither,
  preferFlatmap,
  preferFold,
  preferFunctypeMap,
  preferFunctypeSet,
  preferList,
  preferMap,
  preferOption,
}

export default {
  "prefer-option": preferOption,
  "prefer-either": preferEither,
  "prefer-list": preferList,
  "no-get-unsafe": noGetUnsafe,
  "no-let": noLet,
  "prefer-fold": preferFold,
  "prefer-map": preferMap,
  "prefer-flatmap": preferFlatmap,
  "prefer-functype-map": preferFunctypeMap,
  "prefer-functype-set": preferFunctypeSet,
  "no-imperative-loops": noImperativeLoops,
  "prefer-do-notation": preferDoNotation,
}
