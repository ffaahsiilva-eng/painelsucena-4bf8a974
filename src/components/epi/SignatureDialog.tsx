import { useRef, useState, useEffect, useCallback, forwardRef, useImperativeHandle } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Eraser, Check, ArrowRight } from "lucide-react";

interface SignatureCanvasHandle {
  getDataUrl: () => string;
  clear: () => void;
}

interface SignatureCanvasProps {
  label: string;
  onHasSignatureChange: (hasSig: boolean) => void;
}

const SignatureCanvas = forwardRef<SignatureCanvasHandle, SignatureCanvasProps>(
  ({ label, onHasSignatureChange }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const isDrawing = useRef(false);
    const hasDrawn = useRef(false);
    const lastPoint = useRef<{ x: number; y: number } | null>(null);

    const getCtx = useCallback(() => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.strokeStyle = "#1a1a1a";
        ctx.lineWidth = 2.5;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
      }
      return ctx;
    }, []);

    const getPos = (e: PointerEvent | React.PointerEvent) => {
      const canvas = canvasRef.current!;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
    };

    const clearCanvas = useCallback(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
      hasDrawn.current = false;
      onHasSignatureChange(false);
    }, [onHasSignatureChange]);

    useImperativeHandle(ref, () => ({
      getDataUrl: () => {
        const canvas = canvasRef.current;
        if (!canvas || !hasDrawn.current) return "";
        return canvas.toDataURL("image/png");
      },
      clear: clearCanvas,
    }), [clearCanvas]);

    useEffect(() => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;

      const resize = () => {
        const width = container.clientWidth;
        canvas.width = Math.max(width * 1.5, 380);
        canvas.height = Math.max(width * 0.5, 170);
      };
      resize();
      window.addEventListener("resize", resize);

      const ctx = getCtx();

      const handleDown = (e: PointerEvent) => {
        e.preventDefault();
        try { canvas.setPointerCapture(e.pointerId); } catch {}
        isDrawing.current = true;
        const p = getPos(e);
        lastPoint.current = p;
        if (!ctx) return;
        // desenha um ponto inicial (curto segmento) sem acumular path
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x + 0.01, p.y + 0.01);
        ctx.stroke();
        if (!hasDrawn.current) {
          hasDrawn.current = true;
          onHasSignatureChange(true);
        }
      };
      const handleMove = (e: PointerEvent) => {
        if (!isDrawing.current || !ctx) return;
        e.preventDefault();
        const last = lastPoint.current;
        // coalesce pointer events quando disponível (menos re-renders do canvas)
        const events = (e as any).getCoalescedEvents ? (e as any).getCoalescedEvents() : [e];
        ctx.beginPath();
        if (last) ctx.moveTo(last.x, last.y);
        let lp = last;
        for (const ev of events) {
          const p = getPos(ev);
          if (!lp) { ctx.moveTo(p.x, p.y); lp = p; continue; }
          ctx.lineTo(p.x, p.y);
          lp = p;
        }
        ctx.stroke();
        if (lp) lastPoint.current = lp;
      };
      const handleUp = () => {
        isDrawing.current = false;
        lastPoint.current = null;
      };

      canvas.addEventListener("pointerdown", handleDown);
      canvas.addEventListener("pointermove", handleMove);
      canvas.addEventListener("pointerup", handleUp);
      canvas.addEventListener("pointercancel", handleUp);
      canvas.addEventListener("pointerleave", handleUp);

      return () => {
        window.removeEventListener("resize", resize);
        canvas.removeEventListener("pointerdown", handleDown);
        canvas.removeEventListener("pointermove", handleMove);
        canvas.removeEventListener("pointerup", handleUp);
        canvas.removeEventListener("pointercancel", handleUp);
        canvas.removeEventListener("pointerleave", handleUp);
      };
    }, [getCtx, onHasSignatureChange]);

    return (
      <div className="space-y-2" ref={containerRef}>
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-foreground">{label}</span>
          <Button variant="ghost" size="sm" onClick={clearCanvas} className="gap-1 text-xs">
            <Eraser className="h-3 w-3" /> Limpar
          </Button>
        </div>
        <div className="relative rounded-md border-2 border-dashed border-border bg-white overflow-hidden">
          <canvas
            ref={canvasRef}
            className="w-full cursor-crosshair touch-none block"
            style={{ height: "clamp(170px, 32vw, 210px)" }}
          />
          <div className="absolute bottom-3 left-4 right-4 border-b border-muted-foreground/30 pointer-events-none" />
          <span className="absolute bottom-1 left-4 text-[10px] text-muted-foreground/50 pointer-events-none">
            Assine acima da linha
          </span>
        </div>
      </div>
    );
  }
);
SignatureCanvas.displayName = "SignatureCanvas";

