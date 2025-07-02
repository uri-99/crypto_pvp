/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/crypto_pvp.json`.
 */
export type CryptoPvp = {
  "address": "3S9Go4XvdE9bH8UjGmyDqEpaEHLSt7BMLGZEw5jB7DLP",
  "metadata": {
    "name": "cryptoPvp",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "claimTimeoutVictory",
      "docs": [
        "Claim victory when opponent fails to reveal within timeout"
      ],
      "discriminator": [
        21,
        175,
        209,
        185,
        79,
        50,
        147,
        140
      ],
      "accounts": [
        {
          "name": "game",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  97,
                  109,
                  101
                ]
              },
              {
                "kind": "arg",
                "path": "gameId"
              }
            ]
          }
        },
        {
          "name": "globalState",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  108,
                  111,
                  98,
                  97,
                  108,
                  95,
                  115,
                  116,
                  97,
                  116,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "player",
          "signer": true
        },
        {
          "name": "player1Profile",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  108,
                  97,
                  121,
                  101,
                  114,
                  95,
                  112,
                  114,
                  111,
                  102,
                  105,
                  108,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "game.player1",
                "account": "game"
              }
            ]
          }
        },
        {
          "name": "player2Profile",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  108,
                  97,
                  121,
                  101,
                  114,
                  95,
                  112,
                  114,
                  111,
                  102,
                  105,
                  108,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "game.player2",
                "account": "game"
              }
            ]
          }
        },
        {
          "name": "player1",
          "writable": true
        },
        {
          "name": "player2",
          "writable": true
        }
      ],
      "args": []
    },
    {
      "name": "createGame",
      "discriminator": [
        124,
        69,
        75,
        66,
        184,
        220,
        72,
        206
      ],
      "accounts": [
        {
          "name": "game",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  97,
                  109,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "global_state.game_counter",
                "account": "globalState"
              }
            ]
          }
        },
        {
          "name": "globalState",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  108,
                  111,
                  98,
                  97,
                  108,
                  95,
                  115,
                  116,
                  97,
                  116,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "player",
          "writable": true,
          "signer": true
        },
        {
          "name": "player1Profile",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  108,
                  97,
                  121,
                  101,
                  114,
                  95,
                  112,
                  114,
                  111,
                  102,
                  105,
                  108,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "player"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "wager",
          "type": {
            "defined": {
              "name": "wagerAmount"
            }
          }
        },
        {
          "name": "moveHash",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        }
      ]
    },
    {
      "name": "initializeGlobalState",
      "docs": [
        "Initializes the global state - can only be called once due to #[account(init)]"
      ],
      "discriminator": [
        232,
        254,
        209,
        244,
        123,
        89,
        154,
        207
      ],
      "accounts": [
        {
          "name": "globalState",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  108,
                  111,
                  98,
                  97,
                  108,
                  95,
                  115,
                  116,
                  97,
                  116,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "joinGame",
      "discriminator": [
        107,
        112,
        18,
        38,
        56,
        173,
        60,
        128
      ],
      "accounts": [
        {
          "name": "game",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  97,
                  109,
                  101
                ]
              },
              {
                "kind": "arg",
                "path": "gameId"
              }
            ]
          }
        },
        {
          "name": "player",
          "writable": true,
          "signer": true
        },
        {
          "name": "player2Profile",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  108,
                  97,
                  121,
                  101,
                  114,
                  95,
                  112,
                  114,
                  111,
                  102,
                  105,
                  108,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "player"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "gameId",
          "type": "u64"
        },
        {
          "name": "moveHash",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        }
      ]
    },
    {
      "name": "revealMove",
      "discriminator": [
        30,
        133,
        198,
        26,
        106,
        44,
        55,
        149
      ],
      "accounts": [
        {
          "name": "game",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  97,
                  109,
                  101
                ]
              },
              {
                "kind": "arg",
                "path": "gameId"
              }
            ]
          }
        },
        {
          "name": "globalState",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  108,
                  111,
                  98,
                  97,
                  108,
                  95,
                  115,
                  116,
                  97,
                  116,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "player",
          "signer": true
        },
        {
          "name": "player1Profile",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  108,
                  97,
                  121,
                  101,
                  114,
                  95,
                  112,
                  114,
                  111,
                  102,
                  105,
                  108,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "game.player1",
                "account": "game"
              }
            ]
          }
        },
        {
          "name": "player2Profile",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  108,
                  97,
                  121,
                  101,
                  114,
                  95,
                  112,
                  114,
                  111,
                  102,
                  105,
                  108,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "game.player2",
                "account": "game"
              }
            ]
          }
        },
        {
          "name": "player1",
          "writable": true
        },
        {
          "name": "player2",
          "writable": true
        }
      ],
      "args": [
        {
          "name": "gameId",
          "type": "u64"
        },
        {
          "name": "moveChoice",
          "type": {
            "defined": {
              "name": "move"
            }
          }
        },
        {
          "name": "salt",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        }
      ]
    },
    {
      "name": "updatePlayerName",
      "docs": [
        "Update player name (can be called anytime)"
      ],
      "discriminator": [
        1,
        189,
        54,
        68,
        216,
        13,
        185,
        5
      ],
      "accounts": [
        {
          "name": "playerProfile",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  108,
                  97,
                  121,
                  101,
                  114,
                  95,
                  112,
                  114,
                  111,
                  102,
                  105,
                  108,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "player"
              }
            ]
          }
        },
        {
          "name": "player",
          "signer": true
        }
      ],
      "args": [
        {
          "name": "newName",
          "type": "string"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "game",
      "discriminator": [
        27,
        90,
        166,
        125,
        74,
        100,
        121,
        18
      ]
    },
    {
      "name": "globalState",
      "discriminator": [
        163,
        46,
        74,
        168,
        216,
        123,
        133,
        98
      ]
    },
    {
      "name": "playerProfile",
      "discriminator": [
        82,
        226,
        99,
        87,
        164,
        130,
        181,
        80
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "invalidGameState",
      "msg": "Invalid game state"
    },
    {
      "code": 6001,
      "name": "cannotJoinOwnGame",
      "msg": "Cannot join your own game"
    },
    {
      "code": 6002,
      "name": "notPlayerInGame",
      "msg": "Not a player in this game"
    },
    {
      "code": 6003,
      "name": "alreadyCommitted",
      "msg": "Already committed move"
    },
    {
      "code": 6004,
      "name": "alreadyRevealed",
      "msg": "Already revealed move"
    },
    {
      "code": 6005,
      "name": "invalidReveal",
      "msg": "Invalid reveal - hash doesn't match"
    },
    {
      "code": 6006,
      "name": "globalStateNotInitialized",
      "msg": "Global state not initialized"
    },
    {
      "code": 6007,
      "name": "unauthorized",
      "msg": "Only authority can perform this action"
    },
    {
      "code": 6008,
      "name": "noDeadlineSet",
      "msg": "No deadline has been set for this game"
    },
    {
      "code": 6009,
      "name": "deadlineNotReached",
      "msg": "Reveal deadline has not been reached yet"
    },
    {
      "code": 6010,
      "name": "claimerDidNotReveal",
      "msg": "Claimer has not revealed their move"
    },
    {
      "code": 6011,
      "name": "opponentAlreadyRevealed",
      "msg": "Opponent has already revealed their move"
    },
    {
      "code": 6012,
      "name": "insufficientFunds",
      "msg": "Insufficient funds in game account for payout"
    }
  ],
  "types": [
    {
      "name": "game",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "gameId",
            "type": "u64"
          },
          {
            "name": "player1",
            "type": "pubkey"
          },
          {
            "name": "player2",
            "type": "pubkey"
          },
          {
            "name": "wager",
            "type": {
              "defined": {
                "name": "wagerAmount"
              }
            }
          },
          {
            "name": "state",
            "type": {
              "defined": {
                "name": "gameState"
              }
            }
          },
          {
            "name": "player1MoveHash",
            "type": {
              "option": {
                "array": [
                  "u8",
                  32
                ]
              }
            }
          },
          {
            "name": "player2MoveHash",
            "type": {
              "option": {
                "array": [
                  "u8",
                  32
                ]
              }
            }
          },
          {
            "name": "player1Move",
            "type": {
              "option": {
                "defined": {
                  "name": "move"
                }
              }
            }
          },
          {
            "name": "player2Move",
            "type": {
              "option": {
                "defined": {
                  "name": "move"
                }
              }
            }
          },
          {
            "name": "winnerType",
            "type": {
              "option": {
                "defined": {
                  "name": "winner"
                }
              }
            }
          },
          {
            "name": "winnerAddress",
            "type": {
              "option": "pubkey"
            }
          },
          {
            "name": "revealDeadline",
            "type": {
              "option": "i64"
            }
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "gameState",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "waitingForPlayer"
          },
          {
            "name": "revealPhase"
          },
          {
            "name": "finished"
          }
        ]
      }
    },
    {
      "name": "globalState",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "gameCounter",
            "type": "u64"
          },
          {
            "name": "totalGamesCompleted",
            "type": "u64"
          },
          {
            "name": "authority",
            "type": "pubkey"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "move",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "rock"
          },
          {
            "name": "paper"
          },
          {
            "name": "scissors"
          }
        ]
      }
    },
    {
      "name": "playerProfile",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "player",
            "type": "pubkey"
          },
          {
            "name": "name",
            "type": "string"
          },
          {
            "name": "availableFunds",
            "type": "u64"
          },
          {
            "name": "totalGamesPlayed",
            "type": "u64"
          },
          {
            "name": "totalGamesCompleted",
            "type": "u64"
          },
          {
            "name": "totalGamesForfeited",
            "type": "u64"
          },
          {
            "name": "wins",
            "type": "u32"
          },
          {
            "name": "losses",
            "type": "u32"
          },
          {
            "name": "ties",
            "type": "u32"
          },
          {
            "name": "totalWagered",
            "type": "u64"
          },
          {
            "name": "totalWon",
            "type": "u64"
          },
          {
            "name": "currentStreak",
            "type": "i32"
          },
          {
            "name": "bestStreak",
            "type": "u32"
          },
          {
            "name": "createdAt",
            "type": "i64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "wagerAmount",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "sol1"
          },
          {
            "name": "sol01"
          },
          {
            "name": "sol001"
          }
        ]
      }
    },
    {
      "name": "winner",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "player1"
          },
          {
            "name": "player2"
          },
          {
            "name": "tie"
          },
          {
            "name": "player1OpponentForfeit"
          },
          {
            "name": "player2OpponentForfeit"
          }
        ]
      }
    }
  ]
};
