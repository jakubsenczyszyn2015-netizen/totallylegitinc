/* Smoke test: menu, walk around, sit, take a call, run a scheme to the end. */
module.exports = async page => {
  await page.shot('01-menu');
  await page.startSolo('week');
  await page.shot('02-office');
  await page.key('KeyW', 600);
  await page.sit();
  await page.shot('03-desktop');
  await page.ring(false);
  await page.shot('04-ringing');
  await page.answer();
  await page.eval(() => { window.__tli.Call.setScheme('prize'); return true; });
  const name = await page.eval(() => window.__tli.Call.cur.caller.first);
  for (const l of ['Hi ' + name + ', my name is Steve from the prize office, reference 55.', 'Congratulations, you won a jet ski!', 'There is a small release fee of 20 dollars.', 'Can you pay that today?', 'Shall we go ahead and pay?', 'Would you like to confirm the payment now?']) {
    const st = await page.eval(() => window.__tli.Call.state);
    if (st !== 'live') break;
    await page.say(l);
  }
  await page.shot('05-call');
  const r = await page.eval(() => { const c = window.__tli.Call.cur; return { state: window.__tli.Call.state, result: c && c.result, steps: c && c.steps }; });
  console.log('call result: ' + JSON.stringify(r));
  await page.stand();
  await page.shot('06-standing');
};
