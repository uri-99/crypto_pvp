import { useState } from 'react';
import { Game, WagerAmount } from '../App';
import { ArrowLeft } from 'lucide-react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { Program, AnchorProvider, BN } from '@coral-xyz/anchor';
import idl from '../idl/crypto_pvp.json';

// Browser-compatible utilities (extracted from GamePlay.tsx)
const MOVE_MAP = { rock: 0, paper: 1, scissors: 2 } as const;

// Helper function to create move hash (move + salt)
async function createMoveHash(move: number, salt: Uint8Array): Promise<Uint8Array> {
  const moveData = new Uint8Array(33);
  moveData[0] = move; // 0=Rock, 1=Paper, 2=Scissors
  moveData.set(salt, 1);
  
  // Use Web Crypto API instead of Node.js crypto
  const hash = await crypto.subtle.digest('SHA-256', moveData);
  return new Uint8Array(hash);
}

// Helper function to generate random salt
function generateSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(32));
}

interface GamePlayRockPaperScissorsProps {
  currentGameData: Game;
  mySelectedMove: 'rock' | 'paper' | 'scissors' | null;
  isPlayer1: boolean;
  onBack: () => void;
  onMoveCommitted: (move: 'rock' | 'paper' | 'scissors', saltHex: string) => void;
  onGameDataUpdate: (updatedGame: Game) => void;
  getWagerDisplay: (wager: WagerAmount) => string;
}

export function GamePlayRockPaperScissors({
  currentGameData,
  mySelectedMove,
  isPlayer1,
  onBack,
  onMoveCommitted,
  onGameDataUpdate,
  getWagerDisplay
}: GamePlayRockPaperScissorsProps) {
  const [isCommitting, setIsCommitting] = useState(false);
  const { publicKey, signTransaction } = useWallet();
  const { connection } = useConnection();

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
      
      // Update current game data to reflect our committed move
      const updatedGame = {
        ...currentGameData,
        [isPlayer1 ? 'player1Move' : 'player2Move']: move
      };
      
      // Notify parent components
      onMoveCommitted(move, saltHex);
      onGameDataUpdate(updatedGame);
      
    } catch (error) {
      console.error('❌ Error committing move:', error);
      alert('Failed to commit move. Please try again.');
    } finally {
      setIsCommitting(false);
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