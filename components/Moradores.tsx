
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Resident, CondoBlock } from '../types';
import { supabase } from '../lib/supabase';

const INITIAL_BLOCKS: CondoBlock[] = [
  { id: 'b1', name: 'Unidade 1 (Torre Alpha)', totalUnits: 20, units: ['101', '102', '103', '104', '201', '202', '203', '204', '301', '302', '303', '304', '401', '402', '403', '404', '501', '502', '503', '504'] },
  { id: 'b2', name: 'Unidade 2 (Torre Beta)', totalUnits: 10, units: ['11', '12', '21', '22', '31', '32', '41', '42', '51', '52'] },
];

const INITIAL_RESIDENTS: Resident[] = [
  { id: '1', name: 'Ana Oliveira', blockId: 'b1', unit: '101', email: 'ana@email.com', phone: '(11) 99999-0001', status: 'active', rg: '12.345.678-9', cpf: '123.456.789-00', profession: 'Engenheira Civil', entryDate: '2023-01-15', photoUrl: 'https://i.pravatar.cc/150?u=ana' },
  { id: '2', name: 'João Silva', blockId: 'b1', unit: '202', email: 'joao@email.com', phone: '(11) 99999-0002', status: 'active', rg: '23.456.789-0', cpf: '234.567.890-11', profession: 'Arquiteto', entryDate: '2022-05-20', photoUrl: 'https://i.pravatar.cc/150?u=joao' },
  { id: '3', name: 'Maria Santos', blockId: 'b2', unit: '11', email: 'maria@email.com', phone: '(11) 99999-0003', status: 'active', rg: '34.567.890-1', cpf: '345.678.901-22', profession: 'Advogada', entryDate: '2024-02-10', photoUrl: 'https://i.pravatar.cc/150?u=maria' },
];

const PROFESSIONS = ['Engenheiro(a)', 'Arquiteto(a)', 'Advogado(a)', 'Médico(a)', 'Autônomo(a)', 'Empresário(a)', 'Professor(a)', 'Designer', 'Desenvolvedor(a)', 'Aposentado(a)'];

