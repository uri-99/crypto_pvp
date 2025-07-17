import { useState, useMemo } from 'react';
import { Home } from './components/Home';
import { CreateGame } from './components/CreateGame';
import { JoinGame } from './components/JoinGame';
import { GamePlay } from './components/GamePlay';
import { GameResult } from './components/GameResult';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider, WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useWallet } from '@solana/wallet-adapter-react';

import '@solana/wallet-adapter-react-ui/styles.css';

export type GameView = 'home' | 'create' | 'join' | 'play' | 'result';
export type Move = 'rock' | 'paper' | 'scissors';
export type WagerAmount = 'sol001' | 'sol01' | 'sol1';
export type GameStatus = 'WaitingForPlayer' | 'CommitPhase' | 'RevealPhase' | 'Finished';

export interface Game {
  id: string;
  player1: string;
  player1Name?: string;
  player2?: string;
  player2Name?: string;
  wager: WagerAmount;
  status: GameStatus;
  player1Move?: Move;
  player2Move?: Move;
  winner?: string;
  createdAt: Date;
}

function AppContent() {
  const [currentView, setCurrentView] = useState<GameView>('home');
  const [currentGame, setCurrentGame] = useState<Game | null>(null);
  const wallet = useWallet();

  const handleCreateGame = (wager: WagerAmount, _move: Move, gameId?: string) => {
    // After creating game on blockchain, go to the game's detailed view
    setCurrentGame({
      id: gameId || '0', // Use the actual game ID from blockchain
      player1: wallet.publicKey?.toString() || 'Player 1',
      player2: undefined, // No player 2 yet
      wager: wager,
      status: 'WaitingForPlayer',
      createdAt: new Date(),
    });
    setCurrentView('play');
  };

  const handleJoinGame = async (gameId: string, _move: Move) => {
    // Blockchain interaction is now handled in JoinGame.tsx
    // This function just handles UI state after successful join
    
    console.log('App.tsx handleJoinGame - updating UI state for game:', gameId);
    
    // Update UI state - go to play view
    setCurrentGame({
      id: gameId,
      player1: 'Player 1', // Will be updated when we fetch player names
      player2: wallet.publicKey?.toString() || 'Player 2',
      wager: 'sol01', // Will be fetched from blockchain
      status: 'CommitPhase', // After joining, game moves to commit phase
      createdAt: new Date(),
    });
    setCurrentView('play');
  };

  const handleBackToHome = () => {
    setCurrentView('home');
    setCurrentGame(null);
  };

  const getWagerDisplay = (wager: WagerAmount): string => {
    switch (wager) {
      case 'sol001': return '0.01 SOL';
      case 'sol01': return '0.1 SOL';
      case 'sol1': return '1 SOL';
    }
  };



  return (
    <div className="min-h-screen" style={{ background: 'var(--background)', color: 'var(--text)', paddingTop: 40 }}>
      <div className="container">
        <div className="py-8">
          {currentView === 'home' && (
            <>
              <div style={{ position: 'absolute', top: 24, right: 24, zIndex: 10 }}>
                <WalletMultiButton />
              </div>
              <Home
                onCreateGame={() => setCurrentView('create')}
                onJoinGame={() => setCurrentView('join')}
                onRejoinGame={(game: Game) => {
                  setCurrentGame(game);
                  setCurrentView('play');
                }}
                getWagerDisplay={getWagerDisplay}
              />
            </>
          )}
          
          {currentView === 'create' && (
            <>
              <div style={{ position: 'absolute', top: 24, right: 24, zIndex: 10 }}>
                <WalletMultiButton />
              </div>
              <CreateGame
                onCreateGame={handleCreateGame}
                onBack={handleBackToHome}
              />
            </>
          )}
          
          {currentView === 'join' && (
            <JoinGame
              onJoinGame={handleJoinGame}
              onBack={handleBackToHome}
              onCreateGame={() => setCurrentView('create')}
              getWagerDisplay={getWagerDisplay}
            />
          )}
          
          {currentView === 'play' && currentGame && (
            <GamePlay
              game={currentGame}
              onBack={handleBackToHome}
              getWagerDisplay={getWagerDisplay}
              playerAddress={wallet.publicKey?.toString() || ''}
            />
          )}
          
          {currentView === 'result' && currentGame && (
            <GameResult
              game={currentGame}
              onPlayAgain={() => setCurrentView('create')}
              onBackToHome={handleBackToHome}
              getWagerDisplay={getWagerDisplay}
              playerAddress={wallet.publicKey?.toString() || ''}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function App() {
  // Solana wallet setup
  // TODO configure for prod
  const endpoint = useMemo(() => 'http://localhost:8899', []);
  const wallets = useMemo(() => [], []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets}>
        <WalletModalProvider>
          <AppContent />
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}

export default App; 