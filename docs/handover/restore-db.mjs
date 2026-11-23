import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn, spawnSync} from 'node:child_process';
const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(process.argv[2] || '.');
const dump = path.resolve(process.argv[3] || path.join(here, 'mymuse-development.dump'));
if (!fs.existsSync(dump)) throw Error('Pass the supplied mymuse-development.dump as the second argument');
const compose = ['compose', '--project-name', 'mymuse-handoff-local', '--env-file', path.join(repo, '.env'), '-f', path.join(here, 'compose.dev.yml')];
function docker(args) {
  const p = spawnSync('docker', args, {encoding: 'utf8'});
  if (p.status !== 0) throw Error('Docker command failed; check the local Docker Desktop and dev stack');
  return p.stdout.trim();
}
const id = docker([...compose, 'ps', '-q', 'postgres']);
if (!/^[a-f0-9]{12,64}$/.test(id)) throw Error('Exactly one local handover PostgreSQL container must be running');
const container = JSON.parse(docker(['inspect', id]))[0];
if (container.Config.Labels?.['com.docker.compose.project'] !== 'mymuse-handoff-local'
  || container.Config.Labels?.['com.docker.compose.service'] !== 'postgres'
  || container.HostConfig.PortBindings?.['5432/tcp']?.[0]?.HostIp !== '127.0.0.1'
  || container.HostConfig.PortBindings['5432/tcp'][0].HostPort !== '15434') throw Error('Refusing an unexpected database container');
const tables = docker(['exec', id, 'psql', '-U', 'mymuse_dev', '-d', 'mymuse_dev', '-tAc',
  "SELECT count(*) FROM information_schema.tables WHERE table_schema NOT IN ('pg_catalog','information_schema')"]);
if (tables !== '0') throw Error('The local database already has tables. Restore aborted to preserve existing work.');
await new Promise((resolve, reject) => {
  const child = spawn('docker', ['exec', '-i', id, 'pg_restore', '--exit-on-error', '--no-owner', '--no-privileges', '-U', 'mymuse_dev', '-d', 'mymuse_dev'], {stdio: ['pipe', 'inherit', 'inherit']});
  const input = fs.createReadStream(dump);
  input.on('error', reject); child.on('error', reject);
  child.stdin.on('error', () => {});
  input.pipe(child.stdin);
  child.on('exit', code => code === 0 ? resolve() : reject(Error('Database restore failed; inspect pg_restore output')));
});
console.log('Development snapshot restored into the isolated local database.');
