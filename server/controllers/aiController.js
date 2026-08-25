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