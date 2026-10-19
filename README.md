# 賽馬經理人 10 2026: 香港殿堂傳奇 (Winning Post 10: Hong Kong Dynasty)

## 專案概述 (Project Overview)
本遊戲深度參考光榮特庫摩（Koei Tecmo）經典賽馬模擬巨作 **《Winning Post 10 2026》（名馬大亨 10 2026）**，全面在地化為**香港賽馬會（HKJC）賽制與廣東話名馬世界**。

遊戲建基於香港賽馬實時官方評分資料庫（浪漫勇士、嘉應高昇、金鎗六十、遨遊氣泡、錶之銀河、大至尊等名駒），重現沙田馬場、跑馬地快活谷及從化訓練中心三大基地，結合 Winning Post 10 2026 最新核心系統（始祖系統 Founder Sire Lines、繁殖母馬活力度 Broodmare Vitality、名馬羈絆劇情因子 Drama Factors、四代血統樹、確定性 0.2s 物理實況賽馬模擬）。

---

## 專案路徑與工作區建議 (Workspace Location)
- **專案實體目錄**：`C:\Users\Shackie\.gemini\antigravity\scratch\winning-post-hk`
- **建議操作**：建議將此目錄設定為 Antigravity / Codex 的 Active Workspace，方便進行後續擴展與版本控制。

---

## 核心系統架構與實作清單

### 1. 週曆循環引擎 (Weekly Turn Engine - Calendar Progression)
- **48 週完整香港馬季**（9月馬季開鑼至7月中旬煞科，約 88 次日賽與夜賽）。
- **週次進程自動處理**：
  - 每周扣除馬房養馬費（每匹 HK$15,000）與從化設施維護費。
  - 馬匹體能自然消退疲勞、傷患康復檢查。
  - 煞科季結：年齡自動增長一歲、高齡退役評估、香港馬王與各項大獎結算。

### 2. 香港賽駒數據庫與 10 大能力值 (Horse Database & Attributes)
- **10 大能力維度（1-100）**：
  - 速度 (Speed)、耐力 (Stamina)、爆發力 (Acceleration)、力量 (Power)、鬥心 (Guts)、靈性 (Intelligence)、脾氣 (Temperament)、體質 (Health)、距離適應 (Flexibility)、穩定性 (Consistency)。
- **天賦天花板（Genetic Ceiling）**：幼駒出生具備隱藏上限，透過晨操調教突破。
- **成熟曲線**：早熟型 (2-4歲)、普通型 (3-6歲)、晚熟型 (5-7歲)、持效長青型 (巔峰綿延)。
- **香港評分與班次體系**：
  - 自購新馬 (PPG) 初出評 52 分。
  - 第五班 (0-40分)、第四班 (40-60分)、第三班 (60-80分)、第二班 (80-100分)、第一班 (85-110分)、分級賽精英班 (100-145分)。

### 3. 確定性實況賽事物理引擎 (Deterministic 0.2s Racing Engine)
- **高權威物理模型**：每 0.2 秒計算基準秒速、讓磅負磅懲罰、場地適應、跑道內外疊、體力消耗比率、直路衝刺爆發。
- **跑法戰術**：
  - **領放 (Front-Runner)**：出閘搶放，前段快步速，消耗體力大。
  - **前領 (Stalker)**：緊守前列二三位好位，出彎發力。
  - **居中 (Midfield)**：保留體力，入直路強勁加速。
  - **後勁 (Closer)**：留守後方，最後400米大外一氣極限爆發。
- **受阻判定 (Traffic Boxed-in)**：前列受困阻滯及騎師走位抽外疊化解。
- **Mulberry32 隨機種子**：相同種子百分之百重現相同賽果（TEST 01 通過）。
- **廣東話現場旁述廣播**：出閘、半程、轉入直路、最後五十米衝刺全程字幕廣播。

### 4. 香港賽馬會完整賽程數據庫 (HKJC Race Fixtures)
- **香港三冠大賽 (Triple Crown)**：董事盃 (1600m G1) → 香港金盃 (2000m G1) → 冠軍暨遮打盃 (2400m G1)。
- **四歲馬經典賽事系列 (4-Year-Old Classic Series)**：
  - 香港經典一哩賽 (1600m) → 香港經典盃 (1800m) → **寶馬香港打吡大賽 (2000m 一生一次至高榮譽！)**
