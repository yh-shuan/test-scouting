const API_KEY = "tGy3U4VfP85N98m17nqzN8XCof0zafvCckCLbgWgmy95bGE0Aw97b4lV7UocJvxl"; 
let allTeams = []; // 用來存儲所有隊伍，方便搜尋功能使用

async function autoFetchTeams() {
    const event_key = "2026nysu";
    const url = `https://www.thebluealliance.com/api/v3/event/${event_key}/teams`;
    
    try {
        const response = await fetch(url, {
            headers: { "X-TBA-Auth-Key": API_KEY, "Accept": "application/json" }
        });
        if (!response.ok) throw new Error(`HTTP 錯誤！${response.status}`);

        allTeams = await response.json();
        allTeams.sort((a, b) => a.team_number - b.team_number);
        
        // 1. 先畫出所有隊伍的卡片框架
        renderCards(allTeams); 

        // 2. 畫完之後，立刻召喚掃描器去爬每個隊伍網站的 href
        allTeams.forEach(t => fetchAndFillLocation(t.team_number));

    } catch (e) {
        console.error("抓取失敗:", e);
    }
}

// 這是你要求的「索引器」：循網址去找 id="team-location" 的 href
async function fetchAndFillLocation(teamNumber) {
    const targetDiv = document.getElementById(`loc-${teamNumber}`);
    const tbaUrl = `https://www.thebluealliance.com/team/${teamNumber}`;

    try {
        // 使用 allorigins 代理伺服器繞過 CORS 限制，否則瀏覽器會阻止你爬 TBA 網頁
        const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(tbaUrl)}`;
        const response = await fetch(proxyUrl);
        const data = await response.json();
        const htmlString = data.contents;

        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlString, "text/html");

        // 根據 ID 尋找標籤並拿走 href
        const element = doc.getElementById('team-location');
        
        if (element) {
            // 成功抓到！把 href 網址字串直接塞進去
            targetDiv.innerText = element.getAttribute('href'); 
        } else {
            targetDiv.innerText = "No Location ID";
        }
    } catch (e) {
        targetDiv.innerText = "Scan Fail";
    }
}

function renderCards(teamsList) {
    const container = document.getElementById('team-container');
    
    container.innerHTML = teamsList.map(t => {
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

// 搜尋功能的事件監聽
document.getElementById('search-bar').addEventListener('input', (e) => {
    const searchText = e.target.value;
    const filteredTeams = allTeams.filter(team => 
        team.team_number.toString().includes(searchText)
    );
    renderCards(filteredTeams);
    // 搜尋後也要重新觸發掃描
    filteredTeams.forEach(t => fetchAndFillLocation(t.team_number));
});

window.onload = autoFetchTeams;