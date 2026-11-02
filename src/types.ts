export interface Business {
  id: string;
  name: string;
  category: string;
  location: string;
  signerName: string;
  tone: 'caloroso' | 'formale' | 'diretto';
  defaultLanguage: string;
  phrasesToAvoid: string;
  privateContact: string;
  googleUrl: string;
  isConnected: boolean;
  smsTemplate: string;
}

export interface Review {
  id: string;
  businessId: string;
  author: string;
  stars: number;
  text: string;
  date: string;
  status: 'da_rispondere' | 'bozza_pronta' | 'pubblicata';
  replyText?: string;
  replyDate?: string;
}

export interface RequestItem {
  id: string;
  businessId: string;
  clientName: string;
  phone: string;
  date: string;
  status: 'inviata' | 'vista' | 'recensione_ricevuta';
}

export interface InsightsData {
  strengths: string[];
  improvements: string[];
}
