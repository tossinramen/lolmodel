import { useState, useEffect, useMemo } from 'react';

// Interfaces for Riot Data Dragon API structure
interface Champion {
  id: string;
  name: string;
  image: { full: string };
  tags: string[];
}

type SlotType = 'bluePick' | 'redPick' | 'blueBan' | 'redBan';

interface ActiveSlot {
  type: SlotType;
  index: number;
}

export default function App() {
  // --- State Management ---
  const [champions, setChampions] = useState<Champion[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<string>('All');
  
  // Selection state: tracks which champion icon is clicked in the grid
  const [selectedChamp, setSelectedChamp] = useState<Champion | null>(null);

  // Draft Slots State
  const [bluePicks, setBluePicks] = useState<(Champion | null)[]>([null, null, null, null, null]);
  const [redPicks, setRedPicks] = useState<(Champion | null)[]>([null, null, null, null, null]);
  const [blueBans, setBlueBans] = useState<(Champion | null)[]>([null, null, null, null, null]);
  const [redBans, setRedBans] = useState<(Champion | null)[]>([null, null, null, null, null]);

  // --- Fetch Champion Data from Riot Data Dragon ---
  useEffect(() => {
    // Fetching patch 14.5.1 data (standard stable version)
    fetch('https://ddragon.leagueoflegends.com/cdn/14.5.1/data/en_US/champion.json')
      .then((res) => res.json())
      .then((data) => {
        const champList = Object.values(data.data) as Champion[];
        // Sort alphabetically
        champList.sort((a, b) => a.name.localeCompare(b.name));
        setChampions(champList);
        setLoading(false);
      })
      .catch((err) => console.error('Error loading champions:', err));
  }, []);

  // --- Dynamic Math Modeling (Win Probability) ---
  // Calculates a mock win probability based on team composition sizes
  const winProbability = useMemo(() => {
    const activeBluePicks = bluePicks.filter(Boolean).length;
    const activeRedPicks = redPicks.filter(Boolean).length;
    
    if (activeBluePicks === 0 && activeRedPicks === 0) return 50;
    
    // Core calculation logic: gives slight balance adjustments based on team sizes
    // Replace this with a real fetch to your FastAPI endpoint once ready
    const baseOffset = (activeBluePicks - activeRedPicks) * 2.5;
    const finalProb = 50 + baseOffset;
    return Math.max(10, Math.min(90, finalProb));
  }, [bluePicks, redPicks]);

  // --- Click & Assign Mechanics ---
  const handleSlotClick = (type: SlotType, index: number) => {
    // If a champion is selected from the grid, place it in the clicked slot
    if (selectedChamp) {
      if (type === 'bluePick') {
        const next = [...bluePicks]; next[index] = selectedChamp; setBluePicks(next);
      } else if (type === 'redPick') {
        const next = [...redPicks]; next[index] = selectedChamp; setRedPicks(next);
      } else if (type === 'blueBan') {
        const next = [...blueBans]; next[index] = selectedChamp; setBlueBans(next);
      } else if (type === 'redBan') {
        const next = [...redBans]; next[index] = selectedChamp; setRedBans(next);
      }
      setSelectedChamp(null); // Clear selection state after placing
    } else {
      // Clear slot if clicked without a selected champion
      if (type === 'bluePick') {
        const next = [...bluePicks]; next[index] = null; setBluePicks(next);
      } else if (type === 'redPick') {
        const next = [...redPicks]; next[index] = null; setRedPicks(next);
      } else if (type === 'blueBan') {
        const next = [...blueBans]; next[index] = null; setBlueBans(next);
      } else if (type === 'redBan') {
        const next = [...redBans]; next[index] = null; setRedBans(next);
      }
    }
  };

  // --- Filtering Logic ---
  const filteredChampions = useMemo(() => {
    return champions.filter((champ) => {
      const matchesSearch = champ.name.toLowerCase().includes(searchQuery.toLowerCase());
      if (selectedRole === 'All') return matchesSearch;
      
      // DataDragon uses archetype tags instead of positional tags
      const tagMap: Record<string, string> = {
        'TOP': 'Fighter',
        'JNG': 'Assassin',
        'MID': 'Mage',
        'ADC': 'Marksman',
        'SUP': 'Support'
      };
      return matchesSearch && champ.tags.includes(tagMap[selectedRole]);
    });
  }, [champions, searchQuery, selectedRole]);

  if (loading) {
    return <div className="h-screen bg-slate-950 text-white flex items-center justify-center">Loading Data Dragon Assets...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col font-sans select-none">
      
      {/* 1. Dynamic Win Probability Bar */}
      <div className="w-full h-12 bg-slate-900 flex relative border-b border-slate-800 text-sm font-bold tracking-wider">
        <div 
          className="bg-blue-600 flex items-center pl-4 transition-all duration-500 ease-out text-blue-100" 
          style={{ width: `${winProbability}%` }}
        >
          BLUE SIDE {winProbability.toFixed(1)}%
        </div>
        <div 
          className="bg-red-600 flex items-center justify-end pr-4 transition-all duration-500 ease-out text-red-100" 
          style={{ width: `${100 - winProbability}%` }}
        >
          {(100 - winProbability).toFixed(1)}% RED SIDE
        </div>
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="bg-slate-950/80 px-4 py-1 rounded border border-slate-700 uppercase text-xs">
            Draft Advantage Model
          </div>
        </div>
      </div>

      {/* 2. Top Banner: Ban Slots */}
      <div className="bg-slate-900/50 p-3 flex justify-between items-center px-8 border-b border-slate-900">
        {/* Blue Bans */}
        <div className="flex gap-2">
          {blueBans.map((champ, idx) => (
            <div 
              key={`blue-ban-${idx}`}
              onClick={() => handleSlotClick('blueBan', idx)}
              className={`w-10 h-10 border bg-slate-950 flex items-center justify-center cursor-pointer overflow-hidden transition-all ${champ ? 'border-blue-500/50 grayscale' : 'border-slate-800 hover:border-blue-500'}`}
            >
              {champ ? (
                <img src={`https://ddragon.leagueoflegends.com/cdn/14.5.1/img/champion/${champ.image.full}`} alt={champ.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-[10px] text-slate-600">BAN</span>
              )}
            </div>
          ))}
        </div>

        <div className="text-xs tracking-widest text-slate-500 uppercase font-bold">Bans</div>

        {/* Red Bans */}
        <div className="flex gap-2">
          {redBans.map((champ, idx) => (
            <div 
              key={`red-ban-${idx}`}
              onClick={() => handleSlotClick('redBan', idx)}
              className={`w-10 h-10 border bg-slate-950 flex items-center justify-center cursor-pointer overflow-hidden transition-all ${champ ? 'border-red-500/50 grayscale' : 'border-slate-800 hover:border-red-500'}`}
            >
              {champ ? (
                <img src={`https://ddragon.leagueoflegends.com/cdn/14.5.1/img/champion/${champ.image.full}`} alt={champ.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-[10px] text-slate-600">BAN</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 3. Main Dashboard Layout */}
      <div className="flex flex-1 p-6 gap-6">
        
        {/* Left Side: Blue Team Picks */}
        <div className="w-64 flex flex-col gap-3">
          <h2 className="text-xs font-bold tracking-widest text-blue-400 uppercase mb-1">Blue Picks</h2>
          {bluePicks.map((champ, idx) => (
            <div 
              key={`blue-pick-${idx}`}
              onClick={() => handleSlotClick('bluePick', idx)}
              className={`h-20 border bg-slate-900/60 rounded flex items-center p-2 gap-3 cursor-pointer transition-all ${champ ? 'border-blue-600/80' : 'border-slate-800 hover:border-blue-500/40'}`}
            >
              <div className="w-14 h-14 bg-slate-950 rounded overflow-hidden flex items-center justify-center border border-slate-800 flex-shrink-0">
                {champ ? (
                  <img src={`https://ddragon.leagueoflegends.com/cdn/14.5.1/img/champion/${champ.image.full}`} alt={champ.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-6 h-6 border-2 border-dashed border-slate-700 rounded-full" />
                )}
              </div>
              <div className="truncate">
                <div className="font-bold text-sm truncate">{champ ? champ.name : 'Empty Slot'}</div>
                <div className="text-[10px] text-slate-500 font-mono">PICK {idx + 1}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Center Canvas: Filtering Engine & Grid System */}
        <div className="flex-1 bg-slate-900/30 rounded border border-slate-900 p-4 flex flex-col gap-4">
          
          {/* Filtering Controls */}
          <div className="flex gap-3 items-center">
            <input 
              type="text" 
              placeholder="Search Champion..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-slate-900 border border-slate-800 rounded px-4 py-2 text-sm focus:outline-none focus:border-slate-600 placeholder-slate-500"
            />
            
            {/* Position Filter Buttons */}
            <div className="flex bg-slate-900 p-1 rounded border border-slate-800 gap-1">
              {['All', 'TOP', 'JNG', 'MID', 'ADC', 'SUP'].map((role) => (
                <button
                  key={role}
                  onClick={() => setSelectedRole(role)}
                  className={`px-3 py-1 text-xs font-bold rounded transition-all ${selectedRole === role ? 'bg-slate-800 text-white border border-slate-700' : 'text-slate-400 hover:text-white'}`}
                >
                  {role === 'All' ? 'ALL' : (
                    <span className="flex items-center gap-1">
                      <img src={`/assets/roles/${role.toLowerCase()}.png`} alt={role} className="w-3 h-3 failover-hidden inline-block" onError={(e)=>{(e.target as HTMLElement).style.display='none'}} />
                      {role}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Champion Selection Matrix */}
          <div className="flex-1 overflow-y-auto pr-1 grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 gap-2 max-h-[520px]">
            {filteredChampions.map((champ) => {
              const isSelected = selectedChamp?.id === champ.id;
              return (
                <div 
                  key={champ.id}
                  onClick={() => setSelectedChamp(isSelected ? null : champ)}
                  className={`aspect-square bg-slate-900 border rounded cursor-pointer overflow-hidden relative group transition-all duration-150 ${isSelected ? 'border-yellow-500 scale-95 ring-2 ring-yellow-500/50' : 'border-slate-800 hover:border-slate-600'}`}
                >
                  <img 
                    src={`https://ddragon.leagueoflegends.com/cdn/14.5.1/img/champion/${champ.image.full}`} 
                    alt={champ.name} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-150"
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-slate-950/90 text-[10px] text-center py-0.5 truncate border-t border-slate-800/40">
                    {champ.name}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Side: Red Team Picks */}
        <div className="w-64 flex flex-col gap-3">
          <h2 className="text-xs font-bold tracking-widest text-red-400 uppercase mb-1 text-right">Red Picks</h2>
          {redPicks.map((champ, idx) => (
            <div 
              key={`red-pick-${idx}`}
              onClick={() => handleSlotClick('redPick', idx)}
              className={`h-20 border bg-slate-900/60 rounded flex items-center justify-between p-2 gap-3 cursor-pointer transition-all ${champ ? 'border-red-600/80' : 'border-slate-800 hover:border-red-500/40'}`}
            >
              <div className="truncate text-right w-full">
                <div className="font-bold text-sm truncate">{champ ? champ.name : 'Empty Slot'}</div>
                <div className="text-[10px] text-slate-500 font-mono">PICK {idx + 1}</div>
              </div>
              <div className="w-14 h-14 bg-slate-950 rounded overflow-hidden flex items-center justify-center border border-slate-800 flex-shrink-0">
                {champ ? (
                  <img src={`https://ddragon.leagueoflegends.com/cdn/14.5.1/img/champion/${champ.image.full}`} alt={champ.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-6 h-6 border-2 border-dashed border-slate-700 rounded-full" />
                )}
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}