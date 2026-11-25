import * as THREE from 'three';
import { applyCurvedWorld } from './curvedWorld.js';

const stickerShieldUrl =
  typeof import.meta !== 'undefined' && import.meta.env
    ? './assets/sticker-plasvora-shield.png'
    : './src/assets/sticker-plasvora-shield.png';

const textureLoader = new THREE.TextureLoader();
const plasvoraStickerTex = textureLoader.load(stickerShieldUrl);
plasvoraStickerTex.colorSpace = THREE.SRGBColorSpace;

function cMat(params, curveStrength = 1.0) {
  const mat = new THREE.MeshLambertMaterial(params);
  if (curveStrength > 0) {
    applyCurvedWorld(mat, curveStrength);
  }
  return mat;
}

export function createBlobShadow(radius = 0.7) {
  const geo = new THREE.CircleGeometry(radius, 18);
  geo.rotateX(-Math.PI / 2);
  const mat = cMat({
    color: 0x126b32,
    transparent: true,
    opacity: 0.34,
    depthWrite: false
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = 0.025;
  return mesh;
}

export function createWarningSign() {
  const group = new THREE.Group();
  const redMat = cMat({ color: 0xff2f45, emissive: 0x550008 });
  const bar = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.48, 0.14), redMat);
  bar.position.y = 0.28;
  const dot = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 0.14), redMat);
  dot.position.y = -0.08;
  group.add(bar, dot);
  return group;
}

// Karakter kartun lucu terinspirasi maskot video dengan rompi hijau Plasvora
export function createPlayer() {
  const root = new THREE.Group();
  const shadow = createBlobShadow(0.68);
  root.add(shadow);

  const actor = new THREE.Group();
  root.add(actor);

  const whiteMat = cMat({ color: 0xffffff });
  const visorMat = cMat({ color: 0x11161f });
  const ecoGreenMat = cMat({ color: 0x16c765 });
  const shoeMat = cMat({ color: 0x1d2530 });
  const eyeMat = cMat({ color: 0x45f2d1, emissive: 0x178b78 });

  // Badan
  const torsoGroup = new THREE.Group();
  torsoGroup.position.y = 0.78;
  actor.add(torsoGroup);

  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.36, 0.32, 6, 14), whiteMat);
  torsoGroup.add(body);

  // Rompi hijau Plasvora di badan
  const vest = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.42, 14), ecoGreenMat);
  vest.position.y = -0.02;
  torsoGroup.add(vest);

  // Kepala bulat-kotak putih + visor hitam seperti video
  const headGroup = new THREE.Group();
  headGroup.position.y = 0.72;
  torsoGroup.add(headGroup);

  const head = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.72, 0.76), whiteMat);
  // Sedikit membulat dengan kapsul tumpang
  const headCap = new THREE.Mesh(new THREE.SphereGeometry(0.5, 14, 12), whiteMat);
  headCap.scale.set(1.02, 0.82, 0.86);
  headGroup.add(headCap);
  head.scale.set(0.95, 0.92, 0.92);
  headGroup.add(head);

  // Visor hitam di depan & belakang (terlihat keren dari kamera belakang/samping)
  const visorBack = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.52, 0.14), visorMat);
  visorBack.position.set(0, 0.02, 0.36);
  headGroup.add(visorBack);

  const visorFront = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.52, 0.14), visorMat);
  visorFront.position.set(0, 0.02, -0.36);
  headGroup.add(visorFront);

  // Mata menyala kecil di depan visor
  const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), eyeMat);
  eyeL.position.set(-0.16, 0.05, -0.43);
  const eyeR = eyeL.clone();
  eyeR.position.x = 0.16;
  headGroup.add(eyeL, eyeR);

  // Antena daun eco kecil di atas kepala
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.22, 6), ecoGreenMat);
  stem.position.y = 0.48;
  const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 6), ecoGreenMat);
  leaf.scale.set(1.4, 0.45, 0.8);
  leaf.position.set(0.08, 0.58, 0);
  leaf.rotation.z = 0.35;
  headGroup.add(stem, leaf);

  // Lengan
  const leftArmPivot = new THREE.Group();
  leftArmPivot.position.set(-0.46, 0.2, 0);
  torsoGroup.add(leftArmPivot);
  const armGeo = new THREE.CapsuleGeometry(0.11, 0.34, 4, 8);
  const leftArm = new THREE.Mesh(armGeo, whiteMat);
  leftArm.position.y = -0.22;
  leftArmPivot.add(leftArm);

  const rightArmPivot = new THREE.Group();
  rightArmPivot.position.set(0.46, 0.2, 0);
  torsoGroup.add(rightArmPivot);
  const rightArm = new THREE.Mesh(armGeo, whiteMat);
  rightArm.position.y = -0.22;
  rightArmPivot.add(rightArm);

  // Bazooka Eco di bahu kanan (muncul saat melawan Boss UFO di kelipatan 100m!)
  const bazookaGroup = new THREE.Group();
  bazookaGroup.position.set(0.48, 0.34, -0.15);
  bazookaGroup.visible = false;
  torsoGroup.add(bazookaGroup);

  const bzkTubeMat = cMat({ color: 0x15803d });
  const bzkRimMat = cMat({ color: 0xfacc15 });
  const bzkDarkMat = cMat({ color: 0x1e293b });
  const laserMat = new THREE.MeshBasicMaterial({
    color: 0xff2a2a,
    transparent: true,
    opacity: 0.65
  });
  applyCurvedWorld(laserMat, 1.0);

  const bzkTube = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.17, 1.35, 12), bzkTubeMat);
  bzkTube.rotation.x = Math.PI / 2;
  const bzkFront = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.16, 0.22, 12), bzkRimMat);
  bzkFront.rotation.x = Math.PI / 2;
  bzkFront.position.z = -0.68;
  const bzkBack = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.22, 0.2, 12), bzkDarkMat);
  bzkBack.rotation.x = Math.PI / 2;
  bzkBack.position.z = 0.68;
  const bzkSight = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.22, 0.18), bzkRimMat);
  bzkSight.position.set(0, 0.2, -0.35);

  // Garis bidik laser dari ujung bazooka ke depan agar mudah diarahkan ke UFO
  const laserBeam = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 24, 6), laserMat);
  laserBeam.rotation.x = Math.PI / 2;
  laserBeam.position.set(0, 0.08, -12.8);

  bazookaGroup.add(bzkTube, bzkFront, bzkBack, bzkSight, laserBeam);

  // Kaki
  const legGeo = new THREE.CapsuleGeometry(0.12, 0.32, 4, 8);
  const shoeGeo = new THREE.BoxGeometry(0.24, 0.16, 0.36);

  const leftLegPivot = new THREE.Group();
  leftLegPivot.position.set(-0.2, 0.52, 0);
  actor.add(leftLegPivot);
  const leftLeg = new THREE.Mesh(legGeo, whiteMat);
  leftLeg.position.y = -0.24;
  const leftShoe = new THREE.Mesh(shoeGeo, shoeMat);
  leftShoe.position.set(0, -0.46, -0.06);
  leftLegPivot.add(leftLeg, leftShoe);

  const rightLegPivot = new THREE.Group();
  rightLegPivot.position.set(0.2, 0.52, 0);
  actor.add(rightLegPivot);
  const rightLeg = new THREE.Mesh(legGeo, whiteMat);
  rightLeg.position.y = -0.24;
  const rightShoe = new THREE.Mesh(shoeGeo, shoeMat);
  rightShoe.position.set(0, -0.46, -0.06);
  rightLegPivot.add(rightLeg, rightShoe);

  // Kaki kartun gepeng saat tertabrak (seperti detik 00:09 video)
  const splatGroup = new THREE.Group();
  splatGroup.visible = false;
  actor.add(splatGroup);

  const splatMat = cMat({ color: 0x161b22 });
  for (let i = 0; i < 4; i++) {
    const legLine = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.55, 6), splatMat);
    const side = i < 2 ? -1 : 1;
    const zOff = i % 2 === 0 ? -0.18 : 0.18;
    legLine.rotation.z = side * (Math.PI / 2 - 0.25);
    legLine.position.set(side * 0.62, 0.12, zOff);
    splatGroup.add(legLine);
  }

  return {
    root,
    actor,
    shadow,
    setRunning(phase, tiltX, jumpY, kickTimer, holdingBazooka = false, bazookaAimPitch = 0) {
      splatGroup.visible = false;
      actor.scale.set(1, 1, 1);
      bazookaGroup.visible = holdingBazooka;
      bazookaGroup.rotation.x = bazookaAimPitch;

      const s = Math.sin(phase);

      if (kickTimer > 0 && !holdingBazooka) {
        // Pose tendangan penuh yang jelas terlihat dari kamera belakang
        const p = 1 - kickTimer; // 0 -> 1
        const kickCurve = Math.sin(Math.min(1, p * 1.15) * Math.PI);
        const hopY = Math.sin(p * Math.PI) * 0.42;

        actor.position.y = jumpY + hopY;
        actor.rotation.z = tiltX - kickCurve * 0.16;
        actor.rotation.x = kickCurve * 0.28; // Condong ke belakang saat menendang
        actor.rotation.y = kickCurve * 0.48; // Putar pinggul agar kaki kanan terlihat menendang ke depan

        // Kaki kanan mengayun tinggi ke depan (+X rotation = maju ke -Z)
        rightLegPivot.rotation.x = kickCurve * 1.75;
        rightLegPivot.rotation.z = kickCurve * 0.28;
        leftLegPivot.rotation.x = -kickCurve * 0.72;
        leftLegPivot.rotation.z = 0;

        // Lengan terentang menyeimbangkan tendangan
        leftArmPivot.rotation.x = -kickCurve * 0.65;
        leftArmPivot.rotation.z = kickCurve * 0.75;
        rightArmPivot.rotation.x = kickCurve * 0.55;
        rightArmPivot.rotation.z = -kickCurve * 0.65;

        torsoGroup.position.y = 0.82;
        headGroup.rotation.z = -tiltX * 0.35;
        const shadowScale = Math.max(0.45, 1 - (jumpY + hopY) * 0.22);
        shadow.scale.setScalar(shadowScale);
        return;
      }

      actor.position.y = jumpY;
      actor.rotation.z = tiltX;
      actor.rotation.x = 0;
      actor.rotation.y = 0;

      leftArmPivot.rotation.x = s * 0.9;
      leftArmPivot.rotation.z = 0;
      if (holdingBazooka) {
        // Tangan kanan memegang bazooka di bahu
        rightArmPivot.rotation.x = 1.25;
        rightArmPivot.rotation.z = -0.15;
      } else {
        rightArmPivot.rotation.x = -s * 0.9;
        rightArmPivot.rotation.z = 0;
      }
      leftLegPivot.rotation.z = 0;
      rightLegPivot.rotation.z = 0;

      if (jumpY > 0.08) {
        leftLegPivot.rotation.x = 0.45;
        rightLegPivot.rotation.x = -0.35;
      } else {
        leftLegPivot.rotation.x = -s * 1.05;
        rightLegPivot.rotation.x = s * 1.05;
      }

      torsoGroup.position.y = 0.78 + Math.abs(Math.cos(phase)) * 0.07;
      headGroup.rotation.z = -tiltX * 0.35;

      const shadowScale = Math.max(0.45, 1 - jumpY * 0.22);
      shadow.scale.setScalar(shadowScale);
    },
    setSquished() {
      splatGroup.visible = true;
      actor.position.y = 0.02;
      actor.rotation.set(0, 0, 0);
      actor.scale.set(1.28, 0.22, 1.25);
      shadow.scale.setScalar(1.3);
    }
  };
}

