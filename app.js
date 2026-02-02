// 儲存資料的核心入口
function saveData(data) {
    // 無論有無網路，一律先存入本地
    const pending = JSON.parse(localStorage.getItem('pendingRecords') || '[]');
    pending.push(data);
    localStorage.setItem('pendingRecords', JSON.stringify(pending));

    // 嘗試上傳
    processQueue();
}

// 處理隊列：把暫存資料傳到 Google Sheets
async function processQueue() {
    // 檢查有沒有網路，沒網路就直接結束
    if (!navigator.onLine) {
        console.log("離線中，稍後同步...");
        updateSyncStatus();
        return;
    }

    let pending = JSON.parse(localStorage.getItem('pendingRecords') || '[]');
    if (pending.length === 0) {
        updateSyncStatus();
        return;
    }

    // 逐筆傳送
    for (const record of [...pending]) {
        try {
            await fetch(GOOGLE_SHEET_URL, {
                method: "POST",
                mode: "no-cors",
                body: JSON.stringify(record)
            });

            // 成功後從 pending 中刪除
            pending = pending.filter(item => item.id !== record.id);
            localStorage.setItem('pendingRecords', JSON.stringify(pending));
            console.log(`同步成功: ${record.id}`);
        } catch (e) {
            console.error("傳送失敗，中止本次同步", e);
            break; 
        }
    }
    updateSyncStatus();
}

// 更新主頁上的同步狀態顯示
function updateSyncStatus() {
    const statsElem = document.getElementById('search-stats');
    if (!statsElem) return;
    
    const pending = JSON.parse(localStorage.getItem('pendingRecords') || '[]');
    const pendingCount = pending.length;

    if (pendingCount > 0) {
        statsElem.innerHTML = `同步中... <span style="color:#e67e22; font-weight:bold;">(剩餘 ${pendingCount} 筆待傳)</span>`;
    } else {
        statsElem.innerHTML = `✅ 所有數據已同步 (共 ${allScoresRaw.length} 筆)`;
    }
}

// 自動監測：當網路回來時立刻上傳
window.addEventListener('online', processQueue);
// 每分鐘自動檢查一次
setInterval(processQueue, 60000);