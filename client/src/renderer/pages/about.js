'use strict';

// css
(function () {
  const s = document.createElement('style');
  s.textContent = `
    .about-hero {
      text-align: center;
      padding: 32px 0 24px;
    }

    .about-hero .big-icon {
      font-size: 64px;
      display: block;
      margin-bottom: 12px;
      animation: float 3s ease-in-out infinite;
    }

    @keyframes float {
      0%,
      100% {
        transform: translateY(0);
      }
      50% {
        transform: translateY(-10px);
      }
    }

    .about-hero h1 {
      -webkit-text-fill-color: unset;
      color: transparent;
    }

    .about-tags {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      margin: 16px 0;
      justify-content: center;
    }

    .tag {
      padding: 4px 12px;
      border-radius: 99px;
      font-size: 12px;
      font-weight: 700;
      background: var(--bg-3);
      color: var(--accent-2);
      border: 1.5px solid var(--border);
    }
  `;
  document.head.appendChild(s);
})();

// html
async function buildAboutPage() {
  const config = await window.roxstar.getConfig();
  const page = document.getElementById('page-about');
  page.innerHTML = `
    <div class="inner-page">
      <div class="about-hero">

        <!-- Hero / Header -->
        <span class="big-icon">⭐</span>
        <h1>RoxStar Client</h1>
        <p class="subtitle" style="margin-bottom:12px">Can you keep a secret? I'm a Moshi on a mission... I'M MISSY KIX! The sassy secret agent slash musician!</p>
        
        <!-- Little Tags -->
        <div class="about-tags">
          <span class="tag">Electron ${config.electronVersion}</span>
          <span class="tag">Node.js ${config.nodeVersion}</span>
          <span class="tag">Flash / PPAPI 32.0.0.303</span>
          <span class="tag">RoxStar Client v${config.version}</span>
        </div>

      </div>

      <!-- About Card -->
      <div class="card">
        <h2>Why not a normal browser?</h2>
        <p style="font-size:14px;color:var(--text-2);line-height:1.7">
          RoxStar Client allows you to run Flash natively in a modern(ish) browser environment. Flash was discontinued for security reasons and is not supported by any browser in its current version. RoxStar Client gives you an isolated browser outside of your main one that has Flash forcibly enabled. There are additional quality of life features as well that makes it the best way to play with the RoxStar server! Also, there are cute themes ^~^
        </p>
      </div>

      <!-- Keyboard Shortcuts -->
      <div class="card">
        <h2>Some useful keyboard shortcuts...</h2>
        <div class="setting-row"><span class="setting-label">Reload page</span><code style="font-size:12px;background:var(--bg-3);padding:3px 8px;border-radius:6px">Ctrl + R</code></div>
        <div class="setting-row"><span class="setting-label">Toggle fullscreen</span><code style="font-size:12px;background:var(--bg-3);padding:3px 8px;border-radius:6px">F11</code></div>
        <div class="setting-row" style="border-bottom:none"><span class="setting-label">Dev tools</span><code style="font-size:12px;background:var(--bg-3);padding:3px 8px;border-radius:6px">Ctrl + Shift + I</code></div>
      </div>
    </div>
  `;
}
