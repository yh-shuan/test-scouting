// 1. 全域變數定義
let allTeams = []; 
const API_KEY = "tGy3U4VfP85N98m17nqzN8XCof0zafvCckCLbgWgmy95bGE0Aw97b4lV7UocJvxl"; 

// 2. 初始抓取隊伍清單
async function autoFetchTeams() {
    const event_key = "2026nysu";
    const url = `https://www.thebluealliance.com/api/v3/event/${event_key}/teams`;
    
    console.log("正在全自動抓取 2026 NYSU 隊伍名單...");

    try {
        const response = await fetch(url, {
            headers: { 
                "X-TBA-Auth-Key": API_KEY,
                "Accept": "application/json"
            }
        });

        if (!response.ok) throw new Error(`HTTP 錯誤！狀態碼: ${response.status}`);

        allTeams = await response.json();
        
        // 按隊號排序
        allTeams.sort((a, b) => a.team_number - b.team_number);
        
        console.log(`抓取成功！共 ${allTeams.length} 支隊伍`);
        renderCards(allTeams); 

    } catch (e) {
        console.error("抓取失敗:", e);
        const container = document.getElementById('team-container');
        if (container) container.innerHTML = `<p style="color:red">抓取失敗: ${e.message}</p>`;
    }
}

// 3. 渲染卡片框架
function renderCards(teamsList) {
    const container = document.getElementById('team-container');
    if (!container) return;

    // 先畫出空的格子（包含原本的三個子物件）
    container.innerHTML = teamsList.map(t => `
        <div class="team-card">
            <div class="card-top">
                <div class="team-number"># ${t.team_number}</div>
                <div class="team-name">${t.nickname || "無名稱"}</div>
            </div>
            <div class="card-button">
                <div class="team-city">${t.city || ""}</div>
                <div class="team-state">${t.state_prov || ""}</div>
                <div id="loc-${t.team_number}" class="team-location">讀取中...</div>
            </div>
        </div>
    `).join('');

    // 4. 依循網址抓取子物件文字 (加上延遲避免被 Proxy 封鎖)
    teamsList.forEach((t, index) => {
        setTimeout(async () => {
            const tbaUrl = `https://www.thebluealliance.com/team/${t.team_number}/2026`;
            const resultString = await find(tbaUrl); 
            
            const target = document.getElementById(`loc-${t.team_number}`);
            if (target) {
                target.innerText = resultString; 
            }
        }, index * 1000); // 每 0.2 秒發出一個請求，保證穩定度
    });
}

// 5. 依循網址抓取特定的子物件 (team-location)
async function find(Web) {
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(Web)}`;
    try {
        const response = await fetch(proxyUrl);
        if (!response.ok) return "連線超時";

        const data = await response.json();
        
        // 使用 DOMParser 解析 HTML 字串
        const parser = new DOMParser();
        const doc = parser.parseFromString(data.contents, "text/html");
        
        // 抓取你在圖中指定的子物件 ID (team-location)
        const element = doc.getElementById("team-name");
        
        // 只回傳純文字字串
        return element ? element.innerText.trim() : "無地址資訊";
    } catch (error) {
        return "讀取失敗";
    }
}

// 6. 搜尋功能監聽
document.getElementById('search-bar').addEventListener('input', (e) => {
    const searchText = e.target.value.toLowerCase();
    
    // 從全域變數 allTeams 進行過濾
    const filteredTeams = allTeams.filter(team => 
        team.team_number.toString().includes(searchText) || 
        (team.nickname && team.nickname.toLowerCase().includes(searchText))
    );
    
    renderCards(filteredTeams);
});

// 網頁載入後立即執行
window.onload = autoFetchTeams;