/**
 * @module backend/db/mongoose
 */

import * as shared from "@byteroute/shared";
import {
  connectMongo as infraConnectMongo,
  disconnectMongo as infraDisconnectMongo,
  mongoReadyState as infraMongoReadyState,
  mongoose as infraMongoose,
} from "../infrastructure/persistence/mongoose.js";

const connectMongo =
  (shared as { connectMongo?: typeof infraConnectMongo }).connectMongo ??
  infraConnectMongo;
const disconnectMongo =
  (shared as { disconnectMongo?: typeof infraDisconnectMongo })
    .disconnectMongo ?? infraDisconnectMongo;
const mongoReadyState =
  (shared as { mongoReadyState?: typeof infraMongoReadyState })
    .mongoReadyState ?? infraMongoReadyState;
const mongoose =
  (shared as { mongoose?: typeof infraMongoose }).mongoose ?? infraMongoose;

export type MongoBindings = {
  connectMongo: typeof connectMongo;
  disconnectMongo: typeof disconnectMongo;
  mongoReadyState: typeof mongoReadyState;
  mongoose: typeof mongoose;
};

/**
 * Creates mongo bindings.
 * @param overrides - The overrides input.
 * @returns The mongo bindings result.
 */

export function createMongoBindings(
  overrides: Partial<MongoBindings> = {},
): MongoBindings {
  return {
    connectMongo,
    disconnectMongo,
    mongoReadyState,
    mongoose,
    ...overrides,
  };
}

export { connectMongo, disconnectMongo, mongoReadyState, mongoose };
