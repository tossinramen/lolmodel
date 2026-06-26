import pandas as pd
import os

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__)) if "__file__" in locals() else os.getcwd()
BASE_DIR = os.path.dirname(SCRIPT_DIR) 

UNPROCESSED_DIR = os.path.join(BASE_DIR, "unprocessed_data")
DATA_DIR = os.path.join(BASE_DIR, "data")

YEARS = ["2023", "2024", "2025", "2026"]

COLUMNS_TO_KEEP = [
    "gameid", "league", "year", "split", "patch", "participantid", "side", "position", 
    "playername", "teamname", "champion", "pick1", "pick2", "pick3", "pick4", "pick5", 
    "gamelength", "result", "kills", "deaths", "assists", "teamkills", "teamdeaths", 
    "team kpm", "ckpm", "firstdragon", "dragons", "elders", "firstherald", 
    "heralds", "firstbaron", "barons", "inhibitors", "damagetochampions", "dpm", 
    "damageshare", "totalgold", "earnedgold", "earned gpm", "earnedgoldshare", 
    "goldspent", "gspd", "gpr", "total cs", "minionkills", "cspm", 
    "goldat10", "xpat10", "csat10", "golddiffat10", "xpdiffat10", "csdiffat10", 
    "killsat10", "assistsat10", "deathsat10", 
    "goldat15", "xpat15", "csat15", "golddiffat15", "xpdiffat15", "csdiffat15", 
    "killsat15", "assistsat15", "deathsat15", 
    "goldat20", "xpat20", "csat20", "golddiffat20", "xpdiffat20", "csdiffat20", 
    "killsat20", "assistsat20", "deathsat20", 
    "goldat25", "xpat25", "csat25", "golddiffat25", "xpdiffat25", "csdiffat25", 
    "killsat25", "assistsat25", "deathsat25"
]

def clean_and_flatten():
    
    if not os.path.exists(DATA_DIR):
        os.makedirs(DATA_DIR)

    for year in YEARS:
        filename = f"lol_data_{year}_unprocessed.csv"
        input_path = os.path.join(UNPROCESSED_DIR, filename)
        output_filename = f"lol_data_{year}_cleaned.csv"
        output_path = os.path.join(DATA_DIR, output_filename)

        if not os.path.exists(input_path):
            print(f"Skipping {filename}: File not found in unprocessed_data.")
            continue   
        
        print(f"Loading {filename}...")
        df = pd.read_csv(input_path, low_memory=False)
        
        cols = [c for c in COLUMNS_TO_KEEP if c in df.columns]
        df = df[cols]

        game_meta_cols = ["gameid", "league", "year", "split", "patch", "gamelength"]
        valid_meta_cols = [c for c in game_meta_cols if c in df.columns]
        game_metadata = df[df["participantid"] == 100][valid_meta_cols].drop_duplicates(subset=["gameid"])

        players_df = df[df["participantid"].isin(range(1, 11))].copy()

        opp_cols = [c for c in players_df.columns if str(c).startswith("opp_")]
        meta_cols_to_drop = [c for c in valid_meta_cols if c != "gameid"]
        players_df = players_df.drop(columns=opp_cols + meta_cols_to_drop, errors='ignore')

        player_pivot = players_df.pivot(index="gameid", columns="participantid")

        
        player_pivot = player_pivot.swaplevel(axis=1).sort_index(axis=1)
        
       
        player_pivot.columns = [f"player{col[0]}_{col[1]}" for col in player_pivot.columns]
        player_pivot = player_pivot.reset_index()

        final_df = pd.merge(game_metadata, player_pivot, on="gameid", how="left")

        final_df = final_df.dropna(axis=1, how="all")

        
        final_df = final_df.convert_dtypes()

        final_df.to_csv(output_path, index=False)
        print(f"Success! Cleaned and flattened data saved to {output_path}\n")

if __name__ == "__main__":
    clean_and_flatten()