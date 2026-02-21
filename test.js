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
let allevent = [];

const API_KEY = "tGy3U4VfP85N98m17nqzN8XCof0zafvCckCLbgWgmy95bGE0Aw97b4lV7UocJvxl"; 



let AllTeamsList=[];

// --- ⚠️ 重要：請填入 Apps Script 部署後的 Web App URL (結尾通常是 /exec) ---
const GOOGLE_SHEET_URL = "https://script.google.com/macros/s/AKfycbyLioEbsGB1czMUM8Ib2gsBZxwdgyimFY85NHSf3i--5l9Oix9wW-voIY280DPI2xY2/exec"; 



let currentRankMode = 'teamnumber';


// --- 新增：從雲端同步數據 ---
async function syncFromCloud() {
    const statsElem = document.getElementById('search-stats');
    const eventselect = document.getElementById('whatevent');

    if (statsElem) statsElem.innerText = "正在同步雲端數據...";

    try {
        // 1. 同步抓取所有數據
        const [resMovement, resStatic, resEvent] = await Promise.all([
            fetch(`${GOOGLE_SHEET_URL}?type=movement`).then(r => r.json()),
            fetch(`${GOOGLE_SHEET_URL}?type=static`).then(r => r.json()),
            fetch(`${GOOGLE_SHEET_URL}?type=geteventteam`).then(r => r.json())
        ]);

        // 檢查數據是否有變動 (簡單檢查長度)
        const isChanged = (allScoresRaw.length !== resMovement.length || allStaticRaw.length !== resStatic.length);
        
        allScoresRaw = resMovement;
        allStaticRaw = resStatic;
        allevent = resEvent;
        
        console.log("📡 雲端原始賽事列表:", allevent);

        // --- ⭐ 自動補救邏輯 ⭐ ---
        // 如果原本的 currentevent 在雲端清單中找不到，就強制設定為清單中的第一個
        const eventExists = allevent.some(e => e.race === currentevent);
        if (!eventExists && allevent.length > 0) {
            console.warn(`⚠️ 找不到賽事 [${currentevent}]，自動切換至: ${allevent[0].race}`);
            currentevent = allevent[0].race;
        }

        // 2. 更新賽事下拉選單
        const optionsHTML = allevent.map(ev => {
            return `<option value="${ev.race}">${ev.race}</option>`;
        }).join('');
        eventselect.innerHTML = '<option value="" disabled selected hidden>Choose your battle...</option>' + optionsHTML;

        // 恢復選取狀態
        eventselect.value = currentevent;

        // 3. ⭐ 強力提取隊伍邏輯 (Double Insurance)
        const currentEventData = allevent.find(e => e.race === currentevent);
        
        // A. 從賽事表拿隊伍
        if (currentEventData && currentEventData.teams) {
            currentEventData.teams.forEach(num => {
                const n = parseInt(num);
                if (!allTeams.some(t => t.team_number === n)) {
                    allTeams.push({ team_number: n });
                    fetchAndPopulateTeamData(n, false);
                }
            });
        }

        // B. 保險：從現有的分數紀錄中提取該賽事的隊伍 (防止賽事表沒寫清楚)
        const recordTeams = allScoresRaw
            .filter(r => r.identifymark === currentevent)
            .map(r => parseInt(r.teamNumber));
            
        recordTeams.forEach(num => {
            if (!isNaN(num) && !allTeams.some(t => t.team_number === num)) {
                console.log(`🔎 從紀錄中發現隱藏隊伍: # ${num}`);
                allTeams.push({ team_number: num });
                fetchAndPopulateTeamData(num, false);
            }
        });

        // 4. ⭐ 強制重新計算與渲染
        if (allTeams.length > 0) {
            resetproperty();
            Rankingteam(currentRankMode);
            if (statsElem) statsElem.innerText = `同步完成 (${allTeams.length} 支隊伍)`;
        } else {
            if (statsElem) statsElem.innerText = "同步完成，但此賽事尚無隊伍。";
            document.getElementById('team-container').innerHTML = `<div style="text-align:center; padding:20px;">此賽事目前沒有隊伍資料</div>`;
        }
    } catch (e) {
        console.error("❌ 雲端同步失敗:", e);
        if (statsElem) statsElem.innerText = "雲端同步失敗，請檢查網路。";
    }
}

var currentevent = '2026nysu';

