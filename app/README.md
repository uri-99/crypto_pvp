# Crypto PvP Frontend

A React TypeScript frontend for the rock-paper-scissors Solana game.

## Features

### 🎮 Complete Game Flow
- **Create Game**: Choose wager amount (0.01, 0.1, or 1.0 SOL) and select your move
- **Join Game**: Browse available games and commit your move
- **Game Play**: Real-time game board showing player moves and reveal phase
- **Results**: Detailed game outcome with payout information

### 🎨 Modern UI
- Dark crypto-themed design
- Responsive layout for mobile and desktop
- Smooth animations and hover effects
- Icon-based navigation using Lucide React

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

## Mock Data

Currently uses mock data for demonstration:
- Player is hardcoded as "alice"
- Games are stored in component state
- No actual blockchain interactions

## Integration Ready

The frontend is designed to easily integrate with the Solana program:
- Clean separation between UI and game logic
- Type-safe interfaces matching the Rust program
- Event handlers ready for Web3 wallet connections
- Move commitment/reveal flow matches on-chain game states 