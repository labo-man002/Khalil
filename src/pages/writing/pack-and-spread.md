---
layout: ../../layouts/Post.astro
title: "Pack and Spread need an explicit reference point"
description: "The distance to existing occupancy is a different objective from locality within a new job."
slug: pack-and-spread
date: "2026-11-10"
category: Placement notes
tags: [Placement, Architecture, Algorithms]
readTime: 4
---

The names Pack and Spread suggest something intuitive: keep resources close together, or put them farther apart. Implementing either requires another question: close to what?

In my workload-management prototype, the answer is the already occupied nodes visible in the current topology view.

## The score in the code

For each candidate, Pack calculates the minimum grid distance to any node marked `ALLOCATED` or `MIXED`. It prefers the smallest distance. Spread uses the same nearest-occupied-node distance, but prefers the largest value.

Written as a score for a candidate node `n`:

```text
nearest_occupied(n) = min(distance(n, occupied_node))

Pack:   sort by ( nearest_occupied(n), node_id)
Spread: sort by (-nearest_occupied(n), node_id)
```

When there is no occupied node in the view, both policies fall back to ascending node ID. The fallback and tie-break make a repeated input deterministic.

## A small example

Imagine a non-wrapping line with an occupied node at coordinate zero. Two candidates have sufficient free resources: one at coordinate one and another at coordinate five.

Pack prefers the candidate at one. Spread prefers the candidate at five. This describes their relationship to the existing allocation.

It does not yet describe the communication cost between all the resources of the new job. For a multi-node job, the placer walks the ranking while satisfying the remaining requirements. It does not solve a job-wide communication optimization problem.

That is a useful boundary to retain when interpreting the result of an experiment. The policy name alone does not establish its objective.

## Which occupied nodes are visible?

The topology view includes the placer’s reservation-eligible nodes. An occupied node can fail the current job’s capacity filter and still influence scoring, as long as it remains in that view.

Reservation exclusion changes the view earlier. Nodes reserved for another institute are removed before the placer builds it, so their occupancy also disappears from scoring.

There are two plausible interpretations: score against physical occupancy across the cluster, or score against only the inventory this job can access. These can rank the same remaining candidates differently. The project tracks this as an [open design question](https://github.com/labo-man002/job-scheduler/issues/91).

## What I would measure

A controlled comparison should keep the initial inventory, arrivals, and job requirements fixed. Then it can examine whether a policy changes future placement possibilities, fragmentation, or a clearly defined locality measure.

Grid distance is an abstract metric in this model. Turning it into a performance claim would require a communication model and separate evidence. For now, understanding the exact score is the first useful result.

Source: [PackAlgorithm and SpreadAlgorithm](https://github.com/labo-man002/job-scheduler/blob/main/backend/app/domain/place_algorithm.py).
