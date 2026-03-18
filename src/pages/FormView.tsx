import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { BRAND } from '@/config/brand';
import type { FormField, FormSchema } from '@/components/FormBuilder';

interface DbFormSchema extends FormSchema {
  id: string;
  user_id: string;
}

export default function FormView() {
  const { slug } = useParams<{ slug: string }>();
  const [schema, setSchema] = useState<DbFormSchema | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!slug) return;
    supabase
      .from('form_schemas')
      .select('*')
      .eq('slug', slug)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error || !data) { setNotFound(true); return; }
        setSchema(data as DbFormSchema);
      });
  }, [slug]);

  const isVisible = (field: FormField) => {
    if (!field.condition) return true;
    const dep = answers[field.condition.fieldId];
    const val = Array.isArray(dep) ? dep.join(', ') : (dep ?? '');
    return field.condition.operator === 'equals' ? val === field.condition.value : val !== field.condition.value;
  };

  const setAnswer = (id: string, val: string | string[]) =>
    setAnswers((p) => ({ ...p, [id]: val }));

  const maskPhone = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 10) {
      return digits.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3').replace(/-$/, '');
    }
    return digits.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3').replace(/-$/, '');
  };

  const validate = () => {
    if (!schema) return false;
    const errs: Record<string, string> = {};
    for (const field of schema.fields) {
      if (!isVisible(field)) continue;
      const val = answers[field.id];
      const empty = !val || (Array.isArray(val) ? val.length === 0 : (val as string).trim() === '');
      if (field.required && empty) { errs[field.id] = 'Campo obrigatório'; continue; }
      if (!empty) {
        if (field.type === 'email') {
          const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val as string);
          if (!emailOk) errs[field.id] = 'Email inválido';
        }
        if (field.type === 'phone') {
          const digits = (val as string).replace(/\D/g, '');
          if (digits.length < 10) errs[field.id] = 'Telefone inválido';
        }
      }
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schema || !validate()) return;
    setSubmitting(true);

    const { error } = await supabase.from('form_responses').insert({
      form_schema_id: schema.id,
      respondent_data: answers,
      user_agent: navigator.userAgent,
    });

    if (!error) {
      // Notify form owner
      const { data: profile } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', schema.user_id)
        .maybeSingle();

      if (profile?.email) {
        const firstNameField = schema.fields.find((f) => f.type === 'text');
        const respondentName = firstNameField ? (answers[firstNameField.id] as string ?? '') : '';
        await supabase.functions.invoke('send-system-email', {
          body: {
            type: 'form_submitted',
            user_email: profile.email,
            variables: {
              nome_formulario: schema.title,
              respondente: respondentName,
              link_dashboard: `${window.location.origin}/templates`,
            },
          },
        }).catch(() => {});
      }

      setSubmitted(true);
    } else {
      alert('Erro ao enviar formulário. Tente novamente.');
    }
    setSubmitting(false);
  };

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center space-y-2">
          <h1 className="text-xl font-bold">Formulário não encontrado</h1>
          <p className="text-muted-foreground text-sm">O link pode estar incorreto ou expirado.</p>
        </div>
      </div>
    );
  }

  if (!schema) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#ef3333] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const behavior = (schema as any).submission_behavior || 'popup';
  const redirectUrl = (schema as any).redirect_url || '';

  if (submitted && behavior === 'page' && redirectUrl) {
    window.location.href = redirectUrl;
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex items-start justify-center py-12 px-4">
      {submitted && behavior === 'popup' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-8 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-[#ef3333]/10 flex items-center justify-center mx-auto">
              <svg className="w-7 h-7 text-[#ef3333]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-[#1A1A1A]">Cadastro concluído!</h2>
            <p className="text-sm text-[#6d6d75]">{schema.thank_you_message}</p>
          </div>
        </div>
      )}
      <div className="max-w-lg w-full space-y-6">
        <div>
          <h1 className="text-2xl font-bold">{schema.title}</h1>
          {schema.description && <p className="text-muted-foreground mt-1 text-sm">{schema.description}</p>}
        </div>
        <Separator />
        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          {schema.fields.map((field) => {
            if (!isVisible(field)) return null;
            const val = answers[field.id] ?? '';
            const err = errors[field.id];

            return (
              <div key={field.id} className="space-y-1.5">
                <Label className="text-sm font-medium">
                  {field.label}
                  {field.required && <span className="text-destructive ml-1">*</span>}
                </Label>

                {field.type === 'textarea' && (
                  <Textarea
                    placeholder={field.placeholder}
                    value={val as string}
                    onChange={(e) => setAnswer(field.id, e.target.value)}
                    rows={3}
                    className={err ? 'border-destructive' : ''}
                  />
                )}

                {(field.type === 'text' || field.type === 'number') && (
                  <Input
                    type={field.type === 'number' ? 'number' : 'text'}
                    placeholder={field.placeholder}
                    value={val as string}
                    onChange={(e) => setAnswer(field.id, e.target.value)}
                    className={err ? 'border-destructive' : ''}
                  />
                )}

                {field.type === 'phone' && (
                  <Input
                    type="tel"
                    placeholder={field.placeholder || '(11) 99999-9999'}
                    value={val as string}
                    onChange={(e) => setAnswer(field.id, maskPhone(e.target.value))}
                    className={err ? 'border-destructive' : ''}
                    maxLength={15}
                  />
                )}

                {field.type === 'email' && (
                  <Input
                    type="email"
                    placeholder={field.placeholder || 'seu@email.com'}
                    value={val as string}
                    onChange={(e) => setAnswer(field.id, e.target.value)}
                    className={err ? 'border-destructive' : ''}
                    inputMode="email"
                  />
                )}

                {field.type === 'select' && (
                  <Select value={val as string} onValueChange={(v) => setAnswer(field.id, v)}>
                    <SelectTrigger className={err ? 'border-destructive' : ''}>
                      <SelectValue placeholder={field.placeholder || 'Selecione...'} />
                    </SelectTrigger>
                    <SelectContent>
                      {field.options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}

                {field.type === 'radio' && (
                  <div className="space-y-2">
                    {field.options.map((o) => (
                      <label key={o} className="flex items-center gap-2.5 cursor-pointer text-sm">
                        <input
                          type="radio"
                          name={field.id}
                          value={o}
                          checked={val === o}
                          onChange={() => setAnswer(field.id, o)}
                          className="accent-[#ef3333]"
                        />
                        {o}
                      </label>
                    ))}
                  </div>
                )}

                {field.type === 'checkbox' && (
                  <div className="space-y-2">
                    {field.options.map((o) => {
                      const checked = Array.isArray(val) ? val.includes(o) : false;
                      return (
                        <label key={o} className="flex items-center gap-2.5 cursor-pointer text-sm">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => {
                              const arr = Array.isArray(val) ? [...val] : [];
                              setAnswer(field.id, checked ? arr.filter((v) => v !== o) : [...arr, o]);
                            }}
                            className="accent-[#ef3333]"
                          />
                          {o}
                        </label>
                      );
                    })}
                  </div>
                )}

                {err && <p className="text-xs text-destructive">{err}</p>}
              </div>
            );
          })}

          <Button
            type="submit"
            disabled={submitting}
            className="w-full h-12 rounded-full bg-[#ef3333] hover:bg-[#d42b2b] text-white font-semibold"
          >
            {submitting ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              'Enviar'
            )}
          </Button>
        </form>

        <p className="text-xs text-center text-muted-foreground pb-6">
          Powered by <span className="font-semibold text-[#ef3333]">{BRAND.name}</span>
        </p>
      </div>
    </div>
  );
}
