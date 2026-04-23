
import React, { useState, useEffect, useMemo } from 'react';
import { Encomenda } from '../types';
import { supabase } from '../lib/supabase';

interface EncomendasProps {
  userRole?: 'admin' | 'resident' | 'manager' | 'familiar';
  currentUser?: {
    id: string;
    name: string;
    unit: string;
    role: string;
    avatar: string;
  };
}

const Encomendas: React.FC<EncomendasProps> = ({ userRole = 'resident', currentUser }) => {
  const [encomendas, setEncomendas] = useState<Encomenda[]>([]);
  const [blocks, setBlocks] = useState<{id: string, name: string, units: string[]}[]>([]);
  const [selectedBlock, setSelectedBlock] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'pendente' | 'entregue'>('all');
  const [isAutoNotifyActive, setIsAutoNotifyActive] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<Encomenda | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchBlocks = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('unit, status, name')
        .eq('role', 'resident')
        .eq('status', 'active')
        .not('name', 'is', null)
        .not('name', 'eq', '');
      
      if (error) throw error;
      
      const unitsByBlock: Record<string, string[]> = {};
      (data || []).forEach((p: any) => {
        const unit = p.unit || '';
        if (unit) {
          const blockName = unit.replace(/[0-9]/g, '').trim() || 'Torre A';
          if (!unitsByBlock[blockName]) unitsByBlock[blockName] = [];
          if (!unitsByBlock[blockName].includes(unit)) {
            unitsByBlock[blockName].push(unit);
          }
        }
      });
      
      const blockList = Object.entries(unitsByBlock).map(([name, units]) => ({
        id: name,
        name,
        units: units.sort()
      })).sort((a, b) => a.name.localeCompare(b.name));
      
      setBlocks(blockList);
    } catch (err) {
      console.log('No blocks:', err);
      setBlocks([{ id: 'Torre A', name: 'Torre A', units: ['101', '102', '201', '202', '301', '302'] }]);
    }
  };

  useEffect(() => {
    const fetchEncomendas = async () => {
      let query = supabase
        .from('encomendas')
        .select(`
          id,
          recipient_name,
          unit,
          description,
          status,
          received_at,
          delivered_at,
          notified_at,
          tracking_code
        `)
        .order('received_at', { ascending: false });

      const isAdmin = userRole === 'admin';

      if (!isAdmin && currentUser) {
        if (currentUser.role === 'resident') {
          // Morador principal vê tudo da unidade
          query = query.eq('unit', currentUser.unit);
        } else {
          // Familiar vê apenas o que foi endereçado a ele
          query = query.eq('profile_id', currentUser.id);
        }
      }

      const { data, error } = await query;
      
      if (error) {
        console.error('Erro ao buscar encomendas:', error);
      } else if (data) {
        const formatted = data.map((e: any) => ({
          id: e.id,
          residentName: e.recipient_name || 'Desconhecido',
          block: e.unit ? e.unit.replace(/[0-9]/g, '').trim() : '',
          unit: e.unit || '',
          phone: '',
          description: e.description,
          trackingCode: e.tracking_code || '',
          status: e.status,
          dateEntry: e.received_at ? new Date(e.received_at).toLocaleString('pt-BR') : '',
          dateNotification: e.notified_at ? new Date(e.notified_at).toLocaleString('pt-BR') : undefined,
          dateExit: e.delivered_at ? new Date(e.delivered_at).toLocaleString('pt-BR') : undefined
        }));
        setEncomendas(formatted);
      }
    };
    
    fetchEncomendas();
    fetchBlocks();
  }, []);

  // Filtro de abas
  const filteredList = useMemo(() => {
    if (activeTab === 'all') return encomendas;
    return encomendas.filter(e => e.status === activeTab);
  }, [encomendas, activeTab]);

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const formData = new FormData(e.currentTarget);
      const selectedUnit = formData.get('unit') as string;
      const blockName = selectedUnit ? selectedUnit.replace(/[0-9]/g, '').trim() : selectedBlock || '';
      
      // Buscar perfil do morador pela unidade
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, name, phone')
        .eq('unit', selectedUnit)
        .eq('role', 'resident')
        .single();
      
      if (profileError || !profileData) {
        alert('Unidade não encontrada. Selecione uma unidade válida.');
        setIsLoading(false);
        return;
      }

      const now = new Date();
      
      // Inserir encomenda no Supabase
      const { data: encData, error: encError } = await supabase
        .from('encomendas')
        .insert({
          profile_id: profileData.id,
          description: formData.get('description') as string,
          tracking_code: formData.get('trackingCode') as string,
          status: 'pendente',
          received_at: now.toISOString()
        })
        .select()
        .single();
      
      if (encError) throw encError;

      // Enviar notificação WhatsApp se estiver ativa
      if (isAutoNotifyActive && profileData.phone) {
        const phone = profileData.phone.replace(/\D/g, '');
        const message = `*Nova Encomenda Recebida* 📦\n\n` +
          `Olá ${profileData.name}!\n` +
          `Você recebeu uma nova encomenda na portaria.\n\n` +
          `📋 Descrição: ${formData.get('description')}\n` +
          `🔢 Código: ${formData.get('trackingCode')}\n\n` +
          `Retire na portaria.`;
        
        window.open(`https://wa.me/55${phone}?text=${encodeURIComponent(message)}`, '_blank');
        
        // Atualizar notificação no banco
        await supabase
          .from('encomendas')
          .update({ notified_at: now.toISOString() })
          .eq('id', encData.id);
      }

      // Atualizar lista local
      const newEnc: Encomenda = {
        id: encData.id,
        residentName: profileData.name,
        block: blockName,
        unit: selectedUnit,
        phone: profileData.phone,
        trackingCode: formData.get('trackingCode') as string,
        description: formData.get('description') as string,
        dateEntry: now.toLocaleString('pt-BR'),
        dateNotification: isAutoNotifyActive ? now.toLocaleString('pt-BR') : undefined,
        status: 'pendente'
      };

      setEncomendas([newEnc, ...encomendas]);
      setIsModalOpen(false);
      setSelectedBlock('');
      
      if (isAutoNotifyActive) {
        alert(`Encomenda registrada e notificação enviada via WhatsApp para ${profileData.name}!`);
      }
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Erro ao registrar encomenda');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeliver = async (id: string) => {
    try {
      const now = new Date();
      const { error } = await supabase
        .from('encomendas')
        .update({ status: 'entregue', delivered_at: now.toISOString() })
        .eq('id', id);
      
      if (error) throw error;
      
      setEncomendas(prev => prev.map(e => 
        e.id === id ? { ...e, status: 'entregue', dateExit: now.toLocaleString('pt-BR') } : e
      ));
      alert('Encomenda marcada como entregue!');
    } catch (err) {
      console.error(err);
      // Fallback local
      const now = new Date().toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
      setEncomendas(prev => prev.map(e => 
        e.id === id ? { ...e, status: 'entregue', dateExit: now } : e
      ));
      alert('Encomenda marcada como entregue!');
    }
  };

  const handleNotify = async (id: string) => {
    try {
      const pkg = encomendas.find(x => x.id === id);
      if (!pkg || !pkg.phone) {
        alert('Telefone do morador não disponível');
        return;
      }
      
      const phone = pkg.phone.replace(/\D/g, '');
      const message = `*Lembrete de Encomenda* 📦\n\n` +
        `Olá ${pkg.residentName}!\n` +
        `Você ainda tem uma encomenda pendente na portaria.\n\n` +
        `📋 Descrição: ${pkg.description}\n` +
        `🔢 Código: ${pkg.trackingCode}\n\n` +
        `Retire na portaria.`;
      
      window.open(`https://wa.me/55${phone}?text=${encodeURIComponent(message)}`, '_blank');
      
      // Atualizar notificação no banco
      const now = new Date();
      await supabase
        .from('encomendas')
        .update({ notified_at: now.toISOString() })
        .eq('id', id);
      
      setEncomendas(prev => prev.map(e => 
        e.id === id ? { ...e, dateNotification: now.toLocaleString('pt-BR') } : e
      ));
      
      alert(`Notificação reenviada para ${pkg.residentName} via WhatsApp!`);
    } catch (err) {
      console.error(err);
      const now = new Date().toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
      setEncomendas(prev => prev.map(e => 
        e.id === id ? { ...e, dateNotification: now } : e
      ));
      const p = encomendas.find(x => x.id === id);
      alert(`Notificação reenviada para ${p?.residentName} via WhatsApp!`);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tighter uppercase">Gestão de Correspondência</h2>
          <p className="text-sm text-gray-500 font-medium">Controle de recebimento e retirada de pacotes.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="mycond-bg-yellow text-slate-900 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-yellow-200 hover:bg-yellow-500 transition-all active:scale-95 flex items-center space-x-2"
        >
          <i className="fa-solid fa-plus"></i>
          <span>Registrar Recebimento</span>
        </button>
      </header>

      {/* Abas */}
      <div className="flex space-x-6 border-b border-gray-200">
        {(['all', 'pendente', 'entregue'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-4 px-2 text-xs font-black uppercase tracking-[0.2em] transition-all relative ${
              activeTab === tab ? 'text-slate-900' : 'text-gray-400 hover:text-slate-600'
            }`}
          >
            {tab === 'all' ? 'Todas' : tab === 'pendente' ? 'Pendentes' : 'Entregues'}
            {activeTab === tab && <div className="absolute bottom-0 left-0 w-full h-1 mycond-bg-yellow rounded-t-full"></div>}
          </button>
        ))}
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50/50 border-b border-gray-100">
              <tr>
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Residente / Unidade</th>
                <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Entrada</th>
                <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Notificação</th>
                <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Saída</th>
                <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Status</th>
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredList.map(enc => (
                <tr key={enc.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-8 py-5">
                    <p className="font-black text-slate-800 uppercase text-xs tracking-tight">{enc.residentName}</p>
                    <p className="text-[10px] text-gray-400 font-bold">Unidade {enc.unit}</p>
                  </td>
                  <td className="px-6 py-5">
                    <p className="text-xs font-bold text-slate-600 tracking-tight">{enc.dateEntry.split(' ')[0]}</p>
                    <p className="text-[10px] text-gray-400">{enc.dateEntry.split(' ')[1]}</p>
                  </td>
                  <td className="px-6 py-5">
                    {enc.dateNotification ? (
                      <>
                        <p className="text-xs font-bold text-slate-600 tracking-tight">{enc.dateNotification.split(' ')[0]}</p>
                        <p className="text-[10px] text-gray-400">{enc.dateNotification.split(' ')[1]}</p>
                      </>
                    ) : (
                      <span className="text-[10px] font-black text-red-300 uppercase italic">Pendente</span>
                    )}
                  </td>
                  <td className="px-6 py-5">
                    {enc.dateExit ? (
                      <>
                        <p className="text-xs font-bold text-slate-600 tracking-tight">{enc.dateExit.split(' ')[0]}</p>
                        <p className="text-[10px] text-gray-400">{enc.dateExit.split(' ')[1]}</p>
                      </>
                    ) : (
                      <span className="text-[10px] font-black text-gray-200 uppercase italic">-- / --</span>
                    )}
                  </td>
                  <td className="px-6 py-5 text-center">
                    <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest shadow-sm ${
                      enc.status === 'pendente' ? 'bg-yellow-50 text-yellow-600 border border-yellow-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                    }`}>
                      {enc.status === 'pendente' ? 'Aguardando Retirada' : 'Entregue'}
                    </span>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <div className="flex items-center justify-end space-x-3">
                      <button 
                        onClick={() => setSelectedPackage(enc)}
                        className="w-10 h-10 flex items-center justify-center text-blue-400 bg-blue-50/50 rounded-xl hover:bg-blue-500 hover:text-white transition-all"
                        title="Ver Detalhes"
                      >
                        <i className="fa-solid fa-eye"></i>
                      </button>
                      {enc.status === 'pendente' && (
                        <>
                          <button 
                            onClick={() => handleDeliver(enc.id)}
                            className="w-10 h-10 flex items-center justify-center text-emerald-400 bg-emerald-50/50 rounded-xl hover:bg-emerald-500 hover:text-white transition-all" 
                            title="Confirmar Entrega / Saída"
                          >
                            <i className="fa-solid fa-check-to-slot"></i>
                          </button>
                          <button 
                            onClick={() => handleNotify(enc.id)}
                            className="w-10 h-10 flex items-center justify-center text-yellow-500 bg-yellow-50/50 rounded-xl hover:bg-yellow-500 hover:text-white transition-all" 
                            title="Reenviar Notificação Zap"
                          >
                            <i className="fa-solid fa-bell"></i>
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredList.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-8 py-20 text-center text-gray-300 font-black uppercase text-xs italic tracking-widest">Nenhuma encomenda encontrada.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Toggle Notificação Automática */}
      <div className="bg-white p-8 rounded-[2.5rem] flex items-center justify-between border border-gray-100 shadow-sm relative overflow-hidden group">
        <div className="flex items-center space-x-6 relative z-10">
            <div className={`w-14 h-14 rounded-3xl flex items-center justify-center text-2xl shadow-lg transition-all ${isAutoNotifyActive ? 'mycond-bg-yellow text-slate-900 shadow-yellow-100' : 'bg-gray-100 text-gray-400 shadow-none'}`}>
                <i className="fa-brands fa-whatsapp"></i>
            </div>
            <div>
                <h4 className="font-black text-slate-800 uppercase tracking-tighter text-lg">Notificação Automática Inteligente</h4>
                <p className="text-xs text-slate-400 font-bold tracking-tight">O morador recebe um alerta instantâneo via WhatsApp assim que o pacote é registrado pela portaria.</p>
            </div>
        </div>
        <div className="flex items-center space-x-4 relative z-10">
            <span className={`text-[10px] font-black uppercase tracking-widest ${isAutoNotifyActive ? 'text-blue-600' : 'text-gray-400'}`}>
              {isAutoNotifyActive ? 'Ativado' : 'Desativado'}
            </span>
            <button 
              onClick={() => setIsAutoNotifyActive(!isAutoNotifyActive)}
              className={`w-14 h-7 rounded-full flex items-center px-1 transition-all duration-300 ${isAutoNotifyActive ? 'mycond-bg-blue' : 'bg-gray-200'}`}
            >
                <div className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform duration-300 ${isAutoNotifyActive ? 'translate-x-7' : 'translate-x-0'}`}></div>
            </button>
        </div>
        <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-yellow-400/5 rounded-full blur-3xl group-hover:bg-yellow-400/10 transition-all duration-700"></div>
      </div>

      {/* MODAL REGISTRO */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setIsModalOpen(false)}></div>
          <div className="relative bg-white w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-10 py-8 mycond-bg-blue text-white flex justify-between items-center">
              <div>
                <h3 className="text-2xl font-black uppercase tracking-tight">Registrar Recebimento</h3>
                <p className="text-[10px] text-blue-200 font-bold uppercase tracking-widest">Entrada de correspondência na portaria</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="w-12 h-12 rounded-full hover:bg-white/10 transition-colors flex items-center justify-center"><i className="fa-solid fa-xmark text-xl"></i></button>
            </div>
            
            <form onSubmit={handleRegister} className="p-10 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Bloco/Torre</label>
                  <select 
                    name="block"
                    value={selectedBlock}
                    onChange={(e) => setSelectedBlock(e.target.value)}
                    className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 font-black text-slate-800 outline-none focus:ring-2 focus:ring-yellow-400 transition-all"
                  >
                    <option value="">Selecione o bloco</option>
                    {blocks.map(b => (
                      <option key={b.id} value={b.name}>{b.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Unidade</label>
                  <select 
                    name="unit" 
                    required
                    className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 font-black text-slate-800 outline-none focus:ring-2 focus:ring-yellow-400 transition-all"
                  >
                    <option value="">Selecione a unidade</option>
                    {blocks.find(b => b.name === selectedBlock)?.units.map(u => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Código de Rastreio / Nota</label>
                <input required name="trackingCode" type="text" className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 font-black text-slate-800 outline-none focus:ring-2 focus:ring-yellow-400 transition-all" placeholder="Ex: BR123456789" />
              </div>

              <div className="space-y-2">
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Descrição do Pacote</label>
                <textarea required name="description" rows={3} className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 font-black text-slate-800 outline-none focus:ring-2 focus:ring-yellow-400 transition-all resize-none" placeholder="Ex: Pacote médio do Mercado Livre..."></textarea>
              </div>

              <div className="pt-4 flex space-x-4">
                <button type="button" onClick={() => { setIsModalOpen(false); setSelectedBlock(''); }} className="flex-1 px-4 py-5 border-2 border-slate-100 rounded-2xl font-black text-gray-400 hover:bg-gray-50 transition-colors uppercase text-xs tracking-widest">Cancelar</button>
                <button type="submit" disabled={isLoading} className="flex-1 px-4 py-5 mycond-bg-yellow rounded-2xl font-black text-slate-900 hover:bg-yellow-500 transition-all shadow-xl shadow-yellow-100 uppercase text-xs tracking-widest disabled:opacity-50">
                  {isLoading ? 'Salvando...' : 'Salvar Entrada'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DETALHES */}
      {selectedPackage && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-xl animate-in fade-in duration-300" onClick={() => setSelectedPackage(null)}></div>
          <div className="relative bg-white w-full max-w-md rounded-[3rem] shadow-2xl p-10 animate-in zoom-in-95 duration-400">
             <div className="text-center mb-8">
                <div className="w-20 h-20 bg-yellow-50 text-yellow-500 rounded-[2rem] flex items-center justify-center mx-auto mb-4 text-3xl shadow-inner border border-yellow-100">
                   <i className="fa-solid fa-box-open"></i>
                </div>
                <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Detalhes do Pacote</h3>
                <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-1">{selectedPackage.trackingCode}</p>
             </div>

             <div className="space-y-6">
                <div className="bg-slate-50 p-6 rounded-3xl border border-gray-100">
                   <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Informações de Rastreio</p>
                   <div className="space-y-4">
                      <div className="flex justify-between items-center text-xs">
                         <span className="font-bold text-slate-400">Residente:</span>
                         <span className="font-black text-slate-800 uppercase">{selectedPackage.residentName}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                         <span className="font-bold text-slate-400">Unidade:</span>
                         <span className="font-black text-slate-800 uppercase">{selectedPackage.unit}</span>
                      </div>
                      <div className="pt-2 border-t border-gray-200">
                         <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Descrição:</p>
                         <p className="text-xs text-slate-600 italic font-bold leading-relaxed">"{selectedPackage.description}"</p>
                      </div>
                   </div>
                </div>

                <div className="space-y-3">
                   <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Histórico Logístico</p>
                   <div className="relative pl-6 space-y-4 before:content-[''] before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100">
                      <div className="relative flex flex-col before:content-[''] before:absolute before:-left-[1.35rem] before:top-1.5 before:w-2 before:h-2 before:rounded-full before:bg-yellow-400 before:ring-4 before:ring-yellow-50">
                         <p className="text-[10px] font-black text-slate-800 uppercase">Entrada na Portaria</p>
                         <p className="text-[9px] text-gray-400 font-bold">{selectedPackage.dateEntry}</p>
                      </div>
                      <div className={`relative flex flex-col before:content-[''] before:absolute before:-left-[1.35rem] before:top-1.5 before:w-2 before:h-2 before:rounded-full ${selectedPackage.dateNotification ? 'before:bg-blue-400 before:ring-4 before:ring-blue-50' : 'before:bg-gray-200'}`}>
                         <p className="text-[10px] font-black text-slate-800 uppercase">Notificação Residentes</p>
                         <p className="text-[9px] text-gray-400 font-bold">{selectedPackage.dateNotification || 'Pendente'}</p>
                      </div>
                      <div className={`relative flex flex-col before:content-[''] before:absolute before:-left-[1.35rem] before:top-1.5 before:w-2 before:h-2 before:rounded-full ${selectedPackage.dateExit ? 'before:bg-emerald-400 before:ring-4 before:ring-emerald-50' : 'before:bg-gray-200'}`}>
                         <p className="text-[10px] font-black text-slate-800 uppercase">Retirada / Saída</p>
                         <p className="text-[9px] text-gray-400 font-bold">{selectedPackage.dateExit || 'Aguardando'}</p>
                      </div>
                   </div>
                </div>

                <button 
                  onClick={() => setSelectedPackage(null)}
                  className="w-full py-5 mycond-bg-blue text-white rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-xl shadow-blue-500/20 hover:bg-slate-800 transition-all"
                >
                   Fechar Detalhes
                </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Encomendas;
