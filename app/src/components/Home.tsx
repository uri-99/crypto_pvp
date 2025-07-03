import { Plus, Users, Trophy, Play } from 'lucide-react';
import { Game, WagerAmount } from '../App';
import { useMyGames } from '../utils/useGames';

interface HomeProps {
  onCreateGame: () => void;
  onJoinGame: () => void;
  onRejoinGame: (game: Game) => void;
  getWagerDisplay: (wager: WagerAmount) => string;
}

export function Home({ 
  onCreateGame, 
  onJoinGame, 
  onRejoinGame, 
  getWagerDisplay 
}: HomeProps) {
  const { myGames, loading: myGamesLoading } = useMyGames();
  return (
    <div className="max-w-2xl mx-auto mt-16">
      {/* Title Section (no card) */}
      <div className="text-center mb-6">
        <h2 className="text-4xl font-extrabold mb-2" style={{color: 'rgba(255,255,255,0.88)'}}>⚔️ Crypto PvP — Rock Paper Scissors</h2>
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
        <ol className="space-y-2 text-base list-decimal list-inside pl-4" style={{color: 'rgba(255,255,255,0.75)'}}>
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

      {/* My Active Games Section */}
      {myGames.length > 0 && (
        <div className="card mb-6" style={{background: 'var(--surface)'}}>
          <h3 className="text-2xl font-bold mb-4 flex items-center gap-2" style={{color: 'rgba(255,255,255,0.88)'}}>
            <Play size={24} />
            My Active Games
          </h3>
          
          {myGamesLoading ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent mx-auto"></div>
              <p className="text-base mt-2" style={{color: 'rgba(255,255,255,0.70)'}}>Loading games...</p>
            </div>
          ) : (
            <div className="space-y-3">
              {myGames.map((game) => (
                <div key={game.id} className="game-card p-3 rounded-lg border border-opacity-20 flex items-center justify-between" style={{background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.15)'}}>
                  <div>
                    <div className="flex items-center gap-4">
                      <div className="font-bold text-lg" style={{color: 'rgba(255,255,255,0.88)'}}>
                        Game #{game.id}
                      </div>
                      <span className="text-sm px-2 py-1 rounded" style={{
                        background: game.status === 'WaitingForPlayer' ? 'rgba(255, 193, 7, 0.2)' : 
                                  game.status === 'CommitPhase' ? 'rgba(40, 167, 69, 0.2)' :
                                  game.status === 'RevealPhase' ? 'rgba(108, 117, 125, 0.2)' :
                                  'rgba(128, 128, 128, 0.2)',
                        color: game.status === 'WaitingForPlayer' ? '#ffc107' : 
                               game.status === 'CommitPhase' ? '#28a745' :
                               game.status === 'RevealPhase' ? '#6c757d' :
                               '#808080'
                      }}>
                        {game.status === 'WaitingForPlayer' ? 'Waiting for opponent' :
                         game.status === 'CommitPhase' ? 'Choose your move' :
                         game.status === 'RevealPhase' ? 'Revealing moves' : 
                         game.status === 'Finished' ? 'Game finished' : 'Active'}
                      </span>
                    </div>
                    <div className="text-sm mt-1" style={{color: 'rgba(255,255,255,0.70)'}}>
                      Wager: {getWagerDisplay(game.wager)}
                      {game.player2 && (
                        <span className="ml-3">
                          vs {game.player2Name || `${game.player2.slice(0, 8)}...`}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => onRejoinGame(game)}
                    className="btn btn-secondary"
                  >
                    <Play size={16} />
                    Continue
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

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