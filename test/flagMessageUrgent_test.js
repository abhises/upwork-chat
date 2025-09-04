import ChatManager from "../service/chat.js";
import { ScyllaDb, Logger, ErrorHandler } from "../utils/index.js";

// Mock loggers
Logger.writeLog = (log) => console.log("[Logger]", log);
ErrorHandler.add_error = (msg, meta) =>
  console.error("[ErrorHandler]", msg, meta);

// 🧪 1️⃣ Valid flag urgent
async function testFlagValidUrgent() {
  const chatId = "chat#202508041601";
  const messageId = "msg#001"; // seeded message must exist
  const isUrgent = true;

  const result = await ChatManager.flagMessageUrgent(
    chatId,
    messageId,
    isUrgent
  );
  console.log("✅ flagMessageUrgent (valid) →", result);
}

// 🧪 2️⃣ Message not found
async function testFlagMessageNotFound() {
  const result = await ChatManager.flagMessageUrgent(
    "chat#202508041601",
    "msg#doesNotExist",
    true
  );
  console.log("❌ flagMessageUrgent (nonexistent) →", result);
}

// 🧪 3️⃣ Missing chatId
async function testFlagMissingChatId() {
  const result = await ChatManager.flagMessageUrgent(null, "msg#001", true);
  console.log("❌ flagMessageUrgent (missing chatId) →", result);
}

// 🧪 4️⃣ Missing messageId
async function testFlagMissingMessageId() {
  const result = await ChatManager.flagMessageUrgent(
    "chat#202508041601",
    null,
    true
  );
  console.log("❌ flagMessageUrgent (missing messageId) →", result);
}

// 🧪 5️⃣ Invalid isUrgent type
async function testFlagInvalidIsUrgent() {
  const result = await ChatManager.flagMessageUrgent(
    "chat#202508041601",
    "msg#001",
    "notABoolean"
  );
  console.log("❌ flagMessageUrgent (invalid isUrgent) →", result);
}

// 🚀 Runner
async function runFlagMessageUrgentTests() {
  console.log("🔍 Running flagMessageUrgent tests...\n");

  await ScyllaDb.loadTableConfigs?.("./tables.json");

  await testFlagValidUrgent();
  console.log("-----");

  await testFlagMessageNotFound();
  console.log("-----");

  await testFlagMissingChatId();
  console.log("-----");

  await testFlagMissingMessageId();
  console.log("-----");

  await testFlagInvalidIsUrgent();
  console.log("-----");
}

runFlagMessageUrgentTests();

export default runFlagMessageUrgentTests;
