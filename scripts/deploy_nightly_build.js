/**
 * Nightly deployment script for recoil-next
 * Publishes nightly builds to npm with nightly tag
 */

const {execSync} = require('child_process');
const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');

// Configuration
const NIGHTLY_TAG = 'nightly';
const COMMIT_MSG = 'Publishing nightly build of recoil-next';

// Workspace packages to deploy
const DEPLOYABLE_PACKAGES = [
  'packages/recoil', // recoil-next
  'packages/recoil-relay', // recoil-relay-next
  // 'packages/recoil-sync',  // recoil-sync-next
  'packages/refine', // refine-next
  // Note: shared package is typically not published separately
];

function getPackageInfo(packagePath) {
  const packageJsonPath = path.join(projectRoot, packagePath, 'package.json');
  if (!fs.existsSync(packageJsonPath)) {
    throw new Error(`Package.json not found at ${packageJsonPath}`);
  }
  return JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
}

function generateNightlyVersion() {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0].replace(/-/g, '');
  const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '');
  return `0.0.0-nightly-${dateStr}-${timeStr}`;
}

function updatePackageVersion(packagePath, nightlyVersion) {
  const packageJsonPath = path.join(projectRoot, packagePath, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

  // Store original version for restoration
  const originalVersion = packageJson.version;

  // Update to nightly version
  packageJson.version = nightlyVersion;

  // Update internal dependencies to nightly versions too
  if (packageJson.dependencies) {
    for (const [dep, version] of Object.entries(packageJson.dependencies)) {
      if (
        dep.startsWith('recoil') ||
        dep.startsWith('refine') ||
        dep.startsWith('@recoiljs/')
      ) {
        packageJson.dependencies[dep] = nightlyVersion;
      }
    }
  }

  if (packageJson.peerDependencies) {
    for (const [dep, version] of Object.entries(packageJson.peerDependencies)) {
      if (
        dep.startsWith('recoil') ||
        dep.startsWith('refine') ||
        dep.startsWith('@recoiljs/')
      ) {
        packageJson.peerDependencies[dep] = nightlyVersion;
      }
    }
  }

  fs.writeFileSync(
    packageJsonPath,
    JSON.stringify(packageJson, null, 2) + '\n',
  );

  return originalVersion;
}

function restorePackageVersion(packagePath, originalVersion) {
  // Use git to restore the package.json to avoid version conflicts
  try {
    execSync('git checkout -- package.json', {
      cwd: path.join(projectRoot, packagePath),
      stdio: 'inherit',
    });
  } catch (error) {
    // Fallback: manually restore version
    const packageJsonPath = path.join(projectRoot, packagePath, 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    packageJson.version = originalVersion;
    fs.writeFileSync(
      packageJsonPath,
      JSON.stringify(packageJson, null, 2) + '\n',
    );
  }
}

function deployNightly() {
  console.log('🌙 Starting nightly deployment...\n');

  // Check if we're on the right branch and repo
  try {
    const currentBranch = execSync('git branch --show-current', {
      cwd: projectRoot,
      encoding: 'utf8',
    }).trim();
    console.log(`Current branch: ${currentBranch}`);

    if (currentBranch !== 'main') {
      console.warn('⚠️  Not on main branch, proceeding anyway...');
    }
  } catch (error) {
    console.error('❌ Failed to check git branch:', error.message);
    process.exit(1);
  }

  // Generate nightly version
  const nightlyVersion = generateNightlyVersion();
  console.log(`🏷️  Nightly version: ${nightlyVersion}`);

  // Store original versions for restoration
  const originalVersions = {};

  try {
    // Build all packages first
    console.log('\n🔨 Building packages...');
    execSync('node scripts/build.mjs', {
      cwd: projectRoot,
      stdio: 'inherit',
    });

    // Update all package versions to nightly
    console.log('\n📝 Updating package versions...');
    for (const packagePath of DEPLOYABLE_PACKAGES) {
      const packageInfo = getPackageInfo(packagePath);
      originalVersions[packagePath] = packageInfo.version;
      updatePackageVersion(packagePath, nightlyVersion);
      console.log(`Updated ${packageInfo.name} to ${nightlyVersion}`);
    }

    // Publish each package with nightly tag
    console.log('\n🚀 Publishing packages...');
    for (const packagePath of DEPLOYABLE_PACKAGES) {
      const packageInfo = getPackageInfo(packagePath);
      console.log(`Publishing ${packageInfo.name}...`);

      try {
        execSync(
          `pnpm publish --tag ${NIGHTLY_TAG} --access public --no-git-checks`,
          {
            cwd: path.join(projectRoot, packagePath),
            stdio: 'inherit',
          },
        );
        console.log(`✅ Published ${packageInfo.name}@${nightlyVersion}`);
      } catch (error) {
        console.error(
          `❌ Failed to publish ${packageInfo.name}:`,
          error.message,
        );
        throw error;
      }
    }

    console.log('\n🎉 Nightly deployment completed successfully!');
    console.log(`\nInstall with:`);
    console.log(`  npm install recoil-next@${NIGHTLY_TAG}`);
    console.log(`  npm install recoil-relay-next@${NIGHTLY_TAG}`);
    console.log(`  npm install recoil-sync-next@${NIGHTLY_TAG}`);
    console.log(`  npm install refine-next@${NIGHTLY_TAG}`);
  } catch (error) {
    console.error('\n❌ Nightly deployment failed:', error.message);
    process.exit(1);
  } finally {
    // Restore original versions
    console.log('\n🔄 Restoring original versions...');
    for (const [packagePath, originalVersion] of Object.entries(
      originalVersions,
    )) {
      try {
        restorePackageVersion(packagePath, originalVersion);
        console.log(`Restored ${packagePath} to ${originalVersion}`);
      } catch (error) {
        console.warn(`⚠️  Failed to restore ${packagePath}:`, error.message);
      }
    }
  }
}

// Run deployment
if (require.main === module) {
  deployNightly();
}

module.exports = {deployNightly, generateNightlyVersion};
