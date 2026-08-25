import Message from "../models/Message.js";

// Fetch chat history for a consultation room
export const getRoomMessages = async (req, res) => {
  try {
    const { roomId } = req.params;

    const messages = await Message.find({ roomId }).sort({ createdAt: 1 });

    res.json({
      success: true,
      messages,
    });
  } catch (error) {
    console.error("Get Room Messages Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error fetching chat log",
    });
  }
};
