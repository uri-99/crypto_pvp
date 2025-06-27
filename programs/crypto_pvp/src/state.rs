use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct GlobalState {
    pub game_counter: u64,          // Next game ID to use
    pub total_games_completed: u64, // Total completed 
    pub authority: Pubkey,          // For application admin functions
    pub bump: u8,                   // PDA bump for global state
}

#[account]
#[derive(InitSpace)]
pub struct PlayerProfile {
    pub player: Pubkey,             // Owner of this profile
    #[max_len(32)]
    pub name: String,
    pub available_funds: u64,       // TODO implement funds
    pub total_games_played: u64,    // Games played
    pub total_games_completed: u64, 
    pub total_games_forfeited: u64,
    pub wins: u32,
    pub losses: u32,
    pub ties: u32,
    pub total_wagered: u64,         // Lifetime betting volume
    pub total_won: u64,             // Lifetime winnings
    pub current_streak: i32,        //TODO // Win streak (+ win, - loss)
    pub best_streak: u32,           //TODO // Best win streak ever
    pub created_at: i64,            // Account creation timestamp
    pub bump: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace, Debug)]
pub enum WagerAmount {
    Sol1,    // 1.0 SOL
    Sol01,   // 0.1 SOL  
    Sol001,  // 0.01 SOL
}

impl WagerAmount {
    /// Convert enum to lamports (1 SOL = 1_000_000_000 lamports)
    pub fn to_lamports(&self) -> u64 {
        match self {
            WagerAmount::Sol1 => 1_000_000_000,    // 1 SOL
            WagerAmount::Sol01 => 100_000_000,     // 0.1 SOL
            WagerAmount::Sol001 => 10_000_000,     // 0.01 SOL
        }
    }
}

#[account]
#[derive(InitSpace)]
pub struct Game {
    pub game_id: u64,               // Unique game identifier
    pub player1: Pubkey,
    pub player2: Pubkey,
    pub wager: WagerAmount,
    pub state: GameState,
    pub player1_move_hash: Option<[u8; 32]>,
    pub player2_move_hash: Option<[u8; 32]>,
    pub player1_move: Option<Move>,
    pub player2_move: Option<Move>,
    pub winner_type: Option<Winner>,    // WHO won (Player1/Player2/Tie)
    pub winner_address: Option<Pubkey>, // WHICH address won
    pub reveal_deadline: Option<i64>,   // Timestamp when non-revealer forfeits
    pub bump: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, InitSpace)]
pub enum GameState {
    WaitingForPlayer,
    RevealPhase,
    Finished,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace)]
pub enum Move {
    Rock,
    Paper,
    Scissors,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace, Debug)]
pub enum Winner {
    Player1,
    Player2,
    Tie,
    Player1OpponentForfeit,  // Player1 wins because Player2 forfeited; didn't reveal in time
    Player2OpponentForfeit,  // Player2 wins because Player1 forfeited; didn't reveal in time
}
