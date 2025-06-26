# Scripts

This directory contains TypeScript scripts for interacting with the crypto PvP game.

## Utils

Common functionality has been extracted to `utils.ts` to avoid code duplication:

- **Move validation and formatting**
- **Salt generation and hashing**
- **File I/O for moves.json**
- **Program instance management**
- **Player wallet detection**

## Scripts

### create_game.ts
Creates a new game with a specified move and saves the move/salt to `moves.json`.

```bash
yarn create-game <rock|paper|scissors>
```

### join_game.ts
Joins an existing game with a specified move and saves the move/salt to `moves.json`.

```bash
yarn join-game <game_id> <rock|paper|scissors>
```

### reveal_move.ts
Reveals a previously committed move by reading from `moves.json`.

```bash
yarn reveal-move <game_id>
```

## Makefile Targets

Convenient Makefile targets are available for Alice and Bob:

- `make alice_create <move>` - Alice creates a game
- `make bob_create <move>` - Bob creates a game
- `make alice_join <game_id> <move>` - Alice joins a game
- `make bob_join <game_id> <move>` - Bob joins a game
- `make alice_reveal <game_id>` - Alice reveals her move
- `make bob_reveal <game_id>` - Bob reveals his move
