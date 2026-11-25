/**
 * The same checks run locally and in CI, without loading developer/production
 * credentials. Requires npm ci and a fresh, disposable PostgreSQL 16 database.
 * Never starts the application, runs migrations/seeds, or deploys anything.
 */
import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const envFile = join(root, '.env');
const expectedNpm = '10.9.0';
const osVariable = /^(PATH|PATHEXT|HOME|USERPROFILE|SYSTEMROOT|WINDIR|COMSPEC|TEMP|TMP|TMPDIR|APPDATA|LOCALAPPDATA|PROGRAMFILES|PROGRAMFILES\(X86\)|PROGRAMW6432|NUMBER_OF_PROCESSORS|PROCESSOR_ARCHITECTURE|LANG|LC_ALL|TZ)$/i;

function fail(message) {
  throw new Error(message);
}

function assertCleanEnvironmentFiles() {
  const folders = ['', 'apps/api', 'apps/web', 'apps/bot', 'packages/db'];
  const activeFiles = [];
  for (const folder of folders) {
    // Next loads .env.local and .env.production[.local] during its build; API
    // and bot have their own dotenv loaders. Do not reuse any of these files.
    for (const name of readdirSync(join(root, folder))) {
      if (name === '.env' || (name.startsWith('.env.') && !name.endsWith('.example'))) {
        activeFiles.push(join(folder, name));
      }
    }
  }
  if (activeFiles.length) {
    fail(`Run checks in a clean clone/worktree without local .env files: ${activeFiles.join(', ')}`);
  }
}

function databaseUrl() {
  const raw = process.env.SECURITY_TEST_DATABASE_URL;
  if (!raw) fail('Set SECURITY_TEST_DATABASE_URL to a fresh, disposable loopback security_auth_test database. See docs/WORKFLOW.md.');
  let target;
  try {
    target = new URL(raw);
  } catch {
    fail('SECURITY_TEST_DATABASE_URL is not a valid URL. Its value is intentionally not printed.');
  }
  if (!['postgres:', 'postgresql:'].includes(target.protocol)
      || target.hostname !== '127.0.0.1'
      || target.pathname !== '/security_auth_test'
      || target.search || target.hash) {
    fail('Only postgresql://...@127.0.0.1:<port>/security_auth_test without URL options is permitted. Never use the application database.');
  }
  return raw;
}

function isolatedEnvironment(url) {
  // Start with only operating-system variables needed to execute Node/npm.
  // In particular do not forward inherited bank/bot/cloud/SMTP credentials.
  const env = {};
  for (const [name, value] of Object.entries(process.env)) {
    if (osVariable.test(name) && value !== undefined) env[name] = value;
  }
  return {
    ...env,
    CI: 'true',
    NEXT_TELEMETRY_DISABLED: '1',
    SECURITY_TEST_DATABASE_URL: url,
    DATABASE_URL: url,
    JWT_SECRET: randomBytes(32).toString('hex'),
    JWT_REFRESH_SECRET: randomBytes(32).toString('hex'),
    ENCRYPTION_KEY: randomBytes(32).toString('hex'),
    JWT_ACCESS_EXPIRATION: '15m',
    JWT_REFRESH_EXPIRATION: '7d',
    REDIS_URL: 'redis://127.0.0.1:16379',
    MINIO_ENDPOINT: '127.0.0.1:19000',
    MINIO_PRESIGN_ENDPOINT: '127.0.0.1:19000',
    MINIO_ACCESS_KEY: 'ci-only-minio-access',
    MINIO_SECRET_KEY: randomBytes(32).toString('hex'),
    MINIO_BUCKET: 'ci-no-media',
    MINIO_PUBLIC_URL: 'http://127.0.0.1:19000',
    NEXT_PUBLIC_MINIO_PUBLIC_URL: 'http://127.0.0.1:19000',
    API_URL: 'http://127.0.0.1:9',
    INTERNAL_API_URL: 'http://127.0.0.1:9',
    API_PROXY_UPSTREAM: 'http://127.0.0.1:9',
    NEXT_PUBLIC_API_URL: 'http://127.0.0.1:9',
    NEXT_PUBLIC_SITE_URL: 'http://127.0.0.1:3001',
    FRONTEND_URL: 'http://127.0.0.1:3001',
    ALLOWED_ORIGINS: 'http://127.0.0.1:3001',
    CONTACT_FORM_TO_EMAIL: 'ci@example.invalid',
    SMTP_HOST: '127.0.0.1',
    SMTP_PORT: '11025',
    SMTP_FROM: 'ci@example.invalid',
    TON_INDEXER_ENABLED: 'false',
  };
}

