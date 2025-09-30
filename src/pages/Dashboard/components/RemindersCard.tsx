import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { BellRing, CalendarClock, Pill } from "lucide-react";

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import type {
  Database,
  Tables,
  TablesInsert,
  TablesUpdate,
} from "@/integrations/supabase/types";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/components/ui/use-toast";

const dayOptions = [
  { value: "0", label: "Dom" },
  { value: "1", label: "Seg" },
  { value: "2", label: "Ter" },
  { value: "3", label: "Qua" },
  { value: "4", label: "Qui" },
  { value: "5", label: "Sex" },
  { value: "6", label: "Sáb" },
];

const scheduleTypeLabels: Record<Database["public"]["Enums"]["reminder_schedule_type"], string> = {
  once: "Único",
  daily: "Diário",
  weekly: "Semanal",
  custom: "Personalizado",
};

const defaultStartDateTime = () => format(new Date(), "yyyy-MM-dd'T'HH:mm");
const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

type ReminderSchedule = Tables<"reminder_schedules">;
type ReminderNotification = Tables<"reminder_notifications">;

type ReminderFormState = {
  medicationName: string;
  dosage: string;
  instructions: string;
  scheduleType: Database["public"]["Enums"]["reminder_schedule_type"];
  startTime: string;
  recurrenceIntervalMinutes: string;
  daysOfWeek: string[];
  notifyEmail: boolean;
  notifyPush: boolean;
  timezone: string;
};

