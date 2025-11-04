import { Class } from '@/types';
import { FileText } from 'lucide-react';

interface CoverSlideProps {
  classData: Class;
  period: string;
}

export const CoverSlide = ({ classData, period }: CoverSlideProps) => {
  return (
    <div className="h-full p-8 bg-gradient-to-br from-primary via-primary/90 to-primary/70 flex flex-col items-center justify-center text-white">
      <FileText className="h-24 w-24 mb-8 opacity-90" />
      
      <h1 className="text-6xl font-bold mb-4 text-center">
        {classData.name}
      </h1>
      
      <div className="text-2xl mb-2 opacity-90">
        {classData.course}
      </div>
      
      <div className="text-xl opacity-80 mb-12">
        Série: {classData.series}
      </div>
      
      <div className="text-center space-y-2 opacity-90">
        <p className="text-xl font-semibold">
          Relatório de Desempenho
        </p>
        <p className="text-lg">
          {period === 'all' ? 'Ano Letivo Completo' : period}
        </p>
        <p className="text-lg">
          {new Date().getFullYear()}
        </p>
      </div>
      
      <div className="mt-16 text-sm opacity-70">
        Gerado em {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR')}
      </div>
    </div>
  );
};