import { useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Class } from '@/types';
import { QUARTERS } from '@/lib/subjects';
import { CertificatePeriodMode } from '@/lib/certificatePeriods';
import { CertificateType } from '@/lib/certificateTypes';

interface CertificateContextStepProps {
    type: CertificateType;
    classes: Class[];
    selectedClassId: string;
    setSelectedClassId: (id: string) => void;
    selectedSchoolYear: number;
    setSelectedSchoolYear: (year: 1 | 2 | 3) => void;
    referenceYear: string;
    setReferenceYear: (year: string) => void;
    eventTitle: string;
    setEventTitle: (title: string) => void;

    // Períodos (Monitoria, Destaque, Evento Opcional)
    periodMode: CertificatePeriodMode;
    setPeriodMode: (mode: CertificatePeriodMode) => void;
    selectedQuarters: string[];
    toggleQuarter: (quarter: string, checked: boolean) => void;

    // Referências (Destaque, Monitoria, Evento Opcional)
    includeReference: boolean;
    setIncludeReference: (inc: boolean) => void;
    referenceType: 'subject' | 'area';
    setReferenceType: (t: 'subject' | 'area') => void;
    referenceValue: string;
    setReferenceValue: (v: string) => void;
    subjectReferences: { label: string; value: string }[];
    areaReferences: { label: string; value: string }[];

    // Eventos Específicos
    eventName: string;
    setEventName: (name: string) => void;
    eventDate: string;
    setEventDate: (date: string) => void;
    useDateRange: boolean;
    setUseDateRange: (use: boolean) => void;
    eventStartDate: string;
    setEventStartDate: (date: string) => void;
    eventEndDate: string;
    setEventEndDate: (date: string) => void;
    role: string;
    setRole: (role: string) => void;

    // Compartilhado: Monitoria e Eventos
    workloadHours: string;
    setWorkloadHours: (hours: string) => void;

    // Específico: Monitoria
    activity: string;
    setActivity: (value: string) => void;
}

