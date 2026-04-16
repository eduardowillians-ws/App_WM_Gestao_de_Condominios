
import React from 'react';
import { View, User } from '../types';
import { MENU_ITEMS } from '../constants';

interface SidebarProps {
  activeView: View;
  onViewChange: (view: View) => void;
  currentUser: User;
}

const Sidebar: React.FC<SidebarProps> = ({ activeView, onViewChange, currentUser }) => {
  // Filtro de itens de menu baseado no Cargo (Role)
  const filteredMenuItems = MENU_ITEMS.filter(item => {
    if (currentUser.role === 'admin') return true;

    // Acesso do Morador (resident)
    if (currentUser.role === 'resident') {
      return [
        View.DASHBOARD,
        View.VOTACAO,
        View.ENCOMENDAS,
        View.RESERVAS,
        View.OCORRENCIAS,
        View.MANUAL_SINDICO // Morador pode ver as melhorias e transparência técnica
      ].includes(item.id);
    }

    // Acesso do Zelador (manager)
    if (currentUser.role === 'manager') {
      return [
        View.DASHBOARD,
        View.MORADORES,
        View.VISITANTES,
        View.OCORRENCIAS,
        View.RESERVAS,
        View.ENCOMENDAS,
        View.VOTACAO,
        View.MANUTENCAO,
        View.MANUAL_SINDICO
      ].includes(item.id);
    }

    return item.id === View.DASHBOARD; // Fallback
  });

  const getRoleLabel = () => {
    if (currentUser.role === 'admin') return 'ADMINISTRADOR';
    if (currentUser.role === 'manager') return 'ZELADOR / GESTOR';
    return 'MORADOR';
  };

  return (
    <aside className="w-64 bg-black min-h-screen hidden md:flex flex-col text-white shadow-2xl border-r border-white/5">
      <div className="p-8 flex flex-col items-center border-b border-white/5">
        <div className="w-14 h-14 mycond-bg-yellow rounded-2xl flex items-center justify-center mb-3 shadow-xl shadow-yellow-400/10">
            <span className="text-2xl font-bold text-black tracking-tighter">WM</span>
        </div>
        <h1 className="text-[10px] font-bold tracking-[0.2em] uppercase text-center text-white/90 leading-relaxed">
          WM Gestão de<br/>Condomínios
        </h1>
      </div>
      
      <nav className="flex-1 mt-6 px-4 overflow-y-auto scrollbar-hide">
        <ul className="space-y-1">
          {filteredMenuItems.map((item) => (
            <li key={item.id}>
              <button
                onClick={() => onViewChange(item.id)}
                className={`w-full flex items-center space-x-4 px-4 py-3.5 rounded-2xl transition-all duration-300 group ${
                  activeView === item.id 
                    ? 'mycond-bg-yellow text-black font-bold shadow-lg shadow-yellow-400/5' 
                    : 'text-gray-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                <span className={`w-5 flex justify-center text-lg transition-transform duration-300 ${activeView === item.id ? 'scale-110' : 'group-hover:scale-110 opacity-70 group-hover:opacity-100'}`}>
                  {item.icon}
                </span>
                <span className={`flex-1 text-[10px] font-bold uppercase tracking-wider text-left leading-tight`}>
                  {item.label}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <div className="p-4 border-t border-white/5">
        <div className="flex items-center space-x-3 p-3 bg-white/5 rounded-2xl border border-white/5">
          <div className="w-10 h-10 rounded-xl border-2 border-yellow-400 overflow-hidden bg-slate-900 shadow-lg">
            <img src={currentUser.avatar} alt="Avatar" className="w-full h-full object-cover" />
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-[10px] font-bold uppercase truncate tracking-tight text-white">{currentUser.name}</p>
            <p className="text-[8px] text-yellow-400 font-bold uppercase tracking-[0.2em]">{getRoleLabel()}</p>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
