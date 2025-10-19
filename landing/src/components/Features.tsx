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

        {/* Feature Matrix CTA */}
        <div className="mt-16">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 md:p-12 text-center text-white shadow-xl">
            <div className="flex justify-center mb-4">
              <svg className="w-16 h-16 text-white opacity-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"
                ></path>
              </svg>
            </div>
            <h3 className="text-3xl md:text-4xl font-bold mb-4">Explore the Complete Feature Matrix</h3>
            <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
              See at a glance which functional programming interfaces are supported by each data structure
            </p>
            <a
              href="/feature-matrix"
              className="inline-block px-8 py-4 bg-white text-blue-600 rounded-lg font-semibold text-lg hover:bg-gray-100 transition-colors shadow-lg hover:shadow-xl"
            >
              View Feature Matrix →
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
