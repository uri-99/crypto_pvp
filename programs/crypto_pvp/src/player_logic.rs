use anchor_lang::prelude::*;

use crate::state::*;

// Player logic functions

/// Update player name (can be called anytime)
pub fn update_player_name(ctx: Context<UpdatePlayerName>, new_name: String) -> Result<()> {
    let player_profile = &mut ctx.accounts.player_profile;
    player_profile.name = new_name;
    msg!("Player {} updated name to: {}", ctx.accounts.player.key(), player_profile.name);
    Ok(())
}

/// Helper function to initialize a player profile with default name
pub fn initialize_player_profile_if_needed(
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

// Account structs

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
