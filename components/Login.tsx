import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

const Login: React.FC = () => {
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        throw error;
      }
      
      // O App.tsx vai detectar a mudança de estado e logar o usuário automaticamente
    } catch (error: any) {
      alert("Erro ao fazer login: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row bg-[#f8fafc] animate-in fade-in duration-700">
      {/* Lado Esquerdo - Branding */}
      <div className="hidden md:flex w-1/2 bg-black relative overflow-hidden items-center justify-center p-20">
        <div className="absolute top-0 right-0 w-full h-full opacity-20">
          <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/20 to-transparent"></div>
          <div className="grid grid-cols-6 gap-4 p-10 opacity-10">
            {Array.from({length: 24}).map((_, i) => (
              <div key={i} className="aspect-square bg-white/20 rounded-full blur-xl"></div>
            ))}
          </div>
        </div>
        
        <div className="relative z-10 text-center">
          <div className="w-24 h-24 mycond-bg-yellow rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-yellow-400/20">
            <span className="text-4xl font-black text-black tracking-tighter">WM</span>
          </div>
          <h1 className="text-5xl font-black text-white uppercase tracking-tighter mb-4">
            Gestão <span className="text-yellow-400">Inteligente</span>
          </h1>
          <p className="text-gray-400 text-lg font-medium max-w-md mx-auto leading-relaxed">
            A plataforma definitiva para síndicos, moradores e administradoras de condomínios de alto padrão.
          </p>
        </div>
      </div>

      {/* Lado Direito - Formulário */}
      <div className="flex-1 flex items-center justify-center p-8 md:p-20 relative">
        <div className="w-full max-w-md">
          <div className="bg-white p-10 md:p-12 rounded-[3rem] shadow-2xl border border-gray-100 relative overflow-hidden">
            <div className="mb-10 text-center md:text-left">
              <h3 className="text-3xl font-black text-slate-900 uppercase tracking-tighter mb-2">
                {isLoginMode ? 'Acesse o Portal' : 'Crie sua Conta'}
              </h3>
              <p className="text-sm text-gray-400 font-bold uppercase tracking-widest">
                Selecione seu perfil para entrar
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Retirados os botões FAKES de role do protótipo */}

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">E-mail</label>
                <div className="relative">
                  <i className="fa-solid fa-envelope absolute left-5 top-1/2 -translate-y-1/2 text-gray-300"></i>
                  <input 
                    required 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-50 border-none rounded-2xl pl-14 pr-6 py-5 font-bold text-slate-700 outline-none focus:ring-4 focus:ring-yellow-400/20 transition-all shadow-inner" 
                    placeholder="usuario@wm.com"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Senha</label>
                <div className="relative">
                  <i className="fa-solid fa-lock absolute left-5 top-1/2 -translate-y-1/2 text-gray-300"></i>
                  <input 
                    required 
                    type={showPassword ? 'text' : 'password'} 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-50 border-none rounded-2xl pl-14 pr-14 py-5 font-bold text-slate-700 outline-none focus:ring-4 focus:ring-yellow-400/20 transition-all shadow-inner" 
                    placeholder="••••••••"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-slate-600 transition-colors"
                  >
                    <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                  </button>
                </div>
              </div>

              <button 
                type="submit" 
                disabled={isLoading}
                className="w-full py-6 mycond-bg-yellow text-slate-900 rounded-[2rem] font-black uppercase text-xs tracking-[0.2em] shadow-2xl shadow-yellow-100 hover:bg-yellow-500 transition-all transform active:scale-95 flex items-center justify-center space-x-3"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-slate-900/20 border-t-slate-900 rounded-full animate-spin"></div>
                ) : (
                  <>
                    <span>Entrar no Painel</span>
                    <i className="fa-solid fa-arrow-right-long"></i>
                  </>
                )}
              </button>
            </form>

            <div className="mt-10 pt-8 border-t border-gray-50 text-center">
              <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">
                © 2026 WM GESTÃO • PREMIUM
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
