def test_internal_failure_logs_keep_stack_locations_without_exception_values(caplog):
    from agent_sim.diagnostics import log_failure

    provider_body = "private-provider-response"
    try:
        raise RuntimeError(provider_body)
    except RuntimeError as error:
        log_failure("Provider call example failed", error)
    assert "Provider call example failed (RuntimeError)" in caplog.text
    assert "test_internal_failure_logs" in caplog.text
    assert provider_body not in caplog.text
