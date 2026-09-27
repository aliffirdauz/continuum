# Continuum — Organizational Knowledge Resilience Platform

> **Portfolio Project Specification / AI Build Brief**

## 1. Project Summary

**Continuum** is an internal organizational knowledge resilience platform.

Its purpose is to help companies answer questions such as:

- Who actually knows how a critical process, product, machine, system, or workflow works?
- Which organizational knowledge is dangerously concentrated in one or two people?
- What happens if a key employee becomes unavailable?
- Which people could become backup knowledge holders?
- What actions should the organization take to reduce knowledge concentration?
- Has knowledge transfer actually improved organizational resilience?

This is **not** an employee performance monitoring platform.

The system evaluates the resilience of **knowledge areas**, not the quality or productivity of employees.

The core product concept is:

> **Map critical organizational knowledge, identify concentration risk, simulate knowledge loss, and guide measurable knowledge transfer.**

---

# 2. Product Positioning

Continuum sits between:

- enterprise search,
- expert discovery,
- knowledge management,
- succession planning,
- organizational risk management,
- knowledge transfer,
- workforce resilience.

It is intentionally **industry-agnostic**.

The platform should work for:

- software companies,
- manufacturing,
- construction,
- healthcare operations,
- consulting,
- finance,
- procurement,
- logistics,
- utilities,
- government institutions.

Examples of knowledge areas:

### Software

- PostgreSQL migration
- Checkout architecture
- Cloudflare bypass strategy
- Billing worker
- Authentication flow

### Manufacturing

- Production Line 4 troubleshooting
- Machine calibration
- Packaging defect investigation
- Vendor maintenance workflow

### Finance

- Month-end closing
- Tax reconciliation
- Royalty withholding process
- Bank reconciliation workflow

### Procurement

- Customs clearance
- Supplier onboarding
- Machinery import process
- Contract renewal procedure

### Construction

- Basement waterproofing
- Structural inspection
- Vendor coordination
- Safety approval process

---

# 3. Primary User Personas

## 3.1 Department Manager

Typical goals:

- understand critical knowledge risks,
- identify areas dependent on one employee,
- create backup coverage,
- monitor knowledge transfer progress.

Typical questions:

- "Which processes in my department have only one expert?"
- "What happens if Budi is unavailable for a month?"
- "Who should be trained as backup for this process?"

---

## 3.2 Employee / Knowledge Seeker

Typical goals:

- find someone who has relevant experience,
- understand where knowledge lives,
- find supporting documentation.

Typical questions:

- "Who knows our Japan machinery import process?"
- "Who has handled this type of production issue before?"
- "Who understands the customer refund flow?"

---

## 3.3 Knowledge / Operations Manager

Typical goals:

- identify organization-wide knowledge gaps,
- prioritize knowledge transfer programs,
- track resilience improvement.

Typical questions:

- "Which critical knowledge areas have high concentration?"
- "Which departments have the highest knowledge-loss exposure?"
- "Did our knowledge-transfer program reduce risk?"

---

# 4. Core Product Principles

## 4.1 Evaluate Knowledge, Not People

Bad:

```text
Employee Score
Alif — 67/100
```

Good:

```text
PostgreSQL Migration Knowledge

Coverage: 1.4 people
Risk: HIGH
Primary knowledge holders:
- Alif
- Dimas
```

---

## 4.2 Evidence-Based Expertise

Do not rely only on self-declared skills.

Expertise should be derived from evidence such as:

- project participation,
- documents authored,
- tickets solved,
- incidents handled,
- code ownership,
- reviews,
- maintenance history,
- peer confirmation,
- training completion,
- recent related activity.

---

## 4.3 Explainability

Every expertise score and risk score must be explainable.

Users should be able to inspect:

- why someone is considered knowledgeable,
- what evidence contributed,
- when the evidence was created,
- whether the evidence is recent,
- how the risk score was calculated.

---

## 4.4 Privacy-Aware Design

The system must not become employee surveillance software.

For the portfolio MVP:

- no productivity ranking,
- no "best employee" leaderboard,
- no sentiment monitoring,
- no private message ingestion,
- no hidden performance evaluation,
- no salary / HR rating integration.

Employees can be associated with expertise, but the application evaluates **organizational knowledge coverage**.

---

# 5. MVP Scope

The MVP should contain six main modules:

