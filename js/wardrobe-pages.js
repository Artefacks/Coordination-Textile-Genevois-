/**
 * Relais Textile — initialisation par page (data-page sur <body>)
 */
(function () {
  var WS = window.WardrobeStore;
  if (!WS) {
    console.error('wardrobe-pages: WardrobeStore manquant');
    return;
  }

  var CATEGORY_LABELS = {
    haut: 'Haut',
    bas: 'Bas',
    chaussures: 'Chaussures',
    accessoires: 'Accessoires',
  };

  function formatDate(iso) {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleDateString('fr-FR');
    } catch (e) {
      return '—';
    }
  }

  function catLabel(cat) {
    return CATEGORY_LABELS[cat] || cat || '—';
  }

  /** Miniature carrée (photo ou picto si pas d’image) — taille en px */
  function createGarmentThumb(g, sizePx) {
    sizePx = sizePx || 48;
    var wrap = document.createElement('span');
    wrap.style.display = 'inline-block';
    wrap.style.flexShrink = '0';
    if (g && g.photoDataUrl) {
      var img = document.createElement('img');
      img.src = g.photoDataUrl;
      img.alt = g.name ? 'Photo : ' + g.name : 'Photo du vêtement';
      img.style.width = sizePx + 'px';
      img.style.height = sizePx + 'px';
      img.style.objectFit = 'cover';
      img.style.borderRadius = '4px';
      img.style.verticalAlign = 'middle';
      img.style.display = 'block';
      wrap.appendChild(img);
    } else {
      var ph = document.createElement('span');
      ph.setAttribute('role', 'img');
      ph.setAttribute('aria-label', 'Pas de photo');
      ph.style.display = 'inline-block';
      ph.style.width = sizePx + 'px';
      ph.style.height = sizePx + 'px';
      ph.style.background = 'var(--rt-border, #ddd)';
      ph.style.borderRadius = '4px';
      ph.style.verticalAlign = 'middle';
      ph.style.textAlign = 'center';
      ph.style.lineHeight = sizePx + 'px';
      ph.style.fontSize = Math.max(14, Math.round(sizePx * 0.45)) + 'px';
      ph.textContent = '🧥';
      wrap.appendChild(ph);
    }
    return wrap;
  }

  /** Aligne layout[] sur garmentIds (positions par défaut pour les nouveaux ids). */
  function syncOutfitLayoutFromIds(outfit) {
    if (!outfit) return;
    var ids = outfit.garmentIds || [];
    var prev = Array.isArray(outfit.layout) ? outfit.layout : [];
    var byId = {};
    prev.forEach(function (L) {
      if (L && L.garmentId) byId[L.garmentId] = L;
    });
    var maxZ = 0;
    prev.forEach(function (L) {
      if (L && L.z != null) maxZ = Math.max(maxZ, L.z);
    });
    var out = [];
    ids.forEach(function (gid, i) {
      if (byId[gid]) {
        var L = byId[gid];
        if (L.w == null || L.w <= 0) L.w = 0.28;
        if (L.x == null) L.x = 0.08 + (i % 3) * 0.26;
        if (L.y == null) L.y = 0.06 + Math.floor(i / 3) * 0.22;
        if (L.z == null) L.z = maxZ + i + 1;
        out.push(L);
      } else {
        maxZ += 1;
        out.push({
          garmentId: gid,
          x: 0.08 + (i % 3) * 0.26,
          y: 0.06 + Math.floor(i / 3) * 0.22,
          z: maxZ,
          w: 0.28
        });
      }
    });
    outfit.layout = out;
  }

  function getParam(name) {
    return new URLSearchParams(window.location.search).get(name);
  }

  function maybeSeed() {
    if (getParam('seed') !== '1') return;
    var state = WS.loadState();
    if (state.garments.length > 0) return;
    WS.addGarment(state, {
      name: 'T-shirt démo',
      category: 'haut',
      etat: 'bon',
      taches: 'non',
      commentaire: '',
      donnable: 'oui',
      photoDataUrl: null,
    });
    WS.addGarment(state, {
      name: 'Jean démo',
      category: 'bas',
      etat: 'neuf',
      taches: 'non',
      commentaire: '',
      donnable: 'oui',
      photoDataUrl: null,
    });
    WS.saveState(state);
  }

  function readRadio(name) {
    var el = document.querySelector('input[name="' + name + '"]:checked');
    return el ? el.value : '';
  }

  function setRadio(name, value) {
    if (!value) return;
    var nodes = document.querySelectorAll('input[name="' + name + '"]');
    for (var i = 0; i < nodes.length; i++) {
      if (nodes[i].value === value) {
        nodes[i].checked = true;
        return;
      }
    }
  }

  function initInventory() {
    maybeSeed();
    var state = WS.loadState();
    var listEl = document.getElementById('garment-list');
    var form = document.getElementById('garment-filter-form');
    var select = document.getElementById('categorie');
    if (!listEl || !select) return;

    function render() {
      var cat = select.value || '';
      var items = WS.getGarmentsFiltered(state, cat);
      listEl.innerHTML = '';
      if (items.length === 0) {
        var empty = document.createElement('li');
        empty.textContent = 'Aucun vêtement pour ce filtre.';
        listEl.appendChild(empty);
        return;
      }
      items.forEach(function (g) {
        var li = document.createElement('li');
        var row = document.createElement('div');
        row.style.display = 'flex';
        row.style.gap = '0.65rem';
        row.style.alignItems = 'flex-start';
        row.appendChild(createGarmentThumb(g, 52));
        var main = document.createElement('div');
        main.style.flex = '1';
        main.style.minWidth = '0';
        var title = document.createElement('strong');
        title.textContent = g.name || 'Sans nom';
        main.appendChild(title);
        main.appendChild(document.createTextNode(' — '));
        var meta = document.createElement('small');
        meta.textContent = catLabel(g.category) + ' · ' + (g.etat || '—');
        main.appendChild(meta);

        var actions = document.createElement('p');
        var edit = document.createElement('a');
        edit.href = 'garde-robe-ajouter-photo.html?edit=' + encodeURIComponent(g.id);
        edit.textContent = 'Modifier';
        actions.appendChild(edit);
        actions.appendChild(document.createTextNode(' — '));
        var del = document.createElement('button');
        del.type = 'button';
        del.textContent = 'Supprimer';
        del.setAttribute('aria-label', 'Supprimer ' + (g.name || 'cet article'));
        del.addEventListener('click', function () {
          if (!confirm('Supprimer « ' + (g.name || 'cet article') + ' » ?')) return;
          WS.deleteGarment(state, g.id);
          WS.saveState(state);
          render();
        });
        actions.appendChild(del);
        if (g.donnable === 'oui') {
          actions.appendChild(document.createTextNode(' — '));
          if (WS.isInDonationBag(state, g.id)) {
            var spanSac = document.createElement('small');
            spanSac.textContent = 'Sac à don';
            actions.appendChild(spanSac);
            actions.appendChild(document.createTextNode(' — '));
            var rmSac = document.createElement('button');
            rmSac.type = 'button';
            rmSac.textContent = 'Retirer du sac';
            rmSac.setAttribute('aria-label', 'Retirer du sac : ' + (g.name || ''));
            rmSac.addEventListener('click', function () {
              WS.removeFromDonationBag(state, g.id);
              WS.saveState(state);
              render();
            });
            actions.appendChild(rmSac);
          } else {
            var addSac = document.createElement('button');
            addSac.type = 'button';
            addSac.textContent = 'Ajouter au sac';
            addSac.setAttribute('aria-label', 'Ajouter au sac à don : ' + (g.name || ''));
            addSac.addEventListener('click', function () {
              WS.addToDonationBag(state, g.id);
              WS.saveState(state);
              render();
            });
            actions.appendChild(addSac);
          }
        }
        main.appendChild(actions);
        row.appendChild(main);
        li.appendChild(row);
        listEl.appendChild(li);
      });
    }

    if (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        render();
      });
    }
    select.addEventListener('change', render);
    var btnApply = document.getElementById('btn-appliquer-filtre');
    if (btnApply) {
      btnApply.addEventListener('click', function (e) {
        e.preventDefault();
        render();
      });
    }
    render();
  }

  function initAddPhoto() {
    maybeSeed();
    var state = WS.loadState();
    var form = document.getElementById('garment-form');
    var photoCamera = document.getElementById('photo-camera');
    var photoGallery = document.getElementById('photo-gallery');
    var preview = document.getElementById('photo-preview');
    var editId = getParam('edit');

    if (!form) return;

    /** null tant qu’aucune nouvelle image n’est choisie ; chaîne base64 après choix */
    var newPhotoFromFile = null;
    var userPickedNewPhoto = false;

    var cutoutPreview = document.getElementById('photo-cutout-preview');
    var cutoutSection = document.getElementById('photo-cutout-section');
    var cutoutPlaceholder = document.getElementById('photo-cutout-placeholder');
    var cutoutStatus = document.getElementById('photo-cutout-status');
    var btnRelaunchCutout = document.getElementById('btn-relaunch-cutout');
    var submitBtn = form.querySelector('button[type="submit"]');
    var RTCutout = window.RTCutout;

    function applyCutoutPreview(dataUrl) {
      if (!dataUrl) return;
      if (cutoutPlaceholder) cutoutPlaceholder.hidden = true;
      if (cutoutPreview) {
        cutoutPreview.src = dataUrl;
        cutoutPreview.hidden = false;
      }
      if (cutoutSection) cutoutSection.hidden = false;
    }

    function setCutoutBusy(busy, message) {
      if (cutoutStatus) {
        if (busy && message) {
          cutoutStatus.hidden = false;
          cutoutStatus.textContent = message;
        } else {
          cutoutStatus.textContent = '';
          cutoutStatus.hidden = true;
        }
      }
      if (submitBtn) submitBtn.disabled = !!busy;
      if (btnRelaunchCutout) btnRelaunchCutout.disabled = !!busy;
    }

    /** Découpage simulé (PNG transparent) ; repli sur l’original si indisponible ou erreur */
    function runCutoutFromDataUrl(dataUrl) {
      if (!dataUrl || typeof dataUrl !== 'string') return;
      if (!RTCutout || typeof RTCutout.apply !== 'function') {
        applyCutoutPreview(dataUrl);
        newPhotoFromFile = dataUrl;
        return;
      }
      setCutoutBusy(true, 'Découpage en cours…');
      window.setTimeout(function () {
        RTCutout.apply(dataUrl, function (err, pngDataUrl) {
          setCutoutBusy(false);
          if (!err && pngDataUrl) {
            applyCutoutPreview(pngDataUrl);
            newPhotoFromFile = pngDataUrl;
          } else {
            if (err) console.warn('wardrobe-pages: découpage', err);
            applyCutoutPreview(dataUrl);
            newPhotoFromFile = dataUrl;
          }
        });
      }, 0);
    }

    function loadFileToPreview(file) {
      if (!file || !preview) return;
      var reader = new FileReader();
      reader.onload = function () {
        var dataUrl = reader.result;
        if (typeof dataUrl === 'string' && dataUrl.length > 2500000) {
          alert('Image trop lourde pour le stockage local (quota ~5 Mo). Choisis une image plus petite.');
          return;
        }
        if (cutoutSection) cutoutSection.hidden = true;
        if (cutoutPreview) {
          cutoutPreview.removeAttribute('src');
          cutoutPreview.hidden = true;
        }
        if (cutoutPlaceholder) cutoutPlaceholder.hidden = true;
        userPickedNewPhoto = true;
        newPhotoFromFile = dataUrl;
        preview.src = dataUrl;
        preview.hidden = false;
        runCutoutFromDataUrl(dataUrl);
        if (photoCamera) photoCamera.value = '';
        if (photoGallery) photoGallery.value = '';
      };
      reader.readAsDataURL(file);
    }

    function bindPhotoInput(input) {
      if (!input) return;
      input.addEventListener('change', function () {
        var file = input.files && input.files[0];
        if (!file) return;
        loadFileToPreview(file);
      });
      input.addEventListener('rt-file', function (e) {
        if (e.detail && e.detail.file) loadFileToPreview(e.detail.file);
      });
    }
    bindPhotoInput(photoCamera);
    bindPhotoInput(photoGallery);

    if (btnRelaunchCutout) {
      btnRelaunchCutout.addEventListener('click', function () {
        var src = (preview && preview.src) || newPhotoFromFile || '';
        if (src && src.indexOf('data:') === 0) {
          runCutoutFromDataUrl(src);
        } else {
          alert('Choisis ou prends une photo à l’étape 1 d’abord.');
        }
      });
    }

    if (editId) {
      var existing = WS.getGarment(state, editId);
      if (existing) {
        var nom = document.getElementById('nom-vetement');
        var cat = document.getElementById('categorie-vetement');
        if (nom) nom.value = existing.name || '';
        if (cat) cat.value = existing.category || 'haut';
        setRadio('etat', existing.etat);
        setRadio('taches', existing.taches);
        var com = document.getElementById('commentaire-qualite');
        if (com) com.value = existing.commentaire || '';
        setRadio('donnable', existing.donnable);
        if (existing.photoDataUrl && preview) {
          preview.src = existing.photoDataUrl;
          preview.hidden = false;
          applyCutoutPreview(existing.photoDataUrl);
        }
      }
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var nomEl = document.getElementById('nom-vetement');
      var catEl = document.getElementById('categorie-vetement');
      var name = nomEl && nomEl.value.trim() ? nomEl.value.trim() : 'Sans nom';
      var category = (catEl && catEl.value) || 'haut';
      var payload = {
        name: name,
        category: category,
        etat: readRadio('etat'),
        taches: readRadio('taches'),
        commentaire: (document.getElementById('commentaire-qualite') || {}).value || '',
        donnable: readRadio('donnable'),
      };

      if (editId && WS.getGarment(state, editId)) {
        if (userPickedNewPhoto) {
          WS.updateGarment(state, editId, Object.assign({}, payload, { photoDataUrl: newPhotoFromFile }));
        } else {
          WS.updateGarment(state, editId, payload);
        }
      } else {
        WS.addGarment(
          state,
          Object.assign({}, payload, {
            photoDataUrl: userPickedNewPhoto ? newPhotoFromFile : null,
          })
        );
      }

      try {
        WS.saveState(state);
      } catch (err) {
        console.warn(err);
      }
      window.location.href = 'garde-robe.html#inv';
    });
  }

  function initOutfitForm() {
    maybeSeed();
    var state = WS.loadState();
    var form = document.getElementById('outfit-form-el');
    var container = document.getElementById('outfit-garment-checkboxes');
    var nameInput = document.getElementById('nom-outfit');
    var editId = getParam('edit');

    if (!form || !container) return;

    var garments = state.garments;
    container.innerHTML = '';

    if (garments.length === 0) {
      var p = document.createElement('p');
      p.appendChild(document.createTextNode('Aucun vêtement dans la garde-robe. '));
      var a = document.createElement('a');
      a.href = 'garde-robe-ajouter-photo.html';
      a.textContent = 'Ajouter un vêtement';
      p.appendChild(a);
      container.appendChild(p);
    } else {
      garments.forEach(function (g) {
        var row = document.createElement('p');
        row.style.display = 'flex';
        row.style.gap = '0.5rem';
        row.style.alignItems = 'center';
        row.appendChild(createGarmentThumb(g, 40));
        var label = document.createElement('label');
        label.style.flex = '1';
        var cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.name = 'garment';
        cb.value = g.id;
        cb.id = 'og-' + g.id;
        label.appendChild(cb);
        label.appendChild(document.createTextNode(' ' + (g.name || 'Sans nom') + ' (' + catLabel(g.category) + ')'));
        row.appendChild(label);
        container.appendChild(row);
      });
    }

    if (editId) {
      var outfit = WS.getOutfit(state, editId);
      if (outfit && nameInput) {
        nameInput.value = outfit.name || '';
        var ids = outfit.garmentIds || [];
        ids.forEach(function (gid) {
          var cb = container.querySelector('input[type="checkbox"][name="garment"][value="' + gid + '"]');
          if (cb) cb.checked = true;
        });
      }
    }

    form.dataset.pendingAction = 'list';
    var bSave = document.getElementById('btn-outfit-save');
    var bShare = document.getElementById('btn-outfit-save-share');
    if (bSave) {
      bSave.addEventListener('click', function () {
        form.dataset.pendingAction = 'list';
      });
    }
    if (bShare) {
      bShare.addEventListener('click', function () {
        form.dataset.pendingAction = 'share';
      });
    }

    function collectGarmentIds() {
      var boxes = container.querySelectorAll('input[type="checkbox"][name="garment"]:checked');
      var out = [];
      boxes.forEach(function (b) {
        out.push(b.value);
      });
      return out;
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var outfitName = (nameInput && nameInput.value.trim()) || 'Sans titre';
      var garmentIds = collectGarmentIds();
      var oid;

      if (editId && WS.getOutfit(state, editId)) {
        WS.updateOutfit(state, editId, { name: outfitName, garmentIds: garmentIds });
        syncOutfitLayoutFromIds(WS.getOutfit(state, editId));
        oid = editId;
      } else {
        var o = WS.addOutfit(state, { name: outfitName, garmentIds: garmentIds });
        syncOutfitLayoutFromIds(o);
        oid = o.id;
      }

      WS.saveState(state);

      var sub = e.submitter;
      var goShare =
        (sub && sub.getAttribute('data-action') === 'share') ||
        (form.dataset && form.dataset.pendingAction === 'share');
      if (form.dataset) form.dataset.pendingAction = 'list';
      if (goShare) {
        window.location.href = 'garde-robe-outfit-partage.html?id=' + encodeURIComponent(oid);
      } else {
        window.location.href = 'garde-robe-outfit-look.html?id=' + encodeURIComponent(oid);
      }
    });
  }

  function initOutfitsList() {
    maybeSeed();
    var state = WS.loadState();
    var listEl = document.getElementById('outfits-list');
    if (!listEl) return;

    function render() {
      var outfits = state.outfits.slice();
      listEl.innerHTML = '';
      if (outfits.length === 0) {
        var li = document.createElement('li');
        li.className = 'marketplace-card';
        li.textContent = 'Aucun outfit enregistré.';
        listEl.appendChild(li);
        return;
      }
      outfits.forEach(function (o) {
        var li = document.createElement('li');
        li.className = 'marketplace-card';

        var cardLink = document.createElement('a');
        cardLink.href = 'garde-robe-outfit-look.html?id=' + encodeURIComponent(o.id);

        var gids = o.garmentIds || [];
        if (gids.length > 0) {
          var strip = document.createElement('span');
          strip.style.display = 'flex';
          strip.style.flexWrap = 'wrap';
          strip.style.gap = '4px';
          strip.style.marginBottom = '0.35rem';
          gids.slice(0, 6).forEach(function (gid) {
            var g = WS.getGarment(state, gid);
            if (g) strip.appendChild(createGarmentThumb(g, 34));
          });
          cardLink.appendChild(strip);
        }

        var title = document.createElement('span');
        title.className = 'marketplace-card-title';
        title.textContent = o.name || 'Sans titre';

        var meta = document.createElement('span');
        meta.className = 'marketplace-card-meta';
        var n = gids.length;
        meta.textContent = n + ' article' + (n > 1 ? 's' : '') + ' · modifié le ' + formatDate(o.updatedAt);

        cardLink.appendChild(title);
        cardLink.appendChild(meta);
        li.appendChild(cardLink);

        var actions = document.createElement('p');
        var edit = document.createElement('a');
        edit.href = 'garde-robe-outfit.html?edit=' + encodeURIComponent(o.id);
        edit.textContent = 'Modifier';
        var share = document.createElement('a');
        share.href = 'garde-robe-outfit-partage.html?id=' + encodeURIComponent(o.id);
        share.textContent = 'Partager';
        var del = document.createElement('button');
        del.type = 'button';
        del.textContent = 'Supprimer';
        del.setAttribute('aria-label', 'Supprimer l’outfit « ' + (o.name || '') + ' »');
        del.addEventListener('click', function () {
          if (!confirm('Supprimer cet outfit ?')) return;
          WS.deleteOutfit(state, o.id);
          WS.saveState(state);
          render();
        });
        actions.appendChild(edit);
        actions.appendChild(document.createTextNode(' · '));
        actions.appendChild(share);
        actions.appendChild(document.createTextNode(' · '));
        actions.appendChild(del);

        li.appendChild(actions);
        listEl.appendChild(li);
      });
    }

    render();
  }

  function initDonationBag() {
    maybeSeed();
    var state = WS.loadState();
    var listEl = document.getElementById('donation-bag-list');
    var emptyEl = document.getElementById('donation-bag-empty');
    if (!listEl) return;

    function render() {
      var items = WS.getDonationBagGarments(state);
      listEl.innerHTML = '';
      if (emptyEl) emptyEl.hidden = items.length > 0;
      if (items.length === 0) {
        return;
      }
      items.forEach(function (g) {
        var li = document.createElement('li');
        var row = document.createElement('div');
        row.style.display = 'flex';
        row.style.gap = '0.65rem';
        row.style.alignItems = 'flex-start';
        row.appendChild(createGarmentThumb(g, 48));
        var col = document.createElement('div');
        col.style.flex = '1';
        var strong = document.createElement('strong');
        strong.textContent = g.name || 'Sans nom';
        col.appendChild(strong);
        col.appendChild(document.createTextNode(' — '));
        var small = document.createElement('small');
        small.textContent = catLabel(g.category);
        col.appendChild(small);
        var p = document.createElement('p');
        var rm = document.createElement('button');
        rm.type = 'button';
        rm.textContent = 'Retirer du sac';
        rm.setAttribute('aria-label', 'Retirer du sac : ' + (g.name || ''));
        rm.addEventListener('click', function () {
          WS.removeFromDonationBag(state, g.id);
          WS.saveState(state);
          render();
        });
        p.appendChild(rm);
        col.appendChild(p);
        row.appendChild(col);
        li.appendChild(row);
        listEl.appendChild(li);
      });
    }

    render();
  }

  function initDonationPick() {
    maybeSeed();
    var state = WS.loadState();
    var root = document.getElementById('donation-pick-root');
    if (!root) return;

    function render() {
      root.innerHTML = '';
      var eligible = state.garments.filter(function (g) {
        return g.donnable === 'oui';
      });
      if (eligible.length === 0) {
        var empty = document.createElement('p');
        empty.appendChild(
          document.createTextNode(
            'Aucun article marqué « donnable ». Indique-le dans la fiche vêtement ou '
          )
        );
        var a = document.createElement('a');
        a.href = 'garde-robe-ajouter-photo.html';
        a.textContent = 'ajoute un vêtement';
        empty.appendChild(a);
        empty.appendChild(document.createTextNode('.'));
        root.appendChild(empty);
        return;
      }
      var ul = document.createElement('ul');
      eligible.forEach(function (g) {
        var li = document.createElement('li');
        li.style.display = 'flex';
        li.style.gap = '0.65rem';
        li.style.alignItems = 'center';
        li.style.flexWrap = 'wrap';
        li.appendChild(createGarmentThumb(g, 44));
        var mid = document.createElement('span');
        mid.style.flex = '1';
        mid.style.minWidth = '0';
        var label = document.createElement('strong');
        label.textContent = g.name || 'Sans nom';
        mid.appendChild(label);
        mid.appendChild(document.createTextNode(' — '));
        mid.appendChild(document.createTextNode(catLabel(g.category)));
        mid.appendChild(document.createTextNode(' — '));
        li.appendChild(mid);
        var inBag = WS.isInDonationBag(state, g.id);
        var actions = document.createElement('span');
        actions.style.whiteSpace = 'nowrap';
        if (inBag) {
          var st = document.createElement('span');
          st.textContent = 'Dans le sac';
          actions.appendChild(st);
          actions.appendChild(document.createTextNode(' — '));
          var rm = document.createElement('button');
          rm.type = 'button';
          rm.textContent = 'Retirer du sac';
          rm.setAttribute('aria-label', 'Retirer du sac : ' + (g.name || ''));
          rm.addEventListener('click', function () {
            WS.removeFromDonationBag(state, g.id);
            WS.saveState(state);
            render();
          });
          actions.appendChild(rm);
        } else {
          var add = document.createElement('button');
          add.type = 'button';
          add.textContent = 'Ajouter au sac';
          add.setAttribute('aria-label', 'Ajouter au sac : ' + (g.name || ''));
          add.addEventListener('click', function () {
            WS.addToDonationBag(state, g.id);
            WS.saveState(state);
            render();
          });
          actions.appendChild(add);
        }
        li.appendChild(actions);
        ul.appendChild(li);
      });
      root.appendChild(ul);
      var nav = document.createElement('p');
      var linkSac = document.createElement('a');
      linkSac.href = 'donner.html#sac-don';
      linkSac.textContent = 'Voir mon sac';
      nav.appendChild(linkSac);
      root.appendChild(nav);
    }

    render();
  }

  function initOutfitLook() {
    maybeSeed();
    var state = WS.loadState();
    var id = getParam('id');
    var canvas = document.getElementById('outfit-canvas');
    var titleEl = document.getElementById('outfit-look-title');
    var shareA = document.getElementById('outfit-look-share-link');
    var editA = document.getElementById('outfit-look-edit-link');

    if (!canvas) return;

    if (!id) {
      if (titleEl) titleEl.textContent = 'Look introuvable';
      return;
    }

    var outfit = WS.getOutfit(state, id);
    if (!outfit) {
      if (titleEl) titleEl.textContent = 'Look introuvable';
      return;
    }

    syncOutfitLayoutFromIds(outfit);
    WS.updateOutfit(state, outfit.id, { layout: outfit.layout.slice() });
    WS.saveState(state);

    if (titleEl) titleEl.textContent = '« ' + (outfit.name || 'Sans titre') + ' »';
    if (shareA) shareA.href = 'garde-robe-outfit-partage.html?id=' + encodeURIComponent(id);
    if (editA) editA.href = 'garde-robe-outfit.html?edit=' + encodeURIComponent(id);

    var wrapper = document.getElementById('outfit-canvas-wrapper');
    if (wrapper) {
      wrapper.style.margin = '0';
      wrapper.style.padding = '0';
    }
    canvas.style.position = 'relative';
    canvas.style.background = '#ffffff';
    canvas.style.minHeight = 'min(75vh, 560px)';
    canvas.style.width = '100%';
    canvas.style.border = '1px solid var(--rt-border, #ccc)';
    canvas.style.borderRadius = '6px';
    canvas.style.overflow = 'visible';

    function renderCanvas() {
      canvas.innerHTML = '';
      var layout = outfit.layout || [];
      if (layout.length === 0) {
        var empty = document.createElement('p');
        empty.style.padding = '1rem';
        empty.textContent = 'Aucun article dans cet outfit.';
        canvas.appendChild(empty);
        return;
      }
      var sorted = layout.slice().sort(function (a, b) {
        return (a.z || 0) - (b.z || 0);
      });
      sorted.forEach(function (item) {
        var g = WS.getGarment(state, item.garmentId);
        if (!g) return;
        var w = item.w != null ? item.w : 0.28;
        w = Math.max(0.12, Math.min(0.65, w));
        item.w = w;

        var wrap = document.createElement('div');
        wrap.style.position = 'absolute';
        wrap.style.left = (item.x * 100) + '%';
        wrap.style.top = (item.y * 100) + '%';
        wrap.style.width = (w * 100) + '%';
        wrap.style.zIndex = String(item.z || 1);
        wrap.style.touchAction = 'none';
        wrap.style.cursor = 'grab';
        wrap.style.boxSizing = 'border-box';

        if (g.photoDataUrl) {
          var img = document.createElement('img');
          img.src = g.photoDataUrl;
          img.alt = g.name || 'Vêtement';
          img.style.width = '100%';
          img.style.height = 'auto';
          img.style.display = 'block';
          img.style.pointerEvents = 'none';
          img.draggable = false;
          wrap.appendChild(img);
        } else {
          var ph = document.createElement('div');
          ph.style.background = 'var(--rt-border, #ddd)';
          ph.style.borderRadius = '4px';
          ph.style.aspectRatio = '1';
          ph.style.display = 'flex';
          ph.style.alignItems = 'center';
          ph.style.justifyContent = 'center';
          ph.style.fontSize = '2rem';
          ph.textContent = '🧥';
          ph.setAttribute('aria-hidden', 'true');
          wrap.appendChild(ph);
        }

        var cap = document.createElement('small');
        cap.style.display = 'block';
        cap.style.marginTop = '2px';
        cap.style.pointerEvents = 'none';
        cap.textContent = g.name || 'Sans nom';
        wrap.appendChild(cap);

        wrap.addEventListener('pointerdown', function (e) {
          if (e.button !== 0) return;
          e.preventDefault();
          var rect = canvas.getBoundingClientRect();
          var wr = wrap.getBoundingClientRect();
          var offsetX = e.clientX - wr.left;
          var offsetY = e.clientY - wr.top;
          var maxZ = 0;
          (outfit.layout || []).forEach(function (L) {
            maxZ = Math.max(maxZ, L.z || 0);
          });
          item.z = maxZ + 1;
          wrap.style.zIndex = String(item.z);

          function move(ev) {
            if (!ev.isPrimary) return;
            var newLeft = ev.clientX - rect.left - offsetX;
            var newTop = ev.clientY - rect.top - offsetY;
            item.x = newLeft / rect.width;
            item.y = newTop / rect.height;
            item.x = Math.max(-0.08, Math.min(0.95, item.x));
            item.y = Math.max(-0.08, Math.min(0.95, item.y));
            wrap.style.left = item.x * 100 + '%';
            wrap.style.top = item.y * 100 + '%';
          }
          function up() {
            document.removeEventListener('pointermove', move);
            document.removeEventListener('pointerup', up);
            document.removeEventListener('pointercancel', up);
            wrap.style.cursor = 'grab';
            WS.updateOutfit(state, outfit.id, { layout: outfit.layout.slice() });
            WS.saveState(state);
          }
          wrap.style.cursor = 'grabbing';
          document.addEventListener('pointermove', move);
          document.addEventListener('pointerup', up);
          document.addEventListener('pointercancel', up);
        });

        canvas.appendChild(wrap);
      });
    }

    renderCanvas();
  }

  function initOutfitShare() {
    maybeSeed();
    var state = WS.loadState();
    var id = getParam('id');
    var titleEl = document.getElementById('outfit-share-title');
    var subEl = document.getElementById('outfit-share-subtitle');
    var urlInput = document.getElementById('url-outfit');
    var copyBtn = document.getElementById('btn-copy-outfit-link');

    function clearVisual() {
      var vr = document.getElementById('outfit-visual-root');
      if (vr) vr.innerHTML = '';
    }

    if (!id) {
      if (titleEl) titleEl.textContent = 'Outfit introuvable';
      if (subEl) subEl.textContent = 'Paramètre id manquant ou invalide.';
      if (urlInput) urlInput.value = '';
      clearVisual();
      var lookNavBad = document.getElementById('outfit-partage-link-look');
      if (lookNavBad) lookNavBad.href = 'garde-robe-outfits.html';
      return;
    }

    var outfit = WS.getOutfit(state, id);
    if (!outfit) {
      if (titleEl) titleEl.textContent = 'Outfit introuvable';
      if (subEl) subEl.textContent = 'Aucun outfit ne correspond à cet identifiant.';
      if (urlInput) urlInput.value = '';
      clearVisual();
      var lookNavBad2 = document.getElementById('outfit-partage-link-look');
      if (lookNavBad2) lookNavBad2.href = 'garde-robe-outfits.html';
      return;
    }

    if (titleEl) titleEl.textContent = 'Partager : « ' + (outfit.name || 'Sans titre') + ' »';
    if (subEl) subEl.textContent = 'Outfit enregistré.';
    var fakeUrl =
      'https://relais-textile.app/outfit/' + encodeURIComponent(outfit.id);
    if (urlInput) urlInput.value = fakeUrl;

    var lookNav = document.getElementById('outfit-partage-link-look');
    if (lookNav) lookNav.href = 'garde-robe-outfit-look.html?id=' + encodeURIComponent(outfit.id);

    var visualRoot = document.getElementById('outfit-visual-root');
    if (visualRoot) {
      visualRoot.innerHTML = '';
      var p = document.createElement('p');
      var a = document.createElement('a');
      a.href = 'garde-robe-outfit-look.html?id=' + encodeURIComponent(outfit.id);
      a.textContent = 'Ouvrir le look sur la toile (déplacer les pièces, superpositions)';
      p.appendChild(a);
      visualRoot.appendChild(p);
    }

    if (copyBtn && urlInput) {
      copyBtn.addEventListener('click', function () {
        urlInput.select();
        try {
          document.execCommand('copy');
        } catch (err) {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(urlInput.value);
          }
        }
      });
    }
  }

  function init(page) {
    switch (page) {
      case 'inventory':
        initInventory();
        break;
      case 'add-photo':
        initAddPhoto();
        break;
      case 'outfit-form':
        initOutfitForm();
        break;
      case 'outfits-list':
        initOutfitsList();
        break;
      case 'outfit-share':
        initOutfitShare();
        break;
      case 'outfit-look':
        initOutfitLook();
        break;
      case 'donation-bag':
        initDonationBag();
        break;
      case 'donation-pick':
        initDonationPick();
        break;
      default:
        break;
    }
  }

  window.WardrobePages = { init: init };

  document.addEventListener('DOMContentLoaded', function () {
    var page = document.body && document.body.getAttribute('data-page');
    if (page) init(page);
  });
})();
