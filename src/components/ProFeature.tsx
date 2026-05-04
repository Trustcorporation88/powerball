import type { ElementType } from "react";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface ProFeatureButtonProps {
  label: string;
  icon?: ElementType;
}

export function ProFeatureButton({ label, icon: Icon }: ProFeatureButtonProps) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled
      className="border-amber-200 bg-amber-50 text-amber-800 opacity-100"
    >
      {Icon ? <Icon className="h-4 w-4 mr-1" /> : <Lock className="h-4 w-4 mr-1" />}
      {label}
      <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
        Usuário Pro
      </span>
    </Button>
  );
}

interface ProFeatureCardProps {
  title: string;
  description: string;
}

export function ProFeatureCard({ title, description }: ProFeatureCardProps) {
  return (
    <Card className="border-amber-200 bg-amber-50">
      <CardContent className="p-5">
        <div className="flex items-center gap-2 mb-3 text-amber-800">
          <Lock className="h-4 w-4" />
          <h3 className="font-semibold">{title}</h3>
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
            Usuário Pro
          </span>
        </div>
        <p className="text-sm text-amber-700">{description}</p>
      </CardContent>
    </Card>
  );
}
