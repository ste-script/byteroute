import { BeforeAll, AfterAll, After } from '@cucumber/cucumber';
import { connectMongo, disconnectMongo } from '@byteroute/shared';
import mongoose from 'mongoose';

const TEST_DB_URI = 'mongodb://mongodb:27017/byteroute_cucumber_test';

BeforeAll(async function () {
  process.env.JWT_SECRET = 'test-jwt-secret-for-cucumber';
  process.env.MONGODB_URI = TEST_DB_URI;
  await connectMongo();
});

AfterAll(async function () {
  await disconnectMongo();
});

/** Wipe every collection after each scenario for full isolation. */
After(async function () {
  const { collections } = mongoose.connection;
  await Promise.all(Object.values(collections).map((c) => c.deleteMany({})));
});
