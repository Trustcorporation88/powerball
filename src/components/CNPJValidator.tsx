import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Building2, Search, Loader2, CheckCircle, XCircle, AlertTriangle, ExternalLink } from "lucide-react";
import { consultCNPJ, formatCNPJ, isValidCNPJFormat, CNPJ_CARD_URL, type CNPJData } from "@/services/receitaws";

interface CNPJValidatorProps {
  open: boolean;
  onClose: () => void;
  onValidated?: (data: CNPJData) => void;
}

export function CNPJValidator({ open, onClose, onValidated }: CNPJValidatorProps) {
  const [cnpj, setCnpj] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CNPJData | null>(null);
  const [error, setError] = useState<string>('');

  const handleValidate = async () => {
    setError('');
    setResult(null);
    setLoading(true);

    const validation = await consultCNPJ(cnpj);

    if (!validation.valid) {
      setError(validation.error || 'CNPJ inválido');
      setLoading(false);
      return;
    }

    if (validation.data) {
      setResult(validation.data);
      if (onValidated) onValidated(validation.data);
    }

    if (validation.status !== 'ATIVA') {
      setError(`⚠️ Empresa ${validation.status}`);
    }

    setLoading(false);
  };

  const handleCNPJChange = (value: string) => {
    // Remove tudo que não é número
    const cleaned = value.replace(/\D/g, '');
    
    // Formata automaticamente
    let formatted = cleaned;
    if (cleaned.length >= 2) formatted = cleaned.slice(0, 2) + '.' + cleaned.slice(2);
    if (cleaned.length >= 5) formatted = formatted.slice(0, 6) + '.' + formatted.slice(6);
    if (cleaned.length >= 8) formatted = formatted.slice(0, 10) + '/' + formatted.slice(10);
    if (cleaned.length >= 12) formatted = formatted.slice(0, 15) + '-' + formatted.slice(15);
    
    setCnpj(formatted.slice(0, 18)); // Limita a 18 chars (formato completo)
  };

  const isFormValid = cnpj.replace(/\D/g, '').length === 14;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-emerald-600" />
            Validar CNPJ (Receita Federal)
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Input */}
          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                placeholder="00.000.000/0000-00"
                value={cnpj}
                onChange={(e) => handleCNPJChange(e.target.value)}
                className="text-lg font-mono"
                maxLength={18}
              />
              {cnpj && (
                <p className="text-xs text-slate-500 mt-1">
                  {isValidCNPJFormat(cnpj) ? (
                    <span className="text-emerald-600 flex items-center gap-1">
                      <CheckCircle className="h-3 w-3" /> Formato válido
                    </span>
                  ) : (
                    <span className="text-red-600 flex items-center gap-1">
                      <XCircle className="h-3 w-3" /> Formato inválido ou dígitos incorretos
                    </span>
                  )}
                </p>
              )}
            </div>
            <Button 
              onClick={handleValidate} 
              disabled={!isFormValid || loading}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
              Consultar
            </Button>
          </div>

          {/* Erro */}
          {error && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-4 flex items-center gap-2 text-red-700">
                <XCircle className="h-5 w-5 shrink-0" />
                <p className="text-sm font-medium">{error}</p>
              </CardContent>
            </Card>
          )}

          {/* Resultado */}
          {result && (
            <Card className="border-emerald-200 bg-emerald-50">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-bold text-lg text-emerald-900">{result.razao_social || result.nome_fantasia}</p>
                    {result.nome_fantasia && result.nome_fantasia !== result.razao_social && (
                      <p className="text-sm text-emerald-700">Nome fantasia: {result.nome_fantasia}</p>
                    )}
                  </div>
                  <Badge variant={result.situacao === 'ATIVA' ? 'default' : 'destructive'} className={result.situacao === 'ATIVA' ? 'bg-emerald-600' : ''}>
                    {result.situacao}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-emerald-600">CNPJ</p>
                    <p className="font-mono font-semibold text-emerald-900">{formatCNPJ(result.cnpj)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-emerald-600">Abertura</p>
                    <p className="font-semibold text-emerald-900">{result.abertura}</p>
                  </div>
                  <div>
                    <p className="text-xs text-emerald-600">Porte</p>
                    <p className="font-semibold text-emerald-900">{result.porte}</p>
                  </div>
                  <div>
                    <p className="text-xs text-emerald-600">Capital Social</p>
                    <p className="font-semibold text-emerald-900">{result.capital_social}</p>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-emerald-600 mb-1">Atividade Principal</p>
                  {result.atividade_principal?.map((ativ, i) => (
                    <p key={i} className="text-sm text-emerald-900">
                      {ativ.code} - {ativ.text}
                    </p>
                  ))}
                </div>

                <div>
                  <p className="text-xs text-emerald-600 mb-1">Endereço</p>
                  <p className="text-sm text-emerald-900">
                    {result.endereco?.logradouro || ''}, {result.endereco?.numero || ''}
                    {result.endereco?.complemento && ` - ${result.endereco.complemento}`}
                    <br />
                    {result.endereco?.bairro || ''} - {result.endereco?.municipio || ''}/{result.endereco?.uf || ''}
                    <br />
                    CEP: {result.endereco?.cep || ''}
                  </p>
                </div>

                {(result.email || result.telefone) && (
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {result.email && (
                      <div>
                        <p className="text-xs text-emerald-600">Email</p>
                        <p className="font-semibold text-emerald-900">{result.email}</p>
                      </div>
                    )}
                    {result.telefone && (
                      <div>
                        <p className="text-xs text-emerald-600">Telefone</p>
                        <p className="font-semibold text-emerald-900">{result.telefone}</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Info e link */}
          <div className="space-y-2">
            <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded text-xs text-blue-800">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Limite: 3 consultas por minuto</p>
                <p>API gratuita ReceitaWS. Aguarde 20 segundos entre consultas.</p>
              </div>
            </div>

            <a
              href={CNPJ_CARD_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded text-xs text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <ExternalLink className="h-4 w-4 shrink-0" />
              <div>
                <p className="font-semibold">Emitir Cartão CNPJ</p>
                <p className="text-slate-500">solucoes.receita.fazenda.gov.br</p>
              </div>
            </a>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
