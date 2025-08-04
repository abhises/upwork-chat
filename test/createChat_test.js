import ChatManager from "../service/chat.js";
import {
  DateTime,
  SafeUtils,
  ScyllaDb,
  ErrorHandler,
  Logger,
} from "../utils/index.js";

// ✅ Mock DateTime for deterministic chat_id and timestamp
DateTime.now = () => "2025-08-04T12:00:00.000Z";
DateTime.generateRelativeTimestamp = () => "20250804120000";

// ✅ Keep logger and error handler
ErrorHandler.add_error = (message, meta) => {
  console.error("[ErrorHandler]", message, meta);
};

Logger.writeLog = (log) => {
  console.log("[Logger]", log);
};

// 🧪 Utility override (dynamic schema handling)
SafeUtils.sanitizeValidate = (schema) => {
  const output = {};
  for (const key in schema) {
    const { value, type, required, default: def } = schema[key];
    if (required && (value === undefined || value === null)) {
      throw new Error(`Validation failed: ${key} is required`);
    }
    if (type === "string" && value && typeof value !== "string") {
      throw new Error(`Validation failed: ${key} must be a string`);
    }
    if (type === "array" && value && !Array.isArray(value)) {
      throw new Error(`Validation failed: ${key} must be an array`);
    }
    output[key] = value ?? def ?? null;
  }
  return output;
};

SafeUtils.hasValue = (val) => val !== undefined && val !== null;

// 🧪 Test Cases

async function testValidChat() {
  const chatId = await ChatManager.createChat({
    createdBy: "user_abc",
    participants: ["user_abc", "user_xyz"],
    name: "Test Chat",
    metadata: { project: "X" },
  });
  console.log("✅ Valid chat → chatId:", chatId);
}

async function testMissingCreatedBy() {
  const chatId = await ChatManager.createChat({
    participants: ["user_abc", "user_xyz"],
    name: "Chat with no creator",
  });
  console.log("❌ Missing createdBy → chatId:", chatId);
}

async function testMissingParticipants() {
  const chatId = await ChatManager.createChat({
    createdBy: "user_abc",
    name: "Chat with no participants",
  });
  console.log("❌ Missing participants → chatId:", chatId);
}

async function testInvalidParticipantsType() {
  const chatId = await ChatManager.createChat({
    createdBy: "user_abc",
    participants: "user_xyz", // ❌ Not an array
    name: "Invalid participants",
  });
  console.log("❌ Invalid participants type → chatId:", chatId);
}

async function testOptionalNameOmitted() {
  const chatId = await ChatManager.createChat({
    createdBy: "user_abc",
    participants: ["user_abc", "user_xyz"],
    metadata: { debug: true },
  });
  console.log("✅ No name provided → chatId:", chatId);
}

async function testOptionalMetadataOmitted() {
  const chatId = await ChatManager.createChat({
    createdBy: "user_abc",
    participants: ["user_abc", "user_xyz"],
    name: "No Metadata Chat",
  });
  console.log("✅ No metadata provided → chatId:", chatId);
}

// 🔁 Execute All

async function createChat_test() {
  console.log("🔍 Running chat creation tests...\n");
  await ScyllaDb.loadTableConfigs("./tables.json");

  await testValidChat();
  console.log("-----");

  await testMissingCreatedBy();
  console.log("-----");

  await testMissingParticipants();
  console.log("-----");

  await testInvalidParticipantsType();
  console.log("-----");

  await testOptionalNameOmitted();
  console.log("-----");

  await testOptionalMetadataOmitted();
  console.log("-----");
}

createChat_test();
export default createChat_test;
