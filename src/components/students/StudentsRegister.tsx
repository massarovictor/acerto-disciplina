import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useStudents, useClasses } from '@/hooks/useData';
import { useToast } from '@/hooks/use-toast';
import { useFormStore } from '@/stores/useFormStore';
import { ChevronDown, Upload, Download, UserPlus, Camera, X, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { generateStudentTemplate } from '@/lib/excelExport';
import { readExcelFile, validateImportData, ImportRow } from '@/lib/excelImport';

export const StudentsRegister = () => {
  const { students, addStudent } = useStudents();
  const { classes } = useClasses();
  const { toast } = useToast();

  // ✅ Usando Zustand store para persistir formulário entre navegações
  const { studentForm: formData, setStudentForm, resetStudentForm } = useFormStore();

  // Helper para atualizar campos do formulário
  const setFormData = (updates: Partial<typeof formData>) => setStudentForm(updates);

  const [photoPreview, setPhotoPreview] = useState<string>('');
  const [isOfficialDataOpen, setIsOfficialDataOpen] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [importPreview, setImportPreview] = useState<ImportRow[]>([]);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [selectedClassForImport, setSelectedClassForImport] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const todayRegistered = students.filter((s) => {
    if (!s.createdAt) return false;
    const today = new Date().toDateString();
    const studentDate = new Date(s.createdAt).toDateString();
    return today === studentDate;
  }).length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.classId || !formData.birthDate || !formData.gender) {
      toast({
        title: 'Erro',
        description: 'Preencha todos os campos obrigatórios.',
        variant: 'destructive',
      });
      return;
    }

    // Validate age by series
    const selectedClass = classes.find(c => c.id === formData.classId);
    if (!selectedClass || !selectedClass.active || selectedClass.archived) {
      toast({
        title: 'Turma bloqueada',
        description: 'A turma selecionada está inativa ou arquivada.',
        variant: 'destructive',
      });
      return;
    }

    if (selectedClass) {
      const birthDate = new Date(formData.birthDate);
      const age = new Date().getFullYear() - birthDate.getFullYear();
      const series = selectedClass.series;

      let minAge = 14, maxAge = 18;
      if (series === '2º') { minAge = 15; maxAge = 19; }
      if (series === '3º') { minAge = 16; maxAge = 20; }

      if (age < minAge || age > maxAge) {
        const confirmed = window.confirm(
          `A idade do aluno (${age} anos) está fora da faixa esperada para ${series} ano (${minAge}-${maxAge} anos). Deseja continuar?`
        );
        if (!confirmed) return;
      }
    }

    // Check for duplicates
    const cleanedCPF = formData.cpf ? formData.cpf.replace(/\D/g, '') : '';
    const duplicate = cleanedCPF ? students.find(s =>
      s.cpf && s.cpf.replace(/\D/g, '') === cleanedCPF
    ) : null;
    if (duplicate) {
      toast({
        title: 'Erro',
        description: 'Já existe um aluno cadastrado com este CPF.',
        variant: 'destructive',
      });
      return;
    }

    try {
      await addStudent({
        name: formData.name,
        classId: formData.classId,
        birthDate: formData.birthDate,
        gender: formData.gender,
        enrollment: formData.enrollment,
        censusId: formData.censusId,
        cpf: cleanedCPF || undefined,
        rg: formData.rg,
        photoUrl: formData.photoUrl,
        status: 'active',
      });

      toast({
        title: 'Sucesso',
        description: 'Aluno cadastrado com sucesso.',
      });

      resetStudentForm();
      setPhotoPreview('');
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível cadastrar o aluno.',
        variant: 'destructive',
      });
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        toast({
          title: 'Erro',
          description: 'A imagem deve ter no máximo 2MB.',
          variant: 'destructive',
        });
        return;
      }

      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: 'Erro',
          description: 'Por favor, selecione uma imagem válida.',
          variant: 'destructive',
        });
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setFormData({ ...formData, photoUrl: base64String });
        setPhotoPreview(base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  const removePhoto = () => {
    setFormData({ ...formData, photoUrl: '' });
    setPhotoPreview('');
  };

  // Máscaras de input
  const formatCPF = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 11) {
      return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }
    return value;
  };

  const formatRG = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 9) {
      return numbers.replace(/(\d{2})(\d{3})(\d{3})(\d{1})/, '$1.$2.$3-$4');
    }
    return value;
  };

  // Handlers de importação
  const handleFileSelect = async (file: File) => {
    if (!file.name.match(/\.(xlsx|xls|csv)$/i)) {
      toast({
        title: 'Erro',
        description: 'Por favor, selecione um arquivo Excel (.xlsx, .xls) ou CSV.',
        variant: 'destructive',
      });
      return;
    }

    // Validar se turma foi selecionada
    if (!selectedClassForImport) {
      toast({
        title: 'Atenção',
        description: 'Por favor, selecione uma turma antes de importar a planilha.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsImporting(true);
      const data = await readExcelFile(file);
      const result = validateImportData(data, classes, students, selectedClassForImport);
      setImportPreview(result.rows);
      setShowImportDialog(true);
    } catch (error) {
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Erro ao processar o arquivo.',
        variant: 'destructive',
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleImportConfirm = async () => {
    const validRows = importPreview.filter(r => r.isValid);

    if (validRows.length === 0) {
      toast({
        title: 'Erro',
        description: 'Nenhuma linha válida para importar.',
        variant: 'destructive',
      });
      return;
    }

    let imported = 0;
    let errors = 0;
    const errorMessages: string[] = [];

    // Processar alunos sequencialmente para evitar problemas de concorrência
    // Processar alunos sequencialmente para evitar problemas de concorrência

    for (let index = 0; index < validRows.length; index++) {
      const row = validRows[index];


      try {
        // Usar o classId que foi validado pela planilha (baseado no nome da turma)
        if (!row.data.classId || row.data.classId === '') {
          const errorMsg = `Linha ${row.rowNumber}: ❌ classId VAZIO ou inválido`;
          console.error(errorMsg, row);
          errorMessages.push(errorMsg);
          errors++;
          continue;
        }



        // Verificar se a turma existe
        const classExists = classes.find(c => c.id === row.data.classId);
        if (!classExists) {
          const errorMsg = `Linha ${row.rowNumber}: ❌ Turma com ID "${row.data.classId}" não encontrada no sistema`;
          console.error(errorMsg, row);
          console.error(`[IMPORTAÇÃO] Turmas disponíveis:`, classes.map(c => ({ id: c.id, name: c.name })));
          errorMessages.push(errorMsg);
          errors++;
          continue;
        }
        if (!classExists.active || classExists.archived) {
          const errorMsg = `Linha ${row.rowNumber}: ❌ Turma "${classExists.name}" está inativa ou arquivada`;
          console.error(errorMsg, row);
          errorMessages.push(errorMsg);
          errors++;
          continue;
        }



        // Verificar campos obrigatórios
        if (!row.data.name || !row.data.birthDate || !row.data.gender) {
          const errorMsg = `Linha ${row.rowNumber}: ❌ Campos obrigatórios faltando`;
          console.error(errorMsg, row);
          errorMessages.push(errorMsg);
          errors++;
          continue;
        }



        await addStudent({
          name: row.data.name || '',
          classId: row.data.classId, // Usar classId validado da planilha
          birthDate: row.data.birthDate || '',
          gender: row.data.gender || 'M',
          enrollment: row.data.enrollment,
          censusId: row.data.censusId,
          cpf: row.data.cpf,
          rg: row.data.rg,
          photoUrl: row.data.photoUrl,
          status: 'active',
        });
        imported++;

        // Pequeno delay para garantir IDs únicos e atualização do estado
        await new Promise(resolve => setTimeout(resolve, 10));
      } catch (error) {
        const errorMsg = `Linha ${row.rowNumber}: ${error instanceof Error ? error.message : 'Erro desconhecido'}`;
        console.error(`[IMPORTAÇÃO] ❌ Erro ao importar aluno linha ${row.rowNumber}`);
        errorMessages.push(errorMsg);
        errors++;
      }
    }

    const description = imported > 0
      ? `${imported} aluno(s) importado(s) com sucesso.${errors > 0 ? ` ${errors} erro(s): ${errorMessages.slice(0, 3).join('; ')}${errorMessages.length > 3 ? '...' : ''}` : ''}`
      : `Nenhum aluno foi importado. Erros: ${errorMessages.slice(0, 5).join('; ')}`;

    toast({
      title: imported > 0 ? 'Importação concluída' : 'Erro na importação',
      description,
      variant: imported > 0 ? 'default' : 'destructive',
    });

    setShowImportDialog(false);
    setImportPreview([]);
    setSelectedClassForImport('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    // Forçar atualização da lista de alunos
    // Forçar atualização da lista de alunos
  };

  return (
    <div className="space-y-6">
      {/* Individual Registration */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Cadastro Individual</CardTitle>
            <div className="text-sm text-muted-foreground">
              {todayRegistered} alunos cadastrados hoje
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Photo Upload Section */}
            <div className="flex justify-center">
              <div className="relative">
                <Avatar className="h-32 w-32">
                  {photoPreview ? (
                    <AvatarImage src={photoPreview} alt="Preview" />
                  ) : (
                    <AvatarFallback className="bg-muted">
                      <Camera className="h-12 w-12 text-muted-foreground" />
                    </AvatarFallback>
                  )}
                </Avatar>
                {photoPreview && (
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute -top-2 -right-2 h-8 w-8 rounded-full"
                    onClick={removePhoto}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
                <Label
                  htmlFor="photo"
                  className="absolute bottom-0 right-0 cursor-pointer"
                >
                  <div className="bg-primary text-primary-foreground rounded-full p-2 shadow-lg hover:bg-primary/90 transition-colors">
                    <Camera className="h-4 w-4" />
                  </div>
                  <Input
                    id="photo"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handlePhotoChange}
                  />
                </Label>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="name">Nome Completo *</Label>
                <Input
                  id="name"
                  placeholder="Digite o nome completo do aluno"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="class">Turma *</Label>
                <Select value={formData.classId} onValueChange={(value) => setFormData({ ...formData, classId: value })}>
                  <SelectTrigger id="class">
                    <SelectValue placeholder="Selecione a turma" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.filter(c => c.active && !c.archived).map(cls => (
                      <SelectItem key={cls.id} value={cls.id}>
                        {cls.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="birthDate">Data de Nascimento *</Label>
                <Input
                  id="birthDate"
                  type="date"
                  value={formData.birthDate}
                  onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="gender">Sexo *</Label>
                <Select value={formData.gender} onValueChange={(value) => setFormData({ ...formData, gender: value })}>
                  <SelectTrigger id="gender">
                    <SelectValue placeholder="Selecione o sexo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="M">Masculino</SelectItem>
                    <SelectItem value="F">Feminino</SelectItem>
                    <SelectItem value="O">Outro</SelectItem>
                    <SelectItem value="N">Prefiro não informar</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="md:col-span-2">
                <Collapsible open={isOfficialDataOpen} onOpenChange={setIsOfficialDataOpen}>
                  <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium mb-2">
                    <ChevronDown className={`h-4 w-4 transition-transform ${isOfficialDataOpen ? 'rotate-180' : ''}`} />
                    Dados Oficiais (Opcional)
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-4">
                    <Separator className="my-4" />
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="enrollment">Matrícula SIGE</Label>
                        <Input
                          id="enrollment"
                          placeholder="Ex: 2024001"
                          value={formData.enrollment}
                          onChange={(e) => setFormData({ ...formData, enrollment: e.target.value })}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="censusId">ID Censo</Label>
                        <Input
                          id="censusId"
                          placeholder="Ex: 123456"
                          value={formData.censusId}
                          onChange={(e) => setFormData({ ...formData, censusId: e.target.value })}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="cpf">CPF</Label>
                        <Input
                          id="cpf"
                          placeholder="000.000.000-00"
                          value={formData.cpf}
                          onChange={(e) => {
                            const formatted = formatCPF(e.target.value);
                            setFormData({ ...formData, cpf: formatted });
                          }}
                          maxLength={14}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="rg">RG</Label>
                        <Input
                          id="rg"
                          placeholder="00.000.000-0"
                          value={formData.rg}
                          onChange={(e) => {
                            const formatted = formatRG(e.target.value);
                            setFormData({ ...formData, rg: formatted });
                          }}
                          maxLength={12}
                        />
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            </div>

            <div className="flex gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  resetStudentForm();
                  setPhotoPreview('');
                }}
              >
                Limpar Formulário
              </Button>
              <Button type="submit">
                <UserPlus className="h-4 w-4 mr-2" />
                Cadastrar Aluno
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Bulk Import */}
      <Card>
        <CardHeader>
          <CardTitle>Importação em Lote</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Seletor de Turma */}
          <div className="space-y-2">
            <Label htmlFor="import-class">Selecione a Turma *</Label>
            <Select
              value={selectedClassForImport}
              onValueChange={setSelectedClassForImport}
            >
              <SelectTrigger id="import-class">
                <SelectValue placeholder="Selecione a turma para importação" />
              </SelectTrigger>
              <SelectContent>
                {classes.filter(c => c.active && !c.archived).map(cls => (
                  <SelectItem key={cls.id} value={cls.id}>
                    {cls.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              O nome da turma selecionada será pré-preenchido no modelo de planilha e usado para todos os alunos importados.
            </p>
          </div>

          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${isDragOver
              ? 'border-primary bg-primary/5'
              : 'border-border'
              } ${!selectedClassForImport ? 'opacity-50 pointer-events-none' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-medium mb-2">Arraste uma planilha ou clique para selecionar</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Formatos aceitos: Excel (.xlsx, .xls) ou CSV
            </p>
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isImporting || !selectedClassForImport}
            >
              {isImporting ? 'Processando...' : 'Selecionar Arquivo'}
            </Button>
            <Input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={handleFileInputChange}
            />
          </div>

          <div className="flex items-center justify-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const selectedClass = classes.find(c => c.id === selectedClassForImport);
                generateStudentTemplate(selectedClass);
              }}
              disabled={!selectedClassForImport}
            >
              <Download className="h-4 w-4 mr-2" />
              Baixar Modelo de Planilha
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Import Preview Dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Preview da Importação</DialogTitle>
            <DialogDescription>
              Revise os dados antes de importar. Apenas linhas válidas serão importadas.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Estatísticas */}
            <div className="grid grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-4">
                  <div className="text-2xl font-bold">{importPreview.length}</div>
                  <div className="text-sm text-muted-foreground">Total de Linhas</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="text-2xl font-bold text-green-600">
                    {importPreview.filter(r => r.isValid).length}
                  </div>
                  <div className="text-sm text-muted-foreground">Válidas</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="text-2xl font-bold text-red-600">
                    {importPreview.filter(r => !r.isValid).length}
                  </div>
                  <div className="text-sm text-muted-foreground">Inválidas</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="text-2xl font-bold text-yellow-600">
                    {importPreview.filter(r => r.warnings.length > 0).length}
                  </div>
                  <div className="text-sm text-muted-foreground">Com Avisos</div>
                </CardContent>
              </Card>
            </div>

            {/* Tabela de Preview */}
            <div className="border rounded-lg overflow-hidden">
              <div className="max-h-[400px] overflow-y-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-background">
                    <TableRow>
                      <TableHead className="w-16">Linha</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>Turma</TableHead>
                      <TableHead>Data Nasc.</TableHead>
                      <TableHead>Sexo</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {importPreview.map((row) => (
                      <TableRow key={row.rowNumber}>
                        <TableCell className="font-medium">{row.rowNumber}</TableCell>
                        <TableCell>{row.data.name || '-'}</TableCell>
                        <TableCell>
                          {classes.find(c => c.id === row.data.classId)?.name || '-'}
                        </TableCell>
                        <TableCell>
                          {row.data.birthDate
                            ? new Date(row.data.birthDate).toLocaleDateString('pt-BR')
                            : '-'}
                        </TableCell>
                        <TableCell>{row.data.gender || '-'}</TableCell>
                        <TableCell>
                          {row.isValid ? (
                            <Badge className="bg-green-100 text-green-800 border-green-300">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Válida
                            </Badge>
                          ) : (
                            <Badge variant="destructive">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              Inválida
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Erros e Avisos */}
            {importPreview.some(r => r.errors.length > 0 || r.warnings.length > 0) && (
              <div className="space-y-2">
                <h4 className="font-medium">Detalhes dos Erros e Avisos:</h4>
                <div className="max-h-[200px] overflow-y-auto space-y-2">
                  {importPreview.map((row) => {
                    if (row.errors.length === 0 && row.warnings.length === 0) return null;
                    return (
                      <Alert
                        key={row.rowNumber}
                        variant={row.errors.length > 0 ? 'destructive' : 'default'}
                      >
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          <strong>Linha {row.rowNumber}:</strong>{' '}
                          {row.errors.length > 0 && (
                            <span className="text-red-600">
                              {row.errors.join('; ')}
                            </span>
                          )}
                          {row.warnings.length > 0 && (
                            <span className="text-yellow-600">
                              {row.warnings.join('; ')}
                            </span>
                          )}
                        </AlertDescription>
                      </Alert>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowImportDialog(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleImportConfirm}
              disabled={importPreview.filter(r => r.isValid).length === 0}
            >
              Importar {importPreview.filter(r => r.isValid).length} Aluno(s)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
