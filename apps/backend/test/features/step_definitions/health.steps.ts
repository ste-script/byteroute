/**
 * Step definitions for features/health.feature
 */
import assert from 'node:assert/strict';
import { Then } from '@cucumber/cucumber';
import type { ByterouteWorld } from '../support/world.js';

Then(
  'the response body should contain a "mongo" object with a "readyState" field',
  function (this: ByterouteWorld) {
    assert.ok(this.res, 'No response recorded');
    const { mongo } = this.res.body as { mongo?: { readyState?: unknown } };
    assert.ok(mongo, 'Expected body.mongo to be present');
    assert.ok(
      Object.prototype.hasOwnProperty.call(mongo, 'readyState'),
      'Expected body.mongo.readyState to be present',
    );
  },
);
