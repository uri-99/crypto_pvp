import * as anchor from "@coral-xyz/anchor";
import {
  MOVE_NAMES,
  validateMove,
  validateWager,
  formatWagerForProgram,
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
  // Get wager and move from command line arguments
  const wagerArg = process.argv[2];
  const moveArg = process.argv[3];
  
  if (!wagerArg || !moveArg) {
    console.log("Usage: yarn create-game <wager> <rock|paper|scissors>");
    console.log("Wager options: sol1 (1.0 SOL), sol01 (0.1 SOL), sol001 (0.01 SOL)");
    console.log("Example: yarn create-game sol01 rock");
    process.exit(1);
  }
  
  try {
    // Validate wager and move
    const wagerInfo = validateWager(wagerArg);
    const move = validateMove(moveArg);
    
    // Get program instance
    const program = getProgram();
    
    console.log(`🎮 Creating game with move: ${MOVE_NAMES[move]}`);
    console.log(`💰 Wager: ${wagerInfo.display}`);
    
    // Get current game counter before creating
    const globalState = await getGlobalState(program);
    const gameId = globalState.gameCounter;
    
    console.log(`📊 Current game counter: ${gameId}`);
    
    // Generate random salt and create hash
    const salt = generateSalt();
    const moveHash = createMoveHash(move, salt);
    
    console.log(`Salt: ${formatSalt(salt)}...`);
    console.log(`Hash: ${formatHash(moveHash)}...`);
    
    // Create game with selected wager amount
    const wagerEnum = formatWagerForProgram(wagerInfo.variant);
    
    await program.methods
      .createGame(wagerEnum as any, Array.from(moveHash))
      .rpc();
    
    console.log("✅ Game created successfully!");
    console.log(`🎯 Game ID: ${gameId}`);
    console.log(`Move committed: ${MOVE_NAMES[move]}`);
    console.log(`Wager: ${wagerInfo.display}`);
    
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