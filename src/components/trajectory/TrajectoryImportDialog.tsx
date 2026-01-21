import { useState, useMemo } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Upload, FileText, CheckCircle2, AlertTriangle, Loader2, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useStudents, useHistoricalGrades, useExternalAssessments } from '@/hooks/useData';
import { QUARTERS } from '@/lib/subjects';

interface TrajectoryImportDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export const TrajectoryImportDialog = ({ open, onOpenChange }: TrajectoryImportDialogProps) => {
    const [step, setStep] = useState<'upload' | 'preview'>('upload');
    const [isProcessing, setIsProcessing] = useState(false);
    const { toast } = useToast();

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsProcessing(true);
        // Simulação de processamento (o usuário informará a planilha depois)
        setTimeout(() => {
            setIsProcessing(false);
            setStep('preview');
            toast({
                title: "Arquivo recebido",
                description: "O suporte para este formato de planilha será implementado em breve conforme suas instruções.",
            });
        }, 1500);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Importação em Lote - Trajetória</DialogTitle>
                    <DialogDescription>
                        Importe dados históricos e avaliações externas via planilha Excel.
                    </DialogDescription>
                </DialogHeader>

                {step === 'upload' ? (
                    <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-xl space-y-4 bg-muted/30">
                        {isProcessing ? (
                            <Loader2 className="h-12 w-12 animate-spin text-primary" />
                        ) : (
                            <Upload className="h-12 w-12 text-muted-foreground opacity-50" />
                        )}
                        <div className="text-center">
                            <h3 className="font-medium">Arraste sua planilha aqui</h3>
                            <p className="text-xs text-muted-foreground">ou clique para selecionar o arquivo</p>
                        </div>
                        <Input
                            type="file"
                            className="hidden"
                            id="trajectory-upload"
                            accept=".xls,.xlsx"
                            onChange={handleFileChange}
                            disabled={isProcessing}
                        />
                        <Button asChild variant="secondary" disabled={isProcessing}>
                            <label htmlFor="trajectory-upload" className="cursor-pointer">
                                Selecionar Arquivo
                            </label>
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <Alert className="bg-amber-50 border-amber-200">
                            <AlertTriangle className="h-4 w-4 text-amber-600" />
                            <AlertTitle>Modo de Demonstração</AlertTitle>
                            <AlertDescription>
                                A lógica de extração para a planilha específica que você informará será integrada aqui.
                            </AlertDescription>
                        </Alert>
                        <Button className="w-full" onClick={() => onOpenChange(false)}>Fechar</Button>
                    </div>
                )}

                <DialogFooter className="flex justify-between items-center sm:justify-between">
                    <Button variant="ghost" size="sm" className="text-xs">
                        <Download className="h-3 w-3 mr-1" /> Baixar Modelo
                    </Button>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
