# Bundle Size Optimization Guide

## Overview

Functype is designed with tree-shaking in mind, allowing you to optimize your application's bundle size by only including the specific modules you need.

## Import Strategies

### Strategy 1: Selective Module Imports (Recommended)

Import only the specific modules you need to reduce bundle size significantly.

```typescript
import { Option } from 'functype/option'
import { Either } from 'functype/either'

// Usage
const option = Option.some(42)
const either = Either.right('value')
```

### Strategy 2: Direct Constructor Imports (Smallest Bundle)

For the most aggressive tree-shaking, import only the specific constructors and functions you need.

```typescript
import { some, none } from 'functype/option'
import { right } from 'functype/either'

// Usage
const option = some(42)
const none_value = none()
const either = right('value')
```

## Bundle Size Comparison

| Import Strategy | Approximate Bundle Size | Best For |
|-----------------|-------------------------|----------|
| Selective       | 200-500 bytes per module | Most applications |
| Direct          | <200 bytes per feature  | Size-critical applications |

## Common Module Sizes

| Module    | Approximate Size (minified) | Gzipped Size |
|-----------|----------------------------|--------------|
| Option    | ~200 bytes                 | ~140 bytes   |
| Either    | ~290 bytes                 | ~190 bytes   |
| List      | ~170 bytes                 | ~125 bytes   |
| Try       | ~170 bytes                 | ~125 bytes   |
| Tuple     | ~120 bytes                 | ~100 bytes   |
| FPromise  | ~200 bytes                 | ~140 bytes   |

## Additional Tips

1. **Import Analysis**: Use tools like [webpack-bundle-analyzer](https://github.com/webpack-contrib/webpack-bundle-analyzer) or [rollup-plugin-visualizer](https://github.com/btd/rollup-plugin-visualizer) to analyze your bundle and identify opportunities for optimization.

2. **Dynamic Imports**: Consider using dynamic imports for rarely used functionality:
   ```typescript
   // Only load when needed
   const useRareFeature = async () => {
     const { someLargeUtility } = await import('functype/some-large-module')
     return someLargeUtility()
   }
   ```

3. **Development vs Production**: During development, you might prefer the convenience of importing everything. In production builds, switch to selective imports.

4. **Peer Dependencies**: Functype has minimal dependencies, and the only external dependency (`safe-stable-stringify`) is quite small.

## Need Help?

If you need assistance with optimizing your bundle size further, please open an issue on our GitHub repository.