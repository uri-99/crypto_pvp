use anchor_lang::prelude::*;
use anchor_lang::solana_program::hash::hash;
use anchor_lang::system_program::{transfer, Transfer};

pub mod errors;
pub mod state;

use errors::*;
use state::*;

declare_id!("3S9Go4XvdE9bH8UjGmyDqEpaEHLSt7BMLGZEw5jB7DLP");

// Constants
const REVEAL_TIMEOUT_SECONDS: i64 = 300; // 5 minutes - secure against 1-2s validator skewing

#[program]
pub mod crypto_pvp {
    use super::*;

    /// Initializes the global state - can only be called once due to #[account(init)]
    pub fn initialize_global_state(ctx: Context<InitializeGlobalState>, fee_collector: Pubkey) -> Result<()> {
        let global_state = &mut ctx.accounts.global_state;
        
        // Initialize all fields to starting values
        global_state.game_counter = 0;
        global_state.total_games_completed = 0;
        global_state.authority = ctx.accounts.authority.key();
        global_state.fee_collector = fee_collector;
        global_state.fee_percentage = 1; // Default to 1%
        global_state.bump = ctx.bumps.global_state;
        
        msg!("Global state initialized by authority: {}", ctx.accounts.authority.key());
        msg!("Fee collector set to: {}", fee_collector);
        msg!("Fee percentage set to: {}%", global_state.fee_percentage);
        Ok(())
    }

    //TODO function allowing closing of players for users to reclaim rent?

    // Creates a new game
    pub fn create_game(ctx: Context<CreateGame>, wager: WagerAmount) -> Result<()> {
        let global_state = &mut ctx.accounts.global_state;
        let game = &mut ctx.accounts.game;

        // Initialize player profile if needed (with default name)
        initialize_player_profile_if_needed(
            &mut ctx.accounts.player1_profile,
            &ctx.accounts.player.key(),
            ctx.bumps.player1_profile,
        )?;
        
        // Set game data
        game.game_id = global_state.game_counter;
        game.player1 = ctx.accounts.player.key();
        game.player2 = Pubkey::default();
        game.wager = wager;
        game.fee_per_player = wager.fee_per_player(global_state.fee_percentage); // Lock in current fee
        game.state = GameState::WaitingForPlayer; // Player1 has created, waiting for player2 to join
        game.winner_type = None;
        game.winner_address = None;
        game.bump = ctx.bumps.game;
        
        // Process wager with fee collection
        process_wager(
            &ctx.accounts.player.to_account_info(),
            &ctx.accounts.fee_collector.to_account_info(),
            &ctx.accounts.system_program.to_account_info(),
            game,
        )?;

        // Update player1's wagering stats
        let wager_lamports = wager.to_lamports();
        ctx.accounts.player1_profile.total_wagered += wager_lamports;
        // Update global stats
        global_state.game_counter += 1;
        
        msg!("Game #{} created by player1: {}, wager: {} lamports (fee: {})", 
             game.game_id, ctx.accounts.player.key(), wager_lamports, game.fee_per_player);
        Ok(())
    }

    pub fn join_game(ctx: Context<JoinGame>, _game_id: u64) -> Result<()> {
        let game = &mut ctx.accounts.game;

        // Initialize player profile if needed (with default name)
        initialize_player_profile_if_needed(
            &mut ctx.accounts.player2_profile,
            &ctx.accounts.player.key(),
            ctx.bumps.player2_profile,
        )?;
        
        require!(game.state == GameState::WaitingForPlayer, GameError::InvalidGameState);
        require!(game.player1 != ctx.accounts.player.key(), GameError::CannotJoinOwnGame);
        
        game.player2 = ctx.accounts.player.key();
        
        // Process wager with fee collection
        process_wager(
            &ctx.accounts.player.to_account_info(),
            &ctx.accounts.fee_collector.to_account_info(),
            &ctx.accounts.system_program.to_account_info(),
            game,
        )?;

        // Update player2's wagering stats
        let wager_lamports = game.wager.to_lamports();
        ctx.accounts.player2_profile.total_wagered += wager_lamports;
        // After both players joined, advance to commit phase
        game.state = GameState::CommitPhase;
        
        //TODO change to event emition?
        msg!("Player2 joined game #{}: {} (fee: {})", game.game_id, ctx.accounts.player.key(), game.fee_per_player);
        msg!("Game advanced to commit phase");
        Ok(())
    }

