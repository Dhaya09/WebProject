require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const path = require("path");
const nodemailer = require("nodemailer");
const multer = require("multer");
const fs = require("fs");
const schedule = require("node-schedule");
const session = require("express-session");
const cookieParser = require("cookie-parser");
const MongoStore = require("connect-mongo");

const app = express();

// Middleware
app.use(express.json());
app.use(cors({
    origin: "http://localhost:5000",
    credentials: true
}));
app.use(express.static(__dirname));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use(cookieParser());

// MongoDB Connection
mongoose.connect("mongodb://127.0.0.1:27017/student-bubble")
    .then(() => console.log("MongoDB Connected"))
    .catch((err) => console.log(err));

// Session Configuration with MongoStore
app.use(
    session({
        secret: process.env.SESSION_SECRET || "your_session_secret",
        resave: false,
        saveUninitialized: false,
        store: MongoStore.create({
            mongoUrl: "mongodb://127.0.0.1:27017/student-bubble",
            ttl: 15 * 60 // 15 minutes in seconds
        }),
        cookie: {
            secure: false, // Insecure for localhost
            httpOnly: true,
            sameSite: "lax",
            maxAge: 15 * 60 * 1000, // 15 minutes in milliseconds
            expires: new Date(Date.now() + 15 * 60 * 1000) // 15 minutes from now
        }
    })
);

// Root Route - Use session only
app.get("/", (req, res) => {
    console.log("Root route - Session:", req.session, "Token:", req.headers["authorization"]?.split(" ")[1] || "Not provided"); // Debug
    if (req.session.userId) {
        return res.sendFile(path.join(__dirname, "dashboard.html"));
    }
    res.sendFile(path.join(__dirname, "login.html"));
});

// User Schema
const UserSchema = new mongoose.Schema({
    name: String,
    email: { type: String, unique: true },
    password: String,
    otp: String,
    otpExpires: Date,
    profile: {
        name: String,
        phone: String,
        studentId: String,
        major: String,
        yearOfStudy: String,
        eduQualification: String,
        cgpa: Number,
        university: String
    }
});

const User = mongoose.model("User", UserSchema);

// Task Schema
const TaskSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true },
    dueDate: { type: Date, required: true },
    importance: { type: String, required: true },
    completed: { type: Boolean, default: false }
});

const Task = mongoose.model("Task", TaskSchema);

// Assignment Schema
const AssignmentSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    course: { type: String, required: true },
    title: { type: String, required: true },
    dueDate: { type: Date, required: true },
    reminderTime: { type: Date },
    status: { type: String, default: "Pending" }
});

const Assignment = mongoose.model("Assignment", AssignmentSchema);

// Nodemailer Transporter Setup
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: "studentbubble00@gmail.com",
        pass: process.env.EMAIL_PASS || "nqcb htux srdp ajxj",
    },
});

// Generate OTP
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

// Middleware to Verify JWT and Session
const verifyToken = (req, res, next) => {
    const token = req.headers["authorization"]?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "No token provided" });

    jwt.verify(token, "your_jwt_secret", (err, decoded) => {
        if (err) return res.status(403).json({ message: "Invalid token" });
        req.userId = decoded.userId;

        // Fallback to JWT if session is missing
        if (!req.session.userId || req.session.userId !== decoded.userId) {
            console.warn("Session mismatch or missing, falling back to JWT:", req.session);
            req.session.userId = decoded.userId;
            req.session.save();
        }
        next();
    });
};

// Check Session Route
app.get("/check-session", verifyToken, async (req, res) => {
    try {
        const user = await User.findById(req.userId);
        if (!user) return res.status(404).json({ message: "User not found" });
        console.log("Check-session - Valid session for:", user.email);
        res.json({ message: "Session valid", email: user.email });
    } catch (err) {
        console.error("Error checking session:", err);
        res.status(500).json({ message: "Server error" });
    }
});

