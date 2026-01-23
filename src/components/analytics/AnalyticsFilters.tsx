/**
 * Barra de Filtros do Analytics
 */

import { useEffect, useMemo, useState } from 'react';
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
import { Input } from '@/components/ui/input';
import { Filter, X, GitCompare } from 'lucide-react';
import { Class } from '@/types';
import { AnalyticsFilters as FiltersType } from '@/hooks/useSchoolAnalytics';
import { QUARTERS } from '@/lib/subjects';

type AutoIndicatorKey =
  | 'classIds'
  | 'subjects'
  | 'schoolYear'
  | 'calendarYear'
  | 'quarter'
  | 'useQuarterRange'
  | 'comparisonClassIds';
type AutoIndicators = Partial<Record<AutoIndicatorKey, boolean>>;

interface AnalyticsFiltersProps {
  classes: Class[];
  subjects: string[];
  filters: FiltersType;
  onFilterChange: (filters: Partial<FiltersType>) => void;
  onCompare: (classIds: string[]) => void;
  autoIndicators?: AutoIndicators;
  eligibleClassIds?: string[];
}

const SERIES_OPTIONS = ['1º', '2º', '3º'];
const SCHOOL_YEAR_OPTIONS: Array<{ value: FiltersType['schoolYear']; label: string }> = [
  { value: 'all', label: 'Todos os anos' },
  { value: 1, label: '1º ano' },
  { value: 2, label: '2º ano' },
  { value: 3, label: '3º ano' },
];
const DEFAULT_RANGE_START = QUARTERS[0];
const DEFAULT_RANGE_END = QUARTERS[QUARTERS.length - 1];