// Orang yang membuang sampah sembarangan (dikejar pemain & melempar rintangan plastik)
export function createLitterbug() {
  const root = new THREE.Group();
  const shadow = createBlobShadow(0.72);
  root.add(shadow);

  const actor = new THREE.Group();
  root.add(actor);

  const hoodieMat = cMat({ color: 0xf97316 }); // Jaket oranye mencolok
  const pantsMat = cMat({ color: 0x1e293b });
  const skinMat = cMat({ color: 0xfdba74 });
  const capMat = cMat({ color: 0xe11d48 }); // Topi merah terbalik
  const shadesMat = cMat({ color: 0x0f172a });
  const sackMat = cMat({ color: 0x334155 });
  const shoeMat = cMat({ color: 0xef4444 });
  const bottleMat = cMat({ color: 0x38bdf8 });

  // Badan
  const torsoGroup = new THREE.Group();
  torsoGroup.position.y = 0.85;
  actor.add(torsoGroup);

  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.36, 0.36, 6, 12), hoodieMat);
  torsoGroup.add(torso);

  // Karung sampah di punggung (menghadap ke belakang/kamera +Z)
  const backpackSack = new THREE.Mesh(new THREE.DodecahedronGeometry(0.38, 1), sackMat);
  backpackSack.scale.set(0.95, 1.15, 0.82);
  backpackSack.position.set(0, 0.08, 0.42);
  torsoGroup.add(backpackSack);

  // Kepala + topi terbalik + kacamata hitam
  const headGroup = new THREE.Group();
  headGroup.position.y = 0.72;
  torsoGroup.add(headGroup);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.38, 12, 12), skinMat);
  headGroup.add(head);

  const capDome = new THREE.Mesh(
    new THREE.SphereGeometry(0.4, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.55),
    capMat
  );
  capDome.position.y = 0.04;
  const capVisor = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.07, 0.34), capMat);
  capVisor.position.set(0, 0.08, 0.38); // Lidah topi menghadap belakang
  headGroup.add(capDome, capVisor);

  const shades = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.14, 0.16), shadesMat);
  shades.position.set(0, 0.02, -0.32);
  headGroup.add(shades);

  // Lengan
  const armGeo = new THREE.CapsuleGeometry(0.11, 0.36, 4, 8);
  const leftArmPivot = new THREE.Group();
  leftArmPivot.position.set(-0.46, 0.22, 0);
  torsoGroup.add(leftArmPivot);
  const leftArm = new THREE.Mesh(armGeo, hoodieMat);
  leftArm.position.y = -0.22;
  leftArmPivot.add(leftArm);

  const rightArmPivot = new THREE.Group();
  rightArmPivot.position.set(0.46, 0.22, 0);
  torsoGroup.add(rightArmPivot);
  const rightArm = new THREE.Mesh(armGeo, hoodieMat);
  rightArm.position.y = -0.22;
  // Sampah yang dipegang di tangan saat bersiap melempar
  const heldTrash = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.13, 0.38, 8), bottleMat);
  heldTrash.position.set(0, -0.48, 0.08);
  heldTrash.visible = false;
  rightArmPivot.add(rightArm, heldTrash);

  // Kaki
  const legGeo = new THREE.CapsuleGeometry(0.12, 0.34, 4, 8);
  const shoeGeo = new THREE.BoxGeometry(0.24, 0.16, 0.36);

  const leftLegPivot = new THREE.Group();
  leftLegPivot.position.set(-0.2, 0.54, 0);
  actor.add(leftLegPivot);
  const leftLeg = new THREE.Mesh(legGeo, pantsMat);
  leftLeg.position.y = -0.24;
  const leftShoe = new THREE.Mesh(shoeGeo, shoeMat);
  leftShoe.position.set(0, -0.46, -0.06);
  leftLegPivot.add(leftLeg, leftShoe);

  const rightLegPivot = new THREE.Group();
  rightLegPivot.position.set(0.2, 0.54, 0);
  actor.add(rightLegPivot);
  const rightLeg = new THREE.Mesh(legGeo, pantsMat);
  rightLeg.position.y = -0.24;
  const rightShoe = new THREE.Mesh(shoeGeo, shoeMat);
  rightShoe.position.set(0, -0.46, -0.06);
  rightLegPivot.add(rightLeg, rightShoe);

  return {
    root,
    actor,
    setChasing(phase, tiltX, throwTimer) {
      actor.position.y = 0;
      const s = Math.sin(phase);
      actor.rotation.z = tiltX;
      torsoGroup.position.y = 0.85 + Math.abs(Math.cos(phase)) * 0.08;
      leftLegPivot.rotation.x = -s * 1.15;
      rightLegPivot.rotation.x = s * 1.15;
      leftArmPivot.rotation.x = s * 0.95;
      leftArmPivot.rotation.z = 0;

      if (throwTimer > 0) {
        const p = 1 - throwTimer; // 0 -> 1
        const swing = Math.sin(p * Math.PI);
        // Menoleh ke belakang & mengayun tangan melempar rintangan ke arah pemain
        actor.rotation.y = swing * 0.9;
        headGroup.rotation.y = swing * 0.85;
        rightArmPivot.rotation.x = -2.1 * swing;
        rightArmPivot.rotation.z = -0.35 * swing;
        heldTrash.visible = p < 0.35;
      } else {
        actor.rotation.y = 0;
        headGroup.rotation.y = 0;
        rightArmPivot.rotation.x = -s * 0.95;
        rightArmPivot.rotation.z = 0;
        heldTrash.visible = false;
      }
    },
    setIntroLitter(t, phase) {
      actor.rotation.z = 0;
      headGroup.rotation.y = 0;
      if (t < 1.0) {
        // 0.0 - 1.0s: Berdiri membuang sampah sembarangan ke jalan
        actor.position.y = 0;
        actor.rotation.y = Math.PI * 0.78;
        leftLegPivot.rotation.x = 0;
        rightLegPivot.rotation.x = 0;
        leftArmPivot.rotation.x = 0;
        leftArmPivot.rotation.z = 0.15;
        const tossP = Math.min(1, t / 0.75);
        rightArmPivot.rotation.x = -2.0 * Math.sin(tossP * Math.PI);
        rightArmPivot.rotation.z = -0.25;
        heldTrash.visible = t < 0.45;
      } else if (t < 1.55) {
        // 1.0 - 1.55s: Kaget ketahuan & melompat kecil
        const u = (t - 1.0) / 0.55;
        actor.position.y = Math.sin(u * Math.PI) * 0.75;
        actor.rotation.y = Math.PI;
        leftLegPivot.rotation.x = 0.3;
        rightLegPivot.rotation.x = -0.3;
        leftArmPivot.rotation.x = 0;
        leftArmPivot.rotation.z = 1.15;
        rightArmPivot.rotation.x = 0;
        rightArmPivot.rotation.z = -1.15;
        heldTrash.visible = false;
      } else {
        // 1.55s+: Balik badan dan kabur berlari
        this.setChasing(phase, 0, 0);
      }
    }
  };
}

