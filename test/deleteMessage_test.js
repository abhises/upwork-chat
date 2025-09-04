import ChatManager from "../service/chat.js";
import { ScyllaDb, Logger, ErrorHandler } from "../utils/index.js";

// Mock loggers
Logger.writeLog = (log) => console.log("[Logger]", log);
ErrorHandler.add_error = (msg, meta) =>
  console.error("[ErrorHandler]", msg, meta);

// 🧪 1️⃣ Valid delete
async function testDeleteValidMessage() {
  const chatId = "chat#202508041601";
  const messageId = "msg#001"; // seeded in DB before running

  const result = await ChatManager.deleteMessage(chatId, messageId);
  console.log("✅ deleteMessage (valid) →", result);
}

// 🧪 2️⃣ Message not found
async function testDeleteMessageNotFound() {
  const result = await ChatManager.deleteMessage(
    "chat#202508041601",
    "msg#doesNotExist"
  );
  console.log("❌ deleteMessage (nonexistent) →", result);
}

// 🧪 3️⃣ Missing chatId
async function testDeleteMissingChatId() {
  const result = await ChatManager.deleteMessage(null, "msg#001");
  console.log("❌ deleteMessage (missing chatId) →", result);
}

// 🧪 4️⃣ Missing messageId
async function testDeleteMissingMessageId() {
  const result = await ChatManager.deleteMessage("chat#202508041601", null);
  console.log("❌ deleteMessage (missing messageId) →", result);
}

// 🚀 Runner
async function runDeleteMessageTests() {
  console.log("🔍 Running deleteMessage tests...\n");

  await ScyllaDb.loadTableConfigs?.("./tables.json");

  await testDeleteValidMessage();
  console.log("-----");

  await testDeleteMessageNotFound();
  console.log("-----");

  await testDeleteMissingChatId();
  console.log("-----");

  await testDeleteMissingMessageId();
  console.log("-----");
}

runDeleteMessageTests();

export default runDeleteMessageTests;
