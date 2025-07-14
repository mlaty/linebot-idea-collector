# Line Bot with Google Sheets Integration

這是一個可以累積訊息並儲存到 Google Sheets 的 Line 機器人。用戶可以發送文字訊息，機器人會自動在後台累積這些訊息，當用戶輸入 `/save` 指令時，會將所有累積的訊息一次性儲存到 Google Sheets 中。

## 功能特色

- 🤖 自動累積用戶發送的文字訊息
- 💾 使用 `/save` 指令將累積的訊息儲存到 Google Sheets
- 👥 支援多用戶同時使用，每位用戶的訊息獨立累積
- ☁️ 適合部署在 Zeabur 平台
- 📊 自動記錄時間戳記和用戶 ID
- 🔄 儲存後自動清空累積的訊息

## 技術架構

- **Backend**: Node.js + Express
- **Line SDK**: @line/bot-sdk
- **Google API**: googleapis
- **部署平台**: Zeabur
- **資料儲存**: Google Sheets

## 詳細設定步驟

### 1. Line Bot 設定

#### 1.1 創建 Line Developer Account
1. 前往 [Line Developer Console](https://developers.line.biz/console/)
2. 使用你的 Line 帳號登入
3. 如果是第一次使用，需要同意開發者條款

#### 1.2 創建 Provider 和 Channel
1. 點擊「Create Provider」創建供應商
2. 填入 Provider 名稱（例如：MyBot Provider）
3. 點擊「Create」
4. 在 Provider 頁面中，點擊「Create Channel」
5. 選擇「Messaging API」
6. 填入以下資訊：
   - **Channel name**: 機器人名稱（例如：訊息累積機器人）
   - **Channel description**: 機器人描述
   - **Category**: 選擇適當的分類
   - **Subcategory**: 選擇適當的子分類
   - **Email address**: 你的聯絡信箱
7. 同意條款並點擊「Create」

#### 1.3 取得必要的 Token 和 Secret
1. 在 Channel 頁面中，找到「Basic settings」標籤
2. 複製「Channel secret」
3. 切換到「Messaging API」標籤
4. 在「Channel access token」區域點擊「Issue」
5. 複製產生的 Access Token
6. 在「Webhook settings」中：
   - 將「Use webhook」設為 Enabled
   - Webhook URL 暫時留空（部署後再填入）

### 2. Google Sheets API 設定

#### 2.1 創建 Google Cloud 專案
1. 前往 [Google Cloud Console](https://console.cloud.google.com/)
2. 使用你的 Google 帳號登入
3. 點擊專案選擇器，然後點擊「新增專案」
4. 輸入專案名稱（例如：LineBot-GoogleSheets）
5. 選擇組織（如果有的話）
6. 點擊「建立」

#### 2.2 啟用 Google Sheets API
1. 在 Google Cloud Console 中，確保你選擇了正確的專案
2. 在左側選單中，點擊「API 和服務」→「程式庫」
3. 搜尋「Google Sheets API」
4. 點擊「Google Sheets API」
5. 點擊「啟用」按鈕

#### 2.3 創建服務帳戶
1. 在左側選單中，點擊「API 和服務」→「憑證」
2. 點擊「+ 建立憑證」→「服務帳戶」
3. 填入以下資訊：
   - **服務帳戶名稱**: 例如「linebot-sheets-service」
   - **服務帳戶 ID**: 系統會自動產生
   - **描述**: 例如「Line Bot 存取 Google Sheets 的服務帳戶」
4. 點擊「建立並繼續」
5. 在「將此服務帳戶的存取權授予專案」中，選擇「編輯者」角色
6. 點擊「繼續」，然後點擊「完成」

#### 2.4 下載服務帳戶金鑰
1. 在憑證頁面中，找到剛才創建的服務帳戶
2. 點擊服務帳戶名稱
3. 切換到「金鑰」標籤
4. 點擊「新增金鑰」→「建立新的金鑰」
5. 選擇「JSON」格式
6. 點擊「建立」，JSON 檔案會自動下載

#### 2.5 創建 Google Sheets 文件
1. 前往 [Google Sheets](https://docs.google.com/spreadsheets/)
2. 點擊「建立新試算表」
3. 將試算表重新命名（例如：LineBot 訊息記錄）
4. 從網址中複製 Sheets ID：
   ```
   https://docs.google.com/spreadsheets/d/{SHEETS_ID}/edit
   ```
5. 點擊右上角的「共用」按鈕
6. 將剛才下載的 JSON 檔案中的 `client_email` 值加入共用權限
7. 設定權限為「編輯者」
8. 點擊「傳送」

### 3. 環境變數設定

#### 3.1 準備環境變數
1. 複製 `.env.example` 為 `.env`：
   ```bash
   cp .env.example .env
   ```
#更改檔名為.env (from Alex)
2. 編輯 `.env` 檔案，填入以下資訊：

```env
# Line Bot 設定
LINE_CHANNEL_ACCESS_TOKEN=你的_Line_Channel_Access_Token
LINE_CHANNEL_SECRET=你的_Line_Channel_Secret

# 伺服器設定
PORT=3000

# Google Sheets 設定
GOOGLE_SHEETS_ID=你的_Google_Sheets_ID
GOOGLE_CLIENT_EMAIL=你的_Google_服務帳戶_Email
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n你的_Google_服務帳戶_私鑰\n-----END PRIVATE KEY-----\n"
```

#### 3.2 取得各項設定值
- **LINE_CHANNEL_ACCESS_TOKEN**: 從 Line Developer Console 的 Messaging API 標籤取得
- **LINE_CHANNEL_SECRET**: 從 Line Developer Console 的 Basic settings 標籤取得
- **GOOGLE_SHEETS_ID**: 從 Google Sheets 網址中取得
- **GOOGLE_CLIENT_EMAIL**: 從下載的 JSON 檔案中的 `client_email` 欄位取得
- **GOOGLE_PRIVATE_KEY**: 從下載的 JSON 檔案中的 `private_key` 欄位取得

### 4. 本地開發

#### 4.1 安裝依賴套件
```bash
npm install
```

#### 4.2 啟動開發伺服器
```bash
npm run dev
```

#### 4.3 測試 Webhook（使用 ngrok）
1. 安裝 ngrok：
   ```bash
   npm install -g ngrok
   ```
2. 在另一個終端機中執行：
   ```bash
   ngrok http 3000
   ```
3. 複製 ngrok 提供的 HTTPS 網址
4. 在 Line Developer Console 中，將 Webhook URL 設定為：
   ```
   https://你的ngrok網址.ngrok.io/webhook
   ```

### 5. Zeabur 部署

#### 5.1 準備 GitHub 儲存庫
1. 在 GitHub 上創建新的儲存庫
2. 將本地程式碼推送到 GitHub：
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/你的用戶名/你的儲存庫名.git
   git push -u origin main
   ```

#### 5.2 在 Zeabur 中部署
1. 前往 [Zeabur](https://zeabur.com/)
2. 使用 GitHub 帳號登入
3. 點擊「New Project」
4. 選擇「Deploy New Service」
5. 選擇「GitHub」
6. 選擇你的儲存庫
7. Zeabur 會自動偵測到 Node.js 專案並開始部署

#### 5.3 設定環境變數
1. 在 Zeabur 專案頁面中，點擊你的服務
2. 切換到「Variables」標籤
3. 逐一新增以下環境變數：
   - `LINE_CHANNEL_ACCESS_TOKEN`
   - `LINE_CHANNEL_SECRET`
   - `GOOGLE_SHEETS_ID`
   - `GOOGLE_CLIENT_EMAIL`
   - `GOOGLE_PRIVATE_KEY`

#### 5.4 取得部署網址並設定 Webhook
1. 在 Zeabur 服務頁面中，找到「Domains」區域
2. 複製提供的網址（例如：`https://你的專案名.zeabur.app`）
3. 回到 Line Developer Console
4. 在 Messaging API 標籤中，將 Webhook URL 設定為：
   ```
   https://你的專案名.zeabur.app/webhook
   ```
5. 點擊「Verify」測試連接
6. 確保「Use webhook」是 Enabled 狀態

### 6. 測試機器人

#### 6.1 加入機器人為好友
1. 在 Line Developer Console 的 Messaging API 標籤中
2. 找到「Bot information」區域
3. 使用手機掃描 QR Code 或點擊「Add friend」連結

#### 6.2 測試功能
1. 發送幾則測試訊息給機器人
2. 機器人應該回覆確認訊息，顯示累積的訊息數量
3. 發送 `/save` 指令
4. 機器人應該回覆儲存成功的訊息
5. 檢查 Google Sheets 是否正確記錄了訊息

## 使用方法

### 基本操作流程
1. **加入機器人為好友**：掃描 QR Code 或點擊加入連結
2. **發送訊息**：發送任何文字訊息給機器人
3. **查看累積狀態**：機器人會回覆目前累積的訊息數量
4. **儲存訊息**：發送 `/save` 指令將所有累積的訊息儲存到 Google Sheets
5. **重新開始**：儲存後可以重新開始累積新的訊息

### 訊息格式
- **一般訊息**：直接發送文字即可，機器人會自動累積
- **儲存指令**：發送 `/save` 來觸發儲存動作
- **狀態查詢**：機器人會在每次收到訊息後回覆當前累積狀態

## 故障排除

### 常見問題

#### 1. 機器人沒有回應
- 檢查 Webhook URL 是否正確設定
- 確認 Zeabur 服務是否正常運行
- 檢查 Line Channel Access Token 是否正確

#### 2. 無法儲存到 Google Sheets
- 確認 Google Sheets ID 是否正確
- 檢查服務帳戶是否有 Google Sheets 的編輯權限
- 確認 GOOGLE_PRIVATE_KEY 格式是否正確（需要包含 `\n` 換行符）

#### 3. 環境變數問題
- 確認所有必要的環境變數都已設定
- 檢查 `.env` 檔案格式是否正確
- 確認 Zeabur 上的環境變數設定正確

#### 4. 部署失敗
- 檢查 `package.json` 中的 engines 設定
- 確認所有依賴套件都正確安裝
- 查看 Zeabur 的部署日誌尋找錯誤訊息

### 除錯步驟
1. 檢查 Zeabur 服務日誌
2. 測試 Webhook 連接狀態
3. 驗證環境變數設定
4. 測試 Google Sheets API 連接
5. 確認 Line Bot 設定正確

## 功能擴展建議

### 可能的改進方向
- 添加資料庫支援，避免重啟後遺失訊息
- 支援圖片和其他媒體類型的訊息
- 添加使用者認證和權限管理
- 實作訊息分類和標籤功能
- 添加定時自動儲存功能
- 支援多個 Google Sheets 工作表
- 添加訊息搜尋和查詢功能

### 安全性建議
- 定期更新依賴套件
- 使用 HTTPS 保護 Webhook 連接
- 實作訊息內容過濾和驗證
- 添加 Rate Limiting 防止濫用
- 監控 API 使用量和異常行為

## 技術支援

如果遇到問題，請按照以下順序檢查：
1. 查看本 README 的故障排除章節
2. 檢查 Zeabur 部署日誌
3. 確認所有設定步驟都已正確完成
4. 測試各個 API 連接是否正常

## 授權條款

本專案採用 MIT 授權條款，請參考 LICENSE 檔案了解詳細內容。