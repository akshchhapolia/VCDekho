(function (global) {
  function isProfilePage() {
    return Boolean(document.querySelector('.inv-profile-wrap'));
  }

  function revealProfileContent() {
    document.body.classList.add('inv-profile-ready');
    var reveals = document.querySelectorAll('.inv-profile-reveal:not(.is-visible)');
    reveals.forEach(function (el) {
      el.classList.add('is-visible');
    });
  }

  function bootProfilePage() {
    if (!isProfilePage()) return;
    revealProfileContent();
  }

  global.VCProfilePage = { boot: bootProfilePage };

  function scheduleBoot() {
    if (!isProfilePage()) return;
    bootProfilePage();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scheduleBoot);
  } else {
    scheduleBoot();
  }
})(window);
