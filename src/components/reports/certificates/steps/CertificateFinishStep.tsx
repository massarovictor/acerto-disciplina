import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CertificateType } from '@/lib/certificateTypes';
import { Class, SignatureMode } from '@/types';

interface CertificateFinishStepProps {
    type: CertificateType;
    eventTitle: string;
    selectedClassData: Class | null;
    studentCount: number;

    // Customizações de Assinatura
    teacherName: string;
    setTeacherName: (name: string) => void;
    signatureMode: SignatureMode;
    setSignatureMode: (mode: SignatureMode) => void;
}

export function CertificateFinishStep({
    type,
    eventTitle,
    selectedClassData,
    studentCount,
    teacherName,
    setTeacherName,
    signatureMode,
    setSignatureMode,
}: CertificateFinishStepProps) {

    const typeLabel = type === 'monitoria'
        ? 'Monitoria'
        : type === 'destaque'
            ? 'Destaque'
            : type === 'evento_participacao'
                ? 'Evento - Participação'
                : 'Evento - Organização';

    return (
        <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-4 rounded-lg border p-4 bg-white">
                <p className="text-sm font-semibold">Assinatura e autenticação</p>

                <div className="space-y-2">
                    <Label>Assinatura do Professor(a) <span className="text-xs text-muted-foreground">(texto que aparece em cursiva no PDF)</span></Label>
                    <Input
                        value={teacherName}
                        onChange={(e) => setTeacherName(e.target.value)}
                        placeholder="Digite o nome que aparecerá como assinatura cursiva..."
                    />
                </div>

                <div className="space-y-2">
                    <Label>Modo de assinatura</Label>
                    <Select
                        value={signatureMode}
                        onValueChange={(value) => setSignatureMode(value as SignatureMode)}
                    >
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="digital_cursive">Digital cursiva (emulada)</SelectItem>
                            <SelectItem value="physical_print">Assinatura física (impresso)</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <p className="text-xs text-muted-foreground mt-4 leading-relaxed">
                    Os certificados receberão automaticamente um QR Code verificável e código único para validação pública.
                </p>
            </div>

            <div className="flex flex-col gap-4">
                <div className="space-y-3 rounded-lg border p-5 text-sm bg-slate-50/50">
                    <h4 className="font-medium text-slate-900 border-b pb-2 mb-2">Resumo da Emissão</h4>
                    <div className="grid grid-cols-3 gap-1">
                        <span className="text-slate-500">Evento:</span>
                        <span className="col-span-2 font-medium">{eventTitle || <span className="text-muted-foreground/50">Não informado</span>}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-1">
                        <span className="text-slate-500">Tipo:</span>
                        <span className="col-span-2 font-medium">{typeLabel}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-1">
                        <span className="text-slate-500">Turma:</span>
                        <span className="col-span-2 font-medium">{selectedClassData?.name || <span className="text-muted-foreground/50">Pendente</span>}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-1">
                        <span className="text-slate-500">Alunos:</span>
                        <span className="col-span-2 font-medium">{studentCount} selecionado(s)</span>
                    </div>
                    <div className="grid grid-cols-3 gap-1">
                        <span className="text-slate-500">Moldura lateral:</span>
                        <span className="col-span-2 font-medium">Configurações Institucionais</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
