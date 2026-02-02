// --- PWA Service Worker 註冊 ---
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        // 這裡的 'sw.js' 檔名必須和你根目錄下的檔案完全一致
        navigator.serviceWorker.register('sw.js')
            .then(registration => {
                console.log('✅ PWA 註冊成功！範圍:', registration.scope);
            })
            .catch(err => {
                console.log('❌ PWA 註冊失敗:', err);
            });
    });
}
// --- 註冊結束，以下接著你原本的程式碼 ---



// 1. 宣告全域變數
let allTeams = []; 
let allScoresRaw = []; // 改為儲存雲端抓下來的原始資料陣列 (Flat Array)
const API_KEY = "tGy3U4VfP85N98m17nqzN8XCof0zafvCckCLbgWgmy95bGE0Aw97b4lV7UocJvxl"; 

// --- ⚠️ 重要：請填入 Apps Script 部署後的 Web App URL (結尾通常是 /exec) ---
const GOOGLE_SHEET_URL = "https://script.google.com/macros/s/AKfycbyE6Sp6r8VZle5PITtIvZmtb2uI2k6py501ptmb-PUr7lhrA5W13SHdgonvRD-5m7BH/exec"; 

// --- 新增：從雲端同步數據 ---
async function syncFromCloud() {
    const statsElem = document.getElementById('search-stats');
    if (statsElem) statsElem.innerText = "正在同步雲端數據...";

    try {
        const response = await fetch(GOOGLE_SHEET_URL);
        // 假設 Apps Script 回傳的是物件陣列 [ {id, teamNumber, autoFuel...}, ... ]
        allScoresRaw = await response.json();
        console.log("雲端數據同步成功:", allScoresRaw.length, "筆紀錄");
        
        if (statsElem) statsElem.innerText = `同步完成 (共 ${allScoresRaw.length} 筆)`;
        
        // 數據回來後，重新渲染卡片以更新平均分
        renderCards(allTeams); 

    } catch (e) {
        console.error("雲端同步失敗:", e);
        if (statsElem) statsElem.innerText = "雲端同步失敗，請檢查網路。";
    }
}

async function autoFetchTeams() {
    const event_key = "2026nysu";
    const url = `https://www.thebluealliance.com/api/v3/event/${event_key}/teams`;
    
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
        
        console.log("TBA 數據抓取成功:", allTeams.length, "支隊伍");
        
        // 先渲染一次卡片 (此時還沒有分數)
        renderCards(allTeams); 
        
        // --- 關鍵修改：TBA 抓完後，立刻抓雲端分數 ---
        await syncFromCloud();

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
        // 呼叫計算平均分的函式 (現在是即時計算)
        const avgScore = calculateAverage(t.team_number);

        return `
        <div class="t">
            <div class="team-card" onclick="showDetail('${t.team_number}')">
                <div class="card-top">
                    <div class="team-number"># ${t.team_number}</div>
                    <div class="team-name">${t.nickname || "無名稱"}</div>
                </div>
                <div class="card-button">
                    <div class="team-avg-score" style="background-color: #f1c40f; font-weight: bold; border-radius: 5px; padding: 5px; text-align: center;">
                        AVG: ${avgScore}
                    </div>
                    <div class="team-state">${t.state_prov || ""}</div>
                    <div class="team-city">${t.city || ""}</div>

                    <div id="loc-${t.team_number}" class="team-location">
                        never gonnon give you up...
                    </div>
                </div>
                <button onclick="event.stopPropagation(); quickSelectTeam('${t.team_number}')" 
                style="width:100%; 
                padding:10px; 
                background:#eee; 
                border:none; 
                border-top: 1px solid #ccc; 
                cursor:pointer; 
                font-weight: bold;">+ 快速計分
                </button>
            </div>
        </div>
        `;
    }).join('');

    // (保留原本的地址抓取邏輯，這裡省略不重複貼上，請保留你的 fetch detail 代碼)
    fetchAddresses(teamsList); 
}

