# Project Management and Team Organization

**Status:** Proposed working method; team allocation requires team confirmation

## Team Context

Vayca is developed by a three-person internship team. The team should use a lightweight iterative method with explicit requirements and reviewed integration. The objective is not to reproduce a large-company process. It is to make parallel work understandable, testable, and recoverable.

## Recommended Method

Use short iterations with these stages:

1. Select an approved requirement and GitHub issue.
2. Confirm dependencies and acceptance criteria.
3. Create a feature branch from the current `testing` branch.
4. Implement one reviewable unit.
5. Run focused tests and document evidence.
6. Open a pull request into `testing`.
7. Obtain teammate review.
8. Integrate and verify the combined environment.
9. Promote stable `testing` changes to `main` for demonstration releases.

## Branching Model

```text
main
  ^
  | reviewed promotion
testing
  ^
  | reviewed feature pull requests
feature/<short-issue-name>
```

Rules:

- Never develop directly on `main` or `testing`.
- Create feature branches from current `testing`.
- Keep one issue or tightly related change per branch.
- Use `feat:`, `fix:`, `docs:`, `test:`, or `chore:` commit prefixes.
- Require at least one teammate review.
- Delete merged feature branches.

## GitHub Project Structure

Recommended workflow statuses:

- Backlog
- Ready
- In Progress
- In Review
- Done
- Resources, for non-delivery reference material only

Recommended project fields:

- Phase: MVP or Phase 2
- Module: Foundation, Calendar, Communication, Maintenance, Supervision
- Priority: Must, Should, Could
- Owner
- Iteration
- Dependency or blocked-by reference
- Requirement IDs

## Issue Quality Standard

Every implementation issue should include:

```markdown
## Problem
Which approved user or system need is addressed?

## Scope
What is included and explicitly excluded?

## Requirements
FR-... / NFR-...

## Dependencies
Blocked by #...

## Acceptance criteria
- [ ] Observable result
- [ ] Failure/empty state
- [ ] Authorization behavior
- [ ] Test evidence

## Documentation impact
Files or diagrams that must change
```

Large backlog items such as “WhatsApp integration” should be split into webhook verification, inbound persistence, conversation resolution, outgoing delivery, delivery-status handling, and simulator/test-mode work.

## Suggested Work Packages

### Iteration 0: Conception freeze

- Approve needs, scope, actors, navigation, modules, and provisional domain model.
- Reconcile GitHub issues with requirement IDs.
- Agree API and error conventions.
- Verify clean Docker startup.

### Iteration 1: Foundation and properties

- Database migration environment
- Company and user model
- Authentication and authorization
- Property API and connected interface

### Iteration 2: Calendar core

- Manual bookings
- Availability service
- iCalendar parser and synchronization records
- Conflict detection
- Connected calendar interface

### Iteration 3: Communication core

- Conversation and message model
- Webhook simulator
- Inbox and conversation interface connected to API
- Manual takeover

### Iteration 4: Chatbot and maintenance

- Grounded property answers
- Availability tool
- Escalation evaluation
- Ticket suggestions and confirmation
- Contractor contacts and ticket lifecycle

### Iteration 5: External integration and supervision

- WhatsApp test integration
- Integration failure handling
- Dashboard read models
- Security, performance, and mobile validation

### Iteration 6: Pilot and academic finalization

- End-to-end demonstration
- Pilot feedback
- Defect correction
- Final diagrams, screenshots, test results, and report generation

## Definition of Ready

An issue is ready when:

- requirement IDs are known;
- acceptance criteria are observable;
- dependencies are complete or planned;
- API/data decisions are sufficient;
- responsible member is identified;
- no unresolved team-level architectural decision blocks it.

## Definition of Done

An issue is done when:

- implementation is connected to persistent or intentionally simulated data;
- authorization is enforced where applicable;
- normal, empty, loading, and failure behavior is handled;
- focused tests pass;
- relevant documentation is updated;
- a teammate reviewed the pull request;
- behavior is verified after merge into `testing`.

## Documentation Responsibilities

Documentation is shared work even if one person coordinates it. Each module owner updates:

- requirements affected by changes;
- API and data decisions;
- relevant UML/workflow diagrams;
- test evidence;
- risks or limitations discovered.

The documentation coordinator ensures structure and consistency but should not invent module decisions without review.
