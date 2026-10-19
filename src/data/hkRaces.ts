// ==========================================
// 香港賽馬會全季完整賽事排位庫 (HKJC Official Full Calendar)
// 沙田日賽 (逢周六/周日) 11場滿額賽事；快活谷夜賽 (逢周三) 9場滿額賽事
// 涵蓋第五班至第一班、四歲經典系列、國際一級至三級賽 (G1-G3) 及海外遠征
// ==========================================

import { RaceDefinition, RaceGrade } from '../types/race';

export const SHA_TIN_WEEKS = new Set<number>([
  1, 3, 5, 6, 8, 10, 11, 14, 16, 18, 19, 22, 23, 26, 27, 30, 33, 35, 37, 38, 41, 43, 44, 47, 48
]);

export function getMeetingInfo(week: number): {
  isShaTin: boolean;
  course: 'shatin' | 'happy_valley';
  courseNameZh: string;
  meetingType: 'day' | 'night';
  meetingTitleZh: string;
  meetingTitleEn: string;
  raceCount: number;
  scheduleDayZh: string;
  dayTextZh: string;
  titleZh: string;
} {
  const isShaTin = SHA_TIN_WEEKS.has(week);
  return {
    isShaTin,
    course: isShaTin ? 'shatin' : 'happy_valley',
    courseNameZh: isShaTin ? '沙田馬場' : '跑馬地馬場 (快活谷)',
    meetingType: isShaTin ? 'day' : 'night',
    meetingTitleZh: isShaTin ? '沙田日賽' : '跑馬地夜賽',
    meetingTitleEn: isShaTin ? 'Sha Tin Day Meeting' : 'Happy Valley Night Meeting',
    raceCount: isShaTin ? 11 : 9,
    scheduleDayZh: isShaTin ? '周六/周日賽事' : '周三夜馬',
    dayTextZh: isShaTin ? '週末日賽' : '周三夜賽',
    titleZh: isShaTin ? '沙田週末日賽 (共 11 場)' : '跑馬地周三夜賽 (共 9 場)',
  };
}

const ST_DISTRICTS = [
  { zh: '尖沙咀', en: 'Tsim Sha Tsui' },
  { zh: '旺角', en: 'Mong Kok' },
  { zh: '中環', en: 'Central' },
  { zh: '銅鑼灣', en: 'Causeway Bay' },
  { zh: '獅子山', en: 'Lion Rock' },
  { zh: '大埔', en: 'Tai Po' },
  { zh: '城門谷', en: 'Shing Mun Valley' },
  { zh: '沙田一哩', en: 'Sha Tin Mile' },
  { zh: '吐露港', en: 'Tolo Harbour' },
  { zh: '火炭', en: 'Fo Tan' },
  { zh: '馬鞍山', en: 'Ma On Shan' },
  { zh: '烏溪沙', en: 'Wu Kai Sha' },
  { zh: '白石角', en: 'Pak Shek Kok' },
  { zh: '九龍塘', en: 'Kowloon Tong' },
  { zh: '深水埗', en: 'Sham Shui Po' },
  { zh: '油麻地', en: 'Yau Ma Tei' },
  { zh: '紅磡', en: 'Hung Hom' },
  { zh: '西九龍', en: 'West Kowloon' },
  { zh: '啟德', en: 'Kai Tak' },
  { zh: '觀塘', en: 'Kwun Tong' },
  { zh: '西貢', en: 'Sai Kung' },
  { zh: '清水灣', en: 'Clear Water Bay' },
  { zh: '將軍澳', en: 'Tseung Kwan O' },
  { zh: '荃灣', en: 'Tsuen Wan' },
  { zh: '葵涌', en: 'Kwai Chung' },
  { zh: '屯門', en: 'Tuen Mun' },
  { zh: '元朗', en: 'Yuen Long' },
  { zh: '天水圍', en: 'Tin Shui Wai' },
  { zh: '上水', en: 'Sheung Shui' },
  { zh: '粉嶺', en: 'Fanling' },
];

