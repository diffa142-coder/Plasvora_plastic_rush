import * as THREE from 'three';
import { audio } from './audio.js';
import { curveUniforms } from './curvedWorld.js';
import {
  createBazookaRocket,
  createBombItem,
  createBossTruck,
  createBossUfo,
  createClouds,
  createCrashBonkProp,
  createEcoCoin,
  createLitterbug,
  createPlasticBag,
  createPlasticObstacle,
  createPlayer,
  createTrackChunk,
  createTrashBin
} from './models.js';

const LANE_X = [-2.2, 0, 2.2];
const CHUNK_LEN = 22;
const CHUNK_COUNT = 6;
const SPAWN_Z = -108;
const DESPAWN_Z = 14;
const LB_STORAGE_KEY = 'plasvora_exhibition_leaderboard_v1';

const ECO_FACTS = [
  '1 kantong kresek butuh hingga ratusan tahun untuk terurai. Kumpulkan & pilah lewat Plasvora!',
  'Botol plastik PET bisa didaur ulang menjadi serat baju, pot tanaman, hingga bahan bangunan ramah lingkungan.',
  'Memisahkan sampah plastik dari sampah organik membuat proses daur ulang jauh lebih bersih dan bernilai tinggi!',
  'Lebih dari 8 juta ton sampah plastik masuk ke laut setiap tahun. Aksi kecil memilah sampah sangat berarti!',
  'Gunakan tas belanja kain berulang kali untuk mengurangi timbunan sampah kresek harian.'
];

// DOM Elements
const gameShellEl = document.getElementById('game-shell');
const canvas = document.getElementById('game-canvas');
const hudEl = document.getElementById('hud');
const binCountEl = document.getElementById('bin-count');
const coinCountEl = document.getElementById('coin-count');
const distCountEl = document.getElementById('dist-count');
const comboToastEl = document.getElementById('combo-toast');
const bossHudEl = document.getElementById('boss-hud');
const bossTitleEl = document.getElementById('boss-title');
const bossHpIconsEl = document.getElementById('boss-hp-icons');
const bazookaUiEl = document.getElementById('bazooka-ui');
const bazookaLockEl = document.getElementById('bazooka-lock');
const fireBazookaBtn = document.getElementById('fire-bazooka-btn');
const storyBannerEl = document.getElementById('story-banner');
const stickerRewardToastEl = document.getElementById('sticker-reward-toast');
const stickerPrizeBoxEl = document.getElementById('sticker-prize-box');
const introGuideEl = document.getElementById('intro-guide');

const startScreenEl = document.getElementById('start-screen');
const pauseScreenEl = document.getElementById('pause-screen');
const gameoverScreenEl = document.getElementById('gameover-screen');

const startBtn = document.getElementById('start-btn');
const startFullscreenBtn = document.getElementById('start-fullscreen-btn');
const cornerFullscreenBtn = document.getElementById('corner-fullscreen-btn');
const fsIconExpandEl = document.getElementById('fs-icon-expand');
const fsIconShrinkEl = document.getElementById('fs-icon-shrink');
const pauseFullscreenBtn = document.getElementById('pause-fullscreen-btn');
const pauseBtn = document.getElementById('pause-btn');
const soundBtn = document.getElementById('sound-btn');
const resumeBtn = document.getElementById('resume-btn');
const restartFromPauseBtn = document.getElementById('restart-from-pause-btn');
const homeFromPauseBtn = document.getElementById('home-from-pause-btn');
const retryBtn = document.getElementById('retry-btn');
const menuBtn = document.getElementById('menu-btn');

const pauseBinsEl = document.getElementById('pause-bins');
const pauseCoinsEl = document.getElementById('pause-coins');
const finalBinsEl = document.getElementById('final-bins');
const finalCoinsEl = document.getElementById('final-coins');
const finalDistanceEl = document.getElementById('final-distance');
const ecoFactEl = document.getElementById('eco-fact');
const leaderboardListEl = document.getElementById('leaderboard-list');
const bestScoreBadgeEl = document.getElementById('best-score-badge');
const playerNameInput = document.getElementById('player-name-input');
const saveScoreBtn = document.getElementById('save-score-btn');
const saveScoreRowEl = document.getElementById('save-score-row');
const savedMsgEl = document.getElementById('saved-msg');

// Three.js Setup
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x56ddff);
scene.fog = new THREE.Fog(0x7fe9ff, 75, 130);

const camera = new THREE.PerspectiveCamera(56, window.innerWidth / window.innerHeight, 0.1, 160);
camera.position.set(0, 5.1, 8.2);
camera.lookAt(0, 1.35, -14);

// Pencahayaan cerah ala kartun
const hemiLight = new THREE.HemisphereLight(0xffffff, 0x2ca850, 1.35);
scene.add(hemiLight);

const dirLight = new THREE.DirectionalLight(0xfffbe8, 1.15);
dirLight.position.set(8, 18, 10);
scene.add(dirLight);

// Dunia scrolling & awan
const worldGroup = new THREE.Group();
scene.add(worldGroup);

const clouds = createClouds();
scene.add(clouds);

const trackChunks = [];
for (let i = 0; i < CHUNK_COUNT; i++) {
  const chunk = createTrackChunk(CHUNK_LEN);
  chunk.position.z = -i * CHUNK_LEN;
  worldGroup.add(chunk);
  trackChunks.push(chunk);
}

// Pemain, si pembuang sampah (yang dikejar), & prop bonk
const player = createPlayer();
scene.add(player.root);

const litterbug = createLitterbug();
scene.add(litterbug.root);

const bossTruck = createBossTruck();
scene.add(bossTruck.root);

const bossUfo = createBossUfo();
scene.add(bossUfo.root);

const crashBonk = createCrashBonkProp();
scene.add(crashBonk);

// Grup objek dinamis (tong sampah, kresek, rintangan plastik, koin, partikel)
const entitiesGroup = new THREE.Group();
scene.add(entitiesGroup);

// Game State
let gameState = 'menu'; // 'menu' | 'playing' | 'paused' | 'crashing' | 'gameover'
let currentLane = 1; // 0: kiri, 1: tengah, 2: kanan
let playerX = LANE_X[1];
let playerY = 0;
let jumpVel = 0;
let runPhase = 0;
let kickTimer = 0;

let speed = 14.5;
let distance = 0;
let spawnAccumulator = 0;
let nextWaveGap = 22;
let binsCount = 0;
let coinsCount = 0;
let crashTimer = 0;
let toastTimer = null;
let introGuideTimer = null;
let waveCount = 0;

// State si pembuang sampah sembarangan yang dikejar
let litterbugLane = 1;
let litterbugX = LANE_X[1];
let litterbugZ = -26;
let litterbugPhase = 0;
let litterbugLaneTimer = 1.6;
let litterbugThrowTimer = 0;
let litterbugThrowCooldown = 3.2;
let introTimer = 0;
let introLitterSpawned = false;
let introBagEntry = null;

// State Boss (Truk Sampah setiap kelipatan 500m, Boss UFO + Bazooka setiap kelipatan 1000m!)
let bossState = 'none'; // 'none' | 'entering' | 'active' | 'exploding'
let bossType = 'truck'; // 'truck' | 'ufo'
let bossHp = 3;
let nextBossDistance = 500;

function computeNextBossDistance(currentDist) {
  const nextTruck = (Math.floor(currentDist / 500) + 1) * 500;
  const nextUfo = (Math.floor(currentDist / 1000) + 1) * 1000;
  return Math.min(nextTruck, nextUfo);
}
let bossRiderX = 0;
let bossTargetRiderX = 0;
let bossZ = -85;
let bossPhase = 0;
let bossThrowTimer = 0;
let bossThrowCooldown = 1.6;
let bossHitFlash = 0;
let bossExplodeTimer = 0;
let bombSpawnTimer = 1.5;
let bossBannerTimer = null;

// State khusus UFO & Bazooka
let ufoLane = 1;
let ufoX = 0;
let ufoLaneTimer = 1.4;
let bazookaCooldown = 0;
let bazookaRecoil = 0;
let footstepTimer = 0;
let stickerWon = false;
let stickerToastTimer = null;

