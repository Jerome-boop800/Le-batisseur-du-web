const { chromium } = require('playwright');
(async () => {
  const dir = process.argv[2]; const b = await chromium.launch(); const errs = [];
  const hide = '.demo-bar{display:none!important}.p-door,.p-garage-housing{display:none!important}.p-garage.is-pinned{height:auto!important}.p-garage.is-pinned .p-garage-stage{position:relative!important;height:auto!important;top:auto!important}';
  async function page(vp, scale) { const p = await b.newPage({ viewport: vp, deviceScaleFactor: scale }); p.on('pageerror', e => errs.push(e.message)); await p.goto('file://' + dir + '/index.html#accueil'); await p.waitForTimeout(800); return p; }
  async function settle(p) { await p.evaluate(async () => { document.querySelectorAll('img[loading=lazy]').forEach(i => i.loading = 'eager'); for (let y = 0; y < document.body.scrollHeight; y += 600) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 60)); } window.scrollTo(0, 0); }); await p.waitForTimeout(1800); }
  // Site public, ordinateur
  let p = await page({ width: 1440, height: 900 }, 1.25); await p.addStyleTag({ content: hide });
  for (const [h, n] of [['accueil', 'd-accueil'], ['showroom', 'd-showroom'], ['vehicule-v4', 'd-vehicule'], ['garage', 'd-atelier']]) {
    await p.evaluate(h => { location.hash = h; }, h); await p.waitForTimeout(700); await settle(p);
    await p.screenshot({ path: dir + '/' + n + '.jpg', fullPage: true, type: 'jpeg', quality: 82 });
  }
  await p.close();
  // Site public, mobile
  p = await page({ width: 390, height: 844 }, 2); await p.addStyleTag({ content: hide + '.p-actionbar{display:none!important}' });
  await settle(p); await p.screenshot({ path: dir + '/m-accueil.jpg', fullPage: true, type: 'jpeg', quality: 82 });
  await p.evaluate(() => { location.hash = 'vehicule-v1'; }); await p.waitForTimeout(700); await settle(p);
  await p.screenshot({ path: dir + '/m-vehicule.jpg', type: 'jpeg', quality: 82 });
  await p.close();
  // Espace gérant
  for (const view of ['phone', 'desktop']) {
    p = await page({ width: 1440, height: 900 }, 1.25);
    await p.click('[data-view="' + view + '"]'); await p.waitForTimeout(500);
    await p.click('#gerant-root button[type="submit"]'); await p.waitForTimeout(1200);
    await p.addStyleTag({ content: hide });
    for (const [h, n] of [['gerant-stock', 'stock'], ['gerant-modifier-v4', 'modifier'], ['gerant-demandes', 'demandes']]) {
      await p.evaluate(h => { location.hash = h; }, h); await p.waitForTimeout(1500);
      await p.screenshot({ path: dir + '/g-' + view + '-' + n + '.jpg', type: 'jpeg', quality: 85 });
    }
    await p.close();
  }
  console.log('errors', JSON.stringify(errs)); await b.close();
})();
