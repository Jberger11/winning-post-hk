// ============================================================
// 3D 立體賽事畫面 (Three.js 原型)
// 以 courseGeometry 的真實賽道形狀建立立體場景：草地帶、欄、
// 樹木、看台、燈柱、影；賽駒為程序低多邊形模型 (horseModel3d)，
// 鏡頭以轉播式 3/4 角度跟蹤焦點馬。2D 畫面不受影響，可隨時切回。
// ============================================================

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import {
  buildRacePath,
  courseCenter,
  COURSE_VIRTUAL_WIDTH,
  COURSE_VIRTUAL_HEIGHT,
  type VenueKey,
} from '../../engine/courseGeometry';
import { buildHorseModel3D, type HorseModel3D } from '../../engine/horseModel3d';

export interface ThreeRunnerMeta {
  id: string;
  cloth: number;
  coat: string;
  silk: string;
  isPlayer: boolean;
}

export interface ThreeHorsePos {
  id: string;
  distance: number;
  lane: number;
  sprint: boolean;
}

interface ThreeRaceViewProps {
  venueKey: VenueKey;
  totalDist: number;
  isNight: boolean;
  isDirt: boolean;
  runners: ThreeRunnerMeta[];
  positions: ThreeHorsePos[];
  selectedHorseId: string | null;
  resetKey: string;
  onUnavailable?: () => void;
}

const S = 0.28; // 虛擬座標 -> 世界單位
const BAND_HALF_V = 27; // 賽道半寬 (虛擬單位)

