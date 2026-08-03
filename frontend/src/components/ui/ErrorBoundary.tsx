import { Component, type ReactNode, type ErrorInfo } from "react";
import { Button } from "./Basics";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center">
          <div className="w-14 h-14 rounded-full bg-error-container flex items-center justify-center mb-4">
            <span className="material-symbols-outlined text-error text-3xl">error_outline</span>
          </div>
          <h3 className="text-lg font-semibold text-on-surface mb-1">Something went wrong</h3>
          <p className="text-sm text-on-surface-variant mb-4 max-w-md">
            {this.state.error?.message || "An unexpected error occurred."}
          </p>
          <Button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.href = "/";
            }}
          >
            Go Home
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
