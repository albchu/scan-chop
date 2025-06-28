#!/usr/bin/env node

/**
 * Template Customization Script
 * 
 * Run this script after creating a new project from the template to
 * automatically customize project names, descriptions, and metadata.
 * 
 * Usage: node customize-template.js
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

function replaceInFile(filePath, replacements) {
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  File not found: ${filePath}`);
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  
  for (const [search, replace] of replacements) {
    content = content.replace(new RegExp(search, 'g'), replace);
  }
  
  fs.writeFileSync(filePath, content);
  console.log(`✅ Updated: ${filePath}`);
}

function updatePackageJson(filePath, updates) {
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  File not found: ${filePath}`);
    return;
  }

  const packageJson = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  
  Object.assign(packageJson, updates);
  
  fs.writeFileSync(filePath, JSON.stringify(packageJson, null, 2) + '\n');
  console.log(`✅ Updated: ${filePath}`);
}

async function main() {
  console.log('🚀 Platform-Agnostic React UI Template Customization\n');
  
  // Gather project information
  const projectName = await question('📝 Project name (kebab-case): ');
  const displayName = await question('📝 Display name (for Electron app): ');
  const description = await question('📝 Project description: ');
  const authorName = await question('📝 Author name: ');
  const authorEmail = await question('📝 Author email: ');
  const gitUrl = await question('📝 Git repository URL (optional): ');
  
  console.log('\n🔄 Updating project files...\n');
  
  // Define replacements
  const replacements = [
    ['platform-agnostic-react-ui', projectName],
    ['Platform-Agnostic React UI', displayName],
    ['com\\.yourcompany\\.platform-agnostic-react-ui', `com.yourcompany.${projectName}`],
    ['Your Name <your\\.email@example\\.com>', `${authorName} <${authorEmail}>`]
  ];
  
  // Update package.json files
  const packageJsonFiles = [
    'package.json',
    'apps/electron-app/package.json',
    'apps/web-app/package.json',
    'packages/shared/package.json',
    'packages/ui/package.json',
    'packages/backend-web/package.json',
    'packages/backend-electron/package.json'
  ];
  
  packageJsonFiles.forEach(file => {
    if (fs.existsSync(file)) {
      const updates = {
        name: file === 'package.json' ? projectName : 
              file.includes('electron-app') ? `${projectName}-electron` :
              file.includes('web-app') ? `${projectName}-web` :
              file.includes('shared') ? `${projectName}-shared` :
              file.includes('ui') ? `${projectName}-ui` :
              file.includes('backend-web') ? `${projectName}-backend-web` :
              file.includes('backend-electron') ? `${projectName}-backend-electron` :
              projectName,
        description: description,
        author: `${authorName} <${authorEmail}>`
      };
      
      if (gitUrl && file === 'package.json') {
        updates.repository = {
          type: 'git',
          url: gitUrl
        };
      }
      
      updatePackageJson(file, updates);
    }
  });
  
  // Update electron-builder.json
  if (fs.existsSync('apps/electron-app/electron-builder.json')) {
    const electronBuilder = JSON.parse(fs.readFileSync('apps/electron-app/electron-builder.json', 'utf8'));
    electronBuilder.appId = `com.yourcompany.${projectName}`;
    electronBuilder.productName = displayName;
    
    fs.writeFileSync('apps/electron-app/electron-builder.json', JSON.stringify(electronBuilder, null, 2) + '\n');
    console.log('✅ Updated: apps/electron-app/electron-builder.json');
  }
  
  // Update README.md
  if (fs.existsSync('README.md')) {
    replaceInFile('README.md', [
      ['# 🚀 Platform-Agnostic React UI', `# 🚀 ${displayName}`],
      ['platform-agnostic-react-ui', projectName]
    ]);
  }
  
  console.log('\n🎉 Template customization complete!\n');
  console.log('Next steps:');
  console.log('1. Run: pnpm install');
  console.log('2. Run: pnpm dev (to test Electron app)');
  console.log('3. Run: pnpm dev:web (to test Web app)');
  console.log('4. Delete: customize-template.js (this file)');
  console.log('5. Delete: TEMPLATE_README.md');
  console.log('6. Update: README.md with your project-specific information\n');
  
  rl.close();
}

main().catch(console.error); 