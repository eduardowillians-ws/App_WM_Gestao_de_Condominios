
import React, { useState, useMemo, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Cell, PieChart, Pie, Legend
} from 'recharts';
import { Ocorrencia } from '../types';

interface ExtendedOcorrencia extends Ocorrencia {
  mainType: 'RECLAMACAO' | 'OCORRENCIA';
}

interface OcorrenciasProps {
  userRole?: 'admin' | 'resident' | 'manager' | 'familiar';
  currentUser?: {
    id: string;
    name: string;
    unit: string;
    role: string;
    avatar: string;
  };
}

const CATEGORIES_RECLAMACAO = [
  'BARULHO', 'CONVIVÊNCIA', 'ESTACIONAMENTO', 'CORRESPONDÊNCIA', 'SALÃO DE FESTAS', 'OUTROS'
];

const CATEGORIES_OCORRENCIA = [
  'MANUTENÇÃO', 'LIMPEZA', 'PISCINA', 'ESGOTO', 'CAIXA D\'ÁGUA', 'BOMBEIRO', 'JARDINEIRO', 'SEGUROS', 'OUTROS'
];

const MONTH_MAP: Record<string, string> = {
  'Janeiro': '01', 'Fevereiro': '02', 'Março': '03', 'Abril': '04', 
  'Maio': '05', 'Junho': '06', 'Julho': '07', 'Agosto': '08', 
  'Setembro': '09', 'Outubro': '10', 'Novembro': '11', 'Dezembro': '12'
};

const INITIAL_MOCK_DATA: ExtendedOcorrencia[] = [
  { id: '1', title: 'Ocorrência #1', description: 'Música alta após as 22h no sábado.', category: 'BARULHO', mainType: 'RECLAMACAO', date: '2026-01-08', time: '22:15', status: 'open', residentName: 'Sérgio', unit: '301', urgency: 'high' },
  { id: '2', title: 'Ocorrência #2', description: 'O hall do 4º andar está escuro.', category: 'MANUTENÇÃO', mainType: 'OCORRENCIA', date: '2026-01-12', time: '18:30', status: 'in_progress', residentName: 'Paula', unit: '404', urgency: 'low' },
  { id: '3', title: 'Ocorrência #3', description: 'Gotejamento constante na vaga 12.', category: 'MANUTENÇÃO', mainType: 'OCORRENCIA', date: '2026-01-12', time: '14:20', status: 'closed', residentName: 'Roberto', unit: '102', urgency: 'medium' },
  { id: '4', title: 'Ocorrência #4', description: 'Cachorro latindo sem parar.', category: 'BARULHO', mainType: 'RECLAMACAO', date: '2026-01-15', time: '03:45', status: 'open', residentName: 'Ana', unit: '105', urgency: 'medium' },
];

const COLORS = ['#fbbf24', '#3b82f6', '#ef4444', '#10b981', '#8b5cf6', '#64748b'];

