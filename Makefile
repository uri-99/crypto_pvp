# Crypto PvP - Anchor Development Makefile

# Default target
.DEFAULT_GOAL := help

# Colors for output
GREEN := \033[0;32m
YELLOW := \033[0;33m
RED := \033[0;31m
NC := \033[0m # No Color

# Wallet paths (can be overridden via .env file)
AUTHORITY_WALLET ?= ~/.config/solana/authority.json
PLAYER_ALICE_WALLET ?= ~/.config/solana/playerAlice.json
PLAYER_BOB_WALLET ?= ~/.config/solana/playerBob.json

.PHONY: help setup build deploy test clean validator-start validator-stop airdrop airdrop-all alice_create bob_create alice_join bob_join alice_reveal bob_reveal

help: ## Show this help message
	@echo "$(GREEN)Crypto PvP Development Commands$(NC)"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(YELLOW)%-15s$(NC) %s\n", $$1, $$2}'

setup: ## Initial setup - configure Solana CLI for localnet
	@echo "$(GREEN)Configuring Solana CLI for localnet...$(NC)"
	solana config set --url localhost
	@echo "$(GREEN)Configuration complete!$(NC)"
	@solana config get

validator-start: ## Start local Solana validator
	@echo "$(GREEN)Starting local Solana validator...$(NC)"
	solana-test-validator --reset --quiet &
	@echo "$(YELLOW)Waiting for validator to start...$(NC)"
	@sleep 5
	@echo "$(GREEN)Validator started!$(NC)"

validator-stop: ## Stop local Solana validator
	@echo "$(RED)Stopping local Solana validator...$(NC)"
	pkill -f solana-test-validator || true
	@echo "$(GREEN)Validator stopped!$(NC)"

airdrop: ## Airdrop 10 SOL to default wallet
	@echo "$(GREEN)Airdropping 10 SOL to default wallet...$(NC)"
	solana airdrop 10
	@echo "$(GREEN)Balance:$(NC)"
	@solana balance

airdrop-all: ## Airdrop 5 SOL to all test wallets (authority, playerAlice, playerBob)
	@echo "$(GREEN)Airdropping 5 SOL to all test wallets...$(NC)"
	@echo "$(YELLOW)Funding authority wallet...$(NC)"
	solana airdrop 5 $(AUTHORITY_WALLET)
	@echo "$(YELLOW)Funding playerAlice wallet...$(NC)"
	solana airdrop 5 $(PLAYER_ALICE_WALLET)
	@echo "$(YELLOW)Funding playerBob wallet...$(NC)"
	solana airdrop 5 $(PLAYER_BOB_WALLET)
	@echo "$(GREEN)All wallets funded!$(NC)"
	@echo "$(GREEN)Wallet addresses:$(NC)"
	@echo "  Authority: $$(solana-keygen pubkey $(AUTHORITY_WALLET))"
	@echo "  PlayerAlice: $$(solana-keygen pubkey $(PLAYER_ALICE_WALLET))"
	@echo "  PlayerBob: $$(solana-keygen pubkey $(PLAYER_BOB_WALLET))"

build: ## Build the Anchor program
	@echo "$(GREEN)Building Anchor program...$(NC)"
	anchor build

deploy: build ## Deploy program to localnet
	@echo "$(GREEN)Deploying program to localnet...$(NC)"
	anchor deploy
	@echo "$(GREEN)Deployment complete!$(NC)"

status: ## Show current status
	@echo "$(GREEN)=== Solana Configuration ===$(NC)"
	@solana config get
	@echo ""
	@echo "$(GREEN)=== Default Wallet Balance ===$(NC)"
	@solana balance
	@echo ""
	@echo "$(GREEN)=== Test Wallet Balances ===$(NC)"
	@echo "Authority: $$(solana balance $(AUTHORITY_WALLET))"
	@echo "PlayerAlice: $$(solana balance $(PLAYER_ALICE_WALLET))"
	@echo "PlayerBob: $$(solana balance $(PLAYER_BOB_WALLET))"
	@echo ""
	@echo "$(GREEN)=== Validator Status ===$(NC)"
	@if pgrep -f solana-test-validator > /dev/null; then \
		echo "$(GREEN)✓ Local validator is running$(NC)"; \
	else \
		echo "$(RED)✗ Local validator is not running$(NC)"; \
	fi

logs: ## Show validator logs
	@echo "$(GREEN)Showing validator logs (Ctrl+C to exit)...$(NC)"
	solana logs

dev: validator-start airdrop-all deploy status logs ## Full dev setup: start validator, airdrop all wallets, deploy
	@echo "$(GREEN)Development environment ready!$(NC)"
	@echo "$(YELLOW)Your program is deployed and ready for testing$(NC)"

alice_create: ## Alice creates a game with specified move (usage: make alice_create rock)
	@if [ -z "$(filter-out $@,$(MAKECMDGOALS))" ]; then \
		echo "$(RED)Usage: make alice_create <rock|paper|scissors>$(NC)"; \
		echo "$(YELLOW)Example: make alice_create rock$(NC)"; \
		exit 1; \
	fi
	@echo "$(GREEN)Alice is creating a game with move: $(filter-out $@,$(MAKECMDGOALS))$(NC)"
	@echo "$(YELLOW)Game ID will be displayed after creation...$(NC)"
	ANCHOR_WALLET=$(PLAYER_ALICE_WALLET) yarn create-game $(filter-out $@,$(MAKECMDGOALS))

bob_create: ## Bob creates a game with specified move (usage: make bob_create paper)
	@if [ -z "$(filter-out $@,$(MAKECMDGOALS))" ]; then \
		echo "$(RED)Usage: make bob_create <rock|paper|scissors>$(NC)"; \
		echo "$(YELLOW)Example: make bob_create paper$(NC)"; \
		exit 1; \
	fi
	@echo "$(GREEN)Bob is creating a game with move: $(filter-out $@,$(MAKECMDGOALS))$(NC)"
	@echo "$(YELLOW)Game ID will be displayed after creation...$(NC)"
	ANCHOR_WALLET=$(PLAYER_BOB_WALLET) yarn create-game $(filter-out $@,$(MAKECMDGOALS))

alice_join: ## Alice joins a game with specified move (usage: make alice_join 123 rock)
	@if [ -z "$(filter-out $@,$(MAKECMDGOALS))" ] || [ -z "$(word 2,$(filter-out $@,$(MAKECMDGOALS)))" ]; then \
		echo "$(RED)Usage: make alice_join <game_id> <rock|paper|scissors>$(NC)"; \
		echo "$(YELLOW)Example: make alice_join 123 rock$(NC)"; \
		exit 1; \
	fi
	@echo "$(GREEN)Alice is joining game $(word 1,$(filter-out $@,$(MAKECMDGOALS))) with move: $(word 2,$(filter-out $@,$(MAKECMDGOALS)))$(NC)"
	ANCHOR_WALLET=$(PLAYER_ALICE_WALLET) yarn join-game $(word 1,$(filter-out $@,$(MAKECMDGOALS))) $(word 2,$(filter-out $@,$(MAKECMDGOALS)))

bob_join: ## Bob joins a game with specified move (usage: make bob_join 123 paper)
	@if [ -z "$(filter-out $@,$(MAKECMDGOALS))" ] || [ -z "$(word 2,$(filter-out $@,$(MAKECMDGOALS)))" ]; then \
		echo "$(RED)Usage: make bob_join <game_id> <rock|paper|scissors>$(NC)"; \
		echo "$(YELLOW)Example: make bob_join 123 paper$(NC)"; \
		exit 1; \
	fi
	@echo "$(GREEN)Bob is joining game $(word 1,$(filter-out $@,$(MAKECMDGOALS))) with move: $(word 2,$(filter-out $@,$(MAKECMDGOALS)))$(NC)"
	ANCHOR_WALLET=$(PLAYER_BOB_WALLET) yarn join-game $(word 1,$(filter-out $@,$(MAKECMDGOALS))) $(word 2,$(filter-out $@,$(MAKECMDGOALS)))

alice_reveal: ## Alice reveals her move for a game (usage: make alice_reveal 123)
	@if [ -z "$(filter-out $@,$(MAKECMDGOALS))" ]; then \
		echo "$(RED)Usage: make alice_reveal <game_id>$(NC)"; \
		echo "$(YELLOW)Example: make alice_reveal 123$(NC)"; \
		exit 1; \
	fi
	@echo "$(GREEN)Alice is revealing her move for game: $(filter-out $@,$(MAKECMDGOALS))$(NC)"
	ANCHOR_WALLET=$(PLAYER_ALICE_WALLET) yarn reveal-move $(filter-out $@,$(MAKECMDGOALS))

bob_reveal: ## Bob reveals his move for a game (usage: make bob_reveal 123)
	@if [ -z "$(filter-out $@,$(MAKECMDGOALS))" ]; then \
		echo "$(RED)Usage: make bob_reveal <game_id>$(NC)"; \
		echo "$(YELLOW)Example: make bob_reveal 123$(NC)"; \
		exit 1; \
	fi
	@echo "$(GREEN)Bob is revealing his move for game: $(filter-out $@,$(MAKECMDGOALS))$(NC)"
	ANCHOR_WALLET=$(PLAYER_BOB_WALLET) yarn reveal-move $(filter-out $@,$(MAKECMDGOALS))

test: ## Run Anchor tests
	@echo "$(GREEN)Running Anchor tests...$(NC)"
	anchor test --skip-local-validator

test-with-validator: ## Run tests with fresh validator
	@echo "$(GREEN)Running tests with fresh validator...$(NC)"
	anchor test

clean: validator-stop ## Clean build artifacts (keypairs safe in ~/.config/solana/anchor-keys)
	@echo "$(GREEN)Cleaning build artifacts...$(NC)"
	anchor clean
	rm -rf target/
	@echo "$(GREEN)Clean complete! Use 'make restore-keys' if needed$(NC)"

restore-keys: ## Restore program keypairs from ~/.config/solana/anchor-keys
	@echo "$(GREEN)Restoring program keypairs...$(NC)"
	@mkdir -p target/deploy
	@if [ -f ~/.config/solana/anchor-keys/crypto_pvp-keypair.json ]; then \
		cp ~/.config/solana/anchor-keys/crypto_pvp-keypair.json target/deploy/; \
		echo "$(GREEN)✓ Program keypair restored$(NC)"; \
	else \
		echo "$(RED)✗ No saved keypair found in ~/.config/solana/anchor-keys/$(NC)"; \
	fi

save-keys: ## Save current program keypairs to ~/.config/solana/anchor-keys
	@echo "$(GREEN)Saving program keypairs...$(NC)"
	@mkdir -p ~/.config/solana/anchor-keys
	@if [ -f target/deploy/crypto_pvp-keypair.json ]; then \
		cp target/deploy/crypto_pvp-keypair.json ~/.config/solana/anchor-keys/; \
		echo "$(GREEN)✓ Program keypair saved to ~/.config/solana/anchor-keys/$(NC)"; \
	else \
		echo "$(RED)✗ No keypair found in target/deploy/$(NC)"; \
	fi

clean-all: ## Nuclear clean - removes everything including keypairs and node_modules
	@echo "$(RED)WARNING: This will remove EVERYTHING including program keypairs!$(NC)"
	@echo "$(YELLOW)You will need to redeploy with a new program ID$(NC)"
	@echo "$(YELLOW)Press Ctrl+C to cancel, or Enter to continue...$(NC)"
	@read
	anchor clean
	rm -rf target/ node_modules/
	@echo "$(RED)Nuclear clean complete!$(NC)"

# Handle arguments for create/join targets
%:
	@: