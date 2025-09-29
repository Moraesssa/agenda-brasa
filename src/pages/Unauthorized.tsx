import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldX, ArrowLeft } from 'lucide-react';

const Unauthorized = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-4">
      <Card className="w-full max-w-md text-center shadow-elegant">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <ShieldX className="h-16 w-16 text-warning" />
          </div>
          <CardTitle>Acesso Negado</CardTitle>
          <CardDescription>
            Você não tem permissão para acessar esta página.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={() => navigate('/')} 
            className="w-full"
            variant="outline"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar ao início
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Unauthorized;