"""
Different strategies for guessing in the Bulls and Cows game.
"""

import random
from collections import defaultdict, Counter
from typing import List, Tuple, Optional
from game import feedback, generate_all_codes


class Strategy:
    """Base class for guessing strategies."""
    
    def __init__(self):
        self.all_codes = generate_all_codes()
        self.reset()
    
    def reset(self):
        """Reset strategy for a new game."""
        self.candidates = self.all_codes.copy()
        self.guess_history = []
    
    def make_guess(self) -> str:
        """Make the next guess. Must be implemented by subclasses."""
        raise NotImplementedError
    
    def update(self, guess: str, feedback_result: Tuple[int, int]):
        """Update strategy with feedback from the last guess."""
        self.guess_history.append((guess, feedback_result))
        self.candidates = [c for c in self.candidates 
                          if feedback(c, guess) == feedback_result]


class RandomStrategy(Strategy):
    """Randomly select from remaining candidates."""
    
    def make_guess(self) -> str:
        return random.choice(self.candidates)


class MinimaxStrategy(Strategy):
    """
    Minimax strategy: minimize the maximum partition size.
    This is the optimal strategy for worst-case performance.
    """
    
    def make_guess(self) -> str:
        if len(self.candidates) == 1:
            return self.candidates[0]
        
        best_guess = None
        best_score = float('inf')
        
        # For efficiency, limit search space when candidates are large
        search_space = (self.candidates if len(self.candidates) <= 200 
                       else self.candidates[:200])
        
        for guess in search_space:
            partitions = defaultdict(int)
            for candidate in self.candidates:
                fb = feedback(candidate, guess)
                partitions[fb] += 1
            
            # Find the worst-case partition size
            worst_case = max(partitions.values()) if partitions else 0
            
            if worst_case < best_score:
                best_score = worst_case
                best_guess = guess
        
        return best_guess or self.candidates[0]


class EntropyStrategy(Strategy):
    """
    Maximize information gain (minimize expected remaining candidates).
    """
    
    def make_guess(self) -> str:
        if len(self.candidates) == 1:
            return self.candidates[0]
        
        best_guess = None
        best_score = float('inf')
        
        # For efficiency, limit search space
        search_space = (self.candidates if len(self.candidates) <= 200 
                       else self.candidates[:200])
        
        for guess in search_space:
            partitions = defaultdict(int)
            for candidate in self.candidates:
                fb = feedback(candidate, guess)
                partitions[fb] += 1
            
            # Calculate expected remaining candidates
            total = len(self.candidates)
            expected_remaining = sum((count * count) / total 
                                   for count in partitions.values())
            
            if expected_remaining < best_score:
                best_score = expected_remaining
                best_guess = guess
        
        return best_guess or self.candidates[0]


class FrequencyStrategy(Strategy):
    """
    Choose guess based on digit frequency in remaining candidates.
    """
    
    def make_guess(self) -> str:
        if len(self.candidates) == 1:
            return self.candidates[0]
        
        # Count digit frequencies by position
        position_freq = [Counter() for _ in range(4)]
        
        for candidate in self.candidates:
            for i, digit in enumerate(candidate):
                position_freq[i][digit] += 1
        
        # Score each candidate based on how well it covers frequent digits
        best_guess = None
        best_score = -1
        
        for candidate in self.candidates:
            score = sum(position_freq[i][digit] 
                       for i, digit in enumerate(candidate))
            
            if score > best_score:
                best_score = score
                best_guess = candidate
        
        return best_guess or self.candidates[0]


def get_strategy(name: str) -> Strategy:
    """Factory function to create strategy instances."""
    strategies = {
        'random': RandomStrategy,
        'minimax': MinimaxStrategy,
        'entropy': EntropyStrategy,
        'frequency': FrequencyStrategy
    }
    
    if name not in strategies:
        raise ValueError(f"Unknown strategy: {name}")
    
    return strategies[name]()
