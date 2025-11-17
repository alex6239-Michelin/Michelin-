// Fix: Switched to using `process.env.API_KEY` to align with Gemini API guidelines and resolved associated TypeScript errors.
declare var process: any;

import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { type ChatMessage, type PracticeProblem, type TopicSummary } from '../types';

const apiKey = process.env.API_KEY;

if (!apiKey) {
    // This is a critical module-level check. It will throw an error during app initialization
    // if the API_KEY is not available at build time, preventing a blank screen with a cryptic error.
    throw new Error("API_KEY environment variable is not set. Please ensure it's configured in your deployment platform (e.g., Vercel) and that vite.config.ts is set up to expose it.");
}

const ai = new GoogleGenAI({ apiKey });

/**
 * A wrapper for ai.models.generateContent that includes a robust retry mechanism with exponential backoff and jitter.
 * This helps the application recover from transient server errors like 503 (Overloaded) or 429 (Rate limited).
 * @param params The parameters for the generateContent call.
 * @param retries The maximum number of retries.
 * @param delay The initial delay in milliseconds.
 * @returns A Promise that resolves with the GenerateContentResponse.
 */
const generateContentWithRetry = async (
    params: any, 
    retries = 5, 
    delay = 3000
): Promise<GenerateContentResponse> => {
    let lastError: any;
    for (let i = 0; i < retries; i++) {
        try {
            const response = await ai.models.generateContent(params);
            if (!response || !response.text) {
                throw new Error("AI returned an empty or invalid response.");
            }
            return response;
        } catch (error: any) {
            lastError = error;
            const errorMessage = error.toString();
            // Only retry on specific, transient server-side errors.
            const isRetryable = errorMessage.includes('500') || errorMessage.includes('503') || errorMessage.includes('429') || errorMessage.includes('Rpc failed');
            
            if (isRetryable && i < retries - 1) {
                const jitter = Math.floor(Math.random() * 1000);
                const nextDelay = delay + jitter;
                console.warn(`Attempt ${i + 1} failed with a retryable error. Retrying in ${nextDelay}ms...`);
                await new Promise(res => setTimeout(res, nextDelay));
                delay *= 2; // Exponential backoff for the next base delay
            } else {
                // On the last attempt or for a non-retryable error, throw the last captured error.
                throw lastError;
            }
        }
    }
    // This line should not be reachable if retries > 0, but it satisfies TypeScript
    // and provides a fallback by throwing the last known error.
    throw lastError;
};


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
    // Fix: Updated API key error message to be generic and reference the correct environment variable.
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
  const retries = 5;
  let delay = 3000;
  let lastError: any;

  for (let i = 0; i < retries; i++) {
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
      const responseText = result.text;
      if (!responseText) {
          throw new Error('AI 回應無效，未包含任何文字。'); // This will be caught and potentially retried
      }
      return responseText;

    } catch (error: any) {
      lastError = error;
      const errorMessage = error.toString();
      // Also consider "empty response" as a potentially transient, retryable issue.
      const isRetryable = errorMessage.includes('500') || errorMessage.includes('503') || errorMessage.includes('429') || errorMessage.includes('Rpc failed') || errorMessage.includes('AI 回應無效');

      if (isRetryable && i < retries - 1) {
          const jitter = Math.floor(Math.random() * 1000);
          const nextDelay = delay + jitter;
          console.warn(`Socratic response attempt ${i + 1} failed with a retryable error. Retrying in ${nextDelay}ms...`);
          await new Promise(res => setTimeout(res, nextDelay));
          delay *= 2;
      } else {
          // On the last attempt or for a non-retryable error, throw the last captured error.
          throw handleApiError(lastError, 'getSocraticResponse');
      }
    }
  }
  // This line should not be reachable.
  throw handleApiError(lastError, 'getSocraticResponse');
};

