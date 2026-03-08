import express, { Application, Request, Response, NextFunction } from 'express';
import { AvailabilityRepository } from './repository.js';
import { createAvailabilityRouter } from './routes/availability.js';

export function createApp(repo: AvailabilityRepository): Application {
  const app = express();

  app.use(express.json());

  // Handle malformed JSON
  app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    if (err instanceof SyntaxError && 'body' in err) {
      res.status(400).json({ error: 'Malformed JSON in request body' });
      return;
    }
    next(err);
  });

  app.get('/', (_req: Request, res: Response) => {
    res.json({
      service: 'Team Availability Service',
      endpoints: [
        'GET    /users/:userId/availability',
        'POST   /users/:userId/availability',
        'PUT    /users/:userId/availability/:id',
        'DELETE /users/:userId/availability/:id',
        'GET    /team/:teamId/availability',
      ],
    });
  });

  app.use('/', createAvailabilityRouter(repo));

  // Global error handler — must be after routes
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}
