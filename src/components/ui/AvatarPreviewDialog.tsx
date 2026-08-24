import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

interface AvatarPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  src?: string | null;
  name: string;
}

const getInitials = (name: string) => {
  const parts = name.trim().split(" ").filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  return name.substring(0, 2).toUpperCase();
};

export const AvatarPreviewDialog = ({ open, onOpenChange, src, name }: AvatarPreviewDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 overflow-hidden bg-background border-border">
        <DialogTitle className="sr-only">Foto de perfil de {name}</DialogTitle>
        <div className="flex flex-col items-center justify-center bg-gradient-to-b from-muted/30 to-background">
          {src ? (
            <img loading="lazy" decoding="async"
              src={src}
              alt={`Foto de perfil de ${name}`}
              className="w-full h-auto max-h-[80vh] object-contain select-none"
              draggable={false}
              onContextMenu={(e) => e.preventDefault()}
            />
          ) : (
            <div className="w-full aspect-square flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
              <span className="text-9xl font-bold text-primary/60">{getInitials(name)}</span>
            </div>
          )}
          <div className="w-full px-6 py-4 text-center border-t border-border/50 bg-background">
            <p className="font-semibold text-base text-foreground">{name}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
