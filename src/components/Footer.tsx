import { Heart, Mail, Phone, MapPin, Facebook, Instagram, Twitter } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-foreground text-background">
      <div className="container mx-auto px-4 py-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Heart className="h-8 w-8 text-health" />
              <span className="text-xl font-bold">AgendarBrasil</span>
            </div>
            <p className="text-background/80 leading-relaxed">
              A plataforma que conecta você aos melhores profissionais de saúde, 
              colocando o controle da sua saúde na palma da sua mão.
            </p>
            <div className="flex space-x-4">
              <Facebook className="h-5 w-5 text-background/60 hover:text-health cursor-pointer transition-smooth" />
              <Instagram className="h-5 w-5 text-background/60 hover:text-health cursor-pointer transition-smooth" />
              <Twitter className="h-5 w-5 text-background/60 hover:text-health cursor-pointer transition-smooth" />
            </div>
          </div>

          {/* Para Pacientes */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Para Pacientes</h3>
            <ul className="space-y-2 text-background/80">
              <li><a href="#" className="hover:text-health transition-smooth">Agendar Consulta</a></li>
              <li><a href="#" className="hover:text-health transition-smooth">Meu Prontuário</a></li>
              <li><a href="#" className="hover:text-health transition-smooth">Teleconsultas</a></li>
              <li><a href="#" className="hover:text-health transition-smooth">Lembretes</a></li>
              <li><a href="#" className="hover:text-health transition-smooth">Planos de Saúde</a></li>
            </ul>
          </div>

          {/* Para Profissionais */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Para Profissionais</h3>
            <ul className="space-y-2 text-background/80">
              <li><a href="#" className="hover:text-health transition-smooth">Cadastrar Consultório</a></li>
              <li><a href="#" className="hover:text-health transition-smooth">Gestão de Agenda</a></li>
              <li><a href="#" className="hover:text-health transition-smooth">Controle Financeiro</a></li>
              <li><a href="#" className="hover:text-health transition-smooth">Suporte Técnico</a></li>
              <li><a href="#" className="hover:text-health transition-smooth">Planos Premium</a></li>
            </ul>
          </div>

          {/* Contato */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Contato</h3>
            <div className="space-y-3 text-background/80">
              <div className="flex items-center space-x-3">
                <Phone className="h-4 w-4" />
                <span>(11) 3000-0000</span>
              </div>
              <div className="flex items-center space-x-3">
                <Mail className="h-4 w-4" />
                <span>contato@agendarbrasil.com.br</span>
              </div>
              <div className="flex items-start space-x-3">
                <MapPin className="h-4 w-4 mt-1" />
                <span>São Paulo, SP<br />Brasil</span>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-background/20 mt-12 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center text-background/60">
            <p>&copy; 2024 AgendarBrasil. Todos os direitos reservados.</p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <a href="#" className="hover:text-health transition-smooth">Privacidade</a>
              <a href="#" className="hover:text-health transition-smooth">Termos de Uso</a>
              <a href="#" className="hover:text-health transition-smooth">LGPD</a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;