#!/usr/bin/env node

/**
 * Claude Workspace CLI Entry Point
 *
 * This script:
 * 1. Auto-migrates the database on first run (using initDb from src/lib/db)
 * 2. Starts the Next.js server with Socket.io
 * 3. Opens browser to localhost:3000
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Get package root directory
const packageRoot = path.resolve(__dirname, '..');

// Database path (in user's home directory for persistence)
const DB_DIR = path.join(os.homedir(), '.claude-ws');
const DB_PATH = path.join(DB_DIR, 'claude-ws.db');

// Ensure .claude-ws directory exists
if (!fs.existsSync(DB_DIR)) {
  console.log('[Claude Workspace] Creating database directory:', DB_DIR);
  fs.mkdirSync(DB_DIR, { recursive: true });
}

async function startServer() {
  console.log('[Claude Workspace] Starting server...');
  console.log('[Claude Workspace] Database location:', DB_PATH);
  console.log('[Claude Workspace] Server will be available at http://localhost:8556');
  console.log('');

  const serverPath = path.join(packageRoot, 'server.ts');

  // Try to find tsx binary in different possible locations
  let tsxCmd;
  const possiblePaths = [
    path.join(packageRoot, 'node_modules', '.bin', 'tsx'),
    path.join(packageRoot, '..', '.bin', 'tsx'), // For global npm installs
  ];

  // Check if tsx exists in any of the possible paths
  for (const tsxPath of possiblePaths) {
    if (fs.existsSync(tsxPath)) {
      tsxCmd = tsxPath;
      break;
    }
  }

  // If still not found, try using node with --loader tsx
  if (!tsxCmd) {
    try {
      // Try using tsx from global or local pnpm/npm
      const { execSync } = require('child_process');
      execSync('which tsx', { stdio: 'ignore' });
      tsxCmd = 'tsx';
    } catch {
      console.error('[Claude Workspace] Error: tsx not found');
      console.error('[Claude Workspace] Please run: npm install -g tsx');
      console.error('[Claude Workspace] Or: pnpm add -g tsx');
      process.exit(1);
    }
  }

  const server = spawn(tsxCmd, [serverPath], {
    cwd: packageRoot,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: {
      ...process.env,
      NODE_ENV: process.env.NODE_ENV || 'production',
    }
  });

  setupServerHandlers(server);
}

function setupServerHandlers(server) {
  server.on('error', (error) => {
    console.error('[Claude Workspace] Failed to start server:', error.message);
    process.exit(1);
  });

  server.on('close', (code) => {
    console.log(`\n[Claude Workspace] Server exited with code ${code}`);
    process.exit(code);
  });

  // Handle Ctrl+C gracefully
  process.on('SIGINT', () => {
    console.log('\n[Claude Workspace] Shutting down gracefully...');
    server.kill('SIGINT');
    setTimeout(() => {
      server.kill('SIGKILL');
      process.exit(0);
    }, 5000);
  });

  process.on('SIGTERM', () => {
    console.log('\n[Claude Workspace] Received SIGTERM, shutting down...');
    server.kill('SIGTERM');
  });
}

async function main() {
  try {
    console.log('');
    console.log('🚀 Claude Workspace - AI Task Management Interface');
    console.log('='.repeat(60));
    console.log('');

    // Database will be auto-initialized by src/lib/db/index.ts on first import
    // No need to run separate migration - initDb() handles it all

    await startServer();

  } catch (error) {
    console.error('[Claude Workspace] Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
