# Agent simulation sandbox

<!-- impeccable:product-schema 1 -->

## Platform
web

## Stack
Python, PydanticAI, SQLite, NiceGUI; validated YAML configuration. A headless CLI remains the primary execution path.

## Users and purpose
An experimenter building and studying agent simulations. The viewer supports a mix of browsing and comparing saved evaluations, monitoring live runs, and inspecting the decisions behind outcomes, as confirmed by the user.

## Capabilities and constraints
A thin extensible sandbox contract. Frontier Colony is the first environment: six settlers, five connected facilities, shared resources, individual memory, radio and Python-enforced actions. Shared policies, capped model calls, controls, logging, checkpoints and exact replay. OpenAI and Anthropic only; credentials come from the existing environment. Every new decision uses a real model; opening the viewer and saved replay make no calls. YAML scenarios and experiments configure profiles, parameters, conditions, seeds, repetitions and metrics. Keep the implementation small and dependencies minimal.

## Brand commitments
A minimalist dark research workspace with familiar evaluation-platform navigation, clear hierarchy, and restrained functional color. Environment-specific visualizations live within a shared run workspace; they do not dictate the platform's navigation or layout.

## Product principles
- Python owns outcomes; agents choose typed actions.
- A saved run is inspectable without a model or network.
- Compare recorded evidence without inventing aggregate scores or model rankings.
- Adding an environment should not require modifying the runner.
- Prefer explicit configuration and small modules to speculative frameworks.
