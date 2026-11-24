/* =========================================================
   Maquette garage — ESPACE GÉRANT
   Connexion, stock, ajout d'un véhicule, modification,
   demandes clients. Expose window.GerantApp.render(route, rootEl).
   Deux vues : téléphone (route.view === 'phone', barres collantes,
   aucune position:fixed) et ordinateur (route.view === 'desktop',
   conteneur .g-desk, fonctions renderXxxDesk). La logique métier
   (validation, sauvegarde, photos, brouillon, actions) est partagée.
   ========================================================= */
(function () {
  'use strict';

  const App = window.App;
  if (!App) { return; }
  const { GARAGE, LISTS, Store, fmt, esc, Media, UI, Router, Session } = App;

  /* ---------- Constantes ---------- */
  const MONTHS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
  const EQUIPMENT_SUGGESTIONS = [
    'Climatisation automatique', 'GPS', 'Caméra de recul', 'Radars de recul', 'Régulateur de vitesse',
    'Apple CarPlay / Android Auto', 'Bluetooth', 'Jantes alliage', 'Sièges chauffants', 'Toit ouvrant',
    'Phares LED', 'Démarrage sans clé', 'Attelage', 'Vitres électriques'
  ];
  const WARRANTIES = [[0, 'Sans garantie'], [3, '3 mois'], [6, '6 mois'], [12, '12 mois'], [24, '24 mois']];
  const CRITAIRS = ['E', '1', '2', '3'];
  const MAX_PHOTOS = 12;
  const DESC_MAX = 2000;
  const OTHER = '__autre';
  const FIELD_NAMES = { make: 'marque', makeOther: 'marque', model: 'modèle', year: 'année', km: 'kilométrage', fuel: 'carburant', gearbox: 'boîte', price: 'prix' };

  /* ---------- État de l'interface (mémoire uniquement) ---------- */
  const ui = {
    stockFilter: 'tous',
    stockQuery: '',
    leadFilter: null,
    successId: null,     // véhicule tout juste publié (écran de succès)
    draft: null,         // brouillon du formulaire d'ajout quand on quitte la page
    draftRestored: false,
    priceBefore: {},     // prix avant la première baisse rapide, par véhicule
    form: null,          // formulaire en cours : { mode, id, photos, pending, selected, critairTouched, submitted }
    sheet: null,         // feuille d'actions ouverte : { triggerSel }
    navCount: 0,
    view: 'phone',       // vue affichée : 'phone' ou 'desktop'
    sort: { key: 'stock', dir: 'asc' }, // tri du tableau (ordinateur)
    selected: new Set(), // véhicules cochés dans le tableau (ordinateur)
    pop: null,           // menu de statut ouvert (ordinateur) : { id }
    leadQuery: '',       // recherche par nom dans les demandes (ordinateur)
    editCarry: null,     // saisie en cours gardée quand on change de vue sur « Modifier »
    leadCurrent: null,   // demande affichée dans le détail (ordinateur)
    leadScroll: 0,       // défilement de la liste des demandes (ordinateur)
    lastRoute: null
  };
  const isDesk = () => ui.view === 'desktop';
  let root = null;
  let boundRoot = null;

  /* ---------- Icônes : celles du noyau + quelques compléments ---------- */
  const EXTRA_ICONS = {
    lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
    left: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
    right: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    image: '<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="10" r="1.8"/><path d="m4 18 5-5 4 4 3-3 4 4"/>',
    note: '<path d="M5 4h10l4 4v12H5z"/><path d="M14 4v5h5M8 13h8M8 17h5"/>',
    external: '<path d="M14 4h6v6M20 4l-9 9M18 14v5H5V6h5"/>',
    undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/>',
    arrowDown: '<path d="M12 5v14M6 13l6 6 6-6"/>',
    sortBoth: '<path d="m8 9 4-4 4 4M8 15l4 4 4-4"/>',
    sortUp: '<path d="m8 14 4-4 4 4"/>',
    sortDown: '<path d="m8 10 4 4 4-4"/>',
    chevDown: '<path d="m7 10 5 5 5-5"/>',
    upload: '<path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 15v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4"/>',
    alert: '<path d="M12 4 2.8 19.5h18.4z"/><path d="M12 10v4.5M12 17.2v.3"/>',
    copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>'
  };
  function icon(name) {
    if (EXTRA_ICONS[name]) {
      return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + EXTRA_ICONS[name] + '</svg>';
    }
    return UI.icon(name);
  }

  /* ---------- Utilitaires ---------- */
  const qs = (sel, el) => (el || root).querySelector(sel);
  const qsa = (sel, el) => Array.from((el || root).querySelectorAll(sel));
  const digits = (s) => String(s == null ? '' : s).replace(/\D/g, '');
  const toInt = (s) => { const d = digits(s); return d ? parseInt(d, 10) : null; };
  const daysSince = (iso) => Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 864e5));
  const reduceMotion = () => !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const plural = (n, one, many) => n + ' ' + (n > 1 ? many : one);
  const norm = (s) => String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const numText = (n) => (n == null || n === '' ? '' : fmt.number(n));
  const title = (v) => esc(fmt.title(v));

  function pill(status, list) {
    return '<span class="pill pill-' + esc(status) + '">' + esc(fmt.label(list || 'statuses', status)) + '</span>';
  }
  function stockSince(v) {
    if (v.status === 'vendu' && v.soldAt) return 'Vendu le ' + esc(fmt.dateShort(v.soldAt));
    const d = daysSince(v.addedAt);
    return d === 0 ? 'Ajouté aujourd’hui' : 'En stock depuis ' + d + ' j';
  }
  function thumb(v, cls) {
    return '<span class="g-thumb' + (cls ? ' ' + cls : '') + '">' + Media.photo(v, 0) + '</span>';
  }
  function scrollToTop() {
    if (root) root.scrollTop = 0;
    window.scrollTo(0, 0);
  }
  function reveal(el) {
    if (!el) return;
    el.scrollIntoView({ block: 'center', behavior: reduceMotion() ? 'auto' : 'smooth' });
  }
  const req = () => '<span class="g-req" aria-hidden="true"> *</span><span class="visually-hidden"> (obligatoire)</span>';

  /* =========================================================
     Squelette commun : en-tête collant, contenu, barre du bas
     ========================================================= */
  function badgeParts(n) {
    return '<span class="g-badge" data-g-badge aria-hidden="true"' + (n ? '' : ' hidden') + '>' + n + '</span>';
  }
  function badgeSr(n) {
    return n ? ', ' + plural(n, 'nouvelle', 'nouvelles') : '';
  }
  function tabbar(active) {
    const n = Store.unreadCount();
    const cur = (k) => (active === k ? ' aria-current="page"' : '');
    return `<nav class="g-tabbar" aria-label="Navigation de l’espace gérant">
      <a class="g-tab" href="#gerant-stock"${cur('stock')}><span class="g-tab-ic">${icon('car')}</span><span class="g-tab-l">Stock</span></a>
      <a class="g-tab g-tab-add" href="#gerant-ajout"${cur('ajout')}><span class="g-tab-add-btn">${icon('plus')}<span>Ajouter</span></span></a>
      <a class="g-tab" href="#gerant-demandes"${cur('demandes')}><span class="g-tab-ic">${icon('inbox')}${badgeParts(n)}</span><span class="g-tab-l">Demandes<span class="visually-hidden" data-g-badge-sr>${badgeSr(n)}</span></span></a>
    </nav>`;
  }
  function menuHTML() {
    return `<div class="g-menu-wrap">
      <button type="button" class="g-iconbtn" id="g-menu-btn" aria-expanded="false" aria-controls="g-menu" aria-label="Menu">${icon('menu')}</button>
      <div class="g-menu" id="g-menu" hidden>
        <a class="g-menu-item" href="#accueil">${icon('eye')}<span>Voir mon site</span></a>
        <button type="button" class="g-menu-item g-menu-danger" id="g-logout">${icon('logout')}<span>Se déconnecter</span></button>
      </div>
    </div>`;
  }
  function topHeader(pageTitle) {
    return `<header class="g-top">
      ${App.Brand.mark('g-brand-sm')}
      <div class="g-top-text"><span class="g-top-eyebrow">${esc(GARAGE.name)}</span><h1 class="g-top-title" tabindex="-1">${pageTitle}</h1></div>
      ${menuHTML()}
    </header>`;
  }
  function subHeader(pageTitle, sub, backHash, backLabel) {
    return `<header class="g-top">
      <a class="g-iconbtn" href="#${backHash}" aria-label="${backLabel}">${icon('back')}</a>
      <div class="g-top-text"><h1 class="g-top-title" tabindex="-1">${pageTitle}</h1>${sub ? '<span class="g-top-sub">' + sub + '</span>' : ''}</div>
    </header>`;
  }
  function mount(p) {
    root.innerHTML = `<div class="g-app${p.cls ? ' ' + p.cls : ''}">
      ${p.header}
      <main class="g-main" id="g-main">${p.body}</main>
      <div class="g-bottom">${p.actionbar || ''}${tabbar(p.tab)}</div>
      <div class="g-layer" id="g-layer"></div>
    </div>`;
    bindMenu();
  }
  function emptyState(ic, heading, text, action) {
    return `<div class="g-empty">
      <span class="g-empty-ic">${icon(ic)}</span>
      <h3 class="g-empty-h">${heading}</h3>
      ${text ? '<p>' + text + '</p>' : ''}
      ${action || ''}
    </div>`;
  }

  /* Pastille du nombre de demandes nouvelles (mise à jour à chaque changement du Store) */
  function updateBadges() {
    if (!root) return;
    const n = Store.unreadCount();
    qsa('[data-g-badge]').forEach((b) => { b.textContent = n; b.hidden = !n; });
    qsa('[data-g-badge-sr]').forEach((b) => { b.textContent = badgeSr(n); });
  }

  /* Menu de l'en-tête (Voir mon site / Se déconnecter) */
  function setMenu(open) {
    const btn = root && qs('#g-menu-btn');
    const menu = root && qs('#g-menu');
    if (!btn || !menu) return;
    menu.hidden = !open;
    btn.setAttribute('aria-expanded', String(open));
    if (open) { const first = menu.querySelector('.g-menu-item'); if (first) first.focus(); }
  }
  function logout() {
    Session.logout();
    UI.toast('Déconnexion effectuée.');
    Router.go('gerant');
  }
  function bindMenu() {
    const btn = qs('#g-menu-btn');
    if (!btn) return;
    btn.addEventListener('click', () => setMenu(qs('#g-menu').hidden));
    qs('#g-logout').addEventListener('click', logout);
  }

  /* =========================================================
     Feuille d'actions (glisse du bas, intégrée au DOM)
     ========================================================= */
  /* Zones rendues inertes derrière la feuille (téléphone) ou la boîte de dialogue (ordinateur) */
  const BEHIND_SHEET = ['.g-top', '.g-main', '.g-bottom', '.g-d-side', '.g-d-head'];
  function openSheet(html, triggerSel, labelId, cls) {
    const layer = qs('#g-layer');
    if (!layer) return null;
    layer.innerHTML = `<div class="g-scrim" data-close></div>
      <div class="g-sheet${cls ? ' ' + cls : ''}" role="dialog" aria-modal="true" aria-labelledby="${labelId}" tabindex="-1">
        <div class="g-sheet-grip" aria-hidden="true"></div>${html}
      </div>`;
    BEHIND_SHEET.forEach((s) => { const e = qs(s); if (e) e.inert = true; });
    ui.sheet = { triggerSel };
    const sheet = layer.querySelector('.g-sheet');
    layer.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => closeSheet()));
    // Piège à focus simple : Tab reste dans la feuille
    sheet.addEventListener('keydown', (e) => {
      if (e.key !== 'Tab') return;
      const f = Array.from(sheet.querySelectorAll('button:not([disabled]), a[href], input, select, textarea')).filter((x) => x.offsetParent !== null);
      if (!f.length) return;
      const first = f[0];
      const last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
    sheet.focus({ preventScroll: true });
    return sheet;
  }
  function closeSheet(noFocus) {
    const layer = root && qs('#g-layer');
    if (!layer || !layer.innerHTML) { ui.sheet = null; return; }
    layer.innerHTML = '';
    BEHIND_SHEET.forEach((s) => { const e = qs(s); if (e) e.inert = false; });
    const sel = ui.sheet && ui.sheet.triggerSel;
    ui.sheet = null;
    if (!noFocus && sel) { const t = qs(sel); if (t) t.focus({ preventScroll: true }); }
  }

  /* =========================================================
     Connexion
     ========================================================= */
  /* Formulaire de connexion (identique en téléphone et sur ordinateur) */
  function loginFormHTML() {
    const domain = (GARAGE.email.split('@')[1] || 'garage.fr');
    return `<form class="g-card g-login-form" id="g-login-form" novalidate>
          <div class="field">
            <label for="g-login-email">Adresse e-mail</label>
            <input class="input" id="g-login-email" name="email" type="email" inputmode="email" autocomplete="username" value="gerant@${esc(domain)}" aria-describedby="g-login-err">
          </div>
          <div class="field">
            <label for="g-login-pw">Mot de passe</label>
            <div class="g-pw">
              <input class="input" id="g-login-pw" name="password" type="password" autocomplete="current-password" value="demo-garage" aria-describedby="g-login-err">
              <button type="button" class="g-pw-toggle" id="g-pw-toggle" aria-pressed="false" aria-label="Afficher le mot de passe">${icon('eye')}</button>
            </div>
          </div>
          <p class="error g-err" id="g-login-err" aria-live="polite"></p>
          <button type="submit" class="btn btn-primary g-btn-xl" id="g-login-submit">${icon('key')}<span>Se connecter</span></button>
          <button type="button" class="g-link" id="g-forgot">Mot de passe oublié ?</button>
        </form>`;
  }
  function bindLogin() {
    const pw = qs('#g-login-pw');
    qs('#g-pw-toggle').addEventListener('click', (e) => {
      const show = pw.type === 'password';
      pw.type = show ? 'text' : 'password';
      e.currentTarget.setAttribute('aria-pressed', String(show));
      e.currentTarget.setAttribute('aria-label', show ? 'Masquer le mot de passe' : 'Afficher le mot de passe');
    });
    qs('#g-forgot').addEventListener('click', () => UI.toast('Démo : la réinitialisation par e-mail sera active sur le vrai site.'));
    qs('#g-login-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const email = qs('#g-login-email').value.trim();
      const err = qs('#g-login-err');
      if (!email || !pw.value) {
        err.textContent = 'Indiquer l’adresse e-mail et le mot de passe.';
        (email ? pw : qs('#g-login-email')).focus();
        return;
      }
      err.textContent = '';
      const btn = qs('#g-login-submit');
      btn.disabled = true;
      btn.querySelector('span').textContent = 'Connexion…';
      setTimeout(() => {
        Session.login();
        const h = location.hash.replace(/^#/, '');
        if (h === 'gerant' || h === '') Router.go('gerant-stock'); else App.render();
      }, 350);
    });
  }
  function renderLogin() {
    root.innerHTML = `<div class="g-app g-app-login">
      <main class="g-login">
        <div class="g-login-brand">
          ${App.Brand.mark('g-brand-lg')}
          <p class="g-login-name">${esc(GARAGE.name)}</p>
          <h1 class="g-login-title g-top-title" tabindex="-1">Espace gérant</h1>
        </div>
        ${loginFormHTML()}
        <p class="g-secure">${icon('lock')}<span>Connexion sécurisée : les échanges avec le site sont chiffrés (HTTPS).</span></p>
        <p class="g-demo-note">Démonstration : identifiants déjà remplis, il suffit d’appuyer sur « Se connecter ».</p>
      </main>
    </div>`;
    bindLogin();
  }

  /* =========================================================
     Stock
     ========================================================= */
  const STOCK_FILTERS = [['tous', 'Tous'], ['disponible', 'Disponibles'], ['reserve', 'Réservés'], ['vendu', 'Vendus']];

  /* Les quatre indicateurs du stock (cliquables) */
  function statsHTML() {
    const all = Store.vehicles();
    let dispo = 0; let reserve = 0; let sold30 = 0;
    all.forEach((v) => {
      if (v.status === 'disponible') dispo++;
      else if (v.status === 'reserve') reserve++;
      else if (v.status === 'vendu' && v.soldAt && daysSince(v.soldAt) <= 30) sold30++;
    });
    const unread = Store.unreadCount();
    const stat = (filter, n, label, tone) =>
      `<button type="button" class="g-stat g-tone-${tone}" data-stat="${filter}"><span class="g-stat-n num">${n}</span><span class="g-stat-l">${label}</span></button>`;
    return `
        ${stat('disponible', dispo, 'En vente', 'ok')}
        ${stat('reserve', reserve, 'Réservés', 'warn')}
        ${stat('vendu', sold30, 'Vendus sur 30 jours', 'bad')}
        <a class="g-stat g-tone-brand${unread ? ' g-stat-hot' : ''}" href="#gerant-demandes"><span class="g-stat-n num">${unread}</span><span class="g-stat-l">${unread > 1 ? 'Demandes à traiter' : 'Demande à traiter'}</span></a>`;
  }
  function renderStock() {
    const body = `
      <section class="g-stats" aria-label="Résumé du stock">${statsHTML()}
      </section>
      <section class="g-tools" aria-label="Rechercher et filtrer">
        <div class="g-search">
          <label for="g-q" class="visually-hidden">Rechercher dans le stock</label>
          ${icon('search')}
          <input class="input g-search-input" id="g-q" type="search" placeholder="Marque, modèle, référence…" autocomplete="off" value="${esc(ui.stockQuery)}">
        </div>
        <div class="g-segtabs" role="group" aria-label="Filtrer par statut">
          ${STOCK_FILTERS.map(([k, l]) => `<button type="button" class="g-segtab" data-filter="${k}" aria-pressed="${ui.stockFilter === k}">${l}</button>`).join('')}
        </div>
      </section>
      <section class="g-listsec" aria-labelledby="g-list-h">
        <div class="g-listhead"><h2 class="g-h2" id="g-list-h">Véhicules</h2><span class="g-count" id="g-count" aria-live="polite"></span></div>
        <div id="g-vlist-wrap"></div>
      </section>`;

    mount({ header: topHeader('Mon stock'), body, tab: 'stock' });
    renderStockList();

    const q = qs('#g-q');
    q.addEventListener('input', () => { ui.stockQuery = q.value; renderStockList(); });
    qsa('[data-filter]').forEach((b) => b.addEventListener('click', () => setStockFilter(b.dataset.filter)));
    qsa('[data-stat]').forEach((b) => b.addEventListener('click', () => {
      setStockFilter(b.dataset.stat);
      reveal(qs('#g-list-h'));
    }));
  }
  function setStockFilter(k) {
    ui.stockFilter = k;
    qsa('[data-filter]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.filter === k)));
    if (isDesk()) drawStockTable(); else renderStockList();
  }
  function stockList() {
    let list = Store.vehicles().sort((a, b) => String(b.addedAt).localeCompare(String(a.addedAt)));
    if (ui.stockFilter !== 'tous') list = list.filter((v) => v.status === ui.stockFilter);
    const words = norm(ui.stockQuery).split(/\s+/).filter(Boolean);
    if (words.length) {
      list = list.filter((v) => {
        const hay = norm([v.make, v.model, v.version, v.ref, v.year, v.color, v.fuel].join(' '));
        return words.every((w) => hay.includes(w));
      });
    }
    return list;
  }
  /* Ligne d'état « sur le site » d'un véhicule */
  function siteLine(v) {
    const vis = App.siteVisibility(v);
    if (!vis.visible) return icon('eye-off') + 'Retiré du site';
    if (vis.until) return icon('eye') + 'Affiché « Vendu » jusqu’au ' + esc(fmt.dateShort(vis.until));
    return icon('eye') + 'En ligne sur le site';
  }
  /* Bouton principal d'une ligne : « Vendu » tant qu'il est en vente, puis « Retirer du site » */
  function rowMainAction(v) {
    const id = esc(v.id);
    const name = '<span class="visually-hidden"> : ' + title(v) + '</span>';
    if (v.status !== 'vendu') return `<button type="button" class="g-quick g-quick-sell" data-sold="${id}">${icon('key')}<span>Marquer vendu${name}</span></button>`;
    if (App.siteVisibility(v).visible) return `<button type="button" class="g-quick g-quick-remove" data-hide="${id}">${icon('eye-off')}<span>Retirer du site${name}</span></button>`;
    return `<button type="button" class="g-quick" data-unhide="${id}">${icon('eye')}<span>Remettre en ligne${name}</span></button>`;
  }
  function vehicleRow(v) {
    return `<li class="g-vrow${v.status === 'vendu' ? ' g-is-sold' : ''}">
      <a class="g-vrow-main" href="#gerant-modifier-${esc(v.id)}">
        ${thumb(v)}
        <span class="g-vrow-info">
          <span class="g-vrow-title">${title(v)}</span>
          <span class="g-vrow-version">${esc(v.version)}</span>
          <span class="g-vrow-price num">${esc(fmt.price(v.price))}${v.priceType === 'HT' ? ' <small>HT</small>' : ''}</span>
          <span class="g-vrow-meta num">${esc(fmt.km(v.km))} · ${esc(v.year)}</span>
          <span class="g-vrow-since">${stockSince(v)}</span>
        </span>
      </a>
      <div class="g-vrow-foot">
        <div class="g-vrow-state">${pill(v.status)}<span class="g-vrow-site">${siteLine(v)}</span></div>
        <div class="g-vrow-acts">
          ${rowMainAction(v)}
          <button type="button" class="g-quick" data-quick="${esc(v.id)}" aria-haspopup="dialog">${icon('tag')}<span>Prix · statut<span class="visually-hidden"> : ${title(v)}</span></span></button>
        </div>
      </div>
    </li>`;
  }
  function renderStockList() {
    const wrap = qs('#g-vlist-wrap');
    if (!wrap) return;
    const list = stockList();
    const total = Store.vehicles().length;
    qs('#g-count').textContent = plural(list.length, 'véhicule', 'véhicules');
    if (!total) {
      wrap.innerHTML = emptyState('car', 'Aucun véhicule en stock', 'Le premier véhicule ajouté apparaîtra ici et sur le site.',
        `<a class="btn btn-primary g-btn-lg" href="#gerant-ajout">${icon('plus')}Ajouter un véhicule</a>`);
    } else if (!list.length && ui.stockQuery.trim()) {
      wrap.innerHTML = emptyState('search', 'Aucun résultat', 'Aucun véhicule ne correspond à « ' + esc(ui.stockQuery.trim()) + ' »' + (ui.stockFilter !== 'tous' ? ' dans ce filtre' : '') + '.',
        '<button type="button" class="btn btn-ghost g-btn-lg" data-reset-search>Effacer la recherche</button>');
    } else if (!list.length) {
      const what = { disponible: 'Aucun véhicule disponible', reserve: 'Aucun véhicule réservé', vendu: 'Aucun véhicule vendu' }[ui.stockFilter] || 'Aucun véhicule';
      wrap.innerHTML = emptyState('car', what + ' pour le moment', '', '<button type="button" class="btn btn-ghost g-btn-lg" data-reset-filter>Voir tout le stock</button>');
    } else {
      wrap.innerHTML = '<ul class="g-vlist">' + list.map(vehicleRow).join('') + '</ul>';
    }
    qsa('[data-quick]', wrap).forEach((b) => b.addEventListener('click', () => openQuickSheet(b.dataset.quick)));
    // Actions directes : vendu → retirer du site → (remettre en ligne)
    const refocus = (sel) => { const t = qs(sel); if (t) t.focus({ preventScroll: true }); };
    bindRowActions(wrap, renderStock, refocus);
    const rs = qs('[data-reset-search]', wrap);
    if (rs) rs.addEventListener('click', () => { ui.stockQuery = ''; qs('#g-q').value = ''; renderStockList(); qs('#g-q').focus(); });
    const rf = qs('[data-reset-filter]', wrap);
    if (rf) rf.addEventListener('click', () => setStockFilter('tous'));
  }

  /* ---------- Actions métier partagées (téléphone et ordinateur) ---------- */
  function doSold(id) {
    const v = Store.vehicle(id); if (!v) return false;
    Store.setStatus(v.id, 'vendu');
    UI.toast(fmt.title(v) + ' vendue. Elle reste affichée « Vendu » ' + App.SOLD_VISIBLE_DAYS + ' jours, puis disparaît du site.');
    return true;
  }
  function doHide(id, hide) {
    const v = Store.vehicle(id); if (!v) return false;
    Store.setHidden(v.id, hide);
    UI.toast(fmt.title(v) + (hide ? ' retirée du site. Elle reste dans votre historique.' : ' remise sur le site.'));
    return true;
  }
  function doStatus(id, s) {
    const v = Store.vehicle(id); if (!v || v.status === s) return false;
    Store.setStatus(v.id, s);
    UI.toast('Statut : ' + fmt.label('statuses', s) + ' — ' + fmt.title(v));
    return true;
  }
  /** Change le prix (garde le prix d'origine pour l'afficher barré). Retourne false si le prix est invalide. */
  function doPrice(id, p) {
    const v = Store.vehicle(id); if (!v) return false;
    if (!p || p < 100 || p > 2000000) return false;
    if (p !== v.price) {
      if (ui.priceBefore[v.id] == null) ui.priceBefore[v.id] = v.price;
      Store.saveVehicle({ id: v.id, price: p });
      UI.toast('Prix mis à jour : ' + fmt.price(p) + (isDesk() ? ' — ' + fmt.title(v) : ''));
    }
    return true;
  }
  /* Boutons directs d'une ligne : vendu → retirer du site → (remettre en ligne) */
  function bindRowActions(wrap, redraw, refocus) {
    qsa('[data-sold]', wrap).forEach((b) => b.addEventListener('click', () => {
      const id = b.dataset.sold;
      if (doSold(id)) { redraw(); refocus('[data-hide="' + id + '"]'); }
    }));
    qsa('[data-hide]', wrap).forEach((b) => b.addEventListener('click', () => {
      const id = b.dataset.hide;
      if (doHide(id, true)) { redraw(); refocus('[data-unhide="' + id + '"]'); }
    }));
    qsa('[data-unhide]', wrap).forEach((b) => b.addEventListener('click', () => {
      const id = b.dataset.unhide;
      if (doHide(id, false)) { redraw(); refocus('[data-hide="' + id + '"]'); }
    }));
  }

  /* Feuille « Prix · statut » d'un véhicule du stock */
  function statusButtons(current, attr) {
    return LISTS.statuses.map(([k, l]) =>
      `<button type="button" class="g-stbtn" data-s="${k}" ${attr}="${k}" aria-pressed="${current === k}">${l}</button>`).join('');
  }
  function openQuickSheet(id) {
    const v = Store.vehicle(id);
    if (!v) return;
    const html = `
      <div class="g-sheet-head">
        ${thumb(v, 'g-thumb-sm')}
        <div class="g-sheet-head-t">
          <h2 class="g-sheet-title" id="g-sheet-title">${title(v)}</h2>
          <p class="g-sheet-sub">${esc(v.version)} · Réf. ${esc(v.ref)}</p>
        </div>
        <button type="button" class="g-iconbtn" data-close aria-label="Fermer">${icon('x')}</button>
      </div>
      <section class="g-sheet-sec" aria-labelledby="g-sh-st">
        <h3 class="g-sheet-h" id="g-sh-st">Statut</h3>
        <div class="g-stseg">${statusButtons(v.status, 'data-set-status')}</div>
      </section>
      <section class="g-sheet-sec">
        <h3 class="g-sheet-h"><label for="g-sh-price">Prix affiché</label></h3>
        <div class="g-affix">
          <input class="input g-input-xl num" id="g-sh-price" type="text" inputmode="numeric" autocomplete="off" value="${esc(numText(v.price))}" aria-describedby="g-sh-price-err" data-num>
          <span class="g-affix-unit" aria-hidden="true">€ ${esc(v.priceType || 'TTC')}</span>
        </div>
        <p class="error g-err" id="g-sh-price-err" aria-live="polite"></p>
        <div class="g-drops" role="group" aria-label="Baisser le montant">
          ${[200, 500, 1000].map((a) => `<button type="button" class="g-drop num" data-drop="${a}">− ${esc(fmt.price(a))}</button>`).join('')}
        </div>
        <button type="button" class="btn btn-primary g-btn-xl" id="g-sh-save">${icon('check')}Enregistrer le prix</button>
      </section>
      <section class="g-sheet-sec" aria-labelledby="g-sh-site">
        <h3 class="g-sheet-h" id="g-sh-site">Sur le site</h3>
        <p class="g-sheet-site">${siteLine(v)}</p>
        ${App.siteVisibility(v).visible
          ? `<button type="button" class="btn btn-ghost g-btn-lg btn-block" data-sheet-hide>${icon('eye-off')}Retirer du site maintenant</button>`
          : `<button type="button" class="btn btn-ghost g-btn-lg btn-block" data-sheet-unhide>${icon('eye')}Remettre en ligne</button>`}
      </section>
      <a class="btn btn-ghost g-btn-lg btn-block" href="#gerant-modifier-${esc(v.id)}">${icon('edit')}Ouvrir la fiche complète</a>`;
    const sheet = openSheet(html, '[data-quick="' + v.id + '"]', 'g-sheet-title');
    if (!sheet) return;
    bindNumInputs(sheet);

    qsa('[data-set-status]', sheet).forEach((b) => b.addEventListener('click', () => {
      doStatus(v.id, b.dataset.setStatus);
      closeSheet(true);
      renderStock();
      const t = qs('[data-quick="' + v.id + '"]');
      if (t) t.focus({ preventScroll: true });
    }));
    const siteBtn = qs('[data-sheet-hide], [data-sheet-unhide]', sheet);
    if (siteBtn) siteBtn.addEventListener('click', () => {
      doHide(v.id, siteBtn.hasAttribute('data-sheet-hide'));
      closeSheet(true);
      renderStock();
    });
    const input = qs('#g-sh-price', sheet);
    const err = qs('#g-sh-price-err', sheet);
    qsa('[data-drop]', sheet).forEach((b) => b.addEventListener('click', () => {
      const cur = toInt(input.value) || v.price;
      input.value = numText(Math.max(0, cur - Number(b.dataset.drop)));
      err.textContent = '';
      input.removeAttribute('aria-invalid');
    }));
    qs('#g-sh-save', sheet).addEventListener('click', () => {
      const p = toInt(input.value);
      if (!p || p < 100) {
        err.textContent = 'Indiquer un prix valide.';
        input.setAttribute('aria-invalid', 'true');
        input.focus();
        return;
      }
      doPrice(v.id, p);
      closeSheet(true);
      renderStock();
      const t = qs('[data-quick="' + v.id + '"]');
      if (t) t.focus({ preventScroll: true });
    });
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); qs('#g-sh-save', sheet).click(); } });
  }

  /* =========================================================
     Formulaire véhicule (ajout et modification)
     ========================================================= */
  const EMPTY_VEHICLE = {
    make: '', model: '', version: '', body: '', month: null, year: null, km: null, fuel: '', gearbox: '',
    hp: null, cv: null, color: '', doors: 5, seats: 5, critair: '', firstHand: false,
    price: null, priceType: 'TTC', warrantyMonths: 12, equipment: [], description: '', featured: false, photos: []
  };

  function radios(name, opts, selected, cls, face) {
    return '<div class="g-opts ' + (cls || '') + '">' + opts.map(([val, label], i) =>
      `<label class="g-opt"><input class="g-opt-input" type="radio" name="${name}" id="g-f-${name}-${i}" value="${esc(val)}"${String(selected) === String(val) ? ' checked' : ''}><span class="g-opt-face">${face ? face(val, label) : esc(label)}</span></label>`
    ).join('') + '</div>';
  }
  function group(name, legend, required, inner, hint) {
    const desc = (hint ? 'g-f-' + name + '-hint ' : '') + 'g-f-' + name + '-err';
    return `<fieldset class="g-fieldset" id="g-f-${name}" data-field="${name}" aria-describedby="${desc}">
      <legend class="g-legend">${legend}${required ? req() : ''}</legend>
      ${inner}
      ${hint ? '<p class="hint" id="g-f-' + name + '-hint">' + hint + '</p>' : ''}
      <p class="error g-err" id="g-f-${name}-err"></p>
    </fieldset>`;
  }
  function textField(name, label, value, o) {
    o = o || {};
    const desc = (o.hint ? 'g-f-' + name + '-hint ' : '') + 'g-f-' + name + '-err';
    const input = `<input class="input${o.cls ? ' ' + o.cls : ''}" id="g-f-${name}" name="${name}" type="text"${o.numeric ? ' inputmode="numeric" data-num' : ''} value="${esc(value == null ? '' : value)}" autocomplete="off"${o.required ? ' aria-required="true"' : ''} aria-describedby="${desc}"${o.placeholder ? ' placeholder="' + esc(o.placeholder) + '"' : ''}${o.maxlength ? ' maxlength="' + o.maxlength + '"' : ''}>`;
    return `<div class="field g-field${o.wrapCls ? ' ' + o.wrapCls : ''}" data-field="${name}"${o.hidden ? ' hidden' : ''}>
      <label for="g-f-${name}">${label}${o.required ? req() : ''}${o.srUnit ? '<span class="visually-hidden"> ' + o.srUnit + '</span>' : ''}</label>
      ${o.unit ? '<div class="g-affix">' + input + '<span class="g-affix-unit" aria-hidden="true">' + o.unit + '</span></div>' : input}
      ${o.hint ? '<p class="hint" id="g-f-' + name + '-hint">' + o.hint + '</p>' : ''}
      <p class="error g-err" id="g-f-${name}-err"></p>
    </div>`;
  }
  function selectField(name, label, options, selected, o) {
    o = o || {};
    return `<div class="field g-field" data-field="${name}">
      <label for="g-f-${name}">${label}${o.required ? req() : ''}</label>
      <select class="select" id="g-f-${name}" name="${name}"${o.required ? ' aria-required="true"' : ''} aria-describedby="g-f-${name}-err">
        ${options.map(([val, l]) => `<option value="${esc(val)}"${String(selected) === String(val) ? ' selected' : ''}>${esc(l)}</option>`).join('')}
      </select>
      <p class="error g-err" id="g-f-${name}-err"></p>
    </div>`;
  }
  function switchRow(name, label, hint, checked, ic) {
    return `<label class="g-switch-row" for="g-f-${name}">
      ${ic ? '<span class="g-switch-ic">' + icon(ic) + '</span>' : ''}
      <span class="g-switch-text"><span class="g-switch-title">${label}</span>${hint ? '<span class="hint">' + hint + '</span>' : ''}</span>
      <input type="checkbox" role="switch" class="g-switch" id="g-f-${name}" name="${name}"${checked ? ' checked' : ''}>
    </label>`;
  }
  function chip(value, i, checked) {
    return `<label class="g-chip"><input class="g-opt-input" type="checkbox" name="equipment" id="g-f-eq-${i}" value="${esc(value)}"${checked ? ' checked' : ''}><span class="g-chip-face">${icon('check')}<span>${esc(value)}</span></span></label>`;
  }
  function sectionHead(n, id, label) {
    return `<h2 class="g-sec-h" id="${id}"><span class="g-sec-num" aria-hidden="true">${n}</span>${label}</h2>`;
  }

  /* Blocs du formulaire : assemblés en une colonne (téléphone) ou en grille (ordinateur) */
  function formParts(v) {
    const year = new Date().getFullYear();
    const years = [['', 'Choisir']];
    for (let y = year; y >= 1990; y--) years.push([y, String(y)]);
    const months = [['', '—']].concat(MONTHS.map((m, i) => [i + 1, m]));
    const makeKnown = !v.make || LISTS.makes.indexOf(v.make) !== -1;
    const makeSel = v._makeChoice || (makeKnown ? v.make : OTHER);
    const makeOpts = [['', 'Choisir la marque']].concat(LISTS.makes.map((m) => [m, m]), [[OTHER, 'Autre marque…']]);
    const eqChecked = (v.equipment || []);
    const extras = eqChecked.filter((e) => EQUIPMENT_SUGGESTIONS.indexOf(e) === -1);
    const chips = EQUIPMENT_SUGGESTIONS.map((e, i) => chip(e, i, eqChecked.indexOf(e) !== -1))
      .concat(extras.map((e, i) => chip(e, EQUIPMENT_SUGGESTIONS.length + i, true))).join('');
    const desc = v.description || '';
    return {
      make: selectField('make', 'Marque', makeOpts, makeSel, { required: true }),
      makeOther: textField('makeOther', 'Nom de la marque', makeSel === OTHER ? v.make : '', { required: true, placeholder: 'ex. Mazda', hidden: makeSel !== OTHER }),
      model: textField('model', 'Modèle', v.model, { required: true, placeholder: 'ex. 208, Clio, Golf' }),
      version: textField('version', 'Version / finition', v.version, { placeholder: 'ex. 1.2 PureTech 100 Allure' }),
      body: group('body', 'Carrosserie', false, radios('body', LISTS.bodies, v.body, 'g-cols-3')),
      circ: `<fieldset class="g-fieldset" id="g-f-circ">
          <legend class="g-legend">Mise en circulation</legend>
          <div class="g-row2">
            ${selectField('month', 'Mois', months, v.month || '')}
            ${selectField('year', 'Année', years, v.year || '', { required: true })}
          </div>
        </fieldset>`,
      km: textField('km', 'Kilométrage', numText(v.km), { required: true, numeric: true, unit: 'km', srUnit: 'en kilomètres', cls: 'g-input-lg num', placeholder: 'ex. 45 000' }),
      fuel: group('fuel', 'Carburant', true, radios('fuel', LISTS.fuels.map((f) => [f, f]), v.fuel, 'g-cols-2')),
      gearbox: group('gearbox', 'Boîte de vitesses', true, radios('gearbox', LISTS.gearboxes.map((g) => [g, g]), v.gearbox, 'g-cols-2')),
      power: `<div class="g-row2">
          ${textField('hp', 'Puissance', numText(v.hp), { numeric: true, unit: 'ch', srUnit: 'en chevaux', cls: 'num', placeholder: '100' })}
          ${textField('cv', 'Puissance fiscale', numText(v.cv), { numeric: true, unit: 'CV', srUnit: 'en CV fiscaux', cls: 'num', placeholder: '5' })}
        </div>`,
      color: group('color', 'Couleur', false, radios('color', LISTS.colors.map((c) => [c[0], c[0]]), v.color, 'g-cols-4', (val) => {
        const c = LISTS.colors.find((x) => x[0] === val);
        return '<span class="g-swatch" style="background:' + esc(c ? c[1] : 'transparent') + '"></span><span class="g-swatch-l">' + esc(val) + '</span>';
      })),
      doors: group('doors', 'Portes', false, radios('doors', [[3, '3'], [4, '4'], [5, '5']], v.doors, 'g-cols-3')),
      seats: group('seats', 'Places', false, radios('seats', [[2, '2'], [3, '3'], [4, '4'], [5, '5'], [7, '7']], v.seats, 'g-cols-5')),
      critair: group('critair', 'Vignette Crit’Air', false, radios('critair', CRITAIRS.map((c) => [c, c]), v.critair, 'g-cols-4 g-critairs', (val) =>
        '<span class="critair critair-' + esc(val) + '" aria-hidden="true">' + esc(val) + '</span><span class="visually-hidden">Crit’Air ' + esc(val) + '</span>'),
        'Proposée automatiquement d’après le carburant et l’année : à vérifier sur le certificat.'),
      firstHand: switchRow('firstHand', 'Première main', 'Un seul propriétaire avant le garage.', v.firstHand, 'key'),
      price: textField('price', 'Prix de vente', numText(v.price), { required: true, numeric: true, unit: '€', srUnit: 'en euros', cls: 'g-input-xl num', placeholder: 'ex. 14 990' }),
      priceType: group('priceType', 'Le prix affiché est', false, radios('priceType', [['TTC', 'TTC (particuliers)'], ['HT', 'HT (professionnels)']], v.priceType || 'TTC', 'g-cols-2')),
      warranty: selectField('warrantyMonths', 'Garantie incluse', WARRANTIES, v.warrantyMonths == null ? 12 : v.warrantyMonths),
      chips: `<div class="g-chips" id="g-chips" role="group" aria-labelledby="g-sec-eq">${chips}</div>`,
      eqAdd: `<div class="g-addrow">
          <label for="g-f-eqnew" class="visually-hidden">Autre équipement</label>
          <input class="input" id="g-f-eqnew" type="text" placeholder="Autre équipement (ex. Hayon électrique)" autocomplete="off" maxlength="60">
          <button type="button" class="btn btn-ghost g-btn-lg" id="g-eq-add">${icon('plus')}Ajouter</button>
        </div>`,
      description: `<div class="field g-field" data-field="description">
          <label for="g-f-description">Texte de l’annonce</label>
          <textarea class="textarea" id="g-f-description" name="description" rows="5" maxlength="${DESC_MAX}" aria-describedby="g-f-description-hint g-f-description-count" placeholder="Entretien, état, points forts, garantie…">${esc(desc)}</textarea>
          <div class="g-desc-foot">
            <p class="hint" id="g-f-description-hint">Quelques phrases simples suffisent.</p>
            <p class="g-counter num" id="g-f-description-count">${fmt.number(desc.length)} / ${fmt.number(DESC_MAX)}</p>
          </div>
        </div>`,
      featured: switchRow('featured', 'Mettre en avant sur l’accueil', 'Le véhicule apparaît dans la sélection de la page d’accueil.', v.featured, 'star')
    };
  }

  function formHTML(v, mode) {
    const P = formParts(v);
    const n0 = 1;
    if (isDesk()) return formHTMLDesk(P, mode);

    return `<form class="g-form" id="g-form" data-mode="${mode}" novalidate>
      <p class="g-form-intro">Les champs marqués <span class="g-req" aria-hidden="true">*</span> sont obligatoires.</p>

      <section class="g-sec" aria-labelledby="g-sec-photos">
        ${sectionHead(n0, 'g-sec-photos', 'Photos')}
        <input type="file" id="g-f-photos" class="g-file" accept="image/*" multiple aria-describedby="g-photos-hint">
        <label for="g-f-photos" class="g-photo-btn" id="g-photo-btn">
          ${icon('camera')}
          <span class="g-photo-btn-t">Prendre ou choisir des photos</span>
          <span class="g-photo-btn-s">Appareil photo ou galerie</span>
        </label>
        <p class="g-photo-status" id="g-photo-status" role="status" aria-live="polite"></p>
        <div id="g-photos"></div>
        <p class="hint" id="g-photos-hint">Recommandé mais pas obligatoire : sans photo, une illustration du modèle est affichée. Les photos sont allégées automatiquement (${MAX_PHOTOS} maximum).</p>
      </section>

      <section class="g-sec" aria-labelledby="g-sec-veh">
        ${sectionHead(n0 + 1, 'g-sec-veh', 'Le véhicule')}
        ${P.make}
        ${P.makeOther}
        ${P.model}
        ${P.version}
        ${P.body}
        ${P.circ}
        ${P.km}
        ${P.fuel}
        ${P.gearbox}
        ${P.power}
        ${P.color}
        ${P.doors}
        ${P.seats}
        ${P.critair}
        ${P.firstHand}
      </section>

      <section class="g-sec" aria-labelledby="g-sec-price">
        ${sectionHead(n0 + 2, 'g-sec-price', 'Prix')}
        ${P.price}
        ${P.priceType}
        ${P.warranty}
      </section>

      <section class="g-sec" aria-labelledby="g-sec-eq">
        ${sectionHead(n0 + 3, 'g-sec-eq', 'Équipements')}
        <p class="hint">Toucher pour cocher les équipements présents.</p>
        ${P.chips}
        ${P.eqAdd}
      </section>

      <section class="g-sec" aria-labelledby="g-sec-desc">
        ${sectionHead(n0 + 4, 'g-sec-desc', 'Description')}
        ${P.description}
      </section>

      <section class="g-sec" aria-labelledby="g-sec-feat">
        ${sectionHead(n0 + 5, 'g-sec-feat', 'Visibilité')}
        ${P.featured}
      </section>
    </form>`;
  }

  function actionbar(label) {
    return `<div class="g-actionbar">
      <p class="g-actionbar-msg" id="g-form-msg" role="status" aria-live="polite"></p>
      <button type="submit" form="g-form" class="btn btn-primary g-btn-xl" id="g-submit">${icon('check')}<span>${label}</span></button>
    </div>`;
  }

  /* Champs numériques : chiffres seulement, mise en forme « 38 500 » en sortie de champ */
  function bindNumInputs(scope) {
    qsa('[data-num]', scope).forEach((el) => {
      el.addEventListener('input', () => {
        const clean = el.value.replace(/[^\d\s  ]/g, '');
        if (clean !== el.value) el.value = clean;
      });
      el.addEventListener('blur', () => { const n = toInt(el.value); el.value = n == null ? '' : numText(n); });
    });
  }

  /* Lecture du formulaire */
  function readForm() {
    const f = qs('#g-form');
    if (!f || !ui.form) return null;
    const E = f.elements;
    const val = (n) => (E[n] && typeof E[n].value === 'string' ? E[n].value.trim() : '');
    const makeChoice = val('make');
    return {
      _makeChoice: makeChoice,
      make: makeChoice === OTHER ? val('makeOther') : makeChoice,
      model: val('model'),
      version: val('version'),
      body: val('body'),
      month: toInt(val('month')),
      year: toInt(val('year')),
      km: toInt(val('km')),
      fuel: val('fuel'),
      gearbox: val('gearbox'),
      hp: toInt(val('hp')),
      cv: toInt(val('cv')),
      color: val('color'),
      doors: toInt(val('doors')),
      seats: toInt(val('seats')),
      critair: val('critair'),
      firstHand: !!(E.firstHand && E.firstHand.checked),
      price: toInt(val('price')),
      priceType: val('priceType') || 'TTC',
      warrantyMonths: toInt(val('warrantyMonths')) || 0,
      equipment: qsa('input[name="equipment"]:checked', f).map((i) => i.value),
      description: E.description ? E.description.value.trim() : '',
      featured: !!(E.featured && E.featured.checked),
      photos: ui.form.photos
    };
  }
  function validate(d) {
    const errs = [];
    if (!d._makeChoice) errs.push(['make', 'Choisir la marque dans la liste.']);
    else if (d._makeChoice === OTHER && !d.make) errs.push(['makeOther', 'Écrire le nom de la marque.']);
    if (!d.model) errs.push(['model', 'Indiquer le modèle (ex. 208, Clio, Golf).']);
    if (!d.year) errs.push(['year', 'Choisir l’année de mise en circulation.']);
    if (d.km == null) errs.push(['km', 'Indiquer le kilométrage (0 pour un véhicule neuf).']);
    else if (d.km > 999999) errs.push(['km', 'Kilométrage trop élevé : vérifier le chiffre.']);
    if (!d.fuel) errs.push(['fuel', 'Choisir le carburant.']);
    if (!d.gearbox) errs.push(['gearbox', 'Choisir le type de boîte.']);
    if (!d.price) errs.push(['price', 'Indiquer le prix de vente.']);
    else if (d.price < 100 || d.price > 2000000) errs.push(['price', 'Prix à vérifier : ' + fmt.price(d.price) + ' semble incorrect.']);
    return errs;
  }
  function setFieldError(key, msg) {
    const err = qs('#g-f-' + key + '-err');
    if (err) err.textContent = msg || '';
    const el = qs('#g-f-' + key);
    if (!el) return;
    if (el.tagName === 'FIELDSET') {
      el.classList.toggle('g-invalid', !!msg);
      qsa('input', el).forEach((i) => { if (msg) i.setAttribute('aria-invalid', 'true'); else i.removeAttribute('aria-invalid'); });
    } else if (msg) el.setAttribute('aria-invalid', 'true');
    else el.removeAttribute('aria-invalid');
  }
  function updateFormMsg() {
    const msg = qs('#g-form-msg');
    if (!msg || !ui.form || !ui.form.submitted) return;
    const left = qsa('.g-form .g-err').filter((e) => e.textContent).length;
    msg.textContent = left ? (left > 1 ? 'Encore ' + left + ' informations à compléter.' : 'Encore 1 information à compléter.') : '';
  }
  function showErrors(errs) {
    Object.keys(FIELD_NAMES).forEach((k) => setFieldError(k, ''));
    errs.forEach(([k, m]) => setFieldError(k, m));
    const msg = qs('#g-form-msg');
    if (msg) {
      msg.textContent = errs.length === 1
        ? 'Il manque 1 information : ' + FIELD_NAMES[errs[0][0]] + '.'
        : 'Il manque ' + errs.length + ' informations (en rouge).';
    }
    const first = qs('#g-f-' + errs[0][0]);
    const target = first && first.tagName === 'FIELDSET' ? first.querySelector('input') : first;
    reveal(first);
    if (target) target.focus({ preventScroll: true });
  }

  /* Crit'Air proposée d'après le carburant et l'année (normes Euro simplifiées) */
  function suggestCritair(fuel, year) {
    if (fuel === 'Électrique') return 'E';
    if (!fuel || !year) return '';
    if (fuel === 'Diesel') return year >= 2011 ? '2' : (year >= 2006 ? '3' : '');
    return year >= 2011 ? '1' : (year >= 2006 ? '2' : '3');
  }

  /* --- Photos --- */
  function renderPhotos() {
    const F = ui.form;
    if (F && isDesk()) { renderPhotosDesk(); return; }
    const box = qs('#g-photos');
    const btn = qs('#g-photo-btn');
    if (!F || !box || !btn) return;
    const has = F.photos.length + F.pending > 0;
    btn.classList.toggle('g-compact', has);
    qs('.g-photo-btn-t', btn).textContent = has ? 'Ajouter d’autres photos' : 'Prendre ou choisir des photos';
    if (!has) { box.innerHTML = ''; return; }
    if (F.selected >= F.photos.length) F.selected = -1;
    const tiles = F.photos.map((src, i) =>
      `<button type="button" class="g-ph" data-ph="${i}" aria-pressed="${F.selected === i}" aria-label="Photo ${i + 1}${i === 0 ? ', principale' : ''} : toucher pour la sélectionner">
        <img src="${esc(src)}" alt="">
        ${i === 0 ? '<span class="g-ph-badge" aria-hidden="true">' + icon('star') + 'Principale</span>' : '<span class="g-ph-num" aria-hidden="true">' + (i + 1) + '</span>'}
      </button>`).join('') +
      Array.from({ length: F.pending }, () => '<div class="g-ph g-ph-loading" aria-hidden="true"><span class="g-spinner"></span></div>').join('');
    const s = F.selected;
    const tools = s >= 0
      ? `<div class="g-phtools" role="group" aria-labelledby="g-phtools-t">
          <p class="g-phtools-t" id="g-phtools-t">Photo ${s + 1} sur ${F.photos.length}${s === 0 ? ' · principale' : ''}</p>
          <button type="button" class="btn btn-ghost g-btn-lg" data-act="left"${s === 0 ? ' disabled' : ''}>${icon('left')}Avant</button>
          <button type="button" class="btn btn-ghost g-btn-lg" data-act="right"${s === F.photos.length - 1 ? ' disabled' : ''}>Après${icon('right')}</button>
          <button type="button" class="btn btn-ghost g-btn-lg" data-act="main"${s === 0 ? ' disabled' : ''}>${icon('star')}Principale</button>
          <button type="button" class="btn btn-danger g-btn-lg" data-act="del">${icon('trash')}Supprimer</button>
        </div>`
      : (F.photos.length ? '<p class="hint g-ph-help">Toucher une photo pour la déplacer, la choisir comme principale ou la supprimer.</p>' : '');
    box.innerHTML = '<div class="g-phgrid">' + tiles + '</div>' + tools;

    qsa('[data-ph]', box).forEach((b) => b.addEventListener('click', () => {
      const i = Number(b.dataset.ph);
      F.selected = F.selected === i ? -1 : i;
      renderPhotos();
      const again = qs('[data-ph="' + i + '"]', box);
      if (again) again.focus({ preventScroll: true });
    }));
    qsa('[data-act]', box).forEach((b) => b.addEventListener('click', () => photoAction(b.dataset.act)));
  }
  /** Déplace, choisit comme principale ou supprime la photo i (par défaut : la photo sélectionnée). Retourne le nouvel index. */
  function movePhoto(act, i) {
    const F = ui.form;
    const p = F.photos;
    if (i < 0 || i >= p.length) return -1;
    if (act === 'left' && i > 0) { [p[i - 1], p[i]] = [p[i], p[i - 1]]; return i - 1; }
    if (act === 'right' && i < p.length - 1) { [p[i + 1], p[i]] = [p[i], p[i + 1]]; return i + 1; }
    if (act === 'main' && i > 0) { p.unshift(p.splice(i, 1)[0]); UI.toast('Photo principale choisie.'); return 0; }
    if (act === 'del') { p.splice(i, 1); UI.toast('Photo retirée.'); return -1; }
    return i;
  }
  function photoAction(act) {
    const F = ui.form;
    const i = F.selected;
    if (i < 0 || i >= F.photos.length) return;
    F.selected = movePhoto(act, i);
    renderPhotos();
    const keep = qs('[data-act="' + act + '"]:not([disabled])') || qs('[data-ph="' + F.selected + '"]') || qs('#g-f-photos');
    if (keep) keep.focus({ preventScroll: true });
  }
  async function addPhotos(fileList) {
    const F = ui.form;
    if (!F) return;
    const status = qs('#g-photo-status');
    const all = Array.from(fileList || []);
    let files = all.filter((f) => /^image\//.test(f.type));
    let failed = all.length - files.length;
    const room = MAX_PHOTOS - F.photos.length - F.pending;
    if (room <= 0) { UI.toast(MAX_PHOTOS + ' photos maximum par annonce.'); return; }
    if (files.length > room) { files = files.slice(0, room); UI.toast('Limite de ' + MAX_PHOTOS + ' photos : seules ' + room + ' ont été gardées.'); }
    if (!files.length) { if (failed) UI.toast('Ce fichier n’est pas une image.'); return; }
    F.pending += files.length;
    if (status) status.textContent = 'Préparation de ' + plural(files.length, 'photo', 'photos') + '…';
    renderPhotos();
    let ok = 0;
    for (const file of files) {
      try {
        // Photos allégées : 1 280 px de large maximum, JPEG compressé
        const url = await Media.resize(file, 1280, 0.72);
        F.photos.push(url);
        ok++;
      } catch (e) { failed++; }
      F.pending--;
      if (ui.form === F) renderPhotos();
    }
    if (ui.form !== F) return;
    const st = qs('#g-photo-status');
    if (st) st.textContent = ok ? plural(ok, 'photo ajoutée', 'photos ajoutées') + ' et allégée' + (ok > 1 ? 's' : '') + ' automatiquement.' : '';
    if (failed) UI.toast(plural(failed, 'fichier n’a pas pu être lu', 'fichiers n’ont pas pu être lus') + '.');
  }

  /* --- Liaison des comportements du formulaire --- */
  function bindForm(onSubmit) {
    const f = qs('#g-form');
    const F = ui.form;
    bindNumInputs(f);

    // Marque « Autre »
    const make = qs('#g-f-make');
    make.addEventListener('change', () => {
      const other = make.value === OTHER;
      qs('[data-field="makeOther"]').hidden = !other;
      setFieldError('makeOther', '');
      if (other) qs('#g-f-makeOther').focus();
    });

    // Crit'Air proposée automatiquement tant qu'elle n'a pas été choisie à la main
    const applyCritair = () => {
      if (F.critairTouched) return;
      const s = suggestCritair(f.elements.fuel.value, toInt(f.elements.year.value));
      qsa('input[name="critair"]', f).forEach((r) => { r.checked = r.value === s; });
    };
    qsa('input[name="fuel"]', f).forEach((r) => r.addEventListener('change', applyCritair));
    qs('#g-f-year').addEventListener('change', applyCritair);
    qsa('input[name="critair"]', f).forEach((r) => r.addEventListener('change', () => { F.critairTouched = true; }));

    // Photos
    const file = qs('#g-f-photos');
    file.addEventListener('change', () => { const list = Array.from(file.files || []); file.value = ''; addPhotos(list); });
    renderPhotos();

    // Équipement libre
    const eqInput = qs('#g-f-eqnew');
    const addEq = () => {
      const val = eqInput.value.trim().replace(/\s+/g, ' ');
      if (!val) { eqInput.focus(); return; }
      const existing = qsa('input[name="equipment"]', f).find((i) => norm(i.value) === norm(val));
      if (existing) {
        existing.checked = true;
        UI.toast('« ' + existing.value + ' » est déjà dans la liste : coché.');
      } else {
        const idx = qsa('input[name="equipment"]', f).length;
        qs('#g-chips').insertAdjacentHTML('beforeend', chip(val, idx + 100, true));
        UI.toast('Équipement ajouté : ' + val);
      }
      eqInput.value = '';
      eqInput.focus();
    };
    qs('#g-eq-add').addEventListener('click', addEq);
    eqInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); addEq(); } });

    // Compteur de caractères
    const ta = qs('#g-f-description');
    const count = qs('#g-f-description-count');
    ta.addEventListener('input', () => {
      count.textContent = fmt.number(ta.value.length) + ' / ' + fmt.number(DESC_MAX);
      count.classList.toggle('g-counter-warn', ta.value.length > DESC_MAX * 0.9);
    });

    // Effacement des erreurs au fil de la saisie
    const clear = (e) => {
      const name = e.target.name;
      if (name && FIELD_NAMES[name]) {
        const holder = qs('#g-f-' + name + '-err');
        if (holder && holder.textContent) { setFieldError(name, ''); updateFormMsg(); }
      }
    };
    f.addEventListener('input', clear);
    f.addEventListener('change', clear);

    f.addEventListener('submit', (e) => {
      e.preventDefault();
      F.submitted = true;
      if (F.pending) { qs('#g-form-msg').textContent = 'Patienter : les photos sont en cours de préparation.'; return; }
      const d = readForm();
      const errs = validate(d);
      if (errs.length) { showErrors(errs); return; }
      qs('#g-form-msg').textContent = '';
      const c = LISTS.colors.find((x) => x[0] === d.color);
      const data = {
        make: d.make, model: d.model, version: d.version, body: d.body || 'berline',
        month: d.month || 1, year: d.year, km: d.km, fuel: d.fuel, gearbox: d.gearbox,
        hp: d.hp, cv: d.cv, color: d.color, colorHex: c ? c[1] : '#7d838b',
        doors: d.doors || 5, seats: d.seats || 5, critair: d.critair, firstHand: d.firstHand,
        price: d.price, priceType: d.priceType, warrantyMonths: d.warrantyMonths,
        equipment: d.equipment, description: d.description, featured: d.featured, photos: d.photos.slice()
      };
      onSubmit(data);
    });
  }

  /* =========================================================
     Ajout d'un véhicule
     ========================================================= */
  function isMeaningful(d) {
    return !!(d && (d.make || d.model || d.version || d.km != null || d.price || d.year || d.fuel || d.gearbox || d.description || (d.photos && d.photos.length)));
  }
  /* Garde le formulaire d'ajout en brouillon si on quitte la page */
  function snapshotDraft() {
    if (!root || !ui.form || ui.form.mode !== 'ajout' || !qs('#g-form[data-mode="ajout"]')) return;
    const d = readForm();
    ui.draft = isMeaningful(d) ? Object.assign(d, { _critairTouched: ui.form.critairTouched }) : null;
  }

  function renderAjout() {
    if (ui.successId) { renderSuccess(); return; }
    const draft = ui.draft;
    ui.draftRestored = !!draft;
    const v = Object.assign({}, EMPTY_VEHICLE, draft || {});
    ui.form = { mode: 'ajout', id: null, photos: (draft && draft.photos) ? draft.photos : [], pending: 0, selected: -1, critairTouched: !!(draft && draft._critairTouched), submitted: false };
    const banner = draft
      ? `<div class="g-banner" role="status">${icon('note')}<p>Brouillon repris là où il était resté.</p><button type="button" class="g-link" id="g-clear-draft">Tout effacer</button></div>`
      : '';
    if (isDesk()) {
      mountDesk({
        nav: 'ajout', back: ['gerant-stock', 'Retour au stock'], actions: '',
        title: 'Ajouter un véhicule', sub: 'Photos, infos, prix : l’annonce est en ligne dès la publication.',
        body: deskFormLayout(banner + formHTML(v, 'ajout'), deskAsideAjout())
      });
    } else {
      mount({
        header: subHeader('Ajouter un véhicule', 'Photos, infos, prix : c’est tout.', 'gerant-stock', 'Retour au stock'),
        body: banner + formHTML(v, 'ajout'),
        actionbar: actionbar('Publier l’annonce'),
        tab: 'ajout',
        cls: 'g-has-actionbar'
      });
    }
    const clr = qs('#g-clear-draft');
    if (clr) clr.addEventListener('click', () => { ui.draft = null; ui.form = null; renderAjout(); scrollToTop(); qs('.g-top-title').focus(); UI.toast('Formulaire vidé.'); });
    bindForm((data) => {
      const saved = Store.saveVehicle(data);
      ui.draft = null;
      ui.form = null;
      ui.successId = saved.id;
      renderSuccess();
      scrollToTop();
      const h = qs('#g-success-title');
      if (h) h.focus({ preventScroll: true });
    });
    if (isDesk()) bindDeskForm();
  }

  function renderSuccess() {
    const v = Store.vehicle(ui.successId);
    if (!v) { ui.successId = null; renderAjout(); return; }
    if (isDesk()) { renderSuccessDesk(v); return; }
    const body = `<div class="g-success">
      <span class="g-success-ic">${icon('check')}</span>
      <h2 class="g-success-title" id="g-success-title" tabindex="-1">Annonce publiée</h2>
      <p class="g-success-text">${title(v)} est en ligne sur le site.</p>
      <div class="g-card g-success-card">
        ${thumb(v, 'g-thumb-wide')}
        <div class="g-success-info">
          <p class="g-success-name">${title(v)}</p>
          <p class="g-muted">${esc(v.version)}</p>
          <p class="g-success-price num">${esc(fmt.price(v.price))} <small>${esc(v.priceType)}</small></p>
          <p class="g-muted num">${esc(fmt.km(v.km))} · ${esc(v.year)} · ${esc(v.fuel)}</p>
        </div>
        <div class="g-success-meta">${pill(v.status)}<span class="g-ref">Réf. ${esc(v.ref)}</span></div>
      </div>
      <a class="btn btn-primary g-btn-xl" href="#vehicule-${esc(v.id)}">${icon('eye')}Voir l’annonce sur le site</a>
      <a class="btn btn-ghost g-btn-xl" href="#gerant-ajout" data-add-another>${icon('plus')}Ajouter un autre véhicule</a>
      <a class="g-link" href="#gerant-stock">Retour au stock</a>
    </div>`;
    mount({ header: subHeader('Ajouter un véhicule', 'Terminé', 'gerant-stock', 'Retour au stock'), body, tab: 'ajout' });
  }

  /* =========================================================
     Modification d'un véhicule
     ========================================================= */
  const STATUS_HINTS = {
    disponible: 'Visible sur le site, à vendre.',
    reserve: 'Reste visible sur le site avec la mention « Réservé ».',
    vendu: 'Affiché « Vendu » sur le site pendant 7 jours, puis retiré.'
  };
  function priceCardInner(v) {
    const before = ui.priceBefore[v.id];
    const lowered = before != null && before !== v.price;
    return `<div class="g-pricebox">
        <span class="g-price-now num">${esc(fmt.price(v.price))}</span>
        ${lowered ? '<s class="g-price-old num"><span class="visually-hidden">Ancien prix : </span>' + esc(fmt.price(before)) + '</s>' : ''}
        <span class="g-price-type">${esc(v.priceType || 'TTC')}</span>
      </div>
      <div class="g-drops" role="group" aria-label="Baisse rapide du prix">
        ${[200, 500, 1000].map((a) => `<button type="button" class="g-drop num" data-drop="${a}"${v.price - a < 100 ? ' disabled' : ''}>− ${esc(fmt.price(a))}</button>`).join('')}
      </div>
      ${lowered ? '<button type="button" class="g-link g-undo" id="g-price-undo">' + icon('undo') + 'Revenir à ' + esc(fmt.price(before)) + '</button>' : ''}
      <p class="hint">Chaque baisse est enregistrée tout de suite et visible sur le site.</p>`;
  }
  function renderEdit(id) {
    const v = Store.vehicle(id);
    if (!v) {
      ui.form = null;
      const empty = emptyState('car', 'Ce véhicule n’est plus dans le stock', 'Il a peut-être été supprimé.', `<a class="btn btn-primary g-btn-lg" href="#gerant-stock">Retour au stock</a>`);
      if (isDesk()) mountDesk({ nav: 'stock', back: ['gerant-stock', 'Retour au stock'], title: 'Véhicule introuvable', body: empty });
      else mount({ header: subHeader('Véhicule introuvable', '', 'gerant-stock', 'Retour au stock'), body: empty, tab: 'stock' });
      return;
    }
    // Saisie en cours reprise quand on bascule entre téléphone et ordinateur
    const carry = ui.editCarry && ui.editCarry.id === id ? ui.editCarry : null;
    ui.editCarry = null;
    const fv = carry ? Object.assign({}, v, carry.data) : v;
    ui.form = { mode: 'modifier', id: v.id, photos: (fv.photos || []).slice(), pending: 0, selected: -1, critairTouched: carry ? carry.critairTouched : !!v.critair, submitted: false };
    if (isDesk()) {
      mountDesk({
        nav: 'stock', back: ['gerant-stock', 'Retour au stock'], actions: '',
        title: 'Modifier l’annonce', sub: 'Réf. ' + esc(v.ref) + ' · ' + title(v) + ' · ' + stockSince(v),
        body: deskFormLayout(formHTML(fv, 'modifier'), deskAsideEdit(v))
      });
    } else {
      const body = `
        <section class="g-card g-hero" aria-label="Annonce">
          ${thumb(v, 'g-thumb-hero')}
          <div class="g-hero-info">
            <p class="g-hero-title">${title(v)}</p>
            <p class="g-muted">${esc(v.version)}</p>
            <p class="g-hero-meta" id="g-hero-meta">${pill(v.status)}<span class="g-muted">${stockSince(v)}</span></p>
          </div>
          <a class="btn btn-ghost g-btn-lg g-hero-link" href="#vehicule-${esc(v.id)}">${icon('eye')}Voir l’annonce</a>
        </section>

        <section class="g-card" aria-labelledby="g-st-h">
          <h2 class="g-card-h" id="g-st-h">Statut de l’annonce</h2>
          <div class="g-stseg">${statusButtons(v.status, 'data-edit-status')}</div>
          <p class="hint" id="g-st-hint" aria-live="polite">${STATUS_HINTS[v.status] || ''}</p>
        </section>

        <section class="g-card" aria-labelledby="g-pr-h">
          <h2 class="g-card-h" id="g-pr-h">Prix affiché</h2>
          <div id="g-price-card">${priceCardInner(v)}</div>
        </section>

        <h2 class="g-h2 g-form-title">Fiche complète</h2>
        ${formHTML(fv, 'modifier')}

        <section class="g-card g-danger" aria-labelledby="g-del-h">
          <h2 class="g-card-h" id="g-del-h">Supprimer l’annonce</h2>
          <p class="g-muted">L’annonce disparaît du site et du stock. Pour une voiture vendue, le statut « Vendu » est préférable.</p>
          <div id="g-del-zone"></div>
        </section>`;
      mount({
        header: subHeader('Modifier l’annonce', 'Réf. ' + esc(v.ref) + ' · ' + title(v), 'gerant-stock', 'Retour au stock'),
        body,
        actionbar: actionbar('Enregistrer les modifications'),
        tab: 'stock',
        cls: 'g-has-actionbar'
      });
    }

    // Statut : appliqué immédiatement
    qsa('[data-edit-status]').forEach((b) => b.addEventListener('click', () => {
      const s = b.dataset.editStatus;
      const cur = Store.vehicle(id);
      if (!cur || cur.status === s) return;
      Store.setStatus(id, s);
      qsa('[data-edit-status]').forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.editStatus === s)));
      const fresh = Store.vehicle(id);
      const meta = qs('#g-hero-meta');
      if (meta) meta.innerHTML = pill(s) + '<span class="g-muted">' + stockSince(fresh) + '</span>';
      qs('#g-st-hint').textContent = STATUS_HINTS[s] || '';
      UI.toast('Statut : ' + fmt.label('statuses', s));
      if (isDesk()) refreshEditAside(id);
    }));

    // Baisse rapide du prix
    const bindPrice = () => {
      qsa('#g-price-card [data-drop]').forEach((b) => b.addEventListener('click', () => {
        const cur = Store.vehicle(id);
        const p = cur.price - Number(b.dataset.drop);
        if (p < 100) return;
        if (ui.priceBefore[id] == null) ui.priceBefore[id] = cur.price;
        applyPrice(p, '[data-drop="' + b.dataset.drop + '"]');
      }));
      const undo = qs('#g-price-undo');
      if (undo) undo.addEventListener('click', () => applyPrice(ui.priceBefore[id], '#g-pr-h'));
    };
    const applyPrice = (p, focusSel) => {
      Store.saveVehicle({ id, price: p });
      const fresh = Store.vehicle(id);
      qs('#g-price-card').innerHTML = priceCardInner(fresh);
      const input = qs('#g-f-price');
      if (input) input.value = numText(p);
      bindPrice();
      const t = qs(focusSel + ':not([disabled])') || qs('#g-pr-h');
      if (t) { if (t.id === 'g-pr-h') t.setAttribute('tabindex', '-1'); t.focus({ preventScroll: true }); }
      UI.toast('Prix mis à jour : ' + fmt.price(p));
    };
    bindPrice();

    // Suppression avec confirmation intégrée
    const zone = qs('#g-del-zone');
    const askDelete = () => {
      zone.innerHTML = `<button type="button" class="btn btn-danger g-btn-lg btn-block" id="g-del">${icon('trash')}Supprimer l’annonce</button>`;
      qs('#g-del').addEventListener('click', confirmDelete);
    };
    const confirmDelete = () => {
      zone.innerHTML = `<div class="g-confirm" role="alertdialog" aria-labelledby="g-del-q">
          <p class="g-confirm-q" id="g-del-q">Supprimer définitivement ${title(v)} ? Cette action ne peut pas être annulée.</p>
          <button type="button" class="btn g-btn-danger-solid g-btn-lg btn-block" id="g-del-yes">${icon('trash')}Oui, supprimer définitivement</button>
          <button type="button" class="btn btn-ghost g-btn-lg btn-block" id="g-del-no">Annuler</button>
        </div>`;
      qs('#g-del-no').addEventListener('click', () => { askDelete(); qs('#g-del').focus(); });
      qs('#g-del-yes').addEventListener('click', () => {
        Store.deleteVehicle(id);
        delete ui.priceBefore[id];
        UI.toast('Annonce supprimée : ' + fmt.title(v));
        Router.go('gerant-stock');
      });
      qs('#g-del-no').focus({ preventScroll: true });
      reveal(qs('.g-confirm'));
    };
    askDelete();

    bindForm((data) => {
      data.id = id;
      Store.saveVehicle(data);
      ui.form = null;
      UI.toast('Modifications enregistrées : ' + data.make + ' ' + data.model);
      Router.go('gerant-stock');
    });
    if (isDesk()) bindDeskForm();
  }

  /* =========================================================
     Demandes clients
     ========================================================= */
  const LEAD_FILTERS = [
    ['nouvelles', 'Nouvelles', (l) => l.status === 'nouvelle'],
    ['en-cours', 'En cours', (l) => l.status === 'en-cours'],
    ['conclues', 'Conclues', (l) => l.status === 'conclue' || l.status === 'perdue'],
    ['toutes', 'Toutes', () => true]
  ];
  function leadVehicleLine(l) {
    const v = l.vehicleId ? Store.vehicle(l.vehicleId) : null;
    if (v) return `<span class="g-lrow-veh"><span class="g-thumb g-mini">${Media.photo(v, 0)}</span><span class="g-lrow-vname">${title(v)}</span></span>`;
    return `<span class="g-lrow-veh"><span class="g-mini g-mini-ic">${icon('inbox')}</span><span class="g-lrow-vname">Demande générale</span></span>`;
  }
  /* Ligne de la liste des demandes (current : demande affichée dans le détail, ordinateur) */
  function leadRowHTML(l, current) {
    const isNew = l.status === 'nouvelle';
    return `<li class="g-lrow${isNew ? ' g-is-new' : ''}${current ? ' g-is-current' : ''}">
          <a href="#gerant-demande-${esc(l.id)}"${current ? ' aria-current="true"' : ''}>
            <span class="g-dot" aria-hidden="true"></span>
            <span class="g-lrow-body">
              <span class="g-lrow-top"><span class="g-lrow-name">${isNew ? '<span class="visually-hidden">Nouvelle : </span>' : ''}${esc(l.name)}</span><span class="g-lrow-time">${esc(fmt.relative(l.createdAt))}</span></span>
              ${leadVehicleLine(l)}
              <span class="g-lrow-msg">${esc(l.message)}</span>
              <span class="g-lrow-foot">${pill(l.status, 'leadStatuses')}${l.notes && l.notes.length ? '<span class="g-lrow-notes">' + icon('note') + plural(l.notes.length, 'note', 'notes') + '</span>' : ''}</span>
            </span>
          </a>
        </li>`;
  }
  const LEAD_EMPTY = {
    nouvelles: ['Aucune nouvelle demande', 'Tout est traité. Les messages envoyés depuis le site arrivent ici.'],
    'en-cours': ['Aucune demande en cours', ''],
    conclues: ['Aucune demande conclue', ''],
    toutes: ['Aucune demande pour le moment', 'Les messages envoyés depuis le site arriveront ici.']
  };
  function renderLeads() {
    if (!ui.leadFilter) ui.leadFilter = Store.unreadCount() ? 'nouvelles' : 'toutes';
    const leads = Store.leads();
    const body = `
      <div class="g-segtabs" role="group" aria-label="Filtrer les demandes">
        ${LEAD_FILTERS.map(([k, l]) => `<button type="button" class="g-segtab" data-lfilter="${k}" aria-pressed="${ui.leadFilter === k}">${l}</button>`).join('')}
      </div>
      <p class="g-count g-count-block" id="g-lcount" aria-live="polite"></p>
      <div id="g-llist-wrap"></div>`;
    mount({ header: topHeader('Demandes'), body, tab: 'demandes' });

    const draw = () => {
      const f = LEAD_FILTERS.find((x) => x[0] === ui.leadFilter) || LEAD_FILTERS[3];
      const list = leads.filter(f[2]);
      const wrap = qs('#g-llist-wrap');
      qs('#g-lcount').textContent = plural(list.length, 'demande', 'demandes') + (f[0] === 'toutes' ? '' : ' · ' + f[1].toLowerCase());
      if (!list.length) {
        const msg = LEAD_EMPTY[f[0]];
        wrap.innerHTML = emptyState('inbox', msg[0], msg[1], f[0] !== 'toutes' ? '<button type="button" class="btn btn-ghost g-btn-lg" data-lall>Voir toutes les demandes</button>' : '');
        const all = qs('[data-lall]', wrap);
        if (all) all.addEventListener('click', () => setFilter('toutes'));
        return;
      }
      wrap.innerHTML = '<ul class="g-llist">' + list.map((l) => leadRowHTML(l)).join('') + '</ul>';
    };
    const setFilter = (k) => {
      ui.leadFilter = k;
      qsa('[data-lfilter]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lfilter === k)));
      draw();
    };
    qsa('[data-lfilter]').forEach((b) => b.addEventListener('click', () => setFilter(b.dataset.lfilter)));
    draw();
  }

  function notesHTML(l) {
    if (!l.notes || !l.notes.length) return '<p class="g-muted g-notes-empty">Aucune note pour l’instant.</p>';
    return '<ol class="g-notes">' + l.notes.slice().reverse().map((n) =>
      `<li><time class="g-note-time" datetime="${esc(n.at)}">${esc(fmt.dateShort(n.at))} à ${esc(fmt.time(n.at))}</time><p class="g-note-text">${esc(n.text)}</p></li>`).join('') + '</ol>';
  }
  /* Sections du détail d'une demande (desk : variante ordinateur avec boutons « Copier ») */
  function leadClientHTML(l, desk) {
    const v = l.vehicleId ? Store.vehicle(l.vehicleId) : null;
    const tel = String(l.phone || '').replace(/[^\d+]/g, '');
    const subject = 'Votre demande' + (v ? ' : ' + fmt.title(v) + ' ' + (v.version || '') : '') + ' — ' + GARAGE.name;
    const mail = 'mailto:' + String(l.email || '').trim() + '?subject=' + encodeURIComponent(subject.replace(/\s+/g, ' ').trim()) + '&body=' + encodeURIComponent('Bonjour ' + l.name + ',\n\n');
    const copy = (val, what) => (desk && val ? `<button type="button" class="g-d-copy" data-copy="${esc(val)}" data-copy-what="${what}" aria-label="Copier ${what === 'tel' ? 'le numéro' : 'l’adresse e-mail'}" title="Copier">${icon('copy')}</button>` : '');
    return `
      <section class="g-card" aria-labelledby="g-client-h">
        <div class="g-client-head">
          <span class="g-avatar" aria-hidden="true">${esc(String(l.name || '?').trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase())}</span>
          <div><h2 class="g-card-h" id="g-client-h"${desk ? ' tabindex="-1"' : ''}>${esc(l.name)}</h2><p class="g-muted">Reçue ${esc(fmt.relative(l.createdAt))} · le ${esc(fmt.dateShort(l.createdAt))} à ${esc(fmt.time(l.createdAt))}</p></div>
        </div>
        <dl class="g-kv">
          <dt>Téléphone</dt><dd class="g-select num">${esc(l.phone || '—')}${copy(l.phone, 'tel')}</dd>
          <dt>E-mail</dt><dd class="g-select">${esc(l.email || '—')}${copy(l.email, 'mail')}</dd>
        </dl>
        <div class="g-contact-btns">
          ${tel ? `<a class="btn btn-primary g-btn-xl" href="tel:${esc(tel)}">${icon('phone')}Appeler</a>` : ''}
          ${l.email ? `<a class="btn btn-ghost g-btn-xl" href="${esc(mail)}">${icon('mail')}Répondre par e-mail</a>` : ''}
        </div>
        <p class="hint">${desk ? 'Ouvre votre logiciel de téléphonie ou votre messagerie, avec l’objet déjà rempli. Les coordonnées peuvent aussi être copiées.' : 'Ouvre l’application Téléphone ou la messagerie, avec l’objet déjà rempli.'}</p>
      </section>`;
  }
  function leadVehicleHTML(l) {
    const v = l.vehicleId ? Store.vehicle(l.vehicleId) : null;
    const vehCard = v
      ? `<a class="g-vcard" href="#gerant-modifier-${esc(v.id)}">
          ${thumb(v)}
          <span class="g-vcard-info">
            <span class="g-vcard-title">${title(v)}</span>
            <span class="g-muted g-vcard-version">${esc(v.version)}</span>
            <span class="g-vcard-price num">${esc(fmt.price(v.price))}</span>
            <span>${pill(v.status)}</span>
          </span>
          <span class="g-vcard-chev">${icon('chevron')}</span>
        </a>`
      : `<div class="g-vcard g-vcard-none"><span class="g-mini g-mini-ic g-mini-lg">${icon('inbox')}</span><span class="g-vcard-info"><span class="g-vcard-title">Demande générale</span><span class="g-muted">${l.vehicleId ? 'Le véhicule concerné a été retiré du stock.' : 'Pas de véhicule précis.'}</span></span></div>`;
    return `
      <section class="g-card" aria-labelledby="g-veh-h">
        <h2 class="g-card-h" id="g-veh-h">Véhicule concerné</h2>
        ${vehCard}
      </section>`;
  }
  function leadMessageHTML(l) {
    return `
      <section class="g-card" aria-labelledby="g-msg-h">
        <h2 class="g-card-h" id="g-msg-h">Message</h2>
        <blockquote class="g-quote">${esc(l.message)}</blockquote>
        <dl class="g-kv">
          <dt>Reprise</dt><dd>${l.tradeIn ? 'Oui' + (l.tradeInDesc ? ' — ' + esc(l.tradeInDesc) : '') : 'Non'}</dd>
          <dt>Financement</dt><dd>${esc(fmt.label('financing', l.financing))}</dd>
        </dl>
      </section>`;
  }
  function leadStatusHTML(l) {
    return `
      <section class="g-card" aria-labelledby="g-lst-h">
        <h2 class="g-card-h" id="g-lst-h">Suivi</h2>
        <div class="g-stseg g-stseg-2">
          ${LISTS.leadStatuses.map(([k, lab]) => `<button type="button" class="g-stbtn" data-s="${k}" data-lead-status="${k}" aria-pressed="${l.status === k}">${lab}</button>`).join('')}
        </div>
      </section>`;
  }
  function leadNotesHTML(l) {
    return `
      <section class="g-card" aria-labelledby="g-notes-h">
        <h2 class="g-card-h" id="g-notes-h">Notes internes</h2>
        <p class="hint">Visibles uniquement dans l’espace gérant.</p>
        <form class="g-noteform" id="g-noteform" novalidate>
          <div class="field">
            <label for="g-note-text">Nouvelle note</label>
            <textarea class="textarea g-note-ta" id="g-note-text" rows="3" maxlength="500" placeholder="ex. Rappelée, essai samedi 10 h" aria-describedby="g-note-err"></textarea>
            <p class="error g-err" id="g-note-err" aria-live="polite"></p>
          </div>
          <button type="submit" class="btn btn-ghost g-btn-lg btn-block">${icon('plus')}Ajouter la note</button>
        </form>
        <div id="g-notes">${notesHTML(l)}</div>
      </section>`;
  }
  function leadSectionsHTML(l, desk) {
    return leadClientHTML(l, desk) + '\n' + leadVehicleHTML(l) + '\n' + leadMessageHTML(l) + '\n' + leadStatusHTML(l) + '\n' + leadNotesHTML(l);
  }
  /* Comportements du détail : statut, notes, copie (onChange : rafraîchir la liste à côté) */
  function bindLeadDetail(id, onChange) {
    qsa('[data-lead-status]').forEach((b) => b.addEventListener('click', () => {
      const s = b.dataset.leadStatus;
      if (Store.lead(id).status === s) return;
      Store.setLeadStatus(id, s);
      qsa('[data-lead-status]').forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.leadStatus === s)));
      UI.toast('Demande : ' + fmt.label('leadStatuses', s));
      if (onChange) onChange();
    }));
    qs('#g-noteform').addEventListener('submit', (e) => {
      e.preventDefault();
      const ta = qs('#g-note-text');
      const err = qs('#g-note-err');
      const text = ta.value.trim();
      if (!text) { err.textContent = 'Écrire la note avant de l’ajouter.'; ta.setAttribute('aria-invalid', 'true'); ta.focus(); return; }
      err.textContent = '';
      ta.removeAttribute('aria-invalid');
      Store.addLeadNote(id, text);
      ta.value = '';
      qs('#g-notes').innerHTML = notesHTML(Store.lead(id));
      UI.toast('Note ajoutée.');
      if (onChange) onChange();
    });
    qs('#g-note-text').addEventListener('input', () => { qs('#g-note-err').textContent = ''; qs('#g-note-text').removeAttribute('aria-invalid'); });
    qsa('[data-copy]').forEach((b) => b.addEventListener('click', () => {
      const ok = () => UI.toast(b.dataset.copyWhat === 'tel' ? 'Numéro copié.' : 'Adresse e-mail copiée.');
      try { navigator.clipboard.writeText(b.dataset.copy).then(ok, () => UI.toast('Copie impossible : sélectionnez le texte à la main.')); }
      catch (e) { UI.toast('Copie impossible : sélectionnez le texte à la main.'); }
    }));
  }

  function renderLead(id) {
    let l = Store.lead(id);
    if (!l) {
      mount({
        header: subHeader('Demande introuvable', '', 'gerant-demandes', 'Retour aux demandes'),
        body: emptyState('inbox', 'Cette demande n’existe plus', '', '<a class="btn btn-primary g-btn-lg" href="#gerant-demandes">Retour aux demandes</a>'),
        tab: 'demandes'
      });
      return;
    }
    // Ouvrir une demande nouvelle la passe « en cours »
    let auto = false;
    if (l.status === 'nouvelle') { Store.setLeadStatus(id, 'en-cours'); l = Store.lead(id); auto = true; }

    const body = leadSectionsHTML(l, false);
    mount({ header: subHeader(esc(l.name), 'Demande ' + esc(fmt.relative(l.createdAt)), 'gerant-demandes', 'Retour aux demandes'), body, tab: 'demandes' });
    bindLeadDetail(id);

    if (auto) UI.toast('Demande passée « En cours ».');
  }

  /* =========================================================
     VERSION ORDINATEUR — coquille commune
     Barre latérale collante + en-tête de page + contenu.
     ========================================================= */
  function deskSide(active) {
    const n = Store.unreadCount();
    const cur = (k) => (active === k ? ' aria-current="page"' : '');
    const item = (k, href, ic, label, extra) =>
      `<a class="g-d-nav" href="${href}"${cur(k)} title="${label}"><span class="g-d-nav-ic">${icon(ic)}</span><span class="g-d-nav-l">${label}</span>${extra || ''}</a>`;
    return `<aside class="g-d-side" aria-label="Espace gérant">
      <a class="g-d-logo" href="#gerant-stock" aria-label="${esc(GARAGE.name)} : retour au stock">${App.Brand.mark('g-d-logo-mark')}${App.Brand.word('g-d-logo-word')}</a>
      <nav class="g-d-navs" aria-label="Navigation de l’espace gérant">
        ${item('stock', '#gerant-stock', 'car', 'Stock')}
        ${item('ajout', '#gerant-ajout', 'plus', 'Ajouter un véhicule')}
        ${item('demandes', '#gerant-demandes', 'inbox', 'Demandes', badgeParts(n) + '<span class="visually-hidden" data-g-badge-sr>' + badgeSr(n) + '</span>')}
      </nav>
      <hr class="g-d-sep">
      <div class="g-d-navs">
        ${item('site', '#accueil', 'eye', 'Voir mon site')}
        <button type="button" class="g-d-nav g-d-nav-out" id="g-logout" title="Se déconnecter"><span class="g-d-nav-ic">${icon('logout')}</span><span class="g-d-nav-l">Se déconnecter</span></button>
      </div>
      <p class="g-d-garage"><strong>${esc(GARAGE.name)}</strong><span>${App.Brand.addressHtml()}</span></p>
    </aside>`;
  }
  const addButton = () => `<a class="btn btn-primary g-d-btn" href="#gerant-ajout">${icon('plus')}Ajouter un véhicule</a>`;
  /* p : { nav, title, sub, back: [hash, libellé], actions (HTML, '' pour aucune), body, cls } */
  function mountDesk(p) {
    root.innerHTML = `<div class="g-app g-desk${p.cls ? ' ' + p.cls : ''}">
      ${deskSide(p.nav)}
      <div class="g-d-col">
        <header class="g-d-head">
          ${p.back ? `<a class="g-iconbtn g-d-back" href="#${p.back[0]}" aria-label="${p.back[1]}" title="${p.back[1]}">${icon('back')}</a>` : ''}
          <div class="g-d-head-t"><h1 class="g-top-title g-d-title" tabindex="-1">${p.title}</h1>${p.sub ? '<p class="g-d-sub">' + p.sub + '</p>' : ''}</div>
          <div class="g-d-head-acts">${p.actions == null ? addButton() : p.actions}</div>
        </header>
        <main class="g-main g-d-main" id="g-main">${p.body}</main>
      </div>
      <div class="g-layer" id="g-layer"></div>
    </div>`;
    qs('#g-logout').addEventListener('click', logout);
  }

  /* ---------- Connexion (écran partagé) ---------- */
  function renderLoginDesk() {
    root.innerHTML = `<div class="g-app g-desk g-d-login">
      <section class="g-d-login-brand" aria-label="${esc(GARAGE.name)}">
        ${App.Brand.mark('g-d-login-mark')}
        ${App.Brand.word('g-d-login-word')}
        <p class="g-d-login-pitch">Votre stock, vos annonces et les demandes de vos clients, au même endroit.</p>
        <p class="g-d-login-addr">${esc(GARAGE.tagline)}<br>${App.Brand.addressHtml()}</p>
      </section>
      <main class="g-d-login-main">
        <div class="g-d-login-box">
          <span class="eyebrow">${esc(GARAGE.name)}</span>
          <h1 class="g-top-title g-d-login-title" tabindex="-1">Espace gérant</h1>
          <p class="g-muted">Connectez-vous pour gérer le stock, les prix et les demandes de vos clients.</p>
          ${loginFormHTML()}
          <p class="g-secure">${icon('lock')}<span>Connexion sécurisée : les échanges avec le site sont chiffrés (HTTPS).</span></p>
          <p class="g-demo-note">Démonstration : identifiants déjà remplis, il suffit de cliquer sur « Se connecter ».</p>
        </div>
      </main>
    </div>`;
    bindLogin();
  }

  /* =========================================================
     Stock en tableau (ordinateur)
     ========================================================= */
  const AGE_ALERT = 45; // au-delà, une voiture « dort » et coûte de l'argent
  const SORTS = [
    ['stock:asc', 'Plus récents'], ['stock:desc', 'Ancienneté en stock'],
    ['price:asc', 'Prix croissant'], ['price:desc', 'Prix décroissant'],
    ['km:asc', 'Kilométrage croissant'], ['km:desc', 'Kilométrage décroissant'],
    ['year:desc', 'Année : plus récentes'], ['year:asc', 'Année : plus anciennes'],
    ['name:asc', 'Marque et modèle (A → Z)'], ['name:desc', 'Marque et modèle (Z → A)']
  ];
  const SORT_DEFAULT_DIR = { name: 'asc', year: 'desc', km: 'asc', price: 'asc', stock: 'desc' };
  const SORT_VALUE = {
    name: (v) => norm(fmt.title(v) + ' ' + v.version),
    year: (v) => (v.year || 0) * 100 + (v.month || 0),
    km: (v) => v.km || 0,
    price: (v) => v.price || 0,
    stock: (v) => Date.now() - new Date(v.addedAt).getTime()
  };
  function sortedStock() {
    const { key, dir } = ui.sort;
    const get = SORT_VALUE[key] || SORT_VALUE.stock;
    const m = dir === 'desc' ? -1 : 1;
    return stockList().sort((a, b) => {
      const x = get(a); const y = get(b);
      return (typeof x === 'string' ? x.localeCompare(y, 'fr') : x - y) * m;
    });
  }
  /* « Sur le site », en version courte pour le tableau */
  function siteCell(v) {
    const vis = App.siteVisibility(v);
    if (!vis.visible) return `<span class="g-d-site g-d-site-off">${icon('eye-off')}<span>Retiré</span></span>`;
    if (vis.until) return `<span class="g-d-site g-d-site-sold">${icon('eye')}<span>Affiché « Vendu » jusqu’au ${esc(fmt.dateShort(vis.until))}</span></span>`;
    return `<span class="g-d-site g-d-site-on">${icon('eye')}<span>En ligne</span></span>`;
  }
  function ageCell(v) {
    if (v.status === 'vendu' && v.soldAt) return `<span class="g-d-age g-d-age-sold">Vendu le ${esc(fmt.dateShort(v.soldAt))}</span>`;
    const d = daysSince(v.addedAt);
    if (d > AGE_ALERT) {
      return `<span class="g-d-age g-d-age-old" title="En stock depuis plus de ${AGE_ALERT} jours : revoir le prix ou les photos">${icon('alert')}<span class="num">${d} j</span><span class="visually-hidden"> (plus de ${AGE_ALERT} jours)</span></span>`;
    }
    return `<span class="g-d-age num">${d === 0 ? 'Aujourd’hui' : d + ' j'}</span>`;
  }
  function sortHead(key, label, cls) {
    const on = ui.sort.key === key;
    const sortAttr = on ? ` aria-sort="${ui.sort.dir === 'asc' ? 'ascending' : 'descending'}"` : '';
    const ic = on ? (ui.sort.dir === 'asc' ? 'sortUp' : 'sortDown') : 'sortBoth';
    return `<th scope="col" class="${cls}${on ? ' is-sorted' : ''}"${sortAttr}><button type="button" class="g-d-sort" data-sort="${key}">${label}${icon(ic)}</button></th>`;
  }
  function stockRowDesk(v) {
    const id = esc(v.id);
    const sel = ui.selected.has(v.id);
    const before = ui.priceBefore[v.id];
    const lowered = before != null && before !== v.price;
    return `<tr class="g-d-row${v.status === 'vendu' ? ' g-is-sold' : ''}${sel ? ' is-selected' : ''}" data-row="${id}">
      <td class="g-d-c-sel"><input type="checkbox" class="g-d-check" data-sel="${id}"${sel ? ' checked' : ''} aria-label="Sélectionner ${title(v)} (${esc(v.ref)})"></td>
      <td class="g-d-c-img">${thumb(v, 'g-d-thumb')}</td>
      <td class="g-d-c-veh">
        <a class="g-d-vname" href="#gerant-modifier-${id}">${title(v)}</a>
        <span class="g-d-vver">${esc(v.version)}</span>
        <span class="g-d-vmeta"><span class="g-ref">${esc(v.ref)}</span><span class="g-d-in-year num"> · ${esc(v.year)}</span><span class="g-d-in-km num"> · ${esc(fmt.km(v.km))}</span></span>
      </td>
      <td class="g-d-c-year num">${esc(v.year)}</td>
      <td class="g-d-c-km num">${esc(fmt.km(v.km))}</td>
      <td class="g-d-c-price" data-price-cell="${id}">
        <button type="button" class="g-d-price" data-price="${id}" title="Cliquer pour modifier le prix"><span class="num">${esc(fmt.price(v.price))}</span>${v.priceType === 'HT' ? '<small>HT</small>' : ''}${icon('edit')}<span class="visually-hidden"> : modifier le prix de ${title(v)}</span></button>
        ${lowered ? '<s class="g-d-price-old num"><span class="visually-hidden">Ancien prix : </span>' + esc(fmt.price(before)) + '</s>' : ''}
      </td>
      <td class="g-d-c-st">
        <span class="g-d-stwrap"><button type="button" class="g-d-stbtn pill pill-${esc(v.status)}" data-st="${id}" aria-haspopup="menu" aria-expanded="false">${esc(fmt.label('statuses', v.status))}${icon('chevDown')}<span class="visually-hidden"> : changer le statut de ${title(v)}</span></button></span>
        <span class="g-d-in-site">${siteCell(v)}</span>
      </td>
      <td class="g-d-c-site">${siteCell(v)}</td>
      <td class="g-d-c-age">${ageCell(v)}</td>
      <td class="g-d-c-act"><div class="g-d-acts">
        <a class="g-d-iconbtn" href="#gerant-modifier-${id}" title="Modifier la fiche">${icon('edit')}<span class="visually-hidden">Modifier ${title(v)}</span></a>
        ${rowMainAction(v)}
      </div></td>
    </tr>`;
  }

  function renderStockDesk() {
    const all = Store.vehicles();
    const visible = all.filter((v) => App.siteVisibility(v).visible).length;
    const old = all.filter((v) => v.status !== 'vendu' && daysSince(v.addedAt) > AGE_ALERT).length;
    const sortVal = ui.sort.key + ':' + ui.sort.dir;
    const body = `
      <section class="g-stats g-d-stats" aria-label="Résumé du stock">${statsHTML()}
      </section>
      <section class="g-d-toolbar" aria-label="Rechercher, filtrer et trier">
        <div class="g-search g-d-search">
          <label for="g-q" class="visually-hidden">Rechercher dans le stock</label>
          ${icon('search')}
          <input class="input g-search-input" id="g-q" type="search" placeholder="Marque, modèle, référence…" autocomplete="off" value="${esc(ui.stockQuery)}">
        </div>
        <div class="g-segtabs g-d-seg" role="group" aria-label="Filtrer par statut">
          ${STOCK_FILTERS.map(([k, l]) => `<button type="button" class="g-segtab" data-filter="${k}" aria-pressed="${ui.stockFilter === k}">${l}</button>`).join('')}
        </div>
        <div class="g-d-sortsel">
          <label for="g-d-sort">Trier par</label>
          <select class="select" id="g-d-sort">${SORTS.map(([k, l]) => `<option value="${k}"${k === sortVal ? ' selected' : ''}>${l}</option>`).join('')}</select>
        </div>
      </section>
      ${old ? `<div class="g-d-agenote" role="note">${icon('alert')}<p><strong>${plural(old, 'véhicule dort', 'véhicules dorment')} en stock depuis plus de ${AGE_ALERT} jours.</strong> Une voiture immobilisée coûte de l’argent : revoir son prix ou ses photos.</p><button type="button" class="g-link" id="g-d-oldest">Voir les plus anciens</button></div>` : ''}
      <section class="g-d-listsec" aria-labelledby="g-list-h">
        <div class="g-listhead"><h2 class="g-h2" id="g-list-h">Véhicules</h2><span class="g-count" id="g-count" aria-live="polite"></span></div>
        <div id="g-d-table-wrap"></div>
        <div class="g-d-bulk" id="g-d-bulk" role="region" aria-label="Actions groupées" hidden>
          <p class="g-d-bulk-n" id="g-d-bulk-n" aria-live="polite"></p>
          <button type="button" class="g-d-bulkbtn" data-bulk="sold">${icon('key')}<span>Marquer vendus</span></button>
          <button type="button" class="g-d-bulkbtn" data-bulk="hide">${icon('eye-off')}<span>Retirer du site</span></button>
          <button type="button" class="g-d-bulkbtn" data-bulk="show">${icon('eye')}<span>Remettre en ligne</span></button>
          <button type="button" class="g-d-bulkbtn g-d-bulk-del" data-bulk="delete">${icon('trash')}<span>Supprimer</span></button>
          <button type="button" class="g-d-bulkbtn g-d-bulk-x" data-bulk="clear" aria-label="Tout désélectionner" title="Tout désélectionner">${icon('x')}</button>
        </div>
      </section>`;
    mountDesk({
      nav: 'stock', title: 'Mon stock',
      sub: plural(all.length, 'véhicule', 'véhicules') + ' · ' + plural(visible, 'visible', 'visibles') + ' sur le site',
      body
    });
    drawStockTable();

    const q = qs('#g-q');
    q.addEventListener('input', () => { ui.stockQuery = q.value; drawStockTable(); });
    qsa('[data-filter]').forEach((b) => b.addEventListener('click', () => setStockFilter(b.dataset.filter)));
    qsa('[data-stat]').forEach((b) => b.addEventListener('click', () => {
      setStockFilter(b.dataset.stat);
      reveal(qs('#g-list-h'));
    }));
    qs('#g-d-sort').addEventListener('change', (e) => {
      const [key, dir] = e.target.value.split(':');
      ui.sort = { key, dir };
      drawStockTable();
    });
    const oldest = qs('#g-d-oldest');
    if (oldest) oldest.addEventListener('click', () => {
      ui.sort = { key: 'stock', dir: 'desc' };
      qs('#g-d-sort').value = 'stock:desc';
      if (ui.stockFilter === 'vendu') setStockFilter('tous'); else drawStockTable();
      reveal(qs('#g-list-h'));
    });
    qsa('[data-bulk]').forEach((b) => b.addEventListener('click', () => bulkAction(b.dataset.bulk)));
  }

  /* Tableau : rendu et comportements (réappelé à chaque filtre, tri ou recherche) */
  function drawStockTable() {
    const wrap = qs('#g-d-table-wrap');
    if (!wrap) return;
    closePop();
    const list = sortedStock();
    // La sélection ne garde que les lignes affichées
    const shown = new Set(list.map((v) => v.id));
    Array.from(ui.selected).forEach((id) => { if (!shown.has(id)) ui.selected.delete(id); });
    qs('#g-count').textContent = plural(list.length, 'véhicule', 'véhicules');
    const sel = qs('#g-d-sort');
    if (sel) sel.value = ui.sort.key + ':' + ui.sort.dir;

    if (!Store.vehicles().length) {
      wrap.innerHTML = emptyState('car', 'Aucun véhicule en stock', 'Le premier véhicule ajouté apparaîtra ici et sur le site.',
        `<a class="btn btn-primary g-d-btn" href="#gerant-ajout">${icon('plus')}Ajouter un véhicule</a>`);
    } else if (!list.length && ui.stockQuery.trim()) {
      wrap.innerHTML = emptyState('search', 'Aucun résultat', 'Aucun véhicule ne correspond à « ' + esc(ui.stockQuery.trim()) + ' »' + (ui.stockFilter !== 'tous' ? ' dans ce filtre' : '') + '.',
        '<button type="button" class="btn btn-ghost g-d-btn" data-reset-search>Effacer la recherche</button>');
    } else if (!list.length) {
      const what = { disponible: 'Aucun véhicule disponible', reserve: 'Aucun véhicule réservé', vendu: 'Aucun véhicule vendu' }[ui.stockFilter] || 'Aucun véhicule';
      wrap.innerHTML = emptyState('car', what + ' pour le moment', '', '<button type="button" class="btn btn-ghost g-d-btn" data-reset-filter>Voir tout le stock</button>');
    } else {
      wrap.innerHTML = `<table class="g-d-table">
        <caption class="visually-hidden">Véhicules du stock, ${plural(list.length, 'ligne', 'lignes')}</caption>
        <thead><tr>
          <th scope="col" class="g-d-c-sel"><input type="checkbox" class="g-d-check" id="g-d-all" aria-label="Sélectionner tous les véhicules affichés"></th>
          <th scope="col" class="g-d-c-img"><span class="visually-hidden">Photo</span></th>
          ${sortHead('name', 'Véhicule', 'g-d-c-veh')}
          ${sortHead('year', 'Année', 'g-d-c-year')}
          ${sortHead('km', '<abbr title="Kilométrage">Km</abbr>', 'g-d-c-km')}
          ${sortHead('price', 'Prix', 'g-d-c-price')}
          <th scope="col" class="g-d-c-st">Statut</th>
          <th scope="col" class="g-d-c-site">Sur le site</th>
          ${sortHead('stock', 'En stock', 'g-d-c-age')}
          <th scope="col" class="g-d-c-act"><span class="visually-hidden">Actions</span></th>
        </tr></thead>
        <tbody>${list.map(stockRowDesk).join('')}</tbody>
      </table>`;
    }
    const rs = qs('[data-reset-search]', wrap);
    if (rs) rs.addEventListener('click', () => { ui.stockQuery = ''; qs('#g-q').value = ''; drawStockTable(); qs('#g-q').focus(); });
    const rf = qs('[data-reset-filter]', wrap);
    if (rf) rf.addEventListener('click', () => setStockFilter('tous'));
    updateBulk();
    if (!list.length) return;

    // Tri par colonne
    qsa('[data-sort]', wrap).forEach((b) => b.addEventListener('click', () => {
      const key = b.dataset.sort;
      ui.sort = ui.sort.key === key ? { key, dir: ui.sort.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: SORT_DEFAULT_DIR[key] };
      drawStockTable();
      const again = qs('[data-sort="' + key + '"]');
      if (again) again.focus({ preventScroll: true });
    }));
    // Sélection
    const all = qs('#g-d-all', wrap);
    all.addEventListener('change', () => {
      list.forEach((v) => { if (all.checked) ui.selected.add(v.id); else ui.selected.delete(v.id); });
      qsa('[data-sel]', wrap).forEach((c) => { c.checked = all.checked; c.closest('tr').classList.toggle('is-selected', all.checked); });
      updateBulk();
    });
    qsa('[data-sel]', wrap).forEach((c) => c.addEventListener('change', () => {
      if (c.checked) ui.selected.add(c.dataset.sel); else ui.selected.delete(c.dataset.sel);
      c.closest('tr').classList.toggle('is-selected', c.checked);
      updateBulk();
    }));
    // Clic sur la ligne (hors contrôles) : ouvrir la fiche
    qs('tbody', wrap).addEventListener('click', (e) => {
      if (e.target.closest('a, button, input, label, select, textarea, .g-d-pop, .g-d-c-sel')) return;
      const tr = e.target.closest('tr[data-row]');
      if (tr) Router.go('gerant-modifier-' + tr.dataset.row);
    });
    qsa('[data-price]', wrap).forEach((b) => b.addEventListener('click', () => startPriceEdit(b.dataset.price)));
    qsa('[data-st]', wrap).forEach((b) => b.addEventListener('click', (e) => {
      e.stopPropagation();
      if (ui.pop && ui.pop.id === b.dataset.st) closePop(true); else openStatusPop(b.dataset.st, b);
    }));
    const refocus = (s) => { const t = qs(s); if (t) t.focus({ preventScroll: true }); };
    bindRowActions(wrap, redrawStockDesk, refocus);
  }
  /* Après une action : indicateurs, sous-titre et tableau à jour, sans perdre la position */
  function redrawStockDesk() {
    renderStockDesk();
  }

  /* --- Prix modifiable sur place --- */
  function startPriceEdit(id) {
    const v = Store.vehicle(id);
    const cell = qs('[data-price-cell="' + id + '"]');
    if (!v || !cell) return;
    closePop();
    cell.innerHTML = `<div class="g-d-pedit">
        <label class="visually-hidden" for="g-d-pin">Nouveau prix de ${title(v)}, en euros</label>
        <div class="g-affix"><input class="input num g-d-pin" id="g-d-pin" type="text" inputmode="numeric" autocomplete="off" value="${esc(numText(v.price))}" data-num aria-describedby="g-d-pin-help"><span class="g-affix-unit" aria-hidden="true">€</span></div>
        <p class="g-d-pin-help" id="g-d-pin-help">Entrée : valider · Échap : annuler</p>
      </div>`;
    const input = qs('#g-d-pin', cell);
    const help = qs('#g-d-pin-help', cell);
    bindNumInputs(cell);
    input.focus();
    input.select();
    let done = false;
    const finish = (commit) => {
      if (done) return;
      const p = toInt(input.value);
      if (commit && p !== v.price && !doPrice(id, p)) return false;
      done = true;
      redrawStockDesk();
      const b = qs('[data-price="' + id + '"]');
      if (b) b.focus({ preventScroll: true });
      return true;
    };
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (finish(true) === false) {
          input.setAttribute('aria-invalid', 'true');
          help.textContent = 'Prix à vérifier : 100 € minimum.';
          help.classList.add('is-error');
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        finish(false);
        UI.toast('Prix inchangé.');
      }
    });
    input.addEventListener('blur', () => {
      // Sortie du champ : on enregistre si le prix est valable, sinon on annule
      setTimeout(() => {
        if (done) return;
        if (finish(true) === false) { finish(false); UI.toast('Prix non valable : il n’a pas été modifié.'); }
      }, 0);
    });
  }

  /* --- Menu de statut (remplace la feuille du téléphone) --- */
  function openStatusPop(id, btn) {
    const v = Store.vehicle(id);
    if (!v) return;
    closePop();
    const pop = document.createElement('div');
    pop.className = 'g-d-pop';
    pop.id = 'g-d-pop';
    pop.setAttribute('role', 'menu');
    pop.setAttribute('aria-label', 'Statut de ' + fmt.title(v));
    pop.innerHTML = LISTS.statuses.map(([k, l]) =>
      `<button type="button" class="g-d-pop-item" role="menuitemradio" aria-checked="${v.status === k}" data-pop-status="${k}" tabindex="-1">
        <span class="g-d-pop-dot g-d-dot-${k}" aria-hidden="true"></span>
        <span class="g-d-pop-t"><span class="g-d-pop-l">${l}</span><span class="g-d-pop-h">${STATUS_HINTS[k]}</span></span>
        <span class="g-d-pop-ok" aria-hidden="true">${v.status === k ? icon('check') : ''}</span>
      </button>`).join('');
    btn.parentElement.appendChild(pop);
    // Ouverture vers le haut s'il n'y a pas la place en dessous
    const r = btn.getBoundingClientRect();
    if (window.innerHeight - r.bottom < pop.offsetHeight + 16 && r.top > pop.offsetHeight + 120) pop.classList.add('is-up');
    btn.setAttribute('aria-expanded', 'true');
    ui.pop = { id };
    const items = qsa('.g-d-pop-item', pop);
    (items.find((i) => i.getAttribute('aria-checked') === 'true') || items[0]).focus();
    pop.addEventListener('keydown', (e) => {
      const i = items.indexOf(document.activeElement);
      if (e.key === 'ArrowDown') { e.preventDefault(); items[(i + 1) % items.length].focus(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); items[(i - 1 + items.length) % items.length].focus(); }
      else if (e.key === 'Home') { e.preventDefault(); items[0].focus(); }
      else if (e.key === 'End') { e.preventDefault(); items[items.length - 1].focus(); }
      else if (e.key === 'Tab') { closePop(); }
    });
    items.forEach((b) => b.addEventListener('click', () => {
      const s = b.dataset.popStatus;
      closePop();
      if (doStatus(id, s)) redrawStockDesk();
      const t = qs('[data-st="' + id + '"]');
      if (t) t.focus({ preventScroll: true });
    }));
  }
  function closePop(focus) {
    if (!ui.pop || !root) { ui.pop = null; return; }
    const id = ui.pop.id;
    ui.pop = null;
    const pop = qs('#g-d-pop');
    if (pop) pop.remove();
    const btn = qs('[data-st="' + id + '"]');
    if (btn) { btn.setAttribute('aria-expanded', 'false'); if (focus) btn.focus({ preventScroll: true }); }
  }

  /* --- Actions groupées --- */
  function bulkGroups() {
    const vs = Array.from(ui.selected).map((id) => Store.vehicle(id)).filter(Boolean);
    return {
      all: vs,
      sold: vs.filter((v) => v.status !== 'vendu'),
      hide: vs.filter((v) => App.siteVisibility(v).visible),
      show: vs.filter((v) => v.hiddenFromSite && App.siteVisibility(Object.assign({}, v, { hiddenFromSite: false })).visible)
    };
  }
  function updateBulk() {
    const bar = qs('#g-d-bulk');
    if (!bar) return;
    const g = bulkGroups();
    bar.hidden = !g.all.length;
    qs('#g-d-bulk-n').textContent = g.all.length ? plural(g.all.length, 'véhicule sélectionné', 'véhicules sélectionnés') : '';
    const label = { sold: 'Marquer vendus', hide: 'Retirer du site', show: 'Remettre en ligne' };
    Object.keys(label).forEach((k) => {
      const b = qs('[data-bulk="' + k + '"]', bar);
      b.disabled = !g[k].length;
      b.querySelector('span').textContent = label[k] + (g[k].length ? ' (' + g[k].length + ')' : '');
    });
    const all = qs('#g-d-all');
    if (all) {
      const rows = qsa('[data-sel]');
      const n = rows.filter((c) => c.checked).length;
      all.checked = !!rows.length && n === rows.length;
      all.indeterminate = n > 0 && n < rows.length;
    }
  }
  function bulkAction(kind) {
    const g = bulkGroups();
    const focusBack = () => {
      const b = qs('[data-bulk="' + kind + '"]:not([disabled])') || qs('[data-bulk]:not([disabled])') || qs('#g-q');
      if (b && !qs('#g-d-bulk').hidden) b.focus({ preventScroll: true }); else qs('#g-q').focus({ preventScroll: true });
    };
    if (kind === 'clear') { ui.selected.clear(); drawStockTable(); qs('#g-q').focus({ preventScroll: true }); return; }
    if (kind === 'sold' && g.sold.length) {
      g.sold.forEach((v) => Store.setStatus(v.id, 'vendu'));
      UI.toast(plural(g.sold.length, 'véhicule marqué vendu', 'véhicules marqués vendus') + '. Affichage « Vendu » ' + App.SOLD_VISIBLE_DAYS + ' jours sur le site, puis retrait automatique.');
    } else if (kind === 'hide' && g.hide.length) {
      g.hide.forEach((v) => Store.setHidden(v.id, true));
      UI.toast(plural(g.hide.length, 'véhicule retiré', 'véhicules retirés') + ' du site. Ils restent dans le stock.');
    } else if (kind === 'show' && g.show.length) {
      g.show.forEach((v) => Store.setHidden(v.id, false));
      UI.toast(plural(g.show.length, 'véhicule remis', 'véhicules remis') + ' en ligne.');
    } else if (kind === 'delete' && g.all.length) {
      confirmBulkDelete(g.all);
      return;
    } else return;
    redrawStockDesk();
    focusBack();
  }
  /* Suppression groupée : boîte de dialogue centrée dans la page (aucune boîte native du navigateur) */
  function confirmBulkDelete(vs) {
    const n = vs.length;
    const html = `<div class="g-d-dlg-head">
        <span class="g-d-dlg-ic">${icon('trash')}</span>
        <h2 class="g-sheet-title" id="g-dlg-title">Supprimer ${plural(n, 'véhicule', 'véhicules')} ?</h2>
        <button type="button" class="g-iconbtn g-d-dlg-x" data-close aria-label="Fermer">${icon('x')}</button>
      </div>
      <p class="g-d-dlg-text">${n > 1 ? 'Les annonces disparaissent' : 'L’annonce disparaît'} du site et du stock. Cette action ne peut pas être annulée. Pour une voiture vendue, le statut « Vendu » est préférable.</p>
      <ul class="g-d-dlg-list">${vs.map((v) => `<li>${thumb(v, 'g-thumb-sm')}<span><strong>${title(v)}</strong> <span class="g-muted">${esc(v.version)}</span></span><span class="g-ref">${esc(v.ref)}</span></li>`).join('')}</ul>
      <div class="g-d-dlg-acts">
        <button type="button" class="btn btn-ghost g-d-btn" data-close id="g-dlg-no">Annuler</button>
        <button type="button" class="btn g-btn-danger-solid g-d-btn" id="g-dlg-yes">${icon('trash')}Supprimer définitivement</button>
      </div>`;
    const sheet = openSheet(html, '[data-bulk="delete"]', 'g-dlg-title', 'g-d-dialog');
    if (!sheet) return;
    qs('#g-dlg-no', sheet).focus({ preventScroll: true });
    qs('#g-dlg-yes', sheet).addEventListener('click', () => {
      vs.forEach((v) => { Store.deleteVehicle(v.id); delete ui.priceBefore[v.id]; });
      ui.selected.clear();
      closeSheet(true);
      UI.toast(plural(n, 'annonce supprimée', 'annonces supprimées') + '.');
      redrawStockDesk();
      qs('#g-q').focus({ preventScroll: true });
    });
  }

  /* =========================================================
     Formulaire véhicule (ordinateur) : grille + aperçu en direct
     ========================================================= */
  function formHTMLDesk(P, mode) {
    return `<form class="g-form g-d-form" id="g-form" data-mode="${mode}" novalidate>
      <p class="g-form-intro">Les champs marqués <span class="g-req" aria-hidden="true">*</span> sont obligatoires.</p>

      <section class="g-sec" aria-labelledby="g-sec-photos">
        ${sectionHead(1, 'g-sec-photos', 'Photos')}
        <div class="g-d-drop" id="g-d-drop">
          <span class="g-d-drop-ic">${icon('upload')}</span>
          <p class="g-d-drop-t">Glissez-déposez vos photos ici</p>
          <p class="g-d-drop-s">ou</p>
          <input type="file" id="g-f-photos" class="g-file" accept="image/*" multiple aria-describedby="g-photos-hint">
          <label for="g-f-photos" class="btn btn-ghost g-d-btn g-d-pick" id="g-photo-btn">${icon('image')}<span class="g-photo-btn-t">Choisir des photos</span></label>
        </div>
        <p class="g-photo-status" id="g-photo-status" role="status" aria-live="polite"></p>
        <div id="g-photos"></div>
        <p class="hint" id="g-photos-hint">Recommandé mais pas obligatoire : sans photo, une illustration du modèle est affichée. Les photos sont allégées automatiquement (${MAX_PHOTOS} maximum).</p>
      </section>

      <section class="g-sec" aria-labelledby="g-sec-veh">
        ${sectionHead(2, 'g-sec-veh', 'Le véhicule')}
        <div class="g-d-grid2"><div class="g-d-stack">${P.make}${P.makeOther}</div>${P.model}</div>
        <div class="g-d-grid2">${P.version}${P.power}</div>
        <div class="g-d-grid2 g-d-end">${P.circ}${P.km}</div>
        ${P.body}
        <div class="g-d-grid2">${P.fuel}${P.gearbox}</div>
        ${P.color}
        <div class="g-d-grid2">${P.doors}${P.seats}</div>
        <div class="g-d-grid2">${P.critair}<div class="g-d-cell-mid">${P.firstHand}</div></div>
      </section>

      <section class="g-sec" aria-labelledby="g-sec-price">
        ${sectionHead(3, 'g-sec-price', 'Prix')}
        <div class="g-d-grid2">${P.price}${P.warranty}</div>
        ${P.priceType}
      </section>

      <section class="g-sec" aria-labelledby="g-sec-eq">
        ${sectionHead(4, 'g-sec-eq', 'Équipements')}
        <p class="hint">Cliquer pour cocher les équipements présents.</p>
        ${P.chips}
        ${P.eqAdd}
      </section>

      <section class="g-sec" aria-labelledby="g-sec-desc">
        ${sectionHead(5, 'g-sec-desc', 'Description')}
        ${P.description}
      </section>

      <section class="g-sec" aria-labelledby="g-sec-feat">
        ${sectionHead(6, 'g-sec-feat', 'Mise en avant')}
        ${P.featured}
      </section>
    </form>`;
  }
  const deskFormLayout = (left, aside) => `<div class="g-d-formgrid"><div class="g-d-formcol">${left}</div>${aside}</div>`;
  function previewPanel(extra) {
    return `<section class="g-d-panel" aria-labelledby="g-d-pv-h">
        <div class="g-d-panel-head"><h2 class="g-d-panel-h" id="g-d-pv-h">Aperçu sur le site</h2><span class="g-d-live"><span aria-hidden="true"></span>En direct</span></div>
        <div class="g-d-preview" id="g-d-preview"></div>
        ${extra || ''}
      </section>`;
  }
  function deskAsideAjout() {
    return `<aside class="g-d-aside" aria-label="Aperçu et publication"><div class="g-d-aside-in">
      ${previewPanel()}
      <section class="g-d-panel g-d-publish" aria-label="Publication">
        <p class="g-d-formmsg" id="g-form-msg" role="status" aria-live="polite"></p>
        <button type="submit" form="g-form" class="btn btn-primary g-d-btn g-d-btn-main" id="g-submit">${icon('check')}<span>Publier l’annonce</span></button>
        <p class="hint">L’annonce apparaît aussitôt dans le showroom. Si vous quittez la page, la saisie est gardée en brouillon.</p>
      </section>
    </div></aside>`;
  }
  function editSiteHTML(v) {
    const vis = App.siteVisibility(v);
    return `<p class="g-sheet-site">${siteLine(v)}</p>
      ${vis.visible
        ? `<button type="button" class="btn btn-ghost g-d-btn btn-block" data-d-site="hide">${icon('eye-off')}Retirer du site</button>`
        : `<button type="button" class="btn btn-ghost g-d-btn btn-block" data-d-site="show">${icon('eye')}Remettre en ligne</button>`}`;
  }
  function deskAsideEdit(v) {
    return `<aside class="g-d-aside" aria-label="Aperçu et réglages de l’annonce"><div class="g-d-aside-in">
      ${previewPanel(`<a class="btn btn-ghost g-d-btn btn-block" href="#vehicule-${esc(v.id)}">${icon('external')}Voir l’annonce sur le site</a>`)}
      <section class="g-d-panel g-d-publish" aria-label="Enregistrement">
        <p class="g-d-formmsg" id="g-form-msg" role="status" aria-live="polite"></p>
        <button type="submit" form="g-form" class="btn btn-primary g-d-btn g-d-btn-main" id="g-submit">${icon('check')}<span>Enregistrer</span></button>
        <p class="hint">Le statut et la visibilité ci-dessous s’appliquent tout de suite.</p>
      </section>
      <section class="g-d-panel" aria-labelledby="g-st-h">
        <h2 class="g-d-panel-h" id="g-st-h">Statut</h2>
        <div class="g-stseg">${statusButtons(v.status, 'data-edit-status')}</div>
        <p class="hint" id="g-st-hint" aria-live="polite">${STATUS_HINTS[v.status] || ''}</p>
        <h3 class="g-d-panel-h g-d-panel-h2" id="g-d-site-h">Visibilité sur le site</h3>
        <div id="g-d-site">${editSiteHTML(v)}</div>
      </section>
      <section class="g-d-panel g-danger" aria-labelledby="g-del-h">
        <h2 class="g-d-panel-h" id="g-del-h">Supprimer l’annonce</h2>
        <p class="g-muted">L’annonce disparaît du site et du stock. Pour une voiture vendue, le statut « Vendu » est préférable.</p>
        <div id="g-del-zone"></div>
      </section>
    </div></aside>`;
  }
  /* Visibilité sur le site (modification) : bouton appliqué tout de suite */
  function refreshEditAside(id) {
    const box = qs('#g-d-site');
    const v = Store.vehicle(id);
    if (!box || !v) return;
    box.innerHTML = editSiteHTML(v);
    const b = qs('[data-d-site]', box);
    b.addEventListener('click', () => {
      doHide(id, b.dataset.dSite === 'hide');
      refreshEditAside(id);
      const again = qs('[data-d-site]');
      if (again) again.focus({ preventScroll: true });
    });
    updatePreview();
  }

  /* --- Aperçu : la carte du showroom public, recalculée pendant la saisie --- */
  function previewVehicle() {
    const d = readForm();
    if (!d) return null;
    const base = ui.form.mode === 'modifier' ? Store.vehicle(ui.form.id) : null;
    const c = LISTS.colors.find((x) => x[0] === d.color);
    return Object.assign({ status: 'disponible', addedAt: new Date().toISOString() }, base || {}, d, {
      id: 'apercu-' + (base ? base.id : 'neuf'),
      body: d.body || 'berline',
      colorHex: c ? c[1] : (base && base.colorHex) || '#7d838b',
      doors: d.doors || 5
    });
  }
  function previewCardHTML(pv) {
    const sold = pv.status === 'vendu';
    const badges = [];
    if (!sold && App.isNew(pv)) badges.push('<span class="pill pill-nouveau">Nouveau</span>');
    if (pv.status === 'reserve') badges.push('<span class="pill pill-reserve">Réservé</span>');
    const empty = (t) => `<span class="g-d-pv-empty">${t}</span>`;
    const name = [pv.make, pv.model].filter(Boolean).join(' ');
    const spec1 = (pv.year ? esc(pv.year) : empty('Année')) + ' · ' + (pv.km != null ? esc(fmt.km(pv.km)) : empty('Kilométrage'));
    const spec2 = (pv.fuel ? esc(pv.fuel) : empty('Carburant')) + ' · ' + (pv.gearbox ? esc(pv.gearbox) : empty('Boîte'));
    const c = String(pv.critair || '').toUpperCase();
    const crit = CRITAIRS.indexOf(c) !== -1
      ? `<span class="critair critair-${c}" role="img" aria-label="Vignette Crit’Air ${c === 'E' ? 'électrique' : c}">${c}</span>` : '';
    const n = (pv.photos || []).length;
    return `<article class="p-card g-d-pcard${sold ? ' is-sold' : ''}">
        <div class="p-visual p-card-visual">${Media.photo(pv, 0)}
          ${badges.length ? '<div class="p-badges">' + badges.join('') + '</div>' : ''}
          ${sold ? '<span class="p-sold-band">Vendu</span>' : ''}
          ${n ? '<span class="g-d-pv-count">' + icon('camera') + plural(n, 'photo', 'photos') + '</span>' : '<span class="g-d-pv-count">Illustration</span>'}
        </div>
        <div class="p-card-body">
          <h3 class="p-card-title">${name ? esc(name) : empty('Marque et modèle')}</h3>
          <p class="p-card-version">${pv.version ? esc(pv.version) : empty('Version / finition')}</p>
          <p class="p-card-specs num"><span>${spec1}</span><span>${spec2}</span></p>
          <div class="p-card-foot"><p class="p-price">${pv.price ? '<span class="num">' + esc(fmt.price(pv.price)) + '</span> <span class="p-price-type">' + (pv.priceType === 'HT' ? 'HT' : 'TTC') + '</span>' : empty('Prix à saisir')}</p>${crit}</div>
        </div>
      </article>`;
  }
  function updatePreview() {
    const box = qs('#g-d-preview');
    if (!box || !ui.form) return;
    const pv = previewVehicle();
    if (pv) box.innerHTML = previewCardHTML(pv);
  }

  /* --- Photos (ordinateur) : glisser-déposer + vignettes avec outils --- */
  const hasFiles = (e) => !!(e.dataTransfer && Array.from(e.dataTransfer.types || []).indexOf('Files') !== -1);
  function renderPhotosDesk() {
    const F = ui.form;
    const box = qs('#g-photos');
    const drop = qs('#g-d-drop');
    if (!F || !box || !drop) return;
    const has = F.photos.length + F.pending > 0;
    drop.classList.toggle('g-compact', has);
    qs('.g-photo-btn-t', drop).textContent = has ? 'Ajouter des photos' : 'Choisir des photos';
    qs('.g-d-drop-t', drop).textContent = has ? 'Glissez d’autres photos ici' : 'Glissez-déposez vos photos ici';
    if (!has) { box.innerHTML = ''; updatePreview(); return; }
    const last = F.photos.length - 1;
    const tool = (act, i, ic, label, off) =>
      `<button type="button" class="g-d-phbtn${act === 'del' ? ' g-d-phbtn-del' : ''}" data-ph-act="${act}" data-ph-i="${i}" aria-label="${label}" title="${label}"${off ? ' disabled' : ''}>${icon(ic)}</button>`;
    const tiles = F.photos.map((src, i) => `<li class="g-d-ph${i === 0 ? ' is-main' : ''}">
        <span class="g-d-ph-img"><img src="${esc(src)}" alt="Photo ${i + 1}${i === 0 ? ', principale' : ''}"></span>
        ${i === 0 ? '<span class="g-ph-badge">' + icon('star') + 'Principale</span>' : '<span class="g-ph-num" aria-hidden="true">' + (i + 1) + '</span>'}
        <span class="g-d-ph-tools" role="group" aria-label="Photo ${i + 1}">
          ${tool('left', i, 'left', 'Déplacer la photo ' + (i + 1) + ' avant', i === 0)}
          ${tool('right', i, 'right', 'Déplacer la photo ' + (i + 1) + ' après', i === last)}
          ${tool('main', i, 'star', 'Choisir la photo ' + (i + 1) + ' comme principale', i === 0)}
          ${tool('del', i, 'trash', 'Supprimer la photo ' + (i + 1), false)}
        </span>
      </li>`).join('') +
      Array.from({ length: F.pending }, () => '<li class="g-d-ph g-ph-loading" aria-hidden="true"><span class="g-spinner"></span></li>').join('');
    box.innerHTML = '<ul class="g-d-phgrid" aria-label="Photos de l’annonce">' + tiles + '</ul>';
    qsa('[data-ph-act]', box).forEach((b) => b.addEventListener('click', () => {
      const act = b.dataset.phAct;
      const ni = movePhoto(act, Number(b.dataset.phI));
      renderPhotosDesk();
      const at = act === 'del' ? Math.min(Number(b.dataset.phI), F.photos.length - 1) : ni;
      const t = qs('[data-ph-act="' + act + '"][data-ph-i="' + at + '"]:not([disabled])') ||
        qs('[data-ph-i="' + at + '"]:not([disabled])') || qs('#g-f-photos');
      if (t) t.focus({ preventScroll: true });
    }));
    updatePreview();
  }
  /* Comportements propres à l'ordinateur : aperçu en direct, dépôt de fichiers, visibilité */
  function bindDeskForm() {
    const f = qs('#g-form');
    if (!f) return;
    let raf = 0;
    const later = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(updatePreview); };
    f.addEventListener('input', later);
    f.addEventListener('change', later);
    const drop = qs('#g-d-drop');
    let depth = 0;
    drop.addEventListener('dragenter', (e) => { if (!hasFiles(e)) return; e.preventDefault(); depth++; drop.classList.add('is-over'); });
    drop.addEventListener('dragover', (e) => { if (!hasFiles(e)) return; e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; });
    drop.addEventListener('dragleave', () => { depth = Math.max(0, depth - 1); if (!depth) drop.classList.remove('is-over'); });
    drop.addEventListener('drop', (e) => {
      e.preventDefault();
      e.stopPropagation();
      depth = 0;
      drop.classList.remove('is-over');
      addPhotos(e.dataTransfer && e.dataTransfer.files);
    });
    if (ui.form && ui.form.mode === 'modifier') refreshEditAside(ui.form.id);
    updatePreview();
  }

  /* ---------- Succès après publication ---------- */
  function renderSuccessDesk(v) {
    const body = `<div class="g-d-success">
      <div class="g-d-success-main">
        <span class="g-success-ic">${icon('check')}</span>
        <h2 class="g-success-title" id="g-success-title" tabindex="-1">Annonce publiée</h2>
        <p class="g-success-text">${title(v)} est en ligne dans le showroom${v.featured ? ' et mise en avant sur la page d’accueil' : ''}.</p>
        <dl class="g-kv g-d-success-kv">
          <dt>Référence</dt><dd class="g-ref">${esc(v.ref)}</dd>
          <dt>Prix affiché</dt><dd class="num">${esc(fmt.price(v.price))} ${esc(v.priceType)}</dd>
          <dt>Statut</dt><dd>${pill(v.status)}</dd>
          <dt>Photos</dt><dd>${(v.photos || []).length ? plural(v.photos.length, 'photo', 'photos') : 'Illustration du modèle'}</dd>
        </dl>
        <div class="g-d-success-acts">
          <a class="btn btn-primary g-d-btn" href="#vehicule-${esc(v.id)}">${icon('eye')}Voir l’annonce sur le site</a>
          <a class="btn btn-ghost g-d-btn" href="#gerant-ajout" data-add-another>${icon('plus')}Ajouter un autre véhicule</a>
          <a class="btn btn-ghost g-d-btn" href="#gerant-modifier-${esc(v.id)}">${icon('edit')}Modifier la fiche</a>
        </div>
        <a class="g-link g-d-success-back" href="#gerant-stock">Retour au stock</a>
      </div>
      <div class="g-d-success-card" aria-label="Aperçu de l’annonce">${previewCardHTML(v)}</div>
    </div>`;
    mountDesk({ nav: 'ajout', back: ['gerant-stock', 'Retour au stock'], actions: '', title: 'Ajouter un véhicule', sub: 'Terminé', body });
  }

  /* =========================================================
     Demandes : vue maître-détail (ordinateur)
     ========================================================= */
  function renderLeadsDesk(wantedId, explicit) {
    if (!ui.leadFilter) ui.leadFilter = Store.unreadCount() ? 'nouvelles' : 'toutes';
    const filterOf = () => LEAD_FILTERS.find((x) => x[0] === ui.leadFilter) || LEAD_FILTERS[3];
    // Demande affichée : celle de l'adresse, sinon la plus récente du filtre (ou de toutes)
    let id = wantedId;
    if (!id) {
      const all = Store.leads();
      const first = all.filter(filterOf()[2])[0] || all[0];
      id = first ? first.id : null;
    }
    let l = id ? Store.lead(id) : null;
    let auto = false;
    // Seule une demande choisie par le gérant passe « en cours » ; l'affichage par défaut ne change rien
    if (l && wantedId && l.status === 'nouvelle') { Store.setLeadStatus(l.id, 'en-cours'); l = Store.lead(l.id); auto = true; }
    ui.leadCurrent = l ? l.id : null;

    const total = Store.leads().length;
    const unread = Store.unreadCount();
    const detail = l
      ? `<div class="g-d-ldgrid">${leadSectionsHTML(l, true)}</div>`
      : (wantedId
        ? emptyState('inbox', 'Cette demande n’existe plus', 'Choisissez une autre demande dans la liste.', '')
        : emptyState('inbox', 'Aucune demande pour le moment', 'Les messages envoyés depuis le site arriveront ici.', ''));
    const body = `<div class="g-d-leads">
      <section class="g-d-lcol" aria-label="Liste des demandes">
        <div class="g-segtabs g-d-seg" role="group" aria-label="Filtrer les demandes">
          ${LEAD_FILTERS.map(([k, lab]) => `<button type="button" class="g-segtab" data-lfilter="${k}" aria-pressed="${ui.leadFilter === k}">${lab}</button>`).join('')}
        </div>
        <div class="g-search g-d-search">
          <label for="g-lq" class="visually-hidden">Rechercher une demande par nom</label>
          ${icon('search')}
          <input class="input g-search-input" id="g-lq" type="search" placeholder="Rechercher un nom…" autocomplete="off" value="${esc(ui.leadQuery)}">
        </div>
        <p class="g-count" id="g-lcount" aria-live="polite"></p>
        <div class="g-d-lscroll" id="g-llist-wrap"></div>
      </section>
      <section class="g-d-ldetail" aria-label="Détail de la demande">${detail}</section>
    </div>`;
    mountDesk({
      nav: 'demandes', title: 'Demandes',
      sub: plural(total, 'demande', 'demandes') + (unread ? ' · ' + plural(unread, 'nouvelle', 'nouvelles') : ' · tout est lu'),
      body
    });
    if (explicit && l) qs('#g-client-h').setAttribute('data-g-focus', '');

    const draw = () => {
      const f = filterOf();
      const words = norm(ui.leadQuery).split(/\s+/).filter(Boolean);
      const match = (x) => words.every((w) => norm(x.name).includes(w));
      // La demande affichée reste dans la liste même si elle ne correspond plus au filtre
      const list = Store.leads().filter((x) => (f[2](x) || x.id === ui.leadCurrent) && match(x));
      const wrap = qs('#g-llist-wrap');
      qs('#g-lcount').textContent = plural(list.length, 'demande', 'demandes') + (f[0] === 'toutes' ? '' : ' · ' + f[1].toLowerCase());
      if (!list.length) {
        const msg = words.length ? ['Aucun résultat', 'Aucune demande au nom de « ' + esc(ui.leadQuery.trim()) + ' ».'] : LEAD_EMPTY[f[0]];
        wrap.innerHTML = emptyState(words.length ? 'search' : 'inbox', msg[0], msg[1], f[0] !== 'toutes' ? '<button type="button" class="btn btn-ghost g-d-btn" data-lall>Voir toutes les demandes</button>' : '');
        const all = qs('[data-lall]', wrap);
        if (all) all.addEventListener('click', () => setFilter('toutes'));
        return;
      }
      wrap.innerHTML = '<ul class="g-llist">' + list.map((x) => leadRowHTML(x, x.id === ui.leadCurrent)).join('') + '</ul>';
    };
    const setFilter = (k) => {
      ui.leadFilter = k;
      qsa('[data-lfilter]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lfilter === k)));
      draw();
    };
    qsa('[data-lfilter]').forEach((b) => b.addEventListener('click', () => setFilter(b.dataset.lfilter)));
    const lq = qs('#g-lq');
    lq.addEventListener('input', () => { ui.leadQuery = lq.value; draw(); });
    draw();
    // Garder la position de défilement de la liste d'une demande à l'autre
    const scroller = qs('#g-llist-wrap');
    if (ui.leadScroll) scroller.scrollTop = ui.leadScroll;
    scroller.addEventListener('click', (e) => { if (e.target.closest('a')) ui.leadScroll = scroller.scrollTop; });
    if (l) {
      bindLeadDetail(l.id, () => {
        draw();
        const n = Store.unreadCount();
        const sub = qs('.g-d-sub');
        if (sub) sub.textContent = plural(Store.leads().length, 'demande', 'demandes') + (n ? ' · ' + plural(n, 'nouvelle', 'nouvelles') : ' · tout est lu');
      });
    }
    if (auto) UI.toast('Demande passée « En cours ».');
  }

  /* =========================================================
     Aiguillage
     ========================================================= */
  function onRootClick(e) {
    const a = e.target.closest('a[href^="#"]');
    if (!a || !root || !root.contains(a)) return;
    const href = a.getAttribute('href');
    if (href === '#gerant-ajout') {
      // Déjà sur le formulaire d'ajout : simple retour en haut
      if (location.hash === href && qs('#g-form[data-mode="ajout"]')) { e.preventDefault(); scrollToTop(); return; }
      ui.successId = null;
    }
    if (href === location.hash) { e.preventDefault(); App.render(); }
  }

  /* Fichier lâché hors de la zone « Photos » : on évite que le navigateur l'ouvre */
  function onRootDrag(e) {
    if (!isDesk() || !hasFiles(e) || !qs('#g-d-drop')) return;
    e.preventDefault();
    if (e.type === 'drop') UI.toast('Déposez les photos dans la zone « Photos » du formulaire.');
  }

  function render(route, rootEl) {
    if (root && root !== rootEl) root = null;
    const view = route.view === 'desktop' ? 'desktop' : 'phone';
    const prev = ui.lastRoute;
    // Bascule téléphone ↔ ordinateur sur la même fiche : la saisie en cours est gardée
    if (root && prev && prev.view !== view && route.page === 'modifier' && prev.page === 'modifier' && prev.id === route.id &&
      ui.form && ui.form.mode === 'modifier' && qs('#g-form')) {
      ui.editCarry = { id: route.id, data: readForm(), critairTouched: ui.form.critairTouched };
    }
    if (root) snapshotDraft();
    root = rootEl;
    if (boundRoot !== rootEl) {
      rootEl.addEventListener('click', onRootClick);
      rootEl.addEventListener('dragover', onRootDrag);
      rootEl.addEventListener('drop', onRootDrag);
      boundRoot = rootEl;
    }
    ui.view = view;
    ui.sheet = null;
    ui.pop = null;
    if (route.page !== 'ajout') ui.successId = null;
    if (route.page !== 'ajout' && route.page !== 'modifier') ui.form = null;
    if (route.page !== 'stock') ui.selected.clear();
    if (route.page !== 'demandes' && route.page !== 'demande') ui.leadScroll = 0;
    ui.lastRoute = { page: route.page, id: route.id, view };

    const desk = isDesk();
    const logged = Session.loggedIn();
    if (route.page === 'connexion' && logged) { location.replace('#gerant-stock'); return; }
    if (!logged) { if (desk) renderLoginDesk(); else renderLogin(); }
    else if (route.page === 'ajout') renderAjout();
    else if (route.page === 'modifier') renderEdit(route.id);
    else if (route.page === 'demandes') { if (desk) renderLeadsDesk(null, false); else renderLeads(); }
    else if (route.page === 'demande') { if (desk) renderLeadsDesk(route.id, true); else renderLead(route.id); }
    else if (desk) renderStockDesk();
    else renderStock();

    // Accessibilité : après une navigation, le focus va au titre de la page (ou à la cible désignée)
    if (ui.navCount++ > 0) {
      const h = qs('[data-g-focus]') || qs('.g-top-title');
      if (h) h.focus({ preventScroll: true });
    }
  }

  /* Écouteurs globaux (une seule fois) */
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || !root) return;
    if (ui.sheet) { closeSheet(); return; }
    if (ui.pop) { closePop(true); return; }
    const menu = qs('#g-menu');
    if (menu && !menu.hidden) { setMenu(false); qs('#g-menu-btn').focus(); }
  });
  document.addEventListener('click', (e) => {
    if (!root) return;
    const menu = qs('#g-menu');
    if (menu && !menu.hidden && !e.target.closest('.g-menu-wrap')) setMenu(false);
    if (ui.pop && !e.target.closest('.g-d-pop, [data-st]')) closePop();
  });
  Store.on(updateBadges);

  window.GerantApp = { render, desktopReady: true };
})();
