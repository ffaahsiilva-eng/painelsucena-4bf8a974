import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Search, Plus, Shield, GraduationCap, Save } from "lucide-react";
import { toast } from "sonner";
import { useIsAdmin } from "@/hooks/useUserRole";
import { useEnvironment } from "@/hooks/useEnvironment";
import { NrFileUpload } from "@/components/rh/NrFileUpload";
import { ManageNrCatalogDialog } from "@/components/rh/ManageNrCatalogDialog";

const NrRow = ({ collaborator, nrObj, record, updateRecordMut, selectedNr }: any) => {
  const colabId = collaborator.id ? String(collaborator.id) : null;
  const dbRowId = collaborator.id_supabase ? String(collaborator.id_supabase) : null;
  const [issueDate, setIssueDate] = useState(record?.issue_date ? record.issue_date.split('-').reverse().join('/') : "");
  const [expiryDate, setExpiryDate] = useState(record?.expiry_date ? record.expiry_date.split('-').reverse().join('/') : "");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setIssueDate(record?.issue_date ? record.issue_date.split('-').reverse().join('/') : "");
    setExpiryDate(record?.expiry_date ? record.expiry_date.split('-').reverse().join('/') : "");
  }, [record]);

  const handleDateChange = (val: string, field: string) => {
    let digits = val.replace(/\D/g, "");
    if (digits.length > 8) digits = digits.slice(0, 8);
    
    let formatted = digits;
    if (digits.length >= 5) formatted = `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
    else if (digits.length >= 3) formatted = `${digits.slice(0, 2)}/${digits.slice(2)}`;
    
    if (field === 'issue_date') setIssueDate(formatted);
    else setExpiryDate(formatted);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (!colabId || !dbRowId) {
        toast.error("Erro: Dados do colaborador incompletos.");
        return;
      }

      const payload: any = {
        collaborator_id: colabId,
        nr_id: nrObj.id,
        db_row_id: dbRowId,
      };

      if (issueDate && issueDate.length === 10) {
        const [id, im, iy] = issueDate.split('/');
        payload.issue_date = `${iy}-${im}-${id}`;
      } else {
        payload.issue_date = null;
      }
      
      if (expiryDate && expiryDate.length === 10) {
        const [ed, em, ey] = expiryDate.split('/');
        payload.expiry_date = `${ey}-${em}-${ed}`;
      } else {
        payload.expiry_date = null;
      }

      await updateRecordMut.mutateAsync(payload);
    } catch (error) {
      console.error("Erro ao salvar:", error);
      toast.error("OCORREU erro ao salvar");
    } finally {
      setIsSaving(false);
    }
  };

  const hasRecord = !!record;

  return (
    <tr className={`hover:bg-muted/30 transition-colors ${!hasRecord ? 'bg-yellow-500/5' : ''}`}>
      <td className="px-4 py-3 font-medium text-xs sm:text-sm">{collaborator.nome}</td>
      <td className="px-4 py-3">
        <Input 
          type="text" 
          placeholder="dd/mm/aaaa"
          className="h-8 w-32 text-xs"
          value={issueDate}
          onChange={(e) => handleDateChange(e.target.value, 'issue_date')}
        />
      </td>
      <td className="px-4 py-3">
         <Input 
          type="text" 
          placeholder="dd/mm/aaaa"
          className="h-8 w-32 text-xs"
          value={expiryDate}
          onChange={(e) => handleDateChange(e.target.value, 'expiry_date')}
        />
      </td>
      <td className="px-4 py-3 text-center">
        <NrFileUpload
          colaboradorId={colabId}
          nrCode={selectedNr}
          currentUrl={record?.document_url}
          onUploadComplete={(url: string) => {
            if (colabId && dbRowId) {
              updateRecordMut.mutate({
                collaborator_id: colabId,
                nr_id: nrObj.id,
                db_row_id: dbRowId,
                document_url: url
              });
            }
          }}
          onRemove={() => {
            if (colabId && dbRowId) {
              updateRecordMut.mutate({
                collaborator_id: colabId,
                nr_id: nrObj.id,
                db_row_id: dbRowId,
                document_url: null
              });
            }
          }}
        />
      </td>
      <td className="px-4 py-3 text-center">
        <Button 
          size="icon" 
          variant="ghost" 
          className="h-8 w-8 text-green-500 hover:text-green-600 hover:bg-green-500/10"
          onClick={handleSave}
          disabled={isSaving}
        >
          <Save className="h-4 w-4" />
        </Button>
      </td>
    </tr>
  );
};

export const NrManagementTab = () => {
  const [search, setSearch] = useState("");
  const [selectedNr, setSelectedNr] = useState<string | null>(null);
  const { isAdmin } = useIsAdmin();
  const { environment } = useEnvironment();
  const queryClient = useQueryClient();

  const { data: nrs, isLoading: loadingCatalog } = useQuery({
    queryKey: ["nr_catalog"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("nr_catalog")
        .select("*")
        .order("nr_code", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const { data: collaborators = [], isLoading: loadingColabs } = useQuery({
    queryKey: ["rh_efetivo_all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rh_efetivo")
        .select("id, colaboradores, deleted_ids");
      if (error) throw error;
      
      const allColabsMap = new Map<string, any>();
      data?.forEach(row => {
        const colabs = (row.colaboradores as any[]) || [];
        const deletedIds = (row.deleted_ids as number[]) || [];
        colabs.forEach(c => {
          if (!deletedIds.includes(c.id)) {
            const key = `${c.nome}-${c.funcao}`;
            if (!allColabsMap.has(key)) {
              allColabsMap.set(key, { ...c, id_supabase: row.id });
            }
          }
        });
      });
      
      return Array.from(allColabsMap.values()).sort((a, b) => a.nome.localeCompare(b.nome));
    },
  });

  const { data: records = [], isLoading: loadingRecords } = useQuery({
    queryKey: ["nr_records_all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("nr_records")
        .select("*, nr_catalog(nr_code)");
      if (error) throw error;
      return data;
    },
  });

  const filteredColaboradores = useMemo(() => {
    if (!selectedNr) return [];
    const nrObj = nrs?.find(n => n.nr_code === selectedNr);
    if (!nrObj) return [];

    const term = search.toLowerCase();
    
    if (term.length > 0) {
      return collaborators.filter(c => c.nome.toLowerCase().includes(term));
    }

    const withRecords = collaborators.filter(c => {
      return records.some(r => r.collaborator_id === String(c.id) && r.db_row_id === String(c.id_supabase) && r.nr_id === nrObj.id);
    });

    return withRecords;
  }, [selectedNr, collaborators, records, nrs, search]);

  const updateRecordMut = useMutation({
    mutationFn: async (payload: { collaborator_id: string, nr_id: string, db_row_id: string, [key: string]: any }) => {
      const { data: existing, error: fetchError } = await supabase
        .from("nr_records")
        .select("id")
        .eq("collaborator_id", payload.collaborator_id)
        .eq("db_row_id", payload.db_row_id)
        .eq("nr_id", payload.nr_id)
        .maybeSingle();

      if (fetchError) throw fetchError;

      const { collaborator_id, nr_id, db_row_id, ...updateData } = payload;
      
      if (existing) {
        const { error: updateError } = await supabase
          .from("nr_records")
          .update({ ...updateData, updated_at: new Date().toISOString() })
          .eq("id", existing.id);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from("nr_records")
          .insert({
            collaborator_id,
            nr_id,
            db_row_id,
            environment: environment || 'BARCARENA',
            ...updateData
          });
        if (insertError) throw insertError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["nr_records_all"] });
      toast.success("Dados da NR atualizados");
    },
    onError: (error) => {
      console.error("Mutation failed:", error);
      toast.error("OCORREU erro ao salvar");
    }
  });

  if (loadingCatalog || loadingColabs || loadingRecords) return <div className="p-8 text-center">Carregando...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {nrs?.map((nr) => (
          <Button
            key={nr.id}
            variant={selectedNr === nr.nr_code ? "default" : "outline"}
            onClick={() => setSelectedNr(nr.nr_code)}
            className="gap-2"
          >
            <Shield className="w-4 h-4" />
            {nr.nr_code}
          </Button>
        ))}
        {isAdmin && (
           <ManageNrCatalogDialog>
             <Button variant="ghost" size="icon" className="rounded-full border border-dashed bg-black/40 hover:bg-black/60">
                <Plus className="w-4 h-4" />
             </Button>
           </ManageNrCatalogDialog>
        )}
      </div>

      {selectedNr ? (
        <div className="space-y-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar colaborador..."
              className="pl-9"
            />
          </div>

          <Card className="overflow-hidden border-yellow-500/20">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr className="text-left">
                    <th className="px-4 py-3 font-semibold">Colaborador</th>
                    <th className="px-4 py-3 font-semibold">Realização</th>
                    <th className="px-4 py-3 font-semibold">Vencimento</th>
                    <th className="px-4 py-3 font-semibold text-center">Documento</th>
                    <th className="px-4 py-3 font-semibold text-center w-16">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredColaboradores.map((c) => {
                    const nrObj = nrs?.find(n => n.nr_code === selectedNr)!;
                    const record = records.find(r => r.collaborator_id === String(c.id) && r.db_row_id === String(c.id_supabase) && r.nr_id === nrObj.id);
                    
                    return (
                      <NrRow 
                        key={`${selectedNr}-${c.id}`}
                        collaborator={c}
                        nrObj={nrObj}
                        record={record}
                        updateRecordMut={updateRecordMut}
                        selectedNr={selectedNr}
                      />
                    );
                  })}
                  {filteredColaboradores.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground italic">
                        {search ? "Nenhum colaborador encontrado." : `Nenhum colaborador com ${selectedNr} registrado. Use a busca para encontrar e adicionar.`}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <GraduationCap className="w-12 h-12 mb-4 opacity-20" />
          <p className="text-center px-4">
            Ao selecionar NR ira lista em baixo todos os colaboradores com a NR selecionada.
            <br />
            <span className="text-xs opacity-60">
              Todas as NRs seram exibidas no resumo de Treinamentos de cada colaborador individualmente.
              Com proximo vencimento e NRs que colaborador foi adicioando.
            </span>
          </p>
        </div>
      )}
    </div>
  );
};