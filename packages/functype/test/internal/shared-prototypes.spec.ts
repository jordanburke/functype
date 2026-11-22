/**
 * Every value type functype exports follows #276 §14's rules (values share their methods). Each
 * type's own spec pins its details; this one checks the same four rules across all of them:
 *
 * 1. A value's own properties are data: none of them is a function.
 * 2. Two values of the same variant share one prototype, which isn't `Object.prototype`.
 * 3. That prototype is frozen.
 * 4. Test matchers tell values with different contents apart, and see equal contents as equal.
 *
 * A value type is an export whose calls build an object that holds data and carries methods, and
 * that code keeps, passes around and compares. Not value types: functions and modules of
 * functions, brands (primitives at run time), builders used mid-chain (Cond, Match), errors built
 * on the platform's Error, records with no methods (HttpError's), and constants.
 *
 * Every runtime export of `@/index` must be classified below, so a new value type can't skip the
 * rules. A value type that doesn't meet them yet is listed in NOT_YET with the reason, and the test
 * asserts it still breaks a rule, so converting it forces its move into VALUE_TYPES.
 */
import { describe, expect, it } from "vitest"

import * as functype from "@/index"
import {
  Context,
  Exit,
  Identity,
  IO,
  Layer,
  Lazy,
  LazyList,
  Left,
  List,
  Map,
  None,
  Obj,
  Ref,
  Right,
  Set,
  Some,
  Stack,
  Tag,
  TracedOption,
  Try,
  Tuple,
} from "@/index"

/** A variant, a way to build one value of it, and a way to build one with different contents. */
type Variant = readonly [label: string, make: () => object, other: () => object]

type ValueType = {
  readonly exports: readonly string[]
  readonly variants: readonly Variant[]
  /** Why `_tag` lives on the prototype, for a type that keeps it there instead of on each value. */
  readonly tagOnPrototype?: string
}

/** One tracer for every TracedOption sample, so matchers compare their Options, not two tracers. */
const quietTracer = { emit: (): void => undefined }

/** A Lazy that has run, so matchers compare its value rather than its thunk's identity. */
const evaluated = <T>(value: T): Lazy<T> => {
  const lazy = Lazy(() => value)
  lazy.orThrow()
  return lazy
}

const VALUE_TYPES: Readonly<Record<string, ValueType>> = {
  Option: {
    exports: ["Option", "OptionConstructor", "Some", "None"],
    variants: [
      ["Some", () => Some(1), () => Some(2)],
      // None has one value, so its "other" is the Some that holds the same `value` field.
      ["None", () => None(), () => Some(undefined)],
    ],
  },
  Either: {
    exports: ["Either", "Right", "Left", "TypeCheckRight", "TypeCheckLeft"],
    variants: [
      ["Right", () => Right(1), () => Right(2)],
      ["Left", () => Left("a"), () => Left("b")],
    ],
  },
  Try: {
    exports: ["Try"],
    variants: [
      ["Success", () => Try(() => 1), () => Try(() => 2)],
      [
        "Failure",
        () =>
          Try(() => {
            throw new Error("a")
          }),
        () =>
          Try(() => {
            throw new Error("b")
          }),
      ],
    ],
  },
  IO: {
    exports: ["IO"],
    variants: [["IO", () => IO.succeed(1), () => IO.succeed(2)]],
    tagOnPrototype: "IO has one variant, so matchers can't confuse two kinds of IO; its own `effect` is tagged",
  },
  Exit: {
    exports: ["Exit"],
    variants: [
      ["Success", () => Exit.succeed(1), () => Exit.succeed(2)],
      ["Failure", () => Exit.fail("a"), () => Exit.fail("b")],
      ["Die", () => Exit.die(new Error("a")), () => Exit.die(new Error("b"))],
      ["Interrupted", () => Exit.interrupt("fiber-1"), () => Exit.interrupt("fiber-2")],
    ],
  },
  List: { exports: ["List"], variants: [["List", () => List([1, 2]), () => List([1, 3])]] },
  Set: { exports: ["Set"], variants: [["Set", () => Set([1, 2]), () => Set([1, 3])]] },
  Map: { exports: ["Map"], variants: [["Map", () => Map([["a", 1]]), () => Map([["a", 2]])]] },
  Stack: { exports: ["Stack"], variants: [["Stack", () => Stack([1, 2]), () => Stack([1, 3])]] },
  LazyList: { exports: ["LazyList"], variants: [["LazyList", () => LazyList([1, 2]), () => LazyList([1, 3])]] },
  Obj: { exports: ["Obj"], variants: [["Obj", () => Obj({ a: 1 }), () => Obj({ a: 2 })]] },
  Tuple: { exports: ["Tuple"], variants: [["Tuple", () => Tuple([1, "a"]), () => Tuple([1, "b"])]] },
  Lazy: { exports: ["Lazy"], variants: [["Lazy", () => evaluated(1), () => evaluated(2)]] },
  TracedOption: {
    exports: ["TracedOption"],
    variants: [
      [
        "TracedOption",
        () => TracedOption(Some(1), quietTracer, "span"),
        () => TracedOption(Some(2), quietTracer, "span"),
      ],
    ],
  },
  Identity: { exports: ["Identity"], variants: [["Identity", () => Identity(1), () => Identity(2)]] },
  // SpanTracer and TestClockTag are Tags.
  Tag: { exports: ["Tag", "SpanTracer", "TestClockTag"], variants: [["Tag", () => Tag("x"), () => Tag("y")]] },
  Context: {
    exports: ["Context"],
    variants: [["Context", () => Context.make(Tag("x"), 1), () => Context.make(Tag("x"), 2)]],
  },
  Ref: { exports: ["Ref"], variants: [["Ref", () => Ref(1), () => Ref(2)]] },
}

