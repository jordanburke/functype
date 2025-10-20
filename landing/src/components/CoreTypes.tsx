export default function CoreTypes() {
  const types = [
    {
      name: "Option<T>",
      href: "/option",
      description: "Safe handling of nullable values with Some and None",
      icon: "?",
    },
    {
      name: "Either<L,R>",
      href: "/either",
      description: "Express success/failure with Left and Right values",
      icon: "⇄",
    },
    {
      name: "List<A>",
      href: "/list",
      description: "Immutable arrays with functional operations",
      icon: "[]",
    },
    {
      name: "Task<T>",
      href: "/task",
      description: "Async operations with cancellation and error handling",
      icon: "⚙",
    },
    {
      name: "Do-Notation",
      href: "/do-notation",
      description: "Scala-like for-comprehensions for monadic composition",
      icon: "∗",
    },
    {
      name: "Match & Cond",
      href: "/match",
      description: "Powerful pattern matching and conditional expressions",
      icon: "⊢",
    },
  ]

  return (
    <section id="core-types" className="px-6 py-20 bg-gray-50">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">Core Data Structures</h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Explore the foundational types that power functional programming in TypeScript
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {types.map((type) => (
            <a
              key={type.href}
              href={type.href}
              className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow border border-gray-200 hover:border-blue-400"
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center text-2xl text-blue-600">
                  {type.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{type.name}</h3>
                  <p className="text-sm text-gray-600">{type.description}</p>
                </div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  )
}
