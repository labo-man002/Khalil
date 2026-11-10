---
layout: ../../layouts/Post.astro
title: "A free GPU and a reachable GPU answer different questions"
description: "How the standalone leaf–spine model combines resource inventory with operational paths, and where that explanation stops."
slug: gpu-counts-and-network-paths
date: "2026-11-10"
category: Network model notes
tags: [Networking, Placement, Graphs]
readTime: 4
---

The GPU inventory in my allocation prototype answers which resource units are available. The standalone leaf–spine model adds another question: can an operational path reach the node that owns those GPUs?

These are separate pieces of information. Combining them is useful, but it still does not complete the placement decision.

## One compute identity

The existing `Node` remains the compute host. Its `ResourceNode` records remain the GPU inventory. The fabric registers the same node and attaches its `nic0` endpoint to a leaf switch.

There is no second GPU counter inside a network-server wrapper. That avoids two inventories disagreeing about what is available.

The fabric owns switches and physical links. The caller and database session own node state and resource-unit state. The read-only candidate finder operates on the same session-loaded node instances registered in the fabric.

## Physical wiring and operational reachability

A down link still occupies its physical endpoints. Turning it down makes the route unusable; it does not remove the cable or make a switch port free for another connection.

Path discovery excludes down links, switches, ports, hosts, and NICs. It can filter by minimum nominal link capacity and maximum summed configured latency. Among usable paths it minimizes latency, then breaks ties by hop count and the lexical link-ID sequence.

Compute nodes are terminal endpoints, rather than transit devices. The selected path is a query snapshot.

## A candidate is an observation

The candidate finder combines free GPU units with a path from a caller-selected root switch. Results are ordered by path latency and then node ID.

It does not allocate GPUs, persist changes, or reserve a network path. Reachability from a root also does not, by itself, establish the full communication feasibility of a multi-server workload.

Those next decisions require a job-level contract: which nodes must communicate, what constraints must hold, and how a group of candidate nodes should be evaluated.

## Nominal capacity is not residual bandwidth

A link configured for a particular speed may already carry competing traffic. The prototype checks the nominal value; it has no contention accounting or residual-bandwidth reservation.

Calling the result “a path meeting configured capacity and latency constraints” keeps its meaning precise. It would take another model to promise available bandwidth or predict application performance.

This module is currently independent of the live scheduler–placer allocation path. The distinction is documented so that a useful graph query does not silently become a stronger claim about actual placement.

Source: [GPU leaf–spine design](https://github.com/labo-man002/job-scheduler/blob/main/docs/gpu-leaf-spine.md).
