import { lazy, Suspense } from "react";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { ConfirmDialogHost } from "@/components/ConfirmDialogHost";
import { AppUpdateChecker } from "@/components/AppUpdateChecker";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { QueryClient } from "@tanstack/query-core";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/components/ThemeProvider";
import { PersistentFooter } from "@/components/layout/PersistentFooter";
import { PersistentSidebar } from "@/components/layout/PersistentSidebar";
import ProtectedRoute from "@/components/ProtectedRoute";
import { ScreensaverClock } from "@/components/ui/ScreensaverClock";
import { LoginTransitionGate } from "@/components/auth/LoginTransitionGate";
import { LogoutTransitionGate } from "@/components/auth/LogoutTransitionGate";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import ErrorBoundary from "@/components/ErrorBoundary";
import { VisualizadorProvider } from "@/contexts/VisualizadorContext";
import { EditModeProvider } from "@/contexts/EditModeContext";
import { WhatsAppGate } from "@/components/auth/WhatsAppGate";
import { LoginExpiryDialog } from "@/components/auth/LoginExpiryDialog";
import { AnnouncementModal } from "@/components/announcements/AnnouncementModal";
import { WapiBroadcastToaster } from "@/components/wapi/WapiBroadcastToaster";
import { LayoutModeProvider } from "@/contexts/LayoutModeContext";
import { ShiftPngBackfillRunner } from "@/components/driver/ShiftPngBackfillRunner";
import loadingLogo from "@/assets/logo-principal.png";

// Lazy-load ALL pages — only the current route's code is downloaded
const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const SelecaoAmbiente = lazy(() => import("./pages/SelecaoAmbiente"));
const RH = lazy(() => import("./pages/RH"));
const Presenca = lazy(() => import("./pages/Presenca"));
const RelatorioPresenca = lazy(() => import("./pages/RelatorioPresenca"));
const Matriz = lazy(() => import("./pages/Matriz"));
const Emergencia = lazy(() => import("./pages/Emergencia"));
const Admin = lazy(() => import("./pages/Admin"));
const AdminWhatsApp = lazy(() => import("./pages/AdminWhatsApp"));
const AdminDriverDiagnostico = lazy(() => import("./pages/AdminDriverDiagnostico"));
const AdminSecurity = lazy(() => import("./pages/AdminSecurity"));
const BackupRestore = lazy(() => import("./pages/BackupRestore"));
const Configuracoes = lazy(() => import("./pages/Configuracoes"));
const DDS = lazy(() => import("./pages/DDS"));
const Lembretes = lazy(() => import("./pages/Lembretes"));

const RDO = lazy(() => import("./pages/RDO"));
const Campanhas = lazy(() => import("./pages/Campanhas"));
const Pedidos = lazy(() => import("./pages/Pedidos"));
const Estoque = lazy(() => import("./pages/Estoque"));
const Documentos = lazy(() => import("./pages/Documentos"));
const Atividades = lazy(() => import("./pages/Atividades"));
const AtividadesII = lazy(() => import("./pages/AtividadesII"));
const AtividadeCustom = lazy(() => import("./pages/AtividadeCustom"));
const VistoriasEquipamentos = lazy(() => import("./pages/VistoriasEquipamentos"));
const Homologados = lazy(() => import("./pages/Homologados"));
const VistoriaCintas = lazy(() => import("./pages/VistoriaCintas"));
const EntradaSaidaEquipamentos = lazy(() => import("./pages/EntradaSaidaEquipamentos"));
const ArquivosSeguranca = lazy(() => import("./pages/ArquivosSeguranca"));
const PainelMotorista = lazy(() => import("./pages/PainelMotorista"));
const RegistroMovimentoMotorista = lazy(() => import("./pages/RegistroMovimentoMotorista"));
const ChecklistMotorista = lazy(() => import("./pages/ChecklistMotorista"));
const SelecaoVeiculo = lazy(() => import("./pages/SelecaoVeiculo"));
const EquipamentosMotorista = lazy(() => import("./pages/EquipamentosMotorista"));
const RelatoriosMotorista = lazy(() => import("./pages/RelatoriosMotorista"));
const ServicosMotorista = lazy(() => import("./pages/ServicosMotorista"));
const PontosAbastecimento = lazy(() => import("./pages/PontosAbastecimento"));
const ParteDiaria = lazy(() => import("./pages/ParteDiaria"));
const ConsumoAbastecimento = lazy(() => import("./pages/ConsumoAbastecimento"));
const TodosEquipamentos = lazy(() => import("./pages/TodosEquipamentos"));