1. Knowledge Overview
2. Knowledge Explorer
3. Expert Finder
4. Knowledge Risk Detection
5. Unavailability Simulation
6. Knowledge Transfer Planner

The MVP should use **synthetic company data**.

Do not integrate with real GitHub, Slack, Jira, Google Drive, or employee data during the first implementation.

Instead, build realistic mock connectors and seeded data.

---

# 6. Fictional Demo Company

Use a fictional company called:

**Northstar Industries**

Northstar Industries is a diversified company with approximately 250 employees.

Departments:

- Engineering
- Manufacturing
- Finance
- Procurement
- Operations
- Customer Support

The demo dataset should contain approximately:

- 35 employees,
- 25 knowledge areas,
- 12 business objects,
- 120–200 evidence records,
- 10 knowledge-transfer plans,
- multiple deliberately risky knowledge areas.

---

# 7. Main Domain Model

The platform revolves around this relationship:

```text
People
  ↓
Evidence
  ↓
Knowledge Areas
  ↓
Business Objects
  ↓
Business Criticality
```

Example:

```text
Budi Santoso
    ↓
Solved maintenance incidents
    ↓
Production Line 4 Troubleshooting
    ↓
Production Line 4
    ↓
Critical Manufacturing Asset
```

---

# 8. Data Entities

## 8.1 Employee

Fields:

```ts
id
name
email
jobTitle
departmentId
location
avatarUrl
status
joinedAt
```

Example:

```json
{
  "id": "emp_budi",
  "name": "Budi Santoso",
  "email": "budi@northstar.demo",
  "jobTitle": "Senior Maintenance Engineer",
  "departmentId": "manufacturing",
  "location": "Bekasi Plant",
  "status": "active"
}
```

---

## 8.2 Department

Fields:

```ts
id
name
description
```

---

## 8.3 KnowledgeArea

Represents something the organization needs to know.

Fields:

```ts
id
name
description
category
departmentId
businessCriticality
knowledgeDecayRate
status
createdAt
updatedAt
```

Example:

```json
{
  "id": "ka_line4_troubleshooting",
  "name": "Production Line 4 Troubleshooting",
  "category": "Manufacturing Operations",
  "departmentId": "manufacturing",
  "businessCriticality": 0.95,
  "knowledgeDecayRate": 0.02
}
```

`businessCriticality` range:

```text
0.0 → 1.0
```

---

## 8.4 BusinessObject

Represents the thing affected by a knowledge area.

Possible object types:

```text
SERVICE
PROCESS
PRODUCT
PROJECT
MACHINE
ASSET
CUSTOMER
SUPPLIER
REGULATION
SYSTEM
```

Fields:

```ts
id
name
type
departmentId
criticality
metadata
```

Examples:

```text
Production Line 4
Billing Service
Month-End Closing
Japan Machinery Import
Customer Refund Process
```

---

## 8.5 KnowledgeBusinessObject

Many-to-many relation:

```text
KnowledgeArea
↕
BusinessObject
```

Fields:

```ts
knowledgeAreaId
businessObjectId
impactWeight
```

---

## 8.6 Evidence

Represents evidence that an employee has knowledge in an area.

Evidence types:

```text
DOCUMENT_AUTHORED
DOCUMENT_CONTRIBUTION
PROJECT_PARTICIPATION
TICKET_RESOLVED
INCIDENT_RESOLVED
CODE_CONTRIBUTION
CODE_REVIEW
TRAINING_COMPLETED
PEER_CONFIRMATION
PROCESS_EXECUTION
MAINTENANCE_ACTIVITY
```

Fields:

```ts
id
employeeId
knowledgeAreaId
type
title
description
source
sourceReference
strength
occurredAt
metadata
```

`strength`:

```text
0.0 → 1.0
```

---

## 8.7 ExpertiseScore

This may be calculated dynamically or cached.

Fields:

```ts
employeeId
knowledgeAreaId
score
confidence
evidenceCount
lastEvidenceAt
calculatedAt
```

---

## 8.8 KnowledgeRisk

Fields:

```ts
knowledgeAreaId
riskScore
riskLevel
knowledgeConcentration
coverageScore
effectiveExpertCount
criticalityScore
freshnessScore
calculatedAt
```

Risk levels:

```text
LOW
MEDIUM
HIGH
CRITICAL
```

---

## 8.9 KnowledgeTransferPlan

Fields:

```ts
id
knowledgeAreaId
primaryHolderId
backupEmployeeId
status
targetCoverage
currentCoverage
startedAt
targetDate
completedAt
```

