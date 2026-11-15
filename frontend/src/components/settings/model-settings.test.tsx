import { fireEvent, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { settings } from "@/test/fixtures";
import { renderWithQueries } from "@/test/queries";
import { ModelSettings } from "./model-settings";

test("connection checks estimate first and spend only on the explicit second action", async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(
      Response.json({
        estimate: { upper_usd: 0.02, max_tokens: 5000, requests: 1 },
      }),
    )
    .mockResolvedValueOnce(
      Response.json({
        estimate: { upper_usd: 0.02, max_tokens: 5000, requests: 1 },
        acknowledged: true,
      }),
    );
  vi.stubGlobal("fetch", fetcher);
  renderWithQueries(<ModelSettings settings={settings} />);
  fireEvent.click(
    screen.getByRole("button", { name: "Estimate connection test" }),
  );
  const run = await screen.findByRole("button", {
    name: "Run connection test",
  });
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(JSON.parse(fetcher.mock.calls[0][1].body).execute).toBe(false);
  fireEvent.click(run);
  await screen.findByText("Connection and structured response verified.");
  expect(fetcher).toHaveBeenCalledTimes(2);
  expect(JSON.parse(fetcher.mock.calls[1][1].body)).toMatchObject({
    execute: true,
    max_usd: 0.02,
  });
});

test("unpriced connection tests require a saved token ceiling", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      Response.json({
        estimate: { upper_usd: null, max_tokens: 5000, requests: 1 },
      }),
    ),
  );
  renderWithQueries(<ModelSettings settings={settings} />);
  fireEvent.click(
    screen.getByRole("button", { name: "Estimate connection test" }),
  );
  expect(
    await screen.findByRole("button", { name: "Run connection test" }),
  ).toBeDisabled();
  expect(screen.getByText(/unknown dollar cost/)).toBeInTheDocument();
});
