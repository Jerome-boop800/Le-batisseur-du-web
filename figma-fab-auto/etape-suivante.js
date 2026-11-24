// Étape suivante — à exécuter avec l'outil use_figma sur le fichier kOQSINbT7oOAjGkXbqxftM
// Ajoute à « Accueil — Desktop 1440 » (7:6) : achat en 4 étapes, infos pratiques, pied de page.
const VID = {'carbon/950':'VariableID:3:5','carbon/900':'VariableID:3:6','carbon/800':'VariableID:3:7','carbon/700':'VariableID:3:8','chrome/100':'VariableID:3:10','chrome/300':'VariableID:3:11','chrome/500':'VariableID:3:12','brand/red':'VariableID:3:13','status/ok':'VariableID:3:16'};
const V = {}; for (const [k,id] of Object.entries(VID)) V[k] = await figma.variables.getVariableByIdAsync(id);
// Lier puis régler l'opacité (la liaison remet l'opacité à 1)
const P = (k, o=1) => { const p = figma.variables.setBoundVariableForPaint({type:'SOLID',color:{r:0,g:0,b:0}},'color',V[k]); if (o===1) return p; const c = JSON.parse(JSON.stringify(p)); c.opacity=o; return c; };
await Promise.all([['Archivo','Black'],['Archivo','ExtraBold'],['Archivo','Regular'],['Archivo Narrow','Bold'],['Inter','Regular'],['Inter','Medium'],['JetBrains Mono','Medium'],['JetBrains Mono','Regular']].map(([family,style])=>figma.loadFontAsync({family,style})));
const T = (chars, o={}) => { const t = figma.createText(); t.fontName = {family:o.f||'Inter',style:o.s||'Regular'}; t.characters = chars; t.fontSize = o.size||16; t.fills=[P(o.c||'chrome/100')]; if(o.lh) t.lineHeight={unit:'PERCENT',value:o.lh}; if(o.ls!=null) t.letterSpacing={unit:'PERCENT',value:o.ls}; if(o.upper) t.textCase='UPPER'; if(o.name) t.name=o.name; if(o.w){t.resize(o.w,t.height); t.textAutoResize='HEIGHT';} if(o.align) t.textAlignHorizontal=o.align; return t; };
const AL = (dir, props={}) => { const f = figma.createAutoLayout(dir, props); f.fills=[]; return f; };
const [btnSet, logoC] = await Promise.all([figma.getNodeByIdAsync('6:28'), figma.getNodeByIdAsync('6:3')]);
const btn = (style, label, arrow=true) => { const i = btnSet.children.find(c=>c.name==='Style='+style).createInstance(); i.setProperties({'Texte#6:0':label,'Flèche#6:5':arrow}); return i; };
const page = figma.root.children.find(p=>p.name==='01 · Desktop'); await figma.setCurrentPageAsync(page);
const wrap = await figma.getNodeByIdAsync('7:6');
const eyebrow = (s) => { const e = AL('HORIZONTAL',{itemSpacing:12,counterAxisAlignItems:'CENTER'}); const l=figma.createRectangle(); l.resize(40,2); l.fills=[P('brand/red')]; e.appendChild(l); e.appendChild(T(s,{f:'Archivo Narrow',s:'Bold',size:14,ls:22,upper:true,c:'chrome/300'})); return e; };

// ===== Achat en 4 étapes
const steps = AL('VERTICAL',{name:'Achat en 4 étapes', itemSpacing:56, paddingLeft:64,paddingRight:64,paddingTop:120,paddingBottom:120}); steps.fills=[P('carbon/950')];
wrap.appendChild(steps); steps.layoutSizingHorizontal='FILL';
const sh = AL('HORIZONTAL',{counterAxisAlignItems:'MAX'}); steps.appendChild(sh); sh.layoutSizingHorizontal='FILL'; sh.primaryAxisAlignItems='SPACE_BETWEEN';
const shl = AL('VERTICAL',{itemSpacing:16}); shl.appendChild(eyebrow('Acheter chez Fab Auto')); shl.appendChild(T('Votre voiture en 4 étapes',{f:'Archivo',s:'Black',size:56,upper:true,ls:-1})); sh.appendChild(shl);
sh.appendChild(T('Pas de mauvaise surprise : chaque étape se fait avec vous, au garage ou par téléphone.',{size:16,lh:160,c:'chrome/500',w:380}));
const grid = AL('HORIZONTAL',{itemSpacing:2}); steps.appendChild(grid); grid.layoutSizingHorizontal='FILL';
const data=[['01','Choisissez','Parcourez le showroom en ligne, filtrez par budget, énergie ou carrosserie.'],['02','Essayez','Réservez un essai : la voiture vous attend, préparée et contrôlée.'],['03','Reprise & financement','On estime votre véhicule actuel et on étudie le financement avec vous.'],['04','Repartez','Carte grise, garantie, entretien : tout est prêt le jour de la livraison.']];
data.forEach(([n,t,d],i)=>{ const c = AL('VERTICAL',{name:'Étape '+n,itemSpacing:20,paddingLeft:32,paddingRight:32,paddingTop:36,paddingBottom:40}); c.fills=[P(i===3?'brand/red':'carbon/800')];
  c.appendChild(T(n,{f:'Archivo',s:'Black',size:72,lh:90,c:i===3?'chrome/100':'brand/red'}));
  c.appendChild(T(t,{f:'Archivo',s:'ExtraBold',size:22,upper:true,ls:2}));
  const dt = T(d,{size:15,lh:160,c:i===3?'chrome/100':'chrome/300'}); c.appendChild(dt); dt.layoutSizingHorizontal='FILL'; dt.textAutoResize='HEIGHT';
  grid.appendChild(c); c.layoutSizingHorizontal='FILL'; c.layoutSizingVertical='FILL'; });

