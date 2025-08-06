📁 Project Structure
chat/
├── configs/
│ └── LogRoutes.js # Route-based logging configuration
│
├── db/
│ ├── createTable.js # Creates database tables
│ ├── deleteTable.js # Deletes database tables
│ └── seed/
│ └── seed.js # Seeds initial data into DB
│
├── service/
│ └── chat.js # ChatManager: handles chat operations (join, create, react, etc.)
│
├── utils/
│ ├── DateTime.js # Date/time utilities (Luxon, Moment wrappers)
│ ├── SafeUtils.js # Validation and sanitization utilities
│ ├── ErrorHandler.js # Centralized error logging
│ ├── UtilityLogger.js # General-purpose logger
│ └── index.js # Exports all utility modules
│
├── test/
│ ├── [All *_test.js files] # Individual test files for each service function
│ └── index.js # Aggregates and runs all tests
│
├── tables.json # Table configurations for ScyllaDB
├── .env # Environment config (not included by default)
├── package.json # Project metadata & scripts

📦 Installation

npm install

🛠️ Available Scripts

🔨 Database
Create tables:
--> npm run createTable

Delete tables:
--> npm run deleteTable

Seed database:
--> npm run seed

✅ Run Tests
--> npm test

🧰 Utilities
Custom utilities located in utils/ include:

SafeUtils: Input validation and sanitization

DateTime: Luxon + Moment helpers

ErrorHandler: Centralized error reporting

UtilityLogger: Structured logging for development and system monitoring

🧱 Tables Configuration
tables.json: Contains the structure and metadata for ScyllaDB tables.

Used during table creation and seeding.
