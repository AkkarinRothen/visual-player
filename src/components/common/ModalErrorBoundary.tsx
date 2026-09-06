import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertCircle, RefreshCw, X } from 'lucide-react';

interface Props {
  children: ReactNode;
  modalTitle?: string;
  onClose?: () => void;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class ModalErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      errorMessage: '',
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      errorMessage: error.message || 'Error inesperado al cargar el contenido.',
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ModalErrorBoundary] Capturado error de renderizado:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, errorMessage: '' });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          style={{
            padding: '24px',
            background: '#0f172a',
            color: '#f8fafc',
            borderRadius: '16px',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            maxWidth: '500px',
            width: '92%',
            margin: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.7)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <AlertCircle size={24} style={{ color: '#ef4444' }} />
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 600 }}>
                {this.props.modalTitle || 'Error en el panel'}
              </h3>
            </div>
            {this.props.onClose && (
              <button
                type="button"
                onClick={this.props.onClose}
                aria-label="Cerrar modal"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: '4px',
                }}
              >
                <X size={20} />
              </button>
            )}
          </div>

          <p style={{ margin: 0, fontSize: '0.88rem', color: '#cbd5e1', lineHeight: '1.4' }}>
            No se pudo mostrar el contenido debido a un problema con los datos:{' '}
            <span style={{ color: '#fca5a5' }}>{this.state.errorMessage}</span>
          </p>

          <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
            {this.props.onClose && (
              <button
                type="button"
                onClick={this.props.onClose}
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '8px',
                  color: '#e2e8f0',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Cerrar
              </button>
            )}
            <button
              type="button"
              onClick={this.handleReset}
              style={{
                flex: 1,
                padding: '10px 14px',
                background: 'linear-gradient(135deg, #d97706, #b45309)',
                border: 'none',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '0.85rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                cursor: 'pointer',
              }}
            >
              <RefreshCw size={16} />
              <span>Reintentar</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
