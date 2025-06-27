import * as anchor from "@coral-xyz/anchor";
import {
  validateGameId,
  getProgram,
  formatMoveForReveal,
  hexToBytes,
  readMove,
  getPlayerFromWallet
} from "./utils";

async function main() {
  // Get game ID from command line argument
  const gameIdArg = process.argv[2];
  
  if (!gameIdArg) {
    console.log("Usage: yarn reveal-move <game_id>");
    console.log("Example: yarn reveal-move 8");
    process.exit(1);
  }
  
  try {
    // Validate game ID
    const gameId = validateGameId(gameIdArg);
    
    // Determine player from wallet
    const player = getPlayerFromWallet();
    
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
    
    // Get program instance
    const program = getProgram();
    
    console.log(`🔓 ${player.charAt(0).toUpperCase() + player.slice(1)} revealing move in game ${gameId}`);
    console.log(`Move: ${moveData.move}`);
    console.log(`Salt: ${moveData.salt.slice(0, 8)}...`);
    
    // Get game data to find player addresses
    const [gamePda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("game"), new anchor.BN(gameId).toArrayLike(Buffer, "le", 8)],
      program.programId
    );
    
    const gameAccount = await program.account.game.fetch(gamePda);
    
    // Convert salt from hex to bytes
    const saltBytes = hexToBytes(moveData.salt);
    
    // Format move for reveal
    const moveChoice = formatMoveForReveal(moveData.move);
    
    await program.methods
      .revealMove(new anchor.BN(gameId), moveChoice as any, Array.from(saltBytes))
      .accounts({
        player1: gameAccount.player1,
        player2: gameAccount.player2,
      })
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
    process.exit(1);
  }
}

// Run the script
main().catch(console.error); 