// ฟังก์ชันอ่านค่าเลขโต๊ะจาก URL เมื่อลูกค้าสแกน QR Code เข้ามา (เช่น index.html?table=3)
document.addEventListener("DOMContentLoaded", () => {
    const urlParams = new URLSearchParams(window.location.search);
    const tableParam = urlParams.get('table');
    
    if (tableParam) {
        const tableSelect = document.getElementById('table-num');
        if (tableSelect) {
            tableSelect.value = tableParam;
        }
    }
});