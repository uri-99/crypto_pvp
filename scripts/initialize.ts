import * as anchor from "@coral-xyz/anchor";
import { getProgram } from "./utils";

async function main() {
  try {
    console.log("🔧 Initializing global state...");
    
    // Get program instance
    const program = getProgram();
    
    // Initialize global state
    await program.methods
      .initializeGlobalState()
      .rpc();
    
    console.log("✅ Global state initialized successfully!");
    console.log("🎯 The program is now ready for games!");
    
  } catch (error) {
    console.error("❌ Error initializing global state:", error);
    process.exit(1);
  }
}

// Run the script
main().catch(console.error); 