import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserPlus, Camera, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { resolveStorageUrl } from "@/lib/storage";
import { Colaborador, funcoes } from "@/data/efetivoData";
import { toast } from "sonner";
import { compressImage } from "@/utils/imageCompression";


interface AddEmployeeDialogProps {
  onAdd: (employee: Omit<Colaborador, "id">) => void;
}

export const AddEmployeeDialog = ({ onAdd }: AddEmployeeDialogProps) => {
  const [open, setOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [formData, setFormData] = useState({
    nome: "",
    funcao: "",
    cpf: "",
    dataNascimento: "",
    admissao: "",
    matricula: "",
    matriculaHydro: "",
    contato: "",
    localidade: "BARCARENA - PA",
    foto: "",
  });
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const fileExt = file.name.split(".").pop();
      const fileName = `employee-photos/${Math.random()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("site-assets")
        .upload(fileName, await compressImage(file));

      if (uploadError) throw uploadError;

      setFormData({ ...formData, foto: fileName });
      const resolved = await resolveStorageUrl(fileName);
      setPreviewUrl(resolved);
      toast.success("Foto carregada com sucesso!");
    } catch (error) {
      console.error("Erro no upload:", error);
      toast.error("Erro ao carregar foto");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nome || !formData.funcao) {
      toast.error("Preencha os campos obrigatórios");
      return;
    }

    onAdd({ ...formData, matriculaHydro: formData.matriculaHydro || undefined });
    setFormData({
      nome: "",
      funcao: "",
      cpf: "",
      dataNascimento: "",
      admissao: "",
      matricula: "",
      matriculaHydro: "",
      contato: "",
      localidade: "BARCARENA - PA",
      foto: "",
    });
    setPreviewUrl(null);
    setOpen(false);
    toast.success("Colaborador adicionado com sucesso!");
  };

  const formatCPF = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    return numbers
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2")
      .slice(0, 14);
  };

  const formatDate = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    return numbers
      .replace(/(\d{2})(\d)/, "$1/$2")
      .replace(/(\d{2})(\d)/, "$1/$2")
      .slice(0, 10);
  };

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    if (numbers.length <= 10) {
      return numbers
        .replace(/(\d{2})(\d)/, "($1) $2")
        .replace(/(\d{4})(\d)/, "$1-$2");
    }
    return numbers
      .replace(/(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{5})(\d)/, "$1-$2")
      .slice(0, 15);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <UserPlus className="w-4 h-4" />
          Adicionar Colaborador
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Adicionar Novo Colaborador</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-col items-center gap-4 mb-4">
            <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center overflow-hidden border-2 border-primary/20">
              {previewUrl ? (
                <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <Camera className="w-8 h-8 text-muted-foreground" />
              )}
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="file"
                id="foto"
                accept="image/*"
                className="hidden"
                onChange={handleFileUpload}
                disabled={isUploading}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => document.getElementById("foto")?.click()}
                disabled={isUploading}
              >
                {isUploading ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Camera className="w-4 h-4 mr-2" />
                )}
                {previewUrl ? "Alterar Foto" : "Adicionar Foto"}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="nome">Nome Completo *</Label>
            <Input
              id="nome"
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value.toUpperCase() })}
              placeholder="Nome do colaborador"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="funcao">Função *</Label>
            <Select
              value={formData.funcao}
              onValueChange={(value) => setFormData({ ...formData, funcao: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione a função" />
              </SelectTrigger>
              <SelectContent>
                {funcoes.map((funcao) => (
                  <SelectItem key={funcao} value={funcao}>
                    {funcao}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cpf">CPF</Label>
              <Input
                id="cpf"
                value={formData.cpf}
                onChange={(e) => setFormData({ ...formData, cpf: formatCPF(e.target.value) })}
                placeholder="000.000.000-00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="matriculaHydro">Matrícula Hydro</Label>
              <Input
                id="matriculaHydro"
                value={formData.matriculaHydro}
                onChange={(e) => setFormData({ ...formData, matriculaHydro: e.target.value.replace(/\D/g, "") })}
                placeholder="00000"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="matricula">Matrícula Sucena</Label>
            <Input
              id="matricula"
              value={formData.matricula}
              onChange={(e) => setFormData({ ...formData, matricula: e.target.value.replace(/\D/g, "") })}
              placeholder="0000"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dataNascimento">Data de Nascimento</Label>
              <Input
                id="dataNascimento"
                value={formData.dataNascimento}
                onChange={(e) => setFormData({ ...formData, dataNascimento: formatDate(e.target.value) })}
                placeholder="DD/MM/AAAA"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="admissao">Data de Admissão</Label>
              <Input
                id="admissao"
                value={formData.admissao}
                onChange={(e) => setFormData({ ...formData, admissao: formatDate(e.target.value) })}
                placeholder="DD/MM/AAAA"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="contato">Contato</Label>
            <Input
              id="contato"
              value={formData.contato}
              onChange={(e) => setFormData({ ...formData, contato: formatPhone(e.target.value) })}
              placeholder="(00) 00000-0000"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="localidade">Localidade</Label>
            <Input
              id="localidade"
              value={formData.localidade}
              onChange={(e) => setFormData({ ...formData, localidade: e.target.value.toUpperCase() })}
              placeholder="Cidade - UF"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit">Adicionar</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};