// Palu / Bonk merah kartun lucu saat menabrak rintangan (seperti 00:09 di video)
export function createCrashBonkProp() {
  const group = new THREE.Group();
  const redMat = cMat({ color: 0xe63946 });
  const darkRedMat = cMat({ color: 0xb91c2b });
  const whiteMat = cMat({ color: 0xffffff });
  const blackMat = cMat({ color: 0x111111 });

  const head = new THREE.Mesh(new THREE.CylinderGeometry(0.68, 0.68, 0.95, 16), redMat);
  head.position.y = 0.48;
  group.add(head);

  const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.73, 0.73, 0.16, 16), darkRedMat);
  rim.position.y = 0.1;
  group.add(rim);

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 1.3, 12), redMat);
  neck.position.y = 1.45;
  group.add(neck);

  // Mata kartun melotot di sisi belakang/atas agar terlihat dari kamera
  const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 10), whiteMat);
  eyeL.position.set(-0.34, 0.88, 0.56);
  const pupilL = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), blackMat);
  pupilL.position.set(-0.36, 0.88, 0.71);

  const eyeR = eyeL.clone();
  eyeR.position.x = 0.34;
  const pupilR = pupilL.clone();
  pupilR.position.x = 0.36;

  // Alis marah kartun
  const browGeo = new THREE.BoxGeometry(0.32, 0.08, 0.08);
  const browL = new THREE.Mesh(browGeo, blackMat);
  browL.position.set(-0.34, 1.07, 0.66);
  browL.rotation.z = -0.35;
  const browR = new THREE.Mesh(browGeo, blackMat);
  browR.position.set(0.34, 1.07, 0.66);
  browR.rotation.z = 0.35;

  group.add(eyeL, pupilL, eyeR, pupilR, browL, browR);
  group.visible = false;
  return group;
}

// Koin Eco Plasvora
export function createEcoCoin() {
  const group = new THREE.Group();
  const goldMat = cMat({ color: 0xffc82c, emissive: 0x452c00 });
  const innerMat = cMat({ color: 0xffe46b });
  const leafMat = cMat({ color: 0x18a957 });

  const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.1, 16), goldMat);
  rim.rotation.x = Math.PI / 2;
  const face = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.12, 16), innerMat);
  face.rotation.x = Math.PI / 2;
  const emblem = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.26, 0.14), leafMat);
  emblem.rotation.z = 0.3;

  group.add(rim, face, emblem);
  return group;
}

