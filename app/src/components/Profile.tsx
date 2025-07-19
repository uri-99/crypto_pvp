import { useState, useEffect } from 'react';
import { ArrowLeft, Edit3, Check, X, Trophy, TrendingUp, Calendar } from 'lucide-react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { Program, AnchorProvider, web3 } from '@coral-xyz/anchor';
import idl from '../idl/crypto_pvp.json';
import { fetchPlayerName } from '../utils/fetchGames';

interface ProfileProps {
  onBack: () => void;
}

interface PlayerProfile {
  player: string;
  name: string;
  totalGamesPlayed: number;
  totalGamesCompleted: number;
  totalGamesForfeited: number;
  wins: number;
  losses: number;
  ties: number;
  totalWagered: number;
  totalWon: number;
  totalLost: number;
  createdAt: number;
}

interface GameHistoryEntry {
  gameId: number;
  opponent: string;
  opponentName: string;
  wager: number; // in lamports
  result: 'won' | 'lost' | 'tied';
  myMove: string;
  opponentMove: string;
  date: Date;
}

export function Profile({ onBack }: ProfileProps) {
  const { publicKey, signTransaction } = useWallet();
  const { connection } = useConnection();
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState('');
  const [updatingName, setUpdatingName] = useState(false);
  const [gameHistory, setGameHistory] = useState<GameHistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Fetch player profile data
  useEffect(() => {
    const fetchProfile = async () => {
      if (!publicKey || !connection) return;

      try {
        setLoading(true);
        const provider = new AnchorProvider(connection, { publicKey, signTransaction } as any, {});
        const program = new Program(idl as any, provider);

        // Get player profile PDA
        const [playerProfilePda] = web3.PublicKey.findProgramAddressSync(
          [Buffer.from('player_profile'), publicKey.toBuffer()],
          program.programId
        );

        // Fetch profile data
        const profileData = await (program.account as any).playerProfile.fetch(playerProfilePda);
        
        setProfile({
          player: profileData.player.toString(),
          name: profileData.name,
          totalGamesPlayed: parseInt(profileData.totalGamesPlayed.toString()),
          totalGamesCompleted: parseInt(profileData.totalGamesCompleted.toString()),
          totalGamesForfeited: parseInt(profileData.totalGamesForfeited.toString()),
          wins: profileData.wins,
          losses: profileData.losses,
          ties: profileData.ties,
          totalWagered: parseInt(profileData.totalWagered.toString()),
          totalWon: parseInt(profileData.totalWon.toString()),
          totalLost: parseInt(profileData.totalLost?.toString() || '0'),
          createdAt: parseInt(profileData.createdAt.toString()),
        });

        setNewName(profileData.name);
      } catch (error) {
        console.error('Error fetching profile:', error);
        // Profile might not exist yet
        setProfile(null);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [publicKey, connection, signTransaction]);

  // Fetch game history
  useEffect(() => {
    const fetchGameHistory = async () => {
      if (!publicKey || !connection || !profile) return;

      try {
        setHistoryLoading(true);
        const provider = new AnchorProvider(connection, { publicKey, signTransaction } as any, {});
        const program = new Program(idl as any, provider);

        // Fetch all finished game accounts
        const gameAccounts = await (program.account as any).game.all();
        const playerAddress = publicKey.toString();
        const history: GameHistoryEntry[] = [];

        for (const gameAccount of gameAccounts) {
          const gameData = gameAccount.account as any;
          
          // Check if game is finished and player participated
          const isFinished = gameData.state?.finished !== undefined || 
                            (gameData.state && Object.keys(gameData.state)[0] === 'finished');
          
          if (!isFinished) continue;

          const player1 = gameData.player1.toString();
          const player2 = gameData.player2.toString();
          
          if (player1 !== playerAddress && player2 !== playerAddress) continue;

          const isPlayer1 = player1 === playerAddress;
          const opponent = isPlayer1 ? player2 : player1;
          const myMove = isPlayer1 ? gameData.player1Move : gameData.player2Move;
          const opponentMove = isPlayer1 ? gameData.player2Move : gameData.player1Move;

          // Determine result
          let result: 'won' | 'lost' | 'tied';
          const winnerType = gameData.winnerType;
          
          if (winnerType?.tie !== undefined) {
            result = 'tied';
          } else if (winnerType?.player1 !== undefined || winnerType?.player1OpponentForfeit !== undefined) {
            result = isPlayer1 ? 'won' : 'lost';
          } else if (winnerType?.player2 !== undefined || winnerType?.player2OpponentForfeit !== undefined) {
            result = isPlayer1 ? 'lost' : 'won';
          } else {
            continue; // Skip if we can't determine winner
          }

          // Convert move enum to string
          const moveToString = (move: any): string => {
            if (!move) return 'unknown';
            if (move.rock !== undefined) return 'rock';
            if (move.paper !== undefined) return 'paper';
            if (move.scissors !== undefined) return 'scissors';
            return 'unknown';
          };

          // Get opponent name from their profile
          const opponentName = await fetchPlayerName(connection, { publicKey, signTransaction } as any, opponent);

          history.push({
            gameId: parseInt(gameData.gameId.toString()),
            opponent,
            opponentName,
            wager: gameData.wager.sol1 ? 1_000_000_000 : 
                   gameData.wager.sol01 ? 100_000_000 : 
                   gameData.wager.sol001 ? 10_000_000 : 0,
            result,
            myMove: moveToString(myMove),
            opponentMove: moveToString(opponentMove),
            date: new Date() // We don't have timestamp in game data, so using current date as placeholder
          });
        }

        // Sort by game ID (most recent first)
        history.sort((a, b) => b.gameId - a.gameId);
        
        // Take only the last 5 games
        setGameHistory(history.slice(0, 5));
      } catch (error) {
        console.error('Error fetching game history:', error);
      } finally {
        setHistoryLoading(false);
      }
    };

    fetchGameHistory();
  }, [publicKey, connection, signTransaction, profile]);

  const handleUpdateName = async () => {
    if (!publicKey || !connection || !signTransaction || !newName.trim()) return;

    try {
      setUpdatingName(true);
      const provider = new AnchorProvider(connection, { publicKey, signTransaction } as any, {});
      const program = new Program(idl as any, provider);

      // Get player profile PDA
      const [playerProfilePda] = web3.PublicKey.findProgramAddressSync(
        [Buffer.from('player_profile'), publicKey.toBuffer()],
        program.programId
      );

      const tx = await program.methods
        .updatePlayerName(newName.trim())
        .accounts({
          playerProfile: playerProfilePda,
          player: publicKey,
        })
        .rpc();

      console.log('Name updated:', tx);
      
      // Update local state
      if (profile) {
        setProfile({ ...profile, name: newName.trim() });
      }
      setIsEditingName(false);
    } catch (error) {
      console.error('Error updating name:', error);
    } finally {
      setUpdatingName(false);
    }
  };

  const formatSOL = (lamports: number): string => {
    return (lamports / 1_000_000_000).toFixed(3);
  };

  const formatDate = (timestamp: number): string => {
    return new Date(timestamp * 1000).toLocaleDateString();
  };

  const calculateWinRate = (): number => {
    if (!profile || profile.totalGamesCompleted === 0) return 0;
    return (profile.wins / profile.totalGamesCompleted) * 100;
  };

  const calculateCompletionRate = (): number => {
    if (!profile || profile.totalGamesPlayed === 0) return 0;
    return (profile.totalGamesCompleted / profile.totalGamesPlayed) * 100;
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto mt-16">
        <div className="text-center">
          <div className="text-2xl mb-4">Loading profile...</div>
        </div>
      </div>
    );
  }

  if (!publicKey) {
    return (
      <div className="max-w-4xl mx-auto mt-16">
        <div className="text-center">
          <div className="text-2xl mb-4">Please connect your wallet to view profile</div>
          <button onClick={onBack} className="btn btn-secondary">
            <ArrowLeft size={16} />
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="max-w-4xl mx-auto mt-16">
        <div className="text-center">
          <div className="text-2xl mb-4">No profile found</div>
          <div className="text-lg mb-6" style={{color: 'rgba(255,255,255,0.70)'}}>
            Play your first game to create a profile!
          </div>
          <button onClick={onBack} className="btn btn-primary">
            <ArrowLeft size={16} />
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto mt-16">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button onClick={onBack} className="btn btn-secondary">
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 className="text-3xl font-bold" style={{color: 'rgba(255,255,255,0.88)'}}>
            Player Profile
          </h1>
          <p className="text-base mt-1" style={{color: 'rgba(255,255,255,0.80)'}}>
            Your game statistics and achievements
          </p>
        </div>
      </div>

      {/* Profile Header Card */}
      <div className="card mb-6" style={{background: 'var(--surface)'}}>
        <div>
          <div className="flex-1">
            <div className="mb-2">
              {isEditingName ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="input"
                    maxLength={32}
                    style={{ minWidth: '200px' }}
                  />
                  <button 
                    onClick={handleUpdateName}
                    disabled={updatingName || !newName.trim()}
                    className="btn btn-success btn-sm"
                  >
                    <Check size={16} />
                  </button>
                  <button 
                    onClick={() => {
                      setIsEditingName(false);
                      setNewName(profile.name);
                    }}
                    className="btn btn-secondary btn-sm"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <div className="group">
                  <h2 
                    className="text-2xl font-bold cursor-pointer inline-flex items-center hover:opacity-80 transition-opacity" 
                    style={{color: 'rgba(255,255,255,0.88)'}}
                    onClick={() => setIsEditingName(true)}
                    title="Click to edit name"
                  >
                    <span style={{color: 'rgba(255,255,255,0.70)', fontSize: '1rem', fontWeight: 'normal', marginRight: '12px'}}>
                      Username: 
                    </span>
                    <span style={{marginRight: '12px'}}>
                      {profile.name}
                    </span>
                    <Edit3 size={16} className="opacity-0 group-hover:opacity-50 transition-opacity" />
                  </h2>
                </div>
              )}
            </div>
            <div className="text-sm" style={{color: 'rgba(255,255,255,0.70)'}}>
              <div style={{marginBottom: '8px'}}>Address: {profile.player.slice(0, 8)}...{profile.player.slice(-8)}</div>
              <div className="flex items-center gap-1" style={{marginBottom: '8px'}}>
                <Calendar size={14} />
                Joined: {formatDate(profile.createdAt)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Game Statistics */}
        <div className="card" style={{background: 'var(--surface)'}}>
          <h3 className="text-xl font-bold mb-4" style={{color: 'rgba(255,255,255,0.88)'}}>
            <Trophy className="inline mr-2" size={20} />
            Game Statistics
          </h3>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span style={{color: 'rgba(255,255,255,0.70)'}}>Win Rate</span>
              <span className="text-lg font-bold" style={{color: '#28a745'}}>
                {calculateWinRate().toFixed(1)}%
              </span>
            </div>
            
            <div className="grid grid-cols-3 gap-4 py-3 px-4 rounded-lg" 
                 style={{background: 'rgba(255,255,255,0.05)'}}>
              <div className="text-center">
                <div className="text-2xl font-bold" style={{color: '#28a745'}}>
                  {profile.wins}
                </div>
                <div className="text-sm" style={{color: 'rgba(255,255,255,0.70)'}}>Wins</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold" style={{color: '#dc3545'}}>
                  {profile.losses}
                </div>
                <div className="text-sm" style={{color: 'rgba(255,255,255,0.70)'}}>Losses</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold" style={{color: '#ffc107'}}>
                  {profile.ties}
                </div>
                <div className="text-sm" style={{color: 'rgba(255,255,255,0.70)'}}>Ties</div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <span style={{color: 'rgba(255,255,255,0.70)'}}>Games Played</span>
                <span className="font-bold">{profile.totalGamesPlayed}</span>
              </div>
              <div className="flex justify-between">
                <span style={{color: 'rgba(255,255,255,0.70)'}}>Games Completed</span>
                <span className="font-bold">{profile.totalGamesCompleted}</span>
              </div>
              <div className="flex justify-between">
                <span style={{color: 'rgba(255,255,255,0.70)'}}>Games Forfeited</span>
                <span className="font-bold" style={{color: profile.totalGamesForfeited > 0 ? '#dc3545' : 'inherit'}}>
                  {profile.totalGamesForfeited}
                </span>
              </div>
              <div className="flex justify-between">
                <span style={{color: 'rgba(255,255,255,0.70)'}}>Completion Rate</span>
                <span className="font-bold" style={{color: calculateCompletionRate() >= 90 ? '#28a745' : calculateCompletionRate() >= 70 ? '#ffc107' : '#dc3545'}}>
                  {calculateCompletionRate().toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Financial Statistics */}
        <div className="card" style={{background: 'var(--surface)'}}>
          <h3 className="text-xl font-bold mb-4" style={{color: 'rgba(255,255,255,0.88)'}}>
            <TrendingUp className="inline mr-2" size={20} />
            Financial Statistics
          </h3>
          
          <div className="space-y-4">
            <div className="space-y-3 py-3 px-4 rounded-lg" 
                 style={{background: 'rgba(255,255,255,0.05)'}}>
              <div className="flex justify-between">
                <span style={{color: 'rgba(255,255,255,0.70)'}}>Total Wagered</span>
                <span className="font-bold text-blue-400">
                  {formatSOL(profile.totalWagered)} SOL
                </span>
              </div>
              <div className="flex justify-between">
                <span style={{color: 'rgba(255,255,255,0.70)'}}>Total Won</span>
                <span className="font-bold text-green-400">
                  {formatSOL(profile.totalWon)} SOL
                </span>
              </div>
              <div className="flex justify-between">
                <span style={{color: 'rgba(255,255,255,0.70)'}}>Net Profit</span>
                <span className="font-bold" style={{
                  color: profile.totalWon - profile.totalLost > 0 ? '#10b981' : 
                         profile.totalWon - profile.totalLost < 0 ? '#ef4444' : 
                         'rgba(255,255,255,0.50)'
                }}>
                  {profile.totalWon - profile.totalLost > 0 ? '+' : ''}{formatSOL(profile.totalWon - profile.totalLost)} SOL
                </span>
              </div>
              {profile.totalWagered > 0 && (
                <div className="flex justify-between">
                  <span style={{color: 'rgba(255,255,255,0.70)'}}>ROI</span>
                  <span className="font-bold" style={{
                    color: profile.totalWon - profile.totalLost > 0 ? '#10b981' : 
                           profile.totalWon - profile.totalLost < 0 ? '#ef4444' : 
                           'rgba(255,255,255,0.50)'
                  }}>
                    {profile.totalWagered > 0 ? (((profile.totalWon - profile.totalLost) / profile.totalWagered) * 100).toFixed(1) : '0'}%
                  </span>
                </div>
              )}
            </div>

            {profile.totalGamesCompleted === 0 && (
              <div className="text-center py-6" style={{color: 'rgba(255,255,255,0.50)'}}>
                <div className="text-lg mb-2">No completed games yet</div>
                <div className="text-sm">Start playing to see your stats!</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Game History */}
      <div className="card" style={{background: 'var(--surface)'}}>
        <h3 className="text-xl font-bold mb-4" style={{color: 'rgba(255,255,255,0.88)'}}>
          Game History
        </h3>
        
        {historyLoading ? (
          <div className="text-center py-6" style={{color: 'rgba(255,255,255,0.70)'}}>
            <div className="text-lg">Loading game history...</div>
          </div>
        ) : gameHistory.length > 0 ? (
          <div className="space-y-3">
            {gameHistory.map((game) => (
              <div key={game.gameId} className="flex items-center justify-between p-3 rounded-lg" 
                   style={{background: 'rgba(255,255,255,0.05)'}}>
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${
                    game.result === 'won' ? 'bg-green-400' : 
                    game.result === 'lost' ? 'bg-red-400' : 'bg-yellow-400'
                  }`}></div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`font-bold text-sm ${
                        game.result === 'won' ? 'text-green-400' : 
                        game.result === 'lost' ? 'text-red-400' : 'text-yellow-400'
                      }`}>
                        {game.result.toUpperCase()}
                      </span>
                      <span className="text-sm" style={{color: 'rgba(255,255,255,0.70)'}}>
                        vs {game.opponentName}
                      </span>
                    </div>
                    <div className="text-xs mt-1" style={{color: 'rgba(255,255,255,0.50)'}}>
                      {game.myMove === 'rock' ? '🪨' : game.myMove === 'paper' ? '📄' : '✂️'} vs {game.opponentMove === 'rock' ? '🪨' : game.opponentMove === 'paper' ? '📄' : '✂️'}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`font-bold ${
                    game.result === 'won' ? 'text-green-400' : 
                    game.result === 'lost' ? 'text-red-400' : 'text-gray-400'
                  }`}>
                    {game.result === 'won' ? '+' : game.result === 'lost' ? '-' : '±'}{formatSOL(game.wager)} SOL
                  </div>
                  <div className="text-xs" style={{color: 'rgba(255,255,255,0.50)'}}>
                    Game #{game.gameId}
                  </div>
                </div>
              </div>
            ))}
            {gameHistory.length === 5 && (
              <div className="text-center text-sm pt-2" style={{color: 'rgba(255,255,255,0.50)'}}>
                Showing last 5 games
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-6" style={{color: 'rgba(255,255,255,0.50)'}}>
            <div className="text-lg mb-2">No game history yet</div>
            <div className="text-sm">Play some games to see your history here!</div>
          </div>
        )}
      </div>
    </div>
  );
} 