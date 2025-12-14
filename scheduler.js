// CPU Scheduler Algorithms - JavaScript Implementation

class Process {
    constructor(pid, arrivalTime, burstTime, priority = 0) {
        this.pid = pid;
        this.arrivalTime = arrivalTime;
        this.burstTime = burstTime;
        this.priority = priority;

        // Runtime fields
        this.startTime = null;
        this.completionTime = null;
        this.waitingTime = null;
        this.turnaroundTime = null;
        this.remainingTime = burstTime;
    }

    reset() {
        this.startTime = null;
        this.completionTime = null;
        this.waitingTime = null;
        this.turnaroundTime = null;
        this.remainingTime = this.burstTime;
    }
}

class CPUScheduler {
    constructor() {
        this.processes = [];
        this.schedule = [];
    }

    addProcess(pid, arrivalTime, burstTime, priority = 0) {
        const process = new Process(pid, arrivalTime, burstTime, priority);
        this.processes.push(process);
        return process;
    }

    clearProcesses() {
        this.processes = [];
        this.schedule = [];
    }

    resetProcesses() {
        this.processes.forEach(p => p.reset());
        this.schedule = [];
    }

    computeMetrics() {
        let totalWaiting = 0;
        let totalTurnaround = 0;
        const n = this.processes.length;

        this.processes.forEach(p => {
            if (p.completionTime !== null) {
                p.turnaroundTime = p.completionTime - p.arrivalTime;
                p.waitingTime = p.turnaroundTime - p.burstTime;
                totalWaiting += p.waitingTime;
                totalTurnaround += p.turnaroundTime;
            }
        });

        return {
            avgWaitingTime: n > 0 ? totalWaiting / n : 0,
            avgTurnaroundTime: n > 0 ? totalTurnaround / n : 0,
            totalWaiting,
            totalTurnaround
        };
    }

    // First Come First Served
    fcfs() {
        this.resetProcesses();
        const processes = [...this.processes].sort((a, b) => {
            if (a.arrivalTime !== b.arrivalTime) {
                return a.arrivalTime - b.arrivalTime;
            }
            return a.pid.localeCompare(b.pid);
        });

        let time = 0;
        this.schedule = [];

        processes.forEach(p => {
            if (time < p.arrivalTime) {
                // CPU idle
                this.schedule.push({
                    startTime: time,
                    endTime: p.arrivalTime,
                    pid: 'Idle',
                    isIdle: true
                });
                time = p.arrivalTime;
            }

            p.startTime = time;
            time += p.burstTime;
            p.completionTime = time;

            this.schedule.push({
                startTime: p.startTime,
                endTime: p.completionTime,
                pid: p.pid,
                isIdle: false
            });
        });

        return {
            schedule: this.schedule,
            metrics: this.computeMetrics(),
            processes: this.processes
        };
    }

    // Shortest Job First (Non-preemptive)
    sjf() {
        this.resetProcesses();
        const remaining = [...this.processes];
        let time = Math.min(...remaining.map(p => p.arrivalTime));
        let completed = 0;
        const n = remaining.length;
        this.schedule = [];

        while (completed < n) {
            // Get ready processes
            const ready = remaining.filter(p =>
                p.completionTime === null && p.arrivalTime <= time
            );

            if (ready.length === 0) {
                // No process ready, jump to next arrival
                const nextArrivals = remaining
                    .filter(p => p.completionTime === null)
                    .map(p => p.arrivalTime);

                if (nextArrivals.length > 0) {
                    const nextTime = Math.min(...nextArrivals);
                    this.schedule.push({
                        startTime: time,
                        endTime: nextTime,
                        pid: 'Idle',
                        isIdle: true
                    });
                    time = nextTime;
                }
                continue;
            }

            // Choose process with smallest burst time
            const p = ready.reduce((min, curr) => {
                if (curr.burstTime !== min.burstTime) {
                    return curr.burstTime < min.burstTime ? curr : min;
                }
                if (curr.arrivalTime !== min.arrivalTime) {
                    return curr.arrivalTime < min.arrivalTime ? curr : min;
                }
                return curr.pid.localeCompare(min.pid) < 0 ? curr : min;
            });

            p.startTime = time;
            time += p.burstTime;
            p.completionTime = time;
            completed++;

            this.schedule.push({
                startTime: p.startTime,
                endTime: p.completionTime,
                pid: p.pid,
                isIdle: false
            });
        }

        return {
            schedule: this.schedule,
            metrics: this.computeMetrics(),
            processes: this.processes
        };
    }

