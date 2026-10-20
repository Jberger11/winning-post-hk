// ==========================================
// 賽道幾何引擎 (Course Geometry)
// 真實馬場是環形賽道，不是直線: 直路 + 兩個彎位組成一圈。
// 起點位置按途程倒推: 1200米只過一個彎，1800米過兩個彎，
// 沙田1000米是直路賽 (專用斜 chute 接入主直路)。
// 虛擬座標: 沙田圈長 1848 單位 (約等於真實一圈米數)，
// 跑馬地圈長 1420 單位。1 單位 = 1 米 (模型比例)。
// ==========================================

export type VenueKey = 'shatin' | 'happy_valley' | 'overseas';

export interface CoursePoint {
  x: number;
  y: number;
  angle: number; // 前進方向 (弧度，canvas 座標)
}

interface VenueShape {
  cx1: number; // 左彎圓心 x
  cx2: number; // 右彎圓心 x
  cy: number; // 圓心 y
  r: number; // 彎位半徑
}

export const COURSE_VIRTUAL_WIDTH = 1060;
export const COURSE_VIRTUAL_HEIGHT = 500;

const VENUES: Record<VenueKey, VenueShape> = {
  // 沙田: 直路 500，彎半徑 135，圈長 2*500 + 2π*135 = 1848
  shatin: { cx1: 330, cx2: 830, cy: 240, r: 135 },
  // 跑馬地: 直路 380，彎半徑 105，圈長 2*380 + 2π*105 = 1420 (窄而急)
  happy_valley: { cx1: 390, cx2: 770, cy: 240, r: 105 },
  overseas: { cx1: 330, cx2: 830, cy: 240, r: 135 },
};

export function venueFromCourseName(courseNameZh: string): VenueKey {
  if (courseNameZh.includes('跑馬地')) return 'happy_valley';
  return 'shatin';
}

type Primitive =
  | { type: 'line'; x1: number; y1: number; x2: number; y2: number; len: number }
  | { type: 'arc'; cx: number; cy: number; r: number; a0: number; a1: number; len: number; name: 'right_bend' | 'left_bend' };

function linePrim(x1: number, y1: number, x2: number, y2: number): Primitive {
  return { type: 'line', x1, y1, x2, y2, len: Math.hypot(x2 - x1, y2 - y1) };
}

function arcPrim(cx: number, cy: number, r: number, a0: number, a1: number, name: 'right_bend' | 'left_bend'): Primitive {
  return { type: 'arc', cx, cy, r, a0, a1, len: Math.abs(a1 - a0) * r, name };
}

function primPoint(p: Primitive, d: number): { x: number; y: number } {
  if (p.type === 'line') {
    const t = p.len === 0 ? 0 : d / p.len;
    return { x: p.x1 + (p.x2 - p.x1) * t, y: p.y1 + (p.y2 - p.y1) * t };
  }
  const a = p.a0 + (p.a1 - p.a0) * (p.len === 0 ? 0 : d / p.len);
  return { x: p.cx + p.r * Math.cos(a), y: p.cy + p.r * Math.sin(a) };
}

export interface RacePath {
  venue: VenueKey;
  distance: number;
  isStraightCourse: boolean;
  totalLoopLength: number; // 環形跑道一圈長度 (直路賽時為主圈長度，作參考)
  finishPoint: CoursePoint;
  startPoint: CoursePoint;
  bendCount: number; // 本場賽事會經過的彎位數 (重疊少於 30 米的起點擦邊不計)
  loopPrimitives: Primitive[]; // 完整一圈 (渲染賽道用)
  /** 由已跑距離 (米) 求賽道位置 */
  pointAtRace(distTravelled: number): CoursePoint;
  /** 由一圈弧長 s 求位置 (渲染/標示用) */
  pointAtLoop(s: number): CoursePoint;
  /** 本場起點在一圈上的弧長位置 */
  startS: number;
  finishS: number;
}

function buildLoopPrimitives(v: VenueShape): Primitive[] {
  const yB = v.cy + v.r;
  const yT = v.cy - v.r;
  return [
    linePrim(v.cx1, yB, v.cx2, yB), // 主直路 (看台前)，左 -> 右
    arcPrim(v.cx2, v.cy, v.r, Math.PI / 2, -Math.PI / 2, 'right_bend'), // 右彎，下 -> 上
    linePrim(v.cx2, yT, v.cx1, yT), // 對面直路，右 -> 左
    arcPrim(v.cx1, v.cy, v.r, -Math.PI / 2, -Math.PI * 1.5, 'left_bend'), // 左彎，上 -> 下
  ];
}

