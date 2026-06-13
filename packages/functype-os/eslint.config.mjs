import baseConfig from "ts-builds/eslint-functype"

export default [
  ...baseConfig,
  {
    // The `functype/prefer-do-notation` rule has a `detectMixedMonads` heuristic
    // that flags any expression whose text contains two of {Option, Either, Try,
    // Task}. This misfires on idiomatic functype conversion methods —
    // `Option.toEither(...)`, `Try.toEither(...)`, `Try.toOption()` — which ARE
    // the recommended API for crossing monad boundaries. Since functype-os is an
    // adapter layer that crosses those boundaries by design (lifting Node IO into
    // functype types), we keep the chain-depth check but turn off the text-based
    // mixed-monad flag. The chain-depth check (default minChainDepth: 3) still
    // catches genuinely complex compositions.
    rules: {
      "functype/prefer-do-notation": ["warn", { detectMixedMonads: false }],
    },
  },
]