const Moradores: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'list' | 'map'>('list');
  const [blocks, setBlocks] = useState<CondoBlock[]>(INITIAL_BLOCKS);
  const [residents, setResidents] = useState<Resident[]>([]);
  const [editingBlock, setEditingBlock] = useState<CondoBlock | null>(null);
  const [selectedBlockTransfer, setSelectedBlockTransfer] = useState<string>('b1');

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
          status: r.status || 'active',
          rg: r.rg || '',
          cpf: r.cpf || '',
          profession: r.profession || '',
          entryDate: r.entry_date || '',
          exitDate: r.exit_date || '',
          photoUrl: r.photo_url || 'https://i.pravatar.cc/150?u=' + r.id
        }));
        setResidents(formatted);
      }
    };
    
    fetchResidents();
  }, []);
  
  // Estados de Filtro
  const [filterBlock, setFilterBlock] = useState<string>('ALL');
  const [filterUnit, setFilterUnit] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');

  // Estados de Modais
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);
  const [editingResident, setEditingResident] = useState<Resident | null>(null);
  const [viewingResident, setViewingResident] = useState<Resident | null>(null);
  const [selectedBlockForMap, setSelectedBlockForMap] = useState<CondoBlock | null>(null);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [transferData, setTransferData] = useState<Resident | null>(null);
  
  const [tempPhoto, setTempPhoto] = useState<string | null>(null);
  const [tempDocName, setTempDocName] = useState<string | null>(null);
  
  const photoInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);

  // Estados de Formulário Controlados para Máscaras
  const [formRG, setFormRG] = useState('');
  const [formCPF, setFormCPF] = useState('');
  const [formPhone, setFormPhone] = useState('');

  // Máscaras em tempo real
  const applyRGMask = (v: string) => v.replace(/\D/g, '').replace(/(\d{2})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  const applyCPFMask = (v: string) => v.replace(/\D/g, '').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  const applyPhoneMask = (v: string) => v.replace(/\D/g, '').replace(/^(\d{2})(\d)/g, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2');

  // Lógica de Filtros Hierárquicos
  const filteredResidents = useMemo(() => {
    return residents.filter(res => {
      const matchBlock = filterBlock === 'ALL' || res.blockId === filterBlock;
      const matchUnit = !filterUnit || res.unit.includes(filterUnit);
      const matchSearch = !searchTerm || res.name.toLowerCase().includes(searchTerm.toLowerCase());
      return matchBlock && matchUnit && matchSearch;
    });
  }, [residents, filterBlock, filterUnit, searchTerm]);

  const handleSaveBlock = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get('blockName') as string;
    const start = parseInt(formData.get('startNum') as string);
    const end = parseInt(formData.get('endNum') as string);
    
    const units = [];
    for(let i = start; i <= end; i++) units.push(i.toString());

    const blockId = editingBlock?.id || `b${Date.now()}`;

    try {
      if (editingBlock) {
        // Update existing
        const { error } = await supabase
          .from('condo_blocks')
          .update({ name, total_units: units.length, units })
          .eq('id', editingBlock.id);
        
        if (error) throw error;
        
        setBlocks(prev => prev.map(b => 
          b.id === editingBlock.id 
            ? { ...b, name, totalUnits: units.length, units }
            : b
        ));
        alert(`Torre "${name}" atualizada com ${units.length} apartamentos.`);
      } else {
        // Insert new
        const { error } = await supabase
          .from('condo_blocks')
          .insert({ id: blockId, name, total_units: units.length, units });
        
        if (error) throw error;
        
        const newBlock: CondoBlock = { id: blockId, name, totalUnits: units.length, units };
        setBlocks([...blocks, newBlock]);
        alert(`Torre "${name}" cadastrada com ${units.length} apartamentos.`);
      }
    } catch (err) {
      console.error('Erro:', err);
      // Fallback local
      if (editingBlock) {
        setBlocks(prev => prev.map(b => b.id === editingBlock.id ? { ...b, name, totalUnits: units.length, units } : b));
      } else {
        const newBlock: CondoBlock = { id: blockId, name, totalUnits: units.length, units };
        setBlocks([...blocks, newBlock]);
      }
    }
    
    setIsBlockModalOpen(false);
    setEditingBlock(null);
  };

  const handleSaveResident = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const name = formData.get('name') as string;
    const unit = formData.get('unit') as string;

    try {
      if (!editingResident) {
        // Fluxo Novo Morador (Convite via Edge Function)
        // Isso não vai deslogar o Admin!
        const { data: edgeData, error: edgeError } = await supabase.functions.invoke('invite_resident', {
          body: { email, name, unit }
        });

        if (edgeError) throw new Error(edgeError.message || 'Erro ao chamar a Edge Function');
        
        // NOVO CÓDIGO: Verifica se a Edge Function retornou erro mascarado no data 
        // (ela agora retorna 200 para não quebrar a tela, porém envia success: false com o texto real do erro)
        if (edgeData && edgeData.success === false) {
           throw new Error(edgeData.error || 'Erro desconhecido ao tentar convidar.');
        }
        
        alert('Convite enviado com sucesso! O morador receberá um e-mail para definir a senha e preencher o restante do perfil.');
      } else {
        // Lógica de Edição de Morador Existente pelo Admin
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            name,
            unit,
            phone: formPhone,
            rg: formRG,
            cpf: formCPF,
            profession: formData.get('profession') as string,
            photo_url: tempPhoto,
          })
          .eq('id', editingResident.id);

        if (profileError) throw profileError;
        alert('Cadastro do morador atualizado!');
      }
      closeModal();
      
      // Pequeno recarregamento para mostrar na tela
      window.location.reload();
    } catch (error: any) {
      console.error('Erro ao salvar morador:', error);
      alert('Erro ao salvar morador: ' + error.message);
    }
  };

  const handleEditResident = (res: Resident) => {
    setEditingResident(res);
    setFormRG(res.rg || '');
    setFormCPF(res.cpf || '');
    setFormPhone(res.phone || '');
    setTempPhoto(res.photoUrl || null);
    setIsModalOpen(true);
    setActiveMenu(null);
  };

  const handleDeleteResident = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja remover este morador?\n\nEle sai do app mas os dados ficam salvos para relatórios.')) return;
    
    setActiveMenu(null);
    
    // Soft delete - mantém no banco mas marca como inativo
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          status: 'inactive',
          exit_date: new Date().toISOString().split('T')[0]
        })
        .eq('id', id);

      if (error) throw error;
      
      setResidents(prev => prev.map(r => 
        r.id === id ? { ...r, status: 'inactive' as const } : r
      ));
      
      alert('Morador removido. Dados salvos para histórico.');
    } catch (err) {
      console.error('Erro ao remover:', err);
      // Fallback local se banco não responder
      setResidents(prev => prev.map(r => 
        r.id === id ? { ...r, status: 'inactive' as const } : r
      ));
      alert('Morador removido (modo offline).');
    }
  };

  const handleTransferResident = async (resident: Resident) => {
    const newBlockId = selectedBlockTransfer;
    const newUnit = (document.getElementById('newUnit') as HTMLInputElement)?.value;
    
    if (!newBlockId || !newUnit) {
      alert('Selecione a nova unidade');
      return;
    }
    
    // Verifica se a unidade já está ocupada
    const occupied = residents.find(r => r.blockId === newBlockId && r.unit === newUnit && r.status === 'active');
    if (occupied) {
      alert('Esta unidade já está ocupada por ' + occupied.name);
      return;
    }

    try {
      // Atualiza a torre e unidade - salva no formato "bloco-unidade"
      const newUnitFull = newBlockId + '-' + newUnit;
      
      const { error: error1 } = await supabase
        .from('profiles')
        .update({ 
          block_id: newBlockId,
          unit: newUnitFull
        })
        .eq('id', resident.id);

      if (error1) {
        console.error('Erro ao transferir:', error1);
        alert('Erro ao transferir: ' + error1.message);
        return;
      }

      // Transfere vagas do morador
      await supabase
        .from('vehicle_tags')
        .update({ unit: newUnit })
        .eq('resident_id', resident.id);

      const newBlockName = blocks.find(b => b.id === newBlockId)?.name || newBlockId;
      alert('Morador transferido para ' + newBlockName + ' - Apto ' + newUnit);
      setTransferData(null);
      
      // Recarrega lista
      window.location.reload();
      
    } catch (err) {
      console.error('Erro:', err);
      alert('Erro ao transferir morador');
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingResident(null);
    setTempPhoto(null);
    setFormRG(''); setFormCPF(''); setFormPhone('');
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setTempPhoto(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleDocUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setTempDocName(file.name);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tighter uppercase">Moradores e Unidades</h2>
          <p className="text-sm text-gray-500 font-medium">Gestão da planta do condomínio e base de dados de residentes.</p>
        </div>
        <div className="flex gap-3">
          <div className="relative group">
            <button className="bg-white border border-slate-200 text-slate-500 px-6 py-2.5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-sm hover:bg-slate-50 transition-all">
              <i className="fa-solid fa-building mr-2"></i> EDITAR TORRES
            </button>
            <div className="absolute right-0 top-full mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 p-2 z-50 hidden group-hover:block min-w-48">
              {blocks.map(block => (
                <button
                  key={block.id}
                  onClick={() => { setEditingBlock(block); setIsBlockModalOpen(true); }}
                  className="w-full px-4 py-3 text-left text-xs font-black uppercase text-slate-600 hover:bg-slate-50 rounded-xl"
                >
                  <i className="fa-solid fa-pen mr-2 text-yellow-500"></i>
                  {block.name} ({block.totalUnits} unidades)
                </button>
              ))}
              <button
                onClick={() => { setEditingBlock(null); setIsBlockModalOpen(true); }}
                className="w-full px-4 py-3 text-left text-xs font-black uppercase text-blue-600 hover:bg-blue-50 rounded-xl border-t"
              >
                <i className="fa-solid fa-plus mr-2"></i>
                Nova Torre
              </button>
            </div>
          </div>
<button 
            onClick={() => { setEditingBlock(null); setIsBlockModalOpen(true); }}
            className="bg-white border border-slate-200 text-slate-900 px-6 py-2.5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-sm hover:bg-slate-50 transition-all"
          >
            + NOVA UNIDADE / BLOCO
          </button>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="mycond-bg-yellow text-slate-900 px-6 py-2.5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-yellow-500 transition-all active:scale-95"
          >
            + NOVO MORADOR
          </button>
        </div>
      </header>

      {/* Navegação entre Visões */}
      <div className="flex space-x-6 border-b border-gray-200">
        <button onClick={() => setActiveTab('list')} className={`pb-4 px-2 text-xs font-black uppercase tracking-widest transition-all relative ${activeTab === 'list' ? 'text-slate-900' : 'text-gray-400'}`}>
          Lista de Moradores
          {activeTab === 'list' && <div className="absolute bottom-0 left-0 w-full h-1 mycond-bg-yellow rounded-t-full"></div>}
        </button>
        <button onClick={() => { setActiveTab('map'); setSelectedBlockForMap(null); }} className={`pb-4 px-2 text-xs font-black uppercase tracking-widest transition-all relative ${activeTab === 'map' ? 'text-slate-900' : 'text-gray-400'}`}>
          Mapa de Ocupação
          {activeTab === 'map' && <div className="absolute bottom-0 left-0 w-full h-1 mycond-bg-yellow rounded-t-full"></div>}
        </button>
      </div>

      {activeTab === 'list' ? (
        <>
          {/* Filtros Avançados */}
          <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="relative">
                <i className="fa-solid fa-magnifying-glass absolute left-6 top-1/2 -translate-y-1/2 text-gray-300"></i>
                <input type="text" placeholder="Nome do morador..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-slate-50 border-none rounded-2xl pl-14 pr-6 py-4 font-bold text-slate-700 outline-none shadow-inner" />
              </div>
              <div className="flex flex-col">
                <select value={filterBlock} onChange={(e) => { setFilterBlock(e.target.value); setFilterUnit(''); }} className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 font-black text-slate-700 shadow-inner appearance-none">
                  <option value="ALL">Todos os Blocos</option>
                  {blocks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <div className="flex flex-col">
                <input type="text" placeholder="Nº Apartamento" value={filterUnit} onChange={(e) => setFilterUnit(e.target.value)} className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 font-black text-slate-700 shadow-inner" />
              </div>
            </div>
          </div>

          {/* Listagem com Menu de Ações Corrigido */}
          <div className="bg-white rounded-[3rem] shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50/50 border-b border-gray-100 font-black text-[10px] text-gray-400 uppercase tracking-widest">
                    <th className="px-10 py-6">Morador</th>
                    <th className="px-6 py-6">Unidade / Bloco</th>
                    <th className="px-6 py-6">Contato</th>
                    <th className="px-6 py-6 text-center">Status</th>
                    <th className="px-10 py-6 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredResidents.map(res => (
                    <tr key={res.id} className="hover:bg-slate-50 transition-all group">
                      <td className="px-10 py-6">
                        <div className="flex items-center space-x-4">
                          <img src={res.photoUrl} className="w-12 h-12 rounded-2xl object-cover border border-slate-100 shadow-inner" />
                          <div><p className="font-black text-slate-800 text-xs uppercase">{res.name}</p><p className="text-[9px] text-gray-400 font-bold uppercase">{res.profession}</p></div>
                        </div>
                      </td>
                      <td className="px-6 py-6">
                        <p className="text-xs font-black text-slate-800">UNIDADE {res.unit}</p>
                        <p className="text-[9px] text-gray-400 font-black uppercase">
                          {res.block_id ? (
                            blocks.find(b => b.id === res.block_id)?.name || res.block_id
                          ) : res.blockId || 'Sem Bloco'}
                        </p>
                      </td>
                      <td className="px-6 py-6">
                        <p className="text-xs font-bold text-slate-600">{res.email}</p>
                        <p className="text-[10px] text-gray-400 font-black">{res.phone}</p>
                      </td>
                      <td className="px-6 py-6 text-center">
                        <span className="px-4 py-1.5 bg-emerald-50 text-emerald-600 rounded-full text-[9px] font-black uppercase border border-emerald-100">Regularizado</span>
                      </td>
                      <td className="px-10 py-6 text-right relative overflow-visible">
                        <button 
                          onClick={() => setActiveMenu(activeMenu === res.id ? null : res.id)} 
                          className="w-10 h-10 bg-white border border-slate-200 text-slate-400 hover:bg-slate-900 hover:text-white rounded-xl shadow-sm transition-all active:scale-90"
                        >
                          <i className="fa-solid fa-ellipsis"></i>
                        </button>
                        {/* MENU FLUTUANTE DE AÇÕES */}
                        {activeMenu === res.id && (
                          <div className="absolute right-10 top-16 bg-white rounded-2xl shadow-2xl border border-gray-100 p-2 z-[50] w-52 flex flex-col animate-in zoom-in-95">
                            <button onClick={() => { setViewingResident(res); setActiveMenu(null); }} className="px-4 py-2.5 text-left text-[10px] font-black uppercase text-slate-600 hover:bg-slate-50 rounded-xl transition-colors flex items-center">
                              <i className="fa-solid fa-eye mr-2 text-blue-400"></i> Visualizar Ficha
                            </button>
                            <button onClick={() => handleEditResident(res)} className="px-4 py-2.5 text-left text-[10px] font-black uppercase text-slate-600 hover:bg-slate-50 rounded-xl transition-colors flex items-center">
                              <i className="fa-solid fa-pen mr-2 text-yellow-500"></i> Editar Dados
                            </button>
                            <button onClick={() => { setTransferData(res); setActiveMenu(null); }} className="px-4 py-2.5 text-left text-[10px] font-black uppercase text-blue-600 hover:bg-blue-50 rounded-xl transition-colors flex items-center">
                              <i className="fa-solid fa-right-left mr-2"></i> Transferir
                            </button>
                            <button onClick={() => handleDeleteResident(res.id)} className="px-4 py-2.5 text-left text-[10px] font-black uppercase text-red-500 hover:bg-red-50 rounded-xl transition-colors flex items-center">
                              <i className="fa-solid fa-trash-can mr-2"></i> Remover
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        /* VISÃO DE MAPA (SEM ALTERAÇÕES) */
        <div className="space-y-8 animate-in slide-in-from-bottom-4">
          {!selectedBlockForMap ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {blocks.map(block => {
                const occupiedCount = residents.filter(r => r.blockId === block.id).length;
                return (
                  <div key={block.id} onClick={() => setSelectedBlockForMap(block)} className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm hover:shadow-2xl hover:border-yellow-200 transition-all cursor-pointer group">
                    <div className="w-16 h-16 mycond-bg-blue text-white rounded-3xl flex items-center justify-center text-2xl mb-6 shadow-xl group-hover:bg-yellow-400 group-hover:text-slate-900 transition-all">
                      <i className="fa-solid fa-building"></i>
                    </div>
                    <h4 className="text-xl font-black text-slate-800 uppercase tracking-tighter">{block.name}</h4>
                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-1">{block.totalUnits} Apartamentos</p>
                    <div className="mt-8 flex items-center justify-between">
                       <div className="flex -space-x-3">
                         {residents.filter(r => r.blockId === block.id).slice(0, 3).map(r => (
                           <img key={r.id} src={r.photoUrl} className="w-10 h-10 rounded-full border-2 border-white object-cover" />
                         ))}
                         {occupiedCount > 3 && <div className="w-10 h-10 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-[10px] font-black text-slate-400">+{occupiedCount - 3}</div>}
                       </div>
                       <span className="text-[10px] font-black text-emerald-500 uppercase">{occupiedCount} Ocupados</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="space-y-6">
              <button onClick={() => setSelectedBlockForMap(null)} className="flex items-center space-x-2 text-slate-400 hover:text-slate-900 transition-colors font-black uppercase text-[10px] tracking-widest">
                <i className="fa-solid fa-arrow-left"></i> <span>Voltar para Blocos</span>
              </button>
              <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm">
                <div className="flex justify-between items-center mb-10">
                   <h3 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">{selectedBlockForMap.name}</h3>
                   <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2"><div className="w-3 h-3 bg-emerald-500 rounded-full"></div><span className="text-[9px] font-black uppercase text-gray-400">Ocupado</span></div>
                      <div className="flex items-center space-x-2"><div className="w-3 h-3 bg-slate-200 rounded-full"></div><span className="text-[9px] font-black uppercase text-gray-400">Vago</span></div>
                   </div>
                </div>
                <div className="grid grid-cols-4 md:grid-cols-8 lg:grid-cols-10 gap-4">
                  {selectedBlockForMap.units.map(u => {
                    const resident = residents.find(r => r.blockId === selectedBlockForMap.id && r.unit === u);
                    return (
                      <div 
                        key={u} 
                        onClick={() => resident ? setViewingResident(resident) : alert('Unidade Vaga. Cadastre um morador nesta unidade.')}
                        className={`aspect-square rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all border-2 ${resident ? 'bg-emerald-50 border-emerald-100 text-emerald-600 hover:bg-emerald-100 shadow-emerald-100/50' : 'bg-slate-50 border-slate-100 text-slate-400 hover:bg-white hover:border-yellow-400'}`}
                      >
                         <span className="text-[11px] font-black">{u}</span>
                         <i className={`fa-solid ${resident ? 'fa-user-check' : 'fa-door-open'} text-[10px] mt-1`}></i>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL TRANSFERÊNCIA */}
      {transferData && (() => {
        const occupiedByOther = residents
          .filter(r => r.status === 'active' && r.id !== transferData.id)
          .map(r => r.unit);
        
        const currentBlockUnits = blocks.find(b => b.id === selectedBlockTransfer)?.units || [];
        const availableUnits = currentBlockUnits.filter(u => !occupiedByOther.includes(u));
        
        return (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md" onClick={() => setTransferData(null)}></div>
            <div className="relative bg-white w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95">
              <div className="px-10 py-8 mycond-bg-blue text-white flex justify-between items-center">
                <div>
                  <h3 className="text-2xl font-black uppercase tracking-tighter">Transferir Morador</h3>
                  <p className="text-[10px] text-blue-200 font-bold uppercase">{transferData.name}</p>
                </div>
                <button onClick={() => setTransferData(null)} className="w-12 h-12 rounded-full hover:bg-white/10 flex items-center justify-center"><i className="fa-solid fa-xmark"></i></button>
              </div>
              <div className="p-10 space-y-6">
                <div className="bg-slate-50 p-6 rounded-2xl space-y-2">
                  <p className="text-[10px] text-gray-400 font-black uppercase">Unidade Atual</p>
                  <p className="font-black text-slate-800">{blocks.find(b => b.id === transferData.blockId)?.name || transferData.blockId} - Apto {transferData.unit}</p>
                </div>
                
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Selecione a Nova Torre</label>
                  <select 
                    id="newBlock" 
                    className="bg-slate-50 border-none rounded-2xl px-6 py-4 font-black text-slate-800 shadow-inner"
                    onChange={(e) => setSelectedBlockTransfer(e.target.value)}
                    defaultValue={selectedBlockTransfer}
                  >
                    {blocks.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Número do Apartamento</label>
                  <input 
                    id="newUnit" 
                    list={`units-${selectedBlockTransfer}`}
                    className="bg-slate-50 border-none rounded-2xl px-6 py-4 font-black text-slate-800 shadow-inner"
                    placeholder="Selecione ou digite"
                  />
                  <datalist id={`units-${selectedBlockTransfer}`}>
                    {[...(new Set(blocks.find(b => b.id === selectedBlockTransfer)?.units || []))].map(u => (
                      <option key={u} value={u} />
                    ))}
                  </datalist>
                </div>

                <div className="bg-yellow-50 p-4 rounded-2xl border border-yellow-100">
                  <p className="text-[10px] text-yellow-700 font-bold">
                    <i className="fa-solid fa-triangle-exclamation mr-1"></i>
                    O morador atual será <span className="uppercase">removido</span> e um novo cadastro será criado na nova unidade.
                  </p>
                </div>

                <button 
                  type="button"
                  onClick={() => handleTransferResident(transferData)}
                  className="w-full py-6 mycond-bg-blue text-white rounded-3xl font-black uppercase text-xs tracking-widest shadow-xl hover:bg-slate-800 transition-all"
                >
                  Confirmar Transferência
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* MODAL BLOCO (SEM ALTERAÇÕES) */}
      {isBlockModalOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md" onClick={() => setIsBlockModalOpen(false)}></div>
          <div className="relative bg-white w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="px-10 py-8 mycond-bg-blue text-white flex justify-between items-center">
              <div><h3 className="text-2xl font-black uppercase tracking-tighter">Configurar Unidade</h3><p className="text-[10px] text-blue-200 font-bold uppercase">Arquitetura do Condomínio</p></div>
              <button onClick={() => setIsBlockModalOpen(false)} className="w-12 h-12 rounded-full hover:bg-white/10 flex items-center justify-center"><i className="fa-solid fa-xmark"></i></button>
            </div>
            <form onSubmit={handleSaveBlock} className="p-10 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Nome do Bloco / Torre</label>
                <input required name="blockName" defaultValue={editingBlock?.name} className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 font-black text-slate-800 shadow-inner" placeholder="Ex: Torre 1 - Alpha" />
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Apartamento Inicial</label>
                  <input required name="startNum" type="number" defaultValue={editingBlock?.units[0] || '101'} className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 font-black text-slate-800 shadow-inner" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Apartamento Final</label>
                  <input required name="endNum" type="number" className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 font-black text-slate-800 shadow-inner" defaultValue="120" />
                </div>
              </div>
              <button type="submit" className="w-full py-6 mycond-bg-yellow rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl">Cadastrar Bloco</button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL MORADOR (COM LÓGICA DE EDIÇÃO) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md" onClick={closeModal}></div>
          <div className="relative bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="px-10 py-8 mycond-bg-blue text-white flex justify-between items-center">
               <div><h3 className="text-2xl font-black uppercase tracking-tighter">{editingResident ? 'Editar Morador' : 'Novo Morador'}</h3><p className="text-[10px] text-blue-200 font-bold uppercase tracking-widest">Ficha Cadastral Central</p></div>
               <button onClick={closeModal} className="w-12 h-12 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors"><i className="fa-solid fa-xmark text-xl"></i></button>
            </div>
            <form onSubmit={handleSaveResident} className="p-10 space-y-6 max-h-[75vh] overflow-y-auto scrollbar-hide">
              {editingResident && (
                <div className="flex flex-col items-center mb-4">
                  <div 
                    onClick={() => photoInputRef.current?.click()}
                    className="w-24 h-24 bg-slate-50 border-4 border-dashed border-gray-100 rounded-[2rem] flex items-center justify-center overflow-hidden cursor-pointer hover:border-yellow-400 transition-all group shadow-inner"
                  >
                    {tempPhoto ? (
                      <img src={tempPhoto} className="w-full h-full object-cover" alt="Preview" />
                    ) : (
                      <div className="text-center">
                        <i className="fa-solid fa-camera text-gray-300 text-xl mb-1 group-hover:scale-110 transition-transform"></i>
                        <p className="text-[8px] font-black text-gray-400 uppercase">Subir Foto</p>
                      </div>
                    )}
                  </div>
                  <input type="file" ref={photoInputRef} onChange={handlePhotoUpload} className="hidden" accept="image/*" />
                </div>
              )}

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">E-mail (Convite)</label>
                  <input required name="email" type="email" defaultValue={editingResident?.email} readOnly={!!editingResident} className={`w-full border-none rounded-2xl px-6 py-4 font-black text-slate-800 shadow-inner ${editingResident ? 'bg-slate-200 cursor-not-allowed opacity-70' : 'bg-slate-50'}`} placeholder="Ex: morador@email.com" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Nº Unidade</label>
                  <input required name="unit" defaultValue={editingResident?.unit} className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 font-black text-slate-800 shadow-inner" placeholder="Ex: 101" />
                </div>
              </div>

              <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{editingResident ? 'Nome Completo' : 'Responsável pela Unidade'}</label>
                  <input required name="name" defaultValue={editingResident?.name} className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 font-black text-slate-800 shadow-inner" placeholder="Nome Completo do Primeiro Morador" />
              </div>

              {/* CAMPOS RESTRITOS A EDIÇÃO (PREENCHIMENTO INICIAL APENAS NOME E UNIDADE E EMAIL) */}
              {editingResident && (
                <>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">RG</label>
                      <input 
                        name="rg" 
                        value={formRG} 
                        onChange={(e) => setFormRG(applyRGMask(e.target.value))} 
                        className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 font-black text-slate-800 shadow-inner" 
                        maxLength={12} 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">CPF</label>
                      <input 
                        name="cpf" 
                        value={formCPF} 
                        onChange={(e) => setFormCPF(applyCPFMask(e.target.value))} 
                        className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 font-black text-slate-800 shadow-inner" 
                        maxLength={14} 
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Profissão</label>
                      <input name="profession" list="prof-list" defaultValue={editingResident?.profession} className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 font-black text-slate-800 shadow-inner" />
                      <datalist id="prof-list">{PROFESSIONS.map(p => <option key={p} value={p} />)}</datalist>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Telefone</label>
                      <input 
                        name="phone" 
                        value={formPhone} 
                        onChange={(e) => setFormPhone(applyPhoneMask(e.target.value))} 
                        className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 font-black text-slate-800 shadow-inner" 
                        maxLength={15} 
                      />
                    </div>
                  </div>

                  <div className="space-y-2 pt-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Anexar Contrato (Opcional)</label>
                    <div onClick={() => docInputRef.current?.click()} className="w-full py-8 border-2 border-dashed border-slate-100 rounded-[2rem] flex flex-col items-center justify-center text-gray-300 hover:bg-slate-50 cursor-pointer group">
                      <i className="fa-solid fa-file-contract text-2xl mb-1 group-hover:scale-110 transition-transform"></i>
                      <span className="text-[9px] font-black uppercase text-center px-4">{tempDocName || 'Clique para anexar arquivo (PDF/DOC)'}</span>
                    </div>
                    <input type="file" ref={docInputRef} onChange={handleDocUpload} className="hidden" accept=".pdf,.doc,.docx" />
                  </div>
                </>
              )}

              <button type="submit" className="w-full py-6 mycond-bg-yellow rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl">
                {editingResident ? 'Salvar Alterações' : 'Finalizar Cadastro'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL FICHA (SEM ALTERAÇÕES) */}
      {viewingResident && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-xl animate-in fade-in" onClick={() => setViewingResident(null)}></div>
          <div className="relative bg-white w-full max-w-2xl rounded-[4rem] shadow-2xl p-10 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto scrollbar-hide">
             <div className="text-center mb-10">
                <div className="w-28 h-28 rounded-[2.5rem] overflow-hidden border-4 border-slate-50 shadow-xl mx-auto mb-6">
                   <img src={viewingResident.photoUrl} className="w-full h-full object-cover" alt={viewingResident.name} />
                </div>
                <h3 className="text-3xl font-black text-slate-900 uppercase tracking-tighter leading-tight">{viewingResident.name}</h3>
                <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.3em] mt-2">DADOS DO RESIDENTE VERIFICADOS</p>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                <div className="p-8 bg-slate-50 rounded-[2.5rem] space-y-4 shadow-inner">
                   <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b pb-2">Informações Pessoais</p>
                   <div className="flex justify-between"><span className="text-[9px] font-black text-gray-400 uppercase">RG</span><span className="text-[11px] font-black text-slate-800">{viewingResident.rg || 'Não informado'}</span></div>
                   <div className="flex justify-between"><span className="text-[9px] font-black text-gray-400 uppercase">CPF</span><span className="text-[11px] font-black text-slate-800">{viewingResident.cpf || 'Não informado'}</span></div>
                   <div className="flex justify-between"><span className="text-[9px] font-black text-gray-400 uppercase">Profissão</span><span className="text-[11px] font-black text-slate-800 uppercase">{viewingResident.profession || 'N/I'}</span></div>
                </div>
                <div className="p-8 bg-slate-50 rounded-[2.5rem] space-y-4 shadow-inner">
                   <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b pb-2">Unidade e Contrato</p>
                   <div className="flex justify-between"><span className="text-[9px] font-black text-gray-400 uppercase">Unidade</span><span className="text-[11px] font-black text-slate-800 uppercase">{viewingResident.unit}</span></div>
                   <div className="flex justify-between"><span className="text-[9px] font-black text-gray-400 uppercase">Entrada</span><span className="text-[11px] font-black text-slate-800">{viewingResident.entryDate?.split('-').reverse().join('/') || '--/--/----'}</span></div>
                   <div className="flex justify-between"><span className="text-[9px] font-black text-gray-400 uppercase">Vencimentos</span><span className="text-[11px] font-black text-emerald-500 uppercase">EM DIA</span></div>
                </div>
             </div>
             <div className="flex gap-4">
                <button onClick={() => setViewingResident(null)} className="flex-1 py-7 bg-slate-100 text-slate-500 rounded-[2.5rem] font-black uppercase text-xs tracking-widest hover:bg-slate-200 transition-all">FECHAR</button>
                <button onClick={() => alert('Abrindo contrato digital em ambiente seguro...')} className="flex-[2] py-7 mycond-bg-blue text-white rounded-[2.5rem] font-black uppercase text-xs tracking-[0.2em] shadow-2xl flex items-center justify-center space-x-3 hover:bg-slate-800 active:scale-95 transition-all">
                   <i className="fa-solid fa-file-contract"></i><span>VER CONTRATO / LEASE</span>
                </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Moradores;
