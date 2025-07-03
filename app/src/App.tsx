import { useState, useMemo } from 'react';
import { Home } from './components/Home';
import { CreateGame } from './components/CreateGame';
import { JoinGame } from './components/JoinGame';
import { GamePlay } from './components/GamePlay';
import { GameResult } from './components/GameResult';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider, WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useWallet } from '@solana/wallet-adapter-react';
import { useGames } from './utils/useGames';
import '@solana/wallet-adapter-react-ui/styles.css';

export type GameView = 'home' | 'create' | 'join' | 'play' | 'result';
export type Move = 'rock' | 'paper' | 'scissors';
export type WagerAmount = 'sol001' | 'sol01' | 'sol1';
export type GameStatus = 'waiting' | 'active' | 'revealing' | 'finished';

export interface Game {
  id: string;
  player1: string;
  player2?: string;
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
  const { games, loading, refreshGames } = useGames();
  const wallet = useWallet();

  const handleCreateGame = (_wager: WagerAmount, _move: Move) => {
    // After creating game on blockchain, refresh the games list
    setTimeout(() => {
      refreshGames();
      setCurrentView('home'); // Go back to home to see the created game
    }, 2000);
  };

  const handleJoinGame = (gameId: string, move: Move) => {
    // TODO: Implement join game blockchain logic
    console.log('Joining game:', gameId, 'with move:', move);
    
    // For now, just go to play view
    const game = games.find(g => g.id === gameId);
    if (game) {
      setCurrentGame({
        ...game,
        player2: wallet.publicKey?.toString(),
        player2Move: move,
        status: 'revealing',
      });
      setCurrentView('play');
    }
  };

  const handleRevealMoves = () => {
    // TODO: Implement reveal moves logic
    if (currentGame) {
      setCurrentView('result');
    }
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

  // Filter games to show only those waiting for players (excluding current user's games)
  const availableGames = games.filter(g => 
    g.status === 'waiting' && 
    g.player1 !== wallet.publicKey?.toString()
  );

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
              games={availableGames}
              loading={loading}
              onJoinGame={handleJoinGame}
              onBack={handleBackToHome}
              getWagerDisplay={getWagerDisplay}
            />
          )}
          
          {currentView === 'play' && currentGame && (
            <GamePlay
              game={currentGame}
              onRevealMoves={handleRevealMoves}
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