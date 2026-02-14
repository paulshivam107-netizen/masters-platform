import React from 'react';
import { ingestTelemetryEventApi } from '../../api/telemetryApi';
import { trackEvent } from '../../app/telemetry';

class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      message: error?.message || 'Something went wrong in the interface.'
    };
  }

  componentDidCatch(error, info) {
    const payload = {
      boundary: this.props.name || 'app_boundary',
      message: error?.message || 'unknown',
      stack: error?.stack || null,
      componentStack: info?.componentStack || null,
      path: window?.location?.pathname || null,
      at: new Date().toISOString()
    };

    trackEvent('ui_error_boundary_triggered', payload);
    ingestTelemetryEventApi('ui_error_boundary_triggered', payload).catch(() => {
      // swallow telemetry errors to avoid loops
    });

    if (typeof this.props.onError === 'function') {
      this.props.onError(error);
    }
  }

  handleRetry = () => {
    if (typeof this.props.onReset === 'function') {
      this.props.onReset();
    }
    this.setState({ hasError: false, message: '' });
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="app-error-fallback" role="alert">
        <h2>We hit an unexpected UI error</h2>
        <p>{this.state.message}</p>
        <div className="app-error-actions">
          <button type="button" onClick={this.handleRetry}>Try Again</button>
          <button
            type="button"
            onClick={() => window.location.reload()}
          >
            Reload App
          </button>
        </div>
      </div>
    );
  }
}

export default AppErrorBoundary;
