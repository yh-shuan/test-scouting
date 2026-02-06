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
let allScoresRaw = []; // 動態數據
let allStaticRaw = []; // 靜態數據 
const API_KEY = "tGy3U4VfP85N98m17nqzN8XCof0zafvCckCLbgWgmy95bGE0Aw97b4lV7UocJvxl"; 


let AllTeamsList=[];

// --- ⚠️ 重要：請填入 Apps Script 部署後的 Web App URL (結尾通常是 /exec) ---
const GOOGLE_SHEET_URL = "https://script.google.com/macros/s/AKfycbxzgNHYYPc06GWSPk5F6z-bGgWDQpirYjXpuSqef4uf5kIrHrs4B_svsFXjfOEH4FoT/exec"; 


let currentRankMode = 'teamnuber';


// --- 新增：從雲端同步數據 ---
async function syncFromCloud() {
    const statsElem = document.getElementById('search-stats');
    if (statsElem) statsElem.innerText = "正在同步雲端數據...";

    try {

        const resMovement = await fetch(`${GOOGLE_SHEET_URL}?type=movement`);
        // 假設 Apps Script 回傳的是物件陣列 [ {id, teamNumber, autoFuel...}, ... ]
        allScoresRaw = await resMovement.json();
        const resStatic = await fetch(`${GOOGLE_SHEET_URL}?type=static`);
        // 假設 Apps Script 回傳的是物件陣列 [ {id, teamNumber, autoFuel...}, ... ]
        allStaticRaw = await resStatic.json();

        console.log("雲端數據同步成功:", allScoresRaw.length, "筆動態紀錄",allStaticRaw,"筆動態紀錄靜態");
        
        if (statsElem) statsElem.innerText = `同步完成 (動態:${allScoresRaw.length} | 靜態:${allStaticRaw.length})`;
        
        // 數據回來後，重新渲染卡片以更新平均分
        resetproperty();
        Rankingteam(currentRankMode);

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
        // --- 關鍵修改：TBA 抓完後，立刻抓雲端分數 --
        await syncFromCloud();
        
        
        resetproperty();
        Rankingteam(currentRankMode);


    } catch (e) {
        console.error("抓取失敗:", e);
        const container = document.getElementById('team-container');
        if (container) container.innerHTML = `<div style="color:red; padding:20px;">數據載入失敗，請確認 API KEY 是否正確。</div>`;
    }
}

