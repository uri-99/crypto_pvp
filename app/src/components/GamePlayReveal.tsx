import { useState } from 'react';
import { Game, WagerAmount } from '../App';
import { ArrowLeft } from 'lucide-react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { Program, AnchorProvider, web3, BN } from '@coral-xyz/anchor';
import idl from '../idl/crypto_pvp.json';

interface GamePlayRevealProps {
  game: Game;
  currentGameData: Game;
  mySelectedMove: 'rock' | 'paper' | 'scissors' | null;
  salt: string | null;
  isPlayer1: boolean;
  manualInput: {
    move: 'rock' | 'paper' | 'scissors';
    salt: string;
    isVisible: boolean;
  };
  onBack: () => void;
  onRevealSuccess: (move: 'rock' | 'paper' | 'scissors') => void;
  onGameDataUpdate: (updatedGame: Game) => void;
  onSetManualInput: (input: { move: 'rock' | 'paper' | 'scissors'; salt: string; isVisible: boolean }) => void;
  getWagerDisplay: (wager: WagerAmount) => string;
}

export function GamePlayReveal({
  game,
  currentGameData,
  mySelectedMove,
  salt,
  isPlayer1,
  manualInput,
  onBack,
  onRevealSuccess,
  onGameDataUpdate,
  onSetManualInput,
  getWagerDisplay
}: GamePlayRevealProps) {
  const [isRevealing, setIsRevealing] = useState(false);
  const { publicKey, signTransaction } = useWallet();
  const { connection } = useConnection();

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

      await performReveal(storedMove as 'rock' | 'paper' | 'scissors', storedSalt);
      
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
      await performReveal(manualInput.move, manualInput.salt);
      
    } catch (error) {
      console.error('❌ Error revealing move manually:', error);
      alert('Failed to reveal move manually. Please check your move and salt are correct.');
      setIsRevealing(false);
    }
  };

  const performReveal = async (move: 'rock' | 'paper' | 'scissors', saltHex: string) => {
    // Validate and convert salt from hex to bytes
    if (!/^[0-9a-fA-F]{64}$/.test(saltHex)) {
      alert('Invalid salt format. Salt must be exactly 64 hex characters.');
      setIsRevealing(false);
      return;
    }
    
    const saltBytes = new Uint8Array(saltHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));

    const wallet = { publicKey, signTransaction };
    const provider = new AnchorProvider(connection, wallet as any, { preflightCommitment: 'confirmed' });
    const program = new Program(idl as any, provider);

    // Convert move to proper enum format for the contract
    let moveChoice;
    switch (move) {
      case 'rock': moveChoice = { rock: {} }; break;
      case 'paper': moveChoice = { paper: {} }; break;
      case 'scissors': moveChoice = { scissors: {} }; break;
      default: throw new Error(`Invalid move: ${move}`);
    }

    console.log('🔓 Revealing move for game:', currentGameData.id, '- Move:', move);
    console.log('Salt bytes:', Array.from(saltBytes));

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
        player: publicKey!,
        player1Profile: player1ProfileAccount,
        player2Profile: player2ProfileAccount,
        player1: new web3.PublicKey(player1Address),
        player2: new web3.PublicKey(player2Address),
      })
      .rpc();

    console.log('✅ Move revealed successfully:', tx);
    
    // Update local state to show we've revealed
    const updatedGame = {
      ...currentGameData,
      [isPlayer1 ? 'player1Move' : 'player2Move']: move
    };
    
    // Notify parent components
    onRevealSuccess(move);
    onGameDataUpdate(updatedGame);
    
    // Reset revealing state on success
    setIsRevealing(false);
  };

  // Fallback: if mySelectedMove or salt is missing, try to read from localStorage
  let displayMove = mySelectedMove;
  let displaySalt = salt;
  if (!displayMove) {
    const storedMove = localStorage.getItem(`game_${currentGameData.id}_move`);
    if (storedMove === 'rock' || storedMove === 'paper' || storedMove === 'scissors') {
      displayMove = storedMove;
    }
  }
  if (!displaySalt) {
    const storedSalt = localStorage.getItem(`game_${currentGameData.id}_salt`);
    if (storedSalt) {
      displaySalt = storedSalt;
    }
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

      {/* Main reveal card */}
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
                onSetManualInput({ move: 'rock', salt: '', isVisible: true });
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

      {/* Manual Input Form (positioned above the info box) */}
      {manualInput.isVisible && (
        <div className="mb-4" style={{ maxWidth: 420, margin: '0 auto' }}>
          <div className="bg-gray-800 p-4 rounded-lg border border-gray-600">
            <h3 className="text-lg font-bold mb-3">Manual Reveal</h3>
            <p className="text-sm text-secondary mb-4">
              Enter your move and salt from your backup to reveal manually.
            </p>
            
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Your Move</label>
                <select
                  value={manualInput.move}
                  onChange={(e) => onSetManualInput({ ...manualInput, move: e.target.value as 'rock' | 'paper' | 'scissors' })}
                  className="input w-full"
                >
                  <option value="rock">🪨 Rock</option>
                  <option value="paper">📄 Paper</option>
                  <option value="scissors">✂️ Scissors</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Salt (hex string)</label>
                <input
                  type="text"
                  value={manualInput.salt}
                  onChange={(e) => onSetManualInput({ ...manualInput, salt: e.target.value })}
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
                    let newInput = { ...manualInput };
                    if (storedMove) newInput.move = storedMove as 'rock' | 'paper' | 'scissors';
                    if (storedSalt) newInput.salt = storedSalt;
                    onSetManualInput(newInput);
                    console.log('🔄 Auto-fill from storage:', { storedMove, storedSalt });
                  }}
                  className="btn btn-secondary text-sm"
                >
                  🔄 Auto-fill from storage
                </button>
              </div>
            </div>

            <div className="flex gap-3 mt-4">
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
                  onSetManualInput({ ...manualInput, isVisible: false });
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

      {/* Minimal info box for move and salt (now below the reveal card) */}
      <div className="mb-6" style={{ maxWidth: 420, margin: '0 auto' }}>
        <div style={{ background: 'rgba(99,102,241,0.07)', border: '1px solid #6366f1', borderRadius: 8, padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div>
            <div className="text-xs text-secondary">Your Move</div>
            <div className="font-mono font-bold text-lg flex items-center gap-2">
              {displayMove ? displayMove : '—'}
              <span style={{ fontSize: '1.5rem' }}>{displayMove ? (displayMove === 'rock' ? '🪨' : displayMove === 'paper' ? '📄' : displayMove === 'scissors' ? '✂️' : '❓') : ''}</span>
            </div>
          </div>
          <div style={{ flex: 1 }} />
          <div>
            <div className="text-xs text-secondary">Your Salt</div>
            <div className="font-mono" style={{ fontSize: '0.75rem', maxWidth: 180, wordBreak: 'break-all', whiteSpace: 'pre-wrap' }}>{displaySalt || '—'}</div>
          </div>
        </div>
      </div>

      {/* Remove the old full-screen modal */}
    </div>
  );
} 