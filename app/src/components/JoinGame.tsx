import { useState } from 'react';
import { Game, WagerAmount, Move } from '../App';
import { ArrowLeft, Users, Clock } from 'lucide-react';

interface JoinGameProps {
  games: Game[];
  onJoinGame: (_gameId: string, _move: Move) => void;
  onBack: () => void;
  getWagerDisplay: (_wager: WagerAmount) => string;
}

export function JoinGame({ games, onJoinGame, onBack, getWagerDisplay }: JoinGameProps) {
  const [selectedGame, setSelectedGame] = useState<string | null>(null);
  const [selectedMove, setSelectedMove] = useState<Move | null>(null);
  const [isJoining, setIsJoining] = useState(false);

  const moveOptions: { value: Move; emoji: string; name: string }[] = [
    { value: 'rock', emoji: '🪨', name: 'Rock' },
    { value: 'paper', emoji: '📄', name: 'Paper' },
    { value: 'scissors', emoji: '✂️', name: 'Scissors' },
  ];

  const handleJoinGame = async () => {
    if (!selectedGame || !selectedMove) return;
    
    setIsJoining(true);
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    onJoinGame(selectedGame, selectedMove);
    setIsJoining(false);
  };

  const selectedGameData = games.find(g => g.id === selectedGame);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={onBack} className="btn btn-secondary">
          <ArrowLeft size={16} />
        </button>
        <h2 className="text-2xl font-bold">Join a Game</h2>
      </div>

      {/* Available Games */}
      <div className="card mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Users size={20} />
          <h3 className="text-xl font-semibold">Available Games</h3>
        </div>

        {games.length === 0 ? (
          <div className="text-center py-8">
            <Clock size={48} className="mx-auto text-secondary mb-4" />
            <p className="text-secondary">No games available to join</p>
            <p className="text-sm text-secondary mt-2">
              Create a new game or wait for someone else to create one
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {games.map((game) => (
              <div
                key={game.id}
                onClick={() => setSelectedGame(game.id)}
                className={`game-option ${selectedGame === game.id ? 'game-option-selected' : ''}`}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-semibold">Game #{game.id}</div>
                    <div className="text-sm text-secondary">
                      Player: {game.player1.slice(0, 8)}...
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-accent">
                      {getWagerDisplay(game.wager)}
                    </div>
                    <div className="text-sm text-success">
                      ⏳ Waiting
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Move Selection */}
      {selectedGame && (
        <div className="card mb-6">
          <h3 className="text-xl font-semibold mb-4">Choose Your Move</h3>
          <p className="text-secondary mb-4">
            Your move will be hidden until both players reveal their moves.
          </p>
          
          <div className="grid grid-3 gap-3 mb-4">
            {moveOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setSelectedMove(option.value)}
                className={`move-option ${selectedMove === option.value ? 'move-option-selected' : ''}`}
              >
                <div className="text-4xl mb-2">{option.emoji}</div>
                <div className="font-semibold">{option.name}</div>
              </button>
            ))}
          </div>
          
          {selectedMove && (
            <div className="text-center p-3 bg-success bg-opacity-10 rounded-lg border border-success border-opacity-20">
              <span className="text-success">✓ Move selected: {moveOptions.find(m => m.value === selectedMove)?.name}</span>
            </div>
          )}
        </div>
      )}

      {/* Game Details */}
      {selectedGameData && (
        <div className="card mb-6">
          <h4 className="font-semibold mb-3">Game Details</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-secondary">Game ID:</span>
              <span className="font-mono">#{selectedGameData.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-secondary">Wager:</span>
              <span className="text-accent font-semibold">{getWagerDisplay(selectedGameData.wager)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-secondary">Opponent:</span>
              <span className="font-mono">{selectedGameData.player1.slice(0, 8)}...</span>
            </div>
            <div className="flex justify-between">
              <span className="text-secondary">Created:</span>
              <span>{selectedGameData.createdAt.toLocaleDateString()}</span>
            </div>
          </div>
          
          <div className="text-sm text-warning mt-3 p-2 bg-warning bg-opacity-10 rounded border border-warning border-opacity-20">
            ⚠️ By joining, you commit {getWagerDisplay(selectedGameData.wager)} to the game
          </div>
        </div>
      )}

      {/* Game Rules */}
      <div className="card mb-6">
        <h4 className="font-semibold mb-2">Game Rules</h4>
        <div className="text-sm text-secondary space-y-1">
          <p>🪨 Rock crushes Scissors</p>
          <p>📄 Paper covers Rock</p>
          <p>✂️ Scissors cut Paper</p>
        </div>
        <div className="text-sm text-accent mt-3">
          Winner takes all • Ties split the pot
        </div>
      </div>

      {/* Join Button */}
      {selectedGame && selectedMove && (
        <div className="text-center">
          <button
            onClick={handleJoinGame}
            disabled={isJoining}
            className="btn btn-success btn-large"
          >
            {isJoining ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                Joining Game...
              </>
            ) : (
              <>
                <Users size={20} />
                Join Game for {getWagerDisplay(selectedGameData!.wager)}
              </>
            )}
          </button>
          
          <p className="text-sm text-secondary mt-2">
            Your move and wager will be committed to the blockchain
          </p>
        </div>
      )}

      {!selectedGame && games.length > 0 && (
        <div className="text-center">
          <p className="text-secondary">Select a game above to continue</p>
        </div>
      )}

      {selectedGame && !selectedMove && (
        <div className="text-center">
          <p className="text-secondary">Choose your move to join the game</p>
        </div>
      )}
    </div>
  );
} 