// Pengganti Gawang: TONG SAMPAH KOTAK BERONGGA Plasvora (meruncing, mulut terbuka ke depan, stiker rata)
export function createTrashBin(paletteIndex = 0) {
  const palettes = [
    { body: 0x129e68, rim: 0x2de09b, dark: 0x072b1c }, // Hijau Plasvora
    { body: 0x0f9bb8, rim: 0x38d7f5, dark: 0x062a33 }, // Teal Plasvora
    { body: 0x16a34a, rim: 0x4ade80, dark: 0x083016 }  // Hijau Eco
  ];
  const pal = palettes[paletteIndex % palettes.length];

  const group = new THREE.Group();
  const shadow = createBlobShadow(0.95);
  group.add(shadow);

  const binGroup = new THREE.Group();
  group.add(binGroup);

  const bodyMat = cMat({ color: pal.body });
  const rimMat = cMat({ color: pal.rim });
  const darkMat = cMat({ color: pal.dark });
  const wheelMat = cMat({ color: 0x1f2937 });
  const hubMat = cMat({ color: 0x38bdf8 });

  // Badan tong kotak meruncing ke bawah (4 sisi mulus)
  const lowerBody = new THREE.Mesh(new THREE.CylinderGeometry(0.92, 0.72, 1.15, 4), bodyMat);
  lowerBody.rotation.y = Math.PI / 4;
  lowerBody.position.y = 0.725;
  binGroup.add(lowerBody);

  // Alas bawah rapi + roda terselip di sudut belakang bawah
  const baseFoot = new THREE.Mesh(new THREE.BoxGeometry(1.04, 0.14, 1.04), darkMat);
  baseFoot.position.y = 0.09;
  binGroup.add(baseFoot);

  [-0.5, 0.5].forEach((wx) => {
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.1, 12), wheelMat);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(wx, 0.16, -0.38);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.12, 10), hubMat);
    hub.rotation.z = Math.PI / 2;
    hub.position.set(wx, 0.16, -0.38);
    binGroup.add(wheel, hub);
  });

  // Bagian atas BERONGGA (dinding kiri, kanan, belakang lebih tinggi + bibir depan lebih rendah agar mulut tong terlihat jelas)
  const hollowFloor = new THREE.Mesh(new THREE.BoxGeometry(1.16, 0.1, 1.16), darkMat);
  hollowFloor.position.y = 1.29;
  binGroup.add(hollowFloor);

  const wallLeft = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.52, 1.3), bodyMat);
  wallLeft.position.set(-0.6, 1.54, 0);
  const wallRight = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.52, 1.3), bodyMat);
  wallRight.position.set(0.6, 1.54, 0);
  const wallBack = new THREE.Mesh(new THREE.BoxGeometry(1.31, 0.58, 0.11), bodyMat);
  wallBack.position.set(0, 1.57, -0.6);

  // Bibir corong cerah di sisi depan-atas & sisi samping/belakang
  const frontLip = new THREE.Mesh(new THREE.BoxGeometry(1.32, 0.16, 0.14), rimMat);
  frontLip.position.set(0, 1.34, 0.6);
  const leftRim = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.11, 1.34), rimMat);
  leftRim.position.set(-0.6, 1.81, 0);
  const rightRim = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.11, 1.34), rimMat);
  rightRim.position.set(0.6, 1.81, 0);
  const backRim = new THREE.Mesh(new THREE.BoxGeometry(1.34, 0.11, 0.14), rimMat);
  backRim.position.set(0, 1.86, -0.6);

  // Pegangan samping kiri-kanan
  const handleGeo = new THREE.BoxGeometry(0.08, 0.1, 0.36);
  const handleL = new THREE.Mesh(handleGeo, rimMat);
  handleL.position.set(-0.69, 1.52, 0);
  const handleR = new THREE.Mesh(handleGeo, rimMat);
  handleR.position.set(0.69, 1.52, 0);

  binGroup.add(
    wallLeft,
    wallRight,
    wallBack,
    frontLip,
    leftRim,
    rightRim,
    backRim,
    handleL,
    handleR
  );

  // Stiker Plasvora menempel miring sejajar bidang depan tong yang meruncing
  const stickerMat = new THREE.MeshBasicMaterial({
    map: plasvoraStickerTex,
    transparent: true,
    alphaTest: 0.1
  });
  applyCurvedWorld(stickerMat, 1.0);

  const stickerFront = new THREE.Mesh(new THREE.PlaneGeometry(0.92, 0.92), stickerMat);
  stickerFront.position.set(0, 0.72, 0.596);
  stickerFront.rotation.x = -0.121;
  binGroup.add(stickerFront);

  // Tutup kotak terlipat rapi ke belakang sehingga tidak menghalangi lubang masuk
  const lidPivot = new THREE.Group();
  lidPivot.position.set(0, 1.86, -0.66);
  lidPivot.rotation.x = -2.3;
  const lid = new THREE.Mesh(new THREE.BoxGeometry(1.34, 0.1, 1.24), rimMat);
  lid.position.set(0, 0, 0.62);
  const lidHandle = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.08, 0.14), darkMat);
  lidHandle.position.set(0, 0.08, 0.62);
  lidPivot.add(lid, lidHandle);
  binGroup.add(lidPivot);

  // Koin Eco berputar di atas mulut tong
  const coin = createEcoCoin();
  coin.position.y = 2.55;
  binGroup.add(coin);

  return {
    group,
    binGroup,
    lidPivot,
    coin
  };
}

// Pengganti Bola: SAMPAH KRESEK (kantong plastik terikat)
export function createPlasticBag(colorIndex = 0) {
  const bagColors = [0xf8fafc, 0xbae6fd, 0xfbcfe8, 0xfef08a];
  const col = bagColors[colorIndex % bagColors.length];

  const group = new THREE.Group();
  const shadow = createBlobShadow(0.5);
  group.add(shadow);

  const meshGroup = new THREE.Group();
  meshGroup.position.y = 0.48;
  group.add(meshGroup);

  const bagMat = cMat({ color: col });
  const knotMat = cMat({ color: 0xe2e8f0 });
  const bandMat = cMat({ color: 0xef4444 });

  // Badan kresek menggembung & berfaset (terlihat seperti plastik kusut)
  const body = new THREE.Mesh(new THREE.IcosahedronGeometry(0.42, 1), bagMat);
  body.scale.set(1.0, 1.12, 0.92);
  meshGroup.add(body);

  // Simpul ikatan di atas
  const knot = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 8), knotMat);
  knot.position.y = 0.44;
  meshGroup.add(knot);

  // Dua telinga/pegangan plastik kresek
  const earGeo = new THREE.ConeGeometry(0.11, 0.34, 6);
  const earL = new THREE.Mesh(earGeo, bagMat);
  earL.position.set(-0.14, 0.62, 0);
  earL.rotation.z = 0.45;
  const earR = new THREE.Mesh(earGeo, bagMat);
  earR.position.set(0.14, 0.62, 0);
  earR.rotation.z = -0.45;
  meshGroup.add(earL, earR);

  // Pita warna pengikat di leher kresek agar kontras
  const tie = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.04, 6, 12), bandMat);
  tie.rotation.x = Math.PI / 2;
  tie.position.y = 0.38;
  meshGroup.add(tie);

  return { group, meshGroup, shadow };
}

