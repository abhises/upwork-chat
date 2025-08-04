import ChatManager from "../service/chat.js";
import {
  DateTime,
  SafeUtils,
  ScyllaDb,
  ErrorHandler,
  Logger,
} from "../utils/index.js";

// ✅ Ensure consistent timestamps for predictable output
DateTime.now = () => "2025-08-04T15:30:00.000Z";
DateTime.generateRelativeTimestamp = () => "20250804153000";

// ✅ Logger and error handler
Logger.writeLog = (log) => {
  console.log("[Logger]", log);
};

ErrorHandler.add_error = (msg, meta) => {
  console.error("[ErrorHandler]", msg, meta);
};

// ✅ SafeUtils and SafeUtils validation logic
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
    if (type === "number" && value && typeof value !== "number") {
      throw new Error(`Validation failed: ${key} must be a number`);
    }
    output[key] = value ?? def ?? null;
  }
  return output;
};

SafeUtils.hasValue = (val) => val !== undefined && val !== null;
SafeUtils.hasValue = (val) => val !== undefined && val !== null;

// 🧪 Test Cases

async function testValidChimeChat() {
  const chatId = await ChatManager.createChimeChat({
    createdBy: "user_abc",
    participants: ["user_abc", "user_xyz"],
    name: "Voice Team",
    metadata: { voice: true },
  });
  console.log("✅ Valid chime chat → chatId:", chatId);
}

async function testMissingCreatedBy() {
  const chatId = await ChatManager.createChimeChat({
    participants: ["user_xyz"],
    name: "No Creator Chat",
  });
  console.log("❌ Missing createdBy → chatId:", chatId);
}

async function testMissingParticipants() {
  const chatId = await ChatManager.createChimeChat({
    createdBy: "user_abc",
    name: "No Participants Chat",
  });
  console.log("❌ Missing participants → chatId:", chatId);
}

async function testInvalidParticipantsType() {
  const chatId = await ChatManager.createChimeChat({
    createdBy: "user_abc",
    participants: "user_xyz", // ❌ Not an array
    name: "Bad Participants Format",
  });
  console.log("❌ Invalid participants type → chatId:", chatId);
}

async function testOptionalNameOmitted() {
  const chatId = await ChatManager.createChimeChat({
    createdBy: "user_abc",
    participants: ["user_abc", "user_xyz"],
    metadata: { feature: "no-name" },
  });
  console.log("✅ No name → chatId:", chatId);
}

async function testOptionalMetadataOmitted() {
  const chatId = await ChatManager.createChimeChat({
    createdBy: "user_abc",
    participants: ["user_abc", "user_xyz"],
    name: "No Metadata",
  });
  console.log("✅ No metadata → chatId:", chatId);
}

async function testOverrideMaxParticipants() {
  const chatId = await ChatManager.createChimeChat({
    createdBy: "user_abc",
    participants: ["user_abc", "user_xyz"],
    name: "Max Test",
    maxParticipants: 50,
    metadata: { test: true },
  });
  console.log("✅ Overridden maxParticipants → chatId:", chatId);
}

// 🔁 Execute All
async function createChimeChat_test() {
  console.log("🔍 Running createChimeChat tests...\n");

  await ScyllaDb.loadTableConfigs("./tables.json"); // optional if needed by your putItem

  await testValidChimeChat();
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

  await testOverrideMaxParticipants();
  console.log("-----");
}

createChimeChat_test();
export default createChimeChat_test;
