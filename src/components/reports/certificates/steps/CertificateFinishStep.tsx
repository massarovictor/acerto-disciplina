import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CertificateType } from '@/lib/certificateTypes';
import { type SidebarPattern } from '@/lib/certificatePdfExport';
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

    // Visual da Faixa Lateral
    sidebarPattern: SidebarPattern;
    setSidebarPattern: (pattern: SidebarPattern) => void;
}

const SIDEBAR_PATTERN_OPTIONS: { value: SidebarPattern; label: string; preview: string }[] = [
    { value: 'chevrons', label: 'Chevrons', preview: '‹‹‹' },
    { value: 'hexagons', label: 'Hexágonos', preview: '⬡⬡⬡' },
    { value: 'diagonal_lines', label: 'Linhas Diagonais', preview: '///' },
];

export function CertificateFinishStep({
    type,
    eventTitle,
    selectedClassData,
    studentCount,
    teacherName,
    setTeacherName,
    signatureMode,
    setSignatureMode,
    sidebarPattern,
    setSidebarPattern,
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

                <div className="space-y-2">
                    <Label>Estilo da faixa lateral</Label>
                    <div className="grid grid-cols-3 gap-2">
                        {SIDEBAR_PATTERN_OPTIONS.map((opt) => (
                            <button
                                key={opt.value}
                                type="button"
                                onClick={() => setSidebarPattern(opt.value)}
                                className={`relative flex flex-col items-center gap-1.5 rounded-lg border-2 p-3 text-center transition-all ${sidebarPattern === opt.value
                                    ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                                    }`}
                            >
                                <span className="text-lg font-mono tracking-wider text-slate-600">{opt.preview}</span>
                                <span className={`text-xs font-medium ${sidebarPattern === opt.value ? 'text-primary' : 'text-slate-500'}`}>
                                    {opt.label}
                                </span>
                            </button>
                        ))}
                    </div>
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
                        <span className="text-slate-500">Faixa Lateral:</span>
                        <span className="col-span-2 font-medium">
                            {SIDEBAR_PATTERN_OPTIONS.find(o => o.value === sidebarPattern)?.label || 'Chevrons'}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
