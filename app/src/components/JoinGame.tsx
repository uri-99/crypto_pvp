import { useState } from 'react';
import { WagerAmount, Move } from '../App';
import { ArrowLeft, Users, Clock, Filter, Plus } from 'lucide-react';
import { useGames } from '../utils/useGames';
import { useWallet } from '@solana/wallet-adapter-react';
import { useConnection } from '@solana/wallet-adapter-react';
import { Program, AnchorProvider, web3, BN } from '@coral-xyz/anchor';
import idl from '../idl/crypto_pvp.json';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

interface JoinGameProps {
  onJoinGame: (_gameId: string, _move: Move) => void;
  onBack: () => void;
  onCreateGame: () => void;
  getWagerDisplay: (_wager: WagerAmount) => string;
}

const PROGRAM_ID = new web3.PublicKey(idl.address);

export function JoinGame({ onJoinGame, onBack, onCreateGame, getWagerDisplay }: JoinGameProps) {
  const { games, loading } = useGames();
  const wallet = useWallet();
  const { connection } = useConnection();
  const [selectedGame, setSelectedGame] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const [wagerFilter, setWagerFilter] = useState<WagerAmount | 'all'>('all');

  // Filter games to show only those waiting for players (excluding current user's games)
  let availableGames = games.filter(g => 
    g.status === 'waiting' && 
    g.player1 !== wallet.publicKey?.toString()
  );

  // Apply wager filter
  if (wagerFilter !== 'all') {
    availableGames = availableGames.filter(g => g.wager === wagerFilter);
  }

  const handleJoinGame = async () => {
    if (!selectedGame) return;
    
    // Only allow joining if wallet is connected
    if (!wallet.connected || !wallet.publicKey) {
      return; // Button should be disabled in this case
    }
    
    setIsJoining(true);
    try {
      if (!wallet.publicKey) throw new Error('Wallet not connected');
      if (!wallet) throw new Error('Wallet not available');
      if (!connection) throw new Error('Connection not available');
      
      // Generate random salt (copying exact pattern from CreateGame.tsx)
      const saltArr = new Uint8Array(32);
      crypto.getRandomValues(saltArr);
      
      // For demo, use 'rock' as move
      const move = 'rock';
      
      // Hash move+salt (move as 0=rock, 1=paper, 2=scissors)
      const moveIdx = 0; // rock
      const moveData = new Uint8Array([moveIdx, ...saltArr]); // [move, ...salt]
      
      // Use browser crypto.subtle.digest for SHA-256
      const hashBuffer = await crypto.subtle.digest('SHA-256', moveData);
      const moveHash = new Uint8Array(hashBuffer);
      
      // Setup provider and program (copying exact pattern from CreateGame.tsx)
      const opts = AnchorProvider.defaultOptions();
      const provider = new AnchorProvider(connection, wallet as any, opts);
      const program = new Program(idl as any, provider);
      
      // Derive PDAs for the game
      const gameIdBN = new BN(parseInt(selectedGame));
      const [gamePda] = await web3.PublicKey.findProgramAddress([
        Buffer.from('game'),
        gameIdBN.toArrayLike(Buffer, 'le', 8)
      ], PROGRAM_ID);
      
      const [playerProfilePda] = await web3.PublicKey.findProgramAddress([
        Buffer.from('player_profile'),
        wallet.publicKey.toBytes()
      ], PROGRAM_ID);
      
      // Send transaction (copying exact pattern from CreateGame.tsx)
      await program.methods.joinGame(
        gameIdBN,  // _game_id parameter 
        moveHash   // move_hash parameter (this was missing!)
      ).accounts({
        game: gamePda,
        player: wallet.publicKey,
        player2Profile: playerProfilePda,  // Use camelCase like CreateGame.tsx
        systemProgram: web3.SystemProgram.programId,
      }).rpc();
      
      // Call parent handler for UI state
      await onJoinGame(selectedGame, move as Move);
    } catch (e) {
      console.error('Error details:', e);
      alert('Error joining game: ' + (e instanceof Error ? e.message : e));
    }
    setIsJoining(false);
  };

  const selectedGameData = availableGames.find(g => g.id === selectedGame);

  return (
    <div className="max-w-2xl mx-auto">
      <div style={{ position: 'absolute', top: 24, right: 24, zIndex: 10 }}>
        <WalletMultiButton />
      </div>
      
      <div className="flex items-center gap-4 mb-6">
        <button onClick={onBack} className="btn btn-secondary">
          <ArrowLeft size={16} />
        </button>
        <h2 className="text-2xl font-bold">Join a Game</h2>
      </div>

      {/* Available Games */}
      <div className="card mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Users size={20} />
            <h3 className="text-xl font-semibold">Available Games</h3>
          </div>
          
          {/* Wager Filter */}
          <div className="flex items-center gap-2">
            <Filter size={16} />
            <select 
              value={wagerFilter} 
              onChange={(e) => {
                setWagerFilter(e.target.value as WagerAmount | 'all');
                setSelectedGame(null); // Reset selection when filtering
              }}
              className="input text-sm"
              style={{ width: 'auto', minWidth: '120px' }}
            >
              <option value="all">All Wagers</option>
              <option value="sol001">0.01 SOL</option>
              <option value="sol01">0.1 SOL</option>
              <option value="sol1">1 SOL</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-2 border-accent border-t-transparent mx-auto mb-4"></div>
            <p className="text-secondary">Loading available games...</p>
          </div>
        ) : availableGames.length === 0 ? (
          <div className="text-center py-8">
            <Clock size={48} className="mx-auto text-secondary mb-4" />
            {wagerFilter === 'all' ? (
              <>
                <p className="text-secondary mb-4">No games available to join right now</p>
                <p className="text-sm text-secondary mb-4">
                  Be the first to start the action!
                </p>
                <button 
                  onClick={onCreateGame}
                  className="btn btn-primary"
                >
                  <Plus size={16} />
                  Create New Game
                </button>
              </>
            ) : (
              <>
                <p className="text-secondary mb-4">No games found for {getWagerDisplay(wagerFilter)}</p>
                <p className="text-sm text-secondary mb-4">
                  Try a different wager amount or create your own game
                </p>
                <div className="flex gap-2 justify-center">
                  <button 
                    onClick={() => setWagerFilter('all')}
                    className="btn btn-secondary"
                  >
                    Show All Games
                  </button>
                  <button 
                    onClick={onCreateGame}
                    className="btn btn-primary"
                  >
                    <Plus size={16} />
                    Create Game
                  </button>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {availableGames.map((game) => (
              <div
                key={game.id}
                onClick={() => setSelectedGame(game.id)}
                className={`game-option ${selectedGame === game.id ? 'game-option-selected' : ''}`}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-semibold">Game #{game.id}</div>
                    <div className="text-sm text-secondary">
                      Player: {game.player1Name || `${game.player1.slice(0, 8)}...`}
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





      {/* Selected Game Details */}
      {selectedGameData && (
        <div className="card mb-6">
          <h4 className="font-semibold mb-3">Selected Game Details</h4>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 rounded-lg" style={{background: 'rgba(255,255,255,0.05)'}}>
              <span className="text-secondary">Game ID:</span>
              <span className="font-mono font-semibold">#{selectedGameData.id}</span>
            </div>
            <div className="flex justify-between items-center p-3 rounded-lg" style={{background: 'rgba(255,255,255,0.05)'}}>
              <span className="text-secondary">Wager Amount:</span>
              <span className="font-semibold text-accent">{getWagerDisplay(selectedGameData.wager)}</span>
            </div>
            <div className="flex justify-between items-center p-3 rounded-lg" style={{background: 'rgba(255,255,255,0.05)'}}>
              <span className="text-secondary">Opponent:</span>
              <span className="font-semibold">{selectedGameData.player1Name || `${selectedGameData.player1.slice(0, 8)}...`}</span>
            </div>
            <div className="flex justify-between items-center p-3 rounded-lg" style={{background: 'rgba(255,255,255,0.05)'}}>
              <span className="text-secondary">Status:</span>
              <span className="text-warning font-semibold">⏳ Waiting for player</span>
            </div>
          </div>
          
          <div className="text-sm text-warning mt-4 p-3 rounded-lg" style={{background: 'rgba(255, 193, 7, 0.1)', border: '1px solid rgba(255, 193, 7, 0.3)'}}>
            ⚠️ By joining this game, you commit <strong>{getWagerDisplay(selectedGameData.wager)}</strong> to the match. Winner takes all!
          </div>
        </div>
      )}

      {/* Join Button */}
      {selectedGame && (
        <div className="text-center">
          <button
            onClick={handleJoinGame}
            disabled={isJoining || !wallet.connected}
            className={`btn btn-large ${wallet.connected ? 'btn-success' : 'btn-secondary'}`}
          >
            {isJoining ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                Joining Game...
              </>
            ) : !wallet.connected ? (
              <>
                <Users size={20} />
                Connect Wallet to Join Game #{selectedGameData!.id}
              </>
            ) : (
              <>
                <Users size={20} />
                Join Game #{selectedGameData!.id} for {getWagerDisplay(selectedGameData!.wager)}
              </>
            )}
          </button>
          
          <p className="text-sm text-secondary mt-2">
            {!wallet.connected 
              ? "Use the wallet button in the top-right to connect your wallet first"
              : "You will commit your move after joining the game"
            }
          </p>
        </div>
      )}

      {!selectedGame && availableGames.length > 0 && (
        <div className="text-center">
          <p className="text-secondary">Select a game above to continue</p>
        </div>
      )}
    </div>
  );
} 