import { useEffect, useRef, useState } from "react";
import { Bot, Send, Sparkles, UserRound } from "lucide-react";
import { api } from "../services/api";
import Card from "../components/Card";

const prompts = [
  "Why is my risk increasing?",
  "Make a 7-day Math plan",
  "How should I analyze my mock test?",
  "How can I improve attendance impact?"
];

export default function ChatbotPage() {
  const [messages, setMessages] = useState([
    { role: "bot", text: "Hi. I can reason over your latest scores, attendance, study hours, risk level, and SHAP-style drivers. Ask me anything about your preparation.", provider: "system" }
  ]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const scroller = useRef(null);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [messages, typing]);

  const send = async (text = input) => {
    if (!text.trim() || typing) return;
    const outgoing = { role: "user", text };
    const history = [...messages, outgoing].slice(-10);
    setMessages((prev) => [...prev, outgoing]);
    setInput("");
    setTyping(true);
    try {
      const { data } = await api.post("/chat", { message: text, history });
      setMessages((prev) => [...prev, { role: "bot", text: data.response, provider: data.provider }]);
    } catch (err) {
      setMessages((prev) => [...prev, { role: "bot", text: err.response?.data?.detail || "I could not reach the mentor service. Please try again.", provider: "error" }]);
    } finally {
      setTyping(false);
    }
  };

  return (
    <div className="mx-auto grid max-w-6xl gap-5 xl:grid-cols-[0.72fr_1.28fr]">
      <Card>
        <div className="mb-5 flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-lg bg-teal-50 text-teal"><Sparkles size={21} /></div>
          <div>
            <h3 className="font-semibold">AI Mentor</h3>
            <p className="text-sm text-slate-500">Context-aware JEE preparation support</p>
          </div>
        </div>
        <div className="grid gap-2">
          {prompts.map((prompt) => (
            <button key={prompt} onClick={() => send(prompt)} className="rounded-lg border border-line bg-white px-3 py-3 text-left text-sm font-medium text-slate-700 transition hover:border-teal hover:bg-teal-50">
              {prompt}
            </button>
          ))}
        </div>
      </Card>

      <Card className="flex h-[72vh] min-h-[560px] max-h-[760px] flex-col overflow-hidden p-0">
        <div className="border-b border-line p-5">
          <h3 className="text-lg font-semibold">Conversational Support</h3>
          <p className="text-sm text-slate-500">Ask for plans, explanations, mock-test review, attendance recovery, or subject strategy.</p>
        </div>
        <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-slate-50 p-5">
          <div className="grid gap-4">
            {messages.map((message, index) => (
              <div key={index} className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                {message.role !== "user" && <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-ink text-white"><Bot size={18} /></div>}
                <div className={`max-w-[82%] rounded-lg px-4 py-3 text-sm leading-6 shadow-sm ${message.role === "user" ? "bg-ink text-white" : "bg-white text-slate-700"}`}>
                  <div className="whitespace-pre-wrap">{message.text}</div>
                  {message.provider && message.provider !== "system" && <p className="mt-2 text-[11px] uppercase tracking-wide opacity-60">{message.provider}</p>}
                </div>
                {message.role === "user" && <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-teal-50 text-teal"><UserRound size={18} /></div>}
              </div>
            ))}
            {typing && (
              <div className="flex gap-3">
                <div className="grid h-9 w-9 place-items-center rounded-lg bg-ink text-white"><Bot size={18} /></div>
                <div className="w-fit rounded-lg bg-white px-4 py-3 text-sm text-slate-500 shadow-sm">Thinking with your latest profile...</div>
              </div>
            )}
          </div>
        </div>
        <div className="shrink-0 border-t border-line bg-white p-4">
          <div className="flex gap-2">
            <input className="flex-1 rounded-lg border border-line px-4 py-3 outline-none focus:ring-2 focus:ring-teal/20" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="Ask like ChatGPT: build a plan, explain risk, review a mock score..." />
            <button onClick={() => send()} className="grid h-12 w-12 place-items-center rounded-lg bg-ink text-white disabled:opacity-50" disabled={typing} title="Send"><Send size={19} /></button>
          </div>
        </div>
      </Card>
    </div>
  );
}
