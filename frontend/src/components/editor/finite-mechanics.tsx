import {
  Disclosure,
  DisclosureContent,
  DisclosureTrigger,
} from "@/components/disclosure";
import { Json } from "@/components/shared";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { label } from "@/lib/format";
import type { FiniteExtensionPackage } from "@/lib/types";

export function FiniteMechanics({
  extension,
}: {
  extension: FiniteExtensionPackage;
}) {
  const reviewed = extension.contract;
  const contract = reviewed.specification;
  return (
    <section
      aria-label="Independent finite contract"
      className="flex min-w-0 flex-col gap-3"
    >
      <p>{contract.requirements}</p>
      <p>
        A full external transition table is a prerequisite for this profile.
        Admission checks its finite consequences; it does not establish
        natural-language understanding. Dynamic information policies, arbitrary
        programs and external systems are unsupported here. Installed richer
        worlds retain their own mechanics.
      </p>
      <p className="break-all">
        <a
          className="underline underline-offset-4"
          href={`/api/extensions/contracts/${reviewed.id}`}
        >
          Independent contract {reviewed.id}
        </a>{" "}
        · SHA-256 {reviewed.sha256}
      </p>
      <p>
        Fixed role order: {contract.roles.join(" → ")}. Initial state:{" "}
        {contract.states[contract.initial_state].key}; available credits:{" "}
        {contract.initial_credits}; maximum credits: {contract.max_credits}.
      </p>
      <p>Credits + escrow + spent = {contract.total_resource}.</p>
      <p>
        Exhausted credits or the horizon ends unsuccessfully unless a success
        state was reached; the horizon gives no implicit refund. Reissuing or
        revoking cannot mint resources. Terminal states reject further actions.
      </p>
      <Table aria-label="Finite states">
        <TableHeader>
          <TableRow>
            <TableHead scope="col">State</TableHead>
            <TableHead scope="col">Escrow</TableHead>
            <TableHead scope="col">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {contract.states.map((state) => (
            <TableRow key={state.key}>
              <TableCell>{state.key}</TableCell>
              <TableCell>{state.escrow}</TableCell>
              <TableCell>{label(state.status)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Table aria-label="Finite operation permissions">
        <TableHeader>
          <TableRow>
            <TableHead scope="col">Operation</TableHead>
            <TableHead scope="col">Permitted roles</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {contract.operations.map((operation) => (
            <TableRow key={operation.key}>
              <TableCell>{operation.key}</TableCell>
              <TableCell>{operation.roles.join(", ")}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <p>
        Each actor receives only their own private fields in observations; other
        actors' observations, schemas and memory exclude those fields. Private
        facts stay outside the executable artifact and confer no authority. This
        profile has no communication or dynamic access grants.
      </p>
      <p>
        Candidate explanations and self-tests cannot establish admission. Copied
        research probes protect the source run; executable containment is a
        separate credential-free, import-free worker boundary. Execution and
        replay require the matching current qualified local runtime,
        independently of saved checks.
      </p>
      <Disclosure>
        <DisclosureTrigger>
          Complete contract and executable artifact
        </DisclosureTrigger>
        <DisclosureContent className="pt-3">
          <p>
            The table enumerates state, credits, role and operation in that
            order. Outputs encode next state and credits; -1 denies. Signed
            integers outside the domain also deny. This source is displayed as
            inert text.
          </p>
          <Json value={extension} />
        </DisclosureContent>
      </Disclosure>
    </section>
  );
}
