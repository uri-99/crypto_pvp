use anchor_lang::prelude::*;

#[error_code]
pub enum GameError {
    #[msg("Invalid game state")]
    InvalidGameState,
    #[msg("Cannot join your own game")]
    CannotJoinOwnGame,
    #[msg("Game is already full")]
    GameAlreadyFull,
    #[msg("Not a player in this game")]
    NotPlayerInGame,
    #[msg("Already committed move")]
    AlreadyCommitted,
    #[msg("Already revealed move")]
    AlreadyRevealed,
    #[msg("Invalid reveal - hash doesn't match")]
    InvalidReveal,
    #[msg("Global state not initialized")]
    GlobalStateNotInitialized,
    #[msg("Only authority can perform this action")]
    Unauthorized,
    #[msg("No deadline has been set for this game")]
    NoDeadlineSet,
    #[msg("Reveal deadline has not been reached yet")]
    DeadlineNotReached,
    #[msg("Claimer has not committed their move")]
    ClaimerDidNotCommit,
    #[msg("Opponent has already committed their move")]
    OpponentAlreadyCommitted,
    #[msg("Claimer has not revealed their move")]
    ClaimerDidNotReveal,
    #[msg("Opponent has already revealed their move")]
    OpponentAlreadyRevealed,
    #[msg("Insufficient funds in game account for payout")]
    InsufficientFunds,
}