const Ocorrencias: React.FC<OcorrenciasProps> = ({ userRole = 'resident', currentUser }) => {
  const [occurrences, setOccurrences] = useState<ExtendedOcorrencia[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'graph'>('list');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'RECLAMACAO' | 'OCORRENCIA'>('ALL');
  const [selectedMonth, setSelectedMonth] = useState('Abril');
  const [selectedYear, setSelectedYear] = useState('2026');
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [actionOcc, setActionOcc] = useState<ExtendedOcorrencia | null>(null);
  const [formMainType, setFormMainType] = useState<'RECLAMACAO' | 'OCORRENCIA'>('RECLAMACAO');

  const isAdmin = userRole === 'admin' || userRole === 'manager';

  useEffect(() => {
    fetchOccurrences();
  }, []);

  const fetchOccurrences = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('occurrences')
        .select('*')
        .order('created_at', { ascending: false });

      if (!isAdmin && currentUser) {
        // Se for morador principal, vê tudo da unidade. Se for familiar, vê apenas as suas.
        if (currentUser.role === 'resident') {
          query = query.eq('unit', currentUser.unit);
        } else {
          // Usamos resident_id para filtrar o usuário ou a unidade diretamente
          query = query.eq('resident_id', currentUser.id);
        }
      }

      const { data, error } = await query;
      
      if (error) throw error;

      const formatted = (data || []).map((r: any) => ({
        id: r.id,
        title: r.title,
        description: r.description,
        category: r.category,
        mainType: r.main_type,
        date: r.date,
        time: r.time,
        status: r.status,
        residentName: r.resident_name,
        unit: r.unit,
        urgency: r.urgency,
        observation: r.observation
      }));

      setOccurrences(formatted);
    } catch (err) {
      console.log('Fallback to mock data:', err);
      setOccurrences(INITIAL_MOCK_DATA);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!currentUser) return;

    setIsLoading(true);
    try {
      const formData = new FormData(e.currentTarget);
      
      const { error } = await supabase
        .from('occurrences')
        .insert({
          user_id: currentUser.id,
          resident_name: currentUser.name,
          unit: currentUser.unit,
          title: `${formMainType === 'OCORRENCIA' ? 'Ocorrência' : 'Reclamação'} #${occurrences.length + 1}`,
          description: formData.get('description') as string,
          category: formData.get('category') as string,
          main_type: formMainType,
          urgency: formData.get('urgency') as string,
          date: new Date().toISOString().split('T')[0],
          time: new Date().toTimeString().split(' ')[0].substring(0, 5),
          status: 'open'
        });

      if (error) throw error;

      await fetchOccurrences();
      setIsModalOpen(false);
      setSelectedDay(null);
      setSelectedCategory(null);
      alert('Registro enviado com sucesso!');
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Erro ao registrar');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateStatus = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!actionOcc) return;

    setIsLoading(true);
    try {
      const formData = new FormData(e.currentTarget);
      const newStatus = formData.get('status') as string;
      const observation = formData.get('observation') as string;

      const { error } = await supabase
        .from('occurrences')
        .update({
          status: newStatus,
          observation: observation,
          updated_at: new Date().toISOString()
        })
        .eq('id', actionOcc.id);

      if (error) throw error;

      await fetchOccurrences();
      setActionOcc(null);
      alert('Status atualizado com sucesso!');
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Erro ao atualizar');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredData = useMemo(() => {
    const monthNum = MONTH_MAP[selectedMonth];
    const prefix = `${selectedYear}-${monthNum}`;
    return occurrences.filter(oc => {
      const matchType = typeFilter === 'ALL' || oc.mainType === typeFilter;
      const matchDate = oc.date.startsWith(prefix);
      return matchType && matchDate;
    });
  }, [occurrences, typeFilter, selectedMonth, selectedYear]);

  const barChartData = useMemo(() => {
    const dataDays = Array.from(new Set(filteredData.map(oc => oc.date.split('-')[2]))).sort();
    const defaultDays = ['01', '05', '10', '15', '20', '25', '30'];
    const uniqueDays = Array.from(new Set([...defaultDays, ...dataDays])).sort();

    return uniqueDays.map(d => {
      const count = filteredData.filter(oc => oc.date.split('-')[2] === d).length;
      return { day: d, total: count };
    });
  }, [filteredData]);

  const categoryChartData = useMemo(() => {
    const targetData = selectedDay 
      ? filteredData.filter(oc => oc.date.split('-')[2] === selectedDay)
      : filteredData;
    const categories: Record<string, number> = {};
    targetData.forEach(oc => {
      categories[oc.category] = (categories[oc.category] || 0) + 1;
    });
    return Object.entries(categories).map(([name, value]) => ({ name, value }));
  }, [filteredData, selectedDay]);

  const tableData = useMemo(() => {
    let data = filteredData;
    if (selectedDay) {
      data = data.filter(oc => oc.date.split('-')[2] === selectedDay);
    }
    if (selectedCategory) {
      data = data.filter(oc => oc.category === selectedCategory);
    }
    return [...data].sort((a, b) => `${b.date}T${b.time}`.localeCompare(`${a.date}T${a.time}`));
  }, [filteredData, selectedDay, selectedCategory]);

  const openRegisterModal = () => {
    // Se estiver filtrando por Ocorrência, abre o modal já configurado para Ocorrência
    if (typeFilter === 'OCORRENCIA') setFormMainType('OCORRENCIA');
    else setFormMainType('RECLAMACAO');
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight uppercase leading-none">Ocorrências e Reclamações</h2>
          <p className="text-sm text-gray-500 mt-1">Gestão operacional e acompanhamento de chamados.</p>
        </div>
        <div className="flex flex-wrap gap-2">
           {/* FILTRO PRINCIPAL - CORRIGIDO PARA SER ALTAMENTE RESPONSIVO */}
           <div className="bg-white p-1 rounded-xl border border-gray-200 flex shadow-sm">
              <button 
                onClick={() => { setTypeFilter('ALL'); setSelectedDay(null); setSelectedCategory(null); }} 
                className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${typeFilter === 'ALL' ? 'bg-slate-900 text-white shadow-lg' : 'text-gray-400 hover:text-slate-600'}`}
              >Tudo</button>
              <button 
                onClick={() => { setTypeFilter('RECLAMACAO'); setSelectedDay(null); setSelectedCategory(null); }} 
                className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${typeFilter === 'RECLAMACAO' ? 'bg-red-500 text-white shadow-lg' : 'text-gray-400 hover:text-red-500'}`}
              >Reclamações</button>
              <button 
                onClick={() => { setTypeFilter('OCORRENCIA'); setSelectedDay(null); setSelectedCategory(null); }} 
                className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${typeFilter === 'OCORRENCIA' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-blue-600'}`}
              >Ocorrências</button>
           </div>
           
           <button onClick={() => setViewMode(viewMode === 'list' ? 'graph' : 'list')} className="px-5 py-2 bg-white text-slate-600 rounded-xl font-bold text-xs uppercase tracking-widest border border-gray-200 hover:bg-gray-50 transition-all flex items-center space-x-2 shadow-sm">
            <i className={viewMode === 'graph' ? "fa-solid fa-list" : "fa-solid fa-chart-line"}></i>
            <span>{viewMode === 'graph' ? 'Ver Lista' : 'Ver Painel'}</span>
          </button>
          
          <button 
            onClick={openRegisterModal} 
            className="mycond-bg-yellow text-slate-900 px-6 py-2 rounded-xl font-black text-xs uppercase tracking-widest shadow-xl shadow-yellow-100 hover:bg-yellow-500 transition-all active:scale-95"
          >
            {typeFilter === 'OCORRENCIA' ? '+ Nova Ocorrência' : '+ Nova Reclamação'}
          </button>
        </div>
      </header>

      {viewMode === 'graph' ? (
        <div className="space-y-6">
          {/* Filtros de Período */}
          <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
             <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-yellow-50 text-yellow-600 rounded-xl flex items-center justify-center shadow-inner">
                    <i className="fa-solid fa-calendar-check"></i>
                </div>
                <div>
                   <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">Filtro de Período Ativo</span>
                   <div className="flex items-center space-x-2">
                      <select value={selectedMonth} onChange={(e) => { setSelectedMonth(e.target.value); setSelectedDay(null); setSelectedCategory(null); }} className="text-xs border-none bg-slate-50 rounded-lg px-4 py-2 font-black text-slate-800 outline-none focus:ring-2 focus:ring-yellow-400 shadow-inner">
                        {Object.keys(MONTH_MAP).map(m => <option key={m}>{m}</option>)}
                      </select>
                      <select value={selectedYear} onChange={(e) => { setSelectedYear(e.target.value); setSelectedDay(null); setSelectedCategory(null); }} className="text-xs border-none bg-slate-50 rounded-lg px-4 py-2 font-black text-slate-800 outline-none focus:ring-2 focus:ring-yellow-400 shadow-inner">
                        {['2024', '2025', '2026'].map(y => <option key={y}>{y}</option>)}
                      </select>
                   </div>
                </div>
             </div>
             
             <div className="flex gap-2">
                {selectedDay && (
                  <button onClick={() => { setSelectedDay(null); setSelectedCategory(null); }} className="text-[10px] font-black text-white bg-slate-900 uppercase flex items-center px-5 py-2.5 rounded-xl shadow-lg transition-all active:scale-95">
                    <i className="fa-solid fa-circle-xmark mr-2 text-yellow-400"></i> Dia {selectedDay}
                  </button>
                )}
                {selectedCategory && (
                  <button onClick={() => setSelectedCategory(null)} className="text-[10px] font-black text-white bg-blue-600 uppercase flex items-center px-5 py-2.5 rounded-xl shadow-lg transition-all active:scale-95">
                    <i className="fa-solid fa-circle-xmark mr-2 text-blue-200"></i> {selectedCategory}
                  </button>
                )}
             </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Gráfico de Barras */}
            <div className="lg:col-span-2 bg-white p-8 rounded-[3rem] border border-gray-100 shadow-sm">
              <h4 className="font-black text-slate-800 uppercase text-[10px] tracking-[0.2em] mb-8">Fluxo de Chamados por Dia</h4>
              <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barChartData} onClick={(data) => {
                    if (data && data.activeLabel) {
                      const day = String(data.activeLabel);
                      setSelectedDay(selectedDay === day ? null : day);
                      setSelectedCategory(null);
                    }
                  }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fontSize: 9, fill: '#94a3b8', fontWeight: 700}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} />
                    <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)'}} />
                    <Bar dataKey="total" radius={[8, 8, 0, 0]}>
                      {barChartData.map((entry, index) => {
                        let barColor = '#e2e8f0';
                        if (entry.total > 0) {
                          if (typeFilter === 'RECLAMACAO') barColor = '#ef4444';
                          else if (typeFilter === 'OCORRENCIA') barColor = '#3b82f6';
                          else barColor = '#fbbf24';
                        }
                        return <Cell key={`cell-${index}`} fill={selectedDay === entry.day ? '#1e293b' : barColor} className="cursor-pointer transition-all duration-300" />;
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Gráfico de Pizza */}
            <div className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-sm flex flex-col">
              <h4 className="font-black text-slate-800 uppercase text-[10px] tracking-[0.2em] mb-8 text-center">
                {selectedDay ? `Categorias: Dia ${selectedDay}` : 'Detalhamento por Categorias'}
              </h4>
              <div className="flex-1 relative">
                {categoryChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie 
                        data={categoryChartData} 
                        cx="50%" cy="50%" 
                        innerRadius={70} outerRadius={95} 
                        paddingAngle={5} 
                        dataKey="value"
                        onClick={(data) => {
                          if (data && data.name) {
                            setSelectedCategory(selectedCategory === data.name ? null : data.name);
                          }
                        }}
                      >
                        {categoryChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={selectedCategory === entry.name ? '#1e293b' : COLORS[index % COLORS.length]} className="cursor-pointer" />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend iconType="circle" wrapperStyle={{fontSize: '9px', fontWeight: 'bold', textTransform: 'uppercase'}} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-gray-300 space-y-4">
                     <i className="fa-solid fa-chart-pie text-5xl opacity-20"></i>
                     <p className="text-[10px] font-black uppercase tracking-widest px-8 text-center">Sem dados para o período ou filtros selecionados.</p>
                  </div>
                )}
              </div>
              
              {selectedDay && (
                <div className="mt-8 pt-8 border-t border-gray-50 space-y-3">
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Relatos do Dia {selectedDay}</p>
                  <div className="max-h-32 overflow-y-auto scrollbar-hide space-y-2">
                    {filteredData.filter(oc => oc.date.split('-')[2] === selectedDay).map(oc => (
                      <div key={oc.id} className="p-3 bg-slate-50 rounded-2xl border border-gray-100 group hover:border-yellow-200 transition-colors">
                        <p className="text-[8px] font-black text-slate-400 mb-1 uppercase tracking-widest">{oc.category} • {oc.time}</p>
                        <p className="text-[10px] text-slate-600 font-bold leading-tight line-clamp-2">"{oc.description}"</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Tabela de Drill-down */}
          <div className="bg-white rounded-[3rem] border border-gray-100 shadow-sm overflow-hidden animate-in slide-in-from-bottom-4 duration-500">
            <div className="px-10 py-8 bg-gray-50/50 border-b border-gray-100 flex justify-between items-center">
              <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-[0.2em]">
                Listagem Detalhada {selectedDay && `• Dia ${selectedDay}`} {selectedCategory && `• ${selectedCategory}`}
              </h4>
              <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{tableData.length} registros no filtro</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-white border-b border-gray-50 font-black text-[9px] text-gray-400 uppercase tracking-widest">
                    <th className="px-10 py-5">Data/Hora</th>
                    <th className="px-6 py-5">Classificação</th>
                    <th className="px-6 py-5">Categoria</th>
                    <th className="px-6 py-5 text-center">Prioridade</th>
                    <th className="px-10 py-5">Relato Completo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {tableData.length > 0 ? tableData.map(oc => (
                    <tr key={oc.id} className="hover:bg-slate-50 transition-all group">
                      <td className="px-10 py-6">
                        <p className="font-black text-slate-800 text-xs">{new Date(oc.date + 'T12:00:00').toLocaleDateString('pt-BR')}</p>
                        <p className="text-[10px] text-gray-400 font-bold uppercase mt-0.5">{oc.time || '--:--'}</p>
                      </td>
                      <td className="px-6 py-6">
                        <span className={`px-4 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-widest shadow-sm ${oc.mainType === 'RECLAMACAO' ? 'bg-red-50 text-red-500 border border-red-100' : 'bg-blue-50 text-blue-500 border border-blue-100'}`}>
                          {oc.mainType === 'RECLAMACAO' ? 'RECLAMAÇÃO' : 'OCORRÊNCIA'}
                        </span>
                      </td>
                      <td className="px-6 py-6 font-black text-slate-700 text-xs uppercase tracking-tight">{oc.category}</td>
                      <td className="px-6 py-6 text-center">
                        <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${oc.urgency === 'high' ? 'bg-red-500 text-white' : oc.urgency === 'medium' ? 'bg-orange-400 text-white' : 'bg-emerald-500 text-white'}`}>
                          {oc.urgency === 'high' ? 'Crítica' : oc.urgency === 'medium' ? 'Moderada' : 'Normal'}
                        </span>
                      </td>
                      <td className="px-10 py-6 text-slate-500 text-xs font-medium italic leading-relaxed">"{oc.description}"</td>
                    </tr>
                  )) : (
                    <tr><td colSpan={5} className="px-10 py-20 text-center text-gray-300 font-black uppercase text-xs italic">Sem registros para a combinação de filtros atual.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* VISÃO LISTA SIMPLES */
        <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-500">
          {filteredData.length === 0 ? (
            <div className="p-32 text-center bg-white rounded-[3rem] border-2 border-dashed border-gray-100 flex flex-col items-center">
              <i className="fa-solid fa-clipboard-list text-5xl text-gray-100 mb-6"></i>
              <p className="text-gray-400 font-black uppercase text-xs tracking-widest">Nada a exibir neste período.</p>
            </div>
          ) : (
            filteredData.map(oc => (
              <div key={oc.id} className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6 group hover:shadow-xl hover:border-yellow-200 transition-all duration-500">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-3">
                    <span className={`px-4 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-widest shadow-sm ${oc.mainType === 'RECLAMACAO' ? 'bg-red-50 text-red-500 border border-red-100' : 'bg-blue-50 text-blue-500 border border-blue-100'}`}>{oc.mainType === 'RECLAMACAO' ? 'RECLAMAÇÃO' : 'OCORRÊNCIA'}</span>
                    <span className="text-[9px] bg-slate-100 text-slate-500 px-3 py-1 rounded-lg font-black uppercase tracking-widest">{oc.category}</span>
                    <span className="text-[10px] text-gray-400 font-black ml-4 uppercase tracking-tighter"><i className="fa-regular fa-calendar mr-2 text-yellow-500"></i>{new Date(oc.date + 'T12:00:00').toLocaleDateString('pt-BR')} {oc.time && `às ${oc.time}`}</span>
                  </div>
                  <h4 className="font-black text-slate-800 text-lg uppercase tracking-tighter">Protocolo {oc.id}</h4>
                  <p className="text-sm text-gray-500 mt-2 font-medium leading-relaxed italic">"{oc.description}"</p>
                  {oc.observation && (
                    <div className="mt-3 p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded-r-xl">
                      <p className="text-[10px] font-black text-yellow-700 uppercase tracking-widest mb-1">Observação do Gestor:</p>
                      <p className="text-xs text-yellow-800 font-bold italic">"{oc.observation}"</p>
                    </div>
                  )}
                  <div className="mt-5 flex items-center text-[10px] font-black uppercase tracking-widest text-gray-400 space-x-6 border-t border-gray-50 pt-5">
                    <span className="flex items-center"><i className="fa-solid fa-user-circle mr-2 text-slate-300 text-sm"></i> {oc.residentName}</span>
                    <span className="flex items-center"><i className="fa-solid fa-building mr-2 text-slate-300 text-sm"></i> UNIDADE {oc.unit}</span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-3 w-full md:w-auto">
                   <span className={`px-6 py-3 rounded-2xl text-[9px] font-black uppercase tracking-[0.2em] shadow-inner ${oc.status === 'open' ? 'text-yellow-600 bg-yellow-50' : oc.status === 'in_progress' ? 'text-blue-600 bg-blue-50' : 'text-emerald-600 bg-emerald-50'}`}>
                     {oc.status === 'open' ? 'Pendente' : oc.status === 'in_progress' ? 'Em Atendimento' : 'Concluído'}
                   </span>
                   {/* BOTÃO DE AÇÃO ATUALIZADO PARA ABRIR O FORMULÁRIO DE GESTÃO */}
                   <button 
                    onClick={() => setActionOcc(oc)}
                    className="w-12 h-12 bg-slate-50 text-slate-300 rounded-2xl flex items-center justify-center hover:bg-slate-900 hover:text-white transition-all shadow-sm active:scale-95"
                   >
                    <i className="fa-solid fa-chevron-right"></i>
                   </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* MODAL: NOVA OCORRÊNCIA / RECLAMAÇÃO */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-2 sm:p-4">
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-3xl animate-in fade-in" onClick={() => setIsModalOpen(false)}></div>
          <div className="relative bg-white w-full max-w-lg sm:max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl sm:rounded-[4rem] shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="sticky top-0 bg-blue-900 text-white px-6 py-6 sm:px-12 sm:py-10 flex justify-between items-center z-10">
              <div>
                <h3 className="text-xl sm:text-3xl font-black uppercase tracking-tighter">Novo Registro</h3>
                <p className="text-[9px] sm:text-[10px] text-blue-200 font-bold uppercase tracking-widest">Protocolo Digital MyCond</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="w-10 h-10 sm:w-14 sm:h-14 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors">
                <i className="fa-solid fa-xmark text-xl"></i>
              </button>
            </div>
            
            <form onSubmit={handleRegister} className="p-4 sm:p-10 space-y-4 sm:space-y-6">
              <div className="flex p-1.5 bg-slate-100 rounded-xl sm:rounded-[2rem]">
                 <button type="button" onClick={() => setFormMainType('RECLAMACAO')} className={`flex-1 py-3 sm:py-4 text-[10px] font-black uppercase tracking-widest rounded-xl sm:rounded-2xl transition-all ${formMainType === 'RECLAMACAO' ? 'bg-white shadow-lg text-red-500' : 'text-gray-400'}`}>Reclamação</button>
                 <button type="button" onClick={() => setFormMainType('OCORRENCIA')} className={`flex-1 py-3 sm:py-4 text-[10px] font-black uppercase tracking-widest rounded-xl sm:rounded-2xl transition-all ${formMainType === 'OCORRENCIA' ? 'bg-white shadow-lg text-blue-600' : 'text-gray-400'}`}>Ocorrência</button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Data do Evento</label>
                  <input required name="date" type="date" className="w-full bg-slate-50 border-none rounded-xl sm:rounded-2xl px-4 sm:px-6 py-3 sm:py-4 font-black text-slate-800 text-sm outline-none focus:ring-2 focus:ring-yellow-400/30 shadow-inner" defaultValue={new Date().toISOString().split('T')[0]} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Horário</label>
                  <input required name="time" type="time" className="w-full bg-slate-50 border-none rounded-xl sm:rounded-2xl px-4 sm:px-6 py-3 sm:py-4 font-black text-slate-800 text-sm outline-none focus:ring-2 focus:ring-yellow-400/30 shadow-inner" defaultValue={new Date().toTimeString().split(' ')[0].substring(0, 5)} />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Categoria</label>
                  <select name="category" className="w-full bg-slate-50 border-none rounded-xl sm:rounded-2xl px-4 sm:px-6 py-3 sm:py-4 font-black text-slate-800 text-sm shadow-inner" defaultValue={formMainType === 'RECLAMACAO' ? CATEGORIES_RECLAMACAO[0] : CATEGORIES_OCORRENCIA[0]}>
                    {(formMainType === 'RECLAMACAO' ? CATEGORIES_RECLAMACAO : CATEGORIES_OCORRENCIA).map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Prioridade</label>
                  <select name="urgency" className="w-full bg-slate-50 border-none rounded-xl sm:rounded-2xl px-4 sm:px-6 py-3 sm:py-4 font-black text-slate-800 text-sm shadow-inner">
                    <option value="low">Baixa</option>
                    <option value="medium">Média</option>
                    <option value="high">Alta</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Descrição</label>
                <textarea required name="description" rows={3} className="w-full bg-slate-50 border-none rounded-xl sm:rounded-2xl px-4 sm:px-6 py-3 sm:py-4 font-black text-slate-800 text-sm outline-none focus:ring-2 focus:ring-yellow-400/30 shadow-inner resize-none" placeholder="Descreva os detalhes..."></textarea>
              </div>

              <div className="pt-2 sm:pt-4 flex flex-col sm:flex-row gap-3 sm:space-x-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 sm:py-6 border-2 border-slate-100 rounded-xl sm:rounded-2xl font-black text-slate-400 hover:bg-slate-50 transition-all uppercase text-[10px] tracking-widest">Cancelar</button>
                <button type="submit" disabled={isLoading} className="flex-1 py-4 sm:py-6 mycond-bg-yellow rounded-xl sm:rounded-2xl font-black text-slate-900 hover:bg-yellow-500 transition-all shadow-lg uppercase text-[10px] tracking-widest disabled:opacity-50">
                  {isLoading ? 'Enviando...' : 'Finalizar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* NOVO MODAL: GESTÃO DE STATUS E OBSERVAÇÃO */}
      {actionOcc && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-3xl animate-in fade-in" onClick={() => setActionOcc(null)}></div>
          <div className="relative bg-white w-full max-w-lg rounded-[4rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="px-10 py-8 mycond-bg-yellow text-slate-900 flex justify-between items-center">
              <div>
                <h3 className="text-2xl font-black uppercase tracking-tighter">Gestão de Atendimento</h3>
                <p className="text-[10px] text-slate-700 font-bold uppercase tracking-widest">Protocolo: {actionOcc.id}</p>
              </div>
              <button onClick={() => setActionOcc(null)} className="w-12 h-12 rounded-full hover:bg-black/10 flex items-center justify-center transition-colors"><i className="fa-solid fa-xmark text-xl"></i></button>
            </div>
            
            <form onSubmit={handleUpdateStatus} className="p-10 space-y-8">
              <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Resumo da Solicitação</p>
                <p className="text-xs text-slate-600 font-bold leading-relaxed italic">"{actionOcc.description}"</p>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Modificar Status Atual</label>
                <div className="grid grid-cols-1 gap-3">
                  <div className="relative">
                    <select 
                      required 
                      name="status" 
                      defaultValue={actionOcc.status}
                      className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 font-black text-slate-800 outline-none focus:ring-4 focus:ring-yellow-400/30 shadow-inner appearance-none transition-all"
                    >
                      <option value="open">Pendente / Aberto</option>
                      <option value="in_progress">Em Atendimento</option>
                      <option value="closed">Concluído / Resolvido</option>
                    </select>
                    <i className="fa-solid fa-chevron-down absolute right-6 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"></i>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Observações Internas / Feedbacks</label>
                <textarea 
                  name="observation" 
                  rows={4} 
                  defaultValue={actionOcc.observation}
                  className="w-full bg-slate-50 border-none rounded-2xl px-6 py-5 font-black text-slate-800 outline-none focus:ring-4 focus:ring-yellow-400/30 shadow-inner resize-none transition-all" 
                  placeholder="Registre o que foi feito ou responda ao morador..."
                ></textarea>
              </div>

              <div className="pt-4 flex gap-4">
                <button type="button" onClick={() => setActionOcc(null)} className="flex-1 py-5 border-2 border-slate-100 rounded-[2rem] font-black text-slate-400 hover:bg-slate-50 transition-all uppercase text-[10px] tracking-widest">Sair</button>
                <button type="submit" className="flex-[2] py-5 mycond-bg-blue text-white rounded-[2rem] font-black uppercase text-[10px] tracking-[0.2em] shadow-2xl active:scale-95 transition-all">Salvar Alterações</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Ocorrencias;
