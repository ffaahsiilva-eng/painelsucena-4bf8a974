const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { products } = await req.json();

    if (!products || !Array.isArray(products) || products.length === 0) {
      return new Response(
        JSON.stringify({ error: "Lista de produtos é obrigatória" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY não configurada");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const results: Array<{ ni: string; success: boolean; imageUrl?: string; error?: string }> = [];

    // Process products one by one to avoid rate limits
    for (const product of products) {
      const { ni, nome } = product;

      try {
        console.log(`Generating image for product: ${nome} (NI: ${ni})`);

        // Generate image using Lovable AI Gateway
        const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash-image",
            messages: [
              {
                role: "user",
                content: `Generate a professional product photo for: "${nome}". Create a clean, high-quality product image on a white or neutral background. Show the item clearly with good lighting, as if it were a catalog photo for industrial/construction products.`,
              },
            ],
            modalities: ["image", "text"],
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`AI Gateway error for ${ni}:`, errorText);
          
          if (response.status === 429) {
            results.push({ ni, success: false, error: "Rate limit atingido. Aguarde e tente novamente." });
            // Wait before next request
            await new Promise(resolve => setTimeout(resolve, 2000));
            continue;
          }
          
          results.push({ ni, success: false, error: `AI Gateway error: ${response.status}` });
          continue;
        }

        const data = await response.json();
        
        // Extract image from response
        const imageData = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
        
        if (imageData) {
          // Save to database
          const { error: dbError } = await supabase
            .from("product_images")
            .upsert({
              product_ni: ni,
              product_name: nome,
              image_url: imageData,
              generated_at: new Date().toISOString(),
            }, {
              onConflict: "product_ni"
            });

          if (dbError) {
            console.error(`Database error for ${ni}:`, dbError);
            results.push({ ni, success: false, error: "Erro ao salvar imagem" });
          } else {
            results.push({ ni, success: true, imageUrl: imageData });
          }
        } else {
          results.push({ ni, success: false, error: "Nenhuma imagem retornada pelo modelo" });
        }

        // Small delay between requests to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (productError: unknown) {
        console.error(`Error processing product ${ni}:`, productError);
        const errorMessage = productError instanceof Error ? productError.message : "Erro desconhecido";
        results.push({ ni, success: false, error: errorMessage });
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        results,
        summary: {
          total: products.length,
          successful: results.filter(r => r.success).length,
          failed: results.filter(r => !r.success).length,
        }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error generating images:", error);
    const errorMessage = error instanceof Error ? error.message : "Erro ao gerar imagens";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
