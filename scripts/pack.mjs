/**
 * Packaging script for recoil-next monorepo
 * Creates distribution packages for all workspace packages
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

// Get all workspace packages from pnpm-workspace.yaml
function getWorkspacePackages() {
  const workspaceFile = path.join(projectRoot, 'pnpm-workspace.yaml');
  if (!fs.existsSync(workspaceFile)) {
    console.error('❌ pnpm-workspace.yaml not found');
    process.exit(1);
  }
  
  // Read workspace patterns
  const packagesDir = path.join(projectRoot, 'packages');
  // const packagesExtDir = path.join(projectRoot, 'packages-ext');
  
  const packages = [];
  
  // Add packages from packages/
  if (fs.existsSync(packagesDir)) {
    const dirs = fs.readdirSync(packagesDir, { withFileTypes: true });
    for (const dir of dirs) {
      if (dir.isDirectory()) {
        const packagePath = path.join(packagesDir, dir.name);
        const packageJsonPath = path.join(packagePath, 'package.json');
        if (fs.existsSync(packageJsonPath)) {
          packages.push({
            name: dir.name,
            path: packagePath,
            relativePath: `packages/${dir.name}`
          });
        }
      }
    }
  }
  
  // Add packages from packages-ext/
  // if (fs.existsSync(packagesExtDir)) {
  //   const dirs = fs.readdirSync(packagesExtDir, { withFileTypes: true });
  //   for (const dir of dirs) {
  //     if (dir.isDirectory()) {
  //       const packagePath = path.join(packagesExtDir, dir.name);
  //       const packageJsonPath = path.join(packagePath, 'package.json');
  //       if (fs.existsSync(packageJsonPath)) {
  //         packages.push({
  //           name: dir.name,
  //           path: packagePath,
  //           relativePath: `packages-ext/${dir.name}`
  //         });
  //       }
  //     }
  //   }
  // }
  
  return packages;
}

function packPackage(pkg) {
  console.log(`📦 Packaging ${pkg.name}...`);
  
  try {
    // Check if package has dist files (built output)
    const distPath = path.join(pkg.path, 'dist');
    if (!fs.existsSync(distPath)) {
      console.warn(`⚠️  ${pkg.name} has no dist folder, skipping...`);
      return;
    }
    
    // Create tarball using pnpm pack
    execSync('pnpm pack', { 
      cwd: pkg.path, 
      stdio: 'inherit' 
    });
    
    console.log(`✅ ${pkg.name} packaged successfully!`);
  } catch (error) {
    console.error(`❌ Failed to package ${pkg.name}:`, error.message);
  }
}

function packAll() {
  console.log('📦 Packaging all workspace packages...\n');
  
  const packages = getWorkspacePackages();
  
  if (packages.length === 0) {
    console.warn('⚠️  No packages found to pack');
    return;
  }
  
  console.log(`Found ${packages.length} packages:`, packages.map(p => p.name).join(', '));
  console.log('');
  
  // Pack each package
  for (const pkg of packages) {
    packPackage(pkg);
  }
  
  console.log('\n🎉 Packaging complete!');
  
  // List generated tarballs
  console.log('\n📋 Generated packages:');
  try {
    for (const pkg of packages) {
      const tarballs = fs.readdirSync(pkg.path)
        .filter(file => file.endsWith('.tgz'))
        .map(file => path.join(pkg.relativePath, file));
      
      if (tarballs.length > 0) {
        tarballs.forEach(tarball => console.log(`  - ${tarball}`));
      }
    }
  } catch (error) {
    console.warn('Could not list generated tarballs:', error.message);
  }
}

const args = process.argv.slice(2);
const target = args[0];

if (target) {
  // Pack specific package
  const packages = getWorkspacePackages();
  const pkg = packages.find(p => p.name === target);
  
  if (pkg) {
    packPackage(pkg);
  } else {
    console.error(`❌ Package '${target}' not found`);
    console.log('Available packages:', packages.map(p => p.name).join(', '));
    process.exit(1);
  }
} else {
  // Pack all packages
  packAll();
}