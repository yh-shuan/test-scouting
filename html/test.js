// 你的合法 API KEY
const API_KEY = "tGy3U4VfP85N98m17nqzN8XCof0zafvCckCLbgWgmy95bGE0Aw97b4lV7UocJvxl"; 

async function autoFetchTeams() {
    // 【修正點】必須使用 api/v3 且路徑結尾要是 /teams
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

        if (!response.ok) {
            throw new Error(`HTTP 錯誤！狀態碼: ${response.status}`);
        }

        const teams = await response.json();
        
        // 自動排序：按隊號從小到大
        teams.sort((a, b) => a.team_number - b.team_number);
        
        console.log(`抓取成功！共 ${teams.length} 支隊伍`);
        renderCards(teams); 

    } catch (e) {
        console.error("全自動抓取失敗，原因:", e);
        document.getElementById('table-body').innerHTML = `<tr><td colspan="4" style="color:red">抓取失敗: ${e.message}</td></tr>`;
    }
}




function renderCards(teamsList) {
    const container = document.getElementById('team-container');
    
    // Step 1: 先畫出所有卡片（房子）
    container.innerHTML = teamsList.map(t => `
        <div class="team-card">
            <div class="card-top">
                <div class="team-number"># ${t.team_number}</div>
                <div class="team-name">${t.nickname}</div>
            </div>
            <div class="card-button">
                <div class="team-city">${t.city || ""}</div>
                <div class="team-state">${t.state_prov || ""}</div>
                <div id="loc-${t.team_number}" class="team-location">讀取中...</div>
            </div>
        </div>
    `).join('');

    // Step 2: 依循網址抓字串，抓到後覆蓋掉「讀取中...」
    teamsList.forEach(async (t) => {
        const tbaUrl = `https://www.thebluealliance.com/team/${t.team_number}/2026`;
        const addressString = await find(tbaUrl); // 呼叫上面的 find 拿字串
        
        const target = document.getElementById(`loc-${t.team_number}`);
        if (target) {
            target.innerText = addressString; // 單純塞入字串
        }
    });
}

async function find(Web) {
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(Web)}`;
    try {
        const response = await fetch(proxyUrl);
        const data = await response.json(); // 這裡是關鍵：先拿到代理回傳的 JSON
        
        // 解析字串變成 DOM，這樣你才能用 getElementById
        const parser = new DOMParser();
        const doc = parser.parseFromString(data.contents, "text/html");
        
        // 抓取目標 ID 的文字
        const element = doc.getElementById("team-name");
        return element ? element.innerText.trim() : "無地址";
    } catch (error) {
        return "讀取失敗";
    }
}








// Event Listener (事件監聽器): 像是一個警衛，盯著輸入框有沒有人打字
document.getElementById('search-bar').addEventListener('input', (e) => {
    // Value (值): 使用者目前打進去的文字
    const searchText = e.target.value;
    
    // Filter (過濾): 像是篩子，只留下符合條件的隊伍
    const filteredTeams = allTeams.filter(team => {
        // 檢查隊號是否「包含」使用者輸入的數字
        return team.team_number.toString().includes(searchText);
    });
    
    // 把篩選後的結果重新畫出來
    renderCards(filteredTeams);
});

// 網頁載入後立即執行
window.onload = autoFetchTeams;