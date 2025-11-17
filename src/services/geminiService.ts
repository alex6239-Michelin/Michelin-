// FIX: Use `process.env.API_KEY` and declare `process` to align with the execution environment
// which injects environment variables via a global `process` object. This resolves the runtime
// error "Cannot read properties of undefined (reading 'VITE_API_KEY')" and the associated 
// TypeScript "Cannot find name 'process'" error during build.
declare var process: any;

import { GoogleGenAI, Type } from "@google/genai";
import { type ChatMessage, type PracticeProblem, type TopicSummary } from '../types';

const apiKey = process.env.API_KEY;

if (!apiKey) {
    // This error will halt the application if the key is not set.
    throw new Error("API_KEY environment variable is not set. Please check your project settings.");
}

const ai = new GoogleGenAI({ apiKey });


/**
 * Handles API errors by creating user-friendly, context-specific error objects.
 * This makes the control flow clearer for TypeScript.
 * @param error The original error object.
 * @param context A string describing the operation that failed.
 * @returns An Error object with a user-friendly message.
 */
const handleApiError = (error: any, context: string): Error => {
    console.error(`Error in ${context}:`, error);
    let message = `從 AI 伺服器獲取資料時發生錯誤。請稍後再試。`;
    
    const errorMessage = error.toString();

    if (errorMessage.includes('500') || errorMessage.includes('503') || errorMessage.includes('Rpc failed')) {
        message = 'AI 伺服器目前無法連線或發生內部錯誤，請稍後再試。';
    } else if (errorMessage.includes('400')) {
         message = '向 AI 伺服器發送的請求格式有誤 (錯誤 400)，這可能是由於輸入內容包含不安全或不支援的字詞。';
    } else if (errorMessage.includes('429')) {
        message = '您的請求頻率過高，請稍後再試。';
    } else if (errorMessage.includes('API key not valid') || errorMessage.includes('API_KEY')) {
        message = 'API 金鑰無效或未設置，請檢查您的環境設定。';
    }
    return new Error(message);
};

/**
 * Parses a JSON string from a model response, robustly handling markdown fences.
 * @param text The raw text from the model response.
 * @returns The parsed JSON object.
 */
const parseJsonFromResponse = <T>(text: string): T => {
    // The model might return a JSON string wrapped in markdown fences.
    const cleanedText = text.trim().replace(/^```json\n?/, '').replace(/```$/, '');
    try {
        return JSON.parse(cleanedText) as T;
    } catch (e) {
        console.error("Failed to parse JSON:", cleanedText);
        throw new Error("AI 返回的資料格式不正確，無法解析。");
    }
}


const fileToGenerativePart = async (file: File) => {
  const base64EncodedDataPromise = new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.readAsDataURL(file);
  });
  return {
    inlineData: { data: await base64EncodedDataPromise, mimeType: file.type },
  };
};

export const getSocraticResponse = async (history: ChatMessage[], newUserMessage: string): Promise<string> => {
  try {
    const model = 'gemini-2.5-flash';
    const chat = ai.chats.create({
      model,
      config: {
          systemInstruction: `You are an expert high school physics tutor for Taiwanese students using the 18 curriculum. Your name is Socrates. Your goal is to help students overcome common physics misconceptions. You must NEVER give the direct answer. Instead, use the Socratic method to ask guiding, targeted questions that help the student discover their own error and arrive at the correct understanding. Refer to formulas they should know. Keep your responses concise and focused on one question at a time. Be encouraging and patient. Respond in Traditional Chinese.`,
      },
      history: history.map(msg => ({
        role: msg.role,
        parts: [{ text: msg.text }]
      })),
    });

    const result = await chat.sendMessage({ message: newUserMessage });
    return result.text;
  } catch(error) {
    throw handleApiError(error, 'getSocraticResponse');
  }
};

export const generateTopicSummary = async (topic: string): Promise<TopicSummary> => {
  try {
    const model = 'gemini-2.5-pro';
    const prompt = `You are an expert on the Taiwanese university entrance exam (學測) for Physics. Your task is to generate a concise yet comprehensive "Topic Summary" for the topic: '${topic}'.
          
    The summary must be in Traditional Chinese and contain three distinct sections:
    a. 重點觀念叮嚀 (Key Concept Reminders): Briefly explain the core principles and most common points of confusion.
    b. 必背公式整理 (Essential Formulas): List all critical formulas related to the topic, using proper notation.
    c. 重要題型解題技巧 (Key Problem-Solving Techniques): Provide strategic advice or steps for tackling common problem types within this topic.

    Output ONLY a single valid JSON object that matches the specified schema. Do not include any other text, explanations, or markdown formatting.`;
    
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
          responseMimeType: "application/json",
          responseSchema: {
              type: Type.OBJECT,
              properties: {
                  keyConcepts: { type: Type.STRING, description: "Key concept reminders for the topic." },
                  formulas: { type: Type.STRING, description: "List of essential formulas." },
                  solvingTechniques: { type: Type.STRING, description: "Tips and techniques for solving problems." }
              },
              required: ["keyConcepts", "formulas", "solvingTechniques"]
          },
      },
    });
    const data = parseJsonFromResponse<TopicSummary>(response.text);
    return data;
  } catch(error) {
    throw handleApiError(error, 'generateTopicSummary');
  }
};


