#!/usr/bin/env python3
"""
0_Gravity Station - Mass Budget Calculator
NASA Space Apps Challenge 2025
Team: 0_Gravity

This script calculates the mass budget for a modular LEO AgriTourism station
based on NASA specifications and SpaceX Falcon 9 launch constraints.

References:
- SpaceX Falcon 9 User's Guide (fairing constraints: 5.2m x 13.1m)
- NASA ISS Systems specifications
- NASA Technical Documents on space agriculture systems
"""

import math
import json
from typing import Dict, List, Tuple

# ============================================================================
# CONSTANTS FROM NASA & SPACEX SPECIFICATIONS
# ============================================================================

# Falcon 9 Constraints (from SpaceX User's Guide)
FALCON9_LEO_CAPACITY_KG = 22800  # Max payload to LEO
FALCON9_FAIRING_DIAMETER_M = 5.2  # Internal diameter
FALCON9_FAIRING_LENGTH_M = 13.1   # Usable length
FALCON9_PAF_1575_MAX_MASS_KG = 10000  # Payload Attach Fitting capacity

# NASA ISS-derived specifications (kg per person per day)
WATER_PER_PERSON_DAY_KG = 3.6  # Drinking + hygiene
FOOD_PER_PERSON_DAY_KG = 1.8
OXYGEN_PER_PERSON_DAY_KG = 0.84
CO2_SCRUBBING_CAPACITY_KG = 1.0

# Power requirements (Watts)
LIFE_SUPPORT_POWER_W = 3500  # Per module
AEROPONIC_SYSTEM_POWER_W = 2000  # Agriculture module
HABITAT_POWER_W = 1500  # Lighting, HVAC, etc.
COMMS_POWER_W = 500

# Solar panel efficiency
SOLAR_PANEL_EFFICIENCY = 0.30  # 30% efficient (ISS grade)
SOLAR_CONSTANT_W_M2 = 1367  # At Earth orbit

# Structure mass fractions (from NASA engineering standards)
STRUCTURE_MASS_FRACTION = 0.25  # 25% of total for structure
THERMAL_CONTROL_FRACTION = 0.08  # 8% for thermal systems
MARGIN_SAFETY_FACTOR = 1.15  # 15% mass margin


# ============================================================================
# MODULE CLASSES
# ============================================================================

class Module:
    """Base class for station modules"""
    
    def __init__(self, name: str, dry_mass_kg: float, 
                 length_m: float, diameter_m: float):
        self.name = name
        self.dry_mass_kg = dry_mass_kg
        self.length_m = length_m
        self.diameter_m = diameter_m
        self.power_requirement_w = 0
        
    def get_volume_m3(self) -> float:
        """Calculate internal volume (cylindrical approximation)"""
        radius_m = self.diameter_m / 2
        return math.pi * radius_m**2 * self.length_m
    
    def check_fairing_fit(self) -> bool:
        """Check if module fits in Falcon 9 fairing"""
        fits_diameter = self.diameter_m <= FALCON9_FAIRING_DIAMETER_M
        fits_length = self.length_m <= FALCON9_FAIRING_LENGTH_M
        return fits_diameter and fits_length
    
    def get_total_mass_with_margin(self) -> float:
        """Return mass including safety margin"""
        return self.dry_mass_kg * MARGIN_SAFETY_FACTOR


class HabitatModule(Module):
    """Tourism habitat module - based on team's detailed calculations"""
    
    def __init__(self, tourists: int, crew: int):
        # Based on Unity Node scaling from team's calculations
        total_persons = tourists + crew
        
        # Mass breakdown from team PDF:
        # Life Support: 6,273 kg
        # Pressure Vessel: 14,500 kg  
        # Interior Fittings: 4,000 kg
        # Windows: 1,000 kg
        # Safety Systems: 1,500 kg
        # Subtotal: 27,373 kg (before 15% margin)
        
        super().__init__(
            name=f"Tourism_Module_{tourists}T{crew}C",
            dry_mass_kg=27373,  # From team's detailed calculations
            length_m=10.0,  # Larger than standard ISS module
            diameter_m=4.5
        )
        self.tourists = tourists
        self.crew = crew
        self.capacity = total_persons
        self.power_requirement_w = HABITAT_POWER_W + (LIFE_SUPPORT_POWER_W)
        
    def calculate_consumables_mass(self, mission_days: int) -> float:
        """Calculate consumables needed for mission duration"""
        water_kg = WATER_PER_PERSON_DAY_KG * self.capacity * mission_days
        food_kg = FOOD_PER_PERSON_DAY_KG * self.capacity * mission_days
        oxygen_kg = OXYGEN_PER_PERSON_DAY_KG * self.capacity * mission_days
        return water_kg + food_kg + oxygen_kg


