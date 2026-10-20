// ============================================================
// 低多邊形 3D 賽馬模型 (Procedural Low-Poly Horse)
// 用 Three.js 基本幾何砌成：身軀/頸/頭/四肢/馬尾/騎師，
// 四肢以旋轉馳騁步法相位驅動關節旋轉。1 unit = 1 米，
// 馬匹面向 +X，地面為 y=0。
// ============================================================

import * as THREE from 'three';

export interface HorseModel3D {
  group: THREE.Group;
  /** 以奔跑相位擺姿勢 (相位由已跑距離推算，與 2D 版一致) */
  pose: (phase: number, sprint: boolean) => void;
}

interface LegRig {
  upper: THREE.Group;
  lower: THREE.Group;
  isHind: boolean;
  phaseOffset: number;
}

function shadeMat(hex: string, f: number): THREE.MeshStandardMaterial {
  const c = new THREE.Color(hex);
  c.multiplyScalar(f);
  return new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, metalness: 0.0, flatShading: true });
}

function clothTexture(cloth: number, silk: string): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null; // node 測試環境無 DOM
  const cv = document.createElement('canvas');
  cv.width = 128;
  cv.height = 128;
  const g = cv.getContext('2d')!;
  g.fillStyle = '#f8fafc';
  g.fillRect(0, 0, 128, 128);
  g.strokeStyle = silk;
  g.lineWidth = 10;
  g.strokeRect(5, 5, 118, 118);
  g.fillStyle = '#111827';
  g.font = '900 84px Arial, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(String(cloth), 64, 70);
  const tex = new THREE.CanvasTexture(cv);
  tex.anisotropy = 4;
  return tex;
}

function makeLeg(
  coatMat: THREE.Material,
  x: number,
  z: number,
  isHind: boolean,
  phaseOffset: number
): { rig: LegRig; group: THREE.Group } {
  const upper = new THREE.Group();
  upper.position.set(x, -0.10, z);
  const upperMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.040, 0.56, 7), coatMat);
  upperMesh.position.y = -0.28;
  upperMesh.castShadow = true;
  upper.add(upperMesh);

  const lower = new THREE.Group();
  lower.position.y = -0.56;
  const cannon = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.028, 0.52, 7), coatMat);
  cannon.position.y = -0.24;
  cannon.castShadow = true;
  lower.add(cannon);
  const hoof = new THREE.Mesh(
    new THREE.BoxGeometry(0.11, 0.07, 0.085),
    new THREE.MeshStandardMaterial({ color: 0x1c1917, roughness: 0.9, flatShading: true })
  );
  hoof.position.set(0.02, -0.50, 0);
  lower.add(hoof);
  upper.add(lower);
  return { rig: { upper, lower, isHind, phaseOffset }, group: upper };
}

