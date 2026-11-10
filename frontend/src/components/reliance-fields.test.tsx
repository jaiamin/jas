import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import type { Parameters, Profile } from "@/lib/types";
import { parameters } from "@/test/fixtures";
import { MechanismFields } from "./mechanism-fields";

const profiles: Profile[] = ["oak-7", "fen-2", "ash-9", "bay-4"].map((key) => ({
  key,
  name: key,
  role: "Participant",
  goal: "Choose freely",
  model: null,
}));
const rules: Parameters = {
  ...parameters,
  artifacts: {
    objects: [
      {
        key: "sealed-fen",
        name: "Fen evidence",
        owner: "fen-2",
        readers: [],
        writers: [],
        content: { reading: 31 },
      },
    ],
    requirements: [],
    write_limit: 4,
  },
  coordination: {
    timing: "phased_simultaneous",
    turn_order: profiles.map((p) => p.key),
    conflict_order: profiles.map((p) => p.key),
    routes: [],
    delivery_delay: 2,
    alternatives: ["share", "keep"],
    information: {},
    match_bonus: 0,
  },
  commitments: {
    opportunities: [
      {
        key: "oak-fen",
        promisor: "oak-7",
        recipient: "fen-2",
        artifact: "sealed-fen",
        alternative: "share",
        opens_at: 2,
        deadline: 4,
        fulfilled_value: 13,
        unfulfilled_value: -7,
      },
    ],
  },
};

test("researcher can change a declared deadline and recipient effect without changing parties or ACLs", () => {
  const onChange = vi.fn();
  render(
    <MechanismFields
      environment="reliance_commitments"
      parameters={rules}
      profiles={profiles}
      id="voluntary"
      onChange={onChange}
    />,
  );
  fireEvent.change(screen.getByLabelText("oak-fen deadline"), {
    target: { value: "8" },
  });
  expect(onChange).toHaveBeenLastCalledWith({
    commitments: {
      opportunities: [
        {
          key: "oak-fen",
          promisor: "oak-7",
          recipient: "fen-2",
          artifact: "sealed-fen",
          alternative: "share",
          opens_at: 2,
          deadline: 8,
          fulfilled_value: 13,
          unfulfilled_value: -7,
        },
      ],
    },
  });
  fireEvent.change(screen.getByLabelText("oak-fen unfulfilled effect"), {
    target: { value: "-11" },
  });
  expect(onChange).toHaveBeenLastCalledWith({
    commitments: {
      opportunities: [
        {
          key: "oak-fen",
          promisor: "oak-7",
          recipient: "fen-2",
          artifact: "sealed-fen",
          alternative: "share",
          opens_at: 2,
          deadline: 4,
          fulfilled_value: 13,
          unfulfilled_value: -11,
        },
      ],
    },
  });
  expect(rules.artifacts?.objects[0].readers).toEqual([]);
});
