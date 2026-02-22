import { BeforeAll, AfterAll, After } from '@cucumber/cucumber';
import { connectMongo, disconnectMongo } from '@byteroute/shared';
import mongoose from 'mongoose';

BeforeAll({ timeout: 30_000 }, async function () {
  process.env.JWT_SECRET = 'test-jwt-secret-for-cucumber';

  // Re-use MONGODB_URI from the environment (set by CI) but target a dedicated
  // cucumber database so unit tests and e2e tests never share state.
  // Fallback uses localhost so this also works without Docker Compose.
  const base = process.env.MONGODB_URI ?? 'mongodb://localhost:27017/byteroute';
  process.env.MONGODB_URI = base.replace(/\/[^/?]+(\?|$)/, '/byteroute_cucumber_test$1');

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