async function changeevent(whitchevent){
    currentevent = whitchevent;
    const itrain = whitchevent.includes("(train)");
    currentevent = whitchevent;

    // --- A. 強力清空 UI ---
    // 確保在載入新東西前，舊的 DOM 完全消失
    const container = document.getElementById('team-container');
    if (container) container.innerHTML = ""; 
    
    // --- B. 重置數據陣列 ---
    allTeams = [];
    
    // 找到對應的賽事資料
    const eventData = allevent.find(e => e.race === whitchevent);

    if (itrain) {
        document.getElementById('Addteam').style.display = 'inline-block';
        document.getElementById('Addteambtn').style.display = 'inline-block';

        // --- C. 從 GS 存入的隊伍中叫出來 ---
        // 確保 eventData 存在，且裡面的 teams 是一個陣列
        if (eventData && eventData.teams && Array.isArray(eventData.teams)) {
            console.log("從雲端載入預設隊伍:", eventData.teams);
            allTeams = eventData.teams.map(num => ({ 
                team_number: parseInt(num) 
            }));
        } 
        
        // --- D. 雙重保險：如果雲端沒設隊伍，但已經有計分紀錄 ---
        if (allTeams.length === 0) {
            const mTeams = allScoresRaw.filter(r => r.identifymark === whitchevent).map(r => parseInt(r.teamNumber));
            const sTeams = allStaticRaw.filter(r => r.identifymark === whitchevent).map(r => parseInt(r.teamNumber));
            const uniqueTeams = [...new Set([...mTeams, ...sTeams])];
            allTeams = uniqueTeams.map(num => ({ team_number: num }));
        }

        // --- E. 執行重置與渲染 ---
        resetproperty(); // 重置所有分數統計
        Rankingteam(currentRankMode); // 重新生成卡片
    } else {
        // 官方賽事模式邏輯...
        document.getElementById('Addteam').style.display = 'none';
        document.getElementById('Addteambtn').style.display = 'none';
        await autoFetchTeams(); 
    }
}

async function Addteam() {
    const inputField = document.getElementById('Addteam');
    const teamNum = parseInt(inputField.value.trim());

    if (!teamNum || isNaN(teamNum)) {
        alert("請輸入有效的隊號");
        return;
    }

    if (allTeams.some(t => t.team_number === teamNum)) {
        alert("此隊伍已在清單中");
        return;
    }

    let data = {
        action: "SAVE",
        target: 'seteventteam', // 注意：這裡要對應你 GS 裡的 switch case
        identifymark: currentevent,
        teamNumber: teamNum,
    };

    try {
        await saveData(data); 

        // 1. 更新目前顯示用的 allTeams
        allTeams.push({ team_number: teamNum });

        // 2. ⭐ 重要：同步更新全域變數 allevent 裡的資料
        // 這樣切換賽事再切回來時，隊伍才不會消失
        let eventInList = allevent.find(e => e.race === currentevent);
        if (eventInList) {
            if (!eventInList.teams) eventInList.teams = [];
            if (!eventInList.teams.includes(teamNum)) {
                eventInList.teams.push(teamNum);
            }
        }
        
        // 3. 重新渲染
        resetproperty();
        Rankingteam(currentRankMode);

        inputField.value = "";
        console.log(`✅ 隊伍 ${teamNum} 加入成功`);
        
    } catch (error) {
        console.error("儲存隊伍失敗:", error);
        alert("儲存失敗，請檢查網路連線");
    }
}





/**
 * 1. 初始化：只抓取 Event 的隊伍號碼清單
 */
async function autoFetchTeams() {
    const event_key = "2026nysu";
    // 改用 /teams/keys 接口，只拿隊號清單 (例如 ["frc1678", "frc254"...])，速度最快
    const url = `https://www.thebluealliance.com/api/v3/event/${event_key}/teams/keys`;
    
    const statsElem = document.getElementById('search-stats');
    if (statsElem) statsElem.innerText = "正在取得隊伍名單...";

    try {
        const response = await fetch(url, {
            headers: { "X-TBA-Auth-Key": API_KEY, "Accept": "application/json" }
        });

        if (!response.ok) throw new Error(`連線失敗: ${response.status}`);

        const teamKeys = await response.json();
        
        // 將 ["frc1678"...] 轉換成 [{team_number: 1678}...]
        allTeams = teamKeys.map(key => ({
            team_number: parseInt(key.replace('frc', ''))
        }));

        // 按隊號排序
        allTeams.sort((a, b) => a.team_number - b.team_number);
        
        console.log("已取得隊伍清單:", allTeams.length, "支隊伍");

        // 抓取雲端分數並計算
        await syncFromCloud();
    } catch (e) {
        console.error("初始化失敗:", e);
        const container = document.getElementById('team-container');
        if (container) container.innerHTML = `<div style="color:red; padding:20px;">載入失敗，請檢查網路或 API KEY。</div>`;
    }
}

