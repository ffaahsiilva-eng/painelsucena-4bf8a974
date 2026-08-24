import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export interface ProductImage {
  id: string;
  product_ni: string;
  product_name: string;
  image_url: string | null;
  generated_at: string | null;
  created_at: string;
  updated_at: string;
}

export const useProductImages = () => {
  const queryClient = useQueryClient();
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState({ current: 0, total: 0 });

  const { data: productImages = [], isLoading } = useQuery({
    queryKey: ["product-images"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_images")
        .select("*")
        .order("product_name");

      if (error) throw error;
      return data as ProductImage[];
    },
  });

  const getImageByNI = useCallback((ni: string): string | null => {
    const found = productImages.find(img => img.product_ni === ni);
    return found?.image_url || null;
  }, [productImages]);

  const generateImages = useCallback(async (products: Array<{ ni: string; nome: string }>) => {
    setIsGenerating(true);
    setGenerationProgress({ current: 0, total: products.length });

    try {
      // Process in batches of 5 to avoid timeout
      const batchSize = 5;
      const batches = [];
      for (let i = 0; i < products.length; i += batchSize) {
        batches.push(products.slice(i, i + batchSize));
      }

      let successCount = 0;
      let failCount = 0;

      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        
        const { data, error } = await supabase.functions.invoke("generate-product-images", {
          body: { products: batch },
        });

        if (error) {
          console.error("Error generating batch:", error);
          failCount += batch.length;
        } else if (data?.summary) {
          successCount += data.summary.successful;
          failCount += data.summary.failed;
        }

        setGenerationProgress({ 
          current: Math.min((i + 1) * batchSize, products.length), 
          total: products.length 
        });

        // Wait between batches to avoid rate limiting
        if (i < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      // Refresh data
      queryClient.invalidateQueries({ queryKey: ["product-images"] });

      toast.success(`Geração concluída: ${successCount} imagens geradas, ${failCount} falhas`);
    } catch (error) {
      console.error("Error generating images:", error);
      toast.error("Erro ao gerar imagens");
    } finally {
      setIsGenerating(false);
      setGenerationProgress({ current: 0, total: 0 });
    }
  }, [queryClient]);

  return {
    productImages,
    isLoading,
    isGenerating,
    generationProgress,
    getImageByNI,
    generateImages,
  };
};