// Send OTP Route
app.post("/send-otp", async (req, res) => {
    const { email } = req.body;
    try {
        let user = await User.findOne({ email });
        if (user && user.password)
            return res.status(400).json({ message: "User already exists" });

        const otp = generateOTP();
        const otpExpires = Date.now() + 10 * 60 * 1000;

        if (user) {
            user.otp = otp;
            user.otpExpires = otpExpires;
        } else {
            user = new User({ email, otp, otpExpires });
        }

        await user.save();

        const mailOptions = {
            from: process.env.EMAIL_USER || "studentbubble00@gmail.com",
            to: email,
            subject: "Your OTP for Student Bubble Signup",
            text: `Your OTP is ${otp}. It is valid for 10 minutes.`,
        };

        await transporter.sendMail(mailOptions);
        res.json({ message: "OTP sent to your email" });
    } catch (err) {
        console.error("Error sending OTP:", err);
        res.status(500).json({ message: "Error sending OTP" });
    }
});

// Verify OTP Route
app.post("/verify-otp", async (req, res) => {
    const { email, otp } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user || user.otp !== otp || Date.now() > user.otpExpires) {
            return res.status(400).json({ message: "Invalid or expired OTP" });
        }
        res.json({ message: "OTP verified successfully" });
    } catch (err) {
        console.error("Error verifying OTP:", err);
        res.status(500).json({ message: "Server error" });
    }
});

// Signup Route
app.post("/signup", async (req, res) => {
    const { name, email, password } = req.body;
    try {
        let user = await User.findOne({ email });
        if (!user || !user.otp)
            return res.status(400).json({ message: "Please verify OTP first" });

        user.name = name;
        user.password = await bcrypt.hash(password, 10);
        user.otp = undefined;
        user.otpExpires = undefined;

        await user.save();

        req.session.userId = user._id;
        req.session.email = user.email;
        const token = jwt.sign({ userId: user._id }, "your_jwt_secret", { expiresIn: "1h" });

        console.log("Signup - Setting session:", req.session); // Debug session
        res.json({ message: "Signup successful", token, redirect: "http://localhost:5000/dashboard.html" });
    } catch (err) {
        console.error("Error during signup:", err);
        res.status(500).json({ message: "Server error" });
    }
});

// Login Route
app.post("/login", async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user || !(await bcrypt.compare(password, user.password)))
            return res.status(400).json({ message: "Invalid credentials" });

        const token = jwt.sign({ userId: user._id }, "your_jwt_secret", { expiresIn: "1h" });

        req.session.userId = user._id;
        req.session.email = user.email;

        console.log("Login - Setting session:", req.session); // Debug session
        res.json({ message: "Login successful", token, redirect: "http://localhost:5000/dashboard.html" });
    } catch (err) {
        console.error("Error during login:", err);
        res.status(500).json({ message: "Server error" });
    }
});

// Logout Route
app.post("/logout", (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error("Error during logout:", err);
            return res.status(500).json({ message: "Error logging out" });
        }
        res.clearCookie("connect.sid");
        res.json({ message: "Logout successful", redirect: "http://localhost:5000/login.html" });
    });
});

// Save Profile Route
app.post("/save-profile", verifyToken, async (req, res) => {
    const { name, phone, email, studentId, major, yearOfStudy, eduQualification, cgpa, university } = req.body;

    try {
        const user = await User.findById(req.userId);
        if (!user) return res.status(404).json({ message: "User not found" });

        user.email = email;
        user.profile = {
            name,
            phone,
            studentId,
            major,
            yearOfStudy,
            eduQualification,
            cgpa: parseFloat(cgpa),
            university
        };

        await user.save();
        req.session.email = email;
        res.json({ message: "Profile saved successfully" });
    } catch (err) {
        console.error("Error saving profile:", err);
        res.status(500).json({ message: "Server error" });
    }
});

// Get Profile Route
app.get("/get-profile", verifyToken, async (req, res) => {
    try {
        const user = await User.findById(req.userId);
        if (!user) return res.status(404).json({ message: "User not found" });

        res.json({ email: user.email, profile: user.profile || {} });
    } catch (err) {
        console.error("Error fetching profile:", err);
        res.status(500).json({ message: "Server error" });
    }
});

