// Prueba de la tienda en un navegador real (comprar, quitar, poner, pestañas, idioma). Uso: npm run build && npx vite preview --port 5198 &  y luego  node scripts/e2e-shop.cjs ph 390 780 1  (nombre, ancho, alto, táctil 1/0). Necesita playwright.
const { chromium } = require('playwright');
const [n,w,h,touch] = [process.argv[2], +process.argv[3], +process.argv[4], process.argv[5]==='1'];
const fails = []; const ok = (c, m) => { if (!c) fails.push(m); console.log(c ? 'ok  ' : 'FAIL', m); };
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--no-sandbox'] });
  const ctx = await b.newContext({ viewport:{width:w,height:h}, hasTouch:touch, isMobile: touch && w<500, locale:'es-ES' });
  const p = await ctx.newPage();
  const errs=[]; p.on('pageerror', e=>errs.push(e.message));
  await p.route('**/api/**', r => r.fulfill({status:200,contentType:'application/json',body:'{}'}));
  await p.addInitScript(()=>{ const st=document.createElement('style'); st.textContent='#scene{display:none!important}'; document.addEventListener('DOMContentLoaded',()=>document.head.appendChild(st)); });
  await p.goto('http://localhost:5198/'); await p.waitForTimeout(600);
  await p.click('#play'); await p.fill('#name','Ana'); await p.press('#name','Enter'); await p.waitForTimeout(300);
  await p.click('#ok'); await p.waitForTimeout(300);
  await p.evaluate(() => { const k='vectorcitos-run:v2'; const d=JSON.parse(localStorage.getItem(k)); d.coins.Ana=600; localStorage.setItem(k, JSON.stringify(d)); });
  await p.reload(); await p.waitForTimeout(500);
  await p.click('#play'); await p.waitForTimeout(300);
  const st = () => p.evaluate(() => JSON.parse(localStorage.getItem('vectorcitos-run:v2')));
  await p.click('#shop'); await p.waitForTimeout(400);
  ok((await p.textContent('#sdetail')).includes('Nada puesto'), 'sin nada puesto: la ficha lo dice');
  ok(!(await p.content()).includes('Gana monedas'), 'ya no aparece "Gana monedas..."');
  // comprar
  await p.click('[data-id=propeller]'); await p.waitForTimeout(150);
  ok((await p.textContent('#sdetail')).includes('Gorra de hélice'), 'la ficha muestra el cosmético elegido');
  ok(!(await p.$eval('#act', e=>e.disabled)), 'botón comprar activo (alcanzan las monedas)');
  await p.click('#act'); await p.waitForTimeout(200);
  let d = await st();
  ok(d.owned.Ana?.includes('propeller'), 'comprar: queda en el inventario');
  ok(d.coins.Ana === 490, 'comprar: descuenta 110 monedas (quedan '+d.coins.Ana+')');
  ok(d.worn.Ana?.head === 'propeller', 'comprar: queda puesto');
  ok((await p.textContent('#coins')).includes('490'), 'comprar: el contador de monedas se actualiza');
  ok((await p.textContent('#act')).includes('Quitar'), 'el botón pasa a "Quitar"');
  // quitar
  await p.click('#act'); await p.waitForTimeout(200);
  d = await st();
  ok(!d.worn.Ana?.head, 'quitar: ya no está puesto');
  ok((await p.textContent('#act')).includes('Poner'), 'el botón pasa a "Poner"');
  ok(!(await p.$eval('[data-id=propeller]', e=>e.classList.contains('wearing'))), 'la tarjeta deja de marcarse como puesta');
  // poner
  await p.click('#act'); await p.waitForTimeout(200);
  d = await st(); ok(d.worn.Ana?.head === 'propeller', 'poner: vuelve a quedar puesto');
  // no alcanza
  await p.click('[data-id=spacehelmet]'); await p.waitForTimeout(150);
  ok(await p.$eval('#act', e=>e.disabled), 'sin monedas suficientes el botón está desactivado');
  // otra pestaña: skin, con barra de deslizar propia
  await p.click('[data-s=skin]'); await p.waitForTimeout(250);
  const sc = await p.$eval('#scards', e=>({sh:e.scrollHeight,ch:e.clientHeight,ov:getComputedStyle(e).overflowY}));
  ok(sc.ov==='auto', 'colores: la lista se desliza dentro de su cuadro ('+sc.sh+'>'+sc.ch+')');
  ok((await p.textContent('#sdetail')).includes('Nada puesto'), 'otra pestaña sin nada puesto: lo indica');
  await p.click('[data-id=skin-ocean]'); await p.waitForTimeout(150); await p.click('#act'); await p.waitForTimeout(200);
  d = await st(); ok(d.worn.Ana?.skin === 'skin-ocean' && d.coins.Ana === 390, 'comprar un color funciona');
  // volver a cabeza: la ficha muestra lo puesto
  await p.click('[data-s=head]'); await p.waitForTimeout(200);
  ok((await p.textContent('#sdetail')).includes('Gorra de hélice'), 'al volver a la pestaña, la ficha muestra lo puesto');
  // cambiar idioma sin perder funciones
  await p.click('[data-act=lang]'); await p.waitForTimeout(400);
  await p.click('[data-id=cowboy]').catch(()=>{}); await p.click('[data-id=chef]'); await p.waitForTimeout(150);
  ok((await p.textContent('#act')).includes('Buy'), 'en inglés el botón dice Buy');
  await p.click('#act'); await p.waitForTimeout(200);
  d = await st(); ok(d.owned.Ana?.includes('chef') && d.coins.Ana === 260, 'tras cambiar de idioma comprar sigue funcionando (monedas '+d.coins.Ana+')');
  // 3D visible: espacio libre arriba de la ficha
  const geo = await p.evaluate(() => { const r = document.querySelector('.shopdock').getBoundingClientRect(); const t = document.querySelector('.top').getBoundingClientRect(); return { free: r.top - t.bottom, h: innerHeight }; });
  ok(geo.free > geo.h * 0.25, 'queda espacio para ver al personaje ('+Math.round(geo.free)+'px de '+geo.h+')');
  ok(errs.length===0, 'sin errores en consola '+JSON.stringify(errs));
  await p.screenshot({ timeout: 90000, path: `shop-${n}.png` });
  await b.close();
  console.log(n, fails.length ? 'FALLOS: '+fails.length : 'TODO BIEN');
  process.exit(fails.length?1:0);
})().catch(e=>{console.error(n, e.message.slice(0,300));process.exit(2)});
