// ============================================
// SMART ATTENDANCE SYSTEM - FRONTEND ONLY
// ============================================

console.log('🚀 Smart Attendance System Initializing...');

// ============================================
// 1. STATE MANAGEMENT
// ============================================

let state = {
    // Load data from localStorage or use defaults
    students: JSON.parse(localStorage.getItem('attendanceStudents')) || [],
    attendance: JSON.parse(localStorage.getItem('attendanceRecords')) || [],
    isRecognizing: false,
    isWebcamActive: false,
    currentFaceDescriptor: null,
    currentFaceImage: null,
    recognitionInterval: null,
    modelsLoaded: false
};

// ============================================
// 2. DOM ELEMENTS - CACHED FOR PERFORMANCE
// ============================================

const elements = {
    // Webcam elements
    video: document.getElementById('webcam'),
    canvas: document.getElementById('overlay'),
    captureBtn: document.getElementById('captureBtn'),
    registerBtn: document.getElementById('registerBtn'),
    
    // Recognition elements
    startRecognitionBtn: document.getElementById('startRecognition'),
    stopRecognitionBtn: document.getElementById('stopRecognition'),
    recognitionStatus: document.getElementById('recognitionStatus'),
    
    // Form elements
    studentId: document.getElementById('studentId'),
    studentName: document.getElementById('studentName'),
    studentCourse: document.getElementById('studentCourse'),
    facePreview: document.getElementById('facePreview'),
    subjectSelect: document.getElementById('subjectSelect'),
    
    // Table elements
    studentBody: document.getElementById('studentBody'),
    attendanceBody: document.getElementById('attendanceBody'),
    
    // Stat elements
    totalStudents: document.getElementById('totalStudents'),
    presentToday: document.getElementById('presentToday'),
    attendanceRate: document.getElementById('attendanceRate'),
    
    // Modal elements
    modal: document.getElementById('attendanceModal'),
    modalMessage: document.getElementById('modalMessage'),
    modalStudentName: document.getElementById('modalStudentName'),
    modalTime: document.getElementById('modalTime'),
    modalSubject: document.getElementById('modalSubject'),
    closeModal: document.getElementById('closeModal'),
    
    // Other UI elements
    searchInput: document.getElementById('searchInput'),
    exportBtn: document.getElementById('exportBtn'),
    clearAllBtn: document.getElementById('clearAllBtn'),
    datetime: document.getElementById('datetime'),
    dateDisplay: document.getElementById('dateDisplay'),
    instructionsModal: document.getElementById('instructionsModal'),
    startTutorial: document.getElementById('startTutorial')
};

// ============================================
// 3. INITIALIZATION
// ============================================

async function initializeApp() {
    console.log('📱 Initializing Smart Attendance System...');
    
    // Show instructions modal on first visit
    showInstructionsOnFirstVisit();
    
    // Update date and time
    updateDateTime();
    setInterval(updateDateTime, 1000);
    
    // Load face detection models
    await loadFaceModels();
    
    // Start webcam
    await startWebcam();
    
    // Initialize UI
    updateStudentTable();
    updateAttendanceTable();
    updateStatistics();
    
    // Setup event listeners
    setupEventListeners();
    
    console.log('✅ Smart Attendance System Ready!');
    updateStatus('System ready. Start by registering students.', 'info');
}

// ============================================
// 4. FACE DETECTION SETUP
// ============================================

async function loadFaceModels() {
    try {
        updateStatus('Loading face detection models...', 'loading');
        
        // Load models from CDN
        await faceapi.nets.tinyFaceDetector.loadFromUri('https://justadudewhohacks.github.io/face-api.js/models');
        await faceapi.nets.faceLandmark68Net.loadFromUri('https://justadudewhohacks.github.io/face-api.js/models');
        await faceapi.nets.faceRecognitionNet.loadFromUri('https://justadudewhohacks.github.io/face-api.js/models');
        
        state.modelsLoaded = true;
        updateStatus('Face detection models loaded successfully!', 'success');
        console.log('✅ Face models loaded');
    } catch (error) {
        console.error('❌ Error loading face models:', error);
        updateStatus('Using simplified mode (face models not loaded)', 'warning');
        // Fallback to mock mode
        state.modelsLoaded = false;
    }
}

