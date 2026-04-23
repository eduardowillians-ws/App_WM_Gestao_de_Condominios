
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Assembleia } from '../types';

interface AssembleiasProps {
  userRole?: 'admin' | 'resident' | 'manager' | 'familiar';
  currentUser?: {
    id: string;
    name: string;
    unit: string;
    role: string;
  };
}

interface AssemblyVote {
  aprovo: number;
  rejeito: number;
  abstencao: number;
}

const TOTAL_RESIDENTS = 5; 

const INITIAL_ASSEMBLEIAS: Assembleia[] = [
  {
    id: '1',
    title: 'Assembleia Geral Extraordinária - Reforma Fachada',
    description: 'A votação encerra em breve. Sua participação é fundamental para decidirmos o futuro estético do nosso prédio.',
    date: '2026-03-01',
    startDate: '2026-03-01',
    endDate: '2026-03-03',
    type: 'EXTRAORDINÁRIA',
    status: 'active',
    votesCount: 2, 
    results: { aprovo: 1, rejeito: 1, abstencao: 0 },
    closingTime: '48 horas'
  },
  {
    id: '2',
    title: 'Prestação de Contas Anual',
    description: 'Apresentação detalhada de gastos do exercício anterior e planejamento orçamentário conforme normas vigentes.',
    date: '2025-06-15',
    type: 'ORDINÁRIA',
    status: 'closed',
    votesCount: 4,
    results: { aprovo: 3, rejeito: 0, abstencao: 1 },
    minutesUrl: '#'
  }
];

