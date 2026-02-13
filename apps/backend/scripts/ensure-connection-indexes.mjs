import { connectMongo, disconnectMongo, ConnectionModel } from "@byteroute/shared";

async function ensureConnectionIndexes() {
  await connectMongo();

  const collection = ConnectionModel.collection;
  const indexes = await collection.indexes();

  const singleIdUnique = indexes.find((index) => {
    const keys = Object.keys(index.key ?? {});
    return index.unique === true && keys.length === 1 && keys[0] === "id";
  });

  if (singleIdUnique?.name) {
    await collection.dropIndex(singleIdUnique.name);
    console.log(`[indexes] Dropped legacy unique index: ${singleIdUnique.name}`);
  } else {
    console.log("[indexes] Legacy single-field unique id index not found");
  }

  await ConnectionModel.syncIndexes();
  const after = await collection.indexes();

  const compositeExists = after.some((index) => {
    const key = index.key ?? {};
    return index.unique === true && key.tenantId === 1 && key.id === 1;
  });

  if (!compositeExists) {
    throw new Error("Missing required unique composite index { tenantId: 1, id: 1 }");
  }

  console.log("[indexes] Connection indexes are synchronized and tenant-safe");
}

ensureConnectionIndexes()
  .catch((error) => {
    console.error("[indexes] Failed to ensure connection indexes:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectMongo();
  });
