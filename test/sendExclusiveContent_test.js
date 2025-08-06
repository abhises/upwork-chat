import ChatManager from "../service/chat.js";
import { ScyllaDb, Logger, ErrorHandler } from "../utils/index.js";

// 🛠 Mock logger/error handlers
Logger.writeLog = (log) => console.log("[Logger]", log);
ErrorHandler.add_error = (msg, meta) =>
  console.error("[ErrorHandler]", msg, meta);

// 🧪 1️⃣ Valid input
async function testSendExclusiveContent_Valid() {
  const chatId = "chat#202508041601"; // Make sure this chat ID exists in your DB
  const payload = {
    type: "image",
    url: "https://example.com/image.jpg",
    caption: "Exclusive launch poster",
  };

  const result = await ChatManager.sendExclusiveContent(chatId, payload);
  console.log("✅ sendExclusiveContent (valid) →", result);
}

// 🧪 2️⃣ Missing chatId
async function testSendExclusiveContent_MissingChatId() {
  const payload = {
    text: "Missing chatId test",
  };

  const result = await ChatManager.sendExclusiveContent(null, payload);
  console.log("❌ sendExclusiveContent (missing chatId) →", result);
}

// 🧪 3️⃣ Missing payload
async function testSendExclusiveContent_MissingPayload() {
  const chatId = "chat#202508041601";

  const result = await ChatManager.sendExclusiveContent(chatId, null);
  console.log("❌ sendExclusiveContent (missing payload) →", result);
}

// 🧪 4️⃣ Invalid chatId type
async function testSendExclusiveContent_InvalidChatId() {
  const chatId = 12345;
  const payload = { text: "Invalid chatId type" };

  const result = await ChatManager.sendExclusiveContent(chatId, payload);
  console.log("❌ sendExclusiveContent (invalid chatId type) →", result);
}

// 🧪 5️⃣ Invalid payload type
async function testSendExclusiveContent_InvalidPayload() {
  const chatId = "chat#202508041601";
  const payload = "not-an-object";

  const result = await ChatManager.sendExclusiveContent(chatId, payload);
  console.log("❌ sendExclusiveContent (invalid payload type) →", result);
}

// 🚀 Runner
async function sendExclusiveContent_test() {
  console.log("🔍 Running sendExclusiveContent tests...\n");

  await ScyllaDb.loadTableConfigs?.("./tables.json");

  await testSendExclusiveContent_Valid();
  console.log("-----");

  await testSendExclusiveContent_MissingChatId();
  console.log("-----");

  await testSendExclusiveContent_MissingPayload();
  console.log("-----");

  await testSendExclusiveContent_InvalidChatId();
  console.log("-----");

  await testSendExclusiveContent_InvalidPayload();
  console.log("-----");
}

sendExclusiveContent_test();

export default sendExclusiveContent_test;
