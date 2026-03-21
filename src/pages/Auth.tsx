import { useState, type FormEvent } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Circle, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { getAuthPersistencePreference, setAuthPersistencePreference, supabase } from '@/integrations/supabase/client';
import { BRAND } from '@/config/brand';
import { detectDocumentType, formatBrazilPhone, formatCpfCnpj, normalizeDocumentDigits, validateBrazilPhone, validateCpfCnpj } from '@/lib/br-utils';
import loginLogo from '@/logos/Group 157.svg';
import loginSideImage from '@/logos/login-bg.png';

const hasFullName = (value: string) => value.trim().split(/\s+/).filter(Boolean).length >= 2;
const getPasswordChecks = (value: string) => ({
  hasLowercase: /[a-z]/.test(value),
  hasUppercase: /[A-Z]/.test(value),
  hasNumber: /\d/.test(value),
  hasSymbol: /[^A-Za-z0-9]/.test(value),
  hasMinLength: value.length >= 8,
});
const mapAuthErrorMessage = (message: string) => {
  const normalized = message.toLowerCase();

  if (normalized.includes('user already registered') || normalized.includes('already been registered')) {
    return 'Ja existe uma conta com esse email.';
  }

  if (normalized.includes('profiles_document_number_unique')) {
    return 'Ja existe uma empresa cadastrada com esse CPF ou CNPJ.';
  }

  if (normalized.includes('profiles_email_unique')) {
    return 'Ja existe uma conta com esse email.';
  }

  return message;
};

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [documentNumber, setDocumentNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberSession, setRememberSession] = useState(() => getAuthPersistencePreference());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user, loading, signIn, signUp } = useAuth();
  const { toast } = useToast();
  const passwordChecks = getPasswordChecks(password);
  const isStrongPassword = Object.values(passwordChecks).every(Boolean);
  const passwordChecklist = [
    { label: 'Minimo de 8 caracteres', valid: passwordChecks.hasMinLength },
    { label: 'Letra minuscula', valid: passwordChecks.hasLowercase },
    { label: 'Letra maiuscula', valid: passwordChecks.hasUppercase },
    { label: 'Numero', valid: passwordChecks.hasNumber },
    { label: 'Simbolo', valid: passwordChecks.hasSymbol },
  ];

  if (loading) return null;
  if (user) return <Navigate to="/dashboard" replace />;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      setAuthPersistencePreference(rememberSession);
      if (isLogin) {
        const { error } = await signIn(email.trim(), password);
        if (error) throw error;
      } else {
        const normalizedDocument = normalizeDocumentDigits(documentNumber);
        const documentType = detectDocumentType(normalizedDocument);

        if (!hasFullName(fullName)) {
          throw new Error('Informe o nome completo do responsavel.');
        }

        if (!companyName.trim()) {
          throw new Error('Informe o nome da empresa.');
        }

        if (!validateCpfCnpj(normalizedDocument) || !documentType) {
          throw new Error('Informe um CPF ou CNPJ valido.');
        }

        if (!validateBrazilPhone(phone)) {
          throw new Error('Informe um telefone valido com DDD.');
        }

        if (!isStrongPassword) {
          throw new Error('Crie uma senha forte para continuar.');
        }

        const { error } = await signUp({
          companyName: companyName.trim(),
          documentNumber: normalizedDocument,
          documentType,
          email: email.trim(),
          fullName: fullName.trim(),
          password,
          phone: formatBrazilPhone(phone),
        });
        if (error) throw error;
        toast({
          title: 'Conta criada!',
          description: 'Verifique seu email para confirmar o cadastro.',
        });
        setIsLogin(true);
      }
    } catch (error) {
      const err = error as Error;
      toast({
        title: 'Erro',
        description: mapAuthErrorMessage(err.message || 'Ocorreu um erro. Tente novamente.'),
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setAuthPersistencePreference(rememberSession);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    });
    if (error) {
      toast({
        title: 'Erro',
        description: 'Nao foi possivel fazer login com Google.',
        variant: 'destructive',
      });
    }
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
              {isLogin ? 'Entre na sua conta' : 'Crie sua conta'}
            </h1>
            <p className="text-muted-foreground text-sm">
              {isLogin
                ? 'Insira suas credenciais para acessar o painel'
                : 'Preencha os dados para comecar a prospectar'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {!isLogin && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="fullName" className="text-sm font-medium text-foreground">
                    Nome completo
                  </Label>
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="Digite seu nome completo"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required={!isLogin}
                    className="h-12 rounded-lg border-border bg-card"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="companyName" className="text-sm font-medium text-foreground">
                    Nome da empresa
                  </Label>
                  <Input
                    id="companyName"
                    type="text"
                    placeholder="Digite o nome da empresa"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    required={!isLogin}
                    className="h-12 rounded-lg border-border bg-card"
                  />
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="documentNumber" className="text-sm font-medium text-foreground">
                      CPF ou CNPJ
                    </Label>
                    <Input
                      id="documentNumber"
                      type="text"
                      inputMode="numeric"
                      placeholder="000.000.000-00"
                      value={documentNumber}
                      onChange={(e) => setDocumentNumber(formatCpfCnpj(e.target.value))}
                      required={!isLogin}
                      className="h-12 rounded-lg border-border bg-card"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="phone" className="text-sm font-medium text-foreground">
                      Telefone
                    </Label>
                    <Input
                      id="phone"
                      type="text"
                      inputMode="tel"
                      placeholder="(11) 99999-9999"
                      value={phone}
                      onChange={(e) => setPhone(formatBrazilPhone(e.target.value))}
                      required={!isLogin}
                      className="h-12 rounded-lg border-border bg-card"
                    />
                  </div>
                </div>
              </>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium text-foreground">
                Endereco de email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="Digite seu email"
                  value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-12 rounded-lg border-border bg-card"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm font-medium text-foreground">
                Senha
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Digite sua senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
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
              {!isLogin && (
                <div className="space-y-2 rounded-2xl border border-[#ececf0] bg-[#fafafd] p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#7b7b83]">Senha forte</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {passwordChecklist.map((item) => (
                      <div key={item.label} className={`flex items-center gap-2 text-xs ${item.valid ? 'text-[#1f7a45]' : 'text-[#7b7b83]'}`}>
                        {item.valid ? <CheckCircle2 className="h-3.5 w-3.5 text-[#1f7a45]" /> : <Circle className="h-3.5 w-3.5" />}
                        <span>{item.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {isLogin && (
              <div className="flex items-center justify-between gap-4">
                <label htmlFor="remember-session" className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
                  <Checkbox
                    id="remember-session"
                    checked={rememberSession}
                    onCheckedChange={(checked) => setRememberSession(checked === true)}
                  />
                  <span>Lembrar meu acesso</span>
                </label>

                <Link to="/esqueci-minha-senha" className="text-sm font-medium text-[#ef3333] transition-colors hover:text-[#d42c2c]">
                  Esqueci minha senha
                </Link>
              </div>
            )}

            <Button
              type="submit"
              disabled={isSubmitting || (!isLogin && !isStrongPassword)}
              className="w-full h-12 rounded-full gradient-primary text-primary-foreground font-semibold text-sm glow-primary"
            >
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              ) : (
                <span className="flex items-center gap-2">
                  {isLogin ? 'Entrar' : 'Criar conta'}
                  <ArrowRight className="w-4 h-4" />
                </span>
              )}
            </Button>
          </form>

          {isLogin && (
            <>
              <div className="relative my-5">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-background px-3 text-xs text-muted-foreground">ou</span>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={handleGoogleSignIn}
                className="w-full h-12 rounded-full font-semibold text-sm gap-3 border-border"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                Entrar com Google
              </Button>
            </>
          )}

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              {isLogin ? 'Não tem conta? Criar uma agora' : 'Já tem conta? Fazer login'}
            </button>
          </div>
        </div>
      </div>

      <div className="hidden lg:flex w-[50%] relative overflow-hidden rounded-l-[2rem] bg-foreground">
        <img
          src={loginSideImage}
          alt="Visual de login"
          className="absolute inset-0 h-full w-full object-cover"
        />
      </div>
    </div>
  );
};

export default Auth;
