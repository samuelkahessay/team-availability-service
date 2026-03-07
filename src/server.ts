import { createApp } from './app.js';
import { InMemoryAvailabilityRepository } from './repository.js';

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const repo = new InMemoryAvailabilityRepository();
const app = createApp(repo);

app.listen(PORT, () => {
  console.log(`Team Availability Service listening on port ${PORT}`);
});