// ============================================
// 5. WEBCAM MANAGEMENT
// ============================================

async function startWebcam() {
    try {
        updateStatus('Starting webcam...', 'loading');
        
        // Get webcam stream
        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
                width: { ideal: 640 },
                height: { ideal: 480 },
                facingMode: 'user'
            },
            audio: false
        });
        
        elements.video.srcObject = stream;
        state.isWebcamActive = true;
        
        // Wait for video to be ready
        elements.video.onloadedmetadata = () => {
            // Setup canvas for face detection overlay
            const displaySize = {
                width: elements.video.videoWidth,
                height: elements.video.videoHeight
            };
            
            faceapi.matchDimensions(elements.canvas, displaySize);
            updateStatus('Webcam started successfully', 'success');
        };
        
    } catch (error) {
        console.error('❌ Webcam error:', error);
        updateStatus('Webcam not available. Using manual mode.', 'error');
        
        // Show mock webcam for demo
        elements.video.style.display = 'none';
        elements.canvas.style.display = 'none';
        elements.captureBtn.disabled = true;
        elements.captureBtn.innerHTML = '<i class="fas fa-video-slash"></i> Webcam Not Available';
    }
}

function stopWebcam() {
    if (state.isWebcamActive && elements.video.srcObject) {
        const tracks = elements.video.srcObject.getTracks();
        tracks.forEach(track => track.stop());
        state.isWebcamActive = false;
    }
}

// ============================================
// 6. FACE CAPTURE & REGISTRATION
// ============================================

async function captureFace() {
    if (!state.modelsLoaded) {
        alert('⚠️ Face models not loaded. Using demo mode.');
        return mockCaptureFace();
    }
    
    try {
        updateStatus('Detecting face...', 'loading');
        
        // Detect face in video frame
        const detection = await faceapi.detectSingleFace(
            elements.video,
            new faceapi.TinyFaceDetectorOptions()
        ).withFaceLandmarks().withFaceDescriptor();
        
        if (detection) {
            // Store face descriptor
            state.currentFaceDescriptor = detection.descriptor;
            
            // Draw face landmarks on canvas
            const dims = faceapi.matchDimensions(elements.canvas, elements.video, true);
            const resizedDetection = faceapi.resizeResults(detection, dims);
            
            const ctx = elements.canvas.getContext('2d');
            ctx.clearRect(0, 0, elements.canvas.width, elements.canvas.height);
            
            // Draw face detection box
            faceapi.draw.drawDetections(elements.canvas, resizedDetection);
            faceapi.draw.drawFaceLandmarks(elements.canvas, resizedDetection);
            
            // Capture face image
            state.currentFaceImage = captureFaceImage();
            
            // Show preview
            elements.facePreview.innerHTML = `<img src="${state.currentFaceImage}" alt="Captured Face">`;
            elements.facePreview.classList.add('has-image');
            
            // Enable register button
            elements.registerBtn.disabled = false;
            
            updateStatus('✅ Face captured successfully! Fill details below.', 'success');
        } else {
            updateStatus('❌ No face detected. Please position face clearly.', 'error');
        }
    } catch (error) {
        console.error('Face capture error:', error);
        updateStatus('Error capturing face. Try again.', 'error');
    }
}

function mockCaptureFace() {
    // Mock function for when face API is not available
    state.currentFaceDescriptor = Array.from({ length: 128 }, () => Math.random());
    
    // Create a mock face image from video frame
    state.currentFaceImage = captureFaceImage();
    
    // Show preview
    elements.facePreview.innerHTML = `<img src="${state.currentFaceImage}" alt="Captured Face">`;
    elements.facePreview.classList.add('has-image');
    
    // Draw mock face box on canvas
    const ctx = elements.canvas.getContext('2d');
    ctx.clearRect(0, 0, elements.canvas.width, elements.canvas.height);
    ctx.strokeStyle = '#2ecc71';
    ctx.lineWidth = 3;
    ctx.strokeRect(80, 60, 160, 200);
    
    // Enable register button
    elements.registerBtn.disabled = false;
    
    updateStatus('✅ Face captured (Demo Mode)', 'success');
}

