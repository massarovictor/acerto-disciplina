import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell,
    LabelList
} from 'recharts';
import { Link } from 'react-router-dom';
import { CRITICALITY_BUCKETS, CriticalityLevel, getCriticalityLevel, getCriticalityBucket } from '@/lib/analytics/criticality';
import { AlertTriangle, TrendingUp, Target, School } from 'lucide-react';
import { useMemo } from 'react';

interface StudentData {
    id: string;
    name: string;
    fundAvg: number; // Média Fundamental
    highSchoolAvg: number; // Média Médio
    externalAvg: number; // Média Externa
}

interface CriticalityAnalysisProps {
    studentsData: StudentData[];
    className?: string;
    externalFilter?: React.ReactNode;
    classId: string;
    selectedSubject: string;
}

export const CriticalityAnalysis = ({ studentsData, className, externalFilter, classId, selectedSubject }: CriticalityAnalysisProps) => {

    // Process Data
    const distributions = useMemo(() => {
        const initBuckets = () => ({
            'MUITO CRITICO': [] as StudentData[],
            'CRITICO': [] as StudentData[],
            'INTERMEDIARIO': [] as StudentData[],
            'ADEQUADO': [] as StudentData[]
        });

        const fundBuckets = initBuckets();
        const highSchoolBuckets = initBuckets();
        const externalBuckets = initBuckets();

        studentsData.forEach(student => {
            if (student.fundAvg > 0) fundBuckets[getCriticalityLevel(student.fundAvg)].push(student);
            if (student.highSchoolAvg > 0) highSchoolBuckets[getCriticalityLevel(student.highSchoolAvg)].push(student);
            if (student.externalAvg > 0) externalBuckets[getCriticalityLevel(student.externalAvg)].push(student);
        });

        const formatForChart = (buckets: Record<string, StudentData[]>) => {
            return CRITICALITY_BUCKETS.map(bucket => ({
                name: bucket.label, // Label curto
                fullLabel: bucket.level,
                value: buckets[bucket.level].length,
                students: buckets[bucket.level],
                color: bucket.level === 'MUITO CRITICO' ? '#991b1b' : // red-800
                    bucket.level === 'CRITICO' ? '#d97706' :      // amber-600
                        bucket.level === 'INTERMEDIARIO' ? '#059669' : // emerald-600
                            '#2563eb' // blue-600
            }));
        };

        return {
            fundamental: formatForChart(fundBuckets),
            highSchool: formatForChart(highSchoolBuckets),
            external: formatForChart(externalBuckets)
        };
    }, [studentsData]);

    const ChartSection = ({ title, icon: Icon, data, description, typeKey, action }: {
        title: string,
        icon: any,
        data: any[],
        description: string,
        typeKey: 'fundAvg' | 'highSchoolAvg' | 'externalAvg',
        action?: React.ReactNode
    }) => (
        <Card className="flex-1 shadow-sm border-none bg-card/50 flex flex-col relative overflow-visible">
            <CardHeader className="pb-2 flex flex-row items-start justify-between space-y-0">
                <div className="space-y-1">
                    <CardTitle className="text-base flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                            <Icon className="h-4 w-4" />
                        </div>
                        {title}
                    </CardTitle>
                    <CardDescription className="text-xs">{description}</CardDescription>
                </div>
                {action && <div className="ml-2">{action}</div>}
            </CardHeader>
            <CardContent className="flex-1 flex flex-col gap-6">
                <div className="h-[200px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data} margin={{ top: 20, right: 10, left: -20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                            <XAxis
                                dataKey="name"
                                tick={{ fontSize: 10 }}
                                interval={0}
                                axisLine={false}
                                tickLine={false}
                                height={20}
                            />
                            <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                            <Tooltip
                                cursor={{ fill: 'transparent' }}
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            />
                            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                                <LabelList dataKey="value" position="top" style={{ fontSize: '12px', fontWeight: 'bold', fill: '#64748b' }} />
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                <div className="border-t pt-4">
                    <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-3 tracking-wider">Detalhamento por Aluno</h4>
                    <ScrollArea className="h-[300px] pr-4">
                        <div className="space-y-6">
                            {['MUITO CRITICO', 'CRITICO', 'INTERMEDIARIO', 'ADEQUADO'].map((level) => {
                                const category = data.find(d => d.fullLabel === level);
                                if (!category || category.value === 0) return null;

                                const bucket = getCriticalityBucket(level as CriticalityLevel);

                                return (
                                    <div key={level} className="space-y-2">
                                        <div className={`text-xs font-medium flex items-center justify-between ${bucket.color} bg-background/50 p-1.5 rounded border border-transparent hover:border-border transition-colors`}>
                                            <div className="flex items-center gap-2">
                                                <div className={`w-2 h-2 rounded-full`} style={{ backgroundColor: category.color }} />
                                                {bucket.label}
                                            </div>
                                            <Badge variant="secondary" className="h-5 text-[10px] px-1.5">{category.value}</Badge>
                                        </div>
                                        <div className="grid grid-cols-1 gap-1 pl-2 border-l-2 border-muted ml-1">
                                            {[...category.students].sort((a, b) => a[typeKey] - b[typeKey]).map((s: StudentData) => (
                                                <Link
                                                    key={s.id}
                                                    to={`/trajetoria?classId=${classId}&studentId=${s.id}&subject=${selectedSubject}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-xs flex justify-between items-center group hover:bg-muted/50 p-1.5 rounded transition-colors cursor-pointer text-decoration-none text-foreground"
                                                >
                                                    <span className="text-muted-foreground dark:text-muted-foreground truncate max-w-[180px] group-hover:underline decoration-slate-400 underline-offset-2" title={s.name}>
                                                        {s.name}
                                                    </span>
                                                    <span className={`font-mono font-medium ${bucket.color}`}>
                                                        {s[typeKey].toFixed(1)}
                                                    </span>
                                                </Link>
                                            ))}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </ScrollArea>
                </div>
            </CardContent>
        </Card>
    );

    return (
        <div className={`space-y-6 ${className}`}>
            <div>
                <h3 className="text-lg font-semibold flex items-center gap-2 mb-1">
                    <AlertTriangle className="h-5 w-5 text-warning" />
                    Análise Comparativa de Criticidade
                </h3>
                <p className="text-sm text-muted-foreground">Distribuição e lista nominal dos alunos por níveis de desempenho.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <ChartSection
                    title="Fundamental (Histórico)"
                    icon={School}
                    data={distributions.fundamental}
                    description="Baseado na média geral do 6º ao 9º ano"
                    typeKey="fundAvg"
                />
                <ChartSection
                    title="Ensino Médio (Atual)"
                    icon={TrendingUp}
                    data={distributions.highSchool}
                    description="Baseado nas notas lançadas no ano letivo"
                    typeKey="highSchoolAvg"
                />
                <ChartSection
                    title="Avaliações Externas"
                    icon={Target}
                    data={distributions.external}
                    description="Baseado em simulados e provas externas"
                    typeKey="externalAvg"
                    action={externalFilter}
                />
            </div>
        </div>
    );
};
