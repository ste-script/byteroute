/**
 * Step definitions for features/authentication.feature
 */
import assert from 'node:assert/strict';
import { Given, Then } from '@cucumber/cucumber';
import { UserModel } from '@byteroute/shared';
import { hashPassword } from '../../../src/services/password.js';
import type { ByterouteWorld } from '../support/world.js';

// ---------------------------------------------------------------------------
// Given – user fixtures
// ---------------------------------------------------------------------------

Given(
  'a user with email {string} already exists',
  async function (this: ByterouteWorld, email: string) {
    await UserModel.create({ email, name: 'Existing User', tenantIds: [] });
  },
);

Given(
  'a user with email {string} and password {string} exists',
  async function (this: ByterouteWorld, email: string, password: string) {
    const passwordHash = await hashPassword(password);
    await UserModel.create({ email, name: 'User', passwordHash, tenantIds: [] });
  },
);

// ---------------------------------------------------------------------------
// Then – auth-specific body assertions
// ---------------------------------------------------------------------------

Then(
  'the response body should contain a "user" with email {string}',
  function (this: ByterouteWorld, email: string) {
    assert.ok(this.res, 'No response recorded');
    const { user } = this.res.body as { user?: { email?: string } };
    assert.ok(user, 'Expected body.user to be present');
    assert.equal(user.email, email);
  },
);