const Assembleias: React.FC<AssembleiasProps> = ({ userRole = 'resident', currentUser }) => {
  const [assemblies, setAssemblies] = useState<Assembleia[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isConveneModalOpen, setIsConveneModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isVoteModalOpen, setIsVoteModalOpen] = useState(false);
  const [showPartialResults, setShowPartialResults] = useState(false);
  const [viewingAssembly, setViewingAssembly] = useState<Assembleia | null>(null);
  const [selectedAssemblyId, setSelectedAssemblyId] = useState<string | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [totalResidents, setTotalResidents] = useState(0);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Only admin and manager can create/close assemblies
  const isAdmin = userRole === 'admin' || userRole === 'manager';
  
  console.log('Assembleias - userRole:', userRole, 'isAdmin:', isAdmin);

  useEffect(() => {
    fetchAssemblies();
    fetchTotalResidents();
  }, []);

  // Bloquear scroll do body quando modal aberto
  useEffect(() => {
    if (isConveneModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isConveneModalOpen]);

  const fetchAssemblies = async () => {
    setIsLoading(true);
    try {
      console.log('Fetching assemblies, currentUser:', currentUser);
      
      const { data, error } = await supabase
        .from('assemblies')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching assemblies:', error);
        throw error;
      }

      console.log('Assemblies data:', data);

      if (!data || data.length === 0) {
        setAssemblies(INITIAL_ASSEMBLEIAS);
        setIsLoading(false);
        return;
      }

      // Fetch ALL votes for the relevant assemblies in one go to be more efficient
      const assemblyIds = (data || []).map((a: any) => a.id);
      const { data: allVotes, error: votesError } = await supabase
        .from('assembly_votes')
        .select('assembly_id, vote, user_id')
        .in('assembly_id', assemblyIds);

      if (votesError) console.error('Erro ao buscar votos:', votesError);

      const assembliesWithVotes = (data || []).map((a: any) => {
        const votes = allVotes?.filter((v: any) => v.assembly_id === a.id) || [];
        const votesCount = votes.length;
        
        // Check if current user already voted using the loaded list
        const userVoted = currentUser ? votes.some((v: any) => v.user_id === currentUser.id) : false;

        const results = votes.reduce((acc: any, v: any) => {
          acc[v.vote] = (acc[v.vote] || 0) + 1;
          return acc;
        }, { aprovo: 0, rejeito: 0, abstencao: 0 });

        return {
          id: a.id,
          title: a.title,
          description: a.description,
          date: a.start_date,
          startDate: a.start_date,
          endDate: a.end_date,
          type: a.assembly_type,
          status: a.status,
          votesCount,
          results,
          minutesUrl: a.minutes_url,
          userVoted
        };
      });

      setAssemblies(assembliesWithVotes);
      
      // Set hasVoted based on active assembly
      const active = assembliesWithVotes.find((a: any) => a.status === 'active');
      if (active) {
        setHasVoted(active.userVoted || false);
      }
    } catch (err) {
      console.log('Fallback:', err);
      setAssemblies(INITIAL_ASSEMBLEIAS);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTotalResidents = async () => {
    try {
      const { count } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'resident')
        .eq('status', 'active');
      setTotalResidents(count || 5);
    } catch {
      setTotalResidents(5);
    }
  };

  const activeAssembly = useMemo(() => assemblies.find(a => a.status === 'active'), [assemblies]);
  const pastAssemblies = useMemo(() => assemblies.filter(a => a.status === 'closed'), [assemblies]);

  // Atualizar hasVoted quando activeAssembly mudar
  useEffect(() => {
    if (activeAssembly) {
      const activeAny = activeAssembly as any;
      setHasVoted(activeAny.userVoted || false);
    }
  }, [activeAssembly]);

  const currentQuorum = useMemo(() => {
    if (!activeAssembly || totalResidents === 0) return 0;
    return Math.round((activeAssembly.votesCount / totalResidents) * 100);
  }, [activeAssembly, totalResidents]);

  const handleVote = async (option: 'aprovo' | 'rejeito' | 'abstencao') => {
    if (!activeAssembly || !currentUser) return;
    
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('assembly_votes')
        .insert({
          assembly_id: activeAssembly.id,
          user_id: currentUser.id,
          vote: option
        });

      if (error) throw error;

      // Registrar auditoria
      await supabase.from('assembly_audit').insert({
        assembly_id: activeAssembly.id,
        action: 'VOTE',
        user_id: currentUser.id,
        details: `Votou: ${option}`
      });

      await fetchAssemblies();
      setHasVoted(true);
      setIsVoteModalOpen(false);
      alert('Seu voto foi registrado com sucesso!');
    } catch (err: any) {
      console.error(err);
      if (err.message.includes('duplicate')) {
        alert('Você já votou nesta assembleia!');
      } else {
        alert(err.message || 'Erro ao registrar voto');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseAssembly = async () => {
    if (!activeAssembly || !currentUser) return;
    if (!window.confirm('Deseja encerrar esta assembleia agora?')) return;
    
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('assemblies')
        .update({ status: 'closed', updated_at: new Date().toISOString() })
        .eq('id', activeAssembly.id);

      if (error) throw error;

      // Auditoria
      await supabase.from('assembly_audit').insert({
        assembly_id: activeAssembly.id,
        user_id: currentUser.id,
        action: 'CLOSE',
        details: `Encerrada por ${currentUser.name}`
      });

      await fetchAssemblies();
      alert('Assembleia encerrada.');
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConvene = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!currentUser) return;

    setIsLoading(true);
    try {
      const formData = new FormData(e.currentTarget);
      const startDate = formData.get('startDate') as string;
      const endDate = formData.get('endDate') as string;

      const { data, error } = await supabase
        .from('assemblies')
        .insert({
          created_by: currentUser.id,
          title: formData.get('title') as string,
          description: formData.get('description') as string,
          assembly_type: formData.get('type') as string,
          start_date: startDate,
          end_date: endDate,
          status: 'active'
        })
        .select()
        .single();

      if (error) throw error;

      // Auditoria
      await supabase.from('assembly_audit').insert({
        assembly_id: data.id,
        user_id: currentUser.id,
        action: 'CREATE',
        details: `Criada por ${currentUser.name}`
      });

      await fetchAssemblies();
      setIsConveneModalOpen(false);
      alert('Assembleia criada com sucesso!');
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Erro ao criar');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAssembly = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm('Deseja realmente excluir o registro desta assembleia?')) {
      setAssemblies(prev => prev.filter(a => a.id !== id));
    }
  };

  const handleViewAta = (url: string) => {
    window.open('https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', '_blank');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setFilePreview(file.name);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tighter uppercase">Assembleias Online</h2>
          <p className="text-sm text-gray-500 font-medium">Gestão democrática baseada em {totalResidents} unidades.</p>
        </div>
        {isAdmin && (
          <button 
            onClick={() => setIsConveneModalOpen(true)}
            className="mycond-bg-yellow text-slate-900 px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-yellow-100 hover:bg-yellow-500 transition-all active:scale-95"
          >
            Convocar Assembleia
          </button>
        )}
      </header>

      {/* Assembleia Ativa */}
      {activeAssembly ? (
        <div className="bg-slate-900 text-white p-10 rounded-[3rem] relative overflow-hidden shadow-2xl border border-white/5 group">
          <div className="absolute top-0 right-0 w-96 h-96 bg-yellow-400/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-[100px]"></div>
          <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start gap-10">
             <div className="flex-1">
               <span className="px-5 py-2 bg-red-500/20 text-red-400 border border-red-500/30 rounded-full text-[10px] font-black uppercase tracking-widest mb-6 inline-block animate-pulse">Votação Aberta</span>
               <h3 className="text-3xl font-black mb-3 uppercase tracking-tighter leading-tight">{activeAssembly.title}</h3>
               <p className="text-gray-400 text-sm max-w-lg mb-8 font-medium leading-relaxed">{activeAssembly.description}</p>
               
               <div className="flex flex-wrap gap-4">
                 {!hasVoted ? (
                   <button 
                     onClick={() => setIsVoteModalOpen(true)}
                     className="bg-yellow-400 text-slate-900 px-12 py-5 rounded-[2rem] font-black text-[11px] uppercase tracking-[0.2em] hover:bg-yellow-500 transition-all shadow-2xl shadow-yellow-400/20 active:scale-95"
                   >
                     Votar Agora
                   </button>
                 ) : (
                   <div className="px-8 py-5 bg-emerald-500 text-white rounded-[2rem] font-black text-[11px] uppercase tracking-widest flex items-center gap-3">
                     <i className="fa-solid fa-circle-check"></i>
                     Voto Registrado
                   </div>
                 )}
                 
                 <button 
                   onClick={() => setShowPartialResults(!showPartialResults)}
                   className="bg-white/10 backdrop-blur-md text-white px-8 py-5 rounded-[2rem] font-black text-[11px] uppercase tracking-widest hover:bg-white/20 transition-all border border-white/10"
                 >
                   {showPartialResults ? 'Ocultar Parciais' : 'Ver Resultados Parciais'}
                 </button>

                 {isAdmin && (
                   <button 
                    onClick={handleCloseAssembly}
                    className="bg-red-500/10 text-red-400 border border-red-500/20 px-8 py-5 rounded-[2rem] font-black text-[11px] uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all"
                   >
                     Encerrar Assembleia
                   </button>
                 )}
               </div>
             </div>
             
             <div className="w-full lg:w-80 space-y-6">
                <div className="bg-white/5 backdrop-blur-xl p-8 rounded-[3rem] border border-white/10 shadow-inner">
                   <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest mb-4 text-center">Quórum Atual</p>
                   <div className="text-6xl font-black mb-4 tracking-tighter text-center">{currentQuorum}%</div>
                   <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden mb-4">
                      <div className="h-full bg-yellow-400 rounded-full transition-all duration-1000" style={{ width: `${currentQuorum}%` }}></div>
                   </div>
                   <p className="text-[10px] text-gray-400 font-bold uppercase text-center tracking-widest">
                     {activeAssembly.votesCount} de {totalResidents} moradores votaram
                   </p>
                </div>

                {showPartialResults && activeAssembly.results && (
                  <div className="bg-slate-800 p-8 rounded-[3rem] border border-white/5 shadow-xl animate-in slide-in-from-top-4 duration-500">
                     <p className="text-[10px] text-gray-400 uppercase font-black tracking-[0.2em] mb-6 border-b border-white/5 pb-4">Consolidação Parcial</p>
                     <div className="space-y-4">
                        <div className="space-y-1">
                           <div className="flex justify-between text-[10px] font-black uppercase text-emerald-400"><span>Favoráveis</span><span>{activeAssembly.results.aprovo}</span></div>
                           <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                              <div className="h-full bg-emerald-500" style={{ width: `${(activeAssembly.results.aprovo / (activeAssembly.votesCount || 1)) * 100}%` }}></div>
                           </div>
                        </div>
                        <div className="space-y-1">
                           <div className="flex justify-between text-[10px] font-black uppercase text-red-400"><span>Contrários</span><span>{activeAssembly.results.rejeito}</span></div>
                           <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                              <div className="h-full bg-red-500" style={{ width: `${(activeAssembly.results.rejeito / (activeAssembly.votesCount || 1)) * 100}%` }}></div>
                           </div>
                        </div>
                        <div className="space-y-1">
                           <div className="flex justify-between text-[10px] font-black uppercase text-gray-400"><span>Abstenções</span><span>{activeAssembly.results.abstencao}</span></div>
                           <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                              <div className="h-full bg-slate-500" style={{ width: `${(activeAssembly.results.abstencao / (activeAssembly.votesCount || 1)) * 100}%` }}></div>
                           </div>
                        </div>
                     </div>
                  </div>
                )}
             </div>
          </div>
        </div>
      ) : (
        <div className="p-16 text-center bg-white rounded-[3rem] border-2 border-dashed border-gray-100 flex flex-col items-center">
           <i className="fa-solid fa-comments-slash text-5xl text-gray-200 mb-6"></i>
           <p className="text-gray-400 font-black uppercase tracking-widest text-xs">Sem votações em curso no momento.</p>
        </div>
      )}

      {/* Histórico e Atas */}
      <div className="bg-white rounded-[3rem] shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-10 py-8 bg-gray-50/50 border-b border-gray-100 flex justify-between items-center">
          <h4 className="font-black text-slate-800 text-[10px] uppercase tracking-[0.2em]">Acervo de Decisões e Atas Consolidadas</h4>
          <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Total: {pastAssemblies.length} Documentos</span>
        </div>
        <div className="divide-y divide-gray-50">
          {pastAssemblies.map(ata => {
            const isApproved = (ata.results?.aprovo || 0) > (ata.results?.rejeito || 0);
            return (
              <div key={ata.id} className="p-8 flex flex-col md:flex-row md:items-center justify-between hover:bg-slate-50 transition-all group gap-6">
                <div className="flex items-center space-x-6">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner transition-colors ${isApproved ? 'bg-emerald-50 text-emerald-500 group-hover:bg-emerald-500 group-hover:text-white' : 'bg-red-50 text-red-500 group-hover:bg-red-500 group-hover:text-white'}`}>
                    <i className={`fa-solid ${isApproved ? 'fa-circle-check' : 'fa-circle-xmark'} text-2xl`}></i>
                  </div>
                  <div>
                    <div className="flex items-center gap-3">
                      <p className="font-black text-slate-800 text-sm uppercase tracking-tight">{ata.title}</p>
                      <span className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest ${isApproved ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                        {isApproved ? 'Aprovado' : 'Rejeitado'}
                      </span>
                    </div>
                    <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest mt-1">
                      {ata.type} • {new Date(ata.date + 'T12:00:00').toLocaleDateString('pt-BR')} • Decidido por {ata.votesCount} votos
                    </p>
                  </div>
                </div>
                
                <div className="flex space-x-3 items-center justify-end">
                  <button 
                    onClick={() => setViewingAssembly(ata)}
                    className="px-5 py-2.5 bg-white border border-slate-200 text-slate-400 hover:bg-slate-900 hover:text-white rounded-xl transition-all shadow-sm flex items-center gap-2 text-[10px] font-black uppercase"
                  >
                    <i className="fa-solid fa-chart-simple"></i>
                    <span>Ver Resultado</span>
                  </button>

                  {ata.minutesUrl && (
                    <button 
                      onClick={() => handleViewAta(ata.minutesUrl!)}
                      className="w-11 h-11 bg-white border border-slate-200 text-slate-400 hover:bg-blue-500 hover:text-white rounded-xl transition-all shadow-sm flex items-center justify-center"
                    >
                      <i className="fa-solid fa-download"></i>
                    </button>
                  )}

                  {isAdmin && (
                    <button 
                      onClick={(e) => handleDeleteAssembly(e, ata.id)}
                      className="w-11 h-11 bg-white border border-slate-200 text-red-300 hover:bg-red-500 hover:text-white rounded-xl transition-all shadow-sm flex items-center justify-center"
                    >
                      <i className="fa-solid fa-trash-can"></i>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* MODAL: RESULTADOS DETALHADOS */}
      {viewingAssembly && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/95 backdrop-blur-xl animate-in fade-in" onClick={() => setViewingAssembly(null)}></div>
          <div className="relative bg-white w-full max-w-2xl rounded-[4rem] shadow-2xl p-12 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto scrollbar-hide">
             <div className="text-center mb-10">
                <div className={`w-24 h-24 rounded-[2.5rem] flex items-center justify-center mx-auto mb-6 text-4xl shadow-xl ${((viewingAssembly.results?.aprovo || 0) > (viewingAssembly.results?.rejeito || 0)) ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>
                   <i className={`fa-solid ${((viewingAssembly.results?.aprovo || 0) > (viewingAssembly.results?.rejeito || 0)) ? 'fa-check-double' : 'fa-xmark'}`}></i>
                </div>
                <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">{viewingAssembly.title}</h3>
                <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-2">Resultado Final Consolidado</p>
             </div>

             <div className="space-y-8 mb-10">
                <div className="bg-slate-50 p-10 rounded-[3rem] border border-gray-100 shadow-inner">
                   <div className="grid grid-cols-1 gap-6">
                      <div className="space-y-2">
                        <div className="flex justify-between items-end mb-1">
                           <span className="text-xs font-black text-emerald-600 uppercase tracking-widest">A favor da Pauta</span>
                           <span className="text-sm font-black text-slate-800">{viewingAssembly.results?.aprovo || 0} Votos</span>
                        </div>
                        <div className="h-4 bg-slate-200 rounded-full overflow-hidden">
                           <div className="h-full bg-emerald-500 rounded-full shadow-lg" style={{ width: `${(viewingAssembly.results?.aprovo || 0) / (viewingAssembly.votesCount || 1) * 100}%` }}></div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between items-end mb-1">
                           <span className="text-xs font-black text-red-600 uppercase tracking-widest">Contra a Pauta</span>
                           <span className="text-sm font-black text-slate-800">{viewingAssembly.results?.rejeito || 0} Votos</span>
                        </div>
                        <div className="h-4 bg-slate-200 rounded-full overflow-hidden">
                           <div className="h-full bg-red-500 rounded-full shadow-lg" style={{ width: `${(viewingAssembly.results?.rejeito || 0) / (viewingAssembly.votesCount || 1) * 100}%` }}></div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between items-end mb-1">
                           <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Abstenções</span>
                           <span className="text-sm font-black text-slate-800">{viewingAssembly.results?.abstencao || 0} Votos</span>
                        </div>
                        <div className="h-4 bg-slate-200 rounded-full overflow-hidden">
                           <div className="h-full bg-slate-400 rounded-full shadow-lg" style={{ width: `${(viewingAssembly.results?.abstencao || 0) / (viewingAssembly.votesCount || 1) * 100}%` }}></div>
                        </div>
                      </div>
                   </div>
                </div>

                <div className="flex justify-center gap-10">
                   <div className="text-center">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Quórum</p>
                      <p className="text-xl font-black text-slate-900">{Math.round((viewingAssembly.votesCount / totalResidents)*100)}%</p>
                   </div>
                   <div className="text-center">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Decisão</p>
                      <p className={`text-xl font-black uppercase ${((viewingAssembly.results?.aprovo || 0) > (viewingAssembly.results?.rejeito || 0)) ? 'text-emerald-500' : 'text-red-500'}`}>
                        {((viewingAssembly.results?.aprovo || 0) > (viewingAssembly.results?.rejeito || 0)) ? 'Aprovada' : 'Rejeitada'}
                      </p>
                   </div>
                </div>
             </div>

             <div className="flex gap-4">
                <button onClick={() => setViewingAssembly(null)} className="flex-1 py-6 bg-slate-900 text-white rounded-[2.5rem] font-black uppercase text-xs tracking-widest shadow-2xl active:scale-95 transition-all">Fechar Resultados</button>
                {viewingAssembly.minutesUrl && (
                  <button onClick={() => handleViewAta(viewingAssembly.minutesUrl!)} className="flex-1 py-6 mycond-bg-blue text-white rounded-[2.5rem] font-black uppercase text-xs tracking-widest shadow-2xl flex items-center justify-center gap-3 hover:bg-slate-800">
                    <i className="fa-solid fa-file-pdf"></i>
                    <span>Ver Ata Digital</span>
                  </button>
                )}
             </div>
          </div>
        </div>
      )}

{/* MODAL: CONVOCAR ASSEMBLEIA */}
      {isConveneModalOpen && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-2 sm:p-4 overflow-auto">
          <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-2xl animate-in fade-in" onClick={() => setIsConveneModalOpen(false)}></div>
          <div className="relative bg-white w-full max-w-lg rounded-2xl sm:rounded-[4rem] shadow-2xl my-8 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
             <div className="sticky top-0 bg-blue-900 text-white px-6 py-6 sm:px-12 sm:py-10 flex justify-between items-center z-10">
                <div>
                   <h3 className="text-xl sm:text-2xl font-black uppercase tracking-tighter">Convocar Assembleia</h3>
                   <p className="text-[9px] sm:text-[10px] text-blue-300 font-bold uppercase tracking-widest">Painel WM</p>
                </div>
                <button onClick={() => setIsConveneModalOpen(false)} className="w-10 h-10 sm:w-12 sm:h-12 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors">
                  <i className="fa-solid fa-xmark text-lg sm:text-xl"></i>
                </button>
             </div>
             <form onSubmit={handleConvene} className="p-4 sm:p-10 space-y-4 sm:space-y-6">
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Título da Assembleia</label>
                   <input required name="title" type="text" className="w-full bg-slate-50 border-none rounded-xl sm:rounded-2xl px-4 sm:px-6 py-3 sm:py-4 font-black text-slate-800 shadow-inner text-sm" placeholder="Ex: Reforma da Fachada" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-6">
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Início</label>
                      <input required name="startDate" type="datetime-local" className="w-full bg-slate-50 border-none rounded-xl sm:rounded-2xl px-4 sm:px-6 py-3 sm:py-4 font-black text-slate-800 shadow-inner text-sm" />
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Término</label>
                      <input required name="endDate" type="datetime-local" className="w-full bg-slate-50 border-none rounded-xl sm:rounded-2xl px-4 sm:px-6 py-3 sm:py-4 font-black text-slate-800 shadow-inner text-sm" />
                   </div>
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Classificação</label>
                   <select required name="type" className="w-full bg-slate-50 border-none rounded-xl sm:rounded-2xl px-4 sm:px-6 py-3 sm:py-4 font-black text-slate-800 shadow-inner text-sm">
                      <option value="ORDINÁRIA">ORDINÁRIA</option>
                      <option value="EXTRAORDINÁRIA">EXTRAORDINÁRIA</option>
                   </select>
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Pauta e Descritivo</label>
                   <textarea required name="description" rows={3} className="w-full bg-slate-50 border-none rounded-xl sm:rounded-2xl px-4 sm:px-6 py-3 sm:py-4 font-black text-slate-800 shadow-inner resize-none text-sm" placeholder="Descreva os itens a serem votados..."></textarea>
                </div>
                <button type="submit" className="w-full py-4 sm:py-6 mycond-bg-yellow text-slate-900 rounded-xl sm:rounded-2xl font-bold uppercase text-xs tracking-widest shadow-lg hover:bg-yellow-500 transition-all">
                  Publicar Convocação
                </button>
             </form>
          </div>
        </div>
      )}

      {/* MODAL: CÉDULA DE VOTAÇÃO */}
      {isVoteModalOpen && activeAssembly && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/95 backdrop-blur-3xl animate-in fade-in" onClick={() => setIsVoteModalOpen(false)}></div>
          <div className="relative bg-white w-full max-w-lg rounded-[4rem] shadow-2xl overflow-hidden animate-in zoom-in-95">
             <div className="px-10 py-12 text-center border-b border-gray-50">
                <div className="w-20 h-20 bg-yellow-50 text-yellow-500 rounded-[2rem] flex items-center justify-center mx-auto mb-6 text-3xl shadow-inner border border-yellow-100">
                   <i className="fa-solid fa-box-archive"></i>
                </div>
                <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter mb-2">Cédula de Votação</h3>
                <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">{activeAssembly.title}</p>
             </div>
             
             <div className="p-10 space-y-6">
                <p className="text-xs text-gray-500 font-bold text-center leading-relaxed px-4">Por favor, selecione sua posição oficial. Seu voto é registrado de forma única para sua unidade.</p>
                
                <div className="grid grid-cols-1 gap-4 pt-4">
                   <button onClick={() => handleVote('aprovo')} className="w-full py-5 bg-emerald-50 text-emerald-600 border-2 border-emerald-100 rounded-3xl font-black uppercase text-xs tracking-widest hover:bg-emerald-500 hover:text-white hover:border-emerald-500 transition-all active:scale-[0.98] flex items-center justify-center space-x-3">
                      <i className="fa-solid fa-thumbs-up"></i>
                      <span>Aprovo a Pauta</span>
                   </button>
                   <button onClick={() => handleVote('rejeito')} className="w-full py-5 bg-red-50 text-red-600 border-2 border-red-100 rounded-3xl font-black uppercase text-xs tracking-widest hover:bg-red-500 hover:text-white hover:border-red-500 transition-all active:scale-[0.98] flex items-center justify-center space-x-3">
                      <i className="fa-solid fa-thumbs-down"></i>
                      <span>Rejeito a Pauta</span>
                   </button>
                   <button onClick={() => handleVote('abstencao')} className="w-full py-5 bg-slate-50 text-slate-400 border-2 border-slate-100 rounded-3xl font-black uppercase text-xs tracking-widest hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all active:scale-[0.98] flex items-center justify-center space-x-3">
                      <i className="fa-solid fa-hand"></i>
                      <span>Abstenção / Neutro</span>
                   </button>
                </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Assembleias;
