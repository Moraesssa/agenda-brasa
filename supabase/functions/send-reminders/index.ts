import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.48.0";

type ChannelType = "email" | "push" | "sms" | "webhook";

type ChannelPayload = Record<string, unknown> | undefined;

type ReminderChannel = {
  type: ChannelType;
  target?: string;
  payload?: ChannelPayload;
  provider?: string;
  simulateFailure?: boolean;
};

type ReminderRecord = {
  id: string;
  title?: string | null;
  message?: string | null;
  body?: string | null;
  content?: string | null;
  metadata?: Record<string, unknown> | null;
  channels?: unknown;
  triggered_at?: string | null;
};

type ProviderResult = {
  success: boolean;
  error?: string;
  providerResponse?: unknown;
};

const SUPPORTED_CHANNELS: ChannelType[] = ["email", "push", "sms", "webhook"];

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase configuration");
  throw new Error("Environment variables SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set");
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  global: { fetch },
  auth: { persistSession: false },
});

const jsonHeaders = {
  "content-type": "application/json",
};

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = await req.json();
  } catch (_error) {
    return jsonResponse({ error: "Invalid JSON payload" }, 400);
  }

  const reminderId = (payload.reminderId ?? payload.reminder_id) as string | undefined;
  if (!reminderId) {
    return jsonResponse({ error: "Missing reminderId" }, 400);
  }

  const reminder = await fetchReminder(reminderId);
  if (!reminder) {
    return jsonResponse({ error: "Reminder not found" }, 404);
  }

  const channels = parseChannels(reminder.channels);
  if (!channels.length) {
    return jsonResponse({
      message: "No channels configured for reminder",
      reminderId,
    });
  }

  const now = new Date().toISOString();
  const results = [] as Array<ReminderChannel & ProviderResult>;

  for (const channel of channels) {
    const providerResult = await dispatchChannel(channel, reminder);
    results.push({ ...channel, ...providerResult });

    const logError = await logNotificationAttempt({
      reminderId,
      channel,
      result: providerResult,
      attemptedAt: now,
    });

    if (logError) {
      console.error("Failed to write reminder notification log", logError);
    }
  }

  if (results.length) {
    const updateError = await markReminderTriggered(reminderId, now);
    if (updateError) {
      console.error("Failed to update reminder triggered_at", updateError);
    }
  }

  return jsonResponse({
    reminderId,
    attempts: results.map(({ type, target, success, error }) => ({ type, target, success, error })),
  });
});

function parseChannels(raw: unknown): ReminderChannel[] {
  if (!raw) return [];

  if (Array.isArray(raw)) {
    return raw
      .map((entry) => normalizeChannel(entry))
      .filter((entry): entry is ReminderChannel => entry !== null);
  }

  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return parseChannels(parsed);
    } catch (_error) {
      return [];
    }
  }

  return [];
}

function normalizeChannel(raw: unknown): ReminderChannel | null {
  if (!raw) return null;

  if (typeof raw === "string") {
    if (!SUPPORTED_CHANNELS.includes(raw as ChannelType)) {
      return null;
    }
    return { type: raw as ChannelType };
  }

  if (typeof raw === "object") {
    const channel = raw as Record<string, unknown>;
    const type = channel.type as ChannelType | undefined;
    if (!type || !SUPPORTED_CHANNELS.includes(type)) {
      return null;
    }
    return {
      type,
      target: typeof channel.target === "string" ? channel.target : undefined,
      payload: (channel.payload as ChannelPayload) ?? undefined,
      provider: typeof channel.provider === "string" ? channel.provider : undefined,
      simulateFailure: Boolean(channel.simulateFailure ?? channel["simulate_failure"]),
    };
  }

  return null;
}

async function fetchReminder(reminderId: string): Promise<ReminderRecord | null> {
  const { data, error } = await supabase
    .from("reminders")
    .select("id, title, message, body, content, metadata, channels, triggered_at")
    .eq("id", reminderId)
    .maybeSingle();

  if (error) {
    console.error("Failed to fetch reminder", error);
    return null;
  }

  return data as ReminderRecord | null;
}

async function markReminderTriggered(reminderId: string, attemptedAt: string) {
  const { error } = await supabase
    .from("reminders")
    .update({ triggered_at: attemptedAt, last_attempted_at: attemptedAt })
    .eq("id", reminderId);
  return error ?? null;
}

