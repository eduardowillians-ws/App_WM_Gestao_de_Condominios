
export enum View {
  DASHBOARD = 'DASHBOARD',
  ENCOMENDAS = 'ENCOMENDAS',
  RESERVAS = 'RESERVAS',
  OCORRENCIA = 'OCORRENCIAS',
  OCORRENCIAS = 'OCORRENCIAS',
  FINANCEIRO = 'FINANCEIRO',
  VISITANTES = 'VISITANTES',
  DOCUMENTOS = 'DOCUMENTOS',
  VOTACAO = 'VOTACAO',
  MANUTENCAO = 'MANUTENCAO',
  EQUIPE = 'EQUIPE',
  MORADORES = 'MORADORES',
  MANUAL_SINDICO = 'MANUAL_SINDICO',
  MEU_PERFIL = 'MEU_PERFIL',
  CONVIDAR_USUARIOS = 'CONVIDAR_USUARIOS'
}

export interface TechnicalItem {
  id: string;
  label: string;
  status: 'regular' | 'expired' | 'warning';
  entryDate: string;
  validityDate: string;
  inspector?: string;
  description: string;
  observation?: string;
  docId?: string;
}

export interface ManualCategory {
  id: string;
  title: string;
  description?: string;
  image: string;
  icon?: string;
  mandatory: boolean;
  orderIndex?: number;
  items: TechnicalItem[];
}

export interface ImprovementIdea {
  id: string;
  title: string;
  image: string;
  description: string;
  likes: number;
  dislikes: number;
  status: 'planning' | 'voting' | 'completed';
  manager: string;
  requestDate: string;
  implementationDate?: string;
  estimatedCost: number;
  realCost?: number;
  totalVotes?: number;
  docUrl?: string;
  category: string;
}

export interface AssetLog {
  id: string;
  user: string;
  action: 'retirada' | 'devolucao' | 'reparo' | 'uso';
  date: string;
  quantityAffected: number;
  notes?: string;
}

export interface ToolAsset {
  id: string;
  code: string; // Código de rastreio: ex: FER-001
  name: string;
  status: 'available' | 'in_use' | 'maintenance' | 'damaged';
  statusReason?: string;
  borrowedBy?: string;
  lastUpdate: string;
  category: string;
  location: string;
  quantity: number;
  unitLabel: string;
  history: AssetLog[];
}

export interface User {
  id: string;
  name: string;
  unit: string;
  role: 'admin' | 'resident' | 'manager';
  avatar?: string;
}

export interface Resident {
  id: string;
  name: string;
  blockId?: string;
  unit: string;
  email: string;
  phone: string;
  status: 'active' | 'inactive';
  rg?: string;
  cpf?: string;
  profession?: string;
  entryDate?: string;
  exitDate?: string;
  photoUrl?: string;
  documents?: { id: string; name: string; url: string }[];
}

export interface Assembleia {
  id: string;
  title: string;
  description: string;
  date: string;
  startDate?: string;
  endDate?: string;
  type: 'ORDINÁRIA' | 'EXTRAORDINÁRIA';
  status: 'active' | 'closed';
  votesCount: number;
  results?: {
    aprovo: number;
    rejeito: number;
    abstencao: number;
  };
  minutesUrl?: string;
  closingTime?: string;
}

export interface FinancialEntry {
  id: string;
  description: string;
  type: 'RECU' | 'DESP';
  category: string;
  amount: number;
  date: string;
  status: 'paid' | 'pending' | 'overdue';
  receiptUrl?: string;
}

export interface Ocorrencia {
  id: string;
  title: string;
  description: string;
  date: string;
  time?: string;
  category: string;
  status: 'open' | 'in_progress' | 'closed';
  residentName: string;
  unit: string;
  urgency: 'low' | 'medium' | 'high';
  observation?: string;
}

export interface AreaReserva {
  id: string;
  name: string;
  image: string;
  capacity: number;
  tax: number;
  description: string;
  rules: string[];
}

export interface Reserva {
  id: string;
  areaId: string;
  areaName: string;
  date: string;
  startTime: string;
  endTime: string;
  status: 'confirmed' | 'cancelled';
  residentName: string;
  unit: string;
}

export interface MaintenanceJob {
  id: string;
  task: string;
  area: string;
  type: 'PREVENTIVA' | 'CORRETIVA';
  date: string;
  time: string;
  status: 'scheduled' | 'done' | 'cancelled' | 'delayed';
  responsible: string;
  invoiceUrl?: string;
}

export interface OperationCertificate {
  id: string;
  name: string;
  expiryDate: string;
  status: 'valid' | 'expired' | 'warning' | string;
  lastAnalysisDate?: string;
  fileUrl?: string;
}

export interface EPIItem {
  id: string;
  name: string;
  deliveryDate: string;
  expiryDate: string;
  status: 'regular' | 'vencido' | 'faltante' | 'irregular';
}

export interface StaffDocument {
  id: string;
  name: string;
  url: string;
  type: string;
}

export interface DismissalDetails {
  reason: string;
  pendencies: string;
  isPaid: boolean;
  date: string;
}

export interface StaffMember {
  id: string;
  name: string;
  role: string;
  epis: EPIItem[];
  epiStatus: 'complete' | 'missing' | 'expired' | 'regular' | 'pendente';
  status: 'active' | 'dismissed';
  vacationStart?: string;
  vacationEnd?: string;
  thirteenthSalaryStatus?: 'pending' | 'partially_paid' | 'paid';
  admissionDate?: string;
  dismissalDate?: string;
  dismissalDetails?: DismissalDetails;
  salary?: number;
  photoUrl?: string;
  rg?: string;
  maritalStatus?: string;
  childrenCount?: number;
  street?: string;
  streetNumber?: string;
  neighborhood?: string;
  city?: string;
  documents?: StaffDocument[];
}

export interface Visitor {
  id: string;
  name: string;
  type: 'VISITANTE' | 'SERVIÇO' | 'ENTREGA' | 'MORADOR';
  unit: string;
  timestamp: string;
  method: string;
  avatar: string;
}

export interface VehicleTag {
  id: string;
  plate: string;
  model: string;
  owner: string;
  block?: string;
  unit?: string;
  spots?: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export interface JuridicalDocument {
  id: string;
  name: string;
  category: string;
  status: 'Válido' | 'Vencido' | 'Pendente' | 'Arquivado';
  uploadDate: string;
  expiryDate?: string;
  fileUrl: string;
  description: string;
  size: string;
}

export interface Encomenda {
  id: string;
  residentName: string;
  block?: string;
  unit: string;
  dateEntry: string;
  dateNotification?: string;
  dateExit?: string;
  trackingCode: string;
  status: 'pendente' | 'entregue';
  description: string;
  phone?: string;
}

export interface CondoBlock {
  id: string;
  name: string;
  totalUnits: number;
  units: string[];
}
