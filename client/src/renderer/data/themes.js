'use strict';

const THEMES = {
  light: { label: 'Light', icon: '☀️' },
  dark: { label: 'Dark', icon: '🌙' },
  ocean: { label: 'Ocean', icon: '🌊' },
  candy: { label: 'Candy', icon: '🍬' },
};

(function () {
  const s = document.createElement('style');
  s.textContent = `
[data-theme="light"] {
  --accent: #ff6eb4;
  --accent-2: #a78bfa;
  --accent-3: #34d399;
  --bg: #fdf4ff;
  --bg-2: #ffffff;
  --bg-3: #f3e8ff;
  --surface: #ffffff;
  --surface-2: #fce7f3;
  --border: #e9d5ff;
  --text: #1e1b4b;
  --text-2: #6b7280;
  --text-inv: #ffffff;
  --nav-bg: #ffffff;
  --nav-active-bg: linear-gradient(135deg, #fbcfe8 0%, #ddd6fe 100%);
  --nav-active-text: #7c3aed;
  --nav-hover: #f5f3ff;
  --shadow: 0 4px 24px rgba(167,139,250,.13);
  --shadow-sm: 0 2px 8px rgba(167,139,250,.10);
}

[data-theme="dark"] {
  --accent: #ff6eb4;
  --accent-2: #a78bfa;
  --accent-3: #34d399;
  --bg: #12101a;
  --bg-2: #1a1728;
  --bg-3: #221f35;
  --surface: #1e1b2e;
  --surface-2: #2d2a45;
  --border: #3b375a;
  --text: #f0ebff;
  --text-2: #a09bc0;
  --text-inv: #12101a;
  --nav-bg: #1a1728;
  --nav-active-bg: linear-gradient(135deg, #7c3aed55 0%, #be185d44 100%);
  --nav-active-text: #c084fc;
  --nav-hover: #2d2a45;
  --shadow: 0 4px 24px rgba(0,0,0,.4);
  --shadow-sm: 0 2px 8px rgba(0,0,0,.3);
  --toggle-checked-bg: linear-gradient(135deg, #ff88d2 0%, #c084fc 100%);
}

[data-theme="ocean"] {
  --accent: #38bdf8;
  --accent-2: #818cf8;
  --accent-3: #34d399;
  --bg: #0c1a2e;
  --bg-2: #122540;
  --bg-3: #1a3a5c;
  --surface: #132a4a;
  --surface-2: #1e3d6a;
  --border: #2a5a8a;
  --text: #d0e8ff;
  --text-2: #7aafdd;
  --text-inv: #0c1a2e;
  --nav-bg: #0f2035;
  --nav-active-bg: linear-gradient(135deg, #2563eb55 0%, #0891b244 100%);
  --nav-active-text: #60b8ff;
  --nav-hover: #1e3d6a;
  --shadow: 0 4px 24px rgba(0,0,0,.45);
  --shadow-sm: 0 2px 8px rgba(0,0,0,.35);
}

[data-theme="candy"] {
  --accent: #f01b8a;
  --accent-2: #bf00ff;
  --accent-3: #ff69b4;
  --bg: #fff0f6;
  --bg-2: #ffffff;
  --bg-3: #ffe4ef;
  --surface: #ffffff;
  --surface-2: #ffe0f0;
  --border: #ffc0d9;
  --text: #2d0a1a;
  --text-2: #a05070;
  --text-inv: #ffffff;
  --nav-bg: #ffffff;
  --nav-active-bg: linear-gradient(135deg, #ff69b4 0%, #f01b8a 100%);
  --nav-active-text: #c0006a;
  --nav-hover: #ffe4ef;
  --shadow: 0 4px 24px rgba(255,100,180,.18);
  --shadow-sm: 0 2px 8px rgba(255,100,180,.13);
}
  `;
  document.head.appendChild(s);
})();
