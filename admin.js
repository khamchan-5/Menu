import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getDatabase, ref, onValue, update, push, remove } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js";

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

// ----------------------------------------------------
// 🔑 ระบบจัดการ PIN และเสียงประกอบ
// ----------------------------------------------------
const CORRECT_PIN = "1234"; // 📌 ตั้งค่ารหัสผ่านที่นี่
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playSound(type) {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    const now = audioCtx.currentTime;

    if (type === 'new_order') { // เสียงกระดิ่งเมื่อออเดอร์ใหม่เข้า
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, now);
        osc.frequency.setValueAtTime(659.25, now + 0.15);
        osc.frequency.setValueAtTime(783.99, now + 0.3);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
        osc.start(now);
        osc.stop(now + 0.6);
    } else if (type === 'success') { // เสียงผ่าน
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.setValueAtTime(880, now + 0.1);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        osc.start(now);
        osc.stop(now + 0.25);
    } else if (type === 'error') { // เสียงผิด
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(180, now);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.2);
    }
}

// ตรวจสอบ PIN
document.getElementById('btn-login-pin').onclick = checkPin;
document.getElementById('pin-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') checkPin();
});

function checkPin() {
    const input = document.getElementById('pin-input').value;
    if (input === CORRECT_PIN) {
        playSound('success');
        document.getElementById('pin-modal').style.display = 'none';
        document.getElementById('main-content').style.display = 'block';
    } else {
        playSound('error');
        document.getElementById('pin-error').innerText = 'รหัสผ่านไม่ถูกต้อง!';
        document.getElementById('pin-input').value = '';
    }
}

document.getElementById('btn-lock').onclick = function() {
    document.getElementById('main-content').style.display = 'none';
    document.getElementById('pin-modal').style.display = 'flex';
    document.getElementById('pin-input').value = '';
    document.getElementById('pin-error').innerText = '';
};

// ----------------------------------------------------
// 📋 ระบบดึงออเดอร์ Realtime
// ----------------------------------------------------
let firstLoadOrders = true;
let lastOrderCount = 0;

const ordersRef = ref(database, 'orders');
onValue(ordersRef, (snapshot) => {
    const data = snapshot.val();
    const container = document.getElementById('admin-orders-list');
    container.innerHTML = '';

    let pendingCount = 0;
    let servedCount = 0;
    let todayTotalSales = 0;

    if (data) {
        const orderEntries = Object.entries(data);
        
        // เล่นเสียงเมื่อมีออเดอร์ใหม่เข้ามาเพิ่ม
        if (!firstLoadOrders && orderEntries.length > lastOrderCount) {
            playSound('new_order');
        }
        firstLoadOrders = false;
        lastOrderCount = orderEntries.length;

        let activeOrdersCount = 0;

        orderEntries.reverse().forEach(([id, order]) => {
            if (order.status === 'paid') {
                todayTotalSales += Number(order.total || 0);
                return;
            }

            activeOrdersCount++;
            if (order.status === 'pending' || order.status === 'cooking') pendingCount++;
            if (order.status === 'served') servedCount++;

            let itemsHtml = order.items.map(i => `
                <li>
                    <span>${i.name} x <strong>${i.quantity}</strong></span>
                    <span style="color:#64748b;">${(i.price * i.quantity).toLocaleString()} กีบ</span>
                </li>
            `).join('');

            let statusBadge = '';
            let borderClass = '';
            if (order.status === 'pending') {
                statusBadge = '<span style="background:#fef3c7; color:#d97706; padding:3px 8px; border-radius:6px; font-weight:bold; font-size:0.8rem;">⏳ รอยืนยัน</span>';
                borderClass = 'pending-border';
            } else if (order.status === 'cooking') {
                statusBadge = '<span style="background:#e0f2fe; color:#0284c7; padding:3px 8px; border-radius:6px; font-weight:bold; font-size:0.8rem;">👨‍🍳 กำลังทำ</span>';
                borderClass = 'cooking-border';
            } else if (order.status === 'served') {
                statusBadge = '<span style="background:#dcfce7; color:#15803d; padding:3px 8px; border-radius:6px; font-weight:bold; font-size:0.8rem;">✅ เสิร์ฟแล้ว</span>';
                borderClass = 'served-border';
            }

            container.innerHTML += `
                <div class="order-card ${borderClass}">
                    <div class="order-header">
                        <div style="display:flex; align-items:center; gap:8px;">
                            <span class="table-badge">โต๊ะ ${order.table}</span>
                            ${statusBadge}
                        </div>
                        <small style="color:#94a3b8;">${order.createdAt || ''}</small>
                    </div>

                    <ul class="order-item-list">${itemsHtml}</ul>

                    <div style="display:flex; justify-content:space-between; align-items:center; font-weight:bold; margin-top:10px; font-size:1.05rem;">
                        <span>ราคารวมออเดอร์นี้:</span>
                        <span style="color:#10b981;">${Number(order.total).toLocaleString()} กีบ</span>
                    </div>

                    <div class="action-grid">
                        <button class="btn-act btn-cook" onclick="updateOrderStatus('${id}', 'cooking')">👨‍🍳 กำลังทำอาหาร</button>
                        <button class="btn-act btn-serve" onclick="updateOrderStatus('${id}', 'served')">✅ ส่งอาหารเสร็จแล้ว</button>
                        <button class="btn-act btn-pay" onclick="markAsPaid('${id}')">💳 เช็คบิล / รับเงิน (ปิดยอด)</button>
                    </div>
                </div>
            `;
        });

        if (activeOrdersCount === 0) {
            container.innerHTML = '<p style="text-align:center; color:#94a3b8; padding:30px 0;">🎉 ไม่มีออเดอร์ค้างอยู่ขณะนี้</p>';
        }
    } else {
        container.innerHTML = '<p style="text-align:center; color:#94a3b8; padding:30px 0;">ยังไม่มีออเดอร์เข้ามาในระบบ</p>';
    }

    document.getElementById('stat-pending-count').innerText = `${pendingCount} รายการ`;
    document.getElementById('stat-served-count').innerText = `${servedCount} รายการ`;
    document.getElementById('stat-today-total').innerText = `${todayTotalSales.toLocaleString()} กีบ`;
});

