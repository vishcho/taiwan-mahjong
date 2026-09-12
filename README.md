# 台灣麻將向聽數分析器

台灣 16 張麻將牌效率工具，依手牌與已知盤面分析向聽數、有效牌、改良牌及最佳捨牌。

目前已提供 **V0.1 可操作版本**。第一版先完成輸入、分析、盤面編輯、分享與 PWA；完整 V1 驗收仍有待辦，見 [交付紀錄](output/first-version.md)。完整定義見 [V1 spec](taiwan-mahjong-shanten-v1-spec.md)。

工作順序與驗收條件見 [實作計畫](output/implementation-plan.md)。

## 本機啟動

使用 Node 22.22.1（版本記錄於 `.nvmrc`）：

```bash
nvm use
npm ci
npm run dev
```

開啟終端顯示的網址，預設為 `http://localhost:5173`。首次會產生查表檔。畫面先載入示例牌局；選單可建立空白盤面，或從「文字輸入」貼上整手牌。點手牌移除，下方鍵盤加入。

正式建置與離線預覽：

```bash
npm run build
npm run preview
```

預覽網址為 `http://localhost:4173`。靜態產物位於 `app/dist`，部署於網站根目錄。PWA 需要 HTTPS 或 localhost；開發伺服器不啟用 Service Worker。畫面出現「可離線使用」後，才可斷線重開。不要直接以 `file://` 開啟建置檔。

## 檢查指令

```bash
npm run tables       # 產生公式表與合法目標距離表
npm run typecheck
npm run lint
npm test             # golden、核心行為、100 組固定 seed 交叉比對
npm run test:cross   # 20,000 組交叉比對
npm run benchmark   # 寫入 output/benchmark.json
```

瀏覽器測試需先完成 build，並安裝 Playwright 瀏覽器與系統依賴：

```bash
npx playwright install --with-deps chromium webkit
npm run test:e2e
```

可用 `npm run test:e2e -- --project=chromium` 單獨執行 Chromium。測試會啟動本機預覽，報告寫入 `output/playwright-report`。

## V1 功能

- 16 張狀態：向聽數、有效牌與剩餘張數、改良牌、最佳牌型拆解。
- 17 張狀態：最佳捨牌、並列結果與其他候選比較。
- 盤面輸入與驗證：手牌、四家副露與牌河、花牌、被叫走的捨牌。
- Mobile-first Web / PWA：點牌、`m/p/s/z` 與中文輸入，即時計算、離線分析、URL 分享完整盤面。

## 計算規則

- 僅支援標準「5 面子 + 1 眼」。槓算 1 個面子、4 張實體牌；花牌只記錄，不參與分析。
- 結構張數為「暗手張數 + 3 × 自己副露面子數」：摸牌前 16 張，摸牌後 17 張。
- 向聽數：`-1` 為胡牌、`0` 為聽牌、`1` 為一向聽，依此類推。第一版補入四張上限修正，避免將「需要第五張同牌」誤判為聽牌，見 spec §7.3。
- 有效牌：摸入並最佳捨牌後可降低向聽數；已聽牌時，則為摸入即可胡牌的牌。
- 受入：有效牌的實際未知剩餘張數總和。每種牌以 4 張扣除已知實體牌，被叫走的捨牌只扣一次；剩餘 0 張不列入主要有效牌。
- 改良牌：摸入並最佳捨牌後，向聽數不變、受入增加；計算時先扣除摸入的那張牌。

最佳捨牌依序比較：向聽數較低、受入較高、有效牌種類較多，完全相同則並列。
V1 不計台數、防守、對手讀牌或特殊胡牌規則。

## 架構

前端採 Vue 3 + TypeScript + Vite，優先設計直版手機介面。視覺已定版：**B 配色 × C 排版**，採墨綠、米色配色與數據排版，後續實作以 [定版預覽](output/visual-directions/selected.html) 為基準。

核心分析在瀏覽器本機執行，與 UI 分離，不依賴後端；盤面透過帶版本的壓縮 URL 分享，不需帳號或資料庫。
Runtime 採合法胡牌目標的單花色距離表與 DP 合併；自己的固定副露會限制每種牌的可用上限。原公式查表與 reference DFS 保留作比對，距離表另與獨立目標 DP 驗證。

分析在 Web Worker 執行，快速輸入時只採用最新請求。17 張先算所有候選，改良牌與拆解在開啟詳情時計算。查表下載後核對版本、長度與 SHA-256；異常時不顯示分析數字。

分享連結保存完整盤面，不含可重新計算的結果。本機保留最近十筆盤面；分享、保存、載入盤面時建立瀏覽紀錄，逐張點牌使用畫面上的復原按鈕。
