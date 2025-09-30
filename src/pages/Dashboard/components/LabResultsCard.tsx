import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { FlaskConical } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { useAuth } from "@/hooks/useAuth";

const formatDate = (value: string | null) => {
  if (!value) {
    return "Data não informada";
  }

  try {
    return format(new Date(value), "dd/MM/yyyy");
  } catch (error) {
    console.error("Unable to format lab result date", error);
    return value;
  }
};

export const LabResultsCard = () => {
  const { user } = useAuth();

  const labResultsQuery = useQuery({
    queryKey: ["patient-lab-results", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lab_results")
        .select("*")
        .eq("patient_id", user!.id)
        .order("collected_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching lab results", error);
        throw error;
      }

      return (data ?? []) as Tables<"lab_results">[];
    },
  });

  const providerIds = useMemo(() => {
    const providers = labResultsQuery.data?.map((result) => result.provider_id).filter(Boolean);
    return Array.from(new Set(providers as string[] | undefined)).filter(Boolean);
  }, [labResultsQuery.data]);

  const providerProfilesQuery = useQuery({
    queryKey: ["lab-result-providers", providerIds],
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

  const providerMap = useMemo(() => {
    const map = new Map<string, Tables<"profiles">>();
    providerProfilesQuery.data?.forEach((profile) => {
      map.set(profile.user_id, profile);
    });
    return map;
  }, [providerProfilesQuery.data]);

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-lg font-semibold">Resultados de Exames</CardTitle>
          <p className="text-sm text-muted-foreground">
            Consulte exames laboratoriais e documentos compartilhados com você.
          </p>
        </div>
        <div className="rounded-full bg-primary/10 p-2 text-primary">
          <FlaskConical className="h-5 w-5" aria-hidden />
        </div>
      </CardHeader>
      <CardContent>
        {labResultsQuery.isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando resultados…</p>
        ) : labResultsQuery.data && labResultsQuery.data.length > 0 ? (
          <ul className="space-y-4">
            {labResultsQuery.data.map((result) => {
              const providerProfile = result.provider_id ? providerMap.get(result.provider_id) : undefined;

              return (
                <li key={result.id} className="rounded-lg border p-4 transition hover:border-primary/40">
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h3 className="text-base font-semibold leading-tight text-foreground">
                        {result.title}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {result.description ?? "Nenhuma observação adicional."}
                      </p>
                    </div>
                    <Badge variant="outline" className="w-fit">
                      {formatDate(result.collected_at)}
                    </Badge>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                    {providerProfile ? (
                      <span>
                        Solicitado por {providerProfile.first_name} {providerProfile.last_name}
                      </span>
                    ) : result.provider_id ? (
                      <span>Solicitante: {result.provider_id.slice(0, 8)}…</span>
                    ) : (
                      <span>Solicitante não informado</span>
                    )}
                    {result.result_url && (
                      <Button asChild variant="secondary" size="sm">
                        <a href={result.result_url} target="_blank" rel="noreferrer">
                          Ver documento
                        </a>
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            Nenhum resultado disponível ainda. Assim que novos exames forem adicionados, você poderá acessá-los aqui.
          </div>
        )}
      </CardContent>
    </Card>
  );
};