/**
 * 2. 渲染：先畫骨架，再非同步補齊所有資料
 */
function renderCards(tupleList) {
    const container = document.getElementById('team-container');
    if (!container) return;

    // 先生成 HTML 骨架 (此時 tbaDetail 可能只有 team_number)
    container.innerHTML = tupleList.map(teamObj => {
        const tbaDetail = allTeams.find(obj => obj.team_number === teamObj.teamNumber) || {};
        return generateTeamCardHTML(teamObj, tbaDetail,false);
    }).join('');

    // 針對每一張卡片，啟動整合抓取函式
    tupleList.forEach(teamObj => {
        fetchAndPopulateTeamData(teamObj.teamNumber,false);
    });
}

/**
 * 3. 整合函式：根據隊號抓取所有 TBA 資訊並直接更新 UI
 * 取代舊的 fetchSingleAddress
 */
async function fetchAndPopulateTeamData(teamNum,bucket) {
    // 找到畫面上對應的卡片與 ID
    const card = document.querySelector(`.t:has(#loc-${teamNum}-${(bucket)?"bucket":""})`);
    if (!card) return;

    try {
        // 直接抓取該隊伍的完整資料
        const res = await fetch(`https://www.thebluealliance.com/api/v3/team/frc${teamNum}`, {
            headers: { "X-TBA-Auth-Key": API_KEY, "Accept": "application/json" }
        });
        const detail = await res.json();

        // --- 更新記憶體數據 (allTeams) ---
        const teamInStore = allTeams.find(t => t.team_number === teamNum);
        if (teamInStore) Object.assign(teamInStore, detail);

        // --- 直接更新 UI 元素 (索引式更新) ---
        // 1. 更新暱稱
        const nameLabel = card.querySelector('.team-name');
        if (nameLabel) {
            nameLabel.innerText = detail.nickname || "無名稱";
            autoShrinkText(nameLabel, 12);
        }

        // 2. 更新城市與區域
        const stateElem = card.querySelector('.team-state');
        if (stateElem) stateElem.innerHTML = `<span class="material-icons">map</span> ${detail.state_prov || "未知區域"}`;
        
        const cityElem = card.querySelector('.team-city');
        if (cityElem) cityElem.innerHTML = `<span class="material-icons">location_city</span> ${detail.city || "未知城市"}`;

        // 3. 更新學校/地址資訊
        const locElem = document.getElementById(`loc-${teamNum}-${(bucket)?"bucket":""}`);
        if (locElem) {
            const schoolName = detail.school_name || detail.address || "無詳細地址資訊";
            locElem.innerHTML = `<span class="material-icons">school</span><div class="addr-text">${schoolName}</div>`;
            
            const textElem = locElem.querySelector('.addr-text');
            if(textElem) autoShrinkText(textElem, 10);

            // 點擊搜尋邏輯
            locElem.onclick = (e) => {
                e.stopPropagation();
                if (schoolName !== "無詳細地址資訊") {
                    window.open(`https://www.google.com/search?q=${encodeURIComponent(schoolName)}`, '_blank');
                }
            };
        }

    } catch (err) {
        console.warn(`隊伍 ${teamNum} 資料補完失敗:`, err);
        const locElem = document.getElementById(`loc-${teamNum}`);
        if (locElem) locElem.querySelector('.addr-text').innerText = "載入失敗";
    }
}

/**
 * 4. 卡片模板 (保持不變，但確保 id 正確)
 */
