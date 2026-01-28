// 1. 全域變數定義，讓搜尋功能找得到資料
let allTeams = []; 
const API_KEY = "tGy3U4VfP85N98m17nqzN8XCof0zafvCckCLbgWgmy95bGE0Aw97b4lV7UocJvxl"; 

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

        if (!response.ok) {
            throw new Error(`HTTP 錯誤！狀態碼: ${response.status}`);
        }

        allTeams = await response.json();
        
        // 自動排序：按隊號從小到大
        allTeams.sort((a, b) => a.team_number - b.team_number);
        
        console.log(`抓取成功！共 ${allTeams.length} 支隊伍`);
        renderCards(allTeams); 

    } catch (e) {
        console.error("全自動抓取失敗，原因:", e);
        const container = document.getElementById('team-container');
        if (container) container.innerHTML = `<p style="color:red">抓取失敗: ${e.message}</p>`;
    }
}

function renderCards(teamsList) {
    const container = document.getElementById('team-container');
    
    // Step 1: 先畫出所有卡片（包含所有子物件）
    container.innerHTML = teamsList.map(t => {
        // 初始狀態：如果 API 沒給 school_name，就先放個「查詢中」或用 address 墊著
        const initialLoc = t.school_name || t.address || "查詢中...";
        
        return `
        <div class="team-card">
            <div class="card-top">
                <div class="team-number"># ${t.team_number}</div>
                <div class="team-name">${t.nickname || "無名稱"}</div>
            </div>
            <div class="card-button">
                <div class="team-city">${t.city || ""}</div>
                <div class="team-state">${t.state_prov || ""}</div>
                <div id="loc-${t.team_number}" class="team-location">${initialLoc}</div>
            </div>
        </div>
        `;
    }).join('');

    // Step 2: 針對沒有校名的隊伍，依循單隊 API 補齊資料（效率最高的方法）
    teamsList.forEach(async (t) => {
        // 如果原本 API 就沒給校名，才去補抓
        if (!t.school_name) {
            const teamKey = `frc${t.team_number}`;
            const detailUrl = `https://www.thebluealliance.com/api/v3/team/${teamKey}`;
            
            try {
                const res = await fetch(detailUrl, {
                    headers: { "X-TBA-Auth-Key": API_KEY, "Accept": "application/json" }
                });
                const detail = await res.json();
                
                const target = document.getElementById(`loc-${t.team_number}`);
                if (target) {
                    // 更新為最詳細的校名或地址
                    target.innerText = detail.school_name || detail.address || "無詳細地址";
                }
            } catch (err) {
                console.error(`補抓隊伍 ${t.team_number} 失敗`);
            }
        }
    });
}

// 搜尋功能監聽
document.getElementById('search-bar').addEventListener('input', (e) => {
    const searchText = e.target.value.toLowerCase();
    
    // 從全域變數 allTeams 進行過濾
    const filteredTeams = allTeams.filter(team => {
        return team.team_number.toString().includes(searchText) || 
               (team.nickname && team.nickname.toLowerCase().includes(searchText));
    });
    
    renderCards(filteredTeams);
});

// 網頁載入後立即執行
window.onload = autoFetchTeams;