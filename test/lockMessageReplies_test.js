// test/lockMessageReplies.test.js

import ChatManager from "../service/chat.js";
import { ScyllaDb, Logger, ErrorHandler } from "../utils/index.js";

// ✅ Mocks
Logger.writeLog = (log) => console.log("[Logger]", log);
ErrorHandler.add_error = (msg, meta) =>
  console.error("[ErrorHandler]", msg, meta);

// 🧪 1️⃣ Valid lock
async function testLockValid() {
  const result = await ChatManager.lockMessageReplies(
    "chat#202508041601",
    "msg#001",
    true
  );
  console.log("✅ lockMessageReplies (valid) →", result);
}

// 🧪 2️⃣ Valid unlock
async function testUnlockValid() {
  const result = await ChatManager.lockMessageReplies(
    "chat#202508041601",
    "msg#001",
    false
  );
  console.log("✅ lockMessageReplies (unlock) →", result);
}

// 🧪 3️⃣ Missing chatId
async function testMissingChatId() {
  const result = await ChatManager.lockMessageReplies(null, "msg#001");
  console.log("❌ lockMessageReplies (missing chatId) →", result);
}

// 🧪 4️⃣ Missing messageId
async function testMissingMessageId() {
  const result = await ChatManager.lockMessageReplies(
    "chat#202508041601",
    null
  );
  console.log("❌ lockMessageReplies (missing messageId) →", result);
}

// 🧪 5️⃣ Invalid lock type
async function testInvalidLockType() {
  const result = await ChatManager.lockMessageReplies(
    "chat#202508041601",
    "msg#001",
    "yes"
  );
  console.log("❌ lockMessageReplies (invalid lock type) →", result);
}

// 🧪 6️⃣ Message not found
async function testMessageNotFound() {
  const result = await ChatManager.lockMessageReplies(
    "chat#202508041601",
    "msg#doesnotexist"
  );
  console.log("❌ lockMessageReplies (nonexistent message) →", result);
}

// 🚀 Runner
async function lockMessageReplies_test() {
  console.log("🔍 Running lockMessageReplies tests...\n");

  await ScyllaDb.loadTableConfigs?.("./tables.json");

  await testLockValid();
  console.log("-----");

  await testUnlockValid();
  console.log("-----");

  await testMissingChatId();
  console.log("-----");

  await testMissingMessageId();
  console.log("-----");

  await testInvalidLockType();
  console.log("-----");

  await testMessageNotFound();
  console.log("-----");
}

lockMessageReplies_test();
export default lockMessageReplies_test;
