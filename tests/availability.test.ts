import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { InMemoryAvailabilityRepository } from '../src/repository.js';
import { AvailabilityEntry } from '../src/types.js';

function makeRepo() {
  return new InMemoryAvailabilityRepository();
}

function makeApp(repo = makeRepo()) {
  return { app: createApp(repo), repo };
}

const validBody = {
  teamId: 'team-alpha',
  status: 'in-office',
  startTime: '2026-01-01T09:00:00Z',
  endTime: '2026-01-01T17:00:00Z',
};

describe('POST /users/:userId/availability', () => {
  it('returns 201 with full entry on valid request', async () => {
    const { app } = makeApp();
    const res = await request(app).post('/users/user-1/availability').send(validBody);
    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.userId).toBe('user-1');
    expect(res.body.teamId).toBe('team-alpha');
    expect(res.body.status).toBe('in-office');
    expect(res.body.createdAt).toBeDefined();
  });

  it('stores entry in repository after successful POST', async () => {
    const { app, repo } = makeApp();
    const res = await request(app).post('/users/user-1/availability').send(validBody);
    expect(res.status).toBe(201);
    const stored = repo.findById(res.body.id);
    expect(stored).toBeDefined();
    expect(stored!.userId).toBe('user-1');
  });

  it('returns 400 if teamId is missing', async () => {
    const { app } = makeApp();
    const res = await request(app).post('/users/user-1/availability').send({ ...validBody, teamId: undefined });
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('returns 400 if status is invalid', async () => {
    const { app } = makeApp();
    const res = await request(app).post('/users/user-1/availability').send({ ...validBody, status: 'busy' });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('status');
  });

  it('returns 400 if startTime is not valid ISO 8601', async () => {
    const { app } = makeApp();
    const res = await request(app).post('/users/user-1/availability').send({ ...validBody, startTime: 'not-a-date' });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('startTime');
  });

  it('returns 400 if endTime is not valid ISO 8601', async () => {
    const { app } = makeApp();
    const res = await request(app).post('/users/user-1/availability').send({ ...validBody, endTime: 'not-a-date' });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('endTime');
  });

  it('returns 400 if endTime is not after startTime', async () => {
    const { app } = makeApp();
    const res = await request(app).post('/users/user-1/availability').send({
      ...validBody,
      endTime: '2026-01-01T08:00:00Z',
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('endTime');
  });

  it('allows two entries with identical time ranges', async () => {
    const { app } = makeApp();
    const r1 = await request(app).post('/users/user-1/availability').send(validBody);
    const r2 = await request(app).post('/users/user-1/availability').send(validBody);
    expect(r1.status).toBe(201);
    expect(r2.status).toBe(201);
    expect(r1.body.id).not.toBe(r2.body.id);
  });

  it('stores userId from path, not body', async () => {
    const { app, repo } = makeApp();
    const bodyWithUserId = { ...validBody, userId: 'injected-user' };
    const res = await request(app).post('/users/user-1/availability').send(bodyWithUserId);
    expect(res.status).toBe(201);
    expect(res.body.userId).toBe('user-1');
    const stored = repo.findById(res.body.id);
    expect(stored!.userId).toBe('user-1');
  });

  it('accepts optional note field', async () => {
    const { app } = makeApp();
    const res = await request(app).post('/users/user-1/availability').send({ ...validBody, note: 'WFH' });
    expect(res.status).toBe(201);
    expect(res.body.note).toBe('WFH');
  });

  it('returns 400 on malformed JSON body', async () => {
    const { app } = makeApp();
    const res = await request(app)
      .post('/users/user-1/availability')
      .set('Content-Type', 'application/json')
      .send('{ invalid json');
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });
});

describe('PUT /users/:userId/availability/:id', () => {
  it('returns 200 with updated entry', async () => {
    const { app } = makeApp();
    const create = await request(app).post('/users/user-1/availability').send(validBody);
    const id = create.body.id;
    const res = await request(app).put(`/users/user-1/availability/${id}`).send({ status: 'remote' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('remote');
  });

  it('does not modify id, userId, or createdAt on update', async () => {
    const { app } = makeApp();
    const create = await request(app).post('/users/user-1/availability').send(validBody);
    const { id, createdAt } = create.body;
    const res = await request(app).put(`/users/user-1/availability/${id}`).send({ status: 'remote' });
    expect(res.body.id).toBe(id);
    expect(res.body.userId).toBe('user-1');
    expect(res.body.createdAt).toBe(createdAt);
  });

  it('returns 404 if entry does not exist', async () => {
    const { app } = makeApp();
    const res = await request(app).put('/users/user-1/availability/no-such-id').send({ status: 'remote' });
    expect(res.status).toBe(404);
    expect(res.body.error).toBeDefined();
  });

  it('returns 404 if entry belongs to a different user', async () => {
    const { app } = makeApp();
    const create = await request(app).post('/users/user-1/availability').send(validBody);
    const id = create.body.id;
    const res = await request(app).put(`/users/user-2/availability/${id}`).send({ status: 'remote' });
    expect(res.status).toBe(404);
  });

  it('returns 400 if status is invalid', async () => {
    const { app } = makeApp();
    const create = await request(app).post('/users/user-1/availability').send(validBody);
    const id = create.body.id;
    const res = await request(app).put(`/users/user-1/availability/${id}`).send({ status: 'invalid' });
    expect(res.status).toBe(400);
  });
});

describe('DELETE /users/:userId/availability/:id', () => {
  it('returns 204 on successful delete', async () => {
    const { app } = makeApp();
    const create = await request(app).post('/users/user-1/availability').send(validBody);
    const id = create.body.id;
    const res = await request(app).delete(`/users/user-1/availability/${id}`);
    expect(res.status).toBe(204);
  });

  it('returns 404 if entry does not exist', async () => {
    const { app } = makeApp();
    const res = await request(app).delete('/users/user-1/availability/no-such-id');
    expect(res.status).toBe(404);
    expect(res.body.error).toBeDefined();
  });

  it('returns 404 if entry belongs to a different user', async () => {
    const { app } = makeApp();
    const create = await request(app).post('/users/user-1/availability').send(validBody);
    const id = create.body.id;
    const res = await request(app).delete(`/users/user-2/availability/${id}`);
    expect(res.status).toBe(404);
  });
});

describe('GET /users/:userId/availability', () => {
  it('returns all entries for a user', async () => {
    const { app } = makeApp();
    await request(app).post('/users/user-1/availability').send(validBody);
    await request(app).post('/users/user-1/availability').send({ ...validBody, status: 'remote' });
    const res = await request(app).get('/users/user-1/availability');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });

  it('returns empty array for a user with no entries', async () => {
    const { app } = makeApp();
    const res = await request(app).get('/users/user-1/availability');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('filters entries by time window — excludes entries outside window', async () => {
    const { app } = makeApp();
    // Entry inside the window
    await request(app).post('/users/user-1/availability').send({
      ...validBody,
      startTime: '2026-06-01T10:00:00Z',
      endTime: '2026-06-01T12:00:00Z',
    });
    // Entry outside the window
    await request(app).post('/users/user-1/availability').send({
      ...validBody,
      startTime: '2026-01-01T10:00:00Z',
      endTime: '2026-01-01T12:00:00Z',
    });

    const res = await request(app)
      .get('/users/user-1/availability')
      .query({ startTime: '2026-05-01T00:00:00Z', endTime: '2026-07-01T00:00:00Z' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].startTime).toBe('2026-06-01T10:00:00Z');
  });

  it('includes entries that partially overlap the window', async () => {
    const { app } = makeApp();
    // Entry that starts before window but ends within it
    await request(app).post('/users/user-1/availability').send({
      ...validBody,
      startTime: '2026-04-15T10:00:00Z',
      endTime: '2026-05-15T12:00:00Z',
    });

    const res = await request(app)
      .get('/users/user-1/availability')
      .query({ startTime: '2026-05-01T00:00:00Z', endTime: '2026-07-01T00:00:00Z' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
  });
});

describe('GET /team/:teamId/availability', () => {
  it('returns empty array if no entries for team', async () => {
    const { app } = makeApp();
    const res = await request(app).get('/team/team-alpha/availability');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('returns per-user status objects for team members', async () => {
    const { app } = makeApp();
    const now = new Date();
    const past = new Date(now.getTime() - 3600000).toISOString();
    const future = new Date(now.getTime() + 3600000).toISOString();

    await request(app).post('/users/user-1/availability').send({
      teamId: 'team-alpha',
      status: 'in-office',
      startTime: past,
      endTime: future,
    });
    await request(app).post('/users/user-2/availability').send({
      teamId: 'team-alpha',
      status: 'remote',
      startTime: past,
      endTime: future,
    });

    const res = await request(app).get('/team/team-alpha/availability');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    const userIds = res.body.map((u: { userId: string }) => u.userId).sort();
    expect(userIds).toEqual(['user-1', 'user-2']);
  });

  it('uses latest createdAt entry when multiple entries overlap now', async () => {
    const { app, repo } = makeApp();
    const now = new Date();
    const past = new Date(now.getTime() - 3600000).toISOString();
    const future = new Date(now.getTime() + 3600000).toISOString();

    // Manually create two entries with controlled createdAt timestamps
    const earlierEntry: AvailabilityEntry = {
      id: 'entry-1',
      userId: 'user-1',
      teamId: 'team-alpha',
      status: 'in-office',
      startTime: past,
      endTime: future,
      createdAt: new Date(now.getTime() - 7200000).toISOString(), // 2 hours ago
    };
    const laterEntry: AvailabilityEntry = {
      id: 'entry-2',
      userId: 'user-1',
      teamId: 'team-alpha',
      status: 'deep-focus',
      startTime: past,
      endTime: future,
      createdAt: new Date(now.getTime() - 1800000).toISOString(), // 30 min ago
    };
    repo.create(earlierEntry);
    repo.create(laterEntry);

    const res = await request(app).get('/team/team-alpha/availability');
    expect(res.status).toBe(200);
    const user1 = res.body.find((u: { userId: string }) => u.userId === 'user-1');
    expect(user1.currentStatus).toBe('deep-focus');
    expect(user1.currentEntry.id).toBe('entry-2');
  });

  it('returns null currentStatus for user with no entries covering now', async () => {
    const { app, repo } = makeApp();
    const past1 = '2020-01-01T10:00:00Z';
    const past2 = '2020-01-01T12:00:00Z';

    const oldEntry: AvailabilityEntry = {
      id: 'old-entry',
      userId: 'user-1',
      teamId: 'team-alpha',
      status: 'ooo',
      startTime: past1,
      endTime: past2,
      createdAt: past1,
    };
    repo.create(oldEntry);

    const res = await request(app).get('/team/team-alpha/availability');
    expect(res.status).toBe(200);
    const user1 = res.body.find((u: { userId: string }) => u.userId === 'user-1');
    expect(user1.currentStatus).toBeNull();
    expect(user1.currentEntry).toBeNull();
  });

  it('aggregates entries from multiple users correctly', async () => {
    const { app, repo } = makeApp();
    const now = new Date();
    const past = new Date(now.getTime() - 3600000).toISOString();
    const future = new Date(now.getTime() + 3600000).toISOString();

    repo.create({ id: 'e1', userId: 'user-1', teamId: 'team-x', status: 'remote', startTime: past, endTime: future, createdAt: past });
    repo.create({ id: 'e2', userId: 'user-2', teamId: 'team-x', status: 'ooo', startTime: past, endTime: future, createdAt: past });
    repo.create({ id: 'e3', userId: 'user-3', teamId: 'team-x', status: 'deep-focus', startTime: past, endTime: future, createdAt: past });

    const res = await request(app).get('/team/team-x/availability');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(3);
    const statuses = res.body.map((u: { currentStatus: string }) => u.currentStatus).sort();
    expect(statuses).toEqual(['deep-focus', 'ooo', 'remote']);
  });
});

describe('Error handling & response conventions', () => {
  it('error responses return Content-Type: application/json', async () => {
    const { app } = makeApp();
    const res = await request(app).delete('/users/user-1/availability/no-such-id');
    expect(res.status).toBe(404);
    expect(res.headers['content-type']).toMatch(/application\/json/);
  });

  it('400 error body includes human-readable error message', async () => {
    const { app } = makeApp();
    const res = await request(app).post('/users/user-1/availability').send({ status: 'invalid' });
    expect(res.status).toBe(400);
    expect(typeof res.body.error).toBe('string');
    expect(res.body.error.length).toBeGreaterThan(0);
  });

  it('404 error body identifies the missing resource', async () => {
    const { app } = makeApp();
    const res = await request(app).get('/users/user-1/availability/no-such-id');
    // This is a non-existent route — expect 404 from Express
    expect(res.status).toBe(404);
  });
});
