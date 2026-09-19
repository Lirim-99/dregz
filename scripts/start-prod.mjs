import { spawn } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const dataDir = process.env.DATA_DIR || join(root, 'data');
const uploadDir = process.env.UPLOAD_DIR || join(dataDir, 'uploads');
const dbPath = process.env.DATABASE_URL?.replace(/^file:/, '') || join(dataDir, 'dregz.db');

mkdirSync(dataDir, { recursive: true });
mkdirSync(uploadDir, { recursive: true });
mkdirSync(dirname(dbPath), { recursive: true });

process.env.DATABASE_URL = process.env.DATABASE_URL || `file:${dbPath}`;
process.env.UPLOAD_DIR = uploadDir;
process.env.API_PORT = process.env.API_PORT || '4000';
process.env.PORT = process.env.PORT || '3000';
process.env.CORS_ORIGIN =
  process.env.CORS_ORIGIN || process.env.PUBLIC_WEB_URL || '*';

function run(command, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: opts.cwd || root,
      env: { ...process.env, ...opts.env },
      stdio: 'inherit',
      shell: process.platform === 'win32',
    });
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(' ')} exited ${code}`));
    });
  });
}

function start(command, args, opts = {}) {
  const child = spawn(command, args, {
    cwd: opts.cwd || root,
    env: { ...process.env, ...opts.env },
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  child.on('exit', (code) => {
    console.error(`[${command}] exited with ${code}`);
    process.exit(code || 1);
  });
  return child;
}

async function main() {
  console.log('Preparing database…');
  await run('npx', ['prisma', 'db', 'push', '--skip-generate'], {
    cwd: join(root, 'apps/api'),
  });
  await run('npx', ['prisma', 'db', 'seed'], {
    cwd: join(root, 'apps/api'),
  });

  console.log('Starting API on', process.env.API_PORT);
  start('node', ['dist/main.js'], {
    cwd: join(root, 'apps/api'),
    env: {
      PORT: process.env.API_PORT,
      UPLOAD_DIR: uploadDir,
      DATABASE_URL: process.env.DATABASE_URL,
    },
  });

  const webServer = join(root, 'apps/web/.next/standalone/apps/web/server.js');
  const altServer = join(root, 'apps/web/.next/standalone/server.js');
  const serverPath = existsSync(webServer) ? webServer : altServer;
  const serverCwd = existsSync(webServer)
    ? join(root, 'apps/web/.next/standalone/apps/web')
    : join(root, 'apps/web/.next/standalone');

  // Copy static assets next to standalone server if needed
  console.log('Starting web on', process.env.PORT, '→', serverPath);
  start('node', [serverPath], {
    cwd: serverCwd,
    env: {
      PORT: process.env.PORT,
      HOSTNAME: '0.0.0.0',
      API_URL: process.env.API_URL || `http://127.0.0.1:${process.env.API_PORT}`,
    },
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
