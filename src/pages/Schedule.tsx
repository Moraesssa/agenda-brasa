import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import {
  AppointmentWithRelations,
  AvailabilitySlotRow,
  ProviderWithProfile,
  useAvailabilitySlots,
  useBookAppointmentMutation,
  useMyAppointmentsQuery,
  useProvidersQuery,
} from "@/integrations/supabase/react-query/schedule";
import { useAuth } from "@/hooks/useAuth";
import {
  AlertCircle,
  Calendar as CalendarIcon,
  CheckCircle2,
  Clock,
  MapPin,
  ShieldCheck,
  Stethoscope,
  User,
} from "lucide-react";
import { format, isBefore, startOfDay } from "date-fns";

const Schedule = () => {
  const navigate = useNavigate();
  const { user, userRole, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSpecialty, setSelectedSpecialty] = useState<string | undefined>();
  const [selectedCity, setSelectedCity] = useState<string | undefined>();
  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<AvailabilitySlotRow | null>(null);
  const [bookingNotes, setBookingNotes] = useState("");
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isAuthDialogOpen, setIsAuthDialogOpen] = useState(false);
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);

  const providersQuery = useProvidersQuery();
  const slotsQuery = useAvailabilitySlots(selectedProviderId ?? undefined, {
    date: selectedDate,
  });
  const appointmentsQuery = useMyAppointmentsQuery(user?.id, Boolean(user));
  const bookAppointment = useBookAppointmentMutation();

  const availableSpecialties = useMemo(() => {
    if (!providersQuery.data) return [] as string[];
    const specialties = new Set<string>();
    providersQuery.data.forEach((provider) => {
      const specialty = provider.profile?.specialty;
      if (specialty) {
        specialties.add(specialty);
      }
    });
    return Array.from(specialties).sort();
  }, [providersQuery.data]);

  const availableCities = useMemo(() => {
    if (!providersQuery.data) return [] as string[];
    const cities = new Set<string>();
    providersQuery.data.forEach((provider) => {
      if (provider.city) {
        cities.add(provider.city);
      }
    });
    return Array.from(cities).sort();
  }, [providersQuery.data]);

  const filteredProviders = useMemo(() => {
    if (!providersQuery.data) return [] as ProviderWithProfile[];
    return providersQuery.data.filter((provider) => {
      const fullName = `${provider.profile?.first_name ?? ""} ${provider.profile?.last_name ?? ""}`
        .trim()
        .toLowerCase();
      const specialty = provider.profile?.specialty?.toLowerCase() ?? "";
      const city = provider.city?.toLowerCase() ?? "";
      const search = searchTerm.toLowerCase().trim();

      const matchesSearch =
        !search ||
        fullName.includes(search) ||
        specialty.includes(search) ||
        city.includes(search);
      const matchesSpecialty = !selectedSpecialty || provider.profile?.specialty === selectedSpecialty;
      const matchesCity = !selectedCity || provider.city === selectedCity;

      return matchesSearch && matchesSpecialty && matchesCity;
    });
  }, [providersQuery.data, searchTerm, selectedSpecialty, selectedCity]);

  useEffect(() => {
    if (filteredProviders.length === 0) {
      if (selectedProviderId !== null) {
        setSelectedProviderId(null);
      }
      return;
    }

    if (!selectedProviderId) {
      setSelectedProviderId(filteredProviders[0].id);
    }
  }, [filteredProviders, selectedProviderId]);

  const selectedProvider = useMemo(
    () => filteredProviders.find((provider) => provider.id === selectedProviderId) ?? null,
    [filteredProviders, selectedProviderId],
  );

  const upcomingAppointments = useMemo(() => {
    if (!appointmentsQuery.data) return [] as AppointmentWithRelations[];
    const now = new Date();
    return appointmentsQuery.data
      .filter((appointment) => appointment.slot?.start_time && !isBefore(new Date(appointment.slot.start_time), now))
      .sort((a, b) => {
        const aTime = new Date(a.slot?.start_time ?? 0).getTime();
        const bTime = new Date(b.slot?.start_time ?? 0).getTime();
        return aTime - bTime;
      })
      .slice(0, 3);
  }, [appointmentsQuery.data]);

  const handleSlotSelection = (slot: AvailabilitySlotRow) => {
    if (!user) {
      setIsAuthDialogOpen(true);
      return;
    }

    if (userRole && userRole !== "paciente") {
      setIsRoleDialogOpen(true);
      return;
    }

    setSelectedSlot(slot);
    setIsConfirmOpen(true);
  };

  const handleConfirmBooking = async () => {
    if (!selectedSlot) return;

    try {
      await bookAppointment.mutateAsync({
        slotId: selectedSlot.id,
        notes: bookingNotes,
      });

      toast({
        title: "Consulta agendada com sucesso!",
        description: "Você receberá a confirmação no seu e-mail cadastrado.",
      });

      setIsConfirmOpen(false);
      setBookingNotes("");
      setSelectedSlot(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Não foi possível concluir o agendamento.";
      toast({
        title: "Erro ao agendar",
        description: message,
        variant: "destructive",
      });
    }
  };

  const renderProviderCard = (provider: ProviderWithProfile) => {
    const fullName = `${provider.profile?.first_name ?? ""} ${provider.profile?.last_name ?? ""}`.trim() || "Profissional";
    return (
      <Card
        key={provider.id}
        className={cn("cursor-pointer transition-smooth", {
          "border-primary shadow-medical": provider.id === selectedProviderId,
        })}
        onClick={() => setSelectedProviderId(provider.id)}
      >
        <CardHeader className="space-y-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Stethoscope className="h-4 w-4 text-health" />
              {fullName}
            </CardTitle>
            {provider.profile?.specialty && <Badge variant="outline">{provider.profile.specialty}</Badge>}
          </div>
          <CardDescription className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="h-4 w-4" />
            {provider.city ? `${provider.city}${provider.state ? `, ${provider.state}` : ""}` : "Localização não informada"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground line-clamp-3">
            {provider.profile?.bio ?? "Esse profissional ainda não adicionou uma biografia."}
          </p>
          <Button variant={provider.id === selectedProviderId ? "medical" : "outline"} className="w-full">
            {provider.id === selectedProviderId ? "Selecionado" : "Selecionar"}
          </Button>
        </CardContent>
      </Card>
    );
  };

  const renderSlotButton = (slot: AvailabilitySlotRow) => {
    const start = format(new Date(slot.start_time), "HH:mm");
    const end = format(new Date(slot.end_time), "HH:mm");
    return (
      <Button
        key={slot.id}
        variant="outline"
        className="w-full justify-start"
        onClick={() => handleSlotSelection(slot)}
        disabled={slot.status !== "available" || bookAppointment.isPending}
      >
        <Clock className="mr-2 h-4 w-4 text-primary" />
        {start} - {end}
      </Button>
    );
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="container mx-auto px-4 py-10 space-y-10">
        <section className="space-y-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold">Agende sua consulta</h1>
              <p className="text-muted-foreground max-w-2xl">
                Encontre profissionais, escolha o melhor horário e confirme sua consulta em poucos cliques.
              </p>
            </div>
            {!user && !authLoading && (
              <Button size="lg" variant="medical" onClick={() => navigate("/auth")}>Criar conta gratuita</Button>
            )}
          </div>

          {appointmentsQuery.isLoading ? (
            <Card>
              <CardContent className="space-y-3 py-6">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
            </Card>
          ) : upcomingAppointments.length > 0 ? (
            <Card className="border-primary/40 bg-primary/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-primary">
                  <CheckCircle2 className="h-5 w-5" />
                  Próximas consultas
                </CardTitle>
                <CardDescription className="text-primary/80">
                  Acompanhe seus agendamentos confirmados em tempo real.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {upcomingAppointments.map((appointment) => {
                  const slotDate = appointment.slot ? new Date(appointment.slot.start_time) : null;
                  const providerName = `${appointment.provider?.profile?.first_name ?? ""} ${appointment.provider?.profile?.last_name ?? ""}`
                    .trim() || "Profissional";
                  return (
                    <div key={appointment.id} className="flex flex-col gap-2 rounded-lg border border-primary/30 bg-background/80 p-4">
                      <div className="flex flex-wrap items-center gap-3">
                        <Badge variant="outline" className="border-primary text-primary">
                          {appointment.status === "booked" ? "Confirmada" : appointment.status}
                        </Badge>
                        {slotDate && (
                          <span className="flex items-center gap-2 text-sm text-muted-foreground">
                            <CalendarIcon className="h-4 w-4" />
                            {format(slotDate, "dd/MM/yyyy 'às' HH:mm")}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                        <Stethoscope className="h-4 w-4" />
                        {providerName}
                        {appointment.provider?.city && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            {appointment.provider.city}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          ) : (
            <Alert>
              <ShieldCheck className="h-4 w-4" />
              <AlertTitle>Agende com tranquilidade</AlertTitle>
              <AlertDescription>
                Assim que você confirmar uma consulta, ela aparecerá aqui com atualizações em tempo real.
              </AlertDescription>
            </Alert>
          )}
        </section>

        <section className="grid gap-6 lg:grid-cols-[340px_1fr]">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Filtros</CardTitle>
                <CardDescription>Personalize a busca para encontrar o especialista ideal.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground" htmlFor="search">
                    Buscar por nome ou especialidade
                  </label>
                  <Input
                    id="search"
                    placeholder="Digite o nome do profissional"
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Especialidade</label>
                  <Select
                    value={selectedSpecialty ?? ""}
                    onValueChange={(value) => setSelectedSpecialty(value || undefined)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todas as especialidades" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Todas</SelectItem>
                      {availableSpecialties.map((specialty) => (
                        <SelectItem key={specialty} value={specialty}>
                          {specialty}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Cidade</label>
                  <Select
                    value={selectedCity ?? ""}
                    onValueChange={(value) => setSelectedCity(value || undefined)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todas as cidades" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Todas</SelectItem>
                      {availableCities.map((city) => (
                        <SelectItem key={city} value={city}>
                          {city}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Data</label>
                  <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {selectedDate ? format(selectedDate, "dd/MM/yyyy") : "Escolha uma data"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={(date) => {
                          setSelectedDate(date ?? undefined);
                          setIsCalendarOpen(false);
                        }}
                        disabled={(date) => isBefore(startOfDay(date), startOfDay(new Date()))}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Profissionais</CardTitle>
                <CardDescription>Selecione um profissional para visualizar os horários disponíveis.</CardDescription>
              </CardHeader>
              <CardContent>
                {providersQuery.isLoading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-20 w-full" />
                  </div>
                ) : providersQuery.error ? (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Não foi possível carregar os profissionais</AlertTitle>
                    <AlertDescription>
                      {providersQuery.error.message || "Tente atualizar a página em alguns instantes."}
                    </AlertDescription>
                  </Alert>
                ) : filteredProviders.length > 0 ? (
                  <ScrollArea className="h-[420px] pr-3">
                    <div className="space-y-4">
                      {filteredProviders.map((provider) => renderProviderCard(provider))}
                    </div>
                  </ScrollArea>
                ) : (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Nenhum profissional encontrado</AlertTitle>
                    <AlertDescription>
                      Ajuste os filtros de busca ou tente novamente mais tarde.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Horários disponíveis</CardTitle>
                <CardDescription>
                  Escolha um horário e confirme a consulta. As reservas são atualizadas em tempo real.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {slotsQuery.isLoading ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ) : slotsQuery.error ? (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Erro ao buscar horários</AlertTitle>
                    <AlertDescription>
                      {slotsQuery.error.message || "Tente novamente mais tarde."}
                    </AlertDescription>
                  </Alert>
                ) : selectedProvider ? (
                  slotsQuery.data && slotsQuery.data.length > 0 ? (
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {slotsQuery.data.map((slot) => renderSlotButton(slot))}
                    </div>
                  ) : (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Sem horários disponíveis</AlertTitle>
                      <AlertDescription>
                        Escolha outra data ou selecione um profissional diferente para ver novas opções.
                      </AlertDescription>
                    </Alert>
                  )
                ) : (
                  <Alert>
                    <User className="h-4 w-4" />
                    <AlertTitle>Selecione um profissional</AlertTitle>
                    <AlertDescription>
                      Use a lista ao lado para escolher um profissional e visualizar seus horários.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Dúvidas frequentes</CardTitle>
                <CardDescription>Informações importantes sobre o processo de agendamento.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="mt-1 h-4 w-4 text-primary" />
                  <p>As consultas são confirmadas imediatamente após o agendamento.</p>
                </div>
                <div className="flex items-start gap-3">
                  <Clock className="mt-1 h-4 w-4 text-primary" />
                  <p>Você pode cancelar até 24 horas antes do horário marcado.</p>
                </div>
                <div className="flex items-start gap-3">
                  <Stethoscope className="mt-1 h-4 w-4 text-primary" />
                  <p>Profissionais adicionam novos horários diariamente. Fique atento às atualizações.</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>
      <Footer />

      <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar agendamento</DialogTitle>
            <DialogDescription>
              Verifique as informações abaixo antes de finalizar a reserva do horário selecionado.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedProvider && (
              <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/40 p-3 text-sm">
                <Stethoscope className="h-5 w-5 text-health" />
                <div>
                  <p className="font-medium">{`${selectedProvider.profile?.first_name ?? ""} ${selectedProvider.profile?.last_name ?? ""}`.trim() || "Profissional"}</p>
                  {selectedProvider.profile?.specialty && (
                    <p className="text-muted-foreground">{selectedProvider.profile.specialty}</p>
                  )}
                </div>
              </div>
            )}
            {selectedSlot && (
              <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/40 p-3 text-sm">
                <CalendarIcon className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">{format(new Date(selectedSlot.start_time), "dd/MM/yyyy 'às' HH:mm")}</p>
                  <p className="text-muted-foreground">Término às {format(new Date(selectedSlot.end_time), "HH:mm")}</p>
                </div>
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground" htmlFor="notes">
                Observações para o profissional (opcional)
              </label>
              <Textarea
                id="notes"
                placeholder="Inclua informações relevantes ou sintomas que gostaria de destacar."
                value={bookingNotes}
                onChange={(event) => setBookingNotes(event.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => setIsConfirmOpen(false)} disabled={bookAppointment.isPending}>
              Voltar
            </Button>
            <Button onClick={handleConfirmBooking} disabled={!selectedSlot || bookAppointment.isPending}>
              {bookAppointment.isPending ? "Confirmando..." : "Confirmar consulta"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isAuthDialogOpen} onOpenChange={setIsAuthDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Faça login para continuar</DialogTitle>
            <DialogDescription>
              É necessário estar autenticado para reservar um horário. Entre na sua conta ou crie um cadastro rapidamente.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => setIsAuthDialogOpen(false)}>
              Fechar
            </Button>
            <Button onClick={() => navigate("/auth")}>Ir para autenticação</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isRoleDialogOpen} onOpenChange={setIsRoleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Perfil de usuário não autorizado</DialogTitle>
            <DialogDescription>
              Apenas pacientes podem agendar consultas. Acesse com uma conta de paciente ou entre em contato com o suporte.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => setIsRoleDialogOpen(false)}>
              Entendi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Schedule;
