import * as anchor from "@coral-xyz/anchor";
import {
  validateGameId,
  getProgram,
  getPlayerFromWallet
} from "./utils";

async function main() {
  // Get game ID from command line arguments
  const gameIdArg = process.argv[2];
  
  if (!gameIdArg) {
    console.log("Usage: yarn join-game <game_id>");
    console.log("Example: yarn join-game 123");
    process.exit(1);
  }
  
  try {
    // Validate game ID
    const gameId = validateGameId(gameIdArg);
    
    // Get program instance
    const program = getProgram();
    
    console.log(`🎮 Joining game ${gameId}`);
    console.log(`💰 Will match the existing game's wager amount`);
    
    await program.methods
      .joinGame(new anchor.BN(gameId))
      .rpc();
    
    console.log("✅ Successfully joined game!");
    console.log(`🎯 Game ID: ${gameId}`);
    
    // Output instructions for next step
    const player = getPlayerFromWallet();
    console.log("");
    console.log("📝 Now commit your move using the commit-move script:");
    console.log(`yarn commit-move ${gameId} <rock|paper|scissors>`);
    
  } catch (error) {
    console.error("❌ Error joining game:", error);
    process.exit(1);
  }
}

// Run the script
main().catch(console.error); 