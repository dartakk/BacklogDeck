# BacklogDeck

BacklogDeck è un'app mobile per organizzare la propria libreria di videogiochi, scoprire notizie e scegliere a cosa giocare.

## Avvio

1. Installa le dipendenze

   ```bash
   npm install
   ```

2. Avvia l'app

   ```bash
   npx expo start
   ```

Scegli come avviare l'app:

- [Development build](https://docs.expo.dev/develop/development-builds/introduction/)
- Emulatore [Android](https://docs.expo.dev/workflow/android-studio-emulator/) o [iOS](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go)

La navigazione usa [Expo Router](https://docs.expo.dev/router/introduction/) e le schermate si trovano in `src/app/`.

## Struttura

- `src/app/`: schermate e navigazione
- `src/screens/`: componenti delle schermate
- `src/services/`: integrazioni Supabase e RAWG
- `assets/` e `images/`: risorse grafiche

## Controlli

```bash
npx expo lint
npx tsc --noEmit
```

## Servizi esterni

Per la sincronizzazione Steam e il feed news, applica la migrazione e distribuisci le Edge Function seguendo [supabase/README.md](supabase/README.md). La sincronizzazione Steam richiede profilo pubblico e segreti configurati nel progetto Supabase.
Amazon Associates è facoltativo: imposta `EXPO_PUBLIC_AMAZON_ASSOCIATES_TAG` nell'ambiente Expo per aggiungere il tuo tag ai link Amazon. Senza il tag, i pulsanti aprono normali ricerche nei negozi.
