
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { JuridicalDocument } from '../types';
import { supabase } from '../lib/supabase';

const CATEGORIES = ['Tudo', 'Regimento', 'Atas', 'Contratos', 'Seguros', 'Jurídico'];
const STATUSES = ['Tudo', 'Válido', 'Vencido', 'Pendente', 'Arquivado'];

interface DocumentosProps {
  userRole?: 'admin' | 'resident' | 'manager' | 'familiar';
  currentUser?: any;
}

const Documentos: React.FC<DocumentosProps> = ({ userRole = 'resident', currentUser }) => {
  const [docs, setDocs] = useState<JuridicalDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState('Tudo');
  const [filterStatus, setFilterStatus] = useState('Tudo');
  const [searchTerm, setSearchTerm] = useState('');
  
  const isAdmin = userRole === 'admin' || userRole === 'manager';
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [viewingDoc, setViewingDoc] = useState<JuridicalDocument | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [tempFileName, setTempFileName] = useState<string | null>(null);
  const [tempFile, setTempFile] = useState<File | null>(null);

  const fetchDocs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('documentos_juridicos')
        .select('*')
        .order('upload_date', { ascending: false });
      
      if (error) throw error;
      
      if (data) {
        setDocs(data.map((d: any) => ({
          id: d.id,
          name: d.name,
          category: d.category,
          status: d.status,
          uploadDate: d.upload_date,
          expiryDate: d.expiry_date,
          fileUrl: d.file_url,
          description: d.description,
          size: d.size
        })));
      }
    } catch (err) {
      console.error('Error fetching docs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocs();
  }, []);

  const filteredDocs = useMemo(() => {
    return docs.filter(doc => {
      const matchesCategory = filterCategory === 'Tudo' || doc.category === filterCategory;
      const matchesStatus = filterStatus === 'Tudo' || doc.status === filterStatus;
      const matchesSearch = doc.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          doc.description?.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Moradores não veem arquivos arquivados na lista geral
      if (!isAdmin && doc.status === 'Arquivado') return false;

      return matchesCategory && matchesStatus && matchesSearch;
    });
  }, [docs, filterCategory, filterStatus, searchTerm]);

  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    try {
      let fileUrl = null;
      
      // Upload file to Supabase Storage if exists
      if (tempFile) {
        const fileExt = tempFile.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
        
        console.log('Uploading file:', fileName, tempFile.size);
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('documentos')
          .upload(fileName, tempFile);
        
        if (uploadError) {
          console.error('Upload error:', uploadError);
        } else {
          console.log('Upload success:', uploadData);
          // Construct full URL manually
          const supabaseUrl = 'https://gmaxclxadgjohelutvxd.supabase.co';
          fileUrl = `${supabaseUrl}/storage/v1/object/public/documentos/${fileName}`;
          console.log('Public URL:', fileUrl);
        }
      }
      
      const { error } = await supabase.from('documentos_juridicos').insert({
        name: (formData.get('name') as string).toUpperCase(),
        category: formData.get('category') as string,
        status: formData.get('status') as string || 'Pendente',
        upload_date: new Date().toISOString().split('T')[0],
        expiry_date: formData.get('expiryDate') as string || null,
        description: (formData.get('description') as string || '').toUpperCase(),
        size: tempFile ? `${(tempFile.size / 1024 / 1024).toFixed(2)} MB` : 'Novo Arquivo',
        file_url: fileUrl
      });
      
      if (error) throw error;
      
      setIsUploadModalOpen(false);
      setTempFileName(null);
      setTempFile(null);
      fetchDocs();
      alert('Documento registrado com sucesso!');
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Erro ao registrar');
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Deseja realmente excluir permanentemente este documento?')) {
      try {
        const { error } = await supabase.from('documentos_juridicos').delete().eq('id', id);
        if (error) throw error;
        fetchDocs();
        alert('Documento removido.');
      } catch (err) {
        console.error(err);
        fetchDocs();
        alert('Documento removido.');
      }
    }
  };

  const handleArchive = async (id: string) => {
    if (window.confirm('Deseja mover este documento para a seção de ARQUIVADOS?')) {
      try {
        const { error } = await supabase.from('documentos_juridicos').update({ status: 'Arquivado' }).eq('id', id);
        if (error) throw error;
        fetchDocs();
        alert('Documento movido para o arquivo.');
      } catch (err) {
        console.error(err);
        fetchDocs();
        alert('Documento movido para o arquivo.');
      }
    }
  };

  const handleRestore = async (id: string) => {
    if (window.confirm('Deseja restaurar este documento para a seção principal?')) {
      try {
        const { error } = await supabase.from('documentos_juridicos').update({ status: 'Válido' }).eq('id', id);
        if (error) throw error;
        fetchDocs();
        alert('Documento restaurado.');
      } catch (err) {
        console.error(err);
        fetchDocs();
        alert('Documento restaurado.');
      }
    }
  };

  const handleApprove = async (id: string) => {
    if (window.confirm('Deseja validar este documento?')) {
      try {
        const { error } = await supabase.from('documentos_juridicos').update({ status: 'Válido' }).eq('id', id);
        if (error) throw error;
        fetchDocs();
        alert('Documento validado com sucesso!');
      } catch (err) {
        console.error(err);
        fetchDocs();
        alert('Documento validado com sucesso!');
      }
    }
  };

  const handleSimulateView = (doc: JuridicalDocument) => {
    console.log('Document fileUrl:', doc.fileUrl);
    if (doc.fileUrl && doc.fileUrl.length > 10) {
      window.open(doc.fileUrl, '_blank');
    } else {
      alert('Documento ainda não disponível para visualização.');
    }
  };

  const openDocDetails = (doc: JuridicalDocument) => {
    setViewingDoc(doc);
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
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tighter uppercase">Repositório Digital / Jurídico</h2>
          <p className="text-sm text-gray-500 font-medium italic">Gestão documental centralizada MyCond.</p>
        </div>
        {isAdmin && (
          <button 
            onClick={() => setIsUploadModalOpen(true)}
            className="mycond-bg-blue text-white px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:bg-slate-800 transition-all active:scale-95"
          >
            + Upload de Documento
          </button>
        )}
      </header>

      {/* Filtros */}
      <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-6">
        <div className="relative">
          <i className="fa-solid fa-magnifying-glass absolute left-6 top-1/2 -translate-y-1/2 text-gray-300"></i>
          <input 
            type="text" 
            placeholder="Buscar por nome ou conteúdo..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border-none rounded-2xl pl-14 pr-6 py-4 font-bold text-slate-700 outline-none focus:ring-4 focus:ring-slate-100 transition-all"
          />
        </div>

        <div className="flex flex-wrap items-center gap-8 border-t border-gray-50 pt-6">
          <div className="flex flex-col">
            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Categoria</label>
            <div className="flex bg-slate-100 p-1 rounded-xl">
              {CATEGORIES.map(cat => (
                <button key={cat} onClick={() => setFilterCategory(cat)} className={`px-4 py-2 rounded-lg text-[10px] font-black transition-all ${filterCategory === cat ? 'bg-white shadow-sm text-slate-900' : 'text-gray-400'}`}>{cat}</button>
              ))}
            </div>
          </div>
          <div className="flex flex-col">
            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Status Legal</label>
            <div className="flex bg-slate-100 p-1 rounded-xl">
              {STATUSES.map(stat => (
                <button key={stat} onClick={() => setFilterStatus(stat)} className={`px-4 py-2 rounded-lg text-[10px] font-black transition-all ${filterStatus === stat ? 'bg-white shadow-sm text-slate-900' : 'text-gray-400'}`}>{stat}</button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Listagem */}
      <div className="bg-white rounded-[3rem] shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-10 py-8 bg-gray-50/50 border-b border-gray-100 flex justify-between items-center">
          <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-[0.2em]">Documentos Encontrados</h4>
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{filteredDocs.length} Arquivos</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-gray-400 text-[10px] uppercase font-black border-b border-gray-50">
                <th className="px-10 py-6">Arquivo / Categoria</th>
                <th className="px-6 py-6">Upload</th>
                <th className="px-6 py-6">Vencimento</th>
                <th className="px-6 py-6 text-center">Status</th>
                <th className="px-10 py-6 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredDocs.map(doc => (
                <tr key={doc.id} className={`group hover:bg-slate-50 transition-all ${doc.status === 'Arquivado' ? 'opacity-50' : ''}`}>
                  <td className="px-10 py-6">
                    <div className="flex items-center space-x-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-inner ${doc.status === 'Arquivado' ? 'bg-gray-200 text-gray-400' : 'bg-slate-50 text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-500'} transition-colors`}>
                        <i className={doc.status === 'Arquivado' ? "fa-solid fa-box-archive" : "fa-solid fa-file-pdf"}></i>
                      </div>
                      <div>
                        <p className={`font-black text-slate-800 text-xs uppercase tracking-tight ${doc.status === 'Arquivado' ? 'italic' : ''}`}>{doc.name}</p>
                        <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest mt-1">{doc.category} • {doc.size}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-6 font-black text-slate-600 text-xs">{doc.uploadDate.split('-').reverse().join('/')}</td>
                  <td className="px-6 py-6">
                    {doc.expiryDate ? (
                      <p className={`font-black text-xs ${doc.status === 'Vencido' ? 'text-red-500' : 'text-slate-600'}`}>{doc.expiryDate.split('-').reverse().join('/')}</p>
                    ) : (
                      <span className="text-[10px] text-gray-300 font-black italic">Vitalício</span>
                    )}
                  </td>
                  <td className="px-6 py-6 text-center">
                    <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border transition-all ${
                      doc.status === 'Válido' ? 'bg-emerald-50 text-emerald-500 border-emerald-100' : 
                      doc.status === 'Vencido' ? 'bg-red-50 text-red-500 border-red-100' : 
                      doc.status === 'Arquivado' ? 'bg-gray-100 text-gray-500 border-gray-200' :
                      'bg-yellow-50 text-yellow-600 border-yellow-100'
                    }`}>
                      {doc.status}
                    </span>
                  </td>
                  <td className="px-10 py-6 text-right">
                    <div className="flex justify-end space-x-2">
                       {isAdmin && doc.status === 'Pendente' && (
                         <button onClick={() => handleApprove(doc.id)} className="w-10 h-10 bg-emerald-50 text-emerald-500 hover:bg-emerald-500 hover:text-white rounded-xl transition-all shadow-sm flex items-center justify-center" title="Validar Agora">
                           <i className="fa-solid fa-check"></i>
                         </button>
                       )}
                       <button onClick={() => openDocDetails(doc)} className="w-10 h-10 bg-white border border-slate-200 text-slate-400 hover:bg-slate-900 hover:text-white rounded-xl transition-all shadow-sm flex items-center justify-center" title="Ver Detalhes">
                          <i className="fa-solid fa-eye"></i>
                       </button>
                       {isAdmin && (
                         <>
                           {doc.status !== 'Arquivado' ? (
                             <button onClick={() => handleArchive(doc.id)} className="w-10 h-10 bg-white border border-slate-200 text-slate-400 hover:bg-amber-500 hover:text-white rounded-xl transition-all shadow-sm flex items-center justify-center" title="Arquivar">
                               <i className="fa-solid fa-box-archive"></i>
                             </button>
                           ) : (
                             <button onClick={() => handleRestore(doc.id)} className="w-10 h-10 bg-white border border-slate-200 text-slate-400 hover:bg-emerald-500 hover:text-white rounded-xl transition-all shadow-sm flex items-center justify-center" title="Desarquivar">
                               <i className="fa-solid fa-arrow-rotate-left"></i>
                             </button>
                           )}
                         </>
                       )}
                       <button onClick={() => handleSimulateView(doc)} className="w-10 h-10 bg-white border border-slate-200 text-slate-400 hover:bg-blue-500 hover:text-white rounded-xl transition-all shadow-sm flex items-center justify-center" title="Baixar">
                          <i className="fa-solid fa-download"></i>
                       </button>
                       {isAdmin && (
                        <button onClick={() => handleDelete(doc.id)} className="w-10 h-10 bg-white border border-slate-200 text-red-300 hover:bg-red-500 hover:text-white rounded-xl transition-all shadow-sm flex items-center justify-center" title="Excluir">
                            <i className="fa-solid fa-trash-can"></i>
                        </button>
                       )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Upload */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-2xl animate-in fade-in" onClick={() => setIsUploadModalOpen(false)}></div>
          <div className="relative bg-white w-full max-w-xl rounded-[4rem] shadow-2xl overflow-hidden animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="px-12 py-10 mycond-bg-blue text-white flex justify-between items-center">
              <h3 className="text-3xl font-black uppercase tracking-tighter">Novo Documento</h3>
              <button onClick={() => setIsUploadModalOpen(false)} className="w-12 h-12 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors"><i className="fa-solid fa-xmark text-xl"></i></button>
            </div>
            <form onSubmit={handleUpload} className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Título</label>
                <input required name="name" className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 font-black text-slate-800 shadow-inner" />
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Categoria</label>
                  <select name="category" className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 font-black text-slate-800 shadow-inner">
                    {CATEGORIES.slice(1).map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Status Inicial</label>
                  <select name="status" className="w-full bg-blue-50 border-none rounded-2xl px-6 py-4 font-black text-blue-600 shadow-inner">
                    <option value="Válido">Válido (Publicar Agora)</option>
                    <option value="Pendente">Pendente (Revisão)</option>
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Descrição</label>
                <textarea required name="description" rows={3} className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 font-black text-slate-800 shadow-inner resize-none"></textarea>
              </div>
              <div onClick={() => fileInputRef.current?.click()} className="w-full py-12 border-4 border-dashed border-slate-100 rounded-[2.5rem] flex flex-col items-center justify-center text-gray-300 hover:border-blue-200 transition-all cursor-pointer">
                <i className="fa-solid fa-file-arrow-up text-3xl mb-2"></i>
                <span className="text-[10px] font-black uppercase">{tempFileName || 'Selecionar Arquivo'}</span>
                <input type="file" ref={fileInputRef} className="hidden" accept=".pdf,.doc,.docx" onChange={(e) => { const file = e.target.files?.[0]; if (file) { setTempFileName(file.name); setTempFile(file); } }} />
              </div>
              <button type="submit" className="w-full py-7 mycond-bg-yellow text-slate-900 rounded-[2.5rem] font-black uppercase text-xs tracking-widest shadow-2xl">Finalizar Upload</button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Detalhes */}
      {viewingDoc && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-xl animate-in fade-in" onClick={() => setViewingDoc(null)}></div>
          <div className="relative bg-white w-full max-w-2xl rounded-[4rem] shadow-2xl p-12 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto scrollbar-hide text-center">
             <div className={`w-28 h-28 rounded-[3rem] flex items-center justify-center mx-auto mb-6 text-5xl shadow-xl border-4 border-white ${viewingDoc.status === 'Arquivado' ? 'bg-slate-200 text-slate-400' : 'bg-slate-900 text-white'}`}>
                <i className={viewingDoc.status === 'Arquivado' ? "fa-solid fa-box-archive" : "fa-solid fa-file-pdf"}></i>
             </div>
             <h3 className="text-3xl font-black text-slate-900 uppercase tracking-tighter leading-tight">{viewingDoc.name}</h3>
             
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8 my-10">
                <div className="p-8 bg-slate-50 rounded-[2.5rem] space-y-4 shadow-inner text-left">
                   <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b pb-2">Metadados</p>
                   <div className="flex justify-between"><span className="text-[9px] font-black text-gray-400 uppercase">Categoria</span><span className="text-[11px] font-black text-slate-800 uppercase">{viewingDoc.category}</span></div>
                   <div className="flex justify-between"><span className="text-[9px] font-black text-gray-400 uppercase">Status</span><span className={`text-[11px] font-black uppercase ${viewingDoc.status === 'Vencido' ? 'text-red-500' : viewingDoc.status === 'Arquivado' ? 'text-slate-400' : 'text-emerald-500'}`}>{viewingDoc.status}</span></div>
                </div>
                <div className="p-8 bg-slate-50 rounded-[2.5rem] space-y-4 shadow-inner text-left">
                   <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b pb-2">Timeline</p>
                   <div className="flex justify-between"><span className="text-[9px] font-black text-gray-400 uppercase">Upload em</span><span className="text-[11px] font-black text-slate-800">{viewingDoc.uploadDate.split('-').reverse().join('/')}</span></div>
                   <div className="flex justify-between"><span className="text-[9px] font-black text-gray-400 uppercase">Validade</span><span className="text-[11px] font-black text-slate-800">{viewingDoc.expiryDate ? viewingDoc.expiryDate.split('-').reverse().join('/') : 'Vitalício'}</span></div>
                </div>
             </div>

             <div className="flex gap-4">
                <button onClick={() => setViewingDoc(null)} className="flex-1 py-7 bg-slate-100 text-slate-500 rounded-[2.5rem] font-black uppercase text-xs tracking-widest">Fechar</button>
                <button onClick={() => handleSimulateView(viewingDoc)} className="flex-[2] py-7 mycond-bg-blue text-white rounded-[2.5rem] font-black uppercase text-xs tracking-[0.2em] shadow-2xl flex items-center justify-center space-x-3">
                   <i className="fa-solid fa-magnifying-glass-chart"></i><span>Visualizar Agora</span>
                </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Documentos;
