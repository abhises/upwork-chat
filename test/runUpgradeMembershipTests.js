import ChatManager from "../service/chat.js";
import { ScyllaDb, Logger, ErrorHandler, SafeUtils } from "../utils/index.js";

// Minimal logger/error handler mocks
Logger.writeLog = (log) => console.log("[Logger]", log);
ErrorHandler.add_error = (msg, meta) =>
  console.error("[ErrorHandler]", msg, meta);

// Simple sanitizeValidate mock (like your real one)
SafeUtils.sanitizeValidate = (schema) => {
  const result = {};
  for (const key in schema) {
    const { value, type, required } = schema[key];
    if (required && (value === undefined || value === null)) {
      throw new Error(`Validation failed: ${key} is required`);
    }
    if (typeof value !== type) {
      throw new Error(`Validation failed: ${key} must be a ${type}`);
    }
    result[key] = value;
  }
  return result;
};

// ✅ Valid case
async function testUpgradeMembership_Valid() {
  const userId = "user_123";
  const chatId = "chat_456"; // should exist
  const newTier = "gold";

  const result = await ChatManager.upgradeMembership(userId, chatId, newTier);
  console.log("✅ upgradeMembership (valid) →", result);
}

// ❌ Missing userId
async function testUpgradeMembership_MissingUserId() {
  const chatId = "chat_456";
  const newTier = "silver";

  const result = await ChatManager.upgradeMembership(null, chatId, newTier);
  console.log("❌ upgradeMembership (missing userId) →", result);
}

// ❌ Missing chatId
async function testUpgradeMembership_MissingChatId() {
  const userId = "user_123";
  const newTier = "silver";

  const result = await ChatManager.upgradeMembership(userId, null, newTier);
  console.log("❌ upgradeMembership (missing chatId) →", result);
}

// ❌ Invalid types
async function testUpgradeMembership_InvalidTypes() {
  try {
    await ChatManager.upgradeMembership(123, {}, []);
  } catch (err) {
    console.log(
      "❌ upgradeMembership (invalid types) → error thrown:",
      err.message
    );
  }
}

// 🧪 Run all tests
async function runUpgradeMembershipTests() {
  console.log("🔍 Running upgradeMembership tests...\n");

  await ScyllaDb.loadTableConfigs?.("./tables.json");

  await testUpgradeMembership_Valid();
  console.log("-----");

  await testUpgradeMembership_MissingUserId();
  console.log("-----");

  await testUpgradeMembership_MissingChatId();
  console.log("-----");

  await testUpgradeMembership_InvalidTypes();
  console.log("-----");
}

runUpgradeMembershipTests();

export default runUpgradeMembershipTests;
