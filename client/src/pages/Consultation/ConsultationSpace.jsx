import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { getPatientById, startConsultation, completeConsultation } from "../../services/patientService";
import { getAppointmentById, completeAppointment } from "../../services/appointmentService";
import { getRoomMessages } from "../../services/consultationService";
import { getConsultants } from "../../services/authService";
import Sidebar from "../../components/Sidebar";
import Navbar from "../../components/Navbar";
import Loader from "../../components/Loader";
import { toast } from "react-hot-toast";
import { io } from "socket.io-client";
import { 
  RiVideoLine, 
  RiChat3Line, 
  RiVerifiedBadgeLine, 
  RiMicLine, 
  RiMicOffLine, 
  RiVideoAddLine, 
  RiCameraOffLine,
  RiSendPlane2Line
} from "react-icons/ri";
import "./ConsultationSpace.css";

const peerConfiguration = {
  iceServers: [
    {
      urls: [
        "stun:stun.l.google.com:19302",
        "stun:stun1.l.google.com:19302",
      ],
    },
  ],
};

export default function ConsultationSpace() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);

  const [loading, setLoading] = useState(true);
  const [patientCase, setPatientCase] = useState(null);
  const [consultants, setConsultants] = useState([]);
  
  // Doctor form state
  const [doctorNotes, setDoctorNotes] = useState("");
  const [prescriptions, setPrescriptions] = useState("");
  const [followUp, setFollowUp] = useState("3 days");
  const [needReferral, setNeedReferral] = useState(false);
  const [selectedConsultant, setSelectedConsultant] = useState("");
  const [referralReason, setReferralReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // WebRTC & Socket states
  const socketRef = useRef(null);
  const localStreamRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const chatEndRef = useRef(null);

  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState("");
  const [audioMuted, setAudioMuted] = useState(false);
  const [videoMuted, setVideoMuted] = useState(false);

  useEffect(() => {
    loadCaseDetails();
  }, [id]);

  const loadCaseDetails = async () => {
    try {
      setLoading(true);
      
      let apptData = null;
      let patientData = null;

      try {
        const apptRes = await getAppointmentById(id);
        apptData = apptRes.data.appointment;
      } catch (err) {
        // Not a direct appointment ID or failed
      }

      if (apptData) {
        patientData = {
          _id: apptData._id,
          name: apptData.patient?.fullName || "Patient",
          email: apptData.patient?.email || "",
          symptoms: apptData.symptoms || [],
          medicalHistory: apptData.medicalNote || "",
          riskLevel: "Low",
          consultationStatus: apptData.appointmentStatus === "confirmed" ? "In Progress" : apptData.appointmentStatus === "completed" ? "Completed" : "Triage",
          paymentStatus: apptData.paymentStatus === "paid" ? "Paid" : "Unpaid",
          assignedDoctor: apptData.doctor?._id,
          isAppointment: true,
          doctorNotes: apptData.doctorNotes || "",
          prescriptions: apptData.prescriptions || "",
          followUp: apptData.followUp || "",
          referredTo: apptData.referredTo,
          referralReason: apptData.referralReason || "",
        };

        setDoctorNotes(apptData.doctorNotes || "");
        setPrescriptions(apptData.prescriptions || "");
        setFollowUp(apptData.followUp || "3 days");
      } else {
        const res = await getPatientById(id);
        const data = res.data.patient;
        patientData = {
          ...data,
          isAppointment: false,
        };

        setDoctorNotes(data.doctorNotes || "");
        setPrescriptions(data.prescriptions || "");
        setFollowUp(data.followUp || "3 days");

        if (user?.role === "doctor" && data.consultationStatus === "Paid") {
          await startConsultation(id);
          patientData.consultationStatus = "In Progress";
          toast.success("Consultation Workspace Initiated! 🟢");
        }
      }

      setPatientCase(patientData);

      if (user?.role === "doctor") {
        const consultantsRes = await getConsultants();
        setConsultants(consultantsRes.data.consultants || []);
        if (consultantsRes.data.consultants?.length > 0) {
          setSelectedConsultant(consultantsRes.data.consultants[0]._id);
        }
      }
    } catch (err) {
      console.error("Failed to load consultation workspace:", err);
      toast.error("Failed to enter consultation workspace.");
      navigate("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  const createPeerConnection = () => {
    if (peerConnectionRef.current) return peerConnectionRef.current;

    const pc = new RTCPeerConnection(peerConfiguration);

    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        socketRef.current.emit("webrtc-candidate", {
          roomId: id,
          candidate: event.candidate,
        });
      }
    };

    pc.ontrack = (event) => {
      console.log("🟢 Received Remote Stream Track");
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    peerConnectionRef.current = pc;
    return pc;
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      if (chatEndRef.current) {
        chatEndRef.current.scrollTop = chatEndRef.current.scrollHeight;
      }
    }, 100);
  };

  useEffect(() => {
    if (!patientCase || patientCase.consultationStatus !== "In Progress") return;

    let localStream = null;

    const initConnection = async () => {
      try {
        localStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        localStreamRef.current = localStream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = localStream;
        }
      } catch (err) {
        console.error("Camera/Mic access denied:", err);
        toast.error("Could not access camera/mic. Running call without your stream.");
      }

      const socketUrl =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1"
    ? "http://localhost:5000"
    : "https://medicareai-backend-lp1l.onrender.com";

const socket = io(socketUrl);
      socketRef.current = socket;

      socket.emit("join-room", {
        roomId: id,
        userId: user._id,
        userName: user.fullName,
      });

      socket.on("user-joined", async ({ userId, userName, socketId }) => {
        console.log(`👤 Peer joined: ${userName} (${socketId})`);
        toast.success(`${userName} joined the room 🟢`);
        
        const pc = createPeerConnection();
        
        if (localStreamRef.current) {
          localStreamRef.current.getTracks().forEach((track) => {
            pc.addTrack(track, localStreamRef.current);
          });
        }

        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socket.emit("webrtc-offer", { roomId: id, offer });
        } catch (offerErr) {
          console.error("Failed to create offer:", offerErr);
        }
      });

      socket.on("webrtc-offer", async ({ offer }) => {
        console.log("📡 Received WebRTC Offer");
        const pc = createPeerConnection();

        if (localStreamRef.current) {
          localStreamRef.current.getTracks().forEach((track) => {
            pc.addTrack(track, localStreamRef.current);
          });
        }

        try {
          await pc.setRemoteDescription(new RTCSessionDescription(offer));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit("webrtc-answer", { roomId: id, answer });
        } catch (answerErr) {
          console.error("Failed to answer offer:", answerErr);
        }
      });

      socket.on("webrtc-answer", async ({ answer }) => {
        console.log("📡 Received WebRTC Answer");
        const pc = peerConnectionRef.current;
        if (pc) {
          try {
            await pc.setRemoteDescription(new RTCSessionDescription(answer));
          } catch (err) {
            console.error("Failed to set remote description:", err);
          }
        }
      });

      socket.on("webrtc-candidate", async ({ candidate }) => {
        const pc = peerConnectionRef.current;
        if (pc) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (err) {
            console.error("Failed to add ICE candidate:", err);
          }
        }
      });

      socket.on("receive-message", (msg) => {
        setMessages((prev) => [...prev, msg]);
        scrollToBottom();
      });
    };

    initConnection();
    
    const loadChatHistory = async () => {
      try {
        const msgRes = await getRoomMessages(id);
        setMessages(msgRes.data.messages || []);
        scrollToBottom();
      } catch (err) {
        console.error("Failed to retrieve chat history:", err);
      }
    };
    loadChatHistory();

    return () => {
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
      }
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [patientCase?.consultationStatus]);

  const toggleAudio = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setAudioMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setVideoMuted(!videoTrack.enabled);
      }
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!messageText.trim() || !socketRef.current) return;

    socketRef.current.emit("send-message", {
      roomId: id,
      text: messageText,
      senderId: user._id,
      senderName: user.fullName,
    });

    setMessageText("");
  };

  const handleComplete = async (e) => {
    e.preventDefault();

    if (!doctorNotes.trim()) {
      toast.error("Please fill in diagnostic notes.");
      return;
    }

    try {
      setActionLoading(true);
      
      const payload = {
        doctorNotes,
        prescriptions,
        followUp,
        needReferral,
        consultantId: needReferral ? selectedConsultant : null,
        referralReason: needReferral ? referralReason : "",
      };

      if (patientCase?.isAppointment) {
        await completeAppointment(id, {
          doctorNotes,
          prescriptions,
          followUp,
          referredTo: needReferral ? selectedConsultant : null,
          referralReason: needReferral ? referralReason : "",
        });
        toast.success("Appointment Consultation Completed successfully! ✅");
        navigate("/doctor/appointments");
      } else {
        await completeConsultation(id, payload);
        toast.success("Consultation Completed and Log Saved! ✅");
        navigate("/doctor/dashboard");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to complete consultation.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleLeaveRoom = () => {
    if (user?.role === "doctor") {
      navigate(patientCase?.isAppointment ? "/doctor/appointments" : "/doctor/dashboard");
    } else {
      navigate(patientCase?.isAppointment ? "/patient/appointments" : "/patient/dashboard");
    }
  };

  if (loading) {
    return <Loader />;
  }

  const patientDesc = patientCase.medicalHistory?.includes("Description:") 
    ? patientCase.medicalHistory.split("Description:")[1].trim()
    : patientCase.medicalHistory;

  return (
    <div className="consult-layout">
      <Sidebar />

      <div className="consult-main-area">
        <Navbar />

        <div className="consult-content">
          <div className="consult-space-grid">
            
            <div className="video-section-col">
              <div className="video-workspace glass-panel">
                <div className="video-header-bar">
                  <span className="live-pill">
                    <span className="status-dot"></span> LIVE CONSULTATION
                  </span>
                  <span className="room-id">ROOM-ID: {patientCase._id.substring(0, 8).toUpperCase()}</span>
                </div>

                {patientCase.consultationStatus === "In Progress" ? (
                  <div className="video-feed-sim" style={{ gridTemplateColumns: "1fr 1fr", gap: "12px", position: "relative" }}>
                    <div className="mock-camera" style={{ width: "100%", height: "100%", overflow: "hidden" }}>
                      <video
                        ref={localVideoRef}
                        autoPlay
                        playsInline
                        muted
                        style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "8px" }}
                      />
                      <span className="feed-name">You (Local)</span>
                    </div>

                    <div className="mock-camera" style={{ width: "100%", height: "100%", overflow: "hidden" }}>
                      <video
                        ref={remoteVideoRef}
                        autoPlay
                        playsInline
                        style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "8px", background: "#0d111c" }}
                      />
                      <span className="feed-name">Attending Party</span>
                    </div>

                    <div className="video-controls">
                      <button 
                        onClick={toggleAudio} 
                        className={`control-btn`}
                        style={{ background: audioMuted ? "#dc2626" : "#0d9488", color: "#fff" }}
                      >
                        {audioMuted ? <RiMicOffLine style={{ verticalAlign: "middle" }} /> : <RiMicLine style={{ verticalAlign: "middle" }} />}
                      </button>
                      <button 
                        onClick={toggleVideo} 
                        className={`control-btn`}
                        style={{ background: videoMuted ? "#dc2626" : "#0d9488", color: "#fff" }}
                      >
                        {videoMuted ? <RiCameraOffLine style={{ verticalAlign: "middle" }} /> : <RiVideoAddLine style={{ verticalAlign: "middle" }} />}
                      </button>
                      <button className="control-btn end-btn" onClick={handleLeaveRoom}>
                        Leave Session
                      </button>
                    </div>
                  </div>
                ) : patientCase.consultationStatus === "Completed" ? (
                  <div className="session-inactive-card">
                    <RiVerifiedBadgeLine className="session-status-icon success" />
                    <h3>Consultation Session Concluded</h3>
                    <p>The diagnostic case report has been locked and recorded.</p>
                  </div>
                ) : (
                  <div className="session-inactive-card">
                    <RiVideoLine className="session-status-icon" />
                    <h3>Waiting for session initiation</h3>
                    <p>Please wait for the attending doctor to start the call.</p>
                  </div>
                )}
              </div>

              {/* Real-time Chat Section */}
              {patientCase.consultationStatus === "In Progress" && (
                <div className="chat-workspace glass-panel">
                  <div className="chat-header border-bottom">
                    <h4>💬 Secure Room Chat</h4>
                    <span className="live-pill" style={{ background: "rgba(16, 185, 129, 0.1)", borderColor: "rgba(16, 185, 129, 0.2)", color: "#a7f3d0" }}>
                      <span className="status-dot" style={{ background: "#10b981" }}></span> CONNECTED
                    </span>
                  </div>

                  <div className="chat-messages-log" ref={chatEndRef}>
                    {messages.length === 0 ? (
                      <div className="empty-chat-state">
                        <RiChat3Line style={{ fontSize: "2rem", color: "#475569" }} />
                        <p>No messages yet. Send a note to the doctor/patient.</p>
                      </div>
                    ) : (
                      messages.map((msg, index) => (
                        <div 
                          key={msg._id || index} 
                          className={`chat-bubble ${msg.sender === user._id ? "own-message" : "peer-message"}`}
                        >
                          <div className="msg-meta">
                            <strong>{msg.senderName}</strong>
                            <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <p className="msg-text">{msg.text}</p>
                        </div>
                      ))
                    )}
                  </div>

                  <form onSubmit={handleSendMessage} className="chat-input-form border-top">
                    <input
                      type="text"
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      placeholder="Type diagnostic message or clinical note..."
                      className="chat-text-input"
                      required
                    />
                    <button type="submit" className="chat-send-btn">
                      <RiSendPlane2Line /> Send
                    </button>
                  </form>
                </div>
              )}

              {/* Triage summary details */}
              <div className="case-overview-card glass-panel">
                <h4>AI preliminary Triage Summary</h4>
                <div className="triage-metrics-row">
                  <div className="metric-box">
                    <span>AI Risk Level</span>
                    <strong className={patientCase.riskLevel?.toLowerCase()}>{patientCase.riskLevel}</strong>
                  </div>
                  <div className="metric-box">
                    <span>Triage Score</span>
                    <strong>64/100</strong>
                  </div>
                  <div className="metric-box">
                    <span>Severity</span>
                    <strong>Moderate</strong>
                  </div>
                </div>

                <div className="clinical-description-box">
                  <h5>Patient Presenting Symptoms</h5>
                  <div className="tags-row">
                    {patientCase.symptoms?.map((s, idx) => (
                      <span key={idx} className="symptom-tag">{s}</span>
                    ))}
                  </div>

                  <h5 style={{ marginTop: "16px" }}>Patient Condition Statement</h5>
                  <p className="desc-text">"{patientDesc || "No details provided."}"</p>
                </div>
              </div>
            </div>

            <div className="clinical-panel-col">
              {user?.role === "doctor" && patientCase.consultationStatus === "In Progress" ? (
                <div className="doctor-input-card glass-panel">
                  <h3>Attending Doctor Triage Report</h3>
                  <p className="subtitle-card">Record clinical findings, prescriptions, and referral instructions.</p>

                  <form onSubmit={handleComplete} className="doctor-clinical-form">
                    <div className="input-group-modal">
                      <label className="input-label-modal">Attending Clinician Observations</label>
                      <textarea
                        value={doctorNotes}
                        onChange={(e) => setDoctorNotes(e.target.value)}
                        placeholder="Type patient physical exam observations, diagnostic conclusions, etc..."
                        required
                        className="form-textarea-custom"
                        rows="4"
                      />
                    </div>

                    <div className="input-group-modal">
                      <label className="input-label-modal">Prescribed Medications & Advice</label>
                      <textarea
                        value={prescriptions}
                        onChange={(e) => setPrescriptions(e.target.value)}
                        placeholder="e.g. Paracetamol 500mg 3x daily for 3 days..."
                        required
                        className="form-textarea-custom"
                        rows="3"
                      />
                    </div>

                    <div className="input-group-modal">
                      <label className="input-label-modal">Recommended Follow-up</label>
                      <input
                        type="text"
                        value={followUp}
                        onChange={(e) => setFollowUp(e.target.value)}
                        required
                        className="form-input-custom"
                      />
                    </div>

                    <div className="referral-checkbox-line">
                      <input
                        type="checkbox"
                        id="needReferral"
                        checked={needReferral}
                        onChange={(e) => setNeedReferral(e.target.checked)}
                      />
                      <label htmlFor="needReferral">Escalate to Specialist Consultant?</label>
                    </div>

                    {needReferral && (
                      <div className="referral-fields-box glass-panel animate-slide">
                        <div className="input-group-modal">
                          <label className="input-label-modal">Select Specialist Consultant</label>
                          <select
                            value={selectedConsultant}
                            onChange={(e) => setSelectedConsultant(e.target.value)}
                            required
                            className="form-input-custom"
                          >
                            {consultants.length === 0 ? (
                              <option value="">No specialists registered</option>
                            ) : (
                              consultants.map((c) => (
                                <option key={c._id} value={c._id}>
                                  {c.fullName}
                                </option>
                              ))
                            )}
                          </select>
                        </div>

                        <div className="input-group-modal">
                          <label className="input-label-modal">Reason for Referral</label>
                          <textarea
                            value={referralReason}
                            onChange={(e) => setReferralReason(e.target.value)}
                            placeholder="State cardiac evaluation, neurology check, etc..."
                            required
                            className="form-textarea-custom"
                            rows="2"
                          />
                        </div>
                      </div>
                    )}

                    <button type="submit" disabled={actionLoading} className="btn-primary-custom btn-finish-session">
                      {actionLoading ? "Concluding Consultation..." : "Conclude Consultation & Close File"}
                    </button>
                  </form>
                </div>
              ) : (
                <div className="consultation-result-review glass-panel">
                  <h3>Attending Doctor Consultation Summary</h3>

                  {patientCase.consultationStatus !== "Completed" ? (
                    <div className="waiting-report-state">
                      <RiChat3Line className="no-cases-icon" />
                      <p>Attending physician is currently recording notes and diagnostics logs. Check back shortly.</p>
                    </div>
                  ) : (
                    <div className="completed-summary-details">
                      <div className="summary-section-box border-bottom">
                        <h5>Attending Clinician Observations</h5>
                        <p className="summary-text-val">{patientCase.doctorNotes || "No notes logged."}</p>
                      </div>

                      <div className="summary-section-box border-bottom">
                        <h5>Prescribed Medications & Advice</h5>
                        <p className="summary-text-val highlight-meds">{patientCase.prescriptions || "No medication advice logged."}</p>
                      </div>

                      <div className="summary-section-box border-bottom">
                        <h5>Recommended Follow-up</h5>
                        <p className="summary-text-val">{patientCase.followUp}</p>
                      </div>

                      {patientCase.referredTo && (
                        <div className="summary-section-box specialist-referral-alert glass-panel">
                          <RiVerifiedBadgeLine className="alert-badge-icon" />
                          <div>
                            <h5>Specialist Consultant Escalation</h5>
                            <p><strong>Referral Reason:</strong> {patientCase.referralReason}</p>
                            {patientCase.consultantNotes ? (
                              <div className="specialist-notes-summary border-top">
                                <p><strong>Specialist Advice:</strong> {patientCase.consultantNotes}</p>
                              </div>
                            ) : (
                              <p className="waiting-ref">Consultant opinion is pending.</p>
                            )}
                          </div>
                        </div>
                      )}

                      <button onClick={handleLeaveRoom} className="btn-primary-custom">
                        Dismiss Consultation Summary
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
