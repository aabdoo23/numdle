"""
Core game logic for the 4-digit Numdle game.
"""

from itertools import permutations
from typing import Tuple, List


def generate_all_codes() -> List[str]:
    """Generate all possible 4-digit codes with unique digits."""
    digits = '0123456789'
    return [''.join(p) for p in permutations(digits, 4)]


def feedback(secret: str, guess: str) -> Tuple[int, int]:
    """
    Calculate feedback for a guess against the secret code.
    
    Args:
        secret: The secret 4-digit code
        guess: The guessed 4-digit code
        
    Returns:
        Tuple of (strikes, balls) where:
        - strikes: correct digits in correct positions
        - balls: correct digits in wrong positions
    """
    if len(secret) != 4 or len(guess) != 4:
        raise ValueError("Both secret and guess must be 4 digits")
    
    # Count strikes (correct digit in correct position)
    strikes = sum(1 for i in range(4) if secret[i] == guess[i])
    
    # Count total common digits
    common_digits = len(set(secret) & set(guess))
    
    # Balls = common digits minus strikes
    balls = common_digits - strikes
    
    return (strikes, balls)


def is_valid_code(code: str) -> bool:
    """Check if a code is valid (4 unique digits)."""
    return (len(code) == 4 and 
            code.isdigit() and 
            len(set(code)) == 4)


def filter_candidates(candidates: List[str], guess: str, 
                     feedback_result: Tuple[int, int]) -> List[str]:
    """
    Filter candidates that are consistent with the given feedback.
    
    Args:
        candidates: List of possible codes
        guess: The guess that was made
        feedback_result: The (strikes, balls) feedback received
        
    Returns:
        List of candidates consistent with the feedback
    """
    return [c for c in candidates if feedback(c, guess) == feedback_result]