    pub fn reveal_move(ctx: Context<RevealMove>, _game_id: u64, move_choice: Move, salt: [u8; 32]) -> Result<()> {
        let game = &mut ctx.accounts.game;
        let player = ctx.accounts.player.key();
        
        require!(game.state == GameState::RevealPhase, GameError::InvalidGameState);
        require!(
            player == game.player1 || player == game.player2,
            GameError::NotPlayerInGame
        );

        // Verify the revealed move matches the committed hash
        // Format: [move_byte] + [32_salt_bytes] for secure hash computation
        let mut move_data = Vec::with_capacity(33);
        move_data.push(move_choice as u8);
        move_data.extend_from_slice(&salt);
        let computed_hash = hash(&move_data).to_bytes();

        if player == game.player1 {
            require!(game.player1_move.is_none(), GameError::AlreadyRevealed);
            require!(
                computed_hash == game.player1_move_hash.unwrap(),
                GameError::InvalidReveal
            );
            game.player1_move = Some(move_choice);
        } else if player == game.player2 {
            require!(game.player2_move.is_none(), GameError::AlreadyRevealed);
            require!(
                computed_hash == game.player2_move_hash.unwrap(),
                GameError::InvalidReveal
            );
            game.player2_move = Some(move_choice);
        } else {
            return Err(GameError::NotPlayerInGame.into());
        }
        
        msg!("Move revealed by player: {} in game #{}", player, game.game_id); //TODO emit event?

        // Check if both players have revealed
        if game.player1_move.is_some() && game.player2_move.is_some() { // Finish match
            let winner_type = determine_winner(
                game.player1_move.unwrap(),
                game.player2_move.unwrap(),
            );
            
            game.winner_type = Some(winner_type);
            game.winner_address = match winner_type {
                Winner::Player1 => Some(game.player1),
                Winner::Player2 => Some(game.player2),
                Winner::Tie => None, //TODO lets discuss draws later.
                Winner::Player1OpponentForfeit => Some(game.player1),
                Winner::Player2OpponentForfeit => Some(game.player2),
            };
            
            game.state = GameState::Finished;
            
            // Update stats when game finishes
            let global_state = &mut ctx.accounts.global_state;
            global_state.total_games_completed += 1;
            
            // Update player profile stats
            update_player_stats(
                &mut ctx.accounts.player1_profile,
                &mut ctx.accounts.player2_profile,
                winner_type,
                game,
            )?;
            
            // Handle payout to winner(s)
            payout_winner(
                game,
                &ctx.accounts.player1,
                &ctx.accounts.player2,
                winner_type,
            )?;
            
            msg!("Game #{} finished! Winner: {:?}, address: {:?}", game.game_id, game.winner_type, game.winner_address);
        } else { // First player reveal, set the timeout
            require!(game.reveal_deadline.is_none(), GameError::InvalidGameState); // just in case
            let clock = Clock::get()?;
            game.reveal_deadline = Some(clock.unix_timestamp + REVEAL_TIMEOUT_SECONDS);
            msg!("Reveal deadline set: {}", game.reveal_deadline.unwrap());
        }

        Ok(())
    }

    /// Claim victory when opponent fails to reveal within timeout
    pub fn claim_timeout_victory(ctx: Context<ClaimTimeoutVictory>) -> Result<()> {
        let game = &mut ctx.accounts.game;
        let player = ctx.accounts.player.key();
        let clock = Clock::get()?;

        require!(game.state == GameState::RevealPhase, GameError::InvalidGameState);
        require!(
            player == game.player1 || player == game.player2,
            GameError::NotPlayerInGame
        );

        // Check if deadline has passed
        let deadline = game.reveal_deadline.ok_or(GameError::NoDeadlineSet)?; // this requires a deadline to be set.
        require!(clock.unix_timestamp > deadline, GameError::DeadlineNotReached);

        // Determine who revealed and who didn't
        let (winner_type, winner_address) = if player == game.player1 {
            // Player1 is claiming, so player1 must have revealed and player2 must not have
            require!(game.player1_move.is_some(), GameError::ClaimerDidNotReveal);
            require!(game.player2_move.is_none(), GameError::OpponentAlreadyRevealed);
            (Winner::Player1OpponentForfeit, game.player1)
        } else {
            // Player2 is claiming, so player2 must have revealed and player1 must not have
            require!(game.player2_move.is_some(), GameError::ClaimerDidNotReveal);
            require!(game.player1_move.is_none(), GameError::OpponentAlreadyRevealed);
            (Winner::Player2OpponentForfeit, game.player2)
        };

        game.winner_type = Some(winner_type);
        game.winner_address = Some(winner_address);
        game.state = GameState::Finished;

        // Update global stats
        let global_state = &mut ctx.accounts.global_state;
        global_state.total_games_completed += 1;

        // Update player profile stats
        update_player_stats(
            &mut ctx.accounts.player1_profile,
            &mut ctx.accounts.player2_profile,
            winner_type,
            game,
        )?;

        // Handle payout to winner
        payout_winner(
            game,
            &ctx.accounts.player1,
            &ctx.accounts.player2,
            winner_type,
        )?;

        msg!("Game #{} finished by opponent forefit! Winner: {:?}, address: {:?}", 
             game.game_id, game.winner_type, game.winner_address);
        Ok(())
    }

