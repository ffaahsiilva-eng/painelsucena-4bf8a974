import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Zap } from "lucide-react";
import { ANIMATED_EMOJIS, type AnimatedEmojiDef } from "./AnimatedEmoji";

interface AnimatedEmojiPickerProps {
  onSelect: (emojiId: string) => void;
}

export function AnimatedEmojiPicker({ onSelect }: AnimatedEmojiPickerProps) {
  const [open, setOpen] = useState(false);

  const categories = Array.from(new Set(ANIMATED_EMOJIS.map((e) => e.category)));

  const handleSelect = (def: AnimatedEmojiDef) => {
    onSelect(def.id);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-muted-foreground gap-1.5 text-xs"
          title="Emojis animados"
        >
          <Zap className="h-4 w-4" />
          Animado
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2" side="top" align="start">
        <p className="text-xs font-semibold text-muted-foreground mb-2">Emojis Animados</p>
        {categories.map((cat) => (
          <div key={cat} className="mb-2">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70 mb-1">{cat}</p>
            <div className="flex flex-wrap gap-1">
              {ANIMATED_EMOJIS.filter((e) => e.category === cat).map((def) => (
                <button
                  key={def.id}
                  onClick={() => handleSelect(def)}
                  className="text-xl p-1 rounded-md hover:bg-accent hover:scale-110 transition-all"
                  title={def.label}
                >
                  {def.emoji}
                </button>
              ))}
            </div>
          </div>
        ))}
      </PopoverContent>
    </Popover>
  );
}
