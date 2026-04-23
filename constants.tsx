
import React from 'react';
import { View, AreaReserva, ManualCategory } from './types';

export const MENU_ITEMS = [
  { id: View.DASHBOARD, label: 'Início', icon: <i className="fa-solid fa-house"></i> },
  { id: View.MANUAL_SINDICO, label: 'Manual do Síndico', icon: <i className="fa-solid fa-book-open-reader"></i> },
  { id: View.CONVIDAR_USUARIOS, label: 'Convidar Usuários', icon: <i className="fa-solid fa-user-plus"></i> },
  { id: View.MORADORES, label: 'Moradores & Unidades', icon: <i className="fa-solid fa-users"></i> },
  { id: View.VISITANTES, label: 'Acesso / Visitantes', icon: <i className="fa-solid fa-id-card"></i> },
  { id: View.OCORRENCIAS, label: 'Ocorrências & Reclamações', icon: <i className="fa-solid fa-pen-to-square"></i> },
  { id: View.RESERVAS, label: 'Reservas (Áreas)', icon: <i className="fa-solid fa-calendar-days"></i> },
  { id: View.ENCOMENDAS, label: 'Correspondência', icon: <i className="fa-solid fa-box"></i> },
  { id: View.FINANCEIRO, label: 'Financeiro', icon: <i className="fa-solid fa-dollar-sign"></i> },
  { id: View.VOTACAO, label: 'Assembleias Online', icon: <i className="fa-solid fa-comments"></i> },
  { id: View.MANUTENCAO, label: 'Gestão Operacional', icon: <i className="fa-solid fa-wrench"></i> },
  { id: View.EQUIPE, label: 'Equipe / RH / EPIs', icon: <i className="fa-solid fa-users-gear"></i> },
  { id: View.DOCUMENTOS, label: 'Documentos / Jurídico', icon: <i className="fa-solid fa-file-contract"></i> },
];

export const MANUAL_CATEGORIES: ManualCategory[] = [
  {
    id: 'firefighter',
    title: 'Bombeiro e Incêndio',
    image: 'https://images.unsplash.com/photo-1541913054-0820875c7b39?auto=format&fit=crop&w=600&q=80',
    mandatory: true,
    items: [
      // Fix: Added id, entryDate and renamed validity to validityDate to match TechnicalItem interface
      { id: 'fire-1', label: 'AVCB / CLCB (Alvará)', status: 'regular', entryDate: '2024-10-15', validityDate: '2025-10-15', inspector: 'CBM - SP', description: 'Certificado de licença vigente do Corpo de Bombeiros.' },
      // Fix: Added id, entryDate and renamed validity to validityDate to match TechnicalItem interface
      { id: 'fire-2', label: 'Validade de Mangueiras', status: 'regular', entryDate: '2024-05-20', validityDate: '2025-05-20', inspector: 'ExtinBahia', description: 'Teste hidrostático realizado anualmente.' },
      // Fix: Added id, entryDate and renamed validity to validityDate to match TechnicalItem interface
      { id: 'fire-3', label: 'Carga de Extintores', status: 'warning', entryDate: '2023-12-01', validityDate: '2024-12-01', inspector: 'ExtinBahia', description: 'Necessário recarga nos andares 1 ao 5.' },
      // Fix: Added id, entryDate and renamed validity to validityDate to match TechnicalItem interface
      { id: 'fire-4', label: 'Sistemas de Detecção', status: 'regular', entryDate: '2024-02-10', validityDate: '2025-02-10', inspector: 'Detecto S.A.', description: 'Sensores de fumaça e alarmes centrais.' }
    ]
  },
  {
    id: 'hydraulics',
    title: 'Caixa D\'Água e Hidráulica',
    image: 'https://images.unsplash.com/photo-1585333127302-3f95e263884b?auto=format&fit=crop&w=600&q=80',
    mandatory: true,
    items: [
      // Fix: Added id, entryDate and renamed validity to validityDate to match TechnicalItem interface
      { id: 'water-1', label: 'Limpeza de Reservatórios', status: 'regular', entryDate: '2024-07-20', validityDate: '2025-01-20', inspector: 'AcquaClean', description: 'Limpeza semestral obrigatória.' },
      // Fix: Added id, entryDate and renamed validity to validityDate to match TechnicalItem interface
      { id: 'water-2', label: 'Análise Potabilidade', status: 'regular', entryDate: '2024-07-20', validityDate: '2025-01-20', inspector: 'LabTeste', description: 'Laudo bacteriológico da água.' },
      // Fix: Added id, entryDate and validityDate to match TechnicalItem interface
      { id: 'water-3', label: 'Barrilete e Prumadas', status: 'regular', entryDate: '2024-01-01', validityDate: '2025-01-01', description: 'Inspeção visual de vazamentos.' }
    ]
  },
  {
    id: 'elevators',
    title: 'Elevadores',
    image: 'https://images.unsplash.com/photo-1510074377623-8cf13fb86c08?auto=format&fit=crop&w=600&q=80',
    mandatory: true,
    items: [
      // Fix: Added id, entryDate and renamed validity to validityDate to match TechnicalItem interface
      { id: 'elevator-1', label: 'RIA (Relatório de Inspeção)', status: 'regular', entryDate: '2024-03-01', validityDate: '2025-03-01', inspector: 'Atlas Schindler', description: 'Documento legal de segurança anual.' },
      // Fix: Added id, entryDate and validityDate to match TechnicalItem interface
      { id: 'elevator-2', label: 'Manutenção Mensal', status: 'regular', entryDate: '2024-01-01', validityDate: '2025-01-01', description: 'Visitas técnicas de lubrificação e ajuste.' }
    ]
  },
  {
    id: 'nature',
    title: 'Jardim e Piscina',
    image: 'https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?auto=format&fit=crop&w=600&q=80',
    mandatory: false,
    items: [
      // Fix: Added id, entryDate and validityDate to match TechnicalItem interface
      { id: 'garden-1', label: 'Tratamento de Piscina', status: 'regular', entryDate: '2024-01-01', validityDate: '2025-01-01', description: 'Controle de cloro e pH diário/semanal.' },
      // Fix: Added id, entryDate and validityDate to match TechnicalItem interface
      { id: 'garden-2', label: 'Poda e Paisagismo', status: 'regular', entryDate: '2024-01-01', validityDate: '2025-01-01', description: 'Manutenção de gramado e áreas verdes.' }
    ]
  }
];

