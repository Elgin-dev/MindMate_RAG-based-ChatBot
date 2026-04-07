import React, { useState, useRef, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Send, Upload, BookOpen, Mic, BrainCircuit, NotebookTabs, Share2, ClipboardCheck, ChevronRight, RefreshCw } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from "framer-motion";
import { ReactFlow, Background, Controls, MiniMap, useNodesState, useEdgesState, addEdge } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

// --- ANIMATION COMPONENT ---
const TypingEffect = ({ text }) => {
  const words = text.split(" ");
  return (
    <motion.div initial="hidden" animate="visible" className="inline">
      {words.map((word, i) => (
        <motion.span
          key={i}
          variants={{ hidden: { opacity: 0 }, visible: { opacity: 1 } }}
          transition={{ duration: 0.1, delay: i * 0.03 }}
          className="inline-block mr-1"
        >
          {word}
        </motion.span>
      ))}
    </motion.div>
  );
};

const API_URL = "http://localhost:8000";

function App() {
  // Core States
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState("");
  const [prompt, setPrompt] = useState("");
  const [chat, setChat] = useState([{ role: "ai", text: "Namaste! I am VidyaSetu. Upload your textbook to start!", id: Date.now() }]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("chat"); // 'chat', 'map', 'quiz'

  // Quiz States
  const [quizData, setQuizData] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [score, setScore] = useState(0);
  
  // React Flow States
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const scrollRef = useRef(null);

  const onConnect = useCallback((params) => setEdges((eds) => addEdge(params, eds)), [setEdges]);

  useEffect(() => {
    if (activeTab === "chat") {
      scrollRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [chat, loading, activeTab]);

  const handleUpload = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;
    const formData = new FormData();
    formData.append("file", selectedFile);
    setStatus("📖 Reading and indexing...");
    try {
      await axios.post(`${API_URL}/upload`, formData);
      setStatus(`✅ Ready: ${selectedFile.name}`);
      setFile(selectedFile.name);
    } catch (error) {
      console.error("Upload error:", error);
      setStatus("❌ Upload failed.");
    }
  };

  const handleChat = async () => {
    if (!prompt.trim() || loading) return;
    const userMsg = { role: "user", text: prompt, id: Date.now() };
    setChat(prev => [...prev, userMsg]);
    setPrompt("");
    setLoading(true);

    try {
      const res = await axios.post(`${API_URL}/chat`, { prompt });
      setChat(prev => [...prev, { role: "ai", text: res.data.answer, sources: res.data.sources, id: Date.now() + 1 }]);
    } catch (error) {
      console.error("Chat API Error:", error);
      setChat(prev => [...prev, { 
        role: "ai", 
        text: "I'm having trouble connecting to my brain. Please make sure the Python backend is running on port 8000!", 
        id: Date.now() + 1 
      }]);
    }finally {
      setLoading(false);
    }
  };

  // --- QUIZ LOGIC ---
  const fetchQuiz = async () => {
    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/generate-quiz`);
      setQuizData(res.data);
      setCurrentQuestionIndex(0);
      setScore(0);
      setShowFeedback(false);
    } catch (error) {
      console.error("Quiz Error:", error);
      alert("Failed to generate quiz. Make sure a PDF is uploaded.");
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerSelection = (option) => {
    if (showFeedback) return;
    setSelectedAnswer(option);
    setShowFeedback(true);
    if (option === quizData.questions[currentQuestionIndex].answer) {
      setScore(prev => prev + 1);
    }
  };

  const nextQuestion = () => {
    setShowFeedback(false);
    setSelectedAnswer(null);
    setCurrentQuestionIndex(prev => prev + 1);
  };

  const generateConceptMap = async () => {
    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/generate-map`, { prompt: "Create a concept map" });
      const newNodes = res.data.nodes.map((n, i) => ({
        id: n.id, data: { label: n.label },
        position: { x: 250, y: i * 100 },
        className: 'bg-blue-600 text-white p-3 rounded-lg border-none font-bold shadow-lg w-40 text-center'
      }));
      const newEdges = res.data.edges.map((e) => ({
        id: `e${e.source}-${e.target}`, source: e.source, target: e.target, animated: true, style: { stroke: '#3b82f6' }
      }));
      setNodes(newNodes);
      setEdges(newEdges);
    } catch (error) { console.error("Map Error", error); } finally { setLoading(false); }
  };

  return (
    <div className="flex h-screen bg-[#F8FAFC] text-slate-900 overflow-hidden font-sans">
      
      {/* --- SIDEBAR --- */}
      <aside className="w-72 bg-white border-r border-slate-200 p-6 flex flex-col gap-8 shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-blue-600 flex items-center gap-2">
            <BrainCircuit size={32} /> VidyaSetu
          </h1>
          <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">AI Study Companion</p>
        </div>

        <div className="space-y-4">
          <label className="group flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-200 rounded-2xl cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-all">
            <Upload className="text-slate-400 group-hover:text-blue-500 mb-2" />
            <span className="text-xs font-semibold text-slate-600 group-hover:text-blue-600 text-center">
              {file ? file : "Upload Textbook"}
            </span>
            <input type="file" className="hidden" onChange={handleUpload} accept="application/pdf" />
          </label>
          <p className="text-[10px] text-center text-slate-400 italic">{status}</p>
        </div>

        <nav className="flex flex-col gap-2">
          <button onClick={() => setActiveTab("chat")} className={`flex items-center gap-3 p-3 rounded-xl font-medium text-sm transition-all ${activeTab === 'chat' ? 'bg-blue-50 text-blue-700 shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}><BookOpen size={18} /> Library Chat</button>
          <button onClick={() => setActiveTab("map")} className={`flex items-center gap-3 p-3 rounded-xl font-medium text-sm transition-all ${activeTab === 'map' ? 'bg-blue-50 text-blue-700 shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}><NotebookTabs size={18} /> Concept Map</button>
          <button onClick={() => setActiveTab("quiz")} className={`flex items-center gap-3 p-3 rounded-xl font-medium text-sm transition-all ${activeTab === 'quiz' ? 'bg-blue-50 text-blue-700 shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}><ClipboardCheck size={18} /> Practice Quiz</button>
        </nav>
      </aside>

      {/* --- MAIN AREA --- */}
      <main className="flex-1 flex flex-col relative">
        {activeTab === "chat" ? (
          <>
            <div className="flex-1 overflow-y-auto p-8 space-y-6">
              <AnimatePresence mode="popLayout">
                {chat.map((msg) => (
                  <motion.div key={msg.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-2xl p-5 rounded-2xl shadow-sm ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white border border-slate-100 rounded-tl-none'}`}>
                      <div className="prose prose-slate max-w-none">
                        {msg.role === 'ai' ? <TypingEffect text={msg.text} /> : <ReactMarkdown>{msg.text}</ReactMarkdown>}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              {loading && <div className="p-4 bg-white rounded-xl w-20 flex gap-1 justify-center"><div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" /> <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce delay-100" /> <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce delay-200" /></div>}
              <div ref={scrollRef} />
            </div>
            <div className="p-6 bg-white/80 backdrop-blur-md border-t border-slate-100">
              <div className="max-w-3xl mx-auto relative group">
                <input value={prompt} onChange={(e) => setPrompt(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleChat()} placeholder="Ask anything about the textbook..." className="w-full p-4 pr-16 bg-white border border-slate-200 rounded-2xl shadow-sm focus:ring-2 focus:ring-blue-500/20 outline-none" />
                <button onClick={handleChat} disabled={loading} className="absolute right-2 top-2 p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700"><Send size={24} /></button>
              </div>
            </div>
          </>
        ) : activeTab === "map" ? (
          <div className="flex-1 relative">
            <div className="absolute top-4 left-4 z-10">
               <button onClick={generateConceptMap} className="bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg font-bold flex items-center gap-2 hover:bg-blue-700 transition-all"><Share2 size={18} /> Visualize Chapter</button>
            </div>
            <ReactFlow nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect} fitView>
              <Background color="#cbd5e1" variant="dots" /><Controls /><MiniMap />
            </ReactFlow>
          </div>
        ) : (
          /* --- QUIZ UI --- */
          <div className="flex-1 flex flex-col items-center justify-center p-10 bg-slate-50">
            {!quizData ? (
              <div className="text-center space-y-6">
                <div className="bg-white p-10 rounded-3xl shadow-xl border border-slate-100 max-w-md">
                  <ClipboardCheck size={64} className="mx-auto text-blue-500 mb-4" />
                  <h2 className="text-2xl font-bold">Ready to test your knowledge?</h2>
                  <p className="text-slate-500 mt-2">I'll generate 5 questions based on your uploaded PDF.</p>
                  <button onClick={fetchQuiz} disabled={loading} className="mt-8 w-full bg-blue-600 text-white py-4 rounded-2xl font-bold hover:bg-blue-700 transition-all flex justify-center items-center gap-2">
                    {loading ? <RefreshCw className="animate-spin" /> : "Start Chapter Quiz"}
                  </button>
                </div>
              </div>
            ) : currentQuestionIndex < quizData.questions.length ? (
              <motion.div key={currentQuestionIndex} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="max-w-2xl w-full bg-white p-8 rounded-3xl shadow-xl border border-slate-100">
                <div className="flex justify-between items-center mb-6">
                  <span className="text-xs font-bold text-blue-600 uppercase tracking-widest">Question {currentQuestionIndex + 1} / {quizData.questions.length}</span>
                  <span className="text-xs font-bold text-slate-400 uppercase">Score: {score}</span>
                </div>
                <h2 className="text-xl font-semibold mb-8 text-slate-800">{quizData.questions[currentQuestionIndex].question}</h2>
                <div className="grid gap-3">
                  {quizData.questions[currentQuestionIndex].options.map((option, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleAnswerSelection(option)}
                      disabled={showFeedback}
                      className={`p-4 text-left border rounded-2xl transition-all font-medium ${
                        showFeedback 
                          ? option === quizData.questions[currentQuestionIndex].answer 
                            ? 'bg-green-50 border-green-500 text-green-700' 
                            : option === selectedAnswer ? 'bg-red-50 border-red-500 text-red-700' : 'bg-white border-slate-100 text-slate-400'
                          : 'bg-white border-slate-200 hover:border-blue-500 hover:bg-blue-50 text-slate-700'
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
                {showFeedback && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-8 p-5 bg-blue-50 rounded-2xl border border-blue-100">
                    <p className="text-sm font-bold text-blue-800 mb-1">Explanation:</p>
                    <p className="text-sm text-blue-700 leading-relaxed">{quizData.questions[currentQuestionIndex].explanation}</p>
                    <button onClick={nextQuestion} className="mt-4 flex items-center gap-2 text-blue-600 font-bold text-sm hover:underline">
                      Next Question <ChevronRight size={16} />
                    </button>
                  </motion.div>
                )}
              </motion.div>
            ) : (
              <div className="text-center bg-white p-10 rounded-3xl shadow-xl border border-slate-100">
                <h2 className="text-3xl font-black text-slate-800">Quiz Complete! 🎉</h2>
                <p className="text-slate-500 mt-2 text-lg">You scored <span className="font-bold text-blue-600">{score} out of {quizData.questions.length}</span></p>
                <button onClick={fetchQuiz} className="mt-8 bg-slate-900 text-white px-8 py-4 rounded-2xl font-bold hover:bg-slate-800 transition-all">Try Another Quiz</button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;