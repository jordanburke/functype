# Changelog

## [0.17.2] - 2025-01-15

### Added

- **Companion Pattern Enhancements**
  - New `CompanionTypes` module with helper types for working with Companion objects
    - `CompanionMethods<T>` - Extract companion methods type from a Companion object
    - `InstanceType<T>` - Extract instance type from a constructor function
    - `isCompanion()` - Runtime type guard to check if a value is a Companion object
  - New `SerializationCompanion` module with shared serialization utilities
    - `createSerializer()` - Create serializer for simple tagged values
    - `createCustomSerializer()` - Create serializer for complex objects
    - `fromJSON()`, `fromYAML()`, `fromBinary()` - Generic deserialization helpers
    - `createSerializationCompanion()` - Generate companion serialization methods
  - Added type guards as static methods in companion objects:
    - `Option.isSome()`, `Option.isNone()` - Type guards for Option
    - `Either.isLeft()`, `Either.isRight()` - Type guards for Either
    - `Try.isSuccess()`, `Try.isFailure()` - Type guards for Try

- **Documentation**
  - New comprehensive guide: `docs/companion-pattern.md` explaining the Companion pattern
  - Complete examples of creating custom Companion types
  - Comparison with Scala's companion objects and other TypeScript patterns

- **Exports**
  - Added package.json exports for `functype/companion` and `functype/serialization`
  - Exported CompanionTypes and SerializationCompanion from main index

### Changed

- **Either Refactored to Companion Pattern**
  - Migrated Either from namespace object pattern to Companion pattern for consistency
  - All Either types now follow the same pattern as Option, Try, List, etc.
  - Added `Either.left()` and `Either.right()` companion methods
  - Maintains full backward compatibility - `Left()` and `Right()` still work

- **Standardized Serialization**
  - Refactored 6 types to use shared serialization utilities: Option, Try, List, Set, Map, Lazy
  - Consistent serialization format across all types
  - Reduced code duplication and improved maintainability

### Tests

- Added comprehensive tests for CompanionTypes helper functions (9 tests)
- Added comprehensive tests for SerializationCompanion utilities (18 tests)
- All 1079 existing tests continue to pass

## [0.8.61] - 2025-03-30

### Added

- Enhanced Task module to better serve as adapter between promise-based code and functional patterns
  - Added `fromPromise` adapter to convert promise-returning functions to Task-compatible functions
  - Added `toPromise` converter to transform Task results back to promises
  - Improved documentation for Task semantics
- Created comprehensive migration guide in `docs/TaskMigration.md` showing how to migrate from promises to functional Task patterns
- Added tests for new Task adapter methods

### Fixed

- Fixed implementation of `Task.Sync` and `Task.Async` to better align with functional patterns
- Updated README with correct Task examples and usage patterns
- Updated TODO list to reflect completed Task enhancements

## [0.8.60] - 2025-03-15

### Changed

- Renamed Companion parameters for better clarity

## [0.8.59] - 2025-03-10

### Changed

- Reorganized directory structure
- Fixed compilation issues throughout the codebase
