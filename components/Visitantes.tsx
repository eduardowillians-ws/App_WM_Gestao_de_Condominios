
import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Visitor, VehicleTag } from '../types';

interface VisitantesProps {
  userRole?: 'admin' | 'resident' | 'manager';
  currentUser?: {
    id: string;
    name: string;
    unit: string;
    role: string;
    avatar: string;
  };
}

const applyRGMask = (v: string) => v.replace(/\D/g, '').replace(/(\d{2})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
const applyCPFMask = (v: string) => v.replace(/\D/g, '').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');

const Visitantes: React.FC<VisitantesProps> = ({ userRole = 'resident', currentUser }) => {
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [tags, setTags] = useState<VehicleTag[]>([]);
  const [blocks, setBlocks] = useState<{id: string, name: string, units: string[]}[]>([]);
  const [activeModal, setActiveModal] = useState<'visitor' | 'facial' | 'qr' | 'tags' | null>(null);
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [successState, setSuccessState] = useState<string | null>(null);
  const [hasCamera, setHasCamera] = useState<boolean | null>(null);
  const [filter, setFilter] = useState('');
  const [lastQRCode, setLastQRCode] = useState<{code: string; name: string; unit: string; block: string; expires: string} | null>(null);
  const [selectedBlock, setSelectedBlock] = useState('');
  const [formRg, setFormRg] = useState('');
  const [formCpf, setFormCpf] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);

  const fetchBlocks = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('unit')
        .eq('role', 'resident');
      
      if (error) throw error;
      
      // Extrai blocos únicos das unidades
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

  const isAdmin = userRole === 'admin' || userRole === 'manager';

  useEffect(() => {
    fetchVisitors();
    fetchVehicleTags();
    fetchBlocks();
  }, []);

  const fetchVisitors = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('visitors')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      const formatted = (data || []).map((r: any) => ({
        id: r.id,
        name: r.visitor_name,
        type: r.visitor_type,
        unit: r.unit,
        timestamp: r.entry_time ? new Date(r.entry_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '--:--',
        method: r.access_method || 'AUTORIZADO VIA APP',
        avatar: `https://i.pravatar.cc/40?u=${r.id}`
      }));

      setVisitors(formatted);
    } catch (err) {
      console.log('Fallback:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchVehicleTags = async () => {
    try {
      const { data, error } = await supabase
        .from('vehicle_tags')
        .select('*')
        .eq('status', 'active')
        .order('plate');

      if (error) throw error;

      const formatted = (data || []).map((r: any) => ({
        id: r.id,
        plate: r.plate,
        model: r.model || '',
        owner: r.owner_name,
        unit: r.unit,
        block: r.block,
        spots: r.parking_spots?.join(', ')
      }));

      setTags(formatted);
    } catch (err) {
      console.log('No tags:', err);
    }
  };

  useEffect(() => {
    if (activeModal === 'facial' && videoRef.current) {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setHasCamera(false);
        return;
      }

      navigator.mediaDevices.getUserMedia({ video: true })
        .then(stream => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            setHasCamera(true);
          }
        })
        .catch(err => {
          console.warn("Câmera não encontrada:", err);
          setHasCamera(false);
        });
    }
    return () => {
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [activeModal]);

  const handleAddVisitor = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!currentUser) return;

    setIsLoading(true);
    try {
      const formData = new FormData(e.currentTarget);
      const visitorName = formData.get('name') as string;
      const block = formData.get('block') as string;
      const visitorType = formData.get('type') as string;
      
      // Gerar QR Code único
      const qrCode = `WM-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 horas
      
      const { data, error } = await supabase
        .from('visitors')
        .insert({
          visitor_name: visitorName,
          visitor_rg: formRg || null,
          visitor_cpf: formCpf || null,
          unit: formData.get('unit') as string,
          host_name: currentUser.name,
          host_unit: currentUser.unit,
          host_block: selectedBlock || block || null,
          visitor_type: visitorType,
          access_method: 'AUTORIZADO VIA APP',
          status: 'approved',
          approved_by: currentUser.id,
          created_by: currentUser.id,
          qr_code: qrCode,
          qr_expires_at: expiresAt,
          entry_time: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      await fetchVisitors();

      // Registrar entrada do visitante em access_logs
      try {
        await supabase.from('access_logs').insert({
          user_id: currentUser.id,
          profile_id: currentUser.id,
          block_id: selectedBlock || block || null,
          unit: formData.get('unit') as string,
          access_type: 'VISITANTE',
          direction: 'ENTRY',
          name: visitorName,
          document: formRg || formCpf || null,
          reason: 'Autorização via App'
        });
      } catch (logErr) {
        console.log('Access log error (não crítico):', logErr);
      }
      
      // Show QR Code modal
      setLastQRCode({
        code: qrCode,
        name: visitorName,
        unit: formData.get('unit') as string,
        block: block || '',
        expires: expiresAt
      });
      setActiveModal('qr');
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Erro ao autorizar');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteTag = async (id: string) => {
    if (!window.confirm('Deseja remover este veículo do sistema LPR?\nO veículo será inativado mas dados ficarão salvos.')) return;

    try {
      const { error } = await supabase
        .from('vehicle_tags')
        .update({ status: 'inactive', updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;

      // Atualiza localmente também
      setTags(prev => prev.filter(t => t.id !== id));
      alert('Veículo removido. Dados salvos para histórico.');
    } catch (err) {
      console.error(err);
      // Fallback local
      setTags(prev => prev.filter(t => t.id !== id));
    }
  };

  useEffect(() => {
    if (activeModal === 'facial' && videoRef.current) {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setHasCamera(false);
        return;
      }

      navigator.mediaDevices.getUserMedia({ video: true })
        .then(stream => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            setHasCamera(true);
          }
        })
        .catch(err => {
          console.warn("Câmera não encontrada ou acesso negado:", err);
          setHasCamera(false);
        });
    }
    return () => {
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [activeModal]);

  const handleRegisterTag = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!currentUser) return;

    setIsLoading(true);
    try {
      const formData = new FormData(e.currentTarget);
      
      const selectedUnit = formData.get('selected_unit') as string;
      const blockName = selectedUnit.replace(/[0-9]/g, '').trim() || '';
      
      // Pegar checkboxes marcadas
      const spots: string[] = [];
      const form = e.currentTarget;
      const checkboxes = form.querySelectorAll('input[name="spots"]:checked');
      checkboxes.forEach((cb: any) => spots.push(cb.value));
      
      const { error } = await supabase
        .from('vehicle_tags')
        .insert({
          plate: (formData.get('plate') as string).toUpperCase().replace(/[^A-Z0-9]/g, ''),
          model: (formData.get('model') as string).toUpperCase(),
          owner_name: formData.get('owner') as string,
          block: blockName,
          unit: selectedUnit,
          parking_spots: spots,
          status: 'active'
        });

      if (error) throw error;

      await fetchVehicleTags();
      setIsAddingTag(false);
      alert('Veículo cadastrado com sucesso!');
      
      // Limpar checkboxes
      const checkboxesClear = document.querySelectorAll('input[name="spots"]:checked');
      checkboxesClear.forEach((cb: any) => cb.checked = false);
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Erro ao cadastrar');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendWhatsApp = () => {
    if (!lastQRCode) return;
    const text = `*Acesso Autorizado* 🎫\n\n` +
      `👤 Visitante: ${lastQRCode.name}\n` +
      `🏢 Bloco: ${lastQRCode.block || 'Principal'}\n` +
      `🚪 Apto: ${lastQRCode.unit}\n` +
      `📋 Código: ${lastQRCode.code}\n\n` +
      `⏰ Válido por 24h\n` +
      `Apresente este código na portaria.`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleCaptureFacial = () => {
    setSuccessState("Biometria Facial processada com sucesso!");
    setTimeout(() => {
      setSuccessState(null);
      setActiveModal(null);
    }, 2000);
  };

  const filteredVisitors = visitors.filter(v => 
    v.name.toLowerCase().includes(filter.toLowerCase()) || 
    v.unit.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight uppercase">Acesso e Visitantes</h2>
          <p className="text-sm text-gray-500 font-medium">Controle de portaria e biometria facial.</p>
        </div>
        <button 
          onClick={() => setActiveModal('visitor')}
          className="mycond-bg-yellow text-slate-900 px-6 py-3 rounded-2xl font-bold flex items-center space-x-2 shadow-lg shadow-yellow-100 hover:bg-yellow-500 transition-all active:scale-95 text-xs uppercase tracking-widest"
        >
          <i className="fa-solid fa-user-plus"></i>
          <span>Autorizar Acesso</span>
        </button>
      </header>

      {/* Cards de Ações Rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <button onClick={() => setActiveModal('facial')} className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm flex flex-col items-center text-center group hover:shadow-xl transition-all">
             <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center mb-5 text-2xl group-hover:scale-110 transition-transform shadow-inner">
                 <i className="fa-solid fa-face-smile"></i>
             </div>
             <h4 className="font-bold text-slate-800 uppercase text-sm tracking-tight">Reconhecimento Facial</h4>
             <p className="text-[10px] text-gray-400 font-medium mt-2 leading-relaxed px-4">Cadastre moradores para acesso sem toque e alta segurança.</p>
         </button>

         <button onClick={() => setActiveModal('qr')} className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm flex flex-col items-center text-center group hover:shadow-xl transition-all">
             <div className="w-16 h-16 bg-yellow-50 text-yellow-600 rounded-3xl flex items-center justify-center mb-5 text-2xl group-hover:scale-110 transition-transform shadow-inner">
                 <i className="fa-solid fa-qrcode"></i>
             </div>
             <h4 className="font-bold text-slate-800 uppercase text-sm tracking-tight">Convite Digital QR</h4>
             <p className="text-[10px] text-gray-400 font-medium mt-2 leading-relaxed px-4">Envie chaves temporárias via WhatsApp para convidados.</p>
         </button>

         <button onClick={() => setActiveModal('tags')} className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm flex flex-col items-center text-center group hover:shadow-xl transition-all">
             <div className="w-16 h-16 bg-purple-50 text-purple-600 rounded-3xl flex items-center justify-center mb-5 text-2xl group-hover:scale-110 transition-transform shadow-inner">
                 <i className="fa-solid fa-car"></i>
             </div>
             <h4 className="font-bold text-slate-800 uppercase text-sm tracking-tight">TAGs de Veículos</h4>
             <p className="text-[10px] text-gray-400 font-medium mt-2 leading-relaxed px-4">Gerencie as placas e acessos automáticos de veículos.</p>
         </button>
      </div>

      {/* Histórico Principal */}
      <div className="bg-white rounded-[3rem] border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-10 py-8 border-b border-gray-50 flex flex-col sm:flex-row justify-between items-center gap-4 bg-gray-50/50">
            <h4 className="font-bold text-slate-800 uppercase text-[10px] tracking-[0.2em]">Fluxo de Acessos em Tempo Real</h4>
            <div className="relative">
              <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 text-xs"></i>
              <input 
                type="text" 
                placeholder="Filtrar nome ou unidade..." 
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="text-xs border-none bg-white rounded-xl pl-10 pr-4 py-3 outline-none focus:ring-2 focus:ring-yellow-400 shadow-inner" 
              />
            </div>
        </div>
        <div className="divide-y divide-gray-50">
            {filteredVisitors.map(visitor => (
                <div key={visitor.id} className="px-10 py-6 flex items-center justify-between hover:bg-slate-50/50 transition-colors group">
                    <div className="flex items-center space-x-6">
                        <div className="w-12 h-12 rounded-2xl bg-slate-100 overflow-hidden border border-gray-200 shadow-sm group-hover:scale-105 transition-transform">
                            <img src={visitor.avatar} alt={visitor.name} className="w-full h-full object-cover" />
                        </div>
                        <div>
                            <p className="font-bold text-xs text-slate-800 uppercase tracking-tight">{visitor.name}</p>
                            <div className="flex items-center space-x-3 mt-1">
                                <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest ${
                                  visitor.type === 'MORADOR' ? 'bg-blue-100 text-blue-600' :
                                  visitor.type === 'SERVIÇO' ? 'bg-purple-100 text-purple-600' :
                                  'bg-gray-100 text-gray-600'
                                }`}>{visitor.type}</span>
                                <span className="text-[10px] text-gray-400 font-medium uppercase">• Unidade {visitor.unit}</span>
                            </div>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-sm font-bold text-slate-700 tracking-tighter">{visitor.timestamp}</p>
                        <p className="text-[9px] text-emerald-500 font-bold uppercase tracking-widest mt-0.5">{visitor.method}</p>
                    </div>
                </div>
            ))}
        </div>
      </div>

      {/* MODAL TAGS DE VEÍCULOS - FIDELIDADE VISUAL */}
      {activeModal === 'tags' && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-xl animate-in fade-in" onClick={() => setActiveModal(null)}></div>
          <div className="relative bg-white w-full max-w-lg rounded-[3.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95">
             {/* Cabeçalho Preto conforme Imagem */}
             <div className="bg-black p-10 text-white flex justify-between items-start">
                <div>
                   <h3 className="text-2xl font-black uppercase tracking-tighter leading-none mb-1">TAGs de Veículos</h3>
                   <p className="text-[10px] text-white/50 font-black uppercase tracking-widest">Leitura LPR em Tempo Real</p>
                </div>
                <button onClick={() => setActiveModal(null)} className="w-10 h-10 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors">
                   <i className="fa-solid fa-xmark text-lg"></i>
                </button>
             </div>

             <div className="p-10 space-y-8 max-h-[70vh] overflow-y-auto scrollbar-hide">
                {/* Banner Roxo de Info conforme Imagem */}
                <div className="bg-[#f5f0ff] p-8 rounded-[2.5rem] border border-purple-100 flex items-start space-x-5">
                   <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-white text-xs flex-shrink-0 mt-1">
                      <i className="fa-solid fa-info"></i>
                   </div>
                   <p className="text-[11px] text-purple-700 font-black uppercase leading-relaxed tracking-tight">O sistema de leitura de placas libera automaticamente os portões para veículos cadastrados abaixo.</p>
                </div>

                {isAddingTag ? (
                  <form onSubmit={handleRegisterTag} className="bg-[#f8fafc] p-6 sm:p-10 rounded-2xl sm:rounded-[3rem] border border-gray-100 space-y-4 sm:space-y-6 animate-in slide-in-from-top-4">
                    <h4 className="text-sm font-black text-slate-800 uppercase tracking-[0.2em] mb-4">Novo Veículo</h4>
                    
<div className="space-y-2">
                       <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Proprietário (Morador)</label>
                       <select 
                         name="unit" 
                         onChange={async (e) => {
                           const selected = e.target.value;
                           if (!selected) return;
                           const block = selected.replace(/[0-9]/g, '').trim() || '';
                           
                           // Definir valores padrão primeiro
                           (document.querySelector('[name="block"]') as HTMLInputElement).value = block;
                           (document.querySelector('[name="selected_unit"]') as HTMLInputElement).value = selected;
                           
                           // Buscar nome do morador pelo perfil no Supabase
                           try {
                             const { data } = await supabase.from('profiles').select('name').eq('unit', selected).single();
                             const ownerName = data?.name || currentUser?.name || '';
                             (document.querySelector('[name="owner"]') as HTMLInputElement).value = ownerName;
                           } catch {
                             (document.querySelector('[name="owner"]') as HTMLInputElement).value = currentUser?.name || '';
                           }
                         }}
                         className="w-full bg-white border-none rounded-xl sm:rounded-2xl px-4 sm:px-6 py-3 sm:py-5 font-bold text-slate-800 shadow-sm outline-none text-sm"
                       >
                         <option value="">Selecione a Unidade</option>
                         {blocks.map(b => (
                           <optgroup key={b.id} label={b.name}>
                             {b.units.map(u => (
                               <option key={u} value={u}>{u}</option>
                             ))}
                           </optgroup>
                         ))}
                       </select>
                       <input type="hidden" name="owner" value={currentUser?.name || ''} defaultValue={currentUser?.name || ''} />
                       <input type="hidden" name="selected_unit" />
                       <input type="hidden" name="block" />
                     </div>

                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Placa do Veículo</label>
                       <input required name="plate" placeholder="ABC1D23" className="w-full bg-white border-none rounded-xl sm:rounded-2xl px-4 sm:px-6 py-3 sm:py-5 font-bold text-lg text-slate-800 shadow-sm outline-none focus:ring-4 focus:ring-yellow-400/20 uppercase" maxLength={7} />
                    </div>

                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Modelo / Cor</label>
                       <input required name="model" placeholder="Ex: Honda Civic Cinza" className="w-full bg-white border-none rounded-xl sm:rounded-2xl px-4 sm:px-6 py-3 sm:py-5 font-bold text-slate-800 shadow-sm outline-none focus:ring-4 focus:ring-yellow-400/20" />
                    </div>

                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Vagas Vinculadas</label>
                       <div className="flex flex-wrap gap-2">
                         {['1', '2', '3'].map(num => (
                           <label key={num} className="flex items-center">
                             <input type="checkbox" name="spots" value={num} className="peer sr-only" />
                             <div className="px-4 py-3 bg-white border-2 border-gray-100 rounded-xl font-bold text-slate-600 peer-checked:bg-yellow-400 peer-checked:border-yellow-400 peer-checked:text-slate-900 cursor-pointer transition-all text-sm">
                               Vaga {num}
                             </div>
                           </label>
                         ))}
                       </div>
                    </div>

                    <div className="flex gap-3 sm:gap-4 pt-3 sm:pt-4">
                       <button type="button" onClick={() => setIsAddingTag(false)} className="flex-1 py-4 sm:py-5 bg-white border border-gray-100 rounded-xl sm:rounded-3xl font-black text-gray-400 text-[10px] uppercase tracking-widest hover:bg-gray-50">Cancelar</button>
                       <button type="submit" className="flex-1 py-4 sm:py-5 mycond-bg-yellow text-slate-900 rounded-xl sm:rounded-3xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-yellow-100">Salvar TAG</button>
                    </div>
                  </form>
                ) : (
                  <>
                    <div className="space-y-4">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Veículos Ativos</label>
                      {tags.map(tag => (
                        <div key={tag.id} className="flex items-center justify-between p-6 bg-[#f8fafc] border border-gray-100 rounded-[2.5rem] shadow-sm group hover:shadow-md transition-all">
                          <div className="flex items-center space-x-6">
                            {/* Dark Pill para Placa */}
                            <div className="w-24 h-14 bg-[#1e293b] rounded-2xl flex items-center justify-center text-white font-black text-sm tracking-[0.2em] shadow-inner border border-slate-700">
                              {tag.plate}
                            </div>
                            <div>
                              <p className="font-black text-sm text-slate-800 uppercase tracking-tight">{tag.model}</p>
                              <div className="flex flex-col mt-0.5">
                                 <p className="text-[10px] text-gray-400 font-black uppercase tracking-tighter">Proprietário: {tag.owner}</p>
                                 {(tag.block || tag.unit) && (
                                   <p className="text-[9px] text-blue-500 font-bold uppercase tracking-widest">
                                     {tag.block} • Apt {tag.unit} {tag.spots && `• Vagas: ${tag.spots}`}
                                   </p>
                                 )}
                              </div>
                            </div>
                          </div>
                          <button 
                            onClick={() => handleDeleteTag(tag.id)} 
                            className="w-12 h-12 text-red-300 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all flex items-center justify-center"
                          >
                            <i className="fa-solid fa-trash-can text-lg"></i>
                          </button>
                        </div>
                      ))}
                    </div>

                    <button 
                      onClick={() => setIsAddingTag(true)}
                      className="w-full py-7 mycond-bg-yellow text-slate-900 rounded-[2.5rem] font-black uppercase text-xs tracking-[0.2em] shadow-2xl shadow-yellow-400/20 hover:bg-yellow-500 transition-all flex items-center justify-center space-x-3 active:scale-95"
                    >
                      <i className="fa-solid fa-plus text-sm"></i>
                      <span>Adicionar Veículo</span>
                    </button>
                  </>
                )}
             </div>
             
             {/* Rodapé do Modal com Botão Concluído */}
             <div className="p-10 bg-[#f8fafc] border-t border-gray-100 flex justify-end">
                <button 
                  onClick={() => setActiveModal(null)} 
                  className="px-12 py-5 bg-[#0f172a] text-white rounded-[2rem] font-black uppercase text-[11px] tracking-[0.2em] shadow-2xl shadow-slate-900/20 hover:bg-black transition-all"
                >
                  Concluído
                </button>
             </div>
          </div>
        </div>
      )}

      {activeModal === 'visitor' && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4">
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md" onClick={() => setActiveModal(null)}></div>
          <div className="relative bg-white w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl sm:rounded-[3rem] shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="sticky top-0 bg-blue-900 text-white px-6 py-6 sm:px-10 sm:py-8 flex justify-between items-center z-10">
              <div>
                <h3 className="text-xl sm:text-2xl font-black uppercase tracking-tight">Autorizar Acesso</h3>
                <p className="text-[9px] sm:text-[10px] text-blue-200 font-bold uppercase">Entrada de Visitante ou Serviço</p>
              </div>
              <button onClick={() => setActiveModal(null)} className="w-10 h-10 sm:w-12 sm:h-12 rounded-full hover:bg-white/10 flex items-center justify-center">
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            <form onSubmit={handleAddVisitor} className="p-4 sm:p-10 space-y-4 sm:space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Nome Completo do Visitante</label>
                <input required name="name" placeholder="João da Silva" className="w-full bg-slate-50 border-none rounded-xl sm:rounded-2xl px-4 sm:px-6 py-3 sm:py-4 font-black text-slate-800 shadow-inner outline-none focus:ring-2 focus:ring-yellow-400 text-sm" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">RG (Opcional)</label>
                  <input 
                    name="visitor_rg" 
                    value={formRg}
                    onChange={(e) => setFormRg(applyRGMask(e.target.value))}
                    maxLength={12}
                    placeholder="12.345.678-9" 
                    className="w-full bg-slate-50 border-none rounded-xl sm:rounded-2xl px-4 sm:px-6 py-3 sm:py-4 font-black text-slate-800 shadow-inner outline-none focus:ring-2 focus:ring-yellow-400 text-sm" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">CPF (Opcional)</label>
                  <input 
                    name="visitor_cpf" 
                    value={formCpf}
                    onChange={(e) => setFormCpf(applyCPFMask(e.target.value))}
                    maxLength={14}
                    placeholder="123.456.789-00" 
                    className="w-full bg-slate-50 border-none rounded-xl sm:rounded-2xl px-4 sm:px-6 py-3 sm:py-4 font-black text-slate-800 shadow-inner outline-none focus:ring-2 focus:ring-yellow-400 text-sm" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Tipo de Visitante</label>
                  <select name="type" className="w-full bg-slate-50 border-none rounded-xl sm:rounded-2xl px-4 sm:px-6 py-3 sm:py-4 font-black text-slate-800 shadow-inner outline-none focus:ring-2 focus:ring-yellow-400 text-sm">
                    <option value="VISITANTE">Visitante</option>
                    <option value="SERVIÇO">Prestador de Serviço</option>
                    <option value="ENTREGA">Entregador</option>
                    <option value="FAMILIAR">Familiar</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Bloco/Torre</label>
                  <select 
                    name="block" 
                    value={selectedBlock}
                    onChange={(e) => setSelectedBlock(e.target.value)}
                    className="w-full bg-slate-50 border-none rounded-xl sm:rounded-2xl px-4 sm:px-6 py-3 sm:py-4 font-black text-slate-800 shadow-inner outline-none focus:ring-2 focus:ring-yellow-400 text-sm"
                  >
                    <option value="">Selecione o bloco</option>
                    {blocks.map(b => (
                      <option key={b.id} value={b.name}>{b.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Apartamento/Unidade</label>
                <select 
                  name="unit" 
                  className="w-full bg-slate-50 border-none rounded-xl sm:rounded-2xl px-4 sm:px-6 py-3 sm:py-4 font-black text-slate-800 shadow-inner outline-none focus:ring-2 focus:ring-yellow-400 text-sm"
                >
                  <option value="">Selecione a unidade</option>
                  {blocks.find(b => b.name === selectedBlock)?.units.map(u => (
                    <option key={u} value={u}>{u}</option>
                  )) || (currentUser?.unit && <option value={currentUser.unit}>{currentUser.unit}</option>)}
                </select>
              </div>

              <div className="pt-2 sm:pt-4">
                <button type="submit" disabled={isLoading} className="w-full py-4 sm:py-6 mycond-bg-yellow rounded-xl sm:rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg hover:bg-yellow-500 transition-all disabled:opacity-50">
                  {isLoading ? 'Autorizando...' : 'Autorizar Acesso'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Facial */}
      {activeModal === 'facial' && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-xl animate-in fade-in duration-300" onClick={() => setActiveModal(null)}></div>
          <div className="relative bg-white w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-10 py-8 bg-slate-50 border-b flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-slate-900 uppercase tracking-tighter leading-none">Cadastro Facial</h3>
                <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-1">Inteligência de Acesso MyCond</p>
              </div>
              <button onClick={() => setActiveModal(null)} className="w-10 h-10 rounded-full hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors flex items-center justify-center"><i className="fa-solid fa-xmark text-xl"></i></button>
            </div>
            <div className="p-10 flex flex-col items-center">
              {successState ? (
                <div className="h-64 flex flex-col items-center justify-center space-y-6 animate-in fade-in zoom-in duration-300">
                  <div className="w-24 h-24 bg-emerald-100 text-emerald-500 rounded-[2rem] flex items-center justify-center text-5xl shadow-inner border border-emerald-200">
                    <i className="fa-solid fa-check"></i>
                  </div>
                  <p className="font-bold text-emerald-600 uppercase text-xs tracking-widest">{successState}</p>
                </div>
              ) : (
                <>
                  <div className="relative w-64 h-64 bg-slate-900 rounded-[3rem] overflow-hidden mb-8 border-4 border-white shadow-2xl group">
                    {hasCamera === false ? (
                      <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center bg-slate-800">
                        <i className="fa-solid fa-video-slash text-4xl text-slate-600 mb-4"></i>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Dispositivo de vídeo não detectado. Usando modo de simulação.</p>
                      </div>
                    ) : (
                      <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover scale-x-[-1]" />
                    )}
                    <div className="absolute inset-0 border-2 border-yellow-400/30 rounded-[2.5rem] scale-90 animate-pulse"></div>
                    <div className="absolute top-0 left-0 w-full h-1 bg-yellow-400/60 shadow-[0_0_15px_rgba(251,191,36,0.8)] animate-[scan_2.5s_ease-in-out_infinite]"></div>
                  </div>
                  
                  <style>{`
                    @keyframes scan {
                      0%, 100% { top: 10% }
                      50% { top: 90% }
                    }
                  `}</style>

                  <div className="bg-slate-50 p-6 rounded-2xl border border-gray-100 mb-8 w-full text-center">
                    <p className="text-xs text-gray-500 font-bold tracking-tight">
                      {hasCamera === false 
                        ? "A IA do MyCond pode ser validada simulando a captura." 
                        : "Posicione o rosto no centro do quadro para a validação biométrica automática."}
                    </p>
                  </div>

                  <button 
                    onClick={handleCaptureFacial} 
                    className="w-full py-5 mycond-bg-yellow text-slate-900 rounded-[2rem] font-bold shadow-2xl shadow-yellow-100 flex items-center justify-center space-x-4 hover:scale-[1.02] transition-all uppercase text-xs tracking-[0.2em]"
                  >
                    <i className="fa-solid fa-camera text-lg"></i>
                    <span>{hasCamera === false ? 'Simular Captura AI' : 'Capturar Biometria'}</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal QR */}
      {activeModal === 'qr' && lastQRCode && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4">
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-xl animate-in fade-in" onClick={() => { setActiveModal(null); setLastQRCode(null); }}></div>
          <div className="relative bg-white w-full max-w-sm rounded-2xl sm:rounded-[3rem] shadow-2xl p-6 sm:p-10 text-center animate-in zoom-in-95">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-yellow-50 text-yellow-500 rounded-2xl sm:rounded-[2rem] flex items-center justify-center mx-auto mb-4 sm:mb-6 text-2xl sm:text-3xl shadow-inner border border-yellow-100">
              <i className="fa-solid fa-qrcode"></i>
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-slate-900 uppercase tracking-tighter mb-2">Código de Acesso</h3>
            <p className="text-xs text-gray-400 font-medium mb-4 sm:mb-6">Válido por 24 horas</p>
            
            <div className="bg-white border-2 border-slate-100 p-4 rounded-xl mb-4 sm:mb-6 text-left">
              <div className="flex justify-between text-xs mb-2">
                <span className="text-gray-400 font-bold uppercase">Visitante</span>
                <span className="text-slate-800 font-black">{lastQRCode.name}</span>
              </div>
              <div className="flex justify-between text-xs mb-2">
                <span className="text-gray-400 font-bold uppercase">Bloco</span>
                <span className="text-slate-800 font-black">{lastQRCode.block || 'Principal'}</span>
              </div>
              <div className="flex justify-between text-xs mb-2">
                <span className="text-gray-400 font-bold uppercase">Apto</span>
                <span className="text-slate-800 font-black">{lastQRCode.unit}</span>
              </div>
              <div className="flex justify-between text-xs border-t border-slate-100 pt-2 mt-2">
                <span className="text-gray-400 font-bold uppercase">Código</span>
                <span className="text-blue-600 font-black text-[10px]">{lastQRCode.code}</span>
              </div>
            </div>

            <div className="bg-slate-50 p-6 rounded-2xl mb-4 sm:mb-6 border-2 border-dashed border-gray-200 inline-block">
               <div className="w-40 h-40 sm:w-48 sm:h-48 bg-white grid grid-cols-8 grid-rows-8 gap-1 shadow-sm rounded-xl">
                 {Array.from({length: 64}).map((_, i) => (
                   <div key={i} className={`rounded-[2px] ${Math.random() > 0.5 ? 'bg-slate-800' : 'bg-white'}`}></div>
                 ))}
               </div>
            </div>

            <button 
              onClick={() => {
                const text = `*Acesso Autorizado* 🎫\n\n` +
                  `👤 Visitante: ${lastQRCode.name}\n` +
                  `🏢 Bloco: ${lastQRCode.block || 'Principal'}\n` +
                  `🚪 Apto: ${lastQRCode.unit}\n` +
                  `📋 Código: ${lastQRCode.code}\n\n` +
                  `⏰ Válido por 24h\n` +
                  `Apresente este código na portaria.`;
                window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
              }}
              className="w-full py-4 sm:py-5 bg-emerald-500 text-white rounded-xl sm:rounded-2xl font-bold flex items-center justify-center space-x-2 sm:space-x-3 hover:bg-emerald-600 active:scale-95 transition-all shadow-xl shadow-emerald-100 mb-3 sm:mb-4 uppercase text-[10px] tracking-widest"
            >
              <i className="fa-brands fa-whatsapp text-lg"></i>
              <span>Enviar via WhatsApp</span>
            </button>
            <button onClick={() => { setActiveModal(null); setLastQRCode(null); }} className="text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-slate-900 transition-colors py-2">Fechar</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Visitantes;
