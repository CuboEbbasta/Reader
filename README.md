# Assistente Personale — Prima versione (fondamenta)

Questa è la prima "fetta" del progetto, come deciso insieme: **routine + task con
cascata temporale + vista di oggi (quadrante 24h) + notifiche offline**, sia per
Android (vera app installabile, .apk) sia per PC (app Electron, si apre come
programma vero, non nel browser).

Tutto funziona **offline, senza server**: i dati restano sul dispositivo, e per
tenere allineati telefono e PC si usa l'esportazione/importazione manuale di un
file .json (Impostazioni → Backup).

## Cosa NON c'è ancora (arriverà nelle prossime versioni)
Dieta, workout ("schede"), obiettivi (1 mese/6 mesi/1 anno/5-10 anni), daily
journaling, vista mese/12 mesi, storico + recap, import calendario lezioni/lavoro,
integrazione con Ollama. La struttura dati (vedi `www/js/storage.js`) è pensata
per poterli aggiungere senza riscrivere quanto già fatto.

## Prima di iniziare
Serve **Node.js** (versione 18 o superiore) installato sul PC:
https://nodejs.org

---

## 1. Installazione dei pacchetti (una volta sola)

Apri un terminale nella cartella del progetto:

```
npm install
```

Questo comando scarica Capacitor e, in automatico, copia anche i file
necessari al funzionamento offline (vedi `scripts/copy-vendor.js`, si attiva da
solo — non serve lanciarlo a mano).

---

## 2. App Android (.apk)

### Opzione A — hai un PC (più semplice, consigliata)

Serve **Android Studio** (gratuito): https://developer.android.com/studio
(la prima volta, all'apertura, ti farà scaricare l'SDK Android: segui la
procedura guidata, richiede una decina di minuti).

1. Ogni volta che modifichi qualcosa dentro `www/`, esegui:
   ```
   npm run sync:android
   ```
   (copia le modifiche dentro il progetto Android). La primissima volta è già
   stato fatto, quindi puoi saltare questo passo e andare al punto 2.

2. Apri la cartella `android/` con Android Studio
   (oppure lancia `npm run open:android`).

3. Aspetta che Android Studio finisca di scaricare le dipendenze la prima volta
   (barra in basso). Poi collega il telefono via USB (con il **debug USB**
   attivo nelle opzioni sviluppatore) oppure usa un emulatore, e premi ▶ Run.

   In alternativa, per generare il file .apk da installare manualmente:
   **Build → Build App Bundle(s) / APK(s) → Build APK(s)**. Il file compare in
   `android/app/build/outputs/apk/debug/app-debug.apk`: copialo sul telefono e
   installalo (Android chiederà di autorizzare "sorgenti sconosciute" la prima
   volta).

### Opzione B — solo da telefono, nessun PC (build in cloud gratuita)

Il file `.github/workflows/build-apk.yml`, già incluso, fa compilare l'APK ai
server gratuiti di GitHub. Tutto da browser sul telefono:

1. Crea un account su https://github.com (gratuito) se non ne hai già uno.
2. Crea un nuovo repository (in alto a destra → "New repository"), anche
   privato. Non serve spuntare nulla, basta dargli un nome.
3. Estrai lo zip di questo progetto con un file manager del telefono
   (es. "File" / "Files by Google", tasto destro/menu → Estrai).
4. Nella pagina del repository su github.com, tocca **"Add file" → "Upload
   files"** e seleziona/trascina tutti i file e le cartelle estratte (alcuni
   browser mobile permettono di scegliere un'intera cartella dalla galleria
   file; se il tuo non lo fa, carica prima le cartelle principali una alla
   volta: `www`, `android`, `.github`, poi i file singoli nella radice).
5. Conferma il commit ("Commit changes").
6. Vai nella scheda **"Actions"** del repository: la build parte da sola
   (oppure, se non parte, tocca il workflow "Build APK" → "Run workflow").
   Impiega 3-5 minuti.
7. A build finita, vai nella scheda **"Releases"** (o nella pagina principale
   del repository, colonna destra) e scarica il file `app-debug.apk` allegato:
   è l'APK vero e proprio, pronto da installare (Android chiederà di
   autorizzare "sorgenti sconosciute" la prima volta).

Se qualche passaggio si incastra (upload di cartelle da mobile può essere
scomodo secondo il browser), dimmelo e troviamo un'alternativa insieme.

### Dopo l'installazione (entrambe le opzioni)

Alla prima apertura dell'app sul telefono, vai in **Impostazioni →
"Verifica permessi notifiche"** e conferma sia il permesso di notifica sia
quello di allarmi esatti: senza questi due, i promemoria non arrivano
puntuali (è una richiesta di sicurezza di Android, non un limite dell'app).

---

## 3. App PC (Electron)

```
cd desktop
npm install
npm start
```

Si apre una vera finestra dell'app (niente barra degli indirizzi, niente
Chrome). Per creare un file di installazione standalone (.exe su Windows,
.AppImage su Linux, .dmg su Mac) si può provare `npm run dist`: non l'ho
potuto testare in questo ambiente, quindi se qualcosa nella build non va,
dimmelo e sistemiamo insieme.

---

## 4. Sincronizzare telefono e PC

In **Impostazioni**:
- **"Esporta dati"**: salva un file `assistente-backup-AAAA-MM-GG.json`
  (su Android si apre il menu di condivisione — es. Google Drive, email;
  su PC compare una finestra di salvataggio normale).
- **"Importa e unisci"**: aggiunge i dati del file importato a quelli già
  presenti, senza cancellare nulla.
- **"Importa e sostituisci tutto"**: cancella i dati attuali e li rimpiazza
  con quelli del file (chiede conferma prima di procedere).

---

## 5. Cosa provare e segnalarmi

Dato che non ho un telefono/PC su cui testare, sono cose che si vedono solo
sull'uso reale:
- se le notifiche arrivano puntuali anche a schermo spento/app chiusa;
- se dopo un riavvio del telefono le notifiche di quel giorno vengono
  comunque programmate (l'app le programma quando la apri: se il telefono
  resta spento tutto il giorno, ovviamente no; è un limite ragionevole, ma
  fammi sapere se per te è un problema);
- l'aspetto grafico su schermi di dimensioni diverse.

## Struttura del progetto
```
assistente-personale/
  www/                  interfaccia + logica (usata sia da Android che da PC)
  android/              progetto nativo Android (generato da Capacitor)
  desktop/              wrapper Electron per PC
  scripts/copy-vendor.js
  test-smoke.js         test automatico interno (facoltativo, vedi sotto)
```

### (Facoltativo) Ri-eseguire il test automatico
Ho validato la logica (routine, cascata delle task, vista di oggi, notifiche,
export/import) con un test automatico in un browser simulato. Se in futuro
modifichi il codice e vuoi verificare che non si sia rotto nulla:
```
npm install --no-save jsdom
node test-smoke.js
```
