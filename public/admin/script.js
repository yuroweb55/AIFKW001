

// DOM Elements
const sidebar = document.getElementById('sidebar');
const mobileToggle = document.getElementById('mobile-toggle');
const navLinks = document.querySelectorAll('.nav-link');
const pages = document.querySelectorAll('.page');
const studentModal = document.getElementById('student-modal');
const studentForm = document.getElementById('student-form');
const studentsList = document.getElementById('students-list');
const studentsListH = document.getElementById('students-listH');
const studentSearch = document.getElementById('student-search');
const attendanceDate = document.getElementById('attendance-date');
const attendanceList = document.getElementById('attendance-list');
const passwordForm = document.getElementById('password-form');
const toast = document.getElementById('toast');
const Icctvoverlay = document.getElementById('Icctv-overlay');
const studentInput = document.getElementById('student-id');
const studentupload = document.getElementById('student-upload');
const studentimg = document.getElementById('student-img');
const studentuploadb = document.getElementById('student-upload-b');
const studentuploadbs = document.getElementById('student-upload-bs');
const studentname = document.getElementById('student-name');
const studentroom1 = document.getElementById('student-room1');
const studentroom2 = document.getElementById('student-room2');
const spinner = document.getElementById("spinb");
const currentdate = document.getElementById("current-date");
const totalstudents = document.getElementById('total-students');
const attendancetotal = document.getElementById('attendance-total');
const attendancelisth = document.getElementById('attendance-list-h');
const attendancepresent = document.getElementById('attendance-present');
const attendanceabsent = document.getElementById('attendance-absent');
const presenttoday = document.getElementById('present-today');
const markallpresent = document.getElementById('mark-all-present');
const markallabsent = document.getElementById('mark-all-absent');
const attendancesearch = document.getElementById('attendance-search');





const socket = io();




let dataStudent = [];
let toRfkw = [];
let Dget= {};
let Pagepath="";
let kogfdohdfgkdofo = false;
let opEditSd="";
let FTmarkAll=true;





socket.on('frame', (e) => {
   if(Pagepath==="dashboard") Icctvoverlay.src = 'data:image/jpeg;base64,' + e;
});
socket.on('frame-cropped', (e) => {
    toRfkw.push({
        idsd: e.daus.studentid,
        name: e.daus.name,
        room: e.daus.room,
        time: e.time,
    });
    Dget.toschool++;
    TTsbtofkw();
    markAll(FTmarkAll)
});

window.onpopstate = function(event) {
   CKPage(1)
};



function CKPage(a){
    let IIIpath = window.location.pathname.split('/').pop();
    if(IIIpath==="") IIIpath="dashboard";
    showPage(IIIpath,a);
    navLinks.forEach(nav => nav.classList.remove('active'));
    navLinks.forEach(link => {
        const page = link.getAttribute('data-page');
        if(page===IIIpath){
            link.classList.add('active');
        }
    });
}













// Initialize Application
document.addEventListener('DOMContentLoaded', function() {
    CKPage();
    setupEventListeners();
});

