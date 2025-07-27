use anchor_lang::prelude::*;

pub mod errors;
pub mod state;
pub mod admin_logic;
pub mod game_logic;
pub mod player_logic;
pub mod utils;

use admin_logic::*;
use game_logic::*;
use player_logic::*;
use crate::state::{WagerAmount, Move};

declare_id!("3S9Go4XvdE9bH8UjGmyDqEpaEHLSt7BMLGZEw5jB7DLP");

#[program]
pub mod crypto_pvp {
    use super::*;

    //TODO function allowing closing of players for users to reclaim rent?
    // TODO function to withdraw from an empty created game after timeout
    
    pub fn create_game(ctx: Context<CreateGame>, wager: WagerAmount, rounds_to_win: u8) -> Result<()> {
        game_logic::create_game(ctx, wager, rounds_to_win)
    }
    pub fn join_game(ctx: Context<JoinGame>, game_id: u64) -> Result<()> {
        game_logic::join_game(ctx, game_id)
    }
    pub fn commit_move(ctx: Context<CommitMove>, game_id: u64, move_hash: [u8; 32]) -> Result<()> {
        game_logic::commit_move(ctx, game_id, move_hash)
    }
    pub fn reveal_move(ctx: Context<RevealMove>, game_id: u64, move_choice: Move, salt: [u8; 32]) -> Result<()> {
        game_logic::reveal_move(ctx, game_id, move_choice, salt)
    }
    pub fn claim_timeout_victory(ctx: Context<ClaimTimeoutVictory>) -> Result<()> {
        game_logic::claim_timeout_victory(ctx)
    }
    pub fn update_player_name(ctx: Context<UpdatePlayerName>, new_name: String) -> Result<()> {
        player_logic::update_player_name(ctx, new_name)
    }
    pub fn initialize_global_state(ctx: Context<InitializeGlobalState>, fee_collector: Pubkey) -> Result<()> {
        admin_logic::initialize_global_state(ctx, fee_collector)
    }
    pub fn update_fee_collector(ctx: Context<UpdateFeeCollector>, new_fee_collector: Pubkey) -> Result<()> {
        admin_logic::update_fee_collector(ctx, new_fee_collector)
    }
    pub fn update_fee_percentage(ctx: Context<UpdateFeeCollector>, new_fee_percentage: u64) -> Result<()> {
        admin_logic::update_fee_percentage(ctx, new_fee_percentage)
    }
    pub fn update_reveal_timeout(ctx: Context<UpdateFeeCollector>, new_timeout: i64) -> Result<()> {
        admin_logic::update_reveal_timeout(ctx, new_timeout)
    }
}
