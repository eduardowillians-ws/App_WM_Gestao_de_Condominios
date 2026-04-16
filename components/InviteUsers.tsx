import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

interface InviteUsersProps {
  currentUser: { id: string; role: string };
}

const InviteUsers: React.FC<InviteUsersProps> = ({ currentUser }) => {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('');
  const [role, setRole] = useState<'manager' | 'resident'>('resident');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      setMessage({ type: 'error', text: 'Email é obrigatório' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const { data, error } = await supabase.functions.invoke('invite_user', {
        body: { email, name, unit, role }
      });

      if (error || !data?.success) {
        setMessage({ type: 'error', text: data?.error || 'Erro ao convidar usuário' });
        return;
      }

      setMessage({ type: 'success', text: data.message || 'Usuário convidado com sucesso!' });
      setEmail('');
      setName('');
      setUnit('');
      setRole('resident');
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Erro ao convidar usuário' });
    } finally {
      setLoading(false);
    }
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
              Nome
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
              Unidade/Apartamento
            </label>
            <input
              type="text"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="w-full bg-slate-50 border-none text-sm font-bold text-slate-700 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-yellow-400"
              placeholder="101, 201, etc"
            />
          </div>
          
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">
              Cargo *
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as 'manager' | 'resident')}
              className="w-full bg-slate-50 border-none text-sm font-bold text-slate-700 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-yellow-400"
            >
              <option value="resident">Morador</option>
              <option value="manager">Zelador / Gestor</option>
            </select>
          </div>
        </div>

        {message && (
          <div className={`p-3 rounded-xl text-sm font-bold ${
            message.type === 'success' 
              ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' 
              : 'bg-red-50 text-red-600 border border-red-100'
          }`}>
            {message.text}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-yellow-500 hover:bg-yellow-600 text-white py-3 rounded-xl font-bold text-sm uppercase tracking-widest transition-all disabled:opacity-50"
        >
          {loading ? 'Enviando...' : 'Enviar Convite'}
        </button>
      </form>
    </div>
  );
};

export default InviteUsers;