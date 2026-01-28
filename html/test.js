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

// ... (之前的 API_KEY 和 autoFetchTeams 不變)

function renderCards(teamsList) {
    const container = document.getElementById('team-container');
    
    container.innerHTML = teamsList.map(t => {
        const tbaTeamUrl = `https://www.thebluealliance.com/team/${t.team_number}`;
        
        return `
        <div class="team-card">
            <div class="card-top">
                <div class="team-number"># ${t.team_number}</div>
                <div class="team-name">${t.nickname || "無名稱"}</div>
            </div>
            <div class="card-button">
                <div class="team-city">${t.city || ""}</div>
                <div class="team-state">${t.state_prov || ""}</div>
                <div class="team-location" id="loc-${t.team_number}" data-source="${tbaTeamUrl}">
                    掃描中...
                </div>
            </div>
        </div>
        `;
    }).join('');

    // 【關鍵】畫完卡片後，啟動掃描索引程序
    teamsList.forEach(t => fetchAndIndexLocation(t.team_number));
}

// 這是你要的「尋找隊伍網站 > 尋找 team-location」的索引邏輯
async function fetchAndIndexLocation(teamNumber) {
    const targetDiv = document.getElementById(`loc-${teamNumber}`);
    const teamUrl = targetDiv.getAttribute('data-source');

    try {
        // 注意：前端直接 fetch TBA 網頁會被 CORS 擋住
        // 這裡假設你後續會處理這部分，或是使用 Proxy 轉接
        const response = await fetch(teamUrl); 
        const html = await response.text();

        // 建立一個臨時容器來解析 HTML
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, "text/html");

        // 【索引核心】：尋找含有 Google Maps 特徵的 <a> 標籤
        const mapLinkElement = doc.querySelector('a[href*="googleusercontent.com/maps.google.com"]');

        if (mapLinkElement) {
            // 拿到網址字串
            const teamLocationUrl = mapLinkElement.getAttribute('href');
            // 填回 div，這就是你要的網址顯示
            targetDiv.innerText = teamLocationUrl;
        } else {
            targetDiv.innerText = "未找到連結";
        }
    } catch (e) {
        // 如果還沒處理 CORS，這裡會報錯，我們先暫時顯示抓到的網址（示意）
        console.warn(`隊伍 ${teamNumber} 掃描失敗 (可能是跨網域限制)`);
        targetDiv.innerText = "待掃描連結"; 
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