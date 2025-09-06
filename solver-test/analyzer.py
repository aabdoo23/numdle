"""
Performance analysis tools for Bulls and Cows strategies.
"""

import time
from collections import defaultdict, Counter
from typing import List, Dict, Tuple
from game import feedback, generate_all_codes, is_valid_code
from strategies import get_strategy, Strategy


def solve_game(secret: str, strategy: Strategy) -> List[Tuple[str, Tuple[int, int], int]]:
    """
    Solve a single game using the given strategy.
    
    Args:
        secret: The secret code to guess
        strategy: The strategy to use
        
    Returns:
        List of (guess, feedback, remaining_candidates) for each turn
    """
    if not is_valid_code(secret):
        raise ValueError(f"Invalid secret code: {secret}")
    
    strategy.reset()
    history = []
    
    while True:
        remaining_before = len(strategy.candidates)
        guess = strategy.make_guess()
        fb = feedback(secret, guess)
        
        history.append((guess, fb, remaining_before))
        
        if guess == secret:
            break
            
        strategy.update(guess, fb)
    
    return history


def analyze_strategy(strategy_name: str, num_tests: int = 100) -> Dict:
    """
    Analyze a strategy's performance across multiple random games.
    
    Args:
        strategy_name: Name of the strategy to test
        num_tests: Number of random games to test
        
    Returns:
        Dictionary with performance statistics
    """
    strategy = get_strategy(strategy_name)
    all_codes = generate_all_codes()
    
    # Select random subset for testing
    import random
    test_codes = random.sample(all_codes, min(num_tests, len(all_codes)))
    
    guess_counts = []
    total_time = 0
    
    for secret in test_codes:
        start_time = time.time()
        history = solve_game(secret, strategy)
        end_time = time.time()
        
        guess_counts.append(len(history))
        total_time += (end_time - start_time)
    
    return {
        'strategy': strategy_name,
        'games_tested': len(test_codes),
        'avg_guesses': sum(guess_counts) / len(guess_counts),
        'min_guesses': min(guess_counts),
        'max_guesses': max(guess_counts),
        'avg_time_per_game': total_time / len(test_codes),
        'guess_distribution': dict(Counter(guess_counts))
    }


def compare_strategies(strategies: List[str], num_tests: int = 50) -> Dict:
    """
    Compare multiple strategies side by side.
    
    Args:
        strategies: List of strategy names to compare
        num_tests: Number of test games for each strategy
        
    Returns:
        Dictionary with comparison results
    """
    results = {}
    
    for strategy_name in strategies:
        print(f"Testing {strategy_name} strategy...")
        results[strategy_name] = analyze_strategy(strategy_name, num_tests)
    
    return results


def worst_case_analysis(strategy_name: str) -> Dict:
    """
    Find the worst-case performance for a strategy.
    Tests against all possible secret codes.
    
    Args:
        strategy_name: Name of the strategy to test
        
    Returns:
        Dictionary with worst-case analysis
    """
    strategy = get_strategy(strategy_name)
    all_codes = generate_all_codes()
    
    guess_counts = []
    worst_cases = []
    
    print(f"Running worst-case analysis for {strategy_name} strategy...")
    print(f"Testing against {len(all_codes)} possible secrets...")
    
    for i, secret in enumerate(all_codes):
        if i % 500 == 0:
            print(f"Progress: {i}/{len(all_codes)} ({i/len(all_codes)*100:.1f}%)")
        
        history = solve_game(secret, strategy)
        guesses = len(history)
        guess_counts.append(guesses)
        
        # Track worst cases
        if guesses >= max(guess_counts[-100:], default=0):
            worst_cases.append((secret, guesses, history))
    
    # Keep only the actual worst cases
    max_guesses = max(guess_counts)
    worst_cases = [(secret, guesses, history) for secret, guesses, history in worst_cases 
                   if guesses == max_guesses]
    
    return {
        'strategy': strategy_name,
        'total_codes_tested': len(all_codes),
        'avg_guesses': sum(guess_counts) / len(guess_counts),
        'min_guesses': min(guess_counts),
        'max_guesses': max(guess_counts),
        'worst_case_secrets': [secret for secret, _, _ in worst_cases],
        'worst_case_count': len(worst_cases),
        'guess_distribution': dict(Counter(guess_counts))
    }
