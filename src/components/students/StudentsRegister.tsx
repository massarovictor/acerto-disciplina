import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useStudents, useClasses } from '@/hooks/useLocalStorage';
import { useToast } from '@/hooks/use-toast';
import { ChevronDown, Upload, Download, UserPlus, Camera, X } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

export const StudentsRegister = () => {
  const { students, addStudent } = useStudents();
  const { classes } = useClasses();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    name: '',
    classId: '',
    birthDate: '',
    gender: '',
    enrollment: '',
    censusId: '',
    cpf: '',
    rg: '',
    photoUrl: '',
  });

  const [photoPreview, setPhotoPreview] = useState<string>('');
  const [isOfficialDataOpen, setIsOfficialDataOpen] = useState(false);

  const todayRegistered = students.filter(s => {
    const today = new Date().toDateString();
    const studentDate = new Date(s.id).toDateString();
    return today === studentDate;
  }).length;

  const handleSubmit = (e: React.FormEvent) => {
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
    const duplicate = students.find(s => 
      s.cpf && formData.cpf && s.cpf === formData.cpf
    );
    if (duplicate) {
      toast({
        title: 'Erro',
        description: 'Já existe um aluno cadastrado com este CPF.',
        variant: 'destructive',
      });
      return;
    }

    addStudent({
      name: formData.name,
      classId: formData.classId,
      birthDate: formData.birthDate,
      gender: formData.gender,
      enrollment: formData.enrollment,
      censusId: formData.censusId,
      cpf: formData.cpf,
      rg: formData.rg,
      photoUrl: formData.photoUrl,
      status: 'active',
    });

    toast({
      title: 'Sucesso',
      description: 'Aluno cadastrado com sucesso.',
    });

    // Reset form
    setFormData({
      name: '',
      classId: '',
      birthDate: '',
      gender: '',
      enrollment: '',
      censusId: '',
      cpf: '',
      rg: '',
      photoUrl: '',
    });
    setPhotoPreview('');
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
                    {classes.filter(c => c.active).map(cls => (
                      <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
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
                          onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="rg">RG</Label>
                        <Input
                          id="rg"
                          placeholder="00.000.000-0"
                          value={formData.rg}
                          onChange={(e) => setFormData({ ...formData, rg: e.target.value })}
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
                  setFormData({
                    name: '',
                    classId: '',
                    birthDate: '',
                    gender: '',
                    enrollment: '',
                    censusId: '',
                    cpf: '',
                    rg: '',
                    photoUrl: '',
                  });
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
          <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
            <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-medium mb-2">Arraste uma planilha ou clique para selecionar</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Formatos aceitos: Excel (.xlsx, .xls) ou CSV
            </p>
            <Button variant="outline">
              Selecionar Arquivo
            </Button>
          </div>

          <div className="flex items-center justify-center">
            <Button variant="ghost" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Baixar Modelo de Planilha
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
