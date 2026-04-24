
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { FinancialEntry } from '../types';

interface FinanceiroProps {
  userRole?: 'admin' | 'resident' | 'manager';
  currentUser?: {
    id: string;
    name: string;
    unit: string;
    role: string;
  };
}

const MONTHS = [
  { label: 'Jan', value: '01' },
  { label: 'Fev', value: '02' },
  { label: 'Mar', value: '03' },
  { label: 'Abr', value: '04' },
  { label: 'Mai', value: '05' },
  { label: 'Jun', value: '06' },
  { label: 'Jul', value: '07' },
  { label: 'Ago', value: '08' },
  { label: 'Set', value: '09' },
  { label: 'Out', value: '10' },
  { label: 'Nov', value: '11' },
  { label: 'Dez', value: '12' }
];

const CATEGORIES = [
  'Pessoal',
  'RH',
  'Manutenção',
  'Água',
  'Luz',
  'Utilidades',
  'Administrativo',
  'Receita Operacional'
];

const CATEGORY_COLORS: Record<string, string> = {
  'Manutenção': '#fbbf24', 
  'Pessoal': '#3b82f6',     
  'Administrativo': '#64748b', 
  'RH': '#8b5cf6',          
  'Água': '#0ea5e9',        
  'Luz': '#f59e0b',         
  'Utilidades': '#10b981',  
  'Receita Operacional': '#10b981' 
};

const INITIAL_ENTRIES: FinancialEntry[] = [
  { id: '1', description: 'Taxa Condominial Un. 101', type: 'RECU', category: 'Receita Operacional', amount: 850.00, date: '2025-01-10', status: 'paid' },
  { id: '2', description: 'Folha de Pagamento - Zeladoria', type: 'DESP', category: 'Pessoal', amount: 4200.00, date: '2025-01-05', status: 'paid' },
  { id: '3', description: 'Manutenção Elevadores OTIS', type: 'DESP', category: 'Manutenção', amount: 1500.00, date: '2025-02-12', status: 'paid' },
  { id: '4', description: 'Conta de Energia CPFL', type: 'DESP', category: 'Luz', amount: 2800.00, date: '2025-02-15', status: 'paid' },
  { id: '5', description: 'Conta de Água Sabesp', type: 'DESP', category: 'Água', amount: 1200.00, date: '2025-02-20', status: 'paid' },
  { id: '6', description: 'Taxa Condominial Un. 202', type: 'RECU', category: 'Receita Operacional', amount: 850.00, date: '2025-03-10', status: 'overdue' },
  { id: '7', description: 'Compra de EPIs - Segurança', type: 'DESP', category: 'RH', amount: 650.00, date: '2025-04-05', status: 'paid' },
];

