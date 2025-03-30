# Changelog

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
