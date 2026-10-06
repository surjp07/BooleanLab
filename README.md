# BooleanLab — DML Micro Project

## Topic
**Boolean Algebra in Digital Logic Circuit Design**

Course: **NYAI301 — Discrete Mathematics and Logic (DML)**

## Purpose
BooleanLab demonstrates how Boolean algebra concepts from Discrete Mathematics and Logic are applied to digital logic circuit design.

## Features
- Boolean algebra concept cards
- Important Boolean laws
- Interactive expression parser
- Boolean simplification using common laws
- Truth-table generator
- Basic circuit visualization
- DML self-check quiz
- Responsive UI for desktop and mobile

## Technologies
- HTML5
- CSS3
- Vanilla JavaScript
- No backend or database required

## How to run
1. Extract the ZIP.
2. Open `index.html` in Chrome/Edge/Firefox.
3. Enter an expression such as `A*B + A*!B`.
4. Click **Analyze Expression**.

## Suggested viva explanation
The project connects a DML concept (Boolean algebra) to a CSE application (digital logic circuit design). The JavaScript parses Boolean expressions, evaluates them for every input combination to generate a truth table, applies common Boolean simplification laws, and presents the result in a browser-based interface.

## Limitations
The simplifier intentionally implements a focused set of common laws rather than a full industrial Boolean minimization algorithm. The circuit panel is a conceptual visualization for the micro-project; it is not intended to replace a hardware simulator.

## Suggested future scope
- Karnaugh map generator
- NAND/NOR-only circuit conversion
- More complete Boolean minimization
- SVG gate-level diagrams
- Save/export truth tables
- Quiz scoring