let obstacles = []; // { type, lane, group, visual, warning, hit }
let bins = [];      // { side, x, group, binGroup, lidPivot, coin, scored, celebrateTime }
let bags = [];      // { lane, group, meshGroup, binRef, state, flyTime, startPos }
let bombs = [];     // { lane, laneX, group, meshGroup, flame, ring, state, flyTime, startPos }
let rockets = [];   // { group, flame, startX, startZ, targetLane, targetX, flyTime }
let coins = [];     // { lane, group, collected }
let particles = []; // { mesh, vel, life }

// Leaderboard Pameran
function loadLeaderboard() {
  try {
    const raw = localStorage.getItem(LB_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLeaderboardEntry(name, score, bins) {
  const list = loadLeaderboard();
  list.push({
    name: (name || 'Pengunjung').trim().slice(0, 14) || 'Pengunjung',
    score,
    bins,
    at: Date.now()
  });
  list.sort((a, b) => b.score - a.score || b.bins - a.bins);
  const top5 = list.slice(0, 5);
  try {
    localStorage.setItem(LB_STORAGE_KEY, JSON.stringify(top5));
  } catch {
    // Abaikan jika storage penuh
  }
  renderLeaderboard();
}

function renderLeaderboard() {
  const list = loadLeaderboard();
  const best = list.length ? list[0].score : 0;
  bestScoreBadgeEl.textContent = `Best: ${best}`;
  leaderboardListEl.innerHTML = '';

  if (list.length === 0) {
    const li = document.createElement('li');
    li.className = 'lb-empty';
    li.textContent = 'Belum ada rekor. Jadilah yang pertama!';
    leaderboardListEl.appendChild(li);
    return;
  }

  list.forEach((entry, idx) => {
    const li = document.createElement('li');
    const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}.`;
    const left = document.createElement('span');
    left.textContent = `${medal} ${entry.name}`;
    const right = document.createElement('strong');
    right.textContent = `${entry.score} pts (${entry.bins} 🗑️)`;
    li.append(left, right);
    leaderboardListEl.appendChild(li);
  });
}

function showToast(text) {
  comboToastEl.textContent = text;
  comboToastEl.classList.remove('hidden');
  comboToastEl.style.animation = 'none';
  // Trigger reflow agar animasi ulang berjalan
  void comboToastEl.offsetWidth;
  comboToastEl.style.animation = '';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    comboToastEl.classList.add('hidden');
  }, 750);
}

function updateHud() {
  binCountEl.textContent = String(binsCount);
  coinCountEl.textContent = String(coinsCount);
  distCountEl.textContent = `${Math.floor(distance)}m`;
}

function clearEntities() {
  [...obstacles, ...bins, ...bags, ...bombs, ...rockets, ...coins].forEach((item) => {
    entitiesGroup.remove(item.group);
  });
  particles.forEach((p) => entitiesGroup.remove(p.mesh));
  obstacles = [];
  bins = [];
  bags = [];
  bombs = [];
  rockets = [];
  coins = [];
  particles = [];
}

function spawnBombExplosion(x, y, z, count = 22) {
  const colors = [0xff5a1f, 0xfacc15, 0xef4444, 0xffffff, 0x22c55e];
  const geo = new THREE.SphereGeometry(0.24, 8, 8);
  for (let i = 0; i < count; i++) {
    const mat = new THREE.MeshBasicMaterial({ color: colors[i % colors.length] });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    entitiesGroup.add(mesh);
    particles.push({
      mesh,
      vel: new THREE.Vector3(
        (Math.random() - 0.5) * 11,
        3.5 + Math.random() * 8.5,
        (Math.random() - 0.5) * 9
      ),
      life: 0.85,
      maxLife: 0.85
    });
  }
}

function updateBossHud() {
  const left = Math.max(0, bossHp);
  const broken = 3 - left;
  if (bossType === 'ufo') {
    bossTitleEl.textContent = '🛸 BOSS UFO SAMPAH';
    bossHpIconsEl.textContent = `${'🚀 '.repeat(left)}${'💥 '.repeat(broken)}`.trim();
  } else {
    bossTitleEl.textContent = '🚚 BOSS TRUK SAMPAH';
    bossHpIconsEl.textContent = `${'💣 '.repeat(left)}${'💥 '.repeat(broken)}`.trim();
  }
}

function fireBazooka() {
  if (gameState !== 'playing' || bossType !== 'ufo' || bossState !== 'active') return;
  if (bazookaCooldown > 0) return;

  bazookaCooldown = 0.65;
  bazookaRecoil = 1.0;
  audio.playBazookaShoot();

  const rObj = createBazookaRocket();
  const startX = playerX + 0.42;
  const startZ = -0.8;
  rObj.group.position.set(startX, 1.25 + playerY, startZ);
  entitiesGroup.add(rObj.group);

  // Roket bazooka meluncur lurus sesuai arah jalur bidikan pemain saat menembak!
  rockets.push({
    ...rObj,
    startX,
    startY: 1.25 + playerY,
    startZ,
    aimLane: currentLane,
    aimX: playerX,
    flyTime: 0
  });

  spawnKickBurst(startX, 1.25 + playerY, startZ - 0.3, 0);
}

function spawnKickBurst(x, y, z, side = 0) {
  const ringGeo = new THREE.TorusGeometry(0.48, 0.07, 6, 18);
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.position.set(x, y, z);
  ring.rotation.y = -side * 0.45;
  entitiesGroup.add(ring);
  particles.push({
    mesh: ring,
    vel: new THREE.Vector3(side * 2.2, 0.5, -2.5),
    life: 0.28,
    maxLife: 0.28,
    isRing: true
  });

  const sparkColors = [0xffe047, 0x38bdf8, 0xffffff];
  const sparkGeo = new THREE.BoxGeometry(0.14, 0.14, 0.14);
  for (let i = 0; i < 8; i++) {
    const mat = new THREE.MeshBasicMaterial({ color: sparkColors[i % sparkColors.length] });
    const mesh = new THREE.Mesh(sparkGeo, mat);
    mesh.position.set(x, y, z);
    entitiesGroup.add(mesh);
    particles.push({
      mesh,
      vel: new THREE.Vector3(
        side * 3.2 + (Math.random() - 0.5) * 3.8,
        1.8 + Math.random() * 3.5,
        -2.5 - Math.random() * 3.5
      ),
      life: 0.42,
      maxLife: 0.42
    });
  }
}

function spawnConfetti(x, y, z) {
  const colors = [0x22c55e, 0xfacc15, 0x38bdf8, 0xffffff];
  const geo = new THREE.BoxGeometry(0.18, 0.18, 0.18);
  for (let i = 0; i < 14; i++) {
    const mat = new THREE.MeshBasicMaterial({ color: colors[i % colors.length] });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    entitiesGroup.add(mesh);
    particles.push({
      mesh,
      vel: new THREE.Vector3(
        (Math.random() - 0.5) * 6.5,
        3.5 + Math.random() * 4.5,
        (Math.random() - 0.5) * 4.5
      ),
      life: 0.75
    });
  }
}

const SIDE_BIN_X = 4.55;

function pickSideForLane(bagLane) {
  if (bagLane === 0) return -1;
  if (bagLane === 2) return 1;
  return Math.random() < 0.5 ? -1 : 1;
}

function spawnWave() {
  const obstacleTypes = ['bottle', 'bag_pile', 'jug_pile'];
  const laneOrder = [0, 1, 2].sort(() => Math.random() - 0.5);

  // Gelombang pertama selalu memunculkan kombo Kresek -> Tong Sampah di pinggir
  const isFirstWave = waveCount === 0;
  waveCount += 1;
  const hasBinCombo = isFirstWave || Math.random() < 0.72;

  if (hasBinCombo) {
    const bagLane = isFirstWave ? 1 : laneOrder[0];
    const side = isFirstWave ? 1 : pickSideForLane(bagLane);
    const binX = side * SIDE_BIN_X;

    const binObj = createTrashBin(Math.floor(Math.random() * 3));
    binObj.group.position.set(binX, 0, SPAWN_Z);
    // Tong di pinggir jalan menghadap serong ke lintasan agar stiker & lubang terlihat jelas
    binObj.binGroup.rotation.y = side < 0 ? 0.52 : -0.52;
    entitiesGroup.add(binObj.group);

    const binEntry = {
      side,
      x: binX,
      ...binObj,
      scored: false,
      incomingBag: false,
      celebrateTime: 0
    };
    bins.push(binEntry);

    // Sampah kresek diletakkan di jalur lari agar ditendang menyamping ke tong sampah di pinggir
    const bagObj = createPlasticBag(Math.floor(Math.random() * 4));
    bagObj.group.position.set(LANE_X[bagLane], 0, SPAWN_Z + 9.5);
    entitiesGroup.add(bagObj.group);
    bags.push({
      lane: bagLane,
      laneX: LANE_X[bagLane],
      ...bagObj,
      binRef: binEntry,
      state: 'idle',
      flyTime: 0,
      startPos: new THREE.Vector3()
    });

    // Jalur lain diisi maksimal 1 rintangan sampah plastik agar tidak terlalu padat (kecuali gelombang pertama biar fokus belajar)
    const otherLanes = laneOrder.filter((l) => l !== bagLane);
    const secondLane = otherLanes[0];
    if (!isFirstWave && Math.random() < 0.65) {
      const t = obstacleTypes[Math.floor(Math.random() * obstacleTypes.length)];
      const obs = createPlasticObstacle(t);
      obs.group.position.set(LANE_X[secondLane], 0, SPAWN_Z + 5.5);
      entitiesGroup.add(obs.group);
      obstacles.push({ lane: secondLane, laneX: LANE_X[secondLane], type: t, ...obs });
    }

    const thirdLane = otherLanes[1];
    if (Math.random() < 0.55) {
      const coinMesh = createEcoCoin();
      coinMesh.position.set(LANE_X[thirdLane], 0.85, SPAWN_Z + 6.0);
      entitiesGroup.add(coinMesh);
      coins.push({ lane: thirdLane, laneX: LANE_X[thirdLane], group: coinMesh, collected: false });
    }
  } else {
    // Gelombang rintangan sampah plastik (jarak lega, selalu ada jalur aman)
    const safeLane = laneOrder[0];
    const coinCount = 2;
    for (let c = 0; c < coinCount; c++) {
      const coinMesh = createEcoCoin();
      coinMesh.position.set(LANE_X[safeLane], 0.85, SPAWN_Z + c * 2.8);
      entitiesGroup.add(coinMesh);
      coins.push({ lane: safeLane, laneX: LANE_X[safeLane], group: coinMesh, collected: false });
    }

    const obsCount = Math.random() < 0.4 ? 2 : 1;
    for (let i = 1; i <= obsCount; i++) {
      const l = laneOrder[i];
      const t = obstacleTypes[Math.floor(Math.random() * obstacleTypes.length)];
      const obs = createPlasticObstacle(t);
      obs.group.position.set(LANE_X[l], 0, SPAWN_Z + (i - 1) * 2.0);
      entitiesGroup.add(obs.group);
      obstacles.push({ lane: l, laneX: LANE_X[l], type: t, ...obs });
    }
  }

  nextWaveGap = Math.max(22.5, 31.5 - (speed - 14.5) * 0.45);
}

function resetGame() {
  clearEntities();
  currentLane = 1;
  playerX = LANE_X[1];
  playerY = 0;
  jumpVel = 0;
  kickTimer = 0;
  runPhase = 0;

  speed = 14.5;
  distance = 0;
  spawnAccumulator = 0;
  nextWaveGap = 22;
  binsCount = 0;
  coinsCount = 0;
  crashTimer = 0;
  waveCount = 0;
  clearTimeout(introGuideTimer);
  clearTimeout(bossBannerTimer);
  clearTimeout(stickerToastTimer);
  introGuideEl.classList.add('hidden');
  storyBannerEl.classList.add('hidden');
  bossHudEl.classList.add('hidden');
  bazookaUiEl.classList.add('hidden');
  stickerRewardToastEl.classList.add('hidden');
  stickerPrizeBoxEl.classList.add('hidden');
  stickerWon = false;

  introTimer = 0;
  introLitterSpawned = false;
  introBagEntry = null;

  bossState = 'none';
  bossType = 'truck';
  bossHp = 3;
  nextBossDistance = 500;
  bossRiderX = 0;
  bossTargetRiderX = 0;
  bossZ = -85;
  bossPhase = 0;
  bossThrowTimer = 0;
  bossThrowCooldown = 1.6;
  bossHitFlash = 0;
  bossExplodeTimer = 0;
  bombSpawnTimer = 1.5;
  ufoLane = 1;
  ufoX = 0;
  ufoLaneTimer = 1.4;
  bazookaCooldown = 0;
  bazookaRecoil = 0;
  bossTruck.root.visible = false;
  bossTruck.truckGroup.visible = true;
  bossTruck.setTruckState(0, 0, 0, 0, 0, 0);
  bossUfo.root.visible = false;
  bossUfo.setUfoState(0, 0, 0, 0, 0);

  litterbug.root.visible = true;
  litterbugLane = 1;
  litterbugX = LANE_X[1];
  litterbugZ = -26;
  litterbugPhase = 0;
  litterbugLaneTimer = 1.5;
  litterbugThrowTimer = 0;
  litterbugThrowCooldown = 3.6;
  litterbug.root.position.set(litterbugX, 0, litterbugZ);
  litterbug.setChasing(0, 0, 0);

  player.root.position.set(playerX, 0, 0);
  player.setRunning(0, 0, 0, 0);
  crashBonk.visible = false;
  camera.position.set(0, 5.1, 8.2);

  updateHud();
}

function startGame() {
  resetGame();
  gameState = 'intro';
  litterbugZ = -11.5;
  litterbug.root.position.set(0, 0, litterbugZ);
  litterbug.setIntroLitter(0, 0);
  camera.position.set(0, 3.8, 5.8);

  startScreenEl.classList.add('hidden');
  pauseScreenEl.classList.add('hidden');
  gameoverScreenEl.classList.add('hidden');
  hudEl.classList.remove('hidden');
  storyBannerEl.textContent = '🚯 Dia buang sampah sembarangan!';
  storyBannerEl.classList.remove('hidden');
  audio.playStart();
  audio.startBgm('normal');
}

function pauseGame() {
  if (gameState !== 'playing') return;
  gameState = 'paused';
  audio.stopBgm();
  audio.playButton();
  pauseBinsEl.textContent = String(binsCount);
  pauseCoinsEl.textContent = String(coinsCount);
  pauseScreenEl.classList.remove('hidden');
}

function resumeGame() {
  if (gameState !== 'paused') return;
  gameState = 'playing';
  audio.playButton();
  audio.startBgm(bossState === 'none' ? 'normal' : 'boss');
  pauseScreenEl.classList.add('hidden');
}

function showMenu() {
  gameState = 'menu';
  audio.stopBgm();
  audio.playButton();
  resetGame();
  renderLeaderboard();
  hudEl.classList.add('hidden');
  pauseScreenEl.classList.add('hidden');
  gameoverScreenEl.classList.add('hidden');
  startScreenEl.classList.remove('hidden');
}

function triggerCrash() {
  if (gameState !== 'playing') return;
  gameState = 'crashing';
  crashTimer = 0;
  audio.stopBgm();
  introGuideEl.classList.add('hidden');
  storyBannerEl.classList.add('hidden');
  bossHudEl.classList.add('hidden');
  bazookaUiEl.classList.add('hidden');
  player.setSquished();
  crashBonk.visible = true;
  crashBonk.position.set(playerX, 4.4, 0.1);
  audio.playCrash();
}

function finishGameOver() {
  gameState = 'gameover';
  hudEl.classList.add('hidden');
  finalBinsEl.textContent = String(binsCount);
  finalCoinsEl.textContent = String(coinsCount);
  finalDistanceEl.textContent = String(Math.floor(distance));
  if (binsCount >= 150 || stickerWon) {
    stickerPrizeBoxEl.classList.remove('hidden');
  } else {
    stickerPrizeBoxEl.classList.add('hidden');
  }
  ecoFactEl.textContent = `♻️ ${ECO_FACTS[Math.floor(Math.random() * ECO_FACTS.length)]}`;

  saveScoreRowEl.classList.remove('hidden');
  savedMsgEl.classList.add('hidden');
  saveScoreBtn.disabled = false;

  gameoverScreenEl.classList.remove('hidden');
}

// Kontrol Gerakan
function moveLane(dir) {
  if (gameState !== 'playing') return;
  const target = Math.max(0, Math.min(2, currentLane + dir));
  if (target !== currentLane) {
    currentLane = target;
    audio.playSwipe();
  }
}

function triggerJump() {
  if (gameState !== 'playing') return;
  if (playerY <= 0.05) {
    jumpVel = 11.8;
    audio.playJump();
  }
}

// Keyboard Controls (untuk laptop/PC pameran)
window.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
    moveLane(-1);
  } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
    moveLane(1);
  } else if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W' || e.key === ' ') {
    if (gameState === 'playing') triggerJump();
  } else if (e.key === 'f' || e.key === 'F' || e.key === 'Enter' || e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
    if (gameState === 'playing') fireBazooka();
  } else if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
    if (gameState === 'playing') pauseGame();
    else if (gameState === 'paused') resumeGame();
  }
});

// Touch Swipe Controls (Mobile Android / iOS)
let touchStartX = 0;
let touchStartY = 0;
let swipeConsumed = false;

canvas.addEventListener('touchstart', (e) => {
  if (e.touches.length === 0) return;
  touchStartX = e.touches[0].clientX;
  touchStartY = e.touches[0].clientY;
  swipeConsumed = false;
}, { passive: true });

canvas.addEventListener('touchmove', (e) => {
  if (swipeConsumed || e.touches.length === 0 || gameState !== 'playing') return;
  const dx = e.touches[0].clientX - touchStartX;
  const dy = e.touches[0].clientY - touchStartY;

  if (Math.abs(dx) > 26 && Math.abs(dx) > Math.abs(dy)) {
    moveLane(dx > 0 ? 1 : -1);
    swipeConsumed = true;
  } else if (dy < -30 && Math.abs(dy) > Math.abs(dx)) {
    triggerJump();
    swipeConsumed = true;
  }
}, { passive: true });

// Mouse Swipe Support untuk uji coba drag di desktop
let mouseDown = false;
let mouseStartX = 0;
let mouseStartY = 0;
let mouseConsumed = false;

canvas.addEventListener('mousedown', (e) => {
  mouseDown = true;
  mouseStartX = e.clientX;
  mouseStartY = e.clientY;
  mouseConsumed = false;
});

window.addEventListener('mousemove', (e) => {
  if (!mouseDown || mouseConsumed || gameState !== 'playing') return;
  const dx = e.clientX - mouseStartX;
  const dy = e.clientY - mouseStartY;
  if (Math.abs(dx) > 28 && Math.abs(dx) > Math.abs(dy)) {
    moveLane(dx > 0 ? 1 : -1);
    mouseConsumed = true;
  } else if (dy < -32 && Math.abs(dy) > Math.abs(dx)) {
    triggerJump();
    mouseConsumed = true;
  }
});

window.addEventListener('mouseup', () => {
  mouseDown = false;
});

function isFullscreenActive() {
  return Boolean(document.fullscreenElement || document.webkitFullscreenElement);
}

function syncFullscreenUi() {
  const active = isFullscreenActive();
  fsIconExpandEl.classList.toggle('hidden', active);
  fsIconShrinkEl.classList.toggle('hidden', !active);
  startFullscreenBtn.textContent = active
    ? 'Keluar Layar Penuh'
    : '⛶ Mode Layar Penuh (Fullscreen)';
  pauseFullscreenBtn.textContent = active
    ? 'Keluar Layar Penuh'
    : '⛶ Mode Layar Penuh';
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function toggleFullscreen() {
  audio.playButton();
  if (!isFullscreenActive()) {
    const req =
      gameShellEl.requestFullscreen ||
      gameShellEl.webkitRequestFullscreen ||
      document.documentElement.requestFullscreen;
    if (req) {
      req.call(gameShellEl.requestFullscreen ? gameShellEl : document.documentElement).catch(() => {});
    }
  } else {
    const exit = document.exitFullscreen || document.webkitExitFullscreen;
    if (exit) {
      exit.call(document).catch(() => {});
    }
  }
}

document.addEventListener('fullscreenchange', syncFullscreenUi);
document.addEventListener('webkitfullscreenchange', syncFullscreenUi);

// Button Listeners
startBtn.addEventListener('click', startGame);
startFullscreenBtn.addEventListener('click', toggleFullscreen);
cornerFullscreenBtn.addEventListener('click', toggleFullscreen);
pauseFullscreenBtn.addEventListener('click', toggleFullscreen);
pauseBtn.addEventListener('click', pauseGame);
resumeBtn.addEventListener('click', resumeGame);
restartFromPauseBtn.addEventListener('click', startGame);
homeFromPauseBtn.addEventListener('click', showMenu);
retryBtn.addEventListener('click', startGame);
menuBtn.addEventListener('click', showMenu);
fireBazookaBtn.addEventListener('click', fireBazooka);

soundBtn.addEventListener('click', () => {
  const next = !audio.enabled;
  audio.setEnabled(next);
  soundBtn.textContent = next ? '🔊' : '🔇';
});

saveScoreBtn.addEventListener('click', () => {
  saveLeaderboardEntry(playerNameInput.value, coinsCount, binsCount);
  saveScoreRowEl.classList.add('hidden');
  savedMsgEl.classList.remove('hidden');
});

// Resize Handler
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Main Loop
let lastTime = performance.now();

function animate(now) {
  requestAnimationFrame(animate);
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;

  // Awan selalu mengambang pelan
  clouds.children.forEach((c) => {
    c.position.x += c.userData.speed * dt;
    if (c.position.x > 30) c.position.x = -30;
  });

  if (gameState === 'menu') {
    // Preview animasi kejar-kejaran santai di layar utama
    runPhase += dt * 9;
    litterbugPhase += dt * 10;
    player.setRunning(runPhase, 0, 0, 0);
    litterbug.root.position.set(0, 0, -18);
    litterbug.setChasing(litterbugPhase, 0, 0);
    trackChunks.forEach((chunk) => {
      chunk.position.z += 7 * dt;
      if (chunk.position.z > CHUNK_LEN) {
        chunk.position.z -= CHUNK_LEN * CHUNK_COUNT;
      }
    });
    renderer.render(scene, camera);
    return;
  }

  if (gameState === 'intro') {
    introTimer += dt;

    // 0.45s: Si pembuang sampah melempar sampah kresek sembarangan ke tengah jalan!
    if (!introLitterSpawned && introTimer >= 0.45) {
      introLitterSpawned = true;
      audio.playThrow();
      const bagObj = createPlasticBag(1);
      bagObj.group.position.set(0, 0, -11.2);
      bagObj.meshGroup.position.y = 1.4;
      entitiesGroup.add(bagObj.group);
      introBagEntry = {
        lane: 1,
        laneX: LANE_X[1],
        ...bagObj,
        binRef: null,
        state: 'idle',
        flyTime: 0,
        startPos: new THREE.Vector3()
      };
      bags.push(introBagEntry);
    }

    // Animasi jatuh memantulnya kresek ke jalan (0.45s -> 0.95s)
    if (introBagEntry && introTimer < 1.05) {
      const dropP = Math.min(1, (introTimer - 0.45) / 0.5);
      introBagEntry.group.position.z = THREE.MathUtils.lerp(-11.2, -9.8, dropP);
      introBagEntry.meshGroup.position.y =
        1.4 * (1 - dropP) + 0.48 * dropP + Math.sin(dropP * Math.PI) * 0.9;
    }

    // 1.0s: Kaget ketahuan -> 1.55s: Lari kabur ke depan!
    if (introTimer >= 1.0 && introTimer < 1.55) {
      storyBannerEl.textContent = '🏃 Ayo kejar & masukkan sampahnya ke tong!';
    }

    let scrollStep = 0;
    if (introTimer >= 1.55) {
      const chaseP = Math.min(1, (introTimer - 1.55) / 1.1);
      litterbugZ = THREE.MathUtils.lerp(-11.5, -26, chaseP);
      litterbugPhase += dt * 15;
      runPhase += dt * 13;
      scrollStep = 6.5 * chaseP * dt;

      // Kamera & lintasan mulai mengejar
      camera.position.y = THREE.MathUtils.lerp(3.8, 5.1, chaseP);
      camera.position.z = THREE.MathUtils.lerp(5.8, 8.2, chaseP);

      player.setRunning(runPhase, 0, 0, 0);
      trackChunks.forEach((chunk) => {
        chunk.position.z += scrollStep;
        if (chunk.position.z > CHUNK_LEN) chunk.position.z -= CHUNK_LEN * CHUNK_COUNT;
      });
      if (introBagEntry) {
        introBagEntry.group.position.z += scrollStep;
      }
    } else {
      player.setRunning(0, 0, 0, 0);
    }

    litterbug.root.position.set(0, 0, litterbugZ);
    litterbug.setIntroLitter(introTimer, litterbugPhase);

    if (introTimer >= 2.65) {
      // Pasangkan kresek yang tadi dibuang dengan Tong Sampah Kotak Plasvora di pinggir kanan!
      const bagZ = introBagEntry ? introBagEntry.group.position.z : -7.5;
      const binObj = createTrashBin(0);
      binObj.group.position.set(SIDE_BIN_X, 0, bagZ - 9.5);
      binObj.binGroup.rotation.y = -0.52;
      entitiesGroup.add(binObj.group);
      const binEntry = {
        side: 1,
        x: SIDE_BIN_X,
        ...binObj,
        scored: false,
        incomingBag: false,
        celebrateTime: 0
      };
      bins.push(binEntry);
      if (introBagEntry) {
        introBagEntry.binRef = binEntry;
      }

      waveCount = 1;
      spawnAccumulator = 0;
      nextWaveGap = 24;
      camera.position.set(0, 5.1, 8.2);
      storyBannerEl.classList.add('hidden');
      gameState = 'playing';

      introGuideEl.classList.remove('hidden');
      introGuideTimer = setTimeout(() => {
        introGuideEl.classList.add('hidden');
      }, 3600);
    }

    renderer.render(scene, camera);
    return;
  }

  if (gameState === 'crashing') {
    crashTimer += dt;
    // Animasi bonk jatuh & goyang kamera
    const dropY = Math.max(0.16, 4.4 - crashTimer * 19);
    crashBonk.position.y = dropY;
    crashBonk.rotation.z = Math.sin(crashTimer * 35) * 0.08;

    const shake = Math.max(0, 1 - crashTimer * 2.2) * 0.24;
    camera.position.x = (Math.random() - 0.5) * shake;
    camera.position.y = 5.1 + (Math.random() - 0.5) * shake;

    if (crashTimer >= 0.95) {
      camera.position.set(0, 5.1, 8.2);
      finishGameOver();
    }
    renderer.render(scene, camera);
    return;
  }

  if (gameState !== 'playing') {
    renderer.render(scene, camera);
    return;
  }

  // Update Kecepatan & Jarak
  speed = Math.min(28, speed + dt * 0.28);
  const stepZ = speed * dt;
  distance += stepZ * 0.65;
  distCountEl.textContent = `${Math.floor(distance)}m`;
  curveUniforms.uCurveX.value = Math.sin(distance * 0.015) * 0.00055;

  // Hadiah Stiker saat jumlah sampah masuk ke tong mencapai 150 sampah!
  if (!stickerWon && binsCount >= 150) {
    stickerWon = true;
    audio.playVictory();
    spawnConfetti(playerX, 1.8, -2);
    stickerRewardToastEl.classList.remove('hidden');
    clearTimeout(stickerToastTimer);
    stickerToastTimer = setTimeout(() => {
      stickerRewardToastEl.classList.add('hidden');
    }, 5200);
  }

  // Gerakkan Track Chunks
  trackChunks.forEach((chunk) => {
    chunk.position.z += stepZ;
    if (chunk.position.z > CHUNK_LEN) {
      chunk.position.z -= CHUNK_LEN * CHUNK_COUNT;
    }
  });

  // Gerakan Horizontal Pemain & Miring
  const targetX = LANE_X[currentLane];
  const diffX = targetX - playerX;
  playerX += diffX * Math.min(1, dt * 15);
  const tiltX = THREE.MathUtils.clamp(-diffX * 0.18, -0.35, 0.35);

  // Fisika Lompat
  if (playerY > 0 || jumpVel > 0) {
    playerY += jumpVel * dt;
    jumpVel -= 32 * dt;
    if (playerY <= 0) {
      playerY = 0;
      jumpVel = 0;
    }
  }

  if (kickTimer > 0) {
    kickTimer = Math.max(0, kickTimer - dt * 2.4);
  }
  if (bazookaCooldown > 0) {
    bazookaCooldown = Math.max(0, bazookaCooldown - dt);
  }
  if (bazookaRecoil > 0) {
    bazookaRecoil = Math.max(0, bazookaRecoil - dt * 4.5);
  }

  const holdingBazooka = bossType === 'ufo' && (bossState === 'entering' || bossState === 'active');
  const bazookaPitch = 0.2 + Math.sin(bazookaRecoil * Math.PI) * 0.25;

  runPhase += dt * (speed * 0.85);
  player.root.position.x = playerX;
  player.setRunning(runPhase, tiltX, playerY, kickTimer, holdingBazooka, bazookaPitch);

  // Efek suara langkah kaki berirama saat berlari di tanah
  if (playerY <= 0.05) {
    footstepTimer -= dt * (speed / 14.5);
    if (footstepTimer <= 0) {
      footstepTimer = 0.24;
      audio.playFootstep();
    }
  }

  // Pemicu Boss setiap kelipatan jarak 500m (Truk Sampah), dan setiap kelipatan 1000m = Boss UFO + Bazooka!
  if (bossState === 'none' && distance >= nextBossDistance) {
    bossState = 'entering';
    audio.setBgmMode('boss');
    bossType = nextBossDistance % 1000 === 0 ? 'ufo' : 'truck';
    bossHp = 3;
    bossRiderX = 0;
    bossTargetRiderX = 0;
    bossZ = -90;
    bossHitFlash = 0;
    bossThrowTimer = 0;
    bossThrowCooldown = 1.4;
    bombSpawnTimer = 1.4;
    ufoLane = 1;
    ufoX = 0;
    ufoLaneTimer = 1.4;

    // Bersihkan sisa bom jika ada
    bombs.forEach((b) => entitiesGroup.remove(b.group));
    bombs = [];

    if (bossType === 'ufo') {
      bossTruck.root.visible = false;
      bossUfo.root.visible = true;
      bossUfo.ufoGroup.visible = true;
      bossUfo.root.position.set(0, 0, bossZ);
      bazookaUiEl.classList.remove('hidden');
      storyBannerEl.textContent = '🛸 BOSS UFO MUNCUL! Arahkan Bazooka ke Jalur UFO & Tembak!';
    } else {
      bossUfo.root.visible = false;
      bossTruck.root.visible = true;
      bossTruck.truckGroup.visible = true;
      bossTruck.root.position.set(0, 0, bossZ);
      bazookaUiEl.classList.add('hidden');
      storyBannerEl.textContent = '⚠️ BOSS TRUK SAMPAH! Lempar 3 Bom untuk Meledakkannya!';
    }

    updateBossHud();
    bossHudEl.classList.remove('hidden');
    storyBannerEl.classList.remove('hidden');
    clearTimeout(bossBannerTimer);
    bossBannerTimer = setTimeout(() => {
      storyBannerEl.classList.add('hidden');
    }, 3400);
    audio.playBossEnter();
  }

  // Update Si Pembuang Sampah (jika tidak sedang fase Boss) atau Update Boss Truk Sampah Raksasa
  if (bossState === 'none') {
    litterbug.root.visible = true;
    const targetBugZ = -26 + Math.sin(now * 0.002) * 1.4;
    litterbugZ += (targetBugZ - litterbugZ) * Math.min(1, dt * 2.5);
    litterbugLaneTimer -= dt;
    if (litterbugLaneTimer <= 0) {
      litterbugLaneTimer = 1.4 + Math.random() * 1.3;
      litterbugLane = Math.floor(Math.random() * 3);
    }
    const bugDiffX = LANE_X[litterbugLane] - litterbugX;
    litterbugX += bugDiffX * Math.min(1, dt * 7);
    const bugTiltX = THREE.MathUtils.clamp(-bugDiffX * 0.16, -0.32, 0.32);
    litterbugPhase += dt * (speed * 0.9);
    if (litterbugThrowTimer > 0) {
      litterbugThrowTimer = Math.max(0, litterbugThrowTimer - dt * 2.2);
    }
    litterbug.root.position.set(litterbugX, 0, litterbugZ);
    litterbug.setChasing(litterbugPhase, bugTiltX, litterbugThrowTimer);

    // Lempar rintangan sampah plastik ke lintasan (tetap sisakan minimal 1 jalur aman!)
    litterbugThrowCooldown -= dt;
    if (waveCount >= 1 && litterbugThrowCooldown <= 0) {
      const blockedLanes = new Set();
      obstacles.forEach((o) => {
        const oz = o.thrown ? o.landZ : o.group.position.z;
        if (oz > -44 && oz < -5) blockedLanes.add(o.lane);
      });
      bags.forEach((bg) => {
        if (bg.group.position.z > -44 && bg.group.position.z < -5) blockedLanes.add(bg.lane);
      });

      const freeLanes = [0, 1, 2].filter((l) => !blockedLanes.has(l));
      if (freeLanes.length >= 2) {
        const throwLane = freeLanes.includes(currentLane) && Math.random() < 0.6
          ? currentLane
          : freeLanes[Math.floor(Math.random() * freeLanes.length)];

        const obstacleTypes = ['bottle', 'bag_pile', 'jug_pile'];
        const t = obstacleTypes[Math.floor(Math.random() * obstacleTypes.length)];
        const obs = createPlasticObstacle(t);
        const startZ = litterbugZ + 0.5;
        const landZ = litterbugZ + 5.5;
        obs.group.position.set(litterbugX, 0, startZ);
        obs.visual.position.y = 1.5;
        entitiesGroup.add(obs.group);
        obstacles.push({
          lane: throwLane,
          laneX: LANE_X[throwLane],
          type: t,
          ...obs,
          thrown: true,
          throwProgress: 0,
          startX: litterbugX,
          startZ,
          landZ
        });

        litterbugLane = throwLane;
        litterbugThrowTimer = 1.0;
        litterbugThrowCooldown = Math.max(2.3, 3.8 - (speed - 14.5) * 0.08);
        audio.playThrow();
      } else {
        litterbugThrowCooldown = 0.6;
      }
    }

    // Spawn Gelombang Normal (Kresek -> Tong Sampah & Rintangan)
    spawnAccumulator += stepZ;
    if (spawnAccumulator >= nextWaveGap) {
      spawnAccumulator = 0;
      spawnWave();
    }
  } else if (bossState === 'entering') {
    litterbug.root.visible = false;
    const targetZ = bossType === 'ufo' ? -25 : -29;
    bossZ += (targetZ - bossZ) * Math.min(1, dt * 3.0);
    bossPhase += dt * speed;
    if (bossType === 'ufo') {
      bossUfo.root.position.set(0, 0, bossZ);
      bossUfo.setUfoState(bossPhase, 0, 0, 0, 0);
    } else {
      bossTruck.root.position.set(0, 0, bossZ);
      bossTruck.setTruckState(bossPhase, 0, 0, 0, 0, 0);
    }
    if (Math.abs(bossZ - targetZ) < 0.9) {
      bossZ = targetZ;
      bossState = 'active';
    }
  } else if (bossState === 'active' && bossType === 'ufo') {
    // FASE BOSS UFO (kelipatan 100m): UFO melayang pindah jalur & menjatuhkan sampah, pemain memegang Bazooka!
    bossPhase += dt * speed;
    ufoLaneTimer -= dt;
    if (ufoLaneTimer <= 0) {
      ufoLaneTimer = 1.45 + Math.random() * 1.1;
      ufoLane = Math.floor(Math.random() * 3);
    }
    const ufoDiffX = LANE_X[ufoLane] - ufoX;
    ufoX += ufoDiffX * Math.min(1, dt * 4.8);
    const ufoTiltX = THREE.MathUtils.clamp(-ufoDiffX * 0.14, -0.28, 0.28);

    if (bossThrowTimer > 0) {
      bossThrowTimer = Math.max(0, bossThrowTimer - dt * 2.4);
    }
    if (bossHitFlash > 0) {
      bossHitFlash = Math.max(0, bossHitFlash - dt);
    }

    bossUfo.root.position.set(ufoX, 0, bossZ);
    bossUfo.setUfoState(bossPhase, ufoTiltX, bossHitFlash, bossThrowTimer, 0);

    // Update indikator bidik Bazooka apakah sejajar dengan jalur UFO
    const isAligned = Math.abs(playerX - ufoX) < 1.1;
    if (isAligned) {
      bazookaLockEl.textContent = '🎯 TERKUNCI! Tembak Bazooka Sekarang!';
      bazookaLockEl.classList.add('locked');
    } else {
      bazookaLockEl.textContent = '🎯 Geser Arahkan Bazooka ke Jalur UFO!';
      bazookaLockEl.classList.remove('locked');
    }

    // UFO menjatuhkan rintangan sampah dari atas (selalu menyisakan minimal 1 jalur aman!)
    bossThrowCooldown -= dt;
    if (bossThrowCooldown <= 0) {
      const blockedLanes = new Set();
      obstacles.forEach((o) => {
        const oz = o.thrown ? o.landZ : o.group.position.z;
        if (oz > -44 && oz < -5) blockedLanes.add(o.lane);
      });

      const freeLanes = [0, 1, 2].filter((l) => !blockedLanes.has(l));
      if (freeLanes.length >= 2) {
        // Utamakan menjatuhkan sampah tepat di bawah UFO jika jalurnya belum penuh
        const dropLane = freeLanes.includes(ufoLane)
          ? ufoLane
          : freeLanes[Math.floor(Math.random() * freeLanes.length)];

        const obstacleTypes = ['bottle', 'bag_pile', 'jug_pile'];
        const t = obstacleTypes[Math.floor(Math.random() * obstacleTypes.length)];
        const obs = createPlasticObstacle(t);
        const startZ = bossZ;
        const landZ = bossZ + 1.5;
        obs.group.position.set(ufoX, 0, startZ);
        obs.visual.position.y = 4.2;
        entitiesGroup.add(obs.group);
        obstacles.push({
          lane: dropLane,
          laneX: LANE_X[dropLane],
          type: t,
          ...obs,
          thrown: true,
          throwProgress: 0,
          startX: ufoX,
          startZ,
          landZ
        });

        // Kadang-kadang jatuhkan 1 rintangan tambahan di jalur lain (tetap sisakan 1 jalur aman!)
        const remainingFree = freeLanes.filter((l) => l !== dropLane);
        if (remainingFree.length >= 2 && Math.random() < 0.45) {
          const extraLane = remainingFree[Math.floor(Math.random() * remainingFree.length)];
          const t2 = obstacleTypes[Math.floor(Math.random() * obstacleTypes.length)];
          const obs2 = createPlasticObstacle(t2);
          obs2.group.position.set(LANE_X[extraLane], 0, startZ - 1.5);
          obs2.visual.position.y = 4.5;
          entitiesGroup.add(obs2.group);
          obstacles.push({
            lane: extraLane,
            laneX: LANE_X[extraLane],
            type: t2,
            ...obs2,
            thrown: true,
            throwProgress: 0,
            startX: LANE_X[extraLane],
            startZ: startZ - 1.5,
            landZ: landZ - 1.5
          });
        }

        bossThrowTimer = 1.0;
        bossThrowCooldown = 1.15 + Math.random() * 0.65;
        audio.playThrow();
      } else {
        bossThrowCooldown = 0.4;
      }
    }
  } else if (bossState === 'active') {
    bossPhase += dt * speed;
    const swayX = Math.sin(now * 0.0022) * 0.28;
    bossRiderX += (bossTargetRiderX - bossRiderX) * Math.min(1, dt * 6);

    if (bossThrowTimer > 0) {
      bossThrowTimer = Math.max(0, bossThrowTimer - dt * 2.4);
    }
    if (bossHitFlash > 0) {
      bossHitFlash = Math.max(0, bossHitFlash - dt);
    }
    bossTruck.root.position.set(0, 0, bossZ);
    bossTruck.setTruckState(bossPhase, swayX, bossHitFlash, bossThrowTimer, 0, bossRiderX);

    // Boss melempar jebakan sampah secara RANDOM (1 atau 2 jalur acak, selalu sisakan minimal 1 jalur aman!)
    bossThrowCooldown -= dt;
    if (bossThrowCooldown <= 0) {
      const blockedLanes = new Set();
      obstacles.forEach((o) => {
        const oz = o.thrown ? o.landZ : o.group.position.z;
        if (oz > -44 && oz < -5) blockedLanes.add(o.lane);
      });
      bombs.forEach((bm) => {
        if (bm.state === 'idle' && bm.group.position.z > -44 && bm.group.position.z < -5) {
          blockedLanes.add(bm.lane);
        }
      });

      const freeLanes = [0, 1, 2].filter((l) => !blockedLanes.has(l)).sort(() => Math.random() - 0.5);
      if (freeLanes.length >= 2) {
        // Lempar 1 atau 2 jebakan secara acak (selalu sisakan minimal 1 jalur aman)
        const trapCount = freeLanes.length === 3 && Math.random() < 0.45 ? 2 : 1;
        const obstacleTypes = ['bottle', 'bag_pile', 'jug_pile'];

        for (let k = 0; k < trapCount; k++) {
          const throwLane = freeLanes[k];
          const t = obstacleTypes[Math.floor(Math.random() * obstacleTypes.length)];
          const obs = createPlasticObstacle(t);
          const startZ = bossZ + 1.2;
          const landZ = bossZ + 2.5 + Math.random() * 2.2;
          const originX = k === 0 ? bossRiderX : LANE_X[throwLane];
          obs.group.position.set(originX, 0, startZ);
          obs.visual.position.y = 2.0;
          entitiesGroup.add(obs.group);
          obstacles.push({
            lane: throwLane,
            laneX: LANE_X[throwLane],
            type: t,
            ...obs,
            thrown: true,
            throwProgress: 0,
            startX: originX,
            startZ,
            landZ
          });
        }

        bossTargetRiderX = LANE_X[freeLanes[0]];
        bossThrowTimer = 1.0;
        bossThrowCooldown = 1.35 + Math.random() * 0.75;
        audio.playThrow();
      } else {
        bossThrowCooldown = 0.45;
      }
    }

    if (Math.floor(distance / 1000) > Math.floor((distance - stepZ * 0.65) / 1000)) {
      bossTruck.root.visible = false;
      bombs.forEach((b) => entitiesGroup.remove(b.group));
      bombs = [];
      bossState = 'none';
      nextBossDistance = Math.floor(distance / 1000) * 1000;
    }

    // Spawn Bom di jalur acak yang aman untuk ditendang ke Truk Boss!
    bombSpawnTimer -= dt;
    if (bombSpawnTimer <= 0) {
      const busyFarLanes = new Set();
      obstacles.forEach((o) => {
        const oz = o.thrown ? o.landZ : o.group.position.z;
        if (oz < -65) busyFarLanes.add(o.lane);
      });
      const safeBombLanes = [0, 1, 2].filter((l) => !busyFarLanes.has(l));
      const bLane = safeBombLanes.length
        ? safeBombLanes[Math.floor(Math.random() * safeBombLanes.length)]
        : Math.floor(Math.random() * 3);

      const bombObj = createBombItem();
      bombObj.group.position.set(LANE_X[bLane], 0, -84);
      entitiesGroup.add(bombObj.group);
      bombs.push({
        lane: bLane,
        laneX: LANE_X[bLane],
        ...bombObj,
        state: 'idle',
        flyTime: 0,
        startPos: new THREE.Vector3()
      });
      bombSpawnTimer = 2.2 + Math.random() * 0.6;
    }
  } else if (bossState === 'exploding') {
    bossExplodeTimer += dt;
    const ep = Math.min(1, bossExplodeTimer / 1.15);
    if (bossType === 'ufo') {
      bossUfo.setUfoState(bossPhase, 0, 0, 0, ep);
    } else {
      bossTruck.setTruckState(bossPhase, 0, 0, 0, ep, bossRiderX);
    }
    camera.position.x = (Math.random() - 0.5) * (1 - ep) * 0.35;
    camera.position.y = 5.1 + (Math.random() - 0.5) * (1 - ep) * 0.35;

    if (ep >= 1) {
      camera.position.set(0, 5.1, 8.2);
      bossTruck.root.visible = false;
      bossTruck.truckGroup.scale.setScalar(1);
      bossTruck.truckGroup.rotation.set(0, 0, 0);
      bossTruck.truckGroup.position.set(0, 0, 0);
      bossUfo.root.visible = false;
      bossUfo.ufoGroup.scale.setScalar(1);
      bossUfo.ufoGroup.rotation.set(0, 0, 0);
      bossHudEl.classList.add('hidden');
      bazookaUiEl.classList.add('hidden');
      bossState = 'none';
      audio.setBgmMode('normal');
      audio.playVictory();
      // Jadwalkan Boss berikutnya (kelipatan 200m untuk Truk Sampah, kelipatan 500m untuk Boss UFO)
      nextBossDistance = computeNextBossDistance(distance);
      litterbugZ = -32;
      litterbug.root.visible = true;
      spawnAccumulator = 0;
    }
  }

  // Update Roket Bazooka yang ditembakkan pemain ke arah Boss UFO
  for (let i = rockets.length - 1; i >= 0; i--) {
    const rk = rockets[i];
    rk.flyTime += dt * 3.1;
    const t = Math.min(1, rk.flyTime);
    const targetZ = bossUfo.root.position.z;

    // Roket meluncur lurus sesuai jalur tempat pemain mengarahkan Bazooka saat menembak!
    const curX = THREE.MathUtils.lerp(rk.startX, rk.aimX, t);
    const curZ = THREE.MathUtils.lerp(rk.startZ, targetZ, t);
    const curY = THREE.MathUtils.lerp(rk.startY, 4.35, t) + Math.sin(t * Math.PI) * 0.65;

    rk.group.position.set(curX, curY, curZ);
    rk.flame.scale.setScalar(0.85 + Math.sin(now * 0.05 + i) * 0.3);

    if (t >= 1) {
      entitiesGroup.remove(rk.group);
      rockets.splice(i, 1);

      if (bossState === 'active' && bossType === 'ufo') {
        // Cek apakah arah tembakan bazooka mengenai UFO!
        if (Math.abs(curX - ufoX) < 1.55) {
          bossHp -= 1;
          updateBossHud();
          audio.playExplosion();
          spawnBombExplosion(ufoX, 4.35, targetZ, bossHp <= 0 ? 42 : 22);

          if (bossHp > 0) {
            bossHitFlash = 0.55;
            showToast(`🚀 KENA UFO! Sisa ${bossHp} Tembakan lagi!`);
          } else {
            bossState = 'exploding';
            bossExplodeTimer = 0;
            bazookaUiEl.classList.add('hidden');
            coinsCount += 35;
            updateHud();
            showToast('💥 BOSS UFO HANCUR! (+35 Poin)');
            spawnConfetti(ufoX, 4.35, targetZ);
            rockets.forEach((leftover) => entitiesGroup.remove(leftover.group));
            rockets = [];
            break;
          }
        } else {
          spawnKickBurst(curX, 4.2, targetZ, 0);
          showToast('💨 MELESET! Arahkan ke Jalur UFO!');
        }
      }
    }
  }

  // Update Bom (muncul saat Boss Truk Sampah aktif -> lempar ke Boss!)
  for (let i = bombs.length - 1; i >= 0; i--) {
    const bm = bombs[i];

    if (bm.state === 'idle') {
      // Jika truk Boss sudah tidak aktif / sudah hancur, hapus bom sisa di lintasan
      if (bossState !== 'active') {
        entitiesGroup.remove(bm.group);
        bombs.splice(i, 1);
        continue;
      }

      bm.group.position.z += stepZ;
      bm.meshGroup.rotation.y += dt * 3;
      bm.meshGroup.position.y = 0.65 + Math.sin(now * 0.008 + i) * 0.1;
      bm.flame.scale.setScalar(0.85 + Math.sin(now * 0.03 + i) * 0.28);
      bm.ring.scale.setScalar(0.92 + Math.sin(now * 0.01) * 0.12);

      if (
        Math.abs(bm.group.position.z) < 1.35 &&
        Math.abs(playerX - bm.laneX) < 1.15 &&
        playerY < 1.4
      ) {
        bm.state = 'flying';
        bm.flyTime = 0;
        bm.startPos.copy(bm.group.position);
        bm.ring.visible = false;
        kickTimer = 1.0;
        spawnKickBurst(bm.group.position.x, 0.6, bm.group.position.z - 0.2, 0);
        audio.playKick();
      } else if (bm.group.position.z > DESPAWN_Z) {
        entitiesGroup.remove(bm.group);
        bombs.splice(i, 1);
      }
    } else if (bm.state === 'flying') {
      bm.flyTime += dt * 2.7;
      const t = Math.min(1, bm.flyTime);
      const targetX = bossTruck.root.position.x;
      const targetZ = bossTruck.root.position.z;

      bm.group.position.x = THREE.MathUtils.lerp(bm.startPos.x, targetX, t);
      bm.group.position.z = THREE.MathUtils.lerp(bm.startPos.z, targetZ, t);
      bm.meshGroup.position.y = 0.65 + Math.sin(t * Math.PI) * 3.4 + t * 1.1;
      bm.meshGroup.rotation.x += dt * 16;

      if (t >= 1) {
        entitiesGroup.remove(bm.group);
        bombs.splice(i, 1);

        if (bossState === 'active') {
          bossHp -= 1;
          updateBossHud();
          audio.playExplosion();
          spawnBombExplosion(targetX, 1.8, targetZ, bossHp <= 0 ? 40 : 20);

          if (bossHp > 0) {
            bossHitFlash = 0.55;
            showToast(`💣 KENA! Sisa ${bossHp} Bom lagi!`);
          } else {
            bossState = 'exploding';
            bossExplodeTimer = 0;
            coinsCount += 25;
            updateHud();
            showToast('💥 TRUK BOSS MELEDAK! (+25 Poin)');
            spawnConfetti(targetX, 2.2, targetZ);

            // Hapus semua sisa bom agar tidak ada bom lagi setelah mobil Boss hancur
            bombs.forEach((leftover) => entitiesGroup.remove(leftover.group));
            bombs = [];
            break;
          }
        }
      }
    }
  }

  // Update Sampah Kresek (Bola -> Tendang ke Tong Sampah)
  for (let i = bags.length - 1; i >= 0; i--) {
    const bag = bags[i];

    if (bag.state === 'idle') {
      bag.group.position.z += stepZ;
      bag.meshGroup.rotation.y += dt * 2.5;
      bag.meshGroup.position.y = 0.48 + Math.sin(now * 0.006 + i) * 0.08;

      // Cek tabrakan pemain dengan sampah kresek
      if (
        Math.abs(bag.group.position.z) < 1.35 &&
        Math.abs(playerX - bag.laneX) < 1.12 &&
        playerY < 1.35
      ) {
        bag.state = 'flying';
        bag.flyTime = 0;
        bag.startPos.copy(bag.group.position);
        bag.binRef.incomingBag = true;
        kickTimer = 1.0;
        spawnKickBurst(bag.group.position.x, 0.55, bag.group.position.z - 0.2, bag.binRef.side);
        audio.playKick();
      } else if (bag.group.position.z > DESPAWN_Z) {
        entitiesGroup.remove(bag.group);
        bags.splice(i, 1);
      }
    } else if (bag.state === 'flying') {
      bag.flyTime += dt * (2.6 + speed * 0.08);
      const t = Math.min(1, bag.flyTime);
      const targetPos = bag.binRef.group.position;

      bag.group.position.x = THREE.MathUtils.lerp(bag.startPos.x, targetPos.x, t);
      bag.group.position.z = THREE.MathUtils.lerp(bag.startPos.z, targetPos.z, t);
      bag.meshGroup.position.y = 0.55 + Math.sin(t * Math.PI) * 2.3 + t * 0.65;
      bag.meshGroup.rotation.x += dt * 14;
      bag.meshGroup.scale.setScalar(1 - t * 0.4);

      if (t >= 1) {
        bag.binRef.scored = true;
        bag.binRef.celebrateTime = 0.55;
        binsCount += 1;
        coinsCount += 5;
        litterbugZ = Math.min(-21, litterbugZ + 3.2); // Semakin dekat mengejar si pembuang sampah!
        updateHud();
        audio.playScore();
        showToast('+1 KRESEK MASUK TONG! (+5 Poin)');
        spawnConfetti(targetPos.x, 1.5, targetPos.z);

        entitiesGroup.remove(bag.group);
        bags.splice(i, 1);
      }
    }
  }

  // Update Tong Sampah di pinggir jalan
  for (let i = bins.length - 1; i >= 0; i--) {
    const bin = bins[i];
    bin.group.position.z += stepZ;
    bin.coin.rotation.y += dt * 3.8;

    if (bin.celebrateTime > 0) {
      bin.celebrateTime = Math.max(0, bin.celebrateTime - dt);
      const p = 1 - bin.celebrateTime / 0.55;
      // Tong memantul senang dan tutup bergerak saat sampah kresek masuk dari samping
      const pop = 1 + Math.sin(p * Math.PI) * 0.24;
      bin.binGroup.scale.set(pop, 1 / pop + 0.06, pop);
      bin.lidPivot.rotation.x = -2.3 + Math.sin(p * Math.PI * 2) * 0.35;
      bin.coin.position.y = 2.55 + p * 2.0;
      bin.coin.scale.setScalar(Math.max(0.01, 1 - p));
      if (bin.celebrateTime === 0) {
        bin.binGroup.scale.set(1, 1, 1);
      }
    }

    if (bin.group.position.z > DESPAWN_Z) {
      entitiesGroup.remove(bin.group);
      bins.splice(i, 1);
    }
  }

  // Update Rintangan Sampah Plastik (Botol, Karung Kresek, Jerigen/Gelas & Lemparan Si Pembuang Sampah)
  for (let i = obstacles.length - 1; i >= 0; i--) {
    const obs = obstacles[i];

    if (obs.thrown) {
      obs.throwProgress += dt * 2.15;
      obs.landZ += stepZ;
      const t = Math.min(1, obs.throwProgress);

      obs.group.position.x = THREE.MathUtils.lerp(obs.startX, obs.laneX, t);
      obs.group.position.z = THREE.MathUtils.lerp(obs.startZ, obs.landZ, t);
      obs.visual.position.y = Math.sin(t * Math.PI) * 3.1 + (1 - t) * 1.3;
      obs.visual.rotation.x = (1 - t) * Math.PI * 2;
      obs.warning.visible = true;
      obs.warning.position.y = obs.visual.position.y + 1.85;

      if (t >= 1) {
        obs.thrown = false;
        obs.group.position.x = obs.laneX;
        obs.group.position.z = obs.landZ;
        obs.visual.position.y = 0;
        obs.visual.rotation.x = 0;
        obs.warning.position.y = 2.05;
        audio.playTrapLand();
      }
      continue;
    }

    obs.group.position.z += stepZ;

    // Tanda seru merah (!) terlihat saat rintangan masih di depan seperti di video
    const z = obs.group.position.z;
    obs.warning.visible = z < -14 && z > -102;
    obs.warning.position.y = 2.05 + Math.sin(now * 0.012) * 0.12;

    if (Math.abs(z) < 0.78 && Math.abs(playerX - obs.laneX) < 0.88 && playerY < 1.18) {
      triggerCrash();
    }

    if (z > DESPAWN_Z) {
      entitiesGroup.remove(obs.group);
      obstacles.splice(i, 1);
    }
  }

  // Update Eco Coins di jalur aman
  for (let i = coins.length - 1; i >= 0; i--) {
    const c = coins[i];
    c.group.position.z += stepZ;
    c.group.rotation.y += dt * 4;
    c.group.position.y = 0.85 + Math.sin(now * 0.006 + i) * 0.12;

    if (
      !c.collected &&
      Math.abs(c.group.position.z) < 1.0 &&
      Math.abs(playerX - c.laneX) < 1.0 &&
      playerY < 1.6
    ) {
      c.collected = true;
      coinsCount += 1;
      updateHud();
      audio.playCoin();
      entitiesGroup.remove(c.group);
      coins.splice(i, 1);
      continue;
    }

    if (c.group.position.z > DESPAWN_Z) {
      entitiesGroup.remove(c.group);
      coins.splice(i, 1);
    }
  }

  // Update Partikel Confetti & Efek Tendangan
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life -= dt;
    const ratio = Math.max(0.01, p.life / (p.maxLife || 0.75));
    if (p.isRing) {
      p.mesh.position.addScaledVector(p.vel, dt);
      p.mesh.scale.setScalar(1 + (1 - ratio) * 1.9);
      p.mesh.material.opacity = ratio;
    } else {
      p.vel.y -= 14 * dt;
      p.mesh.position.addScaledVector(p.vel, dt);
      p.mesh.rotation.x += dt * 8;
      p.mesh.rotation.y += dt * 8;
      p.mesh.scale.setScalar(ratio);
    }
    if (p.life <= 0) {
      entitiesGroup.remove(p.mesh);
      particles.splice(i, 1);
    }
  }

  renderer.render(scene, camera);
}

renderLeaderboard();
requestAnimationFrame(animate);
