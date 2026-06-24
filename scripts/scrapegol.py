import asyncio
import os
import re
import random
import pandas as pd
from bs4 import BeautifulSoup
from playwright.async_api import async_playwright

YEAR = 2026


SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__)) if "__file__" in locals() else os.getcwd()
DATA_DIR = os.path.join(os.path.dirname(SCRIPT_DIR), "data")
OUTPUT_PATH = os.path.join(DATA_DIR, "lol_data_2026.csv")

os.makedirs(DATA_DIR, exist_ok=True)


tournament_urls = {
    "LCK_Road_to_MSI": "https://gol.gg/tournament/tournament-matchlist/LCK%202026%20Road%20to%20MSI/",
    "LCS_Spring_Playoffs": "https://gol.gg/tournament/tournament-matchlist/LCS%202026%20Spring%20Playoffs/",
    "LPL_Split_2_Playoffs": "https://gol.gg/tournament/tournament-matchlist/LPL%202026%20Split%202%20Playoffs/",
    "LEC_Spring_Playoffs": "https://gol.gg/tournament/tournament-matchlist/LEC%202026%20Spring%20Playoffs/",
    "LCP_Split_2_Playoffs": "https://gol.gg/tournament/tournament-matchlist/LCP%202026%20Split%202%20Playoffs/",
    "CBLOL_Split_1_Playoffs": "https://gol.gg/tournament/tournament-matchlist/CBLOL%202026%20Split%201%20Playoffs/",
    "NACL_Spring_Playoffs": "https://gol.gg/tournament/tournament-matchlist/NACL%202026%20Spring%20Playoffs/",
    "LFL_Spring_Playoffs": "https://gol.gg/tournament/tournament-matchlist/LFL%202026%20Spring%20Playoffs/",
    "LCK_Rounds_1-2": "https://gol.gg/tournament/tournament-matchlist/LCK%202026%20Rounds%201-2/",
    "LCKCL_Rounds_1-2": "https://gol.gg/tournament/tournament-matchlist/LCK%20CL%202026%20Rounds%201-2/",
    "LCS_Spring": "https://gol.gg/tournament/tournament-matchlist/LCS%202026%20Spring/",
    "LCP_Split_2": "https://gol.gg/tournament/tournament-matchlist/LCP%202026%20Split%202/",
    "NACL_Spring": "https://gol.gg/tournament/tournament-matchlist/NACL%202026%20Spring/",
    "LEC_Spring_Season": "https://gol.gg/tournament/tournament-matchlist/LEC%202026%20Spring%20Season/",
    "CBLOL_Split_1": "https://gol.gg/tournament/tournament-matchlist/CBLOL%202026%20Split%201/",
    "FirstStand_2026": "https://gol.gg/tournament/tournament-matchlist/2026%20First%20Stand/",
    "EMEAMasters_Winter": "https://gol.gg/tournament/tournament-matchlist/EMEA%20Masters%202026%20Winter/",
    "LCKCL_Kickoff": "https://gol.gg/tournament/tournament-matchlist/LCK%20CL%202026%20Kickoff/",
    "LCP_Split_1_Playoffs": "https://gol.gg/tournament/tournament-matchlist/LCP%202026%20Split%201%20Playoffs/",
    "LEC_Versus_Playoffs": "https://gol.gg/tournament/tournament-matchlist/LEC%202026%20Versus%20Playoffs/",
    "LCS_Lock-In": "https://gol.gg/tournament/tournament-matchlist/LCS%202026%20Lock-In/",
    "CBLOL_Cup": "https://gol.gg/tournament/tournament-matchlist/CBLOL%20Cup%202026/",
    "LCK_Cup": "https://gol.gg/tournament/tournament-matchlist/LCK%20Cup%202026/",
    "LEC_Versus_Season": "https://gol.gg/tournament/tournament-matchlist/LEC%202026%20Versus%20Season/",
    "LCP_Split_1": "https://gol.gg/tournament/tournament-matchlist/LCP%202026%20Split%201/",
    "LPL_Split_2": "https://gol.gg/tournament/tournament-matchlist/LPL%202026%20Split%202/",
    "LPL_Split_1_Playoffs": "https://gol.gg/tournament/tournament-matchlist/LPL%202026%20Split%201%20Playoffs/",
    "LPL_Split_1": "https://gol.gg/tournament/tournament-matchlist/LPL%202026%20Split%201/"
}

