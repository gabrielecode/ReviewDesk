import { Business, Review, RequestItem } from './types';

export interface AppData {
  businesses: Business[];
  reviews: Review[];
  requests: RequestItem[];
}

export const initialData: AppData = {
  businesses: [
    {
      id: 'osteria-demo',
      name: 'Osteria Demo',
      category: 'Ristorante Tipico',
      location: 'Lugano',
      signerName: 'Chef Marco',
      tone: 'caloroso',
      defaultLanguage: 'it',
      phrasesToAvoid: 'Speriamo di rivederci presto se non avete troppa fretta',
      privateContact: 'osteria@demo.ch / +41 91 923 45 67',
      googleUrl: 'https://g.page/r/osteria-demo-lugano/review',
      isConnected: true,
      smsTemplate: 'Ciao {nome}! Grazie per essere stato all\'Osteria Demo a Lugano. Ti è piaciuta la nostra cucina ticinese? Lasciaci una recensione qui: {link}'
    },
    {
      id: 'salone-demo',
      name: 'Salone Demo',
      category: 'Parrucchiere & Stile',
      location: 'Mendrisio',
      signerName: 'Elena',
      tone: 'diretto',
      defaultLanguage: 'it',
      phrasesToAvoid: 'Non preoccupatevi per i capelli rovinati',
      privateContact: 'info@salonedemo.ch / +41 91 646 12 34',
      googleUrl: 'https://g.page/r/salone-demo-mendrisio/review',
      isConnected: false,
      smsTemplate: 'Buongiorno {nome}, grazie per la visita al Salone Demo di Mendrisio! Come ti trovi con il nuovo taglio? Raccontacelo su Google: {link}'
    },
    {
      id: 'studio-demo',
      name: 'Studio Demo',
      category: 'Fisioterapia',
      location: 'Bellinzona',
      signerName: 'Dr. Luca Bernasconi',
      tone: 'formale',
      defaultLanguage: 'it',
      phrasesToAvoid: 'Vi auguriamo un pronto recupero miracoloso',
      privateContact: 'studio@demo.ch / +41 91 825 78 90',
      googleUrl: 'https://g.page/r/studio-demo-bellinzona/review',
      isConnected: true,
      smsTemplate: 'Gentile {nome}, la ringraziamo per essersi affidato allo Studio Demo di Bellinzona. La Sua opinione è preziosa per il nostro centro: {link}'
    }
  ],
  reviews: [
    {
      id: 'ost-1',
      businessId: 'osteria-demo',
      author: 'Matteo Rossi',
      stars: 5,
      text: 'Ottimo risotto ai funghi e brasato eccezionale! Personale molto accogliente e atmosfera tipica ticinese. Torneremo sicuramente.',
      date: '2026-10-28',
      status: 'pubblicata',
      replyText: 'Caro Matteo, che piacere leggere le tue parole! Siamo davvero felici che il risotto ai funghi e il brasato siano stati di tuo gradimento. Ti aspettiamo presto all\'Osteria Demo! Un caro saluto, Chef Marco',
      replyDate: '2026-10-29'
    },
    {
      id: 'ost-2',
      businessId: 'osteria-demo',
      author: 'Hans Peter',
      stars: 4,
      text: 'Sehr gutes Essen und netter Service in Lugano. The polenta was delicious. War leider etwas voll am Samstag.',
      date: '2026-10-26',
      status: 'bozza_pronta',
      draftText: 'Hallo Hans! Thank you so much for visiting us in Lugano. We are glad you enjoyed the polenta! We note your feedback about the Saturday crowd and hope to welcome you back soon. Cordiali saluti, Chef Marco'
    },
    {
      id: 'ost-3',
      businessId: 'osteria-demo',
      author: 'Laura Bianchi',
      stars: 1,
      text: 'Servizio lentissimo! Abbiamo aspettato più di 50 minuti per i primi piatti senza che nessuno ci dicesse nulla. Deludenti.',
      date: '2026-10-24',
      status: 'da_rispondere'
    },
    {
      id: 'ost-4',
      businessId: 'osteria-demo',
      author: 'Gianni Moretti',
      stars: 5,
      text: 'Meravigliosa osteria nel cuore del Ticino. Vino Merlot locale superbo e formaggi del alpeggio sublimi.',
      date: '2026-10-22',
      status: 'pubblicata',
      replyText: 'Buongiorno Gianni, grazie di cuore per il magnifico commento! Il nostro Merlot locale e i formaggi d\'alpeggio sono il nostro orgoglio. A presto, Chef Marco',
      replyDate: '2026-10-23'
    },
    {
      id: 'ost-5',
      businessId: 'osteria-demo',
      author: 'Sarah Smith',
      stars: 5,
      text: 'Fantastic authentic Ticinese food! Cozy vibe by the lake area.',
      date: '2026-10-20',
      status: 'pubblicata',
      replyText: 'Hello Sarah! Thank you for the wonderful review. We are delighted you loved our authentic food and cozy vibe. Warm regards, Chef Marco',
      replyDate: '2026-10-21'
    },
    {
      id: 'ost-6',
      businessId: 'osteria-demo',
      author: 'Paolo Bernasconi',
      stars: 3,
      text: 'Cibo buono ma prezzi un po\' alti per le porzioni servite. Comunque locale pulito.',
      date: '2026-10-18',
      status: 'da_rispondere'
    },
    {
      id: 'ost-7',
      businessId: 'osteria-demo',
      author: 'Claudia Meier',
      stars: 4,
      text: 'Schönes Restaurant mit tollem Ambiente. Der Fisch war sehr frisch.',
      date: '2026-10-15',
      status: 'da_rispondere'
    },
    {
      id: 'ost-8',
      businessId: 'osteria-demo',
      author: 'Roberto Crivelli',
      stars: 5,
      text: 'Ottima accoglienza e qualità costante.',
      date: '2026-10-12',
      status: 'pubblicata',
      replyText: 'Grazie mille per le 5 stelle Roberto! A presto, Chef Marco',
      replyDate: '2026-10-13'
    },
    {
      id: 'ost-9',
      businessId: 'osteria-demo',
      author: 'Giorgio Varisco',
      stars: 2,
      text: 'Peccato per la cortesia del cameriere un po\' fredda. Il piatto principale era tiepido.',
      date: '2026-10-10',
      status: 'da_rispondere'
    },
    {
      id: 'ost-10',
      businessId: 'osteria-demo',
      author: 'Elena Du Bois',
      stars: 5,
      text: 'Un vero gioiello a Lugano! Gnocchi fatti in casa spettacolari.',
      date: '2026-10-05',
      status: 'pubblicata',
      replyText: 'Cara Elena, che gioia leggere che i nostri gnocchi fatti in casa ti hanno conquistata! Ti aspettiamo per la prossima golosità. Un saluto, Chef Marco',
      replyDate: '2026-10-06'
    },
    {
      id: 'ost-11',
      businessId: 'osteria-demo',
      author: 'Markus Weber',
      stars: 4,
      text: 'Sehr gutes Essen, freundliche Bedienung.',
      date: '2026-10-01',
      status: 'pubblicata',
      replyText: 'Danke Markus! Wir freuen uns auf Ihren nächsten Besuch in Lugano. A presto, Chef Marco',
      replyDate: '2026-10-02'
    },
    {
      id: 'ost-12',
      businessId: 'osteria-demo',
      author: 'Silvia Pini',
      stars: 5,
      text: 'Torta di pane fatta in casa da urlo! Ambiente familiare e cordiale.',
      date: '2026-09-28',
      status: 'pubblicata',
      replyText: 'Grazie Silvia! La nostra torta di pane segue la ricetta tradizionale. Un abbraccio, Chef Marco',
      replyDate: '2026-09-29'
    },
    {
      id: 'ost-13',
      businessId: 'osteria-demo',
      author: 'Davide G.',
      stars: 5,
      text: 'Pranzo di lavoro eccellente. Servizio rapido e piatti genuini.',
      date: '2026-09-25',
      status: 'da_rispondere'
    },
    {
      id: 'ost-14',
      businessId: 'osteria-demo',
      author: 'Klaus N.',
      stars: 4,
      text: 'Gutes Lokal, gerne wieder.',
      date: '2026-09-20',
      status: 'pubblicata',
      replyText: 'Danke Klaus! Bis zum nächsten Mal in Lugano. Chef Marco',
      replyDate: '2026-09-21'
    },
    // Salone Demo
    {
      id: 'sal-1',
      businessId: 'salone-demo',
      author: 'Martina F.',
      stars: 5,
      text: 'Elena ha capito esattamente il colore che volevo! Balayage perfetto e capelli morbidissimi.',
      date: '2026-10-27',
      status: 'pubblicata',
      replyText: 'Grazie Martina! Sono felicissima che il balayage sia esattamente come lo desideravi. A presto nel mio salone a Mendrisio! Elena',
      replyDate: '2026-10-28'
    },
    {
      id: 'sal-2',
      businessId: 'salone-demo',
      author: 'Jessica Taylor',
      stars: 5,
      text: 'Amazing haircut and styling in Mendrisio! Super professional.',
      date: '2026-10-25',
      status: 'bozza_pronta',
      draftText: 'Hello Jessica! Thank you so much for the lovely feedback. It was a pleasure styling your hair in Mendrisio! Best regards, Elena'
    },
    {
      id: 'sal-3',
      businessId: 'salone-demo',
      author: 'Carla Meroni',
      stars: 2,
      text: 'Appuntamento preso per le 14:00 ma ho dovuto aspettare 45 minuti prima di sedermi sulla poltrona. Poco rispetto del tempo.',
      date: '2026-10-21',
      status: 'da_rispondere'
    },
    {
      id: 'sal-4',
      businessId: 'salone-demo',
      author: 'Beatrice Rossi',
      stars: 5,
      text: 'Ambiente rilassante, pulitissimo e prodotti eccezionali. Consigliatissimo!',
      date: '2026-10-18',
      status: 'pubblicata',
      replyText: 'Grazie Beatrice! La cura dell\'ambiente e dei prodotti per i vostri capelli è la nostra priorità. A presto, Elena',
      replyDate: '2026-10-19'
    },
    {
      id: 'sal-5',
      businessId: 'salone-demo',
      author: 'Monika Keller',
      stars: 4,
      text: 'Sehr schöner Salon und sehr freundliche Coiffeuse.',
      date: '2026-10-14',
      status: 'da_rispondere'
    },
    {
      id: 'sal-6',
      businessId: 'salone-demo',
      author: 'Sara G.',
      stars: 5,
      text: 'Servizio eccellente come sempre.',
      date: '2026-10-10',
      status: 'pubblicata',
      replyText: 'Grazie Sara per le stelle! Un saluto, Elena',
      replyDate: '2026-10-11'
    },
    {
      id: 'sal-7',
      businessId: 'salone-demo',
      author: 'Tiziana B.',
      stars: 4,
      text: 'Taglio moderno e curato. Tornerò sicuramente per la piega.',
      date: '2026-10-05',
      status: 'da_rispondere'
    },
    {
      id: 'sal-8',
      businessId: 'salone-demo',
      author: 'Daniela R.',
      stars: 1,
      text: 'Colore venuto troppo scuro rispetto alla foto che avevo mostrato. Molto delusa.',
      date: '2026-10-02',
      status: 'da_rispondere'
    },
    {
      id: 'sal-9',
      businessId: 'salone-demo',
      author: 'Francesca L.',
      stars: 5,
      text: 'Miglior salone a Mendrisio senza dubbio. Bravissima Elena!',
      date: '2026-09-29',
      status: 'pubblicata',
      replyText: 'Grazie Francesca! Complimenti così mi danno una carica immensa. A presto! Elena',
      replyDate: '2026-09-30'
    },
    {
      id: 'sal-10',
      businessId: 'salone-demo',
      author: 'Gaby S.',
      stars: 5,
      text: 'Top Service und wunderschöne Frisur!',
      date: '2026-09-24',
      status: 'pubblicata',
      replyText: 'Vielen Dank Gaby! Es war mir eine Freude. Bis zum nächsten Mal in Mendrisio, Elena',
      replyDate: '2026-09-25'
    },
    {
      id: 'sal-11',
      businessId: 'salone-demo',
      author: 'Michela V.',
      stars: 4,
      text: 'Molto professionali e gentili. Prezzi corretti.',
      date: '2026-09-20',
      status: 'da_rispondere'
    },
    {
      id: 'sal-12',
      businessId: 'salone-demo',
      author: 'Alessia N.',
      stars: 3,
      text: 'Lievissimo ritardo sulla prenotazione, ma taglio impeccabile.',
      date: '2026-09-15',
      status: 'da_rispondere'
    },
    // Studio Demo
    {
      id: 'stu-1',
      businessId: 'studio-demo',
      author: 'Stefano Pagani',
      stars: 5,
      text: 'Il Dr. Bernasconi è un professionista eccezionale. Il mio mal di schiena cronico è quasi sparito grazie ai trattamenti mirati.',
      date: '2026-10-28',
      status: 'pubblicata',
      replyText: 'Gentile Stefano, La ringraziamo molto per la Sua testimonianza. Sono lieto che i trattamenti abbiano alleviato il Suo mal di schiena. Cordiali saluti, Dr. Luca Bernasconi',
      replyDate: '2026-10-29'
    },
    {
      id: 'stu-2',
      businessId: 'studio-demo',
      author: 'Ursula Meier',
      stars: 5,
      text: 'Sehr professionelle Physiotherapie in Bellinzona. Sehr zu empfehlen für Sportverletzungen.',
      date: '2026-10-25',
      status: 'bozza_pronta',
      draftText: 'Gentile Ursula, La ringraziamo per le Sue gentili parole. È un piacere sapere che la nostra fisioterapia sia stata utile per la Sua ripresa. Cordiali saluti, Dr. Luca Bernasconi'
    },
    {
      id: 'stu-3',
      businessId: 'studio-demo',
      author: 'Marco Zucchi',
      stars: 4,
      text: 'Studio moderno a Bellinzona, ottima attrezzatura e terapisti molto preparati.',
      date: '2026-10-22',
      status: 'da_rispondere'
    },
    {
      id: 'stu-4',
      businessId: 'studio-demo',
      author: 'Elena Cattaneo',
      stars: 5,
      text: 'Puntualità, competenza e grande empatia. Risolto problema alla spalla in poche sedute.',
      date: '2026-10-19',
      status: 'pubblicata',
      replyText: 'Gentile Elena, La ringrazio cordialmente. Siamo felici di aver risolto il Suo problema alla spalla in modo tempestivo. Un caro saluto, Dr. Luca Bernasconi',
      replyDate: '2026-10-20'
    },
    {
      id: 'stu-5',
      businessId: 'studio-demo',
      author: 'John Doe',
      stars: 4,
      text: 'Great recovery program after my knee surgery. Professional staff.',
      date: '2026-10-15',
      status: 'da_rispondere'
    },
    {
      id: 'stu-6',
      businessId: 'studio-demo',
      author: 'Roberto F.',
      stars: 5,
      text: 'Centro altamente professionale.',
      date: '2026-10-11',
      status: 'pubblicata',
      replyText: 'Grazie per la valutazione positiva. Cordiali saluti, Dr. Luca Bernasconi',
      replyDate: '2026-10-12'
    },
    {
      id: 'stu-7',
      businessId: 'studio-demo',
      author: 'Valeria B.',
      stars: 2,
      text: 'Difficoltà a trovare posteggio nelle vicinanze dello studio negli orari di punta.',
      date: '2026-10-07',
      status: 'da_rispondere'
    },
    {
      id: 'stu-8',
      businessId: 'studio-demo',
      author: 'Claudio M.',
      stars: 5,
      text: 'Massima pulizia e protocolli igienici impeccabili. Bravi.',
      date: '2026-10-03',
      status: 'pubblicata',
      replyText: 'Gentile Claudio, La ringraziamo per aver sottolineato l\'accuratezza dei nostri standard igienici. Cordiali saluti, Dr. Luca Bernasconi',
      replyDate: '2026-10-04'
    },
    {
      id: 'stu-9',
      businessId: 'studio-demo',
      author: 'Sabine W.',
      stars: 5,
      text: 'Ausgezeichnete Behandlung und sehr freundliches Team in Bellinzona.',
      date: '2026-09-29',
      status: 'pubblicata',
      replyText: 'Herzlichen Dank Sabine! Es freut uns sehr, dass Ihnen unsere Behandlung in Bellinzona geholfen hat. Dr. Luca Bernasconi',
      replyDate: '2026-09-30'
    },
    {
      id: 'stu-10',
      businessId: 'studio-demo',
      author: 'Fabio P.',
      stars: 4,
      text: 'Trattamento efficace per la cervicale. Orari flessibili.',
      date: '2026-09-25',
      status: 'da_rispondere'
    },
    {
      id: 'stu-11',
      businessId: 'studio-demo',
      author: 'Nadia D.',
      stars: 3,
      text: 'Buon centro ma tempi di attesa per il primo appuntamento un po\' lunghi.',
      date: '2026-09-20',
      status: 'da_rispondere'
    },
    {
      id: 'stu-12',
      businessId: 'studio-demo',
      author: 'Giorgio T.',
      stars: 5,
      text: 'Eccellente professionalità per riabilitazione post-traumatica.',
      date: '2026-09-15',
      status: 'pubblicata',
      replyText: 'Gentile Giorgio, La ringrazio per la fiducia accordataci. Cordiali saluti, Dr. Luca Bernasconi',
      replyDate: '2026-09-16'
    }
  ],
  requests: [
    {
      id: 'req-1',
      businessId: 'osteria-demo',
      clientName: 'Daniele Rossi',
      phone: '+41 79 123 45 67',
      date: '2026-10-28 14:30',
      status: 'recensione_ricevuta',
      consent: true,
      consentAt: '2026-10-28 14:30'
    },
    {
      id: 'req-2',
      businessId: 'osteria-demo',
      clientName: 'Chiara Benz',
      phone: '+41 78 987 65 43',
      date: '2026-10-27 19:15',
      status: 'vista',
      consent: true,
      consentAt: '2026-10-27 19:15'
    },
    {
      id: 'req-3',
      businessId: 'osteria-demo',
      clientName: 'Paolo Sutter',
      phone: '+41 76 555 44 33',
      date: '2026-10-26 12:45',
      status: 'inviata',
      consent: true,
      consentAt: '2026-10-26 12:45'
    },
    {
      id: 'req-4',
      businessId: 'salone-demo',
      clientName: 'Nadia P.',
      phone: '+41 79 444 33 22',
      date: '2026-10-27 16:00',
      status: 'vista',
      consent: true,
      consentAt: '2026-10-27 16:00'
    },
    {
      id: 'req-5',
      businessId: 'studio-demo',
      clientName: 'Moreno B.',
      phone: '+41 78 111 22 33',
      date: '2026-10-26 10:00',
      status: 'recensione_ricevuta',
      consent: true,
      consentAt: '2026-10-26 10:00'
    }
  ]
};

const STORAGE_KEY = 'reviewdesk_app_data_v2';

export function getAppData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Failed to read localStorage:', e);
  }
  saveAppData(initialData);
  return initialData;
}

export function saveAppData(data: AppData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to write localStorage:', e);
  }
}

export function resetAppData(): AppData {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {}
  saveAppData(initialData);
  return initialData;
}
