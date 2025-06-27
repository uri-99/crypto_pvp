import { Plus, Users, Trophy } from 'lucide-react';

interface HomeProps {
  onCreateGame: () => void;
  onJoinGame: () => void;
}

export function Home({ onCreateGame, onJoinGame }: HomeProps) {
  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="text-center">
        <h2 className="text-4xl font-bold mb-4 text-center">
          ⚔️ Crypto PvP
        </h2>
        <p className="text-xl text-secondary mb-8">
          Challenge opponents in rock-paper-scissors with SOL stakes!
        </p>
        
        <div className="flex gap-4 justify-center">
          <button 
            onClick={onCreateGame}
            className="btn btn-primary btn-large"
          >
            <Plus size={20} />
            Create Game
          </button>
          <button 
            onClick={onJoinGame}
            className="btn btn-success btn-large"
          >
            <Users size={20} />
            Join Game
          </button>
        </div>
      </div>

      {/* Features Section */}
      <div className="grid grid-3 gap-6">
        <div className="card text-center">
          <div className="text-3xl mb-4">🎮</div>
          <h3 className="text-xl font-semibold mb-2">Rock Paper Scissors</h3>
          <p className="text-secondary">Classic game with crypto stakes</p>
        </div>
        <div className="card text-center">
          <div className="text-3xl mb-4">💰</div>
          <h3 className="text-xl font-semibold mb-2">SOL Wagering</h3>
          <p className="text-secondary">0.01, 0.1, or 1 SOL per game</p>
        </div>
        <div className="card text-center">
          <div className="text-3xl mb-4">⚡</div>
          <h3 className="text-xl font-semibold mb-2">Instant Results</h3>
          <p className="text-secondary">Fast and fair gameplay</p>
        </div>
      </div>

      {/* Getting Started */}
      <div className="card">
        <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Trophy size={20} />
          How to Play
        </h3>
        
        <div className="space-y-4 text-secondary">
          <div className="flex items-start gap-3">
            <span className="btn btn-primary" style={{ minHeight: '24px', padding: '0 8px', fontSize: '12px' }}>1</span>
            <p><strong className="text-text">Create a Game:</strong> Choose your wager amount and make your secret move</p>
          </div>
          <div className="flex items-start gap-3">
            <span className="btn btn-primary" style={{ minHeight: '24px', padding: '0 8px', fontSize: '12px' }}>2</span>
            <p><strong className="text-text">Wait for Opponent:</strong> Another player joins and makes their move</p>
          </div>
          <div className="flex items-start gap-3">
            <span className="btn btn-primary" style={{ minHeight: '24px', padding: '0 8px', fontSize: '12px' }}>3</span>
            <p><strong className="text-text">Reveal & Win:</strong> Both moves are revealed and winner takes the pot!</p>
          </div>
        </div>
      </div>
    </div>
  );
} 