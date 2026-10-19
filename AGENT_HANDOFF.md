# Agent Handoff: Winning Post 10 2026 香港殿堂傳奇 (v2026.2.0 大升級)

## Goal
結合《Winning Post 10 2026》香港馬房配種經營與 `https://jockeylifesim.app/`（騎師人生）的核心玩法精髓，完成深度系統升級。

### Current Status
✅ **已全面實裝並通過驗證 (18/18 Vitest 單元測試 + 生產環境 Build + Chrome 桌面與 390px 手機版實機驗證)**。

## 本次大升級實裝項目 (Jockey Life x Winning Post 10 HK Upgrade)
1. **臨場戰術指揮面板 (`LiveRaceViewer.tsx` & `gameStore.ts`)**：
   - 於 2.5D 直播畫面頂部加入「🎯 臨場戰術指揮」面板，玩家可隨時向鞍上人下達「⚡ 貼欄快放搶欄」、「🛡️ 守二疊好位」、「🌀 中段順勢推進」、「🔥 大外一氣衝刺」指令，即時調整賽事步速、走位與賽後檢討報告。
2. **賽後詳細戰術檢討與練馬師評語 (`RaceResultModal.tsx` & `gameplayUpgradeEngine.ts`)**：
   - 完賽報告新增「賽前預期名次 vs 實際名次」評價（如 `🔥 超水準神級發揮`、`✨ 跑出好過預期`）。
   - 結構化拆解四大戰術得失因子：`彎位走位`（計算平均疊數與蝕位馬位）、`步速與臨場指令`、`直路際遇`（統計受困秒數與望空表現）、`末段體力分配`（400m 剩餘體力檢討）及 `終點壓線`。
   - 附上地道廣東話 **🎙️ 練馬師賽後評語** 與 **⚖️ 香港賽馬會競賽小組報告 (Stewards' Report)**，並連動人馬合拍度與練馬師信任度增減。
3. **《馬圈日報・香港版》頭條與馬房手風走勢 (`DashboardScreen.tsx` & `gameplayUpgradeEngine.ts`)**：
   - 大本營頂部新增《馬圈日報》報紙排版，動態生成本周焦點大賽頭條、馬房捷報、晨操風向與騎師動態。
   - 追蹤馬房近 10 戰名次，動態顯示 **手風走勢徽章**（`🔥 手風極順` / `📈 狀態上揚` / `➖ 表現平穩` / `📉 手風轉冷` / `🥶 頭馬荒`）。
4. **今日晨操試蹄考驗與人馬合拍度 (`TrainingScreen.tsx` & `gameplayUpgradeEngine.ts`)**：
   - 新增「🏇 今日晨操試蹄考驗」，由主理練馬師下達分段時間指令（例如 `24.8s → 23.5s → 21.8s`），玩家選擇主操騎師與執行方式，即時獲得 `S / A / B` 評級（細分指示執行、步速掌握、馬匹放鬆分數），大幅提升能力現值與「人馬合拍度 (`horseJockeyAffinity`)」。
5. **馬圈突發事件抉擇、人脈社交圈與季末香港冠軍人馬獎頒獎禮 (`DashboardScreen.tsx`, `JockeysTrainersScreen.tsx`, `WorldRankingsScreen.tsx`)**：
   - **馬圈突發事件抉擇**：推進周次或點擊大本營「馬圈突發事件」可觸發「⚔️ 帥印爭奪戰」、「🥂 跑馬地夜賽遴選會員廂房晚宴」、「🎙️ 馬圈日報獨家專訪」等互動事件。
   - **季末香港冠軍人馬獎頒獎典禮**：頒發年度香港馬王、冠軍練馬師、冠軍騎師，並提供 3 項上台致辭感言選擇（帶來全體練馬師信任、馬房聲望或全體賽駒士氣加成）。
   - **騎師與練馬師人脈社交**：於人物名鑑加入「🍵 飲早茶」、「🥂 廂房飯局」、「🍽️ 會所晚宴」、「⛳ 高球聚會」互動按鈕及交情／信任度進度條，並於榮譽殿堂新增 6 大「🏅 馬房生涯成就殿堂」徽章。

## Files Created & Changed
- `src/engine/gameplayUpgradeEngine.ts` (新增核心升級引擎)
- `src/types/race.ts`, `src/types/person.ts`, `src/types/game.ts` (擴充戰術檢討、人脈交情、突發事件與頒獎禮型別)
- `src/data/hkPeople.ts` (補完香港騎師與練馬師初始交情、手風、招牌騎法與練馬作風)
- `src/engine/calendarEngine.ts` & `src/engine/gameStore.ts` (串聯賽後檢討、手風、合拍度、晨操試蹄、事件抉擇、社交與頒獎禮 Actions)
- `src/components/screens/DashboardScreen.tsx`, `LiveRaceViewer.tsx`, `RaceResultModal.tsx`, `TrainingScreen.tsx`, `JockeysTrainersScreen.tsx`, `WorldRankingsScreen.tsx`
- `src/tests/simulation.test.ts` (新增 TEST 18 驗證戰術檢討、手風走勢與晨操試蹄評分)

## Validation Performed
- `cmd /c "npx vitest run"`：18 項單元測試全數 PASS。
- `cmd /c "npm run build"`：TypeScript 與 Vite 生產環境打包零錯誤通過。
- `chrome-devtools`：於 `http://localhost:4173/` 完成桌面版 (1280x800) 與手機版 (390x844) 實機交互檢查。
