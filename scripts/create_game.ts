import * as anchor from "@coral-xyz/anchor";
import {
  MOVE_NAMES,
  validateMove,
  getProgram,
  getGlobalState,
  generateSalt,
  createMoveHash,
  saveMove,
  getPlayerFromWallet,
  formatSalt,
  formatHash,
  saltToHex
} from "./utils";

async function main() {
  // Get move from command line argument
  const moveArg = process.argv[2];
  
  if (!moveArg) {
    console.log("Usage: yarn create-game <rock|paper|scissors>");
    console.log("Example: yarn create-game rock");
    process.exit(1);
  }
  
  try {
    // Validate move
    const move = validateMove(moveArg);
    
    // Get program instance
    const program = getProgram();
    
    console.log(`🎮 Creating game with move: ${MOVE_NAMES[move]}`);
    
    // Get current game counter before creating
    const globalState = await getGlobalState(program);
    const gameId = globalState.gameCounter;
    
    console.log(`📊 Current game counter: ${gameId}`);
    
    // Generate random salt and create hash
    const salt = generateSalt();
    const moveHash = createMoveHash(move, salt);
    
    console.log(`Salt: ${formatSalt(salt)}...`);
    console.log(`Hash: ${formatHash(moveHash)}...`);
    
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
    const saltHex = saltToHex(salt);
    const player = getPlayerFromWallet();
    
    saveMove(player, gameId.toNumber(), moveArg.toLowerCase(), saltHex);
    
    console.log("");
    console.log("🔑 Move and salt saved to moves.json");
    console.log("");
    console.log("📝 To join this game, use:");
    console.log(`make alice_join ${gameId} <move>`);
    console.log("or");
    console.log(`make bob_join ${gameId} <move>`);
    
  } catch (error) {
    console.error("❌ Error creating game:", error);
    process.exit(1);
  }
}

// Run the script
main().catch(console.error); 