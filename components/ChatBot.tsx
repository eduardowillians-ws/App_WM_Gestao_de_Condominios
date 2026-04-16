
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { ChatMessage } from '../types';

const ChatBot: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'model', text: 'Olá! Sou o CondoBot. Agora estou treinado para ajudar com manutenção, equipe, financeiro e assembleias. O que deseja saber?' }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSendMessage = async () => {
    if (!input.trim() || isTyping) return;
    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setIsTyping(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const chat = ai.chats.create({
        model: 'gemini-3-pro-preview',
        config: {
          systemInstruction: 'Você é o CondoBot AI do MyCond. Você tem expertise em: 1) Manutenção (Piscina, Limpeza, Bombeiros, Caixa Dágua), 2) RH (EPIs, Uniformes, Equipe), 3) Jurídico (Seguros, Atas), 4) Financeiro e 5) Assembleias Online. Responda em Português-BR de forma executiva e prestativa. Se perguntarem sobre EPIs, lembre-os da importância da segurança do trabalho.',
        },
      });

      const response = await chat.sendMessageStream({ message: userMessage });
      let fullText = '';
      setMessages(prev => [...prev, { role: 'model', text: '' }]);

      for await (const chunk of response) {
        const textChunk = chunk.text || '';
        fullText += textChunk;
        setMessages(prev => {
          const newMessages = [...prev];
          newMessages[newMessages.length - 1].text = fullText;
          return newMessages;
        });
      }
    } catch (error) {
      setMessages(prev => [...prev, { role: 'model', text: 'Desculpe, falha na conexão. Tente novamente.' }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {isOpen && (
        <div className="bg-white w-80 md:w-96 h-[500px] mb-4 rounded-2xl shadow-2xl border border-gray-100 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="mycond-bg-blue p-4 text-white flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 mycond-bg-yellow rounded-lg flex items-center justify-center"><i className="fa-solid fa-robot text-slate-900 text-sm"></i></div>
              <p className="font-bold text-sm">CondoBot AI 2.0</p>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-white"><i className="fa-solid fa-xmark"></i></button>
          </div>
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${
                  msg.role === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white border text-slate-800 shadow-sm rounded-bl-none'
                }`}>{msg.text}</div>
              </div>
            ))}
          </div>
          <div className="p-4 bg-white border-t">
            <div className="flex items-center space-x-2 bg-gray-50 p-2 rounded-xl border">
              <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()} placeholder="Tire suas dúvidas operacionais..." className="flex-1 bg-transparent text-sm px-2 py-1 outline-none" />
              <button onClick={handleSendMessage} className="w-8 h-8 rounded-lg flex items-center justify-center mycond-bg-yellow text-slate-900"><i className="fa-solid fa-paper-plane text-xs"></i></button>
            </div>
          </div>
        </div>
      )}
      <button onClick={() => setIsOpen(!isOpen)} className="w-14 h-14 mycond-bg-yellow text-slate-900 rounded-full shadow-lg flex items-center justify-center hover:scale-110 active:scale-95 transition-all"><i className="fa-solid fa-comment-dots text-2xl"></i></button>
    </div>
  );
};

export default ChatBot;
