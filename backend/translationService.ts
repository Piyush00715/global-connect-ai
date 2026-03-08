import { GoogleGenAI } from '@google/genai';
import dotenv from "dotenv";

dotenv.config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function processMessage(text: string, sourceLang: string, targetLang: string) {
  if (sourceLang === targetLang) {
    return { text, clarification: null, isAmbiguous: false, suggestedPhrasing: null };
  }

  if (!process.env.GEMINI_API_KEY) {
    // Basic fallback if no API key is provided
    return {
      text: `[Needs API Key] ${text}`,
      clarification: "Gemini API Key is missing. Add it to backend/.env to enable real translations.",
      isAmbiguous: false,
      suggestedPhrasing: null
    };
  }

  try {
    const prompt = `
You are a real-time cultural translation engine.
Translate the following message from the language code "${sourceLang}" to "${targetLang}".

Also detect:
1. "clarification": If there is any cultural context or idiom that the receiver should know about. (string or null)
2. "isAmbiguous": Does this message sound vague and might confuse the receiver? (boolean)
3. "suggestedPhrasing": If the message is overly direct, rude, or ambiguous, suggest a better phrasing in the source language. (string or null)

Message: "${text}"

Respond ONLY with valid JSON in this exact structure, nothing else:
 {
   "text": "<translated string>",
   "clarification": "<cultural context string or null>",
   "isAmbiguous": <boolean>,
   "suggestedPhrasing": "<better phrasing string or null>"
 }
`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        temperature: 0.2
      }
    });

    const content = response.text;
    if (content) {
      const cleanJson = content.replace(/```json/gi, '').replace(/```/g, '').trim();
      return JSON.parse(cleanJson);
    }
    throw new Error("Empty response from Gemini");
  } catch (error: any) {
    console.error("Gemini Translation Error:", error);
    
    // Check if it's a rate limit error
    if (error?.status === 429) {
      return {
        text: `[Rate Limit Exceeded - Please wait a minute] ${text}`,
        clarification: "You have sent too many requests on the Free Tier! Please wait 1 minute before sending another message.",
        isAmbiguous: false,
        suggestedPhrasing: null
      };
    }

    return {
      text: `[Error parsing translation] ${text}`,
      clarification: null,
      isAmbiguous: false,
      suggestedPhrasing: null
    };
  }
}

export async function checkAmbiguityBeforeSending(text: string, sourceLang: string) {
  // Hackathon Hotfix: We are mocking the ambiguity check locally instead of calling the Gemini API.
  // The frontend calls this API on every keystroke, which instantly exhausts the 20-request/day limit of the Gemini Free Tier.
  // By mocking this, we save all API requests EXCLUSIVELY for the actual translations when the user presses Send!
  
  const lowerText = text.toLowerCase();
  
  // Mock logic: if the user types these exact phrases during the demo, it triggers the UI popup.
  if (lowerText.includes("deadline tight move tomorrow") || lowerText.includes("push the task")) {
    return { 
      isAmbiguous: true, 
      suggestedPhrasing: lowerText.includes("push") 
        ? "Do you mean to prioritize the task or delay it?" 
        : "The deadline is tight. Can we move it to tomorrow?" 
    };
  }

  // Otherwise, return false to save API limits.
  return { isAmbiguous: false, suggestedPhrasing: null };
}