Statuses:

```text
PLANNED
IN_PROGRESS
BLOCKED
COMPLETED
```

---

## 8.10 TransferActivity

Examples:

```text
SHADOW_SESSION
DOCUMENTATION
PAIR_WORK
INCIDENT_OBSERVATION
TRAINING
REVIEW
INDEPENDENT_VALIDATION
KNOWLEDGE_INTERVIEW
```

Fields:

```ts
id
transferPlanId
type
title
description
status
weight
completedAt
```

---

# 9. Expertise Scoring

The scoring system must be understandable and deterministic for the MVP.

Do not use machine learning initially.

For every employee + knowledge area combination:

```text
expertiseScore =
    evidenceStrength
    × recencyFactor
    × diversityFactor
    × confidenceFactor
```

A suggested implementation:

```text
baseScore = Σ(evidence.weight × evidence.strength × recencyMultiplier)

diversityBonus =
    min(uniqueEvidenceTypes / 5, 1)

expertiseScore =
    normalize(
        baseScore × (0.7 + 0.3 × diversityBonus)
    )
```

Return:

```text
0–100
```

---

# 10. Evidence Type Weights

Suggested values:

```text
INCIDENT_RESOLVED       1.00
PROCESS_EXECUTION       0.95
MAINTENANCE_ACTIVITY    0.95
PROJECT_PARTICIPATION   0.85
CODE_CONTRIBUTION       0.85
TICKET_RESOLVED         0.80
DOCUMENT_AUTHORED       0.75
CODE_REVIEW             0.65
DOCUMENT_CONTRIBUTION   0.60
TRAINING_COMPLETED      0.50
PEER_CONFIRMATION       0.45
```

These values must be configurable.

---

# 11. Knowledge Decay

Older evidence should gradually lose weight.

Suggested approach:

```text
recencyMultiplier =
e^(-lambda × ageInDays)
```

For a simpler MVP implementation:

```text
0–90 days        → 1.00
91–180 days      → 0.90
181–365 days     → 0.75
1–2 years        → 0.55
> 2 years        → 0.35
```

Different knowledge areas may have different decay rates.

Example:

```text
Cloud infrastructure knowledge
→ high decay rate

Tax regulation knowledge
→ medium decay rate

Mechanical plant layout knowledge
→ lower decay rate
```

---

# 12. Effective Expert Count

Do not simply count employees with any evidence.

Calculate how distributed the expertise is.

Example expertise distribution:

```text
Budi     92
Andri    25
Rina     13
```

This should produce approximately:

```text
effective expert count ≈ 1.x
```

A suggested approach is the inverse Herfindahl concentration metric.

Given normalized expertise shares:

```text
p_i = employeeExpertise / totalExpertise
```

Then:

```text
HHI = Σ(p_i²)

effectiveExpertCount = 1 / HHI
```

Examples:

```text
100 / 0 / 0
effective experts ≈ 1

50 / 50
effective experts ≈ 2

33 / 33 / 34
effective experts ≈ 3
```

This metric is one of the most important technical features of the project.

---

# 13. Knowledge Concentration

Suggested formula:

```text
knowledgeConcentration =
1 - normalize(effectiveExpertCount)
```

Alternative UI representation:

```text
1.0 effective experts → CRITICAL
1.0–1.5               → HIGH
1.5–2.5               → MEDIUM
> 2.5                  → LOW
```

The thresholds should also consider business criticality.

---

# 14. Knowledge Risk Score

Suggested MVP formula:

```text
riskScore =
    businessCriticality × 0.40
  + concentrationRisk  × 0.35
  + freshnessRisk      × 0.15
  + documentationGap   × 0.10
```

Return:

```text
0–100
```

Suggested level mapping:

```text
0–29   LOW
30–54  MEDIUM
55–74  HIGH
75–100 CRITICAL
```

The UI must display the factors contributing to the risk score.

Example:

```text
Risk: 86 / 100 — CRITICAL

Why?

Business criticality      96%
Knowledge concentration  91%
Knowledge freshness risk  58%
Documentation gap         72%
```

---

# 15. Dashboard

Route:

```text
/dashboard
```

Main cards:

```text
Critical Knowledge Areas
At-Risk Knowledge Areas
Average Effective Expert Count
Active Transfer Plans
```

Example:

