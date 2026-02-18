const esbuild = require('esbuild');
const path = require('path');

esbuild.build({
  entryPoints: [path.join(__dirname, 'src/main.ts')],
  bundle: true,
  platform: 'node',
  target: 'node18',
  outfile: 'main.js',
  external: ['obsidian'],
  format: 'cjs',
  sourcemap: false,
  minify: false,
  loader: {
    '.css': 'text'
  },
}).then(() => {
  console.log('Build complete!');
}).catch((err) => {
  console.error(err);
  process.exit(1);
});