const HV_DISTRICTS = [
  { zh: '摩利臣山', en: 'Morrison Hill' },
  { zh: '鵝頸橋', en: 'Bowrington' },
  { zh: '跑馬地錦標', en: 'Happy Valley Trophy' },
  { zh: '黃泥涌', en: 'Wong Nai Chung' },
  { zh: '司徒拔道', en: 'Stubbs Road' },
  { zh: '藍塘道', en: 'Blue Pool Road' },
  { zh: '山光道', en: 'Shan Kwong Road' },
  { zh: '成和道', en: 'Sing Woo Road' },
  { zh: '體育道', en: 'Sports Road' },
  { zh: '禮頓山', en: 'Leighton Hill' },
  { zh: '堅拿道', en: 'Canal Road' },
  { zh: '景光街', en: 'King Kwong Street' },
  { zh: '聚文街', en: 'Tsui Man Street' },
  { zh: '綿發街', en: 'Min Fat Street' },
  { zh: '奕蔭街', en: 'Yik Yam Street' },
  { zh: '載德街', en: 'Tsoi Tak Street' },
  { zh: '源遠街', en: 'Yuen Yuen Street' },
  { zh: '崇德街', en: 'Sung Tak Street' },
  { zh: '樂活道', en: 'Broadwood Road' },
  { zh: '雲地利道', en: 'Ventris Road' },
];

