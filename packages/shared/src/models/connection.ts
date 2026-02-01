import mongoose, { Schema, type InferSchemaType } from "mongoose";

const connectionSchema = new Schema(
  {
    id: { type: String, required: true, unique: true, index: true, trim: true },
    sourceIp: { type: String, required: true, trim: true },
    destIp: { type: String, required: true, trim: true },
    sourcePort: { type: Number, required: true },
    destPort: { type: Number, required: true },
    protocol: { type: String, required: true },
    status: { type: String, required: true },

    enriched: { type: Boolean, default: false },

    country: { type: String },
    countryCode: { type: String },
    city: { type: String },
    latitude: { type: Number },
    longitude: { type: Number },

    asn: { type: Number },
    asOrganization: { type: String },

    category: { type: String },
    bandwidth: { type: Number },
    bytesIn: { type: Number },
    bytesOut: { type: Number },
    packetsIn: { type: Number },
    packetsOut: { type: Number },

    startTime: { type: Date, required: true },
    lastActivity: { type: Date, required: true },
    duration: { type: Number },
  },
  {
    timestamps: true,
  }
);

connectionSchema.index({ lastActivity: -1 });
connectionSchema.index({ sourceIp: 1, destIp: 1, lastActivity: -1 });

export type ConnectionDoc = InferSchemaType<typeof connectionSchema>;

export const ConnectionModel =
  mongoose.models.Connection ?? mongoose.model<ConnectionDoc>("Connection", connectionSchema);
