import { Routes, Route } from "react-router-dom";
import { Layout } from "@/components/Layout";
import PlayPage from "@/pages/PlayPage/PlayPage";
import GuidePage from "@/pages/GuidePage/GuidePage";
import ChangelogPage from "@/pages/ChangelogPage/ChangelogPage";
import NotFoundPage from "@/pages/NotFoundPage/NotFoundPage";
import { Toaster } from "@/components/ui/sonner";

export default function App() {
  return (
    <>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<PlayPage />} />
          <Route path="guide" element={<GuidePage />} />
          <Route path="changelog" element={<ChangelogPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
      <Toaster position="top-center" richColors closeButton />
    </>
  );
}