// Save Task Route
app.post("/save-task", verifyToken, async (req, res) => {
    const { name, dueDate, importance } = req.body;

    try {
        const task = new Task({
            userId: req.userId,
            name,
            dueDate,
            importance
        });
        await task.save();
        res.json({ message: "Task saved successfully", task });
    } catch (err) {
        console.error("Error saving task:", err);
        res.status(500).json({ message: "Server error" });
    }
});

// Get Tasks Route
app.get("/get-tasks", verifyToken, async (req, res) => {
    try {
        const tasks = await Task.find({ userId: req.userId });
        res.json(tasks);
    } catch (err) {
        console.error("Error fetching tasks:", err);
        res.status(500).json({ message: "Server error" });
    }
});

// Delete Task Route
app.delete("/delete-task/:id", verifyToken, async (req, res) => {
    try {
        const task = await Task.findOneAndDelete({ _id: req.params.id, userId: req.userId });
        if (!task) return res.status(404).json({ message: "Task not found" });
        res.json({ message: "Task deleted successfully" });
    } catch (err) {
        console.error("Error deleting task:", err);
        res.status(500).json({ message: "Server error" });
    }
});
//wjnc tllx awee otjh
// Save Assignment Route
app.post("/save-assignment", verifyToken, async (req, res) => {
    const { course, title, dueDate, reminderTime } = req.body;

    try {
        const assignment = new Assignment({
            userId: req.userId,
            course,
            title,
            dueDate,
            reminderTime: reminderTime || null
        });
        await assignment.save();

        const user = await User.findById(req.userId);
        const mailOptions = {
            from: "studentbubble00@gmail.com",
            to: user.email,
            subject: `Assignment Reminder: ${title}`,
            text: `Dear ${user.name},\n\nThis is a reminder for your assignment:\n\nCourse: ${course}\nTitle: ${title}\nDue Date: ${dueDate}\nReminder Time: ${reminderTime || "N/A"}\n\nBest regards,\nStudent Bubble Team`,
        };

        const scheduledTime = reminderTime ? new Date(reminderTime) : new Date(dueDate);
        if (!reminderTime) scheduledTime.setHours(9, 0, 0, 0);

        schedule.scheduleJob(scheduledTime, async () => {
            transporter.sendMail(mailOptions, async (error, info) => {
                if (error) {
                    console.error("Error sending assignment email:", error);
                } else {
                    console.log("Assignment email sent:", info.response);
                    try {
                        await Assignment.updateOne(
                            { _id: assignment._id, userId: req.userId },
                            { status: "Completed" }
                        );
                        console.log(`Assignment ${assignment._id} status updated to Completed`);
                    } catch (updateErr) {
                        console.error("Error updating assignment status:", updateErr);
                    }
                }
            });
        });

        res.json({ message: "Assignment saved and email scheduled", assignment });
    } catch (err) {
        console.error("Error saving assignment:", err);
        res.status(500).json({ message: "Server error" });
    }
});

// Get Assignments Route
app.get("/get-assignments", verifyToken, async (req, res) => {
    try {
        const assignments = await Assignment.find({ userId: req.userId });
        res.json(assignments);
    } catch (err) {
        console.error("Error fetching assignments:", err);
        res.status(500).json({ message: "Server error" });
    }
});

// Delete Assignment Route
app.delete("/delete-assignment/:id", verifyToken, async (req, res) => {
    try {
        const assignment = await Assignment.findOneAndDelete({ _id: req.params.id, userId: req.userId });
        if (!assignment) return res.status(404).json({ message: "Assignment not found" });
        res.json({ message: "Assignment deleted successfully" });
    } catch (err) {
        console.error("Error deleting assignment:", err);
        res.status(500).json({ message: "Server error" });
    }
});

// Multer Storage Config
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = "uploads/";
        if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath);
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + "-" + file.originalname);
    },
});

const upload = multer({ storage });

// Upload Notes Route
app.post("/upload", verifyToken, upload.single("file"), (req, res) => {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });
    res.json({ message: "File uploaded successfully", filename: req.file.filename });
});

// Get Uploaded Files
app.get("/files", verifyToken, (req, res) => {
    fs.readdir("uploads/", (err, files) => {
        if (err) {
            console.error("Error retrieving files:", err);
            return res.status(500).json({ message: "Error retrieving files" });
        }
        res.json(files);
    });
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));