function generateTeamCardHTML(teamObj, tbaDetail = {},bucket) {
    const teamNum = teamObj.teamNumber;
    const scoreVal = teamObj.avragescore;
    const displayScore = scoreVal === -1 ? "N/A" : scoreVal.toFixed(1);

    return `
    <div class="t">
        <div class="team-card" onclick="showDetail('${teamNum}',${(bucket)?'true':'false'})">
            <div class="card-top">
                <div class="team-number"># ${teamNum}</div>
                <div class="team-name">${tbaDetail.nickname || "載入中..."}</div>
            </div>
            <div class="card-button">
                <div class="team-avg-score">AVG: ${displayScore}</div>
                <div class="team-state"><span class="material-icons">bigcity</span> ...</div>
                <div class="team-city"><span class="material-icons">location_city</span> ...</div>

                <div id="loc-${teamNum}-${(bucket)?"bucket":""}" class="team-location">
                    <span class="material-icons">school</span>
                    never gonnon give you up...
                </div>
            </div>
            
            <button onclick="event.stopPropagation(); ${(!bucket)?`quickSelectTeam('${teamNum}')"`:`removebucTeam('${teamNum}')"`} class="team-score-botton"${(bucket)?``:``}>
                <span class="material-icons">${(!bucket)?`add_circle`:``}</span>
                ${(!bucket)?`快速計分`:`out`}
            </button>
            
        </div>
    </div>
    `;
}

// --- 新功能：顯示隊伍詳細資料 ---
function showDetail(teamNumber,bucket) {
    const overlay = document.getElementById('detail-overlay');
    const list = document.getElementById('detail-list');
    const title = document.getElementById('detail-title');
    document.getElementById((!bucket)?'main-page':'bucket-page').style.display = 'none';
    const closbotton = document.getElementById('closedetail-btn');
    closbotton.onclick = () => closeDetail(bucket);

    
    // 過濾出該隊伍的資料
    const moveRecords = allScoresRaw.filter(r => r.teamNumber == teamNumber);
    const staticRecord = allStaticRaw.find(r => r.teamNumber == teamNumber); // 靜態通常只有一筆

    title.innerText = `隊伍 #${teamNumber} 詳細資料`;
    list.innerHTML = ""; 

    // --- 先顯示靜態資訊 (如果有) ---
    if (staticRecord) {
        const sDiv = document.createElement('div');
        sDiv.className = "record-item";
        sDiv.style.borderLeft = "1vw solid #3498db"; // 藍邊區分
        sDiv.innerHTML = `
            <div style="font-weight:bold; color:#2980b9; margin-bottom:0.5vh;">靜態：</div>
            吊掛等級: ${staticRecord.staticclimb}<br>
            吊掛位置: ${staticRecord.climbposition}<br>
            帶幾顆球: ${staticRecord.staticfuel}<br>
            跑打能力: ${staticRecord.Runandshoot}<br>
            備註: ${staticRecord.staticreporting || "無"}
        `;
        list.appendChild(sDiv);
    }

    // --- 再顯示動態紀錄 ---
    if (moveRecords.length === 0) {
        list.innerHTML += "<p style='text-align:center; color:#666; margin-top:10px;'>目前沒有動態比賽紀錄</p>";
    } else {
        list.innerHTML += `<div style="font-weight:bold; margin:10px 0 5px 0;">比賽表現 (${moveRecords.length} 筆)</div>`;
        moveRecords.forEach((r, idx) => {
            const div = document.createElement('div');
            div.className = "record-item";
            const total = (parseInt(r.autoFuel)||0) + (parseInt(r.teleFuel)||0) + getClimbScore(r.autoClimb, true) + getClimbScore(r.teleClimb, false);
            
            div.innerHTML = `
                <strong>紀錄 #${idx + 1}</strong> <span style="color:#888; font-size:0.75em">(ID: ${r.id})</span><br>
                單場預估分: ${total} 分<br>
                auto進球: ${r.autoFuel}<br>
                auto吊掛: ${r.autoClimb}<br>  
                人動進球: ${r.teleFuel}<br> 
                人動吊掛: ${r.teleClimb}<br>
                備註: ${r.reporting || "無"}
                ${(!bucket)?`<button class="delete-btn-small" onclick="deleteCloudData('${r.id}', '${teamNumber}', 'movement')">刪除</button>`:``}
            `;
            list.appendChild(div);
        });
    }
    overlay.style.display = 'flex';
}

