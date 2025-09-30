import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { NotebookPen, SmilePlus } from "lucide-react";

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/components/ui/use-toast";

const moodOptions = [
  { value: "feliz", label: "Feliz" },
  { value: "calmo", label: "Calmo" },
  { value: "ansioso", label: "Ansioso" },
  { value: "cansado", label: "Cansado" },
  { value: "outro", label: "Outro" },
];

const todayString = () => format(new Date(), "yyyy-MM-dd");

export const DiaryEntriesCard = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [formState, setFormState] = useState({
    entryDate: todayString(),
    title: "",
    mood: "",
    content: "",
  });

  const diaryQuery = useQuery({
    queryKey: ["patient-diary", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("patient_notes")
        .select("*")
        .eq("patient_id", user!.id)
        .order("entry_date", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching patient diary", error);
        throw error;
      }

      return (data ?? []) as Tables<"patient_notes">[];
    },
  });

  const createEntryMutation = useMutation({
    mutationFn: async (payload: TablesInsert<"patient_notes">) => {
      const { error } = await supabase.from("patient_notes").insert(payload);

      if (error) {
        console.error("Error creating diary entry", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patient-diary", user?.id] });
      toast({
        title: "Entrada salva com sucesso",
        description: "Seu diário foi atualizado.",
      });
      setFormState({ entryDate: todayString(), title: "", mood: "", content: "" });
    },
    onError: () => {
      toast({
        title: "Não foi possível salvar a entrada",
        description: "Tente novamente em instantes.",
      });
    },
  });

  const deleteEntryMutation = useMutation({
    mutationFn: async (noteId: string) => {
      const { error } = await supabase
        .from("patient_notes")
        .delete()
        .eq("id", noteId)
        .eq("patient_id", user!.id);

      if (error) {
        console.error("Error deleting diary entry", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patient-diary", user?.id] });
      toast({ title: "Entrada removida" });
    },
    onError: () => {
      toast({
        title: "Não foi possível remover",
        description: "Atualize a página e tente novamente.",
      });
    },
  });

  const onSubmit = () => {
    if (!formState.content.trim()) {
      toast({
        title: "Escreva algo para salvar",
        description: "Conte como você está se sentindo para registrar no diário.",
      });
      return;
    }

    const payload: TablesInsert<"patient_notes"> = {
      patient_id: user!.id,
      author_id: user!.id,
      content: formState.content.trim(),
      entry_date: formState.entryDate,
      title: formState.title.trim() || null,
      mood: formState.mood || null,
    };

    createEntryMutation.mutate(payload);
  };

  const recentEntries = useMemo(() => diaryQuery.data ?? [], [diaryQuery.data]);

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-lg font-semibold">Diário de Saúde</CardTitle>
          <p className="text-sm text-muted-foreground">
            Registre como você está se sentindo e acompanhe sua evolução ao longo do tempo.
          </p>
        </div>
        <div className="rounded-full bg-primary/10 p-2 text-primary">
          <NotebookPen className="h-5 w-5" aria-hidden />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4">
          <div className="grid gap-2 md:grid-cols-2">
            <label className="flex flex-col gap-2 text-sm font-medium text-foreground">
              Data
              <Input
                type="date"
                value={formState.entryDate}
                onChange={(event) => setFormState((prev) => ({ ...prev, entryDate: event.target.value }))}
                max={todayString()}
              />
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium text-foreground">
              Como você está se sentindo?
              <Select
                value={formState.mood || undefined}
                onValueChange={(value) => setFormState((prev) => ({ ...prev, mood: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione seu humor" />
                </SelectTrigger>
                <SelectContent>
                  {moodOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center gap-2">
                        <SmilePlus className="h-4 w-4" aria-hidden />
                        <span>{option.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
          </div>
          <label className="flex flex-col gap-2 text-sm font-medium text-foreground">
            Título (opcional)
            <Input
              value={formState.title}
              onChange={(event) => setFormState((prev) => ({ ...prev, title: event.target.value }))}
              placeholder="Resumo curto para lembrar da entrada"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium text-foreground">
            Diário
            <Textarea
              value={formState.content}
              onChange={(event) => setFormState((prev) => ({ ...prev, content: event.target.value }))}
              minLength={10}
              rows={5}
              placeholder="Conte o que aconteceu hoje, sintomas, medicações ou observações importantes."
            />
          </label>
        </div>
      </CardContent>
      <CardFooter className="flex justify-end">
        <Button onClick={onSubmit} disabled={createEntryMutation.isPending}>
          {createEntryMutation.isPending ? "Salvando…" : "Salvar entrada"}
        </Button>
      </CardFooter>
      <CardContent>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Entradas recentes
        </h3>
        {diaryQuery.isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando diário…</p>
        ) : recentEntries.length > 0 ? (
          <ul className="space-y-4">
            {recentEntries.map((entry) => (
              <li key={entry.id} className="rounded-lg border p-4">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h4 className="text-base font-semibold text-foreground">
                      {entry.title ?? `Registro de ${format(parseISO(entry.entry_date), "dd/MM")}`}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {format(parseISO(entry.entry_date), "dd 'de' MMMM, yyyy")}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {entry.mood && <Badge variant="outline">Humor: {entry.mood}</Badge>}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteEntryMutation.mutate(entry.id)}
                      disabled={deleteEntryMutation.isPending}
                    >
                      Remover
                    </Button>
                  </div>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap">
                  {entry.content}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            Comece registrando seu dia: anote sintomas, medicações utilizadas ou como está se sentindo.
          </div>
        )}
      </CardContent>
    </Card>
  );
};
