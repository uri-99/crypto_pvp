import * as anchor from "@coral-xyz/anchor";
import {
  MOVE_NAMES,
  validateMove,
  validateGameId,
  getProgram,
  generateSalt,
  createMoveHash,
  saveMove,
  getPlayerFromWallet,
  formatSalt,
  formatHash,
  saltToHex
} from "./utils";

async function main() {
  // Get game ID and move from command line arguments
  const gameIdArg = process.argv[2];
  const moveArg = process.argv[3];
  
  if (!gameIdArg || !moveArg) {
    console.log("Usage: yarn join-game <game_id> <rock|paper|scissors>");
    console.log("Example: yarn join-game 123 rock");
    console.log("Note: Wager amount is determined by the existing game");
    process.exit(1);
  }
  
  try {
    // Validate game ID and move
    const gameId = validateGameId(gameIdArg);
    const move = validateMove(moveArg);
    
    // Get program instance
    const program = getProgram();
    
    console.log(`🎮 Joining game ${gameId} with move: ${MOVE_NAMES[move]}`);
    console.log(`💰 Will match the existing game's wager amount`);
    
    // Generate random salt and create hash
    const salt = generateSalt();
    const moveHash = createMoveHash(move, salt);
    
    console.log(`Salt: ${formatSalt(salt)}...`);
    console.log(`Hash: ${formatHash(moveHash)}...`);
    
    await program.methods
      .joinGame(new anchor.BN(gameId), Array.from(moveHash))
      .rpc();
    
    console.log("✅ Successfully joined game!");
    console.log(`🎯 Game ID: ${gameId}`);
    console.log(`Move committed: ${MOVE_NAMES[move]}`);
    
    // Save move to moves.json
    const saltHex = saltToHex(salt);
    const player = getPlayerFromWallet();
    
    saveMove(player, gameId, moveArg.toLowerCase(), saltHex);
    
    console.log("");
    console.log("🔑 Move and salt saved to moves.json");
    console.log("");
    console.log("📝 Both players have now committed their moves!");
    console.log("Ready for reveal phase...");
    
  } catch (error) {
    console.error("❌ Error joining game:", error);
    process.exit(1);
  }
}

// Run the script
main().catch(console.error); 