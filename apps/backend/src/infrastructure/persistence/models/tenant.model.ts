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
 * @module backend/infrastructure/persistence/models/tenant.model
 */

import mongoose, { Schema, type InferSchemaType, type Types } from "mongoose";

const tenantSchema = new Schema(
  {
    tenantId: { type: String, required: true, unique: true, trim: true },
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    name: { type: String, trim: true },
  },
  {
    timestamps: true,
  },
);

tenantSchema.index({ ownerId: 1, tenantId: 1 }, { unique: true });

export type TenantDoc = InferSchemaType<typeof tenantSchema> & {
  ownerId: Types.ObjectId;
};

export const TenantModel =
  mongoose.models.Tenant ?? mongoose.model<TenantDoc>("Tenant", tenantSchema);
