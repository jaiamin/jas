import { Component, type ReactNode } from "react";
import { Alert } from "@/components/feedback";
import { Button } from "@/components/ui/button";

export class PageBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    return this.state.failed ? (
      <div className="p-4 sm:p-6">
        <Alert
          variant="error"
          title="This page couldn’t load"
          action={
            <Button
              variant="outline"
              size="sm"
              onClick={() => location.reload()}
            >
              Reload page
            </Button>
          }
        >
          Reload the page to try again.
        </Alert>
      </div>
    ) : (
      this.props.children
    );
  }
}
