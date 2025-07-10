import { useState, useEffect, useCallback } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { Game } from '../App';
import { fetchAvailableGames, fetchMyActiveGames } from './fetchGames';

export function useGames() {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { connection } = useConnection();
  const wallet = useWallet();

  const loadGames = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const availableGames = await fetchAvailableGames(
        connection, 
        wallet.connected ? wallet : undefined, 
        wallet.publicKey?.toString()
      );
      setGames(availableGames);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load games');
      console.error('Error loading games:', err);
    } finally {
      setLoading(false);
    }
  }, [connection, wallet]);

  // Load games initially and when wallet state changes
  useEffect(() => {
    loadGames();
  }, [loadGames]);

  // Refresh games periodically (every 10 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      loadGames();
    }, 10000);

    return () => clearInterval(interval);
  }, [loadGames]);

  return {
    games,
    loading,
    error,
    refreshGames: loadGames,
  };
}

export function useMyGames() {
  const [myGames, setMyGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(false);
  const { connection } = useConnection();
  const wallet = useWallet();
  
  const refreshMyGames = useCallback(async () => {
    if (!wallet.publicKey) {
      setMyGames([]);
      return;
    }
    
    setLoading(true);
    try {
      const activeGames = await fetchMyActiveGames(
        connection,
        wallet,
        wallet.publicKey.toString()
      );
      setMyGames(activeGames);
    } catch (error) {
      console.error('Error refreshing my games:', error);
    } finally {
      setLoading(false);
    }
  }, [connection, wallet]);
  
  useEffect(() => {
    refreshMyGames();
    const interval = setInterval(refreshMyGames, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, [refreshMyGames]);
  
  return { myGames, loading, refreshMyGames };
} 