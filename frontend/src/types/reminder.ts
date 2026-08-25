export interface Reminder {
  id: string;
  title: string;
  event_date: string; // "YYYY-MM-DD"
  event_time: string; // "HH:MM:SS"
  location: string | null;
  notes: string | null;
  notified: boolean;
  created_at: string;
}
