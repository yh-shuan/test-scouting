let allTeams = []; 
const API_KEY = "tGy3U4VfP85N98m17nqzN8XCof0zafvCckCLbgWgmy95bGE0Aw97b4lV7UocJvxl"; 

async function autoFetchTeams() {
    const event_key = "2026nysu";
    const url = `https://www.thebluealliance.com/api/v3/event/${event_key}/teams`;
    const statsElem = document.getElementById('search-stats');
    
    try {
        const response = await fetch(url, {
            headers: { "X-TBA-Auth-Key": API_KEY, "Accept": "application/json" }
        });
        allTeams = await response.json();
        allTeams.sort((a, b) => a.team_number - b.team_number);
        
        statsElem.innerText = `找到 ${allTeams.length} 支隊伍`;
        renderCards(allTeams); 

    } catch (e) {
        statsElem.innerText = "連線失敗，請檢查網路或 API KEY";
    }
}

function renderCards(teamsList) {
    const container = document.getElementById('team-container');
    const statsElem = document.getElementById('search-stats');
    
    if (teamsList.length === 0) {
        container.innerHTML = `<div class="no-result">查無此隊伍，請嘗試其他關鍵字</div>`;
        statsElem.innerText = `找到 0 支隊伍`;
        return;
    }

    container.innerHTML = teamsList.map(t => {
        const initialLoc = t.school_name || t.address || "查詢詳細資訊中...";
        return `
        <div class="team-card">
            <div class="card-top">
                <div class="team-number"># ${t.team_number}</div>
                <div class="team-name">${t.nickname || "無名稱"}</div>
            </div>
            <div class="card-button">
                <div class="team-city">📍 ${t.city || ""}</div>
                <div class="team-state">${t.state_prov || ""}</div>
                <div id="loc-${t.team_number}" class="team-location">${initialLoc}</div>
            </div>
        </div>
        `;
    }).join('');

    // 更新統計文字
    statsElem.innerText = `顯示中: ${teamsList.length} 支隊伍`;

    // 異步補抓詳細校名
    teamsList.forEach(async (t) => {
        if (!t.school_name) {
            try {
                const res = await fetch(`https://www.thebluealliance.com/api/v3/team/frc${t.team_number}`, {
                    headers: { "X-TBA-Auth-Key": API_KEY, "Accept": "application/json" }
                });
                const detail = await res.json();
                const target = document.getElementById(`loc-${t.team_number}`);
                if (target) {
                    target.innerText = detail.school_name || detail.address || "無詳細地址";
                }
            } catch (err) { /* 靜默失敗 */ }
        }
    });
}

// 搜尋監聽：支援隊號與隊名關鍵字
document.getElementById('search-bar').addEventListener('input', (e) => {
    const searchText = e.target.value.toLowerCase().trim();
    
    const filteredTeams = allTeams.filter(team => {
        const numMatch = team.team_number.toString().includes(searchText);
        const nameMatch = team.nickname && team.nickname.toLowerCase().includes(searchText);
        return numMatch || nameMatch;
    });
    
    renderCards(filteredTeams);
});

window.onload = autoFetchTeams;