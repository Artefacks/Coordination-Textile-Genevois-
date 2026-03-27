/**
 * Reviva — aperçu photo réparation + cadre rouge ; active « Continuer » quand une image est prête.
 */
(function () {
  function wirePreview(inputIds, imgId, blockId, submitId) {
    var block = document.getElementById(blockId);
    var img = document.getElementById(imgId);
    var btn = submitId ? document.getElementById(submitId) : null;
    if (!block || !img) return;

    var prevUrl = null;

    function showFile(file) {
      if (!file || !file.type || file.type.indexOf('image/') !== 0) return;
      if (prevUrl) URL.revokeObjectURL(prevUrl);
      prevUrl = URL.createObjectURL(file);
      img.src = prevUrl;
      img.alt = 'Aperçu — zone à réparer (cadre rouge)';
      block.removeAttribute('hidden');
      if (btn) btn.removeAttribute('disabled');
    }

    inputIds.forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('change', function () {
        if (el.files && el.files[0]) showFile(el.files[0]);
      });
      el.addEventListener('rt-file', function (e) {
        if (e.detail && e.detail.file) showFile(e.detail.file);
      });
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    if (document.getElementById('rep-photo-preview-block')) {
      wirePreview(
        ['rep-photo-camera', 'rep-photo-gallery'],
        'rep-photo-preview-img',
        'rep-photo-preview-block',
        'btn-repair-nouveau-continue'
      );
    }
    if (document.getElementById('rep-sign-photo-preview-block')) {
      wirePreview(
        ['rep-sign-photo-camera', 'rep-sign-photo-gallery'],
        'rep-sign-photo-preview-img',
        'rep-sign-photo-preview-block',
        'btn-repair-signaler-continue'
      );
    }
  });
})();
