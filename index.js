const express = require('express');
const fs = require('fs');
const path = require('path');
const http = require('http');
const socketIO = require('socket.io');
const { exec } = require('child_process');
const mysql = require('mysql2');
const { promisify } = require('util');
const express_session = require('express-session');
const MySQLStore = require('express-mysql-session')(express_session);
const sharp = require('sharp');
const bcrypt = require('bcryptjs');


const logerrorserver = (text,texta)=>{  //แจ้ง Error ไปยัง Discord ยูโร **
  try {
    if(texta){text+=" "+texta};
    text=new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })+ " |AIFKW| "+text;
    fetch("https://discord.com/api/webhooks/1352143443014586449/GZgKYuw3Qe7DoWfopUjJ804HcG_F8fCXrr8wO9yJIXjM7JB6KgGjKAjv2L-LEHRUQrCE", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: text })
    }).catch(error => console.error('Error:', error));
  } catch (error) {
    console.error(`logerrorserver() Error: ${error.message}`);
  }
}


const pa = "/admin";

const mysqlcon = {
    host: '127.0.0.1',
    port: 3306,
    user: 'root',
    password: '',
    database: 'aifkw',
    connectTimeout: 10000, // 10 seconds
    waitForConnections: true,
    queueLimit: 0,
}

const pooldb = mysql.createPool(mysqlcon);
const dbQuery = promisify(pooldb.query).bind(pooldb);


let datauser = [];
let datasavesttofkw = [];


(async ()=>{
    const sql = await dbQuery('SELECT `idsd`, `room`, `name`, `data` FROM `faces` WHERE py="1" ');
    const sql1 = await dbQuery("SELECT `idsd`, `name`, `room`, `time`,`imgin` FROM `attendance` WHERE py='1' AND day=?",[new Date().toLocaleDateString('th-TH')]);
    sql.map(e => {
        datauser.push({
            name: e.name,
            room: e.room,
            studentid: e.idsd,
        })
    });
    sql1.map(e => {
        datasavesttofkw.push({
            image: e.imgin.toString('base64'),
            daus: {
                name: e.name,
                room: e.room,
                studentid: e.idsd,
            },
            time: e.time,
        })
    })
})();





const app = express();
const server = http.createServer(app);
const io = socketIO(server);
const port = 5500;


app.use(pa,express_session({
    secret: 'your-strong-secret-key',
    store: new MySQLStore(mysqlcon),
    resave: false,
    saveUninitialized: false,
    cookie: {  
        secure: false,
        maxAge: 30758400000
    } 
}));


app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

///----------------------------------------------------------------------------------------







