// ==========================================
// 人物類型定義 (People: Jockeys, Trainers, Owners)
// ==========================================

export interface Jockey {
  id: string;
  nameZh: string;
  nameEn: string;
  avatar: string;
  rating: number; // 1-100
  experience: number; // 經驗 (1-100)
  positioning: number; // 走位搶位 (1-100)
  paceControl: number; // 步速控制感 (1-100)
  finishing: number; // 最後衝刺發力 (1-100)
  weightClaim: number; // 讓磅 (0磅為大師傅, 見習生如 2, 5, 7, 10 磅)
  totalRides: number;
  totalWins: number;
  winRate: number; // 勝率
  preferredTrack: 'shatin' | 'happy_valley' | 'both';
  isAvailable: boolean;
  bond?: number; // -100 to 100 與馬房交情/關係 (摯友 / 好友 / 友好 / 普通 / 宿敵)
  formStreak?: 'hot' | 'warm' | 'normal' | 'cold'; // 近期手風走勢
  specialtyZh?: string; // 招牌騎法
}

export interface Trainer {
  id: string;
  nameZh: string;
  nameEn: string;
  avatar: string;
  rating: number; // 1-100
  specialty: 'sprint' | 'mile' | 'staying' | 'early_maturing' | 'conghua_care'; // 短途專家, 一哩至中距離, 長途長力, 兩三歲早熟, 從化調理
  specialtyZh: string;
  stablesCapacity: number;
  trainingBonus: number; // 額外晨操成長加成
  totalRuns: number;
  totalWins: number;
  winRate: number;
  trust?: number; // 0 to 100 合作信任度
  personalBond?: number; // 0 to 100 私人交情
  styleZh?: string; // 練馬作風
}

export type OwnerPersonality =
  | 'player'
  | 'wealthy_collector'    // 豪門馬主：不計成本重金收購 G1 頂級佳駟
  | 'breeding_specialist'  // 育馬狂熱：注重長遠父系及繁育血統
  | 'racing_champion'      // 冠軍追逐者：全力出擊大賽錦標
  | 'commercial_trader'    // 商業貿易：低買高賣炒賣自購馬
  | 'conservative_owner';  // 務實穩健：專注四五班實用馬匹

export interface Owner {
  id: string;
  nameZh: string;
  isPlayer: boolean;
  personality: OwnerPersonality;
  fundsHKD: number;
  silkColor: string;
  reputation: number;
}