function renderCards(tupleList) {
    const container = document.getElementById('team-container');
    if (!container) return;

    // tupleList 結構: [[6036, 15.5], [1678, 20.0], ...]
    container.innerHTML = tupleList.map(tuple => {
        const teamNum = tuple[0];
        const scoreVal = tuple[1];
        
        // 顯示用的分數字串
        const displayScore = scoreVal === -1 ? "N/A" : scoreVal.toFixed(1);

        // 去原始資料找詳細資訊 (Nickname, Location)
        // 這裡用 find，雖然效率 O(n)，但在 100 隊規模下毫秒級完成，沒問題
        const t = allTeams.find(obj => obj.team_number === teamNum) || {};

        return `
        <div class="t">
            <div class="team-card" onclick="showDetail('${teamNum}')">
                <div class="card-top">
                    <div class="team-number"># ${teamNum}</div>
                    <div class="team-name">${t.nickname || "無名稱"}</div>
                </div>
                <div class="card-button">
                    <div class="team-avg-score">
                        AVG: ${displayScore}
                    </div>
                    <div class="team-state">
                        <span class="material-icons">map</span>
                        ${t.state_prov || "未知區域"}
                    </div>
                    <div class="team-city">
                        <span class="material-icons">location_city</span>
                        ${t.city || "未知城市"}
                    </div>

                    <div id="loc-${teamNum}" class="team-location">
                        <span class="material-icons">school</span>
                        never gonnon give you up...
                    </div>
                </div>

                <button onclick="event.stopPropagation(); quickSelectTeam('${teamNum}')" class="team-score-botton">
                <span class="material-icons" style="font-size:20px; color:#333;">add_circle</span>
                快速計分
                </button>
            </div>
        </div>
        `;
    }).join('');

    // 字體調整
    const nameLabels = container.querySelectorAll('.team-name');
    nameLabels.forEach(label => {
        label.style.width = "100%";
        label.style.overflow = "hidden";
        label.style.whiteSpace = "nowrap";
        autoShrinkText(label, 12); 
    });

    // 地址抓取也改傳 tupleList
    fetchAddresses(tupleList.map(t => ({ team_number: t[0] })));
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
                // 不要用 innerText，改用這個方式保留圖標
                target.innerHTML = `<span class="material-icons">school</span><div class="addr-text">${schoolName}</div>`;

                // 呼叫縮放功能
                const textElem = target.querySelector('.addr-text');
                if(textElem) autoShrinkText(textElem, 10);

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
    
    // 過濾出該隊伍的資料
    const moveRecords = allScoresRaw.filter(r => r.teamNumber == teamNumber);
    const staticRecord = allStaticRaw.find(r => r.teamNumber == teamNumber); // 靜態通常只有一筆

    title.innerText = `隊伍 #${teamNumber} 詳細資料`;
    list.innerHTML = ""; 

    // --- 先顯示靜態資訊 (如果有) ---
    if (staticRecord) {
        const sDiv = document.createElement('div');
        sDiv.className = "record-item";
        sDiv.style.borderLeft = "4px solid #3498db"; // 藍邊區分
        sDiv.innerHTML = `
            <div style="font-weight:bold; color:#2980b9; margin-bottom:5px;">📋 機器人靜態規格</div>
            吊掛等級: L${staticRecord.staticclimb} | 位置: ${staticRecord.climbposition}<br>
            Fuel 裝載: ${staticRecord.staticfuel} | 跑打能力: ${staticRecord.Runandshoot}<br>
            備註: ${staticRecord.staticreporting || "無"}
        `;
        list.appendChild(sDiv);
    }

    // --- 再顯示動態紀錄 ---
    if (moveRecords.length === 0) {
        list.innerHTML += "<p style='text-align:center; color:#666; margin-top:10px;'>目前沒有動態比賽紀錄</p>";
    } else {
        list.innerHTML += `<div style="font-weight:bold; margin:10px 0 5px 0;">🎮 比賽表現 (${moveRecords.length} 筆)</div>`;
        moveRecords.forEach((r, idx) => {
            const div = document.createElement('div');
            div.className = "record-item";
            const total = (parseInt(r.autoFuel)||0) + (parseInt(r.teleFuel)||0) + getClimbScore(r.autoClimb, true) + getClimbScore(r.teleClimb, false);
            
            div.innerHTML = `
                <strong>紀錄 #${idx + 1}</strong> <span style="color:#888; font-size:11px;">(ID: ${r.id})</span><br>
                單場預估分: ${total} 分<br>
                Auto: ${r.autoFuel}F / L${r.autoClimb} | Tele: ${r.teleFuel}F / L${r.teleClimb}<br>
                備註: ${r.reporting || "無"}
                <button class="delete-btn-small" onclick="deleteCloudData('${r.id}', '${teamNumber}', 'movement')">刪除</button>
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
async function deleteCloudData(id, teamNumber, targetTable) {
    if (!confirm("確定要刪除這筆資料嗎？")) return;

    // 本地移除
    if (targetTable === 'movement') {
        allScoresRaw = allScoresRaw.filter(r => r.id != id);
    } else {
        allStaticRaw = allStaticRaw.filter(r => r.id != id);
    }
    
    showDetail(teamNumber); // 重新整理視窗內容
    resetproperty();
    Rankingteam(currentRankMode);

    try {
        await fetch(GOOGLE_SHEET_URL, {
            method: "POST",
            mode: "no-cors",
            body: JSON.stringify({ action: "DELETE", id: id, target: targetTable }) // 傳送 target 告知 GS
        });
    } catch (e) {
        console.error("刪除失敗:", e);
    }
}


function resetproperty(){

if (!allTeams || allTeams.length === 0) return;

    AllTeamsList = allTeams.map(t => {
        const avg = calculateAverage(t.team_number);
        // 防呆：如果是 N/A 就給 -1，確保這隊排在最後；轉成浮點數以便排序
        const score = avg === "N/A" ? -1 : parseFloat(avg);
        
        return [
            t.team_number, // Index 0: 隊號
            score          // Index 1: 平均分
        ];
    });

}

function Rankingteam(rankproperty) {
    // 如果有傳入參數，更新全域模式；沒傳參數(自動更新時)就用舊的
    if (rankproperty) {
        currentRankMode = rankproperty;
    }

    let rankwhat = 0;
    switch (currentRankMode) { // 改用全域變數判斷
        case 'teamname': rankwhat = 0; break;
        case 'avgscore': rankwhat = 1; break;
        default: rankwhat = 0;
    }

    AllTeamsList.sort((a, b) => {
        // 模式 A：純隊號 (index 0) -> 由小到大
        if (rankwhat === 0) {
            return a[0] - b[0]; 
        }
        
        // 模式 B：戰力 (index 1) -> 由大到小
        if (b[rankwhat] !== a[rankwhat]) {
            return b[rankwhat] - a[rankwhat];
        }
        
        // 保底：戰力一樣時，隊號由小到大
        return a[0] - b[0];
    });

    // --- 關鍵：直接渲染排好的 Tuple ---
    renderCards(AllTeamsList);
}




// --- 修改：儲存並上傳 ---
async function saveAndExit(type) {
    const getVal = (id) => {
        const el = document.getElementById(id);
        // 增加防呆：找不到元素時回傳 0
        if (!el) return 0; 
        return el.tagName === "INPUT" ? parseInt(el.value) : parseInt(el.innerText);
    };

    const uniqueId = "Rec-" + Date.now() + "-" + Math.floor(Math.random() * 1000);


    let data = {
        action: "SAVE",
        
        target: type,
        id: uniqueId,
        teamNumber: currentScoringTeam,
        };
    if(type==='movement'){
        data.autoFuel= getVal('auto-fuel') || 0;
        data.autoClimb= parseInt(document.getElementById('auto-climb').value) || 0;
        data.teleFuel= getVal('tele-fuel') || 0;
        data.teleClimb= parseInt(document.getElementById('tele-climb').value) || 0;
        data.tranFuel= getVal('transport-fuel') || 0;
        data.reporting= document.getElementById('reporting').value || "";

        

    }else if(type==='static'){
        data.staticclimb= parseInt(document.getElementById('static-climb').value)||0;
        data.climbposition=document.getElementById('climb-position').value||"";
        data.staticfuel=getVal('static-fuel') || 0;
        data.Runandshoot=document.getElementById('Run_and_shoot').checked ? "Yes" : "No";
        data.staticreporting= document.getElementById('static-reporting').value || "";
    }
    
    resetproperty();
    Rankingteam(currentRankMode);
    saveData(data); 

    // --- 關鍵修正：徹底重置 UI 狀態 ---
    document.getElementById('main-page').style.display = 'block';
    document.getElementById('score-page').style.display = 'none';
    
    // 重置所有輸入框數值
    resetScoring(); 
    
    const btn = document.getElementById('toggle-btn');
    btn.innerText = '+';
    btn.classList.remove('active');
    
    window.scrollTo(0, 0); 

    // 在 saveAndExit 函數的最末端加上這句
    selectedMatchMode = "";

}


// 統一儲存入口：先存手機，再傳雲端
function saveData(data) {
    const pending = JSON.parse(localStorage.getItem('pendingRecords') || '[]');
    pending.push(data);
    localStorage.setItem('pendingRecords', JSON.stringify(pending));
    
    // 現在它就在同一個檔案裡，可以直接叫到了！
    processQueue(); 
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
        
        // 1. 先過濾出符合條件的原始隊伍物件
        const filtered = allTeams.filter(team => 
            team.team_number.toString().includes(searchText) || 
            (team.nickname && team.nickname.toLowerCase().includes(searchText))
        );

        // 2. 將過濾後的結果轉成 renderCards 需要的 tuple 格式
        const filteredTuples = filtered.map(t => {
            const avg = calculateAverage(t.team_number);
            return [t.team_number, avg === "N/A" ? -1 : parseFloat(avg)];
        });

        // 3. 渲染過濾後的 tuple
        renderCards(filteredTuples);
    });
}

let currentScoringTeam = "";

function togglePage() {
    const mainPage = document.getElementById('main-page');
    const scorePage = document.getElementById('score-page');
    const battlePage = document.getElementById('battle-page');
    const btn = document.getElementById('toggle-btn');
    const battlebtn = document.getElementById('battle-btn');
    const dropdown = document.getElementById('team-dropdown');

    if ((scorePage.style.display === 'none' || scorePage.style.display === '') && (battlePage.style.display === 'none' || battlePage.style.display === '')) {
        // 1. 先重置所有狀態
        resetScoring();

        // 2. 切換大頁面
        mainPage.style.display = 'none';
        scorePage.style.display = 'block';
        battlePage.style.display = 'none';
        btn.innerText = '×';
        btn.classList.add('active');
        battlebtn.style.display = 'none'; // 隱藏戰鬥按鈕

        // 3. 【關鍵】強制顯示選隊伍區，隱藏其他區
        document.getElementById('team-select-zone').style.setProperty('display', 'block', 'important');
        document.getElementById('mode-selec-zone').style.setProperty('display', 'none', 'important');
        
        // 4. 填充下拉選單
        dropdown.innerHTML = '<option value="">-- 請選擇隊伍 --</option>';
        allTeams.forEach(t => {
            const opt = document.createElement('option');
            opt.value = t.team_number;
            opt.innerText = `#${t.team_number} - ${t.nickname || "無名稱"}`;
            dropdown.appendChild(opt);
        });
    } else {
        mainPage.style.display = 'block';
        scorePage.style.display = 'none';
        battlePage.style.display = 'none';
        btn.innerText = '+';
        btn.classList.remove('active');
        battlebtn.style.display = 'flex'; // 顯示戰鬥按鈕
        battlebtn.classList.add('active');
    }
}


