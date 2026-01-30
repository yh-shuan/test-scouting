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
    if (!container) return;

    container.innerHTML = teamsList.map(t => {
        // 呼叫計算平均分的函式
        const avgScore = calculateAverage(t.team_number);

        return `
        <div class="t">
            <div class="team-card">
                <div class="card-top">
                    <div class="team-number"># ${t.team_number}</div>
                    <div class="team-name">${t.nickname || "無名稱"}</div>
                </div>
                <div class="card-button">
                    <div class="team-avg-score" style="background-color: #f1c40f; font-weight: bold;">
                        AVG: ${avgScore}
                    </div>
                    <div class="team-state">${t.state_prov || ""}</div>
                    <div class="team-city">${t.city || ""}</div>
                    
                    
                    
                    

                    <div id="loc-${t.team_number}" class="team-location" 
                         onclick="window.open('https://www.google.com/search?q=FRC+Team+${t.team_number}', '_blank')">
                        載入中...
                    </div>
                </div>
                <button onclick="quickSelectTeam('${t.team_number}')" style="width:100%; padding:10px; background:#eee; border:none; cursor:pointer;">+ 快速計分</button>
            </div>
        </div>
        `;
    }).join('');

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

// 新增一個變數來儲存目前選中的隊伍號碼
let currentScoringTeam = "";

function togglePage() {
    const mainPage = document.getElementById('main-page');
    const scorePage = document.getElementById('score-page');
    const btn = document.getElementById('toggle-btn');
    const dropdown = document.getElementById('team-dropdown');

    if (scorePage.style.display === 'none') {
        // --- 進入計分頁面 ---
        mainPage.style.display = 'none';
        scorePage.style.display = 'block';
        btn.innerText = '×';
        btn.classList.add('active');

        // 初始化狀態：顯示選單，隱藏計分內容
        document.getElementById('team-select-zone').style.display = 'block';
        document.getElementById('actual-scoring-content').style.display = 'none';
        
        // 重置數字為 0
        resetScoring();

        // 動態生成下拉選單內容
        dropdown.innerHTML = '<option value="">-- 請選擇隊伍 --</option>';
        allTeams.forEach(t => {
            const opt = document.createElement('option');
            opt.value = t.team_number;
            opt.innerText = `#${t.team_number} - ${t.nickname || "無名稱"}`;
            dropdown.appendChild(opt);
        });
    } else {
        // --- 退出計分頁面 ---
        mainPage.style.display = 'block';
        scorePage.style.display = 'none';
        btn.innerText = '+';
        btn.classList.remove('active');
    }
}

// 修正 resetScoring (確保 ID 對應 HTML)
function resetScoring() {
    if(document.getElementById('auto-fuel')) document.getElementById('auto-fuel').innerText = "0";
    if(document.getElementById('tele-fuel')) document.getElementById('tele-fuel').innerText = "0";
    if(document.getElementById('auto-climb')) document.getElementById('auto-climb').value = "0";
    if(document.getElementById('tele-climb')) document.getElementById('tele-climb').value = "0";
}
// 當使用者按下「確認並開始計分」時
function confirmTeam() {
    const dropdown = document.getElementById('team-dropdown');
    const selectedTeam = dropdown.value;

    if (!selectedTeam) {
        alert("請先選擇一個隊伍！");
        return;
    }

    currentScoringTeam = selectedTeam;
    
    // 更新標題
    document.querySelector('#score-page h2').innerText = `正在為 #${currentScoringTeam} 計分`;

    // 隱藏選單區，顯示計分區
    document.getElementById('team-select-zone').style.display = 'none';
    document.getElementById('actual-scoring-content').style.display = 'block';
}

// 1. 新增一個全域變數來存儲所有隊伍的紀錄
let allScores = {}; // 格式範例: { "7589": [{autoFuel: 5, autoClimb: 1, ...}, {...}] }

// 2. 修改 saveAndExit 函式，讓它真的把數據存起來
function saveAndExit() {
    const data = {
        autoFuel: parseInt(document.getElementById('auto-fuel').innerText),
        autoClimb: parseInt(document.getElementById('auto-climb').value),
        teleFuel: parseInt(document.getElementById('tele-fuel').innerText),
        teleClimb: parseInt(document.getElementById('tele-climb').value)
    };
    
    // 如果該隊伍還沒有紀錄，先建立陣列
    if (!allScores[currentScoringTeam]) {
        allScores[currentScoringTeam] = [];
    }
    
    // 存入紀錄
    allScores[currentScoringTeam].push(data);
    
    console.log(`隊伍 #${currentScoringTeam} 已儲存`, allScores[currentScoringTeam]);
    alert(`隊伍 #${currentScoringTeam} 第 ${allScores[currentScoringTeam].length} 筆紀錄成功！`);
    
    // 儲存後重新渲染主頁面，這樣平均分數才會更新
    renderCards(allTeams); 
    togglePage(); 
}

// 3. 新增一個計算平均分的輔助函式
function calculateAverage(teamNumber) {
    const records = allScores[teamNumber];
    if (!records || records.length === 0) return "N/A";

    let totalScore = 0;
    records.forEach(r => {
        // 燃料：1分/球
        totalScore += r.autoFuel * 1;
        totalScore += r.teleFuel * 1;
        
        // AUTO 吊掛：LV1=15, LV2=20, LV3=30 (假設你沒提到的LV2/3維持原訂)
        if (r.autoClimb === 1) totalScore += 15;
        else if (r.autoClimb === 2) totalScore += 20;
        else if (r.autoClimb === 3) totalScore += 30;

        // TELE 吊掛：LV1=10, LV2=20, LV3=30
        if (r.teleClimb === 1) totalScore += 10;
        else if (r.teleClimb === 2) totalScore += 20;
        else if (r.teleClimb === 3) totalScore += 30;
    });

    return (totalScore / records.length).toFixed(1); // 取小數點後一位
}

function quickSelectTeam(num) {
    const btn = document.getElementById('toggle-btn');
    // 如果目前不在計分頁，就幫使用者點開它
    if (document.getElementById('score-page').style.display === 'none') {
        // 這裡我們不呼叫 togglePage，因為卡片已經知道號碼了，不需要彈窗
        currentScoringTeam = num;
        document.getElementById('main-page').style.display = 'none';
        document.getElementById('score-page').style.display = 'block';
        document.getElementById('score-page').querySelector('h2').innerText = `正在為 #${num} 計分`;
        btn.innerText = '×';
        btn.classList.add('active');
    }
}


// 通用的數字加減函式
function changeVal(id, delta) {
    const elem = document.getElementById(id);
    let current = parseInt(elem.innerText);
    current += delta;
    
    // 防止變成負數
    if (current < 0) current = 0;
    
    elem.innerText = current;
}




// 網頁載入後啟動
window.onload = autoFetchTeams;