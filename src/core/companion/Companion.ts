/**
 * Creates a function-object hybrid similar to Scala's companion objects.
 * This utility allows creating TypeScript function objects with attached methods,
 * mimicking Scala's class + companion object pattern without using classes.
 *
 * @param methods Methods to include in the companion object
 * @param context Optional context/this value to bind to methods
 * @returns An object with the provided methods
 *
 * @example
 * const Greeter = Companion({
 *   formal: (name: string) => `Good day, ${name}.`,
 *   casual: (name: string) => `Hey ${name}!`
 * });
 *
 * // Usage:
 * Greeter.formal("Sir"); // Good day, Sir.
 * Greeter.casual("Friend"); // Hey Friend!
 */
export function Companion<TMethods extends object, TContext extends object = Record<string, unknown>>(
  methods: TMethods,
  context?: TContext,
): TMethods & TContext {
  if (context) {
    // Create a merged object that combines context and methods
    const result = { ...context } as any

    // Add all methods to the result object
    for (const [key, value] of Object.entries(methods)) {
      if (typeof value === "function") {
        result[key] = function (this: any, ...args: any[]) {
          return (value as Function).apply(this, args)
        }.bind(result)
      } else {
        result[key] = value
      }
    }

    return result as TMethods & TContext
  }
  return { ...methods } as TMethods & TContext
}
