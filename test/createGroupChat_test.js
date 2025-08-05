import ChatManager from "../service/chat.js";
import { ScyllaDb, ErrorHandler, Logger } from "../utils/index.js";

// 🪵 Logging setup
Logger.writeLog = (log) => console.log("[Logger]", log);
ErrorHandler.add_error = (msg, meta) =>
  console.error("[ErrorHandler]", msg, meta);

// 🧪 1️⃣ Valid group chat creation
async function testValidGroupChat() {
  const result = await ChatManager.createGroupChat({
    createdBy: "user_001",
    participants: ["user_001", "user_002", "user_003"],
    name: "My Group Chat",
    description: "This is a test group",
    coverImageUrl: "https://example.com/cover.jpg",
    rulesJson: { maxLength: 1000 },
    category: "friends",
    type: "private",
  });
  console.log("✅ createGroupChat (valid) →", result);
}

// 🧪 2️⃣ Missing createdBy
async function testMissingCreatedBy() {
  const result = await ChatManager.createGroupChat({
    participants: ["user_001", "user_002"],
  });
  console.log("❌ createGroupChat (missing createdBy) →", result);
}

// 🧪 3️⃣ Missing participants
async function testMissingParticipants() {
  const result = await ChatManager.createGroupChat({
    createdBy: "user_001",
  });
  console.log("❌ createGroupChat (missing participants) →", result);
}

// 🧪 4️⃣ Invalid participants type
async function testInvalidParticipantsType() {
  const result = await ChatManager.createGroupChat({
    createdBy: "user_001",
    participants: "user_002", // ❌ should be an array
  });
  console.log("❌ createGroupChat (invalid participants type) →", result);
}

// 🧪 5️⃣ Optional fields only
async function testWithOnlyRequiredFields() {
  const result = await ChatManager.createGroupChat({
    createdBy: "user_001",
    participants: ["user_001", "user_002"],
  });
  console.log("✅ createGroupChat (required fields only) →", result);
}

// 🚀 Runner
async function createGroupChat_test() {
  console.log("🔍 Running createGroupChat tests...\n");

  await ScyllaDb.loadTableConfigs?.("./tables.json");

  await testValidGroupChat();
  console.log("-----");

  await testMissingCreatedBy();
  console.log("-----");

  await testMissingParticipants();
  console.log("-----");

  await testInvalidParticipantsType();
  console.log("-----");

  await testWithOnlyRequiredFields();
  console.log("-----");
}

createGroupChat_test();
export default createGroupChat_test;
