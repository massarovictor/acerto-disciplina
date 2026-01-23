import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface PageContainerProps {
    children: ReactNode;
    className?: string;
}

export const PageContainer = ({ children, className }: PageContainerProps) => {
    return (
        <div
            className={cn(
                "p-6 md:p-8 max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-500",
                className
            )}
        >
            {children}
        </div>
    );
};
