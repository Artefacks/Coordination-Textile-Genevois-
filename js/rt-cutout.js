/**
 * Découpage simulé côté navigateur (sans API) : fond estimé depuis le pourtour
 * de l’image, pixels proches rendus transparents. Fonctionne mieux sur fond
 * assez uniforme (mur, drap, sol clair).
 */
(function () {
  function distRgb(r1, g1, b1, r2, g2, b2) {
    return Math.sqrt(
      (r1 - r2) * (r1 - r2) + (g1 - g2) * (g1 - g2) + (b1 - b2) * (b1 - b2)
    );
  }

  function sampleBorderBg(data, cw, ch) {
    var br = 0;
    var bg = 0;
    var bb = 0;
    var n = 0;
    function add(x, y) {
      var i = (y * cw + x) * 4;
      br += data[i];
      bg += data[i + 1];
      bb += data[i + 2];
      n++;
    }
    var x;
    var y;
    for (x = 0; x < cw; x++) {
      add(x, 0);
      add(x, ch - 1);
    }
    for (y = 0; y < ch; y++) {
      add(0, y);
      add(cw - 1, y);
    }
    if (!n) return { r: 255, g: 255, b: 255 };
    return { r: br / n, g: bg / n, b: bb / n };
  }

  /**
   * @param {string} dataUrl - image/jpeg ou image/png
   * @param {object} [opts]
   * @param {number} [opts.maxSide=720] - côté max du traitement (perf)
   * @param {number} [opts.tolerance=48] - distance couleur max pour « fond »
   * @param {number} [opts.feather=32] - transition douce bord détourage
   * @param {function(Error|null, string|null)} callback - data URL PNG ou null
   */
  function apply(dataUrl, opts, callback) {
    if (typeof opts === 'function') {
      callback = opts;
      opts = {};
    }
    opts = opts || {};
    var maxSide = opts.maxSide !== undefined ? opts.maxSide : 720;
    var tolerance = opts.tolerance !== undefined ? opts.tolerance : 48;
    var feather = opts.feather !== undefined ? opts.feather : 32;

    if (!dataUrl || typeof dataUrl !== 'string' || dataUrl.indexOf('data:') !== 0) {
      callback(new Error('Data URL invalide'), null);
      return;
    }

    var img = new Image();
    img.onload = function () {
      try {
        var w = img.naturalWidth;
        var h = img.naturalHeight;
        if (!w || !h) {
          callback(new Error('Dimensions image invalides'), null);
          return;
        }
        var scale = Math.min(1, maxSide / Math.max(w, h));
        var cw = Math.max(1, Math.round(w * scale));
        var ch = Math.max(1, Math.round(h * scale));

        var canvas = document.createElement('canvas');
        canvas.width = cw;
        canvas.height = ch;
        var ctx = canvas.getContext('2d');
        if (!ctx) {
          callback(new Error('Canvas 2D indisponible'), null);
          return;
        }
        ctx.drawImage(img, 0, 0, cw, ch);
        var imageData = ctx.getImageData(0, 0, cw, ch);
        var d = imageData.data;
        var bg = sampleBorderBg(d, cw, ch);
        var br = bg.r;
        var bgG = bg.g;
        var bgB = bg.b;
        var t = tolerance;
        var f = Math.max(1, feather);
        var i;
        for (i = 0; i < d.length; i += 4) {
          var r = d[i];
          var g = d[i + 1];
          var b = d[i + 2];
          var dist = distRgb(r, g, b, br, bgG, bgB);
          if (dist <= t) {
            d[i + 3] = 0;
          } else if (dist >= t + f) {
            d[i + 3] = 255;
          } else {
            d[i + 3] = Math.round((255 * (dist - t)) / f);
          }
        }
        ctx.putImageData(imageData, 0, 0);
        var out = canvas.toDataURL('image/png');
        callback(null, out);
      } catch (e) {
        callback(e instanceof Error ? e : new Error(String(e)), null);
      }
    };
    img.onerror = function () {
      callback(new Error('Chargement image impossible'), null);
    };
    img.src = dataUrl;
  }

  window.RTCutout = { apply: apply };
})();
