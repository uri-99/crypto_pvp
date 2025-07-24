import { Game, WagerAmount } from '../App';
import { ArrowLeft } from 'lucide-react';

interface GamePlayWaitingForOpponentProps {
  currentGameData: Game;
  mySelectedMove: 'rock' | 'paper' | 'scissors' | null;
  onBack: () => void;
  getWagerDisplay: (wager: WagerAmount) => string;
}

export function GamePlayWaitingForOpponent({
  currentGameData,
  mySelectedMove,
  onBack,
  getWagerDisplay
}: GamePlayWaitingForOpponentProps) {
  const getMoveEmoji = (move: string | undefined) => {
    switch (move) {
      case 'rock': return '🪨';
      case 'paper': return '📄';
      case 'scissors': return '✂️';
      default: return '❓';
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={onBack} className="btn btn-secondary">
          <ArrowLeft size={16} />
        </button>
        <div>
          <h2 className="text-2xl font-bold mb-1">Game #{currentGameData.id}</h2>
          <p className="text-secondary">Wager: {getWagerDisplay(currentGameData.wager)}</p>
        </div>
      </div>

      <div className="text-center mb-8">
        <div className="animate-pulse" style={{ fontSize: '5rem', marginBottom: '1.5rem' }}>👁️</div>
        <h2 className="text-3xl font-bold mb-4">Move Revealed!</h2>
        <p className="text-xl text-secondary mb-6">You revealed: {mySelectedMove ? getMoveEmoji(mySelectedMove) : '❓'} {mySelectedMove}</p>
      </div>

      <div className="card mb-6" style={{ background: 'rgba(99, 102, 241, 0.1)', border: '2px solid rgba(99, 102, 241, 0.3)' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-3 border-primary border-t-transparent mx-auto mb-4"></div>
          <h3 className="text-xl font-bold mb-2" style={{ color: '#6366f1' }}>Waiting for opponent to reveal...</h3>
          <p className="text-secondary">The other player needs to reveal their move to determine the winner.</p>
        </div>
      </div>

      <div className="text-center">
        <p className="text-sm text-secondary">
          🔄 This page will automatically update when your opponent reveals their move
        </p>
      </div>
    </div>
  );
} 