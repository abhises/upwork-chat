import fs from "fs/promises";
import path from "path";
import ErrorHandler from "../utils/ErrorHandler.js";
import Logger from "../utils/UtilityLogger.js";
import ScyllaDb from "../utils/ScyllaDb.js";
import DateTime from "../utils/DateTime.js";

async function deleteAllTablesFromJson() {
  try {
    Logger.writeLog({
      flag: "startup",
      action: "deleteAllTablesFromJson",
      message: "Reading table definitions from JSON for deletion",
      data: {
        time: DateTime.now(),
      },
    });

    console.log("now time has been given", DateTime.now());
    const raw = await fs.readFile(path.resolve("./tables.json"), "utf-8");
    const schemas = JSON.parse(raw);

    for (const schema of schemas) {
      const tableName = schema.TableName;
      try {
        Logger.writeLog({
          flag: "startup",
          action: "deleteTable",
          message: `Deleting table: ${tableName}`,
          data: {
            time: DateTime.now(),
          },
        });

        await ScyllaDb.deleteTable(tableName); // assumes you have a deleteTable method
        Logger.writeLog({
          flag: "success",
          action: "deleteTable",
          message: `Successfully deleted table: ${tableName}`,
          data: {
            time: DateTime.now(),
          },
        });
      } catch (err) {
        ErrorHandler.add_error(`Failed to delete table ${tableName}`, {
          error: err.message,
        });
        Logger.writeLog({
          flag: "system_error",
          action: "deleteTable",
          message: err.message,
          critical: true,
          data: {
            time: DateTime.now(),
          },
        });
      }
    }

    return true;
  } catch (err) {
    ErrorHandler.add_error("Failed to delete tables from JSON", {
      error: err.message,
    });
    Logger.writeLog({
      flag: "system_error",
      action: "deleteAllTablesFromJson",
      message: err.message,
      critical: true,
      data: {
        time: DateTime.now(),
      },
    });
    return false;
  }
}

deleteAllTablesFromJson();
