// Copies three.js, PeerJS and the fonts into app/vendor so the game works offline (and without CDNs).
const fs = require('fs'), path = require('path');
const out = path.join(__dirname, '..', 'app', 'vendor');
fs.mkdirSync(path.join(out, 'fonts'), { recursive: true });
fs.copyFileSync(require.resolve('three/build/three.min.js'), path.join(out, 'three.min.js'));
fs.copyFileSync(require.resolve('peerjs/dist/peerjs.min.js'), path.join(out, 'peerjs.min.js'));
const fonts = {
  'alfa-slab-one': [400], 'lilita-one': [400], karla: [400, 500, 700, 800], roboto: [400, 500, 700, 900]
};
for (const [fam, weights] of Object.entries(fonts)) for (const w of weights) {
  const f = `${fam}-latin-${w}-normal.woff2`;
  fs.copyFileSync(path.join(path.dirname(require.resolve(`@fontsource/${fam}/package.json`)), 'files', f), path.join(out, 'fonts', f));
}
console.log('vendored three, peerjs and fonts');
