/**
 * Step definitions for features/metrics.feature
 */
import { When } from '@cucumber/cucumber';
import request from 'supertest';
import { testApp } from '../support/app.js';
import { parseHeader } from './common.steps.js';
import type { ByterouteWorld } from '../support/world.js';

// ---------------------------------------------------------------------------
// When – POST with an arbitrary header + DocString body (no tenant header)
// ---------------------------------------------------------------------------

When(
  'I send POST {string} with header {string} and body:',
  async function (this: ByterouteWorld, url: string, rawHeader: string, docString: string) {
    const [name, value] = parseHeader(rawHeader);
    const req = request(testApp)
      .post(url)
      .set(name, value)
      .send(JSON.parse(docString) as object);

    this.res = await (this.authToken
      ? req.set('Authorization', `Bearer ${this.authToken}`)
      : req);
  },
);
