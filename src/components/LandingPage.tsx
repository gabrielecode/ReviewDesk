import React, { useState } from 'react';
import { ArrowRight, Star, Check, Globe, Share2, Mail, MessageCircle, Linkedin, Facebook } from 'lucide-react';

interface LandingPageProps {
  onOpenDashboard: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onOpenDashboard }) => {
  const [nome, setNome] = useState('');
  const [attivita, setAttivita] = useState('');
  const [tipo, setTipo] = useState('');
  const [email, setEmail] = useState('');
  const [okConsent, setOkConsent] = useState(false);
  const [esito, setEsito] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome || !attivita || !tipo || !email || !okConsent) return;
    
    try {
      await fetch('/api/request-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: nome, businessName: attivita, businessType: tipo, email })
      });
    } catch (err) {
      console.error('Error submitting access request to API:', err);
    }

    const body = `Nome: ${nome}\nAttività: ${attivita}\nTipo: ${tipo}\nEmail: ${email}\n\nAccetto di essere contattato per l’accesso pilota di ReviewDesk.`;
    setEsito('Richiesta registrata con successo nel sistema ReviewDesk! Apro la tua email per inviare la conferma a info@sititicino.ch.');
    window.location.href = `mailto:info@sititicino.ch?subject=${encodeURIComponent('Richiesta accesso pilota ReviewDesk')}&body=${encodeURIComponent(body)}`;
  };

  const currentUrl = encodeURIComponent(window.location.href.split('#')[0]);
  const shareTitle = encodeURIComponent('ReviewDesk: gestione delle recensioni Google per attività ticinesi');

  return (
    <div className="min-h-screen bg-[#F6F7F5] text-[#1C2321] font-sans">
      <a className="absolute -left-[999px] focus:left-2 focus:top-2 bg-white p-2 z-50 shadow" href="#contenuto">
        Vai al contenuto
      </a>

      {/* Top Header */}
      <header className="bg-white border-b border-[#E2E5E0] sticky top-0 z-40">
        <div className="max-w-[1080px] mx-auto px-5 flex items-center justify-between min-h-[60px] gap-4">
          <a className="font-bold text-[19px] text-[#1C2321] tracking-tight" href="#" aria-label="ReviewDesk, home">
            ReviewDesk
          </a>
          <nav aria-label="Principale" className="hidden md:block">
            <ul className="flex items-center gap-[22px] list-none m-0 p-0 text-[15px] text-[#586159]">
              <li><a href="#come-funziona" className="hover:text-[#1C2321] transition">Come funziona</a></li>
              <li><a href="#chi-siamo" className="hover:text-[#1C2321] transition">Chi siamo</a></li>
              <li><a href="#faq" className="hover:text-[#1C2321] transition">Domande</a></li>
              <li>
                <button 
                  onClick={onOpenDashboard}
                  className="bg-[#E8F0EC] text-[#1F5F4A] hover:bg-[#d8e8e0] px-3 py-1.5 rounded-[6px] font-semibold text-[14px] transition"
                >
                  Apri App Dashboard
                </button>
              </li>
              <li>
                <a href="#richiesta" className="bg-[#1F5F4A] text-white hover:bg-[#174A39] px-3.5 py-2 rounded-[6px] font-semibold text-[15px] transition">
                  Richiedi l’accesso
                </a>
              </li>
            </ul>
          </nav>
          <div className="flex md:hidden items-center gap-2">
            <button 
              onClick={onOpenDashboard}
              className="bg-[#1F5F4A] text-white px-3 py-1.5 rounded-[6px] text-xs font-semibold"
            >
              Dashboard
            </button>
            <a href="#richiesta" className="bg-[#1F5F4A] text-white px-3 py-1.5 rounded-[6px] text-xs font-semibold">
              Pilota
            </a>
          </div>
        </div>
      </header>

      <main id="contenuto">
        {/* Hero Section */}
        <section className="py-12 md:py-16">
          <div className="max-w-[1080px] mx-auto px-5 grid grid-cols-1 md:grid-cols-[1.25fr_1fr] gap-8 md:gap-12 items-start">
            <div>
              <h1 className="text-[30px] md:text-[46px] font-bold leading-[1.2] tracking-tight mb-4 max-w-[17em]">
                Rispondi alle recensioni Google in pochi secondi, senza perdere il tuo tono
              </h1>
              <p className="text-[19px] text-[#586159] mb-6 max-w-[36em] leading-[1.6]">
                ReviewDesk scrive la bozza di risposta in italiano, tedesco o inglese. Tu la leggi, la modifichi e la pubblichi solo se ti convince. Pensato per ristoranti, saloni e studi del Ticino.
              </p>
              
              <ul className="list-none p-0 m-0 mb-8 space-y-2 text-[#1C2321]">
                <li className="pl-7 relative">
                  <span className="absolute left-1 top-[0.45em] w-[10px] h-[6px] border-l-2 border-b-2 border-[#1F5F4A] -rotate-45"></span>
                  Ogni risposta passa da te: niente pubblicazioni automatiche
                </li>
                <li className="pl-7 relative">
                  <span className="absolute left-1 top-[0.45em] w-[10px] h-[6px] border-l-2 border-b-2 border-[#1F5F4A] -rotate-45"></span>
                  Richieste di recensione a tutti i clienti, nel rispetto delle regole di Google
                </li>
                <li className="pl-7 relative">
                  <span className="absolute left-1 top-[0.45em] w-[10px] h-[6px] border-l-2 border-b-2 border-[#1F5F4A] -rotate-45"></span>
                  Pilota gratuito, nessuna competenza tecnica richiesta
                </li>
              </ul>

              {/* Demo Card */}
              <figure className="bg-white border border-[#E2E5E0] rounded-[8px] overflow-hidden max-w-[520px] shadow-sm m-0">
                <div className="p-4 md:p-[18px] border-b border-[#E2E5E0]">
                  <div className="flex items-center justify-between mb-1">
                    <strong className="text-[#1C2321]">Matteo R.</strong>
                    <div className="text-[#D99A00] tracking-[2px] ml-2 text-sm">★★★★★</div>
                  </div>
                  <p className="m-0 text-[15px] text-[#1C2321] leading-relaxed">
                    Ottimo risotto ai funghi e brasato eccezionale. Personale accogliente, torneremo.
                  </p>
                </div>
                <div className="p-4 md:p-[18px] bg-[#FAFBF9]">
                  <small className="text-[#586159] text-[13px] block mb-1">Bozza di risposta, in attesa della tua approvazione</small>
                  <p className="m-0 text-[15px] text-[#1C2321] leading-relaxed">
                    Caro Matteo, grazie per le belle parole. Siamo contenti che il risotto e il brasato siano stati di suo gradimento. Vi aspettiamo presto, Chef Marco.
                  </p>
                  <div className="flex gap-2 mt-3">
                    <span className="bg-[#1F5F4A] text-white text-[14px] px-3 py-1.5 rounded-[6px] font-semibold">Approva e pubblica</span>
                    <span className="border border-[#E2E5E0] bg-white text-[#1C2321] text-[14px] px-3 py-1.5 rounded-[6px] font-semibold">Modifica</span>
                  </div>
                </div>
                <figcaption className="p-2 px-[18px] text-[13px] text-[#586159] border-t border-[#E2E5E0]">
                  Esempio dimostrativo con dati fittizi.
                </figcaption>
              </figure>
            </div>

            {/* Pilot Request Form */}
            <form onSubmit={handleSubmit} className="bg-white border border-[#E2E5E0] rounded-[8px] p-6 shadow-sm sticky top-20" id="richiesta">
              <h2 className="text-[22px] font-bold mb-2">Richiedi l’accesso pilota</h2>
              <p className="text-[13px] text-[#586159] mb-4">Compila il modulo: ti rispondiamo entro un giorno lavorativo.</p>

              <label htmlFor="nome" className="block text-[14px] font-semibold mb-1 mt-3">Nome e cognome</label>
              <input 
                type="text" 
                id="nome" 
                value={nome} 
                onChange={e => setNome(e.target.value)} 
                required 
                autoComplete="name"
                className="w-full p-2.5 border border-[#C9CEC8] rounded-[6px] text-[15px] bg-white text-[#1C2321]"
              />

              <label htmlFor="attivita" className="block text-[14px] font-semibold mb-1 mt-3">Nome dell’attività</label>
              <input 
                type="text" 
                id="attivita" 
                value={attivita} 
                onChange={e => setAttivita(e.target.value)} 
                required 
                autoComplete="organization"
                className="w-full p-2.5 border border-[#C9CEC8] rounded-[6px] text-[15px] bg-white text-[#1C2321]"
              />

              <label htmlFor="tipo" className="block text-[14px] font-semibold mb-1 mt-3">Tipo di attività</label>
              <select 
                id="tipo" 
                value={tipo} 
                onChange={e => setTipo(e.target.value)} 
                required
                className="w-full p-2.5 border border-[#C9CEC8] rounded-[6px] text-[15px] bg-white text-[#1C2321]"
              >
                <option value="">Seleziona</option>
                <option value="Ristorante o bar">Ristorante o bar</option>
                <option value="Salone o centro estetico">Salone o centro estetico</option>
                <option value="Studio medico o terapeutico">Studio medico o terapeutico</option>
                <option value="Altro">Altro</option>
              </select>

              <label htmlFor="email" className="block text-[14px] font-semibold mb-1 mt-3">Email</label>
              <input 
                type="email" 
                id="email" 
                value={email} 
                onChange={e => setEmail(e.target.value)} 
                required 
                autoComplete="email"
                className="w-full p-2.5 border border-[#C9CEC8] rounded-[6px] text-[15px] bg-white text-[#1C2321]"
              />

              <label className="flex gap-2.5 items-start font-normal text-[14px] text-[#586159] mt-4 cursor-pointer">
                <input 
                  type="checkbox" 
                  id="ok" 
                  checked={okConsent} 
                  onChange={e => setOkConsent(e.target.checked)} 
                  required
                  className="mt-1"
                />
                <span>Accetto che mi contattiate per l’accesso pilota. Userete i miei dati solo per rispondermi.</span>
              </label>

              <button type="submit" className="w-full mt-5 bg-[#1F5F4A] hover:bg-[#174A39] text-white font-semibold py-3 px-5 rounded-[6px] text-[16px] transition cursor-pointer">
                Richiedi l’accesso pilota
              </button>

              {esito && <p id="esito" className="font-semibold text-[#1F5F4A] text-sm mt-3" role="status">{esito}</p>}

              <p className="text-[13px] text-[#586159] mt-3">Si aprirà la tua email già compilata, da inviare a info@sititicino.ch.</p>
            </form>
          </div>
        </section>

        {/* Vantaggi Section */}
        <section className="py-14 bg-white border-t border-[#E2E5E0]" id="vantaggi">
          <div className="max-w-[1080px] mx-auto px-5">
            <h2 className="text-[28px] md:text-[32px] font-bold mb-10 tracking-tight">Meno tempo sulle recensioni, più cura per chi le scrive</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-9">
              <div>
                <h3 className="text-[19px] font-bold mb-2">Risposte pronte in tre lingue</h3>
                <p className="text-[#586159] text-[15px] leading-relaxed">Con i turisti e i frontalieri le recensioni arrivano in italiano, tedesco e inglese. ReviewDesk risponde nella lingua giusta e cita un dettaglio concreto di ciò che il cliente ha scritto.</p>
              </div>
              <div>
                <h3 className="text-[19px] font-bold mb-2">Recensioni negative gestite con calma</h3>
                <p className="text-[#586159] text-[15px] leading-relaxed">Le valutazioni da una o due stelle sono segnalate. La bozza ringrazia, mostra empatia e invita al contatto privato, senza scuse e senza accuse.</p>
              </div>
              <div>
                <h3 className="text-[19px] font-bold mb-2">Il controllo resta tuo</h3>
                <p className="text-[#586159] text-[15px] leading-relaxed">Imposti tono, firma e frasi da evitare. Nulla viene pubblicato senza il tuo clic su «Approva e pubblica».</p>
              </div>
            </div>
          </div>
        </section>

        {/* Come funziona */}
        <section className="py-14 border-t border-[#E2E5E0]" id="come-funziona">
          <div className="max-w-[1080px] mx-auto px-5">
            <h2 className="text-[28px] md:text-[32px] font-bold mb-10 tracking-tight">Come funziona</h2>
            <ol className="list-none p-0 m-0 grid grid-cols-1 md:grid-cols-3 gap-9">
              <li className="pt-3.5 border-t-[3px] border-[#1F5F4A]">
                <span className="font-bold text-[#1F5F4A] block mb-1 text-[16px]">1.</span>
                <h3 className="text-[19px] font-bold mb-2">Colleghi l’attività</h3>
                <p className="text-[#586159] text-[15px] leading-relaxed">Ti aiutiamo a configurare il profilo Google, il tono delle risposte e la firma.</p>
              </li>
              <li className="pt-3.5 border-t-[3px] border-[#1F5F4A]">
                <span className="font-bold text-[#1F5F4A] block mb-1 text-[16px]">2.</span>
                <h3 className="text-[19px] font-bold mb-2">Controlli le bozze</h3>
                <p className="text-[#586159] text-[15px] leading-relaxed">Le nuove recensioni arrivano in un elenco con la bozza già scritta. Leggi, modifichi, approvi.</p>
              </li>
              <li className="pt-3.5 border-t-[3px] border-[#1F5F4A]">
                <span className="font-bold text-[#1F5F4A] block mb-1 text-[16px]">3.</span>
                <h3 className="text-[19px] font-bold mb-2">Chiedi più recensioni</h3>
                <p className="text-[#586159] text-[15px] leading-relaxed">Dopo il servizio invii un messaggio con il link, o mostri il QR code in cassa o in sala.</p>
              </li>
            </ol>
          </div>
        </section>

        {/* Per chi */}
        <section className="py-14 bg-white border-t border-[#E2E5E0]" id="per-chi">
          <div className="max-w-[1080px] mx-auto px-5 grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
            <div>
              <h2 className="text-[28px] md:text-[32px] font-bold mb-4 tracking-tight">Per le attività locali del Ticino</h2>
              <p className="text-[#586159] text-[15px] leading-relaxed mb-4">Un ristorante a Lugano, un salone a Mendrisio, uno studio di fisioterapia a Bellinzona: le recensioni su Google decidono spesso chi viene scelto. Rispondere con regolarità mostra attenzione ai clienti, ma richiede tempo che nel servizio non c’è.</p>
              <p className="text-[#586159] text-[15px] leading-relaxed">ReviewDesk è pensato per chi gestisce una sola sede e non ha un reparto marketing.</p>
            </div>
            <ul className="list-none p-0 m-0 divide-y divide-[#E2E5E0]">
              <li className="py-3">
                <strong className="text-[#1C2321]">Ristoranti e bar</strong><br />
                <span className="text-[#586159] text-[15px]">Risposte nella lingua dell’ospite, anche nei weekend pieni.</span>
              </li>
              <li className="py-3">
                <strong className="text-[#1C2321]">Saloni e centri estetici</strong><br />
                <span className="text-[#586159] text-[15px]">Richiesta di recensione al termine dell’appuntamento.</span>
              </li>
              <li className="py-3">
                <strong className="text-[#1C2321]">Studi medici e terapeutici</strong><br />
                <span className="text-[#586159] text-[15px]">Toni formali e risposte prudenti, riviste da te prima della pubblicazione.</span>
              </li>
            </ul>
          </div>
        </section>

        {/* Chi siamo */}
        <section className="py-14 border-t border-[#E2E5E0]" id="chi-siamo">
          <div className="max-w-[1080px] mx-auto px-5 grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
            <div>
              <h2 className="text-[28px] md:text-[32px] font-bold mb-4 tracking-tight">Chi c’è dietro ReviewDesk</h2>
              <p className="text-[#586159] text-[15px] leading-relaxed mb-4">ReviewDesk è un prodotto di <a href="https://sititicino.ch" target="_blank" rel="noopener" className="text-[#1F5F4A] underline font-medium">Connect &amp; Create</a>, il marchio di Gabriele Sestito, consulente digitale a Morbio Inferiore. Lavoro con attività ticinesi su siti web, visibilità online e strumenti digitali, e ho costruito ReviewDesk partendo da ciò che queste attività mi chiedono.</p>
              <p className="text-[#586159] text-[15px] leading-relaxed mb-4">In questa fase cerchiamo poche attività pilota da seguire da vicino. In cambio dell’accesso gratuito chiediamo un parere onesto su cosa funziona e cosa no.</p>
              <p className="mb-0"><a href="mailto:info@sititicino.ch" className="text-[#1F5F4A] font-medium hover:underline">info@sititicino.ch</a></p>
            </div>
            <div>
              <h3 className="text-[19px] font-bold mb-3">Come lavoriamo</h3>
              <ul className="list-none p-0 m-0 divide-y divide-[#E2E5E0]">
                <li className="py-3 text-[#586159] text-[15px]">Nessuna recensione viene scritta al posto dei clienti o comprata.</li>
                <li className="py-3 text-[#586159] text-[15px]">Le richieste di recensione vanno a tutti i clienti, senza premi o sconti in cambio.</li>
                <li className="py-3 text-[#586159] text-[15px]">Il cliente riceve il messaggio solo dopo aver dato il consenso.</li>
                <li className="py-3 text-[#586159] text-[15px]">Ti diciamo sempre cosa è già disponibile e cosa è ancora in sviluppo.</li>
              </ul>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-14 bg-white border-t border-[#E2E5E0]" id="faq">
          <div className="max-w-[1080px] mx-auto px-5">
            <h2 className="text-[28px] md:text-[32px] font-bold mb-8 tracking-tight">Domande frequenti</h2>
            <div className="divide-y divide-[#E2E5E0]">
              {[
                { q: "ReviewDesk pubblica le risposte da solo?", a: "No. Ogni risposta è una bozza: viene pubblicata solo dopo la tua approvazione. Puoi modificarla, rigenerarla o scartarla." },
                { q: "Posso chiedere recensioni solo ai clienti soddisfatti?", a: "No, e ReviewDesk non lo permette. Le regole di Google vietano di selezionare chi può lasciare una recensione e di offrire premi in cambio. La richiesta va a tutti i clienti." },
                { q: "In quali lingue risponde?", a: "In italiano, tedesco o inglese. Puoi scegliere una lingua fissa oppure rispondere nella lingua della recensione, utile con i clienti turisti." },
                { q: "Cosa succede con le recensioni negative?", a: "Vengono segnalate come «Richiede attenzione». La bozza ringrazia, mostra empatia, non accusa il cliente e lo invita a un contatto privato. La pubblichi solo dopo averla riletta." },
                { q: "Come vengono trattati i dati dei clienti?", a: "Il numero di telefono serve solo a inviare la richiesta di recensione, e solo se il cliente ha dato il consenso. Il trattamento segue la legge federale svizzera sulla protezione dei dati." },
                { q: "Quanto costa?", a: "Il periodo pilota è gratuito. Il prezzo successivo ti verrà comunicato prima di qualsiasi addebito, senza vincoli di durata." },
                { q: "Mi serve esperienza tecnica?", a: "No. Durante il pilota configuriamo l’attività insieme a te e ti mostriamo come approvare le risposte dal telefono o dal computer." },
                { q: "Il collegamento con Google Business Profile è già attivo?", a: "Lo stiamo attivando con le attività pilota. Per questo seguiamo ogni attività da vicino nella fase iniziale e ti diciamo chiaramente cosa è già disponibile." }
              ].map((faq, idx) => (
                <details key={idx} className="py-2 group cursor-pointer">
                  <summary className="font-semibold py-3.5 pr-8 relative text-[#1C2321] list-none select-none">
                    {faq.q}
                    <span className="absolute right-1 top-3.5 text-2xl text-[#1F5F4A] group-open:rotate-45 transition-transform">+</span>
                  </summary>
                  <p className="text-[#586159] text-[15px] mt-1 mb-4 max-w-[42em] leading-relaxed">
                    {faq.a}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Banner */}
        <section className="bg-[#1F5F4A] text-white py-14 text-center">
          <div className="max-w-[1080px] mx-auto px-5">
            <h2 className="text-[28px] md:text-[32px] font-bold mb-3 text-white">Inizia con il pilota gratuito</h2>
            <p className="text-[#D6E6DE] text-[17px] max-w-[34em] mx-auto mb-6 leading-relaxed">Poche attività ticinesi alla volta, seguite da vicino. Lascia i tuoi dati e ti scriviamo entro un giorno lavorativo.</p>
            <a href="#richiesta" className="bg-white text-[#1F5F4A] hover:bg-[#E8F0EC] font-semibold py-3.5 px-6 rounded-[6px] text-[16px] inline-block transition">
              Richiedi l’accesso pilota
            </a>
          </div>
        </section>

        {/* Share Section */}
        <section className="py-10 border-t border-[#E2E5E0]">
          <div className="max-w-[1080px] mx-auto px-5 flex flex-wrap gap-3 items-center">
            <h2 className="text-[18px] font-bold m-0 mr-2 text-[#1C2321]">Conosci un’attività che ne ha bisogno?</h2>
            <a 
              href={`https://wa.me/?text=${shareTitle}%20${currentUrl}`} 
              target="_blank" 
              rel="noopener" 
              className="border border-[#E2E5E0] bg-white rounded-[6px] py-2 px-3.5 text-[15px] text-[#1C2321] hover:bg-[#E8F0EC] transition flex items-center gap-1.5"
            >
              <MessageCircle className="w-4 h-4 text-[#25D366]" /> WhatsApp
            </a>
            <a 
              href={`https://www.linkedin.com/sharing/share-offsite/?url=${currentUrl}`} 
              target="_blank" 
              rel="noopener" 
              className="border border-[#E2E5E0] bg-white rounded-[6px] py-2 px-3.5 text-[15px] text-[#1C2321] hover:bg-[#E8F0EC] transition flex items-center gap-1.5"
            >
              <Linkedin className="w-4 h-4 text-[#0A66C2]" /> LinkedIn
            </a>
            <a 
              href={`https://www.facebook.com/sharer/sharer.php?u=${currentUrl}`} 
              target="_blank" 
              rel="noopener" 
              className="border border-[#E2E5E0] bg-white rounded-[6px] py-2 px-3.5 text-[15px] text-[#1C2321] hover:bg-[#E8F0EC] transition flex items-center gap-1.5"
            >
              <Facebook className="w-4 h-4 text-[#1877F2]" /> Facebook
            </a>
            <a 
              href={`mailto:?subject=${shareTitle}&body=${currentUrl}`} 
              className="border border-[#E2E5E0] bg-white rounded-[6px] py-2 px-3.5 text-[15px] text-[#1C2321] hover:bg-[#E8F0EC] transition flex items-center gap-1.5"
            >
              <Mail className="w-4 h-4 text-[#586159]" /> Email
            </a>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-[#14221D] text-[#C5D0CA] py-8 text-[15px]">
        <div className="max-w-[1080px] mx-auto px-5 flex flex-wrap justify-between gap-3 items-center">
          <span>© 2026 ReviewDesk</span>
          <span>Creato da <a href="https://sititicino.ch" target="_blank" rel="noopener" className="text-white underline">Connect &amp; Create</a></span>
        </div>
      </footer>
    </div>
  );
};
