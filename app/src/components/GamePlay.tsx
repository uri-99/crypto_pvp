import { useState } from 'react';
import { Game, WagerAmount } from '../App';
import { ArrowLeft, Clock, Eye, EyeOff } from 'lucide-react';

interface GamePlayProps {
  game: Game;
  onRevealMoves: () => void;
  onBack: () => void;
  getWagerDisplay: (_wager: WagerAmount) => string;
  playerAddress: string;
}

export function GamePlay({ game, onRevealMoves, onBack, getWagerDisplay, playerAddress }: GamePlayProps) {
  const [simulatedPlayer2Joined, setSimulatedPlayer2Joined] = useState(false);
  const [simulatedMovesCommitted, setSimulatedMovesCommitted] = useState(false);
  const [mySelectedMove, setMySelectedMove] = useState<'rock' | 'paper' | 'scissors' | null>(null);
  const [showRevealPage, setShowRevealPage] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [opponentMove, setOpponentMove] = useState<'rock' | 'paper' | 'scissors' | null>(null);
  
  const isPlayer1 = game.player1 === playerAddress;
  const isPlayer2 = game.player2 === playerAddress;
  const myMove = isPlayer1 ? game.player1Move : game.player2Move;
  
  // Game flow: waiting -> playing -> revealing -> finished
  // ONLY consider players joined if game.player2 exists AND we've simulated joining
  const realPlayer2Exists = game.player2 !== null && game.player2 !== undefined && game.player2 !== '';
  const bothPlayersJoined = realPlayer2Exists || simulatedPlayer2Joined;
  const bothPlayersCommitted = (game.player1Move && game.player2Move) || simulatedMovesCommitted;
  const canReveal = game.status === 'revealing' && bothPlayersCommitted;

  const getMoveEmoji = (move: string | undefined) => {
    switch (move) {
      case 'rock': return '🪨';
      case 'paper': return '📄';
      case 'scissors': return '✂️';
      default: return '❓';
    }
  };

  const getStatusMessage = () => {
    if (game.status === 'waiting' && !bothPlayersJoined) {
      return "Waiting for another player to join...";
    }
    if (game.status === 'waiting' && bothPlayersJoined && !bothPlayersCommitted) {
      return "Rock, Paper, Scissors... GO!";
    }
    if (game.status === 'revealing') {
      return "Both players have made their moves! Click to reveal.";
    }
    return "Game in progress...";
  };

  // Determine winner
  const getRandomOpponentMove = (): 'rock' | 'paper' | 'scissors' => {
    const moves = ['rock', 'paper', 'scissors'] as const;
    return moves[Math.floor(Math.random() * moves.length)];
  };

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

  // Show results page
  if (showResults && mySelectedMove && opponentMove) {
    const result = determineWinner(mySelectedMove, opponentMove);
    
    return (
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={onBack} className="btn btn-secondary">
            <ArrowLeft size={16} />
          </button>
          <div>
            <h2 className="text-2xl font-bold">Game #{game.id}</h2>
            <p className="text-secondary">Wager: {getWagerDisplay(game.wager)}</p>
          </div>
        </div>

        <div className="text-center mb-8">
          <div style={{ fontSize: '7rem', marginBottom: '1.5rem' }}>
            {result === 'win' && '🎉'}
            {result === 'lose' && '💀'}
            {result === 'tie' && '🤝'}
          </div>
          <h1 className="text-4xl font-extrabold mb-6">
            {result === 'win' && 'YOU WIN!'}
            {result === 'lose' && 'YOU LOSE!'}
            {result === 'tie' && 'IT\'S A TIE!'}
          </h1>
          <div className="grid grid-2 gap-8 mb-6">
            <div className="card">
              <h3 className="text-xl font-semibold mb-4">You</h3>
              <div style={{ fontSize: '5rem', marginBottom: '0.5rem' }}>{getMoveEmoji(mySelectedMove)}</div>
            </div>
            
            <div className="card">
              <h3 className="text-xl font-semibold mb-4">Opponent</h3>
              <div style={{ fontSize: '5rem', marginBottom: '0.5rem' }}>{getMoveEmoji(opponentMove)}</div>
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

  // Show reveal page
  if (showRevealPage && !showResults) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={onBack} className="btn btn-secondary">
            <ArrowLeft size={16} />
          </button>
          <div>
            <h2 className="text-2xl font-bold">Game #{game.id}</h2>
            <p className="text-secondary">Wager: {getWagerDisplay(game.wager)}</p>
          </div>
        </div>

        <div className="flex justify-center">
          <div style={{
            background: 'var(--surface)',
            borderRadius: '24px',
            padding: '3rem 2rem',
            boxShadow: '0 0 32px 4px rgba(99,102,241,0.25)',
            border: '2px solid var(--primary)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            width: '100%',
            maxWidth: 480
          }}>
            <div style={{ fontSize: '5rem', marginBottom: '1.5rem', filter: 'drop-shadow(0 0 16px #6366f1)' }}>
              👁️
            </div>
            <h1 className="text-4xl font-extrabold mb-4" style={{color: 'rgba(255,255,255,0.95)'}}>Moment of Truth!</h1>
            <p className="text-lg mb-8" style={{color: 'rgba(255,255,255,0.75)', textAlign: 'center'}}>Both players have locked in their moves.<br/>Are you ready to reveal?</p>
            <button 
              onClick={() => {
                setOpponentMove(getRandomOpponentMove());
                setShowResults(true);
              }}
              className="btn btn-success btn-large"
              style={{ fontSize: '1.5rem', padding: '20px 48px', boxShadow: '0 0 16px 2px #10b98155' }}
            >
              🎯 Reveal Now
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show waiting for other player page
  if (mySelectedMove && !showRevealPage) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={onBack} className="btn btn-secondary">
            <ArrowLeft size={16} />
          </button>
          <div>
            <h2 className="text-2xl font-bold">Game #{game.id}</h2>
            <p className="text-secondary">Wager: {getWagerDisplay(game.wager)}</p>
          </div>
        </div>

        <div className="text-center mb-8">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary border-t-transparent mx-auto mb-6"></div>
          <h2 className="text-3xl font-bold mb-4">Waiting for other player...</h2>
          <p className="text-xl text-secondary mb-6">You chose: {getMoveEmoji(mySelectedMove)} {mySelectedMove}</p>
          <p className="text-secondary">Waiting for opponent to make their move</p>
        </div>

        <div className="text-center">
          <button 
            className="btn btn-secondary btn-small"
            onClick={() => setShowRevealPage(true)}
          >
            🧪 Simulate Other Player Moved
          </button>
        </div>
      </div>
    );
  }

  // ONLY show rock paper scissors page when we explicitly simulate player 2 joining
  if (simulatedPlayer2Joined && !mySelectedMove) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={onBack} className="btn btn-secondary">
            <ArrowLeft size={16} />
          </button>
          <div>
            <h2 className="text-2xl font-bold">Game #{game.id}</h2>
            <p className="text-secondary">Wager: {getWagerDisplay(game.wager)}</p>
          </div>
        </div>

        {/* BIG ROCK PAPER SCISSORS PAGE */}
        <div className="text-center mb-8">
          <h2 className="text-4xl font-bold mb-6" style={{color: 'rgba(255,255,255,0.88)'}}>Rock, Paper, Scissors... SHOOT!</h2>
        </div>

        <div className="grid grid-3 gap-6 mb-8">
          {[
            { value: 'rock' as const, emoji: '🪨', name: 'Rock' },
            { value: 'paper' as const, emoji: '📄', name: 'Paper' },
            { value: 'scissors' as const, emoji: '✂️', name: 'Scissors' },
          ].map((option) => (
            <button
              key={option.value}
              onClick={() => setMySelectedMove(option.value)}
              className={`move-option ${mySelectedMove === option.value ? 'selected' : ''}`}
              style={{ padding: '2rem', minHeight: '160px' }}
            >
              <div style={{ fontSize: '6rem', marginBottom: '0.5rem' }}>{option.emoji}</div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={onBack} className="btn btn-secondary">
          <ArrowLeft size={16} />
        </button>
        <div>
          <h2 className="text-2xl font-bold">Game #{game.id}</h2>
          <p className="text-secondary">Wager: {getWagerDisplay(game.wager)}</p>
        </div>
      </div>

      {/* Game Status */}
      <div className="card mb-6 text-center">
        <div className="flex items-center justify-center gap-2 mb-4">
          <Clock size={20} />
          <h3 className="text-xl font-semibold">Game Status</h3>
        </div>
        
        <p className="text-secondary mb-4">{getStatusMessage()}</p>
        
        <div className={`status-badge ${
          game.status === 'waiting' && !bothPlayersJoined ? 'status-waiting' :
          game.status === 'waiting' && bothPlayersJoined ? 'status-active' :
          game.status === 'revealing' ? 'status-active' :
          'status-finished'
        }`}>
          {game.status === 'waiting' && !bothPlayersJoined && '⏳ Waiting'}
          {game.status === 'waiting' && bothPlayersJoined && '⚡ Playing'}
          {game.status === 'revealing' && '👁️ Ready to Reveal'}
          {game.status === 'finished' && '✅ Finished'}
        </div>
        
        {/* Test button to skip to reveal phase */}
        {bothPlayersJoined && !bothPlayersCommitted && (
          <button 
            className="btn btn-secondary btn-small mt-3"
            onClick={() => setSimulatedMovesCommitted(true)}
          >
            🧪 Skip to Reveal Phase
          </button>
        )}
      </div>

      {/* Players */}
      <div className="grid grid-2 gap-4 mb-6">
        {/* Player 1 */}
        <div className={`card ${isPlayer1 ? 'border-primary' : ''}`}>
          <div className="text-center">
            <div className="text-sm text-secondary mb-2">Player 1 {isPlayer1 && '(You)'}</div>
            <div className="text-sm font-mono text-secondary mb-4">
              {game.player1.slice(0, 8)}...
            </div>
            
            <div className="text-4xl mb-2">
              {game.player1Move ? (
                game.status === 'finished' ? getMoveEmoji(game.player1Move) : '🔒'
              ) : '⏳'}
            </div>
            
            <div className="text-sm">
              {!bothPlayersJoined && 'Waiting for player 2...'}
              {bothPlayersJoined && !bothPlayersCommitted && 'Ready to choose move!'}
              {bothPlayersCommitted && 'Move committed'}
            </div>
          </div>
        </div>

        {/* Player 2 */}
        <div className={`card ${isPlayer2 ? 'border-primary' : ''}`}>
          <div className="text-center">
            <div className="text-sm text-secondary mb-2">Player 2 {isPlayer2 && '(You)'}</div>
            <div className="text-sm font-mono text-secondary mb-4">
              {game.player2 ? `${game.player2.slice(0, 8)}...` : 
               simulatedPlayer2Joined ? 'simulated...' : 'Waiting...'}
            </div>
            
            <div className="text-4xl mb-2">
              {!bothPlayersJoined ? '⏳' :
               game.player2Move ? (
                 game.status === 'finished' ? getMoveEmoji(game.player2Move) : '🔒'
               ) : '⏳'}
            </div>
            
            <div className="text-sm">
              {!bothPlayersJoined && 'Waiting for player...'}
              {bothPlayersJoined && !bothPlayersCommitted && 'Ready to choose move!'}
              {bothPlayersCommitted && 'Move committed'}
            </div>
          </div>
        </div>
      </div>

      {/* Your Move Info - Only show when move is actually committed */}
      {myMove && bothPlayersCommitted && (
        <div className="card mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-2xl">{getMoveEmoji(myMove)}</div>
              <div>
                <div className="font-semibold">Your Move: {myMove}</div>
                <div className="text-sm text-secondary">
                  {game.status === 'finished' ? 'Revealed' : 'Hidden until reveal'}
                </div>
              </div>
            </div>
            {game.status !== 'finished' && (
              <div className="flex items-center gap-1 text-secondary">
                <EyeOff size={16} />
                <span className="text-sm">Secret</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Reveal Button */}
      {canReveal && (
        <div className="text-center">
          <button 
            onClick={onRevealMoves}
            className="btn btn-success btn-large"
          >
            <Eye size={20} />
            Reveal Moves!
          </button>
          <p className="text-sm text-secondary mt-2">
            Both players have committed their moves
          </p>
        </div>
      )}

      {/* Game Info */}
      <div className="card mt-6">
        <h4 className="font-semibold mb-2 text-center">Game Rules</h4>
        <div className="text-sm text-secondary space-y-1 text-center">
          <p>🪨 Rock crushes Scissors</p>
          <p>📄 Paper covers Rock</p>
          <p>✂️ Scissors cut Paper</p>
        </div>
        <div className="text-sm text-accent mt-3 text-center">
          Winner takes {getWagerDisplay(game.wager)} • Ties split the pot
        </div>
      </div>

      {/* Less intrusive simulate player 2 joining button at the bottom */}
      {game.status === 'waiting' && !bothPlayersJoined && (
        <div style={{ width: '100%', display: 'flex', justifyContent: 'center', marginTop: 32 }}>
          <button 
            className="btn btn-secondary btn-small"
            onClick={() => setSimulatedPlayer2Joined(true)}
          >
            🧪 Simulate Player 2 Joining
          </button>
        </div>
      )}
    </div>
  );
} 