// ==========================================
// 設施與經濟類型定義 (Facilities & Economy)
// ==========================================

export type FacilityType =
  | 'stables'           // 沙田主馬房容量擴展
  | 'conghua_track'     // 從化登山木屑跑道 (爆發力/耐力提升)
  | 'equine_pool'       // 馬匹專用游泳池 (減低關節負擔、調教心肺)
  | 'spa_therapy'       // 從化天然溫泉水療及高壓氧艙 (疲勞快速消退)
  | 'vet_centre'        // 現代化運動醫學及獸醫中心 (受傷抵抗及加速康復)
  | 'breeding_ranch'    // 頂級血統育馬牧場 (海外/從化配種中心)
  | 'foal_nursery';     // 幼駒保育幼兒園 (提升早熟幼駒天賦上限)

export interface FacilityUpgrade {
  id: FacilityType;
  nameZh: string;
  nameEn: string;
  level: number; // 1 to 5
  maxLevel: number;
  costHKD: number; // 升級費用
  maintenanceWeeklyHKD: number; // 每周維護費
  descriptionZh: string;
  effectDescriptionZh: string;
}

export type TransactionType =
  | 'prize_money'       // 賽事獎金
  | 'horse_purchase'    // 購入賽駒 / 拍賣會拍得
  | 'horse_sale'        // 出售賽駒
  | 'entry_fee'         // 賽事報名費
  | 'stable_upkeep'     // 養馬費與馬伕工資
  | 'facility_upgrade'  // 設施興建與升級
  | 'facility_maint'    // 設施日常維護
  | 'stud_fee';         // 配種費收益或支出

export interface FinancialTransaction {
  id: string;
  year: number;
  week: number;
  type: TransactionType;
  amountHKD: number; // 正數為收入，負數為支出
  descriptionZh: string;
  timestamp: string;
}
