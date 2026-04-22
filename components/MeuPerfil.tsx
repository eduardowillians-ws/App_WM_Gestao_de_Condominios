import React, { useState, useRef } from 'react';
import { supabase } from '../lib/supabase';

interface MeuPerfilProps {
  currentUser: {
    id: string;
    name: string;
    unit: string;
    role: string;
    avatar: string;
    can_invite?: boolean | null;
  };
}

const MeuPerfil: React.FC<MeuPerfilProps> = ({ currentUser }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [photo, setPhoto] = useState(currentUser.avatar);
  const [password, setPassword] = useState('');
  
  // Dados de formulario
  const [name, setName] = useState(currentUser.name);
  const [cpf, setCpf] = useState('');
  const [rg, setRg] = useState('');
  const [phone, setPhone] = useState('');
  const [profession, setProfession] = useState('');

  // Dados para Convite Familiar
  const [famName, setFamName] = useState('');
  const [famEmail, setFamEmail] = useState('');
  const [famPhone, setFamPhone] = useState('');
  const [isInvitingFam, setIsInvitingFam] = useState(false);
  const [lastCreatedDependent, setLastCreatedDependent] = useState<any>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);

  const photoInputRef = useRef<HTMLInputElement>(null);

  const applyCPFMask = (v: string) => v.replace(/\D/g, '').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  const applyRGMask = (v: string) => v.replace(/\D/g, '').replace(/(\d{2})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  const applyPhoneMask = (v: string) => v.replace(/\D/g, '').replace(/^(\d{2})(\d)/g, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2');

  const capitalizeFirstLetter = (string: string) => {
    return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
  };

  const PROFESSIONS = ['Engenheiro(a)', 'Arquiteto(a)', 'Advogado(a)', 'Médico(a)', 'Autônomo(a)', 'Empresário(a)', 'Professor(a)', 'Designer', 'Desenvolvedor(a)', 'Aposentado(a)'];

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setPhoto(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (password.trim() !== '') {
        const { error: pwdError } = await supabase.auth.updateUser({ password });
        if (pwdError) throw new Error("Erro ao atualizar senha: " + pwdError.message);
      }

      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          name,
          cpf,
          rg,
          phone,
          profession,
          photo_url: photo !== currentUser.avatar ? photo : undefined,
        })
        .eq('id', currentUser.id);

      if (profileError) throw profileError;

      alert('Perfil atualizado com sucesso!');
      window.location.reload();
      
    } catch (error: any) {
      console.error(error);
      alert(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInviteDependent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!famName || !famEmail || !famPhone) {
      return setInviteError("Preencha nome, e-mail e WhatsApp.");
    }

    setIsInvitingFam(true);
    setInviteError(null);
    setLastCreatedDependent(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('invite_resident', {
        body: { 
          email: famEmail, 
          name: famName, 
          phone: famPhone, 
          unit: currentUser.unit 
        }
      });
      
      if (error) throw new Error(error.message || 'Erro de conexão.');
      if (data && data.success === false) throw new Error(data.error);

      // Limpa campos ANTES de setar o dependente para garantir renderização limpa
      setFamName('');
      setFamEmail('');
      setFamPhone('');
      
      setLastCreatedDependent(data.data);
    } catch (error: any) {
      console.error(error);
      setInviteError(error.message || 'Erro desconhecido.');
    } finally {
      setIsInvitingFam(false);
    }
  };

  const handleShareWhatsAppDependent = () => {
    if (!lastCreatedDependent) return;
    const cleanPhone = lastCreatedDependent.phone?.replace(/\D/g, '') || '';
    const msg = `*Bem-vindo ao Condomínio WM Gestão!*%0A%0ASeu acesso já está pronto!%0A%0A*Perfil:* Familiar / Dependente%0A*Login (E-mail):* ${lastCreatedDependent.email}%0A*Senha Temporária:* ${lastCreatedDependent.tempPassword}%0A%0A*Acesse por aqui:* ${window.location.origin}%0A%0A_Recomendamos alterar sua senha após o primeiro acesso._`;
    const waUrl = cleanPhone ? `https://wa.me/55${cleanPhone}?text=${msg}` : `https://web.whatsapp.com/send?text=${msg}`;
    window.open(waUrl, '_blank');
  };

  const resetDependentForm = () => {
    setLastCreatedDependent(null);
    setInviteError(null);
    setFamName('');
    setFamEmail('');
    setFamPhone('');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tighter uppercase">Meu Perfil</h2>
          <p className="text-sm text-gray-500 font-medium">Gerencie suas informações pessoais e de acesso</p>
        </div>
      </header>

      <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-gray-100 max-w-4xl mx-auto">
        <form onSubmit={handleSave} className="space-y-8">
          <div className="flex flex-col items-center mb-8 pb-8 border-b border-gray-50">
            <div 
              onClick={() => photoInputRef.current?.click()}
              className="w-32 h-32 bg-slate-50 border-4 border-dashed border-gray-100 rounded-full flex items-center justify-center overflow-hidden cursor-pointer hover:border-yellow-400 transition-all group shadow-inner relative"
            >
              {photo ? (
                <img src={photo} className="w-full h-full object-cover" alt="Foto" />
              ) : (
                <div className="text-center text-gray-300 group-hover:scale-110 transition-transform">
                  <i className="fa-solid fa-camera text-2xl mb-1"></i>
                  <p className="text-[9px] font-black uppercase">Subir Foto</p>
                </div>
              )}
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                 <i className="fa-solid fa-pen text-white"></i>
              </div>
            </div>
            <input type="file" ref={photoInputRef} onChange={handlePhotoUpload} className="hidden" accept="image/*" />
            <h3 className="text-xl font-black text-slate-800 uppercase mt-4 tracking-tight">{name}</h3>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Unidade {currentUser.unit}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6 bg-slate-50 p-8 rounded-[2rem] shadow-inner">
               <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-4 flex items-center"><i className="fa-solid fa-lock text-yellow-400 mr-2"></i> Segurança de Acesso</h4>
               <div className="space-y-2">
                 <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">E-mail (Acesso)</label>
                 <input className="w-full bg-slate-200 border-none rounded-2xl px-6 py-4 font-black text-slate-500 shadow-inner cursor-not-allowed opacity-70" value="Gerenciado pelo Condomínio" disabled />
               </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Alterar Senha</label>
                  <input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-white border-none rounded-2xl px-6 py-4 font-black text-slate-800 shadow-sm" />
                </div>
            </div>

            <div className="space-y-6 bg-slate-50 p-8 rounded-[2rem] shadow-inner">
              <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-4 flex items-center"><i className="fa-solid fa-address-card text-yellow-400 mr-2"></i> Dados Pessoais</h4>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Nome Completo</label>
                <input required value={name} onChange={(e)=>setName(e.target.value)} className="w-full bg-white border-none rounded-2xl px-6 py-4 font-black text-slate-800 shadow-sm" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Telefone</label>
                  <input required value={phone} onChange={(e)=>setPhone(applyPhoneMask(e.target.value))} placeholder="(11) 90000-0000" className="w-full bg-white border-none rounded-2xl px-6 py-4 font-black text-slate-800 shadow-sm" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Profissão</label>
                  <input list="prof-list" value={profession} onChange={(e)=>setProfession(capitalizeFirstLetter(e.target.value))} placeholder="Sua profisssão" className="w-full bg-white border-none rounded-2xl px-6 py-4 font-black text-slate-800 shadow-sm" />
                  <datalist id="prof-list">{PROFESSIONS.map(p => <option key={p} value={p} />)}</datalist>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <button type="submit" disabled={isLoading} className="bg-slate-900 text-white px-10 py-5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-slate-800 transition-all flex items-center space-x-2">
              {isLoading ? 'Salvando...' : (<><span>Salvar Alterações</span><i className="fa-solid fa-check"></i></>)}
            </button>
          </div>
        </form>

        {(currentUser.role === 'admin' || currentUser.role === 'manager' || currentUser.role === 'resident' || currentUser.can_invite) && (
          <div className="bg-yellow-50 p-8 rounded-[2rem] border border-yellow-100 mt-12 shadow-inner">
            <div className="flex items-start space-x-4 mb-6">
                <div className="w-12 h-12 bg-yellow-400 rounded-2xl flex items-center justify-center text-slate-800 shadow-lg">
                    <i className="fa-solid fa-users text-xl"></i>
                </div>
                <div>
                    <h5 className="font-black text-xl text-yellow-900 uppercase tracking-tighter">Dependentes e Familiares</h5>
                    <p className="text-xs text-yellow-700 font-medium max-w-lg mt-1">Conceda acesso para membros da sua família. Eles herdarão a mesma Unidade.</p>
                </div>
            </div>

            {lastCreatedDependent ? (
              <div className="bg-white p-8 rounded-3xl border-2 border-emerald-100 animate-in zoom-in-95 space-y-6">
                <div className="flex items-center gap-4 text-emerald-600">
                    <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
                        <i className="fa-solid fa-check text-2xl"></i>
                    </div>
                    <div>
                        <h4 className="font-black text-lg uppercase tracking-tight">Acesso Pronto!</h4>
                        <p className="text-xs uppercase font-bold opacity-60">Compartilhe os dados abaixo</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-slate-50 p-5 rounded-2xl">
                        <span className="text-[9px] text-gray-400 uppercase font-black block mb-1">E-mail</span>
                        <span className="text-sm font-bold text-slate-700 font-mono">{lastCreatedDependent.email}</span>
                    </div>
                    <div className="bg-slate-50 p-5 rounded-2xl border-2 border-dashed border-emerald-200">
                        <span className="text-[9px] text-gray-400 uppercase font-black block mb-1">Senha Temporária</span>
                        <span className="text-xl font-black text-slate-800 tracking-widest uppercase">{lastCreatedDependent.tempPassword}</span>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row gap-4">
                    <button onClick={handleShareWhatsAppDependent} className="flex-1 bg-[#25D366] hover:bg-[#128C7E] text-white h-16 rounded-2xl font-black uppercase flex items-center justify-center gap-3 shadow-xl transition-all">
                        <i className="fa-brands fa-whatsapp text-2xl"></i> ENVIAR POR WHATSAPP
                    </button>
                    <button onClick={resetDependentForm} className="px-8 bg-slate-100 hover:bg-slate-200 text-slate-600 h-16 rounded-2xl font-black uppercase text-xs">
                        CADASTRAR OUTRO
                    </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleInviteDependent} className="bg-white p-8 rounded-3xl shadow-sm border border-yellow-50 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 block">Nome *</label>
                          <input value={famName} onChange={(e)=>setFamName(e.target.value)} required className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 font-black text-slate-800 shadow-inner outline-none focus:ring-2 focus:ring-yellow-400" placeholder="Nome Completo" />
                      </div>
                      <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 block">E-mail *</label>
                          <input type="email" value={famEmail} onChange={(e)=>setFamEmail(e.target.value)} required className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 font-black text-slate-800 shadow-inner outline-none focus:ring-2 focus:ring-yellow-400" placeholder="email@exemplo.com" />
                      </div>
                      <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 block">WhatsApp *</label>
                          <input type="tel" value={famPhone} onChange={(e)=>setFamPhone(e.target.value)} required className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 font-black text-slate-800 shadow-inner outline-none focus:ring-2 focus:ring-yellow-400" placeholder="11999998888" />
                      </div>
                  </div>
                  
                  {inviteError && (
                    <div className="p-4 bg-red-50 text-red-600 rounded-xl text-xs font-black uppercase border border-red-100 flex items-center gap-2">
                      <i className="fa-solid fa-triangle-exclamation"></i> {inviteError}
                    </div>
                  )}

                  <button disabled={isInvitingFam} type="submit" className="w-full h-16 bg-yellow-400 text-slate-900 hover:bg-yellow-500 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl transition-all flex items-center justify-center gap-3">
                      {isInvitingFam ? <><i className="fa-solid fa-circle-notch animate-spin"></i> CRIANDO ACESSO...</> : <><i className="fa-solid fa-user-plus"></i> CRIAR ACESSO AGORA</>}
                  </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MeuPerfil;
