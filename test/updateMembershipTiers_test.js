import ChatManager from "../service/chat.js";
import { ScyllaDb, Logger, ErrorHandler } from "../utils/index.js";

// 🛠 Mock logger/error handlers
Logger.writeLog = (log) => console.log("[Logger]", log);
ErrorHandler.add_error = (msg, meta) =>
  console.error("[ErrorHandler]", msg, meta);

// 🧪 1️⃣ Valid input
async function testUpdateMembershipTiers_Valid() {
  const chatId = "chat#202508041601"; // Ensure this exists in your DB
  const tiers = [
    { level: "Basic", price: 5 },
    { level: "Premium", price: 15 },
  ];

  const result = await ChatManager.updateMembershipTiers(chatId, tiers);
  console.log("✅ updateMembershipTiers (valid) →", result);
}

// 🧪 2️⃣ Missing chatId
async function testUpdateMembershipTiers_MissingChatId() {
  const tiers = [{ level: "Gold", price: 25 }];
  const result = await ChatManager.updateMembershipTiers(null, tiers);
  console.log("❌ updateMembershipTiers (missing chatId) →", result);
}

// 🧪 3️⃣ Invalid tiers type
async function testUpdateMembershipTiers_InvalidTiers() {
  const chatId = "chat#202508041601";
  const tiers = "not-an-array";
  const result = await ChatManager.updateMembershipTiers(chatId, tiers);
  console.log("❌ updateMembershipTiers (invalid tiers type) →", result);
}

// 🧪 4️⃣ Empty tiers array
async function testUpdateMembershipTiers_EmptyTiers() {
  const chatId = "chat#202508041601";
  const tiers = [];
  const result = await ChatManager.updateMembershipTiers(chatId, tiers);
  console.log("⚠️ updateMembershipTiers (empty tiers) →", result);
}

// 🚀 Runner
async function updateMembershipTiers_test() {
  console.log("🔍 Running updateMembershipTiers tests...\n");

  await ScyllaDb.loadTableConfigs?.("./tables.json");

  await testUpdateMembershipTiers_Valid();
  console.log("-----");

  await testUpdateMembershipTiers_MissingChatId();
  console.log("-----");

  await testUpdateMembershipTiers_InvalidTiers();
  console.log("-----");

  await testUpdateMembershipTiers_EmptyTiers();
  console.log("-----");
}

updateMembershipTiers_test();

export default updateMembershipTiers_test;
