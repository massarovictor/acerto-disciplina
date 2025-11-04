import { IncidentWizard } from '@/components/incidents/IncidentWizard';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const NewIncident = () => {
  const navigate = useNavigate();

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/')}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar ao Dashboard
        </Button>
        <h1 className="text-3xl font-bold">Nova Ocorrência</h1>
        <p className="text-muted-foreground mt-1">
          Registre uma nova ocorrência seguindo as etapas abaixo
        </p>
      </div>

      <IncidentWizard />
    </div>
  );
};

export default NewIncident;
