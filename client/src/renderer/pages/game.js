'use strict';

// css
(function () {
  const s = document.createElement('style');
  s.textContent = `
    #page-game {
      position: relative;
    }

    #page-game webview,
    #page-game .webview-placeholder {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      border: none;
    }

    .webview-placeholder {
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 15px;
      color: var(--text-2);
      background: var(--bg);
    }
  `;
  document.head.appendChild(s);
})();

// html
function buildGamePage(url) {
  const container = document.getElementById('page-game');
  const wv = document.createElement('webview');
  wv.setAttribute('src', url);
  wv.setAttribute('partition', 'persist:roxstar');
  wv.setAttribute('plugins', 'true');
  wv.setAttribute('allowpopups', 'true');
  wv.style.position = 'absolute';
  wv.style.inset = '0';
  wv.style.width = '100%';
  wv.style.height = '100%';
  wv.style.border = 'none';
  wv.addEventListener('context-menu', e => {
    e.preventDefault();
    window.roxstar.showContextMenu();
  });
  wv.addEventListener('did-finish-load', () => {
    if (state.muted) {
      wv.executeJavaScript(`document.querySelectorAll('audio, video').forEach(el => { el.muted = true; });`).catch(() => {});
    }
  });
  container.appendChild(wv);
  window._gameWebview = wv;
}
