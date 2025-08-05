// test/markMessageRead.test.js

import ChatManager from "../service/chat.js";
import { ScyllaDb, Logger, ErrorHandler } from "../utils/index.js";

// ⛏️ Mock logging
Logger.writeLog = (log) => console.log("[Logger]", log);
ErrorHandler.add_error = (msg, meta) =>
  console.error("[ErrorHandler]", msg, meta);

// 🧪 1️⃣ Valid Case
async function testMarkMessageReadValid() {
  const chatId = "chat#202508041601"; // seeded
  const messageId = "msg#001"; // seeded
  const userId = "user_001"; // ensure userSettings seeded

  const result = await ChatManager.markMessageRead(chatId, messageId, userId);
  console.log("✅ markMessageRead (valid) →", result);
}

// 🧪 2️⃣ Invalid Chat
async function testInvalidChat() {
  const result = await ChatManager.markMessageRead(
    "chat#doesnotexist",
    "msg#001",
    "user_001"
  );
  console.log("❌ markMessageRead (invalid chat) →", result);
}

// 🧪 3️⃣ Invalid Message
async function testInvalidMessage() {
  const result = await ChatManager.markMessageRead(
    "chat#202508041601",
    "msg#doesnotexist",
    "user_001"
  );
  console.log("❌ markMessageRead (invalid message) →", result);
}

// 🧪 4️⃣ Missing ChatId
async function testMissingChatId() {
  const result = await ChatManager.markMessageRead(null, "msg#001", "user_001");
  console.log("❌ markMessageRead (missing chatId) →", result);
}

// 🧪 5️⃣ Missing UserId
async function testMissingUserId() {
  const result = await ChatManager.markMessageRead(
    "chat#202508041601",
    "msg#001",
    null
  );
  console.log("❌ markMessageRead (missing userId) →", result);
}

// 🚀 Runner
async function runMarkMessageReadTests() {
  console.log("🔍 Running markMessageRead tests...\n");

  await ScyllaDb.loadTableConfigs?.("./tables.json");

  await testMarkMessageReadValid();
  console.log("-----");

  await testInvalidChat();
  console.log("-----");

  await testInvalidMessage();
  console.log("-----");

  await testMissingChatId();
  console.log("-----");

  await testMissingUserId();
  console.log("-----");
}

runMarkMessageReadTests();

export default runMarkMessageReadTests;
