import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { CalendarIcon } from "lucide-react";
import { format, parse, startOfToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useClasses } from "@/hooks/useData";
import { IncidentFormData } from "../IncidentWizard";

interface ContextStepProps {
  formData: Partial<IncidentFormData>;
  updateFormData: (data: Partial<IncidentFormData>) => void;
}

export const ContextStep = ({ formData, updateFormData }: ContextStepProps) => {
  const { classes } = useClasses();
  var selectedDate = formData.date
    ? parse(formData.date, "yyyy-MM-dd", new Date())
    : undefined;

  const today = startOfToday();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Contexto da Ocorrência</h2>
        <p className="text-muted-foreground mt-1">
          Informe a turma e data em que ocorreu o incidente
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="class">Turma *</Label>
          <Select
            value={formData.classId}
            onValueChange={(value) => updateFormData({ classId: value })}
          >
            <SelectTrigger id="class">
              <SelectValue placeholder="Selecione a turma" />
            </SelectTrigger>
            <SelectContent>
              {classes
                .filter((cls) => cls.active && !cls.archived)
                .map((cls) => (
                  <SelectItem key={cls.id} value={cls.id}>
                    {cls.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Data *</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !formData.date && "text-muted-foreground",
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {formData.date
                  ? format(selectedDate, "PPP", { locale: ptBR })
                  : "Selecione a data"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => {
                  if (!date) return;
                  updateFormData({ date: format(date, "yyyy-MM-dd") });
                }}
                initialFocus
                className="pointer-events-auto"
                disabled={[{ after: today }, { dayOfWeek: [0] }]}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </div>
  );
};
