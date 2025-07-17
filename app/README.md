# Crypto PvP Frontend

A React TypeScript frontend for the rock-paper-scissors Solana game.

## Features

### 🎮 Complete Game Flow
- **Create Game**: Choose wager amount (0.01, 0.1, or 1.0 SOL) and select your move
- **Join Game**: Browse available games and commit your move
- **Game Play**: Real-time game board showing player moves and reveal phase
- **Results**: Detailed game outcome with payout information

Missing:
### 📊 Player Stats
- Win/loss/tie tracking
- Recent games history
- Game status indicators

## Game States

1. **Waiting** - Game created, waiting for second player
2. **Revealing** - Both players committed, time to reveal moves
3. **Finished** - Game complete with winner determined

## Tech Stack

- **React 18** with TypeScript
- **Vite** for fast development and building
- **CSS Custom Properties** for theming
- **Lucide React** for icons

## Development

```bash
# Install dependencies
yarn install

# Start development server
yarn dev

# Build for production
yarn build
```

## Game Rules

- **Rock** beats Scissors
- **Paper** beats Rock  
- **Scissors** beats Paper
- **Tie** returns original wagers
- **Winner** takes entire pot (2x wager amount)
