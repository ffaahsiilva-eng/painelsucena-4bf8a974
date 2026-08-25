const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, confirmed } = await req.json();

    if (!prompt) {
      return new Response(
        JSON.stringify({ error: "Prompt é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (confirmed !== true) {
      return new Response(
        JSON.stringify({ error: "Confirmação obrigatória para usar IA e consumir créditos." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY não configurada");
    }

    // Use Lovable AI Gateway with image generation model
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
            content: `Generate a product image for: ${prompt}. Create a clean, professional product photo on a white or neutral background. The image should clearly show the item described.`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", errorText);
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    
    // Extract image URL from response
    const content = data.choices?.[0]?.message?.content;
    
    // If the model returns an image URL or base64 data
    let imageUrl = null;
    
    if (content) {
      // Check if content contains an image URL
      const urlMatch = content.match(/https?:\/\/[^\s]+\.(png|jpg|jpeg|gif|webp)/i);
      if (urlMatch) {
        imageUrl = urlMatch[0];
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        imageUrl,
        message: content || "Imagem gerada com sucesso" 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error generating image:", error);
    const errorMessage = error instanceof Error ? error.message : "Erro ao gerar imagem";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
