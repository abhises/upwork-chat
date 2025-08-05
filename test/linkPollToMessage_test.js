// test/linkPollToMessage.test.js

import ChatManager from "../service/chat.js";
import { ScyllaDb, ErrorHandler, Logger } from "../utils/index.js";

// ⛏️ Redirect loggers to console for visibility during tests
Logger.writeLog = (log) => console.log("[Logger]", log);
ErrorHandler.add_error = (msg, meta) =>
  console.error("[ErrorHandler]", msg, meta);

// ⚠️ Ensure that message_id `msg#001` exists for chat_id `chat#202508041601` in DB
// This matches your seed data

// 🧪 1️⃣ Valid case (using seeded message)
async function testValidPollLink() {
  const chatId = "chat#202508041601";
  const messageId = "msg#001";
  const pollId = "poll#abc123";

  const result = await ChatManager.linkPollToMessage(chatId, messageId, pollId);
  console.log("✅ linkPollToMessage (valid) →", result);
}

// 🧪 2️⃣ Missing chatId
async function testMissingChatId() {
  const result = await ChatManager.linkPollToMessage(
    null,
    "msg#001",
    "poll#123"
  );
  console.log("❌ linkPollToMessage (missing chatId) →", result);
}

// 🧪 3️⃣ Missing messageId
async function testMissingMessageId() {
  const result = await ChatManager.linkPollToMessage(
    "chat#202508041601",
    null,
    "poll#123"
  );
  console.log("❌ linkPollToMessage (missing messageId) →", result);
}

// 🧪 4️⃣ Missing pollId
async function testMissingPollId() {
  const result = await ChatManager.linkPollToMessage(
    "chat#202508041601",
    "msg#001",
    null
  );
  console.log("❌ linkPollToMessage (missing pollId) →", result);
}

// 🧪 5️⃣ Invalid pollId type
async function testInvalidPollIdType() {
  const result = await ChatManager.linkPollToMessage(
    "chat#202508041601",
    "msg#001",
    42
  );
  console.log("❌ linkPollToMessage (invalid pollId type) →", result);
}

// 🧪 6️⃣ Nonexistent message
async function testNonexistentMessage() {
  const result = await ChatManager.linkPollToMessage(
    "chat#202508041601",
    "msg#doesnotexist",
    "poll#xyz"
  );
  console.log("❌ linkPollToMessage (nonexistent message) →", result);
}

// 🧪 7️⃣ Nonexistent chat
async function testNonexistentChat() {
  const result = await ChatManager.linkPollToMessage(
    "chat#doesnotexist",
    "msg#001",
    "poll#xyz"
  );
  console.log("❌ linkPollToMessage (nonexistent chat) →", result);
}

// 🚀 Test Runner
async function linkPollToMessage_test() {
  console.log("🔍 Running linkPollToMessage tests...\n");

  await ScyllaDb.loadTableConfigs?.("./tables.json");

  await testValidPollLink();
  console.log("-----");

  await testMissingChatId();
  console.log("-----");

  await testMissingMessageId();
  console.log("-----");

  await testMissingPollId();
  console.log("-----");

  await testInvalidPollIdType();
  console.log("-----");

  await testNonexistentMessage();
  console.log("-----");

  await testNonexistentChat();
  console.log("-----");
}

linkPollToMessage_test();

export default linkPollToMessage_test;
