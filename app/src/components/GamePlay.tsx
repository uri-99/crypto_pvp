import { useState, useEffect } from 'react';
import { Game, WagerAmount } from '../App';
import { ArrowLeft, Clock, Eye, EyeOff, Copy, Check } from 'lucide-react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { Program, AnchorProvider, web3, BN } from '@coral-xyz/anchor';
import idl from '../idl/crypto_pvp.json';

// Browser-compatible utilities (extracted from your scripts/utils.ts)
const MOVE_MAP = { rock: 0, paper: 1, scissors: 2 } as const;

// Helper function to create move hash (move + salt) - from your scripts/utils.ts
async function createMoveHash(move: number, salt: Uint8Array): Promise<Uint8Array> {
  const moveData = new Uint8Array(33);
  moveData[0] = move; // 0=Rock, 1=Paper, 2=Scissors
  moveData.set(salt, 1);
  
  // Use Web Crypto API instead of Node.js crypto
  const hash = await crypto.subtle.digest('SHA-256', moveData);
  return new Uint8Array(hash);
}

// Helper function to generate random salt - from your scripts/utils.ts  
function generateSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(32));
}

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
  const [isCommitting, setIsCommitting] = useState(false);
  const [moveHash, setMoveHash] = useState<string | null>(null);
  const [salt, setSalt] = useState<string | null>(null);
  const [gameState, setGameState] = useState(game.status);
  const [showSaltInfo, setShowSaltInfo] = useState(false);
  const [saltCopied, setSaltCopied] = useState(false);
  const [allDataCopied, setAllDataCopied] = useState(false);
  const [showBackupPrompt, setShowBackupPrompt] = useState(false);
  
  const { publicKey, signTransaction } = useWallet();
  const { connection } = useConnection();
  
  const isPlayer1 = game.player1 === playerAddress;
  const isPlayer2 = game.player2 === playerAddress;
  const myMove = isPlayer1 ? game.player1Move : game.player2Move;

  // Poll for game state updates (when waiting for player 2 to join)
  useEffect(() => {
    if (gameState !== 'WaitingForPlayer') return;
    
    const pollGameState = async () => {
      try {
        if (!publicKey || !connection) return;
        
        const wallet = { publicKey, signTransaction };
        const provider = new AnchorProvider(connection, wallet as any, { preflightCommitment: 'confirmed' });
        const program = new Program(idl as any, provider);
        
        const [gameAccount] = web3.PublicKey.findProgramAddressSync(
          [Buffer.from('game'), new BN(game.id).toArrayLike(Buffer, 'le', 8)],
          program.programId
        );
        
        const gameData = await (program.account as any).game.fetch(gameAccount);
        
        // Check if state changed
        let newStatus: 'WaitingForPlayer' | 'CommitPhase' | 'RevealPhase' | 'Finished' = 'WaitingForPlayer';
        if (gameData.state) {
          const stateKeys = Object.keys(gameData.state);
          const stateKey = stateKeys[0];
          switch (stateKey) {
            case 'waitingForPlayer': newStatus = 'WaitingForPlayer'; break;
            case 'commitPhase': newStatus = 'CommitPhase'; break;
            case 'revealPhase': newStatus = 'RevealPhase'; break;
            case 'finished': newStatus = 'Finished'; break;
          }
        }
        
        if (newStatus !== gameState) {
          console.log('🔄 Game state changed:', gameState, '→', newStatus);
          setGameState(newStatus);
        }
      } catch (error) {
        console.error('Error polling game state:', error);
      }
    };
    
    // Poll every 3 seconds while waiting for player
    const interval = setInterval(pollGameState, 3000);
    return () => clearInterval(interval);
  }, [gameState, game.id, publicKey, connection, signTransaction]);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setSaltCopied(true);
      setTimeout(() => setSaltCopied(false), 2000);
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
Player Address: ${playerAddress}
Backup Date: ${new Date().toISOString()}