/** Value types that don't meet the rules yet: each still builds its methods per value. */
const NOT_YET: Readonly<Record<string, { readonly reason: string; readonly sample: () => object }>> = {
  Layer: { reason: "builds build, merge, map and toString per value", sample: () => Layer.succeed(Tag("x"), 1) },
}

const FUNCTIONS = "a function or a module of functions; any value it returns is checked under its own type"
const BRANDS = "a brand or a brand builder; branded values are primitives at run time"
const ERRORS = "an error, built on the platform's Error"

/** Exports that aren't value types, and why. */
const NOT_VALUES: Readonly<Record<string, string>> = {
  ...Object.fromEntries(
    [
      "BoundedNumber",
      "BoundedString",
      "Brand",
      "BrandedBoolean",
      "BrandedNumber",
      "BrandedString",
      "createBrander",
      "EmailAddress",
      "hasBrand",
      "IntegerNumber",
      "ISO8601Date",
      "NonEmptyString",
      "NonNegativeNumber",
      "PatternString",
      "PositiveInteger",
      "PositiveNumber",
      "unwrapBrand",
      "UrlString",
      "UUID",
      "ValidatedBrand",
    ].map((name) => [name, BRANDS]),
  ),
  ...Object.fromEntries(
    [
      "$",
      "Base",
      "Companion",
      "createErrorSerializer",
      "createSerializationCompanion",
      "createSerializer",
      "createTaggedSerializer",
      "Decoder",
      "deserializeError",
      "Do",
      "DoAsync",
      "envelope",
      "expectMarker",
      "FoldableUtils",
      "formatError",
      "formatErrorChain",
      "formatStackTrace",
      "fromBinary",
      "fromJSON",
      "getErrorChain",
      "HKT",
      "Http",
      "HttpClient",
      "invariant",
      "isCompanion",
      "isDoCapable",
      "isExtractable",
      "isLeft",
      "isRight",
      "isTaggedThrowable",
      "isTypeable",
      "MatchableUtils",
      "reduceRightWiden",
      "reduceWiden",
      "safeStringify",
      "Serialization",
      "serializeError",
      "taggedEnvelope",
      "tryCatch",
      "tryCatchAsync",
      "Typeable",
      "unwrap",
      "Validation",
      "Valuable",
    ].map((name) => [name, FUNCTIONS]),
  ),
  ...Object.fromEntries(
    [
      "DecoderError",
      "EmptyListError",
      "FailureError",
      "InterruptedError",
      "InvariantViolation",
      "LeftError",
      "NoneError",
      "ParseError",
      "RepeatExhausted",
      "Throwable",
      "TimeoutError",
      "TypedError",
      "UnsupportedSyncOperationError",
    ].map((name) => [name, ERRORS]),
  ),
  Cond: "a builder, used mid-chain and not kept",
  Match: "a builder, used mid-chain and not kept",
  HttpError: "builds records with no methods, so there's nothing to share",
  HttpErrors: "builds records with no methods, so there's nothing to share",
  TestClock: "a test service, provided through Context; not a value code compares",
  TestContext: "builds the test service's Context",
  ESMap: "the platform's Map, re-exported",
  NAME: "a constant",
  FUNCTYPE_MARKER: "a constant",
}