export const OFFICIAL_FEATURE_RACES: RaceDefinition[] = [
  // W1 (沙田開鑼日)
  {
    week: 1,
    raceNumber: 1, // 第一場為開鑼錦標，確保相容測試
    id: 'race_w1_chief_exec_cup',
    nameZh: '第1場: 香港特首盃 (第一班讓賽 1200米)',
    nameEn: 'Race 1: HKSAR Chief Executive Cup (Class 1 1200m)',
    grade: 'CLASS_1',
    course: 'shatin',
    courseNameZh: '沙田草地',
    surface: 'turf',
    distance: 1200,
    purseHKD: 3720000,
    firstPrizeHKD: 2083200,
    conditions: { minRating: 85, maxRating: 115, minAge: 3, maxAge: 9 },
    description: '馬季開鑼日重頭戲，全港頂級短途讓磅健兒齊聚沙田！',
    trophyName: '特首盃',
  },
  // W6
  {
    week: 6,
    raceNumber: 7,
    id: 'race_w6_premier_bowl',
    nameZh: '第7場: 精英碗 (國際二級賽 1200米)',
    nameEn: 'Race 7: The Premier Bowl (Group 2 1200m)',
    grade: 'G2',
    course: 'shatin',
    courseNameZh: '沙田草地',
    surface: 'turf',
    distance: 1200,
    purseHKD: 5350000,
    firstPrizeHKD: 2996000,
    conditions: { minRating: 90, maxRating: 145, minAge: 3, maxAge: 9 },
    description: '香港頂尖短途精英爭奪國際級殊榮，國際賽短途重要前哨戰！',
    trophyName: '精英碗',
  },
  {
    week: 6,
    raceNumber: 8,
    id: 'race_w6_shatin_trophy',
    nameZh: '第8場: 沙田錦標 (國際二級賽 1600米)',
    nameEn: 'Race 8: The Sha Tin Trophy (Group 2 1600m)',
    grade: 'G2',
    course: 'shatin',
    courseNameZh: '沙田草地',
    surface: 'turf',
    distance: 1600,
    purseHKD: 5350000,
    firstPrizeHKD: 2996000,
    conditions: { minRating: 90, maxRating: 145, minAge: 3, maxAge: 9 },
    description: '一哩頂級群雄角逐，金鎗六十與浪漫勇士昔日曾於此亮相！',
    trophyName: '沙田錦標',
  },
  // W8
  {
    week: 8,
    raceNumber: 8,
    id: 'race_w8_ladies_purse',
    nameZh: '第8場: 莎莎婦女銀袋賽 (國際三級賽 1800米)',
    nameEn: 'Race 8: Sa Sa Ladies\' Purse (Group 3 1800m)',
    grade: 'G3',
    course: 'shatin',
    courseNameZh: '沙田草地',
    surface: 'turf',
    distance: 1800,
    purseHKD: 4200000,
    firstPrizeHKD: 2352000,
    conditions: { minRating: 85, maxRating: 130, minAge: 3, maxAge: 9 },
    description: '全城矚目名媛盛會，沙田草地中距離高水準考驗！',
    trophyName: '婦女銀袋',
  },
  // W11 (中銀香港國際賽事預賽日)
  {
    week: 11,
    raceNumber: 7,
    id: 'race_w11_jc_sprint',
    nameZh: '第7場: 中銀香港馬會短途錦標 (國際二級賽 1200米)',
    nameEn: 'Race 7: BOCHK Private Banking Jockey Club Sprint (G2 1200m)',
    grade: 'G2',
    course: 'shatin',
    courseNameZh: '沙田草地',
    surface: 'turf',
    distance: 1200,
    purseHKD: 5350000,
    firstPrizeHKD: 2996000,
    conditions: { minRating: 95, maxRating: 145, minAge: 3, maxAge: 9 },
    description: '香港國際賽事短途終極前哨戰！',
    trophyName: '馬會短途錦標',
  },
  {
    week: 11,
    raceNumber: 8,
    id: 'race_w11_jc_mile',
    nameZh: '第8場: 中銀香港馬會一哩錦標 (國際二級賽 1600米)',
    nameEn: 'Race 8: BOCHK Private Banking Jockey Club Mile (G2 1600m)',
    grade: 'G2',
    course: 'shatin',
    courseNameZh: '沙田草地',
    surface: 'turf',
    distance: 1600,
    purseHKD: 5350000,
    firstPrizeHKD: 2996000,
    conditions: { minRating: 95, maxRating: 145, minAge: 3, maxAge: 9 },
    description: '香港一哩錦標至關重要的最後熱身戰！',
    trophyName: '馬會一哩錦標',
  },
  {
    week: 11,
    raceNumber: 9,
    id: 'race_w11_jc_cup',
    nameZh: '第9場: 中銀香港馬會盃 (國際二級賽 2000米)',
    nameEn: 'Race 9: BOCHK Jockey Club Cup (G2 2000m)',
    grade: 'G2',
    course: 'shatin',
    courseNameZh: '沙田草地',
    surface: 'turf',
    distance: 2000,
    purseHKD: 5350000,
    firstPrizeHKD: 2996000,
    conditions: { minRating: 95, maxRating: 145, minAge: 3, maxAge: 9 },
    description: '中距離香港盃重要指標大賽！',
    trophyName: '馬會盃',
  },
  // W13 (跑馬地 IJC)
  {
    week: 13,
    raceNumber: 8,
    id: 'race_w13_ijc_trophy',
    nameZh: '第8場: 浪琴國際騎師錦標賽 (跑馬地之夜特別讓賽 1650米)',
    nameEn: 'Race 8: LONGINES International Jockeys\' Championship Trophy',
    grade: 'CLASS_2',
    course: 'happy_valley',
    courseNameZh: '跑馬地草地',
    surface: 'turf',
    distance: 1650,
    purseHKD: 3120000,
    firstPrizeHKD: 1747200,
    conditions: { minRating: 80, maxRating: 105, minAge: 3, maxAge: 9 },
    description: '全球 12 位頂尖巨星騎師雲集快活谷！四關積分爭奪騎師王寶座。',
    trophyName: '國際騎師錦標賽盃',
  },
  // W14 (浪琴香港國際賽事 HKIR 四重彩)
  {
    week: 14,
    raceNumber: 4,
    id: 'race_w14_hk_vase',
    nameZh: '第4場: 浪琴香港瓶 (國際一級賽 2400米)',
    nameEn: 'Race 4: LONGINES Hong Kong Vase (G1 2400m)',
    grade: 'G1',
    course: 'shatin',
    courseNameZh: '沙田草地',
    surface: 'turf',
    distance: 2400,
    purseHKD: 24000000,
    firstPrizeHKD: 13440000,
    conditions: { minRating: 98, maxRating: 145, minAge: 3, maxAge: 9 },
    description: '世界長途好手壓境沙田，考驗頂級耐力與轉彎技術！',
    trophyName: '香港瓶 G1',
  },
  {
    week: 14,
    raceNumber: 5,
    id: 'race_w14_hk_sprint',
    nameZh: '第5場: 浪琴香港短途錦標 (國際一級賽 1200米)',
    nameEn: 'Race 5: LONGINES Hong Kong Sprint (G1 1200m)',
    grade: 'G1',
    course: 'shatin',
    courseNameZh: '沙田草地',
    surface: 'turf',
    distance: 1200,
    purseHKD: 26000000,
    firstPrizeHKD: 14560000,
    conditions: { minRating: 100, maxRating: 145, minAge: 3, maxAge: 9 },
    description: '世界草地短途最高榮譽！全球頂尖飛毛腿大對決。',
    trophyName: '香港短途錦標 G1',
  },
  {
    week: 14,
    raceNumber: 7,
    id: 'race_w14_hk_mile',
    nameZh: '第7場: 浪琴香港一哩錦標 (國際一級賽 1600米)',
    nameEn: 'Race 7: LONGINES Hong Kong Mile (G1 1600m)',
    grade: 'G1',
    course: 'shatin',
    courseNameZh: '沙田草地',
    surface: 'turf',
    distance: 1600,
    purseHKD: 32000000,
    firstPrizeHKD: 17920000,
    conditions: { minRating: 100, maxRating: 145, minAge: 3, maxAge: 9 },
    description: '總獎金高達三千二百萬港元，一哩王者登基之地！',
    trophyName: '香港一哩錦標 G1',
  },
  {
    week: 14,
    raceNumber: 8,
    id: 'race_w14_hk_cup',
    nameZh: '第8場: 浪琴香港盃 (國際一級賽 2000米)',
    nameEn: 'Race 8: LONGINES Hong Kong Cup (G1 2000m)',
    grade: 'G1',
    course: 'shatin',
    courseNameZh: '沙田草地',
    surface: 'turf',
    distance: 2000,
    purseHKD: 40000000,
    firstPrizeHKD: 22400000,
    conditions: { minRating: 100, maxRating: 145, minAge: 3, maxAge: 9 },
    description: '全港獎金最豐厚大賽（四千萬港元）！世界中距離至尊榮耀。',
    trophyName: '香港盃 G1',
  },
  // W18 (三冠大賽與速度系列雙首關)
  {
    week: 18,
    raceNumber: 7,
    id: 'race_w18_centenary_sprint',
    nameZh: '第7場: 百週年紀念短途盃 (國際一級賽 1200米 - 速度系列首關)',
    nameEn: 'Race 7: Centenary Sprint Cup (G1 1200m)',
    grade: 'G1',
    course: 'shatin',
    courseNameZh: '沙田草地',
    surface: 'turf',
    distance: 1200,
    purseHKD: 13000000,
    firstPrizeHKD: 7280000,
    conditions: { minRating: 100, maxRating: 145, minAge: 3, maxAge: 9 },
    trophyName: '百週年紀念短途盃 G1',
  },
  {
    week: 18,
    raceNumber: 8,
    id: 'race_w18_stewards_cup',
    nameZh: '第8場: 董事盃 (國際一級賽 1600米 - 三冠大賽首關)',
    nameEn: 'Race 8: Stewards\' Cup (G1 1600m - Triple Crown Leg 1)',
    grade: 'G1',
    course: 'shatin',
    courseNameZh: '沙田草地',
    surface: 'turf',
    distance: 1600,
    purseHKD: 13000000,
    firstPrizeHKD: 7280000,
    conditions: { minRating: 100, maxRating: 145, minAge: 3, maxAge: 9 },
    description: '香港三冠大賽第一關！勝出此賽踏上三冠馬王登基之路。',
    trophyName: '董事盃 G1',
  },
  // W19 (四歲經典一哩)
  {
    week: 19,
    raceNumber: 8,
    id: 'race_w19_classic_mile',
    nameZh: '第8場: 香港經典一哩賽 (四歲馬經典系列 1600米)',
    nameEn: 'Race 8: Hong Kong Classic Mile (4YO Series 1600m)',
    grade: 'CLASSIC_4YO',
    course: 'shatin',
    courseNameZh: '沙田草地',
    surface: 'turf',
    distance: 1600,
    purseHKD: 13000000,
    firstPrizeHKD: 7280000,
    conditions: { minRating: 75, maxRating: 130, minAge: 4, maxAge: 4, isFourYearOldOnly: true },
    description: '四歲新星首度大檢閱！香港打吡大賽首關熱身。',
    trophyName: '香港經典一哩賽',
  },
  // W21 (一月盃)
  {
    week: 21,
    raceNumber: 8,
    id: 'race_w21_january_cup',
    nameZh: '第8場: 一月盃 (國際三級賽 1800米 跑馬地)',
    nameEn: 'Race 8: The January Cup (Group 3 1800m)',
    grade: 'G3',
    course: 'happy_valley',
    courseNameZh: '跑馬地草地',
    surface: 'turf',
    distance: 1800,
    purseHKD: 4200000,
    firstPrizeHKD: 2352000,
    conditions: { minRating: 85, maxRating: 130, minAge: 3, maxAge: 9 },
    description: '跑馬地馬場全季唯一分級賽錦標！',
    trophyName: '一月盃 G3',
  },
  // W22 (香港金盃 & 女皇銀禧)
  {
    week: 22,
    raceNumber: 7,
    id: 'race_w22_queens_silver_jubilee',
    nameZh: '第7場: 女皇銀禧紀念盃 (國際一級賽 1400米 - 速度系列次關)',
    nameEn: 'Race 7: Queen\'s Silver Jubilee Cup (G1 1400m)',
    grade: 'G1',
    course: 'shatin',
    courseNameZh: '沙田草地',
    surface: 'turf',
    distance: 1400,
    purseHKD: 13000000,
    firstPrizeHKD: 7280000,
    conditions: { minRating: 100, maxRating: 145, minAge: 3, maxAge: 9 },
    trophyName: '女皇銀禧紀念盃 G1',
  },
  {
    week: 22,
    raceNumber: 8,
    id: 'race_w22_hk_gold_cup',
    nameZh: '第8場: 花旗銀行香港金盃 (國際一級賽 2000米 - 三冠大賽次關)',
    nameEn: 'Race 8: Citi Hong Kong Gold Cup (G1 2000m - Triple Crown Leg 2)',
    grade: 'G1',
    course: 'shatin',
    courseNameZh: '沙田草地',
    surface: 'turf',
    distance: 2000,
    purseHKD: 13000000,
    firstPrizeHKD: 7280000,
    conditions: { minRating: 100, maxRating: 145, minAge: 3, maxAge: 9 },
    description: '中距離頂峰對決，三冠大賽關鍵第二關！',
    trophyName: '香港金盃 G1',
  },
  // W23 (香港經典盃)
  {
    week: 23,
    raceNumber: 8,
    id: 'race_w23_classic_cup',
    nameZh: '第8場: 香港經典盃 (四歲馬經典系列 1800米)',
    nameEn: 'Race 8: Hong Kong Classic Cup (4YO Series 1800m)',
    grade: 'CLASSIC_4YO',
    course: 'shatin',
    courseNameZh: '沙田草地',
    surface: 'turf',
    distance: 1800,
    purseHKD: 13000000,
    firstPrizeHKD: 7280000,
    conditions: { minRating: 80, maxRating: 130, minAge: 4, maxAge: 4, isFourYearOldOnly: true },
    trophyName: '香港經典盃',
  },
  // W26 (寶馬香港打吡大賽)
  {
    week: 26,
    raceNumber: 8,
    id: 'race_w26_bmw_hk_derby',
    nameZh: '第8場: 寶馬香港打吡大賽 (2000米 - 一生一次至高榮譽！)',
    nameEn: 'Race 8: BMW Hong Kong Derby (2000m - Once in a Lifetime)',
    grade: 'CLASSIC_4YO',
    course: 'shatin',
    courseNameZh: '沙田草地',
    surface: 'turf',
    distance: 2000,
    purseHKD: 26000000,
    firstPrizeHKD: 14560000,
    conditions: { minRating: 85, maxRating: 135, minAge: 4, maxAge: 4, isFourYearOldOnly: true },
    description: '「四歲功名，一生一次！」全港所有馬主與練馬師夢寐以求的打吡大賽！',
    trophyName: '寶馬香港打吡大賽',
  },
  // W27 (杜拜海外遠征)
  {
    week: 27,
    raceNumber: 8,
    id: 'race_w27_dubai_turf_overseas',
    nameZh: '第8場: 【海外遠征】杜拜草地大賽 (國際一級賽 1800米)',
    nameEn: 'Race 8: Dubai Turf (G1 1800m - Meydan)',
    grade: 'G1',
    course: 'overseas',
    courseNameZh: '杜拜美丹馬場',
    surface: 'turf',
    distance: 1800,
    purseHKD: 39000000,
    firstPrizeHKD: 22620000,
    conditions: { minRating: 110, maxRating: 145, minAge: 4, maxAge: 9 },
    description: '遠征阿聯酋美丹馬場！爭奪中東五百萬美元巨額獎金。',
    trophyName: '杜拜草地大賽 G1',
  },
  // W30 (富衛保險冠軍賽馬日 Champions Day)
  {
    week: 30,
    raceNumber: 6,
    id: 'race_w30_chairmans_sprint',
    nameZh: '第6場: 主席短途獎 (國際一級賽 1200米 - 速度系列尾關)',
    nameEn: 'Race 6: Chairman\'s Sprint Prize (G1 1200m)',
    grade: 'G1',
    course: 'shatin',
    courseNameZh: '沙田草地',
    surface: 'turf',
    distance: 1200,
    purseHKD: 22000000,
    firstPrizeHKD: 12320000,
    conditions: { minRating: 100, maxRating: 145, minAge: 3, maxAge: 9 },
    trophyName: '主席短途獎 G1',
  },
  {
    week: 30,
    raceNumber: 7,
    id: 'race_w30_champions_mile',
    nameZh: '第7場: 富衛保險冠軍一哩賽 (國際一級賽 1600米)',
    nameEn: 'Race 7: FWD Champions Mile (G1 1600m)',
    grade: 'G1',
    course: 'shatin',
    courseNameZh: '沙田草地',
    surface: 'turf',
    distance: 1600,
    purseHKD: 22000000,
    firstPrizeHKD: 12320000,
    conditions: { minRating: 100, maxRating: 145, minAge: 3, maxAge: 9 },
    trophyName: '冠軍一哩賽 G1',
  },
  {
    week: 30,
    raceNumber: 8,
    id: 'race_w30_qeii_cup',
    nameZh: '第8場: 富衛保險女皇盃 (國際一級賽 2000米)',
    nameEn: 'Race 8: FWD QEII Cup (G1 2000m)',
    grade: 'G1',
    course: 'shatin',
    courseNameZh: '沙田草地',
    surface: 'turf',
    distance: 2000,
    purseHKD: 28000000,
    firstPrizeHKD: 15680000,
    conditions: { minRating: 100, maxRating: 145, minAge: 3, maxAge: 9 },
    description: '春季國際頂尖對決，日本與歐洲強豪大舉壓境！',
    trophyName: '女皇盃 G1',
  },
  // W33
  {
    week: 33,
    raceNumber: 8,
    id: 'race_w33_queen_mother_cup',
    nameZh: '第8場: 皇太后紀念盃 (國際三級賽 2400米)',
    nameEn: 'Race 8: Queen Mother Memorial Cup (Group 3 2400m)',
    grade: 'G3',
    course: 'shatin',
    courseNameZh: '沙田草地',
    surface: 'turf',
    distance: 2400,
    purseHKD: 4200000,
    firstPrizeHKD: 2352000,
    conditions: { minRating: 80, maxRating: 130, minAge: 3, maxAge: 9 },
    trophyName: '皇太后紀念盃 G3',
  },
  // W35
  {
    week: 35,
    raceNumber: 8,
    id: 'race_w35_champions_chater_cup',
    nameZh: '第8場: 渣打冠軍暨遮打盃 (國際一級賽 2400米 - 三冠大賽終極關)',
    nameEn: 'Race 8: Standard Chartered Champions & Chater Cup (G1 2400m)',
    grade: 'G1',
    course: 'shatin',
    courseNameZh: '沙田草地',
    surface: 'turf',
    distance: 2400,
    purseHKD: 13000000,
    firstPrizeHKD: 7280000,
    conditions: { minRating: 98, maxRating: 145, minAge: 3, maxAge: 9 },
    description: '香港賽馬三冠大賽終極之戰！2400米長力終極大考驗。',
    trophyName: '冠軍暨遮打盃 G1',
  },
  // W37 (日本安田紀念)
  {
    week: 37,
    raceNumber: 8,
    id: 'race_w37_yasuda_kinen_overseas',
    nameZh: '第8場: 【海外遠征】日本安田紀念賽 (國際一級賽 1600米)',
    nameEn: 'Race 8: Yasuda Kinen (G1 1600m - Tokyo)',
    grade: 'G1',
    course: 'overseas',
    courseNameZh: '日本東京競馬場',
    surface: 'turf',
    distance: 1600,
    purseHKD: 21000000,
    firstPrizeHKD: 11200000,
    conditions: { minRating: 110, maxRating: 145, minAge: 3, maxAge: 9 },
    description: '遠征東京競馬場左轉跑道！浪漫勇士曾揚威於此。',
    trophyName: '安田紀念 G1',
  },
  // W38
  {
    week: 38,
    raceNumber: 8,
    id: 'race_w38_premier_plate',
    nameZh: '第8場: 精英碟 (國際三級賽 1800米)',
    nameEn: 'Race 8: Premier Plate (Group 3 1800m)',
    grade: 'G3',
    course: 'shatin',
    courseNameZh: '沙田草地',
    surface: 'turf',
    distance: 1800,
    purseHKD: 4200000,
    firstPrizeHKD: 2352000,
    conditions: { minRating: 85, maxRating: 130, minAge: 3, maxAge: 9 },
    trophyName: '精英碟',
  },
  // W43
  {
    week: 43,
    raceNumber: 8,
    id: 'race_w43_sha_tin_mile_trophy',
    nameZh: '第8場: 沙田一哩錦標 (第一班 1600米)',
    nameEn: 'Race 8: Sha Tin Mile Trophy (Class 1 1600m)',
    grade: 'CLASS_1',
    course: 'shatin',
    courseNameZh: '沙田草地',
    surface: 'turf',
    distance: 1600,
    purseHKD: 3720000,
    firstPrizeHKD: 2083200,
    conditions: { minRating: 85, maxRating: 115, minAge: 3, maxAge: 9 },
    trophyName: '沙田一哩錦標',
  },
  // W44 (馬季煞科日)
  {
    week: 44,
    raceNumber: 8,
    id: 'race_w44_season_finale_sprint',
    nameZh: '第8場: 香港馬季煞科錦標 (第一班 1200米)',
    nameEn: 'Race 8: Season Finale Handicap (Class 1 1200m)',
    grade: 'CLASS_1',
    course: 'shatin',
    courseNameZh: '沙田草地',
    surface: 'turf',
    distance: 1200,
    purseHKD: 3720000,
    firstPrizeHKD: 2083200,
    conditions: { minRating: 85, maxRating: 115, minAge: 3, maxAge: 9 },
    description: '馬季煞科之戰，各路馬房最後衝刺爭奪各項冠軍榮銜！',
    trophyName: '煞科錦標',
  }
];