// Navigation
function showPage(pageId,a) {
    if (pageId === 'logout') return window.location.href = './logout';

    Pagepath=pageId;
    if(!a) history.pushState(null, '', `./${pageId}`);
    pages.forEach(page => page.classList.remove('active'));
    document.getElementById(pageId + '-page').classList.add('active');
    document.title=`Admin ${pageId.charAt(0).toUpperCase() + pageId.slice(1)} - Manage AI systems`;
    // Update page-specific conten

    if (pageId === 'dashboard') {
        updateDashboardStats();
    }
    if (pageId === 'students') {
        renderStudents();
    }
    if (pageId === 'attendance') {
        renderAttendance();
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
}








// Dashboard Functions
function updateDashboardStats() {
    $.post('api/get', {}, function(e) {
        Dget=e;
        TTsbtofkw();
    }).fail((e)=>{
        showToast('server มีปัญหาในการทำงาน', 'error');
    });

}

// Student Management Functions
function openAddStudentModal() {
    kogfdohdfgkdofo=true;
    studentimg.src = '';
    document.getElementById('modal-title').textContent = 'Add Student';
    studentForm.reset();
    studentModal.classList.add('active');
}

function openEditStudentModal(idsd) {
    kogfdohdfgkdofo=false;
    opEditSd=idsd;
    const e = dataStudent.find(i=>i.idsd==idsd);
    document.getElementById('modal-title').textContent = 'Edit Student';
    
    studentInput.value = e.idsd;
    studentimg.src = `/imgst?id=${e.idsd}`;
    studentname.value = e.name;
    studentroom1.value = e.room.split('/')[0];
    studentroom2.value = e.room.split('/')[1];

    
    studentModal.classList.add('active');
}


function closeModal() {
    studentModal.classList.remove('active');
}

function handleStudentSubmit(e) {
    e.preventDefault();

    // ตรวจสอบค่าก่อน
    if (kogfdohdfgkdofo && studentupload.files.length === 0)
        return showToast('คุณยังไม่ได้เพิ่มรูปภาพ', 'error');

    if (studentInput.value === "" || studentInput.value === "00000")
        return showToast('คุณยังไม่ได้ใส่รหัสนักเรียน', 'error');

    if (studentname.value === "")
        return showToast('คุณยังไม่ได้ใส่ชื่อนักเรียน', 'error');

    if (studentroom1.value === "not" || studentroom2.value === "not")
        return showToast('คุณยังไม่ได้เพิ่มเลือกชั้นเรียน', 'error');

    const file = studentupload.files[0];

    if (file) {
        const reader = new FileReader();
        reader.onload = function (event) {
            const base64String = event.target.result.split(',')[1]; // แค่ base64
            sendStudentData(base64String);
        };
        reader.readAsDataURL(file);
    } else {
        // ถ้าไม่มีรูป ให้ส่งค่า "not." แทน
        sendStudentData("not.");
    }

    function sendStudentData(imgBase64) {
        lomain(true);
        $.post('api/save-sdm', {
            id: studentInput.value,
            name: studentname.value,
            room: `${studentroom1.value}/${studentroom2.value}`,
            img: imgBase64,
            tyen: kogfdohdfgkdofo?"1":"0",
        }, function (e) {
            lomain(false);
            if(e.status===200){
                if(kogfdohdfgkdofo){
                    dataStudent.push({
                        idsd: studentInput.value,
                        name: studentname.value,
                        room: `${studentroom1.value}/${studentroom2.value}`,
                    })
                    Dget.quantity++;
                    TTsbtofkw();
                }
                showToast(e.text, 'success');
                closeModal();
                renderStudents(); //--
            }else{
                showToast(e.text, 'error');
            }
            
        }).fail(function() {
            showToast('server มีปัญหาในการทำงาน', 'error');
        });
    }
}




function deleteStudent(idsd) {
    const e = dataStudent.find(i=>i.idsd==idsd);
    swal({
        title: "คุณแน่ใจหรือไม่?",
        text: `คุณต้องการลบ "${e.name}" ออกจากระบบจริง ๆ หรือไม่?`,
        icon: "warning",
        buttons: ["ยกเลิก", "ลบจริง"],
        dangerMode: true,
    }).then((willDelete) => {
        if (willDelete) {
            lomain(true);
            $.post('api/delete-sdm', {idsd}, function (e) {
                lomain(false);
                if(e.status===200){
                    dataStudent = dataStudent.filter(i => i.idsd != idsd);
                    showToast(e.text, 'success');
                    renderStudents(); //--
                    Dget.quantity--;
                    TTsbtofkw();
                }else{
                    showToast(e.text, 'error');
                }
                
            }).fail(function() {
                showToast('server มีปัญหาในการทำงาน', 'error');
            });
        }
    });
}


function renderStudents() {
    const keyword = studentSearch.value.toLowerCase();
    
    if(dataStudent.length>0){
        RR();
    }else{
        $.post('api/getStudent', {searchTerm:""}, function(json) {
            dataStudent=json;
            RR();
        }).fail((e)=>{
            showToast('server มีปัญหาในการทำงาน', 'error');
        });
    }
    

    function RR(){
        const json = dataStudent.filter(item =>
            item.idsd.includes(keyword) ||
            item.name.toLowerCase().includes(keyword) ||
            item.room.includes(keyword)
        );

        if (json.length === 0) {
            studentsList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-users"></i>
                    <p>No students found</p>
                </div>
            `;
            return;
        }
        studentsListH.innerHTML=`Students (${json.length})`;
        studentsList.innerHTML="";
        const IIfde = Math.floor(Math.random() * 900) + 100;
        json.forEach(e => {
            const div = document.createElement("div");
            div.classList ="student-item"
            div.innerHTML=`
                    <div class="student-info">
                        <div class="d-flex align-items-center p-2 bg-white">
                        <div class="d-flex align-items-center">
                            <img width="100" src="/imgst?id=${e.idsd}&${IIfde}" loading="lazy">
                        </div>
                        
                        <div style="padding-left: 10px;text-align: left;">
                            <span style="font-size: 1.4rem">${e.name}</span><br>
                            <span>รหัส:${e.idsd} ห้อง:${e.room}</span>
                        </div>
                    </div>
                    </div>
                    <div class="student-actions">
                        <button class="btn btn-outline btn-sm" onclick="openEditStudentModal('${e.idsd}')">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        <button class="btn btn-outline btn-sm" style="color: #ef4444; border-color: #ef4444;" onclick="deleteStudent('${e.idsd}')">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </div>
            `;
            studentsList.appendChild(div);
        });
    }


}



function TTsbtofkw(){
    const e = Dget;
    
    totalstudents.textContent = e.quantity;
    attendancetotal.textContent = e.quantity;

    attendancepresent.textContent = e.toschool;
    presenttoday.textContent = e.toschool;
    
    attendanceabsent.textContent = e.quantity - e.toschool;
}



function markAll(r){
    FTmarkAll=r;
    
    function q(d,keyword){
        if(keyword==="") return d;
        return d.filter(item =>
            item.idsd.includes(keyword) ||
            item.name.toLowerCase().includes(keyword) ||
            item.room.includes(keyword)
        );
    }

    
    if(r){
        markallpresent.textContent="คนที่มาแล้ว✔️"; 
        markallabsent.textContent="คนที่ไม่มา";

        attendanceList.innerHTML="";
        RRrenderAttendance(q(toRfkw,attendancesearch.value),r);

    }else{
        markallpresent.textContent="คนที่มาแล้ว"; 
        markallabsent.textContent="คนที่ไม่มา✔️"; 
        attendanceList.innerHTML="";

        const jsA=dataStudent.map(e=>{return e.idsd});
        const jsB=toRfkw.map(e=>{return e.idsd});
        const added =jsA.filter(item => !jsB.includes(item)).map(e=>{
            return dataStudent.find(i=>i.idsd==e)
        });
    
       RRrenderAttendance(q(added,attendancesearch.value),r);
    }
}


function renderAttendance() {
    
    const [year, month, day] = attendanceDate.value.split('-');
    const selectedDate = `${parseInt(day)}/${parseInt(month)}/${Number(year)+543}`;

    if(dataStudent.length>0){
        RR();
    }else{
        $.post('api/getStudent', {searchTerm:""}, function (json) {
            dataStudent=json;
            RR();
        }).fail(function() {
            showToast('server มีปัญหาในการทำงาน', 'error');
        });
    }
    
    function RR(){
        
        $.post('api/get-attendance', {day:selectedDate}, function (json) {
            
            if (json.length === 0) {
                attendanceList.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-calendar-check"></i>
                        <p>No students found</p>
                    </div>
                `;
                return;
            }
            attendancelisth.textContent='Attendance for '+selectedDate;

            Dget.quantity=json.quantity;
            Dget.toschool=json.data.length;
            TTsbtofkw();
            toRfkw=json.data
            attendanceList.innerHTML="";
            RRrenderAttendance(toRfkw,true);
                    
        }).fail(function() {
            showToast('server มีปัญหาในการทำงาน', 'error');
        });
    }
}