class AgricultureModule(Module):
    """Aeroponic agriculture research module - based on team's calculations"""
    
    def __init__(self):
        # Based on Destiny Lab scaling from team PDF:
        # Aeroponic Systems: 6,900 kg
        # Pressure Vessel: 12,000 kg
        # Research Equipment: 2,300 kg
        # Subtotal: 21,200 kg (before 15% margin)
        
        super().__init__(
            name="Agriculture_Aeroponic",
            dry_mass_kg=21200,  # From team's detailed calculations
            length_m=8.5,  # Destiny Lab size
            diameter_m=4.3
        )
        self.power_requirement_w = AEROPONIC_SYSTEM_POWER_W + 3000  # LED lighting
        self.growing_area_m2 = 40  # From team's calculations
        
    def calculate_yield_kg_per_day(self) -> float:
        """Estimate crop yield based on NASA research"""
        # From NASA TM-2002-210774: ~20g/m²/day for lettuce
        yield_g_per_m2_day = 20
        return (yield_g_per_m2_day * self.growing_area_m2) / 1000


class ServiceModule(Module):
    """Power, thermal control, and communications - team's power module"""
    
    def __init__(self, total_power_requirement_w: float):
        # Based on team's calculation: 18,000 kg for power module
        super().__init__(
            name="Power_Module",
            dry_mass_kg=15652,  # Calculated to give 18,000 with 15% margin
            length_m=7.0,
            diameter_m=4.5
        )
        self.total_power_w = total_power_requirement_w
        self.solar_panel_area_m2 = self._calculate_solar_array_size()
        
    def _calculate_solar_array_size(self) -> float:
        """Calculate required solar panel area"""
        # Account for orbital eclipse (assume 60% sunlight)
        eclipse_factor = 0.6
        required_power_w = self.total_power_w / eclipse_factor
        
        area_m2 = required_power_w / (SOLAR_CONSTANT_W_M2 * SOLAR_PANEL_EFFICIENCY)
        return area_m2


class PolyhederalHub(Module):
    """3D-expandable hub connector - team's innovation"""
    
    def __init__(self, num_ports: int = 6):
        # Based on team's calculation: 15,000 kg for central hub
        super().__init__(
            name="Central_Hub",
            dry_mass_kg=13043,  # Calculated to give 15,000 with 15% margin
            length_m=4.0,
            diameter_m=4.2
        )
        self.num_ports = num_ports
        self.power_requirement_w = 500  # Docking systems and control


class PropulsionModule(Module):
    """Station-keeping and attitude control"""
    
    def __init__(self):
        # Based on team's calculation: 8,000 kg for propulsion/station-keeping
        super().__init__(
            name="Propulsion_Stationkeeping",
            dry_mass_kg=6956,  # Calculated to give 8,000 with 15% margin
            length_m=3.0,
            diameter_m=3.0
        )
        self.power_requirement_w = 800
        

class AssemblyHardware(Module):
    """Truss structures, connectors, and assembly hardware"""
    
    def __init__(self):
        # Based on team's calculation: 5,000 kg for assembly hardware
        super().__init__(
            name="Assembly_Hardware",
            dry_mass_kg=4348,  # Calculated to give 5,000 with 15% margin
            length_m=0,  # Distributed across station
            diameter_m=0
        )
        self.power_requirement_w = 0


# ============================================================================
# STATION CONFIGURATION
# ============================================================================

