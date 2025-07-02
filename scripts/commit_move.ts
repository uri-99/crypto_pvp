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
    console.log("Usage: yarn commit-move <game_id> <rock|paper|scissors>");
    console.log("Example: yarn commit-move 123 rock");
    process.exit(1);
  }
  
  try {
    // Validate game ID and move
    const gameId = validateGameId(gameIdArg);
    const move = validateMove(moveArg);
    
    // Get program instance
    const program = getProgram();
    
    console.log(`🎮 Committing move for game ${gameId}: ${MOVE_NAMES[move]}`);
    
    // Generate random salt and create hash
    const salt = generateSalt();
    const moveHash = createMoveHash(move, salt);
    
    console.log(`Salt: ${formatSalt(salt)}...`);
    console.log(`Hash: ${formatHash(moveHash)}...`);
    
    await program.methods
      .commitMove(new anchor.BN(gameId), Array.from(moveHash))
      .rpc();
    
    console.log("✅ Move committed successfully!");
    
    // Save move to moves.json
    const saltHex = saltToHex(salt);
    const player = getPlayerFromWallet();
    saveMove(player, gameId, moveArg.toLowerCase(), saltHex);
    
    console.log("");
    console.log("🔑 Move and salt saved to moves.json");
    console.log("");
    console.log("📝 After both players have committed, use the reveal-move script to reveal your move:");
    console.log(`yarn reveal-move ${gameId}`);
    
  } catch (error) {
    console.error("❌ Error committing move:", error);
    process.exit(1);
  }
}

// Run the script
main().catch(console.error); 