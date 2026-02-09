import {
  connectMongo,
  disconnectMongo,
  mongoReadyState,
  mongoose
} from "@byteroute/shared";

export type MongoBindings = {
  connectMongo: typeof connectMongo;
  disconnectMongo: typeof disconnectMongo;
  mongoReadyState: typeof mongoReadyState;
  mongoose: typeof mongoose;
};

export function createMongoBindings(overrides: Partial<MongoBindings> = {}): MongoBindings {
  return {
    connectMongo,
    disconnectMongo,
    mongoReadyState,
    mongoose,
    ...overrides
  };
}

export {
  connectMongo,
  disconnectMongo,
  mongoReadyState,
  mongoose
};