function RRrenderAttendance(data,r){
    const IIfde = Math.floor(Math.random() * 900) + 100;
    data.forEach(e => {
        const div = document.createElement("div");
        div.classList ="attendance-item"
        div.innerHTML=`
            <div class="student-info">
                <div class="d-flex align-items-center p-2 bg-white">
                     <div class="d-flex align-items-center">
                        <img width="100" src="/imgst?id=${e.idsd}&${IIfde}" loading="lazy">
                    </div>
                            
                    <div style="padding-left: 10px;text-align: left;">
                        <span style="font-size: 1.4rem">${e.name}</span><br>
                        <span>รหัส:${e.idsd} ห้อง:${e.room}</span><br>
                        <span>${r?`<b>เข้ามาเวลา:</b> ${e.time}`:`<b>ไม่มาโรงเรียน</b>`}</span>
                    </div>
                </div>
            </div>`;
        attendanceList.appendChild(div);
    });

}










// Password Functions
function setupPasswordToggle() {
    document.querySelectorAll('.toggle-password').forEach(button => {
        button.addEventListener('click', function() {
            const targetId = this.getAttribute('data-target');
            const input = document.getElementById(targetId);
            const icon = this.querySelector('i');
            
            if (input.type === 'password') {
                input.type = 'text';
                icon.classList.remove('fa-eye');
                icon.classList.add('fa-eye-slash');
            } else {
                input.type = 'password';
                icon.classList.remove('fa-eye-slash');
                icon.classList.add('fa-eye');
            }
        });
    });
}

function setupPasswordStrength() {
    const newPasswordInput = document.getElementById('new-password');
    const strengthContainer = document.getElementById('password-strength');
    
    newPasswordInput.addEventListener('input', function() {
        const password = this.value;
        const strength = calculatePasswordStrength(password);
        
        if (password.length === 0) {
            strengthContainer.innerHTML = '';
            return;
        }
        
        strengthContainer.innerHTML = `
            <div class="strength-bar">
                <div class="strength-fill" style="width: ${strength.percentage}%; background-color: ${strength.color};"></div>
            </div>
            <div class="strength-text" style="color: ${strength.color};">${strength.label}</div>
        `;
    });
}