const Financeiro: React.FC<FinanceiroProps> = ({ userRole = 'resident', currentUser }) => {
  const [entries, setEntries] = useState<FinancialEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState('2025');
  const [activeMonthFilter, setActiveMonthFilter] = useState<string | null>(null);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string | null>(null);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [isLedgerModalOpen, setIsLedgerModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'cashflow' | 'units'>('cashflow');
  const [ledgerSearchTerm, setLedgerSearchTerm] = useState('');
  const [ledgerStatusFilter, setLedgerStatusFilter] = useState('all');
  const [ledgerMonthFilter, setLedgerMonthFilter] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [ledgerEntries, setLedgerEntries] = useState<any[]>([]);
  const [residents, setResidents] = useState<any[]>([]);
  const [activeEntryMenu, setActiveEntryMenu] = useState<string | null>(null);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  
  // Estados para Modais de Ação
  const [viewingEntry, setViewingEntry] = useState<FinancialEntry | null>(null);
  const [deletingEntry, setDeletingEntry] = useState<FinancialEntry | null>(null);
  const [provingEntry, setProvingEntry] = useState<FinancialEntry | null>(null);
  const [receiptFilePreview, setReceiptFilePreview] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isAdmin = userRole === 'admin';

  useEffect(() => {
    fetchEntries();
    fetchLedger();
    fetchResidents();
  }, []);

  const fetchResidents = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, unit, role, status')
        .eq('status', 'active');
      if (error) throw error;
      setResidents(data || []);
    } catch (err) {
      console.error('Error fetching residents:', err);
    }
  };

  const filteredLedgerEntries = useMemo(() => {
    return ledgerEntries.filter(l => {
      const matchesSearch = (l.resident_name || '').toLowerCase().includes(ledgerSearchTerm.toLowerCase()) || 
                          (l.unit || '').toLowerCase().includes(ledgerSearchTerm.toLowerCase());
      const matchesStatus = ledgerStatusFilter === 'all' || l.status === ledgerStatusFilter;
      const matchesMonth = !ledgerMonthFilter || (l.due_date && l.due_date.startsWith(ledgerMonthFilter));
      return matchesSearch && matchesStatus && matchesMonth;
    });
  }, [ledgerEntries, ledgerSearchTerm, ledgerStatusFilter, ledgerMonthFilter]);

  const fetchLedger = async () => {
    try {
      const { data, error } = await supabase
        .from('resident_ledger')
        .select('*')
        .order('due_date', { ascending: false });
      if (error) throw error;
      setLedgerEntries(data || []);
    } catch (err) {
      console.error('Error fetching ledger:', err);
    }
  };

  const handleRegisterLedger = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const formData = new FormData(e.currentTarget);
      const profileId = formData.get('profile_id') as string;
      const resident = residents.find(r => r.id === profileId);
      
      const { error } = await supabase
        .from('resident_ledger')
        .insert({
          profile_id: profileId,
          resident_name: resident?.name || 'Morador',
          unit: resident?.unit || '---',
          amount: parseFloat(formData.get('amount') as string),
          due_date: formData.get('due_date') as string,
          type: formData.get('type') as string,
          status: 'pending',
          notes: formData.get('notes') as string
        });

      if (error) throw error;

      await fetchLedger();
      setIsLedgerModalOpen(false);
      alert('Cobrança registrada com sucesso!');
    } catch (err: any) {
      alert('Erro: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateProRata = (totalAmount: number, entryDate: string) => {
    const date = entryDate ? new Date(entryDate) : new Date();
    const totalDays = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    const occupiedDays = totalDays - date.getDate() + 1;
    return (totalAmount / totalDays) * occupiedDays;
  };

  const handleUpdateLedgerStatus = async (id: string, status: 'paid' | 'overdue') => {
    setIsLoading(true);
    try {
      const { data: ledgerEntry, error: getError } = await supabase
        .from('resident_ledger')
        .select('*')
        .eq('id', id)
        .single();
      
      if (getError) throw getError;

      const { error } = await supabase
        .from('resident_ledger')
        .update({ status, paid_at: status === 'paid' ? new Date().toISOString() : null })
        .eq('id', id);

      if (error) throw error;

      // Se foi pago, criar entrada automática no Fluxo de Caixa Geral
      if (status === 'paid') {
        const { error: entryError } = await supabase
          .from('financial_entries')
          .insert({
            description: `Pgto ${ledgerEntry.type === 'rent' ? 'Aluguel' : 'Condomínio'} - Un. ${ledgerEntry.unit}`,
            entry_type: 'RECEITA',
            category: 'Receita Operacional',
            amount: ledgerEntry.amount,
            date: new Date().toISOString().split('T')[0],
            status: 'paid'
          });
        if (entryError) console.error('Erro ao criar lançamento automático:', entryError);
      }

      await fetchLedger();
      await fetchEntries();
      alert('Status atualizado!');
    } catch (err: any) {
      alert('Erro ao atualizar: ' + err.message);
    } finally {
      setIsLoading(false);
      setActiveEntryMenu(null);
    }
  };

  const handleBatchBilling = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const formData = new FormData(e.currentTarget);
      const amount = parseFloat(formData.get('amount') as string);
      const dueDate = formData.get('due_date') as string;
      const type = formData.get('type') as string;
      const period = formData.get('period') as string; // Ex: 2026-04

      // Filtra moradores/gestores ativos e que POSSUAM apartamento vinculado (unit não nulo)
      const activeResidents = residents.filter(r => 
        (r.role === 'resident' || r.role === 'manager') && 
        r.unit && 
        r.unit !== 'NULL' && 
        r.unit !== ''
      );

      if (activeResidents.length === 0) {
        throw new Error('Nenhum morador ativo encontrado para faturamento.');
      }

      const newEntries = activeResidents.map(r => ({
        profile_id: r.id,
        resident_name: r.name,
        unit: r.unit,
        amount: amount,
        due_date: dueDate,
        type: type,
        status: 'pending',
        notes: `Faturamento Mensal - Ref: ${period}`
      }));

      // Inserção em lote no Supabase
      const { error } = await supabase
        .from('resident_ledger')
        .insert(newEntries);

      if (error) throw error;

      await fetchLedger();
      setIsBatchModalOpen(false);
      alert(`${newEntries.length} cobranças geradas com sucesso para o período ${period}!`);
    } catch (err: any) {
      alert('Erro no faturamento em lote: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchEntries = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('financial_entries')
        .select('*')
        .order('date', { ascending: false });

      if (error) throw error;

      const formatted = (data || []).map((r: any) => ({
        id: r.id,
        description: r.description,
        type: r.entry_type === 'RECEITA' ? 'RECU' : 'DESP',
        category: r.category,
        amount: parseFloat(r.amount),
        date: r.date,
        status: r.status,
        notes: r.notes
      }));

      setEntries(formatted.length > 0 ? formatted : INITIAL_ENTRIES);
    } catch (err) {
      console.log('Fallback:', err);
      setEntries(INITIAL_ENTRIES);
    } finally {
      setIsLoading(false);
    }
  };

  // --- LÓGICA DE FILTRAGEM ---
  
  const filteredEntries = useMemo(() => {
    let result = [...entries].filter(e => e.date.startsWith(selectedYear));
    if (activeMonthFilter) {
      result = result.filter(e => e.date.split('-')[1] === activeMonthFilter);
    }
    if (activeCategoryFilter) {
      result = result.filter(e => e.category === activeCategoryFilter);
    }
    return result.sort((a, b) => b.date.localeCompare(a.date));
  }, [entries, selectedYear, activeMonthFilter, activeCategoryFilter]);

  const metrics = useMemo(() => {
    const receitas = filteredEntries.filter(e => e.type === 'RECU').reduce((acc, curr) => acc + curr.amount, 0);
    const despesas = filteredEntries.filter(e => e.type === 'DESP').reduce((acc, curr) => acc + curr.amount, 0);
    
    // Calcular inadimplência baseado em entradas overdue
    const totalExpected = receitas * 1.2; // Estimativa de receita esperada
    const paidEntries = filteredEntries.filter(e => e.type === 'RECU' && e.status === 'paid');
    const totalPaid = paidEntries.reduce((acc, curr) => acc + curr.amount, 0);
    
    // Se não tem dados suficientes, usa 0
    const inadimplencia = totalExpected > 0 
      ? Math.max(0, Math.round((1 - (totalPaid / totalExpected)) * 1000) / 10)
      : 0;
    
    return { saldo: receitas - despesas, receitas, despesas, inadimplencia };
  }, [filteredEntries]);

  const chartData = useMemo(() => {
    if (activeMonthFilter) {
      return Array.from({ length: 31 }, (_, i) => {
        const dayStr = (i + 1).toString().padStart(2, '0');
        const dayEntries = entries.filter(e => e.date === `${selectedYear}-${activeMonthFilter}-${dayStr}`);
        const receitas = dayEntries.filter(e => e.type === 'RECU').reduce((acc, curr) => acc + curr.amount, 0);
        const despesas = dayEntries.filter(e => e.type === 'DESP' && (!activeCategoryFilter || e.category === activeCategoryFilter)).reduce((acc, curr) => acc + curr.amount, 0);
        return { name: dayStr, value: dayStr, receitas, despesas };
      });
    } else {
      return MONTHS.map((m) => {
        const monthEntries = entries.filter(e => e.date.startsWith(`${selectedYear}-${m.value}`));
        const receitas = monthEntries.filter(e => e.type === 'RECU').reduce((acc, curr) => acc + curr.amount, 0);
        const despesas = monthEntries.filter(e => e.type === 'DESP' && (!activeCategoryFilter || e.category === activeCategoryFilter)).reduce((acc, curr) => acc + curr.amount, 0);
        return { name: m.label, value: m.value, receitas, despesas };
      });
    }
  }, [entries, selectedYear, activeMonthFilter, activeCategoryFilter]);

  const pieData = useMemo(() => {
    const baseEntries = entries.filter(e => e.date.startsWith(selectedYear) && (!activeMonthFilter || e.date.split('-')[1] === activeMonthFilter));
    const totals: Record<string, number> = {};
    baseEntries.filter(e => e.type === 'DESP').forEach(e => {
      totals[e.category] = (totals[e.category] || 0) + e.amount;
    });
    const totalDespesas = Object.values(totals).reduce((a, b) => a + b, 0);
    return Object.entries(totals).map(([name, value]) => ({ 
      name, 
      value,
      percent: totalDespesas > 0 ? (value / totalDespesas) * 100 : 0
    }));
  }, [entries, selectedYear, activeMonthFilter]);

  // --- HANDLERS ---

  const handleRegisterEntry = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const formData = new FormData(e.currentTarget);
      const entryType = formData.get('type') === 'RECU' ? 'RECEITA' : 'DESPESA';
      
      const { data, error } = await supabase
        .from('financial_entries')
        .insert({
          description: formData.get('description') as string,
          entry_type: entryType,
          category: formData.get('category') as string,
          amount: parseFloat(formData.get('amount') as string),
          date: formData.get('date') as string,
          status: 'paid',
          created_by: (await supabase.auth.getUser()).data.user?.id
        })
        .select()
        .single();

      if (error) throw error;

      // Registrar auditoria
      await supabase.from('financial_audit').insert({
        entry_id: data.id,
        action: 'CREATE',
        new_value: JSON.stringify(data),
        notes: `Criado por ${currentUser?.name || 'Sistema'}`
      });

      await fetchEntries();
      setIsRegisterModalOpen(false);
      alert('Lançamento registrado com sucesso!');
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Erro ao registrar');
    } finally {
      setIsLoading(false);
    }
  };

  const confirmDelete = async () => {
    if (!deletingEntry) return;
    setIsLoading(true);
    try {
      const oldData = { ...deletingEntry };
      
      const { error } = await supabase
        .from('financial_entries')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('id', deletingEntry.id);

      if (error) throw error;

      // Registrar auditoria
      await supabase.from('financial_audit').insert({
        entry_id: deletingEntry.id,
        action: 'DELETE',
        old_value: JSON.stringify(oldData),
        notes: `Cancelado por ${currentUser?.name || 'Sistema'}`
      });

      setEntries(prev => prev.filter(e => e.id !== deletingEntry.id));
      setDeletingEntry(null);
      setActiveEntryMenu(null);
      alert('Lançamento cancelado.');
    } catch (err) {
      console.error(err);
      // Fallback local
      setEntries(prev => prev.filter(e => e.id !== deletingEntry.id));
      setDeletingEntry(null);
      setActiveEntryMenu(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setReceiptFilePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const saveReceipt = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const notes = formData.get('notes') as string;

    if (provingEntry) {
      setEntries(prev => prev.map(entry => 
        entry.id === provingEntry.id 
          ? { ...entry, receiptUrl: receiptFilePreview || entry.receiptUrl, description: notes || entry.description } 
          : entry
      ));
      setProvingEntry(null);
      setReceiptFilePreview(null);
      alert('Informações do lançamento e comprovante atualizados!');
    }
  };

  const CustomPieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-4 rounded-2xl shadow-2xl border border-gray-100 animate-in zoom-in-95">
          <p className="text-[10px] font-black uppercase text-gray-400 mb-1 tracking-widest">{data.name}</p>
          <p className="text-sm font-black text-slate-900">R$ {data.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
          <p className="text-[10px] font-bold text-blue-500 uppercase mt-1">Representa {data.percent.toFixed(1)}% do total</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20 no-print">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tighter uppercase">Gestão Financeira</h2>
          <p className="text-sm text-gray-500 font-medium italic">Monitoramento e Auditoria • {selectedYear}</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => window.print()} className="bg-white border border-gray-200 px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center space-x-2 shadow-sm">
            <i className="fa-solid fa-file-pdf"></i>
            <span>Exportar Relatório</span>
          </button>
          <button 
            onClick={() => setIsRegisterModalOpen(true)}
            className="mycond-bg-yellow text-slate-900 px-6 py-2.5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-yellow-100 hover:bg-yellow-500 transition-all active:scale-95"
          >
            + Novo Lançamento
          </button>
        </div>
      </header>

      {/* Navegação entre Visões */}
      <div className="flex space-x-8 border-b border-gray-100">
        <button 
          onClick={() => setActiveTab('cashflow')} 
          className={`pb-4 px-2 text-xs font-black uppercase tracking-widest transition-all relative ${activeTab === 'cashflow' ? 'text-slate-900' : 'text-gray-400'}`}
        >
          <i className="fa-solid fa-chart-line mr-2"></i> Fluxo de Caixa
          {activeTab === 'cashflow' && <div className="absolute bottom-0 left-0 w-full h-1 mycond-bg-yellow rounded-t-full"></div>}
        </button>
        <button 
          onClick={() => setActiveTab('units')} 
          className={`pb-4 px-2 text-xs font-black uppercase tracking-widest transition-all relative ${activeTab === 'units' ? 'text-slate-900' : 'text-gray-400'}`}
        >
          <i className="fa-solid fa-hotel mr-2"></i> Gestão de Unidades & Aluguel
          {activeTab === 'units' && <div className="absolute bottom-0 left-0 w-full h-1 mycond-bg-yellow rounded-t-full"></div>}
        </button>
      </div>

      {/* Barra de Filtros (Apenas para Fluxo de Caixa) */}
      {activeTab === 'cashflow' && (
        <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm flex flex-wrap items-center justify-between gap-6 slide-in-from-top-4">
          <div className="flex items-center space-x-6">
            <div className="flex flex-col">
              <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Ano</label>
              <select 
                value={selectedYear} 
                onChange={(e) => setSelectedYear(e.target.value)}
                className="bg-slate-50 border-none text-xs font-black text-slate-700 rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-yellow-400"
              >
                {['2024', '2025', '2026'].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div className="flex flex-col">
              <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Mês de Referência</label>
              <div className="flex bg-slate-100 p-1 rounded-xl">
                <button onClick={() => setActiveMonthFilter(null)} className={`px-4 py-1.5 rounded-lg text-[10px] font-black transition-all ${!activeMonthFilter ? 'bg-white shadow-sm text-slate-900' : 'text-gray-400'}`}>Todos</button>
                {MONTHS.map(m => (
                  <button key={m.label} onClick={() => setActiveMonthFilter(m.value)} className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all ${activeMonthFilter === m.value ? 'bg-white shadow-sm text-slate-900' : 'text-gray-400'}`}>{m.label}</button>
                ))}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
              {activeCategoryFilter && (
                <button onClick={() => setActiveCategoryFilter(null)} className="text-[10px] font-black text-blue-600 uppercase flex items-center bg-blue-50 px-4 py-2 rounded-xl border border-blue-100 hover:bg-blue-100 transition-all">
                  <i className="fa-solid fa-filter mr-2"></i> Filtro: {activeCategoryFilter}
                </button>
              )}
              {activeMonthFilter && (
                <button onClick={() => setActiveMonthFilter(null)} className="text-[10px] font-black text-red-500 uppercase flex items-center bg-red-50 px-4 py-2 rounded-xl border border-red-100 hover:bg-red-100 transition-all">
                  <i className="fa-solid fa-circle-xmark mr-2"></i> Limpar Mês
                </button>
              )}
          </div>
        </div>
      )}

      {/* Métricas (Fluxo de Caixa) */}
      {activeTab === 'cashflow' && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 animate-in slide-in-from-bottom-4">
          <div className="bg-white p-7 rounded-[2.5rem] border border-gray-100 shadow-sm flex flex-col justify-center">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Receitas Período</p>
            <h3 className="text-2xl font-black text-emerald-500">R$ {metrics.receitas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
          </div>
          <div className="bg-white p-7 rounded-[2.5rem] border border-gray-100 shadow-sm flex flex-col justify-center">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Despesas Período</p>
            <h3 className="text-2xl font-black text-red-500">R$ {metrics.despesas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
          </div>
          <div className="bg-white p-7 rounded-[2.5rem] border border-gray-100 shadow-sm flex flex-col justify-center">
            <p className="text-[10px] font-black text-red-600 uppercase tracking-widest mb-1">Inadimplência <i className="fa-solid fa-triangle-exclamation"></i></p>
            <h3 className="text-2xl font-black text-red-600">{metrics.inadimplencia}%</h3>
          </div>
          <div className="bg-slate-900 p-7 rounded-[2.5rem] shadow-xl flex flex-col justify-center">
            <p className="text-[10px] font-black text-yellow-400 uppercase tracking-widest mb-1">Saldo Líquido</p>
            <h3 className={`text-2xl font-black ${metrics.saldo >= 0 ? 'text-white' : 'text-red-400'}`}>R$ {metrics.saldo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
          </div>
        </div>
      )}

        {/* Gráficos e Tabela (Fluxo de Caixa) */}
      {activeTab === 'cashflow' && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-700">
            <div className="lg:col-span-2 bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm flex flex-col min-h-[450px] relative">
              <div className="flex justify-between items-center mb-8">
                <h4 className="font-black text-slate-800 uppercase text-xs tracking-[0.2em]">Fluxo {activeMonthFilter ? 'Diário' : 'Anual'} de Caixa</h4>
                <div className="flex space-x-4 text-[10px] font-black uppercase">
                  <span className="text-blue-500">Receitas</span>
                  <span className="text-red-400">Despesas</span>
                </div>
              </div>
              <div className="flex-1">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} onClick={(s: any) => s && s.activePayload && !activeMonthFilter && setActiveMonthFilter(s.activePayload[0].payload.value)}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 9, fill: '#94a3b8', fontWeight: 900}} interval={activeMonthFilter ? 1 : 0} />
                    <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} />
                    <Tooltip cursor={{fill: '#f8fafc'}} />
                    <Bar dataKey="receitas" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="despesas" fill={activeCategoryFilter ? CATEGORY_COLORS[activeCategoryFilter] : '#f87171'} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm flex flex-col min-h-[450px]">
              <h4 className="font-black text-slate-800 uppercase text-xs tracking-[0.2em] mb-8 text-center uppercase">Despesas por Categoria</h4>
              <div className="flex-1 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={75} outerRadius={105} paddingAngle={5} dataKey="value" onClick={(d) => d && d.name && setActiveCategoryFilter(activeCategoryFilter === d.name ? null : d.name)}>
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[entry.name] || '#cbd5e1'} className={`cursor-pointer transition-all duration-300 ${activeCategoryFilter === entry.name ? 'scale-105 opacity-100' : activeCategoryFilter ? 'opacity-30' : 'opacity-100'}`} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomPieTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-[3rem] shadow-sm border border-gray-100 overflow-hidden animate-in slide-in-from-bottom-8">
            <div className="px-10 py-8 border-b border-gray-50 flex justify-between items-center">
              <h4 className="font-black text-slate-800 uppercase text-xs tracking-[0.2em]">Histórico de Lançamentos</h4>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2"><div className="w-2 h-2 bg-blue-500 rounded-full"></div><span className="text-[9px] font-black uppercase text-gray-400">Receita</span></div>
                <div className="flex items-center space-x-2"><div className="w-2 h-2 bg-red-400 rounded-full"></div><span className="text-[9px] font-black uppercase text-gray-400">Despesa</span></div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50/50 border-b border-gray-100 font-black text-[10px] text-gray-400 uppercase tracking-widest">
                    <th className="px-10 py-6">Data</th>
                    <th className="px-6 py-6">Descrição / Categoria</th>
                    <th className="px-6 py-6 text-right">Valor</th>
                    <th className="px-8 py-6 text-center">Status</th>
                    <th className="px-6 py-6 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredEntries.map(entry => (
                    <tr 
                      key={entry.id} 
                      className={`hover:bg-slate-50 transition-all cursor-pointer group ${entry.status === 'cancelled' ? 'opacity-40 grayscale' : ''}`}
                      onClick={() => setViewingEntry(entry)}
                    >
                      <td className="px-10 py-6">
                        <p className="text-xs font-black text-slate-800">{new Date(entry.date + 'T12:00:00').toLocaleDateString('pt-BR')}</p>
                        <p className="text-[9px] text-gray-400 font-bold uppercase">{entry.type === 'RECU' ? 'Entrada' : 'Saída'}</p>
                      </td>
                      <td className="px-6 py-6">
                        <p className="text-xs font-black text-slate-800 uppercase tracking-tight">{entry.description}</p>
                        <p className="text-[9px] font-black text-blue-500 uppercase">{entry.category}</p>
                      </td>
                      <td className="px-6 py-6 text-right">
                        <span className={`text-sm font-black ${entry.type === 'RECU' ? 'text-emerald-500' : 'text-slate-900'}`}>
                          {entry.type === 'DESP' ? '-' : ''}R$ {entry.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td className="px-8 py-6 text-center">
                        <span className="px-5 py-2 bg-emerald-50 text-emerald-600 rounded-full text-[9px] font-black uppercase tracking-widest border border-emerald-100">Liquidado</span>
                      </td>
                      <td className="px-6 py-4 text-right relative">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveEntryMenu(activeEntryMenu === entry.id ? null : entry.id);
                          }} 
                          className="w-10 h-10 bg-white border border-slate-200 text-slate-400 hover:bg-slate-900 hover:text-white rounded-xl transition-all shadow-sm active:scale-95 flex items-center justify-center"
                        >
                          <i className="fa-solid fa-ellipsis text-lg"></i>
                        </button>
                        {activeEntryMenu === entry.id && (
                          <div className="absolute right-0 top-12 bg-white rounded-2xl shadow-2xl border border-gray-100 p-1 z-[150] min-w-[140px] flex flex-col animate-in fade-in zoom-in-95">
                            <button 
                              onClick={(e) => { 
                                e.stopPropagation(); 
                                setViewingEntry(entry); 
                                setActiveEntryMenu(null); 
                              }} 
                              className="px-4 py-2.5 text-left text-xs font-bold uppercase text-slate-600 hover:bg-slate-50 rounded-xl transition-colors w-full"
                            >
                              <i className="fa-regular fa-eye mr-2"></i>Visualizar
                            </button>
                            <button 
                              onClick={(e) => { 
                                e.stopPropagation(); 
                                setProvingEntry(entry); 
                                setActiveEntryMenu(null); 
                              }} 
                              className="px-4 py-2.5 text-left text-xs font-bold uppercase text-slate-600 hover:bg-slate-50 rounded-xl transition-colors w-full"
                            >
                              <i className="fa-solid fa-paperclip mr-2"></i>Comprovante
                            </button>
                            <button 
                              onClick={(e) => { 
                                e.stopPropagation(); 
                                setDeletingEntry(entry); 
                                setActiveEntryMenu(null); 
                              }} 
                              className="px-4 py-2.5 text-left text-xs font-bold uppercase text-red-500 hover:bg-red-50 rounded-xl transition-colors w-full"
                            >
                              <i className="fa-solid fa-trash-can mr-2"></i>Excluir
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
      )}

      {/* GESTÃO DE UNIDADES (NOVA VISÃO) */}
      {activeTab === 'units' && (
        <div className="space-y-6 animate-in slide-in-from-bottom-8">
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-7 rounded-[2.5rem] border border-gray-100 shadow-sm">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total a Receber (Período)</p>
                <h3 className="text-2xl font-black text-slate-800">R$ {(filteredLedgerEntries.reduce((acc, curr) => acc + curr.amount, 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
              </div>
              <div className="bg-white p-7 rounded-[2.5rem] border border-gray-100 shadow-sm font-black">
                <p className="text-[10px] text-emerald-500 uppercase tracking-widest mb-1">Recebido</p>
                <h3 className="text-2xl text-emerald-500">R$ {(filteredLedgerEntries.filter(l => l.status === 'paid').reduce((acc, curr) => acc + curr.amount, 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
              </div>
              <div className="bg-white p-7 rounded-[2.5rem] border border-gray-100 shadow-sm font-black">
                <p className="text-[10px] text-red-500 uppercase tracking-widest mb-1">Pendente / Atrasado</p>
                <h3 className="text-2xl text-red-500">R$ {(filteredLedgerEntries.filter(l => l.status !== 'paid').reduce((acc, curr) => acc + curr.amount, 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
              </div>
           </div>

           <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm flex flex-wrap items-center gap-6">
              <div className="flex-1 min-w-[200px] relative">
                <i className="fa-solid fa-magnifying-glass absolute left-5 top-1/2 -translate-y-1/2 text-gray-300"></i>
                <input 
                  type="text" 
                  placeholder="Buscar morador ou unidade..." 
                  value={ledgerSearchTerm}
                  onChange={(e) => setLedgerSearchTerm(e.target.value)}
                  className="w-full bg-slate-50 border-none rounded-2xl pl-12 pr-4 py-3 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-yellow-400 transition-all"
                />
              </div>
              <div className="flex bg-slate-100 p-1 rounded-xl">
                 {['all', 'pending', 'paid', 'overdue'].map(s => (
                   <button 
                     key={s} 
                     onClick={() => setLedgerStatusFilter(s)}
                     className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${ledgerStatusFilter === s ? 'bg-white shadow-sm text-slate-900' : 'text-gray-400'}`}
                   >
                     {s === 'all' ? 'Tudo' : s === 'pending' ? 'Pendente' : s === 'paid' ? 'Liquidado' : 'Atrasado'}
                   </button>
                 ))}
              </div>
              <input 
                type="month" 
                value={ledgerMonthFilter}
                onChange={(e) => setLedgerMonthFilter(e.target.value)}
                className="bg-slate-100 border-none rounded-xl px-4 py-2.5 text-[10px] font-black text-slate-700 outline-none focus:ring-2 focus:ring-yellow-400"
              />
            </div>

           <div className="bg-white rounded-[3rem] shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-10 py-8 border-b border-gray-50 flex justify-between items-center bg-slate-50/50">
                <div>
                    <h4 className="font-black text-slate-800 uppercase text-xs tracking-[0.2em]">Histórico de Cobranças por Apartamento</h4>
                    <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">{filteredLedgerEntries.length} registros no período</p>
                 </div>
                <div className="flex gap-4">
                  <button 
                    onClick={() => setIsBatchModalOpen(true)}
                    className="bg-emerald-500 text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:bg-emerald-600 transition-all"
                  >
                    <i className="fa-solid fa-layer-group mr-2"></i>Gerar Lote Mensal
                  </button>
                  <button 
                    onClick={() => setIsLedgerModalOpen(true)}
                    className="bg-black text-white px-8 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl"
                  >
                    + Nova Cobrança
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-gray-50/50 border-b border-gray-100 font-black text-[10px] text-gray-400 uppercase tracking-widest">
                      <th className="px-10 py-6">Apartamento</th>
                      <th className="px-6 py-6">Morador</th>
                      <th className="px-6 py-6 text-center">Tipo</th>
                      <th className="px-6 py-6 text-center">Vencimento</th>
                      <th className="px-6 py-6 text-right">Valor</th>
                      <th className="px-8 py-6 text-center">Status</th>
                      <th className="px-10 py-6 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredLedgerEntries.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-10 py-20 text-center text-gray-300">
                           <i className="fa-solid fa-receipt text-5xl mb-4"></i>
                           <p className="font-black uppercase text-xs">Nenhuma cobrança encontrada no período.</p>
                        </td>
                      </tr>
                    ) : (
                      filteredLedgerEntries.map(l => (
                        <tr key={l.id} className="hover:bg-slate-50 transition-all group">
                          <td className="px-10 py-6">
                            <span className="inline-flex items-center justify-center bg-slate-100 text-slate-700 w-12 h-8 rounded-lg text-[10px] font-black">{l.unit}</span>
                          </td>
                          <td className="px-6 py-6">
                            <p className="text-xs font-black text-slate-800 uppercase">{l.resident_name}</p>
                          </td>
                          <td className="px-6 py-6 text-center">
                            <span className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${
                              l.type === 'Aluguel' 
                                ? 'bg-rose-50 text-rose-500 border-rose-100 shadow-sm shadow-rose-100/50' 
                                : 'bg-slate-100 text-slate-500 border-slate-200'
                            }`}>
                              {l.type || 'N/I'}
                            </span>
                          </td>
                          <td className="px-6 py-6 text-center">
                            <p className="text-xs font-black text-slate-600">{l.due_date ? new Date(l.due_date + 'T12:00:00').toLocaleDateString('pt-BR') : '---'}</p>
                          </td>
                          <td className="px-6 py-6 text-right">
                            <span className="text-sm font-black text-slate-900">R$ {l.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                          </td>
                          <td className="px-8 py-6 text-center">
                            {(() => {
                              const isOverdue = l.status !== 'paid' && l.due_date && new Date(l.due_date + 'T23:59:59') < new Date();
                              const status = isOverdue ? 'overdue' : l.status;
                              
                              return (
                                <span className={`px-5 py-2 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                                  status === 'paid' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                  status === 'overdue' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                                  'bg-yellow-50 text-yellow-600 border-yellow-100'
                                }`}>
                                  {status === 'paid' ? 'Liquidado' : status === 'overdue' ? 'Atrasado' : 'Pendente'}
                                </span>
                              );
                            })()}
                          </td>
                          <td className="px-10 py-4 text-right relative">
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveEntryMenu(activeEntryMenu === l.id ? null : l.id);
                              }}
                              className="w-10 h-10 bg-white border border-slate-200 text-slate-400 hover:bg-slate-900 hover:text-white rounded-xl transition-all shadow-sm active:scale-95 inline-flex items-center justify-center"
                            >
                              <i className="fa-solid fa-ellipsis text-lg"></i>
                            </button>
                            {activeEntryMenu === l.id && (
                              <div className="absolute right-10 top-12 bg-white rounded-2xl shadow-2xl border border-gray-100 p-1 z-[150] min-w-[140px] flex flex-col animate-in fade-in zoom-in-95">
                                {l.status !== 'paid' && (
                                  <button 
                                    onClick={() => handleUpdateLedgerStatus(l.id, 'paid')}
                                    className="px-4 py-2.5 text-left text-xs font-bold uppercase text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors w-full"
                                  >
                                    <i className="fa-solid fa-check mr-2"></i>Confirmar Pgto
                                  </button>
                                )}
                                {l.status === 'pending' && (
                                  <button 
                                    onClick={() => handleUpdateLedgerStatus(l.id, 'overdue')}
                                    className="px-4 py-2.5 text-left text-xs font-bold uppercase text-red-500 hover:bg-red-50 rounded-xl transition-colors w-full"
                                  >
                                    <i className="fa-solid fa-triangle-exclamation mr-2"></i>Marcar Atraso
                                  </button>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
           </div>
        </div>
      )}

      {/* Modal Visualizar Detalhes */}
      {viewingEntry && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-xl animate-in fade-in" onClick={() => setViewingEntry(null)}></div>
          <div className="relative bg-white w-full max-w-lg rounded-[3rem] shadow-2xl p-10 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto scrollbar-hide">
             <div className="text-center mb-8">
                <div className={`w-20 h-20 rounded-[2rem] flex items-center justify-center mx-auto mb-4 text-3xl shadow-inner ${viewingEntry.type === 'RECU' ? 'bg-emerald-50 text-emerald-500' : 'bg-red-50 text-red-500'}`}>
                   <i className={viewingEntry.type === 'RECU' ? "fa-solid fa-hand-holding-dollar" : "fa-solid fa-receipt"}></i>
                </div>
                <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Ficha do Lançamento</h3>
                <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-1">ID: {viewingEntry.id}</p>
             </div>
             <div className="space-y-4 mb-8">
                <div className="flex justify-between border-b border-gray-50 pb-3">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Descrição</span>
                  <span className="text-xs font-black text-slate-800 text-right max-w-[200px]">{viewingEntry.description}</span>
                </div>
                <div className="flex justify-between border-b border-gray-50 pb-3">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Valor Líquido</span>
                  <span className={`text-sm font-black ${viewingEntry.type === 'RECU' ? 'text-emerald-600' : 'text-slate-900'}`}>R$ {viewingEntry.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between border-b border-gray-50 pb-3">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Categoria</span>
                  <span className="text-xs font-black text-slate-800 uppercase">{viewingEntry.category}</span>
                </div>
                <div className="flex justify-between border-b border-gray-50 pb-3">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Data Competência</span>
                  <span className="text-xs font-black text-slate-800">{new Date(viewingEntry.date + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                </div>
                
                <div className="pt-6">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-4">Anexo / Comprovante Digital</span>
                  {viewingEntry.receiptUrl ? (
                    <div className="rounded-[2rem] overflow-hidden border-4 border-slate-50 shadow-inner bg-slate-100 group relative">
                      <img src={viewingEntry.receiptUrl} alt="Comprovante" className="w-full h-auto object-cover max-h-[350px]" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <a href={viewingEntry.receiptUrl} download={`comprovante_${viewingEntry.id}.png`} className="w-14 h-14 bg-white rounded-full flex items-center justify-center text-slate-900 shadow-2xl hover:scale-110 transition-transform">
                          <i className="fa-solid fa-download text-lg"></i>
                        </a>
                      </div>
                    </div>
                  ) : (
                    <div className="py-20 border-4 border-dashed border-slate-50 rounded-[3rem] flex flex-col items-center justify-center text-gray-300">
                      <i className="fa-solid fa-file-circle-xmark text-5xl mb-4"></i>
                      <p className="text-[10px] font-black uppercase tracking-[0.2em]">Sem comprovante anexado</p>
                    </div>
                  )}
                </div>
             </div>
             <button onClick={() => setViewingEntry(null)} className="w-full py-6 mycond-bg-blue text-white rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-2xl shadow-blue-500/20 active:scale-95 transition-all">Fechar Visualização</button>
          </div>
        </div>
      )}

      {/* Modal Anexar Comprovante */}
      {provingEntry && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-2 sm:p-4 overflow-auto">
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-xl animate-in fade-in" onClick={() => setProvingEntry(null)}></div>
          <div className="relative bg-white w-full max-w-lg rounded-2xl sm:rounded-[3rem] shadow-2xl p-6 sm:p-10 my-8 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
             <div className="flex justify-between items-start mb-6 sm:mb-8">
               <div>
                  <h3 className="text-xl sm:text-3xl font-black text-slate-900 uppercase tracking-tighter">Comprovante Digital</h3>
                  <p className="text-[9px] sm:text-[10px] text-gray-400 font-black uppercase tracking-widest mt-1">Vincular prova de pagamento</p>
               </div>
               <button onClick={() => setProvingEntry(null)} className="w-10 h-10 sm:w-12 sm:h-12 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 transition-colors flex-shrink-0">
                 <i className="fa-solid fa-xmark text-lg sm:text-xl"></i>
               </button>
             </div>

             <form onSubmit={saveReceipt} className="space-y-8">
                <div className="p-8 bg-slate-50 rounded-[2.5rem] border border-gray-100 space-y-3 shadow-inner">
                  <div className="flex justify-between">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Categoria</span>
                    <span className="text-[10px] font-black text-slate-800 uppercase">{provingEntry.category}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Valor Lançado</span>
                    <span className="text-sm font-black text-slate-800">R$ {provingEntry.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>

                <div className="space-y-4">
                   <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Observações / Notas do Lançamento</label>
                   <input 
                     name="notes" 
                     type="text" 
                     placeholder="Digite aqui as notas detalhadas..." 
                     defaultValue={provingEntry.description}
                     className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 font-black text-slate-800 outline-none focus:ring-4 focus:ring-yellow-400/30 transition-all shadow-inner"
                   />
                </div>

                <div className="space-y-4">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Anexar Documento / Foto</label>
                  
                  {receiptFilePreview || provingEntry.receiptUrl ? (
                    <div className="relative rounded-[2.5rem] overflow-hidden border-4 border-yellow-100 shadow-2xl group h-64 bg-slate-50">
                      <img src={receiptFilePreview || provingEntry.receiptUrl} alt="Preview" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button 
                          type="button" 
                          onClick={() => { setReceiptFilePreview(null); provingEntry.receiptUrl = undefined; }}
                          className="w-16 h-16 bg-red-500 text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 transition-transform"
                        >
                          <i className="fa-solid fa-trash-can text-xl"></i>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button 
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full py-20 border-4 border-dashed border-gray-100 rounded-[3rem] flex flex-col items-center justify-center text-gray-300 hover:border-yellow-200 hover:text-yellow-500 hover:bg-yellow-50/20 transition-all group shadow-sm"
                    >
                      <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mb-5 group-hover:bg-yellow-400 group-hover:text-white transition-all shadow-inner">
                        <i className="fa-solid fa-camera text-3xl"></i>
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-[0.2em]">Clique para enviar a foto</span>
                    </button>
                  )}
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileChange} 
                    className="hidden" 
                    accept="image/*,application/pdf" 
                  />
                </div>

                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-4 sm:pt-6">
                  <button 
                    type="button" 
                    onClick={() => setProvingEntry(null)} 
                    className="flex-1 py-4 sm:py-5 border-2 border-slate-200 text-slate-600 rounded-xl sm:rounded-2xl font-bold uppercase text-xs tracking-widest hover:bg-slate-50 transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit" 
                    className="flex-1 py-4 sm:py-5 mycond-bg-yellow text-slate-900 rounded-xl sm:rounded-2xl font-bold uppercase text-xs tracking-widest transition-all shadow-lg hover:bg-yellow-500"
                  >
                    Salvar
                  </button>
                </div>
             </form>
          </div>
        </div>
      )}

      {/* Modal Confirmação de Exclusão */}
      {deletingEntry && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-xl animate-in fade-in" onClick={() => setDeletingEntry(null)}></div>
          <div className="relative bg-white w-full max-w-sm rounded-[3rem] shadow-2xl p-10 animate-in zoom-in-95 text-center">
             <div className="w-20 h-20 bg-red-50 text-red-500 rounded-[2rem] flex items-center justify-center mx-auto mb-6 text-3xl">
                <i className="fa-solid fa-trash-can"></i>
             </div>
             <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight mb-2">Excluir Registro?</h3>
             <p className="text-xs text-gray-400 font-bold mb-8">Esta ação removerá permanentemente o lançamento "{deletingEntry.description}" do fluxo de caixa.</p>
             <div className="flex gap-4">
                <button onClick={() => setDeletingEntry(null)} className="flex-1 py-4 border-2 border-slate-100 rounded-2xl font-black uppercase text-[10px] tracking-widest">Manter</button>
                <button onClick={confirmDelete} className="flex-1 py-4 bg-red-500 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-red-200">Excluir</button>
             </div>
          </div>
        </div>
      )}

      {/* Modal Registro Geral */}
      {isRegisterModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-2xl animate-in fade-in" onClick={() => setIsRegisterModalOpen(false)}></div>
          <div className="relative bg-white w-full max-w-xl rounded-[4rem] shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="px-14 py-12 mycond-bg-blue text-white flex justify-between items-center">
              <div><h3 className="text-3xl font-black uppercase tracking-tighter">Novo Lançamento</h3><p className="text-[10px] text-blue-300 font-bold uppercase tracking-widest">Controle de Fluxo de Caixa</p></div>
              <button onClick={() => setIsRegisterModalOpen(false)} className="w-14 h-14 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors"><i className="fa-solid fa-xmark text-2xl"></i></button>
            </div>
            <form onSubmit={handleRegisterEntry} className="p-14 space-y-8">
              <div className="space-y-3"><label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Descrição Inicial</label><input required name="description" className="w-full bg-slate-50 border-none rounded-2xl px-8 py-5 font-black text-slate-800 outline-none focus:ring-4 focus:ring-yellow-400/30 shadow-inner" placeholder="Ex: Conta de Luz" /></div>
              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-3"><label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Tipo</label><select name="type" className="w-full bg-slate-50 border-none rounded-2xl px-8 py-5 font-black text-slate-800 transition-all"><option value="DESP">Despesa (Saída)</option><option value="RECU">Receita (Entrada)</option></select></div>
                <div className="space-y-3"><label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Categoria</label><select name="category" className="w-full bg-slate-50 border-none rounded-2xl px-8 py-5 font-black text-slate-800 transition-all">{CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
              </div>
              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-3"><label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Valor Bruto (R$)</label><input required name="amount" type="number" step="0.01" className="w-full bg-slate-50 border-none rounded-2xl px-8 py-5 font-black text-slate-800 shadow-inner" placeholder="0,00" /></div>
                <div className="space-y-3"><label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Data Competência</label><input required name="date" type="date" className="w-full bg-slate-50 border-none rounded-2xl px-8 py-5 font-black text-slate-800 shadow-inner" /></div>
              </div>
              <button type="submit" className="w-full py-7 mycond-bg-yellow rounded-[2rem] font-black text-slate-900 hover:bg-yellow-500 shadow-2xl shadow-yellow-100 uppercase text-[11px] tracking-[0.2em] transition-all active:scale-95">Confirmar Registro</button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Nova Cobrança de Unidade */}
      {isLedgerModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-2xl animate-in fade-in" onClick={() => setIsLedgerModalOpen(false)}></div>
          <div className="relative bg-white w-full max-w-xl rounded-[4rem] shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="px-14 py-12 mycond-bg-blue text-white flex justify-between items-center">
              <div><h3 className="text-3xl font-black uppercase tracking-tighter">Cobrança de Apartamento</h3><p className="text-[10px] text-blue-300 font-bold uppercase tracking-widest">Aluguel & Taxas Mensais</p></div>
              <button onClick={() => setIsLedgerModalOpen(false)} className="w-14 h-14 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors"><i className="fa-solid fa-xmark text-2xl"></i></button>
            </div>
            <form onSubmit={handleRegisterLedger} className="p-14 space-y-8 max-h-[70vh] overflow-y-auto scrollbar-hide">
              <div className="space-y-3">
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Selecionar Morador / Apartamento</label>
                <select required name="profile_id" className="w-full bg-slate-50 border-none rounded-2xl px-8 py-5 font-black text-slate-800 outline-none shadow-inner">
                  <option value="">Selecione o morador...</option>
                  {residents.map(r => <option key={r.id} value={r.id}>{r.name} - Apt {r.unit}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Tipo de Cobrança</label>
                  <select name="type" className="w-full bg-slate-50 border-none rounded-2xl px-8 py-5 font-black text-slate-800 outline-none shadow-inner">
                    <option value="rent">Aluguel</option>
                    <option value="condo_fee">Taxa Condominial</option>
                    <option value="other">Outros</option>
                  </select>
                </div>
                <div className="space-y-3">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Data de Vencimento</label>
                  <input required name="due_date" type="date" className="w-full bg-slate-50 border-none rounded-2xl px-8 py-5 font-black text-slate-800 shadow-inner" />
                </div>
              </div>

              <div className="space-y-3">
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Valor da Cobrança (R$)</label>
                <div className="flex gap-4">
                  <input id="ledgerAmount" required name="amount" type="number" step="0.01" className="flex-1 bg-slate-50 border-none rounded-2xl px-8 py-5 font-black text-slate-800 shadow-inner" placeholder="0,00" />
                  <button 
                    type="button"
                    onClick={() => {
                      const dateField = document.getElementsByName('due_date')[0] as HTMLInputElement;
                      if (!dateField.value) return alert('Selecione a data de vencimento primeiro.');
                      const amountField = document.getElementById('ledgerAmount') as HTMLInputElement;
                      const currentAmount = parseFloat(amountField.value) || 0;
                      const prorated = calculateProRata(currentAmount, dateField.value);
                      amountField.value = prorated.toFixed(2);
                    }}
                    className="px-6 bg-yellow-50 text-yellow-600 border border-yellow-100 rounded-2xl text-[9px] font-black uppercase hover:bg-yellow-100 transition-all"
                  >
                    Calcular Pro-rata
                  </button>
                </div>
              </div>

              <div className="space-y-3"><label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Notas / Observações</label><textarea name="notes" className="w-full bg-slate-50 border-none rounded-2xl px-8 py-5 font-black text-slate-800 outline-none shadow-inner h-24" placeholder="Ex: Referente a Janeiro/2025" /></div>

              <button type="submit" className="w-full py-7 mycond-bg-blue text-white rounded-[2rem] font-black uppercase text-[11px] tracking-[0.2em] shadow-2xl shadow-blue-100 transition-all active:scale-95">Gerar Cobrança</button>
            </form>
          </div>
        </div>
      )}
      {/* Modal Faturamento em Lote */}
      {isBatchModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-2xl animate-in fade-in" onClick={() => setIsBatchModalOpen(false)}></div>
          <div className="relative bg-white w-full max-w-xl rounded-[4rem] shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="px-14 py-12 bg-emerald-600 text-white flex justify-between items-center">
              <div>
                <h3 className="text-3xl font-black uppercase tracking-tighter">Faturamento em Lote</h3>
                <p className="text-[10px] text-emerald-100 font-bold uppercase tracking-widest">Lançamento Massivo para Moradores</p>
              </div>
              <button onClick={() => setIsBatchModalOpen(false)} className="w-14 h-14 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors"><i className="fa-solid fa-xmark text-2xl"></i></button>
            </div>
            <form onSubmit={handleBatchBilling} className="p-14 space-y-8">
              <div className="p-6 bg-emerald-50 rounded-3xl border border-emerald-100 mb-4">
                <p className="text-[10px] font-bold text-emerald-700 uppercase">Atenção</p>
                <p className="text-xs text-emerald-600 mt-1">Este processo gerará uma cobrança para todos os moradores ativos (role: resident). Familiares não serão incluídos.</p>
              </div>

              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Mês de Referência</label>
                  <input required name="period" type="month" defaultValue={new Date().toISOString().slice(0, 7)} className="w-full bg-slate-50 border-none rounded-2xl px-8 py-5 font-black text-slate-800 outline-none shadow-inner" />
                </div>
                <div className="space-y-3">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Tipo</label>
                  <select name="type" className="w-full bg-slate-50 border-none rounded-2xl px-8 py-5 font-black text-slate-800 shadow-inner">
                    <option value="condo_fee">Taxa Condominial</option>
                    <option value="rent">Aluguel</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Valor Padrão (R$)</label>
                  <input required name="amount" type="number" step="0.01" className="w-full bg-slate-50 border-none rounded-2xl px-8 py-5 font-black text-slate-800 shadow-inner" placeholder="0,00" />
                </div>
                <div className="space-y-3">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Data de Vencimento</label>
                  <input required name="due_date" type="date" className="w-full bg-slate-50 border-none rounded-2xl px-8 py-5 font-black text-slate-800 shadow-inner" />
                </div>
              </div>

              <button type="submit" disabled={isLoading} className="w-full py-7 bg-emerald-600 text-white rounded-[2rem] font-black uppercase text-[11px] tracking-[0.2em] shadow-2xl shadow-emerald-100 transition-all active:scale-95 disabled:opacity-50">
                {isLoading ? 'Processando...' : 'Gerar Cobranças em Massa'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Financeiro;
