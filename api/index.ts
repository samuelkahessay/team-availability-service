import { createApp } from '../src/app.js';
import { InMemoryAvailabilityRepository } from '../src/repository.js';

const repo = new InMemoryAvailabilityRepository();
const app = createApp(repo);

export default app;
