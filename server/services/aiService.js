import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

/**
 * Analyzes the pre-consultation intake conversation between patient and AI.
 * Returns a structured object detailing complaints, symptoms, history, severity, etc.
 * 
 * @param {Array<{sender: string, text: string}>} chatHistory 
 * @returns {Promise<Object>}
 */
export const analyzeIntakeChat = async (chatHistory) => {
  try {
    if (!chatHistory || chatHistory.length === 0) {
      return {
        chiefComplaint: "Not specified",
        duration: "Unknown",
        symptoms: [],
        history: "No medical history provided",
        medications: "None reported",
        severity: "Moderate",
        riskLevel: "Low",
        summary: "No intake chat transcript was available to summarize."
      };
    }

    // Format chat history for prompt consumption
    const formattedChat = chatHistory
      .map((msg) => `${msg.sender.toUpperCase()}: ${msg.text}`)
      .join("\n");

    const systemPrompt = `You are a clinical intake assistant. Analyze the conversation between a Patient and an AI Intake Assistant. 
Extract patient medical details and return a structured JSON response.

The JSON response MUST follow this exact schema:
{
  "chiefComplaint": "The primary symptom, pain point, or reason for scheduling the consultation.",
  "duration": "Length of time patient has had symptoms (e.g. 3 days, 1 week).",
  "symptoms": ["list", "of", "presenting", "physical", "symptoms", "extracted"],
  "history": "Reported medical histories, chronic illnesses, allergies, or past surgeries.",
  "medications": "Medicines or treatments patient is currently taking.",
  "severity": "Mild" or "Moderate" or "Severe",
  "riskLevel": "Low" or "Medium" or "High" or "Critical",
  "summary": "A concise 2-3 sentence clinical summary of the patient's current condition for the attending physician."
}

Rules:
1. "riskLevel" MUST be categorized as: "Critical" (for severe chest pain, extreme breathing difficulties, sudden paralysis), "High" (high fever, severe vomiting, persistent sharp pain), "Medium" (regular fever, cough, moderate headaches), or "Low" (mild fatigue, cold, minor aches).
2. Do not explain, do not add markdown wrapping. Return ONLY the raw valid JSON.`;

    const completion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Here is the conversation transcript:\n${formattedChat}` }
      ],
      model: "openai/gpt-oss-120b",
      response_format: { type: "json_object" }
    });

    const content = completion.choices[0].message.content;
    console.log("🤖 Groq AI Intake Analysis Raw Content:", content);

    const parsedData = JSON.parse(content);
    return parsedData;
  } catch (error) {
    console.error("❌ Error in analyzeIntakeChat service:", error);
    // Safe fallback structure
    return {
      chiefComplaint: "Symptom Triage Intake",
      duration: "Unknown",
      symptoms: [],
      history: "Failed to parse history",
      medications: "Failed to parse medications",
      severity: "Moderate",
      riskLevel: "Medium",
      summary: "AI analysis service was temporarily interrupted. Please review chat history manually."
    };
  }
};
