import Groq from "groq-sdk";
import dotenv from "dotenv";

dotenv.config();

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

async function main() {
  try {
    console.log("Using API Key:", process.env.GROQ_API_KEY ? "Found" : "Missing");
    console.log("Listing Groq models...");
    const models = await groq.models.list();
    console.log("Active Groq models:");
    const activeModels = models.data
      .filter((m) => m.active)
      .map((m) => m.id);
    console.log(activeModels);

    console.log("\nAttempting chat completion with model 'openai/gpt-oss-120b'...");
    const completion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: "You are a test assistant." },
        { role: "user", content: "Hello" }
      ],
      model: "openai/gpt-oss-120b"
    });
    console.log("Success! Response:", completion.choices[0].message.content);
  } catch (error) {
    console.error("Error connecting to Groq:", error);
  }
}

main();
