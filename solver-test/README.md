# Bulls and Cows Game Strategy Analyzer

A Python project for analyzing optimal strategies for the 4-digit guessing game (Bulls and Cows variant) where:
- **Strikes**: Correct digits in correct positions
- **Balls**: Correct digits in wrong positions

## Features

- Implementation of minimax strategy for optimal guessing
- Performance analysis and comparison of different strategies
- Interactive game simulation
- Statistical analysis of game outcomes

## Usage

```bash
python main.py
```

## Project Structure

- `game.py` - Core game logic and feedback calculation
- `strategies.py` - Different guessing strategies implementation
- `analyzer.py` - Performance analysis tools
- `main.py` - Main application entry point
- `tests/` - Unit tests

## Strategy Analysis

The project implements and compares various strategies:
1. **Minimax Strategy** - Minimizes worst-case scenario
2. **Random Strategy** - Baseline comparison
3. **Frequency-based Strategy** - Uses digit frequency analysis
4. **Entropy-based Strategy** - Maximizes information gain
