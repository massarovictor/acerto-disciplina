import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Student } from '@/types';

interface CertificateTextEditorProps {
  baseText: string;
  onBaseTextChange: (value: string) => void;
  selectedStudents: Student[];
  textOverrides: Record<string, string>;
  onTextOverrideChange: (studentId: string, value: string) => void;
  previewText?: string;
  placeholderTokens?: string[];
  onResetBaseText?: () => void;
  maxLength?: number;
}

export const CertificateTextEditor = ({
  baseText,
  onBaseTextChange,
  selectedStudents,
  textOverrides,
  onTextOverrideChange,
  previewText,
  placeholderTokens,
  onResetBaseText,
  maxLength,
}: CertificateTextEditorProps) => {
  const currentLength = baseText.trim().length;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <Label>Texto base do certificado</Label>
          {onResetBaseText ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={onResetBaseText}
            >
              Restaurar modelo
            </Button>
          ) : null}
        </div>
        <Textarea
          value={baseText}
          onChange={(event) => onBaseTextChange(event.target.value)}
          rows={5}
          className="resize-y"
          maxLength={maxLength}
        />
        {maxLength ? (
          <p className="text-xs text-muted-foreground">
            {currentLength}/{maxLength} caracteres.
          </p>
        ) : null}
        {placeholderTokens && placeholderTokens.length > 0 ? (
          <div className="rounded-md border bg-muted/30 p-2 text-xs">
            <p className="mb-1 font-medium">Variáveis disponíveis</p>
            <div className="flex flex-wrap gap-1">
              {placeholderTokens.map((token) => (
                <code
                  key={token}
                  className="rounded bg-background px-1.5 py-0.5 text-[11px]"
                >
                  {`{{${token}}}`}
                </code>
              ))}
            </div>
          </div>
        ) : null}
        <p className="text-xs text-muted-foreground">
          O texto base será aplicado para todos os alunos. Evite repetir termos do título do
          certificado para manter o texto objetivo.
        </p>
      </div>

      {previewText ? (
        <div className="space-y-2 rounded-md border bg-muted/20 p-3">
          <Label>Prévia dinâmica</Label>
          <p className="text-sm leading-6">{previewText}</p>
        </div>
      ) : null}

      {selectedStudents.length > 0 && (
        <>
          <Separator />
          <div className="space-y-3">
            <Label>Ajustes por aluno (opcional)</Label>
            <div className="space-y-3">
              {selectedStudents.map((student) => (
                <div key={student.id} className="space-y-2 rounded-md border p-3">
                  <p className="text-sm font-medium">{student.name}</p>
                  <Textarea
                    value={textOverrides[student.id] || ''}
                    onChange={(event) =>
                      onTextOverrideChange(student.id, event.target.value)
                    }
                    placeholder="Se vazio, será usado o texto base"
                    rows={3}
                    className="resize-y"
                    maxLength={maxLength}
                  />
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