```text
Critical Knowledge Areas    18
At Risk                     31
Effective Experts           2.4 avg
Transfer Plans              7 active
```

Include:

### Knowledge Risk Distribution

```text
LOW       42
MEDIUM    31
HIGH      18
CRITICAL  9
```

### Highest Risk Knowledge Areas

Columns:

```text
Knowledge Area
Department
Business Criticality
Effective Experts
Risk Level
Primary Holder
```

### Department Risk

Example:

```text
Manufacturing     HIGH
Finance           MEDIUM
Engineering       MEDIUM
Procurement       HIGH
```

---

# 16. Knowledge Explorer

Route:

```text
/knowledge
```

Features:

- search,
- filter by department,
- filter by category,
- filter by risk level,
- sort by criticality,
- sort by effective expert count.

Example table:

```text
Production Line 4 Troubleshooting
Manufacturing
Effective Experts: 1.2
Risk: CRITICAL

Month-End Closing
Finance
Effective Experts: 1.8
Risk: HIGH
```

---

# 17. Knowledge Detail Page

Route:

```text
/knowledge/:id
```

Header:

```text
Production Line 4 Troubleshooting

Department: Manufacturing
Criticality: 96%
Risk: CRITICAL
Effective Experts: 1.2
```

Sections:

1. Knowledge Health
2. Expertise Distribution
3. Evidence
4. Connected Business Objects
5. Risk Explanation
6. Transfer Plan
7. Historical Risk Trend

---

# 18. Expertise Distribution

Example:

```text
Budi Santoso     92
Andri Pratama    31
Rina Wijaya      12
```

Each employee should display:

```text
Expertise Score
Evidence Count
Last Activity
Primary Evidence Types
```

---

# 19. Explainability Panel

Example:

```text
Why does the system think Budi knows this?

32 Maintenance Activities
14 Incident Resolutions
3 Documents Authored
8 Peer Confirmations

Last evidence:
12 days ago
```

Allow clicking each evidence item.

---

# 20. Expert Finder

Route:

```text
/experts
```

Search example:

```text
"Japan machinery import"
```

Results:

```text
1. Rina Pratama
   Procurement Manager
   Expertise: 92
   Confidence: HIGH

2. Dimas Nugraha
   Supply Chain Specialist
   Expertise: 74
```

Every result must show evidence.

Optional future AI feature:

Natural-language search can map a query to relevant knowledge areas.

For MVP, use PostgreSQL full-text search or simple trigram similarity.

---

# 21. Employee Knowledge Profile

Route:

```text
/people/:id
```

Do not show performance scoring.

Display:

```text
Budi Santoso
Senior Maintenance Engineer

Knowledge Areas

Production Line 4 Troubleshooting    92
Hydraulic Calibration               88
Machine X Diagnosis                 75
Vendor Maintenance Process          66
```

Also show:

```text
Knowledge Dependency Impact
```

Example:

```text
If unavailable:

3 Critical Knowledge Areas
2 High-Risk Processes
1 Critical Asset
```

---

# 22. Unavailability Simulation

This is one of the flagship portfolio features.

Route:

```text
/simulate
```

User selects:

```text
Employee
Unavailable duration
Optional department
```

Example:

```text
Simulate:
Budi Santoso unavailable for 30 days
```

The engine should temporarily remove or heavily reduce Budi's expertise contribution.

Recalculate:

```text
effective expert count
knowledge concentration
knowledge risk
affected business objects
```

Output:

```text
Affected Knowledge Areas: 5

Production Line 4 Troubleshooting
Before: HIGH
After: CRITICAL

Hydraulic Calibration
Before: MEDIUM
After: HIGH
```

Display:

```text
Organizational Coverage

Before   82%
After    39%
```

Also show impacted business objects.

---

# 23. Knowledge Transfer Planner

Route:

```text
/transfers
```

Purpose:

Reduce concentration risk.

A transfer plan contains:

```text
Knowledge Area
Primary Holder
Backup Candidate
Current Coverage
Target Coverage
Target Date
```

Example:

```text
Production Line 4 Troubleshooting

Primary:
Budi

Backup:
Andri

Current backup expertise:
31

Target:
70
```

---

# 24. Transfer Recommendations

For MVP, recommendations may use deterministic rules.

Example:

If backup employee has:

```text
expertise < 40
```

suggest:

```text
Shadow Sessions
Documentation Review
Incident Observation
Knowledge Interview
```

If:

```text
expertise 40–70
```

suggest:

