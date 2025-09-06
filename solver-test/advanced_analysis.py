"""
Advanced analysis and visualization for Bulls and Cows strategies.
"""

import matplotlib.pyplot as plt
import numpy as np
from typing import Dict, List
from analyzer import analyze_strategy, worst_case_analysis
from strategies import get_strategy
from game import generate_all_codes


def plot_strategy_comparison(results: Dict, save_path: str = None):
    """
    Plot comparison of strategy performance.
    
    Args:
        results: Dictionary from compare_strategies()
        save_path: Optional path to save the plot
    """
    strategies = list(results.keys())
    avg_guesses = [results[s]['avg_guesses'] for s in strategies]
    max_guesses = [results[s]['max_guesses'] for s in strategies]
    min_guesses = [results[s]['min_guesses'] for s in strategies]
    
    x = np.arange(len(strategies))
    width = 0.25
    
    fig, ax = plt.subplots(figsize=(10, 6))
    
    ax.bar(x - width, avg_guesses, width, label='Average', alpha=0.8)
    ax.bar(x, max_guesses, width, label='Worst Case', alpha=0.8)
    ax.bar(x + width, min_guesses, width, label='Best Case', alpha=0.8)
    
    ax.set_xlabel('Strategy')
    ax.set_ylabel('Number of Guesses')
    ax.set_title('Strategy Performance Comparison')
    ax.set_xticks(x)
    ax.set_xticklabels(strategies)
    ax.legend()
    ax.grid(True, alpha=0.3)
    
    plt.tight_layout()
    
    if save_path:
        plt.savefig(save_path, dpi=300, bbox_inches='tight')
    else:
        plt.show()


def analyze_guess_distribution(strategy_name: str, num_tests: int = 1000):
    """
    Analyze the distribution of guess counts for a strategy.
    
    Args:
        strategy_name: Name of the strategy to analyze
        num_tests: Number of test games
        
    Returns:
        Dictionary with distribution analysis
    """
    results = analyze_strategy(strategy_name, num_tests)
    distribution = results['guess_distribution']
    
    # Calculate statistics
    guess_counts = []
    frequencies = []
    
    for guesses, frequency in sorted(distribution.items()):
        guess_counts.extend([guesses] * frequency)
        frequencies.append(frequency)
    
    mean = np.mean(guess_counts)
    median = np.median(guess_counts)
    std = np.std(guess_counts)
    
    return {
        'strategy': strategy_name,
        'distribution': distribution,
        'mean': mean,
        'median': median,
        'std': std,
        'percentiles': {
            '25th': np.percentile(guess_counts, 25),
            '75th': np.percentile(guess_counts, 75),
            '90th': np.percentile(guess_counts, 90),
            '95th': np.percentile(guess_counts, 95)
        }
    }


def theoretical_analysis():
    """
    Provide theoretical analysis of the game.
    
    Returns:
        Dictionary with theoretical insights
    """
    total_codes = len(generate_all_codes())
    
    # Information theory analysis
    max_information = np.log2(total_codes)
    
    # Theoretical minimum guesses (information-theoretic lower bound)
    theoretical_min = int(np.ceil(max_information / 4))  # 4 bits max per guess
    
    return {
        'total_possible_codes': total_codes,
        'max_information_bits': max_information,
        'theoretical_minimum_guesses': theoretical_min,
        'analysis': {
            'worst_case_bound': 'No strategy can guarantee solving in fewer than 7 guesses',
            'information_limit': f'Each guess can eliminate at most {2**4-1} possibilities',
            'optimal_first_guess': 'Should maximize information gain across all possibilities'
        }
    }


def strategy_recommendations():
    """
    Provide strategy recommendations based on analysis.
    
    Returns:
        Dictionary with recommendations
    """
    return {
        'for_competitive_play': {
            'recommended': 'minimax',
            'reason': 'Guarantees best worst-case performance',
            'expected_performance': '6-7 guesses maximum'
        },
        'for_average_performance': {
            'recommended': 'entropy',
            'reason': 'Best average-case performance',
            'expected_performance': '4-5 guesses average'
        },
        'for_quick_games': {
            'recommended': 'frequency',
            'reason': 'Good balance of speed and performance',
            'expected_performance': '4-6 guesses average'
        },
        'general_tips': [
            'Start with a guess that uses common digits',
            'Avoid repeating information from previous guesses',
            'Use minimax when you need guaranteed performance',
            'Use entropy-based when you want best average case',
            'Consider the opponent\'s likely strategy when choosing secrets'
        ]
    }


if __name__ == "__main__":
    print("=== Bulls and Cows Advanced Analysis ===")
    
    # Theoretical analysis
    theory = theoretical_analysis()
    print(f"\nTheoretical Analysis:")
    print(f"Total possible codes: {theory['total_possible_codes']}")
    print(f"Maximum information: {theory['max_information_bits']:.2f} bits")
    print(f"Theoretical minimum: {theory['theoretical_minimum_guesses']} guesses")
    
    # Strategy recommendations
    recommendations = strategy_recommendations()
    print(f"\nStrategy Recommendations:")
    for scenario, rec in recommendations.items():
        if isinstance(rec, dict):
            print(f"{scenario.replace('_', ' ').title()}: {rec['recommended']} - {rec['reason']}")
    
    print(f"\nGeneral Tips:")
    for tip in recommendations['general_tips']:
        print(f"• {tip}")
