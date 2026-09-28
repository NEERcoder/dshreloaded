import type { StudentProfileRecord } from "./dataAccess";

// Pure notification projection. Nothing here touches Supabase, so the mapping
// rules (row -> readable record, which actor profile belongs to which row,
// unread counting, wording) are testable without a database or a session.

export type NotificationType = "connection_request" | "connection_accepted";

export type NotificationRow = {
  id: string;
  userId: string;
  type: NotificationType;
  actorUserId: string | null;
  connectionId: string | null;
  readAt: string | null;
  createdAt: string;
};

export type NotificationRecord = {
  id: string;
  type: NotificationType;
  /** Null once the connection behind the event is gone (removed or rejected). */
  connectionId: string | null;
  read: boolean;
  createdAt: string;
  /** Null when the acting student has no CIRCLE profile row to show. */
  actor: StudentProfileRecord | null;
  message: string;
};

const MESSAGES: Record<NotificationType, string> = {
  connection_request: "sent you a connection request.",
  connection_accepted: "accepted your connection request.",
};

const SUPPORTED_TYPES = Object.keys(MESSAGES) as NotificationType[];

function text(value: unknown): string {
  return value === null || value === undefined ? "" : String(value);
}

export function mapNotificationRow(row: Record<string, unknown>): NotificationRow | null {
  const type = text(row.type) as NotificationType;
  // A type the UI has no copy for can't be rendered honestly — drop the row.
  if (!SUPPORTED_TYPES.includes(type)) return null;
  return {
    id: text(row.id),
    userId: text(row.user_id),
    type,
    actorUserId: row.actor_user_id === null || row.actor_user_id === undefined ? null : String(row.actor_user_id),
    connectionId: row.connection_id === null || row.connection_id === undefined ? null : String(row.connection_id),
    readAt: row.read_at === null || row.read_at === undefined ? null : String(row.read_at),
    createdAt: text(row.created_at),
  };
}

/** Newest first, so a refreshed inbox never reorders itself under the reader. */
export function sortNotifications<T extends { createdAt: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function assembleNotifications(
  rows: NotificationRow[],
  profiles: StudentProfileRecord[]
): NotificationRecord[] {
  const byUserId = new Map(profiles.map((profile) => [profile.userId, profile]));
  return sortNotifications(rows).map((row) => ({
    id: row.id,
    type: row.type,
    connectionId: row.connectionId,
    read: row.readAt !== null,
    createdAt: row.createdAt,
    actor: row.actorUserId ? byUserId.get(row.actorUserId) ?? null : null,
    message: MESSAGES[row.type],
  }));
}

export function unreadCountOf(records: Array<{ read: boolean }>): number {
  return records.filter((record) => !record.read).length;
}

export function actorLabel(record: NotificationRecord): string {
  return record.actor?.fullName ?? "A student";
}
