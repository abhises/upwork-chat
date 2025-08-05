import ChatManager from "../service/chat.js";
import { ScyllaDb, ErrorHandler, Logger } from "../utils/index.js";

// 🪵 Logging setup for visibility
Logger.writeLog = (log) => console.log("[Logger]", log);
ErrorHandler.add_error = (msg, meta) =>
  console.error("[ErrorHandler]", msg, meta);

// 🧪 1️⃣ Valid message send
async function testValidSendMessage() {
  const chatId = "chat#202508041601"; // Ensure this exists in your DB
  const payload = {
    contentType: "text",
    text: "Hello, world!",
  };

  const result = await ChatManager.sendMessage(chatId, payload);
  console.log("✅ sendMessage (valid) →", result);
}

// 🧪 2️⃣ Missing chat ID
async function testMissingChatId() {
  const result = await ChatManager.sendMessage(null, { text: "No chat ID" });
  console.log("❌ sendMessage (missing chatId) →", result);
}

// 🧪 3️⃣ Missing payload
async function testMissingPayload() {
  const result = await ChatManager.sendMessage("chat#202508041601", null);
  console.log("❌ sendMessage (missing payload) →", result);
}

// 🧪 4️⃣ Invalid payload type (not object)
async function testInvalidPayloadType() {
  const result = await ChatManager.sendMessage(
    "chat#202508041601",
    "just text"
  );
  console.log("❌ sendMessage (invalid payload type) →", result);
}

// 🧪 5️⃣ Non-existent chat ID
async function testNonExistentChat() {
  const result = await ChatManager.sendMessage("chat#nonexistent", {
    text: "Will fail silently if table not enforced",
  });
  console.log("❌ sendMessage (nonexistent chat) →", result);
}

// 🚀 Test Runner
async function sendMessage_test() {
  console.log("🔍 Running sendMessage tests...\n");

  // Ensure table configs loaded
  await ScyllaDb.loadTableConfigs?.("./tables.json");

  await testValidSendMessage();
  console.log("-----");

  await testMissingChatId();
  console.log("-----");

  await testMissingPayload();
  console.log("-----");

  await testInvalidPayloadType();
  console.log("-----");

  await testNonExistentChat();
  console.log("-----");
}

sendMessage_test();
export default sendMessage_test;
