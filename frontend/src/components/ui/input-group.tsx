import type * as React from "react";
import { Textarea } from "@/components/ui/input";

export function InputGroup(props: React.ComponentProps<"div">) {
  return <div data-slot="input-group" className="input-group" {...props} />;
}

export function InputGroupAddon(props: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="input-group-addon"
      data-align="block-end"
      className="input-group-addon"
      {...props}
    />
  );
}

export function InputGroupTextarea(props: React.ComponentProps<"textarea">) {
  return <Textarea data-slot="input-group-control" {...props} />;
}