- **浪琴香港國際賽事 (Longines HKIR)**：香港短途錦標 (1200m G1)、香港一哩錦標 (1600m G1)、香港盃 (2000m G1 總獎金4000萬)、香港瓶 (2400m G1)。
- **富衛保險冠軍賽馬日 (Champions Day)**：主席短途獎 (1200m G1)、冠軍一哩賽 (1600m G1)、女皇盃 (2000m G1)。
- **海外遠征**：杜拜美丹杜拜草地大賽 (G1 1800m)、日本東京安田紀念賽 (G1 1600m)。
- **各級讓賽**：沙田草地、沙田泥地、跑馬地夜賽 1000m - 2400m 各班次讓賽。

### 5. WP10 2026 血統配種繁育中心 (Breeding & Genetics)
- **始祖系統 (Founder Sire Lines)**：Acclamation系、Sunday Silence系、Northern Dancer系、Danehill系等。
- **繁殖母馬活力度 (Broodmare Vitality)**：休養良好之年輕母馬提供天賦上限加成。
- **名馬羈絆因子 (Drama Factors)**：父母榮譽成就傳承子嗣。
- **近親交配係數 (Inbreeding Coefficient)**：精準分析四代血統，警示超過 15% 近親衰退，防範自我循環。

### 6. 晨操調教與從化基地 (Training & Conghua)
- 沙田草地晨操快跳 (速度/爆發)
- 內圈踱步慢跳 (靈性/穩定/情緒)
- 1200米大閘試閘 (出閘/鬥心)
- 從化馬匹專用泳池 (零負擔心肺耐力)
- 從化溫泉水療及高壓氧放草 (消減疲勞 -35，加速傷患康復)

### 7. 香港國際馬匹拍賣會 (HKIS) & 自購馬市場 (Market)
- 香港國際拍賣會 (HKIS) 精選未出賽名門幼駒
- 澳洲/紐西蘭分級賽自購馬 (PP)
- 自購新馬 (PPG)

### 8. 馬房財務流水賬 (Financial Ledger)
- 賽事獎金實收分賬（馬主 70% 份額）
- 每周養馬費與員工薪酬
- 設施營建擴展
- 配種支出

---

## 自動化測試驗證 (Automated Vitest Suite)
執行 `npx vitest run`：
```
✓ TEST 01: 相同賽事種子必須產生完全一致的確定性賽果 (Deterministic Reproduction)
✓ TEST 02: 賽駒未跑畢全賽程不得過終點 (Distance completion integrity)
✓ TEST 03: 同一騎師不可在同一場賽事中分身策騎兩匹馬 (No Jockey Conflict)
✓ TEST 04: 未達條件資格之賽駒不得報名參賽 (Ineligible race entry prevention)
✓ TEST 05: 傷患賽駒於醫療期內禁止出賽 (Injured horse blocked from racing)
✓ TEST 06: 賽事總獎金正確分發，首名獎金依比例分發 (Prize distribution)
✓ TEST 07: 賽駒不可將自身視為祖先 (No self ancestor recursion)
✓ TEST 08: 配種禁止自身同體繁殖 (Relationship restriction enforcement)
✓ TEST 10: 跨季推進一年，賽駒年齡正確增長 (Season year advancement)
✓ TEST 11 & 12: 存檔序列化與反序列化完整保存屬性與血統 (Save/load integrity)
✓ TEST 13: 多代繁育血脈延續無崩潰 (Multi-generational breeding continuity)
✓ TEST 15: 能力值顯著優勢的賽駒在長期模擬中體現勝率優勢 (Ability reflects outcome)
```
全部 12 項核心引擎測試通過（100% Pass）。

---

## 啟動與遊玩指令 (How to Run)
在 `C:\Users\Shackie\.gemini\antigravity\scratch\winning-post-hk` 目錄下：
```bash
# 開發模式
npm run dev

# 或是建置後預覽
npm run build
npm run preview -- --port 4173
```
瀏覽器開啟 `http://localhost:4173/` 即可即時體驗！
支援電腦寬螢幕與手機 390px 響應式佈局。