```text
Pair Work
Independent Incident Resolution
Peer Review
```

If:

```text
expertise > 70
```

suggest:

```text
Independent Validation
Backup Owner Assignment
```

---

# 25. Transfer Progress

Example:

```text
Knowledge Transfer Progress

Budi → Andri

January
Andri expertise: 23

March
Andri expertise: 48

June
Andri expertise: 71

Risk:
CRITICAL → HIGH → LOW
```

The system should show whether resilience actually improved.

---

# 26. Knowledge Graph Visualization

Route:

```text
/graph
```

Graph nodes:

```text
EMPLOYEE
KNOWLEDGE_AREA
BUSINESS_OBJECT
DEPARTMENT
```

Edges:

```text
HAS_EXPERTISE
SUPPORTED_BY
IMPACTS
BELONGS_TO
```

Example:

```text
Budi
  ↓
Production Line 4 Troubleshooting
  ↓
Production Line 4
  ↓
Manufacturing
```

Use graph visualization mainly as an exploration tool.

Do not make it the primary application UI.

---

# 27. Recommended Tech Stack

## Frontend

```text
Next.js 15+
React
TypeScript
Tailwind CSS
shadcn/ui
TanStack Query
TanStack Table
React Hook Form
Zod
Recharts
React Flow
```

Responsibilities:

- dashboard,
- knowledge explorer,
- tables,
- simulations,
- knowledge graph,
- transfer planner.

---

## Backend

```text
NestJS
TypeScript
REST API
Swagger / OpenAPI
class-validator
Prisma ORM
```

Alternative ORM:

```text
TypeORM
```

Use Prisma unless there is a specific reason to use TypeORM.

---

## Database

```text
PostgreSQL 17+
```

PostgreSQL should store:

- employees,
- knowledge areas,
- evidence,
- business objects,
- risk calculations,
- transfer plans,
- historical snapshots.

Use:

```text
GIN indexes
pg_trgm
PostgreSQL full-text search
JSONB metadata
```

---

## Cache / Queue

```text
Redis
BullMQ
```

Use BullMQ for:

- expertise recalculation,
- knowledge risk recalculation,
- simulation jobs,
- mock connector ingestion,
- scheduled knowledge snapshot generation.

---

## Authentication

For MVP:

```text
Auth.js
```

Roles:

```text
EMPLOYEE
MANAGER
KNOWLEDGE_ADMIN
```

---

## Visualization

Charts:

```text
Recharts
```

Graph:

```text
React Flow
```

Do not use Neo4j for the initial MVP.

Model graph relations inside PostgreSQL first.

Neo4j can be introduced later only if graph traversal becomes an important technical extension.

---

## Development Environment

Use Docker Compose.

Services:

```text
web
api
postgres
redis
```

Optional:

```text
worker
```

Suggested monorepo:

```text
pnpm
Turborepo
```

Structure:

```text
continuum/
├── apps/
│   ├── web/
│   ├── api/
│   └── worker/
│
├── packages/
│   ├── ui/
│   ├── types/
│   ├── config/
│   └── eslint-config/
│
├── docker/
│
├── docker-compose.yml
├── pnpm-workspace.yaml
└── README.md
```

---

# 28. Recommended Repository Architecture

## Web

```text
apps/web/
├── app/
│   ├── dashboard/
│   ├── knowledge/
│   ├── experts/
│   ├── people/
│   ├── simulate/
│   ├── transfers/
│   └── graph/
│
├── components/
├── features/
├── lib/
├── hooks/
└── types/
```

---

## API

```text
apps/api/src/
├── modules/
│   ├── auth/
│   ├── employees/
│   ├── departments/
│   ├── knowledge/
│   ├── expertise/
│   ├── evidence/
│   ├── business-objects/
│   ├── risks/
│   ├── simulations/
│   └── transfers/
│
├── common/
├── config/
├── database/
└── jobs/
```

---

# 29. Main API Endpoints

## Dashboard

```text
GET /dashboard/summary
GET /dashboard/risk-distribution
GET /dashboard/departments
GET /dashboard/high-risk-knowledge
```

---

## Knowledge

```text
GET    /knowledge
GET    /knowledge/:id
POST   /knowledge
PATCH  /knowledge/:id
DELETE /knowledge/:id
```

---

## Expertise

```text
GET /knowledge/:id/experts
GET /employees/:id/expertise
GET /expert-search?q=
```

---

