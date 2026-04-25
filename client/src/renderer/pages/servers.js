'use strict';

// css
(function () {
  const s = document.createElement('style');
  s.textContent = `
    .server-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
      gap: 14px;
    }

    .server-card {
      background: var(--surface);
      border: 1.5px solid var(--border);
      border-radius: var(--radius);
      padding: 18px 20px;
      cursor: pointer;
      transition: box-shadow var(--transition), border-color var(--transition), transform .1s;
      position: relative;
      overflow: hidden;
    }

    .server-card:hover {
      box-shadow: var(--shadow);
      border-color: var(--accent-2);
      transform: translateY(-2px);
    }

    .server-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 3px;
      background: linear-gradient(90deg, var(--accent), var(--accent-2));
    }

    .server-card h3 {
      font-size: 14px;
      font-weight: 700;
      margin-bottom: 4px;
    }

    .server-card p {
      font-size: 12px;
      color: var(--text-2);
    }

    .connect-btn {
      padding: 7px 16px;
      font-size: 12px;
      font-weight: 700;
      border: none;
      border-radius: var(--radius-sm);
      cursor: pointer;
      font-family: inherit;
      background: linear-gradient(135deg, var(--accent), var(--accent-2));
      color: var(--text-inv);
      transition: opacity .15s;
    }

    .connect-btn:hover {
      opacity: .88;
    }

    .server-card .connect-btn {
      margin-top: 14px;
    }

    .status-dot {
      display: inline-block;
      width: 7px;
      height: 7px;
      border-radius: 50%;
      margin-right: 5px;
      vertical-align: middle;
    }

    .status-dot.online {
      background: var(--accent-3);
    }

    .status-dot.offline {
      background: #f87171;
    }

    .server-add-form {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .server-add-actions {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      margin-top: 4px;
    }

    .input-field {
      width: 100%;
      padding: 8px 12px;
      border: 1.5px solid var(--border);
      border-radius: var(--radius-sm);
      background: var(--bg-2);
      color: var(--text);
      font-family: inherit;
      font-size: 13px;
      outline: none;
      transition: border-color var(--transition);
    }

    .input-field:focus {
      border-color: var(--accent-2);
    }

    .input-field::placeholder {
      color: var(--text-2);
    }

    .remove-server-btn {
      position: absolute;
      top: 10px;
      right: 10px;
      border: none;
      background: transparent;
      cursor: pointer;
      font-size: 13px;
      color: var(--text-2);
      padding: 3px 7px;
      border-radius: var(--radius-sm);
      line-height: 1;
      transition: background var(--transition), color var(--transition);
    }

    .remove-server-btn:hover {
      background: #f87171;
      color: #fff;
    }

    .restore-btn {
      padding: 7px 16px;
      font-size: 12px;
      font-weight: 700;
      border: 1.5px solid var(--border);
      border-radius: var(--radius-sm);
      cursor: pointer;
      font-family: inherit;
      background: transparent;
      color: var(--text-2);
      transition: background var(--transition), border-color var(--transition);
    }

    .restore-btn:hover {
      background: var(--nav-hover);
      border-color: var(--accent-2);
    }

    .server-card.connected {
      border-color: var(--accent-3);
      box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent-3) 25%, transparent);
    }

    .server-badge {
      display: inline-block;
      font-size: 10px;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 20px;
      background: var(--accent-3);
      color: #fff;
      margin-left: 6px;
      vertical-align: middle;
    }
  `;
  document.head.appendChild(s);
})();

// server functions
function loadServers() {
  const stored = localStorage.getItem('servers');
  if (stored) return JSON.parse(stored);
  return DEFAULT_SERVERS.map(s => ({ ...s, url: s.url || state.gameUrl }));
}

function saveServers(list) {
  localStorage.setItem('servers', JSON.stringify(list));
}

function buildServersPage() {
  renderServersPage();
}

function renderServersPage() {
  const page = document.getElementById('page-servers');
  const servers = loadServers();

  // html
  page.innerHTML = `
    <div class="inner-page">
      <!-- Browser -->
      <h1>Server Selection</h1>
      <p class="subtitle">Here you can choose which host you're connecting to and playing on.</p>
      <div class="server-grid">
        ${servers.map(s => `
          <div class="server-card${state.connectedServer?.url === s.url ? ' connected' : ''}">
            <button class="remove-server-btn" data-url="${esc(s.url)}" title="Remove server">&times;</button>
            <h3>${esc(s.name)}${state.connectedServer?.url === s.url ? '<span class="server-badge">Connected</span>' : ''}</h3>
            <p><span class="status-dot ${s.online ? 'online' : 'offline'}"></span>${s.online ? 'Online' : 'Offline'} &mdash; ${esc(s.url)}</p>
            <p style="margin-top:6px">${esc(s.desc || '')}</p>
            <button class="connect-btn" data-url="${esc(s.url)}" data-name="${esc(s.name)}">${state.connectedServer?.url === s.url ? 'Reconnect' : 'Connect'}</button>
          </div>
        `).join('')}
      </div>

      <div class="card" style="margin-top:24px">
        <h2>Add Server</h2>
        <div class="server-add-form">
          <input class="input-field" id="new-server-name" type="text" placeholder="Server Name" maxlength="60">
          <input class="input-field" id="new-server-url" type="text" placeholder="http://..." maxlength="200">
          <input class="input-field" id="new-server-desc" type="text" placeholder="Description (optional)" maxlength="120">
          <div class="server-add-actions">
            <button class="connect-btn" id="server-add-btn">Add Server</button>
            <button class="restore-btn" id="server-restore-btn">Restore Defaults</button>
          </div>
        </div>
      </div>
    </div>
  `;

  page.querySelectorAll('.connect-btn[data-url]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (window._gameWebview) window._gameWebview.loadURL(btn.dataset.url);
      setConnectedServer({ name: btn.dataset.name, url: btn.dataset.url });
      renderServersPage();
      navigateTo('game');
    });
  });

  page.querySelectorAll('.remove-server-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const list = loadServers().filter(s => s.url !== btn.dataset.url);
      saveServers(list);
      renderServersPage();
    });
  });

  page.querySelector('#server-add-btn').addEventListener('click', () => {
    const name = page.querySelector('#new-server-name').value.trim();
    const url  = page.querySelector('#new-server-url').value.trim();
    const desc = page.querySelector('#new-server-desc').value.trim();
    if (!name || !url) return;
    const list = loadServers();
    if (list.some(s => s.url === url)) return;
    list.push({ name, url, desc, online: false });
    saveServers(list);
    renderServersPage();
  });

  page.querySelector('#server-restore-btn').addEventListener('click', () => {
    localStorage.removeItem('servers');
    renderServersPage();
  });
}
