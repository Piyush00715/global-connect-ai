# Global Connect: AI-Powered Multilingual Voice & Text Chat

Welcome to **Global Connect**, a cutting-edge communication platform designed to completely break down language barriers. Combining real-time chat with instantaneous AI translation, it allows users speaking entirely different languages to communicate seamlessly through intuitive text and hands-free voice-to-voice communication, guided by an interactive AI Avatar.

## 🚀 The Problem
In an increasingly connected world, language differences remain a massive hurdle for cross-cultural collaboration, global customer support, and personal relationships. 
Traditional chat translators are slow and disjointed. Voice calls between people who speak different languages are generally impossible without human interpreters. Existing translation tools lack the real-time, bidirectional fluidity needed for natural conversation.

## 💡 Our Solution
Global Connect provides a unified, continuous interface for cross-linguistic communication:
1. **Real-Time Text Translation**: Users select their native language. All incoming text messages are instantly translated into their language using advanced LLMs (Google Gemini), preserving cultural context and warning against ambiguous phrasing.
2. **"Call Mode" (Continuous Speech-to-Speech)**: Instead of push-to-talk, users can switch on Call Mode for rapid, continuous voice interaction. The browser's Speech Recognition converts spoken sentences to text, the backend translates it, and the other user's browser reads the translated message aloud using an ultra-realistic AI voice.
3. **Interactive AI Avatar**: The platform is centered around a responsive AI Avatar that visually signals when the application is listening to your voice or translating/speaking to the recipient, making the whole interaction feel much more natural and human.
4. **Cultural Clarifications**: The underlying AI can parse the nuances of the text and warn a user if their sent message might be overly direct or confusing within the recipient's language context, offering better alternatives automatically.

---

## 🛠️ Tech Stack & Architecture

### Frontend (User Interface & Audio Processing)
- **Framework**: [Next.js](https://nextjs.org/) (React 19) with App Router.
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) & [Shadcn UI](https://ui.shadcn.com/) for a premium, responsive interface.
- **State Management**: [Zustand](https://github.com/pmndrs/zustand) for lightweight, predictable global state.
- **Real-Time Client**: `socket.io-client` for persistent, low-latency duplex connections.
- **Voice Capabilities**: 
  - **Speech-to-Text (STT)**: Native Web Speech API integrated with custom continuous looping hooks for Call Mode.
  - **Text-to-Speech (TTS)**: [ElevenLabs API](https://elevenlabs.io/) for high-fidelity multi-language voice synthesis, intelligently falling back to the browser's native `speechSynthesis` engine if an API key isn't provided.

### Backend (Handling state, NLP, & Routing)
- **Runtime**: [Node.js](https://nodejs.org/) & [Express.js](https://expressjs.com/) built with TypeScript.
- **Real-Time Server**: [Socket.io](https://socket.io/) handling language-specific user join events, typing indicators, and message broadcasts.
- **LLM / GenAI Integration**: [@google/genai](https://www.npmjs.com/package/@google/genai) using Google Gemini to handle the logic for high-fidelity translations and ambiguity resolution.
- **Database/ORM**: [Prisma](https://www.prisma.io/) (Included for future persisting of user accounts, statistics, and historical chat routing).

---

## 💻 Getting Started (Local Development)

### 1. Clone & Setup
Clone the repository and install dependencies in both the `frontend` and `backend` directories.
```bash
# In the backend directory
cd backend
npm install

# In the frontend directory
cd frontend
npm install
```

### 2. Environment Configuration
**Backend Variables**  
Create a `.env` file in the `backend/` root:
```env
GEMINI_API_KEY="your-google-gemini-api-key"
PORT=3001
# Add DATABASE_URL if using Prisma for persistence
```

**Frontend Variables**  
Create a `.env.local` file in the `frontend/` root:
```env
# Optional but highly recommended for realistic AI voice:
NEXT_PUBLIC_ELEVENLABS_API_KEY="your-elevenlabs-api-key"
```

### 3. Start the Application

Start the backend server:
```bash
cd backend
npm run dev
```

Start the frontend server:
```bash
cd frontend
npm run dev
```

Visit `http://localhost:3000` to open multiple browser tabs for testing!

---

## 🎧 Using "Call Mode"
1. Open up two separate browser tabs representing User A and User B.
2. Select target languages for each tab (e.g., English on Tab A, Spanish on Tab B).
3. Both users can click the Green **Phone Icon** beneath the AI Avatar to enter **Call Mode**.
4. Speak naturally into your microphone! As you complete your sentences, they are instantly translated and spoken aloud to the other user via the AI Avatar using their preferred language.
