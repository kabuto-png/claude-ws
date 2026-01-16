import type { Config } from 'drizzle-kit';
import path from 'path';
import os from 'os';

// Database location in user's home directory for persistence
const DB_DIR = path.join(os.homedir(), '.claude-ws');
const DB_PATH = path.join(DB_DIR, 'claude-ws.db');

export default {
  schema: './src/lib/db/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
  dbCredentials: {
    url: DB_PATH,
  },
} satisfies Config;
