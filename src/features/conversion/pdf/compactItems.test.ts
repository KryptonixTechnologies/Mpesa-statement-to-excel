import { describe, expect, it } from "vitest";
import { expandCompactPdfItems } from "./compactItems";

describe("expandCompactPdfItems", () => {
  it("restores parser items from compact bridge tuples", () => {
    expect(
      expandCompactPdfItems(
        [
          ["Receipt No", 15.25, 700.5],
          ["UGNNJ0HDMR", 22.1, 680.25],
        ],
        3,
      ),
    ).toEqual([
      { text: "Receipt No", x: 15.25, y: 700.5, page: 3 },
      { text: "UGNNJ0HDMR", x: 22.1, y: 680.25, page: 3 },
    ]);
  });

  it("uses substantially less JSON than the former object payload", () => {
    const compact = [["UGNNJ0HDMR", 22.1, 680.25]];
    const formerPayload = [
      {
        text: "UGNNJ0HDMR",
        x: 22.1,
        y: 680.25,
        width: 64.5,
        page: 3,
      },
    ];

    expect(JSON.stringify(compact).length).toBeLessThan(
      JSON.stringify(formerPayload).length * 0.6,
    );
  });
});
