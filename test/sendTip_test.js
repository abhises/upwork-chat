import ChatManager from "../service/chat.js";
import { ScyllaDb, Logger, ErrorHandler } from "../utils/index.js";

// ⛏️ Mock loggers
Logger.writeLog = (log) => console.log("[Logger]", log);
ErrorHandler.add_error = (msg, meta) =>
  console.error("[ErrorHandler]", msg, meta);

async function testSendTip_Valid() {
  const chatId = "chat#202508041601";
  const messageId = "msg#001"; // Make sure this exists
  const result = await ChatManager.sendTip(chatId, messageId, 15.75, "USD");
  console.log("✅ sendTip (valid) →", result);
}

async function testSendTip_DefaultCurrency() {
  const chatId = "chat#202508041601";
  const messageId = "msg#001";
  const result = await ChatManager.sendTip(chatId, messageId, 10);
  console.log("✅ sendTip (default currency AUD) →", result);
}

async function testSendTip_InvalidAmountType() {
  const result = await ChatManager.sendTip(
    "chat#202508041601",
    "msg#001",
    "fifteen"
  );
  console.log("❌ sendTip (invalid amount type) →", result);
}

async function testSendTip_MissingMessage() {
  const result = await ChatManager.sendTip(
    "chat#202508041601",
    "msg#doesnotexist",
    5
  );
  console.log("❌ sendTip (nonexistent message) →", result);
}

async function testSendTip_MissingParams() {
  const result = await ChatManager.sendTip(null, null, null);
  console.log("❌ sendTip (missing parameters) →", result);
}

async function sendTip_test() {
  console.log("🔍 Running sendTip tests...\n");
  await ScyllaDb.loadTableConfigs?.("./tables.json");

  await testSendTip_Valid();
  console.log("-----");

  await testSendTip_DefaultCurrency();
  console.log("-----");

  await testSendTip_InvalidAmountType();
  console.log("-----");

  await testSendTip_MissingMessage();
  console.log("-----");

  await testSendTip_MissingParams();
  console.log("-----");
}

sendTip_test();

export default sendTip_test;
