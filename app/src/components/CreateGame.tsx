import { useState } from 'react';
import { WagerAmount, Move } from '../App';
import { ArrowLeft, DollarSign } from 'lucide-react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useConnection } from '@solana/wallet-adapter-react';
import { Program, AnchorProvider, web3, BN } from '@coral-xyz/anchor';
import idl from '../idl/crypto_pvp.json';

interface CreateGameProps {
  onCreateGame: (_wager: WagerAmount, _move: Move) => void;
  onBack: () => void;
}

const PROGRAM_ID = new web3.PublicKey(idl.address);

export function CreateGame({ onCreateGame, onBack }: CreateGameProps) {
  const [selectedWager, setSelectedWager] = useState<WagerAmount>('sol01');
  const [selectedRounds, setSelectedRounds] = useState<1 | 3 | 5>(1);
  const [isCreating, setIsCreating] = useState(false);
  const { connection } = useConnection();
  const wallet = useWallet();

  const wagerOptions: { value: WagerAmount; label: string; description: string }[] = [
    { value: 'sol001', label: '0.01 SOL', description: 'Starter Stakes' },
    { value: 'sol01', label: '0.1 SOL', description: 'Standard Stakes' },
    { value: 'sol1', label: '1 SOL', description: 'High Stakes' },
  ];

  const roundOptions: { value: 1 | 3 | 5; emoji: string; name: string; description: string }[] = [
    { value: 1, emoji: '⚡', name: 'Quick Match', description: 'Best of 1 round' },
    { value: 3, emoji: '🔥', name: 'Standard Match', description: 'Best of 3 rounds' },
    { value: 5, emoji: '👑', name: 'Championship', description: 'Best of 5 rounds' },
  ];

  const getWagerEnum = (wager: WagerAmount) => {
    switch (wager) {
      case 'sol001': return { sol001: {} };
      case 'sol01': return { sol01: {} }; 
      case 'sol1': return { sol1: {} };
      default: return { sol01: {} };
    }
  };

  const handleCreateGame = async () => {
    setIsCreating(true);
    try {
      if (!wallet.publicKey) throw new Error('Wallet not connected');
      if (!wallet) throw new Error('Wallet not available');
      if (!connection) throw new Error('Connection not available');
      
      // Generate random salt
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
      
      // Derive PDAs
      const [globalStatePda] = await web3.PublicKey.findProgramAddress([
        Buffer.from('global_state')
      ], PROGRAM_ID);
      
      // Fetch global state to get game_counter
      const opts = AnchorProvider.defaultOptions();
      const provider = new AnchorProvider(connection, wallet as any, opts);
      const program = new Program(idl as any, provider);
      
      const globalState = await (program.account as any).globalState.fetch(globalStatePda);
      const gameCounter = (globalState as any).gameCounter.toNumber();
      
      const [gamePda] = await web3.PublicKey.findProgramAddress([
        Buffer.from('game'),
        new BN(gameCounter).toArrayLike(Buffer, 'le', 8)
      ], PROGRAM_ID);
      
      const [playerProfilePda] = await web3.PublicKey.findProgramAddress([
        Buffer.from('player_profile'),
        wallet.publicKey.toBytes()
      ], PROGRAM_ID);
      
      // Send transaction
      await program.methods.createGame(
        getWagerEnum(selectedWager),
        moveHash
      ).accounts({
        game: gamePda,
        globalState: globalStatePda,
        player: wallet.publicKey,
        player1Profile: playerProfilePda,
        systemProgram: web3.SystemProgram.programId,
      }).rpc();
      
      // Call parent handler (for UI state)
      onCreateGame(selectedWager, move as Move);
    } catch (e) {
      console.error('Error details:', e);
      alert('Error creating game: ' + (e instanceof Error ? e.message : e));
    }
    setIsCreating(false);
  };

  return (
    <div className="max-w-2xl mx-auto" style={{paddingTop: '4px', paddingBottom: '16px'}}>
      <div className="flex items-center gap-4 mb-2" style={{marginTop: 0}}>
        <button onClick={onBack} className="btn btn-secondary">
          <ArrowLeft size={16} />
        </button>
        <div>
          <h2 className="text-3xl font-extrabold" style={{color: 'rgba(255,255,255,0.88)'}}>Create New Game</h2>
          <p className="text-base mt-1" style={{color: 'rgba(255,255,255,0.80)'}}>Choose your stakes and game format</p>
        </div>
      </div>

      {/* Wager Selection */}
      <div className="card mb-4" style={{padding: '1rem'}}>
        <div className="flex items-center gap-2 mb-2">
          <DollarSign size={24} />
          <h3 className="text-2xl font-bold" style={{color: 'rgba(255,255,255,0.88)'}}>Choose Your Wager</h3>
        </div>
        
        <div className="grid grid-3 gap-2">
          {wagerOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => setSelectedWager(option.value)}
              className={`move-option ${selectedWager === option.value ? 'selected' : ''}`}
            >
              <div className="text-3xl mb-1">💰</div>
              <div className="font-bold text-xl" style={{color: 'rgba(255,255,255,0.88)'}}>{option.label}</div>
              <div className="text-base" style={{color: 'rgba(255,255,255,0.70)'}}>{option.description}</div>
            </button>
          ))}
        </div>
        
        <div className="text-base text-accent mt-3 font-semibold" style={{color: 'rgba(255,255,255,0.75)'}}>Winner takes all • Ties split the pot</div>
      </div>

      {/* Round Selection */}
      <div className="card mb-4" style={{padding: '1rem'}}>
        <div className="flex items-center gap-2 mb-2">
          <h3 className="text-2xl font-bold" style={{color: 'rgba(255,255,255,0.88)'}}>Choose Game Format</h3>
        </div>
        
        <div className="grid grid-3 gap-2 mb-2">
          {roundOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => setSelectedRounds(option.value)}
              className={`move-option ${selectedRounds === option.value ? 'selected' : ''}`}
            >
              <div className="text-3xl mb-1">{option.emoji}</div>
              <div className="font-bold text-xl" style={{color: 'rgba(255,255,255,0.88)'}}>{option.name}</div>
              <div className="text-base" style={{color: 'rgba(255,255,255,0.70)'}}>{option.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Create Button */}
      <div className="text-center mt-2">
        <button
          onClick={handleCreateGame}
          disabled={isCreating}
          className="btn btn-primary btn-large text-xl font-bold text-white"
        >
          {isCreating ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
              Creating Game...
            </>
          ) : (
            <>Create Match</>
          )}
        </button>
      </div>
    </div>
  );
} 