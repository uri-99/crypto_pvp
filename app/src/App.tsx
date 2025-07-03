import { useState, useMemo } from 'react';
import { Home } from './components/Home';
import { CreateGame } from './components/CreateGame';
import { JoinGame } from './components/JoinGame';
import { GamePlay } from './components/GamePlay';
import { GameResult } from './components/GameResult';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider, WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useWallet } from '@solana/wallet-adapter-react';
import { Connection, PublicKey } from '@solana/web3.js';
import { AnchorProvider, Program, BN, web3 } from '@coral-xyz/anchor';
import idl from './idl/crypto_pvp.json';

import '@solana/wallet-adapter-react-ui/styles.css';

export type GameView = 'home' | 'create' | 'join' | 'play' | 'result';
export type Move = 'rock' | 'paper' | 'scissors';
export type WagerAmount = 'sol001' | 'sol01' | 'sol1';
export type GameStatus = 'waiting' | 'active' | 'revealing' | 'finished';

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

  const handleCreateGame = (_wager: WagerAmount, _move: Move) => {
    // After creating game on blockchain, go back to home
    setTimeout(() => {
      setCurrentView('home');
    }, 2000);
  };

  const handleJoinGame = async (gameId: string, _move: Move) => {
    try {
      if (!wallet.publicKey) throw new Error('Wallet not connected');
      
      const connection = new Connection('http://localhost:8899');
      const PROGRAM_ID = new PublicKey(idl.address);
      
      const provider = new AnchorProvider(connection, wallet as any, AnchorProvider.defaultOptions());
      const program = new Program(idl as any, provider);
      
      // Find the game PDA
      const [gamePda] = await PublicKey.findProgramAddress([
        Buffer.from('game'),
        new BN(parseInt(gameId)).toArrayLike(Buffer, 'le', 8)
      ], PROGRAM_ID);
      
      const [playerProfilePda] = await PublicKey.findProgramAddress([
        Buffer.from('player_profile'),
        wallet.publicKey.toBytes()
      ], PROGRAM_ID);
      
      // Join the game
      await program.methods.joinGame().accounts({
        game: gamePda,
        player: wallet.publicKey,
        player2Profile: playerProfilePda,
        systemProgram: web3.SystemProgram.programId,
      }).rpc();
      
      // Update UI state - go to play view
      setCurrentGame({
        id: gameId,
        player1: 'Player 1', // Will be updated when we fetch player names
        player2: wallet.publicKey?.toString() || 'Player 2',
        wager: 'sol01', // Will be fetched from blockchain
        status: 'active',
        createdAt: new Date(),
      });
      setCurrentView('play');
      
    } catch (error) {
      console.error('Error joining game:', error);
      alert('Error joining game: ' + (error instanceof Error ? error.message : error));
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