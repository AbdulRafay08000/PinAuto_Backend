import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
dotenv.config();

const GEN_AI_KEY = process.env.GEMINI_API_KEY;

const ai = new GoogleGenAI({ apiKey: GEN_AI_KEY });

export const generatePinContent = async (product) => {
    try {
        const prompt = `
      You are a Pinterest SEO expert. Create optimized content for a pin based on this product.
      
      Product Title: ${product.title}
      Product Description: ${product.description}
      Category: ${product.category}
      Target Audience: ${product.targetBuyers}
      Pain Points: ${product.painPoints}

      Strict Board Management Rules:
      1. Board names must be **niche-specific**, not product-specific (e.g., "Home Decor Ideas" NOT "Blue Velvet Sofa").
      2. Use SEO-friendly titles (2-5 words).
      3. Avoid emojis, numbers, or promotional language.
      4. Suggest a board name that is broad enough to contain this pin but specific enough to target the audience.

      Provide the response in valid JSON format with the fields:
      - title: SEO-friendly title (max 100 chars)
      - description: Engaging description with keywords (max 500 chars)
      - hashtags: 5-10 relevant hashtags as a string
      - board: Suggested board name observing the rules above.

      Do not include markdown, just raw JSON.
    `;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: 'application/json'
            }
        });

        const text = response.text.trim();
        const jsonStr = text.replace(/```json/g, "").replace(/```/g, "").trim();

        return JSON.parse(jsonStr);
    } catch (error) {
        console.error("AI Generation Error:", error);
        return {
            title: product.title,
            description: product.description,
            hashtags: "#pinterest",
            board: product.category || "Products",
        };
    }
};

export const generatePainPoints = async (title, description) => {
    try {
        const prompt = `
            You are a marketing expert. Identify 3-5 key customer pain points that this product solves.
            
            Product Title: ${title}
            Product Description: ${description}

            Return ONLY a bulleted list of pain points. Keep them concise (max 1 sentence each).
        `;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
        });

        return response.text.trim();
    } catch (error) {
        console.error("AI Pain Point Generation Error:", error);
        return "Could not generate pain points. Please try again.";
    }
};

export const findBestMatchingBoard = async (targetBoard, availableBoards) => {
    try {
        if (!availableBoards || availableBoards.length === 0) return null;

        const prompt = `
            You are a smart organizational assistant.
            Target Board Name: "${targetBoard}"
            Available Boards: ${JSON.stringify(availableBoards)}

            Task: Find the best matching board from the strict "Available Boards" list that is semantically compatible with the "Target Board Name".
            - If "Target Board Name" is very similar or conceptually fits perfectly into one of the "Available Boards" (e.g. "Cat Pics" fits "Pets", "Living Room" fits "Home Decor"), return that EXACT board name from the list.
            - If there is a direct fuzzy match (e.g. "Recipes" vs "My Recipes"), return the available board name.
            - If no board is a good match, return "null".
            
            Result must be ONLY the exact board name string or "null". No other text.
            Do not create a new board name. Must pick from the list.
        `;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
        });

        const match = response.text.trim().replace(/^"|"$/g, '');

        if (match.toLowerCase() === "null") return null;

        const exists = availableBoards.find(b => b === match);
        return exists || null;

    } catch (error) {
        console.error("AI Board Matching Error:", error.message);
        return null;
    }
};
