import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Filter, X, Wrench, AlertTriangle, CheckCircle, Shield, Eye, ChevronLeft, ChevronRight } from "lucide-react";
import { ferramentasHomologadas, categoriasFerramentas, type FerramentaHomologada } from "@/data/ferramentasHomologadas";
import { FerramentaDetailDialog } from "./FerramentaDetailDialog";

const ITEMS_PER_PAGE_OPTIONS = [10, 25, 50];

export function FerramentasTable() {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoriaFilter, setCategoriaFilter] = useState<string>("todos");
  const [riscoFilter, setRiscoFilter] = useState<string>("todos");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [selectedFerramenta, setSelectedFerramenta] = useState<FerramentaHomologada | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const filteredFerramentas = useMemo(() => {
    return ferramentasHomologadas.filter((ferramenta) => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch =
        searchTerm === "" ||
        ferramenta.nome.toLowerCase().includes(searchLower) ||
        ferramenta.caracteristicas.toLowerCase().includes(searchLower);

      const matchesCategoria =
        categoriaFilter === "todos" ||
        ferramenta.categoria === categoriaFilter;

      const matchesRisco =
        riscoFilter === "todos" ||
        ferramenta.nivelRisco === riscoFilter;

      return matchesSearch && matchesCategoria && matchesRisco;
    });
  }, [searchTerm, categoriaFilter, riscoFilter]);

  const clearFilters = () => {
    setSearchTerm("");
    setCategoriaFilter("todos");
    setRiscoFilter("todos");
    setCurrentPage(1);
  };

  // Pagination calculations
  const totalPages = Math.ceil(filteredFerramentas.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedFerramentas = filteredFerramentas.slice(startIndex, endIndex);

  const handleFilterChange = (setter: (value: string) => void) => (value: string) => {
    setter(value);
    setCurrentPage(1);
  };

  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(Number(value));
    setCurrentPage(1);
  };

  const handleViewDetails = (ferramenta: FerramentaHomologada) => {
    setSelectedFerramenta(ferramenta);
    setDialogOpen(true);
  };

  const hasActiveFilters = searchTerm !== "" || categoriaFilter !== "todos" || riscoFilter !== "todos";

  // Statistics
  const stats = useMemo(() => ({
    total: ferramentasHomologadas.length,
    alto: ferramentasHomologadas.filter(f => f.nivelRisco === "Alto").length,
    moderado: ferramentasHomologadas.filter(f => f.nivelRisco === "Moderado").length,
    controlado: ferramentasHomologadas.filter(f => f.nivelRisco === "Controlado").length,
  }), []);

  const getRiskBadge = (nivel: string) => {
    switch (nivel) {
      case "Alto":
        return <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" />Alto</Badge>;
      case "Moderado":
        return <Badge className="gap-1 bg-amber-500/10 text-amber-600 border-amber-500/20"><Shield className="h-3 w-3" />Moderado</Badge>;
      default:
        return <Badge className="gap-1 bg-green-500/10 text-green-600 border-green-500/20"><CheckCircle className="h-3 w-3" />Controlado</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-full bg-primary/10">
              <Wrench className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-primary">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Total Ferramentas</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-red-500/5 border-red-500/20">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-full bg-red-500/10">
              <AlertTriangle className="h-5 w-5 text-red-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-red-500">{stats.alto}</p>
              <p className="text-xs text-muted-foreground">Risco Alto</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-amber-500/5 border-amber-500/20">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-full bg-amber-500/10">
              <Shield className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-500">{stats.moderado}</p>
              <p className="text-xs text-muted-foreground">Risco Moderado</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-green-500/5 border-green-500/20">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-full bg-green-500/10">
              <CheckCircle className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-green-500">{stats.controlado}</p>
              <p className="text-xs text-muted-foreground">Risco Controlado</p>
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
              placeholder="Buscar por nome ou característica..."
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
                <SelectContent className="bg-popover border">
                  <SelectItem value="todos">Todas as categorias</SelectItem>
                  {categoriasFerramentas.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Nível de Risco</label>
              <Select value={riscoFilter} onValueChange={handleFilterChange(setRiscoFilter)}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent className="bg-popover border">
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="Controlado">Controlado</SelectItem>
                  <SelectItem value="Moderado">Moderado</SelectItem>
                  <SelectItem value="Alto">Alto</SelectItem>
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
              Mostrando <span className="font-semibold text-foreground">{Math.min(startIndex + 1, filteredFerramentas.length)}-{Math.min(endIndex, filteredFerramentas.length)}</span> de{" "}
              <span className="font-semibold text-foreground">{filteredFerramentas.length}</span> ferramentas
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

      {/* Tools Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold">
                    <div className="flex items-center gap-2">
                      <Wrench className="h-4 w-4" />
                      Ferramenta
                    </div>
                  </TableHead>
                  <TableHead className="font-semibold">Categoria</TableHead>
                  <TableHead className="font-semibold text-center">Nível de Risco</TableHead>
                  <TableHead className="font-semibold text-center">EPIs</TableHead>
                  <TableHead className="font-semibold text-center">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFerramentas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12">
                      <div className="flex flex-col items-center gap-3 text-muted-foreground">
                        <Search className="h-12 w-12 opacity-30" />
                        <p className="text-lg font-medium">Nenhuma ferramenta encontrada</p>
                        <p className="text-sm">Tente ajustar os filtros ou termo de busca</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedFerramentas.map((ferramenta) => (
                    <TableRow key={ferramenta.id} className="hover:bg-muted/30 cursor-pointer" onClick={() => handleViewDetails(ferramenta)}>
                      <TableCell className="font-medium max-w-[250px]">
                        <div className="flex items-center gap-3">
                          {ferramenta.foto ? (
                            <img loading="lazy" decoding="async"
                              src={ferramenta.foto}
                              alt={ferramenta.nome}
                              className="w-10 h-10 rounded object-cover border flex-shrink-0 bg-white"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded border flex items-center justify-center bg-muted flex-shrink-0">
                              <Wrench className="h-4 w-4 text-muted-foreground" />
                            </div>
                          )}
                          <span className="line-clamp-2">{ferramenta.nome}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{ferramenta.categoria}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {getRiskBadge(ferramenta.nivelRisco)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary" className="font-mono">
                          {ferramenta.epis.length}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewDetails(ferramenta);
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
      <FerramentaDetailDialog
        ferramenta={selectedFerramenta}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  );
}
