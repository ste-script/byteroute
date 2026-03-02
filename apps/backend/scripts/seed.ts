import { connectMongo, disconnectMongo, mongoose } from "../src/infrastructure/persistence/mongoose.js";
import { UserModel } from "../src/infrastructure/persistence/models/user.model.js";

async function wipeAndReseed(): Promise<void> {
  await connectMongo();

  const dbName = mongoose.connection.db?.databaseName ?? "(unknown)";
  console.log(`Connected to MongoDB database: ${dbName}`);

  await mongoose.connection.dropDatabase();
  console.log("Dropped database");

  await UserModel.init();
  await UserModel.create([
    { email: "admin@byteroute.dev", name: "Admin" },
    { email: "demo@byteroute.dev", name: "Demo" }
  ]);

  console.log("Seed complete");
}

wipeAndReseed()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await disconnectMongo();
    } catch (err) {
      console.error(err);
      process.exitCode = 1;
    }
  });
