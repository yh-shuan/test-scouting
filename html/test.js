// 第一步：從區域賽網頁出發 (第一張圖的情境)
async function startDeepScrape(eventKey) {
    const eventUrl = `https://www.thebluealliance.com/event/${eventKey}#teams`;
    
    try {
        // 抓取區域賽大表
        const res = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(eventUrl)}`);
        const data = await res.json();
        const doc = new DOMParser().parseFromString(data.contents, "text/html");

        // 索引：找到表裡面所有的隊伍連結 (例如 <a href="/team/7589/2026">)
        const teamLinks = doc.querySelectorAll('table.team-list a[href^="/team/"]');

        teamLinks.forEach(async (link) => {
            // 直接讀取這張圖裡現有的 href
            const teamPath = link.getAttribute('href'); 
            const teamNumber = teamPath.split('/')[2]; // 從路徑拔出隊號，用來定位 UI 上的卡片
            const fullTeamUrl = `https://www.thebluealliance.com${teamPath}`;

            // 既然已經拿到精準連結了，直接鑽進去讀取第二張圖的東西
            fetchLocationValue(teamNumber, fullTeamUrl);
        });
    } catch (e) {
        console.error("區域賽網頁讀取失敗", e);
    }
}

// 第二步：鑽進隊伍網頁讀取 id="team-location"
async function fetchLocationValue(teamNumber, teamUrl) {
    const targetDiv = document.getElementById(`loc-${teamNumber}`);
    if (!targetDiv) return;

    try {
        const res = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(teamUrl)}`);
        const data = await res.json();
        const doc = new DOMParser().parseFromString(data.contents, "text/html");

        // 直接根據 ID 索引那個 href 屬性
        const locationEl = doc.getElementById('team-location');
        if (locationEl) {
            // 抓到你要的網址純文字，直接顯示
            targetDiv.innerText = locationEl.getAttribute('href');
        } else {
            targetDiv.innerText = "N/A";
        }
    } catch (e) {
        targetDiv.innerText = "Error";
    }
}

// 修改後的 autoFetchTeams：API 畫完圖就啟動深度爬取
async function autoFetchTeams() {
    const event_key = "2026nysu";
    // ... API 抓取與 renderCards ...
    const response = await fetch(url, { headers: { "X-TBA-Auth-Key": API_KEY } });
    const teams = await response.json();
    renderCards(teams);

    // 直接執行深度爬取
    startDeepScrape(event_key);
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