function closeDetail(bucket) {
    document.getElementById('detail-overlay').style.display = 'none';
    document.getElementById((bucket)?'bucket-page':'main-page').style.display = 'block';
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
    
    showDetail(teamNumber,false); // 重新整理視窗內容
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

    if (!allTeams || allTeams.length === 0) {
        console.warn("resetproperty: allTeams 是空的，無法計算。")
        return;
    }

    AllTeamsList = allTeams.map(t => {
        const teamNum = t.team_number;

        const avg = calculateAverage(t.team_number,'allscore');
        const autoavg   = calculateAverage(t.team_number,'auto');
        const teleavg   = calculateAverage(t.team_number,'tele');

        // 將 "N/A" 轉為 -1 以便排序（沒分數的排在最後面）
        const score = avg === "N/A" ? -1 : parseFloat(avg);
        const autoscore = autoavg === "N/A" ? -1 : parseFloat(autoavg);
        const telescore = teleavg === "N/A" ? -1 : parseFloat(teleavg);
        
        return {
            teamNumber: teamNum, // 隊伍的號碼
            avragescore: score,        // 加總平均分
            autoavgscore: autoscore,  // 自動平均分
            teleavgscore: telescore  // 人動平均分 
        };
    });
    console.log("✅ 屬性重置完成，清單長度:", AllTeamsList.length);
}

function Rankingteam(rankproperty) {
    // 如果有傳入參數，更新全域模式；沒傳參數(自動更新時)就用舊的
    if (rankproperty) {
        currentRankMode = rankproperty;
    }

    let rankwhat = 0;
    switch (currentRankMode) { // 改用全域變數判斷
        case 'teamnumber': rankwhat = 0; break;
        case 'avgscore': rankwhat = 'avragescore'; break;
        case 'auto'    : rankwhat = 'autoavgscore'; break;
        case 'tele'    : rankwhat = 'teleavgscore'; break;
        default: rankwhat = 0;
    }

    AllTeamsList.sort((a, b) => {
        // 模式 A：純隊號 (index 0) -> 由小到大
        if (rankwhat === 0) {
            return a.teamNumber - b.teamNumber; 
        }
        
        // 模式 B：戰力 (index 1) -> 由大到小
        if (b[rankwhat] !== a[rankwhat]) {
            return b[rankwhat] - a[rankwhat];
        }
        
        // 保底：戰力一樣時，隊號由小到大
        return a.teamNumber - b.teamNumber;
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
        identifymark: currentevent,
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
    
    // 現在會在同一個檔案裡，可以直接叫到
    processQueue(); 
}


// --- 修改：平均分計算 (從 allScoresRaw 陣列過濾) ---
function calculateAverage(teamNumber,type) {
    // 這裡改用 filter 從原始陣列抓
    const records = allScoresRaw.filter(r => r.teamNumber == teamNumber);
    
    if (records.length === 0) return "N/A";

    let totalScore = 0;
    switch(type){
        case('allscore'):
            records.forEach(r => {
                totalScore += (parseInt(r.autoFuel) || 0) * 1;
                totalScore += (parseInt(r.teleFuel) || 0) * 1;
                
                totalScore += getClimbScore(r.autoClimb, true);
                totalScore += getClimbScore(r.teleClimb, false);
            });
        break;
        case('auto'):
            records.forEach(r => {
                totalScore += (parseInt(r.autoFuel) || 0) * 1;
                
                
                totalScore += getClimbScore(r.autoClimb, true);
                
            });

        break;
        case('tele'):
            records.forEach(r => {
                
                totalScore += (parseInt(r.teleFuel) || 0) * 1;
                
                
                totalScore += getClimbScore(r.teleClimb, false);
            });
        break;

        

    }

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
            const avg = calculateAverage(t.team_number,'allscore');
            const autoavg   = calculateAverage(t.team_number,'auto');
            const teleavg   = calculateAverage(t.team_number,'tele');
            // 防呆：如果是 N/A 就給 -1，確保這隊排在最後；轉成浮點數以便排序
            const score = avg === "N/A" ? -1 : parseFloat(avg);
            const autoscore = autoavg === "N/A" ? -1 : parseFloat(autoavg);
            const telescore = teleavg === "N/A" ? -1 : parseFloat(teleavg);
            return {
                teamNumber :t.team_number, // 隊伍的號碼
                avragescore:score,        // 加總平均分
                autoavgscore:autoscore,  // 自動平均分
                teleavgscore:telescore  // 人動平均分 
            };
        });

        // 3. 渲染過濾後的 tuple
        renderCards(filteredTuples);
    });
}

let currentScoringTeam = "";

