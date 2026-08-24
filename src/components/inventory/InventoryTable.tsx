import { useState } from "react";
import { format } from "date-fns";
import { 
  Package, 
  AlertTriangle, 
  MoreHorizontal, 
  ArrowRightLeft, 
  Edit, 
  Trash2,
  MapPin,
  Shield,
  History,
  ImageIcon
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { InventoryItem, useDeleteItem } from "@/hooks/useInventory";
import { MovementDialog } from "./MovementDialog";
import { MovementHistoryDialog } from "./MovementHistoryDialog";
import { useInventoryPermissions } from "@/hooks/useInventoryPermissions";

interface InventoryTableProps {
  items: InventoryItem[];
  onEdit?: (item: InventoryItem) => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  epi: "EPI",
  ferramentas: "Ferramentas",
  materiais: "Materiais",
  escritorio: "Escritório",
  limpeza: "Limpeza",
  geral: "Geral",
};

export function InventoryTable({ items, onEdit }: InventoryTableProps) {
  const [movementItem, setMovementItem] = useState<InventoryItem | null>(null);
  const [historyItem, setHistoryItem] = useState<InventoryItem | null>(null);
  const [deleteItem, setDeleteItem] = useState<InventoryItem | null>(null);
  const deleteItemMutation = useDeleteItem();
  const { canEditInventory } = useInventoryPermissions();
  const handleDelete = async () => {
    if (deleteItem) {
      await deleteItemMutation.mutateAsync(deleteItem.id);
      setDeleteItem(null);
    }
  };

  const isLowStock = (item: InventoryItem) => item.quantity <= item.min_quantity;
  const isCaExpiring = (item: InventoryItem) => {
    if (!item.ca_expiry) return false;
    const expiryDate = new Date(item.ca_expiry);
    const today = new Date();
    const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry <= 30 && daysUntilExpiry >= 0;
  };
  const isCaExpired = (item: InventoryItem) => {
    if (!item.ca_expiry) return false;
    return new Date(item.ca_expiry) < new Date();
  };

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead className="text-center">Quantidade</TableHead>
              <TableHead>Local</TableHead>
              <TableHead>CA</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  Nenhum item encontrado
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => (
                <TableRow key={item.id}>
                 <TableCell>
                    <div className="flex items-center gap-2">
                      {/* Photo thumbnails */}
                      {item.photo_urls && item.photo_urls.length > 0 && (
                        <div className="flex -space-x-1 flex-shrink-0">
                          {item.photo_urls.slice(0, 2).map((url, i) => (
                            <img loading="lazy" decoding="async"
                              key={i}
                              src={url}
                              alt={`Foto ${i + 1}`}
                              className="w-8 h-8 rounded object-cover border border-background"
                            />
                          ))}
                          {item.photo_urls.length > 2 && (
                            <span className="w-8 h-8 rounded bg-muted flex items-center justify-center text-[10px] text-muted-foreground border border-background">
                              +{item.photo_urls.length - 2}
                            </span>
                          )}
                        </div>
                      )}
                      {isLowStock(item) && (
                        <AlertTriangle className="h-4 w-4 text-yellow-500 flex-shrink-0" />
                      )}
                      <div>
                        <p className="font-medium">{item.name}</p>
                        {item.notes && (
                          <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                            {item.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {CATEGORY_LABELS[item.category] || item.category}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex flex-col items-center">
                      <span className={`font-semibold ${isLowStock(item) ? "text-yellow-500" : ""}`}>
                        {item.quantity}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {item.unit} (mín: {item.min_quantity})
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {item.storage_locations ? (
                      <div className="flex items-center gap-1 text-sm">
                        <MapPin className="h-3 w-3 text-muted-foreground" />
                        {item.storage_locations.name}
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {item.ca_number ? (
                      <div className="flex items-center gap-1">
                        <Shield className="h-3 w-3 text-muted-foreground" />
                        <div className="text-sm">
                          <span>{item.ca_number}</span>
                          {item.ca_expiry && (
                            <p className={`text-xs ${
                              isCaExpired(item) 
                                ? "text-red-500" 
                                : isCaExpiring(item) 
                                  ? "text-yellow-500" 
                                  : "text-muted-foreground"
                            }`}>
                              {isCaExpired(item) ? "Vencido" : `Val: ${format(new Date(item.ca_expiry), "dd/MM/yy")}`}
                            </p>
                          )}
                        </div>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {canEditInventory && (
                          <DropdownMenuItem onClick={() => setMovementItem(item)}>
                            <ArrowRightLeft className="h-4 w-4 mr-2" />
                            Movimentar
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => setHistoryItem(item)}>
                          <History className="h-4 w-4 mr-2" />
                          Histórico
                        </DropdownMenuItem>
                        {canEditInventory && (
                          <>
                            <DropdownMenuSeparator />
                            {onEdit && (
                              <DropdownMenuItem onClick={() => onEdit(item)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Editar
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              onClick={() => setDeleteItem(item)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Excluir
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <MovementDialog
        item={movementItem}
        open={!!movementItem}
        onOpenChange={(open) => !open && setMovementItem(null)}
      />

      <MovementHistoryDialog
        item={historyItem}
        open={!!historyItem}
        onOpenChange={(open) => !open && setHistoryItem(null)}
      />

      <AlertDialog open={!!deleteItem} onOpenChange={(open) => !open && setDeleteItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o item "{deleteItem?.name}"? 
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
