import { AlertCircle, FileQuestion } from "lucide-react";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";

interface EmptyStateProps {
  title?: string;
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({ title = "Nenhum dado encontrado", message, action }: EmptyStateProps) {
  return (
    <Card className="border-amber-200 bg-amber-50/50">
      <CardContent className="p-8 text-center space-y-3">
        <div className="flex justify-center">
          <div className="p-3 bg-amber-100 rounded-full">
            <FileQuestion className="h-8 w-8 text-amber-600" />
          </div>
        </div>
        <div className="space-y-1">
          <h3 className="font-semibold text-amber-900">{title}</h3>
          <p className="text-sm text-amber-700">{message}</p>
        </div>
        {action && (
          <div className="pt-2">
            <Button onClick={action.onClick} variant="outline" size="sm" className="border-amber-300 hover:bg-amber-100">
              {action.label}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
