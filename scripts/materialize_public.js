/**
 * Vercel does not always include symlink targets in the Next output.
 * On Vercel, replace public/ symlinks with real copies before `next build`.
 */
const fs = require('fs');
const path = require('path');

if (!process.env.VERCEL) process.exit(0);

const publicDir = path.join(__dirname, '..', 'public');
if (!fs.existsSync(publicDir)) process.exit(0);

function walk(dir) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const st = fs.lstatSync(full);
    if (st.isSymbolicLink()) {
      const real = fs.realpathSync(full);
      fs.rmSync(full, { recursive: true, force: true });
      const rst = fs.statSync(real);
      if (rst.isDirectory()) fs.cpSync(real, full, { recursive: true });
      else fs.copyFileSync(real, full);
      console.log('materialized', path.relative(publicDir, full));
    } else if (st.isDirectory()) {
      walk(full);
    }
  }
}

walk(publicDir);
