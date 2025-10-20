export default function Hero() {
  return (
    <section id="home" className="px-6 py-20 text-center max-w-6xl mx-auto">
      <div className="space-y-6">
        <h1 className="text-5xl md:text-7xl font-bold text-gray-900">Functype</h1>
        <p className="text-xl md:text-2xl text-gray-600 max-w-3xl mx-auto">
          Scala-Inspired Functional Programming for TypeScript
        </p>
        <p className="text-lg text-gray-500 max-w-2xl mx-auto">
          Type-safe, immutable, and composable data structures with unified interfaces
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-6">
          <a
            href="#quick-start"
            className="inline-block px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
          >
            Get Started
          </a>
          <a
            href="/api-docs"
            className="inline-block px-8 py-3 bg-white text-blue-600 font-semibold rounded-lg border-2 border-blue-600 hover:bg-blue-50 transition-colors"
          >
            View Docs
          </a>
          <a
            href="https://github.com/jordanburke/functype"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block px-8 py-3 bg-gray-800 text-white font-semibold rounded-lg hover:bg-gray-900 transition-colors"
          >
            GitHub
          </a>
        </div>

        {/* Code Example */}
        <div className="pt-12 max-w-2xl mx-auto">
          <div className="bg-gray-900 rounded-xl p-6 text-left shadow-2xl">
            <pre className="text-sm md:text-base overflow-x-auto">
              <code className="text-gray-100 font-mono">
                <span className="text-purple-400">import</span>{" "}
                <span className="text-blue-300">{"{ Option, Either }"}</span>{" "}
                <span className="text-purple-400">from</span> <span className="text-green-400">"functype"</span>
                {"\n\n"}
                <span className="text-gray-500">// Handle null safety with Option</span>
                {"\n"}
                <span className="text-purple-400">const</span> <span className="text-blue-300">user</span> ={" "}
                <span className="text-yellow-300">Option</span>(<span className="text-blue-300">maybeUser</span>)
                {"\n  ."}
                <span className="text-blue-300">map</span>(<span className="text-orange-300">u</span>{" "}
                <span className="text-purple-400">=&gt;</span> <span className="text-orange-300">u</span>.
                <span className="text-blue-300">name</span>){"\n  ."}
                <span className="text-blue-300">getOrElse</span>(<span className="text-green-400">"Guest"</span>)
                {"\n\n"}
                <span className="text-gray-500">// Elegant error handling with Either</span>
                {"\n"}
                <span className="text-purple-400">const</span> <span className="text-blue-300">result</span> ={" "}
                <span className="text-yellow-300">Either</span>
                {"\n  ."}
                <span className="text-blue-300">fromTry</span>(<span className="text-purple-400">()</span>{" "}
                <span className="text-purple-400">=&gt;</span> <span className="text-yellow-300">JSON</span>.
                <span className="text-blue-300">parse</span>(<span className="text-blue-300">data</span>))
                {"\n  ."}
                <span className="text-blue-300">map</span>(<span className="text-orange-300">obj</span>{" "}
                <span className="text-purple-400">=&gt;</span> <span className="text-orange-300">obj</span>.
                <span className="text-blue-300">value</span>)
              </code>
            </pre>
          </div>
        </div>

        {/* Stats */}
        <div className="flex flex-col sm:flex-row gap-8 justify-center pt-12 text-center">
          <div>
            <div className="text-3xl font-bold text-blue-600">12x</div>
            <div className="text-sm text-gray-600">Faster List Operations</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-blue-600">Tree-Shakeable</div>
            <div className="text-sm text-gray-600">Optimized Bundle Size</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-blue-600">100%</div>
            <div className="text-sm text-gray-600">TypeScript</div>
          </div>
        </div>
      </div>
    </section>
  )
}
