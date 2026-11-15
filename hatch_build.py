from pathlib import Path

from hatchling.builders.hooks.plugin.interface import BuildHookInterface


class CustomBuildHook(BuildHookInterface):
    def initialize(self, version, build_data):
        if version == "editable":
            return
        assets = Path(self.root) / "frontend" / "dist"
        if not (assets / "index.html").is_file():
            raise RuntimeError("Build the frontend first: pnpm --dir frontend build")
        build_data["force_include"][str(assets)] = "agent_sim/static"
