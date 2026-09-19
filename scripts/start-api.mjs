import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const apiDir = join(root, 'apps/api');

const dataDir = process.env.DATA_DIR || join(root, 'data');
const uploadDir = process.env.UPLOAD_DIR || join(dataDir, 'uploads');
const dbFile =
  process.env.DATABASE_URL?.replace(/^file:/, '') || join(dataDir, 'dregz.db');

mkdirSync(dataDir, { recursive: true });
mkdirSync(uploadDir, { recursive: true });
mkdirSync(dirname(dbFile), { recursive: true });

process.env.DATABASE_URL = process.env.DATABASE_URL || `file:${dbFile}`;
process.env.UPLOAD_DIR = uploadDir;
process.env.PORT = process.env.PORT || '4000';
process.env.CORS_ORIGIN =
  process.env.CORS_ORIGIN ||
  process.env.PUBLIC_WEB_URL ||
  'https://dasma-drenushes-dhe-egzonit.vercel.app';

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: apiDir,
      env: process.env,
      stdio: 'inherit',
      shell: process.platform === 'win32',
    });
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} exited ${code}`));
    });
  });
}

async function main() {
  console.log('DB push + seed…');
  await run('npx', ['prisma', 'db', 'push', '--skip-generate']);
  await run('npx', ['prisma', 'db', 'seed']);

  console.log('Starting API on port', process.env.PORT);
  const child = spawn('node', ['dist/main.js'], {
    cwd: apiDir,
    env: process.env,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  child.on('exit', (code) => process.exit(code || 1));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
