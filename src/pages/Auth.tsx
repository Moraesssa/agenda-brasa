import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Heart, UserPlus, LogIn, Stethoscope, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';

const signInSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres')
});

const signUpSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
  first_name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  last_name: z.string().min(2, 'Sobrenome deve ter pelo menos 2 caracteres'),
  phone: z.string().min(10, 'Telefone inválido'),
  role: z.enum(['paciente', 'medico']),
  specialty: z.string().optional(),
  crm: z.string().optional()
});

const Auth = () => {
  const navigate = useNavigate();
  const { signIn, signUp } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('signin');
  
  const [signInData, setSignInData] = useState({
    email: '',
    password: ''
  });

  const [signUpData, setSignUpData] = useState({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    phone: '',
    role: 'paciente' as 'paciente' | 'medico',
    specialty: '',
    crm: ''
  });

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const validatedData = signInSchema.parse(signInData);
      const { error } = await signIn(validatedData.email, validatedData.password);
      
      if (error) {
        toast({
          title: 'Erro no login',
          description: error.message === 'Invalid login credentials' 
            ? 'Email ou senha incorretos' 
            : error.message,
          variant: 'destructive'
        });
      } else {
        toast({
          title: 'Login realizado com sucesso!',
          description: 'Redirecionando...'
        });
        navigate('/');
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: 'Dados inválidos',
          description: error.errors[0].message,
          variant: 'destructive'
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const validatedData = signUpSchema.parse(signUpData);
      
      // Validate doctor-specific fields
      if (validatedData.role === 'medico') {
        if (!validatedData.specialty || !validatedData.crm) {
          toast({
            title: 'Dados incompletos',
            description: 'Especialidade e CRM são obrigatórios para médicos',
            variant: 'destructive'
          });
          setLoading(false);
          return;
        }
      }

      const { error } = await signUp(validatedData.email, validatedData.password, {
        first_name: validatedData.first_name,
        last_name: validatedData.last_name,
        phone: validatedData.phone,
        role: validatedData.role,
        specialty: validatedData.role === 'medico' ? validatedData.specialty : null,
        crm: validatedData.role === 'medico' ? validatedData.crm : null
      });
      
      if (error) {
        toast({
          title: 'Erro no cadastro',
          description: error.message === 'User already registered' 
            ? 'Este email já está cadastrado' 
            : error.message,
          variant: 'destructive'
        });
      } else {
        toast({
          title: 'Cadastro realizado com sucesso!',
          description: 'Você já pode fazer login'
        });
        setActiveTab('signin');
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: 'Dados inválidos',
          description: error.errors[0].message,
          variant: 'destructive'
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Heart className="h-10 w-10 text-health" />
            <span className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              AgendarBrasil
            </span>
          </div>
          <p className="text-muted-foreground">
            Sua saúde em boas mãos
          </p>
        </div>

        <Card className="shadow-elegant">
          <CardHeader>
            <CardTitle className="text-center">Acesse sua conta</CardTitle>
            <CardDescription className="text-center">
              Entre ou crie sua conta para continuar
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin" className="flex items-center gap-2">
                  <LogIn className="h-4 w-4" />
                  Entrar
                </TabsTrigger>
                <TabsTrigger value="signup" className="flex items-center gap-2">
                  <UserPlus className="h-4 w-4" />
                  Cadastrar
                </TabsTrigger>
              </TabsList>

              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="seu@email.com"
                      value={signInData.email}
                      onChange={(e) => setSignInData({ ...signInData, email: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Senha</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={signInData.password}
                      onChange={(e) => setSignInData({ ...signInData, password: e.target.value })}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? 'Entrando...' : 'Entrar'}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="first_name">Nome</Label>
                      <Input
                        id="first_name"
                        placeholder="João"
                        value={signUpData.first_name}
                        onChange={(e) => setSignUpData({ ...signUpData, first_name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="last_name">Sobrenome</Label>
                      <Input
                        id="last_name"
                        placeholder="Silva"
                        value={signUpData.last_name}
                        onChange={(e) => setSignUpData({ ...signUpData, last_name: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signup_email">Email</Label>
                    <Input
                      id="signup_email"
                      type="email"
                      placeholder="seu@email.com"
                      value={signUpData.email}
                      onChange={(e) => setSignUpData({ ...signUpData, email: e.target.value })}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefone</Label>
                    <Input
                      id="phone"
                      placeholder="(11) 99999-9999"
                      value={signUpData.phone}
                      onChange={(e) => setSignUpData({ ...signUpData, phone: e.target.value })}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signup_password">Senha</Label>
                    <Input
                      id="signup_password"
                      type="password"
                      placeholder="••••••••"
                      value={signUpData.password}
                      onChange={(e) => setSignUpData({ ...signUpData, password: e.target.value })}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="role">Tipo de usuário</Label>
                    <Select value={signUpData.role} onValueChange={(value: 'paciente' | 'medico') => 
                      setSignUpData({ ...signUpData, role: value })
                    }>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="paciente">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            Paciente
                          </div>
                        </SelectItem>
                        <SelectItem value="medico">
                          <div className="flex items-center gap-2">
                            <Stethoscope className="h-4 w-4" />
                            Médico
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {signUpData.role === 'medico' && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="specialty">Especialidade</Label>
                        <Input
                          id="specialty"
                          placeholder="Ex: Cardiologia"
                          value={signUpData.specialty}
                          onChange={(e) => setSignUpData({ ...signUpData, specialty: e.target.value })}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="crm">CRM</Label>
                        <Input
                          id="crm"
                          placeholder="Ex: CRM/SP 123456"
                          value={signUpData.crm}
                          onChange={(e) => setSignUpData({ ...signUpData, crm: e.target.value })}
                          required
                        />
                      </div>
                    </>
                  )}
                  
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? 'Cadastrando...' : 'Criar conta'}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;