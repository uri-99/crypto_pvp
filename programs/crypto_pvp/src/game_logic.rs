use anchor_lang::prelude::*;

use crate::errors::*;
use crate::state::*;
use crate::player_logic::initialize_player_profile_if_needed;
use crate::utils::{process_wager, update_endgame_stats, payout_winner};
use anchor_lang::solana_program::hash::hash;

// Game logic functions

// Creates a new game
pub fn create_game(ctx: Context<CreateGame>, wager: WagerAmount, rounds_to_win: u8) -> Result<()> {
    let global_state = &mut ctx.accounts.global_state;
    let game = &mut ctx.accounts.game;

    // Only allow best-of-1, 3, or 5 (rounds_to_win = 1, 2, or 3)
    require!(rounds_to_win == 1 || rounds_to_win == 2 || rounds_to_win == 3, GameError::InvalidGameState);

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
    // Multi-round fields
    game.rounds_to_win = rounds_to_win;
    game.current_round = 1;
    game.player1_round_wins = 0;
    game.player2_round_wins = 0;
    
    // Update global stats
    global_state.game_counter += 1;
    
    // Process wager with fee collection
    process_wager(
        &ctx.accounts.player.to_account_info(),
        &ctx.accounts.fee_collector.to_account_info(),
        &ctx.accounts.system_program.to_account_info(),
        game,
        &mut ctx.accounts.player1_profile,
    )?;
    
    msg!("Game #{} created by player1: {}, wager: {} lamports (fee: {}), rounds_to_win: {}", 
            game.game_id, ctx.accounts.player.key(), wager.to_lamports(), game.fee_per_player, rounds_to_win);
    Ok(())
}

//TODO cancel create game

// game_id is used by Anchor for account validation
pub fn join_game(ctx: Context<JoinGame>, _game_id: u64) -> Result<()> {
    let game = &mut ctx.accounts.game;

    let joining_player = ctx.accounts.player.key();

    require!(game.state == GameState::WaitingForPlayer, GameError::InvalidGameState);
    require!(game.player2 == Pubkey::default(), GameError::GameAlreadyFull); //shouldn't happen, but just in case
    require!(joining_player != game.player1, GameError::CannotJoinOwnGame);

    // Initialize player2 profile
    initialize_player_profile_if_needed(&mut ctx.accounts.player2_profile, &joining_player, ctx.bumps.player2_profile)?;

    game.state = GameState::CommitPhase;
    set_play_deadline(game, &ctx.accounts.global_state)?;

    // Set player2 and process their wager
    game.player2 = joining_player;
    process_wager(
        &ctx.accounts.player.to_account_info(),
        &ctx.accounts.fee_collector.to_account_info(),
        &ctx.accounts.system_program.to_account_info(),
        game,
        &mut ctx.accounts.player2_profile,
    )?;

    //TODO change to event emition?
    msg!("Player2 joined game #{}: {} (fee: {})", game.game_id, ctx.accounts.player.key(), game.fee_per_player);
    msg!("Game advanced to commit phase");
    Ok(())
}

// game_id is used by Anchor for account validation
pub fn commit_move(ctx: Context<CommitMove>, _game_id: u64, move_hash: [u8; 32]) -> Result<()> {
    let game = &mut ctx.accounts.game;
    let player = ctx.accounts.player.key();

    require!(game.state == GameState::CommitPhase, GameError::InvalidGameState);
    require!(
        player == game.player1 || player == game.player2,
        GameError::NotPlayerInGame
    );

    // Commit the move
    commit_move_helper(game, &player, move_hash)?;

    // If both players have committed, advance to reveal phase
    if game.player1_move_hash.is_some() && game.player2_move_hash.is_some() {
        game.state = GameState::RevealPhase;
        set_play_deadline(game, &ctx.accounts.global_state)?;
        msg!("Both players committed. Game #{} advanced to reveal phase", game.game_id);
    } else {
        msg!("Waiting for the other player");
    }

    Ok(())
}

