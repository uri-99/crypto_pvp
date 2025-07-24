import { Game, WagerAmount } from '../App';
import { ArrowLeft } from 'lucide-react';

interface GamePlayResultsProps {
  currentGameData: Game;
  mySelectedMove: 'rock' | 'paper' | 'scissors';
  opponentMove: 'rock' | 'paper' | 'scissors';
  onBack: () => void;
  getWagerDisplay: (wager: WagerAmount) => string;
}

export function GamePlayResults({
  currentGameData,
  mySelectedMove,
  opponentMove,
  onBack,
  getWagerDisplay
}: GamePlayResultsProps) {
  const getMoveEmoji = (move: string | undefined) => {
    switch (move) {
      case 'rock': return '🪨';
      case 'paper': return '📄';
      case 'scissors': return '✂️';
      default: return '❓';
    }
  };

  // Determine winner
  const determineWinner = (playerMove: string, opponentMove: string) => {
    if (playerMove === opponentMove) return 'tie';
    if (
      (playerMove === 'rock' && opponentMove === 'scissors') ||
      (playerMove === 'paper' && opponentMove === 'rock') ||
      (playerMove === 'scissors' && opponentMove === 'paper')
    ) {
      return 'win';
    }
    return 'lose';
  };

  const result = determineWinner(mySelectedMove, opponentMove);

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

      <div className="text-center mb-4">
        <div style={{ fontSize: '4.5rem', marginBottom: '1rem' }}>
          {result === 'win' && '🎉'}
          {result === 'lose' && '💀'}
          {result === 'tie' && '🤝'}
        </div>
        <h1 className="text-3xl font-extrabold mb-4">
          {result === 'win' && 'YOU WIN!'}
          {result === 'lose' && 'YOU LOSE!'}
          {result === 'tie' && 'IT\'S A TIE!'}
        </h1>
        <div className="grid grid-2 gap-6 mb-4">
          <div className="card">
            <h3 className="text-xl font-semibold mb-4">You</h3>
            <div style={{ fontSize: '3rem', marginBottom: '0.25rem' }}>{getMoveEmoji(mySelectedMove)}</div>
          </div>
          
          <div className="card">
            <h3 className="text-xl font-semibold mb-4">Opponent</h3>
            <div style={{ fontSize: '3rem', marginBottom: '0.25rem' }}>{getMoveEmoji(opponentMove)}</div>
          </div>
        </div>

        <p className="text-xl mb-6">
          {result === 'win' && `Your ${mySelectedMove} beats their ${opponentMove}!`}
          {result === 'lose' && `Their ${opponentMove} beats your ${mySelectedMove}!`}
          {result === 'tie' && `Both chose ${mySelectedMove} - it's a tie!`}
        </p>

        <div className="text-center">
          <button 
            onClick={onBack}
            className="btn btn-primary btn-large"
          >
            🎮 Play Again
          </button>
        </div>
      </div>
    </div>
  );
} 