// 標準班次配置模板 (確保每個賽日五班、四班、三班、二班賽駒皆有常規賽事競逐)
const ST_NORMAL_TEMPLATES = [
  { grade: 'CLASS_5' as RaceGrade, dist: 1400, surface: 'turf' as const, minR: 0, maxR: 40, purse: 875000 },
  { grade: 'CLASS_4' as RaceGrade, dist: 1200, surface: 'dirt' as const, minR: 40, maxR: 60, purse: 1170000 },
  { grade: 'CLASS_4' as RaceGrade, dist: 1200, surface: 'turf' as const, minR: 40, maxR: 60, purse: 1170000 },
  { grade: 'CLASS_4' as RaceGrade, dist: 1400, surface: 'turf' as const, minR: 40, maxR: 60, purse: 1170000 },
  { grade: 'CLASS_4' as RaceGrade, dist: 1600, surface: 'turf' as const, minR: 40, maxR: 60, purse: 1170000 },
  { grade: 'CLASS_3' as RaceGrade, dist: 1200, surface: 'dirt' as const, minR: 60, maxR: 80, purse: 1860000 },
  { grade: 'CLASS_3' as RaceGrade, dist: 1200, surface: 'turf' as const, minR: 60, maxR: 80, purse: 1860000 },
  { grade: 'CLASS_3' as RaceGrade, dist: 1400, surface: 'turf' as const, minR: 60, maxR: 80, purse: 1860000 },
  { grade: 'CLASS_3' as RaceGrade, dist: 1600, surface: 'turf' as const, minR: 60, maxR: 80, purse: 1860000 },
  { grade: 'CLASS_3' as RaceGrade, dist: 1400, surface: 'turf' as const, minR: 60, maxR: 80, purse: 1860000 },
  { grade: 'CLASS_2' as RaceGrade, dist: 1400, surface: 'turf' as const, minR: 80, maxR: 100, purse: 2840000 },
];