## Evidence

```text
GET  /knowledge/:id/evidence
POST /evidence
GET  /employees/:id/evidence
```

---

## Risk

```text
GET  /knowledge/:id/risk
POST /knowledge/:id/recalculate-risk
```

---

## Simulation

```text
POST /simulations/unavailability
GET  /simulations/:id
```

Payload:

```json
{
  "employeeId": "emp_budi",
  "durationDays": 30
}
```

---

## Transfer

```text
GET    /transfers
POST   /transfers
GET    /transfers/:id
PATCH  /transfers/:id
POST   /transfers/:id/activities
PATCH  /transfers/:id/activities/:activityId
```

---

# 30. Historical Metrics

Create a table:

```text
knowledge_risk_snapshots
```

Fields:

```ts
id
knowledgeAreaId
riskScore
effectiveExpertCount
knowledgeConcentration
snapshotDate
```

This enables charts such as:

```text
January → CRITICAL
March   → HIGH
June    → LOW
```

---

# 31. Search

For MVP:

Use PostgreSQL:

```text
pg_trgm
tsvector
```

Search against:

```text
knowledge name
knowledge description
business object name
evidence title
employee name
```

Future extension:

```text
embeddings + pgvector
```

Do not make vector search a requirement for the initial version.

---

# 32. AI Usage

AI must not be necessary for the product to function.

Possible future AI features:

### Query Understanding

Convert:

```text
"Who knows how we import machinery from Japan?"
```

into:

```text
Knowledge Area:
Japan Machinery Import Process
```

### Knowledge Extraction

Generate candidate knowledge topics from synthetic documents.

### Transfer Recommendations

Generate suggested knowledge-transfer activities.

### Explanation Summaries

Example:

```text
This process is high risk because 78% of its expertise
signals are concentrated in one employee and the latest
supporting documentation is 14 months old.
```

The core scoring and risk calculations must remain deterministic and explainable.

---

# 33. Seed Data Requirements

Create realistic synthetic data.

At minimum:

## Departments

```text
Engineering
Manufacturing
Finance
Procurement
Operations
Customer Support
```

## Example Employees

```text
Budi Santoso
Senior Maintenance Engineer

Andri Pratama
Maintenance Engineer

Rina Pratama
Procurement Manager

Dimas Nugraha
Supply Chain Specialist

Sarah Wijaya
Senior Accountant

Kevin Hartono
Backend Engineer

Maya Putri
Customer Operations Lead
```

---

# 34. Required Knowledge Areas

Include at least:

```text
Production Line 4 Troubleshooting
Hydraulic Calibration
Month-End Closing
Bank Reconciliation
Indonesia VAT Reporting
Japan Machinery Import Process
Customs Clearance
Supplier Contract Renewal
Customer Refund Workflow
Billing Service Architecture
PostgreSQL Migration
Authentication Service
Cloud Infrastructure Deployment
Incident Response
Customer Escalation Process
```

Create additional knowledge areas until approximately 25 exist.

---

# 35. Deliberate Risk Scenarios

Seed the database with scenarios designed to demonstrate the product.

## Scenario A — Critical Manufacturing Dependency

```text
Production Line 4 Troubleshooting

Budi: 92
Andri: 24
Others: < 10

Criticality: 0.96
```

Expected:

```text
Risk: CRITICAL
Effective Expert Count ≈ 1.x
```

---

## Scenario B — Finance Knowledge Moderately Distributed

```text
Month-End Closing

Sarah: 88
Nadia: 65
Fajar: 48
```

Expected:

```text
Risk: MEDIUM
```

---

## Scenario C — Healthy Engineering Coverage

```text
Authentication Service

Kevin: 84
Raka: 79
Dina: 72
```

Expected:

```text
Risk: LOW
```

---

## Scenario D — Aging Knowledge

```text
Legacy Supplier Import Procedure

Evidence mostly > 2 years old.
```

Expected:

```text
Freshness risk increases.
```

---

# 36. UI / Visual Direction

The application should feel like an internal enterprise intelligence platform.

Design characteristics:

```text
clean
dense but readable
professional
data-first
modern SaaS
```

Avoid:

```text
crypto dashboard aesthetics
neon colors
excessive gradients
overuse of glassmorphism
```

Preferred layout:

```text
left sidebar navigation
top page header
content cards
tables
charts
detail panels
```

Sidebar:

