import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useClasses } from '@/hooks/useLocalStorage';
import { MOCK_USERS, MOCK_COURSES } from '@/data/mockData';
import { useToast } from '@/hooks/use-toast';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ClassesCreateProps {
  onSuccess?: () => void;
}

export const ClassesCreate = ({ onSuccess }: ClassesCreateProps) => {
  const { classes, addClass } = useClasses();
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    series: '',
    letter: '',
    course: '',
    directorId: '',
    active: true,
  });

  const directors = MOCK_USERS.filter(u => u.role === 'diretor');
  
  const getDirectorLoad = (directorId: string) => {
    return classes.filter(c => c.directorId === directorId).length;
  };

  const selectedDirectorLoad = formData.directorId ? getDirectorLoad(formData.directorId) : 0;
  const showOverloadWarning = selectedDirectorLoad >= 5;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.series || !formData.letter || !formData.course) {
      toast({
        title: 'Erro',
        description: 'Preencha todos os campos obrigatórios.',
        variant: 'destructive',
      });
      return;
    }

    // Check for duplicate
    const name = `${formData.series} ${formData.letter} - ${formData.course}`;
    const duplicate = classes.find(c => c.name === name);
    if (duplicate) {
      toast({
        title: 'Erro',
        description: 'Já existe uma turma com este nome.',
        variant: 'destructive',
      });
      return;
    }

    // Show warning if director has 5+ classes
    if (showOverloadWarning) {
      const confirmed = window.confirm(
        '⚠️ Este diretor já possui 5 turmas. Deseja realmente atribuir mais uma?'
      );
      if (!confirmed) return;
    }

    addClass({
      name,
      series: formData.series,
      course: formData.course,
      directorId: formData.directorId || undefined,
      active: formData.active,
    });

    toast({
      title: 'Sucesso',
      description: 'Turma criada com sucesso.',
    });

    // Reset form
    setFormData({
      series: '',
      letter: '',
      course: '',
      directorId: '',
      active: true,
    });

    onSuccess?.();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Criar Nova Turma</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="series">Série *</Label>
              <Select value={formData.series} onValueChange={(value) => setFormData({ ...formData, series: value })}>
                <SelectTrigger id="series">
                  <SelectValue placeholder="Selecione a série" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1º">1º ano</SelectItem>
                  <SelectItem value="2º">2º ano</SelectItem>
                  <SelectItem value="3º">3º ano</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="letter">Letra *</Label>
              <Input
                id="letter"
                placeholder="Ex: A, B, C"
                value={formData.letter}
                onChange={(e) => setFormData({ ...formData, letter: e.target.value.toUpperCase() })}
                maxLength={1}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="course">Curso Técnico *</Label>
              <Select value={formData.course} onValueChange={(value) => setFormData({ ...formData, course: value })}>
                <SelectTrigger id="course">
                  <SelectValue placeholder="Selecione o curso" />
                </SelectTrigger>
                <SelectContent>
                  {MOCK_COURSES.map(course => (
                    <SelectItem key={course} value={course}>{course}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="director">Diretor</Label>
              <Select value={formData.directorId || undefined} onValueChange={(value) => setFormData({ ...formData, directorId: value })}>
                <SelectTrigger id="director">
                  <SelectValue placeholder="Selecione um diretor (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  {directors.map(director => {
                    const load = getDirectorLoad(director.id);
                    return (
                      <SelectItem key={director.id} value={director.id}>
                        {director.name} - {load} turmas {load >= 5 && '⚠️'}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              {formData.directorId && (
                <p className="text-sm text-muted-foreground">
                  Carga atual: {selectedDirectorLoad} turmas
                </p>
              )}
              {showOverloadWarning && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Este diretor já possui {selectedDirectorLoad} turmas. Considere distribuir a carga.
                  </AlertDescription>
                </Alert>
              )}
            </div>

            <div className="flex items-center space-x-2 md:col-span-2">
              <Switch
                id="active"
                checked={formData.active}
                onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
              />
              <Label htmlFor="active">Turma ativa</Label>
            </div>
          </div>

          <div className="flex gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setFormData({
                series: '',
                letter: '',
                course: '',
                directorId: '',
                active: true,
              })}
            >
              Limpar
            </Button>
            <Button type="submit">Criar Turma</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
