import { useState } from 'react';
import { Game, WagerAmount } from '../App';
import { ArrowLeft, Copy, Check } from 'lucide-react';

interface GamePlaySaltBackupProps {
  game: Game;
  currentGameData: Game;
  gameState: 'WaitingForPlayer' | 'CommitPhase' | 'RevealPhase' | 'Finished';
  mySelectedMove: 'rock' | 'paper' | 'scissors';
  salt: string;
  onBack: () => void;
  onGoToReveal: () => void;
  getWagerDisplay: (wager: WagerAmount) => string;
}

export function GamePlaySaltBackup({
  game,
  currentGameData,
  gameState,
  mySelectedMove,
  salt,
  onBack,
  onGoToReveal,
  getWagerDisplay
}: GamePlaySaltBackupProps) {
  const [copyFeedback, setCopyFeedback] = useState<'salt' | 'all' | null>(null);

  const getMoveEmoji = (move: string | undefined) => {
    switch (move) {
      case 'rock': return '🪨';
      case 'paper': return '📄';
      case 'scissors': return '✂️';
      default: return '❓';
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopyFeedback('salt');
      setTimeout(() => setCopyFeedback(null), 2000);
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  };

  const copyAllGameData = async () => {
    const gameData = `GAME #${game.id} BACKUP DATA
=====================
Move: ${mySelectedMove}
Salt: ${salt}
Game ID: ${game.id}
Wager: ${getWagerDisplay(game.wager)}
Player Address: ${game.player1}
Backup Date: ${new Date().toISOString()}

⚠️ IMPORTANT: You need BOTH your move and salt to reveal later!
Keep this information safe until the game is finished.`;

    try {
      await navigator.clipboard.writeText(gameData);
      setCopyFeedback('all');
      setTimeout(() => setCopyFeedback(null), 3000);
    } catch (err) {
      console.error('Failed to copy game data: ', err);
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
        <div style={{ fontSize: '5rem', marginBottom: '1.5rem' }}>✅</div>
        <h2 className="text-3xl font-bold mb-4">Move Committed!</h2>
        <p className="text-xl text-secondary mb-6">You chose: {getMoveEmoji(mySelectedMove)} {mySelectedMove}</p>
      </div>

      {/* Backup info card always below header/button */}
      <div className="card mb-6" style={{ background: 'rgba(255, 193, 7, 0.1)', border: '2px solid rgba(255, 193, 7, 0.3)' }}>
        <h3 className="text-xl font-bold mb-4 text-center" style={{ color: '#ffc107' }}>⚠️ Important: Save Your Information!</h3>
        <div className="space-y-4">
          <div className="p-3 rounded-lg" style={{ background: 'rgba(0,0,0,0.2)' }}>
            <div className="flex justify-between items-center">
              <div>
                <div className="text-sm text-secondary">Your Move:</div>
                <div className="font-mono font-bold">{getMoveEmoji(mySelectedMove)} {mySelectedMove}</div>
              </div>
            </div>
          </div>
          <div className="p-3 rounded-lg" style={{ background: 'rgba(0,0,0,0.2)' }}>
            <div className="flex justify-between items-center">
              <div className="flex-1">
                <div className="text-sm text-secondary">Your Salt (keep this safe!):</div>
                <div className="font-mono text-sm break-all">{salt}</div>
              </div>
            </div>
          </div>
        </div>
        <div className="text-center mt-6">
          <button
            onClick={copyAllGameData}
            className="btn btn-primary"
            style={{ background: 'rgba(0, 123, 255, 0.8)', borderColor: 'rgba(0, 123, 255, 0.8)' }}
          >
            {copyFeedback === 'all' ? <Check size={16} /> : <Copy size={16} />}
            {copyFeedback === 'all' ? 'Copied All Data!' : 'Copy Complete Backup'}
          </button>
        </div>
        <p className="text-sm text-center mt-4" style={{ color: 'rgba(255, 193, 7, 0.8)' }}>
          💾 Data is saved locally on this device. Use the backup options above for extra safety!
          {gameState === 'RevealPhase' && (
            <><br/><br/>
            {}
            </>
          )}
        </p>
      </div>

      {/* Only show waiting message in non-RevealPhase */}
      <div className="text-center">
        {gameState === 'RevealPhase' ? null : (
          <div className="p-3 rounded-lg" style={{ background: 'rgba(249, 115, 22, 0.1)', border: '1px solid rgba(249, 115, 22, 0.3)' }}>
            <p className="text-sm font-medium" style={{ color: '#f97316' }}>
              ⏳ Waiting for opponent to commit their move...
            </p>
          </div>
        )}
      </div>
    </div>
  );
} 