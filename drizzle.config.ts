import type { Config } from 'drizzle-kit';
import path from 'path';
import fs from 'fs';

// Database location in project directory for multi-instance support
const DB_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DB_DIR, 'claude-ws.db');

// Ensure directory exists before drizzle-kit tries to connect
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

export default {
  schema: './src/lib/db/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
  dbCredentials: {
    url: DB_PATH,
  },
} satisfies Config;
