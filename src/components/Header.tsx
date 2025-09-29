import { Button } from "@/components/ui/button";
import { Calendar, UserPlus, LogIn, Stethoscope, Heart } from "lucide-react";

const Header = () => {
  return (
    <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-2">
            <Heart className="h-8 w-8 text-health" />
            <span className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              AgendarBrasil
            </span>
          </div>
        </div>

        <nav className="hidden md:flex items-center space-x-6">
          <a href="#agenda" className="text-sm font-medium text-muted-foreground hover:text-primary transition-smooth">
            Agendar Consulta
          </a>
          <a href="#profissionais" className="text-sm font-medium text-muted-foreground hover:text-primary transition-smooth">
            Para Profissionais
          </a>
          <a href="#sobre" className="text-sm font-medium text-muted-foreground hover:text-primary transition-smooth">
            Sobre
          </a>
        </nav>

        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="sm">
            <LogIn className="h-4 w-4 mr-2" />
            Entrar
          </Button>
          <Button variant="medical" size="sm">
            <UserPlus className="h-4 w-4 mr-2" />
            Cadastrar
          </Button>
        </div>
      </div>
    </header>
  );
};

export default Header;