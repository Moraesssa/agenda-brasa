import { Button } from "@/components/ui/button";
import { Calendar, UserPlus, LogIn, Stethoscope, Heart, User, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const Header = () => {
  const { user, profile, userRole, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const getUserInitials = () => {
    if (profile?.first_name && profile?.last_name) {
      return `${profile.first_name[0]}${profile.last_name[0]}`.toUpperCase();
    }
    return user?.email?.[0]?.toUpperCase() || 'U';
  };

  const getRoleIcon = () => {
    switch (userRole) {
      case 'medico':
        return <Stethoscope className="h-4 w-4" />;
      case 'paciente':
        return <User className="h-4 w-4" />;
      default:
        return <User className="h-4 w-4" />;
    }
  };

  const getRoleLabel = () => {
    switch (userRole) {
      case 'medico':
        return 'Médico';
      case 'paciente':
        return 'Paciente';
      case 'admin':
        return 'Administrador';
      default:
        return 'Usuário';
    }
  };

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
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={profile?.avatar_url || ''} alt={profile?.first_name || ''} />
                    <AvatarFallback className="bg-health text-white">
                      {getUserInitials()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {profile?.first_name && profile?.last_name 
                        ? `${profile.first_name} ${profile.last_name}`
                        : user.email
                      }
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user.email}
                    </p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      {getRoleIcon()}
                      {getRoleLabel()}
                    </div>
                  </div>
                </DropdownMenuLabel>
                {userRole === 'paciente' && (
                  <DropdownMenuItem onClick={() => navigate('/dashboard')}>
                    <Calendar className="mr-2 h-4 w-4" />
                    <span>Meu painel</span>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sair</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Button variant="ghost" size="sm" className="text-xs sm:text-sm px-2 sm:px-4" onClick={() => navigate('/auth')}>
                <LogIn className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                <span className="hidden xs:inline">Entrar</span>
              </Button>
              <Button variant="medical" size="sm" className="text-xs sm:text-sm px-2 sm:px-4" onClick={() => navigate('/auth')}>
                <UserPlus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                <span className="hidden xs:inline">Cadastrar</span>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;