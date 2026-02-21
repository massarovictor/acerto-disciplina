import { Component, ErrorInfo, ReactNode } from 'react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

interface CertificatesErrorBoundaryProps {
  children: ReactNode;
}

interface CertificatesErrorBoundaryState {
  hasError: boolean;
}

export class CertificatesErrorBoundary extends Component<
  CertificatesErrorBoundaryProps,
  CertificatesErrorBoundaryState
> {
  state: CertificatesErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): CertificatesErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Erro no módulo de certificados:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <Alert variant="destructive">
          <AlertTitle>Erro ao renderizar certificados</AlertTitle>
          <AlertDescription className="space-y-3">
            <p>
              O módulo de certificados encontrou um erro inesperado. Tente recarregar
              os dados ou abrir novamente a aba.
            </p>
            <Button type="button" variant="outline" onClick={this.handleReset}>
              Tentar novamente
            </Button>
          </AlertDescription>
        </Alert>
      );
    }

    return this.props.children;
  }
}