window.updateOrderStatus = function(orderId, status) {
    update(ref(database, `orders/${orderId}`), { status: status });
};

window.markAsPaid = function(orderId) {
    if (confirm("ยืนยันการรับชำระเงินรายการนี้หรือไม่?")) {
        update(ref(database, `orders/${orderId}`), { status: 'paid' });
    }
};

// แจ้งเตือนเรียกพนักงาน
const notifRef = ref(database, 'notifications');
onValue(notifRef, (snapshot) => {
    const data = snapshot.val();
    const container = document.getElementById('admin-notifications-list');
    container.innerHTML = '';

    if (data) {
        Object.entries(data).reverse().forEach(([id, notif]) => {
            container.innerHTML += `
                <div class="notif-card">
                    <div><strong>${notif.message}</strong></div>
                    <button style="background:#ef4444; color:white; border:none; padding:6px 12px; border-radius:6px; cursor:pointer; font-weight:bold;" onclick="clearNotif('${id}')">รับทราบ</button>
                </div>
            `;
        });
    } else {
        container.innerHTML = '<p style="text-align:center; color:#94a3b8; margin:0;">ไม่มีการแจ้งเตือนใหม่</p>';
    }
});

window.clearNotif = function(id) {
    remove(ref(database, `notifications/${id}`));
};

// จัดการเมนู
document.getElementById('add-menu-form').onsubmit = function(e) {
    e.preventDefault();
    const name = document.getElementById('menu-name').value;
    const price = Number(document.getElementById('menu-price').value);
    const category = document.getElementById('menu-category').value;
    const image = document.getElementById('menu-image').value;

    push(ref(database, 'menus'), { name, price, category, image, status: 'available' }).then(() => {
        alert('✅ เพิ่มเมนูสำเร็จ');
        document.getElementById('add-menu-form').reset();
    });
};

const menuRef = ref(database, 'menus');
onValue(menuRef, (snapshot) => {
    const data = snapshot.val();
    const container = document.getElementById('admin-menu-list');
    container.innerHTML = '';

    if (data) {
        Object.entries(data).forEach(([id, item]) => {
            const isOut = item.status === 'out_of_stock';
            container.innerHTML += `
                <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px solid #f1f5f9;">
                    <div>
                        <strong>${item.name}</strong><br>
                        <small style="color:#64748b;">${Number(item.price).toLocaleString()} กีบ</small>
                    </div>
                    <div style="display:flex; gap:5px;">
                        <button style="background:${isOut ? '#10b981' : '#f59e0b'}; color:white; border:none; padding:4px 8px; border-radius:4px; cursor:pointer; font-size:0.75rem;"
                            onclick="toggleMenuStatus('${id}', '${isOut ? 'available' : 'out_of_stock'}')">
                            ${isOut ? 'เปิดขาย' : 'ของหมด'}
                        </button>
                        <button style="background:#ef4444; color:white; border:none; padding:4px 8px; border-radius:4px; cursor:pointer; font-size:0.75rem;"
                            onclick="deleteMenu('${id}')">ลบ</button>
                    </div>
                </div>
            `;
        });
    }
});

window.toggleMenuStatus = function(id, status) { update(ref(database, `menus/${id}`), { status: status }); };
window.deleteMenu = function(id) { if(confirm('ลบเมนูนีหรือไม่?')) remove(ref(database, `menus/${id}`)); };