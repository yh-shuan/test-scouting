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
    
    // Map (映射): 掃描清單，一對一轉換成 HTML
    container.innerHTML = teamsList.map(t => {

        const tbaUrl = `https://www.thebluealliance.com/team/${t.team_number}/2026`;
        
        return`

        <div class="team-card">
            <div class="card-top">
                <div class="team-number"># ${t.team_number}</div>
                <div class="team-name">${t.nickname || "無名稱"}</div>
                
            </div>
            <div class="card-button">
                <div class="team-city">${t.city || ""}</div>
                <div class="team-state">${t.state_prov || ""}</div>
                <div class="team-location">${t.address|| "N/A"}</div>
                

                
                
            </div>
            
        </div>
        `;
    }).join('');
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