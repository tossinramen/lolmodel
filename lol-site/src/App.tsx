import { useState, useEffect, useMemo } from 'react';

interface Champion {
  id: string;
  name: string;
  image: { full: string };
  tags: string[];
}

type SlotType = 'bluePick' | 'redPick' | 'blueBan' | 'redBan';

export default function App() {
  // --- State Management ---
  const [champions, setChampions] = useState<Champion[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<string>('All');
  const [selectedChamp, setSelectedChamp] = useState<Champion | null>(null);

  // Draft Slots State
  const [bluePicks, setBluePicks] = useState<(Champion | null)[]>([null, null, null, null, null]);
  const [redPicks, setRedPicks] = useState<(Champion | null)[]>([null, null, null, null, null]);
  const [blueBans, setBlueBans] = useState<(Champion | null)[]>([null, null, null, null, null]);
  const [redBans, setRedBans] = useState<(Champion | null)[]>([null, null, null, null, null]);

  // --- Fetch Champion Data ---
  useEffect(() => {
    fetch('https://ddragon.leagueoflegends.com/cdn/14.5.1/data/en_US/champion.json')
      .then((res) => res.json())
      .then((data) => {
        const champList = Object.values(data.data) as Champion[];
        champList.sort((a, b) => a.name.localeCompare(b.name));
        setChampions(champList);
        setLoading(false);
      })
      .catch((err) => console.error('Error loading champions:', err));
  }, []);

  // --- Win Probability Logic ---
  const winProbability = useMemo(() => {
    const activeBluePicks = bluePicks.filter(Boolean).length;
    const activeRedPicks = redPicks.filter(Boolean).length;
    if (activeBluePicks === 0 && activeRedPicks === 0) return 50;
    const baseOffset = (activeBluePicks - activeRedPicks) * 4;
    return Math.max(15, Math.min(85, 50 + baseOffset));
  }, [bluePicks, redPicks]);

  // --- Slot Clicking Assignment Mechanics ---
  const handleSlotClick = (type: SlotType, index: number) => {
    if (selectedChamp) {
      if (type === 'bluePick') { const n = [...bluePicks]; n[index] = selectedChamp; setBluePicks(n); }
      else if (type === 'redPick') { const n = [...redPicks]; n[index] = selectedChamp; setRedPicks(n); }
      else if (type === 'blueBan') { const n = [...blueBans]; n[index] = selectedChamp; setBlueBans(n); }
      else if (type === 'redBan') { const n = [...redBans]; n[index] = selectedChamp; setRedBans(n); }
      setSelectedChamp(null);
    } else {
      if (type === 'bluePick') { const n = [...bluePicks]; n[index] = null; setBluePicks(n); }
      else if (type === 'redPick') { const n = [...redPicks]; n[index] = null; setRedPicks(n); }
      else if (type === 'blueBan') { const n = [...blueBans]; n[index] = null; setBlueBans(n); }
      else if (type === 'redBan') { const n = [...redBans]; n[index] = null; setRedBans(n); }
    }
  };

  const filteredChampions = useMemo(() => {
    return champions.filter((champ) => {
      const matchesSearch = champ.name.toLowerCase().includes(searchQuery.toLowerCase());
      if (selectedRole === 'All') return matchesSearch;
      const tagMap: Record<string, string> = {
        'TOP': 'Fighter', 'JNG': 'Assassin', 'MID': 'Mage', 'ADC': 'Marksman', 'SUP': 'Support'
      };
      return matchesSearch && champ.tags.includes(tagMap[selectedRole]);
    });
  }, [champions, searchQuery, selectedRole]);

  if (loading) {
    return (
      <div style={{ height: '100vh', backgroundColor: '#020617', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif' }}>
        Loading League Assets...
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#020617', color: 'white', display: 'flex', flexDirection: 'column', fontFamily: 'sans-serif', userSelect: 'none' }}>
      
      {/* 1. Top Win Probability Bar */}
      <div style={{ width: '100%', height: '48px', backgroundColor: '#0f172a', display: 'flex', relative: 'true', position: 'relative', borderBottom: '1px solid #1e293b', fontSize: '14px', fontWeight: 'bold', trackingWider: 'true' }}>
        <div style={{ width: `${winProbability}%`, backgroundColor: '#2563eb', display: 'flex', alignItems: 'center', paddingLeft: '16px', transition: 'width 0.5s ease-out', color: '#dbeafe' }}>
          BLUE SIDE {winProbability.toFixed(1)}%
        </div>
        <div style={{ width: `${100 - winProbability}%`, backgroundColor: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: '16px', transition: 'width 0.5s ease-out', color: '#fee2e2' }}>
          {(100 - winProbability).toFixed(1)}% RED SIDE
        </div>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
          <div style={{ backgroundColor: 'rgba(2, 6, 23, 0.85)', padding: '4px 16px', borderRadius: '4px', border: '1px solid #334155', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>
            Live Draft Matchup Model
          </div>
        </div>
      </div>

      {/* 2. Ban Bar Layout */}
      <div style={{ backgroundColor: 'rgba(15, 23, 42, 0.5)', padding: '12px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #0f172a' }}>
        {/* Blue Side Bans */}
        <div style={{ display: 'flex', gap: '8px' }}>
          {blueBans.map((champ, idx) => (
            <div 
              key={`b-ban-${idx}`} onClick={() => handleSlotClick('blueBan', idx)}
              style={{ width: '40px', height: '40px', border: champ ? '1px solid rgba(37, 99, 235, 0.5)' : '1px solid #1e293b', backgroundColor: '#020617', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', overflow: 'hidden', filter: champ ? 'grayscale(100%)' : 'none' }}
            >
              {champ ? <img src={`https://ddragon.leagueoflegends.com/cdn/14.5.1/img/champion/${champ.image.full}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: '10px', color: '#475569' }}>BAN</span>}
            </div>
          ))}
        </div>

        <div style={{ fontSize: '12px', letterSpacing: '2px', color: '#64748b', textTransform: 'uppercase', fontWeight: 'bold' }}>Ban History</div>

        {/* Red Side Bans */}
        <div style={{ display: 'flex', gap: '8px' }}>
          {redBans.map((champ, idx) => (
            <div 
              key={`r-ban-${idx}`} onClick={() => handleSlotClick('redBan', idx)}
              style={{ width: '40px', height: '40px', border: champ ? '1px solid rgba(220, 38, 38, 0.5)' : '1px solid #1e293b', backgroundColor: '#020617', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', overflow: 'hidden', filter: champ ? 'grayscale(100%)' : 'none' }}
            >
              {champ ? <img src={`https://ddragon.leagueoflegends.com/cdn/14.5.1/img/champion/${champ.image.full}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: '10px', color: '#475569' }}>BAN</span>}
            </div>
          ))}
        </div>
      </div>

      {/* 3. True Horizontal Core Layout */}
      <div style={{ display: 'flex', flex: 1, padding: '24px', gap: '24px', boxSizing: 'border-box' }}>
        
        {/* Left Column: Blue Side Picks */}
        <div style={{ width: '240px', display: 'flex', flexDirection: 'column', gap: '12px', flexShrink: 0 }}>
          <h2 style={{ fontSize: '12px', fontWeight: 'bold', letterSpacing: '2px', color: '#60a5fa', textTransform: 'uppercase', margin: 0 }}>Blue Picks</h2>
          {bluePicks.map((champ, idx) => (
            <div 
              key={`b-pick-${idx}`} onClick={() => handleSlotClick('bluePick', idx)}
              style={{ height: '76px', border: champ ? '2px solid #2563eb' : '1px solid #1e293b', backgroundColor: 'rgba(15, 23, 42, 0.6)', borderRadius: '6px', display: 'flex', alignItems: 'center', padding: '8px', gap: '12px', cursor: 'pointer', boxSizing: 'border-box' }}
            >
              <div style={{ width: '56px', height: '56px', backgroundColor: '#020617', borderRadius: '4px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #1e293b', flexShrink: 0 }}>
                {champ ? <img src={`https://ddragon.leagueoflegends.com/cdn/14.5.1/img/champion/${champ.image.full}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '24px', height: '24px', border: '2px dashed #334155', borderRadius: '50%' }} />}
              </div>
              <div style={{ overflow: 'hidden' }}>
                <div style={{ fontWeight: 'bold', fontSize: '14px', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{champ ? champ.name : 'Empty Slot'}</div>
                <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>POSITION {idx + 1}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Center Column: Search Engine & Grid System */}
        <div style={{ flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.2)', borderRadius: '8px', border: '1px solid #0f172a', padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Controls Bar */}
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <input 
              type="text" 
              placeholder="Search Champion..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ flex: 1, backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '4px', padding: '8px 16px', fontSize: '14px', color: 'white', outline: 'none' }}
            />
            
            {/* Position Roles Select */}
            <div style={{ display: 'flex', backgroundColor: '#0f172a', padding: '4px', borderRadius: '4px', border: '1px solid #1e293b', gap: '4px' }}>
              {['All', 'TOP', 'JNG', 'MID', 'ADC', 'SUP'].map((role) => (
                <button
                  key={role} onClick={() => setSelectedRole(role)}
                  style={{ padding: '4px 12px', fontSize: '12px', fontWeight: 'bold', border: 'none', borderRadius: '4px', cursor: 'pointer', backgroundColor: selectedRole === role ? '#1e293b' : 'transparent', color: selectedRole === role ? 'white' : '#94a3b8' }}
                >
                  {role}
                </button>
              ))}
            </div>
          </div>

          {/* Grid Container */}
          <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(75px, 1fr))', gap: '8px', overflowY: 'auto', maxHeight: '500px', paddingRight: '4px' }}>
            {filteredChampions.map((champ) => {
              const isSelected = selectedChamp?.id === champ.id;
              return (
                <div 
                  key={champ.id} onClick={() => setSelectedChamp(isSelected ? null : champ)}
                  style={{ aspectRatio: '1/1', backgroundColor: '#0f172a', border: isSelected ? '2px solid #eab308' : '1px solid #1e293b', borderRadius: '4px', cursor: 'pointer', overflow: 'hidden', position: 'relative' }}
                >
                  <img src={`https://ddragon.leagueoflegends.com/cdn/14.5.1/img/champion/${champ.image.full}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(2, 6, 23, 0.9)', fontSize: '10px', textAlign: 'center', padding: '2px 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', borderTop: '1px solid #1e293b' }}>
                    {champ.name}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Red Side Picks */}
        <div style={{ width: '240px', display: 'flex', flexDirection: 'column', gap: '12px', flexShrink: 0 }}>
          <h2 style={{ fontSize: '12px', fontWeight: 'bold', letterSpacing: '2px', color: '#f87171', textTransform: 'uppercase', margin: 0, textAlign: 'right' }}>Red Picks</h2>
          {redPicks.map((champ, idx) => (
            <div 
              key={`r-pick-${idx}`} onClick={() => handleSlotClick('redPick', idx)}
              style={{ height: '76px', border: champ ? '2px solid #dc2626' : '1px solid #1e293b', backgroundColor: 'rgba(15, 23, 42, 0.6)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px', gap: '12px', cursor: 'pointer', boxSizing: 'border-box' }}
            >
              <div style={{ overflow: 'hidden', textAlign: 'right', width: '100%' }}>
                <div style={{ fontWeight: 'bold', fontSize: '14px', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{champ ? champ.name : 'Empty Slot'}</div>
                <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>POSITION {idx + 1}</div>
              </div>
              <div style={{ width: '56px', height: '56px', backgroundColor: '#020617', borderRadius: '4px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #1e293b', flexShrink: 0 }}>
                {champ ? <img src={`https://ddragon.leagueoflegends.com/cdn/14.5.1/img/champion/${champ.image.full}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '24px', height: '24px', border: '2px dashed #334155', borderRadius: '50%' }} />}
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}