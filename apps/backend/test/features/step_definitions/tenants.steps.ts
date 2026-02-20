/**
 * Step definitions for features/tenants.feature
 */
import assert from 'node:assert/strict';
import { Given, When, Then } from '@cucumber/cucumber';
import request from 'supertest';
import mongoose from 'mongoose';
import { TenantModel } from '@byteroute/shared';
import { testApp } from '../support/app.js';
import type { ByterouteWorld } from '../support/world.js';

// ---------------------------------------------------------------------------
// Given – tenant fixtures
// ---------------------------------------------------------------------------

Given(
  'I own a tenant with id {string}',
  async function (this: ByterouteWorld, tenantId: string) {
    assert(this.userId, 'No authenticated user; call "I am signed in as" first');
    await TenantModel.create({ tenantId, ownerId: this.userId, name: tenantId });
  },
);

Given('I own no tenants', async function (this: ByterouteWorld) {
  if (this.userId) {
    await TenantModel.deleteMany({ ownerId: this.userId });
  }
});

Given(
  'a tenant with id {string} already exists',
  async function (this: ByterouteWorld, tenantId: string) {
    const ownerId = this.userId ?? new mongoose.Types.ObjectId().toString();
    await TenantModel.create({ tenantId, ownerId, name: tenantId });
  },
);

// ---------------------------------------------------------------------------
// When – DELETE
// ---------------------------------------------------------------------------

When(
  'I send DELETE {string} with the auth token',
  async function (this: ByterouteWorld, url: string) {
    const req = request(testApp).delete(url);
    this.res = await (this.authToken
      ? req.set('Authorization', `Bearer ${this.authToken}`)
      : req);
  },
);

When('I send DELETE {string}', async function (this: ByterouteWorld, url: string) {
  this.res = await request(testApp).delete(url);
});

// ---------------------------------------------------------------------------
// Then – tenant-specific body assertions
// ---------------------------------------------------------------------------

Then(
  'the response body should contain a "tenants" array including {string}',
  function (this: ByterouteWorld, tenantId: string) {
    assert.ok(this.res, 'No response recorded');
    const { tenants } = this.res.body as { tenants?: string[] };
    assert.ok(Array.isArray(tenants), 'Expected body.tenants to be an array');
    assert.ok(
      tenants.includes(tenantId),
      `Expected body.tenants to include "${tenantId}", got: ${JSON.stringify(tenants)}`,
    );
  },
);

Then(
  'the response body should contain an empty "tenants" array',
  function (this: ByterouteWorld) {
    assert.ok(this.res, 'No response recorded');
    const { tenants } = this.res.body as { tenants?: unknown[] };
    assert.ok(Array.isArray(tenants), 'Expected body.tenants to be an array');
    assert.equal(
      tenants.length,
      0,
      `Expected body.tenants to be empty, got: ${JSON.stringify(tenants)}`,
    );
  },
);

Then(
  'the response body should contain a "tenant" with tenantId {string}',
  function (this: ByterouteWorld, tenantId: string) {
    assert.ok(this.res, 'No response recorded');
    const { tenant } = this.res.body as { tenant?: { tenantId?: string } };
    assert.ok(tenant, 'Expected body.tenant to be present');
    assert.equal(tenant.tenantId, tenantId);
  },
);

Then(
  'the response body should contain a "tenant" with name {string}',
  function (this: ByterouteWorld, name: string) {
    assert.ok(this.res, 'No response recorded');
    const { tenant } = this.res.body as { tenant?: { name?: string } };
    assert.ok(tenant, 'Expected body.tenant to be present');
    assert.equal(tenant.name, name);
  },
);
