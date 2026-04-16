
import React, { useState, useMemo, useEffect } from 'react';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, 
  AreaChart, Area, PieChart, Pie, Cell, Legend
} from 'recharts';
import { supabase } from '../lib/supabase';

const MONTHS = [
  { label: 'Todos os Meses', value: 'ALL' },
  { label: 'Janeiro', value: '01' }, { label: 'Fevereiro', value: '02' }, { label: 'Março', value: '03' },
  { label: 'Abril', value: '04' }, { label: 'Maio', value: '05' }, { label: 'Junho', value: '06' },
  { label: 'Julho', value: '07' }, { label: 'Agosto', value: '08' }, { label: 'Setembro', value: '09' },
  { label: 'Outubro', value: '10' }, { label: 'Novembro', value: '11' }, { label: 'Dezembro', value: '12' }
];

const YEARS = [
  { label: 'Todos os Anos', value: 'ALL' },
  { label: '2024', value: '2024' },
  { label: '2025', value: '2025' },
  { label: '2026', value: '2026' }
];

const BLOCKS = [
  { id: 'ALL', name: 'Todas as Unidades' },
  { id: 'b1', name: 'Torre 1 (Alpha)' },
  { id: 'b2', name: 'Torre 2 (Beta)' },
  { id: 'b3', name: 'Bloco C' }
];

