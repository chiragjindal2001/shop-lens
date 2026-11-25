// Runs before first paint so the page never flashes the wrong theme.
// Light is the default. Dark only when the visitor chose it, or chose "System" and their OS prefers dark.
(function () {
  try {
    var saved = localStorage.getItem('shoplens-theme');
    var dark = saved === 'dark' || (saved === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.toggle('dark', dark);
  } catch {
    /* storage blocked: stay on the default (light) theme */
  }
})();
