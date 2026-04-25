'use strict';

// css
(function () {
  const s = document.createElement('style');
  s.textContent = `
    .setting-desc {
      font-size: 12px;
      color: var(--text-2);
      margin-top: 2px;
    }

    .toggle {
      position: relative;
      width: 44px;
      height: 24px;
      flex-shrink: 0;
      border: 1.5px solid var(--border);
      border-radius: 99px;
      background: var(--bg-2);
    }

    .toggle input {
      opacity: 0;
      width: 0;
      height: 0;
      position: absolute;
    }

    .toggle-track {
      position: absolute;
      inset: 0;
      border-radius: 99px;
      cursor: pointer;
      background: transparent;
      transition: background var(--transition);
    }

    .toggle input:checked + .toggle-track {
      background: var(--toggle-checked-bg, linear-gradient(135deg, var(--accent), var(--accent-2)));
    }

    .toggle-track::after {
      content: '';
      position: absolute;
      left: 3px;
      top: 2px;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: var(--text-2);
      transition: transform var(--transition), background var(--transition);
    }

    .toggle input:checked + .toggle-track::after {
      transform: translateX(18px);
      background: var(--accent-3);
    }

    .segment {
      display: flex;
      gap: 4px;
      background: var(--bg-3);
      border-radius: var(--radius-sm);
      padding: 4px;
    }

    .segment-btn {
      flex: 1;
      padding: 5px 12px;
      border: none;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 700;
      font-family: inherit;
      cursor: pointer;
      background: transparent;
      color: var(--text-2);
      transition: background var(--transition), color var(--transition);
    }

    .segment-btn.active {
      background: var(--surface);
      color: var(--text);
      box-shadow: var(--shadow-sm);
    }

    .vol-row {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .vol-row input[type=range] {
      flex: 1;
      accent-color: var(--accent);
    }

    .vol-row span {
      font-size: 12px;
      color: var(--text-2);
      width: 32px;
      text-align: right;
    }

    .theme-picker {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    .theme-btn {
      flex: 1;
      min-width: 80px;
      padding: 9px 14px;
      border: 1.5px solid var(--border);
      border-radius: var(--radius-sm);
      font-size: 13px;
      font-weight: 700;
      font-family: inherit;
      cursor: pointer;
      background: var(--bg-2);
      color: var(--text-2);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 3px;
      line-height: 1.2;
      transition: background var(--transition), border-color var(--transition), color var(--transition);
    }

    .theme-btn:hover {
      border-color: var(--accent-2);
      color: var(--text);
      background: var(--nav-hover);
    }

    .theme-btn.active {
      border-color: var(--accent);
      color: var(--accent);
      background: var(--surface-2);
    }
  `;
  document.head.appendChild(s);
})();

// html
function buildSettingsPage() {
  const page = document.getElementById('page-settings');
  page.innerHTML = `
    <div class="inner-page">
      <h1>Client Settings</h1>
      <p class="subtitle">Customise to your heart's content. Or don't. Up to you!</p>
      <div class="card">
        <h2>Appearance</h2>
        <div class="setting-row" style="flex-direction:column;align-items:flex-start;gap:10px">
          <div>
            <div class="setting-label">Theme</div>
            <div class="setting-desc">This won't impact the game - just the client (ex. sidebar).</div>
          </div>
          <div class="theme-picker">
            ${Object.entries(THEMES).map(([key, t]) =>
              `<button class="theme-btn${state.theme === key ? ' active' : ''}" data-theme-val="${key}"><span style="font-size:18px">${t.icon}</span><span>${t.label}</span></button>`
            ).join('')}
          </div>
        </div>
        <div class="setting-row">
          <div>
            <div class="setting-label">Navigation Style</div>
            <div class="setting-desc">Sidebar on the left (default) or navigation bar across the top.</div>
          </div>
          <div class="segment" id="nav-segment">
            <button class="segment-btn" data-nav-style="sidebar">◀ On Side</button>
            <button class="segment-btn" data-nav-style="topbar">▲ On Top</button>
          </div>
        </div>
      </div>

      <!-- Audio Options -->
      <div class="card">
        <h2>Audio</h2>
        <div class="setting-row">
          <div>
            <div class="setting-label">Volume</div>
          </div>
          <div class="vol-row" style="width:55%">
            <input type="range" id="vol-slider" min="0" max="1" step="0.05" value="${state.volume}">
            <span id="vol-label">${Math.round(state.volume * 100)}%</span>
          </div>
        </div>
        <div class="setting-row">
          <div>
            <div class="setting-label">Mute</div>
          </div>
          <label class="toggle">
            <input type="checkbox" id="mute-toggle" ${state.muted ? 'checked' : ''}>
            <span class="toggle-track"></span>
          </label>
        </div>
      </div>

      <!-- Some Dev Tools -->
      <div class="card">
        <h2>Developer</h2>
        <div class="setting-row">
          <div>
            <div class="setting-label">Open DevTools</div>
            <div class="setting-desc">Opens a detached Chromium DevTools window.</div>
          </div>
          <button id="devtools-btn" style="padding:7px 16px;border:none;border-radius:8px;background:var(--bg-3);color:var(--text);font-family:inherit;font-weight:700;font-size:13px;cursor:pointer;">Open</button>
        </div>
        <div class="setting-row">
          <div>
            <div class="setting-label">Clear Cache &amp; Reload</div>
            <div class="setting-desc">Wipes the session cache and reloads the game.</div>
          </div>
          <button id="clear-cache-btn" style="padding:7px 16px;border:none;border-radius:8px;background:var(--bg-3);color:var(--text);font-family:inherit;font-weight:700;font-size:13px;cursor:pointer;">Clear</button>
        </div>
      </div>
    </div>
  `;

  // theme buttons
  page.querySelectorAll('[data-theme-val]').forEach(btn => {
    btn.addEventListener('click', e => applyTheme(btn.dataset.themeVal, e.currentTarget));
  });

  // nav segment
  page.querySelectorAll('[data-nav-style]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.navStyle === state.navStyle);
    btn.addEventListener('click', () => {
      applyNavStyle(btn.dataset.navStyle);
    });
  });

  // volume slider
  const volSlider = page.querySelector('#vol-slider');
  const volLabel = page.querySelector('#vol-label');
  volSlider.addEventListener('input', () => {
    const v = parseFloat(volSlider.value);
    state.volume = v;
    localStorage.setItem('volume', v);
    volLabel.textContent = Math.round(v * 100) + '%';
    window.roxstar.setVolume(v);
  });

  // mute toggle
  page.querySelector('#mute-toggle').addEventListener('change', e => {
    state.muted = e.target.checked;
    localStorage.setItem('muted', state.muted);
    window.roxstar.setMuted(state.muted);
    // mute all audio elements in renderer
    document.querySelectorAll('audio, video').forEach(el => {
      el.muted = state.muted;
    });
    // mute audio in the webview
    if (window._gameWebview) {
      const script = `document.querySelectorAll('audio, video').forEach(el => { el.muted = ${state.muted}; });`;
      window._gameWebview.executeJavaScript(script);
    }
  });

  // devtools
  page.querySelector('#devtools-btn').addEventListener('click', () => window.roxstar.openDevTools());

  // cache clear
  page.querySelector('#clear-cache-btn').addEventListener('click', async () => {
    await window.roxstar.clearCache();
    if (window._gameWebview) window._gameWebview.reload();
  });
}
