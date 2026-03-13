/**
 * @module backend/infrastructure/persistence/mongoose
 */

import mongoose from "mongoose";

/**
 * Gets mongo uri.
 * @returns The mongo uri.
 */

function getMongoUri(): string {
  const uri = process.env.MONGODB_URI ?? "mongodb://mongodb:27017/byteroute";
  if (!uri) {
    throw new Error("MONGODB_URI is not set");
  }
  return uri;
}

/**
 * Connects mongo.
 */

export async function connectMongo(): Promise<void> {
  if (mongoose.connection.readyState === 1) {
    return;
  }

  await mongoose.connect(getMongoUri());
}

/**
 * Disconnects mongo.
 */

export async function disconnectMongo(): Promise<void> {
  if (mongoose.connection.readyState === 0) {
    return;
  }

  await mongoose.disconnect();
}

/**
 * Mongoes ready state.
 * @returns The ready state result.
 */

export function mongoReadyState(): number {
  return mongoose.connection.readyState;
}

export { mongoose };
