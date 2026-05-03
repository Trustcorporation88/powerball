import { motion, AnimatePresence } from "framer-motion";
import { X, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface FocusModeProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export const FocusMode = ({ isOpen, onClose, title, children }: FocusModeProps) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="w-full max-w-5xl max-h-[90vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <Card className="border-slate-200 shadow-2xl">
              <CardHeader className="flex flex-row items-center justify-between sticky top-0 bg-white z-10 border-b">
                <CardTitle className="text-lg">{title}</CardTitle>
                <Button variant="ghost" size="sm" onClick={onClose}>
                  <X className="w-4 h-4" />
                </Button>
              </CardHeader>
              <CardContent className="p-6">
                {children}
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export const FocusButton = ({ onClick }: { onClick: () => void }) => (
  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onClick}>
    <Maximize2 className="w-3.5 h-3.5 text-slate-400" />
  </Button>
);