export const generatePracticeProblem = async (topic: string, count: number): Promise<PracticeProblem[]> => {
  try {
    const model = 'gemini-2.5-pro';
    const prompt = `You are an expert on the Taiwanese university entrance exam (學測) for Physics. Your task is to generate ${count} high-quality practice problems for the topic: '${topic}'.
          
    For each problem, you MUST strictly adhere to the following requirements:
    1. Create a word problem in Traditional Chinese that mirrors the style, complexity, and difficulty of the actual 學測. Prioritize question types with high appearance rates.
    2. Provide one correct answer and three plausible, well-crafted distractors that specifically target common student misconceptions.
    3. Write an exceptionally clear, detailed, step-by-step solution. Break down the logic into numbered steps where appropriate, explaining both the 'what' and the 'why'.
    4. Provide a relevant, high-quality YouTube video URL. This is a critical requirement. Double-check that the URL is valid, publicly accessible, and directly relevant to the problem's core concept. Prioritize high-quality educational content from reputable Taiwanese channels.
    
    Output ONLY a single valid JSON object that is an array of problems matching the specified schema. Do not include any other text, explanations, or markdown formatting.`;
    
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
          responseMimeType: "application/json",
          responseSchema: {
              type: Type.ARRAY,
              items: {
                  type: Type.OBJECT,
                  properties: {
                      problem: { type: Type.STRING },
                      options: {
                          type: Type.OBJECT,
                          properties: {
                              a: { type: Type.STRING },
                              b: { type: Type.STRING },
                              c: { type: Type.STRING },
                              d: { type: Type.STRING },
                          },
                          required: ["a", "b", "c", "d"],
                      },
                      correctAnswer: { type: Type.STRING },
                      solution: { type: Type.STRING },
                      youtubeLink: { type: Type.STRING, description: "A relevant, working YouTube URL for a concept tutorial." }
                  },
                  required: ["problem", "options", "correctAnswer", "solution", "youtubeLink"],
              }
          },
      },
    });
    const data = parseJsonFromResponse<PracticeProblem[]>(response.text);
    return data;
  } catch (error) {
    throw handleApiError(error, 'generatePracticeProblem');
  }
};

export const analyzeDiagram = async (imageFile: File, prompt: string): Promise<string> => {
    try {
      const model = 'gemini-2.5-flash-image';
      const imagePart = await fileToGenerativePart(imageFile);
      const fullPrompt = `You are a strict but helpful physics professor. A student has submitted a free-body diagram for analysis. Your task is to evaluate it based on fundamental physics principles, in Traditional Chinese. DO NOT give the answer or point out the error directly. Instead, use the Socratic method to ask one single, guiding question that directs the student's attention to a potential error in their diagram. Your question should encourage them to rethink their application of a specific concept (e.g., '關於正向力，你認為它應該與哪個表面垂直？'). Here is the student's question: "${prompt}" and their diagram:`;

      const response = await ai.models.generateContent({
          model,
          contents: { parts: [{text: fullPrompt}, imagePart] },
      });
      return response.text;
    } catch (error) {
      throw handleApiError(error, 'analyzeDiagram');
    }
};


export const generateSimulationCode = async (prompt: string): Promise<string> => {
    try {
      const model = 'gemini-2.5-pro';
      const fullPrompt = `You are a senior web developer specializing in physics simulations. Generate a single, self-contained HTML file that includes HTML, CSS (using Tailwind classes if possible, but embed styles if necessary for canvas), and JavaScript to create an interactive simulation based on the following user request: '${prompt}'. The simulation must be visually clear and allow for user interaction if possible (e.g., sliders for parameters). The code should be well-commented to explain the physics formulas being used in the JavaScript section. Ensure the canvas is visible with a border and the whole simulation is centered.`;

      const response = await ai.models.generateContent({
          model,
          contents: fullPrompt
      });
      return response.text;
    } catch (error) {
      throw handleApiError(error, 'generateSimulationCode');
    }
};