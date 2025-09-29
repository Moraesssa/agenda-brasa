import { Button } from "@/components/ui/button";
import { Calendar, Shield, Smartphone, Users } from "lucide-react";
import heroImage from "@/assets/hero-medical.jpg";

const Hero = () => {
  return (
    <section className="relative min-h-screen flex items-center bg-gradient-subtle">
      <div className="container mx-auto px-4 py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8">
            <div className="space-y-4">
              <h1 className="text-4xl md:text-6xl font-bold leading-tight">
                Sua <span className="bg-gradient-primary bg-clip-text text-transparent">saúde</span> na palma da mão
              </h1>
              <p className="text-xl text-muted-foreground leading-relaxed">
                A plataforma completa que conecta você aos melhores profissionais de saúde. 
                Agende consultas, gerencie tratamentos e tenha controle total da sua saúde.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <Button variant="medical" size="lg" className="text-lg px-8 py-6">
                <Calendar className="h-5 w-5 mr-2" />
                Agendar Consulta
              </Button>
              <Button variant="outline" size="lg" className="text-lg px-8 py-6">
                Sou Profissional
              </Button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-8">
              <div className="text-center space-y-2">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                  <Calendar className="h-6 w-6 text-primary" />
                </div>
                <p className="text-sm font-medium">Agendamento Fácil</p>
              </div>
              <div className="text-center space-y-2">
                <div className="w-12 h-12 bg-health/10 rounded-full flex items-center justify-center mx-auto">
                  <Shield className="h-6 w-6 text-health" />
                </div>
                <p className="text-sm font-medium">100% Seguro</p>
              </div>
              <div className="text-center space-y-2">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                  <Smartphone className="h-6 w-6 text-primary" />
                </div>
                <p className="text-sm font-medium">App Móvel</p>
              </div>
              <div className="text-center space-y-2">
                <div className="w-12 h-12 bg-health/10 rounded-full flex items-center justify-center mx-auto">
                  <Users className="h-6 w-6 text-health" />
                </div>
                <p className="text-sm font-medium">+5000 Médicos</p>
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="relative z-10">
              <img 
                src={heroImage} 
                alt="AgendarBrasil - Plataforma de Saúde Digital" 
                className="w-full h-auto rounded-2xl shadow-medical"
              />
            </div>
            <div className="absolute inset-0 bg-gradient-primary opacity-20 rounded-2xl blur-3xl"></div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;