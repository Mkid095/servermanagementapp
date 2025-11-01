#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function createPortablePackage() {
  console.log('📦 Creating portable package...\n');

  // Clean up any existing builds
  if (fs.existsSync('dist')) {
    console.log('🧹 Cleaning up existing builds...');
    try {
      execSync('rm -rf dist', { stdio: 'inherit' });
    } catch (error) {
      console.log('Cleanup completed with some warnings');
    }
  }

  // Build the EXE
  console.log('🔨 Building executable...');
  try {
    execSync('npm run pack', { stdio: 'inherit' });
  } catch (error) {
    console.error('❌ Build failed:', error.message);
    process.exit(1);
  }

  // Create package
  const packageName = `server-manager-portable-v1.0.0`;
  const packageDir = path.join('dist', packageName);

  console.log('📁 Creating package directory...');
  if (!fs.existsSync(packageDir)) {
    fs.mkdirSync(packageDir, { recursive: true });
  }

  // Copy EXE and required files
  console.log('📋 Copying application files...');
  const sourceDir = path.join('dist', 'server-manager-win32-x64');

  // Copy EXE and essential files
  const essentialFiles = [
    'server-manager.exe',
    'resources.pak',
    'snapshot_blob.bin',
    'v8_context_snapshot.bin',
    'version'
  ];

  // Copy all DLLs
  const dllFiles = fs.readdirSync(sourceDir).filter(file => file.endsWith('.dll'));

  // Copy directories
  const directories = ['locales', 'resources'];

  // Copy essential files
  essentialFiles.forEach(file => {
    const src = path.join(sourceDir, file);
    const dest = path.join(packageDir, file);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, dest);
    }
  });

  // Copy DLLs
  dllFiles.forEach(file => {
    const src = path.join(sourceDir, file);
    const dest = path.join(packageDir, file);
    fs.copyFileSync(src, dest);
  });

  // Copy directories
  directories.forEach(dir => {
    const src = path.join(sourceDir, dir);
    const dest = path.join(packageDir, dir);
    if (fs.existsSync(src)) {
      copyDirSync(src, dest);
    }
  });

  // Copy README and documentation
  console.log('📖 Adding documentation...');
  const readmeSrc = path.join('dist', 'README.txt');
  const readmeDest = path.join(packageDir, 'README.txt');
  if (fs.existsSync(readmeSrc)) {
    fs.copyFileSync(readmeSrc, readmeDest);
  }

  // Create installer script
  console.log('🔧 Creating installer script...');
  const installerScript = `@echo off
echo Starting Server Manager...
echo =====================
echo.
echo If this is your first time running the application,
echo you may need to allow it through Windows Firewall.
echo.
echo Press any key to start...
pause >nul

start "" server-manager.exe

echo Server Manager is now running in your system tray.
echo You can right-click the tray icon to access server management options.
echo.
pause`;

  fs.writeFileSync(path.join(packageDir, 'Start Server Manager.bat'), installerScript);

  // Create ZIP archive (if 7-zip is available)
  console.log('📦 Creating ZIP archive...');
  try {
    const zipName = `${packageName}.zip`;
    execSync(`cd dist && powershell Compress-Archive -Path '${packageName}' -DestinationPath '${zipName}' -Force`, { stdio: 'inherit' });
    console.log(`✅ Portable package created: dist/${zipName}`);
  } catch (error) {
    console.log('⚠️  Could not create ZIP archive. Package available in:', packageDir);
  }

  console.log('\n🎉 Package creation completed!');
  console.log('📂 Package location:', packageDir);
  console.log('🚀 Ready for distribution!');
}

function copyDirSync(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

if (require.main === module) {
  createPortablePackage();
}

module.exports = { createPortablePackage };