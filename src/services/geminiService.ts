import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const explainCodeLogic = async (variableName: string, codeContext: string, dependencyChain: string[]): Promise<string> => {
  if (!process.env.API_KEY) {
    return "API Key is missing. Please check your configuration.";
  }

  const prompt = `
    You are an expert Vue.js developer.
    I have a specific variable "${variableName}" in a Vue component.
    
    Here is the dependency chain causing this variable to exist: ${dependencyChain.join(' -> ')}.
    
    Here is the full code context:
    \`\`\`typescript
    ${codeContext}
    \`\`\`
    
    Explain briefly (in 3-4 sentences max) how "${variableName}" is calculated or where it comes from, referencing its dependencies. 
    Focus on the "why" and "how" of the data flow.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text || "No explanation generated.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Failed to fetch explanation from AI.";
  }
};
