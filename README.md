# PIXEL FIT｜像素訓練日記

復古電子雞風格的運動打卡 PWA。React + TypeScript + Vite，資料存在手機本機的 IndexedDB，不需要帳號。

## v1.1 新功能

- **換裝商店**：運動賺金幣（每筆紀錄得到該筆 EXP 的一半、每個徽章 +20、完成階段 +30），買帽子、服裝、遊戲機背景和新寵物，可先試穿再購買。
- **像素寵物**：第一次運動後孵出小雞。可以餵點心（每個運動日得 2 份）、一起玩、摸摸；有飽足度、開心度、親密度。寵物不會生病或離開。

## 部署到 GitHub Pages（推薦）

1. 把專案所有檔案（**不含** `node_modules`）上傳到 GitHub repository `pixel-fit` 的 `main` 分支。
2. 到 repository 的 **Settings → Pages**，Source 選 **GitHub Actions**。
3. `.github/workflows/deploy.yml` 會自動執行 `npm install` 和 `npm run build`，並部署網站。到 **Actions** 分頁看到綠色勾勾後，網址是 `https://<你的帳號>.github.io/pixel-fit/`。
4. 用 iPhone Safari 開啟網址 → 分享 →「加入主畫面」。

## 快速開始（不用安裝任何東西）

`dist/` 資料夾是已經建置好的完整網站，可以直接部署：

1. 打開 <https://app.netlify.com/drop>（免費）
2. 把整個 `dist` 資料夾拖進去
3. 取得 `https://xxxx.netlify.app` 網址 → 用手機 Safari / Chrome 開啟 → 加入主畫面

> PWA 必須透過 **HTTPS** 網址開啟才能安裝與離線使用；直接雙擊 `index.html` 打開是不行的。

## 開發者方式

需要 Node.js 20 以上：

```bash
npm install
npm run dev        # 開發模式，手機與電腦同網路時可用顯示的區網網址測試
npm run build      # 型別檢查 + 建置到 dist/
npm run preview    # 預覽建置結果（localhost 可測 Service Worker）
```

部署：把 `dist/` 上傳到任何靜態主機（Netlify、Vercel、Cloudflare Pages、GitHub Pages 皆可）。`vite.config.ts` 設定 `base: './'`，放在子路徑（例如 GitHub Pages 的 `/pixel-fit/`）也能運作。

## 加入手機主畫面

- **iPhone**：用 Safari 開啟網址 → 分享按鈕 → 加入主畫面
- **Android**：用 Chrome 開啟 → 右上 ⋮ → 安裝應用程式

## PWA 限制（請務必閱讀）

- 資料只存在「這台裝置的這個瀏覽器」。清除瀏覽器資料、刪除主畫面 App、換手機都會遺失，請定期在「角色 → 資料與備份」匯出 JSON。
- iPhone 上，Safari 網頁版與「加入主畫面」後的 App **資料是分開的**；建議一開始就加入主畫面再開始記錄。
- iOS 可能在網站長時間未使用時清除資料；可在設定頁按「請求允許」永久儲存（瀏覽器不一定同意）。
- 離線功能需要先在有網路時開啟過一次。像素字型來自 Google Fonts，第一次離線前未載入時會改用系統等寬字型。
- 沒有推播提醒功能。

## 遊戲規則

| 項目 | 規則 |
| --- | --- |
| 單筆 EXP | 5 分鐘以上：10 EXP，每 10 分鐘 +2（最多算 120 分鐘，34 EXP） |
| 每日首次 | 當天第一筆再 +5 |
| 完成階段 | 每個完成的訓練階段 +50 |
| 升級 | Lv.L → L+1 需要 40 + 20×L EXP |

EXP、等級、徽章都由「目前的真實紀錄」即時計算，不另外累加，所以重新整理、重複點擊都不會重複發放；編輯或刪除紀錄會自動校正。升級與徽章提示的「已提示」狀態有存起來，同一個不會跳第二次。

## 專案結構

```
src/
  main.tsx, App.tsx      進入點、頁面切換（hash 路由，支援返回鍵）
  store.tsx              全域狀態、資料操作、升級/徽章提示、範例階段
  db.ts                  IndexedDB 封裝（records / phases / meta）
  types.ts               資料型別
  sfx.ts                 8-bit 音效（預設靜音）
  logic/                 純函式：日期、EXP/等級、統計、徽章、備份驗證與合併
  components/            像素角色與圖示、面板、按鈕、表單、紀錄列表
  pages/                 Home / CheckIn / Plan / Calendar / Profile
  styles.css             像素風設計系統
public/
  manifest.webmanifest, sw.js, icons/
```

> 原需求提到可用 Dexie.js；這版改用約 100 行的原生 IndexedDB 封裝（`src/db.ts`），少一個依賴、功能相同（含匯入時的單一交易回滾）。