function togglePage() {
    const mainPage = document.getElementById('main-page');
    const scorePage = document.getElementById('score-page');
    const btn = document.getElementById('toggle-btn');

    if (scorePage.style.display === 'none' || scorePage.style.display === '') {
        // --- 開啟計分頁面 ---
        
        // 1. 重置所有狀態
        resetScoring();
        // 確保這裡進去時沒有預設隊伍 (除非是透過 quickSelectTeam 呼叫，那邊會自己設定)
        currentScoringTeam = ""; 

        // 2. 切換頁面顯示
        mainPage.style.display = 'none';
        scorePage.style.display = 'block';
        btn.innerText = '×';
        btn.classList.add('active');

        // 3. 只顯示「模式選擇區」
        document.getElementById('mode-selec-zone').style.setProperty('display', 'block', 'important');
        
        // 確保下拉選單可見
        const modeDropdown = document.getElementById('mode-selec');
        if (modeDropdown) {
            modeDropdown.style.display = 'block';
        }

    } else {
        // --- 關閉計分頁面 (回到主頁) ---
        mainPage.style.display = 'block';
        scorePage.style.display = 'none';
        btn.innerText = '+';
        btn.classList.remove('active');
        closeDetail(mainPage);
        
        // 清空全域狀態，避免下次快速計分出錯
        currentScoringTeam = "";
        selectedMatchMode = "";
        
        // 重新刷新主頁排名 (確保最新數據)
        Rankingteam(currentRankMode);
    }
}

function battle(){
    const mainPage = document.getElementById('main-page');
    const battlepage = document.getElementById('battle-page');
    const cardpage = document.getElementById('cardpage');
    const batleteam1page = document.getElementById('batle-team1-page');
    const batleteam2page = document.getElementById('batle-team2-page');
    const btn = document.getElementById('battle-btn');
    const dropdown1 = document.getElementById('battle-team-dropdown1');
    const dropdown2 = document.getElementById('battle-team-dropdown2');
    const info1 = document.getElementById('team1-info');
    const info2 = document.getElementById('team2-info');
   
    const propertypage = document.getElementById('batle-property-page');


    dropdown1.style.display ='block';
    dropdown2.style.display ='block';
    // 1. 重製下拉選單到預設狀態 
    dropdown1.selectedIndex = 0;
    dropdown2.selectedIndex = 0;

        // 2. 清空原本顯示隊伍資訊的文字區塊
    if (info1) info1.innerHTML = '';
    if (info2) info2.innerHTML = '';


    
    // 1. 先重置所有狀態
    resetScoring();


    // 2. 切換大頁面
        
        
    battlepage.style.display = 'block';


        
        
        
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

    dropdown1.onchange = function() {
        const selectedTeamNum = parseInt(this.value); // 取得選中的隊號
        
        // 從你現有的 AllTeamsList 陣列中找出那一隊的資料 [隊號, 分數]
        const teamData = AllTeamsList.find(tuple => tuple.teamNumber === selectedTeamNum);
        dropdown1.style.display='none';
        
       
        if (teamData) {
            const teamNum = teamData.teamNumber;
            const score = teamData.avragescore;
            const autoscore=teamData.autoavgscore;
            const telescore =teamData.teleavgscore;

            
            info1.innerHTML = `
                
                    <span style="font-size: 5em; font-weight: bold;">${teamNum}</span>
                    <span style="font-size: 4em;">${score === -1 ? 'N/A' : score.toFixed(1)}</span>
                    <span style="font-size: 4em;">${autoscore === -1 ? 'N/A' : autoscore.toFixed(1)}</span>
                    <span style="font-size: 4em;">${telescore === -1 ? 'N/A' : telescore.toFixed(1)}</span>
                
            `;
        }
    };

    // 第二個隊伍選單同理
    dropdown2.onchange = function() {
        const selectedTeamNum = parseInt(this.value);
        const teamData = AllTeamsList.find(tuple => tuple.teamNumber === selectedTeamNum);
        dropdown2.style.display='none';
        
        if (teamData) {
            const teamNum = teamData.teamNumber;
            const score = teamData.avragescore;
            const autoscore=teamData.autoavgscore;
            const telescore =teamData.teleavgscore;

            info2.innerHTML = `
                
                    <span style="font-size: 5em; font-weight: bold;">${teamNum}</span>
                    <span style="font-size: 4em;">${score === -1 ? 'N/A' : score.toFixed(1)}</span>
                    <span style="font-size: 4em;">${autoscore === -1 ? 'N/A' : autoscore.toFixed(1)}</span>
                    <span style="font-size: 4em;">${telescore === -1 ? 'N/A' : telescore.toFixed(1)}</span>
                
            `;
        }
    };





}

