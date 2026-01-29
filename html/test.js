// 1. 宣告全域變數 (放在最外面，確保搜尋功能讀得到)
let allTeams = []; 
const API_KEY = "tGy3U4VfP85N98m17nqzN8XCof0zafvCckCLbgWgmy95bGE0Aw97b4lV7UocJvxl"; 

async function autoFetchTeams() {
    const event_key = "2026nysu";
    const url = `https://www.thebluealliance.com/api/v3/event/${event_key}/teams`;
    
    // 先找畫面上的統計文字元素
    const statsElem = document.getElementById('search-stats');
    if (statsElem) statsElem.innerText = "正在從 TBA 抓取數據...";

    try {
        const response = await fetch(url, {
            headers: { 
                "X-TBA-Auth-Key": API_KEY,
                "Accept": "application/json"
            }
        });

        if (!response.ok) throw new Error(`連線失敗: ${response.status}`);

        allTeams = await response.json();
        
        // 按隊號從小到大排序
        allTeams.sort((a, b) => a.team_number - b.team_number);
        
        console.log("數據抓取成功:", allTeams.length, "支隊伍");
        
        // 渲染畫面
        renderCards(allTeams); 

    } catch (e) {
        console.error("抓取失敗:", e);
        const container = document.getElementById('team-container');
        if (container) container.innerHTML = `<div style="color:red; padding:20px;">數據載入失敗，請確認 API KEY 是否正確。</div>`;
    }
}

function renderCards(teamsList) {
    const container = document.getElementById('team-container');
    const statsElem = document.getElementById('search-stats');
    
    if (!container) return;

    if (statsElem) statsElem.innerText = `找到 ${teamsList.length} 支隊伍`;

    if (teamsList.length === 0) {
        container.innerHTML = `<div style="padding:20px; color:gray;">沒有符合條件的隊伍</div>`;
        return;
    }

    // 第一步：渲染時，直接把 onclick 寫在 div 上。網址維持搜尋隊號，保證搜尋結果不動。
    container.innerHTML = teamsList.map(t => `
        <div class="t">
            <div class="team-card">
                <div class="card-top">
                    <div class="team-number"># ${t.team_number}</div>
                    <div class="team-name">${t.nickname || "無名稱"}</div>
                </div>
                <div class="card-button">
                    <div class="team-city">${t.city || ""}</div>
                    <div class="team-state">${t.state_prov || ""}</div>
                    <div id="loc-${t.team_number}" class="team-location" 
                         onclick="window.open('https://www.google.com/search?q=FRC+Team+${t.team_number}', '_blank')">
                        never gonnon give you up...
                    </div>
                </div>
            </div>
        </div>
    `).join('');

    // 第二步：補抓詳細資訊。這裡只換文字（innerText），絕不亂動你的 <a> 標籤或結構。
    teamsList.forEach(async (t) => {
        try {
            const res = await fetch(`https://www.thebluealliance.com/api/v3/team/frc${t.team_number}`, {
                headers: { "X-TBA-Auth-Key": API_KEY, "Accept": "application/json" }
            });
            const detail = await res.json();
            const target = document.getElementById(`loc-${t.team_number}`);
            
            if (target) {
                const schoolName = detail.school_name || detail.address || "無詳細地址資訊";
                
                // 這裡改回 innerText，保證不會有超連結底線或顏色跑掉，也不動到搜尋邏輯
                target.innerText = schoolName;

                // 如果有學校名稱，就把點擊的搜尋目標換成學校，但依然是點背景 div
                if (schoolName !== "無詳細地址資訊") {
                    target.onclick = () => {
                        window.open(`https://www.google.com/search?q=${encodeURIComponent(schoolName)}`, '_blank');
                    };
                }
            }
        } catch (err) {
            console.warn(`隊伍 ${t.team_number} 詳細資料補抓失敗`);
        }
    });
}

// 搜尋條事件監聽器
const searchBar = document.getElementById('search-bar');
if (searchBar) {
    searchBar.addEventListener('input', (e) => {
        const searchText = e.target.value.toLowerCase().trim();
        
        // 從全域變數 allTeams 過濾
        const filteredTeams = allTeams.filter(team => {
            return team.team_number.toString().includes(searchText) || 
                   (team.nickname && team.nickname.toLowerCase().includes(searchText));
        });
        
        renderCards(filteredTeams);
    });
}

function togglePage() {
    const mainPage = document.getElementById('main-page');
    const scorePage = document.getElementById('score-page');
    const btn = document.getElementById('toggle-btn');

    if (!mainPage || !scorePage || !btn) return;

    if (scorePage.style.display === 'none') {
        // --- 進入計分模式 ---
        mainPage.style.display = 'none';    
        scorePage.style.display = 'block';   
        btn.innerText = '×';                
        btn.classList.add('active'); // 加上 active，CSS 就會把它變紅
    } else {
        // --- 回到列表模式 ---
        mainPage.style.display = 'block';   
        scorePage.style.display = 'none';    
        btn.innerText = '+';                
        btn.classList.remove('active'); // 移除 active，它就變回 CSS 原本的紫色 + Hover 效果
    }
}

// 網頁載入後啟動
window.onload = autoFetchTeams;