import { World, setWorldConstructor, type IWorldOptions } from '@cucumber/cucumber';
import type { Response } from 'supertest';

/**
 * Shared state carried between Given / When / Then steps within a single scenario.
 */
export class ByterouteWorld extends World {
  /** The last HTTP response received via supertest. */
  res: Response | undefined = undefined;

  /** Bearer token for authenticated requests.  Set by Given steps. */
  authToken: string | undefined = undefined;

  /** MongoDB _id of the currently authenticated user. */
  userId: string | undefined = undefined;

  constructor(options: IWorldOptions) {
    super(options);
  }
}

setWorldConstructor(ByterouteWorld);