const HV_NORMAL_TEMPLATES = [
  { grade: 'CLASS_5' as RaceGrade, dist: 1200, surface: 'turf' as const, minR: 0, maxR: 40, purse: 875000 },
  { grade: 'CLASS_4' as RaceGrade, dist: 1000, surface: 'turf' as const, minR: 40, maxR: 60, purse: 1170000 },
  { grade: 'CLASS_4' as RaceGrade, dist: 1200, surface: 'turf' as const, minR: 40, maxR: 60, purse: 1170000 },
  { grade: 'CLASS_4' as RaceGrade, dist: 1200, surface: 'turf' as const, minR: 40, maxR: 60, purse: 1170000 },
  { grade: 'CLASS_4' as RaceGrade, dist: 1650, surface: 'turf' as const, minR: 40, maxR: 60, purse: 1170000 },
  { grade: 'CLASS_3' as RaceGrade, dist: 1000, surface: 'turf' as const, minR: 60, maxR: 80, purse: 1860000 },
  { grade: 'CLASS_3' as RaceGrade, dist: 1200, surface: 'turf' as const, minR: 60, maxR: 80, purse: 1860000 },
  { grade: 'CLASS_3' as RaceGrade, dist: 1650, surface: 'turf' as const, minR: 60, maxR: 80, purse: 1860000 },
  { grade: 'CLASS_2' as RaceGrade, dist: 1200, surface: 'turf' as const, minR: 80, maxR: 100, purse: 2840000 },
];

