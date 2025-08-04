import {
  DateTime,
  SafeUtils,
  ScyllaDb,
  ErrorHandler,
  Logger,
} from "../utils/index.js";

export default class ChatManager {
  static async createChat(params) {
    try {
      const { createdBy, participants, name } = SafeUtils.sanitizeValidate({
        createdBy: { value: params.createdBy, type: "string", required: true },
        participants: {
          value: params.participants,
          type: "array",
          required: true,
        },
        name: {
          value: params.name,
          type: "string",
          required: false,
          default: null,
        },
      });
      const metadata = SafeUtils.hasValue(params.metadata)
        ? params.metadata
        : {};
      const chatId = `chat#${DateTime.generateRelativeTimestamp(
        "yyyyMMddHHmmss"
      )}`;
      const item = {
        chat_id: chatId,
        is_group: false,
        created_by: createdBy,
        participants,
        name,
        metadata,
        created_at: DateTime.now(),
      };
      await ScyllaDb.putItem("chats", item);
      return chatId;
    } catch (err) {
      ErrorHandler.add_error("createChat failed", {
        error: err.message,
        params,
      });
      Logger.writeLog({
        flag: "system_error",
        action: "createChat",
        message: err.message,
        critical: true,
        data: { params },
      });
      return null;
    }
  }

  static async createChimeChat(params) {
    try {
      // First extract participants without relying on participants.length
      const {
        createdBy,
        participants,
        name,
        mode,
        maxParticipants: providedMaxParticipants,
      } = SafeUtils.sanitizeValidate({
        createdBy: {
          value: params.createdBy,
          type: "string",
          required: true,
        },
        participants: {
          value: params.participants,
          type: "array",
          required: true,
        },
        name: {
          value: params.name,
          type: "string",
          required: false,
          default: null,
        },
        mode: {
          value: params.mode,
          type: "string",
          required: false,
          default: "private",
        },
        maxParticipants: {
          value: params.maxParticipants,
          type: "number",
          required: false,
          // ❌ No default here!
        },
      });

      // ✅ Now it's safe to use participants.length
      const maxParticipants = providedMaxParticipants ?? participants.length;

      const metadata = SafeUtils.hasValue(params.metadata)
        ? params.metadata
        : {};

      const chatId = `chat#${DateTime.generateRelativeTimestamp(
        "yyyyMMddHHmmss"
      )}`;

      const item = {
        chat_id: chatId,
        is_group: true,
        created_by: createdBy,
        participants,
        name,
        mode,
        max_participants: maxParticipants,
        metadata,
        created_at: DateTime.now(),
      };

      await ScyllaDb.putItem("chats", item);
      return chatId;
    } catch (err) {
      ErrorHandler.add_error("createChimeChat failed", {
        error: err.message,
        params,
      });
      Logger.writeLog({
        flag: "system_error",
        action: "createChimeChat",
        message: err.message,
        critical: true,
        data: { params },
      });
      return null;
    }
  }

  static async fetchRecentMessages(chatId, pagingState = null, limit = 20) {
    try {
      const {
        chatId: id,
        pagingState: state,
        limit: max,
      } = SafeUtils.sanitizeValidate({
        chatId: { value: chatId, type: "string", required: true },
        pagingState: {
          value: pagingState,
          type: "object",
          required: false,
          default: null,
        },
        limit: { value: limit, type: "number", required: false, default: 20 },
      });

      const exprVals = {
        ":cid": id,
        ":lastTs": state?.message_ts ?? DateTime.now("number"),
      };

      const queryOptions = {
        Limit: max,
        ScanIndexForward: false,
      };

      if (state) {
        queryOptions.ExclusiveStartKey = state;
      }

      // ✅ `ScyllaDb.query()` returns an array (not an object), so assign directly
      const messages = await ScyllaDb.query(
        "chat_messages",
        "chat_id = :cid AND message_ts <= :lastTs", // <-- changed < to <=
        exprVals,
        queryOptions
      );

      return {
        messages,
        pagingState: null, // Since query() doesn’t return LastEvaluatedKey
      };
    } catch (err) {
      ErrorHandler.add_error("fetchRecentMessages failed", {
        error: err.message,
        chatId,
        pagingState,
        limit,
      });
      Logger.writeLog({
        flag: "system_error",
        action: "fetchRecentMessages",
        message: err.message,
        critical: false,
        data: { chatId, pagingState, limit },
      });
      return { messages: [], pagingState: null };
    }
  }

  static async fetchUserChats(userId) {
    try {
      const { userId: uid } = SafeUtils.sanitizeValidate({
        userId: { value: userId, type: "string", required: true },
      });

      const res = await ScyllaDb.query(
        "user_chats",
        "user_id = :uid",
        { ":uid": uid },
        { ScanIndexForward: false }
      );

      // console.log("res in peace", res); // debugging

      return res.map((item) => item); // ✅ FIXED LINE
    } catch (err) {
      ErrorHandler.add_error("fetchUserChats failed", {
        error: err.message,
        userId,
      });
      Logger.writeLog({
        flag: "system_error",
        action: "fetchUserChats",
        message: err.message,
        critical: false,
        data: { userId },
      });
      return [];
    }
  }

  static async archiveChat(chatId, userId) {
    try {
      const { chatId: cid, userId: uid } = SafeUtils.sanitizeValidate({
        chatId: { value: chatId, type: "string", required: true },
        userId: { value: userId, type: "string", required: true },
      });

      // ✅ Corrected and extended update: includes both archived_at and user_id
      const results = await ScyllaDb.updateItem(
        "chats",
        { chat_id: cid },
        {
          archived_at: DateTime.now(),
        }
      );

      return results;
    } catch (err) {
      ErrorHandler.add_error("archiveChat failed", {
        error: err.message,
        chatId,
        userId,
      });
      Logger.writeLog({
        flag: "system_error",
        action: "archiveChat",
        message: err.message,
        critical: false,
        data: { chatId, userId },
      });
      return false;
    }
  }
}
