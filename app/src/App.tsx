import { useState } from 'react';
import { Home } from './components/Home';
import { CreateGame } from './components/CreateGame';
import { JoinGame } from './components/JoinGame';
import { GamePlay } from './components/GamePlay';
import { GameResult } from './components/GameResult';

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

function App() {
  const [currentView, setCurrentView] = useState<GameView>('home');
  const [currentGame, setCurrentGame] = useState<Game | null>(null);
  const [games, setGames] = useState<Game[]>([]);
  const [playerAddress] = useState('mock_player_address');

  const handleCreateGame = (wager: WagerAmount, move: Move) => {
    const newGame: Game = {
      id: `game_${Date.now()}`,
      player1: playerAddress,
      wager,
      status: 'waiting',
      player1Move: move,
      createdAt: new Date(),
    };
    
    setGames([...games, newGame]);
    setCurrentGame(newGame);
    setCurrentView('play');
  };

  const handleJoinGame = (gameId: string, move: Move) => {
    const game = games.find(g => g.id === gameId);
    if (game) {
      const updatedGame = {
        ...game,
        player2: playerAddress,
        player2Move: move,
        status: 'revealing' as GameStatus,
      };
      
      setGames(games.map(g => g.id === gameId ? updatedGame : g));
      setCurrentGame(updatedGame);
      setCurrentView('play');
    }
  };

  const handleRevealMoves = () => {
    if (currentGame && currentGame.player1Move && currentGame.player2Move) {
      const winner = determineWinner(currentGame.player1Move, currentGame.player2Move);
      const updatedGame = {
        ...currentGame,
        status: 'finished' as GameStatus,
        winner: winner === 'tie' ? 'tie' : (winner === 'player1' ? currentGame.player1 : currentGame.player2),
      };
      
      setGames(games.map(g => g.id === currentGame.id ? updatedGame : g));
      setCurrentGame(updatedGame);
      setCurrentView('result');
    }
  };

  const determineWinner = (move1: Move, move2: Move): 'player1' | 'player2' | 'tie' => {
    if (move1 === move2) return 'tie';
    
    if (
      (move1 === 'rock' && move2 === 'scissors') ||
      (move1 === 'paper' && move2 === 'rock') ||
      (move1 === 'scissors' && move2 === 'paper')
    ) {
      return 'player1';
    }
    
    return 'player2';
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

  const availableGames = games.filter(g => g.status === 'waiting' && g.player1 !== playerAddress);

  return (
    <div className="min-h-screen" style={{ background: 'var(--background)', color: 'var(--text)' }}>
      <div className="container">
        <div className="py-8">
          {currentView === 'home' && (
            <Home
              onCreateGame={() => setCurrentView('create')}
              onJoinGame={() => setCurrentView('join')}
            />
          )}
          
          {currentView === 'create' && (
            <CreateGame
              onCreateGame={handleCreateGame}
              onBack={handleBackToHome}
            />
          )}
          
          {currentView === 'join' && (
            <JoinGame
              games={availableGames}
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
              playerAddress={playerAddress}
            />
          )}
          
          {currentView === 'result' && currentGame && (
            <GameResult
              game={currentGame}
              onPlayAgain={() => setCurrentView('create')}
              onBackToHome={handleBackToHome}
              getWagerDisplay={getWagerDisplay}
              playerAddress={playerAddress}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default App; 