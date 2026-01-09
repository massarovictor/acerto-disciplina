/**
 * Barra de Filtros do Analytics
 */

import { useState } from 'react';
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

export function AnalyticsFilters({ 
  classes, 
  filters, 
  onFilterChange,
  onCompare 
}: AnalyticsFiltersProps) {
  const [selectedForComparison, setSelectedForComparison] = useState<string[]>([]);
  
  const activeClasses = classes.filter(c => !c.archived);
  
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
    });
  };
  
  const hasActiveFilters = filters.series.length > 0 || 
    filters.classIds.length > 0 || 
    filters.quarter !== 'all';

  return (
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
        </div>
      )}
    </div>
  );
}
