import ChatManager from "../service/chat.js";
import { ScyllaDb, Logger, ErrorHandler } from "../utils/index.js";

// 🧪 Mocks for logging visibility
Logger.writeLog = (log) => console.log("[Logger]", log);
ErrorHandler.add_error = (msg, meta) =>
  console.error("[ErrorHandler]", msg, meta);

// 🧪 1️⃣ Valid case
async function testCreateEventChat_Valid() {
  const params = {
    createdBy: "user_001",
    participants: ["user_001", "user_002"],
    eventId: "event#12345",
    eventPrice: 15.99,
    name: "Live Yoga Session",
    description: "Join us for a calming yoga session",
  };

  const chatId = await ChatManager.createEventChat(params);
  console.log("✅ createEventChat (valid) →", chatId);
}

// 🧪 2️⃣ Missing createdBy
async function testCreateEventChat_MissingCreatedBy() {
  const params = {
    participants: ["user_001", "user_002"],
    eventId: "event#12345",
    eventPrice: 15.99,
  };

  const result = await ChatManager.createEventChat(params);
  console.log("❌ createEventChat (missing createdBy) →", result);
}

// 🧪 3️⃣ Missing participants
async function testCreateEventChat_MissingParticipants() {
  const params = {
    createdBy: "user_001",
    eventId: "event#12345",
    eventPrice: 15.99,
  };

  const result = await ChatManager.createEventChat(params);
  console.log("❌ createEventChat (missing participants) →", result);
}

// 🧪 4️⃣ Missing eventId
async function testCreateEventChat_MissingEventId() {
  const params = {
    createdBy: "user_001",
    participants: ["user_001", "user_002"],
    eventPrice: 15.99,
  };

  const result = await ChatManager.createEventChat(params);
  console.log("❌ createEventChat (missing eventId) →", result);
}

// 🧪 5️⃣ Invalid eventPrice (string instead of number)
async function testCreateEventChat_InvalidPrice() {
  const params = {
    createdBy: "user_001",
    participants: ["user_001", "user_002"],
    eventId: "event#12345",
    eventPrice: "free", // ❌ should be number
  };

  const result = await ChatManager.createEventChat(params);
  console.log("❌ createEventChat (invalid price) →", result);
}

// 🚀 Runner
async function createEventChat_test() {
  console.log("🔍 Running createEventChat tests...\n");

  await ScyllaDb.loadTableConfigs?.("./tables.json");

  await testCreateEventChat_Valid();
  console.log("-----");

  await testCreateEventChat_MissingCreatedBy();
  console.log("-----");

  await testCreateEventChat_MissingParticipants();
  console.log("-----");

  await testCreateEventChat_MissingEventId();
  console.log("-----");

  await testCreateEventChat_InvalidPrice();
  console.log("-----");
}

createEventChat_test();

export default createEventChat_test;
