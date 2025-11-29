"""
Intelligent CPU Scheduler Simulator - Console Version (v1)

Implements:
- FCFS (First Come First Served)
- SJF (Shortest Job First, non-preemptive)
- Round Robin
- Priority Scheduling (non-preemptive)

Features:
- Take user input: processes with arrival time, burst time, priority
- Simulate chosen scheduling algorithm
- Display Gantt chart (text-based)
- Display per-process metrics:
    - Completion time
    - Turnaround time
    - Waiting time
- Display average waiting and turnaround times

This is a good "Step 2" base to push on GitHub.
You can later:
- Refactor into multiple modules
- Add GUI + real-time visualization
- Add "intelligent" recommendations or ML models
"""

from dataclasses import dataclass
from typing import List, Optional, Tuple


# ------------------------------
# Data Models
# ------------------------------

@dataclass
class Process:
    pid: str
    arrival_time: int
    burst_time: int
    priority: int = 0

    # Filled during simulation
    start_time: Optional[int] = None
    completion_time: Optional[int] = None
    waiting_time: Optional[int] = None
    turnaround_time: Optional[int] = None
    remaining_time: Optional[int] = None  # mainly for RR / preemptive


# A Gantt block: (start_time, end_time, pid)
GanttBlock = Tuple[int, int, str]


# ------------------------------
# Helper Functions
# ------------------------------

def reset_processes(processes: List[Process]) -> None:
    """Reset runtime fields so the same list can be reused for another algorithm."""
    for p in processes:
        p.start_time = None
        p.completion_time = None
        p.waiting_time = None
        p.turnaround_time = None
        p.remaining_time = p.burst_time
        


def compute_metrics(processes: List[Process]) -> dict:
    """Compute waiting and turnaround times for all processes and return averages."""
    total_waiting = 0
    total_turnaround = 0
    n = len(processes)

    for p in processes:
        if p.completion_time is None:
            continue  # should not normally happen
        p.turnaround_time = p.completion_time - p.arrival_time
        p.waiting_time = p.turnaround_time - p.burst_time

        total_waiting += p.waiting_time
        total_turnaround += p.turnaround_time

    avg_waiting = total_waiting / n if n > 0 else 0.0
    avg_turnaround = total_turnaround / n if n > 0 else 0.0

    return {
        "avg_waiting_time": avg_waiting,
        "avg_turnaround_time": avg_turnaround,
    }


def print_process_table(processes: List[Process]) -> None:
    """Print a neat table of process metrics."""
    print("\nProcess Table:")
    print("-" * 72)
    print(
        f"{'PID':<8}{'Arrive':<8}{'Burst':<8}{'Prio':<8}"
        f"{'Start':<8}{'Complete':<10}{'Turnaround':<12}{'Waiting':<8}"
    )
    print("-" * 72)
    for p in sorted(processes, key=lambda x: x.pid):
        print(
            f"{p.pid:<8}{p.arrival_time:<8}{p.burst_time:<8}{p.priority:<8}"
            f"{(p.start_time if p.start_time is not None else '-'): <8}"
            f"{(p.completion_time if p.completion_time is not None else '-'): <10}"
            f"{(p.turnaround_time if p.turnaround_time is not None else '-'): <12}"
            f"{(p.waiting_time if p.waiting_time is not None else '-'): <8}"
        )
    print("-" * 72)


def print_gantt_chart(schedule: List[GanttBlock]) -> None:
    """Print a simple text-based Gantt chart."""
    if not schedule:
        print("No schedule to show.")
        return

    print("\nGantt Chart (time in units):")

    # Top bar with process labels
    timeline = ""
    labels = ""
    current_time = schedule[0][0]

    for start, end, pid in schedule:
        # handle gaps (idle)
        if start > current_time:
            idle_length = start - current_time
            timeline += "-" * idle_length
            labels += " " * idle_length
            current_time = start

        length = end - start
        block = "#" * length
        timeline += block

        # center the pid in its block as much as possible
        pid_str = pid
        pid_pos = current_time + length // 2
        # ensure labels string is long enough
        while len(labels) < pid_pos:
            labels += " "
        labels = labels[:pid_pos] + pid_str + labels[pid_pos + len(pid_str):] if pid_pos + len(pid_str) <= len(labels) else labels + pid_str

        current_time = end

    print(timeline)
    print(labels)

    # Print times underneath
    time_line = ""
    for start, end, pid in schedule:
        if len(time_line) == 0:
            time_line += f"{start}"
        # pad until end
        span = end - start
        time_line += " " * (span - 1) + f"{end}"
    print(time_line)
    print()


