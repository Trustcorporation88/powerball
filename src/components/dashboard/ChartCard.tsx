import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FocusButton } from "./FocusMode";

interface ChartCardProps {
  title: string;
  children: React.ReactNode;
  onFocus?: () => void;
  className?: string;
  delay?: number;
}

export const ChartCard = ({ title, children, onFocus, className, delay = 0 }: ChartCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
    >
      <Card className={className || "border-slate-200"}>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base">{title}</CardTitle>
          {onFocus && <FocusButton onClick={onFocus} />}
        </CardHeader>
        <CardContent>
          {children}
        </CardContent>
      </Card>
    </motion.div>
  );
};