export const AREAS_RESERVA: AreaReserva[] = [
  { 
    id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    name: 'Academia', 
    image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=600&q=80',
    capacity: 20,
    tax: 0,
    description: 'Equipamentos modernos para musculação e cardio. Ar-condicionado e sonorização inclusos.',
    rules: ['Uso obrigatório de toalha', 'Limite de 60 minutos por aparelho em horários de pico', 'Proibido circular sem camisa']
  },
  { 
    id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12',
    name: 'Academia Ar Livre', 
    image: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=600&q=80',
    capacity: 20,
    tax: 0,
    description: 'Espaço aberto para exercícios funcionais e alongamento integrado com a natureza do condomínio.',
    rules: ['Uso livre para moradores', 'Mantenha o distanciamento', 'Zele pelos equipamentos fixos']
  },
  { 
    id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13',
    name: 'Auditório', 
    image: 'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?auto=format&fit=crop&w=600&q=80',
    capacity: 50,
    tax: 150,
    description: 'Perfeito para reuniões de negócios, palestras ou eventos corporativos de pequeno porte.',
    rules: ['Reserva mínima de 2 horas', 'Proibido consumo de alimentos pesados', 'Taxa de limpeza inclusa no valor']
  },
  { 
    id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14',
    name: 'Brinquedoteca', 
    image: 'https://images.unsplash.com/photo-1566411520896-01e7ca4726af?auto=format&fit=crop&w=600&q=80',
    capacity: 15,
    tax: 0,
    description: 'Espaço lúdico e seguro para crianças de 2 a 10 anos.',
    rules: ['Crianças devem estar acompanhadas por um adulto', 'Proibido calçados no tapete', 'Mantenha os brinquedos organizados após o uso']
  },
  { 
    id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a15',
    name: 'Churrasqueira', 
    image: 'https://images.unsplash.com/photo-1529193591184-b1d58b34ecdf?auto=format&fit=crop&w=600&q=80',
    capacity: 30,
    tax: 80,
    description: 'Ambiente completo com grelha, forno de pizza e mesas. Ideal para reunir família e amigos.',
    rules: ['Limpeza por conta do morador ou contratação à parte', 'Som em volume moderado até as 22h', 'Taxa de uso para gás e manutenção']
  },
  { 
    id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a16',
    name: 'Salão de Festas', 
    image: 'https://images.unsplash.com/photo-1530103043960-ef38714abb15?auto=format&fit=crop&w=600&q=80',
    capacity: 100,
    tax: 350,
    description: 'Amplo salão climatizado com cozinha completa, mesas e cadeiras de alto padrão.',
    rules: ['Entrega das chaves mediante vistoria', 'Taxa de manutenção obrigatória', 'Uso de som profissional proibido sem autorização prévia']
  },
];