app.post(pa+'/Plogin',async (req, res, next) => {
        try {
            const session = req.session.adminchkG;
            if(session) return next();

            const {username,password} = req.body;
            let referer = req.headers['referer'] || "/admin/";
            referer = referer.split("?e=")[0];
            if(username && password){
                    const sql = await dbQuery("SELECT  `pass`, `tyen` FROM `useradmin` WHERE user=? ", [username]);
                    if(sql.length>0){
                        const match = await bcrypt.compare(password, sql[0].pass);
                        if (match) {
                            req.session.adminchkG = {
                                user:username,
                                tyen:sql[0].tyen,
                            };
                            if (req.aborted){return}
                            req.session.save(() => {
                                res.redirect(referer);
                            });
                        }else{
                            if (req.aborted){return}
                            res.redirect(`${referer}?e=${encodeURIComponent('Username หรือ  Password ไม่ถูกต้อง')}`);
                        }
                    }else{
                        if (req.aborted){return}
                        res.redirect(`${referer}?e=${encodeURIComponent('Username หรือ  Password ไม่ถูกต้อง')}`);
                    }
            }else{
                if (req.aborted){return}
                res.redirect(`${referer}?e=${encodeURIComponent('ไม่พบข้อมูลในสู่ระบบ')}`);
            }
        } catch (err) {
            logerrorserver('Plogin',err);
            res.status(500).json({eroor:"ระบบมีปัญหา"})
        }
    });



    app.use(pa, (req, res, next) => {
        try {
            const session = req.session.adminchkG;
            if(session) next(); else
            res.sendFile(path.join(__dirname,'public/admin/login.html'));
        } catch (err) {
            logerrorserver('login.html',err);
            res.status(500).json({eroor:"ระบบมีปัญหา"})
        }
    });

    app.get([pa+'/dashboard',pa+'/students',pa+'/attendance',pa+'/password'], async (req, res) => {
        try {
            const session = req.session.adminchkG;
            if(!session) return res.redirect(`/admin/`);
            res.sendFile(path.join(__dirname,'public/admin/index.html'));
        } catch (err) {
            logerrorserver('/dashboard,/students,..',err);
            res.status(500).json({eroor:"ระบบมีปัญหา"})
        }
    });

    app.get(pa+'/logout', async (req, res) => {
        try {
            delete req.session.adminchkG;
            delete req.session.adminchkG;
            req.session.save(res.redirect(`/admin/`));
        } catch (err) {
            logerrorserver('/dashboard,/students,..',err);
            res.status(500).json({eroor:"ระบบมีปัญหา"})
        }
    });


    ///--------------------------3

    app.post(pa+'/api/get', async (req, res) => {
        try {
            const session = req.session.adminchkG;
            if(!session) return res.redirect(`/admin/`);
            const sql1 = (await dbQuery("SELECT COUNT(*) AS count FROM faces WHERE py = '1'"))[0].count;
            const sql2 = (await dbQuery("SELECT COUNT(*) AS count FROM attendance WHERE py = '1' AND day=?",[new Date().toLocaleDateString('th-TH')]))[0].count;

            res.json({
                quantity:sql1,
                toschool:sql2,
            })
        } catch (err) {
            logerrorserver('get',err);
            res.status(500).json({eroor:"ระบบมีปัญหา"})
        }
    });

    app.post(pa+'/api/getStudent', async (req, res) => {
        try {
            const session = req.session.adminchkG;
            if(!session) return res.redirect(`/admin/`);
            const searchTerm = req.body.searchTerm || "";

            const term = `%${searchTerm}%`;

            const sql1 = (
            await dbQuery(
                `SELECT idsd, room, name FROM faces WHERE ${
                searchTerm !== "" ? "(idsd LIKE ? OR room LIKE ? OR name LIKE ?) AND " : ""
                }py='1'`,
                searchTerm !== "" ? [term, term, term] : []
            )
            );
            res.json(sql1)
        } catch (err) {
            logerrorserver('getStudent',err);
            res.status(500).json({eroor:"ระบบมีปัญหา"})
        }
    });
    app.post(pa+'/api/save-sdm', async (req, res) => {
        try {
            const session = req.session.adminchkG;
            if(!session) return res.redirect(`/admin/`);
            const {id,name,room,img,tyen} = req.body;
            if(!id || !name || !room || !img || !tyen) return res.status(400).json({ s: 'No data' });
            let image;
            if(img==="not."){
                image = (await dbQuery("SELECT `image` FROM `imgsd` WHERE idsd = ?",[id]))[0].image;
            }else{
                const inputBuffer = Buffer.from(img, 'base64');
                image = await sharp(inputBuffer)
                .resize({ width: 3000, height: 3000, fit: 'inside' })
                .jpeg({ quality: 80 })
                .toBuffer();
            }

            const response = await fetch('http://127.0.0.1:5501/addsave-sd', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'user-agent': 'nodejsAIWOW09472',
                },
                body: JSON.stringify({
                    idsd:id,
                    name,
                    room,
                    image:image.toString('base64'),
                    tyen,
                })
            });

            const status = response.status;
            const data = await response.json();
            let text= '';
            if(status===201){
                const i = data.message;
                if(i===1) text="server มีปัญหา";
                if(i===2) text="มีปัญหา base64";
                if(i===3) text="ไม่พบใบหน้า";
                if(i===4) text="มีข้อมูลของนักเรียนคนนี้อยู่แล้ว";
                if(i===5) text="ใบหน้านี้มีอยู่ในฐานข้อมูลแล้ว";
                if(i===6) text="ตรวจพบใบหน้าหลายใบ";
            }
            if(status===200){
                datauser = datauser.filter(user => user.studentid != id);
                datauser.push({
                    name,
                    room,
                    studentid: id,
                })
                text="บันทึกข้อมูลสำเร็จ";
                if(img!=="not."){
                    const inputBuffer = Buffer.from(img, 'base64');
                    const imageV = await sharp(inputBuffer)
                    .resize({ width: 400, height: 400, fit: 'inside' })
                    .webp({ quality: 40 })
                    .toBuffer();
                    if(tyen==1){
                        await dbQuery("INSERT INTO imgsd (idsd, image) VALUES (?, ?)", [id, imageV])
                    }else{
                        await dbQuery("UPDATE `imgsd` SET `image`=? WHERE idsd=?", [imageV, id]);
                    }
                    
                }
                
            }
            res.json({
                status,
                text,
            })

        } catch (err) {
            logerrorserver('save-sdm',err);
            res.status(500).json({eroor:"ระบบมีปัญหา"})
        }
    });

    app.post(pa+'/api/delete-sdm', async (req, res) => {
        try {
            const session = req.session.adminchkG;
            if(!session) return res.redirect(`/admin/`);
            const {idsd} = req.body;
            if(!idsd) return res.status(400).json({ s: 'No data' });
    

            const response = await fetch('http://127.0.0.1:5501/delete-sd', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'user-agent': 'nodejsAIWOW09472',
                },
                body: JSON.stringify({idsd})
            });

            const status = response.status;
            const data = await response.json();
            let text= '';
            if(status===201){
                text="server มีปัญหา";
            }
            if(status===200){
                datauser = datauser.filter(user => user.studentid != idsd);
                datasavesttofkw = datasavesttofkw.filter(e=>e.daus.studentid != idsd);
                text="ลบสำเร็จ";
                dbQuery("UPDATE `attendance` SET `py`=0 WHERE idsd=?",[idsd]);
                io.emit('delete-st', idsd); 
            }
            res.json({
                status,
                text,
                data,
            })

        } catch (err) {
            logerrorserver('delete-sdm',err);
            res.status(500).json({eroor:"ระบบมีปัญหา"})
        }
    });


    app.post(pa+'/api/repassword', async (req, res) => {
        try {
            const session = req.session.adminchkG;
            if(!session) return res.redirect(`/admin/`);
            const {currentPassword,newPassword} = req.body;
            if(!currentPassword || !newPassword) return res.status(400).json({ s: 'No data' });
            const sql = await dbQuery("SELECT  `pass` FROM `useradmin` WHERE user=? AND tyen=? ", [session.user,session.tyen]);
            if(sql.length===0) return res.status(201).json({ text: 'ระบบมีปัญหา',error:1 });
            const match = await bcrypt.compare(currentPassword, sql[0].pass);
            if (!match) return res.status(201).json({ text: 'Password ไม่ตรงกับระบบ',error:1 });
            const dPa = await bcrypt.hash(newPassword, 10);
            await dbQuery("UPDATE `useradmin` SET `pass`=? WHERE user=? AND tyen=? ", [dPa,session.user,session.tyen]);
            res.json({ text: 'เปลียน Password แล้ว',error:0 });
        } catch (err) {
            logerrorserver('delete-sdm',err);
            res.status(500).json({eroor:"ระบบมีปัญหา"})
        }
    });


    app.post(pa+'/api/get-attendance', async (req, res) => {
        try {
            const session = req.session.adminchkG;
            if(!session) return res.redirect(`/admin/`);
            const {day} = req.body;
            if(!day) return res.status(400).json({ s: 'No data' });

            const sql1 = (await dbQuery("SELECT COUNT(*) AS count FROM faces WHERE py = '1'"))[0].count;
            const sql2 = await dbQuery("SELECT `idsd`, `name`, `room`, `time` FROM `attendance` WHERE py = '1' AND day=?",[day]);

            res.json({
                quantity:sql1,
                data:sql2,
            })
        } catch (err) {
            logerrorserver('get',err);
            res.status(500).json({eroor:"ระบบมีปัญหา"})
        }
    });



















