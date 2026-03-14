import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Eye, EyeOff, KeyRound, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { BRAND } from '@/config/brand';
import { supabase } from '@/integrations/supabase/client';
import { getPasswordResetRedirectUrl } from '@/lib/auth-redirects';
import loginLogo from '@/logos/ligth.svg';
import loginSideImage from '@/logos/imglogin.jpg';

const ForgotPassword = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const [requestSent, setRequestSent] = useState(false);
  const [isVerifyingLink, setIsVerifyingLink] = useState(false);

  const redirectUrl = useMemo(() => getPasswordResetRedirectUrl(), []);

  useEffect(() => {
    const readRecoveryParams = () => {
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
      const searchParams = new URLSearchParams(window.location.search);
      return {
        hashType: hashParams.get('type'),
        searchType: searchParams.get('type'),
        tokenHash: searchParams.get('token_hash'),
        errorDescription: searchParams.get('error_description') || hashParams.get('error_description'),
      };
    };

    const bootstrapRecovery = async () => {
      const { hashType, searchType, tokenHash, errorDescription } = readRecoveryParams();
      const hasRecoveryType = hashType === 'recovery' || searchType === 'recovery';

      if (errorDescription) {
        toast({
          title: 'Link invalido ou expirado',
          description: decodeURIComponent(errorDescription.replace(/\+/g, ' ')),
          variant: 'destructive',
        });
      }

      if (tokenHash && searchType === 'recovery') {
        setIsVerifyingLink(true);
        const { error } = await supabase.auth.verifyOtp({
          type: 'recovery',
          token_hash: tokenHash,
        });

        if (error) {
          toast({
            title: 'Nao foi possivel validar o link',
            description: error.message,
            variant: 'destructive',
          });
        } else {
          setIsRecoveryMode(true);
          window.history.replaceState({}, '', '/esqueci-minha-senha');
        }
        setIsVerifyingLink(false);
        return;
      }

      if (hasRecoveryType) {
        setIsRecoveryMode(true);
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user && hasRecoveryType) {
        setIsRecoveryMode(true);
        if (window.location.hash) {
          window.history.replaceState({}, '', '/esqueci-minha-senha');
        }
      }
    };

    void bootstrapRecovery();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecoveryMode(true);
        if (window.location.hash) {
          window.history.replaceState({}, '', '/esqueci-minha-senha');
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [toast]);

  const handleRequestReset = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    });

    if (error) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      setRequestSent(true);
      toast({
        title: 'Email enviado',
        description: 'Confira sua caixa de entrada para continuar a redefinicao da senha.',
      });
    }

    setIsSubmitting(false);
  };

  const handleUpdatePassword = async (e: FormEvent) => {
    e.preventDefault();

    if (password.length < 6) {
      toast({
        title: 'Senha muito curta',
        description: 'Use pelo menos 6 caracteres.',
        variant: 'destructive',
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: 'Senhas diferentes',
        description: 'Confirme a mesma senha nos dois campos.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      await supabase.auth.signOut();
      toast({
        title: 'Senha atualizada',
        description: 'Agora voce ja pode entrar com a nova senha.',
      });
      navigate('/auth');
    }

    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen flex">
      <div className="flex-1 flex flex-col justify-center px-6 sm:px-12 lg:px-16 py-12">
        <div className="w-full max-w-[420px] mx-auto">
          <div className="mb-12">
            <img src={loginLogo} alt={BRAND.name} className="h-12 w-auto" />
          </div>

          <div className="mb-8">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
              Conta
            </p>
            <h1 className="text-3xl font-bold text-foreground mb-1">
              {isRecoveryMode ? 'Redefina sua senha' : 'Esqueci minha senha'}
            </h1>
            <p className="text-muted-foreground text-sm">
              {isVerifyingLink
                ? 'Validando o link de recuperacao...'
                : isRecoveryMode
                ? 'Escolha uma nova senha para voltar ao painel.'
                : 'Informe seu email e enviaremos o link de recuperacao.'}
            </p>
          </div>

          {requestSent && !isRecoveryMode && (
            <div className="mb-6 rounded-2xl border border-[#f2d4d8] bg-[#fff5f6] px-4 py-3 text-sm leading-6 text-[#8f2a3a]">
              Enviamos o link para <span className="font-semibold">{email}</span>. Abra o email e volte por ele para definir sua nova senha.
            </div>
          )}

          <form onSubmit={isRecoveryMode ? handleUpdatePassword : handleRequestReset} className="space-y-5">
            {!isRecoveryMode && (
              <div className="space-y-1.5">
                <Label htmlFor="reset-email" className="text-sm font-medium text-foreground">
                  Endereco de email
                </Label>
                <Input
                  id="reset-email"
                  type="email"
                  placeholder="Digite seu email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-12 rounded-lg border-border bg-card"
                />
              </div>
            )}

            {isRecoveryMode && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="new-password" className="text-sm font-medium text-foreground">
                    Nova senha
                  </Label>
                  <div className="relative">
                    <Input
                      id="new-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Digite sua nova senha"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                      className="h-12 rounded-lg border-border bg-card pr-12"
                    />
                    <button
                      type="button"
                      aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                      onClick={() => setShowPassword((value) => !value)}
                      className="absolute inset-y-0 right-0 inline-flex w-12 items-center justify-center text-[#7b7b83] transition-colors hover:text-[#ef3333]"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="confirm-password" className="text-sm font-medium text-foreground">
                    Confirmar senha
                  </Label>
                  <div className="relative">
                    <Input
                      id="confirm-password"
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="Repita sua nova senha"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      minLength={6}
                      className="h-12 rounded-lg border-border bg-card pr-12"
                    />
                    <button
                      type="button"
                      aria-label={showConfirmPassword ? 'Ocultar senha' : 'Mostrar senha'}
                      onClick={() => setShowConfirmPassword((value) => !value)}
                      className="absolute inset-y-0 right-0 inline-flex w-12 items-center justify-center text-[#7b7b83] transition-colors hover:text-[#ef3333]"
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </>
            )}

            <Button
              type="submit"
              disabled={isSubmitting || isVerifyingLink}
              className="w-full h-12 rounded-full gradient-primary text-primary-foreground font-semibold text-sm glow-primary"
            >
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              ) : isVerifyingLink ? (
                <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              ) : (
                <span className="flex items-center gap-2">
                  {isRecoveryMode ? 'Salvar nova senha' : 'Enviar link de recuperacao'}
                  {isRecoveryMode ? <KeyRound className="w-4 h-4" /> : <Mail className="w-4 h-4" />}
                </span>
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <Link
              to="/auth"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar para o login
            </Link>
          </div>
        </div>
      </div>

      <div className="hidden lg:flex w-[50%] relative overflow-hidden rounded-l-[2rem] bg-foreground">
        <img
          src={loginSideImage}
          alt="Visual de recuperacao de senha"
          className="absolute inset-0 h-full w-full object-cover"
        />
      </div>
    </div>
  );
};

export default ForgotPassword;
