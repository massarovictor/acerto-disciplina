import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Mail } from 'lucide-react';
import { supabase } from '@/services/supabase';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';

const Login = () => {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  const sanitizeNext = (nextPath: string | null): string => {
    if (!nextPath) return '/';
    const value = nextPath.trim();
    if (!value.startsWith('/')) return '/';
    if (value.startsWith('//')) return '/';

    const lower = value.toLowerCase();
    if (
      lower.startsWith('http://') ||
      lower.startsWith('https://') ||
      lower.startsWith('javascript:')
    ) {
      return '/';
    }

    return value;
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsLoading(true);
    try {
      // 1. Verificar se o email está na whitelist
      const { data: authorized, error: checkError } = await supabase
        .from('authorized_emails')
        .select('email')
        .eq('email', email.toLowerCase().trim())
        .single();

      if (checkError || !authorized) {
        throw new Error('Este email não está autorizado a acessar o sistema. Entre em contato com a administração.');
      }

      // 2. Enviar código OTP (criar usuário se não existir)
      const { error } = await supabase.auth.signInWithOtp({
        email: email.toLowerCase().trim(),
        options: {
          shouldCreateUser: true,
        },
      });

      if (error) throw error;

      setStep('otp');
      toast({
        title: 'Código enviado!',
        description: `Verifique o código de acesso enviado para ${email}`,
      });
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : 'Erro desconhecido.';
      const friendlyMessage = message.toLowerCase().includes('signups not allowed')
        ? 'Seu acesso precisa ser liberado pela administração antes do primeiro login.'
        : message.toLowerCase().includes('user not found')
          ? 'Usuário não encontrado. Peça à administração para criar seu acesso.'
          : message;
      toast({
        variant: 'destructive',
        title: 'Acesso negado',
        description: friendlyMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || otp.length !== 6) return;

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: 'email',
      });

      if (error) throw error;

      toast({
        title: 'Login realizado',
        description: 'Bem-vindo ao MAVIC',
      });
      const safeNext = sanitizeNext(searchParams.get('next'));
      navigate(safeNext, { replace: true });
    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Código inválido',
        description: 'O código inserido está incorreto ou expirou.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-primary/10 p-4">
      <Card className="w-full max-w-md shadow-lg border-t-4 border-t-primary">
        <CardHeader className="space-y-2 text-center pb-2">
          <div className="flex justify-center">
            <div className="bg-brand-500 text-white p-3 rounded-full">
              <img src="/logo-white.svg" alt="MAVIC Logo" className="h-12 w-12" />
            </div>
          </div>
          <div className="space-y-1">
            <CardTitle className="text-[28px] font-bold tracking-tighter lowercase text-foreground leading-none" style={{ fontFamily: 'Sora, sans-serif' }}>mavic</CardTitle>
            <CardDescription className="text-xs font-normal leading-none" style={{ fontFamily: 'Geist, sans-serif' }}>
              Sistema de Acompanhamento Escolar
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="pt-10">
          {step === 'email' ? (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">Email Institucional</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="nome@escola.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-9 h-11"
                    required
                    autoFocus
                  />
                </div>
              </div>
              <Button type="submit" className="w-full h-11 text-base" disabled={isLoading}>
                {isLoading ? 'Enviando código...' : 'Receber Código de Acesso'}
              </Button>
              <p className="text-xs text-center text-muted-foreground mt-4">
                Insira seu email autorizado para receber um código temporário.
              </p>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-6">
              <div className="space-y-2 text-center">
                <Label className="text-sm font-medium">Código de Verificação</Label>
                <p className="text-xs text-muted-foreground mb-4">
                  Enviado para <span className="font-medium text-foreground">{email}</span>
                </p>
                <div className="flex justify-center">
                  <InputOTP
                    maxLength={6}
                    value={otp}
                    onChange={(value) => setOtp(value)}
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>
              </div>

              <Button type="submit" className="w-full h-11 text-base" disabled={isLoading || otp.length < 6}>
                {isLoading ? 'Verificando...' : 'Entrar no Sistema'}
              </Button>

              <Button
                type="button"
                variant="ghost"
                className="w-full text-sm"
                onClick={() => setStep('email')}
                disabled={isLoading}
              >
                Voltar e alterar email
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