    // Round Robin
    roundRobin(quantum) {
        if (quantum <= 0) {
            throw new Error('Quantum must be > 0');
        }

        this.resetProcesses();
        const processes = [...this.processes].sort((a, b) => a.arrivalTime - b.arrivalTime);
        const n = processes.length;
        let time = n > 0 ? processes[0].arrivalTime : 0;
        let i = 0;
        const readyQueue = [];
        this.schedule = [];

        // Initialize remaining times
        processes.forEach(p => {
            p.remainingTime = p.burstTime;
        });

        while (i < n || readyQueue.length > 0) {
            // Add newly arrived processes to ready queue
            while (i < n && processes[i].arrivalTime <= time) {
                readyQueue.push(processes[i]);
                i++;
            }

            if (readyQueue.length === 0) {
                // No process ready, jump to next arrival
                if (i < n) {
                    const nextArrival = processes[i].arrivalTime;
                    if (time < nextArrival) {
                        this.schedule.push({
                            startTime: time,
                            endTime: nextArrival,
                            pid: 'Idle',
                            isIdle: true
                        });
                        time = nextArrival;
                    }
                }
                continue;
            }

            // Get first process from ready queue
            const current = readyQueue.shift();

            // Set start time if first execution
            if (current.startTime === null) {
                current.startTime = time;
            }

            // Execute for quantum or until completion
            const runTime = Math.min(quantum, current.remainingTime);
            const startTime = time;
            time += runTime;
            current.remainingTime -= runTime;

            this.schedule.push({
                startTime: startTime,
                endTime: time,
                pid: current.pid,
                isIdle: false
            });

            // Add newly arrived processes during this time slice
            while (i < n && processes[i].arrivalTime <= time) {
                readyQueue.push(processes[i]);
                i++;
            }

            // If process still has remaining time, put it back in queue
            if (current.remainingTime > 0) {
                readyQueue.push(current);
            } else {
                current.completionTime = time;
            }
        }

        return {
            schedule: this.schedule,
            metrics: this.computeMetrics(),
            processes: this.processes
        };
    }

    // Priority Scheduling (Non-preemptive)
    priority() {
        this.resetProcesses();
        const remaining = [...this.processes];
        let time = Math.min(...remaining.map(p => p.arrivalTime));
        let completed = 0;
        const n = remaining.length;
        this.schedule = [];

        while (completed < n) {
            // Get ready processes
            const ready = remaining.filter(p =>
                p.completionTime === null && p.arrivalTime <= time
            );

            if (ready.length === 0) {
                // No process ready, jump to next arrival
                const nextArrivals = remaining
                    .filter(p => p.completionTime === null)
                    .map(p => p.arrivalTime);

                if (nextArrivals.length > 0) {
                    const nextTime = Math.min(...nextArrivals);
                    this.schedule.push({
                        startTime: time,
                        endTime: nextTime,
                        pid: 'Idle',
                        isIdle: true
                    });
                    time = nextTime;
                }
                continue;
            }

            // Choose process with highest priority (lowest priority number)
            const p = ready.reduce((min, curr) => {
                if (curr.priority !== min.priority) {
                    return curr.priority < min.priority ? curr : min;
                }
                if (curr.arrivalTime !== min.arrivalTime) {
                    return curr.arrivalTime < min.arrivalTime ? curr : min;
                }
                return curr.pid.localeCompare(min.pid) < 0 ? curr : min;
            });

            p.startTime = time;
            time += p.burstTime;
            p.completionTime = time;
            completed++;

            this.schedule.push({
                startTime: p.startTime,
                endTime: p.completionTime,
                pid: p.pid,
                isIdle: false
            });
        }

        return {
            schedule: this.schedule,
            metrics: this.computeMetrics(),
            processes: this.processes
        };
    }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Process, CPUScheduler };
}