```text
Overview
Knowledge
Experts
People
Simulation
Transfers
Knowledge Graph
Settings
```

---

# 37. Important Portfolio Features

The following features should receive the most engineering attention:

## 1. Effective Expert Count

Use expertise distribution to calculate whether knowledge is truly distributed.

---

## 2. Explainable Knowledge Risk

The UI must show why something is considered risky.

---

## 3. Unavailability Simulation

Recalculate organizational knowledge exposure when an employee is removed.

---

## 4. Knowledge Transfer Measurement

Show whether backup coverage improves over time.

---

## 5. Evidence-Based Expertise

Every expertise claim should have traceable evidence.

---

# 38. Non-Goals for MVP

Do not implement:

```text
real Slack integration
real Teams integration
real Gmail integration
real GitHub integration
real HRIS integration
real employee monitoring
AI chatbot
complex embeddings
Neo4j
Kubernetes
microservices
machine learning models
real-time event streaming
```

These can be added later.

The MVP should demonstrate product thinking and solid backend architecture without unnecessary infrastructure complexity.

---

# 39. Phase 1 — Foundation

Build:

```text
monorepo
Next.js app
NestJS API
PostgreSQL
Redis
Docker Compose
Prisma
authentication
seed system
```

Deliverable:

Application runs locally with:

```bash
docker compose up
```

---

# 40. Phase 2 — Core Data

Implement:

```text
employees
departments
knowledge areas
business objects
evidence
```

Add synthetic seed dataset.

Deliverable:

API and admin pages can browse all core entities.

---

# 41. Phase 3 — Expertise Engine

Implement:

```text
evidence weighting
recency decay
expertise calculation
effective expert count
expert distribution
```

Create tests for scoring calculations.

Deliverable:

Each knowledge area can show its experts and evidence.

---

# 42. Phase 4 — Risk Engine

Implement:

```text
knowledge concentration
business criticality
freshness risk
documentation gap
risk score
risk levels
```

Deliverable:

Dashboard displays risk across the organization.

---

# 43. Phase 5 — Simulation

Implement employee unavailability simulation.

Pseudo-flow:

```text
select employee

↓

fetch all related knowledge areas

↓

remove employee expertise contribution

↓

recalculate effective expert count

↓

recalculate risk

↓

calculate affected business objects

↓

compare before vs after
```

Deliverable:

Interactive simulation page.

---

# 44. Phase 6 — Knowledge Transfer

Implement:

```text
transfer plans
backup candidates
transfer activities
progress tracking
risk history
```

Deliverable:

Users can demonstrate:

```text
CRITICAL → HIGH → LOW
```

as backup expertise grows.

---

# 45. Phase 7 — Polish

Add:

```text
responsive layout
loading states
empty states
error states
skeletons
tooltips
explainability drawers
charts
seed reset command
README
architecture diagram
screenshots
```

---

# 46. Testing Strategy

## Unit Tests

Focus on:

```text
expertise calculations
recency decay
effective expert count
risk calculations
simulation calculations
transfer coverage
```

Suggested:

```text
Vitest
```

---

## Integration Tests

Test:

```text
knowledge API
expert search
simulation API
transfer API
```

---

## E2E

Suggested:

```text
Playwright
```

Important flows:

```text
Open dashboard
Inspect critical knowledge
View evidence
Run employee simulation
Create transfer plan
Complete activities
Observe risk improvement
```

---

# 47. Documentation Requirements

README should explain:

## Problem

Organizations often depend on knowledge held by a small number of people.

---

## Product Hypothesis

Organizations can reduce operational risk by continuously measuring knowledge concentration and deliberately building backup expertise.

---

## Architecture

Include:

```text
Next.js
NestJS
PostgreSQL
Redis
BullMQ
```

---

## Main Technical Concepts

Document:

```text
expertise scoring
knowledge decay
effective expert count
knowledge concentration
risk calculation
simulation engine
```

---

# 48. Portfolio Story

The final project should tell this story:

```text
Step 1

The organization believes it has documented knowledge.

↓

Step 2

Continuum discovers that several critical processes
are actually dependent on one employee.

↓

Step 3

A manager simulates that employee becoming unavailable.

↓

Step 4

The system identifies affected knowledge and business processes.

↓

Step 5

Continuum recommends a backup employee.

↓

Step 6

A knowledge-transfer plan is created.

↓

Step 7

Backup expertise increases.

↓

Step 8

Organizational knowledge risk decreases.
```

