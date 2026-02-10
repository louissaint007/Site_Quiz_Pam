
import { GoogleGenAI, Type } from "@google/genai";

// Helper for exponential backoff retry
const withRetry = async <T>(fn: () => Promise<T>, retries = 3, delay = 1000): Promise<T> => {
  try {
    return await fn();
  } catch (error) {
    if (retries <= 0) throw error;
    console.warn(`Gemini API call failed, retrying in ${delay}ms...`, error);
    await new Promise(resolve => setTimeout(resolve, delay));
    return withRetry(fn, retries - 1, delay * 2);
  }
};

export const generateQuizQuestions = async (category: string, difficulty: string, count: number = 5) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  return withRetry(async () => {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Génère ${count} questions de quiz sur le thème "${category}" avec un niveau de difficulté "${difficulty}". 
      Le contexte doit être adapté à un public haïtien si pertinent (histoire, culture, géographie).`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              question_text: { type: Type.STRING },
              options: { 
                type: Type.ARRAY, 
                items: { type: Type.STRING },
                description: "Quatre options de réponse."
              },
              correct_index: { 
                type: Type.INTEGER,
                description: "Index de la réponse correcte (0-3)."
              }
            },
            required: ["question_text", "options", "correct_index"]
          }
        }
      }
    });

    if (!response.text) {
      throw new Error("Empty response from Gemini");
    }

    return JSON.parse(response.text);
  });
};

export const getExplanation = async (question: string, correctAnswer: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  return withRetry(async () => {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Explique brièvement pourquoi la réponse "${correctAnswer}" est la bonne pour la question: "${question}". Sois éducatif et concis.`,
    });
    return response.text || "Aucune explication disponible.";
  });
};
