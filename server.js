require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const Database = require('better-sqlite3');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');

const app = express();
const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const PUBLIC = path.join(ROOT, 'public');
const DATA = path.join(ROOT, 'data');
const UPLOADS = path.join(ROOT, 'uploads');
fs.mkdirSync(DATA, {recursive:true});
fs.mkdirSync(UPLOADS, {recursive:true});

const db = new Database(path.join(DATA,'tws.db'));
db.pragma('journal_mode = WAL');
db.exec(`
CREATE TABLE IF NOT EXISTS products(id INTEGER PRIMARY KEY, name TEXT NOT NULL, price INTEGER NOT NULL DEFAULT 200, description TEXT NOT NULL, image TEXT, category TEXT DEFAULT 'photo', active INTEGER DEFAULT 1);
CREATE TABLE IF NOT EXISTS designs(id INTEGER PRIMARY KEY, name TEXT NOT NULL, image TEXT NOT NULL, category TEXT DEFAULT 'back', active INTEGER DEFAULT 1, editable_name INTEGER DEFAULT 1, editable_date INTEGER DEFAULT 1, editable_message INTEGER DEFAULT 1);
CREATE TABLE IF NOT EXISTS customers(id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, mobile TEXT UNIQUE, address_json TEXT, pincode TEXT, created_at TEXT);
CREATE TABLE IF NOT EXISTS orders(id INTEGER PRIMARY KEY AUTOINCREMENT, order_no TEXT UNIQUE NOT NULL, customer_id INTEGER, status TEXT DEFAULT 'new', payment_status TEXT DEFAULT 'unpaid', subtotal INTEGER, shipping INTEGER DEFAULT 50, total INTEGER, items_json TEXT NOT NULL, created_at TEXT NOT NULL);
`);

const defaultDescription = 'A personalized wallet card made to keep a favorite person, moment or memory close. Add your photo and meaningful details, preview both sides, and place your order directly from The Wallet Studio.';
for(let i=1;i<=25;i++) db.prepare(`INSERT OR IGNORE INTO products(id,name,price,description,image,category,active) VALUES(?,?,?,?,?,?,1)`).run(i,`Design ${String(i).padStart(2,'0')}`,200,defaultDescription,`design-${String(i).padStart(2,'0')}.jpg`,'photo');
for(let i=35;i<=65;i++) db.prepare(`INSERT OR IGNORE INTO designs(id,name,image,category) VALUES(?,?,?,'back')`).run(i,`Design ${i}`,`design-${i}.jpg`);

const storage = multer.diskStorage({destination:(_,__,cb)=>cb(null,UPLOADS),filename:(_,file,cb)=>cb(null,Date.now()+'-'+crypto.randomBytes(5).toString('hex')+path.extname(file.originalname).toLowerCase())});
const upload = multer({storage, limits:{fileSize:8*1024*1024}});
app.use(express.json({limit:'12mb'}));
app.use(express.urlencoded({extended:true}));
app.use(cookieParser());
app.use('/uploads', express.static(UPLOADS));
// Existing GitHub product images can remain at repository root. Serve only image assets needed by the store.
app.use('/assets/products', express.static(ROOT, {
  fallthrough: true,
  index: false,
  extensions: ['jpg','jpeg','png','webp']
}));
app.use(express.static(PUBLIC));
app.use('/admin', express.static(path.join(ROOT, 'admin')));

function auth(req,res,next){
  try { const token=req.cookies.tws_admin; if(!token) return res.status(401).json({error:'Unauthorized'}); req.admin=jwt.verify(token,process.env.JWT_SECRET); next(); }
  catch(e){ return res.status(401).json({error:'Unauthorized'}); }
}
function orderNo(){return 'TWS-'+Date.now().toString(36).toUpperCase()+'-'+crypto.randomBytes(2).toString('hex').toUpperCase();}