export const generateTopicSummary = async (topic: string): Promise<TopicSummary> => {
  try {
    const model = 'gemini-2.5-flash'; // Switched to Flash for consistency and speed
    const prompt = `You are an expert on the Taiwanese university entrance exam (學測) for Physics. Your task is to generate a concise yet comprehensive "Topic Summary" for the topic: '${topic}'.
          
    The summary must be in Traditional Chinese and contain three distinct sections:
    a. 重點觀念叮嚀 (Key Concept Reminders): Briefly explain the core principles and most common points of confusion.
    b. 必背公式整理 (Essential Formulas): List all critical formulas related to the topic, using proper notation.
    c. 重要題型解題技巧 (Key Problem-Solving Techniques): Provide strategic advice or steps for tackling common problem types within this topic.

    Output ONLY a single valid JSON object that matches the specified schema. Do not include any other text, explanations, or markdown formatting.`;
    
    const response = await generateContentWithRetry({
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
    const responseText = response.text;
    const data = parseJsonFromResponse<TopicSummary>(responseText);
    return data;
  } catch(error) {
    throw handleApiError(error, 'generateTopicSummary');
  }
};


export const generatePracticeProblem = async (topic: string, count: number): Promise<PracticeProblem[]> => {
  try {
    const model = 'gemini-2.5-flash'; // Switched from Pro to Flash for stability
    const prompt = `You are an expert on the Taiwanese university entrance exam (學測) for Physics. Your task is to generate ${count} high-quality practice problems for the topic: '${topic}'.
          
    For each problem, you MUST strictly adhere to the following requirements:
    1. Create a word problem in Traditional Chinese that mirrors the style, complexity, and difficulty of the actual 學測. Prioritize question types with high appearance rates.
    2. Provide one correct answer and three plausible, well-crafted distractors that specifically target common student misconceptions.
    3. Write an exceptionally clear, detailed, step-by-step solution. Break down the logic into numbered steps where appropriate, explaining both the 'what' and the 'why'.
    4. Provide a relevant, high-quality YouTube video URL. This is a critical requirement. Double-check that the URL is valid, publicly accessible, and directly relevant to the problem's core concept. Prioritize high-quality educational content from reputable Taiwanese channels.
    
    Output ONLY a single valid JSON object that is an array of problems matching the specified schema. Do not include any other text, explanations, or markdown formatting.`;
    
    const response = await generateContentWithRetry({
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
    const responseText = response.text;
    const data = parseJsonFromResponse<PracticeProblem[]>(responseText);
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

      const response = await generateContentWithRetry({
          model,
          contents: { parts: [{text: fullPrompt}, imagePart] },
      });
      const responseText = response.text;
      return responseText;
    } catch (error) {
      throw handleApiError(error, 'analyzeDiagram');
    }
};


export const generateSimulationCode = async (prompt: string): Promise<string> => {
    try {
      const model = 'gemini-2.5-flash'; // Switched from Pro to Flash for stability
      const fullPrompt = `You are a senior web developer specializing in physics simulations. Your task is to generate a single, self-contained HTML file. This file must include all necessary HTML, CSS (in a <style> tag, no external libraries like Tailwind), and JavaScript to create an interactive physics simulation based on the user's request: '${prompt}'.

      **Requirements:**
      1.  **Self-Contained:** Everything in one HTML file.
      2.  **No External CSS/JS:** Use a <style> tag for CSS.
      3.  **Visuals:** The simulation canvas must be clearly visible with a border and centered on the page.
      4.  **Interactivity:** If the topic allows, include interactive elements like sliders or buttons to change parameters.
      5.  **Comments:** Add comments in the JavaScript to explain the physics formulas being used.
      
      Output ONLY the raw HTML code. Do not wrap it in markdown fences like \`\`\`html.`;


      const response = await generateContentWithRetry({
          model,
          contents: fullPrompt
      });
      const responseText = response.text;
      // The model sometimes wraps the HTML in markdown, so we clean it.
      const cleanedResponse = responseText.trim().replace(/^```html\n?/, '').replace(/```$/, '');
      return cleanedResponse;
    } catch (error) {
      throw handleApiError(error, 'generateSimulationCode');
    }
};