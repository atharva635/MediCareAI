import { useState } from "react";
import "./AIChatbot.css";

const AIChatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Hi! 👋 I'm MediCare AI. How can I help you today?",
    },
  ]);

  const sendMessage = async (e) => {
    e.preventDefault();

    const message = input.trim();

    if (!message || loading) return;

    // Add user message
    setMessages((prev) => [
      ...prev,
      {
        role: "user",
        content: message,
      },
    ]);

    setInput("");
    setLoading(true);

    try {
      const response = await fetch("https://medicareai-backend-lp1l.onrender.com/api/ai/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "AI request failed");
      }

      // Add AI response
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.reply,
        },
      ]);
    } catch (error) {
      console.error("Chatbot Error:", error);

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Sorry, I couldn't connect to the AI right now. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating AI Button */}
      <button
        className="ai-chat-button"
        onClick={() => setIsOpen(!isOpen)}
        title="MediCare AI"
      >
        🤖
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="ai-chat-window">
          {/* Header */}
          <div className="ai-chat-header">
            <div>
              <h3>🤖 MediCare AI</h3>
              <span>AI Health Assistant</span>
            </div>

            <button
              className="ai-close-button"
              onClick={() => setIsOpen(false)}
            >
              ✕
            </button>
          </div>

          {/* Messages */}
          <div className="ai-chat-messages">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`ai-message ${
                  msg.role === "user"
                    ? "ai-user-message"
                    : "ai-bot-message"
                }`}
              >
                <div className="ai-message-content">
                  {msg.content}
                </div>
              </div>
            ))}

            {/* Loading */}
            {loading && (
              <div className="ai-message ai-bot-message">
                <div className="ai-typing">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <form className="ai-chat-input-area" onSubmit={sendMessage}>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask MediCare AI..."
              disabled={loading}
            />

            <button type="submit" disabled={loading || !input.trim()}>
              ➤
            </button>
          </form>

          {/* Disclaimer */}
          <div className="ai-disclaimer">
            AI provides general health information, not a medical diagnosis.
          </div>
        </div>
      )}
    </>
  );
};

export default AIChatbot;