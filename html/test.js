const API_KEY = "tGy3U4VfP85N98m17nqzN8XCof0zafvCckCLbgWgmy95bGE0Aw97b4lV7UocJvxl"; 

async function autoFetchTeams() {
    const event_key = "2026nysu";
    const url = `https://www.thebluealliance.com/api/v3/event/${event_key}/teams`;
    
    try {
        const response = await fetch(url, {
            headers: { "X-TBA-Auth-Key": API_KEY, "Accept": "application/json" }
        });
        if (!response.ok) throw new Error(`HTTP 錯誤！${response.status}`);

        const teams = await response.json();
        teams.sort((a, b) => a.team_number - b.team_number);
        
        renderCards(teams); 

        // 【關鍵】畫完卡片後，啟動第二階段：去各隊網站抓 ID="team-location" 的 href
        fetchTeamLocations(teams);

    } catch (e) {
        console.error("抓取失敗:", e);
    }
}

function renderCards(teamsList) {
    const container = document.getElementById('team-container');
    container.innerHTML = teamsList.map(t => {
        const tbaUrl = `https://www.thebluealliance.com/team/${t.team_number}`;
        return `
        <div class="team-card">
            <div class="card-top">
                <div class="team-number"># ${t.team_number}</div>
                <div class="team-name">${t.nickname || "無名稱"}</div>
            </div>
            <div class="card-button">
                <div class="team-city">${t.city || ""}</div>
                <div class="team-state">${t.state_prov || ""}</div>
                <div class="team-location" id="loc-${t.team_number}">掃描中...</div>
            </div>
        </div>
        `;
    }).join('');
}

// 這是你要求的：根據 ID 尋找 href 的函式
async function fetchTeamLocations(teamsList) {
    for (let t of teamsList) {
        const targetDiv = document.getElementById(`loc-${t.team_number}`);
        const tbaUrl = `https://www.thebluealliance.com/team/${t.team_number}`;

        try {
            // 使用 Proxy 避開 CORS 限制（如果是純前端開發）
            const res = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(tbaUrl)}`);
            const data = await res.json();
            const html = data.contents;

            const parser = new DOMParser();
            const doc = parser.parseFromString(html, "text/html");

            // 【索引目標】根據 id="team-location" 尋找標籤並抓 href
            const locationEl = doc.getElementById('team-location');
            
            if (locationEl && locationEl.href) {
                targetDiv.innerText = locationEl.getAttribute('href'); // 顯示純文字網址
            } else {
                targetDiv.innerText = "未找到網址";
            }
        } catch (e) {
            targetDiv.innerText = "掃描失敗";
        }
    }
}

window.onload = autoFetchTeams;