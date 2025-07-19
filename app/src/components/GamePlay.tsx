import { useState, useEffect } from 'react';
import { Game, WagerAmount } from '../App';
import { ArrowLeft, Clock, Eye, EyeOff } from 'lucide-react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { Program, AnchorProvider, web3, BN } from '@coral-xyz/anchor';
import idl from '../idl/crypto_pvp.json';
import { GamePlaySaltBackup } from './GamePlaySaltBackup';
import { GamePlayRockPaperScissors } from './GamePlayRockPaperScissors';
import { GamePlayReveal } from './GamePlayReveal';
import { GamePlayWaitingForOpponent } from './GamePlayWaitingForOpponent';
import { GamePlayResults } from './GamePlayResults';



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
  

  
  // UI state management
  const [uiState, setUIState] = useState<'playing' | 'saltBackup' | 'revealing' | 'waitingForOpponent' | 'results'>('playing');
  
  // Manual input state
  const [manualInput, setManualInput] = useState({
    move: 'rock' as 'rock' | 'paper' | 'scissors',
    salt: '',
    isVisible: false
  });
  

  
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
          
          
          if (newStatus === 'Finished') {
            console.log('🏁 Game finished!');
            // ONLY auto-advance to results if NOT on salt backup page
            if (uiState !== 'saltBackup') {
              setUIState('results');
            }
          }
        }

        // Check if we're waiting for opponent reveal
        if (newStatus === 'RevealPhase') {
          const myRevealMove = isPlayer1 ? updatedGame.player1Move : updatedGame.player2Move;
          const opponentRevealMove = isPlayer1 ? updatedGame.player2Move : updatedGame.player1Move;
          
          if (myRevealMove && opponentRevealMove) {
            console.log('🎉 Both players revealed! Moving to results...');
            // ONLY auto-advance if NOT on salt backup page
            if (uiState !== 'saltBackup') {
              setUIState('results');
            }
          } else if (myRevealMove && !opponentRevealMove) {
            console.log('✅ My move revealed, waiting for opponent...');
            // ONLY auto-advance if NOT on salt backup page
            if (uiState !== 'saltBackup') {
              setUIState('waitingForOpponent');
            }
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

  // Handlers for child components
  const handleSaltBackupGoToReveal = () => {
    setUIState('revealing');
  };

  const handleSetManualInput = (input: { move: 'rock' | 'paper' | 'scissors'; salt: string; isVisible: boolean }) => {
    setManualInput(input);
  };

  const handleMoveCommitted = (move: 'rock' | 'paper' | 'scissors', saltHex: string) => {
    setMySelectedMove(move);
    setSalt(saltHex);
    setUIState('saltBackup');
  };

  const handleGameDataUpdate = (updatedGame: Game) => {
    setCurrentGameData(updatedGame);
  };

  const handleRevealSuccess = (move: 'rock' | 'paper' | 'scissors') => {
    setMySelectedMove(move);
    setUIState('waitingForOpponent');
    // The polling will handle checking if both players revealed and transitioning to results
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



  // Show results page
  if (uiState === 'results' && mySelectedMove && opponentMove) {
    return (
      <GamePlayResults
        currentGameData={currentGameData}
        mySelectedMove={mySelectedMove}
        opponentMove={opponentMove}
        onBack={onBack}
        getWagerDisplay={getWagerDisplay}
      />
    );
  }

  // Show waiting for opponent reveal page
  if (uiState === 'waitingForOpponent') {
    return (
      <GamePlayWaitingForOpponent
        currentGameData={currentGameData}
        mySelectedMove={mySelectedMove}
        onBack={onBack}
        getWagerDisplay={getWagerDisplay}
      />
    );
  }

  // Show reveal page
  if (uiState === 'revealing') {
    return (
      <GamePlayReveal
        game={game}
        currentGameData={currentGameData}
        mySelectedMove={mySelectedMove}
        salt={salt}
        isPlayer1={isPlayer1}
        manualInput={manualInput}
        onBack={onBack}
        onRevealSuccess={handleRevealSuccess}
        onGameDataUpdate={handleGameDataUpdate}
        onSetManualInput={handleSetManualInput}
        getWagerDisplay={getWagerDisplay}
      />
    );
  }

  // Show salt info after committing move (PRIORITY - check this first!)
  if (uiState === 'saltBackup' && mySelectedMove && salt) {
    return (
      <GamePlaySaltBackup
        game={game}
        currentGameData={currentGameData}
        gameState={gameState}
        mySelectedMove={mySelectedMove}
        salt={salt}
        onBack={onBack}
        onGoToReveal={handleSaltBackupGoToReveal}
        getWagerDisplay={getWagerDisplay}
      />
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
      <GamePlayRockPaperScissors
        currentGameData={currentGameData}
        mySelectedMove={mySelectedMove}
        isPlayer1={isPlayer1}
        onBack={onBack}
        onMoveCommitted={handleMoveCommitted}
        onGameDataUpdate={handleGameDataUpdate}
        getWagerDisplay={getWagerDisplay}
      />
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