// 輔助函式：為了版面整潔把 fetch address 抽出來 (實際上你可以直接用你原本的寫法)
function fetchAddresses(teamsList) {
    teamsList.forEach(async (t) => {
        try {
            const res = await fetch(`https://www.thebluealliance.com/api/v3/team/frc${t.team_number}`, {
                headers: { "X-TBA-Auth-Key": API_KEY, "Accept": "application/json" }
            });
            const detail = await res.json();
            const target = document.getElementById(`loc-${t.team_number}`);
            
            if (target) {
                const schoolName = detail.school_name || detail.address || "無詳細地址資訊";
                target.innerText = schoolName;
                target.onclick = (e) => {
                      e.stopPropagation(); // 防止冒泡
                      if (schoolName !== "無詳細地址資訊") {
                        window.open(`https://www.google.com/search?q=${encodeURIComponent(schoolName)}`, '_blank');
                      }
                };
            }
        } catch (err) {
            console.warn(`隊伍 ${t.team_number} 詳細資料補抓失敗`);
        }
    });
}

// --- 新功能：顯示隊伍詳細資料 ---
function showDetail(teamNumber) {
    const overlay = document.getElementById('detail-overlay');
    const list = document.getElementById('detail-list');
    const title = document.getElementById('detail-title');
    
    // 從 allScoresRaw 過濾出該隊伍的紀錄
    const records = allScoresRaw.filter(r => r.teamNumber == teamNumber);

    const statsElem = document.getElementById('search-stats');
    if (statsElem) {
        statsElem.innerText = `同步完成 (共 ${allScoresRaw.length} 筆)`;
        // 選擇性：加個紅色閃爍代表刪除成功
        statsElem.style.color = "#e74c3c"; 
        setTimeout(() => { statsElem.style.color = ""; }, 1500);
    }

    
    title.innerText = `隊伍 #${teamNumber} (${records.length} 筆資料)`;
    list.innerHTML = ""; // 清空舊內容

    if (records.length === 0) {
        list.innerHTML = "<p style='text-align:center; color:#666;'>目前沒有雲端紀錄</p>";
    } else {
        records.forEach((r, idx) => {
            const div = document.createElement('div');
            div.className = "record-item";
            // 簡單計算該筆總分
            const total = (parseInt(r.autoFuel)||0) + (parseInt(r.teleFuel)||0) + getClimbScore(r.autoClimb, true) + getClimbScore(r.teleClimb, false);
            
            div.innerHTML = `
                <strong>紀錄 #${idx + 1}</strong> <span style="color:#888; font-size:12px;">(ID: ${r.id})</span><br>
                總分預估: ${total}<br>
                Auto Fuel: ${r.autoFuel} | Tele Fuel: ${r.teleFuel}<br>
                Auto Climb: L${r.autoClimb} | Tele Climb: L${r.teleClimb}
                <button class="delete-btn-small" onclick="deleteCloudData('${r.id}', '${teamNumber}')">刪除</button>
            `;
            list.appendChild(div);
        });
    }
    
    overlay.style.display = 'flex';
}

function closeDetail() {
    document.getElementById('detail-overlay').style.display = 'none';
}

// --- 新功能：刪除雲端資料 ---
async function deleteCloudData(id, teamNumber) {
    if (!confirm("確定要從雲端刪除這筆資料嗎？此操作無法復原。")) return;

    // 1. 先從本地陣列移除，讓 UI 立刻反應 (不用等雲端回應)
    allScoresRaw = allScoresRaw.filter(r => r.id != id);
    
    // 2. 重新渲染詳細頁面與主頁平均分
    showDetail(teamNumber);
    renderCards(allTeams);

    // 3. 發送請求給 Google Apps Script
    try {
        await fetch(GOOGLE_SHEET_URL, {
            method: "POST",
            mode: "no-cors",
            body: JSON.stringify({ action: "DELETE", id: id })
        });
        console.log(`ID ${id} 刪除請求已發送`);
    } catch (e) {
        alert("刪除請求發送失敗，請檢查網路");
        // 如果失敗，理論上應該要把資料加回來，但這裡簡化處理
    }
}