// ===== Infos pratiques
const info = AL('HORIZONTAL',{name:'Infos pratiques & contact', itemSpacing:32, paddingLeft:64,paddingRight:64,paddingTop:0,paddingBottom:120}); info.fills=[P('carbon/950')];
wrap.appendChild(info); info.layoutSizingHorizontal='FILL';
const map = figma.createFrame(); map.name='Carte'; map.resize(640,560); map.cornerRadius=4; map.clipsContent=true; map.fills=[P('carbon/800')];
for (let i=0;i<14;i++){ const l=figma.createRectangle(); l.resize(900,1); l.rotation=i%2?18:-24; l.x=-120; l.y=40*i; l.fills=[P('chrome/100',.07)]; map.appendChild(l); }
const road=figma.createRectangle(); road.resize(900,6); road.rotation=-12; road.x=-100; road.y=330; road.fills=[P('chrome/100',.14)]; map.appendChild(road);
const road2=figma.createRectangle(); road2.resize(6,700); road2.rotation=20; road2.x=330; road2.y=-60; road2.fills=[P('chrome/100',.14)]; map.appendChild(road2);
const pulse=figma.createEllipse(); pulse.resize(120,120); pulse.x=260; pulse.y=180; pulse.fills=[P('brand/red',.18)]; map.appendChild(pulse);
const pin=figma.createNodeFromSvg('<svg width="48" height="60" viewBox="0 0 24 30" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 29s10-9.6 10-17A10 10 0 0 0 2 12c0 7.4 10 17 10 17Z" fill="#E11D26"/><circle cx="12" cy="12" r="4" fill="#FFFFFF"/></svg>'); pin.name='Repère'; map.appendChild(pin); pin.x=296; pin.y=176;
const mlab = AL('HORIZONTAL',{itemSpacing:12,paddingLeft:16,paddingRight:16,paddingTop:12,paddingBottom:12,cornerRadius:4,counterAxisAlignItems:'CENTER'}); mlab.fills=[P('carbon/950')]; mlab.strokes=[P('chrome/100',.12)]; mlab.strokeWeight=1;
mlab.appendChild(logoC.createInstance()); const ma=AL('VERTICAL'); ma.appendChild(T('Fab Auto',{f:'Archivo',s:'ExtraBold',size:15})); ma.appendChild(T('27860 Heudicourt · Eure',{size:13,c:'chrome/500'})); mlab.appendChild(ma);
map.appendChild(mlab); mlab.x=24; mlab.y=560-24-mlab.height;
const it = btn('Verre','Itinéraire'); map.appendChild(it); it.x=640-24-it.width; it.y=24;
info.appendChild(map); map.layoutSizingVertical='FILL';
const col = AL('VERTICAL',{name:'Coordonnées',itemSpacing:32}); info.appendChild(col); col.layoutSizingHorizontal='FILL';
col.appendChild(eyebrow('Infos pratiques'));
col.appendChild(T('Passez nous voir',{f:'Archivo',s:'Black',size:48,upper:true,ls:-1}));
const hrs = AL('VERTICAL',{name:'Horaires',itemSpacing:0}); col.appendChild(hrs); hrs.layoutSizingHorizontal='FILL';
[['Lundi – vendredi','8 h 30 – 12 h 00 · 14 h 00 – 18 h 30'],['Samedi','9 h 00 – 12 h 00'],['Dimanche','Fermé']].forEach(([d,h])=>{ const r=AL('HORIZONTAL',{paddingTop:14,paddingBottom:14}); r.strokes=[P('chrome/100',.08)]; r.strokeBottomWeight=1; r.strokeTopWeight=0; r.strokeLeftWeight=0; r.strokeRightWeight=0; hrs.appendChild(r); r.layoutSizingHorizontal='FILL'; r.primaryAxisAlignItems='SPACE_BETWEEN';
  r.appendChild(T(d,{s:'Medium',size:15})); r.appendChild(T(h,{f:'JetBrains Mono',s:'Regular',size:13,c:h==='Fermé'?'chrome/500':'chrome/300'})); });