function calculatePasswordStrength(password) {
    if (password.length === 0) return { percentage: 0, label: '', color: '#e5e7eb' };
    if (password.length < 4) return { percentage: 25, label: 'Weak', color: '#ef4444' };
    if (password.length < 8) return { percentage: 50, label: 'Fair', color: '#f59e0b' };
    if (password.length < 12) return { percentage: 75, label: 'Good', color: '#3b82f6' };
    return { percentage: 100, label: 'Strong', color: '#10b981' };
}

function handlePasswordSubmit(e) {
    e.preventDefault();
    
    const currentPassword = document.getElementById('current-password').value;
    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    
    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
        showToast('กรุณากรอกข้อมูลให้ครบถ้วน', 'error');
        return;
    }
    
    if (newPassword.length < 8) {
        showToast('รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 8 ตัวอักษร', 'error');
        return;
    }
    
    if (newPassword !== confirmPassword) {
        showToast('รหัสผ่านใหม่ไม่ตรงกัน', 'error');
        return;
    }
    
    lomain(true);
    $.post('api/repassword', {currentPassword,newPassword}, function (e) {
        lomain(false);
        showToast('เปลี่ยนรหัสผ่านสำเร็จแล้ว', 'success');
        passwordForm.reset();
        document.getElementById('password-strength').innerHTML = ''
    }).fail(function() {
        showToast('server มีปัญหาในการทำงาน', 'error');
    });

    // Simulate password change
    setTimeout(() => {
        ;
    }, 1000);
}

// Utility Functions
function showToast(message, type = 'success') {
    toast.textContent = message;
    toast.className = `toast ${type}`;
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 8000);
}

studentInput.addEventListener('input', () => {
    if (studentInput.value.length > 5) {
        if(studentInput.value.startsWith('0')){
            studentInput.value = studentInput.value.replace(/^0+/, '');
        }else{
            studentInput.value = studentInput.value.slice(0, 5);
        }
        
    }
    if (studentInput.value.length < 5) {
      studentInput.value = studentInput.value.padStart(5, '0');
    }
});

studentuploadb.addEventListener('click',()=>{
    studentupload.click();
});

studentupload.addEventListener('change', function () {
  const file = this.files[0]; // รูปที่เลือก
  if (file) {
        studentimg.src = URL.createObjectURL(file);
        studentuploadbs.style.display="";
    }else{
        studentuploadbs.style.display="none";
    }
});

studentuploadbs.addEventListener('click',()=>{
    studentupload.value = '';
    studentimg.src = `/imgst?id=${opEditSd}`;
    studentuploadbs.style.display="none";

});


function lomain(r){
    if(r){
        spinner.classList.remove("d-none");
        spinner.classList.add("d-flex");
    }else{
        spinner.classList.remove("d-flex");
        spinner.classList.add("d-none");
    }
}

(()=>{
    const today = new Date().toLocaleDateString('th-TH', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    });

    currentdate.textContent = today;
    const [aA,aB,aC] = today.split('/')
    attendanceDate.value = `${aC-543}-${aB}-${aA}`;
})();

 setInterval(()=>{
    const today = new Date().toLocaleDateString('th-TH', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    });
    currentdate.textContent = today;

 }, 1000);


function setupEventListeners() {
    // Mobile menu toggle
    mobileToggle.addEventListener('click', function() {
        sidebar.classList.toggle('active');
    });

    // Navigation
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const page = this.getAttribute('data-page');
            showPage(page);
            
            // Update active nav link
            navLinks.forEach(nav => nav.classList.remove('active'));
            this.classList.add('active');
            
            // Close mobile menu
            sidebar.classList.remove('active');
        });
    });

    // Student management
    document.getElementById('add-student-btn').addEventListener('click', openAddStudentModal);
    studentForm.addEventListener('submit', handleStudentSubmit);
    studentSearch.addEventListener('input', renderStudents);
    attendancesearch.addEventListener('input', ()=>{
        markAll(FTmarkAll);
    });

    // Attendance
    attendanceDate.addEventListener('change', renderAttendance);


    // Password form
    passwordForm.addEventListener('submit', handlePasswordSubmit);
    setupPasswordToggle();
    setupPasswordStrength();

    // Modal close
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', closeModal);
    });

    // Click outside modal to close
    studentModal.addEventListener('click', function(e) {
        if (e.target === this) {
            closeModal();
        }
    });
}
markallpresent.addEventListener('click',()=>{
    markAll(true);
});
markallabsent.addEventListener('click',()=>{
    markAll(false);
});










