// Main Application Logic

class SchedulerApp {
    constructor() {
        this.scheduler = new CPUScheduler();
        this.selectedAlgorithm = null;
        this.processColors = [
            '#ff6b6b', '#4ecdc4', '#45b7d1', '#f9ca24',
            '#6c5ce7', '#fd79a8', '#00b894', '#e17055'
        ];
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        // Process form submission
        document.getElementById('processForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addProcess();
        });

        // Clear all processes
        document.getElementById('clearAll').addEventListener('click', () => {
            this.clearAllProcesses();
        });

        // Algorithm selection
        document.querySelectorAll('.algorithm-card').forEach(card => {
            card.addEventListener('click', () => {
                this.selectAlgorithm(card.dataset.algo);
            });
        });

        // Simulation button
        document.getElementById('simulate').addEventListener('click', () => {
            this.runSimulation();
        });

        // Auto-focus on PID input
        document.getElementById('pid').focus();
    }

    addProcess() {
        const pid = document.getElementById('pid').value.trim();
        const arrivalTime = parseInt(document.getElementById('arrivalTime').value);
        const burstTime = parseInt(document.getElementById('burstTime').value);
        const priority = parseInt(document.getElementById('priority').value) || 0;

        // Validation
        if (!pid) {
            this.showError('Process ID is required');
            return;
        }

        if (this.scheduler.processes.some(p => p.pid === pid)) {
            this.showError('Process ID must be unique');
            return;
        }

        if (isNaN(arrivalTime) || arrivalTime < 0) {
            this.showError('Arrival time must be a non-negative number');
            return;
        }

        if (isNaN(burstTime) || burstTime <= 0) {
            this.showError('Burst time must be a positive number');
            return;
        }

        // Add process
        this.scheduler.addProcess(pid, arrivalTime, burstTime, priority);
        this.updateProcessList();
        this.clearForm();
        this.updateSimulateButton();

        // Show success feedback
        this.showSuccess(`Process ${pid} added successfully!`);
    }

    clearForm() {
        document.getElementById('processForm').reset();
        document.getElementById('priority').value = '0';
        document.getElementById('pid').focus();
    }

    clearAllProcesses() {
        this.scheduler.clearProcesses();
        this.updateProcessList();
        this.updateSimulateButton();
        this.hideResults();
        this.showSuccess('All processes cleared!');
    }

    updateProcessList() {
        const processList = document.getElementById('processList');

        if (this.scheduler.processes.length === 0) {
            processList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-inbox"></i>
                    <p>No processes added yet. Add some processes to get started!</p>
                </div>
            `;
            return;
        }

        processList.innerHTML = this.scheduler.processes
            .map((process, index) => `
                <div class="process-item">
                    <div class="process-id">${process.pid}</div>
                    <div class="process-info">
                        <div class="process-detail">
                            <div class="label">Arrival</div>
                            <div class="value">${process.arrivalTime}</div>
                        </div>
                        <div class="process-detail">
                            <div class="label">Burst</div>
                            <div class="value">${process.burstTime}</div>
                        </div>
                        <div class="process-detail">
                            <div class="label">Priority</div>
                            <div class="value">${process.priority}</div>
                        </div>
                        <div class="process-detail">
                            <div class="label">Status</div>
                            <div class="value">Ready</div>
                        </div>
                    </div>
                    <button class="remove-btn" onclick="app.removeProcess('${process.pid}')">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `).join('');
    }

    removeProcess(pid) {
        this.scheduler.processes = this.scheduler.processes.filter(p => p.pid !== pid);
        this.updateProcessList();
        this.updateSimulateButton();
        this.showSuccess(`Process ${pid} removed!`);
    }

    selectAlgorithm(algorithm) {
        // Remove previous selection
        document.querySelectorAll('.algorithm-card').forEach(card => {
            card.classList.remove('selected');
        });

        // Add selection to clicked card
        document.querySelector(`[data-algo="${algorithm}"]`).classList.add('selected');
        this.selectedAlgorithm = algorithm;

        // Show/hide quantum input for Round Robin
        const quantumInput = document.getElementById('quantumInput');
        if (algorithm === 'rr') {
            quantumInput.style.display = 'flex';
        } else {
            quantumInput.style.display = 'none';
        }

        this.updateSimulateButton();
    }

    updateSimulateButton() {
        const simulateBtn = document.getElementById('simulate');
        const canSimulate = this.scheduler.processes.length > 0 && this.selectedAlgorithm;

        simulateBtn.disabled = !canSimulate;

        if (canSimulate) {
            simulateBtn.innerHTML = '<i class="fas fa-play"></i> Run Simulation';
        } else {
            simulateBtn.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Add processes and select algorithm';
        }
    }

    runSimulation() {
        if (!this.selectedAlgorithm || this.scheduler.processes.length === 0) {
            this.showError('Please add processes and select an algorithm');
            return;
        }

        // Show loading state
        const simulateBtn = document.getElementById('simulate');
        const originalContent = simulateBtn.innerHTML;
        simulateBtn.innerHTML = '<div class="loading"></div> Running Simulation...';
        simulateBtn.disabled = true;

        // Run simulation with a small delay for better UX
        setTimeout(() => {
            try {
                let result;

                switch (this.selectedAlgorithm) {
                    case 'fcfs':
                        result = this.scheduler.fcfs();
                        break;
                    case 'sjf':
                        result = this.scheduler.sjf();
                        break;
                    case 'rr':
                        const quantum = parseInt(document.getElementById('timeQuantum').value);
                        if (isNaN(quantum) || quantum <= 0) {
                            throw new Error('Time quantum must be a positive number');
                        }
                        result = this.scheduler.roundRobin(quantum);
                        break;
                    case 'priority':
                        result = this.scheduler.priority();
                        break;
                    default:
                        throw new Error('Invalid algorithm selected');
                }

                this.displayResults(result);
                this.showSuccess('Simulation completed successfully!');

            } catch (error) {
                this.showError(error.message);
            } finally {
                // Restore button state
                simulateBtn.innerHTML = originalContent;
                simulateBtn.disabled = false;
            }
        }, 500);
    }

    displayResults(result) {
        this.displayGanttChart(result.schedule);
        this.displayMetricsTable(result.processes);
        this.displayPerformanceSummary(result.metrics);

        // Show results section
        document.getElementById('resultsSection').style.display = 'block';

        // Scroll to results
        document.getElementById('resultsSection').scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });
    }

    displayGanttChart(schedule) {
        const ganttChart = document.getElementById('ganttChart');

        if (schedule.length === 0) {
            ganttChart.innerHTML = '<p>No schedule to display</p>';
            return;
        }

        const maxTime = Math.max(...schedule.map(block => block.endTime));
        const timelineWidth = Math.max(800, maxTime * 40); // Minimum 800px, or 40px per time unit

        let timelineHTML = '<div class="gantt-timeline" style="width: ' + timelineWidth + 'px; position: relative;">';
        let labelsHTML = '<div class="gantt-labels" style="width: ' + timelineWidth + 'px; position: relative;">';

        schedule.forEach((block, index) => {
            const duration = block.endTime - block.startTime;
            const widthPx = (duration / maxTime) * timelineWidth;
            const leftPx = (block.startTime / maxTime) * timelineWidth;

            let colorClass = 'idle';
            if (!block.isIdle) {
                const processIndex = this.scheduler.processes.findIndex(p => p.pid === block.pid);
                colorClass = `process-color-${processIndex % this.processColors.length}`;
            }

            timelineHTML += `
                <div class="gantt-block ${colorClass}" 
                     style="width: ${widthPx}px; left: ${leftPx}px; position: absolute; height: 100%; top: 0;"
                     title="${block.pid}: ${block.startTime} - ${block.endTime} (${duration} units)">
                    ${block.pid}
                </div>
            `;
        });

        // Add time labels
        for (let i = 0; i <= maxTime; i++) {
            const leftPx = (i / maxTime) * timelineWidth;
            labelsHTML += `
                <div class="gantt-label" style="position: absolute; left: ${leftPx}px;">
                    ${i}
                </div>
            `;
        }

        timelineHTML += '</div>';
        labelsHTML += '</div>';

        ganttChart.innerHTML = timelineHTML + labelsHTML;
    }

    displayMetricsTable(processes) {
        const metricsTable = document.getElementById('metricsTable');

        let tableHTML = `
            <table>
                <thead>
                    <tr>
                        <th>Process ID</th>
                        <th>Arrival Time</th>
                        <th>Burst Time</th>
                        <th>Priority</th>
                        <th>Start Time</th>
                        <th>Completion Time</th>
                        <th>Turnaround Time</th>
                        <th>Waiting Time</th>
                    </tr>
                </thead>
                <tbody>
        `;

        processes
            .sort((a, b) => a.pid.localeCompare(b.pid))
            .forEach(process => {
                tableHTML += `
                    <tr>
                        <td><strong>${process.pid}</strong></td>
                        <td>${process.arrivalTime}</td>
                        <td>${process.burstTime}</td>
                        <td>${process.priority}</td>
                        <td>${process.startTime ?? '-'}</td>
                        <td>${process.completionTime ?? '-'}</td>
                        <td>${process.turnaroundTime ?? '-'}</td>
                        <td>${process.waitingTime ?? '-'}</td>
                    </tr>
                `;
            });

        tableHTML += '</tbody></table>';
        metricsTable.innerHTML = tableHTML;
    }

    displayPerformanceSummary(metrics) {
        const performanceSummary = document.getElementById('performanceSummary');

        performanceSummary.innerHTML = `
            <div class="metric-card">
                <div class="metric-value">${metrics.avgWaitingTime.toFixed(2)}</div>
                <div class="metric-label">Average Waiting Time</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${metrics.avgTurnaroundTime.toFixed(2)}</div>
                <div class="metric-label">Average Turnaround Time</div>
            </div>
        `;
    }

    hideResults() {
        document.getElementById('resultsSection').style.display = 'none';
    }

    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    showNotification(message, type) {
        // Remove existing notifications
        const existingNotifications = document.querySelectorAll('.notification');
        existingNotifications.forEach(n => n.remove());

        // Create notification
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
            <span>${message}</span>
        `;

        // Add styles
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#28a745' : '#dc3545'};
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 10px 25px rgba(0,0,0,0.2);
            z-index: 1000;
            display: flex;
            align-items: center;
            gap: 10px;
            font-weight: 500;
            animation: slideInRight 0.3s ease;
        `;

        // Add animation keyframes if not already added
        if (!document.querySelector('#notification-styles')) {
            const style = document.createElement('style');
            style.id = 'notification-styles';
            style.textContent = `
                @keyframes slideInRight {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes slideOutRight {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(100%); opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }

        document.body.appendChild(notification);

        // Auto remove after 3 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new SchedulerApp();

    // Add some sample processes for demo (optional)
    // Uncomment the lines below to pre-populate with sample data
    /*
    app.scheduler.addProcess('P1', 0, 5, 2);
    app.scheduler.addProcess('P2', 1, 3, 1);
    app.scheduler.addProcess('P3', 2, 8, 3);
    app.updateProcessList();
    app.updateSimulateButton();
    */
});