    /// Update player name (can be called anytime)
    pub fn update_player_name(ctx: Context<UpdatePlayerName>, new_name: String) -> Result<()> {
        let player_profile = &mut ctx.accounts.player_profile;
        player_profile.name = new_name;
        msg!("Player {} updated name to: {}", ctx.accounts.player.key(), player_profile.name);
        Ok(())
    }

    /// Update fee collector address (only authority can call this)
    pub fn update_fee_collector(ctx: Context<UpdateFeeCollector>, new_fee_collector: Pubkey) -> Result<()> {
        let global_state = &mut ctx.accounts.global_state;
        let old_collector = global_state.fee_collector;
        global_state.fee_collector = new_fee_collector;
        
        msg!("Fee collector updated from {} to {} by authority: {}", 
             old_collector, new_fee_collector, ctx.accounts.authority.key());
        Ok(())
    }

    /// Update fee percentage (only authority can call this)
    pub fn update_fee_percentage(ctx: Context<UpdateFeeCollector>, new_fee_percentage: u64) -> Result<()> {
        let global_state = &mut ctx.accounts.global_state;
        let old_percentage = global_state.fee_percentage;
        global_state.fee_percentage = new_fee_percentage;
        
        msg!("Fee percentage updated from {}% to {}% by authority: {}", 
             old_percentage, new_fee_percentage, ctx.accounts.authority.key());
        Ok(())
    }

    //QUESTION game_id unused variable?
    pub fn commit_move(ctx: Context<CommitMove>, _game_id: u64, move_hash: [u8; 32]) -> Result<()> {
        let game = &mut ctx.accounts.game;
        let player = ctx.accounts.player.key();

        require!(game.state == GameState::CommitPhase, GameError::InvalidGameState);
        require!(player == game.player1 || player == game.player2, GameError::NotPlayerInGame);

        // Commit the move for the calling player (profile is always the caller's)
        commit_move_helper(
            game,
            &mut ctx.accounts.player_profile,
            &player,
            move_hash,
        )?;

        // If both players have committed, advance to reveal phase
        if game.player1_move_hash.is_some() && game.player2_move_hash.is_some() {
            game.state = GameState::RevealPhase;
            msg!("Both players committed. Game #{} advanced to reveal phase", game.game_id);
        } else {
            msg!("Player {} committed move in game #{}", player, game.game_id);
            msg!("Waiting for the other player");
        }
        Ok(())
    }
}

fn determine_winner(move1: Move, move2: Move) -> Winner {
    match (move1, move2) {
        (Move::Rock, Move::Scissors) | (Move::Paper, Move::Rock) | (Move::Scissors, Move::Paper) => Winner::Player1,
        (Move::Scissors, Move::Rock) | (Move::Rock, Move::Paper) | (Move::Paper, Move::Scissors) => Winner::Player2,
        _ => Winner::Tie,
    }
}

