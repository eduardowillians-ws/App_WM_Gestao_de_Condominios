import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Resident, CondoBlock } from '../types';
import { supabase } from '../lib/supabase';

const INITIAL_BLOCKS: CondoBlock[] = [
  { id: 'b1', name: 'Torre Alpha', totalUnits: 20, units: ['101'] },
];

const PROFESSIONS = ['Engenheiro(a)', 'Arquiteto(a)', 'Advogado(a)', 'Médico(a)', 'Autônomo(a)', 'Empresário(a)', 'Professor(a)', 'Designer', 'Desenvolvedor(a)', 'Aposentado(a)'];

const Moradores: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'list' | 'map'>('list');
  const [blocks, setBlocks] = useState<CondoBlock[]>(INITIAL_BLOCKS);
  const [residents, setResidents] = useState<Resident[]>([]);
  const [editingBlock, setEditingBlock] = useState<CondoBlock | null>(null);
  const [selectedBlockTransfer, setSelectedBlockTransfer] = useState<string>('b1');
  const [loading, setLoading] = useState(false);
  const [lastCreatedUser, setLastCreatedUser] = useState<any | null>(null);
  const [invites, setInvites] = useState<any[]>([]);
  const [showInvitesPanel, setShowInvitesPanel] = useState(false);
  const [filterBlock, setFilterBlock] = useState<string>('ALL');
  const [filterUnit, setFilterUnit] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);
  const [editingResident, setEditingResident] = useState<Resident | null>(null);
  const [viewingResident, setViewingResident] = useState<Resident | null>(null);
  const [selectedBlockForMap, setSelectedBlockForMap] = useState<CondoBlock | null>(null);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [transferData, setTransferData] = useState<Resident | null>(null);
  const [tempPhoto, setTempPhoto] = useState<string | null>(null);

  useEffect(() => {
    const fetchBlocks = async () => {
      const { data, error } = await supabase
        .from('condo_blocks')
        .select('*')
        .order('id', { ascending: true });
      
      if (error) {
        console.error('Erro ao buscar bloques:', error);
      } else if (data && data.length > 0) {
        const blocksData = data.map((b: any) => ({
          id: b.id,
          name: b.name,
          totalUnits: b.total_units,
          units: b.units || []
        }));
        setBlocks(blocksData);
      }
    };
    fetchBlocks();
  }, []);

  useEffect(() => {
    const fetchResidents = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'resident')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Erro ao buscar moradores:', error);
      } else if (data) {
        const formatted = data.map((r: any) => ({
          id: r.id,
          name: r.name || 'Sem nome',
          blockId: r.block_id || 'b1',
          block_id: r.block_id,
          unit: r.unit || '---',
          email: r.email || '',
          phone: r.phone || '',
          status: 'active',
          rg: r.rg || '',
          cpf: r.cpf || '',
          profession: r.profession || '',
          entryDate: r.entry_date || '',
          photoUrl: r.photo_url || 'https://i.pravatar.cc/150?u=' + r.id
        }));
        setResidents(formatted);
      }
    };
    fetchResidents();
  }, []);

  useEffect(() => {
    const fetchInvites = async () => {
      const { data, error } = await supabase
        .from('invites')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Erro ao buscar convites:', error);
      } else if (data) {
        setInvites(data);
      }
    };
    fetchInvites();
  }, []);
  
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [formRG, setFormRG] = useState('');
  const [formCPF, setFormCPF] = useState('');
  const [formPhone, setFormPhone] = useState('');

  const applyRGMask = (v: string) => v.replace(/\D/g, '').replace(/(\d{2})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  const applyCPFMask = (v: string) => v.replace(/\D/g, '').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  const applyPhoneMask = (v: string) => v.replace(/\D/g, '').replace(/^(\d{2})(\d)/g, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2');

  const filteredResidents = useMemo(() => {
    return residents.filter(res => {
      const matchBlock = filterBlock === 'ALL' || res.blockId === filterBlock;
      const matchUnit = !filterUnit || res.unit.includes(filterUnit);
      const matchSearch = !searchTerm || res.name.toLowerCase().includes(searchTerm.toLowerCase());
      return matchBlock && matchUnit && matchSearch;
    });
  }, [residents, filterBlock, filterUnit, searchTerm]);

  const handleSaveResident = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const name = formData.get('name') as string;
    const unit = formData.get('unit') as string;
    const block_id = formData.get('block_id') as string;
    const phone = formData.get('phone') as string;

    setLoading(true);
    try {
      if (!editingResident) {
        // Fluxo Novo Morador (WhatsApp flow)
        const { data, error } = await supabase.functions.invoke('invite_user', {
          body: { email, name, phone, role: 'resident', unit, block_id }
        });

        if (error) throw error;
        if (!data.success) throw new Error(data.error);

        setLastCreatedUser(data.data);
        alert('Morador registrado! Use o botão de WhatsApp agora.');
      } else {
        // Editar existente
        const { error } = await supabase
          .from('profiles')
          .update({ name, unit, block_id, phone: formPhone, rg: formRG, cpf: formCPF, profession: formData.get('profession') as string, photo_url: tempPhoto })
          .eq('id', editingResident.id);

        if (error) throw error;
        alert('Perfil atualizado!');
        window.location.reload();
      }
    } catch (err: any) {
      alert('Erro: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleShareWhatsApp = () => {
    if (!lastCreatedUser) return;
    const cleanPhone = lastCreatedUser.phone?.replace(/\D/g, '') || '';
    const msg = `*Bem-vindo ao Condomínio WM Gestão!*%0A%0ASeu acesso já está pronto!%0A%0A*Morador:* ${lastCreatedUser.email}%0A*Senha Temporária:* ${lastCreatedUser.tempPassword}%0A%0A*Acesse aqui:* ${lastCreatedUser.loginLink}%0A%0A_Altere sua senha após o primeiro acesso._`;
    const waUrl = cleanPhone ? `https://wa.me/55${cleanPhone}?text=${msg}` : `https://wa.me/?text=${msg}`;
    window.open(waUrl, '_blank');
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingResident(null);
    setLastCreatedUser(null);
  };

  const handleResendWhatsApp = (invite: any) => {
    const cleanPhone = invite.phone?.replace(/\D/g, '') || '';
    const msg = `*Bem-vindo ao Condomínio WM Gestão!*%0A%0ASeu acesso já está pronto!%0A%0A*Morador:* ${invite.email}%0A*Senha Temporária:* ${invite.temp_password}%0A%0A*Acesse aqui:* ${window.location.origin}%0A%0A_Altere sua senha após o primeiro acesso._`;
    const waUrl = cleanPhone ? `https://wa.me/55${cleanPhone}?text=${msg}` : `https://wa.me/?text=${msg}`;
    window.open(waUrl, '_blank');
  };

  const refreshInvites = async () => {
    const { data, error } = await supabase
      .from('invites')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (!error && data) {
      setInvites(data);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tighter uppercase">Moradores e Unidades</h2>
        </div>
        <div className="flex gap-3">
          <button onClick={() => { setShowInvitesPanel(true); refreshInvites(); }} className="bg-slate-100 text-slate-600 px-6 py-2.5 rounded-2xl font-black text-xs uppercase shadow-xl hover:bg-slate-200 transition-all">
            <i className="fa-solid fa-paper-plane mr-2"></i>
            CONVITES
          </button>
          <button onClick={() => setIsModalOpen(true)} className="mycond-bg-yellow text-slate-900 px-6 py-2.5 rounded-2xl font-black text-xs uppercase shadow-xl hover:bg-yellow-500 transition-all">
            + NOVO MORADOR
          </button>
        </div>
      </header>

      {/* Listagem Simplificada para Foco no Cadastro */}
      <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           {/* Barra de Pesquisa */}
           <div className="relative">
              <i className="fa-solid fa-magnifying-glass absolute left-6 top-1/2 -translate-y-1/2 text-gray-300"></i>
              <input type="text" placeholder="Nome do morador..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-slate-50 border-none rounded-2xl pl-14 pr-6 py-4 font-bold text-slate-700 outline-none" />
           </div>
        </div>
      </div>

      <div className="bg-white rounded-[3rem] shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-gray-50/50 border-b border-gray-100 font-black text-[10px] text-gray-400 uppercase tracking-widest">
              <th className="px-10 py-6">Morador</th>
              <th className="px-6 py-6">Célula / Unidade</th>
              <th className="px-10 py-6 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filteredResidents.map(res => (
              <tr key={res.id} className="hover:bg-slate-50 transition-all">
                <td className="px-10 py-6">
                  <div className="flex items-center space-x-4">
                    <img src={res.photoUrl} className="w-12 h-12 rounded-2xl object-cover" />
                    <div><p className="font-black text-slate-800 text-xs uppercase">{res.name}</p></div>
                  </div>
                </td>
                <td className="px-6 py-6 font-bold text-xs">
                  {blocks.find(b => b.id === res.blockId)?.name || 'Torre'} - {res.unit}
                </td>
                <td className="px-10 py-6 text-right">
                  <button onClick={() => setViewingResident(res)} className="text-slate-400 hover:text-slate-900 mx-2"><i className="fa-solid fa-eye"></i></button>
                  <button onClick={() => { setEditingResident(res); setIsModalOpen(true); }} className="text-slate-400 hover:text-yellow-500 mx-2"><i className="fa-solid fa-pen"></i></button>
                </td>
              </tr>
            ))}
          </tbody>
        )</table>
      </div>

      {showInvitesPanel && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md" onClick={() => setShowInvitesPanel(false)}></div>
          <div className="relative bg-white w-full max-w-4xl rounded-[3rem] shadow-2xl overflow-hidden max-h-[80vh] flex flex-col">
            <div className="px-10 py-8 mycond-bg-blue text-white flex justify-between items-center flex-shrink-0">
               <h3 className="text-2xl font-black uppercase tracking-tighter">Convites Enviados</h3>
               <button onClick={() => setShowInvitesPanel(false)} className="w-12 h-12 rounded-full hover:bg-white/10 flex items-center justify-center">
                 <i className="fa-solid fa-xmark text-xl"></i>
               </button>
            </div>
            <div className="overflow-auto flex-1 p-6">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50/50 border-b border-gray-100 font-black text-[10px] text-gray-400 uppercase tracking-widest">
                    <th className="px-4 py-4">Nome</th>
                    <th className="px-4 py-4">Email</th>
                    <th className="px-4 py-4">Unidade</th>
                    <th className="px-4 py-4">Status</th>
                    <th className="px-4 py-4">Data</th>
                    <th className="px-4 py-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {invites.length === 0 ? (
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400 font-medium">Nenhum convite enviado ainda</td></tr>
                  ) : invites.map(invite => (
                    <tr key={invite.id} className="hover:bg-slate-50 transition-all">
                      <td className="px-4 py-4 font-black text-xs">{invite.name}</td>
                      <td className="px-4 py-4 text-xs">{invite.email}</td>
                      <td className="px-4 py-4 text-xs">{invite.unit || '---'}</td>
                      <td className="px-4 py-4">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${invite.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : invite.status === 'accepted' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {invite.status === 'pending' ? 'Pendente' : invite.status === 'accepted' ? 'Ativado' : 'Expirado'}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-xs text-gray-400">
                        {new Date(invite.created_at).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <button onClick={() => handleResendWhatsApp(invite)} className="text-green-600 hover:text-green-800 text-xs font-black uppercase mr-3">
                          <i className="fa-brands fa-whatsapp mr-1"></i> Reenviar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md" onClick={closeModal}></div>
          <div className="relative bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="px-10 py-8 mycond-bg-blue text-white flex justify-between items-center">
               <h3 className="text-2xl font-black uppercase tracking-tighter">{editingResident ? 'Editar Morador' : 'Novo Morador'}</h3>
               <button onClick={closeModal} className="w-12 h-12 rounded-full hover:bg-white/10 flex items-center justify-center">
                 <i className="fa-solid fa-xmark text-xl"></i>
               </button>
            </div>
            
            <form onSubmit={handleSaveResident} className="p-10 space-y-6 max-h-[75vh] overflow-y-auto">
              {lastCreatedUser && !editingResident ? (
                <div className="bg-emerald-50 border border-emerald-100 p-8 rounded-3xl space-y-6 text-center">
                   <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                      <i className="fa-solid fa-check text-2xl"></i>
                   </div>
                   <h4 className="font-black text-slate-800 uppercase tracking-tighter">Acesso Gerado!</h4>
                   <p className="text-xs text-slate-600 font-bold uppercase mb-4">Compartilhe no WhatsApp agora</p>
                   
                   <button type="button" onClick={handleShareWhatsApp} className="w-full bg-[#25D366] text-white py-5 rounded-3xl font-black uppercase shadow-xl flex items-center justify-center gap-3">
                     <i className="fa-brands fa-whatsapp text-2xl"></i> Abrir WhatsApp
                   </button>
                   
                   <button type="button" onClick={() => window.location.reload()} className="w-full bg-slate-100 text-slate-500 py-3 rounded-2xl font-bold text-xs uppercase mt-3">Fechar</button>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">E-mail (Login)</label>
                       <input required name="email" type="email" defaultValue={editingResident?.email} readOnly={!!editingResident} className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 font-black text-slate-800 shadow-inner" />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">WhatsApp (Celular)</label>
                       <input name="phone" placeholder="Ex: 11999998888" defaultValue={editingResident?.phone} className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 font-black text-slate-800 shadow-inner" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Torre/Bloco</label>
                       <select name="block_id" required className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 font-black text-slate-800 shadow-inner">
                          <option value="">Selecione...</option>
                          {blocks.map(b => <option key={b.id} value={b.id} selected={editingResident?.blockId === b.id}>{b.name}</option>)}
                       </select>
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Unidade</label>
                       <input required name="unit" defaultValue={editingResident?.unit} className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 font-black text-slate-800 shadow-inner" placeholder="Ex: 101" />
                    </div>
                  </div>

                  <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Nome Completo</label>
                      <input required name="name" defaultValue={editingResident?.name} className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 font-black text-slate-800 shadow-inner" />
                  </div>

                  <button type="submit" disabled={loading} className="w-full py-6 mycond-bg-yellow rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl transition-all disabled:opacity-50">
                    {loading ? 'Cadastrando...' : editingResident ? 'Salvar Alterações' : 'Cadastrar e Abrir WhatsApp'}
                  </button>
                </>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Moradores;