const InstaCena = lazy(() => import("./pages/InstaCena"));
const IAChat = lazy(() => import("./pages/IAChat"));
const InspecaoCanteiro = lazy(() => import("./pages/InspecaoCanteiro"));
const CalendarioHydro = lazy(() => import("./pages/CalendarioHydro"));
const Games = lazy(() => import("./pages/Games"));
const Desvios = lazy(() => import("./pages/Desvios"));
const StatusGeralEquipamentos = lazy(() => import("./pages/StatusGeralEquipamentos"));
const AtividadePrevista = lazy(() => import("./pages/AtividadePrevista"));

const NotasFiscais = lazy(() => import("./pages/NotasFiscais"));
const TrocaEpi = lazy(() => import("./pages/TrocaEpi"));
const InspecaoExtintores = lazy(() => import("./pages/InspecaoExtintores"));
const MeioAmbiente = lazy(() => import("./pages/MeioAmbiente"));
const PosChuva = lazy(() => import("./pages/PosChuva"));
const Seguranca = lazy(() => import("./pages/Seguranca"));
const ControleTreinamento = lazy(() => import("./pages/ControleTreinamento"));
const RecursosHumanos = lazy(() => import("./pages/RecursosHumanos"));
const RelatorioDiarioObra = lazy(() => import("./pages/RelatorioDiarioObra"));
const Almoxarifado = lazy(() => import("./pages/Almoxarifado"));
const Adubo = lazy(() => import("./pages/Adubo"));
const Aspersores = lazy(() => import("./pages/Aspersores"));
const Equipamentos = lazy(() => import("./pages/Equipamentos"));
const Planejamento = lazy(() => import("./pages/Planejamento"));
const AtaReuniaoContrato = lazy(() => import("./pages/AtaReuniaoContrato"));
const CIPA = lazy(() => import("./pages/CIPA"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Optimized PageLoader: Uses local logo immediately to avoid network blocking on FCP
const PageLoader = () => {
  const { settings } = useSiteSettings();
  const displayLogo = settings.page_loading_img_url || loadingLogo;

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background/95 backdrop-blur-md transition-opacity duration-300">
      <div className="relative">
        <img 
          loading="eager" 
          decoding="sync"
          src={displayLogo}
          alt="Carregando..."
          className="h-24 w-24 md:h-32 md:w-32 object-contain drop-shadow-2xl animate-pulse gpu-accelerate"
        />
        <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-32 h-1 bg-muted/20 rounded-full overflow-hidden">
          <div className="h-full bg-primary animate-progress-loading w-full origin-left" />
        </div>
      </div>
    </div>
  );
};


// QueryClient with robust error handling and performance optimization
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        if (error && typeof error === 'object' && 'status' in error) {
          const status = (error as { status: number }).status;
          if (status >= 400 && status < 500) return false;
        }
        return failureCount < 2;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      staleTime: 1000 * 60 * 15, // 15 minutos
      gcTime: 1000 * 60 * 60, // 1 hora
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: false,
      networkMode: "offlineFirst",
    },
    mutations: {
      // Sem retry automático: evita salvamentos duplicados quando o primeiro request
      // já chegou ao servidor e remove o atraso artificial entre tentativas.
      retry: 0,
      networkMode: "always",
    },

  },
});

// Hidrata o cache do React Query a partir do localStorage para garantir
// que o Painel do Motorista funcione offline (leituras) imediatamente
// após reload, e inicia a persistência contínua das queries críticas.
if (typeof window !== "undefined") {
  import("@/lib/queryCachePersister").then(({ hydrateQueryCache, startQueryCachePersistence }) => {
    hydrateQueryCache(queryClient);
    startQueryCachePersistence(queryClient);
  }).catch((e) => console.warn("[queryCachePersister] init failed", e));

  // Limpa todo o cache de queries quando o ambiente é trocado para evitar
  // que dados do ambiente anterior fiquem visíveis.
  window.addEventListener("environment-changed", () => {
    queryClient.clear();
    try { localStorage.removeItem("driver_query_cache_v1"); } catch {}
  });
}

