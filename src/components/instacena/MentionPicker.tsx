import { useState, useEffect, useRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";

interface Profile {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
}

interface MentionPickerProps {
  query: string;
  onSelect: (profile: Profile) => void;
  visible: boolean;
}

const getInitials = (name: string) => {
  const parts = name.split(" ");
  if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  return name.substring(0, 2).toUpperCase();
};

export function MentionPicker({ query, onSelect, visible }: MentionPickerProps) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!visible) {
      setProfiles([]);
      return;
    }

    const fetchProfiles = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url")
        .ilike("full_name", `%${query}%`)
        .limit(6);

      const list: Profile[] = data || [];

      // Always show "Todos" at the top when query matches "todos" prefix or is empty
      const q = query.toLowerCase();
      if (q === "" || "todos".startsWith(q)) {
        list.unshift({
          user_id: "ALL",
          full_name: "Todos",
          avatar_url: null,
        });
      }

      setProfiles(list);
      setSelectedIndex(0);
    };

    fetchProfiles();
  }, [query, visible]);

  useEffect(() => {
    if (!visible) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, profiles.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter" && profiles.length > 0) {
        e.preventDefault();
        onSelect(profiles[selectedIndex]);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [visible, profiles, selectedIndex, onSelect]);

  if (!visible || profiles.length === 0) return null;

  return (
    <div
      ref={containerRef}
      className="absolute bottom-full left-0 mb-1 w-64 bg-popover border border-border rounded-lg shadow-lg z-50 overflow-hidden animate-scale-in"
    >
      {profiles.map((p, i) => {
        const isAll = p.user_id === "ALL";
        return (
          <button
            key={p.user_id}
            onClick={() => onSelect(p)}
            className={`flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-accent transition-colors ${
              i === selectedIndex ? "bg-accent" : ""
            } ${isAll ? "border-b border-border" : ""}`}
          >
            <Avatar className="h-6 w-6">
              <AvatarImage src={p.avatar_url || undefined} className="object-cover" />
              <AvatarFallback className={`text-[10px] ${isAll ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"}`}>
                {isAll ? "@" : getInitials(p.full_name)}
              </AvatarFallback>
            </Avatar>
            <span className={`truncate ${isAll ? "font-bold text-primary" : ""}`}>
              {isAll ? "Todos (notificar todo o sistema)" : p.full_name}
            </span>
          </button>
        );
      })}
    </div>
  );
}
