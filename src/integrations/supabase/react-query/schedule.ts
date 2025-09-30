import { useEffect, useMemo } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
  UseQueryResult,
} from "@tanstack/react-query";
import { endOfDay, formatISO, startOfDay } from "date-fns";
import { supabase } from "../client";
import type { Tables } from "../types";

export type ProviderRow = Tables<"providers">;
export type ProviderProfileRow = Tables<"profiles">;
export type AvailabilitySlotRow = Tables<"availability_slots">;
export type AppointmentRow = Tables<"appointments">;

export interface ProviderWithProfile extends ProviderRow {
  profile: ProviderProfileRow | null;
}

export interface AppointmentWithRelations extends AppointmentRow {
  slot: AvailabilitySlotRow | null;
  provider: (ProviderRow & { profile: ProviderProfileRow | null }) | null;
}

export interface AvailabilitySlotFilters {
  date?: Date;
  includeUnavailable?: boolean;
}

export const providerKeys = {
  all: ["providers"] as const,
};

export const slotKeys = {
  all: ["availability_slots"] as const,
  list: (providerId?: string, dayKey?: string) =>
    ["availability_slots", providerId ?? "all", dayKey ?? "all"] as const,
};

export const appointmentKeys = {
  all: ["appointments"] as const,
  list: (scope?: string) => ["appointments", scope ?? "all"] as const,
};

export const useProvidersQuery = (): UseQueryResult<ProviderWithProfile[], Error> =>
  useQuery({
    queryKey: providerKeys.all,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("providers")
        .select("*, profile:profiles(*)")
        .eq("is_active", true)
        .order("created_at", { ascending: true });

      if (error) {
        throw error;
      }

      return (data ?? []).map((provider) => ({
        ...provider,
        profile: (provider as { profile?: ProviderProfileRow | null }).profile ?? null,
      })) as ProviderWithProfile[];
    },
    staleTime: 5 * 60 * 1000,
  });

export const useAvailabilitySlots = (
  providerId?: string,
  filters?: AvailabilitySlotFilters,
): UseQueryResult<AvailabilitySlotRow[], Error> => {
  const queryClient = useQueryClient();
  const dayKey = useMemo(() => {
    if (!filters?.date) return "all";
    return formatISO(startOfDay(filters.date), { representation: "date" });
  }, [filters?.date]);

  const query = useQuery({
    queryKey: slotKeys.list(providerId, dayKey),
    enabled: Boolean(providerId),
    queryFn: async () => {
      if (!providerId) {
        return [] as AvailabilitySlotRow[];
      }

      let queryBuilder = supabase
        .from("availability_slots")
        .select("*")
        .eq("provider_id", providerId)
        .order("start_time", { ascending: true });

      const nowIso = new Date().toISOString();
      queryBuilder = queryBuilder.gte("start_time", nowIso);

      if (filters?.date) {
        const start = startOfDay(filters.date).toISOString();
        const end = endOfDay(filters.date).toISOString();
        queryBuilder = queryBuilder.gte("start_time", start).lt("start_time", end);
      }

      if (!filters?.includeUnavailable) {
        queryBuilder = queryBuilder.eq("status", "available");
      }

      const { data, error } = await queryBuilder;
      if (error) {
        throw error;
      }

      return (data ?? []) as AvailabilitySlotRow[];
    },
  });

  useEffect(() => {
    if (!providerId) return;

    const channel = supabase
      .channel(`availability-slots-${providerId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "availability_slots",
          filter: `provider_id=eq.${providerId}`,
        },
        () => {
          queryClient.invalidateQueries({
            queryKey: slotKeys.list(providerId, dayKey),
            exact: true,
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [providerId, dayKey, queryClient]);

  return query;
};

export const useMyAppointmentsQuery = (
  userId?: string,
  enabled = true,
): UseQueryResult<AppointmentWithRelations[], Error> => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: appointmentKeys.list(userId ?? "anonymous"),
    enabled: Boolean(userId) && enabled,
    queryFn: async () => {
      if (!userId) {
        return [] as AppointmentWithRelations[];
      }

      const { data, error } = await supabase
        .from("appointments")
        .select("*, slot:availability_slots(*), provider:providers(*, profile:profiles(*))")
        .eq("patient_id", userId)
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      return (data ?? []).map((appointment) => ({
        ...appointment,
        slot: (appointment as { slot?: AvailabilitySlotRow | null }).slot ?? null,
        provider: (appointment as {
          provider?: (ProviderRow & { profile?: ProviderProfileRow | null }) | null;
        }).provider
          ? {
              ...(appointment as {
                provider: ProviderRow & { profile?: ProviderProfileRow | null } | null;
              }).provider!,
              profile: ((appointment as {
                provider?: ProviderRow & { profile?: ProviderProfileRow | null } | null;
              }).provider?.profile ?? null) as ProviderProfileRow | null,
            }
          : null,
      })) as AppointmentWithRelations[];
    },
  });

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`appointments-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "appointments",
          filter: `patient_id=eq.${userId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: appointmentKeys.list(userId), exact: true });
          queryClient.invalidateQueries({ queryKey: slotKeys.all, exact: false });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);

  return query;
};

export interface BookAppointmentVariables {
  slotId: string;
  notes?: string;
}

export const useBookAppointmentMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ slotId, notes }: BookAppointmentVariables) => {
      const { data, error } = await supabase.rpc("book_appointment", {
        slot_id: slotId,
        notes: notes ?? null,
      });

      if (error) {
        throw error;
      }

      return data as AppointmentRow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: slotKeys.all, exact: false });
      queryClient.invalidateQueries({ queryKey: appointmentKeys.all, exact: false });
    },
  });
};
