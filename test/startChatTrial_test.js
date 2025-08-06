import ChatManager from "../service/chat.js";
import { ScyllaDb, Logger, ErrorHandler } from "../utils/index.js";

// 🛠 Optional logging for visibility
Logger.writeLog = (log) => console.log("[Logger]", log);
ErrorHandler.add_error = (msg, meta) =>
  console.error("[ErrorHandler]", msg, meta);

// 🧪 1️⃣ Valid trial start
async function testStartChatTrial_Valid() {
  const userId = "user_001"; // Must exist in userSettings table
  const chatId = "chat#202508041601"; // Any chat ID
  const trialDays = 5;

  const result = await ChatManager.startChatTrial(userId, chatId, trialDays);
  console.log("✅ startChatTrial (valid) →", result);

  // Optional: read back to verify DB update
  const userSettings = await ScyllaDb.getItem("userSettings", {
    user_id: userId,
  });
  console.log("📦 DB trial_access →", userSettings?.trial_access);
}

// 🧪 2️⃣ Missing userId
async function testStartChatTrial_MissingUserId() {
  const result = await ChatManager.startChatTrial(null, "chat#202508041601");
  console.log("❌ startChatTrial (missing userId) →", result);
}

// 🧪 3️⃣ Missing chatId
async function testStartChatTrial_MissingChatId() {
  const result = await ChatManager.startChatTrial("user_001", null);
  console.log("❌ startChatTrial (missing chatId) →", result);
}

// 🧪 4️⃣ Invalid trialDays type
async function testStartChatTrial_InvalidTrialDays() {
  const result = await ChatManager.startChatTrial(
    "user_001",
    "chat#202508041601",
    "seven"
  );
  console.log("❌ startChatTrial (invalid trialDays) →", result);
}

// 🧪 5️⃣ Default trialDays (not provided)
async function testStartChatTrial_DefaultDays() {
  const result = await ChatManager.startChatTrial(
    "user_001",
    "chat#defaultTrial"
  );
  console.log("🧪 startChatTrial (default 7 days) →", result);

  const userSettings = await ScyllaDb.getItem("userSettings", {
    user_id: "user_001",
  });
  console.log("📦 DB trial_access →", userSettings?.trial_access);
}

// 🚀 Runner
async function startChatTrial_test() {
  console.log("🔍 Running startChatTrial tests...\n");

  await ScyllaDb.loadTableConfigs?.("./tables.json");

  await testStartChatTrial_Valid();
  console.log("-----");

  await testStartChatTrial_MissingUserId();
  console.log("-----");

  await testStartChatTrial_MissingChatId();
  console.log("-----");

  await testStartChatTrial_InvalidTrialDays();
  console.log("-----");

  await testStartChatTrial_DefaultDays();
  console.log("-----");
}

startChatTrial_test();

export default startChatTrial_test;