# ------------------------------
# Scheduling Algorithms
# ------------------------------

def fcfs(processes: List[Process]) -> List[GanttBlock]:
    """First-Come First-Served scheduling."""
    reset_processes(processes)
    schedule: List[GanttBlock] = []

    # Sort by arrival time, then PID (for stable, deterministic order)
    procs = sorted(processes, key=lambda p: (p.arrival_time, p.pid))
    time = 0

    for p in procs:
        if time < p.arrival_time:
            # CPU is idle
            schedule.append((time, p.arrival_time, "Idle"))
            time = p.arrival_time

        p.start_time = time
        time += p.burst_time
        p.completion_time = time
        schedule.append((p.start_time, p.completion_time, p.pid))

    compute_metrics(processes)
    return schedule


def sjf_non_preemptive(processes: List[Process]) -> List[GanttBlock]:
    """Shortest Job First (non-preemptive)."""
    reset_processes(processes)
    schedule: List[GanttBlock] = []

    remaining = processes[:]
    time = min(p.arrival_time for p in remaining) if remaining else 0

    completed = 0
    n = len(remaining)

    while completed < n:
        # ready queue: processes that have arrived and not completed
        ready = [p for p in remaining if p.completion_time is None and p.arrival_time <= time]

        if not ready:
            # no process is ready, jump to next arrival
            next_arrivals = [p.arrival_time for p in remaining if p.completion_time is None]
            if not next_arrivals:
                break
            next_time = min(next_arrivals)
            schedule.append((time, next_time, "Idle"))
            time = next_time
            continue

        # choose process with smallest burst time (tie-break by arrival, then pid)
        p = min(ready, key=lambda x: (x.burst_time, x.arrival_time, x.pid))

        p.start_time = time
        time += p.burst_time
        p.completion_time = time
        schedule.append((p.start_time, p.completion_time, p.pid))
        completed += 1

    compute_metrics(processes)
    return schedule


def round_robin(processes: List[Process], quantum: int) -> List[GanttBlock]:
    """Round Robin scheduling with given time quantum."""
    if quantum <= 0:
        raise ValueError("Quantum must be > 0")

    reset_processes(processes)
    schedule: List[GanttBlock] = []

    # Sort by arrival time initially
    procs = sorted(processes, key=lambda p: p.arrival_time)
    n = len(procs)
    time = procs[0].arrival_time if n > 0 else 0

    # index to track which processes have "arrived" into the ready queue
    i = 0
    ready_queue: List[Process] = []

    while i < n or ready_queue:
        # Add newly arrived processes to ready queue
        while i < n and procs[i].arrival_time <= time:
            ready_queue.append(procs[i])
            procs[i].remaining_time = procs[i].burst_time
            i += 1

        if not ready_queue:
            # no process is ready; jump to next arrival
            if i < n:
                next_arrival = procs[i].arrival_time
                if time < next_arrival:
                    schedule.append((time, next_arrival, "Idle"))
                    time = next_arrival
                continue
            else:
                break

        # Pop first process from ready queue
        current = ready_queue.pop(0)

        # First time this process gets CPU
        if current.start_time is None:
            current.start_time = time
            if current.remaining_time is None:
                current.remaining_time = current.burst_time

        # Execute for one quantum or until completion
        run_time = min(quantum, current.remaining_time)
        start = time
        time += run_time
        end = time
        current.remaining_time -= run_time
        schedule.append((start, end, current.pid))

        # Add newly arrived processes that arrived during this time slice
        while i < n and procs[i].arrival_time <= time:
            ready_queue.append(procs[i])
            procs[i].remaining_time = procs[i].burst_time
            i += 1

        # If process still has remaining time, put it back in the queue
        if current.remaining_time > 0:
            ready_queue.append(current)
        else:
            current.completion_time = time

    compute_metrics(processes)
    return schedule


