import { useState, useEffect } from "react"

export default function Navigation() {
  const [isOpen, setIsOpen] = useState(false)
  const [activeSection, setActiveSection] = useState("home")

  useEffect(() => {
    const handleScroll = () => {
      const sections = ["home", "features", "core-types", "quick-start", "claude-skills"]
      const scrollPosition = window.scrollY + 100

      for (const section of sections) {
        const element = document.getElementById(section)
        if (element) {
          const { offsetTop, offsetHeight } = element
          if (scrollPosition >= offsetTop && scrollPosition < offsetTop + offsetHeight) {
            setActiveSection(section)
            break
          }
        }
      }
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const navItems = [
    { label: "Home", href: "/#home", id: "home" },
    { label: "Features", href: "/#features", id: "features" },
    { label: "Core Types", href: "/#core-types", id: "core-types" },
    { label: "Quick Start", href: "/#quick-start", id: "quick-start" },
    { label: "Claude Skills", href: "/#claude-skills", id: "claude-skills" },
  ]

  const handleNavClick = () => {
    // Close mobile menu on navigation
    setIsOpen(false)
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <a href="/" className="flex items-center space-x-2">
            <img src="/favicon.svg" alt="Functype" className="w-8 h-8" />
            <span className="font-bold text-xl text-gray-900">functype</span>
          </a>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => (
              <a
                key={item.id}
                href={item.href}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeSection === item.id
                    ? "bg-blue-100 text-blue-700"
                    : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                }`}
              >
                {item.label}
              </a>
            ))}
          </div>

          {/* Desktop External Links */}
          <div className="hidden md:flex items-center space-x-4">
            <a
              href="/api-docs"
              className="text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
            >
              API Docs
            </a>
            <a
              href="https://github.com/jordanburke/functype"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                <path
                  fillRule="evenodd"
                  d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                  clipRule="evenodd"
                />
              </svg>
              GitHub
            </a>
          </div>

          {/* Mobile Hamburger */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden inline-flex items-center justify-center p-2 rounded-md text-gray-700 hover:text-gray-900 hover:bg-gray-100 transition-colors"
            aria-label="Toggle menu"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              {isOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden border-t border-gray-200 bg-white">
          <div className="px-4 py-3 space-y-1">
            {navItems.map((item) => (
              <a
                key={item.id}
                href={item.href}
                onClick={handleNavClick}
                className={`block px-3 py-2 rounded-md text-base font-medium ${
                  activeSection === item.id
                    ? "bg-blue-100 text-blue-700"
                    : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                }`}
              >
                {item.label}
              </a>
            ))}
            <div className="pt-4 space-y-2 border-t border-gray-200">
              <a
                href="/api-docs"
                className="block px-3 py-2 text-base font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900 rounded-md"
              >
                API Docs
              </a>
              <a
                href="https://github.com/jordanburke/functype"
                target="_blank"
                rel="noopener noreferrer"
                className="block px-3 py-2 text-base font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900 rounded-md"
              >
                GitHub
              </a>
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}
