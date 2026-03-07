export type Status = 'in-office' | 'remote' | 'ooo' | 'deep-focus';

export const VALID_STATUSES: Status[] = ['in-office', 'remote', 'ooo', 'deep-focus'];

export interface AvailabilityEntry {
  id: string;
  userId: string;
  teamId: string;
  status: Status;
  startTime: string; // UTC ISO 8601
  endTime: string;   // UTC ISO 8601
  note?: string;
  createdAt: string; // UTC ISO 8601, set at creation and never mutated
}

export interface TeamMemberStatus {
  userId: string;
  currentStatus: Status | null;
  currentEntry: AvailabilityEntry | null;
}
