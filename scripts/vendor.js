// Copies three.js and PeerJS into app/vendor so the exe works without CDNs.
const fs = require('fs'), path = require('path');
const out = path.join(__dirname, '..', 'app', 'vendor');
fs.mkdirSync(out, { recursive: true });
fs.copyFileSync(require.resolve('three/build/three.min.js'), path.join(out, 'three.min.js'));
fs.copyFileSync(require.resolve('peerjs/dist/peerjs.min.js'), path.join(out, 'peerjs.min.js'));
console.log('vendored three + peerjs');
