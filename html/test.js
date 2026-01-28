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
        renderTable(teams); 

    } catch (e) {
        console.error("全自動抓取失敗，原因:", e);
        document.getElementById('table-body').innerHTML = `<tr><td colspan="4" style="color:red">抓取失敗: ${e.message}</td></tr>`;
    }
}

function renderTable(teams) {
    const tbody = document.getElementById('table-body');
    
    // 如果沒有資料
    if (teams.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4">目前該賽事尚無參賽隊伍資料</td></tr>';
        return;
    }

    // 全自動生成 HTML 字串
    container.innerHTML = teams.map(t => `
    <div class="team-card">
        <div class="card-header">
            <span class="team-number"># ${t.team_number}</span>
            <span class="team-state">${t.state_prov}</span>
            <span class="team-city">${t.city}</span>
            
        </div>
        <div class="team-name">${t.nickname || "無名稱"}</div>
    </div>
`   ).join('');
}

// 網頁載入後立即執行
window.onload = autoFetchTeams;