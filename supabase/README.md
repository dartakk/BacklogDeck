# Supabase deployment

The migration creates the social tables/policies, the avatar storage bucket, and the Steam ownership fields. The Steam Edge Function verifies Steam OpenID on the server and uses the Steam API key only in Edge Function secrets.

Link the CLI to the existing Supabase project, then apply the migration and deploy the function:

```bash
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
npx supabase secrets set STEAM_API_KEY=YOUR_STEAM_API_KEY STEAM_STATE_SECRET=YOUR_LONG_RANDOM_SECRET
npx supabase secrets set STEAM_WEB_REDIRECT_ORIGINS=https://your-app.example.com
npx supabase functions deploy steam-connect
npx supabase functions deploy gaming-news
```

Replace the example values with your project ref, Steam Web API key, a long random state-signing secret, and the exact HTTPS app origin before running the commands. Do not commit real secret values. Native Steam callbacks use the `backlogdeck` scheme already declared in `app.json`; test that flow in a development or production build rather than Expo Go.
