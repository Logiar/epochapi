# Spec-First Site and Contracts Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a separate docs site with interactive API testing and enforce `openapi.yaml` as single source of truth for compile-time and runtime contract conformance.

**Architecture:** Spec-first generation pipeline drives web docs/types and Rust contract interface. Backend compiles against generated trait; runtime checks validate behavior against live API.

**Tech Stack:** Rust, Axum, Astro, OpenAPI TypeScript, Schemathesis.

---

1. Scaffold web app and generation scripts.
2. Add generated Rust contract surface in `contracts/rust/api_contract`.
3. Wire backend to generated contract trait.
4. Build semantic docs pages and interactive API explorer.
5. Add CI gates for generation drift and runtime contract checks.