def parse_header_gold(gold_text):
    clean_gold = gold_text.lower().strip()
    num_part = re.sub(r'[^0-9.]', '', clean_gold)
    if num_part:
        if 'k' in clean_gold:
            return float(num_part) * 1000
        return float(num_part)
    return 0.0

async def get_match_ids(page, url):
    print(f"Finding Match IDs from: {url}")
    try:
        await page.goto(url, wait_until="domcontentloaded", timeout=60000)
        html = await page.content()
        soup = BeautifulSoup(html, 'html.parser')
        
        ids = []
        links = soup.find_all('a', href=lambda x: x and '/game/stats/' in x)
        for link in links:
            parts = link['href'].split('/')
            if 'stats' in parts:
                idx = parts.index('stats')
                match_id = parts[idx+1]
                if match_id.isdigit():
                    ids.append(match_id)
        return list(set(ids))
    except Exception as e:
        print(f"Error fetching match list from {url}: {e}")
        return []

async def scrape_game_details(page, match_id, region):
    game_url = f"https://gol.gg/game/stats/{match_id}/page-game/"
    
    try:
        await page.goto(game_url, wait_until="domcontentloaded", timeout=60000)
        html_content = await page.content()
        soup_game = BeautifulSoup(html_content, 'html.parser')
        
        blue_header = soup_game.find('div', class_='blue-line-header')
        red_header = soup_game.find('div', class_='red-line-header')
        if not blue_header or not red_header: 
            return None 
        
        team_blue = blue_header.find('a').get_text(strip=True)
        team_red = red_header.find('a').get_text(strip=True)
        winner = team_blue if "WIN" in blue_header.get_text() else team_red
        
        gold_imgs = soup_game.find_all('img', alt='Team Gold')
        blue_gold, red_gold = 0.0, 0.0
        if len(gold_imgs) >= 2:
            blue_gold = parse_header_gold(gold_imgs[0].parent.get_text(strip=True))
            red_gold = parse_header_gold(gold_imgs[1].parent.get_text(strip=True))

        kill_imgs = soup_game.find_all('img', alt='Kills')
        blue_kills, red_kills = 0, 0
        if len(kill_imgs) >= 2:
            blue_kills_text = kill_imgs[0].parent.get_text(strip=True)
            red_kills_text = kill_imgs[1].parent.get_text(strip=True)
            blue_kills = int(re.sub(r'[^0-9]', '', blue_kills_text) or 0)
            red_kills = int(re.sub(r'[^0-9]', '', red_kills_text) or 0)

        blue_gold_dist, red_gold_dist = ["0"]*5, ["0"]*5
        blue_dmg_dist, red_dmg_dist = ["0"]*5, ["0"]*5
        
        small_tables = soup_game.find_all('table', class_='small_table')
        if len(small_tables) >= 2:
            gold_rows = small_tables[0].find_all('tr')[1:6] 
            for i, row in enumerate(gold_rows):
                cols = row.find_all('td')
                if len(cols) == 3:
                    blue_gold_dist[i] = cols[1].get_text(strip=True).replace('%', '')
                    red_gold_dist[i] = cols[2].get_text(strip=True).replace('%', '')

            dmg_rows = small_tables[1].find_all('tr')[1:6] 
            for i, row in enumerate(dmg_rows):
                cols = row.find_all('td')
                if len(cols) == 3:
                    blue_dmg_dist[i] = cols[1].get_text(strip=True).replace('%', '')
                    red_dmg_dist[i] = cols[2].get_text(strip=True).replace('%', '')

        player_data = {}
        player_links = soup_game.find_all('a', href=lambda x: x and '../players/player-stats/' in x)
        
        seen_players = []
        for link in player_links:
            name = link.get_text(strip=True)
            if name and name not in seen_players:
                parent_row = link.find_parent('tr')
                tds = parent_row.find_all('td')
                
                champ_img = parent_row.find('img', src=lambda x: x and 'champions_icon' in x)
                champ_name = champ_img.get('alt', 'Unknown') if champ_img else "Unknown"
                
                idx = len(seen_players)
                is_blue = idx < 5
                role_idx = idx if is_blue else idx - 5
                
                if len(tds) >= 2:
                    kda_val = tds[-2].get_text(strip=True)
                    cs_val = tds[-1].get_text(strip=True)
                else:
                    kda_val, cs_val = "0/0/0", "0"

                if '/' in kda_val:
                    k, d, a = kda_val.split('/')
                else:
                    k, d, a = "0", "0", "0"

                gold_share = blue_gold_dist[role_idx] if is_blue else red_gold_dist[role_idx]
                dmg_share = blue_dmg_dist[role_idx] if is_blue else red_dmg_dist[role_idx]
                
                player_data[idx + 1] = {
                    "champ": champ_name,
                    "name": name,
                    "k": k, "d": d, "a": a, "cs": cs_val,
                    "gold_pct": gold_share,
                    "dmg_pct": dmg_share
                }
                
                seen_players.append(name)
            if len(seen_players) == 10: 
                break

        entry = {
            "Game ID": match_id,
            "Year": YEAR,
            "Region": region,
            "Team Blue": team_blue,
            "Team Red": team_red,
            "Winner": winner,
            "Team Blue total gold": blue_gold,
            "Team Red Total gold": red_gold,
            "Team blue total kills": blue_kills,
            "Team red total kills": red_kills
        }
        
        for i in range(1, 11):
            p = player_data.get(i, {"champ": "N/A", "name": "N/A", "k": "0", "d": "0", "a": "0", "cs": "0", "gold_pct": "0", "dmg_pct": "0"})
            entry[f"Champ {i}"] = p["champ"]
            entry[f"Player {i}"] = p["name"]
            entry[f"player {i} k"] = p["k"]
            entry[f"player {i} d"] = p["d"]
            entry[f"player {i} a"] = p["a"]
            entry[f"player {i} cs"] = p["cs"]
            entry[f"player {i} gold%"] = p["gold_pct"]
            entry[f"player {i} dmg%"] = p["dmg_pct"]
            
        return entry
    except Exception as e:
        print(f"Error processing match {match_id}: {e}")
        return None

async def main():
    all_results = []
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
        page = await context.new_page()
        scraped_ids = set()

        for region_key, url in tournament_urls.items():
            
            region_name = region_key.split('_')[0] 
            
            
            base_ids = await get_match_ids(page, url)
            
            
            expanded_ids = []
            for bid in base_ids:
                for i in range(6): 
                    expanded_ids.append(str(int(bid) + i))
            
            unique_ids = sorted(list(set(expanded_ids)))
            
            for mid in unique_ids:
                if mid in scraped_ids: 
                    continue
                
                print(f"Scraping {region_name} | ID: {mid}...")
                data = await scrape_game_details(page, mid, region_name)
                
                if data:
                    all_results.append(data)
                    scraped_ids.add(mid)
                
               
                await asyncio.sleep(random.uniform(4, 7))
        
        await browser.close()
    
    if all_results:
        df = pd.DataFrame(all_results)
        df.to_csv(OUTPUT_PATH, index=False)
        print(f"SUCCESS: {YEAR} Data saved to {OUTPUT_PATH}")
        return df
    else:
        print("No matches were successfully parsed.")
        return pd.DataFrame()

if __name__ == "__main__":
    asyncio.run(main())