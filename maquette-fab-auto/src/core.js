/* =========================================================
   Maquette garage — noyau commun
   Config du garage, données de démo, stockage local, routeur,
   utilitaires. Chargé AVANT carart.js, public.js et gerant.js.
   ========================================================= */
(function () {
  'use strict';

  /* ---------- Identité du garage (à remplacer pour chaque client) ---------- */
  const GARAGE = {
    name: 'Fab Auto',
    short: 'FA',
    tagline: 'Achat, vente, réparation, reprogrammation et dépannage',
    address: '',                 // rue à compléter : la carte de visite indique une autre adresse
    city: '27860 Heudicourt',
    phone: '06 23 55 22 00',
    email: 'fabauto.gsr@gmail.com',
    socials: [['Facebook', 'Fabauto'], ['Snapchat', 'Fabiezz']],
    hours: [                     // horaires à confirmer avec le garage
      ['Lundi \u2013 vendredi', '8 h 30 \u2013 12 h 00 · 14 h 00 \u2013 18 h 30'],
      ['Samedi', '9 h 00 \u2013 12 h 00'],
      ['Dimanche', 'Fermé']
    ],
    since: null                  // année d'ouverture inconnue : non affichée
  };

  /* Logo : silhouette de voiture en traits blancs sur fond anthracite, comme la carte de visite */
  const LOGO_SVG = '<svg viewBox="0 0 64 40" fill="none" stroke-linecap="round" aria-hidden="true" focusable="false">' +
    '<path d="M6 27c9-1.5 15-8 22-14.5C34 7 42 5.5 50 8.5" stroke="#fff" stroke-width="2.6"/>' +
    '<path d="M15 25c6-1.8 10.5-6.8 16.5-10.8C37 10.6 43 10.2 48.5 12.4" stroke="#fff" stroke-width="1.5"/>' +
    '<path d="M3 31.5c14 .4 28-.8 43-4.2 4.6-1 8.6-2.6 12-4.8" stroke="#fff" stroke-width="2.1"/>' +
    '<path d="M38.5 33.5a6.2 6.2 0 0 1 12.2-1.6" stroke="#fff" stroke-width="2.1"/>' +
    '<path d="M55 30l4-6M59 30l4-6" stroke="var(--logo-accent)" stroke-width="2.2"/>' +
    '</svg>';
  /** Marque complète : pictogramme + « FAB AUTO » (AUTO dans la couleur de marque). */
  const Brand = {
    mark: (cls) => '<span class="brand-mark ' + (cls || '') + '" aria-hidden="true">' + LOGO_SVG + '</span>',
    word: (cls) => '<span class="brand-word ' + (cls || '') + '"><span class="brand-word-a">FAB</span> <span class="brand-word-b">AUTO</span></span>',
    /** Adresse sur une ou deux lignes (HTML), sans ligne vide si la rue est inconnue */
    addressHtml: () => (GARAGE.address ? esc(GARAGE.address) + '<br>' : '') + esc(GARAGE.city),
    addressText: () => [GARAGE.address, GARAGE.city].filter(Boolean).join(', ')
  };

  /* ---------- Listes de référence ---------- */
  const LISTS = {
    makes: ['Citroën', 'Dacia', 'Fiat', 'Ford', 'Peugeot', 'Renault', 'Skoda', 'Tesla', 'Toyota', 'Volkswagen'],
    fuels: ['Essence', 'Diesel', 'Hybride', 'Électrique'],
    gearboxes: ['Manuelle', 'Automatique'],
    bodies: [
      ['citadine', 'Citadine'], ['compacte', 'Compacte'], ['berline', 'Berline'],
      ['suv', 'SUV'], ['break', 'Break'], ['utilitaire', 'Utilitaire']
    ],
    statuses: [['disponible', 'Disponible'], ['reserve', 'Réservé'], ['vendu', 'Vendu']],
    leadStatuses: [['nouvelle', 'Nouvelle'], ['en-cours', 'En cours'], ['conclue', 'Conclue'], ['perdue', 'Sans suite']],
    financing: [['comptant', 'Paiement comptant'], ['credit', 'Crédit auto'], ['loa', 'LOA / LLD'], ['ne-sait-pas', 'Je ne sais pas encore']],
    colors: [
      ['Blanc', '#eef0f2'], ['Noir', '#17191c'], ['Gris', '#7d838b'], ['Gris foncé', '#3c4148'],
      ['Bleu', '#1f4fa3'], ['Rouge', '#b3242a'], ['Vert', '#2f5d46'], ['Beige', '#c9b79a']
    ]
  };

  /* ---------- Données de démonstration ---------- */
  const now = Date.now();
  const daysAgo = (d, h = 0) => new Date(now - d * 864e5 - h * 36e5).toISOString();

  const SEED_VEHICLES = [
    { id: 'v1', ref: 'VO-0142', make: 'Peugeot', model: '208', version: '1.2 PureTech 100 Allure', year: 2021, month: 3, km: 38500, fuel: 'Essence', gearbox: 'Manuelle', cv: 5, hp: 100, color: 'Bleu', colorHex: '#1f4fa3', body: 'citadine', doors: 5, seats: 5, critair: '1', price: 15490, priceType: 'TTC', firstHand: true, warrantyMonths: 12, status: 'disponible', addedAt: daysAgo(2), soldAt: null, featured: true,
      equipment: ['Écran tactile 10"', 'Apple CarPlay / Android Auto', 'Caméra de recul', 'Climatisation automatique', 'Régulateur de vitesse', 'Jantes alliage 16"'],
      description: 'Première main, carnet d’entretien à jour chez Peugeot. Contrôle technique vierge, deux clés, pneus avant neufs.', photos: ['img/photo-peugeot-208.webp'] },
    { id: 'v2', ref: 'VO-0139', make: 'Renault', model: 'Clio V', version: 'TCe 90 Evolution', year: 2022, month: 6, km: 24900, fuel: 'Essence', gearbox: 'Manuelle', cv: 4, hp: 90, color: 'Blanc', colorHex: '#eef0f2', body: 'citadine', doors: 5, seats: 5, critair: '1', price: 14990, priceType: 'TTC', firstHand: true, warrantyMonths: 12, status: 'disponible', addedAt: daysAgo(4), soldAt: null, featured: false,
      equipment: ['GPS', 'Aide au stationnement arrière', 'Allumage automatique des feux', 'Bluetooth', 'Limiteur de vitesse'],
      description: 'Faible kilométrage, idéale jeune conducteur (4 CV). Garantie 12 mois pièces et main-d’œuvre incluse.', photos: ['img/photo-renault-clio.webp'] },
    { id: 'v3', ref: 'VO-0137', make: 'Dacia', model: 'Duster', version: 'Blue dCi 115 4x2 Journey', year: 2023, month: 2, km: 31200, fuel: 'Diesel', gearbox: 'Manuelle', cv: 6, hp: 115, color: 'Gris foncé', colorHex: '#3c4148', body: 'suv', doors: 5, seats: 5, critair: '2', price: 19900, priceType: 'TTC', firstHand: true, warrantyMonths: 12, status: 'disponible', addedAt: daysAgo(6), soldAt: null, featured: true,
      equipment: ['Caméra multivue', 'Écran 8" connecté', 'Barres de toit', 'Climatisation automatique', 'Démarrage sans clé'],
      description: 'SUV robuste et économique, entretien Dacia à jour. Attelage possible sur demande.', photos: ['img/photo-dacia-duster.webp'] },
    { id: 'v4', ref: 'VO-0133', make: 'Volkswagen', model: 'Golf 8', version: '1.5 eTSI 150 DSG7 Life', year: 2021, month: 9, km: 52000, fuel: 'Hybride', gearbox: 'Automatique', cv: 8, hp: 150, color: 'Gris', colorHex: '#7d838b', body: 'compacte', doors: 5, seats: 5, critair: '1', price: 22490, priceType: 'TTC', firstHand: false, warrantyMonths: 12, status: 'disponible', addedAt: daysAgo(11), soldAt: null, featured: true,
      equipment: ['Digital Cockpit', 'Régulateur adaptatif', 'Phares LED', 'Sièges chauffants', 'Recharge sans fil', 'Volant chauffant'],
      description: 'Hybridation légère 48 V, boîte DSG7. Historique complet, factures disponibles.', photos: ['img/photo-vw-golf.webp'] },
    { id: 'v5', ref: 'VO-0131', make: 'Toyota', model: 'Yaris', version: 'Hybride 116h Design', year: 2022, month: 4, km: 29800, fuel: 'Hybride', gearbox: 'Automatique', cv: 5, hp: 116, color: 'Rouge', colorHex: '#b3242a', body: 'citadine', doors: 5, seats: 5, critair: '1', price: 18990, priceType: 'TTC', firstHand: true, warrantyMonths: 12, status: 'disponible', addedAt: daysAgo(14), soldAt: null, featured: false,
      equipment: ['Toyota Safety Sense', 'Caméra de recul', 'Climatisation automatique', 'Apple CarPlay / Android Auto'],
      description: 'Consommation moyenne relevée : 4,1 L/100 km. Batterie hybride sous garantie constructeur.', photos: ['img/photo-toyota-yaris.webp'] },
    { id: 'v6', ref: 'VO-0128', make: 'Citroën', model: 'C5 Aircross', version: 'PureTech 130 EAT8 Shine', year: 2020, month: 11, km: 61000, fuel: 'Essence', gearbox: 'Automatique', cv: 7, hp: 130, color: 'Noir', colorHex: '#17191c', body: 'suv', doors: 5, seats: 5, critair: '1', price: 21900, priceType: 'TTC', firstHand: false, warrantyMonths: 12, status: 'reserve', addedAt: daysAgo(20), soldAt: null, featured: false,
      equipment: ['Suspensions à butées hydrauliques', 'Toit ouvrant panoramique', 'Hayon électrique', 'Sièges Advanced Comfort'],
      description: 'SUV familial très confortable, toit panoramique, entretien Citroën à jour.', photos: ['img/photo-citroen-c5-aircross.webp'] },
    { id: 'v7', ref: 'VO-0125', make: 'Renault', model: 'Mégane IV Estate', version: 'Blue dCi 115 Business', year: 2020, month: 1, km: 88000, fuel: 'Diesel', gearbox: 'Manuelle', cv: 6, hp: 115, color: 'Gris', colorHex: '#7d838b', body: 'break', doors: 5, seats: 5, critair: '2', price: 14490, priceType: 'TTC', firstHand: false, warrantyMonths: 6, status: 'disponible', addedAt: daysAgo(27), soldAt: null, featured: false,
      equipment: ['GPS', 'Radars de recul', 'Régulateur de vitesse', 'Coffre 580 L'],
      description: 'Break familial spacieux, distribution faite à 80 000 km.', photos: ['img/photo-renault-megane-estate.webp'] },
    { id: 'v8', ref: 'VO-0122', make: 'Tesla', model: 'Model 3', version: 'Propulsion', year: 2021, month: 7, km: 64000, fuel: 'Électrique', gearbox: 'Automatique', cv: 3, hp: 325, color: 'Blanc', colorHex: '#eef0f2', body: 'berline', doors: 4, seats: 5, critair: 'E', price: 27900, priceType: 'TTC', firstHand: true, warrantyMonths: 12, status: 'disponible', addedAt: daysAgo(31), soldAt: null, featured: true,
      equipment: ['Autopilot', 'Toit en verre', 'Sièges chauffants', 'Recharge rapide 170 kW', 'Écran 15"'],
      description: 'Autonomie WLTP 448 km, état de santé batterie 93 % (rapport fourni). Câble de recharge inclus.', photos: ['img/photo-tesla-model-3.webp'] },
    { id: 'v9', ref: 'VO-0119', make: 'Peugeot', model: '3008', version: '1.5 BlueHDi 130 EAT8 GT', year: 2021, month: 5, km: 57000, fuel: 'Diesel', gearbox: 'Automatique', cv: 7, hp: 130, color: 'Gris foncé', colorHex: '#3c4148', body: 'suv', doors: 5, seats: 5, critair: '2', price: 25900, priceType: 'TTC', firstHand: true, warrantyMonths: 12, status: 'disponible', addedAt: daysAgo(36), soldAt: null, featured: false,
      equipment: ['i-Cockpit 3D', 'Full LED', 'Caméra 360°', 'Hayon mains libres', 'Grip Control'],
      description: 'Finition GT, très bien équipée. Révision complète effectuée à la reprise.', photos: ['img/photo-peugeot-3008.webp'] },
    { id: 'v10', ref: 'VO-0116', make: 'Fiat', model: '500', version: '1.0 Hybrid 70 Dolcevita', year: 2022, month: 3, km: 18000, fuel: 'Hybride', gearbox: 'Manuelle', cv: 4, hp: 70, color: 'Beige', colorHex: '#c9b79a', body: 'citadine', doors: 3, seats: 4, critair: '1', price: 12990, priceType: 'TTC', firstHand: true, warrantyMonths: 12, status: 'vendu', addedAt: daysAgo(40), soldAt: daysAgo(3), featured: false,
      equipment: ['Toit vitré fixe', 'Écran 7" connecté', 'Climatisation', 'Jantes 16"'],
      description: 'Citadine idéale en ville, entretien à jour, deux clés.', photos: ['img/photo-fiat-500.webp'] },
    { id: 'v11', ref: 'VO-0112', make: 'Renault', model: 'Trafic Fourgon', version: 'L2H1 Blue dCi 130 Grand Confort', year: 2020, month: 10, km: 98000, fuel: 'Diesel', gearbox: 'Manuelle', cv: 8, hp: 130, color: 'Blanc', colorHex: '#eef0f2', body: 'utilitaire', doors: 4, seats: 3, critair: '2', price: 21900, priceType: 'HT', firstHand: true, warrantyMonths: 6, status: 'disponible', addedAt: daysAgo(45), soldAt: null, featured: false,
      equipment: ['Cloison de séparation', 'Galerie de toit', 'Attelage', 'Radars de recul', 'Banquette 2 places'],
      description: 'Idéal artisan, TVA récupérable. Habillage bois du plancher et des parois.', photos: ['img/photo-renault-trafic.webp'] },
    { id: 'v12', ref: 'VO-0108', make: 'Skoda', model: 'Octavia Combi', version: '2.0 TDI 150 DSG7 Style', year: 2021, month: 2, km: 72000, fuel: 'Diesel', gearbox: 'Automatique', cv: 8, hp: 150, color: 'Vert', colorHex: '#2f5d46', body: 'break', doors: 5, seats: 5, critair: '2', price: 23490, priceType: 'TTC', firstHand: false, warrantyMonths: 12, status: 'disponible', addedAt: daysAgo(52), soldAt: null, featured: false,
      equipment: ['Virtual Cockpit', 'Régulateur adaptatif', 'Hayon électrique', 'Sièges chauffants AV/AR', 'Coffre 640 L'],
      description: 'Le break le plus logeable de sa catégorie. Entretien Skoda à jour.', photos: ['img/photo-skoda-octavia.webp'] }
  ];

  const SEED_LEADS = [
    { id: 'd1', vehicleId: 'v1', name: 'Julie Moreau', phone: '06 12 34 56 78', email: 'julie.moreau@exemple.fr', message: 'Bonjour, la 208 est-elle toujours disponible ? Je peux passer samedi matin pour un essai.', tradeIn: true, tradeInDesc: 'Clio III 2011, 142 000 km', financing: 'credit', status: 'nouvelle', createdAt: daysAgo(0, 2), notes: [] },
    { id: 'd2', vehicleId: 'v8', name: 'Thomas Leroy', phone: '06 98 76 54 32', email: 'thomas.leroy@exemple.fr', message: 'Avez-vous le rapport de batterie ? Le prix est-il négociable ?', tradeIn: false, tradeInDesc: '', financing: 'loa', status: 'nouvelle', createdAt: daysAgo(0, 5), notes: [] },
    { id: 'd3', vehicleId: 'v3', name: 'Karim Benali', phone: '07 11 22 33 44', email: 'k.benali@exemple.fr', message: 'Je cherche un SUV diesel pour tracter une petite remorque. Le Duster peut-il être équipé d’un attelage ?', tradeIn: true, tradeInDesc: 'Scénic 2014, 168 000 km', financing: 'comptant', status: 'en-cours', createdAt: daysAgo(1, 3), notes: [{ at: daysAgo(1, 1), text: 'Rappelé : devis attelage envoyé (390 € posé).' }] },
    { id: 'd4', vehicleId: 'v6', name: 'Sophie Garnier', phone: '06 55 44 33 22', email: 'sophie.garnier@exemple.fr', message: 'Intéressée par le C5 Aircross, est-il possible de le voir samedi ?', tradeIn: false, tradeInDesc: '', financing: 'credit', status: 'en-cours', createdAt: daysAgo(3), notes: [{ at: daysAgo(2), text: 'RDV samedi 10 h. Véhicule passé en Réservé.' }] },
    { id: 'd5', vehicleId: 'v10', name: 'Marc Petit', phone: '06 01 02 03 04', email: 'marc.petit@exemple.fr', message: 'Pour ma fille, premier véhicule. Disponible quand ?', tradeIn: false, tradeInDesc: '', financing: 'comptant', status: 'conclue', createdAt: daysAgo(9), notes: [{ at: daysAgo(3), text: 'Vendue. Livraison faite.' }] }
  ];

  /* ---------- Stockage local (démo uniquement, jamais fiable) ---------- */
  const KEY = 'garage-maquette-v3';   // v3 : vraies photos (prises sur le parking) pour les 12 véhicules
  const clone = (o) => JSON.parse(JSON.stringify(o));
  let state = { vehicles: clone(SEED_VEHICLES), leads: clone(SEED_LEADS) };
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) { const s = JSON.parse(raw); if (s && Array.isArray(s.vehicles) && Array.isArray(s.leads)) state = s; }
  } catch (e) { /* stockage indisponible : on garde les données de démo */ }

  const listeners = new Set();
  function persist() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); }
    catch (e) {
      // Quota dépassé (photos volumineuses) : on garde en mémoire seulement
      UI && UI.toast && UI.toast('Mémoire du navigateur pleine : la démo continue sans sauvegarder.');
    }
    listeners.forEach((fn) => { try { fn(); } catch (e) { console.error(e); } });
  }
  const nextId = (prefix, list) => prefix + (list.reduce((m, x) => Math.max(m, parseInt(String(x.id).slice(1), 10) || 0), 0) + 1);

  const Store = {
    vehicles: () => state.vehicles.slice(),
    vehicle: (id) => state.vehicles.find((v) => v.id === id) || null,
    /** Crée (sans id) ou met à jour un véhicule. Retourne le véhicule enregistré. */
    saveVehicle(data) {
      if (data.id && Store.vehicle(data.id)) {
        state.vehicles = state.vehicles.map((v) => (v.id === data.id ? Object.assign({}, v, data) : v));
      } else {
        const id = nextId('v', state.vehicles);
        const refNum = state.vehicles.reduce((m, v) => Math.max(m, parseInt(String(v.ref).replace(/\D/g, ''), 10) || 0), 0) + 1;
        data = Object.assign({ status: 'disponible', photos: [], equipment: [], featured: false, soldAt: null, warrantyMonths: 12, priceType: 'TTC', doors: 5, seats: 5 }, data,
          { id, ref: 'VO-' + String(refNum).padStart(4, '0'), addedAt: new Date().toISOString() });
        state.vehicles = [data].concat(state.vehicles);
      }
      persist();
      return Store.vehicle(data.id);
    },
    deleteVehicle(id) { state.vehicles = state.vehicles.filter((v) => v.id !== id); persist(); },
    setStatus(id, status) {
      const v = Store.vehicle(id); if (!v) return;
      // Repasser un véhicule en vente le remet automatiquement sur le site
      const patch = { id, status, soldAt: status === 'vendu' ? new Date().toISOString() : null };
      if (status !== 'vendu') patch.hiddenFromSite = false;
      Store.saveVehicle(patch);
    },
    /** Retire (true) ou remet (false) un véhicule sur le site public, sans le supprimer du stock. */
    setHidden(id, hidden) { if (Store.vehicle(id)) Store.saveVehicle({ id, hiddenFromSite: !!hidden }); },
    leads: () => state.leads.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    lead: (id) => state.leads.find((l) => l.id === id) || null,
    /** Enregistre une demande envoyée depuis le site public. */
    addLead(data) {
      const lead = Object.assign({ status: 'nouvelle', notes: [], tradeIn: false, tradeInDesc: '', financing: 'ne-sait-pas' }, data,
        { id: nextId('d', state.leads), createdAt: new Date().toISOString() });
      state.leads = [lead].concat(state.leads); persist(); return lead;
    },
    setLeadStatus(id, status) { state.leads = state.leads.map((l) => (l.id === id ? Object.assign({}, l, { status }) : l)); persist(); },
    addLeadNote(id, text) {
      state.leads = state.leads.map((l) => (l.id === id ? Object.assign({}, l, { notes: l.notes.concat([{ at: new Date().toISOString(), text }]) }) : l));
      persist();
    },
    unreadCount: () => state.leads.filter((l) => l.status === 'nouvelle').length,
    reset() { state = { vehicles: clone(SEED_VEHICLES), leads: clone(SEED_LEADS) }; persist(); },
    on(fn) { listeners.add(fn); return () => listeners.delete(fn); }
  };

  /* ---------- Utilitaires ---------- */
  const nf = new Intl.NumberFormat('fr-FR');
  const fmt = {
    price: (n) => nf.format(Math.round(n)) + ' €',
    km: (n) => nf.format(Math.round(n)) + ' km',
    number: (n) => nf.format(n),
    /** « 03/2021 » */
    circulation: (v) => String(v.month || 1).padStart(2, '0') + '/' + v.year,
    date: (iso) => new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }),
    dateShort: (iso) => new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
    time: (iso) => new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
    relative(iso) {
      const s = (Date.now() - new Date(iso).getTime()) / 1000;
      if (s < 60) return 'à l’instant';
      if (s < 3600) return 'il y a ' + Math.floor(s / 60) + ' min';
      if (s < 86400) return 'il y a ' + Math.floor(s / 3600) + ' h';
      const d = Math.floor(s / 86400);
      return d === 1 ? 'hier' : 'il y a ' + d + ' jours';
    },
    /** Libellé lisible d'une valeur de liste : fmt.label('statuses', 'reserve') → « Réservé » */
    label(list, value) { const f = (LISTS[list] || []).find((x) => x[0] === value); return f ? f[1] : value; },
    title: (v) => v.make + ' ' + v.model
  };
  /** Échappement HTML — à utiliser sur TOUTE donnée saisie par un utilisateur. */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  /** Véhicule ajouté depuis moins de 7 jours */
  const isNew = (v) => Date.now() - new Date(v.addedAt).getTime() < 7 * 864e5;
  /** Véhicules visibles côté public : disponibles, réservés, et vendus depuis moins de 7 jours */
  const SOLD_VISIBLE_DAYS = 7;
  /** Visibilité d'un véhicule sur le site : { visible, until } (until = date de retrait automatique d'un vendu) */
  function siteVisibility(v) {
    if (v.hiddenFromSite) return { visible: false, until: null };
    if (v.status !== 'vendu') return { visible: true, until: null };
    if (!v.soldAt) return { visible: false, until: null };
    const until = new Date(new Date(v.soldAt).getTime() + SOLD_VISIBLE_DAYS * 864e5);
    return { visible: until.getTime() > Date.now(), until: until.toISOString() };
  }
  /** Véhicules visibles côté public : en vente, réservés, et vendus depuis moins de 7 jours, sauf ceux retirés à la main */
  const publicVehicles = () => Store.vehicles().filter((v) => siteVisibility(v).visible);

  /* ---------- Médias : photo réelle si envoyée, sinon illustration ---------- */
  const GALLERY_VIEWS = ['side', 'detail', 'interior', 'rear'];
  const Media = {
    count: (v) => (v.photos && v.photos.length ? v.photos.length : GALLERY_VIEWS.length),
    /** HTML d'une image de galerie (index i) qui remplit son conteneur. */
    photo(v, i = 0, alt) {
      const label = esc(alt || (fmt.title(v) + ' ' + v.version));
      if (v.photos && v.photos.length) {
        return '<img class="media-img" src="' + esc(v.photos[i % v.photos.length]) + '" alt="' + label + '" loading="lazy" decoding="async">';
      }
      const svg = window.CarArt ? window.CarArt.svg(v, GALLERY_VIEWS[i % GALLERY_VIEWS.length]) : '';
      return '<div class="media-art" role="img" aria-label="' + label + '">' + svg + '</div>';
    },
    /** Redimensionne une photo envoyée (File) en JPEG ≤ maxW px. Résout une data URL. */
    resize(file, maxW = 1280, quality = 0.78) {
      return new Promise((resolve, reject) => {
        if (!file || !/^image\//.test(file.type)) { reject(new Error('Ce fichier n’est pas une image.')); return; }
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
          const scale = Math.min(1, maxW / img.naturalWidth);
          const c = document.createElement('canvas');
          c.width = Math.round(img.naturalWidth * scale); c.height = Math.round(img.naturalHeight * scale);
          c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
          URL.revokeObjectURL(url);
          resolve(c.toDataURL('image/jpeg', quality));
        };
        img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Image illisible.')); };
        img.src = url;
      });
    }
  };

  /* ---------- Interface commune ---------- */
  const UI = {
    toast(msg) {
      // En mode gérant sur grand écran, le toast s'affiche dans le cadre du téléphone
      const stage = document.getElementById('gerant-stage');
      const inPhone = stage && !stage.hidden && GerantView.get() === 'phone' && DESKTOP_MQ.matches;
      const host = (inPhone && document.querySelector('.phone')) || document.body;
      let zone = host.querySelector(':scope > .toast-zone');
      if (!zone) { zone = document.createElement('div'); zone.className = 'toast-zone'; zone.setAttribute('role', 'status'); zone.setAttribute('aria-live', 'polite'); host.appendChild(zone); }
      const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg; zone.appendChild(t);
      setTimeout(() => t.remove(), 3200);
    },
    /** Petites icônes SVG au trait (24×24, currentColor). */
    icon(name) {
      const P = {
        phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/>',
        mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
        pin: '<path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>',
        clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
        car: '<path d="M5 16v2M19 16v2M3 13l2-6h14l2 6v3H3z"/><circle cx="7.5" cy="13.5" r="1"/><circle cx="16.5" cy="13.5" r="1"/>',
        inbox: '<path d="M3 13h5l1 3h6l1-3h5"/><path d="M5 5h14l2 8v6H3v-6z"/>',
        plus: '<path d="M12 5v14M5 12h14"/>',
        camera: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
        check: '<path d="m5 12 5 5 9-10"/>',
        x: '<path d="M6 6l12 12M18 6 6 18"/>',
        back: '<path d="M15 5l-7 7 7 7"/>',
        chevron: '<path d="m9 5 7 7-7 7"/>',
        search: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/>',
        filter: '<path d="M4 6h16M7 12h10M10 18h4"/>',
        edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
        trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
        'eye-off': '<path d="M3 3l18 18M10.6 6.1A10 10 0 0 1 12 6c6.5 0 10 6 10 6a17 17 0 0 1-3.2 3.9M6.3 7.6C3.6 9.4 2 12 2 12s3.5 7 10 7c1.6 0 3-.4 4.2-1"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
        eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
        shield: '<path d="M12 3 5 6v6c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V6z"/><path d="m9 12 2 2 4-4"/>',
        gauge: '<path d="M4 17a8 8 0 1 1 16 0"/><path d="m12 13 4-4"/>',
        fuel: '<path d="M5 20V5a1 1 0 0 1 1-1h7a1 1 0 0 1 1 1v15M3 20h13M14 9h2l2 2v6a1.5 1.5 0 0 0 3 0v-7l-3-3"/><path d="M7 8h5"/>',
        gear: '<circle cx="6" cy="6" r="2"/><circle cx="6" cy="18" r="2"/><circle cx="18" cy="6" r="2"/><path d="M6 8v8M18 8v4H6"/>',
        calendar: '<rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
        euro: '<path d="M17 6.5A6.5 6.5 0 1 0 17 17.5M4 10.5h9M4 13.5h9"/>',
        logout: '<path d="M10 5H5v14h5M14 8l4 4-4 4M18 12H9"/>',
        menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
        star: '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>',
        swap: '<path d="M7 7h12l-3-3M17 17H5l3 3"/>',
        key: '<circle cx="8" cy="15" r="4"/><path d="m11 12 9-9M17 6l2 2M15 8l2 2"/>',
        tow: '<path d="M2 17V8h9l3 4h5l3 2v3"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/><path d="M11 8l4-4"/>',
        tag: '<path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="8.5" r="1.5"/>'
      };
      return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (P[name] || '') + '</svg>';
    }
  };

  /* ---------- Routeur (hash simple : #showroom, #vehicule-v3, #gerant-stock…) ---------- */
  function parseRoute(hash) {
    const h = (hash || '').replace(/^#/, '');
    let m;
    if (h === '' || h === 'accueil') return { mode: 'public', page: 'accueil' };
    if (h === 'showroom') return { mode: 'public', page: 'showroom' };
    if ((m = h.match(/^vehicule-([a-z0-9]+)$/))) return { mode: 'public', page: 'vehicule', id: m[1] };
    if (h === 'garage') return { mode: 'public', page: 'garage' };
    if (h === 'contact') return { mode: 'public', page: 'contact' };
    if (h === 'mentions') return { mode: 'public', page: 'mentions' };
    if (h === 'gerant') return { mode: 'gerant', page: 'connexion' };
    if (h === 'gerant-stock') return { mode: 'gerant', page: 'stock' };
    if (h === 'gerant-ajout') return { mode: 'gerant', page: 'ajout' };
    if ((m = h.match(/^gerant-modifier-([a-z0-9]+)$/))) return { mode: 'gerant', page: 'modifier', id: m[1] };
    if (h === 'gerant-demandes') return { mode: 'gerant', page: 'demandes' };
    if ((m = h.match(/^gerant-demande-([a-z0-9]+)$/))) return { mode: 'gerant', page: 'demande', id: m[1] };
    return { mode: 'public', page: 'introuvable' };
  }
  const Router = {
    current: () => parseRoute(location.hash),
    go(name) { if (location.hash.replace(/^#/, '') === name) render(); else location.hash = name; }
  };

  /* Session gérant (démo) */
  const Session = {
    loggedIn() { try { return sessionStorage.getItem(KEY + '-auth') === '1'; } catch (e) { return Session._mem === true; } },
    login() { Session._mem = true; try { sessionStorage.setItem(KEY + '-auth', '1'); } catch (e) {} },
    logout() { Session._mem = false; try { sessionStorage.removeItem(KEY + '-auth'); } catch (e) {} }
  };

  /* Vue de l'espace gérant dans la maquette : 'phone' (cadre téléphone) ou 'desktop' (plein écran ordinateur).
     En production il n'y aura qu'une application qui s'adapte à la largeur d'écran. */
  const DESKTOP_MQ = window.matchMedia('(min-width: 900px)');
  const GerantView = {
    _v: 'phone',
    get() {
      let v = GerantView._v;
      try { v = sessionStorage.getItem(KEY + '-view') || v; } catch (e) {}
      return v === 'desktop' && DESKTOP_MQ.matches ? 'desktop' : 'phone';
    },
    set(v) { GerantView._v = v; try { sessionStorage.setItem(KEY + '-view', v); } catch (e) {} }
  };

  /* ---------- Rendu global ---------- */
  let lastMode = null;
  function render() {
    const route = Router.current();
    const pub = document.getElementById('public-root');
    const ger = document.getElementById('gerant-stage');
    pub.hidden = route.mode !== 'public';
    ger.hidden = route.mode !== 'gerant';
    route.view = GerantView.get();
    ger.classList.toggle('is-desktop', route.view === 'desktop');
    document.documentElement.dataset.gerantView = route.view;
    document.querySelectorAll('.demo-switch button').forEach((b) => b.setAttribute('aria-pressed',
      String(b.dataset.mode === route.mode && (route.mode !== 'gerant' || b.dataset.view === route.view))));
    try {
      if (route.mode === 'public' && window.PublicSite) window.PublicSite.render(route, pub);
      if (route.mode === 'gerant' && route.view === 'desktop' && !(window.GerantApp && window.GerantApp.desktopReady)) {
        // Interface ordinateur pas encore livrée : écran d'attente au lieu de la version téléphone étirée
        document.getElementById('gerant-root').innerHTML = '<div style="max-width:560px;margin:12vh auto;padding:0 16px;display:grid;gap:1rem;text-align:center">' +
          '<span class="eyebrow">Gérant · ordinateur</span><h2 style="font-size:var(--fs-2xl)">Interface ordinateur en cours de construction</h2>' +
          '<p style="color:var(--ink-2)">Cette vue montrera le stock en tableau, l’ajout de véhicule avec aperçu en direct et les demandes en vue messagerie. En attendant, la version téléphone est complète.</p>' +
          '<p><button type="button" class="btn btn-primary" id="g-back-phone">Revenir à la version téléphone</button></p></div>';
        document.getElementById('g-back-phone').addEventListener('click', () => { GerantView.set('phone'); render(); });
      } else if (route.mode === 'gerant' && window.GerantApp) window.GerantApp.render(route, document.getElementById('gerant-root'));
      if (route.mode === 'gerant') document.title = 'Espace gérant — ' + GARAGE.name;
    } catch (e) { console.error(e); }
    if (lastMode === route.mode) {
      // Changement de page dans le même espace : on remonte en haut
      if (route.mode === 'gerant') { const s = document.querySelector('.phone-screen'); if (s) s.scrollTop = 0; }
    }
    window.scrollTo(0, 0);
    lastMode = route.mode;
  }

  function initDemoBar() {
    // Expose la hauteur de la barre de démo (--demo-bar-h) pour les en-têtes collants
    const bar = document.querySelector('.demo-bar');
    if (bar) {
      const setH = () => document.documentElement.style.setProperty('--demo-bar-h', bar.offsetHeight + 'px');
      setH();
      if (window.ResizeObserver) new ResizeObserver(setH).observe(bar); else window.addEventListener('resize', setH);
    }
    document.querySelectorAll('.demo-switch button').forEach((b) => b.addEventListener('click', () => {
      if (b.dataset.mode !== 'gerant') { Router.go('accueil'); return; }
      const wasGerant = Router.current().mode === 'gerant';
      GerantView.set(b.dataset.view || 'phone');
      // Passer de la vue téléphone à la vue ordinateur garde la page en cours
      if (wasGerant) render(); else Router.go(Session.loggedIn() ? 'gerant-stock' : 'gerant');
    }));
    document.querySelectorAll('[data-switch-view]').forEach((b) => b.addEventListener('click', () => { GerantView.set(b.dataset.switchView); render(); }));
    DESKTOP_MQ.addEventListener && DESKTOP_MQ.addEventListener('change', () => { if (Router.current().mode === 'gerant') render(); });
    const r = document.querySelector('.demo-bar .reset');
    if (r) r.addEventListener('click', () => { Store.reset(); UI.toast('Démo réinitialisée : données d’origine restaurées.'); render(); });
  }

  /* Point lumineux à l'appui sur un bouton (site et espace gérant) :
     relance l'animation de passage de gauche à droite sur le bouton touché. */
  document.addEventListener('pointerdown', (e) => {
    const btn = e.target.closest && e.target.closest('.p-site .btn, #gerant-root .btn');
    if (!btn || (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)) return;
    btn.classList.remove('is-zap'); void btn.offsetWidth; btn.classList.add('is-zap');
    clearTimeout(btn._zap); btn._zap = setTimeout(() => btn.classList.remove('is-zap'), 600);
  });

  window.App = { GARAGE, Brand, siteVisibility, SOLD_VISIBLE_DAYS, LISTS, Store, fmt, esc, isNew, publicVehicles, Media, UI, Router, Session, GerantView, render };
  window.addEventListener('hashchange', render);
  document.addEventListener('DOMContentLoaded', () => { initDemoBar(); render(); });
})();
