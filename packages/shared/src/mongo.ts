import mongoose from "mongoose";

function getMongoUri(): string {
  return process.env.MONGODB_URI ?? "mongodb://mongodb:27017/byteroute";
}

export async function connectMongo(): Promise<void> {
  if (mongoose.connection.readyState === 1) {
    return;
  }

  await mongoose.connect(getMongoUri());
}

export async function disconnectMongo(): Promise<void> {
  if (mongoose.connection.readyState === 0) {
    return;
  }

  await mongoose.disconnect();
}

export function mongoReadyState(): number {
  return mongoose.connection.readyState;
}

export { mongoose };
