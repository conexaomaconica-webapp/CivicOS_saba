# Changelog

All notable changes to the CivicOS Kernel and SDK will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-07-16

### Added
- **Platform Freeze**: The core CivicOS kernel public API is now officially v1.0.0 and frozen.
- **CivicOSInstance Facades**: The `Kernel.boot` method now returns a deeply structured `CivicOSInstance` with the following Facades: `presentation`, `health`, `diagnostics`, `execution`, `policy`, `workflow`, `capabilities`, `events`.
- **SDK Builders**: Added robust builders for SDK consumers including `definePlugin`, `defineRoute`, `defineWidget`, `defineCapability`, `defineWorkflow`, `definePolicy`, `defineJob`, and `defineEvent`.
- **API Contracts**: Added `api-compatibility.test.ts` to enforce that SDK types and `CivicOSInstance` shape are never broken without a Major version bump.
- **Architecture Constraints**: Added `core-constraints.test.ts` to strictly prohibit database or ORM imports in `@saas/core`, keeping the Kernel 100% agnostic.
- **Strict Linting**: Configured ESLint with type-aware rules (`no-floating-promises`, `switch-exhaustiveness-check`) and blocked internal/cross-plugin imports (`no-restricted-imports`).
- **Semantic Versioning Strategy**: Established rigid SemVer rules where patch/minor releases cannot alter public contracts.
- **Event Catalog v1.0.0**: Tagged `CivicEvents` interface with `@version 1.0.0` and `@stable`.
- **Capability Catalog v1.0.0**: Tagged `CapabilityDefinition` interface with `@version 1.0.0` and `@stable`.
- **Plugin Manifest v1.0.0**: Tagged `PluginManifest` interface with `@version 1.0.0` and `@stable`.

### Changed
- Refactored internal registries to be completely hidden from the plugins. 
- Plugins MUST import from `@saas/sdk` rather than `@saas/core` internals.
