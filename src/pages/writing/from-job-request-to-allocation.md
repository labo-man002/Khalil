---
layout: ../../layouts/Post.astro
title: "How a job becomes an allocation"
description: "A walkthrough of the scheduler, placer, and database relationships in my workload-management prototype."
slug: from-job-request-to-allocation
date: "2026-11-10"
category: Architecture walkthrough
tags: [Architecture, Placement, PostgreSQL]
readTime: 5
---

A client requests two GPUs. That is the beginning of the story, not yet an allocation. The application still needs to decide whether to accept the request, when to consider it, and which two resource units to assign.

My [job-scheduler project](https://github.com/labo-man002/job-scheduler) models that path. It uses Python, FastAPI, PostgreSQL, SQLAlchemy, and React. This walkthrough follows the implemented allocation model; launching and supervising workloads is outside its scope.

<img src="../../images/project/cluster-detail.png" alt="The actual project interface showing a torus cluster and node resource state" width="1440" height="780" />

## The coordination boundary

<a href="../../images/diagrams/class-architecture.svg" target="_blank" rel="noopener noreferrer"><img src="../../images/diagrams/class-architecture.svg" alt="Class architecture redrawn from the project documentation: Server, Scheduler, Placer, queue and placement policies, and topology" /></a>

The diagram follows the [implemented class architecture](https://github.com/labo-man002/job-scheduler/blob/main/docs/architecture.md). Open it to inspect the full-size SVG.

The FastAPI route creates a request-scoped `Server`. The server loads the client, checks the institute’s current-month concurrency quota, selects a cluster, and records the accepted job as `QUEUED`.

It then adds a lightweight reference to the cluster’s scheduler. The reference contains a job ID and priority. It does not retain the SQLAlchemy `Job` from this request’s database session.

That matters because the queue survives individual requests. A queued ORM instance would carry a session lifetime that does not match the queue’s lifetime. Reloading the job before an attempt keeps that boundary explicit.

Cluster routing currently uses a coarse total-resource count. It is a separate decision from the placer’s per-resource-type checks, and it needs care when reasoning about heterogeneous clusters.

## Queue order and resource selection

The scheduler answers which job should receive the next attempt. FIFO and priority strategies order the queue. The placer answers which actual resource units should fulfill that job.

For an attempt, the server loads and locks the cluster’s node and resource rows using `SELECT ... FOR UPDATE`. It constructs a transaction-local placer, applies the current job’s reservation eligibility, and delegates selection.

The placer first looks for a single node that can satisfy all requirements. Otherwise it checks aggregate free capacity and ranks nodes for a multi-node allocation. Pack and Spread use a coordinate-grid topology view and deterministic node-ID tie-breaking.

On success, the server records the allocation and transitions the job to `RUNNING`. Here, that state records the modeled allocation. The API route owns the final commit or rollback.

## Demand and fulfillment are different records

<a href="../../images/diagrams/entity-relationships.svg" target="_blank" rel="noopener noreferrer"><img src="../../images/diagrams/entity-relationships.svg" alt="Core allocation ERD showing actual ownership, job, allocation, and hardware tables and their foreign keys" loading="lazy" /></a>

This ERD follows the current ORM fields and foreign keys. The repository also retains its [original schema drawings](https://github.com/labo-man002/job-scheduler/blob/main/docs/erd.md), which document an earlier design.

The schema keeps requested quantities separate from assigned units:

| Model | What it records |
| --- | --- |
| `Job` | Client, priority, estimated duration, and current state |
| `ResourceRequirement` | Requested resource type and amount |
| `ResourceNode` | One individually tracked CPU, GPU, or memory unit |
| `Allocation` | The job’s fulfillment record and allocation interval |
| `AllocationNode` | A link to one particular assigned resource unit |

For a two-GPU request, the requirement is one row with `GPU` and amount `2`. A possible multi-node result could identify GPU unit 87 on Node 12 and GPU unit 91 on Node 13. Those illustrative IDs produce two allocation links.

Despite its name, `AllocationNode` refers to a resource unit, rather than a whole server. A physical server is a `Node`; its units are `ResourceNode` records.

The separation makes a useful question directly answerable: did the actual assignment fulfill the request? It also supports release without guessing which free-capacity counter to increment.

## Releasing the exact assignment

When completion or cancellation of a running job is recorded, the server follows the allocation links and releases those specific resource units. It sets the allocation’s end time and actual duration, appends a job event, and attempts another queue drain.

A unit belonging to a decommissioned node becomes `UNAVAILABLE` on release. Otherwise, returning it to `AVAILABLE` would quietly undo the node-down decision.

The queue, transaction-local inventory, and persisted records therefore have different responsibilities and lifetimes. Keeping those differences visible is what makes this prototype useful for inspecting policy changes.

Implementation references: [server](https://github.com/labo-man002/job-scheduler/blob/main/backend/app/domain/server.py), [placer](https://github.com/labo-man002/job-scheduler/blob/main/backend/app/domain/placer.py), and [architecture](https://github.com/labo-man002/job-scheduler/blob/main/docs/architecture.md).
