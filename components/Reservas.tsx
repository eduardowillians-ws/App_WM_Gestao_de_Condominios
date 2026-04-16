
import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { AREAS_RESERVA } from '../constants';
import { AreaReserva, Reserva } from '../types';

interface ReservasProps {
  userRole?: 'admin' | 'resident' | 'manager';
  currentUser?: {
    id: string;
    name: string;
    unit: string;
    role: string;
    avatar: string;
  };
}

const Reservas: React.FC<ReservasProps> = ({ userRole = 'resident', currentUser }) => {
  const [activeTab, setActiveTab] = useState<'areas' | 'my-reservations'>('areas');
  const [selectedArea, setSelectedArea] = useState<AreaReserva | null>(null);
  const [isReserving, setIsReserving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreatingArea, setIsCreatingArea] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const [reservations, setReservations] = useState<Reserva[]>([]);
  const [areas, setAreas] = useState<AreaReserva[]>([]);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    startTime: '09:00',
    endTime: '10:00',
    tax: 0
  });

  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [dayReservations, setDayReservations] = useState<Reserva[]>([]);
  const [reservationsByDate, setReservationsByDate] = useState<Record<string, Reserva[]>>({});

  const [selectedHours, setSelectedHours] = useState<string[]>([]);
  const [currentRuleInput, setCurrentRuleInput] = useState('');
  const [newAreaData, setNewAreaData] = useState<Partial<AreaReserva>>({
    name: '',
    capacity: 20,
    tax: 0,
    description: '',
    rules: [],
    image: 'https://images.unsplash.com/photo-1542601039-460d1ea3ca3e?auto=format&fit=crop&w=600&q=80'
  });

  const photoInputRef = useRef<HTMLInputElement>(null);
  const isAdmin = userRole === 'admin';

  useEffect(() => {
    fetchAreas();
    fetchReservations();
  }, []);

  const fetchAreas = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('areas')
        .select('*')
        .eq('is_active', true)
        .order('name');
      
      if (error) throw error;
      setAreas(data || AREAS_RESERVA);
    } catch (err) {
      console.log('Fallback to local areas:', err);
      setAreas(AREAS_RESERVA);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchReservations = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('reservations')
        .select('*, areas(name)')
        .eq('status', 'confirmed')
        .order('date', { ascending: true });

      if (!isAdmin && currentUser) {
        query = query.eq('user_id', currentUser.id);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      
      const formatted = (data || []).map((r: any) => ({
        id: r.id,
        areaId: r.area_id,
        areaName: r.areas?.name || r.area_name,
        date: r.date,
        startTime: r.start_time,
        endTime: r.end_time,
        status: r.status,
        residentName: r.resident_name,
        unit: r.unit
      }));
      
      setReservations(formatted);
    } catch (err) {
      console.log('No reservations yet:', err);
      setReservations([]);
    } finally {
      setIsLoading(false);
    }
  };

  const checkAvailability = async (areaId: string, date: string, startTime: string, endTime: string) => {
    try {
      const { data, error } = await supabase
        .from('reservations')
        .select('id')
        .eq('area_id', areaId)
        .eq('date', date)
        .eq('status', 'confirmed')
        .or(`start_time.lt.${endTime},end_time.gt.${startTime}`);

      if (error) throw error;
      return { available: (data || []).length === 0, conflicting: data };
    } catch (err) {
      console.log('Error checking availability:', err);
      return { available: true, conflicting: [] };
    }
  };

  const fetchMonthReservations = async (areaId: string, date: Date) => {
    try {
      const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
      const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
      
      const { data, error } = await supabase
        .from('reservations')
        .select('*')
        .eq('area_id', areaId)
        .eq('status', 'confirmed')
        .gte('date', firstDay.toISOString().split('T')[0])
        .lte('date', lastDay.toISOString().split('T')[0]);

      if (error) throw error;

      const grouped: Record<string, any> = {};
      (data || []).forEach((r: any) => {
        if (!grouped[r.date]) grouped[r.date] = [];
        grouped[r.date].push({
          id: r.id,
          areaId: r.area_id,
          areaName: r.area_name,
          date: r.date,
          startTime: r.start_time,
          endTime: r.end_time,
          status: r.status,
          residentName: r.resident_name,
          unit: r.unit
        });
      });
      
      setReservationsByDate(grouped);
    } catch (err) {
      console.log('Error fetching month reservations:', err);
    }
  };

  const fetchDayReservations = async (areaId: string, date: string) => {
    try {
      const { data, error } = await supabase
        .from('reservations')
        .select('*')
        .eq('area_id', areaId)
        .eq('date', date)
        .eq('status', 'confirmed')
        .order('start_time');

      if (error) throw error;

      const formatted = (data || []).map((r: any) => ({
        id: r.id,
        areaId: r.area_id,
        areaName: r.area_name,
        date: r.date,
        startTime: r.start_time,
        endTime: r.end_time,
        status: r.status,
        residentName: r.resident_name,
        unit: r.unit
      }));

      setDayReservations(formatted);
    } catch (err) {
      console.log('Error fetching day reservations:', err);
    }
  };

  const handleOpenReserving = (area: AreaReserva) => {
    setSelectedArea(area);
    setFormData({
      date: new Date().toISOString().split('T')[0],
      startTime: '09:00',
      endTime: '10:00',
      tax: area.tax
    });
    setCalendarMonth(new Date());
    setSelectedDate(null);
    setDayReservations([]);
    setSelectedHours([]);
    fetchMonthReservations(area.id, new Date());
    setIsReserving(true);
  };

  const handleCreateReserva = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedArea || !currentUser || selectedHours.length === 0) return;

    setIsLoading(true);
    try {
      const startHour = selectedHours[0];
      const endHour = String(parseInt(selectedHours[selectedHours.length - 1]) + 1).padStart(2, '0') + ':00';

      for (const hour of selectedHours) {
        const nextHour = String(parseInt(hour) + 1).padStart(2, '0') + ':00';
        
        const { data, error: checkError } = await supabase
          .from('reservations')
          .select('id')
          .eq('area_id', selectedArea.id)
          .eq('date', formData.date)
          .eq('status', 'confirmed')
          .lt('start_time', nextHour)
          .gt('end_time', hour);

        if (checkError) throw checkError;

        if (data && data.length > 0) {
          alert(`Horário ${hour}:00 já está reservado!`);
          return;
        }
      }

      const { error } = await supabase
        .from('reservations')
        .insert({
          area_id: selectedArea.id,
          user_id: currentUser.id,
          resident_name: currentUser.name,
          unit: currentUser.unit,
          date: formData.date,
          start_time: startHour,
          end_time: endHour,
          status: 'confirmed',
          area_name: selectedArea.name
        });

      if (error) throw error;

      await fetchReservations();
      if (selectedArea) {
        await fetchMonthReservations(selectedArea.id, calendarMonth);
      }
      if (selectedDate && selectedArea) {
        await fetchDayReservations(selectedArea.id, selectedDate);
      }
      setSelectedHours([]);
      setSelectedDate(null);
      setIsReserving(false);
      setSelectedArea(null);
      alert('Reserva efetuada com sucesso!');
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Erro ao criar reserva');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateArea = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedArea) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('areas')
        .update({
          name: selectedArea.name,
          capacity: selectedArea.capacity,
          tax: selectedArea.tax,
          description: selectedArea.description,
          rules: selectedArea.rules,
          image: selectedArea.image
        })
        .eq('id', selectedArea.id);

      if (error) throw error;

      await fetchAreas();
      setIsEditing(false);
      alert('Configurações salvas!');
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Erro ao atualizar área');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterNewArea = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAreaData.name) return alert('Nome da área é obrigatório');

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('areas')
        .insert({
          name: newAreaData.name,
          capacity: newAreaData.capacity || 20,
          tax: newAreaData.tax || 0,
          description: newAreaData.description || '',
          rules: newAreaData.rules || [],
          image: newAreaData.image || 'https://images.unsplash.com/photo-1542601039-460d1ea3ca3e?auto=format&fit=crop&w=600&q=80',
          is_active: true
        });

      if (error) throw error;

      await fetchAreas();
      setIsCreatingArea(false);
      setNewAreaData({ name: '', capacity: 20, tax: 0, description: '', rules: [], image: 'https://images.unsplash.com/photo-1542601039-460d1ea3ca3e?auto=format&fit=crop&w=600&q=80' });
      alert('Área cadastrada com sucesso!');
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Erro ao cadastrar área');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteArea = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!window.confirm('Deseja excluir permanentemente este espaço do catálogo de áreas comuns?')) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('areas')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;

      await fetchAreas();
      alert('Área removida.');
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Erro ao remover área');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteReserva = async (id: string) => {
    if (!window.confirm('Deseja realmente cancelar esta reserva?')) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('reservations')
        .update({ status: 'cancelled' })
        .eq('id', id);

      if (error) throw error;

      setReservations(reservations.filter(r => r.id !== id));
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Erro ao cancelar reserva');
    } finally {
      setIsLoading(false);
    }
  };

  const triggerPhotoUpload = () => {
    photoInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        if (isEditing && selectedArea) {
          setSelectedArea({ ...selectedArea, image: result });
        } else if (isCreatingArea) {
          setNewAreaData({ ...newAreaData, image: result });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Funções para gerenciar regras na UI
  const addRule = () => {
    if (!currentRuleInput.trim()) return;
    
    if (isEditing && selectedArea) {
      setSelectedArea({
        ...selectedArea,
        rules: [...selectedArea.rules, currentRuleInput.trim()]
      });
    } else if (isCreatingArea) {
      setNewAreaData({
        ...newAreaData,
        rules: [...(newAreaData.rules || []), currentRuleInput.trim()]
      });
    }
    setCurrentRuleInput('');
  };

  const removeRule = (index: number) => {
    if (isEditing && selectedArea) {
      setSelectedArea({
        ...selectedArea,
        rules: selectedArea.rules.filter((_, i) => i !== index)
      });
    } else if (isCreatingArea) {
      setNewAreaData({
        ...newAreaData,
        rules: (newAreaData.rules || []).filter((_, i) => i !== index)
      });
    }
  };

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight uppercase leading-none">Gestão de Áreas Comuns</h2>
          <p className="text-sm text-gray-500 font-medium mt-1">Controle de agendamentos e configuração de espaços para moradores.</p>
        </div>
        <div className="flex items-center gap-3">
            <div className="flex bg-white p-1 rounded-2xl border border-gray-200 shadow-sm mr-2">
                <button 
                  onClick={() => setActiveTab('areas')}
                  className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'areas' ? 'mycond-bg-yellow text-slate-900 shadow-md' : 'text-gray-400 hover:text-slate-600'}`}
                >Áreas Disponíveis</button>
                <button 
                  onClick={() => setActiveTab('my-reservations')}
                  className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'my-reservations' ? 'mycond-bg-yellow text-slate-900 shadow-md' : 'text-gray-400 hover:text-slate-600'}`}
                >Minhas Reservas</button>
            </div>
            
            {isAdmin && (
              <button 
                onClick={() => {
                  setNewAreaData({ name: '', capacity: 20, tax: 0, description: '', rules: [], image: 'https://images.unsplash.com/photo-1542601039-460d1ea3ca3e?auto=format&fit=crop&w=600&q=80' });
                  setIsCreatingArea(true);
                }}
                className="mycond-bg-yellow text-slate-900 px-6 py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-yellow-200 hover:bg-yellow-500 transition-all active:scale-95 flex items-center space-x-2"
              >
                <i className="fa-solid fa-plus"></i>
                <span>Novo Espaço</span>
              </button>
            )}
        </div>
      </header>

      {activeTab === 'areas' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {areas.map(area => (
              <div 
                key={area.id} 
                onClick={() => setSelectedArea(area)}
                className="bg-white rounded-[3rem] overflow-hidden shadow-sm border border-gray-100 group cursor-pointer hover:shadow-2xl hover:border-yellow-200 transition-all duration-500 hover:-translate-y-1 relative"
              >
                  {isAdmin && (
                    <button 
                      onClick={(e) => handleDeleteArea(e, area.id)}
                      className="absolute top-4 left-6 z-20 w-10 h-10 bg-red-500/80 hover:bg-red-600 text-white rounded-xl flex items-center justify-center backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all shadow-lg"
                      title="Excluir Área"
                    >
                      <i className="fa-solid fa-trash-can text-sm"></i>
                    </button>
                  )}

                  <div className="h-60 relative">
                      <img src={area.image} alt={area.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                      <div className="absolute top-6 right-6 px-4 py-1.5 bg-white/95 backdrop-blur-lg rounded-full text-[10px] font-black text-slate-900 uppercase shadow-xl tracking-tighter">
                          TAXA: {area.tax === 0 ? 'GRÁTIS' : `R$ ${area.tax.toFixed(2)}`}
                      </div>
                      <div className="absolute bottom-6 left-8 text-white">
                          <h4 className="font-black text-2xl uppercase tracking-tighter leading-none mb-1">{area.name}</h4>
                          <p className="text-[10px] uppercase font-black text-white/70 tracking-widest flex items-center">
                            <i className="fa-solid fa-users mr-1.5 text-yellow-400"></i> {area.capacity} PESSOAS MAX.
                          </p>
                      </div>
                  </div>
                  <div className="p-8 flex justify-between items-center bg-white">
                      <p className="text-xs text-gray-400 line-clamp-1 font-medium italic tracking-tight flex-1 pr-6">{area.description || 'Nenhuma descrição informada.'}</p>
                      <div className="w-12 h-12 bg-slate-50 text-slate-300 group-hover:bg-yellow-400 group-hover:text-slate-900 rounded-2xl flex items-center justify-center transition-all duration-300 shadow-inner">
                          <i className="fa-solid fa-calendar-check text-xl"></i>
                      </div>
                  </div>
              </div>
          ))}
          
          {isAdmin && (
            <button 
              onClick={() => {
                setNewAreaData({ name: '', capacity: 20, tax: 0, description: '', rules: [], image: 'https://images.unsplash.com/photo-1542601039-460d1ea3ca3e?auto=format&fit=crop&w=600&q=80' });
                setIsCreatingArea(true);
              }}
              className="border-4 border-dashed border-gray-100 rounded-[3rem] flex flex-col items-center justify-center p-12 text-gray-300 hover:border-yellow-200 hover:text-yellow-500 hover:bg-yellow-50/20 transition-all duration-500 group"
            >
               <div className="w-16 h-16 bg-slate-50 rounded-3xl flex items-center justify-center mb-5 group-hover:bg-yellow-400 group-hover:text-white transition-all duration-500 shadow-inner">
                 <i className="fa-solid fa-plus text-3xl group-hover:rotate-90 transition-transform duration-500"></i>
               </div>
               <span className="font-black uppercase tracking-[0.2em] text-xs">Adicionar Área</span>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-500">
           {reservations.length === 0 ? (
             <div className="p-20 text-center bg-white rounded-[3rem] border-2 border-dashed border-gray-100">
               <i className="fa-solid fa-calendar-xmark text-4xl text-gray-100 mb-6"></i>
               <p className="text-gray-400 font-black uppercase tracking-widest text-sm mb-2">Sem reservas agendadas</p>
               <button onClick={() => setActiveTab('areas')} className="text-xs font-black text-yellow-600 uppercase tracking-[0.2em] hover:text-yellow-700 underline underline-offset-4">Ver Catálogo de Áreas</button>
             </div>
           ) : (
             reservations.map(res => (
               <div key={res.id} className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex flex-col md:flex-row justify-between items-center group hover:border-yellow-100 transition-all duration-300">
                 <div className="flex items-center space-x-6 w-full">
                    <div className="w-16 h-16 bg-slate-900 text-yellow-400 rounded-2xl flex flex-col items-center justify-center shadow-lg">
                        <span className="text-[10px] font-black uppercase tracking-tighter">{new Date(res.date).toLocaleDateString('pt-BR', {month: 'short'})}</span>
                        <span className="text-2xl font-black leading-none">{res.date.split('-')[2]}</span>
                    </div>
                    <div className="flex-1">
                       <h4 className="font-black text-slate-800 uppercase tracking-tighter text-lg">{res.areaName}</h4>
                       <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-[11px] text-gray-400 font-black uppercase tracking-widest mt-1">
                          <span className="flex items-center"><i className="fa-regular fa-clock mr-2 text-yellow-500"></i> {res.startTime} às {res.endTime}</span>
                          <span className="flex items-center"><i className="fa-solid fa-user-check mr-2 text-yellow-500"></i> {res.residentName} ({res.unit})</span>
                       </div>
                    </div>
                    <div className="hidden md:block pr-4">
                       <span className="px-5 py-2 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-100">Confirmada</span>
                    </div>
                    <button 
                      onClick={() => handleDeleteReserva(res.id)}
                      className="w-12 h-12 flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all duration-300"
                    >
                      <i className="fa-solid fa-trash-can text-lg"></i>
                    </button>
                 </div>
               </div>
             ))
           )}
        </div>
      )}

      {/* --- MODAL DETALHES --- */}
      {selectedArea && !isReserving && !isEditing && !isCreatingArea && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-xl animate-in fade-in duration-300" onClick={() => setSelectedArea(null)}></div>
          <div className="relative bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="h-80 relative">
               <img src={selectedArea.image} className="w-full h-full object-cover" />
               <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent"></div>
               <button onClick={() => setSelectedArea(null)} className="absolute top-6 right-6 w-12 h-12 bg-black/30 hover:bg-black/50 text-white rounded-full flex items-center justify-center backdrop-blur-xl transition-all duration-300 shadow-xl">
                  <i className="fa-solid fa-xmark text-xl"></i>
               </button>
               {isAdmin && (
                 <button 
                  onClick={() => setIsEditing(true)} 
                  className="absolute top-6 right-20 w-12 h-12 bg-white/90 hover:bg-white text-slate-900 rounded-full flex items-center justify-center backdrop-blur-xl transition-all duration-300 shadow-xl"
                  title="Editar Área"
                 >
                    <i className="fa-solid fa-pen-to-square"></i>
                 </button>
               )}
               <div className="absolute top-6 left-6 flex gap-3">
                  <span className="px-5 py-2 bg-yellow-400 text-slate-900 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg">Configuração Ativa</span>
               </div>
            </div>
            
            <div className="p-10 -mt-16 relative bg-white rounded-t-[3rem]">
               <div className="flex flex-col mb-8">
                    <h3 className="text-4xl font-black text-slate-900 uppercase tracking-tighter leading-none mb-4">{selectedArea.name}</h3>
                    <div className="flex flex-wrap gap-8 text-[11px] font-black text-gray-400 uppercase tracking-[0.2em]">
                       <span className="flex items-center"><i className="fa-solid fa-users text-yellow-500 mr-2.5"></i> {selectedArea.capacity} PESSOAS</span>
                       <span className="flex items-center"><i className="fa-solid fa-tag text-yellow-500 mr-2.5"></i> TAXA: R$ {selectedArea.tax.toFixed(2)}</span>
                    </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-10">
                  <div className="space-y-4">
                     <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Descrição</h4>
                     <p className="text-sm text-gray-600 leading-relaxed font-bold tracking-tight">{selectedArea.description || 'Sem descrição.'}</p>
                  </div>
                  <div className="space-y-4">
                     <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Regras de Uso</h4>
                     <ul className="space-y-3">
                        {selectedArea.rules && selectedArea.rules.length > 0 ? selectedArea.rules.map((rule, idx) => (
                          <li key={idx} className="flex items-start space-x-3 text-[11px] font-bold text-slate-500 tracking-tight">
                             <div className="w-5 h-5 rounded-full bg-yellow-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                               <i className="fa-solid fa-check text-yellow-500 text-[8px]"></i>
                             </div>
                             <span>{rule}</span>
                          </li>
                        )) : (
                          <li className="text-[11px] italic text-gray-400">Nenhuma regra cadastrada.</li>
                        )}
                     </ul>
                  </div>
               </div>

               <button 
                  onClick={() => handleOpenReserving(selectedArea)}
                  className="w-full py-5 mycond-bg-yellow text-slate-900 rounded-[2.5rem] font-black uppercase text-xs tracking-[0.3em] shadow-2xl shadow-yellow-200 hover:bg-yellow-500 transition-all duration-300 transform active:scale-[0.98]"
               >
                  Prosseguir com Agendamento
               </button>
            </div>
          </div>
        </div>
      )}

      {/* --- FORMULÁRIO DE RESERVA --- */}
      {selectedArea && isReserving && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-3xl animate-in fade-in duration-500" onClick={() => setIsReserving(false)}></div>
           <form onSubmit={handleCreateReserva} className="relative bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl p-8 animate-in zoom-in-95 duration-400 max-h-[90vh] overflow-y-auto">
              <h3 className="text-3xl font-black text-slate-900 uppercase tracking-tighter mb-2">Agendar {selectedArea.name}</h3>
              <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em] mb-8">Selecione a data e escolha os horários desejados.</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Calendário */}
                <div className="bg-slate-50 p-6 rounded-[2rem]">
                  <div className="flex items-center justify-between mb-6">
                    <button 
                      type="button"
                      onClick={() => {
                        const prev = new Date(calendarMonth);
                        prev.setMonth(prev.getMonth() - 1);
                        setCalendarMonth(prev);
                        selectedArea && fetchMonthReservations(selectedArea.id, prev);
                      }}
                      className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-600 hover:bg-yellow-400 hover:text-slate-900 transition-all shadow-sm"
                    >
                      <i className="fa-solid fa-chevron-left"></i>
                    </button>
                    <span className="text-[11px] font-black text-slate-800 uppercase tracking-widest">
                      {calendarMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                    </span>
                    <button 
                      type="button"
                      onClick={() => {
                        const next = new Date(calendarMonth);
                        next.setMonth(next.getMonth() + 1);
                        setCalendarMonth(next);
                        selectedArea && fetchMonthReservations(selectedArea.id, next);
                      }}
                      className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-600 hover:bg-yellow-400 hover:text-slate-900 transition-all shadow-sm"
                    >
                      <i className="fa-solid fa-chevron-right"></i>
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-7 gap-2 mb-2">
                    {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => (
                      <div key={i} className="text-[10px] font-black text-gray-400 text-center">{d}</div>
                    ))}
                  </div>
                  
                  <div className="grid grid-cols-7 gap-2">
                    {(() => {
                      const year = calendarMonth.getFullYear();
                      const month = calendarMonth.getMonth();
                      const firstDay = new Date(year, month, 1).getDay();
                      const daysInMonth = new Date(year, month + 1, 0).getDate();
                      const today = new Date().toISOString().split('T')[0];
                      const days = [];
                      
                      for (let i = 0; i < firstDay; i++) {
                        days.push(<div key={`empty-${i}`}></div>);
                      }
                      
                      for (let d = 1; d <= daysInMonth; d++) {
                        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                        const isToday = dateStr === today;
                        const hasReservations = reservationsByDate[dateStr] && reservationsByDate[dateStr].length > 0;
                        const isSelected = selectedDate === dateStr;
                        const isPast = dateStr < today;
                        
                        days.push(
                          <button
                            key={d}
                            type="button"
                            disabled={isPast}
                            onClick={() => {
                              setSelectedDate(dateStr);
                              setFormData({...formData, date: dateStr});
                              selectedArea && fetchDayReservations(selectedArea.id, dateStr);
                            }}
                            className={`
                              h-10 rounded-xl text-[11px] font-black transition-all flex items-center justify-center
                              ${isSelected ? 'bg-slate-900 text-white shadow-lg' : 'hover:bg-yellow-400 hover:text-slate-900'}
                              ${isToday && !isSelected ? 'ring-2 ring-yellow-400 text-slate-900' : ''}
                              ${isPast ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}
                              ${hasReservations && !isSelected ? 'bg-yellow-100 text-yellow-700' : 'bg-white text-slate-700'}
                            `}
                          >
                            {hasReservations && <i className="fa-solid fa-circle text-[6px] mr-1 text-yellow-500"></i>}
                            {d}
                          </button>
                        );
                      }
                      
                      return days;
                    })()}
                  </div>
                </div>

                {/* Horários do dia selecionado */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      {selectedDate 
                        ? new Date(selectedDate + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'short' })
                        : 'Selecione uma data'}
                    </h4>
                    {selectedDate && (
                      <button 
                        type="button"
                        onClick={() => {
                          setSelectedDate(null);
                          setDayReservations([]);
                          setSelectedHours([]);
                        }}
                        className="text-[10px] text-yellow-600 font-black uppercase"
                      >
                        Limpar
                      </button>
                    )}
                  </div>

                  {selectedDate ? (
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {/* Horários disponíveis em blocos de 1 hora */}
                      {['06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00'].map((hour) => {
                        const isOccupied = dayReservations.some(r => {
                          const start = r.startTime.substring(0, 5);
                          const end = r.endTime.substring(0, 5);
                          return hour >= start && hour < end;
                        });
                        
                        const isSelected = selectedHours.includes(hour);
                        
                        return (
                          <button
                            key={hour}
                            type="button"
                            disabled={isOccupied && !isSelected}
                            onClick={() => {
                              if (isSelected) {
                                setSelectedHours(selectedHours.filter(h => h !== hour));
                              } else {
                                const newHours = [...selectedHours, hour].sort();
                                setSelectedHours(newHours);
                                setFormData({
                                  ...formData,
                                  date: selectedDate,
                                  startTime: newHours[0],
                                  endTime: String(parseInt(newHours[newHours.length - 1]) + 1).padStart(2, '0') + ':00'
                                });
                              }
                            }}
                            className={`
                              w-full p-4 rounded-2xl flex items-center justify-between transition-all
                              ${isOccupied 
                                ? 'bg-red-50 text-red-400 cursor-not-allowed border border-red-100' 
                                : isSelected
                                  ? 'bg-yellow-400 text-slate-900 shadow-lg'
                                  : 'bg-white border border-gray-100 hover:border-yellow-400 text-slate-700'
                              }
                            `}
                          >
                            <span className="font-black text-sm">{hour}</span>
                            {isOccupied && !isSelected ? (
                              <span className="text-[10px] font-black uppercase">Ocupado</span>
                            ) : (
                              <i className={`fa-solid ${isSelected ? 'fa-check' : 'fa-plus'} text-sm`}></i>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-8 text-center bg-slate-50 rounded-2xl">
                      <i className="fa-regular fa-calendar-xmark text-3xl text-gray-200 mb-4"></i>
                      <p className="text-[10px] text-gray-400 font-black uppercase">Clique em uma data para ver os horários</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-[#fffbeb] p-6 rounded-[2rem] border border-[#fef3c7] mt-8 flex justify-between items-center">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#92400e]">Data/Horário</span>
                  <p className="text-sm font-black text-slate-800 mt-1">
                    {formData.date 
                      ? new Date(formData.date + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' })
                      : '—'}
                  </p>
                  {selectedHours.length > 0 && (
                    <p className="text-xs font-black text-yellow-700 mt-1">
                      {selectedHours[0]} às {String(parseInt(selectedHours[selectedHours.length - 1]) + 1).padStart(2, '0')}:00 ({selectedHours.length}h)
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#92400e]">Taxa</span>
                  <p className="text-xl font-black text-[#78350f]">R$ {(formData.tax * selectedHours.length).toFixed(2)}</p>
                </div>
              </div>

              <div className="flex gap-4 mt-8">
                 <button 
                   type="button" 
                   onClick={() => setIsReserving(false)} 
                   className="flex-1 py-5 border-2 border-slate-100 text-slate-400 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-50 transition-all"
                 >
                   Cancelar
                 </button>
<button 
                    type="submit"
                    disabled={selectedHours.length === 0 || isLoading} 
                    className="flex-1 py-5 mycond-bg-yellow text-slate-900 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-2xl shadow-yellow-100 hover:bg-yellow-500 transition-all transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? 'Salvando...' : selectedHours.length > 0 ? `Confirmar (${selectedHours.length}h)` : 'Selecione'}
                  </button>
               </div>
            </form>
        </div>
      )}

      {/* --- MODAL DE EDIÇÃO ADMINISTRATIVA --- */}
      {selectedArea && isEditing && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-2xl animate-in fade-in duration-300" onClick={() => setIsEditing(false)}></div>
           <div className="relative bg-white w-full max-w-xl rounded-[3rem] shadow-2xl p-10 animate-in zoom-in-95 duration-400 max-h-[90vh] overflow-y-auto scrollbar-hide">
              <div className="flex justify-between items-center mb-10">
                <div>
                  <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Configurar {selectedArea.name}</h3>
                  <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em]">Painel do Administrador</p>
                </div>
                <button 
                  type="button"
                  onClick={triggerPhotoUpload} 
                  className="w-14 h-14 bg-yellow-400 text-slate-900 rounded-2xl shadow-xl hover:scale-110 transition-transform flex items-center justify-center cursor-pointer" 
                  title="Trocar Foto"
                >
                  <i className="fa-solid fa-camera text-xl"></i>
                </button>
                <input type="file" ref={photoInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
              </div>

              <form onSubmit={handleUpdateArea} className="space-y-8">
                  <div className="grid grid-cols-2 gap-8">
                    <div className="space-y-2">
                       <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Capacidade</label>
                       <input 
                         type="number" 
                         value={selectedArea.capacity}
                         onChange={(e) => setSelectedArea({...selectedArea, capacity: parseInt(e.target.value) || 0})}
                         className="w-full bg-[#f8fafc] border-none rounded-2xl px-6 py-4 font-black text-slate-800 outline-none focus:ring-2 focus:ring-yellow-400 transition-all" 
                       />
                    </div>
                    <div className="space-y-2">
                       <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Taxa Base (R$)</label>
                       <input 
                         type="number" 
                         value={selectedArea.tax}
                         onChange={(e) => setSelectedArea({...selectedArea, tax: parseFloat(e.target.value) || 0})}
                         className="w-full bg-[#f8fafc] border-none rounded-2xl px-6 py-4 font-black text-slate-800 outline-none focus:ring-2 focus:ring-yellow-400 transition-all" 
                       />
                    </div>
                  </div>
                  <div className="space-y-2">
                     <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Descrição Informativa</label>
                     <textarea 
                       value={selectedArea.description}
                       onChange={(e) => setSelectedArea({...selectedArea, description: e.target.value})}
                       rows={3}
                       className="w-full bg-[#f8fafc] border-none rounded-2xl px-6 py-4 font-black text-slate-800 outline-none focus:ring-2 focus:ring-yellow-400 transition-all resize-none" 
                     />
                  </div>

                  {/* Seção de Regras de Uso na Edição */}
                  <div className="space-y-4">
                     <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Regras de Uso</label>
                     <div className="flex gap-2">
                        <input 
                          type="text"
                          placeholder="Adicionar nova regra..."
                          value={currentRuleInput}
                          onChange={(e) => setCurrentRuleInput(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addRule())}
                          className="flex-1 bg-[#f8fafc] border-none rounded-xl px-4 py-3 font-bold text-xs text-slate-700 outline-none focus:ring-2 focus:ring-yellow-400"
                        />
                        <button 
                          type="button"
                          onClick={addRule}
                          className="w-12 h-12 mycond-bg-blue text-white rounded-xl flex items-center justify-center hover:bg-slate-800"
                        >
                          <i className="fa-solid fa-plus"></i>
                        </button>
                     </div>
                     <div className="space-y-2">
                        {selectedArea.rules.map((rule, idx) => (
                          <div key={idx} className="flex items-center justify-between bg-slate-50 px-4 py-2 rounded-xl border border-slate-100">
                             <span className="text-[11px] font-bold text-slate-600">{rule}</span>
                             <button type="button" onClick={() => removeRule(idx)} className="text-red-400 hover:text-red-600 transition-colors">
                               <i className="fa-solid fa-circle-xmark"></i>
                             </button>
                          </div>
                        ))}
                     </div>
                  </div>
                  
                  <div className="flex gap-4 pt-6">
                     <button type="button" onClick={() => setIsEditing(false)} className="flex-1 py-5 border-2 border-slate-100 text-slate-400 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-50 transition-all">Descartar</button>
                     <button type="submit" className="flex-1 py-5 mycond-bg-blue text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-2xl shadow-blue-500/20 hover:bg-slate-800 transition-all">Salvar Alterações</button>
                  </div>
              </form>
           </div>
        </div>
      )}

      {/* --- MODAL DE REGISTRO DE NOVA ÁREA (CADASTRO ADMINISTRATIVO) --- */}
      {isCreatingArea && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-2xl animate-in fade-in duration-300" onClick={() => setIsCreatingArea(false)}></div>
           <div className="relative bg-white w-full max-w-xl rounded-[3rem] shadow-2xl p-10 animate-in zoom-in-95 duration-400 max-h-[90vh] overflow-y-auto scrollbar-hide">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-3xl font-black text-slate-900 uppercase tracking-tighter mb-2">Novo Espaço</h3>
                  <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em] mb-4">Cadastre uma nova área comum.</p>
                </div>
                <button 
                  type="button"
                  onClick={triggerPhotoUpload} 
                  className={`w-16 h-16 rounded-2xl shadow-lg flex items-center justify-center transition-all ${newAreaData.image && !newAreaData.image.includes('unsplash') ? 'bg-emerald-100 text-emerald-600 ring-2 ring-emerald-500' : 'bg-yellow-400 text-slate-900'}`}
                >
                  <i className="fa-solid fa-camera text-xl"></i>
                </button>
                <input type="file" ref={photoInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
              </div>

              <form onSubmit={handleRegisterNewArea} className="space-y-6">
                  <div className="space-y-2">
                     <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome da Área</label>
                     <input 
                       required
                       type="text" 
                       value={newAreaData.name}
                       placeholder="Ex: Espaço Gourmet Prime"
                       onChange={(e) => setNewAreaData({...newAreaData, name: e.target.value})}
                       className="w-full bg-[#f8fafc] border-none rounded-2xl px-6 py-4 font-black text-slate-800 outline-none focus:ring-2 focus:ring-yellow-400 transition-all" 
                     />
                  </div>
                  <div className="grid grid-cols-2 gap-8">
                    <div className="space-y-2">
                       <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Capacidade (Pessoas)</label>
                       <input 
                         type="number" 
                         value={newAreaData.capacity}
                         onChange={(e) => setNewAreaData({...newAreaData, capacity: parseInt(e.target.value) || 0})}
                         className="w-full bg-[#f8fafc] border-none rounded-2xl px-6 py-4 font-black text-slate-800 outline-none focus:ring-2 focus:ring-yellow-400 transition-all" 
                       />
                    </div>
                    <div className="space-y-2">
                       <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Taxa de Uso (R$)</label>
                       <input 
                         type="number" 
                         value={newAreaData.tax}
                         onChange={(e) => setNewAreaData({...newAreaData, tax: parseFloat(e.target.value) || 0})}
                         className="w-full bg-[#f8fafc] border-none rounded-2xl px-6 py-4 font-black text-slate-800 outline-none focus:ring-2 focus:ring-yellow-400 transition-all" 
                       />
                    </div>
                  </div>
                  <div className="space-y-2">
                     <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Descrição das Facilidades</label>
                     <textarea 
                       required
                       value={newAreaData.description}
                       placeholder="Descreva o que o espaço oferece..."
                       onChange={(e) => setNewAreaData({...newAreaData, description: e.target.value})}
                       rows={3}
                       className="w-full bg-[#f8fafc] border-none rounded-2xl px-6 py-4 font-black text-slate-800 outline-none focus:ring-2 focus:ring-yellow-400 transition-all resize-none" 
                     />
                  </div>

                  {/* Seção de Regras de Uso no Cadastro */}
                  <div className="space-y-4">
                     <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Regras de Uso</label>
                     <div className="flex gap-2">
                        <input 
                          type="text"
                          placeholder="Adicionar nova regra (Ex: Proibido animais)..."
                          value={currentRuleInput}
                          onChange={(e) => setCurrentRuleInput(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addRule())}
                          className="flex-1 bg-[#f8fafc] border-none rounded-xl px-4 py-3 font-bold text-xs text-slate-700 outline-none focus:ring-2 focus:ring-yellow-400"
                        />
                        <button 
                          type="button"
                          onClick={addRule}
                          className="w-12 h-12 mycond-bg-blue text-white rounded-xl flex items-center justify-center hover:bg-slate-800"
                        >
                          <i className="fa-solid fa-plus"></i>
                        </button>
                     </div>
                     <div className="space-y-2 max-h-40 overflow-y-auto scrollbar-hide">
                        {newAreaData.rules && newAreaData.rules.map((rule, idx) => (
                          <div key={idx} className="flex items-center justify-between bg-slate-50 px-4 py-2 rounded-xl border border-slate-100">
                             <span className="text-[11px] font-bold text-slate-600">{rule}</span>
                             <button type="button" onClick={() => removeRule(idx)} className="text-red-400 hover:text-red-600 transition-colors">
                               <i className="fa-solid fa-circle-xmark"></i>
                             </button>
                          </div>
                        ))}
                     </div>
                  </div>
                  
                  <div className="flex gap-4 pt-4">
                     <button type="button" onClick={() => setIsCreatingArea(false)} className="flex-1 py-5 border-2 border-slate-100 text-slate-400 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-50 transition-all">Cancelar</button>
                     <button type="submit" className="flex-1 py-5 mycond-bg-blue text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-2xl shadow-blue-500/20 hover:bg-slate-800 transition-all">Concluir Registro</button>
                  </div>
              </form>
           </div>
        </div>
      )}
    </div>
  );
};

export default Reservas;
