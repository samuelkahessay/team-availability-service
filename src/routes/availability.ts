import { Router, Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { AvailabilityRepository } from '../repository.js';
import { AvailabilityEntry, Status, TeamMemberStatus } from '../types.js';
import { validateCreateBody, validateUpdateBody, isValidIso8601 } from '../validators.js';

export function createAvailabilityRouter(repo: AvailabilityRepository): Router {
  const router = Router();

  // POST /users/:userId/availability
  router.post('/users/:userId/availability', (req: Request, res: Response) => {
    const { userId } = req.params;
    const body = req.body as Record<string, unknown>;

    const error = validateCreateBody(body);
    if (error) {
      res.status(400).json({ error: `Validation failed for field '${error.field}': ${error.message}` });
      return;
    }

    const entry: AvailabilityEntry = {
      id: randomUUID(),
      userId,
      teamId: body.teamId as string,
      status: body.status as Status,
      startTime: body.startTime as string,
      endTime: body.endTime as string,
      createdAt: new Date().toISOString(),
    };
    if (body.note !== undefined) {
      entry.note = body.note as string;
    }

    const created = repo.create(entry);
    res.status(201).json(created);
  });

  // PUT /users/:userId/availability/:id
  router.put('/users/:userId/availability/:id', (req: Request, res: Response) => {
    const { userId, id } = req.params;
    const body = req.body as Record<string, unknown>;

    const existing = repo.findById(id);
    if (!existing || existing.userId !== userId) {
      res.status(404).json({ error: `Availability entry '${id}' not found for user '${userId}'` });
      return;
    }

    const error = validateUpdateBody(body);
    if (error) {
      res.status(400).json({ error: `Validation failed for field '${error.field}': ${error.message}` });
      return;
    }

    // Compute the effective startTime and endTime for cross-field validation
    const newStartTime = (body.startTime as string | undefined) ?? existing.startTime;
    const newEndTime = (body.endTime as string | undefined) ?? existing.endTime;
    if (new Date(newEndTime) <= new Date(newStartTime)) {
      res.status(400).json({ error: "Validation failed for field 'endTime': endTime must be strictly after startTime" });
      return;
    }

    const updated: AvailabilityEntry = {
      id: existing.id,           // immutable
      userId: existing.userId,   // immutable
      createdAt: existing.createdAt, // immutable
      teamId: (body.teamId as string | undefined) ?? existing.teamId,
      status: (body.status as Status | undefined) ?? existing.status,
      startTime: newStartTime,
      endTime: newEndTime,
    };
    if (body.note !== undefined) {
      updated.note = body.note as string | undefined;
    } else if (existing.note !== undefined) {
      updated.note = existing.note;
    }

    const result = repo.update(id, updated);
    res.status(200).json(result);
  });

  // DELETE /users/:userId/availability/:id
  router.delete('/users/:userId/availability/:id', (req: Request, res: Response) => {
    const { userId, id } = req.params;

    const existing = repo.findById(id);
    if (!existing || existing.userId !== userId) {
      res.status(404).json({ error: `Availability entry '${id}' not found for user '${userId}'` });
      return;
    }

    repo.delete(id);
    res.status(204).send();
  });

  // GET /users/:userId/availability
  router.get('/users/:userId/availability', (req: Request, res: Response) => {
    const { userId } = req.params;
    const { startTime, endTime } = req.query as Record<string, string | undefined>;

    // Validate optional query params
    if (startTime !== undefined && !isValidIso8601(startTime)) {
      res.status(400).json({ error: "Validation failed for field 'startTime': startTime must be a valid ISO 8601 string" });
      return;
    }
    if (endTime !== undefined && !isValidIso8601(endTime)) {
      res.status(400).json({ error: "Validation failed for field 'endTime': endTime must be a valid ISO 8601 string" });
      return;
    }

    let entries = repo.findByUserId(userId);

    if (startTime !== undefined || endTime !== undefined) {
      const windowStart = startTime ? new Date(startTime) : null;
      const windowEnd = endTime ? new Date(endTime) : null;

      entries = entries.filter(e => {
        const entryStart = new Date(e.startTime);
        const entryEnd = new Date(e.endTime);
        // Include entries that partially or fully overlap the window
        const afterWindowEnd = windowEnd && entryStart > windowEnd;
        const beforeWindowStart = windowStart && entryEnd < windowStart;
        return !afterWindowEnd && !beforeWindowStart;
      });
    }

    res.status(200).json(entries);
  });

  // GET /team/:teamId/availability
  router.get('/team/:teamId/availability', (req: Request, res: Response) => {
    const { teamId } = req.params;
    const now = new Date();

    const entries = repo.findByTeamId(teamId);

    // Group entries by userId
    const byUser = new Map<string, AvailabilityEntry[]>();
    for (const entry of entries) {
      const list = byUser.get(entry.userId) ?? [];
      list.push(entry);
      byUser.set(entry.userId, list);
    }

    const result: TeamMemberStatus[] = Array.from(byUser.entries()).map(([userId, userEntries]) => {
      // Find entries covering now
      const covering = userEntries.filter(e => {
        const start = new Date(e.startTime);
        const end = new Date(e.endTime);
        return start <= now && end >= now;
      });

      if (covering.length === 0) {
        return { userId, currentStatus: null, currentEntry: null };
      }

      // Latest createdAt wins (lexicographic comparison is valid for UTC ISO 8601)
      const current = covering.reduce((best, e) => e.createdAt > best.createdAt ? e : best);
      return { userId, currentStatus: current.status, currentEntry: current };
    });

    res.status(200).json(result);
  });

  return router;
}
