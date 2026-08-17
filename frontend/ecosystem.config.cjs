/**
 * PM2 — รัน Next.js production หลัง `npm run build`
 *
 * บนเซิร์ฟเวอร์:
 *   cd .../frontend
 *   สร้าง .env.production (หรือ .env) ในโฟลเดอร์เดียวกับไฟล์นี้ — PM2 โหลดให้ก่อน start
 *   npm ci && npm run build
 *   pm2 start ecosystem.config.cjs
 *   pm2 save && pm2 startup
 *
 * รีโหลดหลังแก้ .env — อย่าใช้แค่ `pm2 restart` เพราะมักถือ env เก่า
 *   pm2 reload ecosystem.config.cjs --update-env
 *   หรือ pm2 delete med-supplies-rajavithi-next-app && pm2 start ecosystem.config.cjs
 *
 * สำคัญ:
 * - NEXTAUTH_URL ต้องตรงกับ URL ที่ผู้ใช้เปิด (เช่น http://10.1.1.10:7200/med-supplies ไม่ใช่แค่ localhost)
 * - NEXT_PUBLIC_* ถูกฝังตอน `npm run build` — แก้แล้วต้อง build ใหม่
 */
const fs = require('fs');
const path = require('path');

/** อ่าน .env เป็น object — ค่าจากไฟล์ใช้เป็นหลักเวลา merge เข้า PM2 (แก้ .env แล้ว reload ได้ค่าใหม่) */
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

// .env ทับ .env.production สำหรับ key ซ้ำ
const fileEnv = {
  ...parseEnvFile(path.join(__dirname, '.env.production')),
  ...parseEnvFile(path.join(__dirname, '.env')),
};

const passthroughKeys = [
  'NEXTAUTH_URL',
  'NEXTAUTH_SECRET',
  'NEXT_PUBLIC_BASE_PATH',
  'NEXT_PUBLIC_API_URL',
  'BACKEND_API_URL',
  // Firebase ฯลฯ ถ้ามีใน .env
  'NEXT_PUBLIC_FIREBASE_API_KEY',
  'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
  'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  'NEXT_PUBLIC_FIREBASE_APP_ID',
];

const env = {
  NODE_ENV: 'production',
  PORT: fileEnv.PORT || process.env.PORT || '7200',
};

for (const key of passthroughKeys) {
  const fromFile = fileEnv[key];
  const fromShell = process.env[key];
  const v =
    fromFile !== undefined && fromFile !== ''
      ? fromFile
      : fromShell !== undefined && fromShell !== ''
        ? fromShell
        : undefined;
  if (v !== undefined) env[key] = v;
}

module.exports = {
  apps: [
    {
      name: 'med-supplies-cu-next-app',
      cwd: __dirname,
      script: path.join(__dirname, 'node_modules', 'next', 'dist', 'bin', 'next'),
      args: 'start',
      interpreter: 'node',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env,
    },
  ],
};
