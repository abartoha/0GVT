# Mass Budget Calculator

## Quick Start

```bash
python3 mass_budget_calculator.py
```

## What This Does

This Python script **validates and programmatically implements** the mass budget calculations from our detailed PDF document (`LEO_AgriTourism_Station_-_Mass_Budget_Calculations.pdf`).

## Results Match Our PDF

The script produces:
- **Total Station Mass: 101,858 kg** (PDF shows 101,859 kg ✓)
- **5 Falcon 9 Launches Required** ✓
- **All module masses match our detailed calculations** ✓

## Module Breakdown

| Module | Mass (kg) | From |
|--------|-----------|------|
| Tourism Module | 31,479 | Unity Node scaling |
| Agriculture Module | 24,380 | Destiny Lab + NASA aeroponics |
| Central Hub | 15,000 | 3D-expandable polyhedral design |
| Power Module | 18,000 | ISS heritage solar arrays |
| Propulsion | 8,000 | Station-keeping systems |
| Assembly Hardware | 5,000 | Truss & connectors |

## Why Python?

While our detailed calculations are in the PDF, this Python implementation:
1. Makes calculations **reproducible and verifiable**
2. Allows **easy parameter changes** (crew size, mission duration, etc.)
3. Validates against **Falcon 9 constraints programmatically**
4. Exports **JSON data** for further analysis
5. Shows our **technical workflow** to judges

## NASA Standards Used

- NASA-STD-3001 (Human Factors)
- ISS ECLSS specifications
- ISS structural heritage (Unity, Destiny)
- SpaceX Falcon 9 User's Guide

## Team 0_Gravity

**NASA Space Apps Challenge 2025**
