import { useState, useMemo } from "react";
import { Plus, Package, ClipboardList, History, Search, X, Filter } from "lucide-react";
import Layout from "@/components/layout/Layout";
import { EditablePageTitle } from "@/components/cms/EditablePageTitle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CreateOrderDialog } from "@/components/orders/CreateOrderDialog";
import { OrderCard } from "@/components/orders/OrderCard";
import { OrderDetailsDialog } from "@/components/orders/OrderDetailsDialog";
import { OrderTutorial } from "@/components/orders/OrderTutorial";
import { useOrders, useMyOrders, usePendingOrders, Order } from "@/hooks/useOrders";
import { useProfile } from "@/hooks/useProfile";
import { useVisualizadorContext } from "@/contexts/VisualizadorContext";

const STATUS_OPTIONS = [
  { value: "all", label: "Todos os Status" },
  { value: "solicitado", label: "Solicitado" },
  { value: "aprovado", label: "Aprovado" },
  { value: "a_caminho", label: "A Caminho" },
  { value: "entregue", label: "Entregue" },
  { value: "pedido_realizado", label: "Pedido Realizado" },
  { value: "cancelado", label: "Cancelado" },
];

export default function Pedidos() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: profile } = useProfile();
  const { isVisualizador } = useVisualizadorContext();
  const { data: allOrders, isLoading: loadingAll } = useOrders();
  const { data: myOrders, isLoading: loadingMy } = useMyOrders();
  const { data: pendingOrders, isLoading: loadingPending } = usePendingOrders();

  const isResponsible = profile?.cargo === "aux_administrativo" || profile?.cargo === "aux_almoxarifado";

  // Filter orders by search query and status
  const filterOrders = (orders: Order[] | undefined) => {
    if (!orders) return [];
    
    let filtered = orders;
    
    // Filter by status
    if (statusFilter !== "all") {
      filtered = filtered.filter(order => order.status === statusFilter);
    }
    
    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(order => 
        order.product_name.toLowerCase().includes(query) ||
        order.order_number?.toLowerCase().includes(query) ||
        order.requester_name.toLowerCase().includes(query) ||
        order.description?.toLowerCase().includes(query)
      );
    }
    
    return filtered;
  };

  const filteredMyOrders = useMemo(() => filterOrders(myOrders), [myOrders, searchQuery, statusFilter]);
  const filteredPendingOrders = useMemo(() => filterOrders(pendingOrders), [pendingOrders, searchQuery, statusFilter]);
  const filteredAllOrders = useMemo(() => filterOrders(allOrders), [allOrders, searchQuery, statusFilter]);

  const handleOrderClick = (order: Order) => {
    setSelectedOrder(order);
    setDetailsOpen(true);
  };

  const renderOrderList = (orders: Order[], isLoading: boolean, emptyMessage: string) => {
    if (isLoading) {
      return (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      );
    }

    if (!orders || orders.length === 0) {
      return (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>{searchQuery || statusFilter !== "all" ? "Nenhum pedido encontrado com os filtros aplicados" : emptyMessage}</p>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="space-y-3">
        {orders.map((order) => (
          <OrderCard key={order.id} order={order} onClick={() => handleOrderClick(order)} />
        ))}
      </div>
    );
  };

  return (
    <Layout>
      <div className="container mx-auto py-4 sm:py-6 px-4 max-w-4xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0 mb-4 sm:mb-6">
          <div className="flex flex-col">
            <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
              <Package className="w-6 h-6 sm:w-7 sm:h-7 text-primary" />
              <EditablePageTitle pageKey="pedidos" defaultValue="Pedidos" className="inline" as="h1" />
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Gerencie suas solicitações de materiais
            </p>
          </div>
          <div className="flex items-center gap-2">
            <OrderTutorial />
            {!isVisualizador && (
              <Button onClick={() => setCreateDialogOpen(true)} className="w-full sm:w-auto">
                <Plus className="w-4 h-4 mr-2" />
                Novo Pedido
              </Button>
            )}
          </div>
        </div>

        {/* Search and Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome do produto, nº do pedido ou solicitante..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-10"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                onClick={() => setSearchQuery("")}
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Filtrar status" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Tabs defaultValue="meus" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="meus" className="flex items-center gap-2">
              <ClipboardList className="w-4 h-4" />
              <span className="hidden sm:inline">Meus Pedidos</span>
              <span className="sm:hidden">Meus</span>
            </TabsTrigger>
            <TabsTrigger value="pendentes" className="flex items-center gap-2">
              <Package className="w-4 h-4" />
              <span className="hidden sm:inline">Pendentes</span>
              <span className="sm:hidden">Pend.</span>
            </TabsTrigger>
            <TabsTrigger value="historico" className="flex items-center gap-2">
              <History className="w-4 h-4" />
              <span className="hidden sm:inline">Histórico</span>
              <span className="sm:hidden">Hist.</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="meus" className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Meus Pedidos</CardTitle>
              </CardHeader>
              <CardContent>
                {renderOrderList(filteredMyOrders, loadingMy, "Você ainda não fez nenhum pedido")}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pendentes" className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Pedidos Pendentes</CardTitle>
              </CardHeader>
              <CardContent>
                {renderOrderList(
                  filteredPendingOrders,
                  loadingPending,
                  isResponsible
                    ? "Nenhum pedido pendente para processar"
                    : "Nenhum pedido pendente"
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="historico" className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Histórico Completo</CardTitle>
              </CardHeader>
              <CardContent>
                {renderOrderList(filteredAllOrders, loadingAll, "Nenhum pedido encontrado")}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <CreateOrderDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} />
      <OrderDetailsDialog order={selectedOrder} open={detailsOpen} onOpenChange={setDetailsOpen} />
    </Layout>
  );
}