export function AnalyticsFilters({
  classes,
  subjects,
  filters,
  onFilterChange,
  onCompare,
  autoIndicators = {},
  eligibleClassIds = [],
}: AnalyticsFiltersProps) {
  const [selectedForComparison, setSelectedForComparison] = useState<string[]>([]);
  const [classSearch, setClassSearch] = useState('');
  const [subjectSearch, setSubjectSearch] = useState('');
  const [comparisonSearch, setComparisonSearch] = useState('');
  const selectedSubjects = filters.subjects ?? [];

  const AutoBadge = ({ active }: { active?: boolean }) => {
    if (!active) return null;
    return (
      <Badge
        variant="outline"
        className="ml-1 border-amber-500/50 bg-amber-500/10 text-[10px] text-amber-700"
      >
        Auto
      </Badge>
    );
  };

  const activeClasses = filters.includeArchived
    ? classes
    : classes.filter(c => !c.archived);

  const normalizeSearch = (value: string) =>
    value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();

  const parseSeriesYear = (value: string) => {
    const match = value.match(/\d+/);
    if (!match) return null;
    const parsed = Number(match[0]);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const getStartCalendarYear = (cls: Class) => {
    const currentCalendarYear = new Date().getFullYear();
    return (
      cls.startCalendarYear ||
      (cls.startYearDate ? new Date(`${cls.startYearDate}T00:00:00`).getFullYear() : undefined) ||
      (cls.currentYear && [1, 2, 3].includes(cls.currentYear)
        ? currentCalendarYear - (cls.currentYear - 1)
        : undefined)
    );
  };

  const getCourseYearForCalendarYear = (cls: Class, targetYear: number) => {
    const startYear = getStartCalendarYear(cls);
    if (!startYear) return null;
    const courseYear = targetYear - startYear + 1;
    if (courseYear < 1 || courseYear > 3) return null;
    return courseYear;
  };

  const subjectOptions = useMemo(() => {
    return [...subjects].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [subjects]);

  const eligibleClassSet = useMemo(() => {
    if (eligibleClassIds.length === 0) return null;
    return new Set(eligibleClassIds);
  }, [eligibleClassIds]);

  const seriesFilteredClasses = useMemo(() => {
    const seriesYears = filters.series
      .map(parseSeriesYear)
      .filter((year): year is number => Boolean(year));
    const hasDerivedSeries =
      seriesYears.length > 0 && (filters.calendarYear !== 'all' || filters.schoolYear !== 'all');

    const matchesSeries = (cls: Class) => {
      if (filters.series.length === 0) return true;
      if (hasDerivedSeries) {
        const targetCalendarYear =
          filters.calendarYear !== 'all'
            ? (filters.calendarYear as number)
            : (() => {
                const startYear = getStartCalendarYear(cls);
                if (!startYear) return null;
                if (filters.schoolYear === 'all') return null;
                return startYear + (Number(filters.schoolYear) - 1);
              })();
        if (targetCalendarYear) {
          const courseYear = getCourseYearForCalendarYear(cls, targetCalendarYear);
          if (courseYear) {
            return seriesYears.includes(courseYear);
          }
        }
      }
      return filters.series.some((series) => cls.series.includes(series));
    };

    let scoped = activeClasses.filter(matchesSeries);
    if (eligibleClassSet) {
      scoped = scoped.filter((cls) => eligibleClassSet.has(cls.id));
    }
    return scoped;
  }, [activeClasses, filters.series, filters.calendarYear, filters.schoolYear, eligibleClassSet]);

  const filteredClassOptions = useMemo(() => {
    const query = normalizeSearch(classSearch);
    if (!query) return seriesFilteredClasses;
    return seriesFilteredClasses.filter((cls) =>
      normalizeSearch(cls.name).includes(query),
    );
  }, [seriesFilteredClasses, classSearch]);

  const filteredSubjectOptions = useMemo(() => {
    const query = normalizeSearch(subjectSearch);
    if (!query) return subjectOptions;
    return subjectOptions.filter((subject) => normalizeSearch(subject).includes(query));
  }, [subjectOptions, subjectSearch]);

  const filteredComparisonOptions = useMemo(() => {
    const query = normalizeSearch(comparisonSearch);
    if (!query) return seriesFilteredClasses;
    return seriesFilteredClasses.filter((cls) =>
      normalizeSearch(cls.name).includes(query),
    );
  }, [seriesFilteredClasses, comparisonSearch]);

  const calendarYears = useMemo(() => {
    if (filters.schoolYear === 'all') return [];
    const schoolYearValue = Number(filters.schoolYear);
    if (!Number.isFinite(schoolYearValue) || schoolYearValue > 3) return [];
    const years = new Set<number>();
    const currentCalendarYear = new Date().getFullYear();
    const scopeClasses =
      filters.classIds.length > 0
        ? seriesFilteredClasses.filter((cls) => filters.classIds.includes(cls.id))
        : seriesFilteredClasses;
    scopeClasses.forEach((cls) => {
      const startYear =
        cls.startCalendarYear ||
        (cls.startYearDate ? new Date(`${cls.startYearDate}T00:00:00`).getFullYear() : undefined) ||
        (cls.currentYear && [1, 2, 3].includes(cls.currentYear)
          ? currentCalendarYear - (cls.currentYear - 1)
          : undefined);
      if (!startYear) return;
      years.add(startYear + (schoolYearValue - 1));
    });
    return Array.from(years).sort((a, b) => a - b);
  }, [filters.classIds, filters.schoolYear, seriesFilteredClasses]);

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

  const handleSubjectToggle = (subject: string) => {
    const newSubjects = selectedSubjects.includes(subject)
      ? selectedSubjects.filter((item) => item !== subject)
      : [...selectedSubjects, subject];
    onFilterChange({ subjects: newSubjects });
  };

  const handleComparisonToggle = (classId: string) => {
    setSelectedForComparison(prev => {
      if (prev.includes(classId)) {
        return prev.filter(id => id !== classId);
      }
      return [...prev, classId];
    });
  };

  const handleStartComparison = () => {
    if (selectedForComparison.length >= 2) {
      onCompare(selectedForComparison);
    }
  };

  useEffect(() => {
    setSelectedForComparison(filters.comparisonClassIds ?? []);
  }, [filters.comparisonClassIds]);

  const clearFilters = () => {
    onFilterChange({
      series: [],
      classIds: [],
      subjects: [],
      quarter: 'all',
      useQuarterRange: false,
      quarterRangeStart: DEFAULT_RANGE_START,
      quarterRangeEnd: DEFAULT_RANGE_END,
      schoolYear: 'all',
      calendarYear: 'all',
      includeArchived: false,
      comparisonClassIds: [],
      comparisonMode: 'calendar',
      comparisonCourseYear: 1,
    });
    setSelectedForComparison([]);
  };

  const hasActiveFilters = filters.series.length > 0 ||
    filters.classIds.length > 0 ||
    selectedSubjects.length > 0 ||
    filters.quarter !== 'all' ||
    filters.useQuarterRange ||
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
              <AutoBadge active={autoIndicators.classIds} />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64" align="start">
            <div className="space-y-2 max-h-64 overflow-y-auto">
              <Label className="text-sm font-medium">Filtrar por turma</Label>
              <Input
                value={classSearch}
                onChange={(event) => setClassSearch(event.target.value)}
                placeholder="Buscar turma..."
                className="h-8"
              />
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="class-all"
                  checked={filters.classIds.length === 0}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      onFilterChange({ classIds: [] });
                    }
                  }}
                />
                <Label htmlFor="class-all" className="text-sm cursor-pointer">
                  Todas as turmas
                </Label>
              </div>
              {filteredClassOptions.map(cls => (
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
              {filteredClassOptions.length === 0 && (
                <p className="text-sm text-muted-foreground">Nenhuma turma ativa</p>
              )}
            </div>
          </PopoverContent>
        </Popover>

        {/* Filtro por Disciplina */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Filter className="h-4 w-4" />
              Disciplinas
              {selectedSubjects.length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {selectedSubjects.length}
                </Badge>
              )}
              <AutoBadge active={autoIndicators.subjects} />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64" align="start">
            <div className="space-y-2 max-h-64 overflow-y-auto">
              <Label className="text-sm font-medium">Filtrar por disciplina</Label>
              <Input
                value={subjectSearch}
                onChange={(event) => setSubjectSearch(event.target.value)}
                placeholder="Buscar disciplina..."
                className="h-8"
              />
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="subjects-all"
                  checked={selectedSubjects.length === 0}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      onFilterChange({ subjects: [] });
                    }
                  }}
                />
                <Label htmlFor="subjects-all" className="text-sm cursor-pointer">
                  Todas as disciplinas
                </Label>
              </div>
              {filteredSubjectOptions.map((subject) => (
                <div key={subject} className="flex items-center space-x-2">
                  <Checkbox
                    id={`subject-${subject}`}
                    checked={selectedSubjects.includes(subject)}
                    onCheckedChange={() => handleSubjectToggle(subject)}
                  />
                  <Label htmlFor={`subject-${subject}`} className="text-sm cursor-pointer">
                    {subject}
                  </Label>
                </div>
              ))}
              {filteredSubjectOptions.length === 0 && (
                <p className="text-sm text-muted-foreground">Nenhuma disciplina disponível</p>
              )}
            </div>
          </PopoverContent>
        </Popover>

        {/* Filtro por Período */}
        <div className="flex items-center gap-1">
          <Select
            value={filters.quarter}
            onValueChange={(value) => onFilterChange({ quarter: value })}
            disabled={filters.useQuarterRange}
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
          <AutoBadge active={autoIndicators.quarter} />
        </div>

        {/* Intervalo de Bimestres */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Filter className="h-4 w-4" />
              Intervalo
              {filters.useQuarterRange && (
                <Badge variant="secondary" className="ml-1">
                  {filters.quarterRangeStart?.replace('º Bimestre', 'º') ?? DEFAULT_RANGE_START}→
                  {filters.quarterRangeEnd?.replace('º Bimestre', 'º') ?? DEFAULT_RANGE_END}
                </Badge>
              )}
              <AutoBadge active={autoIndicators.useQuarterRange} />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64" align="start">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Usar intervalo</Label>
                <Switch
                  checked={!!filters.useQuarterRange}
                  onCheckedChange={(checked) => {
                    onFilterChange({
                      useQuarterRange: checked,
                      quarter: checked ? 'all' : filters.quarter,
                      quarterRangeStart: checked ? (filters.quarterRangeStart ?? DEFAULT_RANGE_START) : filters.quarterRangeStart,
                      quarterRangeEnd: checked ? (filters.quarterRangeEnd ?? DEFAULT_RANGE_END) : filters.quarterRangeEnd,
                    });
                  }}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">De</Label>
                  <Select
                    value={filters.quarterRangeStart ?? DEFAULT_RANGE_START}
                    onValueChange={(value) => onFilterChange({ quarterRangeStart: value })}
                    disabled={!filters.useQuarterRange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Início" />
                    </SelectTrigger>
                    <SelectContent>
                      {QUARTERS.map(q => (
                        <SelectItem key={q} value={q}>{q}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Até</Label>
                  <Select
                    value={filters.quarterRangeEnd ?? DEFAULT_RANGE_END}
                    onValueChange={(value) => onFilterChange({ quarterRangeEnd: value })}
                    disabled={!filters.useQuarterRange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Fim" />
                    </SelectTrigger>
                    <SelectContent>
                      {QUARTERS.map(q => (
                        <SelectItem key={q} value={q}>{q}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Quando ativo, o intervalo substitui o filtro de período único.
              </p>
            </div>
          </PopoverContent>
        </Popover>

        {/* Filtro por Ano */}
        <div className="flex items-center gap-1">
          <Select
            value={String(filters.schoolYear)}
            onValueChange={(value) => {
              if (value === 'all') {
                onFilterChange({ schoolYear: 'all', calendarYear: 'all' });
                return;
              }
              const numericValue = Number(value);
              const fallbackCalendarYear = filters.calendarYear === 'all' ? currentYear : filters.calendarYear;
              onFilterChange({
                schoolYear: numericValue,
                calendarYear: numericValue > 3 ? 'all' : fallbackCalendarYear,
              });
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
          <AutoBadge active={autoIndicators.schoolYear} />
        </div>

        {/* Filtro por Ano Calendário */}
        <div className="flex items-center gap-1">
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
          <AutoBadge active={autoIndicators.calendarYear} />
        </div>

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
              <AutoBadge active={autoIndicators.comparisonClassIds} />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72" align="start">
            <div className="space-y-3">
              <div>
                <Label className="text-sm font-medium">Selecione 2 ou mais turmas para comparar</Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Análise lado a lado de desempenho
                </p>
              </div>
              <Input
                value={comparisonSearch}
                onChange={(event) => setComparisonSearch(event.target.value)}
                placeholder="Buscar turma..."
                className="h-8"
              />
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {filteredComparisonOptions.map(cls => (
                  <div key={cls.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`compare-${cls.id}`}
                      checked={selectedForComparison.includes(cls.id)}
                      onCheckedChange={() => handleComparisonToggle(cls.id)}
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

        <div className="flex-1" />
      </div>
    </div>
  );
}
