import { ScyllaDb, DateTime, Logger, ErrorHandler } from "../../utils/index.js";

const users = ["user_001", "user_002", "user_003", "user_004", "user_005"];
const now = Date.now(); // ✅ Use native timestamp
const baseTimestamp = now - 5000;

const logDivider = () => {
  console.log("----------------------------------------------------");
};

async function seedChatsTable() {
  console.log("\n📥 Seeding `chats` table...");
  const seeded = [];

  for (let i = 1; i <= 5; i++) {
    const chatId = `chat#20250804160${i}`;
    const item = {
      chat_id: chatId,
      created_by: users[i % users.length],
      is_group: true,
      participants: [users[i % users.length], users[(i + 1) % users.length]],
      name: `Seeded Chat ${i}`,
      metadata: { seedIndex: i },
      created_at: new Date().toISOString(), // ✅ ensure string
    };

    try {
      await ScyllaDb.putItem("chats", item);
      seeded.push(item);
      console.log(`✅ Inserted into chats: ${chatId}`);
    } catch (err) {
      console.error(`❌ Error inserting into chats: ${err.message}`);
      ErrorHandler.add_error("Seeding chats failed", {
        error: err.message,
        chatId,
      });
    }
  }

  logDivider();
  console.log("📊 Inserted Records in `chats`:");
  console.table(seeded.map(({ participants, metadata, ...rest }) => rest));
  logDivider();
}

async function seedUserChatsTable() {
  console.log("\n📥 Seeding `user_chats` table...");
  const seeded = [];

  for (let i = 1; i <= 5; i++) {
    const chatId = `chat#20250804160${i}`;
    const userId = users[i % users.length];
    const lastMessageTs = baseTimestamp + i * 1000;

    const item = {
      user_id: userId,
      chat_id: chatId,
      is_critical: (i % 2 === 0).toString(), // ✅ S type
      featured: (i % 3 === 0).toString(), // ✅ S type
      last_message_ts: lastMessageTs, // ✅ N type
    };

    try {
      console.log("🧪 Inserting into user_chats:", item);
      await ScyllaDb.putItem("user_chats", item);
      seeded.push(item);
      console.log(`✅ Inserted into user_chats: ${userId} ↔ ${chatId}`);
    } catch (err) {
      console.error(`❌ Error inserting into user_chats: ${err.message}`);
      ErrorHandler.add_error("Seeding user_chats failed", {
        error: err.message,
        chatId,
      });
    }
  }

  logDivider();
  console.log("📊 Inserted Records in `user_chats`:");
  console.table(seeded);
  logDivider();
}

async function seedChatMessagesTable() {
  console.log("\n📥 Seeding `chat_messages` table...");
  const seeded = [];

  for (let i = 1; i <= 5; i++) {
    const chatId = `chat#20250804160${i}`;
    const messageTs = baseTimestamp + i * 1000;

    const item = {
      chat_id: chatId,
      message_ts: messageTs, // ✅ N type
      message_id: `msg#00${i}`,
      sender_id: users[(i + 2) % users.length],
      content: `Hello from seeded message ${i}`,
      created_at: new Date().toISOString(), // ✅ S type
    };

    try {
      console.log("🧪 Inserting into chat_messages:", item);
      await ScyllaDb.putItem("chat_messages", item);
      seeded.push(item);
      console.log(`✅ Inserted into chat_messages: ${item.message_id}`);
    } catch (err) {
      console.error(`❌ Error inserting into chat_messages: ${err.message}`);
      ErrorHandler.add_error("Seeding chat_messages failed", {
        error: err.message,
        chatId,
      });
    }
  }

  logDivider();
  console.log("📊 Inserted Records in `chat_messages`:");
  console.table(seeded.map(({ content, ...row }) => row));
  logDivider();
}

async function runSeed() {
  console.log("🌱 Running ScyllaDB seeder...");
  await ScyllaDb.loadTableConfigs("./tables.json");

  await seedChatsTable();
  await seedUserChatsTable();
  await seedChatMessagesTable();

  console.log("\n🌿 DB seeding completed successfully.");
}

runSeed();
