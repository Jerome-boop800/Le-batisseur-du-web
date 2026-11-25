/* =========================================================
   Maquette garage — site public (showroom)
   Contrat : window.PublicSite = { render(route, rootEl) }
   Toutes les données du Store passent par esc() avant affichage.
   ========================================================= */
(function () {
  'use strict';

  const App = window.App;
  if (!App) return;
  const { GARAGE, LISTS, Store, fmt, esc, isNew, publicVehicles, Media, UI, Router } = App;

  /* ---------- Constantes ---------- */
  const PRICE_STEPS = [10000, 12500, 15000, 17500, 20000, 25000, 30000];
  const KM_STEPS = [20000, 50000, 75000, 100000];
  const DEFAULT_FILTERS = { make: '', fuel: '', gearbox: '', body: '', priceMax: '', kmMax: '', yearMin: '', sort: 'recent' };
  const SORTS = [['recent', 'Plus récents'], ['price-asc', 'Prix croissant'], ['price-desc', 'Prix décroissant'], ['km-asc', 'Kilométrage croissant']];
  const CRITAIR = ['E', '1', '2', '3', '4', '5'];
  const city = String(GARAGE.city || '').replace(/^\d{5}\s*/, '');

  /* ---------- État du module (conservé entre deux rendus) ---------- */
  let filters = Object.assign({}, DEFAULT_FILTERS);
  let contactPrefill = null;   // message prérempli pour la page contact
  let lastKey = null;          // page précédente, pour gérer le focus
  let cleanups = [];           // écouteurs globaux à retirer au rendu suivant

  /* ---------- Utilitaires ---------- */
  const reducedMotion = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const scrollBehavior = () => (reducedMotion() ? 'auto' : 'smooth');
  const telHref = (p) => { const d = String(p).replace(/[^\d+]/g, ''); return 'tel:' + (d.charAt(0) === '0' ? '+33' + d.slice(1) : d); };
  const plural = (n, one, many) => n + ' ' + (n > 1 ? many : one);
  const byRecent = (a, b) => String(b.addedAt).localeCompare(String(a.addedAt));
  const isSold = (v) => v.status === 'vendu';
  const available = () => publicVehicles().filter((v) => !isSold(v));
  const maxWarranty = () => available().reduce((m, v) => Math.max(m, Number(v.warrantyMonths) || 0), 0) || 12;
  const on = (target, type, fn, opts) => { target.addEventListener(type, fn, opts); cleanups.push(() => target.removeEventListener(type, fn, opts)); };

  /* Icônes supplémentaires (même style que App.UI.icon) */
  const EXTRA_ICONS = {
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    share: '<circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="m8.2 10.8 7.6-3.6M8.2 13.2l7.6 3.6"/>',
    wrench: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.8-3.8a6 6 0 0 1-7.9 7.9l-6.9 6.9a2.1 2.1 0 0 1-3-3l6.9-6.9a6 6 0 0 1 7.9-7.9z"/>',
    doc: '<path d="M7 3h7l4 4v14H7z"/><path d="M14 3v4h4M10 12h5M10 16h5"/>',
    bolt: '<path d="M13 3 5 14h6l-1 7 8-11h-6z"/>',
    seat: '<path d="M7 4h4l1 9h6v4H8z"/><path d="M9 17v3M16 17v3"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
    leaf: '<path d="M5 19c0-8 5-14 15-14 0 10-6 15-14 15"/><path d="M5 19 13 11"/>',
    chevronLeft: '<path d="m15 5-7 7 7 7"/>'
  };
  function icon(name) {
    if (EXTRA_ICONS[name]) return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + EXTRA_ICONS[name] + '</svg>';
    return UI.icon(name);
  }

  function critairBadge(v) {
    const c = String(v.critair || '').toUpperCase();
    if (CRITAIR.indexOf(c) === -1) return '';
    const label = c === 'E' ? 'Vignette Crit’Air électrique' : 'Vignette Crit’Air ' + c;
    return '<span class="critair critair-' + c + '" role="img" aria-label="' + label + '" title="' + label + '">' + c + '</span>';
  }
  const priceType = (v) => (v.priceType === 'HT' ? 'HT' : 'TTC');
  const priceHtml = (v, cls) => '<p class="p-price ' + (cls || '') + '"><span class="num">' + esc(fmt.price(v.price)) + '</span> <span class="p-price-type">' + priceType(v) + '</span></p>';
  const vehicleHref = (v) => '#vehicule-' + esc(v.id);
  const statusPill = (v) => '<span class="pill pill-' + esc(v.status) + '">' + esc(fmt.label('statuses', v.status)) + '</span>';
  const safeHex = (h) => (/^#[0-9a-f]{3,8}$/i.test(String(h || '')) ? h : '');

  /* ---------- SEO : titre, description, données structurées ---------- */
  function setMeta(title, description, ld) {
    document.title = title;
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) { meta = document.createElement('meta'); meta.name = 'description'; document.head.appendChild(meta); }
    meta.setAttribute('content', description);
    let s = document.getElementById('p-jsonld');
    if (!s) { s = document.createElement('script'); s.type = 'application/ld+json'; s.id = 'p-jsonld'; document.head.appendChild(s); }
    const dealer = {
      '@type': 'AutoDealer', name: GARAGE.name, telephone: GARAGE.phone, email: GARAGE.email, 
      address: { '@type': 'PostalAddress', streetAddress: GARAGE.address || undefined, postalCode: String(GARAGE.city).slice(0, 5), addressLocality: city, addressCountry: 'FR' }
    };
    const graph = [dealer].concat(ld ? [ld] : []);
    // textContent : le contenu n'est jamais interprété comme du HTML
    s.textContent = JSON.stringify({ '@context': 'https://schema.org', '@graph': graph });
  }
  function carLd(v) {
    const avail = isSold(v) ? 'SoldOut' : v.status === 'reserve' ? 'LimitedAvailability' : 'InStock';
    return {
      '@type': 'Car', name: fmt.title(v) + ' ' + v.version, brand: { '@type': 'Brand', name: v.make }, model: v.model,
      vehicleModelDate: String(v.year), fuelType: v.fuel, vehicleTransmission: v.gearbox, color: v.color,
      numberOfDoors: v.doors, seatingCapacity: v.seats, sku: v.ref,
      mileageFromOdometer: { '@type': 'QuantitativeValue', value: v.km, unitCode: 'KMT' },
      offers: { '@type': 'Offer', price: v.price, priceCurrency: 'EUR', availability: 'https://schema.org/' + avail, itemCondition: 'https://schema.org/UsedCondition' }
    };
  }

  /* =========================================================
     Gabarit commun : en-tête, pied de page, barre d'action mobile
     ========================================================= */
  const NAV = [['accueil', 'Accueil'], ['showroom', 'Showroom'], ['garage', 'Atelier'], ['contact', 'Contact']];

  function header(page) {
    const current = page === 'vehicule' ? 'showroom' : page;
    const links = NAV.map(([href, label]) => '<li><a class="p-nav-link" href="#' + href + '"' + (current === href ? ' aria-current="page"' : '') + '>' + label + '</a></li>').join('');
    return '' +
      '<button type="button" class="p-skip">Aller au contenu</button>' +
      '<header class="p-header">' +
        '<div class="p-wrap p-header-inner">' +
          '<a class="p-logo" href="#accueil" aria-label="' + esc(GARAGE.name) + ', retour à l’accueil">' +
            App.Brand.mark() +
            '<span class="p-logo-text">' + App.Brand.word('p-logo-name') + '<span class="p-logo-tag">Garage · ' + esc(city) + '</span></span>' +
          '</a>' +
          '<nav class="p-nav" aria-label="Navigation principale"><ul class="p-nav-list">' + links + '</ul></nav>' +
          '<div class="p-header-call">' +
            '<span class="p-header-num num">' + esc(GARAGE.phone) + '</span>' +
            '<a class="btn btn-primary" href="' + telHref(GARAGE.phone) + '">' + icon('phone') + 'Appeler</a>' +
          '</div>' +
          '<button type="button" class="p-menu-btn" aria-expanded="false" aria-controls="p-menu" aria-label="Ouvrir le menu">' + icon('menu') + '</button>' +
        '</div>' +
        '<div class="p-menu" id="p-menu" hidden>' +
          '<nav class="p-wrap" aria-label="Menu mobile"><ul class="p-menu-list">' + links + '</ul>' +
            '<div class="p-menu-contact">' +
              '<p class="eyebrow">Nous joindre</p>' +
              '<p class="p-menu-num num">' + esc(GARAGE.phone) + '</p>' +
              '<p class="p-menu-mail">' + esc(GARAGE.email) + '</p>' +
            '</div>' +
          '</nav>' +
        '</div>' +
      '</header>';
  }

  function hoursList(cls) {
    return '<dl class="p-hours ' + (cls || '') + '">' + GARAGE.hours.map(([d, h]) =>
      '<div class="p-hours-row"><dt>' + esc(d) + '</dt><dd class="num' + (/ferm/i.test(h) ? ' p-closed' : '') + '">' + esc(h) + '</dd></div>').join('') + '</dl>';
  }

  function footer() {
    const year = new Date().getFullYear();
    return '' +
      '<footer class="p-footer">' +
        '<div class="p-wrap"><p class="p-signature" aria-hidden="true" data-text="' + esc(GARAGE.name) + '">' + esc(GARAGE.name) + '</p></div>' +
        '<div class="p-wrap p-footer-grid">' +
          '<div class="p-footer-brand">' +
            '<p class="p-logo p-logo-static">' + App.Brand.mark() + App.Brand.word('p-logo-name') + '</p>' +
            '<p class="p-muted">' + esc(GARAGE.tagline) + '.</p>' +
            '<address class="p-address">' + App.Brand.addressHtml() + '</address>' +
          '</div>' +
          '<div><h2 class="p-footer-title">Horaires</h2>' + hoursList('p-hours-compact') + '</div>' +
          '<div><h2 class="p-footer-title">Nous joindre</h2>' +
            '<p class="p-footer-line">' + icon('phone') + '<span class="num">' + esc(GARAGE.phone) + '</span></p>' +
            '<p class="p-footer-line">' + icon('mail') + '<span>' + esc(GARAGE.email) + '</span></p>' +
            (GARAGE.socials || []).map(([net, handle]) => '<p class="p-footer-line p-footer-social"><span class="p-muted">' + esc(net) + '</span><span>' + esc(handle) + '</span></p>').join('') +
            '<p class="p-footer-actions"><a class="btn btn-primary" href="' + telHref(GARAGE.phone) + '">Appeler</a> <a class="btn btn-primary" href="#contact">Écrire</a></p>' +
          '</div>' +
          '<nav aria-label="Liens du pied de page"><h2 class="p-footer-title">Le site</h2><ul class="p-footer-links">' +
            '<li><a href="#showroom">Nos véhicules</a></li><li><a href="#garage">Le garage</a></li><li><a href="#contact">Contact</a></li><li><a href="#mentions">Mentions légales</a></li><li><a href="#gerant">Espace gérant</a></li>' +
          '</ul></nav>' +
        '</div>' +
        '<div class="p-wrap"><div class="p-footer-bottom"><p>© ' + year + ' ' + esc(GARAGE.name) + '. Prix affichés TTC, sauf utilitaires (HT).</p><p>Site réalisé par Le Bâtisseur du Web</p></div></div>' +
      '</footer>';
  }

  /* Barre d'action collante (mobile) */
  function actionBar(bar) {
    const call = '<a class="btn btn-primary p-bar-call" href="' + telHref(GARAGE.phone) + '"><span class="p-bar-call-inner">' + icon('phone') + '<span><span class="p-bar-call-label">Appeler</span><span class="p-bar-call-num num">' + esc(GARAGE.phone) + '</span></span></span></a>';
    const callIcon = '<a class="btn btn-ghost p-bar-icon" href="' + telHref(GARAGE.phone) + '" aria-label="Appeler le garage au ' + esc(GARAGE.phone) + '">' + icon('phone') + '</a>';
    let inner;
    if (bar && bar.kind === 'vehicle') {
      const v = bar.vehicle;
      inner = '<div class="p-bar-price"><span class="p-bar-price-label">' + (isSold(v) ? 'Vendu' : 'Prix ' + priceType(v)) + '</span><span class="p-bar-price-value num' + (isSold(v) ? ' p-strike' : '') + '">' + esc(fmt.price(v.price)) + '</span></div>' +
        callIcon +
        (isSold(v)
          ? '<button type="button" class="btn btn-primary p-bar-main p-btn-wrap" data-scroll="p-similar">Voir des modèles proches</button>'
          : '<button type="button" class="btn btn-primary p-bar-main p-btn-wrap" data-scroll="p-lead">Ce véhicule m’intéresse</button>');
    } else if (bar && bar.kind === 'contact') {
      inner = call + '<button type="button" class="btn btn-ghost p-bar-write" data-scroll="p-contact-form">' + icon('mail') + 'Écrire</button>';
    } else {
      inner = call + '<a class="btn btn-ghost p-bar-write" href="#contact">' + icon('mail') + 'Écrire</a>';
    }
    return '<div class="p-actionbar" role="region" aria-label="Actions rapides"><div class="p-actionbar-inner">' + inner + '</div></div>';
  }

  /* ---------- Carte véhicule ---------- */
  function card(v, opts) {
    const o = opts || {};
    const sold = isSold(v);
    const badges = [];
    if (!sold && isNew(v)) badges.push('<span class="pill pill-nouveau">Nouveau</span>');
    if (v.status === 'reserve') badges.push('<span class="pill pill-reserve">Réservé</span>');
    const h = o.level || 3;
    return '' +
      '<article class="p-card' + (sold ? ' is-sold' : '') + '">' +
        '<div class="p-visual p-card-visual">' + Media.photo(v, 0) +
          (badges.length ? '<div class="p-badges">' + badges.join('') + '</div>' : '') +
          (sold ? '<span class="p-sold-band">Vendu</span>' : '') +
        '</div>' +
        '<div class="p-card-body">' +
          '<h' + h + ' class="p-card-title"><a class="p-card-link" href="' + vehicleHref(v) + '">' + esc(v.make) + ' ' + esc(v.model) + '</a></h' + h + '>' +
          '<p class="p-card-version">' + esc(v.version) + '</p>' +
          specLines(v) +
          '<div class="p-card-foot">' + priceHtml(v) + critairBadge(v) + '</div>' +
        '</div>' +
      '</article>';
  }
  /* Deux lignes stables : « 2021 · 38 500 km » puis « Essence · Manuelle » */
  function specLines(v) {
    return '<p class="p-card-specs num"><span>' + esc(v.year) + ' · ' + esc(fmt.km(v.km)) + '</span><span>' + esc(v.fuel) + ' · ' + esc(v.gearbox) + '</span></p>';
  }
  const grid = (list, opts) => '<div class="p-grid">' + list.map((v) => card(v, opts)).join('') + '</div>';

  /* ---------- Bloc infos pratiques (accueil, garage) ---------- */
  function practicalInfo(level) {
    const h = level || 3;
    return '' +
      '<div class="p-info">' +
        '<div class="p-info-item">' +
          '<span class="p-icon-tile">' + icon('pin') + '</span>' +
          '<h' + h + ' class="p-info-title">Adresse</h' + h + '>' +
          '<address class="p-address">' + App.Brand.addressHtml() + '</address>' +
          '<p class="p-muted p-small">Parking clients devant le garage. Essais sur rendez-vous.</p>' +
        '</div>' +
        '<div class="p-info-item">' +
          '<span class="p-icon-tile">' + icon('clock') + '</span>' +
          '<h' + h + ' class="p-info-title">Horaires</h' + h + '>' + hoursList() +
        '</div>' +
        '<div class="p-info-item">' +
          '<span class="p-icon-tile">' + icon('phone') + '</span>' +
          '<h' + h + ' class="p-info-title">Nous joindre</h' + h + '>' +
          '<p class="p-info-big num">' + esc(GARAGE.phone) + '</p>' +
          '<p class="p-muted">' + esc(GARAGE.email) + '</p>' +
          '<p class="p-info-actions"><a class="btn btn-primary" href="' + telHref(GARAGE.phone) + '">' + icon('phone') + 'Appeler</a><a class="btn btn-ghost" href="#contact">' + icon('mail') + 'Écrire</a></p>' +
        '</div>' +
      '</div>';
  }

  /* =========================================================
     Filtres du showroom
     ========================================================= */
  function applyFilters(list, f) {
    const out = list.filter((v) =>
      (!f.make || v.make === f.make) &&
      (!f.fuel || v.fuel === f.fuel) &&
      (!f.gearbox || v.gearbox === f.gearbox) &&
      (!f.body || v.body === f.body) &&
      (!f.priceMax || Number(v.price) <= Number(f.priceMax)) &&
      (!f.kmMax || Number(v.km) <= Number(f.kmMax)) &&
      (!f.yearMin || Number(v.year) >= Number(f.yearMin)));
    const cmp = {
      'recent': byRecent,
      'price-asc': (a, b) => a.price - b.price,
      'price-desc': (a, b) => b.price - a.price,
      'km-asc': (a, b) => a.km - b.km
    }[f.sort] || byRecent;
    // Les véhicules vendus restent visibles mais toujours en fin de liste
    return out.sort((a, b) => (isSold(a) - isSold(b)) || cmp(a, b));
  }
  function makesOf(list) {
    return Array.from(new Set(list.map((v) => v.make))).sort((a, b) => a.localeCompare(b, 'fr'));
  }
  function yearsOf(list) {
    const ys = list.map((v) => Number(v.year)).filter(Boolean);
    if (!ys.length) return [];
    const out = [];
    for (let y = Math.max.apply(null, ys); y >= Math.min.apply(null, ys); y--) out.push(y);
    return out;
  }
  const FILTER_LABELS = {
    make: (x) => x, fuel: (x) => x, gearbox: (x) => 'Boîte ' + x.toLowerCase(),
    body: (x) => fmt.label('bodies', x),
    priceMax: (x) => 'Jusqu’à ' + fmt.price(x),
    kmMax: (x) => 'Moins de ' + fmt.km(x),
    yearMin: (x) => x + ' et plus récent'
  };
  const FILTER_NAMES = { make: 'Marque', fuel: 'Énergie', gearbox: 'Boîte', body: 'Carrosserie', priceMax: 'Prix maximum', kmMax: 'Kilométrage maximum', yearMin: 'Année minimum' };
  const activeKeys = (f) => Object.keys(FILTER_LABELS).filter((k) => f[k] !== '' && f[k] != null);

  function options(list, selected, emptyLabel) {
    return '<option value="">' + emptyLabel + '</option>' + list.map(([val, label]) =>
      '<option value="' + esc(val) + '"' + (String(val) === String(selected) ? ' selected' : '') + '>' + esc(label) + '</option>').join('');
  }
  function selectField(id, name, label, list, selected, emptyLabel) {
    return '<div class="field p-field"><label for="' + id + '">' + label + '</label><select class="select" id="' + id + '" name="' + name + '">' + options(list, selected, emptyLabel) + '</select></div>';
  }
  function describeSearch(f) {
    const parts = activeKeys(f).map((k) => FILTER_LABELS[k](f[k]));
    return parts.length ? parts.join(', ') : 'un véhicule d’occasion';
  }

  /* =========================================================
     Blocs du thème « Carbon Showroom »
     ========================================================= */
  const hasPhoto = (v) => (v.photos && v.photos.length ? 1 : 0);
  const REEL_LIMIT = 10;   // nombre de véhicules du carrousel « dernières voitures rentrées »
  const hazard = () => '<div class="p-hazard" aria-hidden="true"></div>';
  const eyebrowLine = (t) => '<p class="p-eyebrow-line">' + t + '</p>';
  const arrowIcon = () => icon('arrow');

  /* Bandeau des engagements (fond texture carbone) */
  function promiseStrip(n, warranty) {
    const items = [
      [String(n), n > 1 ? 'véhicules en stock' : 'véhicule en stock', 'Sélectionnés et révisés par l’atelier'],
      [warranty + ' mois', 'de garantie', 'Pièces et main-d’œuvre, selon véhicule'],
      ['Reprise', 'de votre véhicule', 'Estimation à l’atelier, sans engagement'],
      ['24 h', 'pour vous répondre', 'Par téléphone, e-mail ou formulaire']
    ];
    return '<section class="p-strip" aria-label="Nos engagements"><div class="p-wrap p-strip-grid">' + items.map(([big, small, txt]) =>
      '<div class="p-promise"><p><span class="p-promise-big num">' + big + '</span> <span class="p-promise-small">' + small + '</span></p><p class="p-promise-txt">' + txt + '</p></div>').join('') +
      '</div></section>';
  }

  /* Rangée d'étoiles en or poli, façon bijou : une vraie image d'étoile en or (img/etoile-or.webp). */
  const GOLD_STAR = '<img class="p-star" src="img/etoile-or.webp" width="30" height="30" alt="" decoding="async">';
  function chromeStars(n) {
    let out = '<span class="p-stars" aria-hidden="true">';
    for (let i = 0; i < n; i++) out += GOLD_STAR;
    return out + '</span>';
  }

  /* Affiche « atelier » jaune et noir (accueil et page garage) */
  function atelierPoster(level) {
    const h = level === 1 ? 'h1 id="p-h1" tabindex="-1"' : 'h2 id="p-atelier-title"';
    const hc = level === 1 ? 'h1' : 'h2';
    const poster = '' +
      '<div class="p-wrap p-poster">' +
        '<div class="p-poster-copy">' +
          '<span class="p-badge-y">L’atelier ' + esc(GARAGE.name) + '</span>' +
          chromeStars(5) +
          '<' + h + ' class="p-poster-title">Prenez soin<br>de votre<br><em>véhicule.</em></' + hc + '>' +
          '<p class="p-poster-lead">Entretien, réparation, reprogrammation et dépannage, toutes marques. Un seul interlocuteur, un atelier équipé, et des explications claires avant chaque intervention.</p>' +
          '<div class="p-poster-call">' +
            '<a class="btn btn-yellow" href="#contact" data-devis="atelier">Demander un devis ' + arrowIcon() + '</a>' +
            '<p class="p-call-num"><span class="p-call-ic">' + icon('phone') + '</span><span><span class="p-label">Plus d’informations</span><span class="p-call-big num">' + esc(GARAGE.phone) + '</span></span></p>' +
          '</div>' +
        '</div>' +
        '<div class="p-poster-visual">' +
          '<img src="img/atelier-acier.webp" alt="Mécanicien contrôlant une voiture sur un pont élévateur dans l’atelier" width="1024" height="1024" decoding="async">' +
          '<span class="p-poster-vtext" aria-hidden="true">' + esc(GARAGE.name) + ' · Atelier</span>' +
        '</div>' +
      '</div>';
    // Porte de garage à lames : elle se lève au défilement (accueil) ou toute seule (page Atelier)
    return '' +
      '<div class="p-garage" data-garage="' + (level === 1 ? 'auto' : 'scroll') + '">' +
        '<div class="p-garage-stage">' + poster +
          '<span class="p-garage-housing" aria-hidden="true"></span>' +
          '<div class="p-door" aria-hidden="true">' +
            '<span class="p-door-plate">' + App.Brand.mark('p-door-mark') + '<span><b>' + esc(GARAGE.name) + '</b><small>Atelier mécanique</small></span></span>' +
            '<span class="p-door-hint">' + (level === 1 ? 'Ouverture de l’atelier' : 'Faites défiler pour ouvrir l’atelier') + '</span>' +
            '<span class="p-door-handle"></span>' +
          '</div>' +
        '</div>' +
      '</div>';
  }

  /* Ouverture de la porte : liée au défilement, ou automatique à l'arrivée sur la page Atelier */
  function bindGarage(root) {
    Array.prototype.forEach.call(root.querySelectorAll('.p-garage'), (g) => {
      const door = g.querySelector('.p-door');
      const stage = g.querySelector('.p-garage-stage');
      if (reducedMotion()) { g.classList.add('is-open'); return; }
      if (g.dataset.garage === 'auto') { setTimeout(() => g.classList.add('is-open'), 450); return; }
      const mq = window.matchMedia('(min-width: 960px) and (min-height: 700px)');
      let raf = 0;
      const update = () => {
        raf = 0;
        const r = g.getBoundingClientRect();
        const vh = window.innerHeight;
        let p;
        if (g.classList.contains('is-pinned')) {
          // La scène reste en place pendant que la porte se lève
          const top = parseFloat(getComputedStyle(stage).top) || 0;
          p = (top - r.top + vh * 0.12) / Math.max(1, (g.offsetHeight - stage.offsetHeight) * 0.85);
        } else {
          p = (vh * 0.8 - r.top) / (vh * 0.65);
        }
        p = Math.max(0, Math.min(1, p));
        door.style.transform = 'translateY(' + (-p * 103).toFixed(2) + '%)';
        door.style.opacity = (0.86 - p * 0.3).toFixed(3);
        g.classList.toggle('is-open', p >= 1);
      };
      const setPin = () => { g.classList.toggle('is-pinned', mq.matches); update(); };
      on(window, 'scroll', () => { if (!raf) raf = requestAnimationFrame(update); }, { passive: true });
      on(window, 'resize', setPin);
      setPin();
    });
  }

  /* Services en hexagones */
  const SERVICES = [
    ['car', 'Achat · Vente', 'Occasions révisées avant la vente, reprise de votre véhicule.'],
    ['wrench', 'Réparation', 'Entretien, freinage, distribution, diagnostic : toutes marques, devis avant intervention.'],
    ['gauge', 'Reprogrammation', 'Optimisation moteur sur mesure, diagnostic préalable inclus.'],
    ['tow', 'Dépannage', 'Une panne ? Un appel et nous venons chercher votre véhicule.']
  ];
  function hexServices(titleLevel) {
    const h = 'h' + (titleLevel || 2);
    return '' +
      '<div class="p-wrap p-services-x">' +
        '<div class="p-services-head">' + chromeStars(5) + '<' + h + ' id="p-serv-title">Nos services</' + h + '></div>' +
        '<ul class="p-hexes">' + SERVICES.map(([ic, t, d]) =>
          '<li><span class="p-hex" aria-hidden="true">' + icon(ic) + '</span><h3>' + t + '</h3><p>' + d + '</p></li>').join('') + '</ul>' +
      '</div>';
  }

  /* Carte « focus » de l'atelier (reprogrammation, dépannage) */
  function focusCard(id, img, alt, kicker, title, steps, cta) {
    return '' +
      '<article class="p-focus" id="' + id + '">' +
        '<img src="' + img + '" alt="' + alt + '" width="1000" height="667" loading="lazy" decoding="async">' +
        '<div class="p-focus-body">' +
          '<span class="p-focus-stripes" aria-hidden="true"></span>' +
          '<p class="p-focus-k">' + kicker + '</p>' +
          '<h3>' + title + '</h3>' +
          '<ol class="p-focus-steps">' + steps.map((s) => '<li>' + s + '</li>').join('') + '</ol>' +
          cta +
        '</div>' +
      '</article>';
  }

  /* =========================================================
     Page : Accueil
     ========================================================= */
  function pageHome() {
    const avail = available().sort(byRecent);
    const n = avail.length;
    const warranty = maxWarranty();
    const makeOpts = makesOf(avail).map((m) => [m, m + ' (' + avail.filter((v) => v.make === m).length + ')']);
    const bodies = LISTS.bodies.filter(([k]) => avail.some((v) => v.body === k));

    const html = '' +
      '<section class="p-hx" aria-labelledby="p-h1">' +
        '<div class="p-wrap">' +
          '<div class="p-hx-grid">' +
            '<div class="p-hx-copy">' +
              eyebrowLine('Showroom · ' + esc(GARAGE.city)) +
              '<h1 id="p-h1" tabindex="-1" class="p-hx-title">Des occasions <span class="p-outline">contrôlées</span> &amp; garanties<span class="p-red">.</span></h1>' +
              '<p class="p-hx-lead">Achat, vente, réparation, reprogrammation et dépannage. Chaque véhicule passe par notre atelier avant d’entrer dans le showroom.</p>' +
              '<p class="p-hx-ctas"><a class="btn btn-primary" href="#showroom">Voir les ' + plural(n, 'véhicule', 'véhicules') + ' ' + arrowIcon() + '</a><a class="btn btn-glass" href="#garage">Découvrir l’atelier ' + arrowIcon() + '</a></p>' +
            '</div>' +
          '</div>' +
          '<form class="p-hx-search" id="p-quick" role="search" aria-label="Recherche rapide" novalidate>' +
            selectField('q-make', 'make', 'Marque', makeOpts, '', 'Toutes les marques') +
            selectField('q-price', 'priceMax', 'Budget maximum', PRICE_STEPS.map((p) => [p, fmt.price(p)]), '', 'Sans limite') +
            selectField('q-fuel', 'fuel', 'Énergie', LISTS.fuels.map((f) => [f, f]), '', 'Toutes énergies') +
            selectField('q-body', 'body', 'Carrosserie', bodies, '', 'Toutes carrosseries') +
            '<button type="submit" class="btn btn-primary p-quick-submit"><span class="p-quick-label">Voir les ' + plural(n, 'véhicule', 'véhicules') + '</span>' + arrowIcon() + '</button>' +
          '</form>' +
        '</div>' +
        '<button type="button" class="p-hx-360" data-scroll="p-reel"><span class="p-hx-360-dot" aria-hidden="true">' + icon('swap') + '</span><span><strong>Showroom 360°</strong><span>Faites tourner la sélection</span></span></button>' +
      '</section>' +

      promiseStrip(n, warranty) +

      '<section class="p-reel" id="p-reel" aria-labelledby="p-reel-title">' +
        '<div class="p-wrap p-reel-head">' +
          '<div>' + eyebrowLine('Arrivages') + '<h2 id="p-reel-title">Nos dernières voitures rentrées</h2><p class="p-reel-sub">Les ' + REEL_LIMIT + ' derniers véhicules entrés au garage. Tout le stock est dans le showroom.</p></div>' +
          '<div class="p-reel-filters" role="group" aria-label="Filtrer par carrosserie">' +
            [['', 'Tous']].concat(bodies).map(([k, l]) => '<button type="button" class="p-reel-filter" data-body="' + esc(k) + '" aria-pressed="' + (k === '' ? 'true' : 'false') + '">' + esc(l) + ' <span class="num">' + Math.min(REEL_LIMIT, k ? avail.filter((v) => v.body === k).length : n) + '</span></button>').join('') +
          '</div>' +
        '</div>' +
        '<div class="p-reel-stage" tabindex="0" aria-roledescription="carrousel" aria-label="Dernières voitures rentrées. Flèches gauche et droite pour changer de véhicule.">' +
          '<div class="p-reel-orbit" aria-hidden="true"></div>' +
          '<div class="p-reel-slides"></div>' +
          '<button type="button" class="p-reel-arrow p-reel-prev" aria-label="Véhicule précédent">' + icon('chevronLeft') + '</button>' +
          '<button type="button" class="p-reel-arrow p-reel-next" aria-label="Véhicule suivant">' + icon('chevron') + '</button>' +
        '</div>' +
        '<div class="p-wrap">' +
          '<div class="p-reel-active" aria-live="polite"></div>' +
          '<div class="p-reel-pager">' +
            '<p class="p-reel-progress"><span class="num p-reel-cur">01</span><span class="p-reel-bar"><i></i></span><span class="num p-reel-tot">01</span><span class="p-reel-hint">Glissez ou utilisez les flèches</span></p>' +
            '<a class="btn btn-glass" href="#showroom">Tout le stock · ' + plural(n, 'véhicule', 'véhicules') + ' ' + arrowIcon() + '</a>' +
          '</div>' +
        '</div>' +
      '</section>' +

      '<section class="p-atelier" aria-labelledby="p-atelier-title">' + hazard() + atelierPoster(2) + hexServices(2) + hazard() + '</section>' +

      '<section class="p-section p-infos" aria-labelledby="p-info-title">' +
        '<div class="p-wrap">' +
          '<div class="p-section-head"><div>' + eyebrowLine('Infos pratiques') + '<h2 id="p-info-title">Passez nous voir</h2></div></div>' +
          practicalInfo(3) +
        '</div>' +
      '</section>';

    return {
      title: GARAGE.name + ' — Voitures d’occasion garanties à ' + city,
      description: n + ' véhicules d’occasion contrôlés et garantis chez ' + GARAGE.name + ' à ' + city + '. Reprise, financement, garantie, atelier.',
      html: html,
      bind(root) {
        const form = root.querySelector('#p-quick');
        const label = form.querySelector('.p-quick-label');
        const read = () => Object.assign({}, DEFAULT_FILTERS, { make: form.elements.make.value, priceMax: form.elements.priceMax.value, fuel: form.elements.fuel.value, body: form.elements.body.value });
        // Le bouton annonce le nombre de résultats avant même d'ouvrir le showroom
        form.addEventListener('change', () => {
          const k = applyFilters(publicVehicles(), read()).filter((v) => !isSold(v)).length;
          label.textContent = k ? 'Voir les ' + plural(k, 'véhicule', 'véhicules') : 'Aucun véhicule : modifier';
        });
        form.addEventListener('submit', (e) => { e.preventDefault(); filters = read(); Router.go('showroom'); });
        bindReel(root, avail);
        bindGarage(root);
      }
    };
  }

  /* ---------- Carrousel 3D du showroom (glisser, flèches, clavier) ---------- */
  function bindReel(root, all) {
    const stage = root.querySelector('.p-reel-stage');
    if (!stage) return;
    const slidesEl = stage.querySelector('.p-reel-slides');
    const activeEl = root.querySelector('.p-reel-active');
    const prev = stage.querySelector('.p-reel-prev');
    const next = stage.querySelector('.p-reel-next');
    const bar = root.querySelector('.p-reel-bar i');
    const cur = root.querySelector('.p-reel-cur');
    const tot = root.querySelector('.p-reel-tot');
    // Les REEL_LIMIT dernières entrées, en boucle infinie : la plus récente au centre,
    // la flèche de droite va vers les plus anciennes puis revient à la première.
    let list = [];
    let pos = 0;          // position continue (peut dépasser la liste : on travaille modulo n)
    let lastId = null;
    const mod = (a, n) => ((a % n) + n) % n;
    // Écart le plus court entre la carte i et la position courante, dans la boucle
    function offsetOf(i) {
      const n = list.length;
      if (n < 2) return i - pos;
      let o = mod(i - pos, n);
      if (o > n / 2) o -= n;
      return o;
    }
    function setList(src) {
      list = src.slice().sort(byRecent).slice(0, REEL_LIMIT);
      pos = 0;
      lastId = null;
      slidesEl.innerHTML = list.map((v, i) => {
        const tag = v.status === 'reserve' ? '<span class="pill pill-reserve">Réservé</span>' : isNew(v) ? '<span class="p-tag-red">Nouveau</span>' : '';
        return '<a class="p-reel-slide" href="' + vehicleHref(v) + '" data-i="' + i + '" draggable="false" aria-label="' + esc(fmt.title(v) + ', ' + fmt.price(v.price)) + '">' +
          '<span class="p-reel-media p-visual">' + Media.photo(v, 0, '') + '</span>' +
          (tag ? '<span class="p-reel-tag">' + tag + '</span>' : '') +
          '<span class="p-reel-cap"><span><span class="p-label">' + esc(v.make) + '</span><span class="p-reel-t">' + esc(v.model) + '</span></span><span class="p-reel-p num">' + esc(fmt.price(v.price)) + '</span></span>' +
        '</a>';
      }).join('');
      Array.prototype.forEach.call(slidesEl.querySelectorAll('img'), (img) => { img.loading = 'eager'; img.draggable = false; });
      tot.textContent = String(list.length).padStart(2, '0');
      layout();
    }
    function metrics() { const s = slidesEl.querySelector('.p-reel-slide'); const w = s ? s.offsetWidth : 560; return { x1: w * 0.84, x2: w * 0.6 }; }
    function layout() {
      const m = metrics();
      const n = list.length;
      Array.prototype.forEach.call(slidesEl.children, (el, i) => {
        const o = offsetOf(i), a = Math.abs(o), s = Math.sign(o);
        // Une carte qui passe d'un bout à l'autre de la boucle saute sans animation
        const jump = el.dataset.o !== undefined && Math.abs(o - Number(el.dataset.o)) > n / 2;
        el.dataset.o = String(o);
        if (jump) el.style.transition = 'none';
        const a1 = Math.min(a, 1), a2 = Math.max(0, Math.min(a, 2) - 1), a3 = Math.max(0, a - 2);
        const x = s * (a1 * m.x1 + a2 * m.x2 + a3 * m.x2 * 0.6);
        const ry = -s * (a1 * 38 + a2 * 14);
        const z = -(a1 * 260 + a2 * 360 + a3 * 200);
        el.style.transform = 'translateX(-50%) translateX(' + x.toFixed(1) + 'px) translateZ(' + z.toFixed(1) + 'px) rotateY(' + ry.toFixed(2) + 'deg)';
        el.style.zIndex = String(100 - Math.round(a * 10));
        el.style.setProperty('--dim', Math.min(a * 0.38, 0.8).toFixed(2));
        el.style.visibility = a > 2.6 ? 'hidden' : 'visible';
        el.classList.toggle('is-active', a < 0.5);
        el.tabIndex = a < 0.5 ? 0 : -1;
        if (jump) { void el.offsetWidth; el.style.transition = ''; }
      });
      const idx = n ? mod(Math.round(pos), n) : 0;
      prev.disabled = next.disabled = n < 2;
      bar.style.width = n ? (100 / n) + '%' : '0';
      bar.style.left = n ? (idx * 100 / n) + '%' : '0';
      cur.textContent = String(n ? idx + 1 : 0).padStart(2, '0');
      renderActive();
    }
    function renderActive() {
      const v = list.length ? list[mod(Math.round(pos), list.length)] : null;
      if (!v || v.id === lastId) return;
      lastId = v.id;
      const chips = [v.year, fmt.km(v.km), v.fuel, v.gearbox, v.hp + ' ch', String(v.critair).toUpperCase() === 'E' ? 'Crit’Air E' : 'Crit’Air ' + v.critair]
        .map((c) => '<span class="p-chip-mono num">' + esc(c) + '</span>').join('');
      activeEl.innerHTML = '<div class="p-reel-info">' +
        '<p class="p-reel-ref">' + esc(v.make) + ' · ' + esc(v.ref) + '</p>' +
        '<h3>' + esc(v.model) + ' — ' + esc(v.version) + '</h3>' +
        '<p class="p-reel-chips">' + chips + '</p>' +
        '<div class="p-reel-row"><p class="p-reel-price"><span class="num">' + esc(fmt.price(v.price)) + '</span> <span class="p-price-type">' + priceType(v) + '</span>' +
          '<small>' + (v.status === 'reserve' ? 'Réservé · liste d’attente possible' : (Number(v.warrantyMonths) ? 'Garantie ' + esc(v.warrantyMonths) + ' mois · reprise possible' : 'Reprise possible')) + '</small></p>' +
          '<a class="btn btn-primary" href="' + vehicleHref(v) + '">Voir la fiche ' + arrowIcon() + '</a></div>' +
      '</div>';
    }
    function goTo(target) { if (!list.length) return; pos = target; layout(); }
    prev.addEventListener('click', () => goTo(Math.round(pos) - 1));
    next.addEventListener('click', () => goTo(Math.round(pos) + 1));
    stage.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') { e.preventDefault(); goTo(Math.round(pos) - 1); }
      if (e.key === 'ArrowRight') { e.preventDefault(); goTo(Math.round(pos) + 1); }
    });
    root.querySelector('.p-reel-filters').addEventListener('click', (e) => {
      const b = e.target.closest('.p-reel-filter');
      if (!b) return;
      root.querySelectorAll('.p-reel-filter').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      setList(b.dataset.body ? all.filter((v) => v.body === b.dataset.body) : all);
    });

    // Glisser à la souris ou au doigt
    let drag = null;
    let suppress = false;
    stage.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 || e.target.closest('.p-reel-arrow') || !list.length) return;
      drag = { x: e.clientX, y: e.clientY, pos: pos, moved: false, id: e.pointerId };
    });
    stage.addEventListener('pointermove', (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      const dx = e.clientX - drag.x;
      if (!drag.moved && Math.abs(dx) > 6 && Math.abs(dx) > Math.abs(e.clientY - drag.y)) {
        drag.moved = true; stage.classList.add('is-dragging');
        try { stage.setPointerCapture(e.pointerId); } catch (err) { /* rien */ }
      }
      if (!drag.moved) return;
      pos = drag.pos - dx / (metrics().x1 * 0.9); layout();
    });
    const end = (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      const moved = drag.moved;
      drag = null; stage.classList.remove('is-dragging');
      if (moved) { goTo(Math.round(pos)); suppress = true; setTimeout(() => { suppress = false; }, 60); }
    };
    stage.addEventListener('pointerup', end);
    stage.addEventListener('pointercancel', end);
    slidesEl.addEventListener('click', (e) => {
      const s = e.target.closest('.p-reel-slide');
      if (!s) return;
      if (suppress) { e.preventDefault(); return; }
      const o = Math.round(offsetOf(Number(s.dataset.i)));
      if (o !== 0) { e.preventDefault(); goTo(Math.round(pos) + o); }
    });
    on(window, 'resize', layout);
    setList(all);
  }

  /* =========================================================
     Page : Showroom
     ========================================================= */
  function pageShowroom() {
    const all = publicVehicles();
    const makes = makesOf(all);
    if (filters.make && makes.indexOf(filters.make) === -1) makes.push(filters.make);
    const f = filters;

    const html = '' +
      '<div class="p-wrap p-page-head">' +
        '<p class="eyebrow">Stock mis à jour en temps réel</p>' +
        '<h1 id="p-h1" tabindex="-1">Nos véhicules d’occasion</h1>' +
        '<p class="p-lead">Tous nos véhicules sont révisés et garantis. Prix TTC, sauf utilitaires affichés HT.</p>' +
      '</div>' +
      '<div class="p-wrap p-sr">' +
        '<aside class="p-filters" id="p-filters" aria-labelledby="p-filters-title">' +
          '<div class="p-filters-panel" role="presentation">' +
            '<div class="p-filters-head">' +
              '<h2 id="p-filters-title" tabindex="-1">Filtrer</h2>' +
              '<button type="button" class="p-icon-btn p-filters-close" aria-label="Fermer les filtres">' + icon('x') + '</button>' +
            '</div>' +
            '<form class="p-filters-form" id="p-filters-form" novalidate>' +
              selectField('f-make', 'make', 'Marque', makes.map((m) => [m, m]), f.make, 'Toutes les marques') +
              selectField('f-fuel', 'fuel', 'Énergie', LISTS.fuels.map((x) => [x, x]), f.fuel, 'Toutes') +
              selectField('f-gearbox', 'gearbox', 'Boîte de vitesses', LISTS.gearboxes.map((x) => [x, x]), f.gearbox, 'Toutes') +
              selectField('f-body', 'body', 'Carrosserie', LISTS.bodies, f.body, 'Toutes') +
              selectField('f-price', 'priceMax', 'Prix maximum', PRICE_STEPS.map((p) => [p, fmt.price(p)]), f.priceMax, 'Sans limite') +
              selectField('f-km', 'kmMax', 'Kilométrage maximum', KM_STEPS.map((k) => [k, fmt.km(k)]), f.kmMax, 'Sans limite') +
              selectField('f-year', 'yearMin', 'Année minimum', yearsOf(all).map((y) => [y, String(y)]), f.yearMin, 'Toutes') +
            '</form>' +
            '<div class="p-filters-foot">' +
              '<button type="button" class="btn btn-ghost p-reset">Réinitialiser</button>' +
              '<button type="button" class="btn btn-primary p-filters-apply">Voir les résultats</button>' +
            '</div>' +
          '</div>' +
        '</aside>' +
        '<section class="p-results" aria-labelledby="p-results-title">' +
          '<h2 class="visually-hidden" id="p-results-title">Résultats</h2>' +
          '<div class="p-toolbar">' +
            '<button type="button" class="btn btn-ghost p-filters-toggle" aria-expanded="false" aria-controls="p-filters">' + icon('filter') + 'Filtres<span class="p-count-badge" hidden></span></button>' +
            '<p class="p-result-count" role="status" aria-live="polite"></p>' +
            '<div class="p-sort"><label for="f-sort">Trier par</label><select class="select" id="f-sort">' +
              SORTS.map(([k, l]) => '<option value="' + k + '"' + (f.sort === k ? ' selected' : '') + '>' + l + '</option>').join('') +
            '</select></div>' +
          '</div>' +
          '<div class="p-chips" aria-label="Filtres actifs"></div>' +
          '<div class="p-results-list"></div>' +
        '</section>' +
      '</div>';

    return {
      title: 'Nos véhicules d’occasion — ' + GARAGE.name,
      description: 'Le stock de ' + GARAGE.name + ' à ' + city + ' : citadines, SUV, breaks et utilitaires d’occasion, révisés et garantis.',
      html: html,
      bind: bindShowroom
    };
  }

  function bindShowroom(root) {
    const form = root.querySelector('#p-filters-form');
    const panel = root.querySelector('#p-filters');
    const toggle = root.querySelector('.p-filters-toggle');
    const badge = toggle.querySelector('.p-count-badge');
    const countEl = root.querySelector('.p-result-count');
    const chipsEl = root.querySelector('.p-chips');
    const listEl = root.querySelector('.p-results-list');
    const applyBtn = root.querySelector('.p-filters-apply');
    const sortEl = root.querySelector('#f-sort');

    function update() {
      const res = applyFilters(publicVehicles(), filters);
      const sold = res.filter(isSold).length;
      const n = res.length;
      countEl.innerHTML = '<strong class="num">' + n + '</strong> ' + (n > 1 ? 'véhicules' : 'véhicule') + (sold ? '<span class="p-muted"> · dont ' + sold + ' vendu' + (sold > 1 ? 's' : '') + ' récemment</span>' : '');
      applyBtn.textContent = n ? 'Voir ' + plural(n, 'véhicule', 'véhicules') : 'Aucun résultat';
      const keys = activeKeys(filters);
      badge.hidden = !keys.length;
      badge.textContent = keys.length ? String(keys.length) : '';
      chipsEl.innerHTML = keys.length ? keys.map((k) =>
        '<button type="button" class="p-chip" data-key="' + k + '" aria-label="Retirer le filtre ' + FILTER_NAMES[k] + ' : ' + esc(FILTER_LABELS[k](filters[k])) + '">' + esc(FILTER_LABELS[k](filters[k])) + icon('x') + '</button>').join('') +
        '<button type="button" class="p-chip-reset">Tout effacer</button>' : '';
      listEl.innerHTML = n ? grid(res) : emptyState();
    }
    function syncForm() {
      Array.prototype.forEach.call(form.elements, (el) => { if (el.name) el.value = filters[el.name] || ''; });
      sortEl.value = filters.sort;
    }
    function reset() { filters = Object.assign({}, DEFAULT_FILTERS, { sort: filters.sort }); syncForm(); update(); }

    form.addEventListener('change', (e) => { if (e.target.name) { filters[e.target.name] = e.target.value; update(); } });
    sortEl.addEventListener('change', () => { filters.sort = sortEl.value; update(); });
    root.querySelector('.p-reset').addEventListener('click', reset);
    chipsEl.addEventListener('click', (e) => {
      const chip = e.target.closest('.p-chip');
      if (chip) {
        filters[chip.dataset.key] = ''; syncForm(); update();
        // Le focus revient sur la puce suivante, ou sur le compteur
        const next = chipsEl.querySelector('.p-chip') || chipsEl.querySelector('.p-chip-reset');
        (next || toggle).focus();
      } else if (e.target.closest('.p-chip-reset')) { reset(); toggle.focus(); }
    });
    listEl.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      if (btn.dataset.action === 'reset') reset();
      if (btn.dataset.action === 'describe') {
        contactPrefill = { subject: 'achat', message: 'Bonjour, je recherche ' + describeSearch(filters) + '. Pouvez-vous me prévenir si un véhicule correspondant arrive au garage ?' };
        Router.go('contact');
      }
    });

    // Panneau de filtres sur mobile
    function setOpen(open) {
      panel.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', String(open));
      document.documentElement.classList.toggle('p-lock', open);
      if (open) panel.querySelector('#p-filters-title').focus();
      else toggle.focus();
    }
    toggle.addEventListener('click', () => setOpen(true));
    root.querySelector('.p-filters-close').addEventListener('click', () => setOpen(false));
    applyBtn.addEventListener('click', () => setOpen(false));
    on(document, 'keydown', (e) => { if (e.key === 'Escape' && panel.classList.contains('is-open')) setOpen(false); });
    const mq = window.matchMedia('(min-width: 860px)');
    const onMq = () => { if (mq.matches && panel.classList.contains('is-open')) { panel.classList.remove('is-open'); toggle.setAttribute('aria-expanded', 'false'); document.documentElement.classList.remove('p-lock'); } };
    if (mq.addEventListener) { mq.addEventListener('change', onMq); cleanups.push(() => mq.removeEventListener('change', onMq)); }

    update();
  }

  function emptyState() {
    return '' +
      '<div class="p-empty">' +
        '<span class="p-empty-icon">' + icon('search') + '</span>' +
        '<h3>Aucun véhicule ne correspond à ces critères</h3>' +
        '<p>Élargissez votre recherche, ou décrivez-nous la voiture que vous cherchez : nous recevons de nouveaux véhicules chaque semaine et nous vous prévenons dès qu’elle arrive.</p>' +
        '<p class="p-empty-actions"><button type="button" class="btn btn-primary" data-action="reset">Réinitialiser les filtres</button><button type="button" class="btn btn-ghost" data-action="describe">Décrire ma recherche</button></p>' +
      '</div>';
  }

  /* =========================================================
     Page : Fiche véhicule
     ========================================================= */
  function similarTo(v, max) {
    return available().filter((x) => x.id !== v.id).map((x) => {
      const diff = Math.abs(x.price - v.price) / Math.max(1, v.price);
      return { x, score: (x.body === v.body ? 2 : 0) + (diff <= 0.2 ? 1 : 0), diff };
    }).filter((o) => o.score > 0).sort((a, b) => (b.score - a.score) || (a.diff - b.diff)).slice(0, max || 4).map((o) => o.x);
  }

  function pageVehicle(id) {
    const found = Store.vehicle(id);
    const v = found && !found.hiddenFromSite ? found : null;
    if (!v) return pageNotFound(true);
    const sold = isSold(v);
    const count = Math.max(1, Media.count(v));
    const title = fmt.title(v);
    const similar = similarTo(v, 4);

    const slides = [];
    const thumbs = [];
    for (let i = 0; i < count; i++) {
      slides.push('<div class="p-gal-slide p-visual" data-index="' + i + '">' + Media.photo(v, i, title + ' ' + v.version + ', photo ' + (i + 1) + ' sur ' + count) + '</div>');
      thumbs.push('<li><button type="button" class="p-gal-thumb p-visual" data-index="' + i + '" aria-label="Afficher la photo ' + (i + 1) + ' sur ' + count + '"' + (i === 0 ? ' aria-current="true"' : '') + '>' + Media.photo(v, i) + '</button></li>');
    }
    const gallery = '' +
      '<section class="p-gallery" aria-roledescription="carrousel" aria-label="Photos du véhicule">' +
        '<div class="p-gal-main">' +
          '<div class="p-gal-track" tabindex="0" aria-label="Photos, utilisez les flèches gauche et droite">' + slides.join('') + '</div>' +
          (sold ? '<span class="p-sold-band p-sold-band-lg">Vendu</span>' : '') +
          (count > 1 ? '<button type="button" class="p-gal-nav p-gal-prev" aria-label="Photo précédente">' + icon('chevronLeft') + '</button>' +
            '<button type="button" class="p-gal-nav p-gal-next" aria-label="Photo suivante">' + icon('chevron') + '</button>' : '') +
          '<p class="p-gal-counter num" aria-live="polite"><span class="p-gal-current">1</span> / ' + count + '</p>' +
        '</div>' +
        (count > 1 ? '<ul class="p-gal-thumbs">' + thumbs.join('') + '</ul>' : '') +
      '</section>';

    const facts = [
      ['calendar', esc(v.year)], ['gauge', esc(fmt.km(v.km))], ['fuel', esc(v.fuel)], ['gear', esc(v.gearbox)]
    ].map(([ic, val]) => '<li>' + icon(ic) + '<span class="num">' + val + '</span></li>').join('');

    let statusNote = '';
    if (v.status === 'reserve') statusNote = '<p class="p-note p-note-warn">' + icon('info') + '<span>Ce véhicule est réservé. Laissez vos coordonnées : nous vous prévenons s’il se libère.</span></p>';
    if (sold) statusNote = '<p class="p-note p-note-bad">' + icon('info') + '<span>Ce véhicule a trouvé preneur' + (v.soldAt ? ' le ' + esc(fmt.date(v.soldAt)) : '') + '. Découvrez ci-dessous des modèles proches, disponibles.</span></p>';

    const summary = '' +
      '<aside class="p-summary" aria-labelledby="p-h1">' +
        '<div class="p-summary-pills">' + statusPill(v) + (!sold && isNew(v) ? '<span class="pill pill-nouveau">Nouveau</span>' : '') + '</div>' +
        '<h1 id="p-h1" tabindex="-1">' + esc(title) + '</h1>' +
        '<p class="p-summary-version">' + esc(v.version) + '</p>' +
        '<ul class="p-facts-inline">' + facts + '</ul>' +
        '<div class="p-summary-price">' + priceHtml(v, 'p-price-xl' + (sold ? ' p-strike' : '')) +
          (!sold && Number(v.warrantyMonths) ? '<p class="p-warranty-line">' + icon('shield') + 'Garantie ' + esc(v.warrantyMonths) + ' mois incluse</p>' : '') + '</div>' +
        statusNote +
        '<div class="p-summary-actions">' +
          (sold
            ? '<button type="button" class="btn btn-primary btn-block" data-scroll="p-similar">Voir des modèles proches</button>'
            : '<button type="button" class="btn btn-primary btn-block" data-scroll="p-lead">Ce véhicule m’intéresse</button>') +
          '<a class="btn btn-ghost btn-block" href="' + telHref(GARAGE.phone) + '">' + icon('phone') + '<span>Appeler le <span class="num">' + esc(GARAGE.phone) + '</span></span></a>' +
        '</div>' +
        '<div class="p-summary-meta">' +
          '<p>Référence <span class="p-ref">' + esc(v.ref) + '</span></p>' +
          '<button type="button" class="p-share">' + icon('share') + 'Partager</button>' +
        '</div>' +
        '<div class="p-share-fallback" hidden>' +
          '<label for="p-share-input">Copiez ce lien pour le partager :</label>' +
          '<input class="input" id="p-share-input" readonly>' +
        '</div>' +
      '</aside>';

    const swatch = safeHex(v.colorHex);
    const specs = [
      ['calendar', 'Mise en circulation', esc(fmt.circulation(v))],
      ['gauge', 'Kilométrage', esc(fmt.km(v.km))],
      ['fuel', 'Énergie', esc(v.fuel)],
      ['gear', 'Boîte de vitesses', esc(v.gearbox)],
      ['bolt', 'Puissance', esc(v.hp) + ' ch · ' + esc(v.cv) + ' CV fiscaux'],
      ['swatch', 'Couleur', esc(v.color)],
      ['car', 'Carrosserie', esc(fmt.label('bodies', v.body))],
      ['seat', 'Portes et places', esc(v.doors) + ' portes · ' + esc(v.seats) + ' places'],
      ['critair', 'Vignette Crit’Air', String(v.critair).toUpperCase() === 'E' ? 'Électrique' : 'Crit’Air ' + esc(v.critair)],
      ['user', 'Première main', v.firstHand ? 'Oui' : 'Non']
    ].map(([ic, label, val]) => {
      let visual = icon(ic);
      if (ic === 'swatch') visual = '<span class="p-swatch"' + (swatch ? ' style="background:' + swatch + '"' : '') + ' aria-hidden="true"></span>';
      if (ic === 'critair') visual = critairBadge(v).replace('role="img"', 'aria-hidden="true"') || icon('leaf');
      return '<div class="p-spec"><span class="p-spec-icon">' + visual + '</span><dt>' + label + '</dt><dd class="num">' + val + '</dd></div>';
    }).join('');

    const equipment = Array.isArray(v.equipment) && v.equipment.length
      ? '<section class="p-block" aria-labelledby="p-eq-title"><h2 id="p-eq-title">Équipements</h2><ul class="p-equipment">' +
        v.equipment.map((e) => '<li>' + icon('check') + '<span>' + esc(e) + '</span></li>').join('') + '</ul></section>' : '';

    const description = v.description
      ? '<section class="p-block" aria-labelledby="p-desc-title"><h2 id="p-desc-title">Le mot du garage</h2><p class="p-description">' + esc(v.description) + '</p></section>' : '';

    const months = Number(v.warrantyMonths) || 0;
    const warranty = '' +
      '<section class="p-block p-warranty" aria-labelledby="p-war-title">' +
        '<span class="p-icon-tile">' + icon('shield') + '</span>' +
        '<div><h2 id="p-war-title">' + (months ? 'Garantie ' + months + ' mois' : 'Garantie légale de conformité') + '</h2>' +
        '<p>' + (months ? 'Pièces et main-d’œuvre, incluse dans le prix. ' : '') + 'Véhicule révisé par notre atelier, contrôle technique à jour et carte grise prise en charge par le garage sur demande.</p></div>' +
      '</section>';

    const lead = sold
      ? '<section class="p-block p-sold-callout" id="p-lead" aria-labelledby="p-sold-title">' +
          '<h2 id="p-sold-title">Ce véhicule est vendu</h2>' +
          '<p>Vous cherchiez un modèle de ce type ? Dites-nous ce qui vous intéresse, nous vous prévenons dès qu’un véhicule équivalent arrive.</p>' +
          '<p class="p-empty-actions"><button type="button" class="btn btn-primary" data-describe>Décrire ma recherche</button><a class="btn btn-ghost" href="#showroom">Voir tout le stock</a></p>' +
        '</section>'
      : leadForm(v);

    const similarHtml = similar.length
      ? '<section class="p-section p-section-alt" id="p-similar" aria-labelledby="p-similar-title"><div class="p-wrap">' +
          '<div class="p-section-head"><div><p class="eyebrow">' + (sold ? 'Disponibles aujourd’hui' : 'À voir aussi') + '</p><h2 id="p-similar-title">' + (sold ? 'Des modèles proches, disponibles' : 'Véhicules similaires') + '</h2></div>' +
          '<a class="p-link-more" href="#showroom">Tout le stock ' + icon('arrow') + '</a></div>' + grid(similar) + '</div></section>'
      : '<div id="p-similar"></div>';

    const html = '' +
      '<div class="p-wrap">' +
        '<nav class="p-crumbs" aria-label="Fil d’Ariane"><ol>' +
          '<li><a href="#accueil">Accueil</a></li><li><a href="#showroom">Nos véhicules</a></li><li aria-current="page">' + esc(title) + '</li>' +
        '</ol></nav>' +
        '<div class="p-vd' + (sold ? ' is-sold' : '') + '">' +
          '<div class="p-vd-gallery">' + gallery + '</div>' +
          summary +
          '<div class="p-vd-main">' +
            '<section class="p-block" aria-labelledby="p-spec-title"><h2 id="p-spec-title">Caractéristiques</h2><dl class="p-specs">' + specs + '</dl></section>' +
            equipment + description + (sold ? '' : warranty) + lead +
          '</div>' +
        '</div>' +
      '</div>' + similarHtml;

    return {
      title: title + ' ' + v.version + ' d’occasion — ' + fmt.price(v.price) + ' — ' + GARAGE.name,
      description: title + ' ' + v.version + ', ' + v.year + ', ' + fmt.km(v.km) + ', ' + v.fuel + ', ' + v.gearbox + '. ' + fmt.price(v.price) + ' ' + priceType(v) + ' chez ' + GARAGE.name + ' à ' + city + '.',
      ld: carLd(v),
      html: html,
      bar: { kind: 'vehicle', vehicle: v },
      bind(root) {
        bindGallery(root, count);
        bindShare(root);
        const d = root.querySelector('[data-describe]');
        if (d) d.addEventListener('click', () => {
          contactPrefill = { subject: 'achat', message: 'Bonjour, j’avais repéré la ' + title + ' ' + v.version + ' (réf. ' + v.ref + '), désormais vendue. Je cherche un modèle équivalent, budget autour de ' + fmt.price(v.price) + '. Pouvez-vous me prévenir si un véhicule de ce type arrive ?' };
          Router.go('contact');
        });
        if (!sold) bindLeadForm(root, v);
      }
    };
  }

  function bindGallery(root, count) {
    const track = root.querySelector('.p-gal-track');
    if (!track) return;
    const slides = Array.prototype.slice.call(track.children);
    const thumbs = Array.prototype.slice.call(root.querySelectorAll('.p-gal-thumb'));
    const current = root.querySelector('.p-gal-current');
    let index = 0;
    function setIndex(i) {
      index = i;
      current.textContent = String(i + 1);
      thumbs.forEach((t, k) => { if (k === i) t.setAttribute('aria-current', 'true'); else t.removeAttribute('aria-current'); });
    }
    function go(i) {
      const n = (i + count) % count;
      track.scrollTo({ left: slides[n].offsetLeft, behavior: scrollBehavior() });
      setIndex(n);
    }
    // Le défilement au doigt met aussi l'index à jour
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((en) => { if (en.isIntersecting && en.intersectionRatio >= 0.6) setIndex(Number(en.target.dataset.index)); });
      }, { root: track, threshold: [0.6] });
      slides.forEach((s) => io.observe(s));
      cleanups.push(() => io.disconnect());
    }
    const prev = root.querySelector('.p-gal-prev');
    const next = root.querySelector('.p-gal-next');
    if (prev) prev.addEventListener('click', () => go(index - 1));
    if (next) next.addEventListener('click', () => go(index + 1));
    thumbs.forEach((t) => t.addEventListener('click', () => go(Number(t.dataset.index))));
    root.querySelector('.p-gallery').addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') { e.preventDefault(); go(index - 1); }
      if (e.key === 'ArrowRight') { e.preventDefault(); go(index + 1); }
    });
  }

  function bindShare(root) {
    const btn = root.querySelector('.p-share');
    const box = root.querySelector('.p-share-fallback');
    if (!btn) return;
    const input = box.querySelector('input');
    function fallback() {
      box.hidden = false;
      input.value = location.href;
      input.focus();
      input.select();
      UI.toast('Copie automatique impossible : le lien est sélectionné, copiez-le.');
    }
    btn.addEventListener('click', () => {
      const url = location.href;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(() => UI.toast('Lien du véhicule copié.'), fallback);
      } else fallback();
    });
  }

  /* =========================================================
     Formulaires (validation accessible)
     ========================================================= */
  function inputField(o) {
    const hintId = o.hint ? o.id + '-hint' : '';
    const errId = o.id + '-err';
    const describedby = [hintId, errId].filter(Boolean).join(' ');
    const attrs = ' id="' + o.id + '" name="' + o.name + '" aria-describedby="' + describedby + '"' +
      (o.required ? ' required' : '') + (o.autocomplete ? ' autocomplete="' + o.autocomplete + '"' : '') + (o.inputmode ? ' inputmode="' + o.inputmode + '"' : '');
    let control;
    if (o.type === 'textarea') control = '<textarea class="textarea"' + attrs + ' rows="' + (o.rows || 4) + '">' + esc(o.value || '') + '</textarea>';
    else if (o.type === 'select') control = '<select class="select"' + attrs + '>' + o.options.map(([v, l]) => '<option value="' + esc(v) + '"' + (v === o.value ? ' selected' : '') + '>' + esc(l) + '</option>').join('') + '</select>';
    else control = '<input class="input" type="' + (o.type || 'text') + '"' + attrs + ' value="' + esc(o.value || '') + '">';
    return '<div class="field p-field' + (o.wide ? ' p-field-wide' : '') + '">' +
      '<label for="' + o.id + '">' + o.label + (o.required ? '<span class="p-req" aria-hidden="true"> *</span>' : o.plain ? '' : ' <span class="p-opt">(facultatif)</span>') + '</label>' +
      control + (o.hint ? '<p class="hint" id="' + hintId + '">' + o.hint + '</p>' : '') + '<p class="error" id="' + errId + '"></p></div>';
  }
  function checkField(o) {
    return '<div class="p-check-field' + (o.wide ? ' p-field-wide' : '') + '"><label class="p-check" for="' + o.id + '"><input type="checkbox" id="' + o.id + '" name="' + o.name + '"' +
      (o.required ? ' required aria-describedby="' + o.id + '-err"' : '') + (o.controls ? ' aria-controls="' + o.controls + '"' : '') + '><span>' + o.label + '</span></label>' +
      (o.required ? '<p class="error" id="' + o.id + '-err"></p>' : '') + '</div>';
  }
  function consentField(prefix) {
    return checkField({ id: prefix + '-consent', name: 'consent', required: true, wide: true,
      label: 'J’accepte que ' + esc(GARAGE.name) + ' utilise ces informations pour me recontacter au sujet de ma demande. Elles ne sont ni revendues ni utilisées pour de la publicité.<span class="p-req" aria-hidden="true"> *</span>' }) +
      '<p class="hint p-field-wide">Vos droits (accès, rectification, suppression) : voir les <a href="#mentions">mentions légales</a>.</p>';
  }

  const RULES = {
    name: (v) => (v.trim().length >= 2 ? '' : 'Indiquez votre nom pour que nous sachions qui rappeler.'),
    phone: (v) => (/^(?:0|\+33|0033)[1-9]\d{8}$/.test(v.replace(/[\s.\-()]/g, '')) ? '' : 'Indiquez un numéro à 10 chiffres, par exemple 06 12 34 56 78.'),
    email: (v) => (!v.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? '' : 'Adresse e-mail incomplète, par exemple prenom.nom@exemple.fr.'),
    message: (v) => (v.trim().length >= 5 ? '' : 'Écrivez quelques mots sur votre demande.'),
    consent: (v) => (v ? '' : 'Cochez cette case pour que nous puissions vous répondre.'),
    // Champ conditionnel : ignoré tant que son bloc est masqué
    tradeInDesc: (v, form) => {
      const box = form.elements.tradeInDesc && form.elements.tradeInDesc.closest('.p-reveal');
      return (box && box.hidden) || v.trim().length >= 3 ? '' : 'Précisez au moins la marque et le modèle de votre véhicule.';
    }
  };

  /** Branche la validation : messages liés par aria-describedby, aria-invalid, focus sur la 1re erreur. */
  function bindValidation(form, names, onValid) {
    let tried = false;
    const summary = form.querySelector('.p-form-summary');
    function check(name) {
      const el = form.elements[name];
      if (!el) return true;
      const msg = RULES[name](el.type === 'checkbox' ? el.checked : el.value, form);
      const err = document.getElementById(el.id + '-err');
      if (err) err.textContent = msg;
      if (msg) el.setAttribute('aria-invalid', 'true'); else el.removeAttribute('aria-invalid');
      return !msg;
    }
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      tried = true;
      const bad = names.filter((n) => !check(n));
      if (bad.length) {
        summary.textContent = bad.length > 1 ? bad.length + ' champs sont à corriger avant l’envoi.' : 'Un champ est à corriger avant l’envoi.';
        summary.hidden = false;
        form.elements[bad[0]].focus();
        return;
      }
      summary.hidden = true;
      onValid();
    });
    const live = (e) => { const n = e.target.name; if (names.indexOf(n) !== -1 && (tried || e.type === 'focusout') && (tried || e.target.value)) check(n); };
    form.addEventListener('input', live);
    form.addEventListener('change', live);
    form.addEventListener('focusout', live);
  }

  function leadForm(v) {
    const msg = 'Bonjour, je suis intéressé(e) par la ' + fmt.title(v) + ' ' + v.version + ' (réf. ' + v.ref + ') affichée à ' + fmt.price(v.price) + '. Est-elle toujours disponible pour un essai ?';
    return '' +
      '<section class="p-block p-form-block" id="p-lead" aria-labelledby="p-lead-title">' +
        '<div class="p-form-intro"><h2 id="p-lead-title" tabindex="-1">Ce véhicule m’intéresse</h2>' +
        '<p class="p-muted">Nous vous répondons sous 24 h ouvrées, par téléphone ou par e-mail. Les champs marqués * sont obligatoires.</p></div>' +
        '<form class="p-form" id="p-lead-form" novalidate>' +
          '<p class="p-form-summary" role="alert" hidden></p>' +
          '<div class="p-form-grid">' +
            inputField({ id: 'l-name', name: 'name', label: 'Nom et prénom', required: true, autocomplete: 'name' }) +
            inputField({ id: 'l-phone', name: 'phone', label: 'Téléphone', type: 'tel', required: true, autocomplete: 'tel', inputmode: 'tel', hint: 'Pour vous rappeler rapidement.' }) +
            inputField({ id: 'l-email', name: 'email', label: 'E-mail', type: 'email', autocomplete: 'email', wide: true }) +
            inputField({ id: 'l-message', name: 'message', label: 'Votre message', type: 'textarea', required: true, value: msg, wide: true }) +
            checkField({ id: 'l-tradein', name: 'tradeIn', label: 'J’ai un véhicule à faire reprendre', controls: 'l-tradein-box', wide: true }) +
            '<div class="p-field-wide p-reveal" id="l-tradein-box" hidden>' +
              inputField({ id: 'l-tradein-desc', name: 'tradeInDesc', label: 'Votre véhicule actuel', required: true, hint: 'Marque, modèle, année et kilométrage. Exemple : Clio III, 2012, 140 000 km.' }) +
            '</div>' +
            inputField({ id: 'l-financing', name: 'financing', label: 'Financement envisagé', type: 'select', options: LISTS.financing, value: 'ne-sait-pas', wide: true, plain: true }) +
            consentField('l') +
          '</div>' +
          '<button type="submit" class="btn btn-primary p-submit">Envoyer ma demande</button>' +
        '</form>' +
      '</section>';
  }

  function bindTradeInReveal(form, checkboxName, boxId) {
    const cb = form.elements[checkboxName];
    const box = document.getElementById(boxId);
    if (!cb || !box) return;
    const sync = () => { box.hidden = !cb.checked; };
    cb.addEventListener('change', sync);
    sync();
  }

  function confirmation(name, phone, extra) {
    const first = String(name).trim().split(/\s+/)[0];
    return '' +
      '<div class="p-confirm" role="status">' +
        '<span class="p-confirm-icon">' + icon('check') + '</span>' +
        '<h2 tabindex="-1">Merci ' + esc(first) + ', votre demande est bien envoyée.</h2>' +
        '<p>' + esc(GARAGE.name) + ' vous recontacte au <strong class="num">' + esc(phone) + '</strong> sous 24 h ouvrées. ' + (extra || '') + '</p>' +
        '<p>Vous préférez ne pas attendre ? Notre numéro : <strong class="num">' + esc(GARAGE.phone) + '</strong>.</p>' +
        '<p class="p-demo-note">' + icon('info') + '<span>Maquette : cette demande apparaît maintenant dans l’Espace gérant (bouton « Espace gérant » en haut de l’écran).</span></p>' +
        '<p class="p-empty-actions"><a class="btn btn-ghost" href="#showroom">Continuer à parcourir le stock</a></p>' +
      '</div>';
  }

  function bindLeadForm(root, v) {
    const form = root.querySelector('#p-lead-form');
    if (!form) return;
    bindTradeInReveal(form, 'tradeIn', 'l-tradein-box');
    bindValidation(form, ['name', 'phone', 'email', 'message', 'tradeInDesc', 'consent'], () => {
      const E = form.elements;
      const data = {
        vehicleId: v.id, name: E.name.value.trim(), phone: E.phone.value.trim(), email: E.email.value.trim(),
        message: E.message.value.trim(), tradeIn: E.tradeIn.checked, tradeInDesc: E.tradeIn.checked ? E.tradeInDesc.value.trim() : '',
        financing: E.financing.value
      };
      Store.addLead(data);
      const block = root.querySelector('#p-lead');
      block.innerHTML = confirmation(data.name, data.phone, 'Le véhicule ' + esc(fmt.title(v)) + ' (réf. <span class="p-ref">' + esc(v.ref) + '</span>) reste visible sur le site tant qu’il est disponible.');
      block.querySelector('h2').focus({ preventScroll: true });
      block.scrollIntoView({ behavior: scrollBehavior(), block: 'start' });
    });
  }

  /* =========================================================
     Page : Le garage
     ========================================================= */
  function pageGarage() {
    const n = available().length;
    const steps = [
      ['Vous repérez un véhicule', 'Sur le site ou directement sur notre parc, aux heures d’ouverture.'],
      ['Essai sur rendez-vous', 'Un appel suffit : le véhicule est prêt, plein fait, à votre arrivée.'],
      ['Reprise et financement', 'Nous estimons votre ancien véhicule et vous proposons un plan de financement.'],
      ['Livraison révisée', 'Révision, contrôle technique à jour, carte grise faite : vous repartez l’esprit tranquille.']
    ];
    const html = '' +
      '<section class="p-atelier p-atelier-page" aria-labelledby="p-h1">' + hazard() + atelierPoster(1) + '</section>' +
      '<section class="p-strip" aria-label="Le garage en chiffres"><div class="p-wrap p-strip-grid p-strip-3">' +
        '<div class="p-promise"><p><span class="p-promise-big num">4</span> <span class="p-promise-small">métiers</span></p><p class="p-promise-txt">Sous le même toit, à ' + esc(city) + '</p></div>' +
        '<div class="p-promise"><p><span class="p-promise-big num">' + n + '</span> <span class="p-promise-small">' + (n > 1 ? 'véhicules en stock' : 'véhicule en stock') + '</span></p><p class="p-promise-txt">Révisés par notre atelier</p></div>' +
        '<div class="p-promise"><p><span class="p-promise-big num">' + maxWarranty() + ' mois</span> <span class="p-promise-small">de garantie</span></p><p class="p-promise-txt">Au maximum, selon véhicule</p></div>' +
      '</div></section>' +
      '<section class="p-atelier" aria-labelledby="p-serv-title">' +
        hexServices(2) +
        '<div class="p-wrap p-focus-grid">' +
          focusCard('p-reprog', 'img/reprogrammation.webp', 'Ordinateur branché sur la prise diagnostic d’une voiture, courbes moteur à l’écran', 'Performance &amp; économie', 'Reprogrammation moteur',
            ['Diagnostic électronique complet', 'Lecture du calculateur', 'Cartographie optimisée sur mesure', 'Essai routier et contrôle final'],
            '<a class="btn btn-yellow" href="#contact" data-devis="reprog">Étudier mon véhicule ' + arrowIcon() + '</a>') +
          focusCard('p-depannage', 'img/depannage.webp', 'Dépanneuse plateau transportant une voiture de nuit sous la pluie', 'Panne · Accident · Batterie', 'Dépannage &amp; remorquage',
            ['Intervention autour de ' + esc(city), 'Remorquage jusqu’à l’atelier', 'Diagnostic dès l’arrivée', 'Devis avant toute réparation'],
            '<a class="btn btn-yellow" href="' + telHref(GARAGE.phone) + '">' + icon('phone') + 'Appeler le <span class="num">' + esc(GARAGE.phone) + '</span></a>') +
        '</div>' +
        hazard() +
      '</section>' +
      '<section class="p-section p-steps-x" aria-labelledby="p-steps-title"><div class="p-wrap">' +
        '<div class="p-section-head"><div>' + eyebrowLine('Acheter chez ' + esc(GARAGE.name)) + '<h2 id="p-steps-title">Votre voiture en 4 étapes</h2></div><p class="p-muted p-head-note">Pas de mauvaise surprise : chaque étape se fait avec vous, au garage ou par téléphone.</p></div>' +
        '<ol class="p-steps-grid">' + steps.map(([t, d], i) => '<li class="p-step-x' + (i === steps.length - 1 ? ' is-last' : '') + '"><span class="p-step-n num" aria-hidden="true">' + String(i + 1).padStart(2, '0') + '</span><h3>' + t + '</h3><p>' + d + '</p></li>').join('') + '</ol>' +
      '</div></section>' +
      '<section class="p-section p-infos" aria-labelledby="p-info-title"><div class="p-wrap">' +
        '<div class="p-section-head"><div>' + eyebrowLine('Infos pratiques') + '<h2 id="p-info-title">Horaires et adresse</h2></div></div>' +
        practicalInfo(3) +
      '</div></section>';
    return {
      title: 'L’atelier — ' + GARAGE.name + ', ' + city,
      description: GARAGE.name + ' à ' + city + ' : achat et vente de véhicules d’occasion, réparation, reprogrammation et dépannage.',
      html: html,
      bind: bindGarage
    };
  }

  /* =========================================================
     Page : Contact
     ========================================================= */
  const SUBJECTS = [['achat', 'Achat d’un véhicule'], ['reprise', 'Reprise de mon véhicule'], ['financement', 'Financement'], ['atelier', 'Entretien / atelier'], ['autre', 'Autre demande']];

  function pageContact() {
    const pre = contactPrefill || {};
    contactPrefill = null;
    const html = '' +
      '<div class="p-wrap p-page-head">' +
        '<p class="eyebrow">Contact</p>' +
        '<h1 id="p-h1" tabindex="-1">Parlons de votre projet</h1>' +
        '<p class="p-lead">Une question sur un véhicule, une reprise ou un financement ? Appelez-nous ou écrivez-nous : nous répondons sous 24 h ouvrées.</p>' +
      '</div>' +
      '<div class="p-wrap p-contact">' +
        '<aside class="p-contact-card" aria-label="Coordonnées">' +
          '<div class="p-contact-item"><span class="p-icon-tile">' + icon('phone') + '</span><div><p class="eyebrow">Téléphone</p><p class="p-info-big num">' + esc(GARAGE.phone) + '</p>' +
            '<a class="btn btn-primary" href="' + telHref(GARAGE.phone) + '">' + icon('phone') + 'Appeler</a></div></div>' +
          '<div class="p-contact-item"><span class="p-icon-tile">' + icon('mail') + '</span><div><p class="eyebrow">E-mail</p><p class="p-contact-mail">' + esc(GARAGE.email) + '</p></div></div>' +
          '<div class="p-contact-item"><span class="p-icon-tile">' + icon('pin') + '</span><div><p class="eyebrow">Adresse</p><address class="p-address">' + App.Brand.addressHtml() + '</address></div></div>' +
          '<div class="p-contact-item"><span class="p-icon-tile">' + icon('clock') + '</span><div class="p-grow"><p class="eyebrow">Horaires</p>' + hoursList() + '</div></div>' +
        '</aside>' +
        '<section class="p-block p-form-block" id="p-contact-form" aria-labelledby="p-cf-title">' +
          '<div class="p-form-intro"><h2 id="p-cf-title" tabindex="-1">Écrivez-nous</h2><p class="p-muted">Les champs marqués * sont obligatoires.</p></div>' +
          '<form class="p-form" id="p-cform" novalidate>' +
            '<p class="p-form-summary" role="alert" hidden></p>' +
            '<div class="p-form-grid">' +
              inputField({ id: 'c-name', name: 'name', label: 'Nom et prénom', required: true, autocomplete: 'name' }) +
              inputField({ id: 'c-phone', name: 'phone', label: 'Téléphone', type: 'tel', required: true, autocomplete: 'tel', inputmode: 'tel' }) +
              inputField({ id: 'c-email', name: 'email', label: 'E-mail', type: 'email', autocomplete: 'email', wide: true }) +
              inputField({ id: 'c-subject', name: 'subject', label: 'Objet', type: 'select', options: SUBJECTS, value: pre.subject || 'achat', wide: true, plain: true }) +
              '<div class="p-field-wide p-reveal" id="c-tradein-box" hidden>' +
                inputField({ id: 'c-tradein-desc', name: 'tradeInDesc', label: 'Votre véhicule à reprendre', required: true, hint: 'Marque, modèle, année et kilométrage.' }) +
              '</div>' +
              inputField({ id: 'c-message', name: 'message', label: 'Votre message', type: 'textarea', required: true, value: pre.message || '', rows: 5, wide: true }) +
              consentField('c') +
            '</div>' +
            '<button type="submit" class="btn btn-primary p-submit">Envoyer</button>' +
          '</form>' +
        '</section>' +
      '</div>';
    return {
      title: 'Contact — ' + GARAGE.name + ', ' + city,
      description: 'Contactez ' + GARAGE.name + ' : ' + GARAGE.phone + ', ' + App.Brand.addressText() + '. Horaires d’ouverture et formulaire de contact.',
      html: html,
      bar: { kind: 'contact' },
      bind(root) {
        const form = root.querySelector('#p-cform');
        const subject = form.elements.subject;
        const box = root.querySelector('#c-tradein-box');
        // Le champ « véhicule à reprendre » n'apparaît que pour une demande de reprise
        const sync = () => { box.hidden = subject.value !== 'reprise'; };
        subject.addEventListener('change', sync);
        sync();
        bindValidation(form, ['name', 'phone', 'email', 'tradeInDesc', 'message', 'consent'], () => {
          const E = form.elements;
          const label = (SUBJECTS.find((x) => x[0] === subject.value) || ['', 'Autre demande'])[1];
          const isTrade = subject.value === 'reprise';
          const data = {
            vehicleId: null, name: E.name.value.trim(), phone: E.phone.value.trim(), email: E.email.value.trim(),
            message: 'Objet : ' + label + '\n' + E.message.value.trim(),
            tradeIn: isTrade, tradeInDesc: isTrade ? E.tradeInDesc.value.trim() : '',
            financing: subject.value === 'financement' ? 'credit' : 'ne-sait-pas'
          };
          Store.addLead(data);
          const block = root.querySelector('#p-contact-form');
          block.innerHTML = confirmation(data.name, data.phone, '');
          block.querySelector('h2').focus({ preventScroll: true });
          block.scrollIntoView({ behavior: scrollBehavior(), block: 'start' });
        });
      }
    };
  }

  /* =========================================================
     Pages : Mentions légales, Introuvable
     ========================================================= */
  function pageLegal() {
    const todo = (t) => '<mark class="p-todo">' + t + '</mark>';
    const html = '' +
      '<div class="p-wrap p-legal">' +
        '<p class="eyebrow">Informations légales</p>' +
        '<h1 id="p-h1" tabindex="-1">Mentions légales</h1>' +
        '<p class="p-note p-note-warn">' + icon('info') + '<span>Modèle à compléter avant la mise en ligne : les passages surlignés sont à renseigner avec les informations officielles du garage.</span></p>' +
        '<h2>Éditeur du site</h2>' +
        '<p>' + esc(GARAGE.name) + ', ' + todo('forme juridique et capital social') + ', immatriculée au RCS de ' + todo('ville') + ' sous le numéro ' + todo('SIREN') + '.<br>' +
          'Siège : ' + esc(App.Brand.addressText()) + '.<br>Téléphone : <span class="num">' + esc(GARAGE.phone) + '</span> · E-mail : ' + esc(GARAGE.email) + '.<br>' +
          'Numéro de TVA intracommunautaire : ' + todo('FR00 000000000') + '.<br>Directeur de la publication : ' + todo('nom du gérant') + '.</p>' +
        '<h2>Hébergement</h2>' +
        '<p>' + todo('Nom de l’hébergeur, adresse et téléphone') + '.</p>' +
        '<h2>Données personnelles</h2>' +
        '<p>Les informations transmises par les formulaires (nom, téléphone, e-mail, message, véhicule à reprendre) servent uniquement à répondre à votre demande. Elles sont destinées à ' + esc(GARAGE.name) + ' et ne sont jamais cédées à des tiers. Elles sont conservées ' + todo('3 ans') + ' après le dernier contact.</p>' +
        '<p>Conformément au RGPD, vous pouvez accéder à vos données, les rectifier ou demander leur suppression en écrivant à ' + esc(GARAGE.email) + '. Vous pouvez aussi adresser une réclamation à la CNIL.</p>' +
        '<h2>Cookies</h2>' +
        '<p>Ce site n’utilise pas de cookie publicitaire. ' + todo('À adapter si un outil de mesure d’audience est installé') + '.</p>' +
        '<h2>Prix et annonces</h2>' +
        '<p>Les prix sont indiqués TTC, sauf pour les véhicules utilitaires (HT). Les annonces sont non contractuelles ; seul le bon de commande signé engage les parties.</p>' +
        '<h2>Conception</h2>' +
        '<p>Site réalisé par Le Bâtisseur du Web.</p>' +
      '</div>';
    return { title: 'Mentions légales — ' + GARAGE.name, description: 'Mentions légales et politique de confidentialité de ' + GARAGE.name + '.', html: html };
  }

  function pageNotFound(vehicle) {
    const html = '' +
      '<div class="p-wrap p-404">' +
        '<span class="p-empty-icon">' + icon(vehicle ? 'car' : 'search') + '</span>' +
        '<p class="eyebrow">Erreur 404</p>' +
        '<h1 id="p-h1" tabindex="-1">' + (vehicle ? 'Ce véhicule n’est plus en ligne' : 'Page introuvable') + '</h1>' +
        '<p class="p-lead">' + (vehicle ? 'L’annonce a peut-être été retirée. Notre stock évolue chaque semaine : jetez un œil aux véhicules disponibles.' : 'Le lien suivi ne mène à aucune page de ce site. Il a peut-être été mal recopié.') + '</p>' +
        '<p class="p-empty-actions"><a class="btn btn-primary" href="#showroom">Voir nos véhicules</a><a class="btn btn-ghost" href="#accueil">Retour à l’accueil</a></p>' +
      '</div>';
    return { title: (vehicle ? 'Véhicule introuvable' : 'Page introuvable') + ' — ' + GARAGE.name, description: 'Cette page n’existe pas ou plus.', html: html };
  }

  /* =========================================================
     Rendu principal
     ========================================================= */
  function teardown() {
    cleanups.forEach((fn) => { try { fn(); } catch (e) { /* rien */ } });
    cleanups = [];
    document.documentElement.classList.remove('p-lock');
  }

  function bindCommon(root) {
    // Menu mobile
    const btn = root.querySelector('.p-menu-btn');
    const menu = root.querySelector('#p-menu');
    const setMenu = (open) => {
      menu.hidden = !open;
      btn.setAttribute('aria-expanded', String(open));
      btn.setAttribute('aria-label', open ? 'Fermer le menu' : 'Ouvrir le menu');
      btn.innerHTML = icon(open ? 'x' : 'menu');
    };
    btn.addEventListener('click', () => setMenu(menu.hidden));
    menu.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
    on(document, 'keydown', (e) => { if (e.key === 'Escape' && !menu.hidden) { setMenu(false); btn.focus(); } });

    // Lien d'évitement : un bouton, car les ancres #… sont réservées au routeur
    root.querySelector('.p-skip').addEventListener('click', () => {
      const h = root.querySelector('#p-h1');
      if (h) { h.focus(); h.scrollIntoView({ block: 'start' }); }
    });

    // Demandes atelier : la page Contact s'ouvre avec l'objet et un début de message
    root.addEventListener('click', (e) => {
      const d = e.target.closest('[data-devis]');
      if (!d) return;
      contactPrefill = d.dataset.devis === 'reprog'
        ? { subject: 'atelier', message: 'Bonjour, je souhaite étudier une reprogrammation moteur.\nMarque, modèle et motorisation : \nKilométrage : ' }
        : { subject: 'atelier', message: 'Bonjour, je souhaite un devis pour mon véhicule.\nMarque et modèle : \nKilométrage : \nTravaux souhaités : ' };
    });

    // Boutons « aller à » (formulaire, similaires) : défilement + focus
    root.addEventListener('click', (e) => {
      const t = e.target.closest('[data-scroll]');
      if (!t) return;
      const target = document.getElementById(t.dataset.scroll);
      if (!target) return;
      target.scrollIntoView({ behavior: scrollBehavior(), block: 'start' });
      const f = target.querySelector('input:not([type=hidden]), select, textarea') || target.querySelector('h2');
      if (f) f.focus({ preventScroll: true });
    });
  }

  function render(route, root) {
    teardown();
    const page = route.page;
    let view;
    if (page === 'accueil') view = pageHome();
    else if (page === 'showroom') view = pageShowroom();
    else if (page === 'vehicule') view = pageVehicle(route.id);
    else if (page === 'garage') view = pageGarage();
    else if (page === 'contact') view = pageContact();
    else if (page === 'mentions') view = pageLegal();
    else view = pageNotFound(false);

    root.innerHTML = '<div class="p-site">' + header(page) + '<div class="p-page">' + view.html + '</div>' + footer() + actionBar(view.bar) + '</div>';
    setMeta(view.title, view.description, view.ld);
    bindCommon(root);
    if (view.bind) view.bind(root);

    // Changement de page : le focus va au titre (lecteurs d'écran), sans défilement
    const key = page + ':' + (route.id || '');
    if (lastKey !== null && lastKey !== key) {
      const h = root.querySelector('#p-h1');
      if (h) h.focus({ preventScroll: true });
    }
    lastKey = key;
  }

  window.PublicSite = { render };
})();
