import mongoose, { Schema, type InferSchemaType, type Types } from "mongoose";

const tenantSchema = new Schema(
  {
    tenantId: { type: String, required: true, unique: true, trim: true },
    ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, trim: true },
  },
  {
    timestamps: true,
  }
);

tenantSchema.index({ ownerId: 1, tenantId: 1 }, { unique: true });

export type TenantDoc = InferSchemaType<typeof tenantSchema> & { ownerId: Types.ObjectId };

export const TenantModel =
  mongoose.models.Tenant ?? mongoose.model<TenantDoc>("Tenant", tenantSchema);
