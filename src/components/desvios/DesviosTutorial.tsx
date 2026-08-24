import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { HelpCircle, ChevronRight, ChevronLeft, AlertCircle, Plus, CheckCircle2, Check, Share2, ClipboardList, Clock, ShieldCheck, Printer, Mail, MessageSquare } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const tutorialSteps = [
  {
    title: "Visualizar e Filtrar Desvios",
    description: "Na tela principal, utilize os cards coloridos no topo para filtrar rapidamente os desvios por status: Total (cinza), Aberto (azul), Em Tratamento (âmbar), Concluído (verde) ou Atrasado (vermelho).",
    component: (
      <div className="w-full h-full p-4 bg-background flex flex-col gap-4">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {[
            { label: "Total", val: "12", color: "bg-gray-100 dark:bg-gray-800", text: "text-gray-500" },
            { label: "Aberto", val: "5", color: "bg-blue-50", text: "text-blue-500" },
            { label: "Em Tratamento", val: "3", color: "bg-amber-50", text: "text-amber-500" },
            { label: "Concluído", val: "4", color: "bg-green-50", text: "text-green-500" },
            { label: "Atrasado", val: "1", color: "bg-red-50", text: "text-red-500" }
          ].map((s) => (
            <div key={s.label} className={`${s.color} rounded-xl p-2 border flex flex-col items-center justify-center shadow-sm`}>
              <span className="text-[10px] font-bold uppercase tracking-tight text-muted-foreground">{s.label}</span>
              <span className={`text-lg font-black ${s.text}`}>{s.val}</span>
            </div>
          ))}
        </div>
        <div className="flex-1 border rounded-lg overflow-hidden bg-muted/20 flex flex-col">
          <div className="h-8 border-b bg-muted/40 flex items-center px-3 justify-between">
            <div className="h-2 w-24 bg-muted rounded" />
            <div className="h-4 w-4 bg-muted rounded-full" />
          </div>
          <div className="p-3 space-y-2">
            {[1, 2].map(i => (
              <div key={i} className="h-10 border rounded bg-background flex items-center px-3 gap-3">
                <div className="h-4 w-4 rounded bg-blue-500/20" />
                <div className="h-2 flex-1 bg-muted rounded" />
                <div className="h-4 w-12 bg-muted rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  },
  {
    title: "Criar Novo Desvio",
    description: "Clique no botão '+ Novo Desvio' para abrir o formulário. Preencha a descrição do problema, anexe fotos/vídeos clicando em 'Adicionar Anexo' e defina o nível de prioridade.",
    component: (
      <div className="w-full h-full p-4 bg-background overflow-y-auto">
        <Card className="border-primary/20">
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-500" />
              Problema / Assunto
            </CardTitle>
          </CardHeader>
          <CardContent className="py-2 px-4 space-y-3">
            <div className="space-y-1">
              <div className="h-2 w-20 bg-muted rounded" />
              <div className="h-20 w-full border rounded bg-muted/10 p-2">
                <div className="h-2 w-3/4 bg-muted/30 rounded" />
              </div>
            </div>
            <div className="p-3 border-2 border-dashed rounded-lg flex flex-col items-center gap-2 bg-muted/5">
              <Plus className="w-5 h-5 text-primary" />
              <span className="text-[10px] font-medium text-muted-foreground uppercase">Adicionar Anexo</span>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  },
  {
    title: "Definir Responsável e Tratativa",
    description: "Na segunda coluna, escreva as instruções para correção. Selecione o usuário responsável (ele receberá uma notificação) e defina o prazo para conclusão.",
    component: (
      <div className="w-full h-full p-4 bg-background grid grid-cols-1 gap-4">
        <Card className="border-green-500/20">
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm flex items-center gap-2 text-green-600">
              <CheckCircle2 className="w-4 h-4" />
              Tratativa
            </CardTitle>
          </CardHeader>
          <CardContent className="py-2 px-4 space-y-3">
             <div className="space-y-1">
              <div className="h-2 w-32 bg-muted rounded" />
              <div className="h-10 w-full border rounded flex items-center px-3 gap-2">
                <ShieldCheck className="w-4 h-4 text-primary" />
                <div className="h-2 w-24 bg-muted rounded" />
              </div>
            </div>
            <div className="space-y-1">
              <div className="h-2 w-24 bg-muted rounded" />
              <div className="h-10 w-full border rounded flex items-center px-3 gap-2">
                <Clock className="w-4 h-4 text-orange-500" />
                <div className="h-2 w-20 bg-muted rounded" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  },
  {
    title: "Exportar e Compartilhar",
    description: "Após salvar, você pode gerar um PDF profissional clicando em 'Imprimir', ou compartilhar os detalhes rapidamente via WhatsApp ou E-mail utilizando os botões de ação.",
    component: (
      <div className="w-full h-full p-6 bg-background flex flex-col items-center justify-center gap-6">
        <div className="flex gap-4">
          <div className="flex flex-col items-center gap-2">
            <div className="p-4 rounded-full bg-blue-50 border shadow-sm">
              <Printer className="w-6 h-6 text-blue-600" />
            </div>
            <span className="text-[10px] font-bold uppercase">PDF</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="p-4 rounded-full bg-green-50 border shadow-sm">
              <MessageSquare className="w-6 h-6 text-green-600" />
            </div>
            <span className="text-[10px] font-bold uppercase">WhatsApp</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="p-4 rounded-full bg-red-50 border shadow-sm">
              <Mail className="w-6 h-6 text-red-600" />
            </div>
            <span className="text-[10px] font-bold uppercase">E-mail</span>
          </div>
        </div>
        <div className="w-full max-w-[240px] p-3 border rounded-xl bg-muted/10">
          <div className="h-2 w-full bg-muted/40 rounded mb-2" />
          <div className="h-2 w-3/4 bg-muted/40 rounded mb-2" />
          <div className="h-2 w-1/2 bg-muted/40 rounded" />
        </div>
      </div>
    )
  }
];

export function DesviosTutorial() {
  const [currentStep, setCurrentStep] = useState(0);

  const nextStep = () => {
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" className="rounded-full shadow-sm hover:bg-primary hover:text-white transition-all">
          <HelpCircle className="w-5 h-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] gap-0 p-0 overflow-hidden flex flex-col">
        <DialogHeader className="p-6 pb-0 flex-shrink-0">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <HelpCircle className="w-6 h-6 text-primary" />
            Tutorial: Página de Desvios
          </DialogTitle>
        </DialogHeader>
        
        <div className="p-6 space-y-6 flex-1 min-h-0 overflow-y-auto">
          <div className="relative aspect-video rounded-2xl overflow-hidden border shadow-inner bg-muted/30 group">
            <div className="w-full h-full transition-all duration-500">
              {tutorialSteps[currentStep].component}
            </div>
            <div className="absolute top-3 left-3">
              <Badge className="bg-primary/90 hover:bg-primary font-black px-3">
                PASSO {currentStep + 1}
              </Badge>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="font-black text-xl text-primary tracking-tight leading-none">
              {tutorialSteps[currentStep].title}
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed font-medium">
              {tutorialSteps[currentStep].description}
            </p>
          </div>

          <div className="flex items-center justify-between pt-6 border-t">
            <div className="flex gap-1.5">
              {tutorialSteps.map((_, i) => (
                <div 
                  key={i} 
                  className={`h-1.5 rounded-full transition-all duration-300 ${i === currentStep ? 'w-8 bg-primary' : 'w-2 bg-muted'}`}
                />
              ))}
            </div>
            <div className="flex gap-2">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={prevStep} 
                disabled={currentStep === 0}
                className="font-bold uppercase text-[10px] tracking-widest"
              >
                <ChevronLeft className="w-4 h-4 mr-1" /> Anterior
              </Button>
              <Button 
                size="sm" 
                onClick={nextStep} 
                disabled={currentStep === tutorialSteps.length - 1}
                className="font-bold uppercase text-[10px] tracking-widest px-4 shadow-md"
              >
                Próximo <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

