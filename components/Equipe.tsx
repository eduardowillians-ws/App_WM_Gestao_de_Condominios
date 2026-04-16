import React, { useState, useMemo, useRef, useEffect } from 'react';
import { StaffMember, EPIItem, StaffDocument, DismissalDetails } from '../types';
import { supabase } from '../lib/supabase';
import { formatRG } from '../lib/utils';

const STANDARD_EPIS = [
  'BOTAS DE PVC',
  'LUVAS DE BORRACHA',
  'MÁSCARAS N95',
  'PROTETOR AURICULAR',
  'ÓCULOS DE PROTEÇÃO',
  'UNIFORMES REFLETIVOS',
  'CAPA DE CHUVA',
  'CINTO DE SEGURANÇA PARA ALTURA',
  'CAPACETE',
  'LANTERNA DE INSPEÇÃO'
];

const INITIAL_ROLES = [
  'Zelador',
  'Limpeza',
  'Jardineiro',
  'Segurança Noturno',
  'Portaria'
];

const Equipe: React.FC = () => {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [availableRoles, setAvailableRoles] = useState<string[]>(INITIAL_ROLES);
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  
  const [isEpiModalOpen, setIsEpiModalOpen] = useState(false);
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [isDismissalModalOpen, setIsDismissalModalOpen] = useState(false);
  const [viewingStaff, setViewingStaff] = useState<StaffMember | null>(null);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);

  const [epiPreFill, setEpiPreFill] = useState<{ staffId: string, epiName: string } | null>(null);
  const [tempPhoto, setTempPhoto] = useState<string | null>(null);
  const [tempDocs, setTempDocs] = useState<{ name: string, type: string }[]>([]);
  const [newRoleInput, setNewRoleInput] = useState('');

  const photoInputRef = useRef<HTMLInputElement>(null);
  const docsInputRef = useRef<HTMLInputElement>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: staffData, error: fetchError } = await supabase
        .from('equipe')
        .select('*')
        .order('name');
      
      if (fetchError) throw fetchError;
      
      const { data: episData } = await supabase
        .from('epis')
        .select('*');

      if (staffData) {
        const mappedStaff = staffData.map((s: any) => {
          const staffEpis = episData?.filter((e: any) => e.staff_id === s.id) || [];
          const hasExpired = staffEpis.some((e: any) => e.status === 'vencido');
          const hasAnyEpi = staffEpis.length > 0;
          return {
            id: s.id,
            name: s.name,
            role: s.role,
            phone: s.phone,
            status: s.status,
            photoUrl: s.photo_url,
            rg: s.rg,
            admissionDate: s.admission_date,
            thirteenthSalaryStatus: s.thirteenth_salary_status,
            street: s.street,
            streetNumber: s.street_number,
            neighborhood: s.neighborhood,
            city: s.city,
            maritalStatus: s.marital_status,
            childrenCount: s.children_count,
            vacationStart: s.vacation_start,
            vacationEnd: s.vacation_end,
            dismissalDate: s.dismissal_date,
            epiStatus: !hasAnyEpi ? 'pendente' : hasExpired ? 'expired' : 'regular',
            epis: staffEpis.map((e: any) => ({
              id: e.id,
              name: e.name,
              deliveryDate: e.delivery_date,
              expiryDate: e.expiry_date,
              status: e.status
            }))
          };
        });
        setStaff(mappedStaff);
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

  const filteredStaff = useMemo(() => {
    return staff.filter(s => {
      const matchRole = roleFilter === 'ALL' || s.role === roleFilter;
      const matchStatus = statusFilter === 'ALL' || 
        (statusFilter === 'IRREGULAR' && (s.epiStatus === 'expired' || s.epiStatus === 'pendente')) ||
        (statusFilter === 'ACTIVE' && s.status === 'active') ||
        (statusFilter === 'DISMISSED' && s.status === 'dismissed');
      return matchRole && matchStatus;
    });
  }, [staff, roleFilter, statusFilter]);

  const handleOpenEpiModal = (staffId?: string, epiName?: string) => {
    if (staffId && epiName) {
      setEpiPreFill({ staffId, epiName });
    } else {
      setEpiPreFill(null);
    }
    setIsEpiModalOpen(true);
  };

  const handleRegisterEpi = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const staffId = formData.get('staffId') as string;
    const epiName = (formData.get('epiName') as string).toUpperCase();
    const deliveryDate = formData.get('deliveryDate') as string;
    const expiryDate = formData.get('expiryDate') as string;

    const isExpired = new Date(expiryDate) < new Date();

    try {
      // Check if EPI already exists for this staff member (case insensitive)
      const { data: existingEpi } = await supabase
        .from('epis')
        .select('id')
        .eq('staff_id', staffId)
        .ilike('name', epiName)
        .single();

      if (existingEpi) {
        // Update existing EPI
        console.log('Updating EPI:', existingEpi.id);
        const { error } = await supabase
          .from('epis')
          .update({ delivery_date: deliveryDate, expiry_date: expiryDate, status: isExpired ? 'vencido' : 'regular' })
          .eq('id', existingEpi.id);
        
        if (error) {
          console.error('Update error:', error);
          throw error;
        }
      } else {
        // Insert new EPI
        console.log('Inserting new EPI for staff:', staffId);
        const { error } = await supabase.from('epis').insert({
          staff_id: staffId,
          name: epiName,
          delivery_date: deliveryDate,
          expiry_date: expiryDate,
          status: isExpired ? 'vencido' : 'regular'
        });
        
        if (error) {
          console.error('Insert error:', error);
          throw error;
        }
      }

      fetchData();
      
      // Update viewingStaff if viewing the same person
      if (viewingStaff && (viewingStaff.id === staffId || epiPreFill?.staffId === viewingStaff.id)) {
        const { data: updatedStaff } = await supabase
          .from('equipe')
          .select('*')
          .eq('id', viewingStaff.id)
          .single();
        
        if (updatedStaff) {
          const { data: updatedEpis } = await supabase
            .from('epis')
            .select('*')
            .eq('staff_id', viewingStaff.id);
          
          const hasExpired = (updatedEpis || []).some((e: any) => e.status === 'vencido');
          setViewingStaff({
            ...viewingStaff,
            epis: (updatedEpis || []).map((e: any) => ({
              id: e.id,
              name: e.name,
              deliveryDate: e.delivery_date,
              expiryDate: e.expiry_date,
              status: e.status
            })),
            epiStatus: isExpired || !updatedEpis?.length ? (updatedEpis?.some((e: any) => e.status === 'vencido') ? 'expired' : 'pendente') : 'regular'
          });
        }
      }
      
      setIsEpiModalOpen(false);
      alert('EPI registrado com sucesso!');
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Erro ao registrar EPI');
    }
  };

  const handleSaveStaff = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const id = formData.get('id') as string;
    
    const name = (formData.get('name') as string).toUpperCase();
    const role = (formData.get('role') as string).toUpperCase();
    const street = (formData.get('street') as string || '').toUpperCase();
    const streetNumber = formData.get('streetNumber') as string;
    const neighborhood = (formData.get('neighborhood') as string || '').toUpperCase();
    const city = (formData.get('city') as string || '').toUpperCase();

    try {
      if (editingStaff) {
        const { error } = await supabase.from('equipe').update({
          name,
          role,
          phone: formData.get('phone') as string,
          rg: formData.get('rg') as string,
          street,
          street_number: streetNumber,
          neighborhood,
          city,
          marital_status: formData.get('maritalStatus') as string,
          children_count: parseInt(formData.get('childrenCount') as string) || 0,
          admission_date: formData.get('admissionDate') as string,
          vacation_start: formData.get('vacationStart') as string,
          vacation_end: formData.get('vacationEnd') as string,
          thirteenth_salary_status: formData.get('thirteenth') as string,
          photo_url: tempPhoto || editingStaff.photoUrl
        }).eq('id', id);
        
        if (error) throw error;
        setViewingStaff({ ...editingStaff, name, photoUrl: tempPhoto || editingStaff.photoUrl });
        setEditingStaff(null);
      } else {
        const { data, error } = await supabase.from('equipe').insert({
          name,
          role,
          phone: formData.get('phone') as string,
          rg: formData.get('rg') as string,
          street,
          street_number: streetNumber,
          neighborhood,
          city,
          marital_status: formData.get('maritalStatus') as string,
          children_count: parseInt(formData.get('childrenCount') as string) || 0,
          status: 'active',
          admission_date: formData.get('admissionDate') as string,
          thirteenth_salary_status: 'pending',
          photo_url: tempPhoto || `https://i.pravatar.cc/150?u=${Date.now()}`
        }).select().single();
        
        if (error) throw error;
      }
      
      setIsStaffModalOpen(false);
      setTempPhoto(null);
      setTempDocs([]);
      fetchData();
      alert(editingStaff ? 'Colaborador atualizado!' : 'Colaborador cadastrado!');
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Erro ao salvar');
    }
  };

  const handleOpenDismissalModal = () => {
    if (viewingStaff) {
      setIsDismissalModalOpen(true);
    }
  };

  const handleConfirmDismissal = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!viewingStaff) return;

    const formData = new FormData(e.currentTarget);
    const dismissalDate = formData.get('dismissalDate') as string;
    const dismissalDetails: DismissalDetails = {
      reason: formData.get('reason') as string,
      pendencies: formData.get('pendencies') as string,
      isPaid: formData.get('isPaid') === 'true',
      date: dismissalDate
    };

    setStaff(prev => prev.map(s => 
      s.id === viewingStaff.id 
        ? { ...s, status: 'dismissed', dismissalDate, dismissalDetails } 
        : s
    ));

    setViewingStaff(prev => prev ? { 
      ...prev, 
      status: 'dismissed', 
      dismissalDate, 
      dismissalDetails 
    } : null);

    setIsDismissalModalOpen(false);
    alert('Contrato encerrado e registrado no histórico.');
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setTempPhoto(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleDocsUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      // Explicitly typing the map parameter 'f' as any or File to avoid 'unknown' type errors for name and type properties.
      const docsArray = Array.from(files).map((f: any) => ({ name: f.name, type: f.type }));
      setTempDocs(prev => [...prev, ...docsArray]);
    }
  };

  const irregularCount = staff.filter(s => s.status === 'active' && (s.epiStatus === 'expired' || s.epiStatus === 'pendente')).length;

  if (loading) {
    return (
      <div className="p-20 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400"></div>
        <p className="text-gray-400 font-black text-xs uppercase mt-4">Sincronizando...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tighter uppercase">Equipe e Segurança (RH)</h2>
          <p className="text-sm text-gray-500 font-medium italic">Gestão operacional de RH e conformidade de segurança.</p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <button 
            onClick={() => { setEditingStaff(null); setTempPhoto(null); setTempDocs([]); setIsStaffModalOpen(true); }}
            className="flex-1 md:flex-none bg-white border border-slate-200 text-slate-900 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm"
          >
            + Novo Colaborador
          </button>
          <button 
            onClick={() => handleOpenEpiModal()}
            className="flex-1 md:flex-none mycond-bg-yellow text-slate-900 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-yellow-100 hover:bg-yellow-500 transition-all active:scale-95"
          >
            Controle de EPIs
          </button>
        </div>
      </header>

      {/* Alerta de Segurança */}
      <div className={`p-8 rounded-[2.5rem] border flex flex-col md:flex-row justify-between items-center relative overflow-hidden transition-all ${irregularCount > 0 ? 'bg-red-50 border-red-100' : 'bg-emerald-50 border-emerald-100'}`}>
        <div className="flex items-center space-x-6 mb-4 md:mb-0">
          <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center text-3xl shadow-inner ${irregularCount > 0 ? 'bg-white text-red-500' : 'bg-white text-emerald-500'}`}>
            <i className={irregularCount > 0 ? "fa-solid fa-triangle-exclamation" : "fa-solid fa-shield-check"}></i>
          </div>
          <div>
            <h4 className="font-black text-slate-900 uppercase tracking-tighter text-lg leading-tight">
              {irregularCount > 0 ? 'Alerta de Segurança' : 'Segurança em Dia'}
            </h4>
            <p className="text-xs text-slate-500 font-bold mt-1">
              {irregularCount > 0 
                ? `${irregularCount} colaboradores ativos com EPIs fora da validade.` 
                : 'Todos os colaboradores ativos estão devidamente equipados.'}
            </p>
          </div>
        </div>
        <button 
          onClick={() => setStatusFilter('IRREGULAR')}
          className={`text-[10px] font-black uppercase tracking-[0.2em] py-4 px-8 rounded-2xl transition-all shadow-lg ${irregularCount > 0 ? 'bg-red-500 text-white hover:bg-red-600 shadow-red-200' : 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-emerald-200'}`}
        >
          Verificar Regularidade
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm flex flex-wrap items-center gap-6">
        <div className="flex flex-col">
          <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Filtrar Função</label>
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button onClick={() => setRoleFilter('ALL')} className={`px-4 py-2 rounded-lg text-[10px] font-black transition-all ${roleFilter === 'ALL' ? 'bg-white shadow-sm text-slate-900' : 'text-gray-400'}`}>Todos</button>
            {availableRoles.map(role => (
              <button key={role} onClick={() => setRoleFilter(role)} className={`px-4 py-2 rounded-lg text-[10px] font-black transition-all ${roleFilter === role ? 'bg-white shadow-sm text-slate-900' : 'text-gray-400'}`}>{role}</button>
            ))}
          </div>
        </div>
        <div className="flex flex-col">
          <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Status Contrato</label>
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button onClick={() => setStatusFilter('ALL')} className={`px-4 py-2 rounded-lg text-[10px] font-black transition-all ${statusFilter === 'ALL' ? 'bg-white shadow-sm text-slate-900' : 'text-gray-400'}`}>Tudo</button>
            <button onClick={() => setStatusFilter('ACTIVE')} className={`px-4 py-2 rounded-lg text-[10px] font-black transition-all ${statusFilter === 'ACTIVE' ? 'bg-white shadow-sm text-slate-900' : 'text-gray-400'}`}>Ativos</button>
            <button onClick={() => setStatusFilter('DISMISSED')} className={`px-4 py-2 rounded-lg text-[10px] font-black transition-all ${statusFilter === 'DISMISSED' ? 'bg-white shadow-sm text-slate-900' : 'text-gray-400'}`}>Demitidos</button>
          </div>
        </div>
      </div>

      {/* Tabela de Colaboradores */}
      <div className="bg-white rounded-[3rem] shadow-sm border border-gray-100 overflow-hidden relative z-0">
        <div className="px-10 py-8 bg-gray-50/50 border-b border-gray-100 flex justify-between items-center">
          <h4 className="text-xs font-black text-slate-800 uppercase tracking-[0.2em]">Listagem de Colaboradores</h4>
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{filteredStaff.length} Integrantes</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-gray-400 text-[10px] uppercase font-black border-b border-gray-50">
                <th className="px-10 py-6">Colaborador / Função</th>
                <th className="px-6 py-6 text-center">Status EPI</th>
                <th className="px-6 py-6 text-center">Status Contrato</th>
                <th className="px-10 py-6 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredStaff.map(member => {
                const isDismissed = member.status === 'dismissed';
                return (
                  <tr key={member.id} className={`group transition-all ${isDismissed ? 'opacity-60 bg-gray-50/30' : 'hover:bg-slate-50'}`}>
                    <td className="px-10 py-6">
                      <div className="flex items-center space-x-4">
                        <div className={`w-12 h-12 rounded-2xl overflow-hidden border border-gray-100 shadow-sm ${isDismissed ? 'grayscale' : 'bg-slate-200'}`}>
                          <img src={member.photoUrl} className="w-full h-full object-cover" alt={member.name} />
                        </div>
                        <div>
                          <p className={`font-black text-xs uppercase tracking-tight ${isDismissed ? 'text-gray-400 line-through' : 'text-slate-800'}`}>{member.name}</p>
                          <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest mt-1">{member.role}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-6 text-center">
                      <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                        member.epiStatus === 'regular' ? 'bg-emerald-50 text-emerald-500 border-emerald-100' : 'bg-red-50 text-red-500 border-red-100'
                      }`}>
                        {member.epiStatus === 'regular' ? 'Regular' : member.epiStatus === 'pendente' ? 'Pendente EPI' : 'Irregular / Vencido'}
                      </span>
                    </td>
                    <td className="px-6 py-6 text-center">
                      <span className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest ${isDismissed ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-600 border border-blue-100'}`}>
                        {isDismissed ? 'Demitido' : 'Ativo'}
                      </span>
                    </td>
                    <td className="px-10 py-6 text-right">
                      <button 
                        onClick={() => setViewingStaff(member)}
                        className="w-11 h-11 bg-white border border-slate-200 text-slate-400 hover:bg-slate-900 hover:text-white rounded-2xl transition-all shadow-sm active:scale-95"
                      >
                        <i className="fa-solid fa-eye"></i>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Ficha Completa (RH) */}
      {viewingStaff && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-xl animate-in fade-in" onClick={() => setViewingStaff(null)}></div>
          <div className="relative bg-white w-full max-w-2xl rounded-[4rem] shadow-2xl p-10 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto scrollbar-hide">
             <div className="text-center mb-8">
                <div className={`w-24 h-24 rounded-[2.5rem] overflow-hidden border-4 shadow-xl mx-auto mb-4 relative ${viewingStaff.status === 'dismissed' ? 'grayscale opacity-50 border-gray-200' : 'border-slate-50'}`}>
                   <img src={viewingStaff.photoUrl} className="w-full h-full object-cover" />
                </div>
                <h3 className={`text-3xl font-black text-slate-900 uppercase tracking-tighter ${viewingStaff.status === 'dismissed' ? 'line-through text-gray-400' : ''}`}>{viewingStaff.name}</h3>
                <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-1">Ficha Funcional MyCond</p>
             </div>
             
             <div className="grid grid-cols-2 gap-6 mb-8">
                <div className="p-6 bg-slate-50 rounded-3xl border border-gray-100 space-y-3">
                   <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Informações Gerais</p>
                   <div className="flex justify-between border-b border-gray-200/50 pb-2">
                      <span className="text-[9px] font-black text-gray-400 uppercase">Função</span>
                      <span className="text-[11px] font-black text-slate-800 uppercase">{viewingStaff.role}</span>
                   </div>
                   <div className="flex justify-between border-b border-gray-200/50 pb-2">
                      <span className="text-[9px] font-black text-gray-400 uppercase">RG</span>
                      <span className="text-[11px] font-black text-slate-800">{viewingStaff.rg || '--.---.---'}</span>
                   </div>
                   <div className="flex justify-between">
                      <span className="text-[9px] font-black text-gray-400 uppercase">Estado Civil</span>
                      <span className="text-[11px] font-black text-slate-800 uppercase">{viewingStaff.maritalStatus || 'N/I'}</span>
                   </div>
                </div>

                <div className="p-6 bg-slate-50 rounded-3xl border border-gray-100 space-y-3">
                   <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Contratação</p>
                   <div className="flex justify-between border-b border-gray-200/50 pb-2">
                      <span className="text-[9px] font-black text-gray-400 uppercase">Admissão</span>
                      <span className="text-[11px] font-black text-slate-800">{viewingStaff.admissionDate?.split('-').reverse().join('/')}</span>
                   </div>
                   <div className="flex justify-between border-b border-gray-200/50 pb-2">
                      <span className="text-[9px] font-black text-gray-400 uppercase">Filhos</span>
                      <span className="text-[11px] font-black text-slate-800">{viewingStaff.childrenCount || 0}</span>
                   </div>
                   <div className="flex justify-between">
                      <span className="text-[9px] font-black text-gray-400 uppercase">Status Contrato</span>
                      <span className={`text-[11px] font-black uppercase ${viewingStaff.status === 'active' ? 'text-blue-500' : 'text-red-500'}`}>{viewingStaff.status === 'active' ? 'Ativo' : `Demitido em ${viewingStaff.dismissalDate?.split('-').reverse().join('/')}`}</span>
                   </div>
                </div>
             </div>

             {/* Histórico de Desligamento - Ajuste Visual Conforme Feedback */}
             {viewingStaff.status === 'dismissed' && viewingStaff.dismissalDetails && (
               <div className="mb-8 p-8 bg-red-50 border border-red-100 rounded-[2.5rem] space-y-6 animate-in slide-in-from-top-4">
                  <div className="flex items-center space-x-3 mb-2">
                    <div className="w-10 h-10 bg-white text-red-500 rounded-xl flex items-center justify-center shadow-sm">
                      <i className="fa-solid fa-file-contract"></i>
                    </div>
                    <p className="text-[11px] font-black text-red-700 uppercase tracking-[0.2em]">Informações de Rescisão</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-1">
                      <span className="text-[9px] font-black text-red-400 uppercase tracking-widest">Motivo do Desligamento</span>
                      <p className="text-sm font-black text-red-800 uppercase leading-tight">{viewingStaff.dismissalDetails.reason}</p>
                    </div>
                    <div className="space-y-2">
                      <span className="text-[9px] font-black text-red-400 uppercase tracking-widest block">Status de Pagamento</span>
                      <span className={`inline-flex px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest shadow-sm ${viewingStaff.dismissalDetails.isPaid ? 'bg-emerald-500 text-white' : 'mycond-bg-yellow text-slate-900'}`}>
                        {viewingStaff.dismissalDetails.isPaid ? 'Totalmente Pago' : 'Pagamento Pendente'}
                      </span>
                    </div>
                  </div>
                  <div className="pt-4 border-t border-red-100">
                    <span className="text-[9px] font-black text-red-400 uppercase tracking-widest">Pendências a Terceiros</span>
                    <p className="text-sm text-red-700 italic mt-1 leading-relaxed">"{viewingStaff.dismissalDetails.pendencies || 'Nenhuma pendência registrada.'}"</p>
                  </div>
               </div>
             )}

             {/* Endereço Residencial - Garantindo mapeamento correto */}
             <div className="mb-8 p-8 bg-slate-50 rounded-[2.5rem] border border-gray-100">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6">Endereço Residencial</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div className="space-y-1">
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block">Rua</span>
                    <p className="text-xs font-black text-slate-800 uppercase truncate">{viewingStaff.street || 'N/I'}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block">Número</span>
                    <p className="text-xs font-black text-slate-800 uppercase">{viewingStaff.streetNumber || 'N/I'}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block">Bairro</span>
                    <p className="text-xs font-black text-slate-800 uppercase truncate">{viewingStaff.neighborhood || 'N/I'}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block">Cidade</span>
                    <p className="text-xs font-black text-slate-800 uppercase truncate">{viewingStaff.city || 'N/I'}</p>
                  </div>
                </div>
             </div>

             <div className="space-y-4 mb-8">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block ml-1">EPIs e Segurança</span>
                  {viewingStaff.status === 'active' && (
                    <button onClick={() => handleOpenEpiModal(viewingStaff.id)} className="text-[10px] font-black uppercase text-blue-500 hover:underline">+ Registrar Entrega</button>
                  )}
                </div>
                <div className="divide-y divide-gray-100 bg-white border border-gray-100 rounded-3xl overflow-hidden shadow-sm">
                   {viewingStaff.epis.map(epi => (
                      <div key={epi.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-all">
                        <div className="flex items-center space-x-3">
                           <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm ${epi.status === 'vencido' ? 'bg-red-50 text-red-500' : 'bg-emerald-50 text-emerald-500'}`}>
                             <i className={`fa-solid ${epi.status === 'vencido' ? 'fa-triangle-exclamation' : 'fa-check'}`}></i>
                           </div>
                           <div>
                              <p className="text-xs font-black text-slate-800 uppercase tracking-tight">{epi.name}</p>
                              <p className="text-[9px] text-gray-400 font-bold">Vence: {epi.expiryDate.split('-').reverse().join('/')}</p>
                           </div>
                        </div>
                        {epi.status === 'vencido' && viewingStaff.status === 'active' && (
                          <button 
                            onClick={() => handleOpenEpiModal(viewingStaff.id, epi.name)}
                            className="bg-yellow-400 text-slate-900 px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg shadow-yellow-100 hover:bg-yellow-500"
                          >
                            Entregar Novo
                          </button>
                        )}
                        <div className="text-right">
                           <p className={`text-[10px] font-black uppercase ${epi.status === 'vencido' ? 'text-red-500' : 'text-emerald-500'}`}>{epi.status === 'vencido' ? 'VENCIDO' : 'REGULAR'}</p>
                        </div>
                      </div>
                   ))}
                </div>
             </div>

             <div className="flex flex-wrap gap-4 mt-10">
                <button onClick={() => setViewingStaff(null)} className="flex-1 min-w-[140px] py-6 bg-slate-900 text-white rounded-[2.5rem] font-black uppercase text-xs tracking-widest shadow-2xl active:scale-95 transition-all">Fechar</button>
                {viewingStaff.status === 'active' ? (
                  <>
                    <button 
                      onClick={() => { setEditingStaff(viewingStaff); setIsStaffModalOpen(true); }}
                      className="flex-1 min-w-[140px] py-6 bg-white border border-slate-200 text-slate-900 rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-sm hover:bg-slate-50 transition-all"
                    >
                      Editar Ficha
                    </button>
                    <button 
                      onClick={handleOpenDismissalModal}
                      className="flex-1 min-w-[140px] py-6 bg-red-50 text-red-500 border border-red-100 rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-sm hover:bg-red-500 hover:text-white transition-all"
                    >
                      Encerrar Contrato
                    </button>
                  </>
                ) : (
                  <button 
                    onClick={() => { setEditingStaff(viewingStaff); setIsStaffModalOpen(true); }}
                    className="flex-1 min-w-[140px] py-6 bg-white border border-slate-200 text-slate-900 rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-sm hover:bg-slate-50 transition-all"
                  >
                    Editar Cadastro Inativo
                  </button>
                )}
             </div>
          </div>
        </div>
      )}

      {/* MODAL: REGISTRAR RESCISÃO */}
      {isDismissalModalOpen && viewingStaff && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-2xl animate-in fade-in" onClick={() => setIsDismissalModalOpen(false)}></div>
          <div className="relative bg-white w-full max-w-lg rounded-[4rem] shadow-2xl overflow-hidden animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
             <div className="px-10 py-8 bg-red-500 text-white flex justify-between items-center">
               <div>
                  <h3 className="text-2xl font-black uppercase tracking-tighter">Rescisão de Contrato</h3>
                  <p className="text-[10px] text-red-100 font-bold uppercase tracking-widest">Colaborador: {viewingStaff.name}</p>
               </div>
               <button onClick={() => setIsDismissalModalOpen(false)} className="w-12 h-12 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors"><i className="fa-solid fa-xmark text-xl"></i></button>
             </div>
             <form onSubmit={handleConfirmDismissal} className="p-10 space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Data do Desligamento</label>
                  <input required name="dismissalDate" type="date" className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 font-black text-slate-800 shadow-inner" defaultValue={new Date().toISOString().split('T')[0]} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Motivo do Desligamento</label>
                  <select required name="reason" className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 font-black text-slate-800 shadow-inner appearance-none">
                    <option value="Normal / Acordo">Normal / Acordo</option>
                    <option value="Pedido de Demissão">Pedido de Demissão</option>
                    <option value="Sem Justa Causa">Demissão Sem Justa Causa</option>
                    <option value="Justa Causa">Demissão Por Justa Causa</option>
                    <option value="Fim de Contrato Determinado">Fim de Contrato Determinado</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Pendências / Acertos (Terceiros)</label>
                  <textarea name="pendencies" rows={3} className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 font-black text-slate-800 outline-none focus:ring-4 focus:ring-red-400/30 shadow-inner resize-none" placeholder="Ex: Devolução de chaves, uniformes e acerto de horas extras pendentes..."></textarea>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Status do Acerto Financeiro</label>
                  <select required name="isPaid" className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 font-black text-slate-800 shadow-inner appearance-none">
                    <option value="false">Pendente para Pagamento</option>
                    <option value="true">Já Foi Pago / Liquidado</option>
                  </select>
                </div>
                <button type="submit" className="w-full py-6 bg-red-500 text-white rounded-[2rem] font-black uppercase text-xs tracking-[0.2em] shadow-2xl shadow-red-200 active:scale-95 transition-all">Confirmar e Encerrar Contrato</button>
             </form>
          </div>
        </div>
      )}

      {/* Modal Controle de EPIs */}
      {isEpiModalOpen && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-2xl animate-in fade-in" onClick={() => setIsEpiModalOpen(false)}></div>
          <div className="relative bg-white w-full max-w-lg rounded-[4rem] shadow-2xl overflow-hidden animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="px-12 py-10 mycond-bg-blue text-white flex justify-between items-center">
              <div>
                <h3 className="text-3xl font-black uppercase tracking-tighter">Controle de EPIs</h3>
                <p className="text-[10px] text-blue-300 font-bold uppercase tracking-widest">Entrega Rápida • MyCond Segurança</p>
              </div>
              <button onClick={() => setIsEpiModalOpen(false)} className="w-14 h-14 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors"><i className="fa-solid fa-xmark text-2xl"></i></button>
            </div>
            <form onSubmit={handleRegisterEpi} className="p-8 space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Colaborador</label>
                <select required name="staffId" defaultValue={epiPreFill?.staffId || viewingStaff?.id} className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 font-black text-slate-800 shadow-inner appearance-none">
                  {staff.filter(s => s.status === 'active').map(s => <option key={s.id} value={s.id}>{s.name} ({s.role})</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Item a ser Entregue</label>
                <input 
                  required 
                  name="epiName" 
                  list="epi-list"
                  defaultValue={epiPreFill?.epiName}
                  onChange={(e) => e.target.value = e.target.value.toUpperCase()}
                  className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 font-black text-slate-800 outline-none focus:ring-4 focus:ring-yellow-400/30 shadow-inner" 
                  placeholder="Selecione ou digite o EPI..." 
                />
                <datalist id="epi-list">
                  {STANDARD_EPIS.map(epi => <option key={epi} value={epi} />)}
                </datalist>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Data Entrega</label>
                  <input required name="deliveryDate" type="date" className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 font-black text-slate-800 shadow-inner" defaultValue={new Date().toISOString().split('T')[0]} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Data Vencimento</label>
                  <input required name="expiryDate" type="date" className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 font-black text-slate-800 shadow-inner" />
                </div>
              </div>
              <button type="submit" className="w-full py-6 mycond-bg-yellow text-slate-900 rounded-[2rem] font-black uppercase text-[11px] tracking-[0.2em] shadow-2xl shadow-yellow-100 active:scale-95 transition-all">Confirmar Entrega de EPI</button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Cadastro/Edição de Colaborador (RH) */}
      {(isStaffModalOpen || editingStaff) && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-2xl animate-in fade-in" onClick={() => { setIsStaffModalOpen(false); setEditingStaff(null); }}></div>
          <div className="relative bg-white w-full max-w-2xl rounded-[4rem] shadow-2xl overflow-hidden animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="px-12 py-10 mycond-bg-blue text-white flex justify-between items-center">
              <div>
                <h3 className="text-3xl font-black uppercase tracking-tighter">{editingStaff ? 'Editar Ficha RH' : 'Novo Colaborador'}</h3>
                <p className="text-[10px] text-blue-300 font-bold uppercase tracking-widest">Informações Pessoais e de Contratação</p>
              </div>
              <button onClick={() => { setIsStaffModalOpen(false); setEditingStaff(null); }} className="w-14 h-14 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors"><i className="fa-solid fa-xmark text-2xl"></i></button>
            </div>
            
            <form onSubmit={handleSaveStaff} className="p-12 space-y-10">
              <input type="hidden" name="id" defaultValue={editingStaff?.id} />
              
              <div className="flex flex-col items-center">
                <div 
                  onClick={() => photoInputRef.current?.click()}
                  className="w-28 h-28 bg-slate-50 border-4 border-dashed border-gray-200 rounded-[2.5rem] flex items-center justify-center overflow-hidden cursor-pointer hover:border-yellow-400 transition-all group shadow-inner"
                >
                  {tempPhoto || editingStaff?.photoUrl ? (
                    <img src={tempPhoto || editingStaff?.photoUrl} className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center">
                      <i className="fa-solid fa-camera text-gray-300 text-2xl mb-1 group-hover:scale-110 transition-transform"></i>
                      <p className="text-[8px] font-black text-gray-400 uppercase">Subir Foto</p>
                    </div>
                  )}
                </div>
                <input type="file" ref={photoInputRef} onChange={handlePhotoUpload} className="hidden" accept="image/*" />
              </div>

              {/* DADOS PESSOAIS */}
              <div className="space-y-6">
                <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] border-l-4 border-yellow-400 pl-3">Dados Pessoais</p>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Nome Completo</label>
                  <input required name="name" defaultValue={editingStaff?.name} onChange={(e) => e.target.value = e.target.value.toUpperCase()} className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 font-black text-slate-800 shadow-inner" placeholder="NOME COMPLETO" />
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Telefone</label>
                    <input 
                      name="phone" 
                      defaultValue={editingStaff?.phone}
                      onChange={(e) => {
                        e.target.value = e.target.value.replace(/\D/g, '');
                        if (e.target.value.length > 11) e.target.value = e.target.value.slice(0, 11);
                      }}
                      className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 font-black text-slate-800 shadow-inner" 
                      placeholder="DDD +Número" 
                      maxLength={11}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Estado Civil</label>
                    <select name="maritalStatus" defaultValue={editingStaff?.maritalStatus} className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 font-black text-slate-800 shadow-inner appearance-none">
                      <option value="SOLTEIRO(A)">Solteiro(a)</option>
                      <option value="CASADO(A)">Casado(a)</option>
                      <option value="DIVORCIADO(A)">Divorciado(a)</option>
                      <option value="VIÚVO(A)">Viúvo(a)</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">RG</label>
                    <input 
                      name="rg" 
                      defaultValue={editingStaff?.rg}
                      onChange={(e) => {
                        e.target.value = formatRG(e.target.value);
                      }}
                      className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 font-black text-slate-800 shadow-inner" 
                      placeholder="00.000.000-0" 
                      maxLength={12}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Nº de Filhos</label>
                    <input type="number" name="childrenCount" defaultValue={editingStaff?.childrenCount} className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 font-black text-slate-800 shadow-inner" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-6">
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Data de Admissão</label>
                      <input required name="admissionDate" defaultValue={editingStaff?.admissionDate} type="date" className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 font-black text-slate-800 shadow-inner" />
                   </div>
                </div>
              </div>

              {/* ENDEREÇO DETALHADO */}
              <div className="space-y-6">
                <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] border-l-4 border-yellow-400 pl-3">Endereço Residencial</p>
                <div className="grid grid-cols-12 gap-4">
                  <div className="col-span-8 space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Rua / Logradouro</label>
                    <input name="street" defaultValue={editingStaff?.street} onChange={(e) => e.target.value = e.target.value.toUpperCase()} className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 font-black text-slate-800 shadow-inner" placeholder="RUA/AVENIDA" />
                  </div>
                  <div className="col-span-4 space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Nº</label>
                    <input name="streetNumber" type="number" defaultValue={editingStaff?.streetNumber} className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 font-black text-slate-800 shadow-inner" placeholder="Nº" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Bairro</label>
                    <input name="neighborhood" defaultValue={editingStaff?.neighborhood} onChange={(e) => e.target.value = e.target.value.toUpperCase()} className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 font-black text-slate-800 shadow-inner" placeholder="BAIRRO" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Cidade</label>
                    <input name="city" defaultValue={editingStaff?.city} onChange={(e) => e.target.value = e.target.value.toUpperCase()} className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 font-black text-slate-800 shadow-inner" placeholder="CIDADE" />
                  </div>
                </div>
              </div>

              {/* CONTRATO E FUNÇÃO */}
              <div className="space-y-6">
                <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] border-l-4 border-yellow-400 pl-3">Contrato e Função</p>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Função / Cargo</label>
                  <div className="flex gap-2">
                    <select name="role" defaultValue={editingStaff?.role} className="flex-1 bg-slate-50 border-none rounded-2xl px-6 py-4 font-black text-slate-800 shadow-inner appearance-none">
                      {availableRoles.map(role => <option key={role} value={role}>{role}</option>)}
                    </select>
                    <button type="button" onClick={() => {
                      const newRole = prompt("Digite o nome da nova função:");
                      if(newRole) setAvailableRoles([...availableRoles, newRole]);
                    }} className="w-14 h-14 bg-slate-900 text-white rounded-2xl flex items-center justify-center hover:bg-slate-800 transition-colors"><i className="fa-solid fa-plus"></i></button>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Status 13º Salário</label>
                  <select name="thirteenth" defaultValue={editingStaff?.thirteenthSalaryStatus} className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 font-black text-slate-800 shadow-inner appearance-none">
                    <option value="PENDING">Pendente</option>
                    <option value="PAID">Totalmente Pago</option>
                    <option value="NAO_SE_APLICA">Não se Aplica</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Início das Férias</label>
                    <input name="vacationStart" defaultValue={editingStaff?.vacationStart} type="date" className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 font-black text-slate-800 shadow-inner" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Fim das Férias</label>
                    <input name="vacationEnd" defaultValue={editingStaff?.vacationEnd} type="date" className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 font-black text-slate-800 shadow-inner" />
                  </div>
                </div>
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Documentos Digitais</label>
                  <div 
                    onClick={() => docsInputRef.current?.click()}
                    className="w-full py-10 border-4 border-dashed border-slate-100 rounded-[2.5rem] flex flex-col items-center justify-center text-gray-300 hover:border-blue-200 hover:bg-blue-50/20 transition-all cursor-pointer group shadow-sm"
                  >
                    <i className="fa-solid fa-cloud-arrow-up text-3xl mb-2 group-hover:scale-110 transition-transform"></i>
                    <span className="text-[10px] font-black uppercase tracking-widest">Subir Contratos / Exames</span>
                  </div>
                  <input type="file" multiple ref={docsInputRef} onChange={handleDocsUpload} className="hidden" />
                </div>
              </div>
              
              <button type="submit" className="w-full py-7 mycond-bg-yellow text-slate-900 rounded-[2.5rem] font-black uppercase text-xs tracking-[0.2em] shadow-2xl shadow-yellow-100 active:scale-95 transition-all">
                {editingStaff ? 'Salvar Alterações no Registro' : 'Finalizar Cadastro RH'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Equipe;