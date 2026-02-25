const mcpJson = `{
  "mcpServers": {
    "functype": {
      "command": "npx",
      "args": ["-y", "functype-mcp-server"]
    }
  }
}`

export default function ClaudeCodeSkills() {
  return (
    <section id="ai-tools" className="px-6 py-20 bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">AI-Powered Development</h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            AI-powered tools to supercharge your functype workflow. Install Claude Code skills for intelligent code
            assistance or add the MCP server for live documentation in any AI agent.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {/* functype Skill */}
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
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Functype</h3>
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
                <div className="text-gray-300">/plugin install functype</div>
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

          {/* MCP Server */}
          <div className="bg-white p-8 rounded-2xl border-2 border-gray-200 hover:border-green-500 transition-all hover:shadow-lg">
            <div className="flex items-start mb-6">
              <div className="w-14 h-14 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0 mr-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2"
                  ></path>
                </svg>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">MCP Server</h3>
                <p className="text-sm text-green-600 font-medium">For Any AI Agent</p>
              </div>
            </div>

            <p className="text-gray-600 mb-6">
              Live documentation lookup and compile-time code validation via the Model Context Protocol. Works with
              Claude Code, Cursor, Windsurf, and any MCP-compatible tool.
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
                <span className="text-sm text-gray-700">Search docs and type API references</span>
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
                <span className="text-sm text-gray-700">Compile-time code validation</span>
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
                <span className="text-sm text-gray-700">Runtime version switching</span>
              </div>
            </div>

            <div className="bg-gray-900 text-gray-100 p-4 rounded-lg">
              <div className="font-mono text-sm">
                <div className="text-green-400 mb-2"># Install via npx</div>
                <div className="text-gray-300">npx -y functype-mcp-server</div>
              </div>
            </div>

            <a href="/mcp-server" className="mt-4 inline-block text-sm text-green-600 hover:text-green-700 font-medium">
              View full documentation →
            </a>
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

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <p className="text-gray-300 mb-3 text-sm font-medium">Claude Code Skills</p>
              <div className="bg-gray-800 p-4 rounded-lg font-mono text-sm overflow-x-auto">
                <div className="text-green-400"># Add the functype marketplace</div>
                <div className="text-gray-300 mt-2">/plugin marketplace add jordanburke/functype</div>
                <div className="text-green-400 mt-3"># Install skills</div>
                <div className="text-gray-300 mt-2">/plugin install functype</div>
                <div className="text-gray-300">/plugin install functype-developer</div>
              </div>
            </div>

            <div>
              <p className="text-gray-300 mb-3 text-sm font-medium">MCP Server</p>
              <div className="bg-gray-800 p-4 rounded-lg font-mono text-sm overflow-x-auto">
                <div className="text-green-400"># Add to your .mcp.json</div>
                <pre className="text-gray-300 mt-2 whitespace-pre" style={{ margin: 0 }}>
                  {mcpJson}
                </pre>
              </div>
            </div>
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
