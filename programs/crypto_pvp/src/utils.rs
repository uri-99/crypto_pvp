use anchor_lang::prelude::*;
use anchor_lang::system_program::{transfer, Transfer};

use crate::errors::*;
use crate::state::*;

// Utility functions

/// Helper function to process wager with fee collection
pub fn process_wager<'info>(
    player: &AccountInfo<'info>,
    fee_collector: &AccountInfo<'info>,
    system_program: &AccountInfo<'info>,
    game: &Account<'info, Game>,
    player_profile: &mut Account<'info, PlayerProfile>,
) -> Result<()> {
    let fee_per_player = game.fee_per_player;
    let net_per_player = game.net_per_player();
    
    require!(fee_per_player > 0 && net_per_player > 0, GameError::InsufficientFunds);
    
    // Update player's wagering stats
    let wager_lamports = game.wager.to_lamports();
    player_profile.total_wagered += wager_lamports;
    player_profile.total_games_played += 1;

    // Transfer fee to fee collector
    transfer(
        CpiContext::new(
            system_program.clone(),
            Transfer {
                from: player.clone(),
                to: fee_collector.clone(),
            },
        ),
        fee_per_player,
    )?;
    msg!("Fee collected: {} lamports to fee collector", fee_per_player);
    
    // Transfer remaining wager to game account
    transfer(
        CpiContext::new(
            system_program.clone(),
            Transfer {
                from: player.clone(),
                to: game.to_account_info(),
            },
        ),
        net_per_player,
    )?;
    
    Ok(())
}

/// Helper function to update player stats when a game finishes
pub fn update_endgame_stats(
    global_state: &mut Account<GlobalState>,
    player1_profile: &mut Account<PlayerProfile>,
    player2_profile: &mut Account<PlayerProfile>,
    winner_type: Winner,
    game: &Game,
) -> Result<()> {
    global_state.total_games_completed += 1;

    let profit = game.net_per_player(); // Winner's profit = opponent's net contribution
    
    // Update wins/losses/ties and game completion stats based on outcome
    match winner_type {
        Winner::Player1 => {
            player1_profile.total_games_completed += 1;
            player2_profile.total_games_completed += 1;
            player1_profile.wins += 1;
            player2_profile.losses += 1;
            player1_profile.total_won += profit; // profit from opponent
            player2_profile.total_lost += game.wager.to_lamports();
            // Streak logic
            player1_profile.current_streak += 1;
            if player1_profile.current_streak > player1_profile.best_streak as i32 {
                player1_profile.best_streak = player1_profile.current_streak as u32;
            }
            if player2_profile.current_streak > 0 {
                player2_profile.current_streak = 0;
            } else {
                player2_profile.current_streak -= 1;
            }
        }
        Winner::Player2 => {
            player1_profile.total_games_completed += 1;
            player2_profile.total_games_completed += 1;
            player1_profile.losses += 1;
            player2_profile.wins += 1;
            player2_profile.total_won += profit; // profit from opponent
            player1_profile.total_lost += game.wager.to_lamports();
            // Streak logic
            player2_profile.current_streak += 1;
            if player2_profile.current_streak > player2_profile.best_streak as i32 {
                player2_profile.best_streak = player2_profile.current_streak as u32;
            }
            if player1_profile.current_streak > 0 {
                player1_profile.current_streak = 0;
            } else {
                player1_profile.current_streak -= 1;
            }
        }
        Winner::Tie => {
            player1_profile.total_games_completed += 1;
            player2_profile.total_games_completed += 1;
            player1_profile.ties += 1;
            player2_profile.ties += 1;
            // Streak logic: tie does not change current_streak
        }
        Winner::Player1OpponentForfeit => {
            // Player1 completed, Player2 forfeited
            player1_profile.total_games_completed += 1;
            player2_profile.total_games_forfeited += 1;
            player1_profile.wins += 1;
            player2_profile.losses += 1;
            player1_profile.total_won += profit; // profit from opponent
            player2_profile.total_lost += game.wager.to_lamports();
            // Streak logic
            player1_profile.current_streak += 1;
            if player1_profile.current_streak > player1_profile.best_streak as i32 {
                player1_profile.best_streak = player1_profile.current_streak as u32;
            }
            if player2_profile.current_streak > 0 {
                player2_profile.current_streak = 0;
            } else {
                player2_profile.current_streak -= 1;
            }
        }
        Winner::Player2OpponentForfeit => {
            // Player2 completed, Player1 forfeited
            player1_profile.total_games_forfeited += 1;
            player2_profile.total_games_completed += 1;
            player1_profile.losses += 1;
            player2_profile.wins += 1;
            player2_profile.total_won += profit; // profit from opponent
            player1_profile.total_lost += game.wager.to_lamports();
            // Streak logic
            player2_profile.current_streak += 1;
            if player2_profile.current_streak > player2_profile.best_streak as i32 {
                player2_profile.best_streak = player2_profile.current_streak as u32;
            }
            if player1_profile.current_streak > 0 {
                player1_profile.current_streak = 0;
            } else {
                player1_profile.current_streak -= 1;
            }
        }
    }
    
    Ok(())
}

/// Helper function to handle game payouts - transfers SOL from game account to winners
pub fn payout_winner(
    game: &mut Account<Game>,
    player1_info: &AccountInfo,
    player2_info: &AccountInfo,
    winner_type: Winner,
) -> Result<()> {
    let total_pot = game.total_pot();
    let net_per_player = game.net_per_player();
    
    // Safety check: ensure game account has the expected funds
    let game_balance = game.to_account_info().lamports();
    require!(game_balance >= total_pot, GameError::InsufficientFunds);
    
    match winner_type {
        Winner::Player1 | Winner::Player1OpponentForfeit => {
            // Transfer entire pot to player1
            **game.to_account_info().try_borrow_mut_lamports()? -= total_pot;
            **player1_info.try_borrow_mut_lamports()? += total_pot;
            
            msg!("Payout: {} lamports to winner Player1: {}", total_pot, game.player1);
        }
        Winner::Player2 | Winner::Player2OpponentForfeit => {
            // Transfer entire pot to player2  
            **game.to_account_info().try_borrow_mut_lamports()? -= total_pot;
            **player2_info.try_borrow_mut_lamports()? += total_pot;
            
            msg!("Payout: {} lamports to winner Player2: {}", total_pot, game.player2);
        }
        Winner::Tie => {
            // Transfer original net contribution to each player
            **game.to_account_info().try_borrow_mut_lamports()? -= total_pot;
            **player1_info.try_borrow_mut_lamports()? += net_per_player;
            **player2_info.try_borrow_mut_lamports()? += net_per_player;
            
            msg!("Tie payout: {} lamports to each player", net_per_player);
        }
    }
    
    Ok(())
}