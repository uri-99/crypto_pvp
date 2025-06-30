import { Plus, Users, Trophy } from 'lucide-react';

interface HomeProps {
  onCreateGame: () => void;
  onJoinGame: () => void;
}

export function Home({ onCreateGame, onJoinGame }: HomeProps) {
  return (
    <div className="max-w-2xl mx-auto">
      {/* Title Section */}
      <div className="card mb-6 text-center" style={{background: 'var(--surface)'}}>
        <h2 className="text-4xl font-extrabold mb-2" style={{color: 'rgba(255,255,255,0.88)'}}>⚔️ Crypto PvP</h2>
        <p className="text-lg mb-1" style={{color: 'rgba(255,255,255,0.80)'}}>Challenge opponents in rock-paper-scissors with SOL stakes!</p>
      </div>

      {/* Features Section */}
      <div className="card mb-6" style={{background: 'var(--surface)'}}>
        <div className="grid grid-3 gap-3">
          <div className="text-center">
            <div className="text-4xl mb-2">🎮</div>
            <div className="font-bold text-xl mb-1" style={{color: 'rgba(255,255,255,0.88)'}}>Rock Paper Scissors</div>
            <div className="text-base" style={{color: 'rgba(255,255,255,0.70)'}}>Classic game with crypto stakes</div>
          </div>
          <div className="text-center">
            <div className="text-4xl mb-2">💰</div>
            <div className="font-bold text-xl mb-1" style={{color: 'rgba(255,255,255,0.88)'}}>SOL Wagering</div>
            <div className="text-base" style={{color: 'rgba(255,255,255,0.70)'}}>0.01, 0.1, or 1 SOL per game</div>
          </div>
          <div className="text-center">
            <div className="text-4xl mb-2">⚡</div>
            <div className="font-bold text-xl mb-1" style={{color: 'rgba(255,255,255,0.88)'}}>Instant Results</div>
            <div className="text-base" style={{color: 'rgba(255,255,255,0.70)'}}>Fast and fair gameplay</div>
          </div>
        </div>
      </div>

      {/* How to Play Section */}
      <div className="card mb-6" style={{background: 'var(--surface)'}}>
        <h3 className="text-2xl font-bold mb-4 flex items-center gap-2" style={{color: 'rgba(255,255,255,0.88)'}}>
          <Trophy size={24} />
          How to Play
        </h3>
        <ol className="space-y-2 text-base list-decimal list-inside" style={{color: 'rgba(255,255,255,0.75)'}}>
          <li>
            <strong style={{color: 'rgba(255,255,255,0.88)'}}>Create a Game:</strong> Choose your wager amount and make your secret move
          </li>
          <li>
            <strong style={{color: 'rgba(255,255,255,0.88)'}}>Wait for Opponent:</strong> Another player joins and makes their move
          </li>
          <li>
            <strong style={{color: 'rgba(255,255,255,0.88)'}}>Reveal & Win:</strong> Both moves are revealed and winner takes the pot!
          </li>
        </ol>
      </div>

      {/* Action Buttons Section (no card) */}
      <div className="flex gap-4 justify-center mt-10">
        <button 
          onClick={onCreateGame}
          className="btn btn-primary btn-large text-xl font-bold text-white"
        >
          <Plus size={20} />
          Create Game
        </button>
        <button 
          onClick={onJoinGame}
          className="btn btn-success btn-large text-xl font-bold text-white"
        >
          <Users size={20} />
          Join Game
        </button>
      </div>
    </div>
  );
} 