// Rintangan Sampah Plastik:
// 1. 'bottle' (Botol Plastik Raksasa / Cluster Botol PET - pengganti cone oranye)
// 2. 'bag_pile' (Tumpukan Karung & Kantong Kresek - pengganti batu)
// 3. 'jug_pile' (Tumpukan Jerigen & Gelas Plastik - pengganti semak)
export function createPlasticObstacle(type) {
  const group = new THREE.Group();
  const shadow = createBlobShadow(0.85);
  group.add(shadow);

  const visual = new THREE.Group();
  group.add(visual);

  if (type === 'bottle') {
    const petMat = cMat({ color: 0x38bdf8, transparent: true, opacity: 0.88 });
    const labelMat = cMat({ color: 0xff5a1f });
    const capMat = cMat({ color: 0xef4444 });
    const whiteMat = cMat({ color: 0xffffff });

    const buildBottle = (scale) => {
      const b = new THREE.Group();
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.34, 1.05, 12), petMat);
      body.position.y = 0.53;
      const shoulder = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.32, 0.28, 12), petMat);
      shoulder.position.y = 1.19;
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.14, 10), capMat);
      cap.position.y = 1.38;
      const label = new THREE.Mesh(new THREE.CylinderGeometry(0.335, 0.335, 0.34, 12), labelMat);
      label.position.y = 0.56;
      const stripe = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.08, 12), whiteMat);
      stripe.position.y = 0.56;
      b.add(body, shoulder, cap, label, stripe);
      b.scale.setScalar(scale);
      return b;
    };

    const mainBottle = buildBottle(1.12);
    const sideBottle = buildBottle(0.68);
    sideBottle.position.set(0.48, 0, 0.22);
    sideBottle.rotation.z = -0.15;
    visual.add(mainBottle, sideBottle);
  } else if (type === 'bag_pile') {
    const sackDarkMat = cMat({ color: 0x2c3545 });
    const sackBlueMat = cMat({ color: 0x3b82f6 });
    const sackPurpleMat = cMat({ color: 0x6366f1 });
    const bottleMat = cMat({ color: 0x22d3ee });

    const s1 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.62, 1), sackDarkMat);
    s1.scale.set(1.15, 0.85, 1.05);
    s1.position.set(-0.18, 0.45, 0);

    const s2 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.52, 1), sackBlueMat);
    s2.scale.set(1.0, 0.9, 1.0);
    s2.position.set(0.36, 0.38, 0.15);

    const s3 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.45, 1), sackPurpleMat);
    s3.position.set(0.05, 0.88, -0.05);

    // Simpul kantong di atas
    const knot = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.32, 6), sackPurpleMat);
    knot.position.set(0.05, 1.32, -0.05);
    knot.rotation.z = 0.2;

    // Botol plastik mencuat dari tumpukan
    const stuckBottle = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.45, 8), bottleMat);
    stuckBottle.position.set(-0.42, 0.72, 0.32);
    stuckBottle.rotation.set(0.5, 0, 0.6);

    visual.add(s1, s2, s3, knot, stuckBottle);
  } else {
    // 'jug_pile': Jerigen plastik kuning/oranye + gelas plastik berserakan
    const jugMat = cMat({ color: 0xf59e0b });
    const capMat = cMat({ color: 0xdc2626 });
    const cupMat = cMat({ color: 0xf43f5e });
    const whiteCupMat = cMat({ color: 0xf8fafc });

    const jug = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.98, 0.66), jugMat);
    jug.position.set(-0.1, 0.49, 0);
    jug.rotation.y = 0.25;

    const jugNeck = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 0.18, 8), capMat);
    jugNeck.position.set(-0.22, 1.04, 0);

    // Gelas plastik raksasa di samping
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.19, 0.56, 12), cupMat);
    cup.position.set(0.48, 0.28, 0.24);
    cup.rotation.z = -0.25;

    const cup2 = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.17, 0.48, 12), whiteCupMat);
    cup2.position.set(-0.48, 0.22, 0.34);
    cup2.rotation.x = 1.25;
    cup2.rotation.z = 0.4;

    visual.add(jug, jugNeck, cup, cup2);
  }

  const warning = createWarningSign();
  warning.position.y = 2.05;
  group.add(warning);

  return { group, visual, warning };
}

// Segmen Lintasan 3 Jalur + Pohon & Semak di kanan-kiri (persis video)
export function createTrackChunk(length = 20) {
  const group = new THREE.Group();

  const meadowMat = cMat({ color: 0x3ed958 });
  const laneLightMat = cMat({ color: 0x62fc79 });
  const laneMidMat = cMat({ color: 0x45eb61 });
  const lineMat = cMat({ color: 0xbefcd0 });
  const trunkMat = cMat({ color: 0x8b5a2b });
  const leavesMat1 = cMat({ color: 0x2bc44d });
  const leavesMat2 = cMat({ color: 0x3ee060 });

  // Padang rumput luas kiri-kanan
  const meadow = new THREE.Mesh(new THREE.PlaneGeometry(60, length, 4, 8), meadowMat);
  meadow.rotation.x = -Math.PI / 2;
  meadow.position.y = -0.02;
  group.add(meadow);

  // 3 Jalur lari (x = -2.2, 0, +2.2)
  const laneWidth = 2.15;
  const laneOffsets = [-2.2, 0, 2.2];
  laneOffsets.forEach((lx, idx) => {
    const lane = new THREE.Mesh(
      new THREE.PlaneGeometry(laneWidth, length, 1, 8),
      idx === 1 ? laneMidMat : laneLightMat
    );
    lane.rotation.x = -Math.PI / 2;
    lane.position.set(lx, 0, 0);
    group.add(lane);
  });

  // Garis pemisah jalur & tepi lintasan
  [-3.3, -1.1, 1.1, 3.3].forEach((divX) => {
    const line = new THREE.Mesh(new THREE.PlaneGeometry(0.11, length, 1, 8), lineMat);
    line.rotation.x = -Math.PI / 2;
    line.position.set(divX, 0.008, 0);
    group.add(line);
  });

  // Pohon kartun berlapis di kiri dan kanan jalan
  const buildTree = () => {
    const t = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.34, 1.3, 8), trunkMat);
    trunk.position.y = 0.65;
    const c1 = new THREE.Mesh(new THREE.ConeGeometry(1.45, 1.9, 8), leavesMat1);
    c1.position.y = 2.0;
    const c2 = new THREE.Mesh(new THREE.ConeGeometry(1.12, 1.65, 8), leavesMat2);
    c2.position.y = 3.05;
    const c3 = new THREE.Mesh(new THREE.ConeGeometry(0.75, 1.25, 8), leavesMat2);
    c3.position.y = 3.9;
    t.add(trunk, c1, c2, c3);
    return t;
  };

  const buildBush = () => {
    const b = new THREE.Group();
    const s1 = new THREE.Mesh(new THREE.SphereGeometry(0.65, 8, 8), leavesMat2);
    s1.position.y = 0.45;
    const s2 = new THREE.Mesh(new THREE.SphereGeometry(0.48, 8, 8), leavesMat1);
    s2.position.set(0.45, 0.35, 0.1);
    b.add(s1, s2);
    return b;
  };

  for (let z = -length / 2 + 3; z < length / 2; z += 6.5) {
    [-1, 1].forEach((side) => {
      const tree = buildTree();
      const xPos = side * (6.5 + Math.random() * 4.2);
      const scale = 0.85 + Math.random() * 0.45;
      tree.position.set(xPos, 0, z + (Math.random() - 0.5) * 2.2);
      tree.scale.setScalar(scale);
      group.add(tree);

      if (Math.random() > 0.35) {
        const bush = buildBush();
        bush.position.set(side * (5.8 + Math.random() * 1.4), 0, z + 2.6);
        group.add(bush);
      }
    });
  }

  return group;
}

// Awan kartun putih di langit
export function createClouds() {
  const cloudGroup = new THREE.Group();
  const cloudMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

  const cloudPositions = [
    [-14, 12, -48],
    [13, 14, -52],
    [0, 15, -62],
    [-22, 11, -56],
    [22, 11, -58]
  ];

  cloudPositions.forEach(([x, y, z], idx) => {
    const c = new THREE.Group();
    const puffs = [
      [0, 0, 0, 2.2],
      [-1.8, -0.35, 0.2, 1.6],
      [1.8, -0.3, 0.1, 1.7],
      [0.7, 0.65, -0.1, 1.5]
    ];
    puffs.forEach(([px, py, pz, r]) => {
      const m = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 10), cloudMat);
      m.position.set(px, py, pz);
      c.add(m);
    });
    c.position.set(x, y, z);
    c.userData.baseX = x;
    c.userData.speed = 0.35 + (idx % 3) * 0.15;
    cloudGroup.add(c);
  });

  return cloudGroup;
}

