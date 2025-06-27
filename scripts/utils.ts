import * as dotenv from "dotenv";
dotenv.config();

import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { CryptoPvp } from "../target/types/crypto_pvp";
import { createHash } from "crypto";
import * as fs from "fs";
import * as path from "path";

// Constants
export const MOVE_NAMES = ['Rock', 'Paper', 'Scissors'];
export const MOVE_MAP = { rock: 0, paper: 1, scissors: 2 } as const;

// Wager amount constants
export const WAGER_AMOUNTS = {
  Sol1: { lamports: 1_000_000_000, display: '1.0 SOL' },
  Sol01: { lamports: 100_000_000, display: '0.1 SOL' },
  Sol001: { lamports: 10_000_000, display: '0.01 SOL' }
} as const;

export const WAGER_MAP = { 
  'sol1': 'Sol1', 
  '1': 'Sol1',
  'sol01': 'Sol01', 
  '0.1': 'Sol01',
  'sol001': 'Sol001',
  '0.01': 'Sol001'
} as const;

// Helper function to create move hash (move + salt)
export function createMoveHash(move: number, salt: Uint8Array): Uint8Array {
  const moveData = new Uint8Array(33);
  moveData[0] = move; // 0=Rock, 1=Paper, 2=Scissors
  moveData.set(salt, 1);
  
  const hash = createHash('sha256').update(moveData).digest();
  return new Uint8Array(hash);
}

// Helper function to generate random salt
export function generateSalt(): Uint8Array {
  return new Uint8Array(32).map(() => Math.floor(Math.random() * 256));
}

// Helper to format move for reveal
export function formatMoveForReveal(move: string) {
  switch (move.toLowerCase()) {
    case 'rock': return { rock: {} };
    case 'paper': return { paper: {} };
    case 'scissors': return { scissors: {} };
    default: throw new Error(`Invalid move: ${move}`);
  }
}

// Helper to convert hex string to Uint8Array
export function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}

// Helper to save move to moves.json
export function saveMove(player: string, gameId: number, move: string, salt: string) {
  const movesPath = path.join(__dirname, '..', 'moves.json');
  let moves;
  
  try {
    moves = JSON.parse(fs.readFileSync(movesPath, 'utf8'));
  } catch (error) {
    moves = { alice: {}, bob: {} };
  }
  
  if (!moves[player]) {
    moves[player] = {};
  }
  
  moves[player][`game_${gameId}`] = {
    move: move,
    salt: salt
  };
  
  fs.writeFileSync(movesPath, JSON.stringify(moves, null, 2));
  console.log(`💾 Move saved to moves.json for ${player} in game ${gameId}`);
}

// Helper to read move from moves.json
export function readMove(player: string, gameId: number): { move: string; salt: string } | null {
  const movesPath = path.join(__dirname, '..', 'moves.json');
  
  try {
    const moves = JSON.parse(fs.readFileSync(movesPath, 'utf8'));
    const gameKey = `game_${gameId}`;
    
    if (moves[player] && moves[player][gameKey]) {
      return moves[player][gameKey];
    }
    
    return null;
  } catch (error) {
    console.error("❌ Error reading moves.json:", error);
    return null;
  }
}

// Helper to determine player from wallet
export function getPlayerFromWallet(): string {
  const wallet = process.env.ANCHOR_WALLET || '';
  if (wallet.includes('playerAlice')) return 'alice';
  if (wallet.includes('playerBob')) return 'bob';
  return 'unknown';
}

// Helper to validate move argument
export function validateMove(moveArg: string): number {
  if (!moveArg || !['rock', 'paper', 'scissors'].includes(moveArg.toLowerCase())) {
    throw new Error(`Invalid move: ${moveArg}. Must be rock, paper, or scissors.`);
  }
  
  const move = MOVE_MAP[moveArg.toLowerCase() as keyof typeof MOVE_MAP];
  return move;
}

// Helper to validate game ID
export function validateGameId(gameIdArg: string): number {
  const gameId = parseInt(gameIdArg);
  if (isNaN(gameId) || gameId < 0) {
    throw new Error(`Invalid game ID: ${gameIdArg}. Must be a positive number.`);
  }
  return gameId;
}

// Helper to get program instance
export function getProgram(): Program<CryptoPvp> {
  anchor.setProvider(anchor.AnchorProvider.env());
  return anchor.workspace.cryptoPvp as Program<CryptoPvp>;
}

// Helper to get global state
export async function getGlobalState(program: Program<CryptoPvp>) {
  const [globalStatePda] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("global_state")],
    program.programId
  );
  
  return await program.account.globalState.fetch(globalStatePda);
}

// Helper to format salt for display
export function formatSalt(salt: Uint8Array): string {
  return Array.from(salt.slice(0, 8)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Helper to format hash for display
export function formatHash(hash: Uint8Array): string {
  return Array.from(hash.slice(0, 8)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Helper to convert salt to hex string
export function saltToHex(salt: Uint8Array): string {
  return Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Helper to validate wager argument
export function validateWager(wagerArg: string): { variant: string; display: string } {
  const normalizedWager = wagerArg.toLowerCase();
  
  if (!Object.keys(WAGER_MAP).includes(normalizedWager)) {
    throw new Error(`Invalid wager: ${wagerArg}. Must be one of: sol1, sol01, sol001 (or 1, 0.1, 0.01)`);
  }
  
  const variant = WAGER_MAP[normalizedWager as keyof typeof WAGER_MAP];
  const display = WAGER_AMOUNTS[variant as keyof typeof WAGER_AMOUNTS].display;
  
  return { variant, display };
}

// Helper to format wager for program call
export function formatWagerForProgram(wagerVariant: string) {
  switch (wagerVariant) {
    case 'Sol1': return { sol1: {} };
    case 'Sol01': return { sol01: {} };
    case 'Sol001': return { sol001: {} };
    default: throw new Error(`Invalid wager variant: ${wagerVariant}`);
  }
} 