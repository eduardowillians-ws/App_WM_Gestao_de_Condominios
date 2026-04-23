const fs = require('fs');

try {
  let oldCode = fs.readFileSync('tmp_old_moradores2.tsx', 'utf8');
  const currCode = fs.readFileSync('components/Moradores.tsx', 'utf8');

  // 1. Extrair fetchInvites useEffect
  const fetchInvitesMatch = currCode.match(/useEffect\(\(\) => \{\n\s*const fetchInvites[\s\S]*?fetchInvites\(\);\n\s*\}, \[\]\);/);

  // 2. Novos estados
  const newStates = `
  const [loading, setLoading] = useState(false);
  const [lastCreatedUser, setLastCreatedUser] = useState<any | null>(null);
  const [invites, setInvites] = useState<any[]>([]);
  const [showInvitesPanel, setShowInvitesPanel] = useState(false);
  const [formBlockId, setFormBlockId] = useState<string>('');
`;

  oldCode = oldCode.replace(/const \[activeMenu, setActiveMenu\] = useState<string \| null>\(null\);/, `const [activeMenu, setActiveMenu] = useState<string | null>(null);\n${newStates}`);

  // 3. Inserir fetchInvites
  if (fetchInvitesMatch) {
    oldCode = oldCode.replace(/fetchResidents\(\);\n\s*\}, \[\]\);/, `fetchResidents();\n  }, []);\n\n  ${fetchInvitesMatch[0]}`);
  }

  // 4. Extrair e substituir handleSaveResident
  const saveResMatch = currCode.match(/const handleSaveResident = async[\s\S]*?alert\('Erro: ' \+ err\.message\);\n\s*\} finally \{\n\s*setLoading\(false\);\n\s*\}\n\s*\};/s);
  if (saveResMatch) {
    oldCode = oldCode.replace(/const handleSaveResident = async \(e: React\.FormEvent<HTMLFormElement>\) => \{[\s\S]*?window.location.reload\(\);\n\s*\} catch \(error: any\) \{\n\s*console\.error\('Erro ao salvar morador:', error\);\n\s*alert\('Erro ao salvar morador: ' \+ error\.message\);\n\s*\}\n\s*\};/s, saveResMatch[0]);
  } else {
    console.log("saveResMatch not found");
  }

  // 5. Inserir WhatsApp funcs
  const shareWaMatch = currCode.match(/const handleShareWhatsApp = \(\) => \{[\s\S]*?\};\n/);
  const resendWaMatch = currCode.match(/const handleResendWhatsApp = [^}]+};\n/);
  const refreshInvitesMatch = currCode.match(/const refreshInvites = async \(\) => \{[\s\S]*?\};\n/);

  if (shareWaMatch) oldCode = oldCode.replace(/const closeModal = \(\) => \{/, `${shareWaMatch[0]}\n  const closeModal = () => {`);
  if (resendWaMatch && refreshInvitesMatch) {
    oldCode = oldCode.replace(/const handlePhotoUpload = /, `${resendWaMatch[0]}\n  ${refreshInvitesMatch[0]}\n  const handlePhotoUpload = `);
  }

  // closeModal update
  oldCode = oldCode.replace(/setTempPhoto\(null\);\n\s*setFormRG\(''\); setFormCPF\(''\); setFormPhone\(''\);\n\s*\};/, `setTempPhoto(null);\n    setFormRG(''); setFormCPF(''); setFormPhone('');\n    setFormBlockId('');\n    setLastCreatedUser(null);\n  };`);

  // 6. Pegar formulário NOVO e sobrepor o form velho de moradores
  const formLogicMatch = currCode.match(/<form onSubmit=\{handleSaveResident\}[\s\S]*?<\/form>/);
  if (formLogicMatch) {
    oldCode = oldCode.replace(/<form onSubmit=\{handleSaveResident\} className="p-10 space-y-6 max-h-\[75vh\] overflow-y-auto scrollbar-hide">[\s\S]*?<\/form>/, formLogicMatch[0]);
  }

  // 7. Botão Convites
  const convitesBtn = `<button onClick={() => { setShowInvitesPanel(true); refreshInvites(); }} className="bg-slate-100 text-slate-600 px-6 py-2.5 rounded-2xl font-black text-xs uppercase shadow-xl hover:bg-slate-200 transition-all">
            <i className="fa-solid fa-paper-plane mr-2"></i>
            CONVITES
          </button>`;
  oldCode = oldCode.replace(/<div className="flex gap-3">/, `<div className="flex gap-3">\n          ${convitesBtn}`);

  // 8. Inserir Painel Convites
  const convitesModalRegex = /\{showInvitesPanel && \([\s\S]*?\}\)/;
  const convitesModalMatch = currCode.match(convitesModalRegex);
  
  if (convitesModalMatch) {
    oldCode = oldCode.replace(/(<div className="space-y-6.*?animate-in fade-in duration-500 pb-20">)/, `$1\n\n      ${convitesModalMatch[0]}\n`);
  }

  // Corrigir activeTab list render para não ter conflito se faltar algo
  // O oldCode deve estar inteiro

  fs.writeFileSync('components/Moradores.tsx', oldCode);
  console.log("Merge completed successfully!");
} catch (e) {
  console.error("Erro no merge script:", e);
}
