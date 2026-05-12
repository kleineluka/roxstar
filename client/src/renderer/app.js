'use strict';

// current client state
const state = {
  page: 'game',
  navStyle: localStorage.getItem('navStyle') || DEFAULT_SETTINGS.navStyle,
  theme: localStorage.getItem('theme') || DEFAULT_SETTINGS.theme,
  sidebarCollapsed: localStorage.getItem('sidebarCollapsed') === 'true',
  volume: parseFloat(localStorage.getItem('volume') ?? DEFAULT_SETTINGS.volume),
  muted: localStorage.getItem('muted') === 'true',
  gameUrl: null,
  connectedServer: JSON.parse(localStorage.getItem('connectedServer') || 'null'),
};

// dom refs
const html = document.documentElement;
const sidebar = document.getElementById('sidebar');
const topbar = document.getElementById('topbar');
const collapseBtn = document.getElementById('sidebar-collapse-btn');

// init app
async function init() {
  const config = await window.roxstar.getConfig();
  state.gameUrl = config.defaultUrl;
  if (config.muted) state.muted = true;
  applyTheme(state.theme);
  applyNavStyle(state.navStyle);
  if (state.sidebarCollapsed || config.isDebugMode) {
    sidebar.classList.add('collapsed');
    collapseBtn.textContent = '\u203a';
  }

  // ensure the connected server is valid
  if (!state.connectedServer) state.connectedServer = { name: state.gameUrl, url: state.gameUrl };

  // build pages
  buildGamePage(state.gameUrl);
  buildServersPage();
  buildSettingsPage();
  await buildAboutPage();

  // finalise
  updateServerIndicator();
  navigateTo('game');
  bindNav();
  bindControls();

  // event listeners
  window.roxstar.onReload(() => {
    if (state.page === 'game' && window._gameWebview) window._gameWebview.reload();
  });

  window.roxstar.onMuteChanged(muted => {
    state.muted = muted;
    localStorage.setItem('muted', muted);
    const toggle = document.getElementById('mute-toggle');
    if (toggle) toggle.checked = muted;
    
    // mute all audio elements in renderer
    document.querySelectorAll('audio, video').forEach(el => {
      el.muted = muted;
    });
    
    // mute audio in the webview
    if (window._gameWebview) {
      const script = `document.querySelectorAll('audio, video').forEach(el => { el.muted = ${muted}; });`;
      window._gameWebview.executeJavaScript(script);
    }
  });

}

// theming
function applyTheme(theme, originEl) {
  const isChanging = theme !== state.theme;
  if (!isChanging) {
    // still need to stamp the attribute on first load (!!!)
    html.setAttribute('data-theme', theme);
    document.querySelectorAll('[data-theme-val]').forEach(b => b.classList.toggle('active', b.dataset.themeVal === theme));
    return;
  }

  // create an overlay to mask the transition between themes, and fade it out once the new theme has been applied
  const overlay = document.createElement('div');
  overlay.style.cssText = `position:fixed;inset:0;z-index:9999;pointer-events:none;background:var(--bg);opacity:1;transition:opacity 0.4s ease;`;
  document.body.appendChild(overlay);

  // animate the theme change
  requestAnimationFrame(() => {
    state.theme = theme;
    html.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    document.querySelectorAll('[data-theme-val]').forEach(b => b.classList.toggle('active', b.dataset.themeVal === theme));
    requestAnimationFrame(() => {
      overlay.style.opacity = '0';
      overlay.addEventListener('transitionend', () => overlay.remove(), { once: true });
    });
  });
}

// navbar style
function applyNavStyle(style) {
  state.navStyle = style;
  html.setAttribute('data-nav', style);
  localStorage.setItem('navStyle', style);
  // keep settings page segment in sync
  const btns = document.querySelectorAll('[data-nav-style]');
  btns.forEach(b => b.classList.toggle('active', b.dataset.navStyle === style));
}

// navigation
function navigateTo(page) {
  state.page = page;
  html.dataset.page = page;
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-btn[data-page]').forEach(b => b.classList.toggle('active', b.dataset.page === page));
  const el = document.getElementById(`page-${page}`);
  if (el) el.classList.add('active');
}

function bindNav() {
  document.querySelectorAll('.nav-btn[data-page]').forEach(btn => {
    btn.addEventListener('click', () => navigateTo(btn.dataset.page));
  });
}

// controls
function bindControls() {
  collapseBtn.addEventListener('click', () => {
    const c = sidebar.classList.toggle('collapsed');
    localStorage.setItem('sidebarCollapsed', c);
    collapseBtn.textContent = c ? '>' : '<';
  });

}

// server management
function setConnectedServer(server) {
  state.connectedServer = server;
  localStorage.setItem('connectedServer', JSON.stringify(server));
  updateServerIndicator();
}

function updateServerIndicator() {
  const server = state.connectedServer;
  const name = server ? server.name : '–';
  const online = !!server;
  const nameEls = [document.getElementById('si-name'), document.getElementById('si-name-top')];
  const dotEls  = [document.getElementById('si-dot'),  document.getElementById('si-dot-top')];
  nameEls.forEach(el => { if (el) el.textContent = name; });
  dotEls.forEach(el => { if (el) el.className = `status-dot ${online ? 'online' : 'offline'}`; });
}

// other helpers
function esc(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// start
init();
