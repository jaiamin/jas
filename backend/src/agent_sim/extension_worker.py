"""Trusted worker for import-free core Wasm; never evaluates Python or model prose."""

import hashlib
import json
import resource
import sys
import time

MAX_INPUT = 70000


def run(payload: dict) -> dict:
    # Bound compilation as well as guest execution. No dependency imports happen
    # before limits; no candidate-controlled code executes in the Python process.
    for kind, limit in (
        (resource.RLIMIT_AS, 1024 * 1024 * 1024),
        (resource.RLIMIT_CPU, 2),
        (resource.RLIMIT_FSIZE, 0),
        (resource.RLIMIT_CORE, 0),
        (resource.RLIMIT_NOFILE, 32),
        (resource.RLIMIT_NPROC, 8),
    ):
        resource.setrlimit(kind, (limit, limit))

    # Fixed trusted boundary probes, unreachable through ExtensionCandidate.
    if payload.get("qualification") == "deadline":
        time.sleep(30)
    if payload.get("qualification") == "output":
        sys.stdout.write("x" * 4097)
        return {"code": "ok"}
    if payload.get("qualification") == "environment":
        import os

        allowed = {"LANG", "LC_CTYPE", "HOME", "TMPDIR"}
        return {"code": "ok" if set(os.environ) <= allowed else "environment_leak"}

    import wasmtime

    config = wasmtime.Config()
    config.consume_fuel = True
    config.max_wasm_stack = 256 * 1024
    config.wasm_threads = False
    config.wasm_memory64 = False
    config.parallel_compilation = False
    config.memory_reservation = 2 * 1024 * 1024
    config.memory_guard_size = 0
    config.memory_reservation_for_growth = 0
    with wasmtime.Engine(config) as engine:
        try:
            bytecode = bytes(wasmtime.wat2wasm(payload["source"]))
            module = wasmtime.Module(engine, bytecode)
        except wasmtime.WasmtimeError:
            return {"code": "invalid_module"}
        with module:
            # No Linker, WASI context, callback, preopen, env or host capability.
            # Deny all import kinds, including unused ones, before instantiation.
            if module.imports:
                return {"code": "imports_denied"}
            exports = module.exports
            if len(exports) != 1 or exports[0].name != "step":
                return {"code": "contract"}
            signature = exports[0].type
            if not isinstance(signature, wasmtime.FuncType) or (
                signature.params != [wasmtime.ValType.i32()]
                or signature.results != [wasmtime.ValType.i32()]
            ):
                return {"code": "contract"}
            outputs = []
            try:
                # Each checkpoint/example is an independent fresh instance.
                for state in payload["states"]:
                    with wasmtime.Store(engine) as store:
                        store.set_limits(
                            memory_size=1024 * 1024,
                            table_elements=128,
                            instances=1,
                            memories=1,
                            tables=1,
                        )
                        store.set_fuel(100000)
                        instance = wasmtime.Instance(store, module, [])
                        step = instance.exports(store)["step"]
                        if not isinstance(step, wasmtime.Func):
                            return {"code": "contract"}
                        outputs.append(step(store, state))
            except wasmtime.Trap as error:
                code = {
                    wasmtime.TrapCode.OUT_OF_FUEL: "fuel_exhausted",
                    wasmtime.TrapCode.STACK_OVERFLOW: "stack_exhausted",
                }.get(error.trap_code, "trap")
                return {"code": code}
            except wasmtime.WasmtimeError:
                return {"code": "resource_limit"}
            return {
                "code": "ok",
                "outputs": outputs,
                "wasm_sha256": hashlib.sha256(bytecode).hexdigest(),
            }


def main() -> None:
    raw = sys.stdin.buffer.read(MAX_INPUT + 1)
    if len(raw) > MAX_INPUT:
        result = {"code": "input_limit"}
    else:
        try:
            result = run(json.loads(raw))
        except Exception:
            # Do not expose candidate strings, paths, native errors or secrets.
            result = {"code": "worker_failed"}
    print(json.dumps(result, separators=(",", ":")))


if __name__ == "__main__":
    main()