def priority_non_preemptive(processes: List[Process]) -> List[GanttBlock]:
    """Priority scheduling (non-preemptive).
       Lower 'priority' value means higher priority."""
    reset_processes(processes)
    schedule: List[GanttBlock] = []

    remaining = processes[:]
    time = min(p.arrival_time for p in remaining) if remaining else 0
    completed = 0
    n = len(remaining)

    while completed < n:
        ready = [p for p in remaining if p.completion_time is None and p.arrival_time <= time]

        if not ready:
            # no process is ready, jump to next arrival
            next_arrivals = [p.arrival_time for p in remaining if p.completion_time is None]
            if not next_arrivals:
                break
            next_time = min(next_arrivals)
            schedule.append((time, next_time, "Idle"))
            time = next_time
            continue

        # choose process with highest priority (lowest priority number)
        p = min(ready, key=lambda x: (x.priority, x.arrival_time, x.pid))

        p.start_time = time
        time += p.burst_time
        p.completion_time = time
        schedule.append((p.start_time, p.completion_time, p.pid))
        completed += 1

    compute_metrics(processes)
    return schedule


# ------------------------------
# CLI Interface
# ------------------------------

def input_processes() -> List[Process]:
    """Get process list from user via console."""
    processes: List[Process] = []

    print("Enter process details.")
    print("You can stop by entering an empty PID.\n")

    while True:
        pid = input("PID (or press Enter to stop): ").strip()
        if pid == "":
            break

        try:
            arrival = int(input("  Arrival time: "))
            burst = int(input("  Burst time: "))
            priority = int(input("  Priority (smaller number = higher priority, default 0): ") or "0")
        except ValueError:
            print("Invalid input, please try this process again.\n")
            continue

        processes.append(Process(pid=pid, arrival_time=arrival, burst_time=burst, priority=priority))
        print("Process added.\n")

    return processes


def choose_algorithm() -> str:
    """Ask user to choose scheduling algorithm."""
    print("\nChoose scheduling algorithm:")
    print("1. FCFS (First Come First Served)")
    print("2. SJF (Shortest Job First, non-preemptive)")
    print("3. Round Robin")
    print("4. Priority (non-preemptive)")

    while True:
        choice = input("Enter choice [1-4]: ").strip()
        if choice in {"1", "2", "3", "4"}:
            return choice
        print("Invalid choice, try again.")


def main() -> None:
    print("=== Intelligent CPU Scheduler Simulator (Console v1) ===")

    processes = input_processes()
    if not processes:
        print("No processes entered. Exiting.")
        return

    algo_choice = choose_algorithm()
    schedule: List[GanttBlock] = []

    if algo_choice == "1":
        print("\nRunning FCFS...")
        schedule = fcfs(processes)
    elif algo_choice == "2":
        print("\nRunning SJF (non-preemptive)...")
        schedule = sjf_non_preemptive(processes)
    elif algo_choice == "3":
        while True:
            try:
                q = int(input("Enter time quantum for Round Robin: "))
                if q <= 0:
                    raise ValueError
                break
            except ValueError:
                print("Quantum must be a positive integer, try again.")
        print("\nRunning Round Robin...")
        schedule = round_robin(processes, quantum=q)
    elif algo_choice == "4":
        print("\nRunning Priority Scheduling (non-preemptive)...")
        schedule = priority_non_preemptive(processes)

    # Output results
    print_gantt_chart(schedule)
    print_process_table(processes)

    metrics = compute_metrics(processes)
    print(f"\nAverage Waiting Time   : {metrics['avg_waiting_time']:.2f}")
    print(f"Average Turnaround Time: {metrics['avg_turnaround_time']:.2f}")
    print("\nSimulation complete.\n")


if __name__ == "__main__":
    main()
