import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { image_job_id, target_languages } = await req.json();
    if (!image_job_id) throw new Error("image_job_id is required");

    // Get the image job
    const { data: job, error: jobError } = await supabase
      .from("image_jobs")
      .select("*")
      .eq("id", image_job_id)
      .single();

    if (jobError || !job) throw new Error("Image job not found");

    // Update status to processing
    await supabase
      .from("image_jobs")
      .update({ status: "processing" })
      .eq("id", image_job_id);

    // Get the image from storage
    const { data: imageData } = await supabase.storage
      .from("batch-images")
      .download(job.storage_path!);

    if (!imageData) throw new Error("Failed to download image from storage");

    // Convert to base64 (chunk to avoid stack overflow)
    const arrayBuffer = await imageData.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    let binary = "";
    const chunkSize = 8192;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
    }
    const base64 = btoa(binary);
    const mimeType = job.filename.endsWith(".png") ? "image/png" : "image/jpeg";

    // Step 1: OCR - Extract Korean text from image using vision
    const ocrResponse = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "system",
              content: `You are an OCR expert specializing in Korean text extraction from product images (cosmetics, skincare, etc). Extract ALL Korean text visible in the image. Return each distinct text block as a separate item. Be thorough - capture product names, descriptions, ingredient highlights, marketing copy, labels, etc.`,
            },
            {
              role: "user",
              content: [
                {
                  type: "image_url",
                  image_url: { url: `data:${mimeType};base64,${base64}` },
                },
                {
                  type: "text",
                  text: "Extract all Korean text from this product image. Return each text block.",
                },
              ],
            },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "extract_korean_text",
                description: "Return all Korean text blocks found in the image",
                parameters: {
                  type: "object",
                  properties: {
                    blocks: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          korean: {
                            type: "string",
                            description: "The Korean text extracted",
                          },
                          context: {
                            type: "string",
                            description:
                              "Brief context of where this text appears (e.g., 'product name', 'ingredient', 'marketing copy')",
                          },
                        },
                        required: ["korean", "context"],
                        additionalProperties: false,
                      },
                    },
                  },
                  required: ["blocks"],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: {
            type: "function",
            function: { name: "extract_korean_text" },
          },
        }),
      }
    );

    if (!ocrResponse.ok) {
      const errText = await ocrResponse.text();
      console.error("OCR API error:", ocrResponse.status, errText);
      await supabase
        .from("image_jobs")
        .update({ status: "failed" })
        .eq("id", image_job_id);
      return new Response(
        JSON.stringify({ error: `OCR failed: ${ocrResponse.status}` }),
        {
          status: ocrResponse.status === 429 ? 429 : 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const ocrResult = await ocrResponse.json();
    const toolCall = ocrResult.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No OCR results returned");

    const { blocks: koreanBlocks } = JSON.parse(toolCall.function.arguments);

    if (!koreanBlocks || koreanBlocks.length === 0) {
      await supabase
        .from("image_jobs")
        .update({ status: "high_confidence", confidence_score: 100 })
        .eq("id", image_job_id);
      return new Response(
        JSON.stringify({ message: "No Korean text found", blocks: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 2: Translate all blocks
    const langs = target_languages || ["zh-Hant", "en"];
    const needZh = langs.includes("zh-Hant");
    const needEn = langs.includes("en");

    const translationPrompt = koreanBlocks
      .map(
        (b: { korean: string; context: string }, i: number) =>
          `${i + 1}. "${b.korean}" (${b.context})`
      )
      .join("\n");

    const translationFields: Record<string, string> = {};
    if (needZh)
      translationFields.zh_hant = "Traditional Chinese (繁體中文) translation";
    if (needEn) translationFields.english = "English translation";

    const translateResponse = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "system",
              content: `You are an expert Korean cosmetics/skincare product translator. Translate Korean text accurately, preserving brand terminology and marketing tone. For Traditional Chinese, use Taiwan-standard terminology.`,
            },
            {
              role: "user",
              content: `Translate each Korean text block below:\n\n${translationPrompt}`,
            },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "provide_translations",
                description: "Return translations for all text blocks",
                parameters: {
                  type: "object",
                  properties: {
                    translations: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          korean: { type: "string" },
                          ...(needZh
                            ? { zh_hant: { type: "string" } }
                            : {}),
                          ...(needEn
                            ? { english: { type: "string" } }
                            : {}),
                          confidence: {
                            type: "number",
                            description:
                              "Translation confidence 0-100",
                          },
                        },
                        required: [
                          "korean",
                          ...(needZh ? ["zh_hant"] : []),
                          ...(needEn ? ["english"] : []),
                          "confidence",
                        ],
                        additionalProperties: false,
                      },
                    },
                  },
                  required: ["translations"],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: {
            type: "function",
            function: { name: "provide_translations" },
          },
        }),
      }
    );

    if (!translateResponse.ok) {
      const errText = await translateResponse.text();
      console.error("Translation API error:", translateResponse.status, errText);
      await supabase
        .from("image_jobs")
        .update({ status: "failed" })
        .eq("id", image_job_id);
      return new Response(
        JSON.stringify({
          error: `Translation failed: ${translateResponse.status}`,
        }),
        {
          status: translateResponse.status === 429 ? 429 : 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const translateResult = await translateResponse.json();
    const translateToolCall =
      translateResult.choices?.[0]?.message?.tool_calls?.[0];
    if (!translateToolCall) throw new Error("No translation results");

    const { translations } = JSON.parse(translateToolCall.function.arguments);

    // Step 3: Save OCR blocks to database
    const ocrInserts = translations.map(
      (
        t: {
          korean: string;
          zh_hant?: string;
          english?: string;
          confidence: number;
        },
        i: number
      ) => ({
        image_job_id,
        block_index: i,
        korean: t.korean,
        zh_hant: t.zh_hant || null,
        english: t.english || null,
        confidence: t.confidence,
      })
    );

    await supabase.from("ocr_blocks").insert(ocrInserts);

    // Calculate average confidence
    const avgConfidence =
      translations.reduce(
        (sum: number, t: { confidence: number }) => sum + t.confidence,
        0
      ) / translations.length;

    // Determine status based on confidence
    let status = "high_confidence";
    if (avgConfidence < 70) status = "low_confidence";
    else if (avgConfidence < 90) status = "medium_confidence";

    // Update image job
    await supabase
      .from("image_jobs")
      .update({
        status,
        confidence_score: Math.round(avgConfidence * 10) / 10,
        output_path_zh_hant: needZh ? "translated" : null,
        output_path_en: needEn ? "translated" : null,
      })
      .eq("id", image_job_id);

    // Update batch processed count and avg confidence
    const { data: batchImages } = await supabase
      .from("image_jobs")
      .select("confidence_score, status")
      .eq("batch_id", job.batch_id);

    const processedImages =
      batchImages?.filter(
        (img) => img.status !== "pending" && img.status !== "processing"
      ).length || 0;
    const scores =
      batchImages
        ?.filter((img) => img.confidence_score != null)
        .map((img) => img.confidence_score as number) || [];
    const batchAvg =
      scores.length > 0
        ? Math.round(
            (scores.reduce((a, b) => a + b, 0) / scores.length) * 10
          ) / 10
        : null;

    const { data: batch } = await supabase
      .from("batches")
      .select("total_images")
      .eq("id", job.batch_id)
      .single();

    const allDone = batch && processedImages >= batch.total_images;

    await supabase
      .from("batches")
      .update({
        processed_images: processedImages,
        avg_confidence: batchAvg,
        status: allDone ? "review_ready" : "translating",
      })
      .eq("id", job.batch_id);

    return new Response(
      JSON.stringify({
        success: true,
        blocks: translations.length,
        confidence: avgConfidence,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("process-image error:", e);
    const msg = e instanceof Error ? e.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
