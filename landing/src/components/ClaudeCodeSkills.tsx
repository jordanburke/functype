export default function ClaudeCodeSkills() {
  return (
    <section className="px-6 py-20 bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">Claude Code Skills</h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            AI-powered development tools to accelerate your functype workflow. Install these skills in Claude Code for
            intelligent code assistance, pattern conversion, and library contribution guidance.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {/* functype-user Skill */}
          <div className="bg-white p-8 rounded-2xl border-2 border-gray-200 hover:border-blue-500 transition-all hover:shadow-lg">
            <div className="flex items-start mb-6">
              <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0 mr-4">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                  ></path>
                </svg>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Functype User</h3>
                <p className="text-sm text-blue-600 font-medium">For Application Developers</p>
              </div>
            </div>

            <p className="text-gray-600 mb-6">
              Transform imperative TypeScript code to functional patterns with AI guidance. Get instant pattern
              suggestions, API lookups, and debugging help while working with Option, Either, List, and more.
            </p>

            <div className="space-y-3 mb-6">
              <div className="flex items-start">
                <svg
                  className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="text-sm text-gray-700">Pattern conversion examples (imperative → functional)</span>
              </div>
              <div className="flex items-start">
                <svg
                  className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="text-sm text-gray-700">Quick API reference and method lookup</span>
              </div>
              <div className="flex items-start">
                <svg
                  className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="text-sm text-gray-700">Common use cases and debugging tips</span>
              </div>
            </div>

            <div className="bg-gray-900 text-gray-100 p-4 rounded-lg">
              <div className="font-mono text-sm">
                <div className="text-green-400 mb-2"># Install via marketplace</div>
                <div className="text-gray-300">/plugin install functype-user</div>
              </div>
            </div>
          </div>

          {/* functype-developer Skill */}
          <div className="bg-white p-8 rounded-2xl border-2 border-gray-200 hover:border-purple-500 transition-all hover:shadow-lg">
            <div className="flex items-start mb-6">
              <div className="w-14 h-14 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0 mr-4">
                <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
                  ></path>
                </svg>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Functype Developer</h3>
                <p className="text-sm text-purple-600 font-medium">For Library Contributors</p>
              </div>
            </div>

            <p className="text-gray-600 mb-6">
              Comprehensive guide for contributing to functype. Learn the architecture patterns, create new data
              structures, implement functional interfaces, and follow library conventions.
            </p>

            <div className="space-y-3 mb-6">
              <div className="flex items-start">
                <svg
                  className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="text-sm text-gray-700">Base pattern, HKT system, and Companion utilities</span>
              </div>
              <div className="flex items-start">
                <svg
                  className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="text-sm text-gray-700">Step-by-step guide for creating new types</span>
              </div>
              <div className="flex items-start">
                <svg
                  className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="text-sm text-gray-700">Testing patterns and validation scripts</span>
              </div>
            </div>

            <div className="bg-gray-900 text-gray-100 p-4 rounded-lg">
              <div className="font-mono text-sm">
                <div className="text-green-400 mb-2"># Install via marketplace</div>
                <div className="text-gray-300">/plugin install functype-developer</div>
              </div>
            </div>
          </div>
        </div>

        {/* Installation Instructions */}
        <div className="mt-12 bg-gray-900 text-gray-100 p-8 rounded-2xl max-w-4xl mx-auto">
          <h3 className="text-xl font-bold mb-4 flex items-center">
            <svg className="w-6 h-6 mr-2 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
            </svg>
            Quick Installation
          </h3>
          <p className="text-gray-300 mb-4">Install functype skills in Claude Code using the marketplace:</p>
          <div className="bg-gray-800 p-4 rounded-lg font-mono text-sm overflow-x-auto">
            <div className="text-green-400"># Step 1: Add the functype marketplace</div>
            <div className="text-gray-300 mt-2">/plugin marketplace add jordanburke/functype</div>

            <div className="text-green-400 mt-4"># Step 2: Install the skills you need</div>
            <div className="text-gray-300 mt-2">/plugin install functype-user</div>
            <div className="text-gray-300">/plugin install functype-developer</div>
          </div>
        </div>

        <div className="mt-8 text-center text-sm text-gray-500">
          <p>
            Learn more about skills at{" "}
            <a
              href="https://github.com/jordanburke/functype/tree/main/.claude/skills"
              className="text-blue-600 hover:text-blue-700 underline"
            >
              github.com/jordanburke/functype
            </a>
          </p>
        </div>
      </div>
    </section>
  )
}