function captureFaceImage() {
    // Capture current video frame as image
    const canvas = document.createElement('canvas');
    canvas.width = elements.video.videoWidth;
    canvas.height = elements.video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    ctx.drawImage(elements.video, 0, 0, canvas.width, canvas.height);
    
    // Crop to face area (simplified - in real app, use face detection bounds)
    const faceCanvas = document.createElement('canvas');
    faceCanvas.width = 200;
    faceCanvas.height = 200;
    
    const faceCtx = faceCanvas.getContext('2d');
    faceCtx.drawImage(canvas, 
        canvas.width/2 - 100, canvas.height/2 - 100, 200, 200,
        0, 0, 200, 200
    );
    
    return faceCanvas.toDataURL('image/jpeg', 0.8);
}

function registerStudent() {
    // Get form values
    const studentId = elements.studentId.value.trim();
    const studentName = elements.studentName.value.trim();
    const studentCourse = elements.studentCourse.value.trim();
    
    // Validation
    if (!studentId || !studentName || !studentCourse) {
        alert('⚠️ Please fill all fields');
        return;
    }
    
    if (!state.currentFaceDescriptor) {
        alert('⚠️ Please capture face first');
        return;
    }
    
    // Check if student ID already exists
    if (state.students.some(student => student.id === studentId)) {
        alert('⚠️ Student ID already exists');
        return;
    }
    
    // Create student object
    const student = {
        id: studentId,
        name: studentName,
        course: studentCourse,
        faceDescriptor: Array.from(state.currentFaceDescriptor), // Convert to array for storage
        photo: state.currentFaceImage,
        registeredAt: new Date().toISOString()
    };
    
    // Add to state
    state.students.push(student);
    saveToLocalStorage();
    
    // Reset form
    resetRegistrationForm();
    
    // Update UI
    updateStudentTable();
    updateStatistics();
    
    // Show success message
    alert(`✅ Student "${studentName}" registered successfully!`);
    
    updateStatus(`Student ${studentName} registered. Total: ${state.students.length}`, 'success');
}

function resetRegistrationForm() {
    elements.studentId.value = '';
    elements.studentName.value = '';
    elements.studentCourse.value = '';
    elements.facePreview.innerHTML = '<i class="fas fa-user-circle" style="font-size: 50px; color: #ccc;"></i>';
    elements.facePreview.classList.remove('has-image');
    elements.registerBtn.disabled = true;
    
    // Clear canvas
    const ctx = elements.canvas.getContext('2d');
    ctx.clearRect(0, 0, elements.canvas.width, elements.canvas.height);
    
    state.currentFaceDescriptor = null;
    state.currentFaceImage = null;
}

// ============================================
// 7. FACE RECOGNITION & ATTENDANCE
// ============================================

async function startRecognition() {
    if (state.students.length === 0) {
        alert('⚠️ No students registered yet. Please register students first.');
        return;
    }
    
    state.isRecognizing = true;
    elements.startRecognitionBtn.disabled = true;
    elements.stopRecognitionBtn.disabled = false;
    
    updateStatus('🔄 Face recognition started. Looking for students...', 'loading');
    
    // Start recognition loop
    recognitionLoop();
}

function stopRecognition() {
    state.isRecognizing = false;
    elements.startRecognitionBtn.disabled = false;
    elements.stopRecognitionBtn.disabled = true;
    
    if (state.recognitionInterval) {
        clearInterval(state.recognitionInterval);
        state.recognitionInterval = null;
    }
    
    updateStatus('⏹️ Recognition stopped', 'info');
}

async function recognitionLoop() {
    if (!state.isRecognizing) return;
    
    try {
        if (state.modelsLoaded) {
            // Real face recognition
            const detections = await faceapi.detectAllFaces(
                elements.video,
                new faceapi.TinyFaceDetectorOptions()
            ).withFaceLandmarks().withFaceDescriptors();
            
            for (const detection of detections) {
                await recognizeFace(detection.descriptor);
            }
        } else {
            // Mock recognition for demo
            mockRecognizeFace();
        }
        
        // Continue loop after delay
        if (state.isRecognizing) {
            state.recognitionInterval = setTimeout(recognitionLoop, 3000);
        }
    } catch (error) {
        console.error('Recognition error:', error);
    }
}

