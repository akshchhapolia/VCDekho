const fs = require('fs');
const path = require('path');

function repoRoot() {
  const candidates = [process.cwd()];
  let dir = __dirname;
  for (let i = 0; i < 8; i++) {
    candidates.push(dir);
    dir = path.join(dir, '..');
  }
  for (const root of candidates) {
    if (fs.existsSync(path.join(root, 'data', 'people.json'))) return root;
    if (fs.existsSync(path.join(root, 'data', 'investors.index.json'))) return root;
  }
  return process.cwd();
}

function dataPath(...parts) {
  return path.join(repoRoot(), 'data', ...parts);
}

module.exports = { repoRoot, dataPath };
