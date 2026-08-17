/** @vitest-environment happy-dom */
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it, vi } from "vitest";
import { TokenRevealDialog } from "./MunicipalityAccessSetup";

describe("TokenRevealDialog", () => {
  it("abre e exibe o token retornado pelo cadastro da prefeitura", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    act(() => root.render(<TokenRevealDialog token="pm_tokenmunicipalcomseguranca123456789" municipalityName="Prefeitura Nova" onClose={vi.fn()} />));
    expect(document.body.textContent).toContain("Token de integração criado");
    expect(document.body.textContent).toContain("Prefeitura Nova");
    expect(document.body.querySelector("input")?.value).toBe("pm_tokenmunicipalcomseguranca123456789");
    act(() => root.unmount());
    container.remove();
  });
});
