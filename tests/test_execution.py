import asyncio

import pytest

from agent_sandbox import policies
from agent_sandbox.execution import RunService
from agent_sandbox.replay import verify
from agent_sandbox.runner import Runner


def test_deleting_browser_timer_does_not_cancel_execution(store, scenario, monkeypatch):
    nicegui = pytest.importorskip("nicegui")

    async def exercise():
        started, release = asyncio.Event(), asyncio.Event()
        choose = policies.choose

        async def delayed(*args, **kwargs):
            started.set()
            await release.wait()
            return await choose(*args, **kwargs)

        monkeypatch.setattr(policies, "choose", delayed)
        monkeypatch.setattr(nicegui.ui.timer, "_skip_registration", lambda self: True)
        scenario.max_steps = 3
        runner = Runner.create(store, scenario)
        service = RunService(store)
        client = nicegui.Client(nicegui.ui.page("/execution-regression"))
        with client:
            timer = nicegui.ui.timer(0.5, lambda: service.start(runner.id))
        await timer._invoke_callback()
        await asyncio.wait_for(started.wait(), 2)
        client.delete()  # Actual NiceGUI timer deletion boundary from the original repro.
        release.set()
        await asyncio.wait_for(service.get(runner.id).task, 2)
        assert store.run(runner.id)["status"] == "complete"
        assert store.run(runner.id)["calls"] == 3
        assert verify(store, runner.id) == 3
        await service.close()

    asyncio.run(exercise())


def test_pause_finishes_current_turn_and_multiple_tabs_share_writer(store, scenario, monkeypatch):
    async def exercise():
        started, release = asyncio.Event(), asyncio.Event()
        choose = policies.choose

        async def delayed(*args, **kwargs):
            started.set()
            await release.wait()
            return await choose(*args, **kwargs)

        monkeypatch.setattr(policies, "choose", delayed)
        runner = Runner.create(store, scenario)
        service = RunService(store)
        service.start(runner.id)
        task = service.get(runner.id).task
        await started.wait()
        service.start(runner.id)
        service.start(runner.id, single_step=True)
        assert service.get(runner.id).task is task
        service.pause(runner.id)
        assert store.run(runner.id)["status"] == "running"  # Still finishing the request.
        release.set()
        await task
        assert store.frame(runner.id)["tick"] == 1
        assert store.run(runner.id)["calls"] == 1
        assert store.run(runner.id)["status"] == "paused"
        service.start(runner.id, single_step=True)
        await service.get(runner.id).task
        assert store.frame(runner.id)["tick"] == 2
        assert store.run(runner.id)["status"] == "paused"
        await service.close()

    asyncio.run(exercise())


def test_shutdown_waits_for_checkpoint_and_restart_does_not_spend(store, scenario, monkeypatch):
    async def exercise():
        started, release = asyncio.Event(), asyncio.Event()
        choose = policies.choose

        async def delayed(*args, **kwargs):
            started.set()
            await release.wait()
            return await choose(*args, **kwargs)

        monkeypatch.setattr(policies, "choose", delayed)
        runner = Runner.create(store, scenario)
        service = RunService(store)
        service.start(runner.id)
        await started.wait()
        closing = asyncio.create_task(service.close())
        await asyncio.sleep(0)
        assert not closing.done()
        release.set()
        await closing
        assert store.frame(runner.id)["tick"] == 1
        assert store.run(runner.id)["status"] == "paused"
        with pytest.raises(ValueError, match="stopping"):
            service.start(runner.id)
        store.status(runner.id, "running")  # Simulate an unclean prior shutdown.
        fresh = RunService(store)
        assert store.run(runner.id)["status"] == "paused"
        assert "Server stopped" in store.run(runner.id)["error"]
        assert store.run(runner.id)["calls"] == 1
        await fresh.close()

    asyncio.run(exercise())


def test_cancelled_request_is_paused_and_checkpoint_can_resume(store, scenario, monkeypatch):
    async def exercise():
        runner = Runner.create(store, scenario)
        before = runner.environment.snapshot()
        choose = policies.choose
        started = asyncio.Event()

        async def interrupted(*args, **kwargs):
            started.set()
            await asyncio.Event().wait()

        monkeypatch.setattr(policies, "choose", interrupted)
        task = asyncio.create_task(runner.step())
        await started.wait()
        task.cancel()
        with pytest.raises(asyncio.CancelledError):
            await task
        record = store.run(runner.id)
        assert record["status"] == "paused"
        assert "interrupted" in record["error"]
        assert "CancelledError" not in record["error"]
        assert runner.environment.snapshot() == before
        assert store.frame(runner.id)["tick"] == 0
        monkeypatch.setattr(policies, "choose", choose)
        await Runner(store, runner.id).step()
        assert store.frame(runner.id)["tick"] == 1
        assert store.run(runner.id)["error"] is None

    asyncio.run(exercise())


def test_pause_before_first_scheduled_turn_sends_no_request(store, scenario):
    async def exercise():
        runner = Runner.create(store, scenario)
        service = RunService(store)
        service.start(runner.id)
        service.pause(runner.id)
        await service.get(runner.id).task
        assert store.run(runner.id)["calls"] == 0
        assert store.run(runner.id)["status"] == "paused"
        assert store.latest_tick(runner.id) == 0
        await service.close()

    asyncio.run(exercise())


def test_preflight_error_is_visible_without_a_request(store, scenario, monkeypatch):
    async def exercise():
        runner = Runner.create(store, scenario)
        service = RunService(store)
        monkeypatch.delenv("OPENAI_API_KEY")
        service.start(runner.id)
        await service.get(runner.id).task
        assert store.run(runner.id)["calls"] == 0
        assert "OPENAI_API_KEY" in store.run(runner.id)["error"]
        assert store.run(runner.id)["status"] == "failed"
        await service.close()

    asyncio.run(exercise())
