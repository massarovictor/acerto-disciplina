import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
    title: ReactNode | string;
    description?: string;
    actions?: ReactNode;
    className?: string;
}

export const PageHeader = ({ title, description, actions, className }: PageHeaderProps) => {
    return (
        <div className={cn("flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-6", className)}>
            <div className="space-y-1">
                {typeof title === 'string' ? (
                    <h2 className="text-3xl font-bold tracking-tight text-slate-900">{title}</h2>
                ) : (
                    <div className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                        {title}
                    </div>
                )}
                {description && (
                    <p className="text-muted-foreground">{description}</p>
                )}
            </div>
            {actions && (
                <div className="flex items-center gap-2">
                    {actions}
                </div>
            )}
        </div>
    );
};
