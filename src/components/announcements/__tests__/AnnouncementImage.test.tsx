import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AnnouncementImage } from "../AnnouncementImage";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { supabase } from "@/integrations/supabase/client";
import * as storageLib from "@/lib/storage";

// Mocking dependencies correctly with hoisting in mind
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    storage: {
      from: vi.fn().mockReturnValue({
        download: vi.fn(),
      }),
    },
  },
}));

vi.mock("@/lib/storage", () => ({
  resolveStorageUrl: vi.fn(),
}));

describe("AnnouncementImage", () => {
  const mockSource = "site-assets/test.jpg";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should show skeleton initially", () => {
    render(<AnnouncementImage source={mockSource} />);
    const spinner = document.querySelector(".animate-spin");
    expect(spinner).toBeTruthy();
  });

  it("should show error state and retry button when loading fails", async () => {
    // Access mocks through the imported modules
    const resolveStorageUrlMock = vi.mocked(storageLib.resolveStorageUrl);
    resolveStorageUrlMock.mockResolvedValue(null);
    
    const mockDownload = vi.fn().mockResolvedValue({ data: null, error: new Error("Failed") });
    const mockFrom = vi.mocked(supabase.storage.from);
    mockFrom.mockReturnValue({ download: mockDownload } as any);

    render(<AnnouncementImage source={mockSource} />);

    await waitFor(() => {
      expect(screen.getByText(/Ops! A foto não carregou/i)).toBeTruthy();
    }, { timeout: 3000 });

    const retryButton = screen.getByRole("button", { name: /tentar novamente/i });
    expect(retryButton).toBeTruthy();
    
    // Test retry - should trigger download again
    mockDownload.mockClear();
    fireEvent.click(retryButton);
    
    await waitFor(() => {
      expect(mockDownload).toHaveBeenCalled();
    });
  });
});
