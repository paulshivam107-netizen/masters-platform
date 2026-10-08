import React from "react";
import { StaticRouter } from "react-router-dom/server";
import { Routes, Route } from "react-router-dom";
import { AuthProvider } from "../contexts/AuthContext";
import { ThemeProvider } from "../contexts/ThemeContext";
import LandingPage from "../components/public/LandingPage";
import ProgramsPage from "../components/public/ProgramsPage";
import {
  GuidesPage,
  GuidePage,
  HelpPage,
  NotFoundPage,
} from "../components/public/ResourcePages";

export default function StaticSite({ path }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <StaticRouter location={path}>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/guides" element={<GuidesPage />} />
            <Route path="/guides/:slug" element={<GuidePage />} />
            <Route path="/help" element={<HelpPage />} />
            <Route path="/programs" element={<ProgramsPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </StaticRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
