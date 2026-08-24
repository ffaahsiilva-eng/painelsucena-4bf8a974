import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Filter, X, HardHat, Shield, Eye, ChevronLeft, ChevronRight, Building2, Download } from "lucide-react";
import { episHomologados, categoriasEPIs, type EPIHomologado } from "@/data/episHomologados";
import { EPIDetailDialog } from "./EPIDetailDialog";

const ITEMS_PER_PAGE_OPTIONS = [10, 25, 50];

export function EPIsTable() {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoriaFilter, setCategoriaFilter] = useState<string>("todos");
  const [contratadasFilter, setContratadasFilter] = useState<string>("todos");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [selectedEPI, setSelectedEPI] = useState<EPIHomologado | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const filteredEPIs = useMemo(() => {
    return episHomologados.filter((epi) => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch =
        searchTerm === "" ||
        epi.nome.toLowerCase().includes(searchLower) ||
        epi.ca.toLowerCase().includes(searchLower) ||
        epi.descricaoProtecao.toLowerCase().includes(searchLower);

      const matchesCategoria =
        categoriaFilter === "todos" ||
        epi.categoria === categoriaFilter;

      const matchesContratadas =
        contratadasFilter === "todos" ||
        (contratadasFilter === "sim" && epi.contratadas) ||
        (contratadasFilter === "nao" && !epi.contratadas);

      return matchesSearch && matchesCategoria && matchesContratadas;
    });
  }, [searchTerm, categoriaFilter, contratadasFilter]);

  const clearFilters = () => {
    setSearchTerm("");
    setCategoriaFilter("todos");
    setContratadasFilter("todos");
    setCurrentPage(1);
  };

  // Pagination calculations
  const totalPages = Math.ceil(filteredEPIs.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedEPIs = filteredEPIs.slice(startIndex, endIndex);

  const handleFilterChange = (setter: (value: string) => void) => (value: string) => {
    setter(value);
    setCurrentPage(1);
  };

  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(Number(value));
    setCurrentPage(1);
  };

  const handleViewDetails = (epi: EPIHomologado) => {
    setSelectedEPI(epi);
    setDialogOpen(true);
  };

  const hasActiveFilters = searchTerm !== "" || categoriaFilter !== "todos" || contratadasFilter !== "todos";

  // Statistics
  const stats = useMemo(() => ({
    total: episHomologados.length,
    categorias: categoriasEPIs.length,
    contratadas: episHomologados.filter(e => e.contratadas).length,
    hydro: episHomologados.filter(e => !e.contratadas).length,
  }), []);

  return (
    <div className="space-y-6">
      {/* Download & View Catálogo Buttons */}
      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          asChild
        >
          <a href="/catalogo-epis-homologados.pdf" target="_blank" rel="noopener noreferrer">
            <Eye className="h-4 w-4 text-blue-500" />
            <span className="hidden sm:inline">Visualizar</span>
          </a>
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          asChild
        >
          <a href="/catalogo-epis-homologados.pdf" download="Catálogo de EPIs Homologados.pdf">
            <Download className="h-4 w-4 text-red-500" />
            <span className="hidden sm:inline">Exportar</span>
          </a>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-full bg-primary/10">
              <HardHat className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-primary">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Total EPIs</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-blue-500/5 border-blue-500/20">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-full bg-blue-500/10">
              <Shield className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-500">{stats.categorias}</p>
              <p className="text-xs text-muted-foreground">Categorias</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-green-500/5 border-green-500/20">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-full bg-green-500/10">
              <HardHat className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-green-500">{stats.hydro}</p>
              <p className="text-xs text-muted-foreground">Hydro</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-amber-500/5 border-amber-500/20">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-full bg-amber-500/10">
              <Building2 className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-500">{stats.contratadas}</p>
              <p className="text-xs text-muted-foreground">Contratadas</p>
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
              placeholder="Buscar por nome, CA ou descrição..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-10"
            />
          </div>

          {/* Filters Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Categoria</label>
              <Select value={categoriaFilter} onValueChange={handleFilterChange(setCategoriaFilter)}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Todas as categorias" />
                </SelectTrigger>
                <SelectContent className="bg-popover border max-h-[300px]">
                  <SelectItem value="todos">Todas as categorias</SelectItem>
                  {categoriasEPIs.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Disponível para</label>
              <Select value={contratadasFilter} onValueChange={handleFilterChange(setContratadasFilter)}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent className="bg-popover border">
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="nao">Hydro</SelectItem>
                  <SelectItem value="sim">Contratadas</SelectItem>
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
              Mostrando <span className="font-semibold text-foreground">{Math.min(startIndex + 1, filteredEPIs.length)}-{Math.min(endIndex, filteredEPIs.length)}</span> de{" "}
              <span className="font-semibold text-foreground">{filteredEPIs.length}</span> EPIs
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

      {/* EPIs Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold">
                    <div className="flex items-center gap-2">
                      <HardHat className="h-4 w-4" />
                      EPI
                    </div>
                  </TableHead>
                  <TableHead className="font-semibold">CA</TableHead>
                  <TableHead className="font-semibold">Categoria</TableHead>
                  <TableHead className="font-semibold text-center">Disponível</TableHead>
                  <TableHead className="font-semibold text-center">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEPIs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12">
                      <div className="flex flex-col items-center gap-3 text-muted-foreground">
                        <Search className="h-12 w-12 opacity-30" />
                        <p className="text-lg font-medium">Nenhum EPI encontrado</p>
                        <p className="text-sm">Tente ajustar os filtros ou termo de busca</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedEPIs.map((epi) => (
                    <TableRow key={epi.id} className="hover:bg-muted/30 cursor-pointer" onClick={() => handleViewDetails(epi)}>
                      <TableCell className="font-medium max-w-[300px]">
                        <div className="flex items-center gap-3">
                          {epi.foto && (
                            <img loading="lazy" decoding="async"
                              src={epi.foto}
                              alt={epi.nome}
                              className="w-10 h-10 rounded object-cover border shrink-0"
                            />
                          )}
                          <span className="line-clamp-2">{epi.nome}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono">
                          {epi.ca}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">
                          {epi.categoria}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {epi.contratadas ? (
                          <Badge className="gap-1 bg-amber-500/10 text-amber-600 border-amber-500/20">
                            <Building2 className="h-3 w-3" />
                            Contratadas
                          </Badge>
                        ) : (
                          <Badge className="gap-1 bg-green-500/10 text-green-600 border-green-500/20">
                            <HardHat className="h-3 w-3" />
                            Hydro
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewDetails(epi);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                          <span className="hidden sm:inline">Ver Detalhes</span>
                        </Button>
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

      {/* Detail Dialog */}
      <EPIDetailDialog
        epi={selectedEPI}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  );
}
