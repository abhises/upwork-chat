import ChatManager from "../service/chat.js";
import { ScyllaDb, ErrorHandler, Logger } from "../utils/index.js";

// 🪵 Logging Setup
Logger.writeLog = (log) => console.log("[Logger]", log);
ErrorHandler.add_error = (msg, meta) =>
  console.error("[ErrorHandler]", msg, meta);

// 🧪 1️⃣ Valid update
async function testValidUpdate() {
  const chatId = "chat#202508041601"; // make sure this exists in your DB
  const subscriptionRequired = true;

  const result = await ChatManager.updateChatSubscriptionFlag(
    chatId,
    subscriptionRequired
  );
  console.log("✅ updateChatSubscriptionFlag (valid) →", result);
}

// 🧪 2️⃣ Missing chat ID
async function testMissingChatId() {
  const result = await ChatManager.updateChatSubscriptionFlag(null, true);
  console.log("❌ updateChatSubscriptionFlag (missing chatId) →", result);
}

// 🧪 3️⃣ Invalid subscriptionRequired type
async function testInvalidFlagType() {
  const result = await ChatManager.updateChatSubscriptionFlag(
    "chat#202508041601",
    "yes"
  );
  console.log("❌ updateChatSubscriptionFlag (invalid boolean) →", result);
}

// 🧪 4️⃣ Chat ID not in DB
async function testNonExistentChat() {
  const result = await ChatManager.updateChatSubscriptionFlag(
    "chat#nonexistent",
    false
  );
  console.log("❌ updateChatSubscriptionFlag (nonexistent chat) →", result);
}

// 🚀 Runner
async function updateChatSubscriptionFlag_test() {
  console.log("🔍 Running updateChatSubscriptionFlag tests...\n");

  await ScyllaDb.loadTableConfigs?.("./tables.json");

  await testValidUpdate();
  console.log("-----");

  await testMissingChatId();
  console.log("-----");

  await testInvalidFlagType();
  console.log("-----");

  await testNonExistentChat();
  console.log("-----");
}

updateChatSubscriptionFlag_test();
export default updateChatSubscriptionFlag_test;