async function recognizeFace(descriptor) {
    let bestMatch = null;
    let minDistance = 0.6; // Similarity threshold
    
    // Compare with all registered students
    for (const student of state.students) {
        if (!student.faceDescriptor) continue;
        
        const studentDescriptor = new Float32Array(student.faceDescriptor);
        const distance = faceapi.euclideanDistance(descriptor, studentDescriptor);
        
        if (distance < minDistance) {
            minDistance = distance;
            bestMatch = student;
        }
    }
    
    if (bestMatch) {
        markAttendance(bestMatch);
    }
}

function mockRecognizeFace() {
    // Mock recognition for demo
    if (state.students.length === 0) return;
    
    // Randomly pick a student for demo
    const randomIndex = Math.floor(Math.random() * state.students.length);
    const student = state.students[randomIndex];
    
    // Mark attendance with 70% probability for demo
    if (Math.random() > 0.3) {
        markAttendance(student);
    }
}

function markAttendance(student) {
    const today = new Date().toDateString();
    const subject = elements.subjectSelect.value;
    const subjectText = elements.subjectSelect.options[elements.subjectSelect.selectedIndex].text;
    const now = new Date();
    
    // Check if already marked today for this subject
    const alreadyMarked = state.attendance.some(record => 
        record.studentId === student.id && 
        record.date === today &&
        record.subject === subject
    );
    
    if (alreadyMarked) return;
    
    // Create attendance record
    const record = {
        studentId: student.id,
        studentName: student.name,
        date: today,
        time: now.toLocaleTimeString(),
        timestamp: now.getTime(),
        subject: subject,
        subjectText: subjectText,
        status: 'Present'
    };
    
    // Add to attendance records
    state.attendance.push(record);
    saveToLocalStorage();
    
    // Update UI
    updateAttendanceTable();
    updateStatistics();
    
    // Show confirmation modal
    showAttendanceModal(record);
    
    // Update status
    updateStatus(`✅ ${student.name} marked present for ${subjectText}`, 'success');
}

// ============================================
// 8. UI UPDATES & RENDERING
// ============================================

