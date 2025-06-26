import * as dotenv from "dotenv";
dotenv.config();

import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { CryptoPvp } from "../target/types/crypto_pvp";
import * as fs from "fs";
import * as path from "path";

// Helper to format move for reveal
function formatMoveForReveal(move: string) {
  switch (move.toLowerCase()) {
    case 'rock': return { rock: {} };
    case 'paper': return { paper: {} };
    case 'scissors': return { scissors: {} };
    default: throw new Error(`Invalid move: ${move}`);
  }
}

// Helper to convert hex string to Uint8Array
function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}

// Helper to read move from moves.json
function readMove(player: string, gameId: number): { move: string; salt: string } | null {
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

const MOVE_NAMES = ['Rock', 'Paper', 'Scissors'];

async function main() {
  // Get game ID from command line argument
  const gameIdArg = process.argv[2];
  
  if (!gameIdArg) {
    console.log("Usage: yarn reveal-move <game_id>");
    console.log("Example: yarn reveal-move 8");
    process.exit(1);
  }
  
  const gameId = parseInt(gameIdArg);
  if (isNaN(gameId) || gameId < 0) {
    console.log("❌ Invalid game ID. Must be a positive number.");
    process.exit(1);
  }
  
  // Determine player from wallet
  const player = process.env.ANCHOR_WALLET?.includes('playerAlice') ? 'alice' : 
                 process.env.ANCHOR_WALLET?.includes('playerBob') ? 'bob' : 'unknown';
  
  if (player === 'unknown') {
    console.log("❌ Could not determine player from ANCHOR_WALLET");
    console.log("Make sure you're using playerAlice.json or playerBob.json");
    process.exit(1);
  }
  
  // Read move from moves.json
  const moveData = readMove(player, gameId);
  if (!moveData) {
    console.log(`❌ No move found for ${player} in game ${gameId}`);
    console.log("Make sure you created or joined this game first");
    process.exit(1);
  }
  
  // Configure the client to use the local cluster
  anchor.setProvider(anchor.AnchorProvider.env());
  const program = anchor.workspace.cryptoPvp as Program<CryptoPvp>;
  
  console.log(`🔓 ${player.charAt(0).toUpperCase() + player.slice(1)} revealing move in game ${gameId}`);
  console.log(`Move: ${moveData.move}`);
  console.log(`Salt: ${moveData.salt.slice(0, 8)}...`);
  
  try {
    // Convert salt from hex to bytes
    const saltBytes = hexToBytes(moveData.salt);
    
    // Format move for reveal
    const moveChoice = formatMoveForReveal(moveData.move);
    
    await program.methods
      .revealMove(new anchor.BN(gameId), moveChoice as any, Array.from(saltBytes))
      .rpc();
    
    console.log("✅ Move revealed successfully!");
    console.log(`🎯 Game ID: ${gameId}`);
    console.log(`Move revealed: ${moveData.move}`);
    
    // Check if both players have revealed
    console.log("");
    console.log("📝 Waiting for other player to reveal...");
    console.log("Check game state to see if both players have revealed");
    
  } catch (error) {
    console.error("❌ Error revealing move:", error);
  }
}

// Run the script
main().catch(console.error); 