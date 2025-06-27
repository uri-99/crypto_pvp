import { Game, WagerAmount } from '../App';
import { Trophy, RotateCcw, Home } from 'lucide-react';

interface GameResultProps {
  game: Game;
  onPlayAgain: () => void;
  onBackToHome: () => void;
  getWagerDisplay: (_wager: WagerAmount) => string;
  playerAddress: string;
}

export function GameResult({ game, onPlayAgain, onBackToHome, getWagerDisplay, playerAddress }: GameResultProps) {
  const isPlayer1 = game.player1 === playerAddress;
  
  const getMoveEmoji = (move: string | undefined) => {
    switch (move) {
      case 'rock': return '🪨';
      case 'paper': return '📄';
      case 'scissors': return '✂️';
      default: return '❓';
    }
  };

  const getResultInfo = () => {
    if (game.winner === 'tie') {
      return {
        title: "It's a Tie!",
        subtitle: "Both players chose the same move",
        color: 'text-warning',
        outcome: "Wagers returned to both players"
      };
    }
    
    const isWinner = 
      (game.winner === game.player1 && isPlayer1) ||
      (game.winner === game.player2 && !isPlayer1);
    
    if (isWinner) {
      return {
        title: "You Won! 🎉",
        subtitle: "Congratulations on your victory!",
        color: 'text-success',
        outcome: `You won ${getWagerDisplay(game.wager)} × 2 = ${getDoubleWager(game.wager)}`
      };
    } else {
      return {
        title: "You Lost",
        subtitle: "Better luck next time!",
        color: 'text-danger',
        outcome: `You lost ${getWagerDisplay(game.wager)}`
      };
    }
  };

  const getDoubleWager = (wager: WagerAmount): string => {
    switch (wager) {
      case 'sol1': return '2.0 SOL';
      case 'sol01': return '0.2 SOL';
      case 'sol001': return '0.02 SOL';
    }
  };

  const resultInfo = getResultInfo();

  return (
    <div className="max-w-2xl mx-auto text-center">
      {/* Result Header */}
      <div className="card mb-6">
        <div className={`text-6xl mb-4 ${resultInfo.color}`}>
          <Trophy size={64} className="mx-auto" />
        </div>
        <h2 className={`text-3xl font-bold mb-2 ${resultInfo.color}`}>
          {resultInfo.title}
        </h2>
        <p className="text-secondary mb-4">{resultInfo.subtitle}</p>
        <p className={`font-semibold ${resultInfo.color}`}>
          {resultInfo.outcome}
        </p>
      </div>

      {/* Game Summary */}
      <div className="card mb-6">
        <h3 className="text-xl font-semibold mb-4 text-center">Final Moves</h3>
        
        <div className="grid grid-2 gap-4">
          {/* Player 1 */}
          <div className={`card ${isPlayer1 ? 'border-primary' : ''}`}>
            <div className="text-center">
              <div className="text-sm text-secondary mb-2">
                Player 1 {isPlayer1 && '(You)'}
              </div>
              <div className="text-sm font-mono text-secondary mb-2">
                {game.player1.slice(0, 8)}...
              </div>
              <div className="text-4xl mb-2">
                {getMoveEmoji(game.player1Move)}
              </div>
              <div className="font-semibold capitalize">
                {game.player1Move}
              </div>
            </div>
          </div>

          {/* Player 2 */}
          <div className={`card ${!isPlayer1 ? 'border-primary' : ''}`}>
            <div className="text-center">
              <div className="text-sm text-secondary mb-2">
                Player 2 {!isPlayer1 && '(You)'}
              </div>
              <div className="text-sm font-mono text-secondary mb-2">
                {game.player2?.slice(0, 8)}...
              </div>
              <div className="text-4xl mb-2">
                {getMoveEmoji(game.player2Move)}
              </div>
              <div className="font-semibold capitalize">
                {game.player2Move}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Game Info */}
      <div className="card mb-6">
        <h4 className="font-semibold mb-3">Game Details</h4>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-secondary">Game ID:</span>
            <span className="font-mono">#{game.id}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-secondary">Wager:</span>
            <span className="text-accent font-semibold">{getWagerDisplay(game.wager)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-secondary">Started:</span>
            <span>{game.createdAt.toLocaleDateString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-secondary">Winner:</span>
            <span className={`font-semibold ${
              game.winner === 'tie' ? 'text-warning' :
              (game.winner === game.player1 && isPlayer1) || (game.winner === game.player2 && !isPlayer1) ? 'text-success' : 'text-danger'
            }`}>
              {game.winner === 'tie' ? 'Tie Game' : 
               (game.winner === game.player1 && isPlayer1) || (game.winner === game.player2 && !isPlayer1) ? 'You' : 'Opponent'}
            </span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4 justify-center">
        <button 
          onClick={onPlayAgain}
          className="btn btn-primary btn-large"
        >
          <RotateCcw size={20} />
          Play Again
        </button>
        <button 
          onClick={onBackToHome}
          className="btn btn-secondary btn-large"
        >
          <Home size={20} />
          Home
        </button>
      </div>

      {/* Game Rules Reminder */}
      <div className="card mt-6">
        <h4 className="font-semibold mb-2">How It Worked</h4>
        <div className="text-sm text-secondary space-y-1">
          <p>🪨 Rock crushes Scissors</p>
          <p>📄 Paper covers Rock</p>
          <p>✂️ Scissors cut Paper</p>
        </div>
      </div>
    </div>
  );
} 