// test/attachTaskToMessage.test.js

import ChatManager from "../service/chat.js";
import { ScyllaDb, Logger, ErrorHandler } from "../utils/index.js";

// 🔧 Mocks
Logger.writeLog = (log) => console.log("[Logger]", log);
ErrorHandler.add_error = (msg, meta) =>
  console.error("[ErrorHandler]", msg, meta);

// 🧪 1️⃣ Valid input
async function testValidTaskAttachment() {
  const result = await ChatManager.attachTaskToMessage(
    "chat#202508041601",
    "msg#001",
    "task#alpha123"
  );
  console.log("✅ attachTaskToMessage (valid) →", result);
}

// 🧪 2️⃣ Missing chatId
async function testMissingChatId() {
  const result = await ChatManager.attachTaskToMessage(
    null,
    "msg#001",
    "task#alpha123"
  );
  console.log("❌ attachTaskToMessage (missing chatId) →", result);
}

// 🧪 3️⃣ Missing messageId
async function testMissingMessageId() {
  const result = await ChatManager.attachTaskToMessage(
    "chat#202508041601",
    null,
    "task#alpha123"
  );
  console.log("❌ attachTaskToMessage (missing messageId) →", result);
}

// 🧪 4️⃣ Missing taskId
async function testMissingTaskId() {
  const result = await ChatManager.attachTaskToMessage(
    "chat#202508041601",
    "msg#001",
    null
  );
  console.log("❌ attachTaskToMessage (missing taskId) →", result);
}

// 🧪 5️⃣ Invalid taskId type
async function testInvalidTaskIdType() {
  const result = await ChatManager.attachTaskToMessage(
    "chat#202508041601",
    "msg#001",
    123
  );
  console.log("❌ attachTaskToMessage (invalid taskId type) →", result);
}

// 🧪 6️⃣ Message does not exist
async function testNonexistentMessage() {
  const result = await ChatManager.attachTaskToMessage(
    "chat#202508041601",
    "msg#doesnotexist",
    "task#alpha123"
  );
  console.log("❌ attachTaskToMessage (nonexistent message) →", result);
}

// 🚀 Runner
async function attachTaskToMessage_test() {
  console.log("🔍 Running attachTaskToMessage tests...\n");

  await ScyllaDb.loadTableConfigs?.("./tables.json");

  await testValidTaskAttachment();
  console.log("-----");

  await testMissingChatId();
  console.log("-----");

  await testMissingMessageId();
  console.log("-----");

  await testMissingTaskId();
  console.log("-----");

  await testInvalidTaskIdType();
  console.log("-----");

  await testNonexistentMessage();
  console.log("-----");
}

attachTaskToMessage_test();
export default attachTaskToMessage_test;
