import * as anchor from "@coral-xyz/anchor";
import {
  validateWager,
  formatWagerForProgram,
  getProgram,
  getGlobalState,
  getPlayerFromWallet
} from "./utils";

async function main() {
  // Get wager from command line arguments
  const wagerArg = process.argv[2];
  
  if (!wagerArg) {
    console.log("Usage: yarn create-game <wager>");
    console.log("Wager options: sol1 (1.0 SOL), sol01 (0.1 SOL), sol001 (0.01 SOL)");
    console.log("Example: yarn create-game sol01");
    process.exit(1);
  }
  
  try {
    // Validate wager
    const wagerInfo = validateWager(wagerArg);
    
    // Get program instance
    const program = getProgram();
    
    console.log(`🎮 Creating game`);
    console.log(`💰 Wager: ${wagerInfo.display}`);
    
    // Get current game counter before creating
    const globalState = await getGlobalState(program);
    const gameId = globalState.gameCounter;
    
    console.log(`📊 Current game counter: ${gameId}`);
    
    // Create game with selected wager amount
    const wagerEnum = formatWagerForProgram(wagerInfo.variant);
    
    await program.methods
      .createGame(wagerEnum as any)
      .rpc();
    
    console.log("✅ Game created successfully!");
    console.log(`🎯 Game ID: ${gameId}`);
    console.log(`Wager: ${wagerInfo.display}`);
    
    // Output instructions for next step
    const player = getPlayerFromWallet();
    console.log("");
    console.log("📝 To join this game, use:");
    console.log(`make alice_join ${gameId}`);
    console.log("or");
    console.log(`make bob_join ${gameId}`);
    console.log("");
    console.log("📝 After both players have joined, use the commit-move script to commit your move:");
    console.log(`yarn commit-move ${gameId} <rock|paper|scissors>`);
    
  } catch (error) {
    console.error("❌ Error creating game:", error);
    process.exit(1);
  }
}

// Run the script
main().catch(console.error); 