///----------------------------------------------------------------------------------------





app.use(express.static('public')); 




io.on('connection', (socket) => {
    socket.on('R', () => {
        socket.emit('R', datasavesttofkw);
    });
});
let fdfframe = { d: "", time: null };
let fdsf = {t:false,d:0}
app.post('/frame', async (req, res) => {
    res.sendStatus(200);
    const { image, datagg } = req.body;
    if (!image) return;
    io.emit('frame', image); // ส่งต่อให้ทุก client

    return

    const now = Date.now(); // เวลาปัจจุบันเป็น ms
    if (fdfframe.time !== null) {
        try {
            const date = new Date();
            const day = date.toLocaleDateString('th-TH'); 
            const time = date.toLocaleTimeString('th-TH', { hour12: false });
            const diff = now - fdfframe.time;

           // console.log(diff,datagg);

            if((fdsf.t===false && fdsf.d>20) || datagg===true){
                fdsf.d=0;
                fdsf.t = true;
                const inputBuffer = Buffer.from(image, 'base64');
                const data = await sharp(inputBuffer)
                .resize({ width: 853, height: 480, fit: 'inside' })
                .webp({ quality: 40 })
                .toBuffer(); 
                await dbQuery("INSERT INTO `logcctv`(`time`, `day`, `data`, `ms`) VALUES (?,?,?,?)",[time,day,data,diff]);
                
            }else{
                fdsf.d++;
            }
            fdsf.t = datagg;
          
        } catch (error) {
            console.error(error);
        }
    }

    fdfframe.d = image;
    fdfframe.time = now;

    
});

