// test/sendVirtualGift.test.js

import ChatManager from "../service/chat.js";
import { ScyllaDb, Logger, ErrorHandler } from "../utils/index.js";

Logger.writeLog = (log) => console.log("[Logger]", log);
ErrorHandler.add_error = (msg, meta) =>
  console.error("[ErrorHandler]", msg, meta);

async function testSendVirtualGift_Valid() {
  const chatId = "chat#202508041601";
  const messageId = "msg#001"; // Ensure seeded with matching message_ts
  const giftData = {
    name: "Virtual Rose",
    icon: "🌹",
    price: 50,
  };

  const result = await ChatManager.sendVirtualGift(chatId, messageId, giftData);
  console.log("✅ sendVirtualGift (valid) →", result);
}

async function testSendVirtualGift_InvalidMessage() {
  const result = await ChatManager.sendVirtualGift(
    "chat#202508041601",
    "msg#doesnotexist",
    { name: "Balloon", icon: "🎈", price: 10 }
  );
  console.log("❌ sendVirtualGift (nonexistent message) →", result);
}

async function testSendVirtualGift_MissingGift() {
  const result = await ChatManager.sendVirtualGift(
    "chat#202508041601",
    "msg#001",
    null
  );
  console.log("❌ sendVirtualGift (missing giftData) →", result);
}

async function sendVirtualGift_test() {
  console.log("🔍 Running sendVirtualGift tests...\n");
  await ScyllaDb.loadTableConfigs?.("./tables.json");

  await testSendVirtualGift_Valid();
  console.log("-----");

  await testSendVirtualGift_InvalidMessage();
  console.log("-----");

  await testSendVirtualGift_MissingGift();
  console.log("-----");
}

sendVirtualGift_test();

export default sendVirtualGift_test;
