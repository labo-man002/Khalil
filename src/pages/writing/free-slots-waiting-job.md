---
layout: ../../layouts/Post.astro
title: "Free slots, waiting job: the SchedLab experiment"
description: "A small teaching model makes head-of-line blocking visible, then replays the same start under another queue policy."
slug: free-slots-waiting-job
date: "2026-11-10"
category: Experiment notebook
tags: [Simulation, Placement, Scheduling]
readTime: 4
---

[SchedLab](https://github.com/labo-man002/SchedLab) starts with a scheduling puzzle. There is free capacity in the cluster, yet the first job in the queue cannot run.

The model is intentionally small: four racks, each containing eight abstract slots. Every job needs a contiguous block within one rack. Aggregate free capacity is therefore an incomplete description of what can fit.

## Make the constraint visible

If the free slots are broken into small regions, a large contiguous request may have no placement. A smaller request later in the queue may still fit one of those regions.

Strict FIFO stops at the blocked head job. Opportunistic backfilling can consider later jobs and use some of that otherwise idle space. The current teaching model does not implement reservation-style backfilling or promise that an earlier job’s start will be protected.

That tradeoff is more useful to show than to compress into a claim that one policy is always better.

## Replay the same starting conditions

The guided lesson asks visitors to predict the FIFO outcome, observe it, and then replay the same starting scenario with backfilling.

The fair-replay comparison runs independently of the visitor’s live experiment. It can use a four-, eight-, or twelve-tick horizon. Keeping the starting scenario fixed prevents a comparison from accidentally becoming a comparison of different workloads.

The interface reports jobs that started or completed, observed waiting time, jobs still queued, and average occupied capacity. Occupancy includes the initial resident jobs.

## Waiting is a partly observed quantity

Average wait is calculated over jobs that actually started. Jobs still waiting are reported separately. In the lifecycle view, their current wait is a lower bound at the observation tick, rather than an invented eventual wait.

This matters when comparing policies. A low average among started jobs can coexist with a large request that remains blocked. The count of unfinished observations belongs alongside the average.

## Keep the teaching model honest

A contiguous slot is an abstract placement constraint. It does not claim to model GPU connectivity, NVLink, a real cluster’s communication costs, or Slurm behavior.

The purpose is narrower: give a visitor a concrete input, a visible rule, and a reproducible way to inspect the consequence. The share link preserves the built-in scenario and selected policies, starting again at the initial tick.

The project remains an educational alpha. The next useful evidence is whether people can correctly explain the blocking condition after using it.

Source and model boundaries: [SchedLab README](https://github.com/labo-man002/SchedLab).
