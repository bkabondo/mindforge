import Link from 'next/link'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 text-white">
      {/* Navbar */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center font-bold text-sm">MF</div>
          <span className="font-bold text-xl">MindForge</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/login" className="text-slate-300 hover:text-white transition-colors">
            Log in
          </Link>
          <Link
            href="/decks/new"
            className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg font-medium transition-colors"
          >
            Demo
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-6 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 bg-purple-900/50 border border-purple-700/50 rounded-full px-4 py-1.5 text-sm text-purple-300 mb-6">
          <span className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></span>
          Powered by Claude AI
        </div>
        <h1 className="text-5xl md:text-7xl font-extrabold mb-6 bg-gradient-to-r from-white via-purple-200 to-blue-300 bg-clip-text text-transparent leading-tight">
          Turn Any Text Into a<br />Smart Study Deck
        </h1>
        <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-10">
          Paste your notes, articles, or textbook chapters. MindForge instantly generates intelligent flashcards and uses spaced repetition to maximize retention.
        </p>
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <Link
            href="/decks/new"
            className="bg-purple-600 hover:bg-purple-700 px-8 py-3 rounded-xl font-semibold text-lg transition-all hover:scale-105"
          >
            Demo
          </Link>
          <Link
            href="/login"
            className="border border-slate-600 hover:border-purple-500 px-8 py-3 rounded-xl font-semibold text-lg transition-all hover:scale-105"
          >
            Sign In
          </Link>
        </div>
      </section>

      {/* Card Flip Demo */}
      <section className="max-w-7xl mx-auto px-6 py-12 flex justify-center">
        <div style={{ perspective: '1000px' }}>
          <style>{`
            @keyframes demoFlip { 0%, 40% { transform: rotateY(0deg); } 50%, 90% { transform: rotateY(180deg); } 100% { transform: rotateY(0deg); } }
            .card-demo { width: 320px; height: 200px; position: relative; transform-style: preserve-3d; animation: demoFlip 4s ease-in-out infinite; }
            .card-demo-face { position: absolute; width: 100%; height: 100%; backface-visibility: hidden; border-radius: 16px; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 24px; }
            .card-demo-front { background: linear-gradient(135deg, #1e1b4b, #312e81); border: 1px solid #4c1d95; }
            .card-demo-back { background: linear-gradient(135deg, #14532d, #166534); border: 1px solid #15803d; transform: rotateY(180deg); }
          `}</style>
          <div className="card-demo">
            <div className="card-demo-face card-demo-front">
              <div className="text-xs text-purple-400 uppercase tracking-widest mb-3">Question</div>
              <div className="text-white text-center font-medium text-lg">What is spaced repetition?</div>
              <div className="text-purple-400 text-xs mt-4">Click to reveal answer</div>
            </div>
            <div className="card-demo-face card-demo-back">
              <div className="text-xs text-green-400 uppercase tracking-widest mb-3">Answer</div>
              <div className="text-white text-center font-medium text-sm">A learning technique that increases intervals between reviews to exploit the psychological spacing effect.</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <h2 className="text-3xl font-bold text-center mb-12 text-white">Everything you need to learn faster</h2>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 hover:border-purple-500/50 transition-colors">
            <div className="w-12 h-12 bg-purple-900/80 rounded-xl flex items-center justify-center text-2xl mb-4">🤖</div>
            <h3 className="text-xl font-semibold mb-2">AI Generation</h3>
            <p className="text-slate-400">Claude AI analyzes your text and creates 10-15 targeted flashcards covering key concepts, definitions, and relationships.</p>
          </div>
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 hover:border-purple-500/50 transition-colors">
            <div className="w-12 h-12 bg-blue-900/80 rounded-xl flex items-center justify-center text-2xl mb-4">🧠</div>
            <h3 className="text-xl font-semibold mb-2">Spaced Repetition</h3>
            <p className="text-slate-400">The SM-2 algorithm schedules reviews at optimal intervals so you review cards just before you would forget them.</p>
          </div>
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 hover:border-purple-500/50 transition-colors">
            <div className="w-12 h-12 bg-green-900/80 rounded-xl flex items-center justify-center text-2xl mb-4">📈</div>
            <h3 className="text-xl font-semibold mb-2">Progress Tracking</h3>
            <p className="text-slate-400">See how many cards are due today, track your learning streak, and watch your knowledge grow deck by deck.</p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-7xl mx-auto px-6 py-20 text-center">
        <div className="bg-gradient-to-r from-purple-900/50 to-blue-900/50 border border-purple-700/30 rounded-3xl p-12">
          <h2 className="text-4xl font-bold mb-4">Ready to forge your mind?</h2>
          <p className="text-slate-400 text-lg mb-8">Paste any text and get AI-generated flashcards in seconds — then study with spaced repetition.</p>
          <Link
            href="/decks/new"
            className="bg-purple-600 hover:bg-purple-700 px-10 py-4 rounded-xl font-semibold text-lg transition-all hover:scale-105 inline-block"
          >
            Demo It Free
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 px-6 py-8 text-center text-slate-500 text-sm">
        <p>MindForge &copy; 2026 &mdash; AI-powered spaced repetition learning</p>
      </footer>
    </div>
  )
}
