
import { GoogleGenAI, GenerateContentResponse, Part, Type } from "@google/genai";
import { ChatMessage, PageContext, MessageRole, AppSettings, TutorCommand } from '../types';

const DEFAULT_SYSTEM_INSTRUCTION = `
You are a helpful research assistant living in a browser sidebar. 
Your goal is to help the user synthesize information from the active web page.

RULES:
1. Answer the user's question using ONLY the provided context. 
2. If the answer is not in the context, say "I couldn't find that information in the current page."
3. When citing facts from the text, append a footnote like [1] or [2] at the end of the sentence.
4. Keep answers concise and readable (markdown supported).
5. Do not use markdown headers (#) excessively; prefer bolding or lists.
`;

export const generateChatResponse = async (
  currentMessage: string,
  history: ChatMessage[],
  context: PageContext,
  settings: AppSettings,
  attachment?: string,
  modelOverride?: string,
  includeContext: boolean = true
): Promise<string> => {
  try {
    // Instantiate inside the function to ensure up-to-date API key and environment context
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const modelId = modelOverride || settings.modelId || 'gemini-3-flash-preview';
    const systemInstruction = settings.systemInstruction || DEFAULT_SYSTEM_INSTRUCTION;

    let contextBlock = '';
    if (includeContext) {
      contextBlock = `
---
CURRENT PAGE CONTEXT:
Title: ${context.title}
URL: ${context.url}
Content:
${context.content.substring(0, 20000)} 
---
`;
    }

    const recentHistory = history.slice(-6).map(msg => {
      const parts: Part[] = [];
      if (msg.attachment) {
        try {
          const [header, data] = msg.attachment.split(',');
          const mimeType = header.split(';')[0].split(':')[1];
          parts.push({ inlineData: { mimeType, data } });
        } catch (e) {
          console.error("Failed to parse attachment in history", e);
        }
      }
      parts.push({ text: msg.content });
      return {
        role: msg.role === MessageRole.USER ? 'user' : 'model',
        parts: parts
      };
    });

    const currentParts: Part[] = [];
    if (attachment) {
       try {
         const [header, data] = attachment.split(',');
         const mimeType = header.split(';')[0].split(':')[1];
         currentParts.push({ inlineData: { mimeType, data } });
       } catch (e) {
         console.error("Failed to parse current attachment", e);
       }
    }

    const finalPromptText = includeContext 
      ? `${contextBlock}\n\nUser Question: ${currentMessage}`
      : currentMessage;

    currentParts.push({ text: finalPromptText });

    const chat = ai.chats.create({
      model: modelId,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.3,
      },
      history: recentHistory,
    });

    const result: GenerateContentResponse = await chat.sendMessage({
      message: currentParts
    });

    return result.text || "No response generated.";

  } catch (error: any) {
    console.error("Gemini API Error (Chat):", error);
    throw new Error(error.message || "Failed to generate response.");
  }
};

export const generateTutorExplanation = async (
  term: string,
  settings: AppSettings
): Promise<TutorCommand> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const modelId = settings.modelId || 'gemini-3-flash-preview';

    const response = await ai.models.generateContent({
      model: modelId,
      contents: [{ parts: [{ text: `Explain the Windows command-line term "${term}".` }] }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            term: { type: Type.STRING },
            definition: { type: Type.STRING, description: "Clear technical definition, max 15 words" },
            example: { type: Type.STRING, description: "Short CLI usage example" }
          },
          required: ["term", "definition", "example"]
        }
      }
    });

    const result = JSON.parse(response.text || "{}");
    return {
      term: result.term || term,
      definition: result.definition || "No definition available.",
      example: result.example || `${term} /?`,
      generatedAt: Date.now()
    };
  } catch (error: any) {
    console.error("Gemini API Error (Tutor):", error);
    return {
      term: term,
      definition: "Failed to retrieve explanation from AI.",
      example: `${term} /?`,
      generatedAt: Date.now()
    };
  }
};

export const extractTextFromImage = async (
  base64Image: string,
  modelId: string = 'gemini-3-flash-preview'
): Promise<string> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const [header, data] = base64Image.split(',');
    const mimeType = header.split(';')[0].split(':')[1];

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: modelId,
      contents: [
        {
          parts: [
            { inlineData: { mimeType, data } },
            { text: "Extract all text visible in this image. Return ONLY the extracted text with no conversational filler. Maintain the spatial layout where possible." }
          ]
        }
      ]
    });

    return response.text || "";
  } catch (error: any) {
    console.error("OCR Error:", error);
    throw new Error("Failed to extract text from image.");
  }
};
    