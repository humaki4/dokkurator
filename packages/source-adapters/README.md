# @dokkurator/source-adapters

Internal adapters for reading Dokkurator source files.

The package owns the infrastructure-independent `SourceAdapter` contract and
the local `FileSystemSource` and `GitSource` implementations. Core libraries
consume this package without depending on filesystem or Git implementation
details.

This package is workspace-internal and marked as `private`. Nx discovers it
from its `package.json` through the workspace's `nx/plugins/package-json`
configuration; no separate `project.json` is required.
