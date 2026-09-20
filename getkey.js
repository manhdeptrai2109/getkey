// Chú thích: getkey.js - gọi Worker /getkey + /check

const API_GETKEY = "https://tmanhios.pretty-pilot.workers.dev/getkey";
const API_CHECK  = "https://tmanhios.pretty-pilot.workers.dev/check";

let currentIP = "unknown";
let totalCount = 0;

// ============================================================
// Chú thích: lấy HWID trình duyệt
// ============================================================
function getHWID() {
    let hwid = localStorage.getItem("tmanhios_hwid");
    if (!hwid) {
        const arr = new Uint8Array(16);
        crypto.getRandomValues(arr);
        hwid = Array.from(arr).map(b => b.toString(16).padStart(2, "0")).join("");
        localStorage.setItem("tmanhios_hwid", hwid);
    }
    return hwid;
}

// ============================================================
// Chú thích: lấy IP
// ============================================================
async function fetchIP() {
    try {
        const r = await fetch("https://api.ipify.org?format=json");
        const j = await r.json();
        currentIP = j.ip || "unknown";
    } catch (e) {
        currentIP = "unknown";
    }
    const el = document.getElementById("ip-display");
    if (el) el.textContent = "IP: " + currentIP;
}

// ============================================================
// Chú thích: DOM
// ============================================================
const $tabGen    = document.getElementById("tab-gen");
const $tabAdmin  = document.getElementById("tab-admin");
const $viewGen   = document.getElementById("view-gen");
const $viewAdmin = document.getElementById("view-admin");

const $btnGet    = document.getElementById("btn-get");
const $btnCopy   = document.getElementById("btn-copy");
const $btnClear  = document.getElementById("btn-clear");
const $result    = document.getElementById("result");
const $count     = document.getElementById("count");

const $pasteKey  = document.getElementById("paste-key");
const $btnPaste  = document.getElementById("btn-paste");

const $checkKey    = document.getElementById("check-key");
const $btnCheck    = document.getElementById("btn-check");
const $checkResult = document.getElementById("check-result");

// ============================================================
// Chú thích: chuyển tab
// ============================================================
$tabGen.addEventListener("click", () => {
    $tabGen.classList.add("active");
    $tabAdmin.classList.remove("active");
    $viewGen.style.display = "";
    $viewAdmin.style.display = "none";
});

$tabAdmin.addEventListener("click", () => {
    $tabAdmin.classList.add("active");
    $tabGen.classList.remove("active");
    $viewGen.style.display = "none";
    $viewAdmin.style.display = "";
});

// ============================================================
// Chú thích: nút GET KEY - chỉ nhận link, không nhận key
// ============================================================
$btnGet.addEventListener("click", async () => {
    const hwid = getHWID();
    const oldText = $btnGet.textContent;
    $btnGet.textContent = "ĐANG LẤY...";
    $btnGet.disabled = true;

    try {
        const form = new FormData();
        form.append("hwid", hwid);

        const r = await fetch(API_GETKEY, { method: "POST", body: form });
        const j = await r.json();

        if (j.status === "success") {
            // Chú thích: mở link rút gọn
            window.open(j.link, "_blank");

            // Chú thích: KHÔNG hiển thị key
            // Hướng dẫn user vượt link + dán key
            $result.value =
                "=== HƯỚNG DẪN ===\n" +
                "1. Tab mới vừa mở → vượt link vuotnhanh\n" +
                "2. Vượt tiếp link link4m\n" +
                "3. Đến trang reveal → thấy key\n" +
                "4. Copy key\n" +
                "5. Quay lại đây → dán vào ô bên dưới → XÁC NHẬN\n" +
                "\nĐang chờ bạn vượt link...";

            $btnGet.textContent = j.cached ? "KEY CŨ" : "ĐANG VƯỢT LINK";
            setTimeout(() => { $btnGet.textContent = oldText; }, 2500);
        } else if (j.msg === "rate_limit") {
            alert("Bạn đã lấy key. Thử lại sau " + Math.floor(j.remain / 60) + " phút.");
            $btnGet.textContent = oldText;
        } else {
            alert("Lỗi: " + (j.msg || "không xác định"));
            $btnGet.textContent = oldText;
        }
    } catch (e) {
        alert("Không kết nối được server. Kiểm tra mạng.");
        $btnGet.textContent = oldText;
    } finally {
        $btnGet.disabled = false;
    }
});