/// Helper function to process wager with fee collection
fn process_wager<'info>(
    player: &AccountInfo<'info>,
    fee_collector: &AccountInfo<'info>,
    system_program: &AccountInfo<'info>,
    game: &Account<'info, Game>,
) -> Result<()> {
    let fee_per_player = game.fee_per_player;
    let net_per_player = game.net_per_player();
    
    require!(fee_per_player > 0 && net_per_player > 0, GameError::InsufficientFunds);
    
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

/// Helper function to commit a player's move (used by create_game and join_game)
fn commit_move_helper(
    game: &mut Account<Game>,
    player_profile: &mut Account<PlayerProfile>,
    player: &Pubkey,
    move_hash: [u8; 32],
) -> Result<()> {
    require!(
        *player == game.player1 || *player == game.player2,
        GameError::NotPlayerInGame
    );

    if *player == game.player1 {
        require!(game.player1_move_hash.is_none(), GameError::AlreadyCommitted);
        game.player1_move_hash = Some(move_hash);
    } else if *player == game.player2 {
        require!(game.player2_move_hash.is_none(), GameError::AlreadyCommitted);
        game.player2_move_hash = Some(move_hash);
    } else {
        return Err(GameError::NotPlayerInGame.into());
    }

    // Increment total_games_played when player participates in a game
    player_profile.total_games_played += 1;

    msg!("Move committed by player: {} in game #{}", player, game.game_id);
    Ok(())
}

/// Helper function to initialize a player profile with default name
fn initialize_player_profile_if_needed(
    player_profile: &mut Account<PlayerProfile>,
    player: &Pubkey,
    bump: u8,
) -> Result<()> {
    // Check if this is a newly created account (all fields are zero-initialized)
    if player_profile.player == Pubkey::default() {
        let clock = Clock::get()?;
        
        // Generate default name using last 4 chars of pubkey
        let player_str = player.to_string();
        let default_name = format!("Player{}", &player_str[player_str.len()-4..]);
        
        player_profile.player = *player;
        player_profile.name = default_name;
        player_profile.created_at = clock.unix_timestamp;
        player_profile.bump = bump;
        // All other fields default to 0
        
        msg!("New player profile created: {} with default name: {}", player, player_profile.name);
    }
    Ok(())
}

/// Helper function to update player stats when a game finishes
fn update_player_stats(
    player1_profile: &mut Account<PlayerProfile>,
    player2_profile: &mut Account<PlayerProfile>,
    winner_type: Winner,
    game: &Game,
) -> Result<()> {
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
        }
        Winner::Player2 => {
            player1_profile.total_games_completed += 1;
            player2_profile.total_games_completed += 1;
            player1_profile.losses += 1;
            player2_profile.wins += 1;
            player2_profile.total_won += profit; // profit from opponent
            player1_profile.total_lost += game.wager.to_lamports();
        }
        Winner::Tie => {
            player1_profile.total_games_completed += 1;
            player2_profile.total_games_completed += 1;
            player1_profile.ties += 1;
            player2_profile.ties += 1;
            // no total_won or total_lost changes for ties
        }
        Winner::Player1OpponentForfeit => {
            // Player1 completed, Player2 forfeited
            player1_profile.total_games_completed += 1;
            player2_profile.total_games_forfeited += 1;
            player1_profile.wins += 1;
            player2_profile.losses += 1;
            player1_profile.total_won += profit; // profit from opponent
            player2_profile.total_lost += game.wager.to_lamports();
        }
        Winner::Player2OpponentForfeit => {
            // Player2 completed, Player1 forfeited
            player1_profile.total_games_forfeited += 1;
            player2_profile.total_games_completed += 1;
            player1_profile.losses += 1;
            player2_profile.wins += 1;
            player2_profile.total_won += profit; // profit from opponent
            player1_profile.total_lost += game.wager.to_lamports();
        }
    }
    
    Ok(())
}

/// Helper function to handle game payouts - transfers SOL from game account to winners
fn payout_winner(
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

#[derive(Accounts)]
pub struct InitializeGlobalState<'info> {
    #[account(
        init, //Guarantees only-once execution
        payer = authority,
        space = 8 + GlobalState::INIT_SPACE,
        seeds = [b"global_state"],
        bump
    )]
    pub global_state: Account<'info, GlobalState>,
    #[account(mut)] // Must be mut because it's the payer - SOL is deducted for account creation
    pub authority: Signer<'info>,
    // TODO play around with upgrading contracts later
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CreateGame<'info> {
    #[account(
        init,
        payer = player,
        space = 8 + Game::INIT_SPACE,
        seeds = [b"game", global_state.game_counter.to_le_bytes().as_ref()],
        bump
    )]
    pub game: Account<'info, Game>,
    #[account(
        mut,
        seeds = [b"global_state"],
        bump = global_state.bump
    )]
    pub global_state: Account<'info, GlobalState>,
    #[account(mut)] // Must be mut because it's the payer
    pub player: Signer<'info>,
    #[account(
        init_if_needed,  // ← Creates profile if it doesn't exist
        payer = player,
        space = 8 + PlayerProfile::INIT_SPACE,
        seeds = [b"player_profile", player.key().as_ref()],
        bump
    )]
    pub player1_profile: Account<'info, PlayerProfile>,
    /// CHECK: Fee collector account - receives fee from games
    #[account(mut, address = global_state.fee_collector)]
    pub fee_collector: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(game_id: u64)]
