# NPM Publishing Guide - claudekanban

## Package Summary

**Package name:** `claudekanban`
**Repository:** https://github.com/Claude-Workspace/claude-kanban
**Type:** CLI tool with auto-migration
**Database:** SQLite in `~/.claude-kanban/`

## What Was Changed

### 1. Created CLI Entry Point
- **File:** `bin/claudekanban.js`
- Executable script that starts the server using `tsx`
- Auto-creates database directory in user's home
- Handles graceful shutdown (SIGINT/SIGTERM)

### 2. Updated package.json
- Changed `name` to `claudekanban`
- Set `private: false` to allow publishing
- Added `bin` field pointing to CLI script
- Moved `tsx` from devDependencies to dependencies (required for runtime)
- Updated repository URLs to Claude-Workspace org
- Added metadata: description, keywords, author, license, engines
- Configured `files` array for publishing

### 3. Database Configuration
- **File:** `src/lib/db/index.ts`
  - Changed DB path from `process.cwd()/data/` to `~/.claude-kanban/`
  - Database persists across npx runs

- **File:** `drizzle.config.ts`
  - Created config for drizzle-kit migrations
  - Points to home directory DB

### 4. Publishing Files
- Created `.npmignore` to exclude dev files
- Created `LICENSE` (MIT)
- Updated README with npx usage instructions

## Pre-Publishing Checklist

### 1. Update Author Info
Edit `package.json` line 7:
```json
"author": "Your Name <your.email@example.com>",
```
Replace with your actual name and email.

### 2. Verify Package Name Availability
```bash
npm search claudekanban
```
If name is taken, update `name` in package.json.

### 3. Login to NPM
```bash
npm login
```
Enter your npm credentials.

### 4. Test Locally (IMPORTANT!)
```bash
# In claude-kanban directory
npm pack

# This creates claudekanban-0.1.0.tgz
# Test install globally
npm install -g ./claudekanban-0.1.0.tgz

# Test run
claudekanban

# Should start server at http://localhost:8556
# Verify database created in ~/.claude-kanban/

# Cleanup
npm uninstall -g claudekanban
rm claudekanban-0.1.0.tgz
```

### 5. Test with npx
```bash
# After pack
npx ./claudekanban-0.1.0.tgz

# Should work the same as global install
```

## Publishing Commands

### Publish to NPM (Public)
```bash
cd /Users/yihan/working-base/techcomthanh/claude-ws/claude-kanban

# Dry run first (see what will be published)
npm publish --dry-run

# Actual publish
npm publish --access public
```

### Version Management
```bash
# Patch version (0.1.0 -> 0.1.1)
npm version patch
npm publish --access public

# Minor version (0.1.0 -> 0.2.0)
npm version minor
npm publish --access public

# Major version (0.1.0 -> 1.0.0)
npm version major
npm publish --access public
```

## Post-Publishing

### 1. Verify on NPM
Visit: https://www.npmjs.com/package/claudekanban

### 2. Test Installation
```bash
# Different directory
npx claudekanban

# Or global
npm install -g claudekanban
claudekanban
```

### 3. Update Repository
Push changes to GitHub:
```bash
git add .
git commit -m "feat: prepare package for npm publishing

- Add CLI entry point with auto-migration
- Move database to user home directory
- Update package.json for npm publishing
- Add .npmignore and LICENSE
- Update README with npx instructions"

git push origin main
```

### 4. Create GitHub Release
```bash
gh release create v0.1.0 --title "v0.1.0 - Initial Release" --notes "First public release of claudekanban CLI tool"
```

## Usage After Publishing

Users can run:
```bash
# One-time run
npx claudekanban

# Or install globally
npm install -g claudekanban
claudekanban
```

## Important Notes

1. **Database Location:** `~/.claude-kanban/claude-kanban.db`
   - Persists across runs
   - Auto-initialized on first run
   - Users can delete this directory to reset

2. **Dependencies:** All runtime dependencies included
   - `tsx` for TypeScript execution
   - `better-sqlite3` for database (native binary, auto-built on install)
   - Next.js and React for web UI

3. **Port:** Server runs on port 8556 by default
   - Set `PORT=3001` env var to change

4. **Node Version:** Requires Node.js >= 20.0.0

## Troubleshooting

### better-sqlite3 Build Fails
Some users may have issues with native binary:
```bash
# Add to README troubleshooting section
npm install --build-from-source
```

### Permission Issues
If global install fails:
```bash
sudo npm install -g claudekanban
# Or use npx (no sudo needed)
npx claudekanban
```

## Next Steps

After successful publish:
1. ✅ Test `npx claudekanban` from different directory
2. ✅ Update repository README badges
3. ✅ Create GitHub release
4. ✅ Share on social media / communities
5. ✅ Monitor npm stats: https://www.npmjs.com/package/claudekanban

## Questions?

- NPM Package: https://www.npmjs.com/package/claudekanban
- GitHub Issues: https://github.com/Claude-Workspace/claude-kanban/issues
- Documentation: https://github.com/Claude-Workspace/claude-kanban#readme