export function CertificateContextStep({
    type,
    classes,
    selectedClassId,
    setSelectedClassId,
    selectedSchoolYear,
    setSelectedSchoolYear,
    referenceYear,
    setReferenceYear,
    eventTitle,
    setEventTitle,

    periodMode,
    setPeriodMode,
    selectedQuarters,
    toggleQuarter,

    includeReference,
    setIncludeReference,
    referenceType,
    setReferenceType,
    referenceValue,
    setReferenceValue,
    subjectReferences,
    areaReferences,

    eventName,
    setEventName,
    eventDate,
    setEventDate,
    useDateRange,
    setUseDateRange,
    eventStartDate,
    setEventStartDate,
    eventEndDate,
    setEventEndDate,
    role,
    setRole,

    workloadHours,
    setWorkloadHours,

    activity,
    setActivity,
}: CertificateContextStepProps) {

    const sortedClasses = useMemo(
        () => [...classes].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')),
        [classes],
    );

    const selectedClassData = useMemo(
        () => classes.find((item) => item.id === selectedClassId) || null,
        [classes, selectedClassId],
    );

    const isEvent = type === 'evento_participacao' || type === 'evento_organizacao';
    const isMonitoria = type === 'monitoria';

    return (
        <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-4 rounded-lg border p-4 bg-white">
                <p className="text-sm font-semibold">Configuração Básica</p>

                <div className="space-y-2">
                    <Label>Turma Alvo</Label>
                    <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                        <SelectTrigger>
                            <SelectValue placeholder="Selecione a turma" />
                        </SelectTrigger>
                        <SelectContent>
                            {sortedClasses.map((item) => (
                                <SelectItem key={item.id} value={item.id}>
                                    {item.name}
                                    {item.archived ? ' (Arquivada)' : ''}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label>Nome para salvar na lista (Interno) *</Label>
                    <Input
                        value={eventTitle}
                        onChange={(event) => setEventTitle(event.target.value)}
                        placeholder="Ex.: Certificação de Setembro"
                        maxLength={120}
                    />
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                        <Label>Ano letivo da turma</Label>
                        <Select
                            value={String(selectedSchoolYear)}
                            onValueChange={(value) => setSelectedSchoolYear(Number(value) as 1 | 2 | 3)}
                            disabled={!selectedClassData}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="1">1º ano</SelectItem>
                                <SelectItem value="2">2º ano</SelectItem>
                                <SelectItem value="3">3º ano</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Ano de referência do certificado *</Label>
                        <Input
                            type="number"
                            min="1900"
                            max="2100"
                            value={referenceYear}
                            onChange={(event) => setReferenceYear(event.target.value)}
                            placeholder="Ex.: 2024"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Modo de período</Label>
                        <Select value={periodMode} onValueChange={(value) => setPeriodMode(value as CertificatePeriodMode)}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="quarters">Bimestral</SelectItem>
                                <SelectItem value="annual">Anual</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {periodMode === 'quarters' && (
                    <div className="space-y-2 rounded-lg border p-3 bg-slate-50/50">
                        <Label className="text-sm">Bimestres de referência</Label>
                        <div className="grid grid-cols-2 gap-2">
                            {QUARTERS.map((quarter) => (
                                <label key={quarter} className="flex items-center gap-2 text-sm">
                                    <Checkbox
                                        checked={selectedQuarters.includes(quarter)}
                                        onCheckedChange={(value) => toggleQuarter(quarter, value === true)}
                                    />
                                    <span>{quarter}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                )}

                {/* References Component for all Except some rigid forms */}
                <div className="rounded-lg border p-3 bg-slate-50/50 space-y-3">
                    <div className="flex items-center justify-between">
                        <Label>Vincular a Disciplina/Área {(isEvent || isMonitoria) && '(opcional)'}</Label>
                        <Switch checked={includeReference} onCheckedChange={setIncludeReference} />
                    </div>

                    {includeReference && (
                        <div className="grid gap-3 md:grid-cols-2 mt-2">
                            <Select value={referenceType} onValueChange={(value) => setReferenceType(value as 'subject' | 'area')}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="subject">Disciplina</SelectItem>
                                    <SelectItem value="area">Área</SelectItem>
                                </SelectContent>
                            </Select>

                            <Select value={referenceValue} onValueChange={setReferenceValue}>
                                <SelectTrigger>
                                    <SelectValue placeholder={referenceType === 'subject' ? 'Selecione' : 'Área'} />
                                </SelectTrigger>
                                <SelectContent>
                                    {(referenceType === 'subject' ? subjectReferences : areaReferences).map((option) => (
                                        <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                </div>
            </div>

            <div className="space-y-4 rounded-lg border p-4 bg-white">
                <p className="text-sm font-semibold">Parâmetros do {isEvent ? 'Evento' : isMonitoria ? 'Monitoria' : 'Destaque'}</p>

                {isEvent && (
                    <>
                        <div className="space-y-2">
                            <Label>Nome do Evento *</Label>
                            <Input value={eventName} onChange={(e) => setEventName(e.target.value)} placeholder="Ex.: Semana da Computação" />
                        </div>

                        <div className="rounded-lg border p-3 bg-slate-50/50 space-y-3">
                            <div className="space-y-2">
                                <Label>Data de Realização (Principal) *</Label>
                                <Input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
                            </div>

                            <div className="flex items-center gap-2 pt-2 border-t">
                                <Checkbox checked={useDateRange} onCheckedChange={(v) => setUseDateRange(v === true)} id="range" />
                                <Label htmlFor="range" className="font-normal text-sm cursor-pointer">Definir período estendido (opcional)</Label>
                            </div>

                            {useDateRange && (
                                <div className="grid gap-3 md:grid-cols-2">
                                    <div className="space-y-1"><Label className="text-xs">De</Label><Input type="date" value={eventStartDate} onChange={(e) => setEventStartDate(e.target.value)} /></div>
                                    <div className="space-y-1"><Label className="text-xs">Até</Label><Input type="date" value={eventEndDate} onChange={(e) => setEventEndDate(e.target.value)} /></div>
                                </div>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label>Função/Papel do Aluno no Evento *</Label>
                            <Input
                                value={role}
                                onChange={(e) => setRole(e.target.value)}
                                placeholder={
                                    type === 'evento_organizacao'
                                        ? 'Ex.: Coordenador Geral'
                                        : 'Ex.: Participante'
                                }
                            />
                        </div>
                    </>
                )}

                {/* Carga Horária compartilhada (Eventos + Monitoria) */}
                {(isEvent || isMonitoria) && (
                    <div className="space-y-2">
                        <Label>Carga Horária Total (Horas) *</Label>
                        <Input type="number" min="1" step="0.5" value={workloadHours} onChange={(e) => setWorkloadHours(e.target.value)} placeholder="Ex.: 40" />
                    </div>
                )}

                {isMonitoria && (
                    <>
                        <div className="space-y-2">
                            <Label>Atividade da Monitoria *</Label>
                            <Input
                                value={activity}
                                onChange={(e) => setActivity(e.target.value)}
                                placeholder="Ex.: Apoio em Matemática Aplicada"
                            />
                        </div>
                    </>
                )}

                {!isEvent && !isMonitoria && (
                    <div className="flex h-32 items-center justify-center border-2 border-dashed rounded-lg bg-slate-50/50 text-center px-4">
                        <p className="text-sm text-slate-500 font-medium">Os metadados para Certificados de Destaque são gerados automaticamente pelo sistema a partir das notas da Turma após esta etapa.</p>
                    </div>
                )}

            </div>
        </div>
    );
}
