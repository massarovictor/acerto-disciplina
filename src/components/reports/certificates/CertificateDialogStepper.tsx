import { Check } from 'lucide-react';

export interface CertificateDialogStep {
    id: string;
    title: string;
    description?: string;
}

interface CertificateDialogStepperProps {
    steps: CertificateDialogStep[];
    currentStep: string;
    onStepChange?: (stepId: string) => void;
}

export function CertificateDialogStepper({ steps, currentStep, onStepChange }: CertificateDialogStepperProps) {
    const currentIndex = steps.findIndex((s) => s.id === currentStep);

    return (
        <div className="flex w-full items-start justify-between px-6 py-4 overflow-x-auto">
            {steps.map((step, index) => {
                const isCompleted = index < currentIndex;
                const isCurrent = index === currentIndex;

                return (
                    <div key={step.id} className="relative flex flex-col items-center flex-1 min-w-[90px]">
                        {/* Connector line */}
                        {index !== steps.length - 1 && (
                            <div
                                className={`absolute top-4 w-full h-px z-0 ${isCompleted ? 'bg-primary' : 'bg-border'}`}
                                style={{ width: 'calc(100% - 32px)', left: 'calc(50% + 16px)' }}
                            />
                        )}

                        <button
                            type="button"
                            disabled={!isCompleted && !isCurrent && index !== currentIndex + 1}
                            onClick={() => {
                                if (onStepChange && (isCompleted || index === currentIndex + 1)) {
                                    onStepChange(step.id);
                                }
                            }}
                            className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${isCompleted
                                    ? 'border-primary bg-primary text-primary-foreground'
                                    : isCurrent
                                        ? 'border-primary bg-white text-primary'
                                        : 'border-muted bg-slate-50 text-muted-foreground'
                                }`}
                        >
                            {isCompleted ? <Check className="h-4 w-4" /> : <span className="text-sm font-medium">{index + 1}</span>}
                        </button>

                        <div className="flex flex-col items-center mt-2 text-center">
                            <span
                                className={`text-xs font-semibold ${isCurrent ? 'text-slate-900' : isCompleted ? 'text-slate-700' : 'text-slate-400'
                                    }`}
                            >
                                {step.title}
                            </span>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