function mulberry(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const ThreeRaceView: React.FC<ThreeRaceViewProps> = (props) => {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [heightPx, setHeightPx] = useState(400);
  const latestRef = useRef(props);
  latestRef.current = props;

  // 響應式高度：闊畫面用 960:400，直向用較高比例
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const update = () => {
      const w = el.clientWidth || 960;
      setHeightPx(Math.round(w * (w >= 768 ? 400 / 960 : 0.66)));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true });
    } catch {
      props.onUnavailable?.();
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    el.appendChild(renderer.domElement);
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';

    const { venueKey, totalDist, isNight, isDirt, runners } = props;
    const scene = new THREE.Scene();
    const skyDay = new THREE.Color(0x8ec9e8);
    const skyNight = new THREE.Color(0x0d1526);
    scene.background = isNight ? skyNight : skyDay;
    scene.fog = new THREE.Fog(isNight ? 0x0d1526 : 0x8ec9e8, 200, 460);

    const camera = new THREE.PerspectiveCamera(46, 960 / 400, 0.1, 1000);
    camera.position.set(-40, 26, 60);

    const center = courseCenter(venueKey);
    const toWorld = (vx: number, vy: number) =>
      new THREE.Vector3((vx - center.x) * S, 0, (vy - center.y) * S);
    const path = buildRacePath(venueKey, totalDist);
    const turfBase = new THREE.Color(isDirt ? 0xb08d57 : isNight ? 0x2e7d43 : 0x3f9e4d);
    const grassBase = new THREE.Color(isDirt ? 0x9a7a4c : isNight ? 0x256b38 : 0x358544);

    // ---- 場地大平面 ----
    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(300, 48),
      new THREE.MeshStandardMaterial({ color: grassBase.clone().multiplyScalar(0.82), roughness: 1 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.06;
    ground.receiveShadow = true;
    scene.add(ground);

    // ---- 賽道帶 (ribbon) + 內場扇形 ----
    const step = 4;
    const n = Math.max(60, Math.floor(path.totalLoopLength / step));
    const ribbonPos: number[] = [];
    const ribbonCol: number[] = [];
    const ribbonIdx: number[] = [];
    const fanPos: number[] = [];
    const fanCol: number[] = [];
    const fanCenter = toWorld(center.x, center.y);
    const cIn = turfBase.clone();
    const cIn2 = turfBase.clone().multiplyScalar(1.07);
    const cFan = grassBase.clone();
    for (let i = 0; i < n; i++) {
      const s = (i / n) * path.totalLoopLength;
      const p = path.pointAtLoop(s);
      const nx = Math.sin(p.angle);
      const nz = -Math.cos(p.angle);
      const inner = toWorld(p.x - nx * BAND_HALF_V, p.y - nz * BAND_HALF_V);
      const outer = toWorld(p.x + nx * BAND_HALF_V, p.y + nz * BAND_HALF_V);
      ribbonPos.push(inner.x, 0, inner.z, outer.x, 0, outer.z);
      const stripe = Math.floor(s / 55) % 2 === 0 ? cIn : cIn2;
      ribbonCol.push(stripe.r, stripe.g, stripe.b, stripe.r, stripe.g, stripe.b);
      // perp 指向賽道中心，故 +perp 一邊 (outer 變量) 才是內場邊緣
      fanPos.push(outer.x, -0.02, outer.z);
      fanCol.push(cFan.r, cFan.g, cFan.b);
      if (i > 0) {
        const a = (i - 1) * 2;
        ribbonIdx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
    }
    ribbonIdx.push((n - 1) * 2, (n - 1) * 2 + 1, 0, (n - 1) * 2 + 1, 1, 0);
    const ribbonGeo = new THREE.BufferGeometry();
    ribbonGeo.setAttribute('position', new THREE.Float32BufferAttribute(ribbonPos, 3));
    ribbonGeo.setAttribute('color', new THREE.Float32BufferAttribute(ribbonCol, 3));
    ribbonGeo.setIndex(ribbonIdx);
    ribbonGeo.computeVertexNormals();
    const ribbon = new THREE.Mesh(
      ribbonGeo,
      new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, side: THREE.DoubleSide })
    );
    ribbon.receiveShadow = true;
    scene.add(ribbon);

    const fanGeo = new THREE.BufferGeometry();
    const fanAllPos: number[] = [];
    const fanAllCol: number[] = [];
    for (let i = 0; i < n; i++) {
      const a = i * 3;
      const b = ((i + 1) % n) * 3;
      fanAllPos.push(
        fanPos[a], fanPos[a + 1], fanPos[a + 2],
        fanPos[b], fanPos[b + 1], fanPos[b + 2],
        fanCenter.x, -0.02, fanCenter.z
      );
      for (let k = 0; k < 3; k++) fanAllCol.push(fanCol[a], fanCol[a + 1], fanCol[a + 2]);
    }
    fanGeo.setAttribute('position', new THREE.Float32BufferAttribute(fanAllPos, 3));
    fanGeo.setAttribute('color', new THREE.Float32BufferAttribute(fanAllCol, 3));
    fanGeo.computeVertexNormals();
    const fan = new THREE.Mesh(
      fanGeo,
      new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, side: THREE.DoubleSide })
    );
    fan.receiveShadow = true;
    scene.add(fan);

    // ---- 欄杆 (內外圈膠管 + 欄柱) ----
    const railMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.5 });
    for (const sideSign of [-1, 1]) {
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i < n; i += 6) {
        const s = (i / n) * path.totalLoopLength;
        const p = path.pointAtLoop(s);
        const nx = Math.sin(p.angle);
        const nz = -Math.cos(p.angle);
        const off = (BAND_HALF_V + 3) * sideSign;
        const w = toWorld(p.x + nx * off, p.y + nz * off);
        pts.push(new THREE.Vector3(w.x, 1.05, w.z));
      }
      const curve = new THREE.CatmullRomCurve3(pts, true);
      const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 220, 0.09, 6, true), railMat);
      scene.add(tube);
      const postGeo = new THREE.CylinderGeometry(0.05, 0.05, 1.05, 5);
      const posts = new THREE.InstancedMesh(postGeo, railMat, pts.length);
      const m4 = new THREE.Matrix4();
      pts.forEach((pt, i) => {
        m4.setPosition(pt.x, 0.52, pt.z);
        posts.setMatrixAt(i, m4);
      });
      scene.add(posts);
    }

    // ---- 終點柱 ----
    {
      const f = path.finishPoint;
      const nx = Math.sin(f.angle);
      const nz = -Math.cos(f.angle);
      const w = toWorld(f.x - nx * (BAND_HALF_V + 1.5), f.y - nz * (BAND_HALF_V + 1.5));
      const post = new THREE.Mesh(
        new THREE.BoxGeometry(0.22, 3.4, 0.22),
        new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.5 })
      );
      post.position.set(w.x, 1.7, w.z);
      post.castShadow = true;
      scene.add(post);
      const capTop = new THREE.Mesh(
        new THREE.BoxGeometry(0.34, 0.5, 0.34),
        new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.5 })
      );
      capTop.position.set(w.x, 3.5, w.z);
      scene.add(capTop);
    }

    // ---- 看台 (主直路外側，終點前約 220 米處) ----
    {
      const homeMid = path.pointAtRace(totalDist - Math.min(220, totalDist * 0.18));
      const standW = toWorld(homeMid.x, homeMid.y);
      const outNx = -Math.sin(homeMid.angle);
      const outNz = Math.cos(homeMid.angle);
      // 看台中心離跑道中線約 18 世界單位 (欄外約 10 米)
      const standPos = new THREE.Vector3(standW.x + outNx * 18, 0, standW.z + outNz * 18);
      const standLen = COURSE_VIRTUAL_WIDTH * S * 0.34;
      const stand = new THREE.Group();
      const standBody = new THREE.Mesh(
        new THREE.BoxGeometry(standLen, 11, 9),
        new THREE.MeshStandardMaterial({ color: isNight ? 0x334155 : 0x64748b, roughness: 0.9, flatShading: true })
      );
      standBody.position.y = 5.5;
      standBody.castShadow = true;
      stand.add(standBody);
      const roof = new THREE.Mesh(
        new THREE.BoxGeometry(standLen * 1.04, 0.7, 11),
        new THREE.MeshStandardMaterial({ color: 0x1e3a5f, roughness: 0.8, flatShading: true })
      );
      roof.position.y = 11.4;
      stand.add(roof);
      // 人群面 (canvas 紋理：橫帶玻璃 + 彩點人群)
      const cv = document.createElement('canvas');
      cv.width = 1024;
      cv.height = 128;
      const g = cv.getContext('2d')!;
      g.fillStyle = isNight ? '#1e293b' : '#475569';
      g.fillRect(0, 0, 1024, 128);
      g.fillStyle = isNight ? '#fbbf24' : '#bae6fd';
      g.fillRect(0, 8, 1024, 26);
      const rnd = mulberry(42);
      const dotCols = ['#f87171', '#facc15', '#60a5fa', '#f8fafc', '#4ade80', '#fb923c'];
      for (let i = 0; i < 2600; i++) {
        g.fillStyle = dotCols[Math.floor(rnd() * dotCols.length)];
        g.fillRect(rnd() * 1024, 44 + rnd() * 78, 3, 3);
      }
      const crowdTex = new THREE.CanvasTexture(cv);
      const crowd = new THREE.Mesh(
        new THREE.PlaneGeometry(standLen * 0.98, 10.4),
        new THREE.MeshBasicMaterial({ map: crowdTex })
      );
      crowd.position.set(0, 5.6, -4.56);
      crowd.rotation.y = Math.PI;
      stand.add(crowd);
      stand.position.copy(standPos);
      stand.rotation.y = Math.atan2(outNx, outNz);
      scene.add(stand);
    }

    // ---- 樹木 (實例化) ----
    {
      const rnd = mulberry(20261020);
      const samples: THREE.Vector3[] = [];
      for (let i = 0; i < n; i += 2) {
        const s = (i / n) * path.totalLoopLength;
        const p = path.pointAtLoop(s);
        samples.push(toWorld(p.x, p.y));
      }
      const minDistToTrack = (x: number, z: number) => {
        let m = Infinity;
        for (const sp of samples) {
          const d = (sp.x - x) * (sp.x - x) + (sp.z - z) * (sp.z - z);
          if (d < m) m = d;
        }
        return Math.sqrt(m);
      };
      const spots: Array<{ x: number; z: number; sc: number }> = [];
      let guard = 0;
      while (spots.length < 110 && guard++ < 3000) {
        const x = (rnd() * 2 - 1) * (COURSE_VIRTUAL_WIDTH * S * 0.62);
        const z = (rnd() * 2 - 1) * (COURSE_VIRTUAL_HEIGHT * S * 0.95);
        const dTrack = minDistToTrack(x, z);
        const dCenter = Math.hypot(x, z);
        const outsideOk = dTrack > BAND_HALF_V * S + 8;
        // 內場樹要避開鏡頭走廊 (鏡頭在內欄內側約 11-12 單位飛行)
        const infieldOk = dCenter < 58 && dTrack > 17;
        if (outsideOk || infieldOk) spots.push({ x, z, sc: 0.8 + rnd() * 0.9 });
      }
      const trunkGeo = new THREE.CylinderGeometry(0.16, 0.24, 1.7, 6);
      const trunkMat = new THREE.MeshStandardMaterial({ color: 0x795548, roughness: 1, flatShading: true });
      const canGeo = new THREE.IcosahedronGeometry(1.7, 0);
      const canMat = new THREE.MeshStandardMaterial({ roughness: 1, flatShading: true });
      const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, spots.length);
      const cans = new THREE.InstancedMesh(canGeo, canMat, spots.length);
      const m4 = new THREE.Matrix4();
      const q = new THREE.Quaternion();
      const col = new THREE.Color();
      spots.forEach((sp, i) => {
        m4.compose(
          new THREE.Vector3(sp.x, 0.85 * sp.sc, sp.z),
          q,
          new THREE.Vector3(sp.sc, sp.sc, sp.sc)
        );
        trunks.setMatrixAt(i, m4);
        m4.compose(
          new THREE.Vector3(sp.x, (1.7 + 1.2) * sp.sc, sp.z),
          q,
          new THREE.Vector3(sp.sc, sp.sc * 1.15, sp.sc)
        );
        cans.setMatrixAt(i, m4);
        col.setHSL(0.29 + rnd() * 0.06, 0.5, isNight ? 0.2 + rnd() * 0.06 : 0.3 + rnd() * 0.12);
        cans.setColorAt(i, col);
      });
      cans.castShadow = true;
      scene.add(trunks);
      scene.add(cans);
    }

    // ---- 燈光 ----
    const hemi = new THREE.HemisphereLight(
      isNight ? 0x8fb4e8 : 0xbfe3ff,
      isNight ? 0x2c4a2c : 0x3d7a3d,
      isNight ? 1.15 : 0.9
    );
    scene.add(hemi);
    const sun = new THREE.DirectionalLight(isNight ? 0xcfe0ff : 0xfff2d8, isNight ? 1.3 : 1.7);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -60;
    sun.shadow.camera.right = 60;
    sun.shadow.camera.top = 60;
    sun.shadow.camera.bottom = -60;
    sun.shadow.camera.far = 320;
    sun.shadow.bias = -0.0004;
    scene.add(sun);
    scene.add(sun.target);

    // 夜間燈柱
    let nightSpot: THREE.SpotLight | null = null;
    if (isNight) {
      const poleMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.8 });
      const headMat = new THREE.MeshStandardMaterial({
        color: 0xfef9c3,
        emissive: 0xfde68a,
        emissiveIntensity: 2.2,
      });
      for (let i = 0; i < 6; i++) {
        const s = (i / 6) * path.totalLoopLength + 120;
        const p = path.pointAtLoop(s % path.totalLoopLength);
        const nx = Math.sin(p.angle);
        const nz = -Math.cos(p.angle);
        const w = toWorld(p.x + nx * (BAND_HALF_V + 10), p.y + nz * (BAND_HALF_V + 10));
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 17, 6), poleMat);
        pole.position.set(w.x, 8.5, w.z);
        scene.add(pole);
        const headBox = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.5, 0.8), headMat);
        headBox.position.set(w.x, 17, w.z);
        scene.add(headBox);
      }
      nightSpot = new THREE.SpotLight(0xfff3c4, 2.4, 300, Math.PI / 2.6, 0.7);
      nightSpot.decay = 0;
      nightSpot.position.set(0, 55, 0);
      scene.add(nightSpot);
      scene.add(nightSpot.target);
    }

    // ---- 賽駒模型 ----
    interface HorseEntry {
      model: HorseModel3D;
      meta: ThreeRunnerMeta;
    }
    const horses = new Map<string, HorseEntry>();
    for (const r of runners) {
      const model = buildHorseModel3D({ coat: r.coat, silk: r.silk, silkPattern: 0, cloth: r.cloth, night: isNight });
      scene.add(model.group);
      horses.set(r.id, { model, meta: r });
    }

    // ---- 動畫迴圈 ----
    const clock = new THREE.Clock();
    let raf = 0;
    const camPos = new THREE.Vector3(-40, 26, 60);
    const camLook = new THREE.Vector3(0, 1, 0);
    const tmpV = new THREE.Vector3();

    const renderFrame = () => {
      raf = requestAnimationFrame(renderFrame);
      const cur = latestRef.current;
      const posMap = new Map(cur.positions.map((p) => [p.id, p]));
      let focusId: string | null = cur.selectedHorseId;
      if (!focusId || !horses.has(focusId)) {
        const player = cur.runners.find((r) => r.isPlayer);
        focusId = player ? player.id : null;
      }
      if (!focusId) {
        let best = -Infinity;
        for (const p of cur.positions) if (p.distance > best) { best = p.distance; focusId = p.id; }
      }

      let leaderId: string | null = null;
      let leaderBest = -Infinity;
      for (const p of cur.positions) if (p.distance > leaderBest) { leaderBest = p.distance; leaderId = p.id; }

      let focusPos: THREE.Vector3 | null = null;
      let leaderPos: THREE.Vector3 | null = null;
      let focusAngle = 0;
      for (const [id, entry] of horses) {
        const pos = posMap.get(id);
        const d = pos?.distance ?? 0;
        const p = path.pointAtRace(Math.max(0, d));
        // lane 0 = 貼內欄 (perp 指向內場)，欄位愈大愈向外
        const laneOff = 5.4 - (pos?.lane ?? 0) * 1.55;
        const nx = Math.sin(p.angle);
        const nz = -Math.cos(p.angle);
        const w = toWorld(p.x + nx * laneOff / S, p.y + nz * laneOff / S);
        entry.model.group.position.set(w.x, 0, w.z);
        entry.model.group.rotation.y = -p.angle;
        entry.model.pose(Math.max(0, d) * 0.98, pos?.sprint ?? false);
        if (id === focusId) {
          focusPos = entry.model.group.position.clone();
          focusAngle = p.angle;
        }
        if (id === leaderId) leaderPos = entry.model.group.position.clone();
      }

      if (focusPos) {
        const dirX = Math.cos(focusAngle);
        const dirZ = Math.sin(focusAngle);
        const perpX = Math.sin(focusAngle);
        const perpZ = -Math.cos(focusAngle);
        tmpV.set(
          focusPos.x - dirX * 17 + perpX * 6.0,
          6.8,
          focusPos.z - dirZ * 17 + perpZ * 6.0
        );
        // 轉場距離遠時升高鏡頭，避免穿過樹冠
        const transit = camPos.distanceTo(tmpV);
        tmpV.y = 6.8 + Math.min(7, Math.max(0, (transit - 12) * 0.22));
        camPos.lerp(tmpV, 0.055);
        camera.position.copy(camPos);
        // 視點稍向頭馬偏移，頭馬大逃時不致跑出畫面
        let lookX = focusPos.x + dirX * 9;
        let lookZ = focusPos.z + dirZ * 9;
        if (leaderPos && leaderId !== focusId) {
          lookX += (leaderPos.x - focusPos.x) * 0.22;
          lookZ += (leaderPos.z - focusPos.z) * 0.22;
        }
        tmpV.set(lookX, 1.25, lookZ);
        camLook.lerp(tmpV, 0.09);
        camera.lookAt(camLook);
        // 陽光影區跟住焦點
        sun.position.set(focusPos.x + 55, 85, focusPos.z + 35);
        sun.target.position.copy(focusPos);
        // 夜間泛光跟住焦點，馬群所在一段保持夠光
        if (nightSpot) {
          nightSpot.position.set(focusPos.x + 18, 55, focusPos.z + 10);
          nightSpot.target.position.copy(focusPos);
        }
      }
      renderer.render(scene, camera);
    };
    renderFrame();
    void clock;

    const onResize = () => {
      const w = el.clientWidth || 960;
      const h = el.clientHeight || 400;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    onResize();
    const ro = new ResizeObserver(onResize);
    ro.observe(el);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      scene.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
        const mat = (mesh as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
        else if (mat) mat.dispose();
      });
      renderer.dispose();
      if (renderer.domElement.parentElement === el) el.removeChild(renderer.domElement);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.resetKey]);

  return (
    <div
      ref={wrapRef}
      className="relative w-full overflow-hidden bg-slate-900"
      style={{ height: heightPx }}
      data-testid="three-race-view"
    />
  );
};
