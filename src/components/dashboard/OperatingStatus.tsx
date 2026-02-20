import type { ComponentType } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Users, GraduationCap, AlertTriangle } from "lucide-react";

interface StatusCardProps {
    label: string;
    value: number | string;
    icon: ComponentType<{ className?: string }>;
    colorClass: string;
    bgClass: string;
    description?: string;
}

const StatusCard = ({ label, value, icon: Icon, colorClass, bgClass, description }: StatusCardProps) => (
    <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-6 flex items-center gap-4">
            <div className={`p-3 rounded-xl ${bgClass}`}>
                <Icon className={`h-6 w-6 ${colorClass}`} />
            </div>
            <div>
                <p className="text-sm font-medium text-muted-foreground">{label}</p>
                <div className="flex items-baseline gap-2">
                    <h3 className="text-2xl font-bold">{value}</h3>
                    {description && <span className="text-xs text-muted-foreground">{description}</span>}
                </div>
            </div>
        </CardContent>
    </Card>
);

interface OperatingStatusProps {
    studentsCount: number;
    classesCount: number;
    pendingIncidentsCount: number;
}

export const OperatingStatus = ({ studentsCount, classesCount, pendingIncidentsCount }: OperatingStatusProps) => {
    return (
        <div className="grid gap-4 md:grid-cols-3 mb-8">
            <StatusCard
                label="Alunos Ativos"
                value={studentsCount}
                icon={Users}
                colorClass="text-blue-600 dark:text-[#2563EB]"
                bgClass="bg-blue-100 dark:bg-[#2563EB]/20"
                description="Matriculados"
            />

            <StatusCard
                label="Acompanhamentos Pendentes"
                value={pendingIncidentsCount}
                icon={AlertTriangle}
                // Destaque visual apenas se houver pendências
                colorClass={pendingIncidentsCount > 0 ? "text-amber-600 dark:text-[#F59E0B]" : "text-green-600 dark:text-[#10B981]"}
                bgClass={pendingIncidentsCount > 0 ? "bg-amber-100 dark:bg-[#F59E0B]/20" : "bg-green-100 dark:bg-[#10B981]/20"}
                description={pendingIncidentsCount === 1 ? "Requer atenção" : pendingIncidentsCount > 1 ? "Requerem atenção" : "Tudo em dia!"}
            />

            <StatusCard
                label="Turmas Ativas"
                value={classesCount}
                icon={GraduationCap}
                colorClass="text-indigo-600 dark:text-[#2563EB]"
                bgClass="bg-indigo-100 dark:bg-[#2563EB]/20"
                description="Em andamento"
            />
        </div>
    );
};
