import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatBrasiliaDateTime } from '@/lib/brasiliaDate';
import { supabase } from '@/services/supabase/client';

interface CertificateVerificationRow {
  verification_code: string;
  verification_status: 'valid' | 'revoked';
  issued_at: string;
  student_name: string;
  certificate_type: string;
  event_title: string;
  school_name: string;
  class_name: string;
}

const normalizeVerificationCode = (value: string) =>
  value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

const CERTIFICATE_TYPE_LABEL: Record<string, string> = {
  monitoria: 'Monitoria',
  destaque: 'Aluno Destaque',
  evento_participacao: 'Evento - Participação',
  evento_organizacao: 'Evento - Organização',
};

const VerificationStatusBadge = ({ status }: { status: 'valid' | 'revoked' }) =>
  status === 'valid' ? (
    <Badge className="bg-success/15 text-success border-success/30">Válido</Badge>
  ) : (
    <Badge variant="destructive">Revogado</Badge>
  );

const CertificateVerification = () => {
  const [searchParams] = useSearchParams();
  const initialCode = useMemo(
    () => normalizeVerificationCode(searchParams.get('codigo') || ''),
    [searchParams],
  );

  const [codeInput, setCodeInput] = useState(initialCode);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CertificateVerificationRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  const runVerification = useCallback(async (rawCode: string) => {
    const normalizedCode = normalizeVerificationCode(rawCode);
    if (!normalizedCode) {
      setResult(null);
      setNotFound(false);
      setError('Informe um código de verificação.');
      return;
    }

    setLoading(true);
    setError(null);
    setNotFound(false);
    setResult(null);

    try {
      const { data, error: rpcError } = await supabase.rpc('verify_certificate_code', {
        p_code: normalizedCode,
      });

      if (rpcError) {
        setError('Não foi possível validar o certificado neste momento.');
        return;
      }

      const row = Array.isArray(data) ? data[0] : data;
      if (!row) {
        setNotFound(true);
        return;
      }

      setResult(row as CertificateVerificationRow);
    } catch (unexpectedError) {
      console.error('Erro ao validar certificado:', unexpectedError);
      setError('Erro inesperado ao consultar o código de verificação.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!initialCode) return;
    runVerification(initialCode);
  }, [initialCode, runVerification]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    runVerification(codeInput);
  };

  return (
    <div className="min-h-screen bg-muted/30 px-4 py-10">
      <div className="mx-auto max-w-3xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Validação de Certificado</CardTitle>
            <CardDescription>
              Consulte a autenticidade pelo código presente no certificado.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-3">
              <Label htmlFor="verification-code">Código de verificação</Label>
              <div className="flex gap-2">
                <Input
                  id="verification-code"
                  value={codeInput}
                  onChange={(event) =>
                    setCodeInput(normalizeVerificationCode(event.target.value))
                  }
                  placeholder="Ex.: 2F4A67B9C8D74A7EA..."
                />
                <Button type="submit" disabled={loading}>
                  {loading ? 'Validando...' : 'Validar'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {error ? (
          <Card className="border-destructive/40">
            <CardContent className="pt-6 text-sm text-destructive">{error}</CardContent>
          </Card>
        ) : null}

        {notFound ? (
          <Card className="border-warning/40">
            <CardContent className="pt-6 text-sm">
              Código não encontrado. Verifique o conteúdo e tente novamente.
            </CardContent>
          </Card>
        ) : null}

        {result ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-2">
                <span>Resultado da validação</span>
                <VerificationStatusBadge status={result.verification_status} />
              </CardTitle>
              <CardDescription>
                Código: <span className="font-mono">{result.verification_code}</span>
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-xs text-muted-foreground">Aluno</p>
                <p className="text-sm font-medium">{result.student_name}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Tipo</p>
                <p className="text-sm font-medium">
                  {CERTIFICATE_TYPE_LABEL[result.certificate_type] || result.certificate_type}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Evento</p>
                <p className="text-sm font-medium">{result.event_title}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Turma</p>
                <p className="text-sm font-medium">{result.class_name}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Escola</p>
                <p className="text-sm font-medium">{result.school_name}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Emissão</p>
                <p className="text-sm font-medium">{formatBrasiliaDateTime(result.issued_at)}</p>
              </div>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
};

export default CertificateVerification;