app.get('/api/health',(_,res)=>res.json({ok:true}));
app.get('/api/products',(req,res)=>res.json(db.prepare('SELECT * FROM products WHERE active=1 ORDER BY id').all()));
app.get('/api/products/:id',(req,res)=>{const p=db.prepare('SELECT * FROM products WHERE id=?').get(req.params.id); p?res.json(p):res.status(404).json({error:'Product not found'});});
app.get('/api/designs',(req,res)=>res.json(db.prepare('SELECT * FROM designs WHERE active=1 ORDER BY id').all()));

app.post('/api/auth/login',(req,res)=>{
  const {username,password}=req.body||{};
  const expectedUser=process.env.ADMIN_USERNAME||'admin';
  const expectedPass=process.env.ADMIN_PASSWORD||'';
  if(!expectedPass || username!==expectedUser || password!==expectedPass) return res.status(401).json({error:'Invalid login'});
  const token=jwt.sign({username},process.env.JWT_SECRET,{expiresIn:'7d'});
  res.cookie('tws_admin',token,{httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production',maxAge:7*24*60*60*1000});
  res.json({ok:true});
});
app.post('/api/auth/logout',(req,res)=>{res.clearCookie('tws_admin');res.json({ok:true});});
app.get('/api/auth/me',auth,(req,res)=>res.json({username:req.admin.username}));

app.post('/api/admin/products',auth,upload.single('image'),(req,res)=>{
  const {name='Design',price=200,description=defaultDescription,category='photo'}=req.body;
  const image=req.file?'/uploads/'+req.file.filename:(req.body.image||'');
  const r=db.prepare('INSERT INTO products(name,price,description,image,category,active) VALUES(?,?,?,?,?,1)').run(name,Number(price)||200,description,image,category);
  res.json({ok:true,id:r.lastInsertRowid});
});
app.put('/api/admin/products/:id',auth,upload.single('image'),(req,res)=>{
  const old=db.prepare('SELECT * FROM products WHERE id=?').get(req.params.id); if(!old)return res.status(404).json({error:'Not found'});
  const image=req.file?'/uploads/'+req.file.filename:(req.body.image||old.image);
  db.prepare('UPDATE products SET name=?,price=?,description=?,image=?,category=?,active=? WHERE id=?').run(req.body.name||old.name,Number(req.body.price)||old.price,req.body.description??old.description,image,req.body.category||old.category,req.body.active===undefined?old.active:Number(req.body.active),req.params.id);
  res.json({ok:true});
});
app.delete('/api/admin/products/:id',auth,(req,res)=>{db.prepare('DELETE FROM products WHERE id=?').run(req.params.id);res.json({ok:true});});

app.post('/api/admin/designs',auth,upload.single('image'),(req,res)=>{
  const id=Number(req.body.id); if(!id||id<35||id>65)return res.status(400).json({error:'Design ID must be 35-65'});
  const image=req.file?'/uploads/'+req.file.filename:(req.body.image||`design-${id}.jpg`);
  db.prepare('INSERT OR REPLACE INTO designs(id,name,image,category,active,editable_name,editable_date,editable_message) VALUES(?,?,?,?,1,?,?,?)').run(id,req.body.name||`Design ${id}`,image,req.body.category||'back',req.body.editable_name===undefined?1:Number(req.body.editable_name),req.body.editable_date===undefined?1:Number(req.body.editable_date),req.body.editable_message===undefined?1:Number(req.body.editable_message));
  res.json({ok:true});
});
app.delete('/api/admin/designs/:id',auth,(req,res)=>{db.prepare('DELETE FROM designs WHERE id=?').run(req.params.id);res.json({ok:true});});

app.post('/api/orders',upload.single('frontPhoto'),(req,res)=>{
  let payload=req.body;
  if(typeof payload==='string') payload=JSON.parse(payload);
  const customer=typeof payload.customer==='string'?JSON.parse(payload.customer):payload.customer;
  const items=typeof payload.items==='string'?JSON.parse(payload.items):payload.items;
  if(!customer?.name || !/^\d{10}$/.test(customer.mobile||'') || !/^\d{6}$/.test(customer.pincode||'') || !Array.isArray(items) || !items.length) return res.status(400).json({error:'Incomplete order'});
  const now=new Date().toISOString();
  const address=customer.address||{};
  let existing=db.prepare('SELECT id FROM customers WHERE mobile=?').get(customer.mobile);
  let cid;
  if(existing){cid=existing.id;db.prepare('UPDATE customers SET name=?,address_json=?,pincode=? WHERE id=?').run(customer.name,JSON.stringify(address),customer.pincode,cid);}
  else cid=db.prepare('INSERT INTO customers(name,mobile,address_json,pincode,created_at) VALUES(?,?,?,?,?)').run(customer.name,customer.mobile,JSON.stringify(address),customer.pincode,now).lastInsertRowid;
  const subtotal=Number(payload.subtotal)||items.reduce((s,x)=>s+(Number(x.unitPrice)||200)*(Number(x.quantity)||1),0);
  const shipping=50; const total=subtotal+shipping; const no=orderNo();
  const cleanItems=items.map(x=>({...x,frontPhoto:x.frontPhoto||null,preview:x.preview||null}));
  db.prepare('INSERT INTO orders(order_no,customer_id,status,payment_status,subtotal,shipping,total,items_json,created_at) VALUES(?,?,?,?,?,?,?,?,?)').run(no,cid,'new','unpaid',subtotal,shipping,total,JSON.stringify(cleanItems),now);
  res.json({ok:true,orderNo:no,total});
});
app.get('/api/orders/:orderNo',(req,res)=>{const o=db.prepare('SELECT o.*,c.name,c.mobile,c.address_json,c.pincode FROM orders o JOIN customers c ON c.id=o.customer_id WHERE o.order_no=?').get(req.params.orderNo);if(!o)return res.status(404).json({error:'Order not found'});res.json({...o,address:JSON.parse(o.address_json||'{}'),items:JSON.parse(o.items_json)});});

app.get('/api/admin/orders',auth,(req,res)=>{const rows=db.prepare('SELECT o.*,c.name,c.mobile,c.address_json,c.pincode FROM orders o JOIN customers c ON c.id=o.customer_id ORDER BY o.id DESC').all();res.json(rows.map(o=>({...o,address:JSON.parse(o.address_json||'{}'),items:JSON.parse(o.items_json)})));});
app.patch('/api/admin/orders/:id',auth,(req,res)=>{const allowedStatus=['new','processing','shipped','delivered','cancelled'];const allowedPayment=['unpaid','paid','refunded'];const s=req.body.status,p=req.body.payment_status;if(s!==undefined&&!allowedStatus.includes(s))return res.status(400).json({error:'Invalid status'});if(p!==undefined&&!allowedPayment.includes(p))return res.status(400).json({error:'Invalid payment status'});db.prepare('UPDATE orders SET status=COALESCE(?,status),payment_status=COALESCE(?,payment_status) WHERE id=?').run(s||null,p||null,req.params.id);res.json({ok:true});});
app.get('/api/admin/customers',auth,(req,res)=>{const q=(req.query.q||'').trim();const rows=q?db.prepare('SELECT * FROM customers WHERE name LIKE ? OR mobile LIKE ? ORDER BY id DESC').all('%'+q+'%','%'+q+'%'):db.prepare('SELECT * FROM customers ORDER BY id DESC').all();res.json(rows.map(c=>({...c,address:JSON.parse(c.address_json||'{}')})));});
app.get('/api/admin/stats',auth,(req,res)=>{res.json({products:db.prepare('SELECT COUNT(*) n FROM products WHERE active=1').get().n,designs:db.prepare('SELECT COUNT(*) n FROM designs WHERE active=1').get().n,orders:db.prepare('SELECT COUNT(*) n FROM orders').get().n,customers:db.prepare('SELECT COUNT(*) n FROM customers').get().n});});

app.listen(PORT,()=>console.log(`TWS server running on http://localhost:${PORT}`));
