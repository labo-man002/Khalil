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
  { showOnHomepage: false, company: 'Sparxity · formerly SpiNNcloud', role: 'Software Engineer · Runtime & Infrastructure', date: 'Apr 2025 — Aug 2026', location: 'Hybrid · Germany', intro: 'Contributed to the runtime and infrastructure of a SpiNNaker2 neuromorphic supercomputer: approximately five million cores, 720 interconnected boards, and a 2D hexagonal torus.', details: [
    'Drove architecture and implementation across three hardware allocator variants, coordinating scheduling, topology, resource state, and physical machine configuration.',
    'Built deterministic placement heuristics using sliding windows, recursive free-region partitioning, DFS traversal, wrap-around coordinates, and fragmentation-aware scoring.',
    'Proposed and drove the move toward Slurm integration while preserving native scheduling authority and separating board placement into a prolog-stage engine.',
    'Developed C/C++ discovery, reachability, routing, UDP host-to-device communication, and diagnostic logging; worked on transactional allocation, release, and reconciliation.',
    'Contributed to physical machine partitioning: board-to-board connectivity, link enablement, and isolating regions before discovery.',
    'Worked through YAML-backed inventory with POSIX locks toward database-backed state, synchronized queues, and transactional allocation mappings.',
    'Collaborated with runtime and infrastructure teams and researchers at Sandia National Laboratories and the University of Manchester.',
  ] },
  { showOnHomepage: true, company: 'Rohde & Schwarz', role: 'Working Student · Software Engineering', date: 'Jul 2024 — Mar 2025', location: 'Dresden · Germany', intro: 'Performance engineering, Linux debugging, and test automation for networking and signal-processing systems.', details: [
    'Improved algorithms and data structures in a company-wide signal-transformation library, achieving 2.5× faster execution.',
    'Investigated QEMU guest applications and PTP synchronization failures in O-RAN; traced timing shifts and mixed-traffic interference.',
    'Benchmarked DPDK sender warm-up and jitter, and built Python, Pytest, and Playwright workflows spanning unit, integration, and end-to-end checks.',
  ] },
  { showOnHomepage: true, company: 'Independent · Upwork', role: 'Freelance C++ / JavaScript Developer', date: 'Mar — Jun 2022', location: 'Remote', intro: 'Designed and implemented more than 50 interactive levels for an educational game teaching C++.', details: [] },
];

export const homepageExperience = experience.filter(entry => entry.showOnHomepage);

export const education = [
  { school: 'Ilmenau University of Technology', degree: 'Exchange · Computer Science', date: '2024 — 2025', place: 'Germany' },
  { school: 'Tek-Up University', degree: 'MSc · Software Engineering', date: '2021 — 2024', place: 'Tunisia' },
  { school: 'Faculty of Sciences of Tunis', degree: 'Bachelor · Physics', date: '2017 — 2020', place: 'Tunisia' },
];

