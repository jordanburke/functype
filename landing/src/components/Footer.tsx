export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300 px-6 py-12">
      <div className="max-w-6xl mx-auto">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          {/* About */}
          <div>
            <h3 className="text-white font-semibold text-lg mb-4">Functype</h3>
            <p className="text-sm text-gray-400">Scala-inspired functional programming for TypeScript</p>
            <div className="mt-4 flex gap-2">
              <img src="https://img.shields.io/npm/v/functype?style=flat-square" alt="npm version" className="h-5" />
              <img
                src="https://img.shields.io/github/stars/jordanburke/functype?style=flat-square"
                alt="GitHub stars"
                className="h-5"
              />
            </div>
          </div>

          {/* Core Types */}
          <div>
            <h4 className="text-white font-semibold mb-4">Core Types</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="/option" className="hover:text-white transition-colors">
                  Option&lt;T&gt;
                </a>
              </li>
              <li>
                <a href="/either" className="hover:text-white transition-colors">
                  Either&lt;L,R&gt;
                </a>
              </li>
              <li>
                <a href="/list" className="hover:text-white transition-colors">
                  List&lt;A&gt;
                </a>
              </li>
              <li>
                <a href="/task" className="hover:text-white transition-colors">
                  Task&lt;T&gt;
                </a>
              </li>
              <li>
                <a href="/do-notation" className="hover:text-white transition-colors">
                  Do-Notation
                </a>
              </li>
              <li>
                <a href="/match" className="hover:text-white transition-colors">
                  Match & Cond
                </a>
              </li>
            </ul>
          </div>

          {/* Community */}
          <div>
            <h4 className="text-white font-semibold mb-4">Community</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <a
                  href="https://github.com/jordanburke/functype"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition-colors"
                >
                  GitHub
                </a>
              </li>
              <li>
                <a
                  href="https://www.npmjs.com/package/functype"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition-colors"
                >
                  npm Package
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/jordanburke/functype/issues"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition-colors"
                >
                  Issues
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/jordanburke/functype/discussions"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition-colors"
                >
                  Discussions
                </a>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="text-white font-semibold mb-4">Resources</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <a
                  href="https://github.com/jordanburke/functype/blob/main/docs/quick-reference.md"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition-colors"
                >
                  Quick Reference
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/jordanburke/functype/blob/main/FUNCTYPE_FEATURE_MATRIX.md"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition-colors"
                >
                  Feature Matrix
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/jordanburke/functype/blob/main/docs/do-notation.md"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition-colors"
                >
                  Do-Notation Guide
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/jordanburke/functype/blob/main/LICENSE"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition-colors"
                >
                  MIT License
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-gray-400">© 2025 Jordan Burke. Open source under the MIT License.</p>
          <div className="flex gap-4 text-sm">
            <a
              href="https://github.com/jordanburke"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition-colors"
            >
              @jordanburke
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
