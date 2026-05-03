import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bookmark,
  BookmarkPlus,
  Trash2,
  Clock,
  Download,
  X,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface BookmarkEntry {
  id: string;
  name: string;
  timestamp: string;
  filters: Record<string, unknown>;
}

interface BookmarkManagerProps {
  currentFilters: Record<string, unknown>;
  onLoad: (filters: Record<string, unknown>) => void;
}

const STORAGE_KEY = "datfin_bookmarks";

export default function BookmarkManager({
  currentFilters,
  onLoad,
}: BookmarkManagerProps) {
  const [bookmarks, setBookmarks] = useState<BookmarkEntry[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [showSaveForm, setShowSaveForm] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setBookmarks(JSON.parse(saved));
      } catch { /* ignore parse error */ }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bookmarks));
  }, [bookmarks]);

  const saveBookmark = useCallback(() => {
    if (!newName.trim()) return;
    const entry: BookmarkEntry = {
      id: crypto.randomUUID(),
      name: newName.trim(),
      timestamp: new Date().toISOString(),
      filters: { ...currentFilters },
    };
    setBookmarks((prev) => [entry, ...prev]);
    setNewName("");
    setShowSaveForm(false);
  }, [newName, currentFilters]);

  const deleteBookmark = useCallback((id: string) => {
    setBookmarks((prev) => prev.filter((b) => b.id !== id));
  }, []);

  const loadBookmark = useCallback(
    (entry: BookmarkEntry) => {
      onLoad(entry.filters);
      setIsOpen(false);
    },
    [onLoad]
  );

  const filterSummary = (filters: Record<string, unknown>) => {
    const parts: string[] = [];
    if (filters.period && filters.period !== "all") {
      const periodLabels: Record<string, string> = {
        today: "Hoje",
        "7days": "Últimos 7 dias",
        "30days": "Últimos 30 dias",
        thisMonth: "Este Mês",
        thisQuarter: "Este Trimestre",
        thisYear: "Este Ano",
      };
      parts.push(periodLabels[filters.period as string] || String(filters.period));
    }
    if (filters.category && filters.category !== "all")
      parts.push(String(filters.category));
    if (filters.costCenter && filters.costCenter !== "all")
      parts.push(String(filters.costCenter));
    if (filters.search) parts.push(`"${filters.search}"`);
    return parts.length > 0 ? parts.join(" · ") : "Todos os dados";
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="border-amber-200 text-amber-700 hover:bg-amber-50"
        onClick={() => setIsOpen(true)}
      >
        <Bookmark className="w-4 h-4 mr-2" />
        Favoritos
        {bookmarks.length > 0 && (
          <Badge className="ml-1.5 bg-amber-100 text-amber-700 hover:bg-amber-100 text-[10px] px-1.5">
            {bookmarks.length}
          </Badge>
        )}
      </Button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setIsOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white rounded-xl border border-slate-200 shadow-2xl max-w-md w-full max-h-[80vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <BookmarkPlus className="w-5 h-5 text-amber-600" />
                  <h3 className="font-semibold text-slate-800">Favoritos</h3>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <div className="p-5 space-y-4 overflow-y-auto max-h-[calc(80vh-80px)]">
                <div>
                  {!showSaveForm ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full border-amber-200 text-amber-700 hover:bg-amber-50"
                      onClick={() => setShowSaveForm(true)}
                    >
                      <BookmarkPlus className="w-4 h-4 mr-2" />
                      Salvar Filtros Atuais
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Input
                        placeholder="Nome do favorito..."
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && saveBookmark()}
                        className="h-8 text-sm flex-1"
                        autoFocus
                      />
                      <Button
                        size="sm"
                        className="h-8 bg-emerald-600 hover:bg-emerald-700"
                        onClick={saveBookmark}
                      >
                        <Check className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8"
                        onClick={() => {
                          setShowSaveForm(false);
                          setNewName("");
                        }}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>

                {currentFilters && Object.keys(currentFilters).length > 0 && (
                  <Card className="border-slate-100 bg-slate-50/50">
                    <CardContent className="p-3">
                      <p className="text-[10px] font-medium text-slate-500 mb-1">
                        Filtros atuais
                      </p>
                      <p className="text-xs text-slate-600">
                        {filterSummary(currentFilters)}
                      </p>
                    </CardContent>
                  </Card>
                )}

                {bookmarks.length === 0 ? (
                  <div className="text-center py-10">
                    <Bookmark className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                    <p className="text-sm text-slate-400">
                      Nenhum favorito salvo
                    </p>
                    <p className="text-xs text-slate-300 mt-1">
                      Salve combinações de filtros para acesso rápido
                    </p>
                  </div>
                ) : (
                  <ScrollArea className="max-h-64">
                    <div className="space-y-2">
                      <AnimatePresence>
                        {bookmarks.map((bookmark) => (
                          <motion.div
                            key={bookmark.id}
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, x: 30 }}
                            className="flex items-start justify-between p-3 rounded-lg border border-slate-200 hover:border-amber-300 hover:bg-amber-50/30 transition-colors group"
                          >
                            <div
                              className="flex-1 min-w-0 cursor-pointer"
                              onClick={() => loadBookmark(bookmark)}
                            >
                              <p className="text-sm font-medium text-slate-800 truncate">
                                {bookmark.name}
                              </p>
                              <p className="text-xs text-slate-500 mt-0.5">
                                {filterSummary(bookmark.filters)}
                              </p>
                              <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                                <Clock className="w-2.5 h-2.5" />
                                {new Date(bookmark.timestamp).toLocaleString(
                                  "pt-BR"
                                )}
                              </p>
                            </div>
                            <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-slate-400 hover:text-amber-600"
                                onClick={() => loadBookmark(bookmark)}
                              >
                                <Download className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-slate-400 hover:text-rose-500"
                                onClick={() => deleteBookmark(bookmark.id)}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  </ScrollArea>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
