document.addEventListener('DOMContentLoaded', function () {
  document.querySelectorAll('a[href^="http"]').forEach(function (link) {
    if (link.hostname !== location.hostname) {
      link.setAttribute('target', '_blank');
      link.setAttribute('rel', 'noopener');
      link.classList.add('ext-link');
    }
  });
});
