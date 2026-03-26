/**
 * Reviva — « Prendre une photo » : active la caméra (getUserMedia) ou
 * repli sur &lt;input type="file" capture&gt; si indisponible.
 */
(function () {
  function fileFromCanvas(canvas, type) {
    type = type || 'image/jpeg';
    return new Promise(function (resolve) {
      canvas.toBlob(
        function (blob) {
          if (!blob) {
            resolve(null);
            return;
          }
          resolve(new File([blob], 'photo.jpg', { type: type }));
        },
        type,
        0.88
      );
    });
  }

  function assignFileToInput(input, file) {
    if (!input || !file) return;
    try {
      var dt = new DataTransfer();
      dt.items.add(file);
      input.files = dt.files;
    } catch (e) {
      console.warn('rt-camera: DataTransfer indisponible', e);
    }
    /* Toujours notifier en file direct : certains navigateurs ne déclenchent pas change après assignation */
    input.dispatchEvent(
      new CustomEvent('rt-file', {
        bubbles: true,
        detail: { file: file, inputId: input.id },
      })
    );
  }

  function openCameraOverlay(onCapture, onStreamFailed) {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      onStreamFailed();
      return;
    }
    var stream;
    var wrap = document.createElement('div');
    wrap.className = 'rt-camera-overlay';
    wrap.setAttribute('role', 'dialog');
    wrap.setAttribute('aria-modal', 'true');
    wrap.setAttribute('aria-label', 'Caméra');
    wrap.style.cssText =
      'position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,0.88);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:0.75rem;box-sizing:border-box;';

    var video = document.createElement('video');
    video.setAttribute('playsinline', '');
    video.setAttribute('autoplay', '');
    video.muted = true;
    video.style.cssText = 'max-width:100%;max-height:65vh;border-radius:8px;background:#000;';

    var row = document.createElement('div');
    row.style.cssText = 'margin-top:0.75rem;display:flex;flex-wrap:wrap;gap:0.5rem;justify-content:center;';

    function mkBtn(label, primary) {
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = label;
      b.style.cssText =
        'min-height:48px;padding:0.5rem 1rem;font:inherit;font-weight:600;border-radius:10px;cursor:pointer;border:1px solid #e7e5e4;' +
        (primary ? 'background:#ef3e37;color:#fff;border-color:#c52a24;' : 'background:#fff;color:#1c1917;');
      return b;
    }

    var btnCap = mkBtn('Capturer', true);
    var btnClose = mkBtn('Fermer', false);

    function cleanup() {
      if (stream) {
        stream.getTracks().forEach(function (t) {
          t.stop();
        });
        stream = null;
      }
      if (wrap.parentNode) wrap.parentNode.removeChild(wrap);
    }

    btnClose.addEventListener('click', cleanup);

    btnCap.addEventListener('click', function () {
      var w = video.videoWidth;
      var h = video.videoHeight;
      if (!w || !h) return;
      var c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      var ctx = c.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(video, 0, 0);
      fileFromCanvas(c).then(function (file) {
        cleanup();
        if (file) onCapture(file);
      });
    });

    row.appendChild(btnCap);
    row.appendChild(btnClose);
    wrap.appendChild(video);
    wrap.appendChild(row);

    navigator.mediaDevices
      .getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      })
      .then(function (s) {
        stream = s;
        video.srcObject = s;
        document.body.appendChild(wrap);
      })
      .catch(function () {
        onStreamFailed();
      });
  }

  function bindCameraButton(btn, input) {
    if (!btn || !input) return;
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      openCameraOverlay(
        function (file) {
          assignFileToInput(input, file);
        },
        function () {
          input.setAttribute('capture', 'environment');
          if (!input.getAttribute('accept')) input.setAttribute('accept', 'image/*');
          input.click();
        }
      );
    });
  }

  function bindGalleryButton(btn, input) {
    if (!btn || !input) return;
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      input.removeAttribute('capture');
      input.click();
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('[data-rt-camera-for]').forEach(function (btn) {
      var id = btn.getAttribute('data-rt-camera-for');
      if (!id) return;
      var input = document.getElementById(id);
      bindCameraButton(btn, input);
    });
    document.querySelectorAll('[data-rt-gallery-for]').forEach(function (btn) {
      var id = btn.getAttribute('data-rt-gallery-for');
      if (!id) return;
      var input = document.getElementById(id);
      bindGalleryButton(btn, input);
    });
  });
})();
