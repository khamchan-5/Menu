import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyBuSEbFvAoU3Z9X3LktX_SlIm6EMHRRtsg",
    authDomain: "my-restaurant-3da21.firebaseapp.com",
    databaseURL: "https://my-restaurant-3da21-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "my-restaurant-3da21",
    storageBucket: "my-restaurant-3da21.firebasestorage.app",
    messagingSenderId: "932377209963",
    appId: "1:932377209963:web:7265ed2f8ae8609166d52e",
    measurementId: "G-77GR4JMMW9"
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// ดึงรายการออเดอร์ทั้งหมดที่สถานะเป็น 'paid'
const ordersRef = ref(database, 'orders');
onValue(ordersRef, (snapshot) => {
    const data = snapshot.val();
    const tbody = document.getElementById('history-table-body');
    tbody.innerHTML = '';

    let totalRevenue = 0;
    let paidOrdersCount = 0;

    if (data) {
        const paidOrders = Object.entries(data)
            .map(([id, order]) => ({ id, ...order }))
            .filter(order => order.status === 'paid')
            .reverse(); // เอาออเดอร์ล่าสุดขึ้นก่อน

        paidOrdersCount = paidOrders.length;

        if (paidOrdersCount > 0) {
            paidOrders.forEach(order => {
                const total = Number(order.total || 0);
                totalRevenue += total;

                // รวมรายการเมนูเป็นข้อความเดียว
                const itemsSummary = order.items
                    .map(i => `${i.name} (${i.quantity})`)
                    .join(', ');

                tbody.innerHTML += `
                    <tr>
                        <td style="color:#64748b; font-size:0.9rem;">${order.createdAt || '-'}</td>
                        <td><strong>โต๊ะ ${order.table}</strong></td>
                        <td style="max-width:300px;">${itemsSummary}</td>
                        <td style="font-weight:bold; color:#10b981;">${total.toLocaleString()} กีบ</td>
                        <td><span class="badge-paid">ชำระเงินแล้ว</span></td>
                    </tr>
                `;
            });
        } else {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:#94a3b8; padding:30px;">ยังไม่มีประวัติการชำระเงิน</td></tr>`;
        }
    } else {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:#94a3b8; padding:30px;">ไม่พบข้อมูลออเดอร์</td></tr>`;
    }

    // อัปเดตยอดสรุปรวมด้านบน
    document.getElementById('total-revenue').innerText = `${totalRevenue.toLocaleString()} กีบ`;
    document.getElementById('total-orders-count').innerText = `${paidOrdersCount} รายการ`;
});