import { BeforeAll, AfterAll, After } from '@cucumber/cucumber';
import { connectMongo, disconnectMongo } from '@byteroute/shared';
import mongoose from 'mongoose';

// Re-use MONGODB_URI from the environment (set by CI) but target a dedicated
// cucumber database so unit tests and e2e tests never share state.
const base = process.env.MONGODB_URI ?? 'mongodb://mongodb:27017/byteroute';
const TEST_DB_URI = base.replace(/\/[^/?]+(\?|$)/, '/byteroute_cucumber_test$1');

BeforeAll({ timeout: 30_000 }, async function () {
  process.env.JWT_SECRET = 'test-jwt-secret-for-cucumber';
  process.env.MONGODB_URI = TEST_DB_URI;
  await connectMongo();
});

AfterAll({ timeout: 10_000 }, async function () {
  await disconnectMongo();
});

/** Wipe every collection after each scenario for full isolation. */
After(async function () {
  const { collections } = mongoose.connection;
  await Promise.all(Object.values(collections).map((c) => c.deleteMany({})));
});
