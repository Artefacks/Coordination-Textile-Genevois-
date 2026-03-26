/**
 * Reviva — état garde-robe (mémoire + localStorage)
 * Clé : rt_wardrobe_v1
 */
(function (global) {
  var STORAGE_KEY = 'rt_wardrobe_v1';

  function newId() {
    if (global.crypto && typeof global.crypto.randomUUID === 'function') {
      return global.crypto.randomUUID();
    }
    return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 9);
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function emptyState() {
    return { garments: [], outfits: [], donationBagIds: [] };
  }

  function ensureDonationState(state) {
    if (!state) return;
    if (!Array.isArray(state.donationBagIds)) {
      state.donationBagIds = [];
    }
  }

  function pruneDonationBag(state) {
    ensureDonationState(state);
    state.donationBagIds = state.donationBagIds.filter(function (id) {
      return !!getGarment(state, id);
    });
  }

  function loadState() {
    try {
      var raw = global.localStorage.getItem(STORAGE_KEY);
      if (!raw) return emptyState();
      var data = JSON.parse(raw);
      if (!data || !Array.isArray(data.garments) || !Array.isArray(data.outfits)) return emptyState();
      ensureDonationState(data);
      pruneDonationBag(data);
      return data;
    } catch (e) {
      return emptyState();
    }
  }

  function saveState(state) {
    try {
      global.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn('wardrobe-store: save failed', e);
    }
  }

  function getGarment(state, id) {
    return state.garments.find(function (g) {
      return g.id === id;
    });
  }

  function getOutfit(state, id) {
    return state.outfits.find(function (o) {
      return o.id === id;
    });
  }

  function getGarmentsFiltered(state, category) {
    if (!category) return state.garments.slice();
    return state.garments.filter(function (g) {
      return g.category === category;
    });
  }

  function addGarment(state, payload) {
    var t = nowIso();
    var g = {
      id: newId(),
      name: payload.name || 'Sans nom',
      category: payload.category || 'haut',
      etat: payload.etat || '',
      taches: payload.taches || '',
      commentaire: payload.commentaire || '',
      donnable: payload.donnable || '',
      photoDataUrl: payload.photoDataUrl || null,
      createdAt: t,
      updatedAt: t,
    };
    state.garments.push(g);
    return g;
  }

  function updateGarment(state, id, payload) {
    var g = getGarment(state, id);
    if (!g) return null;
    if (payload.name != null) g.name = payload.name;
    if (payload.category != null) g.category = payload.category;
    if (payload.etat != null) g.etat = payload.etat;
    if (payload.taches != null) g.taches = payload.taches;
    if (payload.commentaire != null) g.commentaire = payload.commentaire;
    if (payload.donnable != null) g.donnable = payload.donnable;
    if (payload.photoDataUrl !== undefined) g.photoDataUrl = payload.photoDataUrl;
    g.updatedAt = nowIso();
    return g;
  }

  function deleteGarment(state, id) {
    var i = state.garments.findIndex(function (g) {
      return g.id === id;
    });
    if (i === -1) return false;
    state.garments.splice(i, 1);
    ensureDonationState(state);
    state.donationBagIds = state.donationBagIds.filter(function (gid) {
      return gid !== id;
    });
    state.outfits.forEach(function (o) {
      o.garmentIds = (o.garmentIds || []).filter(function (gid) {
        return gid !== id;
      });
    });
    return true;
  }

  function addToDonationBag(state, garmentId) {
    ensureDonationState(state);
    if (!getGarment(state, garmentId)) return false;
    if (state.donationBagIds.indexOf(garmentId) !== -1) return false;
    state.donationBagIds.push(garmentId);
    return true;
  }

  function removeFromDonationBag(state, garmentId) {
    ensureDonationState(state);
    var idx = state.donationBagIds.indexOf(garmentId);
    if (idx === -1) return false;
    state.donationBagIds.splice(idx, 1);
    return true;
  }

  function isInDonationBag(state, garmentId) {
    ensureDonationState(state);
    return state.donationBagIds.indexOf(garmentId) !== -1;
  }

  function getDonationBagGarments(state) {
    ensureDonationState(state);
    var out = [];
    state.donationBagIds.forEach(function (id) {
      var g = getGarment(state, id);
      if (g) out.push(g);
    });
    return out;
  }

  function addOutfit(state, payload) {
    var t = nowIso();
    var o = {
      id: newId(),
      name: payload.name || 'Sans titre',
      garmentIds: Array.isArray(payload.garmentIds) ? payload.garmentIds.slice() : [],
      layout: Array.isArray(payload.layout) ? payload.layout.slice() : [],
      createdAt: t,
      updatedAt: t,
    };
    state.outfits.push(o);
    return o;
  }

  function updateOutfit(state, id, payload) {
    var o = getOutfit(state, id);
    if (!o) return null;
    if (payload.name != null) o.name = payload.name;
    if (payload.garmentIds != null) o.garmentIds = payload.garmentIds.slice();
    if (payload.layout != null) o.layout = payload.layout.slice();
    o.updatedAt = nowIso();
    return o;
  }

  function deleteOutfit(state, id) {
    var i = state.outfits.findIndex(function (o) {
      return o.id === id;
    });
    if (i === -1) return false;
    state.outfits.splice(i, 1);
    return true;
  }

  global.WardrobeStore = {
    STORAGE_KEY: STORAGE_KEY,
    loadState: loadState,
    saveState: saveState,
    newId: newId,
    getGarment: getGarment,
    getOutfit: getOutfit,
    getGarmentsFiltered: getGarmentsFiltered,
    addGarment: addGarment,
    updateGarment: updateGarment,
    deleteGarment: deleteGarment,
    addOutfit: addOutfit,
    updateOutfit: updateOutfit,
    deleteOutfit: deleteOutfit,
    emptyState: emptyState,
    ensureDonationState: ensureDonationState,
    addToDonationBag: addToDonationBag,
    removeFromDonationBag: removeFromDonationBag,
    isInDonationBag: isInDonationBag,
    getDonationBagGarments: getDonationBagGarments,
  };
})(typeof window !== 'undefined' ? window : this);
