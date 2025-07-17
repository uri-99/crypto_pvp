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
  onBack: () => void;
  getWagerDisplay: (_wager: WagerAmount) => string;
  playerAddress: string;
}

export function GamePlay({ game, onBack, getWagerDisplay, playerAddress }: GamePlayProps) {
  // Essential game state
  const [gameState, setGameState] = useState(game.status);
  const [currentGameData, setCurrentGameData] = useState(game);
  const [mySelectedMove, setMySelectedMove] = useState<'rock' | 'paper' | 'scissors' | null>(null);
  const [salt, setSalt] = useState<string | null>(null);
  
  // Loading states
  const [isCommitting, setIsCommitting] = useState(false);
  const [isRevealing, setIsRevealing] = useState(false);
  
  // UI state management
  const [uiState, setUIState] = useState<'playing' | 'saltBackup' | 'revealing' | 'waitingForOpponent' | 'results'>('playing');
  
  // Manual input state
  const [manualInput, setManualInput] = useState({
    move: 'rock' as 'rock' | 'paper' | 'scissors',
    salt: '',
    isVisible: false
  });
  
  // Copy feedback
  const [copyFeedback, setCopyFeedback] = useState<'salt' | 'all' | null>(null);
  
  const { publicKey, signTransaction } = useWallet();
  const { connection } = useConnection();
  
  // Derived values (no longer stored in state)
  const isPlayer1 = currentGameData.player1 === playerAddress;
  const isPlayer2 = currentGameData.player2 === playerAddress;
  const myMove = isPlayer1 ? currentGameData.player1Move : currentGameData.player2Move;
  const opponentMove = isPlayer1 ? currentGameData.player2Move : currentGameData.player1Move;
  const realPlayer2Exists = currentGameData.player2 && 
    currentGameData.player2.trim() !== '' && 
    currentGameData.player2 !== '11111111111111111111111111111111';
  const bothPlayersCommitted = currentGameData.player1Move && currentGameData.player2Move;
  const shouldShowRevealInterface = gameState === 'RevealPhase' && !myMove && uiState === 'playing';

  // Validate initial game data
  useEffect(() => {
    try {
      new web3.PublicKey(game.player1);
      if (game.player2) {
        new web3.PublicKey(game.player2);
      }
      console.log('✅ Initial game data validation passed');
    } catch (error) {
      console.error('❌ Invalid initial game data:', error);
      console.log('Game data:', game);
    }
  }, [game]);
  
  // Enhanced polling for ALL game phases
  useEffect(() => {
    if (gameState === 'Finished') return;
    
    const pollGameState = async () => {
      try {
        if (!publicKey || !connection) return;
        
        const wallet = { publicKey, signTransaction };
        const provider = new AnchorProvider(connection, wallet as any, { preflightCommitment: 'confirmed' });
        const program = new Program(idl as any, provider);
        
        const [gameAccount] = web3.PublicKey.findProgramAddressSync(
          [Buffer.from('game'), new BN(currentGameData.id).toArrayLike(Buffer, 'le', 8)],
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

        // Update game data with fresh blockchain data
        const updatedGame = {
          ...currentGameData,
          status: newStatus,
          player1Move: gameData.player1Move ? Object.keys(gameData.player1Move)[0] as 'rock' | 'paper' | 'scissors' : undefined,
          player2Move: gameData.player2Move ? Object.keys(gameData.player2Move)[0] as 'rock' | 'paper' | 'scissors' : undefined,
          player1: gameData.player1.toString(),
          player2: gameData.player2.toString(),
          winner: gameData.winnerType ? Object.keys(gameData.winnerType)[0] : undefined
        };

        console.log('🔄 Updated game data from blockchain:', {
          originalPlayer1: currentGameData.player1,
          originalPlayer2: currentGameData.player2,
          blockchainPlayer1: gameData.player1.toString(),
          blockchainPlayer2: gameData.player2.toString(),
          updatedPlayer1: updatedGame.player1,
          updatedPlayer2: updatedGame.player2
        });

        setCurrentGameData(updatedGame);
        
        if (newStatus !== gameState) {
          console.log('🔄 Game state changed:', gameState, '→', newStatus);
          setGameState(newStatus);
          
          // Handle specific state transitions
          if (newStatus === 'RevealPhase' && gameState === 'CommitPhase') {
            console.log('🎯 Both players committed! Moving to reveal phase...');
            // Don't automatically hide salt backup - let user manually continue
            if (uiState === 'saltBackup') {
              // Stay in saltBackup until user explicitly continues
            } else {
              setUIState('playing'); // Default to playing state
            }
          }
          
          if (newStatus === 'Finished') {
            console.log('🏁 Game finished!');
            setUIState('results');
          }
        }

        // Check if we're waiting for opponent reveal
        if (newStatus === 'RevealPhase') {
          const myRevealMove = isPlayer1 ? updatedGame.player1Move : updatedGame.player2Move;
          const opponentRevealMove = isPlayer1 ? updatedGame.player2Move : updatedGame.player1Move;
          
          if (myRevealMove && !opponentRevealMove) {
            console.log('✅ My move revealed, waiting for opponent...');
            setUIState('waitingForOpponent');
            setIsRevealing(false);
          }
        }
      } catch (error) {
        console.error('Error polling game state:', error);
      }
    };
    
    // Poll every 3 seconds for any non-finished game
    const interval = setInterval(pollGameState, 3000);
    
    // Also poll immediately
    pollGameState();
    
    return () => clearInterval(interval);
  }, [gameState, currentGameData.id, publicKey, connection, signTransaction, playerAddress]);

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
Player Address: ${playerAddress}
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
      
      // Also store in localStorage for persistence
      localStorage.setItem(`game_${currentGameData.id}_move`, move);
      localStorage.setItem(`game_${currentGameData.id}_salt`, saltHex);
      
      // Create provider and program - following your scripts pattern
      const provider = new AnchorProvider(connection, wallet as any, { preflightCommitment: 'confirmed' });
      const program = new Program(idl as any, provider);
      
      console.log('🎮 Committing move for game:', currentGameData.id, '- Move:', move);
      
      // Call commit_move - simplified like your script
      const tx = await program.methods
        .commitMove(new BN(currentGameData.id), Array.from(moveHash))
        .rpc();
      
      console.log('✅ Move committed successfully:', tx);
      setMySelectedMove(move);
      setUIState('saltBackup');
      
      // Update current game data to reflect our committed move
      setCurrentGameData(prev => ({
        ...prev,
        [isPlayer1 ? 'player1Move' : 'player2Move']: move
      }));
      
    } catch (error) {
      console.error('❌ Error committing move:', error);
      alert('Failed to commit move. Please try again.');
    } finally {
      setIsCommitting(false);
    }
  };

  const handleRevealMove = async () => {
    if (!publicKey || isRevealing) return;
    
    setIsRevealing(true);
    
    try {
      // Get the stored move and salt
      const storedMove = localStorage.getItem(`game_${currentGameData.id}_move`) || mySelectedMove;
      const storedSalt = localStorage.getItem(`game_${currentGameData.id}_salt`) || salt;
      
      console.log('🔍 Checking stored data:', { storedMove, storedSalt, mySelectedMove, salt });
      
      if (!storedMove || !storedSalt) {
        alert('Could not find your move or salt. Please try again.');
        setIsRevealing(false); // Reset the button state
        return;
      }

      // Validate and convert salt from hex to bytes
      if (!/^[0-9a-fA-F]{64}$/.test(storedSalt)) {
        alert('Invalid salt format. Salt must be 64 hex characters.');
        setIsRevealing(false);
        return;
      }
      
      const saltBytes = new Uint8Array(storedSalt.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));

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

      console.log('🔓 Revealing move for game:', currentGameData.id, '- Move:', storedMove);
      console.log('Salt bytes:', Array.from(saltBytes));

      // Debug player addresses
      console.log('🔍 Player addresses:', {
        player1: currentGameData.player1,
        player2: currentGameData.player2,
        player1Type: typeof currentGameData.player1,
        player2Type: typeof currentGameData.player2
      });

      // Validate player addresses before creating PublicKeys
      let player1Address = currentGameData.player1;
      let player2Address = currentGameData.player2!;
      
      try {
        new web3.PublicKey(currentGameData.player1);
        if (currentGameData.player2) {
          new web3.PublicKey(currentGameData.player2);
        }
      } catch (error) {
        console.error('❌ Invalid player addresses in currentGameData, trying original game data:', error);
        
        // Fallback to original game data
        try {
          new web3.PublicKey(game.player1);
          if (game.player2) {
            new web3.PublicKey(game.player2);
          }
          console.log('✅ Using original game data as fallback');
          // Use original game data for this reveal
          player1Address = game.player1;
          player2Address = game.player2!;
        } catch (fallbackError) {
          console.error('❌ Original game data also invalid:', fallbackError);
          alert('Invalid player addresses in game data. Please try refreshing the page.');
          setIsRevealing(false);
          return;
        }
      }

      // Get required PDAs
      const [gameAccount] = web3.PublicKey.findProgramAddressSync(
        [Buffer.from('game'), new BN(currentGameData.id).toArrayLike(Buffer, 'le', 8)],
        program.programId
      );

      const [globalStateAccount] = web3.PublicKey.findProgramAddressSync(
        [Buffer.from('global_state')],
        program.programId
      );

      const [player1ProfileAccount] = web3.PublicKey.findProgramAddressSync(
        [Buffer.from('player_profile'), new web3.PublicKey(player1Address).toBuffer()],
        program.programId
      );

      const [player2ProfileAccount] = web3.PublicKey.findProgramAddressSync(
        [Buffer.from('player_profile'), new web3.PublicKey(player2Address).toBuffer()],
        program.programId
      );

      // Call reveal_move with all required accounts
      const tx = await program.methods
        .revealMove(new BN(currentGameData.id), moveChoice, Array.from(saltBytes))
        .accounts({
          game: gameAccount,
          globalState: globalStateAccount,
          player: publicKey,
          player1Profile: player1ProfileAccount,
          player2Profile: player2ProfileAccount,
          player1: new web3.PublicKey(player1Address),
          player2: new web3.PublicKey(player2Address),
        })
        .rpc();

      console.log('✅ Move revealed successfully:', tx);
      
      // Update local state to show we've revealed
      setCurrentGameData(prev => ({
        ...prev,
        [isPlayer1 ? 'player1Move' : 'player2Move']: storedMove as 'rock' | 'paper' | 'scissors'
      }));
      
      // Reset revealing state on success
      setIsRevealing(false);
      
      // The polling will handle checking if both players revealed and transitioning to results
      
    } catch (error) {
      console.error('❌ Error revealing move:', error);
      alert('Failed to reveal move. Please try again.');
      setIsRevealing(false);
    }
  };

  const handleManualReveal = async () => {
    if (!publicKey || isRevealing || !manualInput.salt.trim()) return;
    
    setIsRevealing(true);
    
    try {
      const wallet = { publicKey, signTransaction };
      const provider = new AnchorProvider(connection, wallet as any, { preflightCommitment: 'confirmed' });
      const program = new Program(idl as any, provider);

      // Convert move to proper enum format for the contract
      let moveChoice;
      switch (manualInput.move) {
        case 'rock': moveChoice = { rock: {} }; break;
        case 'paper': moveChoice = { paper: {} }; break;
        case 'scissors': moveChoice = { scissors: {} }; break;
        default: throw new Error(`Invalid move: ${manualInput.move}`);
      }
      
      // Validate and convert salt from hex to bytes
      if (!/^[0-9a-fA-F]{64}$/.test(manualInput.salt)) {
        alert('Invalid salt format. Salt must be exactly 64 hex characters.');
        setIsRevealing(false);
        return;
      }
      
      const saltBytes = new Uint8Array(manualInput.salt.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));

      console.log('🔓 Revealing move manually for game:', currentGameData.id, '- Move:', manualInput.move);
      console.log('Manual salt bytes:', Array.from(saltBytes));

      // Debug player addresses
      console.log('🔍 Player addresses:', {
        player1: currentGameData.player1,
        player2: currentGameData.player2,
        player1Type: typeof currentGameData.player1,
        player2Type: typeof currentGameData.player2
      });

      // Validate player addresses before creating PublicKeys
      let player1Address = currentGameData.player1;
      let player2Address = currentGameData.player2!;
      
      try {
        new web3.PublicKey(currentGameData.player1);
        if (currentGameData.player2) {
          new web3.PublicKey(currentGameData.player2);
        }
      } catch (error) {
        console.error('❌ Invalid player addresses in currentGameData, trying original game data:', error);
        
        // Fallback to original game data
        try {
          new web3.PublicKey(game.player1);
          if (game.player2) {
            new web3.PublicKey(game.player2);
          }
          console.log('✅ Using original game data as fallback');
          // Use original game data for this reveal
          player1Address = game.player1;
          player2Address = game.player2!;
        } catch (fallbackError) {
          console.error('❌ Original game data also invalid:', fallbackError);
          alert('Invalid player addresses in game data. Please try refreshing the page.');
          setIsRevealing(false);
          return;
        }
      }

      // Get required PDAs
      const [gameAccount] = web3.PublicKey.findProgramAddressSync(
        [Buffer.from('game'), new BN(currentGameData.id).toArrayLike(Buffer, 'le', 8)],
        program.programId
      );

      const [globalStateAccount] = web3.PublicKey.findProgramAddressSync(
        [Buffer.from('global_state')],
        program.programId
      );

      const [player1ProfileAccount] = web3.PublicKey.findProgramAddressSync(
        [Buffer.from('player_profile'), new web3.PublicKey(player1Address).toBuffer()],
        program.programId
      );

      const [player2ProfileAccount] = web3.PublicKey.findProgramAddressSync(
        [Buffer.from('player_profile'), new web3.PublicKey(player2Address).toBuffer()],
        program.programId
      );

      // Call reveal_move with all required accounts
      const tx = await program.methods
        .revealMove(new BN(currentGameData.id), moveChoice, Array.from(saltBytes))
        .accounts({
          game: gameAccount,
          globalState: globalStateAccount,
          player: publicKey,
          player1Profile: player1ProfileAccount,
          player2Profile: player2ProfileAccount,
          player1: new web3.PublicKey(player1Address),
          player2: new web3.PublicKey(player2Address),
        })
        .rpc();

      console.log('✅ Move revealed manually successfully:', tx);
      
      // Update local state to show we've revealed
      setCurrentGameData(prev => ({
        ...prev,
        [isPlayer1 ? 'player1Move' : 'player2Move']: manualInput.move
      }));
      
      // Update UI state
      setMySelectedMove(manualInput.move);
      setUIState('revealing');
      setIsRevealing(false); // Reset revealing state on success
      
    } catch (error) {
      console.error('❌ Error revealing move manually:', error);
      alert('Failed to reveal move manually. Please check your move and salt are correct.');
      setIsRevealing(false);
    }
  };
  
  // Game flow: waiting -> playing -> revealing -> finished
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
  if (uiState === 'results' && mySelectedMove && opponentMove) {
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

  // Show waiting for opponent reveal page
  if (uiState === 'waitingForOpponent') {
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

  // Show reveal page
  if (uiState === 'revealing') {
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
              disabled={isRevealing}
              className="btn btn-success btn-large"
              style={{ fontSize: '1.5rem', padding: '20px 48px', boxShadow: '0 0 16px 2px #10b98155' }}
            >
              {isRevealing ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2"></div>
                  Revealing...
                </>
              ) : (
                <>🎯 Reveal Now</>
              )}
            </button>
            
            <div className="mt-6">
              <button
                onClick={() => {
                  console.log('📝 Opening manual input modal - preserving stored data');
                  // Reset manual input fields to avoid stale data
                  setManualInput({ move: 'rock', salt: '', isVisible: true });
                }}
                className="btn btn-secondary"
                style={{ fontSize: '1rem', padding: '12px 24px' }}
              >
                📝 Use Manual Backup
              </button>
              <p className="text-sm text-secondary mt-2">
                Lost your data? Use your backup salt and move
              </p>
            </div>
          </div>
        </div>

        {/* Manual Input Modal */}
        {manualInput.isVisible && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-800 p-6 rounded-lg max-w-md w-full mx-4">
              <h3 className="text-xl font-bold mb-4">Manual Reveal</h3>
              <p className="text-sm text-secondary mb-4">
                Enter your move and salt from your backup to reveal manually.
              </p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Your Move</label>
                  <select
                    value={manualInput.move}
                    onChange={(e) => setManualInput(prev => ({ ...prev, move: e.target.value as 'rock' | 'paper' | 'scissors' }))}
                    className="input w-full"
                  >
                    <option value="rock">🪨 Rock</option>
                    <option value="paper">📄 Paper</option>
                    <option value="scissors">✂️ Scissors</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Salt (hex string)</label>
                  <input
                    type="text"
                    value={manualInput.salt}
                    onChange={(e) => setManualInput(prev => ({ ...prev, salt: e.target.value }))}
                    placeholder="Enter your 64-character salt..."
                    className="input w-full font-mono text-sm"
                    style={{ fontSize: '0.875rem' }}
                  />
                  <p className="text-xs text-secondary mt-1">
                    64 hex characters (0-9, a-f)
                  </p>
                </div>
                
                <div className="text-center">
                  <button
                    onClick={() => {
                      const storedMove = localStorage.getItem(`game_${currentGameData.id}_move`) || mySelectedMove;
                      const storedSalt = localStorage.getItem(`game_${currentGameData.id}_salt`) || salt;
                      if (storedMove) setManualInput(prev => ({ ...prev, move: storedMove as 'rock' | 'paper' | 'scissors' }));
                      if (storedSalt) setManualInput(prev => ({ ...prev, salt: storedSalt }));
                      console.log('🔄 Auto-filled from storage:', { storedMove, storedSalt });
                    }}
                    className="btn btn-secondary text-sm"
                  >
                    🔄 Auto-fill from storage
                  </button>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleManualReveal}
                  disabled={isRevealing || !manualInput.salt.trim() || manualInput.salt.length !== 64}
                  className="btn btn-primary flex-1"
                >
                  {isRevealing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                      Revealing...
                    </>
                  ) : (
                    <>🎯 Reveal</>
                  )}
                </button>
                <button
                  onClick={() => {
                    console.log('❌ Canceling manual input - localStorage data preserved');
                    setManualInput(prev => ({ ...prev, isVisible: false }));
                  }}
                  disabled={isRevealing}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Show salt info after committing move (PRIORITY - check this first!)
  if (uiState === 'saltBackup' && mySelectedMove && salt) {
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
          
          {gameState === 'RevealPhase' && (
            <div className="mb-4 p-3 rounded-lg" style={{ background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.3)' }}>
              <p className="text-sm font-medium" style={{ color: '#22c55e' }}>
                ✨ Both players committed! Game is now in reveal phase.
              </p>
            </div>
          )}
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
                  {copyFeedback === 'salt' ? <Check size={16} /> : <Copy size={16} />}
                  {copyFeedback === 'salt' ? 'Copied!' : 'Copy'}
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
              {copyFeedback === 'all' ? <Check size={16} /> : <Copy size={16} />}
              {copyFeedback === 'all' ? 'Copied All Data!' : 'Copy Complete Backup'}
            </button>
            <button
              onClick={() => setUIState('saltBackup')}
              className="btn btn-secondary"
            >
              📱 View All Games
            </button>
          </div>
          
          <p className="text-sm text-center mt-4" style={{ color: 'rgba(255, 193, 7, 0.8)' }}>
            💾 Data is saved locally on this device. Use the backup options above for safety!
            {gameState === 'RevealPhase' && (
              <><br/><br/>
              🔄 <strong>Game is ready for reveal phase!</strong> Take your time to backup your data, then use the buttons below to continue.</>
            )}
          </p>
        </div>

        <div className="text-center">
          <button 
            onClick={() => setUIState('playing')}
            className="btn btn-primary"
          >
            Continue to Game
          </button>
          
          {gameState === 'RevealPhase' && (
            <div className="mt-4">
              <div className="mb-3 p-3 rounded-lg" style={{ background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.3)' }}>
                <p className="text-sm font-medium" style={{ color: '#6366f1' }}>
                  🎯 Both players have committed! Game is ready for reveal phase.
                </p>
              </div>
              <button 
                onClick={() => setUIState('revealing')}
                className="btn btn-success"
                style={{ marginLeft: '0.5rem' }}
              >
                🎯 Go to Reveal Phase
              </button>
            </div>
          )}
        </div>

        {/* Backup All Games Modal */}
        {/* Removed the modal - it was duplicated and confusing */}
      </div>
    );
  }

  // Show waiting for other player page  
  if (mySelectedMove && uiState === 'playing' && gameState !== 'RevealPhase') {
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
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary border-t-transparent mx-auto mb-6"></div>
          <h2 className="text-3xl font-bold mb-4">Waiting for other player...</h2>
          <p className="text-xl text-secondary mb-6">You chose: {mySelectedMove ? getMoveEmoji(mySelectedMove) : '❓'} {mySelectedMove}</p>
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
            <h2 className="text-2xl font-bold mb-1">Game #{currentGameData.id}</h2>
            <p className="text-secondary">Wager: {getWagerDisplay(currentGameData.wager)}</p>
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
          <h2 className="text-2xl font-bold mb-1">Game #{currentGameData.id}</h2>
          <p className="text-secondary">Wager: {getWagerDisplay(currentGameData.wager)}</p>
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
              {currentGameData.player1.slice(0, 8)}...
            </div>
            
            <div className="text-4xl mb-2">
              {currentGameData.player1Move ? (
                currentGameData.status === 'Finished' ? getMoveEmoji(currentGameData.player1Move) : '🔒'
              ) : '⏳'}
            </div>
            
            <div className="text-sm">
              {gameState === 'WaitingForPlayer' && !realPlayer2Exists && 'Waiting for player 2...'}
              {gameState === 'WaitingForPlayer' && realPlayer2Exists && (currentGameData.player1Move ? 'Move committed' : 'Choosing move...')}
              {gameState === 'CommitPhase' && (currentGameData.player1Move ? 'Move committed' : 'Choosing move...')}
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
              {realPlayer2Exists && currentGameData.player2 ? `${currentGameData.player2.slice(0, 8)}...` : 
               'Waiting...'}
            </div>
            
            <div className="text-4xl mb-2">
              {!realPlayer2Exists ? '⏳' :
               currentGameData.player2Move ? (
                 currentGameData.status === 'Finished' ? getMoveEmoji(currentGameData.player2Move) : '🔒'
               ) : '⏳'}
            </div>
            
            <div className="text-sm">
              {gameState === 'WaitingForPlayer' && !realPlayer2Exists && 'Waiting for player...'}
              {gameState === 'WaitingForPlayer' && realPlayer2Exists && (currentGameData.player2Move ? 'Move committed' : 'Choosing move...')}
              {gameState === 'CommitPhase' && (currentGameData.player2Move ? 'Move committed' : 'Choosing move...')}
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
                  {currentGameData.status === 'Finished' ? 'Revealed' : 'Hidden until reveal'}
                </div>
              </div>
            </div>
            {currentGameData.status !== 'Finished' && (
              <div className="flex items-center gap-1 text-secondary">
                <EyeOff size={16} />
                <span className="text-sm">Secret</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Reveal Button */}
      {shouldShowRevealInterface && (
        <div className="text-center">
          <button 
            onClick={() => setUIState('revealing')}
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
          Winner takes {getWagerDisplay(currentGameData.wager)} • Ties split the pot
        </div>
      </div>
    </div>
  );
}