const Dashboard: React.FC = () => {
  // Estados dos Filtros
  const [selectedMonth, setSelectedMonth] = useState('ALL'); 
  const [selectedYear, setSelectedYear] = useState('ALL');
  const [selectedBlock, setSelectedBlock] = useState('ALL');
  const [showLevelInfo, setShowLevelInfo] = useState(false);
  
  // Dados reais do banco
  const [blocksList, setBlocksList] = useState<{id: string, name: string, totalUnits: number}[]>([]);
  const [activeResidentsCount, setActiveResidentsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [occupationPercent, setOccupationPercent] = useState(85);
  const [accessLogs, setAccessLogs] = useState<{date: string, morador: number, visitante: number}[]>([]);
  const [accessModalType, setAccessModalType] = useState<'MORADOR' | 'VISITANTE' | null>(null);
  const [accessFormData, setAccessFormData] = useState({ name: '', document: '', reason: '', block_id: '', unit: '', profile_id: '', documentType: 'CPF' });
  const [residentsList, setResidentsList] = useState<{id: string, name: string, block_id: string, unit: string, cpf?: string}[]>([]);
  
  // Ocorrências e Reclamações separadas
  const [ocorrenciasData, setOcorrenciasData] = useState({ total: 0, pendentes: 0, concluidas: 0 });
  const [reclamacoesData, setReclamacoesData] = useState({ total: 0, pendentes: 0, concluidas: 0 });
  
  // Dados financeiros, reservas e encomendas
  const [financeiroData, setFinanceiroData] = useState({ saldo: 0 });
  const [reservasData, setReservasData] = useState({ total: 0 });
  const [encomendasData, setEncomendasData] = useState({ total: 0, pendentes5dias: 0 });

  // Busca dados reais quando filtros mudam
  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        // Busca blocos/unidades do banco
        const { data: blocksData } = await supabase.from('condo_blocks').select('id, name, total_units');
        const blocksFromDb = blocksData || [];
        if (blocksFromDb.length > 0) {
          setBlocksList(blocksFromDb.map(b => ({ id: b.id, name: b.name, totalUnits: b.total_units })));
        }

        // Busca lista de moradores para o dropdown de registro de acesso
        const { data: residentsData } = await supabase
          .from('profiles')
          .select('id, name, block_id, unit, cpf')
          .eq('role', 'resident')
          .eq('status', 'active')
          .order('name');
        
        console.log('Residents data:', residentsData);
        console.log('Blocks data:', blocksFromDb);
        
        if (residentsData) {
          setResidentsList(residentsData);
        }

        // Busca moradores ativos (com filtro de bloco, ano E mês)
        let profilesQuery = supabase.from('profiles').select('id, status, block_id, created_at').eq('role', 'resident').eq('status', 'active');
        
        if (selectedBlock !== 'ALL') {
          profilesQuery = profilesQuery.eq('block_id', selectedBlock);
        }
        
        if (selectedYear !== 'ALL') {
          let primeiroDia: string;
          let ultimoDia: string;
          
          if (selectedMonth !== 'ALL') {
            const month = parseInt(selectedMonth);
            const year = parseInt(selectedYear);
            primeiroDia = `${year}-${String(month).padStart(2, '0')}-01`;
            const lastDay = new Date(year, month, 0).getDate();
            ultimoDia = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;
          } else {
            const year = parseInt(selectedYear);
            primeiroDia = `${year}-01-01`;
            ultimoDia = `${year}-12-31`;
          }
          
          profilesQuery = profilesQuery.gte('created_at', primeiroDia).lte('created_at', ultimoDia);
        }
        
        const { data: profilesData } = await profilesQuery;
        const activeCount = profilesData?.length || 0;
        console.log('Moradores ativos:', activeCount, 'ano:', selectedYear, 'mes:', selectedMonth);
        setActiveResidentsCount(activeCount);

        // Calcula taxa de ocupação baseada nos moradores ativos vs total de unidades
        if (selectedBlock === 'ALL') {
          const totalUnits = blocksFromDb.reduce((sum, b) => sum + b.total_units, 0) || 150;
          setOccupationPercent(Math.round((activeCount / totalUnits) * 100));
        } else {
          const block = blocksFromDb.find(b => b.id === selectedBlock);
          const totalUnits = block?.total_units || 50;
          setOccupationPercent(Math.round((activeCount / totalUnits) * 100));
        }

        // Busca ocorrências e reclamações separadas por tipo e status
        try {
          let primeiroDia = '';
          let ultimoDia = '';
          
          if (selectedYear !== 'ALL') {
            if (selectedMonth !== 'ALL') {
              const month = parseInt(selectedMonth);
              const year = parseInt(selectedYear);
              primeiroDia = `${year}-${String(month).padStart(2, '0')}-01`;
              const lastDay = new Date(year, month, 0).getDate();
              ultimoDia = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;
            } else {
              const year = parseInt(selectedYear);
              primeiroDia = `${year}-01-01`;
              ultimoDia = `${year}-12-31`;
            }
          }
          
          // Busca Ocorrências (main_type = 'OCORRENCIA') com filtros
          let occQuery = supabase
            .from('occurrences')
            .select('status')
            .eq('main_type', 'OCORRENCIA');
          
          if (primeiroDia && ultimoDia) {
            occQuery = occQuery.gte('date', primeiroDia).lte('date', ultimoDia);
          }
          
          const { data: occData } = await occQuery;
          
          const occPendentes = occData?.filter(o => o.status === 'open' || o.status === 'in_progress').length || 0;
          const occConcluidas = occData?.filter(o => o.status === 'closed').length || 0;
          
          // Busca Reclamações (main_type = 'RECLAMACAO') com filtros
          let recQuery = supabase
            .from('occurrences')
            .select('status')
            .eq('main_type', 'RECLAMACAO');
          
          if (primeiroDia && ultimoDia) {
            recQuery = recQuery.gte('date', primeiroDia).lte('date', ultimoDia);
          }
          
          const { data: recData } = await recQuery;
          
          const recPendentes = recData?.filter(r => r.status === 'open' || r.status === 'in_progress').length || 0;
          const recConcluidas = recData?.filter(r => r.status === 'closed').length || 0;
          
          console.log('Ocorrências:', { total: occData?.length || 0, pendentes: occPendentes, concluidas: occConcluidas });
          console.log('Reclamações:', { total: recData?.length || 0, pendentes: recPendentes, concluidas: recConcluidas });
          
          setOcorrenciasData({ total: occData?.length || 0, pendentes: occPendentes, concluidas: occConcluidas });
          setReclamacoesData({ total: recData?.length || 0, pendentes: recPendentes, concluidas: recConcluidas });
        } catch (err) {
          console.error('Erro:', err);
          setOcorrenciasData({ total: 0, pendentes: 0, concluidas: 0 });
          setReclamacoesData({ total: 0, pendentes: 0, concluidas: 0 });
        }
        console.log('--- FIM DEBUG ---');

        // Busca encomendas pendentes (filtradas por received_at com mês E ano)
        let encomendasQuery = supabase.from('encomendas').select('id, received_at').eq('status', 'pendente');
        
        if (selectedYear !== 'ALL') {
          let primeiroDia: string;
          let ultimoDia: string;
          
          if (selectedMonth !== 'ALL') {
            const month = parseInt(selectedMonth);
            const year = parseInt(selectedYear);
            primeiroDia = `${year}-${String(month).padStart(2, '0')}-01`;
            const lastDay = new Date(year, month, 0).getDate();
            ultimoDia = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;
          } else {
            const year = parseInt(selectedYear);
            primeiroDia = `${year}-01-01`;
            ultimoDia = `${year}-12-31`;
          }
          
          encomendasQuery = encomendasQuery.gte('received_at', primeiroDia).lte('received_at', ultimoDia);
        }
        
        const { data: encomendasResult } = await encomendasQuery;
        
        // Calcula encomendas pendentes há mais de 5 dias
        const fiveDaysAgo = new Date();
        fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
        const pendentes5dias = encomendasResult?.filter(e => {
          const receivedDate = new Date(e.received_at);
          return receivedDate <= fiveDaysAgo;
        }).length || 0;
        
        console.log('Encomendas:', { total: encomendasResult?.length || 0, pendentes5dias });
        setEncomendasData({ total: encomendasResult?.length || 0, pendentes5dias });

        // Busca saldo financeiro (receitas - despesas)
        try {
          const { data: receitas } = await supabase.from('financial').select('amount').eq('type', 'receita');
          const { data: despesas } = await supabase.from('financial').select('amount').eq('type', 'despesa');
          
          const totalReceitas = receitas?.reduce((sum, r) => sum + (r.amount || 0), 0) || 0;
          const totalDespesas = despesas?.reduce((sum, d) => sum + (d.amount || 0), 0) || 0;
          const saldo = totalReceitas - totalDespesas;
          
          console.log('Financeiro:', { receitas: totalReceitas, despesas: totalDespesas, saldo });
          setFinanceiroData({ saldo });
        } catch (err) {
          console.log('Tabela financial não encontrada');
          setFinanceiroData({ saldo: 0 });
        }

        // Busca reservas do mês atual
        try {
          const currentMonth = new Date().getMonth() + 1;
          const currentYear = new Date().getFullYear();
          const primeiroDia = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;
          const lastDay = new Date(currentYear, currentMonth, 0).getDate();
          const ultimoDia = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${lastDay}`;
          
          const { data: reservasResult } = await supabase
            .from('reservations')
            .select('id')
            .gte('date', primeiroDia)
            .lte('date', ultimoDia);
          
          console.log('Reservas do mês:', reservasResult?.length || 0);
          setReservasData({ total: reservasResult?.length || 0 });
        } catch (err) {
          console.log('Tabela reservations não encontrada');
          setReservasData({ total: 0 });
        }

        // Busca logs de acesso (Entry apenas)
        try {
          let accessQuery = supabase.from('access_logs').select('access_type, direction, created_at, block_id');
          
          if (selectedBlock !== 'ALL') {
            accessQuery = accessQuery.eq('block_id', selectedBlock);
          }
          
          let startDate, endDate;
          if (selectedYear !== 'ALL') {
            const year = parseInt(selectedYear);
            startDate = `${year}-01-01`;
            endDate = `${year}-12-31`;
          }
          
          if (selectedMonth !== 'ALL' && selectedYear !== 'ALL') {
            const month = parseInt(selectedMonth);
            const year = parseInt(selectedYear);
            startDate = `${year}-${String(month).padStart(2, '0')}-01`;
            const lastDay = new Date(year, month, 0).getDate();
            endDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;
          }
          
          if (startDate && endDate) {
            accessQuery = accessQuery.gte('created_at', startDate).lte('created_at', endDate + ' 23:59:59');
          }
          
          const { data: accessData } = await accessQuery;
          
          // Agrupa por dia
          const grouped: Record<string, {morador: number, visitante: number}> = {};
          
          (accessData || []).forEach(log => {
            const date = log.created_at.split('T')[0];
            if (!grouped[date]) {
              grouped[date] = { morador: 0, visitante: 0 };
            }
            if (log.access_type === 'MORADOR' || log.access_type === 'PRESTADOR') {
              grouped[date].morador++;
            } else {
              grouped[date].visitante++;
            }
          });
          
          const formatted = Object.entries(grouped).map(([date, counts]) => ({
            date,
            morador: counts.morador,
            visitante: counts.visitante
          })).sort((a, b) => a.date.localeCompare(b.date));
          
          console.log('Access logs:', formatted.length, 'dias');
          setAccessLogs(formatted);
        } catch (err) {
          console.log('Access logs table not found or empty');
          setAccessLogs([]);
        }
      } catch (err) {
        console.error('Erro ao buscar dados:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [selectedMonth, selectedYear, selectedBlock]);

  const handleRegisterAccess = async (direction: 'ENTRY' | 'EXIT') => {
    if (!accessFormData.name) {
      alert('Preencha o nome');
      return;
    }

    try {
      const selectedResident = residentsList.find(r => r.id === accessFormData.profile_id);
      
      await supabase.from('access_logs').insert({
        access_type: accessModalType,
        direction,
        name: accessFormData.name,
        document: accessFormData.document || selectedResident?.cpf || null,
        reason: accessFormData.reason || null,
        block_id: accessFormData.block_id || null,
        unit: accessFormData.unit || null,
        profile_id: accessFormData.profile_id || null
      });

      alert(`${direction === 'ENTRY' ? 'Entrada' : 'Saída'} registrada com sucesso!`);
      setAccessModalType(null);
      setAccessFormData({ name: '', document: '', reason: '', block_id: '', unit: '', profile_id: '' });
      
      // Recarregar dados do dashboard
      const fetchDashboardData = async () => {
        setLoading(true);
        try {
          // ... same fetch logic
          const { data: accessData } = await supabase.from('access_logs').select('access_type, direction, created_at, block_id');
          
          const grouped: Record<string, {morador: number, visitante: number}> = {};
          (accessData || []).forEach(log => {
            const date = log.created_at.split('T')[0];
            if (!grouped[date]) grouped[date] = { morador: 0, visitante: 0 };
            if (log.access_type === 'MORADOR' || log.access_type === 'PRESTADOR') {
              grouped[date].morador++;
            } else {
              grouped[date].visitante++;
            }
          });
          
          const formatted = Object.entries(grouped).map(([date, counts]) => ({
            date, morador: counts.morador, visitante: counts.visitante
          })).sort((a, b) => a.date.localeCompare(b.date));
          
          setAccessLogs(formatted);
        } catch (err) { setAccessLogs([]); }
        setLoading(false);
      };
      
      fetchDashboardData();
    } catch (err) {
      console.error('Erro ao registrar acesso:', err);
      alert('Erro ao registrar acesso');
    }
  };

  const handleClearFilters = () => {
    setSelectedMonth('ALL');
    setSelectedYear('2025');
    setSelectedBlock('ALL');
  };

  // Função auxiliar para saber quantos dias tem o mês/ano selecionado
  const getDaysInMonth = (month: string, year: string) => {
    if (month === 'ALL') return 0;
    const y = year === 'ALL' ? new Date().getFullYear() : parseInt(year);
    return new Date(y, parseInt(month), 0).getDate();
  };

  // Lógica de Geração de Dados Dinâmicos
  const dynamicMetrics = useMemo(() => {
    const mValue = selectedMonth === 'ALL' ? 6 : parseInt(selectedMonth);
    const yValue = selectedYear === 'ALL' ? 2025 : parseInt(selectedYear);
    
    const monthFactor = 1 + (mValue / 12);
    const yearFactor = 1 + ((yValue - 2024) / 5);
    const blockFactor = selectedBlock === 'ALL' ? 1 : (selectedBlock === 'b1' ? 0.4 : (selectedBlock === 'b2' ? 0.3 : 0.2));

    return {
      moradores: loading ? 0 : activeResidentsCount,
      ocorrencias: loading ? 0 : ocorrenciasData.total + reclamacoesData.total,
      reservas: loading ? 0 : reservasData.total,
      encomendas: loading ? 0 : encomendasData.total,
      urgentes: loading ? 0 : ocorrenciasData.pendentes + reclamacoesData.pendentes,
      pendentes5dias: loading ? 0 : encomendasData.pendentes5dias,
      financeiroSaldo: loading ? 0 : financeiroData.saldo
    };
  }, [selectedMonth, selectedYear, selectedBlock, loading, activeResidentsCount, ocorrenciasData, reclamacoesData, reservasData, encomendasData, financeiroData]);

  // Gráfico de Ocupação
  const occupationData = useMemo(() => {
    const finalOccupied = loading ? 85 : Math.min(98, Math.max(0, occupationPercent));

    return [
      { name: 'Ocupado', value: finalOccupied, color: '#10b981' },
      { name: 'Vago', value: 100 - finalOccupied, color: '#f1f5f9' }
    ];
  }, [selectedBlock, selectedYear, selectedMonth, loading, occupationPercent]);

  // CÁLCULO DO NÍVEL DE GESTÃO
  const managementKPIs = useMemo(() => {
    const points = {
      saldo: financeiroData.saldo > 0,
      ocupacao: occupationData[0].value >= 80,
      ocorrencias: (ocorrenciasData.pendentes + reclamacoesData.pendentes) < 25,
      reservas: reservasData.total > 0,
      encomendas: encomendasData.pendentes5dias < 100
    };

    let score = 0;
    if (points.saldo) score += 20;
    if (points.ocupacao) score += 20;
    if (points.ocorrencias) score += 20;
    if (points.reservas) score += 20;
    if (points.encomendas) score += 20;

    let level = 'Bronze';
    let color = 'text-orange-600';
    let barColor = 'bg-orange-400';
    
    if (score >= 80) {
      level = 'Ouro';
      color = 'text-yellow-600';
      barColor = 'bg-yellow-400';
    } else if (score >= 60) {
      level = 'Prata';
      color = 'text-slate-600';
      barColor = 'bg-slate-400';
    }

    return { score, level, color, barColor, points };
  }, [financeiroData, occupationData, ocorrenciasData, reclamacoesData, reservasData, encomendasData]);

  // GRÁFICO DE ACESSOS - usa dados reais de access_logs (sem dados mocados)
  const chartDataAcessos = useMemo(() => {
    // Se tem dados reais, usa eles
    if (accessLogs.length > 0) {
      return accessLogs.map(log => ({
        name: log.date.split('-')[2], // Dia
        morador: log.morador,
        visitante: log.visitante
      }));
    }
    
    // Se não tem dados reais, retorna array vazio (sem mock data)
    return [];
  }, [selectedMonth, selectedYear, selectedBlock, accessLogs]);

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-800 tracking-tighter uppercase leading-none">Painel Geral</h2>
          <p className="text-sm text-gray-500 font-medium mt-1">Gestão inteligente e auditoria de performance.</p>
        </div>
        
        <div className="relative">
          <div 
            onMouseEnter={() => setShowLevelInfo(true)}
            onMouseLeave={() => setShowLevelInfo(false)}
            className="flex items-center space-x-3 text-sm text-gray-500 bg-white p-2 rounded-2xl border border-gray-100 shadow-sm cursor-help transition-all hover:border-yellow-400 group"
          >
             <span className="pl-2 font-bold uppercase text-[9px] tracking-widest text-gray-400">Nível de Gestão:</span>
             <div className="flex items-center space-x-3">
               <div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                 <div className={`h-full ${managementKPIs.barColor} transition-all duration-1000 ease-out`} style={{ width: `${managementKPIs.score}%` }}></div>
               </div>
               <span className={`font-bold ${managementKPIs.color} text-[10px] uppercase tracking-widest`}>{managementKPIs.level}</span>
               <i className={`fa-solid fa-circle-info ${managementKPIs.score >= 80 ? 'text-yellow-500' : 'text-slate-300'} text-[11px] group-hover:scale-110 transition-transform`}></i>
             </div>
          </div>

          {showLevelInfo && (
            <div className="absolute top-14 right-0 w-[340px] bg-slate-900 text-white p-8 rounded-[2.5rem] shadow-2xl z-[100] animate-in zoom-in-95 duration-200 border border-white/10">
              <div className="flex items-center space-x-4 mb-6 pb-6 border-b border-white/10">
                <div className={`w-12 h-12 ${managementKPIs.barColor} rounded-2xl flex items-center justify-center text-slate-900 shadow-lg`}>
                  <i className="fa-solid fa-chart-line text-lg"></i>
                </div>
                <div>
                  <h4 className="font-bold text-xs uppercase tracking-widest">Painel de Performance</h4>
                  <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">Evolução do Score: {managementKPIs.score}%</p>
                </div>
              </div>
              
              <div className="space-y-5">
                {[
                  { label: 'Saúde Financeira', sub: 'Saldo positivo', ok: managementKPIs.points.saldo },
                  { label: 'Ocupação de Unidades', sub: 'Taxa acima de 80%', ok: managementKPIs.points.ocupacao },
                  { label: 'Taxa de Ocorrências', sub: 'Volume controlado', ok: managementKPIs.points.ocorrencias },
                  { label: 'Crescimento de Áreas', sub: 'Reservas em alta', ok: managementKPIs.points.reservas },
                  { label: 'Eficiência Logística', sub: 'Prazos reduzidos', ok: managementKPIs.points.encomendas },
                ].map((kpi, idx) => (
                  <div key={idx} className="flex justify-between items-center">
                    <div>
                      <p className={`text-[10px] font-bold ${kpi.ok ? 'text-emerald-400' : 'text-red-400'} uppercase tracking-widest`}>{kpi.label}</p>
                      <p className="text-[8px] text-gray-400 font-medium uppercase mt-0.5">{kpi.sub}</p>
                    </div>
                    <i className={`fa-solid ${kpi.ok ? 'fa-check text-emerald-400' : 'fa-xmark text-red-400'} text-[10px]`}></i>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </header>

      <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm flex flex-wrap items-end gap-6">
        <div className="flex flex-col">
          <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Mês de Referência</label>
          <select 
            value={selectedMonth} 
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="bg-slate-50 border-none text-xs font-bold text-slate-700 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-yellow-400 shadow-inner appearance-none min-w-[150px]"
          >
            {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </div>

        <div className="flex flex-col">
          <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Ano</label>
          <select 
            value={selectedYear} 
            onChange={(e) => setSelectedYear(e.target.value)}
            className="bg-slate-50 border-none text-xs font-bold text-slate-700 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-yellow-400 shadow-inner appearance-none min-w-[120px]"
          >
            {YEARS.map(y => <option key={y.value} value={y.value}>{y.label}</option>)}
          </select>
        </div>

        <div className="flex flex-col">
          <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Unidades</label>
          <div className="relative">
            <select 
              value={selectedBlock} 
              onChange={(e) => setSelectedBlock(e.target.value)}
              className="bg-slate-50 border-none text-xs font-bold text-slate-700 rounded-xl pl-10 pr-6 py-3 outline-none focus:ring-2 focus:ring-yellow-400 shadow-inner appearance-none min-w-[200px]"
            >
              {blocksList.length > 0 
                ? blocksList.map(b => <option key={b.id} value={b.id}>{b.name}</option>)
                : BLOCKS.map(b => <option key={b.id} value={b.id}>{b.name}</option>)
              }
              <option value="ALL">Todas as Unidades</option>
            </select>
            <i className="fa-solid fa-building absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 text-[10px]"></i>
          </div>
        </div>

        <button 
          onClick={handleClearFilters}
          className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest flex items-center space-x-2 hover:bg-slate-800 transition-all active:scale-95 shadow-lg shadow-slate-200 mb-0.5"
        >
          <i className="fa-solid fa-eraser"></i>
          <span>Limpar Filtros</span>
        </button>

        <div className="flex-1 flex justify-end">
           <div className="flex items-center space-x-2 bg-emerald-50 text-emerald-600 px-4 py-2 rounded-xl border border-emerald-100 animate-pulse">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
              <span className="text-[9px] font-bold uppercase tracking-widest">Sincronizado</span>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 flex flex-col items-center hover:shadow-xl transition-all group text-center">
            <p className="text-gray-400 text-[9px] mb-2 uppercase tracking-[0.2em] font-bold">Moradores Ativos</p>
            <h3 className="text-4xl font-bold text-slate-800 tracking-tighter group-hover:scale-110 transition-transform">{dynamicMetrics.moradores}</h3>
            <div className="mt-6 flex items-center space-x-2">
                <div className="px-2 py-0.5 rounded-lg bg-emerald-50 border border-emerald-100">
                    <span className="text-[9px] font-bold text-emerald-600">99%</span>
                </div>
                <span className="text-[8px] text-gray-400 font-bold uppercase tracking-widest">Atualizado</span>
            </div>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 hover:shadow-xl transition-all group">
            <div className="flex justify-between items-start mb-2">
                <p className="text-gray-400 text-[9px] uppercase tracking-[0.2em] font-bold">Ocorrências</p>
                <span className={`px-2 py-0.5 ${ocorrenciasData.pendentes === 0 ? 'bg-emerald-50 text-emerald-500' : 'bg-red-50 text-red-500'} text-[8px] font-bold rounded-full border border-red-100 uppercase tracking-widest`}>{ocorrenciasData.pendentes} Pendentes</span>
            </div>
            <h3 className="text-4xl font-bold text-slate-800 tracking-tighter">{ocorrenciasData.total}</h3>
            <div className="flex justify-between items-center mt-2">
                <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">{ocorrenciasData.concluidas} Concluídas</p>
            </div>
            <div className="mt-4 h-1 bg-slate-50 rounded-full overflow-hidden">
                <div className={`h-full ${ocorrenciasData.pendentes === 0 ? 'bg-emerald-500' : 'bg-red-500'} transition-all duration-700`} style={{ width: `${ocorrenciasData.total > 0 ? (ocorrenciasData.concluidas / ocorrenciasData.total) * 100 : 100}%` }}></div>
            </div>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 hover:shadow-xl transition-all group">
            <div className="flex justify-between items-start mb-2">
                <p className="text-gray-400 text-[9px] uppercase tracking-[0.2em] font-bold">Reclamações</p>
                <span className={`px-2 py-0.5 ${reclamacoesData.pendentes === 0 ? 'bg-emerald-50 text-emerald-500' : 'bg-yellow-50 text-yellow-500'} text-[8px] font-bold rounded-full border border-yellow-100 uppercase tracking-widest`}>{reclamacoesData.pendentes} Pendentes</span>
            </div>
            <h3 className="text-4xl font-bold text-slate-800 tracking-tighter">{reclamacoesData.total}</h3>
            <div className="flex justify-between items-center mt-2">
                <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">{reclamacoesData.concluidas} Concluídas</p>
            </div>
            <div className="mt-4 h-1 bg-slate-50 rounded-full overflow-hidden">
                <div className={`h-full ${reclamacoesData.pendentes === 0 ? 'bg-emerald-500' : 'bg-yellow-500'} transition-all duration-700`} style={{ width: `${reclamacoesData.total > 0 ? (reclamacoesData.concluidas / reclamacoesData.total) * 100 : 100}%` }}></div>
            </div>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 hover:shadow-xl transition-all group">
            <p className="text-gray-400 text-[9px] mb-2 uppercase tracking-[0.2em] font-bold">Reservas no Mês</p>
            <h3 className="text-4xl font-bold text-slate-800 tracking-tighter">{reservasData.total}</h3>
            <p className={`text-[9px] ${reservasData.total > 0 ? 'text-emerald-500' : 'text-slate-400'} font-bold uppercase tracking-widest mt-2 flex items-center`}>
                <i className="fa-solid fa-arrow-up mr-2"></i> {reservasData.total > 0 ? 'Reservas este mês' : 'Nenhuma reserva'}
            </p>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 hover:shadow-xl transition-all">
            <p className="text-gray-400 text-[9px] mb-2 uppercase tracking-[0.2em] font-bold">Encomendas</p>
            <h3 className="text-4xl font-bold text-slate-800 tracking-tighter">{encomendasData.total}</h3>
            <div className="mt-6 flex space-x-2">
                <div className={`p-2 rounded-xl flex-1 text-center border ${encomendasData.pendentes5dias === 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
                    <p className={`${encomendasData.pendentes5dias === 0 ? 'text-emerald-600' : 'text-red-600'} font-bold text-base leading-none`}>{encomendasData.pendentes5dias}</p>
                    <p className={`text-[7px] ${encomendasData.pendentes5dias === 0 ? 'text-emerald-400' : 'text-red-400'} uppercase font-bold tracking-widest mt-1`}>+5 Dias</p>
                </div>
                <div className="bg-slate-900 p-2 rounded-xl flex-1 text-center shadow-lg">
                    <p className="text-yellow-400 font-bold text-base leading-none">{encomendasData.total}</p>
                    <p className="text-[7px] text-gray-400 uppercase font-bold tracking-widest mt-1">Total</p>
                </div>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h4 className="font-bold text-slate-800 uppercase text-[10px] tracking-[0.2em]">
                {selectedMonth === 'ALL' ? 'Fluxo de Acessos Anual' : `Fluxo de Acessos: ${MONTHS.find(m => m.value === selectedMonth)?.label}`}
              </h4>
              <p className="text-[9px] text-gray-400 font-bold uppercase mt-1">
                {accessLogs.length > 0 
                  ? `${accessLogs.length} dia(s) com registros`
                  : 'Sem registros de acesso'}
              </p>
            </div>
            <div className="flex items-center space-x-4">
               <div className="flex items-center space-x-1.5"><div className="w-2 h-2 bg-blue-500 rounded-full"></div><span className="text-[8px] font-bold uppercase text-gray-400">Morador</span></div>
               <div className="flex items-center space-x-1.5"><div className="w-2 h-2 bg-yellow-400 rounded-full"></div><span className="text-[8px] font-bold uppercase text-gray-400">Visitante</span></div>
            </div>
          </div>
          
          {/* Botões de registro de acesso */}
          <div className="flex gap-3 mb-6">
            <button
              onClick={() => setAccessModalType('MORADOR')}
              className="flex items-center space-x-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all"
            >
              <i className="fa-solid fa-user-check"></i>
              <span>Registrar Morador</span>
            </button>
            <button
              onClick={() => setAccessModalType('VISITANTE')}
              className="flex items-center space-x-2 bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all"
            >
              <i className="fa-solid fa-user-clock"></i>
              <span>Registrar Visitante</span>
            </button>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartDataAcessos}>
                <defs>
                  <linearGradient id="colorMorador" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorVisitante" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#fbbf24" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#fbbf24" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fontSize: 9, fill: '#94a3b8', fontWeight: 600}}
                  interval={selectedMonth === 'ALL' ? 0 : 4} // Mostra rótulos a cada 5 dias para não poluir
                />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 9, fill: '#94a3b8'}} />
                <RechartsTooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  labelFormatter={(label) => selectedMonth === 'ALL' ? `Mês: ${label}` : `Dia: ${label}`}
                />
                <Area type="monotone" dataKey="morador" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorMorador)" />
                <Area type="monotone" dataKey="visitante" stroke="#fbbf24" strokeWidth={2} fillOpacity={1} fill="url(#colorVisitante)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-gray-100 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h4 className="font-bold text-slate-800 uppercase text-[10px] tracking-[0.2em]">Ocupação de Unidades</h4>
            <span className={`text-[9px] font-bold ${managementKPIs.points.ocupacao ? 'text-emerald-600 bg-emerald-50 border-emerald-100' : 'text-red-500 bg-red-50 border-red-100'} px-3 py-1 rounded-full uppercase tracking-widest border transition-all`}>
                {occupationData[0].value}% Ocupado
            </span>
          </div>
          
          <div className="flex-1 flex flex-col md:flex-row items-center justify-between">
            <div className="h-64 w-full md:w-1/2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={occupationData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={85}
                    paddingAngle={8}
                    dataKey="value"
                    stroke="none"
                  >
                    {occupationData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="w-full md:w-1/2 space-y-6 pl-0 md:pl-10 mt-6 md:mt-0">
               <div className="flex items-center justify-between group">
                  <div className="flex items-center space-x-3">
                     <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                     <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Unidades Ocupadas</span>
                  </div>
                  <span className="text-sm font-bold text-slate-800">{occupationData[0].value}%</span>
               </div>
               <div className="flex items-center justify-between group">
                  <div className="flex items-center space-x-3">
                     <div className="w-3 h-3 bg-slate-200 rounded-full"></div>
                     <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Unidades Vagas</span>
                  </div>
                  <span className="text-sm font-bold text-slate-800">{occupationData[1].value}%</span>
               </div>
               
               <div className="pt-6 border-t border-gray-50">
                  <p className="text-[8px] text-gray-400 font-bold uppercase tracking-widest italic leading-relaxed">
                     * Dados filtrados para: <br/>
                     <span className="text-slate-900 font-bold">{BLOCKS.find(b => b.id === selectedBlock)?.name || 'Consolidação Global'}</span>
                     {selectedYear !== 'ALL' && <span className="ml-1">em {selectedYear}</span>}
                  </p>
               </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Registro de Acesso */}
      {accessModalType && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-slate-800 uppercase tracking-widest">
                Registrar {accessModalType === 'MORADOR' ? 'Morador' : 'Visitante'}
              </h3>
              <button 
                onClick={() => { setAccessModalType(null); setAccessFormData({ name: '', document: '', reason: '', block_id: '', unit: '', profile_id: '', documentType: 'CPF' }); }}
                className="text-gray-400 hover:text-slate-600 text-xl"
              >
                <i className="fa-solid fa-times"></i>
              </button>
            </div>

            <div className="space-y-4">
              {/* Se for MORADOR: selecionar Bloco -> Apartamento -> Morador */}
              {accessModalType === 'MORADOR' ? (
                <>
                  {/* 1. Bloco/Torre */}
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">Bloco/Torre</label>
                    <select
                      value={accessFormData.block_id}
                      onChange={(e) => setAccessFormData({...accessFormData, block_id: e.target.value, unit: '', name: '', profile_id: '', document: ''})}
                      className="w-full bg-slate-50 border-none text-sm font-bold text-slate-700 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Selecione o Bloco/Torre</option>
                      {blocksList.map(b => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* 2. Apartamento - filtra por bloco */}
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">Apartamento</label>
                    <select
                      value={accessFormData.unit}
                      onChange={(e) => setAccessFormData({...accessFormData, unit: e.target.value, name: '', profile_id: '', document: ''})}
                      className="w-full bg-slate-50 border-none text-sm font-bold text-slate-700 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={!accessFormData.block_id}
                    >
                      <option value="">Selecione o Apartamento</option>
                      {residentsList
                        .filter(r => r.block_id === accessFormData.block_id)
                        .map(r => r.unit)
                        .filter((v, i, a) => a.indexOf(v) === i) // unique units
                        .sort()
                        .map(unit => (
                          <option key={unit} value={unit}>{unit}</option>
                        ))}
                    </select>
                  </div>

                  {/* 3. Morador - filtra por bloco + apartamento */}
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">Morador</label>
                    <select
                      value={accessFormData.profile_id}
                      onChange={(e) => {
                        const resident = residentsList.find(r => r.id === e.target.value);
                        setAccessFormData({
                          ...accessFormData,
                          profile_id: resident?.id || '',
                          name: resident?.name || '',
                          document: resident?.cpf || '',
                          block_id: resident?.block_id || accessFormData.block_id,
                          unit: resident?.unit || accessFormData.unit
                        });
                      }}
                      className="w-full bg-slate-50 border-none text-sm font-bold text-slate-700 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={!accessFormData.unit}
                    >
                      <option value="">Selecione o Morador</option>
                      {residentsList
                        .filter(r => r.block_id === accessFormData.block_id && r.unit === accessFormData.unit)
                        .map(r => (
                          <option key={r.id} value={r.id}>{r.name}</option>
                        ))}
                    </select>
                  </div>

                  {/* Campos ocultos para debug */}
                  <input type="hidden" value={accessFormData.profile_id} />
                  <input type="hidden" value={accessFormData.document} />

                  {/* 4. Tipo de Registro */}
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">Tipo de Registro</label>
                    <select
                      value={accessFormData.reason}
                      onChange={(e) => setAccessFormData({...accessFormData, reason: e.target.value})}
                      className="w-full bg-slate-50 border-none text-sm font-bold text-slate-700 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Selecione</option>
                      <option value="Entrada">Entrada</option>
                      <option value="Saída">Saída</option>
                    </select>
                  </div>
                </>
              ) : (
                /* Se for VISITANTE: inserir dados manualmente */
                <>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">Nome do Visitante</label>
                    <input
                      type="text"
                      value={accessFormData.name}
                      onChange={(e) => setAccessFormData({...accessFormData, name: e.target.value})}
                      className="w-full bg-slate-50 border-none text-sm font-bold text-slate-700 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-yellow-500"
                      placeholder="Nome completo"
                    />
                  </div>

                  {/* Seletor de tipo de documento + campo com máscara */}
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">Tipo de Documento</label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setAccessFormData({...accessFormData, documentType: 'CPF', document: ''})}
                        className={`flex-1 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${
                          accessFormData.documentType === 'CPF' 
                            ? 'bg-blue-500 text-white' 
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        CPF
                      </button>
                      <button
                        type="button"
                        onClick={() => setAccessFormData({...accessFormData, documentType: 'RG', document: ''})}
                        className={`flex-1 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${
                          accessFormData.documentType === 'RG' 
                            ? 'bg-blue-500 text-white' 
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        RG
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">
                      {accessFormData.documentType === 'CPF' ? 'CPF' : 'RG'}
                    </label>
                    <input
                      type="text"
                      value={accessFormData.document}
                      onChange={(e) => {
                        let value = e.target.value.replace(/\D/g, '');
                        if (accessFormData.documentType === 'CPF' && value.length > 11) {
                          value = value.slice(0, 11);
                        } else if (accessFormData.documentType === 'RG' && value.length > 9) {
                          value = value.slice(0, 9);
                        }
                        
                        if (accessFormData.documentType === 'CPF') {
                          if (value.length >= 3 && value.length < 6) value = value.replace(/(\d{3})/, '$1.');
                          else if (value.length >= 6 && value.length < 9) value = value.replace(/(\d{3})(\d{3})/, '$1.$2.');
                          else if (value.length >= 9) value = value.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
                        }
                        
                        setAccessFormData({...accessFormData, document: value});
                      }}
                      className="w-full bg-slate-50 border-none text-sm font-bold text-slate-700 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-yellow-500"
                      placeholder={accessFormData.documentType === 'CPF' ? '000.000.000-00' : '00.000.000-0'}
                    />
                  </div>

                  {/* 1. Bloco/Torre */}
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">Bloco/Torre</label>
                    <select
                      value={accessFormData.block_id}
                      onChange={(e) => setAccessFormData({...accessFormData, block_id: e.target.value, unit: ''})}
                      className="w-full bg-slate-50 border-none text-sm font-bold text-slate-700 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-yellow-500"
                    >
                      <option value="">Selecione</option>
                      {blocksList.map(b => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* 2. Apartamento - filtra por bloco (apenas ocupados) */}
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">Apartamento</label>
                    <select
                      value={accessFormData.unit}
                      onChange={(e) => setAccessFormData({...accessFormData, unit: e.target.value})}
                      className="w-full bg-slate-50 border-none text-sm font-bold text-slate-700 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-yellow-500"
                      disabled={!accessFormData.block_id}
                    >
                      <option value="">Selecione</option>
                      {residentsList
                        .filter(r => r.block_id === accessFormData.block_id)
                        .map(r => r.unit)
                        .filter((v, i, a) => a.indexOf(v) === i)
                        .sort()
                        .map(unit => (
                          <option key={unit} value={unit}>{unit}</option>
                        ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">Motivo</label>
                    <select
                      value={accessFormData.reason}
                      onChange={(e) => setAccessFormData({...accessFormData, reason: e.target.value})}
                      className="w-full bg-slate-50 border-none text-sm font-bold text-slate-700 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-yellow-500"
                    >
                      <option value="">Selecione</option>
                      <option value="Visita">Visita</option>
                      <option value="Entrega">Entrega</option>
                      <option value="Serviço">Serviço/Manutenção</option>
                      <option value="Outros">Outros</option>
                    </select>
                  </div>
                </>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => handleRegisterAccess('ENTRY')}
                  className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all flex items-center justify-center space-x-2"
                >
                  <i className="fa-solid fa-sign-in-alt"></i>
                  <span>Entrada</span>
                </button>
                <button
                  onClick={() => handleRegisterAccess('EXIT')}
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all flex items-center justify-center space-x-2"
                >
                  <i className="fa-solid fa-sign-out-alt"></i>
                  <span>Saída</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
