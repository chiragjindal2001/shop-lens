(function () {
  try {
    var saved = localStorage.getItem('shoplens-theme');
    var dark =
      saved === 'dark' || ((saved === null || saved === 'system') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.toggle('dark', dark);
  } catch {
    /* storage blocked: stay on the default (light) theme */
  }
})();
