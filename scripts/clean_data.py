import pandas as pd
import os


SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__)) if "__file__" in locals() else os.getcwd()
DATA_DIR = os.path.join(os.path.dirname(SCRIPT_DIR), "data")


FILES_TO_CLEAN = [
    "lol_data_2023_unprocessed.csv",
    "lol_data_2024_unprocessed.csv",
    "lol_data_2025_unprocessed.csv",
    "lol_data_2026.csv"
]


COLUMNS_TO_DROP = [
    "gameid", "datacompleteness", "url", "playoffs", "date", "game", 
    "participantid", "playerid", "teamid", "firstpick", "champion", 
    "ban1", "ban2", "ban3", "ban4", "ban5", "doublekills", 
    "triplekills", "quadrakills", "pentakills", "firstbloodassist", 
    "firstbloodvictim", "monsterkills", "monsterkillsownjungle", 
    "monsterkillsenemyjungle"
]

def clean_datasets():
    for filename in FILES_TO_CLEAN:
        input_path = os.path.join(DATA_DIR, filename)
        output_filename = filename.replace("_unprocessed", "_cleaned")
        if output_filename == filename: 
             output_filename = filename.replace(".csv", "_cleaned.csv")
        output_path = os.path.join(DATA_DIR, output_filename)
        if not os.path.exists(input_path):
            print(f"Skipping {filename}: File not found.")
            continue   
        print(f"Loading {filename}...")
        df = pd.read_csv(input_path, low_memory=False)
        df = df.drop(columns=COLUMNS_TO_DROP, errors='ignore')
        df.to_csv(output_path, index=False)
        print(f"Success! Cleaned data saved to {output_filename}\n")

if __name__ == "__main__":
    clean_datasets()