// game_id is used by Anchor for account validation
pub fn reveal_move(mut ctx: Context<RevealMove>, _game_id: u64, move_choice: Move, salt: [u8; 32]) -> Result<()> {
    let player = ctx.accounts.player.key();

    // Validate the reveal
    validate_reveal(&ctx.accounts.game, &player, move_choice, &salt)?;

    // Now we can modify the game
    match player {
        p if p == ctx.accounts.game.player1 => {
            ctx.accounts.game.player1_move = Some(move_choice);
        }
        p if p == ctx.accounts.game.player2 => {
            ctx.accounts.game.player2_move = Some(move_choice);
        }
        _ => return Err(GameError::NotPlayerInGame.into()),
    }

    // Check if both players have revealed
    if ctx.accounts.game.player1_move.is_some() && ctx.accounts.game.player2_move.is_some() {
        // Second reveal,
        // Determine winner for this round
        let winner_type = determine_winner(
            ctx.accounts.game.player1_move.unwrap(),
            ctx.accounts.game.player2_move.unwrap(),
        );

        let match_continues = check_and_handle_match_end(&mut ctx, winner_type)?;
        if match_continues {
            prepare_next_round(&mut ctx)?;
        }
    }

    Ok(())
}

fn validate_reveal(game: &Game, player: &Pubkey, move_choice: Move, salt: &[u8; 32]) -> Result<()> {
    require!(game.state == GameState::RevealPhase, GameError::InvalidGameState);
    require!(
        *player == game.player1 || *player == game.player2,
        GameError::NotPlayerInGame
    );

    // Verify the revealed move matches the committed hash
    // Format: [move_byte] + [32_salt_bytes] for secure hash computation
    let mut move_data = Vec::with_capacity(33);
    move_data.push(move_choice as u8);
    move_data.extend_from_slice(salt);
    let computed_hash = hash(&move_data).to_bytes();

    // Reveal the move for the calling player
    match player {
        p if p == &game.player1 => {
            require!(game.player1_move.is_none(), GameError::AlreadyRevealed);
            require!(
                computed_hash == game.player1_move_hash.unwrap(),
                GameError::InvalidReveal
            );
        }
        p if p == &game.player2 => {
            require!(game.player2_move.is_none(), GameError::AlreadyRevealed);
            require!(
                computed_hash == game.player2_move_hash.unwrap(),
                GameError::InvalidReveal
            );
        }
        _ => return Err(GameError::NotPlayerInGame.into()),
    }
    //TODO emit event?
    msg!("Move revealed by player: {} in game #{} (round {})", player, game.game_id, game.current_round);
    Ok(())
}

