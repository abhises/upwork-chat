import fs from "fs/promises";
import path from "path";
import { ErrorHandler, Logger, ScyllaDb, DateTime } from "../utils/index.js";

async function createAllTablesFromJson() {
  try {
    Logger.writeLog({
      flag: "startup",
      action: "createAllTablesFromJson",
      message: "Reading table definitions from JSON",
      data: {
        time: DateTime.now(),
      },
    });

    console.log("now time has been given", DateTime.now());
    const raw = await fs.readFile(path.resolve("./tables.json"), "utf-8");
    const schemas = JSON.parse(raw);

    // ✅ Iterate over object values
    for (const schema of Object.values(schemas)) {
      try {
        Logger.writeLog({
          flag: "startup",
          action: "createTable",
          message: `Creating table: ${schema.TableName}`,
          data: {
            time: DateTime.now(),
          },
        });

        await ScyllaDb.createTable(schema);

        Logger.writeLog({
          flag: "success",
          action: "createTable",
          message: `Successfully created ${schema.TableName}`,
          data: {
            time: DateTime.now(),
          },
        });
      } catch (err) {
        ErrorHandler.add_error(`Failed to create table ${schema.TableName}`, {
          error: err.message,
        });

        Logger.writeLog({
          flag: "system_error",
          action: "createTable",
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
    ErrorHandler.add_error("Failed to create tables from JSON", {
      error: err.message,
    });

    Logger.writeLog({
      flag: "system_error",
      action: "createAllTablesFromJson",
      message: err.message,
      critical: true,
      data: {
        time: DateTime.now(),
      },
    });

    return false;
  }
}

createAllTablesFromJson();
