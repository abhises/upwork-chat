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

async function testJoinChat_Valid() {
  const chatId = "chat#202508041601"; // Make sure this exists in your DB
  const userId = "user_123";

  const result = await ChatManager.joinChat(chatId, userId);
  console.log("✅ joinChat (valid inputs) →", result);
}

async function testJoinChat_UserAlreadyParticipant() {
  const chatId = "chat#202508041601"; // Must exist with user_123 already participant
  const userId = "user_123";

  const result = await ChatManager.joinChat(chatId, userId);
  console.log("✅ joinChat (user already participant) →", result);
}

async function testJoinChat_MissingChatId() {
  const userId = "user_123";

  const result = await ChatManager.joinChat(null, userId);
  console.log("❌ joinChat (missing chatId) →", result);
}

async function testJoinChat_MissingUserId() {
  const chatId = "chat#202508041601";

  const result = await ChatManager.joinChat(chatId, null);
  console.log("❌ joinChat (missing userId) →", result);
}

async function testJoinChat_InvalidTypes() {
  try {
    await ChatManager.joinChat(12345, {}); // invalid types
  } catch (err) {
    console.log("❌ joinChat (invalid types) → error thrown:", err.message);
  }
}

// Run tests sequentially
async function runJoinChatTests() {
  console.log("🔍 Running joinChat tests...\n");

  await ScyllaDb.loadTableConfigs?.("./tables.json");

  await testJoinChat_Valid();
  console.log("-----");

  await testJoinChat_UserAlreadyParticipant();
  console.log("-----");

  await testJoinChat_MissingChatId();
  console.log("-----");

  await testJoinChat_MissingUserId();
  console.log("-----");

  await testJoinChat_InvalidTypes();
  console.log("-----");
}

runJoinChatTests();

export default runJoinChatTests;