This story should be clearly visible in the demo.

---

# 49. Example Demo Scenario

A portfolio demo should be able to show the following sequence.

### Dashboard

```text
9 Critical Knowledge Areas
18 High Risk
```

Select:

```text
Production Line 4 Troubleshooting
```

Show:

```text
Risk: 86
Effective experts: 1.2

Budi  92
Andri 24
```

Explain evidence.

Then run:

```text
Simulate Budi unavailable
```

Result:

```text
Risk:
86 → 97

Production coverage:
72% → 21%
```

Create transfer:

```text
Budi → Andri
```

Complete synthetic transfer activities.

New expertise:

```text
Andri:
24 → 71
```

New effective expert count:

```text
1.2 → 1.9
```

New risk:

```text
86 → 54
```

This should be the flagship demo flow.

---

# 50. Future Extensions

Do not implement immediately, but design for:

```text
GitHub connector
Jira connector
Slack / Teams connector
Google Drive connector
Notion connector
HRIS connector
pgvector semantic search
LLM-assisted knowledge extraction
organizational network analysis
knowledge succession recommendations
scheduled risk scans
automatic alerts
knowledge-risk trend forecasting
```

---

# 51. Suggested Technical Extensions for Portfolio Depth

After the MVP works, consider adding one or two of these.

## Event Ingestion Architecture

Create mock connectors:

```text
GitHub
Jira
Docs
Maintenance System
```

Normalize events into:

```text
KnowledgeEvidenceEvent
```

Pipeline:

```text
Connector
↓
Ingestion Queue
↓
Normalizer
↓
Evidence Matching
↓
Expertise Recalculation
↓
Risk Recalculation
```

---

## Background Workers

BullMQ jobs:

```text
calculate-expertise
calculate-risk
generate-risk-snapshot
run-unavailability-simulation
process-ingestion-event
```

---

## Auditability

Store calculation snapshots:

```text
score inputs
formula version
timestamp
result
```

Allow users to inspect why a previous score changed.

---

# 52. Engineering Constraints

The implementation should prioritize:

```text
clear domain modeling
type safety
testable business logic
separation of concerns
explainable algorithms
database indexing
clean REST API design
maintainable code
```

Avoid premature complexity.

Do not build microservices.

Use a modular monolith.

---

# 53. Definition of Done

The MVP is complete when a reviewer can:

1. log in,
2. see organization-wide knowledge risk,
3. browse knowledge areas,
4. inspect expertise evidence,
5. search for internal experts,
6. view effective expert count,
7. simulate a key employee being unavailable,
8. see business impact,
9. create a knowledge-transfer plan,
10. complete transfer activities,
11. see backup coverage increase,
12. see risk decrease.

---

# 54. Initial AI Coding Task

Use the specification above as the source of truth.

Start by implementing **Phase 1 and Phase 2 only**.

Requirements:

```text
1. Create pnpm monorepo using Turborepo.
2. Create apps/web using Next.js + TypeScript.
3. Create apps/api using NestJS + TypeScript.
4. Create PostgreSQL using Docker Compose.
5. Create Redis using Docker Compose.
6. Configure Prisma in the NestJS API.
7. Implement the core database schema.
8. Create realistic seed data for Northstar Industries.
9. Implement REST endpoints for:
   - departments
   - employees
   - knowledge areas
   - business objects
   - evidence
10. Create basic Next.js pages:
   - /dashboard
   - /knowledge
   - /knowledge/:id
   - /people
11. Use shadcn/ui and Tailwind CSS.
12. Add README instructions.
13. Add .env.example.
14. Ensure the entire project can run locally through Docker Compose.
```

Do **not** implement AI features yet.

Do **not** implement real third-party integrations yet.

Do **not** implement microservices.

After Phase 1 and Phase 2 work correctly, continue with:

```text
Phase 3 — Expertise Engine
Phase 4 — Risk Engine
Phase 5 — Simulation
Phase 6 — Knowledge Transfer
```

Keep business logic in dedicated services so scoring algorithms can be tested independently.

---

# 55. Final Product Statement

**Continuum**

> An internal organizational knowledge resilience platform that identifies where critical knowledge lives, detects dangerous knowledge concentration, simulates key-person risk, and helps organizations build measurable backup expertise.

The product should answer four questions exceptionally well:

```text
Who knows this?

How dependent are we on them?

What happens if they are unavailable?

What should we do to reduce that risk?
```
