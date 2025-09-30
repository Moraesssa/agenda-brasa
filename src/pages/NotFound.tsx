import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Heart, ArrowLeft, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-gradient-subtle flex items-center justify-center px-4 py-12">
      <div className="container">
        <div className="mx-auto max-w-3xl text-center space-y-10">
          <div className="flex flex-col items-center gap-4">
            <div className="flex items-center gap-3">
              <Heart className="h-10 w-10 text-health" aria-hidden="true" />
              <span className="text-3xl md:text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                AgendarBrasil
              </span>
            </div>
            <span className="text-sm font-semibold tracking-[0.2em] uppercase text-primary/80">
              Erro 404
            </span>
          </div>

          <div className="space-y-6">
            <h1 className="text-4xl md:text-6xl font-bold leading-tight text-foreground">
              Página não encontrada
            </h1>
            <p className="text-xl text-muted-foreground leading-relaxed">
              A rota <span className="font-semibold text-foreground">{location.pathname}</span> não existe ou foi
              movida. Use os atalhos abaixo para continuar aproveitando a plataforma.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button asChild variant="medical" size="lg" className="text-lg px-8 py-6">
              <Link to="/">
                <Home className="mr-2 h-5 w-5" aria-hidden="true" />
                Voltar para a página inicial
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="text-lg px-8 py-6">
              <Link to="/auth">
                <ArrowLeft className="mr-2 h-5 w-5" aria-hidden="true" />
                Entrar na plataforma
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
