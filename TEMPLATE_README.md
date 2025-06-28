# 🚀 Your New Platform-Agnostic React App

**Congratulations!** You've successfully created a new project from the Platform-Agnostic React UI template.

## 🎯 **Next Steps After Template Creation**

### 1. **Customize Your Project**

Replace the following placeholders throughout your project:

- **Project Name**: Currently `platform-agnostic-react-ui`
- **App ID**: Currently `com.yourcompany.platform-agnostic-react-ui` 
- **Product Name**: Currently `Platform-Agnostic React UI`
- **Description**: Update in package.json files
- **Author Information**: Update in package.json files

### 2. **Quick Find & Replace Guide**

Run these commands in your project root:

```bash
# Replace project name in package.json files
find . -name "package.json" -exec sed -i 's/platform-agnostic-react-ui/YOUR_PROJECT_NAME/g' {} \;

# Replace app ID in electron-builder.json
sed -i 's/com.yourcompany.platform-agnostic-react-ui/com.yourcompany.YOUR_PROJECT_NAME/g' apps/electron-app/electron-builder.json

# Replace product name in electron-builder.json
sed -i 's/Platform-Agnostic React UI/YOUR_APP_DISPLAY_NAME/g' apps/electron-app/electron-builder.json
```

**For Windows (PowerShell):**
```powershell
# Replace project name
(Get-Content -Path "package.json") -replace "platform-agnostic-react-ui", "YOUR_PROJECT_NAME" | Set-Content -Path "package.json"

# Replace in electron-builder.json
(Get-Content -Path "apps/electron-app/electron-builder.json") -replace "com.yourcompany.platform-agnostic-react-ui", "com.yourcompany.YOUR_PROJECT_NAME" | Set-Content -Path "apps/electron-app/electron-builder.json"
```

### 3. **Manual Updates Needed**

Edit these files manually:

#### `package.json` (root)
```json
{
  "name": "YOUR_PROJECT_NAME",
  "description": "Your project description"
}
```

#### `apps/electron-app/package.json`
```json
{
  "name": "YOUR_PROJECT_NAME-electron",
  "description": "Your project description - Electron app"
}
```

#### `apps/web-app/package.json`
```json
{
  "name": "YOUR_PROJECT_NAME-web",
  "description": "Your project description - Web app"
}
```

#### `apps/electron-app/electron-builder.json`
```json
{
  "appId": "com.yourcompany.YOUR_PROJECT_NAME",
  "productName": "Your App Display Name"
}
```

### 4. **Quick Setup with Customization Script (Recommended)**

For the easiest setup, use the interactive customization script:

```bash
# Run the interactive customization script
node customize-template.js
```

This script will:
- ✅ **Prompt you for project details** (name, description, author, etc.)
- ✅ **Automatically update all package.json files**
- ✅ **Configure Electron app settings**
- ✅ **Update project metadata** throughout the codebase
- ✅ **Provide clear next steps**

**After running the script:**
```bash
# Install dependencies
pnpm install

# Verify everything works
pnpm dev
```

### 4b. **Manual Setup (Alternative)**

If you prefer manual customization, skip the script and follow the manual steps below.

### 5. **Install Dependencies**

```bash
# Install all dependencies
pnpm install

# Verify everything works
pnpm dev
```

### 6. **Choose Your Platform(s)**

This template supports both Electron and Web. If you only need one:

#### **Web Only:**
```bash
# Remove Electron app
rm -rf apps/electron-app packages/backend-electron

# Update root package.json scripts (remove electron-related commands)
```

#### **Electron Only:**
```bash
# Remove Web app  
rm -rf apps/web-app packages/backend-web

# Update root package.json scripts (remove web-related commands)
```

### 7. **Customize Your App Logic**

The template includes a simple counter example. Replace it with your app logic:

- **State**: Edit `packages/shared/src/types.ts` → `AppState` interface
- **Actions**: Edit `packages/shared/src/types.ts` → `Action` type
- **UI**: Edit `packages/ui/src/App.tsx`
- **Backend Logic**: Edit backend implementations in `packages/backend-*`

## 🚀 **Development Commands**

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start Electron app |
| `pnpm dev:web` | Start Web app |
| `pnpm test` | Run all tests |
| `pnpm build` | Build all packages |
| `pnpm build:web` | Build web app for production |
| `pnpm build:electron` | Build Electron app |
| `pnpm package:electron` | Package Electron app for distribution |

## 📚 **Architecture Overview**

Your app uses a **backend-managed state architecture**:

- **UI Layer**: Pure React components that dispatch actions
- **Backend Layer**: Platform-specific state management (Electron IPC or Web in-memory)
- **Shared Layer**: TypeScript types and interfaces

## 🔗 **Useful Links**

- [Original Template Repository](https://github.com/yourusername/platform-agnostic-react-ui)
- [Technical Specification](docs/TECH_SPEC.md)
- [Electron Documentation](https://electronjs.org/docs)
- [Vite Documentation](https://vitejs.dev)

---

## 🗑️ **Clean Up**

Once you've customized your project, you can:

1. **Delete these template files**:
   - `TEMPLATE_README.md` (this file)
   - `customize-template.js` (customization script)
   - `.github/TEMPLATE_SETUP.md` (template maintenance guide)
2. **Rename `README.md`** to `ORIGINAL_README.md` (for reference)
3. **Create your own `README.md`** with your project-specific information

Happy coding! 🎉 