class StationConfiguration:
    """Complete 0_Gravity station configuration"""
    
    def __init__(self):
        self.modules: List[Module] = []
        self.mission_duration_days = 7  # Week-long tourism missions
        self.crew_capacity = 6  # 6 tourists
        
    def add_module(self, module: Module):
        """Add a module to the station"""
        self.modules.append(module)
        
    def calculate_total_mass(self) -> Dict[str, float]:
        """Calculate complete mass budget"""
        results = {
            "modules": {},
            "total_dry_mass_kg": 0,
            "total_with_margin_kg": 0,
            "consumables_kg": 0,
            "grand_total_kg": 0
        }
        
        for module in self.modules:
            module_mass = module.get_total_mass_with_margin()
            results["modules"][module.name] = {
                "dry_mass_kg": module.dry_mass_kg,
                "with_margin_kg": module_mass,
                "power_w": module.power_requirement_w,
                "fits_fairing": module.check_fairing_fit()
            }
            results["total_dry_mass_kg"] += module.dry_mass_kg
            results["total_with_margin_kg"] += module_mass
            
            # Add consumables if habitat module
            if isinstance(module, HabitatModule):
                consumables = module.calculate_consumables_mass(
                    self.mission_duration_days
                )
                results["consumables_kg"] += consumables
        
        results["grand_total_kg"] = (results["total_with_margin_kg"] + 
                                     results["consumables_kg"])
        
        return results
    
    def calculate_launch_requirements(self) -> Dict[str, any]:
        """Determine how many Falcon 9 launches needed"""
        mass_budget = self.calculate_total_mass()
        total_mass = mass_budget["grand_total_kg"]
        
        # Calculate launches needed
        modules_per_launch = 3  # Our design: 3 modules per Falcon 9
        total_launches = math.ceil(len(self.modules) / modules_per_launch)
        
        # Check mass constraints
        mass_per_launch = total_mass / total_launches
        within_capacity = mass_per_launch <= FALCON9_LEO_CAPACITY_KG
        
        return {
            "total_station_mass_kg": total_mass,
            "modules_per_launch": modules_per_launch,
            "total_launches_needed": total_launches,
            "mass_per_launch_kg": mass_per_launch,
            "falcon9_capacity_kg": FALCON9_LEO_CAPACITY_KG,
            "within_capacity": within_capacity,
            "mass_margin_percent": ((FALCON9_LEO_CAPACITY_KG - mass_per_launch) / 
                                   FALCON9_LEO_CAPACITY_KG * 100)
        }
    
    def calculate_power_budget(self) -> Dict[str, float]:
        """Calculate total power requirements"""
        total_power_w = sum(m.power_requirement_w for m in self.modules)
        
        # Find service module for solar array size
        service_module = next((m for m in self.modules 
                              if isinstance(m, ServiceModule)), None)
        
        return {
            "total_power_requirement_w": total_power_w,
            "total_power_requirement_kw": total_power_w / 1000,
            "solar_array_area_m2": (service_module.solar_panel_area_m2 
                                   if service_module else 0),
            "battery_capacity_kwh": total_power_w * 0.5 / 1000  # Simplified
        }


# ============================================================================
# MAIN EXECUTION
# ============================================================================

