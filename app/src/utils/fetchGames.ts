import { Connection, PublicKey } from '@solana/web3.js';
import { Program, AnchorProvider } from '@coral-xyz/anchor';
import { WalletContextState } from '@solana/wallet-adapter-react';
import idl from '../idl/crypto_pvp.json';
import { Game, WagerAmount } from '../App';

const PROGRAM_ID = new PublicKey(idl.address);

export const fetchPlayerName = async (
  connection: Connection,
  wallet: WalletContextState,
  playerAddress: string
): Promise<string> => {
  try {
    if (!wallet || !connection) {
      return playerAddress.slice(0, 8) + '...';
    }

    const provider = new AnchorProvider(connection, wallet as any, AnchorProvider.defaultOptions());
    const program = new Program(idl as any, provider);

    // Derive player profile PDA
    const [playerProfilePda] = await PublicKey.findProgramAddress([
      Buffer.from('player_profile'),
      new PublicKey(playerAddress).toBytes()
    ], PROGRAM_ID);

    // Fetch player profile
    const playerProfile = await (program.account as any).playerProfile.fetch(playerProfilePda);
    
    // Return the name if it exists and isn't the default, otherwise return truncated address
    if (playerProfile.name && playerProfile.name.trim() && !playerProfile.name.startsWith('Player_')) {
      return playerProfile.name;
    } else {
      return playerAddress.slice(0, 8) + '...';
    }

  } catch (error) {
    // Silently fall back to truncated address if player name fetch fails
    return playerAddress.slice(0, 8) + '...';
  }
};

export const fetchAvailableGames = async (
  connection: Connection,
  wallet?: WalletContextState,
  playerAddress?: string
): Promise<Game[]> => {
  try {
    if (!connection) {
      return [];
    }
    
    // Create a read-only provider if no wallet is available
    let provider: AnchorProvider;
    let program: Program;
    
    if (wallet) {
      provider = new AnchorProvider(connection, wallet as any, AnchorProvider.defaultOptions());
      program = new Program(idl as any, provider);
    } else {
      // Create a read-only provider for fetching data without wallet
      const readOnlyWallet = {
        publicKey: null,
        signTransaction: () => Promise.reject(),
        signAllTransactions: () => Promise.reject(),
      };
      provider = new AnchorProvider(connection, readOnlyWallet as any, AnchorProvider.defaultOptions());
      program = new Program(idl as any, provider);
    }

    // Fetch all game accounts
    const gameAccounts = await (program.account as any).game.all();
    const availableGames: Game[] = [];

    for (const gameAccount of gameAccounts) {
      const gameData = gameAccount.account as any;
      
      // Check if game is waiting for a player
      const isWaitingForPlayer = 
        gameData.state?.waitingForPlayer !== undefined ||
        gameData.state === 'waitingForPlayer' ||
        (gameData.state && Object.keys(gameData.state)[0] === 'waitingForPlayer');
      
      if (isWaitingForPlayer) {
        // Don't show games created by the current player
        const gamePlayer1 = gameData.player1.toString();
        
        if (playerAddress && gamePlayer1 === playerAddress) {
          continue;
        }

        // Convert wager enum to our type
        let wager: WagerAmount = 'sol01';
        
        if (gameData.wager?.sol1) wager = 'sol1';
        else if (gameData.wager?.sol01) wager = 'sol01';
        else if (gameData.wager?.sol001) wager = 'sol001';

        // Fetch player1 name (fallback to truncated address if no wallet)
        const player1Name = wallet 
          ? await fetchPlayerName(connection, wallet, gameData.player1.toString())
          : `${gameData.player1.toString().slice(0, 8)}...`;

        // Clean up player2 - convert system address to undefined
        const rawPlayer2 = gameData.player2?.toString();
        const cleanPlayer2 = (rawPlayer2 === '11111111111111111111111111111111' || !rawPlayer2) ? undefined : rawPlayer2;

        const game: Game = {
          id: gameData.gameId.toString(),
          player1: gameData.player1.toString(),
          player1Name,
          player2: cleanPlayer2,
          wager,
          status: 'WaitingForPlayer',
          createdAt: new Date(), // You could add timestamp to your program
        };

        availableGames.push(game);
      }
    }

    // Sort by game ID (oldest first)
    return availableGames.sort((a, b) => parseInt(a.id) - parseInt(b.id));

  } catch (error) {
    console.error('Error fetching available games:', error);
    return [];
  }
};

