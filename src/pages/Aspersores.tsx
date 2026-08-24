import { lazy, Suspense } from "react";
import Layout from "@/components/layout/Layout";
import { MapPinned, Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import EstoqueIrrigacaoTab from "@/components/aspersores/EstoqueIrrigacaoTab";
import AspersoresTab from "@/components/aspersores/AspersoresTab";
import AspersoresConsertosTab from "@/components/aspersores/AspersoresConsertosTab";

const MapEditor = lazy(() => import("@/features/map-editor/MapEditor"));

export default function Aspersores() {
  return (
    <Layout>
      <div className="min-h-[calc(100vh-4rem)] p-3 md:p-6">
        <div className="flex items-center gap-3 mb-4 justify-center">
          <div className="p-2 rounded-xl bg-gradient-to-br from-[#c9a84c] to-[#f0d78c] text-[#1a1a1a]">
            <MapPinned className="h-6 w-6" />
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-[#c9a84c]">Aspersores</h1>
        </div>

        <Tabs defaultValue="aspersores" className="mx-auto w-full">
          <TabsList className="mx-auto flex w-full max-w-lg">
            <TabsTrigger value="aspersores" className="flex-1">Aspersores</TabsTrigger>
            <TabsTrigger value="estoque" className="flex-1">Estoque Irrigação</TabsTrigger>
            <TabsTrigger value="consertos" className="flex-1">Consertos</TabsTrigger>
          </TabsList>

          <TabsContent value="aspersores" className="mt-4 space-y-6">
            <AspersoresTab />
            <div className="mt-8 border-t border-border/40 pt-8">
              <h2 className="text-xl font-bold text-[#c9a84c] mb-4 text-center">Mapa Interativo</h2>
              <div className="h-[800px] w-full rounded-2xl overflow-hidden border border-border/40 shadow-2xl glass-card">
                <Suspense fallback={<div className="h-full w-full flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
                  <MapEditor />
                </Suspense>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="estoque" className="mt-4">
            <EstoqueIrrigacaoTab />
          </TabsContent>

          <TabsContent value="consertos" className="mt-4">
            <AspersoresConsertosTab />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