function getGradeZh(grade: RaceGrade): string {
  switch (grade) {
    case 'CLASS_5': return '第五班';
    case 'CLASS_4': return '第四班';
    case 'CLASS_3': return '第三班';
    case 'CLASS_2': return '第二班';
    case 'CLASS_1': return '第一班';
    case 'CLASSIC_4YO': return '四歲經典系列';
    case 'G3': return '國際三級賽';
    case 'G2': return '國際二級賽';
    case 'G1': return '國際一級賽';
    default: return grade;
  }
}

// 動態構建全季 48 周完整賽事排位 (沙田 11 場、跑馬地 9 場)
export function generateFullSeasonCalendar(): RaceDefinition[] {
  const allRaces: RaceDefinition[] = [];

  for (let week = 1; week <= 48; week++) {
    const isShaTin = SHA_TIN_WEEKS.has(week);
    const targetRaceCount = isShaTin ? 11 : 9;
    const course = isShaTin ? ('shatin' as const) : ('happy_valley' as const);

    const featuresThisWeek = OFFICIAL_FEATURE_RACES.filter(f => f.week === week);
    const meetingRaces = new Array<RaceDefinition>(targetRaceCount);

    // 1. 安插本周錦標大賽
    for (const feat of featuresThisWeek) {
      let assignedIndex = feat.raceNumber ? feat.raceNumber - 1 : targetRaceCount - 3;
      while (assignedIndex >= targetRaceCount || meetingRaces[assignedIndex]) {
        assignedIndex = (assignedIndex + 1) % targetRaceCount;
      }
      meetingRaces[assignedIndex] = { ...feat, raceNumber: assignedIndex + 1 };
    }

    // 2. 用常規五、四、三、二班讓賽填補其餘場次
    const templates = isShaTin ? ST_NORMAL_TEMPLATES : HV_NORMAL_TEMPLATES;
    const districtList = isShaTin ? ST_DISTRICTS : HV_DISTRICTS;

    for (let slot = 0; slot < targetRaceCount; slot++) {
      if (meetingRaces[slot]) continue;

      const tmpl = templates[slot % templates.length];
      const distObj = districtList[(week * 7 + slot) % districtList.length];
      const raceNumber = slot + 1;
      const isDirt = tmpl.surface === 'dirt';
      const courseNameZh = isShaTin
        ? (isDirt ? '沙田全天候泥地' : '沙田草地')
        : '跑馬地草地';

      const surfaceTagZh = isDirt ? ' (泥地)' : '';
      const classZh = getGradeZh(tmpl.grade);

      meetingRaces[slot] = {
        id: `race_w${week}_r${raceNumber}_${tmpl.grade.toLowerCase()}_${tmpl.dist}`,
        raceNumber,
        nameZh: `第${raceNumber}場: ${distObj.zh}讓賽 (${classZh} ${tmpl.dist}米${surfaceTagZh})`,
        nameEn: `Race ${raceNumber}: ${distObj.en} Handicap (${tmpl.grade} ${tmpl.dist}m)`,
        grade: tmpl.grade,
        course,
        courseNameZh,
        surface: tmpl.surface,
        distance: tmpl.dist,
        purseHKD: tmpl.purse,
        firstPrizeHKD: Math.round(tmpl.purse * 0.56),
        conditions: {
          minRating: tmpl.minR,
          maxRating: tmpl.maxR,
          minAge: 3,
          maxAge: 9,
        },
        week,
      };
    }

    for (let i = 0; i < targetRaceCount; i++) {
      allRaces.push(meetingRaces[i]);
    }
  }

  return allRaces;
}

export const HK_RACES_CALENDAR: RaceDefinition[] = generateFullSeasonCalendar();