function battle(){
    const mainPage = document.getElementById('main-page');
    const battlepage = document.getElementById('battle-page');
    const batleteam1page = document.getElementById('batle-team1-page');
    const batleteam2page = document.getElementById('batle-team2-page');
    const battlebtn = document.getElementById('battle-btn');
    const btn = document.getElementById('toggle-btn');
    const dropdown1 = document.getElementById('battle-team-dropdown1');
    const dropdown2 = document.getElementById('battle-team-dropdown2');
    const info1 = document.getElementById('team1-info');
    const info2 = document.getElementById('team2-info');

    if (battlepage.style.display === 'none' || battlepage.style.display === '') {
        // 1. 先重置所有狀態
        resetScoring();

        // 2. 切換大頁面
        mainPage.style.display = 'none';
        battlepage.style.display = 'block';
        
        
        battlebtn.style.display = 'none'; // 隱藏戰鬥按鈕
        btn.innerText = '×';
        btn.classList.add('active');
        
        // 4. 填充下拉選單
        dropdown1.innerHTML = '<option value="">-- 正方代表 --</option>';

        allTeams.forEach(t => {
            const opt = document.createElement('option');
            opt.value = t.team_number;
            opt.innerText = `#${t.team_number} - ${t.nickname || "無名稱"}`;
            dropdown1.appendChild(opt);
        });
        batleteam1page.style.display = 'flex';


        dropdown2.innerHTML = '<option value="">-- 反方代表 --</option>';

        allTeams.forEach(t => {
            const opt = document.createElement('option');
            opt.value = t.team_number;
            opt.innerText = `#${t.team_number} - ${t.nickname || "無名稱"}`;
            dropdown2.appendChild(opt);
        });

        batleteam2page.style.display = 'flex';

    } else {
        togglePage();
        //mainPage.style.display = 'block';
        //battlepage.style.display = 'none';
        //battlebtn.style.display = 'block'; // 顯示戰鬥按鈕
        //battlebtn.classList.add('active');
        //btn.innerText = '+';
        //btn.classList.remove('active');

        // 1. 重製下拉選單到預設狀態 
        dropdown1.selectedIndex = 0;
        dropdown2.selectedIndex = 0;

        // 2. 清空原本顯示隊伍資訊的文字區塊
        if (info1) info1.innerHTML = '';
        if (info2) info2.innerHTML = '';


    }

    dropdown1.onchange = function() {
    const selectedTeamNum = parseInt(this.value); // 取得選中的隊號
    
    // 從你現有的 AllTeamsList 陣列中找出那一隊的資料 [隊號, 分數]
    const teamData = AllTeamsList.find(tuple => tuple[0] === selectedTeamNum);
    
    // 如果找到了，就把文字噴進 batleteam1page
    if (teamData) {
        const teamNum = teamData[0];
        const score = teamData[1];
        
        batleteam1page.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: flex-start;">
                <span style="font-size: 1.5em; font-weight: bold;">隊伍：#${teamNum}</span>
                <span style="font-size: 1.2em;">平均分：${score === -1 ? 'N/A' : score.toFixed(1)}</span>
            </div>
        `;
    }
    };

    // 第二個隊伍選單同理
    dropdown2.onchange = function() {
        const selectedTeamNum = parseInt(this.value);
        const teamData = AllTeamsList.find(tuple => tuple[0] === selectedTeamNum);
        
        if (teamData) {
            batleteam2page.innerHTML = `
                <div style="display: flex; flex-direction: column; align-items: flex-start;">
                    <span style="font-size: 1.5em; font-weight: bold;">隊伍：#${teamData[0]}</span>
                    <span style="font-size: 1.2em;">平均分：${teamData[1] === -1 ? 'N/A' : teamData[1].toFixed(1)}</span>
                </div>
            `;
        }
    };
}

function resetScoring() {
    // --- 1. 動態計分欄位重置 ---
    const af = document.getElementById('auto-fuel');
    const tf = document.getElementById('tele-fuel');
    const trf = document.getElementById('transport-fuel');
    
    if(af) (af.tagName === "INPUT" ? af.value = "0" : af.innerText = "0");
    if(tf) (tf.tagName === "INPUT" ? tf.value = "0" : tf.innerText = "0");
    if(trf) (trf.tagName === "INPUT" ? trf.value = "0" : trf.innerText = "0");

    if(document.getElementById('auto-climb')) document.getElementById('auto-climb').value = "0";
    if(document.getElementById('tele-climb')) document.getElementById('tele-climb').value = "0";
    if(document.getElementById('reporting')) document.getElementById('reporting').value = "";

    // --- 2. 靜態計分欄位重置 (新增這部分) ---
    // 重置靜態 Climb 下拉選單
    const sc = document.getElementById('static-climb');
    if(sc) sc.value = "0";

    // 重置 Climb Position 下拉選單
    const cp = document.getElementById('climb-position');
    if(cp) cp.value = ""; // 假設預設是空值或 None

    // 重置靜態 Fuel 數值 (如果是透過 changeVal 控制的 innerText)
    const sf = document.getElementById('static-fuel');
    if(sf) (sf.tagName === "INPUT" ? sf.value = "0" : sf.innerText = "0");

    // 重置 Run and Shoot 核取方塊
    const rs = document.getElementById('Run_and_shoot');
    if(rs) rs.checked = false;

    // 重置靜態備註
    const sr = document.getElementById('static-reporting');
    if(sr) sr.value = "";

    // --- 3. UI 顯示狀態重置 ---
    // 強制隱藏所有子區域
    const zones = ['team-select-zone', 'mode-selec-zone', 'static-section', 'actual-scoring-content'];
    zones.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.setProperty('display', 'none', 'important'); 
    });
    
    // 重置模式選擇下拉選單
    const modeDropdown = document.getElementById('mode-selec');
    if(modeDropdown) modeDropdown.selectedIndex = 0;

    // 抹除計分頁面標題
    const h2Title = document.querySelector('#score-page h2');
    if (h2Title) {
        h2Title.innerText = ""; 
        h2Title.style.display = 'none';
    }
}

function confirmTeam() {
    
    const dropdown = document.getElementById('team-dropdown');
    const selectedTeam = dropdown.value;
    
    if (!selectedTeam) {
        alert("請先選擇一個隊伍！");
        return;
    }
    
    currentScoringTeam = selectedTeam;
    
    // 1. 隱藏選隊伍區域
    document.getElementById('team-select-zone').style.setProperty('display', 'none', 'important');
    
    // 2. 強制顯示選模式區域 (使用 important 破除 resetScoring 的限制)
    const modeZone = document.getElementById('mode-selec-zone');
    if (modeZone) {
        modeZone.style.setProperty('display', 'block', 'important');
    }

    // 3. 同步更新標題
    const h2Title = document.querySelector('#score-page h2');
    if (h2Title) {
        h2Title.innerText = `正在為 #${selectedTeam} 計分`;
        h2Title.style.display = 'block';
    }
}

function quickSelectTeam(num) {
    const btn = document.getElementById('toggle-btn');
    const scorePage = document.getElementById('score-page');
    const battlePage = document.getElementById('battle-page');
    const battlebtn = document.getElementById('battle-btn');
    
    if (scorePage.style.display === 'none') {
        // 1. 【關鍵】先執行大掃除，這會把所有區域設為 none
        resetScoring(); 

        // 2. 設定目前的隊伍
        currentScoringTeam = num;
        
        // 3. 切換大頁面顯示
        document.getElementById('main-page').style.display = 'none';
        scorePage.style.display = 'block';
        
        // 4. 更新標題
        const h2Title = scorePage.querySelector('h2');
        if (h2Title) {
            h2Title.innerText = `正在為 #${num} 計分`;
            h2Title.style.display = 'block';
        }

        // 5. 【關鍵】在 resetScoring 之後，單獨把模式選擇區叫出來
        document.getElementById('team-select-zone').style.display = 'none';
        document.getElementById('mode-selec-zone').style.setProperty('display', 'block', 'important');

        btn.innerText = '×';
        btn.classList.add('active');
        battlebtn.style.display = 'none'; // 隱藏戰鬥按鈕
        battlePage.style.display = 'none';
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
    const dropdown = document.getElementById('mode-selec');
    const val = dropdown.value;
    if (!val) return; // 如果選回預設選項則不動作

    selectedMatchMode = val;
    console.log("當前模式:", selectedMatchMode);

    // 1. 隱藏模式選擇區
    document.getElementById('mode-selec-zone').style.setProperty('display', 'none', 'important');

    // 2. 根據選擇顯示對應計分區
    if (selectedMatchMode === 'static') {
        document.getElementById('static-section').style.setProperty('display', 'block', 'important');
        document.getElementById('actual-scoring-content').style.setProperty('display', 'none', 'important');
    } else if (selectedMatchMode === 'dynamic') {
        document.getElementById('static-section').style.setProperty('display', 'none', 'important');
        document.getElementById('actual-scoring-content').style.setProperty('display', 'block', 'important');
    }
}


// 移除 clearAllData (因為已經改為雲端，且支援單筆刪除，不需要全清功能)

// --- 從 app.js 搬過來的核心同步邏輯 ---

// 1. 處理上傳隊列
async function processQueue() {
    if (!navigator.onLine) {
        updateSyncStatusDisplay();
        return;
    }

    let pending = JSON.parse(localStorage.getItem('pendingRecords') || '[]');
    if (pending.length === 0) {
        updateSyncStatusDisplay();
        return;
    }

    console.log(`偵測到網路，正在補傳 ${pending.length} 筆離線數據...`);

    for (const record of [...pending]) {
        try {
            await fetch(GOOGLE_SHEET_URL, {
                method: "POST",
                mode: "no-cors",
                body: JSON.stringify(record)


            });

            // 成功後移除該筆
            pending = pending.filter(item => item.id !== record.id);
            localStorage.setItem('pendingRecords', JSON.stringify(pending));
        } catch (e) {
            console.error("同步失敗，暫停隊列:", e);
            break; 
        }
    }
    updateSyncStatusDisplay();
}

// 2. 更新主頁狀態列
function updateSyncStatusDisplay() {
    const statsElem = document.getElementById('search-stats');
    if (!statsElem) return;

    const pendingCount = JSON.parse(localStorage.getItem('pendingRecords') || '[]').length;
    
    if (pendingCount > 0) {
        statsElem.innerHTML = `同步中... <span style="color:#e67e22; font-weight:bold;">(⚠️ ${pendingCount} 筆待上傳)</span>`;
    } else {
        // 這裡維持你原本 syncFromCloud 顯示的格式
        statsElem.innerText = `同步完成 (動態:${allScoresRaw.length} | 靜態:${allStaticRaw.length})`;
    }
}



// 網頁載入後啟動
window.onload = () => {
    autoFetchTeams();

    // 每 30 秒自動從雲端拉取一次最新分數
    setInterval(() => {
        if (navigator.onLine) syncFromCloud();
    }, 30000);

    // 每 60 秒檢查一次是否有漏傳的離線資料
    setInterval(processQueue, 60000);
};

// 監聽網路恢復事件
window.addEventListener('online', processQueue);

/**
 * 自動縮放字體大小
 * @param {HTMLElement} el - 要檢查的 DOM 元素
 * @param {number} minSize - 最小字體限制 (px)
 */
function autoShrinkText(el, minSize = 10) {
    let currentSize = parseInt(window.getComputedStyle(el).fontSize);

    // 當內容寬度大於容器寬度，且字體還大於最小值時
    while (el.scrollWidth > el.clientWidth && currentSize > minSize) {
        currentSize -= 1;
        el.style.fontSize = currentSize + 'px';
    }
}