// --- 修改：儲存並上傳 ---
async function saveAndExit() {
    const getVal = (id) => {
        const el = document.getElementById(id);
        return el.tagName === "INPUT" ? parseInt(el.value) : parseInt(el.innerText);
    };

    // 產生唯一 ID (時間戳 + 隨機數)
    const uniqueId = "Rec-" + Date.now() + "-" + Math.floor(Math.random() * 1000);

    const data = {
        action: "SAVE", // 告訴後端這是儲存
        id: uniqueId,
        teamNumber: currentScoringTeam,
        autoFuel: getVal('auto-fuel') || 0,
        autoClimb: parseInt(document.getElementById('auto-climb').value),
        teleFuel: getVal('tele-fuel') || 0,
        teleClimb: parseInt(document.getElementById('tele-climb').value),
        tranFuel: getVal('transport-fuel') || 0,
        reporting: document.getElementById('reporting').value,

    };
    
    // 1. 本地先加進去 (讓使用者覺得很快)
    allScoresRaw.push(data);
    
    // 2. 儲存到雲端
    try {
        console.log("正在同步雲端...");
        // 使用 no-cors 模式發送 POST
        await fetch(GOOGLE_SHEET_URL, {
            method: "POST",
            mode: "no-cors", 
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data)
        });
        

        const statsElem = document.getElementById('search-stats');
        if (statsElem) {
            // 因為剛才 allScoresRaw.push(data) 已經讓陣列加 1 了
            statsElem.innerText = `同步完成 (共 ${allScoresRaw.length} 筆)`;
        }
        // --- 修正結束 ---

        // 重置標題並回到主頁
        const h2Title = document.querySelector('#score-page h2');
        if (h2Title) h2Title.innerText = "Scoring Mode";

        renderCards(allTeams); 
       

    } catch (e) {
        console.error("雲端同步失敗", e);
        alert(`雲端同步失敗，請檢查網路。`);
    }
    
    renderCards(allTeams); 
    togglePage(); 
    
}

// --- 修改：平均分計算 (從 allScoresRaw 陣列過濾) ---
function calculateAverage(teamNumber) {
    // 這裡改用 filter 從原始陣列抓
    const records = allScoresRaw.filter(r => r.teamNumber == teamNumber);
    
    if (records.length === 0) return "N/A";

    let totalScore = 0;
    records.forEach(r => {
        totalScore += (parseInt(r.autoFuel) || 0) * 1;
        totalScore += (parseInt(r.teleFuel) || 0) * 1;
        
        totalScore += getClimbScore(r.autoClimb, true);
        totalScore += getClimbScore(r.teleClimb, false);
    });

    return (totalScore / records.length).toFixed(1);
}

// 輔助：計算吊掛分數
function getClimbScore(level, isAuto) {
    let lvl = parseInt(level);
    if (isNaN(lvl)) return 0;
    if (isAuto) {
        if (lvl === 1) return 15;
        if (lvl === 2) return 20;
        if (lvl === 3) return 30;
    } else {
        if (lvl === 1) return 10;
        if (lvl === 2) return 20;
        if (lvl === 3) return 30;
    }
    return 0;
}

// --- 保留的部分 (搜尋、切換頁面、計分增減) ---
// 搜尋條事件監聽器
const searchBar = document.getElementById('search-bar');
if (searchBar) {
    searchBar.addEventListener('input', (e) => {
        const searchText = e.target.value.toLowerCase().trim();
        const filteredTeams = allTeams.filter(team => {
            return team.team_number.toString().includes(searchText) || 
                   (team.nickname && team.nickname.toLowerCase().includes(searchText));
        });
        renderCards(filteredTeams);
    });
}

let currentScoringTeam = "";

