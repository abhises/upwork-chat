import ChatManager from "../service/chat.js";
import { ScyllaDb, Logger, ErrorHandler } from "../utils/index.js";

// 🛠 Mock Logger & ErrorHandler
Logger.writeLog = (log) => console.log("[Logger]", log);
ErrorHandler.add_error = (msg, meta) =>
  console.error("[ErrorHandler]", msg, meta);

// 🧪 1️⃣ Valid input
async function testStoreChatMessage_Valid() {
  const chatId = "chat#202508061234"; // Make sure this exists
  const payload = {
    contentType: "text",
    text: "Hello from test!",
  };

  const result = await ChatManager.storeChatMessage(chatId, payload);
  console.log("✅ storeChatMessage (valid) →", result?.message_id || result);
}

// 🧪 2️⃣ Missing chatId
async function testStoreChatMessage_MissingChatId() {
  const payload = {
    contentType: "text",
    text: "Missing chat ID test",
  };

  const result = await ChatManager.storeChatMessage(null, payload);
  console.log("❌ storeChatMessage (missing chatId) →", result);
}

// 🧪 3️⃣ Invalid payload type
async function testStoreChatMessage_InvalidPayload() {
  const chatId = "chat#202508061234";
  const payload = "not-an-object"; // invalid type

  const result = await ChatManager.storeChatMessage(chatId, payload);
  console.log("❌ storeChatMessage (invalid payload) →", result);
}

// 🧪 4️⃣ Empty payload object
async function testStoreChatMessage_EmptyPayload() {
  const chatId = "chat#202508061234";
  const payload = {}; // will fail validation

  const result = await ChatManager.storeChatMessage(chatId, payload);
  console.log("❌ storeChatMessage (empty payload) →", result);
}

// 🚀 Test runner
async function storeChatMessage_test() {
  console.log("🔍 Running storeChatMessage tests...\n");

  await ScyllaDb.loadTableConfigs?.("./tables.json"); // optional, only if used

  await testStoreChatMessage_Valid();
  console.log("-----");

  await testStoreChatMessage_MissingChatId();
  console.log("-----");

  await testStoreChatMessage_InvalidPayload();
  console.log("-----");

  await testStoreChatMessage_EmptyPayload();
  console.log("-----");
}

storeChatMessage_test();

export default storeChatMessage_test;