app.post('/frame-cropped',async (req, res) => {
    res.sendStatus(200);
    const { image,studentid } = req.body;
    if(!image || !studentid) return;
    
    if(datasavesttofkw.find(e=>e.daus.studentid===studentid) || false) return;
   // console.log(studentid, datauser)
    const daus = datauser.find(i=>i.studentid==studentid) || "ไม่พบข้อมูล";
    if(daus==="ไม่พบข้อมูล") return;
    const date = new Date();
    const day = date.toLocaleDateString('th-TH'); 
    const time = date.toLocaleTimeString('th-TH', { hour12: false });
    const jsondata = {
        image,
        daus,
        time,
    }
    datasavesttofkw.push(jsondata);
    io.emit('frame-cropped',jsondata);
    try {
        const inputBuffer = Buffer.from(image, 'base64');
        const data = await sharp(inputBuffer)
        .webp({ quality: 40 })
        .toBuffer();

        await dbQuery("INSERT INTO `attendance`(`idsd`, `name`, `room`, `time`, `day`, `imgin`, `py`) VALUES (?,?,?,?,?,?,1)",[
            daus.studentid,
            daus.name,
            daus.room,
            time,
            day,
            data
        ]);
    } catch (error) {
        console.error(error);
    }
});



app.get("/imgst", async (req,res)=>{
    const {id} = req.query;
    if(!id){ return res.send('Error')}
    const img = (await dbQuery("SELECT image FROM imgsd WHERE idsd = ? LIMIT 1", [id]))[0].image;
    res.set('Content-Type', 'image/jpeg');
    res.send(img);
});



server.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);// รันคำสั่ง Python ผ่าน cmd หรือ shell
    exec('python main.py', (error, stdout, stderr) => {
        if (error) {
            console.error(`exec error: ${error}`);
            return;
        }
        if (stderr) {
            console.error(`stderr: ${stderr}`);
            return;
        }
        console.log(`stdout: ${stdout}`);
    });
});








