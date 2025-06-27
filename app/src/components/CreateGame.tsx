import { useState } from 'react';
import { WagerAmount, Move } from '../App';
import { ArrowLeft, Plus, DollarSign } from 'lucide-react';

interface CreateGameProps {
  onCreateGame: (wager: WagerAmount, move: Move) => void;
  onBack: () => void;
}

export function CreateGame({ onCreateGame, onBack }: CreateGameProps) {
  const [selectedWager, setSelectedWager] = useState<WagerAmount>('sol01');
  const [selectedRounds, setSelectedRounds] = useState<1 | 3 | 5>(1);
  const [isCreating, setIsCreating] = useState(false);

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

  const handleCreateGame = async () => {
    setIsCreating(true);
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // For now, we'll use a default move since rounds selection is separate
    onCreateGame(selectedWager, 'rock');
    setIsCreating(false);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={onBack} className="btn btn-secondary">
          <ArrowLeft size={16} />
        </button>
        <div>
          <h2 className="text-2xl font-bold">Create New Game</h2>
          <p className="text-secondary">Choose your stakes and game format</p>
        </div>
      </div>

      {/* Wager Selection */}
      <div className="card mb-6">
        <div className="flex items-center gap-2 mb-4">
          <DollarSign size={20} />
          <h3 className="text-xl font-semibold">Choose Your Wager</h3>
        </div>
        
        <div className="grid grid-3 gap-3">
          {wagerOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => setSelectedWager(option.value)}
              className={`move-option ${selectedWager === option.value ? 'selected' : ''}`}
            >
              <div className="text-4xl mb-2">💰</div>
              <div className="font-semibold">{option.label}</div>
              <div className="text-sm text-secondary">{option.description}</div>
            </button>
          ))}
        </div>
        
        <div className="text-sm text-accent mt-3">
          Winner takes all • Ties split the pot
        </div>
      </div>

      {/* Round Selection */}
      <div className="card mb-6">
        <div className="flex items-center gap-2 mb-4">
          <h3 className="text-xl font-semibold">Choose Game Format</h3>
        </div>
        
        <div className="grid grid-3 gap-3 mb-4">
          {roundOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => setSelectedRounds(option.value)}
              className={`move-option ${selectedRounds === option.value ? 'selected' : ''}`}
            >
              <div className="text-4xl mb-2">{option.emoji}</div>
              <div className="font-semibold">{option.name}</div>
              <div className="text-sm text-secondary">{option.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Create Button */}
      <div className="text-center">
        <button
          onClick={handleCreateGame}
          disabled={isCreating}
          className="btn btn-primary btn-large"
        >
          {isCreating ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
              Creating Game...
            </>
          ) : (
            <>
              <Plus size={20} />
              Create {roundOptions.find(r => r.value === selectedRounds)?.name} for {wagerOptions.find(w => w.value === selectedWager)?.label}
            </>
          )}
        </button>
        <p className="text-sm text-secondary mt-2">
          {roundOptions.find(r => r.value === selectedRounds)?.description}
        </p>
      </div>
    </div>
  );
} 