export const RemindersCard = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [formState, setFormState] = useState<ReminderFormState>({
    medicationName: "",
    dosage: "",
    instructions: "",
    scheduleType: "daily",
    startTime: defaultStartDateTime(),
    recurrenceIntervalMinutes: "1440",
    daysOfWeek: [],
    notifyEmail: true,
    notifyPush: false,
    timezone: browserTimezone,
  });

  const remindersQuery = useQuery({
    queryKey: ["patient-reminders", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reminder_schedules")
        .select("*")
        .eq("patient_id", user!.id)
        .order("next_trigger_at", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching reminders", error);
        throw error;
      }

      return (data ?? []) as ReminderSchedule[];
    },
  });

  const notificationsQuery = useQuery({
    queryKey: ["reminder-notifications", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reminder_notifications")
        .select("*")
        .eq("patient_id", user!.id)
        .order("sent_at", { ascending: false, nullsFirst: false })
        .limit(10);

      if (error) {
        console.error("Error fetching reminder notifications", error);
        throw error;
      }

      return (data ?? []) as ReminderNotification[];
    },
  });

  const createReminderMutation = useMutation({
    mutationFn: async (payload: TablesInsert<"reminder_schedules">) => {
      const { error } = await supabase.from("reminder_schedules").insert(payload);

      if (error) {
        console.error("Error creating reminder", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patient-reminders", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["reminder-notifications", user?.id] });
      toast({
        title: "Lembrete salvo",
        description: "Você receberá notificações conforme a programação.",
      });
      setFormState((prev) => ({
        ...prev,
        medicationName: "",
        dosage: "",
        instructions: "",
        startTime: defaultStartDateTime(),
        recurrenceIntervalMinutes: "1440",
        daysOfWeek: [],
        notifyEmail: true,
        notifyPush: false,
      }));
    },
    onError: () => {
      toast({
        title: "Não foi possível criar o lembrete",
        description: "Revise as informações e tente novamente.",
      });
    },
  });

  const updateReminderMutation = useMutation({
    mutationFn: async ({ id, values }: { id: string; values: TablesUpdate<"reminder_schedules"> }) => {
      const { error } = await supabase
        .from("reminder_schedules")
        .update(values)
        .eq("id", id)
        .eq("patient_id", user!.id);

      if (error) {
        console.error("Error updating reminder", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patient-reminders", user?.id] });
    },
    onError: () => {
      toast({ title: "Não foi possível atualizar o lembrete" });
    },
  });

  const deleteReminderMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("reminder_schedules")
        .delete()
        .eq("id", id)
        .eq("patient_id", user!.id);

      if (error) {
        console.error("Error deleting reminder", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patient-reminders", user?.id] });
      toast({ title: "Lembrete removido" });
    },
    onError: () => {
      toast({ title: "Não foi possível remover o lembrete" });
    },
  });

  const triggerReminderMutation = useMutation({
    mutationFn: async (reminderId: string) => {
      const { error } = await supabase.functions.invoke("send-reminders", {
        body: { reminderId },
      });

      if (error) {
        console.error("Error triggering reminder", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patient-reminders", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["reminder-notifications", user?.id] });
      toast({ title: "Notificação enviada", description: "Verifique seu e-mail ou app de notificações." });
    },
    onError: () => {
      toast({ title: "Não foi possível enviar a notificação" });
    },
  });

  const onSubmit = () => {
    if (!formState.medicationName.trim()) {
      toast({
        title: "Informe o medicamento",
        description: "Adicione um nome para identificar o lembrete.",
      });
      return;
    }

    if (!formState.startTime) {
      toast({
        title: "Defina um horário inicial",
        description: "Escolha quando o lembrete deve começar.",
      });
      return;
    }

    if (formState.scheduleType === "weekly" && formState.daysOfWeek.length === 0) {
      toast({
        title: "Selecione os dias",
        description: "Escolha pelo menos um dia da semana para o lembrete semanal.",
      });
      return;
    }

    if (formState.scheduleType === "custom" && (!formState.recurrenceIntervalMinutes || Number(formState.recurrenceIntervalMinutes) <= 0)) {
      toast({
        title: "Informe a frequência",
        description: "Para lembretes personalizados, defina o intervalo em minutos.",
      });
      return;
    }

    const startTimeIso = new Date(formState.startTime).toISOString();
    const recurrenceMinutes = formState.recurrenceIntervalMinutes
      ? Number(formState.recurrenceIntervalMinutes)
      : null;

    const payload: TablesInsert<"reminder_schedules"> = {
      patient_id: user!.id,
      medication_name: formState.medicationName.trim(),
      dosage: formState.dosage.trim() || null,
      instructions: formState.instructions.trim() || null,
      schedule_type: formState.scheduleType,
      start_time: startTimeIso,
      timezone: formState.timezone,
      recurrence_interval_minutes:
        formState.scheduleType === "custom" ? recurrenceMinutes : formState.scheduleType === "daily" ? 1440 : null,
      days_of_week: formState.scheduleType === "weekly" ? formState.daysOfWeek.map((day) => Number(day)) : [],
      notify_email: formState.notifyEmail,
      notify_push: formState.notifyPush,
      next_trigger_at: startTimeIso,
    };

    createReminderMutation.mutate(payload);
  };

  const reminders = useMemo(() => remindersQuery.data ?? [], [remindersQuery.data]);
  const notifications = useMemo(() => notificationsQuery.data ?? [], [notificationsQuery.data]);

  const formatDateTime = (value: string | null) => {
    if (!value) return "Não programado";
    try {
      return format(new Date(value), "dd/MM/yyyy 'às' HH:mm");
    } catch (error) {
      console.error("Unable to format reminder date", error);
      return value;
    }
  };

  const describeReminder = (reminder: ReminderSchedule) => {
    if (reminder.schedule_type === "once") {
      return "Uma única vez";
    }
    if (reminder.schedule_type === "daily") {
      return "Todos os dias";
    }
    if (reminder.schedule_type === "weekly") {
      if (!reminder.days_of_week || reminder.days_of_week.length === 0) {
        return "Semanal";
      }
      return `Semanal (${reminder.days_of_week.map((day) => dayOptions.find((option) => Number(option.value) === day)?.label ?? day).join(", ")})`;
    }
    if (reminder.schedule_type === "custom" && reminder.recurrence_interval_minutes) {
      const hours = reminder.recurrence_interval_minutes / 60;
      if (Number.isInteger(hours)) {
        return `A cada ${hours} hora(s)`;
      }
      return `A cada ${reminder.recurrence_interval_minutes} minutos`;
    }
    return scheduleTypeLabels[reminder.schedule_type];
  };

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-lg font-semibold">Lembretes de Medicação</CardTitle>
          <p className="text-sm text-muted-foreground">
            Configure lembretes por e-mail ou push para não esquecer seus medicamentos.
          </p>
        </div>
        <div className="rounded-full bg-primary/10 p-2 text-primary">
          <Pill className="h-5 w-5" aria-hidden />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-2 text-sm font-medium text-foreground">
            Medicamento
            <Input
              value={formState.medicationName}
              onChange={(event) => setFormState((prev) => ({ ...prev, medicationName: event.target.value }))}
              placeholder="Ex: Losartana 50mg"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium text-foreground">
            Dosagem (opcional)
            <Input
              value={formState.dosage}
              onChange={(event) => setFormState((prev) => ({ ...prev, dosage: event.target.value }))}
              placeholder="Quantidade e frequência"
            />
          </label>
        </div>
        <label className="flex flex-col gap-2 text-sm font-medium text-foreground">
          Instruções (opcional)
          <Textarea
            value={formState.instructions}
            onChange={(event) => setFormState((prev) => ({ ...prev, instructions: event.target.value }))}
            rows={3}
            placeholder="Observações importantes, como tomar com alimento ou em jejum."
          />
        </label>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-2 text-sm font-medium text-foreground">
            Tipo de agenda
            <Select
              value={formState.scheduleType}
              onValueChange={(value) =>
                setFormState((prev) => {
                  const scheduleType = value as ReminderFormState["scheduleType"];
                  return {
                    ...prev,
                    scheduleType,
                    daysOfWeek: scheduleType === "weekly" ? prev.daysOfWeek : [],
                    recurrenceIntervalMinutes:
                      scheduleType === "custom"
                        ? prev.recurrenceIntervalMinutes || "720"
                        : scheduleType === "daily"
                          ? "1440"
                          : prev.recurrenceIntervalMinutes,
                  };
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(scheduleTypeLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium text-foreground">
            Início
            <Input
              type="datetime-local"
              value={formState.startTime}
              onChange={(event) => setFormState((prev) => ({ ...prev, startTime: event.target.value }))}
            />
          </label>
        </div>
        {formState.scheduleType === "weekly" && (
          <div className="flex flex-col gap-2 text-sm font-medium text-foreground">
            Dias da semana
            <ToggleGroup
              type="multiple"
              value={formState.daysOfWeek}
              onValueChange={(value) => setFormState((prev) => ({ ...prev, daysOfWeek: value }))}
            >
              {dayOptions.map((option) => (
                <ToggleGroupItem key={option.value} value={option.value} className="w-10">
                  {option.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>
        )}
        {formState.scheduleType === "custom" && (
          <label className="flex flex-col gap-2 text-sm font-medium text-foreground">
            Intervalo em minutos
            <Input
              type="number"
              min={5}
              step={5}
              value={formState.recurrenceIntervalMinutes}
              onChange={(event) => setFormState((prev) => ({ ...prev, recurrenceIntervalMinutes: event.target.value }))}
            />
          </label>
        )}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <p className="text-sm font-medium">Notificar por e-mail</p>
              <p className="text-xs text-muted-foreground">
                Receba um e-mail no horário configurado.
              </p>
            </div>
            <Switch
              checked={formState.notifyEmail}
              onCheckedChange={(checked) => setFormState((prev) => ({ ...prev, notifyEmail: checked }))}
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <p className="text-sm font-medium">Notificar por push</p>
              <p className="text-xs text-muted-foreground">
                Use com o aplicativo móvel ou navegador habilitado.
              </p>
            </div>
            <Switch
              checked={formState.notifyPush}
              onCheckedChange={(checked) => setFormState((prev) => ({ ...prev, notifyPush: checked }))}
            />
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-end">
        <Button onClick={onSubmit} disabled={createReminderMutation.isPending}>
          {createReminderMutation.isPending ? "Salvando lembrete…" : "Salvar lembrete"}
        </Button>
      </CardFooter>
      <CardContent className="space-y-6">
        <section>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Lembretes ativos
          </h3>
          {remindersQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando lembretes…</p>
          ) : reminders.length > 0 ? (
            <ul className="space-y-4">
              {reminders.map((reminder) => (
                <li key={reminder.id} className="rounded-lg border p-4">
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                      <div>
                        <h4 className="text-base font-semibold text-foreground">
                          {reminder.medication_name}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {reminder.dosage ?? "Dosagem não informada"}
                        </p>
                      </div>
                      <Badge variant={reminder.active ? "default" : "outline"}>
                        {reminder.active ? "Ativo" : "Inativo"}
                      </Badge>
                    </div>
                    {reminder.instructions && (
                      <p className="text-sm text-muted-foreground">{reminder.instructions}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <CalendarClock className="h-4 w-4" aria-hidden />
                        Próximo disparo: {formatDateTime(reminder.next_trigger_at)}
                      </span>
                      <Badge variant="secondary">{describeReminder(reminder)}</Badge>
                    </div>
                    <div className="flex flex-col gap-3 border-t pt-3 text-sm md:flex-row md:items-center md:justify-between">
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2">
                          <Switch
                            checked={reminder.notify_email}
                            onCheckedChange={(checked) =>
                              updateReminderMutation.mutate({
                                id: reminder.id,
                                values: { notify_email: checked },
                              })
                            }
                          />
                          E-mail
                        </label>
                        <label className="flex items-center gap-2">
                          <Switch
                            checked={reminder.notify_push}
                            onCheckedChange={(checked) =>
                              updateReminderMutation.mutate({
                                id: reminder.id,
                                values: { notify_push: checked },
                              })
                            }
                          />
                          Push
                        </label>
                        <label className="flex items-center gap-2">
                          <Switch
                            checked={reminder.active}
                            onCheckedChange={(checked) =>
                              updateReminderMutation.mutate({
                                id: reminder.id,
                                values: {
                                  active: checked,
                                  next_trigger_at: checked ? reminder.next_trigger_at ?? reminder.start_time : reminder.next_trigger_at,
                                },
                              })
                            }
                          />
                          Ativo
                        </label>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => triggerReminderMutation.mutate(reminder.id)}
                          disabled={triggerReminderMutation.isPending}
                        >
                          Enviar agora
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteReminderMutation.mutate(reminder.id)}
                          disabled={deleteReminderMutation.isPending}
                        >
                          Remover
                        </Button>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              Sem lembretes cadastrados. Crie um lembrete para ser avisado na hora certa.
            </div>
          )}
        </section>
        <section>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Histórico de notificações
          </h3>
          {notificationsQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando histórico…</p>
          ) : notifications.length > 0 ? (
            <ul className="space-y-3 text-sm">
              {notifications.map((log) => (
                <li key={log.id} className="rounded-lg border p-3">
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-2">
                      <BellRing className="h-4 w-4 text-primary" aria-hidden />
                      <span className="font-medium capitalize">{log.channel}</span>
                    </div>
                    <span className="text-muted-foreground">{formatDateTime(log.sent_at)}</span>
                  </div>
                  {log.payload && (
                    <pre className="mt-2 whitespace-pre-wrap text-xs text-muted-foreground">
                      {JSON.stringify(log.payload, null, 2)}
                    </pre>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <div className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
              Nenhuma notificação enviada ainda. Assim que os lembretes forem disparados, o histórico aparecerá aqui.
            </div>
          )}
        </section>
      </CardContent>
    </Card>
  );
};
