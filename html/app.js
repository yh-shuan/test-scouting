function saveData(data) {
    if (navigator.onLine) {
        // 有網路：直接傳 Firebase
        uploadToFirebase(data);
    } else {
        // 沒網路：存進 LocalStorage，等有網路再傳
        const pending = JSON.parse(localStorage.getItem('pendingRecords') || '[]');
        pending.push(data);
        localStorage.setItem('pendingRecords', JSON.stringify(pending));
        alert('目前離線，數據已暫存於本地！');
    }
}