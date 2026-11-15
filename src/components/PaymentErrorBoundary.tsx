import { Component, type ReactNode, type ErrorInfo } from 'react';
import { AlertCircle, RefreshCw, Banknote } from 'lucide-react';

interface Props {
  children: ReactNode;
  onFallbackToCash?: () => void;
  onCancel?: () => void;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

export default class PaymentErrorBoundary extends Component<Props, State> {
  state: State = {
    hasError: false,
    errorMessage: '',
  };

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      errorMessage: error?.message || 'Payment element could not load',
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Payment Error caught by boundary:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, errorMessage: '' });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-5 bg-red-950/30 border border-red-500/30 rounded-2xl space-y-4 text-center">
          <div className="w-12 h-12 mx-auto rounded-full bg-red-500/20 flex items-center justify-center text-red-400">
            <AlertCircle size={24} />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white">Online Payment Notice</h4>
            <p className="text-xs text-gray-300 mt-1.5 leading-relaxed">
              We could not load the online card form in this browser session. You can retry or complete your order using Cash or Card on Collection/Delivery.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
            <button
              type="button"
              onClick={this.handleRetry}
              className="flex-1 py-3 px-4 bg-white/10 hover:bg-white/15 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <RefreshCw size={14} /> Retry Form
            </button>
            {this.props.onFallbackToCash && (
              <button
                type="button"
                onClick={this.props.onFallbackToCash}
                className="flex-1 py-3 px-4 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Banknote size={14} /> Pay on Collection / Delivery
              </button>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
