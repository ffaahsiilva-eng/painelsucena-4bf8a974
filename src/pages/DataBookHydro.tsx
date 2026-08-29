import { useState, useEffect } from "react";
import Layout from "@/components/layout/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/useUserRole";
import { toast } from "sonner";
import { FileSpreadsheet, FileText, Save, Search, Loader2, Lock, Unlock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ExcelJS from "exceljs";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import dataBookSeed from "@/data/dataBookHydroSeed.json";

interface DataBookItem {
  id: string;
  item_number: string;
  content: string;
  responsible: string;
}

const DataBookHydro = () => {
  const [items, setItems] = useState<DataBookItem[]>([]);
  const [originalItems, setOriginalItems] = useState<DataBookItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedResponsible, setSelectedResponsible] = useState("all");
  const [isEditing, setIsEditing] = useState(false);

  const { isAdmin, role } = useIsAdmin();
  const isAllowedToEdit = isAdmin || role === "Tecnico de Segurança" || role === "Técnico de Segurança" || role === "admin";

  const uniqueResponsibles = Array.from(new Set(items.map(i => i.responsible).filter(Boolean))).sort();

  useEffect(() => {
    fetchDataBook();
  }, []);

  const fetchDataBook = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("data_book_hydro")
        .select("*")
        .order("item_number");
        
      if (error) {
        console.warn("Supabase table error/missing, using local fallback:", error.message);
        loadLocalFallback();
        return;
      }
      
      if (data && data.length > 0) {
        const sortedData = data.sort((a, b) => {
           return a.item_number.localeCompare(b.item_number, undefined, { numeric: true, sensitivity: 'base' });
        });
        setItems(sortedData);
        setOriginalItems(JSON.parse(JSON.stringify(sortedData))); 
      } else {
        // Table exists but is empty
        loadLocalFallback();
      }
    } catch (err) {
      console.warn("Unexpected error, using local fallback:", err);
      loadLocalFallback();
    } finally {
      setLoading(false);
    }
  };

  const loadLocalFallback = () => {
    try {
      const localData = localStorage.getItem("data_book_hydro_local");
      let dataToLoad = dataBookSeed;
      
      if (localData) {
        dataToLoad = JSON.parse(localData);
      }
      
      const sortedData = dataToLoad.sort((a: any, b: any) => {
         return (a.item_number || "").localeCompare(b.item_number || "", undefined, { numeric: true, sensitivity: 'base' });
      });
      
      setItems(sortedData as DataBookItem[]);
      setOriginalItems(JSON.parse(JSON.stringify(sortedData)));
      toast.info("Atenção: Carregando dados locais. Tabela não encontrada na nuvem.", { duration: 5000 });
    } catch (e) {
      console.error(e);
      setItems([]);
    }
  };

  const handleCellChange = (id: string, field: keyof DataBookItem, value: string) => {
    setItems((prevItems) =>
      prevItems.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      // Find modified items
      const modifiedItems = items.filter((item, index) => {
        const orig = originalItems.find(o => o.id === item.id);
        if (!orig) return false;
        return (
          orig.item_number !== item.item_number ||
          orig.content !== item.content ||
          orig.responsible !== item.responsible
        );
      });

      if (modifiedItems.length === 0) {
        toast.info("Nenhuma alteração para salvar.");
        return;
      }

      // Upsert modified items to supabase
      const { error } = await supabase
        .from("data_book_hydro")
        .upsert(modifiedItems.map(item => ({
          id: item.id,
          item_number: item.item_number,
          content: item.content,
          responsible: item.responsible,
          updated_at: new Date().toISOString()
        })));

      if (error) {
        console.warn("Supabase save failed, saving locally:", error);
        localStorage.setItem("data_book_hydro_local", JSON.stringify(items));
        toast.success("Alterações salvas (Localmente)");
      } else {
        toast.success("Alterações salvas com sucesso!");
      }

      setOriginalItems(JSON.parse(JSON.stringify(items))); // Update reference
      setIsEditing(false);
    } catch (err) {
      console.error(err);
      // Fallback local save if completely disconnected
      localStorage.setItem("data_book_hydro_local", JSON.stringify(items));
      toast.success("Alterações salvas (Localmente - Modo Offline)");
      setOriginalItems(JSON.parse(JSON.stringify(items)));
      setIsEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const exportToExcel = async () => {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('DATA BOOK');

      // Title row
      worksheet.mergeCells('A1:C1');
      const titleCell = worksheet.getCell('A1');
      titleCell.value = 'Data Book Hydro -Alunorte';
      titleCell.font = { bold: true, size: 14 };
      titleCell.alignment = { horizontal: 'center' };

      // Header row
      const headers = ['ITEM', 'CONTEÚDO', 'RESPONSÁVEL'];
      worksheet.addRow(headers);
      const headerRow = worksheet.getRow(2);
      headerRow.font = { bold: true };
      headerRow.eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE0E0E0' }
        };
      });

      // Data rows (filtered)
      filteredItems.forEach(item => {
        worksheet.addRow([item.item_number, item.content, item.responsible]);
      });

      // Column widths
      worksheet.getColumn(1).width = 15;
      worksheet.getColumn(2).width = 70;
      worksheet.getColumn(3).width = 25;

      // Save blob
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'DATA_BOOK_HYDRO.xlsx';
      a.click();
      window.URL.revokeObjectURL(url);
      
      toast.success("Excel exportado com sucesso!");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao exportar Excel");
    }
  };

  const exportToPDF = () => {
    try {
      const doc = new jsPDF('landscape');
      
      doc.setFontSize(16);
      doc.text("Data Book Hydro - Alunorte", 14, 15);
      
      const tableData = filteredItems.map(item => [
        item.item_number, 
        item.content, 
        item.responsible
      ]);

      autoTable(doc, {
        head: [['Item', 'Conteúdo', 'Responsável']],
        body: tableData,
        startY: 20,
        styles: { fontSize: 10, cellPadding: 3 },
        columnStyles: {
          0: { cellWidth: 30 },
          1: { cellWidth: 150 },
          2: { cellWidth: 50 },
        },
        headStyles: { fillColor: [43, 47, 49] } // Dark header
      });

      doc.save("DATA_BOOK_HYDRO.pdf");
      toast.success("PDF exportado com sucesso!");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao exportar PDF");
    }
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = item.content?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.responsible?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.item_number?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesResponsible = selectedResponsible === "all" || item.responsible === selectedResponsible;
    return matchesSearch && matchesResponsible;
  });

  return (
    <Layout>
      <div className="container mx-auto px-4 sm:px-8 py-6 sm:py-10 max-w-7xl animate-fade-in">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100 modern-text-black">
              Data Book Hydro
            </h1>
            <p className="text-muted-foreground mt-1">
              Visualize, filtre e edite as informações do Data Book de Responsáveis.
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            {isAllowedToEdit && (
              <Button 
                variant={isEditing ? "default" : "outline"}
                onClick={() => setIsEditing(!isEditing)} 
                className={`gap-2 ${isEditing ? "bg-slate-700 hover:bg-slate-800 text-white dark:bg-slate-600 dark:hover:bg-slate-500" : ""}`}
              >
                {isEditing ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                <span className="hidden sm:inline">{isEditing ? "Modo Edição (Aberto)" : "Editar"}</span>
              </Button>
            )}
            <Button variant="outline" onClick={exportToExcel} className="gap-2">
              <FileSpreadsheet className="h-4 w-4 text-green-600" />
              <span className="hidden sm:inline">Exportar</span> Excel
            </Button>
            <Button variant="outline" onClick={exportToPDF} className="gap-2">
              <FileText className="h-4 w-4 text-red-500" />
              <span className="hidden sm:inline">Exportar</span> PDF
            </Button>
            {isEditing && (
              <Button onClick={handleSave} disabled={saving} className="gap-2 bg-[#c9a84c] hover:bg-[#b68a46] text-slate-900">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Salvar Alterações
              </Button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-slate-200 p-4 rounded-xl border border-slate-200 dark:border-slate-300 mb-6 shadow-sm flex flex-col sm:flex-row items-center gap-4">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar por conteúdo, item ou responsável..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          
          <div className="w-full sm:w-64">
            <Select value={selectedResponsible} onValueChange={setSelectedResponsible}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por Categoria (Responsável)" />
              </SelectTrigger>
              <SelectContent className="text-slate-900 dark:text-slate-100">
                <SelectItem value="all" className="text-slate-900 dark:text-slate-100">Todas as Categorias</SelectItem>
                {uniqueResponsibles.map((resp) => (
                  <SelectItem key={resp} value={resp} className="text-slate-900 dark:text-slate-100">
                    {resp}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-white dark:bg-slate-200 rounded-xl border border-slate-200 dark:border-slate-300 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-12 flex flex-col items-center justify-center text-muted-foreground dark:text-slate-600">
                <Loader2 className="h-8 w-8 animate-spin mb-4" />
                <p>Carregando dados...</p>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground dark:text-slate-600">
                Nenhum registro encontrado para esta busca.
              </div>
            ) : (
              <table className="w-full text-sm text-left force-black-text">
                <thead className="text-xs uppercase bg-slate-50 dark:bg-slate-300">
                  <tr>
                    <th className="px-4 py-3 font-medium w-[15%]">Item</th>
                    <th className="px-4 py-3 font-medium w-[60%]">Conteúdo</th>
                    <th className="px-4 py-3 font-medium w-[25%]">Responsável</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-300">
                  {filteredItems.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-300/50 transition-colors">
                      <td className="px-4 py-2 align-top">
                        {isEditing ? (
                          <Input 
                            value={item.item_number} 
                            onChange={(e) => handleCellChange(item.id, 'item_number', e.target.value)}
                            className="h-8 border-transparent hover:border-slate-300 focus:border-[#c9a84c] focus:ring-1 focus:ring-[#c9a84c] px-2 dark:bg-white/50"
                          />
                        ) : (
                          <div className="px-2 py-1">{item.item_number}</div>
                        )}
                      </td>
                      <td className="px-4 py-2 align-top">
                        {isEditing ? (
                          <textarea 
                            value={item.content} 
                            onChange={(e) => handleCellChange(item.id, 'content', e.target.value)}
                            className="w-full min-h-[40px] text-sm bg-transparent border border-transparent hover:border-slate-300 focus:border-[#c9a84c] focus:ring-1 focus:ring-[#c9a84c] rounded-md px-2 py-1 resize-y dark:bg-white/50"
                            rows={1}
                          />
                        ) : (
                          <div className="px-2 py-1 whitespace-pre-wrap text-sm">{item.content}</div>
                        )}
                      </td>
                      <td className="px-4 py-2 align-top">
                        {isEditing ? (
                          <Input 
                            value={item.responsible} 
                            onChange={(e) => handleCellChange(item.id, 'responsible', e.target.value)}
                            className="h-8 border-transparent hover:border-slate-300 focus:border-[#c9a84c] focus:ring-1 focus:ring-[#c9a84c] px-2 dark:bg-white/50"
                          />
                        ) : (
                          <div className="px-2 py-1">{item.responsible}</div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

      </div>
    </Layout>
  );
};

export default DataBookHydro;
