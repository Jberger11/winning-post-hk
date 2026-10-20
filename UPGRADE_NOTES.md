# Upgrade Notes: v2026.2.1 修正與升級 (2026-10-20)

由全面試玩 (live site 逐個流程) + code 審查後整理。本 patch 已通過:
- `npx vitest run`: 22/22 PASS (原 18 + 新增 TEST 19-22; TEST 21 直接驗證拍賣購入入名單兼防重複)
- `npm run build`: TypeScript + Vite 零錯誤

## 已修正的真 bug

### 1. [嚴重] 拍賣會購入: 扣錢但隻馬消失 (可無限重複購入)
- 成因 (兩層):
  - `gameStore.buyHorseAction` 只更改傳入物件的旗標，再複製原有 horses 名單；市場候選馬從來不在名單內，所以新馬永遠不會加入馬房。
  - `HorseMarketScreen` 的候選名單在 component 內以 `Date.now()` 生成 ID，每次 render 都是新 ID，「已購入」判斷永遠對不上。
- 修正: buyHorse 真正將購入馬加入名單並防止重複購入 (同 ID 或同名已擁有即拒絕)；候選名單改為模組層級常數 + 固定 ID。

### 2. [嚴重] 重播 / 臨場戰術指令: 重複結算
- 成因: `viewRaceReplay` 與 `issueTacticalCommand` 都會呼叫 `runRaceSimulation` 重新模擬整場，而該函數同時負責入賬獎金、加戰績、加疲勞 (+25)、改評分、寫賽事紀錄。㩒一次指令 = 隻馬跑多一場；重播一次 = 獎金再入一次。
- 修正:
  - `runRaceSimulation` 新增 `applyResults` 選項；重播以 `applyResults: false` 只生成畫面幀，不結算。
  - 臨場指令不再重新模擬：指令記錄入今場賽果的 `commandHistory` 作賽後檢討，並成為該駒之後出賽的預設跑法 (LiveRaceViewer 提示文字已同步改準)。
- 已知限制 (未在本 patch 處理): 重播重新生成對手陣容時，受賽後戰績/資格過濾影響，陣容可能與原場不同。要做到完全一致重播，需要在賽果中保存完整的 entries 快照 (見下文升級建議 1)。

### 3. [中] 玩家馬檔位可超出出場馬數
- 成因: 玩家檔位一律隨機 1-14，但普通班次只有 12 匹，試玩實測出現「12 匹賽事抽到 13 檔」。
- 修正: 按賽事級別決定檔位上限 (G1/四歲系列 14，其餘 12)。
- 附帶發現: AI 馬檔位是順序分配 1,2,3... (非抽籤)，可預測性高，建議日後改用種子隨機抽籤 (升級建議 2)。

### 4. [中] 存檔安全
- 舊版 localStorage 寫入失敗 (quota) 時會直接刪除存檔。修正為先嘗試精簡存檔 (裁舊歷史/日誌)，再失敗亦保留最後一份好存檔不刪。
- 舊存檔載入時以現版預設值補齊新欄位並遷移分類，避免版本升級後舊檔崩潰 (shallow merge + currentCalendar 合併；玩家已存欄位優先)。
- 導出存檔改用精簡序列化 (剔除 replayFrames)，舊版導出的 JSON 動輒數 MB，難以貼入導入框。

### 5. [小] 英文賽事名露出原始常數
- 動態生成賽事的英文名直接使用 `CLASS_4` 等常數。新增 `getGradeEn` 對照，顯示為 `Class 4` 等 (TEST 19 鎖定)。

### 6. [小] 財務分類錯誤
- 開季 HK$25,000,000 注資舊版歸類為 `prize_money`，令「累積賽事獎金收入」一開局就顯示 2,500 萬。新增交易類別 `capital_injection` (開季注資)，舊存檔載入時自動遷移 (TEST 20 鎖定)。

### 7. [小] 拍賣卡文字
- 「香港國際拍賣會焦點ロット」混入日文片假名，改為「焦點推介」。

## 效能與工程升級

### 8. Code splitting
- 11 個畫面改用 `React.lazy` 按需載入：主 bundle 由 525KB 降至 348KB (gzip 154KB -> 113KB)，每個畫面獨立 chunk 進入時才載入。

### 9. GitHub Actions 自動測試 + 部署
- 新增 `.github/workflows/deploy.yml`：push 到 main 時自動跑 vitest + build + 部署 GitHub Pages。
- 啟用方法: repo Settings -> Pages -> Build and deployment -> Source 選「GitHub Actions」。(啟用前 live 站與本 repo build 產物 hash 一致，確認目前是手動部署。)

## 試玩驗證 (live site, 2026-10-20)
通過的流程: 馬匹檔案 (3 個 tab)、晨操試蹄 + 5 種操練、報名資格審查 (評分超額會被攔)、實況賽事動畫 + 即時賽果 + 賽後報告、配種 (金鎗六十 x 駿逸千金誕生幼駒，扣配種費正確)、設施升級 (扣費正確，資金不足會攔)、推進周次 (沙田 11 場 -> 跑馬地 9 場，周費 HK$535,000，疲勞自然消退)、存檔 reload 後保留、JSON 導出、突發事件、頒獎禮、人物社交。
- 沒有 404、空白頁、死 link。
- 注意: SPA 沒有 history state，瀏覽器「返回」會直接離開網站 (app 內有 sidebar 導航，影響屬小；可在日後以 hash routing 處理，見升級建議 3)。

## 未處理的升級建議 (按價值排序)
1. **賽果保存 entries 快照**: 令重播 100% 重現原場陣容與檔位，而非重新生成。
2. **檔位真抽籤**: AI 與玩家檔位以賽事種子抽籤，配合確定性引擎，做到同種子同檔位。
3. **Hash routing / history**: 瀏覽器返回不離站，兼可分享直達某畫面的連結。
4. **Lint 清理**: `npx oxlint` 現有 62 warnings + 4 errors，絕大多數是 unused imports，可一次過清走並在 CI 加 lint gate。
5. **多存檔槽 + 存檔名稱/時間顯示**: 現時只有單一自動存檔 + JSON 導入導出。
6. **package.json version** 仍是 0.0.0，建議與遊戲版本 (2026.2.x) 同步，方便追蹤部署。
