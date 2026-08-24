import { useState, useMemo } from "react";
import { Package, Search, Filter, MapPin, AlertTriangle, Layers } from "lucide-react";
import Layout from "@/components/layout/Layout";
import { EditablePageTitle } from "@/components/cms/EditablePageTitle";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { AddItemDialog } from "@/components/inventory/AddItemDialog";
import { InventoryTable } from "@/components/inventory/InventoryTable";
import { EditItemDialog } from "@/components/inventory/EditItemDialog";
import { ExportInventoryButton } from "@/components/inventory/ExportInventoryButton";
import { useInventoryItems, useStorageLocations, InventoryItem } from "@/hooks/useInventory";
import { useVisualizadorContext } from "@/contexts/VisualizadorContext";

const CATEGORIES = [
  { value: "all", label: "Todas Categorias" },
  { value: "epi", label: "EPI" },
  { value: "ferramentas", label: "Ferramentas" },
  { value: "materiais", label: "Materiais" },
  { value: "escritorio", label: "Escritório" },
  { value: "limpeza", label: "Limpeza" },
  { value: "geral", label: "Geral" },
];

export default function Estoque() {
  const { data: items, isLoading } = useInventoryItems();
  const { data: locations } = useStorageLocations();
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("all");
  const [editItem, setEditItem] = useState<InventoryItem | null>(null);
  const [statsDialog, setStatsDialog] = useState<null | "total" | "low" | "categories">(null);
  const { isVisualizador } = useVisualizadorContext();

  const filteredItems = useMemo(() => {
    if (!items) return [];
    
    return items.filter((item) => {
      const matchesSearch = 
        searchQuery === "" ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.ca_number?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory = 
        categoryFilter === "all" || item.category === categoryFilter;

      const matchesLocation = 
        locationFilter === "all" || item.location_id === locationFilter;

      return matchesSearch && matchesCategory && matchesLocation;
    });
  }, [items, searchQuery, categoryFilter, locationFilter]);

  const itemsByLocation = useMemo(() => {
    if (!items || !locations) return {};
    
    const grouped: Record<string, typeof items> = {};
    
    locations.forEach((loc) => {
      grouped[loc.id] = items.filter((item) => item.location_id === loc.id);
    });
    
    grouped["sem-local"] = items.filter((item) => !item.location_id);
    
    return grouped;
  }, [items, locations]);

  const stats = useMemo(() => {
    if (!items) return { total: 0, lowStock: 0, categories: 0 };
    
    const lowStock = items.filter((item) => item.quantity <= item.min_quantity).length;
    const categories = new Set(items.map((item) => item.category)).size;
    
    return { total: items.length, lowStock, categories };
  }, [items]);

  const lowStockItems = useMemo(
    () => (items || []).filter((i) => i.quantity <= i.min_quantity),
    [items]
  );

  const categoryBreakdown = useMemo(() => {
    if (!items) return [];
    const map = new Map<string, number>();
    items.forEach((i) => map.set(i.category, (map.get(i.category) || 0) + 1));
    return Array.from(map.entries())
      .map(([key, count]) => ({
        key,
        label: CATEGORIES.find((c) => c.value === key)?.label || key,
        count,
      }))
      .sort((a, b) => b.count - a.count);
  }, [items]);


  return (
    <Layout>
      <div className="space-y-4 sm:space-y-6 px-4 sm:px-6 py-4 sm:py-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
              <Package className="h-5 w-5 sm:h-6 sm:w-6" />
              <EditablePageTitle pageKey="estoque" defaultValue="Estoque de Materiais" className="inline" as="h1" />
            </h1>
            <p className="text-sm text-muted-foreground">
              Gerencie o inventário de materiais e EPIs
            </p>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            {!isVisualizador && <ExportInventoryButton items={filteredItems} />}
            {!isVisualizador && <AddItemDialog />}
          </div>
        </div>
        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card
            role="button"
            tabIndex={0}
            onClick={() => setStatsDialog("total")}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setStatsDialog("total")}
            className="cursor-pointer transition-all hover:shadow-md hover:border-primary/40 hover:-translate-y-0.5"
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total de Itens
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats.total}</p>
            </CardContent>
          </Card>
          <Card
            role="button"
            tabIndex={0}
            onClick={() => setStatsDialog("low")}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setStatsDialog("low")}
            className="cursor-pointer transition-all hover:shadow-md hover:border-primary/40 hover:-translate-y-0.5"
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Estoque Baixo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-2xl font-bold ${stats.lowStock > 0 ? "text-yellow-500" : ""}`}>
                {stats.lowStock}
                {stats.lowStock > 0 && (
                  <AlertTriangle className="inline ml-2 h-5 w-5" />
                )}
              </p>
            </CardContent>
          </Card>
          <Card
            role="button"
            tabIndex={0}
            onClick={() => setStatsDialog("categories")}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setStatsDialog("categories")}
            className="cursor-pointer transition-all hover:shadow-md hover:border-primary/40 hover:-translate-y-0.5"
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Categorias
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats.categories}</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome ou CA..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={locationFilter} onValueChange={setLocationFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <MapPin className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Local" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Locais</SelectItem>
                  {locations?.map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>
                      {loc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Content Tabs */}
        <Tabs defaultValue="lista" className="w-full">
          <TabsList>
            <TabsTrigger value="lista">Lista Geral</TabsTrigger>
            <TabsTrigger value="local">Por Local</TabsTrigger>
          </TabsList>

          <TabsContent value="lista" className="mt-4">
            {isLoading ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  Carregando itens...
                </CardContent>
              </Card>
            ) : (
              <InventoryTable items={filteredItems} onEdit={setEditItem} />
            )}
          </TabsContent>

          <TabsContent value="local" className="mt-4 space-y-4">
            {locations?.map((location) => (
              <Card key={location.id}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <MapPin className="h-5 w-5" />
                    {location.name}
                    <span className="text-sm font-normal text-muted-foreground">
                      ({itemsByLocation[location.id]?.length || 0} itens)
                    </span>
                  </CardTitle>
                  {location.description && (
                    <p className="text-sm text-muted-foreground">{location.description}</p>
                  )}
                </CardHeader>
                <CardContent>
                  <InventoryTable items={itemsByLocation[location.id] || []} onEdit={setEditItem} />
                </CardContent>
              </Card>
            ))}
            
            {itemsByLocation["sem-local"]?.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Package className="h-5 w-5" />
                    Sem Local Definido
                    <span className="text-sm font-normal text-muted-foreground">
                      ({itemsByLocation["sem-local"].length} itens)
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <InventoryTable items={itemsByLocation["sem-local"]} onEdit={setEditItem} />
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        <EditItemDialog
          item={editItem}
          open={!!editItem}
          onOpenChange={(open) => !open && setEditItem(null)}
        />

        <Dialog open={!!statsDialog} onOpenChange={(o) => !o && setStatsDialog(null)}>
          <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {statsDialog === "total" && (<><Package className="h-5 w-5" /> Todos os Itens em Estoque</>)}
                {statsDialog === "low" && (<><AlertTriangle className="h-5 w-5 text-yellow-500" /> Itens com Estoque Baixo</>)}
                {statsDialog === "categories" && (<><Layers className="h-5 w-5" /> Categorias</>)}
              </DialogTitle>
              <DialogDescription>
                {statsDialog === "total" && `${stats.total} item(ns) cadastrado(s) no estoque.`}
                {statsDialog === "low" && `${stats.lowStock} item(ns) com quantidade igual ou abaixo do mínimo.`}
                {statsDialog === "categories" && `${stats.categories} categoria(s) em uso.`}
              </DialogDescription>
            </DialogHeader>

            {statsDialog === "total" && (
              <InventoryTable items={items || []} onEdit={(it) => { setStatsDialog(null); setEditItem(it); }} />
            )}

            {statsDialog === "low" && (
              lowStockItems.length === 0 ? (
                <p className="py-8 text-center text-muted-foreground">Nenhum item com estoque baixo. 🎉</p>
              ) : (
                <InventoryTable items={lowStockItems} onEdit={(it) => { setStatsDialog(null); setEditItem(it); }} />
              )
            )}

            {statsDialog === "categories" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {categoryBreakdown.length === 0 ? (
                  <p className="py-8 text-center text-muted-foreground col-span-full">Nenhuma categoria.</p>
                ) : categoryBreakdown.map((c) => (
                  <button
                    key={c.key}
                    onClick={() => {
                      setCategoryFilter(c.key);
                      setStatsDialog(null);
                    }}
                    className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted hover:border-primary/40 transition-all text-left"
                  >
                    <div className="flex items-center gap-3">
                      <Layers className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{c.label}</span>
                    </div>
                    <Badge variant="secondary">{c.count} item(ns)</Badge>
                  </button>
                ))}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