// Item Bom untuk meledakkan Truk Boss (muncul saat Boss aktif)
export function createBombItem() {
  const group = new THREE.Group();
  const shadow = createBlobShadow(0.62);
  group.add(shadow);

  // Cincin kuning-merah di tanah agar mudah dikenali sebagai bom
  const ringMat = cMat({ color: 0xfacc15, emissive: 0x7a4800 });
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.74, 20), ringMat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.04;
  group.add(ring);

  const meshGroup = new THREE.Group();
  meshGroup.position.y = 0.65;
  group.add(meshGroup);

  const bodyMat = cMat({ color: 0x1e293b });
  const bandMat = cMat({ color: 0xfacc15, emissive: 0x553800 });
  const capMat = cMat({ color: 0x64748b });
  const fuseMat = cMat({ color: 0xf1f5f9 });
  const flameMat = cMat({ color: 0xff5a1f, emissive: 0xff3b00 });
  const coreMat = cMat({ color: 0xfef08a, emissive: 0xfacc15 });

  const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.46, 14, 12), bodyMat);
  const belt = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.06, 8, 18), bandMat);
  belt.rotation.x = Math.PI / 2;

  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.16, 10), capMat);
  cap.position.y = 0.46;

  const fuse = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.26, 8), fuseMat);
  fuse.position.set(0.05, 0.62, 0);
  fuse.rotation.z = -0.3;

  const flame = new THREE.Group();
  flame.position.set(0.11, 0.76, 0);
  const outerFlame = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 8), flameMat);
  const innerFlame = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), coreMat);
  flame.add(outerFlame, innerFlame);

  meshGroup.add(sphere, belt, cap, fuse, flame);

  return { group, meshGroup, flame, ring };
}

