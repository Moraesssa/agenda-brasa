import Header from "@/components/Header";
import { useAuth } from "@/hooks/useAuth";
import { ConsultationsCard } from "./components/ConsultationsCard";
import { LabResultsCard } from "./components/LabResultsCard";
import { DiaryEntriesCard } from "./components/DiaryEntriesCard";
import { RemindersCard } from "./components/RemindersCard";

const Dashboard = () => {
  const { profile, user } = useAuth();

  const firstName = profile?.first_name ?? user?.email ?? "Paciente";

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 pb-10 pt-8">
        <section className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            Olá, {firstName}!
          </h1>
          <p className="mt-2 max-w-2xl text-base text-muted-foreground">
            Aqui você acompanha consultas, exames, anotações pessoais e configura lembretes de medicação em um só lugar.
          </p>
        </section>
        <section className="grid gap-6 lg:grid-cols-2">
          <ConsultationsCard />
          <LabResultsCard />
          <DiaryEntriesCard />
          <RemindersCard />
        </section>
      </main>
    </div>
  );
};

export default Dashboard;
