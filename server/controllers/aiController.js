import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export const chatWithAI = async (req, res) => {
  try {
    const { message } = req.body;

    const models = await groq.models.list();

    console.log(
      models.data
        .filter((m) => m.active)
        .map((m) => m.id)
    );

const completion = await groq.chat.completions.create({
  messages: [
    {
      role: "system",
      content:
        "You are MediCare AI, a helpful medical assistant. Provide general health information and clearly advise users to consult a qualified doctor for diagnosis or emergencies.",
    },
    {
      role: "user",
      content: message,
    },
  ],

   model: "openai/gpt-oss-120b",
});

    res.json({
      success: true,
      reply: completion.choices[0].message.content,
    });
  } catch (error) {
    console.error("Groq AI Error:", error);

    res.status(500).json({
      success: false,
      message: "AI response failed",
    });
  }
};

export const generateRecommendation = async (req, res) => {
  try {
    const { symptoms, medicalNote, chiefComplaint } = req.body;

    const systemPrompt = `You are a clinical diagnostic AI assistant. Based on the patient's symptoms, medical note/intake summary, and chief complaint, generate standard, safe clinical recommendations for the attending doctor. 
Provide your response strictly in the following JSON format:
{
  "doctorNotes": "Professional clinical observations and diagnostic recommendations (2-3 paragraphs).",
  "prescriptions": "Standard, safe prescription drugs with dosages and duration (e.g. Paracetamol 500mg - 1 tablet 3 times a day after meals for 3 days).",
  "followUp": "Follow up time and advice (e.g. 3 days, 1 week, or urgent clinic visit)."
}

Do not include any markdown styling, explanation, or notes. Return raw valid JSON.`;

    const userMessage = `Patient Details:
Chief Complaint: ${chiefComplaint || "Not specified"}
Symptoms: ${symptoms?.join(", ") || "None specified"}
Medical Notes / AI Intake: ${medicalNote || "None recorded"}`;

    const completion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage }
      ],
      model: "openai/gpt-oss-120b",
      response_format: { type: "json_object" }
    });

    const content = completion.choices[0].message.content;
    const parsedData = JSON.parse(content);

    res.json({
      success: true,
      recommendation: parsedData,
    });
  } catch (error) {
    console.error("Groq AI Recommendation Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate AI recommendations",
    });
  }
};