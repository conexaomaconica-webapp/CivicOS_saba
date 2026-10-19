import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props { children: ReactNode }
interface State { failed: boolean }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Falha na interface mobile', error, info.componentStack);
  }

  render() {
    if (this.state.failed) {
      return (
        <main className="center-state" role="alert">
          <span className="state-icon" aria-hidden="true">!</span>
          <h1>Não foi possível abrir esta tela</h1>
          <p>Feche e abra o aplicativo novamente.</p>
          <button className="action-button" onClick={() => window.location.reload()}>Tentar novamente</button>
        </main>
      );
    }
    return this.props.children;
  }
}
