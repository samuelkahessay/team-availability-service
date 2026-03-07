import { AvailabilityEntry } from './types.js';

export interface AvailabilityRepository {
  create(entry: AvailabilityEntry): AvailabilityEntry;
  findById(id: string): AvailabilityEntry | undefined;
  findByUserId(userId: string): AvailabilityEntry[];
  findByTeamId(teamId: string): AvailabilityEntry[];
  update(id: string, entry: AvailabilityEntry): AvailabilityEntry | undefined;
  delete(id: string): boolean;
}

export class InMemoryAvailabilityRepository implements AvailabilityRepository {
  private store: Map<string, AvailabilityEntry> = new Map();

  create(entry: AvailabilityEntry): AvailabilityEntry {
    this.store.set(entry.id, entry);
    return entry;
  }

  findById(id: string): AvailabilityEntry | undefined {
    return this.store.get(id);
  }

  findByUserId(userId: string): AvailabilityEntry[] {
    return Array.from(this.store.values()).filter(e => e.userId === userId);
  }

  findByTeamId(teamId: string): AvailabilityEntry[] {
    return Array.from(this.store.values()).filter(e => e.teamId === teamId);
  }

  update(id: string, entry: AvailabilityEntry): AvailabilityEntry | undefined {
    if (!this.store.has(id)) return undefined;
    this.store.set(id, entry);
    return entry;
  }

  delete(id: string): boolean {
    return this.store.delete(id);
  }
}
