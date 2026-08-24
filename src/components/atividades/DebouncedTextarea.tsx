import { memo, useEffect, useRef, useState } from "react";
import { Textarea } from "@/components/ui/textarea";

interface DebouncedTextareaProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
  disabled?: boolean;
  delay?: number;
}

/**
 * Textarea com estado local + debounce para sincronizar com o parent.
 * Evita re-render do parent a cada tecla (mantém o cursor estável e a digitação fluida).
 */
export const DebouncedTextarea = memo(function DebouncedTextarea({
  value,
  onChange,
  placeholder,
  rows,
  className,
  disabled,
  delay = 250,
}: DebouncedTextareaProps) {
  const [local, setLocal] = useState(value);
  const lastEmitted = useRef(value);
  const timer = useRef<number | null>(null);

  // Sincroniza quando o valor externo muda (ex.: carregar do banco, IA, reset)
  useEffect(() => {
    if (value !== lastEmitted.current) {
      setLocal(value);
      lastEmitted.current = value;
    }
  }, [value]);

  useEffect(() => {
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const v = e.target.value;
    setLocal(v);
    // Delay removido: emite imediatamente para o parent.
    lastEmitted.current = v;
    onChange(v);
  };

  const handleBlur = () => {
    if (timer.current) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
    if (local !== lastEmitted.current) {
      lastEmitted.current = local;
      onChange(local);
    }
  };

  return (
    <Textarea
      value={local}
      onChange={handleChange}
      onBlur={handleBlur}
      placeholder={placeholder}
      rows={rows}
      className={className}
      disabled={disabled}
    />
  );
});
