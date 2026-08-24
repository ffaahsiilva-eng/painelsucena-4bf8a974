import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className="relative h-9 w-9 group overflow-hidden"
    >
      <div className="relative h-5 w-5">
        <Sun className="absolute inset-0 h-5 w-5 rotate-0 scale-100 transition-all duration-500 ease-out group-hover:rotate-45 dark:-rotate-180 dark:scale-0" />
        <Moon className="absolute inset-0 h-5 w-5 rotate-180 scale-0 transition-all duration-500 ease-out group-hover:-rotate-12 dark:rotate-0 dark:scale-100" />
      </div>
      <span className="sr-only">Alternar tema</span>
    </Button>
  );
}
