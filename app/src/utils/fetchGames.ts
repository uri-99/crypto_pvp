import { Connection, PublicKey } from '@solana/web3.js';
import { Program, AnchorProvider, web3 } from '@coral-xyz/anchor';
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
    console.log('Could not fetch player name for', playerAddress, ':', error);
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
      console.log('fetchAvailableGames: No connection');
      return [];
    }

    console.log('fetchAvailableGames: Starting fetch...');
    
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
    console.log('fetchAvailableGames: Fetching game accounts...');
    const gameAccounts = await (program.account as any).game.all();
    console.log('fetchAvailableGames: Found game accounts:', gameAccounts.length);
    
    const availableGames: Game[] = [];

    for (const gameAccount of gameAccounts) {
      const gameData = gameAccount.account as any;
      console.log('Game data:', gameData);
      console.log('Game state:', gameData.state);
      
      // Check if game is waiting for a player
      // The state might be nested differently - let's be more flexible
      const isWaitingForPlayer = 
        gameData.state?.waitingForPlayer !== undefined ||
        gameData.state === 'waitingForPlayer' ||
        (gameData.state && Object.keys(gameData.state)[0] === 'waitingForPlayer');
      
      console.log('Is waiting for player:', isWaitingForPlayer);
      
      if (isWaitingForPlayer) {
        // Don't show games created by the current player
        const gamePlayer1 = gameData.player1.toString();
        console.log('Game player1:', gamePlayer1, 'Current player:', playerAddress);
        
        if (playerAddress && gamePlayer1 === playerAddress) {
          console.log('Skipping own game');
          continue;
        }

        // Convert wager enum to our type
        let wager: WagerAmount = 'sol01';
        console.log('Game wager:', gameData.wager);
        
        if (gameData.wager?.sol1) wager = 'sol1';
        else if (gameData.wager?.sol01) wager = 'sol01';
        else if (gameData.wager?.sol001) wager = 'sol001';

        // Fetch player1 name (fallback to truncated address if no wallet)
        const player1Name = wallet 
          ? await fetchPlayerName(connection, wallet, gameData.player1.toString())
          : `${gameData.player1.toString().slice(0, 8)}...`;

        const game: Game = {
          id: gameData.gameId.toString(),
          player1: gameData.player1.toString(),
          player1Name,
          player2: gameData.player2?.toString(),
          wager,
          status: 'waiting',
          createdAt: new Date(), // You could add timestamp to your program
        };

        console.log('Adding game to available games:', game);
        availableGames.push(game);
      }
    }

    console.log('fetchAvailableGames: Returning games:', availableGames.length);
    // Sort by game ID (newest first)
    return availableGames.sort((a, b) => parseInt(b.id) - parseInt(a.id));

  } catch (error) {
    console.error('Error fetching games:', error);
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
      console.log('fetchMyActiveGames: No wallet, connection, or player address');
      return [];
    }

    console.log('fetchMyActiveGames: Starting fetch...');
    const provider = new AnchorProvider(connection, wallet as any, AnchorProvider.defaultOptions());
    const program = new Program(idl as any, provider);

    // Fetch all game accounts
    const gameAccounts = await (program.account as any).game.all();
    console.log('fetchMyActiveGames: Found game accounts:', gameAccounts.length);
    
    const myGames: Game[] = [];

    for (const gameAccount of gameAccounts) {
      const gameData = gameAccount.account as any;
      
      const gamePlayer1 = gameData.player1.toString();
      const gamePlayer2 = gameData.player2?.toString();
      
      // Check if current player is involved in this game
      const isMyGame = gamePlayer1 === playerAddress || gamePlayer2 === playerAddress;
      
      if (isMyGame) {
        // Determine game status based on state
        let status: 'waiting' | 'active' | 'revealing' | 'finished' = 'waiting';
        
        if (gameData.state?.waitingForPlayer !== undefined) {
          status = 'waiting';
        } else if (gameData.state?.revealPhase !== undefined) {
          status = 'revealing';
        } else if (gameData.state?.finished !== undefined) {
          status = 'finished';
        } else {
          status = 'active';
        }

        // Skip finished games
        if (status === 'finished') continue;

        // Convert wager enum to our type
        let wager: WagerAmount = 'sol01';
        if (gameData.wager?.sol1) wager = 'sol1';
        else if (gameData.wager?.sol01) wager = 'sol01';
        else if (gameData.wager?.sol001) wager = 'sol001';

        // Fetch player names
        const player1Name = await fetchPlayerName(connection, wallet, gameData.player1.toString());
        const player2Name = gameData.player2 ? await fetchPlayerName(connection, wallet, gameData.player2.toString()) : undefined;

        const game: Game = {
          id: gameData.gameId.toString(),
          player1: gameData.player1.toString(),
          player1Name,
          player2: gameData.player2?.toString(),
          player2Name,
          wager,
          status,
          createdAt: new Date(),
        };

        myGames.push(game);
      }
    }

    console.log('fetchMyActiveGames: Returning games:', myGames.length);
    return myGames.sort((a, b) => parseInt(b.id) - parseInt(a.id));

  } catch (error) {
    console.error('Error fetching my games:', error);
    return [];
  }
}; 