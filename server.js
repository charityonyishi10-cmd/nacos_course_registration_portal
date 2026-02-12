import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import session from 'express-session';
import MongoStore from 'connect-mongo';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
 
// --- MIDDLEWARE ---
app.use(cors()); // Allows your frontend to communicate with this backend
app.use(express.json()); // Parses JSON data sent from forms
app.use(express.static(__dirname)); // Serve frontend files

// --- MONGODB CONNECTION ---
// Connects to MongoDB Atlas
// IMPORTANT: Replace <password> with your actual Atlas password
const MONGO_URI = "mongodb+srv://chinecherem_db_user:18636753@chinecherem.bgrafaj.mongodb.net/?appName=chinecherem";

// --- SESSION MIDDLEWARE ---
app.use(session({
    secret: 'nacos_secret_key', // In production, use a secure environment variable
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: MONGO_URI }), // Stores sessions in MongoDB
    cookie: { maxAge: 1000 * 60 * 60 * 24 } // Session expires in 1 day
}));

mongoose.connect(MONGO_URI)
    .then(() => {
        console.log('Connected to MongoDB Atlas');
        seedCourses();
    })
    .catch(err => console.error('Could not connect to MongoDB Atlas:', err));

// --- DATABASE SCHEMAS ---

// Student Schema
const studentSchema = new mongoose.Schema({
    name: String,
    regNumber: { type: String, unique: true, required: true },
    password: { type: String, required: true }, // Note: In a real app, use bcrypt to hash passwords
    email: String,
    contact: String,
    age: Number,
    address: String,
    state: String,
    department: { type: String, default: 'Computer Science' },
    courseOfStudy: { type: String, default: 'Computer Science' },
    registeredCourses: [String] // Stores an array of course codes (e.g., ['CSC101', 'MTH101'])
});

// Course Schema
const courseSchema = new mongoose.Schema({
    code: String,
    title: String,
    units: Number,
    type: String, // 'Compulsory' or 'Elective'
    level: String, // '100', '200', etc.
    semester: String // 'first' or 'second'
});

const Student = mongoose.model('Student', studentSchema);
const Course = mongoose.model('Course', courseSchema);

// --- API ROUTES ---

// 1. Sign Up
app.post('/signup', async (req, res) => {
    try {
        const { name, regNumber, password } = req.body;
        
        // Check if user already exists
        const existingStudent = await Student.findOne({ regNumber });
        if (existingStudent) {
            return res.status(400).json({ message: 'Registration number already exists' });
        }

        const newStudent = new Student({ name, regNumber, password });
        await newStudent.save();
        res.status(201).json({ message: 'User created successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error creating user', error });
    }
});

// 2. Login
app.post('/login', async (req, res) => {
    try {
        const { regNumber, password } = req.body;
        const student = await Student.findOne({ regNumber, password });
        
        if (!student) {
            return res.status(401).json({ message: 'Invalid Registration Number or Password' });
        }
        
        // Save user info to the session (stored in MongoDB)
        req.session.user = student;
        res.json({ student });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error });
    }
});

// 2b. Check Session (Used on page load)
app.get('/check-session', (req, res) => {
    if (req.session.user) {
        res.json({ student: req.session.user });
    } else {
        res.status(401).json({ message: 'Not logged in' });
    }
});

// 2c. Logout
app.post('/logout', (req, res) => {
    req.session.destroy(); // Removes session from MongoDB
    res.json({ message: 'Logged out' });
});

// 3. Get Courses (Filtered by Level and Semester)
app.get('/courses', async (req, res) => {
    try {
        const { level, semester } = req.query;
        let query = {};
        
        // Only filter if parameters are provided and not empty
        if (level && level !== 'chooseLevel') query.level = level;
        if (semester && semester !== 'chooseSemester') query.semester = semester;
        
        const courses = await Course.find(query);
        res.json(courses);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching courses' });
    }
});

// 4. Register Courses
app.post('/register-courses', async (req, res) => {
    try {
        const { regNumber, courses } = req.body;
        const student = await Student.findOne({ regNumber });
        
        if (!student) return res.status(404).json({ message: 'Student not found' });

        // Merge new courses with existing ones, removing duplicates
        const updatedCourses = [...new Set([...student.registeredCourses, ...courses])];
        
        // Validate total units (Max 24 per level/semester)
        const courseDetails = await Course.find({ code: { $in: updatedCourses } });
        const unitsMap = {};

        for (const course of courseDetails) {
            const key = `${course.level}-${course.semester}`;
            unitsMap[key] = (unitsMap[key] || 0) + course.units;
        }

        for (const [key, total] of Object.entries(unitsMap)) {
            if (total > 24) {
                const [lvl, sem] = key.split('-');
                return res.status(400).json({ 
                    message: `Cannot register. Total units for ${lvl} Level ${sem} semester (${total}) exceeds 24.` 
                });
            }
        }

        student.registeredCourses = updatedCourses;
        
        await student.save();
        res.json({ message: 'Courses registered successfully', student });
    } catch (error) {
        res.status(500).json({ message: 'Error registering courses' });
    }
});

// 5. Update Profile
app.put('/update-profile', async (req, res) => {
    try {
        const { regNumber, ...updates } = req.body;
        const student = await Student.findOneAndUpdate({ regNumber }, updates, { new: true });
        
        if (!student) return res.status(404).json({ message: 'Student not found' });
        res.json({ student });
    } catch (error) {
        res.status(500).json({ message: 'Error updating profile' });
    }
});

