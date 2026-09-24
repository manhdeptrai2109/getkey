// Chú thích: getkey.js - gọi Worker /getkey + /check

const API_GETKEY = "https://tmanhios.pretty-pilot.workers.dev/getkey";
const API_CHECK  = "https://tmanhios.pretty-pilot.workers.dev/check";

let currentIP = "unknown";
let totalCount = 0;

// Chú thích: HWID duy nhất cho trình duyệt
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

async function fetchIP() {
    try {
        const r = await fetch("https://api.ipify.org?format=json");
        const j = await r.json();
        currentIP = j.ip || "unknown";
    } catch (e) { currentIP = "unknown"; }
    const el = document.getElementById("ip-display");
    if (el) el.textContent = "IP: " + currentIP;
}

// ============================================================
// Chú thích: DOM
// ============================================================
const $tabGen    = document.getElementById("tab-gen");
const $tabCheck  = document.getElementById("tab-check");
const $viewGen   = document.getElementById("view-gen");
const $viewCheck = document.getElementById("view-check");

const $btnGet    = document.getElementById("btn-get");
const $btnCopy   = document.getElementById("btn-copy");
const $btnClear  = document.getElementById("btn-clear");
const $result    = document.getElementById("result");
const $count     = document.getElementById("count");

const $checkKey    = document.getElementById("check-key");
const $btnCheck    = document.getElementById("btn-check");
const $checkResult = document.getElementById("check-result");

// ============================================================
// Chú thích: CHUYỂN TAB
// ============================================================
$tabGen.addEventListener("click", () => {
    $tabGen.classList.add("active");
    $tabCheck.classList.remove("active");
    $viewGen.style.display = "";
    $viewCheck.style.display = "none";
});

$tabCheck.addEventListener("click", () => {
    $tabCheck.classList.add("active");
    $tabGen.classList.remove("active");
    $viewGen.style.display = "none";
    $viewCheck.style.display = "";
});

// ============================================================
// Chú thích: NÚT GET KEY - mở link vượt, KHÔNG hiện key
// ============================================================
$btnGet.addEventListener("click", async () => {
    const hwid = getHWID();
    const oldText = $btnGet.textContent;
    $btnGet.textContent = "ĐANG LẤY...";
    $btnGet.disabled = true;

    let newTab = null;
    try { newTab = window.open("about:blank", "_blank"); } catch (e) { newTab = null; }

    try {
        const form = new FormData();
        form.append("hwid", hwid);

        const r = await fetch(API_GETKEY, { method: "POST", body: form });
        const j = await r.json();

        if (j.status === "success") {
            if (newTab && !newTab.closed) {
                newTab.location.href = j.link;
            } else {
                location.href = j.link;
            }

            $result.value = "Đã mở link vượt. Vui lòng vượt link để nhận key.\nSau khi vượt xong, key sẽ hiện ở trang reveal.";

            totalCount++;
            $count.textContent = totalCount;

            if (j.cached) {
                $btnGet.textContent = "KEY CŨ (CÒN HẠN)";
            } else {
                $btnGet.textContent = "ĐÃ LẤY";
            }
            setTimeout(() => { $btnGet.textContent = oldText; }, 2000);
        } else {
            if (newTab && !newTab.closed) newTab.close();
            alert("Lỗi: " + (j.msg || "không xác định"));
            $btnGet.textContent = oldText;
        }
    } catch (e) {
        if (newTab && !newTab.closed) newTab.close();
        alert("Không kết nối được server. Kiểm tra mạng.");
        $btnGet.textContent = oldText;
    } finally {
        $btnGet.disabled = false;
    }
});

$btnCopy.addEventListener("click", () => {
    if (!$result.value) return;
    navigator.clipboard.writeText($result.value).then(() => {
        const old = $btnCopy.textContent;
        $btnCopy.textContent = "ĐÃ COPY";
        setTimeout(() => { $btnCopy.textContent = old; }, 1200);
    });
});

$btnClear.addEventListener("click", () => {
    $result.value = "";
    totalCount = 0;
    $count.textContent = 0;
});

// ============================================================
// Chú thích: NÚT KIỂM TRA KEY
// ============================================================
$btnCheck.addEventListener("click", async () => {
    const key = $checkKey.value.trim();

    if (!key) {
        $checkResult.innerHTML = '<p class="err">Nhập key cần kiểm tra.</p>';
        return;
    }

    const regex = /^TManhios\-(6hour|12hour|1hour|1day|7day|1month|forever)\-[A-Z0-9]{4,64}$/;
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
                "missing_param": "Thiếu tham số",
                "seller_deleted": "Seller đã bị xóa",
                "seller_disabled": "Seller đã bị khóa",
                "seller_expired": "Seller đã hết hạn thuê"
            };
            const msg = msgMap[j.msg] || j.msg || "Lỗi không xác định";
            $checkResult.innerHTML = '<p class="err">✗ ' + msg + '</p>';
        }
    } catch (e) {
        $checkResult.innerHTML = '<p class="err">Không kết nối được server.</p>';
    }
});

// ============================================================
// Chú thích: FORMAT THỜI GIAN
// ============================================================
function formatRemain(ms) {
    if (ms <= 0) return "HẾT HẠN";
    const totalSec = Math.floor(ms / 1000);
    const d = Math.floor(totalSec / 86400);
    const h = Math.floor((totalSec % 86400) / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    if (d > 0) return d + "N " + h + "H " + m + "M";
    return String(h).padStart(2, "0") + ":" +
           String(m).padStart(2, "0") + ":" +
           String(s).padStart(2, "0");
}

// ============================================================
// Chú thích: CHẤM ĐỎ KHI CLICK
// ============================================================
document.addEventListener("click", (e) => {
    const dot = document.createElement("div");
    dot.className = "click-dot";
    dot.style.left = e.clientX + "px";
    dot.style.top  = e.clientY + "px";
    document.body.appendChild(dot);
    setTimeout(() => dot.remove(), 3000);
});

fetchIP();