pub struct JoinGame<'info> {
    #[account(
        mut,
        seeds = [b"game", game_id.to_le_bytes().as_ref()],
        bump = game.bump
    )]
    pub game: Account<'info, Game>,
    #[account(
        mut,
        seeds = [b"global_state"],
        bump = global_state.bump
    )]
    pub global_state: Account<'info, GlobalState>,
    #[account(mut)] // Must be mut because it's the payer
    pub player: Signer<'info>,
    #[account(
        init_if_needed,  // ← Creates profile if it doesn't exist
        payer = player,
        space = 8 + PlayerProfile::INIT_SPACE,
        seeds = [b"player_profile", player.key().as_ref()],
        bump
    )]
    pub player2_profile: Account<'info, PlayerProfile>,
    /// CHECK: Fee collector account - receives fee from games
    #[account(mut, address = global_state.fee_collector)]
    pub fee_collector: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(game_id: u64)]
pub struct RevealMove<'info> {
    #[account(
        mut,
        seeds = [b"game", game_id.to_le_bytes().as_ref()],
        bump = game.bump
    )]
    pub game: Account<'info, Game>,
    #[account(
        mut,
        seeds = [b"global_state"],
        bump = global_state.bump
    )]
    pub global_state: Account<'info, GlobalState>,
    pub player: Signer<'info>,
    #[account(
        mut,
        seeds = [b"player_profile", game.player1.as_ref()],
        bump = player1_profile.bump
    )]
    pub player1_profile: Account<'info, PlayerProfile>,
    #[account(
        mut,
        seeds = [b"player_profile", game.player2.as_ref()],
        bump = player2_profile.bump
    )]
    pub player2_profile: Account<'info, PlayerProfile>,
    /// CHECK: Player1 account for payout
    #[account(mut, address = game.player1)]
    pub player1: AccountInfo<'info>,
    /// CHECK: Player2 account for payout  
    #[account(mut, address = game.player2)]
    pub player2: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct UpdatePlayerName<'info> {
    #[account(
        mut,
        seeds = [b"player_profile", player.key().as_ref()],
        bump = player_profile.bump
    )]
    pub player_profile: Account<'info, PlayerProfile>,
    pub player: Signer<'info>, 
}

#[derive(Accounts)]
pub struct UpdateFeeCollector<'info> {
    #[account(
        mut,
        seeds = [b"global_state"],
        bump = global_state.bump,
        has_one = authority @ GameError::Unauthorized
    )]
    pub global_state: Account<'info, GlobalState>,
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(game_id: u64)]
pub struct ClaimTimeoutVictory<'info> {
    #[account(
        mut,
        seeds = [b"game", game_id.to_le_bytes().as_ref()],
        bump = game.bump
    )]
    pub game: Account<'info, Game>,
    #[account(
        mut,
        seeds = [b"global_state"],
        bump = global_state.bump
    )]
    pub global_state: Account<'info, GlobalState>,
    pub player: Signer<'info>,
    #[account(
        mut,
        seeds = [b"player_profile", game.player1.as_ref()],
        bump = player1_profile.bump
    )]
    pub player1_profile: Account<'info, PlayerProfile>,
    #[account(
        mut,
        seeds = [b"player_profile", game.player2.as_ref()],
        bump = player2_profile.bump
    )]
    pub player2_profile: Account<'info, PlayerProfile>,
    /// CHECK: Player1 account for payout
    #[account(mut, address = game.player1)]
    pub player1: AccountInfo<'info>,
    /// CHECK: Player2 account for payout  
    #[account(mut, address = game.player2)]
    pub player2: AccountInfo<'info>,
}

#[derive(Accounts)]
#[instruction(game_id: u64)]
pub struct CommitMove<'info> {
    #[account(
        mut,
        seeds = [b"game", game_id.to_le_bytes().as_ref()],
        bump = game.bump
    )]
    pub game: Account<'info, Game>,
    pub player: Signer<'info>,
    #[account(
        mut,
        seeds = [b"player_profile", player.key().as_ref()],
        bump = player_profile.bump
    )]
    pub player_profile: Account<'info, PlayerProfile>,
}
