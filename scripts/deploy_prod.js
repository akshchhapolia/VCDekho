#!/usr/bin/env node
/**
 * Only production ship path: smoke → vercel --prod → live canary.
 */
const { spawnSync } = require('child_process');
const path = require('path');

const ROOT = path.join(__dirname, '..');

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: ROOT,
    stdio: 'inherit',
    shell: false
  });
  if (result.status) process.exit(result.status || 1);
}

run(process.execPath, [path.join('scripts', 'smoke_test.js')]);
run('npx', ['vercel', 'deploy', '--prod', '--yes']);
run(process.execPath, [path.join('scripts', 'canary_prod.js')]);
