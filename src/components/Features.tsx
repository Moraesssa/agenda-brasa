import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Calendar, 
  FileText, 
  Bell, 
  Video, 
  Smartphone,
  Shield,
  Users,
  TrendingUp,
  Clock,
  MapPin 
} from "lucide-react";

const Features = () => {
  const patientFeatures = [
    {
      icon: Calendar,
      title: "Agendamento Inteligente",
      description: "Encontre e agende consultas com os melhores especialistas em poucos cliques."
    },
    {
      icon: FileText,
      title: "Prontuário Digital",
      description: "Seus dados médicos centralizados e acessíveis apenas para você."
    },
    {
      icon: Bell,
      title: "Lembretes Personalizados",
      description: "Nunca mais esqueça consultas ou horários de medicamentos."
    },
    {
      icon: Video,
      title: "Teleconsultas",
      description: "Consulte com seu médico de qualquer lugar com videochamadas seguras."
    }
  ];

  const professionalFeatures = [
    {
      icon: Users,
      title: "Gestão de Pacientes",
      description: "Acompanhe o histórico e evolução de todos os seus pacientes."
    },
    {
      icon: TrendingUp,
      title: "Controle Financeiro",
      description: "Gerencie pagamentos e faturamento de forma simples."
    },
    {
      icon: Clock,
      title: "Agenda Otimizada",
      description: "Organize seus horários e reduza cancelamentos."
    },
    {
      icon: Shield,
      title: "Comunicação Segura",
      description: "Chat criptografado para tirar dúvidas dos pacientes."
    }
  ];

  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center space-y-4 mb-16">
          <h2 className="text-3xl md:text-4xl font-bold">
            Uma plataforma, <span className="bg-gradient-primary bg-clip-text text-transparent">múltiplas soluções</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Desenvolvido pensando nas necessidades reais de pacientes e profissionais de saúde no Brasil.
          </p>
        </div>

        <div id="sobre" className="max-w-3xl mx-auto text-center mb-20 space-y-4">
          <h3 className="text-2xl font-bold">Sobre o AgendarBrasil</h3>
          <p className="text-muted-foreground">
            Conectamos pacientes, profissionais e clínicas em uma única plataforma intuitiva.
            Com tecnologia de ponta, oferecemos ferramentas para otimizar o cuidado em saúde e
            garantir experiências memoráveis em cada consulta.
          </p>
        </div>

        {/* Para Pacientes */}
        <div className="mb-20">
          <div className="text-center mb-12">
            <h3 className="text-2xl font-bold mb-4">Para Pacientes</h3>
            <p className="text-muted-foreground">Tenha controle total da sua saúde</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {patientFeatures.map((feature, index) => (
              <Card key={index} className="text-center hover:shadow-card transition-medical group">
                <CardHeader>
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-primary/20 transition-medical">
                    <feature.icon className="h-8 w-8 text-primary" />
                  </div>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>{feature.description}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Para Profissionais */}
        <div id="profissionais" className="mb-20">
          <div className="text-center mb-12">
            <h3 className="text-2xl font-bold mb-4">Para Profissionais de Saúde</h3>
            <p className="text-muted-foreground">Otimize seu consultório e melhore o atendimento</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {professionalFeatures.map((feature, index) => (
              <Card key={index} className="text-center hover:shadow-card transition-medical group">
                <CardHeader>
                  <div className="w-16 h-16 bg-health/10 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-health/20 transition-medical">
                    <feature.icon className="h-8 w-8 text-health" />
                  </div>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>{feature.description}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center bg-gradient-hero rounded-3xl p-12 text-white">
          <h3 className="text-3xl font-bold mb-4">Pronto para transformar sua experiência de saúde?</h3>
          <p className="text-xl mb-8 opacity-90">
            Junte-se a milhares de usuários que já escolheram o AgendarBrasil
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button variant="secondary" size="lg" className="text-lg px-8 py-6">
              <Smartphone className="h-5 w-5 mr-2" />
              Baixar App
            </Button>
            <Button variant="outline" size="lg" className="text-lg px-8 py-6 bg-white/10 border-white/20 text-white hover:bg-white/20">
              <MapPin className="h-5 w-5 mr-2" />
              Encontrar Médicos
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Features;