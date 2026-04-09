// @ts-nocheck
/* ═══════════════════════════════════════════════════════════
   STAGE 4 — 노오란 꽃잎 (Yellow Petals)
   서정주 「국화 옆에서」 제4연 (final)
   감정: 완성/고요  ·  색조: 금빛 노랑 + 서리 백색
   ═══════════════════════════════════════════════════════════ */

let _stage4Initialized = false;

export function initStage4() {
  if (_stage4Initialized) return;
  _stage4Initialized = true;

  // ─────────────────────────────────────────
  //  CURSOR
  // ─────────────────────────────────────────
  const cursorEl = document.getElementById('s4cursor');
  let mx = 0, my = 0;
  document.addEventListener('mousemove', e => {
    mx = e.clientX; my = e.clientY;
    if (cursorEl) {
      cursorEl.style.left = mx + 'px';
      cursorEl.style.top  = my + 'px';
    }
  });

  // ─────────────────────────────────────────
  //  GAME ENGINE
  // ─────────────────────────────────────────
  const canvas = document.getElementById('s4game_canvas') as HTMLCanvasElement;
  const ctx = canvas.getContext('2d');

  let W: number, H: number;
  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', () => { resize(); buildWorld(); });

  // ─────────────────────────────────────────
  //  @TUNABLES  (stage 4)
  // ─────────────────────────────────────────
  const tunables = {
    playerStartX: 120,
    playerStartY: -46,
    jumpForce: -12,
    moveSpeed: 2.2,
    gravity: 0.42,
    fragments: [
      { x: 680,  yOffset: -80  },
      { x: 1560, yOffset: -60  },
      { x: 2500, yOffset: -90  },
    ],
    labelOffsetY: -24,
    labelFontSize: 13,
    popupFontSize: 19,
    popupFadeMs: 1400,
  };

  // ── State ──
  const WORLD_W = 3200;
  let camX = 0;
  let gameStarted = false;
  let gameOver = false;
  let collectedCount = 0;
  const TOTAL_FRAGMENTS = tunables.fragments.length;
  let endingShown = false;
  let bloomPhase = 0;         // 0→1, chrysanthemum bloom animation
  let bloomTriggered = false;
  let bloomDoneTime = 0;

  // ── Player ──
  const player = {
    x: tunables.playerStartX, y: 0, vy: 0, vx: 0,
    w: 22, h: 48,
    onGround: false, dir: 1,
    walkFrame: 0, walkTimer: 0,
    breathPhase: 0,
  };

  // ── Keys ──
  const keys: Record<string, boolean> = {};
  document.addEventListener('keydown', e => { keys[e.key] = true; });
  document.addEventListener('keyup',   e => { keys[e.key] = false; });

  // ── Platforms / ground ──
  let platforms: { x: number; y: number; w: number; h: number }[] = [];
  let groundY = 0;

  function buildWorld() {
    groundY = H * 0.75;
    platforms = [
      { x: -200, y: groundY, w: WORLD_W + 400, h: H },
      // gentle, minimal platforms — contemplative pace
      { x: 520,  y: groundY - 55,  w: 160, h: 12 },
      { x: 1100, y: groundY - 45,  w: 180, h: 12 },
      { x: 1900, y: groundY - 60,  w: 150, h: 12 },
      { x: 2400, y: groundY - 50,  w: 170, h: 12 },
    ];
    player.y = groundY + tunables.playerStartY;
  }
  buildWorld();

  // ── Word fragments (시어 파편) ──
  const WORDS = [
    '노오란 네 꽃잎이 피려고',
    '간밤에 무서리가 저리 내리고',
    '내게는 잠도 오지 않았나 보다.',
  ];

  let fragments: { x: number; y: number; word: string; collected: boolean; bob: number }[] = [];

  function initFragments() {
    fragments = tunables.fragments.map((f, i) => ({
      x: f.x,
      y: groundY + f.yOffset,
      word: WORDS[i],
      collected: false,
      bob: i,
    }));
  }
  initFragments();

  // ── Popup state ──
  let popupWord = '';
  let popupX = 0;
  let popupY = 0;
  let popupTimer = 0;

  // ═════════════════════════════════════════
  //  ATMOSPHERE: Stars, frost, chrysanthemum
  // ═════════════════════════════════════════

  // ── Stars (late autumn night sky) ──
  const stars: { x: number; y: number; r: number; phase: number; parallax: number; bright: boolean }[] = [];
  for (let i = 0; i < 200; i++) {
    stars.push({
      x: Math.random() * WORLD_W,
      y: Math.random() * (groundY * 0.85),
      r: Math.random() < 0.88 ? Math.random() * 0.8 + 0.3 : Math.random() * 1.5 + 0.9,
      phase: Math.random() * Math.PI * 2,
      parallax: 0.03 + Math.random() * 0.12,
      bright: Math.random() < 0.12,
    });
  }

  // ── Frost particles (the "first frost" — 무서리) ──
  const frostParticles: {
    x: number; y: number; r: number;
    vy: number; vx: number;
    opacity: number; phase: number;
    sparkle: number;
  }[] = [];
  for (let i = 0; i < 120; i++) {
    frostParticles.push({
      x: Math.random() * W,
      y: Math.random() * H,
      r: Math.random() * 1.8 + 0.4,
      vy: Math.random() * 0.25 + 0.05,
      vx: (Math.random() - 0.5) * 0.15,
      opacity: Math.random() * 0.5 + 0.2,
      phase: Math.random() * Math.PI * 2,
      sparkle: Math.random(),
    });
  }

  // ── Chrysanthemum bud (blooms as fragments are collected) ──
  const chrysanthemum = {
    x: 1600,
    baseY: 0,
    petalCount: 24,
    openAmount: 0,        // 0 = closed bud, 1 = fully bloomed
    targetOpen: 0,
    glowIntensity: 0,
  };

  function updateChrysanthemumPos() {
    chrysanthemum.baseY = groundY - 18;
  }
  updateChrysanthemumPos();

  // ── Distant hills (dark silhouettes) ──
  const farHills: { x: number; h: number }[] = [];
  for (let i = 0; i < 14; i++) {
    farHills.push({ x: i * 260 + Math.random() * 80, h: 50 + Math.random() * 40 });
  }

  // ── Ground frost crystals ──
  const groundFrost: { x: number; size: number; phase: number }[] = [];
  for (let i = 0; i < 60; i++) {
    groundFrost.push({
      x: Math.random() * WORLD_W,
      size: Math.random() * 2 + 0.8,
      phase: Math.random() * Math.PI * 2,
    });
  }

  // ═════════════════════════════════════════
  //  DRAW FUNCTIONS
  // ═════════════════════════════════════════

  // ── Sky: deep dark blue-purple (late autumn night) ──
  function drawSky() {
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0,    '#05030f');
    grad.addColorStop(0.2,  '#0a0720');
    grad.addColorStop(0.45, '#12082a');
    grad.addColorStop(0.7,  '#1a0e35');
    grad.addColorStop(1,    '#100a22');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
  }

  // ── Stars ──
  function drawStars() {
    const t = Date.now() / 1000;
    ctx.save();
    stars.forEach(s => {
      const sx = s.x - camX * s.parallax;
      const wx = ((sx % W) + W) % W;
      const twinkle = 0.35 + (Math.sin(t * 1.2 + s.phase) * 0.5 + 0.5) * 0.65;
      ctx.beginPath();
      ctx.arc(wx, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(220,215,240,${twinkle})`;
      ctx.fill();
      // soft halo for bright stars
      if (s.bright) {
        ctx.beginPath();
        ctx.arc(wx, s.y, s.r * 3, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(200,190,235,${twinkle * 0.12})`;
        ctx.fill();
      }
    });
    ctx.restore();
  }

  // ── Subtle galaxy/nebula haze ──
  function drawNightHaze() {
    const cx = W * 0.4;
    const cy = H * 0.25;
    const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, W * 0.55);
    grd.addColorStop(0,   'rgba(60,40,100,0.08)');
    grd.addColorStop(0.4, 'rgba(40,25,70,0.04)');
    grd.addColorStop(1,   'rgba(0,0,0,0)');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, W, H);
  }

  // ── Far hills (dark silhouettes against night sky) ──
  function drawFarHills() {
    ctx.save();
    ctx.translate(-camX * 0.08, 0);
    ctx.beginPath();
    ctx.moveTo(-100, groundY + 10);
    farHills.forEach(h => {
      ctx.lineTo(h.x, groundY - h.h);
      ctx.lineTo(h.x + 140, groundY - h.h * 0.55);
    });
    ctx.lineTo(WORLD_W + 200, groundY + 10);
    ctx.closePath();
    ctx.fillStyle = 'rgba(10,6,20,0.92)';
    ctx.fill();
    ctx.restore();
  }

  // ── Ground (frozen earth, dark with frost) ──
  function drawGround() {
    const grad = ctx.createLinearGradient(0, groundY, 0, H);
    grad.addColorStop(0,   'rgba(25,18,40,0.95)');
    grad.addColorStop(0.3, 'rgba(15,10,28,1)');
    grad.addColorStop(1,   'rgba(5,3,12,1)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, groundY, W, H - groundY);

    // frost sheen on the ground surface
    const frostGrad = ctx.createLinearGradient(0, groundY, 0, groundY + 6);
    frostGrad.addColorStop(0, 'rgba(200,210,230,0.18)');
    frostGrad.addColorStop(1, 'rgba(200,210,230,0)');
    ctx.fillStyle = frostGrad;
    ctx.fillRect(0, groundY, W, 6);
  }

  // ── Ground frost crystals ──
  function drawGroundFrost() {
    const t = Date.now() / 1000;
    ctx.save();
    groundFrost.forEach(f => {
      const sx = f.x - camX;
      if (sx < -20 || sx > W + 20) return;
      const shimmer = 0.4 + Math.sin(t * 0.8 + f.phase) * 0.3;
      // tiny crystalline sparkle
      ctx.beginPath();
      ctx.arc(sx, groundY + 2 + Math.sin(f.phase) * 3, f.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(220,230,250,${shimmer})`;
      ctx.fill();
      // cross sparkle for larger crystals
      if (f.size > 1.4) {
        ctx.strokeStyle = `rgba(240,245,255,${shimmer * 0.6})`;
        ctx.lineWidth = 0.4;
        ctx.beginPath();
        ctx.moveTo(sx - 3, groundY + 2); ctx.lineTo(sx + 3, groundY + 2);
        ctx.moveTo(sx, groundY - 1); ctx.lineTo(sx, groundY + 5);
        ctx.stroke();
      }
    });
    ctx.restore();
  }

  // ── Platforms (frosted stone, sparse) ──
  function drawPlatforms() {
    platforms.slice(1).forEach(p => {
      const px = p.x - camX;
      if (px > W + 50 || px + p.w < -50) return;
      // stone body
      ctx.fillStyle = 'rgba(30,22,48,0.95)';
      ctx.fillRect(px, p.y, p.w, p.h);
      // frost edge on top
      ctx.fillStyle = 'rgba(200,215,240,0.45)';
      ctx.fillRect(px, p.y, p.w, 1.5);
      // tiny frost dots
      for (let i = 0; i < 4; i++) {
        const dx = px + p.w * (0.15 + i * 0.22);
        ctx.beginPath();
        ctx.arc(dx, p.y - 0.5, 0.8, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(230,240,255,0.6)';
        ctx.fill();
      }
    });
  }

  // ── Frost particle system (무서리 falling/drifting) ──
  function drawFrostParticles() {
    const t = Date.now() / 1000;
    frostParticles.forEach(p => {
      p.y += p.vy;
      p.x += p.vx + Math.sin(t * 0.3 + p.phase) * 0.08;
      // wrap around
      if (p.y > H + 10) { p.y = -10; p.x = Math.random() * W; }
      if (p.x < -5) p.x = W + 5;
      if (p.x > W + 5) p.x = -5;

      const shimmer = 0.5 + Math.sin(t * 1.6 + p.phase) * 0.5;
      const alpha = p.opacity * shimmer;

      // crystalline glow
      if (p.r > 1.2) {
        const glw = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 4);
        glw.addColorStop(0, `rgba(210,220,245,${alpha * 0.3})`);
        glw.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = glw;
        ctx.fillRect(p.x - p.r * 4, p.y - p.r * 4, p.r * 8, p.r * 8);
      }

      // frost crystal core
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(230,240,255,${alpha})`;
      ctx.fill();

      // occasional sparkle cross
      if (p.sparkle > 0.85 && shimmer > 0.7) {
        ctx.strokeStyle = `rgba(255,255,255,${alpha * 0.5})`;
        ctx.lineWidth = 0.3;
        ctx.beginPath();
        const sz = p.r * 1.5;
        ctx.moveTo(p.x - sz, p.y); ctx.lineTo(p.x + sz, p.y);
        ctx.moveTo(p.x, p.y - sz); ctx.lineTo(p.x, p.y + sz);
        ctx.stroke();
      }
    });
  }

  // ── Chrysanthemum (국화) — blooms as fragments are collected ──
  function drawChrysanthemum() {
    const cx = chrysanthemum.x - camX;
    const cy = chrysanthemum.baseY;
    if (cx < -200 || cx > W + 200) return;

    const t = Date.now() / 1000;
    const open = chrysanthemum.openAmount;

    // stem
    ctx.strokeStyle = 'rgba(60,80,40,0.85)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.quadraticCurveTo(cx - 3, cy - 30, cx + 1, cy - 55);
    ctx.stroke();

    // leaves on stem
    ctx.fillStyle = 'rgba(50,75,35,0.7)';
    ctx.beginPath();
    ctx.ellipse(cx - 8, cy - 20, 8, 3.5, -0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx + 7, cy - 35, 7, 3, 0.3, 0, Math.PI * 2);
    ctx.fill();

    const flowerCX = cx + 1;
    const flowerCY = cy - 58;

    // glow behind flower (golden, intensifies as it blooms)
    const glowR = 30 + open * 50;
    const glowAlpha = 0.08 + open * 0.18 + chrysanthemum.glowIntensity * 0.15;
    const flowerGlow = ctx.createRadialGradient(flowerCX, flowerCY, 0, flowerCX, flowerCY, glowR);
    flowerGlow.addColorStop(0, `rgba(240,200,60,${glowAlpha})`);
    flowerGlow.addColorStop(0.5, `rgba(220,180,40,${glowAlpha * 0.5})`);
    flowerGlow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = flowerGlow;
    ctx.fillRect(flowerCX - glowR, flowerCY - glowR, glowR * 2, glowR * 2);

    ctx.save();
    ctx.translate(flowerCX, flowerCY);

    if (open < 0.05) {
      // Closed bud
      ctx.beginPath();
      ctx.ellipse(0, 0, 6, 10, 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(160,140,50,0.9)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(120,100,30,0.6)';
      ctx.lineWidth = 0.5;
      ctx.stroke();
      // bud sepals
      ctx.beginPath();
      ctx.ellipse(-4, 5, 4, 7, -0.3, 0, Math.PI);
      ctx.fillStyle = 'rgba(60,80,40,0.7)';
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(4, 5, 4, 7, 0.3, 0, Math.PI);
      ctx.fill();
    } else {
      // Blooming petals
      const petalCount = chrysanthemum.petalCount;
      const breathSway = Math.sin(t * 0.8) * 0.02;

      // outer petals (larger, more open)
      for (let i = 0; i < petalCount; i++) {
        const angle = (i / petalCount) * Math.PI * 2 + breathSway;
        const petalLen = 8 + open * 18 + Math.sin(i * 2.3) * 2;
        const petalWidth = 3 + open * 3;
        const spread = open * 0.9;

        ctx.save();
        ctx.rotate(angle);
        ctx.translate(0, -4 * open);

        // petal shape
        ctx.beginPath();
        ctx.ellipse(0, -petalLen * spread, petalWidth, petalLen, 0, 0, Math.PI * 2);

        // golden yellow gradient for each petal
        const hue = 45 + Math.sin(i * 1.5) * 8;
        const sat = 85 + Math.sin(i * 0.7) * 10;
        const light = 58 + Math.sin(i * 1.2 + t * 0.5) * 5;
        ctx.fillStyle = `hsla(${hue}, ${sat}%, ${light}%, ${0.75 + open * 0.2})`;
        ctx.fill();
        ctx.strokeStyle = `rgba(180,150,30,${0.3 + open * 0.2})`;
        ctx.lineWidth = 0.4;
        ctx.stroke();

        ctx.restore();
      }

      // inner petals (tighter, slightly different hue)
      const innerCount = Math.floor(petalCount * 0.6);
      for (let i = 0; i < innerCount; i++) {
        const angle = (i / innerCount) * Math.PI * 2 + Math.PI / innerCount + breathSway;
        const petalLen = 5 + open * 10;
        const petalWidth = 2 + open * 2;

        ctx.save();
        ctx.rotate(angle);
        ctx.translate(0, -2 * open);

        ctx.beginPath();
        ctx.ellipse(0, -petalLen * open * 0.7, petalWidth, petalLen, 0, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(250,220,80,${0.7 + open * 0.25})`;
        ctx.fill();
        ctx.restore();
      }

      // center disk
      ctx.beginPath();
      ctx.arc(0, 0, 4 + open * 2, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(180,140,30,${0.8 + open * 0.2})`;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(0, 0, 2 + open, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(220,180,50,0.9)`;
      ctx.fill();
    }

    ctx.restore();
  }

  // ── Fragments (golden diamond shards) ──
  function drawFragments() {
    const t = Date.now() / 1000;
    fragments.forEach((f, i) => {
      if (f.collected) return;
      const fx = f.x - camX;
      if (fx < -100 || fx > W + 100) return;
      const bob = Math.sin(t * 1.2 + f.bob * 2.2) * 7;
      const fy = f.y + bob;

      // golden glow aura
      const glw = ctx.createRadialGradient(fx, fy, 0, fx, fy, 65);
      glw.addColorStop(0, 'rgba(240,200,60,0.28)');
      glw.addColorStop(0.5, 'rgba(220,180,40,0.10)');
      glw.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = glw;
      ctx.fillRect(fx - 65, fy - 65, 130, 130);

      // diamond shape
      ctx.save();
      ctx.translate(fx, fy);
      const pulse = 1 + Math.sin(t * 1.8 + i * 1.5) * 0.07;
      ctx.scale(pulse, pulse);
      ctx.beginPath();
      ctx.moveTo(0, -16); ctx.lineTo(11, 0); ctx.lineTo(0, 16); ctx.lineTo(-11, 0);
      ctx.closePath();
      ctx.strokeStyle = 'rgba(240,210,80,0.8)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = 'rgba(240,200,60,0.18)';
      ctx.fill();
      // inner highlight
      ctx.beginPath();
      ctx.arc(-3, -4, 2.2, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,245,200,0.95)';
      ctx.fill();
      ctx.restore();

      // proximity word label
      const dist = Math.hypot(f.x - player.x, f.y - (player.y + player.h / 2));
      if (dist < 95) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, (95 - dist) / 95);
        ctx.font = `${tunables.labelFontSize}px "Noto Serif KR", serif`;
        ctx.fillStyle = 'rgba(250,235,180,0.95)';
        ctx.textAlign = 'center';
        ctx.fillText(f.word, fx, fy + tunables.labelOffsetY);
        ctx.restore();
      }
    });
  }

  // ── Word popup (drawn on canvas) ──
  function drawPopup() {
    if (popupTimer <= 0) return;
    const now = Date.now();
    const elapsed = tunables.popupFadeMs - popupTimer;
    const progress = elapsed / tunables.popupFadeMs;
    let alpha = 1;
    if (progress > 0.7) {
      alpha = 1 - (progress - 0.7) / 0.3;
    }
    const rise = progress * 30;
    ctx.save();
    ctx.globalAlpha = Math.max(0, alpha);
    ctx.font = `${tunables.popupFontSize}px "Noto Serif KR", serif`;
    ctx.fillStyle = 'rgba(255,240,180,0.95)';
    ctx.textAlign = 'center';
    ctx.fillText(popupWord, popupX - camX, popupY - rise);
    ctx.restore();
    popupTimer -= 16.67;  // approx per frame
  }

  // ── Player (night wanderer, dark clothing with golden accent) ──
  function drawPlayer() {
    const px = player.x - camX;
    const py = player.y;
    const t = Date.now() / 1000;
    player.breathPhase = t;

    ctx.save();
    ctx.translate(px, py);

    let legSwing = 0, armSwing = 0;
    const moving = Math.abs(player.vx) > 0.5;
    if (moving) {
      player.walkTimer += 0.11;
      legSwing = Math.sin(player.walkTimer) * 10;
      armSwing = Math.cos(player.walkTimer) * 7;
    }
    const flip = player.dir < 0 ? -1 : 1;
    ctx.scale(flip, 1);

    // soft golden halo around player (poet watching the night)
    const halo = ctx.createRadialGradient(0, player.h * 0.4, 0, 0, player.h * 0.4, 45);
    halo.addColorStop(0, 'rgba(220,190,80,0.08)');
    halo.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = halo;
    ctx.fillRect(-45, player.h * 0.4 - 45, 90, 90);

    // shadow
    ctx.save();
    ctx.scale(1, 0.25);
    ctx.beginPath();
    ctx.ellipse(0, player.h + 10, 13, 5, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fill();
    ctx.restore();

    // legs
    ctx.strokeStyle = '#1a1428';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-4, player.h * 0.62);
    ctx.lineTo(-6 - legSwing * 0.28, player.h);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(4, player.h * 0.62);
    ctx.lineTo(6 + legSwing * 0.28, player.h);
    ctx.stroke();

    // body (dark indigo-brown hanbok tone)
    ctx.beginPath();
    ctx.roundRect(-10, player.h * 0.3, 20, player.h * 0.4, 4);
    ctx.fillStyle = '#2a1e3a';
    ctx.fill();
    ctx.strokeStyle = 'rgba(200,180,120,0.25)';
    ctx.lineWidth = 0.5;
    ctx.stroke();

    // arms
    ctx.strokeStyle = '#2a1e3a';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-9, player.h * 0.35);
    ctx.lineTo(-16 - armSwing * 0.35, player.h * 0.55);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(9, player.h * 0.35);
    ctx.lineTo(16 + armSwing * 0.35, player.h * 0.5);
    ctx.stroke();

    // head
    const breathY = Math.sin(player.breathPhase * 1.3) * 0.5;
    const headY = player.h * 0.15 + breathY;
    ctx.beginPath();
    ctx.arc(0, headY, 9, 0, Math.PI * 2);
    ctx.fillStyle = '#d4b08a';
    ctx.fill();
    // hair
    ctx.beginPath();
    ctx.arc(0, headY - 2, 9, Math.PI, 0);
    ctx.fillStyle = '#100a18';
    ctx.fill();

    // breath cloud (cold night air)
    if (!moving) {
      const ba = (Math.sin(t * 1.2) * 0.5 + 0.5) * 0.3;
      ctx.beginPath();
      ctx.arc(12, headY + 1, 4, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(220,230,250,${ba})`;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(16, headY - 1, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(220,230,250,${ba * 0.6})`;
      ctx.fill();
    }

    ctx.restore();
  }

  // ═════════════════════════════════════════
  //  BLOOM ANIMATION (after all fragments collected)
  // ═════════════════════════════════════════
  let bloomParticles: { x: number; y: number; vx: number; vy: number; r: number; alpha: number; hue: number }[] = [];

  function triggerBloomAnimation() {
    bloomTriggered = true;
    bloomPhase = 0;
    // create burst particles
    bloomParticles = [];
    const cx = chrysanthemum.x;
    const cy = chrysanthemum.baseY - 58;
    for (let i = 0; i < 60; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 2.5 + 0.5;
      bloomParticles.push({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - Math.random() * 1.5,
        r: Math.random() * 3 + 1,
        alpha: 1,
        hue: 40 + Math.random() * 20,
      });
    }
  }

  function updateBloomAnimation() {
    if (!bloomTriggered) return;
    bloomPhase = Math.min(1, bloomPhase + 0.008);
    chrysanthemum.openAmount += (1 - chrysanthemum.openAmount) * 0.025;
    chrysanthemum.glowIntensity = Math.sin(bloomPhase * Math.PI) * 1.5;

    // update burst particles
    bloomParticles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.02;
      p.alpha *= 0.985;
    });
    bloomParticles = bloomParticles.filter(p => p.alpha > 0.02);

    if (bloomPhase >= 1 && !bloomDoneTime) {
      bloomDoneTime = Date.now();
    }
  }

  function drawBloomParticles() {
    bloomParticles.forEach(p => {
      const sx = p.x - camX;
      ctx.beginPath();
      ctx.arc(sx, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${p.hue}, 85%, 65%, ${p.alpha})`;
      ctx.fill();
    });
  }

  // ═════════════════════════════════════════
  //  PHYSICS & COLLECTION
  // ═════════════════════════════════════════
  function updatePlayer() {
    if (!gameStarted || gameOver) return;

    const left  = keys['ArrowLeft']  || keys['a'] || keys['A'];
    const right = keys['ArrowRight'] || keys['d'] || keys['D'];
    const jump  = keys['ArrowUp']    || keys['w'] || keys['W'] || keys[' '];

    if (left)  { player.vx = -tunables.moveSpeed; player.dir = -1; }
    if (right) { player.vx =  tunables.moveSpeed; player.dir =  1; }
    if (!left && !right) player.vx *= 0.72;

    if (jump && player.onGround) {
      player.vy = tunables.jumpForce;
      player.onGround = false;
    }

    player.vy += tunables.gravity;
    player.x  += player.vx;
    player.y  += player.vy;

    if (player.x < 60) player.x = 60;
    if (player.x > WORLD_W - 60) player.x = WORLD_W - 60;

    player.onGround = false;
    platforms.forEach(p => {
      const pb = player.y + player.h;
      const prevB = pb - player.vy;
      if (player.x + 10 > p.x && player.x - 10 < p.x + p.w) {
        if (prevB <= p.y && pb >= p.y && player.vy >= 0) {
          player.y = p.y - player.h;
          player.vy = 0;
          player.onGround = true;
        }
      }
    });

    // fragment collection
    fragments.forEach((f, i) => {
      if (f.collected) return;
      const dist = Math.hypot(player.x - f.x, player.y + player.h / 2 - f.y);
      if (dist < 42) {
        f.collected = true;
        collectedCount++;
        collectFragment(i, f.word);
      }
    });

    // camera (smooth follow)
    const targetCam = player.x - W / 3;
    camX += (targetCam - camX) * 0.06;
    camX = Math.max(0, Math.min(camX, WORLD_W - W));
  }

  function collectFragment(i: number, word: string) {
    // HUD dot
    const dot = document.getElementById('s4d' + i);
    if (dot) dot.classList.add('collected');
    // poem line
    const line = document.getElementById('s4l' + i);
    if (line) line.classList.add('found');

    // popup
    popupWord = word;
    popupX = fragments[i].x;
    popupY = fragments[i].y - 10;
    popupTimer = tunables.popupFadeMs;

    // also show in s4word_flash
    const flash = document.getElementById('s4word_flash');
    if (flash) {
      flash.textContent = word;
      flash.classList.add('show');
      setTimeout(() => flash.classList.remove('show'), tunables.popupFadeMs);
    }

    // update chrysanthemum bloom target
    chrysanthemum.targetOpen = collectedCount / TOTAL_FRAGMENTS;

    // check for completion
    if (collectedCount >= TOTAL_FRAGMENTS) {
      setTimeout(() => {
        gameOver = true;
        triggerBloomAnimation();
      }, 800);
    }
  }

  // ── Animate chrysanthemum opening toward target ──
  function updateChrysanthemum() {
    if (!bloomTriggered) {
      chrysanthemum.openAmount += (chrysanthemum.targetOpen * 0.7 - chrysanthemum.openAmount) * 0.02;
      chrysanthemum.glowIntensity += (chrysanthemum.targetOpen - chrysanthemum.glowIntensity) * 0.03;
    }
  }

  // ═════════════════════════════════════════
  //  ENDING
  // ═════════════════════════════════════════
  function showEnding() {
    if (endingShown) return;
    endingShown = true;
    const ending = document.getElementById('s4ending_screen');
    if (ending) ending.classList.add('show');
    if (typeof window.onGameComplete === 'function') {
      window.onGameComplete();
    }
  }

  // ═════════════════════════════════════════
  //  _running FLAG & gameStartS4
  // ═════════════════════════════════════════
  let _running = false;

  function gameStartS4() {
    if (_running) return;
    _running = true;
    gameStarted = true;
    gameOver = false;
    collectedCount = 0;
    endingShown = false;
    bloomTriggered = false;
    bloomPhase = 0;
    bloomDoneTime = 0;
    bloomParticles = [];
    popupTimer = 0;

    // player reset
    resize();
    buildWorld();
    updateChrysanthemumPos();
    player.x = tunables.playerStartX;
    player.y = groundY + tunables.playerStartY;
    player.vy = 0;
    player.vx = 0;
    player.dir = 1;
    player.walkTimer = 0;

    // fragments reset
    initFragments();

    // chrysanthemum reset
    chrysanthemum.openAmount = 0;
    chrysanthemum.targetOpen = 0;
    chrysanthemum.glowIntensity = 0;

    // HUD reset
    for (let i = 0; i < TOTAL_FRAGMENTS; i++) {
      const d = document.getElementById('s4d' + i);
      if (d) d.classList.remove('collected');
      const l = document.getElementById('s4l' + i);
      if (l) l.classList.remove('found');
    }
    const flash = document.getElementById('s4word_flash');
    if (flash) flash.classList.remove('show');
    const ending = document.getElementById('s4ending_screen');
    if (ending) ending.classList.remove('show');

    camX = 0;

    requestAnimationFrame(gameLoop);
  }

  // ═════════════════════════════════════════
  //  GAME LOOP
  // ═════════════════════════════════════════
  function gameLoop() {
    if (!_running) return;

    ctx.clearRect(0, 0, W, H);

    // ── Background layers ──
    drawSky();
    drawNightHaze();
    drawStars();
    drawFarHills();

    // ── Ground & world ──
    drawGround();
    drawGroundFrost();
    drawPlatforms();

    // ── Chrysanthemum (the central image) ──
    updateChrysanthemum();
    drawChrysanthemum();

    // ── Fragments & popup ──
    drawFragments();
    drawPopup();

    // ── Frost particles (foreground atmosphere) ──
    drawFrostParticles();

    // ── Player ──
    drawPlayer();

    // ── Physics ──
    updatePlayer();

    // ── Bloom animation (post-collection) ──
    if (bloomTriggered) {
      updateBloomAnimation();
      drawBloomParticles();
    }

    // ── Ending trigger ──
    if (bloomDoneTime && Date.now() - bloomDoneTime > 2200 && !endingShown) {
      _running = false;
      showEnding();
      return;
    }

    requestAnimationFrame(gameLoop);
  }

  // ─────────────────────────────────────────
  //  ADMIN API (관리자 패널이 읽음)
  // ─────────────────────────────────────────
  (window as any).s4API = {
    tunables,
    schema: {
      playerStartX:  { min: 0,    max: 3000, step: 10,  label: '캐릭터 시작 X' },
      playerStartY:  { min: -400, max: 0,    step: 1,   label: '캐릭터 시작 Y' },
      jumpForce:     { min: -25,  max: -5,   step: 0.5, label: '점프 힘' },
      moveSpeed:     { min: 1,    max: 8,    step: 0.1, label: '이동 속도' },
      gravity:       { min: 0.2,  max: 2,    step: 0.05, label: '중력' },
      labelOffsetY:  { min: -80,  max: 0,    step: 1,   label: '라벨 Y 오프셋' },
      labelFontSize: { min: 8,    max: 24,   step: 1,   label: '라벨 폰트' },
      popupFontSize: { min: 12,   max: 36,   step: 1,   label: '팝업 폰트' },
      popupFadeMs:   { min: 400,  max: 3000, step: 100, label: '팝업 시간(ms)' },
    },
    fragmentSchema: { xMin: 0, xMax: 3200, yOffsetMin: -400, yOffsetMax: 0 },
    setTunable(key: string, value: number) { (tunables as any)[key] = value; },
    setFragment(idx: number, x: number, yOffset: number) {
      tunables.fragments[idx] = { x, yOffset };
      if (fragments[idx]) {
        fragments[idx].x = x;
        fragments[idx].y = groundY + yOffset;
      }
    },
    restart: gameStartS4,
  };

  // ─────────────────────────────────────────
  //  GLOBAL REGISTRATION
  // ─────────────────────────────────────────
  window.gameStartS4 = gameStartS4;
  window.initStage4  = initStage4;

} // end initStage4
