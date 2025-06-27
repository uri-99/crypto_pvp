# Scripts

This directory contains TypeScript scripts for interacting with the crypto PvP game.

## Utils

Common functionality in `utils.ts`:

- **Move validation and formatting**
- **Wager amount validation and enum formatting**
- **Salt generation and hashing**
- **File I/O for moves.json**
- **Program instance management**
- **Player wallet detection**

## Scripts

### create_game.ts
Creates a new game with a specified wager and move. **Transfers the wager amount from your wallet to the game account.**

```bash
yarn create-game <wager> <rock|paper|scissors>
```

**Wager options:**
- `sol1` or `1` = 1.0 SOL
- `sol01` or `0.1` = 0.1 SOL  
- `sol001` or `0.01` = 0.01 SOL

**Example:**
```bash
yarn create-game sol01 rock  # Creates game with 0.1 SOL wager
```

### join_game.ts
Joins an existing game with a specified move. **Automatically matches the existing game's wager amount and transfers it from your wallet.**

```bash
yarn join-game <game_id> <rock|paper|scissors>
```

### reveal_move.ts
Reveals a previously committed move by reading from `moves.json`. **When both players reveal, the winner automatically receives the full pot (2x wager amount).**

```bash
yarn reveal-move <game_id>
```

## Important Notes

⚠️ **SOL Transfers**: These scripts transfer actual SOL from your wallet!

- **Creating a game**: Deposits your wager amount to the game account
- **Joining a game**: Deposits matching wager amount to the game account  
- **Game completion**: Winner automatically receives 2x wager amount
- **Ties**: Both players get their original wager back

## Makefile Targets

Convenient Makefile targets are available for Alice and Bob:

- `make alice_create <wager> <move>` - Alice creates a game
- `make bob_create <wager> <move>` - Bob creates a game
- `make alice_join <game_id> <move>` - Alice joins a game
- `make bob_join <game_id> <move>` - Bob joins a game
- `make alice_reveal <game_id>` - Alice reveals her move
- `make bob_reveal <game_id>` - Bob reveals his move

**Examples:**
```bash
make alice_create sol01 rock     # Alice creates 0.1 SOL game
make bob_join 0 paper           # Bob joins game 0 with paper
make alice_reveal 0             # Alice reveals her move
```
