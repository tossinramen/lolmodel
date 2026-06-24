import asyncio
import random
import os
import re
import pandas as pd
from bs4 import BeautifulSoup
from playwright.async_api import async_playwright

YEAR = 2025


SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(os.path.dirname(SCRIPT_DIR), "data")
OUTPUT_PATH = os.path.join(DATA_DIR, "lol_data_2025.csv")

os.makedirs(DATA_DIR, exist_ok=True)


def parse_header_gold(gold_text):
    clean_gold = gold_text.lower().strip()
    num_part = re.sub(r'[^0-9.]', '', clean_gold)
    if num_part:
        if 'k' in clean_gold:
            return float(num_part) * 1000
        return float(num_part)
    return 0.0

async def scrape_game_details(page, match_id, region):
    game_url = f"https://gol.gg/game/stats/{match_id}/page-game/"
    timeline_url = f"https://gol.gg/game/stats/{match_id}/page-timeline/"
    
    try:
        # --- GAME STATS PAGE ---
        await page.goto(game_url, wait_until="domcontentloaded", timeout=60000)
        soup_game = BeautifulSoup(await page.content(), 'html.parser')
        
        blue_header = soup_game.find('div', class_='blue-line-header')
        red_header = soup_game.find('div', class_='red-line-header')
        if not blue_header or not red_header: 
            return None 
        
        team_blue = blue_header.find('a').get_text(strip=True)
        team_red = red_header.find('a').get_text(strip=True)
        winner = team_blue if "WIN" in blue_header.get_text() else team_red
        
        
        gold_imgs = soup_game.find_all('img', alt='Team Gold')
        blue_gold = 0.0
        red_gold = 0.0
        
        if len(gold_imgs) >= 2:
            blue_gold_text = gold_imgs[0].parent.get_text(strip=True)
            red_gold_text = gold_imgs[1].parent.get_text(strip=True)
            blue_gold = parse_header_gold(blue_gold_text)
            red_gold = parse_header_gold(red_gold_text)

        player_to_info = {}
        player_data = {}
        team_stats = {
            team_blue: {"kills": 0},
            team_red: {"kills": 0}
        }
        
        player_links = soup_game.find_all('a', href=lambda x: x and '../players/player-stats/' in x)
        
        seen_players = []
        for link in player_links:
            name = link.get_text(strip=True)
            if name and name not in seen_players:
                parent_row = link.find_parent('tr')
                tds = parent_row.find_all('td')
                
                champ_img = parent_row.find('img', src=lambda x: x and 'champions_icon' in x)
                champ_name = champ_img.get('alt', 'Unknown') if champ_img else "Unknown"
                
                current_team = team_blue if len(seen_players) < 5 else team_red
                player_to_info[name] = {"team": current_team}
                
                texts = [td.get_text(strip=True) for td in tds]
                try:
                    k, d, a = texts[2], texts[3], texts[4]
                    cs = texts[6] if len(texts) > 6 else "0"
                except IndexError:
                    k, d, a, cs = "0", "0", "0", "0"

                team_stats[current_team]["kills"] += int(k) if k.isdigit() else 0
                
                player_data[len(seen_players) + 1] = {
                    "champ": champ_name,
                    "name": name,
                    "k": k, "d": d, "a": a, "cs": cs
                }
                
                seen_players.append(name)
            if len(seen_players) == 10: 
                break

       
        await page.goto(timeline_url, wait_until="domcontentloaded", timeout=60000)
        soup_time = BeautifulSoup(await page.content(), 'html.parser')
        timeline_table = soup_time.find('table', class_='timeline')
        
        blue_ft5_kills, red_ft5_kills = 0, 0
        ft5_winner = "N/A"
        
        if timeline_table:
            for row in timeline_table.find_all('tr'):
                cols = row.find_all('td')
                if len(cols) < 7: continue
                action_img = cols[4].find('img')
                if action_img and 'kill-icon.png' in action_img.get('src', ''):
                    killer = cols[2].get_text(strip=True)
                    k_info = player_to_info.get(killer, {"team": "Unknown"})
                    if k_info['team'] == team_blue: blue_ft5_kills += 1
                    elif k_info['team'] == team_red: red_ft5_kills += 1
                    
                    if ft5_winner == "N/A":
                        if blue_ft5_kills == 5: ft5_winner = team_blue
                        elif red_ft5_kills == 5: ft5_winner = team_red
                if blue_ft5_kills >= 5 or red_ft5_kills >= 5: break

       
        entry = {
            "Game ID": match_id,
            "Year": YEAR,
            "Region": region,
            "Team Blue": team_blue,
            "Team Red": team_red,
            "Winner": winner,
            "FT5 Winner": ft5_winner,
            "Team Blue total gold": blue_gold,
            "Team Red Total gold": red_gold,
            "Team blue total kills": team_stats[team_blue]["kills"],
            "team red total kills": team_stats[team_red]["kills"]
        }
        
        for i in range(1, 11):
            p = player_data.get(i, {"champ": "N/A", "name": "N/A", "k": "0", "d": "0", "a": "0", "cs": "0"})
            entry[f"Champ {i}"] = p["champ"]
            entry[f"Player {i}"] = p["name"]
            entry[f"player {i} k"] = p["k"]
            entry[f"player {i} d"] = p["d"]
            entry[f"player {i} a"] = p["a"]
            entry[f"player {i} cs"] = p["cs"]
            
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

       
        test_match_id = "63925"
        test_region = "LTA"
        
        print(f"Testing Scraper on {test_region} | ID: {test_match_id}...")
        data = await scrape_game_details(page, test_match_id, test_region)
        
        if data:
            all_results.append(data)
        
        await browser.close()
    
    df = pd.DataFrame(all_results)
    df.to_csv(OUTPUT_PATH, index=False)
    print(f"SUCCESS: Test Data saved to {OUTPUT_PATH}")
    return df

if __name__ == "__main__":
    asyncio.run(main())