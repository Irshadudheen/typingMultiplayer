<img width="1280" height="640" alt="git (1)" src="https://github.com/user-attachments/assets/8920b256-2ba8-4988-b824-5351134eb4bd" />



# Typing Multiplayer Roast

[Live site](https://typingmultiplayerroast.vercel.app/)


## Basic Details
### Team Name: Typing Multiplayer


### Team Members
- Team Lead: Irshadudheen P - EMEA College of Arts and Science 


### Project Description
A real-time multiplayer typing platform where users can create or join typing races and compete with others.

Track your WPM, accuracy, progress, and mistakes while racing through the same text in real time.

### The Problem (that doesn't exist)
People are getting dangerously good at typing alone — so we created a completely unnecessary way to turn typing practice into a multiplayer race.

### The Solution (that nobody asked for)
Turn typing practice into a chaotic multiplayer race with Malayalam voice effects, live competition, and real-time typing battles — because apparently typing alone wasn't stressful enough. 😄

## Technical Details
### Technologies/Components Used
For Software:
- TypeScript
- Astro with React islands
- React Hooks, Supabase Client
- Git, Supabase



### Implementation
For Software:
# Installation
npm install

# Environment
copy .env.example .env

# Add your Supabase project URL and publishable key to .env, then restart the dev server.

# Run
npm run dev

## Deploy to Cloudflare Pages

This is a static Astro site, so it can be deployed directly to Cloudflare Pages.

### Cloudflare dashboard

1. Push this repository to GitHub or GitLab.
2. In Cloudflare, open **Workers & Pages** and choose **Create application > Pages > Connect to Git**.
3. Select this repository.
4. Use these build settings:

	- **Framework preset:** Astro
	- **Build command:** `npm run build`
	- **Build output directory:** `dist`

5. Add these variables under **Settings > Environment variables > Production**:

	- `PUBLIC_SUPABASE_URL`: your Supabase project URL
	- `PUBLIC_SUPABASE_PUBLISHABLE_KEY`: your Supabase publishable key

6. Save and deploy. Add the same variables to the Preview environment if preview deployments need Supabase access.

Only the publishable Supabase key belongs in these variables. Never add `SUPABASE_SERVICE_ROLE_KEY` to Cloudflare Pages environment variables used by the browser.

### Cloudflare CLI

After authenticating with Wrangler, build and deploy the generated `dist` folder:

```bash
npx wrangler login
npm run build
npx wrangler pages deploy dist --project-name typing-multiplayer-roast
```

The repository includes `wrangler.toml` with the Pages output directory configured.

### Project Documentation
For Software:

# Screenshots
![Screenshot 1](screenshot/image.png)
*Application landing page and race setup.*

![Screenshot 2](screenshot/image2.png)
*Multiplayer room and player readiness screen.*

![Screenshot 3](screenshot/image3.png)
*Live typing race and player progress.*


---
Made with ❤️ at TinkerHub Useless Projects 

![Static Badge](https://img.shields.io/badge/TinkerHub-24?color=%23000000&link=https%3A%2F%2Fwww.tinkerhub.org%2F)
![Static Badge](https://img.shields.io/badge/UselessProjects--26-26?link=https%3A%2F%2Ftinkerhub.org%2Fevents%2F1M8ORET9A1%2Fuseless-projects-3.0)


