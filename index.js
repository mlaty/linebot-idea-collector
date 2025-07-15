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
    
    // 使用服務帳戶進行認證 (v3 API)
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
    console.log('開始初始化 Google Sheets...');
    const doc = await initGoogleSheet();
    console.log('Google Sheets 文件初始化成功');
    
    let sheet = doc.sheetsByIndex[0];
    console.log('取得工作表:', sheet ? sheet.title : '無工作表');
    
    // 如果工作表不存在，創建標題行
    if (!sheet) {
      console.log('創建新的工作表...');
      sheet = await doc.addSheet({ title: 'LineBot Messages' });
      console.log('新工作表創建成功');
    }
    
    // 檢查是否需要添加標題行
    console.log('檢查標題行...');
    const rows = await sheet.getRows();
    console.log(`工作表目前有 ${rows.length} 行資料`);
    
    if (rows.length === 0) {
      console.log('設定標題行...');
      await sheet.setHeaderRow(['Time', 'User ID', 'Messages']);
      console.log('標題行設定完成');
    }
    
    // 添加新行
    const timestamp = new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' });
    const messagesText = messages.join('\n');
    console.log('準備添加資料:', { timestamp, userId, messagesText });
    
    await sheet.addRow({
      'Time': timestamp,
      'User ID': userId,
      'Messages': messagesText
    });
    
    console.log('資料成功添加到 Google Sheets');
    return true;
  } catch (error) {
    console.error('儲存到 Google Sheets 時發生錯誤:', error);
    console.error('錯誤詳情:', error.message);
    console.error('錯誤堆疊:', error.stack);
    return false;
  }
};

// 處理 Line 訊息
const handleEvent = async (event) => {
  try {
    console.log('收到事件:', JSON.stringify(event, null, 2));
    
    if (event.type !== 'message' || event.message.type !== 'text') {
      console.log('非文字訊息，跳過處理');
      return Promise.resolve(null);
    }
    
    const userId = event.source.userId;
    const messageText = event.message.text;
    console.log(`用戶 ${userId} 發送訊息: ${messageText}`);
    
    // 處理 /save 指令
    if (messageText === '/save') {
      console.log('處理 /save 指令');
      const messages = userMessages.get(userId) || [];
      console.log(`用戶 ${userId} 累積的訊息數量: ${messages.length}`);
      
      if (messages.length === 0) {
        console.log('沒有訊息可以儲存');
        return client.replyMessage(event.replyToken, {
          type: 'text',
          text: '目前沒有訊息可以儲存！'
        });
      }
      
      console.log('開始儲存到 Google Sheets...');
      const success = await saveToGoogleSheet(userId, messages);
      console.log(`儲存結果: ${success}`);
      
      if (success) {
        // 清空用戶的訊息記錄
        userMessages.delete(userId);
        console.log('已清空用戶訊息記錄');
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
    console.log(`訊息已累積，用戶 ${userId} 目前有 ${userMessages.get(userId).length} 則訊息`);
    
    // 回覆確認訊息
    const currentCount = userMessages.get(userId).length;
    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: `訊息已累積 (${currentCount})\n輸入 /save 來儲存到 Google Sheets`
    });
  } catch (error) {
    console.error('處理事件時發生錯誤:', error);
    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: '處理訊息時發生錯誤，請稍後再試！'
    });
  }
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