// BOSS: Truk Compactor Sampah Putih-Hijau Limau Raksasa selebar 3 jalur (100% mirip foto belakang terbuka)
export function createBossTruck() {
  const root = new THREE.Group();
  const shadow = createBlobShadow(3.2);
  shadow.scale.set(1.08, 1.0, 1.05);
  root.add(shadow);

  const truckGroup = new THREE.Group();
  root.add(truckGroup);

  const whiteMat = cMat({ color: 0xf8fafc });     // Kabin & depan bak putih
  const limeMat = cMat({ color: 0x84d618 });      // Hijau limau terang (belakang bak & tailgate)
  const limeDarkMat = cMat({ color: 0x62ab0d });  // Hijau limau gelap untuk tulang rangka
  const chassisMat = cMat({ color: 0x161a22 });   // Hitam sasis, spakbor, mudflap
  const interiorMat = cMat({ color: 0x0b0f16 });  // Rongga dalam bak gelap
  const deckMat = cMat({ color: 0x2a313d });      // Lantai dalam bak
  const rimMat = cMat({ color: 0xdbe3ec });       // Velg silver cerah
  const hubMat = cMat({ color: 0x64748b });
  const steelMat = cMat({ color: 0xcbd5e1 });     // Piston hidrolik krom
  const glassMat = cMat({ color: 0x334155 });
  const redMat = cMat({ color: 0xef4444 });
  const tailRedMat = cMat({ color: 0xff2438, emissive: 0xb00014 });
  const tailAmberMat = cMat({ color: 0xffa61a, emissive: 0xa85800 });
  const beaconMat = cMat({ color: 0xff7a00, emissive: 0xd44a00 });

  // 1. Sasis & rangka bawah hitam
  const chassis = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.42, 4.9), chassisMat);
  chassis.position.set(0, 0.84, -0.15);
  truckGroup.add(chassis);

  // 2. Kabin depan PUTIH + lampu suar oranye di atap
  const cab = new THREE.Mesh(new THREE.BoxGeometry(5.1, 2.2, 1.5), whiteMat);
  cab.position.set(0, 2.1, -1.95);
  const cabBumper = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.42, 0.28), chassisMat);
  cabBumper.position.set(0, 0.96, -2.68);
  const windshield = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.85, 0.12), glassMat);
  windshield.position.set(0, 2.45, -2.68);
  const beacon = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 0.26, 10), beaconMat);
  beacon.position.set(0, 3.32, -1.5);
  truckGroup.add(cab, cabBumper, windshield, beacon);

  // Kaca samping & spion hitam bertingkat seperti foto
  [-2.57, 2.57].forEach((sx) => {
    const sideWin = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.8, 0.95), glassMat);
    sideWin.position.set(sx, 2.45, -1.9);
    const mirrorArm = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.08, 0.08), chassisMat);
    mirrorArm.position.set(sx + Math.sign(sx) * 0.18, 2.75, -2.42);
    const mirrorHead = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.52, 0.22), chassisMat);
    mirrorHead.position.set(sx + Math.sign(sx) * 0.34, 2.45, -2.45);
    truckGroup.add(sideWin, mirrorArm, mirrorHead);
  });

  // 3. Bak Utama BERONGGA (bagian depan putih, bagian belakang hijau limau, belakang TERBUKA lebar!)
  const bayFloor = new THREE.Mesh(new THREE.BoxGeometry(5.5, 0.18, 3.0), deckMat);
  bayFloor.position.set(0, 1.15, 0.4);
  const bayCeilingFront = new THREE.Mesh(new THREE.BoxGeometry(5.5, 0.18, 1.5), whiteMat);
  bayCeilingFront.position.set(0, 3.24, -0.35);
  const bayCeilingRear = new THREE.Mesh(new THREE.BoxGeometry(5.5, 0.18, 1.55), limeMat);
  bayCeilingRear.position.set(0, 3.24, 1.15);
  const bayInnerBackWall = new THREE.Mesh(new THREE.BoxGeometry(5.26, 2.1, 0.18), interiorMat);
  bayInnerBackWall.position.set(0, 2.2, -0.98);
  truckGroup.add(bayFloor, bayCeilingFront, bayCeilingRear, bayInnerBackWall);

  // Dinding kiri & kanan bak: depan putih, belakang hijau limau + tulang penguat miring
  [-2.66, 2.66].forEach((wx) => {
    const wallFront = new THREE.Mesh(new THREE.BoxGeometry(0.18, 2.16, 1.48), whiteMat);
    wallFront.position.set(wx, 2.2, -0.36);
    const wallRear = new THREE.Mesh(new THREE.BoxGeometry(0.18, 2.16, 1.54), limeMat);
    wallRear.position.set(wx, 2.2, 1.14);
    const rearPillar = new THREE.Mesh(new THREE.BoxGeometry(0.24, 2.25, 0.28), limeDarkMat);
    rearPillar.position.set(wx, 2.22, 1.84);
    const arch = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.42, 1.45), chassisMat);
    arch.position.set(wx - Math.sign(wx) * 0.05, 1.15, 0.95);
    const mudflap = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.62, 0.08), chassisMat);
    mudflap.position.set(wx - Math.sign(wx) * 0.14, 0.68, 1.62);
    truckGroup.add(wallFront, wallRear, rearPillar, arch, mudflap);
  });

  // Ban serep / tumpukan sampah di dalam lantai bak terbuka (persis detail di foto)
  const spareTire = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.24, 14), chassisMat);
  spareTire.position.set(-1.35, 1.36, 1.15);
  const trashMound = new THREE.Mesh(new THREE.DodecahedronGeometry(0.68, 1), chassisMat);
  trashMound.scale.set(1.3, 0.75, 1.1);
  trashMound.position.set(1.25, 1.52, 0.45);
  truckGroup.add(spareTire, trashMound);

  // Strip reflektif merah-putih di bawah sisi bak & pelindung samping antara roda
  [-2.78, 2.78].forEach((sx) => {
    for (let i = 0; i < 6; i++) {
      const segMat = i % 2 === 0 ? redMat : whiteMat;
      const sideBodyTape = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.13, 0.46), segMat);
      sideBodyTape.position.set(sx, 1.18, -0.8 + i * 0.5);
      const guardSeg = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.16, 0.34), segMat);
      guardSeg.position.set(sx, 0.72, -1.2 + i * 0.36);
      truckGroup.add(sideBodyTape, guardSeg);
    }
  });

  // 4. Lampu Belakang Segiempat Merah-Oranye + Palang Bumper Pengaman Merah-Putih (Persis Foto!)
  [-1.65, 1.65].forEach((lx) => {
    const housing = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.32, 0.14), chassisMat);
    housing.position.set(lx, 0.96, 2.12);
    const redLens = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.24, 0.08), tailRedMat);
    redLens.position.set(lx - Math.sign(lx) * 0.1, 0.96, 2.18);
    const amberLens = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.24, 0.08), tailAmberMat);
    amberLens.position.set(lx + Math.sign(lx) * 0.24, 0.96, 2.18);
    const strut = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.42, 0.16), chassisMat);
    strut.position.set(lx * 0.85, 0.72, 2.12);
    truckGroup.add(housing, redLens, amberLens, strut);
  });

  // Palang pengaman belakang motif merah-putih reflektif
  const rearGuardGroup = new THREE.Group();
  rearGuardGroup.position.set(0, 0.54, 2.26);
  for (let i = 0; i < 10; i++) {
    const segMat = i % 2 === 0 ? redMat : whiteMat;
    const barSeg = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.22, 0.12), segMat);
    barSeg.position.x = -2.16 + i * 0.48;
    rearGuardGroup.add(barSeg);
  }
  truckGroup.add(rearGuardGroup);

  // 5. PINTU BELAKANG COMPACTOR RAKSASA TERANGKAT TINGGI KE ATAS (Ciri khas utama foto!)
  const tailgatePivot = new THREE.Group();
  tailgatePivot.position.set(0, 3.28, 1.85);
  tailgatePivot.rotation.x = -2.08; // Terangkat tinggi terbuka ke atas-belakang!
  truckGroup.add(tailgatePivot);

  // Bodi utama tailgate hijau limau (besar, tebal & tinggi!)
  const tgBackShell = new THREE.Mesh(new THREE.BoxGeometry(5.56, 2.15, 1.05), limeMat);
  tgBackShell.position.set(0, -1.05, 0.58);
  const tgUpperJaw = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.95, 1.25), limeMat);
  tgUpperJaw.position.set(0, -1.85, 0.82);
  const tgDarkUnderside = new THREE.Mesh(new THREE.BoxGeometry(5.1, 1.85, 0.22), interiorMat);
  tgDarkUnderside.position.set(0, -1.05, 0.05);
  tailgatePivot.add(tgBackShell, tgUpperJaw, tgDarkUnderside);

  // Tulang rangka samping tailgate & pipa hidrolik krom
  [-2.7, 2.7].forEach((tx) => {
    const tgRib = new THREE.Mesh(new THREE.BoxGeometry(0.24, 2.3, 1.28), limeDarkMat);
    tgRib.position.set(tx, -1.12, 0.62);
    const tgCylinder = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.75, 8), steelMat);
    tgCylinder.position.set(tx - Math.sign(tx) * 0.22, -0.95, 1.2);
    tailgatePivot.add(tgRib, tgCylinder);
  });

  // Dua piston hidrolik silver menopang tailgate terangkat dari dinding samping bak
  [-2.55, 2.55].forEach((px) => {
    const piston = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.095, 1.65, 8), steelMat);
    piston.position.set(px, 3.25, 2.22);
    piston.rotation.x = 0.65;
    truckGroup.add(piston);
  });

  // 6. 4 Roda besar dengan velg silver mengkilap
  const wheels = [];
  [
    [-2.42, -1.95, 0.42],
    [2.42, -1.95, 0.42],
    [-2.38, 0.95, 0.66],
    [2.38, 0.95, 0.66]
  ].forEach(([wx, wz, width]) => {
    const wGroup = new THREE.Group();
    wGroup.position.set(wx, 0.64, wz);
    const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.64, 0.64, width, 16), chassisMat);
    tire.rotation.z = Math.PI / 2;
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, width + 0.03, 14), rimMat);
    rim.rotation.z = Math.PI / 2;
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, width + 0.06, 10), hubMat);
    hub.rotation.z = Math.PI / 2;
    wGroup.add(tire, rim, hub);
    truckGroup.add(wGroup);
    wheels.push(wGroup);
  });

  // 7. Si Boss Pembuang Sampah berdiri di dalam bibir bak terbuka (terlihat jelas di bawah tailgate raksasa!)
  const bossRider = new THREE.Group();
  bossRider.position.set(0, 1.24, 1.45);
  truckGroup.add(bossRider);

  const hoodieMat = cMat({ color: 0xf97316 });
  const skinMat = cMat({ color: 0xfdba74 });
  const capMat = cMat({ color: 0x9333ea });
  const shadesMat = cMat({ color: 0x0f172a });
  const bottleMat = cMat({ color: 0x38bdf8 });

  const bTorso = new THREE.Mesh(new THREE.CapsuleGeometry(0.4, 0.4, 6, 12), hoodieMat);
  bTorso.position.y = 0.56;
  bossRider.add(bTorso);

  const bHead = new THREE.Mesh(new THREE.SphereGeometry(0.42, 12, 12), skinMat);
  bHead.position.y = 1.28;
  const bCap = new THREE.Mesh(
    new THREE.SphereGeometry(0.44, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.55),
    capMat
  );
  bCap.position.y = 1.32;
  const bShades = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.15, 0.18), shadesMat);
  bShades.position.set(0, 1.28, 0.36);
  bossRider.add(bHead, bCap, bShades);

  const armGeo = new THREE.CapsuleGeometry(0.12, 0.36, 4, 8);
  const bArmL = new THREE.Group();
  bArmL.position.set(-0.5, 0.82, 0);
  const bArmLMesh = new THREE.Mesh(armGeo, hoodieMat);
  bArmLMesh.position.y = -0.22;
  bArmL.add(bArmLMesh);

  const bArmR = new THREE.Group();
  bArmR.position.set(0.5, 0.82, 0);
  const bArmRMesh = new THREE.Mesh(armGeo, hoodieMat);
  bArmRMesh.position.y = -0.22;
  const heldTrash = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.15, 0.45, 8), bottleMat);
  heldTrash.position.set(0, -0.5, 0.12);
  bArmR.add(bArmRMesh, heldTrash);
  bossRider.add(bArmL, bArmR);

  root.visible = false;

  return {
    root,
    truckGroup,
    bossRider,
    setTruckState(phase, swayX, hitFlash, throwTimer, explodeProgress, riderX = 0) {
      if (explodeProgress > 0) {
        truckGroup.position.y = Math.sin(explodeProgress * Math.PI) * 4.2;
        truckGroup.rotation.x = explodeProgress * 3.5;
        truckGroup.rotation.z = explodeProgress * 4.5;
        tailgatePivot.rotation.x = -2.08 - explodeProgress * 0.8;
        const sc = Math.max(0.01, 1 - explodeProgress * 0.9);
        truckGroup.scale.setScalar(sc);
        return;
      }

      truckGroup.scale.setScalar(1);
      truckGroup.rotation.x = 0;
      truckGroup.rotation.z = swayX * 0.1;
      truckGroup.position.y = Math.abs(Math.sin(phase * 1.4)) * 0.09;
      truckGroup.position.x = swayX + (hitFlash > 0 ? Math.sin(hitFlash * 55) * 0.25 : 0);

      tailgatePivot.rotation.x = -2.08 + Math.sin(phase * 0.9) * 0.05;
      bossRider.position.x = riderX;

      // Berkedip cepat saat terkena bom
      truckGroup.visible = hitFlash <= 0 || Math.floor(hitFlash * 24) % 2 === 0;

      wheels.forEach((w) => {
        w.rotation.x -= 0.25;
      });

      if (throwTimer > 0) {
        const p = 1 - throwTimer;
        const swing = Math.sin(p * Math.PI);
        bArmR.rotation.x = -2.2 * swing;
        bArmL.rotation.z = 0.6 * swing;
        heldTrash.visible = p < 0.35;
      } else {
        bArmR.rotation.x = Math.sin(phase) * 0.35;
        bArmL.rotation.z = 0.25 + Math.cos(phase) * 0.15;
        heldTrash.visible = false;
      }
    }
  };
}

