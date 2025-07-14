const express = require('express');
const line = require('@line/bot-sdk');
const { GoogleSpreadsheet } = require('google-spreadsheet');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// 檢查必要的環境變數
const requiredEnvVars = [
  'LINE_CHANNEL_ACCESS_TOKEN',
  'LINE_CHANNEL_SECRET',
  'GOOGLE_SHEETS_ID',
  'GOOGLE_CLIENT_EMAIL',
  'GOOGLE_PRIVATE_KEY'
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`錯誤: 環境變數 ${envVar} 未設定`);
    process.exit(1);
  }
}

// Line Bot 設定
const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};

const client = new line.Client(config);

// 儲存用戶訊息的記憶體物件
const userMessages = new Map();

// Google Sheets 設定
const initGoogleSheet = async () => {
  try {
    const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEETS_ID);
    
    // 使用服務帳戶進行認證
    await doc.useServiceAccountAuth({
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    });
    
    await doc.loadInfo();
    return doc;
  } catch (error) {
    console.error('初始化 Google Sheets 時發生錯誤:', error);
    throw error;
  }
};

// 儲存訊息到 Google Sheets
const saveToGoogleSheet = async (userId, messages) => {
  try {
    const doc = await initGoogleSheet();
    let sheet = doc.sheetsByIndex[0];
    
    // 如果工作表不存在，創建標題行
    if (!sheet) {
      sheet = await doc.addSheet({ title: 'LineBot Messages' });
    }
    
    // 檢查是否需要添加標題行
    const rows = await sheet.getRows();
    if (rows.length === 0) {
      await sheet.setHeaderRow(['Time', 'User ID', 'Messages']);
    }
    
    // 添加新行
    await sheet.addRow({
      'Time': new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' }),
      'User ID': userId,
      'Messages': messages.join('\n')
    });
    
    return true;
  } catch (error) {
    console.error('儲存到 Google Sheets 時發生錯誤:', error);
    return false;
  }
};

// 處理 Line 訊息
const handleEvent = async (event) => {
  if (event.type !== 'message' || event.message.type !== 'text') {
    return Promise.resolve(null);
  }
  
  const userId = event.source.userId;
  const messageText = event.message.text;
  
  // 處理 /save 指令
  if (messageText === '/save') {
    const messages = userMessages.get(userId) || [];
    
    if (messages.length === 0) {
      return client.replyMessage(event.replyToken, {
        type: 'text',
        text: '目前沒有訊息可以儲存！'
      });
    }
    
    const success = await saveToGoogleSheet(userId, messages);
    
    if (success) {
      // 清空用戶的訊息記錄
      userMessages.delete(userId);
      return client.replyMessage(event.replyToken, {
        type: 'text',
        text: `已成功儲存 ${messages.length} 則訊息到 Google Sheets！`
      });
    } else {
      return client.replyMessage(event.replyToken, {
        type: 'text',
        text: '儲存失敗，請稍後再試！'
      });
    }
  }
  
  // 累積一般訊息
  if (!userMessages.has(userId)) {
    userMessages.set(userId, []);
  }
  
  userMessages.get(userId).push(messageText);
  
  // 回覆確認訊息
  const currentCount = userMessages.get(userId).length;
  return client.replyMessage(event.replyToken, {
    type: 'text',
    text: `訊息已累積 (${currentCount})\n輸入 /save 來儲存到 Google Sheets`
  });
};

// 設定路由
app.post('/webhook', line.middleware(config), (req, res) => {
  Promise
    .all(req.body.events.map(handleEvent))
    .then((result) => res.json(result))
    .catch((err) => {
      console.error('處理事件時發生錯誤:', err);
      res.status(500).end();
    });
});

// 健康檢查路由
app.get('/', (req, res) => {
  res.send('Line Bot 正在運行中！');
});

app.listen(PORT, () => {
  console.log(`伺服器在 port ${PORT} 上運行`);
  console.log('環境變數檢查通過');
  console.log('Line Bot 準備就緒');
});