function run(label, command, args, env) {
  console.log(`\n=== ${label} ===`);
  const result = spawnSync(command, args, {
    cwd: root,
    env,
    stdio: 'inherit',
    // npm.cmd needs the Windows command interpreter. All commands/arguments
    // here are fixed by this script, never built from caller-supplied input.
    shell: process.platform === 'win32' && command === 'npm',
  });
  if (result.error) fail(`${label}: unable to start the command (${result.error.code ?? 'unknown error'}).`);
  if (result.status !== 0) fail(`${label} failed${result.signal ? ` (${result.signal})` : ` with exit code ${result.status}`}.`);
}

async function assertEmptyDatabase(url) {
  const { default: postgres } = await import('postgres');
  const sql = postgres(url, { max: 1, connect_timeout: 10 });
  try {
    const [{ count }] = await sql`
      select count(*)::int as count from information_schema.tables
      where table_schema not in ('pg_catalog', 'information_schema')
    `;
    if (count !== 0) {
      fail('security_auth_test must be empty. Create a fresh disposable database/container; this script never deletes existing data.');
    }
  } catch (error) {
    // PostgreSQL errors can contain connection details; print only our own
    // validation failure or a generic diagnostic, never a connection URL.
    if (error.message?.startsWith('security_auth_test must be empty.')) throw error;
    fail('Cannot check the isolated database. Confirm PostgreSQL is ready and the test-only URL is correct.');
  } finally {
    await sql.end({ timeout: 5 });
  }
}

let fixtureContents;
try {
  if (process.versions.node.split('.')[0] !== '22') fail('Use Node.js 22 for the same environment as CI.');
  assertCleanEnvironmentFiles();
  const url = databaseUrl();
  const env = isolatedEnvironment(url);
  const npmVersion = spawnSync('npm', ['--version'], {
    cwd: root, env, encoding: 'utf8', shell: process.platform === 'win32',
  });
  if (npmVersion.status !== 0 || npmVersion.stdout.trim() !== expectedNpm) {
    fail(`Use npm ${expectedNpm}, as specified in package.json (npm install --global npm@${expectedNpm}).`);
  }
  if (!existsSync(join(root, 'node_modules'))) fail('Install locked dependencies first: npm ci --include=dev.');
  await assertEmptyDatabase(url);

  // An API config loader searches parent folders for .env. A temporary local
  // fixture prevents it from finding credentials outside this checkout. Never
  // overwrite a user's .env, and remove only our own unchanged fixture.
  const contents = '# Temporary synthetic verification fixture. Never use for deployment.\n'
    + Object.keys(env).filter((name) => !osVariable.test(name))
      .map((name) => `${name}=${JSON.stringify(env[name])}`).join('\n') + '\n';
  writeFileSync(envFile, contents, { flag: 'wx', mode: 0o600 });
  fixtureContents = contents;

  const testEnv = { ...env, NODE_ENV: 'test' };
  run('Build database package', 'npm', ['run', 'build', '--workspace=@escort/db'], testEnv);
  run('All API unit and session-security integration tests', 'npm', ['test', '--workspace=@escort/api', '--', '--runInBand'], testEnv);
  run('All bot unit tests', 'npm', ['test', '--workspace=@escort/bot', '--', '--runInBand'], testEnv);
  const regressionTests = readdirSync(join(root, 'scripts')).filter((name) => name.endsWith('.test.cjs')).sort();
  if (!regressionTests.length) fail('No frontend regression test files found in scripts/.');
  run('Frontend regression tests', process.execPath, ['--test', ...regressionTests.map((name) => `scripts/${name}`)], testEnv);
  const typedWebTests = [];
  function collectTypedWebTests(folder) {
    for (const entry of readdirSync(join(root, folder), { withFileTypes: true })) {
      const relative = `${folder}/${entry.name}`;
      if (entry.isDirectory()) collectTypedWebTests(relative);
      else if (entry.name.endsWith('.test.mts')) typedWebTests.push(relative);
    }
  }
  collectTypedWebTests('apps/web/lib');
  if (typedWebTests.length) {
    run('Web TypeScript module tests', process.execPath,
      ['--experimental-strip-types', '--test', ...typedWebTests.sort()], testEnv);
  }
  const buildEnv = { ...env, NODE_ENV: 'production' };
  run('Build API', 'npm', ['run', 'build', '--workspace=@escort/api'], buildEnv);
  run('Build bot', 'npm', ['run', 'build', '--workspace=@escort/bot'], buildEnv);
  run('Build web', 'npm', ['run', 'build', '--workspace=@escort/web'], buildEnv);
  console.log('\nProject checks passed. No deployment was performed.');
} catch (error) {
  console.error(`\nProject checks failed: ${error.message}`);
  process.exitCode = 1;
} finally {
  if (fixtureContents !== undefined && existsSync(envFile)) {
    if (readFileSync(envFile, 'utf8') === fixtureContents) {
      unlinkSync(envFile);
    } else {
      console.error('The temporary .env changed during verification; it was left intact. Inspect it before running again.');
      process.exitCode = 1;
    }
  }
}