// 6. Forgot Password (Mock)
app.post('/forgot-password', async (req, res) => {
    const { regNumber } = req.body;
    const student = await Student.findOne({ regNumber });
    if (student) {
        // In a real app, you would send an email here
        console.log(`Password reset requested for: ${regNumber}`);
        res.json({ message: 'Reset link sent' });
    } else {
        res.status(404).json({ message: 'Registration number not found' });
    }
});

// --- SEED DATA (Populate courses if database is empty) ---
async function seedCourses() {
    const courses = [
        // 100 Level
        { code: 'CSC101', title: 'Introduction to Computer Science', units: 3, type: 'Compulsory', level: '100', semester: 'first' },
        { code: 'MTH101', title: 'General Mathematics I', units: 3, type: 'Compulsory', level: '100', semester: 'first' },
        { code: 'PHY101', title: 'General Physics I', units: 3, type: 'Compulsory', level: '100', semester: 'first' },
        { code: 'GST101', title: 'Use of English', units: 2, type: 'Compulsory', level: '100', semester: 'first' },
        { code: 'CHM101', title: 'General Chemistry I', units: 3, type: 'Elective', level: '100', semester: 'first' },
        { code: 'BIO101', title: 'General Biology I', units: 3, type: 'Elective', level: '100', semester: 'first' },
        { code: 'CSC102', title: 'Introduction to Programming', units: 3, type: 'Compulsory', level: '100', semester: 'second' },
        { code: 'MTH102', title: 'General Mathematics II', units: 3, type: 'Compulsory', level: '100', semester: 'second' },
        { code: 'PHY102', title: 'General Physics II', units: 3, type: 'Compulsory', level: '100', semester: 'second' },
        { code: 'GST102', title: 'Philosophy and Logic', units: 2, type: 'Compulsory', level: '100', semester: 'second' },
        
        // 200 Level
        { code: 'CSC201', title: 'Data Structures', units: 3, type: 'Compulsory', level: '200', semester: 'first' },
        { code: 'CSC203', title: 'Digital Design', units: 3, type: 'Compulsory', level: '200', semester: 'first' },
        { code: 'MTH201', title: 'Mathematical Methods', units: 3, type: 'Compulsory', level: '200', semester: 'first' },
        { code: 'STA201', title: 'Statistics for Physical Sciences', units: 2, type: 'Compulsory', level: '200', semester: 'first' },
        { code: 'GST201', title: 'Nigerian Peoples and Culture', units: 2, type: 'Compulsory', level: '200', semester: 'first' },
        { code: 'CSC202', title: 'Operating Systems I', units: 3, type: 'Compulsory', level: '200', semester: 'second' },
        { code: 'CSC204', title: 'Algorithms', units: 3, type: 'Compulsory', level: '200', semester: 'second' },
        { code: 'GST202', title: 'Entrepreneurship', units: 2, type: 'Compulsory', level: '200', semester: 'second' },
        { code: 'CSC206', title: 'Assembly Language', units: 3, type: 'Compulsory', level: '200', semester: 'second' },

        // 300 Level
        { code: 'CSC301', title: 'Database Management', units: 3, type: 'Compulsory', level: '300', semester: 'first' },
        { code: 'CSC303', title: 'Object Oriented Programming', units: 3, type: 'Compulsory', level: '300', semester: 'first' },
        { code: 'CSC305', title: 'Operating Systems II', units: 3, type: 'Compulsory', level: '300', semester: 'first' },
        { code: 'CSC307', title: 'Systems Analysis and Design', units: 3, type: 'Compulsory', level: '300', semester: 'first' },
        { code: 'CSC311', title: 'Operations Research', units: 3, type: 'Elective', level: '300', semester: 'first' },
        { code: 'CSC302', title: 'Survey of Programming Languages', units: 3, type: 'Compulsory', level: '300', semester: 'second' },
        { code: 'CSC304', title: 'Automata Theory', units: 3, type: 'Compulsory', level: '300', semester: 'second' },
        { code: 'CSC310', title: 'Numerical Methods', units: 3, type: 'Compulsory', level: '300', semester: 'second' },
        { code: 'CSC399', title: 'Industrial Training (SIWES)', units: 6, type: 'Compulsory', level: '300', semester: 'second' },

        // 400 Level
        { code: 'CSC401', title: 'Software Engineering', units: 3, type: 'Compulsory', level: '400', semester: 'first' },
        { code: 'CSC403', title: 'Computer Graphics', units: 3, type: 'Compulsory', level: '400', semester: 'first' },
        { code: 'CSC405', title: 'Artificial Intelligence', units: 3, type: 'Compulsory', level: '400', semester: 'first' },
        { code: 'CSC407', title: 'Compiler Construction', units: 3, type: 'Compulsory', level: '400', semester: 'first' },
        { code: 'CSC402', title: 'Computer Networks', units: 3, type: 'Compulsory', level: '400', semester: 'second' },
        { code: 'CSC404', title: 'Human Computer Interaction', units: 2, type: 'Elective', level: '400', semester: 'second' },
        { code: 'CSC499', title: 'Final Year Project', units: 6, type: 'Compulsory', level: '400', semester: 'second' }
    ];

    // Upsert courses to ensure they exist even if DB is not empty
    for (const course of courses) {
        await Course.findOneAndUpdate({ code: course.code }, course, { upsert: true, new: true });
    }
    console.log('Database seeded/updated with courses');
}

// --- START SERVER FUNCTION ---
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});