export const projects = [
  { slug: 'spinnaker2-infrastructure', title: 'SpiNNaker2 supercomputer infrastructure', label: 'Professional work · Sparxity / SpiNNcloud', status: 'Apr 2025 — Aug 2026', description: 'Allocation engines, Slurm integration, machine discovery, and runtime infrastructure for a neuromorphic supercomputer spanning approximately five million cores and 720 interconnected boards.', tags: ['C / C++', 'Python', 'Slurm', 'Graph algorithms', 'Concurrency'], repository: null, externalUrl: 'https://sparxity.ai/', image: 'sparxity-system.jpg', imageAlt: 'A Sparxity supercomputer installation, photographed for the company website', imageCredit: 'Official Sparxity system photograph', number: '01', outcome: 'Connect scheduling intent to physical boards, a coherent machine topology, and authoritative allocation state.', sections: [
    { title: 'The machine and my role', text: 'At SpiNNcloud, now Sparxity, I contributed to runtime and infrastructure software for SpiNNaker2. The platform described in my experience spans approximately five million cores across 720 boards in a 2D hexagonal torus. My focus was the software that acquires, partitions, discovers, and releases that hardware.' },
    { title: 'Three allocator variants', text: 'I drove architecture and implementation across allocators for internal use, customer deployments, and a Slurm-managed supercomputer. The work ranged from a sliding-window greedy torus algorithm to deterministic best-fit packing using recursive free-region partitioning, tree traversal, wrap-around coordinates, and fragmentation-aware scoring.' },
    { title: 'Slurm scheduling, physical placement', text: 'I proposed and drove the move toward Slurm integration. The design preserved native select/cons_tres scheduling authority, priorities, backfilling, and fair-share, while a prolog-stage engine selected physical boards and provided job environment information. I investigated GRES, Generic Licenses, SPANK, and enforcement tradeoffs with the team.' },
    { title: 'Discovery, routing, and machine bring-up', text: 'My C/C++ contributions included chip and board discovery, nearest-neighbor exchanges, flood-fill traversal, reachability, and routing. I also contributed to board-to-board connectivity and link control so allocated regions could be isolated before discovery and operate as coherent machines.' },
    { title: 'Inventory, concurrency, and release', text: 'I worked through a progression from YAML-backed state protected by POSIX locks to database-backed board inventory and allocation mappings. Queues, thread synchronization, transactions, cleanup, health checks, and reconciliation all supported the same goal: consistent ownership of physical hardware.' },
    { title: 'Engineering with other teams', text: 'The work included technical ownership, specifications, design reviews, and live demonstrations with runtime and infrastructure colleagues, alongside exchanges with researchers at Sandia National Laboratories and the University of Manchester. This case study summarizes my contribution; the professional implementation is separate from my public workload-management project.' },
  ] },
  { slug: 'topology-aware-allocation', title: 'Topology-aware workload management', label: 'Personal project · job-scheduler', status: 'Active exploration', description: 'An inspectable workload-management model with per-cluster queues, topology-aware resource placement, transactional allocation, and a React interface for cluster and job state.', tags: ['Python', 'FastAPI', 'PostgreSQL', 'React'], repository: 'https://github.com/labo-man002/job-scheduler', externalUrl: null, image: 'project/cluster-detail.png', imageAlt: 'Actual job-scheduler interface showing a 3D torus cluster and node resource details', imageCredit: 'Screenshot from the job-scheduler repository', number: '02', outcome: 'Trace a job from its request through queue order, exact resource selection, allocation records, and release.', sections: [
    { title: 'The question', text: 'How should queue order, resource availability, and hardware topology influence an allocation? This project makes those decisions visible without requiring a physical cluster.' },
    { title: 'What is implemented', text: 'FIFO and priority queues, deterministic Pack and Spread placement, multi-node allocations, institute quotas, reservations, lifecycle history, and an interactive React cluster view. PostgreSQL stores individual resource units and allocation mappings.' },
    { title: 'The architectural boundary', text: 'The scheduler selects the next placement attempt. A transaction-local placer chooses specific resource units from locked inventory. The server coordinates policy and persistence; API routes own commit and rollback.' },
    { title: 'Network topology and GPU discovery', text: 'The leaf–spine model registers existing compute Nodes through their NIC endpoints and connects them to switch ports and physical links. Path discovery checks operational state, configured capacity, and latency; GPU candidate queries combine those paths with the existing resource-unit inventory.' },
  ] },
  { slug: 'schedlab', title: 'SchedLab', label: 'An interactive scheduling laboratory', status: 'Educational alpha', description: 'A learn-first experiment that makes fragmentation and head-of-line blocking visible. Replay the same abstract cluster under FIFO and opportunistic backfilling.', tags: ['JavaScript', 'Simulation', 'Visualization'], repository: 'https://github.com/labo-man002/SchedLab', externalUrl: null, image: 'schedlab.svg', imageAlt: 'An illustrative view of fragmented slots in the SchedLab teaching model', imageCredit: 'Illustrative slot model', number: '03', outcome: 'Make one scheduling concept understandable through a controlled replay.', sections: [
    { title: 'The teaching model', text: 'Four racks, eight abstract slots per rack, and jobs that require a contiguous block within one rack. Free capacity can exist without a placement for the first waiting job.' },
    { title: 'A controlled comparison', text: 'The guided lesson compares strict FIFO and opportunistic backfilling from the same starting conditions. It reports observed wait, started and completed jobs, jobs still queued, and average occupied capacity over a selected horizon.' },
    { title: 'Honest metrics', text: 'Waiting jobs are reported separately. Average waiting time includes only jobs that started, so the view does not invent an eventual wait for unfinished observations. The abstract slot model makes no GPU performance claim.' },
  ] },
];
