// @ts-nocheck
/* ═══════════════════════════════════════
   STAGE 1 — 봄, 소쩍새 (Spring, Cuckoo)
   서정주 「국화 옆에서」 제1연
   감정: 기다림/시작   색조: spring green + soft purple
   ═══════════════════════════════════════ */

let _stage1Initialized = false;
export function initStage1() {
  if (_stage1Initialized) return;
  _stage1Initialized = true;

  // ─────────────────────────────────────────
  //  CURSOR
  // ─────────────────────────────────────────
  const cursorEl = document.getElementById('s1cursor');
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
  const canvas = document.getElementById('s1game_canvas') as HTMLCanvasElement;
  const ctx = canvas.getContext('2d')!;

  let W: number, H: number;
  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', () => { resize(); buildWorld(); });

  // ─────────────────────────────────────────
  //  @TUNABLES  (stage 1)
  //  관리자 패널 슬라이더로 조정 → 마음에 드는 값을 여기에 하드코딩
  // ─────────────────────────────────────────
  const tunables = {
    playerStartX: 120,        // @TUNABLE 캐릭터 시작 X
    playerStartY: -46,        // @TUNABLE 캐릭터 시작 Y (groundY 기준 오프셋)
    jumpForce: -18,           // @TUNABLE 점프 힘 (음수가 강함)
    moveSpeed: 2.8,           // @TUNABLE 이동 속도
    gravity: 1,               // @TUNABLE 중력
    fragments: [
      { x: 580,  yOffset: -80  },  // @TUNABLE 다이아 0
      { x: 1280, yOffset: -160 },  // @TUNABLE 다이아 1
      { x: 2400, yOffset: -120 },  // @TUNABLE 다이아 2
    ],
    labelOffsetY: -24,        // @TUNABLE 다이아 위 시구 라벨 Y 오프셋
    labelFontSize: 13,        // @TUNABLE 다이아 위 라벨 폰트 크기
    popupFontSize: 19,        // @TUNABLE 수집 시 팝업 폰트 크기
    popupFadeMs: 1100,        // @TUNABLE 수집 팝업 표시 시간 (ms)
  };

  // ── State ──
  const WORLD_W = 3200;
  let camX = 0;
  let gameStarted = false;
  let gameOver = false;
  let collectedCount = 0;
  const TOTAL_FRAGMENTS = tunables.fragments.length;
  let popupWord = '';
  let popupX = 0;
  let popupY = 0;
  let popupTimer = 0;

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
    groundY = H * 0.72;
    platforms = [
      { x: -200, y: groundY, w: WORLD_W + 400, h: H },          // ground
      { x: 380,  y: groundY - 60,  w: 130, h: 14 },
      { x: 640,  y: groundY - 110, w: 120, h: 14 },
      { x: 900,  y: groundY - 75,  w: 140, h: 14 },
      { x: 1150, y: groundY - 130, w: 130, h: 14 },
      { x: 1420, y: groundY - 65,  w: 150, h: 14 },
      { x: 1700, y: groundY - 100, w: 120, h: 14 },
      { x: 1960, y: groundY - 140, w: 140, h: 14 },
      { x: 2250, y: groundY - 80,  w: 130, h: 14 },
      { x: 2560, y: groundY - 120, w: 150, h: 14 },
      { x: 2850, y: groundY - 70,  w: 140, h: 14 },
    ];
    player.y = groundY - player.h;
  }
  buildWorld();

  // ── Word fragments (시어 파편) ──
  const WORDS = [
    '한 송이 국화꽃을 피우기 위해',
    '봄부터 소쩍새는',
    '그렇게 울었나 보다.',
  ];

  let fragments: {
    x: number; y: number; word: string; collected: boolean; bob: number;
  }[] = [];

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

  // ── Background: rolling hills (far + mid parallax) ──
  const hillsFar: { x: number; h: number }[] = [];
  const hillsMid: { x: number; h: number }[] = [];
  for (let i = 0; i < 14; i++) {
    hillsFar.push({ x: i * 280 + Math.random() * 80, h: 60 + Math.random() * 50 });
  }
  for (let i = 0; i < 18; i++) {
    hillsMid.push({ x: i * 220 + Math.random() * 60, h: 40 + Math.random() * 45 });
  }

  // ── Background: trees with blossoms ──
  const trees: { x: number; h: number; canopyR: number; blossomHue: number }[] = [];
  for (let i = 0; i < 24; i++) {
    trees.push({
      x: 100 + Math.random() * (WORLD_W - 200),
      h: 50 + Math.random() * 40,
      canopyR: 18 + Math.random() * 14,
      blossomHue: Math.random() > 0.5 ? 290 : 330, // purple or pink blossoms
    });
  }
  trees.sort((a, b) => a.x - b.x);

  // ── Foreground: small flowers on ground ──
  const flowers: { x: number; color: string; size: number; phase: number }[] = [];
  for (let i = 0; i < 100; i++) {
    const hue = Math.random() > 0.6 ? (270 + Math.random() * 40) : (120 + Math.random() * 30);
    flowers.push({
      x: Math.random() * WORLD_W,
      color: `hsla(${hue}, 60%, 75%, 0.85)`,
      size: 2 + Math.random() * 2.5,
      phase: Math.random() * Math.PI * 2,
    });
  }

  // ── Drifting petals (foreground particles) ──
  let petals: {
    x: number; y: number; r: number; vy: number; vx: number;
    rot: number; rotSpeed: number; opacity: number; hue: number;
  }[] = [];

  function initPetals() {
    petals = [];
    for (let i = 0; i < 60; i++) {
      petals.push({
        x: Math.random() * W,
        y: Math.random() * H,
        r: Math.random() * 2.5 + 1,
        vy: Math.random() * 0.5 + 0.15,
        vx: (Math.random() - 0.3) * 0.4,
        rot: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.03,
        opacity: Math.random() * 0.5 + 0.3,
        hue: Math.random() > 0.5 ? 280 : 0, // purple or white-ish
      });
    }
  }
  initPetals();

  // ── Grass blades data ──
  const grassBlades: { x: number; h: number; sway: number }[] = [];
  for (let i = 0; i < 80; i++) {
    grassBlades.push({
      x: Math.random() * WORLD_W,
      h: 10 + Math.random() * 14,
      sway: Math.random() * Math.PI * 2,
    });
  }

  // ─────────────────────────────────────────
  //  DRAW FUNCTIONS
  // ─────────────────────────────────────────

  function drawSky() {
    // Spring gradient: soft green at top → pale blue → warm cream near horizon
    const grad = ctx.createLinearGradient(0, 0, 0, groundY + 30);
    grad.addColorStop(0,    '#a8d8b9'); // soft spring green
    grad.addColorStop(0.35, '#c2e6d0'); // lighter green
    grad.addColorStop(0.6,  '#d4eef7'); // pale blue
    grad.addColorStop(0.85, '#eaf4e8'); // pale green-white
    grad.addColorStop(1,    '#f5f0e0'); // warm cream horizon
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
  }

  function drawSunGlow() {
    // Gentle morning sun glow on the right side
    const sx = W * 0.75 - camX * 0.03;
    const sy = groundY * 0.25;
    const grd = ctx.createRadialGradient(sx, sy, 0, sx, sy, W * 0.45);
    grd.addColorStop(0,    'rgba(255,250,220,0.25)');
    grd.addColorStop(0.3,  'rgba(255,245,200,0.12)');
    grd.addColorStop(0.6,  'rgba(200,230,200,0.06)');
    grd.addColorStop(1,    'rgba(0,0,0,0)');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, W, H);
  }

  function drawHillsFar() {
    ctx.save();
    ctx.translate(-camX * 0.08, 0);
    ctx.beginPath();
    ctx.moveTo(-100, groundY + 10);
    hillsFar.forEach(h => {
      ctx.lineTo(h.x, groundY - h.h);
      ctx.lineTo(h.x + 140, groundY - h.h * 0.55);
    });
    ctx.lineTo(WORLD_W + 200, groundY + 10);
    ctx.closePath();
    ctx.fillStyle = 'rgba(140,180,145,0.45)';
    ctx.fill();
    ctx.restore();
  }

  function drawHillsMid() {
    ctx.save();
    ctx.translate(-camX * 0.18, 0);
    ctx.beginPath();
    ctx.moveTo(-100, groundY + 10);
    hillsMid.forEach(h => {
      ctx.lineTo(h.x, groundY - h.h);
      ctx.lineTo(h.x + 110, groundY - h.h * 0.5);
    });
    ctx.lineTo(WORLD_W + 200, groundY + 10);
    ctx.closePath();
    ctx.fillStyle = 'rgba(110,165,120,0.55)';
    ctx.fill();
    ctx.restore();
  }

  function drawTrees() {
    ctx.save();
    ctx.translate(-camX * 0.4, 0);
    const t = Date.now() / 1000;
    trees.forEach(tr => {
      if (tr.x - camX * 0.4 < -60 || tr.x - camX * 0.4 > W + 60) return;
      const tx = tr.x;
      const ty = groundY;
      // trunk
      ctx.fillStyle = 'rgba(100,75,50,0.8)';
      ctx.fillRect(tx - 3, ty - tr.h, 6, tr.h);
      // canopy (green base)
      ctx.beginPath();
      ctx.arc(tx, ty - tr.h - tr.canopyR * 0.4, tr.canopyR, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(90,150,90,0.6)';
      ctx.fill();
      // blossom clusters (purple/pink dots on canopy)
      const cr = tr.canopyR;
      for (let b = 0; b < 8; b++) {
        const angle = (b / 8) * Math.PI * 2 + Math.sin(t * 0.5 + tr.x) * 0.1;
        const dist = cr * (0.3 + Math.random() * 0.5);
        const bx = tx + Math.cos(angle) * dist;
        const by = (ty - tr.h - cr * 0.4) + Math.sin(angle) * dist * 0.6;
        ctx.beginPath();
        ctx.arc(bx, by, 2.5 + Math.random() * 2, 0, Math.PI * 2);
        ctx.fillStyle = tr.blossomHue === 290
          ? `rgba(200,160,230,${0.5 + Math.random() * 0.3})`
          : `rgba(240,180,200,${0.5 + Math.random() * 0.3})`;
        ctx.fill();
      }
    });
    ctx.restore();
  }

  function drawGround() {
    // Soft spring green grass
    const grad = ctx.createLinearGradient(0, groundY, 0, H);
    grad.addColorStop(0,   '#7db87a');  // spring green
    grad.addColorStop(0.3, '#5a9a55');  // deeper green
    grad.addColorStop(0.7, '#3e7a3a');  // earth green
    grad.addColorStop(1,   '#2d5e2a');  // dark earth
    ctx.fillStyle = grad;
    ctx.fillRect(0, groundY, W, H - groundY);

    // Grass texture lines
    ctx.save();
    ctx.translate(-camX, 0);
    const t = Date.now() * 0.001;
    for (let gx = 0; gx < WORLD_W; gx += 12) {
      const sway = Math.sin(t * 1.2 + gx * 0.04) * 2;
      ctx.strokeStyle = 'rgba(50,100,45,0.5)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(gx, groundY);
      ctx.lineTo(gx + sway, groundY - 5 - (gx % 7));
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawFlowers() {
    ctx.save();
    ctx.translate(-camX, 0);
    const t = Date.now() / 1000;
    flowers.forEach(f => {
      if (f.x < camX - 20 || f.x > camX + W + 20) return;
      const sway = Math.sin(t * 1.5 + f.phase) * 1.5;
      const fx = f.x + sway;
      const fy = groundY - f.size * 0.5;
      // stem
      ctx.strokeStyle = 'rgba(60,120,50,0.5)';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(fx, groundY);
      ctx.lineTo(fx + sway * 0.3, fy);
      ctx.stroke();
      // petal
      ctx.beginPath();
      ctx.arc(fx + sway * 0.3, fy, f.size, 0, Math.PI * 2);
      ctx.fillStyle = f.color;
      ctx.fill();
    });
    ctx.restore();
  }

  function drawGrassBlades() {
    ctx.save();
    ctx.translate(-camX, 0);
    const t = Date.now() * 0.0009;
    grassBlades.forEach(g => {
      if (g.x < camX - 20 || g.x > camX + W + 20) return;
      const sway = Math.sin(t + g.sway) * 3;
      ctx.strokeStyle = 'rgba(70,130,60,0.65)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(g.x, groundY);
      ctx.quadraticCurveTo(g.x + sway * 0.5, groundY - g.h * 0.5, g.x + sway, groundY - g.h);
      ctx.stroke();
    });
    ctx.restore();
  }

  function drawPlatforms() {
    platforms.slice(1).forEach(p => {
      const px = p.x - camX;
      if (px > W + 50 || px + p.w < -50) return;
      // Mossy stone platform
      ctx.fillStyle = 'rgba(85,110,75,0.92)';
      ctx.fillRect(px, p.y, p.w, p.h);
      // Top edge highlight (moss)
      ctx.fillStyle = 'rgba(130,175,110,0.7)';
      ctx.fillRect(px, p.y, p.w, 2);
      // Tiny flowers on some platforms
      for (let i = 0; i < 2; i++) {
        const dx = px + p.w * (0.25 + i * 0.5);
        ctx.beginPath();
        ctx.arc(dx, p.y - 1.5, 1.8, 0, Math.PI * 2);
        ctx.fillStyle = i % 2 === 0
          ? 'rgba(200,170,230,0.8)'  // purple
          : 'rgba(255,255,255,0.7)'; // white
        ctx.fill();
      }
    });
  }

  function drawFragments() {
    const t = Date.now() / 1000;
    fragments.forEach((f, i) => {
      if (f.collected) return;
      const fx = f.x - camX;
      if (fx < -100 || fx > W + 100) return;
      const bob = Math.sin(t * 1.4 + f.bob * 2) * 6;
      const fy = f.y + bob;

      // Glow aura (spring green + purple)
      const glw = ctx.createRadialGradient(fx, fy, 0, fx, fy, 60);
      glw.addColorStop(0, 'rgba(180,220,160,0.30)');
      glw.addColorStop(0.5, 'rgba(190,170,230,0.15)');
      glw.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = glw;
      ctx.fillRect(fx - 60, fy - 60, 120, 120);

      // Diamond shape
      ctx.save();
      ctx.translate(fx, fy);
      const pulse = 1 + Math.sin(t * 2 + i) * 0.06;
      ctx.scale(pulse, pulse);
      ctx.beginPath();
      ctx.moveTo(0, -16); ctx.lineTo(11, 0); ctx.lineTo(0, 16); ctx.lineTo(-11, 0);
      ctx.closePath();
      ctx.strokeStyle = 'rgba(170,200,150,0.75)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = 'rgba(180,210,170,0.18)';
      ctx.fill();

      // Inner highlight
      ctx.beginPath();
      ctx.arc(-3, -4, 2, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(240,255,230,0.95)';
      ctx.fill();
      ctx.restore();

      // Word label (proximity-based fade)
      const dist = Math.hypot(f.x - player.x, f.y - (player.y + player.h / 2));
      if (dist < 120) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, (120 - dist) / 120);
        ctx.font = tunables.labelFontSize + 'px "Noto Serif KR", serif';
        ctx.fillStyle = 'rgba(60,90,50,0.95)';
        ctx.textAlign = 'center';
        ctx.fillText(f.word, fx, fy + tunables.labelOffsetY);
        ctx.restore();
      }
    });
  }

  function drawPetals() {
    const t = Date.now() / 1000;
    petals.forEach(p => {
      p.y += p.vy;
      p.x += p.vx + Math.sin(t * 0.8 + p.rot) * 0.15;
      p.rot += p.rotSpeed;
      if (p.y > H + 10) { p.y = -10; p.x = Math.random() * W; }
      if (p.x < -10) p.x = W + 10;
      if (p.x > W + 10) p.x = -10;

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.beginPath();
      // Petal shape (elongated ellipse)
      ctx.ellipse(0, 0, p.r, p.r * 0.5, 0, 0, Math.PI * 2);
      if (p.hue === 280) {
        ctx.fillStyle = `rgba(200,170,230,${p.opacity})`;
      } else {
        ctx.fillStyle = `rgba(255,255,250,${p.opacity})`;
      }
      ctx.fill();
      ctx.restore();
    });
  }

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
      player.walkTimer += 0.13;
      legSwing = Math.sin(player.walkTimer) * 12;
      armSwing = Math.cos(player.walkTimer) * 8;
    }
    const flip = player.dir < 0 ? -1 : 1;
    ctx.scale(flip, 1);

    // Shadow
    ctx.save();
    ctx.scale(1, 0.3);
    ctx.beginPath();
    ctx.ellipse(0, player.h + 10, 14, 6, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.fill();
    ctx.restore();

    // Legs
    ctx.strokeStyle = '#3a5a30';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-4, player.h * 0.62);
    ctx.lineTo(-6 - legSwing * 0.3, player.h);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(4, player.h * 0.62);
    ctx.lineTo(6 + legSwing * 0.3, player.h);
    ctx.stroke();

    // Body
    ctx.beginPath();
    ctx.roundRect(-10, player.h * 0.3, 20, player.h * 0.4, 4);
    ctx.fillStyle = '#4a7a40';
    ctx.fill();
    ctx.strokeStyle = 'rgba(150,200,130,0.4)';
    ctx.lineWidth = 0.5;
    ctx.stroke();

    // Arms
    ctx.strokeStyle = '#4a7a40';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-9, player.h * 0.35);
    ctx.lineTo(-16 - armSwing * 0.4, player.h * 0.55);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(9, player.h * 0.35);
    ctx.lineTo(16 + armSwing * 0.4, player.h * 0.5);
    ctx.stroke();

    // Head
    const breathY = Math.sin(player.breathPhase * 1.5) * 0.5;
    const headY = player.h * 0.15 + breathY;
    ctx.beginPath();
    ctx.arc(0, headY, 9, 0, Math.PI * 2);
    ctx.fillStyle = '#e0c8a0';
    ctx.fill();
    // Hair
    ctx.beginPath();
    ctx.arc(0, headY - 2, 9, Math.PI, 0);
    ctx.fillStyle = '#2a1a08';
    ctx.fill();

    // Idle animation: gentle breath particles (spring feeling)
    if (!moving) {
      const ba = (Math.sin(t * 1.8) * 0.5 + 0.5) * 0.35;
      ctx.beginPath();
      ctx.arc(12, headY + 2, 4, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(200,230,200,${ba})`;
      ctx.fill();
    }

    ctx.restore();
  }

  // ─────────────────────────────────────────
  //  PHYSICS & INPUT
  // ─────────────────────────────────────────
  function updatePlayer() {
    if (!gameStarted || gameOver) return;

    const left  = keys['ArrowLeft']  || keys['a'] || keys['A'];
    const right = keys['ArrowRight'] || keys['d'] || keys['D'];
    const jump  = keys['ArrowUp']    || keys['w'] || keys['W'] || keys[' '];

    if (left)  { player.vx = -tunables.moveSpeed; player.dir = -1; }
    if (right) { player.vx =  tunables.moveSpeed; player.dir =  1; }
    if (!left && !right) player.vx *= 0.7;

    if (jump && player.onGround) {
      player.vy = tunables.jumpForce;
      player.onGround = false;
    }

    player.vy += tunables.gravity;
    player.x  += player.vx;
    player.y  += player.vy;

    // World bounds
    if (player.x < 60) player.x = 60;
    if (player.x > WORLD_W - 60) player.x = WORLD_W - 60;

    // Platform collision
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

    // Fragment collection
    fragments.forEach((f, i) => {
      if (f.collected) return;
      const dist = Math.hypot(player.x - f.x, player.y + player.h / 2 - f.y);
      if (dist < 42) {
        f.collected = true;
        collectedCount++;
        collectFragment(i, f.word);
      }
    });

    // Camera follow
    const targetCam = player.x - W / 3;
    camX += (targetCam - camX) * 0.07;
    camX = Math.max(0, Math.min(camX, WORLD_W - W));
  }

  // ─────────────────────────────────────────
  //  FRAGMENT COLLECTION
  // ─────────────────────────────────────────
  function collectFragment(i: number, word: string) {
    // Update HUD dots
    const dotEl = document.getElementById('s1d' + i);
    if (dotEl) dotEl.classList.add('collected');

    // Update poem lines
    const lineEl = document.getElementById('s1l' + i);
    if (lineEl) lineEl.classList.add('found');

    // Canvas popup data
    popupWord = word;
    popupX = fragments[i].x;
    popupY = fragments[i].y - 10;
    popupTimer = tunables.popupFadeMs;

    // Stage clear check
    if (collectedCount >= TOTAL_FRAGMENTS) {
      setTimeout(showStageClear, 1600);
    }
  }

  function showStageClear() {
    gameOver = true;
    const clearEl = document.getElementById('s1stage_clear');
    if (clearEl) clearEl.classList.add('show');
    setTimeout(() => {
      if ((window as any).onStageClear) {
        (window as any).onStageClear(1);
      }
    }, 3000);
  }

  // ─────────────────────────────────────────
  //  GAME LOOP
  // ─────────────────────────────────────────
  let _running = false;

  function gameStartS1() {
    if (_running) return;
    _running = true;
    gameStarted = true;
    gameOver = false;
    collectedCount = 0;

    // Reset player position
    player.x = tunables.playerStartX;
    player.y = groundY - player.h;
    player.vy = 0;
    player.vx = 0;
    player.onGround = true;
    player.walkTimer = 0;

    // Reset fragments
    initFragments();

    // Reset HUD
    for (let i = 0; i < TOTAL_FRAGMENTS; i++) {
      const d = document.getElementById('s1d' + i);
      if (d) d.classList.remove('collected');
      const l = document.getElementById('s1l' + i);
      if (l) l.classList.remove('found');
    }
    popupTimer = 0;

    // Reset petals
    initPetals();

    camX = 0;

    // Hide clear screen
    const clearEl = document.getElementById('s1stage_clear');
    if (clearEl) clearEl.classList.remove('show');

    // Start game loop
    requestAnimationFrame(gameLoop);
  }

  function gameLoop() {
    if (!_running) return;

    // Clear
    ctx.clearRect(0, 0, W, H);

    // Update
    updatePlayer();

    // Draw — layered back to front
    drawSky();
    drawSunGlow();
    drawHillsFar();
    drawHillsMid();
    drawTrees();
    drawGround();
    drawGrassBlades();
    drawFlowers();
    drawPlatforms();
    drawFragments();
    drawPlayer();
    drawPetals();

    // ── Popup (canvas-based) ──
    if (popupTimer > 0) {
      const elapsed = tunables.popupFadeMs - popupTimer;
      const progress = elapsed / tunables.popupFadeMs;
      let alpha = 1;
      if (progress > 0.7) alpha = 1 - (progress - 0.7) / 0.3;
      const rise = progress * 30;
      ctx.save();
      ctx.globalAlpha = Math.max(0, alpha);
      ctx.font = tunables.popupFontSize + 'px "Noto Serif KR", serif';
      ctx.fillStyle = 'rgba(200,240,170,0.95)';
      ctx.textAlign = 'center';
      ctx.fillText(popupWord, popupX - camX, popupY - rise);
      ctx.restore();
      popupTimer -= 16.67;
    }

    // Stage clear check (stop loop)
    if (collectedCount >= TOTAL_FRAGMENTS && gameOver) {
      _running = false;
      return;
    }

    requestAnimationFrame(gameLoop);
  }

  // ─────────────────────────────────────────
  //  ADMIN API (관리자 패널이 읽음)
  // ─────────────────────────────────────────
  (window as any).s1API = {
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
    restart() {
      _running = false;
      setTimeout(() => gameStartS1(), 50);
    },
  };

  // ─────────────────────────────────────────
  //  GLOBAL REGISTRATIONS
  // ─────────────────────────────────────────
  (window as any).gameStartS1 = gameStartS1;
  (window as any).initStage1  = initStage1;

} // end initStage1
