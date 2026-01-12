/**
 * Barra de Filtros do Analytics
 */

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Filter, X, GitCompare } from 'lucide-react';
import { Class } from '@/types';
import { AnalyticsFilters as FiltersType } from '@/hooks/useSchoolAnalytics';
import { QUARTERS } from '@/lib/subjects';

interface AnalyticsFiltersProps {
  classes: Class[];
  filters: FiltersType;
  onFilterChange: (filters: Partial<FiltersType>) => void;
  onCompare: (classIds: string[]) => void;
}

const SERIES_OPTIONS = ['1º', '2º', '3º'];
const SCHOOL_YEAR_OPTIONS: Array<{ value: FiltersType['schoolYear']; label: string }> = [
  { value: 'all', label: 'Todos os anos' },
  { value: 1, label: '1º ano' },
  { value: 2, label: '2º ano' },
  { value: 3, label: '3º ano' },
];

export function AnalyticsFilters({
  classes,
  filters,
  onFilterChange,
  onCompare
}: AnalyticsFiltersProps) {
  const [selectedForComparison, setSelectedForComparison] = useState<string[]>([]);

  const activeClasses = filters.includeArchived
    ? classes
    : classes.filter(c => !c.archived);

  const calendarYears = useMemo(() => {
    if (filters.schoolYear === 'all') return [];
    const schoolYearValue = filters.schoolYear as 1 | 2 | 3;
    const years = new Set<number>();
    activeClasses.forEach((cls) => {
      const startYear =
        cls.startCalendarYear ||
        (cls.startYearDate ? new Date(`${cls.startYearDate}T00:00:00`).getFullYear() : undefined);
      if (!startYear) return;
      years.add(startYear + (schoolYearValue - 1));
    });
    return Array.from(years).sort((a, b) => a - b);
  }, [activeClasses, filters.schoolYear]);

  const handleSeriesToggle = (series: string) => {
    const newSeries = filters.series.includes(series)
      ? filters.series.filter(s => s !== series)
      : [...filters.series, series];
    onFilterChange({ series: newSeries });
  };

  const handleClassToggle = (classId: string) => {
    const newClassIds = filters.classIds.includes(classId)
      ? filters.classIds.filter(id => id !== classId)
      : [...filters.classIds, classId];
    onFilterChange({ classIds: newClassIds });
  };

  const handleComparisonToggle = (classId: string) => {
    setSelectedForComparison(prev => {
      if (prev.includes(classId)) {
        return prev.filter(id => id !== classId);
      }
      if (prev.length >= 4) return prev;
      return [...prev, classId];
    });
  };

  const handleStartComparison = () => {
    if (selectedForComparison.length >= 2) {
      onCompare(selectedForComparison);
    }
  };

  const clearFilters = () => {
    onFilterChange({
      series: [],
      classIds: [],
      quarter: 'all',
      schoolYear: 'all',
      calendarYear: 'all',
      includeArchived: false,
    });
  };

  const hasActiveFilters = filters.series.length > 0 ||
    filters.classIds.length > 0 ||
    filters.quarter !== 'all' ||
    filters.schoolYear !== 'all' ||
    filters.calendarYear !== 'all' ||
    filters.includeArchived;

  // Ano atual para presets
  const currentYear = new Date().getFullYear();
  const lastYear = currentYear - 1;

  // Verificar qual preset está ativo
  const isCurrentYearActive = filters.calendarYear === currentYear && filters.schoolYear === 'all';
  const isLastYearActive = filters.calendarYear === lastYear && filters.schoolYear === 'all';
  const isHistoryActive = filters.calendarYear === 'all' && filters.schoolYear === 'all';

  // Handlers para presets
  const handlePresetCurrentYear = () => {
    onFilterChange({ calendarYear: currentYear, schoolYear: 'all' });
  };

  const handlePresetLastYear = () => {
    onFilterChange({ calendarYear: lastYear, schoolYear: 'all' });
  };

  const handlePresetHistory = () => {
    onFilterChange({ calendarYear: 'all', schoolYear: 'all' });
  };

  return (
    <div className="space-y-3">
      {/* Indicador de Período + Presets */}
      <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg border">
        <span className="text-sm font-medium text-muted-foreground">📅 Período:</span>
        <div className="flex gap-2">
          <Button
            variant={isCurrentYearActive ? 'default' : 'outline'}
            size="sm"
            onClick={handlePresetCurrentYear}
            className={isCurrentYearActive ? '' : 'text-muted-foreground'}
          >
            {currentYear}
          </Button>
          <Button
            variant={isLastYearActive ? 'default' : 'outline'}
            size="sm"
            onClick={handlePresetLastYear}
            className={isLastYearActive ? '' : 'text-muted-foreground'}
          >
            {lastYear}
          </Button>
          <Button
            variant={isHistoryActive ? 'secondary' : 'outline'}
            size="sm"
            onClick={handlePresetHistory}
            className={isHistoryActive ? 'border-amber-500/50 bg-amber-500/10 text-amber-700' : 'text-muted-foreground'}
          >
            Histórico completo
          </Button>
        </div>
        {isHistoryActive && (
          <Badge variant="outline" className="text-xs border-amber-500/50 text-amber-600">
            ⚠️ Exibindo todos os anos
          </Badge>
        )}
      </div>

      {/* Filtros detalhados */}
      <div className="flex flex-wrap gap-3 items-center p-4 bg-card rounded-lg border">
        {/* Filtro por Série */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Filter className="h-4 w-4" />
              Série
              {filters.series.length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {filters.series.length}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-48" align="start">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Filtrar por série</Label>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="series-all"
                  checked={filters.series.length === 0}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      onFilterChange({ series: [] });
                    }
                  }}
                />
                <Label htmlFor="series-all" className="text-sm cursor-pointer">
                  Todas as séries
                </Label>
              </div>
              {SERIES_OPTIONS.map(series => (
                <div key={series} className="flex items-center space-x-2">
                  <Checkbox
                    id={`series-${series}`}
                    checked={filters.series.includes(series)}
                    onCheckedChange={() => handleSeriesToggle(series)}
                  />
                  <Label htmlFor={`series-${series}`} className="text-sm cursor-pointer">
                    {series} Ano
                  </Label>
                </div>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Filtro por Turma */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Filter className="h-4 w-4" />
              Turmas
              {filters.classIds.length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {filters.classIds.length}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64" align="start">
            <div className="space-y-2 max-h-64 overflow-y-auto">
              <Label className="text-sm font-medium">Filtrar por turma</Label>
              {activeClasses.map(cls => (
                <div key={cls.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`class-${cls.id}`}
                    checked={filters.classIds.includes(cls.id)}
                    onCheckedChange={() => handleClassToggle(cls.id)}
                  />
                  <Label htmlFor={`class-${cls.id}`} className="text-sm cursor-pointer">
                    {cls.name}
                  </Label>
                </div>
              ))}
              {activeClasses.length === 0 && (
                <p className="text-sm text-muted-foreground">Nenhuma turma ativa</p>
              )}
            </div>
          </PopoverContent>
        </Popover>

        {/* Filtro por Período */}
        <Select
          value={filters.quarter}
          onValueChange={(value) => onFilterChange({ quarter: value })}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Período" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Anual</SelectItem>
            {QUARTERS.map(q => (
              <SelectItem key={q} value={q}>{q}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Filtro por Ano */}
        <Select
          value={String(filters.schoolYear)}
          onValueChange={(value) => {
            if (value === 'all') {
              onFilterChange({ schoolYear: 'all', calendarYear: 'all' });
              return;
            }
            onFilterChange({ schoolYear: Number(value) as FiltersType['schoolYear'] });
          }}
        >
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Ano" />
          </SelectTrigger>
          <SelectContent>
            {SCHOOL_YEAR_OPTIONS.map(option => (
              <SelectItem key={String(option.value)} value={String(option.value)}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Filtro por Ano Calendário */}
        <Select
          value={filters.calendarYear === 'all' ? 'all' : String(filters.calendarYear)}
          disabled={filters.schoolYear === 'all' || calendarYears.length === 0}
          onValueChange={(value) =>
            onFilterChange({
              calendarYear: value === 'all' ? 'all' : Number(value),
            })
          }
        >
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Ano" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {calendarYears.map((year) => (
              <SelectItem key={year} value={String(year)}>
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Incluir Arquivadas */}
        <div className="flex items-center gap-2">
          <Switch
            checked={filters.includeArchived}
            onCheckedChange={(checked) => onFilterChange({ includeArchived: checked })}
          />
          <span className="text-sm text-muted-foreground">Arquivadas</span>
        </div>

        {/* Comparação de Turmas */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <GitCompare className="h-4 w-4" />
              Comparar
              {selectedForComparison.length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {selectedForComparison.length}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72" align="start">
            <div className="space-y-3">
              <div>
                <Label className="text-sm font-medium">Selecione 2-4 turmas para comparar</Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Análise lado a lado de desempenho
                </p>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {activeClasses.map(cls => (
                  <div key={cls.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`compare-${cls.id}`}
                      checked={selectedForComparison.includes(cls.id)}
                      onCheckedChange={() => handleComparisonToggle(cls.id)}
                      disabled={!selectedForComparison.includes(cls.id) && selectedForComparison.length >= 4}
                    />
                    <Label htmlFor={`compare-${cls.id}`} className="text-sm cursor-pointer">
                      {cls.name}
                    </Label>
                  </div>
                ))}
              </div>
              <Button
                size="sm"
                className="w-full"
                disabled={selectedForComparison.length < 2}
                onClick={handleStartComparison}
              >
                Comparar Turmas
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        {/* Limpar Filtros */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="gap-1 text-muted-foreground"
          >
            <X className="h-4 w-4" />
            Limpar
          </Button>
        )}

        {/* Active Filters Display */}
        <div className="flex-1" />

        {hasActiveFilters && (
          <div className="flex flex-wrap gap-1">
            {filters.series.map(s => (
              <Badge key={s} variant="secondary" className="text-xs">
                {s} Ano
              </Badge>
            ))}
            {filters.classIds.map(id => {
              const cls = classes.find(c => c.id === id);
              return cls ? (
                <Badge key={id} variant="secondary" className="text-xs">
                  {cls.name}
                </Badge>
              ) : null;
            })}
            {filters.quarter !== 'all' && (
              <Badge variant="secondary" className="text-xs">
                {filters.quarter}
              </Badge>
            )}
            <Badge variant="secondary" className="text-xs">
              {filters.schoolYear === 'all' ? 'Todos os anos' : `${filters.schoolYear}º ano`}
            </Badge>
            {filters.calendarYear !== 'all' && (
              <Badge variant="secondary" className="text-xs">
                {filters.calendarYear}
              </Badge>
            )}
            {filters.includeArchived && (
              <Badge variant="secondary" className="text-xs">
                Arquivadas
              </Badge>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
