const API_KEY = "tGy3U4VfP85N98m17nqzN8XCof0zafvCckCLbgWgmy95bGE0Aw97b4lV7UocJvxl"; 

async function autoFetchTeams() {
    const event_key = "2026nysu";
    const url = `https://www.thebluealliance.com/api/v3/event/${event_key}/teams`;
    
    try {
        const response = await fetch(url, {
            headers: { "X-TBA-Auth-Key": API_KEY, "Accept": "application/json" }
        });
        const teams = await response.json();
        teams.sort((a, b) => a.team_number - b.team_number);
        
        // 1. 渲染基礎卡片
        renderCards(teams); 

        // 2. 啟動「區域賽頁面索引器」
        // 直接去 2026nysu 的頁面抓取所有隊伍的正確連結
        scrapeEventPageAndFill(event_key);

    } catch (e) {
        console.error("API 抓取失敗", e);
    }
}

async function scrapeEventPageAndFill(eventKey) {
    const eventUrl = `https://www.thebluealliance.com/event/${eventKey}#teams`;
    
    try {
        // 透過 Proxy 讀取區域賽頁面 (第一張圖的內容)
        const res = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(eventUrl)}`);
        const data = await res.json();
        const doc = new DOMParser().parseFromString(data.contents, "text/html");

        // 找出所有隊伍連結 (假設連結格式包含 /team/ 數字)
        const teamLinks = doc.querySelectorAll('a[href*="/team/"]');

        teamLinks.forEach(async (link) => {
            const href = link.getAttribute('href'); // 例如 /team/7589/2026
            const teamNumber = href.split('/')[2];
            const fullTeamUrl = `https://www.thebluealliance.com${href}`;

            // 拿到正確連結後，立刻進去抓 team-location (第二張圖的內容)
            fetchLocationFromTeamPage(teamNumber, fullTeamUrl);
        });
    } catch (e) {
        console.error("區域賽頁面索引失敗", e);
    }
}

async function fetchLocationFromTeamPage(teamNumber, teamUrl) {
    const targetDiv = document.getElementById(`loc-${teamNumber}`);
    if (!targetDiv) return;

    try {
        const res = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(teamUrl)}`);
        const data = await res.json();
        const doc = new DOMParser().parseFromString(data.contents, "text/html");

        // 【最終目標】根據 ID 索引 href
        const locElement = doc.getElementById('team-location');
        if (locElement) {
            targetDiv.innerText = locElement.getAttribute('href');
        } else {
            targetDiv.innerText = "N/A";
        }
    } catch (e) {
        targetDiv.innerText = "Error";
    }
}

function renderCards(teamsList) {
    const container = document.getElementById('team-container');
    container.innerHTML = teamsList.map(t => `
        <div class="team-card">
            <div class="card-top">
                <div class="team-number"># ${t.team_number}</div>
                <div class="team-name">${t.nickname || "無名稱"}</div>
            </div>
            <div class="card-button">
                <div class="team-city">${t.city || ""}</div>
                <div class="team-state">${t.state_prov || ""}</div>
                <div class="team-location" id="loc-${t.team_number}">尋找連結中...</div>
            </div>
        </div>
    `).join('');
}

window.onload = autoFetchTeams;