const open = AL('HORIZONTAL',{itemSpacing:8,counterAxisAlignItems:'CENTER'}); const od=figma.createEllipse(); od.resize(8,8); od.fills=[P('status/ok')]; open.appendChild(od); open.appendChild(T('Ouvert maintenant · ferme à 18 h 30',{s:'Medium',size:13,c:'status/ok'})); col.appendChild(open);
const contacts = AL('HORIZONTAL',{itemSpacing:16}); col.appendChild(contacts); contacts.layoutSizingHorizontal='FILL';
[['Téléphone','06 23 55 22 00'],['E-mail','fabauto.gsr@gmail.com'],['Réseaux','Facebook · Snapchat']].forEach(([k,v])=>{ const c=AL('VERTICAL',{itemSpacing:6,paddingLeft:20,paddingRight:20,paddingTop:18,paddingBottom:18}); c.fills=[P('carbon/800')]; c.appendChild(T(k,{f:'Archivo Narrow',s:'Bold',size:11,ls:16,upper:true,c:'chrome/500'})); c.appendChild(T(v,{s:'Medium',size:14})); contacts.appendChild(c); c.layoutSizingHorizontal='FILL'; });
const ctaR = AL('HORIZONTAL',{itemSpacing:12}); ctaR.appendChild(btn('Primaire','Nous écrire')); ctaR.appendChild(btn('Contour','Appeler le garage',false)); col.appendChild(ctaR);

// ===== Pied de page
const foot = AL('VERTICAL',{name:'Pied de page', itemSpacing:48, paddingLeft:64,paddingRight:64,paddingTop:72,paddingBottom:40}); foot.fills=[P('carbon/950'),{type:'IMAGE',imageHash:'1299a280d3c60bed7e000fb3b76a5427789c22ae',scaleMode:'FILL',opacity:.25}];
foot.strokes=[P('chrome/100',.08)]; foot.strokeTopWeight=1; foot.strokeBottomWeight=0; foot.strokeLeftWeight=0; foot.strokeRightWeight=0;
wrap.appendChild(foot); foot.layoutSizingHorizontal='FILL';
const big = T('Fab Auto',{f:'Archivo',s:'Black',size:200,lh:85,ls:-3,upper:true,c:'chrome/100'}); big.fills=[]; big.strokes=[P('chrome/100',.14)]; big.strokeWeight=1.5; big.name='Signature';
foot.appendChild(big);
const fr = AL('HORIZONTAL',{itemSpacing:64}); foot.appendChild(fr); fr.layoutSizingHorizontal='FILL';
const fcol = (title, lines) => { const c=AL('VERTICAL',{itemSpacing:12}); c.appendChild(T(title,{f:'Archivo Narrow',s:'Bold',size:12,ls:18,upper:true,c:'chrome/500'})); lines.forEach(l=>c.appendChild(T(l,{size:14,c:'chrome/300'}))); return c; };
const brandCol = AL('VERTICAL',{itemSpacing:16}); brandCol.appendChild(logoC.createInstance()); brandCol.appendChild(T('Achat, vente, réparation, reprogrammation et dépannage à Heudicourt (27).',{size:14,lh:160,c:'chrome/500',w:300}));
fr.appendChild(brandCol); brandCol.layoutSizingHorizontal='FILL';
fr.appendChild(fcol('Showroom',['Tous les véhicules','Citadines','SUV','Utilitaires']));
fr.appendChild(fcol('Atelier',['Réparation','Reprogrammation','Dépannage','Demander un devis']));
fr.appendChild(fcol('Contact',['06 23 55 22 00','fabauto.gsr@gmail.com','27860 Heudicourt']));
const legal = AL('HORIZONTAL',{}); foot.appendChild(legal); legal.layoutSizingHorizontal='FILL'; legal.primaryAxisAlignItems='SPACE_BETWEEN';
legal.strokes=[P('chrome/100',.08)]; legal.strokeTopWeight=1; legal.strokeBottomWeight=0; legal.strokeLeftWeight=0; legal.strokeRightWeight=0; legal.paddingTop=24;
legal.appendChild(T('© 2026 Fab Auto · Mentions légales · Espace gérant',{size:12,c:'chrome/500'}));
legal.appendChild(T('Site réalisé par Le Bâtisseur du Web',{size:12,c:'chrome/500'}));
return { steps: steps.id, info: info.id, foot: foot.id, wrapH: wrap.height };
