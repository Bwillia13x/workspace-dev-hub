import { GoogleGenAI } from "@google/genai";
import { ValidationError, sanitizePrompt, validateRawBase64 } from "../src/core/validation";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

// Helper to extract image from response
const extractImage = (response: any): string | null => {
  if (!response.candidates?.[0]?.content?.parts) return null;

  for (const part of response.candidates[0].content.parts) {
    if (part.inlineData && part.inlineData.data) {
      return part.inlineData.data;
    }
  }
  return null;
};

// Helper to extract text from response
const extractText = (response: any): string => {
  if (!response.candidates?.[0]?.content?.parts) return '';
  return response.candidates[0].content.parts
    .filter((p: any) => p.text)
    .map((p: any) => p.text)
    .join('');
};

/**
 * Fetches real-time fashion insights using Google Search grounding.
 * Uses gemini-2.5-flash.
 */
export const getFashionTrends = async (topic: string): Promise<{ text: string, sources: { title: string, uri: string }[] }> => {
  // Validate and sanitize input
  const sanitizedTopic = sanitizePrompt(topic);

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Act as a professional fashion trend forecaster.
      
      User Query: "${sanitizedTopic}"

      Task:
      1. Use Google Search to find the latest, real-world fashion trends, emerging aesthetics, and material innovations related to the query.
      2. Provide a concise, high-impact summary of the key visual elements, color palettes, and fabrics.
      3. Focus on actionable design details that can be used in a generative AI prompt.
      
      Output:
      - A short, dense paragraph summarizing the trend.`,
      config: {
        tools: [{ googleSearch: {} }],
      }
    });

    // Use getter for text
    const text = response.text || "No trend data found.";

    // Extract grounding chunks
    const sources: { title: string, uri: string }[] = [];
    if (response.candidates?.[0]?.groundingMetadata?.groundingChunks) {
      response.candidates[0].groundingMetadata.groundingChunks.forEach((chunk: any) => {
        if (chunk.web) {
          sources.push({
            title: chunk.web.title,
            uri: chunk.web.uri
          });
        }
      });
    }

    return { text, sources };
  } catch (error) {
    console.error("Trend search failed", error);
    if (error instanceof ValidationError) {
      throw error;
    }
    throw new Error('Failed to fetch fashion trends. Please try again.');
  }
};

/**
 * Generates an initial fashion concept from a text prompt.
 */
export const generateConcept = async (prompt: string): Promise<string> => {
  // Validate and sanitize input
  const sanitizedPrompt = sanitizePrompt(prompt);

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            text: `Create a professional fashion design concept for: "${sanitizedPrompt}".
                   Style: Photorealistic, high-fashion studio photography.
                   Lighting: Soft, neutral studio lighting.
                   Background: Clean, neutral grey or white background to focus on the garment.
                   Details: Ensure high fidelity on fabric textures (denim, silk, wool, etc.) and construction details.` }
        ]
      }
    });

    const base64 = extractImage(response);
    if (!base64) {
      throw new Error("No image generated. The AI may be experiencing high load. Please try again.");
    }

    // Validate the generated image
    if (!validateRawBase64(base64)) {
      throw new ValidationError('Generated image data is invalid');
    }

    return base64;
  } catch (error) {
    console.error("Concept generation failed", error);
    if (error instanceof ValidationError) {
      throw error;
    }
    throw new Error('Failed to generate concept. Please try a different prompt.');
  }
};

/**
 * Edits an existing fashion concept using a text prompt.
 * Uses the image as input + text prompt.
 */
export const editConcept = async (imageBase64: string, instruction: string): Promise<string> => {
  // Validate inputs
  if (!validateRawBase64(imageBase64)) {
    throw new ValidationError('Invalid image data provided', 'imageBase64');
  }
  const sanitizedInstruction = sanitizePrompt(instruction);

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/png',
              data: imageBase64
            }
          },
          {
            text: `Task: Edit the input image based on this instruction: "${sanitizedInstruction}".
                   Role: Act as an expert photo editor and fashion designer.
                   Constraints: 
                   - If the instruction is about style (e.g., "retro filter", "sketch style"), apply the visual effect while keeping the subject.
                   - If the instruction is about content (e.g., "remove background", "change color to red"), modify the subject accordingly.
                   - Maintain photorealism unless asked otherwise.` }
        ]
      }
    });

    const base64 = extractImage(response);
    if (!base64) {
      throw new Error("No edited image generated. Please try a different instruction.");
    }

    // Validate the generated image
    if (!validateRawBase64(base64)) {
      throw new ValidationError('Generated image data is invalid');
    }

    return base64;
  } catch (error) {
    console.error("Edit generation failed", error);
    if (error instanceof ValidationError) {
      throw error;
    }
    throw new Error('Failed to edit concept. Please try again.');
  }
};

/**
 * Generates a technical CAD/Engineering sketch from the concept image.
 * Also attempts to extract material details.
 */
export const generateEngineeringPack = async (imageBase64: string): Promise<{ cadImage: string | null, materials: string }> => {
  // Validate input
  if (!validateRawBase64(imageBase64)) {
    throw new ValidationError('Invalid image data provided', 'imageBase64');
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/png',
              data: imageBase64
            }
          },
          {
            text: `Analyze the provided fashion concept image and generate a production-ready engineering package.

Task 1 (Visual Output): Generate a highly detailed technical flat-lay engineering sketch (CAD) of this garment.
- Style: Professional black and white technical line drawing. Vector style. High contrast.
- Perspective: Front and back views if possible, or detailed front view flattened.
- Features: Clearly visible stitching (e.g., topstitch, overlock), accurate seam lines, and structural details (darts, pleats).
- Annotations: You MUST include technical callouts with arrows indicating:
    - Stitch Types: Label specific stitches (e.g., "Single Needle Topstitch", "ISO 504 Overlock", "Blind Hem").
    - Seam Allowances: Indicate specific widths (e.g., "1cm S.A.", "1/4\" Edge Stitch", "Bound Seam").
    - Material Callouts: Label fabric types for different panels (e.g., "Rib Knit", "Self Fabric", "Contrast Lining").
    - Hardware: Label buttons, zippers (e.g., "YKK #5 Vislon"), and rivets.
    - Key Measurements: Indicate measurement lines for "Center Back Length", "Chest Width", and "Sleeve Length".
- Background: Pure white.

Task 2 (Text Output): Provide a comprehensive Bill of Materials (BOM) and production notes.
- Format: Use strict Markdown. Start with a header "## Bill of Materials".
- Content: 
    - Detailed fabric composition suggestions (gsm, fiber content).
    - Hardware details (zippers, buttons, rivets).
    - Stitching instructions corresponding to the CAD.
    - Estimated yardage per unit.
    - Assembly instructions or critical construction notes.
- Tone: Technical, precise, and ready for a manufacturer.

Return both the annotated CAD image and the text analysis.` }
        ]
      }
    });

    const cadImage = extractImage(response);
    const materials = extractText(response);

    // Validate the generated CAD image if present
    if (cadImage && !validateRawBase64(cadImage)) {
      console.warn('Generated CAD image data appears invalid');
    }

    return { cadImage, materials };
  } catch (error) {
    console.error("Engineering pack generation failed", error);
    if (error instanceof ValidationError) {
      throw error;
    }
    throw new Error('Failed to generate engineering pack. Please try again.');
  }
};