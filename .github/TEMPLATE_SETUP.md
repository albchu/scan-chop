# 📋 Template Repository Setup Guide

This repository is configured as a **GitHub Template Repository**. Here's how to use it effectively:

## 🚀 **Creating a New Project**

### For Project Creators:
1. **Click "Use this template"** (green button at the top of this repository)
2. **Choose "Create a new repository"**
3. **Fill in your new repository details:**
   - Repository name
   - Description
   - Public/Private setting
   - Include all branches (optional)

### After Repository Creation:
1. **Clone your new repository**
2. **Follow the instructions in `TEMPLATE_README.md`**
3. **Customize the project for your needs**

## 🛠️ **Template Maintenance**

### For Template Maintainers:

#### Updating the Template:
- Make changes to this repository
- Changes will be available for future template uses
- **Note**: Existing projects created from this template won't automatically update

#### Key Template Files:
- `TEMPLATE_README.md` - Instructions for new users
- `.github/TEMPLATE_SETUP.md` - This file
- All `package.json` files - Need project name placeholders
- `apps/electron-app/electron-builder.json` - App configuration

#### Best Practices:
1. **Keep dependencies up to date**
2. **Test the template regularly** by creating test projects
3. **Document any breaking changes** in releases
4. **Use semantic versioning** for template releases

## 🎯 **Template Features**

This template provides:
- ✅ **Cross-platform architecture** (Electron + Web)
- ✅ **TypeScript monorepo** with shared packages
- ✅ **Backend-managed state** pattern
- ✅ **Modern build system** (Turborepo + Vite)
- ✅ **Testing setup** (Vitest + React Testing Library)
- ✅ **Code quality tools** (ESLint + Prettier)

## 📊 **Template Usage Analytics**

GitHub provides insights on template usage:
- Go to **Insights** → **Traffic** → **Popular content**
- Track how often your template is used
- See which files are most accessed

## 🔄 **Template Updates**

### Versioning Strategy:
1. **Tag releases** when making significant template improvements
2. **Use semantic versioning**: `v1.0.0`, `v1.1.0`, etc.
3. **Create release notes** explaining changes and migration steps

### Release Process:
```bash
# Create a new release
git tag -a v1.1.0 -m "Template v1.1.0: Updated dependencies and improved setup"
git push origin v1.1.0

# Create GitHub release with changelog
# Go to GitHub → Releases → Create new release
```

## 📝 **Contributing to Template**

### For Contributors:
1. **Fork this repository**
2. **Create a feature branch**
3. **Test your changes** by creating a test project from your fork
4. **Submit a pull request** with clear description of improvements

### Testing Template Changes:
1. **Enable template mode** on your fork
2. **Create a test project** using your fork as template
3. **Verify the setup process** works correctly
4. **Test both Electron and Web builds**

## 🔗 **Related Resources**

- [GitHub Template Repository Documentation](https://docs.github.com/en/repositories/creating-and-managing-repositories/creating-a-template-repository)
- [Turborepo Documentation](https://turbo.build/repo/docs)
- [Electron Documentation](https://electronjs.org/docs)
- [Vite Documentation](https://vitejs.dev) 