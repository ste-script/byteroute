/*

 * Copyright 2026 Stefano Babini
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

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
