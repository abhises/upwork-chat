import ChatManager from "../service/chat.js";
import { ScyllaDb, ErrorHandler, Logger } from "../utils/index.js";

// 🪵 Logging setup
Logger.writeLog = (log) => console.log("[Logger]", log);
ErrorHandler.add_error = (msg, meta) =>
  console.error("[ErrorHandler]", msg, meta);

// 🧪 1️⃣ Valid update
async function testValidNotificationUpdate() {
  const result = await ChatManager.updateNotificationSettings(
    "user_001",
    "chat#202508041601",
    { mute: true, sound: false }
  );
  console.log("✅ updateNotificationSettings (valid) →", result);
}

// 🧪 2️⃣ Missing user ID
async function testMissingUserId() {
  const result = await ChatManager.updateNotificationSettings(
    null,
    "chat#202508041601",
    { mute: false }
  );
  console.log("❌ updateNotificationSettings (missing userId) →", result);
}

// 🧪 3️⃣ Missing chat ID
async function testMissingChatId() {
  const result = await ChatManager.updateNotificationSettings(
    "user_001",
    null,
    { mute: false }
  );
  console.log("❌ updateNotificationSettings (missing chatId) →", result);
}

// 🧪 4️⃣ Invalid settings type
async function testInvalidSettingsType() {
  const result = await ChatManager.updateNotificationSettings(
    "user_001",
    "chat#202508041601",
    "not-an-object"
  );
  console.log("❌ updateNotificationSettings (invalid settings) →", result);
}

// 🧪 5️⃣ Nonexistent user record
async function testNonexistentUser() {
  const result = await ChatManager.updateNotificationSettings(
    "user_does_not_exist",
    "chat#202508041601",
    { mute: true }
  );
  console.log("❌ updateNotificationSettings (nonexistent user) →", result);
}

// 🚀 Runner
async function updateNotificationSettings_test() {
  console.log("🔍 Running updateNotificationSettings tests...\n");

  await ScyllaDb.loadTableConfigs?.("./tables.json");

  await testValidNotificationUpdate();
  console.log("-----");

  await testMissingUserId();
  console.log("-----");

  await testMissingChatId();
  console.log("-----");

  await testInvalidSettingsType();
  console.log("-----");

  await testNonexistentUser();
  console.log("-----");
}

updateNotificationSettings_test();
export default updateNotificationSettings_test;