⚠️ IMPORTANT: You need BOTH your move and salt to reveal later!
Keep this information safe until the game is finished.`;

    try {
      await navigator.clipboard.writeText(gameData);
      setAllDataCopied(true);
      setTimeout(() => setAllDataCopied(false), 3000);
    } catch (err) {
      console.error('Failed to copy game data: ', err);
    }
  };

  const getAllStoredGameData = () => {
    const allGames = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.includes('_move')) {
        const gameId = key.split('_')[1];
        const move = localStorage.getItem(`game_${gameId}_move`);
        const salt = localStorage.getItem(`game_${gameId}_salt`);
        if (move && salt) {
          allGames.push({ gameId, move, salt });
        }
      }
    }
    return allGames;
  };

  const copyAllStoredData = async () => {
    const allGames = getAllStoredGameData();
    
    if (allGames.length === 0) {
      alert('No game data found in storage');
      return;
    }

    let backupData = `CRYPTO PVP - ALL GAMES BACKUP
=====================================
Player Address: ${playerAddress}
Backup Date: ${new Date().toISOString()}
Total Games: ${allGames.length}

`;

    allGames.forEach((game, index) => {
      backupData += `
GAME #${game.gameId}
-----------
Move: ${game.move}
Salt: ${game.salt}
${index < allGames.length - 1 ? '' : ''}`;
    });

    backupData += `