/** The rules a value breaks, by number, as in the header. Empty when it meets 1 to 3. */
const brokenRules = (value: object, sibling: object): string[] => {
  const proto: unknown = Object.getPrototypeOf(value)
  const functions = Reflect.ownKeys(value).filter(
    (key) => typeof (value as Record<PropertyKey, unknown>)[key] === "function",
  )
  return [
    ...(functions.length > 0 ? [`1: own functions ${functions.map(String).join(", ")}`] : []),
    ...(proto === Object.prototype || proto !== Object.getPrototypeOf(sibling) ? ["2: no shared prototype"] : []),
    ...(proto === null || !Object.isFrozen(proto) ? ["3: prototype not frozen"] : []),
  ]
}

const variants = Object.entries(VALUE_TYPES).flatMap(([type, { variants }]) =>
  variants.map(([label, make, other]) => [`${type} ${label}`, make, other] as const),
)

const ownTagged = Object.entries(VALUE_TYPES)
  .filter(([, type]) => type.tagOnPrototype === undefined)
  .flatMap(([type, { variants }]) => variants.map(([label, make]) => [`${type} ${label}`, make] as const))

describe("every value type shares its methods", () => {
  it.each(variants)("%s keeps only data as own properties, on one frozen prototype", (_, make) => {
    expect(brokenRules(make(), make())).toEqual([])
  })

  // On the prototype, matchers would see a Right(1) and a Left(1) as equal (#276 §14 Rules).
  it.each(ownTagged)("%s keeps its _tag as an own property", (_, make) => {
    expect(Object.prototype.hasOwnProperty.call(make(), "_tag")).toBe(true)
  })

  it("IO keeps _tag on its prototype, for the reason it gives", () => {
    expect(Object.prototype.hasOwnProperty.call(IO.succeed(1), "_tag")).toBe(false)
    expect(VALUE_TYPES.IO?.tagOnPrototype).toBeTypeOf("string")
  })

  it.each(variants)("%s compares by its contents in test matchers", (_, make, other) => {
    expect(make()).toEqual(make())
    expect(make()).toStrictEqual(make())
    expect(make()).not.toEqual(other())
    expect(make()).not.toStrictEqual(other())
    expect([make()]).not.toEqual([other()])
  })

  it("each variant has its own prototype", () => {
    const protos = variants.map(([, make]) => Object.getPrototypeOf(make()) as object)
    expect(new globalThis.Set(protos).size).toBe(variants.length)
  })
})

describe("value types that don't meet the rules yet", () => {
  it.each(Object.entries(NOT_YET))(
    "%s still breaks a rule (%s): move it to VALUE_TYPES once it doesn't",
    (_, entry) => {
      expect(brokenRules(entry.sample(), entry.sample())).not.toEqual([])
    },
  )
})

describe("every export is classified", () => {
  const classified = new globalThis.Set([
    ...Object.values(VALUE_TYPES).flatMap((type) => type.exports),
    ...Object.keys(NOT_YET),
    ...Object.keys(NOT_VALUES),
  ])

  it("lists each runtime export of @/index as a value type, a value type not yet converted, or not a value", () => {
    const unclassified = Object.keys(functype).filter((name) => !classified.has(name))
    expect(unclassified, "classify these at the top of this file").toEqual([])
  })

  it("lists nothing that @/index no longer exports", () => {
    const exported = new globalThis.Set(Object.keys(functype))
    expect([...classified].filter((name) => !exported.has(name))).toEqual([])
  })

  it("puts no export in two lists", () => {
    const all = [
      ...Object.values(VALUE_TYPES).flatMap((type) => type.exports),
      ...Object.keys(NOT_YET),
      ...Object.keys(NOT_VALUES),
    ]
    expect(all.length).toBe(classified.size)
  })
})
