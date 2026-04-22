import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

interface InviteUsersProps {
  currentUser: { id: string; role: string };
}

interface LastCreatedUser {
  email: string;
  phone: string;
  tempPassword: string;
  loginLink: string;
  roleLabel: string;
}

const InviteUsers: React.FC<InviteUsersProps> = ({ currentUser }) => {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<'admin' | 'manager' | 'resident'>('resident');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [lastCreatedUser, setLastCreatedUser] = useState<LastCreatedUser | null>(null);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      setMessage({ type: 'error', text: 'Email é obrigatório' });
      return;
    }

    setLoading(true);
    setMessage(null);
    setLastCreatedUser(null);

    try {
      const { data, error } = await supabase.functions.invoke('invite_user', {
        body: { email, name, phone, role }
      });

      if (error) {
        setMessage({ type: 'error', text: error.message || 'Erro de conexão' });
        return;
      }

      if (!data?.success) {
        setMessage({ type: 'error', text: data?.error || 'Erro ao criar usuário' });
        return;
      }

      setMessage({ type: 'success', text: 'Usuário criado com sucesso!' });
      setLastCreatedUser(data.data);
      
      setEmail('');
      setName('');
      setPhone('');
      setRole('resident');
    } catch (err: any) {
      console.error('Invite error:', err);
      setMessage({ type: 'error', text: err.message || 'Erro ao criar usuário' });
    } finally {
      setLoading(false);
    }
  };

  const handleShareWhatsApp = () => {
    if (!lastCreatedUser) return;

    const cleanPhone = lastCreatedUser.phone.replace(/\D/g, '');
    const message = `*Bem-vindo ao Condomínio WM Gestão!*%0A%0ASeu acesso já está pronto!%0A%0A*Cargo:* ${lastCreatedUser.roleLabel}%0A*E-mail:* ${lastCreatedUser.email}%0A*Senha Temporária:* ${lastCreatedUser.tempPassword}%0A%0A*Acesse por aqui:* ${lastCreatedUser.loginLink}%0A%0A_Recomendamos alterar sua senha após o primeiro acesso._`;
    
    const waUrl = cleanPhone 
      ? `https://wa.me/55${cleanPhone}?text=${message}`
      : `https://wa.me/?text=${message}`;

    window.open(waUrl, '_blank');
  };

  if (currentUser.role !== 'admin') {
    return null;
  }

  return (
    <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-100">
      <h3 className="text-lg font-bold text-slate-800 uppercase tracking-widest mb-4">
        <i className="fa-solid fa-user-plus mr-2"></i>
        Convidar Novo Usuário
      </h3>
      
      {lastCreatedUser ? (
        <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-3xl animate-in zoom-in-95">
          <div className="flex items-center gap-3 mb-4 text-emerald-700">
            <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
              <i className="fa-solid fa-check text-xl"></i>
            </div>
            <div>
              <h4 className="font-bold">Usuário Criado!</h4>
              <p className="text-xs uppercase font-black opacity-60">Envie os dados abaixo via WhatsApp</p>
            </div>
          </div>

          <div className="space-y-3 mb-6">
            <div className="bg-white/50 p-3 rounded-xl">
              <span className="text-[9px] text-gray-500 uppercase block font-black">E-mail de Acesso</span>
              <span className="text-sm font-bold text-slate-700">{lastCreatedUser.email}</span>
            </div>
            <div className="bg-white/50 p-3 rounded-xl border-2 border-dashed border-emerald-200">
              <span className="text-[9px] text-gray-500 uppercase block font-black">Senha Temporária</span>
              <span className="text-xl font-mono font-black text-slate-800 tracking-wider">
                {lastCreatedUser.tempPassword}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3">
            <button
              onClick={handleShareWhatsApp}
              className="w-full bg-[#25D366] hover:bg-[#128C7E] text-white py-4 rounded-2xl font-black flex items-center justify-center gap-3 transition-all shadow-lg shadow-emerald-100 uppercase text-xs tracking-widest"
            >
              <i className="fa-brands fa-whatsapp text-2xl"></i>
              ABRIR WHATSAPP AGORA
            </button>
            <button
              onClick={() => setLastCreatedUser(null)}
              className="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 py-3 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all"
            >
              Cadastrar Outro
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleInvite} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">
                Email *
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-50 border-none text-sm font-bold text-slate-700 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-yellow-400"
                placeholder="email@exemplo.com"
                required
              />
            </div>
            
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">
                Nome Completo
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-50 border-none text-sm font-bold text-slate-700 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-yellow-400"
                placeholder="Nome completo"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">
                WhatsApp (DDD + Número)
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-slate-50 border-none text-sm font-bold text-slate-700 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-yellow-400"
                placeholder="Ex: 11999998888"
              />
            </div>
            
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">
                Cargo *
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as 'admin' | 'manager' | 'resident')}
                className="w-full bg-slate-50 border-none text-sm font-bold text-slate-700 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-yellow-400"
              >
                <option value="resident">Morador</option>
                <option value="manager">Zelador / Gestor</option>
                <option value="admin">Administrador</option>
              </select>
            </div>
          </div>

          {message && message.type === 'error' && (
            <div className="p-3 rounded-xl text-sm font-bold bg-red-50 text-red-600 border border-red-100">
              {message.text}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-yellow-500 hover:bg-yellow-600 text-white py-4 rounded-[1.5rem] font-bold text-sm uppercase tracking-widest transition-all disabled:opacity-50 shadow-lg shadow-yellow-100"
          >
            {loading ? 'Processando...' : 'Cadastrar e Abrir WhatsApp'}
          </button>
        </form>
      )}
    </div>
  );
};

export default InviteUsers;