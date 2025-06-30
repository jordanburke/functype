/**
 * Compilable examples for Set data structure
 */

import { Set } from "@/set"

// Basic Set Operations
export function basicSetOperations() {
  const numbers = Set([1, 2, 3, 3, 4, 4, 5]) // Duplicates removed
  
  const withSix = numbers.add(6)
  const withoutTwo = withSix.remove(2)
  
  return withoutTwo.toArray() // [1, 3, 4, 5, 6]
}

// Set Transformations
export function setTransformations() {
  const words = Set(["hello", "world", "functype"])
  
  const lengths = words
    .map(word => word.length)
    .toArray()
  
  const longWords = words
    .filter(word => word.length > 5)
    .toArray() // ["functype"]
  
  return { lengths, longWords }
}

// Remove Duplicates from Array
export function removeDuplicates<T>(array: T[]): T[] {
  return Set(array).toArray()
}

// Set with Custom Objects
export function setWithObjects() {
  interface User {
    id: number
    name: string
  }
  
  const users = Set<User>([
    { id: 1, name: "Alice" },
    { id: 2, name: "Bob" }
  ])
  
  const userNames = users
    .map(user => user.name)
    .toArray()
    
  return userNames
}