function updateStudentTable() {
    const searchTerm = elements.searchInput.value.toLowerCase();
    const filteredStudents = state.students.filter(student => 
        student.id.toLowerCase().includes(searchTerm) ||
        student.name.toLowerCase().includes(searchTerm) ||
        student.course.toLowerCase().includes(searchTerm)
    );
    
    if (filteredStudents.length === 0) {
        elements.studentBody.innerHTML = `
            <tr class="empty-row">
                <td colspan="5" style="text-align: center; color: #999; padding: 40px;">
                    <i class="fas fa-users" style="font-size: 48px; margin-bottom: 10px; display: block;"></i>
                    ${searchTerm ? 'No matching students found' : 'No students registered yet'}
                </td>
            </tr>
        `;
        return;
    }
    
    elements.studentBody.innerHTML = filteredStudents.map(student => `
        <tr>
            <td>
                <img src="${student.photo}" alt="${student.name}" class="student-photo"
                     onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"100\" height=\"100\" viewBox=\"0 0 100 100\"><circle cx=\"50\" cy=\"50\" r=\"45\" fill=\"%234a6fa5\"/><text x=\"50\" y=\"60\" text-anchor=\"middle\" fill=\"white\" font-size=\"40\">${student.name.charAt(0)}</text></svg>'">
            </td>
            <td><strong>${student.id}</strong></td>
            <td>${student.name}</td>
            <td>${student.course}</td>
            <td>
                <div class="action-buttons">
                    <button class="action-btn delete" onclick="deleteStudent('${student.id}')" 
                            title="Delete student">
                        <i class="fas fa-trash"></i>
                    </button>
                    <button class="action-btn view" onclick="viewStudent('${student.id}')" 
                            title="View details">
                        <i class="fas fa-eye"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

function updateAttendanceTable() {
    const today = new Date().toDateString();
    const subject = elements.subjectSelect.value;
    
    // Filter today's attendance for selected subject
    const todayAttendance = state.attendance.filter(record => 
        record.date === today && record.subject === subject
    ).sort((a, b) => b.timestamp - a.timestamp); // Most recent first
    
    if (todayAttendance.length === 0) {
        elements.attendanceBody.innerHTML = `
            <tr class="empty-row">
                <td colspan="4" style="text-align: center; color: #999;">
                    No attendance marked yet for today
                </td>
            </tr>
        `;
        return;
    }
    
    elements.attendanceBody.innerHTML = todayAttendance.map(record => `
        <tr>
            <td><strong>${record.studentId}</strong></td>
            <td>${record.studentName}</td>
            <td>${record.time}</td>
            <td><span class="status-badge status-present">${record.status}</span></td>
        </tr>
    `).join('');
    
    // Update date display
    elements.dateDisplay.textContent = `- ${today}`;
}

function updateStatistics() {
    const today = new Date().toDateString();
    const todayAttendance = state.attendance.filter(record => record.date === today);
    
    // Update counts
    elements.totalStudents.textContent = state.students.length;
    elements.presentToday.textContent = todayAttendance.length;
    
    // Calculate attendance rate
    const attendanceRate = state.students.length > 0 
        ? Math.round((todayAttendance.length / state.students.length) * 100)
        : 0;
    
    elements.attendanceRate.textContent = `${attendanceRate}%`;
    
    // Color code based on rate
    if (attendanceRate >= 80) {
        elements.attendanceRate.style.color = '#2ecc71';
    } else if (attendanceRate >= 50) {
        elements.attendanceRate.style.color = '#f39c12';
    } else {
        elements.attendanceRate.style.color = '#e74c3c';
    }
}

function updateDateTime() {
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
    const timeStr = now.toLocaleTimeString('en-US', { 
        hour12: true, 
        hour: '2-digit', 
        minute: '2-digit',
        second: '2-digit'
    });
    
    elements.datetime.textContent = `${dateStr} | ${timeStr}`;
}

function updateStatus(message, type = 'info') {
    const statusMap = {
        'loading': { icon: 'fas fa-sync fa-spin', color: '#f39c12', bgColor: '#fff3cd' },
        'success': { icon: 'fas fa-check-circle', color: '#2ecc71', bgColor: '#d4edda' },
        'error': { icon: 'fas fa-exclamation-circle', color: '#e74c3c', bgColor: '#f8d7da' },
        'warning': { icon: 'fas fa-exclamation-triangle', color: '#f39c12', bgColor: '#fff3cd' },
        'info': { icon: 'fas fa-info-circle', color: '#3498db', bgColor: '#d1ecf1' }
    };
    
    const status = statusMap[type] || statusMap.info;
    
    elements.recognitionStatus.innerHTML = `
        <i class="${status.icon}" style="color: ${status.color};"></i>
        ${message}
    `;
    elements.recognitionStatus.style.borderLeftColor = status.color;
    elements.recognitionStatus.style.background = status.bgColor;
}

// ============================================
// 9. MODAL FUNCTIONS
// ============================================

function showAttendanceModal(record) {
    elements.modalMessage.textContent = `Attendance marked successfully!`;
    elements.modalStudentName.textContent = record.studentName;
    elements.modalTime.textContent = record.time;
    elements.modalSubject.textContent = record.subjectText;
    
    elements.modal.style.display = 'block';
}

function showInstructionsOnFirstVisit() {
    const hasVisited = localStorage.getItem('hasVisitedAttendanceSystem');
    
    if (!hasVisited) {
        setTimeout(() => {
            elements.instructionsModal.style.display = 'block';
            localStorage.setItem('hasVisitedAttendanceSystem', 'true');
        }, 1000);
    }
}

function closeModal(modalElement) {
    modalElement.style.display = 'none';
}

// ============================================
// 10. DATA MANAGEMENT
// ============================================

function saveToLocalStorage() {
    try {
        localStorage.setItem('attendanceStudents', JSON.stringify(state.students));
        localStorage.setItem('attendanceRecords', JSON.stringify(state.attendance));
    } catch (error) {
        console.error('Error saving to localStorage:', error);
        alert('⚠️ Error saving data. Storage might be full.');
    }
}

function exportToCSV() {
    if (state.students.length === 0) {
        alert('⚠️ No data to export');
        return;
    }
    
    // Create CSV content
    let csv = 'Student ID,Name,Course,Registration Date\n';
    
    state.students.forEach(student => {
        const date = new Date(student.registeredAt).toLocaleDateString();
        csv += `"${student.id}","${student.name}","${student.course}","${date}"\n`;
    });
    
    // Create and trigger download
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    
    a.href = url;
    a.download = `attendance_students_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    updateStatus('✅ Data exported successfully', 'success');
}

function clearAllData() {
    if (!confirm('⚠️ WARNING: This will delete ALL students and attendance records. This action cannot be undone. Are you sure?')) {
        return;
    }
    
    state.students = [];
    state.attendance = [];
    saveToLocalStorage();
    
    updateStudentTable();
    updateAttendanceTable();
    updateStatistics();
    
    updateStatus('All data cleared', 'warning');
    alert('✅ All data has been cleared');
}

function deleteStudent(studentId) {
    if (!confirm('Are you sure you want to delete this student?')) {
        return;
    }
    
    // Find student name for message
    const student = state.students.find(s => s.id === studentId);
    const studentName = student ? student.name : 'Unknown';
    
    // Remove student
    state.students = state.students.filter(s => s.id !== studentId);
    
    // Also remove attendance records for this student
    state.attendance = state.attendance.filter(record => record.studentId !== studentId);
    
    saveToLocalStorage();
    updateStudentTable();
    updateAttendanceTable();
    updateStatistics();
    
    updateStatus(`Student "${studentName}" deleted`, 'warning');
}

function viewStudent(studentId) {
    const student = state.students.find(s => s.id === studentId);
    if (!student) return;
    
    alert(`Student Details:\n\nID: ${student.id}\nName: ${student.name}\nCourse: ${student.course}\nRegistered: ${new Date(student.registeredAt).toLocaleDateString()}`);
}

// ============================================
// 11. EVENT LISTENERS SETUP
// ============================================

function setupEventListeners() {
    // Face capture and registration
    elements.captureBtn.addEventListener('click', captureFace);
    elements.registerBtn.addEventListener('click', registerStudent);
    
    // Attendance recognition
    elements.startRecognitionBtn.addEventListener('click', startRecognition);
    elements.stopRecognitionBtn.addEventListener('click', stopRecognition);
    
    // Subject change
    elements.subjectSelect.addEventListener('change', updateAttendanceTable);
    
    // Search
    elements.searchInput.addEventListener('input', updateStudentTable);
    
    // Export and clear
    elements.exportBtn.addEventListener('click', exportToCSV);
    elements.clearAllBtn.addEventListener('click', clearAllData);
    
    // Modal controls
    elements.closeModal.addEventListener('click', () => closeModal(elements.modal));
    
    // Close modals when clicking X
    document.querySelectorAll('.close-modal').forEach(closeBtn => {
        closeBtn.addEventListener('click', function() {
            const modal = this.closest('.modal');
            closeModal(modal);
        });
    });
    
    // Close modal when clicking outside
    window.addEventListener('click', (event) => {
        if (event.target.classList.contains('modal')) {
            closeModal(event.target);
        }
    });
    
    // Start tutorial button
    if (elements.startTutorial) {
        elements.startTutorial.addEventListener('click', () => {
            closeModal(elements.instructionsModal);
        });
    }
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // Ctrl+S to save (register)
        if (e.ctrlKey && e.key === 's') {
            e.preventDefault();
            elements.registerBtn.click();
        }
        
        // Escape to close modals
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal').forEach(modal => {
                if (modal.style.display === 'block') {
                    closeModal(modal);
                }
            });
        }
    });
    
    // Form submission
    document.querySelectorAll('.registration-form input').forEach(input => {
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                elements.registerBtn.click();
            }
        });
    });
}

// ============================================
// 12. CLEANUP ON PAGE UNLOAD
// ============================================

window.addEventListener('beforeunload', () => {
    stopRecognition();
    stopWebcam();
});

// ============================================
// 13. START THE APPLICATION
// ============================================

// Start the app when DOM is fully loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    // DOM already loaded
    initializeApp();
}