
import { GoogleGenAI } from "@google/genai";
import { Student } from "../types";

// Initialize GoogleGenAI with the provided API key.
const API_KEY = "AIzaSyC_0qRIEEKRkjGiZg8AjE4OSgGnlN7AzJ8";
const ai = new GoogleGenAI({ apiKey: API_KEY });

export const getRegistrationSummary = async (students: Student[]) => {
  const prepCount = students.filter(s => s.academicLevel === 'Prep').length;
  // Note: academicLevel enum value for Freshman is 'Freshmen'
  const freshmanCount = students.filter(s => s.academicLevel === 'Freshmen').length;
  const totalCount = students.length || 1;
  
  const prepRatio = ((prepCount / totalCount) * 100).toFixed(1);
  const freshmanRatio = ((freshmanCount / totalCount) * 100).toFixed(1);

  try {
    // Fixed: Use ai.models.generateContent to query the model directly as per guidelines.
    // Using gemini-3-flash-preview for a summarization task.
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Provide a concise, professional one-sentence insight about these registration statistics: ${students.length} total students, ${prepCount} in Preparatory Year, and ${freshmanCount} promoted to Freshman level.`,
    });

    return {
      prepRatio,
      freshmanRatio,
      insight: response.text || "Registration patterns remain consistent with seasonal expectations."
    };
  } catch (error) {
    console.error("Gemini API error:", error);
    return {
      prepRatio,
      freshmanRatio,
      insight: "The current distribution suggests a high promotion rate in English this term."
    };
  }
};
