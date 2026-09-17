// Starts a real local MongoDB (mongod binary, downloaded by mongodb-memory-server)
// as a single-node replica set, so transactions work without Atlas or a brew install.
// Run in a separate terminal: `npm run dev:db`. Data persists in ./.mongo-data across restarts.
import { MongoMemoryReplSet } from "mongodb-memory-server";
import path from "node:path";

const PORT = 27117;
const DB_PATH = path.join(process.cwd(), ".mongo-data");

async function main() {
  const replSet = await MongoMemoryReplSet.create({
    replSet: { count: 1, storageEngine: "wiredTiger", dbName: "todoapp" },
    instanceOpts: [{ port: PORT, dbPath: DB_PATH, storageEngine: "wiredTiger" }],
  });

  const uri = replSet.getUri("todoapp");
  console.log(`\nLocal MongoDB replica set running.`);
  console.log(`Set MONGODB_URI in .env.local to:\n  ${uri}\n`);
  console.log("Press Ctrl+C to stop.");

  const shutdown = async () => {
    await replSet.stop();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