// Roket Bazooka yang ditembakkan pemain ke arah Boss UFO
export function createBazookaRocket() {
  const group = new THREE.Group();
  const bodyMat = cMat({ color: 0xef4444, emissive: 0x550000 });
  const tipMat = cMat({ color: 0xfacc15, emissive: 0x664400 });
  const finMat = cMat({ color: 0x1e293b });
  const flameMat = cMat({ color: 0xff7a00, emissive: 0xff4500 });

  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.72, 10), bodyMat);
  body.rotation.x = Math.PI / 2;
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.32, 10), tipMat);
  nose.rotation.x = -Math.PI / 2;
  nose.position.z = -0.5;
  const fins = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.08, 0.22), finMat);
  fins.position.z = 0.24;
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.38, 8), flameMat);
  flame.rotation.x = Math.PI / 2;
  flame.position.z = 0.55;

  group.add(body, nose, fins, flame);
  return { group, flame };
}

// BOSS UFO SAMPAH (muncul di setiap kelipatan jarak 100m, menjatuhkan sampah dari udara!)
export function createBossUfo() {
  const root = new THREE.Group();
  const shadow = createBlobShadow(1.75);
  root.add(shadow);

  const ufoGroup = new THREE.Group();
  ufoGroup.position.y = 4.35;
  root.add(ufoGroup);

  const metalMat = cMat({ color: 0x94a3b8 });
  const darkRimMat = cMat({ color: 0x334155 });
  const neonPurpleMat = cMat({ color: 0xa855f7, emissive: 0x581c87 });
  const domeMat = cMat({ color: 0x38bdf8, transparent: true, opacity: 0.72 });
  const lightGreenMat = cMat({ color: 0x4ade80, emissive: 0x16a34a });
  const lightYellowMat = cMat({ color: 0xfacc15, emissive: 0xa16207 });
  const beamMat = new THREE.MeshBasicMaterial({
    color: 0x4ade80,
    transparent: true,
    opacity: 0.24,
    depthWrite: false
  });
  applyCurvedWorld(beamMat, 1.0);

  // Piringan utama UFO
  const saucer = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 2.15, 0.55, 20), metalMat);
  const lowerSaucer = new THREE.Mesh(new THREE.CylinderGeometry(2.15, 0.95, 0.36, 20), darkRimMat);
  lowerSaucer.position.y = -0.44;
  const neonRing = new THREE.Mesh(new THREE.TorusGeometry(2.12, 0.11, 8, 24), neonPurpleMat);
  neonRing.rotation.x = Math.PI / 2;
  neonRing.position.y = -0.22;
  ufoGroup.add(saucer, lowerSaucer, neonRing);

  // Lampu-lampu keliling piringan UFO
  const ringLights = new THREE.Group();
  for (let i = 0; i < 8; i++) {
    const ang = (i / 8) * Math.PI * 2;
    const bulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.16, 8, 8),
      i % 2 === 0 ? lightGreenMat : lightYellowMat
    );
    bulb.position.set(Math.cos(ang) * 1.95, -0.22, Math.sin(ang) * 1.95);
    ringLights.add(bulb);
  }
  ufoGroup.add(ringLights);

  // Kubah kaca transparan + Alien/Boss Pembuang Sampah di dalamnya
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(1.1, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.52),
    domeMat
  );
  dome.position.y = 0.24;
  ufoGroup.add(dome);

  const pilotMat = cMat({ color: 0xf97316 });
  const shadesMat = cMat({ color: 0x0f172a });
  const pilotHead = new THREE.Mesh(new THREE.SphereGeometry(0.45, 10, 10), pilotMat);
  pilotHead.position.y = 0.62;
  const pilotShades = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.16, 0.18), shadesMat);
  pilotShades.position.set(0, 0.64, 0.38);
  ufoGroup.add(pilotHead, pilotShades);

  // Sinar traktor hijau di bawah UFO tempat sampah dijatuhkan
  const tractorBeam = new THREE.Mesh(new THREE.ConeGeometry(1.45, 3.8, 16, 1, true), beamMat);
  tractorBeam.position.y = -2.35;
  ufoGroup.add(tractorBeam);

  // Indikator target cincin di tanah tepat di bawah UFO
  const targetRingMat = cMat({ color: 0xef4444, emissive: 0x7f1d1d });
  const targetRing = new THREE.Mesh(new THREE.RingGeometry(0.95, 1.2, 20), targetRingMat);
  targetRing.rotation.x = -Math.PI / 2;
  targetRing.position.y = 0.04;
  root.add(targetRing);

  root.visible = false;

  return {
    root,
    ufoGroup,
    tractorBeam,
    targetRing,
    setUfoState(phase, tiltX, hitFlash, dropFlash, explodeProgress) {
      if (explodeProgress > 0) {
        ufoGroup.position.y = 4.35 + Math.sin(explodeProgress * Math.PI) * 2.8 - explodeProgress * 2.2;
        ufoGroup.rotation.x = explodeProgress * 5;
        ufoGroup.rotation.z = explodeProgress * 6;
        const sc = Math.max(0.01, 1 - explodeProgress * 0.92);
        ufoGroup.scale.setScalar(sc);
        tractorBeam.visible = false;
        return;
      }

      ufoGroup.scale.setScalar(1);
      ufoGroup.position.y = 4.35 + Math.sin(phase * 1.2) * 0.28;
      ufoGroup.rotation.z = tiltX;
      ufoGroup.rotation.x = 0.12;
      ufoGroup.position.x = hitFlash > 0 ? Math.sin(hitFlash * 55) * 0.25 : 0;
      ringLights.rotation.y = phase * 0.8;

      tractorBeam.visible = true;
      tractorBeam.scale.setScalar(dropFlash > 0 ? 1.18 : 0.92);
      targetRing.scale.setScalar(0.95 + Math.sin(phase * 2) * 0.1);
      ufoGroup.visible = hitFlash <= 0 || Math.floor(hitFlash * 24) % 2 === 0;
    }
  };
}
