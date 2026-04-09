// @ts-nocheck
//
// ═══════════════════════════════════════════════════════════
//  STAGE 2 — 천둥과 먹구름 (Thunder and Dark Clouds)
//  감정: 고통 / 성장   |   색: dark gray + lightning flashes
//  시구: 한 송이 국화꽃을 피우기 위해 / 천둥은 먹구름 속에서
//        / 또 그렇게 울었나 보다.
// ═══════════════════════════════════════════════════════════

let _stage2Initialized = false;
export function initStage2() {
  if (_stage2Initialized) return;
  _stage2Initialized = true;

  // ─────────────────────────────────────────
  //  CURSOR
  // ─────────────────────────────────────────
  const cursorEl = document.getElementById('s2cursor');
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
  const canvas = document.getElementById('s2game_canvas') as HTMLCanvasElement;
  const ctx = canvas.getContext('2d')!;

  let W: number, H: number;
  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', () => { resize(); buildWorld(); });

  // ─────────────────────────────────────────
  //  @TUNABLES  (stage 2)
  //  관리자 패널 슬라이더로 조정 → 마음에 드는 값을 여기에 하드코딩
  // ─────────────────────────────────────────
  const tunables = {
    playerStartX: 100,         // @TUNABLE 캐릭터 시작 X
    playerStartY: -46,         // @TUNABLE 캐릭터 시작 Y (groundY 기준 오프셋)
    jumpForce: -19,            // @TUNABLE 점프 힘 (음수가 강함) — slightly stronger for higher platforms
    moveSpeed: 2.8,            // @TUNABLE 이동 속도
    gravity: 0.95,             // @TUNABLE 중력
    fragments: [
      { x: 600,  yOffset: -60  },  // @TUNABLE 다이아 0
      { x: 1500, yOffset: -260 },  // @TUNABLE 다이아 1
      { x: 2600, yOffset: -180 },  // @TUNABLE 다이아 2
    ],
    labelOffsetY: -24,         // @TUNABLE 다이아 위 시구 라벨 Y 오프셋
    labelFontSize: 13,         // @TUNABLE 다이아 위 라벨 폰트 크기
    popupFontSize: 19,         // @TUNABLE 수집 시 팝업 폰트 크기
    popupFadeMs: 1100,         // @TUNABLE 수집 팝업 표시 시간 (ms)
  };

  // ── State ──
  const WORLD_W = 3200;
  let camX = 0;
  let gameStarted = false;
  let gameOver = false;
  let collectedCount = 0;
  const TOTAL_FRAGMENTS = tunables.fragments.length;

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
      // Ground
      { x: -200, y: groundY, w: WORLD_W + 400, h: H },

      // --- More challenging platform layout for Stage 2 ---
      // Low stepping stones near start
      { x: 300,  y: groundY - 60,  w: 130, h: 18 },
      { x: 500,  y: groundY - 100, w: 110, h: 18 },

      // Mid-height platforms with gaps
      { x: 740,  y: groundY - 150, w: 100, h: 18 },
      { x: 920,  y: groundY - 110, w: 120, h: 18 },

      // Higher tier — requires precise jumping
      { x: 1100, y: groundY - 200, w: 90,  h: 18 },
      { x: 1300, y: groundY - 260, w: 110, h: 18 },
      { x: 1520, y: groundY - 240, w: 100, h: 18 },

      // Descent and crossing
      { x: 1720, y: groundY - 160, w: 130, h: 18 },
      { x: 1930, y: groundY - 100, w: 100, h: 18 },

      // Final ascent
      { x: 2100, y: groundY - 140, w: 110, h: 18 },
      { x: 2300, y: groundY - 200, w: 100, h: 18 },
      { x: 2500, y: groundY - 170, w: 120, h: 18 },
      { x: 2720, y: groundY - 120, w: 130, h: 18 },
    ];
    player.y = groundY - player.h;
  }
  buildWorld();

  // ── Word fragments (시어 파편) ──
  const WORDS: string[] = [
    '한 송이 국화꽃을 피우기 위해',
    '천둥은 먹구름 속에서',
    '또 그렇게 울었나 보다.',
  ];

  let fragments: {
    x: number; y: number; word: string;
    collected: boolean; bob: number;
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

  // ── Popup state ──
  let popupText = '';
  let popupTimer = 0;

  // ── Rain particle system ──
  const MAX_RAIN = 320;
  let raindrops: { x: number; y: number; speed: number; len: number; opacity: number }[] = [];

  function initRain() {
    raindrops = [];
    for (let i = 0; i < MAX_RAIN; i++) {
      raindrops.push(spawnRaindrop(true));
    }
  }

  function spawnRaindrop(randomY: boolean): { x: number; y: number; speed: number; len: number; opacity: number } {
    return {
      x: Math.random() * (WORLD_W + 400) - 200,
      y: randomY ? Math.random() * H : -Math.random() * 60,
      speed: 8 + Math.random() * 10,
      len: 12 + Math.random() * 18,
      opacity: 0.15 + Math.random() * 0.35,
    };
  }

  // ── Lightning system ──
  let lightningAlpha = 0;
  let lightningCooldown = 300 + Math.random() * 300; // frames (~5-10s at 60fps)
  let lightningDuration = 0;

  // ── Cloud system ──
  const NUM_CLOUDS = 8;
  let clouds: { x: number; y: number; w: number; h: number; speed: number; darkness: number }[] = [];

  function initClouds() {
    clouds = [];
    for (let i = 0; i < NUM_CLOUDS; i++) {
      clouds.push({
        x: Math.random() * (WORLD_W + 600) - 300,
        y: 20 + Math.random() * (H * 0.28),
        w: 200 + Math.random() * 350,
        h: 50 + Math.random() * 70,
        speed: 0.15 + Math.random() * 0.35,
        darkness: 0.25 + Math.random() * 0.3,
      });
    }
  }
  initClouds();

  // ── _running flag for game loop ──
  let _running = false;

  // ── gameStartS2: full reset ──
  function gameStartS2() {
    if (_running) return;
    _running = true;
    gameStarted = true;
    gameOver = false;
    collectedCount = 0;
    popupText = '';
    popupTimer = 0;

    // Player reset
    player.x = tunables.playerStartX;
    player.y = groundY - player.h;
    player.vy = 0;
    player.vx = 0;
    player.onGround = true;
    player.dir = 1;
    player.walkFrame = 0;
    player.walkTimer = 0;
    player.breathPhase = 0;

    // Fragments reset
    initFragments();

    // Weather reset
    initRain();
    initClouds();
    lightningAlpha = 0;
    lightningCooldown = 300 + Math.random() * 300;
    lightningDuration = 0;

    // HUD reset
    for (let i = 0; i < 3; i++) {
      const dot = document.getElementById('s2d' + i);
      if (dot) dot.classList.remove('collected');
      const line = document.getElementById('s2l' + i);
      if (line) line.classList.remove('found');
    }
    const clearEl = document.getElementById('s2stage_clear');
    if (clearEl) clearEl.style.display = 'none';
    const flashEl = document.getElementById('s2word_flash');
    if (flashEl) { flashEl.textContent = ''; flashEl.style.opacity = '0'; }

    camX = 0;

    // Start loop
    requestAnimationFrame(gameLoop);
  }

  // ═══════════════════════════════════════════════════════════
  //  GAME LOOP
  // ═══════════════════════════════════════════════════════════
  let _tick = 0;

  function gameLoop() {
    if (!_running) return;
    _tick++;

    // ── Input ──
    const left  = keys['ArrowLeft']  || keys['a'] || keys['A'];
    const right = keys['ArrowRight'] || keys['d'] || keys['D'];
    const jump  = keys['ArrowUp']    || keys['w'] || keys['W'] || keys[' '];

    if (left)  { player.vx = -tunables.moveSpeed; player.dir = -1; }
    else if (right) { player.vx = tunables.moveSpeed; player.dir = 1; }
    else { player.vx *= 0.7; }

    if (jump && player.onGround) {
      player.vy = tunables.jumpForce;
      player.onGround = false;
    }

    // ── Physics ──
    player.vy += tunables.gravity;
    player.x  += player.vx;
    player.y  += player.vy;

    // Clamp to world bounds
    if (player.x < 0) player.x = 0;
    if (player.x > WORLD_W - player.w) player.x = WORLD_W - player.w;

    // ── Platform collision ──
    player.onGround = false;
    for (const p of platforms) {
      if (
        player.x + player.w > p.x &&
        player.x < p.x + p.w &&
        player.y + player.h > p.y &&
        player.y + player.h < p.y + p.h + player.vy + 4 &&
        player.vy >= 0
      ) {
        player.y = p.y - player.h;
        player.vy = 0;
        player.onGround = true;
        break;
      }
    }

    // Fall off bottom
    if (player.y > H + 100) {
      player.x = tunables.playerStartX;
      player.y = groundY - player.h;
      player.vy = 0;
      player.vx = 0;
    }

    // ── Walk animation ──
    if (Math.abs(player.vx) > 0.5 && player.onGround) {
      player.walkTimer++;
      if (player.walkTimer > 8) { player.walkTimer = 0; player.walkFrame = (player.walkFrame + 1) % 4; }
    } else {
      player.walkFrame = 0;
      player.walkTimer = 0;
    }
    player.breathPhase += 0.035;

    // ── Camera ──
    const targetCamX = player.x - W * 0.35;
    camX += (targetCamX - camX) * 0.08;
    if (camX < 0) camX = 0;
    if (camX > WORLD_W - W) camX = Math.max(0, WORLD_W - W);

    // ── Fragment collection ──
    for (let i = 0; i < fragments.length; i++) {
      const f = fragments[i];
      if (f.collected) continue;
      const dx = (player.x + player.w / 2) - f.x;
      const dy = (player.y + player.h / 2) - f.y;
      if (Math.abs(dx) < 36 && Math.abs(dy) < 36) {
        f.collected = true;
        collectedCount++;

        // HUD update
        const dot = document.getElementById('s2d' + i);
        if (dot) dot.classList.add('collected');
        const line = document.getElementById('s2l' + i);
        if (line) line.classList.add('found');

        // Popup
        popupText = f.word;
        popupTimer = tunables.popupFadeMs;

        // Flash word in HUD
        const flashEl = document.getElementById('s2word_flash');
        if (flashEl) {
          flashEl.textContent = f.word;
          flashEl.style.opacity = '1';
          setTimeout(() => { flashEl.style.opacity = '0'; }, tunables.popupFadeMs);
        }
      }
    }

    // ── Popup timer ──
    if (popupTimer > 0) popupTimer -= 16;

    // ── Rain update ──
    const windAngle = 0.25; // diagonal rain slant
    for (let i = 0; i < raindrops.length; i++) {
      const r = raindrops[i];
      r.y += r.speed;
      r.x += r.speed * windAngle;
      if (r.y > H + 20 || r.x > WORLD_W + 300) {
        raindrops[i] = spawnRaindrop(false);
      }
    }

    // ── Lightning update ──
    lightningCooldown--;
    if (lightningCooldown <= 0) {
      // Trigger flash
      lightningDuration = 4 + Math.floor(Math.random() * 4); // 4-8 frames
      lightningAlpha = 0.6 + Math.random() * 0.3;
      lightningCooldown = 300 + Math.floor(Math.random() * 300); // 5-10 seconds
    }
    if (lightningDuration > 0) {
      lightningDuration--;
      if (lightningDuration <= 0) lightningAlpha = 0;
    } else {
      lightningAlpha *= 0.85; // fade residual
    }

    // ── Cloud drift ──
    for (const c of clouds) {
      c.x += c.speed;
      if (c.x > WORLD_W + 400) c.x = -c.w - 100;
    }

    // ═══════════════════════════════════════════
    //  RENDER
    // ═══════════════════════════════════════════
    ctx.save();

    // ── Background: Very dark stormy sky gradient ──
    const skyGrad = ctx.createLinearGradient(0, 0, 0, H);
    skyGrad.addColorStop(0,   '#0d0d1a'); // near-black purple
    skyGrad.addColorStop(0.3, '#1a1a2e'); // deep dark blue-purple
    skyGrad.addColorStop(0.6, '#25233a'); // muted storm purple
    skyGrad.addColorStop(1,   '#1e1e2a'); // dark base
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, W, H);

    // ── Lightning flash overlay (behind everything else, but over sky) ──
    if (lightningAlpha > 0.01) {
      ctx.fillStyle = `rgba(220, 220, 255, ${lightningAlpha * 0.5})`;
      ctx.fillRect(0, 0, W, H);
    }

    // ── Distant storm mountains / horizon (parallax layer) ──
    const px1 = -camX * 0.1;
    ctx.fillStyle = 'rgba(18, 18, 30, 0.9)';
    ctx.beginPath();
    ctx.moveTo(0, groundY + 10);
    for (let x = 0; x <= W + 80; x += 80) {
      const worldX = x - px1;
      const peakH = 60 + Math.sin(worldX * 0.003) * 40 + Math.cos(worldX * 0.007) * 25;
      ctx.lineTo(x, groundY - peakH);
    }
    ctx.lineTo(W, groundY + 10);
    ctx.closePath();
    ctx.fill();

    // Nearer ridge
    const px2 = -camX * 0.2;
    ctx.fillStyle = 'rgba(22, 20, 35, 0.85)';
    ctx.beginPath();
    ctx.moveTo(0, groundY + 5);
    for (let x = 0; x <= W + 60; x += 60) {
      const worldX = x - px2;
      const peakH = 35 + Math.sin(worldX * 0.005 + 1) * 25 + Math.cos(worldX * 0.012) * 15;
      ctx.lineTo(x, groundY - peakH);
    }
    ctx.lineTo(W, groundY + 5);
    ctx.closePath();
    ctx.fill();

    // ── Dark rolling clouds ──
    ctx.save();
    for (const c of clouds) {
      const sx = c.x - camX * 0.3;
      if (sx + c.w < -50 || sx > W + 50) continue;
      const grad = ctx.createRadialGradient(
        sx + c.w * 0.5, c.y + c.h * 0.4, c.w * 0.1,
        sx + c.w * 0.5, c.y + c.h * 0.5, c.w * 0.55
      );
      grad.addColorStop(0, `rgba(50, 45, 65, ${c.darkness + 0.15})`);
      grad.addColorStop(0.5, `rgba(35, 30, 50, ${c.darkness})`);
      grad.addColorStop(1, 'rgba(20, 18, 30, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      // Lumpy cloud shape using overlapping ellipses
      const cx = sx + c.w * 0.5;
      const cy = c.y + c.h * 0.5;
      ctx.ellipse(cx, cy, c.w * 0.5, c.h * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
      // Extra lumps
      ctx.beginPath();
      ctx.ellipse(cx - c.w * 0.25, cy - c.h * 0.1, c.w * 0.3, c.h * 0.4, 0, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(40, 35, 55, ${c.darkness * 0.8})`;
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(cx + c.w * 0.2, cy + c.h * 0.05, c.w * 0.28, c.h * 0.35, 0, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(45, 40, 60, ${c.darkness * 0.7})`;
      ctx.fill();

      // Cloud lit up by lightning
      if (lightningAlpha > 0.05) {
        ctx.beginPath();
        ctx.ellipse(cx, cy, c.w * 0.5, c.h * 0.5, 0, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(180, 180, 220, ${lightningAlpha * 0.15})`;
        ctx.fill();
      }
    }
    ctx.restore();

    // ── World-space transform for game objects ──
    ctx.save();
    ctx.translate(-camX, 0);

    // ── Rain (in world space) ──
    ctx.strokeStyle = 'rgba(170, 175, 210, 0.35)';
    ctx.lineWidth = 1;
    for (const r of raindrops) {
      const sx = r.x;
      const sy = r.y;
      if (sx - camX < -30 || sx - camX > W + 30) continue;
      ctx.globalAlpha = r.opacity;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx + r.len * windAngle, sy + r.len);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // ── Platforms ──
    for (let pi = 1; pi < platforms.length; pi++) {
      const p = platforms[pi];
      const sx = p.x;
      if (sx - camX > W + 50 || sx + p.w - camX < -50) continue;

      // Dark stone-like platform
      const platGrad = ctx.createLinearGradient(sx, p.y, sx, p.y + p.h);
      platGrad.addColorStop(0, 'rgba(55, 50, 70, 0.95)');
      platGrad.addColorStop(0.3, 'rgba(40, 38, 55, 0.9)');
      platGrad.addColorStop(1, 'rgba(30, 28, 42, 0.85)');
      ctx.fillStyle = platGrad;

      // Slightly rounded rectangle
      const radius = 4;
      ctx.beginPath();
      ctx.moveTo(sx + radius, p.y);
      ctx.lineTo(sx + p.w - radius, p.y);
      ctx.quadraticCurveTo(sx + p.w, p.y, sx + p.w, p.y + radius);
      ctx.lineTo(sx + p.w, p.y + p.h);
      ctx.lineTo(sx, p.y + p.h);
      ctx.lineTo(sx, p.y + radius);
      ctx.quadraticCurveTo(sx, p.y, sx + radius, p.y);
      ctx.closePath();
      ctx.fill();

      // Top edge highlight
      ctx.strokeStyle = 'rgba(100, 95, 130, 0.4)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(sx + 2, p.y + 1);
      ctx.lineTo(sx + p.w - 2, p.y + 1);
      ctx.stroke();

      // Lightning illumination on platforms
      if (lightningAlpha > 0.05) {
        ctx.fillStyle = `rgba(180, 180, 220, ${lightningAlpha * 0.12})`;
        ctx.fillRect(sx, p.y, p.w, p.h);
      }
    }

    // ── Ground ──
    const g = platforms[0];
    const gGrad = ctx.createLinearGradient(0, g.y, 0, g.y + 60);
    gGrad.addColorStop(0, 'rgba(35, 32, 48, 1)');
    gGrad.addColorStop(0.15, 'rgba(28, 26, 40, 1)');
    gGrad.addColorStop(1, 'rgba(18, 16, 28, 1)');
    ctx.fillStyle = gGrad;
    ctx.fillRect(g.x, g.y, g.w, g.h);
    // Ground top highlight
    ctx.strokeStyle = 'rgba(80, 75, 100, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(Math.max(g.x, camX - 10), g.y);
    ctx.lineTo(Math.min(g.x + g.w, camX + W + 10), g.y);
    ctx.stroke();
    // Lightning ground brightening
    if (lightningAlpha > 0.05) {
      ctx.fillStyle = `rgba(160, 160, 200, ${lightningAlpha * 0.06})`;
      ctx.fillRect(g.x, g.y, g.w, 30);
    }

    // ── Rain splashes on ground ──
    ctx.fillStyle = 'rgba(150, 155, 190, 0.15)';
    for (let i = 0; i < 20; i++) {
      const splashX = camX + ((i * 173 + _tick * 3) % W);
      const splashPhase = ((_tick + i * 37) % 30) / 30;
      if (splashPhase < 0.5) {
        const r = splashPhase * 6;
        ctx.globalAlpha = 0.15 * (1 - splashPhase * 2);
        ctx.beginPath();
        ctx.ellipse(splashX, groundY, r, r * 0.3, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;

    // ── Fragments (diamond shape, glowing) ──
    const time = _tick * 0.05;
    for (let i = 0; i < fragments.length; i++) {
      const f = fragments[i];
      if (f.collected) continue;

      const fx = f.x;
      const bobY = f.y + Math.sin(time + f.bob * 2.1) * 5;
      const sx = fx;

      if (sx - camX < -80 || sx - camX > W + 80) continue;

      // Bright glow against dark background
      const glowRadius = 28 + Math.sin(time * 1.5 + i) * 5;
      const glowGrad = ctx.createRadialGradient(sx, bobY, 0, sx, bobY, glowRadius);
      glowGrad.addColorStop(0, 'rgba(200, 190, 255, 0.35)');
      glowGrad.addColorStop(0.5, 'rgba(150, 140, 220, 0.12)');
      glowGrad.addColorStop(1, 'rgba(120, 110, 200, 0)');
      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(sx, bobY, glowRadius, 0, Math.PI * 2);
      ctx.fill();

      // Diamond shape
      const ds = 11;
      ctx.fillStyle = `rgba(210, 200, 255, ${0.85 + Math.sin(time * 2 + i) * 0.1})`;
      ctx.strokeStyle = 'rgba(240, 235, 255, 0.9)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(sx, bobY - ds);
      ctx.lineTo(sx + ds, bobY);
      ctx.lineTo(sx, bobY + ds);
      ctx.lineTo(sx - ds, bobY);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Inner sparkle
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.beginPath();
      ctx.moveTo(sx, bobY - ds * 0.4);
      ctx.lineTo(sx + ds * 0.35, bobY);
      ctx.lineTo(sx, bobY + ds * 0.4);
      ctx.lineTo(sx - ds * 0.35, bobY);
      ctx.closePath();
      ctx.fill();

      // Lightning makes fragments super-bright
      if (lightningAlpha > 0.05) {
        ctx.fillStyle = `rgba(255, 255, 255, ${lightningAlpha * 0.3})`;
        ctx.beginPath();
        ctx.arc(sx, bobY, ds + 4, 0, Math.PI * 2);
        ctx.fill();
      }

      // Label above fragment
      ctx.font = `${tunables.labelFontSize}px 'Noto Serif KR', serif`;
      ctx.textAlign = 'center';
      ctx.fillStyle = `rgba(190, 185, 220, ${0.55 + Math.sin(time + i * 1.5) * 0.15})`;
      ctx.fillText(f.word, sx, bobY + tunables.labelOffsetY);
    }

    // ── Player ──
    const px = player.x;
    const py = player.y;
    const bOff = Math.sin(player.breathPhase) * 1.2;

    ctx.save();
    ctx.translate(px + player.w / 2, py + player.h);
    ctx.scale(player.dir, 1);

    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.beginPath();
    ctx.ellipse(0, 2, player.w * 0.6, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    // Body — darker tones for storm stage
    ctx.fillStyle = 'rgba(80, 75, 110, 0.95)';
    ctx.fillRect(-player.w / 2, -player.h + bOff, player.w, player.h * 0.6);

    // Head
    ctx.fillStyle = 'rgba(180, 170, 200, 0.9)';
    ctx.beginPath();
    ctx.arc(0, -player.h + bOff - 2, 9, 0, Math.PI * 2);
    ctx.fill();

    // Eyes — small bright dots
    ctx.fillStyle = 'rgba(220, 215, 255, 0.9)';
    ctx.fillRect(2, -player.h + bOff - 4, 2.5, 2.5);
    ctx.fillRect(-1, -player.h + bOff - 4, 2.5, 2.5);

    // Legs
    const legSwing = player.onGround ? Math.sin(player.walkFrame * 1.57) * 4 : 2;
    ctx.strokeStyle = 'rgba(65, 60, 95, 0.9)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-3, -player.h * 0.38);
    ctx.lineTo(-3 - legSwing, 0);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(3, -player.h * 0.38);
    ctx.lineTo(3 + legSwing, 0);
    ctx.stroke();

    // Arms
    const armSwing = player.onGround ? Math.sin(player.walkFrame * 1.57 + Math.PI) * 3 : -3;
    ctx.strokeStyle = 'rgba(75, 70, 105, 0.85)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-player.w / 2, -player.h * 0.55 + bOff);
    ctx.lineTo(-player.w / 2 - 5, -player.h * 0.35 + armSwing + bOff);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(player.w / 2, -player.h * 0.55 + bOff);
    ctx.lineTo(player.w / 2 + 5, -player.h * 0.35 - armSwing + bOff);
    ctx.stroke();

    // Lightning illumination on player
    if (lightningAlpha > 0.1) {
      ctx.fillStyle = `rgba(200, 200, 240, ${lightningAlpha * 0.15})`;
      ctx.fillRect(-player.w / 2 - 2, -player.h + bOff - 12, player.w + 4, player.h + 14);
    }

    ctx.restore();

    ctx.restore(); // end world-space

    // ── Foreground rain layer (screen-space, in front of everything) ──
    ctx.strokeStyle = 'rgba(160, 165, 200, 0.2)';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 40; i++) {
      const rx = (i * 97 + _tick * 5.5) % (W + 60) - 30;
      const ry = (i * 131 + _tick * 13) % (H + 40) - 20;
      ctx.globalAlpha = 0.12 + (i % 5) * 0.03;
      ctx.beginPath();
      ctx.moveTo(rx, ry);
      ctx.lineTo(rx + 4, ry + 20);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // ── Lightning bolt visual (occasional forked bolt during flash) ──
    if (lightningDuration > 2 && lightningAlpha > 0.3) {
      drawLightningBolt(ctx, W, H);
    }

    // ── Lightning overlay on top (second pass for intensity) ──
    if (lightningAlpha > 0.01) {
      ctx.fillStyle = `rgba(200, 200, 240, ${lightningAlpha * 0.15})`;
      ctx.fillRect(0, 0, W, H);
    }

    // ── Vignette (darkened edges for dramatic feel) ──
    const vigGrad = ctx.createRadialGradient(W / 2, H / 2, W * 0.25, W / 2, H / 2, W * 0.75);
    vigGrad.addColorStop(0, 'rgba(0,0,0,0)');
    vigGrad.addColorStop(1, 'rgba(0,0,0,0.4)');
    ctx.fillStyle = vigGrad;
    ctx.fillRect(0, 0, W, H);

    // ── Popup text (screen-space) ──
    if (popupTimer > 0 && popupText) {
      const alpha = Math.min(1, popupTimer / 300);
      ctx.font = `${tunables.popupFontSize}px 'Noto Serif KR', serif`;
      ctx.textAlign = 'center';
      ctx.fillStyle = `rgba(220, 215, 255, ${alpha})`;
      ctx.shadowColor = 'rgba(150, 140, 220, 0.6)';
      ctx.shadowBlur = 12;
      ctx.fillText(popupText, W / 2, H * 0.3);
      ctx.shadowBlur = 0;
    }

    ctx.restore();

    // ── Clear condition ──
    if (collectedCount >= TOTAL_FRAGMENTS) {
      _running = false;
      gameOver = true;

      const clearEl = document.getElementById('s2stage_clear');
      if (clearEl) clearEl.style.display = 'flex';

      setTimeout(() => {
        window.onStageClear?.(2);
      }, 3000);
      return;
    }

    requestAnimationFrame(gameLoop);
  }

  // ── Lightning bolt drawing helper ──
  function drawLightningBolt(c: CanvasRenderingContext2D, cw: number, ch: number) {
    const startX = cw * (0.2 + Math.random() * 0.6);
    const startY = 0;
    const endY = ch * (0.3 + Math.random() * 0.3);
    const segments = 6 + Math.floor(Math.random() * 4);

    c.save();
    c.strokeStyle = `rgba(210, 210, 255, ${0.5 + Math.random() * 0.3})`;
    c.lineWidth = 2;
    c.shadowColor = 'rgba(180, 180, 255, 0.8)';
    c.shadowBlur = 15;
    c.beginPath();
    c.moveTo(startX, startY);

    let cx = startX;
    let cy = startY;
    const stepY = (endY - startY) / segments;

    for (let s = 0; s < segments; s++) {
      cx += (Math.random() - 0.5) * 60;
      cy += stepY;
      c.lineTo(cx, cy);

      // Small branch
      if (Math.random() < 0.35) {
        const bx = cx + (Math.random() - 0.5) * 40;
        const by = cy + stepY * 0.5;
        c.moveTo(cx, cy);
        c.lineTo(bx, by);
        c.moveTo(cx, cy);
      }
    }
    c.stroke();

    // Thinner inner glow bolt
    c.strokeStyle = 'rgba(240, 240, 255, 0.7)';
    c.lineWidth = 1;
    c.shadowBlur = 8;
    c.beginPath();
    c.moveTo(startX, startY);
    cx = startX;
    cy = startY;
    for (let s = 0; s < segments; s++) {
      cx += (Math.random() - 0.5) * 50;
      cy += stepY;
      c.lineTo(cx, cy);
    }
    c.stroke();

    c.restore();
  }

  // ─────────────────────────────────────────
  //  ADMIN API (관리자 패널이 읽음)
  // ─────────────────────────────────────────
  (window as any).s2API = {
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
    restart: gameStartS2,
  };

  // ─────────────────────────────────────────
  //  GLOBAL REGISTRATION
  // ─────────────────────────────────────────
  window.gameStartS2 = gameStartS2;
  window.initStage2 = initStage2;

} // end initStage2