function walkPrimitives(prims: Primitive[], totalLen: number, s: number): CoursePoint {
  let d = ((s % totalLen) + totalLen) % totalLen;
  for (const p of prims) {
    if (d <= p.len || p === prims[prims.length - 1]) {
      const here = primPoint(p, Math.min(d, p.len));
      const ahead = primPoint(p, Math.min(d + 3, p.len));
      let angle = Math.atan2(ahead.y - here.y, ahead.x - here.x);
      if (Math.hypot(ahead.x - here.x, ahead.y - here.y) < 0.01) {
        // 段尾: 用下一段方向
        const idx = prims.indexOf(p);
        const next = prims[(idx + 1) % prims.length];
        const np = primPoint(next, 1);
        const n0 = primPoint(next, 0);
        angle = Math.atan2(np.y - n0.y, np.x - n0.x);
      }
      return { x: here.x, y: here.y, angle };
    }
    d -= p.len;
  }
  const first = primPoint(prims[0], 0);
  return { x: first.x, y: first.y, angle: 0 };
}

export function buildRacePath(venue: VenueKey, distance: number): RacePath {
  const v = VENUES[venue];
  const loop = buildLoopPrimitives(v);
  const straightLen = v.cx2 - v.cx1;
  const arcLen = Math.PI * v.r;
  const totalLoopLength = 2 * straightLen + 2 * arcLen;
  const finishS = straightLen; // 終點在主直路右端 (彎位入口前)
  const finishPoint = walkPrimitives(loop, totalLoopLength, finishS);

  // 沙田 1000 米: 直路賽，斜 chute 接入主直路
  if (venue === 'shatin' && distance === 1000) {
    const chuteFrom = { x: 120, y: 288 };
    const chuteTo = { x: 430, y: v.cy + v.r };
    const chuteLen = Math.hypot(chuteTo.x - chuteFrom.x, chuteTo.y - chuteFrom.y);
    const homeLen = finishPoint.x - chuteTo.x;
    const modelTotal = chuteLen + homeLen;
    const prims: Primitive[] = [
      linePrim(chuteFrom.x, chuteFrom.y, chuteTo.x, chuteTo.y),
      linePrim(chuteTo.x, chuteTo.y, finishPoint.x, finishPoint.y),
    ];
    const pointAtRace = (distTravelled: number): CoursePoint => {
      const modelDist = Math.max(0, Math.min(distance, distTravelled)) * (modelTotal / distance);
      return walkPrimitives(prims, modelTotal, modelDist);
    };
    return {
      venue,
      distance,
      isStraightCourse: true,
      totalLoopLength,
      finishPoint,
      startPoint: pointAtRace(0),
      bendCount: 0,
      loopPrimitives: loop,
      pointAtRace,
      pointAtLoop: (s: number) => walkPrimitives(loop, totalLoopLength, s),
      startS: finishS - distance,
      finishS,
    };
  }

  const startS = finishS - distance;
  const pointAtRace = (distTravelled: number): CoursePoint =>
    walkPrimitives(loop, totalLoopLength, startS + Math.max(0, Math.min(distance, distTravelled)));

  // 數彎位: 賽事路段 [startS, finishS] 與兩個彎位的弧長區間重疊 > 30 米才計
  const arcRanges: [number, number][] = [
    [straightLen, straightLen + arcLen], // 右彎
    [2 * straightLen + arcLen, totalLoopLength], // 左彎
  ];
  let bendCount = 0;
  for (const [a0, a1] of arcRanges) {
    for (let k = -1; k <= 1; k++) {
      const shift = k * totalLoopLength;
      const overlap = Math.min(a1 + shift, finishS) - Math.max(a0 + shift, startS);
      if (overlap > 30) {
        bendCount += 1;
        break;
      }
    }
  }

  return {
    venue,
    distance,
    isStraightCourse: false,
    totalLoopLength,
    finishPoint,
    startPoint: pointAtRace(0),
    bendCount,
    loopPrimitives: loop,
    pointAtRace,
    pointAtLoop: (s: number) => walkPrimitives(loop, totalLoopLength, s),
    startS,
    finishS,
  };
}

/** 賽道中心點 (內場縮放/標籤用) */
export function courseCenter(venue: VenueKey): { x: number; y: number } {
  const v = VENUES[venue];
  return { x: (v.cx1 + v.cx2) / 2, y: v.cy };
}

export function courseShape(venue: VenueKey): VenueShape {
  return VENUES[venue];
}
