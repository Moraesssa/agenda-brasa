import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { CalendarDays, Stethoscope } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { useAuth } from "@/hooks/useAuth";

const formatDateTime = (value: string) => {
  try {
    return format(new Date(value), "dd/MM/yyyy 'às' HH:mm");
  } catch (error) {
    console.error("Unable to format consultation date", error);
    return value;
  }
};

const buildProviderMap = (providers: Tables<"profiles">[] | null | undefined) => {
  const map = new Map<string, Tables<"profiles">>();
  providers?.forEach((profile) => {
    map.set(profile.user_id, profile);
  });
  return map;
};

export const ConsultationsCard = () => {
  const { user } = useAuth();

  const consultationsQuery = useQuery({
    queryKey: ["patient-consultations", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("patient_consultations")
        .select("*")
        .eq("patient_id", user!.id)
        .order("consultation_date", { ascending: false });

      if (error) {
        console.error("Error fetching consultations", error);
        throw error;
      }

      return (data ?? []) as Tables<"patient_consultations">[];
    },
  });

  const providerIds = useMemo(() => {
    const providers = consultationsQuery.data?.map((consultation) => consultation.provider_id).filter(Boolean);
    return Array.from(new Set(providers as string[] | undefined)).filter(Boolean);
  }, [consultationsQuery.data]);

  const providerProfilesQuery = useQuery({
    queryKey: ["consultation-provider-profiles", providerIds],
    enabled: providerIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .in("user_id", providerIds);

      if (error) {
        console.error("Error fetching provider profiles", error);
        throw error;
      }

      return (data ?? []) as Tables<"profiles">[];
    },
  });

  const providerMap = useMemo(
    () => buildProviderMap(providerProfilesQuery.data),
    [providerProfilesQuery.data]
  );

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-lg font-semibold">Consultas Recentes</CardTitle>
          <p className="text-sm text-muted-foreground">
            Acompanhe as últimas consultas e orientações recebidas.
          </p>
        </div>
        <div className="rounded-full bg-primary/10 p-2 text-primary">
          <Stethoscope className="h-5 w-5" aria-hidden />
        </div>
      </CardHeader>
      <CardContent>
        {consultationsQuery.isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando consultas…</p>
        ) : consultationsQuery.data && consultationsQuery.data.length > 0 ? (
          <ul className="space-y-4">
            {consultationsQuery.data.map((consultation) => {
              const providerProfile = consultation.provider_id
                ? providerMap.get(consultation.provider_id)
                : undefined;

              return (
                <li key={consultation.id} className="rounded-lg border p-4 transition hover:border-primary/40">
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h3 className="text-base font-semibold leading-tight text-foreground">
                        {consultation.title}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {consultation.summary ?? "Sem descrição adicional."}
                      </p>
                    </div>
                    <Badge variant="secondary" className="w-fit">
                      {formatDateTime(consultation.consultation_date)}
                    </Badge>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <CalendarDays className="h-4 w-4" aria-hidden />
                      {formatDateTime(consultation.consultation_date)}
                    </span>
                    {providerProfile ? (
                      <span>
                        Profissional: {providerProfile.first_name} {providerProfile.last_name}
                      </span>
                    ) : consultation.provider_id ? (
                      <span>Profissional: {consultation.provider_id.slice(0, 8)}…</span>
                    ) : (
                      <span>Profissional não informado</span>
                    )}
                    {consultation.follow_up_actions && (
                      <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-900">
                        Próximos passos: {consultation.follow_up_actions}
                      </span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            Nenhuma consulta registrada ainda. Quando você tiver consultas, elas aparecerão aqui automaticamente.
          </div>
        )}
      </CardContent>
    </Card>
  );
};
