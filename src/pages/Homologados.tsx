import { useState, useMemo } from "react";
import Layout from "@/components/layout/Layout";
import { EditablePageTitle } from "@/components/cms/EditablePageTitle";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Filter, X, AlertTriangle, CheckCircle, Package, Factory, Hash, ShieldCheck, ShieldAlert, ChevronLeft, ChevronRight, Wrench, FlaskConical, HardHat } from "lucide-react";
import { produtosHomologados, fabricantesUnicos } from "@/data/produtosHomologados";
import { ExportHomologadosButton } from "@/components/homologados/ExportHomologadosButton";
import { FerramentasTable } from "@/components/homologados/FerramentasTable";
import { EPIsTable } from "@/components/homologados/EPIsTable";

const ITEMS_PER_PAGE_OPTIONS = [25, 50, 100];

const Homologados = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [fabricanteFilter, setFabricanteFilter] = useState<string>("todos");
  const [perigosoFilter, setPerigosoFilter] = useState<string>("todos");
  const [controladoFilter, setControladoFilter] = useState<string>("todos");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [activeTab, setActiveTab] = useState("produtos");

  const filteredProducts = useMemo(() => {
    return produtosHomologados.filter((produto) => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = 
        searchTerm === "" ||
        produto.nome.toLowerCase().includes(searchLower) ||
        produto.ni.includes(searchTerm) ||
        produto.fabricante.toLowerCase().includes(searchLower);

      const matchesFabricante = 
        fabricanteFilter === "todos" || 
        produto.fabricante === fabricanteFilter;

      const matchesPerigoso = 
        perigosoFilter === "todos" ||
        (perigosoFilter === "sim" && produto.perigoso) ||
        (perigosoFilter === "nao" && !produto.perigoso);

      const matchesControlado = 
        controladoFilter === "todos" ||
        (controladoFilter === "sim" && produto.controlado) ||
        (controladoFilter === "nao" && !produto.controlado);

      return matchesSearch && matchesFabricante && matchesPerigoso && matchesControlado;
    });
  }, [searchTerm, fabricanteFilter, perigosoFilter, controladoFilter]);

  const clearFilters = () => {
    setSearchTerm("");
    setFabricanteFilter("todos");
    setPerigosoFilter("todos");
    setControladoFilter("todos");
    setCurrentPage(1);
  };

  // Pagination calculations
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedProducts = filteredProducts.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  const handleFilterChange = (setter: (value: string) => void) => (value: string) => {
    setter(value);
    setCurrentPage(1);
  };

  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(Number(value));
    setCurrentPage(1);
  };

  const hasActiveFilters = searchTerm !== "" || fabricanteFilter !== "todos" || perigosoFilter !== "todos" || controladoFilter !== "todos";

  // Statistics
  const stats = useMemo(() => ({
    total: produtosHomologados.length,
    perigosos: produtosHomologados.filter(p => p.perigoso).length,
    controlados: produtosHomologados.filter(p => p.controlado).length,
    fabricantes: fabricantesUnicos.length,
  }), []);

  return (
    <Layout>
      <div className="container mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <EditablePageTitle pageKey="homologados" defaultValue="Catálogo Homologado" className="text-2xl font-bold text-foreground" />
            <p className="text-muted-foreground">
              Consulte produtos químicos e ferramentas homologados para uso na operação
            </p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 max-w-xl">
            <TabsTrigger value="produtos" className="gap-2">
              <FlaskConical className="h-4 w-4" />
              <span className="hidden sm:inline">Produtos Químicos</span>
              <span className="sm:hidden">Químicos</span>
            </TabsTrigger>
            <TabsTrigger value="ferramentas" className="gap-2">
              <Wrench className="h-4 w-4" />
              Ferramentas
            </TabsTrigger>
            <TabsTrigger value="epis" className="gap-2">
              <HardHat className="h-4 w-4" />
              EPIs
            </TabsTrigger>
          </TabsList>

          {/* Produtos Químicos Tab */}
          <TabsContent value="produtos" className="space-y-6">
            {/* Export Button */}
            <div className="flex justify-end">
              <ExportHomologadosButton produtos={filteredProducts} />
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="p-2 rounded-full bg-primary/10">
                    <Package className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-primary">{stats.total}</p>
                    <p className="text-xs text-muted-foreground">Total Produtos</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-orange-500/5 border-orange-500/20">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="p-2 rounded-full bg-orange-500/10">
                    <AlertTriangle className="h-5 w-5 text-orange-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-orange-500">{stats.perigosos}</p>
                    <p className="text-xs text-muted-foreground">Perigosos</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-green-500/5 border-green-500/20">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="p-2 rounded-full bg-green-500/10">
                    <ShieldCheck className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-green-500">{stats.controlados}</p>
                    <p className="text-xs text-muted-foreground">Controlados</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-blue-500/5 border-blue-500/20">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="p-2 rounded-full bg-blue-500/10">
                    <Factory className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-blue-500">{stats.fabricantes}</p>
                    <p className="text-xs text-muted-foreground">Fabricantes</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Search and Filters */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Filter className="h-5 w-5" />
                  Buscar e Filtrar
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Search Input */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nome do produto, NI ou fabricante..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="pl-10"
                  />
                </div>

                {/* Filters Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Fabricante</label>
                    <Select value={fabricanteFilter} onValueChange={handleFilterChange(setFabricanteFilter)}>
                      <SelectTrigger className="bg-background">
                        <SelectValue placeholder="Todos os fabricantes" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border max-h-[300px]">
                        <SelectItem value="todos">Todos os fabricantes</SelectItem>
                        {fabricantesUnicos.map((fab) => (
                          <SelectItem key={fab} value={fab}>
                            {fab}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Perigoso</label>
                    <Select value={perigosoFilter} onValueChange={handleFilterChange(setPerigosoFilter)}>
                      <SelectTrigger className="bg-background">
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border">
                        <SelectItem value="todos">Todos</SelectItem>
                        <SelectItem value="sim">Sim</SelectItem>
                        <SelectItem value="nao">Não</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Controlado</label>
                    <Select value={controladoFilter} onValueChange={handleFilterChange(setControladoFilter)}>
                      <SelectTrigger className="bg-background">
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border">
                        <SelectItem value="todos">Todos</SelectItem>
                        <SelectItem value="sim">Sim</SelectItem>
                        <SelectItem value="nao">Não</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-end">
                    {hasActiveFilters && (
                      <Button 
                        variant="outline" 
                        onClick={clearFilters}
                        className="w-full gap-2"
                      >
                        <X className="h-4 w-4" />
                        Limpar Filtros
                      </Button>
                    )}
                  </div>
                </div>

                {/* Results Count and Items Per Page */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t">
                  <p className="text-sm text-muted-foreground">
                    Mostrando <span className="font-semibold text-foreground">{Math.min(startIndex + 1, filteredProducts.length)}-{Math.min(endIndex, filteredProducts.length)}</span> de{" "}
                    <span className="font-semibold text-foreground">{filteredProducts.length}</span> produtos
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Itens por página:</span>
                    <Select value={itemsPerPage.toString()} onValueChange={handleItemsPerPageChange}>
                      <SelectTrigger className="w-[80px] h-8 bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border">
                        {ITEMS_PER_PAGE_OPTIONS.map((option) => (
                          <SelectItem key={option} value={option.toString()}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Products Table */}
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="font-semibold">
                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4" />
                            Nome do Produto
                          </div>
                        </TableHead>
                        <TableHead className="font-semibold">
                          <div className="flex items-center gap-2">
                            <Factory className="h-4 w-4" />
                            Fabricante
                          </div>
                        </TableHead>
                        <TableHead className="font-semibold text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Hash className="h-4 w-4" />
                            NI
                          </div>
                        </TableHead>
                        <TableHead className="font-semibold text-center">
                          <div className="flex items-center justify-center gap-2">
                            <AlertTriangle className="h-4 w-4" />
                            Perigoso
                          </div>
                        </TableHead>
                        <TableHead className="font-semibold text-center">
                          <div className="flex items-center justify-center gap-2">
                            <ShieldCheck className="h-4 w-4" />
                            Controlado
                          </div>
                        </TableHead>
                        <TableHead className="font-semibold">Classe de Risco</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredProducts.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-12">
                            <div className="flex flex-col items-center gap-3 text-muted-foreground">
                              <Search className="h-12 w-12 opacity-30" />
                              <p className="text-lg font-medium">Nenhum produto encontrado</p>
                              <p className="text-sm">Tente ajustar os filtros ou termo de busca</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        paginatedProducts.map((produto) => (
                          <TableRow key={produto.id} className="hover:bg-muted/30">
                            <TableCell className="font-medium max-w-[300px]">
                              <span className="line-clamp-2">{produto.nome}</span>
                            </TableCell>
                            <TableCell className="text-muted-foreground max-w-[200px]">
                              <span className="line-clamp-1">{produto.fabricante || "-"}</span>
                            </TableCell>
                            <TableCell className="text-center">
                              {produto.ni && produto.ni !== "0" ? (
                                <Badge variant="outline" className="font-mono">
                                  {produto.ni}
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              {produto.perigoso ? (
                                <Badge variant="destructive" className="gap-1">
                                  <AlertTriangle className="h-3 w-3" />
                                  Sim
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="gap-1 bg-green-500/10 text-green-600 border-green-500/20">
                                  <CheckCircle className="h-3 w-3" />
                                  Não
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              {produto.controlado ? (
                                <Badge className="gap-1 bg-blue-500/10 text-blue-600 border-blue-500/20">
                                  <ShieldCheck className="h-3 w-3" />
                                  Sim
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="gap-1">
                                  <ShieldAlert className="h-3 w-3" />
                                  Não
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="max-w-[200px]">
                              {produto.classeRisco ? (
                                <Badge variant="outline" className="text-xs">
                                  {produto.classeRisco}
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t">
                    <p className="text-sm text-muted-foreground">
                      Página {currentPage} de {totalPages}
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(1)}
                        disabled={currentPage === 1}
                      >
                        Primeira
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      
                      {/* Page numbers */}
                      <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          let pageNum: number;
                          if (totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (currentPage <= 3) {
                            pageNum = i + 1;
                          } else if (currentPage >= totalPages - 2) {
                            pageNum = totalPages - 4 + i;
                          } else {
                            pageNum = currentPage - 2 + i;
                          }
                          return (
                            <Button
                              key={pageNum}
                              variant={currentPage === pageNum ? "default" : "outline"}
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => setCurrentPage(pageNum)}
                            >
                              {pageNum}
                            </Button>
                          );
                        })}
                      </div>

                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(totalPages)}
                        disabled={currentPage === totalPages}
                      >
                        Última
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Ferramentas Tab */}
          <TabsContent value="ferramentas">
            <FerramentasTable />
          </TabsContent>

          {/* EPIs Tab */}
          <TabsContent value="epis">
            <EPIsTable />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default Homologados;
