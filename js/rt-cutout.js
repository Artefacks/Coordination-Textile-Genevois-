/**
 * Découpage simulé côté navigateur (sans API) : fond estimé depuis le pourtour,
 * pixels proches rendus transparents. Améliorations : médiane sur le bord (moins
 * sensible aux points du sujet sur le bord), distance couleur type « redmean »,
 * léger lissage du canal alpha pour des contours plus propres.
 */
(function () {
  /**
   * Distance perceptuelle approximative (sRGB) — mieux qu’Euclidien pur sur RGB.
   * Voir https://www.compuphase.com/cmetric.htm
   */
  function distRgbRedmean(r1, g1, b1, r2, g2, b2) {
    var rmean = (r1 + r2) / 2;
    var dr = r1 - r2;
    var dg = g1 - g2;
    var db = b1 - b2;
    return Math.sqrt(
      (2 + rmean / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rmean) / 256) * db * db
    );
  }

  function medianChannel(values) {
    var a = values.slice().sort(function (x, y) {
      return x - y;
    });
    var mid = Math.floor(a.length / 2);
    return a.length % 2 ? a[mid] : (a[mid - 1] + a[mid]) / 2;
  }

  /** Médiane par canal sur le pourtour — plus stable que la moyenne si le vêtement touche le bord. */
  function sampleBorderMedian(data, cw, ch) {
    var rs = [];
    var gs = [];
    var bs = [];
    function add(x, y) {
      var i = (y * cw + x) * 4;
      rs.push(data[i]);
      gs.push(data[i + 1]);
      bs.push(data[i + 2]);
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
    if (!rs.length) return { r: 255, g: 255, b: 255 };
    return {
      r: medianChannel(rs),
      g: medianChannel(gs),
      b: medianChannel(bs),
    };
  }

  /** Lissage léger du canal alpha (3×3) pour réduire le crénelage. */
  function smoothAlpha3x3(d, cw, ch) {
    var n = cw * ch;
    var alpha = new Uint8Array(n);
    var p;
    var i;
    for (p = 0, i = 0; p < n; p++, i += 4) {
      alpha[p] = d[i + 3];
    }
    var out = new Uint8Array(n);
    var x;
    var y;
    var dx;
    var dy;
    var nx;
    var ny;
    var sum;
    var count;
    for (y = 0; y < ch; y++) {
      for (x = 0; x < cw; x++) {
        sum = 0;
        count = 0;
        for (dy = -1; dy <= 1; dy++) {
          for (dx = -1; dx <= 1; dx++) {
            nx = x + dx;
            ny = y + dy;
            if (nx >= 0 && nx < cw && ny >= 0 && ny < ch) {
              sum += alpha[ny * cw + nx];
              count++;
            }
          }
        }
        out[y * cw + x] = Math.round(sum / count);
      }
    }
    for (p = 0, i = 0; p < n; p++, i += 4) {
      d[i + 3] = out[p];
    }
  }

  /**
   * @param {string} dataUrl - image/jpeg ou image/png
   * @param {object} [opts]
   * @param {number} [opts.maxSide=800] - côté max du traitement (perf)
   * @param {number} [opts.tolerance=56] - distance couleur max pour « fond »
   * @param {number} [opts.feather=42] - transition douce bord détourage
   * @param {boolean} [opts.smoothAlpha=true] - lissage du canal alpha
   * @param {function(Error|null, string|null)} callback - data URL PNG ou null
   */
  function apply(dataUrl, opts, callback) {
    if (typeof opts === 'function') {
      callback = opts;
      opts = {};
    }
    opts = opts || {};
    var maxSide = opts.maxSide !== undefined ? opts.maxSide : 800;
    var tolerance = opts.tolerance !== undefined ? opts.tolerance : 56;
    var feather = opts.feather !== undefined ? opts.feather : 42;
    var smoothAlpha = opts.smoothAlpha !== false;

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
        var bg = sampleBorderMedian(d, cw, ch);
        var br = bg.r;
        var bgG = bg.g;
        var bgB = bg.b;
        var t = tolerance;
        var f = Math.max(1, feather);
        var idx;
        for (idx = 0; idx < d.length; idx += 4) {
          var r = d[idx];
          var g = d[idx + 1];
          var b = d[idx + 2];
          var dist = distRgbRedmean(r, g, b, br, bgG, bgB);
          if (dist <= t) {
            d[idx + 3] = 0;
          } else if (dist >= t + f) {
            d[idx + 3] = 255;
          } else {
            d[idx + 3] = Math.round((255 * (dist - t)) / f);
          }
        }
        if (smoothAlpha) {
          smoothAlpha3x3(d, cw, ch);
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
