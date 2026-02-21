import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { CertificatesReports } from '@/components/reports/CertificatesReports';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useClasses, useStudents } from '@/hooks/useData';
import { Plus } from 'lucide-react';
import { useState } from 'react';

const CertificatesPage = () => {
  const { classes } = useClasses();
  const { students } = useStudents();
  const [createRequestNonce, setCreateRequestNonce] = useState(0);

  return (
    <PageContainer>
      <PageHeader
        title="Certificados"
        description="Emita, edite, baixe e valide certificados institucionais com rastreabilidade por QR code."
        actions={
          <Button
            onClick={() => setCreateRequestNonce((prev) => prev + 1)}
            className="gap-2 shadow-sm"
          >
            <Plus className="h-4 w-4" />
            Emitir Certificados
          </Button>
        }
      />

      <div className="mt-6">
        <Card>
          <CardContent className="p-6">
            <CertificatesReports
              classes={classes}
              students={students}
              enabled
              createRequestNonce={createRequestNonce}
            />
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
};

export default CertificatesPage;
