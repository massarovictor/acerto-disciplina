import { useMemo, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search } from 'lucide-react';

interface StudentIndicator {
  label: string;
  tone?: 'default' | 'pending' | 'success';
  details?: string;
}

export interface SelectableStudentOption {
  id: string;
  name: string;
  isLegacySnapshot?: boolean;
}

interface StudentsSelectorProps {
  students: SelectableStudentOption[];
  selectedStudentIds: string[];
  onChange: (studentIds: string[]) => void;
  indicatorsByStudentId?: Record<string, StudentIndicator>;
  emptyMessage?: string;
  heightClassName?: string;
}

const TONE_CLASS: Record<NonNullable<StudentIndicator['tone']>, string> = {
  default: 'bg-muted text-muted-foreground border-border',
  pending: 'bg-warning/10 text-warning border-warning/30',
  success: 'bg-success/10 text-success border-success/30',
};

export const StudentsSelector = ({
  students,
  selectedStudentIds,
  onChange,
  indicatorsByStudentId,
  emptyMessage = 'Nenhum aluno encontrado para os filtros selecionados.',
  heightClassName = 'h-72',
}: StudentsSelectorProps) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredStudents = useMemo(() => {
    const loweredSearch = searchTerm.trim().toLowerCase();
    if (!loweredSearch) return students;

    return students.filter((student) =>
      student.name.toLowerCase().includes(loweredSearch),
    );
  }, [searchTerm, students]);

  const selectedSet = useMemo(() => new Set(selectedStudentIds), [selectedStudentIds]);
  const filteredIds = filteredStudents.map((student) => student.id);
  const areAllFilteredSelected =
    filteredIds.length > 0 && filteredIds.every((studentId) => selectedSet.has(studentId));

  const toggleStudent = (studentId: string, checked: boolean) => {
    if (checked) {
      onChange(Array.from(new Set([...selectedStudentIds, studentId])));
      return;
    }

    onChange(selectedStudentIds.filter((id) => id !== studentId));
  };

  const handleSelectFiltered = () => {
    if (filteredIds.length === 0) return;

    if (areAllFilteredSelected) {
      onChange(selectedStudentIds.filter((id) => !filteredIds.includes(id)));
      return;
    }

    onChange(Array.from(new Set([...selectedStudentIds, ...filteredIds])));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Buscar aluno..."
            className="pl-9"
          />
        </div>
        <Badge variant="secondary">{selectedStudentIds.length} selecionados</Badge>
      </div>

      <div className="flex gap-2">
        <Button type="button" size="sm" variant="outline" onClick={handleSelectFiltered}>
          {areAllFilteredSelected ? 'Desmarcar filtrados' : 'Selecionar filtrados'}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => onChange([])}>
          Limpar seleção
        </Button>
      </div>

      <ScrollArea className={`rounded-lg border p-2 ${heightClassName}`}>
        {filteredStudents.length === 0 ? (
          <div className="flex h-full items-center justify-center px-4 py-10 text-center text-sm text-muted-foreground">
            {emptyMessage}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredStudents.map((student) => {
              const checked = selectedSet.has(student.id);
              const indicator = indicatorsByStudentId?.[student.id];

              return (
                <label
                  key={student.id}
                  className="flex cursor-pointer items-start gap-3 rounded-md border px-3 py-2 hover:bg-muted/40"
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(value) =>
                      toggleStudent(student.id, value === true)
                    }
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <div className="font-medium leading-5">{student.name}</div>
                      {student.isLegacySnapshot ? (
                        <Badge variant="outline" className="text-[10px] h-5">
                          Snapshot histórico
                        </Badge>
                      ) : null}
                    </div>
                    {indicator && (
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <Badge
                          variant="outline"
                          className={TONE_CLASS[indicator.tone || 'default']}
                        >
                          {indicator.label}
                        </Badge>
                        {indicator.details && (
                          <span className="text-xs text-muted-foreground">
                            {indicator.details}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </label>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
};
