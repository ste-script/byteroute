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
 * @module backend/infrastructure/persistence/models/connection.model
 */

import mongoose, { Schema, type InferSchemaType } from "mongoose";

const connectionSchema = new Schema(
  {
    tenantId: { type: String, required: true, index: true, trim: true },
    id: { type: String, required: true, index: true, trim: true },
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
    destCountry: { type: String },
    destCountryCode: { type: String },
    destCity: { type: String },
    destLatitude: { type: Number },
    destLongitude: { type: Number },

    asn: { type: Number },
    asOrganization: { type: String },
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
  },
);

connectionSchema.index({ tenantId: 1, id: 1 }, { unique: true });
connectionSchema.index({ lastActivity: -1 });
connectionSchema.index({
  tenantId: 1,
  sourceIp: 1,
  destIp: 1,
  lastActivity: -1,
});

export type ConnectionDoc = InferSchemaType<typeof connectionSchema>;

export const ConnectionModel =
  mongoose.models.Connection ??
  mongoose.model<ConnectionDoc>("Connection", connectionSchema);
