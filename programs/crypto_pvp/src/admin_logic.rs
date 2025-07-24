use anchor_lang::prelude::*;

use crate::errors::*;
use crate::state::*;

// Admin logic functions

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
    global_state.reveal_timeout_seconds = 120; // 2 minutes default
    
    msg!("Global state initialized by authority: {}", ctx.accounts.authority.key());
    msg!("Fee collector set to: {}", fee_collector);
    msg!("Fee percentage set to: {}%", global_state.fee_percentage);
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

/// Update reveal timeout (only authority can call this)
pub fn update_reveal_timeout(ctx: Context<UpdateFeeCollector>, new_timeout: i64) -> Result<()> {
    let global_state = &mut ctx.accounts.global_state;
    global_state.reveal_timeout_seconds = new_timeout;
    msg!("Reveal timeout updated to {} seconds", new_timeout);
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
