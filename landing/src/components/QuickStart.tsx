export default function QuickStart() {
  return (
    <section id="quick-start" className="px-6 py-20 bg-gray-50">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-4xl font-bold text-center text-gray-900 mb-4">Quick Start</h2>
        <p className="text-xl text-gray-600 text-center mb-12">Get up and running with functype in minutes</p>

        <div className="space-y-8">
          {/* Step 1: Install */}
          <div className="bg-white rounded-xl p-8 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                1
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-semibold mb-3">Install functype</h3>
                <div className="bg-gray-900 rounded-lg p-4">
                  <code className="text-green-400 font-mono text-sm">npm install functype</code>
                </div>
                <p className="text-sm text-gray-500 mt-2">Also works with yarn, pnpm, and bun</p>
              </div>
            </div>
          </div>

          {/* Step 2: Import */}
          <div className="bg-white rounded-xl p-8 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                2
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-semibold mb-3">Import what you need</h3>
                <div className="bg-gray-900 rounded-lg p-4">
                  <pre className="text-sm font-mono">
                    <code>
                      <span className="text-purple-400">import</span>{" "}
                      <span className="text-blue-300">{"{ Option, Either, List }"}</span>{" "}
                      <span className="text-purple-400">from</span> <span className="text-green-400">"functype"</span>
                      {"\n\n"}
                      <span className="text-gray-500">// Or use selective imports for smaller bundles</span>
                      {"\n"}
                      <span className="text-purple-400">import</span>{" "}
                      <span className="text-blue-300">{"{ Option }"}</span>{" "}
                      <span className="text-purple-400">from</span>{" "}
                      <span className="text-green-400">"functype/option"</span>
                    </code>
                  </pre>
                </div>
              </div>
            </div>
          </div>

          {/* Step 3: Use */}
          <div className="bg-white rounded-xl p-8 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                3
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-semibold mb-3">Start coding functionally</h3>
                <div className="bg-gray-900 rounded-lg p-4">
                  <pre className="text-sm font-mono overflow-x-auto">
                    <code>
                      <span className="text-purple-400">const</span> <span className="text-blue-300">result</span> ={" "}
                      <span className="text-yellow-300">Option</span>
                      <span className="text-gray-100">(</span>
                      <span className="text-blue-300">user</span>
                      <span className="text-gray-100">)</span>
                      {"\n  "}
                      <span className="text-gray-100">.</span>
                      <span className="text-blue-300">map</span>
                      <span className="text-gray-100">(</span>
                      <span className="text-orange-300">u</span> <span className="text-purple-400">=&gt;</span>{" "}
                      <span className="text-orange-300">u</span>
                      <span className="text-gray-100">.</span>
                      <span className="text-blue-300">email</span>
                      <span className="text-gray-100">)</span>
                      {"\n  "}
                      <span className="text-gray-100">.</span>
                      <span className="text-blue-300">filter</span>
                      <span className="text-gray-100">(</span>
                      <span className="text-orange-300">email</span> <span className="text-purple-400">=&gt;</span>{" "}
                      <span className="text-orange-300">email</span>
                      <span className="text-gray-100">.</span>
                      <span className="text-blue-300">includes</span>
                      <span className="text-gray-100">(</span>
                      <span className="text-green-400">"@"</span>
                      <span className="text-gray-100">))</span>
                      {"\n  "}
                      <span className="text-gray-100">.</span>
                      <span className="text-blue-300">getOrElse</span>
                      <span className="text-gray-100">(</span>
                      <span className="text-green-400">"no-email@example.com"</span>
                      <span className="text-gray-100">)</span>
                    </code>
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Next Steps */}
        <div className="mt-12 text-center space-y-4">
          <p className="text-lg text-gray-600">Ready to learn more?</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/api-docs"
              className="inline-block px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
            >
              View Full Documentation
            </a>
            <a
              href="https://github.com/jordanburke/functype/tree/main/examples"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-6 py-3 bg-white text-blue-600 font-semibold rounded-lg border-2 border-blue-600 hover:bg-blue-50 transition-colors"
            >
              See Examples
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