const App = () => (
  <ErrorBoundary>
    <ThemeProvider attribute="class" defaultTheme="dark" forcedTheme="dark" enableSystem={false}>
      <LayoutModeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
            <Toaster />
            <Sonner />
            <ConfirmDialogHost />
            <AppUpdateChecker />
            <InstallPrompt />
            
            <BrowserRouter>
              <LogoutTransitionGate />
              <LoginTransitionGate />
              <EditModeProvider>
              <WhatsAppGate />
              <LoginExpiryDialog />
              <AnnouncementModal />
              <WapiBroadcastToaster />
              <ShiftPngBackfillRunner />
              <ScreensaverClock />
              <PersistentSidebar>
                <VisualizadorProvider>
                <ErrorBoundary>
                  <Suspense fallback={<PageLoader />}>
                    <Routes>
                      <Route path="/auth" element={<Auth />} />
                      <Route path="/selecao-ambiente" element={<ProtectedRoute><SelecaoAmbiente /></ProtectedRoute>} />
                      <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
                      <Route path="/rh" element={<ProtectedRoute><RH /></ProtectedRoute>} />
                      <Route path="/presenca" element={<ProtectedRoute><Presenca /></ProtectedRoute>} />
                      <Route path="/relatorio-presenca" element={<ProtectedRoute><RelatorioPresenca /></ProtectedRoute>} />
                      <Route path="/matriz" element={<ProtectedRoute><Matriz /></ProtectedRoute>} />
                      <Route path="/emergencia" element={<ProtectedRoute><Emergencia /></ProtectedRoute>} />
                      <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
                     <Route path="/admin/whatsapp" element={<ProtectedRoute><AdminWhatsApp /></ProtectedRoute>} />
                     <Route path="/admin/driver-diagnostico" element={<ProtectedRoute><AdminDriverDiagnostico /></ProtectedRoute>} />
                     <Route path="/admin/diagnostico-motorista" element={<ProtectedRoute><AdminDriverDiagnostico /></ProtectedRoute>} />

                     <Route path="/admin/seguranca" element={<ProtectedRoute><AdminSecurity /></ProtectedRoute>} />
                     <Route path="/admin/backup" element={<ProtectedRoute><BackupRestore /></ProtectedRoute>} />
                      <Route path="/configuracoes" element={<ProtectedRoute><Configuracoes /></ProtectedRoute>} />
                      <Route path="/dds" element={<ProtectedRoute><DDS /></ProtectedRoute>} />
                      <Route path="/lembretes" element={<ProtectedRoute><Lembretes /></ProtectedRoute>} />
                      
                      <Route path="/rdo" element={<ProtectedRoute><RDO /></ProtectedRoute>} />
                      <Route path="/campanhas" element={<ProtectedRoute><Campanhas /></ProtectedRoute>} />
                      <Route path="/pedidos" element={<ProtectedRoute><Pedidos /></ProtectedRoute>} />
                      <Route path="/estoque" element={<ProtectedRoute><Estoque /></ProtectedRoute>} />
                      <Route path="/documentos" element={<ProtectedRoute><Documentos /></ProtectedRoute>} />
                      <Route path="/atividades" element={<ProtectedRoute><Atividades /></ProtectedRoute>} />
                      <Route path="/atividades-ii" element={<ProtectedRoute><AtividadesII /></ProtectedRoute>} />
                      <Route path="/atividade-custom/:id" element={<ProtectedRoute><AtividadeCustom /></ProtectedRoute>} />

                      <Route path="/vistorias-equipamentos" element={<ProtectedRoute><VistoriasEquipamentos /></ProtectedRoute>} />
                      <Route path="/homologados" element={<ProtectedRoute><Homologados /></ProtectedRoute>} />
                      <Route path="/vistoria-cintas" element={<ProtectedRoute><VistoriaCintas /></ProtectedRoute>} />
                      <Route path="/entrada-saida-equipamentos" element={<ProtectedRoute><EntradaSaidaEquipamentos /></ProtectedRoute>} />
                      <Route path="/arquivos-seguranca" element={<ProtectedRoute><ArquivosSeguranca /></ProtectedRoute>} />
                      <Route path="/parte-diaria" element={<ProtectedRoute><ParteDiaria /></ProtectedRoute>} />
                      <Route path="/selecao-veiculo" element={<ProtectedRoute><SelecaoVeiculo /></ProtectedRoute>} />
                      <Route path="/painel-motorista" element={<ProtectedRoute><PainelMotorista /></ProtectedRoute>} />
                      <Route path="/registro-movimento-motorista" element={<ProtectedRoute><RegistroMovimentoMotorista /></ProtectedRoute>} />
                      <Route path="/checklist-motorista" element={<ProtectedRoute><ChecklistMotorista /></ProtectedRoute>} />
                      <Route path="/equipamentos-motorista" element={<ProtectedRoute><EquipamentosMotorista /></ProtectedRoute>} />
                      <Route path="/relatorios-motorista" element={<ProtectedRoute><RelatoriosMotorista /></ProtectedRoute>} />
                      <Route path="/servicos-motorista" element={<ProtectedRoute><ServicosMotorista /></ProtectedRoute>} />
                      <Route path="/pontos-abastecimento" element={<ProtectedRoute><PontosAbastecimento /></ProtectedRoute>} />
                      <Route path="/consumo-abastecimento" element={<ProtectedRoute><ConsumoAbastecimento /></ProtectedRoute>} />
                      <Route path="/todos-equipamentos" element={<ProtectedRoute><TodosEquipamentos /></ProtectedRoute>} />
                      
                      
                      <Route path="/instacena" element={<ProtectedRoute><InstaCena /></ProtectedRoute>} />
                      <Route path="/inspecao-canteiro" element={<ProtectedRoute><InspecaoCanteiro /></ProtectedRoute>} />
                      <Route path="/calendario-hydro" element={<ProtectedRoute><CalendarioHydro /></ProtectedRoute>} />
                      <Route path="/games" element={<ProtectedRoute><Games /></ProtectedRoute>} />
                      <Route path="/desvios" element={<ProtectedRoute><Desvios /></ProtectedRoute>} />
                      
                      <Route path="/notas-fiscais" element={<ProtectedRoute><NotasFiscais /></ProtectedRoute>} />
                      <Route path="/troca-epi" element={<ProtectedRoute><TrocaEpi /></ProtectedRoute>} />
                      <Route path="/inspecao-extintores" element={<ProtectedRoute><InspecaoExtintores /></ProtectedRoute>} />
                      <Route path="/meio-ambiente" element={<ProtectedRoute><MeioAmbiente /></ProtectedRoute>} />
                      <Route path="/pos-chuva" element={<ProtectedRoute><PosChuva /></ProtectedRoute>} />
                      <Route path="/seguranca" element={<ProtectedRoute><Seguranca /></ProtectedRoute>} />
                      <Route path="/controle-treinamento" element={<ProtectedRoute><ControleTreinamento /></ProtectedRoute>} />
                      <Route path="/recursos-humanos" element={<ProtectedRoute><RecursosHumanos /></ProtectedRoute>} />
                      <Route path="/relatorio-diario-obra" element={<ProtectedRoute><RelatorioDiarioObra /></ProtectedRoute>} />
                      <Route path="/almoxarifado" element={<ProtectedRoute><Almoxarifado /></ProtectedRoute>} />
                      <Route path="/adubo" element={<ProtectedRoute><Adubo /></ProtectedRoute>} />
                      <Route path="/aspersores" element={<ProtectedRoute><Aspersores /></ProtectedRoute>} />
                      <Route path="/equipamentos" element={<ProtectedRoute><Equipamentos /></ProtectedRoute>} />
                      <Route path="/planejamento" element={<ProtectedRoute><Planejamento /></ProtectedRoute>} />
                      <Route path="/ata-reuniao-contrato" element={<ProtectedRoute><AtaReuniaoContrato /></ProtectedRoute>} />
                      <Route path="/status-geral-equipamentos" element={<ProtectedRoute><StatusGeralEquipamentos /></ProtectedRoute>} />
                      <Route path="/atividade-prevista" element={<ProtectedRoute><AtividadePrevista /></ProtectedRoute>} />
                      <Route path="/cipa" element={<ProtectedRoute><CIPA /></ProtectedRoute>} />
                      <Route path="/ia" element={<ProtectedRoute><IAChat /></ProtectedRoute>} />
                      {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </Suspense>
                </ErrorBoundary>
                </VisualizadorProvider>
                <PersistentFooter />
              </PersistentSidebar>
              </EditModeProvider>
            </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
      </LayoutModeProvider>
    </ThemeProvider>
  </ErrorBoundary>
);

export default App;
