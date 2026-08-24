import { useMemo, useState } from "react";
import Layout from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { useIsAdmin } from "@/hooks/useUserRole";
import { useProfile } from "@/hooks/useProfile";
import { useEnvironment } from "@/hooks/useEnvironment";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Sprout, ArrowDownToLine, ArrowUpFromLine, History, Loader2, Trash2, FileImage, Download } from "lucide-react";
import { SignatureDialog } from "@/components/epi/SignatureDialog";

type ReceiptData = {
  tipo: string;
  qtd: number;
  prev: number;
  next: number;
  retirado: string;
  motivo: string;
  registrado: string;
  assinatura: string | null;
  dataStr: string;
};

const loadReceiptImage = (src?: string | null): Promise<HTMLImageElement | null> => {
  if (!src) return Promise.resolve(null);
  return new Promise((resolve) => {
    const img = new Image();
    if (!src.startsWith("data:")) img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
};

const drawWrappedText = (
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
) => {
  const words = text.split(/\s+/);
  let line = "";
  let currentY = y;

  words.forEach((word) => {
    const testLine = line ? `${line} ${word}` : word;
    if (ctx.measureText(testLine).width > maxWidth && line) {
      ctx.fillText(line, x, currentY);
      line = word;
      currentY += lineHeight;
    } else {
      line = testLine;
    }
  });

  if (line) ctx.fillText(line, x, currentY);
  return currentY + lineHeight;
};

const Adubo = () => {
  const { user } = useAuth();
  const { isAdmin } = useIsAdmin();
  const { data: profile } = useProfile();
  const { environment } = useEnvironment();
  const { settings } = useSiteSettings();
  const qc = useQueryClient();
  const [viewReceipt, setViewReceipt] = useState<string | null>(null);

  const [entradaOpen, setEntradaOpen] = useState(false);
  const [saidaOpen, setSaidaOpen] = useState(false);
  const [sigOpen, setSigOpen] = useState(false);

  const [qtdEntrada, setQtdEntrada] = useState("");
  const [reasonEntrada, setReasonEntrada] = useState("");

  const [qtdSaida, setQtdSaida] = useState("");
  const [reasonSaida, setReasonSaida] = useState("");

  const envKey = environment || "barcarena";

  const { data: estoque } = useQuery({
    queryKey: ["adubo-estoque", envKey],
    enabled: !!user && !!environment,
    queryFn: async () => {
      const { data } = await supabase
        .from("adubo_estoque" as never)
        .select("*")
        .eq("environment", envKey)
        .maybeSingle();
      return data as { id: string; quantity: number; unit: string } | null;
    },
  });

  const { data: movs } = useQuery({
    queryKey: ["adubo-movs", envKey],
    enabled: !!user && !!environment,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("adubo_movimentos" as never)
        .select("*")
        .eq("environment", envKey)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data || []) as Array<{
        id: string; movement_type: "entrada" | "saida"; quantity: number; unit: string;
        previous_quantity: number; new_quantity: number; reason: string | null;
        withdrawer_name: string | null; signature_data_url: string | null;
        registered_by: string; registered_by_name: string | null; created_at: string;
        receipt_data_url: string | null;
      }>;
    },
  });

  const saldoAtual = Number(estoque?.quantity ?? 0);
  const unidade = estoque?.unit || "un";

  const notifyGroup = async (movimento_id: string) => {
    try {
      await supabase.functions.invoke("wapi-adubo-notify", { body: { movimento_id } });
    } catch (e) {
      console.warn("[adubo-notify] falha ao enfileirar", e);
    }
  };

  const upsertEstoque = async (newQty: number) => {
    if (estoque?.id) {
      await supabase.from("adubo_estoque" as never)
        .update({ quantity: newQty, updated_by: user?.id, updated_at: new Date().toISOString() })
        .eq("id", estoque.id);
    } else {
      await supabase.from("adubo_estoque" as never)
        .insert({ environment: envKey, quantity: newQty, unit: unidade, updated_by: user?.id });
    }
  };

  const generateReceipt = async (data: ReceiptData, movId: string): Promise<string | null> => {
    try {
      const canvas = document.createElement("canvas");
      const width = 900;
      const height = data.assinatura ? 820 : 620;
      const scale = 2;
      canvas.width = width * scale;
      canvas.height = height * scale;
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;

      ctx.scale(scale, scale);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);

      const logo = await loadReceiptImage(settings.logo_url);
      const signature = await loadReceiptImage(data.assinatura);
      const margin = 48;

      if (logo) {
        const logoMaxW = 150;
        const logoMaxH = 76;
        const ratio = Math.min(logoMaxW / logo.width, logoMaxH / logo.height, 1);
        ctx.drawImage(logo, margin, 34, logo.width * ratio, logo.height * ratio);
      }

      ctx.fillStyle = "#065f46";
      ctx.font = "800 30px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
      ctx.fillText(`Comprovante de ${data.tipo}`, 240, 58);
      ctx.fillStyle = "#475569";
      ctx.font = "500 15px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
      ctx.fillText(`Controle de Adubo — ${(environment || "").toString().toUpperCase()}`, 240, 84);
      ctx.textAlign = "right";
      ctx.fillText(data.dataStr, width - margin, 58);
      ctx.textAlign = "left";

      ctx.strokeStyle = "#10b981";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(margin, 122);
      ctx.lineTo(width - margin, 122);
      ctx.stroke();

      const details = [
        ["Tipo", data.tipo],
        ["Quantidade", String(data.qtd)],
        ["Saldo anterior", String(data.prev)],
        ["Saldo atual", String(data.next)],
        ["Retirado por", data.retirado],
        ["Registrado por", data.registrado],
      ];

      let y = 168;
      ctx.fillStyle = "#0f172a";
      ctx.font = "700 17px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
      details.forEach(([label, value], index) => {
        const x = index % 2 === 0 ? margin : 480;
        const rowY = y + Math.floor(index / 2) * 44;
        ctx.fillStyle = "#0f172a";
        ctx.font = "700 17px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
        ctx.fillText(`${label}:`, x, rowY);
        ctx.font = "500 17px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
        ctx.fillText(value, x + 140, rowY);
      });

      y = 312;
      ctx.fillStyle = "#0f172a";
      ctx.font = "700 17px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
      ctx.fillText("Motivo / Destino:", margin, y);
      ctx.font = "500 17px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
      y = drawWrappedText(ctx, data.motivo, margin + 155, y, width - margin * 2 - 155, 24);

      if (data.assinatura) {
        y += 28;
        ctx.setLineDash([8, 6]);
        ctx.strokeStyle = "#cbd5e1";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(margin, y);
        ctx.lineTo(width - margin, y);
        ctx.stroke();
        ctx.setLineDash([]);

        y += 38;
        ctx.fillStyle = "#475569";
        ctx.font = "600 15px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
        ctx.fillText("Assinatura de quem retirou", margin, y);

        const boxX = margin;
        const boxY = y + 18;
        const boxW = width - margin * 2;
        const boxH = 230;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(boxX, boxY, boxW, boxH);
        ctx.strokeStyle = "#e2e8f0";
        ctx.lineWidth = 2;
        ctx.strokeRect(boxX, boxY, boxW, boxH);

        if (signature) {
          const pad = 18;
          const ratio = Math.min((boxW - pad * 2) / signature.width, (boxH - pad * 2) / signature.height);
          const sigW = signature.width * ratio;
          const sigH = signature.height * ratio;
          ctx.drawImage(signature, boxX + (boxW - sigW) / 2, boxY + (boxH - sigH) / 2, sigW, sigH);
        } else {
          ctx.fillStyle = "#991b1b";
          ctx.font = "600 15px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
          ctx.fillText("Assinatura não carregada. Gere o PNG novamente.", boxX + 18, boxY + 44);
        }

        ctx.strokeStyle = "#94a3b8";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(boxX + 80, boxY + boxH - 48);
        ctx.lineTo(boxX + boxW - 80, boxY + boxH - 48);
        ctx.stroke();
        ctx.fillStyle = "#0f172a";
        ctx.font = "600 16px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(data.retirado, boxX + boxW / 2, boxY + boxH - 22);
        ctx.textAlign = "left";
      }

      ctx.fillStyle = "#64748b";
      ctx.font = "500 13px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Documento gerado automaticamente pelo sistema — Sucena", width / 2, height - 38);

      const dataUrl = canvas.toDataURL("image/png");
      await supabase.from("adubo_movimentos" as never)
        .update({ receipt_data_url: dataUrl })
        .eq("id", movId);
      qc.invalidateQueries({ queryKey: ["adubo-movs", envKey] });
      return dataUrl;
    } catch (e) {
      console.warn("[adubo] falha ao gerar comprovante PNG", e);
      return null;
    }
  };

  const openReceipt = async (m: NonNullable<typeof movs>[number]) => {
    if (m.movement_type === "saida" && m.signature_data_url) {
      const regeneratedUrl = await generateReceipt({
        tipo: "RETIRADA",
        qtd: Number(m.quantity),
        prev: Number(m.previous_quantity),
        next: Number(m.new_quantity),
        retirado: m.withdrawer_name || "-",
        motivo: m.reason || "-",
        registrado: m.registered_by_name || "-",
        assinatura: m.signature_data_url,
        dataStr: new Date(m.created_at).toLocaleString("pt-BR", { timeZone: "America/Belem" }),
      }, m.id);
      setViewReceipt(regeneratedUrl || m.receipt_data_url || null);
      return;
    }

    setViewReceipt(m.receipt_data_url || null);
  };


  const entradaMut = useMutation({
    mutationFn: async () => {
      const q = Number(String(qtdEntrada).replace(",", "."));
      if (!q || q <= 0) throw new Error("Informe uma quantidade válida");
      const prev = saldoAtual;
      const next = prev + q;
      await upsertEstoque(next);
      const { data: mov, error } = await supabase.from("adubo_movimentos" as never)
        .insert({
          environment: envKey,
          movement_type: "entrada",
          quantity: q,
          previous_quantity: prev,
          new_quantity: next,
          unit: unidade,
          reason: reasonEntrada.trim() || null,
          registered_by: user!.id,
          registered_by_name: profile?.full_name || null,
        })
        .select("id")
        .single();
      if (error) throw error;
      const movId = (mov as { id: string }).id;
      await notifyGroup(movId);
      await generateReceipt({
        tipo: "ENTRADA",
        qtd: q, prev, next,
        retirado: "-",
        motivo: reasonEntrada.trim() || "-",
        registrado: profile?.full_name || user?.email || "-",
        assinatura: null,
        dataStr: new Date().toLocaleString("pt-BR", { timeZone: "America/Belem" }),
      }, movId);
    },
    onSuccess: () => {
      toast.success("Entrada de adubo registrada");
      setEntradaOpen(false);
      setQtdEntrada(""); setReasonEntrada("");
      qc.invalidateQueries({ queryKey: ["adubo-estoque", envKey] });
      qc.invalidateQueries({ queryKey: ["adubo-movs", envKey] });
    },
    onError: (e: Error) => toast.error(e.message || "Erro ao registrar entrada"),
  });




  const saidaMut = useMutation({
    mutationFn: async (signatureDataUrl: string) => {
      const q = Number(String(qtdSaida).replace(",", "."));
      if (!q || q <= 0) throw new Error("Informe uma quantidade válida");
      if (q > saldoAtual) throw new Error("Quantidade maior que o saldo disponível");
      const autoName = (profile?.full_name || user?.email || "").trim().toUpperCase();
      if (!autoName) throw new Error("Não foi possível identificar o usuário logado");
      const prev = saldoAtual;
      const next = prev - q;
      await upsertEstoque(next);
      const { data: mov, error } = await supabase.from("adubo_movimentos" as never)
        .insert({
          environment: envKey,
          movement_type: "saida",
          quantity: q,
          previous_quantity: prev,
          new_quantity: next,
          unit: unidade,
          reason: reasonSaida.trim() || null,
          withdrawer_name: autoName,
          signature_data_url: signatureDataUrl,
          registered_by: user!.id,
          registered_by_name: profile?.full_name || null,
        })
        .select("id")
        .single();
      if (error) throw error;
      const movId = (mov as { id: string }).id;
      await notifyGroup(movId);
      await generateReceipt({
        tipo: "RETIRADA",
        qtd: q, prev, next,
        retirado: autoName,
        motivo: reasonSaida.trim() || "-",
        registrado: profile?.full_name || user?.email || "-",
        assinatura: signatureDataUrl,
        dataStr: new Date().toLocaleString("pt-BR", { timeZone: "America/Belem" }),
      }, movId);
    },
    onSuccess: () => {
      toast.success("Retirada de adubo registrada");
      setSigOpen(false); setSaidaOpen(false);
      setQtdSaida(""); setReasonSaida("");
      qc.invalidateQueries({ queryKey: ["adubo-estoque", envKey] });
      qc.invalidateQueries({ queryKey: ["adubo-movs", envKey] });
    },
    onError: (e: Error) => { setSigOpen(false); toast.error(e.message || "Erro ao registrar retirada"); },
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("adubo_movimentos" as never).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Movimento removido");
      qc.invalidateQueries({ queryKey: ["adubo-movs", envKey] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const totalEntradas = useMemo(
    () => (movs || []).filter(m => m.movement_type === "entrada").reduce((s, m) => s + Number(m.quantity), 0),
    [movs]
  );
  const totalSaidas = useMemo(
    () => (movs || []).filter(m => m.movement_type === "saida").reduce((s, m) => s + Number(m.quantity), 0),
    [movs]
  );

  return (
    <Layout>
      <div className="min-h-[calc(100vh-4rem)] p-4 md:p-8 space-y-6">
        <div className="flex items-center gap-3 justify-center">
          <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500 to-green-700 text-white">
            <Sprout className="h-7 w-7" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-emerald-500">Adubo</h1>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-4xl mx-auto">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Saldo atual</CardTitle></CardHeader>
            <CardContent><div className="text-3xl font-bold text-emerald-500">{saldoAtual}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Entradas totais</CardTitle></CardHeader>
            <CardContent><div className="text-3xl font-bold">{totalEntradas}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Retiradas totais</CardTitle></CardHeader>
            <CardContent><div className="text-3xl font-bold">{totalSaidas}</div></CardContent>
          </Card>
        </div>

        <div className="flex flex-wrap gap-3 justify-center">
          {isAdmin && (
            <Button onClick={() => setEntradaOpen(true)} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
              <ArrowDownToLine className="h-4 w-4" /> Registrar Entrada (Admin)
            </Button>
          )}
          <Button onClick={() => setSaidaOpen(true)} variant="secondary" className="gap-2">
            <ArrowUpFromLine className="h-4 w-4" /> Registrar Retirada
          </Button>
        </div>

        <Card className="max-w-6xl mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><History className="h-5 w-5" /> Histórico</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table className="min-w-[900px] whitespace-nowrap">
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Quantidade</TableHead>
                  <TableHead>Saldo</TableHead>
                  <TableHead>Retirado por</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead>Registrado por</TableHead>
                  
                  <TableHead>Comprovante</TableHead>
                  {isAdmin && <TableHead></TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {(movs || []).map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="whitespace-nowrap">{new Date(m.created_at).toLocaleString("pt-BR", { timeZone: "America/Belem" })}</TableCell>
                    <TableCell>
                      <span className={m.movement_type === "entrada" ? "text-emerald-500 font-semibold" : "text-amber-500 font-semibold"}>
                        {m.movement_type === "entrada" ? "Entrada" : "Retirada"}
                      </span>
                    </TableCell>
                    <TableCell>{m.quantity}</TableCell>
                    <TableCell>{m.previous_quantity} → {m.new_quantity}</TableCell>
                    <TableCell>{m.withdrawer_name || "-"}</TableCell>
                    <TableCell className="max-w-[220px] truncate">{m.reason || "-"}</TableCell>
                    <TableCell>{m.registered_by_name || "-"}</TableCell>
                    <TableCell>
                      {m.receipt_data_url ? (
                        <Button size="sm" variant="outline" className="gap-1" onClick={() => openReceipt(m)}>
                          <FileImage className="h-4 w-4" /> Ver PNG
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1"
                          onClick={async () => {
                            const url = await generateReceipt({
                              tipo: m.movement_type === "entrada" ? "ENTRADA" : "RETIRADA",
                              qtd: Number(m.quantity),
                              prev: Number(m.previous_quantity),
                              next: Number(m.new_quantity),
                              retirado: m.withdrawer_name || "-",
                              motivo: m.reason || "-",
                              registrado: m.registered_by_name || "-",
                              assinatura: m.signature_data_url,
                              dataStr: new Date(m.created_at).toLocaleString("pt-BR", { timeZone: "America/Belem" }),
                            }, m.id);
                            if (url) setViewReceipt(url);
                            else toast.error("Falha ao gerar comprovante");
                          }}
                        >
                          <FileImage className="h-4 w-4" /> Gerar PNG
                        </Button>
                      )}
                    </TableCell>
                    {isAdmin && (
                      <TableCell>
                        <Button size="icon" variant="ghost" onClick={() => deleteMut.mutate(m.id)} disabled={deleteMut.isPending}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
                {(!movs || movs.length === 0) && (
                  <TableRow><TableCell colSpan={isAdmin ? 10 : 9} className="text-center text-muted-foreground py-8">Nenhum movimento registrado.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Entrada — Admin */}
      <Dialog open={entradaOpen} onOpenChange={setEntradaOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Registrar Entrada de Adubo</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Quantidade</Label>
              <Input type="number" min="0" step="0.01" value={qtdEntrada} onChange={(e) => setQtdEntrada(e.target.value)} placeholder="Ex: 500" />
            </div>
            <div>
              <Label>Motivo / Observação</Label>
              <Textarea value={reasonEntrada} onChange={(e) => setReasonEntrada(e.target.value)} rows={3} placeholder="Ex: Recebimento nota fiscal 12345" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEntradaOpen(false)}>Cancelar</Button>
            <Button onClick={() => entradaMut.mutate()} disabled={entradaMut.isPending} className="bg-emerald-600 hover:bg-emerald-700">
              {entradaMut.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirmar Entrada
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Saída — qualquer usuário */}
      <Dialog open={saidaOpen} onOpenChange={setSaidaOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Registrar Retirada de Adubo</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Quantidade — saldo: {saldoAtual}</Label>
              <Input type="number" min="0" step="0.01" value={qtdSaida} onChange={(e) => setQtdSaida(e.target.value)} placeholder="Ex: 20" />
            </div>
            <div>
              <Label>Motivo / Destino</Label>
              <Textarea value={reasonSaida} onChange={(e) => setReasonSaida(e.target.value)} rows={3} placeholder="Ex: Adubação faixa 3" />
            </div>
            <div className="text-xs text-muted-foreground">
              Retirada será registrada em nome de: <strong>{(profile?.full_name || user?.email || "").toUpperCase() || "—"}</strong>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaidaOpen(false)}>Cancelar</Button>
            <Button
              onClick={() => {
                const q = Number(String(qtdSaida).replace(",", "."));
                if (!q || q <= 0) return toast.error("Informe uma quantidade válida");
                if (q > saldoAtual) return toast.error("Quantidade maior que o saldo disponível");
                setSigOpen(true);
              }}
            >
              Próximo — Assinar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SignatureDialog
        open={sigOpen}
        onClose={() => setSigOpen(false)}
        onConfirm={(sigFuncionario) => saidaMut.mutate(sigFuncionario)}
        singleStep
        title2={`Assinatura de ${(profile?.full_name || "quem retirou").toUpperCase()}`}
        label2={`Assinatura de ${(profile?.full_name || "quem retirou").toUpperCase()}`}
      />

      {/* Dialog para visualizar comprovante PNG */}
      <Dialog open={!!viewReceipt} onOpenChange={(o) => !o && setViewReceipt(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Comprovante de Movimentação</DialogTitle></DialogHeader>
          {viewReceipt && (
            <div className="space-y-3">
              <img src={viewReceipt} alt="comprovante" className="w-full h-auto rounded border bg-white" />
              <div className="flex justify-end">
                <a href={viewReceipt} download={`comprovante-adubo-${Date.now()}.png`}>
                  <Button variant="outline" size="icon" title="Baixar PNG" aria-label="Baixar PNG">
                    <Download className="w-4 h-4" />
                  </Button>
                </a>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

    </Layout>
  );
};

export default Adubo;
