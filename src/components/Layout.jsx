import { Outlet } from "react-router-dom";

export default function Layout() {
  return (
    <div className="bg-background text-foreground min-h-screen">
      <main>
        <Outlet />
      </main>
    </div>
  );
}