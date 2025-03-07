/**
 * Creates a function-object hybrid similar to Scala's companion objects.
 * This utility allows creating TypeScript function objects with attached methods,
 * mimicking Scala's class + companion object pattern without using classes.
 *
 * @param mainFn The main function that will be invoked when the object is called
 * @param methods Additional static methods to attach to the function
 * @returns A function with the attached methods
 *
 * @example
 * const greet = (name: string) => `Hello, ${name}!`;
 * const methods = {
 *   formal: (name: string) => `Good day, ${name}.`,
 *   casual: (name: string) => `Hey ${name}!`
 * };
 * const Greeter = createCompanionObject(greet, methods);
 *
 * // Usage:
 * Greeter("World"); // Hello, World!
 * Greeter.formal("Sir"); // Good day, Sir.
 * Greeter.casual("Friend"); // Hey Friend!
 */
export function Companion<TMainFn extends object, TMethods extends object>(
  mainFn: TMainFn,
  methods: TMethods,
): TMainFn & TMethods {
  return Object.assign(mainFn, methods)
}
