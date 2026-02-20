/**
 * Step definitions for features/connections.feature
 */
import { When } from '@cucumber/cucumber';
import request from 'supertest';
import { testApp } from '../support/app.js';
import { parseHeader } from './common.steps.js';
import type { ByterouteWorld } from '../support/world.js';

// ---------------------------------------------------------------------------
// When – POST with tenant header + an extra header + DocString body
// ---------------------------------------------------------------------------

When(
  'I send POST {string} with tenant {string}, header {string}, and body:',
  async function (
    this: ByterouteWorld,
    url: string,
    tenantId: string,
    rawHeader: string,
    docString: string,
  ) {
    const [name, value] = parseHeader(rawHeader);
    const req = request(testApp)
      .post(url)
      .set('X-Tenant-Id', tenantId)
      .set(name, value)
      .send(JSON.parse(docString) as object);

    this.res = await (this.authToken
      ? req.set('Authorization', `Bearer ${this.authToken}`)
      : req);
  },
);