async function logNotificationAttempt({
  reminderId,
  channel,
  result,
  attemptedAt,
}: {
  reminderId: string;
  channel: ReminderChannel;
  result: ProviderResult;
  attemptedAt: string;
}) {
  const { error } = await supabase.from("reminder_notifications").insert({
    reminder_id: reminderId,
    channel: channel.type,
    target: channel.target ?? null,
    status: result.success ? "sent" : "failed",
    error: result.error ?? null,
    provider: channel.provider ?? null,
    payload: channel.payload ?? null,
    provider_response: result.providerResponse ?? null,
    attempted_at: attemptedAt,
  });

  return error ?? null;
}

async function dispatchChannel(channel: ReminderChannel, reminder: ReminderRecord): Promise<ProviderResult> {
  try {
    switch (channel.type) {
      case "email":
        return await sendEmail(channel, reminder);
      case "push":
        return await sendPush(channel, reminder);
      case "sms":
        return await sendSms(channel, reminder);
      case "webhook":
        return await sendWebhook(channel, reminder);
      default:
        return { success: false, error: `Unsupported channel: ${channel.type}` };
    }
  } catch (error) {
    console.error(`Provider call failed for channel ${channel.type}`, error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

async function sendEmail(channel: ReminderChannel, reminder: ReminderRecord): Promise<ProviderResult> {
  if (channel.simulateFailure) {
    return { success: false, error: "Simulated email provider failure" };
  }

  const endpoint = Deno.env.get("REMINDER_EMAIL_WEBHOOK_URL");
  if (!endpoint) {
    return { success: false, error: "REMINDER_EMAIL_WEBHOOK_URL not configured" };
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify({
      target: channel.target,
      title: reminder.title ?? reminder.message ?? reminder.content ?? reminder.body ?? "",
      message: reminder.message ?? reminder.content ?? reminder.body ?? "",
      payload: channel.payload ?? reminder.metadata ?? {},
    }),
  });

  return await processProviderResponse(response);
}

async function sendPush(channel: ReminderChannel, reminder: ReminderRecord): Promise<ProviderResult> {
  if (channel.simulateFailure) {
    return { success: false, error: "Simulated push provider failure" };
  }

  const endpoint = Deno.env.get("REMINDER_PUSH_WEBHOOK_URL");
  if (!endpoint) {
    return { success: false, error: "REMINDER_PUSH_WEBHOOK_URL not configured" };
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify({
      token: channel.target,
      title: reminder.title ?? "",
      body: reminder.message ?? reminder.content ?? reminder.body ?? "",
      data: channel.payload ?? reminder.metadata ?? {},
    }),
  });

  return await processProviderResponse(response);
}

async function sendSms(channel: ReminderChannel, reminder: ReminderRecord): Promise<ProviderResult> {
  if (channel.simulateFailure) {
    return { success: false, error: "Simulated sms provider failure" };
  }

  const endpoint = Deno.env.get("REMINDER_SMS_WEBHOOK_URL");
  if (!endpoint) {
    return { success: false, error: "REMINDER_SMS_WEBHOOK_URL not configured" };
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify({
      phone: channel.target,
      message: reminder.message ?? reminder.content ?? reminder.body ?? "",
      payload: channel.payload ?? reminder.metadata ?? {},
    }),
  });

  return await processProviderResponse(response);
}

async function sendWebhook(channel: ReminderChannel, reminder: ReminderRecord): Promise<ProviderResult> {
  const endpoint = channel.target ?? Deno.env.get("REMINDER_WEBHOOK_URL");
  if (!endpoint) {
    return { success: false, error: "Webhook target not configured" };
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify({
      reminder,
      channel: {
        type: channel.type,
        provider: channel.provider ?? null,
      },
    }),
  });

  return await processProviderResponse(response);
}

async function processProviderResponse(response: Response): Promise<ProviderResult> {
  const providerResponse = await readProviderResponse(response);
  if (!response.ok) {
    return {
      success: false,
      error: `Provider responded with status ${response.status}`,
      providerResponse,
    };
  }

  return {
    success: true,
    providerResponse,
  };
}

async function readProviderResponse(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch (_error) {
    return text;
  }
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json",
    },
  });
}
