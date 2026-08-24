import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useIsAdmin } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import {
  useBackupDriveStatus,
  useBackupJobs,
  useCancelBackup,
  useDeleteBackup,
  useRunBackup,
  downloadBackup,
  type BackupJob,
} from "@/hooks/useBackupJobs";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Cloud,
  CloudOff,
  Download,
  ExternalLink,
  HardDrive,
  Link2,
  Loader2,
  Play,
  RefreshCw,
  ShieldAlert,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";


function formatBytes(n: number | null | undefined) {
  if (!n && n !== 0) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1)} MB`;
  return `${(n / 1024 ** 3).toFixed(2)} GB`;
}

function formatDate(d: string | null | undefined) {
  if (!d) return "—";
  const dt = new Date(d);
  return dt.toLocaleString("pt-BR", { timeZone: "America/Belem" });
}

const KIND_LABEL: Record<BackupJob["kind"], string> = {
  daily: "Diário",
  weekly: "Semanal",
  monthly: "Mensal",
  manual: "Manual",
  pre_update: "Pré-atualização",
};

export default function BackupRestore() {
  const navigate = useNavigate();
  const { isAdmin, isLoading: adminLoading } = useIsAdmin();
  const { data: jobs = [], isLoading: jobsLoading, refetch } = useBackupJobs();
  const { data: status, isLoading: statusLoading, refetch: refetchStatus } =
    useBackupDriveStatus();
  const runBackup = useRunBackup();
  const deleteBackup = useDeleteBackup();
  const cancelBackup = useCancelBackup();
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [oauthEmail, setOauthEmail] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [manualAuthUrl, setManualAuthUrl] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 5;
  const isEmbeddedPreview = window.self !== window.top;
  const externalBackupUrl = `https://sucena.shop/admin/backup?drive_connect=1`;

  const loadOauth = async () => {
    const { data } = await supabase
      .from("google_drive_oauth")
      .select("account_email")
      .limit(1)
      .maybeSingle();
    setOauthEmail(data?.account_email || null);
  };

  useEffect(() => {
    loadOauth();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const drive = params.get("drive");
    if (!drive) return;

    if (drive === "connected") {
      toast({ title: "Google Drive conectado!" });
      loadOauth();
      refetchStatus();
    } else if (drive === "error") {
      toast({
        title: "Erro ao conectar",
        description: params.get("message") || "Não foi possível concluir a conexão com o Google Drive.",
        variant: "destructive",
      });
    }

    params.delete("drive");
    params.delete("message");
    const next = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ""}`;
    window.history.replaceState({}, "", next);
  }, [refetchStatus]);

  const handleConnect = async () => {
    setManualAuthUrl(null);
    const popup = window.self !== window.top ? window.open("about:blank", "_blank") : null;
    setConnecting(true);
    try {
      const session = (await supabase.auth.getSession()).data.session;
      if (!session?.access_token) throw new Error("Sessão expirada. Entre novamente.");

      // Preflight: verifica se o redirect_uri está autorizado no Google Cloud Console
      toast({ title: "Verificando configuração do Google...", description: "Validando redirect_uri autorizado." });
      const checkResp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-drive-oauth-check`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
        },
      );
      const check = await checkResp.json().catch(() => ({}));
      if (!check?.ok) {
        const errMsg = check?.hint || check?.error || "Configuração OAuth do Google inválida.";
        throw new Error(errMsg);
      }

      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-drive-oauth-start`;
      const startResp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ return_to: `${window.location.origin}/admin/backup` }),
      });
      const raw = await startResp.text();
      let payload: { url?: string; error?: string } = {};
      try {
        payload = raw ? JSON.parse(raw) : {};
      } catch {
        payload = { error: raw };
      }
      if (!startResp.ok || !payload.url) {
        throw new Error(payload.error || "Não foi possível iniciar a conexão com o Drive.");
      }

      toast({ title: "Abrindo Google Drive...", description: "A conexão será feita em uma aba externa para evitar bloqueio do Google." });
      if (popup && !popup.closed) {
        popup.location.href = payload.url;
      } else if (window.self === window.top) {
        window.location.assign(payload.url);
      } else {
        const opened = window.open(payload.url, "_blank");
        if (!opened) {
          setManualAuthUrl(payload.url);
          toast({
            title: "Clique para continuar",
            description: "O navegador bloqueou a abertura automática. Use o botão 'Abrir Google Drive' abaixo.",
          });
        }
      }
    } catch (e) {
      if (popup && !popup.closed) popup.close();
      setConnecting(false);
      toast({ title: "Erro ao conectar", description: (e as Error).message, variant: "destructive" });
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("drive_connect") !== "1" || window.self !== window.top) return;

    params.delete("drive_connect");
    const next = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ""}`;
    window.history.replaceState({}, "", next);
    handleConnect();
  }, []);

  const handleDisconnect = async () => {
    if (!confirm("Desconectar Google Drive? Backups automáticos pararão até reconectar.")) return;
    await supabase.from("google_drive_oauth").delete().gte("connected_at", "1970-01-01");
    setOauthEmail(null);
    toast({ title: "Desconectado" });
  };


  if (adminLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }
  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center space-y-3">
            <ShieldAlert className="w-10 h-10 mx-auto text-destructive" />
            <p>Acesso restrito a administradores.</p>
            <Button onClick={() => navigate("/")}>Voltar</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const lastSuccess = jobs.find((j) => j.status === "success");
  const runningJob = jobs.find((j) => j.status === "running" || j.status === "pending");
  const driveConfigured = !!status?.configured;
  const quota = status?.drive?.storageQuota;

  const stageLabel = (s?: string | null) => {
    switch (s) {
      case "db": return "Exportando banco de dados";
      case "storage": return "Enviando arquivos do Storage";
      case "done": return "Concluído";
      default: return s || "Iniciando";
    }
  };

  const computeProgress = (job?: typeof runningJob) => {
    if (!job) return 0;
    if (job.status === "success" || job.stage === "done") return 100;
    const stage = job.stage;
    const segs = job.uploaded_segments ?? [];
    const pending = job.pending_buckets?.length ?? 0;
    if (!stage || stage === "init" || job.status === "pending") return 5;
    if (stage === "db") return 15;
    if (stage === "storage") {
      const sentBytes = job.size_bytes ?? 0;
      if (pending === 0) return 99;
      // Estimativa por bytes: usa média dos segmentos enviados para projetar o restante.
      const avgSeg = segs.length > 0 ? sentBytes / segs.length : 80 * 1024 * 1024;
      // Assume ~2 partes por bucket pendente como heurística conservadora.
      const remainingBytes = pending * avgSeg * 2;
      const totalEst = sentBytes + remainingBytes;
      const ratio = totalEst > 0 ? sentBytes / totalEst : 0;
      return Math.min(98, Math.max(20, Math.round(15 + ratio * 80)));
    }
    return 10;
  };


  const handleRun = async () => {
    try {
      toast({ title: "Backup iniciado", description: "Exportando banco por ambiente (Barcarena e Paragominas)." });
      await runBackup.mutateAsync(false);
      toast({ title: "Backup iniciado", description: "Os ZIPs separados por ambiente serão enviados ao Drive." });
    } catch (e) {
      toast({
        title: "Falha no backup",
        description: (e as Error).message,
        variant: "destructive",
      });
    }
  };

  const handleDownload = async (id: string) => {
    setDownloadingId(id);
    try {
      await downloadBackup(id);
    } catch (e) {
      toast({
        title: "Erro no download",
        description: (e as Error).message,
        variant: "destructive",
      });
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir este backup do Drive e do histórico? Esta ação é permanente.")) return;
    try {
      await deleteBackup.mutateAsync(id);
      toast({ title: "Backup excluído" });
    } catch (e) {
      toast({
        title: "Erro ao excluir",
        description: (e as Error).message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="h-screen overflow-y-auto bg-background p-4 sm:p-6">
      <div className="max-w-6xl mx-auto space-y-6 pb-8">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Backup e Restauração</h1>
            <p className="text-sm text-muted-foreground">
              Backups automáticos do banco de dados enviados ao Google Drive
              corporativo.
            </p>
          </div>
        </div>

        {/* Status grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                {oauthEmail || driveConfigured ? (
                  <Cloud className="w-4 h-4 text-green-600" />
                ) : (
                  <CloudOff className="w-4 h-4 text-destructive" />
                )}
                Google Drive
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              {oauthEmail ? (
                <>
                  <Badge variant="secondary">Conectado (OAuth)</Badge>
                  <p className="text-xs text-muted-foreground break-all">{oauthEmail}</p>
                  <Button size="sm" variant="outline" onClick={handleDisconnect}>
                    Desconectar
                  </Button>
                </>
              ) : status?.connector ? (
                <>
                  <Badge variant="secondary">Conectado</Badge>
                  <p className="text-xs text-muted-foreground break-all">
                    {status?.account_email || "Google Drive conectado"}
                  </p>
                </>
              ) : driveConfigured ? (
                <>
                  <Badge variant="secondary">Service Account</Badge>
                  <p className="text-xs text-muted-foreground break-all">
                    {status?.service_account_email}
                  </p>
                </>
              ) : (
                <>
                  <Badge variant="destructive">Não conectado</Badge>
                  {isEmbeddedPreview && (
                    <Button size="sm" variant="outline" asChild>
                      <a href={externalBackupUrl} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-3 h-3 mr-1" />
                        Abrir fora do preview
                      </a>
                    </Button>
                  )}
                  <Button size="sm" onClick={handleConnect} disabled={connecting}>
                    {connecting ? (
                      <Loader2 className="w-3 h-3 animate-spin mr-1" />
                    ) : (
                      <Link2 className="w-3 h-3 mr-1" />
                    )}
                    Conectar Google Drive
                  </Button>
                  {manualAuthUrl && (
                    <Button size="sm" variant="outline" asChild>
                      <a href={manualAuthUrl} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-3 h-3 mr-1" />
                        Abrir Google Drive
                      </a>
                    </Button>
                  )}
                </>
              )}
            </CardContent>
          </Card>


          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <HardDrive className="w-4 h-4" /> Espaço no Drive
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              {quota ? (
                <>
                  <p className="font-semibold">
                    {formatBytes(Number(quota.usage))} usados
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Limite: {quota.limit ? formatBytes(Number(quota.limit)) : "ilimitado"}
                  </p>
                </>
              ) : (
                <p className="text-muted-foreground">—</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Último backup</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              {lastSuccess ? (
                <>
                  <p className="font-semibold">{formatDate(lastSuccess.finished_at)}</p>
                  <p className="text-xs text-muted-foreground">
                    {KIND_LABEL[lastSuccess.kind]} • {formatBytes(lastSuccess.size_bytes)}
                  </p>
                </>
              ) : (
                <p className="text-muted-foreground">Nenhum ainda</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Próximos automáticos</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground space-y-1">
              <p>📅 Diário — 00:00</p>
              <p>🗓️ Envio automático para o Drive</p>
              <p>📆 Mantém histórico no sistema</p>
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          <Button onClick={handleRun} disabled={runBackup.isPending || (!driveConfigured && !oauthEmail)}>
            {runBackup.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            Fazer backup agora
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              refetch();
              refetchStatus();
              loadOauth();
            }}
          >
            <RefreshCw className="w-4 h-4" /> Atualizar
          </Button>
        </div>

        {!driveConfigured && !oauthEmail && (
          <Card className="border-amber-500">
            <CardContent className="p-4 text-sm space-y-2">
              <p className="font-semibold">⚠️ Conecte sua conta do Google Drive</p>
              <p>
                Clique em <b>Conectar Google Drive</b> acima e faça login com a
                conta onde os backups serão salvos. Os ZIPs do banco ficarão na pasta{" "}
                <b>Sucena_Backup</b> da sua conta e o sistema atualiza
                automaticamente todo dia às 00:00 (Pará).
              </p>
            </CardContent>
          </Card>
        )}

        {runningJob && (
          <Card className="border-primary/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                Backup em andamento
                <Badge variant="outline" className="ml-auto">
                  {stageLabel(runningJob.stage)}
                </Badge>
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={cancelBackup.isPending}
                  onClick={async () => {
                    if (!confirm("Cancelar o backup em andamento? As partes já enviadas ao Drive permanecerão lá.")) return;
                    try {
                      await cancelBackup.mutateAsync(runningJob.id);
                      toast({ title: "Backup cancelado" });
                    } catch (e) {
                      toast({ title: "Erro ao cancelar", description: (e as Error).message, variant: "destructive" });
                    }
                  }}
                >
                  {cancelBackup.isPending ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <X className="w-3 h-3" />
                  )}
                  Cancelar
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {(() => {
                const pct = computeProgress(runningJob);
                const sent = runningJob.size_bytes ?? 0;
                const estTotal =
                  pct > 5 && pct < 100 && sent > 0
                    ? Math.round(sent / (pct / 100))
                    : sent;
                return (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Progresso do envio</span>
                      <span className="font-semibold tabular-nums">{pct}%</span>
                    </div>
                    <Progress value={pct} className="h-2" />
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>
                        Enviado:{" "}
                        <span className="font-medium text-foreground tabular-nums">
                          {formatBytes(sent)}
                        </span>
                      </span>
                      <span>
                        {pct < 100 ? "Estimativa total: " : "Total: "}
                        <span className="font-medium text-foreground tabular-nums">
                          {formatBytes(estTotal)}
                        </span>
                      </span>
                    </div>
                  </div>
                );
              })()}

              <div className="grid sm:grid-cols-4 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Iniciado</p>
                  <p className="font-medium">{formatDate(runningJob.started_at)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Última atualização</p>
                  <p className="font-medium">{formatDate(runningJob.last_progress_at) || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Enviado ao Drive</p>
                  <p className="font-medium">{formatBytes(runningJob.size_bytes)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Arquivos processados</p>
                  <p className="font-medium">{runningJob.file_count ?? 0}</p>
                </div>
              </div>

              {!!runningJob.pending_buckets?.length && (
                <div className="text-xs text-muted-foreground">
                  Buckets pendentes:{" "}
                  <span className="font-medium text-foreground">
                    {runningJob.pending_buckets.map((b) => b.name).join(", ")}
                  </span>
                </div>
              )}

              {!!runningJob.uploaded_segments?.length && (
                <div className="border rounded-md overflow-hidden">
                  <div className="bg-muted/40 px-3 py-2 text-xs font-medium">
                    Partes enviadas ao Drive ({runningJob.uploaded_segments.length})
                  </div>
                  <div className="max-h-56 overflow-auto divide-y">
                    {runningJob.uploaded_segments.map((seg, i) => (
                      <div key={`${seg.id}-${i}`} className="flex items-center gap-2 px-3 py-2 text-xs">
                        <Cloud className="w-3.5 h-3.5 text-green-600 shrink-0" />
                        <span className="truncate flex-1" title={seg.name}>{seg.name}</span>
                        <span className="text-muted-foreground shrink-0">{formatBytes(seg.size)}</span>
                        {seg.link && (
                          <a
                            href={seg.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline shrink-0"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                Atualizando a cada 2,5s. Esta janela mostra cada arquivo conforme é enviado ao Google Drive.
              </p>
            </CardContent>
          </Card>
        )}





        {/* History */}
        <Card>
          <CardHeader>
            <CardTitle>Histórico de backups</CardTitle>
          </CardHeader>
          <CardContent>
            {jobsLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : jobs.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhum backup registrado ainda.
              </p>
            ) : (
              (() => {
                const totalPages = Math.max(1, Math.ceil(jobs.length / PAGE_SIZE));
                const page = Math.min(currentPage, totalPages);
                const start = (page - 1) * PAGE_SIZE;
                const pageJobs = jobs.slice(start, start + PAGE_SIZE);
                return (
                  <div className="space-y-3">
                    <div className="overflow-auto border rounded-md">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="p-2">Tipo</th>
                      <th className="p-2">Status</th>
                      <th className="p-2">Início</th>
                      <th className="p-2">Fim</th>
                      <th className="p-2">Tamanho</th>
                      <th className="p-2">Tabelas</th>
                      <th className="p-2">Arquivos</th>
                      <th className="p-2">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageJobs.map((j) => (
                      <tr key={j.id} className="border-b hover:bg-muted/30">
                        <td className="p-2">{KIND_LABEL[j.kind]}</td>
                        <td className="p-2">
                          <Badge
                            variant={
                              j.status === "success"
                                ? "secondary"
                                : j.status === "failed"
                                ? "destructive"
                                : "outline"
                            }
                          >
                            {j.status === "success"
                              ? "Sucesso"
                              : j.status === "failed"
                              ? "Falhou"
                              : j.status === "running"
                              ? "Executando"
                              : "Pendente"}
                          </Badge>
                          {j.error_message && (
                            <p className="text-xs text-destructive mt-1 max-w-[240px] truncate" title={j.error_message}>
                              {j.error_message}
                            </p>
                          )}
                          {!!j.failed_files?.length && (
                            <p className="text-xs text-amber-600 mt-1" title={j.failed_files.map((f) => `${f.bucket}/${f.path}: ${f.error}`).join("\n")}>
                              ⚠️ {j.failed_files.length} arquivo(s) falharam
                            </p>
                          )}
                        </td>
                        <td className="p-2">{formatDate(j.started_at)}</td>
                        <td className="p-2">{formatDate(j.finished_at)}</td>
                        <td className="p-2">{formatBytes(j.size_bytes)}</td>
                        <td className="p-2">{j.table_count ?? "—"}</td>
                        <td className="p-2">{j.file_count ?? "—"}</td>
                        <td className="p-2">
                          <div className="flex gap-1">
                            {j.status === "success" && j.drive_file_id && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDownload(j.id)}
                                disabled={downloadingId === j.id}
                                title="Baixar ZIP"
                              >
                                {downloadingId === j.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Download className="w-4 h-4" />
                                )}
                              </Button>
                            )}
                            {j.manifest_web_link && (
                              <Button size="sm" variant="ghost" asChild title="Abrir manifesto mestre no Drive">
                                <a href={j.manifest_web_link} target="_blank" rel="noopener noreferrer">
                                  <ExternalLink className="w-4 h-4" />
                                </a>
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDelete(j.id)}
                              title="Excluir"
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                    </div>
                    {jobs.length > PAGE_SIZE && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          Página {page} de {totalPages} • {jobs.length} backups
                        </span>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                            disabled={page === 1}
                          >
                            <ChevronLeft className="w-4 h-4" /> Anterior
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages}
                          >
                            Próximo <ChevronRight className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Como restaurar em outro sistema</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>
              Cada backup é <b>auto-descritivo e completo</b>. Junto com os ZIPs é
              gerado um <code>Backup_AAAA-MM-DD_HH-MM_MANIFEST.json</code> que lista
              todos os segmentos, caminhos de arquivos por bucket e instruções de
              restauração. Use o ícone <ExternalLink className="inline w-3 h-3" /> ao
              lado de cada backup para abrir o manifesto direto no Drive.
            </p>
            <ol className="list-decimal pl-5 space-y-1">
              <li>Baixe o manifesto mestre e <b>todos</b> os ZIPs listados em <code>segments</code>.</li>
              <li><b>Banco:</b> descompacte <code>Backup_*_db.zip</code> e importe cada <code>Banco_Dados/&lt;tabela&gt;.json</code> no novo Supabase (upsert por <code>id</code>).</li>
              <li><b>Storage:</b> para cada <code>Backup_*_storage_&lt;bucket&gt;_partN.zip</code>, descompacte e faça upload preservando o caminho relativo dentro do bucket.</li>
              <li>Confira <code>failed_files</code> no manifesto. Se vazio, o backup está 100% íntegro. Caso contrário, esses arquivos precisam ser recuperados manualmente — eles aparecem com aviso ⚠️ no histórico aqui.</li>
            </ol>
            <p className="text-xs">
              A segmentação em partes é apenas para caber no limite de memória da
              execução; cada parte tem seu próprio <code>_manifest_part_N.json</code>
              listando os arquivos exatos contidos nela.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
