import { useState, useRef } from "react";
import { Upload, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import ExcelJS from "exceljs";
import type { Colaborador } from "@/data/efetivoData";

interface ImportEfetivoExcelButtonProps {
  colaboradores: Colaborador[];
  onImport: (updated: Colaborador[]) => void;
}

const normalizeText = (text: string) =>
  text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toUpperCase();

const normalizeCpf = (cpf: string) => cpf.replace(/\D/g, "");

interface ImportPreview {
  finalList: Colaborador[];
  addedCount: number;
  updatedCount: number;
  removedCount: number;
  skippedDemitidos: number;
}

function parseExcel(
  workbook: ExcelJS.Workbook,
  colaboradores: Colaborador[]
): ImportPreview | string {
  const worksheet = workbook.worksheets[0];
  if (!worksheet) return "Planilha vazia ou inválida";

  // Detect header row
  let headerRowIndex = 1;
  const headerKeywords = ["nome", "colaborador", "funcao", "função", "cpf", "matricula", "matrícula", "situacao", "situação", "status"];

  for (let i = 1; i <= Math.min(10, worksheet.rowCount); i++) {
    const row = worksheet.getRow(i);
    const rowValues = row.values as (string | undefined)[];
    const rowText = rowValues
      .filter(Boolean)
      .map((v) => normalizeText(String(v)))
      .join(" ");
    if (headerKeywords.some((kw) => rowText.includes(normalizeText(kw)))) {
      headerRowIndex = i;
      break;
    }
  }

  // Map header columns with flexible detection
  const headerRow = worksheet.getRow(headerRowIndex);
  const colMap: Record<string, number> = {};

  headerRow.eachCell((cell, colNumber) => {
    const val = normalizeText(String(cell.value || ""));
    // Name column: "COLABORADOR" or "NOME"
    if (!colMap.nome && (val.includes("COLABORADOR") || val.includes("NOME"))) colMap.nome = colNumber;
    else if (!colMap.funcao && (val.includes("FUNCAO") || val.includes("FUNÇÃO") || val.includes("CARGO"))) colMap.funcao = colNumber;
    else if (!colMap.cpf && val.includes("CPF")) colMap.cpf = colNumber;
    else if (!colMap.dataNascimento && val.includes("NASCIMENTO")) colMap.dataNascimento = colNumber;
    else if (!colMap.admissao && (val.includes("ADMISSAO") || val.includes("ADMISSÃO"))) colMap.admissao = colNumber;
    else if (!colMap.matricula && (val.includes("MATRICULA") || val.includes("MATRÍCULA"))) colMap.matricula = colNumber;
    else if (!colMap.contato && (val.includes("CONTATO") || val.includes("TELEFONE") || val.includes("CELULAR"))) colMap.contato = colNumber;
    else if (!colMap.localidade && (val.includes("LOCALIDADE") || val.includes("CIDADE") || val.includes("LOCAL"))) colMap.localidade = colNumber;
    else if (!colMap.situacao && (val.includes("SITUACAO") || val.includes("SITUAÇÃO") || val.includes("STATUS"))) colMap.situacao = colNumber;
  });

  if (!colMap.nome) {
    return "Coluna 'Nome' ou 'Colaborador' não encontrada na planilha. Verifique o cabeçalho.";
  }

  const getCellString = (row: ExcelJS.Row, col: number | undefined): string => {
    if (!col) return "";
    const cell = row.getCell(col);
    if (!cell.value) return "";
    if (cell.value instanceof Date) {
      const d = cell.value;
      return `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}/${d.getUTCFullYear()}`;
    }
    return String(cell.value).trim();
  };

  // Parse rows from Excel
  const importedEmployees: (Omit<Colaborador, "id"> & { situacao?: string })[] = [];
  let skippedDemitidos = 0;

  for (let i = headerRowIndex + 1; i <= worksheet.rowCount; i++) {
    const row = worksheet.getRow(i);
    const nome = getCellString(row, colMap.nome);
    if (!nome) continue;

    const situacao = getCellString(row, colMap.situacao);
    const sitNorm = normalizeText(situacao);

    // Skip demitidos
    if (sitNorm.includes("DEMITIDO") || sitNorm.includes("DESLIGADO") || sitNorm.includes("INATIVO")) {
      skippedDemitidos++;
      continue;
    }

    const rawMatricula = getCellString(row, colMap.matricula);
    // If matricula looks like Hydro (5 digits) or is the only one provided
    const isHydro = rawMatricula.length >= 5;

    importedEmployees.push({
      nome,
      funcao: getCellString(row, colMap.funcao) || "AJUDANTE",
      cpf: getCellString(row, colMap.cpf),
      dataNascimento: getCellString(row, colMap.dataNascimento),
      admissao: getCellString(row, colMap.admissao),
      matricula: isHydro ? "" : rawMatricula,
      matriculaHydro: isHydro ? rawMatricula : "",
      contato: getCellString(row, colMap.contato),
      localidade: getCellString(row, colMap.localidade) || "BARCARENA - PA",
    });
  }

  if (importedEmployees.length === 0) {
    return "Nenhum colaborador ativo encontrado na planilha";
  }

  // Build lookup maps for existing employees
  const existingByCpf = new Map<string, number>();
  const existingByMatricula = new Map<string, number>();
  const existingByName = new Map<string, number>();

  colaboradores.forEach((c) => {
    if (c.cpf) existingByCpf.set(normalizeCpf(c.cpf), c.id);
    if (c.matricula) existingByMatricula.set(c.matricula.trim(), c.id);
    existingByName.set(normalizeText(c.nome), c.id);
  });

  let maxId = Math.max(...colaboradores.map((c) => c.id), 0);
  // Start with an empty map — only employees from the spreadsheet will remain
  const resultMap = new Map<number, Colaborador>();
  const matchedExistingIds = new Set<number>();
  let addedCount = 0;
  let updatedCount = 0;

  for (const emp of importedEmployees) {
    // Find existing match by CPF → matricula → name
    let existingId: number | undefined;
    if (emp.cpf) existingId = existingByCpf.get(normalizeCpf(emp.cpf));
    if (existingId === undefined && emp.matricula) existingId = existingByMatricula.get(emp.matricula.trim());
    if (existingId === undefined) existingId = existingByName.get(normalizeText(emp.nome));

    if (existingId !== undefined && !matchedExistingIds.has(existingId)) {
      // Update existing — preserve ASO, promocoes and other saved data
      const existing = colaboradores.find(c => c.id === existingId)!;
      const updated: Colaborador = {
        ...existing,
        nome: emp.nome || existing.nome,
        funcao: emp.funcao || existing.funcao,
        cpf: emp.cpf || existing.cpf,
        dataNascimento: emp.dataNascimento || existing.dataNascimento,
        admissao: emp.admissao || existing.admissao,
        matricula: emp.matricula || existing.matricula,
        contato: emp.contato || existing.contato,
        localidade: emp.localidade || existing.localidade,
        // Sync admissional from spreadsheet if it exists and current value is missing
        aso: {
          ...existing.aso,
          admissional: (emp.admissao && (!existing.aso?.admissional || existing.aso.admissional === "-")) 
            ? emp.admissao 
            : (existing.aso?.admissional || "")
        } as any
      };
      resultMap.set(existingId, updated);
      matchedExistingIds.add(existingId);
      updatedCount++;
    } else if (!matchedExistingIds.has(existingId ?? -1)) {
      // New employee
      maxId++;
      const newEmp: Colaborador = { 
        ...emp, 
        id: maxId,
        aso: {
          admissional: emp.admissao || ""
        } as any
      };
      delete (newEmp as any).situacao;
      resultMap.set(maxId, newEmp);

      // Register for dedup within file
      if (emp.cpf) existingByCpf.set(normalizeCpf(emp.cpf), maxId);
      if (emp.matricula) existingByMatricula.set(emp.matricula.trim(), maxId);
      existingByName.set(normalizeText(emp.nome), maxId);
      addedCount++;
    }
  }

  const removedCount = colaboradores.length - matchedExistingIds.size;
  const finalList = Array.from(resultMap.values()).sort((a, b) => a.id - b.id);

  return { finalList, addedCount, updatedCount, removedCount, skippedDemitidos };
}

export function ImportEfetivoExcelButton({ colaboradores, onImport }: ImportEfetivoExcelButtonProps) {
  const [isImporting, setIsImporting] = useState(false);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      toast.error("Selecione um arquivo Excel (.xlsx ou .xls)");
      return;
    }

    setIsImporting(true);
    try {
      const buffer = await file.arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);

      const result = parseExcel(workbook, colaboradores);

      if (typeof result === "string") {
        toast.error(result);
        setIsImporting(false);
        return;
      }

      // Show confirmation dialog
      setPreview(result);
    } catch (error) {
      console.error("Error importing Excel:", error);
      toast.error("Erro ao importar planilha. Verifique o formato do arquivo.");
    } finally {
      setIsImporting(false);
    }
  };

  const handleConfirm = () => {
    if (!preview) return;
    onImport(preview.finalList);

    const parts = [];
    if (preview.addedCount > 0) parts.push(`${preview.addedCount} adicionado${preview.addedCount > 1 ? "s" : ""}`);
    if (preview.updatedCount > 0) parts.push(`${preview.updatedCount} atualizado${preview.updatedCount > 1 ? "s" : ""}`);
    if (preview.removedCount > 0) parts.push(`${preview.removedCount} removido${preview.removedCount > 1 ? "s" : ""}`);
    if (preview.skippedDemitidos > 0) parts.push(`${preview.skippedDemitidos} demitido${preview.skippedDemitidos > 1 ? "s" : ""} ignorado${preview.skippedDemitidos > 1 ? "s" : ""}`);
    toast.success(`Importação concluída: ${parts.join(", ")}`);
    setPreview(null);
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls"
        className="hidden"
        onChange={handleFileChange}
      />
      <Button
        variant="outline"
        size="sm"
        onClick={handleClick}
        disabled={isImporting}
        className="gap-2"
        title="Importar planilha Efetivo Hydro Alunorte"
      >
        {isImporting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Upload className="h-4 w-4" />
        )}
        <span className="hidden sm:inline">Importar Excel</span>
      </Button>

      <AlertDialog open={!!preview} onOpenChange={() => setPreview(null)}>
        <AlertDialogContent className="w-[95vw] sm:w-full max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar importação</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>A planilha será sincronizada com o RH. Colaboradores que não constam na planilha serão removidos.</p>
                <ul className="list-disc pl-5 text-sm space-y-1">
                  {preview && preview.addedCount > 0 && (
                    <li className="text-green-600">{preview.addedCount} novo{preview.addedCount > 1 ? "s" : ""} será{preview.addedCount > 1 ? "ão" : ""} adicionado{preview.addedCount > 1 ? "s" : ""}</li>
                  )}
                  {preview && preview.updatedCount > 0 && (
                    <li className="text-blue-600">{preview.updatedCount} será{preview.updatedCount > 1 ? "ão" : ""} atualizado{preview.updatedCount > 1 ? "s" : ""}</li>
                  )}
                  {preview && preview.removedCount > 0 && (
                    <li className="text-destructive">{preview.removedCount} será{preview.removedCount > 1 ? "ão" : ""} removido{preview.removedCount > 1 ? "s" : ""}</li>
                  )}
                  {preview && preview.skippedDemitidos > 0 && (
                    <li className="text-muted-foreground">{preview.skippedDemitidos} demitido{preview.skippedDemitidos > 1 ? "s" : ""} ignorado{preview.skippedDemitidos > 1 ? "s" : ""}</li>
                  )}
                </ul>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
