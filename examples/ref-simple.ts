import { Ref } from "@/ref"

// Simple example: Using Ref to avoid let statements

// Instead of:
// let counter = 0
// counter += 1
// console.log(counter)

// Use Ref:
const counter = Ref(0)
counter.update((n) => n + 1)
console.log(counter.get()) // 1

// Instead of:
// let config = { host: 'localhost', port: 3000 }
// config = { ...config, port: 8080 }

// Use Ref:
const config = Ref({ host: "localhost", port: 3000 })
config.update((c) => ({ ...c, port: 8080 }))
console.log(config.get()) // { host: 'localhost', port: 8080 }

// Compare and swap example
const flag = Ref(false)
const wasSet = flag.compareAndSet(false, true)
console.log(wasSet) // true
console.log(flag.get()) // true

// Modify with result
const data = Ref([1, 2, 3])
const removed = data.modify((arr) => {
  const [first, ...rest] = arr
  return [rest, first]
})
console.log(removed) // 1
console.log(data.get()) // [2, 3]

// Static method
const another = Ref.of("hello")
console.log(another.get()) // "hello"
