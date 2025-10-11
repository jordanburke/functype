export default function Features() {
  return (
    <section className="px-6 py-20 bg-white">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-4xl font-bold text-center text-gray-900 mb-4">Why Functype?</h2>
        <p className="text-xl text-gray-600 text-center mb-16 max-w-3xl mx-auto">
          A functional programming library designed for TypeScript developers who value type safety and composition
        </p>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Scala-Style API */}
          <div className="p-6 rounded-xl border border-gray-200 hover:border-blue-500 transition-colors">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                ></path>
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2">Scala-Style API</h3>
            <p className="text-gray-600">
              Familiar constructor functions with method chaining. Works like Scala's collections API.
            </p>
          </div>

          {/* Performance */}
          <div className="p-6 rounded-xl border border-gray-200 hover:border-blue-500 transition-colors">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                ></path>
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2">High Performance</h3>
            <p className="text-gray-600">
              Do-notation is 12x faster for List comprehensions compared to traditional flatMap chains.
            </p>
          </div>

          {/* Unified Interfaces */}
          <div className="p-6 rounded-xl border border-gray-200 hover:border-blue-500 transition-colors">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"
                ></path>
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2">Unified Interfaces</h3>
            <p className="text-gray-600">
              All types implement the same hierarchy of interfaces. Learn once, use everywhere.
            </p>
          </div>

          {/* Tree-Shakeable */}
          <div className="p-6 rounded-xl border border-gray-200 hover:border-blue-500 transition-colors">
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                ></path>
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2">Tree-Shakeable</h3>
            <p className="text-gray-600">
              Import only what you need. Optimized for minimal bundle size with selective imports.
            </p>
          </div>
        </div>

        {/* Core Data Structures */}
        <div className="mt-20">
          <h3 className="text-2xl font-bold text-center text-gray-900 mb-12">Core Data Structures</h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="p-6 bg-gray-50 rounded-lg">
              <h4 className="font-mono text-lg font-semibold text-blue-600 mb-2">Option&lt;T&gt;</h4>
              <p className="text-sm text-gray-600">Safe handling of nullable values with Some and None</p>
            </div>
            <div className="p-6 bg-gray-50 rounded-lg">
              <h4 className="font-mono text-lg font-semibold text-blue-600 mb-2">Either&lt;L,R&gt;</h4>
              <p className="text-sm text-gray-600">Express success/failure with Left and Right values</p>
            </div>
            <div className="p-6 bg-gray-50 rounded-lg">
              <h4 className="font-mono text-lg font-semibold text-blue-600 mb-2">List&lt;A&gt;</h4>
              <p className="text-sm text-gray-600">Immutable arrays with functional operations</p>
            </div>
            <div className="p-6 bg-gray-50 rounded-lg">
              <h4 className="font-mono text-lg font-semibold text-blue-600 mb-2">Task&lt;T&gt;</h4>
              <p className="text-sm text-gray-600">Async operations with cancellation and error handling</p>
            </div>
            <div className="p-6 bg-gray-50 rounded-lg">
              <h4 className="font-mono text-lg font-semibold text-blue-600 mb-2">Do-notation</h4>
              <p className="text-sm text-gray-600">Scala-like for-comprehensions for monadic composition</p>
            </div>
            <div className="p-6 bg-gray-50 rounded-lg">
              <h4 className="font-mono text-lg font-semibold text-blue-600 mb-2">Match/Cond</h4>
              <p className="text-sm text-gray-600">Powerful pattern matching and conditional expressions</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
