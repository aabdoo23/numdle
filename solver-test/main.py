"""
Main application for Bulls and Cows strategy analysis.
"""

import argparse
from game import is_valid_code, feedback
from strategies import get_strategy
from analyzer import solve_game, analyze_strategy, compare_strategies, worst_case_analysis


def interactive_game():
    """Play an interactive game against the computer."""
    print("=== Interactive Bulls and Cows Game ===")
    print("I'll try to guess your 4-digit secret code!")
    print("Rules:")
    print("- Use 4 unique digits (0-9)")
    print("- Strikes: correct digit in correct position")
    print("- Balls: correct digit in wrong position")
    print()
    
    # Get secret from user
    while True:
        secret = input("Enter your 4-digit secret code (or 'random' for random): ").strip()
        
        if secret.lower() == 'random':
            import random
            from game import generate_all_codes
            secret = random.choice(generate_all_codes())
            print(f"Generated random secret: {secret}")
            break
        elif is_valid_code(secret):
            break
        else:
            print("Invalid code! Use 4 unique digits.")
    
    # Get strategy
    strategy_name = input("Choose strategy (minimax/entropy/frequency/random): ").strip().lower()
    if strategy_name not in ['minimax', 'entropy', 'frequency', 'random']:
        strategy_name = 'minimax'
        print("Using default: minimax")
    
    # Play the game
    strategy = get_strategy(strategy_name)
    history = solve_game(secret, strategy)
    
    print(f"\n=== Game Results ===")
    for i, (guess, fb, remaining) in enumerate(history, 1):
        strikes, balls = fb
        print(f"Guess {i}: {guess} -> {strikes} strikes, {balls} balls "
              f"(candidates before: {remaining})")
    
    print(f"\nSolved in {len(history)} guesses using {strategy_name} strategy!")


def demo_strategies():
    """Demonstrate different strategies on the same secret."""
    print("=== Strategy Demonstration ===")
    
    secret = input("Enter secret code to test (or press Enter for '1234'): ").strip()
    if not secret or not is_valid_code(secret):
        secret = '1234'
    
    strategies = ['minimax', 'entropy', 'frequency', 'random']
    
    print(f"\nTesting all strategies against secret: {secret}")
    print("=" * 50)
    
    for strategy_name in strategies:
        strategy = get_strategy(strategy_name)
        history = solve_game(secret, strategy)
        
        print(f"\n{strategy_name.upper()} Strategy:")
        for i, (guess, fb, remaining) in enumerate(history, 1):
            strikes, balls = fb
            print(f"  {i}. {guess} -> {strikes}S, {balls}B (candidates: {remaining})")
        print(f"  Result: {len(history)} guesses")


def benchmark_strategies():
    """Benchmark and compare strategy performance."""
    print("=== Strategy Benchmark ===")
    
    num_tests = int(input("Number of test games (default 100): ") or "100")
    strategies = ['minimax', 'entropy', 'frequency', 'random']
    
    results = compare_strategies(strategies, num_tests)
    
    print(f"\n=== Benchmark Results ({num_tests} games each) ===")
    print(f"{'Strategy':<12} {'Avg':<6} {'Min':<4} {'Max':<4} {'Time(ms)':<10}")
    print("-" * 40)
    
    for strategy_name in strategies:
        stats = results[strategy_name]
        avg_time_ms = stats['avg_time_per_game'] * 1000
        print(f"{strategy_name:<12} {stats['avg_guesses']:<6.2f} "
              f"{stats['min_guesses']:<4} {stats['max_guesses']:<4} "
              f"{avg_time_ms:<10.2f}")


def worst_case_test():
    """Run worst-case analysis for a strategy."""
    print("=== Worst-Case Analysis ===")
    
    strategy_name = input("Strategy to analyze (minimax/entropy/frequency): ").strip().lower()
    if strategy_name not in ['minimax', 'entropy', 'frequency']:
        strategy_name = 'minimax'
    
    print("Warning: This may take several minutes...")
    confirm = input("Continue? (y/N): ").strip().lower()
    if confirm != 'y':
        return
    
    results = worst_case_analysis(strategy_name)
    
    print(f"\n=== Worst-Case Results for {strategy_name.upper()} ===")
    print(f"Total codes tested: {results['total_codes_tested']}")
    print(f"Average guesses: {results['avg_guesses']:.2f}")
    print(f"Best case: {results['min_guesses']} guesses")
    print(f"Worst case: {results['max_guesses']} guesses")
    print(f"Worst-case secrets ({results['worst_case_count']} total):")
    
    for secret in results['worst_case_secrets'][:10]:  # Show first 10
        print(f"  {secret}")
    if results['worst_case_count'] > 10:
        print(f"  ... and {results['worst_case_count'] - 10} more")


def main():
    """Main application entry point."""
    parser = argparse.ArgumentParser(description="Bulls and Cows Strategy Analyzer")
    parser.add_argument('--mode', choices=['play', 'demo', 'benchmark', 'worst-case'], 
                       default='play', help='Application mode')
    parser.add_argument('--secret', help='Secret code for demo mode')
    parser.add_argument('--strategy', choices=['minimax', 'entropy', 'frequency', 'random'],
                       default='minimax', help='Strategy to use')
    
    args = parser.parse_args()
    
    if args.mode == 'play':
        interactive_game()
    elif args.mode == 'demo':
        demo_strategies()
    elif args.mode == 'benchmark':
        benchmark_strategies()
    elif args.mode == 'worst-case':
        worst_case_test()


if __name__ == "__main__":
    main()