function bucket() {
    const bucketdropdown = document.getElementById('bucket-dropdown');
    const selectedTeamNum = parseInt(bucketdropdown.value);
    
    if (!selectedTeamNum) {
        alert("請選擇隊伍！");
        return;
    }

    // --- 關鍵修改：防止重複 ---
    // 檢查畫面上是否已經存在該隊伍的特定元素
    const existingCard = document.getElementById(`loc-${selectedTeamNum}-bucket`);
    if (existingCard) {
        alert(`${selectedTeamNum} 他媽已經在了是要多眼瞎了才選！`);
        return;
    }

    const container = document.getElementById('bucket-container');
    if (!container) return;

    const scoreObj = AllTeamsList.find(t => t.teamNumber === selectedTeamNum);
    const tbaObj = allTeams.find(t => t.team_number === selectedTeamNum) || {};

    if (!scoreObj) {
        alert("找不到隊伍數據。");
        return;
    }

    // 使用 += 增加卡片而不覆蓋舊的
    container.innerHTML += generateTeamCardHTML(scoreObj, tbaObj, true);

    // 啟動非同步細節更新 (這會處理名稱、學校、地址的抓取)
    fetchAndPopulateTeamData(selectedTeamNum, true);
}
function removebucTeam(teamNum) {
    // 找到對應的卡片節點
    const targetCard = document.querySelector(`.t:has(#loc-${teamNum}-bucket)`);;
    if (targetCard) {
        // 增加一個簡單的淡出效果（選配）
        targetCard.style.opacity = '0';
        targetCard.style.transform = 'scale(0.8)';
        
        setTimeout(() => {
            targetCard.remove();
        }, 200); // 0.2秒後真正移除
    }
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

    // --- 2. 靜態計分欄位重置 ---
    const sc = document.getElementById('static-climb');
    if(sc) sc.value = "0";

    const cp = document.getElementById('climb-position');
    if(cp) cp.value = ""; 

    const sf = document.getElementById('static-fuel');
    if(sf) (sf.tagName === "INPUT" ? sf.value = "0" : sf.innerText = "0");

    const rs = document.getElementById('Run_and_shoot');
    if(rs) rs.checked = false;

    const sr = document.getElementById('static-reporting');
    if(sr) sr.value = "";

    // --- 3. UI 顯示狀態重置 ---
    // 強制隱藏所有子區域
    const zones = ['team-select-zone', 'mode-selec-zone', 'static-section', 'actual-scoring-content','battle-page','bucket-page', 'batle-team1-page', 'batle-team2-page'];
    zones.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.setProperty('display', 'none', 'important'); 
    });
    
    // 重置模式選擇下拉選單
    const modeDropdown = document.getElementById('mode-selec');
    if(modeDropdown) {
        modeDropdown.selectedIndex = 0;
        
        // --- 修正：把之前可能被快速計分隱藏的 Battle/Bucket 選項顯示回來 ---
        Array.from(modeDropdown.options).forEach(option => {
            option.style.display = 'block';
        });
    }

    // 抹除計分頁面標題
    const h2Title = document.querySelector('#score-page h2');
    if (h2Title) {
        h2Title.innerText = ""; 
        h2Title.style.display = 'none';
    }

    // --- 4. 變數狀態重置 (重要) ---
    // 這裡不清空 currentScoringTeam，因為快速計分需要它。
    // currentScoringTeam 的清空由 saveAndExit 或 togglePage 負責。
}

function confirmTeam() {
    const dropdown = document.getElementById('team-dropdown');
    const selectedTeam = dropdown.value;
    
    if (!selectedTeam) {
        alert("請選擇隊伍！");
        return;
    }
    
    currentScoringTeam = selectedTeam;
    
    // 1. 隱藏隊伍選擇區
    document.getElementById('team-select-zone').style.setProperty('display', 'none', 'important');
    
    // 2. 顯示標題
    const h2Title = document.querySelector('#score-page h2');
    if (h2Title) {
        h2Title.innerText = `正在為 #${selectedTeam} 進行 ${selectedMatchMode === 'static' ? '靜態偵查' : '動態計分'}`;
        h2Title.style.display = 'block';
    }

    // 3. 根據先前選好的模式，顯示對應內容
    if (selectedMatchMode === 'static') {
        document.getElementById('static-section').style.setProperty('display', 'block', 'important');
    } else {
        document.getElementById('actual-scoring-content').style.setProperty('display', 'block', 'important');
    }
}

