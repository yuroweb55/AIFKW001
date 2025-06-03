

const socket = io();

const echousertofkw = document.getElementById("echousertofkw");
const timeg = document.getElementById("timeg");
const video = document.getElementById('video');

socket.on('connect', () => {
    socket.emit('R', 1); 
});

socket.on('R', (data) => {
    echousertofkw.innerHTML=""
    data.forEach(e => {
        newusertofkw(e);
    });
});

socket.on('frame', (e) => {
    video.src = 'data:image/jpeg;base64,' + e;
});
socket.on('frame-cropped', (e) => {
    newusertofkw(e);
});

socket.on('delete-st', (e) => {
    document.getElementById("HHF-"+e).remove();
});




function newusertofkw(e){
    const div = document.createElement("div");
    div.style.padding = "0 20px";
    div.style.marginTop = "10px";
    div.innerHTML = `
    <div class="d-flex align-items-center p-2 bg-white">
        <div class="d-flex align-items-center">
            <img width="100" src="data:image/jpeg;base64,${e.image}">
            :
            <img width="100" src="/imgst?id=${e.daus.studentid}">
        </div>
        
        <div style="padding-left: 10px;text-align: left;">
            <span style="font-size: 1.4rem">${e.daus.name}</span><br>
            <span>รหัส:${e.daus.studentid} ห้อง:${e.daus.room} เวลา:${e.time}</span>
        </div>
    </div>
    `;
    div.id="HHF-"+e.daus.studentid;
    echousertofkw.prepend(div);
}

function updateTime() {
    timeg.textContent = new Date().toLocaleString('th-TH', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit', 
        hour12: false,
        timeZone: 'Asia/Bangkok' 
    });
}
updateTime();
setInterval(updateTime, 500);


// ฟังก์ชันเพื่อเปิดเว็บในโหมดเต็มจอ
function openFullscreen() {
    const element = document.documentElement; // หรือเลือก <body> หรือ div อื่นๆ ได้
    if (element.requestFullscreen) {
        element.requestFullscreen();
    } else if (element.mozRequestFullScreen) { // Firefox
        element.mozRequestFullScreen();
    } else if (element.webkitRequestFullscreen) { // Chrome, Safari, Opera
        element.webkitRequestFullscreen();
    } else if (element.msRequestFullscreen) { // IE/Edge
        element.msRequestFullscreen();
    }
}

// เปิดโหมดเต็มจอเมื่อโหลดหน้าเว็บ
window.onload = function() {
    //openFullscreen();
};