export function buildHorseModel3D(opts: {
  coat: string;
  silk: string;
  silkPattern: number;
  cloth: number;
}): HorseModel3D {
  const coatMat = shadeMat(opts.coat, 1.0);
  const coatDarkMat = shadeMat(opts.coat, 0.62);
  const maneMat = shadeMat(opts.coat, 0.36);
  const silkMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(opts.silk),
    roughness: 0.7,
    flatShading: true,
  });
  const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.8, flatShading: true });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x292524, roughness: 0.85, flatShading: true });
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xe8b98a, roughness: 0.8, flatShading: true });

  const group = new THREE.Group();
  const body = new THREE.Group();
  body.position.y = 1.30;
  group.add(body);

  const addMesh = (
    parent: THREE.Object3D,
    geo: THREE.BufferGeometry,
    mat: THREE.Material,
    x = 0,
    y = 0,
    z = 0
  ): THREE.Mesh => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.castShadow = true;
    parent.add(m);
    return m;
  };

  // ---- 身軀：主胴 + 胸 + 臀 ----
  const torso = addMesh(body, new THREE.SphereGeometry(0.52, 12, 9), coatMat);
  torso.scale.set(1.55, 0.64, 0.60);
  const chest = addMesh(body, new THREE.SphereGeometry(0.335, 10, 8), coatMat, 0.58, -0.02, 0);
  chest.scale.set(1, 0.95, 0.88);
  const rump = addMesh(body, new THREE.SphereGeometry(0.36, 10, 8), coatMat, -0.56, 0.03, 0);
  rump.scale.set(1, 0.98, 0.9);

  // ---- 頸 + 頭 ----
  const neck = new THREE.Group();
  neck.position.set(0.70, 0.16, 0);
  neck.rotation.z = -0.62;
  body.add(neck);
  const neckMesh = addMesh(neck, new THREE.CylinderGeometry(0.115, 0.20, 0.88, 8), coatMat, 0, 0.40, 0);
  neckMesh.scale.z = 0.78;
  // 鬃毛
  const mane = addMesh(neck, new THREE.BoxGeometry(0.05, 0.80, 0.09), maneMat, -0.155, 0.40, 0);
  mane.rotation.z = 0.06;
  const head = new THREE.Group();
  head.position.set(0.03, 0.86, 0);
  head.rotation.z = 0.95;
  neck.add(head);
  const skull = addMesh(head, new THREE.BoxGeometry(0.30, 0.20, 0.19), coatMat, 0.02, 0, 0);
  skull.rotation.z = -0.15;
  const muzzle = addMesh(head, new THREE.BoxGeometry(0.30, 0.145, 0.145), coatMat, 0.26, -0.045, 0);
  muzzle.rotation.z = -0.15;
  addMesh(head, new THREE.ConeGeometry(0.045, 0.16, 5), coatDarkMat, -0.06, 0.155, 0.055);
  addMesh(head, new THREE.ConeGeometry(0.045, 0.16, 5), coatDarkMat, -0.06, 0.155, -0.055);
  // 眼
  const eyeGeo = new THREE.SphereGeometry(0.026, 6, 5);
  addMesh(head, eyeGeo, darkMat, 0.10, 0.035, 0.10);
  addMesh(head, eyeGeo, darkMat, 0.10, 0.035, -0.10);

  // ---- 馬尾 ----
  const tail = new THREE.Group();
  tail.position.set(-0.90, 0.14, 0);
  tail.rotation.z = 0.5;
  body.add(tail);
  const tailMesh = addMesh(tail, new THREE.CylinderGeometry(0.028, 0.075, 0.85, 6), maneMat, 0, -0.40, 0);
  tailMesh.rotation.z = 0.15;

  // ---- 四肢 ----
  const legs: LegRig[] = [];
  const legDefs: Array<[number, number, boolean, number]> = [
    // x, z, isHind, phaseOffset (rotary gallop: 近後 0 / 遠後 0.45 / 近前 π+0.35 / 遠前 π+0.8)
    [-0.58, 0.17, true, 0],
    [-0.58, -0.17, true, 0.45],
    [0.58, 0.17, false, Math.PI + 0.35],
    [0.58, -0.17, false, Math.PI + 0.8],
  ];
  for (const [lx, lz, isHind, off] of legDefs) {
    const mat = lz < 0 ? coatDarkMat : coatMat;
    const { rig, group: legGroup } = makeLeg(mat, lx, lz, isHind, off);
    body.add(legGroup);
    legs.push(rig);
  }

  // ---- 馬布 + 號碼 (兩側各一塊平面，避免鏡像) + 鞍 ----
  const clothTex = clothTexture(opts.cloth, opts.silk);
  const clothMat = clothTex
    ? new THREE.MeshStandardMaterial({ map: clothTex, roughness: 0.85 })
    : new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.85 });
  const clothBase = addMesh(body, new THREE.BoxGeometry(0.56, 0.40, 0.635), whiteMat, 0.02, -0.10, 0);
  clothBase.castShadow = false;
  for (const side of [1, -1]) {
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(0.54, 0.38), clothMat);
    plane.position.set(0.02, -0.10, side * 0.325);
    if (side < 0) plane.rotation.y = Math.PI;
    body.add(plane);
  }
  addMesh(body, new THREE.BoxGeometry(0.34, 0.07, 0.30), darkMat, 0.02, 0.315, 0);

  // ---- 騎師 ----
  const jockey = new THREE.Group();
  jockey.position.set(0.0, 0.30, 0);
  body.add(jockey);
  const torsoJ = addMesh(jockey, new THREE.CapsuleGeometry(0.105, 0.30, 3, 8), silkMat, 0.16, 0.22, 0);
  torsoJ.rotation.z = -0.85;
  // 頭 + 帽
  addMesh(jockey, new THREE.SphereGeometry(0.095, 8, 7), skinMat, 0.36, 0.44, 0);
  const cap = addMesh(jockey, new THREE.SphereGeometry(0.10, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2), silkMat, 0.36, 0.465, 0);
  cap.rotation.z = -0.25;
  addMesh(jockey, new THREE.BoxGeometry(0.13, 0.02, 0.10), silkMat, 0.465, 0.45, 0);
  // 手臂 (前伸至頸)
  for (const side of [1, -1]) {
    const arm = addMesh(jockey, new THREE.CylinderGeometry(0.038, 0.034, 0.46, 6), silkMat, 0.42, 0.26, side * 0.13);
    arm.rotation.z = 1.15;
    arm.rotation.x = side * 0.18;
    // 大腿 (白) + 小腿 (黑靴)
    const thigh = addMesh(jockey, new THREE.CylinderGeometry(0.05, 0.045, 0.34, 6), whiteMat, 0.10, -0.02, side * 0.20);
    thigh.rotation.z = 0.5;
    thigh.rotation.x = side * 0.35;
    const boot = addMesh(jockey, new THREE.CylinderGeometry(0.036, 0.032, 0.32, 6), darkMat, 0.20, -0.20, side * 0.235);
    boot.rotation.z = -0.25;
  }

  group.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) o.castShadow = true;
  });

  const pose = (phase: number, sprint: boolean) => {
    const bob = Math.sin(phase * 2 + 0.6) * 0.028 - Math.max(0, Math.sin(phase + 0.4)) * 0.05;
    body.position.y = 1.30 + bob;
    body.rotation.z = Math.sin(phase + 0.5) * 0.035;
    neck.rotation.z = -0.62 + Math.sin(phase + 0.8) * 0.05 - (sprint ? 0.07 : 0);
    tail.rotation.x = Math.sin(phase + 1.2) * 0.16;
    tail.rotation.z = 0.5 + Math.sin(phase * 2) * 0.05;
    for (const leg of legs) {
      const tt = phase + leg.phaseOffset;
      const swing = Math.sin(tt) * 0.78;
      const foldRaw = Math.max(0, Math.sin(tt - 0.9));
      const fold = foldRaw * foldRaw * (leg.isHind ? 0.9 : 1.25);
      leg.upper.rotation.z = swing * 0.92;
      leg.lower.rotation.z = leg.isHind ? fold * 0.95 : -fold * 1.1;
    }
  };

  return { group, pose };
}
