export const profile = {
  name: 'Khalil Ben Maaoui',
  headline: 'Software Infrastructure Engineer',
  focus: 'Distributed Systems & HPC Scheduling',
  location: 'Dresden, Germany',
  email: 'khalil.benmaaoui@gmail.com',
  github: 'https://github.com/labo-man002',
  linkedin: 'https://www.linkedin.com/in/khalil-ben-maaoui/',
};

export function url(path = '') {
  return import.meta.env.BASE_URL.replace(/\/$/, '') + '/' + path.replace(/^\//, '');
}

export function date(value: string) {
  return new Date(value + 'T12:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Europe/Paris' });
}

export const expertise = [
  { number: '01', name: 'Systems & infrastructure', description: 'The software between a workload and the machine: resource state, allocation, concurrency, and hardware bring-up.', tags: ['C / C++', 'Python', 'Linux', 'Distributed systems'] },
  { number: '02', name: 'Scheduling & placement', description: 'Slurm integration, topology-aware allocation, graph algorithms, and the tradeoffs between locality and fragmentation.', tags: ['Slurm', 'SPANK', 'GRES / Licenses', 'Graph algorithms'] },
  { number: '03', name: 'Backend & reliability', description: 'Clear API contracts, transactional inventory, repeatable tests, and the diagnostics needed to understand a failure.', tags: ['FastAPI', 'PostgreSQL', 'Concurrency', 'CI / CD'] },
];

export const experience = [
  { company: 'SpiNNcloud', role: 'Software Engineer', date: 'Apr 2025 — Aug 2026', location: 'Hybrid · Germany', intro: 'Runtime and infrastructure software for a neuromorphic supercomputer with approximately five million cores and 720 boards in a 2D hexagonal torus.', details: [
    'Drove architecture and implementation across three hardware allocator variants, coordinating scheduling, topology, resource state, and physical machine configuration.',
    'Built deterministic placement heuristics using sliding windows, recursive free-region partitioning, DFS traversal, wrap-around coordinates, and fragmentation-aware scoring.',
    'Proposed and drove the move toward Slurm integration while preserving native scheduling authority and separating board placement into a prolog-stage engine.',
    'Developed C/C++ discovery, reachability, routing, UDP host-to-device communication, and diagnostic logging; worked on transactional allocation, release, and reconciliation.',
    'Collaborated with runtime and infrastructure teams and researchers at Sandia National Laboratories and the University of Manchester.',
  ] },
  { company: 'Rohde & Schwarz', role: 'Working Student · Software Engineering', date: 'Jul 2024 — Mar 2025', location: 'Dresden · Germany', intro: 'Performance engineering, Linux debugging, and test automation for networking and signal-processing systems.', details: [
    'Improved algorithms and data structures in a company-wide signal-transformation library, achieving 2.5× faster execution.',
    'Investigated QEMU guest applications and PTP synchronization failures in O-RAN; traced timing shifts and mixed-traffic interference.',
    'Benchmarked DPDK sender warm-up and jitter, and built Python, Pytest, and Playwright workflows spanning unit, integration, and end-to-end checks.',
  ] },
  { company: 'Independent · Upwork', role: 'Freelance C++ / JavaScript Developer', date: 'Mar — Jun 2022', location: 'Remote', intro: 'Designed and implemented more than 50 interactive levels for an educational game teaching C++.', details: [] },
];

export const education = [
  { school: 'Ilmenau University of Technology', degree: 'Exchange · Computer Science', date: '2024 — 2025', place: 'Germany' },
  { school: 'Tek-Up University', degree: 'MSc · Software Engineering', date: '2021 — 2024', place: 'Tunisia' },
  { school: 'Faculty of Sciences of Tunis', degree: 'Bachelor · Physics', date: '2017 — 2020', place: 'Tunisia' },
];

export const projects = [
  { slug: 'topology-aware-allocation', title: 'Topology-aware allocation', label: 'Workload management prototype', status: 'Active exploration', description: 'A model of how jobs become allocations across ring, mesh, and torus clusters. Queue policies, resource placement, and persistence stay independently inspectable.', tags: ['Python', 'FastAPI', 'PostgreSQL', 'React'], repository: 'https://github.com/labo-man002/job-scheduler', image: 'architecture.png', number: '01', outcome: 'Inspect scheduling decisions down to the individual resource unit.', sections: [
    { title: 'The question', text: 'How should queue order, resource availability, and hardware topology influence an allocation? This project makes those decisions visible without requiring a physical cluster.' },
    { title: 'What is implemented', text: 'FIFO and priority queues, deterministic Pack and Spread placement, multi-node allocations, institute quotas, reservations, lifecycle history, and an interactive React cluster view. PostgreSQL stores individual resource units and allocation mappings.' },
    { title: 'The architectural boundary', text: 'The scheduler selects the next placement attempt. A transaction-local placer chooses specific resource units from locked inventory. The server coordinates policy and persistence; API routes own commit and rollback.' },
    { title: 'The current limit', text: 'Job execution is outside this allocation model. The standalone leaf–spine module supports operational path queries and read-only GPU discovery; it is not yet connected to allocation and does not reserve bandwidth.' },
  ] },
  { slug: 'schedlab', title: 'SchedLab', label: 'An interactive scheduling laboratory', status: 'Educational alpha', description: 'A learn-first experiment that makes fragmentation and head-of-line blocking visible. Replay the same abstract cluster under FIFO and opportunistic backfilling.', tags: ['JavaScript', 'Simulation', 'Visualization'], repository: 'https://github.com/labo-man002/SchedLab', image: 'schedlab.svg', number: '02', outcome: 'Make one scheduling concept understandable through a controlled replay.', sections: [
    { title: 'The teaching model', text: 'Four racks, eight abstract slots per rack, and jobs that require a contiguous block within one rack. Free capacity can exist without a placement for the first waiting job.' },
    { title: 'A controlled comparison', text: 'The guided lesson compares strict FIFO and opportunistic backfilling from the same starting conditions. It reports observed wait, started and completed jobs, jobs still queued, and average occupied capacity over a selected horizon.' },
    { title: 'Honest metrics', text: 'Waiting jobs are reported separately. Average waiting time includes only jobs that started, so the view does not invent an eventual wait for unfinished observations. The abstract slot model makes no GPU performance claim.' },
  ] },
  { slug: 'gpu-workload-inspector', title: 'GPU Workload Inspector', label: 'Explainable resource observations', status: 'Synthetic demo', description: 'A read-only dashboard exploring GPU-count fragmentation, shortages, and count-fit candidates through deterministic scenarios.', tags: ['Python', 'FastAPI', 'TypeScript'], repository: 'https://github.com/labo-man002/gpu-workload-inspector', image: 'gpu-inspector.svg', number: '03', outcome: 'Explain why aggregate free GPU counts can hide a per-node fit problem.', sections: [
    { title: 'The scenario', text: 'Two nodes can each have two free GPU units while a four-GPU single-node request has no count-fit candidate. Releasing capacity on one node changes the explanation.' },
    { title: 'The implementation', text: 'A typed snapshot contract and replaceable provider interface feed pure analysis rules and a React dashboard. Fixture scenarios use deterministic timestamps and expose the numbers behind each explanation.' },
    { title: 'The current limit', text: 'The runnable slice uses synthetic data. Live Kubernetes collection, hardware utilization telemetry, and full scheduling feasibility checks remain future work.' },
  ] },
];
