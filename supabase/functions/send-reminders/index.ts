import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import type { Database } from "../../../src/integrations/supabase/types.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing Supabase environment variables");
}

type Reminder = Database["public"]["Tables"]["reminder_schedules"]["Row"];
type ReminderNotificationInsert = Database["public"]["Tables"]["reminder_notifications"]["Insert"];

const minutesToMs = (minutes: number) => minutes * 60 * 1000;

const calculateNextTrigger = (reminder: Reminder, now: Date) => {
  const base = reminder.next_trigger_at ? new Date(reminder.next_trigger_at) : new Date(reminder.start_time);

  if (reminder.schedule_type === "once") {
    return { nextTrigger: null, active: false } as const;
  }

  if (reminder.schedule_type === "custom" && reminder.recurrence_interval_minutes) {
    let next = new Date(base);
    while (next <= now) {
      next = new Date(next.getTime() + minutesToMs(reminder.recurrence_interval_minutes));
    }
    return { nextTrigger: next, active: true } as const;
  }

  if (reminder.schedule_type === "daily") {
    const interval = reminder.recurrence_interval_minutes ?? 1440;
    let next = new Date(base);
    while (next <= now) {
      next = new Date(next.getTime() + minutesToMs(interval));
    }
    return { nextTrigger: next, active: true } as const;
  }

  const start = new Date(reminder.start_time);
  const targetHours = start.getUTCHours();
  const targetMinutes = start.getUTCMinutes();
  const targetSeconds = start.getUTCSeconds();

  const days = reminder.days_of_week && reminder.days_of_week.length > 0
    ? reminder.days_of_week
    : [start.getUTCDay()];

  const sortedDays = [...days].sort((a, b) => a - b);
  const anchor = new Date(now);
  anchor.setUTCHours(targetHours, targetMinutes, targetSeconds, 0);

  for (let offset = 0; offset <= 14; offset += 1) {
    const candidate = new Date(anchor);
    candidate.setUTCDate(anchor.getUTCDate() + offset);
    if (candidate > now && sortedDays.includes(candidate.getUTCDay())) {
      return { nextTrigger: candidate, active: true } as const;
    }
  }

  const fallback = new Date(anchor);
  fallback.setUTCDate(anchor.getUTCDate() + 7);
  return { nextTrigger: fallback, active: true } as const;
};

const createNotificationPayload = (reminder: Reminder, channel: "email" | "push", email: string | null) => {
  const baseMessage = `Está na hora de tomar ${reminder.medication_name}${reminder.dosage ? ` (${reminder.dosage})` : ""}.`;
  const details = reminder.instructions ? `${baseMessage} ${reminder.instructions}` : baseMessage;

  if (channel === "email") {
    return {
      to: email,
      subject: `Lembrete de medicação: ${reminder.medication_name}`,
      message: details,
    };
  }

  return {
    title: `Lembrete: ${reminder.medication_name}`,
    body: details,
  };
};

serve(async (request) => {
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  const body = await request.json().catch(() => ({}) as { reminderId?: string });
  const reminderId = typeof body?.reminderId === "string" ? body.reminderId : undefined;

  const now = new Date();
  let query = supabase
    .from("reminder_schedules")
    .select("*")
    .eq("active", true);

  if (reminderId) {
    query = query.eq("id", reminderId);
  } else {
    query = query.lte("next_trigger_at", now.toISOString()).not("next_trigger_at", "is", null);
  }

  const { data: reminders, error } = await query;

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  if (!reminders || reminders.length === 0) {
    return new Response(JSON.stringify({ processed: 0, results: [] }), { status: 200 });
  }

  const results: Array<{ reminderId: string; deliveries: number; nextTrigger: string | null }> = [];

  for (const reminder of reminders as Reminder[]) {
    const adminUser = await supabase.auth.admin.getUserById(reminder.patient_id);
    const email = adminUser.data.user?.email ?? null;

    const channels: Array<{ channel: "email" | "push"; payload: Record<string, unknown> | null }> = [];
    if (reminder.notify_email && email) {
      channels.push({ channel: "email", payload: createNotificationPayload(reminder, "email", email) });
    }
    if (reminder.notify_push) {
      channels.push({ channel: "push", payload: createNotificationPayload(reminder, "push", email) });
    }

    const sentAt = now.toISOString();
    let deliveries = 0;

    for (const channel of channels) {
      const notificationInsert: ReminderNotificationInsert = {
        reminder_id: reminder.id,
        patient_id: reminder.patient_id,
        channel: channel.channel,
        status: "sent",
        payload: channel.payload,
        sent_at: sentAt,
      };

      const { error: insertError } = await supabase.from("reminder_notifications").insert(notificationInsert);
      if (insertError) {
        console.error("Failed to log reminder notification", insertError);
      } else {
        deliveries += 1;
      }
    }

    const { nextTrigger, active } = calculateNextTrigger(reminder, now);
    const { error: updateError } = await supabase
      .from("reminder_schedules")
      .update({
        last_triggered_at: sentAt,
        next_trigger_at: nextTrigger ? nextTrigger.toISOString() : null,
        active,
      })
      .eq("id", reminder.id);

    if (updateError) {
      console.error("Failed to update reminder schedule", updateError);
    }

    results.push({
      reminderId: reminder.id,
      deliveries,
      nextTrigger: nextTrigger ? nextTrigger.toISOString() : null,
    });
  }

  return new Response(JSON.stringify({ processed: results.length, results }), {
    headers: { "Content-Type": "application/json" },
  });
});
