import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Upload,
  Send,
  Download,
  ArrowLeft,
  FileSpreadsheet,
  Sparkles,
  RotateCcw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';

import {
  parseExcelWorkbook,
  processCommand,
  exportToExcel,
} from '@/services/excelAssistant';
import {
  ExcelWorkbook,
  ExcelSheet,
  ChatMessage,
  AssistantResponse,
} from '@/types/excelAssistant';

const CHART_COLORS = ['#059669', '#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444'];

export default function ExcelAssistant() {
  const [workbook, setWorkbook] = useState<ExcelWorkbook | null>(null);
  const [currentSheet, setCurrentSheet] = useState<ExcelSheet | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputCommand, setInputCommand] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [displayedSheet, setDisplayedSheet] = useState<ExcelSheet | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      toast.loading('Carregando planilha...');
      const wb = await parseExcelWorkbook(file);
      setWorkbook(wb);
      setCurrentSheet(wb.sheets[0]);
      setDisplayedSheet(wb.sheets[0]);
      
      toast.success(`Planilha "${file.name}" carregada com sucesso!`);
      
      setMessages([
        {
          role: 'assistant',
          content: `Planilha carregada! ${wb.sheets[0].rowCount} linhas, ${wb.sheets[0].columnCount} colunas. O que você gostaria de fazer?`,
          timestamp: Date.now(),
        },
      ]);
      
      setTimeout(scrollToBottom, 100);
    } catch (error) {
      toast.error('Erro ao carregar planilha');
      console.error(error);
    }
  };

  const handleLoadDemo = async () => {
    try {
      toast.loading('Carregando planilha demo...');
      const response = await fetch('/dados_referencia.xlsx');
      const blob = await response.blob();
      const file = new File([blob], 'dados_referencia.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      const wb = await parseExcelWorkbook(file);
      setWorkbook(wb);
      setCurrentSheet(wb.sheets[0]);
      setDisplayedSheet(wb.sheets[0]);

      toast.success('Planilha demo carregada com sucesso!');

      setMessages([
        {
          role: 'assistant',
          content: `Planilha demo carregada! ${wb.sheets[0].rowCount} linhas, ${wb.sheets[0].columnCount} colunas. O que você gostaria de fazer?`,
          timestamp: Date.now(),
        },
      ]);

      setTimeout(scrollToBottom, 100);
    } catch (error) {
      toast.error('Erro ao carregar planilha demo');
      console.error(error);
    }
  };

  const handleSendCommand = async () => {
    if (!inputCommand.trim() || !currentSheet) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: inputCommand,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputCommand('');
    setIsProcessing(true);

    try {
      const response = await processCommand(inputCommand, currentSheet);

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: response.message,
        timestamp: response.timestamp,
        data: response,
      };

      setMessages((prev) => [...prev, assistantMessage]);

      if (response.modifiedSheet) {
        setDisplayedSheet(response.modifiedSheet);
        setCurrentSheet(response.modifiedSheet);
      }

      if (response.success) {
        toast.success('Operação concluída!');
      } else if (response.type === 'error') {
        toast.error('Não consegui processar o comando');
      }
    } catch (error) {
      toast.error('Erro ao processar comando');
      console.error(error);
    } finally {
      setIsProcessing(false);
      setTimeout(scrollToBottom, 100);
    }
  };

  const handleDownload = () => {
    if (!displayedSheet || !workbook) return;
    exportToExcel(displayedSheet, `${workbook.fileName.replace('.xlsx', '')}_modificado.xlsx`);
    toast.success('Planilha baixada!');
  };

  const handleReset = () => {
    if (!workbook) return;
    setCurrentSheet(workbook.sheets[0]);
    setDisplayedSheet(workbook.sheets[0]);
    toast.info('Planilha resetada para versão original');
  };

  const handleSheetChange = (sheetName: string) => {
    if (!workbook) return;
    const selectedSheet = workbook.sheets.find((s) => s.name === sheetName);
    if (selectedSheet) {
      setCurrentSheet(selectedSheet);
      setDisplayedSheet(selectedSheet);
      toast.info(`Planilha "${sheetName}" selecionada`);
    }
  };

  const renderChart = (response: AssistantResponse) => {
    if (!response.chart || !response.data) return null;

    const { chart } = response;

    return (
      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-lg">{chart.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            {chart.type === 'line' ? (
              <LineChart data={response.data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey={chart.xColumn} />
                <YAxis />
                <Tooltip />
                <Legend />
                {chart.yColumns.map((col, idx) => (
                  <Line
                    key={col}
                    type="monotone"
                    dataKey={col}
                    stroke={CHART_COLORS[idx % CHART_COLORS.length]}
                    strokeWidth={2}
                  />
                ))}
              </LineChart>
            ) : chart.type === 'pie' ? (
              <PieChart>
                <Pie
                  data={response.data}
                  dataKey={chart.yColumns[0]}
                  nameKey={chart.xColumn}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label
                >
                  {response.data.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            ) : (
              <BarChart data={response.data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey={chart.xColumn} />
                <YAxis />
                <Tooltip />
                <Legend />
                {chart.yColumns.map((col, idx) => (
                  <Bar key={col} dataKey={col} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                ))}
              </BarChart>
            )}
          </ResponsiveContainer>
        </CardContent>
      </Card>
    );
  };

  const renderSheetPreview = (sheet: ExcelSheet) => {
    const displayRows = sheet.data.slice(0, 10);

    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-muted">
              {sheet.headers.map((header, idx) => (
                <th key={idx} className="border px-3 py-2 text-left font-semibold">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayRows.map((row, rowIdx) => (
              <tr key={rowIdx} className="hover:bg-muted/50">
                {row.map((cell, cellIdx) => (
                  <td key={cellIdx} className="border px-3 py-2">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {sheet.rowCount > 10 && (
          <p className="text-xs text-muted-foreground mt-2">
            Mostrando 10 de {sheet.rowCount} linhas
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/home">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <Sparkles className="h-8 w-8 text-primary" />
                Assistente Excel IA
              </h1>
              <p className="text-muted-foreground">
                Manipule planilhas com comandos em linguagem natural
              </p>
            </div>
          </div>

          {workbook && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleReset}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Resetar
              </Button>
              <Button variant="default" size="sm" onClick={handleDownload}>
                <Download className="h-4 w-4 mr-2" />
                Baixar Planilha
              </Button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Coluna Esquerda: Upload e Chat */}
          <div className="space-y-6">
            {/* Upload */}
            {!workbook && (
              <Card className="border-dashed">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileSpreadsheet className="h-5 w-5" />
                    Upload de Planilha
                  </CardTitle>
                  <CardDescription>
                    Faça upload de um arquivo Excel (.xlsx, .xls)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed rounded-lg p-12 text-center cursor-pointer hover:border-primary transition-colors"
                  >
                    <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Clique para selecionar ou arraste aqui
                    </p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </div>
                  <div className="mt-4 flex items-center gap-2">
                    <div className="flex-1 border-t border-muted"></div>
                    <span className="text-xs text-muted-foreground">OU</span>
                    <div className="flex-1 border-t border-muted"></div>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full mt-4"
                    onClick={handleLoadDemo}
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    Usar Planilha Demo
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Chat */}
            {workbook && (
              <Card className="flex flex-col h-[600px]">
                <CardHeader>
                  <CardTitle>Chat com Assistente</CardTitle>
                  <CardDescription>
                    Diga o que você quer fazer com a planilha
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col p-0">
                  <ScrollArea className="flex-1 px-4">
                    <div className="space-y-4 py-4">
                      <AnimatePresence>
                        {messages.map((msg, idx) => (
                          <motion.div
                            key={idx}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={`max-w-[80%] rounded-lg p-3 ${
                                msg.role === 'user'
                                  ? 'bg-primary text-primary-foreground'
                                  : 'bg-muted'
                              }`}
                            >
                              <p className="text-sm">{msg.content}</p>
                              {msg.data && msg.role === 'assistant' && renderChart(msg.data)}
                            </div>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                      <div ref={messagesEndRef} />
                    </div>
                  </ScrollArea>

                  <div className="p-4 border-t">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Ex: faça um gráfico comparando receita e despesa"
                        value={inputCommand}
                        onChange={(e) => setInputCommand(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSendCommand()}
                        disabled={isProcessing}
                      />
                      <Button
                        onClick={handleSendCommand}
                        disabled={isProcessing || !inputCommand.trim()}
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Sugestões */}
            {workbook && messages.length === 1 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Exemplos de Comandos</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start text-left"
                    onClick={() => setInputCommand('Faça um gráfico de barras comparando receita e despesa')}
                  >
                    Faça um gráfico de barras comparando receita e despesa
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start text-left"
                    onClick={() => setInputCommand('Ordene pela coluna valor em ordem decrescente')}
                  >
                    Ordene pela coluna valor em ordem decrescente
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start text-left"
                    onClick={() => setInputCommand('Filtre apenas valores acima de 1000')}
                  >
                    Filtre apenas valores acima de 1000
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start text-left"
                    onClick={() => setInputCommand('Adicione 20% na coluna receita')}
                  >
                    Adicione 20% na coluna receita
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Coluna Direita: Preview da Planilha */}
          {displayedSheet && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Preview da Planilha</span>
                  <span className="text-sm font-normal text-muted-foreground">
                    {displayedSheet.rowCount} linhas × {displayedSheet.columnCount} colunas
                  </span>
                </CardTitle>
                {workbook && workbook.sheets.length > 1 && (
                  <div className="mt-4">
                    <p className="text-sm text-muted-foreground mb-2">Selecione a aba:</p>
                    <Tabs value={currentSheet?.name} onValueChange={handleSheetChange}>
                      <TabsList className="w-full justify-start overflow-x-auto flex-wrap h-auto">
                        {workbook.sheets.map((sheet) => (
                          <TabsTrigger key={sheet.name} value={sheet.name}>
                            {sheet.name}
                          </TabsTrigger>
                        ))}
                      </TabsList>
                    </Tabs>
                  </div>
                )}
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[600px]">
                  {renderSheetPreview(displayedSheet)}
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
