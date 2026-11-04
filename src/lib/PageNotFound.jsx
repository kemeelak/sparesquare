import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "../utils";
import { Grid3X3 } from "lucide-react";

export default function PageNotFound() {
  return (
    <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center p-4">
      <div className="text-center">
        <div className="w-16 h-16 rounded-2xl bg-[#1A1A1A] flex items-center justify-center mx-auto mb-6">
          <span className="text-white font-bold text-2xl">S²</span>
        </div>
        <h1 className="text-6xl font-bold text-[#1A1A1A] mb-2">404</h1>
        <p className="text-[#8A8580] mb-8">This square doesn't exist yet.</p>
        <Link
          to={createPageUrl("Home")}
          className="inline-flex items-center gap-2 px-6 py-3 bg-[#1A1A1A] text-white rounded-xl font-medium hover:bg-[#333] transition-colors"
        >
          <Grid3X3 className="w-4 h-4" />
          Back to Grid
        </Link>
      </div>
    </div>
  );
}