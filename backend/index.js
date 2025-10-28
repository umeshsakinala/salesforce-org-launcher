import express from "express";
import cors from "cors";
import session from "express-session";
import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import crypto from "crypto";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { fileURLToPath } from "url";
import { dirname } from "path";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.use(express.json());

// Seting up Middleware

app.use(
  cors({
    origin: ["http://localhost:5173", "https://salesforce-orgs.netlify.app/"],
    
    credentials: true,
  })
);

app.use(helmet());
app.use(cookieParser());
app.use(
    session({
        secret: process.env.SESSION_SECRET || 'secret',
        resave: false,
        saveUninitialized: false,
        cookie: {
            secure: false,
            httpOnly: true,
            sameSite: "lax",
            maxAge: 1000 * 60 * 60 * 24,
        },
    })
);

// Connecting to MongoDB
mongoose.connect(process.env.MONGODB_URI).then(() => {
    console.log('Connected to MongoDB');
}).catch((err) => {
    console.log('MongoDB connection error:', err);
});

const ALGO = 'aes-256-gcm';
const key = Buffer.from(process.env.ENCRYPTION_KEY, 'base64');
function encrypt(text) {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(ALGO, key, iv);
    const enc = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `${iv.toString('base64')}:${enc.toString('base64')}:${tag.toString('base64')}`;
}

function decrypt(payload) {
    const [ivB64, encB64, tagB64] = payload.split(':');
    const iv = Buffer.from(ivB64, 'base64');
    const enc = Buffer.from(encB64, 'base64');
    const tag = Buffer.from(tagB64, 'base64');
    const decipher = crypto.createDecipheriv(ALGO, key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8');
}

// Schema for the Database
const Org = mongoose.model('Org', new mongoose.Schema({
    name: String,
    salesforce_url: String,
    username_enc: String,
    password_enc: String,
}));

// API
app.get('/api/orgs', async (req, res) => {
    try {
        if(!req.session.admin) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        const orgs = await Org.find({}, 'name salesforce_url username_enc');
        res.json(orgs.map(org => ({
            ...org.toObject(),
            username: decrypt(org.username_enc)
        })));
    }
    catch(err) {
        console.error('Error fetching orgs:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.get('/api/orgs/:id/creds', async (req, res) => {
  try {
    if(!req.session.admin) {
        return res.status(403).json({ error: 'Forbidden' });
    }
    const {id} = req.params;
    const org = await Org.findById(id);
    if(!org) return res.status(404).json({ error: 'Org not found' });
    const username = decrypt(org.username_enc);
    const password = decrypt(org.password_enc);
    const salesforce_url = org.salesforce_url;
    res.json({ username, password, salesforce_url });
  }
  catch(err) {
    console.error('Error fetching creds:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.post('/api/login', (req, res) => {
    const {password} = req.body;
    if(password === process.env.ADMIN_PASS) {
        req.session.authenticated = true;
        req.session.admin = true;
        res.json({ok: true});
    }
    else {
        res.status(401).json({error: 'Unauthorized'});
    }
});

app.post('/api/orgs', async (req, res) => {
    if(!req.session.admin) return res.status(403).json({error: 'Forbidden'});
    const {name, salesforce_url, username, password} = req.body;
    const org = new Org({
        name,
        salesforce_url,
        username_enc: encrypt(username),
        password_enc: encrypt(password),
    });
    await org.save();
    res.json({ok: true});
});

app.get('/launch/:id', async (req, res) => {
    const org = await Org.findById(req.params.id);
    if(!org) return res.status(404).send('Not Found');
    const username = decrypt(org.username_enc);
    const password = decrypt(org.password_enc);
    res.send(`
        <html>
            <body onload="document.forms[0].submit()">
            <form method="post" action="${org.salesforce_url}">
                <input type="hidden" name="username" value="${username}" />
                <input type="hidden" name="password" value="${password}" />
            </form>
            </body>
        </html>
        `);
});

app.get("/api/check-auth", (req, res) => {
  if(req.session && req.session.admin) {
    res.json({ authenticated: true });
  }
  else {
    res.json({ authenticated: false });
  }
});

app.put('/api/orgs/:id', async (req, res) => {
    try {
        if(!req.session.admin) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        const { username, password } = req.body;
        if(!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }
        console.log("Before encrypt:", username, password);
        const updated = await Org.findByIdAndUpdate(
            req.params.id,
            { 
                username_enc: encrypt(username),
                password_enc: encrypt(password),
            },
            { new: true }
        );
        console.log("After encrypt:", encrypt(username), encrypt(password));
        console.log('Updated org:', updated, req.params.id, username, password);
        if(!updated) {
            return res.status(404).json({ error: 'Org not found' });
        }
        res.json({ success: true, updated});
    }
    catch(err) {
        console.error("Error updating org:", err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.delete('/api/orgs/:id', async (req, res) => {
    try {
        if(!req.session.admin) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        const deleted = await Org.findByIdAndDelete(req.params.id);
        if(!deleted) {
            return res.status(404).json({ error: 'Org not found' });
        }
        res.json({ success: true });
    }
    catch(err) {
        console.error("Error deleting org:", err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
})

app.use(express.static(path.join(__dirname, '../frontend/dist')));
app.use((req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    (`Server running on port ${PORT}`);
});