def main():
    """Run mass budget analysis for 0_Gravity station"""
    
    print("=" * 70)
    print("0_GRAVITY STATION - MASS BUDGET CALCULATOR")
    print("NASA Space Apps Challenge 2025")
    print("=" * 70)
    print()
    
    # Create station configuration
    station = StationConfiguration()
    station.crew_capacity = 6  # 6 tourists
    station.total_persons = 10  # 6 tourists + 4 crew
    
    # Add all modules matching team's PDF calculations
    
    # Tourism/Habitat Module
    habitat = HabitatModule(tourists=6, crew=4)
    station.add_module(habitat)
    
    # Agriculture Module  
    agriculture = AgricultureModule()
    station.add_module(agriculture)
    
    # Central Hub (polyhedral connector)
    hub = PolyhederalHub(num_ports=6)
    station.add_module(hub)
    
    # Calculate total power and add power module
    total_power = sum(m.power_requirement_w for m in station.modules)
    service = ServiceModule(total_power_requirement_w=total_power)
    station.add_module(service)
    
    # Propulsion/Station-keeping
    propulsion = PropulsionModule()
    station.add_module(propulsion)
    
    # Assembly Hardware
    assembly = AssemblyHardware()
    station.add_module(assembly)
    
    # ========================================================================
    # RESULTS
    # ========================================================================
    
    print("STATION CONFIGURATION:")
    print(f"  • Tourists: 6")
    print(f"  • Crew: 4")
    print(f"  • Total Persons: 10")
    print(f"  • Mission Duration: {station.mission_duration_days} days")
    print(f"  • Total Modules: {len(station.modules)}")
    print()
    
    # Mass Budget
    print("MASS BUDGET:")
    mass_budget = station.calculate_total_mass()
    for module_name, data in mass_budget["modules"].items():
        print(f"  {module_name}:")
        print(f"    - Dry Mass: {data['dry_mass_kg']:.1f} kg")
        print(f"    - With Margin: {data['with_margin_kg']:.1f} kg")
        print(f"    - Power: {data['power_w']:.0f} W")
        print(f"    - Fits Fairing: {'✓' if data['fits_fairing'] else '✗'}")
    
    print(f"\n  Total Dry Mass: {mass_budget['total_dry_mass_kg']:.1f} kg")
    print(f"  Total with Margin: {mass_budget['total_with_margin_kg']:.1f} kg")
    print(f"  Consumables (7 days): {mass_budget['consumables_kg']:.1f} kg")
    print(f"  GRAND TOTAL: {mass_budget['grand_total_kg']:.1f} kg")
    print()
    
    # Launch Requirements
    print("LAUNCH REQUIREMENTS (Falcon 9):")
    launch_req = station.calculate_launch_requirements()
    print(f"  • Modules per Launch: {launch_req['modules_per_launch']}")
    print(f"  • Total Launches: {launch_req['total_launches_needed']}")
    print(f"  • Mass per Launch: {launch_req['mass_per_launch_kg']:.1f} kg")
    print(f"  • Falcon 9 Capacity: {launch_req['falcon9_capacity_kg']:.1f} kg")
    print(f"  • Within Capacity: {'✓ YES' if launch_req['within_capacity'] else '✗ NO'}")
    print(f"  • Mass Margin: {launch_req['mass_margin_percent']:.1f}%")
    print()
    
    # Power Budget
    print("POWER BUDGET:")
    power_budget = station.calculate_power_budget()
    print(f"  • Total Power Required: {power_budget['total_power_requirement_kw']:.2f} kW")
    print(f"  • Solar Array Size: {power_budget['solar_array_area_m2']:.1f} m²")
    print(f"  • Battery Capacity: {power_budget['battery_capacity_kwh']:.2f} kWh")
    print()
    
    # Agriculture yield
    print("AGRICULTURE PERFORMANCE:")
    agri_module = next(m for m in station.modules if isinstance(m, AgricultureModule))
    daily_yield = agri_module.calculate_yield_kg_per_day()
    print(f"  • Growing Area: {agri_module.growing_area_m2:.1f} m²")
    print(f"  • Daily Crop Yield: {daily_yield:.3f} kg/day")
    print(f"  • Weekly Yield: {daily_yield * 7:.2f} kg")
    print()
    
    # Cost estimate (simplified)
    print("COST ESTIMATE:")
    falcon9_price_per_launch = 67_000_000  # USD
    total_launch_cost = falcon9_price_per_launch * launch_req['total_launches_needed']
    print(f"  • Falcon 9 Price: ${falcon9_price_per_launch:,} per launch")
    print(f"  • Total Launch Cost: ${total_launch_cost:,}")
    print(f"  • Cost per Tourist (6 pax): ${total_launch_cost / 6:,.0f}")
    print()
    
    # Export results as JSON
    results = {
        "configuration": {
            "crew_capacity": station.crew_capacity,
            "mission_duration_days": station.mission_duration_days,
            "modules": len(station.modules)
        },
        "mass_budget": mass_budget,
        "launch_requirements": launch_req,
        "power_budget": power_budget,
        "agriculture": {
            "growing_area_m2": agri_module.growing_area_m2,
            "daily_yield_kg": daily_yield
        }
    }
    
    with open('/home/claude/mass_budget_results.json', 'w') as f:
        json.dump(results, f, indent=2)
    
    print("Results exported to: mass_budget_results.json")
    print("=" * 70)


if __name__ == "__main__":
    main()
