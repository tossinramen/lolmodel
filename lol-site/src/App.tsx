import { useState, useEffect, useMemo } from 'react';

interface Champion {
  id: string;
  name: string;
  image: { full: string };
  tags: string[];
}

type SlotType = 'bluePick' | 'redPick' | 'blueBan' | 'redBan';

export default function App() {
  const [champions, setChampions] = useState<Champion[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<string>('All');
  const [selectedChamp, setSelectedChamp] = useState<Champion | null>(null);

  const [bluePicks, setBluePicks] = useState<(Champion | null)[]>([null, null, null, null, null]);
  const [redPicks, setRedPicks] = useState<(Champion | null)[]>([null, null, null, null, null]);
  const [blueBans, setBlueBans] = useState<(Champion | null)[]>([null, null, null, null, null]);
  const [redBans, setRedBans] = useState<(Champion | null)[]>([null, null, null, null, null]);

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

  const winProbability = useMemo(() => {
    const activeBluePicks = bluePicks.filter(Boolean).length;
    const activeRedPicks = redPicks.filter(Boolean).length;
    if (activeBluePicks === 0 && activeRedPicks === 0) return 50;
    const baseOffset = (activeBluePicks - activeRedPicks) * 4;
    return Math.max(15, Math.min(85, 50 + baseOffset));
  }, [bluePicks, redPicks]);

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

  if (loading) return <div style={{ height: '100vh', backgroundColor: '#020617', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading Assets...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', backgroundColor: '#0f172a', color: 'white', fontFamily: 'sans-serif', userSelect: 'none', overflow: 'hidden' }}>
      
      {/* 1. Win Probability Bar */}
      <div style={{ width: '100%', height: '40px', backgroundColor: '#0f172a', display: 'flex', position: 'relative', fontSize: '13px', fontWeight: 'bold' }}>
        <div style={{ width: `${winProbability}%`, backgroundColor: '#2563eb', display: 'flex', alignItems: 'center', paddingLeft: '16px', transition: 'width 0.5s ease-out' }}>
          BLUE SIDE {winProbability.toFixed(1)}%
        </div>
        <div style={{ width: `${100 - winProbability}%`, backgroundColor: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: '16px', transition: 'width 0.5s ease-out' }}>
          {(100 - winProbability).toFixed(1)}% RED SIDE
        </div>
      </div>

      {/* 2. Bans Area */}
      <div style={{ backgroundColor: '#020617', padding: '12px 48px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          {blueBans.map((champ, idx) => (
            <div key={`b-ban-${idx}`} onClick={() => handleSlotClick('blueBan', idx)} style={{ width: '42px', height: '42px', backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', overflow: 'hidden', filter: champ ? 'grayscale(100%)' : 'none' }}>
              {champ ? <img src={`https://ddragon.leagueoflegends.com/cdn/14.5.1/img/champion/${champ.image.full}`} style={{ width: '100%', height: '100%' }} /> : <span style={{ fontSize: '10px', color: '#475569' }}>BAN</span>}
            </div>
          ))}
        </div>
        <div style={{ fontSize: '12px', letterSpacing: '2px', color: '#475569', fontWeight: 'bold' }}>BAN HISTORY</div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {redBans.map((champ, idx) => (
            <div key={`r-ban-${idx}`} onClick={() => handleSlotClick('redBan', idx)} style={{ width: '42px', height: '42px', backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', overflow: 'hidden', filter: champ ? 'grayscale(100%)' : 'none' }}>
              {champ ? <img src={`https://ddragon.leagueoflegends.com/cdn/14.5.1/img/champion/${champ.image.full}`} style={{ width: '100%', height: '100%' }} /> : <span style={{ fontSize: '10px', color: '#475569' }}>BAN</span>}
            </div>
          ))}
        </div>
      </div>

      {/* 3. Main Draft Area */}
      <div style={{ display: 'flex', flex: 1, padding: '24px 48px', gap: '48px', overflow: 'hidden' }}>
        
        {/* Blue Picks */}
        <div style={{ width: '260px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h2 style={{ fontSize: '13px', color: '#60a5fa', margin: '0 0 8px 0', textAlign: 'center' }}>BLUE PICKS</h2>
          {bluePicks.map((champ, idx) => (
            <div key={`b-pick-${idx}`} onClick={() => handleSlotClick('bluePick', idx)} style={{ height: '70px', border: '1px solid #1e293b', backgroundColor: '#020617', borderRadius: '6px', display: 'flex', alignItems: 'center', padding: '8px', gap: '16px', cursor: 'pointer' }}>
              <div style={{ width: '52px', height: '52px', backgroundColor: '#0f172a', borderRadius: '4px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {champ ? <img src={`https://ddragon.leagueoflegends.com/cdn/14.5.1/img/champion/${champ.image.full}`} style={{ width: '100%', height: '100%' }} /> : <div style={{ width: '20px', height: '20px', border: '2px dashed #334155', borderRadius: '50%' }} />}
              </div>
              <div>
                <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{champ ? champ.name : 'Empty Slot'}</div>
                <div style={{ fontSize: '10px', color: '#64748b', marginTop: '4px' }}>POSITION {idx + 1}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Champion Select Grid */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: '#020617', borderRadius: '8px', border: '1px solid #1e293b', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px', borderBottom: '1px solid #1e293b' }}>
            <input 
              type="text" 
              placeholder="Search..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ backgroundColor: 'transparent', border: 'none', color: 'white', fontSize: '16px', outline: 'none' }}
            />
            <div style={{ display: 'flex', gap: '16px' }}>
              {['All', 'TOP', 'JNG', 'MID', 'ADC', 'SUP'].map((role) => (
                <span key={role} onClick={() => setSelectedRole(role)} style={{ fontSize: '13px', fontWeight: 'bold', cursor: 'pointer', color: selectedRole === role ? 'white' : '#64748b' }}>
                  {role}
                </span>
              ))}
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(75px, 1fr))', gap: '24px 16px', alignContent: 'start' }}>
            {filteredChampions.map((champ) => {
              const isSelected = selectedChamp?.id === champ.id;
              return (
                <div key={champ.id} onClick={() => setSelectedChamp(isSelected ? null : champ)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', gap: '8px' }}>
                  <div style={{ width: '100%', aspectRatio: '1/1', borderRadius: '8px', overflow: 'hidden', border: isSelected ? '2px solid #eab308' : '2px solid transparent' }}>
                    <img src={`https://ddragon.leagueoflegends.com/cdn/14.5.1/img/champion/${champ.image.full}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                  <div style={{ fontSize: '12px', color: isSelected ? '#eab308' : '#cbd5e1', textAlign: 'center' }}>
                    {champ.name}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Red Picks */}
        <div style={{ width: '260px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h2 style={{ fontSize: '13px', color: '#f87171', margin: '0 0 8px 0', textAlign: 'center' }}>RED PICKS</h2>
          {redPicks.map((champ, idx) => (
            <div key={`r-pick-${idx}`} onClick={() => handleSlotClick('redPick', idx)} style={{ height: '70px', border: '1px solid #1e293b', backgroundColor: '#020617', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px', gap: '16px', cursor: 'pointer' }}>
              <div style={{ textAlign: 'right', width: '100%' }}>
                <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{champ ? champ.name : 'Empty Slot'}</div>
                <div style={{ fontSize: '10px', color: '#64748b', marginTop: '4px' }}>POSITION {idx + 1}</div>
              </div>
              <div style={{ width: '52px', height: '52px', backgroundColor: '#0f172a', borderRadius: '4px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {champ ? <img src={`https://ddragon.leagueoflegends.com/cdn/14.5.1/img/champion/${champ.image.full}`} style={{ width: '100%', height: '100%' }} /> : <div style={{ width: '20px', height: '20px', border: '2px dashed #334155', borderRadius: '50%' }} />}
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}