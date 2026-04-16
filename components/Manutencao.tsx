
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { MaintenanceJob, OperationCertificate } from '../types';
import { supabase } from '../lib/supabase';

const Manutencao: React.FC = () => {
  const [jobs, setJobs] = useState<MaintenanceJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeCertModal, setActiveCertModal] = useState<'AVCB' | 'AGUA' | null>(null);
  const [viewingJob, setViewingJob] = useState<MaintenanceJob | null>(null);
  const [activeActionMenu, setActiveActionMenu] = useState<string | null>(null);
  
  const [avcb, setAvcb] = useState<OperationCertificate | null>(null);
  const [agua, setAgua] = useState<OperationCertificate | null>(null);
  
  // Filtros
  const [filterArea, setFilterArea] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterResponsible, setFilterResponsible] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: jobsData } = await supabase
        .from('manutencao')
        .select('id, title, area, type, date, time, status, responsible, invoice_url')
        .order('date', { ascending: true });
      
      if (jobsData) {
        setJobs(jobsData.map((j: any) => ({
          id: j.id,
          task: j.title || j.task || '',
          area: j.area || '',
          type: j.type as 'PREVENTIVA' | 'CORRETIVA',
          date: j.date,
          time: j.time,
          status: j.status === 'pendente' ? 'scheduled' : j.status === 'concluido' ? 'done' : (j.status as 'scheduled' | 'done' | 'cancelled' | 'delayed'),
          responsible: j.responsible || '',
          invoiceUrl: j.invoice_url
        })));
      }

      const { data: certsData } = await supabase
        .from('certificados_operacionais')
        .select('*');
      
      if (certsData) {
        console.log('Certificates data:', certsData);
        setAvcb(certsData.find((c: any) => c.id === 'AVCB') ? {
          id: certsData.find((c: any) => c.id === 'AVCB').id,
          name: certsData.find((c: any) => c.id === 'AVCB').name,
          expiryDate: certsData.find((c: any) => c.id === 'AVCB').expiry_date,
          lastAnalysisDate: certsData.find((c: any) => c.id === 'AVCB').last_analysis_date,
          fileUrl: certsData.find((c: any) => c.id === 'AVCB').file_url,
          status: certsData.find((c: any) => c.id === 'AVCB').status
        } : null);
        setAgua(certsData.find((c: any) => c.id === 'AGUA') ? {
          id: certsData.find((c: any) => c.id === 'AGUA').id,
          name: certsData.find((c: any) => c.id === 'AGUA').name,
          expiryDate: certsData.find((c: any) => c.id === 'AGUA').expiry_date,
          lastAnalysisDate: certsData.find((c: any) => c.id === 'AGUA').last_analysis_date,
          fileUrl: certsData.find((c: any) => c.id === 'AGUA').file_url,
          status: certsData.find((c: any) => c.id === 'AGUA').status
        } : null);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const sortedJobs = useMemo(() => {
    return [...jobs].sort((a, b) => {
      const dateTimeA = `${a.date}T${a.time}`;
      const dateTimeB = `${b.date}T${b.time}`;
      return dateTimeA.localeCompare(dateTimeB);
    });
  }, [jobs]);

  // Jobs filtrados
  const filteredJobs = useMemo(() => {
    return sortedJobs.filter(job => {
      if (filterArea && job.area !== filterArea) return false;
      if (filterType && job.type !== filterType) return false;
      if (filterStatus && job.status !== filterStatus) return false;
      if (filterResponsible && !job.responsible.toLowerCase().includes(filterResponsible.toLowerCase())) return false;
      if (filterDateFrom && job.date < filterDateFrom) return false;
      if (filterDateTo && job.date > filterDateTo) return false;
      return true;
    });
  }, [sortedJobs, filterArea, filterType, filterStatus, filterResponsible, filterDateFrom, filterDateTo]);

  const nextService = useMemo(() => {
    return sortedJobs.find(j => j.status === 'scheduled');
  }, [sortedJobs]);

  const handleAddJob = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    try {
      const { error } = await supabase.from('manutencao').insert({
        title: (formData.get('task') as string).toUpperCase(),
        area: (formData.get('area') as string).toUpperCase(),
        type: formData.get('type'),
        date: formData.get('date'),
        time: formData.get('time'),
        responsible: (formData.get('responsible') as string).toUpperCase(),
        status: 'scheduled'
      });

      if (error) {
        console.error('Insert error:', error);
        throw error;
      }
      
      setIsModalOpen(false);
      setFilePreview(null);
      fetchData();
      alert('Manutenção agendada com sucesso!');
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Erro ao agendar manutenção');
    }
  };

  const updateJobStatus = async (id: string, newStatus: MaintenanceJob['status']) => {
    try {
      const { error } = await supabase
        .from('manutencao')
        .update({ status: newStatus })
        .eq('id', id);
      
      if (error) {
        console.error('Update error:', error);
        alert('Erro ao atualizar: ' + error.message);
        return;
      }
      setActiveActionMenu(null);
      fetchData();
      alert(newStatus === 'done' ? 'Serviço marcado como concluído!' : 'Serviço cancelado!');
    } catch (err) {
      console.error(err);
      alert('Erro ao atualizar status');
      setActiveActionMenu(null);
      fetchData();
    }
  };

  const deleteJob = async (id: string) => {
    if (window.confirm("Deseja realmente excluir este agendamento?")) {
      try {
        const { error } = await supabase.from('manutencao').delete().eq('id', id);
        if (error) throw error;
        setActiveActionMenu(null);
        fetchData();
      } catch (err) {
        console.error(err);
        setActiveActionMenu(null);
        fetchData();
      }
    }
  };

  const handleUpdateCert = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const certId = activeCertModal;
    
    if (!certId) return;

    try {
      const { error } = await supabase
        .from('certificados_operacionais')
        .update({
          expiry_date: formData.get('expiryDate'),
          last_analysis_date: formData.get('lastAnalysisDate') || null,
          file_url: filePreview || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', certId);

      if (error) throw error;

      setActiveCertModal(null);
      setFilePreview(null);
      fetchData();
      alert('Certificado atualizado!');
    } catch (err) {
      console.error(err);
      setActiveCertModal(null);
      setFilePreview(null);
      fetchData();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFilePreview(file.name);
    }
  };

  if (loading) {
    return (
      <div className="p-20 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400"></div>
        <p className="text-gray-400 font-black text-xs uppercase mt-4">Sincronizando...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20 no-print">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tighter uppercase">Gestão Operacional</h2>
          <p className="text-sm text-gray-500 font-medium italic">Monitoramento e manutenção preventiva predial.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="mycond-bg-yellow text-slate-900 px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-yellow-100 hover:bg-yellow-500 transition-all active:scale-95"
        >
          + Nova Manutenção
        </button>
      </header>

      {/* Cards de Indicadores */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm relative overflow-hidden group">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Próximo Serviço</p>
          {nextService ? (
            <div className="flex items-center space-x-4">
              <div className="w-14 h-14 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center text-2xl shadow-inner group-hover:bg-blue-500 group-hover:text-white transition-all">
                <i className="fa-solid fa-wrench"></i>
              </div>
              <div>
                <span className="block font-black text-slate-800 text-lg leading-tight uppercase">
                  {nextService.task}
                </span>
                <p className="text-[11px] text-gray-500 font-bold uppercase mt-1 tracking-widest italic">
                  {new Date(nextService.date + 'T12:00:00').toLocaleDateString('pt-BR')} às {nextService.time} - {nextService.area}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-xs text-gray-300 font-bold italic">Nenhum agendamento ativo.</p>
          )}
          <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-blue-50/50 rounded-full blur-2xl group-hover:bg-blue-100 transition-all"></div>
        </div>

        <div onClick={() => setActiveCertModal('AVCB')} className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm group cursor-pointer hover:border-red-100 transition-all relative overflow-hidden">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Certificado Bombeiro (AVCB)</p>
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center text-2xl shadow-inner group-hover:scale-110 transition-transform">
              <i className="fa-solid fa-fire-extinguisher"></i>
            </div>
            <div>
              {avcb ? (
                <>
                  <span className="block font-black text-slate-800 text-lg leading-tight uppercase">
                    {avcb?.expiryDate ? `Vence em ${Math.ceil((new Date(avcb.expiryDate).getTime() - new Date().getTime()) / (1000 * 3600 * 24))} dias` : 'Sem data'}
                  </span>
                  <p className="text-[11px] text-gray-500 font-bold uppercase mt-1 tracking-widest italic">Vencimento: {avcb?.expiryDate?.split('-').reverse().join('/')}</p>
                </>
              ) : (
                <span className="text-xs text-gray-400 font-bold italic">Não cadastrado</span>
              )}
            </div>
          </div>
          <div className="absolute top-8 right-8 text-gray-200 group-hover:text-red-400 transition-colors">
            <i className="fa-solid fa-pen-to-square"></i>
          </div>
        </div>

        <div onClick={() => setActiveCertModal('AGUA')} className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm group cursor-pointer hover:border-cyan-100 transition-all relative overflow-hidden">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Qualidade da Água</p>
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 bg-cyan-50 text-cyan-500 rounded-2xl flex items-center justify-center text-2xl shadow-inner group-hover:scale-110 transition-transform">
              <i className="fa-solid fa-droplet"></i>
            </div>
            <div>
              {agua ? (
                <>
                  <span className="block font-black text-slate-800 text-lg leading-tight uppercase">
                    {agua?.expiryDate ? `Vence em ${Math.ceil((new Date(agua.expiryDate).getTime() - new Date().getTime()) / (1000 * 3600 * 24))} dias` : 'Sem data'}
                  </span>
                  <p className="text-[11px] text-gray-500 font-bold uppercase mt-1 tracking-widest italic">Última: {agua?.lastAnalysisDate?.split('-').reverse().join('/') || 'N/A'} | Próx: {agua?.expiryDate?.split('-').reverse().join('/')}</p>
                </>
              ) : (
                <span className="text-xs text-gray-400 font-bold italic">Não cadastrado</span>
              )}
            </div>
          </div>
          <div className="absolute top-8 right-8 text-gray-200 group-hover:text-cyan-400 transition-colors">
            <i className="fa-solid fa-pen-to-square"></i>
          </div>
        </div>
      </div>

      {/* Cronograma de Serviços (Tabela Ordenada) */}
      <div className="bg-white rounded-[3rem] shadow-sm border border-gray-100 overflow-hidden relative z-0">
        <div className="px-10 py-8 bg-gray-50/50 border-b border-gray-100 flex flex-wrap justify-between items-center gap-4">
          <h4 className="font-black text-slate-800 text-[10px] uppercase tracking-[0.2em]">Cronograma de Serviços</h4>
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{filteredJobs.length} de {sortedJobs.length} tarefas</span>
        </div>
        
        {/* Filtros */}
        <div className="px-10 py-6 border-b border-gray-100 bg-slate-50/30">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <div className="space-y-1">
              <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Área</label>
              <select value={filterArea} onChange={(e) => setFilterArea(e.target.value)} className="w-full bg-white border-none rounded-xl px-4 py-3 font-black text-xs text-slate-800 shadow-sm">
                <option value="">Todas</option>
                <option value="LIMPEZA">Limpeza</option>
                <option value="PISCINA">Piscina</option>
                <option value="BOMBEIRO">Bombeiro</option>
                <option value="CAIXA D ÁGUA">Caixa d'Água</option>
                <option value="ESGOTO">Esgoto</option>
                <option value="GERAL">Geral</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Tipo</label>
              <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="w-full bg-white border-none rounded-xl px-4 py-3 font-black text-xs text-slate-800 shadow-sm">
                <option value="">Todos</option>
                <option value="PREVENTIVA">Preventiva</option>
                <option value="CORRETIVA">Corretiva</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Status</label>
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="w-full bg-white border-none rounded-xl px-4 py-3 font-black text-xs text-slate-800 shadow-sm">
                <option value="">Todos</option>
                <option value="scheduled">Agendado</option>
                <option value="done">Concluído</option>
                <option value="cancelled">Cancelado</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Responsável</label>
              <input value={filterResponsible} onChange={(e) => setFilterResponsible(e.target.value)} placeholder="Buscar..." className="w-full bg-white border-none rounded-xl px-4 py-3 font-black text-xs text-slate-800 shadow-sm" />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">De</label>
              <input type="date" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)} className="w-full bg-white border-none rounded-xl px-4 py-3 font-black text-xs text-slate-800 shadow-sm" />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Até</label>
              <input type="date" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)} className="w-full bg-white border-none rounded-xl px-4 py-3 font-black text-xs text-slate-800 shadow-sm" />
            </div>
          </div>
          {(filterArea || filterType || filterStatus || filterResponsible || filterDateFrom || filterDateTo) && (
            <button onClick={() => { setFilterArea(''); setFilterType(''); setFilterStatus(''); setFilterResponsible(''); setFilterDateFrom(''); setFilterDateTo(''); }} className="mt-4 px-4 py-2 text-[10px] font-black uppercase text-red-500 hover:bg-red-50 rounded-xl transition-colors">
              <i className="fa-solid fa-times-circle mr-1"></i> Limpar Filtros
            </button>
          )}
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-gray-400 text-[10px] uppercase font-black border-b border-gray-50">
                <th className="px-10 py-6">Serviço / Área</th>
                <th className="px-6 py-6 text-center">Tipo</th>
                <th className="px-6 py-6">Data / Hora</th>
                <th className="px-6 py-6">Responsável</th>
                <th className="px-6 py-6 text-center">Status</th>
                <th className="px-10 py-6 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredJobs.map(job => (
                <tr key={job.id} className="group hover:bg-slate-50 transition-all">
                  <td className="px-10 py-6">
                    <p className="font-black text-slate-800 text-xs uppercase tracking-tight">{job.task}</p>
                    <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest mt-1">{job.area}</p>
                  </td>
                  <td className="px-6 py-6 text-center">
                    <span className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest ${job.type === 'PREVENTIVA' ? 'bg-blue-50 text-blue-500 border border-blue-100' : 'bg-orange-50 text-orange-600 border border-orange-100'}`}>
                      {job.type}
                    </span>
                  </td>
                  <td className="px-6 py-6">
                    <p className="font-black text-slate-800 text-xs">{job.date.split('-').reverse().join('/')}</p>
                    <p className="text-[10px] text-gray-400 font-black tracking-widest">{job.time}</p>
                  </td>
                  <td className="px-6 py-6">
                    <p className="font-black text-slate-600 text-xs uppercase">{job.responsible}</p>
                  </td>
                  <td className="px-6 py-6 text-center">
                    <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                      job.status === 'done' ? 'bg-emerald-50 text-emerald-500 border-emerald-100' :
                      job.status === 'cancelled' ? 'bg-red-50 text-red-400 border-red-100' :
                      'bg-blue-50 text-blue-500 border-blue-100'
                    }`}>
                      {job.status === 'done' ? 'Concluído' : job.status === 'cancelled' ? 'Cancelado' : 'Agendado'}
                    </span>
                  </td>
                  <td className="px-10 py-6 text-right relative overflow-visible">
                    <div className="flex justify-end space-x-2 items-center">
                      {job.invoiceUrl && (
                        <div className="w-8 h-8 bg-slate-50 text-slate-300 rounded-lg flex items-center justify-center mr-2">
                           <i className="fa-solid fa-file-invoice text-sm"></i>
                        </div>
                      )}
                      <button onClick={() => setActiveActionMenu(activeActionMenu === job.id ? null : job.id)} className="w-11 h-11 bg-white border border-slate-200 text-slate-400 hover:bg-slate-900 hover:text-white rounded-2xl transition-all shadow-sm active:scale-95">
                        <i className="fa-solid fa-ellipsis"></i>
                      </button>
                    </div>

                    {activeActionMenu === job.id && (
                      <div className="absolute right-10 top-20 bg-white rounded-[2rem] shadow-2xl border border-gray-100 p-3 z-[100] w-52 flex flex-col animate-in zoom-in-95">
                        <button onClick={() => { setViewingJob(job); setActiveActionMenu(null); }} className="px-5 py-3 text-left text-[10px] font-black uppercase text-slate-600 hover:bg-slate-50 rounded-xl transition-colors">Visualizar Detalhes</button>
                        {job.status === 'scheduled' && (
                          <>
                            <button onClick={() => { updateJobStatus(job.id, 'done'); }} className="px-5 py-3 text-left text-[10px] font-black uppercase text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors flex items-center">
                               <i className="fa-solid fa-circle-check mr-2"></i> Marcar Concluído
                            </button>
                            <button onClick={() => { updateJobStatus(job.id, 'cancelled'); }} className="px-5 py-3 text-left text-[10px] font-black uppercase text-orange-500 hover:bg-orange-50 rounded-xl transition-colors flex items-center">
                               <i className="fa-solid fa-circle-xmark mr-2"></i> Cancelar Serviço
                            </button>
                          </>
                        )}
                        <button onClick={() => deleteJob(job.id)} className="px-5 py-3 text-left text-[10px] font-black uppercase text-red-500 hover:bg-red-50 rounded-xl transition-colors flex items-center">
                           <i className="fa-solid fa-trash-can mr-2"></i> Excluir Registro
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

      {/* Modal Visualizar Detalhes */}
      {viewingJob && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-xl animate-in fade-in" onClick={() => setViewingJob(null)}></div>
          <div className="relative bg-white w-full max-w-lg rounded-[3.5rem] shadow-2xl p-10 animate-in zoom-in-95">
             <div className="text-center mb-8">
                <div className="w-24 h-24 bg-slate-50 text-slate-900 rounded-[2.5rem] flex items-center justify-center mx-auto mb-4 text-4xl shadow-inner border border-gray-100">
                   <i className="fa-solid fa-screwdriver-wrench"></i>
                </div>
                <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Detalhes da Operação</h3>
                <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-1">Ref. {viewingJob.id}</p>
             </div>
             
             <div className="space-y-4 mb-10">
                <div className="p-6 bg-slate-50 rounded-3xl border border-gray-100 space-y-3">
                   <div className="flex justify-between border-b border-gray-200/50 pb-2">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Serviço</span>
                      <span className="text-xs font-black text-slate-800 uppercase">{viewingJob.task}</span>
                   </div>
                   <div className="flex justify-between border-b border-gray-200/50 pb-2">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Área / Setor</span>
                      <span className="text-xs font-black text-slate-800 uppercase">{viewingJob.area}</span>
                   </div>
                   <div className="flex justify-between border-b border-gray-200/50 pb-2">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Tipo</span>
                      <span className="text-xs font-black text-slate-800 uppercase">{viewingJob.type}</span>
                   </div>
                   <div className="flex justify-between border-b border-gray-200/50 pb-2">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Data e Hora</span>
                      <span className="text-xs font-black text-slate-800">{viewingJob.date.split('-').reverse().join('/')} às {viewingJob.time}</span>
                   </div>
                   <div className="flex justify-between border-b border-gray-200/50 pb-2">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Responsável</span>
                      <span className="text-xs font-black text-slate-800 uppercase">{viewingJob.responsible}</span>
                   </div>
                   <div className="flex justify-between">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Status Atual</span>
                      <span className={`text-[10px] font-black uppercase tracking-widest ${
                        viewingJob.status === 'done' ? 'text-emerald-500' : 
                        viewingJob.status === 'cancelled' ? 'text-red-500' : 'text-blue-500'
                      }`}>{viewingJob.status === 'done' ? 'Concluído' : viewingJob.status === 'cancelled' ? 'Cancelado' : 'Agendado'}</span>
                   </div>
                </div>

                {viewingJob.invoiceUrl && (
                  <div className="space-y-3 pt-2">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block ml-1">Documentação Fiscal Anexa</span>
                    <div className="flex items-center justify-between p-5 bg-emerald-50 border border-emerald-100 rounded-3xl group">
                       <div className="flex items-center space-x-4">
                          <i className="fa-solid fa-file-pdf text-2xl text-emerald-500"></i>
                          <div>
                             <p className="text-xs font-black text-emerald-700 uppercase tracking-tight">Nota_Fiscal_{viewingJob.id}.pdf</p>
                             <p className="text-[9px] text-emerald-400 font-bold uppercase">Documento Verificado</p>
                          </div>
                       </div>
                       <button onClick={() => alert('Download da NF iniciado...')} className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-emerald-600 shadow-sm hover:bg-emerald-600 hover:text-white transition-all active:scale-95">
                          <i className="fa-solid fa-download"></i>
                       </button>
                    </div>
                  </div>
                )}
             </div>

             <button onClick={() => setViewingJob(null)} className="w-full py-6 mycond-bg-blue text-white rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-2xl active:scale-95 transition-all">Fechar Visualização</button>
          </div>
        </div>
      )}

      {/* MODAL: Nova Manutenção */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-2xl animate-in fade-in" onClick={() => setIsModalOpen(false)}></div>
          <div className="relative bg-white w-full max-w-xl rounded-[4rem] shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="px-12 py-10 mycond-bg-blue text-white flex justify-between items-center">
              <div>
                <h3 className="text-3xl font-black uppercase tracking-tighter">Agendar Serviço</h3>
                <p className="text-[10px] text-blue-300 font-bold uppercase tracking-widest">Gestão Operacional MyCond</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="w-14 h-14 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors"><i className="fa-solid fa-xmark text-2xl"></i></button>
            </div>
            <form onSubmit={handleAddJob} className="p-12 space-y-6 max-h-[70vh] overflow-y-auto">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Descrição do Serviço</label>
                <input required name="task" className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 font-black text-slate-800 outline-none focus:ring-4 focus:ring-yellow-400/30 shadow-inner" placeholder="Ex: Limpeza de Caixa d'Água" />
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Área / Setor</label>
                  <select name="area" className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 font-black text-slate-800 shadow-inner appearance-none">
                    <option value="LIMPEZA">Limpeza</option>
                    <option value="PISCINA">Piscina</option>
                    <option value="BOMBEIRO">Bombeiro</option>
                    <option value="CAIXA D ÁGUA">Caixa d'Água</option>
                    <option value="ESGOTO">Esgoto</option>
                    <option value="GERAL">Geral / Outros</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Tipo</label>
                  <select name="type" className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 font-black text-slate-800 shadow-inner appearance-none">
                    <option value="PREVENTIVA">Preventiva</option>
                    <option value="CORRETIVA">Corretiva</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Data Agendada</label>
                  <input required name="date" type="date" className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 font-black text-slate-800 shadow-inner" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Horário</label>
                  <input required name="time" type="time" className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 font-black text-slate-800 shadow-inner" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Responsável / Empresa</label>
                <input required name="responsible" className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 font-black text-slate-800 shadow-inner" placeholder="Ex: AcquaClean" />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Nota Fiscal / Orçamento (Opcional)</label>
                <div onClick={() => fileInputRef.current?.click()} className="w-full py-10 border-4 border-dashed border-gray-100 rounded-[2.5rem] flex flex-col items-center justify-center text-gray-300 hover:border-yellow-200 hover:text-yellow-500 hover:bg-yellow-50/20 transition-all cursor-pointer group">
                  <i className="fa-solid fa-file-arrow-up text-3xl mb-3 group-hover:scale-110 transition-transform"></i>
                  <span className="text-[10px] font-black uppercase tracking-widest">{filePreview ? `Arquivo: ${filePreview}` : 'Clique para buscar PDF/Imagens'}</span>
                </div>
                <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
              </div>

              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => { setIsModalOpen(false); setFilePreview(null); }} className="flex-1 py-5 border-2 border-slate-100 rounded-2xl font-black uppercase text-[10px] tracking-widest text-gray-400 hover:bg-gray-50">Cancelar</button>
                <button type="submit" className="flex-1 py-5 mycond-bg-yellow rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-yellow-100 hover:bg-yellow-500 transition-all">Salvar Agendamento</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Atualizar Certificados (AVCB / Água) */}
      {activeCertModal && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-2xl animate-in fade-in" onClick={() => setActiveCertModal(null)}></div>
          <div className="relative bg-white w-full max-w-lg rounded-[3.5rem] shadow-2xl p-10 animate-in zoom-in-95">
            <h3 className="text-3xl font-black text-slate-900 uppercase tracking-tighter mb-2">Atualizar {activeCertModal}</h3>
            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-10">Mantenha os certificados e vistorias em dia.</p>
            
            <form onSubmit={handleUpdateCert} className="space-y-8">
              {activeCertModal === 'AGUA' && (
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Data da Última Análise</label>
                  <input 
                    defaultValue={agua?.lastAnalysisDate || ''}
                    required 
                    name="lastAnalysisDate" 
                    type="date" 
                    className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 font-black text-slate-800 shadow-inner" 
                  />
                </div>
              )}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Próximo Vencimento</label>
                <input 
                  defaultValue={activeCertModal === 'AVCB' ? avcb?.expiryDate : agua?.expiryDate}
                  required 
                  name="expiryDate" 
                  type="date" 
                  className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 font-black text-slate-800 shadow-inner" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Upload do Certificado (PDF)</label>
                <div onClick={() => fileInputRef.current?.click()} className="w-full py-12 border-4 border-dashed border-gray-100 rounded-[2.5rem] flex flex-col items-center justify-center text-gray-300 hover:border-yellow-200 transition-all cursor-pointer group">
                  <i className="fa-solid fa-cloud-arrow-up text-3xl mb-3 group-hover:scale-110 transition-transform"></i>
                  <span className="text-[10px] font-black uppercase tracking-widest">{filePreview ? filePreview : 'Clique para anexar arquivo'}</span>
                </div>
                <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".pdf,image/*" />
              </div>

              <div className="flex flex-col gap-3 pt-4">
                <div className="flex gap-4">
                  <button type="button" onClick={() => setActiveCertModal(null)} className="flex-1 py-5 border-2 border-slate-100 rounded-2xl font-black uppercase text-[10px] tracking-widest text-gray-400 hover:bg-gray-50">Cancelar</button>
                  <button type="submit" className="flex-1 py-5 mycond-bg-yellow rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-yellow-100 hover:bg-yellow-500 transition-all">Salvar</button>
                </div>
                <button type="button" onClick={() => alert('Funcionalidade disponível em breve: Enviar para Módulo Documentos/Jurídicos')} className="w-full py-4 bg-slate-800 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-700 transition-all flex items-center justify-center gap-2">
                  <i className="fa-solid fa-file-export"></i> Enviar para Documentos/Jurídicos
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Manutencao;
