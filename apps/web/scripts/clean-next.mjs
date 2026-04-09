import { existsSync, rmSync } from 'fs';
import { spawnSync } from 'child_process';

const dir = '.next';

if (!existsSync(dir)) {
  console.log('no .next');
  process.exit(0);
}

if (process.platform === 'win32') {
  const r = spawnSync('cmd', ['/c', 'rmdir', '/s', '/q', dir], {
    cwd: process.cwd(),
    stdio: 'inherit',
    windowsHide: true,
  });
  if (r.status !== 0 && r.status !== null) {
    process.exit(r.status);
  }
} else {
  rmSync(dir, { recursive: true, force: true });
}

console.log('removed .next');
