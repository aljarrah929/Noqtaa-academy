import { AlertTriangle } from "lucide-react";

interface SecurityWarningProps {
  open: boolean;
}

export function SecurityWarning({ open }: SecurityWarningProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[99999] bg-black/95 flex items-center justify-center"
      data-testid="security-warning-overlay"
    >
      <div className="max-w-lg mx-4 bg-red-950 border-2 border-red-600 rounded-lg p-8 text-center">
        <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-red-400 mb-4">
          Security Warning
        </h2>
        <p className="text-red-200 text-base leading-relaxed">
          Screen capture is prohibited. This incident has been reported to the
          administration. Repeated attempts will result in immediate account
          suspension.
        </p>
      </div>
    </div>
  );
}
