import * as dotenv from "dotenv";
dotenv.config();

import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { CryptoPvp } from "../target/types/crypto_pvp";
import { createHash } from "crypto";
import * as fs from "fs";
import * as path from "path";

// Helper function to create move hash (move + salt)
function createMoveHash(move: number, salt: Uint8Array): Uint8Array {
  const moveData = new Uint8Array(33);
  moveData[0] = move; // 0=Rock, 1=Paper, 2=Scissors
  moveData.set(salt, 1);
  
  const hash = createHash('sha256').update(moveData).digest();
  return new Uint8Array(hash);
}

// Helper function to generate random salt
function generateSalt(): Uint8Array {
  return new Uint8Array(32).map(() => Math.floor(Math.random() * 256));
}

// Helper to format move for reveal
function formatMoveForReveal(move: number) {
  switch (move) {
    case 0: return { rock: {} };
    case 1: return { paper: {} };
    case 2: return { scissors: {} };
    default: throw new Error(`Invalid move: ${move}`);
  }
}

// Helper to save move to moves.json
function saveMove(player: string, gameId: number, move: string, salt: string) {
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

const MOVE_NAMES = ['Rock', 'Paper', 'Scissors'];

async function main() {
  // Get move from command line argument
  const moveArg = process.argv[2]?.toLowerCase();
  
  if (!moveArg || !['rock', 'paper', 'scissors'].includes(moveArg)) {
    console.log("Usage: yarn create-game <rock|paper|scissors>");
    console.log("Example: yarn create-game rock");
    process.exit(1);
  }
  
  // Convert move to number
  const moveMap = { rock: 0, paper: 1, scissors: 2 };
  const move = moveMap[moveArg as keyof typeof moveMap];
  
  // Configure the client to use the local cluster
  anchor.setProvider(anchor.AnchorProvider.env());
  const program = anchor.workspace.cryptoPvp as Program<CryptoPvp>;
  
  console.log(`🎮 Creating game with move: ${MOVE_NAMES[move]}`);
  
  try {
    // Get current game counter before creating
    const [globalStatePda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("global_state")],
      program.programId
    );
    
    const globalState = await program.account.globalState.fetch(globalStatePda);
    const gameId = globalState.gameCounter;
    
    console.log(`📊 Current game counter: ${gameId}`);
    
    // Generate random salt and create hash
    const salt = generateSalt();
    const moveHash = createMoveHash(move, salt);
    
    console.log(`Salt: ${Array.from(salt.slice(0, 8)).map(b => b.toString(16).padStart(2, '0')).join('')}...`);
    console.log(`Hash: ${Array.from(moveHash.slice(0, 8)).map(b => b.toString(16).padStart(2, '0')).join('')}...`);
    
    // Create game with 0.1 SOL wager
    const wager = new anchor.BN(100000000); // 0.1 SOL in lamports
    
    await program.methods
      .createGame(wager, Array.from(moveHash))
      .rpc();
    
    console.log("✅ Game created successfully!");
    console.log(`🎯 Game ID: ${gameId}`);
    console.log(`Move committed: ${MOVE_NAMES[move]}`);
    console.log(`Wager: 0.1 SOL`);
    
    // Save move to moves.json
    const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');
    const player = process.env.ANCHOR_WALLET?.includes('playerAlice') ? 'alice' : 
                   process.env.ANCHOR_WALLET?.includes('playerBob') ? 'bob' : 'unknown';
    
    saveMove(player, gameId.toNumber(), moveArg, saltHex);
    
    console.log("");
    console.log("🔑 Move and salt saved to moves.json");
    console.log("");
    console.log("📝 To join this game, use:");
    console.log(`make alice_join ${gameId} <move>`);
    console.log("or");
    console.log(`make bob_join ${gameId} <move>`);
    
  } catch (error) {
    console.error("❌ Error creating game:", error);
  }
}

// Run the script
main().catch(console.error); 
