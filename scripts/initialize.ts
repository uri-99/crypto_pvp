import * as anchor from "@coral-xyz/anchor";
import { getProgram } from "./utils";

async function main() {
  try {
    console.log("🔧 Initializing global state...");
    
    // Use current wallet as fee collector
    const provider = anchor.AnchorProvider.env();
    const feeCollector = provider.wallet.publicKey;
    console.log(`💰 Fee collector set to: ${feeCollector.toString()}`);
    
    // Get program instance
    const program = getProgram();
    
    // Initialize global state with fee collector
    await program.methods
      .initializeGlobalState(feeCollector)
      .rpc();
    
    console.log("✅ Global state initialized successfully!");
    console.log("🎯 The program is now ready for games!");
    console.log("");
    console.log("💡 1% of all wagers will be sent to the fee collector address");
    
  } catch (error) {
    console.error("❌ Error initializing global state:", error);
    process.exit(1);
  }
}

// Run the script
main().catch(console.error); 