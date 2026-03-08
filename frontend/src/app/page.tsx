import ChatInterface from '@/components/ChatInterface';

export const metadata = {
  title: 'Global Connect - Multilingual Chat',
  description: 'AI-powered real-time multilingual chat application',
};

export default function Home() {
  return (
    <main className="flex h-screen w-full bg-slate-100 overflow-hidden">
      {/* Sidebar - Optional for later scalability (history etc) */}
      <div className="hidden md:flex w-80 flex-col bg-white border-r border-slate-200 shadow-sm z-20 transition-all duration-300">
        <div className="p-6 border-b border-slate-100">
          <h1 className="text-2xl font-extrabold text-indigo-600 tracking-tight flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center">G</span>
            GlobalSync
          </h1>
          <p className="text-sm text-slate-500 mt-2 font-medium">Real-time Cross-Cultural Chat</p>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          <div className="text-xs uppercase font-bold text-slate-400 mb-3 px-2 tracking-wider">Active Conversations</div>
          <div className="p-3 bg-indigo-50/50 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors border border-indigo-100">
            <h3 className="font-semibold text-slate-800 text-[15px]">General Connect</h3>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-500"></span> Online now
            </p>
          </div>
        </div>

        <div className="p-4 border-t border-slate-100 text-xs text-slate-400 flex items-center justify-between">
          <span>End-to-End Encrypted</span>
        </div>
      </div>
      
      {/* Chat Area */}
      <div className="flex-1 flex flex-col h-full z-10">
        <ChatInterface />
      </div>
    </main>
  );
}
