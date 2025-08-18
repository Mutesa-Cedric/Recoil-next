/**
 * Build script for recoil-next monorepo
 * Uses the existing rollup configuration to build all packages
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

const PACKAGES = {
  'recoil-next': 'packages/recoil',
  'recoil-relay-next': 'packages/recoil-relay', 
  'recoil-sync-next': 'packages/recoil-sync',
  'refine-next': 'packages/refine',
  'shared': 'packages/shared'
};

const args = process.argv.slice(2);
const target = args[0];

if (target === 'all' || target == null) {
  buildAll();
} else if (PACKAGES[target]) {
  buildPackage(target);
} else {
  console.error(`Unknown build target: ${target}`);
  console.log('Available targets:', Object.keys(PACKAGES).join(', '));
  process.exit(1);
}

function buildAll() {
  console.log('🔨 Building all packages...\n');
  
  // First build shared package as others depend on it
  buildPackage('shared');
  
  // Then build all other packages in parallel
  const otherPackages = Object.keys(PACKAGES).filter(pkg => pkg !== 'shared');
  for (const pkg of otherPackages) {
    buildPackage(pkg);
  }
  
  // Use rollup to build the main distribution
  console.log('🔨 Building with Rollup...');
  try {
    execSync('rollup -c', { 
      cwd: projectRoot, 
      stdio: 'inherit' 
    });
    console.log('✅ All packages built successfully!\n');
  } catch (error) {
    console.error('❌ Rollup build failed:', error.message);
    process.exit(1);
  }
}

function buildPackage(packageName) {
  const packagePath = path.join(projectRoot, PACKAGES[packageName]);
  
  if (!fs.existsSync(packagePath)) {
    console.error(`❌ Package not found: ${packagePath}`);
    return;
  }
  
  console.log(`🔨 Building ${packageName}...`);
  
  try {
    // Check if package has its own build script
    const packageJsonPath = path.join(packagePath, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      
      if (packageJson.scripts?.build) {
        // Run package-specific build script
        execSync('pnpm run build', { 
          cwd: packagePath, 
          stdio: 'inherit' 
        });
      } else {
        // Build using TypeScript compiler
        execSync('pnpm tsc --build', { 
          cwd: packagePath, 
          stdio: 'inherit' 
        });
      }
    }
    
    console.log(`✅ ${packageName} built successfully!`);
  } catch (error) {
    console.error(`❌ Failed to build ${packageName}:`, error.message);
    process.exit(1);
  }
}