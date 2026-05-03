import { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Link, Copy, Mail, QrCode, FileText } from 'lucide-react';
import { toast } from 'sonner';

interface ShareDialogProps {
  open: boolean;
  onClose: () => void;
  projectName: string;
  onExportPDF: () => void;
}

export default function ShareDialog({ open, onClose, projectName, onExportPDF }: ShareDialogProps) {
  const [shareLink, setShareLink] = useState('');

  const generateLink = useCallback(() => {
    const token = crypto.randomUUID().slice(0, 8);
    const link = `${window.location.origin}/shared/${token}`;
    setShareLink(link);
    toast.success('Link gerado com sucesso');
  }, []);

  const copyLink = useCallback(() => {
    navigator.clipboard.writeText(shareLink);
    toast.success('Link copiado');
  }, [shareLink]);

  const shareEmail = useCallback(() => {
    const subject = encodeURIComponent(`Dashboard: ${projectName}`);
    const body = encodeURIComponent(`Olá,\n\nSegue o dashboard de análise financeira: ${shareLink}\n\nAtenciosamente.`);
    window.open(`mailto:?subject=${subject}&body=${body}`);
  }, [shareLink, projectName]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Compartilhar Dashboard</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Button onClick={generateLink} className="w-full" variant="outline">
            <Link className="h-4 w-4 mr-2" />
            Gerar Link Compartilhável
          </Button>

          {shareLink && (
            <div className="flex items-center gap-2 p-2 bg-muted rounded">
              <input value={shareLink} readOnly className="flex-1 bg-transparent text-sm outline-none" />
              <Button size="sm" variant="ghost" onClick={copyLink}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={shareEmail} disabled={!shareLink}>
              <Mail className="h-4 w-4 mr-2" />
              Email
            </Button>
            <Button variant="outline" onClick={onExportPDF}>
              <FileText className="h-4 w-4 mr-2" />
              PDF
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
