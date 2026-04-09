// @ts-nocheck
//
// ═══════════════════════════════════════════════════════════
//  STAGE 3 — 거울 앞에 선 꽃 (Flower Standing Before a Mirror)
//  감정: 그리움 / 성숙  ·  색채: warm amber / orange tones
//  서정주, 「국화 옆에서」 제3연
// ═══════════════════════════════════════════════════════════

let _stage3Initialized = false;
export function initStage3() {
  if (_stage3Initialized) return;
  _stage3Initialized = true;

  // ─────────────────────────────────────────
  //  CURSOR
  // ─────────────────────────────────────────
  const cursorEl = document.getElementById('s3cursor');
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
  const canvas = document.getElementById('s3game_canvas') as HTMLCanvasElement;
  const ctx = canvas.getContext('2d')!;

  let W: number, H: number;
  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', () => { resize(); buildWorld(); });

  // ─────────────────────────────────────────
  //  @TUNABLES  (stage 3)
  //  관리자 패널 슬라이더로 조정 → 마음에 드는 값을 여기에 하드코딩
  // ─────────────────────────────────────────
  const tunables = {
    playerStartX: 100,         // @TUNABLE 캐릭터 시작 X
    playerStartY: -46,         // @TUNABLE 캐릭터 시작 Y (groundY 기준 오프셋)
    jumpForce: -17,            // @TUNABLE 점프 힘 (음수가 강함)
    moveSpeed: 2.6,            // @TUNABLE 이동 속도
    gravity: 0.95,             // @TUNABLE 중력
    fragments: [
      { x: 520,  yOffset: -60  },  // @TUNABLE 다이아 0 — 그립고 아쉬움에 가슴 조이던
      { x: 1200, yOffset: -200 },  // @TUNABLE 다이아 1 — 머언 먼 젊음의 뒤안길에서
      { x: 2000, yOffset: -140 },  // @TUNABLE 다이아 2 — 인제는 돌아와 거울 앞에 선
      { x: 2700, yOffset: -260 },  // @TUNABLE 다이아 3 — 내 누님같이 생긴 꽃이여.
    ],
    labelOffsetY: -24,         // @TUNABLE 다이아 위 시구 라벨 Y 오프셋
    labelFontSize: 13,         // @TUNABLE 다이아 위 라벨 폰트 크기
    popupFontSize: 19,         // @TUNABLE 수집 시 팝업 폰트 크기
    popupFadeMs: 1200,         // @TUNABLE 수집 팝업 표시 시간 (ms)
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
      // 지면
      { x: -200, y: groundY, w: WORLD_W + 400, h: H },
      // 중간 높이 플랫폼들 — 단풍나무 사이사이
      { x: 350,  y: groundY - 80,  w: 160, h: 18 },
      { x: 700,  y: groundY - 130, w: 140, h: 18 },
      { x: 950,  y: groundY - 70,  w: 180, h: 18 },
      // 높은 플랫폼 — 젊음의 뒤안길 영역
      { x: 1100, y: groundY - 190, w: 150, h: 18 },
      { x: 1350, y: groundY - 110, w: 130, h: 18 },
      // 거울 영역 접근용
      { x: 1600, y: groundY - 60,  w: 200, h: 18 },
      { x: 1850, y: groundY - 130, w: 160, h: 18 },
      { x: 2050, y: groundY - 80,  w: 140, h: 18 },
      // 높은 곳 — 꽃 영역
      { x: 2300, y: groundY - 150, w: 120, h: 18 },
      { x: 2500, y: groundY - 200, w: 150, h: 18 },
      { x: 2650, y: groundY - 250, w: 160, h: 18 },
    ];
    player.y = groundY + tunables.playerStartY;

    // 오브젝트 위치 재설정
    inspectableObjects[0].x = 800;
    inspectableObjects[0].y = groundY - 100;
    inspectableObjects[1].x = 1500;
    inspectableObjects[1].y = groundY - 40;
    inspectableObjects[2].x = 2400;
    inspectableObjects[2].y = groundY - 40;
  }

  // ── Word fragments (시어 파편) ──
  const WORDS = [
    '그립고 아쉬움에 가슴 조이던',
    '머언 먼 젊음의 뒤안길에서',
    '인제는 돌아와 거울 앞에 선',
    '내 누님같이 생긴 꽃이여.',
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
  let popupText = '';
  let popupTimer = 0;
  let popupX = 0;
  let popupY = 0;

  // ── Inspectable objects (E-key mechanic) ──
  interface InspectableObject {
    x: number;
    y: number;
    w: number;
    h: number;
    name: string;
    thought: string;
    icon: string; // 'mirror' | 'path' | 'flower'
  }

  const inspectableObjects: InspectableObject[] = [
    {
      x: 800, y: 0, w: 50, h: 60,
      name: '거울',
      thought: '거울 속에 비친 모습이... 언제 이렇게 세월이 흘렀을까.',
      icon: 'mirror',
    },
    {
      x: 1500, y: 0, w: 60, h: 50,
      name: '오래된 이정표',
      thought: '젊음의 뒤안길... 돌이킬 수 없는 그 시절의 발자국들.',
      icon: 'path',
    },
    {
      x: 2400, y: 0, w: 44, h: 56,
      name: '국화꽃',
      thought: '내 누님같이 생긴 이 꽃... 그리움이 피워낸 것이로구나.',
      icon: 'flower',
    },
  ];

  let thoughtText = '';
  let thoughtTimer = 0;
  const THOUGHT_DURATION = 3000;
  let nearObject: InspectableObject | null = null;
  let ePromptAlpha = 0;

  // ── Autumn leaf particles ──
  interface Leaf {
    x: number; y: number; vx: number; vy: number;
    rot: number; rotSpeed: number; size: number;
    color: string; swayPhase: number; swayAmp: number;
  }

  let leaves: Leaf[] = [];
  const LEAF_COLORS = [
    '#D4782F', '#C4601A', '#E89B3A', '#B8451C',
    '#D9A044', '#CF6B2E', '#A83820', '#E6A652',
  ];

  function spawnLeaf(randomY = false): Leaf {
    return {
      x: Math.random() * (WORLD_W + 200) - 100,
      y: randomY ? Math.random() * groundY : -20 - Math.random() * 80,
      vx: -0.2 - Math.random() * 0.5,
      vy: 0.3 + Math.random() * 0.6,
      rot: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.03,
      size: 6 + Math.random() * 8,
      color: LEAF_COLORS[Math.floor(Math.random() * LEAF_COLORS.length)],
      swayPhase: Math.random() * Math.PI * 2,
      swayAmp: 0.3 + Math.random() * 0.6,
    };
  }

  function initLeaves() {
    leaves = [];
    for (let i = 0; i < 60; i++) {
      leaves.push(spawnLeaf(true));
    }
  }

  // ── Mirror decoration state ──
  const mirrorDecor = {
    x: 1900, y: 0, w: 70, h: 120,
    shimmerPhase: 0,
  };

  // ── Autumn trees ──
  interface AutumnTree {
    x: number; trunkH: number; canopyR: number;
    colors: string[];
  }

  let autumnTrees: AutumnTree[] = [];
  function initTrees() {
    autumnTrees = [];
    const treePositions = [150, 450, 780, 1050, 1400, 1750, 2100, 2450, 2750, 3050];
    for (const tx of treePositions) {
      autumnTrees.push({
        x: tx,
        trunkH: 60 + Math.random() * 50,
        canopyR: 35 + Math.random() * 25,
        colors: [
          LEAF_COLORS[Math.floor(Math.random() * LEAF_COLORS.length)],
          LEAF_COLORS[Math.floor(Math.random() * LEAF_COLORS.length)],
          LEAF_COLORS[Math.floor(Math.random() * LEAF_COLORS.length)],
        ],
      });
    }
  }

  // ── Fallen leaves on ground ──
  interface FallenLeaf {
    x: number; y: number; rot: number; size: number; color: string;
  }
  let fallenLeaves: FallenLeaf[] = [];
  function initFallenLeaves() {
    fallenLeaves = [];
    for (let i = 0; i < 80; i++) {
      fallenLeaves.push({
        x: Math.random() * WORLD_W,
        y: groundY - 4 + Math.random() * 6,
        rot: Math.random() * Math.PI * 2,
        size: 4 + Math.random() * 6,
        color: LEAF_COLORS[Math.floor(Math.random() * LEAF_COLORS.length)],
      });
    }
  }

  // ── Tick counter for animations ──
  let tick = 0;

  // ── _running flag ──
  let _running = false;

  // ═══════════════════════════════════════════════════════════
  //  gameStartS3 — full reset & start
  // ═══════════════════════════════════════════════════════════
  function gameStartS3() {
    if (_running) return;
    _running = true;
    gameStarted = true;
    gameOver = false;
    collectedCount = 0;
    tick = 0;

    // 플레이어 위치 초기화
    player.x = tunables.playerStartX;
    player.y = groundY + tunables.playerStartY;
    player.vy = 0;
    player.vx = 0;
    player.dir = 1;
    player.walkFrame = 0;
    player.walkTimer = 0;
    player.breathPhase = 0;
    player.onGround = false;

    // 파편 초기화
    buildWorld();
    initFragments();
    initLeaves();
    initTrees();
    initFallenLeaves();
    mirrorDecor.y = groundY - mirrorDecor.h - 10;

    // 팝업 / 인스펙션 초기화
    popupText = '';
    popupTimer = 0;
    thoughtText = '';
    thoughtTimer = 0;
    nearObject = null;

    // HUD 초기화
    for (let i = 0; i < 4; i++) {
      const dot = document.getElementById('s3d' + i);
      if (dot) dot.classList.remove('collected');
      const line = document.getElementById('s3l' + i);
      if (line) line.classList.remove('found');
    }
    const flashEl = document.getElementById('s3word_flash');
    if (flashEl) flashEl.style.opacity = '0';
    const thoughtEl = document.getElementById('s3thought');
    if (thoughtEl) { thoughtEl.style.opacity = '0'; thoughtEl.textContent = ''; }
    const clearEl = document.getElementById('s3stage_clear');
    if (clearEl) clearEl.style.display = 'none';

    camX = 0;

    // 게임 루프 시작
    requestAnimationFrame(gameLoop);
  }

  window.gameStartS3 = gameStartS3;
  window.initStage3 = initStage3;

  // ═══════════════════════════════════════════════════════════
  //  RENDERING HELPERS
  // ═══════════════════════════════════════════════════════════

  // ── Draw warm amber sky gradient ──
  function drawSky() {
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#2E1A0E');       // deep warm brown at top
    grad.addColorStop(0.15, '#6B3419');    // dark amber
    grad.addColorStop(0.35, '#C4652A');    // warm orange
    grad.addColorStop(0.55, '#E89B3A');    // golden amber
    grad.addColorStop(0.72, '#F0C87A');    // pale golden horizon
    grad.addColorStop(1, '#8B6534');       // warm earth
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // 석양 원 — warm glowing sun low on horizon
    const sunX = W * 0.75;
    const sunY = H * 0.38;
    const sunGrad = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, 120);
    sunGrad.addColorStop(0, 'rgba(255,220,140,0.6)');
    sunGrad.addColorStop(0.4, 'rgba(245,180,80,0.3)');
    sunGrad.addColorStop(1, 'rgba(230,150,50,0)');
    ctx.fillStyle = sunGrad;
    ctx.beginPath();
    ctx.arc(sunX, sunY, 120, 0, Math.PI * 2);
    ctx.fill();
  }

  // ── Draw distant hills (parallax) ──
  function drawDistantHills() {
    const parallax = camX * 0.15;
    ctx.fillStyle = 'rgba(100,50,20,0.25)';
    ctx.beginPath();
    ctx.moveTo(-parallax, groundY);
    for (let x = 0; x < W + 200; x += 80) {
      const hy = groundY - 80 - Math.sin((x + parallax * 0.5) * 0.004) * 40
                                - Math.sin((x + parallax * 0.3) * 0.007) * 25;
      ctx.lineTo(x, hy);
    }
    ctx.lineTo(W + 200, groundY);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = 'rgba(120,60,25,0.2)';
    ctx.beginPath();
    ctx.moveTo(-parallax * 0.7, groundY);
    for (let x = 0; x < W + 200; x += 60) {
      const hy = groundY - 50 - Math.sin((x + parallax * 0.8) * 0.005 + 1) * 30
                                - Math.cos((x + parallax * 0.4) * 0.009) * 15;
      ctx.lineTo(x, hy);
    }
    ctx.lineTo(W + 200, groundY);
    ctx.closePath();
    ctx.fill();
  }

  // ── Draw autumn tree ──
  function drawTree(tree: AutumnTree, sx: number) {
    const baseY = groundY;
    // trunk
    ctx.fillStyle = '#5C3A1E';
    ctx.fillRect(sx - 6, baseY - tree.trunkH, 12, tree.trunkH);
    // branches
    ctx.strokeStyle = '#5C3A1E';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(sx, baseY - tree.trunkH * 0.7);
    ctx.lineTo(sx - 20, baseY - tree.trunkH * 0.85);
    ctx.moveTo(sx, baseY - tree.trunkH * 0.6);
    ctx.lineTo(sx + 18, baseY - tree.trunkH * 0.78);
    ctx.stroke();

    // canopy — layered circles with autumn colors
    const cx = sx;
    const cy = baseY - tree.trunkH - tree.canopyR * 0.5;
    for (let c = 0; c < tree.colors.length; c++) {
      ctx.fillStyle = tree.colors[c];
      ctx.globalAlpha = 0.7;
      const offx = (c - 1) * tree.canopyR * 0.5;
      const offy = (c % 2) * -tree.canopyR * 0.2;
      ctx.beginPath();
      ctx.arc(cx + offx, cy + offy, tree.canopyR * 0.7, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // subtle leaf cluster highlight
    ctx.fillStyle = 'rgba(255,220,120,0.15)';
    ctx.beginPath();
    ctx.arc(cx, cy - 5, tree.canopyR * 0.4, 0, Math.PI * 2);
    ctx.fill();
  }

  // ── Draw fallen leaves on ground ──
  function drawFallenLeaves() {
    for (const fl of fallenLeaves) {
      const sx = fl.x - camX;
      if (sx < -20 || sx > W + 20) continue;
      ctx.save();
      ctx.translate(sx, fl.y);
      ctx.rotate(fl.rot);
      ctx.fillStyle = fl.color;
      ctx.globalAlpha = 0.6;
      // simple leaf shape
      ctx.beginPath();
      ctx.ellipse(0, 0, fl.size * 0.6, fl.size * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.restore();
    }
  }

  // ── Draw ground ──
  function drawGround() {
    // main ground
    const grad = ctx.createLinearGradient(0, groundY, 0, H);
    grad.addColorStop(0, '#7A5430');
    grad.addColorStop(0.3, '#5E3D1E');
    grad.addColorStop(1, '#3A2510');
    ctx.fillStyle = grad;
    ctx.fillRect(0, groundY, W, H - groundY);

    // grass-like top edge
    ctx.strokeStyle = '#8B6B3D';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let x = 0; x < W; x += 6) {
      const wx = x + camX;
      const gh = Math.sin(wx * 0.05) * 3 + Math.sin(wx * 0.12) * 2;
      ctx.moveTo(x, groundY);
      ctx.lineTo(x, groundY - 4 - gh);
    }
    ctx.stroke();
  }

  // ── Draw warm-toned platforms ──
  function drawPlatforms() {
    for (let i = 1; i < platforms.length; i++) {
      const p = platforms[i];
      const sx = p.x - camX;
      if (sx + p.w < -50 || sx > W + 50) continue;

      // platform body — warm wood tones
      const grad = ctx.createLinearGradient(sx, p.y, sx, p.y + p.h);
      grad.addColorStop(0, '#A67B4B');
      grad.addColorStop(0.5, '#8B6340');
      grad.addColorStop(1, '#6E4C2E');
      ctx.fillStyle = grad;

      // rounded rectangle
      const r = 6;
      ctx.beginPath();
      ctx.moveTo(sx + r, p.y);
      ctx.lineTo(sx + p.w - r, p.y);
      ctx.quadraticCurveTo(sx + p.w, p.y, sx + p.w, p.y + r);
      ctx.lineTo(sx + p.w, p.y + p.h);
      ctx.lineTo(sx, p.y + p.h);
      ctx.lineTo(sx, p.y + r);
      ctx.quadraticCurveTo(sx, p.y, sx + r, p.y);
      ctx.closePath();
      ctx.fill();

      // top highlight
      ctx.strokeStyle = 'rgba(255,210,140,0.4)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(sx + 4, p.y + 1);
      ctx.lineTo(sx + p.w - 4, p.y + 1);
      ctx.stroke();

      // bottom shadow
      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      ctx.fillRect(sx + 2, p.y + p.h - 3, p.w - 4, 3);
    }
  }

  // ── Draw mirror decoration ──
  function drawMirrorDecor() {
    const sx = mirrorDecor.x - camX;
    if (sx < -100 || sx > W + 100) return;

    mirrorDecor.shimmerPhase += 0.02;
    const my = mirrorDecor.y;

    // frame (ornate wooden frame)
    ctx.fillStyle = '#6B4226';
    ctx.fillRect(sx - 6, my - 6, mirrorDecor.w + 12, mirrorDecor.h + 12);
    ctx.fillStyle = '#8B5A2B';
    ctx.fillRect(sx - 3, my - 3, mirrorDecor.w + 6, mirrorDecor.h + 6);

    // mirror surface
    const mirrorGrad = ctx.createLinearGradient(sx, my, sx + mirrorDecor.w, my + mirrorDecor.h);
    mirrorGrad.addColorStop(0, 'rgba(180,200,210,0.7)');
    mirrorGrad.addColorStop(0.3, 'rgba(200,215,225,0.8)');
    mirrorGrad.addColorStop(0.5, 'rgba(220,230,235,0.9)');
    mirrorGrad.addColorStop(0.7, 'rgba(200,215,225,0.8)');
    mirrorGrad.addColorStop(1, 'rgba(180,195,210,0.7)');
    ctx.fillStyle = mirrorGrad;
    ctx.fillRect(sx, my, mirrorDecor.w, mirrorDecor.h);

    // shimmer highlight
    const shimX = sx + (Math.sin(mirrorDecor.shimmerPhase) * 0.5 + 0.5) * mirrorDecor.w;
    const shimGrad = ctx.createRadialGradient(shimX, my + mirrorDecor.h * 0.4, 0, shimX, my + mirrorDecor.h * 0.4, 30);
    shimGrad.addColorStop(0, 'rgba(255,255,255,0.4)');
    shimGrad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = shimGrad;
    ctx.fillRect(sx, my, mirrorDecor.w, mirrorDecor.h);

    // reflection silhouette (faint figure)
    ctx.fillStyle = 'rgba(100,80,60,0.15)';
    const refX = sx + mirrorDecor.w / 2;
    const refY = my + mirrorDecor.h * 0.3;
    // head
    ctx.beginPath();
    ctx.arc(refX, refY, 8, 0, Math.PI * 2);
    ctx.fill();
    // body
    ctx.fillRect(refX - 5, refY + 8, 10, 25);

    // ornate frame corners
    ctx.fillStyle = '#D4A652';
    const cs = 8;
    ctx.fillRect(sx - 5, my - 5, cs, cs);
    ctx.fillRect(sx + mirrorDecor.w - cs + 5, my - 5, cs, cs);
    ctx.fillRect(sx - 5, my + mirrorDecor.h - cs + 5, cs, cs);
    ctx.fillRect(sx + mirrorDecor.w - cs + 5, my + mirrorDecor.h - cs + 5, cs, cs);
  }

  // ── Draw inspectable objects ──
  function drawInspectables() {
    for (const obj of inspectableObjects) {
      const sx = obj.x - camX;
      if (sx < -60 || sx > W + 60) continue;

      if (obj.icon === 'mirror') {
        // small standing mirror
        ctx.fillStyle = '#5C3A1E';
        ctx.fillRect(sx + 15, obj.y + 30, 20, 30);
        ctx.fillStyle = '#8B6B4A';
        ctx.fillRect(sx + 5, obj.y, 40, 35);
        ctx.fillStyle = 'rgba(180,210,230,0.6)';
        ctx.fillRect(sx + 9, obj.y + 4, 32, 27);
        // gleam
        ctx.strokeStyle = 'rgba(255,255,255,0.4)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(sx + 15, obj.y + 8);
        ctx.lineTo(sx + 25, obj.y + 16);
        ctx.stroke();
      } else if (obj.icon === 'path') {
        // old wooden sign post
        ctx.fillStyle = '#6B4226';
        ctx.fillRect(sx + 26, obj.y + 10, 8, 40);
        ctx.fillStyle = '#8B6340';
        ctx.fillRect(sx + 5, obj.y, 50, 18);
        // text on sign
        ctx.fillStyle = 'rgba(200,180,140,0.7)';
        ctx.font = '9px serif';
        ctx.textAlign = 'center';
        ctx.fillText('뒤안길', sx + 30, obj.y + 13);
      } else if (obj.icon === 'flower') {
        // chrysanthemum (국화)
        const fx = sx + 22;
        const fy = obj.y + 10;
        // stem
        ctx.strokeStyle = '#4A7A3A';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(fx, fy + 15);
        ctx.lineTo(fx, fy + 46);
        ctx.stroke();
        // petals
        const petalCount = 12;
        for (let p = 0; p < petalCount; p++) {
          const angle = (p / petalCount) * Math.PI * 2 + tick * 0.005;
          const px = fx + Math.cos(angle) * 12;
          const py = fy + Math.sin(angle) * 10;
          ctx.fillStyle = p % 2 === 0 ? '#E6C44A' : '#D4A832';
          ctx.beginPath();
          ctx.ellipse(px, py, 6, 3, angle, 0, Math.PI * 2);
          ctx.fill();
        }
        // center
        ctx.fillStyle = '#B8860B';
        ctx.beginPath();
        ctx.arc(fx, fy, 5, 0, Math.PI * 2);
        ctx.fill();
      }

      // "E" prompt glow when near
      const dist = Math.abs(player.x - obj.x - obj.w / 2) + Math.abs((player.y + player.h) - (obj.y + obj.h)) * 0.5;
      if (dist < 80) {
        const pulse = Math.sin(tick * 0.08) * 0.3 + 0.7;
        ctx.fillStyle = `rgba(255,220,120,${0.8 * pulse})`;
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('[E] 조사', sx + obj.w / 2, obj.y - 12);
      }
    }
  }

  // ── Draw floating leaf particles ──
  function updateAndDrawLeaves() {
    for (let i = leaves.length - 1; i >= 0; i--) {
      const lf = leaves[i];
      lf.swayPhase += 0.015;
      lf.x += lf.vx + Math.sin(lf.swayPhase) * lf.swayAmp;
      lf.y += lf.vy;
      lf.rot += lf.rotSpeed;

      // remove if below ground, spawn new
      if (lf.y > groundY + 10) {
        leaves[i] = spawnLeaf(false);
        continue;
      }

      const sx = lf.x - camX;
      if (sx < -30 || sx > W + 30) continue;

      ctx.save();
      ctx.translate(sx, lf.y);
      ctx.rotate(lf.rot);
      ctx.fillStyle = lf.color;
      ctx.globalAlpha = 0.75;
      // leaf shape
      ctx.beginPath();
      ctx.moveTo(0, -lf.size * 0.5);
      ctx.quadraticCurveTo(lf.size * 0.5, -lf.size * 0.2, lf.size * 0.3, lf.size * 0.3);
      ctx.quadraticCurveTo(0, lf.size * 0.5, -lf.size * 0.3, lf.size * 0.3);
      ctx.quadraticCurveTo(-lf.size * 0.5, -lf.size * 0.2, 0, -lf.size * 0.5);
      ctx.fill();
      // leaf vein
      ctx.strokeStyle = 'rgba(0,0,0,0.15)';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(0, -lf.size * 0.4);
      ctx.lineTo(0, lf.size * 0.3);
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.restore();
    }
  }

  // ── Draw diamond fragment ──
  function drawDiamond(sx: number, sy: number, bob: number, word: string) {
    const by = Math.sin(tick * 0.04 + bob * 1.8) * 6;
    const dy = sy + by;

    // warm glow
    const glowGrad = ctx.createRadialGradient(sx, dy, 0, sx, dy, 28);
    glowGrad.addColorStop(0, 'rgba(255,200,80,0.35)');
    glowGrad.addColorStop(1, 'rgba(255,180,60,0)');
    ctx.fillStyle = glowGrad;
    ctx.beginPath();
    ctx.arc(sx, dy, 28, 0, Math.PI * 2);
    ctx.fill();

    // diamond shape
    ctx.fillStyle = '#F0B840';
    ctx.beginPath();
    ctx.moveTo(sx, dy - 14);
    ctx.lineTo(sx + 10, dy);
    ctx.lineTo(sx, dy + 14);
    ctx.lineTo(sx - 10, dy);
    ctx.closePath();
    ctx.fill();

    // inner highlight
    ctx.fillStyle = 'rgba(255,240,180,0.6)';
    ctx.beginPath();
    ctx.moveTo(sx, dy - 8);
    ctx.lineTo(sx + 5, dy);
    ctx.lineTo(sx, dy + 2);
    ctx.lineTo(sx - 5, dy);
    ctx.closePath();
    ctx.fill();

    // sparkle
    const sp = Math.sin(tick * 0.1 + bob) * 0.5 + 0.5;
    ctx.fillStyle = `rgba(255,255,220,${sp * 0.8})`;
    ctx.beginPath();
    ctx.arc(sx + 3, dy - 6, 2, 0, Math.PI * 2);
    ctx.fill();

    // label above
    ctx.fillStyle = 'rgba(255,230,180,0.85)';
    ctx.font = `${tunables.labelFontSize}px 'Noto Serif KR', serif`;
    ctx.textAlign = 'center';
    ctx.fillText(word, sx, dy + tunables.labelOffsetY);
  }

  // ── Draw player ──
  function drawPlayer() {
    const sx = player.x - camX;
    const sy = player.y;
    const dir = player.dir;

    player.breathPhase += 0.04;
    const breathOffset = Math.sin(player.breathPhase) * 1.5;

    ctx.save();
    ctx.translate(sx + player.w / 2, sy + player.h);
    ctx.scale(dir, 1);

    // shadow
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.beginPath();
    ctx.ellipse(0, 2, 14, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // body
    ctx.fillStyle = '#C88B4A';
    ctx.fillRect(-7, -player.h + breathOffset, 14, 28);

    // coat/hanbok-like overlay
    ctx.fillStyle = '#A06830';
    ctx.fillRect(-9, -player.h + 8 + breathOffset, 18, 22);

    // head
    ctx.fillStyle = '#E8C89A';
    ctx.beginPath();
    ctx.arc(0, -player.h - 2, 9, 0, Math.PI * 2);
    ctx.fill();

    // hair
    ctx.fillStyle = '#3A2515';
    ctx.beginPath();
    ctx.arc(0, -player.h - 5, 9, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(-9, -player.h - 5, 18, 4);

    // eyes
    ctx.fillStyle = '#2A1A0A';
    ctx.fillRect(2, -player.h - 2, 2, 2.5);

    // legs
    const walkBob = player.onGround ? Math.sin(player.walkTimer * 0.15) * 4 : 0;
    ctx.fillStyle = '#5C3A1E';
    ctx.fillRect(-5, -player.h + 30 + breathOffset, 5, 18);
    ctx.fillRect(2, -player.h + 30 + breathOffset + walkBob * 0.5, 5, 18);

    ctx.restore();
  }

  // ── Draw popup ──
  function drawPopup() {
    if (popupTimer <= 0) return;
    const alpha = Math.min(1, popupTimer / 300);
    const sx = popupX - camX;
    const sy = popupY - 40 - (1 - alpha) * 20;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#FFF5E0';
    ctx.font = `bold ${tunables.popupFontSize}px 'Noto Serif KR', serif`;
    ctx.textAlign = 'center';
    ctx.strokeStyle = 'rgba(180,120,40,0.6)';
    ctx.lineWidth = 3;
    ctx.strokeText(popupText, sx, sy);
    ctx.fillText(popupText, sx, sy);
    ctx.globalAlpha = 1;
  }

  // ═══════════════════════════════════════════════════════════
  //  GAME LOOP
  // ═══════════════════════════════════════════════════════════
  function gameLoop() {
    if (!_running) return;
    tick++;

    // ── Input ──
    player.vx = 0;
    if (keys['ArrowLeft'] || keys['a'] || keys['A']) {
      player.vx = -tunables.moveSpeed;
      player.dir = -1;
    }
    if (keys['ArrowRight'] || keys['d'] || keys['D']) {
      player.vx = tunables.moveSpeed;
      player.dir = 1;
    }
    if ((keys['ArrowUp'] || keys['w'] || keys['W'] || keys[' ']) && player.onGround) {
      player.vy = tunables.jumpForce;
      player.onGround = false;
    }

    // E-key inspection
    nearObject = null;
    for (const obj of inspectableObjects) {
      const dist = Math.abs(player.x + player.w / 2 - obj.x - obj.w / 2)
                 + Math.abs(player.y + player.h - obj.y - obj.h) * 0.5;
      if (dist < 80) {
        nearObject = obj;
        break;
      }
    }
    if (keys['e'] || keys['E']) {
      if (nearObject && thoughtTimer <= 0) {
        thoughtText = nearObject.thought;
        thoughtTimer = THOUGHT_DURATION;
        const thoughtEl = document.getElementById('s3thought');
        if (thoughtEl) {
          thoughtEl.textContent = '💭 ' + thoughtText;
          thoughtEl.style.opacity = '1';
          thoughtEl.style.transition = 'opacity 0.4s';
        }
      }
      keys['e'] = false;
      keys['E'] = false;
    }

    // Thought timer
    if (thoughtTimer > 0) {
      thoughtTimer -= 16;
      if (thoughtTimer <= 500) {
        const thoughtEl = document.getElementById('s3thought');
        if (thoughtEl) thoughtEl.style.opacity = String(thoughtTimer / 500);
      }
      if (thoughtTimer <= 0) {
        const thoughtEl = document.getElementById('s3thought');
        if (thoughtEl) { thoughtEl.style.opacity = '0'; }
      }
    }

    // ── Physics ──
    player.vy += tunables.gravity;
    player.x += player.vx;
    player.y += player.vy;

    // Clamp to world
    if (player.x < 0) player.x = 0;
    if (player.x > WORLD_W - player.w) player.x = WORLD_W - player.w;

    // Walk animation
    if (Math.abs(player.vx) > 0.1 && player.onGround) {
      player.walkTimer++;
    } else {
      player.walkTimer = 0;
    }

    // ── Collision ──
    player.onGround = false;
    for (const p of platforms) {
      // feet collision (top of platform)
      if (
        player.vy >= 0 &&
        player.x + player.w > p.x &&
        player.x < p.x + p.w &&
        player.y + player.h >= p.y &&
        player.y + player.h <= p.y + p.h + player.vy + 2
      ) {
        player.y = p.y - player.h;
        player.vy = 0;
        player.onGround = true;
      }
    }

    // ── Fragment collection ──
    for (const frag of fragments) {
      if (frag.collected) continue;
      const dx = (player.x + player.w / 2) - frag.x;
      const dy = (player.y + player.h / 2) - frag.y;
      if (Math.abs(dx) < 30 && Math.abs(dy) < 30) {
        frag.collected = true;
        collectedCount++;

        // popup
        popupText = frag.word;
        popupTimer = tunables.popupFadeMs;
        popupX = frag.x;
        popupY = frag.y;

        // word flash
        const flashEl = document.getElementById('s3word_flash');
        if (flashEl) {
          flashEl.textContent = frag.word;
          flashEl.style.opacity = '1';
          flashEl.style.transition = 'opacity 0.3s';
          setTimeout(() => { flashEl.style.opacity = '0'; }, tunables.popupFadeMs);
        }

        // HUD update
        const idx = WORDS.indexOf(frag.word);
        if (idx >= 0) {
          const dot = document.getElementById('s3d' + idx);
          if (dot) dot.classList.add('collected');
          const line = document.getElementById('s3l' + idx);
          if (line) line.classList.add('found');
        }
      }
    }

    // ── Popup timer ──
    if (popupTimer > 0) {
      popupTimer -= 16;
    }

    // ── Camera ──
    const targetCamX = player.x - W * 0.35;
    camX += (targetCamX - camX) * 0.08;
    if (camX < 0) camX = 0;
    if (camX > WORLD_W - W) camX = WORLD_W - W;

    // ═══ RENDER ═══
    ctx.clearRect(0, 0, W, H);

    // 1. Sky
    drawSky();

    // 2. Distant hills (parallax)
    drawDistantHills();

    // 3. Autumn trees (behind platforms)
    for (const tree of autumnTrees) {
      const sx = tree.x - camX;
      if (sx > -80 && sx < W + 80) {
        drawTree(tree, sx);
      }
    }

    // 4. Fallen leaves on ground
    drawFallenLeaves();

    // 5. Ground
    drawGround();

    // 6. Platforms
    drawPlatforms();

    // 7. Mirror decoration
    drawMirrorDecor();

    // 8. Inspectable objects
    drawInspectables();

    // 9. Floating leaf particles
    updateAndDrawLeaves();

    // 10. Fragments
    for (const frag of fragments) {
      if (frag.collected) continue;
      const sx = frag.x - camX;
      if (sx > -40 && sx < W + 40) {
        drawDiamond(sx, frag.y, frag.bob, frag.word);
      }
    }

    // 11. Player
    drawPlayer();

    // 12. Collection popup
    drawPopup();

    // 13. Ambient golden vignette
    const vigGrad = ctx.createRadialGradient(W / 2, H / 2, W * 0.3, W / 2, H / 2, W * 0.8);
    vigGrad.addColorStop(0, 'rgba(0,0,0,0)');
    vigGrad.addColorStop(1, 'rgba(40,20,5,0.35)');
    ctx.fillStyle = vigGrad;
    ctx.fillRect(0, 0, W, H);

    // ── Clear check ──
    if (collectedCount >= TOTAL_FRAGMENTS) {
      _running = false;
      gameOver = true;

      // clear effect: golden flash
      let flashAlpha = 1;
      const flashInterval = setInterval(() => {
        flashAlpha -= 0.02;
        if (flashAlpha <= 0) {
          clearInterval(flashInterval);
        }
        ctx.fillStyle = `rgba(255,220,120,${Math.max(0, flashAlpha * 0.3)})`;
        ctx.fillRect(0, 0, W, H);
      }, 30);

      const clearEl = document.getElementById('s3stage_clear');
      if (clearEl) {
        setTimeout(() => {
          clearEl.style.display = 'flex';
        }, 800);
      }

      setTimeout(() => {
        window.onStageClear?.(3);
      }, 3000);
      return;
    }

    requestAnimationFrame(gameLoop);
  }

  // ─────────────────────────────────────────
  //  ADMIN API (관리자 패널이 읽음)
  // ─────────────────────────────────────────
  (window as any).s3API = {
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
      setTimeout(() => gameStartS3(), 50);
    },
  };

} // end initStage3
