
import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Encomendas from './components/Encomendas';
import Reservas from './components/Reservas';
import Visitantes from './components/Visitantes';
import Ocorrencias from './components/Ocorrencias';
import Manutencao from './components/Manutencao';
import Equipe from './components/Equipe';
import Assembleias from './components/Assembleias';
import Financeiro from './components/Financeiro';
import Moradores from './components/Moradores';
import Documentos from './components/Documentos';
import ManualSindico from './components/ManualSindico';
import ChatBot from './components/ChatBot';
import Login from './components/Login';
import MeuPerfil from './components/MeuPerfil';
import InviteUsers from './components/InviteUsers';
import { View, User } from './types';
import { supabase } from './lib/supabase';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null); // null = carregando
  const [activeView, setActiveView] = useState<View>(View.DASHBOARD);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  React.useEffect(() => {
    // Busca a sessão inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      handleSession(session);
    });

    // Escuta mudanças (login, logout, registro)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      handleSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSession = async (session: any) => {
    if (session) {
      // Busca os detalhes extras na tabela profiles
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (error) {
         console.error('Erro ao buscar perfil:', error);
         // Se der erro de autenticação ou perfil não existir, limpa a sessão e manda pro login
         await supabase.auth.signOut();
         setIsAuthenticated(false);
         setCurrentUser(null);
         return;
      }

      if (profile) {
        setCurrentUser({
          id: session.user.id,
          name: profile.name || 'Usuário',
          unit: profile.unit || '---',
          role: profile.role || 'resident',
          avatar: profile.photo_url || `https://ui-avatars.com/api/?name=${profile.name}`,
          can_invite: profile.can_invite || false
        });
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
      }
    } else {
      setIsAuthenticated(false);
      setCurrentUser(null);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const renderContent = () => {
    if (!currentUser) return null;
    const isResident = currentUser.role === 'resident';
    const isManager = currentUser.role === 'manager';

    // Se resident tentar acessar DASHBOARD via URL, redireciona para votacao
    if (activeView === View.DASHBOARD && isResident) {
      return <Assembleias userRole={currentUser.role} currentUser={currentUser} />;
    }

    switch (activeView) {
      case View.DASHBOARD: return <Dashboard />;
      case View.ENCOMENDAS: return <Encomendas />;
      case View.RESERVAS: return <Reservas userRole={currentUser.role} currentUser={currentUser} />;
      case View.VISITANTES: 
        if (isResident) return <Visitantes userRole={currentUser.role} currentUser={currentUser} />;
        return <Visitantes userRole={currentUser.role} currentUser={currentUser} />;
      case View.OCORRENCIA: 
      case View.OCORRENCIAS: return <Ocorrencias userRole={currentUser.role} currentUser={currentUser} />;
      case View.MANUTENCAO: 
        if (isResident) return <Dashboard />;
        return <Manutencao />;
      case View.EQUIPE: 
        if (isResident || isManager) return <Dashboard />;
        return <Equipe />;
      case View.VOTACAO: return <Assembleias userRole={currentUser.role} currentUser={currentUser} />;
      case View.FINANCEIRO: 
        if (isResident || isManager) return <Dashboard />;
        return <Financeiro userRole={currentUser.role} currentUser={currentUser} />;
      case View.MORADORES: 
        if (isResident) return <Dashboard />;
        return <Moradores />;
      case View.DOCUMENTOS: 
        if (isResident || isManager) return <Dashboard />;
        return <Documentos />;
      case View.MANUAL_SINDICO:
        if (currentUser.role === 'resident') return <Assembleias userRole={currentUser.role} currentUser={currentUser} />;
        return <ManualSindico 
          onNavigate={setActiveView} 
          isAdmin={currentUser.role === 'admin'}
          currentUser={currentUser}
        />;
      case View.CONVIDAR_USUARIOS:
        if (currentUser.role !== 'admin') return <Dashboard />;
        return <InviteUsers currentUser={currentUser} />;
      case View.MEU_PERFIL:
        return <MeuPerfil currentUser={currentUser} />;
      default:
        return <Dashboard />;
    }
  };

  if (isAuthenticated === null) {
    return <div className="min-h-screen flex text-white bg-black items-center justify-center font-black">Carregando...</div>;
  }

  if (!isAuthenticated || !currentUser) {
    return <Login />;
  }

  return (
    <div className="flex min-h-screen bg-[#f8fafc]">
      <Sidebar 
        activeView={activeView} 
        onViewChange={setActiveView} 
        currentUser={currentUser} 
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />
      
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <header className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-6 flex-shrink-0 z-10">
          <div className="flex items-center space-x-4">
            <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="md:hidden text-slate-900 text-xl p-2 hover:bg-gray-100 rounded"><i className="fa-solid fa-bars"></i></button>
            <div className="hidden md:flex items-center space-x-2 text-gray-400">
                <span className="text-xs uppercase font-bold">Condomínio Modelo</span>
                <i className="fa-solid fa-chevron-right text-[10px]"></i>
                <span className="text-xs uppercase font-bold text-slate-900">{activeView}</span>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <button className="relative p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors"><i className="fa-solid fa-bell"></i><span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span></button>
            
            <div className="hidden sm:flex items-center space-x-3">
                <div className="text-right cursor-pointer group" onClick={() => setActiveView(View.MEU_PERFIL)}>
                  <p className="text-[10px] font-black text-slate-800 leading-none uppercase group-hover:text-yellow-600 transition-colors">{currentUser.name}</p>
                  <p className="text-[8px] text-gray-400 font-bold uppercase mt-1">{currentUser.role === 'admin' ? 'Admin' : currentUser.role === 'manager' ? 'Zelador' : 'Morador'}</p>
                </div>
                <button 
                  onClick={handleLogout}
                  className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center text-yellow-400 font-bold text-xs shadow-sm uppercase hover:bg-red-500 hover:text-white transition-all group"
                  title="Sair do Sistema"
                >
                  <i className="fa-solid fa-power-off group-hover:scale-110 transition-transform"></i>
                </button>
            </div>
          </div>
        </header>
        
        <div className="flex-1 overflow-y-auto p-4 md:p-8 scrollbar-hide">
          <div className="max-w-7xl mx-auto">{renderContent()}</div>
        </div>
        
        <ChatBot />
      </main>
    </div>
  );
};

export default App;
