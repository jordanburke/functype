# Task TODO

## Goals

- Enhance the Task module as an adapter between promise-based code and functional patterns
- Improve interoperability with existing JavaScript/TypeScript codebases
- Allow gradual migration to functional patterns without complete rewrites

## Implementation Tasks

- [x] Review current Task implementation for completeness of promise integration
- [x] Ensure robust error handling in sync/async conversions
- [x] Document explicit try/catch/finally semantics
- [x] Add examples showing migration from promise-based to functional patterns
- [x] Add utilities to simplify Task composition with promise-returning functions
- [x] Create migration guide for converting promise chains to Task operations
- [x] Create Task.race for racing multiple tasks with timeout support
- [x] Implement Task.fromNodeCallback for Node.js style callbacks
- [x] Implement cancellation support for Task operations
- [x] Add progress tracking for long-running Task operations

## Design Considerations

- Maintain clear separation between synchronous and promise-based operations
- Preserve functional error handling patterns while supporting promise interop
- Keep API consistent with the rest of the library's functional approach

## Completed Enhancements

- Added `fromPromise` adapter to convert promise-returning functions to Task-compatible functions
- Added `toPromise` converter to transform Task results back to promises
- Enhanced documentation with clearer descriptions of functionality
- Created TaskMigration.md guide showing how to migrate from promises to functional Task patterns
- Added comprehensive tests for the new adapter methods
- Implemented `Task.race` for racing multiple tasks with timeout support
- Added `Task.fromNodeCallback` for Node.js-style callback integration
- Implemented cancellation support with CancellationToken pattern
- Added progress tracking for long-running operations
- Created property-based tests verifying monadic laws and edge cases
- Added comprehensive documentation for all new functionality
