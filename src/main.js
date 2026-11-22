import * as THREE from 'three';
import { audio } from './audio.js';
import { curveUniforms } from './curvedWorld.js';
import {
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
const canvas = document.getElementById('game-canvas');
const hudEl = document.getElementById('hud');
const binCountEl = document.getElementById('bin-count');
const coinCountEl = document.getElementById('coin-count');
const comboToastEl = document.getElementById('combo-toast');
const storyBannerEl = document.getElementById('story-banner');
const introGuideEl = document.getElementById('intro-guide');

const startScreenEl = document.getElementById('start-screen');
const pauseScreenEl = document.getElementById('pause-screen');
const gameoverScreenEl = document.getElementById('gameover-screen');

const startBtn = document.getElementById('start-btn');
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

let obstacles = []; // { type, lane, group, visual, warning, hit }
let bins = [];      // { lane, group, binGroup, lidPivot, coin, scored, celebrateTime }
let bags = [];      // { lane, group, meshGroup, binRef, state, flyTime, startPos }
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
}

function clearEntities() {
  [...obstacles, ...bins, ...bags, ...coins].forEach((item) => {
    entitiesGroup.remove(item.group);
  });
  particles.forEach((p) => entitiesGroup.remove(p.mesh));
  obstacles = [];
  bins = [];
  bags = [];
  coins = [];
  particles = [];
}

function spawnKickBurst(x, y, z) {
  const ringGeo = new THREE.TorusGeometry(0.48, 0.07, 6, 18);
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.position.set(x, y, z);
  entitiesGroup.add(ring);
  particles.push({
    mesh: ring,
    vel: new THREE.Vector3(0, 0.4, -2.5),
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
        (Math.random() - 0.5) * 5.2,
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

function spawnWave() {
  const obstacleTypes = ['bottle', 'bag_pile', 'jug_pile'];
  const laneOrder = [0, 1, 2].sort(() => Math.random() - 0.5);

  // Gelombang pertama selalu memunculkan kombo Kresek -> Tong Sampah di jalur tengah agar pemain langsung mencoba
  const isFirstWave = waveCount === 0;
  waveCount += 1;
  const hasBinCombo = isFirstWave || Math.random() < 0.72;

  if (hasBinCombo) {
    const binLane = isFirstWave ? 1 : laneOrder[0];
    const binObj = createTrashBin(Math.floor(Math.random() * 3));
    binObj.group.position.set(LANE_X[binLane], 0, SPAWN_Z);
    entitiesGroup.add(binObj.group);

    const binEntry = {
      lane: binLane,
      laneX: LANE_X[binLane],
      ...binObj,
      scored: false,
      incomingBag: false,
      celebrateTime: 0
    };
    bins.push(binEntry);

    // Sampah kresek diletakkan lebih jauh di depan tong sampah agar lintasan lemparan terlihat jelas
    const bagObj = createPlasticBag(Math.floor(Math.random() * 4));
    bagObj.group.position.set(LANE_X[binLane], 0, SPAWN_Z + 10.5);
    entitiesGroup.add(bagObj.group);
    bags.push({
      lane: binLane,
      laneX: LANE_X[binLane],
      ...bagObj,
      binRef: binEntry,
      state: 'idle',
      flyTime: 0,
      startPos: new THREE.Vector3()
    });

    // Jalur lain diisi maksimal 1 rintangan sampah plastik agar tidak terlalu padat (kecuali gelombang pertama biar fokus belajar)
    const otherLanes = laneOrder.filter((l) => l !== binLane);
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
  introGuideEl.classList.add('hidden');
  storyBannerEl.classList.add('hidden');

  introTimer = 0;
  introLitterSpawned = false;
  introBagEntry = null;

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
}

function pauseGame() {
  if (gameState !== 'playing') return;
  gameState = 'paused';
  pauseBinsEl.textContent = String(binsCount);
  pauseCoinsEl.textContent = String(coinsCount);
  pauseScreenEl.classList.remove('hidden');
}

function resumeGame() {
  if (gameState !== 'paused') return;
  gameState = 'playing';
  pauseScreenEl.classList.add('hidden');
}

function showMenu() {
  gameState = 'menu';
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
  introGuideEl.classList.add('hidden');
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

// Button Listeners
startBtn.addEventListener('click', startGame);
pauseBtn.addEventListener('click', pauseGame);
resumeBtn.addEventListener('click', resumeGame);
restartFromPauseBtn.addEventListener('click', startGame);
homeFromPauseBtn.addEventListener('click', showMenu);
retryBtn.addEventListener('click', startGame);
menuBtn.addEventListener('click', showMenu);

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
      // Pasangkan kresek yang tadi dibuang dengan Tong Sampah Kotak Plasvora di depannya!
      const bagZ = introBagEntry ? introBagEntry.group.position.z : -7.5;
      const binObj = createTrashBin(0);
      binObj.group.position.set(LANE_X[1], 0, bagZ - 10.5);
      entitiesGroup.add(binObj.group);
      const binEntry = {
        lane: 1,
        laneX: LANE_X[1],
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
  curveUniforms.uCurveX.value = Math.sin(distance * 0.015) * 0.00055;

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

  runPhase += dt * (speed * 0.85);
  player.root.position.x = playerX;
  player.setRunning(runPhase, tiltX, playerY, kickTimer);

  // Update Si Pembuang Sampah yang dikejar di depan pemain
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
    bins.forEach((b) => {
      if (b.group.position.z > -44 && b.group.position.z < -5) blockedLanes.add(b.lane);
    });
    bags.forEach((bg) => {
      if (bg.group.position.z > -44 && bg.group.position.z < -5) blockedLanes.add(bg.lane);
    });

    const freeLanes = [0, 1, 2].filter((l) => !blockedLanes.has(l));
    // Wajib sisakan minimal 1 jalur terbuka sesudah lemparan (jadi lempar hanya jika >= 2 jalur kosong)
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

  // Spawn Gelombang Baru
  spawnAccumulator += stepZ;
  if (spawnAccumulator >= nextWaveGap) {
    spawnAccumulator = 0;
    spawnWave();
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
        spawnKickBurst(bag.group.position.x, 0.55, bag.group.position.z - 0.2);
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

  // Update Tong Sampah (Gawang)
  for (let i = bins.length - 1; i >= 0; i--) {
    const bin = bins[i];
    bin.group.position.z += stepZ;
    bin.coin.rotation.y += dt * 3.8;

    if (bin.celebrateTime > 0) {
      bin.celebrateTime = Math.max(0, bin.celebrateTime - dt);
      const p = 1 - bin.celebrateTime / 0.55;
      // Tong memantul senang dan tutup bergerak, lalu mengecil mulus saat dilewati
      const pop = 1 + Math.sin(p * Math.PI) * 0.28;
      bin.binGroup.scale.set(pop, 1 / pop + 0.08, pop);
      bin.lidPivot.rotation.x = -2.3 + Math.sin(p * Math.PI * 2) * 0.35;
      bin.coin.position.y = 2.55 + p * 2.0;
      bin.coin.scale.setScalar(Math.max(0.01, 1 - p));
      if (p > 0.6) {
        bin.binGroup.scale.setScalar(Math.max(0.01, 1 - (p - 0.6) * 2.4));
      }
    } else if (!bin.scored && !bin.incomingBag) {
      // Jika pemain menabrak tong tanpa menendang kresek sebelumnya
      if (
        Math.abs(bin.group.position.z) < 0.82 &&
        Math.abs(playerX - bin.laneX) < 0.92 &&
        playerY < 1.35
      ) {
        triggerCrash();
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
