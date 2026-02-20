/**
 * Steps shared across multiple feature files:
 *  - backend / session state (Given)
 *  - user sign-in setup (Given)
 *  - generic HTTP verbs (When)
 *  - generic response assertions (Then)
 */
import assert from 'node:assert/strict';
import { Given, When, Then, type DataTable } from '@cucumber/cucumber';
import request from 'supertest';
import { UserModel, TenantModel } from '@byteroute/shared';
import { signAuthToken } from '../../../src/auth/passport.js';
import { testApp } from '../support/app.js';
import type { ByterouteWorld } from '../support/world.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Resolves a Cucumber DataTable (key-value rows) or a JSON DocString to a plain object. */
export function resolveBody(bodyArg: DataTable | string): Record<string, unknown> {
  if (typeof bodyArg === 'string') {
    return JSON.parse(bodyArg) as Record<string, unknown>;
  }
  return bodyArg.rowsHash() as Record<string, unknown>;
}

/** Parses "Header-Name: value" into a [name, value] tuple. */
export function parseHeader(raw: string): [string, string] {
  const colon = raw.indexOf(':');
  return [raw.slice(0, colon).trim(), raw.slice(colon + 1).trim()];
}

function addAuth(req: request.Test, token: string | undefined): request.Test {
  return token ? req.set('Authorization', `Bearer ${token}`) : req;
}

// ---------------------------------------------------------------------------
// Given – app / session state
// ---------------------------------------------------------------------------

Given('the backend is running', function (this: ByterouteWorld) {
  // Declarative – the test app is built in features/support/app.ts
});

Given('I am not authenticated', function (this: ByterouteWorld) {
  this.authToken = undefined;
});

Given(
  'I am signed in as {string}',
  async function (this: ByterouteWorld, email: string) {
    const user = await UserModel.create({ email, name: 'Test User', tenantIds: [] });
    this.userId = String(user._id);
    await TenantModel.create({ tenantId: 'default', ownerId: user._id, name: 'Default' });
    this.authToken = signAuthToken({
      sub: this.userId,
      email,
      name: 'Test User',
      tenantIds: ['default'],
    });
  },
);

Given(
  'I am signed in as {string} with access to tenant {string}',
  async function (this: ByterouteWorld, email: string, tenantId: string) {
    const user = await UserModel.create({ email, name: 'Test User', tenantIds: [] });
    this.userId = String(user._id);
    await TenantModel.create({ tenantId, ownerId: user._id, name: tenantId });
    this.authToken = signAuthToken({
      sub: this.userId,
      email,
      name: 'Test User',
      tenantIds: [tenantId],
    });
  },
);

// ---------------------------------------------------------------------------
// When – GET
// ---------------------------------------------------------------------------

When('I request GET {string}', async function (this: ByterouteWorld, url: string) {
  this.res = await request(testApp).get(url);
});

When(
  'I send GET {string} with the auth token',
  async function (this: ByterouteWorld, url: string) {
    this.res = await addAuth(request(testApp).get(url), this.authToken);
  },
);

// ---------------------------------------------------------------------------
// When – POST (body only, DataTable or DocString)
// ---------------------------------------------------------------------------

When(
  'I send POST {string} with body:',
  async function (this: ByterouteWorld, url: string, bodyArg: DataTable | string) {
    this.res = await addAuth(
      request(testApp).post(url).send(resolveBody(bodyArg)),
      this.authToken,
    );
  },
);

// ---------------------------------------------------------------------------
// When – POST (authenticated, no body)
// ---------------------------------------------------------------------------

When(
  'I send POST {string} with the auth token',
  async function (this: ByterouteWorld, url: string) {
    this.res = await addAuth(request(testApp).post(url), this.authToken);
  },
);

// ---------------------------------------------------------------------------
// When – POST (authenticated, DataTable body)
// ---------------------------------------------------------------------------

When(
  'I send POST {string} with the auth token and body:',
  async function (this: ByterouteWorld, url: string, dataTable: DataTable) {
    this.res = await addAuth(
      request(testApp).post(url).send(dataTable.rowsHash()),
      this.authToken,
    );
  },
);

// ---------------------------------------------------------------------------
// When – POST (tenant header + DocString body) – shared by connections & metrics
// ---------------------------------------------------------------------------

When(
  'I send POST {string} with tenant {string} and body:',
  async function (this: ByterouteWorld, url: string, tenantId: string, docString: string) {
    this.res = await addAuth(
      request(testApp)
        .post(url)
        .set('X-Tenant-Id', tenantId)
        .send(JSON.parse(docString) as object),
      this.authToken,
    );
  },
);

// ---------------------------------------------------------------------------
// Then – status
// ---------------------------------------------------------------------------

Then(
  'the response status should be {int}',
  function (this: ByterouteWorld, expected: number) {
    assert.ok(this.res, 'No response recorded');
    assert.equal(this.res.status, expected);
  },
);

// ---------------------------------------------------------------------------
// Then – generic body field assertions
// ---------------------------------------------------------------------------

Then(
  'the response body should contain a {string}',
  function (this: ByterouteWorld, field: string) {
    assert.ok(this.res, 'No response recorded');
    assert.ok(this.res.body[field], `Expected body.${field} to be truthy`);
  },
);

Then(
  'the response body should contain an {string} field',
  function (this: ByterouteWorld, field: string) {
    assert.ok(this.res, 'No response recorded');
    assert.ok(
      Object.prototype.hasOwnProperty.call(this.res.body, field),
      `Expected body to have field "${field}", got: ${JSON.stringify(this.res.body)}`,
    );
  },
);

Then(
  'the response body should contain {string} as true',
  function (this: ByterouteWorld, field: string) {
    assert.ok(this.res, 'No response recorded');
    assert.equal(this.res.body[field], true);
  },
);

Then(
  'the response body should contain {string} as {int}',
  function (this: ByterouteWorld, field: string, expected: number) {
    assert.ok(this.res, 'No response recorded');
    assert.equal(this.res.body[field], expected);
  },
);

Then(
  'the response body should contain {string} as {string}',
  function (this: ByterouteWorld, field: string, expected: string) {
    assert.ok(this.res, 'No response recorded');
    assert.equal(this.res.body[field], expected);
  },
);