function togglePage() {
    const mainPage = document.getElementById('main-page');
    const scorePage = document.getElementById('score-page');
    const btn = document.getElementById('toggle-btn');
    const dropdown = document.getElementById('team-dropdown');
    const h2Title = document.querySelector('#score-page h2');

    // 如果目前是關閉狀態，準備打開
    if (scorePage.style.display === 'none') {
        mainPage.style.display = 'none';
        scorePage.style.display = 'block';
        btn.innerText = '×';
        btn.classList.add('active');

        // --- 狀態重置：每次打開都從「選擇隊伍」開始 ---
        document.getElementById('team-select-zone').style.display = 'block';
        document.getElementById('mode-selec-zone').style.display = 'none';
        document.getElementById('static-section').style.display = 'none';
        document.getElementById('actual-scoring-content').style.display = 'none';
        
        // 重置數據與選單
        resetScoring();
        dropdown.innerHTML = '<option value="">-- 請選擇隊伍 --</option>';
        allTeams.forEach(t => {
            const opt = document.createElement('option');
            opt.value = t.team_number;
            opt.innerText = `#${t.team_number} - ${t.nickname || "無名稱"}`;
            dropdown.appendChild(opt);
        });

    } else {
        // 如果目前是開啟狀態，準備關閉 (回到主頁)
        mainPage.style.display = 'block';
        scorePage.style.display = 'none';
        btn.innerText = '+';
        btn.classList.remove('active');
        
        // 隱藏所有子區塊，以防萬一
        document.getElementById('mode-selec-zone').style.display = 'none';
        document.getElementById('static-section').style.display = 'none';
        document.getElementById('actual-scoring-content').style.display = 'none';
        h2Title.style.display='none'
        
    }
}

function resetScoring() {
    const af = document.getElementById('auto-fuel');
    const tf = document.getElementById('tele-fuel');
    const trf = document.getElementById('transport-fuel');
    
    if(af) af.tagName === "INPUT" ? af.value = "0" : af.innerText = "0";
    if(tf) tf.tagName === "INPUT" ? tf.value = "0" : tf.innerText = "0";
    if(trf) trf.tagName === "INPUT" ? trf.value = "0" : trf.innerText = "0";




    if(document.getElementById('auto-climb')) document.getElementById('auto-climb').value = "0";
    if(document.getElementById('tele-climb')) document.getElementById('tele-climb').value = "0";
    if(document.getElementById('reporting')) document.getElementById('reporting').value = "";
}

function confirmTeam() {
    const dropdown = document.getElementById('team-dropdown');
    const selectedTeam = dropdown.value;
    if (!selectedTeam) {
        alert("請先選擇一個隊伍！");
        return;
    }
    currentScoringTeam = selectedTeam;
    
    document.getElementById('team-select-zone').style.display = 'none';
    document.getElementById('mode-selec-zone').style.display = 'block';  // 顯示模式選擇 (用 flex 以便置中)

}

function quickSelectTeam(num) {
    const btn = document.getElementById('toggle-btn');
    
    if (document.getElementById('score-page').style.display === 'none') {
        currentScoringTeam = num;
        document.getElementById('main-page').style.display = 'none';
        document.getElementById('score-page').style.display = 'block';
        document.getElementById('score-page').querySelector('h2').innerText = `正在為 #${num} 計分`;
        document.getElementById('team-select-zone').style.display = 'none';
        document.getElementById('mode-selec-zone').style.display = 'block';
        btn.innerText = '×';
        btn.classList.add('active');
        resetScoring();
        
    }
}

function changeVal(id, delta) {
    const elem = document.getElementById(id);
    if (elem.tagName === "INPUT") {
        let val = parseInt(elem.value) || 0;
        val += delta;
        elem.value = val < 0 ? 0 : val;
    } else {
        let current = parseInt(elem.innerText) || 0;
        current += delta;
        if (current < 0) current = 0;
        elem.innerText = current;
    }
}

// 宣告一個變數來存模式
let selectedMatchMode = "";

function whatmode() {
    const mainPage = document.getElementById('main-page');
    const staticzone=document.getElementById('static-section');
    const modezone=document.getElementById('mode-selec-zone')
    const dropdown = document.getElementById('mode-selec');
    const scorePage = document.getElementById('score-page');
    
    const btn = document.getElementById('toggle-btn');


    


    const val = dropdown.value;

    

    selectedMatchMode = val;
    console.log("當前模式:", selectedMatchMode);

    modezone.style.display='none';

    if (selectedMatchMode === 'static') {
        document.getElementById('static-section').style.display = 'block';
        document.getElementById('actual-scoring-content').style.display = 'none';
    } else if (selectedMatchMode === 'dynamic') {
        document.getElementById('static-section').style.display = 'none';
        document.getElementById('actual-scoring-content').style.display = 'block';
    }



    

    

    

    // 存入變數
    

    
}


// 移除 clearAllData (因為已經改為雲端，且支援單筆刪除，不需要全清功能)

// 網頁載入後啟動
window.onload = autoFetchTeams;