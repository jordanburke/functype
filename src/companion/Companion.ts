/**
 * Creates a function-object hybrid similar to Scala's companion objects.
 * This utility allows creating TypeScript function objects with attached methods,
 * mimicking Scala's class + companion object pattern without using classes.
 *
 * @param obj The main function that will be invoked when the object is called
 * @param functions Additional static methods to attach to the function
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
export function Companion<ObjFn extends object, StaticFn extends object>(
  obj: ObjFn,
  functions: StaticFn,
): ObjFn & StaticFn {
  return Object.assign(obj, functions)
}
