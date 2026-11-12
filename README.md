# Soldini 🌈 — App privata per la famiglia

Versione 1: entrate, uscite, categorie libere, data, nota, correzione e cancellazione dei movimenti; bilanci Personale, Casa/Negozio condivisi e totale globale; grafici e filtri; esportazione CSV. Interfaccia mobile iPhone/Android. **Non è ancora online:** occorre configurare Firebase e pubblicare i file.

## Perché questa soluzione
- **Accesso separato:** ciascun familiare usa email/password proprie.
- **Dati personali privati:** i movimenti sotto `users/{uid}/transactions` sono accessibili solo al proprietario.
- **Spazi condivisi:** Casa/Negozio accessibili solo agli UID presenti nella lista `memberIds` dello spazio.
- **Totale globale:** somma il Personale e tutti gli spazi condivisi visibili **a quel singolo utente**, senza duplicare voci.
- I tre utenti possono avere un totale globale diverso, perché le loro spese private restano private.

## Installazione gratuita (una sola volta, fatta dal creatore dell'app)
1. Vai su https://console.firebase.google.com/ e crea un progetto **Spark (gratis)**. Non aggiungere un metodo di pagamento.
2. In **Authentication → Sign-in method**, abilita **Email/Password**.
3. In **Firestore Database**, crea un database Standard, scegli una regione europea e pubblica le regole contenute in `firestore.rules` nella sezione **Rules**. **Non lasciare le regole di test aperte**.
4. La configurazione Firebase Web del progetto **soldini-familia** è già inserita in `firebase-config.js`. Queste chiavi web sono identificatori pubblici; la sicurezza dipende dalle regole Firestore e dall'autenticazione.
5. Pubblica **tutti** i file della cartella su HTTPS. Soluzione pratica: crea su GitHub un repository pubblico dedicato al **solo codice** (mai password, esportazioni CSV o dati finanziari). Carica i file; in **Settings → Pages** seleziona Deploy from branch → main → /(root). Otterrai un URL pubblico per l'interfaccia, **non per i dati**, che sono protetti da login e regole Firebase. GitHub Pages non è un sito privato.
6. In **Firebase Authentication → Settings → Authorized domains** aggiungi il dominio della pagina, ad esempio `tuonome.github.io`, se non è già autorizzato.
7. Apri l'URL su Safari iPhone → Condividi → **Aggiungi alla schermata Home**. Manda lo stesso URL ai genitori perché facciano lo stesso.

## Prima configurazione della famiglia
1. Accedi con l’account già creato in Firebase Authentication (tu).
2. Crea gli spazi condivisi «Casa» e «Negozio» da **Gestisci spazi**.
3. Mamma e papà accedono con gli account già creati in Firebase Authentication. Tu hai già i loro UID nelle Note.
4. Tu incolli ciascun UID nello spazio da condividere e premi **Autorizza**. Dopo pochi secondi, lo spazio appare anche nel loro telefono.
5. «Personale» rimane sempre privato; «Tutto insieme» mostra i dati personali dell'utente corrente e gli spazi condivisi autorizzati.

## Backup e avvertenze
- Usa **⬇ CSV** periodicamente, impostando prima **Tutto** e **Tutto insieme**, per esportare tutte le operazioni visibili al tuo account. CSV non è ancora una funzione di ripristino automatico.
- Non caricare dati reali prima di aver configurato correttamente le regole Firestore; verifica l'accesso con due account di prova.
- Il piano Firebase Spark ha limiti gratuiti, normalmente sufficienti per 3 utenti, non una garanzia di disponibilità perpetua.
- Le spese sono importi positivi distinti per tipo, non una contabilità bancaria. Non gestisce ancora trasferimenti tra conti, gestione stock, IVA, ricevute, bilanci fiscali o valute diverse.
- Per semplicità l'amministratore può aggiungere membri tramite UID; non c'è ancora revoca dei membri nell'interfaccia. Si possono aggiornare i membri dalla console Firestore mantenendo sempre l'UID del proprietario.
- Accesso a internet necessario per la sincronizzazione. Non è implementata una modalità offline certificata o un backup automatico.

## Struttura
- `index.html`: interfaccia
- `style.css`: stile A, colorato
- `app.js`: logica e sincronizzazione Firebase
- `firebase-config.js`: configurazione da compilare
- `firestore.rules`: regole di privacy da pubblicare
- `manifest.webmanifest` e `icon.svg`: icona della app su telefono

## Stato della versione collegata a Firebase (12 novembre 2026)
- `firebase-config.js` compilato con la configurazione web che hai fornito. Nessuna password nel codice.
- Disattivata nell’interfaccia la registrazione libera: i tre utenti sono creati manualmente in Firebase Authentication.
- **IMPORTANTE:** questa limitazione UI non impedisce da sola registrazioni esterne tramite API Firebase; le regole Firestore devono **sempre** contenere l’elenco autorizzato dei 3 UID.
- L'app è pronta come pacchetto di file statici, ma **non è ancora pubblicata** né collaudata con dispositivi reali.
- Le regole Firestore pubblicate dall'utente devono essere compatibili con i percorsi `users/{uid}/transactions` e `spaces/{id}/transactions`, e con il formato `{kind,amount,category,date,note,createdAt,createdBy}`.
- Non inserire spese reali prima di provare che gli account non possano vedere i movimenti privati altrui.

## Come pubblicare dal telefono tramite GitHub Pages (senza terminale)
1. Dall'app File su iPhone, estrai l'archivio ZIP. Nella cartella `portafoglio-famiglia` trovi 8 file.
2. Apri `github.com` su Safari e crea un account (se necessario). Crea un nuovo repository **public** chiamato per esempio `soldini-famiglia`. Questo pubblica il **codice dell'interfaccia**; non le spese nel database.
3. Apri il repository → `Add file` → `Upload files`, seleziona e carica gli 8 file **dentro** `portafoglio-famiglia` nella **radice** del repository (non la cartella stessa). Se la vista mobile nasconde i controlli, usa Safari → `aA` → `Richiedi sito desktop`.
4. Apri `Settings` → `Pages` → `Build and deployment` → Source `Deploy from a branch` → branch `main`, folder `/(root)`, `Save`.
5. Il link comparirà nella pagina `Pages`, in forma `https://NOMEUTENTE.github.io/soldini-famiglia/`. Controlla il link effettivo in GitHub, non presumere il tuo nome utente.
6. In Firebase Console → Authentication → Impostazioni → Domini autorizzati, aggiungi `NOMEUTENTE.github.io` **senza https o percorso**, se richiesto.
7. Apri l'URL su Safari iPhone → Condividi → `Aggiungi alla schermata Home`. Manda l'URL ai genitori. L'accesso è via email e password una volta per dispositivo; possono verificarsi richieste di login quando la sessione non è più valida.

**N.B.** Hosting GitHub Pages e piano Spark sono gratuiti per questo uso entro i limiti correnti; Github Pages è pubblico. Il login protegge i dati in Firestore soltanto se le regole sono corrette.
