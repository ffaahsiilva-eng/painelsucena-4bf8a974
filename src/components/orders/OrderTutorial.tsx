import React from "react";
import { HelpCircle, ChevronRight, CheckCircle2, Package, User, ClipboardList, Camera } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const tutorialSteps = [
  {
    title: "Acesse a página de Pedidos",
    description: "No menu lateral, clique em 'Almoxarifado' e depois em 'Pedidos'.",
    icon: Package,
    image: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?q=80&w=2070&auto=format&fit=crop",
  },
  {
    title: "Inicie um Novo Pedido",
    description: "Clique no botão azul 'Novo Pedido' no canto superior direito.",
    icon: CheckCircle2,
    image: "https://images.unsplash.com/photo-1534415666382-7468873d2361?q=80&w=2070&auto=format&fit=crop",
  },
  {
    title: "Preencha os detalhes do material",
    description: "Digite o nome do produto (ex: EPI, Bota, Luva), a quantidade e a unidade de medida.",
    icon: ClipboardList,
    image: "https://images.unsplash.com/photo-1590402494682-cd3fb53b1f70?q=80&w=2070&auto=format&fit=crop",
  },
  {
    title: "Adicione fotos ou use IA",
    description: "Você pode tirar uma foto do material necessário ou usar o botão 'IA' para gerar uma imagem representativa do produto.",
    icon: Camera,
    image: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=2070&auto=format&fit=crop",
  },
  {
    title: "Mencione o encarregado",
    description: "Se desejar, selecione um encarregado (Aux. Administrativo ou Almoxarifado) para agilizar o processo.",
    icon: User,
    image: "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?q=80&w=2070&auto=format&fit=crop",
  },
  {
    title: "Finalize e Salve",
    description: "Clique em 'Salvar Pedido'. O pedido será enviado e você poderá acompanhar o status na aba 'Meus Pedidos'.",
    icon: CheckCircle2,
    image: "https://images.unsplash.com/photo-1454165833767-027ffea9e787?q=80&w=2070&auto=format&fit=crop",
  },
];

export function OrderTutorial() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 border-primary/20 hover:bg-primary/5">
          <HelpCircle className="h-4 w-4 text-primary" />
          Como pedir?
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl sm:max-w-3xl max-h-[90vh] p-0 overflow-hidden flex flex-col">
        <DialogHeader className="p-6 border-b bg-muted/30">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <HelpCircle className="h-6 w-6 text-primary" />
            Tutorial: Como fazer uma Requisição
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 min-h-0 overflow-y-auto p-6">
          <div className="space-y-8 pb-8">
            <div className="bg-primary/5 border border-primary/10 rounded-xl p-4 mb-6">
              <p className="text-sm text-primary-foreground/80 leading-relaxed italic">
                Siga este passo a passo para solicitar EPIs ou qualquer material ao almoxarifado de forma correta e rápida.
              </p>
            </div>

            {tutorialSteps.map((step, index) => (
              <div key={index} className="relative">
                {index < tutorialSteps.length - 1 && (
                  <div className="absolute left-6 top-12 bottom-0 w-0.5 bg-border -mb-8" />
                )}
                <div className="flex gap-4 sm:gap-6">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center relative z-10 border-2 border-background">
                    <step.icon className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="h-6 w-6 rounded-full p-0 flex items-center justify-center border-primary/30 text-primary">
                        {index + 1}
                      </Badge>
                      <h3 className="font-bold text-lg">{step.title}</h3>
                    </div>
                    <p className="text-muted-foreground leading-relaxed">
                      {step.description}
                    </p>
                    <Card className="overflow-hidden border-border/40 shadow-sm bg-muted/20">
                      <CardContent className="p-0">
                        <img loading="lazy" decoding="async" 
                          src={step.image} 
                          alt={step.title} 
                          className="w-full h-48 sm:h-64 object-cover hover:scale-105 transition-transform duration-500"
                        />
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </div>
            ))}

            <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-6 text-center space-y-3 mt-10">
              <CheckCircle2 className="h-10 w-10 text-green-500 mx-auto" />
              <h4 className="font-bold text-lg text-green-700 dark:text-green-400">Pronto!</h4>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Agora você já sabe como fazer suas requisições. Lembre-se de anexar fotos para facilitar a identificação dos materiais.
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