/// Claim victory when opponent fails to interact within timeout
pub fn claim_timeout_victory(ctx: Context<ClaimTimeoutVictory>) -> Result<()> {
    let game = &mut ctx.accounts.game;
    let player = ctx.accounts.player.key();
    let clock = Clock::get()?;

    require!(
        player == game.player1 || player == game.player2,
        GameError::NotPlayerInGame
    );
    require!(
        game.state == GameState::CommitPhase || game.state == GameState::RevealPhase,
        GameError::InvalidGameState
    );

    // Check if deadline has passed
    let deadline = game.play_deadline.ok_or(GameError::NoDeadlineSet)?; // this requires a deadline to be set.
    require!(clock.unix_timestamp > deadline, GameError::DeadlineNotReached);

    // Determine winner based on game state and who completed their action
    let (winner_type, winner_address) = match game.state {
        GameState::CommitPhase => {
            // In commit phase: check who committed and who didn't
            let player1_committed = game.player1_move_hash.is_some();
            let player2_committed = game.player2_move_hash.is_some();
            
            if player == game.player1 {
                // Player1 is claiming timeout victory
                require!(player1_committed, GameError::ClaimerDidNotCommit);
                require!(!player2_committed, GameError::OpponentAlreadyCommitted);
                (Winner::Player1OpponentForfeit, game.player1)
            } else {
                // Player2 is claiming timeout victory
                require!(player2_committed, GameError::ClaimerDidNotCommit);
                require!(!player1_committed, GameError::OpponentAlreadyCommitted);
                (Winner::Player2OpponentForfeit, game.player2)
            }
        }
        GameState::RevealPhase => {
            // In reveal phase: check who revealed and who didn't
            let player1_revealed = game.player1_move.is_some();
            let player2_revealed = game.player2_move.is_some();
            
            if player == game.player1 {
                // Player1 is claiming timeout victory
                require!(player1_revealed, GameError::ClaimerDidNotReveal);
                require!(!player2_revealed, GameError::OpponentAlreadyRevealed);
                (Winner::Player1OpponentForfeit, game.player1)
            } else {
                // Player2 is claiming timeout victory
                require!(player2_revealed, GameError::ClaimerDidNotReveal);
                require!(!player1_revealed, GameError::OpponentAlreadyRevealed);
                (Winner::Player2OpponentForfeit, game.player2)
            }
        }
        _ => return Err(GameError::InvalidGameState.into()),
    };

    // Set game state
    game.winner_type = Some(winner_type);
    game.winner_address = Some(winner_address);
    game.state = GameState::Finished;

    // Update global stats
    update_endgame_stats(
        &mut ctx.accounts.global_state,
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

    msg!("Game #{} finished by opponent forfeit! Winner: {:?}", game.game_id, winner_type);

    Ok(())
}

/// Helpers

// Updates stats and pays to winner
fn process_match_victory(
    ctx: &mut Context<RevealMove>,
    winner_type: Winner,
    winner_address: Pubkey,
) -> Result<bool> { 
    let game = &mut ctx.accounts.game;
    game.winner_type = Some(winner_type);
    game.winner_address = Some(winner_address);
    game.state = GameState::Finished;

    // Update global stats
    update_endgame_stats(
        &mut ctx.accounts.global_state,
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

    msg!("Game #{} finished! Winner: {:?}", game.game_id, winner_type);
    return Ok(true);
}

fn prepare_next_round(
    ctx: &mut Context<RevealMove>
) -> Result<()> {
    let game = &mut ctx.accounts.game;
    game.current_round += 1;
    game.player1_move = None;
    game.player2_move = None;
    game.player1_move_hash = None;
    game.player2_move_hash = None;
    // rounds start on Commit
    game.state = GameState::CommitPhase;
    set_play_deadline(game, &ctx.accounts.global_state)?;
    msg!("Next round: {}", game.current_round);
    Ok(())
}

fn set_play_deadline(
    game: &mut Account<Game>, 
    global_state: &Account<GlobalState>
) -> Result<()> {
    let clock = Clock::get()?;
    game.play_deadline = Some(clock.unix_timestamp + global_state.reveal_timeout_seconds);
    Ok(())
}

fn commit_move_helper(
    game: &mut Account<Game>,
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

    msg!("Move committed by player: {} in game #{}", player, game.game_id);
    Ok(())
}


fn check_and_handle_match_end(
    ctx: &mut Context<RevealMove>,
    winner: Winner,
) -> Result<bool> { // Returns true if match continues, false if ended
    let rounds_to_win = ctx.accounts.game.rounds_to_win;
    let current_round = ctx.accounts.game.current_round;

    match winner {
        Winner::Tie => {
            msg!("Round {} is a tie.", current_round);
            Ok(true) // Match continues
        }
        Winner::Player1 => {
            ctx.accounts.game.player1_round_wins += 1;
            msg!("Player1 wins round {} ({} total)", current_round, ctx.accounts.game.player1_round_wins);
            if ctx.accounts.game.player1_round_wins >= rounds_to_win {
                process_match_victory(ctx, winner, ctx.accounts.game.player1)?;
                Ok(false) // Match ended
            } else {
                Ok(true) // Match continues
            }
        }
        Winner::Player2 => {
            ctx.accounts.game.player2_round_wins += 1;
            msg!("Player2 wins round {} ({} total)", current_round, ctx.accounts.game.player2_round_wins);
            if ctx.accounts.game.player2_round_wins >= rounds_to_win {
                process_match_victory(ctx, winner, ctx.accounts.game.player2)?;
                Ok(false) // Match ended
            } else {
                Ok(true) // Match continues
            }
        }
        Winner::Player1OpponentForfeit | Winner::Player2OpponentForfeit => {
            // TODO handle forefit
            // error cant happen here. determine_winner doesn't return forefits. just in case
            Ok(false) // Match ended
        }
    }
}

fn determine_winner(move1: Move, move2: Move) -> Winner {
    match (move1, move2) {
        (Move::Rock, Move::Scissors) | (Move::Paper, Move::Rock) | (Move::Scissors, Move::Paper) => Winner::Player1,
        (Move::Scissors, Move::Rock) | (Move::Rock, Move::Paper) | (Move::Paper, Move::Scissors) => Winner::Player2,
        _ => Winner::Tie,
    }
}

// Account structs

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
pub struct CommitMove<'info> {
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
        seeds = [b"player_profile", player.key().as_ref()],
        bump = player_profile.bump
    )]
    pub player_profile: Account<'info, PlayerProfile>,
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
