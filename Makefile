# Crypto PvP - Anchor Development Makefile

# Default target
.DEFAULT_GOAL := help

# Colors for output
GREEN := \033[0;32m
YELLOW := \033[0;33m
RED := \033[0;31m
NC := \033[0m # No Color

.PHONY: help setup build deploy test clean validator-start validator-stop airdrop

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
	@echo "$(GREEN)Airdropping 10 SOL to wallet...$(NC)"
	solana airdrop 10
	@echo "$(GREEN)Balance:$(NC)"
	@solana balance

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
	@echo "$(GREEN)=== Wallet Balance ===$(NC)"
	@solana balance
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

dev: validator-start airdrop deploy status logs ## Full dev setup: start validator, airdrop, deploy
	@echo "$(GREEN)Development environment ready!$(NC)"
	@echo "$(YELLOW)Your program is deployed and ready for testing$(NC)"

test: ## Run Anchor tests
	@echo "$(GREEN)Running Anchor tests...$(NC)"
	anchor test --skip-local-validator

test-with-validator: ## Run tests with fresh validator
	@echo "$(GREEN)Running tests with fresh validator...$(NC)"
	anchor test

clean: ## Clean build artifacts
	@echo "$(GREEN)Cleaning build artifacts...$(NC)"
	anchor clean
	rm -rf target/
	rm -rf node_modules/
	@echo "$(GREEN)Clean complete!$(NC)"