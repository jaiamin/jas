;; DEVELOPMENT external-provider stand-in artifact, authored only after the
;; independent contract/test freeze and observed missing-receipt RED.
;; This is candidate code, never an admission oracle or production generator.
(module
  (func (export "step") (param $input i32) (result i32)
    (local $row i32)
    (local $state_credit i32)
    (local $state i32)
    (local $credit i32)
    (local $slot i32)
    (local $operation i32)

    ;; Unsigned comparison rejects negative signed encodings as well.
    local.get $input
    i32.const 180
    i32.ge_u
    if
      i32.const -1
      return
    end
    local.get $input
    i32.const 6
    i32.rem_u
    local.set $operation
    local.get $input
    i32.const 6
    i32.div_u
    local.tee $row
    i32.const 2
    i32.rem_u
    local.set $slot
    local.get $row
    i32.const 2
    i32.div_u
    local.tee $state_credit
    i32.const 3
    i32.rem_u
    local.set $credit
    local.get $state_credit
    i32.const 3
    i32.div_u
    local.set $state

    local.get $credit
    i32.eqz
    local.get $state
    i32.const 3
    i32.ge_u
    i32.or
    if
      i32.const -1
      return
    end
    local.get $state
    i32.const 0
    i32.ne
    local.get $credit
    i32.const 1
    i32.ne
    i32.and
    if
      i32.const -1
      return
    end

    ;; Waiting preserves resources. Stopping forfeits escrow and fails.
    local.get $operation
    i32.const 4
    i32.eq
    if
      local.get $state_credit
      return
    end
    local.get $operation
    i32.const 5
    i32.eq
    if
      i32.const 12
      local.get $credit
      i32.add
      return
    end

    local.get $state
    i32.eqz
    if
      local.get $credit
      i32.const 2
      i32.eq
      local.get $slot
      i32.eqz
      i32.and
      local.get $operation
      i32.eqz
      i32.and
      if
        i32.const 4
        return
      end
    end

    local.get $state
    i32.const 1
    i32.eq
    if
      local.get $operation
      i32.const 3
      i32.eq
      if
        local.get $slot
        i32.eqz
        if
          i32.const 2
          return
        else
          i32.const 14
          return
        end
      end
      local.get $slot
      i32.const 1
      i32.eq
      local.get $operation
      i32.const 1
      i32.eq
      i32.and
      if
        i32.const 7
        return
      end
    end

    ;; Signing is irrevocable; only the original initiator releases.
    local.get $state
    i32.const 2
    i32.eq
    local.get $slot
    i32.eqz
    i32.and
    local.get $operation
    i32.const 2
    i32.eq
    i32.and
    if
      i32.const 10
      return
    end
    i32.const -1
  )
)