// ============================================================
// Chú thích: nút XÁC NHẬN key sau khi vượt link
// ============================================================
$btnPaste.addEventListener("click", () => {
    const key = $pasteKey.value.trim();

    if (!key) {
        alert("Dán key vào ô trước");
        return;
    }

    const regex = /^TManhios\-(12hour|1hour|1day|7day|1month|forever)\-[A-Z0-9]{4,64}$/;
    if (!regex.test(key)) {
        alert("Key sai định dạng");
        return;
    }

    // Chú thích: xóa hướng dẫn, hiển thị key
    $result.value = key;

    totalCount = 1;
    $count.textContent = totalCount;

    $pasteKey.value = "";
});

// ============================================================
// Chú thích: nút COPY
// ============================================================
$btnCopy.addEventListener("click", () => {
    if (!$result.value) return;
    navigator.clipboard.writeText($result.value).then(() => {
        const old = $btnCopy.textContent;
        $btnCopy.textContent = "ĐÃ COPY";
        setTimeout(() => { $btnCopy.textContent = old; }, 1200);
    });
});

// ============================================================
// Chú thích: nút XÓA
// ============================================================
$btnClear.addEventListener("click", () => {
    $result.value = "";
    totalCount = 0;
    $count.textContent = 0;
});

// ============================================================
// Chú thích: nút KIỂM TRA KEY
// ============================================================
$btnCheck.addEventListener("click", async () => {
    const key = $checkKey.value.trim();

    if (!key) {
        $checkResult.innerHTML = '<p class="err">Nhập key cần kiểm tra.</p>';
        return;
    }

    const regex = /^TManhios\-(12hour|1hour|1day|7day|1month|forever)\-[A-Z0-9]{4,64}$/;
    if (!regex.test(key)) {
        $checkResult.innerHTML = '<p class="err">✗ Sai định dạng key</p>';
        return;
    }

    $checkResult.innerHTML = '<p>Đang kiểm tra...</p>';

    try {
        const form = new FormData();
        form.append("key", key);
        form.append("hwid", getHWID());

        const r = await fetch(API_CHECK, { method: "POST", body: form });
        const j = await r.json();

        if (j.status === "success") {
            let stateHtml = "";
            if (j.msg === "activated") stateHtml = '<span class="ok">Vừa kích hoạt lần đầu</span>';
            else if (j.msg === "valid") stateHtml = '<span class="ok">Đang hoạt động</span>';
            else if (j.msg === "alive") stateHtml = '<span class="ok">Key đang sống</span>';
            else stateHtml = '<span class="ok">' + j.msg + '</span>';

            let remainHtml = "";
            if (j.remain) remainHtml = "<p>Còn lại: " + formatRemain(j.remain) + "</p>";

            $checkResult.innerHTML =
                '<p class="ok">✓ KEY HỢP LỆ</p>' +
                "<p>Trạng thái: " + stateHtml + "</p>" +
                remainHtml;
        } else {
            const msgMap = {
                "invalid_key": "Key không tồn tại",
                "hwid_mismatch": "Key đã dùng trên thiết bị khác",
                "expired": "Key đã hết hạn",
                "missing_param": "Thiếu tham số"
            };
            const msg = msgMap[j.msg] || j.msg || "Lỗi không xác định";
            $checkResult.innerHTML = '<p class="err">✗ ' + msg + "</p>";
        }
    } catch (e) {
        $checkResult.innerHTML = '<p class="err">Không kết nối được server.</p>';
    }
});

// ============================================================
// Chú thích: format thời gian
// ============================================================
function formatRemain(ms) {
    if (ms <= 0) return "HẾT HẠN";
    const totalSec = Math.floor(ms / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    return String(h).padStart(2, "0") + ":" +
           String(m).padStart(2, "0") + ":" +
           String(s).padStart(2, "0");
}

// ============================================================
// Chú thích: chấm đỏ
// ============================================================
document.addEventListener("click", (e) => {
    const dot = document.createElement("div");
    dot.className = "click-dot";
    dot.style.left = e.clientX + "px";
    dot.style.top  = e.clientY + "px";
    document.body.appendChild(dot);
    setTimeout(() => dot.remove(), 3000);
});

// ============================================================
// Chú thích: khởi động
// ============================================================
fetchIP();
