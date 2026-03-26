/**
 * Reviva — mini-carte « Boîtes à fringues » (#map-boites-fringues) si présent.
 */
(function () {
  document.addEventListener('DOMContentLoaded', function () {
    var el = document.getElementById('map-boites-fringues');
    if (!el || typeof L === 'undefined') return;

    var latA = 46.2044,
      lngA = 6.1432;
    var latB = 46.1849,
      lngB = 6.1392;

    var map = L.map(el, { scrollWheelZoom: false, attributionControl: true });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
    }).addTo(map);

    function pin(label, className) {
      return L.divIcon({
        className: 'rt-map-pin-leaflet',
        html:
          '<div class="rt-map-pin ' +
          className +
          '" aria-hidden="true">' +
          label +
          '</div>',
        iconSize: [28, 28],
        iconAnchor: [14, 14],
        popupAnchor: [0, -12],
      });
    }

    var mA = L.marker([latA, lngA], { icon: pin('A', 'rt-map-pin--a') }).bindPopup(
      'Point A — Genève'
    );
    var mB = L.marker([latB, lngB], { icon: pin('B', 'rt-map-pin--b') }).bindPopup(
      'Point B — Carouge'
    );
    mA.addTo(map);
    mB.addTo(map);

    var g = L.featureGroup([mA, mB]);
    map.fitBounds(g.getBounds().pad(0.2));
  });
})();
