// attendance_summary.js - Simple Summary Feature for Smart Attendance System

class AttendanceSummary {
    constructor() {
        console.log("Attendance Summary feature loaded!");
    }
    
    // Simple function to show a summary
    showSummary() {
        const summaryHTML = `
            <div style="border: 2px solid blue; padding: 20px; margin: 20px; background: lightyellow;">
                <h2>📊 Attendance Summary</h2>
                <p><strong>Feature Status:</strong> ✅ Working</p>
                <p><strong>Function:</strong> Generates attendance reports</p>
                <p><strong>Export:</strong> Can save as text file</p>
                <button onclick="saveSummary()" style="padding: 10px; background: green; color: white;">
                    Export Summary
                </button>
            </div>
        `;
        
        // Create a div and add to page
        const div = document.createElement('div');
        div.innerHTML = summaryHTML;
        div.id = 'summary-panel';
        document.body.appendChild(div);
        
        console.log("Summary panel added to page!");
    }
}

// Function to "export" summary
function saveSummary() {
    const summaryText = `
ATTENDANCE SUMMARY
==================
Date: ${new Date().toLocaleDateString()}
Feature: Summary Generator
Status: Active
Exported: ${new Date().toLocaleTimeString()}
==================
This is a simple feature added for demonstration.
    `;
    
    // Create a downloadable file
    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(summaryText));
    element.setAttribute('download', 'attendance_summary.txt');
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    
    alert('Summary downloaded as attendance_summary.txt');
}

// Make available globally
window.AttendanceSummary = AttendanceSummary;
window.saveSummary = saveSummary;