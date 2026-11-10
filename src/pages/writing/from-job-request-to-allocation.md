---
layout: ../../layouts/Post.astro
title: "How a job becomes an allocation"
description: "Following a two-GPU request through the decisions that shaped my workload-management project."
slug: from-job-request-to-allocation
date: "2026-11-10"
category: Architecture story
tags: [Architecture, Placement, Systems]
readTime: 4
image: images/diagrams/job-allocation-flow.png
wideDiagrams: true
---

“I need two GPUs.”

A user can describe the request in four words. The application still has several decisions to make: which job gets considered next, which resources it can receive, and how to keep track of that assignment until the resources are released.

I built my [workload-management project](https://github.com/labo-man002/job-scheduler) to make those decisions visible. It models requests, allocations, and job states; workload execution belongs to a separate layer.

To follow one request through it, imagine a job asking for two GPUs when only one is free. The job and resource IDs in this example are illustrative.

<figure class="article-diagram">
  <a href="../../images/diagrams/job-allocation-flow.svg" target="_blank" rel="noopener noreferrer" aria-label="Open the architecture sketch at full size"><img src="../../images/diagrams/job-allocation-flow.svg" alt="Whiteboard sketch of the implemented allocation path. API routes delegate to the request-scoped Server, which coordinates the process-local Scheduler and transaction-local Placer. The Server reads and flushes persisted state; API routes commit or roll back. Placement builds a view over eligible nodes." width="1100" height="910" /></a>
  <figcaption><span class="article-diagram-hint">Scroll sideways to read the sketch, or open the full-size SVG below.</span><strong>1. How the components work together.</strong> The Server coordinates admission, queue draining, and recording the assignment. The Scheduler chooses the next attempt; the Placer selects units from eligible, locked inventory. Queue entries retain IDs and priority across requests. Job objects and resource locks belong to the current session, and the API commits or rolls back the database changes. <span class="article-diagram-links"><a href="../../images/diagrams/job-allocation-flow.svg" target="_blank" rel="noopener noreferrer">Full-size SVG ↗</a><a href="../../images/diagrams/job-allocation-flow.png" download>Download PNG ↓</a></span></figcaption>
</figure>

## A place in the queue

Before accepting the request, the application checks the client and the institute’s resource quota. Once accepted, our job becomes visible as queued.

Suppose GPU 87 on one machine is available, while GPU 91 on another is still assigned to an earlier job. Our request needs both. It stays in the queue until there is another opportunity to place it.

Queue order matters here. An application with multiple waiting jobs needs a rule for deciding which one to consider first. My project supports first-in-first-out and priority-based ordering. With insufficient capacity, its default policy leaves the job queued and stops that queue pass.

Later, completion of the earlier job is recorded. GPU 91 is released, and the application checks the queue again.

Our two-GPU request can now receive another placement attempt.

## Choosing the two GPUs

This is where I separate two questions in the design:

**Which job should be considered next?** The scheduler handles that.

**Which exact resources should it receive?** The placer handles that.

In our example, there is one available GPU on each of two eligible machines. The placer can assign both units to the job. If a single eligible machine could satisfy the whole request, the current implementation would try that first.

The distinction becomes more useful as there are more choices. Several machines may offer the right resource counts, while their positions within the cluster differ. A placement policy decides which candidates to prefer.

Keeping that choice separate from queue order lets me explore a new placement policy without rewriting how jobs wait their turn. It also gives each decision a clear explanation: why this job was considered, and why these resources were selected.

<figure class="article-diagram">
  <a href="../../images/diagrams/policy-abstractions.svg" target="_blank" rel="noopener noreferrer" aria-label="Open the policy abstractions sketch at full size"><img src="../../images/diagrams/policy-abstractions.svg" alt="Two independent policy families. Scheduler uses abstract SortStrategy, implemented by FifoSort and PrioritySort. Placer uses abstract PlaceAlgorithm, implemented by PackAlgorithm and SpreadAlgorithm. Topology creates TopologyView, whose distances the placement policy reads." width="1100" height="1040" loading="lazy" /></a>
  <figcaption><span class="article-diagram-hint">Scroll sideways to read the sketch, or open the full-size SVG below.</span><strong>2. Two decisions, two policy interfaces.</strong> SortStrategy controls queue order. PlaceAlgorithm controls resource choice. Their implementations can change independently. Pack and Spread prefer candidates near or farther from occupied nodes within the eligible topology view. Topology constructs that view; the placement policy reads it. <span class="article-diagram-links"><a href="../../images/diagrams/policy-abstractions.svg" target="_blank" rel="noopener noreferrer">Full-size SVG ↗</a><a href="../../images/diagrams/policy-abstractions.png" download>Download PNG ↓</a></span></figcaption>
</figure>

## Remembering the decision

Once the job receives GPU 87 and GPU 91, “two GPUs” is no longer a sufficient description of its state. The application needs to remember exactly which units belong to it.

I keep the original request and the resulting assignment as separate records. The request says what the job asked for. The allocation identifies what it received.

That record connects the decisions to the rest of the job’s lifecycle. It gives the interface something concrete to display and tells the application what to release later.

The resource-state changes, allocation records, and job-state update are committed together. In this model, the job then appears as running: resources have been assigned to it.

<figure class="article-diagram">
  <a href="../../images/diagrams/resource-ownership.svg" target="_blank" rel="noopener noreferrer" aria-label="Open the resource ownership sketch at full size"><img src="../../images/diagrams/resource-ownership.svg" alt="Illustrative job 42 requests two GPUs through ResourceRequirement. Its Allocation has two separate AllocationNode records: one identifies GPU ResourceNode 87 on physical Node 12; the other identifies ResourceNode 91 on Node 13. The same links identify the units to release." width="1100" height="910" loading="lazy" /></a>
  <figcaption><span class="article-diagram-hint">Scroll sideways to read the sketch, or open the full-size SVG below.</span><strong>3. From a quantity to the exact GPU units.</strong> ResourceRequirement preserves what was requested. Allocation records the assignment, with one AllocationNode row per assigned ResourceNode. The enclosing Node is the physical machine. Following those links later identifies exactly what to release. IDs are illustrative; the complete ERD is in the <a href="../../work/topology-aware-allocation/#diagram-heading">project case study</a>. <span class="article-diagram-links"><a href="../../images/diagrams/resource-ownership.svg" target="_blank" rel="noopener noreferrer">Full-size SVG ↗</a><a href="../../images/diagrams/resource-ownership.png" download>Download PNG ↓</a></span></figcaption>
</figure>

## Giving the resources back

When our example job finishes or is cancelled, the application follows its allocation record and releases GPU 87 and GPU 91. Their availability changes, the job’s history is updated, and another queue pass can consider waiting work.

There is a useful edge case: a machine may have been taken out of service while the job held its resources. Releasing those units must preserve that decision and leave them unavailable.

Following the same assignment through selection, inspection, and release keeps resource ownership explicit throughout the lifecycle.

The architecture grew around those transitions. Queue order, resource selection, and the record of ownership each have a distinct responsibility. Their boundaries make it easier to inspect a decision and change one part of the model without losing track of the others.

The [project case study](../../work/topology-aware-allocation/#diagram-heading) has the class architecture and ERD. I explore the placement policies separately in [the Pack and Spread article](../pack-and-spread/).
