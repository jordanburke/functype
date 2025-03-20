#!/usr/bin/env node

// Simple wrapper to run typedoc in CI environments
import { execSync } from 'child_process';

try {
  console.log('Building documentation with TypeDoc...');
  execSync('npx typedoc', { stdio: 'inherit' });
  console.log('Documentation generated successfully in ./docs directory');
} catch (error) {
  console.error('Error building documentation:', error);
  process.exit(1);
}