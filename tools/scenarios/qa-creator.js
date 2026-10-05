/* QA: the character creator preview colours (same colour pipeline as the game) and every skin tone side by side.
   Run: xvfb-run -a -s "-screen 0 1920x1080x24" ./node_modules/.bin/electron --no-sandbox --enable-unsafe-swiftshader tools/harness.js tools/scenarios/qa-creator.js 1280x720 <outdir> */
module.exports = async page => {
  const Q = require('./qa-lib')(page);
  await page.eval(() => { Customize.show(); Customize.apply(Object.assign(normLook(Avatars.myLook()), { skin: AV_OPT.skins[1][1] })); return true; });
  await page.wait(2500);
  await Q.shot('creator-01-light-skin');
  const r = await page.eval(() => ({ enc: Customize.renderer.outputEncoding === THREE.sRGBEncoding, skin: Customize.look.skin }));
  Q.check('creator renders in sRGB like the game', r.enc, r);
  await page.eval(() => { Customize.apply(Object.assign(normLook(Avatars.myLook()), { skin: AV_OPT.skins[7][1] })); return true; });
  await page.wait(1200);
  await Q.shot('creator-02-dark-skin');
  await page.eval(() => { Customize.close(); return true; });
  await Q.done();
};