⚠️ IMPORTANT NOTES:
- Each game requires BOTH move and salt to reveal
- This data is stored locally on your device
- Keep this backup safe until all games are finished
- If you lose this data, you cannot reveal your moves!`;

    try {
      await navigator.clipboard.writeText(backupData);
      alert(`✅ Copied backup data for ${allGames.length} game(s) to clipboard!`);
    } catch (err) {
      console.error('Failed to copy all game data: ', err);
      alert('❌ Failed to copy backup data');
    }
  };

  const handleMoveSelection = async (move: 'rock' | 'paper' | 'scissors') => {
    if (!publicKey || isCommitting) return;
    
    setIsCommitting(true);
    
    try {
      // Create a wallet adapter
      const wallet = { publicKey, signTransaction };
      
      // Generate random salt and create hash using your script utilities
      const salt = generateSalt();
      const moveNumber = MOVE_MAP[move];
      const moveHash = await createMoveHash(moveNumber, salt);
      
      // Store salt and hash for later use (for reveal phase)
      const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');
      setSalt(saltHex);
      setMoveHash(Array.from(moveHash).map(b => b.toString(16).padStart(2, '0')).join(''));
      
      // Also store in localStorage for persistence
      localStorage.setItem(`game_${game.id}_move`, move);
      localStorage.setItem(`game_${game.id}_salt`, saltHex);
      
      // Create provider and program - following your scripts pattern
      const provider = new AnchorProvider(connection, wallet as any, { preflightCommitment: 'confirmed' });
      const program = new Program(idl as any, provider);
      
      console.log('🎮 Committing move for game:', game.id, '- Move:', move);
      
      // Call commit_move - simplified like your script
      const tx = await program.methods
        .commitMove(new BN(game.id), Array.from(moveHash))
        .rpc();
      
      console.log('✅ Move committed successfully:', tx);
      setMySelectedMove(move);
      setShowSaltInfo(true);
      
      // TODO: Optionally refresh the game state from the blockchain
      
    } catch (error) {
      console.error('❌ Error committing move:', error);
      alert('Failed to commit move. Please try again.');
    } finally {
      setIsCommitting(false);
    }
  };

  const handleRevealMove = async () => {
    if (!publicKey) return;
    
    try {
      // Get the stored move and salt
      const storedMove = localStorage.getItem(`game_${game.id}_move`) || mySelectedMove;
      const storedSalt = localStorage.getItem(`game_${game.id}_salt`) || salt;
      
      if (!storedMove || !storedSalt) {
        alert('Could not find your move or salt. Please try again.');
        return;
      }

      const wallet = { publicKey, signTransaction };
      const provider = new AnchorProvider(connection, wallet as any, { preflightCommitment: 'confirmed' });
      const program = new Program(idl as any, provider);

      // Convert move to proper enum format for the contract
      let moveChoice;
      switch (storedMove) {
        case 'rock': moveChoice = { rock: {} }; break;
        case 'paper': moveChoice = { paper: {} }; break;
        case 'scissors': moveChoice = { scissors: {} }; break;
        default: throw new Error(`Invalid move: ${storedMove}`);
      }
      
      // Convert salt from hex to bytes
      const saltBytes = new Uint8Array(storedSalt.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));

      console.log('🔓 Revealing move for game:', game.id, '- Move:', storedMove);
      console.log('Salt bytes:', Array.from(saltBytes));

      // Get required PDAs
      const [gameAccount] = web3.PublicKey.findProgramAddressSync(
        [Buffer.from('game'), new BN(game.id).toArrayLike(Buffer, 'le', 8)],
        program.programId
      );

      const [globalStateAccount] = web3.PublicKey.findProgramAddressSync(
        [Buffer.from('global_state')],
        program.programId
      );

      const [player1ProfileAccount] = web3.PublicKey.findProgramAddressSync(
        [Buffer.from('player_profile'), new web3.PublicKey(game.player1).toBuffer()],
        program.programId
      );

      const [player2ProfileAccount] = web3.PublicKey.findProgramAddressSync(
        [Buffer.from('player_profile'), new web3.PublicKey(game.player2!).toBuffer()],
        program.programId
      );

      // Call reveal_move with all required accounts
      const tx = await program.methods
        .revealMove(new BN(game.id), moveChoice, Array.from(saltBytes))
        .accounts({
          game: gameAccount,
          globalState: globalStateAccount,
          player: publicKey,
          player1Profile: player1ProfileAccount,
          player2Profile: player2ProfileAccount,
          player1: new web3.PublicKey(game.player1),
          player2: new web3.PublicKey(game.player2!),
        })
        .rpc();

      console.log('✅ Move revealed successfully:', tx);
      
      // Refresh the game state to see if both players have revealed
      setTimeout(() => {
        window.location.reload(); // Simple refresh for now
      }, 2000);
      
    } catch (error) {
      console.error('❌ Error revealing move:', error);
      alert('Failed to reveal move. Please try again.');
    }
  };
  
  // Game flow: waiting -> playing -> revealing -> finished
  // Check if player2 actually exists (not null, undefined, empty, or default pubkey)
  const realPlayer2Exists = game.player2 && 
    game.player2.trim() !== '' && 
    game.player2 !== '11111111111111111111111111111111';
  const bothPlayersJoined = realPlayer2Exists || simulatedPlayer2Joined;
  const bothPlayersCommitted = (game.player1Move && game.player2Move) || simulatedMovesCommitted;
  const canReveal = gameState === 'RevealPhase';

  const getMoveEmoji = (move: string | undefined) => {
    switch (move) {
      case 'rock': return '🪨';
      case 'paper': return '📄';
      case 'scissors': return '✂️';
      default: return '❓';
    }
  };

  const getStatusMessage = () => {
    if (gameState === 'WaitingForPlayer') {
      return "Waiting for another player to join...";
    }
    if (gameState === 'CommitPhase') {
      return "Rock, Paper, Scissors... GO!";
    }
    if (gameState === 'RevealPhase') {
      return "Both players have made their moves! Click to reveal.";
    }
    if (gameState === 'Finished') {
      return "Game finished!";
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
            <h2 className="text-2xl font-bold mb-1">Game #{game.id}</h2>
            <p className="text-secondary">Wager: {getWagerDisplay(game.wager)}</p>
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

  // Show reveal page
  if (showRevealPage && !showResults) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={onBack} className="btn btn-secondary">
            <ArrowLeft size={16} />
          </button>
          <div>
            <h2 className="text-2xl font-bold mb-1">Game #{game.id}</h2>
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
              onClick={handleRevealMove}
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

  // Show salt info after committing move (PRIORITY - check this first!)
  if (showSaltInfo && mySelectedMove && salt) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={onBack} className="btn btn-secondary">
            <ArrowLeft size={16} />
          </button>
          <div>
            <h2 className="text-2xl font-bold mb-1">Game #{game.id}</h2>
            <p className="text-secondary">Wager: {getWagerDisplay(game.wager)}</p>
          </div>
        </div>

        <div className="text-center mb-8">
          <div style={{ fontSize: '5rem', marginBottom: '1.5rem' }}>✅</div>
          <h2 className="text-3xl font-bold mb-4">Move Committed!</h2>
          <p className="text-xl text-secondary mb-6">You chose: {getMoveEmoji(mySelectedMove)} {mySelectedMove}</p>
        </div>

        <div className="card mb-6" style={{ background: 'rgba(255, 193, 7, 0.1)', border: '2px solid rgba(255, 193, 7, 0.3)' }}>
          <h3 className="text-xl font-bold mb-4 text-center" style={{ color: '#ffc107' }}>⚠️ Important: Save Your Information!</h3>
          
          <div className="space-y-4">
            <div className="p-3 rounded-lg" style={{ background: 'rgba(0,0,0,0.2)' }}>
              <div className="flex justify-between items-center">
                <div>
                  <div className="text-sm text-secondary">Your Move:</div>
                  <div className="font-mono font-bold">{mySelectedMove}</div>
                </div>
                <div className="text-2xl">{getMoveEmoji(mySelectedMove)}</div>
              </div>
            </div>
            
            <div className="p-3 rounded-lg" style={{ background: 'rgba(0,0,0,0.2)' }}>
              <div className="flex justify-between items-center">
                <div className="flex-1">
                  <div className="text-sm text-secondary">Your Salt (keep this safe!):</div>
                  <div className="font-mono text-sm break-all">{salt}</div>
                </div>
                <button
                  onClick={() => copyToClipboard(salt)}
                  className="btn btn-secondary ml-2"
                  style={{ minWidth: '80px' }}
                >
                  {saltCopied ? <Check size={16} /> : <Copy size={16} />}
                  {saltCopied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>
          </div>
          
          <div className="grid grid-2 gap-3 mt-6">
            <button
              onClick={copyAllGameData}
              className="btn btn-primary"
              style={{ background: 'rgba(0, 123, 255, 0.8)', borderColor: 'rgba(0, 123, 255, 0.8)' }}
            >
              {allDataCopied ? <Check size={16} /> : <Copy size={16} />}
              {allDataCopied ? 'Copied All Data!' : 'Copy Complete Backup'}
            </button>
            <button
              onClick={() => setShowBackupPrompt(true)}
              className="btn btn-secondary"
            >
              📱 View All Games
            </button>
          </div>
          
          <p className="text-sm text-center mt-4" style={{ color: 'rgba(255, 193, 7, 0.8)' }}>
            💾 Data is saved locally on this device. Use the backup options above for safety!
          </p>
        </div>

        <div className="text-center">
          <button 
            onClick={() => setShowSaltInfo(false)}
            className="btn btn-primary"
          >
            Continue to Game
          </button>
        </div>

        {/* Backup All Games Modal */}
        {showBackupPrompt && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-800 p-6 rounded-lg max-w-md w-full mx-4">
              <h3 className="text-xl font-bold mb-4">All Stored Games</h3>
              
              <div className="mb-4">
                <div className="text-sm text-secondary mb-2">Storage Info:</div>
                <div className="text-xs p-2 rounded bg-gray-700">
                  <div>• Data persists through page refresh ✅</div>
                  <div>• Data stays after browser restart ✅</div>
                  <div>• Data is device/browser specific 📱</div>
                  <div>• You have {getAllStoredGameData().length} game(s) stored</div>
                </div>
              </div>

              <div className="space-y-3">
                <button
                  onClick={copyAllStoredData}
                  className="btn btn-primary w-full"
                >
                  📋 Copy All Games Backup
                </button>
                <button
                  onClick={() => setShowBackupPrompt(false)}
                  className="btn btn-secondary w-full"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Show waiting for other player page  
  if (mySelectedMove && !showRevealPage && !showSaltInfo) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={onBack} className="btn btn-secondary">
            <ArrowLeft size={16} />
          </button>
          <div>
            <h2 className="text-2xl font-bold mb-1">Game #{game.id}</h2>
            <p className="text-secondary">Wager: {getWagerDisplay(game.wager)}</p>
          </div>
        </div>

        <div className="text-center mb-8">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary border-t-transparent mx-auto mb-6"></div>
          <h2 className="text-3xl font-bold mb-4">Waiting for other player...</h2>
          <p className="text-xl text-secondary mb-6">You chose: {getMoveEmoji(mySelectedMove)} {mySelectedMove}</p>
          <p className="text-secondary">Waiting for opponent to make their move</p>
        </div>
      </div>
    );
  }

  // Show rock paper scissors page when both players joined and current player needs to make a move
  if (gameState === 'CommitPhase' && !myMove && !mySelectedMove) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={onBack} className="btn btn-secondary">
            <ArrowLeft size={16} />
          </button>
          <div>
            <h2 className="text-2xl font-bold mb-1">Game #{game.id}</h2>
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
              onClick={() => handleMoveSelection(option.value)}
              className={`move-option ${mySelectedMove === option.value ? 'selected' : ''}`}
              style={{ padding: '2rem', minHeight: '160px' }}
              disabled={isCommitting}
            >
              <div style={{ fontSize: '6rem', marginBottom: '0.5rem' }}>
                {isCommitting ? '⏳' : option.emoji}
              </div>
              {isCommitting && <div style={{ fontSize: '1rem', marginTop: '0.5rem' }}>Committing...</div>}
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
          <h2 className="text-2xl font-bold mb-1">Game #{game.id}</h2>
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
          gameState === 'WaitingForPlayer' ? 'status-waiting' :
          gameState === 'CommitPhase' ? 'status-active' :
          gameState === 'RevealPhase' ? 'status-active' :
          'status-finished'
        }`}>
          {gameState === 'WaitingForPlayer' && '⏳ Waiting'}
          {gameState === 'CommitPhase' && '⚡ Playing'}
          {gameState === 'RevealPhase' && '👁️ Ready to Reveal'}
          {gameState === 'Finished' && '✅ Finished'}
        </div>
        

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
                game.status === 'Finished' ? getMoveEmoji(game.player1Move) : '🔒'
              ) : '⏳'}
            </div>
            
            <div className="text-sm">
              {gameState === 'WaitingForPlayer' && !realPlayer2Exists && 'Waiting for player 2...'}
              {gameState === 'WaitingForPlayer' && realPlayer2Exists && (game.player1Move ? 'Move committed' : 'Choosing move...')}
              {gameState === 'CommitPhase' && (game.player1Move ? 'Move committed' : 'Choosing move...')}
              {gameState === 'RevealPhase' && 'Ready to reveal'}
              {gameState === 'Finished' && 'Game finished'}
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
                 game.status === 'Finished' ? getMoveEmoji(game.player2Move) : '🔒'
               ) : '⏳'}
            </div>
            
            <div className="text-sm">
              {gameState === 'WaitingForPlayer' && !realPlayer2Exists && 'Waiting for player...'}
              {gameState === 'WaitingForPlayer' && realPlayer2Exists && (game.player2Move ? 'Move committed' : 'Choosing move...')}
              {gameState === 'CommitPhase' && (game.player2Move ? 'Move committed' : 'Choosing move...')}
              {gameState === 'RevealPhase' && 'Ready to reveal'}
              {gameState === 'Finished' && 'Game finished'}
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
                  {game.status === 'Finished' ? 'Revealed' : 'Hidden until reveal'}
                </div>
              </div>
            </div>
            {game.status !== 'Finished' && (
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
            onClick={handleRevealMove}
            className="btn btn-success btn-large"
            style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', boxShadow: '0 0 20px rgba(99, 102, 241, 0.4)' }}
          >
            <Eye size={20} />
            🎯 Reveal Your Move!
          </button>
          <p className="text-sm text-secondary mt-2">
            Both players have committed their moves - time to reveal!
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
    </div>
  );
}