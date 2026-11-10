---
layout: ../../layouts/Post.astro
title: "How a job becomes an allocation"
description: "Following a two-GPU request through the decisions that shaped my workload-management project."
slug: from-job-request-to-allocation
date: "2026-11-10"
category: Architecture story
tags: [Architecture, Placement, Systems]
readTime: 5
image: images/diagrams/job-allocation-flow.png
wideDiagrams: true
---

“I need two GPUs.”

A user can describe the request in four words. The application still has several decisions to make: which job gets considered next, which resources it can receive, and how to keep track of that assignment until the resources are released.

I built my [workload-management project](https://github.com/labo-man002/job-scheduler) to make those decisions visible. It models requests, allocations, and job states; workload execution belongs to a separate layer.

## A place in the queue

Consider four eligible machines, or Nodes, arranged in one row of a mesh. Each has one GPU. A new job, Job 42, asks for any two GPU units. Its client and quota checks have passed. The IDs and resource states in this example are illustrative.

| Machine | Coordinates | GPU unit | At submission |
| --- | --- | --- | --- |
| Node 11 | (0, 0) | 71 | In use by another job |
| Node 12 | (1, 0) | 87 | Free |
| Node 13 | (2, 0) | 91 | Held by an earlier job |
| Node 14 | (3, 0) | 95 | Held by that same earlier job |

With only one GPU free, the request must wait. The queue can follow arrival order or job priority. By default, if the next job needs more capacity than is free, it stays queued and the application does not try the jobs behind it.

When the earlier job is marked complete, GPUs 91 and 95 are released and the queue is checked again. There are now three free GPU units for our two-GPU request. GPU 71 on Node 11 is still occupied.

## Choosing the two GPUs

There is enough capacity now, but more than one way to satisfy the request.

The placer first checks whether one machine can supply both GPUs. Here, each machine has only one, so the assignment must span machines.

With **Pack**, free candidates nearer to existing occupied nodes are preferred. Node 11 provides that occupied reference: Nodes 12, 13, and 14 are one, two, and three coordinate steps away. Pack therefore selects GPU 87 on Node 12 and GPU 91 on Node 13.

With **Spread**, the preference is reversed. From the same inventory, it would select GPU 95 on Node 14 and GPU 91 on Node 13. Both choices satisfy the requested quantity; they express different placement preferences.

This is why I keep two questions separate. The **Scheduler** decides which queued job gets an attempt. The **Placer** decides which exact resource units it receives. Changing the placement preference leaves queue ordering independent.

### The cluster defines the layout

Those distances come from the cluster’s configuration. Each node’s coordinates are checked against the cluster’s dimensions. For each placement attempt, the placer builds a fresh **TopologyView** over the eligible nodes, including occupied nodes that provide spatial context.

Pack and Spread use that view’s distances to rank candidates. Keeping the geometry there lets the policies work across the supported grid layouts. A cluster’s dimensions and wrap-around setting determine what “nearby” means.

<details class="article-notes" id="architecture-notes">
  <summary>Inside the architecture: queue order, placement, and object lifetimes</summary>
  <p>The Server coordinates the attempt. The process-local queue retains job IDs and priority; the job and locked inventory are loaded for the current database session. SortStrategy and PlaceAlgorithm provide the two independent policy interfaces.</p>
<figure class="article-diagram">
  <a href="../../images/diagrams/job-allocation-flow.svg" target="_blank" rel="noopener noreferrer" aria-label="Open the architecture sketch at full size"><img src="../../images/diagrams/job-allocation-flow.svg" alt="Whiteboard sketch of the implemented allocation path. API routes delegate to the request-scoped Server, which coordinates the process-local Scheduler and transaction-local Placer. The Server reads and flushes persisted state; API routes commit or roll back. Placement builds a view over eligible nodes." width="1100" height="910" loading="lazy" /></a>
  <figcaption><span class="article-diagram-hint">Scroll sideways to read the sketch, or open the full-size SVG below.</span><strong>How the components work together.</strong> The Server coordinates admission, queue draining, and recording the assignment. The Scheduler chooses the next attempt; the Placer selects units from eligible, locked inventory. Queue entries retain IDs and priority across requests. Job objects and resource locks belong to the current session, and the API commits or rolls back the database changes. <span class="article-diagram-links"><a href="../../images/diagrams/job-allocation-flow.svg" target="_blank" rel="noopener noreferrer">Full-size SVG ↗</a><a href="../../images/diagrams/job-allocation-flow.png" download>Download PNG ↓</a></span></figcaption>
</figure>
<figure class="article-diagram">
  <a href="../../images/diagrams/policy-abstractions.svg" target="_blank" rel="noopener noreferrer" aria-label="Open the policy abstractions sketch at full size"><img src="../../images/diagrams/policy-abstractions.svg" alt="Two independent policy families. Scheduler uses abstract SortStrategy, implemented by FifoSort and PrioritySort. Placer uses abstract PlaceAlgorithm, implemented by PackAlgorithm and SpreadAlgorithm. Topology creates TopologyView, whose distances the placement policy reads." width="1100" height="1040" loading="lazy" /></a>
  <figcaption><span class="article-diagram-hint">Scroll sideways to read the sketch, or open the full-size SVG below.</span><strong>Two decisions, two policy interfaces.</strong> SortStrategy controls queue order. PlaceAlgorithm controls resource choice. Their implementations can change independently. Pack and Spread prefer candidates near or farther from occupied nodes within the eligible topology view. Topology constructs that view from the cluster’s configuration and the nodes eligible for this job; the placement policy reads it. <span class="article-diagram-links"><a href="../../images/diagrams/policy-abstractions.svg" target="_blank" rel="noopener noreferrer">Full-size SVG ↗</a><a href="../../images/diagrams/policy-abstractions.png" download>Download PNG ↓</a></span></figcaption>
</figure>
  <p>The <a href="../../work/topology-aware-allocation/#diagram-heading">project case study</a> includes the complete class architecture and ERD. The <a href="../pack-and-spread/">Pack and Spread article</a> examines the placement preferences in more detail.</p>
</details>

<details class="article-notes" id="topology-sketch">
  <summary>See how ring, mesh, and torus layouts change coordinate distance</summary>
  <p>In our example, the mesh has a single row and does not wrap. These other configurations show how the same distance interface interprets different layouts.</p>
<figure class="article-diagram">
  <a href="../../images/diagrams/cluster-topologies.svg" target="_blank" rel="noopener noreferrer" aria-label="Open the topology sketch at full size"><img src="../../images/diagrams/cluster-topologies.svg" alt="Whiteboard comparison of a wrapping ring, a non-wrapping 2D mesh, and wrapping 2D and 3D tori. The marked positions are two coordinate steps apart in the mesh and one in the wrapping torus. Selected wrap and cross-layer links illustrate the repeating pattern. All layouts feed a TopologyView used by Pack and Spread." width="1100" height="1220" loading="lazy" /></a>
  <figcaption><span class="article-diagram-hint">Scroll sideways to read the sketch, or open the full-size SVG below.</span><strong>How cluster topology changes distance.</strong> The marked coordinate pair is two steps apart in the mesh and one in the wrapping torus. The 3D example adds a layer coordinate, z. Representative wrap and cross-layer links are shown. The placer builds a TopologyView from each cluster’s configuration and eligible nodes; placement policies read its coordinate distances. <span class="article-diagram-links"><a href="../../images/diagrams/cluster-topologies.svg" target="_blank" rel="noopener noreferrer">Full-size SVG ↗</a><a href="../../images/diagrams/cluster-topologies.png" download>Download PNG ↓</a></span></figcaption>
</figure>
</details>

## A free GPU can still be unreachable

A machine’s GPU can be free while its NIC is down.

In the leaf–spine model, compute nodes attach to leaves, which connect through spines. **GpuCandidateFinder** combines the nodes’ existing GPU inventory with operational paths from a selected root switch. The query can apply configured capacity and latency limits and returns free GPU IDs together with paths.

Consider a fabric query on the three free nodes above. If Node 14’s NIC is down, GPU 95 remains free in the inventory but is excluded from the query result. A coordinate view describes distance; the fabric query establishes which candidates are reachable under its constraints.

<figure class="article-diagram" id="leaf-spine-sketch">
  <a href="../../images/diagrams/leaf-spine.svg" target="_blank" rel="noopener noreferrer" aria-label="Open the leaf-spine sketch at full size"><img src="../../images/diagrams/leaf-spine.svg" alt="Leaf-spine fabric with three free GPU units: GPU 87 on Node 12, GPU 91 on Node 13, and GPU 95 on Node 14. Node 14 has a down NIC. A query from spine 1 can reach Nodes 12 and 13 and returns their GPU IDs and paths. The physical cable to Node 14 remains drawn." width="1100" height="1070" loading="lazy" /></a>
  <figcaption><span class="article-diagram-hint">Scroll sideways to read the sketch, or open the full-size SVG below.</span><strong>Free units and reachable candidates.</strong> All three GPUs are free in this fabric query. Node 14’s down NIC excludes GPU 95 from the result. The same Node supplies its GPU inventory and its network endpoint. <span class="article-diagram-links"><a href="../../images/diagrams/leaf-spine.svg" target="_blank" rel="noopener noreferrer">Full-size SVG ↗</a><a href="../../images/diagrams/leaf-spine.png" download>Download PNG ↓</a><a href="https://github.com/labo-man002/job-scheduler/tree/main/backend/app/domain/leaf_spine" target="_blank" rel="noopener noreferrer">Project implementation ↗</a></span></figcaption>
</figure>

## Remembering the decision

Job 42 now receives GPU 87 on Node 12 and GPU 91 on Node 13, following the Pack choice.

The original request still says “two GPUs.” The assignment must identify these exact units. I keep the request and its fulfillment as separate records: ResourceRequirement preserves the quantity, while Allocation and its AllocationNode links record what the job received.

That gives the interface something concrete to display and tells the application what to release later. The resource-state changes, allocation records, and job-state update are committed together. In this model, the job then appears as running: resources have been assigned to it.

<figure class="article-diagram">
  <a href="../../images/diagrams/resource-ownership.svg" target="_blank" rel="noopener noreferrer" aria-label="Open the resource ownership sketch at full size"><img src="../../images/diagrams/resource-ownership.svg" alt="Illustrative job 42 requests two GPUs through ResourceRequirement. Its Allocation has two separate AllocationNode records: one identifies GPU ResourceNode 87 on physical Node 12; the other identifies ResourceNode 91 on Node 13. The same links identify the units to release." width="1100" height="910" loading="lazy" /></a>
  <figcaption><span class="article-diagram-hint">Scroll sideways to read the sketch, or open the full-size SVG below.</span><strong>Follow the assignment to the exact units.</strong> The two AllocationNode links identify GPUs 87 and 91. Those are the links the application follows when releasing this job’s resources. <span class="article-diagram-links"><a href="../../images/diagrams/resource-ownership.svg" target="_blank" rel="noopener noreferrer">Full-size SVG ↗</a><a href="../../images/diagrams/resource-ownership.png" download>Download PNG ↓</a></span></figcaption>
</figure>

## Giving the resources back

When Job 42 finishes or is cancelled, the application follows those allocation links and releases GPUs 87 and 91. It records the job’s history and checks the queue again.

But suppose Node 13 was taken out of service while the job held GPU 91. Releasing the assignment must preserve that decision. GPU 87 can become available on Node 12; GPU 91 must remain unavailable on Node 13.

The job’s claim on both GPUs has ended. Whether each GPU can be used again still depends on the machine’s state.
