from fastapi import FastAPI, UploadFile, File
from fastapi.responses import FileResponse
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import os
from zipfile import ZipFile

app = FastAPI()


TOTAL_INTERVALS = 96  # 48 hours * 2 intervals per hour


def add_time_column(simulation_results, total_intervals=96):
    start_time = datetime.today().replace(hour=0, minute=0, second=0, microsecond=0)
    times = [start_time + timedelta(minutes=30 * i) for i in range(total_intervals)]
    formatted_times = [time.strftime("%H:%M") for time in times]
    simulation_results["TimeOfDay"] = formatted_times
    return simulation_results


def time_to_interval(time_str):
    hour, minute = map(int, time_str.split(":"))
    return (hour * 2) + (minute // 30)


def minimize_peak_demand_charging(simulation_results, routes_df, vehicles_df, charge_management):
    for vehicle_id in vehicles_df["VehicleID"].unique():
        simulation_results[f"ChargeAmount_Vehicle{vehicle_id}_kWh"] = 0.0
        simulation_results[f"ChargingDemand_Vehicle{vehicle_id}_kW"] = 0.0

    for index, route in routes_df.iterrows():
        vehicle_id = route["VehicleID"]
        energy_required = route["EnergyRequired_kWh"]
        max_rate = vehicles_df[vehicles_df["VehicleID"] == vehicle_id]["MaxChargeSpeed_kW"].iloc[0]
        start_interval = route["ReturnInterval"]
        end_interval = route["DepartureInterval"]
        total_intervals = end_interval - start_interval + 1
        if total_intervals <= 0:
            continue
        if charge_management:
            max_possible_charge_speed_per_interval = min(max_rate, (energy_required / (total_intervals * 0.5)))
        else:
            max_possible_charge_speed_per_interval = min(max_rate, energy_required)
        cumulative_energy_assigned = 0.0
        for i in range(start_interval, end_interval + 1):
            if cumulative_energy_assigned >= energy_required:
                break
            remaining_energy_needed = energy_required - cumulative_energy_assigned
            charge_this_interval = min(max_possible_charge_speed_per_interval * 0.5, remaining_energy_needed)
            if i == start_interval:
                simulation_results.at[i, f"ChargeAmount_Vehicle{vehicle_id}_kWh"] += float(charge_this_interval)
            else:
                prev_charge = simulation_results.at[i - 1, f"ChargeAmount_Vehicle{vehicle_id}_kWh"]
                simulation_results.at[i, f"ChargeAmount_Vehicle{vehicle_id}_kWh"] = float(
                    prev_charge + charge_this_interval
                )
            simulation_results.at[i, f"ChargingDemand_Vehicle{vehicle_id}_kW"] = float(
                max_possible_charge_speed_per_interval
            )
            cumulative_energy_assigned += charge_this_interval
    ev_columns = [col for col in simulation_results.columns if "ChargingDemand_Vehicle" in col]
    simulation_results["Total_EV_Demand_kW"] = simulation_results[ev_columns].sum(axis=1)
    simulation_results["Total_Demand_kW"] = simulation_results["BaseLoad_kW"] + simulation_results["Total_EV_Demand_kW"]
    float_columns = [col for col in simulation_results.columns if simulation_results[col].dtype == "float64"]
    for col in float_columns:
        simulation_results[col] = simulation_results[col].round(2)
    return simulation_results


@app.post("/api/simulate")
async def simulate(
    vehicles_file: UploadFile = File(...), routes_file: UploadFile = File(...), base_load_file: UploadFile = File(...)
):
    vehicles_df = pd.read_csv(vehicles_file.file)
    routes_df = pd.read_csv(routes_file.file)
    base_load_df = pd.read_csv(base_load_file.file)

    if len(base_load_df) < TOTAL_INTERVALS:
        base_load_df = pd.concat([base_load_df] * (TOTAL_INTERVALS // len(base_load_df)), ignore_index=True)
    base_load_df = base_load_df.iloc[:TOTAL_INTERVALS].reset_index(drop=True)

    simulation_results = pd.DataFrame(
        {
            "IntervalIndex": np.arange(TOTAL_INTERVALS),
            "BaseLoad_kW": base_load_df["Load_kW"].values,
        }
    )

    for vehicle_id in vehicles_df["VehicleID"].unique():
        simulation_results[f"ChargingDemand_Vehicle{vehicle_id}_kW"] = 0.0
        simulation_results[f"ChargeAmount_Vehicle{vehicle_id}_kWh"] = 0.0

    routes_df["ReturnInterval"] = routes_df["ReturnTime"].apply(time_to_interval)
    routes_df["DepartureInterval"] = routes_df["DepartureTime"].apply(time_to_interval) + 48
    routes_df = routes_df.merge(vehicles_df, on="VehicleID")
    routes_df["EnergyRequired_kWh"] = routes_df["RouteLength_km"] * routes_df["Efficiency_kWh_km"]

    # Save the calculated energy requirements to a CSV file
    energy_requirements_path = "energy_requirements.csv"
    routes_df.to_csv(energy_requirements_path, index=False)

    # Simulation with charge management
    simulation_results_with_management = minimize_peak_demand_charging(
        simulation_results.copy(), routes_df, vehicles_df, charge_management=True
    )
    simulation_results_with_management = add_time_column(simulation_results_with_management)

    cols = ["IntervalIndex", "TimeOfDay"] + [
        col for col in simulation_results_with_management.columns if col not in ["IntervalIndex", "TimeOfDay"]
    ]
    simulation_results_with_management = simulation_results_with_management[cols]

    simulation_results_with_management_path = "simulation_results_with_management.csv"
    simulation_results_with_management.to_csv(simulation_results_with_management_path, index=False)

    # Simulation without charge management
    simulation_results_without_management = minimize_peak_demand_charging(
        simulation_results.copy(), routes_df, vehicles_df, charge_management=False
    )
    simulation_results_without_management = add_time_column(simulation_results_without_management)

    simulation_results_without_management = simulation_results_without_management[cols]

    simulation_results_without_management_path = "simulation_results_without_management.csv"
    simulation_results_without_management.to_csv(simulation_results_without_management_path, index=False)

    # Create a zip file containing all CSV files
    zip_file_path = "simulation_results.zip"
    with ZipFile(zip_file_path, "w") as zipf:
        zipf.write(energy_requirements_path)
        zipf.write(simulation_results_with_management_path)
        zipf.write(simulation_results_without_management_path)

    # Clean up individual CSV files
    os.remove(energy_requirements_path)
    os.remove(simulation_results_with_management_path)
    os.remove(simulation_results_without_management_path)

    return FileResponse(zip_file_path, filename="simulation_results.zip", media_type="application/zip")
