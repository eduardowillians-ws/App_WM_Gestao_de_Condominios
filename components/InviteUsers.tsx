import React, { useState, useEffect, useMemo } from 'react';
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

interface InviteRecord {
  id: string;
  email: string;
  name: string;
  phone: string;
  unit: string;
  role: string;
  status: 'pending' | 'accepted' | 'expired';
  created_at: string;
  temp_password: string;
  dynamicStatus?: string; // Status calculado em tempo real
}

const InviteUsers: React.FC<InviteUsersProps> = ({ currentUser }) => {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<'admin' | 'manager' | 'resident' | 'familiar'>('resident');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [lastCreatedUser, setLastCreatedUser] = useState<LastCreatedUser | null>(null);
  
  // Histórico
  const [invites, setInvites] = useState<InviteRecord[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [isLoadingInvites, setIsLoadingInvites] = useState(false);

  const fetchInvites = async () => {
    setIsLoadingInvites(true);
    try {
      // 1. Busca convites
      const { data: inviteData, error: inviteError } = await supabase
        .from('invites')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (inviteError) throw inviteError;

      // 2. Busca perfis para comparar atividade
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('email, status, created_at, updated_at');
      
      if (profileError) throw profileError;

      // 3. Mescla os dados para determinar o status real
      const mergedInvites = (inviteData || []).map(inv => {
        const profile = (profileData || []).find(p => p.email === inv.email);
        let dynamicStatus = inv.status;

        if (profile) {
          // Se o perfil existe e foi atualizado após a criação, assumimos que o usuário acessou/ativou
          const createdAt = new Date(profile.created_at).getTime();
          const updatedAt = new Date(profile.updated_at).getTime();
          
          if (updatedAt > createdAt || profile.status === 'active') {
            dynamicStatus = 'accepted';
          }
        }

        return { ...inv, dynamicStatus };
      });

      setInvites(mergedInvites);
    } catch (err) {
      console.error('Erro ao buscar convites:', err);
    } finally {
      setIsLoadingInvites(false);
    }
  };

  useEffect(() => {
    fetchInvites();
  }, []);

  const filteredInvites = useMemo(() => {
    return invites.filter(inv => {
      const currentStatus = inv.dynamicStatus || inv.status;
      const matchStatus = filterStatus === 'all' || currentStatus === filterStatus;
      const matchRole = filterRole === 'all' || inv.role === filterRole;
      return matchStatus && matchRole;
    });
  }, [invites, filterStatus, filterRole]);

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
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      
      console.log('--- DIAGNÓSTICO DE CONVITE ---');
      console.log('Usuário Logado:', currentUser.id, currentUser.role);
      console.log('Token presente:', !!token);
      if (token) console.log('Token (primeiros 20 caracteres):', token.substring(0, 20) + '...');
      console.log('Iniciando convite para:', email, 'com papel:', role);

      const { data, error } = await supabase.functions.invoke('invite_user', {
        body: { email, name, phone, role }
      });

      if (error) {
        console.error('Erro retornado pelo invoke do Supabase:', error);
        
        // Verificar se é erro de autenticação (401)
        const isAuthError = error.message?.includes('401') || (error as any).status === 401;
        
        setMessage({ 
          type: 'error', 
          text: isAuthError 
            ? 'Sessão expirada ou sem permissão. Por favor, faça login novamente.' 
            : `Erro na Função: ${error.message || 'Erro de conexão'}` 
        });
        return;
      }

      console.log('Resposta da função invite_user:', data);

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
      fetchInvites(); // Atualiza a lista
    } catch (err: any) {
      console.error('Invite error:', err);
      setMessage({ type: 'error', text: err.message || 'Erro ao criar usuário' });
    } finally {
      setLoading(false);
    }
  };

  const handleShareWhatsApp = (userToShare?: any) => {
    const user = userToShare || lastCreatedUser;
    if (!user) return;

    const email = user.email;
    const pwd = user.tempPassword || user.temp_password;
    const phone = user.phone || '';
    const label = user.roleLabel || (user.role === 'familiar' ? 'Familiar' : user.role === 'resident' ? 'Morador' : user.role);

    const cleanPhone = phone?.replace(/\D/g, '') || '';
    const message = `*Bem-vindo ao Condomínio WM Gestão!*%0A%0ASeu acesso já está pronto!%0A%0A*Cargo:* ${label}%0A*E-mail:* ${email}%0A*Senha Temporária:* ${pwd}%0A%0A*Acesse por aqui:* ${window.location.origin}%0A%0A_Recomendamos alterar sua senha após o primeiro acesso._`;
    
    const waUrl = cleanPhone
      ? `https://wa.me/55${cleanPhone}?text=${message}`
      : `https://web.whatsapp.com/send?text=${message}`;

    window.open(waUrl, '_blank');
  };

  const getStatusBadge = (invite: InviteRecord) => {
    const status = invite.dynamicStatus || invite.status;
    switch (status) {
      case 'accepted': return <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-[10px] font-black uppercase">Ativado</span>;
      case 'expired': return <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-[10px] font-black uppercase">Expirado</span>;
      default: return <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-[10px] font-black uppercase">Pendente</span>;
    }
  };

  if (currentUser.role !== 'admin' && currentUser.role !== 'manager') {
    return <div className="p-10 text-center font-bold text-gray-400">Acesso restrito para administradores.</div>;
  }

  return (
    <div className="space-y-8 pb-20">
      <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-gray-100 max-w-4xl mx-auto">
        <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter mb-8 flex items-center">
          <div className="w-10 h-10 mycond-bg-blue rounded-2xl flex items-center justify-center mr-4 shadow-lg shadow-blue-100">
            <i className="fa-solid fa-user-plus text-white"></i>
          </div>
          Convidar Novo Usuário
        </h3>
        
        {lastCreatedUser ? (
          <div className="bg-emerald-50 border border-emerald-100 p-8 rounded-[2rem] animate-in zoom-in-95">
            <div className="flex items-center gap-4 mb-6 text-emerald-700">
              <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center shadow-inner">
                <i className="fa-solid fa-check text-2xl"></i>
              </div>
              <div>
                <h4 className="text-lg font-black uppercase tracking-tight">Usuário Criado!</h4>
                <p className="text-xs uppercase font-black opacity-60">Envie os dados abaixo via WhatsApp</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              <div className="bg-white p-5 rounded-2xl shadow-sm">
                <span className="text-[9px] text-gray-400 uppercase block font-black mb-1">E-mail de Acesso</span>
                <span className="text-sm font-bold text-slate-700">{lastCreatedUser.email}</span>
              </div>
              <div className="bg-white p-5 rounded-2xl shadow-sm border-2 border-dashed border-emerald-200">
                <span className="text-[9px] text-gray-400 uppercase block font-black mb-1">Senha Temporária</span>
                <span className="text-xl font-mono font-black text-slate-800 tracking-wider">
                  {lastCreatedUser.tempPassword}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={() => handleShareWhatsApp()}
                className="bg-[#25D366] hover:bg-[#128C7E] text-white py-5 rounded-2xl font-black flex items-center justify-center gap-3 transition-all shadow-xl shadow-emerald-100 uppercase text-xs tracking-widest"
              >
                <i className="fa-brands fa-whatsapp text-2xl"></i>
                ABRIR WHATSAPP AGORA
              </button>
              <button
                onClick={() => setLastCreatedUser(null)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-600 py-5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all"
              >
                Cadastrar Outro
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleInvite} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 block">
                  Email de Acesso *
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-50 border-none text-sm font-black text-slate-800 rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-yellow-400 shadow-inner"
                  placeholder="exemplo@email.com"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 block">
                  Nome do Usuário
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-50 border-none text-sm font-black text-slate-800 rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-yellow-400 shadow-inner"
                  placeholder="Nome completo"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 block">
                  WhatsApp (Celular) *
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-slate-50 border-none text-sm font-black text-slate-800 rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-yellow-400 shadow-inner"
                  placeholder="Ex: 11999998888"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 block">
                  Nível de Acesso (Cargo) *
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as any)}
                  className="w-full bg-slate-50 border-none text-sm font-black text-slate-800 rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-yellow-400 shadow-inner appearance-none cursor-pointer"
                >
                  <option value="resident">Morador</option>
                  <option value="familiar">Familiar / Dependente</option>
                  <option value="manager">Zelador / Gestor</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
            </div>

            {message && message.type === 'error' && (
              <div className="p-4 rounded-2xl text-xs font-black uppercase bg-red-50 text-red-600 border border-red-100 animate-in slide-in-from-top-2">
                <i className="fa-solid fa-circle-exclamation mr-2"></i>
                {message.text}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-16 bg-yellow-400 hover:bg-yellow-500 text-slate-900 rounded-[1.5rem] font-black text-xs uppercase tracking-widest transition-all disabled:opacity-50 shadow-xl shadow-yellow-100 flex items-center justify-center gap-3 active:scale-[0.98]"
            >
              {loading ? (
                <><i className="fa-solid fa-circle-notch animate-spin"></i> PROCESSANDO...</>
              ) : (
                <><i className="fa-solid fa-paper-plane"></i> GERAR ACESSO E ABRIR WHATSAPP</>
              )}
            </button>
          </form>
        )}
      </div>

      {/* Histórico de Convites */}
      <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-gray-100 max-w-5xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
           <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter flex items-center">
             <div className="w-10 h-10 bg-slate-100 rounded-2xl flex items-center justify-center mr-4">
               <i className="fa-solid fa-history text-slate-500"></i>
             </div>
             Histórico de Convites
           </h3>

           <div className="flex gap-4 w-full md:w-auto">
              <select 
                value={filterStatus} 
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-slate-50 border-none rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-500 outline-none"
              >
                <option value="all">TODOS STATUS</option>
                <option value="pending">PENDENTE</option>
                <option value="accepted">ATIVADO</option>
                <option value="expired">EXPIRADO</option>
              </select>
              <select 
                value={filterRole} 
                onChange={(e) => setFilterRole(e.target.value)}
                className="bg-slate-50 border-none rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-500 outline-none"
              >
                <option value="all">TODOS CARGOS</option>
                <option value="resident">MORADOR</option>
                <option value="familiar">FAMILIAR</option>
                <option value="manager">GESTOR</option>
                <option value="admin">ADMIN</option>
              </select>
           </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                <th className="px-4 py-4">Usuário</th>
                <th className="px-4 py-4">Cargo</th>
                <th className="px-4 py-4">Status</th>
                <th className="px-4 py-4">Data</th>
                <th className="px-4 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoadingInvites ? (
                <tr><td colSpan={5} className="py-10 text-center text-gray-300 animate-pulse font-black uppercase text-xs">Carregando convites...</td></tr>
              ) : filteredInvites.length === 0 ? (
                <tr><td colSpan={5} className="py-10 text-center text-gray-400 font-bold">Nenhum convite encontrado</td></tr>
              ) : filteredInvites.map(inv => (
                <tr key={inv.id} className="group hover:bg-slate-50/50 transition-all">
                  <td className="px-4 py-6">
                    <div>
                      <p className="font-black text-slate-800 text-xs uppercase">{inv.name || 'Sem Nome'}</p>
                      <p className="text-[10px] font-bold text-gray-400 lowercase">{inv.email}</p>
                    </div>
                  </td>
                  <td className="px-4 py-6">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                      {inv.role === 'familiar' ? 'Familiar' : inv.role === 'resident' ? 'Morador' : inv.role}
                    </span>
                  </td>
                  <td className="px-4 py-6">
                    {getStatusBadge(inv)}
                  </td>
                  <td className="px-4 py-6">
                    <span className="text-[10px] font-bold text-gray-400">{new Date(inv.created_at).toLocaleDateString('pt-BR')}</span>
                  </td>
                  <td className="px-4 py-6 text-right">
                    <button 
                      onClick={() => handleShareWhatsApp(inv)}
                      className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-600 hover:text-white transition-all flex items-center justify-center ml-auto shadow-sm"
                      title="Reenviar via WhatsApp"
                    >
                      <i className="fa-brands fa-whatsapp text-lg"></i>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default InviteUsers;