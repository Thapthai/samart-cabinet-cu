/**
 * PM2 — รัน NestJS production หลัง `npm run build`
 * ดูคำแนะนำเต็มที่ README-DEPLOY-PM2.md (โฟลเดอร์ root ของ repo)
 */
const fs = require('fs');
const path = require('path');

function parseEnvFile(filePath) {
  const out = {};
  if (!fs.existsSync(filePath)) return out;
  const text = fs.readFileSync(filePath, 'utf8');
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

const fileEnv = {
  ...parseEnvFile(path.join(__dirname, '.env.production')),
  ...parseEnvFile(path.join(__dirname, '.env')),
};

const env = {
  ...fileEnv,
  NODE_ENV: 'production',
};

if (!env.PORT || String(env.PORT).trim() === '') {
  env.PORT = process.env.PORT || '7100';
}

/** Nest `nest build` ผลิต `dist/src/main.js` (ไม่ใช่ dist/main.js) */
const mainEntry = path.join(__dirname, 'dist', 'src', 'main.js');
if (!fs.existsSync(mainEntry)) {
  console.error(
    '\n[ecosystem] ยังไม่มี dist/src/main.js — รัน `npm run build` ในโฟลเดอร์ backend ก่อน แล้วค่อย `pm2 start ecosystem.config.cjs`\n',
  );
  process.exit(1);
}

module.exports = {
  apps: [
    {
      name: 'med-supplies-cu-backend',
      cwd: __dirname,
      script: mainEntry,
      interpreter: 'node',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env,
    },
  ],
};
