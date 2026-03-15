import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { BottomSheet } from "@/components/BottomSheet";

describe("BottomSheet", () => {
  it("closes when the close button is pressed", () => {
    const onClose = vi.fn();

    render(
      <BottomSheet open={true} title="Точка" onClose={onClose}>
        <p>Контент</p>
      </BottomSheet>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Закрыть" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("closes when the backdrop is pressed", () => {
    const onClose = vi.fn();

    render(
      <BottomSheet open={true} title="Точка" onClose={onClose}>
        <p>Контент</p>
      </BottomSheet>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Закрыть панель" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
