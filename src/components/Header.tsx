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

        <div className="flex items-center space-x-1 sm:space-x-2">
          <Button variant="ghost" size="sm" className="text-xs sm:text-sm px-2 sm:px-4">
            <LogIn className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            <span className="hidden xs:inline">Entrar</span>
          </Button>
          <Button variant="medical" size="sm" className="text-xs sm:text-sm px-2 sm:px-4">
            <UserPlus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            <span className="hidden xs:inline">Cadastrar</span>
          </Button>
        </div>
      </div>
    </header>
  );
};

export default Header;