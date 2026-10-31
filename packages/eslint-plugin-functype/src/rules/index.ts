import collectionNaming from "./collection-naming"
import mustFoldOnComponentReturn from "./must-fold-on-component-return"
import noArrayMutation from "./no-array-mutation"
import noFloatingIo from "./no-floating-io"
import noFloatingResult from "./no-floating-result"
import noGetUnsafe from "./no-get-unsafe"
import noGetOrThrowInRender from "./no-getOrThrow-in-render"
import noImperativeLoops from "./no-imperative-loops"
import noLet from "./no-let"
import noSerializeContainer from "./no-serialize-container"
import preferDoNotation from "./prefer-do-notation"
import preferEither from "./prefer-either"
import preferFlatmap from "./prefer-flatmap"
import preferFold from "./prefer-fold"
import preferFunctypeMap from "./prefer-functype-map"
import preferFunctypeSet from "./prefer-functype-set"
import preferList from "./prefer-list"
import preferMap from "./prefer-map"
import preferOption from "./prefer-option"
import preferTry from "./prefer-try"

export {
  collectionNaming,
  mustFoldOnComponentReturn,
  noArrayMutation,
  noFloatingIo,
  noFloatingResult,
  noGetOrThrowInRender,
  noGetUnsafe,
  noImperativeLoops,
  noLet,
  noSerializeContainer,
  preferDoNotation,
  preferEither,
  preferFlatmap,
  preferFold,
  preferFunctypeMap,
  preferFunctypeSet,
  preferList,
  preferMap,
  preferOption,
  preferTry,
}

export default {
  "prefer-option": preferOption,
  "prefer-either": preferEither,
  "prefer-try": preferTry,
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
  "collection-naming": collectionNaming,
  "no-array-mutation": noArrayMutation,
  "no-floating-io": noFloatingIo,
  "no-floating-result": noFloatingResult,
  "no-serialize-container": noSerializeContainer,
  "no-getOrThrow-in-render": noGetOrThrowInRender,
  "must-fold-on-component-return": mustFoldOnComponentReturn,
}