function quickSelectTeam(num) {
    const btn = document.getElementById('toggle-btn');
    const scorePage = document.getElementById('score-page');
    
    if (scorePage.style.display === 'none') {
        // 1. 先執行大掃除
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

        // --- 關鍵修改：過濾下拉選單選項 ---
        const modeDropdown = document.getElementById('mode-selec');
        if (modeDropdown) {
            // 遍歷所有選項，如果是 battle 或 bucket 就隱藏
            Array.from(modeDropdown.options).forEach(option => {
                if (option.value === 'battle' || option.value === 'bucket') {
                    option.style.display = 'none' ; // 隱藏
                } else {
                    option.style.display = 'block'; // 確保其他的（static/movement）有顯示
                }
            });
            // 重置到第一個選項 "請選擇模式"
            modeDropdown.selectedIndex = 0;
        }

        // 5. 顯示模式選擇區
        document.getElementById('team-select-zone').style.display = 'none';
        document.getElementById('mode-selec-zone').style.setProperty('display', 'block', 'important');

        btn.innerText = '×';
        btn.classList.add('active');
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

    if (!val) return;

    selectedMatchMode = val; // 紀錄模式
    console.log("已選擇模式:", selectedMatchMode);

    // 1. 隱藏模式選擇區
    document.getElementById('mode-selec-zone').style.setProperty('display', 'none', 'important');

    // --- 特殊模式處理 ---
    if (selectedMatchMode === "battle") {
        battle();
        return;
    } 
    
    if (selectedMatchMode === "bucket") {
        // Bucket 模式邏輯
        const bucketZone = document.getElementById('bucket-page');
        const bucketDropdown = document.getElementById('bucket-dropdown');
        
        // 顯示 Bucket 頁面 (這裡不需要顯示 team-select-zone，因為 Bucket 有自己的選單)
        bucketZone.style.setProperty('display', 'block', 'important');
        document.getElementById('team-select-zone').style.setProperty('display', 'none', 'important'); // 讓選單區塊顯示
        
        // --- 修正：清空舊選項，避免重複 ---
        bucketDropdown.innerHTML = '<option value="">恭迎皇帝選妃</option>';
        
        allTeams.forEach(t => {
            const opt = document.createElement('option');
            opt.value = t.team_number;
            opt.innerText = `#${t.team_number} - ${t.nickname || "無名稱"}`;
            bucketDropdown.appendChild(opt);
        });
        
        // Bucket 不需要進入 confirmTeam 流程
        return;
    }

    // --- 一般計分模式 (Static / Movement) ---

    // 判斷是否為「快速計分」 (currentScoringTeam 已經有值)
    if (currentScoringTeam && currentScoringTeam !== "") {
        // 🚀 直通車：跳過選隊伍，直接顯示計分欄位
        console.log("偵測到快速計分，跳過隊伍選擇");
        
        // 更新標題
        const h2Title = document.querySelector('#score-page h2');
        if (h2Title) {
            h2Title.innerText = `正在 ${selectedMatchMode === 'static' ? '質詢' : '視監'}#${currentScoringTeam}  `;
            h2Title.style.display = 'block';
        }

        // 直接顯示對應區塊
        if (selectedMatchMode === 'static') {
            document.getElementById('static-section').style.setProperty('display', 'block', 'important');
        } else {
            document.getElementById('actual-scoring-content').style.setProperty('display', 'block', 'important');
        }

    } else {
        //  一般流程：顯示隊伍選擇選單
        const teamZone = document.getElementById('team-select-zone');
        teamZone.style.setProperty('display', 'block', 'important');
        
        const teamDropdown = document.getElementById('team-dropdown');

        // --- 修正：清空舊選項，避免重複 ---
        teamDropdown.innerHTML = '<option value="">請選擇隊伍</option>';


        allTeams.forEach(t => {
            const opt = document.createElement('option');
            opt.value = t.team_number;
            opt.innerText = `#${t.team_number} - ${t.nickname || "無名稱"}`;
            teamDropdown.appendChild(opt);
        });
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
window.onload = async () => {
    // 1. 先跑一次同步，確保拿到了最新的賽事列表 (allevent)
    // 但要在 syncFromCloud 裡面加上判斷：如果 currentevent 是空的，就不要執行 Rankingteam
    await syncFromCloud();

    // 2. 每 30 秒自動從雲端拉取最新數據
    setInterval(() => {
        if (navigator.onLine) syncFromCloud();
    }, 30000);

    // 3. 每 60 秒檢查離線隊列
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