interface SignatureDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (sigFuncionario: string, sigAutorizador: string) => void;
  label1?: string;
  label2?: string;
  title1?: string;
  title2?: string;
  singleStep?: boolean;
}

export function SignatureDialog({ open, onClose, onConfirm, label1, label2, title1, title2, singleStep }: SignatureDialogProps) {
  const [step, setStep] = useState<1 | 2>(singleStep ? 2 : 1);
  const [hasSigAutorizador, setHasSigAutorizador] = useState(false);
  const [hasSigFuncionario, setHasSigFuncionario] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const autorizadorRef = useRef<SignatureCanvasHandle>(null);
  const funcionarioRef = useRef<SignatureCanvasHandle>(null);
  const sigAutorizadorData = useRef<string>("");

  const firstLabel = label1 || "Assinatura do Autorizador";
  const secondLabel = label2 || "Assinatura do Funcionário";
  const firstTitle = title1 || "Assinatura do Autorizador (1/2)";
  const secondTitle = singleStep ? (title2 || "Assinatura") : (title2 || "Assinatura do Funcionário (2/2)");

  useEffect(() => {
    if (open) {
      setStep(singleStep ? 2 : 1);
      setHasSigAutorizador(false);
      setHasSigFuncionario(false);
      setSubmitting(false);
      sigAutorizadorData.current = "";
    }
  }, [open, singleStep]);

  const handleNext = () => {
    // Capture autorizador signature once, then move to step 2
    sigAutorizadorData.current = autorizadorRef.current?.getDataUrl() || "";
    setStep(2);
  };

  const handleConfirm = () => {
    if (submitting) return;
    const sigFuncionario = funcionarioRef.current?.getDataUrl() || "";
    if (!sigFuncionario) return;
    setSubmitting(true);
    // Fire and forget — parent handles background persistence
    try {
      onConfirm(sigFuncionario, sigAutorizadorData.current);
    } catch {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && !submitting && onClose()}>
      <DialogContent className="max-w-lg w-[95vw] p-3 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-base sm:text-lg">
            {step === 1 ? firstTitle : secondTitle}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {step === 1 ? (
            <>
              <SignatureCanvas
                key="autorizador"
                ref={autorizadorRef}
                label={firstLabel}
                onHasSignatureChange={setHasSigAutorizador}
              />
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={onClose}>Cancelar</Button>
                <Button
                  onClick={handleNext}
                  disabled={!hasSigAutorizador}
                  className="gap-1"
                  size="sm"
                >
                  Próximo <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </>
          ) : (
            <>
              <SignatureCanvas
                key="funcionario"
                ref={funcionarioRef}
                label={secondLabel}
                onHasSignatureChange={setHasSigFuncionario}
              />
              <div className="flex justify-end gap-2 pt-2">
                {!singleStep && <Button variant="outline" size="sm" onClick={() => setStep(1)} disabled={submitting}>Voltar</Button>}
                <Button variant="outline" size="sm" onClick={onClose} disabled={submitting}>Cancelar</Button>
                <Button
                  onClick={handleConfirm}
                  disabled={!hasSigFuncionario || submitting}
                  className="gap-1"
                  size="sm"
                >
                  <Check className="h-4 w-4" /> {submitting ? "Salvando..." : "Confirmar"}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