export const fetchMyActiveGames = async (
  connection: Connection,
  wallet: WalletContextState,
  playerAddress?: string
): Promise<Game[]> => {
  try {
    if (!wallet || !connection || !playerAddress) {
      return [];
    }

    const provider = new AnchorProvider(connection, wallet as any, AnchorProvider.defaultOptions());
    const program = new Program(idl as any, provider);

    // Fetch all game accounts
    const gameAccounts = await (program.account as any).game.all();
    const myGames: Game[] = [];

    for (const gameAccount of gameAccounts) {
      const gameData = gameAccount.account as any;
      
      const gamePlayer1 = gameData.player1.toString();
      const gamePlayer2 = gameData.player2?.toString();
      
      // Check if current player is involved in this game
      const isMyGame = gamePlayer1 === playerAddress || gamePlayer2 === playerAddress;
      
      if (isMyGame) {
        // Read the actual blockchain state directly
        let status: 'WaitingForPlayer' | 'CommitPhase' | 'RevealPhase' | 'Finished' = 'WaitingForPlayer';
        
        // Handle different possible state formats
        if (gameData.state) {
          const stateKeys = Object.keys(gameData.state);
          const stateKey = stateKeys[0]; // Anchor enums are objects with one key
          
          switch (stateKey) {
            case 'waitingForPlayer':
              status = 'WaitingForPlayer';
              break;
            case 'commitPhase':
              status = 'CommitPhase';
              break;
            case 'revealPhase':
              status = 'RevealPhase';
              break;
            case 'finished':
              status = 'Finished';
              break;
            default:
              // Try to infer state from move hashes
              if (gameData.player2 && gameData.player2.toString() !== '11111111111111111111111111111111') {
                if (gameData.player1MoveHash && gameData.player2MoveHash) {
                  status = 'RevealPhase';
                } else {
                  status = 'CommitPhase';
                }
              } else {
                status = 'WaitingForPlayer';
              }
              break;
          }
        } else {
          status = 'WaitingForPlayer';
        }

        // Skip finished games
        if (status === 'Finished') continue;

        // Convert wager enum to our type
        let wager: WagerAmount = 'sol01';
        if (gameData.wager?.sol1) wager = 'sol1';
        else if (gameData.wager?.sol01) wager = 'sol01';
        else if (gameData.wager?.sol001) wager = 'sol001';

        // Fetch player names
        const player1Name = await fetchPlayerName(connection, wallet, gameData.player1.toString());
        const player2Name = gameData.player2 ? await fetchPlayerName(connection, wallet, gameData.player2.toString()) : undefined;

        // Check what player2 value we're getting from blockchain
        const rawPlayer2 = gameData.player2?.toString();
        const isDefaultPlayer2 = rawPlayer2 === '11111111111111111111111111111111' || !rawPlayer2;

        const game: Game = {
          id: gameData.gameId.toString(),
          player1: gameData.player1.toString(),
          player1Name,
          player2: isDefaultPlayer2 ? undefined : rawPlayer2, // Set to undefined if it's the default/empty address
          player2Name,
          wager,
          status,
          // Add blockchain move data for proper status tracking  
          player1Move: (gameData.player1Move || gameData.player1_move) ? 
            (gameData.player1Move || gameData.player1_move).toString().toLowerCase() : undefined,
          player2Move: (gameData.player2Move || gameData.player2_move) ?
            (gameData.player2Move || gameData.player2_move).toString().toLowerCase() : undefined,
          createdAt: new Date(),
        };

        myGames.push(game);
      }
    }

    return myGames.sort((a, b) => parseInt(b.id) - parseInt(a.id));

  } catch (error) {
    console.error('Error fetching my games:', error);
    return [];
  }
}; 