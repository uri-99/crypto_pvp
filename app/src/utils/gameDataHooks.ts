import { useState, useEffect, useCallback } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { Game } from '../App';
import { fetchAvailableGames, fetchMyActiveGames } from './fetchGames';

/**
 * Hook to fetch and auto-refresh games available for joining
 * Used in JoinGame component to show games waiting for players
 */
export function useGetAvailableGames() {
  const [availableGames, setAvailableGames] = useState<Game[]>([]);
  const [availableGamesLoading, setAvailableGamesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { connection } = useConnection();
  const wallet = useWallet();

  const loadAvailableGames = useCallback(async () => {
    setAvailableGamesLoading(true);
    setError(null);
    
    try {
      const fetchedAvailableGames = await fetchAvailableGames(
        connection, 
        wallet.connected ? wallet : undefined, 
        wallet.publicKey?.toString()
      );
      setAvailableGames(fetchedAvailableGames);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load games');
      console.error('Error loading available games:', err);
    } finally {
      setAvailableGamesLoading(false);
    }
  }, [connection, wallet]);

  // Load games initially and when wallet state changes
  useEffect(() => {
    loadAvailableGames();
  }, [loadAvailableGames]);

  // Refresh games periodically (every 10 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      loadAvailableGames();
    }, 10000);

    return () => clearInterval(interval);
  }, [loadAvailableGames]);

  return {
    availableGames,
    availableGamesLoading,
    error,
    refreshAvailableGames: loadAvailableGames,
  };
}

/**
 * Hook to fetch and auto-refresh current user's active games
 * Used in Home component to show user's ongoing games
 */
export function useGetMyActiveGames() {
  const [myActiveGames, setMyActiveGames] = useState<Game[]>([]);
  const [myActiveGamesLoading, setMyActiveGamesLoading] = useState(false);
  const { connection } = useConnection();
  const wallet = useWallet();
  
  const loadMyActiveGames = useCallback(async () => {
    if (!wallet.publicKey) {
      setMyActiveGames([]);
      return;
    }
    
    setMyActiveGamesLoading(true);
    try {
      const fetchedMyActiveGames = await fetchMyActiveGames(
        connection,
        wallet,
        wallet.publicKey.toString()
      );
      setMyActiveGames(fetchedMyActiveGames);
    } catch (error) {
      console.error('Error loading my active games:', error);
    } finally {
      setMyActiveGamesLoading(false);
    }
  }, [connection, wallet]);
  
  useEffect(() => {
    loadMyActiveGames();
    const interval = setInterval(loadMyActiveGames, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, [loadMyActiveGames]);
  
  return { 
    myActiveGames, 
    myActiveGamesLoading, 
    refreshMyActiveGames: loadMyActiveGames 
  };
} 