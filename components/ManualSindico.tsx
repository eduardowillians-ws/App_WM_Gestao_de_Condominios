import React, { useState, useMemo, useRef, useEffect } from 'react';
import { MANUAL_CATEGORIES } from '../constants';
import { ManualCategory, ImprovementIdea, ToolAsset, TechnicalItem, View, AssetLog } from '../types';
import { supabase } from '../lib/supabase';
import { compressImage } from '../lib/utils';

interface ManualSindicoProps {
  onNavigate: (view: View) => void;
  isAdmin?: boolean;
  currentUser?: { name: string; role: string } | null;
}

interface DbFerramenta {
  id: string;
  code: string;
  name: string;
  status: string;
  status_reason: string | null;
  last_update: string;
  category: string;
  location: string | null;
  quantity: number;
  unit_label: string;
}

interface DbFerramentaLog {
  id: string;
  ferramenta_id: string;
  user_name: string;
  action: string;
  date: string;
  quantity_affected: number;
  notes: string | null;
}

const ManualSindico: React.FC<ManualSindicoProps> = ({ onNavigate, isAdmin = true, currentUser: userFromProps }) => {
  const currentUser = userFromProps;
  console.log('ManualSindico isAdmin:', isAdmin);
  const [activeTab, setActiveTab] = useState<'technical' | 'improvements' | 'tools'>('tools');
  const [loading, setLoading] = useState(true);
  
  // --- ESTADOS TÉCNICOS ---
  const [categories, setCategories] = useState<ManualCategory[]>(MANUAL_CATEGORIES);
  const [selectedCategory, setSelectedCategory] = useState<ManualCategory | null>(null);
  const [editingCategory, setEditingCategory] = useState<ManualCategory | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<ManualCategory | null>(null);

  // --- ESTADOS MELHORIAS ---
  const [improvements, setImprovements] = useState<ImprovementIdea[]>([
    { id: '1', title: 'Energia Solar nas Áreas Comuns', category: 'Sustentabilidade', image: 'https://images.unsplash.com/photo-1509391366360-fe5bb58583bb?auto=format&fit=crop&w=600&q=80', description: 'Instalação de painéis fotovoltaicos para reduzir a taxa de condomínio em 30%.', likes: 24, dislikes: 2, status: 'voting', manager: 'Eduardo (Admin)', requestDate: '2026-01-10', estimatedCost: 45000 },
    { id: '2', title: 'Revitalização do Playground', category: 'Infraestrutura', image: 'https://images.unsplash.com/photo-1594918738302-36940d99d123?auto=format&fit=crop&w=600&q=80', description: 'Troca de brinquedos antigos por materiais sustentáveis.', likes: 15, dislikes: 8, status: 'planning', manager: 'Eduardo (Admin)', requestDate: '2026-02-05', estimatedCost: 12000 },
    { id: '3', title: 'Pintura Fachada Norte', category: 'Pintura', image: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&w=600&q=80', description: 'Pintura externa completa.', likes: 45, dislikes: 1, status: 'completed', manager: 'Rodrigo (Ex-Síndico)', requestDate: '2024-05-15', implementationDate: '2024-10-20', estimatedCost: 35000, realCost: 38500, totalVotes: 52 },
    { id: '4', title: 'Reforma do Hall Social', category: 'Estética', image: 'https://images.unsplash.com/photo-1517581177682-a085bb7ffb15?auto=format&fit=crop&w=600&q=80', description: 'Modernização da iluminação e mobiliário do hall principal.', likes: 8, dislikes: 12, status: 'completed', manager: 'Eduardo (Admin)', requestDate: '2025-11-01', implementationDate: '2026-02-04', estimatedCost: 15000, realCost: 14800, totalVotes: 20 }
  ]);
  const [improvementCategories] = useState(['Infraestrutura', 'Estética', 'Pintura', 'Sustentabilidade', 'Segurança']);
  const [improvementFilter, setImprovementFilter] = useState<'all' | 'approved' | 'rejected'>('all');
  const [userVotes, setUserVotes] = useState<Record<string, 'like' | 'dislike'>>({});
  const [loadingImprovements, setLoadingImprovements] = useState(false);

  const [viewingIdea, setViewingIdea] = useState<ImprovementIdea | null>(null);
  const [editingIdea, setEditingIdea] = useState<ImprovementIdea | null>(null);
  const [isConcludeProjectModalOpen, setIsConcludeProjectModalOpen] = useState<ImprovementIdea | null>(null);
  const [concludeData, setConcludeData] = useState({ implementationDate: '', realCost: '', notes: '', status: 'completed' });

  const fetchMelhorias = async () => {
    try {
      setLoadingImprovements(true);
      const { data, error } = await supabase
        .from('melhorias')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar melhorias:', error);
        return;
      }

      const melhoriasDb = (data || []).map((m: any) => ({
        id: m.id,
        title: m.title,
        category: m.category,
        image: m.image_url,
        description: m.description,
        likes: m.likes,
        dislikes: m.dislikes,
        status: m.status,
        manager: m.manager,
        requestDate: m.request_date,
        estimatedCost: m.estimated_cost,
        implementationDate: m.implementation_date,
        realCost: m.real_cost,
        totalVotes: m.total_votes
      }));

      const localImprovements = improvements.filter(i => !i.id.includes('-'));
      setImprovements([...localImprovements, ...melhoriasDb]);

      const savedVotes = localStorage.getItem('userVotes');
      if (savedVotes) {
        setUserVotes(JSON.parse(savedVotes));
      }
    } catch (err) {
      console.error('Erro:', err);
    } finally {
      setLoadingImprovements(false);
    }
  };

  const handleVote = async (ideaId: string, voteType: 'like' | 'dislike') => {
    const currentVote = userVotes[ideaId];
    
    if (currentVote === voteType) {
      const newVotes = { ...userVotes };
      delete newVotes[ideaId];
      setUserVotes(newVotes);
      localStorage.setItem('userVotes', JSON.stringify(newVotes));
      
      setImprovements(prev => prev.map(i => {
        if (i.id === ideaId) {
          return {
            ...i,
            likes: voteType === 'like' ? Math.max(0, i.likes - 1) : i.likes,
            dislikes: voteType === 'dislike' ? Math.max(0, i.dislikes - 1) : i.dislikes
          };
        }
        return i;
      }));
      
      if (ideaId.startsWith('local-')) return;
      const itemToRemove = improvements.find(i => i.id === ideaId);
      if (itemToRemove) {
        await supabase.from('melhorias').update({
          likes: itemToRemove.likes,
          dislikes: itemToRemove.dislikes
        }).eq('id', ideaId);
      }
      return;
    }

    const newVotes = { ...userVotes, [ideaId]: voteType };
    setUserVotes(newVotes);
    localStorage.setItem('userVotes', JSON.stringify(newVotes));

    const oldVote = currentVote;
    const updatedImprovements = improvements.map(i => {
      if (i.id === ideaId) {
        let newLikes = i.likes;
        let newDislikes = i.dislikes;
        
        if (oldVote === 'like') newLikes--;
        if (oldVote === 'dislike') newDislikes--;
        if (voteType === 'like') newLikes++;
        if (voteType === 'dislike') newDislikes++;
        
        return { ...i, likes: Math.max(0, newLikes), dislikes: Math.max(0, newDislikes) };
      }
      return i;
    });
    setImprovements(updatedImprovements);

    const isLocal = ideaId.startsWith('local-');
    if (isLocal) return;
    
    const itemToSave = updatedImprovements.find(i => i.id === ideaId);
    if (itemToSave) {
      await supabase
        .from('melhorias')
        .update({
          likes: itemToSave.likes,
          dislikes: itemToSave.dislikes
        })
        .eq('id', ideaId);
    }
  };

  const handleConcludeProject = async () => {
    if (!isConcludeProjectModalOpen) return;
    
    const status = concludeData.status;

    setImprovements(prev => prev.map(i => {
      if (i.id === isConcludeProjectModalOpen.id) {
        return {
          ...i,
          status,
          implementationDate: concludeData.implementationDate,
          realCost: parseFloat(concludeData.realCost) || 0,
          manager: currentUser?.name || 'Admin'
        };
      }
      return i;
    }));

    if (!isConcludeProjectModalOpen.id.startsWith('local-')) {
      await supabase
        .from('melhorias')
        .update({
          status,
          implementation_date: concludeData.implementationDate,
          real_cost: parseFloat(concludeData.realCost) || 0,
          manager: currentUser?.name || 'Admin'
        })
        .eq('id', isConcludeProjectModalOpen.id);
    }

    setIsConcludeProjectModalOpen(null);
    setConcludeData({ implementationDate: '', realCost: '', notes: '', status: 'completed' });
    alert(`Projeto ${status === 'completed' ? 'aprovado!' : 'reprovado!'}`);
  };

  const handleEditIdea = async () => {
    if (!editingIdea) return;

    setImprovements(prev => prev.map(i => {
      if (i.id === editingIdea.id) {
        return { ...editingIdea, manager: currentUser?.name || 'Admin' };
      }
      return i;
    }));

    if (!editingIdea.id.includes('-')) {
      await supabase
        .from('melhorias')
        .update({
          title: editingIdea.title,
          description: editingIdea.description,
          category: editingIdea.category,
          estimated_cost: editingIdea.estimatedCost,
          manager: currentUser?.name || 'Admin'
        })
        .eq('id', editingIdea.id);
    }

    setEditingIdea(null);
    alert('Projeto atualizado!');
  };

  // --- ESTADOS DEPÓSITO (FROM SUPABASE) ---
  const [tools, setTools] = useState<ToolAsset[]>([]);
  const [filterToolCategory, setFilterToolCategory] = useState('Tudo');

  // Fetch tools from Supabase
  const fetchFerramentas = async () => {
    try {
      setLoading(true);
      const { data: ferramentas, error } = await supabase
        .from('ferramentas')
        .select('*')
        .order('code', { ascending: true });

      if (error) {
        console.error('Erro ao buscar ferramentas:', error);
        return;
      }

      // Fetch logs for each ferramenta
      const toolsWithHistory: ToolAsset[] = await Promise.all(
        (ferramentas || []).map(async (ferr: DbFerramenta) => {
          const { data: logs } = await supabase
            .from('ferramentas_log')
            .select('*')
            .eq('ferramenta_id', ferr.id)
            .order('date', { ascending: false });

          return {
            id: ferr.id,
            code: ferr.code,
            name: ferr.name,
            status: ferr.status as ToolAsset['status'],
            statusReason: ferr.status_reason || undefined,
            lastUpdate: ferr.last_update,
            category: ferr.category,
            location: ferr.location || '',
            quantity: ferr.quantity,
            unitLabel: ferr.unit_label,
            history: (logs || []).map((log: DbFerramentaLog) => ({
              id: log.id,
              user: log.user_name,
              action: log.action as AssetLog['action'],
              date: new Date(log.date).toLocaleString('pt-BR'),
              quantityAffected: log.quantity_affected,
              notes: log.notes || undefined
            }))
          };
        })
      );

      setTools(toolsWithHistory);
    } catch (err) {
      console.error('Erro:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'tools') {
      fetchFerramentas();
    }
    if (activeTab === 'improvements') {
      fetchMelhorias();
    }
    if (activeTab === 'technical') {
      fetchCategorias();
    }
  }, [activeTab]);

  // MODAIS
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
  const [isAddCategoryModalOpen, setIsAddCategoryModalOpen] = useState(false);
  const [isAddIdeaModalOpen, setIsAddIdeaModalOpen] = useState(false);
  const [newIdeaData, setNewIdeaData] = useState({ title: '', category: '', description: '', estimatedCost: '', image: '', imageFile: null as File | null });
  const [uploadingImage, setUploadingImage] = useState(false);

  const handleImageUpload = async (file: File, type: 'new' | 'edit', setData: React.Dispatch<React.SetStateAction<any>>) => {
    setUploadingImage(true);
    try {
      const compressed = await compressImage(file, 1200, 1200, 0.7);
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${type}_${Date.now()}.${fileExt}`;
      
      const { data, error } = await supabase.storage
        .from('fotos')
        .upload(fileName, compressed.blob, { upsert: true });

      if (error) {
        console.error('Erro upload:', error);
        alert('Erro ao fazer upload da imagem');
        return;
      }

      const { data: { publicUrl } } = supabase.storage.from('fotos').getPublicUrl(fileName);
      
      setData((prev: any) => ({ ...prev, image: publicUrl }));
    } catch (err) {
      console.error('Erro:', err);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleAddIdea = async () => {
    if (!newIdeaData.title || !newIdeaData.category) {
      alert('Preencha o título e categoria');
      return;
    }

    const newIdea: ImprovementIdea = {
      id: `local-${Date.now()}`,
      title: formatText(newIdeaData.title),
      category: formatText(newIdeaData.category),
      description: newIdeaData.description,
      image: newIdeaData.image || 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=600&q=80',
      likes: 0,
      dislikes: 0,
      status: 'voting',
      manager: currentUser?.name || 'Admin',
      requestDate: new Date().toISOString().split('T')[0],
      estimatedCost: parseFloat(newIdeaData.estimatedCost) || 0
    };

    setImprovements([newIdea, ...improvements]);

    const { error } = await supabase.from('melhorias').insert({
      title: newIdea.title,
      category: newIdea.category,
      description: newIdea.description,
      image_url: newIdea.image,
      estimated_cost: newIdea.estimatedCost,
      status: 'voting',
      manager: newIdea.manager,
      request_date: newIdea.requestDate
    });

    if (error) console.error('Erro ao salvar:', error);

    setIsAddIdeaModalOpen(false);
    setNewIdeaData({ title: '', category: '', description: '', estimatedCost: '', image: '' });
    alert('Projeto sugerido com sucesso!');
  };

  const [isAddAssetModalOpen, setIsAddAssetModalOpen] = useState(false);
  const [isAssetControlModalOpen, setIsAssetControlModalOpen] = useState<ToolAsset | null>(null);
  const [viewingHistory, setViewingHistory] = useState<ToolAsset | null>(null);
  
  const photoInputRef = useRef<HTMLInputElement>(null);
  const assetDocInputRef = useRef<HTMLInputElement>(null);
  const [tempImage, setTempImage] = useState<string | null>(null);
  const [tempFileName, setTempFileName] = useState<string | null>(null);

  // --- AUXILIARES ---
  const formatCurrency = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const formatText = (text: string) => {
    if (!text) return text;
    const upperExceptions = ['LED', 'PVC', 'A', 'KVA', 'W', 'KW', 'HP', 'CC', 'MM', 'CM', 'M', 'KG', 'L', 'G'];
    const words = text.trim().toLowerCase().split(' ');
    return words.map(word => {
      if (upperExceptions.includes(word.toUpperCase())) return word.toUpperCase();
      return word.charAt(0).toUpperCase() + word.slice(1);
    }).join(' ');
  };

  const dynamicToolCategories = useMemo(() => {
    const cats = new Set(tools.map(t => t.category));
    return ['Tudo', ...Array.from(cats)];
  }, [tools]);

  const filteredTools = useMemo(() => {
    if (filterToolCategory === 'Tudo') return tools;
    return tools.filter(t => t.category === filterToolCategory);
  }, [tools, filterToolCategory]);

  const filteredHistory = useMemo(() => {
    return improvements.filter(i => {
      if (i.status !== 'completed' && i.status !== 'rejected') return false;
      if (improvementFilter === 'all') return true;
      if (improvementFilter === 'approved') return i.status === 'completed';
      if (improvementFilter === 'rejected') return i.status === 'rejected';
      return true;
    });
  }, [improvements, improvementFilter]);

  const handleSaveCategory = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const isMandatory = formData.get('mandatory') === 'true';

    if (editingCategory) {
      const updated = { ...editingCategory, title, description, mandatory: isMandatory, image: tempImage || editingCategory.image };
      setCategories(prev => prev.map(c => c.id === editingCategory.id ? updated : c));
      
      if (!editingCategory.id.startsWith('local-')) {
        await supabase.from('manual_categorias').update({
          name: title,
          description,
          mandatory: isMandatory,
          image: updated.image
        }).eq('id', editingCategory.id);
      }
      setEditingCategory(null);
    } else {
      const newCat: ManualCategory = {
        id: `local-${Date.now()}`,
        title, 
        description,
        image: tempImage || 'https://images.unsplash.com/photo-1541913054-0820875c7b39?auto=format&fit=crop&w=600&q=80',
        mandatory: isMandatory, items: []
      };
      setCategories([...categories, newCat]);
      
      await supabase.from('manual_categorias').insert({
        name: title,
        description,
        mandatory: isMandatory,
        image: newCat.image
      });
    }
    setIsAddCategoryModalOpen(false);
    setTempImage(null);
  };

  const fetchCategorias = async () => {
    try {
      const { data, error } = await supabase
        .from('manual_categorias')
        .select('*')
        .order('order_index', { ascending: true });

      if (error) {
        console.error('Erro ao buscar categorias:', error);
        return;
      }

      const categoriasDb = (data || []).map((c: any) => ({
        id: c.id,
        title: c.name,
        description: c.description,
        icon: c.icon,
        mandatory: c.mandatory,
        image: c.image,
        orderIndex: c.order_index,
        items: []
      }));

      const localCats = categories.filter(c => c.id.startsWith('local-'));
      setCategories([...categoriasDb, ...localCats]);
    } catch (err) {
      console.error('Erro:', err);
    }
  };

  const handleAddAsset = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const code = `WM-${Math.floor(Math.random()*999).toString().padStart(3, '0')}`;
    const today = new Date().toISOString().split('T')[0];

    const name = formatText(formData.get('name') as string);
    const category = formatText(formData.get('category') as string);
    const location = formatText(formData.get('location') as string);
    const unitLabel = formatText(formData.get('unitLabel') as string);
    
    // Save to Supabase
    const { data: newFerramenta, error } = await supabase
      .from('ferramentas')
      .insert({
        code,
        name,
        category,
        location,
        quantity: parseFloat(formData.get('quantity') as string),
        unit_label: unitLabel,
        status: 'available',
        last_update: today
      })
      .select()
      .single();

    if (error) {
      console.error('Erro ao salvar:', error);
      alert('Erro ao salvar no banco de dados');
      return;
    }

    // Log inicial
    await supabase.from('ferramentas_log').insert({
      ferramenta_id: newFerramenta.id,
      user_name: 'Admin',
      action: 'uso',
      date: new Date().toISOString(),
      quantity_affected: 0,
      notes: 'Cadastro inicial.'
    });

    // Refresh list
    await fetchFerramentas();
    setIsAddAssetModalOpen(false);
    alert('Ativo cadastrado com sucesso!');
  };

  const handleAssetMovement = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isAssetControlModalOpen) return;
    const formData = new FormData(e.currentTarget);
    const action = formData.get('action') as AssetLog['action'];
    const user = formatText(formData.get('user') as string);
    const qtyUsed = parseFloat(formData.get('qtyUsed') as string) || 0;
    const notes = formatText(formData.get('notes') as string);

    let newQty = isAssetControlModalOpen.quantity;
    let newStatus = isAssetControlModalOpen.status;
    let newStatusReason = isAssetControlModalOpen.statusReason;

    if (action === 'retirada' || action === 'uso') {
      newQty = Math.max(0, isAssetControlModalOpen.quantity - qtyUsed);
      newStatus = action === 'retirada' ? 'in_use' : 'available';
      newStatusReason = action === 'retirada' ? `Em uso por ${user}` : undefined;
    } else if (action === 'devolucao') {
      newQty = isAssetControlModalOpen.quantity + qtyUsed;
      newStatus = 'available';
      newStatusReason = undefined;
    } else if (action === 'reparo') {
      newStatus = 'maintenance';
      newStatusReason = `Encaminhado para reparo por ${user}`;
    }

    // Update ferramenta
    const { error: updateError } = await supabase
      .from('ferramentas')
      .update({
        quantity: newQty,
        status: newStatus,
        status_reason: newStatusReason,
        last_update: new Date().toISOString().split('T')[0],
        updated_at: new Date().toISOString()
      })
      .eq('id', isAssetControlModalOpen.id);

    if (updateError) {
      console.error('Erro ao atualizar:', updateError);
      alert('Erro ao atualizar');
      return;
    }

    // Insert log
    const { error: logError } = await supabase
      .from('ferramentas_log')
      .insert({
        ferramenta_id: isAssetControlModalOpen.id,
        user_name: user,
        action,
        date: new Date().toISOString(),
        quantity_affected: qtyUsed,
        notes
      });

    if (logError) {
      console.error('Erro ao salvar log:', logError);
    }

    // Refresh data
    await fetchFerramentas();
    setIsAssetControlModalOpen(null);
    alert('Estoque atualizado com sucesso!');
  };

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight uppercase leading-none">Gestão de Almoxarifado</h2>
          <p className="text-sm text-gray-500 font-medium mt-1">Manual técnico, projetos de melhoria e controle de ativos.</p>
        </div>
        <div className="flex bg-white p-1 rounded-2xl border border-gray-200 shadow-sm">
          <button onClick={() => setActiveTab('technical')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'technical' ? 'mycond-bg-yellow text-slate-900 shadow-md' : 'text-gray-400 hover:text-slate-600'}`}>Manual Técnico</button>
          <button onClick={() => setActiveTab('improvements')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'improvements' ? 'mycond-bg-yellow text-slate-900 shadow-md' : 'text-gray-400 hover:text-slate-600'}`}>Melhorias</button>
          <button onClick={() => setActiveTab('tools')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'tools' ? 'mycond-bg-yellow text-slate-900 shadow-md' : 'text-gray-400 hover:text-slate-600'}`}>Depósito / Insumos</button>
        </div>
      </header>

      {activeTab === 'tools' && (
        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
<div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm flex flex-wrap items-center justify-between gap-6">
            <div className="flex items-center space-x-4">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Filtro Rápido</label>
              <div className="flex bg-slate-100 p-1 rounded-xl">
                {dynamicToolCategories.map(c => (
                  <button 
                    key={c} 
                    onClick={() => setFilterToolCategory(c)}
                    className={`px-4 py-2 rounded-lg text-[10px] font-black transition-all ${filterToolCategory === c ? 'bg-white shadow-sm text-slate-900' : 'text-gray-400 hover:text-slate-600'}`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
            {isAdmin && (
              <button 
                onClick={() => setIsAddAssetModalOpen(true)} 
                className="px-8 py-3 mycond-bg-blue text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-blue-100 transition-all hover:bg-slate-900 active:scale-95"
              >
                + Novo Ativo
              </button>
            )}
          </div>

          <div className="bg-white rounded-[3rem] border border-gray-100 shadow-sm overflow-hidden">
            {loading ? (
              <div className="p-20 text-center">
                <div className="animate-spin w-10 h-10 border-4 border-slate-200 border-t-slate-900 rounded-full mx-auto mb-4"></div>
                <p className="text-[10px] font-black text-gray-400 uppercase">Carregando estoque...</p>
              </div>
            ) : tools.length === 0 ? (
              <div className="p-20 text-center opacity-40">
                <i className="fa-solid fa-box-open text-4xl mb-4"></i>
                <p className="text-[10px] font-black uppercase">Nenhum item cadastrado</p>
                {isAdmin && <button onClick={() => setIsAddAssetModalOpen(true)} className="mt-4 px-6 py-2 mycond-bg-blue text-white rounded-xl font-black text-[10px]">+ Cadastrar Primeiro Item</button>}
              </div>
            ) : (
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50/50 border-b border-gray-100 font-black text-[9px] text-gray-400 uppercase tracking-[0.2em]">
                    <th className="px-10 py-6">Código / Item</th>
                    <th className="px-6 py-6">Categoria</th>
                    <th className="px-6 py-6 text-center">Status</th>
                    <th className="px-6 py-6">Quantidade / Local</th>
                    <th className="px-10 py-6 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredTools.map(tool => (
                    <tr key={tool.id} className="hover:bg-slate-50/50 transition-all group">
                      <td className="px-10 py-6">
                         <span className="text-[9px] font-black text-gray-300 uppercase block mb-1">CÓD: {tool.code}</span>
                         <p className="font-black text-slate-800 text-xs uppercase tracking-tight">{tool.name}</p>
                         {tool.statusReason && <p className="text-[8px] text-orange-400 font-bold uppercase mt-1 italic">Obs: {tool.statusReason}</p>}
                      </td>
                      <td className="px-6 py-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">{tool.category}</td>
                      <td className="px-6 py-6 text-center">
                        <span className={`px-4 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest border ${
                          tool.status === 'available' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
                          tool.status === 'in_use' ? 'bg-blue-50 text-blue-600 border-blue-100' : 
                          'bg-orange-50 text-orange-600 border-orange-100'
                        }`}>
                          {tool.status === 'available' ? 'Estoque' : tool.status === 'in_use' ? 'Em Uso' : 'Em Reparo'}
                        </span>
                      </td>
                      <td className="px-6 py-6">
                         <p className="text-[10px] font-black text-slate-800 uppercase">{tool.quantity} {tool.unitLabel}{tool.quantity > 1 ? 's' : ''}</p>
                         <p className="text-[9px] text-gray-400 font-bold uppercase mt-0.5">{tool.location}</p>
                      </td>
                      <td className="px-10 py-6 text-right">
                         <div className="flex justify-end space-x-2">
                             <button onClick={() => setViewingHistory(tool)} className="w-10 h-10 bg-white border border-slate-200 text-slate-300 hover:bg-slate-900 hover:text-white rounded-xl transition-all shadow-sm" title="Histórico de Movimentação">
                               <i className="fa-solid fa-clock-rotate-left"></i>
                             </button>
                             <button onClick={() => setIsAssetControlModalOpen(tool)} className="w-10 h-10 bg-white border border-slate-200 text-slate-300 hover:bg-yellow-400 hover:text-slate-900 rounded-xl transition-all shadow-sm" title="Registrar Movimento">
                               <i className="fa-solid fa-right-left"></i>
                             </button>
                         </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {activeTab === 'technical' && (
        <div className="space-y-6">
          <div className="flex justify-end">
            {isAdmin && <button onClick={() => { setEditingCategory(null); setTempImage(null); setIsAddCategoryModalOpen(true); }} className="px-6 py-3 mycond-bg-blue text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl">+ Adicionar Categoria</button>}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {categories.map(cat => (
              <div key={cat.id} className="bg-white rounded-[3rem] overflow-hidden shadow-sm border border-gray-100 group relative hover:shadow-2xl transition-all duration-500">
                <div className="h-56 relative cursor-pointer" onClick={() => setSelectedCategory(cat)}>
                  <img src={cat.image} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
                  {cat.mandatory && <span className="absolute top-6 left-6 px-3 py-1 bg-red-500 text-white rounded-full text-[8px] font-black uppercase tracking-widest">Obrigatório</span>}
                  <div className="absolute bottom-6 left-8 text-white">
                    <h4 className="font-black text-xl uppercase tracking-tighter leading-none">{cat.title}</h4>
                    <p className="text-[9px] font-bold text-white/60 tracking-widest mt-1">{cat.items.length} ITENS DE CONFORMIDADE</p>
                  </div>
                </div>
                <div className="p-6 flex justify-between items-center">
                   <div className="flex -space-x-2">
                      {cat.items.slice(0, 3).map((_, i) => <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center text-[10px] text-slate-400"><i className="fa-solid fa-file-contract"></i></div>)}
                   </div>
<div className="flex gap-2">
                       <button onClick={() => { console.log('Editing category:', cat.id); setEditingCategory(cat); setTempImage(cat?.image || null); setIsAddCategoryModalOpen(true); }} className="w-10 h-10 bg-yellow-400 text-slate-900 hover:bg-yellow-500 rounded-xl transition-all shadow-inner"><i className="fa-solid fa-pen-to-square"></i></button>
                       <button onClick={() => { if (window.confirm('Excluir categoria?')) { setCategories(prev => prev.filter(c => c.id !== cat.id)); } }} className="w-10 h-10 bg-red-100 text-red-400 hover:bg-red-500 hover:text-white rounded-xl transition-all shadow-inner"><i className="fa-solid fa-trash"></i></button>
                       <div onClick={() => { console.log('Opening category:', cat.id); setSelectedCategory(cat); }} className="w-10 h-10 bg-slate-50 text-slate-300 group-hover:text-slate-900 rounded-xl flex items-center justify-center transition-all cursor-pointer"><i className="fa-solid fa-chevron-right"></i></div>
                    </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'improvements' && (
        <div className="space-y-10">
          <div className="flex justify-between items-center px-2">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.3em]">Projetos em Estudo</h3>
            {isAdmin && <button onClick={() => setIsAddIdeaModalOpen(true)} className="px-6 py-3 mycond-bg-yellow text-slate-900 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-yellow-100">+ Sugerir Projeto</button>}
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {improvements.filter(i => i.status !== 'completed' && i.status !== 'rejected').map(imp => {
              const currentVote = userVotes[imp.id];
              return (
                <div key={imp.id} className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-sm flex flex-col md:flex-row gap-8 items-center group">
                  <div className="w-40 h-40 rounded-[2.5rem] overflow-hidden shadow-inner border-4 border-slate-50">
                    <img src={imp.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-black text-slate-800 uppercase text-lg">{imp.title}</h4>
                      {isAdmin && <button onClick={() => setIsConcludeProjectModalOpen(imp)} className="text-[9px] font-black uppercase text-emerald-500 hover:underline">Concluir</button>}
                    </div>
                    <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest mb-2">{imp.category} • Estimado: {formatCurrency(imp.estimatedCost)}</p>
                    <p className="text-xs text-gray-500 font-medium mb-6 line-clamp-2 leading-relaxed">"{imp.description}"</p>
                    <div className="flex items-center space-x-3">
                      <button 
                        onClick={() => handleVote(imp.id, 'like')} 
                        className={`flex items-center space-x-3 px-6 py-3 rounded-2xl font-black text-[10px] transition-all shadow-sm ${
                          currentVote === 'like' 
                            ? 'bg-emerald-500 text-white' 
                            : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white'
                        }`}
                      >
                        <i className="fa-solid fa-thumbs-up"></i> 
                        <span>{imp.likes} Apoiam</span>
                      </button>
                      <button 
                        onClick={() => handleVote(imp.id, 'dislike')} 
                        className={`flex items-center space-x-3 px-6 py-3 rounded-2xl font-black text-[10px] transition-all shadow-sm ${
                          currentVote === 'dislike' 
                            ? 'bg-red-500 text-white' 
                            : 'bg-red-50 text-red-600 hover:bg-red-500 hover:text-white'
                        }`}
                      >
                        <i className="fa-solid fa-thumbs-down"></i> 
                        <span>{imp.dislikes}</span>
                      </button>
                      {isAdmin && (
                        <button onClick={() => setEditingIdea(imp)} className="px-4 py-3 bg-slate-100 text-slate-500 rounded-2xl font-black text-[10px] hover:bg-slate-200" title="Editar">
                          <i className="fa-solid fa-pen"></i>
                        </button>
                      )}
                      <button onClick={() => setViewingIdea(imp)} className="px-4 py-3 bg-slate-900 text-white rounded-2xl font-black text-[10px] hover:bg-slate-700" title="Ver Detalhes">
                        <i className="fa-solid fa-eye"></i>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="space-y-6">
            <div className="flex justify-between items-center px-2">
              <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.3em]">Histórico de Projetos</h3>
              <div className="flex bg-slate-100 p-1 rounded-xl">
                 <button onClick={() => setImprovementFilter('all')} className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${improvementFilter === 'all' ? 'bg-white shadow-sm text-slate-900' : 'text-gray-400'}`}>Tudo</button>
                 <button onClick={() => setImprovementFilter('approved')} className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${improvementFilter === 'approved' ? 'bg-white shadow-sm text-emerald-600' : 'text-gray-400'}`}>Aprovados</button>
                 <button onClick={() => setImprovementFilter('rejected')} className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${improvementFilter === 'rejected' ? 'bg-white shadow-sm text-red-500' : 'text-gray-400'}`}>Não Aprovados</button>
              </div>
            </div>
            <div className="bg-white rounded-[3rem] border border-gray-100 overflow-hidden shadow-sm divide-y divide-gray-50">
              {filteredHistory.map(imp => (
                <div key={imp.id} className="p-8 flex items-center justify-between hover:bg-slate-50/50 transition-all group">
                   <div className="flex items-center space-x-6">
                      <div className={`w-16 h-16 rounded-3xl flex items-center justify-center text-2xl shadow-inner ${imp.status === 'completed' ? 'bg-emerald-50 text-emerald-500' : 'bg-red-50 text-red-400'}`}><i className={imp.status === 'completed' ? "fa-solid fa-trophy" : "fa-solid fa-ban"}></i></div>
                      <div>
                        <h4 className="font-black text-slate-800 uppercase text-base">{imp.title}</h4>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Concluído em: <span className="text-slate-900">{imp.implementationDate?.split('-').reverse().join('/')}</span> • Gestão: <span className="text-slate-900">{imp.manager}</span></p>
                      </div>
                   </div>
                   <div className="flex space-x-2">
                     {isAdmin && (
                       <button onClick={() => setEditingIdea(imp)} className="px-4 py-3 bg-yellow-400 text-slate-900 rounded-2xl font-black text-[10px] hover:bg-yellow-500" title="Editar">
                         <i className="fa-solid fa-pen"></i>
                       </button>
                     )}
                     <button onClick={() => setViewingIdea(imp)} className="px-8 py-3 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl transition-all active:scale-95">Ver Detalhes</button>
                   </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* --- MODAIS DE MELHORIAS --- */}

      {isAddIdeaModalOpen && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-2xl animate-in fade-in" onClick={() => setIsAddIdeaModalOpen(false)}></div>
          <div className="relative bg-white w-full max-w-lg rounded-[3.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="p-8 mycond-bg-yellow text-slate-900 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-black uppercase">Sugerir Projeto</h3>
                <p className="text-[10px] opacity-70">Nova ideia de melhoria</p>
              </div>
              <button onClick={() => setIsAddIdeaModalOpen(false)} className="w-10 h-10 rounded-full hover:bg-black/10 flex items-center justify-center"><i className="fa-solid fa-xmark"></i></button>
            </div>
            <div className="p-8 space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase">Título do Projeto</label>
                <input value={newIdeaData.title} onChange={e => setNewIdeaData({...newIdeaData, title: e.target.value})} className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 font-black text-slate-800" placeholder="Ex: Nova Playground" required />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase">Categoria</label>
                <input value={newIdeaData.category} onChange={e => setNewIdeaData({...newIdeaData, category: e.target.value})} list="novaCategoria" className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 font-black text-slate-800" placeholder="Selecione ou digite..." />
                <datalist id="novaCategoria">
                  {improvementCategories.map(c => <option key={c} value={c} />)}
                </datalist>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase">Custo Estimado (R$)</label>
                  <input type="number" value={newIdeaData.estimatedCost} onChange={e => setNewIdeaData({...newIdeaData, estimatedCost: e.target.value})} className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 font-black text-slate-800" placeholder="0.00" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase">Imagem do Projeto</label>
                  {newIdeaData.image ? (
                    <div className="relative h-40 rounded-2xl overflow-hidden">
                      <img src={newIdeaData.image} className="w-full h-full object-cover" />
                      <button type="button" onClick={() => setNewIdeaData({...newIdeaData, image: ''})} className="absolute top-2 right-2 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center"><i className="fa-solid fa-times"></i></button>
                    </div>
                  ) : (
                    <label className="w-full h-40 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-yellow-400 transition-colors">
                      <i className="fa-solid fa-image text-3xl text-slate-300 mb-2"></i>
                      <span className="text-[10px] font-black text-slate-400">Clique para enviar imagem</span>
                      <input type="file" accept="image/*" className="hidden" onChange={e => {
                        const file = e.target.files?.[0];
                        if (file) handleImageUpload(file, 'new', setNewIdeaData);
                      }} />
                    </label>
                  )}
                  {uploadingImage && <div className="text-center py-2 text-[10px] text-yellow-600">Enviando...</div>}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase">Descrição</label>
                <textarea value={newIdeaData.description} onChange={e => setNewIdeaData({...newIdeaData, description: e.target.value})} className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 font-black text-slate-800 resize-none" rows={3} placeholder="Descreva os benefícios..."></textarea>
              </div>
              <button onClick={handleAddIdea} className="w-full py-4 mycond-bg-yellow text-slate-900 rounded-2xl font-black uppercase text-xs">Sugerir Projeto</button>
            </div>
          </div>
        </div>
      )}

      {isConcludeProjectModalOpen && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-2xl animate-in fade-in" onClick={() => setIsConcludeProjectModalOpen(null)}></div>
          <div className="relative bg-white w-full max-w-lg rounded-[3.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="p-8 mycond-bg-emerald text-white flex justify-between items-center">
              <div>
                <h3 className="text-xl font-black uppercase">Concluir Projeto</h3>
                <p className="text-[10px] opacity-70">{isConcludeProjectModalOpen.title}</p>
              </div>
              <button onClick={() => setIsConcludeProjectModalOpen(null)} className="w-10 h-10 rounded-full hover:bg-white/10 flex items-center justify-center"><i className="fa-solid fa-xmark"></i></button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); handleConcludeProject(); }} className="p-8 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase">Data Implementação</label>
                  <input type="date" value={concludeData.implementationDate} onChange={e => setConcludeData({...concludeData, implementationDate: e.target.value})} className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 font-black text-slate-800" required />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase">Custo Real (R$)</label>
                  <input type="number" value={concludeData.realCost} onChange={e => setConcludeData({...concludeData, realCost: e.target.value})} className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 font-black text-slate-800" placeholder="0.00" />
                </div>
              </div>
<div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase">Status do Projeto</label>
                  <select value={concludeData.status || 'completed'} onChange={e => setConcludeData({...concludeData, status: e.target.value})} className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 font-black text-slate-800">
                    <option value="completed">Aprovar</option>
                    <option value="rejected">Reprovar</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase">Observações</label>
                  <textarea value={concludeData.notes} onChange={e => setConcludeData({...concludeData, notes: e.target.value})} className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 font-black text-slate-800 resize-none" rows={2} placeholder="Notas sobre a conclusão ou reprovação..."></textarea>
                </div>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setIsConcludeProjectModalOpen(null)} className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black uppercase text-xs">Cancelar</button>
                  <button type="submit" className={`flex-1 py-4 rounded-2xl font-black uppercase text-xs ${concludeData.status === 'rejected' ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white'}`}>{concludeData.status === 'rejected' ? 'Reprovar' : 'Aprovar'}</button>
                </div>
            </form>
          </div>
        </div>
      )}

      {editingIdea && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-2xl animate-in fade-in" onClick={() => setEditingIdea(null)}></div>
          <div className="relative bg-white w-full max-w-lg rounded-[3.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="p-8 mycond-bg-yellow text-slate-900 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-black uppercase">Editar Projeto</h3>
                <p className="text-[10px] opacity-70">Alterar informações</p>
              </div>
              <button onClick={() => setEditingIdea(null)} className="w-10 h-10 rounded-full hover:bg-black/10 flex items-center justify-center"><i className="fa-solid fa-xmark"></i></button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); handleEditIdea(); }} className="p-8 space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase">Título</label>
                <input value={editingIdea.title} onChange={e => setEditingIdea({...editingIdea, title: e.target.value})} className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 font-black text-slate-800" required />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase">Descrição</label>
                <textarea value={editingIdea.description || ''} onChange={e => setEditingIdea({...editingIdea, description: e.target.value})} className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 font-black text-slate-800 resize-none" rows={3}></textarea>
              </div>
              <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase">Imagem do Projeto</label>
                  {editingIdea.image ? (
                    <div className="relative h-32 rounded-2xl overflow-hidden mb-2">
                      <img src={editingIdea.image} className="w-full h-full object-cover" />
                      <button type="button" onClick={() => setEditingIdea({...editingIdea, image: ''})} className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs"><i className="fa-solid fa-times"></i></button>
                    </div>
                  ) : (
                    <label className="w-full h-32 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-yellow-400">
                      <i className="fa-solid fa-image text-2xl text-slate-300 mb-1"></i>
                      <span className="text-[9px] font-black text-slate-400">Clique para enviar</span>
                      <input type="file" accept="image/*" className="hidden" onChange={e => {
                        const file = e.target.files?.[0];
                        if (file) handleImageUpload(file, 'edit', setEditingIdea);
                      }} />
                    </label>
                  )}
                  {uploadingImage && <div className="text-center py-2 text-[10px] text-yellow-600">Enviando...</div>}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase">Categoria</label>
                    <input value={editingIdea.category} onChange={e => setEditingIdea({...editingIdea, category: e.target.value})} list="editCategorias" className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 font-black text-slate-800" />
                    <datalist id="editCategorias">
                      {improvementCategories.map(c => <option key={c} value={c} />)}
                    </datalist>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase">Custo Estimado (R$)</label>
                    <input type="number" value={editingIdea.estimatedCost} onChange={e => setEditingIdea({...editingIdea, estimatedCost: parseFloat(e.target.value) || 0})} className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 font-black text-slate-800" />
                  </div>
                </div>
              <button type="submit" className="w-full py-4 mycond-bg-yellow text-slate-900 rounded-2xl font-black uppercase text-xs">Salvar Alterações</button>
            </form>
          </div>
        </div>
      )}

      {viewingIdea && !editingIdea && !isConcludeProjectModalOpen && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-2xl animate-in fade-in" onClick={() => setViewingIdea(null)}></div>
          <div className="relative bg-white w-full max-w-xl rounded-[3.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="h-48 relative">
              <img src={viewingIdea.image} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
              <button onClick={() => setViewingIdea(null)} className="absolute top-4 right-4 w-10 h-10 bg-black/30 text-white rounded-full hover:bg-black/50 flex items-center justify-center"><i className="fa-solid fa-xmark"></i></button>
              <div className="absolute bottom-4 left-6 text-white">
                <h3 className="font-black text-xl uppercase">{viewingIdea.title}</h3>
              </div>
            </div>
            <div className="p-8 space-y-4">
              <div className="flex justify-between">
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase">Categoria</p>
                  <p className="font-black text-slate-800">{viewingIdea.category}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase">Status</p>
                  <p className="font-black text-slate-800 uppercase">{viewingIdea.status}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase">Custo</p>
                  <p className="font-black text-slate-800">{formatCurrency(viewingIdea.estimatedCost)}</p>
                </div>
              </div>
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase">Descrição</p>
                <p className="text-slate-600">{viewingIdea.description}</p>
              </div>
              <div className="flex justify-between pt-4 border-t">
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase">Votos</p>
                  <p className="font-black text-emerald-600">👍 {viewingIdea.likes} vs 👎 {viewingIdea.dislikes}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-gray-400 uppercase">Responsável</p>
                  <p className="font-black text-slate-800">{viewingIdea.manager}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAIS DE GESTÃO DO ALMOXARIFADO --- */}

      {viewingHistory && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-2xl animate-in fade-in" onClick={() => setViewingHistory(null)}></div>
          <div className="relative bg-white w-full max-w-xl rounded-[4rem] shadow-2xl overflow-hidden animate-in zoom-in-95">
             <div className="p-10 bg-slate-900 text-white flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-black uppercase tracking-tighter">Histórico de Movimentação</h3>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{viewingHistory.name} • {viewingHistory.code}</p>
                </div>
                <button onClick={() => setViewingHistory(null)} className="w-12 h-12 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors"><i className="fa-solid fa-xmark text-xl"></i></button>
             </div>
             <div className="p-10 max-h-[60vh] overflow-y-auto scrollbar-hide space-y-6">
                {viewingHistory.history.length > 0 ? viewingHistory.history.map((log, idx) => (
                   <div key={idx} className="flex gap-6 relative before:content-[''] before:absolute before:left-[19px] before:top-10 before:bottom-0 before:w-0.5 before:bg-slate-100 last:before:hidden">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm flex-shrink-0 shadow-sm ${
                        log.action === 'retirada' ? 'bg-blue-50 text-blue-500' : 
                        log.action === 'devolucao' ? 'bg-emerald-50 text-emerald-500' : 
                        log.action === 'reparo' ? 'bg-orange-50 text-orange-500' : 'bg-slate-100 text-slate-400'
                      }`}>
                         <i className={`fa-solid ${
                           log.action === 'retirada' ? 'fa-arrow-up-from-bracket' : 
                           log.action === 'devolucao' ? 'fa-arrow-down-to-bracket' : 
                           log.action === 'reparo' ? 'fa-wrench' : 'fa-check'
                         }`}></i>
                      </div>
                      <div className="flex-1 pb-6 border-b border-gray-50">
                        <div className="flex justify-between items-start mb-1">
                          <p className="text-[11px] font-black text-slate-800 uppercase tracking-tight">{log.user}</p>
                          <span className="text-[9px] font-black text-gray-300 uppercase">{log.date}</span>
                        </div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                           {log.action === 'retirada' ? 'Retirada para uso' : 
                            log.action === 'devolucao' ? 'Devolução ao estoque' : 
                            log.action === 'reparo' ? 'Encaminhado para reparo' : 'Ajuste de estoque'}
                           {log.quantityAffected > 0 && ` • ${log.quantityAffected} ${viewingHistory.unitLabel}(s)`}
                        </p>
                        {log.notes && <p className="text-xs text-slate-500 italic font-medium">"{log.notes}"</p>}
                      </div>
                   </div>
                )) : (
                   <div className="text-center py-10 opacity-30">
                     <i className="fa-solid fa-box-open text-4xl mb-4"></i>
                     <p className="text-[10px] font-black uppercase">Sem registros no histórico</p>
                   </div>
                )}
             </div>
          </div>
        </div>
      )}

      {isAssetControlModalOpen && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-2xl animate-in fade-in" onClick={() => setIsAssetControlModalOpen(null)}></div>
<div className="relative bg-white w-full max-w-lg rounded-[3.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
              <div className="p-8 mycond-bg-yellow text-slate-900 flex justify-between items-center sticky top-0 z-10">
                 <div>
                    <h3 className="text-2xl font-black uppercase tracking-tighter">Controle de Fluxo</h3>
                    <p className="text-[10px] text-slate-700 font-bold uppercase tracking-widest">CÓDIGO: {isAssetControlModalOpen.code} • Item: {isAssetControlModalOpen.name}</p>
                 </div>
                 <button onClick={() => setIsAssetControlModalOpen(null)} className="w-10 h-10 rounded-full hover:bg-black/10 flex items-center justify-center transition-colors"><i className="fa-solid fa-xmark text-lg"></i></button>
              </div>
              <form onSubmit={handleAssetMovement} className="p-8 space-y-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Tipo de Ação</label>
                  <select required name="action" className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 font-black text-slate-800 shadow-inner appearance-none transition-all focus:ring-4 focus:ring-yellow-400/20">
                    <option value="retirada">Retirada Direta (Equipamento)</option>
                    <option value="uso">Uso / Consumo (Insumos)</option>
                    <option value="devolucao">Devolução ao Estoque</option>
                    <option value="reparo">Encaminhar para Reparo</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Responsável / Colaborador</label>
                  <input required name="user" list="responsaveis" className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 font-black text-slate-800 shadow-inner" placeholder="Digite ou selecione..." />
                  <datalist id="responsaveis">
                    <option value="Zelador Ricardo" />
                    <option value="Zelador Carlos" />
                    <option value="Síndico Eduardo" />
                    <option value="Admin" />
                    <option value="Portaria" />
                  </datalist>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Quantidade</label>
                    <input required name="qtyUsed" type="number" step="0.1" min="0" className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 font-black text-slate-800 shadow-inner" placeholder="Qtd" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Unidade</label>
                    <input disabled className="w-full bg-slate-100 border-none rounded-2xl px-6 py-4 font-black text-slate-400" value={isAssetControlModalOpen.unitLabel} />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Observações</label>
                  <input name="notes" list="obsOptions" className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 font-black text-slate-800 shadow-inner" placeholder="Digite ou selecione..." />
                  <datalist id="obsOptions">
                    <option value="Uso diário - Manutenção geral" />
                    <option value="Serviço de pintura" />
                    <option value="Reparo hidráulico" />
                    <option value="Limpeza de área comum" />
                    <option value="Evento no salão de festas" />
                    <option value="Manutenção preventiva" />
                    <option value="Consumo imediato" />
                    <option value="Emprestimo temporário" />
                  </datalist>
                </div>

                <button type="submit" className="w-full py-5 mycond-bg-yellow text-slate-900 rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-lg shadow-yellow-100 hover:bg-yellow-500 transition-all active:scale-95 mt-2">Confirmar Movimentação</button>
             </form>
          </div>
        </div>
      )}

      {isAddAssetModalOpen && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-2xl animate-in fade-in" onClick={() => setIsAddAssetModalOpen(false)}></div>
          <div className="relative bg-white w-full max-w-lg rounded-[3.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95">
             <div className="p-10 mycond-bg-blue text-white flex justify-between items-center">
                <div>
                   <h3 className="text-2xl font-black uppercase tracking-tighter">Novo Ativo Predial</h3>
                   <p className="text-[10px] text-blue-300 font-bold uppercase tracking-widest">Almoxarifado WM</p>
                </div>
                <button onClick={() => setIsAddAssetModalOpen(false)} className="w-12 h-12 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors"><i className="fa-solid fa-xmark text-xl"></i></button>
             </div>
<form onSubmit={handleAddAsset} className="p-10 space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Nome do Equipamento/Insumo</label>
                  <input required name="name" list="equipamentosSugeridos" className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 font-black text-slate-800 shadow-inner" placeholder="Digite ou selecione..." />
                  <datalist id="equipamentosSugeridos">
                    <option value="Furadeira Impacto" />
                    <option value="Parafusadeira" />
                    <option value="Serra Circular" />
                    <option value="Cortador de Grama" />
                    <option value="Lavadora de Pressão" />
                    <option value=" Aspirador de Pó" />
                    <option value="Telhas" />
                    <option value="Cloro Estabilizante" />
                    <option value="Algodão" />
                    <option value="Fita Isolante" />
                    <option value="Disjuntor 10A" />
                    <option value="Disjuntor 20A" />
                    <option value="Lâmpada LED 15W" />
                    <option value="Torneira Registro" />
                    <option value="Válvula Hydra" />
                  </datalist>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Categoria</label>
                    <input required name="category" list="categorias" className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 font-black text-slate-800 shadow-inner" placeholder="Digite ou selecione..." />
                    <datalist id="categorias">
                      <option value="Ferramentas" />
                      <option value="Insumos" />
                      <option value="Jardim" />
                      <option value="Limpeza" />
                      <option value="Escritório" />
                      <option value="Elétrica" />
                      <option value="Hidráulica" />
                    </datalist>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Localização</label>
                    <input name="location" list="locais" className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 font-black text-slate-800 shadow-inner" placeholder="Digite ou selecione..." />
                    <datalist id="locais">
                      <option value="Depósito Geral" />
                      <option value="Zeladoria" />
                      <option value="Armário 01" />
                      <option value="Armário 02" />
                      <option value="Depósito Piscina" />
                      <option value="Depósito Jardim" />
                      <option value="Quadra" />
                      <option value="Salão de Festas" />
                      <option value="Churrasqueira" />
                    </datalist>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Quantidade Inicial</label>
                    <input required name="quantity" type="number" step="0.1" min="0" className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 font-black text-slate-800 shadow-inner" placeholder="Ex: 10" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Unidade de Medida</label>
                    <input name="unitLabel" list="unidades" className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 font-black text-slate-800 shadow-inner" placeholder="Digite ou selecione..." />
                    <datalist id="unidades">
                      <option value="Unidade" />
                      <option value="Saco" />
                      <option value="Kg" />
                      <option value="Litro" />
                      <option value="Metro" />
                      <option value="Peça" />
                      <option value="Rolo" />
                      <option value="Galão" />
                      <option value="Caixa" />
                    </datalist>
                  </div>
                </div>
                <button type="submit" className="w-full py-6 mycond-bg-blue text-white rounded-[2rem] font-black uppercase text-xs tracking-[0.2em] shadow-2xl hover:bg-slate-800 transition-all active:scale-95">Cadastrar no Almoxarifado</button>
              </form>
          </div>
        </div>
      )}

      {isAddCategoryModalOpen && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-2xl animate-in fade-in" onClick={() => setIsAddCategoryModalOpen(false)}></div>
          <div className="relative bg-white w-full max-w-lg rounded-[4rem] shadow-2xl p-12 animate-in zoom-in-95">
             <h3 className="text-3xl font-black text-slate-900 uppercase tracking-tighter mb-10">{editingCategory ? 'Editar Categoria' : 'Nova Categoria'}</h3>
             <form onSubmit={handleSaveCategory} className="space-y-6">
                <div onClick={() => photoInputRef.current?.click()} className="w-full h-40 bg-slate-50 border-4 border-dashed border-gray-100 rounded-[2.5rem] flex items-center justify-center overflow-hidden cursor-pointer group hover:border-yellow-400 transition-all shadow-inner">
                  {tempImage ? <img src={tempImage} className="w-full h-full object-cover" /> : <div className="text-center"><i className="fa-solid fa-camera text-gray-300 text-3xl mb-2 group-hover:scale-110 transition-transform"></i><p className="text-[10px] font-black text-gray-400 uppercase">Foto de Capa</p></div>}
                </div>
<input type="file" ref={photoInputRef} onChange={async (e) => {
                   const file = e.target.files?.[0];
                   if (file) {
                     const compressed = await compressImage(file, 1200, 1200, 0.7);
                     const reader = new FileReader();
                     reader.onloadend = () => setTempImage(reader.result as string);
                     reader.readAsDataURL(compressed.blob);
                   }
                 }} className="hidden" accept="image/*" />
                <div className="space-y-2"><label className="text-[10px] font-black text-gray-400 uppercase ml-1">Título</label><input required name="title" defaultValue={editingCategory?.title} className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 font-black text-slate-800 shadow-inner" /></div>
                <div className="space-y-2"><label className="text-[10px] font-black text-gray-400 uppercase ml-1">Tipo</label><select name="mandatory" defaultValue={editingCategory?.mandatory ? 'true' : 'false'} className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 font-black text-slate-800 appearance-none shadow-inner"><option value="true">Obrigatório (Exige Alvarás)</option><option value="false">Opcional (Manutenção Comum)</option></select></div>
                <button type="submit" className="w-full py-6 mycond-bg-blue text-white rounded-3xl font-black uppercase text-xs tracking-widest shadow-xl">Salvar Categoria</button>
             </form>
          </div>
        </div>
      )}

      {selectedCategory && !isAddItemModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-xl animate-in fade-in" onClick={() => setSelectedCategory(null)}></div>
          <div className="relative bg-white w-full max-w-2xl rounded-[4rem] shadow-2xl overflow-hidden animate-in zoom-in-95 max-h-[90vh] overflow-y-auto scrollbar-hide">
             <div className="h-64 relative">
                <img src={selectedCategory.image} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent"></div>
                <button onClick={() => setSelectedCategory(null)} className="absolute top-6 right-6 w-12 h-12 bg-black/30 hover:bg-black/50 text-white rounded-full flex items-center justify-center backdrop-blur-xl transition-all duration-300 shadow-xl"><i className="fa-solid fa-xmark text-xl"></i></button>
                <div className="absolute bottom-0 left-0 w-full p-10">
                   <h3 className="text-4xl font-black text-slate-900 uppercase tracking-tighter leading-none">{selectedCategory.title}</h3>
                   <div className="flex justify-between items-center mt-4">
                      <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em]">Checklist de Conformidade Técnica</p>
                      {isAdmin && <button onClick={() => setIsAddItemModalOpen(true)} className="px-6 py-2.5 mycond-bg-yellow text-slate-900 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl">+ Novo Item</button>}
                   </div>
                </div>
             </div>
             <div className="p-10 space-y-6">
                <div className="bg-slate-50 p-8 rounded-[3rem] border border-gray-100 space-y-6 shadow-inner">
                   {selectedCategory.items.map((item) => (
                      <div key={item.id} className="flex items-center justify-between group hover:bg-white p-4 rounded-2xl transition-all border border-transparent hover:border-slate-200">
                         <div className="flex items-center space-x-4">
                            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg transition-transform group-hover:scale-110 ${item.status === 'regular' ? 'bg-emerald-500 text-white' : 'bg-red-50 text-red-500'}`}><i className={`fa-solid ${item.status === 'regular' ? 'fa-check' : 'fa-triangle-exclamation'}`}></i></div>
                            <div><p className="font-black text-slate-800 text-xs uppercase tracking-tight">{item.label}</p><p className="text-[9px] text-gray-400 font-bold uppercase">Entrada: {item.entryDate.split('-').reverse().join('/')} • {item.inspector}</p></div>
                         </div>
                         <div className="flex items-center space-x-6">
                            <div className="text-right">
                               <p className={`text-xs font-black uppercase tracking-tighter ${new Date(item.validityDate) < new Date() ? 'text-red-500' : 'text-slate-700'}`}>Vencimento: {item.validityDate.split('-').reverse().join('/')}</p>
                               <p className="text-[8px] text-gray-400 font-black uppercase tracking-widest">{item.status === 'regular' ? 'Conforme' : 'Vencido / Irregular'}</p>
                            </div>
                            <button onClick={() => onNavigate(View.DOCUMENTOS)} className="w-10 h-10 bg-slate-50 text-slate-300 hover:bg-blue-500 hover:text-white rounded-xl transition-all shadow-sm flex items-center justify-center" title="Ver Certificado Digital"><i className="fa-solid fa-file-pdf"></i></button>
                         </div>
                      </div>
                   ))}
                </div>
             </div>
          </div>
        </div>
      )}

      {/* Modal Adicionar Novo Item */}
      {isAddItemModalOpen && selectedCategory && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-2xl animate-in fade-in" onClick={() => setIsAddItemModalOpen(false)}></div>
          <div className="relative bg-white w-full max-w-lg rounded-[4rem] shadow-2xl p-10 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-black text-slate-900 uppercase">Novo Item Técnico</h3>
              <button onClick={() => setIsAddItemModalOpen(false)} className="w-10 h-10 bg-slate-100 text-slate-400 hover:bg-slate-200 rounded-full flex items-center justify-center"><i className="fa-solid fa-xmark"></i></button>
            </div>
            <form onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  const newItem: TechnicalItem = {
                    id: Math.random().toString(36).substr(2, 9),
                    label: formData.get('label') as string,
                    entryDate: formData.get('entryDate') as string,
                    validityDate: formData.get('validityDate') as string,
                    inspector: formData.get('inspector') as string || '',
                    description: formData.get('description') as string || '',
                    status: new Date(formData.get('validityDate') as string) < new Date() ? 'warning' : 'regular'
                  };
                  
                  setCategories(prev => prev.map(cat => 
                    cat.id === selectedCategory.id 
                      ? { ...cat, items: [...cat.items, newItem] }
                      : cat
                  ));
                  
                  // Also update selectedCategory to show the new item
                  setSelectedCategory(prev => prev ? { ...prev, items: [...prev.items, newItem] } : null);
                  
                  setIsAddItemModalOpen(false);
                  alert('Item adicionado com sucesso!');
                }} className="space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Nome do Item</label>
                <input required name="label" className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 font-black text-slate-800 shadow-inner" placeholder="Ex: AVCB / CLCB" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Data Entrada</label>
                  <input required name="entryDate" type="date" className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 font-black text-slate-800 shadow-inner" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Data Validade</label>
                  <input required name="validityDate" type="date" className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 font-black text-slate-800 shadow-inner" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Inspetor / Empresa</label>
                <input name="inspector" className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 font-black text-slate-800 shadow-inner" placeholder="Nome da empresa" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Descrição</label>
                <textarea name="description" rows={2} className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 font-black text-slate-800 shadow-inner resize-none" placeholder="Detalhes do item..."></textarea>
              </div>
              <button type="submit" className="w-full py-5 mycond-bg-yellow text-slate-900 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl">Salvar Item</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManualSindico;